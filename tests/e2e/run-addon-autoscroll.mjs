// 오토 스크롤 커스텀 애드온: 불러오기 → 홈 빠른 설정 맨 아래 줄 → 켜기 → ‘설정’ 창(속도·좌우 스크롤 막기) → 설정 탭 카드 → 지우기.
// node tests/e2e/run-addon-autoscroll.mjs   (예전 코어 확인: 그 코어의 저장소 폴더에서 ADDON=<이 파일 경로> 로 실행)
import { createRequire } from "node:module";
import fs from "node:fs";
const req = createRequire(import.meta.url);
const { build } = await import(fs.existsSync("/opt/npm-tools/node_modules/esbuild") ? "/opt/npm-tools/node_modules/esbuild/lib/main.js" : "esbuild");
const { chromium } = fs.existsSync("/opt/npm-tools/node_modules/playwright") ? createRequire("/opt/npm-tools/node_modules/")("playwright") : req("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.2.4"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const addonPath = process.env.ADDON ?? `addons/autoscroll/${fs.readdirSync("addons/autoscroll").filter((f) => f.endsWith(".dka") || f.endsWith(".dusk-addon.js")).sort((a, b) => Number(b.endsWith(".dka")) - Number(a.endsWith(".dka")))[0]}`;
const file = addonPath.split("/").at(-1), code = fs.readFileSync(addonPath, "utf8");
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const shots = process.env.SHOTS;
const store = (k) => `dusk.addon.data.auto-scroll.${k}`;
const browser = await chromium.launch();
for (const mobile of [false, true]) {
  const tag = mobile ? "모바일" : "PC";
  const page = await (await browser.newContext(mobile ? { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true } : { viewport: { width: 1200, height: 860 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(async () => { window.__addonFiles = {}; await window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { addons: true }); });
  const get = (k) => page.evaluate(async (k) => window.__api.pluginStorage.getItem(k), store(k));
  await page.evaluate(() => window.__app.ctx.go("home")); await page.waitForTimeout(600);
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.locator("#rb-addon-import").click()]);
  await fc.setFiles({ name: file, mimeType: "text/javascript", buffer: Buffer.from(code) });
  await page.getByRole("button", { name: "확인했어요" }).click(); await page.waitForTimeout(300);
  await page.getByRole("button", { name: "넣기", exact: true }).click(); await page.waitForTimeout(700);
  const crow = page.locator("[data-addon=custom-auto-scroll]");
  ok(`[${tag}] 불러오기 → 작동 중`, (await crow.count()) === 1 && /작동 중/.test(await crow.textContent()), await crow.textContent().catch(() => errs.join(" | ")));
  await page.evaluate(() => window.__app.ctx.go("home")); await page.waitForTimeout(700);
  const last = await page.evaluate(() => document.querySelector(".rb-hqs .rb-story-helper")?.lastElementChild?.id ?? null);
  ok(`[${tag}] 홈 빠른 설정 맨 아래에 오토 스크롤 줄`, last === "rb-qs-autoscroll", String(last));
  ok(`[${tag}] 줄이 하나만`, (await page.locator("#rb-qs-autoscroll").count()) === 1);
  const qrow = page.locator("#rb-qs-autoscroll");
  ok(`[${tag}] 유저 편향 없애기 줄과 같은 모양(상태 글자 + ›, 스위치 없음)`, (await qrow.evaluate((el) => el.tagName)) === "BUTTON" && /꺼짐/.test(await qrow.locator(".val").textContent()) && (await qrow.locator(".go svg").count()) === 1 && (await qrow.locator("[role=switch]").count()) === 0);
  await qrow.scrollIntoViewIfNeeded(); await qrow.click(); await page.waitForTimeout(300);
  const dlg = page.locator(".rb-dialog[aria-label='오토 스크롤']");
  ok(`[${tag}] 줄 누르기 → 상세 창(사용하기·속도·좌우 스크롤 막기)`, (await dlg.count()) === 1 && (await dlg.locator("#rb-as-on").count()) === 1 && (await dlg.locator(".rb-as-range").count()) === 1 && (await dlg.locator("#rb-as-nox").count()) === 1);
  await dlg.locator("#rb-as-on [role=switch]").click(); await page.waitForTimeout(400);
  ok(`[${tag}] 사용하기 켜기 → 저장`, (await dlg.locator("#rb-as-on [role=switch]").getAttribute("aria-checked")) === "true" && (await get("on")) === "true");
  await dlg.getByRole("button", { name: "빠르게", exact: true }).click(); await page.waitForTimeout(300);
  ok(`[${tag}] 창에서 빠르게 → 120 저장`, (await get("speed")) === "120");
  await dlg.locator(".rb-as-range").fill("200"); await dlg.locator(".rb-as-range").dispatchEvent("change"); await page.waitForTimeout(300);
  ok(`[${tag}] 창에서 슬라이더 → 200 저장`, (await get("speed")) === "200");
  await dlg.locator("#rb-as-nox [role=switch]").click(); await page.waitForTimeout(300);
  ok(`[${tag}] 좌우 스크롤 막기 켜기 → 저장`, (await get("noX")) === "true" && (await dlg.locator("#rb-as-nox [role=switch]").getAttribute("aria-checked")) === "true");
  if (shots) await dlg.screenshot({ path: `${shots}/dialog-${mobile ? "m" : "pc"}.png` });
  ok(`[${tag}] 창이 화면 폭을 넘지 않음`, await dlg.evaluate((d) => d.scrollWidth <= d.clientWidth + 1 && d.getBoundingClientRect().right <= innerWidth + 1));
  await dlg.getByRole("button", { name: "닫기" }).click(); await page.waitForTimeout(300);
  ok(`[${tag}] 닫기 → 줄 상태 글자가 바뀜`, (await dlg.count()) === 0 && /켜짐 · 200/.test(await qrow.locator(".val").textContent()), await qrow.locator(".val").textContent().catch(() => ""));
  if (shots) await page.locator(".rb-hqs").screenshot({ path: `${shots}/quick-${mobile ? "m" : "pc"}.png` });
  // 설정 탭 카드
  await page.evaluate(() => window.__app.ctx.go("settings")); await page.waitForTimeout(700);
  const card = page.locator("#rb-autoscroll, .rb-scard[data-addon=auto-scroll]");
  ok(`[${tag}] 설정 탭에 카드(같은 값)`, (await card.count()) === 1 && (await card.locator(".rb-as-range").inputValue()) === "200" && (await card.locator("#rb-as-nox [role=switch]").getAttribute("aria-checked")) === "true");
  if (shots) { await card.scrollIntoViewIfNeeded(); await card.screenshot({ path: `${shots}/settings-${mobile ? "m" : "pc"}.png` }); }
  await page.evaluate(() => window.__app.ctx.go("home")); await page.waitForTimeout(600);
  await page.locator("[data-addon=custom-auto-scroll] [aria-label$='메뉴']").click(); await page.getByRole("menuitem", { name: /지우기/ }).click(); await page.waitForTimeout(300);
  const conf = page.getByRole("button", { name: /지우기/ }).last(); if (await conf.count()) { await conf.click().catch(() => {}); await page.waitForTimeout(400); }
  ok(`[${tag}] 지우기 → 빠른 설정 줄 사라짐`, (await page.locator("#rb-qs-autoscroll").count()) === 0);
  ok(`[${tag}] 페이지 오류 없음`, !errs.length, errs.join(" | "));
}
await browser.close();
console.log(out.every(Boolean) ? "모두 통과" : "실패 있음");
process.exitCode = out.every(Boolean) ? 0 : 1;
