// 장기 기억 → 리수폿 화면(2.0.0): 홈 줄 → 탭 4개(개요·설정·자동 기록·고급) · 고급에서 옮겨 온 것 · 장기 기억으로 돌아가기
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
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true }));
  await page.waitForTimeout(500);
  await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(900);
  ok(`[${tag}] 장기 기억 홈에 리수폿 줄`, (await page.locator("#rb-mem-go-pot").count()) === 1);
  await page.locator("#rb-mem-tab-opt").click(); await page.waitForTimeout(200);   // 2.2.0: ‘설정’ 칸
  await page.locator("#rb-mem-go-pot").click(); await page.waitForTimeout(900);
  ok(`[${tag}] 인물 위키 설정 화면·탭 3개(2.2.0: 개요·설정·고급)`, (await page.locator("#rb-mem-pot").count()) === 1 && (await page.locator("#rb-mem-pot .rb-seg button").count()) === 3);
  ok(`[${tag}] 개요 탭: 상태·동작·캐릭터별 사용`, /위키 보기/.test(await page.locator(".rb-pot-pane").textContent()) && /캐릭터별 사용/.test(await page.locator(".rb-pot-pane").textContent()), (await page.locator(".rb-pot-pane").textContent()).slice(0, 120));
  ok(`[${tag}] 큰 카드(상태·설명, 켜기 없음) → 탭 순서`, await page.evaluate(() => { const hero = document.querySelector("#rb-pot-hero"), tabs = document.querySelector("#rb-pot-tabs"); return !!hero && !!tabs && !!hero.querySelector(".rb-status, [class*=status]") && !hero.querySelector("[role=switch]") && !!(hero.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  ok(`[${tag}] 개요에 ‘어디서 봐요?’ 안내`, (await page.locator("#rb-pot-guide").count()) === 1);
  ok(`[${tag}] ‘이 채팅에서 사용’ 문구 없음`, !/이 채팅에서 사용/.test(await page.locator("#rb-mem-pot").textContent()));
  const tab = async (n) => { await page.locator("#rb-mem-pot .rb-seg button", { hasText: n }).click(); await page.waitForTimeout(900); };
  await tab("설정");
  ok(`[${tag}] 설정 탭: 추적 수준(AI 모델은 고급 탭)`, /무엇을 기억할까요/.test(await page.locator(".rb-pot-pane").textContent()), (await page.locator(".rb-pot-pane").textContent()).slice(0, 120));
  await tab("고급");
  ok(`[${tag}] 고급 탭: 인물 추적 + 저장·되돌리기(2.2.0 합침)`, /AI 모델/.test(await page.locator(".rb-pot-pane .rb-card > h3").first().textContent()) && /새 인물 자동 추적/.test(await page.locator(".rb-pot-pane").textContent()) && /되돌리기/.test(await page.locator(".rb-pot-pane").textContent()));
  ok(`[${tag}] 고급 탭에 ‘자동 기록 세부’ 없음(2.2.0 장기 기억 설정으로 옮김)`, !/자동 기록 세부/.test(await page.locator(".rb-pot-pane").textContent()));
  await page.locator("#rb-mem-pot .rb-phead [aria-label='장기 기억으로']").first().click(); await page.waitForTimeout(700);
  ok(`[${tag}] 장기 기억으로 돌아가기`, (await page.locator("#rb-mem-go-pot").count()) === 1);
  // 열린 채팅이 없을 때도 리수폿 화면이 열려야 한다(예전: "a.nodes is not iterable")
  await page.evaluate(() => { window.__api.getCurrentChatIndex = async () => -1; window.__api.getCurrentCharacterIndex = async () => -1; const m = __app.ctx.state.mem; m.page = "pot"; m.potTab = "home"; __app.ctx.go("memory"); });
  await page.waitForTimeout(1200);
  ok(`[${tag}] 열린 채팅 없음: 리수폿 화면이 큰 카드와 함께 열림`, (await page.locator("#rb-pot-hero").count()) === 1 && /열린 채팅이 없어요/.test(await page.locator("#rb-mem-pot").textContent()), await page.locator(".rb-main").textContent());
  ok(`[${tag}] 켜기 스위치 없음(2.2.0, 인물 위키는 늘 씀)`, (await page.locator("#rb-pot-hero [role=switch]").count()) === 0);
  await page.locator("#rb-mem-pot .rb-seg button", { hasText: "설정" }).click(); await page.waitForTimeout(1200);
  ok(`[${tag}] 열린 채팅 없음: 설정 탭`, /무엇을 기억할까요/.test(await page.locator(".rb-pot-pane").textContent()), (await page.locator(".rb-pot-pane").textContent()).slice(0, 100));
  await page.evaluate(() => { const m = __app.ctx.state.mem; m.page = "home"; __app.ctx.go("memory"); }); await page.waitForTimeout(1500);
  ok(`[${tag}] 장기 기억 설정: 임베딩 아래 ‘자동 기록 세부’ 줄`, await page.evaluate(() => { const r = document.querySelector("#rb-mem-writer-row"); return !!r && /임베딩/.test(r.previousElementSibling?.textContent ?? ""); }));
  ok(`[${tag}] 기억 옵션: ‘기억 넣기 토큰’ 바로 밑 ‘자동 기록 입력 예산’`, await page.evaluate(() => { const r = document.querySelector("#rb-mem-wbudget"); return !!r && !r.hidden && r.previousElementSibling?.id === "rb-mem-tokens"; }));
  await page.evaluate(() => { let e = document.querySelector("#rb-mem-writer-row"); while (e) { if (e.tagName === "DETAILS") e.open = true; e = e.parentElement; } });
  await page.locator("#rb-mem-writer-row").click(); await page.waitForTimeout(500);
  ok(`[${tag}] 줄을 누르면 자동 기록 세부 창(입력 예산은 없음)`, /장면 정리의 역할/.test(await page.locator("#rb-mem-writer").textContent()) && !/입력 예산/.test(await page.locator("#rb-mem-writer").textContent()));
  await page.locator("#rb-mem-writer button", { hasText: "사실만 전달" }).click(); await page.waitForTimeout(500);
  ok(`[${tag}] 창에서 바꾼 값이 저장됨(장면 정리 역할)`, (await page.evaluate(async () => (await __app.ctx.memory.flow.settings()).rawSnapshot().directorRole)) === "facts");
  await page.locator("#rb-mem-writer button", { hasText: "닫기" }).click(); await page.waitForTimeout(200);
  await page.evaluate(() => { let e = document.querySelector("#rb-mem-wbudget"); while (e) { if (e.tagName === "DETAILS") e.open = true; e = e.parentElement; } });
  await page.locator("#rb-mem-wbudget input").fill("64000"); await page.locator("#rb-mem-wbudget input").press("Tab"); await page.waitForTimeout(400);
  ok(`[${tag}] 입력 예산 바꾸면 저장됨`, (await page.evaluate(async () => (await __app.ctx.memory.flow.settings()).rawSnapshot().writerInputBudgetTokens)) === 64000);
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
