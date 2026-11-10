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
  // 훅: 실제 번들 코드로 저장·표시·요청
  const hk = await page.evaluate(async () => { const h = window.__mcHooks; const o = await h.output(`<img="Ryu Hae-yeon smile">`); const d = await h.display(o); const p = h.process(o); const req = await h.beforeRequest([{ role: "system", content: "x" }, { role: "user", content: "hi", memo: "a" }], "model"); return { changed: o !== `<img="Ryu Hae-yeon smile">`, d, p, block: req.some((m) => String(m.content).startsWith("[Dusk · module images]")) }; });
  ok(`${label}: 훅 — 저장 때 지키고 표시·요청 때 되돌림`, hk.changed && hk.d === `<img="Ryu Hae-yeon smile">` && hk.p === hk.d, JSON.stringify(hk));
  ok(`${label}: 훅 — 요청에 안내 블록`, hk.block);
  // 끄기 → 저장되고 훅이 멈춘다
  await page.evaluate(() => { const row = [...document.querySelectorAll(".rb-main .rb-toggle-row, .rb-main [class*=toggle]")].find((x) => /이 봇에서 모듈 호환 쓰기/.test(x.textContent)); (row?.querySelector("input,button,[role=switch]") ?? row)?.click(); });
  await page.waitForTimeout(900);
  const off = await page.evaluate(async () => (await window.__mcHooks.output(`<img="Ryu Hae-yeon smile">`)) === `<img="Ryu Hae-yeon smile">`);
  const saved = await page.evaluate(() => window.__api.store["dusk.addon.data.modcompat.settings"] ?? "");
  ok(`${label}: 끄면 저장되고 훅이 글을 그대로 둔다`, off && /"on":false/.test(saved), saved);
  if (shot) await page.screenshot({ path: `${shot}-${label === "PC" ? "pc" : "mobile"}.png`, fullPage: true });
  ok(`${label}: 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
