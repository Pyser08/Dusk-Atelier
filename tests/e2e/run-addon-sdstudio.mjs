// 에셋 제작 애드온: 코어만이면 버튼 없음 → 켜면 개발 탭 버튼 줄 아래 폭 가득 '에셋 제작' → 창에서 토큰·프롬프트 → 만들기(생성 중지 버튼에 잡힘)
// → 고른 그림을 봇 추가 에셋·감정 이미지 / 모듈 에셋에 덧붙임(기존 에셋 유지) → 끄면 버튼 사라짐. 좁은 폭(390)에서도 창이 화면 안.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/sdstudio.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.1.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const shotDir = process.env.SHOTS;

async function boot(width) {
  const page = await (await browser.newContext({ viewport: { width, height: 860 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced", devMode: true }) }, { coreOnly: true, mods: true }));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__app.ctx.svc.meta((m) => { m.devProjects = [{ kind: "module", id: "m1", addedAt: 1, version: "", releases: [] }, { kind: "character", id: "c2", addedAt: 1, version: "", releases: [] }]; });
    const api = window.__api;
    window.__gen = []; window.__saved = []; window.__dbw = [];
    // 가짜 NAI: 데이터 기술자 zip(flags=8, 로컬 크기 0)을 ReadableStream으로 — RisuBard 실기기와 같은 모양
    api.nativeFetch = async (u, o) => {
      if (!/generate-image$/.test(u)) return { status: 404, body: null };
      window.__gen.push({ auth: o.headers.Authorization, body: JSON.parse(o.body), method: o.method });
      await new Promise((res) => setTimeout(res, window.__genDelay ?? 300));
      if (o.headers.Authorization === "Bearer bad") return { status: 401, ok: false, body: new TextEncoder().encode('{"message":"Unauthorized"}') };
      const png = new Uint8Array(4000); png.set([0x89, 0x50, 0x4e, 0x47]); png[10] = window.__gen.length;
      const z = window.__zipSync({ "image_0.png": png });
      const dv = new DataView(z.buffer); dv.setUint16(6, dv.getUint16(6, true) | 8, true); dv.setUint32(18, 0, true);
      return { status: 200, ok: true, body: new ReadableStream({ start(c) { c.enqueue(z.slice(0, 100)); c.enqueue(z.slice(100)); c.close(); } }) };
    };
    if (typeof api.getLocalPluginStorage !== "function") { const local = {}; api.getLocalPluginStorage = async () => ({ getItem: async (k) => local[k] ?? null, setItem: async (k, v) => { local[k] = v; } }); }
    api.saveAsset = async (d) => { window.__saved.push(d.length); return `assets/${window.__saved.length}.png`; };
    const sdb = api.setDatabaseLite, sd2 = api.setDatabase;
    api.setDatabaseLite = async (d) => { window.__dbw.push(structuredClone(d)); return sdb?.(d); };
    api.setDatabase = async (d) => { window.__dbw.push(structuredClone(d)); return sd2?.(d); };
  });
  return { page, errs };
}
const pick = async (page, sel) => { await page.evaluate((s) => { window.__app.ctx.state.devSel = s; window.__app.ctx.go("dev"); }, sel); await page.waitForTimeout(600); };
const on = (page) => page.evaluate(async () => { window.__h = await window.__sd.activate(window.__api, { ext: window.__app.ctx.ext, app: window.__app.ctx, toast: () => {} }); });

{ const { page, errs } = await boot(1200);
  await pick(page, "c:c2");
  ok("코어만: 에셋 제작 버튼 없음", (await page.locator("#rb-sd-make").count()) === 0);
  await on(page); await pick(page, "c:c2");
  const geo = await page.evaluate(() => { const b = document.querySelector("#rb-sd-make"), row = document.querySelector("#rb-dev-export")?.parentElement; if (!b || !row) return null; const br = b.getBoundingClientRect(), rr = row.getBoundingClientRect(); return { below: br.top >= rr.bottom, w: Math.round(br.width), rw: Math.round(rr.width), txt: b.textContent.trim() }; });
  ok("켜면 불러오기·내보내기 줄 아래 폭 가득 '에셋 제작'", !!geo && geo.below && Math.abs(geo.w - geo.rw) <= 2 && geo.txt === "에셋 제작", JSON.stringify(geo));
  if (shotDir) await page.screenshot({ path: `${shotDir}/sd-1-dev-button.png` });

  await page.click("#rb-sd-make"); await page.waitForTimeout(300);
  ok("누르면 에셋 제작 창(토큰 칸 보임)", (await page.locator("#rb-sd-dialog").count()) === 1 && await page.locator("#rb-sd-token").isVisible());
  await page.click("#rb-sd-gen"); await page.waitForTimeout(100);
  ok("토큰 없이 만들기 → 안내만, 요청 안 감", (await page.evaluate(() => window.__gen.length)) === 0 && /토큰/.test(await page.locator("#rb-sd-dialog").innerText()));
  await page.fill("#rb-sd-token", "pst-abc"); await page.fill("#rb-sd-prompt", "1girl, smile");
  await page.locator("#rb-sd-dialog .rb-seg[aria-label='장 수'] button", { hasText: "2장" }).click();
  await page.evaluate(() => { window.__genDelay = 800; });
  await page.click("#rb-sd-gen"); await page.waitForTimeout(600);   // 생성 중지 버튼은 0.4초 뒤에 뜸
  ok("만드는 동안 생성 중지 버튼이 보임", (await page.locator(".rb-ai-stop").count()) >= 1 && await page.locator(".rb-ai-stop").first().isVisible());
  await page.waitForTimeout(1600);
  await page.evaluate(() => { window.__genDelay = 300; });
  const g = await page.evaluate(() => window.__gen.map((x) => [x.auth, x.method, x.body.input, x.body.parameters.width]));
  ok("2장 요청: 토큰·POST·프롬프트·세로 크기", g.length === 2 && g.every((x) => x[0] === "Bearer pst-abc" && x[1] === "POST" && x[2] === "1girl, smile" && x[3] === 832), JSON.stringify(g));
  ok("그림 2장이 고른 상태로 보임, 넣기 버튼 '2장 넣기'", (await page.locator(".rb-sd-thumb[aria-pressed='true']").count()) === 2 && /2장 넣기/.test(await page.locator("#rb-sd-put").innerText()));
  const tokenKept = await page.evaluate(async () => (await (await window.__api.getLocalPluginStorage()).getItem("dusk.sdstudio.token")));
  ok("토큰은 로컬 저장소에", tokenKept === "pst-abc", String(tokenKept));
  if (shotDir) await page.screenshot({ path: `${shotDir}/sd-2-dialog.png` });

  await page.locator(".rb-sd-thumb").nth(1).click();
  await page.locator("#rb-sd-dialog .rb-seg[aria-label='넣을 자리'] button", { hasText: "감정 이미지" }).click();
  await page.fill("#rb-sd-name", "smile");
  await page.click("#rb-sd-put"); await page.waitForTimeout(500);
  const w = await page.evaluate(() => window.__charWrites?.at(-1));
  ok("봇: 고른 1장만 감정 이미지에 [smile, 경로]로 덧붙임", w?.i === 1 && JSON.stringify(w.c.emotionImages?.at(-1)) === JSON.stringify(["smile", "assets/1.png"]) && (await page.evaluate(() => window.__saved.length)) === 1, JSON.stringify(w?.c?.emotionImages));
  ok("넣고 나면 창이 닫힘", (await page.locator("#rb-sd-dialog").count()) === 0);

  // 모듈: 토큰은 기억됨, 모듈 에셋에 덧붙음
  await pick(page, "m:m1");
  await page.click("#rb-sd-make"); await page.waitForTimeout(300);
  ok("다시 열면 토큰 칸은 숨고 '저장됨'", !(await page.locator("#rb-sd-token").isVisible()) && /토큰 저장됨/.test(await page.locator("#rb-sd-dialog").innerText()));
  ok("모듈은 넣을 자리 고르기 없음", (await page.locator("#rb-sd-dialog .rb-seg[aria-label='넣을 자리']").count()) === 0);
  await page.fill("#rb-sd-prompt", "classroom, background"); await page.click("#rb-sd-gen"); await page.waitForTimeout(700);
  await page.click("#rb-sd-put"); await page.waitForTimeout(700);
  const m1 = await page.evaluate(() => window.__dbw.at(-1)?.modules?.find((m) => m.id === "m1")?.assets);   // 가짜 DB는 쓰기를 기억하지 않아 마지막 저장값으로 확인
  ok("모듈: 모듈 에셋에 [image, 경로, png]", JSON.stringify(m1?.at(-1)) === JSON.stringify(["image", "assets/2.png", "png"]), JSON.stringify(m1));

  // 중지·잘못된 토큰
  await pick(page, "c:c2");
  await page.click("#rb-sd-make"); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__genDelay = 3000; });
  await page.fill("#rb-sd-prompt", "1girl"); await page.click("#rb-sd-gen"); await page.waitForTimeout(700);
  await page.locator(".rb-ai-stop").first().click(); await page.waitForTimeout(300);
  ok("생성 중지를 누르면 바로 '멈췄어요', 그림 없음", /멈췄어요/.test(await page.locator("#rb-sd-dialog").innerText()) && (await page.locator(".rb-sd-thumb").count()) === 0);
  await page.evaluate(() => { window.__genDelay = 50; });
  await page.waitForTimeout(2100);   // 중지 직후 잠깐은 다시 부르지 않음(aistop GRACE)
  await page.locator("#rb-sd-dialog button", { hasText: "바꾸기" }).click();
  await page.fill("#rb-sd-token", "bad"); await page.click("#rb-sd-gen"); await page.waitForTimeout(400);
  ok("토큰이 틀리면 알기 쉬운 오류 + 토큰 칸 다시 보임", /토큰이 맞지 않아요/.test(await page.locator("#rb-sd-dialog").innerText()) && await page.locator("#rb-sd-token").isVisible());
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  ok("Esc로 닫힘", (await page.locator("#rb-sd-dialog").count()) === 0);

  await page.evaluate(() => window.__h.deactivate()); await pick(page, "c:c2");
  ok("끄면 버튼 사라짐", (await page.locator("#rb-sd-make").count()) === 0);
  ok("오류 없음(PC)", !errs.length, errs.join(";"));
  await page.close(); }

{ const { page, errs } = await boot(390);
  await on(page); await pick(page, "");
  await page.locator(".rb-row", { hasText: "호시노" }).first().click(); await page.waitForTimeout(600);   // 모바일은 줄을 눌러야 상세가 열림
  await page.evaluate(() => document.querySelector("#rb-sd-make")?.scrollIntoView());
  ok("모바일: 버튼 보임", await page.locator("#rb-sd-make").isVisible());
  await page.locator("#rb-sd-make").click(); await page.waitForTimeout(300);
  const fit = await page.evaluate(() => { const r = document.querySelector("#rb-sd-dialog").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; });
  ok("모바일: 창이 화면 폭 안", fit);
  if (shotDir) await page.screenshot({ path: `${shotDir}/sd-3-mobile.png` });
  ok("오류 없음(모바일)", !errs.length, errs.join(";"));
  await page.close(); }
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
