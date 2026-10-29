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
const boot = async (ctx, seed = {}) => {
  const page = await ctx.newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => (page.__errs ??= []).push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  // 처음 둘러보기·새로 바뀐 점 창이 화면을 가리지 않게 '이미 본 버전'으로 시작한다
  await page.evaluate((s) => window.bootApp({ "rbm:seenVersion:v1": "1.7.0-dev", ...s }), seed);
  await page.waitForTimeout(250);
  return page;
};
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
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
  ok("[PC] 리수폿 탭 이동", (await cur(page)) === "리수폿" && (await page.locator(".rb-interim h2").textContent()) === "리수폿");
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
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
