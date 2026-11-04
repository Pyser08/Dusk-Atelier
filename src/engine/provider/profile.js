// 프로바이더 설정 (v1.9.3, 순수): 저장 모양·정리·상속(기본 → 연결 → 프로필 → 용도 덮어쓰기).
// 저장 모양: { v:1, connections:[{id,name,kind,format,baseUrl,keyIds[],keyMode,proxyUrl,headers,params,vertex,...}],
//   profiles:[{id,name,connectionId,model,sampling,thinking,stream,cache,tier,safety,search,repetition,prefill,pricing,retry,params,headers}],
//   purposes:{main:{profileId,over},...}, chain:[profileId], chainOn, budget, perChar:{}, transforms:{rules:[]}, tools:{...}, translator:{...}, debug }
import { KINDS, PURPOSES, kindOf } from "./catalog.js";
const uid = () => Math.random().toString(36).slice(2, 10);
const str = (v, d = "") => (typeof v === "string" ? v : d);
const numOrNull = (v) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
const pick = (v, list, d) => (list.includes(v) ? v : d);

export const defaultConfig = () => ({
  v: 1, enabled: false, connections: [], profiles: [], purposes: Object.fromEntries(PURPOSES.map((p) => [p, { profileId: "", over: {} }])),
  chain: [], chainOn: false, budget: { dailyUsd: 0, monthlyUsd: 0, action: "warn", switchProfileId: "" }, perChar: {},
  defaults: { stream: "stream", retry: 2, timeoutSec: 300, repetition: { on: true, charRun: 240, minRepeats: 6, minChars: 400 }, keepPartial: true, keyCooldownSec: 60 },
  transforms: { rules: [], cacheOrder: false },
  tools: { enabled: false, datetime: true, calculator: true, dice: true, webSearch: false, fetchUrl: false, maxDepth: 4, timeoutSec: 30, search: { provider: "brave", url: "", key: "", cx: "" }, prefetch: { enabled: false, position: "beforeLast", maxResults: 3, snippetOnly: true, keywords: "" }, risuRead: false, risuWrite: false, memoryTools: false },
  translator: { enabled: false, protect: true, glossary: true, history: 2, maxBytes: 8192, guide: "", glossaryText: "" },
  debug: { preview: false }
});

export function normalizeConnection(c) {
  const kind = KINDS[c?.kind] ? c.kind : "custom", k = kindOf(kind);
  return { id: str(c?.id) || uid(), name: str(c?.name, k.label).slice(0, 40) || k.label, kind, format: pick(c?.format, ["openai", "responses", "anthropic", "gemini", "vertex"], k.format),
    baseUrl: str(c?.baseUrl, k.baseUrl).trim(), keyIds: Array.isArray(c?.keyIds) ? c.keyIds.map(String).slice(0, 40) : [], keyMode: pick(c?.keyMode, ["random", "rotate", "affinity"], "random"),
    proxyUrl: str(c?.proxyUrl).trim(), headers: obj(c?.headers), params: obj(c?.params), vertex: { projectId: str(c?.vertex?.projectId), location: str(c?.vertex?.location, "global") || "global" },
    providerSlug: str(c?.providerSlug), copilotEngine: str(c?.copilotEngine, "vscode"), hidden: Array.isArray(c?.hidden) ? c.hidden.map(String) : [], userModels: Array.isArray(c?.userModels) ? c.userModels.map(String) : [] };
}
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? { ...v } : {});
export function normalizeProfile(p) {
  const s = p?.sampling ?? {}, t = p?.thinking ?? {}, c = p?.cache ?? {}, pr = p?.pricing ?? {};
  return { id: str(p?.id) || uid(), name: str(p?.name, "프로필").slice(0, 40) || "프로필", connectionId: str(p?.connectionId), model: str(p?.model).trim(),
    sampling: { temperature: numOrNull(s.temperature), topP: numOrNull(s.topP), topK: numOrNull(s.topK), frequencyPenalty: numOrNull(s.frequencyPenalty), presencePenalty: numOrNull(s.presencePenalty), maxTokens: numOrNull(s.maxTokens), seed: numOrNull(s.seed), stop: Array.isArray(s.stop) ? s.stop.map(String).filter(Boolean).slice(0, 8) : [] },
    thinking: { mode: pick(t.mode, ["", "budget", "adaptive"], ""), budget: numOrNull(t.budget), effort: str(t.effort), level: str(t.level), display: pick(t.display, ["", "summarized", "omitted"], ""), include: !!t.include, showThinking: !!t.showThinking, continuation: !!t.continuation },
    stream: pick(p?.stream, ["", "stream", "buffered", "off"], ""), cache: { claude: pick(c.claude, ["off", "5m", "1h"], "off"), breakpoints: numOrNull(c.breakpoints) ?? 2, openai: pick(c.openai, ["off", "in_memory", "24h"], "off"), gemini: pick(c.gemini, ["off", "observe", "auto", "manual"], "off"), geminiTtl: numOrNull(c.geminiTtl) ?? 1800, geminiMinRepeats: numOrNull(c.geminiMinRepeats) ?? 3, geminiMarker: str(c.geminiMarker, "{{cache_marker}}") },
    tier: str(p?.tier), verbosity: str(p?.verbosity), safety: str(p?.safety), search: pick(p?.search, ["off", "auto"], "off"),
    repetition: pick(p?.repetition, ["inherit", "on", "off"], "inherit"), prefill: str(p?.prefill), pdf: pick(p?.pdf, ["off", "full"], "off"),
    pricing: { input: numOrNull(pr.input) ?? 0, output: numOrNull(pr.output) ?? 0, cached: numOrNull(pr.cached), cwrite: numOrNull(pr.cwrite) }, retry: numOrNull(p?.retry), params: obj(p?.params), headers: obj(p?.headers) };
}
export function normalizeConfig(raw) {
  const d = defaultConfig(); if (!raw || typeof raw !== "object") return d;
  const connections = (Array.isArray(raw.connections) ? raw.connections : []).map(normalizeConnection);
  const cid = new Set(connections.map((c) => c.id));
  const profiles = (Array.isArray(raw.profiles) ? raw.profiles : []).map(normalizeProfile).filter((p) => cid.has(p.connectionId));
  const pid = new Set(profiles.map((p) => p.id));
  const purposes = {}; for (const k of PURPOSES) { const r = raw.purposes?.[k]; purposes[k] = { profileId: pid.has(r?.profileId) ? r.profileId : "", over: sanitizeOver(r?.over) }; }
  const b = raw.budget ?? {};
  return { ...d, v: 1, enabled: !!raw.enabled, connections, profiles, purposes, chain: (Array.isArray(raw.chain) ? raw.chain : []).filter((x) => pid.has(x)), chainOn: !!raw.chainOn,
    budget: { dailyUsd: numOrNull(b.dailyUsd) ?? 0, monthlyUsd: numOrNull(b.monthlyUsd) ?? 0, action: pick(b.action, ["warn", "switch", "block"], "warn"), switchProfileId: pid.has(b.switchProfileId) ? b.switchProfileId : "" },
    perChar: Object.fromEntries(Object.entries(obj(raw.perChar)).filter(([, v]) => pid.has(v?.profileId)).map(([k, v]) => [k, { profileId: v.profileId }])),
    defaults: { ...d.defaults, ...obj(raw.defaults), repetition: { ...d.defaults.repetition, ...obj(raw.defaults?.repetition) } }, transforms: { rules: (raw.transforms?.rules ?? []).map(normalizeRule).slice(0, 40), cacheOrder: !!raw.transforms?.cacheOrder },
    tools: { ...d.tools, ...obj(raw.tools), search: { ...d.tools.search, ...obj(raw.tools?.search) }, prefetch: { ...d.tools.prefetch, ...obj(raw.tools?.prefetch) } }, translator: { ...d.translator, ...obj(raw.translator) }, debug: { preview: !!raw.debug?.preview } };
}
const OVER_KEYS = ["sampling", "thinking", "stream", "cache", "tier", "verbosity", "safety", "search", "repetition", "prefill", "retry", "pdf"];
function sanitizeOver(o) { const r = {}; for (const k of OVER_KEYS) if (o && o[k] !== undefined && o[k] !== "") r[k] = o[k]; return r; }
export function normalizeRule(r) {
  return { id: str(r?.id) || uid(), name: str(r?.name, "규칙").slice(0, 40), enabled: r?.enabled !== false, text: str(r?.text).slice(0, 8000), role: pick(r?.role, ["system", "user"], "system"), position: pick(r?.position, ["start", "end", "beforeLast", "afterFirst"], "start"),
    purposes: Array.isArray(r?.purposes) ? r.purposes.filter((p) => PURPOSES.includes(p)) : [], modelRegex: str(r?.modelRegex), charRegex: str(r?.charRegex) };
}
// 용도에 덮어쓰기를 적용한 유효 프로필 + 연결. 상속: 기본값(defaults) → 프로필 → 용도 over
export function resolve(cfg, purpose, { chaId = "", profileId = "" } = {}) {
  const pid = profileId || cfg.perChar?.[chaId]?.profileId || cfg.purposes?.[purpose]?.profileId || cfg.purposes?.main?.profileId || "";
  const base = cfg.profiles.find((p) => p.id === pid); if (!base) return null;
  const conn = cfg.connections.find((c) => c.id === base.connectionId); if (!conn) return null;
  const over = cfg.purposes?.[purpose]?.over ?? {}, eff = JSON.parse(JSON.stringify(base));
  for (const k of OVER_KEYS) { const v = over[k]; if (v === undefined) continue; if (v && typeof v === "object" && !Array.isArray(v)) eff[k] = { ...eff[k], ...Object.fromEntries(Object.entries(v).filter(([, x]) => x !== "" && x !== null && x !== undefined)) }; else eff[k] = v; }
  const d = cfg.defaults;
  eff.stream = eff.stream || d.stream; eff.retry = eff.retry ?? d.retry;
  eff.repetitionOn = eff.repetition === "inherit" ? d.repetition.on : eff.repetition === "on";
  return { profile: eff, conn, profileId: base.id, purpose };
}
// 대체 사슬 순서: 선택된 프로필 → 사슬의 나머지(중복 제외)
export function chainOrder(cfg, firstId) { return [firstId, ...(cfg.chainOn ? cfg.chain : []).filter((x) => x !== firstId)]; }
export const hasUsableProfile = (cfg) => cfg.profiles.length > 0;
// 프로필 → 기존 모델 프리셋(기억 분석·Cellar 서버 분석이 쓰는 모양). 지원 안 하는 형식이면 null.
export function toPotPreset(conn, profile) {
  const k = conn.kind, map = { openai: "openai", anthropic: "claude", google: "google", vertex: "vertex-ai", deepseek: "deepseek", openrouter: "openrouter", ollama: "ollama", llmgateway: "llmgateway", copilot: "copilot", custom: "custom", nanogpt: "custom", vercel: "custom", neuralwatt: "custom", wellspring: "custom" };
  const provider = map[k]; if (!provider || conn.format === "responses") return null;
  if (provider === "google" && !/openai/.test(conn.baseUrl)) return { provider, baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: profile.model };
  return { provider, baseUrl: conn.baseUrl, model: profile.model };
}
