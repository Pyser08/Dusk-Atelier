// 꾸미기 화면(1.8.3): 테마 묶음 12 · 강조 색 18 · 그라데이션 8+방향 · 밝기 4 · 글자 크기 4 · 모양/글꼴 · 내 테마 · 코드 주고받기 (실제 클릭)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const errs = [];
for (const [tag, vp] of [["PC", { width: 1280, height: 800 }], ["모바일", { width: 390, height: 780 }]]) {
  const page = await (await browser.newContext({ viewport: vp, ...tag === "모바일" ? { hasTouch: true, isMobile: true } : {} })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }));
  await page.waitForTimeout(300);
  if (tag === "PC") await page.locator(".rb-nav a", { hasText: "꾸미기" }).click();
  else { await page.evaluate(() => [...document.querySelectorAll(".rb-tabbar a")].find((a) => a.textContent.trim().startsWith("작업실")).click()); await page.waitForTimeout(250); await page.locator(".rb-section-tile", { hasText: "플러그인 꾸미기" }).click(); }
  await page.waitForTimeout(300);
  const look = ".rb-mem2[data-page=look]";
  const ui = () => page.evaluate(() => JSON.parse(__api.store["rbm:ui:v1"] ?? "{}"));
  const flush = () => page.waitForTimeout(500);
  ok(`[${tag}] 테마 묶음 12 + 아무거나`, (await page.locator(`${look} .rb-setpick`).count()) === 13);
  ok(`[${tag}] 강조 색 18 · 그라데이션 없음+8`, (await page.locator(`${look} .rb-accgroup:nth-child(-n+3) .rb-accpick`).count()) === 18 && (await page.locator(`${look} .rb-grads, ${look} .rb-lfield .rb-accpick[aria-label$='그라데이션']`).count()) === 8);
  ok(`[${tag}] 밝기 4칸 · 글자 크기 4칸`, (await page.locator(`${look} .rb-seg[aria-label=밝기] button`).allTextContents()).join("|") === "자동|밝게|어둡게|시간 따라" && (await page.locator(`${look} .rb-seg[aria-label='글자 크기'] button`).allTextContents()).join("|") === "작게|보통|크게|아주 크게");
  await page.locator(`${look} .rb-setpick`, { hasText: "미드나잇" }).click(); await flush();
  const t1 = (await ui()).theme;
  ok(`[${tag}] 테마 묶음을 누르면 바탕+밝기+강조가 함께 바뀌고 저장`, t1.set === "midnight" && t1.mode === "dark" && (await page.evaluate(() => getComputedStyle(document.querySelector(".rb-win")).backgroundColor)) === "rgb(15, 20, 36)", JSON.stringify(t1));
  await page.locator(`${look} .rb-lfield .rb-accpick[aria-label='노을 그라데이션']`).click();
  await page.locator(`${look} .rb-seg[aria-label='그라데이션 방향'] button`, { hasText: "세로" }).click(); await flush();
  const t2 = (await ui()).theme;
  ok(`[${tag}] 그라데이션+방향 저장·적용`, t2.grad === "sunset" && t2.dir === "v" && (await page.evaluate(() => getComputedStyle(document.querySelector(".rb-win")).getPropertyValue("--rb-acc-grad"))).includes("180deg"), JSON.stringify(t2));
  await page.locator(`${look} .rb-accpick`, { hasText: "분홍" }).click(); await flush();
  ok(`[${tag}] 강조 색을 고르면 그라데이션은 풀리고 묶음 바탕은 유지`, (await ui()).theme.grad === "" && (await ui()).theme.set === "midnight" && (await ui()).theme.preset === "p-pink");
  await page.locator(`${look} #rb-look-shape summary`).click();
  await page.locator(`${look} .rb-seg[aria-label=모서리] button`, { hasText: "둥글게" }).click();
  await page.locator(`${look} .rb-seg[aria-label=글꼴] button`, { hasText: "명조" }).click();
  await page.locator(`${look} .rb-seg[aria-label='바탕 무늬'] button`, { hasText: "점" }).click(); await flush();
  const t3 = (await ui()).theme;
  ok(`[${tag}] 모양·글꼴·무늬 저장`, t3.round === "round" && t3.font === "serif" && t3.pattern === "dots");
  ok(`[${tag}] 모양이 화면에 적용(모서리 값 · 글꼴 · 무늬)`, await page.evaluate(() => { const w = document.querySelector(".rb-win"), c = getComputedStyle(w); return c.getPropertyValue("--rb-r2") === "18px" && /serif/.test(c.fontFamily) && /radial-gradient/.test(c.getPropertyValue("--rb-pattern")); }));
  await page.locator(`${look} .rb-seg[aria-label=밝기] button`, { hasText: "시간 따라" }).click(); await flush();
  ok(`[${tag}] 밝기 '시간 따라' 저장`, (await ui()).theme.mode === "time");
  await page.locator(`${look} .rb-seg[aria-label='미리보기 밝기'] button`, { hasText: "밝게" }).click();
  ok(`[${tag}] 미리보기를 '밝게'로 바꾸면 미리보기 카드만 밝은 색`, await page.evaluate(() => getComputedStyle(document.querySelector(".rb-look-prev")).getPropertyValue("--rb-win").trim() === "#ffffff" || getComputedStyle(document.querySelector(".rb-look-prev")).getPropertyValue("--rb-surf").trim() === "#ffffff"));
  // 내 테마
  await page.locator(`${look} #rb-mine-save`).click();
  ok(`[${tag}] 이름 없이 저장하면 안내`, /이름을 먼저/.test(await page.locator(`${look} #rb-look-mine small`).last().textContent()));
  await page.locator(`${look} #rb-look-mine input[type=text]`).fill("밤 분홍");
  await page.locator(`${look} #rb-mine-save`).click(); await flush();
  ok(`[${tag}] 내 테마 저장`, (await ui()).theme.mine?.length === 1 && (await page.locator(`${look} .rb-mine`).count()) === 1);
  await page.locator(`${look} .rb-setpick`, { hasText: "벚꽃" }).click(); await flush();
  await page.locator(`${look} .rb-mine-name`).click(); await flush();
  ok(`[${tag}] 내 테마 눌러 되돌리기`, (await ui()).theme.set === "midnight" && (await ui()).theme.round === "round");
  await page.locator(`${look} .rb-mine .rb-chip`, { hasText: "어두울 때" }).click(); await flush();
  ok(`[${tag}] 어두울 때 따로 쓰기 저장`, !!(await ui()).theme.useDark);
  // 코드 주고받기
  await page.locator(`${look} #rb-mine-copy`).click(); await page.waitForTimeout(200);
  const note = await page.locator(`${look} #rb-look-mine small`).last().textContent();
  ok(`[${tag}] 코드 복사 안내(또는 코드 표시)`, /복사했어요|DA1:/.test(note), note);
  await page.locator(`${look} #rb-look-mine textarea`).fill("DA1:%%%");
  await page.locator(`${look} #rb-mine-load`).click();
  ok(`[${tag}] 잘못된 코드는 안내만`, /읽지 못했어요/.test(await page.locator(`${look} #rb-look-mine small`).last().textContent()));
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
