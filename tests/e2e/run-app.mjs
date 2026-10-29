// 1.7.0 메뉴 구조 시험 (실제 입력). 클라우드 샌드박스: /opt/npm-tools, /opt/pw-browsers
// SHOTS=폴더 를 주면 화면 사진도 저장한다.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const boot = async (ctx, seed = {}, opts = {}) => {
  const page = await ctx.newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => (page.__errs ??= []).push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  // 처음 둘러보기·새로 바뀐 점 창이 화면을 가리지 않게 '이미 본 버전'으로 시작한다
  await page.evaluate(([s, o]) => window.bootApp({ "rbm:seenVersion:v1": "1.7.0-dev", ...s }, o), [seed, opts]);
  await page.waitForTimeout(250);
  return page;
};
const shot = async (page, name) => { await page.evaluate(() => document.querySelectorAll('.rb-toasts > *').forEach((e) => e.remove())).catch(() => {}); if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const go = async (page, label) => { await page.evaluate((l) => [...document.querySelectorAll(".rb-nav a, .rb-topnav a, .rb-tabbar a")].filter((a) => a.offsetParent).find((a) => a.textContent.trim().startsWith(l)).click(), label); await page.waitForTimeout(250); };
const cur = (page) => page.evaluate(() => [...document.querySelectorAll("[aria-current=page]")].filter((a) => a.offsetParent).map((a) => a.textContent.trim().replace(/\d+$/, "")).join("|"));
const names = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((a) => a.offsetParent).map((a) => a.textContent.trim().replace(/\d+$/, "")), sel);

// ── PC: 왼쪽 사이드바 ──
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await boot(ctx);
  ok("[PC] 첫 화면은 홈, 메뉴는 왼쪽 사이드바", (await cur(page)) === "홈" && (await page.locator(".rb-nav").isVisible()) && !(await page.locator(".rb-topnav").isVisible()));
  const side = await names(page, ".rb-nav a");
  ok("[PC] 사이드바 순서: 홈·기억·리수폿·인물 → 더보기 묶음", side.join("|") === "홈|기억|리수폿|인물|캐릭터|모듈|기억 카드|꾸미기|도구|플러그인|설정", side.join("|"));
  ok("[PC] '더보기' 라벨과 메뉴 위치 분할 버튼이 사이드바에 있음", (await page.locator(".rb-nav .rb-nav-lab").textContent()) === "더보기" && (await page.locator(".rb-nav .rb-layseg button").count()) === 2);
  ok("[PC] 개발 탭은 간단 모드에서 숨김", !side.includes("개발"));
  await shot(page, "pc-1-home");
  await go(page, "리수폿");
  ok("[PC] 리수폿 탭 이동", (await cur(page)) === "리수폿" && (await page.locator(".rb-mem2 .rb-phead h2").textContent()) === "리수폿");
  await shot(page, "pc-2-pot");
  await go(page, "인물");
  ok("[PC] 인물 탭 이동", (await cur(page)) === "인물");
  await go(page, "꾸미기");
  ok("[PC] 꾸미기 탭 → 화면 꾸미기 화면", (await cur(page)) === "꾸미기" && (await page.locator("h2.rb-h2", { hasText: "화면 꾸미기" }).count()) === 1);
  ok("[PC] 메뉴 위치 선택지에 '홈 카드' 없음", !(await page.locator(".rb-opt, .rb-optcards").allTextContents()).join("").includes("홈 카드"));
  await go(page, "설정");
  ok("[PC] 설정에 '화면 모드' 간단/고급, 개발자 모드 카드는 숨김", (await page.locator(".rb-seg[aria-label='화면 모드'] button").allTextContents()).join("|") === "간단|고급" && (await page.locator("#rb-devmode").count()) === 0);
  await shot(page, "pc-3-settings-simple");
  await page.locator(".rb-seg[aria-label='화면 모드'] button", { hasText: "고급" }).click(); await page.waitForTimeout(300);
  ok("[PC] 고급으로 바꾸면 개발자 모드 카드가 보이고 저장됨", (await page.locator("#rb-devmode").count()) === 1 && JSON.parse(await page.evaluate(() => __api.store["rbm:ui:v1"])).uiMode === "advanced");
  await page.locator("#rb-devmode .rb-switch").click(); await page.waitForTimeout(300);
  ok("[PC] 개발자 모드를 켜면 사이드바에 개발 탭", (await names(page, ".rb-nav a")).includes("개발"));
  await shot(page, "pc-4-settings-advanced-dev");
  await page.locator(".rb-seg[aria-label='화면 모드'] button", { hasText: "간단" }).click(); await page.waitForTimeout(300);
  ok("[PC] 간단으로 돌아가면 개발 탭·개발자 모드 꺼짐", !(await names(page, ".rb-nav a")).includes("개발") && JSON.parse(await page.evaluate(() => __api.store["rbm:ui:v1"])).devMode === false);
  // 위쪽 바로 전환
  await page.locator(".rb-nav .rb-layseg button[data-v=top]").click(); await page.waitForTimeout(250);
  ok("[PC] 위쪽 메뉴로 전환: 위쪽 바 보이고 사이드바 숨김, 저장됨", (await page.locator(".rb-topnav").isVisible()) && !(await page.locator(".rb-nav").isVisible()) && JSON.parse(await page.evaluate(() => __api.store["rbm:ui:v1"])).theme.layout === "top");
  const top = await names(page, ".rb-topnav a");
  ok("[PC] 위쪽 바 순서 같음 + 오른쪽에 분할 버튼", top.join("|") === "홈|기억|리수폿|인물|캐릭터|모듈|기억 카드|꾸미기|도구|플러그인|설정" && (await page.locator(".rb-topnav .rb-layseg button[aria-pressed=true]").textContent()).includes("위쪽"), top.join("|"));
  await go(page, "홈"); await shot(page, "pc-5-topbar-home");
  await page.locator(".rb-topnav .rb-layseg button[data-v=left]").click(); await page.waitForTimeout(200);
  ok("[PC] 다시 왼쪽으로", await page.locator(".rb-nav").isVisible());
  ok("[PC] 오류 없음", !(page.__errs?.length) && !(await page.evaluate(() => __errors.length)), (page.__errs ?? []).join(";"));
  await ctx.close(); }
// ── PC: 예전 저장값 layout:"home" · devMode 켠 사람 ──
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await boot(ctx, { "rbm:ui:v1": JSON.stringify({ devMode: true, theme: { layout: "home" } }) });
  ok("[마이그레이션] layout home → 왼쪽 사이드바, devMode 사용자는 고급 모드(개발 탭 유지)", (await page.locator(".rb-nav").isVisible()) && (await names(page, ".rb-nav a")).includes("개발"));
  await ctx.close(); }
// ── 모바일: 아래 탭바 + 더보기 칩 줄 ──
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  const page = await boot(ctx);
  ok("[모바일] 탭바: 홈·기억·리수폿·인물·더보기", (await names(page, ".rb-tabbar a")).join("|") === "홈|기억|리수폿|인물|더보기", (await names(page, ".rb-tabbar a")).join("|"));
  ok("[모바일] 사이드바·위쪽 바 숨김, 더보기 칩 줄은 홈에서 안 보임", !(await page.locator(".rb-nav").isVisible()) && !(await page.locator(".rb-topnav").isVisible()) && !(await page.locator(".rb-morenav").isVisible()));
  await shot(page, "m-1-home");
  await go(page, "리수폿"); await shot(page, "m-2-pot");
  await go(page, "더보기");
  ok("[모바일] 더보기 → 첫 칸(캐릭터) + 칩 줄 보임, 탭바 '더보기' 강조", (await page.locator(".rb-morenav").isVisible()) && (await names(page, ".rb-morenav .rb-chip")).join("|") === "캐릭터|모듈|기억 카드|꾸미기|도구|플러그인|설정" && (await cur(page)).includes("더보기"), await cur(page));
  ok("[모바일] 머리 경로: 홈 › 더보기 › 캐릭터", (await page.locator(".rb-crumb").textContent()).replace(/\s/g, "") === "홈더보기캐릭터", await page.locator(".rb-crumb").textContent());
  await shot(page, "m-3-more-characters");
  await page.locator(".rb-morenav .rb-chip", { hasText: "설정" }).click(); await page.waitForTimeout(250);
  ok("[모바일] 칩으로 설정 이동, 눌린 칩 표시", (await page.locator(".rb-morenav .rb-chip[aria-pressed=true]").textContent()) === "설정" && (await page.locator(".rb-seg[aria-label='화면 모드']").count()) === 1);
  await shot(page, "m-4-more-settings");
  await go(page, "기억");
  ok("[모바일] 기억 탭으로 돌아가면 칩 줄 사라짐", !(await page.locator(".rb-morenav").isVisible()));
  await go(page, "더보기");
  ok("[모바일] 더보기를 다시 누르면 마지막에 보던 화면(설정)", (await page.locator(".rb-morenav .rb-chip[aria-pressed=true]").textContent()) === "설정");
  ok("[모바일] 가로로 안 넘침", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  ok("[모바일] 오류 없음", !(page.__errs?.length) && !(await page.evaluate(() => __errors.length)), (page.__errs ?? []).join(";"));
  await ctx.close(); }
// ── 기억 탭(실제 저장소 연결): 2단계 데이터 변경 뒤에도 기존 화면이 그대로 그려지는지 ──
for (const [tag, vp, extra] of [["PC", { width: 1280, height: 800 }, {}], ["모바일", { width: 390, height: 800 }, { hasTouch: true, isMobile: true }]]) {
  const ctx = await browser.newContext({ viewport: vp, ...extra });
  const page = await boot(ctx, {}, { memory: true });
  await go(page, "기억"); await page.waitForTimeout(500);
  ok(`[${tag}] 기억 탭이 오류 없이 그려짐(스위치·상태 카드)`, (await page.locator(".rb-mem2").count()) === 1 && (await page.locator(".rb-mem2 .rb-switch").count()) >= 1 && !(page.__errs?.length), (page.__errs ?? []).join(";"));
  await shot(page, `${tag === "PC" ? "pc" : "m"}-6-memory`);
  await ctx.close();
}
// ── 3단계: 기억 화면(간단: 스위치 1·동작 3 이하) · 고급 · 기록 보기 · 봇별 기억 ──
for (const [tag, vp, extra] of [["PC", { width: 1280, height: 860 }, {}], ["모바일", { width: 390, height: 844 }, { hasTouch: true, isMobile: true }]]) {
  const t = tag === "PC" ? "pc" : "m";
  const ctx = await browser.newContext({ viewport: vp, ...extra });
  const page = await boot(ctx, {}, { memory: true, story: true });
  await go(page, "기억"); await page.waitForTimeout(600);
  const sw = await page.locator(".rb-mem2 .rb-switch").count(), acts = await page.locator(".rb-mem2 .rb-actions .rb-btn").count();
  ok(`[3단계 ${tag}] 간단 모드: 스위치 1개·주요 동작 3개 이하`, sw === 1 && acts >= 1 && acts <= 3, `switch ${sw}, actions ${acts}`);
  ok(`[3단계 ${tag}] 상태 카드·기록 막대(4칸)·최근 기록`, (await page.locator(".rb-mem2 .rb-status.k-on").count()) === 1 && (await page.locator(".rb-mbar i").count()) >= 3 && (await page.locator(".rb-mem-recent .rb-mem-rec").count()) === 3);
  ok(`[3단계 ${tag}] 상태 줄에 '기억 3건을 넣었어요'`, (await page.locator(".rb-mem2 .rb-status").textContent()).includes("기억 3건을 넣었어요"));
  ok(`[3단계 ${tag}] 간단 모드에서는 고급 영역 대신 '고급 모드에서 더 보기' 링크`, (await page.locator(".rb-mem2 .rb-adv").count()) === 0 && (await page.locator("#rb-adv-memory").count()) === 1);
  ok(`[3단계 ${tag}] 미처리 분석 버튼에 개수 표시`, /미처리 \d+개/.test(await page.locator(".rb-mem2 .rb-actions .rb-btn").first().textContent()));
  await shot(page, `s3-${t}-1-memory-simple`);
  await page.locator(".rb-mem2 .rb-phead .rb-switch").click(); await page.waitForTimeout(400);
  ok(`[3단계 ${tag}] 스위치를 끄면 이 봇만 꺼짐 + 상태 카드 꺼짐`, (await page.locator(".rb-mem2 .rb-status.k-off").count()) === 1 && (await page.evaluate(() => __app.ctx.memory.store.getIndex().then((i) => i.bots.c1?.on))) === false);
  await shot(page, `s3-${t}-2-memory-off`);
  await page.locator(".rb-mem2 .rb-phead .rb-switch").click(); await page.waitForTimeout(400);
  ok(`[3단계 ${tag}] 다시 켜면 사용 중`, (await page.locator(".rb-mem2 .rb-status.k-on, .rb-mem2 .rb-status.k-prep").count()) === 1 && (await page.evaluate(() => __app.ctx.memory.store.getIndex().then((i) => i.bots.c1?.on))) === true);
  // 기록 보기
  await page.locator(".rb-mem-rechead .rb-btn", { hasText: "전체 보기" }).click(); await page.waitForTimeout(700);
  ok(`[3단계 ${tag}] 기록 보기: 칩 5개 + ← 기억으로`, (await page.locator(".rb-mem-navtabs .rb-chip").allTextContents()).join("|") === "인물 위키|상황|시간선|열린 항목|관계" && (await page.locator(".rb-mem2-head .rb-btn", { hasText: "기억으로" }).count()) === 1);
  await shot(page, `s3-${t}-3-detail`);
  await page.locator(".rb-mem2-head .rb-btn", { hasText: "기억으로" }).click(); await page.waitForTimeout(500);
  // 봇별 기억
  await page.locator(".rb-mem2 .rb-actions .rb-btn", { hasText: "다른 채팅 보기" }).click(); await page.waitForTimeout(500);
  ok(`[3단계 ${tag}] 봇별 기억: 봇마다 스위치·지금 채팅 배지`, (await page.locator(".rb-mbot").count()) === 2 && (await page.locator(".rb-mbot .rb-switch").count()) === 2 && (await page.locator(".rb-mbot .rb-badge", { hasText: "지금 채팅" }).count()) === 1);
  await page.locator(".rb-mbot .rb-switch").nth(1).click(); await page.waitForTimeout(300);
  ok(`[3단계 ${tag}] 봇별 스위치가 그 봇만 바꿈`, (await page.evaluate(() => __app.ctx.memory.store.getIndex().then((i) => [i.bots.c2?.on, i.bots.c1?.on]))).join() === "false,true");
  await shot(page, `s3-${t}-4-bots`);
  // 고급
  await page.locator(".rb-mem2-head .rb-btn", { hasText: "기억으로" }).click(); await page.waitForTimeout(400);
  await go(page, tag === "PC" ? "설정" : "더보기"); 
  if (tag !== "PC") await page.locator(".rb-morenav .rb-chip", { hasText: "설정" }).click();
  await page.waitForTimeout(300);
  await page.locator(".rb-seg[aria-label='화면 모드'] button", { hasText: "고급" }).click(); await page.waitForTimeout(300);
  await go(page, "기억"); await page.waitForTimeout(700);
  ok(`[3단계 ${tag}] 고급 모드: 고급 영역에 저장 위치·자동 기록 시점·분석 모델·위험 구역`, (await page.locator(".rb-mem2 .rb-adv").count()) === 1 && (await page.locator(".rb-mem2 .rb-adv").textContent()).match(/자동 기록 시점/) && (await page.locator(".rb-mem2 .rb-adv").textContent()).includes("위험 구역") && (await page.locator(".rb-mem2 .rb-mem-modebar").count()) === 1);
  ok(`[3단계 ${tag}] 가로로 안 넘침·오류 없음`, (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) && !(page.__errs?.length), (page.__errs ?? []).join(";"));
  await shot(page, `s3-${t}-5-memory-advanced`);
  await ctx.close();
}
// ── 4단계: 리수폿 화면(간단: 스위치 1·동작 3·캐릭터별 사용) · 인물 화면·상세 · 변경 비교 ──
for (const [tag, vp, extra] of [["PC", { width: 1280, height: 860 }, {}], ["모바일", { width: 390, height: 844 }, { hasTouch: true, isMobile: true }]]) {
  const t = tag === "PC" ? "pc" : "m";
  const ctx = await browser.newContext({ viewport: vp, ...extra });
  const page = await boot(ctx, {}, { memory: true, story: true });
  await page.evaluate(() => __app.ctx.memory.switches.setPot("c1", true)); // 리수폿 켜 두기
  await go(page, "리수폿"); await page.waitForTimeout(700);
  const body = ".rb-mem2[data-page=pot]";
  ok(`[4단계 ${tag}] 리수폿: 머리 스위치 1개 + 주요 동작 3개`, (await page.locator(`${body} .rb-phead .rb-switch`).count()) === 1 && (await page.locator(`${body} .rb-actions .rb-btn`).count()) === 3);
  ok(`[4단계 ${tag}] 리수폿: 버튼 6개 이하(위키 버튼 33 → 6)`, (await page.locator(`${body} .rb-btn, ${body} button.rb-btn`).count()) <= 6, String(await page.locator(`${body} .rb-btn`).count()));
  ok(`[4단계 ${tag}] 리수폿: 상태 카드에 위키 문서 2개`, (await page.locator(`${body} .rb-status`).textContent()).includes("위키 문서 2개"));
  ok(`[4단계 ${tag}] 리수폿: 캐릭터별 사용 2명`, (await page.locator(`${body} .rb-pot-charrow`).count()) === 2);
  await shot(page, `s4-${t}-1-pot-simple`);
  await page.locator(`${body} .rb-pot-charrow .rb-switch`).first().click(); await page.waitForTimeout(300);
  ok(`[4단계 ${tag}] 캐릭터별 스위치가 그 인물만 끔`, (await page.evaluate(() => __app.ctx.memory.store.getIndex().then((i) => Object.values(i.potChars ?? {}).flatMap((x) => x.off ?? []).length))) === 1);
  await page.locator(`${body} .rb-phead .rb-switch`).click(); await page.waitForTimeout(400);
  ok(`[4단계 ${tag}] 리수폿 스위치를 끄면 이 봇만 꺼짐 · 기억은 그대로`, (await page.evaluate(() => __app.ctx.memory.store.getIndex().then((i) => [i.potBots?.c1, i.bots?.c1?.on !== false]))).join() === "false,true" && (await page.locator(`${body} .rb-status.k-off`).count()) === 1);
  await shot(page, `s4-${t}-2-pot-off`);
  await page.locator(`${body} .rb-phead .rb-switch`).click(); await page.waitForTimeout(400);
  // 인물
  await go(page, "인물"); await page.waitForTimeout(900);
  const ppl = ".rb-mem2[data-page=people]";
  ok(`[4단계 ${tag}] 인물: 카드 2장 + 수치 비어 있음 배지 + 충돌 알림`, (await page.locator(`${ppl} .rb-pcard`).count()) === 2 && (await page.locator(`${ppl} .rb-pcard .rb-badge`, { hasText: "수치 비어 있음" }).count()) >= 1 && (await page.locator(`${ppl} .rb-conflict`).count()) === 1);
  ok(`[4단계 ${tag}] 인물: 간단 모드 버튼 6개 이하`, (await page.locator(`${ppl} .rb-btn`).count()) <= 6, String(await page.locator(`${ppl} .rb-btn`).count()));
  await shot(page, `s4-${t}-3-people`);
  if (tag === "모바일") { await page.locator(`${ppl} .rb-pcard`).first().click(); await page.waitForTimeout(500); }
  ok(`[4단계 ${tag}] 인물 상세: 지금 상태·요약·성격 칩·고정하기/기록 쉬기`, (await page.locator(".rb-pdetail .rb-mem-meter").count()) >= 1 && (await page.locator(".rb-pdetail").textContent()).includes("차분하고 성실한") && (await page.locator(".rb-pdetail .rb-chip").count()) === 3 && (await page.locator(".rb-pdetail .rb-btn", { hasText: "고정하기" }).count()) === 1 && (await page.locator(".rb-pdetail .rb-btn", { hasText: "기록 쉬기" }).count()) === 1);
  await shot(page, `s4-${t}-4-person-detail`);
  if (tag === "모바일") { await page.locator(".rb-pdetail .rb-btn", { hasText: "← 인물" }).click(); await page.waitForTimeout(500); }
  // 변경 비교
  await page.locator(`${ppl} .rb-conflict .rb-btn`, { hasText: "변경 비교" }).click(); await page.waitForTimeout(400);
  ok(`[4단계 ${tag}] 변경 비교: 원래·AI가 바꿈·지금 + 내가 고친 줄 표시`, (await page.locator(".rb-dialog").textContent()).includes("AI가 바꿈") && (await page.locator(".rb-dialog").textContent()).includes("내가 고친 줄") && (await page.locator(".rb-dialog .rb-mem-pre").allTextContents()).join("|").includes("62"));
  await shot(page, `s4-${t}-5-compare`);
  await page.locator(".rb-dialog button", { hasText: "그대로 두기" }).click(); await page.waitForTimeout(700);
  ok(`[4단계 ${tag}] 그대로 두기: 충돌 알림 사라짐`, (await page.locator(`${ppl} .rb-conflict`).count()) === 0);
  ok(`[4단계 ${tag}] 가로로 안 넘침·오류 없음`, (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) && !(page.__errs?.length), (page.__errs ?? []).join(";"));
  await ctx.close();
}
// ── 장기기억 방식 카드: 간단=숨김+자동, 고급=선택기만(리수폿 스위치 없음) ──
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await boot(ctx, {}, { memory: true });
  await page.evaluate(() => __app.ctx.memory.store.updateIndex((i) => { i.settings.backend = "bardwiki"; }));
  await go(page, "기억"); await page.waitForTimeout(500);
  ok("[방식] 간단 모드: 장기기억 방식 카드 숨김, 저장소 자동으로 되돌림", (await page.locator(".rb-mem-modebar").count()) === 0 && (await page.evaluate(() => __app.ctx.memory.store.getIndex().then((i) => i.settings.backend))) === "auto");
  await shot(page, "pc-7-memory-simple");
  await go(page, "설정");
  await page.locator(".rb-seg[aria-label='화면 모드'] button", { hasText: "고급" }).click(); await page.waitForTimeout(300);
  await go(page, "기억"); await page.waitForTimeout(500);
  ok("[방식] 고급 모드: 선택기 4개만, 리수폿 기능 줄 없음", (await page.locator(".rb-mem-modebar .rb-seg button").allTextContents()).join("|") === "자동|플러그인|BardWiki|끔" && !(await page.locator(".rb-mem-modebar").textContent()).includes("리수폿") && (await page.locator(".rb-mem-modebar .rb-switch").count()) === 0);
  await shot(page, "pc-8-memory-advanced");
  await ctx.close(); }
// ── 처음 설치 + 리스바드 감지: 한 번만 묻는다 ──
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await boot(ctx, { __bard: 1, "rbm:seenVersion:v1": undefined }, { memory: true, fresh: true });
  await page.waitForTimeout(500);
  const dlg = page.locator(".rb-modal", { hasText: "리스바드가 감지됐어요" });
  ok("[리스바드] 처음 설치 시 물어봄", (await dlg.count()) === 1);
  await shot(page, "pc-9-bard-ask");
  await dlg.locator("button", { hasText: "플러그인으로 바꾸기" }).click(); await page.waitForTimeout(400);
  const st = await page.evaluate(() => __app.ctx.memory.store.getIndex().then((i) => [i.settings.backend, i.bardAsked]));
  ok("[리스바드] 예 → 플러그인 저장소 + 다시 묻지 않음 표시", st[0] === "local" && st[1] === true, st.join());
  ok("[리스바드] 오류 없음", !(page.__errs?.length), (page.__errs ?? []).join(";"));
  await ctx.close(); }
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
