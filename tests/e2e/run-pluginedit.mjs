// 플러그인 탭 → ··· → '코드 수정'. Cellar(서버)가 plugins 기능을 알릴 때만 메뉴에 보인다.
// 흐름: 편집 → 변경 확인(바뀐 줄·백업 선택) → 적용 → 결과 → 되돌리기. 그새 바뀜(409)·머리말 이름 바뀜·쓰였지만 못 받아들임(502)도 확인.
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

// 가짜 Cellar /cellar/plugins: 코드 저장소(st)와 해시. apply는 expectSha가 다르면 409(그새 바뀜), mode로 502(쓰였지만 못 받아들임)도 흉내 낸다
await page.evaluate(() => {
  const hash = (s) => { let a = 5381, b = 52711; for (let i = 0; i < s.length; i++) { a = (a * 33 ^ s.charCodeAt(i)) >>> 0; b = (b * 31 + s.charCodeAt(i)) >>> 0; } return (a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0")).repeat(4); };
  window.__hash = hash;
  window.__st = {
    risupot: "//@name risupot\n//@api 3.0\nconsole.log('v1');\nconst keep = 1;\n",
    dusk_atelier: "//@name dusk_atelier\n//@api 3.0\n" + "console.log('x');\n".repeat(30000),
    tts_helper: "//@name tts_helper\n//@api 3.0\nspeak();\n",
  };
  window.__cpMode = "";
  window.__cpHandle = (b) => {
    const st = window.__st;
    if (b.action === "get") return b.name in st ? { status: 200, body: { ok: true, name: b.name, index: 1, script: st[b.name], sha256: hash(st[b.name]) } } : { status: 404, body: { ok: false, error: "플러그인이 없어요" } };
    if (b.action === "apply") {
      const e = b.edits[0], cur = st[e.name];
      if (e.expectSha !== hash(cur)) return { status: 409, body: { ok: false, error: "그새 바뀌었어요", conflict: true, currentSha: hash(cur) } };
      st[e.name] = e.script;
      if (window.__cpMode === "written") return { status: 502, body: { ok: false, error: "파일은 고쳤지만 리스가 받아들이지 못했어요(응답 423)", written: true, snapshot: "20261103-written", file: "settings/app.json" } };
      return { status: 200, body: { ok: true, host: "risubard", file: "settings/app.json", snapshot: "20261103-snap", results: [{ name: e.name, oldSha: hash(cur), newSha: hash(e.script), bytes: e.script.length }], adopted: true, reload: true, stillPending: false, needsReload: true } };
    }
    return { status: 400, body: { ok: false, error: "action" } };
  };
});
const menuOf = async (name) => { await page.locator(`button[aria-label="${name} 메뉴"]`).click(); await page.waitForTimeout(300); };
const items = () => page.locator(".rb-menu button").allTextContents();
const dlg = () => page.locator('.rb-dialog[aria-label$="코드 수정"]');

// 1) Cellar가 없으면 메뉴에 '코드 수정'이 없다
await page.evaluate(() => __app.ctx.go("plugins")); await page.waitForTimeout(900);
await menuOf("RisuPot");
ok("Cellar가 없으면 '코드 수정' 없음", !(await items()).some((t) => t.includes("코드 수정")), (await items()).join("|"));
await page.keyboard.press("Escape");

// 2) plugins 기능 없는 Cellar(mem·backup만)도 없다
await page.evaluate(() => { window.__cellarOn = true; window.__cellarFeat = ["mem", "backup"]; __app.ctx.cellar?.forget(); __app.ctx.go("settings"); }); await page.waitForTimeout(500);
await page.evaluate(() => __app.ctx.go("plugins")); await page.waitForTimeout(900);
await menuOf("RisuPot");
ok("plugins 기능이 없는 Cellar면 '코드 수정' 없음", !(await items()).some((t) => t.includes("코드 수정")), (await items()).join("|"));
await page.keyboard.press("Escape");

// 3) plugins 기능이 있으면 보인다
await page.evaluate(() => { window.__cellarFeat = ["mem", "backup", "plugins"]; __app.ctx.cellar?.forget(); __app.ctx.go("settings"); }); await page.waitForTimeout(500);
await page.evaluate(() => __app.ctx.go("plugins")); await page.waitForTimeout(900);
await menuOf("RisuPot");
ok("plugins 기능이 있으면 '코드 수정' 보임", (await items()).some((t) => t.includes("코드 수정")), (await items()).join("|"));
await page.locator('.rb-menu button:has-text("코드 수정")').click();
await page.waitForSelector("#rb-pe-editor textarea");
const taVal = () => page.locator("#rb-pe-editor textarea").inputValue();
ok("코드를 불러와 편집기에 채움", (await taVal()).includes("console.log('v1')"), (await taVal()).slice(0, 60));
ok("처음엔 '변경 확인'이 꺼져 있음", await page.locator("#rb-pe-next").isDisabled());
const calls0 = await page.evaluate(() => window.__cpCalls);
ok("get 요청: 이름만(겹치지 않으므로 index 없음)", JSON.stringify(calls0[0]) === JSON.stringify({ action: "get", name: "risupot" }), JSON.stringify(calls0[0]));

// 4) 머리말 이름을 바꾸면 변경 확인에서 막는다
const orig = await taVal();
await page.locator("#rb-pe-editor textarea").fill(orig.replace("//@name risupot", "//@name 다른이름"));
await page.locator("#rb-pe-next").click(); await page.waitForTimeout(200);
ok("//@name이 바뀌면 편집 화면에 머물고 안내", (await page.locator("#rb-pe-apply").count()) === 0 && (await dlg().textContent()).includes("'다른이름'"), (await dlg().textContent()).slice(0, 200));

// 5) 정상 수정 → 변경 확인(바뀐 줄 미리 보기·백업 체크 기본 켜짐)
const next = orig.replace("v1", "v2");
await page.locator("#rb-pe-editor textarea").fill(next);
await page.locator("#rb-pe-next").click(); await page.waitForSelector("#rb-pe-apply");
ok("바뀐 줄 요약 +1 −1", (await page.locator("#rb-pe-sum").textContent()).includes("+1") && (await page.locator("#rb-pe-sum").textContent()).includes("−1"), await page.locator("#rb-pe-sum").textContent());
const diffText = await page.locator("#rb-pe-diff").textContent();
ok("미리 보기에 옛 줄·새 줄", diffText.includes("v1") && diffText.includes("v2"), diffText);
ok("세이브 백업 체크가 기본 켜짐", await page.locator("#rb-pe-backup").isChecked());
await page.evaluate(() => { window.__bkJob = { done: 12, total: 12, finishedAt: Date.now() }; });
await page.locator("#rb-pe-apply").click(); await page.waitForSelector("#rb-pe-result", { timeout: 8000 });
ok("결과: 고쳤어요", (await page.locator("#rb-pe-result").textContent()).includes("고쳤어요"), await page.locator("#rb-pe-result").textContent());
const bk = await page.evaluate(() => window.__bkPosts ?? []);
ok("고치기 전에 세이브 백업을 시작함(라벨 '플러그인 수정 전')", bk.some((b) => b.action === "create" && b.label === "플러그인 수정 전"), JSON.stringify(bk));
const ap = (await page.evaluate(() => window.__cpCalls)).find((c) => c.action === "apply");
ok("apply: 이름·옛 코드 해시·새 코드", ap.edits[0].name === "risupot" && ap.edits[0].expectSha === (await page.evaluate((o) => window.__hash(o), orig)) && ap.edits[0].script === next, JSON.stringify(ap).slice(0, 160));
ok("서버 쪽 코드가 바뀜", (await page.evaluate(() => window.__st.risupot)) === next);
ok("새로고침 안내가 보임", (await dlg().textContent()).includes("새로고침"));
ok("스냅샷 이름을 알려 줌", (await dlg().textContent()).includes("20261103-snap"));

// 6) 되돌리기
await page.locator("#rb-pe-undo").click(); await page.waitForTimeout(300);
await page.locator('.rb-modal >> nth=-1 >> button:has-text("되돌리기")').click(); await page.waitForTimeout(500);
ok("되돌리면 '이전 코드로 되돌렸어요'", (await page.locator("#rb-pe-result").textContent()).includes("되돌렸어요"), await page.locator("#rb-pe-result").textContent());
ok("서버 쪽 코드가 처음으로 돌아옴", (await page.evaluate(() => window.__st.risupot)) === orig);
ok("되돌린 뒤엔 되돌리기 버튼이 없음", (await page.locator("#rb-pe-undo").count()) === 0);
await page.locator("#rb-pe-close").click(); await page.waitForTimeout(200);

// 7) 그새 바뀜(409): 코드를 불러온 뒤 다른 곳에서 바뀌면 거절하고 다시 불러오게 한다. 백업은 끄고 진행
await menuOf("RisuPot"); await page.locator('.rb-menu button:has-text("코드 수정")').click(); await page.waitForSelector("#rb-pe-editor textarea");
await page.evaluate(() => { window.__st.risupot += "// 누군가 바꿈\n"; });
await page.locator("#rb-pe-editor textarea").fill(orig.replace("v1", "v3"));
await page.locator("#rb-pe-next").click(); await page.waitForSelector("#rb-pe-apply");
await page.locator("#rb-pe-backup").uncheck();
const bkBefore = (await page.evaluate(() => window.__bkPosts ?? [])).length;
await page.locator("#rb-pe-apply").click(); await page.waitForSelector("#rb-pe-reload");
ok("그새 바뀌었으면 안내하고 '코드 다시 불러오기'", (await dlg().textContent()).includes("그새"), (await dlg().textContent()).slice(0, 160));
ok("백업을 끄면 백업을 시작하지 않음", (await page.evaluate(() => window.__bkPosts ?? [])).length === bkBefore);
await page.locator("#rb-pe-reload").click(); await page.waitForSelector("#rb-pe-editor textarea");
ok("다시 불러오면 바뀐 코드가 보임", (await taVal()).includes("// 누군가 바꿈"));
await page.locator("#rb-pe-close").click(); await page.waitForTimeout(200);

// 8) 쓰였지만 리스가 받아들이지 못함(502 written): 파일은 고쳐졌다고 알리고 재시도 버튼은 없다
await page.evaluate(() => { window.__cpMode = "written"; });
await menuOf("TTS 도우미"); await page.locator('.rb-menu button:has-text("코드 수정")').click(); await page.waitForSelector("#rb-pe-editor textarea");
await page.locator("#rb-pe-editor textarea").fill((await taVal()).replace("speak()", "speak(1)"));
await page.locator("#rb-pe-next").click(); await page.waitForSelector("#rb-pe-apply");
await page.locator("#rb-pe-backup").uncheck();
await page.locator("#rb-pe-apply").click(); await page.waitForTimeout(500);
const t8 = await dlg().textContent();
ok("쓰였지만 못 받아들이면: 파일은 이미 고쳐졌다 + 스냅샷 이름", t8.includes("파일은 이미 고쳐졌어요") && t8.includes("20261103-written"), t8.slice(0, 240));
ok("그 경우 '뒤로'·'다시 시도'는 없음(같은 해시로 다시 보내면 안 됨)", (await page.locator("#rb-pe-retry").count()) === 0 && (await page.locator("#rb-pe-reload").count()) === 0);
await page.locator("#rb-pe-close").click(); await page.waitForTimeout(200);
await page.evaluate(() => { window.__cpMode = ""; });

// 9) 큰 코드(Atelier 자신): 색 없는 편집기 + 자기 자신 경고
await menuOf("Dusk Atelier"); await page.locator('.rb-menu button:has-text("코드 수정")').click(); await page.waitForSelector("#rb-pe-editor textarea");
ok("큰 코드는 색 입히기 없는 일반 편집기", (await page.locator("#rb-pe-editor .rb-code").count()) === 0 && (await page.locator("#rb-pe-editor textarea.rb-input").count()) === 1);
ok("자기 자신 경고", (await dlg().textContent()).includes("자신을 고치고"));
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
await page.locator("#rb-pe-close").click();

ok("페이지 오류 없음", errs.length === 0, errs.join(" | "));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
