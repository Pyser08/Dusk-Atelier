// 위젯 홈 × 리스 화면(가짜 SafeDocument): 홈이면 사이드바 옆 본문 자리에 배치, 캐릭터를 고르면 닫히고 홈으로 돌아오면 다시 뜸.
// Dusk 디자인·설정 창 스타일·바깥 누르면 닫기도 확인.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/widgethome.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"t"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const b = await chromium.launch(), errs = [];
const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage(); p.setDefaultTimeout(8000);
p.on("pageerror", (e) => errs.push(e.message));
await p.setContent(`<!doctype html><body style="margin:0"><div id="app" style="display:flex;height:100vh"><div class="risu-sidebar" style="width:240px;flex-shrink:0;background:#222">사이드바<button id="home">홈</button></div><div id="main" style="flex:1;min-width:0;background:#333"><h2>Welcome</h2></div></div><iframe id="pf" srcdoc="<b>dusk-widgethome-open</b>" style="display:none"></iframe></body>`);
await p.addScriptTag({ content: r.outputFiles[0].text });
await p.evaluate(async () => {
  window.sel = -1;
  window.api = makeApi({ localStorage: true });
  api.getCurrentCharacterIndex = async () => window.sel;
  api.getRootDocument = async () => fakeRoot();
  api.createMutationObserver = async (cb) => ({ observe: async () => {}, disconnect: async () => {} });
  window.wh = makeWH(api); await wh.set(true);
});
const frameBox = () => p.evaluate(() => { const f = document.getElementById("pf"), s = getComputedStyle(f); return { left: Math.round(parseFloat(s.left)), width: Math.round(parseFloat(s.width)), vis: s.visibility, pos: s.position, disp: s.display }; });
await p.waitForFunction(() => wh.isVisible(), null, { timeout: 8000 }).catch(() => {});
await p.waitForTimeout(1200);
let fb = await frameBox();
ok("홈(캐릭터 안 고름)이면 자동으로 사이드바 옆 자리에 뜸", await p.evaluate(() => wh.isVisible()) && fb.pos === "fixed" && fb.left === 240 && fb.width === 960 && fb.vis === "visible", JSON.stringify(fb));
ok("본문(원래 홈)은 가려지고 사이드바는 그대로", await p.evaluate(() => getComputedStyle(document.getElementById("main")).visibility === "hidden" && getComputedStyle(document.querySelector(".risu-sidebar")).visibility === "visible"));
await p.evaluate(() => { window.sel = 3; });
await p.waitForFunction(() => !wh.isVisible(), null, { timeout: 6000 }).catch(() => {});
ok("캐릭터를 고르면(채팅으로 가면) 위젯 홈이 닫힘", await p.evaluate(() => !wh.isVisible()));
await p.evaluate(() => { window.sel = -1; });
await p.waitForFunction(() => wh.isVisible(), null, { timeout: 9000 }).catch(() => {});
await p.waitForTimeout(600);
fb = await frameBox();
ok("사이드바에서 홈으로 돌아오면 다시 자동으로 뜸", await p.evaluate(() => wh.isVisible()) && fb.left === 240, JSON.stringify(fb));
// 리스바드 설정 화면(설정 검색 입력칸)으로 가면 닫히고, 나오면 다시 뜸
await p.evaluate(() => { const i = document.createElement("input"); i.id = "sset"; i.placeholder = "설정 검색..."; document.getElementById("main").before(i); });
await p.waitForFunction(() => !wh.isVisible(), null, { timeout: 6000 }).catch(() => {});
ok("설정 화면이 열리면 위젯 홈이 닫힘", await p.evaluate(() => !wh.isVisible()));
await p.evaluate(() => document.getElementById("sset").remove());
await p.waitForFunction(() => wh.isVisible(), null, { timeout: 9000 }).catch(() => {});
await p.waitForTimeout(600);
ok("설정에서 나오면 다시 뜸", await p.evaluate(() => wh.isVisible()));
// 사이드바를 닫으면(너비 0) 본문이 넓어지고 위젯도 따라 넓어짐
await p.evaluate(() => { document.querySelector(".risu-sidebar").style.width = "60px"; });
await p.waitForTimeout(2600);
fb = await frameBox();
ok("사이드바 크기가 바뀌면 위젯 자리도 따라감", fb.left === 60 && fb.width === 1140, JSON.stringify(fb));
// 리스바드: 사이드바 = 좁은 아이콘 줄(44px) + 최근 대화 칸 → 아이콘 줄 바로 오른쪽부터 끝까지 덮음
await p.evaluate(() => { const sb = document.querySelector(".risu-sidebar"); sb.style.width = "300px"; sb.style.display = "flex"; const r = document.createElement("div"); r.style.cssText = "width:44px;height:100%;flex-shrink:0;background:#111"; sb.prepend(r); });
await p.waitForTimeout(2600);
fb = await frameBox();
ok("아이콘 줄(44px)만 남기고 최근 대화 칸까지 덮음", fb.left === 44 && fb.width === 1156, JSON.stringify(fb));
// 설정 시트(누르면 바로 적용·저장)
const S = (js) => p.evaluate(js);
await S(() => document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".tools-open").click()); await p.waitForTimeout(250);
ok("설정 버튼 → 설정 시트가 열림", await S(() => !document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".qs").hidden));
const pr = await S(async () => {
  const sr = document.querySelector("[data-dusk-widgethome]").shadowRoot;
  const n = sr.querySelectorAll(".sw[data-preset]").length;
  sr.querySelector('.sw[data-preset="sakura"]').click(); await new Promise((r) => setTimeout(r, 150));
  const accent = getComputedStyle(sr.querySelector(".memo-card")).getPropertyValue("--accent").trim();
  const st = api.mem.get("pocketrisu.basic-home.v1.settings");
  sr.querySelector('.qs .seg[data-key="surface"] [data-v="dusk"]').click(); await new Promise((r) => setTimeout(r, 120));
  return { n, accent, preset: st.themePreset, follow: st.followTheme, surface: sr.querySelector(".app").dataset.surface, pressed: sr.querySelector('.sw[data-preset="sakura"]').getAttribute("aria-pressed") };
});
ok("색 프리셋 15개 이상 · 누르면 바로 적용·저장", pr.n >= 17 && pr.accent === "#f49ac1" && pr.preset === "sakura" && pr.follow === false && pr.pressed === "true" && pr.surface === "dusk", JSON.stringify(pr));
const wd = await S(async () => {
  const sr = document.querySelector("[data-dusk-widgethome]").shadowRoot;
  sr.querySelector('.qs-tabs [data-tab="widgets"]').click();
  const c = sr.querySelector('.qs-w[data-w="timer"]'); c.click(); await new Promise((r) => setTimeout(r, 200));
  const hid = sr.querySelector(".timer-card").hidden || getComputedStyle(sr.querySelector(".timer-card")).display === "none";
  c.click(); await new Promise((r) => setTimeout(r, 200));
  const back = !(sr.querySelector(".timer-card").hidden || getComputedStyle(sr.querySelector(".timer-card")).display === "none");
  sr.querySelector('.qs .seg[data-key="clock"] [data-v="digital"]').click(); await new Promise((r) => setTimeout(r, 120));
  return { hid, back, clock: !sr.querySelector(".digital-view").hidden, sw: getComputedStyle(c).appearance };
});
ok("위젯 끄고 켜기·시계 모양 바로 반영", wd.hid && wd.back && wd.clock && wd.sw === "none", JSON.stringify(wd));
const hm = await S(async () => {
  const sr = document.querySelector("[data-dusk-widgethome]").shadowRoot;
  sr.querySelector('.qs-tabs [data-tab="home"]').click();
  const t = sr.querySelector(".qs-title"); t.value = "어서 와요"; t.dispatchEvent(new Event("change")); await new Promise((r) => setTimeout(r, 150));
  return sr.querySelector(".greeting-title").textContent;
});
ok("제목 문구 바로 바뀜", hm === "어서 와요", hm);
await p.mouse.click(10, 400); await p.waitForTimeout(200);
ok("바깥을 누르면 시트가 닫힘", await S(() => document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".qs").hidden));
ok("홈 자동 열기 끄기도 저장", await S(async () => { await wh.setPrefs({ autoHome: false }); return wh.prefs().autoHome === false; }));
ok("페이지 오류 없음", errs.length === 0, errs.join(" / "));
await b.close(); process.exit(out.every(Boolean) ? 0 : 1);
