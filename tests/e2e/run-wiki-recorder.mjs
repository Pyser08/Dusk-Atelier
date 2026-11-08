// 약속(docs/PROMISES.md M-1): 홈 '장기 기억(모든 채팅)'을 끄면 다음 요청에 기억 블록이 들어가지 않고, 켜면 다시 들어간다.
// 예전 시험은 저장값(settings.inject.on)만 봤다. 지금은 실제 요청 훅에 요청을 흘려 모델이 받는 글을 본다(실제 클릭).
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
// 2.0.0 Dusk 기록기가 만든 인물 위키(모든 기능 켬: 관계·평가·말투·지식·비밀·의도·절제·의심·단서·호감도·의심·개방·첫 끌림 + 사망 상태)가
// 인물 위키의 움직이는 화면들(탭·관계·상세 수치 막대·기록·관계도·기억 블록)에서 제대로 보이고 오류가 없는지(PC·모바일).
import fs from "node:fs";
const WIKI = JSON.parse(fs.readFileSync("tests/e2e/fixtures-recorder-wiki.json", "utf8"));
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const [tag, vp, uiMode] of [["PC", { width: 1280, height: 860 }, "advanced"], ["모바일", { width: 390, height: 844 }, "advanced"], ["PC 간단", { width: 1280, height: 860 }, "simple"], ["모바일 간단", { width: 390, height: 844 }, "simple"]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message)); if (process.env.PROBE) page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE", m.text().slice(0, 1200)); });
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate((uiMode) => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode }) }, { memory: true, story: true, host: true }), uiMode);
  await page.waitForTimeout(400);
  await page.evaluate(async (wiki) => {
    const rec = (id, act, g, at, extra = {}) => ({ id, act, g, at, at_ms: 1700000000000 + at * 60000, orphan: false, user: false, pin: false, ...extra });
    await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => {
      f.people["수아"] = { name: "수아", records: [rec("s1", "외도 의심을 털어놓음", "A", 3), rec("s2", "장례식장에서 오열했다", "A", 5)] };
      f.people["도윤"] = { name: "도윤", records: [rec("d1", "셔츠에 향수 냄새를 남김", "C", 3), rec("d2", "상태: 사망", "S", 5, { attr: { c: "status", k: "상태", v: "사망" }, kd: "f", fc: "H" })] };
      f.scenes = [...(f.scenes ?? []), { id: "sc9", at: 5, sum: "도윤이 교통사고로 죽고 수아가 오열했다", place: "장례식장", who: ["수아", "도윤"], orphan: false }];
      f.wiki = wiki;
    }, { chaId: "c1", chatId: "t1" });
  }, WIKI);
  const skip = page.getByText("건너뛰기", { exact: true });
  const open = async (key) => { await page.evaluate((k) => { Object.assign(__app.ctx.state.mem ??= {}, { botId: "c1", chatIndex: 0, personKey: k, tab: "people", page: "detail" }); __app.ctx.go("relmap"); }, key); await page.waitForTimeout(1200); await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(1300); if (await skip.count()) await skip.first().click().catch(() => {}); };
  const body = async () => (await page.locator(".rb-wk2").first().textContent().catch(() => "")) ?? "";
  const tab = async (t) => { const b = page.locator(".rb-wk2-tab", { hasText: t }).first(); if (!(await b.count())) return false; await b.click(); await page.waitForTimeout(400); return true; };
  const wide = async () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (process.env.PROBE) { await open("sirokko"); await page.waitForTimeout(1500); console.log("SIRO", await page.evaluate(() => [...document.querySelectorAll("[class*=toast]")].map((e) => e.textContent).join(" | ").slice(0, 600)), await page.evaluate(() => [...new Set([...document.querySelectorAll("[class*=rb-mem], [class*=rb-wk], [class*=rb-pp]")].map((e) => e.className))].slice(0, 40).join(" ; "))); }
  await open("수아");
  if (process.env.PROBE) { await page.waitForTimeout(2500); await page.screenshot({ path: "/tmp/probe3.png" }); console.log(await page.evaluate(() => document.querySelector(".rb-main, main, #rb-app")?.innerText?.slice(0, 800))); console.log(await page.evaluate(async () => JSON.stringify(Object.keys((await __app.ctx.memory.store.getFolder("c1","t1")).people)))); }
  ok(`[${tag}] 수아 위키가 열림`, (await page.locator(".rb-wk2").count()) >= 1, String(await page.locator(".rb-wk2").count()));
  const tabs = (await page.locator(".rb-wk2-tab").allTextContents()).map((x) => x.trim());
  ok(`[${tag}] 탭 줄(요약·관계·상세 정보·기록)`, ["요약", "관계", "상세 정보", "기록"].every((t) => tabs.some((x) => x.includes(t))), tabs.join("|"));
  // 탭을 모두 돌며 보이는 글을 모은다(위키 칸은 상세 정보의 '기록' 묶음 등 여러 곳에 나뉘어 보인다)
  const visitAll = async () => {
    let all = await body();
    for (const t of ["관계", "상세 정보", "NSFW", "기록"]) {
      ok(`[${tag}] '${t}' 탭 열림`, await tab(t));
      if (t === "상세 정보") for (const chip of ["수치", "감정", "기록"]) { const c = page.locator(".rb-wk2 button", { hasText: chip }).first(); if (await c.count()) { await c.click(); await page.waitForTimeout(300); all += await body(); } }
      all += await body();
      ok(`[${tag}] '${t}' 탭 가로 안 넘침`, !(await wide()));
      await page.screenshot({ path: `/tmp/wiki-rec-${t.replace(/\s/g, "")}-${tag}.png`, fullPage: true });
    }
    await tab("요약"); return all;
  };
  const all = await visitAll();
  const want = { "기본정보": /도윤의 아내/, "관계": /의지한다|기댄다/, "현재 평가": /믿을 수 있는 사람/, "말투": /선배/, "의도": /위로받고 싶다/, "절제": /꾹 참는다/, "관계 단계": /가까워졌다/, "다른 인물 감정": /배신감/, "알고 있는 것": /서진의 향수/, "비밀": /외도를 의심하고 있다/, "습관": /휴대폰을 자꾸 확인/, "의심 사건": /외도를 의심함/, "의심 대응": /남편에게는 묻지 않음/, "단서": /휴대폰에 남은/, "호감도": /호감/, "의심 수치": /의심/, "성격": /차분/, "Dusk 기록": /오열/ };
  const miss = Object.entries(want).filter(([, rx]) => !rx.test(all)).map(([k]) => k);
  ok(`[${tag}] 기록기가 남긴 칸이 위키 화면에 모두 보임`, !miss.length, "안 보임: " + miss.join(", "));
  await open("도윤");
  let dy = await body(); for (const t of ["상세 정보"]) { await tab(t); const c = page.locator(".rb-wk2 button", { hasText: "기록" }).first(); if (await c.count()) { await c.click(); await page.waitForTimeout(300); } dy += await body(); }
  ok(`[${tag}] 도윤: 현재 상태 사망이 보임`, /사망/.test(dy), dy.slice(0, 300));
  // 다음 요청에 들어가는 기억 블록: 사망이 맨 앞 'Current facts'
  const sent = await page.evaluate(async () => (await __host.request([{ role: "system", content: "s" }, { role: "user", content: "수아와 도윤 이야기" }])).map((m) => String(m.content)).join("\n"));
  ok(`[${tag}] 요청 기억 블록에 'Current facts — 도윤: 사망'`, /Current facts[\s\S]*도윤: 사망/.test(sent), sent.slice(0, 300));
  await page.evaluate(() => __app.ctx.go("relmap")); await page.waitForTimeout(900);
  ok(`[${tag}] 관계도 열림(수아)`, /수아/.test(await page.locator("body").textContent()));
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(";"));
}
await browser.close();
console.log(`\n${out.filter(Boolean).length}/${out.length} 통과`);
process.exit(out.every(Boolean) ? 0 : 1);
