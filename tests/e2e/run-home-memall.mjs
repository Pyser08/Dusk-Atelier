// 약속(docs/PROMISES.md M-1): 홈 '장기 기억(모든 채팅)'을 끄면 다음 요청에 기억 블록이 들어가지 않고, 켜면 다시 들어간다.
// 예전 시험은 저장값(settings.inject.on)만 봤다. 지금은 실제 요청 훅에 요청을 흘려 모델이 받는 글을 본다(실제 클릭).
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); page.setDefaultTimeout(5000);
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true }) }, { memory: true, story: true, host: true }));
// 시험 채팅은 8줄뿐이라 '최근 8줄은 넣지 않음'(recentSkip)에 기록이 다 걸린다 → 이 시험에서만 0으로(스위치 동작을 보려는 것)
await page.evaluate(() => __app.ctx.memory.store.updateIndex((i) => { i.settings.inject.recentSkip = 0; }));
await page.waitForTimeout(400);
const sw = () => page.locator(".rb-hstat-memory [role=switch]");
const statusText = () => page.locator(".rb-hstat-memory").textContent();
// 모델에 가는 요청 글(훅을 모두 거친 뒤)에 기억 블록이 있는가
const sent = () => page.evaluate(async () => (await __host.request([{ role: "system", content: "당신은 시로코입니다." }, { role: "user", content: "같이 순찰 나갈래?" }])).map((m) => String(m.content)).join("\n"));
const hasMemory = (t) => t.includes("[Dusk Memory") && t.includes("순찰");

ok("켜져 있으면 요청에 기억 블록이 들어간다(이 시험이 실제로 무언가를 보는지 확인)", hasMemory(await sent()), (await sent()).slice(0, 200));
ok("처음엔 스위치가 켜짐", (await sw().getAttribute("aria-checked")) === "true");
await sw().click(); await page.waitForTimeout(400);
ok("끄면 다음 요청에 기억 블록이 없다", !(await sent()).includes("[Dusk Memory"), (await sent()).slice(0, 200));
ok("끈 뒤 스위치가 꺼짐으로 남음", (await sw().getAttribute("aria-checked")) === "false", await sw().getAttribute("aria-checked"));
ok("상태 줄도 '꺼져 있어요'", /꺼져 있어요/.test(await statusText()), await statusText());
await sw().click(); await page.waitForTimeout(400);
ok("다시 켜면 다음 요청에 기억 블록이 다시 들어간다", hasMemory(await sent()), (await sent()).slice(0, 200));
ok("켠 뒤 스위치가 켜짐으로 남음", (await sw().getAttribute("aria-checked")) === "true", await sw().getAttribute("aria-checked"));
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
