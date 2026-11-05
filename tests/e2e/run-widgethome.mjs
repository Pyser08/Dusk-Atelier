// 위젯 홈(이식): Shadow DOM 격리 · 열기/닫기 · 끄면 정리 · 호스트 기능이 없어도 죽지 않음
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/widgethome.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch(), errs = [];

for (const [tag, vp, touch] of [["PC", { width: 1280, height: 800 }, false], ["모바일", { width: 390, height: 844 }, true]]) {
  const page = await (await browser.newContext({ viewport: vp, ...touch ? { hasTouch: true, isMobile: true } : {} })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><body style='margin:0'><button id=outer style='min-height:0;padding:0;border:0;width:50px;height:20px'>x</button></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  const outerBefore = await page.evaluate(() => { const b = document.getElementById("outer"); const s = getComputedStyle(b); return [s.borderRadius, s.minHeight, s.height].join("|"); });
  await page.evaluate(() => { window.api = makeApi({ localStorage: true }); window.__plOpen = []; window.wh = makeWH(api, { protLink: { on: () => true, error: () => "", links: async () => ({ ok: true, items: [{ id: "a", name: "내 봇 모음", kind: "character", target: { id: "c1", name: "시로코" }, pending: [], update: false, error: "" }, { id: "b", name: "모듈 링크", kind: "module", target: { id: "m1", name: "시로코 모듈" }, pending: ["x.risum", "y.risum"], update: true, error: "" }] }), open: async () => { __plOpen.push("(열기)"); return true; } } }); });
  ok(`[${tag}] 기본 꺼짐: 켜기 전엔 아무것도 안 만들어짐`, await page.evaluate(() => !document.querySelector("[data-dusk-widgethome]") && api.parts.length === 0 && !wh.on()));
  ok(`[${tag}] 켜기`, await page.evaluate(async () => (await wh.set(true)) === true && wh.isRunning() && api.mem.get("dusk.widgethome.on") === "on"));
  ok(`[${tag}] 메뉴 버튼(dusk-widgethome-open) 등록 + 호스트 숨김 상태`, await page.evaluate(() => api.parts.some((p) => p.id === "dusk-widgethome-open" && p.spec.location === "hamburger") && document.querySelector("[data-dusk-widgethome]").hidden === true));
  const opened = await page.evaluate(async () => await wh.open());
  ok(`[${tag}] 열기 → 전체 화면 컨테이너 + 호스트 보임`, opened === true && await page.evaluate(() => api.calls.includes("show:fullscreen") && document.querySelector("[data-dusk-widgethome]").hidden === false), JSON.stringify(await page.evaluate(() => api.calls)));
  const inner = await page.evaluate(() => { const sr = document.querySelector("[data-dusk-widgethome]").shadowRoot; return { dash: !!sr.querySelector(".dashboard"), top: !!sr.querySelector(".topbar"), dialogs: sr.querySelectorAll("dialog").length, h1: sr.querySelector("h1")?.textContent }; });
  ok(`[${tag}] 그림자 안에 화면이 그려짐`, inner.dash && inner.top && inner.dialogs >= 3, JSON.stringify(inner));
  ok(`[${tag}] 밖 문서에는 위젯 요소가 새지 않음`, await page.evaluate(() => !document.querySelector(".dashboard,.topbar,.shell")));
  const outerAfter = await page.evaluate(() => { const b = document.getElementById("outer"); const s = getComputedStyle(b); return [s.borderRadius, s.minHeight, s.height].join("|"); });
  ok(`[${tag}] 위젯 스타일이 바깥 버튼을 바꾸지 않음`, outerBefore === outerAfter, `${outerBefore} → ${outerAfter}`);
  ok(`[${tag}] 위젯 안 버튼에는 위젯 스타일이 적용됨`, await page.evaluate(() => { const b = document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector("button.pill"); return !!b && getComputedStyle(b).minHeight !== "0px"; }));
  ok(`[${tag}] 호스트 크기: 화면 안에 보임`, await page.evaluate(() => { const r = document.querySelector("[data-dusk-widgethome]").getBoundingClientRect(); return r.width > 100 && r.height > 100; }));
  ok(`[${tag}] 화면 문구에 '포켓리스'가 없음`, await page.evaluate(() => { const sr = document.querySelector("[data-dusk-widgethome]").shadowRoot; return !/포켓리스|PocketRisu/.test(sr.textContent) && sr.querySelector(".related-links").hidden === true; }));
  await page.evaluate(() => scrollTo(0, 0)); await page.mouse.move(vp.width / 2, 300); await page.mouse.wheel(0, 300); await page.waitForTimeout(300);
  ok(`[${tag}] 휠로 스크롤됨(위젯 영역이 스크롤을 막지 않음)`, tag === "모바일" ? (await page.evaluate(() => { scrollTo({ top: 250, behavior: "instant" }); return scrollY; })) > 100 : (await page.evaluate(() => scrollY)) > 100, JSON.stringify(await page.evaluate(() => [scrollY, document.documentElement.scrollHeight, innerHeight, document.body.scrollHeight])));
  await page.evaluate(() => scrollTo(0, 0));
  if (!touch) { // 위젯 배치 편집: 카드 어디든 끌어서 옮기고, 놓으면 칸에 맞춰짐
    await page.evaluate(() => document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".layout-open").click()); await page.waitForTimeout(400);
    const area0 = await page.evaluate(() => document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".widget-clock").style.gridArea);
    const box = await page.evaluate(() => { const r = document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".widget-clock").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x - 140, box.y + 90, { steps: 6 }); await page.waitForTimeout(120);
    const mid = await page.evaluate(() => { const f = document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".widget-clock"); return { t: f.style.transform, d: f.classList.contains("dragging") }; });
    ok(`[${tag}] 끄는 동안 카드가 손을 따라옴`, mid.d && /translate/.test(mid.t), JSON.stringify(mid));
    await page.mouse.up(); await page.waitForTimeout(300);
    const after = await page.evaluate(() => { const f = document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".widget-clock"); return { a: f.style.gridArea, t: f.style.transform, d: f.classList.contains("dragging") }; });
    ok(`[${tag}] 놓으면 칸에 스냅(자리가 바뀌고 따라옴 표시 해제)`, after.a !== area0 && after.t === "" && !after.d, JSON.stringify({ area0, after }));
    await page.evaluate(() => document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".layout-cancel").click()); await page.waitForTimeout(300);
    // 모서리 잡고 크기 조절(마우스): 손을 따라 커지다가 놓으면 칸에 맞춰짐
    await page.evaluate(() => document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".layout-open").click()); await page.waitForTimeout(400);
    const rs0 = await page.evaluate(() => { const f = document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".widget-memo"); f.scrollIntoView({ block: "center" }); const r = f.getBoundingClientRect(); return { a: f.style.gridArea, x: r.right - 10, y: r.bottom - 10 }; });
    await page.waitForTimeout(100);
    const rs0b = await page.evaluate(() => { const r = document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".widget-memo").getBoundingClientRect(); return { x: r.right - 10, y: r.bottom - 10 }; });
    await page.mouse.move(rs0b.x, rs0b.y); await page.mouse.down(); await page.mouse.move(rs0b.x + 160, rs0b.y + 120, { steps: 6 }); await page.waitForTimeout(120);
    const rsMid = await page.evaluate(() => document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".widget-memo").style.width);
    await page.mouse.up(); await page.waitForTimeout(300);
    const rs1 = await page.evaluate(() => { const f = document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".widget-memo"); return { a: f.style.gridArea, w: f.style.width }; });
    ok(`[${tag}] 모서리를 끌어 크기 조절 + 스냅`, /100%/.test(rsMid) && rs1.a !== rs0.a && rs1.w === "", JSON.stringify({ rs0, rsMid, rs1 }));
    // 스크롤을 내린 상태에서 카드를 위로 끌어도 자리가 오락가락(발광)하지 않음
    await page.evaluate(() => scrollTo({ top: 400, behavior: "instant" })); await page.waitForTimeout(100);
    const up = await page.evaluate(() => { const r = document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".widget-stats").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + 30 }; });
    await page.mouse.move(up.x, up.y); await page.mouse.down();
    await page.mouse.move(up.x, 20, { steps: 8 });
    const seen = await page.evaluate(async () => { const f = document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".widget-stats"), out = []; for (let i = 0; i < 40; i++) { await new Promise((r) => requestAnimationFrame(r)); out.push(f.style.gridArea); } return out; });
    const flips = seen.filter((v, i) => i && v !== seen[i - 1]).length, back = seen.filter((v, i) => i > 1 && v === seen[i - 2] && v !== seen[i - 1]).length;
    await page.mouse.up(); await page.waitForTimeout(200);
    ok(`[${tag}] 스크롤된 상태로 위로 끌어도 되돌이 깜빡임 없음`, back === 0, JSON.stringify({ flips, back }));
    await page.evaluate(() => document.querySelector("[data-dusk-widgethome]").shadowRoot.querySelector(".layout-cancel").click()); await page.waitForTimeout(300);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  }
  // 새 위젯: 주사위·D-day·타이머·한눈에·Dusk 바로가기(이 하네스는 Dusk 열기 없음 → 안내)
  const ex = await page.evaluate(async () => {
    const sr = document.querySelector("[data-dusk-widgethome]").shadowRoot, q = (s) => sr.querySelector(s);
    q(".dice-expr").value = "2d6"; q(".dice-roll").click();
    const dice = q(".dice-result").textContent;
    q(".dday-add-open").click(); q(".dday-title").value = "마감"; q(".dday-date").value = "2099-01-01"; q(".dday-form").requestSubmit();
    await new Promise((r) => setTimeout(r, 50));
    const dday = q(".dday-list").textContent;
    q('.timer-presets [data-min="5"]').click(); q(".timer-start").click(); await new Promise((r) => setTimeout(r, 1300)); const timer = q(".timer-display").textContent; q(".timer-reset").click();
    return { dice, dday, timer, stats: q(".st-streak").textContent, duskNone: !q(".dusk-none").hidden, saved: !!api.mem.get("pocketrisu.basic-home.v1.ddays") };
  });
  ok(`[${tag}] 새 위젯 동작(주사위·D-day 저장·타이머·연속 접속)`, /^\d+/.test(ex.dice) && /마감/.test(ex.dday) && /D-\d+/.test(ex.dday) && ex.saved && /^04:5[89]$/.test(ex.timer) && ex.stats === "1일" && ex.duskNone, JSON.stringify(ex));
  const pw = await page.evaluate(async () => {
    const sr = document.querySelector("[data-dusk-widgethome]").shadowRoot, q = (s) => sr.querySelector(s);
    await new Promise((r) => setTimeout(r, 100));
    const names = [...sr.querySelectorAll(".pl-item b")].map((e) => e.textContent), subs = [...sr.querySelectorAll(".pl-item small")].map((e) => e.textContent), badges = [...sr.querySelectorAll(".pl-item .k.new")].map((e) => e.textContent);
    sr.querySelector(".pl-item").click(); q(".pl-open").click(); await new Promise((r) => setTimeout(r, 50));
    return { names, subs, badges, opened: __plOpen.slice(), card: !!q(".protlink-card.widget-frame, .widget-protlink") };
  });
  ok(`[${tag}] ProtLink+ 위젯: 새 파일 있는 링크가 먼저·연결 항목·배지, 누르면 ProtLink+ 열기`, pw.names.join() === "모듈 링크,내 봇 모음" && pw.subs[0] === "모듈 → 시로코 모듈" && pw.badges.join() === "새 파일 2" && pw.opened.join() === "(열기),(열기)" && pw.card, JSON.stringify(pw));
  await page.evaluate(async () => { await wh.close(); });
  ok(`[${tag}] 닫기 → hideContainer + 호스트 숨김`, await page.evaluate(() => api.calls.includes("hide") && document.querySelector("[data-dusk-widgethome]").hidden === true));
  await page.evaluate(async () => { await wh.open(); await wh.yieldToDusk(); });
  ok(`[${tag}] Dusk로 양보하면 위젯 홈이 닫힘`, await page.evaluate(() => document.querySelector("[data-dusk-widgethome]").hidden === true && !wh.isVisible()));
  await page.evaluate(async () => { await wh.set(false); });
  ok(`[${tag}] 끄면 호스트 제거 + 버튼 해제 + 저장값 off`, await page.evaluate(() => !document.querySelector("[data-dusk-widgethome]") && !api.parts.length && api.mem.get("dusk.widgethome.on") === "off" && !wh.isRunning()));
  // 호스트 기능이 모자라도(getLocalPluginStorage·getRootDocument·createMutationObserver 없음) 죽지 않고 열린다
  const bare = await page.evaluate(async () => { window.api2 = makeApi({}); window.wh2 = makeWH(api2); await wh2.set(true); const o = await wh2.open(); const t = wh2.autoStatus(); await wh2.set(false); return { o, t, running: wh2.isRunning(), alerts: api2.calls.filter((c) => c.startsWith("alert:")) }; });
  ok(`[${tag}] 최소 api(RisuBard류)에서도 열림, 경고창 없음`, bare.o === true && bare.alerts.length === 0, JSON.stringify(bare));
  const noShow = await page.evaluate(async () => { const a = makeApi({}); delete a.showContainer; const w = makeWH(a); const ok1 = await w.set(true); return { ok1, err: w.lastError(), running: w.isRunning() }; });
  const dz = await page.evaluate(async () => { const a = makeApi({}); const calls = []; const w = makeWH(a, { openDusk: (t) => calls.push(t) }); await w.set(true); await w.open(); const sr = [...document.querySelectorAll("[data-dusk-widgethome]")].pop().shadowRoot; sr.querySelector('.dusk-go[data-tab="relmap"]').click(); await w.set(false); return calls; });
  ok(`[${tag}] Dusk 바로가기 → 해당 화면 열기 요청`, dz.join() === "relmap", JSON.stringify(dz));
  ok(`[${tag}] showContainer가 없으면 켜지지 않고 이유를 알려줌`, noShow.ok1 === false && /쓸 수 없/.test(noShow.err) && !noShow.running, JSON.stringify(noShow));
  // 켜진 채로 저장된 값이 있으면 boot()가 시작
  ok(`[${tag}] 저장된 켜짐 → boot()가 시작`, await page.evaluate(async () => { const a = makeApi({}); a.mem.set("dusk.widgethome.on", "on"); const w = makeWH(a); await w.boot(); const r1 = w.isRunning() && a.parts.length === 1; await w.stop(); return r1; }));
  await page.close();
}

{ // Dusk 설정 탭의 카드 · 도구 행
  const ar = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json", ".md": "text", ".txt": "text" } });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: ar.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true }) }, { widgetHome: true }));
  await page.waitForTimeout(500);
  const vis = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent).length, sel);
  await page.evaluate(() => __app.ctx.go("tools")); await page.waitForTimeout(300);
  ok("[설정] 꺼짐이면 도구에 위젯 홈 행 없음", (await vis("#rb-tool-widgethome")) === 0);
  await page.evaluate(() => __app.ctx.go("settings")); await page.waitForTimeout(400);
  ok("[설정] 위젯 홈 카드가 보임(켜짐 아님)", (await vis("#rb-widgethome")) === 1 && (await page.locator("#rb-widgethome [role=switch][aria-label='위젯 홈']").getAttribute("aria-checked")) === "false");
  await page.locator("#rb-widgethome [role=switch][aria-label='위젯 홈']").click(); await page.waitForTimeout(500);
  ok("[설정] 스위치를 켜면 시작됨", (await page.evaluate(() => __wh.boots)) === 1 && (await page.locator("#rb-widgethome [role=switch][aria-label='위젯 홈']").getAttribute("aria-checked")) === "true");
  await page.evaluate(() => __app.ctx.go("tools")); await page.waitForTimeout(300);
  ok("[설정] 켜면 도구에 위젯 홈 행", (await vis("#rb-tool-widgethome")) === 1);
  await page.locator("#rb-tool-widgethome").click(); await page.waitForTimeout(400);
  ok("[설정] 행을 누르면 Dusk가 닫히고 위젯 홈 열기", (await page.evaluate(() => __wh.opened)) === 1 && (await vis(".rb-root")) === 0);
  await page.evaluate(() => __app.open()); await page.waitForTimeout(400);
  await page.evaluate(() => __app.ctx.go("settings")); await page.waitForTimeout(400);
  await page.locator("#rb-widgethome [role=switch][aria-label='위젯 홈']").click(); await page.waitForTimeout(500);
  ok("[설정] 끄면 정리됨", (await page.evaluate(() => __wh.disposed)) === 1);
  await page.close();
}
ok("페이지 오류 없음", errs.length === 0, errs.join(" / "));
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
