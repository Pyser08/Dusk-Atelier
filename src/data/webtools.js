// 웹 검색·가져오기 도구 (v1.8.1). 기본 꺼짐. 켠 단계(기본: 정리 노트)에서만 모델이 도구를 부를 수 있고, 부르면 호출이 늘어난다.
// 네트워크는 nativeFetch만(호스트 CSP 우회). API 키는 이 기기의 플러그인 저장소에만 두고 내보내기·백업에 넣지 않는다.
import { WEB_LIMITS, WEB_PROVIDERS, webReady, buildSearch, parseSearch, formatResults, checkUrl, htmlToText, toolInstruction, runToolLoop } from "../engine/websearch.js";
import { noteTools } from "../engine/skillhook.js";

export const WEB_KEY = "dusk.web.v1";
export const WEB_STAGES = ["router", "director", "writer", "analysis"];
export const defaultWebCfg = () => ({ v: 1, on: false, stages: ["director"], provider: "wikipedia", key: "", baseUrl: "", lang: "ko", maxResults: WEB_LIMITS.results, maxSteps: 2 });
export function normalizeWebCfg(raw) {
  const d = defaultWebCfg(); if (!raw || typeof raw !== "object") return d;
  return { v: 1, on: raw.on === true, stages: WEB_STAGES.filter((s) => Array.isArray(raw.stages) ? raw.stages.includes(s) : d.stages.includes(s)),
    provider: WEB_PROVIDERS[raw.provider] ? raw.provider : d.provider, key: String(raw.key ?? "").trim().slice(0, 400), baseUrl: String(raw.baseUrl ?? "").trim().slice(0, 300),
    lang: /^[a-z-]{2,10}$/i.test(raw.lang || "") ? raw.lang : "ko", maxResults: Math.max(1, Math.min(WEB_LIMITS.results, Number(raw.maxResults) || d.maxResults)), maxSteps: Math.max(1, Math.min(WEB_LIMITS.steps, Number(raw.maxSteps) || d.maxSteps)) };
}
const parse = (raw) => { try { return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null; } catch { return null; } };

export function createWebTools(api, { log = (...a) => console.log("[Dusk 웹 도구]", ...a) } = {}) {
  let cfg = null;
  async function getCfg() { if (!cfg) cfg = normalizeWebCfg(parse(await api.pluginStorage.getItem(WEB_KEY))); return cfg; }
  async function saveCfg(next) { const n = normalizeWebCfg(next); await api.pluginStorage.setItem(WEB_KEY, JSON.stringify(n)); cfg = n; return n; }
  const fetchText = async (url, init) => {
    if (typeof api.nativeFetch !== "function") throw new Error("이 환경에서는 웹 요청을 보낼 수 없어요.");
    const res = await api.nativeFetch(url, init);
    if (!res?.ok) throw new Error(`요청에 실패했어요 (HTTP ${Number(res?.status) || 0}).`);
    return String(await res.text()).slice(0, 1500000);
  };
  async function search(query, c = null) {
    const conf = c ?? await getCfg(), { req, text, limit } = buildSearch(conf, query);
    const body = await fetchText(req.url, { method: req.method, headers: req.headers, body: req.body });
    let data = body; if (!text) { try { data = JSON.parse(body); } catch { throw new Error("검색 결과를 읽을 수 없어요."); } }
    return parseSearch(conf, data, limit);
  }
  async function fetchPage(url) {
    const chk = checkUrl(url); if (!chk.ok) throw new Error(chk.reason);
    return htmlToText(await fetchText(chk.url, { method: "GET", redirect: "error" }));
  }
  async function exec(name, args) {
    if (name === "web_search") return formatResults(await search(String(args?.query ?? "")));
    if (name === "web_fetch") return await fetchPage(String(args?.url ?? "")) || "(empty page)";
    throw new Error(`알 수 없는 도구: ${name}`);
  }
  // 켜져 있고 이 단계가 선택됐고 설정이 갖춰졌을 때만 도구 안내를 붙이고 도구 호출을 처리한다. 아니면 call(prompt) 한 번.
  async function wrap(stage, prompt, call) {
    let c; try { c = await getCfg(); } catch { return call(prompt); }
    if (!c.on || !c.stages.includes(stage) || webReady(c)) return call(prompt);
    const p = `${prompt}\n\n${toolInstruction(c.maxSteps)}`;
    const r = await runToolLoop(await call(p), (extra) => call(`${p}\n\n${extra}`), exec, c.maxSteps);
    if (r.used.length) { noteTools(stage, r.used.map((u) => u.name)); log(`${stage}: 도구 ${r.used.map((u) => u.name).join(", ")}`); }
    return r.text;
  }
  return { getCfg, saveCfg, search, fetchPage, exec, wrap };
}
