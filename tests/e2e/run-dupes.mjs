// 간단/고급 모드 중복 스위치 검사: 고급 모드에서 같은 화면에 같은 이름의 스위치가 두 번 이상 보이면 실패. node tests/e2e/run-dupes.mjs
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.setContent("<!doctype html><body style='margin:0'></body>");
await page.addScriptTag({ content: r.outputFiles[0].text });
await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "1.7.0-dev", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true }) }, { story: true, mods: true, memory: true, skills: true }));
await page.waitForTimeout(400);
const tabs = process.argv.slice(2).length ? process.argv.slice(2) : ["home", "memory-home", "memory", "relmap", "cocoa", "cards", "characters", "modules", "plugins", "protlink", "provider", "look", "tools", "settings"];
let bad = 0;
for (const mode of ["simple", "advanced"]) {
  await page.evaluate((m) => window.__app.ctx.setUiMode?.(m), mode); await page.waitForTimeout(200);
  for (const t of tabs) {
    await page.evaluate((t) => window.__app.ctx.go(t), t); await page.waitForTimeout(500);
    // 접힌 곳도 펼쳐서 센다
    await page.evaluate(() => document.querySelectorAll(".rb-main details").forEach((d) => { d.open = true; })); await page.waitForTimeout(150);
    const dup = await page.evaluate(() => { const c = {}; for (const s of document.querySelectorAll(".rb-main [role=switch]")) { if (!s.getClientRects().length && !s.closest("details")) continue; const k = (s.getAttribute("aria-label") || "").replace(/\s*[(（].*$/, "").trim(); if (k) c[k] = (c[k] || 0) + 1; } return Object.entries(c).filter(([, n]) => n > 1); });
    const all = await page.evaluate(() => [...document.querySelectorAll(".rb-main [role=switch], .rb-main input[type=checkbox]")].map((s) => (s.getAttribute("aria-label") || s.closest("label,.rb-toggle")?.textContent || "?").trim().slice(0, 30))); if (process.env.LIST) console.log(`  [${mode}] ${t} (${all.length}): ${all.join(" / ")}`);
    if (dup.length) { bad++; console.log(`✘ [${mode}] ${t}: ${dup.map(([k, n]) => `${k}×${n}`).join(", ")}`); } else console.log(`✔ [${mode}] ${t}`);
  }
}
const errs = await page.evaluate(() => window.__errors ?? []);
if (errs.length) console.log("오류:", errs.slice(0, 5).join(" | "));
await browser.close(); process.exit(bad ? 1 : 0);
