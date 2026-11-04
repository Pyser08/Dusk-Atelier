// 용량 측정(도구 → 용량 측정): 요약·분류·필터·펼치기·읽기 전용·가로 넘침·오류. node tests/e2e/run-sizemeter.mjs
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const errs = [];
for (const [tag, vp] of [["PC", { width: 1280, height: 800 }], ["모바일", { width: 390, height: 780 }]]) {
  const page = await (await browser.newContext({ viewport: vp, ...tag === "모바일" ? { hasTouch: true, isMobile: true } : {} })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content=\"width=device-width,initial-scale=1\"><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }), "dusk.demo": "가".repeat(2000) }, { mods: true }));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__app.ctx.go("tools"));
  await page.waitForTimeout(300);
  ok(`[${tag}] 도구 목록에 용량 측정 행`, (await page.locator("#rb-tool-sizemeter").count()) === 1);
  ok(`[${tag}] 스페셜 땡스에 RisuMeter`, (await page.locator('.rb-sthanks-item[data-credit="meter"]').count()) === 1);
  await page.locator("#rb-tool-sizemeter").click();
  await page.waitForSelector(".rb-sz-sum", { timeout: 8000 });
  ok(`[${tag}] 총량 숫자와 4칸 막대`, /(B|KB|MB)$/.test((await page.locator(".rb-sz-total b").textContent()).trim()) && (await page.locator(".rb-sz-bar i").count()) === 4 && (await page.locator(".rb-sz-leg").count()) === 4);
  const rows = () => page.locator(".rb-sz-item").count();
  const n0 = await rows();
  ok(`[${tag}] 전체 목록(봇 2 + 모듈 3 + 플러그인 3 + 저장소)`, n0 >= 8, String(n0));
  ok(`[${tag}] 용량 큰 순서: 첫 줄이 Dusk Atelier 플러그인`, /Dusk Atelier/.test(await page.locator(".rb-sz-item .rb-sz-name").first().textContent()));
  ok(`[${tag}] 낭비 안내(꺼진 플러그인·미연결 모듈)`, /꺼져 있거나/.test(await page.locator(".rb-sz-insights").textContent()));
  // 비활성만 보기 버튼
  await page.locator(".rb-sz-insights button", { hasText: "비활성만 보기" }).click();
  await page.waitForTimeout(150);
  const names = await page.locator(".rb-sz-item .rb-sz-name").allTextContents();
  ok(`[${tag}] 비활성 필터: TTS 도우미·전투 규칙만`, names.includes("TTS 도우미") && names.includes("전투 규칙") && !names.includes("RisuPot"), names.join("|"));
  // 필터를 풀고 분류 탭
  await page.locator('.rb-sz-tools [aria-label="필터"] button[data-v="all"]').click();
  await page.waitForTimeout(150);
  await page.locator(".rb-sz-leg", { hasText: "모듈" }).click();
  await page.waitForTimeout(150);
  ok(`[${tag}] 범례 누르면 모듈 분류`, (await rows()) === 3 && (await page.locator(".rb-sz-leg[aria-pressed=true]").textContent()).includes("모듈"));
  // 펼치기: 모듈 세부와 연결 캐릭터
  await page.locator(".rb-sz-item", { hasText: "학원 세계관" }).locator(".rb-sz-head2").click();
  await page.waitForTimeout(150);
  const det = page.locator(".rb-sz-item", { hasText: "학원 세계관" }).locator(".rb-sz-detail");
  const dt = await det.textContent();
  ok(`[${tag}] 펼치면 연결 캐릭터·로어북 분해`, /글로벌 활성/.test(dt) && /시로코/.test(dt) && /로어북 · 12개/.test(dt), dt);
  // 검색
  await page.locator(".rb-sz-tools input").fill("연애");
  await page.waitForTimeout(400);
  ok(`[${tag}] 검색: 연애 시스템만`, (await rows()) === 1);
  await page.locator(".rb-sz-tools input").fill("");
  await page.waitForTimeout(400);
  // 저장소 분류
  await page.locator(".rb-sz-leg", { hasText: "저장소" }).click();
  await page.waitForTimeout(150);
  const sn = await page.locator(".rb-sz-item .rb-sz-name").allTextContents();
  ok(`[${tag}] 저장소 분류에 dusk.demo 키`, sn.includes("dusk.demo"), sn.join("|"));
  // 가로 넘침
  const over = await page.evaluate(() => { const m = document.querySelector(".rb-sz"); return m ? m.scrollWidth - m.clientWidth : -1; });
  ok(`[${tag}] 가로로 넘치지 않음`, over <= 1, String(over));
  // 읽기 전용
  ok(`[${tag}] 아무것도 쓰지 않음`, !(await page.evaluate(() => (window.__charWrites ?? []).length)));
  // 다시 측정, 되돌아갔다 와도 결과 유지
  await page.locator(".rb-sz-head button", { hasText: "다시 측정" }).click();
  await page.waitForSelector(".rb-sz-sum", { timeout: 8000 });
  await page.evaluate(() => window.__app.ctx.go("tools"));
  await page.waitForTimeout(200);
  await page.locator("#rb-tool-sizemeter").click();
  await page.waitForTimeout(200);
  ok(`[${tag}] 다녀와도 결과가 바로 보임(분류·검색 상태 유지)`, (await page.locator(".rb-sz-sum").count()) === 1 && (await page.locator(".rb-sz-run").count()) === 0);
  await page.screenshot({ path: `/tmp/claude-0/sizemeter-${tag}.png` }).catch(() => {});
  await page.close();
}
ok("오류 없음", !errs.length, errs.join(";"));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
