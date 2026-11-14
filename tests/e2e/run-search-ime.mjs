// 2.2.0 검색창: 한글 조합 중에 화면이 다시 그려져 글자가 겹치던 문제 · 다른 탭에서 기능 찾기를 지우면 원래 탭으로 (실제 IME 조합)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
import fs from "node:fs";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const opts = eval("(" + fs.readFileSync("tests/e2e/run-provider.mjs", "utf8").match(/build\((\{ entryPoints[^\n]*?\})\);/)[1] + ")");
const r = await build(opts);
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [w, hh, tag] of [[1280, 900, "PC"], [390, 844, "모바일"]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: hh } })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, {}));
  await page.waitForTimeout(500);
  const cdp = await page.context().newCDPSession(page);
  // 한 음절씩 조합(자모를 하나씩 넣으며 조합 중 글자를 바꾼다) → 확정. 사이에 화면이 다시 그려질 시간을 둔다
  const typeKo = async (sylls) => { for (const steps of sylls) { for (const s of steps) { await cdp.send("Input.imeSetComposition", { text: s, selectionStart: s.length, selectionEnd: s.length }); await page.waitForTimeout(160); } await cdp.send("Input.insertText", { text: steps.at(-1) }); await page.waitForTimeout(160); } };
  const inp = () => page.locator(".rb-search input");
  await page.evaluate(() => __app.ctx.go("tools")); await page.waitForTimeout(400);
  await inp().click();
  await typeKo([["ㅇ", "아", "안"], ["ㄴ", "녀", "녕"]]);
  await page.waitForTimeout(400);
  const v = await inp().inputValue();
  ok(`[${tag}] 다른 탭 기능 찾기: 한글 ‘안녕’이 겹치지 않게`, v === "안녕", v);
  ok(`[${tag}] 기능 찾기 결과로 홈에 옴`, await page.evaluate(() => __app.ctx.state.tab) === "home");
  await inp().fill(""); await page.waitForTimeout(400);
  ok(`[${tag}] 지우면 원래 탭(도구)으로 돌아감`, await page.evaluate(() => __app.ctx.state.tab) === "tools", await page.evaluate(() => __app.ctx.state.tab));
  // 목록 검색이 있는 탭: 조합 중 다시 그리기로 글자가 겹치지 않게
  await page.evaluate(() => __app.ctx.go("characters")); await page.waitForTimeout(500);
  await inp().click(); await inp().fill("");
  await typeKo([["ㅅ", "시"], ["ㄹ", "로"]]);
  await page.waitForTimeout(400);
  const v2 = await inp().inputValue();
  ok(`[${tag}] 목록 검색: 한글 ‘시로’가 겹치지 않게`, v2 === "시로", v2);
  ok(`[${tag}] 목록 검색은 탭 그대로`, await page.evaluate(() => __app.ctx.state.tab) === "characters");
  // 홈에서 직접 찾다 지우면 홈 그대로
  await page.evaluate(() => __app.ctx.go("home")); await page.waitForTimeout(300);
  await inp().click(); await inp().fill(""); await typeKo([["ㅌ", "테"], ["ㅁ", "마"]]); await page.waitForTimeout(400);
  const v3 = await inp().inputValue();
  ok(`[${tag}] 홈 기능 찾기: 한글 ‘테마’가 겹치지 않게`, v3 === "테마", v3);
  await inp().fill("테마"); await page.waitForTimeout(300); await inp().fill(""); await page.waitForTimeout(300);
  ok(`[${tag}] 홈에서 찾다 지우면 홈 그대로`, await page.evaluate(() => __app.ctx.state.tab) === "home");
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close();
console.log(out.every(Boolean) ? "모두 통과" : `실패 ${out.filter((x) => !x).length}`);
