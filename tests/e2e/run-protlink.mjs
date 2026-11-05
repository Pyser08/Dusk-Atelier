// 관리 → ProtLink+ 화면: 링크 추가(연결 후보 고르기) · 확인 · 받아서 업데이트 · 연결 바꾸기 · 지우기 · 끄기 · 원본 플러그인 안내
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const ar = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json", ".md": "text" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch(), errs = [];
for (const [tag, vp] of [["PC", { width: 1280, height: 800 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: ar.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, { protlink: true }));
  await page.waitForTimeout(500);
  const sw = () => page.locator("#rb-protlink-head [role=switch]");
  const text = (s) => page.locator(s).first().textContent();
  await page.evaluate(() => __app.ctx.go("protlink")); await page.waitForTimeout(500);
  ok(`[${tag}] 기본 켜짐 + 링크 없음 안내`, (await sw().getAttribute("aria-checked")) === "true" && (await page.locator("#rb-pl-empty").count()) === 1 && /링크를 연결해 보세요/.test(await text(".rb-status")));
  // 링크 추가
  await page.locator(".rb-status button", { hasText: "링크 추가" }).click(); await page.waitForTimeout(200);
  await page.locator("#rb-pl-open").click(); await page.waitForTimeout(200);
  ok(`[${tag}] 주소를 비우면 안내`, /붙여 넣어 주세요/.test(await text("#rb-pl-msg")));
  await page.evaluate(() => { __pl.state = "password"; });
  await page.locator("#rb-pl-url").fill("https://drive.proton.me/urls/ABC#xyz"); await page.locator("#rb-pl-open").click(); await page.waitForTimeout(400);
  ok(`[${tag}] 비밀번호가 필요하면 안내`, /비밀번호가 필요해요/.test(await text("#rb-pl-msg")));
  await page.evaluate(() => { __pl.state = "ready"; });
  await page.locator("#rb-pl-pw").fill("1234"); await page.locator("#rb-pl-open").click(); await page.waitForTimeout(500);
  ok(`[${tag}] 파일을 확인하고 종류를 모듈로 짐작`, /이 종류에 맞는 파일 1개: 시로코\.risum/.test(await text("#rb-pl-files")) && (await page.locator(".rb-pl-add .rb-seg button[aria-checked=true]").textContent()) === "모듈", await text("#rb-pl-files") + "|" + await page.locator(".rb-pl-add .rb-seg").innerHTML());
  ok(`[${tag}] 이름이 비슷한 모듈이 맨 위·미리 골라짐`, (await page.locator("#rb-pl-targets .rb-opt").first().textContent()).includes("시로코 모듈") && (await page.locator("#rb-pl-targets .rb-opt[aria-checked=true]").count()) === 1);
  await page.locator(".rb-pl-add .rb-seg button", { hasText: "플러그인" }).click(); await page.waitForTimeout(300);
  ok(`[${tag}] 플러그인으로 바꾸면 이 종류에 파일 없음 안내 + 선택 해제 + 연결 버튼 꺼짐`, /플러그인에 맞는 파일이 아직 없어요/.test(await text("#rb-pl-files")) && await page.locator("#rb-pl-save").isDisabled());
  await page.locator(".rb-pl-add .rb-seg button", { hasText: "모듈" }).click(); await page.waitForTimeout(300);
  await page.locator("#rb-pl-q").fill("다른"); await page.waitForTimeout(150);
  ok(`[${tag}] 검색으로 후보를 좁힘`, (await page.locator("#rb-pl-targets .rb-opt").count()) === 1);
  await page.locator("#rb-pl-q").fill(""); await page.locator("#rb-pl-targets .rb-opt", { hasText: "시로코 모듈" }).click(); await page.waitForTimeout(150);
  await page.screenshot({ path: `/tmp/protlink-add-${tag}.png` });
  await page.locator("#rb-pl-save").click(); await page.waitForTimeout(500);
  ok(`[${tag}] 연결하면 목록에 이름·종류→항목·최신 상태`, /시로코 모음/.test(await text("[data-id^=pl-]")) && /모듈 → 시로코 모듈/.test(await text("[data-id^=pl-]")) && /최신 상태/.test(await text("[data-id^=pl-]")));
  // 새 파일 → 확인
  await page.evaluate(() => { __pl.files = [{ uid: "a", name: "시로코.risum", size: 4096, modifiedAt: 5, path: [] }]; });
  await page.locator("[data-id^=pl-] button", { hasText: "확인" }).first().click(); await page.waitForTimeout(600);
  ok(`[${tag}] 확인하면 새 파일 표시 + 상태 줄에 파일 이름`, /새 파일 1개 · 시로코\.risum/.test(await text("[data-id^=pl-]")) && /새 파일이 올라온 링크가 1개/.test(await text(".rb-status")));
  await page.locator("[id^=rb-pl-apply-]").click(); await page.waitForTimeout(600);
  ok(`[${tag}] 받아서 업데이트: 가져오기로 넘기며 연결 항목 전달`, (await page.evaluate(() => JSON.stringify(__pl.imported))) === '[[["시로코.risum"],{"kind":"module","id":"m1"}]]', await page.evaluate(() => JSON.stringify(__pl.imported)));
  ok(`[${tag}] 받은 뒤 최신 상태로 돌아옴`, /최신 상태/.test(await text("[data-id^=pl-]")) && !/새 파일/.test(await text(".rb-status")));
  // 플러그인으로 연결 바꾸기 → 받아서 저장
  await page.evaluate(() => { __pl.files = [{ uid: "p", name: "plug.js", size: 10, modifiedAt: 1, path: [] }]; });
  await page.locator("[data-id^=pl-] [aria-label*='더 보기']").click(); await page.locator("[role=menuitem]", { hasText: "연결 바꾸기" }).click(); await page.waitForTimeout(200);
  await page.locator("#rb-pl-kind-plugin").click(); await page.waitForTimeout(200);
  await page.locator(".rb-dialog .rb-opt", { hasText: "내 플러그인" }).click(); await page.waitForTimeout(400);
  ok(`[${tag}] 연결 바꾸기: 플러그인 → 내 플러그인`, /플러그인 → 내 플러그인/.test(await text("[data-id^=pl-]")));
  await page.locator("[id^=rb-pl-apply-]").click(); await page.waitForTimeout(500);
  ok(`[${tag}] 플러그인은 가져오기 창 대신 파일로 저장`, (await page.evaluate(() => __pl.saved.join())) === "plug.js" && (await page.evaluate(() => __pl.imported.length)) === 1);
  // 설정·지우기
  const t = page.locator("#rb-pl-settings [role=switch]"); await t.click(); await page.waitForTimeout(200);
  ok(`[${tag}] 시작 확인 설정을 끌 수 있음`, (await t.getAttribute("aria-checked")) === "false" && (await page.evaluate(() => __app.ctx.protlink.settings().check)) === false);
  await page.locator("[data-id^=pl-] [aria-label*='더 보기']").click(); await page.locator("[role=menuitem]", { hasText: "연결 해제" }).click(); await page.waitForTimeout(200);
  await page.locator(".rb-dialog button", { hasText: "지우기" }).click(); await page.waitForTimeout(400);
  ok(`[${tag}] 연결 해제하면 목록이 비어 안내가 보임`, (await page.locator("#rb-pl-empty").count()) === 1);
  // 연결 없이 한 번만
  await page.locator(".rb-status button", { hasText: "링크 추가" }).click(); await page.waitForTimeout(200);
  await page.locator("#rb-pl-url").fill("https://drive.proton.me/urls/ZZZ#k"); await page.evaluate(() => { __pl.files = [{ uid: "r", name: "한번.risum", size: 1, modifiedAt: 1, path: [] }]; }); await page.locator("#rb-pl-open").click(); await page.waitForTimeout(500);
  await page.locator("#rb-pl-once").click(); await page.waitForTimeout(500);
  ok(`[${tag}] 연결 없이 한 번만: 대상 없이 가져오기로 넘김`, (await page.evaluate(() => JSON.stringify(__pl.imported.at(-1)))) === '[["한번.risum"],null]' || (await page.evaluate(() => __pl.imported.at(-1)?.[0]?.join())) === "한번.risum");
  // 끄기 / 원본 플러그인
  await sw().click(); await page.waitForTimeout(500);
  ok(`[${tag}] 끄면 꺼짐 안내만 나오고 목록·설정은 숨김`, /꺼져 있어요/.test(await text(".rb-status")) && (await page.locator("#rb-pl-settings").count()) === 0);
  await page.screenshot({ path: `/tmp/protlink-off-${tag}.png` });
  await page.evaluate(async () => { window.__plOriginal = true; await __app.ctx.protlink.set(true); __app.ctx.go("protlink"); }); await page.waitForTimeout(600);
  ok(`[${tag}] 원본이 켜져 있으면 안내만 나옴`, /원래 ‘ProtLink\+’/.test(await text(".rb-status")), await text(".rb-status"));
  ok(`[${tag}] 페이지 오류 없음`, errs.length === 0, errs.join(" | "));
}
await browser.close();
const bad = out.filter((x) => !x).length; console.log(bad ? `\n실패 ${bad}개` : `\n모두 통과 (${out.length})`); process.exit(bad ? 1 : 0);
