// '나' 화면 · 페르소나 이름 합치기 · 주사위 기록 · 채팅 메뉴 빠른 설정 줄 (실제 클릭)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [tag, vp] of [["PC", { width: 1280, height: 900 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { memory: true, story: true }));
  await page.waitForTimeout(500);
  // 페르소나 이름 'Sensei'로 따로 쌓인 인물·감정을 넣는다
  await page.evaluate(async () => {
    const g = __api.getDatabase; __api.getDatabase = async (k) => ({ ...(await g(k)), username: "Sensei" });
    await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => {
      f.people.sensei = { name: "Sensei", aliases: [], records: [{ id: "u1", act: "시로코에게 인사했다", g: "C", at: 1, orphan: false }] };
      f.emo = { ...(f.emo ?? {}), "시로코>sensei": { from: "시로코", to: "Sensei", tags: { trust: 6, affection: 5 }, log: [] } };
      f.talk = { ...(f.talk ?? {}), "시로코>sensei": { from: "시로코", to: "Sensei", call: "선생님", tone: "formal", at_ms: 1 } };
      f.scenes = [...(f.scenes ?? []), { id: "sx", who: ["Sensei", "시로코"], orphan: false, at: 1 }];
    });
  });
  await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(600);
  ok(`[${tag}] 기억 홈에 '나에 대한 기억' 줄`, (await page.locator("#rb-mem-go-me").count()) === 1);
  await page.locator("#rb-mem-go-me").click(); await page.waitForTimeout(500);
  ok(`[${tag}] '나' 화면 + 합치기 카드(Sensei 기록 1개)`, (await page.locator(".rb-me-merge").count()) === 1 && /Sensei/.test(await page.locator(".rb-me-merge").textContent()));
  await page.locator("#rb-me-merge").click(); await page.waitForTimeout(200);
  await page.locator(".rb-dialog button", { hasText: "합치기" }).click(); await page.waitForTimeout(600);
  const f = await page.evaluate(async () => { const x = await __app.ctx.memory.store.getFolder("c1", "t1"); return { keys: Object.keys(x.people), emo: Object.keys(x.emo ?? {}) }; });
  ok(`[${tag}] 합친 뒤 Sensei 인물이 사라지고 {{user}}로`, !f.keys.includes("sensei") && f.keys.includes("{{user}}") && f.emo.includes("시로코>{{user}}"), JSON.stringify(f));
  ok(`[${tag}] 합친 뒤 합치기 카드 없음 · 시로코 카드(호칭 선생님·감정 막대)`, (await page.locator(".rb-me-merge").count()) === 0 && /선생님/.test(await page.locator(".rb-me-card[data-who='시로코']").textContent()) && (await page.locator(".rb-me-card[data-who='시로코'] .rb-wk2-bar").count()) >= 2);
  await page.locator(".rb-me-card[data-who='시로코'] .rb-me-foot .rb-btn").click(); await page.waitForTimeout(200);
  await page.locator(".rb-me-dlg input[aria-label='나를 부르는 말']").fill("쌤");
  await page.locator(".rb-me-dlg input[aria-label='애정']").fill("11");
  await page.locator("#rb-me-save").click(); await page.waitForTimeout(150);
  ok(`[${tag}] 고치기: 범위 밖 수치는 경고`, (await page.locator(".rb-me-dlg .rb-note.warn").count()) === 1);
  await page.locator(".rb-me-dlg input[aria-label='애정']").fill("9");
  await page.locator("#rb-me-save").click(); await page.waitForTimeout(600);
  const ed = await page.evaluate(async () => { const x = await __app.ctx.memory.store.getFolder("c1", "t1"); return { talk: x.talk["시로코>{{user}}"], emo: x.emo["시로코>{{user}}"] }; });
  ok(`[${tag}] 고치기: 호칭·감정 저장되고 잠김`, ed.talk?.call === "쌤" && ed.talk?.lock === true && ed.emo?.tags?.affection === 9 && ed.emo?.lock?.affection === true, JSON.stringify(ed));
  ok(`[${tag}] 고친 값이 카드에 바로`, /쌤/.test(await page.locator(".rb-me-card[data-who='시로코']").textContent()));
  ok(`[${tag}] 가로 넘침 없음`, await page.evaluate(() => { const el = document.querySelector(".rb-me"); return el.scrollWidth <= el.clientWidth + 1; }));
  // 주사위 기록
  await page.evaluate(() => __api.pluginStorage.setItem("dusk-dice-log", JSON.stringify({ v: 1, recs: [{ at: Date.now(), rolls: [90, 10, 52], cuts: { easy: 20, normal: 50, hard: 75, extreme: 95 }, chaId: "c1", chatId: "t1", botName: "시로코", chatName: "교실 이야기" }] })));
  await page.evaluate(() => __app.ctx.go("home")); await page.waitForTimeout(500);
  await page.locator("#rb-dice-row").click(); await page.waitForTimeout(200);
  await page.locator("#rb-dice-logbtn").click(); await page.waitForTimeout(400);
  ok(`[${tag}] 최근 판정 기록: 굴림 3 · 칩 3개`, (await page.locator(".rb-dlog .rb-dlog-row .roll").count()) === 3 && /3\s*굴림/.test(await page.locator(".rb-dlog-stat").textContent()), await page.locator(".rb-dlog").textContent());
  await page.locator(".rb-dlog .btns button", { hasText: "기록 지우기" }).click(); await page.waitForTimeout(300);
  ok(`[${tag}] 기록 지우기`, (await page.locator(".rb-dlog .rb-dlog-row").count()) === 0);
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
  await page.context().close();
}
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
