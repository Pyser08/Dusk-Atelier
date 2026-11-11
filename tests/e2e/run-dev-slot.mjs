// 에셋 버튼 자리(2.1.x): 개발 탭 상세엔 '에셋' 버튼이 없고, 봇·모듈 편집 화면의 '적용' 아래 줄에 '에셋' + 애드온 자리(slot "editor.actions")가 있다.
// 부품은 (ctx, { kind, id, index? }) — 봇이면 index = 캐릭터 순번. 애드온이 없으면 '에셋'만. 하나가 터져도 나머지는 그림. 떼면 사라짐.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.1.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1200, height: 860 } })).newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.setContent("<!doctype html><body style='margin:0'></body>");
await page.addScriptTag({ content: r.outputFiles[0].text });
await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced", devMode: true }) }, { coreOnly: true, mods: true }));
await page.waitForTimeout(300);
await page.evaluate(() => window.__app.ctx.svc.meta((m) => { m.devProjects = [{ kind: "module", id: "m1", addedAt: 1, version: "", releases: [] }, { kind: "character", id: "c2", addedAt: 1, version: "", releases: [] }]; }));
const pick = async (sel) => { await page.evaluate((s) => { window.__app.ctx.state.devSel = s; window.__app.ctx.go("dev"); }, sel); await page.waitForTimeout(600); };
const closeEditor = async () => { await page.locator(".rb-full .rb-full-head button[aria-label='닫기']").first().click(); await page.waitForTimeout(300); const d = page.locator(".rb-modal .rb-dialog button", { hasText: /닫기|버리|나가기/ }); if (await d.count()) { await d.first().click(); await page.waitForTimeout(200); } };
const sub = () => page.evaluate(() => { const s = document.querySelector("#rb-edit-sub"); if (!s) return null; const apply = [...document.querySelectorAll(".rb-full-head .rb-btn")].find((b) => b.textContent.trim() === "적용"); return { labels: [...s.children].map((x) => x.id || x.textContent.trim()), below: (() => { const t = document.querySelector(".rb-tabs").getBoundingClientRect(), r = s.getBoundingClientRect(); return !!apply && r.top >= apply.getBoundingClientRect().bottom - 1 && r.top >= t.top - 2 && r.bottom <= t.bottom + 2 && r.left >= t.left; })(), right: !!apply && Math.abs(s.lastElementChild.getBoundingClientRect().right - apply.getBoundingClientRect().right) < 24 }; });

await pick("m:m1");
const devLabels = await page.evaluate(() => [...document.querySelector("#rb-dev-edit").parentElement.children].map((x) => x.id || x.textContent.trim()));
ok("개발 상세: 에셋 버튼 없이 버튼 4개", !devLabels.some((x) => /에셋/.test(x)) && devLabels.length === 4, devLabels.join("|"));
ok("개발 상세: 애드온 자리 없음", (await page.locator("#rb-dev-actions").count()) === 0);

await page.click("#rb-dev-edit"); await page.waitForTimeout(600);
let s = await sub();
ok("모듈 편집: 탭 줄(정보·로어북…) 오른쪽 끝에 '에셋'만", !!s && JSON.stringify(s.labels) === JSON.stringify(["rb-edit-assets"]) && s.below && s.right, JSON.stringify(s));
await page.click("#rb-edit-assets"); await page.waitForTimeout(500);
ok("모듈 편집: '에셋'을 누르면 에셋 관리가 위에 열림", (await page.locator(".rb-full[aria-label$='에셋']").count()) === 1);
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
await closeEditor();

await page.evaluate(() => { window.__off = window.__app.ctx.ext.add("slot", "editor.actions", (ctx, info) => { const b = document.createElement("button"); b.id = "t-slot"; b.dataset.info = JSON.stringify(info ?? null); b.textContent = "에셋 제작"; return b; }); });
await page.evaluate(() => { window.__app.ctx.ext.add("slot", "editor.actions", () => { throw new Error("고장"); }); });
await pick("m:m1");
await page.click("#rb-dev-edit"); await page.waitForTimeout(600);
s = await sub();
const infoM = await page.evaluate(() => JSON.parse(document.querySelector("#t-slot")?.dataset.info ?? "null"));
ok("애드온: '에셋' 옆에 끼움, 모듈이면 { kind: module, id }", JSON.stringify(s?.labels) === JSON.stringify(["rb-edit-assets", "t-slot"]) && infoM?.kind === "module" && infoM?.id === "m1" && infoM?.index == null, JSON.stringify([s, infoM]));
await closeEditor();

await pick("c:c2");
await page.click("#rb-dev-edit"); await page.waitForTimeout(700);
const infoC = await page.evaluate(() => JSON.parse(document.querySelector("#t-slot")?.dataset.info ?? "null"));
ok("봇 편집: { kind: character, id, index }", infoC?.kind === "character" && infoC?.id === "c2" && infoC?.index === 1, JSON.stringify(infoC));
await closeEditor();

await page.evaluate(() => window.__off());
await pick("c:c2");
await page.click("#rb-dev-edit"); await page.waitForTimeout(600);
ok("떼면 사라짐('에셋'은 남음)", (await page.locator("#t-slot").count()) === 0 && (await page.locator("#rb-edit-assets").count()) === 1);
await closeEditor();
// 업데이트 알림 끄기(2.1.3): 설정 → 업데이트 설정 맨 위 스위치, 기본 켜짐 → 끄면 ui.updateNotice = false
await page.evaluate(() => window.__app.ctx.go("settings", "updset")); await page.waitForTimeout(500);
const sw = page.locator(".rb-row", { hasText: "업데이트 알림" }).first().locator("[role=switch], button, input").last();
const before = await page.evaluate(() => window.__app.ctx.prefs.ui?.updateNotice);
ok("업데이트 설정: ‘업데이트 알림’ 줄이 맨 위", (await page.locator(".rb-row .name").first().innerText()) === "업데이트 알림");
await sw.click(); await page.waitForTimeout(300);
ok("끄면 ui.updateNotice = false", before !== false && (await page.evaluate(() => window.__app.ctx.prefs.ui?.updateNotice)) === false);
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
