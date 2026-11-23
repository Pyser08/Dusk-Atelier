// 폴더 관리/쉬운 로어북: 책장 화면 — 책상·책장, 책 펼치기(이름 겹침 막기·되돌리기), 끌어서 꽂기·꺼내기, 자동 정리, 캐시로 다시 열기. PC·모바일.
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"2.1.0"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const shot = process.env.SHOT;
const wait = (p, ms = 600) => p.waitForTimeout(ms);
const center = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
const pos = (page, sel, block) => page.evaluate(([s, bl]) => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: bl, inline: "center" }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, [sel, block]);
async function drag(page, from, to) {
  await pos(page, to, "nearest").catch(() => null);
  const a = await pos(page, from, "nearest");
  if (!a) return false;
  await page.mouse.move(a[0], a[1]); await page.mouse.down();
  await page.mouse.move(a[0] + 12, a[1] - 12); await wait(page, 60);   // 끌기 시작 (숨은 '분류 안 된 책' 칸이 이때 나타남)
  const b = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, to);
  if (!b) { await page.mouse.up(); return false; }
  for (let i = 1; i <= 14; i++) { await page.mouse.move(a[0] + (b[0] - a[0]) * i / 14, a[1] + (b[1] - a[1]) * i / 14); await wait(page, 16); }
  await wait(page, 120);
  const hot = await page.evaluate(() => !!document.querySelector(".el-hot"));
  await page.mouse.up(); await wait(page, 800);
  return hot;
}
for (const [label, vp] of [["PC", { width: 1280, height: 860 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { easylore: true }));
  await wait(page, 300);
  await page.evaluate(() => window.__app.ctx.go("easylore")); await wait(page, 1200);
  let t = await page.evaluate(() => document.querySelector(".rb-main").innerText);
  ok(`${label}: 관리 탭에서 플러그인과 ProtLink+ 사이`, await page.evaluate(() => { const ids = [...document.querySelectorAll("a[data-tab], [data-tab]")].map((a) => a.dataset.tab).filter((x) => ["plugins", "easylore", "protlink"].includes(x)); const i = ids.indexOf("easylore"); return i > 0 && ids[i - 1] === "plugins"; }));
  ok(`${label}: 처음엔 분류 안 된 책만`, /분류 안 된 책\s*1권/.test(t) && await page.evaluate(() => [...document.querySelectorAll(".el-case .el-book")].map((b) => b.dataset.id).join() === "c1"), t.slice(0, 300));
  ok(`${label}: 책장 작게(이름·권수)`, await page.evaluate(() => { const s = document.querySelector('[data-shelf="fA"]'); return !!s && /내 폴더/.test(s.textContent) && /1/.test(s.querySelector("small").textContent); }));
  ok(`${label}: 겹침 표시`, await page.evaluate(() => document.querySelector('[data-id="c1"] .el-tag')?.textContent === "2"));
  // 책 펼치기
  const c = await center(page, '.el-case [data-id="c1"]');
  await page.mouse.click(c[0], c[1]); await wait(page, 1000);
  t = await page.evaluate(() => document.querySelector(".el-ov")?.innerText ?? "");
  ok(`${label}: 책이 펼쳐짐(이름·장르·쉬운 로어북)`, /시로코/.test(t) && /블루 아카이브/.test(t) && /쉬운 로어북/.test(t) && /마리/.test(t) && /히마리/.test(t) && /유리/.test(t), t.slice(0, 300));
  ok(`${label}: 표지 넘김`, await page.evaluate(() => document.querySelector(".el-bk").classList.contains("el-opened")));
  ok(`${label}: 쪽 비율 2:3`, await page.evaluate(() => { const s = document.querySelector(".el-stage"); const pw = parseFloat(s.style.getPropertyValue("--pw")), ph = parseFloat(s.style.getPropertyValue("--ph")); return Math.abs(ph / pw - 1.5) < 0.01; }));
  ok(`${label}: 인물 아닌 겹침은 접어 둠`, /인물이 아닌 겹침 2개/.test(t) && await page.evaluate(() => /하늘정원/.test(document.querySelector(".el-ov details.el-more2")?.textContent ?? "")), t.slice(0, 500));
  ok(`${label}: 토글은 봇 쪽 아래`, await page.evaluate(() => { const sw = document.querySelector(".el-ov [role=switch]"); return !!sw && sw.getAttribute("aria-checked") === "false" && !!sw.closest(".el-in")?.querySelector(".el-frame"); }));
  await page.evaluate(() => document.querySelector(".el-ov [role=switch]").click()); await wait(page, 900);
  const lore = await page.evaluate(() => window.__elDb.characters[0].globalLore.map((e) => [e.comment, !!e.extentions?.da_rule?.whole]));
  ok(`${label}: 막기 — 마리·유리만`, JSON.stringify(lore) === JSON.stringify([["마리", true], ["히마리", false], ["유리", true], ["대성당", false], ["하늘정원", false]]), JSON.stringify(lore));
  t = await page.evaluate(() => document.querySelector(".el-ov")?.innerText ?? "");
  ok(`${label}: 쪽 갱신(막는 중)`, /2개 항목을 고쳤어요/.test(t) && /막는 중 · 마리, 유리/.test(t) && await page.evaluate(() => document.querySelector(".el-ov [role=switch]").getAttribute("aria-checked") === "true"), t.slice(0, 400));
  await page.keyboard.press("Escape"); await wait(page, 400);
  ok(`${label}: 닫으면 책에 ✓`, await page.evaluate(() => !document.querySelector(".el-ov") && document.querySelector('[data-id="c1"] .el-tag')?.textContent === "✓"));
  // 일괄 토글: 모두 막는 중 → 끄면 원래대로 → 다시 켜기
  ok(`${label}: 일괄 토글 켜짐 표시`, await page.evaluate(() => document.querySelector(".el-bulk")?.getAttribute("aria-checked") === "true"));
  await page.evaluate(() => document.querySelector(".el-bulk").click()); await wait(page, 900);
  ok(`${label}: 일괄 끄기 → 원래대로`, await page.evaluate(() => window.__elDb.characters[0].globalLore.every((e) => !e.extentions?.da_rule) && document.querySelector(".el-bulk").getAttribute("aria-checked") === "false"));
  await page.evaluate(() => document.querySelector(".el-bulk").click()); await wait(page, 900);
  ok(`${label}: 일괄 켜기`, await page.evaluate(() => window.__elDb.characters[0].globalLore.filter((e) => e.extentions?.da_rule).length === 2));
  // 끌어서 꽂기
  ok(`${label}: 끌 때 책장이 반응`, await drag(page, '.el-case [data-id="c1"]', '[data-shelf="fA"]'));
  let order = await page.evaluate(() => window.__elDb.characterOrder);
  ok(`${label}: 책장에 꽂힘`, order.find((x) => x.id === "fA")?.data.join() === "c2,c1" && !order.includes("c1"), JSON.stringify(order));
  ok(`${label}: 분류 안 된 책이 없으면 그 칸은 숨고 첫 책장이 보임`, await page.evaluate(() => getComputedStyle(document.querySelector("[data-desk]")).display === "none" && document.querySelector(".el-case").dataset.view === "fA" && document.querySelector('[data-shelf="fA"] small').textContent === "2"));
  // 책장 펼쳐서 책상으로 꺼내기
  ok(`${label}: 책장 고르면 아래에 크게`, await page.evaluate(() => document.querySelectorAll('.el-case[data-view="fA"] .el-book').length === 2));
  await drag(page, '.el-case [data-id="c2"]', "[data-desk]");
  order = await page.evaluate(() => window.__elDb.characterOrder);
  ok(`${label}: 책상으로 꺼냄`, order.includes("c2") && order.find((x) => x.id === "fA")?.data.join() === "c1", JSON.stringify(order));
  // 새 책장 → 다른 책장으로 옮기기
  await page.evaluate(() => document.querySelector(".el-add").click()); await wait(page, 400);
  ok(`${label}: 새 책장 이름 묻기`, await page.evaluate(() => !!document.querySelector("[aria-label='새 책장'] input")));
  await page.fill("[aria-label='새 책장'] input", "판타지"); await page.keyboard.press("Enter"); await wait(page, 700);
  const fid = await page.evaluate(() => window.__elDb.characterOrder.find((x) => x.name === "판타지")?.id);
  ok(`${label}: 새 책장`, !!fid);
  await drag(page, '.el-case [data-id="c1"]', `[data-shelf="${fid}"]`);
  order = await page.evaluate(() => window.__elDb.characterOrder);
  ok(`${label}: 책장 → 책장`, order.find((x) => x.id === fid)?.data.join() === "c1" && order.find((x) => x.id === "fA")?.data.length === 0, JSON.stringify(order));
  // 자동 정리
  await page.evaluate(() => [...document.querySelectorAll(".el-bar button")].find((b) => b.textContent.trim() === "자동 정리").click()); await wait(page, 400);
  t = await page.evaluate(() => document.querySelector("[aria-label='자동 정리']")?.innerText ?? "");
  ok(`${label}: 자동 정리 제안`, /📚 판타지 \(1\)/.test(t) && /호시노/.test(t), t.slice(0, 300));
  await page.evaluate(() => [...document.querySelectorAll("[aria-label='자동 정리'] button")].find((b) => /이대로 정리/.test(b.textContent)).click()); await wait(page, 800);
  order = await page.evaluate(() => window.__elDb.characterOrder);
  ok(`${label}: 같은 이름 책장에 꽂음`, order.find((x) => x.id === fid)?.data.join() === "c1,c2", JSON.stringify(order));
  // 캐시: 다른 화면 갔다 오면 봇을 다시 읽지 않는다
  await page.evaluate(() => { window.__elReads = 0; window.__app.ctx.go("home"); }); await wait(page, 400);
  await page.evaluate(() => window.__app.ctx.go("easylore")); await wait(page, 900);
  ok(`${label}: 다시 열 때 봇 안 읽음(캐시)`, await page.evaluate(() => window.__elReads === 0 && document.querySelectorAll(".el-book").length >= 0 && /책 2권/.test(document.querySelector(".el-stat").textContent)), await page.evaluate(() => window.__elReads));
  // 찾기
  await page.evaluate(() => document.querySelector('[data-shelf="' + window.__elDb.characterOrder.find((x) => x.name === "판타지").id + '"]').click()); await wait(page, 300);
  await page.fill(".el-search", "호시"); await wait(page, 300);
  ok(`${label}: 이름 찾기`, await page.evaluate(() => [...document.querySelectorAll(".el-case .el-book")].map((b) => b.dataset.id).join() === "c2" && document.activeElement?.classList.contains("el-search")));
  await page.fill(".el-search", ""); await wait(page, 200);
  // 펼친 책 → 캐릭터 탭으로
  await page.evaluate(() => document.querySelector(".el-case .el-book")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))); await wait(page, 700);
  ok(`${label}: 토글 아래 캐릭터 탭 버튼`, await page.evaluate(() => !!document.querySelector(".el-ov .el-sw + .el-go")));
  // 칩: 인물 아님 → 인물로 고치면 위 목록으로 올라가고, 다시 누르면 자동으로
  await page.evaluate(() => [...document.querySelectorAll(".el-ov details.el-more2 .el-hit")].find((x) => /대성당/.test(x.textContent))?.querySelector(".el-kc")?.click()); await wait(page, 800);
  ok(`${label}: 칩으로 인물로 고침`, await page.evaluate(() => { const d = document.querySelector(".el-ov details.el-more2"); const main = [...document.querySelectorAll(".el-ov .el-hit")].filter((x) => !x.closest("details")); return main.some((x) => /대성당/.test(x.textContent)) && !(d?.textContent ?? "").includes("대성당"); }));
  await page.evaluate(() => [...document.querySelectorAll(".el-ov .el-hit")].find((x) => /대성당/.test(x.textContent))?.querySelector(".el-kc[aria-pressed=true]")?.click()); await wait(page, 800);
  ok(`${label}: 다시 누르면 자동 판별로`, await page.evaluate(() => (document.querySelector(".el-ov details.el-more2")?.textContent ?? "").includes("대성당")));
  // 너무 자주 켜지는 항목 → 덜 켜지게
  ok(`${label}: 자주 켜지는 항목 안내`, await page.evaluate(() => /너무 자주 켜지는 항목/.test(document.querySelector(".el-ov").innerText) && /대성당/.test(document.querySelector(".el-ov .el-busy")?.textContent ?? "") && /10개 중 8번/.test(document.querySelector(".el-ov .el-busy").textContent)));
  await page.evaluate(() => document.querySelector(".el-ov .el-busy .el-calm").click()); await wait(page, 900);
  ok(`${label}: 덜 켜지게 → 방금 메시지만·이름 경계`, await page.evaluate(() => { const e = window.__elDb.characters[0].globalLore.find((x) => x.comment === "대성당"); return e.extentions?.da_rule?.scan === 1 && e.extentions.da_rule.whole === true && !document.querySelector(".el-ov .el-busy"); }));
  const goId = await page.evaluate(() => document.querySelector(".el-case .el-book").dataset.id);
  await page.evaluate(() => document.querySelector(".el-ov .el-go").click()); await wait(page, 700);
  ok(`${label}: 캐릭터 탭으로 가고 그 봇이 골라짐`, await page.evaluate((id) => window.__app.ctx.state.tab === "characters" && window.__app.ctx.state.charSel === id && !document.querySelector(".el-ov"), goId), await page.evaluate(() => window.__app.ctx.state.tab));
  await page.evaluate(() => window.__app.ctx.go("easylore")); await wait(page, 700);
  const over = await page.evaluate(() => { const m = document.querySelector(".rb-main"); const R = m.getBoundingClientRect().right + 1; return [...m.querySelectorAll(".el-wrap *")].filter((e) => !e.closest(".el-shelves") && e.getBoundingClientRect().right > R).map((e) => e.className).slice(0, 3); });
  ok(`${label}: 가로로 넘치지 않음`, !over.length, over.join(","));
  if (shot) {
    await page.evaluate(() => document.querySelector('[data-shelf]')?.click()); await wait(page, 400);
    await page.screenshot({ path: `${shot}-${label === "PC" ? "pc" : "mobile"}.png` });
    const b = await center(page, ".el-book"); if (b) { await page.mouse.click(b[0], b[1]); await wait(page, 1100); await page.screenshot({ path: `${shot}-${label === "PC" ? "pc" : "mobile"}-open.png` }); }
  }
  ok(`${label}: 오류 없음`, !errs.length, errs.join(";"));
  await page.close();
}
await browser.close();
console.log(out.every(Boolean) ? "모두 통과" : `${out.filter((x) => !x).length}개 실패`);
process.exitCode = out.every(Boolean) ? 0 : 1;
