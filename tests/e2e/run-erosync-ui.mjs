// Erosync 인물 위키 칸 + 관계도 Erosync 층 (가짜 ctx.erosync로 실제 화면 클릭)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const NAMES = ["리안", "카엘", "미라", "브람", "세라핀", "하윤"];
for (const [tag, vp] of [["PC", { width: 1280, height: 900 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true }));
  await page.waitForTimeout(500);
  await page.evaluate(async (names) => {
    await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => {
      f.people = f.people ?? {};
      names.forEach((n, i) => { f.people[n] = { name: n, aliases: [], records: Array.from({ length: (i % 4) + 1 }, (_, k) => ({ id: `${n}${k}`, act: `${n}의 일 ${k}`, g: "B", at: k + 3 + i, orphan: false })) }; });
      f.emo = Object.fromEntries(names.map((n, i) => [`${n}>u`, { from: n, to: "{{user}}", tags: i % 2 ? { hostility: 5 } : { affection: 3 + i, trust: 4 }, log: [] }]));
      f.rels = { a: { from: "리안", to: "카엘", items: [{ d: "정적", dir: "-", at: 8 }] }, b: { from: "미라", to: "리안", items: [{ d: "호감", dir: "+", at: 7 }] }, c: { from: "브람", to: "하윤", items: [{ d: "거래", dir: "0", at: 6 }] } };
      f.scenes = [{ id: "s1", who: ["리안", "{{user}}"], orphan: false, at: 8 }];
    });
  }, NAMES);
  // 가짜 Erosync: 켜져 있고, 리안·카엘 사이 목표/경쟁이 있다
  await page.evaluate(() => {
    const snap = { ok: true, scope: {}, turnIndex: 5, contentMode: "nsfw", people: [
      { id: "p1", name: "리안", aliases: [], role: "메인", axes: [{ axis: "initiative", base: 60, value: 80 }, { axis: "extremity", base: 30, value: 30 }], interest: 70, sexual: { eroticInterest: 70, sexualOpenness: 55 }, pref: { f: 40, m: 60, x: 0, total: 100 }, nonPerson: false, sfw: false },
      { id: "p2", name: "카엘", aliases: [], role: "주요", axes: [{ axis: "initiative", base: 40, value: 40 }], sexual: null, nonPerson: false, sfw: false },
      { id: "p3", name: "시로코", aliases: [], role: "메인", axes: [{ axis: "initiative", base: 60, value: 80 }, { axis: "extremity", base: 30, value: 30 }], sexual: { eroticInterest: 70, sexualOpenness: 55 }, pref: { f: 40, m: 60, x: 0, total: 100 }, nonPerson: false, sfw: false },
      { id: "p4", name: "호시노", aliases: [], role: "주요", axes: [{ axis: "initiative", base: 40, value: 40 }], sexual: null, nonPerson: false, sfw: false },
      { id: "p5", name: "엑스트라", aliases: [], axes: [], sexual: null }
    ], goals: [{ id: "g2", actor: "p3", actorName: "시로코", target: "p4", targetName: "호시노", type: "flirt", typeLabel: "플러팅", status: "active", priority: 55, objective: "순찰 끝나고 둘이 남기", nextMove: "" },{ id: "g1", actor: "p1", actorName: "리안", target: "p2", targetName: "카엘", type: "sexual_intercourse", typeLabel: "성관계 목표", status: "active", priority: 70, objective: "단둘이 되기", nextMove: "자리를 옮기자고 한다" }],
    rivalries: [{ actor: "p2", actorName: "카엘", rival: "p1", rivalName: "리안", intensity: 40, reason: "" }], relations: [] };
    window.__opened = 0;
    __app.ctx.erosync = { isRunning: () => true, on: () => true, read: async () => snap, open: async () => true,
      guard: () => window.__gd ?? { on: false, obsessionCap: 60, sameTargetTurns: 3, restTurns: 4 }, loadGuard: async () => {}, setGuard: async (v) => { window.__gd = { ...(window.__gd ?? { on: false, obsessionCap: 60, sameTargetTurns: 3, restTurns: 4 }), ...v }; },
      content: async (patch) => { const st = (window.__lv ??= { ok: true, contentMode: "nsfw", extremityLimit: "unlimited", nsfwPlus: false, recheck: false, limits: [{ key: "moderate", cap: 20, label: "대화 안에서만" }, { key: "unlimited", cap: 100, label: "제한 없음" }] }); if (patch) Object.assign(st, patch); return { ...st }; } };
    __app.ctx.openErosync = async () => { window.__opened++; return true; };
  });
  // ── 인물 위키: 리안
  await page.evaluate(() => { const m = __app.ctx.state.memory ?? null; });
  await page.evaluate(() => __app.ctx.go("relmap")); await page.waitForTimeout(900);
  // 관계도: 버튼이 보이고, 누르면 Erosync 층만(리안·카엘)
  const eroBtn = page.locator(".rb-rm-ctrls button", { hasText: "Erosync 목표·경쟁만 보기" });
  ok(`[${tag}] 관계도에 Erosync 버튼`, (await eroBtn.count()) === 1);
  const before = await page.locator(".rb-rm-panel .rb-rm-list").last().locator("button").count();
  await eroBtn.click(); await page.waitForTimeout(500);
  const after = await page.locator(".rb-rm-panel .rb-rm-list").last().locator("button").count();
  ok(`[${tag}] Erosync만 보기: 인물이 ${before}명 → ${after}명(리안·카엘 포함, 줄어듦)`, before >= 6 && after >= 2 && after < before, `${before} → ${after}`);
  ok(`[${tag}] 눌린 상태(aria-pressed)`, (await eroBtn.getAttribute("aria-pressed")) === "true");
  ok(`[${tag}] 범례가 목표·경쟁으로`, /목표/.test(await page.locator(".rb-rm-legend").textContent()) && /경쟁/.test(await page.locator(".rb-rm-legend").textContent()));
  await page.screenshot({ path: `/tmp/ero-relmap-${tag}.png` });
  await page.locator(".rb-rm-panel .rb-rm-list").last().locator("button", { hasText: "리안" }).click(); await page.waitForTimeout(300);
  ok(`[${tag}] Erosync 층에서 인물을 눌러도 화면이 깨지지 않는다(해당 없는 {{user}} 선 건너뜀)`, (await page.locator(".rb-rm-panel h2", { hasText: "리안" }).count()) === 1);
  await eroBtn.click(); await page.waitForTimeout(400);
  ok(`[${tag}] 다시 누르면 전체로 복귀`, (await page.locator(".rb-rm-panel .rb-rm-list").last().locator("button").count()) >= before);
  // Erosync 화면의 ‘관계망’ 탭에서 넘어오면(eroOnOpen) Erosync 층이 자동으로 켜진다
  await page.evaluate(() => { (__app.ctx.state.relmap ??= {}).eroOnOpen = true; __app.ctx.go("memory"); }); await page.waitForTimeout(500);
  await page.evaluate(() => __app.ctx.go("relmap")); await page.waitForTimeout(900);
  ok(`[${tag}] 관계망 탭에서 넘어오면 Erosync 층이 자동으로 켜짐`, (await page.locator(".rb-rm-ctrls button", { hasText: "Erosync 목표·경쟁만 보기" }).getAttribute("aria-pressed")) === "true");
  await page.locator(".rb-rm-ctrls button", { hasText: "Erosync 목표·경쟁만 보기" }).click(); await page.waitForTimeout(300);
  // 위키로(기억 > 인물 상세, 시험 데이터의 시로코)
  await page.locator(".rb-rm-panel .rb-rm-list").last().locator("button", { hasText: "시로코" }).first().click(); await page.waitForTimeout(200);
  await page.locator(".rb-rm-panel .rb-btn.primary").click(); await page.waitForTimeout(1500);
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem, { personKey: "sirokko", tab: "people", page: "detail" }); __app.ctx.go("relmap"); }); await page.waitForTimeout(300); await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(1500);   // 시험 데이터의 폴더 키
  const body = async () => (await page.locator(".rb-wk2").first().textContent().catch(() => "")) ?? "";
  ok(`[${tag}] 위키 요약에 '지금 노리는 목표'`, /지금 노리는 목표/.test(await body()) && /순찰 끝나고 둘이 남기/.test(await body()));
  await page.locator(".rb-wk2-tab", { hasText: "상세 정보" }).click(); await page.waitForTimeout(400);
  ok(`[${tag}] 상세 정보에 'Erosync 성향' 8축 게이지`, (await page.locator(".rb-wk2-ero").filter({ hasText: "Erosync 성향" }).count()) === 1 && /주도성/.test(await body()));
  const adult = page.locator(".rb-wk2-ero details summary", { hasText: "성인 항목" });
  ok(`[${tag}] 성인 항목은 접혀 있다`, (await adult.count()) === 1 && !(await page.locator(".rb-wk2-ero details").first().evaluate((d) => d.open)));
  await adult.click(); await page.waitForTimeout(150);
  ok(`[${tag}] 펼치면 성적 관심`, /성적 관심/.test(await body()));
  await page.screenshot({ path: `/tmp/ero-wiki-info-${tag}.png` });
  await page.locator(".rb-wk2-ero .rb-wk2-link", { hasText: "Erosync에서 고치기" }).click(); await page.waitForTimeout(150);
  ok(`[${tag}] 'Erosync에서 고치기'가 Erosync 화면 열기를 부른다`, (await page.evaluate(() => window.__opened)) === 1);
  await page.locator(".rb-wk2-tab", { hasText: "관계" }).click(); await page.waitForTimeout(300);
  await page.locator(".rb-wk2-who", { hasText: "호시노" }).first().click().catch(() => {}); await page.waitForTimeout(300);
  ok(`[${tag}] 관계 탭(호시노)에 'Erosync 목표·경쟁'`, /Erosync 목표·경쟁/.test(await body()), (await body()).slice(0, 200));
  // 기억 화면에서 Erosync 카드가 접힌 곳 없이 바로 보인다(고급 모드 기본)
  await page.evaluate(() => { const m = (__app.ctx.state.mem ??= {}); m.page = "home"; __app.ctx.go("memory"); }); await page.waitForTimeout(1200);
  ok(`[${tag}] 기억 화면에 Erosync 줄이 바로 보임`, await page.locator("#rb-mem-go-erosync").isVisible(), String(await page.locator("#rb-mem-go-erosync").count()));
  await page.locator("#rb-mem-go-erosync").click(); await page.waitForTimeout(600);
  ok(`[${tag}] 줄을 누르면 Erosync 설정 화면(켜기 스위치)이 열림`, await page.locator("#rb-erosync").isVisible());
  ok(`[${tag}] 수위 카드가 보임`, await page.locator("#rb-erosync-level").isVisible());
  await page.locator("#rb-erosync-level .rb-seg button[data-v=sfw]").click(); await page.waitForTimeout(300);
  ok(`[${tag}] SFW를 고르면 저장되고 극단 행동 수위 칸이 잠김`, (await page.evaluate(() => window.__lv.contentMode)) === "sfw" && await page.locator("#rb-erosync-limit").isDisabled());
  await page.locator("#rb-erosync-level .rb-seg button[data-v=plus]").click(); await page.waitForTimeout(300);
  ok(`[${tag}] 집착 방지 카드가 보임`, await page.locator("#rb-erosync-guard").isVisible());
  await page.locator("#rb-erosync-guard [role=switch]").first().click(); await page.locator("#rb-erosync-g-cap").fill("40"); await page.locator("#rb-erosync-g-cap").blur(); await page.waitForTimeout(200);
  ok(`[${tag}] 집착 방지 켜기·상한 40이 저장됨`, await page.evaluate(() => window.__gd?.on === true && window.__gd.obsessionCap === 40), JSON.stringify(await page.evaluate(() => window.__gd)));
  ok(`[${tag}] NSFW+를 고르면 nsfwPlus가 켜짐`, await page.evaluate(() => window.__lv.nsfwPlus === true));
  await page.screenshot({ path: `/tmp/ero-memhome-${tag}.png` });
  // Erosync 꺼짐/매칭 안 됨이면 칸이 없다
  await page.evaluate(() => { __app.ctx.erosync = { isRunning: () => false, read: async () => ({ ok: false }) }; });
  await page.evaluate(() => __app.ctx.go("relmap")); await page.waitForTimeout(300);
  ok(`[${tag}] 페이지 오류 없음`, errs.length === 0, errs.join(" | "));
  await page.context().close();
}
await browser.close();
const bad = out.filter((x) => !x).length; console.log(bad ? `\n✘ 실패 ${bad}개` : `\n모두 통과 (${out.length})`); process.exit(bad ? 1 : 0);
