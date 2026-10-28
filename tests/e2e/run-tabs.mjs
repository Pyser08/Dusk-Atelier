// 7단계 탭 시험 (실제 입력). 클라우드 샌드박스: /opt/npm-tools, /opt/pw-browsers
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/tabs.entry.js"], bundle: true, write: false, format: "iife", globalName: "T", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + '/src/vendor/fflate.js' } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const open = async (page, kind) => { await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body></body>"); await page.addScriptTag({ content: r.outputFiles[0].text }); await page.evaluate((k) => T.setup(k), kind); };
const tab = (page, t) => page.evaluate((t) => [...document.querySelectorAll(".rb-tabs button")].find((b) => b.textContent.startsWith(t)).click(), t);
const draft = (page, k) => page.evaluate((k) => JSON.parse(JSON.stringify(__ed.draft[k])), k);

for (const mobile of [false, true]) {
  const tag = mobile ? "모바일" : "PC";
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true } : { viewport: { width: 1200, height: 900 } });
  // ── 빈 봇: 안내 카드 + 첫 행동 ──
  { const page = await ctx.newPage(); page.setDefaultTimeout(4000); const logs = []; page.on("pageerror", (e) => logs.push(e.message));
    await open(page, "empty");
    for (const [t, btnName, key] of [["로어북", "첫 로어북 만들기", "lorebook"], ["정규식", "첫 정규식 만들기", "regex"], ["트리거", "첫 트리거 만들기", "trigger"]]) {
      await tab(page, t); await page.waitForTimeout(60);
      ok(`[${tag}] ${t} 빈 화면 안내 카드`, (await page.locator(".rb-emptycard").count()) === 1 && (await page.locator(".rb-emptycard").textContent()).includes("아직"));
      await page.getByRole("button", { name: btnName }).click(); await page.waitForTimeout(80);
      ok(`[${tag}] ${t} 첫 항목 만들기`, (await draft(page, key)).length === 1);
    }
    ok(`[${tag}] 빈 봇 오류 없음`, !logs.length, logs.join(";")); await page.close(); }
  // ── 항목 있는 봇 ──
  const page = await ctx.newPage(); page.setDefaultTimeout(4000); const logs = []; page.on("pageerror", (e) => logs.push(e.message));
  await open(page, "full");
  await tab(page, "로어북"); await page.waitForTimeout(80);
  const bar = page.locator(".rb-side-tools.rb-bar").first();
  const names = (await bar.locator("button:visible").allTextContents()).map((t) => t.trim());
  ok(`[${tag}] 로어북 바: 추가·만들기 + (PC만) 이름순·더스크화, 좁은 화면은 더보기 안`, names.includes("추가") && names.includes("만들기") && (mobile ? !names.some((n) => /이름순|더스크화|선택/.test(n)) : names.some((n) => /이름순/.test(n)) && names.some((n) => /더스크화/.test(n))), names.join("|"));
  ok(`[${tag}] 로어북: 전체·캐릭터·소속 탭과 검색이 목록 위쪽에`, (await page.locator(".side .rb-treehead input").count()) === 1 && /전체/.test(await page.locator(".side .rb-treehead").textContent()) && /소속/.test(await page.locator(".side .rb-treehead").textContent()));
  await bar.locator("[aria-label='더보기']").click();
  const menu = (await page.locator(".rb-menu").textContent());
  ok(`[${tag}] 더보기 메뉴: 이름순·더스크화·여러 개 고르기`, /이름순/.test(menu) && /더스크화/.test(menu) && /여러 개 고르기/.test(menu), menu);
  await page.keyboard.press("Escape");
  // 고급 접기
  if (mobile) await page.locator(".side .rb-item").first().click().catch(() => {}); await page.waitForTimeout(100);
  const cond = page.locator(".rb-fold", { hasText: "켜지는 조건" }).first();
  ok(`[${tag}] 로어북 '기본'은 열림, '켜지는 조건'·'고급'은 접혀 있음`, (await page.locator(".rb-fold").evaluateAll((d) => d.map((x) => x.open))).slice(0, 1).join() === "true" && !(await cond.evaluate((d) => d.open)));
  await cond.locator("summary").click();
  ok(`[${tag}] 켜지는 조건을 열면 삽입 순서·보조 키 칸 보임`, (await cond.textContent()).includes("삽입 순서") && (await cond.textContent()).includes("보조 키도 함께 필요"));
  ok(`[${tag}] ⓘ를 누르기 전엔 팁이 숨겨져 있음`, (await page.locator(".rb-tipbox.show").count()) === 0);
  // ── 정규식 ──
  await tab(page, "정규식"); await page.waitForTimeout(80);
  if (mobile) await page.locator(".side .rb-item").first().click().catch(() => {}); await page.waitForTimeout(100);
  const fill = async (label, v) => { const ta = page.locator(`label:has-text("${label}") textarea`).first(); await ta.fill(v); };
  await fill("찾을 패턴", "(\\d+)-(\\d+)"); await fill("바꿀 내용", "$2-$1");
  await page.locator("textarea[aria-label='정규식 시험 입력']").fill("a 12-34 b 5-6"); await page.waitForTimeout(250);
  ok(`[${tag}] 바로 시험: 일치 2곳`, (await page.locator(".rb-rx-in mark").count()) === 2 && (await page.locator("[aria-live=polite]").filter({ hasText: "일치 2곳" }).count()) >= 1);
  ok(`[${tag}] 위치·캡처 그룹 표시`, (await page.locator(".rb-rx-lines").textContent()).includes("$1=「12」") && (await page.locator(".rb-rx-lines").textContent()).includes("$2=「34」"));
  ok(`[${tag}] 바뀐 결과`, (await page.locator(".rb-rx-out").textContent()) === "a 34-12 b 6-5", await page.locator(".rb-rx-out").textContent());
  await fill("찾을 패턴", "(["); await page.waitForTimeout(250);
  ok(`[${tag}] 잘못된 패턴은 오류 안내`, /오류|잘못/.test(await page.locator(".rb-form [aria-live=polite]").last().textContent()));
  await fill("찾을 패턴", "zzz"); await page.waitForTimeout(250);
  ok(`[${tag}] 일치 없음 안내`, (await page.locator(".rb-form [aria-live=polite]").last().textContent()).includes("일치하는 곳이 없어요"));
  const rxAdv = page.locator(".rb-fold", { hasText: "패턴 검사" }).first();
  ok(`[${tag}] 정규식 카드: 기본·찾아서 바꾸기·바로 시험은 열림, 고급은 접힘`, (await page.locator(".rb-fold").evaluateAll((d) => d.map((x) => x.open))).join() === "true,true,true,false");
  await rxAdv.locator("summary").click();
  ok(`[${tag}] 패턴 검사: 정상 패턴은 문제 없음`, (await rxAdv.textContent()).includes("문제 없음"));
  await fill("찾을 패턴", "(["); await page.waitForTimeout(250);
  ok(`[${tag}] 패턴 검사: 오류 표시`, (await rxAdv.textContent()).includes("패턴 오류"));
  if (mobile) await page.getByRole("button", { name: "목록으로" }).click();
  await page.locator(".rb-seg button", { hasText: "꺼짐" }).click(); await page.waitForTimeout(80);
  ok(`[${tag}] 켜짐/꺼짐 거르기: 꺼짐엔 항목 없음`, (await page.locator(".side .rb-item").count()) === 0);
  await page.locator(".rb-seg button", { hasText: "전체" }).click(); await page.waitForTimeout(80);
  // ── 트리거 ──
  await tab(page, "트리거"); await page.waitForTimeout(80);
  if (mobile) await page.locator(".side .rb-item").first().click().catch(() => {}); await page.waitForTimeout(100);
  ok(`[${tag}] Lua 트리거 표시`, (await page.locator(".rb-kind").first().textContent()).includes("Lua"));
  ok(`[${tag}] 트리거 보기 전환(트리거|초기 변수)`, (await page.locator(".rb-seg button").allTextContents()).join("|").includes("초기 변수"));
  if (mobile) await page.getByRole("button", { name: "목록으로" }).click();
  await page.locator(".rb-seg button", { hasText: "초기 변수" }).click(); await page.waitForTimeout(80);
  ok(`[${tag}] 초기 변수 3줄·중복 경고`, (await page.locator(".rb-var").count()) === 3 && (await page.locator(".rb-note.warn, .rb-note").filter({ hasText: "hp" }).count()) >= 1);
  await page.locator(".rb-var").nth(1).locator("input.v").fill("시로코");
  ok(`[${tag}] 값 고치면 봇 변수에 반영`, (await page.evaluate(() => __ed.draft.defaultVariables)) === "hp=10\nname=시로코\nhp=20");
  await page.locator(".rb-var").nth(2).locator("button").click(); await page.waitForTimeout(40);
  ok(`[${tag}] 변수 지우기`, (await page.evaluate(() => __ed.draft.defaultVariables)) === "hp=10\nname=시로코");
  await page.getByRole("button", { name: "변수 추가" }).click(); await page.waitForTimeout(40);
  await page.locator(".rb-var").last().locator("input.k").fill("mp"); await page.locator(".rb-var").last().locator("input.v").fill("5");
  ok(`[${tag}] 변수 추가`, (await page.evaluate(() => __ed.draft.defaultVariables)) === "hp=10\nname=시로코\nmp=5");
  if (mobile) ok("[모바일] 변수 화면 가로로 안 넘침", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.locator(".rb-seg button", { hasText: "트리거" }).click(); await page.waitForTimeout(80);
  // ── JSON ──
  await tab(page, "JSON"); await page.waitForTimeout(80);
  ok(`[${tag}] JSON 올바름 표시`, (await page.locator(".rb-bar small").textContent()).includes("올바른 JSON"));
  const ta = page.locator("textarea[aria-label='전체 JSON']");
  await ta.fill('{\n  "a": 1,\n  "b": }\n'); await page.waitForTimeout(300);
  ok(`[${tag}] 문법 오류 + 줄 번호`, /문법 오류/.test(await page.locator(".rb-bar small").textContent()), await page.locator(".rb-bar small").textContent());
  await ta.fill('{"name":"x","desc":"y"}'); await page.waitForTimeout(300);
  await page.getByRole("button", { name: "서식 정리" }).click();
  ok(`[${tag}] 서식 정리`, (await ta.inputValue()).includes('\n  "name"'));
  ok(`[${tag}] 복사 버튼`, (await page.getByRole("button", { name: "복사" }).count()) === 1);
  ok(`[${tag}] 오류 없음`, !logs.length, logs.join(";")); await ctx.close();
}
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
