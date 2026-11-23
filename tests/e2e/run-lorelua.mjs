// 플러그인 없이 동작(로어북 규칙 Lua): 봇 편집 → 로어북 탭 버튼(기본 켜짐) → 끄기(기억) → 켜기(트리거 탭에 자동 생성 트리거)
// node tests/e2e/run-lorelua.mjs   (사진: SHOTS=폴더)
import { createRequire } from "node:module";
import fs from "node:fs";
import { nativeContent, defaultRule } from "../../src/engine/lorerules.js";
const req = createRequire(import.meta.url);
const { build } = await import(fs.existsSync("/opt/npm-tools/node_modules/esbuild") ? "/opt/npm-tools/node_modules/esbuild/lib/main.js" : "esbuild");
const { chromium } = fs.existsSync("/opt/npm-tools/node_modules/playwright") ? createRequire("/opt/npm-tools/node_modules/")("playwright") : req("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.2.44"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const shots = process.env.SHOTS;
const mk = (rid, name, key, body, rule) => {
  const ru = { ...defaultRule(), ...rule };
  return { key, secondkey: "", comment: name, content: nativeContent(body, ru, rid), mode: "normal", insertorder: 100, alwaysActive: !key, selective: false, useRegex: false, extentions: { da_rid: rid, da_rule: ru } };
};
const lore = [
  mk("hina", "히나", "히나", "게헨나 선도부장.", {}),
  mk("cafe", "카페 데이트", "", "둘이 카페에 간다.", { cond: [{ t: "text", keys: "카페" }], set: [{ name: "호감", op: "+", val: "1" }] }),
  mk("love", "호감 높음", "", "히나가 먼저 말을 건다.", { cond: [{ t: "var", name: "호감", op: ">=", val: "3" }] }),
  mk("rain", "비 오는 날", "", "창밖에 비가 내린다.", { prob: 30, hold: 3, cond: [{ t: "text", keys: "비" }] })
];
// 사진에서 알림·말풍선 치우기
const clean = (page) => page.evaluate(() => {
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if ((cs.position === "fixed" || cs.position === "absolute") && /나왔어요|트리거를 넣|넣지 않아요|켜져 있으면 Dusk/.test(el.textContent) && el.textContent.length < 400) el.style.display = "none";
  }
}).then(() => page.mouse.move(2, 2)).then(() => page.waitForTimeout(250));
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const mobile of [false, true]) {
  const tag = mobile ? "모바일" : "PC";
  const page = await (await browser.newContext(mobile ? { viewport: { width: 390, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1200, height: 820 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(async (lore) => { await window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { coreOnly: true, loreLua: lore }); }, lore);
  await page.evaluate(() => window.__openCharEditor(0, "c1", { startTab: "lorebook" }));
  await page.waitForTimeout(900);
  const tab = (t) => page.locator(".rb-tabs button", { hasText: t }).first();
  if (!(await page.locator(".rb-treehead").count())) { await tab("로어북").click(); await page.waitForTimeout(500); }
  const toggle = page.locator(".rb-treehead button", { hasText: "플러그인 없이 동작" });
  ok(`[${tag}] 로어북 탭에 버튼, 기본 켜짐`, (await toggle.count()) === 1 && /켜짐/.test(await toggle.textContent()), await toggle.textContent().catch(() => errs.join(" | ")));
  // 끄기 → 기억 → 켜기(바로 트리거가 들어감)
  await toggle.click(); await page.waitForTimeout(300);
  ok(`[${tag}] 끄면 꺼짐으로`, /꺼짐/.test(await toggle.textContent()));
  const off = await page.evaluate(() => window.__api?.pluginStorage?.getItem("dusk-lore-lua-off") ?? window.__app.ctx.api.pluginStorage.getItem("dusk-lore-lua-off"));
  ok(`[${tag}] 끈 봇을 기억`, String(off).includes("chaId:c1"), String(off));
  await toggle.click(); await page.waitForTimeout(400);
  ok(`[${tag}] 다시 켜짐`, /켜짐/.test(await toggle.textContent()));
  const trigCount = (await tab("트리거").textContent()).replace(/\D/g, "");
  ok(`[${tag}] 트리거 탭 개수 1`, trigCount === "1", trigCount);
  if (shots) await clean(page), await page.screenshot({ path: `${shots}/lore-${mobile ? "m" : "pc"}.png` });
  await tab("트리거").click(); await page.waitForTimeout(500);
  const body = await page.locator(".rb-split").textContent();
  ok(`[${tag}] 트리거 목록에 자동 생성 트리거(Lua)`, body.includes("Dusk 로어북 규칙 (자동 생성)") && body.includes("Lua"), body.slice(0, 200));
  if (shots) await clean(page), await page.screenshot({ path: `${shots}/trigger-${mobile ? "m" : "pc"}.png` });
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(" | "));
}
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
