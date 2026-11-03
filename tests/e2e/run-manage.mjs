// 관리(1.8.3 목업 4): 캐릭터·모듈은 리스트형 유지(정렬·폴더 밖에), 줄은 편집+···, 모듈 필터 3칩+종류, 연결 칩, 플러그인 도구 한 줄
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
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:memoryEmbeddingGuide:shown:v1": "1", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, { memory: true, story: true, mods: true }));
  await page.waitForTimeout(500);
  const open = async (label) => {
    if (tag === "PC") await page.evaluate((l) => [...document.querySelectorAll(".rb-nav a")].find((a) => a.textContent.trim().startsWith(l)).click(), label);
    else { await page.evaluate(() => [...document.querySelectorAll(".rb-tabbar a")].find((a) => a.textContent.trim().startsWith("관리")).click()); await page.waitForTimeout(300); await page.locator(".rb-hubrow", { hasText: label }).click(); }
    await page.waitForTimeout(900);
  };
  const vis = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent).length, sel);
  await open("캐릭터");
  ok(`[${tag}] 캐릭터: 정렬·폴더 밖에 · AI로 봇 만들기·새 봇 · ··· 하나`, (await vis(".rb-chips .rb-btn")) >= 3 && (await page.locator(".rb-btn", { hasText: "폴더" }).first().isVisible()) && (await page.locator(".rb-btn", { hasText: "AI로 봇 만들기" }).first().isVisible()) && (await vis("#rb-char-more")) === 1 && (await vis("#rb-pick-toggle")) === 0);
  ok(`[${tag}] 캐릭터 줄: 편집 + ··· (AI로 만들기 버튼 없음)`, (await vis(".rb-row .rb-rowedit")) === 2 && (await page.locator(".rb-row .rb-rowedit", { hasText: "AI로" }).count()) === 0);
  ok(`[${tag}] 지금 채팅 라벨`, (await page.locator(".rb-row .rb-curchat").count()) === 1 && /시로코/.test(await page.locator(".rb-row:has(.rb-curchat) .name").textContent()));
  await page.locator("#rb-char-more").click(); await page.waitForTimeout(150);
  ok(`[${tag}] ··· 메뉴: 여러 개 선택하기 · 가져오기`, (await page.locator(".rb-menu button").allTextContents()).join("|") === "여러 개 선택하기|가져오기");
  await page.locator(".rb-menu button", { hasText: "여러 개 선택하기" }).click(); await page.waitForTimeout(150);
  ok(`[${tag}] 선택 중엔 '선택 끝' 버튼이 보인다`, (await vis("#rb-pick-toggle")) === 1);
  await page.locator("#rb-pick-toggle").click(); await page.waitForTimeout(150);
  ok(`[${tag}] 선택 끝 → 버튼 숨김`, (await vis("#rb-pick-toggle")) === 0);
  await open("모듈");
  ok(`[${tag}] 모듈 필터: 전체·켜짐·꺼짐 + 종류`, (await page.locator(".rb-modbar .rb-chips .rb-chip").count()) === 3 && (await vis("#rb-mod-kind")) === 1);
  ok(`[${tag}] 연결 N은 이름 아래 작은 칩`, (await vis(".rb-row .txt .rb-linkchip")) === 3);
  await page.locator("#rb-mod-kind").click(); await page.waitForTimeout(150);
  await page.locator(".rb-menu button", { hasText: "전역" }).click(); await page.waitForTimeout(400);
  ok(`[${tag}] 종류: 전역 고르면 전역 모듈만`, (await vis(".rb-row")) === 2 && /종류: 전역/.test(await page.locator("#rb-mod-kind").textContent()));
  await open("플러그인");
  ok(`[${tag}] 플러그인: 도구 한 줄(개수·업데이트 확인····), 설명 중복 없음`, (await vis(".rb-plug-tools .rb-btn")) === 1 && (await vis("#rb-plug-more")) === 1 && (await page.locator(".rb-plugins .rb-p").count()) === 0);
  ok(`[${tag}] 미분류 머리는 접을 수 있다`, (await page.locator(".rb-plug-group > summary").count()) >= 1);
  await page.close();
}
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
