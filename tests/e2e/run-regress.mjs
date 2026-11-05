// 회귀: 인물 상세 '⏳ 회귀' → 신비 창 → 인물 고르기 → 시계 연출 → 새 채팅·새 기억 폴더 (실제 클릭)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [tag, vp] of [["PC", { width: 1280, height: 900 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })).newPage(); page.setDefaultTimeout(6000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true }));
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => {
      f.people["카엘"] = { name: "카엘", aliases: [], records: [{ id: "k1", act: "검을 맡겼다", g: "B", at: 2, orphan: false }] };
      for (const p of Object.values(f.people)) if (!(p.records ?? []).length) p.records = [{ id: "x" + p.name, act: `${p.name}의 일`, g: "A", at: 1, orphan: false }];
    });
  });
  // 가짜 api는 봇 저장을 기록만 하므로, 이 시험에선 저장한 값을 다시 읽게 한다
  await page.evaluate(() => { const a = __app.ctx.api, saved = {}, g = a.getCharacterFromIndex.bind(a); a.setCharacterToIndex = async (i, c) => { saved[i] = structuredClone(c); }; a.getCharacterFromIndex = async (i) => (saved[i] ? structuredClone(saved[i]) : g(i)); });
  const key = await page.evaluate(async () => { const f = await __app.ctx.memory.store.getFolder("c1", "t1"); return Object.keys(f.people).find((k) => f.people[k].name === "시로코"); });
  await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(900);
  await page.locator("button, a", { hasText: "인물 위키" }).first().click(); await page.waitForTimeout(900);
  await page.locator("text=시로코").first().click(); await page.waitForTimeout(1000);
  const rb = page.locator(".rb-btn", { hasText: "⏳ 회귀" });
  ok(`[${tag}] 인물 상세에 '⏳ 회귀' 버튼`, (await rb.count()) === 1);
  await rb.click(); await page.waitForTimeout(500);
  ok(`[${tag}] 회귀 창이 열림(시계 SVG·제목)`, (await page.locator(".rb-rg .rb-rg-clock").count()) === 1 && (await page.locator(".rb-rg h3").textContent()) === "회귀");
  ok(`[${tag}] 인물 목록에 시로코·카엘, 시로코가 골라져 있음`, (await page.locator(".rb-rg-p").count()) >= 2 && /시로코/.test(await page.locator(".rb-rg-p[aria-pressed=true]").textContent()));
  ok(`[${tag}] 이름 기본값`, (await page.locator(".rb-rg-field input").inputValue()) === "회귀 · 시로코");
  const w = await page.evaluate(() => { const b = document.querySelector(".rb-rg").getBoundingClientRect(); return { w: b.width, right: b.right, vw: innerWidth, sw: document.documentElement.scrollWidth }; });
  ok(`[${tag}] 화면 밖으로 넘치지 않음`, w.right <= w.vw + 1 && w.sw <= w.vw + 1, JSON.stringify(w));
  await page.screenshot({ path: `/tmp/regress-${tag}.png` });
  await page.locator(".rb-rg-p", { hasText: "카엘" }).click();
  ok(`[${tag}] 여러 명 고르기: 이름에 둘 다`, (await page.locator(".rb-rg-field input").inputValue()) === "회귀 · 시로코 · 카엘" && (await page.locator(".rb-rg-p[aria-pressed=true]").count()) === 2);
  ok(`[${tag}] {{user}}는 목록에 없음`, !(await page.locator(".rb-rg-list").textContent()).includes("{{user}}"));
  await page.locator(".rb-rg-go").click(); await page.waitForTimeout(400);
  ok(`[${tag}] 시계 연출(spinning) + 진행 문구`, (await page.locator(".rb-rg.spinning").count()) === 1 && /되감는|모으는|여는/.test(await page.locator(".rb-rg-fstage").textContent()));
  ok(`[${tag}] 연출 배경은 반투명 검정, 회귀 창은 숨김`, await page.evaluate(() => /rgba\(4, 3, 8, 0\.6/.test(getComputedStyle(document.querySelector(".rb-rg-full")).backgroundColor) && getComputedStyle(document.querySelector(".rb-rg")).opacity === "0"));
  const fb = await page.evaluate(() => { const f = document.querySelector(".rb-rg-full"), c = f?.querySelector(".rb-rg-big")?.getBoundingClientRect(), b = f?.getBoundingClientRect(); return f ? { fw: b.width, fh: b.height, cw: c.width, vw: innerWidth, vh: innerHeight } : null; });
  ok(`[${tag}] 화면 전체를 덮는 큰 시계(화면 짧은 변의 70% 이상)`, !!fb && fb.fw >= fb.vw - 1 && fb.fh >= fb.vh - 1 && fb.cw >= Math.min(fb.vw, fb.vh) * 0.7, JSON.stringify(fb));
  await page.screenshot({ path: `/tmp/regress-${tag}-spin.png` });
  await page.waitForSelector(".rb-rg-full.tick", { timeout: 9000 }); await page.waitForTimeout(350);
  const hands = await page.evaluate(() => [...document.querySelectorAll(".rb-rg-big > g[transform]")].map((g) => g.getAttribute("transform")));
  await page.screenshot({ path: `/tmp/regress-${tag}-tick.png` });
  ok(`[${tag}] 끝날 때 '딸깍' 하며 두 바늘이 12시`, hands.length === 2 && hands.every((t) => /^rotate\(0 100 100\)$/.test(t)), hands.join(" | "));
  await page.waitForTimeout(2600);
  ok(`[${tag}] 끝나면 창과 전체 화면 연출이 닫힘`, (await page.locator(".rb-rg").count()) === 0 && (await page.locator(".rb-rg-full").count()) === 0);
  const res = await page.evaluate(async () => {
    const ch = await __app.ctx.api.getCharacterFromIndex(0), c = ch.chats[0];
    const f = await __app.ctx.memory.store.getFolder("c1", c.id), orig = await __app.ctx.memory.store.getFolder("c1", "t1");
    return { n: ch.chats.length, name: c.name, msgs: c.message.length, people: Object.keys(f?.people ?? {}).map((k) => f.people[k].name), reg: f?.regress?.person, orig: Object.keys(orig.people).length };
  });
  ok(`[${tag}] 새 채팅이 생김(메시지 없음 → 첫 메시지로 시작)`, res.n === 2 && res.name === "회귀 · 시로코 · 카엘" && res.msgs === 0, JSON.stringify(res));
  ok(`[${tag}] 새 기억 폴더엔 고른 둘만, 원래 기억은 그대로`, res.people.sort().join() === "시로코,카엘" && res.reg === "시로코, 카엘" && res.orig >= 2, JSON.stringify(res));
  // 전체 선택 → 이어서 하기
  await page.evaluate(() => { const c = document.querySelector(".rb-modal"); if (c) c.remove(); });
  await page.locator(".rb-btn", { hasText: "⏳ 회귀" }).first().click(); await page.waitForTimeout(500);
  await page.locator(".rb-rg-all").click(); await page.waitForTimeout(150);
  ok(`[${tag}] 전체 선택 → '이어서 하기' 버튼·이름`, (await page.locator(".rb-rg-go").textContent()) === "이어서 하기" && /^이어서 · /.test(await page.locator(".rb-rg-field input").inputValue()) && (await page.locator(".rb-rg-p[aria-pressed=true]").count()) === (await page.locator(".rb-rg-p").count()));
  await page.locator(".rb-rg-go").click(); await page.waitForTimeout(400);
  ok(`[${tag}] 연출 글자 CONTINUE`, /C|O|N|T|I|U|E/.test(await page.locator(".rb-rg-word").textContent()) && (await page.locator(".rb-rg-word").getAttribute("data-t")).length === 8);
  await page.waitForSelector(".rb-rg-full.tick", { timeout: 9000 }); await page.waitForTimeout(3200);
  const cres = await page.evaluate(async () => {
    const ch = await __app.ctx.api.getCharacterFromIndex(0), c = ch.chats[0];
    const f = await __app.ctx.memory.store.getFolder("c1", c.id), orig = await __app.ctx.memory.store.getFolder("c1", "t1");
    return { name: c.name, people: Object.keys(f?.people ?? {}).length, orig: Object.keys(orig.people).length, scenes: (f?.scenes ?? []).length, origScenes: (orig.scenes ?? []).filter((x) => !x.orphan).length, word: document.querySelector(".rb-rg-word")?.textContent ?? "" };
  });
  ok(`[${tag}] 이어서 하기: 인물·장면을 전부 가져옴`, /^이어서 · /.test(cres.name) && cres.people === cres.orig && cres.scenes === cres.origScenes, JSON.stringify(cres));
  ok(`[${tag}] 페이지 오류 없음`, !errs.length, errs.join(" | "));
  await page.close();
}
await browser.close();
const bad = out.filter((x) => !x).length;
console.log(bad ? `실패 ${bad}` : `모두 통과 (${out.length})`); process.exit(bad ? 1 : 0);
