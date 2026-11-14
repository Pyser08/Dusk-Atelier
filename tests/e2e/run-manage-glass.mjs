// 2.2.0 4번 관리·5번 설정 글래스 배치: 관리 개요(통합 검색·숫자 타일), 캐릭터 카드 갤러리(크기 게이지·목록 전환), 모듈 순서 번호·펼침, 플러그인 카테고리 카드, 설정 왼쪽 목차
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const shots = process.env.SHOTS;
const browser = await chromium.launch();
const errs = [];
for (const [tag, vp] of [["PC", { width: 1280, height: 800 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp, ...tag === "모바일" ? { hasTouch: true, isMobile: true } : {} })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:memoryEmbeddingGuide:shown:v1": "1", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, { memory: true, story: true, mods: true }));
  await page.waitForTimeout(500);
  const shot = async (n) => { if (shots) await page.screenshot({ path: `${shots}/${tag === "PC" ? "pc" : "mo"}-${n}.png` }); };
  const hub = async () => { await page.evaluate(() => window.__rb?.go?.("manage-home") ?? [...document.querySelectorAll(".rb-tabbar a,.rb-nav a,.rb-topsec")].find((a) => /관리/.test(a.textContent))?.click()); await page.waitForTimeout(900); };
  const open = async (label) => { await hub(); await page.locator(".rb-mantile", { hasText: label }).first().click(); await page.waitForTimeout(900); };
  const vis = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent).length, sel);
  await hub();
  ok(`[${tag}] 관리 개요: 검색창 + 타일`, (await vis("#rb-man-search")) === 1 && (await vis(".rb-mantile")) >= 3);
  await page.locator("#rb-man-search").fill("시로"); await page.waitForTimeout(200);
  ok(`[${tag}] 통합 검색 결과`, (await vis(".rb-manhit.k-characters")) >= 1);
  await shot("hub");
  await page.locator(".rb-manhit.k-characters").first().click(); await page.waitForTimeout(900);
  ok(`[${tag}] 결과 누르면 캐릭터 탭에서 검색한 채로`, (await vis(".rb-chargal .rb-row")) === 1);
  await open("캐릭터");
  ok(`[${tag}] 캐릭터: 기본 카드 갤러리 + 크기 게이지`, (await vis(".rb-chargal .rb-row")) === 2 && (await vis("#rb-char-size")) === 1);
  await page.evaluate(() => { const i = document.querySelector("#rb-char-size"); i.value = "240"; i.dispatchEvent(new Event("input")); });
  ok(`[${tag}] 게이지로 카드 크기`, (await page.evaluate(() => document.querySelector(".rb-chargal").style.getPropertyValue("--cg"))) === "240px");
  await shot("chars");
  await page.locator("#rb-char-view").click(); await page.waitForTimeout(400);
  ok(`[${tag}] 목록으로 전환`, (await vis(".rb-chargal")) === 0 && (await vis(".rb-row")) === 2 && (await vis("#rb-char-size")) === 0);
  await page.locator("#rb-char-view").click(); await page.waitForTimeout(400);
  ok(`[${tag}] 다시 카드로`, (await vis(".rb-chargal")) === 1);
  await open("모듈");
  ok(`[${tag}] 모듈: 순서 번호`, (await page.evaluate(() => getComputedStyle(document.querySelector(".rb-ordnum"), "::before").content)) !== "none");
  if (tag === "PC") {
    await page.locator(".rb-row .name").first().click(); await page.waitForTimeout(200);
    ok(`[${tag}] 줄 누르면 동작 펼침`, (await vis(".rb-modexp .rb-btn")) === 6);
    await shot("mods");
  }
  await open("플러그인");
  ok(`[${tag}] 플러그인 카테고리 카드`, (await vis(".rb-plcat > summary .n")) >= 1);
  await shot("plugins");
  await page.evaluate(() => [...document.querySelectorAll(".rb-tabbar a,.rb-nav a")].find((a) => a.textContent.trim().startsWith("설정"))?.click()); await page.waitForTimeout(900);
  if (!(await vis(".rb-settoc"))) { await page.evaluate(() => [...document.querySelectorAll(".rb-tabbar a,.rb-nav a,.rb-topsec")].find((a) => /작업실/.test(a.textContent))?.click()); await page.waitForTimeout(600); await page.locator(".rb-hubrow,.rb-tooltile,button", { hasText: /^설정/ }).first().click().catch(() => {}); await page.waitForTimeout(900); }
  ok(`[${tag}] 설정 목차`, (await vis(".rb-settoc-i")) >= 4);
  await shot("settings");
  await page.close();
}
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
console.log(out.every(Boolean) ? `\n모두 통과 (${out.length})` : `\n실패 ${out.filter((x) => !x).length}/${out.length}`);
process.exit(out.every(Boolean) ? 0 : 1);
