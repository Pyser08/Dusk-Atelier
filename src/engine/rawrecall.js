// 2.2.2 원문 회상(순수 함수): 지난 대화 원문을 조각내고, 의미 순위와 글자 순위를 합쳐(RRF) 지금 글과 관련 있는 원문 조각을 고른다.
// 요약 기억이 빠뜨리거나 날짜를 틀린 사실을 원문이 받친다. 네트워크(임베딩·재정렬)는 data 쪽에서 한다.
import { estimateTokens } from "./provider/tokens.js";
import { hashText } from "./chattext.js";

const SENT = /(?<=[.!?。！？…~]|[다요죠네까]\.?)\s+/u;
// 메시지 하나를 maxChars 이하 조각으로(문장 경계 우선)
export function splitText(text, { maxChars = 360, minChars = 80 } = {}) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return [];
  if (t.length <= maxChars) return [t];
  const parts = t.split(SENT), out = []; let cur = "";
  for (const p of parts) {
    if (cur && cur.length + p.length + 1 > maxChars && cur.length >= minChars) { out.push(cur); cur = ""; }
    cur = cur ? cur + " " + p : p;
    while (cur.length > maxChars * 1.5) { out.push(cur.slice(0, maxChars)); cur = cur.slice(maxChars); }
  }
  if (cur) { if (out.length && cur.length < minChars) out[out.length - 1] += " " + cur; else out.push(cur); }
  return out;
}

// messages: [{text, who, mi}] (mi = 채팅 안 번호). dateOf(mi) → 그 메시지의 이야기 날짜(없으면 "")
export function buildChunks(messages, dateOf = () => "", opts = {}) {
  const out = [];
  for (const m of messages) {
    const pieces = splitText(m.text, opts);
    pieces.forEach((p, k) => { const t = `${m.who}: ${p}`; out.push({ id: out.length, mi: m.mi, k, t, h: hashText(t, 400), date: dateOf(m.mi) || "" }); });
  }
  return out;
}

// 글자 조각(2글자) 색인으로 BM25 비슷한 점수. 한국어처럼 띄어쓰기가 흔들리는 글에서도 이름·물건·장소를 잘 잡는다.
const grams = (s) => { const t = String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " "); const g = new Set(); for (const w of t.split(" ")) { if (w.length === 1) continue; if (w.length === 2) g.add(w); for (let i = 0; i + 2 <= w.length; i++) g.add(w.slice(i, i + 2)); } return g; };
export function lexScores(chunks, query) {
  const q = grams(query); if (!q.size) return new Map();
  const df = new Map(), cg = chunks.map((c) => grams(c.t));
  for (const g of cg) for (const x of g) if (q.has(x)) df.set(x, (df.get(x) ?? 0) + 1);
  const N = chunks.length || 1, out = new Map();
  cg.forEach((g, i) => { let s = 0; for (const x of q) if (g.has(x)) s += Math.log(1 + N / (df.get(x) ?? 1)); if (s > 0) out.set(chunks[i].id, s / Math.sqrt(1 + g.size / 40)); });
  return out;
}
// 순위 합치기(Reciprocal Rank Fusion)
export function rrf(lists, { k = 60, top = 80 } = {}) {
  const acc = new Map();
  for (const m of lists) { if (!m) continue; [...m].sort((a, b) => b[1] - a[1]).slice(0, top).forEach(([id], r) => acc.set(id, (acc.get(id) ?? 0) + 1 / (k + r))); }
  return acc;
}
// 고른 조각(순위순) + 앞뒤 이웃을 예산 안에서 모아 시간순 줄로. 같은 날짜가 이어지면 날짜는 한 번만 쓴다.
export function assemble(chunks, rankedIds, { tokens = 1000, neighbor = 1, maxPicks = 8 } = {}) {
  const byId = new Map(chunks.map((c) => [c.id, c])), take = new Set(); let used = 0, picks = 0;
  const cost = (id) => estimateTokens(byId.get(id)?.t ?? "") + 4;
  for (const id of rankedIds) {
    if (picks >= maxPicks) break;
    const group = [id]; for (let d = 1; d <= neighbor; d++) group.push(id - d, id + d);
    const add = group.filter((x) => byId.has(x) && !take.has(x)), need = add.reduce((s, x) => s + cost(x), 0);
    if (!add.includes(id) && take.has(id)) continue;
    if (used + need > tokens) { if (!take.has(id) && used + cost(id) <= tokens) { take.add(id); used += cost(id); picks++; } continue; }
    for (const x of add) take.add(x); used += need; picks++;
  }
  const ids = [...take].sort((a, b) => a - b), lines = []; let lastDate = null, lastId = -9;
  for (const id of ids) { const c = byId.get(id); const head = c.date && c.date !== lastDate ? `[${c.date}] ` : (id !== lastId + 1 ? "… " : ""); lines.push(`- ${head}${c.t}`); lastDate = c.date || lastDate; lastId = id; }
  return { lines, tokens: used, ids };
}
export const RAW_TITLE = "Original excerpts (verbatim, oldest first; later lines may update earlier ones):";
