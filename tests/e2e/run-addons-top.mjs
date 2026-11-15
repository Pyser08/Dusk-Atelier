// 홈 '애드온' 상자(2.1.0, 예전 설정 탭): 받기 → 켜짐(채팅 메뉴 버튼 등록) → 끄기 → 지우기. node tests/e2e/run-addons-ui.mjs
import { createRequire } from "node:module";
import { manifestWithHello } from "./hello-fixture.mjs";
import fs from "node:fs";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.2.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const manifest = manifestWithHello();
const files = { manifest, ...Object.fromEntries(JSON.parse(manifest).addons.map((a) => [a.url, fs.readFileSync(`addons/dist/${a.id}.js`, "utf8")])) };
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const mobile of [false]) {
  const tag = mobile ? "모바일" : "PC";
  const page = await (await browser.newContext(mobile ? { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true } : { viewport: { width: 1200, height: 860 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(async ([f]) => { window.__addonFiles = f; const btns = (window.__btns = []); const orig = window.fakeApi; await window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { addons: true }); }, [files]);
  await page.evaluate(() => { const a = window.__api; a.registerButton = async (o) => { (window.__btns ??= []).push(o.name); return "b1"; }; a.unregisterUIPart = () => { window.__btns = (window.__btns ?? []).slice(0, -1); }; });
  for (const id of ["protlink", "hello", "chattheme"]) { const b = page.locator(`[data-addon=${id}]`).getByRole("button", { name: "받기" }); if (await b.count()) { await b.click(); await page.waitForTimeout(900); } }
  await page.evaluate(async () => { const m = JSON.parse(window.__addonFiles.manifest); for (const a of m.addons) if (a.id === "hello" || a.id === "chattheme") a.version = "9.0.0"; window.__addonFiles.manifest = JSON.stringify(m); await window.__app.ctx.addons.loadManifest(); window.__app.ctx.go("settings"); await new Promise((r) => setTimeout(r, 200)); window.__app.ctx.go("home"); });
  await page.waitForTimeout(900);
  ok("[PC] 맨 위가 받기·업데이트 줄", await page.evaluate(() => document.querySelector("#rb-addons > :first-child")?.querySelector("#rb-addon-check") != null));
  ok("[PC] 둘째가 ‘업데이트’ 묶음(새 버전 2개, v→v 표시)", (await page.locator("#rb-addons > :nth-child(2)[data-cat=update] [data-addon]").count()) === 2 && /→ v9\.0\.0/.test(await page.locator("[data-cat=update]").textContent()));
  await page.locator("[data-addon=protlink]").getByRole("button", { name: "열기" }).click(); await page.waitForTimeout(400);
  ok("[PC] 탭이 있는 애드온 ‘열기’ → 그 탭", await page.evaluate(() => document.querySelector(".rb-win")?.className.includes("rb-is-home") === false));
  ok("[PC] 페이지 오류 없음", !errs.length, errs.join(" | "));
}
await browser.close();
if (out.includes(false)) process.exit(1);
