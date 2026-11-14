// 기능 찾기 점검(2.2.0): 모든 항목(FEATURES + 탭)이 적힌 화면(tab·sub·mem)으로 가고, find 제목이 그 화면에 있는지.
// 탭·기능이 새로 생기거나 자리가 바뀌면 src/engine/featurefind.js도 고치고 이 시험을 돌린다.
// 홈 애드온 항목은 애드온 관리자를 켠 두 번째 부팅에서 본다.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
import fs from "node:fs";
import { FEATURES } from "../../src/engine/featurefind.js";
import { TABS } from "../../src/ui/tabs.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const opts = eval("(" + fs.readFileSync("tests/e2e/run-provider.mjs", "utf8").match(/build\((\{ entryPoints[^\n]*?\})\);/)[1] + ")");
const r = await build(opts);
const browser = await chromium.launch();
const tabs = TABS.filter((t) => t.id !== "home" && !t.mobileOnly).map((t) => ({ t: t.label, tab: t.id, isTab: true }));
const RUNS = [
  [{ memory: true, story: true, erosync: true, provider: true, stealth: true }, (f) => f.tab !== "home"],
  [{ addons: true }, (f) => f.tab === "home"]
];
let fails = 0;
for (const [bootOpts, only] of RUNS) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate((o) => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true, uiMode: "advanced", experimental: true, devMode: true }) }, o), bootOpts);
  await page.waitForTimeout(1000);
  for (const f of [...FEATURES, ...tabs].filter(only)) {
    // 앱의 openFeature와 같은 순서: mem 상태 → go → find 제목을 찾는다
    const res = await page.evaluate(async (f) => {
      const ctx = window.__app.ctx;
      ctx.go("home"); await new Promise((r) => setTimeout(r, 150));
      if (f.mem) Object.assign(ctx.state.mem ??= {}, f.mem);
      ctx.go(f.tab, f.sub ?? null);
      let el = null;
      for (let i = 0; i < 24 && f.find; i++) {
        await new Promise((r) => setTimeout(r, 150));
        const all = [...ctx.main.querySelectorAll("h2,h3,h4,summary,legend,b,.t")];
        el = all.find((e) => e.textContent.trim().startsWith(f.find)) ?? all.find((e) => e.textContent.includes(f.find));
        if (el) break;
      }
      if (!f.find) await new Promise((r) => setTimeout(r, 900));
      const st = ctx.state, mem = st.mem ?? {};
      return { tab: st.tab, sub: st.sub, page: mem.page, potTab: mem.potTab, eroTab: mem.eroTab, memTab: mem.memTab, found: f.find ? !!el : null };
    }, f);
    const tabOk = res.tab === f.tab && (f.sub == null || res.sub === f.sub);
    const memOk = !f.mem || Object.entries(f.mem).every(([k, v]) => res[k] === v);
    const bad = !tabOk || !memOk || res.found === false;
    if (bad) fails++;
    console.log(`${bad ? "✘" : "✔"} ${f.t} → ${f.path ?? f.tab}${bad ? `  → 도착 ${JSON.stringify(res)}` : ""}`);
  }
  if (errs.length) { fails++; console.log("✘ 오류", errs.slice(0, 3).join(" ; ")); }
  await page.close();
}
await browser.close();
console.log(fails ? `실패 ${fails}` : "모두 통과");
