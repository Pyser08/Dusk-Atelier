// 스크롤 튐 시험: 중간까지 스크롤한 뒤 ① 화면 다시 그리기 ② 안쪽이 잠깐 '불러오는 중'으로 짧아졌다 채워짐 ③ 스위치 누르기 → 위치 유지.
// NOGUARD=1 이면 지킴이를 끄고 돌린다(버그 재현 확인용). node tests/e2e/run-scrollkeep.mjs
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const mobile of [false, true]) {
  const tag = mobile ? "모바일" : "PC";
  const page = await (await browser.newContext(mobile ? { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true } : { viewport: { width: 1200, height: 760 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true, mods: true }));
  await page.waitForTimeout(300);
  if (process.env.NOGUARD) await page.evaluate(() => document.querySelector(".rb-win").__scrollGuard?.dispose());
  await page.evaluate(() => window.__app.ctx.go("memory")); await page.waitForTimeout(900);
  // 실제로 스크롤되는 영역 찾기 + 휠로 중간까지
  const box = await page.evaluate(() => { const n = [...document.querySelectorAll(".rb-main,.rb-main .rb-scroll")].filter((x) => x.scrollHeight > x.clientHeight + 300).sort((a, b) => b.scrollHeight - a.scrollHeight)[0]; if (!n) return null; n.setAttribute("data-t-scroller", ""); const b = n.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + Math.min(b.height / 2, 300), h: n.scrollHeight, c: n.clientHeight }; });
  if (!box) { ok(`[${tag}] 긴 스크롤 영역 있음`, false); continue; }
  await page.mouse.move(box.x, box.y);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(60); }
  await page.waitForTimeout(800);   // 휠 의도 시간 지나기
  const top = () => page.evaluate(() => document.querySelector("[data-t-scroller]")?.scrollTop ?? document.querySelector(".rb-main [data-t-scroller], .rb-main")?.scrollTop ?? -1);
  const cur = () => page.evaluate(() => { const n = [...document.querySelectorAll(".rb-main,.rb-main .rb-scroll")].sort((a, b) => b.scrollTop - a.scrollTop)[0]; return n?.scrollTop ?? 0; });
  const t0 = await top();
  ok(`[${tag}] 중간까지 스크롤됨`, t0 > 600, t0);
  // ① 화면 다시 그리기(설정 저장·자동 새로고침과 같은 경로)
  await page.evaluate(() => window.__app.ctx.refresh()); await page.waitForTimeout(900);
  const t1 = await cur(); ok(`[${tag}] 다시 그리기 뒤 위치 유지`, Math.abs(t1 - t0) < 40, `${t0} → ${t1}`);
  // ② 안쪽이 잠깐 짧아졌다가(불러오는 중) 나중에 채워짐
  await page.evaluate(async () => { const m = document.querySelector(".rb-main"); const kids = [...m.childNodes]; const hold = document.createElement("div"); hold.textContent = "불러오는 중"; m.replaceChildren(hold); await new Promise((res) => setTimeout(res, 300)); m.replaceChildren(...kids); });
  await page.waitForTimeout(500);
  const t2 = await cur(); ok(`[${tag}] 불러오는 중을 거친 뒤 위치 유지`, Math.abs(t2 - t0) < 40, `${t0} → ${t2}`);
  // ③ 보이는 스위치 누르기
  const clicked = await page.evaluate(() => { const vh = innerHeight; const s = [...document.querySelectorAll(".rb-main [role=switch]")].find((x) => { const b = x.getBoundingClientRect(); return b.top > 80 && b.bottom < vh - 80 && !x.disabled; }); if (!s) return false; s.click(); return true; });
  await page.waitForTimeout(1200);
  const t3 = await cur(); ok(`[${tag}] 스위치를 눌러도 위치 유지`, !clicked || Math.abs(t3 - t0) < 80, `${t0} → ${t3} (clicked ${clicked})`);
  // ④ 직접 위로 굴리면 그 자리 그대로(지킴이가 끌어내리지 않음)
  await page.mouse.wheel(0, -100000); await page.waitForTimeout(300); await page.evaluate(() => window.__app.ctx.refresh()); await page.waitForTimeout(900);
  const t4 = await cur(); ok(`[${tag}] 직접 맨 위로 올리면 맨 위 유지`, t4 < 40, t4);
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
