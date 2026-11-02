// 인물 위키(기록 보기)에서 {{user}}가 페르소나 이름으로 보이는지(저장 데이터는 그대로)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); page.setDefaultTimeout(5000);
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { memory: true, story: true }));
await page.waitForTimeout(500);
await page.evaluate(async () => {
  const g = __api.getDatabase; __api.getDatabase = async (k) => ({ ...(await g(k)), username: "선생님" });
  __app.ctx.api.invalidateDbCache?.();
  await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => { f.people.sirokko.records.push({ id: "ux", act: "{{user}}와 함께 순찰을 돌았다", g: "A", at: 9, orphan: false }); });
});
await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(500);
await page.locator("#rb-mem-go-wiki").click(); await page.waitForTimeout(800);
const txt = await page.locator(".rb-mem2").textContent();
ok("위키에 {{user}} 글자가 남지 않음", !txt.includes("{{user}}"), txt.match(/.{0,20}\{\{user\}\}.{0,20}/)?.[0]);
ok("'선생님과 함께 순찰' (조사 맞춤)", txt.includes("선생님과 함께 순찰을 돌았다"));
const saved = await page.evaluate(async () => (await __app.ctx.memory.store.getFolder("c1", "t1")).people.sirokko.records.find((x) => x.id === "ux").act);
ok("저장된 기록은 그대로 {{user}}", saved === "{{user}}와 함께 순찰을 돌았다", saved);
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
