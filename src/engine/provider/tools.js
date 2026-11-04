// 도구 정의와 순수 실행 (v1.9.3): 시간·계산·주사위·웹 검색 요청/해석·HTML→글·쓰기 도구 안전 규칙.
const obj = (properties, required = []) => ({ type: "object", properties, required });
export const TOOL_DEFS = Object.freeze({
  get_current_datetime: { name: "get_current_datetime", description: "현재 날짜와 시간을 알려 줍니다.", parameters: obj({ timezone: { type: "string", description: "IANA 시간대(선택)" } }), group: "basic" },
  calculate: { name: "calculate", description: "수식을 안전하게 계산합니다(+ - * / % ** 괄호, sqrt abs min max round floor ceil).", parameters: obj({ expression: { type: "string" } }, ["expression"]), group: "basic" },
  roll_dice: { name: "roll_dice", description: "주사위를 굴립니다. 예: 2d6+3", parameters: obj({ spec: { type: "string" } }, ["spec"]), group: "basic" },
  web_search: { name: "web_search", description: "웹에서 최신 정보를 찾습니다.", parameters: obj({ query: { type: "string" } }, ["query"]), group: "web" },
  fetch_url: { name: "fetch_url", description: "주소의 글 내용을 가져옵니다.", parameters: obj({ url: { type: "string" } }, ["url"]), group: "web" },
  risu_get_character_info: { name: "risu_get_character_info", description: "현재 캐릭터의 이름·설명·성격·시나리오·첫 메시지·시스템 프롬프트를 읽습니다.", parameters: obj({}), group: "read" },
  risu_get_chat_history: { name: "risu_get_chat_history", description: "현재 채팅의 최근 메시지를 읽습니다.", parameters: obj({ limit: { type: "integer" } }), group: "read" },
  risu_list_lorebooks: { name: "risu_list_lorebooks", description: "현재 캐릭터의 로어북 항목 목록(번호·이름)을 읽습니다.", parameters: obj({}), group: "read" },
  risu_get_lorebook: { name: "risu_get_lorebook", description: "로어북 항목 하나의 내용을 읽습니다.", parameters: obj({ index: { type: "integer" } }, ["index"]), group: "read" },
  risu_list_personas: { name: "risu_list_personas", description: "페르소나 목록을 읽습니다.", parameters: obj({}), group: "read" },
  risu_get_chat_note: { name: "risu_get_chat_note", description: "현재 채팅의 노트를 읽습니다.", parameters: obj({}), group: "read" },
  memory_search: { name: "memory_search", description: "장기기억에서 인물·사건을 찾습니다.", parameters: obj({ query: { type: "string" } }, ["query"]), group: "memory" },
  risu_set_character_info: { name: "risu_set_character_info", description: "캐릭터 정보 한 칸을 바꿉니다(사용자 확인 필요).", parameters: obj({ field: { type: "string", enum: ["name", "desc", "personality", "scenario", "firstMessage", "systemPrompt", "creatorNotes"] }, value: { type: "string" } }, ["field", "value"]), group: "write" },
  risu_set_lorebook_entry: { name: "risu_set_lorebook_entry", description: "로어북 항목의 내용을 바꿉니다(사용자 확인 필요).", parameters: obj({ index: { type: "integer" }, content: { type: "string" } }, ["index", "content"]), group: "write" },
  risu_set_chat_note: { name: "risu_set_chat_note", description: "채팅 노트를 바꿉니다(사용자 확인 필요).", parameters: obj({ value: { type: "string" } }, ["value"]), group: "write" }
});
export const WRITE_TOOLS = new Set(Object.values(TOOL_DEFS).filter((d) => d.group === "write").map((d) => d.name));
export const isWriteTool = (name) => WRITE_TOOLS.has(name);
// 설정에 맞는 도구 목록 (쓰기 도구는 risuWrite 켠 경우만)
export function enabledTools(t) {
  if (!t?.enabled) return [];
  const on = [];
  if (t.datetime) on.push("get_current_datetime"); if (t.calculator) on.push("calculate"); if (t.dice) on.push("roll_dice");
  if (t.webSearch) on.push("web_search"); if (t.fetchUrl) on.push("fetch_url");
  if (t.risuRead) on.push("risu_get_character_info", "risu_get_chat_history", "risu_list_lorebooks", "risu_get_lorebook", "risu_list_personas", "risu_get_chat_note");
  if (t.memoryTools) on.push("memory_search");
  if (t.risuWrite) on.push("risu_set_character_info", "risu_set_lorebook_entry", "risu_set_chat_note");
  return on.map((n) => TOOL_DEFS[n]);
}
export function parseArgs(text) { try { const v = JSON.parse(text || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; } }
// 안전한 수식 계산(재귀 하강). eval 안 씀.
export function calculate(expr) {
  const s = String(expr ?? "").replace(/\s+/g, ""); let i = 0;
  const FN = { sqrt: Math.sqrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max };
  const peek = () => s[i];
  function num() { const m = /^\d+(?:\.\d+)?(?:e[+-]?\d+)?/i.exec(s.slice(i)); if (!m) throw new Error("수식을 읽을 수 없어요"); i += m[0].length; return Number(m[0]); }
  function atom() {
    if (peek() === "(") { i++; const v = add(); if (peek() !== ")") throw new Error("괄호가 안 닫혀요"); i++; return v; }
    if (peek() === "-") { i++; return -pow(); } if (peek() === "+") { i++; return pow(); }
    const f = /^[a-z]+/.exec(s.slice(i)); if (f) { const fn = FN[f[0]]; if (!fn) throw new Error("모르는 함수예요"); i += f[0].length; if (peek() !== "(") throw new Error("괄호가 필요해요"); i++; const a = []; if (peek() !== ")") { a.push(add()); while (peek() === ",") { i++; a.push(add()); } } if (peek() !== ")") throw new Error("괄호가 안 닫혀요"); i++; return fn(...a); }
    return num();
  }
  function pow() { const b = atom(); if (s.slice(i, i + 2) === "**") { i += 2; return b ** pow(); } return b; }
  function mul() { let v = pow(); for (;;) { const c = peek(); if (c === "*" && s[i + 1] !== "*") { i++; v *= pow(); } else if (c === "/") { i++; v /= pow(); } else if (c === "%") { i++; v %= pow(); } else return v; } }
  function add() { let v = mul(); for (;;) { const c = peek(); if (c === "+") { i++; v += mul(); } else if (c === "-") { i++; v -= mul(); } else return v; } }
  if (!s || s.length > 200) throw new Error("수식이 비었거나 너무 길어요");
  const v = add(); if (i < s.length) throw new Error("수식 끝에 읽을 수 없는 글자가 있어요");
  if (!Number.isFinite(v)) throw new Error("계산 결과가 올바르지 않아요"); return v;
}
export function rollDice(spec, rand = Math.random) {
  const m = /^\s*(\d{1,3})?d(\d{1,4})\s*([+-]\s*\d{1,5})?\s*$/i.exec(String(spec ?? "")); if (!m) throw new Error("예: 2d6+3 형식으로 적어 주세요");
  const n = Number(m[1] || 1), sides = Number(m[2]); if (n > 100 || sides < 2) throw new Error("주사위 수나 면 수가 올바르지 않아요");
  const rolls = Array.from({ length: n }, () => 1 + Math.floor(rand() * sides)), mod = m[3] ? Number(m[3].replace(/\s+/g, "")) : 0;
  return { rolls, modifier: mod, total: rolls.reduce((a, b) => a + b, 0) + mod };
}
// 주소 안전 검사: 모델이 마음대로 고른 주소로 내부망을 두드리지 못하게
export function safeFetchUrl(u) {
  let url; try { url = new URL(String(u)); } catch { return { ok: false, why: "주소 형식이 올바르지 않아요" }; }
  if (!/^https?:$/.test(url.protocol)) return { ok: false, why: "http/https만 가져올 수 있어요" };
  const h = url.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127|10|0)\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === "::1" || h.startsWith("[")) return { ok: false, why: "내부 주소는 가져올 수 없어요" };
  return { ok: true, url: url.toString() };
}
export function htmlToText(html, max = 6000) {
  const t = String(html ?? "").replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
// 웹 검색 요청/해석 (공급자 설정: brave | serpapi | google-cse | custom)
export function searchRequest(cfg, query) {
  const q = encodeURIComponent(query), p = cfg?.provider;
  if (p === "brave") return { url: `https://api.search.brave.com/res/v1/web/search?q=${q}&count=5`, headers: { "x-subscription-token": cfg.key, accept: "application/json" } };
  if (p === "serpapi") return { url: `https://serpapi.com/search.json?engine=google&q=${q}&api_key=${encodeURIComponent(cfg.key)}`, headers: {} };
  if (p === "google-cse") return { url: `https://www.googleapis.com/customsearch/v1?q=${q}&key=${encodeURIComponent(cfg.key)}&cx=${encodeURIComponent(cfg.cx)}`, headers: {} };
  if (p === "custom" && cfg.url) return { url: String(cfg.url).replace("{q}", q), headers: cfg.key ? { authorization: `Bearer ${cfg.key}` } : {} };
  throw new Error("웹 검색 공급자를 설정해 주세요");
}
export function parseSearch(j) {
  const rows = j?.web?.results ?? j?.organic_results ?? j?.items ?? j?.results ?? [];
  return rows.slice(0, 5).map((r) => ({ title: String(r.title ?? ""), url: String(r.url ?? r.link ?? ""), snippet: String(r.description ?? r.snippet ?? r.content ?? "").replace(/<[^>]+>/g, "") }));
}
// 쓰기 도구를 사람이 읽는 한 줄로 (확인 창용)
export function describeWrite(name, a = {}) {
  const cut = (s) => { const t = String(s ?? ""); return t.length > 160 ? `${t.slice(0, 160)}…` : t; };
  if (name === "risu_set_character_info") return `캐릭터 '${a.field}' 칸을 이렇게 바꿔요: ${cut(a.value)}`;
  if (name === "risu_set_lorebook_entry") return `로어북 ${a.index}번 항목 내용을 이렇게 바꿔요: ${cut(a.content)}`;
  if (name === "risu_set_chat_note") return `채팅 노트를 이렇게 바꿔요: ${cut(a.value)}`;
  return name;
}
