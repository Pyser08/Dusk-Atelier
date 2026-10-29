// v1.7.1 기억 편집기(순수): 화면에 보이는 값을 그 자리에서 고치면 원본 데이터에 반영한다.
// 편집 대상은 위치({kind, ...})로 가리키고, 고친 필드만 잠그며(자동 갱신이 덮지 않음), 직전 1건은 되돌릴 수 있다.
import { setLock, setValid, CONF_RANK, normConf, KIND_LABEL, CONF_LABEL, isValid, effRank } from "./memorytrust.js";
import { setTag, EMO_TAGS } from "./memoryemo.js";
import { validateKeys } from "./memorykeys.js";
import { expKey } from "./memoryinner.js";

const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const cut = (v, n) => String(v ?? "").trim().slice(0, n);
const rid = (p) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// loc: {kind:'rec', pk, id} | {kind:'scene', id} | {kind:'emo', k} | {kind:'exp', k}
export function locate(folder, loc) {
  if (!folder || !loc) return null;
  if (loc.kind === "rec") return folder.people?.[loc.pk]?.records?.find((r) => r.id === loc.id) ?? null;
  if (loc.kind === "scene") return (folder.scenes ?? []).find((s) => s.id === loc.id) ?? null;
  if (loc.kind === "emo") return folder.emo?.[loc.k] ?? null;
  if (loc.kind === "exp") return folder.exp?.[loc.k] ?? null;
  return null;
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const holder = (folder, loc) => loc.kind === "rec" ? folder.people[loc.pk].records : loc.kind === "scene" ? folder.scenes : loc.kind === "emo" ? folder.emo : folder.exp;

// 편집 한 건 적용: 대상이 없으면(그 사이 지워짐·정리됨) 아무것도 바꾸지 않고 {ok:false}. 성공하면 직전 상태를 folder.undo에 1건만 남긴다.
export function editTarget(folder, loc, fn, label = "", now = Date.now()) {
  const t = locate(folder, loc);
  if (!t) return { ok: false, why: "고치려던 항목이 그 사이 바뀌었거나 지워졌어요. 새로 불러온 뒤 다시 해 주세요." };
  const before = clone(t);
  fn(t);
  folder.undo = { loc, before, label, at_ms: now };
  return { ok: true };
}
// 직전 편집 되돌리기. 그 사이 대상이 사라졌으면 되돌리지 못한다.
export function undoLast(folder) {
  const u = folder?.undo;
  if (!u) return { ok: false, why: "되돌릴 수정이 없어요." };
  const t = locate(folder, u.loc);
  if (!t) { delete folder.undo; return { ok: false, why: "되돌릴 항목이 이미 없어요." }; }
  if (u.loc.kind === "rec") { const a = holder(folder, u.loc), i = a.indexOf(t); a[i] = u.before; }
  else if (u.loc.kind === "scene") { const a = folder.scenes, i = a.indexOf(t); a[i] = u.before; }
  else holder(folder, u.loc)[u.loc.k] = u.before;
  delete folder.undo;
  return { ok: true };
}

// ── 기록(rec) 필드 편집: 고친 필드만 잠근다 ──
export function setAct(r, text) { const v = cut(text, 80); if (!v) return false; r.act = v; r.user = true; setLock(r, "act"); return true; }
export function setKind(r, kd) { if (kd !== "f" && kd !== "i" && kd != null) return; if (kd == null) { delete r.kd; setLock(r, "kd", false); } else { r.kd = kd; if (kd === "f") { delete r.ic; setLock(r, "ic", false); } setLock(r, "kd"); } }
// field: 'fc' | 'ic'. v: 'H'|'M'|'L'|null(미설정). 사용자가 정한 값은 잠기고 '사용자지정'으로 표시된다(객관 근거로 치지 않는다).
export function setConf(r, field, v) {
  if (field !== "fc" && field !== "ic") return;
  if (field === "ic" && r.kd !== "i") return;
  const c = normConf(v);
  if (!c) { delete r[field]; setLock(r, field, false); } else { r[field] = c; setLock(r, field); }
}
export const setRecValid = (r, valid) => setValid(r, valid);
export function setRecKeys(r, keys) { const k = validateKeys(keys); if (k.length) r.keys = k; else delete r.keys; setLock(r, "keys", k.length > 0); }
export function setText(r, field, v, max = 60) {  // pat | mean
  if (field !== "pat" && field !== "mean") return;
  const s = cut(v, max);
  if (!s) { delete r[field]; if (field === "mean") delete r.est; setLock(r, field, false); return; }
  r[field] = s; if (field === "mean") r.est = true; setLock(r, field);
}
export function setSelf(r, self) {
  if (!self || !String(self.feel ?? "").trim() || !String(self.cause ?? "").trim()) { delete r.self; setLock(r, "self", false); return; }
  r.self = { feel: cut(self.feel, 40), cause: cut(self.cause, 60), ic: normConf(self.ic) ?? "M" }; setLock(r, "self");
}
export function addRecord(folder, name, act, g = "B", now = Date.now()) {
  const a = cut(act, 80), n = cut(name, 120);
  if (!a || !n) return null;
  const pk = Object.keys(folder.people ?? {}).find((k) => k === key(n) || (folder.people[k].aliases ?? []).some((x) => key(x) === key(n))) ?? key(n);
  folder.people ??= {};
  const p = folder.people[pk] ??= { name: n, aliases: [], pinned: false, records: [] };
  const r = { id: rid("r"), at: folder.cursor?.at ?? null, act: a, g, score: 0, p: 0, s: 0, r: 0, sit: null, user: true, pin: false, at_ms: now, orphan: false, lock: { act: true } };
  p.records.push(r);
  return { pk, id: r.id };
}

// ── 장면 관점(pov): 두 칸(인물·인식·이유). 비우면 지운다 ──
export function setPov(scene, list) {
  const rows = (list ?? []).map((x) => ({ who: cut(x?.who, 60), view: cut(x?.view, 40), ...(cut(x?.why, 40) ? { why: cut(x.why, 40) } : {}), lock: true })).filter((x) => x.who && x.view).slice(0, 2);
  if (rows.length) scene.pov = rows; else delete scene.pov;
}
export function setScene(scene, f, v) { if (f === "sum") { const s = cut(v, 400); if (s) scene.sum = s; } else if (f === "place") scene.place = cut(v, 80); }

// ── 기대 불일치(exp): 고친 값은 통째로 잠겨 자동 갱신이 덮지 않는다 ──
export function setExp(e, patch) {
  for (const f of ["ae", "be"]) if (patch[f] != null) e[f] = cut(patch[f], 40);
  for (const f of ["as", "bs", "gap"]) if (patch[f] != null) e[f] = !!patch[f];
  if (patch.viol != null) { const v = cut(patch.viol, 60); if (v) e.viol = v; else delete e.viol; }
  if (!e.gap) delete e.viol;
  e.lock = true;
}
export function addExp(folder, a, b) {
  const x = cut(a, 60), y = cut(b, 60);
  if (!x || !y || key(x) === key(y)) return null;
  folder.exp ??= {};
  const k = expKey(x, y);
  folder.exp[k] ??= { a: x, b: y, ae: "", be: "", as: false, bs: false, gap: false, log: [], at_ms: Date.now(), lock: true };
  return k;
}
export function deleteExp(folder, k) { if (folder.exp?.[k]) { delete folder.exp[k]; return true; } return false; }

// 감정 태그 직접 수정은 memoryemo.setTag(잠금 포함)를 그대로 쓴다.
export { setTag, EMO_TAGS };

// ── 화면용 표기 ──
// 기억 카드의 작은 꼬리표 [{text, kind}] — 비어 있는 필드는 만들지 않는다(UI도 숨김).
export function trustBadges(r) {
  const out = [];
  if (r.valid === false) out.push({ text: `현재 적용 종료 · ${({ newer: "새 발언", contradiction: "모순 판정", user: "사용자 수정", past: "과거 회상" })[r.inv?.why] ?? "종료"}`, kind: "end" });
  if (r.kd) out.push({ text: KIND_LABEL[r.kd], kind: r.kd === "i" ? "infer" : "fact" });
  if (r.fc) out.push({ text: `사실 ${CONF_LABEL[r.fc]}${r.lock?.fc ? "·사용자지정" : ""}`, kind: `c${CONF_RANK[r.fc]}` });
  if (r.kd === "i" && r.ic) out.push({ text: `해석 ${CONF_LABEL[r.ic]}${r.lock?.ic ? "·사용자지정" : ""}`, kind: `c${CONF_RANK[r.ic]}` });
  if (r.hold) out.push({ text: "보류(충돌)", kind: "hold" });
  if ((r.m ?? 1) > 1) out.push({ text: `${r.m}회`, kind: "n" });
  return out;
}
export const lockedFields = (r) => Object.keys(r.lock ?? {});
export { isValid, effRank };
