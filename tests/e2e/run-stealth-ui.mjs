// 더스크 스텔스 화면(0.3.45): 켜기 토글 · 모양 누르면 바로 적용(적용 버튼 없음) · 되돌리기 버튼은 밝기 위 · 세부 설정/진단 접기 · 홈 바꾸기 토글. PC·모바일.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.0.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [tag, vp] of [["PC", { width: 1200, height: 860 }], ["모바일", { width: 390, height: 800 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { stealth: true }));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__app.ctx.go("tools", "stealth")); await page.waitForTimeout(600);
  const T = (s) => page.evaluate((s) => document.querySelector(".rb-main")?.textContent.includes(s), s);
  const sw = (title) => page.locator(`.rb-main :is(div,label,section):has(> * :text-is("${title}")) [role=switch], .rb-main :is(div,label):has(:text-is("${title}")) >> [role=switch]`).first();
  ok(`[${tag}] 적용 버튼 없음`, !(await T("켜기 ")) && !(await page.locator(".rb-main button", { hasText: /다시 적용|모양.*켜기$/ }).count()));
  ok(`[${tag}] 세부 설정·진단 접기(닫힌 채)`, await page.evaluate(() => { const d = [...document.querySelectorAll(".rb-main details[data-fold]")]; return d.length === 2 && d.every((x) => !x.open); }));
  ok(`[${tag}] 이미지 접기·진단 버튼은 접기 안`, await page.evaluate(() => [...document.querySelectorAll(".rb-main details[data-fold=detail] *")].some((e) => e.textContent === "이미지 접기") && [...document.querySelectorAll(".rb-main details[data-fold=diag] button")].some((b) => b.textContent.includes("화면 진단"))));
  ok(`[${tag}] 홈 바꾸기 토글 있음`, await T("홈 화면도 바꾸기"));
  ok(`[${tag}] 꺼진 상태엔 되돌리기 버튼 없음`, !(await page.locator(".rb-main button", { hasText: "원래 테마로 되돌리기" }).count()));
  await sw("더스크 스텔스 켜기").click(); await page.waitForTimeout(800);
  ok(`[${tag}] 토글로 켜짐(클로드)`, await T("● 켜짐") && await page.locator("[data-preset=claude]", { hasText: "켜짐" }).count() === 1, await page.locator(".rb-main").textContent());
  await page.locator("[data-preset=gpt]").click(); await page.waitForTimeout(800);
  ok(`[${tag}] GPT 누르면 바로 반영`, await page.locator("[data-preset=gpt]", { hasText: "켜짐" }).count() === 1);
  ok(`[${tag}] 되돌리기 버튼이 밝기 위`, await page.evaluate(() => { const b = [...document.querySelectorAll(".rb-main button")].find((x) => x.textContent === "원래 테마로 되돌리기"); const seg = document.querySelector(".rb-main [role=radiogroup], .rb-main .rb-seg"); return !!b && !!seg && (b.compareDocumentPosition(seg) & Node.DOCUMENT_POSITION_FOLLOWING) > 0; }));
  await sw("더스크 스텔스 켜기").click(); await page.waitForTimeout(800);
  ok(`[${tag}] 토글로 꺼짐`, !(await T("● 켜짐")));
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
