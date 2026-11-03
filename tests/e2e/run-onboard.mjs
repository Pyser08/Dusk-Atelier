// 시작 안내(1.8.3 목업 6): 처음 한 번 자동 · 나중에 하기 · 단계별 즉시 적용 · 기존 설정 유지 · 다시 보기 · 다른 자동 안내 안 뜸
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const errs = [];
const boot = async (vp, ui, mobile = false) => {
  const page = await (await browser.newContext({ viewport: vp, ...mobile ? { hasTouch: true, isMobile: true } : {} })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate((u) => window.bootApp({ "rbm:ui:v1": JSON.stringify(u) }, { memory: true, story: true, onboard: true }), ui);
  await page.waitForTimeout(700);
  return page;
};
const ui = (page) => page.evaluate(() => JSON.parse(__api.store["rbm:ui:v1"] ?? "{}"));
// 1) 새로 받은 사람: 시작 안내가 뜨고, 처음 둘러보기는 안 뜬다. '나중에 하기'로 닫으면 다시 안 뜬다.
{ const page = await boot({ width: 390, height: 844 }, {}, true);
  ok("[새 사람] 시작 안내가 창을 채운다", (await page.locator(".rb-onb").count()) === 1 && (await page.locator(".rb-tour-card").count()) === 0);
  await page.locator("#rb-onb-later").click(); await page.waitForTimeout(600);
  const u = await ui(page);
  ok("[새 사람] 나중에 하기 → 닫히고 본 것으로 저장, 처음 둘러보기도 본 것으로", (await page.locator(".rb-onb").count()) === 0 && u.onboardDone === true && u.tourDone === true && (await page.locator(".rb-tour-card").count()) === 0);
  ok("[새 사람] 다른 자동 안내(임베딩·AI 제작) 키도 본 것으로", await page.evaluate(() => __api.store["rbm:memoryEmbeddingGuide:shown:v1"] === "1" && __api.store["da_aibuild:intro"] === "1"));
  await page.close(); }
// 2) 이미 쓰던 사람(테마·고급 모드): 지금 설정이 골라진 채로 시작, 단계 진행·즉시 적용
{ const page = await boot({ width: 1280, height: 800 }, { uiMode: "advanced", tourDone: true, tourVer: 3, theme: { preset: "teal", a: "#0f766e", b: "#0b5f59", mode: "dark" } });
  ok("[기존 사용자] 이 버전 처음 열면 한 번 뜬다", (await page.locator(".rb-onb").count()) === 1);
  await page.locator("#rb-onb-start").click(); await page.waitForTimeout(400);
  ok("[기존 사용자] 1단계: 지금 화면 모드(고급)가 골라져 있다", (await page.locator(".rb-onb [aria-label='화면 모드'] [aria-pressed=true], .rb-onb [aria-label='화면 모드'] .is-active, .rb-onb [aria-label='화면 모드'] [aria-checked=true]").first().textContent()).includes("고급"));
  ok("[PC] 왼쪽 단계 목록 6개", (await page.locator(".rb-onb-steps li").count()) === 6);
  await page.locator("#rb-onb-next").click(); await page.waitForTimeout(500);
  ok("[기존 사용자] 2단계: 지금 강조 색(청록)이 골라져 있다", (await page.locator(".rb-onb .rb-accpick[aria-pressed=true]").first().textContent()) === "청록");
  ok("[PC] 2단계 오른쪽: 미리보기·밝기·그라데이션 방향", (await page.locator(".rb-onb-side .rb-onb-prev").count()) === 1 && (await page.locator(".rb-onb-side [aria-label='그라데이션 방향']").count()) === 1);
  await page.locator(".rb-onb .rb-setpick", { hasText: "벚꽃" }).click(); await page.waitForTimeout(500);
  ok("[2단계] 테마 묶음을 누르면 창이 바로 바뀌고 저장", (await ui(page)).theme?.set === "sakura" && (await page.evaluate(() => getComputedStyle(document.querySelector(".rb-win")).getPropertyValue("--rb-win").trim())) === "#fbf1f3");
  await page.locator("#rb-onb-next").click(); await page.waitForTimeout(700);
  ok("[3단계] 장기 기억 · 임베딩 기본 주소·모델이 채워져 있다", (await page.locator(".rb-onb input[aria-label='임베딩 API 주소']").inputValue()) === "https://api.voyageai.com/v1/embeddings" && (await page.locator(".rb-onb input[aria-label='임베딩 모델']").inputValue()) === "voyage-4-large");
  await page.locator("#rb-onb-next").click(); await page.waitForTimeout(600);
  const sw = (n) => page.locator(`.rb-onb [role=switch][aria-label='${n}']`);
  await page.locator(".rb-onb #rb-dice-row").click(); await page.waitForTimeout(200);
  await page.locator(".rb-dice [role=switch]").click(); await page.waitForTimeout(400);
  await page.locator(".rb-dice .rb-seg button", { hasText: "약하게" }).click(); await page.waitForTimeout(150);
  ok("[4단계] 유저 편향 상세에서 강도(약하게) 저장", (await page.evaluate(() => __api.store["dusk.ui.fairDiceLevel"])) === "weak");
  await page.locator(".rb-dice:not(.rb-dlog) .btns button", { hasText: "닫기" }).click(); await page.waitForTimeout(150);
  ok("[4단계] 박스에 현재 강도 표시", /약하게/.test(await page.locator(".rb-onb #rb-dice-row").textContent()));
  ok("[4단계] 유저 편향 없애기를 켜면 공정한 전개도 켜짐·저장", (await sw("공정한 전개").getAttribute("aria-checked")) === "true" && await page.evaluate(() => __api.store["dusk.ui.fairPlay"] === "on" && __api.store["dusk.ui.fairDice"] === "on"));
  await page.locator("#rb-onb-next").click(); await page.waitForTimeout(600);
  ok("[5단계] 찾은 게 없으면 끝 단계로 넘어간다", (await page.locator(".rb-onb-head h2").textContent()) === "준비됐어요!");
  ok("[끝] 요약에 고른 내용", /벚꽃/.test(await page.locator(".rb-onb-sum", { hasText: "분위기" }).textContent()) && /공정한 전개/.test(await page.locator(".rb-onb-sum", { hasText: "이야기" }).textContent()));
  await page.locator(".rb-onb-sum", { hasText: "화면" }).locator(".rb-btn").click(); await page.waitForTimeout(400);
  ok("[끝] 바꾸기 → 그 단계로", (await page.locator(".rb-onb-head h2").textContent()) === "화면을 골라요");
  await page.locator(".rb-onb-steps button", { hasText: "끝" }).click(); await page.waitForTimeout(600);
  await page.locator("#rb-onb-done").click(); await page.waitForTimeout(500);
  ok("[끝] 시작하기 → 닫히고 다시 안 뜸(저장)", (await page.locator(".rb-onb").count()) === 0 && (await ui(page)).onboardDone === true && (await ui(page)).uiMode === "advanced");
  await page.evaluate(() => [...document.querySelectorAll(".rb-nav a")].find((a) => a.textContent.trim().startsWith("설정")).click()); await page.waitForTimeout(700);
  await page.locator("#rb-set-onboard").click(); await page.waitForTimeout(400);
  ok("[설정] 시작 안내 다시 보기", (await page.locator(".rb-onb").count()) === 1);
  await page.close(); }
// 3) 이미 본 사람: 안 뜬다
{ const page = await boot({ width: 1280, height: 800 }, { onboardDone: true, onboardVer: 1, tourDone: true, tourVer: 3 });
  ok("[본 사람] 다시 안 뜬다", (await page.locator(".rb-onb").count()) === 0);
  await page.close(); }
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
