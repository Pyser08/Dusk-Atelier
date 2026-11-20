// 0.3.22 장기기억 새 기능 화면: 세계 탭(문서·목표·소문) · 성감대 새 모형(특징·정확한 약점·무작위) · 몸 흔적 · 궁합 · 일기 표시(응답 아래). OUT=폴더면 스크린샷
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const OUT = process.env.OUT || "";
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const browser = await chromium.launch();
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "✔" : "✘"} ${name}${cond ? "" : `  → ${extra}`}`); };
for (const [tag, vp] of [["PC", { width: 1280, height: 900 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true, host: true }));
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    const L = window.__testLib;
    let w = L.createEmptyWikiScope({ characterId: "c1", chatKey: "t1" });
    for (const n of ["시로코", "세라"]) w = L.createBlankPerson(w, n);
    const id = (n) => Object.values(w.documents).find((d) => d.title === n).id;
    await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => {
      f.wiki = w; f.cursor = { at: 30 };
      f.people["시로코"] = { name: "시로코", records: [{ id: "a1", act: "세라와 옥상에서 도시락을 먹었다", g: "A", at: 3, at_ms: 1, orphan: false }] };
      f.nsfw = {
        [id("시로코")]: { sexual: { eroticInterest: 70 }, axes: { initiative: 80 }, positions: [{ label: "기승위", preference: "preferred" }], tags: { likes: ["밧줄"], limits: [] },
          zones: [{ part: "ears", level: 3, note: "숨결만 닿아도 움찔한다", spot: "왼쪽 귓불" }, { part: "neck", level: 2, note: "" }] },
        [id("세라")]: { sexual: { eroticInterest: 60 }, axes: { initiative: 30 }, positions: [{ label: "기승위", preference: "preferred" }], tags: { likes: ["밧줄"], limits: [] } },
      };
      f.extra = { rumors: [{ from: "시로코", to: "세라", info: "유나가 왕녀라는 것", at: 12 }], goals: { "세라": { name: "세라", list: [{ goal: "기사단장 되기", prog: 40, status: "active", at: 20, first: 5 }] } },
        world: { place: { "은빛여관": { name: "은빛 여관", desc: "항구 옆 2층 여관", at: 9, first: 2, n: 3 } }, item: {}, faction: {} },
        marks: [{ name: "시로코", part: "목", desc: "키스마크", days: 3, at: 29 }], diary: [] };
    });
  });
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem ??= {}, { botId: "c1", chatIndex: 0, personKey: "", tab: "world", page: "detail", worldSec: "docs" }); __app.ctx.go("memory"); });
  await page.waitForTimeout(1500);
  const win = page.locator(".rb-root").first();
  ok(`[${tag}] 구역 탭에 ‘세계’가 인물 위키 바로 옆`, await page.evaluate(() => [...document.querySelectorAll(".rb-mem-sectab")].map((b) => b.dataset.sec).slice(0, 2).join(",")) === "people,world");
  ok(`[${tag}] 세계 · 문서: 은빛 여관`, (await win.getByText("은빛 여관").count()) > 0);
  if (OUT) await page.screenshot({ path: `${OUT}/extra-${tag}-world.png`, fullPage: true });
  await page.locator(".rb-seg button", { hasText: "목표" }).first().click(); await page.waitForTimeout(300);
  ok(`[${tag}] 세계 · 목표: 진척 막대`, (await page.locator(".rb-goal-bar").count()) === 1 && (await win.getByText("기사단장 되기").count()) > 0);
  await page.locator(".rb-seg button", { hasText: "소문" }).first().click(); await page.waitForTimeout(300);
  ok(`[${tag}] 세계 · 소문`, (await win.getByText("유나가 왕녀라는 것").count()) > 0);
  // 인물 → NSFW
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem, { tab: "people", personKey: "시로코" }); __app.ctx.go("memory"); });
  await page.waitForTimeout(1200);
  const nsfwTab = page.locator(".rb-wk2-tab[data-t=nsfw]").first();
  if (await nsfwTab.count()) { await nsfwTab.click(); await page.waitForTimeout(600); }
  ok(`[${tag}] 인물 머리에 📔 일기 · ↗ 다른 봇으로`, (await page.locator(".rb-btn", { hasText: "📔 일기" }).count()) > 0 && (await page.locator(".rb-btn", { hasText: "↗ 다른 봇으로" }).count()) > 0);
  ok(`[${tag}] 성감대 새 모형(팔·다리 실루엣 + 귀)`, await page.evaluate(() => { const s = document.querySelector(".rb-bodymap"); return !!s && s.querySelectorAll("path.sil").length === 1 && s.querySelectorAll("ellipse.sil").length === 3; }));
  ok(`[${tag}] 약점은 정확한 자리 핀 + 이름표`, await page.evaluate(() => { const s = document.querySelector(".rb-bodymap"); return !!s?.querySelector(".pin .ring") && [...s.querySelectorAll(".lbl")].some((t) => t.textContent === "왼쪽 귓불"); }));
  ok(`[${tag}] 부위 한 줄 특징 · 빈 특징은 + 버튼`, (await win.getByText("숨결만 닿아도 움찔한다").count()) > 0 && (await page.locator(".rb-bz-add").count()) === 1);
  ok(`[${tag}] 몸 흔적: 목 키스마크`, (await page.locator(".rb-marks li", { hasText: "키스마크" }).count()) === 1);
  ok(`[${tag}] 궁합: 점수 고리·겹치는 취향`, (await page.locator(".rb-compat .ring").count()) === 1 && (await page.locator(".rb-compat .row.ok .tags span").count()) === 2);
  if (OUT) { const b = page.locator('.rb-sub-sec[data-sid="body"]').first(); if (await b.count()) await b.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/extra-${tag}-body.png`, fullPage: true }); }
  // 세라는 성감대가 비어 있음 → 무작위로 채우기
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem, { personKey: "세라" }); __app.ctx.go("memory"); });
  await page.waitForTimeout(1200);
  if (await nsfwTab.count()) { await page.locator(".rb-wk2-tab[data-t=nsfw]").first().click(); await page.waitForTimeout(600); }
  const rnd = page.locator(".rb-btn", { hasText: "무작위로 채우기" }).first();
  ok(`[${tag}] 빈 성감대에 ‘무작위로 채우기’`, (await rnd.count()) === 1);
  if (await rnd.count()) { await rnd.click(); await page.waitForTimeout(900); }
  const z = await page.evaluate(async () => { const f = await __app.ctx.memory.store.getFolder("c1", "t1"); const d = Object.values(f.wiki.documents).find((x) => x.title === "세라"); return f.nsfw[d.id].zones ?? []; });
  ok(`[${tag}] 무작위: 3~5곳, 약점 1곳(정확한 자리), 모두 특징`, z.length >= 3 && z.length <= 5 && z.filter((x) => x.level === 3 && x.spot).length === 1 && z.every((x) => x.note), JSON.stringify(z));
  // 일기 표시: 저장된 일기가 맞는 응답 아래(게이지 자리)에 붙는다
  const shown = await page.evaluate(async () => {
    const M = __app.ctx.memory, reply = "세라는 창밖을 보며 한숨을 쉬었다. 내일은 기사단 시험이 있는 날이었다. 시로코가 조용히 곁에 앉았다.";
    await M.store.updateFolder("c1", "t1", (f) => { f.extra.diary = [{ name: "세라", docId: "x", text: "오늘은 이상하게 마음이 놓였다.", at: 3, snip: "내일은기사단시험이", ts: 1 }]; });
    M.diary?.invalidate?.();
    return { has: typeof M.diary?.onDisplay === "function", out: M.diary ? await M.diary.onDisplay(reply) : "", other: M.diary ? await M.diary.onDisplay("전혀 다른 응답 글입니다 아무 관계 없는 내용") : "" };
  });
  ok(`[${tag}] 일기 표시 훅이 붙음`, shown.has);
  ok(`[${tag}] 맞는 응답 아래에만 일기 상자`, /x-dusk="diary"/.test(shown.out) && /세라의 일기/.test(shown.out) && !/x-dusk="diary"/.test(shown.other), shown.out.slice(0, 200));
  ok(`[${tag}] 전역 오류 없음`, !errs.length, errs.join(" | "));
}
await browser.close();
console.log(`${pass}/${pass + fail} 통과`);
process.exit(fail ? 1 : 0);
