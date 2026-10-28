// 정보 탭·퍼스트 메시지 관리자 시험 (실제 입력). 클라우드 샌드박스: /opt/npm-tools, /opt/pw-browsers
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/info.entry.js"], bundle: true, write: false, format: "iife", globalName: "T", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + '/src/vendor/fflate.js' } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const open = async (page, n) => { await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body></body>"); await page.addScriptTag({ content: r.outputFiles[0].text }); await page.evaluate((n) => T.setup(n), n); };
const draft = (page) => page.evaluate(() => JSON.parse(JSON.stringify({ f: __ed.draft.firstMessage, a: __ed.draft.alternateGreetings, g: __ed.draft.groupOnlyGreetings })));
const toList = async (page) => { if (!(await page.locator(".rb-gm-list").isVisible())) await page.getByRole("button", { name: "목록" }).click(); };
const rows = (page) => page.locator(".rb-gm-row");

for (const mobile of [false, true]) {
  const tag = mobile ? "모바일" : "PC";
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true } : { viewport: { width: 1200, height: 900 } }), page = await ctx.newPage();
  const logs = []; page.on("pageerror", (e) => logs.push(e.message)); page.setDefaultTimeout(4000);
  await open(page, 12);
  ok(`[${tag}] 정보 탭이 첫 화면`, (await page.locator(".rb-tabs button[aria-selected=true]").textContent()).startsWith("정보"));
  const stats = await page.locator(".rb-info-stat").allTextContents();
  ok(`[${tag}] 요약 카드: 인사말 13·로어북 1`, stats.some((t) => t.startsWith("13")) && stats.some((t) => t.startsWith("1로어북")), stats.join("|"));
  ok(`[${tag}] 이름·태그 표시`, (await page.locator(".rb-info-name").textContent()) === "히나" && (await page.locator(".rb-info-tags .rb-chip").count()) === 2);
  ok(`[${tag}] 기본·인사말은 열림, 고급은 접힘`, (await page.locator(".rb-info-card").evaluateAll((d) => d.map((x) => x.open))).join() === "true,true,false");
  ok(`[${tag}] 인사말 목록 13줄(대표 포함)`, (await rows(page).count()) === 13);
  ok(`[${tag}] 대표 표시`, (await rows(page).first().textContent()).includes("대표"));
  // 요약 카드 → 탭 이동
  await page.locator(".rb-info-stat", { hasText: "로어북" }).click();
  ok(`[${tag}] 로어북 숫자를 누르면 로어북 탭`, (await page.locator(".rb-tabs button[aria-selected=true]").textContent()).startsWith("로어북"));
  await page.evaluate(() => [...document.querySelectorAll(".rb-tabs button")].find((b) => b.textContent.startsWith("정보")).click());
  // 검색
  await page.locator("input[aria-label='인사말 검색']").fill("대안 인사 7"); await page.waitForTimeout(50);
  ok(`[${tag}] 검색`, (await rows(page).count()) === 1);
  await page.locator("input[aria-label='인사말 검색']").fill("");
  // 선택 + 편집
  await rows(page).nth(3).click(); await page.waitForTimeout(80);
  const ta = page.locator(".rb-gm-edit textarea").first();
  ok(`[${tag}] 선택하면 오른쪽에 내용`, (await ta.inputValue()).startsWith("대안 인사 3"), await ta.inputValue());
  await ta.click(); await page.keyboard.press("Control+End"); await page.keyboard.type(" EDIT");
  ok(`[${tag}] 편집하면 봇 데이터에 반영`, (await draft(page)).a[2].endsWith(" EDIT"));
  ok(`[${tag}] 목록 줄 글자 수 갱신`, (await rows(page).nth(3).textContent()).includes("자"));
  // 이전/다음 (Alt+↑↓)
  await page.keyboard.press("Alt+ArrowDown"); await page.waitForTimeout(60);
  ok(`[${tag}] Alt+↓ 다음 인사말`, (await page.locator(".rb-gm-edit textarea").first().inputValue()).startsWith("대안 인사 4"));
  await page.keyboard.press("Alt+ArrowUp"); await page.keyboard.press("Alt+ArrowUp"); await page.waitForTimeout(60);
  ok(`[${tag}] Alt+↑ 이전 인사말`, (await page.locator(".rb-gm-edit textarea").first().inputValue()).startsWith("대안 인사 2"));
  // 복제 → 삭제 → 삭제 취소
  await toList(page);
  await rows(page).nth(2).locator("[aria-label$='메뉴']").click(); await page.getByRole("menuitem", { name: "복제" }).click(); await page.waitForTimeout(60);
  ok(`[${tag}] 복제 → 14줄`, (await rows(page).count()) === 14 && (await draft(page)).a.length === 13);
  await rows(page).nth(3).locator("[aria-label$='메뉴']").click(); await page.getByRole("menuitem", { name: "삭제" }).click(); await page.waitForTimeout(60);
  ok(`[${tag}] 삭제 → 13줄`, (await rows(page).count()) === 13);
  await page.getByRole("button", { name: "삭제 취소" }).click(); await page.waitForTimeout(60);
  ok(`[${tag}] 삭제 취소 → 14줄`, (await rows(page).count()) === 14);
  // 대표 지정
  await toList(page);
  await rows(page).nth(5).locator("[aria-label$='메뉴']").click(); const was = (await draft(page)).a[4]; await page.getByRole("menuitem", { name: "대표 인사말로 지정" }).click(); await page.waitForTimeout(60);
  const dm = await draft(page);
  ok(`[${tag}] 대표 지정: 첫 메시지 교체·이전 대표는 추가로`, dm.f === was && dm.a.includes("안녕, 나는 히나야.\n두번째 줄"), JSON.stringify(dm.f));
  // 그룹 전용
  await toList(page);
  await rows(page).nth(2).locator("[aria-label$='메뉴']").click(); await page.getByRole("menuitem", { name: "그룹 전용으로 옮기기" }).click(); await page.waitForTimeout(60);
  ok(`[${tag}] 그룹 전용으로 이동`, (await draft(page)).g?.length === 1 && (await rows(page).last().textContent()).includes("그룹 전용"));
  // 인사말 추가
  await toList(page);
  await page.getByRole("button", { name: "인사말 추가" }).click(); await page.getByRole("menuitem", { name: "추가 인사말" }).click(); await page.waitForTimeout(80);
  ok(`[${tag}] 추가 → 새 빈 인사말 선택·포커스`, (await rows(page).count()) === 15 && (await page.evaluate(() => document.activeElement?.tagName)) === "TEXTAREA");
  // 읽기 보기
  await page.locator(".rb-gm-edit .rb-seg button", { hasText: "읽기" }).click(); await page.waitForTimeout(50);
  ok(`[${tag}] 읽기 보기`, (await page.locator(".rb-gm-read").count()) >= 1 && (await page.locator(".rb-gm-edit textarea").count()) === 0);
  await page.locator(".rb-gm-edit .rb-seg button", { hasText: "편집" }).click();
  // 나란히 비교
  await toList(page);
  await rows(page).nth(1).click(); await page.waitForTimeout(50);
  await page.getByRole("button", { name: "나란히 비교" }).click(); await page.waitForTimeout(80);
  ok(`[${tag}] 나란히 비교: 편집기 2개`, (await page.locator(".rb-gm-edit textarea").count()) === 2);
  await page.getByRole("button", { name: "비교 끄기" }).click();
  // 열림 상태 기억
  await page.locator(".rb-info-card").nth(2).locator("summary").click();
  await page.evaluate(() => { const t = [...document.querySelectorAll(".rb-tabs button")]; t.find((b) => b.textContent.startsWith("JSON")).click(); t.find((b) => b.textContent.startsWith("정보")).click(); });
  ok(`[${tag}] 탭을 다녀와도 접힘/열림 기억·선택 기억`, (await page.locator(".rb-info-card").evaluateAll((d) => d.map((x) => x.open))).join() === "true,true,true");
  // 저장(적용)
  await page.evaluate(() => { __ed.apply(); }); await page.locator(".rb-modal button", { hasText: /^저장$/ }).click(); await page.waitForTimeout(400);
  const sv = await page.evaluate(() => window.__saved.at(-1));
  ok(`[${tag}] 저장 시 인사말·추가·그룹 전용이 봇에 반영`, sv && Array.isArray(sv.alternateGreetings) && sv.alternateGreetings.length === 13 && sv.groupOnlyGreetings?.length === 1, JSON.stringify(sv && [sv.alternateGreetings?.length, sv.groupOnlyGreetings]));
  if (mobile) {
    await page.evaluate(() => document.querySelector(".rb-gm").classList.remove("m-detail")); await page.waitForTimeout(30);
    ok("[모바일] 목록 화면에서는 편집창 숨김", !(await page.locator(".rb-gm-edit").isVisible()) && (await page.locator(".rb-gm-list").isVisible()));
    await rows(page).nth(2).click(); await page.waitForTimeout(50);
    ok("[모바일] 줄을 누르면 상세로(목록 숨김)", (await page.locator(".rb-gm-edit").isVisible()) && !(await page.locator(".rb-gm-list").isVisible()));
    await page.getByRole("button", { name: "목록" }).click(); await page.waitForTimeout(30);
    ok("[모바일] 목록 버튼으로 되돌아옴", await page.locator(".rb-gm-list").isVisible());
    ok("[모바일] 가로로 넘치지 않음", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  }
  ok(`[${tag}] 오류 없음`, !logs.length, logs.join(";")); await ctx.close();
}
// 많은 인사말 (성능)
{
  const page = await browser.newPage(); await open(page, 300);
  const t0 = Date.now(); await page.locator(".rb-gm-row").nth(150).click(); await page.waitForTimeout(30);
  ok("[대량] 인사말 300개에서 선택 전환이 0.5초 안", Date.now() - t0 < 500, String(Date.now() - t0));
  await page.close();
}
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
