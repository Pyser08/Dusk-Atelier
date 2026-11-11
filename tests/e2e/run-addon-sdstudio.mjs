// 에셋 제작 애드온(전체 화면): 코어만이면 버튼 없음, 모듈엔 버튼 없음(봇만) → 봇 개발 화면 버튼 줄 아래 폭 가득 '에셋 제작'
// → 플러그인 안 전체 화면(왼쪽 프롬프트·오른쪽 카드) → 캐릭터 추가·만들기(생성 중지에 잡힘)·카드 수 → 폴더(한 줄에 여러 명·안에 폴더·여러 폴더에)
// → 고른 그림을 봇 감정 이미지에 덧붙임(다시 저장 안 함) → 닫고 다시 열면 그대로 → 끄면 버튼 사라짐. 좁은 폭(390)도.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/sdstudio.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.1.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const shotDir = process.env.SHOTS;

async function boot(width, height = 860) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced", devMode: true }) }, { coreOnly: true, mods: true }));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__app.ctx.svc.meta((m) => { m.devProjects = [{ kind: "module", id: "m1", addedAt: 1, version: "", releases: [] }, { kind: "character", id: "c2", addedAt: 1, version: "", releases: [] }]; });
    const api = window.__api;
    window.__gen = []; window.__saved = [];
    // 진짜 PNG(캔버스) — 화면 사진에서 카드·그림이 보이게. 프롬프트 글자로 색을 정함
    const png = (prompt) => new Promise((res) => {
      const c = document.createElement("canvas"); c.width = 166; c.height = 242;
      const g = c.getContext("2d"); let hsh = 0; for (const ch of prompt) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
      const hue = (hsh + window.__gen.length * 37) % 360;
      g.fillStyle = `hsl(${hue},45%,88%)`; g.fillRect(0, 0, 166, 242);
      g.fillStyle = `hsl(${hue},40%,35%)`; g.beginPath(); g.arc(83, 80, 34, 0, 7); g.fill(); g.fillRect(43, 120, 80, 122);
      c.toBlob(async (b) => res(new Uint8Array(await b.arrayBuffer())), "image/png");
    });
    api.nativeFetch = async (u, o) => {
      if (!/generate-image$/.test(u)) return { status: 404, body: null };
      const body = JSON.parse(o.body);
      window.__gen.push({ auth: o.headers.Authorization, body, method: o.method });
      await new Promise((res) => setTimeout(res, window.__genDelay ?? 200));
      if (o.headers.Authorization === "Bearer bad") return { status: 401, ok: false, body: new TextEncoder().encode('{"message":"Unauthorized"}') };
      const z = window.__zipSync({ "image_0.png": await png(body.input) });
      const dv = new DataView(z.buffer); dv.setUint16(6, dv.getUint16(6, true) | 8, true); dv.setUint32(18, 0, true);
      return { status: 200, ok: true, body: new ReadableStream({ start(c) { c.enqueue(z.slice(0, 100)); c.enqueue(z.slice(100)); c.close(); } }) };
    };
    window.__assetBytes = {};
    api.saveAsset = async (d) => { window.__saved.push(d.length); const p = `assets/${window.__saved.length}.png`; window.__assetBytes[p] = d; return p; };
    api.readImage = async (p) => window.__assetBytes[p] ?? null;   // 다시 열 때 호스트에서 읽어 오는 길
    if (typeof api.getLocalPluginStorage !== "function") { const local = {}; api.getLocalPluginStorage = async () => ({ getItem: async (k) => local[k] ?? null, setItem: async (k, v) => { local[k] = v; } }); }
  });
  return { page, errs };
}
const pick = async (page, sel) => { await page.evaluate((s) => { window.__app.ctx.state.devSel = s; window.__app.ctx.go("dev"); }, sel); await page.waitForTimeout(600); };
const on = (page) => page.evaluate(async () => { window.__h = await window.__sd.activate(window.__api, { ext: window.__app.ctx.ext, app: window.__app.ctx, toast: () => {} }); });
const txt = (page, sel) => page.locator(sel).innerText();
const promptOk = async (page, value) => { const i = page.locator(".rb-modal input").first(); await i.fill(value); await page.locator(".rb-modal .rb-dialog button.primary").click(); await page.waitForTimeout(250); };
const newFolder = async (page, name, kind) => { await page.fill("#rb-sd-fname", name); if (kind) await page.locator(".rb-modal .rb-seg button", { hasText: kind }).click(); await page.click("#rb-sd-fok"); await page.waitForTimeout(250); };
const selectCard = (page, name) => page.locator("#rb-sd-cards .rb-sd-card", { hasText: name }).first().click();

{ const { page, errs } = await boot(1280);
  await pick(page, "c:c2");
  ok("코어만: 에셋 제작 버튼 없음", (await page.locator("#rb-sd-make").count()) === 0);
  await on(page);
  await pick(page, "m:m1");
  ok("모듈 개발 화면엔 버튼 없음(봇만)", (await page.locator("#rb-sd-make").count()) === 0);
  await pick(page, "c:c2");
  const geo = await page.evaluate(() => { const b = document.querySelector("#rb-sd-make"), row = document.querySelector("#rb-dev-export")?.parentElement; if (!b || !row) return null; const br = b.getBoundingClientRect(), rr = row.getBoundingClientRect(); return { below: br.top >= rr.bottom, w: Math.round(br.width), rw: Math.round(rr.width) }; });
  ok("봇: 불러오기·내보내기 줄 아래 폭 가득", !!geo && geo.below && Math.abs(geo.w - geo.rw) <= 2, JSON.stringify(geo));

  await page.click("#rb-sd-make"); await page.waitForTimeout(400);
  const full = await page.evaluate(() => { const p = document.querySelector("#rb-sd-studio")?.getBoundingClientRect(), w = window.__app.ctx.win.getBoundingClientRect(); return { p: p && [p.width, p.height].map(Math.round), w: [w.width, w.height].map(Math.round), inWin: document.querySelector("#rb-sd-studio")?.parentElement === window.__app.ctx.win }; });
  ok("누르면 플러그인 안 전체 화면", full.inWin && Math.abs(full.p[0] - full.w[0]) <= 4 && Math.abs(full.p[1] - full.w[1]) <= 4, JSON.stringify(full));
  ok("처음엔 빈 안내 + 만들기 꺼짐", /이 봇에 들어갈 캐릭터를 만들어요/.test(await txt(page, "#rb-sd-pane")) && await page.locator("#rb-sd-gen").isDisabled());

  await page.click("#rb-sd-addchar"); await page.waitForTimeout(250);
  ok("첫 캐릭터 이름은 봇 이름으로 채워 둠", (await page.locator(".rb-modal input").first().inputValue()) === "호시노");
  await promptOk(page, "호시노");
  ok("추가하면 카드가 생기고 골라짐", (await page.locator("#rb-sd-cards .rb-sd-card[aria-selected='true']").count()) === 1);
  await page.fill("#rb-sd-top", "masterpiece, best quality");
  await page.fill("#rb-sd-cprompt", "1girl, pink hair, sleepy");
  await page.fill("#rb-sd-token", "pst-abc");
  await page.locator("#rb-sd-side .rb-seg[aria-label='장 수'] button", { hasText: "2장" }).click();
  await page.evaluate(() => { window.__genDelay = 700; });
  await page.click("#rb-sd-gen"); await page.waitForTimeout(550);
  ok("만드는 동안 생성 중지 버튼", (await page.locator(".rb-ai-stop").count()) >= 1);
  await page.waitForTimeout(1600);
  await page.evaluate(() => { window.__genDelay = 150; });
  const g = await page.evaluate(() => window.__gen.map((x) => x.body.input));
  ok("공통+캐릭터 프롬프트로 2장 요청", g.length === 2 && g.every((x) => x === "masterpiece, best quality, 1girl, pink hair, sleepy"), JSON.stringify(g));
  ok("그림 2장이 이미지 칸에, 카드 수 2", (await page.locator("#rb-sd-imgs .rb-sd-img").count()) === 2 && /2$/.test((await txt(page, "#rb-sd-cards .rb-sd-card")).trim()));
  ok("만든 그림은 바로 호스트 에셋으로 저장(경로만 기록)", (await page.evaluate(() => window.__saved.length)) === 2);

  // 캐릭터 둘 더 + 폴더
  for (const [n, pr] of [["시로코", "1girl, grey hair, wolf ears"], ["노노미", "1girl, long hair, smile"]]) {
    await page.click("#rb-sd-addchar"); await page.waitForTimeout(200); await promptOk(page, n);
    await page.fill("#rb-sd-cprompt", pr); await page.click("#rb-sd-gen"); await page.waitForTimeout(500);
  }
  await page.click("#rb-sd-addfolder"); await page.waitForTimeout(200); await newFolder(page, "아비도스", "소속");
  for (const n of ["호시노", "시로코", "노노미"]) { await selectCard(page, n); await page.waitForTimeout(150); await page.locator("#rb-sd-cfolders .rb-chip", { hasText: "아비도스" }).click(); await page.waitForTimeout(150); }
  const row = await page.evaluate(() => { const f = document.querySelector(".rb-sd-frow"); const cs = [...(f?.querySelectorAll(".rb-sd-card") ?? [])]; return { n: cs.length, oneLine: new Set(cs.map((c) => Math.round(c.getBoundingClientRect().top))).size === 1, badge: f?.querySelector(".rb-badge")?.textContent }; });
  ok("폴더 한 줄에 캐릭터 3명, 종류 표시", row.n === 3 && row.oneLine && row.badge === "소속", JSON.stringify(row));
  ok("모두 폴더에 들어가면 '폴더 없는 캐릭터' 칸은 사라짐", (await page.locator("#rb-sd-cards .rb-sd-card").count()) === 0);
  if (shotDir) await page.screenshot({ path: `${shotDir}/sd-1-root.png` });

  await page.locator(".rb-sd-fopen", { hasText: "아비도스" }).click(); await page.waitForTimeout(300);
  ok("폴더에 들어가면 경로 '전체 › 아비도스'와 캐릭터 카드", /전체\s*›\s*아비도스/.test(await txt(page, "#rb-sd-crumbs")) && (await page.locator("#rb-sd-cards .rb-sd-card").count()) === 3);
  await page.locator("#rb-sd-crumbs button[aria-label='폴더 메뉴']").click(); await page.locator(".rb-menu button", { hasText: "안에 폴더 만들기" }).click(); await page.waitForTimeout(200);
  await newFolder(page, "수영복", "복장");
  await selectCard(page, "시로코"); await page.waitForTimeout(150);
  await page.locator("#rb-sd-cfolders .rb-chip", { hasText: "아비도스 › 수영복" }).click(); await page.waitForTimeout(200);
  const inAbi = await page.evaluate(() => ({ rows: [...document.querySelectorAll(".rb-sd-frow")].map((f) => [f.querySelector("b").textContent, f.querySelectorAll(".rb-sd-card").length]), cards: document.querySelectorAll("#rb-sd-cards .rb-sd-card").length, chips: [...document.querySelectorAll("#rb-sd-cfolders .rb-chip[aria-pressed='true']")].map((c) => c.textContent) }));
  ok("안에 폴더(수영복)·한 캐릭터가 두 폴더에", JSON.stringify(inAbi.rows) === JSON.stringify([["수영복", 1]]) && inAbi.cards === 3 && inAbi.chips.length === 2, JSON.stringify(inAbi));

  // 봇에 넣기
  await selectCard(page, "호시노"); await page.waitForTimeout(200);
  await page.locator("#rb-sd-imgs .rb-sd-img").first().click(); await page.waitForTimeout(150);
  ok("그림을 고르면 아래 넣기 줄", await page.locator("#rb-sd-putbar").isVisible() && /1장 고름/.test(await txt(page, "#rb-sd-putbar")));
  await page.locator("#rb-sd-putbar .rb-seg button", { hasText: "감정 이미지" }).click();
  await page.fill("#rb-sd-name", "sleepy");
  if (shotDir) await page.screenshot({ path: `${shotDir}/sd-2-folder.png` });
  const savedBefore = await page.evaluate(() => window.__saved.length);
  await page.click("#rb-sd-put"); await page.waitForTimeout(400);
  const w = await page.evaluate(() => window.__charWrites?.at(-1));
  ok("봇 감정 이미지에 [sleepy, 경로] 덧붙임, 다시 저장 안 함", w?.i === 1 && JSON.stringify(w.c.emotionImages?.at(-1)) === JSON.stringify(["sleepy", "assets/2.png"]) && (await page.evaluate(() => window.__saved.length)) === savedBefore, JSON.stringify(w?.c?.emotionImages));
  ok("넣은 뒤 고르기 풀림", !(await page.locator("#rb-sd-putbar").isVisible()));

  // 닫고 다시 열기
  await page.waitForTimeout(500);
  await page.locator("#rb-sd-studio .rb-full-head button[aria-label='닫기']").click(); await page.waitForTimeout(200);
  ok("닫으면 전체 화면이 사라짐", (await page.locator("#rb-sd-studio").count()) === 0);
  const stored = await page.evaluate(async () => JSON.parse(await window.__api.pluginStorage.getItem("dusk.sdstudio.p.c2")));
  ok("봇별로 저장(pluginStorage dusk.sdstudio.p.<봇>)", stored?.chars?.length === 3 && stored.folders.length === 2 && stored.top === "masterpiece, best quality");
  await page.click("#rb-sd-make"); await page.waitForTimeout(500);
  ok("다시 열면 보던 폴더·캐릭터·그림 그대로", /아비도스/.test(await txt(page, "#rb-sd-crumbs")) && (await page.locator("#rb-sd-imgs .rb-sd-img").count()) === 2 && (await page.locator("#rb-sd-cprompt").inputValue()) === "1girl, pink hair, sleepy");
  await page.waitForTimeout(400);
  const loaded = await page.evaluate(() => [...document.querySelectorAll("#rb-sd-imgs img")].filter((i) => i.dataset.loaded === "1" || i.src.startsWith("blob:")).length);
  ok("다시 연 그림은 호스트에서 읽어 옴(readImage)", loaded === 2, String(loaded));

  // 중지
  await page.evaluate(() => { window.__genDelay = 3000; });
  await page.click("#rb-sd-gen"); await page.waitForTimeout(700);
  await page.locator(".rb-ai-stop").first().click(); await page.waitForTimeout(300);
  ok("생성 중지 → '멈췄어요'", /멈췄어요/.test(await txt(page, "#rb-sd-status")));
  await page.locator("#rb-sd-studio").press("Escape"); await page.waitForTimeout(200);
  ok("Esc로 닫힘", (await page.locator("#rb-sd-studio").count()) === 0);

  await page.evaluate(() => window.__h.deactivate()); await pick(page, "c:c2");
  ok("끄면 버튼 사라짐", (await page.locator("#rb-sd-make").count()) === 0);
  ok("오류 없음(PC)", !errs.length, errs.join(";"));
  await page.close(); }

{ const { page, errs } = await boot(390, 844);
  await on(page); await pick(page, "");
  await page.locator(".rb-row", { hasText: "호시노" }).first().click(); await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector("#rb-sd-make")?.scrollIntoView());
  await page.locator("#rb-sd-make").click(); await page.waitForTimeout(400);
  await page.click("#rb-sd-addchar"); await page.waitForTimeout(200); await promptOk(page, "호시노");
  await page.fill("#rb-sd-cprompt", "1girl"); await page.fill("#rb-sd-token", "pst-abc"); await page.click("#rb-sd-gen"); await page.waitForTimeout(600);
  const fit = await page.evaluate(() => { const els = ["#rb-sd-studio", "#rb-sd-side", "#rb-sd-pane"].map((s) => document.querySelector(s)?.getBoundingClientRect()); return els.every((r) => r && r.left >= -1 && r.right <= innerWidth + 1); });
  ok("모바일: 전체 화면·왼쪽 칸·오른쪽 칸이 폭 안", fit);
  ok("모바일: 카드와 그림이 보임", (await page.locator("#rb-sd-cards .rb-sd-card").count()) === 1 && (await page.locator("#rb-sd-imgs .rb-sd-img").count()) === 1);
  if (shotDir) await page.screenshot({ path: `${shotDir}/sd-3-mobile.png` });
  ok("오류 없음(모바일)", !errs.length, errs.join(";"));
  await page.close(); }
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
