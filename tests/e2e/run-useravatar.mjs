// 인물 위키: {{user}} 동그라미는 '{'가 아니라 페르소나 첫 글자 + 강조 표시
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/useravatar.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"t"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" } });
const b = await chromium.launch(), p = await b.newPage();
await p.setContent("<body></body>"); await p.addScriptTag({ content: r.outputFiles[0].text });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : " → " + x)); };
const get = (n) => p.evaluate((n) => { const e = av(n); return [e.textContent, e.dataset.me ?? "", getComputedStyle(e).backgroundColor]; }, n);
await p.evaluate(() => setUserName("루나"));
const me = await get("{{user}}"), other = await get("한연희");
ok("페르소나 이름이 있으면 그 첫 글자", me[0] === "루" && me[1] === "1", me.join("|"));
ok("다른 인물은 그대로(강조 없음)", other[0] === "한" && other[1] === "", other.join("|"));
await p.evaluate(() => setUserName(""));
const none = await get("{{user}}");
ok("이름을 모르면 '나'", none[0] === "나", none.join("|"));
ok("{{User}}(대소문자)도 같음", (await get("{{User}}"))[1] === "1");
await b.close(); process.exit(out.every(Boolean) ? 0 : 1);
