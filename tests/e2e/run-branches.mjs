// 갈래 보기 탭 · 기억 홈 진입 · 나무 줄 · A/B 고르기 · 호감 비교 (실제 클릭)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const shot = process.env.SHOT_DIR || "/tmp";
const browser = await chromium.launch();
for (const [tag, vp] of [["PC", { width: 1280, height: 900 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true }));
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const S = __app.ctx.memory.store;
    const fill = (tags, extra = {}) => (f) => {
      f.people = { 리안: { name: "리안", aliases: [], records: [1, 4, 7].map((at) => ({ id: `r${at}`, act: `일 ${at}`, g: "B", at, orphan: false })) }, 카엘: { name: "카엘", aliases: [], records: [{ id: "k1", act: "만남", g: "B", at: 2, orphan: false }] } };
      f.emo = { a: { from: "리안", to: "{{user}}", tags, log: [] }, b: { from: "카엘", to: "{{user}}", tags: { trust: 5 }, log: [] } };
      f.cursor = { at: 7 }; Object.assign(f, extra);
    };
    await S.updateFolder("c1", "t1", fill({ affection: 8 }, { chatName: "원래 이야기" }));
    await S.updateFolder("c1", "t2", fill({ hostility: 6 }, { chatName: "배신한 갈래", adoptedFrom: "t1" }));
    await S.updateFolder("c1", "t3", fill({ affection: 4 }, { chatName: "화해한 갈래", adoptedFrom: "t2" }));
  });
  await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(600);
  ok(`[${tag}] 기억 홈에 '갈래 보기' 줄`, (await page.locator("#rb-mem-go-branches").count()) === 1);
  await page.locator("#rb-mem-go-branches").click(); await page.waitForTimeout(800);
  ok(`[${tag}] 갈래 탭 열림`, (await page.locator("[data-page=branches]").count()) === 1);
  ok(`[${tag}] 나무 줄 3개`, (await page.locator(".rb-br-row").count()) === 3);
  ok(`[${tag}] 자식 줄에 갈라진 지점`, /뒤에 갈라짐/.test(await page.locator(".rb-br-tree").textContent()));
  ok(`[${tag}] A·B 처음 골라짐`, (await page.locator(".rb-br-row.is-a").count()) === 1 && (await page.locator(".rb-br-row.is-b").count()) === 1);
  ok(`[${tag}] 비교에 인물 2명`, (await page.locator(".rb-br-p").count()) === 2);
  await page.screenshot({ path: `${shot}/branches-${tag}.png`, fullPage: true });
  await page.locator(".rb-br-row", { hasText: "배신한 갈래" }).click(); await page.waitForTimeout(200);
  const txt = await page.locator(".rb-br-cmp").textContent();
  ok(`[${tag}] 다른 줄 누르면 비교 대상 바뀜`, /배신한 갈래/.test(txt), txt.slice(0, 80));
  ok(`[${tag}] 페이지 오류 없음`, !errs.length, errs.join(" | "));
}
await browser.close();
console.log(out.every(Boolean) ? `\n모두 통과 (${out.length})` : "\n실패 있음"); process.exit(out.every(Boolean) ? 0 : 1);
