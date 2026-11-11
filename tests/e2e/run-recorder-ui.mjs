// 2.0.0 기록 방식(Dusk 기록기/리수폿 기록) 선택과 '최근 기록 결과'가 기억 설정에 보이고 저장되는지(PC·모바일).
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [label, vp] of [["PC", { width: 1280, height: 860 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true }) }, { memory: true, story: true, host: true }));
  await page.waitForTimeout(400);
  await page.evaluate(() => { __app.ctx.prefs.advanced = true; __app.ctx.go("memory"); }); await page.waitForTimeout(800);
  // 안내 건너뛰기 → 고급 설정 페이지 → 접힌 칸 열기(전체 설정은 처음 열 때 그려진다)
  const skip = page.getByText("건너뛰기", { exact: true }); if (await skip.count()) await skip.first().click();
  await page.getByText(/에서 더 보기/).first().click(); await page.waitForTimeout(600);
  for (let k = 0; k < 4; k++) {
    const closed = page.locator("details:not([open]) > summary:visible").filter({ hasText: /세부|더 많은 설정|고급/ });
    if (!(await closed.count())) break;
    await closed.first().click(); await page.waitForTimeout(500);
  }
  await page.waitForTimeout(400);
  const sel = page.locator('select[aria-label="기록 방식"]');
  if (await sel.count()) await sel.evaluate((el) => { for (let d = el.closest("details"); d; d = d.parentElement?.closest("details")) d.open = true; });   // 사용자가 접힌 칸을 연 것과 같은 상태
  await page.waitForTimeout(300);
  ok(`[${label}] 기록 방식 선택이 보임`, await sel.count() === 1 && await sel.isVisible().catch(() => false), String(await sel.count()));
  if (await sel.count()) {
    ok(`[${label}] 기본은 Dusk 기록기`, (await sel.inputValue()) === "dusk", await sel.inputValue());
    ok(`[${label}] 최근 기록 결과 줄`, await page.locator("[data-rec]").count() >= 1);
    await sel.scrollIntoViewIfNeeded(); await page.screenshot({ path: `/tmp/recorder-ui-${label === "PC" ? "pc" : "mo"}.png` });
    // 2.1.4: 묶어 묻기(기본 켬)·실패 시 예전 리수폿 기록(기본 끔) 스위치가 보인다
    const txt = await page.evaluate(() => document.body.innerText);
    ok(`[${label}] 묶어 묻기·실패 시 대신 스위치가 보임`, txt.includes("인물 여러 명 한 번에 묻기") && txt.includes("기록기가 실패하면 예전 리수폿 기록으로 대신"));
    await sel.selectOption("pot"); await page.waitForTimeout(400);
    const saved = await page.evaluate(async () => (await __app.ctx.memory.store.getIndex()).settings.recorder);
    ok(`[${label}] 리수폿 기록으로 바꾸면 저장됨`, saved === "pot", saved);
    const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    ok(`[${label}] 가로로 안 넘침`, !over);
  }
  ok(`[${label}] 오류 없음`, !errs.length, errs.join(";"));
}
await browser.close();
console.log(`\n${out.filter(Boolean).length}/${out.length} 통과`);
process.exit(out.every(Boolean) ? 0 : 1);
