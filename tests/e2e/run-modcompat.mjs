// 모듈 호환 애드온 화면·훅: 지금 봇의 모듈별 처리 방식이 보이고, 끄고 켜면 저장되며, 훅이 실제로 태그를 지킨다. PC·모바일.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.1.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const shot = process.env.SHOT;
for (const [label, vp] of [["PC", { width: 1280, height: 860 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { modcompat: true }));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__app.ctx.go("addon-modcompat")); await page.waitForTimeout(900);
  const t = await page.evaluate(() => document.querySelector(".rb-main").innerText);
  const opts = await page.evaluate(() => [...document.querySelectorAll(".rb-main .rb-mc-pick option")].map((o) => o.textContent));
  ok(`${label}: 봇 고르기(채팅 없이도)`, opts.length === 2 && /지금 연 채팅/.test(opts[0]) && /헌터 모임 · 그룹/.test(opts[1]), opts.join("|"));
  ok(`${label}: 화면 제목·봇 이름`, /모듈 호환/.test(t) && /Alternate Hunters/.test(t), t.slice(0, 200));
  ok(`${label}: 모듈별 처리 — 봇 정규식 그대로·살짝 감싸 지킴`, /더 많은 헌터들/.test(t) && /봇 정규식 그대로/.test(t) && /살짝 감싸 지킴/.test(t), t);
  ok(`${label}: 스스로 그리는 모듈은 '모듈이 직접 안내'`, /오방융합/.test(t) && /모듈이 직접 안내/.test(t));
  ok(`${label}: 봇 이름과 겹치는 이미지 안내`, /같은 이름이 있는 이미지 1장/.test(t));
  ok(`${label}: Lua 겹침 안내`, /Lua 트리거/.test(t));
  ok(`${label}: 이미지 태그 모양`, /<img="\{name\}">/.test(t));
  ok(`${label}: 인물 감지 변수 카드`, /인물 감지 변수/.test(t) && /인물 1명/.test(t) && /Ryu Hae-yeon/.test(t) && /나오면 0 \(자동\)/.test(t), t);
  await page.evaluate(() => [...document.querySelectorAll(".rb-main button")].find((b) => b.textContent.trim() === "끔")?.click());
  await page.waitForTimeout(900);
  const varsSaved = await page.evaluate(() => window.__api.store["dusk.addon.data.modcompat.settings"] ?? "");
  ok(`${label}: 감지 변수 끄기 저장`, /"vars":"off"/.test(varsSaved), varsSaved);
  const pad = await page.evaluate(() => [...document.querySelectorAll(".rb-addon-card")].map((c) => { const s = getComputedStyle(c); return [parseFloat(s.paddingTop), parseFloat(s.paddingLeft)]; }));
  ok(`${label}: 카드 안쪽 여백 14·16 이상`, pad.length >= 4 && pad.every(([a, b]) => a >= 14 && b >= 16), JSON.stringify(pad));
  const over = await page.evaluate(() => { const m = document.querySelector(".rb-main"); return [...m.querySelectorAll(".rb-addon-card *")].filter((e) => e.getBoundingClientRect().right > m.getBoundingClientRect().right + 1).map((e) => e.tagName + "." + e.className).slice(0, 3); });
  ok(`${label}: 가로로 넘치지 않음`, !over.length, over.join(","));
  // 그룹 고르기 → 멤버 봇 기준으로 진단
  await page.evaluate(() => { const s = document.querySelector(".rb-main .rb-mc-pick"); s.value = "1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1200);
  const gt = await page.evaluate(() => document.querySelector(".rb-main").innerText);
  ok(`${label}: 그룹도 설정 가능(멤버 기준)`, /헌터 모임 · 그룹/.test(gt) && /멤버 Alternate Hunters/.test(gt) && /봇 정규식 그대로/.test(gt) && !/그룹 채팅에서는 쓰지 않아요/.test(gt), gt.slice(0, 300));
  await page.evaluate(() => { const s = document.querySelector(".rb-main .rb-mc-pick"); s.value = "0"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1000);
  // 훅: 실제 번들 코드로 저장·표시·요청
  const hk = await page.evaluate(async () => { const h = window.__mcHooks; const o = await h.output(`<img="Ryu Hae-yeon smile">`); const d = await h.display(o); const p = h.process(o); const req = await h.beforeRequest([{ role: "system", content: "x" }, { role: "user", content: "hi", memo: "a" }], "model"); return { changed: o !== `<img="Ryu Hae-yeon smile">`, d, p, block: req.some((m) => String(m.content).startsWith("[Dusk · module images]")) }; });
  ok(`${label}: 훅 — 저장 때 지키고 표시·요청 때 되돌림`, hk.changed && hk.d.trim() === `<img="Ryu Hae-yeon smile">` && hk.p === hk.d, JSON.stringify(hk));
  ok(`${label}: 훅 — 요청에 안내 블록`, hk.block);
  // 끄기 → 저장되고 훅이 멈춘다
  await page.evaluate(() => { const row = [...document.querySelectorAll(".rb-main .rb-toggle-row, .rb-main [class*=toggle]")].find((x) => /이 봇에서 모듈 호환 쓰기/.test(x.textContent)); (row?.querySelector("input,button,[role=switch]") ?? row)?.click(); });
  await page.waitForTimeout(900);
  const off = await page.evaluate(async () => (await window.__mcHooks.output(`<img="Ryu Hae-yeon smile">`)) === `<img="Ryu Hae-yeon smile">`);
  const saved = await page.evaluate(() => window.__api.store["dusk.addon.data.modcompat.settings"] ?? "");
  ok(`${label}: 끄면 저장되고 훅이 글을 그대로 둔다`, off && /"on":false/.test(saved), saved);
  // 모듈 탭 위 전환: 모듈 / 모듈 병합
  await page.evaluate(() => { window.__app.ctx.state.modView = "list"; window.__app.ctx.go("modules"); }); await page.waitForTimeout(900);
  const segs = await page.evaluate(() => [...document.querySelectorAll(".rb-main .rb-modsw button")].map((b) => b.textContent.trim()));
  ok(`${label}: 모듈 탭 위에 모듈/모듈 병합 전환`, segs.join("|") === "📦 모듈|🧩 모듈 병합", segs.join("|"));
  const big = await page.evaluate(() => { const b = document.querySelector(".rb-main .rb-modsw button"); return b ? [parseFloat(getComputedStyle(b).fontSize), b.getBoundingClientRect().height] : [0, 0]; });
  ok(`${label}: 전환 버튼이 크다`, big[0] >= 15 && big[1] >= 38, JSON.stringify(big));
  ok(`${label}: 모듈 목록이 아래에 그려짐`, await page.evaluate(() => !!document.querySelector(".rb-main .rb-modsw-body .rb-list, .rb-main .rb-modsw-body .rb-empty, .rb-main .rb-modsw-body [class*=empty]")));
  await page.evaluate(() => [...document.querySelectorAll(".rb-main .rb-modsw button")][1].click()); await page.waitForTimeout(1200);
  const mt = await page.evaluate(() => document.querySelector(".rb-main .rb-modsw-body").innerText);
  ok(`${label}: 모듈 병합 → 모듈 호환 화면`, /Alternate Hunters/.test(mt) && /모듈별 처리/.test(mt), mt.slice(0, 120));
  const mpad = await page.evaluate(() => [...document.querySelectorAll(".rb-modsw-body .rb-addon-card")].map((c) => parseFloat(getComputedStyle(c).paddingLeft)));
  ok(`${label}: 모듈 병합 칸 카드 여백`, mpad.length >= 3 && mpad.every((x) => x >= 16), JSON.stringify(mpad));
  ok(`${label}: 모듈 병합 칸 스크롤`, await page.evaluate(() => { const s = document.querySelector(".rb-modsw-body .rb-scroll"); return !!s && s.scrollHeight >= s.clientHeight; }));
  await page.evaluate(() => [...document.querySelectorAll(".rb-main .rb-modsw button")][0].click()); await page.waitForTimeout(700);
  ok(`${label}: 다시 모듈 목록`, await page.evaluate(() => !/모듈별 처리/.test(document.querySelector(".rb-main").innerText)));
  if (shot) await page.screenshot({ path: `${shot}-${label === "PC" ? "pc" : "mobile"}.png`, fullPage: true });
  ok(`${label}: 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
{ const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, {}));
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__app.ctx.state.modView = "merge"; window.__app.ctx.go("modules"); }); await page.waitForTimeout(900);
  const t = await page.evaluate(() => document.querySelector(".rb-main").innerText);
  ok("모듈 호환 없음: 모듈 병합 칸에 받기 안내", /모듈 병합은 애드온이에요/.test(t) && /애드온 보러 가기/.test(t), t.slice(0, 200));
  ok("모듈 호환 없음: 오류 없음", !errs.length, errs.join(";"));
  await page.close(); }
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
