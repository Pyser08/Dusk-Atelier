// 기본 도구 실행 (v1.9.3): 시간·계산·주사위·웹 검색·URL 가져오기. 리스 데이터 도구는 risutools.js.
import { calculate, rollDice, safeFetchUrl, htmlToText, searchRequest, parseSearch } from "../../engine/provider/tools.js";
export function createToolExec({ api, now = () => new Date(), rand = Math.random, timeoutSec = 30 } = {}) {
  async function get(url, headers, ms) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
    try { const r = await api.nativeFetch(url, { method: "GET", headers, signal: ac.signal }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r; } finally { clearTimeout(t); }
  }
  return async function exec(name, args, cfg) {
    const ms = (cfg?.tools?.timeoutSec || timeoutSec) * 1000;
    if (name === "get_current_datetime") { const d = now(); try { return d.toLocaleString("ko-KR", { timeZone: args.timezone || undefined, dateStyle: "full", timeStyle: "long" }); } catch { return d.toISOString(); } }
    if (name === "calculate") return String(calculate(args.expression));
    if (name === "roll_dice") { const r = rollDice(args.spec, rand); return `${r.rolls.join("+")}${r.modifier ? (r.modifier > 0 ? "+" : "") + r.modifier : ""} = ${r.total}`; }
    if (name === "web_search") { const q = searchRequest(cfg.tools.search, String(args.query ?? "")); const j = await (await get(q.url, q.headers, ms)).json(); return JSON.stringify(parseSearch(j)); }
    if (name === "fetch_url") { const s = safeFetchUrl(args.url); if (!s.ok) return s.why; const r = await get(s.url, { accept: "text/html,text/plain" }, ms); return htmlToText(await r.text()); }
    return undefined;
  };
}
// 선행 검색: 요청 전에 검색해 결과를 시스템 글로 넣는다(설정 prefetch). 실패하면 조용히 건너뜀.
export async function prefetchSearch(exec, cfg, messages) {
  const p = cfg.tools.prefetch; if (!cfg.tools.enabled || !p.enabled) return messages;
  const last = [...messages].reverse().find((m) => m.role === "user"); const text = typeof last?.content === "string" ? last.content : ""; if (!text) return messages;
  const kws = p.keywords.split(/[\n,]/).map((s) => s.trim()).filter(Boolean); if (kws.length && !kws.some((k) => text.includes(k))) return messages;
  try {
    const rows = JSON.parse(await exec("web_search", { query: text.slice(0, 200) }, cfg)).slice(0, p.maxResults);
    if (!rows.length) return messages;
    const block = { role: "system", content: `[웹 검색 결과]\n${rows.map((r) => `- ${r.title}${p.snippetOnly ? "" : ` (${r.url})`}: ${r.snippet}`).join("\n")}` };
    const out = [...messages]; const at = p.position === "start" ? 0 : Math.max(0, out.length - 1); out.splice(at, 0, block); return out;
  } catch { return messages; }
}
