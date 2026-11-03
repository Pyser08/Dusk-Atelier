// 플러그인 매니저 기능: 켜기/끄기·별칭·순서·삭제 / 파일에서 등록 / 중복 정리 / 백업·복원 / 글로벌 프리셋 / 메타데이터 정리. Cellar가 plugins 기능을 알릴 때만 보인다.
// 클라우드 샌드박스: /opt/npm-tools
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); page.setDefaultTimeout(5000);
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "1.7.0-dev", "rbm:memoryEmbeddingGuide:shown:v1": "1", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, { memory: true, story: true, mods: true }));


await page.evaluate(() => {
  const mk = (name, enabled = true, sha = name) => ({ index: 0, name, displayName: name, enabled, sha256: sha, bytes: 10, argNames: [] });
  window.__ml = [mk("dusk_atelier"), mk("risupot"), mk("tts_helper", false)].map((p, i) => ({ ...p, index: i }));
  window.__ops = [];
  window.__cpHandle = (b) => {
    const L = window.__ml;
    if (b.action === "list") return { status: 200, body: { ok: true, host: "risubard", listSha: "L" + L.map((p) => p.name).join(), plugins: L } };
    if (b.action === "export") return { status: 200, body: { ok: true, listSha: "L" + L.map((p) => p.name).join(), plugins: L.map((p) => ({ name: p.name, displayName: p.name, script: "//@name " + p.name + "\n", enabled: p.enabled, arguments: {}, realArg: {} })) } };
    if (b.action === "mutate") { window.__ops.push(b); return { status: 200, body: { ok: true, host: "risubard", file: "settings/app.json", snapshot: "snap", results: [], adopted: true, reload: true, stillPending: false, needsReload: true } }; }
    return { status: 400, body: { ok: false, error: "action" } };
  };
  window.__cellarOn = true; window.__cellarFeat = ["mem", "backup", "plugins"]; __app.ctx.cellar?.forget();
});
const lastOps = () => page.evaluate(() => window.__ops.at(-1));
const menuItems = () => page.locator(".rb-menu button").allTextContents();
const toast = async () => (await page.locator(".rb-toast").allTextContents()).join("|");

await page.evaluate(() => __app.ctx.go("plugins")); await page.waitForTimeout(1200);

// 1) 켜기/끄기 스위치
const sw = page.locator('[role="switch"][aria-label="RisuPot 끄기"]');
ok("서버 기능이 있으면 줄마다 켜기/끄기 스위치가 보임", (await sw.count()) === 1);
await sw.click(); await page.waitForTimeout(500);
let op = await lastOps();
ok("끄기 → mutate set enabled:false", op?.action === "mutate" && op.ops[0].op === "set" && op.ops[0].name === "risupot" && op.ops[0].fields.enabled === false, JSON.stringify(op));

// 2) 줄 메뉴: 별칭·위로·아래로·삭제 (맨 위 줄은 '위로' 없음)
await page.locator('button[aria-label="RisuPot 메뉴"]').click(); await page.waitForTimeout(300);
let mi = await menuItems();
ok("줄 메뉴에 별칭·삭제·위로·아래로가 있음", mi.some((t) => t.includes("별칭")) && mi.some((t) => t.includes("삭제")) && mi.includes("위로") && mi.includes("아래로"), mi.join("|"));
await page.locator('.rb-menu button:has-text("아래로")').click(); await page.waitForTimeout(500);
op = await lastOps();
ok("아래로 → order 작업과 목록 해시", op.ops[0].op === "order" && JSON.stringify(op.ops[0].order) === "[0,2,1]" && op.expectListSha.startsWith("L"), JSON.stringify(op));
await page.locator('button[aria-label="RisuPot 메뉴"]').click(); await page.waitForTimeout(300);
await page.locator('.rb-menu button:has-text("별칭")').click(); await page.waitForTimeout(300);
await page.locator(".rb-dialog input").fill("팟"); await page.locator(".rb-dialog button.primary").click(); await page.waitForTimeout(500);
op = await lastOps();
ok("별칭 → set alias", op.ops[0].fields.alias === "팟", JSON.stringify(op));
await page.locator('button[aria-label="TTS 도우미 메뉴"]').click(); await page.waitForTimeout(300);
await page.locator('.rb-menu button:has-text("삭제")').click(); await page.waitForTimeout(300);
await page.locator(".rb-dialog button.danger, .rb-dialog button.primary").last().click(); await page.waitForTimeout(500);
op = await lastOps();
ok("삭제 → remove 작업", op.ops[0].op === "remove" && op.ops[0].name === "tts_helper", JSON.stringify(op));
await page.locator('button[aria-label="Dusk Atelier 메뉴"]').click(); await page.waitForTimeout(300);
mi = await menuItems();
ok("자기 자신(Dusk Atelier)은 삭제 메뉴가 없고, 맨 위 줄이라 '위로'도 없음", !mi.some((t) => t.includes("삭제")) && !mi.includes("위로"), mi.join("|"));
await page.keyboard.press("Escape");

// 3) 툴바 메뉴 항목
await page.locator("#rb-plug-more").click(); await page.waitForTimeout(300);
mi = await menuItems();
ok("더 보기 메뉴에 등록·프리셋·중복·백업·복원·메타", ["파일에서 등록", "글로벌 프리셋", "중복 정리", "전체 백업", "백업 복원", "메타데이터 정리"].every((t) => mi.some((x) => x.includes(t))), mi.join("|"));
await page.keyboard.press("Escape");

// 4) 파일에서 등록
const open = async (label) => { await page.locator("#rb-plug-more").click(); await page.waitForTimeout(250); await page.locator(`.rb-menu button:has-text("${label}")`).click(); await page.waitForTimeout(500); };
await open("파일에서 등록");
ok("코드가 없으면 등록 버튼이 꺼져 있음", await page.locator("#rb-pm-go").isDisabled());
await page.locator("#rb-pm-code").fill("code only"); await page.waitForTimeout(200);
ok("//@name이 없으면 안내", (await page.locator("#rb-pm-info").textContent()).includes("//@name") && await page.locator("#rb-pm-go").isDisabled());
await page.locator("#rb-pm-code").fill("//@name newbie\n//@display-name 새내기\n//@api 2.0\n//@arg k string\nrun();"); await page.waitForTimeout(200);
ok("API 2.0 경고와 2.1 변환 버튼", (await page.locator("#rb-pm-info").textContent()).includes("2.0") && (await page.locator("#rb-pm-v21").count()) === 1);
await page.locator("#rb-pm-v21").click(); await page.waitForTimeout(200);
ok("변환 후 //@api 2.1", (await page.locator("#rb-pm-code").inputValue()).includes("//@api 2.1"));
await page.locator("#rb-pm-go").click(); await page.waitForTimeout(600);
op = await lastOps();
ok("등록 → add 작업(이름·인자·realArg)", op.ops[0].op === "add" && op.ops[0].plugin.name === "newbie" && op.ops[0].plugin.arguments.k === "string" && op.ops[0].plugin.realArg.k === "" && !op.ops[0].replace, JSON.stringify(op).slice(0, 200));
await open("파일에서 등록");
await page.locator("#rb-pm-code").fill("//@name risupot\n//@api 3.0\n"); await page.waitForTimeout(250);
ok("이미 있는 이름이면 '덮어쓰기' + 설정 유지 체크", (await page.locator("#rb-pm-go").textContent()).includes("덮어쓰기") && await page.locator("#rb-pm-keep").isChecked());
await page.locator("#rb-pm-go").click(); await page.waitForTimeout(600);
op = await lastOps();
ok("덮어쓰기 → add replace keepSettings", op.ops[0].replace === true && op.ops[0].keepSettings === true, JSON.stringify(op).slice(0, 200));

// 5) 중복 정리: 없으면 안내, 있으면 remove 작업
await open("중복 정리");
ok("중복이 없으면 안내", (await page.locator("#rb-pm-nodup").count()) === 1);
await page.keyboard.press("Escape");
await page.evaluate(() => { window.__ml.push({ index: 3, name: "risupot", displayName: "risupot", enabled: true, sha256: "x", bytes: 1, argNames: [] }); });
await open("중복 정리");
await page.locator("#rb-pm-dupgo").click(); await page.waitForTimeout(500);
op = await lastOps();
ok("중복 정리 → 뒤 사본 remove(index 3)", op.ops.length === 1 && op.ops[0].op === "remove" && op.ops[0].index === 3, JSON.stringify(op));
await page.evaluate(() => { window.__ml.pop(); });

// 6) 글로벌 프리셋: 만들기 → 목록 → 적용
await open("글로벌 프리셋");
ok("처음엔 프리셋 없음", (await page.locator("#rb-pm-nopreset").count()) === 1);
await page.locator("#rb-pm-newpreset").click(); await page.waitForTimeout(300);
await page.locator(".rb-dialog input").last().fill("작업용"); await page.locator(".rb-dialog button.primary").last().click(); await page.waitForTimeout(500);
ok("프리셋이 저장돼 목록에 보임", (await page.locator("#rb-pm-presets").textContent()).includes("작업용"));
await page.evaluate(() => { window.__ml[1].enabled = !window.__ml[1].enabled; });
await page.locator('#rb-pm-presets button:has-text("적용")').click(); await page.waitForTimeout(700);
op = await page.evaluate(() => window.__ops.filter((o) => o.ops[0].op === "set" && "enabled" in o.ops[0].fields).at(-1));
ok("적용 → 달라진 켜짐 상태를 되돌리는 set 작업", op.ops.length === 1 && op.ops[0].name === "risupot", JSON.stringify(op));
await page.keyboard.press("Escape");

// 7) 백업 복원: 파일 고르기 → 범위·방식 → replaceAll
await open("백업 복원");
const bk = JSON.stringify({ type: "dusk-plugin-backup", version: 1, createdAt: "2026-11-03T00:00:00Z", plugins: [{ name: "risupot", script: "//@name risupot\n", enabled: true }, { name: "oldone", script: "//@name oldone\n", enabled: true }], categories: {}, presets: null });
const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.locator("#rb-pm-restorefile").click()]);
await fc.setFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(bk) }); await page.waitForTimeout(400);
ok("백업 정보가 보임", (await page.locator("#rb-pm-bkinfo").textContent()).includes("플러그인 2개"));
await page.locator("#rb-pm-restorego").click(); await page.waitForTimeout(500);
await page.locator(".rb-dialog button.danger, .rb-dialog button.primary").last().click(); await page.waitForTimeout(700);
op = await lastOps();
ok("복원 → replaceAll(백업 2개) + 목록 해시", op.ops[0].op === "replaceAll" && op.ops[0].plugins.length === 2 && op.expectListSha.startsWith("L"), JSON.stringify(op).slice(0, 200));
await page.evaluate(() => document.querySelectorAll(".rb-modal").forEach((m) => m.remove()));

// 8) 메타데이터 정리: 없는 플러그인의 카테고리
await page.evaluate(() => __app.ctx.api.pluginStorage.setItem("rbm:pluginCats:v1", JSON.stringify({ risupot: "UI", ghost: "옛날" })));
await open("메타데이터 정리");
ok("없는 플러그인의 카테고리를 알려 줌", (await page.locator(".rb-dialog").textContent()).includes("ghost"));
await page.locator("#rb-pm-metago").click(); await page.waitForTimeout(500);
const cats = await page.evaluate(() => __app.ctx.api.pluginStorage.getItem("rbm:pluginCats:v1"));
ok("정리 후 ghost만 사라짐", !String(cats).includes("ghost") && String(cats).includes("risupot"), String(cats));

// 9) 서버 기능이 없으면 아무것도 안 보임
await page.evaluate(() => { window.__cellarFeat = ["mem"]; __app.ctx.cellar?.forget(); __app.ctx.go("settings"); }); await page.waitForTimeout(400);
await page.evaluate(() => __app.ctx.go("plugins")); await page.waitForTimeout(1200);
await open("새로고침"); await page.waitForTimeout(1200);
ok("서버 기능이 없으면 스위치 없음", (await page.locator("[role=switch]").evaluateAll((a) => a.map((x) => x.getAttribute("aria-label")))).filter((t) => /(끄기|켜기)$/.test(t || "")).length === 0, await page.locator("[role=switch]").evaluateAll((a) => a.map((x) => x.getAttribute("aria-label")).join("|")));

// 10) 저장소 탭: 새 키 → 수정(형식 바꾸면 경고, 그새 바뀜 충돌) → 가져오기
await page.evaluate(() => { window.__cellarFeat = ["mem", "backup", "plugins"]; __app.ctx.cellar?.forget(); });
await page.locator('.rb-seg button:has-text("저장소")').click(); await page.waitForTimeout(800);
ok("저장소 탭에 새 키·내보내기·가져오기 버튼", (await page.locator("#rb-st-new").count()) === 1 && (await page.locator("#rb-st-export").count()) === 1 && (await page.locator("#rb-st-import").count()) === 1);
await page.locator("#rb-st-new").click(); await page.waitForTimeout(300);
await page.locator("#rb-st-newkey").fill("demo:key"); await page.locator("#rb-st-text").fill("hello"); await page.locator("#rb-st-create").click(); await page.waitForTimeout(500);
ok("새 키가 저장됨", (await page.evaluate(() => __app.ctx.api.pluginStorage.getItem("demo:key"))) === "hello");
await page.locator("#rb-st-new").click(); await page.waitForTimeout(300);
await page.locator("#rb-st-newkey").fill("demo:key"); await page.locator("#rb-st-text").fill("again"); await page.locator("#rb-st-create").click(); await page.waitForTimeout(400);
ok("이미 있는 키면 덮어쓰기 확인", (await page.locator(".rb-dialog").last().textContent()).includes("이미 있어요"));
await page.locator(".rb-dialog button").filter({ hasText: "취소" }).last().click(); await page.waitForTimeout(300);
ok("취소하면 값 그대로", (await page.evaluate(() => __app.ctx.api.pluginStorage.getItem("demo:key"))) === "hello");
await page.evaluate(() => document.querySelectorAll(".rb-modal").forEach((m) => m.remove()));
await page.locator('button.rb-row:has-text("demo:key")').click(); await page.waitForTimeout(500);
await page.locator("#rb-st-edit").click(); await page.waitForTimeout(300);
await page.locator("#rb-st-kind").selectOption("json"); await page.waitForTimeout(200);
ok("형식을 바꾸면 경고", (await page.locator("#rb-st-warn").textContent()).includes("동작이 깨질 수"));
await page.locator("#rb-st-text").fill('"hello2"');
await page.evaluate(() => __app.ctx.api.pluginStorage.setItem("demo:key", "changed-elsewhere"));
await page.locator("#rb-st-save").click(); await page.waitForTimeout(400);
ok("편집 중 다른 곳에서 바뀌면 충돌 확인", (await page.locator(".rb-dialog").last().textContent()).includes("바뀌었어요"));
await page.locator(".rb-dialog button").filter({ hasText: "덮어쓰기" }).last().click(); await page.waitForTimeout(500);
ok("덮어쓰면 JSON 값으로 저장", (await page.evaluate(() => __app.ctx.api.pluginStorage.getItem("demo:key"))) === "hello2");
await page.evaluate(() => document.querySelectorAll(".rb-modal").forEach((m) => m.remove()));
await page.locator("#rb-st-import").click(); await page.waitForTimeout(300);
const sf = JSON.stringify({ type: "dusk-plugin-storage", version: 1, items: { "demo:key": "x", "demo:new": { a: 1 } } });
const [fc2] = await Promise.all([page.waitForEvent("filechooser"), page.locator("#rb-st-file").click()]);
await fc2.setFiles({ name: "s.json", mimeType: "application/json", buffer: Buffer.from(sf) }); await page.waitForTimeout(400);
ok("가져오기: 이미 있는 키는 덮어쓰기 표시", (await page.locator("#rb-st-items").textContent()).includes("덮어쓰기"));
await page.locator("#rb-st-items input").first().uncheck();
await page.locator("#rb-st-importgo").click(); await page.waitForTimeout(600);
ok("선택 안 한 키는 그대로, 선택한 새 키만 씀", (await page.evaluate(() => __app.ctx.api.pluginStorage.getItem("demo:key"))) === "hello2" && JSON.stringify(await page.evaluate(() => __app.ctx.api.pluginStorage.getItem("demo:new"))) === '{"a":1}');
ok("페이지 오류 없음", errs.length === 0, errs.join("|"));
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
