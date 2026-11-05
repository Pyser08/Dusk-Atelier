// 관리 → ProtLink+ 화면: 켜기/끄기 · 링크 목록 · 열기 · 원본 플러그인이 켜져 있을 때 안내
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const ar = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json", ".md": "text" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch(), errs = [];
for (const [tag, vp] of [["PC", { width: 1280, height: 800 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: ar.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, { protlink: true }));
  await page.waitForTimeout(500);
  const sw = () => page.locator("#rb-protlink-head [role=switch]");
  await page.evaluate(() => __app.ctx.go("protlink")); await page.waitForTimeout(500);
  ok(`[${tag}] 기본 켜짐 + 사용 중 표시`, (await sw().getAttribute("aria-checked")) === "true" && /사용 중/.test(await page.locator(".rb-status").textContent()) && (await page.evaluate(() => __pl.boots)) === 1);
  ok(`[${tag}] 링크 목록: 이름·종류·개수`, /내 봇 모음/.test(await page.locator("#rb-protlink-list").textContent()) && /봇 · 2개 파일/.test(await page.locator("#rb-protlink-list").textContent()), await page.locator("#rb-protlink-list").textContent());
  await page.locator("#rb-protlink-list [data-id=a]").click(); await page.waitForTimeout(300);
  ok(`[${tag}] 링크를 누르면 그 링크가 열리고 Dusk 창은 닫힘`, (await page.evaluate(() => __pl.opened.join())) === "a" && (await page.locator(".rb-root:visible").count()) === 0);
  await page.evaluate(() => __app.open({ tab: "protlink" })); await page.waitForTimeout(600);
  await page.locator(".rb-status button", { hasText: "ProtLink+ 열기" }).click(); await page.waitForTimeout(300);
  ok(`[${tag}] ‘ProtLink+ 열기’는 링크 없이 연다`, (await page.evaluate(() => __pl.opened.join("|"))) === "a|");
  await page.evaluate(() => __app.open({ tab: "protlink" })); await page.waitForTimeout(600);
  await sw().click(); await page.waitForTimeout(500);
  ok(`[${tag}] 끄면 정리되고 꺼짐 안내`, (await page.evaluate(() => __pl.stopped)) === 1 && /꺼져 있어요/.test(await page.locator(".rb-status").textContent()) && (await page.locator("#rb-protlink-list").count()) === 0);
  await page.screenshot({ path: `/tmp/protlink-off-${tag}.png` });
  await sw().click(); await page.waitForTimeout(500);
  ok(`[${tag}] 다시 켜면 시작`, (await page.evaluate(() => __pl.boots)) === 2 && (await sw().getAttribute("aria-checked")) === "true");
  await page.screenshot({ path: `/tmp/protlink-on-${tag}.png` });
  // 원본 플러그인이 켜져 있으면 시작하지 않고 안내
  await page.evaluate(async () => { window.__plOriginal = true; await __app.ctx.protlink.set(false); await __app.ctx.protlink.set(true); __app.ctx.go("protlink"); }); await page.waitForTimeout(600);
  ok(`[${tag}] 원본이 켜져 있으면 안내만 나오고 시작 안 함`, /원래 ‘ProtLink\+’/.test(await page.locator(".rb-status").textContent()) && (await page.evaluate(() => __pl.boots)) === 2, await page.locator(".rb-status").textContent());
  ok(`[${tag}] 페이지 오류 없음`, errs.length === 0, errs.join(" | "));
}
await browser.close();
const bad = out.filter((x) => !x).length; console.log(bad ? `\n실패 ${bad}개` : `\n모두 통과 (${out.length})`); process.exit(bad ? 1 : 0);
