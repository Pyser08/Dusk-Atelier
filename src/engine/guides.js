// 묘사 정확도 지침(심리학·해부학): 라이브러리(data/guidelib.js)에서 지금 장면·인물 상태에 맞는 조각만 고른다. 호출 없음.
// 조각: { id, area: psych|body, src(근거 분야), keys(정규식 문자열 — 최근 글), when(v)(인물 상태 → 참/거짓), pri, line }
export const GUIDE_TITLE = "[Accuracy notes — real psychology/physiology for this scene; apply quietly, don't lecture]";
export const GUIDE_MAX = 2, GUIDE_REST = 3, GUIDE_LINE = 240;

const reCache = new Map();
const reOf = (k) => { if (!k) return null; let r = reCache.get(k); if (!r) { try { r = new RegExp(k, "i"); } catch { r = /$^/; } reCache.set(k, r); } return r; };

// people: [{ name, v }] — v는 nsfwlife.lifeView 결과(또는 비슷한 모양)
export function guideSignals(text, people = []) {
  return { text: String(text ?? "").normalize("NFKC"), people: people.filter((p) => p?.name && p.v) };
}

// 점수: 글이 맞으면 pri, 상태가 맞으면 pri+1(구체적인 인물이 있음). 같은 주제(topic)는 하나만.
export function selectGuides(lib, sig, { max = GUIDE_MAX, used = null, turn = 0, rest = GUIDE_REST, off = [], custom = [] } = {}) {
  const offs = new Set(off), out = [], topics = new Set();
  const all = [...custom.filter((g) => g?.id && g.line).map((g) => ({ pri: 3, ...g, custom: true })), ...lib];
  const cands = [];
  for (const g of all) {
    if (offs.has(g.id)) continue;
    if (used && used.has(g.id) && turn - used.get(g.id) < rest) continue;
    let score = 0, names = [];
    if (g.keys && reOf(g.keys).test(sig.text ?? "")) score = (g.pri ?? 1) + 1;   // pri 0도 걸리게 +1
    if (g.when) { names = (sig.people ?? []).filter((p) => { try { return !!g.when(p.v); } catch { return false; } }).map((p) => p.name); if (names.length) score = Math.max(score, (g.pri ?? 1) + 2); }
    if (score > 0) cands.push({ g, names, score });
  }
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands) { const t = c.g.topic ?? c.g.id; if (topics.has(t)) continue; topics.add(t); out.push(c); if (out.length >= max) break; }
  return out;
}

export function guideLine({ g, names }) {
  return `- ${names?.length ? `(${names.slice(0, 2).join(", ")}) ` : ""}${g.line}`.slice(0, GUIDE_LINE);
}
export function guideSection(picked) {
  return picked?.length ? [GUIDE_TITLE, ...picked.map(guideLine)].join("\n") : "";
}

// 주입용: 장면 인물 상태 + 최근 글 → 블록. 쉬는 턴은 채팅 폴더마다 기억(같은 턴 다시 보내도 같은 결과).
// 폴더 객체는 턴마다 새로 읽히므로 문자열 key(채팅)로 기억한다
const usedOf = new Map();
export function guideInject(lib, { key = "", people = [], text = "", turn = 0, cfg = {} } = {}) {
  if (cfg.on === false) return "";
  let used = key ? usedOf.get(key) : null;
  if (!used && key) { used = new Map(); usedOf.set(key, used); if (usedOf.size > 50) usedOf.delete(usedOf.keys().next().value); }
  const mine = used ? new Map([...used].filter(([, t]) => t !== turn)) : null;   // 같은 턴(리롤)은 쉬게 하지 않음
  const picked = selectGuides(lib, guideSignals(text, people), { max: cfg.max ?? GUIDE_MAX, rest: cfg.rest ?? GUIDE_REST, off: cfg.off ?? [], custom: cfg.custom ?? [], used: mine, turn });
  if (used) for (const p of picked) used.set(p.g.id, turn);
  return guideSection(picked);
}
