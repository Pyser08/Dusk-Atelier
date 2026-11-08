// 채팅 테마 애드온: 코어만이면 입구(도구 줄·꾸미기 버튼·스튜디오 칸)와 화면이 없고, 켜면 생기고 열린다. 끄면 다시 사라진다.
import { createRequire } from "node:module";
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
  await page.evaluate((c) => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { coreOnly: c }), coreOnly);
  await page.waitForTimeout(300);
  return { page, errs };
};
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const go = async (page, tab, sub) => { await page.evaluate(([t, s]) => window.__app.ctx.go(t, s), [tab, sub]); await page.waitForTimeout(500); };
// 코어만
{ const { page, errs } = await boot(true);
  await go(page, "tools"); ok("코어만: 도구에 채팅 테마 빌더 줄 없음", !(await has(page, "#rb-tool-chattheme")));
  await go(page, "tools", "chattheme"); ok("코어만: 채팅 테마 화면 대신 도구 목록", await has(page, "#rb-tool-presets") && !(await page.evaluate(() => /테마 스튜디오 열기|스튜디오 열기/.test(document.querySelector(".rb-main").innerText))));
  await go(page, "look"); ok("코어만: 꾸미기에 테마 버튼·스튜디오 칸 없음", !(await has(page, "#rb-look-themebuilder")) && !(await has(page, "#rb-look-themestudio")));
  ok("코어만: 보이는 글에 '채팅 테마' 없음", !(await page.evaluate(() => /채팅 테마/.test(document.body.innerText))));
  ok("코어만: 오류 없음", !errs.length, errs.join(";")); await page.close(); }
// 애드온 켬
{ const { page, errs } = await boot(false);
  await go(page, "tools"); ok("애드온: 도구에 채팅 테마 빌더 줄", await has(page, "#rb-tool-chattheme"));
  await page.click("#rb-tool-chattheme"); await page.waitForTimeout(600);
  ok("애드온: 줄을 누르면 채팅 테마 빌더 열림", await page.evaluate(() => window.__app.ctx.state.sub === "chattheme" && /스튜디오/.test(document.querySelector(".rb-main").innerText)));
  await go(page, "tools", "themestudio"); ok("애드온: 테마 스튜디오 열림", await page.evaluate(() => /채팅 테마로/.test(document.querySelector(".rb-main").innerHTML)));
  await go(page, "look"); ok("애드온: 꾸미기에 테마 버튼·스튜디오 칸", (await has(page, "#rb-look-themebuilder")) && (await has(page, "#rb-look-themestudio")));
  ok("애드온: 오류 없음", !errs.length, errs.join(";")); await page.close(); }
// 배포 파일(addons/dist/chattheme.js)을 코어만 켠 앱에 blob import로 붙이기 — 코어 모듈 공유가 맞는지
{ const { page, errs } = await boot(true);
  const code = (await import("node:fs")).readFileSync("addons/dist/chattheme.js", "utf8");
  const res = await page.evaluate(async (code) => { try { const u = URL.createObjectURL(new Blob([code], { type: "text/javascript" })); const m = await import(u); await m.activate({}, { ext: window.__app.ctx.ext }); return "ok"; } catch (e) { return String(e?.message ?? e); } }, code);
  ok("배포 파일: 코어 모듈을 공유해 켜짐", res === "ok", res);
  await go(page, "tools"); ok("배포 파일: 도구 줄 생김", await has(page, "#rb-tool-chattheme"));
  await go(page, "tools", "chattheme"); ok("배포 파일: 채팅 테마 빌더 열림", await page.evaluate(() => /스튜디오/.test(document.querySelector(".rb-main").innerText)));
  ok("배포 파일: 오류 없음", !errs.length, errs.join(";")); await page.close(); }
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
