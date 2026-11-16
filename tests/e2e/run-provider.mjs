// 프로바이더 화면(1.9.3): 작업실 큰 카드 · 꾸미기는 도구로 이동 · 연결 추가→키→모델→프로필→용도→리스 등록 (실제 클릭)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json", ".md": "text", ".txt": "text" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch(), errs = [];
{ // 2.2.6 프로바이더는 본체 기능: 실험 기능이 꺼져 있어도 보이고, 간단 모드는 빠른 시작 화면 + 홈 이어서 하기 밑 바로가기
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, { provider: true }));
  await page.waitForTimeout(500);
  const vis0 = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent).length, sel);
  await page.evaluate(() => __app.ctx.go("home")); await page.waitForTimeout(400);
  ok("[간단] 홈 이어서 하기 밑에 ‘AI 연결·캐시 설정’ 버튼", (await vis0("#rb-home-prov")) === 1);
  await page.locator("#rb-home-prov").click(); await page.waitForTimeout(500);
  ok("[간단] 누르면 빠른 시작 화면", (await vis0(".rb-prov #rb-prov-qgo")) === 1 && (await vis0("#rb-prov-addconn")) === 0);
  await page.locator("#rb-prov-qkey").fill("AIza-test-key-9876"); await page.locator("#rb-prov-qmain").fill("gemini-2.5-flash"); await page.locator("#rb-prov-qsub").fill("gemini-4-carbon");
  await page.locator("#rb-prov-qgo").click(); await page.waitForTimeout(700);
  const cfg = await page.evaluate(async () => { const c = await __app.ctx.provider.store.get(); return { en: c.enabled, models: c.profiles.map((p) => p.model), cache: c.profiles.map((p) => p.cache.gemini), main: c.purposes.main.profileId, sub: c.subProfileId, keys: c.connections[0]?.keyIds.length }; });
  ok("[간단] 설정 만들기: 켜짐·메인/보조 프로필·캐시 자동·키 저장", cfg.en && cfg.models.join() === "gemini-2.5-flash,gemini-4-carbon" && cfg.cache.every((x) => x === "auto") && cfg.main && cfg.sub && cfg.keys === 1, JSON.stringify(cfg));
  ok("[간단] 키 값은 화면에 없음", !(await page.content()).includes("AIza-test-key-9876"));
  const names0 = await page.evaluate(() => window.__providers);
  ok(`[간단] 리스에 Dusk 자동 등록: ${names0}`, names0.includes("Dusk 자동"));
  ok("[간단] 캐시 배치 카드(하이파 분리 켜짐·이어붙이기 꺼짐)", (await vis0("#rb-prov-layout")) === 1 && (await page.locator("#rb-prov-layout [role=switch]").nth(0).getAttribute("aria-checked")) === "true" && (await page.locator("#rb-prov-layout [role=switch]").nth(1).getAttribute("aria-checked")) === "false");
  await page.locator("#rb-prov-layout [role=switch]").nth(1).click(); await page.waitForTimeout(300);
  ok("[간단] 이어붙이기 켜면 저장", await page.evaluate(async () => (await __app.ctx.cacheLayout.get()).append === true));
  await page.close();
}
for (const [tag, vp] of [["PC", { width: 1280, height: 800 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp, ...tag === "모바일" ? { hasTouch: true, isMobile: true } : {} })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true, experimental: true, uiMode: "advanced" }) }, { provider: true }));
  await page.waitForTimeout(500);
  const vis = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent).length, sel);
  const go = (id) => page.evaluate((i) => window.__app?.ctx?.go?.(i) ?? window.app?.ctx?.go?.(i), id);
  const hasGo = await page.evaluate(() => !!(window.__app || window.app));
  if (!hasGo) { ok(`[${tag}] 앱 핸들`, false, "bootApp이 app을 노출하지 않음"); await page.close(); continue; }
  await go("work-home"); await page.waitForTimeout(300);
  ok(`[${tag}] 작업실 연결 묶음에 프로바이더`, (await vis('.rb-wgroup [data-tab="provider"]')) === 1);
  ok(`[${tag}] 작업실 목록에 꾸미기 없음`, (await vis('[data-tab="look"]')) === 0);
  await go("tools"); await page.waitForTimeout(300);
  ok(`[${tag}] 도구에 ‘플러그인 꾸미기’ 행`, (await vis("#rb-tool-look")) === 1);
  await page.locator("#rb-tool-look").click(); await page.waitForTimeout(400);
  ok(`[${tag}] 꾸미기 화면이 열림 + 도구로 돌아가기`, (await vis(".rb-set-look, .rb-phead")) >= 1 && /도구로 돌아가기/.test(await page.locator(".rb-phead button").first().getAttribute("aria-label")));
  await go("provider"); await page.waitForTimeout(400);
  ok(`[${tag}] 프로바이더 화면 + 꺼짐 상태`, (await vis(".rb-prov")) === 1 && (await vis(".rb-status.k-off")) === 1);
  await page.locator("#rb-prov-addconn").click(); await page.locator(".rb-menu [role=menuitem]", { hasText: "OpenAI" }).first().click(); await page.waitForTimeout(400);
  ok(`[${tag}] 연결 카드 생김`, (await vis("[data-conn]")) === 1);
  await page.locator('[data-conn] input[type=password]').fill("sk-test-abcdefgh-1234"); await page.locator("[data-conn] button", { hasText: "키 추가" }).click(); await page.waitForTimeout(500);
  const tail = await page.locator(".rb-pkey code").first().textContent().catch(() => "");
  ok(`[${tag}] 키는 끝 4자리만 보임`, tail === "…1234" && !(await page.content()).includes("sk-test-abcdefgh"), tail);
  await page.locator("[data-conn] button", { hasText: "모델 불러오기" }).click(); await page.waitForTimeout(500);
  ok(`[${tag}] 모델 칩 2개`, (await vis("[data-conn] .rb-chip")) === 2);
  await page.locator('[data-conn] input[type=search]').fill("large"); await page.waitForTimeout(150);
  ok(`[${tag}] 모델 검색: large만 남음`, (await vis("[data-conn] .rb-chip")) === 1 && /gpt-test-large/.test(await page.locator("[data-conn] .rb-chip").first().textContent()));
  await page.locator('[data-conn] input[type=search]').fill("mini"); await page.waitForTimeout(150);
  await page.locator("[data-conn] .rb-chip", { hasText: "gpt-test-mini" }).click(); await page.waitForTimeout(500);
  ok(`[${tag}] 프로필이 만들어지고 프로필 탭으로`, (await vis("[data-prof]")) === 1);
  // 약속 P-4: 카드 버튼 배치 — 접기는 오른쪽 끝, 지우기(위험)는 맨 아래 오른쪽, 테두리에서 14px 이상 떨어짐
  const lay = await page.evaluate(() => { const c = document.querySelector("[data-prof]"), cr = c.getBoundingClientRect(), r = (b) => b.getBoundingClientRect(); const fold = c.querySelector(".top .rb-btn"), del = c.querySelector(".foot .rb-btn.danger"); return { fold: cr.right - r(fold).right, delR: cr.right - r(del).right, delBottom: [...c.querySelectorAll(".rb-btn")].every((b) => r(b).top <= r(del).top + 1), left: Math.min(...[...c.querySelectorAll(".foot .rb-btn")].map((b) => r(b).left - cr.left)) }; });
  ok(`[${tag}] 프로필 카드: 접기 오른쪽 끝, ‘프로필 지우기’는 맨 아래 오른쪽, 여백 14px 이상`, lay.fold >= 14 && lay.fold < 30 && lay.delR >= 14 && lay.delR < 30 && lay.delBottom && lay.left >= 14, JSON.stringify(lay));
  await page.locator('[data-prof] button.rb-chip[data-preset="oa-flex"]').click(); await page.waitForTimeout(400);
  ok(`[${tag}] 플렉스 프리셋이 켜짐`, (await page.locator('[data-preset="oa-flex"]').getAttribute("aria-pressed")) === "true");
  await page.locator('.rb-phead [role=switch]').click(); await page.waitForTimeout(600);
  const names = await page.evaluate(() => window.__providers);
  ok(`[${tag}] 켜면 리스에 등록: ${names.join(",")}`, names.includes("Dusk 자동") && names.some((n) => n.startsWith("Dusk · gpt-test-mini")));
  ok(`[${tag}] 사용 중 상태 카드`, (await vis(".rb-status.k-on")) === 1);
  await page.locator(".rb-prov .rb-seg button", { hasText: "용도" }).first().click(); await page.waitForTimeout(250);
  const order = await page.evaluate(() => [...document.querySelectorAll("[data-purpose]")].slice(0, 3).map((e) => e.dataset.purpose).join(","));
  ok(`[${tag}] 용도 맨 위가 메인 → 보조: ${order}`, order === "main,sub,translate");
  ok(`[${tag}] 다른 용도의 기본 문구는 ‘보조와 같게’`, /보조와 같게/.test(await page.locator('[data-purpose="translate"] select').first().evaluate((e) => e.options[0].textContent)));
  for (const t of ["용도", "규칙", "사용량", "확장", "로그", "비교"]) { await page.locator(".rb-prov .rb-seg button", { hasText: t }).first().click(); await page.waitForTimeout(250); ok(`[${tag}] ‘${t}’ 탭이 그려짐`, (await vis(".rb-prov-body > *")) >= 1); }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok(`[${tag}] 가로 넘침 없음`, !overflow);
  await page.close();
}
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
