// 기억 카드(1.8.3 목업 2): 봇·채팅 한 줄 카드, 만든 카드/새로 만들기 segmented, 단계 동그라미(번호 이중 표시 버그), 이전/다음 오른쪽
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const errs = [];
for (const [tag, vp] of [["PC", { width: 1280, height: 800 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp, ...tag === "모바일" ? { hasTouch: true, isMobile: true } : {} })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:memoryEmbeddingGuide:shown:v1": "1", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, { memory: true, story: true }));
  await page.waitForTimeout(500);
  if (tag === "PC") await page.evaluate(() => [...document.querySelectorAll(".rb-nav a")].find((a) => a.textContent.trim().startsWith("기억 카드")).click());
  else { await page.evaluate(() => [...document.querySelectorAll(".rb-tabbar a")].find((a) => a.textContent.trim().startsWith("기억")).click()); await page.waitForTimeout(300); await page.locator(".rb-hubrow", { hasText: "기억 카드" }).click(); }
  await page.waitForTimeout(900);
  ok(`[${tag}] 봇·채팅 한 줄 카드 + 바꾸기`, (await page.locator(".rb-cards3-pick").count()) === 1 && /시로코/.test(await page.locator(".rb-cards3-pick").textContent()) && (await page.locator(".rb-cards3-pick .rb-btn", { hasText: "바꾸기" }).count()) === 1);
  ok(`[${tag}] 만든 카드 / 새로 만들기 고르기`, (await page.locator(".rb-seg[aria-label='카드 화면'] button").allTextContents()).map((x) => x.replace(/\d+$/, "").trim()).join("|") === "만든 카드|새로 만들기");
  await page.locator(".rb-seg[aria-label='카드 화면'] button", { hasText: "새로 만들기" }).click(); await page.waitForTimeout(700);
  const dup = await page.evaluate(() => { const ol = document.querySelector(".rb-mem-steps"); if (!ol) return "no-steps"; const ls = getComputedStyle(ol).listStyleType; const li = ol.querySelector("li"); return ls !== "none" && /^\s*\d/.test(li.textContent) ? `중복(${ls}: ${li.textContent})` : ""; });
  ok(`[${tag}] 단계 번호가 두 번 보이지 않는다`, dup === "", dup);
  ok(`[${tag}] 단계 동그라미 5개`, (await page.locator(".rb-mem-steps li .n").count()) === 5);
  ok(`[${tag}] 이전/다음은 오른쪽 아래`, await page.evaluate(() => { const b = [...document.querySelectorAll(".rb-compose-nav .rb-btn")].pop(); const host = document.querySelector(".rb-compose-nav"); return !!b && b.getBoundingClientRect().right > host.getBoundingClientRect().right - 40; }));
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
