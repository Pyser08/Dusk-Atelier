// v1.7.1 기억 편집기 시험 (실제 입력). 클라우드 샌드박스: /opt/npm-tools, /opt/pw-browsers
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

const get = (page, expr) => page.evaluate(expr);
const folder = (page) => get(page, () => __app.ctx.memory.store.getFolder("c1", "t1"));
let fails = 0;
for (const [tag, vp, extra] of [["PC", { width: 1280, height: 860 }, {}], ["모바일", { width: 390, height: 844 }, { hasTouch: true, isMobile: true }]]) {
  const t = tag === "PC" ? "pc" : "m";
  const ctx = await browser.newContext({ viewport: vp, ...extra });
  const page = await boot(ctx, {}, { memory: true, story: true });
  await page.evaluate(() => __app.ctx.memory.store.updateFolder("c1", "t1", (f) => {
    const r = f.people.sirokko.records[0]; r.kd = "i"; r.fc = "M"; r.ic = "L"; r.m = 2; r.keys = ["순찰"];
    r.hist = [{ id: "old", act: "예전 행동", v: "싫어함", why: "newer", at_ms: 1 }]; r.prev = { id: "old", act: "예전 행동", v: "싫어함" };
    f.scenes = [{ id: "s1", sum: "교실", place: "교실", at: 4, orphan: false, who: ["시로코"], at_ms: 1 }];
    f.emo = { "시로코>{{user}}": { from: "시로코", to: "{{user}}", tags: { affection: 7, trust: 1 }, log: [{ t: { affection: 7 }, from: { affection: null }, why: "converted", at_ms: 1 }] } };
    f.emoConv = [{ pair: "시로코>{{user}}", from: "affinity.score", value: 40, min: 0, max: 100, to: { affection: 7 }, at_ms: 1 }];
  }, { chaId: "c1", chatId: "t1" }));
  await go(page, "기억"); await page.waitForTimeout(600);
  ok(`[편집기 ${tag}] 간단 모드에는 편집기가 없다`, (await page.locator(".rb-mem-ed").count()) === 0);
  await go(page, tag === "PC" ? "설정" : "더보기");
  if (tag !== "PC") await page.locator(".rb-morenav .rb-chip", { hasText: "설정" }).click();
  await page.waitForTimeout(300);
  await page.locator(".rb-seg[aria-label='화면 모드'] button", { hasText: "고급" }).click(); await page.waitForTimeout(300);
  await go(page, "기억"); await page.waitForTimeout(800);
  ok(`[편집기 ${tag}] 고급 모드: 편집기가 '기억 방식' 박스 바로 아래에 있다`, await page.evaluate(() => { const m = document.querySelector(".rb-mem-modebar"), e = document.querySelector(".rb-mem-ed"); return !!m && !!e && m.parentElement.nextElementSibling === e; }));
  await page.locator(".rb-mem-ed:not(.rb-mem-lore) > summary").click(); await page.waitForTimeout(700);
  ok(`[편집기 ${tag}] 기록 탭: 인물 그룹과 기록 카드`, (await page.locator(".rb-mem-edperson").count()) === 2 && (await page.locator(".rb-mem-edrec").count()) >= 2);
  const R1 = () => page.locator(".rb-mem-edrec[data-rid='r1']");
  await page.locator(".rb-mem-edperson").first().locator("summary").click();
  const texts = await R1().locator(".rb-mem-tb").allTextContents();
  ok(`[편집기 ${tag}] 확신도 뱃지(추론·사실 중간·해석 낮음·2회)`, ["추론", "사실 중간", "해석 낮음", "2회"].every((x) => texts.includes(x)), texts.join("|"));
  await shot(page, `ed-${t}-1-records`);
  // 본문 고치기 → 저장 + 잠금
  const card = R1();
  await card.locator("textarea").first().fill("고친 본문"); await card.locator("textarea").first().blur(); await page.waitForTimeout(500);
  let f = await folder(page); let r0 = f.people.sirokko.records[0];
  ok(`[편집기 ${tag}] 본문 수정이 저장되고 act 칸이 잠긴다`, r0.act === "고친 본문" && r0.lock?.act === true && r0.user === true, JSON.stringify(r0.lock));
  // 사실 확신도 → 높음(사용자지정)
  await R1().locator("select[aria-label='사실확실성']").selectOption("H"); await page.waitForTimeout(500);
  f = await folder(page); r0 = f.people.sirokko.records[0];
  ok(`[편집기 ${tag}] 사실 확신도 수정 → H, 잠김, 뱃지에 사용자지정`, r0.fc === "H" && r0.lock.fc === true && (await R1().locator(".rb-mem-tb", { hasText: "사용자지정" }).count()) >= 1);
  // 현재 적용 끄기
  await R1().locator("input[type=checkbox]").uncheck(); await page.waitForTimeout(500);
  f = await folder(page); r0 = f.people.sirokko.records[0];
  ok(`[편집기 ${tag}] '현재 적용' 끄기 → valid:false, 이유 user`, r0.valid === false && r0.inv?.why === "user");
  // 되돌리기(직전 1건)
  await page.locator(".rb-mem-edbar .rb-btn", { hasText: "되돌리기" }).click(); await page.waitForTimeout(500);
  f = await folder(page); r0 = f.people.sirokko.records[0];
  ok(`[편집기 ${tag}] 되돌리기: 직전 수정만 취소(valid 복구, fc는 유지)`, r0.valid === undefined && r0.fc === "H");
  // 자세히: 이전→현재, 출처, 검색 키
  await R1().locator(".rb-btn", { hasText: "자세히" }).click(); await page.waitForTimeout(300);
  const det = await page.locator(".rb-mem-eddetail").first().textContent();
  ok(`[편집기 ${tag}] 자세히: 출처·이전→현재·검색 키`, det.includes("출처 #5") && det.includes("이전: 예전 행동") && det.includes("순찰"), det.slice(0, 160));
  await page.locator(".rb-mem-edkeys input").first().fill("편지"); await page.locator(".rb-mem-edkeys input").first().press("Enter"); await page.waitForTimeout(500);
  f = await folder(page); ok(`[편집기 ${tag}] 검색 키 추가 저장`, f.people.sirokko.records[0].keys.join() === "순찰,편지");
  await shot(page, `ed-${t}-2-detail`);
  // 감정 탭
  await page.locator(".rb-mem-edbar .rb-seg button", { hasText: "감정" }).click(); await page.waitForTimeout(400);
  ok(`[편집기 ${tag}] 감정 탭: 6태그 게이지, 미설정 표시, 변환 안내`, (await page.locator(".rb-mem-edgauge").count()) === 6 && (await page.locator(".rb-mem-edval", { hasText: "미설정" }).count()) === 4 && (await page.locator(".rb-mem-edconv").count()) === 1);
  await page.locator(".rb-mem-edrange").nth(5).evaluate((el) => { el.value = "4"; el.dispatchEvent(new Event("change", { bubbles: true })); }); await page.waitForTimeout(500);
  f = await folder(page); const pr = f.emo["시로코>{{user}}"];
  ok(`[편집기 ${tag}] 두려움 게이지 4로 저장 + 잠금`, pr.tags.fear === 4 && pr.lock.fear === true);
  await shot(page, `ed-${t}-3-emo`);
  // 상황·관점
  await page.locator(".rb-mem-edbar .rb-seg button", { hasText: "상황" }).click(); await page.waitForTimeout(400);
  const rows = page.locator(".rb-mem-edrec .rb-mem-edrow");
  await rows.nth(0).locator("input").nth(0).fill("시로코"); await rows.nth(0).locator("input").nth(1).fill("믿고 싶음");
  await rows.nth(1).locator("input").nth(0).fill("호시노"); await rows.nth(1).locator("input").nth(1).fill("귀찮음");
  await page.locator(".rb-btn", { hasText: "관점 저장" }).click(); await page.waitForTimeout(500);
  f = await folder(page); ok(`[편집기 ${tag}] 인물별 관점 두 칸 저장`, f.scenes[0].pov?.length === 2 && f.scenes[0].pov[0].view === "믿고 싶음");
  // 기대 불일치
  await page.locator(".rb-mem-edbar .rb-seg button", { hasText: "기대" }).click(); await page.waitForTimeout(300);
  await page.evaluate(() => __app.ctx.memory.store.updateFolder("c1", "t1", (f) => { f.exp = { "시로코|호시노": { a: "시로코", b: "호시노", ae: "깨워 줌", be: "그냥 둠", as: false, bs: true, gap: true, viol: "무시당함", log: [], at_ms: 1 } }; }, { chaId: "c1", chatId: "t1" }));
  await page.locator(".rb-mem-edbar .rb-seg button", { hasText: "감정" }).click(); await page.locator(".rb-mem-edbar .rb-seg button", { hasText: "기대" }).click(); await page.waitForTimeout(500);
  ok(`[편집기 ${tag}] 기대 탭: 3칸 + 위반 인식`, (await page.locator(".rb-mem-edpair input[type=checkbox]").count()) === 3 && (await page.locator(".rb-mem-edpair input:not([type=checkbox])").evaluateAll((els) => els.map((e) => e.value))).includes("무시당함"));
  // 들어갈 내용 보기
  await page.locator(".rb-mem-edbar .rb-btn", { hasText: "들어갈 내용" }).click(); await page.waitForTimeout(700);
  ok(`[편집기 ${tag}] '들어갈 내용 보기' 창`, (await page.locator(".rb-dialog", { hasText: "다음 요청에 들어갈 기억" }).count()) === 1);
  await page.locator(".rb-dialog .rb-btn.primary").click(); await page.waitForTimeout(200);
  ok(`[편집기 ${tag}] 가로로 안 넘침·오류 없음`, (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) && !(page.__errs?.length), (page.__errs ?? []).join(";"));
  await shot(page, `ed-${t}-4-exp`);
  await ctx.close();
}
await browser.close();
const bad = out.filter((x) => !x).length;
console.log(`\n${out.length - bad}/${out.length} 통과`);
process.exit(bad ? 1 : 0);
