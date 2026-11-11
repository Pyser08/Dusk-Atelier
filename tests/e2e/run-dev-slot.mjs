// 개발 탭 버튼 줄 아래 애드온 자리(slot "dev.actions"): 애드온이 없으면 흔적이 없고, 끼우면 불러오기·내보내기 줄 아래 폭 가득 붙으며
// 부품은 (ctx, { kind, id, index }) 를 받는다(봇이면 index = 캐릭터 순번). 떼면 다시 사라진다.
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
const labels = () => page.evaluate(() => [...document.querySelectorAll("#rb-dev-edit")].map((b) => [...b.parentElement.children].map((x) => x.id || x.textContent.trim())).flat());

await pick("m:m1");
const before = await labels();
ok("애드온 없음: 에셋 옆에 아무것도 없음", before.length === 5 && /에셋/.test(before[1]) && before[2] === "rb-dev-checkpoint", before.join("|"));

await page.evaluate(() => { window.__off = window.__app.ctx.ext.add("slot", "dev.actions", (ctx, info) => { const b = document.createElement("button"); b.id = "t-slot"; b.dataset.info = JSON.stringify(info ?? null); b.textContent = "AI 에셋"; return b; }); });
await pick("m:m1");
const withSlot = await labels();
const place = await page.evaluate(() => { const s = document.querySelector("#t-slot"), row = document.querySelector("#rb-dev-edit").parentElement; return { parent: s?.parentElement?.id, afterRow: s?.previousElementSibling === row, below: s && s.getBoundingClientRect().top >= row.getBoundingClientRect().bottom }; });
ok("끼우면 버튼 줄은 그대로, 그 아래에 붙음", withSlot.length === 5 && withSlot[4] === "rb-dev-export" && place.parent === "rb-dev-actions" && place.afterRow && place.below, `${withSlot.join("|")} ${JSON.stringify(place)}`);
const infoM = await page.evaluate(() => JSON.parse(document.querySelector("#t-slot")?.dataset.info ?? "null"));
ok("모듈이면 { kind: module, id }", infoM?.kind === "module" && infoM?.id === "m1" && infoM?.index == null, JSON.stringify(infoM));

await pick("c:c2");
const infoC = await page.evaluate(() => JSON.parse(document.querySelector("#t-slot")?.dataset.info ?? "null"));
ok("봇이면 { kind: character, id, index }", infoC?.kind === "character" && infoC?.id === "c2" && infoC?.index === 1, JSON.stringify(infoC));

await page.evaluate(() => { window.__app.ctx.ext.add("slot", "dev.actions", () => { throw new Error("고장"); }); });
await pick("m:m1");
ok("부품 하나가 터져도 화면·다른 부품은 그대로", (await page.locator("#t-slot").count()) === 1 && (await page.locator("#rb-dev-edit").count()) === 1);

await page.evaluate(() => window.__off());
await pick("m:m1");
ok("떼면 사라짐", (await page.locator("#t-slot").count()) === 0);
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
