// 위젯 애드온: 코어만이면 설정 카드·도구 줄이 없고, 켜면 카드가 생긴다. 카드 스위치는 그 카드만 다시 그린다. 배포 파일도 켜진다.
import { createRequire } from "node:module";
import fs from "node:fs";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.0.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const boot = async (coreOnly) => {
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 860 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate((c) => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { coreOnly: c }), coreOnly);
  await page.waitForTimeout(400);
  return { page, errs };
};
const go = async (page, tab, sub) => { await page.evaluate(([t, s]) => window.__app.ctx.go(t, s), [tab, sub]); await page.waitForTimeout(500); };
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
{ const { page, errs } = await boot(true);
  await go(page, "settings"); ok("코어만: 설정에 위젯 홈 카드 없음", !(await has(page, "#rb-widgethome")));
  await go(page, "tools"); ok("코어만: 도구에 위젯 홈 줄 없음", !(await has(page, "#rb-tool-widgethome")));
  ok("코어만: ctx.widgetHome 없음", await page.evaluate(() => !window.__app.ctx.widgetHome));
  ok("코어만: 오류 없음", !errs.length, errs.join(";")); await page.close(); }
{ const { page, errs } = await boot(false);
  await go(page, "settings"); ok("애드온: 설정에 위젯 홈 카드", await has(page, "#rb-widgethome"));
  await page.evaluate(() => { document.querySelector(".rb-main").firstElementChild.__mark = 1; });
  await page.locator("#rb-widgethome [role=switch]").first().click(); await page.waitForTimeout(800);
  ok("애드온: 카드 스위치는 창을 다시 불러오지 않음", await page.evaluate(() => document.querySelector(".rb-main").firstElementChild?.__mark === 1 && !!document.querySelector("#rb-widgethome")));
  ok("애드온: 오류 없음", !errs.length, errs.join(";")); await page.close(); }
{ const { page, errs } = await boot(true);
  const code = fs.readFileSync("addons/dist/widgets.js", "utf8");
  const res = await page.evaluate(async (code) => { try { const m = await import(URL.createObjectURL(new Blob([code], { type: "text/javascript" }))); await m.activate(window.__api, { ext: window.__app.ctx.ext, app: window.__app.ctx }); return "ok"; } catch (e) { return String(e?.message ?? e); } }, code);
  ok("배포 파일: 코어 모듈 공유로 켜짐", res === "ok", res);
  await go(page, "tools"); await go(page, "settings"); ok("배포 파일: 설정에 위젯 홈 카드", await has(page, "#rb-widgethome"));
  ok("배포 파일: 오류 없음", !errs.length, errs.join(";")); await page.close(); }
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
