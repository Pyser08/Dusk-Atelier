// 웹 검색·가져오기 도구 (v1.8.1, 순수). 검색 서비스별 요청/응답 해석 + 주소 안전 검사(SSRF) + 글로 된 도구 호출 규약.
// 네트워크는 하지 않는다(data/webtools.js가 nativeFetch로 보낸다). 도구는 기본 꺼짐이며 켠 단계에서만 호출이 늘어난다.
export const WEB_LIMITS = Object.freeze({ results: 5, snippet: 400, fetchChars: 8000, query: 300, steps: 3, resultBlock: 6000 });

const strip = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
const item = (title, url, snippet) => ({ title: strip(title).slice(0, 200), url: String(url || "").trim(), snippet: strip(snippet).slice(0, WEB_LIMITS.snippet) });
const enc = encodeURIComponent;
const trimUrl = (u) => String(u || "").replace(/\/+$/, "");

// id → { label, needsKey, needsUrl, build(conf, q, n) → {url, method, headers?, body?}, parse(data, conf) → [{title,url,snippet}] }
export const WEB_PROVIDERS = {
  wikipedia: { label: "Wikipedia", needsKey: false, needsUrl: false,
    build: (c, q, n) => ({ url: `https://${/^[a-z-]{2,10}$/i.test(c.lang || "") ? c.lang : "ko"}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${enc(q)}&srlimit=${n}&format=json&origin=*`, method: "GET" }),
    parse: (d, c) => (d?.query?.search || []).map((r) => item(r.title, `https://${/^[a-z-]{2,10}$/i.test(c.lang || "") ? c.lang : "ko"}.wikipedia.org/wiki/${enc(String(r.title).replace(/ /g, "_"))}`, r.snippet)) },
  duckduckgo: { label: "DuckDuckGo", needsKey: false, needsUrl: false, text: true,
    build: (c, q) => ({ url: `https://html.duckduckgo.com/html/?q=${enc(q)}`, method: "GET" }),
    parse: (html) => {
      const src = String(html || ""), out = [], re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, hits = [];
      let m; while ((m = re.exec(src))) hits.push({ href: m[1], title: m[2], from: re.lastIndex });
      hits.forEach((h, i) => {
        let u = h.href.replace(/&amp;/g, "&"); const g = /[?&]uddg=([^&]+)/.exec(u);
        if (g) { try { u = decodeURIComponent(g[1]); } catch { /* 그대로 */ } } else if (u.startsWith("//")) u = "https:" + u;
        const seg = src.slice(h.from, hits[i + 1] ? hits[i + 1].from : src.length), sn = /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/.exec(seg);
        out.push(item(h.title, u, sn ? sn[1] : ""));
      });
      return out;
    } },
  brave: { label: "Brave", needsKey: true, needsUrl: false,
    build: (c, q, n) => ({ url: `https://api.search.brave.com/res/v1/web/search?q=${enc(q)}&count=${n}`, method: "GET", headers: { "X-Subscription-Token": c.key, accept: "application/json" } }),
    parse: (d) => (d?.web?.results || []).map((r) => item(r.title, r.url, r.description)) },
  tavily: { label: "Tavily", needsKey: true, needsUrl: false,
    build: (c, q, n) => ({ url: "https://api.tavily.com/search", method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${c.key}` }, body: JSON.stringify({ query: q, max_results: n }) }),
    parse: (d) => (d?.results || []).map((r) => item(r.title, r.url, r.content)) },
  serper: { label: "Serper", needsKey: true, needsUrl: false,
    build: (c, q, n) => ({ url: "https://google.serper.dev/search", method: "POST", headers: { "content-type": "application/json", "X-API-KEY": c.key }, body: JSON.stringify({ q, num: n }) }),
    parse: (d) => (d?.organic || []).map((r) => item(r.title, r.link, r.snippet)) },
  exa: { label: "Exa", needsKey: true, needsUrl: false,
    build: (c, q, n) => ({ url: "https://api.exa.ai/search", method: "POST", headers: { "content-type": "application/json", "x-api-key": c.key }, body: JSON.stringify({ query: q, numResults: n, contents: { text: { maxCharacters: 500 } } }) }),
    parse: (d) => (d?.results || []).map((r) => item(r.title, r.url, r.text || r.summary)) },
  searxng: { label: "SearXNG", needsKey: false, needsUrl: true,
    build: (c, q) => ({ url: `${trimUrl(c.baseUrl)}/search?q=${enc(q)}&format=json`, method: "GET" }),
    parse: (d) => (d?.results || []).map((r) => item(r.title, r.url, r.content)) },
};

export function webReady(conf) {
  const p = WEB_PROVIDERS[conf?.provider];
  if (!p) return "검색 서비스를 골라 주세요.";
  if (p.needsKey && !String(conf.key || "").trim()) return `${p.label} API 키를 넣어 주세요.`;
  if (p.needsUrl && !/^https?:\/\//i.test(String(conf.baseUrl || ""))) return `${p.label} 주소(https://…)를 넣어 주세요.`;
  return "";
}
export function buildSearch(conf, query) {
  const p = WEB_PROVIDERS[conf?.provider], err = webReady(conf);
  if (err) throw new Error(err);
  const q = String(query || "").trim().slice(0, WEB_LIMITS.query);
  if (!q) throw new Error("검색어가 비었어요.");
  const n = Math.max(1, Math.min(WEB_LIMITS.results, Number(conf.maxResults) || WEB_LIMITS.results));
  return { req: p.build(conf, q, n), text: !!p.text, limit: n };
}
export function parseSearch(conf, data, limit = WEB_LIMITS.results) {
  const p = WEB_PROVIDERS[conf?.provider]; if (!p) return [];
  return p.parse(data, conf).filter((r) => r.url && r.title).slice(0, limit);
}
export function formatResults(list) {
  return list.length ? list.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`).join("\n") : "(no results)";
}

// ── 주소 안전 검사 (SSRF): http/https만, 로그인 정보·내부망·로컬 주소 금지. DNS 재바인딩은 브라우저에서 막을 수 없어 호스트 이름/IP 글자만 본다.
export function checkUrl(raw) {
  let u; try { u = new URL(String(raw || "").trim()); } catch { return { ok: false, reason: "주소 형식이 아니에요." }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, reason: "http/https 주소만 가져와요." };
  if (u.username || u.password) return { ok: false, reason: "로그인 정보가 들어 있는 주소는 막아요." };
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan") || host.endsWith(".home.arpa") || !host.includes(".") && !host.includes(":")) return { ok: false, reason: "내부 주소는 막아요." };
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (v4) {
    const [a, b] = [+v4[1], +v4[2]];
    if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224) return { ok: false, reason: "내부 IP 주소는 막아요." };
  } else if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) return { ok: false, reason: "숫자로 쓴 IP 주소는 막아요." };
  if (host.includes(":")) {
    const v6 = host;
    if (v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || /^::ffff:/.test(v6)) return { ok: false, reason: "내부 IP 주소는 막아요." };
  }
  return { ok: true, url: u.href };
}

// 가져온 페이지 글 정리: 스크립트·스타일 제거 후 태그를 떼고 길이를 줄인다.
export function htmlToText(html, max = WEB_LIMITS.fetchChars) {
  const s = String(html ?? "").replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<\/(p|div|li|h[1-6]|tr|section|article)>|<br\s*\/?>/gi, "\n");
  return s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, "&")
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n").slice(0, max);
}

// ── 글로 된 도구 호출 규약: 모델이 답 전체를 `[[tool:이름 {json}]]` 한 줄로 하면 도구를 실행하고 결과를 붙여 다시 묻는다.
const CALL = /^\s*\[\[tool:(web_search|web_fetch)\s*(\{[\s\S]*?\})?\s*\]\]/;
export function parseToolCall(text) {
  const m = CALL.exec(String(text ?? "")); if (!m) return null;
  let args = {}; try { args = m[2] ? JSON.parse(m[2]) : {}; } catch { return { name: m[1], args: {}, bad: true }; }
  return { name: m[1], args: args && typeof args === "object" ? args : {} };
}
export function toolInstruction(maxSteps) {
  return ["[Tools]", "If you truly need outside information, reply with ONLY one line and nothing else:",
    '[[tool:web_search {"query":"..."}]]  or  [[tool:web_fetch {"url":"https://..."}]]',
    `The result will be returned to you, then give your normal final answer in the required format. You may use tools at most ${maxSteps} time(s). If you do not need them, ignore this section and answer normally.`].join("\n");
}
export const resultBlock = (name, body) => `[Tool Result: ${name}]\n${String(body).slice(0, WEB_LIMITS.resultBlock)}\n[/Tool Result]`;

// call(extra) → 모델 응답 글. extra는 원래 프롬프트 뒤에 붙일 글. exec(name,args) → 결과 글.
export async function runToolLoop(first, call, exec, maxSteps = 2) {
  const steps = Math.max(0, Math.min(WEB_LIMITS.steps, maxSteps)), used = []; let text = first, extra = "";
  for (let i = 0; i < steps; i++) {
    const t = parseToolCall(text); if (!t) return { text, used };
    let body; try { body = t.bad ? "Invalid tool arguments." : await exec(t.name, t.args); } catch (e) { body = `Error: ${e?.message ?? e}`; }
    used.push({ name: t.name, args: t.args });
    extra += `${extra ? "\n\n" : ""}${resultBlock(t.name, body)}`;
    text = await call(`${extra}\n\nNow give your final answer in the required format.`);
  }
  if (parseToolCall(text)) text = await call(`${extra}\n\nTools are no longer available. Give your final answer now in the required format.`);
  return { text, used };
}
