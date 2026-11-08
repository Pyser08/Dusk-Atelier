// 장기 기억 홈 '기억 옵션': '요약된 옛 대화 빼고 보내기'와 '남길 최근 턴'이 '기억 넣기 토큰' 아래에 있고, 켜면 설정에 저장된다. PC·모바일.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [tag, vp] of [["PC", { width: 1280, height: 800 }], ["모바일", { width: 390, height: 800 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { memory: true, host: true }));
  await page.waitForTimeout(400);
  await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(700);
  const order = await page.evaluate(() => { const t = document.querySelector("#rb-mem-tokens"), row = [...document.querySelectorAll(".rb-mem-options .rb-srow")].find((e) => e.textContent.includes("요약된 옛 대화 빼고 보내기")), k = document.querySelector("#rb-mem-trimkeep"); return !!t && !!row && !!k && !!(t.compareDocumentPosition(row) & 4) && !!(row.compareDocumentPosition(k) & 4); });
  ok(`[${tag}] 기억 넣기 토큰 아래에 '빼고 보내기'·'남길 최근 턴'`, order);
  const row = page.locator(".rb-mem-options .rb-srow", { hasText: "요약된 옛 대화 빼고 보내기" });
  ok(`[${tag}] 기본 꺼짐`, (await row.locator("[role=switch]").getAttribute("aria-checked")) === "false");
  await row.locator("[role=switch]").click(); await page.waitForTimeout(500);
  ok(`[${tag}] 켜면 저장`, await page.evaluate(async () => (await __app.ctx.memory.store.getIndex()).settings.inject.trimOld === true));
  await page.locator("#rb-mem-trimkeep input").fill("12"); await page.locator("#rb-mem-trimkeep input").dispatchEvent("change"); await page.waitForTimeout(500);
  ok(`[${tag}] 남길 턴 저장`, await page.evaluate(async () => (await __app.ctx.memory.store.getIndex()).settings.inject.trimKeep === 12));
  ok(`[${tag}] 가로 넘침 없음`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
