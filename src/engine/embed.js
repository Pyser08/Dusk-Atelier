// v1.7.1 임베딩(순수): 요청·응답 모양, 벡터 압축, 유사도, 검색 가중치. 네트워크·저장은 data/embed.js.
// 기본값: 보야지(Voyage AI) 컨텍스트 임베딩. 계정당 200M 토큰 무료(voyage-context-4). voyage-context-3은 구형이라 무료 토큰이 없다.
export const DEFAULT_EMBED = Object.freeze({ on: false, url: "https://api.voyageai.com/v1/contextualizedembeddings", model: "voyage-context-4", timeoutMs: 4000, minSim: 0.32 });
const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

export function normCfg(c) {
  const x = c && typeof c === "object" ? c : {};
  return { on: x.on === true, url: String(x.url ?? DEFAULT_EMBED.url).trim().slice(0, 300), model: String(x.model ?? DEFAULT_EMBED.model).trim().slice(0, 100), timeoutMs: num(x.timeoutMs, 4000, 1000, 20000), minSim: num(x.minSim, 0.32, 0.1, 0.8) };
}
// 주소 끝이 /embeddings가 아니면 붙인다(OpenAI 호환: .../v1 → .../v1/embeddings).
export function endpointOf(url) {
  const u = String(url ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(u)) return "";
  return /\/(contextualized)?embeddings$/i.test(u) ? u : u + "/embeddings";
}
// 보야지 컨텍스트 임베딩(요청 inputs=[[글…]], 응답 data[].data[].embedding)은 OpenAI 호환과 모양이 달라 따로 다룬다.
export const isContextual = (cfg) => /\/contextualizedembeddings$/i.test(endpointOf(cfg?.url));
const isVoyage = (cfg) => /^https?:\/\/[^/]*voyageai\.com/i.test(String(cfg?.url ?? ""));
export const isReady = (cfg, hasKey) => !!(cfg?.on && endpointOf(cfg.url) && cfg.model && (hasKey || /^https?:\/\/(localhost|127\.|192\.168\.|10\.)/i.test(cfg.url)));

// inputs: 글 배열, 또는 {groups:[[글…]…], type:"document"|"query"}. 컨텍스트 모드는 묶음(같은 문서의 조각들)을 그대로 보낸다.
export function buildRequest(cfg, key, inputs) {
  const headers = { "Content-Type": "application/json" };
  if (key) headers.Authorization = "Bearer " + key;
  const o = Array.isArray(inputs) ? { texts: inputs } : inputs ?? {}, type = o.type === "query" ? "query" : "document";
  const body = isContextual(cfg) ? { model: cfg.model, inputs: o.groups ?? (o.texts ?? []).map((t) => [t]), input_type: type }
    : { model: cfg.model, input: o.groups ? o.groups.flat() : o.texts ?? [], ...(isVoyage(cfg) ? { input_type: type } : {}) };
  return { url: endpointOf(cfg.url), headers, body: JSON.stringify(body) };
}
const okVec = (v) => Array.isArray(v) && v.length > 3 && v.every((n) => Number.isFinite(n));
// 응답 → 벡터 배열(입력 순서, 컨텍스트 모드는 묶음을 이어 붙인 순서). 모양이 어긋나면 null.
export function parseResponse(json, count, contextual = false) {
  const d = json?.data; if (!Array.isArray(d)) return null;
  const sorted = [...d].sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0));
  const rows = contextual ? sorted.flatMap((g) => Array.isArray(g?.data) ? [...g.data].sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0)).map((x) => x?.embedding) : [null]) : sorted.map((x) => x?.embedding);
  return rows.length === count && rows.every(okVec) ? rows : null;
}
// 단위 벡터로 만든 뒤 int8로 줄여 base64 글로 저장(원본의 1/8 크기, 유사도 오차 ~1%).
export function pack(vec) {
  let n = 0; for (const v of vec) n += v * v; n = Math.sqrt(n) || 1;
  const b = new Int8Array(vec.length); for (let i = 0; i < vec.length; i++) b[i] = Math.round((vec[i] / n) * 127);
  let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i] & 255);
  return btoa(s);
}
export function unpack(str) {
  try { const s = atob(String(str)), a = new Int8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = (s.charCodeAt(i) << 24) >> 24; return a; } catch { return null; }
}
export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; }
  return x && y ? d / Math.sqrt(x * y) : 0;
}
// 유사도 → 점수 배율: 기준(minSim) 아래는 1배, 위로 갈수록 최대 3배.
export const semBoost = (sim, minSim = 0.32) => sim == null || sim < minSim ? 1 : 1 + Math.min(2, (sim - minSim) * 6);
export const semHit = (sim, minSim = 0.32) => sim != null && sim >= minSim + 0.08;
export const recordText = (person, rec) => `${person?.name ?? ""}: ${rec?.act ?? ""}`.trim().slice(0, 300);
