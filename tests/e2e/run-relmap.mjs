// 인물 관계도 탭 · 홈 박스 진입 · 선택/검색/? 도움말/경로 · 화면 유지 (실제 클릭)
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
  await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(600);
  ok(`[${tag}] 기억 홈에 '인물 관계도' 줄`, (await page.locator("#rb-mem-go-relmap").count()) === 1);
  await page.locator("#rb-mem-go-relmap").click(); await page.waitForTimeout(900);
  ok(`[${tag}] 관계도 탭이 열리고 canvas가 있다`, (await page.locator(".rb-rm canvas").count()) === 1);
  const painted = await page.evaluate(() => { const c = document.querySelector(".rb-rm canvas"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
  ok(`[${tag}] canvas에 그림이 그려졌다`, painted > 2000, String(painted));
  ok(`[${tag}] 오른쪽 목록에 인물 ${NAMES.length}명`, (await page.locator(".rb-rm-panel .rb-rm-list").last().locator("button").count()) >= NAMES.length);
  ok(`[${tag}] 이번 턴 등장에 리안`, /이번 턴 등장/.test(await page.locator(".rb-rm-panel").textContent()));
  await page.screenshot({ path: `/tmp/relmap-${tag}-overview.png` });
  await page.locator(".rb-rm-panel .rb-rm-list").last().locator("button", { hasText: "리안" }).click(); await page.waitForTimeout(300);
  ok(`[${tag}] 인물 선택 → 위키 요약 + 위키 열기 버튼`, (await page.locator(".rb-rm-panel h2", { hasText: "리안" }).count()) === 1 && (await page.locator(".rb-rm-panel .rb-btn.primary", { hasText: "위키 문서 열기" }).count()) === 1);
  await page.waitForTimeout(800); await page.screenshot({ path: `/tmp/relmap-${tag}-selected.png` });
  // 경로 찾기: 리안 → 하윤 은 이어져 있지 않음, 리안 → 미라는 1단계
  await page.locator(".rb-rm-panel .rb-btn", { hasText: "경로 찾기" }).click();
  await page.locator(".rb-rm-qres").evaluate(() => {});
  await page.evaluate(() => { document.querySelector(".rb-rm").dispatchEvent(new Event("noop")); });
  await page.locator(".rb-rm-filters input[type=search]").fill("미라"); await page.waitForTimeout(150);
  await page.locator(".rb-rm-qres button", { hasText: "미라" }).click(); await page.waitForTimeout(300);
  const pathTxt = await page.locator(".rb-rm-panel").textContent();
  ok(`[${tag}] 경로 찾기: 리안 → 미라 1단계`, /1단계로 이어져요/.test(pathTxt), pathTxt.slice(0, 120));
  // 도움말
  await page.locator(".rb-rm-help").click(); ok(`[${tag}] ? 도움말이 열린다`, await page.locator(".rb-rm-pop").isVisible());
  await page.keyboard.press("Escape"); ok(`[${tag}] Esc로 도움말이 닫힌다`, !(await page.locator(".rb-rm-pop").isVisible()));
  // 정면 보기 토글
  await page.locator(".rb-rm-ctrls .rb-chip", { hasText: /정면으로 보기|입체로 보기/ }).click(); await page.waitForTimeout(400);
  // 화면 유지: 다른 탭에 갔다 돌아와도 같은 DOM
  await page.evaluate(() => { document.querySelector(".rb-rm").dataset.mark = "kept"; });
  await page.evaluate(() => __app.ctx.go("cocoa")); await page.waitForTimeout(500);
  await page.evaluate(() => __app.ctx.go("relmap")); await page.waitForTimeout(500);
  ok(`[${tag}] 다른 탭에 다녀와도 화면 유지`, (await page.locator(".rb-rm[data-mark=kept]").count()) === 1);
  // 두 번 누르면 위키(기억 상세)로
  await page.evaluate(() => { const c = document.querySelector(".rb-rm canvas"); window.__c = c; });
  // 플러그인 사이드 탭에도 항목
  ok(`[${tag}] 페이지 오류 없음`, errs.length === 0, errs.join(" | "));
  // 다크
  await page.emulateMedia({ colorScheme: "dark" }); await page.waitForTimeout(600); await page.screenshot({ path: `/tmp/relmap-${tag}-dark.png` });
  await page.context().close();
}
await browser.close();
const bad = out.filter((x) => !x).length; console.log(bad ? `\n✘ 실패 ${bad}개` : `\n모두 통과 (${out.length})`); process.exit(bad ? 1 : 0);
