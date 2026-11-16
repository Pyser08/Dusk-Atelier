// 2.2.6 기억 옵션 ‘처음 등장 때 성인 항목 무작위로’ 줄 → 설정 창(토글·분류별 항목·직접 넣기·저장) + Jev 공급자 고르기
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [tag, vp] of [["PC", { width: 1280, height: 900 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true }));
  await page.waitForTimeout(500);
  await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(700);
  await page.locator("#rb-mem-tab-opt").click(); await page.waitForTimeout(300);
  const row = page.locator("#rb-adult-seed-row");
  ok(`[${tag}] 기억 옵션에 무작위 줄(누르는 줄)`, (await row.count()) === 1 && /꺼짐/.test(await row.textContent()));
  await row.click(); await page.waitForTimeout(300);
  const dlg = page.locator(".rb-seed-dlg");
  ok(`[${tag}] 설정 창이 열린다`, await dlg.isVisible());
  ok(`[${tag}] 성적 욕망·이상성향 분류별 칸`, (await page.locator("#rb-seed-desire .rb-seed-cat").count()) >= 5 && (await page.locator("#rb-seed-kink .rb-seed-cat").count()) >= 3);
  await dlg.locator(".rb-seed-sw").first().locator(".rb-switch").click();   // 사용 켜기
  await page.locator("#rb-seed-desire .rb-seed-chip.on button").first().click();   // 한 항목 끄기
  ok(`[${tag}] 항목을 누르면 꺼진다`, (await page.locator("#rb-seed-desire .rb-seed-chip:not(.on)").count()) === 1);
  await page.locator("#rb-seed-desire .rb-seed-add input").fill("비 오는 날 분위기에 약하다"); await page.locator("#rb-seed-desire .rb-seed-add input").press("Enter");
  ok(`[${tag}] 직접 넣은 항목이 칩으로`, (await page.locator("#rb-seed-desire .rb-seed-chip.mine").count()) === 1);
  await dlg.locator(".rb-seed-sw").nth(4).locator(".rb-switch").click();   // 이상성향 끄기
  ok(`[${tag}] 이상성향을 끄면 그 칸이 사라진다`, (await page.locator("#rb-seed-kink").count()) === 0);
  if (tag === "모바일") await page.screenshot({ path: `/tmp/seed-${tag}.png` });
  await page.locator("#rb-seed-save").click(); await page.waitForTimeout(300);
  const saved = await page.evaluate(async () => JSON.parse(await __app.ctx.api.pluginStorage.getItem("dusk.adultSeed")));
  ok(`[${tag}] 저장됨`, saved.on === true && saved.kinks === false && saved.off.length === 1 && saved.custom[0]?.text === "비 오는 날 분위기에 약하다", JSON.stringify(saved));
  ok(`[${tag}] 줄 글자가 켜짐으로`, /켜짐/.test(await row.textContent()));
  // Jev 공급자
  const jrow = page.locator("#rb-mem-jev-row");
  if (await jrow.count()) {
    await jrow.click(); await page.waitForTimeout(300);
    const sel = page.locator("#rb-jev-provider");
    ok(`[${tag}] Jev 공급자 고르기(오픈라우터·Vercel)`, (await sel.locator("option").count()) === 2);
    await sel.selectOption("vercel");
    ok(`[${tag}] Vercel로 바꾸면 키 칸 이름이 바뀐다`, /Vercel/.test(await page.locator(".rb-dialog").last().textContent()));
    if (tag === "PC") await page.screenshot({ path: `/tmp/jev-${tag}.png` });
    await page.keyboard.press("Escape");
  } else ok(`[${tag}] Jev 줄`, false, "없음");
  ok(`[${tag}] 페이지 오류 없음`, errs.length === 0, errs.join(" | "));
}
await browser.close();
const bad = out.filter((x) => !x).length;
console.log(bad ? `\n✘ 실패 ${bad}개` : `\n모두 통과 (${out.length})`);
process.exit(bad ? 1 : 0);
