// 장기 기억 → 리수폿 화면(2.0.0): 홈 줄 → 탭 4개(개요·설정·자동 기록·고급) · 고급에서 옮겨 온 것 · 장기 기억으로 돌아가기
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [tag, vp] of [["PC", { width: 1280, height: 900 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true }));
  await page.waitForTimeout(500);
  await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(900);
  ok(`[${tag}] 장기 기억 홈에 리수폿 줄`, (await page.locator("#rb-mem-go-pot").count()) === 1);
  await page.locator("#rb-mem-go-pot").click(); await page.waitForTimeout(900);
  ok(`[${tag}] 리수폿 화면·탭 4개`, (await page.locator("#rb-mem-pot").count()) === 1 && (await page.locator("#rb-mem-pot .rb-seg button").count()) === 4);
  const tab = async (n) => { await page.locator("#rb-mem-pot .rb-seg button", { hasText: n }).click(); await page.waitForTimeout(900); };
  await tab("설정");
  ok(`[${tag}] 설정 탭: 추적 수준·AI 모델`, /무엇을 기억할까요/.test(await page.locator(".rb-pot-pane").textContent()), (await page.locator(".rb-pot-pane").textContent()).slice(0, 120));
  await tab("자동 기록");
  ok(`[${tag}] 자동 기록 탭: 인물 추적`, /새 인물 자동 추적/.test(await page.locator(".rb-pot-pane").textContent()));
  await tab("고급");
  ok(`[${tag}] 고급 탭: 저장·기록·되돌리기`, /저장 위치/.test(await page.locator(".rb-pot-pane").textContent()) && /되돌리기/.test(await page.locator(".rb-pot-pane").textContent()));
  await page.locator("#rb-mem-pot .rb-phead [aria-label='장기 기억으로']").first().click(); await page.waitForTimeout(700);
  ok(`[${tag}] 장기 기억으로 돌아가기`, (await page.locator("#rb-mem-go-pot").count()) === 1);
  // 열린 채팅이 없을 때도 리수폿 화면이 열려야 한다(예전: "a.nodes is not iterable")
  await page.evaluate(() => { window.__api.getCurrentChatIndex = async () => -1; window.__api.getCurrentCharacterIndex = async () => -1; const m = __app.ctx.state.mem; m.page = "pot"; m.potTab = "home"; __app.ctx.go("memory"); });
  await page.waitForTimeout(1200);
  ok(`[${tag}] 열린 채팅 없음: 리수폿 화면이 안내와 함께 열림`, (await page.locator("#rb-mem-pot").count()) === 1 && /열린 채팅이 없어요/.test(await page.locator("#rb-mem-pot").textContent()), await page.locator(".rb-main").textContent());
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
