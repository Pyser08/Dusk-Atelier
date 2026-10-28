// 로어북 선택 목록: 75개 항목을 화면 폭 5종에서 검사(겹침·가로 넘침 없음) + 체크 후 스크롤 유지. 클라우드 샌드박스: /opt/npm-tools
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/lorereq.entry.js"], bundle: true, write: false, format: "iife", globalName: "T", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [w, hgt] of [[320, 640], [360, 740], [390, 844], [430, 932], [768, 1024]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, hasTouch: w < 700, isMobile: w < 700 }), page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text }); await page.evaluate(() => T.setup());
  await page.locator("#rb-rule-test-fab > button").click(); await page.getByRole("button", { name: "AI 창" }).click(); await page.waitForSelector("#rb-ai-popup");
  const panel = page.locator("#rb-ai-popup .rb-lorereq");
  ok(`[${w}] 로어북 선택 영역이 보임`, await panel.count() === 1);
  await panel.locator("summary").click();
  const head = await panel.locator("summary").textContent();
  ok(`[${w}] 머리글 75/75개`, head.includes("75/75"), head);
  const m = await page.evaluate(() => {
    const list = document.querySelector(".rb-lorereq-list"), rows = [...list.querySelectorAll(".rb-lorereq-item")];
    const lr = list.getBoundingClientRect(), rects = rows.map((x) => x.getBoundingClientRect());
    let overlap = 0, over = 0;
    for (let i = 1; i < rects.length; i++) if (rects[i].top < rects[i - 1].bottom - 0.5) overlap++;
    for (const x of rects) if (x.right > lr.right + 1 || x.left < lr.left - 1) over++;
    return { n: rows.length, overlap, over, scrollW: list.scrollWidth, clientW: list.clientWidth, scrollable: list.scrollHeight > list.clientHeight, listH: lr.height, vh: innerHeight, docOverflow: document.documentElement.scrollWidth > innerWidth + 1, popupOver: (() => { const p = document.querySelector("#rb-ai-popup").getBoundingClientRect(); return p.right > innerWidth + 1 || p.left < -1; })() };
  });
  ok(`[${w}] 75개 항목이 모두 그려짐`, m.n === 75, m.n);
  ok(`[${w}] 항목끼리 겹침 없음`, m.overlap === 0, m.overlap);
  ok(`[${w}] 가로로 넘치지 않음`, m.over === 0 && m.scrollW <= m.clientW + 1 && !m.docOverflow && !m.popupOver, JSON.stringify(m));
  ok(`[${w}] 목록은 안에서 스크롤 가능하고 화면보다 작음`, m.scrollable && m.listH < m.vh, JSON.stringify(m));
  // 스크롤한 뒤 체크 → 스크롤 위치 유지
  const list = page.locator(".rb-lorereq-list");
  await list.evaluate((el) => { el.scrollTop = 900; });
  const before = await list.evaluate((el) => el.scrollTop);
  const box = await page.locator(".rb-lorereq-item").nth(30).evaluate((el) => { el.scrollIntoView({ block: "center" }); return el.querySelector("input").getAttribute("aria-label"); });
  const before2 = await list.evaluate((el) => el.scrollTop);
  await page.locator(".rb-lorereq-item").nth(30).locator("input").click();
  await page.waitForTimeout(150);
  const after = await list.evaluate((el) => el.scrollTop);
  ok(`[${w}] 체크 후 스크롤 위치 유지`, Math.abs(after - before2) <= 1 && before2 > 0, JSON.stringify({ before, before2, after }));
  ok(`[${w}] 체크 해제가 반영됨(74/75)`, (await panel.locator("summary").textContent()).includes("74/75"));
  await page.getByRole("button", { name: "전체 제외" }).click(); await page.waitForTimeout(80);
  ok(`[${w}] 전체 제외 → 0/75`, (await panel.locator("summary").textContent()).includes("0/75"));
  await page.getByRole("button", { name: "전체 포함" }).click(); await page.waitForTimeout(80);
  ok(`[${w}] 전체 포함 → 75/75`, (await panel.locator("summary").textContent()).includes("75/75"));
  ok(`[${w}] 오류 없음`, !errs.length, errs.join(";"));
  await ctx.close();
}
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
