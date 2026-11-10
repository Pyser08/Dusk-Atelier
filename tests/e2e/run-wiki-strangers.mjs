// 인물 위키 '로어북에 없는 인물 지우기': 로어북·봇 이름에 없는 인물만 후보로 보이고, 고른 인물만 지워진다(위키 문서 + 같은 인물 장기 기억 기록). PC·모바일.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [tag, vp] of [["PC", { width: 1280, height: 860 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true, host: true }));
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    const api = __app.ctx.api, get0 = api.getCharacterFromIndex.bind(api);
    api.getCharacterFromIndex = async (i) => { const c = await get0(i); if (i === 0) c.globalLore = [{ key: "세라, 세라 선배", comment: "선배", content: "학생회 선배." }]; return c; };
    const L = window.__testLib;
    let w = L.createEmptyWikiScope({ characterId: "c1", chatKey: "t1" });
    for (const n of ["시로코", "세라", "점원", "택배 기사"]) w = L.createBlankPerson(w, n);
    await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => {
      f.wiki = w;
      f.people["점원"] = { name: "점원", records: [{ id: "x1", act: "커피를 건넸다", g: "C", at: 2, at_ms: 1700000000000, orphan: false, user: false, pin: false }] };
    }, { chaId: "c1", chatId: "t1" });
  });
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem ??= {}, { botId: "c1", chatIndex: 0, personKey: "", tab: "people", page: "detail" }); __app.ctx.go("memory"); });
  await page.waitForTimeout(1500);
  const b = page.getByRole("button", { name: "로어북에 없는 인물 지우기" }).first();
  ok(`[${tag}] 버튼이 보임`, (await b.count()) > 0);
  if (!(await b.count())) { await page.screenshot({ path: `/tmp/strangers-${tag}.png`, fullPage: true }); continue; }
  await b.click(); await page.waitForTimeout(600);
  const names = (await page.locator("[data-strangers] label b").allTextContents()).map((x) => x.trim());
  ok(`[${tag}] 후보는 로어북 밖 인물만(점원·택배 기사)`, names.join(",") === "점원,택배 기사", names.join(","));
  await page.screenshot({ path: `/tmp/strangers-dialog-${tag}.png` });
  ok(`[${tag}] 대화창 가로 안 넘침`, !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)));
  await page.locator('[data-strangers] input[type=checkbox]').nth(1).uncheck();   // 택배 기사는 남김
  await page.getByRole("button", { name: "고른 인물 지우기" }).click(); await page.waitForTimeout(800);
  const left = await page.evaluate(async () => { const f = await __app.ctx.memory.store.getFolder("c1", "t1"); return { docs: Object.values(f?.wiki?.documents ?? {}).map((d) => d.title).sort(), people: Object.keys(f?.people ?? {}) }; });
  ok(`[${tag}] 고른 인물(점원)만 지워짐`, left.docs.join(",") === ["세라", "시로코", "택배 기사"].sort().join(","), JSON.stringify(left));
  ok(`[${tag}] 점원의 장기 기억 기록도 지워짐`, !left.people.includes("점원"), JSON.stringify(left.people));
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(" | ").slice(0, 300));
}
await browser.close();
console.log(`\n${out.filter(Boolean).length}/${out.length} 통과`); process.exit(out.every(Boolean) ? 0 : 1);
