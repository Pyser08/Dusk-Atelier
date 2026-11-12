// 에셋 제작 애드온(SDStudio 모양 전체 화면): 봇 편집 '적용' 아래 '에셋 제작' → 창이 화면 가득 → 캐릭터 → 감정 세트 → 예약·생성(조합·상위 | 끼움)
// → 씬 조합 편집·지금 1장 → 월드컵 → 크게 보기(즐겨찾기·변형·업스케일·디렉터 도구) → 봇 감정 이미지로 넣기·씬 대표 넣기
// → 갤러리·검색·동시편집·비교 모드 → 폴더 → 샘플링(V5)·조각·문제 확인 → 닫으면 창 크기 되돌림 → 모듈 편집에도 버튼 → 좁은 폭(390).
import { tar } from "../tar-helper.mjs";
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/sdstudio.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.1.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const shotDir = process.env.SHOTS;
const shot = async (page, name) => { if (shotDir) await page.screenshot({ path: `${shotDir}/${name}.png` }); };

async function boot(width, height, { mac = false } = {}) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();

  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>");
  if (mac) await page.evaluate(() => { Object.defineProperty(Navigator.prototype, "platform", { get: () => "MacIntel" }); Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => ({ platform: "macOS" }) }); });   // 맥처럼
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
      if (window.__fail) return { status: window.__fail, body: new TextEncoder().encode('{"message":"busy"}') };
      if (o.headers.Authorization === "Bearer bad") return { status: 401, body: new TextEncoder().encode('{"message":"Unauthorized"}') };
      if (path === "/ai/encode-vibe") return { status: 200, body: new Uint8Array([1, 2, 3, 4]) };
      const n = window.__req.length;
      if (path === "/ai/upscale") return { status: 200, body: stream(zipped(await png(n, 332, 484))) };
      return { status: 200, body: stream(zipped(await png(n))) };
    };
    const getC = api.getCharacterFromIndex, setC = api.setCharacterToIndex, kept = {};   // 가짜 리스가 쓴 봇을 기억하게
    api.getCharacterFromIndex = async (i) => (kept[i] ? structuredClone(kept[i]) : getC(i));
    api.setCharacterToIndex = async (i, c) => { kept[i] = structuredClone(c); return setC(i, c); };
    api.saveAsset = async (d) => { const p = `assets/${++window.__saved}.png`; window.__assetBytes[p] = d; return p; };
    api.readImage = async (p) => window.__assetBytes[p] ?? null;
    if (typeof api.getLocalPluginStorage !== "function") { const local = {}; api.getLocalPluginStorage = async () => ({ getItem: async (k) => local[k] ?? null, setItem: async (k, v) => { local[k] = v; } }); }
    { const ls = await api.getLocalPluginStorage(); if (!(await ls.getItem("dusk.sdstudio.prefs"))) await ls.setItem("dusk.sdstudio.prefs", JSON.stringify({ tutorialDone: true })); }   // 첫 실행 튜토리얼은 따로 시험
    window.__h = await window.__sd.activate(api, { ext: window.__app.ctx.ext, app: window.__app.ctx, toast: () => {} });
  });
  return { page, errs };
}
const pick = async (page, sel) => { await page.evaluate((s) => { window.__app.ctx.state.devSel = s; window.__app.ctx.go("dev"); }, sel); await page.waitForTimeout(600); };
const openStudio = async (page, sel) => { await pick(page, sel); await page.click("#rb-dev-edit"); await page.waitForTimeout(700); await page.click("#rb-sd-make"); await page.waitForTimeout(700); };
const txt = (page, sel) => page.locator(sel).first().innerText();
const promptOk = async (page, value) => { const top = page.locator(".rb-modal").last(); await top.locator("input").first().fill(value); await top.locator(".rb-dialog button.primary").last().click(); await page.waitForTimeout(300); };
const fillArea = async (page, id, v) => { await page.locator(`#${id}`).fill(v); await page.waitForTimeout(50); };
const reqs = (page, path) => page.evaluate((p) => window.__req.filter((x) => x.path === p).map((x) => x.body), path);
const openCard = async (loc) => { await loc.dblclick(); };   // 한 번 = 테두리, 더블클릭 = 열기
const dnd = (page, src, dst, { alt = false, fx = 0.5, fy = 0.5 } = {}) => page.evaluate(({ src, dst, alt, fx, fy }) => {   // HTML5 끌어놓기 이벤트를 차례로 보냄
  const a = document.querySelector(src), b = document.querySelector(dst);
  if (!a || !b) throw new Error(`없음: ${!a ? src : dst}`);
  const dt = new DataTransfer(), r = b.getBoundingClientRect(), o = { bubbles: true, cancelable: true, dataTransfer: dt, altKey: alt, clientX: r.left + r.width * fx, clientY: r.top + r.height * fy };
  a.dispatchEvent(new DragEvent("dragstart", o)); b.dispatchEvent(new DragEvent("dragover", o)); b.dispatchEvent(new DragEvent("drop", o)); a.dispatchEvent(new DragEvent("dragend", o));
}, { src, dst, alt, fx, fy });
const sdProj = (page) => page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj);
const charId = (pr, name) => pr.chars.find((c) => c.name === name)?.id;
const sceneCard = (page, name) => page.locator("#sds-body .sds-scene", { has: page.locator(".cap .n", { hasText: new RegExp(`^${name}$`) }) }).first();

{ const { page, errs } = await boot(1600, 1000);
  await pick(page, "c:c2"); await page.click("#rb-dev-edit"); await page.waitForTimeout(700);
  const subs = await page.evaluate(() => [...document.querySelectorAll("#rb-edit-sub > *")].map((x) => x.id));
  ok("봇 편집: 적용 아래 '에셋' 다음 '에셋 제작'", JSON.stringify(subs) === JSON.stringify(["rb-edit-assets", "rb-sd-make"]), JSON.stringify(subs));
  await page.click("#rb-sd-make"); await page.waitForTimeout(700);
  ok("넣는 자리 기본값 = 추가 에셋", (await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.prefs.putSlot)) === "additionalAssets");
  await page.evaluate(() => { document.querySelector("#rb-sd-studio").__sds.prefs.putSlot = "emotionImages"; });   // 아래 시험은 감정 이미지 기준
  const full = await page.evaluate(() => { const w = window.__app.ctx.win.getBoundingClientRect(), s = document.querySelector("#rb-sd-studio")?.getBoundingClientRect(); return { w: [w.width, w.height], s: s && [s.width, s.height], vw: [innerWidth, innerHeight] }; });
  ok("에셋 제작: 플러그인 창이 화면 가득", full.s && Math.abs(full.w[0] - full.vw[0]) < 3 && Math.abs(full.w[1] - full.vw[1]) < 3 && Math.abs(full.s[0] - full.w[0]) < 3, JSON.stringify(full));
  ok("처음: 캐릭터 갤러리 + 빈 안내 + 프롬프트 에디터", /캐릭터 갤러리/.test(await txt(page, "#sds-topbar")) && /캐릭터를 만들어요/.test(await txt(page, "#sds-body")) && await page.locator(".sds-left").isVisible());
  const groups = await page.evaluate(() => [...document.querySelectorAll("#sds-tools .sds-group > small")].map((x) => x.textContent));
  ok("도구 무리: 되돌리기·예약·캐릭터 도구·템플릿·대표·이미지·관리·도움말·설정·검색·보기", JSON.stringify(groups) === JSON.stringify(["되돌리기", "예약", "캐릭터 도구", "템플릿", "대표", "이미지·관리", "도움말", "설정", "검색", "보기"]), JSON.stringify(groups));
  const leftGroups = await page.evaluate(() => [...document.querySelectorAll(".sds-left .sds-group > small")].map((x) => x.textContent));
  ok("프로젝트 무리 없앰(도구·프리셋), 레일은 ‘프롬프트’", JSON.stringify(leftGroups) === JSON.stringify(["도구", "프리셋"]) && (await txt(page, ".sds-rail .tab")) === "프롬프트", JSON.stringify(leftGroups));

  await page.click("#sds-addchar"); await page.waitForTimeout(250);
  ok("새 캐릭터: 봇 이름으로 채워 둠", (await page.locator(".rb-modal").last().locator("input").first().inputValue()) === "호시노");
  await promptOk(page, "호시노");
  ok("만들어도 바로 열리지 않고 카드에 테두리", (await page.locator("#sds-body .sds-char.cur").count()) === 1 && !/씬 갤러리/.test(await txt(page, "#sds-topbar")));
  await page.locator("#sds-body .sds-char.cur").dblclick(); await page.waitForTimeout(300);
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
  for (const n of ["angry", "smile"]) { await sceneCard(page, n).hover(); await sceneCard(page, n).locator(".rsvbtn").click(); await page.waitForTimeout(120); }
  ok("카드 +1: 예약 배지와 알약", (await sceneCard(page, "angry").locator(".rsvbtn").innerText()).trim() === "+1" && /예약된 씬 2\/20/.test(await txt(page, "#sds-reserved")));
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
  // 다시 시도 중(서버 오류)에도 멈추기가 바로 듣고, 진행 줄에 오류가 보임
  await page.evaluate(() => { window.__fail = 500; window.__reqMark = window.__req.length; });
  await page.locator("#sds-body .sds-scene").first().locator(".rsvbtn").click(); await page.waitForTimeout(100);
  await page.click("#sds-run"); await page.waitForTimeout(600);
  ok("다시 시도 중 오류 문구가 위에 따로 보임", /다시 시도 1번째 — NovelAI 오류 500/.test(await txt(page, "#sds-qerr")) && await page.locator("#sds-qerr").isVisible(), await txt(page, "#sds-qerr"));
  await page.dispatchEvent("#sds-run", "pointerdown", { button: 0 }); await page.waitForTimeout(400);
  ok("다시 시도 기다리는 중에도 멈추기 바로", !/멈추/.test(await txt(page, "#sds-run")) && /생성/.test(await txt(page, "#sds-run")), await txt(page, "#sds-run"));
  await page.evaluate(() => { window.__fail = 400; });
  await page.click("#sds-run"); await page.waitForTimeout(500);
  ok("400 오류는 다시 시도 없이 멈춤", /생성/.test(await txt(page, "#sds-run")));
  await page.evaluate(() => { window.__fail = 0; });
  const topWas = await page.locator("#sds-top").inputValue().catch(() => null);
  await page.evaluate(() => { const S = document.querySelector("#rb-sd-studio").__sds; S.set(S.P.setSettings(S.proj, { top: S.proj.settings.top + ", <없는모음.x>" })); });
  const n0 = await page.evaluate(() => window.__req.length);
  await page.click("#sds-run"); await page.waitForTimeout(500);
  ok("없는 조각 모음은 요청 없이 바로 멈춤", (await page.evaluate(() => window.__req.length)) === n0 && /생성/.test(await txt(page, "#sds-run")) && !(await page.locator("#sds-qerr").isVisible()));
  await page.evaluate(() => { const S = document.querySelector("#rb-sd-studio").__sds; S.set(S.P.setSettings(S.proj, { top: S.proj.settings.top.replace(", <없는모음.x>", "") })); });
  void topWas;
  await page.evaluate(() => { window.__req.length = window.__reqMark; });
  await page.click("#sds-rsv-clear"); await page.waitForTimeout(150);

  // 씬 열기 → 조합
  await openCard(sceneCard(page, "angry")); await page.waitForTimeout(400);
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
  await page.locator("#sds-body .sds-img").first().dblclick(); await page.waitForTimeout(500);
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

  // 봇에 바로 넣기(대화상자 없음, WebP로 바꿔 새 에셋) → 알림 되돌리기
  await page.locator("#sds-body .sds-img .chk").first().click(); await page.waitForTimeout(100);
  const saved0 = await page.evaluate(() => window.__saved);
  await page.click("#sds-put-sel"); await page.waitForTimeout(900);
  ok("바로 넣기: 대화상자 없음", (await page.locator(".rb-modal").count()) === 0);
  let w = await page.evaluate(() => window.__charWrites?.at(-1));
  const last = w?.c?.emotionImages?.at(-1);
  const conv = await page.evaluate((p) => { const b = window.__assetBytes[p]; return b ? String.fromCharCode(...b.slice(8, 12)) : ""; }, last?.[1]);
  ok("감정 이미지에 [angry, 새 경로], WebP로 바꿔 저장", w?.i === 1 && last?.[0] === "angry" && (await page.evaluate(() => window.__saved)) === saved0 + 1 && conv === "WEBP", JSON.stringify([last, conv]));
  ok("알림에 용량(→)과 되돌리기", /감정 이미지에 1장 넣었어요 · .+ → .+/.test(await txt(page, ".rb-toasts")) && (await page.locator(".rb-toasts button.act").count()) >= 1);
  await page.locator(".rb-toasts button.act", { hasText: "되돌리기" }).last().click(); await page.waitForTimeout(400);
  w = await page.evaluate(() => window.__charWrites?.at(-1));
  ok("되돌리기 → 감정 이미지 원래대로", !(w?.c?.emotionImages ?? []).some((x) => x[0] === "angry"), JSON.stringify(w?.c?.emotionImages));
  await page.locator("#sds-body .sds-img").first().hover(); await page.locator("#sds-body .sds-img .sds-qput").first().click(); await page.waitForTimeout(800);
  w = await page.evaluate(() => window.__charWrites?.at(-1));
  ok("그림 카드 ‘넣기’로도 바로", (w?.c?.emotionImages ?? []).some((x) => x[0] === "angry"));
  await page.locator("#sds-body .sds-img .chk").nth(1).click(); await page.waitForTimeout(100);
  await page.click("#sds-put-sel-opt"); await page.waitForTimeout(250);
  ok("넣는 방법 고르기: 이름 비우면 씬 이름", (await page.locator("#sds-put-name").inputValue()) === "" && /씬 이름/.test(await page.locator("#sds-put-name").getAttribute("placeholder")));
  await page.click("#sds-put-ok"); await page.waitForTimeout(400);
  w = await page.evaluate(() => window.__charWrites?.at(-1));
  ok("고른 방법으로 넣으면 같은 이름엔 번호(angry_2)", (w?.c?.emotionImages ?? []).some((x) => x[0] === "angry_2"), JSON.stringify((w?.c?.emotionImages ?? []).map((x) => x[0])));
  ok("보낸 그림은 고르기가 풀림", (await page.locator("#sds-body .sds-img[aria-selected='true']").count()) === 0);
  // 카드마다 고르기: angry에서 1장, smile에서 1장 → 씬 화면 밖에서도 남고, 고른 것만 보냄
  await page.locator("#sds-body .sds-img .chk").nth(2).click(); await page.waitForTimeout(100);
  await page.locator("#sds-crumbs button", { hasText: "호시노" }).click(); await page.waitForTimeout(300);
  await openCard(sceneCard(page, "smile")); await page.waitForTimeout(300);
  await page.locator("#sds-body .sds-img .chk").first().click(); await page.waitForTimeout(100);
  await page.locator("#sds-crumbs button", { hasText: "호시노" }).click(); await page.waitForTimeout(300);
  ok("씬 카드에 고른 수 ✓1, 다른 씬은 없음", (await sceneCard(page, "angry").locator(".pk").innerText()) === "✓1" && (await sceneCard(page, "smile").locator(".pk").innerText()) === "✓1" && (await sceneCard(page, "sad").locator(".pk").count()) === 0);
  ok("캐릭터 화면 ‘고른 그림 2장 바로 넣기’", /고른 그림 2장/.test(await page.locator("#sds-put-picked").getAttribute("title")) && !(await page.locator("#sds-put-picked").isDisabled()));
  let wb = await page.evaluate(() => window.__charWrites?.at(-1)?.c?.emotionImages ?? []);
  const nPrev = wb.length;
  await page.locator("#rb-sd-studio").focus(); await page.keyboard.press("Control+b"); await page.waitForTimeout(1200);
  w = await page.evaluate(() => window.__charWrites?.at(-1));
  const added = (w?.c?.emotionImages ?? []).slice(nPrev).map((x) => x[0]);
  ok("Ctrl+B: 고른 2장만 씬 이름으로, 씬 순서대로(smile·angry_3)", JSON.stringify(added) === JSON.stringify(["smile", "angry_3"]), JSON.stringify(added));
  ok("보낸 뒤 ✓표시 사라짐·버튼 꺼짐", (await page.locator("#sds-body .sds-scene .pk").count()) === 0 && await page.locator("#sds-put-picked").isDisabled());
  await page.click("#sds-put-picked").catch(() => {});
  ok("고른 게 없으면 아무것도 안 보냄", (await page.evaluate(() => window.__charWrites?.at(-1)?.c?.emotionImages?.length)) === nPrev + 2);

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

  // 템플릿: 저장 → 새 캐릭터(처음 상태)는 바로 채움 → SDStudio 파일 가져오기(맨 위 = 모든 캐릭터, 합치기/바꾸기) → 되돌리기
  await page.click("#sds-tpl-save"); await page.waitForTimeout(200); await promptOk(page, "감정 20");
  await page.locator("#sds-crumbs button", { hasText: "전체" }).click(); await page.waitForTimeout(300);
  await page.click("#sds-addchar"); await page.waitForTimeout(200); await promptOk(page, "시로코"); await page.waitForTimeout(150); await page.locator("#sds-body .sds-char.cur").dblclick();
  await page.locator("#sds-crumbs button", { hasText: "전체" }).click(); await page.waitForTimeout(300);
  await page.click("#sds-tpl"); await page.locator(".rb-menu button", { hasText: "감정 20 적용" }).click(); await page.waitForTimeout(300);
  ok("맨 위 적용: 씬 있는 캐릭터가 있으면 합치기/바꾸기 묻기", (await page.locator("#sds-tpl-ok").count()) === 1 && /1명/.test(await txt(page, ".rb-modal .rb-dialog")));
  await page.click("#sds-tpl-ok"); await page.waitForTimeout(400);
  let sv = await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.chars.map((c) => [c.name, c.scenes.length]));
  ok("합치기: 처음 상태 시로코는 20개로 채움, 호시노는 그대로 20", JSON.stringify(sv) === JSON.stringify([["호시노", 20], ["시로코", 20]]), JSON.stringify(sv));
  const sdTpl = JSON.stringify({ version: 1, type: "sdstudio-scene-template", name: "SD 표정", session: { scenes: { "blushing shyly": { type: "scene", name: "blushing shyly", resolution: "portrait", slots: [[{ prompt: "blush, shy", id: "a" }]] }, "angry": { type: "scene", name: "angry", resolution: "landscape", slots: [[{ prompt: "furious", id: "b" }]] } }, library: { 표정: { version: 1, name: "표정", pieces: [{ name: "웃음", prompt: "smile" }] } } } });
  page.once("filechooser", (fc) => fc.setFiles({ name: "sd.json", mimeType: "application/json", buffer: Buffer.from(sdTpl) }));
  await page.click("#sds-tpl-import"); await page.waitForTimeout(500);
  await page.locator(".rb-modal .rb-seg button", { hasText: "바꾸기" }).click(); await page.click("#sds-tpl-ok"); await page.waitForTimeout(400);
  sv = await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.chars.map((c) => c.scenes.map((x) => x.name).join(",")));
  const hosAngry = await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.chars[0].scenes.find((x) => x.name === "angry"));
  ok("SDStudio 템플릿 가져오기 → 모든 캐릭터에 바꾸기(angry는 그림 지키고 프롬프트·크기 바뀜)", sv.every((x) => x === "blushing shyly,angry") && hosAngry.images.length === 6 && hosAngry.slots[0][0].prompt === "furious" && hosAngry.size === "landscape", JSON.stringify(sv));
  ok("가져온 조각 모음도 합쳐짐", await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.pieces.some((l) => l.name === "표정")));
  await page.click("#sds-undo"); await page.waitForTimeout(300);
  sv = await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.chars.map((c) => c.scenes.length));
  ok("되돌리기 버튼 → 템플릿 적용 전으로", JSON.stringify(sv) === JSON.stringify([20, 20]), JSON.stringify(sv));
  await page.click("#sds-redo"); await page.waitForTimeout(300);
  ok("다시하기 → 다시 적용", JSON.stringify(await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.chars.map((c) => c.scenes.length))) === JSON.stringify([2, 2]));
  await page.locator("#rb-sd-studio").focus(); await page.keyboard.press("Control+z"); await page.waitForTimeout(300);
  ok("Ctrl+Z 단축키로 되돌리기", JSON.stringify(await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.chars.map((c) => c.scenes.length))) === JSON.stringify([20, 20]));
  const tpls = await page.evaluate(async () => JSON.parse(await window.__api.pluginStorage.getItem("dusk.sdstudio.templates")).map((t) => t.name));
  ok("템플릿 목록에 저장(감정 20·SD 표정)", JSON.stringify(tpls) === JSON.stringify(["감정 20", "SD 표정"]), JSON.stringify(tpls));
  // 단축키 바꾸기
  await page.click("#sds-settings"); await page.waitForTimeout(250); await page.click("#sds-keys"); await page.waitForTimeout(250);
  await page.locator(".rb-modal .rb-chip[data-action='toggleLeft']").click(); await page.keyboard.press("Control+Shift+L"); await page.waitForTimeout(100);
  await page.click("#sds-keys-save"); await page.waitForTimeout(250);
  await page.locator("#rb-sd-studio").focus(); await page.keyboard.press("Control+Shift+L"); await page.waitForTimeout(200);
  ok("단축키 바꾸면 그 키로 동작(프롬프트 에디터 닫힘)", !(await page.locator(".sds-left").isVisible()));
  await page.keyboard.press("Control+Shift+L"); await page.waitForTimeout(200);
  // 부스트: 켜기(경고) + 토큰 2개 → 두 토큰으로 동시에
  await page.click("#sds-settings"); await page.waitForTimeout(250);
  await page.locator("#sds-boost .rb-seg button", { hasText: "켬" }).click(); await page.waitForTimeout(250);
  ok("부스트 켜면 제재 경고", /제재/.test(await page.locator(".rb-modal .rb-dialog").last().innerText()));
  await page.locator(".rb-modal .rb-dialog button", { hasText: "알고 켜기" }).click(); await page.waitForTimeout(250);
  await page.click("#sds-token-add"); await page.waitForTimeout(200); await page.locator(".rb-modal input").last().fill("pst-second"); await page.locator(".rb-modal .rb-dialog button.primary").last().click(); await page.waitForTimeout(300);
  await page.locator(".rb-modal .rb-dialog button", { hasText: "닫기" }).last().click(); await page.waitForTimeout(250);
  await openCard(page.locator("#sds-body .sds-char").first()); await page.waitForTimeout(300);
  for (const n of ["sad", "shy"]) { await sceneCard(page, n).hover(); await sceneCard(page, n).locator(".rsvbtn").click(); await page.waitForTimeout(100); }
  ok("생성 버튼에 부스트 표시", /부스트 생성 2장/.test(await txt(page, "#sds-run")));
  const nBefore = (await reqs(page, "/ai/generate-image")).length;
  await page.evaluate(() => { window.__delay = 500; });
  await page.click("#sds-run"); await page.waitForTimeout(350);
  const auths = await page.evaluate((n) => window.__req.filter((x) => x.path === "/ai/generate-image").slice(n).map((x) => x.auth), nBefore);
  ok("부스트: 두 토큰으로 동시에(둘 다 이미 보냄)", auths.length === 2 && new Set(auths).size === 2, JSON.stringify(auths));
  await page.waitForTimeout(900); await page.evaluate(() => { window.__delay = 120; });
  await page.click("#sds-settings"); await page.waitForTimeout(250); await page.locator("#sds-boost .rb-seg button", { hasText: "끔" }).click(); await page.waitForTimeout(150);
  await page.locator(".rb-modal .rb-dialog button", { hasText: "닫기" }).last().click(); await page.waitForTimeout(200);
  await page.locator("#sds-crumbs button", { hasText: "전체" }).click(); await page.waitForTimeout(300);

  // 폴더(맨 위)
  await page.locator("#sds-crumbs button", { hasText: "전체" }).click(); await page.waitForTimeout(300);
  await page.click("#sds-addfolder"); await page.waitForTimeout(200);
  await page.fill("#sds-fname", "아비도스"); await page.locator(".rb-modal .rb-seg button", { hasText: "소속" }).click(); await page.click("#sds-fok"); await page.waitForTimeout(250);
  await page.locator("#sds-body .sds-char .chk").first().click(); await page.waitForTimeout(100);
  await page.locator("#sds-tools button[aria-label='고른 캐릭터를 폴더에 넣기·빼기']").click(); await page.locator(".rb-menu button", { hasText: "아비도스" }).click(); await page.waitForTimeout(300);
  ok("폴더 줄에 캐릭터 카드, 종류 표시", (await page.locator(".sds-frow .sds-char").count()) === 1 && /소속/.test(await txt(page, ".sds-frow")));
  await openCard(page.locator(".sds-frow .sds-fopen")); await page.waitForTimeout(300);
  await page.click("#sds-tpl"); await page.locator(".rb-menu button", { hasText: "SD 표정 적용" }).click(); await page.waitForTimeout(300);
  await page.locator(".rb-modal .rb-seg button", { hasText: "합치기" }).click(); await page.click("#sds-tpl-ok"); await page.waitForTimeout(400);
  const inFolder = await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.chars.map((c) => c.scenes.length));
  ok("폴더 안에서 적용하면 그 폴더의 캐릭터만(합치기: 없는 씬 1개 더함)", inFolder[0] === 21 && inFolder[1] === 20, JSON.stringify(inFolder));
  await page.locator("#sds-crumbs button", { hasText: "전체" }).click(); await page.waitForTimeout(300);
  const shift = await page.evaluate(() => ({ win: [window.__app.ctx.win.scrollLeft, window.__app.ctx.win.scrollTop], left: Math.round(document.querySelector(".sds").getBoundingClientRect().left) }));
  ok("창이 옆으로 밀리지 않음", shift.win[0] === 0 && shift.win[1] === 0 && shift.left === 0, JSON.stringify(shift));
  // 폴더: 고른 채 새 캐릭터 → 그 폴더 안 · 끌어 옮기기
  await page.locator(".sds-frow .sds-fopen").click(); await page.waitForTimeout(100);
  ok("폴더를 한 번 누르면 테두리만 켜지고 안 열림", (await page.locator(".sds-frow.sds-folder.cur").count()) === 1 && !/아비도스/.test(await txt(page, "#sds-crumbs")));
  await page.click("#sds-addchar"); await page.waitForTimeout(200); await promptOk(page, "유우카"); await page.waitForTimeout(250);
  let pr = await sdProj(page), yid = charId(pr, "유우카");
  ok("폴더를 고른 채 새 캐릭터 → 그 폴더 안에, 열리지 않음", pr.folders[0].members.includes(yid) && !/씬 갤러리/.test(await txt(page, "#sds-topbar")) && (await page.locator(`.sds-frow .sds-char.cur[data-id="${yid}"]`).count()) === 1);
  await dnd(page, `.sds-frow .sds-char[data-id="${yid}"]`, "#sds-crumbs .rb-chip"); await page.waitForTimeout(250);
  pr = await sdProj(page);
  ok("카드를 위 ‘전체’로 끌면 폴더에서 빠짐", !pr.folders[0].members.includes(yid) && (await page.locator(`#sds-body .sds-grid .sds-char[data-id="${yid}"]`).count()) === 1);
  await dnd(page, `#sds-body .sds-grid .sds-char[data-id="${yid}"]`, ".sds-frow.sds-folder"); await page.waitForTimeout(250);
  pr = await sdProj(page);
  ok("카드를 폴더 줄에 끌어 놓으면 들어감", pr.folders[0].members.includes(yid));
  await page.click("#sds-addfolder"); await page.waitForTimeout(200); await page.fill("#sds-fname", "복장"); await page.click("#sds-fok"); await page.waitForTimeout(250);
  pr = await sdProj(page); const f2 = pr.folders.find((f) => f.name === "복장").id;
  await dnd(page, `.sds-frow .sds-char[data-id="${yid}"]`, `.sds-frow.sds-folder[data-id="${f2}"]`, { alt: true }); await page.waitForTimeout(250);
  pr = await sdProj(page);
  ok("Alt+끌어놓기는 복사(두 폴더에 걸침)", pr.folders.filter((f) => f.members.includes(yid)).length === 2);
  await dnd(page, `.sds-frow.sds-folder[data-id="${f2}"] .hd`, `.sds-frow.sds-folder[data-id="${pr.folders[0].id}"]`); await page.waitForTimeout(250);
  pr = await sdProj(page);
  ok("폴더를 다른 폴더 줄 가운데에 끌면 그 안으로", pr.folders.find((f) => f.id === f2).parent === pr.folders[0].id);
  ok("하위 폴더가 상위 폴더 줄 안에 같은 모양의 줄로, 캐릭터도 그 안에", (await page.locator(`.sds-frow .sds-frow.sds-folder[data-id="${f2}"] .sds-char[data-id="${yid}"]`).count()) === 1);
  await page.locator(".sds-frow .sds-fopen").first().click(); await page.waitForTimeout(80); await page.locator(".sds-frow .sds-fopen").first().dblclick(); await page.waitForTimeout(250);
  await dnd(page, `.sds-frow.sds-folder[data-id="${f2}"] .hd`, "#sds-crumbs .rb-chip"); await page.waitForTimeout(250);
  pr = await sdProj(page);
  ok("폴더를 ‘전체’로 끌면 맨 위로", pr.folders.find((f) => f.id === f2).parent == null);
  await page.locator("#sds-crumbs .rb-chip").first().click(); await page.waitForTimeout(250);
  { const S = await page.evaluateHandle(() => document.querySelector("#rb-sd-studio").__sds);
    const pr2 = await sdProj(page), hid = charId(pr2, "호시노") ?? pr2.chars[0].id;
    const sc0 = pr2.chars.find((c) => c.id === hid).scenes.find((x) => x.images.length);
    if (sc0) {
      await page.evaluate(({ hid, sid, path }) => { const S = document.querySelector("#rb-sd-studio").__sds; S.togglePick({ cid: hid, sid, path }, true); S.prefs.nameStyle = "us"; }, { hid, sid: sc0.id, path: sc0.images[0].path });
      await page.waitForTimeout(150);
      ok("검색 옆 ‘봇으로 넣기’ 켜짐(고른 수 반영)", await page.locator("#sds-put-all").isEnabled());
      await page.click("#sds-put-all"); await page.waitForTimeout(900);
      const names = await page.evaluate(() => (window.__charWrites?.at(-1)?.c?.emotionImages ?? []).map((x) => x[0]));
      const fname = pr2.folders.find((f) => f.members.includes(hid))?.name;
      const want = [fname, pr2.chars.find((c) => c.id === hid).name, sc0.name].filter(Boolean).join("_") + ".webp";
      ok("이름 규칙 폴더_캐릭터_씬.확장자", names.includes(want), JSON.stringify([want, names.slice(-3)]));
      await page.evaluate(() => { document.querySelector("#rb-sd-studio").__sds.prefs.nameStyle = "scene"; });
    } else ok("이름 규칙 시험용 그림 있음", false);
    await S.dispose(); }
  // 폴더 프롬프트가 하위 폴더 캐릭터에 이어짐 · 맨 위 갤러리 일괄 · Delete/Ctrl+A
  { const pr3 = await sdProj(page);
        const own = await page.evaluate(() => { const S = document.querySelector("#rb-sd-studio").__sds, P = S.P; let p = S.proj;
      p = P.addFolder(p, { name: "위", prompt: "halo" }); const up = p.folders.at(-1).id; p = P.addFolder(p, { name: "아래", prompt: "school uniform", parent: up }); const dn = p.folders.at(-1).id;
      const c = p.chars[0]; p = P.setMember(p, dn, c.id, true); const r = P.ownPrompt(p, c); return r; });
    ok("상위·하위 폴더 프롬프트가 캐릭터 앞에 차례로", /^halo, school uniform(, |$)/.test(own), String(own));
    await page.locator("#sds-crumbs .rb-chip").first().click(); await page.waitForTimeout(200);
    await page.locator(".sds-modes button", { hasText: "갤러리" }).click(); await page.waitForTimeout(300);
    ok("맨 위 갤러리에 일괄 관리 줄", (await page.locator("#sds-gbulk").count()) === 1);
    await page.locator("#sds-body").click({ position: { x: 5, y: 5 } }); await page.keyboard.press("Control+A"); await page.waitForTimeout(250);
    const pk = await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.chars.flatMap((c) => c.scenes.flatMap((s) => s.images)).every((i) => i.pick));
    ok("갤러리에서 Ctrl+A = 그림 모두 고르기", pk);
    await page.keyboard.press("Control+Shift+A"); await page.waitForTimeout(250);
    ok("Ctrl+Shift+A = 고르기 모두 풀기", !(await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.chars.some((c) => c.scenes.some((s) => s.images.some((i) => i.pick))))));
    await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
  { const fid = await page.evaluate(() => document.querySelector(".sds-toprows > .sds-frow")?.dataset.id);
    await page.locator(`.sds-toprows > .sds-frow[data-id="${fid}"] .sds-fold`).click(); await page.waitForTimeout(200);
    ok("폴더 접기: 카드·하위 줄 숨김", (await page.locator(`.sds-frow[data-id="${fid}"] .strip, .sds-frow[data-id="${fid}"] .sds-subrows`).count()) === 0);
    await page.locator(`.sds-frow[data-id="${fid}"] .sds-fold`).click(); await page.waitForTimeout(200);
    ok("폴더 펼치기", (await page.locator(`.sds-frow[data-id="${fid}"] .sds-fold[aria-expanded=true]`).count()) === 1);
    await page.locator("#sds-body").click({ button: "right", position: { x: 4, y: 4 } }); await page.waitForTimeout(150);
    ok("빈 곳 우클릭 메뉴(새 캐릭터·폴더)", (await page.locator(".rb-menu button", { hasText: "새 캐릭터" }).count()) === 1); await page.keyboard.press("Escape"); }
  // 태그 자동완성(사전은 작은 CSV로 넣음)
  await page.evaluate(async () => { const S = document.querySelector("#rb-sd-studio").__sds; await S.sd.loadTagsFromBytes(new TextEncoder().encode("long hair,0,5000,null\nvery long hair,0,900,null\n머리/길이/긴 머리,0,5000,long hair\nsmile,0,4000,null\n")); });
  await page.locator("#sds-top").click(); await page.keyboard.press("End"); await page.keyboard.type(", long h"); await page.waitForTimeout(250);
  await shot(page, "sd-tags");
  ok("태그 자동완성 목록 뜸", (await page.locator(".sds-ac:not([hidden]) .it").count()) === 2, await txt(page, ".sds-ac"));
  await page.keyboard.press("Enter"); await page.waitForTimeout(150);
  await page.keyboard.type("");   ok("Enter로 넣으면 태그+쉼표", /long hair, $/.test(await page.locator("#sds-top").inputValue()), await page.locator("#sds-top").inputValue());
  await page.keyboard.type("긴 머"); await page.waitForTimeout(250);
  await shot(page, "sd-tags-ko");
  ok("한글로 찾으면 영어 태그로", /long hair/.test(await txt(page, ".sds-ac .w")) && /긴 머리/.test(await txt(page, ".sds-ac .r")));
  await page.keyboard.press("Escape"); await page.waitForTimeout(100);
  ok("Esc는 목록만 닫음(화면은 그대로)", (await page.locator(".sds-ac:not([hidden])").count()) === 0 && (await page.locator("#rb-sd-studio").count()) === 1);
  await page.evaluate(async () => { const S = document.querySelector("#rb-sd-studio").__sds; await S.sd.loadTagsFromBytes(new TextEncoder().encode("wlop,1,9000,null\nwlop_fan,1,10,null\nsmile,0,4000,null\n")); });
  await page.click("#sds-artists"); await page.waitForTimeout(200); await page.fill("#sds-art-q", "wlo"); await page.waitForTimeout(150);
  await page.locator("#sds-art-list .it", { hasText: /^wlop/ }).first().locator("button", { hasText: "넣기" }).click(); await page.waitForTimeout(150);
  ok("작가 태그 넣기 → 상위 프롬프트에 artist:", /artist:wlop/.test(await page.evaluate(() => document.querySelector("#rb-sd-studio").__sds.proj.settings.top)));
  await page.locator(".rb-modal .rb-dialog button", { hasText: "닫기" }).last().click(); await page.waitForTimeout(150);
  { const r = await page.evaluate(async () => { const S = document.querySelector("#rb-sd-studio").__sds, P = S.P; let p = S.proj;
      p = P.addFolder(p, { name: "T" }); const f = p.folders.at(-1).id; p = P.updateFolder(p, f, { tpl: "감정 20" }); p = P.addFolder(p, { name: "T2", parent: f }); return P.folderTemplateFor(p, p.folders.at(-1).id); });
    ok("폴더 기본 템플릿은 하위 폴더로 이어짐", r === "감정 20"); }
  await page.locator("#sds-top").fill("masterpiece, |, white background"); await page.locator("#sds-top").dispatchEvent("input"); await page.waitForTimeout(150);
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
  await openCard(page.locator("#sds-body .sds-char").first()); await page.waitForTimeout(300);
  await sceneCard(page, "smile").hover(); await sceneCard(page, "smile").locator(".rsvbtn").click();
  await page.click("#sds-run"); await page.waitForTimeout(700);
  const v5 = (await reqs(page, "/ai/generate-image")).at(-1);
  ok("V5로 생성: params_version 4·조각 펼침", v5?.parameters?.params_version === 4 && v5.model === "nai-diffusion-5-full" && /detailed, school uniform/.test(v5.input), v5?.input);

  // 닫기
  for (let k = 0; k < 5 && (await page.locator("#rb-sd-studio").count()); k++) { await page.click("#sds-close"); await page.waitForTimeout(250); }
  const back = await page.evaluate(() => { const w = window.__app.ctx.win.getBoundingClientRect(); return [w.width, w.height, innerWidth, innerHeight]; });
  ok("닫으면 창 크기 되돌림", back[0] < back[2] - 10 || back[1] < back[3] - 10, JSON.stringify(back));
  const saved = await page.evaluate(async () => JSON.parse(await window.__api.pluginStorage.getItem("dusk.sdstudio.p.c2")));
  ok("봇별 저장(v2): 캐릭터 3·폴더 2·조각·V5", saved?.v === 2 && saved.chars.length === 3 && saved.folders.length === 2 && saved.pieces.some((l) => l.name === "옷") && saved.settings.sampling.model === "5-full");
  await page.locator(".rb-full .rb-full-head button[aria-label='닫기']").first().click().catch(() => {}); await page.waitForTimeout(300);
  const d = page.locator(".rb-modal .rb-dialog button", { hasText: /닫기|버리|나가기/ }); if (await d.count()) await d.first().click();

  // 모듈 편집
  await openStudio(page, "m:m1");
  ok("모듈 편집에도 '에셋 제작' → 전체 화면", (await page.locator("#rb-sd-studio").count()) === 1 && /캐릭터 갤러리/.test(await txt(page, "#sds-topbar")));
  ok("오류 없음(PC)", !errs.length, errs.join(";"));
  await page.close(); }

{ const { page, errs } = await boot(1280, 860, { mac: true });
  await pick(page, "c:c2"); await page.click("#rb-dev-edit"); await page.waitForTimeout(700);
  await page.click("#rb-sd-make"); await page.waitForTimeout(700);
  await page.click("#sds-addchar"); await page.waitForTimeout(200); await promptOk(page, "호시노"); await page.waitForTimeout(150); await page.locator("#sds-body .sds-char.cur").dblclick();
  await page.click("#sds-emoset"); await page.waitForTimeout(300);
  ok("맥: 도구 설명에 ⌘ 표시(⌘B)", /⌘B/.test(await page.locator("#sds-put-picked").getAttribute("title")));
  await page.locator("#rb-sd-studio").focus(); await page.keyboard.press("Meta+z"); await page.waitForTimeout(300);
  ok("맥: ⌘Z로 되돌리기", (await page.locator("#sds-body .sds-scene").count()) === 1);
  await page.keyboard.press("Meta+Shift+z"); await page.waitForTimeout(300);
  ok("맥: ⌘⇧Z로 다시하기", (await page.locator("#sds-body .sds-scene").count()) === 20);
  await page.keyboard.press("Control+z"); await page.waitForTimeout(300);
  ok("맥: ⌃Z는 되돌리기가 아님(⌘와 따로)", (await page.locator("#sds-body .sds-scene").count()) === 20);
  await page.click("#sds-settings"); await page.waitForTimeout(250); await page.click("#sds-keys"); await page.waitForTimeout(250);
  ok("맥: 단축키 설정에 기호로(⌘Z·⌘⇧Z)", (await page.locator(".rb-modal .rb-chip[data-action='undo']").innerText()) === "⌘Z" && (await page.locator(".rb-modal .rb-chip[data-action='redo']").innerText()) === "⌘⇧Z");
  await page.locator(".rb-modal .rb-chip[data-action='undo']").click(); await page.keyboard.press("Control+u"); await page.waitForTimeout(100);
  ok("맥: ⌃U로 바꾸면 ⌃U로 보임", (await page.locator(".rb-modal .rb-chip[data-action='undo']").innerText()) === "⌃U");
  await page.click("#sds-keys-save"); await page.waitForTimeout(250);
  ok("오류 없음(맥)", !errs.length, errs.join(";"));
  await page.close(); }

{ const { page, errs } = await boot(1400, 900);   // 대표 고르기 → ★ 없는 씬 → 즐겨찾기 내보내기 확인
  await pick(page, "c:c2"); await page.click("#rb-dev-edit"); await page.waitForTimeout(700);
  await page.click("#rb-sd-make"); await page.waitForTimeout(700);
  await page.click("#sds-addchar"); await page.waitForTimeout(200); await promptOk(page, "호시노"); await page.waitForTimeout(150); await page.locator("#sds-body .sds-char.cur").dblclick();
  await page.click("#sds-emoset"); await page.waitForTimeout(300);
  const names = await page.evaluate(async () => {
    const S = document.querySelector("#rb-sd-studio").__sds, c = S.proj.chars[0];
    const png = (k) => new Promise((res) => { const cv = document.createElement("canvas"); cv.width = 60; cv.height = 90; const g = cv.getContext("2d"); g.fillStyle = `hsl(${k * 60},50%,50%)`; g.fillRect(0, 0, 60, 90); cv.toBlob(async (b) => res(new Uint8Array(await b.arrayBuffer())), "image/png"); });
    let p = S.proj, k = 0;
    for (const [si, n] of [[0, 3], [1, 3], [2, 1]]) for (let j = 0; j < n; j++) { const d = await png(++k), path = await window.__api.saveAsset(d); S.remember(path, d); p = S.P.addImage(p, c.id, c.scenes[si].id, { path, seed: k }); }
    S.set(p); S.paint(); return c.scenes.slice(0, 3).map((x) => x.name);
  });
  await page.waitForTimeout(200);
  ok("★ 없음 표시: 그림 있는 씬 3개", (await page.locator("#sds-body .sds-scene .nofav").count()) === 3);
  ok("씬 머리에 ‘★ 없는 씬 3’", (await page.locator("#sds-nofav-pill").innerText()).includes("3"));
  await page.click("#sds-choose"); await page.waitForTimeout(300);
  ok("대표 고르기 열림: 첫 씬·후보 3장", await page.locator("#sds-chooser").isVisible() && (await page.locator("#sds-ch-title").innerText()).endsWith(names[0]) && (await page.locator("#sds-ch-strip .sds-ch-th").count()) === 3);
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("f"); await page.waitForTimeout(150);
  let pr = await sdProj(page);
  ok("→ 다음 후보, F = 즐겨찾기", pr.chars[0].scenes[0].images.filter((i) => i.fav).length === 1 && (await page.locator("#sds-ch-strip .sds-ch-th.fav").count()) === 1);
  await page.keyboard.press("Enter"); await page.waitForTimeout(200);
  ok("Enter = 정하고 다음 씬", (await page.locator("#sds-ch-title").innerText()).endsWith(names[1]));
  await page.keyboard.press("Enter"); await page.waitForTimeout(200);
  pr = await sdProj(page);
  ok("Enter는 즐겨찾기 없으면 지금 그림을 ★", pr.chars[0].scenes[1].images.filter((i) => i.fav).length === 1 && (await page.locator("#sds-ch-title").innerText()).endsWith(names[2]));
  await page.keyboard.press("ArrowUp"); await page.waitForTimeout(150);
  await page.check("#sds-ch-only"); await page.waitForTimeout(150);
  ok("‘즐겨찾기 없는 씬만’: 지금 씬 + 남은 씬", (await page.locator("#sds-ch-title").innerText()).endsWith(names[1]) && (await page.locator("#sds-chooser .ttl small").innerText()).includes("/ 2"));
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  ok("Esc는 대표 고르기만 닫음", !(await page.locator("#sds-chooser").count()) && await page.locator("#rb-sd-studio").isVisible());
  ok("★ 없음 표시가 1개로", (await page.locator("#sds-body .sds-scene .nofav").count()) === 1);
  await page.click("#sds-rsv-nofav"); await page.waitForTimeout(200);
  pr = await sdProj(page);
  ok("★ 없는 씬만 예약(★ 있는 씬은 0)", pr.chars[0].scenes[0].reserve === 0 && pr.chars[0].scenes[1].reserve === 0 && pr.chars[0].scenes[2].reserve > 0 && pr.chars[0].scenes[5].reserve > 0);
  await page.click("#sds-rsv-clear"); await page.waitForTimeout(150);
  await page.click("#sds-put-fav"); await page.waitForTimeout(400);
  const st1 = await page.locator("#sds-exp-list .sds-exp-row").evaluateAll((xs) => xs.map((x) => x.dataset.st));
  ok("내보내기 확인: 즐겨찾기 2장 모두 ‘새로’", JSON.stringify(st1) === '["new","new"]', JSON.stringify(st1));
  await page.click("#sds-exp-ok"); await page.waitForTimeout(800);
  const add = await page.evaluate(() => window.__charWrites?.at(-1)?.c?.additionalAssets?.map((a) => a[0]) ?? []);
  ok("추가 에셋에 씬 이름으로 2장", names.slice(0, 2).every((n) => add.includes(n)), JSON.stringify(add));
  await page.click("#sds-put-fav"); await page.waitForTimeout(400);
  const st2 = await page.locator("#sds-exp-list .sds-exp-row").evaluateAll((xs) => xs.map((x) => [x.dataset.st, x.querySelector("input").checked]));
  ok("다시 열면 ‘이미 넣음’·체크 꺼짐·넣기 막힘", JSON.stringify(st2) === '[["sent",false],["sent",false]]' && await page.locator("#sds-exp-ok").isDisabled(), JSON.stringify(st2));
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  { const sess = { version: 1, name: "시로코", presets: { SDImageGen: [{ name: "default", frontPrompt: "white hair" }] }, scenes: { 웃음: { type: "scene", name: "웃음", resolution: "portrait", slots: [[{ prompt: "smile" }]], imageMap: [], mains: ["1.png"] } }, library: {} };
    const png = await page.evaluate(async () => { const cv = document.createElement("canvas"); cv.width = 20; cv.height = 30; return [...new Uint8Array(await (await new Promise((r) => cv.toBlob(r, "image/png"))).arrayBuffer())]; });
    const bytes = tar([["_folder.json", JSON.stringify({ type: "sdstudio-folder-backup", folder: "아비도스" })], ["시로코/project.json", JSON.stringify(sess)], ["시로코/outs/웃음/1.png", new Uint8Array(png)], ["시로코/outs/웃음/2.png", new Uint8Array(png)]]);
    await page.evaluate((b) => { document.querySelector("#rb-sd-studio").__sds.importBackup(new File([new Uint8Array(b)], "abydos_folder.tar")); }, [...bytes]);
    await page.waitForSelector("#sds-bk-list"); await page.waitForTimeout(150);
    ok("백업 가져오기: 프로젝트 목록·즐겨찾기만 기본", (await page.locator("#sds-bk-list .sds-exp-row").count()) === 1 && (await page.locator(".rb-modal .rb-seg [aria-checked=true]").first().innerText()).includes("즐겨찾기"));
    await page.click("#sds-bk-ok"); await page.waitForTimeout(1200);
    const got = await page.evaluate(() => { const p = document.querySelector("#rb-sd-studio").__sds.proj, c = p.chars.find((x) => x.name === "시로코"); return c && { prompt: c.prompt, scenes: c.scenes.map((s) => [s.name, s.images.length, s.images.filter((i) => i.fav).length]), folder: p.folders.find((f) => f.members.includes(c.id))?.name }; });
    ok("백업 → 캐릭터·씬·즐겨찾기 그림·폴더", JSON.stringify(got) === JSON.stringify({ prompt: "white hair", scenes: [["웃음", 1, 1]], folder: "아비도스" }), JSON.stringify(got)); }
  ok("오류 없음(대표 고르기)", !errs.length, errs.join(";"));
  await page.close(); }

{ const { page, errs } = await boot(390, 844);
  await pick(page, "");
  await page.locator(".rb-row", { hasText: "호시노" }).first().click(); await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector("#rb-dev-edit")?.scrollIntoView()); await page.click("#rb-dev-edit"); await page.waitForTimeout(700);
  await page.click("#rb-sd-make"); await page.waitForTimeout(700);
  await page.click("#sds-addchar"); await page.waitForTimeout(200); await promptOk(page, "호시노"); await page.waitForTimeout(150); await page.locator("#sds-body .sds-char.cur").dblclick();
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
