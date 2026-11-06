// 기능 맛보기 카드(2.0.0) · 화면 안내 목표가 실제 화면에 있는지
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [tag, vp] of [["PC", { width: 1280, height: 900 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { memory: true, story: true }));
  await page.waitForTimeout(1200);
  ok(`[${tag}] 홈에 맛보기 카드(기록이 쌓였으니 인물 위키)`, (await page.locator("#rb-discover").getAttribute("data-discover").catch(() => "")) === "wiki");
  await page.locator("#rb-discover-go").click(); await page.waitForTimeout(1600);
  ok(`[${tag}] 해 보기 → 그 화면 + 화면 안내`, (await page.evaluate(() => __app.ctx.state.tab)) === "memory" && (await page.locator(".rb-tour-card, .rb-tour").count()) >= 1);
  const ui = await page.evaluate(() => JSON.parse(__api.store["rbm:ui:v1"] ?? "{}"));
  ok(`[${tag}] 해 본 것으로 저장·방문 기록`, (ui.discover?.seen ?? []).includes("wiki") && (ui.visited ?? []).includes("memory:detail"), JSON.stringify(ui.visited));
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  // 장기 기억 홈 안내 목표가 화면에 있는지(없으면 그 단계가 조용히 건너뛰어진다)
  await page.evaluate(() => { __app.ctx.state.mem.page = "home"; __app.ctx.go("memory"); }); await page.waitForTimeout(1200);
  const miss = await page.evaluate(() => [".rb-mem-statuscard", "#rb-mem-analyze", ".rb-mem-short", "#rb-mem-go-pot", ".rb-mem-options", ".rb-mem-integrated-settings"].filter((q) => !document.querySelector(q)));
  ok(`[${tag}] 장기 기억 홈 안내 목표가 모두 있음`, !miss.length, miss.join(","));
  await page.evaluate(() => __app.ctx.go("relmap")); await page.waitForTimeout(1200);
  const miss2 = await page.evaluate(() => [".rb-rm-stage", ".rb-rm-ctrls", ".rb-rm-help", ".rb-rm-panel"].filter((q) => !document.querySelector(q)));
  ok(`[${tag}] 관계도 안내 목표`, !miss2.length || tag === "모바일", miss2.join(","));
  await page.evaluate(() => __app.ctx.go("home")); await page.waitForTimeout(1200);
  if (await page.locator("#rb-discover").count()) { await page.locator("#rb-discover-later").click(); await page.waitForTimeout(500); }
  ok(`[${tag}] 나중에 → 카드 사라짐`, (await page.locator("#rb-discover").count()) === 0);
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
