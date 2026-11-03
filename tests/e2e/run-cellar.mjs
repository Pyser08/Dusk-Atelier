// 설정의 Dusk Cellar 줄: 연결 상태 표시와 다시 확인. 클라우드 샌드박스: /opt/npm-tools
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage(); page.setDefaultTimeout(5000);
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "1.7.0-dev", "rbm:memoryEmbeddingGuide:shown:v1": "1", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, { memory: true, story: true }));
// 설정 → 서버 → Dusk Cellar: 없으면 '없음', 있으면 '연결됨 v…'. nativeFetch는 GET으로 /cellar/health
await page.evaluate(() => __app.ctx.go("settings")); await page.waitForTimeout(800);
const val = () => page.locator("#rb-set-cellar .val").textContent();
ok("Cellar가 없으면 '없음'", (await val()) === "없음", await val());
const nf = await page.evaluate(() => window.__nf ?? []);
ok("nativeFetch GET http://127.0.0.1:6011/cellar/health", nf.some(([u, m]) => u === "http://127.0.0.1:6011/cellar/health" && m === "GET"), JSON.stringify(nf));
await page.evaluate(() => { window.__cellarOn = true; });
await page.locator("#rb-set-cellar").click(); await page.waitForTimeout(300);
await page.locator("#rb-cellar-recheck").click(); await page.waitForTimeout(400);
ok("다시 확인 → 창에 '연결됨 · Dusk Cellar v0.1.0'", (await page.locator("#rb-cellar-st").textContent()).includes("연결됨 · Dusk Cellar v0.1.0"));
ok("줄의 상태도 '연결됨 v0.1.0'", (await val()) === "연결됨 v0.1.0", await val());
ok("간단 모드에서는 주소 칸 숨김", (await page.locator("#rb-cellar-url").count()) === 0);
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
ok("페이지 오류 없음", errs.length === 0, errs.join(" | "));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
