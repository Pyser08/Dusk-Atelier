// 홈·개요(1.8.3 목업 1): 상태 카드 숫자, 작은 바로가기 4칸, 이어서 하기 칩, 개요 목록 행 (실제 클릭)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const errs = [];
for (const [tag, vp] of [["PC", { width: 1280, height: 800 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp, ...tag === "모바일" ? { hasTouch: true, isMobile: true } : {} })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, { memory: true, story: true, mods: true }));
  await page.waitForTimeout(600);
  const vis = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent).length, sel);
  const nav = async (label) => { await page.evaluate((l) => [...document.querySelectorAll(".rb-nav a, .rb-tabbar a")].filter((a) => a.offsetParent).find((a) => a.textContent.trim().startsWith(l)).click(), label); await page.waitForTimeout(600); };
  ok(`[${tag}] 홈 숫자 위젯 4칸(2.2.0)`, (await vis(".rb-hnum")) === 4, String(await vis(".rb-hnum")));
  ok(`[${tag}] 저장된 기억 숫자 = 6`, (await page.locator(".rb-hnum b").first().textContent()) === "6");
  ok(`[${tag}] 바로가기 위젯 4칸`, (await vis(".rb-hgrid2 .rb-htile")) === 4);
  ok(`[${tag}] 이어서 하기 칩(인물 위키 2 · 분석 · 가져오기)`, (await page.locator(".rb-hcont .rb-chip").allTextContents()).join("|") === "호시노 인물 위키|시로코 인물 위키|지난 대화 분석|봇·모듈 가져오기", (await page.locator(".rb-hcont .rb-chip").allTextContents()).join("|"));
  ok(`[${tag}] 빠른 설정 토글 유지 + 처음 둘러보기 유지`, (await page.locator(".rb-story-helper [role=switch]").count()) >= 2 && (await page.locator(".rb-story-helper #rb-dice-row").count()) === 1 && (await page.locator("#rb-home-tour").count()) === 1);
  await page.locator(".rb-hcont .rb-chip", { hasText: "시로코 인물 위키" }).click(); await page.waitForTimeout(700);
  ok(`[${tag}] 인물 위키 칩 → 기억 기록 보기`, await page.evaluate(() => !!document.querySelector(".rb-mem2[data-page=detail]")));
  await nav("홈");
  if (tag === "모바일") {
    await nav("기억");
    ok(`[모바일] 기억 개요(2.2.0): 상태 줄 + 기능 타일 + 최근 기록, 위 칩 줄 숨김`, (await vis(".rb-mhub-stat")) === 1 && (await vis(".rb-mtile")) >= 3 && (await vis(".rb-mhub-rec")) === 1 && (await vis(".rb-morenav")) === 0, `stat ${await vis(".rb-mhub-stat")} tile ${await vis(".rb-mtile")} rec ${await vis(".rb-mhub-rec")} chip ${await vis(".rb-morenav")}`);
    await nav("작업실");
    ok(`[모바일] 작업실 개요(2.2.0): 하는 일별 묶음 + 최근·고정`, (await vis(".rb-wgroups .rb-wgroup")) >= 3 && (await vis(".rb-wgroups .rb-hubrow")) >= 5 && (await vis(".rb-wgroup.k-recent")) === 1 && (await vis(".rb-wgroup.k-pin")) === 1);
    await nav("관리");
    ok(`[모바일] 관리 개요: 개수 표시`, /· \d+개/.test(await page.locator(".rb-hubrow", { hasText: "캐릭터" }).textContent()));
    await page.locator(".rb-hubrow", { hasText: /^모듈/ }).click(); await page.waitForTimeout(500);
    ok(`[모바일] 안쪽 화면에서는 위 칩 줄 보임`, (await vis(".rb-morenav")) === 1);
  }
  await page.close();
}
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
