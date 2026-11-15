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
export function assemble(chunks, rankedIds, { tokens = 1000, neighbor = 1, maxPicks = 8, perDate = 0, dates = false } = {}) {
  const byId = new Map(chunks.map((c) => [c.id, c])), take = new Set(), perD = new Map(); let used = 0, picks = 0;   // perDate>0: 같은 날짜에서 고르는 조각 수 제한(여러 세션에서 골고루)
  const cost = (id) => estimateTokens(byId.get(id)?.t ?? "") + 4;
  for (const id of rankedIds) {
    if (picks >= maxPicks) break;
    const dk = byId.get(id)?.date ?? ""; if (perDate > 0 && dk && (perD.get(dk) ?? 0) >= perDate) continue;
    const group = [id]; for (let d = 1; d <= neighbor; d++) group.push(id - d, id + d);
    const add = group.filter((x) => byId.has(x) && !take.has(x)), need = add.reduce((s, x) => s + cost(x), 0);
    if (!add.includes(id) && take.has(id)) continue;
    if (used + need > tokens) { if (!take.has(id) && used + cost(id) <= tokens) { take.add(id); used += cost(id); picks++; } continue; }
    for (const x of add) take.add(x); used += need; picks++; if (dk) perD.set(dk, (perD.get(dk) ?? 0) + 1);
  }
  const ids = [...take].sort((a, b) => a - b), lines = []; let lastDate = null, lastId = -9;
  for (const id of ids) { const c = byId.get(id); const head = c.date && c.date !== lastDate ? `[${c.date}] ` : (id !== lastId + 1 ? "… " : ""); lines.push(`- ${head}${dates ? annotateDates(c.t, c.date) : c.t}`); lastDate = c.date || lastDate; lastId = id; }
  return { lines, tokens: used, ids };
}
// ── 2.2.2 검색어 나누기: 여러 근거가 필요한 질문을 몇 갈래로 찾는다(모델 호출 없음) ──
const QWORDS = new Set("무엇 뭐 뭘 언제 어디 어디서 어떤 어떻게 왜 누구 누가 몇 얼마나 무슨 했나요 하나요 인가요 있나요 됐나요 했어 해 했니 있어 what when where which how why who whom does did do is are was were the a an".split(" "));
const JOSA = /(으로부터|에게서|에서는|으로는|이라고|라고|에서|에게|한테|으로|부터|까지|처럼|보다|이랑|랑|과|와|은|는|이|가|을|를|의|에|도|로|만)$/u;
export function subQueries(query, names = []) {
  const q = String(query ?? "").replace(/\s+/g, " ").trim(); if (!q) return [];
  const nameRe = names.filter((n) => n && n.length >= 2).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const noName = nameRe.length ? q.replace(new RegExp(nameRe.join("|"), "g"), " ").replace(/\s+/g, " ").trim() : q;
  const words = q.split(/[^\p{L}\p{N}]+/u).map((w) => w.replace(JOSA, "")).filter((w) => w.length >= 2 && !QWORDS.has(w.toLowerCase()));
  const nn = noName.replace(/^(은|는|이|가|을|를|의|와|과)\s+/u, "");
  const out = [q]; if (nn && nn !== q && nn.length >= 4) out.push(nn); if (words.length >= 2) out.push(words.join(" "));
  return [...new Set(out)].slice(0, 3);
}

// ── 2.2.2 상대 시간 옆에 실제 날짜(대화 날짜 기준)를 붙인다. 보여 줄 때만 쓰고 임베딩 글은 바꾸지 않는다 ──
const pad = (n) => String(n).padStart(2, "0"), iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export function isoOf(s) {
  const t = String(s ?? ""); let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = t.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/); if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return null;
}
const DAYS = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const addD = (d, n) => new Date(d.getTime() + n * 86400000);
const NUMK = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6 };
export function annotateDates(text, dateStr) {
  const base = isoOf(dateStr); if (!base) return text;
  const tag = (s) => `(≈${s})`, ym = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  const rules = [
    [/(그저께|그제|the day before yesterday)/gi, () => tag(iso(addD(base, -2)))],
    [/(어제|yesterday)/gi, () => tag(iso(addD(base, -1)))],
    [/(내일|tomorrow)/gi, () => tag(iso(addD(base, 1)))],
    [/(지난\s*(?:주\s*)?([일월화수목금토])요일|last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday))/gi, (m, _a, k, e) => { const w = DAYS[(k ?? e ?? "").toLowerCase()]; if (w == null) return ""; let d = addD(base, -1); while (d.getUTCDay() !== w) d = addD(d, -1); return tag(iso(d)); }],
    [/(지난\s*주말|last\s+weekend)/gi, () => { let d = addD(base, -1); while (d.getUTCDay() !== 0) d = addD(d, -1); return tag(`${iso(addD(d, -1))}~${iso(d)}`); }],
    [/(지난\s*주|저번\s*주|last\s+week)/gi, () => tag(`${iso(addD(base, -7))} 주`)],
    [/(지난\s*달|저번\s*달|last\s+month)/gi, () => { const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - 1, 1)); return tag(ym(d)); }],
    [/(작년|지난해|last\s+year)/gi, () => tag(String(base.getUTCFullYear() - 1))],
    [/(다음\s*주|next\s+week)/gi, () => tag(`${iso(addD(base, 7))} 주`)],
    [/(다음\s*달|next\s+month)/gi, () => { const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1)); return tag(ym(d)); }],
    [/((\d+|한|두|세|네|다섯|여섯)\s*(일|주|달|개월|년)\s*전)/g, (m, _a, n, u) => { const k = Number(n) || NUMK[n] || 0; if (!k) return ""; if (u === "일") return tag(iso(addD(base, -k))); if (u === "주") return tag(`${iso(addD(base, -7 * k))} 주`); if (u === "년") return tag(String(base.getUTCFullYear() - k)); const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - k, 1)); return tag(ym(d)); }],
  ];
  let out = String(text); const seen = new Set();
  for (const [re, f] of rules) out = out.replace(re, (...a) => { const m = a[0]; if (seen.has(a.at(-2))) return m; const t = f(...a); if (t) for (let i = 0; i < m.length; i++) seen.add(a.at(-2) + i); return t ? m + t : m; });
  return out;
}
export const RAW_TITLE = "Original excerpts (verbatim, oldest first; later lines may update earlier ones):";
