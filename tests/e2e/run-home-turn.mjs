// 홈 빠른 설정: 주사위 결과 표시·모델 호출 표시(둘 다 기본 꺼짐)
// 약속(docs/PROMISES.md T-1·T-2): 켜면 다음 응답 아래에 해당 블록이 붙고, 끄면 붙지 않는다(저장값만 보지 않는다).
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); page.setDefaultTimeout(5000);
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }), "dusk.ui.fairPlay": "on", "dusk.ui.fairDice": "on" }, { host: true }));
await page.waitForTimeout(300);
const sw = (n) => page.locator(`.rb-story-helper [role=switch][aria-label='${n}']`);
const store = (k) => page.evaluate((k) => __api.store[k], k);
// 한 턴을 흘린다: 요청 → 응답 출력 → 잠잠해짐 → 화면 표시. 표시 훅이 돌려준 글(응답 아래 붙는 것)을 돌려준다.
let n = 0;
const turn = async () => page.evaluate(async (n) => {
  const reply = `시로코가 문을 열었다. 복도는 조용했다. (${n}번째 응답 본문)`;
  await __host.request([{ role: "system", content: "sys" }, { role: "user", content: "문을 연다 " + n }]);
  await __host.output(reply); await new Promise((r) => setTimeout(r, 80));
  return __host.display(reply);
}, ++n);
{ const t = await turn(); ok("둘 다 꺼져 있으면 응답 아래에 아무것도 붙지 않는다", !/x-dusk="(dice|turn)"/.test(t), t); }
ok("주사위 결과 표시는 기본 꺼짐", (await sw("주사위 결과 표시").getAttribute("aria-checked")) === "false");
ok("모델 호출 표시도 기본 꺼짐", (await sw("모델 호출 표시").getAttribute("aria-checked")) === "false");
await sw("주사위 결과 표시").click(); await page.waitForTimeout(200);
{ const t = await turn(); ok("주사위 결과 표시를 켜면 다음 응답 아래에 주사위 블록이 붙는다", t.includes('x-dusk="dice"') && !t.includes('x-dusk="turn"'), t.slice(-300)); }
ok("주사위 결과 표시 켜면 저장", (await store("dusk.ui.diceShow")) === "on", await store("dusk.ui.diceShow"));
await sw("모델 호출 표시").click(); await page.waitForTimeout(200);
{ const t = await turn(); ok("모델 호출 표시를 켜면 다음 응답 아래에 호출 블록이 붙는다", t.includes('x-dusk="turn"'), t.slice(-300)); }
ok("모델 호출 표시 켜면 저장", (await store("dusk.ui.callShow")) === "on", await store("dusk.ui.callShow"));
await sw("주사위 결과 표시").click(); await sw("모델 호출 표시").click(); await page.waitForTimeout(200);
{ const t = await turn(); ok("다시 끄면 다음 응답 아래에 아무것도 붙지 않는다", !/x-dusk="(dice|turn)"/.test(t), t.slice(-300)); }
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
