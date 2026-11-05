// 설정 탭 '애드온 (시험)' 카드: 받기 → 켜짐(채팅 메뉴 버튼 등록) → 끄기 → 지우기. node tests/e2e/run-addons-ui.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.0.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const manifest = fs.readFileSync("addons/addons.json", "utf8");
const files = { manifest, ...Object.fromEntries(JSON.parse(manifest).addons.map((a) => [a.url, fs.readFileSync(`addons/dist/${a.id}.js`, "utf8")])) };
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const mobile of [false, true]) {
  const tag = mobile ? "모바일" : "PC";
  const page = await (await browser.newContext(mobile ? { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true } : { viewport: { width: 1200, height: 860 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(async ([f]) => { window.__addonFiles = f; const btns = (window.__btns = []); const orig = window.fakeApi; await window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { addons: true }); }, [files]);
  await page.evaluate(() => { const a = window.__api; a.registerButton = async (o) => { (window.__btns ??= []).push(o.name); return "b1"; }; a.unregisterUIPart = () => { window.__btns = (window.__btns ?? []).slice(0, -1); }; });
  await page.evaluate(() => window.__app.ctx.go("settings")); await page.waitForTimeout(500);
  const row = page.locator("[data-addon=hello]");
  ok(`[${tag}] 애드온 카드에 시험 애드온이 보임`, (await row.count()) === 1 && /받을 수 있어요/.test(await row.textContent()), await page.locator("#rb-addons").textContent().catch(() => ""));
  await row.getByRole("button", { name: "받기" }).click(); await page.waitForTimeout(500);
  ok(`[${tag}] 받기 → 켜져 있어요 · 작동 중`, /켜져 있어요/.test(await row.textContent()) && /작동 중/.test(await row.textContent()), await row.textContent());
  ok(`[${tag}] 애드온이 채팅 메뉴 버튼을 등록`, (await page.evaluate(() => window.__btns)).includes("Dusk 애드온 시험"));
  await row.locator("[role=switch]").click(); await page.waitForTimeout(400);
  ok(`[${tag}] 끄기 → 꺼져 있어요, 버튼 해제`, /꺼져 있어요/.test(await row.textContent()) && !(await page.evaluate(() => window.__btns)).length, await row.textContent());
  await row.getByRole("button", { name: "지우기" }).click(); await page.waitForTimeout(400);
  ok(`[${tag}] 지우기 → 다시 받을 수 있어요`, /받을 수 있어요/.test(await row.textContent()));
  await page.getByRole("button", { name: "업데이트 확인" }).click(); await page.waitForTimeout(400);
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
