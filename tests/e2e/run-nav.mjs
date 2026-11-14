// 2.2.0 사이드바: 아이콘 레일(올리면 펼침) · 섹션 접기(지금 섹션은 펼침, 저장) · 섹션 색 · 아래 한 줄 + ⋯ 메뉴(위치·늘 펼침·변경 기록)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const errs = [];
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage(); page.setDefaultTimeout(5000);
page.on("pageerror", (e) => errs.push(e.message));
await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ tourDone: true, tourVer: 99, simpleNoticeDone: true, theme: { mode: "dark" } }) }, { memory: true, story: true, mods: true }));
await page.addStyleTag({ content: ".rb-toasts{display:none!important}" });
await page.waitForTimeout(800);
const ui = () => page.evaluate(() => JSON.parse(__api.store["rbm:ui:v1"] ?? "{}"));
const navW = () => page.evaluate(() => Math.round(document.querySelector(".rb-nav").getBoundingClientRect().width));
await page.mouse.move(700, 400);
ok("레일: 처음엔 아이콘만(좁음)", (await navW()) < 90, String(await navW()));
ok("‘for RisuBard’ 없음", !(await page.locator(".rb-brand").textContent()).includes("RisuBard"));
ok("섹션 3개 · 섹션 색 네온 아이콘(2.2.0: 테두리·아이콘이 섹션 색)", (await page.locator(".rb-nav-sec").count()) === 3 && await page.evaluate(() => { const c = getComputedStyle(document.querySelector(".rb-nav-sec.sec-memory .ci")); return c.borderTopStyle === "solid" && c.color !== "rgb(255, 255, 255)" && c.backgroundImage.includes("gradient"); }));
ok("홈에서는 섹션이 모두 접힘", (await page.locator(".rb-nav-sec[aria-expanded=true]").count()) === 0);
await page.hover(".rb-nav"); await page.waitForTimeout(300);
ok("올리면 펼침", (await navW()) > 200, String(await navW()));
const contentX = await page.evaluate(() => Math.round(document.querySelector(".rb-col").getBoundingClientRect().x));
ok("펼쳐도 본문은 안 밀림(위로 덮음)", contentX < 140, String(contentX));
await page.locator(".rb-nav-sec.sec-manage").click(); await page.waitForTimeout(400);
ok("섹션 제목 누르면 펼침 + 저장", (await page.locator(".rb-nav-sec.sec-manage").getAttribute("aria-expanded")) === "true" && (await ui()).navOpen?.includes("manage"));
await page.locator(".rb-nav a[data-tab=modules]").click(); await page.waitForTimeout(600);
ok("메뉴 눌러 이동 · 그 섹션 펼침 · 섹션 색 띠", (await page.locator(".rb-nav a[data-tab=modules]").getAttribute("aria-current")) === "page" && await page.locator(".rb-nav-sec.sec-manage.here").count() === 1);
await page.mouse.move(900, 500); await page.waitForTimeout(350);
ok("메뉴를 누른 뒤에도 마우스를 떼면 접힘(호버 때만 펼침)", (await navW()) < 90, String(await navW()));
await page.hover(".rb-nav"); await page.waitForTimeout(300);
await page.locator(".rb-nav-sec.sec-manage").click(); await page.waitForTimeout(300);
ok("지금 섹션은 눌러도 펼친 채", (await page.locator(".rb-nav-sec.sec-manage").getAttribute("aria-expanded")) === "true");
// 다른 탭으로 가면 그 탭이 든 섹션만 펼침(손으로 펼친 기억 섹션은 닫힘)
await page.hover(".rb-nav"); await page.locator(".rb-nav-sec.sec-memory").click(); await page.waitForTimeout(250);
await page.evaluate(() => window.__app.ctx.go("tools")); await page.waitForTimeout(500);
ok("다른 탭(도구)으로 가면 그 섹션(작업실)만 펼침", await page.evaluate(() => [...document.querySelectorAll(".rb-nav-sec[aria-expanded=true]")].map((b) => b.dataset.section).join(",")) === "work");
await page.evaluate(() => window.__app.ctx.go("modules")); await page.waitForTimeout(500);
ok("접힌 섹션 메뉴도 남아 있음(기억 → 코코아 이동 가능)", (await page.locator(".rb-nav a[data-tab=cocoa]").count()) === 1);
await page.locator(".rb-nav .rb-nav-more").click(); await page.waitForTimeout(200);
ok("⋯ 메뉴: 위치 · 늘 펼침 · 변경 기록", await page.locator(".rb-nav .rb-nav-menu").isVisible() && (await page.locator(".rb-nav .rb-nav-menu .rb-layseg button").count()) === 2 && (await page.locator("#rb-nav-pin").count()) === 1);
await page.keyboard.press("Escape"); await page.waitForTimeout(150);
ok("Esc로 닫힘", !(await page.locator(".rb-nav .rb-nav-menu").isVisible()));
await page.locator(".rb-nav .rb-nav-more").click(); await page.locator("#rb-nav-pin").click(); await page.waitForTimeout(400);
await page.mouse.move(900, 500); await page.waitForTimeout(300);
ok("늘 펼침: 마우스 떼도 넓음 + 저장", (await navW()) > 200 && (await ui()).navPinned === true, String(await navW()));
const contentX2 = await page.evaluate(() => Math.round(document.querySelector(".rb-col").getBoundingClientRect().x));
ok("늘 펼침이면 본문이 옆으로", contentX2 > 220, String(contentX2));
await page.locator(".rb-nav .rb-nav-more").click(); await page.locator(".rb-nav .rb-nav-menu .rb-layseg button[data-v=top]").click(); await page.waitForTimeout(400);
ok("메뉴를 위쪽으로 → 사이드바 숨김·위쪽 바 보임", !(await page.locator(".rb-navwrap").isVisible()) && await page.locator(".rb-topnav").isVisible());
ok("위쪽: 홈 + 섹션 알약 3개만 보임(겹치는 분할 버튼 없음)", await page.evaluate(() => [...document.querySelectorAll(".rb-topnav a")].filter((a) => a.offsetParent).length === 4 && !document.querySelector(".rb-topnav > .rb-layseg")));
  await page.locator(".rb-topsec.sec-manage").click(); await page.waitForTimeout(600);
  ok("섹션 알약 → 개요, 알약 표시", (await page.locator(".rb-topsec.sec-manage").getAttribute("aria-current")) === "page");
  await page.evaluate(() => [...document.querySelectorAll(".rb-hubrow")].find((x) => /^모듈/.test(x.textContent.trim()))?.click()); await page.waitForTimeout(600);
  ok("안쪽 화면: 섹션 메뉴 칩 줄 보임", await page.locator(".rb-morenav [data-tab=modules][aria-pressed=true]").isVisible());
  await page.locator(".rb-morenav [data-tab=plugins]").click(); await page.waitForTimeout(600);
  ok("칩으로 이동", (await page.locator(".rb-morenav [data-tab=plugins]").getAttribute("aria-pressed")) === "true");
  await page.locator(".rb-top-more").click(); await page.waitForTimeout(150);
  ok("위쪽 ⋯ 메뉴 열림", await page.locator(".rb-top-menu").isVisible());
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  ok("위쪽 ⋯ 메뉴 Esc로 닫힘(창은 그대로)", !(await page.locator(".rb-top-menu").isVisible()) && await page.locator(".rb-win").isVisible());
  await page.locator(".rb-top-more").click(); await page.locator(".rb-top-menu .rb-layseg button[data-v=left]").click(); await page.waitForTimeout(300);
ok("다시 왼쪽", await page.locator(".rb-navwrap").isVisible());
// 홈으로 오면 펼쳐 둔 섹션이 닫힘
await page.locator(".rb-nav .rb-nav-more").click().catch(() => {}); await page.keyboard.press("Escape");
await page.evaluate(() => window.__app.ctx.go("modules")); await page.waitForTimeout(400);
await page.hover(".rb-nav"); await page.locator(".rb-nav-sec.sec-memory").click(); await page.waitForTimeout(300);
await page.evaluate(() => window.__app.ctx.go("home")); await page.waitForTimeout(500);
ok("홈으로 오면 사이드바 섹션이 모두 닫힘 + 저장", (await page.locator(".rb-nav-sec[aria-expanded=true]").count()) === 0 && ((await ui()).navOpen ?? []).length === 0);
// 기능 찾기: 모든 탭 오른쪽 위
await page.evaluate(() => window.__app.ctx.go("home")); await page.waitForTimeout(400);
ok("홈: 기능 찾기 칸은 가운데(오른쪽 위 머리 줄 없음)", await page.evaluate(() => { const i = document.querySelector("#rb-home-find .rb-search input"); return !!i && !!i.offsetParent && !document.querySelector(".rb-pagehead").offsetParent; }));
for (const tab of ["memory", "cocoa", "tools", "settings"]) {
  await page.evaluate((t) => window.__app.ctx.go(t), tab); await page.waitForTimeout(400);
  const v = await page.evaluate(() => { const i = document.querySelector(".rb-ph-tools .rb-search input"); return i && i.offsetParent ? i.getAttribute("aria-label") : null; });
  ok(`기능 찾기 칸이 오른쪽 위에 보임(${tab})`, v === "기능 찾기", String(v));
}
await page.locator(".rb-ph-tools .rb-search input").fill("테마"); await page.waitForTimeout(500);
ok("다른 탭에서 기능 찾기에 적으면 홈의 기능 찾기 목록으로", await page.evaluate(() => window.__app.ctx.state.tab === "home" && window.__app.ctx.state.search === "테마"));
{ const st = await page.evaluate(() => ({ ff: !!document.querySelector("#rb-ff"), slot: !!document.querySelector("#rb-home-find .rb-search input"), act: document.activeElement?.tagName + "." + document.activeElement?.className })); ok("홈 찾기 결과 위에도 같은 칸(이어서 적기)", st.ff && st.slot && st.act.startsWith("INPUT"), JSON.stringify(st)); }
await page.locator(".rb-search input").fill(""); await page.waitForTimeout(300);
await page.evaluate(() => window.__app.ctx.go("modules")); await page.waitForTimeout(400);
ok("목록 검색이 있는 탭(모듈): 목록 검색 칸 + ? 옆 기능 찾기 단추", (await page.locator(".rb-ph-tools .rb-search input").getAttribute("aria-label")) === "검색" && await page.locator("#rb-find-btn").isVisible());
await page.locator("#rb-find-btn").click(); await page.waitForTimeout(500);
ok("기능 찾기 단추 → 홈 가운데 칸에 포커스", await page.evaluate(() => window.__app.ctx.state.tab === "home" && document.activeElement === document.querySelector("#rb-home-find .rb-search input")));
// 팝업도 유리
page.evaluate(() => window.__app.ctx.confirmAnywhere({ title: "확인", body: "유리 팝업 시험" })); await page.waitForTimeout(300);
const pop = await page.evaluate(() => { const d = document.querySelector(".rb-dialog"); if (!d) return null; const c = getComputedStyle(d); return { bf: c.backdropFilter, bg: c.backgroundColor }; });
ok("대화상자도 유리(블러·반투명)", !!pop && /blur/.test(pop.bf) && /rgba|color\(/.test(pop.bg), JSON.stringify(pop));
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
ok("모바일: 사이드바 없음 · 아래 탭바", !(await page.locator(".rb-navwrap").isVisible()) && await page.locator(".rb-tabbar").isVisible());
await page.evaluate(() => [...document.querySelectorAll(".rb-tabbar a")].find((a) => a.textContent.includes("관리")).click()); await page.waitForTimeout(600);
ok("모바일 탭바: 지금 탭(관리) 아이콘이 섹션 색으로 빛남", await page.evaluate(() => { const a = document.querySelector(".rb-tabbar a.sec-manage"); return a.getAttribute("aria-current") === "page" && getComputedStyle(a.querySelector(".ci")).backgroundImage.includes("gradient"); }));
// 애드온이 늦게 켜져도(관리 애드온) 사이드바 섹션 제목·아이콘이 바로 생김
{
  const p2 = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage(); p2.setDefaultTimeout(5000);
  p2.on("pageerror", (e) => errs.push(e.message));
  await p2.setContent("<!doctype html><body style='margin:0'></body>"); await p2.addScriptTag({ content: r.outputFiles[0].text });
  await p2.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ tourDone: true, tourVer: 99, simpleNoticeDone: true }) }, { coreOnly: true }));
  await p2.waitForTimeout(600);
  const before = await p2.evaluate(() => ({ svc: !!window.__app.ctx.ext.get("svc", "manage"), hidden: document.querySelector(".rb-nav-sec.sec-manage").hidden }));
  await p2.evaluate(() => window.__app.ctx.ext.add("svc", "manage", {})); await p2.waitForTimeout(400);
  ok("애드온이 늦게 켜지면 사이드바·위쪽 섹션이 바로 생김(다시 열지 않아도)", !before.svc && before.hidden && await p2.evaluate(() => !document.querySelector(".rb-nav-sec.sec-manage").hidden && !document.querySelector(".rb-topsec.sec-manage").hidden), JSON.stringify(before));
  await p2.close();
}
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
