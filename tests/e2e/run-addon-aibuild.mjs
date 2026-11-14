// AI로 봇·페르소나 만들기 애드온: 코어만이면 탭·버튼·편집기 AI 입구가 없고, 켜면 생긴다. 배포 파일도 코어 모듈 공유로 켜진다.
import { createRequire } from "node:module";
import fs from "node:fs";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.0.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const boot = async (coreOnly) => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate((c) => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { coreOnly: c, story: true }), coreOnly);
  await page.waitForTimeout(300);
  return { page, errs };
};
const go = async (page, tab, sub) => { await page.evaluate(([t, s]) => window.__app.ctx.go(t, s), [tab, sub]); await page.waitForTimeout(600); };
const navHas = (page, id) => page.evaluate((id) => [...document.querySelectorAll(`.rb-nav [data-tab="${id}"], .rb-nav a, .rb-nav button`)].some((a) => !a.hidden && (a.dataset?.tab === id || a.getAttribute("href") === "#" + id) && a.getClientRects().length), id);
const text = (page) => page.evaluate(() => document.body.innerText);
{ const { page, errs } = await boot(true);
  await go(page, "work-home"); const t = await text(page);
  ok("코어만: 작업실에 AI로 봇·페르소나 만들기 없음", !/AI로 봇 만들기|AI로 페르소나 만들기/.test(t), t.slice(0, 300));
  await go(page, "characters"); ok("코어만: 캐릭터에 AI로 봇 만들기 버튼 없음", !/AI로 봇 만들기/.test(await text(page)));
  await go(page, "personabuilder"); ok("코어만: 페르소나 빌더 화면 없음", !(await page.evaluate(() => /페르소나/.test(document.querySelector(".rb-main").innerText) && !!document.querySelector(".rb-main [data-page=personabuilder], .rb-main .rb-pb"))));
  ok("코어만: 오류 없음", !errs.length, errs.join(";")); await page.close(); }
{ const { page, errs } = await boot(false);
  await go(page, "work-home"); const t = await text(page);
  ok("애드온: 작업실에 AI로 봇·페르소나 만들기", /AI로 봇 만들기/.test(t) && /AI로 페르소나 만들기/.test(t), t.slice(0, 300));
  await go(page, "characters"); ok("애드온: 캐릭터에 AI로 봇 만들기 버튼", /AI로 봇 만들기/.test(await text(page)));
  await go(page, "personabuilder"); ok("애드온: 페르소나 빌더 열림", /페르소나/.test(await page.evaluate(() => document.querySelector(".rb-main").innerText)));
  await go(page, "aibot"); await page.waitForTimeout(400);
  ok("애드온: AI로 봇 만들기 → 세 단계 화면", await page.evaluate(() => document.querySelectorAll(".rb-aib-step").length === 3 && !!document.querySelector("#rb-aib-go")));
  await page.fill(".rb-aib-card input[aria-label='봇 이름']", "검은 숲"); await page.click("#rb-aib-go"); await page.waitForTimeout(1500);
  ok("애드온: AI로 봇 만들기 → 편집기 'AI로 제작' 탭", await page.evaluate(() => /AI로 제작/.test(document.body.innerText)));
  ok("애드온: 오류 없음", !errs.length, errs.join(";")); await page.close(); }
{ const { page, errs } = await boot(true);
  const code = fs.readFileSync("addons/dist/aibuild.js", "utf8");
  const res = await page.evaluate(async (code) => { try { const m = await import(URL.createObjectURL(new Blob([code], { type: "text/javascript" }))); await m.activate({}, { ext: window.__app.ctx.ext }); return "ok"; } catch (e) { return String(e?.message ?? e); } }, code);
  ok("배포 파일: 코어 모듈 공유로 켜짐", res === "ok", res);
  await page.waitForTimeout(300); await go(page, "work-home");
  ok("배포 파일: 작업실에 AI 탭 생김(메뉴만 고침)", /AI로 페르소나 만들기/.test(await text(page)));
  await go(page, "personabuilder"); ok("배포 파일: 페르소나 빌더 열림", /페르소나/.test(await page.evaluate(() => document.querySelector(".rb-main").innerText)));
  ok("배포 파일: 오류 없음", !errs.length, errs.join(";")); await page.close(); }
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
