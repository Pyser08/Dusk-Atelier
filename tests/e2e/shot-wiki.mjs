// 인물 위키 상세 스크린샷(시험용 데이터 채움). OUT=폴더
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const OUT = process.env.OUT || "/tmp";
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const browser = await chromium.launch();
for (const [tag, vp] of [["pc", { width: 1280, height: +(process.env.H||860) }], ["m", { width: 390, height: +(process.env.H||844) }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true, host: true }));
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    const L = window.__testLib;
    let w = L.createEmptyWikiScope({ characterId: "c1", chatKey: "t1" });
    for (const n of ["시로코", "세라", "유나"]) w = L.createBlankPerson(w, n);
    const rec = (id, act, g, at) => ({ id, act, g, at, at_ms: 1700000000000 + at, orphan: false, user: false, pin: false });
    await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => {
      f.wiki = w;
      f.people["시로코"] = { name: "시로코", records: [rec("a1", "세라와 함께 옥상에서 도시락을 먹었다", "A", 3), rec("a2", "유나에게 길을 알려 줬다", "C", 5), rec("a3", "세라에게 고백했다", "A", 8)] };
      f.people["세라"] = { name: "세라", records: [rec("b1", "시로코의 고백을 받아들였다", "A", 9)] };
      f.people["유나"] = { name: "유나", records: [rec("c1", "시로코를 몰래 지켜봤다", "B", 6)] };
      f.lovers = { "세라|시로코": { on: true, a: "시로코", b: "세라", kind: "애인" } };
      f.emo = { "시로코>세라": { from: "시로코", to: "세라", tags: { affection: 7, attraction: 8, trust: 6, possess: 4, exclusive: 3 }, log: [] }, "세라>시로코": { from: "세라", to: "시로코", tags: { affection: 6, attraction: 7 }, log: [] }, "유나>시로코": { from: "유나", to: "시로코", tags: { attraction: 6 }, log: [] } };
    }, { chaId: "c1", chatId: "t1" });
  });
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem ??= {}, { botId: "c1", chatIndex: 0, personKey: "시로코", tab: "people", page: "detail" }); __app.ctx.go("memory"); });
  await page.waitForTimeout(1500);
  for (const t of ["sum", "rel", "info", "nsfw", "log"]) {
    const b = page.locator(`.rb-wk2-tab[data-t=${t}]`).first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(400); }
    await page.screenshot({ path: `${OUT}/wiki-${tag}-${t}.png`, fullPage: true });
  }
  console.log(tag, errs.length ? errs.join("|") : "ok");
}
await browser.close();
