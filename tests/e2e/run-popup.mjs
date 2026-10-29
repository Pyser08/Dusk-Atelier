// AI 팝업 시험 (실제 마우스·터치 입력). 클라우드 샌드박스: /opt/npm-tools, /opt/pw-browsers
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/popup.entry.js"], bundle: true, write: false, format: "iife", globalName: "T", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + '/src/vendor/fflate.js' } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const open = async (page) => { await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body></body>"); await page.addScriptTag({ content: r.outputFiles[0].text }); await page.evaluate(() => T.setup()); };
const openPopup = async (page) => { await page.locator("#rb-rule-test-fab > button").click(); await page.getByRole("button", { name: "AI 창" }).click(); await page.waitForSelector("#rb-ai-popup"); };
const tab = (page, t) => page.evaluate((t) => [...document.querySelectorAll('.rb-tabs button')].find((b) => b.textContent.startsWith(t)).click(), t);
const box = (page) => page.locator("#rb-ai-popup").boundingBox();

// ── PC ──
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } }), page = await ctx.newPage();
  const logs = []; page.on("pageerror", (e) => logs.push(e.message));
  await open(page); await openPopup(page);
  let b = await box(page);
  ok("[PC] 우측 하단 기본 위치", b.x + b.width > 1100 && b.y + b.height > 700, JSON.stringify(b));
  // 머리글 끌기
  await page.mouse.move(b.x + 100, b.y + 20); await page.mouse.down(); await page.mouse.move(b.x - 200, b.y - 100, { steps: 6 }); await page.mouse.up();
  let b2 = await box(page);
  ok("[PC] 머리글을 끌면 이동", Math.abs((b.x - b2.x) - 300) < 6 && Math.abs((b.y - b2.y) - 120) < 6, JSON.stringify([b, b2]));
  // 화면 밖으로 못 나감
  await page.mouse.move(b2.x + 100, b2.y + 20); await page.mouse.down(); await page.mouse.move(-500, -500, { steps: 4 }); await page.mouse.up();
  b2 = await box(page); ok("[PC] 화면 밖으로 나가지 않음", b2.x >= 0 && b2.y >= 0, JSON.stringify(b2));
  // 크기 조절 (오른쪽 아래)
  await page.mouse.move(b2.x + b2.width - 6, b2.y + b2.height - 6); await page.mouse.down(); await page.mouse.move(b2.x + b2.width + 100, b2.y + b2.height + 60, { steps: 5 }); await page.mouse.up();
  let b3 = await box(page); ok("[PC] 오른쪽 아래 모서리로 크기 조절", b3.width > b2.width + 80 && b3.height > b2.height + 40, JSON.stringify([b2, b3]));
  // 최소 크기
  await page.mouse.move(b3.x + b3.width - 6, b3.y + b3.height - 6); await page.mouse.down(); await page.mouse.move(b3.x + 20, b3.y + 20, { steps: 5 }); await page.mouse.up();
  let b4 = await box(page); ok("[PC] 최소 크기 아래로 줄지 않음", b4.width >= 339 && b4.height >= 319, JSON.stringify(b4));
  // 닫고 다시 열면 위치·크기 기억
  await page.locator("#rb-ai-popup [aria-label='닫기']").click(); await openPopup(page);
  let b5 = await box(page); ok("[PC] 다시 열어도 위치·크기 기억", Math.abs(b5.x - b4.x) < 2 && Math.abs(b5.width - b4.width) < 2 && Math.abs(b5.height - b4.height) < 2, JSON.stringify([b4, b5]));
  ok("[PC] 저장 키는 da_aibuild:*", await page.evaluate(() => [...T.store.keys()].every((k) => k.startsWith("da_aibuild:"))));
  // 탭 바꿔도 유지 + 작업 자동 선택
  const task = () => page.locator("#rb-ai-popup select[aria-label='작업 종류']").inputValue();
  ok("[PC] 정보 탭 → 캐릭터 설명", (await task()) === "description", await task());
  await tab(page, "로어북"); await page.waitForTimeout(50);
  ok("[PC] 탭을 바꿔도 창 유지, 로어북 작업으로", (await page.locator("#rb-ai-popup").count()) === 1 && (await task()) === "lorebook", await task());
  await tab(page, "정규식"); ok("[PC] 정규식 탭 → 정규식 작업", (await task()) === "regex");
  await tab(page, "트리거"); ok("[PC] 트리거 탭 → Lua·변수", (await task()) === "lua");
  await page.locator("#rb-ai-popup select[aria-label='작업 종류']").selectOption("greeting");
  await tab(page, "로어북"); ok("[PC] 직접 고르면 자동 변경 멈춤", (await task()) === "greeting", await task());
  // 대기 점 · 수정안 배지
  await page.evaluate(() => window.__hold(true));
  await page.locator("#rb-ai-popup select[aria-label='작업 종류']").selectOption("description");
  await page.locator("#rb-ai-popup textarea[aria-label='요청']").fill("설명 다시 써줘"); await page.getByRole("button", { name: "보내기" }).click();
  await page.locator("#rb-ai-popup [aria-label='닫기']").click(); await page.waitForTimeout(100);
  const mark = page.locator("#rb-rule-test-fab > button .rb-fab-mark");
  ok("[PC] 창을 닫아도 대기 중 점 표시", await mark.isVisible() && (await mark.textContent()) === "", await mark.textContent());
  await page.evaluate(() => window.__release()); await page.waitForTimeout(300);
  ok("[PC] 수정안 도착 → 숫자 배지 1", (await mark.textContent()) === "1", await mark.textContent());
  ok("[PC] 도착 알림 토스트", (await page.evaluate(() => (window.__toasts || []).some((m) => m.includes("수정안이 도착")))));
  await page.locator("#rb-rule-test-fab > button").click();
  ok("[PC] 펼친 'AI 창' 항목에도 배지", (await page.locator("#rb-rule-test-fab .rb-fab-mark").nth(1).textContent()) === "1");
  ok("[PC] 오류 없음", !logs.length, logs.join(";")); await ctx.close();
}
// ── 모바일 ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true }), page = await ctx.newPage();
  const logs = []; page.on("pageerror", (e) => logs.push(e.message));
  await open(page); await openPopup(page);
  const b = await box(page);
  ok("[모바일] 아래 시트: 가로 꽉 참·바닥에 붙음", Math.abs(b.x) < 1 && Math.abs(b.width - 390) < 2 && Math.abs(b.y + b.height - 780) < 2, JSON.stringify(b));
  ok("[모바일] 높이는 화면의 90% 이하", b.height <= 780 * 0.9);
  ok("[모바일] 입력칸 글자 16px 이상(확대 방지)", (await page.locator("#rb-ai-popup textarea[aria-label='요청']").evaluate((e) => parseFloat(getComputedStyle(e).fontSize))) >= 16);
  ok("[모바일] 크기 조절 손잡이 숨김", !(await page.locator("#rb-ai-popup [aria-label^='크기 조절']").first().isVisible()));
  // 손잡이를 아래로 끌면 닫힘 (포인터 이벤트)
  await page.evaluate(() => { const g = document.querySelector("#rb-ai-popup > div"); const mk = (t, y) => g.dispatchEvent(new PointerEvent(t, { pointerId: 7, bubbles: true, clientX: 200, clientY: y, isPrimary: true })); g.setPointerCapture = () => {}; mk("pointerdown", 400); mk("pointermove", 520); mk("pointerup", 520); });
  await page.waitForTimeout(100);
  ok("[모바일] 손잡이를 아래로 끌면 닫힘", (await page.locator("#rb-ai-popup").count()) === 0);
  ok("[모바일] 오류 없음", !logs.length, logs.join(";")); await ctx.close();
}
// ── AI 탭 첫 진입 안내 ──
// 이 시험 하네스는 앱 CSS를 넣지 않아 안내 창(모달)이 편집기 위에 안 얹힌다 → 창 안의 버튼은 DOM으로 누른다.
const dclick = (page, n) => page.evaluate((n) => [...document.querySelectorAll("[role=dialog][aria-label='사용 안내'] button")].find((b) => b.textContent.trim() === n).click(), n);
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } }), page = await ctx.newPage(); page.setDefaultTimeout(5000);
  const logs = []; page.on("pageerror", (e) => logs.push(e.message));
  await open(page);
  const intro = page.locator("[role=dialog][aria-label='사용 안내']");
  await tab(page, "AI로 제작"); await page.waitForSelector("[role=dialog][aria-label='사용 안내']");
  ok("[안내] AI 탭 첫 진입에 3장 안내 1/3", (await intro.textContent()).includes("1 / 3"));
  await dclick(page, "다음"); await dclick(page, "다음");
  ok("[안내] 3/3에 Dusk/일반 방식 설명 없음·적용 저장 설명", (await intro.textContent()).includes("3 / 3") && (await intro.textContent()).includes("Ctrl+S"));
  await dclick(page, "이전");
  ok("[안내] 2/3에 Dusk 방식·일반 방식 차이", (await intro.textContent()).includes("Dusk 방식") && (await intro.textContent()).includes("일반 방식"));
  await dclick(page, "다음"); await dclick(page, "시작하기"); await page.waitForTimeout(200);
  ok("[안내] 시작하기 → AI 창 열림·안내 닫힘", (await page.locator("#rb-ai-popup").count()) === 1 && (await intro.count()) === 0);
  ok("[안내] 본 기록은 da_aibuild:intro", await page.evaluate(() => T.store.get("da_aibuild:intro") === "1"));
  await page.locator("#rb-ai-popup [aria-label='닫기']").click();
  await tab(page, "정보"); await tab(page, "AI로 제작"); await page.waitForTimeout(300);
  ok("[안내] 다시 들어가도 안 뜸", (await intro.count()) === 0);
  await page.getByRole("button", { name: "사용법" }).click();
  ok("[안내] [사용법]으로 다시 볼 수 있음", (await intro.count()) === 1);
  await dclick(page, "건너뛰기");
  ok("[안내] 건너뛰기", (await intro.count()) === 0);
  ok("[안내] 오류 없음", !logs.length, logs.join(";")); await ctx.close();
}
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
