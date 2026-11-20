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
          zones: [{ part: "ears", level: 3, note: "숨결만 닿아도 움찔한다", spot: "왼쪽 귓불" }, { part: "neck", level: 2, note: "" }, { part: "feet", level: 0, numb: true, note: "무덤덤" }] },
        [id("세라")]: { sexual: { eroticInterest: 60 }, axes: { initiative: 30 }, positions: [{ label: "기승위", preference: "preferred" }], tags: { likes: ["밧줄"], limits: [] } },
      };
      f.life = { p: { [id("시로코")]: { lust: 40, fat: 10, cum: { ml: 30, sperm: 30, at: 30, when: "" }, hist: [{ kind: "loss", at: 1 }] } } };
      f.extra = { outfit: { 시로코: { name: "시로코", parts: { top: { s: "흰 셔츠", d: "헐렁한 흰 리넨 셔츠, 소매를 걷어 올림", at: 29 } }, acc: [{ s: "은 귀걸이", d: "작은 은 링 귀걸이", at: 29 }] } }, weather: { w: "눈", at: 29 }, rumors: [{ from: "시로코", to: "세라", info: "유나가 왕녀라는 것", at: 12 }], goals: { "세라": { name: "세라", list: [{ goal: "기사단장 되기", prog: 40, status: "active", at: 20, first: 5 }] } },
        world: { place: { "은빛여관": { name: "은빛 여관", desc: "항구 옆 2층 여관", at: 9, first: 2, n: 3 } }, item: {}, faction: {} },
        marks: [{ name: "시로코", part: "목", desc: "키스마크", days: 3, at: 29 }], diary: [], status: [{ name: "시로코", effect: "감기", lv: 2, days: 3, at: 29 }] };
    });
  });
  ok(`[${tag}] 세계 탭은 기본 꺼짐`, await page.evaluate(async () => (await __app.ctx.memory.store.getIndex()).settings?.inject?.world !== true));
  await page.evaluate(async () => { await __app.ctx.memory.store.updateIndex((idx) => { idx.settings.inject ??= {}; idx.settings.inject.world = true; }); });
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
  ok(`[${tag}] 약점은 정확한 자리 핀 + 이름표`, await page.evaluate(() => { const s = document.querySelector(".rb-bodymap"); return !!s?.querySelector(".pin .ring") && [...s.querySelectorAll(".lbl2")].some((t) => t.textContent === "◎ 왼쪽 귓불"); }));
  const lab = await page.evaluate(() => [...document.querySelectorAll(".rb-bodymap .lbl")].map((x) => { const b = x.getBoundingClientRect(); return [x.textContent, Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; }));
  ok(`[${tag}] 모든 부위 이름이 보이고 겹치지 않음`, await page.evaluate(() => { const t = [...document.querySelectorAll(".rb-bodymap .lbl")]; if (t.length !== 16 || !["질", "자궁", "클리토리스"].every((n) => t.some((x) => x.textContent === n))) return false; const bs = t.map((x) => x.getBoundingClientRect()); return bs.every((a, i) => bs.every((b, j) => i === j || a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5)); }), JSON.stringify(lab));
  ok(`[${tag}] 부위 한 줄 특징 · 빈 특징은 + 버튼`, (await win.getByText("숨결만 닿아도 움찔한다").count()) > 0 && (await page.locator(".rb-bz-add").count()) === 1);
  ok(`[${tag}] 몸 흔적: 목 키스마크`, (await page.locator(".rb-marks li", { hasText: "키스마크" }).count()) === 1);
  ok(`[${tag}] 궁합: 점수 고리·겹치는 취향`, (await page.locator(".rb-compat .ring").count()) === 1 && (await page.locator(".rb-compat .row.ok .tags span").count()) === 2);
  ok(`[${tag}] 불감 부위: 모형에 ‘발 · 불감’, 목록에 불감 표시`, await page.evaluate(() => [...document.querySelectorAll(".rb-bodymap .lbl")].some((t) => t.textContent === "발 · 불감")) && (await page.locator(".rb-bz .numbb").count()) === 1);
  ok(`[${tag}] 임신·피임 카드: 체내 정액량·포화도·이력`, (await page.locator(".rb-fert-tile", { hasText: "30 ml" }).count()) === 1 && (await page.locator(".rb-fert-tile", { hasText: "포화도" }).count()) === 1 && (await page.locator(".rb-fert-hist span.loss").count()) === 1);
  ok(`[${tag}] 임신·피임 카드가 월경 칸 바로 아래(몸 상태 카드 안)`, await page.evaluate(() => { const f = document.querySelector(".rb-fert-force"); return !!f && !!f.closest(".rb-lcyc"); }));
  await page.locator(".rb-fert-btn").first().click(); await page.waitForTimeout(900);
  const forced = await page.evaluate(async () => { const f = await __app.ctx.memory.store.getFolder("c1", "t1"); const d = Object.values(f.wiki.documents).find((x) => x.title === "시로코"); return f.nsfw[d.id].fert?.forced === true; });
  ok(`[${tag}] 강제 피임 버튼: 켜면 저장되고 가능성 0%`, forced && (await page.locator(".rb-fert-force.on").count()) === 1 && (await page.locator(".rb-fert-tile.chance b", { hasText: "0.00%" }).count()) === 1);
  const over = await page.evaluate(() => { const out = []; const vw = document.documentElement.clientWidth; for (const el of document.querySelectorAll(".rb-win *")) { const r = el.getBoundingClientRect(); if (r.width > 0 && (r.right > vw + 1 || r.left < -1) && !el.closest("svg") && getComputedStyle(el).position !== "fixed") out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${Math.round(r.left)}→${Math.round(r.right)}`); } const clipped = (el) => { for (let a = el.parentElement; a && !a.classList.contains("rb-mem2"); a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "hidden" || o === "scroll" || o === "clip") return true; } return false; };
    const wide = [...document.querySelectorAll(".rb-mem2 *")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 + (document.querySelector(".rb-mem2")?.scrollLeft ?? 0) * 0 && !el.closest("svg") && !clipped(el); }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).replace(/\s+/g, ".")} w${Math.round(el.getBoundingClientRect().width)} r${Math.round(el.getBoundingClientRect().right)}`);
    out.push(...wide.slice(0, 8).map((x) => "W " + x));
    { const m2 = document.querySelector(".rb-mem2"); if (m2 && m2.scrollWidth > m2.clientWidth + 1) { let best = null; for (const el of m2.querySelectorAll("*")) { if (el.closest("svg") || clipped(el)) continue; const r = el.getBoundingClientRect(); if (!best || r.right > best.r) best = { r: r.right, n: `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 2).join(".")}` }; } out.push(`W SCROLL ${m2.scrollWidth}>${m2.clientWidth} widest ${best?.n} r${Math.round(best?.r ?? 0)}`); } }
    const sc = [...document.querySelectorAll(".rb-win *")].filter((el) => el.scrollLeft > 0).map((el) => `${el.className} scrollLeft=${el.scrollLeft}`); return { out: out.filter((x) => x.startsWith("W ")).slice(0, 10).concat(out.filter((x) => !x.startsWith("W ")).slice(0, 2)), sc: sc.slice(0, 4) }; });
  ok(`[${tag}] NSFW 탭이 화면 밖으로 넘치지 않음`, !over.out.some((x) => x.startsWith("W ")) && !over.sc.length, JSON.stringify(over));
  if (OUT) { const fc = page.locator(".rb-fert-force").first(); await fc.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/extra-${tag}-fert.png` }); }
  if (OUT) { const b = page.locator('.rb-sub-sec[data-sid="body"]').first(); if (await b.count()) await b.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/extra-${tag}-body.png`, fullPage: true });
    const fig = page.locator(".rb-body-fig").first(); await fig.screenshot({ path: `${OUT}/extra-${tag}-fig-f.png` });
    await page.locator(".rb-bseg button", { hasText: "뒤" }).first().click(); await page.waitForTimeout(400);
    await page.locator(".rb-body-fig").first().screenshot({ path: `${OUT}/extra-${tag}-fig-b.png` });
    await page.locator(".rb-bseg button", { hasText: "앞" }).first().click(); await page.waitForTimeout(400); }
  // 0.3.22 종족별 모형: 종족을 바꾸면 귀·뿔·꼬리·날개·하반신이 바뀜
  const setRace = (id) => page.evaluate(async (id) => { await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => { f.extra = { ...(f.extra ?? {}), race: id ? { 시로코: { name: "시로코", id, manual: true } } : {} }; }); __app.ctx.go("memory"); }, id);
  const raceShots = [];
  for (const id of ["fox", "succubus", "lamia", "mermaid", "centaur", "arachne", "harpy", "bunny".replace("bunny", "rabbit"), "dragon", "elf"]) {
    await setRace(id); await page.waitForTimeout(900);
    const got = await page.evaluate(() => ({ ear: document.querySelectorAll(".rb-bodymap .ear").length, tail: document.querySelectorAll(".rb-bodymap .tail").length, wing: document.querySelectorAll(".rb-bodymap .wing").length, low: document.querySelectorAll(".rb-bodymap .low").length, horn: document.querySelectorAll(".rb-bodymap .horn").length, lbl: [...document.querySelectorAll(".rb-bodymap .lbl")].map((x) => x.textContent) }));
    raceShots.push([id, got]);
    if (OUT && tag === "PC") { const fig = page.locator(".rb-body-fig").first(); if (await fig.count()) { await fig.scrollIntoViewIfNeeded(); await fig.screenshot({ path: `${OUT}/race-${id}-f.png` }); await page.locator(".rb-bseg button", { hasText: "뒤" }).first().click(); await page.waitForTimeout(300); await page.locator(".rb-body-fig").first().screenshot({ path: `${OUT}/race-${id}-b.png` }); await page.locator(".rb-bseg button", { hasText: "앞" }).first().click(); await page.waitForTimeout(300); } }
  }
  const R = Object.fromEntries(raceShots);
  ok(`[${tag}] 종족별 몸 모형: 여우 귀·꼬리, 서큐버스 뿔·날개·꼬리, 라미아·인어·켄타우로스·아라크네 하반신, 하피 날개`, R.fox?.ear === 2 && R.fox?.tail === 1 && R.succubus?.horn === 2 && R.succubus?.wing === 2 && R.succubus?.tail >= 1 && R.lamia?.low === 1 && R.mermaid?.low === 1 && R.centaur?.low === 2 && R.arachne?.low === 3 && R.harpy?.wing === 2 && R.elf?.ear === 2, JSON.stringify(R).slice(0, 600));
  ok(`[${tag}] 하반신 종족은 발·무릎 점이 없음`, !R.lamia?.lbl?.some((x) => x.startsWith("발")) && R.fox?.lbl?.some((x) => x.startsWith("발")));
  await setRace(null); await page.waitForTimeout(600);
  // 세라는 성감대가 비어 있음 → 무작위로 채우기
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem, { personKey: "세라" }); __app.ctx.go("memory"); });
  await page.waitForTimeout(1200);
  if (await nsfwTab.count()) { await page.locator(".rb-wk2-tab[data-t=nsfw]").first().click(); await page.waitForTimeout(600); }
  const rnd = page.locator(".rb-btn", { hasText: "무작위로 채우기" }).first();
  ok(`[${tag}] 빈 성감대에 ‘무작위로 채우기’`, (await rnd.count()) === 1);
  if (await rnd.count()) { await rnd.click(); await page.waitForTimeout(900); }
  const z = await page.evaluate(async () => { const f = await __app.ctx.memory.store.getFolder("c1", "t1"); const d = Object.values(f.wiki.documents).find((x) => x.title === "세라"); return f.nsfw[d.id].zones ?? []; });
  ok(`[${tag}] 무작위: 3~5곳, 약점 1곳(정확한 자리), 모두 특징`, z.filter((x) => !x.numb).length >= 3 && z.filter((x) => !x.numb).length <= 5 && z.filter((x) => x.level === 3 && x.spot).length === 1 && z.every((x) => x.note), JSON.stringify(z));
  // 일기 표시: 저장된 일기가 맞는 응답 아래(게이지 자리)에 붙는다
  const shown = await page.evaluate(async () => {
    const M = __app.ctx.memory, reply = "세라는 창밖을 보며 한숨을 쉬었다. 내일은 기사단 시험이 있는 날이었다. 시로코가 조용히 곁에 앉았다.";
    await M.store.updateFolder("c1", "t1", (f) => { f.extra.diary = [{ name: "세라", docId: "x", text: "오늘은 이상하게 마음이 놓였다.", at: 3, snip: "내일은기사단시험이", ts: 1 }]; });
    M.diary?.invalidate?.();
    return { has: typeof M.diary?.onDisplay === "function", out: M.diary ? await M.diary.onDisplay(reply) : "", other: M.diary ? await M.diary.onDisplay("전혀 다른 응답 글입니다 아무 관계 없는 내용") : "" };
  });
  ok(`[${tag}] 일기 표시 훅이 붙음`, shown.has);
  ok(`[${tag}] 맞는 응답 아래에만 일기 상자`, /x-dusk="diary"/.test(shown.out) && /세라의 일기/.test(shown.out) && !/x-dusk="diary"/.test(shown.other), shown.out.slice(0, 200));
  // 상태이상 카드(관계 탭의 하위 구역)
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem, { personKey: "시로코" }); __app.ctx.go("memory"); });
  await page.waitForTimeout(1200);
  { const rt = page.locator(".rb-wk2-tab[data-t=rel]").first(); if (await rt.count()) { await rt.click(); await page.waitForTimeout(600); } }
  ok(`[${tag}] 상태이상 카드: 감기`, (await page.locator(".rb-marks li", { hasText: "감기" }).count()) === 1);
  // 본문 이름 링크 → 상태창(실제 표시 경로: 로어북 로그가 부르는 memory.gauge.onDisplay)
  const link = await page.evaluate(async () => { const M = __app.ctx.memory; M.nameLinks?.invalidate?.(); const reply = "시로코가 세라에게 다가갔다. 세라는 웃었다."; const out = await M.gauge.onDisplay(reply); return { out, n: (out.split('x-dusk="scene"')[0].match(/x-dusk="pc"/g) ?? []).length }; });
  ok(`[${tag}] 본문 이름마다 상태창 링크(인물마다 첫 등장 한 번)`, link.n === 2, link.out.slice(0, 200));
  const inl = await page.evaluate((html) => { const d = document.createElement("p"); d.style.cssText = "width:360px;font-size:15px"; d.innerHTML = html; document.body.append(d); const h = d.getBoundingClientRect().height; d.remove(); return Math.round(h); }, link.out);
  ok(`[${tag}] 이름 링크가 줄을 바꾸지 않음(한 줄)`, inl <= 30, String(inl));
  ok(`[${tag}] 상태창에 스탯·상태이상·NSFW`, /감기/.test(link.out) && />지금 상태</.test(link.out) && />NSFW</.test(link.out) && /왼쪽 귓불/.test(link.out));
  if (OUT) { await page.evaluate((html) => { const d = document.createElement("div"); d.id = "pcdemo"; d.style.cssText = "position:fixed;inset:0;z-index:99999;background:#1d1b26;color:#eee;padding:20px;font-size:15px;line-height:1.7"; d.innerHTML = html; document.body.append(d); d.querySelector('details[x-dusk="pc"]').open = true; }, link.out);
    await page.waitForTimeout(200); await page.screenshot({ path: `${OUT}/extra-${tag}-namecard.png` }); await page.evaluate(() => document.getElementById("pcdemo")?.remove()); }
  // 일반 / NSFW 탭: NSFW를 누르면 일반이 닫히고 NSFW만 보임(스크립트 없이 details name)
  const tabs = await page.evaluate(async (html) => { const d = document.createElement("div"); d.id = "tabdemo"; d.style.cssText = "position:fixed;inset:0;z-index:99999;background:#1d1b26;color:#eee;padding:20px;font-size:15px"; d.innerHTML = html; document.body.append(d);
    const pc = d.querySelector('details[x-dusk="pc"]'); pc.open = true; const g = pc.querySelector('details[x-tab="g"]'), n = pc.querySelector('details[x-tab="n"]'); const before = [g.open, n.open];
    n.querySelector("summary").click(); await new Promise((r) => setTimeout(r, 350)); return { before, after: [g.open, n.open], nsVis: n.querySelector("span").getBoundingClientRect().height > 50 }; }, link.out);
  ok(`[${tag}] 캐릭터 상태창 일반/NSFW 탭 전환`, tabs.before.join() === "true,false" && tabs.after.join() === "false,true" && tabs.nsVis, JSON.stringify(tabs));
  if (OUT) await page.screenshot({ path: `${OUT}/extra-${tag}-namecard-nsfw.png` });
  await page.evaluate(() => document.getElementById("tabdemo")?.remove());
  // 장면 상태창(응답 아래, 로어북 위)
  const sc = await page.evaluate(async () => { const M = __app.ctx.memory; M.nameLinks?.invalidate?.(); const out = await M.gauge.onDisplay("[2026-03-02 22:40 | 은빛 여관]\n창밖에 비가 쏟아졌다. 시로코가 세라를 바라봤다."); return out; });
  ok(`[${tag}] 장면 상태창: 날짜·시간·장소·날씨·등장인물(이름은 캐릭터 상태창)`, /x-dusk="scene"/.test(sc) && /22:40/.test(sc) && /은빛 여관/.test(sc) && /🌧️/.test(sc) && (sc.split('x-dusk="scene"')[1].match(/x-dusk="pc"/g) ?? []).length === 2, sc.slice(-300));
  // 2.2.22: 등장인물 띠의 이름을 누르면 상태창이 띠 안이 아니라 화면 가운데에 크게 뜬다
  const chipPop = await page.evaluate(async (html) => { const d = document.createElement("div"); d.id = "chipdemo"; d.style.cssText = "position:fixed;inset:0;z-index:99999;background:#14131b;color:#eee;padding:16px;overflow:auto"; d.innerHTML = html; document.body.append(d);
    const det = d.querySelector('div[x-dusk="scene"] details[x-dusk="pc"]'); if (!det) { d.remove(); return null; } det.open = true; await new Promise((r) => setTimeout(r, 250));
    const r = det.querySelector("summary + span").getBoundingClientRect(); const out = { w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight }; d.remove(); return out; }, sc);
  ok(`[${tag}] 장면 상태창 등장인물 이름 → 상태창이 화면 가운데 제 크기로(띠 안에 갇히지 않음)`, chipPop && chipPop.w >= Math.min(300, chipPop.vw - 40) && chipPop.h >= 200 && chipPop.h <= chipPop.vh * 0.8, JSON.stringify(chipPop));
  ok(`[${tag}] 장면 상태창 날씨 상자: 4일 예보(낮·밤·확률)`, /x-dusk="wx"/.test(sc) && /4일 예보/.test(sc) && /모레/.test(sc) && /💧/.test(sc) && /%/.test(sc));
  ok(`[${tag}] 캐릭터 상태창에 옷차림·삽화용 상세`, /옷차림/.test(link.out) && /흰 셔츠/.test(link.out) && /삽화용 상세 ›/.test(link.out) && /소매를 걷어 올림/.test(link.out));
  if (OUT) { await page.evaluate((html) => { const d = document.createElement("div"); d.id = "scdemo"; d.style.cssText = "position:fixed;inset:0;z-index:99999;background:#14131b;color:#eee;padding:16px;font-size:15px;line-height:1.7;overflow:auto"; d.innerHTML = html; document.body.append(d); }, sc);
    await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/extra-${tag}-scene.png` });
    await page.evaluate(() => { const d = document.querySelector('#scdemo details[x-dusk="wx"]'); if (d) d.open = true; }); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/extra-${tag}-forecast.png` }); await page.evaluate(() => { const d = document.querySelector('#scdemo details[x-dusk="wx"]'); if (d) d.open = false; });
    await page.evaluate(() => { const d = document.querySelector('#scdemo details[x-dusk="pc"]'); if (d) d.open = true; }); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/extra-${tag}-card2.png` }); await page.evaluate(() => document.getElementById("scdemo")?.remove()); }
  await page.evaluate(async () => { await __app.ctx.memory.store.updateIndex((i) => { i.settings.inject.scenePanel = false; }); __app.ctx.memory.nameLinks?.invalidate?.(); });
  ok(`[${tag}] 장면 상태창 끄면 안 붙음`, !/x-dusk="scene"/.test(await page.evaluate(() => __app.ctx.memory.gauge.onDisplay("[2026-03-02 22:40 | 여관]\n시로코가 웃었다."))));
  await page.evaluate(async () => { await __app.ctx.memory.store.updateIndex((i) => { i.settings.inject.nameLinks = false; }); __app.ctx.memory.nameLinks?.invalidate?.(); });
  ok(`[${tag}] 설정에서 끄면 링크 없음`, !/x-dusk="pc"/.test(await page.evaluate(() => __app.ctx.memory.gauge.onDisplay("시로코가 웃었다."))));
  // 홈 빠른 설정: 캐릭터 상태창·장면 상태창 줄
  await page.evaluate(() => __app.ctx.go("home")); await page.waitForTimeout(1500);
  ok(`[${tag}] 홈 빠른 설정에 캐릭터 상태창·장면 상태창 스위치`, (await page.locator('[data-quick="nameLinks"]').count()) === 1 && (await page.locator('[data-quick="scenePanel"]').count()) === 1);
  // 인물 위키 옷차림 카드
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem, { page: "detail", tab: "people", personKey: "시로코" }); __app.ctx.go("memory"); }); await page.waitForTimeout(1200);
  { const rt = page.locator(".rb-wk2-tab[data-t=rel]").first(); if (await rt.count()) { await rt.click(); await page.waitForTimeout(600); } }
  ok(`[${tag}] 옷차림 카드: 부위·액세서리, › 누르면 삽화용 상세`, (await page.locator(".rb-of-row", { hasText: "흰 셔츠" }).count()) === 1 && !(await page.getByText("소매를 걷어 올림").count()));
  await page.locator(".rb-of-tg").first().click(); await page.waitForTimeout(700);
  ok(`[${tag}] 삽화용 상세 보기`, (await page.locator(".rb-of-row p", { hasText: "소매를 걷어 올림" }).count()) === 1);
  // 설정: 지난 대화 분석 속도 줄(모바일은 위아래로)
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem, { page: "home", memTab: "opt" }); __app.ctx.go("memory"); });
  await page.waitForTimeout(1200);
  const bf = await page.evaluate(() => { const r = document.getElementById("rb-mem-bfspeed"); if (!r) return null; const t = r.querySelector(".t").getBoundingClientRect(), row = r.getBoundingClientRect(); return { dir: getComputedStyle(r).flexDirection, tw: Math.round(t.width), rw: Math.round(row.width) }; });
  ok(`[${tag}] 지난 대화 분석 속도: 글이 줄 폭을 거의 다 씀`, !!bf && bf.tw >= bf.rw * (tag === "모바일" ? 0.95 : 0.4) && (tag !== "모바일" || bf.dir === "column"), JSON.stringify(bf));
  const tk = await page.evaluate(() => { const r = document.getElementById("rb-mem-tokens"); if (!r) return null; return Math.round(r.querySelector(".t").getBoundingClientRect().width / r.getBoundingClientRect().width * 100); });
  ok(`[${tag}] 기억 넣기 토큰 줄도 글이 좁아지지 않음`, tk != null && tk >= (tag === "모바일" ? 95 : 30), String(tk));
  ok(`[${tag}] 설정에 상태이상·이름 링크·세계 탭 스위치`, (await page.getByText("캐릭터 상태창 (본문 이름 링크)").count()) > 0 && (await page.locator(".rb-mem-options .rb-srow .t > span", { hasText: "상태이상" }).count()) > 0 && (await page.getByText("세계 탭 (장소·물건·세력·목표·소문)").count()) > 0);
  if (OUT) { await page.locator("#rb-mem-bfspeed").scrollIntoViewIfNeeded().catch(() => {}); await page.screenshot({ path: `${OUT}/extra-${tag}-opt.png` }); }
  const alpha = await page.evaluate(async () => { const P = __app.ctx.prefs; P.ui ??= {}; const before = getComputedStyle(document.querySelector('.rb-win')).backgroundColor; P.ui.theme = { ...(P.ui.theme ?? {}), skin: 'classic', winAlpha: 40 }; __app.ctx.applyTheme(); const after = getComputedStyle(document.querySelector('.rb-win')).backgroundColor; P.ui.theme = { ...P.ui.theme, winAlpha: 0 }; __app.ctx.applyTheme(); return after + ' | was ' + before; });
  ok(`[${tag}] 창 투명도 40%면 창 바탕이 비침`, /(rgba\([^)]*,\s*0?\.\d+\)|\/ 0?\.\d+\)) \|/.test(alpha), alpha);
  ok(`[${tag}] 전역 오류 없음`, !errs.length, errs.join(" | "));
}
await browser.close();
console.log(`${pass}/${pass + fail} 통과`);
process.exit(fail ? 1 : 0);
