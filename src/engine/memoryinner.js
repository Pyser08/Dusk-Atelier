// v1.7.1 3단계: 인물 관점과 내면(순수). 전부 '중요한 상황에만', 선택 기입.
//  7-1 pov  장면에 붙는 인물별 인식(객관 기록과 분리) · 7-2 self  기록에 붙는 자기 해석/추정 원인(해석확실성 필수)
//  7-3 exp  관계 단위 기대 불일치 · 7-4 hints  감정 태그가 어긋나면 7-2 기록을 유도하는 쪽지
import { srcOf } from "./memoryreconcile.js";
import { normConf, CONF_RANK, CONF_LABEL } from "./memorytrust.js";
import { tensionOf } from "./memoryemo.js";
import { atLeast } from "./memorygrade.js";

const cut = (v, n) => String(v ?? "").trim().slice(0, n);
const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const nk = (v) => String(v ?? "").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
const oneLine = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
export const IMPORTANT_MIN = "B";  // 이 등급 이상이거나 새 장면일 때만 3단계 필드를 받는다
export const POV_MAX = 2, EXP_LOG = 10, HINT_RUNS = 3, HINT_MAX = 4;

// ── 검증 ──
// 7-2: 두 값이 모두 있고 서로 달라야 하며, 추정 원인에는 해석확실성이 필수다(없으면 자기 해석만도 버린다 — 근거 없는 단정 방지).
export function validateSelf(s) {
  if (!s || typeof s !== "object") return undefined;
  const feel = cut(s.feel, 40), cause = cut(s.cause, 60), ic = normConf(s.ic);
  if (!nk(feel) || !nk(cause) || !ic || nk(feel) === nk(cause)) return undefined;
  return { feel, cause, ic };
}
// 7-1·7-3(최상위 pov, exp). pov는 서로 다른 두 인물이 서로 다르게 인식할 때만(관점이 실제로 다를 때만).
export function validateInner(obj) {
  const seen = new Set(), pov = [];
  for (const x of Array.isArray(obj?.pov) ? obj.pov : []) {
    const who = cut(x?.who, 60), view = cut(x?.view, 40), why = cut(x?.why, 40);
    if (!who || !nk(view) || seen.has(key(who))) continue;
    seen.add(key(who)); pov.push({ who, view, ...(nk(why) ? { why } : {}) });
    if (pov.length >= POV_MAX) break;
  }
  const differs = pov.length === 2 && nk(pov[0].view) !== nk(pov[1].view);
  const e = (Array.isArray(obj?.exp) ? obj.exp : [])[0];
  let exp = [];
  if (e) {
    const a = cut(e.a, 60), b = cut(e.b, 60), ae = cut(e.ae, 40), be = cut(e.be, 40);
    if (a && b && key(a) !== key(b) && nk(ae) && nk(be)) {
      const gap = e.gap === true && nk(ae) !== nk(be), viol = gap ? cut(e.viol, 60) : "";
      exp = [{ a, b, ae, be, as: e.as === true, bs: e.bs === true, gap, ...(nk(viol) ? { viol } : {}) }];
    }
  }
  return { pov: differs ? pov : [], exp };
}

// ── 반영 ──
// 응답 하나가 3단계 필드를 받을 만큼 중요한가: 새 장면이거나 등급 B 이상 기록이 있을 때.
export const isImportant = (graded, sceneNew) => !!sceneNew || (graded ?? []).some((e) => atLeast(e.g, IMPORTANT_MIN));

// 7-1: 가장 최근 장면에 인물별 인식을 병합한다(같은 인물은 새 근거가 있으면 갱신, 잠긴 것은 유지).
export function applyPov(scene, pov, now = Date.now()) {
  if (!scene || !pov?.length) return 0;
  scene.pov ??= [];
  let n = 0;
  for (const p of pov) {
    const cur = scene.pov.find((x) => key(x.who) === key(p.who));
    if (cur) { if (cur.lock || (cur.view === p.view && cur.why === p.why)) continue; Object.assign(cur, p, { at_ms: now }); if (!p.why) delete cur.why; n++; }
    else { scene.pov.push({ ...p, at_ms: now }); n++; }
  }
  return n;
}
// 7-2: 새 기록에 붙이고, 같은 기록이 다시 나오면 값이 달라졌을 때만 갱신(잠금은 유지). 중요하지 않은 기록은 받지 않는다.
export function takeSelf(rec, self, g) {
  if (!self || !atLeast(g ?? rec.g, IMPORTANT_MIN)) return false;
  if (rec.lock?.self) return false;
  const c = rec.self;
  if (c && c.feel === self.feel && c.cause === self.cause && c.ic === self.ic) return false;
  rec.self = { ...self }; return true;
}
// 7-3: 쌍(순서 없음)별 기대 불일치. 새 근거가 있을 때만 바뀌고, 바로 전 값 1개를 prev로 남긴다(출처가 사라지면 되돌림).
export const expKey = (a, b) => [key(a), key(b)].sort().join("|");
export function applyExp(folder, exps, anchor, now = Date.now()) {
  folder.exp ??= {};
  const src = srcOf(anchor);
  let n = 0;
  for (const e of exps ?? []) {
    const k = expKey(e.a, e.b), cur = folder.exp[k];
    const next = { a: e.a, b: e.b, ae: e.ae, be: e.be, as: e.as, bs: e.bs, gap: e.gap, ...(e.viol ? { viol: e.viol } : {}) };
    if (cur) {
      if (cur.lock) continue;
      const same = ["ae", "be", "as", "bs", "gap", "viol"].every((f) => (cur[f] ?? "") === (next[f] ?? ""));
      if (same) continue;
      const { prev, log, ...before } = cur;
      folder.exp[k] = { ...next, prev: before, log: [...(log ?? []), { gap: next.gap, at: anchor?.at ?? null, at_ms: now }].slice(-EXP_LOG), at_ms: now, ...(src ? { src } : {}) };
    } else folder.exp[k] = { ...next, log: [{ gap: next.gap, at: anchor?.at ?? null, at_ms: now }], at_ms: now, ...(src ? { src } : {}) };
    n++;
  }
  return n;
}

// 7-4: 감정 태그가 새로 어긋나면 그 인물의 7-2 기록을 유도하는 쪽지를 남긴다. 3번 분석이 지나거나 7-2가 기록되면 지운다.
export function tensionKeys(folder) {
  const out = new Set();
  for (const [k, p] of Object.entries(folder?.emo ?? {})) if (tensionOf(p.tags).length) out.add(k);
  return out;
}
export function noteTension(folder, before) {
  const now = tensionKeys(folder);
  folder.hints ??= [];
  let n = 0;
  for (const k of now) {
    if (before.has(k) || folder.hints.some((h) => h.pair === k)) continue;
    const p = folder.emo[k];
    folder.hints.push({ pair: k, person: p.from, to: p.to, tags: tensionOf(p.tags)[0], run: folder.runs ?? 0 }); n++;
  }
  folder.hints = folder.hints.slice(-HINT_MAX);
  return n;
}
export function clearHints(folder, person) {
  const before = (folder.hints ?? []).length;
  if (person) folder.hints = (folder.hints ?? []).filter((h) => key(h.person) !== key(person));
  folder.hints = (folder.hints ?? []).filter((h) => (folder.runs ?? 0) - h.run <= HINT_RUNS);
  return before - folder.hints.length;
}
// 분석 입력용(있을 때만).
export const hintsForPrompt = (folder) => (folder?.hints ?? []).filter((h) => (folder.runs ?? 0) - h.run <= HINT_RUNS).map((h) => ({ person: h.person, to: h.to, conflict: h.tags }));

// ── 정합성: 사라진 응답에서 생긴 기대 불일치는 되돌린다 ──
export function revertExp(folder, aliveSrc) {
  let n = 0;
  for (const [k, e] of Object.entries(folder.exp ?? {})) {
    if (e.lock || !e.src || aliveSrc(e.src)) continue;
    if (e.prev) { const { log } = e; folder.exp[k] = { ...e.prev, log: (log ?? []).slice(0, -1), at_ms: e.prev.at_ms }; }
    else delete folder.exp[k];
    n++;
  }
  return n;
}

// ── 주입 문장(각각 예산 안에서, 관련 인물만) ──
const has = (rel, name) => !rel || rel.has(key(name));
export function povLines(scene) {
  const p = (scene?.pov ?? []);
  return p.length === 2 ? [`- ${p.map((x) => `${x.who}: ${oneLine(x.view)}`).join(" / ")}${p.find((x) => x.why) ? ` (why they differ: ${oneLine(p.find((x) => x.why).why)})` : ""}`] : [];
}
export function innerLines(people, { limit = 2, relevant = null } = {}) {
  const rows = [];
  for (const p of people ?? []) {
    if (!has(relevant, p.name)) continue;
    const r = [...(p.records ?? [])].reverse().find((x) => !x.orphan && x.valid !== false && x.self);
    if (r) rows.push({ at: r.at ?? -1, line: `- ${p.name} feels "${oneLine(r.self.feel)}"; likely real reason (inferred, ${CONF_LABEL[r.self.ic] ? r.self.ic : "M"}): ${oneLine(r.self.cause)}` });
  }
  return rows.sort((a, b) => b.at - a.at).slice(0, limit).map((x) => x.line);
}
export function expLines(folder, { limit = 2, relevant = null } = {}) {
  return Object.values(folder?.exp ?? {}).filter((e) => e.gap && (has(relevant, e.a) || has(relevant, e.b)))
    .sort((a, b) => (b.at_ms ?? 0) - (a.at_ms ?? 0)).slice(0, limit)
    .map((e) => `- ${e.a} expects ${oneLine(e.ae)} (${e.as ? "said" : "unsaid"}); ${e.b} expects ${oneLine(e.be)} (${e.bs ? "said" : "unsaid"})${e.viol ? ` — ${oneLine(e.viol)}` : ""}`);
}
export { CONF_RANK };
