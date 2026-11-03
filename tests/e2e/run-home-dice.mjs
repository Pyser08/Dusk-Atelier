// 홈 '유저 편향 없애기' 박스 → 상세(강도 약하게·보통·강하게, 고급 직접 입력, ? 설명). 실제 클릭으로 저장 값 확인.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
async function run(advanced) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }));
  await page.waitForTimeout(300);
  if (advanced) { await page.evaluate(() => __app.ctx.setUiMode("advanced")); await page.waitForTimeout(500); await page.evaluate(() => __app.ctx.go("home")); await page.waitForTimeout(400); }
  const tag = advanced ? "[고급] " : "[간단] ";
  const store = (k) => page.evaluate((k) => __api.store[k], k);
  const row = page.locator("#rb-dice-row");
  ok(tag + "홈에 박스 한 줄(스위치 아님), 오른쪽에 '꺼짐'", (await row.count()) === 1 && (await row.evaluate((e) => e.tagName)) === "BUTTON" && /꺼짐/.test(await row.textContent()), await row.textContent());
  await row.click(); await page.waitForTimeout(150);
  ok(tag + "누르면 상세 창", (await page.locator(".rb-dice").count()) === 1);
  ok(tag + "? 누르면 작동 방식 설명", await (async () => { const info = page.locator(".rb-dice-info"); const before = await info.isHidden(); await page.locator(".rb-dice .hd button").click(); return before && await info.isVisible(); })());
  await page.locator(".rb-dice [role=switch]").click(); await page.waitForTimeout(200);
  ok(tag + "상세에서 켜면 저장 + 공정한 전개도 켜짐", (await store("dusk.ui.fairDice")) === "on" && (await store("dusk.ui.fairPlay")) === "on");
  ok(tag + "기본 강도 '보통' 선택", (await page.locator(".rb-dice .lv:has(.l:text-is('강도')) .rb-seg button[aria-checked=true]").textContent()) === "보통");
  ok(tag + "재해석·존중이 강도 위에 있다", (await page.locator(".rb-dice .lv").first().textContent()).includes("내가 결과까지 적었을 때") && (await page.locator('.rb-dice .lv:has(.l:text-is("내가 결과까지 적었을 때")) .rb-seg button[aria-checked=true]').textContent()) === "재해석");
  await page.locator(".rb-dice .lv:has(.l:text-is('강도')) .rb-seg button", { hasText: "강하게" }).click(); await page.waitForTimeout(150);
  ok(tag + "강하게 저장", (await store("dusk.ui.fairDiceLevel")) === "strong", await store("dusk.ui.fairDiceLevel"));
  ok(tag + "수치 줄이 바뀜", /쉬움 30 · 보통 60 · 어려움 85 · 극악 98/.test(await page.locator(".rb-dice .cuts").textContent()));
  const hasAdv = (await page.locator(".rb-dice-grid").count()) === 1;
  ok(tag + (advanced ? "직접 입력 칸 있음" : "직접 입력 칸은 간단 모드에서 숨김"), hasAdv === advanced);
  if (advanced) {
    const num = page.locator(".rb-dice-grid input");
    ok(tag + "입력 칸에 현재 수치", (await num.nth(0).inputValue()) === "30" && (await num.nth(3).inputValue()) === "98" && (await num.nth(4).inputValue()) === "3");
    await num.nth(0).fill("50"); await num.nth(1).fill("40");
    await page.locator(".rb-dice section.lv button", { hasText: "직접 입력 적용" }).click(); await page.waitForTimeout(150);
    ok(tag + "순서가 틀리면 경고, 저장 안 함", (await page.locator(".rb-dice-msg .rb-note.warn").count()) === 1 && (await store("dusk.ui.fairDiceLevel")) === "strong");
    for (const [i, v] of [10, 40, 65, 90, 4].entries()) await num.nth(i).fill(String(v));
    await page.locator(".rb-dice section.lv button", { hasText: "직접 입력 적용" }).click(); await page.waitForTimeout(200);
    ok(tag + "직접 입력 저장(custom·수치·개수)", (await store("dusk.ui.fairDiceLevel")) === "custom" && (await store("dusk.ui.fairDiceCount")) === "4" && JSON.parse(await store("dusk.ui.fairDiceCuts")).extreme === 90);
    ok(tag + "강도 버튼 선택 해제", (await page.locator(".rb-dice .lv:has(.l:text-is('강도')) .rb-seg button[aria-checked=true]").count()) === 0);
  }
  await page.locator("#rb-dice-logbtn").click(); await page.waitForTimeout(250);
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  ok(tag + "기록 창에서 Esc는 기록 창만 닫음(상세 창은 남음)", (await page.locator(".rb-dlog").count()) === 0 && (await page.locator(".rb-dice").count()) === 1);
  await page.locator(".rb-dice:not(.rb-dlog) .btns button", { hasText: "닫기" }).click(); await page.waitForTimeout(150);
  ok(tag + "닫으면 박스에 현재 강도", new RegExp(advanced ? "직접 입력" : "강하게").test(await row.textContent()), await row.textContent());
  await page.locator("#rb-dice-row").click(); await page.waitForTimeout(100);
  await page.locator(".rb-dice [role=switch]").click(); await page.waitForTimeout(150); await page.locator(".rb-dice:not(.rb-dlog) .btns button", { hasText: "닫기" }).click(); await page.waitForTimeout(100);
  ok(tag + "끄면 박스에 '꺼짐'", /꺼짐/.test(await row.textContent()) && (await store("dusk.ui.fairDice")) === "off");
  ok(tag + "오류 없음", !errs.length, errs.join(";"));
  await page.context().close();
}
await run(false); await run(true);
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
