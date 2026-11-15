// 2.2.0 제보: 탭을 불러오는 중(느린 리스)에 다른 탭으로 가면 창이 얼어붙음(늦게 끝난 화면의 replace가 무한 반복).
// 느린 API를 흉내 내고 탭 A → 0.08초 뒤 B로 옮긴 다음, 페이지가 살아 있고 B 화면이 그려지고 눌리는지 본다.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const errs = [];
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
page.on("pageerror", (e) => errs.push(e.message));
await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ tourDone: true, tourVer: 99, simpleNoticeDone: true }) }, { memory: true, story: true, mods: true }));
await page.waitForTimeout(800);
await page.evaluate(() => { const a = window.__api; for (const k of ["getCharacterFromIndex", "getDatabase", "getCharacters"]) if (a[k]) { const o = a[k].bind(a); a[k] = async (...x) => { await new Promise((res) => setTimeout(res, 1200)); return o(...x); }; } });
const alive = () => Promise.race([page.evaluate(() => 1), new Promise((res) => setTimeout(() => res(0), 4000))]);
for (const [a, b] of [["characters", "memory"], ["characters", "cocoa"], ["modules", "tools"], ["plugins", "settings"], ["memory", "characters"], ["characters", "home"]]) {
  await page.evaluate(([x, y]) => { window.__app.ctx.go(x); setTimeout(() => window.__app.ctx.go(y), 80); }, [a, b]);
  await page.waitForTimeout(1800);
  const live = await alive();
  if (!live) { ok(`${a} 불러오는 중 ${b}로 이동 → 얼지 않음`, false, "페이지 응답 없음"); break; }
  const st = await page.evaluate(() => ({ tab: window.__app.ctx.state.tab, kids: document.querySelector(".rb-main").children.length }));
  ok(`${a} 불러오는 중 ${b}로 이동 → 얼지 않고 ${b} 화면이 그려짐`, st.tab === b && st.kids > 0, JSON.stringify(st));
}
// 홈을 불러오는 중 다른 탭으로 가도 오른쪽 위 검색 칸이 남아 있음(늦게 끝난 홈이 칸을 가져가지 않음)
await page.evaluate(() => { window.__app.ctx.go("home"); setTimeout(() => window.__app.ctx.go("cocoa"), 30); });
await page.waitForTimeout(1800);
ok("홈 불러오는 중 다른 탭으로 가도 오른쪽 위 검색 칸이 있음", await page.evaluate(() => { const i = document.querySelector(".rb-ph-tools .rb-search input"); return !!i && !!i.offsetParent; }));
if (out.every(Boolean)) {
  await page.evaluate(() => window.__app.ctx.go("characters")); await page.evaluate(() => setTimeout(() => window.__app.ctx.go("tools"), 80));
  await page.waitForTimeout(1800);
  await page.evaluate(() => [...document.querySelectorAll(".rb-nav a")].find((x) => x.dataset.tab === "cocoa")?.click()); await page.waitForTimeout(600);
  ok("그 뒤에도 메뉴를 누르면 이동됨(상호작용 됨)", await page.evaluate(() => window.__app.ctx.state.tab === "cocoa"));
}
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
