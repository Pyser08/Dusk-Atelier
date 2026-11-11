// 에셋 제작 애드온(SDStudio 모양 전체 화면): 봇 편집 '적용' 아래 '에셋 제작' → 창이 화면 가득 → 캐릭터 → 감정 세트 → 예약·생성(조합·상위 | 끼움)
// → 씬 조합 편집·지금 1장 → 월드컵 → 크게 보기(즐겨찾기·변형·업스케일·디렉터 도구) → 봇 감정 이미지로 넣기·씬 대표 넣기
// → 갤러리·검색·동시편집·비교 모드 → 폴더 → 샘플링(V5)·조각·문제 확인 → 닫으면 창 크기 되돌림 → 모듈 편집에도 버튼 → 좁은 폭(390).
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/sdstudio.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.1.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const shotDir = process.env.SHOTS;
const shot = async (page, name) => { if (shotDir) await page.screenshot({ path: `${shotDir}/${name}.png` }); };

async function boot(width, height) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced", devMode: true }) }, { coreOnly: true, mods: true }));
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    window.__app.ctx.svc.meta((m) => { m.devProjects = [{ kind: "module", id: "m1", addedAt: 1, version: "", releases: [] }, { kind: "character", id: "c2", addedAt: 1, version: "", releases: [] }]; });
    const api = window.__api;
    window.__req = []; window.__saved = 0; window.__assetBytes = {};
    const png = (seed, w = 166, hh = 242) => new Promise((res) => {
      const c = document.createElement("canvas"); c.width = w; c.height = hh;
      const g = c.getContext("2d"); const hue = (seed * 47) % 360;
      g.fillStyle = `hsl(${hue},40%,92%)`; g.fillRect(0, 0, w, hh);
      g.fillStyle = `hsl(${hue},35%,30%)`; g.beginPath(); g.arc(w / 2, hh * 0.33, w * 0.2, 0, 7); g.fill(); g.fillRect(w * 0.26, hh * 0.5, w * 0.48, hh * 0.5);
      g.fillStyle = `hsl(${(hue + 180) % 360},60%,55%)`; g.beginPath(); g.moveTo(w * 0.3, hh * 0.2); g.lineTo(w * 0.36, hh * 0.05); g.lineTo(w * 0.44, hh * 0.18); g.fill(); g.beginPath(); g.moveTo(w * 0.56, hh * 0.18); g.lineTo(w * 0.64, hh * 0.05); g.lineTo(w * 0.7, hh * 0.2); g.fill();
      c.toBlob(async (b) => res(new Uint8Array(await b.arrayBuffer())), "image/png");
    });
    const zipped = (data) => { const z = window.__zipSync({ "image_0.png": data }); const dv = new DataView(z.buffer); dv.setUint16(6, dv.getUint16(6, true) | 8, true); dv.setUint32(18, 0, true); return z; };
    const stream = (z) => new ReadableStream({ start(c) { c.enqueue(z.slice(0, 64)); c.enqueue(z.slice(64)); c.close(); } });
    api.nativeFetch = async (u, o) => {
      const path = u.replace(/^https:\/\/image\.novelai\.net/, ""), body = JSON.parse(o.body);
      window.__req.push({ path, body, auth: o.headers.Authorization, method: o.method });
      await new Promise((res) => setTimeout(res, window.__delay ?? 120));
      if (o.headers.Authorization === "Bearer bad") return { status: 401, body: new TextEncoder().encode('{"message":"Unauthorized"}') };
      if (path === "/ai/encode-vibe") return { status: 200, body: new Uint8Array([1, 2, 3, 4]) };
      const n = window.__req.length;
      if (path === "/ai/upscale") return { status: 200, body: stream(zipped(await png(n, 332, 484))) };
      return { status: 200, body: stream(zipped(await png(n))) };
    };
    api.saveAsset = async (d) => { const p = `assets/${++window.__saved}.png`; window.__assetBytes[p] = d; return p; };
    api.readImage = async (p) => window.__assetBytes[p] ?? null;
    if (typeof api.getLocalPluginStorage !== "function") { const local = {}; api.getLocalPluginStorage = async () => ({ getItem: async (k) => local[k] ?? null, setItem: async (k, v) => { local[k] = v; } }); }
    window.__h = await window.__sd.activate(api, { ext: window.__app.ctx.ext, app: window.__app.ctx, toast: () => {} });
  });
  return { page, errs };
}
const pick = async (page, sel) => { await page.evaluate((s) => { window.__app.ctx.state.devSel = s; window.__app.ctx.go("dev"); }, sel); await page.waitForTimeout(600); };
const openStudio = async (page, sel) => { await pick(page, sel); await page.click("#rb-dev-edit"); await page.waitForTimeout(700); await page.click("#rb-sd-make"); await page.waitForTimeout(700); };
const txt = (page, sel) => page.locator(sel).first().innerText();
const promptOk = async (page, value) => { const i = page.locator(".rb-modal input").first(); await i.fill(value); await page.locator(".rb-modal .rb-dialog button.primary").last().click(); await page.waitForTimeout(300); };
const fillArea = async (page, id, v) => { await page.locator(`#${id}`).fill(v); await page.waitForTimeout(50); };
const reqs = (page, path) => page.evaluate((p) => window.__req.filter((x) => x.path === p).map((x) => x.body), path);
const sceneCard = (page, name) => page.locator("#sds-body .sds-scene", { has: page.locator(".cap .n", { hasText: new RegExp(`^${name}$`) }) }).first();

{ const { page, errs } = await boot(1600, 1000);
  await pick(page, "c:c2"); await page.click("#rb-dev-edit"); await page.waitForTimeout(700);
  const subs = await page.evaluate(() => [...document.querySelectorAll("#rb-edit-sub > *")].map((x) => x.id));
  ok("봇 편집: 적용 아래 '에셋' 다음 '에셋 제작'", JSON.stringify(subs) === JSON.stringify(["rb-edit-assets", "rb-sd-make"]), JSON.stringify(subs));
  await page.click("#rb-sd-make"); await page.waitForTimeout(700);
  const full = await page.evaluate(() => { const w = window.__app.ctx.win.getBoundingClientRect(), s = document.querySelector("#rb-sd-studio")?.getBoundingClientRect(); return { w: [w.width, w.height], s: s && [s.width, s.height], vw: [innerWidth, innerHeight] }; });
  ok("에셋 제작: 플러그인 창이 화면 가득", full.s && Math.abs(full.w[0] - full.vw[0]) < 3 && Math.abs(full.w[1] - full.vw[1]) < 3 && Math.abs(full.s[0] - full.w[0]) < 3, JSON.stringify(full));
  ok("처음: 캐릭터 갤러리 + 빈 안내 + 프롬프트 에디터", /캐릭터 갤러리/.test(await txt(page, "#sds-topbar")) && /캐릭터를 만들어요/.test(await txt(page, "#sds-body")) && await page.locator(".sds-left").isVisible());
  const groups = await page.evaluate(() => [...document.querySelectorAll("#sds-tools .sds-group > small")].map((x) => x.textContent));
  ok("도구 무리: 예약·캐릭터 도구·이미지·관리·도움말·설정·검색·보기", JSON.stringify(groups) === JSON.stringify(["예약", "캐릭터 도구", "이미지·관리", "도움말", "설정", "검색", "보기"]), JSON.stringify(groups));

  await page.click("#sds-addchar"); await page.waitForTimeout(250);
  ok("새 캐릭터: 봇 이름으로 채워 둠", (await page.locator(".rb-modal input").first().inputValue()) === "호시노");
  await promptOk(page, "호시노");
  ok("만들면 그 캐릭터의 씬 갤러리(default 씬 1개)", /씬 갤러리/.test(await txt(page, "#sds-topbar")) && (await page.locator("#sds-body .sds-scene").count()) === 1);
  await fillArea(page, "sds-top", "masterpiece, |, white background");
  await fillArea(page, "sds-own", "1boy, cat ears, black hoodie");
  await fillArea(page, "sds-back", "detailed");
  const hl = await page.evaluate(() => [...document.querySelectorAll("#sds-left .sds-pa pre span")].map((s) => s.className));
  ok("프롬프트 칸 문법 색칠(| 표시)", hl.includes("k-pipe"), JSON.stringify(hl));
  await page.click("#sds-emoset"); await page.waitForTimeout(300);
  ok("감정 세트: 씬 20개", (await page.locator("#sds-body .sds-scene").count()) === 20);
  await page.click("#sds-rsv-all"); await page.waitForTimeout(200);
  ok("모든 씬 예약 → 예약된 씬 20/20·생성 20장", /예약된 씬 20\/20/.test(await txt(page, "#sds-reserved")) && /생성 20장/.test(await txt(page, "#sds-run")));
  await page.click("#sds-rsv-clear"); await page.waitForTimeout(200);
  for (const n of ["angry", "smile"]) { await sceneCard(page, n).hover(); await sceneCard(page, n).locator(".quick button", { hasText: "+1" }).click(); await page.waitForTimeout(120); }
  ok("카드 +1: 예약 배지와 알약", (await sceneCard(page, "angry").locator(".rsv").innerText()) === "+1" && /예약된 씬 2\/20/.test(await txt(page, "#sds-reserved")));
  await shot(page, "sd-1-scenes");

  await page.evaluate(() => { window.__delay = 700; });
  await page.click("#sds-run"); await page.waitForTimeout(300);
  ok("토큰 없으면 토큰 창", (await page.locator("#sds-token").count()) === 1);
  await page.fill("#sds-token", "pst-abc"); await page.click("#sds-token-ok"); await page.waitForTimeout(650);
  ok("그리는 동안 생성 중지 버튼·멈추기 버튼", (await page.locator(".rb-ai-stop").count()) >= 1 && /멈추기/.test(await txt(page, "#sds-run")));
  await page.waitForTimeout(1700); await page.evaluate(() => { window.__delay = 120; });
  const g1 = await reqs(page, "/ai/generate-image");
  const ga = g1.find((b) => /angry/.test(b.input));
  ok("예약 2장: 상위 | 자리에 씬 조합, 외형, 하위", g1.length === 2 && !!ga && ga.input.startsWith("masterpiece, angry, v-shaped eyebrows, white background, 1boy, cat ears, black hoodie, detailed"), ga?.input);
  ok("다 그리면 예약 0·카드 수 1", /예약된 씬 0\/20/.test(await txt(page, "#sds-reserved")) && /1$/.test((await sceneCard(page, "angry").locator(".cap").innerText()).trim()));
  await shot(page, "sd-2-generated");

  // 씬 열기 → 조합
  await sceneCard(page, "angry").click(); await page.waitForTimeout(400);
  ok("씬 열기: 경로·씬 조합 편집·그림 1", /호시노\s*›\s*angry/.test(await txt(page, "#sds-crumbs")) && (await page.locator("#sds-slots .sds-slot").count()) === 2 && (await page.locator("#sds-body .sds-img").count()) === 1);
  await page.click("#sds-addslot"); await page.waitForTimeout(200);
  await page.locator("#sds-slots .sds-slot").nth(1).locator("textarea").first().fill("standing");
  await page.locator("#sds-slots .sds-slot").nth(1).locator("button", { hasText: "조각 더하기" }).click(); await page.waitForTimeout(150);
  await page.locator("#sds-slots .sds-slot").nth(1).locator("textarea").nth(1).fill("sitting");
  await page.waitForTimeout(100);
  ok("슬롯 2개·조각 2개 → 조합 2개, 미리보기", /조합 2개/.test(await txt(page, "#sds-scene-edit")) && /angry, v-shaped eyebrows, standing, white background/.test(await txt(page, "#sds-preview")));
  await page.click("#sds-gen-one"); await page.waitForTimeout(800);
  const g2 = (await reqs(page, "/ai/generate-image")).slice(2).map((b) => b.input);
  ok("지금 1장 = 조합 2개 다(standing·sitting)", g2.length === 2 && /standing/.test(g2[0]) && /sitting/.test(g2[1]), JSON.stringify(g2));
  ok("씬 그림 3장", (await page.locator("#sds-body .sds-img").count()) === 3);

  // 월드컵
  await page.click("#sds-cup-btn"); await page.waitForTimeout(400);
  ok("이미지 월드컵 열림", (await page.locator("#sds-cup").count()) === 1);
  await shot(page, "sd-3-cup");
  for (let k = 0; k < 4 && (await page.locator("#sds-cup").count()); k++) { await page.locator("#sds-cup .sds-cup-pick").first().click(); await page.waitForTimeout(350); }
  ok("월드컵 끝 → 1위 배지", (await page.locator("#sds-cup").count()) === 0 && (await page.locator("#sds-body .sds-img .badge", { hasText: "1위" }).count()) === 1);

  // 크게 보기
  await page.locator("#sds-body .sds-img").first().click(); await page.waitForTimeout(500);
  ok("크게 보기 열림(1위 표시)", (await page.locator("#sds-lightbox").count()) === 1 && /1위/.test(await txt(page, "#sds-lb-info")));
  await page.click("#sds-lb-fav"); await page.waitForTimeout(150);
  ok("즐겨찾기 켬", (await page.locator("#sds-lb-fav[aria-pressed='true']").count()) === 1);
  await shot(page, "sd-4-lightbox");
  await page.locator("#sds-lb-info button", { hasText: "변형" }).click(); await page.waitForTimeout(250); await page.click("#sds-i2i-ok"); await page.waitForTimeout(700);
  await page.locator("#sds-lb-info button", { hasText: "업스케일" }).click(); await page.waitForTimeout(300); await page.locator(".rb-modal .rb-dialog button.primary").last().click(); await page.waitForTimeout(700);
  await page.locator("#sds-lb-info button", { hasText: "디렉터 도구" }).click(); await page.locator(".rb-menu button", { hasText: "배경 지우기" }).click(); await page.waitForTimeout(250); await page.locator(".rb-modal .rb-dialog button.primary").last().click(); await page.waitForTimeout(700);
  const i2i = (await reqs(page, "/ai/generate-image")).at(-1), up = await reqs(page, "/ai/upscale"), aug = await reqs(page, "/ai/augment-image");
  ok("변형(img2img)·업스케일·디렉터 도구(배경 지우기) 요청", i2i?.action === "img2img" && !!i2i.parameters.image && up.length === 1 && aug.length === 1 && aug[0].req_type === "bg-removal");
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  ok("씬 그림 6장(변형·업스케일·배경 지우기 더함)", (await page.locator("#sds-body .sds-img").count()) === 6);

  // 봇에 넣기
  await page.locator("#sds-body .sds-img .chk").first().click(); await page.waitForTimeout(100);
  await page.click("#sds-put-sel"); await page.waitForTimeout(250);
  ok("넣기 창: 이름 기본값 = 씬 이름", (await page.locator("#sds-put-name").inputValue()) === "angry");
  await page.click("#sds-put-ok"); await page.waitForTimeout(400);
  let w = await page.evaluate(() => window.__charWrites?.at(-1));
  ok("봇 감정 이미지에 [angry, 경로]", w?.i === 1 && w.c.emotionImages?.at(-1)?.[0] === "angry" && /^assets\//.test(w.c.emotionImages.at(-1)[1]), JSON.stringify(w?.c?.emotionImages));
  await page.locator("#sds-crumbs button", { hasText: "호시노" }).click(); await page.waitForTimeout(300);
  await page.click("#sds-put-covers"); await page.waitForTimeout(250);
  await page.locator(".rb-modal .rb-seg button", { hasText: "그림 바꾸기" }).click();
  await page.click("#sds-put-ok"); await page.waitForTimeout(400);
  w = await page.evaluate(() => window.__charWrites?.at(-1));
  const names = (w?.c?.emotionImages ?? []).map((x) => x[0]);
  ok("씬 대표 넣기: angry는 바꾸고 smile 더함(이름 = 씬 이름)", names.filter((n) => n === "angry").length === 1 && names.includes("smile"), JSON.stringify(names));

  // 모드
  await page.locator(".sds-modes button[data-mode='gallery']").click(); await page.waitForTimeout(300);
  ok("갤러리 모드: 씬별 그림 7장", (await page.locator("#sds-body .sds-img").count()) === 7);
  await page.locator(".sds-modes button[data-mode='search']").click(); await page.waitForTimeout(200);
  await page.fill("#sds-q", "smug"); await page.waitForTimeout(200);
  ok("검색 모드: smug 1개", (await page.locator("#sds-body .sds-scene").count()) === 1);
  await page.locator(".sds-modes button[data-mode='bulk']").click(); await page.waitForTimeout(300);
  await page.locator("#sds-bulk tbody tr").nth(1).locator("input[type=checkbox]").check();
  await page.locator("#sds-bulk tbody tr").nth(2).locator("input[type=checkbox]").check();
  await page.fill("#sds-bulk-text", "solo"); await page.click("#sds-bulk-front"); await page.waitForTimeout(250);
  ok("동시편집: 20줄, 고른 씬 앞에 solo", (await page.locator("#sds-bulk tbody tr").count()) === 20 && (await page.locator("#sds-bulk tbody tr").nth(1).locator("textarea").inputValue()).startsWith("solo, "));
  await shot(page, "sd-5-bulk");
  await page.locator(".sds-modes button[data-mode='compare']").click(); await page.waitForTimeout(300);
  await page.locator("#sds-body .sds-card").nth(0).click(); await page.waitForTimeout(150); await page.locator("#sds-body .sds-card").nth(1).click(); await page.waitForTimeout(400);
  ok("비교 모드: 2장 나란히", (await page.locator("#sds-cmp figure").count()) === 2);
  await page.locator(".sds-modes button[data-mode='scene']").click(); await page.waitForTimeout(200);

  // 폴더(맨 위)
  await page.locator("#sds-crumbs button", { hasText: "전체" }).click(); await page.waitForTimeout(300);
  await page.click("#sds-addfolder"); await page.waitForTimeout(200);
  await page.fill("#sds-fname", "아비도스"); await page.locator(".rb-modal .rb-seg button", { hasText: "소속" }).click(); await page.click("#sds-fok"); await page.waitForTimeout(250);
  await page.locator("#sds-body .sds-char .chk").first().click(); await page.waitForTimeout(100);
  await page.locator("#sds-tools button[aria-label='고른 캐릭터를 폴더에 넣기·빼기']").click(); await page.locator(".rb-menu button", { hasText: "아비도스" }).click(); await page.waitForTimeout(300);
  ok("폴더 줄에 캐릭터 카드, 종류 표시", (await page.locator(".sds-frow .sds-char").count()) === 1 && /소속/.test(await txt(page, ".sds-frow")));
  const shift = await page.evaluate(() => ({ win: [window.__app.ctx.win.scrollLeft, window.__app.ctx.win.scrollTop], left: Math.round(document.querySelector(".sds").getBoundingClientRect().left) }));
  ok("창이 옆으로 밀리지 않음", shift.win[0] === 0 && shift.win[1] === 0 && shift.left === 0, JSON.stringify(shift));
  await shot(page, "sd-6-folders");

  // 샘플링(V5)·조각·문제 확인
  await page.click("#sds-sampling"); await page.waitForTimeout(250);
  await page.selectOption("#sds-model", "5-full"); await page.waitForTimeout(150);
  ok("V5: 샘플러에 DDIM 없음", !(await page.locator("#sds-sampler option[value='ddim_v3']").count()));
  await page.locator(".rb-modal .rb-dialog button", { hasText: "닫기" }).click(); await page.waitForTimeout(200);
  ok("왼쪽에 V5 Full·바이브 못 씀 표시", /V5 Full/.test(await txt(page, "#sds-sampling")) && /V5는 못 써요/.test(await txt(page, "#sds-vibe")));
  await page.click("#sds-pieces"); await page.waitForTimeout(250);
  await page.click("#sds-lib-add"); await page.waitForTimeout(200); await promptOk(page, "옷");
  await page.click("#sds-piece-add"); await page.waitForTimeout(150);
  await page.locator(".rb-modal textarea").first().fill("school uniform"); await page.waitForTimeout(80);
  await page.locator(".rb-modal .rb-dialog button", { hasText: "닫기" }).last().click(); await page.waitForTimeout(200);
  await fillArea(page, "sds-back", "detailed, <옷.조각>");
  await page.click("#sds-check"); await page.waitForTimeout(300);
  ok("문제 확인: 조각이 맞으면 문제 없음", /문제가 없어요/.test(await txt(page, ".rb-modal .rb-dialog")), await txt(page, ".rb-modal .rb-dialog"));
  await page.locator(".rb-modal .rb-dialog button", { hasText: "닫기" }).click(); await page.waitForTimeout(150);
  await page.locator("#sds-body .sds-char").first().click(); await page.waitForTimeout(300);
  await sceneCard(page, "smile").hover(); await sceneCard(page, "smile").locator(".quick button", { hasText: "+1" }).click();
  await page.click("#sds-run"); await page.waitForTimeout(700);
  const v5 = (await reqs(page, "/ai/generate-image")).at(-1);
  ok("V5로 생성: params_version 4·조각 펼침", v5?.parameters?.params_version === 4 && v5.model === "nai-diffusion-5-full" && /detailed, school uniform/.test(v5.input), v5?.input);

  // 닫기
  for (let k = 0; k < 5 && (await page.locator("#rb-sd-studio").count()); k++) { await page.click("#sds-close"); await page.waitForTimeout(250); }
  const back = await page.evaluate(() => { const w = window.__app.ctx.win.getBoundingClientRect(); return [w.width, w.height, innerWidth, innerHeight]; });
  ok("닫으면 창 크기 되돌림", back[0] < back[2] - 10 || back[1] < back[3] - 10, JSON.stringify(back));
  const saved = await page.evaluate(async () => JSON.parse(await window.__api.pluginStorage.getItem("dusk.sdstudio.p.c2")));
  ok("봇별 저장(v2): 캐릭터·씬 20·폴더·조각·V5", saved?.v === 2 && saved.chars[0].scenes.length === 20 && saved.folders.length === 1 && saved.pieces[0].name === "옷" && saved.settings.sampling.model === "5-full");
  await page.locator(".rb-full .rb-full-head button[aria-label='닫기']").first().click().catch(() => {}); await page.waitForTimeout(300);
  const d = page.locator(".rb-modal .rb-dialog button", { hasText: /닫기|버리|나가기/ }); if (await d.count()) await d.first().click();

  // 모듈 편집
  await openStudio(page, "m:m1");
  ok("모듈 편집에도 '에셋 제작' → 전체 화면", (await page.locator("#rb-sd-studio").count()) === 1 && /캐릭터 갤러리/.test(await txt(page, "#sds-topbar")));
  ok("오류 없음(PC)", !errs.length, errs.join(";"));
  await page.close(); }

{ const { page, errs } = await boot(390, 844);
  await pick(page, "");
  await page.locator(".rb-row", { hasText: "호시노" }).first().click(); await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector("#rb-dev-edit")?.scrollIntoView()); await page.click("#rb-dev-edit"); await page.waitForTimeout(700);
  await page.click("#rb-sd-make"); await page.waitForTimeout(700);
  await page.click("#sds-addchar"); await page.waitForTimeout(200); await promptOk(page, "호시노");
  await page.click("#sds-emoset"); await page.waitForTimeout(300);
  ok("모바일: 프롬프트 에디터는 접고 시작", !(await page.locator(".sds-left").isVisible()));
  await page.locator(".sds-rail .tab").click(); await page.waitForTimeout(200);
  const fit = await page.evaluate(() => [".sds", ".sds-left", ".sds-main", "#sds-body"].every((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && r.left >= -1 && r.right <= innerWidth + 1; }));
  ok("모바일: 레일로 열면 전체 화면·프롬프트 에디터·갤러리가 폭 안", fit && await page.locator(".sds-left").isVisible());
  await page.locator(".sds-rail .tab").click(); await page.waitForTimeout(200);
  ok("모바일: 씬 카드 20", (await page.locator("#sds-body .sds-scene").count()) === 20);
  await shot(page, "sd-7-mobile");
  ok("오류 없음(모바일)", !errs.length, errs.join(";"));
  await page.close(); }
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
