// 작업실(1.8.3 목업 5): 도구 목록 2묶음·도움 주신 분들(링크 없음), 설정 묶음·현재 값, 설정 ? 안내가 실제 줄을 짚는지
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const errs = [];
for (const [tag, vp, mode] of [["PC 고급", { width: 1280, height: 800 }, "advanced"], ["모바일 간단", { width: 390, height: 844 }, "simple"]]) {
  const page = await (await browser.newContext({ viewport: vp, ...tag.startsWith("모바일") ? { hasTouch: true, isMobile: true } : {} })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate((m) => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:memoryEmbeddingGuide:shown:v1": "1", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true, uiMode: m }) }, { memory: true, story: true, mods: true }), mode);
  await page.waitForTimeout(500);
  const open = async (label) => {
    if (tag.startsWith("PC")) await page.evaluate((l) => [...document.querySelectorAll(".rb-nav a")].find((a) => a.textContent.trim().startsWith(l)).click(), label);
    else { await page.evaluate(() => [...document.querySelectorAll(".rb-tabbar a")].find((a) => a.textContent.trim().startsWith("작업실")).click()); await page.waitForTimeout(300); await page.locator(".rb-hubrow", { hasText: label }).click(); }
    await page.waitForTimeout(800);
  };
  await open("도구");
  ok(`[${tag}] 도구: 자주 쓰는 3 + 확인·복구 5`, (await page.locator(".rb-toolgrp").nth(0).locator(".rb-toolrow").count()) === 3 && (await page.locator(".rb-toolgrp").nth(1).locator(".rb-toolrow").count()) === 5);
  ok(`[${tag}] 도움 주신 분들 8줄, 원문 링크 없음`, (await page.locator(".rb-sthanks-item").count()) === 8 && (await page.locator(".rb-sthanks a").count()) === 0);
  await open("설정");
  const heads = await page.locator("[data-page=settings] .rb-scard > .h").allTextContents();
  ok(`[${tag}] 설정 묶음 이름`, ["화면", "백업", "도움말"].every((x) => heads.includes(x)) && (mode === "advanced" ? ["이야기 도우미", "로어북 · 채팅 메뉴", "정리 · 기록"].every((x) => heads.includes(x)) : !heads.includes("정리 · 기록")), heads.join("|"));
  ok(`[${tag}] 새로 바뀐 점 · 버전 오른쪽`, /^v/.test(await page.locator("#rb-set-whatsnew .val").textContent()));
  ok(`[${tag}] ? 안내가 찾는 줄에 클래스가 있다`, (await page.locator(".rb-set-look").count()) === 1 && (await page.locator(".rb-set-tour").count()) === 1 && (await page.locator(".rb-set-fullbackup").count()) === 1);
  if (mode === "advanced") {
    ok(`[${tag}] 이름 경계 현재 값`, /짧은 이름만/.test(await page.locator("#rb-set-boundary .val").textContent()));
    await page.locator("#rb-set-boundary").click(); await page.waitForTimeout(150);
    await page.locator(".rb-menu button", { hasText: "모든 키" }).click(); await page.waitForTimeout(300);
    ok(`[${tag}] 값을 바꾸면 줄 값도 바뀌고 저장`, (await page.locator("#rb-set-boundary .val").textContent()) === "모든 키" && await page.evaluate(() => JSON.stringify(__api.store).includes('"boundary\\":\\"all') || JSON.stringify(__api.store).includes('boundary":"all')));
  }
  await page.close();
}
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
