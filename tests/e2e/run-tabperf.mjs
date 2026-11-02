// 탭 이동 성능: 탭마다 이동 → 그리기 끝까지 시간, 그 사이 50ms 넘게 막힌 긴 작업(longtask)을 잰다.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { memory: true, story: true }));
await page.waitForTimeout(800);
await page.evaluate(() => { window.__calls = {}; for (const k of Object.keys(__api)) { const f = __api[k]; if (typeof f !== "function" || k === "pluginStorage") continue; __api[k] = function (...a) { window.__calls[k] = (window.__calls[k] ?? 0) + 1; return f.apply(this, a); }; } window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ type: "longtask", buffered: false }); });
const tabs = ["home", "memory-home", "memory", "cards", "cocoa", "manage-home", "characters", "modules", "plugins", "work-home", "look", "tools", "settings", "personabuilder", "home"];
const res = [];
for (let round = 0; round < 2; round++) for (const t of tabs) {
  const v = await page.evaluate(async (t) => {
    window.__lt = []; window.__calls = {}; const t0 = performance.now(); __app.ctx.go(t);
    await new Promise((ok) => { let last = performance.now(); const mo = new MutationObserver(() => { last = performance.now(); }); mo.observe(document.body, { subtree: true, childList: true }); const iv = setInterval(() => { if (performance.now() - last > 250) { clearInterval(iv); mo.disconnect(); ok(); } }, 25); });
    return { t, ms: Math.round(performance.now() - t0 - 250), long: Math.round(Math.max(0, ...window.__lt)), nlong: window.__lt.length, calls: Object.entries(window.__calls).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + "×" + n).join(" ") };
  }, t);
  res.push({ round, ...v });
}
for (const x of res) console.log(`${x.round} ${x.t.padEnd(16)} ${String(x.ms).padStart(5)}ms  최장 막힘 ${x.long}ms (${x.nlong}개)  ${x.calls}`);
console.log("오류", errs.length ? errs.join(";") : "없음");
await browser.close();
