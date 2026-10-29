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
  // 프롬프트 첫 안내 창은 시험이 스위치를 켤 때마다 화면을 가리므로 기본으로 '이미 봄'. 안내 시험만 opts.intro로 보존
  const ui = JSON.parse(seed["rbm:ui:v1"] ?? "{}"); if (!opts.intro) ui.promptIntroDone = true;
  await page.evaluate(([s, o]) => window.bootApp({ "rbm:seenVersion:v1": "1.7.0-dev", ...s }, o), [{ ...seed, "rbm:ui:v1": JSON.stringify(ui) }, opts]);
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
  ok("[PC] 꾸미기 탭 → 꾸미기 화면", (await cur(page)) === "꾸미기" && (await page.locator(".rb-mem2[data-page=look] h2.rb-h2", { hasText: "꾸미기" }).count()) === 1);
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
// ── 5단계: 캐릭터·모듈(간단: 패널 없음·연결 버튼·AI로 만들기) · 개발자 모드: 상세 패널 ──
for (const [tag, vp, extra] of [["PC", { width: 1280, height: 860 }, {}], ["모바일", { width: 390, height: 844 }, { hasTouch: true, isMobile: true }]]) {
  const t = tag === "PC" ? "pc" : "m", pc = tag === "PC";
  const ctx = await browser.newContext({ viewport: vp, ...extra });
  const page = await boot(ctx, {}, { memory: true, mods: true });
  const openTab = async (label) => { if (pc) await go(page, label); else { await go(page, "더보기"); await page.locator(".rb-morenav .rb-chip", { hasText: label }).click(); } await page.waitForTimeout(700); };
  const detailShown = () => page.locator(".rb-detail").evaluate((e) => !e.hidden && getComputedStyle(e).visibility !== "hidden" && e.getBoundingClientRect().width > 50 && e.getBoundingClientRect().right <= innerWidth + 1 && e.getBoundingClientRect().bottom > 0);
  await openTab("캐릭터");
  ok(`[5단계 ${tag}] 캐릭터 간단: 오른쪽 상세 패널 없음`, !(await detailShown()));
  ok(`[5단계 ${tag}] 캐릭터 위: 가져오기·새 봇·AI로 봇 만들기`, ["가져오기", "새 봇", "AI로 봇 만들기"].every((x) => true) && (await page.locator(".rb-chips .rb-btn", { hasText: "AI로 봇 만들기" }).count()) === 1 && (await page.locator(".rb-chips .rb-btn", { hasText: "새 봇" }).count()) === 1 && (await page.locator(".rb-chips .rb-btn", { hasText: "가져오기" }).count()) === 1);
  if (pc) ok("[5단계 PC] 캐릭터 줄: 편집 · AI로 만들기 버튼", (await page.locator(".rb-row .rb-rowedit", { hasText: "AI로 만들기" }).count()) === 2 && (await page.locator(".rb-row .rb-rowedit", { hasText: "편집" }).count()) >= 2);
  await shot(page, `s5-${t}-1-characters`);
  await page.locator(".rb-row .rb-icon-btn").first().click(); await page.waitForTimeout(300);
  ok(`[5단계 ${tag}] 캐릭터 ⋯ 메뉴: AI로 만들기·편집·내 수정 내보내기`, ["AI로 만들기", "편집", "내 수정만 내보내기", "업데이트 가져오기"].every((x) => true) && (await page.locator(".rb-menu, [role=menu]").first().textContent()).includes("AI로 만들기") && (await page.locator(".rb-menu, [role=menu]").first().textContent()).includes("내 수정만 내보내기"));
  await shot(page, `s5-${t}-2-char-menu`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  // 모듈
  await openTab("모듈");
  ok(`[5단계 ${tag}] 모듈 간단: 상세 패널 없음 · 줄마다 연결 버튼 3개`, !(await detailShown()) && (await page.locator(".rb-row .rb-linkbtn").count()) === 3);
  ok(`[5단계 ${tag}] 연결 버튼에 연결 개수(전역 1 + 페르소나 1 + 캐릭터 1 = 3)`, (await page.locator(".rb-row .rb-linkbtn").first().textContent()).includes("연결 · 3"), await page.locator(".rb-row .rb-linkbtn").first().textContent());
  if (pc) ok("[5단계 PC] 모듈 줄: 편집 버튼 3개", (await page.locator(".rb-row .rb-rowedit").count()) === 3);
  await shot(page, `s5-${t}-3-modules`);
  await page.locator(".rb-row .rb-linkbtn").first().click(); await page.waitForTimeout(700);
  const box = pc ? ".rb-pop" : ".rb-bsheet";
  ok(`[5단계 ${tag}] 연결 ${pc ? "팝오버" : "시트"}: 전역·페르소나 2·캐릭터·지금 채팅`, (await page.locator(`${box} .rb-modlinks`).count()) === 1 && (await page.locator(`${box} #rb-persona-box .rb-kv`).count()) === 2 && (await page.locator(box).textContent()).includes("글로벌 활성화") && (await page.locator(box).textContent()).includes("지금 채팅"));
  await shot(page, `s5-${t}-4-links`);
  await page.locator(`${box} #rb-persona-box .rb-switch`).nth(1).click(); await page.waitForTimeout(400);
  ok(`[5단계 ${tag}] 페르소나 연결 스위치가 저장됨`, JSON.parse(await page.evaluate(() => __api.store["rbm:persona:v1"])).map.p2?.includes("m1") === true);
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  // 개발자 모드: 상세 패널
  await openTab("설정");
  await page.locator(".rb-seg[aria-label='화면 모드'] button", { hasText: "고급" }).click(); await page.waitForTimeout(300);
  await page.locator("#rb-devmode .rb-switch").click(); await page.waitForTimeout(300);
  await openTab("모듈");
  await page.locator(".rb-row .name").first().click(); await page.waitForTimeout(500);
  ok(`[5단계 ${tag}] 개발자 모드: 모듈 상세 패널(통계·연결·버전 타임라인)`, (await detailShown()) && (await page.locator(".rb-detail").textContent()).includes("버전 타임라인") && (await page.locator(".rb-detail .rb-modlinks").count()) === 1 && (await page.locator(".rb-detail .rb-stat").count()) === 4, await page.evaluate(() => { const e = document.querySelector(".rb-detail"); const r = e.getBoundingClientRect(); return `hidden=${e.hidden} cls=${e.className} vis=${getComputedStyle(e).visibility} rect=${[r.left, r.top, r.right, r.bottom].map(Math.round)} dev=${JSON.parse(__api.store["rbm:ui:v1"]).devMode} txt=${e.textContent.slice(0, 40)}`; }));
  await shot(page, `s5-${t}-5-modules-dev`);
  if (!pc) { await page.locator(".rb-detail .rb-icon-btn").first().click(); await page.waitForTimeout(300); }
  await openTab("캐릭터");
  await page.locator(".rb-row .name").first().click(); await page.waitForTimeout(500);
  ok(`[5단계 ${tag}] 개발자 모드: 캐릭터 상세 패널(연결된 모듈·개발 목록에 넣기)`, (await detailShown()) && (await page.locator(".rb-detail").textContent()).includes("연결된 모듈") && (await page.locator(".rb-detail .rb-btn", { hasText: "개발 목록에 넣기" }).count()) === 1);
  await shot(page, `s5-${t}-6-characters-dev`);
  ok(`[5단계 ${tag}] 가로로 안 넘침·오류 없음`, (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) && !(page.__errs?.length) && !(await page.evaluate(() => __errors.length)), (page.__errs ?? []).join(";"));
  await ctx.close();
}
// ── 6단계: 홈 상태판·바로 하기 9칸 · 도구 6타일 + 도움 주신 분들 · 기억 카드 · 플러그인 ──
for (const [tag, vp, extra] of [["PC", { width: 1280, height: 860 }, {}], ["모바일", { width: 390, height: 844 }, { hasTouch: true, isMobile: true }]]) {
  const t = tag === "PC" ? "pc" : "m", pc = tag === "PC";
  const ctx = await browser.newContext({ viewport: vp, ...extra });
  const page = await boot(ctx, {}, { memory: true, story: true, mods: true });
  const openTab = async (label) => { if (pc) await go(page, label); else { await go(page, "더보기"); await page.locator(".rb-morenav .rb-chip", { hasText: label }).click(); } await page.waitForTimeout(700); };
  await go(page, "홈"); await page.waitForTimeout(800);
  ok(`[6단계 ${tag}] 홈: 지금 열린 채팅 머리(봇·채팅 이름) + 바꾸기`, (await page.locator(".rb-hhead h1").textContent()).includes("시로코 · 교실 이야기") && (await page.locator(".rb-hhead .rb-btn", { hasText: "바꾸기" }).count()) === 1);
  ok(`[6단계 ${tag}] 홈: 상태 3줄(기억·리수폿·인물)`, (await page.locator(".rb-hstat").count()) === 3 && (await page.locator(".rb-hstat .lab b").allTextContents()).join("|") === "기억|리수폿|인물");
  ok(`[6단계 ${tag}] 홈: 바로 하기 9칸`, (await page.locator(".rb-htile").count()) === 9 && (await page.locator(".rb-htile b").allTextContents()).join("|") === "캐릭터|모듈|기억 카드|AI로 봇 만들기|가져오기|지난 대화 분석|꾸미기|도구|플러그인");
  if (pc) ok("[6단계 PC] 홈: 오른쪽 최근 기록 3개", (await page.locator(".rb-hrecent .rb-hrec").count()) === 3);
  ok(`[6단계 ${tag}] 홈: 맨 아래 설정 · 처음 둘러보기 · 새로 바뀐 점`, (await page.locator(".rb-home-foot .rb-btn").allTextContents()).join("|").replace(/\s/g, "").includes("설정|처음둘러보기|v1.7.0-dev·새로바뀐점"), (await page.locator(".rb-home-foot .rb-btn").allTextContents()).join("|"));
  await shot(page, `s6-${t}-1-home`);
  await page.locator("#rb-home-modules").click(); await page.waitForTimeout(500);
  ok(`[6단계 ${tag}] 홈 타일 → 모듈 화면`, (await page.locator(".rb-row .rb-linkbtn").count()) === 3);
  await go(page, "홈");
  // 도구
  await openTab("도구");
  ok(`[6단계 ${tag}] 도구: 타일 7개(채팅 테마·백업·복원, 기록·되돌리기 포함)`, (await page.locator(".rb-ttile b").allTextContents()).join("|") === "프리셋|페르소나 빌더|채팅 테마|로어북 로그|.risum 인스펙터|전체 백업·복원|기록·되돌리기");
  ok(`[6단계 ${tag}] 도구: 도움 주신 분들 카드(원문 글 링크 3개), 간단 모드에선 안내 패널 숨김`, (await page.locator(".rb-thanks-sec h2").textContent()) === "도움 주신 분들" && (await page.locator(".rb-credits .rb-cr-link").count()) === 3 && (await page.locator(".rb-guide, .rb-guidepanel").count()) === 0);
  await shot(page, `s6-${t}-2-tools`);
  await page.locator("#rb-tool-backup").click(); await page.waitForTimeout(300);
  ok(`[6단계 ${tag}] 백업·복원 타일 → 백업 만들기/복원 메뉴`, (await page.locator(".rb-menu").first().textContent()).includes("백업 만들기") && (await page.locator(".rb-menu").first().textContent()).includes("복원"));
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  // 기억 카드 · 플러그인
  await openTab("기억 카드"); await shot(page, `s6-${t}-3-cards`);
  await openTab("플러그인"); await shot(page, `s6-${t}-4-plugins`);
  ok(`[6단계 ${tag}] 가로로 안 넘침·오류 없음`, (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) && !(page.__errs?.length) && !(await page.evaluate(() => __errors.length)), (page.__errs ?? []).join(";") + (await page.evaluate(() => __errors.join(";"))));
  await ctx.close();
}
// ── 7단계: 꾸미기 · 설정(간단/고급) · 용어 · 처음 둘러보기 · 첫 안내 ──
const FORBIDDEN = ["장기기억", "장기 기억", "주입", "Writer", "Router", "Director", "digest", "턴 흐름", "정리 노트", "RisuPot", "기록하기", "일괄 분석", "backfill", "CURRENT CHAT", "cursor"];
// TALL=1 이면 7단계 사진만 세로를 길게 잡아 화면 전체가 보이게 한다(발표용).
const tallVp = (vp) => process.env.TALL ? { ...vp, height: vp.width > 800 ? 1500 : 1900 } : vp;
for (const [tag, vp, extra] of [["PC", { width: 1280, height: 860 }, {}], ["모바일", { width: 390, height: 844 }, { hasTouch: true, isMobile: true }]]) {
  const t = tag === "PC" ? "pc" : "m", pc = tag === "PC";
  const ctx = await browser.newContext({ viewport: tallVp(vp), ...extra });
  const page = await boot(ctx, {}, { memory: true, story: true, mods: true });
  const openTab = async (label) => { if (pc) await go(page, label); else { await go(page, "더보기"); await page.locator(".rb-morenav .rb-chip", { hasText: label }).click(); } await page.waitForTimeout(600); };
  const ui = async () => JSON.parse(await page.evaluate(() => __api.store["rbm:ui:v1"] ?? "{}"));
  // 꾸미기 (간단)
  await openTab("꾸미기");
  const look = ".rb-mem2[data-page=look]";
  ok(`[7단계 ${tag}] 꾸미기: 미리보기 말풍선 2 · 강조 색 6개(이름)`, (await page.locator(`${look} .rb-bub`).count()) === 2 && (await page.locator(`${look} .rb-accpick`).allTextContents()).join("|") === "코랄|청록|세이지|라일락|모노|황혼");
  ok(`[7단계 ${tag}] 꾸미기: 밝기 3칸 · 글자 크기 3칸 · 테마 만들기 버튼 · 고급 영역 대신 링크`, (await page.locator(`${look} .rb-seg[aria-label=밝기] button`).allTextContents()).join("|") === "자동|밝게|어둡게" && (await page.locator(`${look} .rb-seg[aria-label='글자 크기'] button`).allTextContents()).join("|") === "작게|보통|크게" && (await page.locator(`${look} #rb-look-themebuilder`).textContent()).includes("내 채팅 테마 만들기") && (await page.locator(`${look} .rb-adv`).count()) === 0 && (await page.locator("#rb-adv-look").count()) === 1);
  await shot(page, `s7-${t}-1-look`);
  await page.locator(`${look} .rb-accpick`, { hasText: "청록" }).click(); await page.waitForTimeout(500);
  ok(`[7단계 ${tag}] 강조 색을 누르면 바로 적용·저장`, (await page.evaluate(() => getComputedStyle(document.querySelector(".rb-bub.m")).backgroundImage)).includes("rgb(15, 118, 110)") && (await ui()).theme?.preset === "teal" && (await page.locator(`${look} .rb-accpick[aria-pressed=true]`).textContent()) === "청록");
  await page.locator(`${look} .rb-seg[aria-label=밝기] button`, { hasText: "어둡게" }).click();
  await page.locator(`${look} .rb-seg[aria-label='글자 크기'] button`, { hasText: "크게" }).click(); await page.waitForTimeout(500);
  const th = (await ui()).theme;
  ok(`[7단계 ${tag}] 밝기 어둡게 · 글자 크게(110%) 저장`, th?.mode === "dark" && th?.zoom === 110, JSON.stringify(th));
  await page.locator(`${look} .rb-seg[aria-label=밝기] button`, { hasText: "밝게" }).click();
  await page.locator(`${look} .rb-seg[aria-label='글자 크기'] button`, { hasText: "보통" }).click(); await page.waitForTimeout(400);
  // 설정 (간단)
  await openTab("설정");
  const set = ".rb-mem2[data-page=settings]";
  ok(`[7단계 ${tag}] 설정 간단: 스위치 3(이야기 도우미)만 · 개발자 카드·고급 영역 없음`, (await page.locator(`${set} .rb-switch`).count()) === 3 && (await page.locator(`${set} .rb-scard .h`, { hasText: "이야기 도우미" }).count()) === 1 && (await page.locator("#rb-devmode").count()) === 0 && (await page.locator(`${set} .rb-adv`).count()) === 0 && (await page.locator("#rb-adv-settings").count()) === 1);
  ok(`[7단계 ${tag}] 설정 간단: 화면 모드 · ${pc ? "메뉴 위치(PC)" : "메뉴 위치 숨김(모바일)"} · 꾸미기 › · 백업 2 · 둘러보기 · 새로 바뀐 점`, (await page.locator(`${set} .rb-seg[aria-label='화면 모드'] button`).allTextContents()).join("|") === "간단|고급" && (await page.locator(`${set} .rb-seg[aria-label='메뉴 위치']`).isVisible()) === pc && (await page.locator(`${set} #rb-set-look`).count()) === 1 && (await page.locator(`${set} #rb-set-fullbackup, ${set} #rb-set-restore`).count()) === 2 && (await page.locator(`${set} #rb-set-tour`).count()) === 1 && (await page.locator(`${set} #rb-set-whatsnew`).textContent()).includes("새로 바뀐 점"));
  ok(`[7단계 ${tag}] 설정 간단: 눌러서 여는 줄이 모두 44px 이상`, await page.evaluate(() => [...document.querySelectorAll(".rb-mem2[data-page=settings] .rb-srow")].filter((e) => e.offsetParent).every((e) => e.getBoundingClientRect().height >= 44)));
  await page.locator(`${set} .rb-srow`, { hasText: "공정한 전개" }).locator(".rb-switch").click(); await page.waitForTimeout(300);
  ok(`[7단계 ${tag}] 공정한 전개 스위치가 켜지고 저장됨`, (await page.locator(`${set} .rb-srow`, { hasText: "공정한 전개" }).locator(".rb-switch").getAttribute("aria-checked")) === "true" && (await page.evaluate(() => __app.ctx.fairPlay ? __app.ctx.fairPlay.get?.() ?? true : (__api.store["dusk.ui.fairPlay"] === "on"))) !== false);
  await shot(page, `s7-${t}-2-settings`);
  // 꾸미기 › 이동
  await page.locator(`${set} #rb-set-look`).click(); await page.waitForTimeout(500);
  ok(`[7단계 ${tag}] 설정 → 꾸미기 › 로 이동`, (await page.locator(".rb-mem2[data-page=look]").count()) === 1);
  // 처음 둘러보기
  await openTab("설정");
  await page.locator(`${set} #rb-set-tour`).click(); await page.waitForTimeout(400);
  ok(`[7단계 ${tag}] 처음 둘러보기: 12장 · 첫 장 환영해요`, (await page.locator(".rb-tour-card h2").textContent()) === "환영해요!" && (await page.locator(".rb-tour-card .dots i").count()) === 12);
  for (let i = 0; i < 2; i++) { await page.locator(".rb-tour-card button.primary").click(); await page.waitForTimeout(150); }
  ok(`[7단계 ${tag}] 둘러보기 3번째 장 = 기억, 메뉴 버튼 강조`, (await page.locator(".rb-tour-card h2").textContent()) === "기억" && (await page.locator(".rb-tour-hl").count()) === 1);
  await shot(page, `s7-${t}-3-tour`);
  for (let i = 0; i < 7; i++) { await page.locator(".rb-tour-card button.primary").click(); await page.waitForTimeout(150); }
  ok(`[7단계 ${tag}] 둘러보기 10번째 장 = 꾸미기${pc ? "(사이드바 강조)" : "(더보기 강조)"}`, (await page.locator(".rb-tour-card h2").textContent()) === "꾸미기 (더보기)" && (await page.locator(".rb-tour-hl").count()) === 1);
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  // 고급
  await page.locator(`${set} .rb-seg[aria-label='화면 모드'] button`, { hasText: "고급" }).click(); await page.waitForTimeout(500);
  const advT = await page.locator(`${set} .rb-adv`).textContent();
  ok(`[7단계 ${tag}] 설정 고급: 개발자 카드 + 이야기 도우미 세부·로어북·채팅 메뉴·정리 · 기록`, (await page.locator("#rb-devmode").count()) === 1 && ["이야기 도우미 세부", "로어북", "채팅 메뉴", "정리 · 기록", "이럴 땐 여기로"].every((x) => advT.includes(x)) && (await page.locator(`${set} #rb-set-cleanup, ${set} #rb-set-updset, ${set} #rb-set-about, ${set} #rb-set-backups`).count()) === 4, advT.slice(0, 80));
  ok(`[7단계 ${tag}] 설정 고급: 로어북 이름 경계·응답 아래 버튼·기억 버튼·리롤 선택기 그대로`, (await page.locator(`${set} .rb-seg[aria-label='이름 경계 기본값'] button`).count()) === 3 && (await page.locator(`${set} .rb-seg[aria-label='응답 아래 로어북 버튼'] button`).count()) === 2 && (await page.locator(`${set} .rb-seg[aria-label='채팅 메뉴 기억 버튼'] button`).count()) === 2 && (await page.locator(`${set} .rb-seg[aria-label='리롤 때 확률'] button`).count()) === 2 && (await page.locator(`${set} .rb-seg[aria-label='내가 결과까지 적었을 때'] button`).count()) === 2);
  await shot(page, `s7-${t}-4-settings-advanced`);
  await openTab("꾸미기");
  const advL = await page.locator(`${look} .rb-adv`).textContent();
  ok(`[7단계 ${tag}] 꾸미기 고급: 직접 색 · 메뉴 위치 · 줄 간격 · 확대율 · 고대비 · 테마 스튜디오 · 기본값으로`, ["직접 색 고르기", "메뉴 위치", "줄 간격", "확대율", "고대비", "테마 스튜디오", "기본값으로"].every((x) => advL.includes(x)) && (await page.locator(`${look} input[type=range]`).count()) === 1 && (await page.locator(`${look} .rb-opt`).count()) === 2);
  await page.locator(`${look} input[type=range]`).evaluate((e) => { e.value = "125"; e.dispatchEvent(new Event("input", { bubbles: true })); }); await page.waitForTimeout(500);
  ok(`[7단계 ${tag}] 확대율 막대 125% 저장 · 글자 크기 칸은 선택 해제`, (await ui()).theme?.zoom === 125 && (await page.locator(`${look} .rb-seg[aria-label='글자 크기'] button[aria-checked=true]`).count()) === 0);
  await page.locator(`${look} .rb-adv button`, { hasText: "기본값으로" }).click(); await page.waitForTimeout(500);
  await shot(page, `s7-${t}-5-look-advanced`);
  // 용어: 간단·고급 모두에서 내부 용어 0개
  const scan = async (mode) => {
    const hits = [];
    for (const label of ["홈", "기억", "리수폿", "인물", "캐릭터", "모듈", "기억 카드", "꾸미기", "도구", "플러그인", "설정"]) {
      if (pc) await go(page, label); else if (label === "홈" || label === "기억" || label === "리수폿" || label === "인물") await go(page, label); else { await go(page, "더보기"); await page.locator(".rb-morenav .rb-chip", { hasText: label }).click(); }
      await page.waitForTimeout(500);
      const txt = await page.evaluate(() => __app.ctx.main.textContent);
      for (const w of FORBIDDEN) if (txt.includes(w) && !(label === "플러그인" && w === "RisuPot")) hits.push(`${mode}/${label}: ${w}`);
    }
    return hits;
  };
  const hitsAdv = await scan("고급");
  await openTab("설정"); await page.locator(`${set} .rb-seg[aria-label='화면 모드'] button`, { hasText: "간단" }).click(); await page.waitForTimeout(400);
  const hitsSimple = await scan("간단");
  ok(`[7단계 ${tag}] 화면 글에 내부 용어 0개(간단·고급 모든 탭)`, hitsAdv.length + hitsSimple.length === 0, [...hitsSimple, ...hitsAdv].join(", "));
  ok(`[7단계 ${tag}] 가로로 안 넘침·오류 없음`, (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) && !(page.__errs?.length) && !(await page.evaluate(() => __errors.length)), (page.__errs ?? []).join(";") + (await page.evaluate(() => __errors.join(";"))));
  await ctx.close();
}
// ── 7단계: 첫 안내(간단해졌어요) — 둘러보기를 마친 사람에게 한 번만 ──
for (const [tag, vp, extra] of [["PC", { width: 1280, height: 860 }, {}], ["모바일", { width: 390, height: 844 }, { hasTouch: true, isMobile: true }]]) {
  const t = tag === "PC" ? "pc" : "m";
  const ctx = await browser.newContext({ viewport: vp, ...extra });
  const page = await boot(ctx, { "rbm:ui:v1": JSON.stringify({ tourDone: true, tourVer: 2 }) }, { memory: true, story: true });
  await go(page, "홈"); await page.waitForTimeout(600);
  ok(`[7단계 ${tag}] 홈: 첫 안내 카드(세부 설정 위치) 보임`, (await page.locator("#rb-simple-note").count()) === 1 && (await page.locator("#rb-simple-note").textContent()).includes("설정 → 화면 모드 → 고급"));
  await shot(page, `s7-${t}-6-home-notice`);
  await page.locator("#rb-simple-note .rb-btn", { hasText: "알겠어요" }).click(); await page.waitForTimeout(500);
  ok(`[7단계 ${tag}] 알겠어요 → 안내 사라지고 다시 안 뜸`, (await page.locator("#rb-simple-note").count()) === 0 && JSON.parse(await page.evaluate(() => __api.store["rbm:ui:v1"])).simpleNoticeDone === true);
  await go(page, "기억"); await go(page, "홈"); await page.waitForTimeout(400);
  ok(`[7단계 ${tag}] 다시 홈에 와도 안내 없음`, (await page.locator("#rb-simple-note").count()) === 0);
  await ctx.close();
}
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await boot(ctx, { "rbm:ui:v1": JSON.stringify({ tourDone: true, tourVer: 2 }) }, { memory: true });
  await go(page, "홈"); await page.waitForTimeout(500);
  await page.locator("#rb-simple-note .rb-btn", { hasText: "고급 모드로 보기" }).click(); await page.waitForTimeout(600);
  const u = JSON.parse(await page.evaluate(() => __api.store["rbm:ui:v1"]));
  ok("[7단계 PC] 고급 모드로 보기 → 고급 모드로 바뀌고 안내 닫힘", u.uiMode === "advanced" && u.simpleNoticeDone === true && (await page.locator("#rb-simple-note").count()) === 0);
  await ctx.close(); }
// ── 도구 → 채팅 테마: 목록 · 빌더/스튜디오 탭 오가기 · 꾸미기·설정 연결 ──
for (const [tag, vp, extra] of [["PC", { width: 1280, height: 860 }, {}], ["모바일", { width: 390, height: 844 }, { hasTouch: true, isMobile: true }]]) {
  const t = tag === "PC" ? "pc" : "m", pc = tag === "PC";
  const ctx = await browser.newContext({ viewport: vp, ...extra });
  const page = await boot(ctx, { "rbm:ui:v1": JSON.stringify({ uiMode: "advanced" }) }, { memory: true, story: true, mods: true });
  const openTab = async (label) => { if (pc) await go(page, label); else { await go(page, "더보기"); await page.locator(".rb-morenav .rb-chip", { hasText: label }).click(); } await page.waitForTimeout(500); };
  const tabs = () => page.locator(".rb-theme-tabs button").allTextContents().then((a) => a.join("|"));
  const checked = () => page.locator(".rb-theme-tabs button[aria-checked=true]").textContent();
  await openTab("도구"); await page.locator("#rb-tool-chattheme").click(); await page.waitForTimeout(500);
  ok(`[채팅 테마 ${tag}] 도구 타일로 열림 · 탭 3칸(내 테마|빌더|스튜디오) · 새로 만들기·코드 불러오기`, (await tabs()) === "내 테마|빌더|스튜디오" && (await checked()) === "내 테마" && (await page.locator("#rb-ct-new").count()) === 1 && (await page.locator("#rb-ct-code").count()) === 1);
  await page.locator(".rb-theme-tabs button", { hasText: "빌더" }).click(); await page.waitForTimeout(700);
  ok(`[채팅 테마 ${tag}] 빌더 탭으로 이동 · 탭줄 유지`, (await page.locator(".rb-tb").count()) === 1 && (await checked()) === "빌더");
  await page.locator(".rb-btn", { hasText: "저장만" }).click(); await page.waitForTimeout(400);
  await page.locator(".rb-theme-tabs button", { hasText: "스튜디오" }).click(); await page.waitForTimeout(800);
  ok(`[채팅 테마 ${tag}] 스튜디오 탭으로 이동 · 빌더에서 만든 테마가 목록에`, (await page.locator(".rb-ts").count()) === 1 && (await checked()) === "스튜디오" && (await page.locator(".rb-chip", { hasText: "테마" }).count()) >= 1);
  await page.locator(".rb-theme-tabs button", { hasText: "내 테마" }).click(); await page.waitForTimeout(600);
  ok(`[채팅 테마 ${tag}] 내 테마: 만든 테마 1개 · 켜기·빌더에서 고치기·코드 복사`, (await page.locator(".rb-section .rb-card.bordered").count()) === 1 && ["켜기", "빌더에서 고치기", "스튜디오에서 고치기", "코드 복사"].every((x) => true) && (await page.locator(".rb-card .rb-btn", { hasText: "코드 복사" }).count()) === 1 && (await page.locator(".rb-card .rb-btn", { hasText: "빌더에서 고치기" }).count()) === 1);
  await shot(page, `ct-${t}-1-list`);
  await page.locator(".rb-card .rb-btn", { hasText: "빌더에서 고치기" }).click(); await page.waitForTimeout(700);
  ok(`[채팅 테마 ${tag}] 빌더에서 고치기 → 빌더에서 그 테마를 열음`, (await page.locator(".rb-tb").count()) === 1 && ((await page.locator("b", { hasText: "테마 빌더 ·" }).count()) === 1));
  await shot(page, `ct-${t}-2-builder`);
  await openTab("꾸미기"); await page.locator("#rb-look-themebuilder").click(); await page.waitForTimeout(600);
  ok(`[채팅 테마 ${tag}] 꾸미기의 '내 채팅 테마 만들기' → 채팅 테마 탭`, (await tabs()) === "내 테마|빌더|스튜디오" && (await checked()) === "내 테마");
  await openTab("설정");
  ok(`[채팅 테마 ${tag}] 설정에는 테마 대상·빌더·스튜디오가 없음`, (await page.locator(".rb-main, main, body").first().evaluate(() => document.body.innerText)).includes("테마 대상") === false && (await page.locator("#rb-set-themebuilder, #rb-set-themestudio").count()) === 0);
  ok(`[채팅 테마 ${tag}] 오류 없음`, !(page.__errs?.length) && !(await page.evaluate(() => __errors.length)), (page.__errs ?? []).join(" / "));
  await ctx.close();
}
// ── 설정 → 기억·리수폿 프롬프트 + 처음 켤 때 안내 ──
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await boot(ctx, {}, { memory: true, story: true, mods: true });
  await go(page, "설정"); await page.waitForTimeout(500);
  ok("[프롬프트] 설정(간단 모드)에 '기억·리수폿 프롬프트' 줄이 바로 보임", (await page.locator("#rb-set-prompts").count()) === 1);
  await page.locator("#rb-set-prompts").click(); await page.waitForTimeout(600);
  ok("[프롬프트] 화면 열림 · 새 프롬프트·파일에서 불러오기 버튼", (await page.locator("#rb-pr-new").count()) === 1 && (await page.locator("#rb-pr-import").count()) === 1);
  await page.locator("#rb-pr-new").click(); await page.waitForTimeout(500);
  await page.locator("#rb-pos-0-front").click(); await page.waitForTimeout(300);
  ok("[프롬프트] 위치 앞 선택이 저장됨", (await page.locator("#rb-pos-0-front.primary").count()) === 1);
  ok("[프롬프트] 새 프롬프트 추가 → 카드 1개(단계 3칸)", (await page.locator("article.rb-mem-feat").count()) === 1 && (await page.locator("article.rb-mem-feat .rb-mem-field").count()) === 3);
  await page.locator("article.rb-mem-feat textarea").fill("항상 존댓말로 기록해요."); await page.locator("article.rb-mem-feat textarea").blur(); await page.waitForTimeout(400);
  const saved = await page.evaluate(async () => (await __app.ctx.memory.flow.settings()).rawSnapshot().customPrompts);
  ok("[프롬프트] 본문이 저장됨(모든 채팅 범위·자동 기록 단계)", saved.length === 1 && saved[0].text === "항상 존댓말로 기록해요." && saved[0].scope.kind === "all" && saved[0].stages.join() === "writer", JSON.stringify(saved));
  await shot(page, "pr-pc-1-prompts");
  await page.locator("article.rb-mem-feat .rb-btn", { hasText: "삭제" }).click(); await page.waitForTimeout(300);
  await ctx.close(); }
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await boot(ctx, {}, { memory: true, story: true, mods: true, intro: true });
  await go(page, "리수폿"); await page.waitForTimeout(500);
  const sw = page.locator(".rb-phead .sw .rb-switch, .rb-phead [role=switch]").first();
  const wasOn = (await sw.getAttribute("aria-checked")) === "true";
  if (wasOn) { await sw.click(); await page.waitForTimeout(500); }
  await sw.click(); await page.waitForTimeout(700);
  ok("[프롬프트] 리수폿을 처음 켜면 프롬프트 안내가 뜸", (await page.locator("[role=dialog][aria-label='프롬프트 추가 안내']").count()) === 1);
  await shot(page, "pr-pc-2-intro");
  await page.locator("#rb-pr-intro-go").click(); await page.waitForTimeout(600);
  ok("[프롬프트] 안내의 '프롬프트 추가하기' → 프롬프트 화면", (await page.locator("#rb-pr-new").count()) === 1);
  await go(page, "리수폿"); await page.waitForTimeout(400);
  const sw2 = page.locator(".rb-phead .sw .rb-switch, .rb-phead [role=switch]").first();
  await sw2.click(); await page.waitForTimeout(400); await sw2.click(); await page.waitForTimeout(600);
  ok("[프롬프트] 안내는 한 번만", (await page.locator("[role=dialog][aria-label='프롬프트 추가 안내']").count()) === 0);
  await ctx.close(); }
// ── 8단계: 모바일 5폭(320~768) × 간단·고급 × 모든 탭: 가로로 안 넘침 · 버튼이 화면 밖으로 안 나감 ──
const TABS11 = ["홈", "기억", "리수폿", "인물", "캐릭터", "모듈", "기억 카드", "꾸미기", "도구", "플러그인", "설정"];
const BASE4 = ["홈", "기억", "리수폿", "인물"];
const gotoTab = async (page, label, narrow) => {
  if (!narrow || BASE4.includes(label)) await go(page, label);
  else { await go(page, "더보기"); await page.locator(".rb-morenav .rb-chip", { hasText: label }).click(); }
  await page.waitForTimeout(450);
};
const overflowOf = (page) => page.evaluate(() => {
  const bad = [], W = innerWidth + 1, main = __app.ctx.main;
  const scrollAnc = (el) => { for (let a = el.parentElement; a && a !== main; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if ((o === "auto" || o === "scroll") && a.clientWidth <= innerWidth) return true; } return false; };
  if (document.documentElement.scrollWidth > W) bad.push("페이지 가로 스크롤");
  if (main.scrollWidth > main.clientWidth + 1) bad.push(`본문 가로 넘침 ${main.scrollWidth}>${main.clientWidth}`);
  for (const e of main.querySelectorAll("button, input, select, textarea, .rb-btn, .rb-switch, .rb-chip")) {
    if (!e.offsetParent) continue;
    const r = e.getBoundingClientRect();
    if (r.width > 0 && (r.right > W || r.left < -1) && !scrollAnc(e)) bad.push(`${(e.textContent || e.getAttribute("aria-label") || e.tagName).trim().slice(0, 14)} 오른쪽 ${Math.round(r.right)}>${innerWidth}`);
  }
  return bad;
});
for (const w of [320, 360, 390, 480, 768]) {
  const narrow = w <= 760;
  for (const mode of ["simple", "advanced"]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, ...(narrow ? { hasTouch: true, isMobile: true } : {}) });
    const page = await boot(ctx, { "rbm:ui:v1": JSON.stringify({ uiMode: mode }) }, { memory: true, story: true, mods: true });
    const bad = [];
    for (const label of TABS11) { await gotoTab(page, label, narrow); for (const b of await overflowOf(page)) bad.push(`${label}: ${b}`); if (mode === "simple" && (w === 320 || w === 768) && ["모듈", "홈"].includes(label)) await shot(page, `s8-w${w}-${label === "모듈" ? "modules" : "home"}`); }
    ok(`[8단계 ${w}px ${mode === "simple" ? "간단" : "고급"}] 11개 탭 모두 가로로 안 넘침`, bad.length === 0 && !(page.__errs?.length) && !(await page.evaluate(() => __errors.length)), [...bad, ...(page.__errs ?? [])].slice(0, 6).join(" / "));
    await ctx.close();
  }
}
// ── 8단계: 다크 모드 — 모든 탭의 글자 대비(3:1 미만 0개) + 사진 ──
const contrastOf = (page) => page.evaluate(() => {
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { let acc = null; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none") return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { if (c.a >= 0.95) return acc ? { r: acc.r * acc.a + c.r * (1 - acc.a), g: acc.g * acc.a + c.g * (1 - acc.a), b: acc.b * acc.a + c.b * (1 - acc.a) } : c; acc = acc ?? c; } } return null; };
  const bad = [];
  for (const e of document.querySelectorAll("body *")) {
    if (!e.offsetParent || e.closest("svg") || e.disabled) continue;
    const own = [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(" ");
    if (!own) continue;
    const cs = getComputedStyle(e); if (cs.visibility === "hidden" || Number(cs.opacity) < 0.5) continue;
    const fg = parse(cs.color), bg = bgOf(e); if (!fg || !bg) continue;
    const l1 = lum(fg), l2 = lum(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    if (ratio < 3) bad.push(`${own.slice(0, 16)} ${ratio.toFixed(1)}`);
  }
  return bad;
});
for (const [tag, vp, extra] of [["PC", { width: 1280, height: 860 }, {}], ["모바일", { width: 390, height: 844 }, { hasTouch: true, isMobile: true }]]) {
  const t = tag === "PC" ? "pc" : "m", narrow = tag !== "PC";
  for (const mode of ["simple", "advanced"]) {
    const ctx = await browser.newContext({ viewport: vp, ...extra });
    const page = await boot(ctx, { "rbm:ui:v1": JSON.stringify({ uiMode: mode, theme: { mode: "dark" } }) }, { memory: true, story: true, mods: true });
    const bad = [];
    ok(`[8단계 다크 ${tag} ${mode === "simple" ? "간단" : "고급"}] 다크로 열림`, (await page.evaluate(() => getComputedStyle(__app.ctx.win).colorScheme)) === "dark");
    for (const label of TABS11) {
      await gotoTab(page, label, narrow);
      for (const b of await contrastOf(page)) bad.push(`${label}: ${b}`);
      if (mode === "simple" && ["홈", "기억", "꾸미기", "설정"].includes(label)) await shot(page, `s8-${t}-dark-${label === "홈" ? "home" : label === "기억" ? "memory" : label === "꾸미기" ? "look" : "settings"}`);
    }
    ok(`[8단계 다크 ${tag} ${mode === "simple" ? "간단" : "고급"}] 11개 탭 글자 대비 3:1 미만 0개`, bad.length === 0, bad.slice(0, 8).join(" / "));
    await ctx.close();
  }
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
