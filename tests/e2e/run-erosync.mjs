// Erosync 기억 설정 카드: 비용 안내 · 켜기/끄기 · 원본 플러그인과 충돌 시 되돌림
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/erosync.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"0"', __CHANGELOG__: "[]" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch(), errs = [];
for (const [tag, vp] of [["PC", { width: 1280, height: 800 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><body></body>");
  await page.addScriptTag({ content: r.outputFiles[0].text });
  const sw = () => page.locator("#rb-erosync .rb-switch, #rb-erosync [role=switch]").first();
  await page.evaluate(() => { window.c = makeCase(); });
  const text = await page.evaluate(() => document.getElementById("rb-erosync").textContent);
  ok(`[${tag}] 카드·제목·기본 꺼짐 문구`, /Erosync \(NSFW 장면 강화\)/.test(text) && /기본은 꺼짐/.test(text) && (await page.locator("#rb-erosync-state").textContent()).includes("꺼짐"));
  ok(`[${tag}] 비용 안내가 보임`, /AI 호출이 늘어요/.test(text) && /토큰·요금/.test(text), text);
  ok(`[${tag}] 가로로 넘치지 않음`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await sw().click(); await page.waitForTimeout(200);
  ok(`[${tag}] 켜기 → 시작·저장`, await page.evaluate(() => c.boots.n === 1 && c.er.isRunning() && c.mem.get("dusk.erosync.on") === "on"));
  ok(`[${tag}] 켜면 상태 카드가 ‘사용 중’으로 바뀜`, (await page.locator("#rb-erosync-state").textContent()).includes("사용 중"));
  await sw().click(); await page.waitForTimeout(200);
  ok(`[${tag}] 끄기 → 정리·저장`, await page.evaluate(() => c.boots.off === 1 && !c.er.isRunning() && c.mem.get("dusk.erosync.on") === "off"));
  await page.evaluate(() => { window.c = makeCase({ original: true }); });
  await sw().click(); await page.waitForTimeout(300);
  ok(`[${tag}] 원본이 켜져 있으면 못 켜고 스위치가 꺼진 채로 돌아옴`, await page.evaluate(() => c.boots.n === 0 && c.mem.get("dusk.erosync.on") === "off" && c.toasts.some((t) => t[1])));
  await page.evaluate(() => { window.c = makeCase({ cycle: true }); });
  ok(`[${tag}] 꺼져 있으면 월경 겹침 안내는 숨김`, await page.locator("#rb-erosync-overlap").isHidden());
  await sw().click(); await page.waitForTimeout(400);
  ok(`[${tag}] Erosync를 켜고 Dusk 월경·임신 기록도 켜져 있으면 겹침 안내`, (await page.locator("#rb-erosync-overlap").isVisible()) && /두 번 들어가지 않아요/.test(await page.locator("#rb-erosync-overlap").textContent()));
  await page.evaluate(() => { window.c = makeCase({ original: true }); });
  await sw().click(); await page.waitForTimeout(300);
  ok(`[${tag}] 실패 이유가 카드에 보임`, /원래/.test(await page.locator("#rb-erosync-note").textContent()));
}
await browser.close();
if (errs.length) { console.log("페이지 오류:", errs.slice(0, 3)); out.push(false); }
console.log(out.every(Boolean) ? "\n모두 통과" : "\n실패 있음"); process.exit(out.every(Boolean) ? 0 : 1);
