// 2.2.0 홈 F안: 위젯 격자 — 꾸미기 중에만 끌기, 칸에 붙기, 겹침 없음, 크기 바꾸기, 숨기기·다시 넣기, 저장, 글래스 화면
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const errs = [];
const SHOTS = process.env.SHOTS;
for (const [tag, vp, cols] of [["PC", { width: 1280, height: 860 }, 6], ["모바일", { width: 390, height: 844 }, 2]]) {
  const page = await (await browser.newContext({ viewport: vp, ...tag === "모바일" ? { hasTouch: true, isMobile: true } : {} })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true, theme: { mode: "dark" } }) }, { memory: true, story: true, mods: true }));
  await page.waitForTimeout(800);
  const boxes = () => page.evaluate(() => [...document.querySelectorAll(".rb-hgrid2 .rb-hw")].map((b) => { const r = b.getBoundingClientRect(); return { id: b.dataset.w, x: r.x, y: r.y, w: r.width, h: r.height, size: b.dataset.size }; }));
  const noOverlap = (L) => !L.some((a, i) => L.some((b, j) => j > i && a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1));
  const saved = () => page.evaluate((c) => JSON.parse(__api.store["rbm:ui:v1"] ?? "{}").homeGrid?.[c] ?? null, cols).catch(() => null);
  ok(`[${tag}] 글래스 화면 켜짐(어두운 모드)`, await page.evaluate(() => document.querySelector(".rb-win").classList.contains("rb-skin-glass")));
  if (tag === "모바일") ok("[모바일] ‘홈 꾸미기’가 제목과 같은 줄 오른쪽(빈 줄 없음)", await page.evaluate(() => { const e = document.querySelector("#rb-home-edit").getBoundingClientRect(), t = document.querySelector(".rb-hfocus .rb-hhead").getBoundingClientRect(); return e.top < t.bottom && e.left > t.left + t.width / 2; }));
  ok(`[${tag}] 홈 화면 둘러보기 단계가 가리키는 칸이 모두 있음`, await page.evaluate(() => [".rb-hstats", "#rb-home-find", ".rb-hw[data-w=imp]", ".rb-hrecent", "#rb-home-edit", "#rb-home-tour", "#rb-help-btn"].every((q) => document.querySelector(q))));
  ok(`[${tag}] 포커스 머리: 제목·장기 기억 줄·찾기 칸·꾸미기 버튼`, await page.evaluate(() => !!document.querySelector(".rb-hfocus .rb-hhead h1") && !!document.querySelector(".rb-hfocus .rb-hstat-memory") && !!document.querySelector("#rb-home-find") && !!document.querySelector("#rb-home-edit")));
  let L = await boxes();
  ok(`[${tag}] 위젯 ${L.length}개 겹치지 않음`, L.length >= 11 && noOverlap(L), JSON.stringify(L.map((b) => b.id)));
  // 꾸미기 전에는 끌어도 안 움직이고 바로가기는 눌린다
  const imp0 = L.find((b) => b.id === "n3");
  await page.mouse.move(imp0.x + 20, imp0.y + 20); await page.mouse.down(); await page.mouse.move(imp0.x + 20, imp0.y + 300, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(300);
  ok(`[${tag}] 꾸미기 전에는 끌어도 그대로`, (await boxes()).find((b) => b.id === "n3").y === imp0.y);
  await page.addStyleTag({ content: ".rb-toasts{display:none!important}" });   // 알림이 위젯 위를 덮지 않게
  await page.locator("#rb-home-edit").click(); await page.waitForTimeout(250);
  ok(`[${tag}] 꾸미기: 버튼 '다 했어요' · 숨긴 위젯 줄`, (await page.locator("#rb-home-edit").textContent()) === "다 했어요" && await page.locator(".rb-htray").isVisible());
  // 끌기: 숫자 위젯을 아래로 한참 → 칸에 붙고 겹침 없음
  await page.locator(".rb-hw[data-w=n1]").scrollIntoViewIfNeeded();
  L = await boxes();
  const n1 = L.find((b) => b.id === "n1");
  await page.mouse.move(n1.x + n1.w / 2, n1.y + n1.h / 2); await page.mouse.down(); await page.mouse.move(n1.x + n1.w / 2 + 7, n1.y + n1.h / 2 - 500, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(350);
  L = await boxes();
  const n1b = L.find((b) => b.id === "n1");
  ok(`[${tag}] 끌어 옮기면 맨 위 칸에 붙음`, Math.abs(n1b.y - L.reduce((m, b) => Math.min(m, b.y), 1e9)) < 2, JSON.stringify(n1b));
  ok(`[${tag}] 옮긴 뒤에도 겹침 없음`, noOverlap(L));
  // 크기: 최근 기록 모서리를 오른쪽 아래로
  await page.locator(".rb-hw[data-w=rec] .rb-hw-size").scrollIntoViewIfNeeded();
  L = await boxes();
  const rec = L.find((b) => b.id === "rec");
  const sz = await page.locator(".rb-hw[data-w=rec] .rb-hw-size").boundingBox();
  await page.mouse.move(sz.x + 8, sz.y + 8); await page.mouse.down(); await page.mouse.move(sz.x + 8 + (cols === 6 ? 200 : 0), sz.y + 8 + 120, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(350);
  L = await boxes();
  const rec2 = L.find((b) => b.id === "rec");
  ok(`[${tag}] 모서리로 크기 바꾸기(칸 단위)`, rec2.h > rec.h + 50 && /^\d+x\d+$/.test(rec2.size), `${rec.size} → ${rec2.size}`);
  ok(`[${tag}] 크기 바꾼 뒤 겹침 없음`, noOverlap(L));
  // 숨기기 → 다시 넣기
  await page.locator(".rb-hw[data-w=n2] .rb-hw-rm").click(); await page.waitForTimeout(250);
  ok(`[${tag}] 숨기면 숨긴 위젯 줄에 나옴`, (await page.locator(".rb-hw[data-w=n2]").count()) === 0 && (await page.locator(".rb-htray [data-add=n2]").count()) === 1);
  await page.locator(".rb-htray [data-add=n2]").click(); await page.waitForTimeout(250);
  ok(`[${tag}] 다시 넣기`, (await page.locator(".rb-hw[data-w=n2]").count()) === 1 && noOverlap(await boxes()));
  // 키보드: 화살표로 옮기기
  await page.locator(".rb-hw[data-w=n2]").focus(); const k0 = (await boxes()).find((b) => b.id === "n2");
  await page.keyboard.press("ArrowUp"); await page.keyboard.press("ArrowUp"); await page.waitForTimeout(250);
  ok(`[${tag}] 키보드 화살표로 옮기기`, (await boxes()).find((b) => b.id === "n2").y < k0.y);
  await page.waitForTimeout(500);
  const sv = await saved();
  ok(`[${tag}] 배치 저장(칸 수 ${cols})`, Array.isArray(sv) && sv.some((i) => i.id === "rec"), JSON.stringify(sv)?.slice(0, 80));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-grid-${tag}-edit.png`, fullPage: true });
  await page.locator("#rb-home-edit").click(); await page.waitForTimeout(250);
  ok(`[${tag}] 다 했어요 → 꾸미기 끝`, !(await page.evaluate(() => document.querySelector(".rb-hgrid2").classList.contains("editing"))));
  await page.locator("#rb-home-memory").click(); await page.waitForTimeout(600);
  ok(`[${tag}] 꾸미기 끝난 뒤 바로가기 눌림(기억으로)`, await page.evaluate(() => !document.querySelector(".rb-hgrid2")));
  if (SHOTS) { await page.evaluate(() => [...document.querySelectorAll(".rb-nav a, .rb-tabbar a")].filter((a) => a.offsetParent)[0].click()); await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}/home-grid-${tag}.png`, fullPage: true }); }
  await page.close();
}
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
