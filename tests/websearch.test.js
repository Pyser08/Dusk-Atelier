import test from "node:test";
import assert from "node:assert/strict";
import { WEB_PROVIDERS, webReady, buildSearch, parseSearch, formatResults, checkUrl, htmlToText, parseToolCall, toolInstruction, runToolLoop } from "../src/engine/websearch.js";

test("providers: build + parse for each service", () => {
  assert.match(buildSearch({ provider: "wikipedia", lang: "en" }, "a b").req.url, /^https:\/\/en\.wikipedia\.org.*srsearch=a%20b/);
  assert.equal(buildSearch({ provider: "wikipedia", lang: "x/../y" }, "q").req.url.startsWith("https://ko.wikipedia.org"), true);
  assert.deepEqual(parseSearch({ provider: "wikipedia" }, { query: { search: [{ title: "서울 시", snippet: "<b>서울</b> &amp; 도시" }] } }), [{ title: "서울 시", url: "https://ko.wikipedia.org/wiki/%EC%84%9C%EC%9A%B8_%EC%8B%9C", snippet: "서울 & 도시" }]);
  assert.equal(parseSearch({ provider: "brave" }, { web: { results: [{ title: "t", url: "https://a.com", description: "d" }] } })[0].snippet, "d");
  assert.equal(parseSearch({ provider: "tavily" }, { results: [{ title: "t", url: "https://a.com", content: "c" }] })[0].snippet, "c");
  assert.equal(parseSearch({ provider: "serper" }, { organic: [{ title: "t", link: "https://a.com", snippet: "s" }] })[0].url, "https://a.com");
  assert.equal(parseSearch({ provider: "exa" }, { results: [{ title: "t", url: "https://a.com", text: "x" }] })[0].snippet, "x");
  assert.equal(parseSearch({ provider: "searxng" }, { results: [{ title: "t", url: "https://a.com", content: "z" }, { title: "", url: "u" }] }).length, 1);
  assert.equal(buildSearch({ provider: "brave", key: "K" }, "q").req.headers["X-Subscription-Token"], "K");
  assert.equal(JSON.parse(buildSearch({ provider: "serper", key: "K" }, "q").req.body).q, "q");
  assert.equal(buildSearch({ provider: "searxng", baseUrl: "https://s.example/" }, "q").req.url, "https://s.example/search?q=q&format=json");
  assert.equal(Object.keys(WEB_PROVIDERS).length, 7);
});

test("duckduckgo html parse decodes redirect url", () => {
  const html = '<div><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa%3Fx%3D1&amp;rut=zz">Example <b>A</b></a><a class="result__snippet" href="x">좋은 <b>설명</b></a></div>';
  const r = parseSearch({ provider: "duckduckgo" }, html);
  assert.equal(r[0].url, "https://example.com/a?x=1");
  assert.equal(r[0].title, "Example A");
  assert.equal(r[0].snippet, "좋은 설명");
});

test("readiness and validation messages", () => {
  assert.match(webReady({}), /골라/);
  assert.match(webReady({ provider: "brave" }), /키/);
  assert.match(webReady({ provider: "searxng" }), /주소/);
  assert.equal(webReady({ provider: "wikipedia" }), "");
  assert.throws(() => buildSearch({ provider: "wikipedia" }, "  "), /검색어/);
  assert.equal(formatResults([]), "(no results)");
});

test("SSRF guard blocks internal targets, allows public", () => {
  for (const bad of ["http://localhost/a", "http://127.0.0.1", "http://10.0.0.5", "http://172.16.3.1", "http://172.31.255.1", "http://192.168.0.1", "http://169.254.169.254/latest", "http://0.0.0.0", "http://[::1]/", "http://[fd00::1]/", "http://[::ffff:127.0.0.1]/", "http://intranet/", "http://a.local", "http://x.internal", "http://user:pw@example.com", "ftp://example.com", "file:///etc/passwd", "javascript:1", "not a url", "http://2130706433/", "http://0x7f000001/", "http://100.64.0.1"]) assert.equal(checkUrl(bad).ok, false, bad);
  assert.equal(checkUrl("https://example.com/a?b=1").ok, true);
  assert.equal(checkUrl("http://172.32.0.1/").ok, true);
  assert.equal(checkUrl("http://8.8.8.8/").ok, true);
});

test("htmlToText strips scripts/tags and caps length", () => {
  const t = htmlToText("<head><title>x</title></head><body><script>evil()</script><style>a{}</style><h1>제목</h1><p>문단 &amp; 하나</p><p>둘</p></body>");
  assert.equal(t, "제목\n문단 & 하나\n둘");
  assert.equal(htmlToText("a".repeat(100), 10).length, 10);
});

test("tool protocol: parse, loop with final answer, step cap, errors", async () => {
  assert.deepEqual(parseToolCall('  [[tool:web_search {"query":"x"}]]'), { name: "web_search", args: { query: "x" } });
  assert.equal(parseToolCall('{"a":1}'), null);
  assert.equal(parseToolCall('답 [[tool:web_search {"query":"x"}]]'), null);   // 답 중간은 호출이 아님
  assert.equal(parseToolCall("[[tool:web_fetch {bad}]]").bad, true);
  assert.match(toolInstruction(2), /at most 2/);
  const calls = [];
  const r = await runToolLoop('[[tool:web_search {"query":"q"}]]', async (extra) => { calls.push(extra); return '{"ok":true}'; }, async (n, a) => `RES:${n}:${a.query}`, 2);
  assert.equal(r.text, '{"ok":true}');
  assert.equal(r.used.length, 1);
  assert.match(calls[0], /\[Tool Result: web_search\]\nRES:web_search:q/);
  // 끝없이 도구만 부르면 단계 상한 뒤 마지막 호출로 마무리
  let n = 0;
  const r2 = await runToolLoop('[[tool:web_search {"query":"q"}]]', async (extra) => (/no longer available/.test(extra) ? "final" : (n++, '[[tool:web_search {"query":"q"}]]')), async () => "x", 2);
  assert.equal(r2.text, "final");
  assert.equal(n, 2);
  // 실행 오류는 모델에게 오류 글로 전달
  const seen = [];
  await runToolLoop('[[tool:web_fetch {"url":"u"}]]', async (e) => { seen.push(e); return "done"; }, async () => { throw new Error("boom"); }, 1);
  assert.match(seen[0], /Error: boom/);
  // 도구를 안 부르면 그대로
  assert.equal((await runToolLoop("plain", async () => "never", async () => "", 2)).text, "plain");
});
