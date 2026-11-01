// 사용자 정의 게이지(v1.8.1): 순수 로직. 정의(캐릭터별) · 현재값(채팅×인물별) · 변경 이력(채팅별)을 따로 둔다.
//  · 정의: idx.gauges[chaId].defs[]   · 값/이력: folder.gauge = { vals:{defId:{personKey:{v,name}}}, log:[묶음], run:n }
//  · 게이지끼리 연동(참조) 계산은 없다. 값은 코드가 범위를 지키고, 모델은 변화량(정수)만 낸다.
import { srcOf } from "./memoryreconcile.js";

export const EVERY_TURNS = 8;          // 자동 갱신 주기(AI 응답 기준)
export const LOG_CAP = 100;            // 채팅별 변경 이력 최대 건수
export const SUGGEST = Object.freeze({ perDay: 2, gapMs: 4 * 3600e3, snoozeMs: 24 * 3600e3, windowMs: 24 * 3600e3 });
export const SHAPES = Object.freeze(["orb", "bar", "ring", "ticks"]);

const cut = (v, n) => String(v ?? "").trim().slice(0, n);
export const gkey = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const rid = (p) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const int = (v, fb) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : fb; };
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// ── 정의 검증/정규화. 문제가 있으면 던지고(저장 안 함), 고칠 수 있는 것만 고친다.
export function normalizeDef(raw, { id = null, now = Date.now() } = {}) {
  const name = cut(raw?.name, 24);
  if (!name) throw new Error("게이지 이름을 적어 주세요.");
  const min = int(raw?.min, 0), max = int(raw?.max, 10);
  if (!(min < max)) throw new Error("최대값은 최소값보다 커야 해요.");
  if (max - min > 1000) throw new Error("범위는 1000칸을 넘길 수 없어요.");
  const init = clamp(int(raw?.init, min), min, max);
  const step = clamp(int(raw?.step, Math.max(1, Math.ceil((max - min) / 5))), 1, Math.max(1, max - min));
  const look = raw?.look && typeof raw.look === "object" ? raw.look : {};
  const t = raw?.targets;
  const targets = t === "all" || t == null ? "all" : Array.isArray(t) ? [...new Set(t.map((x) => cut(x, 120)).filter(Boolean))].slice(0, 40) : "all";
  return {
    id: id ?? (typeof raw?.id === "string" && /^g_[a-z0-9]{6,24}$/.test(raw.id) ? raw.id : rid("g")),
    name, desc: cut(raw?.desc, 200), min, max, init, step,
    rule: cut(raw?.rule, 300), measure: cut(raw?.measure, 400), update: cut(raw?.update, 400),
    look: { hue: clamp(int(look.hue, 265), 0, 359), shape: SHAPES.includes(look.shape) ? look.shape : "orb", icon: cut(look.icon, 4) },
    targets: targets === "all" || targets.length ? targets : "all",
    on: raw?.on === true,                       // 승인 뒤에만 자동 갱신
    src: ["user", "ai", "suggest"].includes(raw?.src) ? raw.src : "user",
    at: Number.isFinite(raw?.at) ? raw.at : now
  };
}
export const isDuplicateName = (defs, name, exceptId = null) => { const k = gkey(name); return !!k && defs.some((d) => d.id !== exceptId && (gkey(d.name) === k || gkey(d.name).includes(k) || k.includes(gkey(d.name)))); };

// ── JSON 내보내기/가져오기
export const exportDefs = (defs) => JSON.stringify({ type: "dusk-gauge", v: 1, defs: defs.map(({ on, at, id, ...d }) => d) }, null, 2);
export function importDefs(text, existing = []) {
  let j; try { j = JSON.parse(text); } catch { throw new Error("JSON을 읽을 수 없어요."); }
  if (j?.type !== "dusk-gauge" || !Array.isArray(j.defs)) throw new Error("Dusk 게이지 파일이 아니에요.");
  if (j.defs.length > 30) throw new Error("한 번에 30개까지만 가져올 수 있어요.");
  const out = [];
  for (const raw of j.defs) {
    const d = normalizeDef({ ...raw, on: false, src: "user" });          // 가져온 것은 꺼진 채로: 승인해야 자동 갱신
    if (isDuplicateName([...existing, ...out], d.name)) continue;
    out.push(d);
  }
  return out;
}

// ── AI 설계 결과 검증(저장 전). 반환: 정의 초안(on=false)
export function validateDesign(obj, { name, desc } = {}) {
  const o = obj?.gauge && typeof obj.gauge === "object" ? obj.gauge : obj;
  if (!o || typeof o !== "object") throw new Error("AI 설계 결과를 읽을 수 없어요.");
  return normalizeDef({ ...o, name: o.name || name, desc: o.desc || desc, on: false, src: "ai" });
}

// ── 현재값/이력
export const stateOf = (folder) => (folder.gauge ??= { vals: {}, log: [], run: 0 });
export function valueOf(folder, def, person) {
  const v = folder?.gauge?.vals?.[def.id]?.[gkey(person)]?.v;
  return Number.isFinite(v) ? clamp(v, def.min, def.max) : def.init;
}
const setV = (st, def, person, v) => { ((st.vals[def.id] ??= {})[gkey(person)] = { v, name: person }); };
const trim = (st) => {   // 이력 100건(변경 항목 수 기준). 묶음이 쪼개지지 않게 오래된 묶음부터 지운다. 마지막 묶음은 남긴다.
  let n = st.log.reduce((s, b) => s + b.items.length, 0);
  while (n > LOG_CAP && st.log.length > 1) n -= st.log.shift().items.length;
};
export const appliesTo = (def, person, known = []) => def.targets === "all" ? known.some((k) => gkey(k) === gkey(person)) || false : def.targets.some((t) => gkey(t) === gkey(person));
export const targetsOf = (def, known = []) => def.targets === "all" ? known : known.filter((k) => def.targets.some((t) => gkey(t) === gkey(k)));

// 8턴마다. ordinal = 이 응답까지 센 AI 응답 수. 응답이 지워져 줄어들면 기준을 내린다(리롤은 개수가 안 변하므로 두 번 세지 않는다).
export function isDue(folder, defs, ordinal, every = EVERY_TURNS) {
  if (!defs.some((d) => d.on)) return false;
  const st = stateOf(folder);
  if (ordinal < st.run) st.run = ordinal;
  return ordinal - st.run >= every;
}

// 모델이 내놓은 변화를 검증해 반영한다. raw: [{g, who, d, why}]. 반환: {changed, bundle|null}
export function applyGauge(folder, defs, raw, anchor, { known = [], now = Date.now(), head = "", tail = "", ordinal = null } = {}) {
  const st = stateOf(folder), byId = new Map(defs.filter((d) => d.on).map((d) => [d.id, d])), seen = new Set(), items = [];
  const knownKeys = new Map(known.map((k) => [gkey(k), k]));
  for (const x of Array.isArray(raw) ? raw.slice(0, 40) : []) {
    const def = byId.get(String(x?.g ?? x?.id ?? "")), who = knownKeys.get(gkey(x?.who)), why = cut(x?.why, 60), d0 = Math.round(Number(x?.d));
    if (!def || !who || !why || !Number.isFinite(d0) || d0 === 0 || !appliesTo(def, who, known)) continue;
    const k = def.id + ">" + gkey(who); if (seen.has(k)) continue; seen.add(k);
    const from = valueOf(folder, def, who), to = clamp(from + clamp(d0, -def.step, def.step), def.min, def.max);
    if (to === from) continue;
    setV(st, def, who, to);
    items.push({ g: def.id, who, from, to, why });
  }
  if (ordinal != null) st.run = ordinal;
  if (!items.length) return { changed: 0, bundle: null };
  const src = srcOf(anchor);
  const bundle = { id: rid("b"), kind: "auto", at_ms: now, at: anchor?.at ?? null, head, tail, items, ...(src ? { src } : {}) };
  st.log.push(bundle); trim(st);
  return { changed: items.length, bundle };
}

// 사용자가 직접 고침(되돌리기 대상에 포함)
export function manualSet(folder, def, person, value, { now = Date.now() } = {}) {
  const st = stateOf(folder), from = valueOf(folder, def, person), to = clamp(int(value, from), def.min, def.max);
  if (to === from) return null;
  setV(st, def, person, to);
  const bundle = { id: rid("b"), kind: "user", at_ms: now, at: null, head: "", items: [{ g: def.id, who: person, from, to, why: "직접 수정" }] };
  st.log.push(bundle); trim(st);
  return bundle;
}

// 마지막 변경 묶음 되돌리기. 그 뒤에 값이 또 바뀐 항목은 건드리지 않고 skipped로 알린다.
export function undoLast(folder, defs) {
  const st = stateOf(folder), b = st.log.pop();
  if (!b) return null;
  const byId = new Map(defs.map((d) => [d.id, d])); let restored = 0, skipped = 0;
  for (const it of b.items) {
    const def = byId.get(it.g);
    if (!def) { skipped++; continue; }
    if (valueOf(folder, def, it.who) !== it.to) { skipped++; continue; }
    setV(st, def, it.who, it.from); restored++;
  }
  return { restored, skipped, bundle: b };
}

// 삭제: 값·이력에서 이 게이지를 지운다
export function removeFromFolder(folder, defId) {
  const st = folder.gauge; if (!st) return;
  delete st.vals[defId];
  st.log = st.log.map((b) => ({ ...b, items: b.items.filter((i) => i.g !== defId) })).filter((b) => b.items.length);
}

// ── 분석 요청에 얹는 입력/규칙/출력 검증
export function gaugesForPrompt(folder, defs, known = [], limit = 12) {
  return defs.filter((d) => d.on).map((d) => ({
    id: d.id, name: d.name, desc: d.desc, min: d.min, max: d.max, step: d.step, rule: d.rule, measure: d.measure, update: d.update,
    who: targetsOf(d, known).slice(0, limit).map((n) => ({ name: n, v: valueOf(folder, d, n) }))
  })).filter((g) => g.who.length);
}
export const GAUGE_RULES = [
  "`gauge` (optional): the input has `gauges`. For each gauge judge ONLY the people in its `who`, using its `measure` (what to look at), `rule` and `update` (how it moves). Output at most 12 entries {\"g\":\"<gauge id>\",\"who\":\"<name from who>\",\"d\":<integer, |d| <= step>,\"why\":\"<=40 chars evidence from this response\"}. Output deltas only, never final values. Omit people or gauges that did not clearly change.",
  "`gaugeIdea` (only if the input has `suggestGauge`): at most one {\"name\":\"<=24 chars\",\"desc\":\"<=100 chars\"} for a trackable state (not already in `gauges`) that this story keeps changing. Omit if nothing fits."
].join("\n");

export function validateGaugeOut(obj) {
  const g = Array.isArray(obj?.gauge) ? obj.gauge.slice(0, 40).map((x) => ({ g: cut(x?.g, 40), who: cut(x?.who, 120), d: Math.round(Number(x?.d)), why: cut(x?.why, 60) })) : [];
  const i = obj?.gaugeIdea;
  const idea = i && typeof i === "object" && cut(i.name, 24) ? { name: cut(i.name, 24), desc: cut(i.desc, 100) } : null;
  return { ...(g.length ? { gauge: g } : {}), ...(idea ? { gaugeIdea: idea } : {}) };
}

// ── 자동 제안 제한 (기본 꺼짐). 사용자가 직접 만든 게이지는 이 개수에 넣지 않는다.
export const newSuggestState = () => ({ on: false, list: [], sent: [] });
export function canSuggest(sug, now = Date.now()) {
  if (!sug?.on) return false;
  if ((sug.list ?? []).some((x) => x.status === "pending" || (x.status === "snoozed"))) return false;   // 미처리(연기 포함) 1개 제한
  const sent = (sug.sent ?? []).filter((t) => now - t < SUGGEST.windowMs);
  if (sent.length >= SUGGEST.perDay) return false;
  if (sent.length && now - Math.max(...sent) < SUGGEST.gapMs) return false;
  return true;
}
// 지금 보여 줄 제안(대기 중이거나 연기 시간이 지난 것)
export const shownSuggestion = (sug, now = Date.now()) => (sug?.list ?? []).find((x) => x.status === "pending" || (x.status === "snoozed" && x.until <= now)) ?? null;
export function addSuggestion(sug, idea, defs, now = Date.now()) {
  if (!canSuggest(sug, now)) return null;
  const dup = isDuplicateName(defs, idea.name) || (sug.list ?? []).some((x) => gkey(x.name) === gkey(idea.name));  // 이미 있거나 무시한 이름은 다시 제안하지 않는다
  if (dup) return null;
  const x = { id: rid("s"), name: idea.name, desc: idea.desc, status: "pending", at: now };
  sug.list = [...(sug.list ?? []), x].slice(-30); sug.sent = [...(sug.sent ?? []).filter((t) => now - t < SUGGEST.windowMs), now];
  return x;
}
export function resolveSuggestion(sug, id, action, now = Date.now()) {
  const x = (sug.list ?? []).find((s) => s.id === id); if (!x) return null;
  if (action === "later") { x.status = "snoozed"; x.until = now + SUGGEST.snoozeMs; }
  else x.status = action === "accept" ? "accepted" : "dismissed";
  return x;
}
