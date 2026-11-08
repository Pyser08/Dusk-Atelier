// 다른 플러그인 창구(2.0.0, 순수): pluginStorage 우편함 규칙.
// 요청 키  dusk.ipc.v1.req.<플러그인>  — 그 플러그인만 쓴다. 요청 하나 {v:1,id,messages:[{role,content}],profile?,maxTokens?,temperature?,ts?} 또는 그 배열.
// 결과 키  dusk.ipc.v1.res.<플러그인>  — Dusk만 쓴다. {v:1,results:[{id,ok,text|error,at,ms}]} (최근 10개·1시간)
// 쓰는 쪽이 하나뿐이라 서로 덮어쓰지 않는다. Dusk는 요청 키를 고치지 않고, 처리한 id를 기억해 두 번 처리하지 않는다.
export const PREFIX = "dusk.ipc.v1.";
export const REQ_PREFIX = `${PREFIX}req.`, RES_PREFIX = `${PREFIX}res.`;
export const LIMITS = Object.freeze({ maxPerRead: 16, maxMessages: 200, maxChars: 500000, maxTokens: 32000, resultKeep: 10, resultTtlMs: 3600e3, requestTtlMs: 30 * 60e3, idLen: 64 });
const num = (v) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const safeName = (n) => String(n ?? "").trim().replace(/[^\w.\-가-힣]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
export const reqKey = (plugin) => `${REQ_PREFIX}${safeName(plugin)}`;
export const resKey = (plugin) => `${RES_PREFIX}${safeName(plugin)}`;
export const pluginOfReqKey = (key) => (typeof key === "string" && key.startsWith(REQ_PREFIX) ? safeName(key.slice(REQ_PREFIX.length)) : "");

const ROLES = new Set(["system", "user", "assistant"]);
function readOne(r) {
  const id = typeof r?.id === "string" ? r.id.trim().slice(0, LIMITS.idLen) : "";
  if (!id) return { error: { id: "", error: "요청 id가 없어요" } };
  const msgs = Array.isArray(r.messages) ? r.messages : [];
  if (!msgs.length) return { error: { id, error: "messages가 비었어요" } };
  if (msgs.length > LIMITS.maxMessages) return { error: { id, error: `messages가 너무 많아요(최대 ${LIMITS.maxMessages}개)` } };
  let chars = 0; const messages = [];
  for (const m of msgs) {
    if (!ROLES.has(m?.role) || typeof m.content !== "string") return { error: { id, error: "messages는 {role: system|user|assistant, content: 글} 모양이어야 해요" } };
    chars += m.content.length; messages.push({ role: m.role, content: m.content });
  }
  if (chars > LIMITS.maxChars) return { error: { id, error: `글이 너무 길어요(최대 ${LIMITS.maxChars}자)` } };
  const out = { id, messages }, mt = num(r.maxTokens), tp = num(r.temperature), ts = num(r.ts);
  if (mt !== null && mt > 0) out.maxTokens = Math.min(LIMITS.maxTokens, Math.floor(mt));
  if (tp !== null) out.temperature = clamp(tp, 0, 2);
  if (typeof r.profile === "string" && r.profile.trim()) out.profile = r.profile.trim().slice(0, 80);
  if (ts !== null) out.ts = ts;
  return { ok: out };
}
// 저장된 값(글·객체·배열)을 읽는다. 잘못된 것은 이유와 함께 bad로. 같은 id는 첫 번째만.
export function parseRequests(raw) {
  let v = raw; if (typeof v === "string") { try { v = JSON.parse(v); } catch { return { ok: [], bad: [] }; } }
  if (!v || typeof v !== "object") return { ok: [], bad: [] };
  const list = (Array.isArray(v) ? v : [v]).slice(0, LIMITS.maxPerRead), ok = [], bad = [], seen = new Set();
  for (const item of list) {
    const r = readOne(item); if (r.error) { bad.push(r.error); continue; }
    if (seen.has(r.ok.id)) continue; seen.add(r.ok.id); ok.push(r.ok);
  }
  return { ok, bad };
}
export const isStale = (req, now) => req.ts !== undefined && now - req.ts > LIMITS.requestTtlMs;
// 결과는 최근 것부터 10개, 1시간이 지나면 버린다
export function pruneResults(rows, now) {
  return (Array.isArray(rows) ? rows : []).filter((r) => r && typeof r.id === "string" && Number.isFinite(r.at) && now - r.at <= LIMITS.resultTtlMs).sort((a, b) => b.at - a.at).slice(0, LIMITS.resultKeep);
}
export function normalizeIpc(raw) {
  const plugins = {};
  for (const [k, v] of Object.entries(raw?.plugins && typeof raw.plugins === "object" ? raw.plugins : {})) { const n = safeName(k); if (n && typeof v?.allow === "boolean") plugins[n] = { allow: v.allow }; }
  return { enabled: !!raw?.enabled, concurrency: clamp(Math.floor(num(raw?.concurrency) ?? 2), 1, 8), pollSec: clamp(Math.floor(num(raw?.pollSec) ?? 3), 1, 30), profileId: typeof raw?.profileId === "string" ? raw.profileId : "", plugins };
}
export const hasInterest = (ipc) => !!ipc?.enabled;
export const redactError = (s) => String(s ?? "").replace(/\b(sk|key|AIza|xai|gsk)[-_A-Za-z0-9]{6,}/g, "***").slice(0, 300);
