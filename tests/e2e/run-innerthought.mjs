// 인물 속마음 보기 애드온: 빠른 설정 줄·설정 창(최소/최대) → 요청 안내 → 화면 생각 풍선 + 감정 이미지 → 상태창 ‘속마음’ 탭 모음
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const SHOTS = process.env.SHOTS;
for (const [tag, vp] of [["PC", { width: 1280, height: 860 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99 }) }, { host: true, innerthought: true }));
  await page.evaluate(async () => {
    const bot = { chaId: "c1", name: "시로코", emotionImages: [["shy", "x"], ["happy", "y"]], additionalAssets: [["시로코_angry", "z"]],
      chats: [{ message: [{ role: "char", data: '시로코가 웃었다.\n<dusk-thought name="시로코" emo="기쁨">오늘은 좋은 날이야.</dusk-thought>' }, { role: "user", data: "안녕" }, { role: "char", data: '<dusk-thought name="시로코" emo="부끄러움">들킨 건 아니겠지</dusk-thought>' }] }] };
    __api.getCharacterFromIndex = async () => structuredClone(bot); __api.getChatFromIndex = async () => structuredClone(bot.chats[0]);
    const db0 = __api.getDatabase; __api.getDatabase = async (k) => ({ ...(await db0(k)), modules: [{ id: "mod1", name: "호시노 모듈", assets: [["Hoshino_smile", "p"], ["Hoshino_cry", "q"]] }], enabledModules: ["mod1"] });
    __api.getCurrentCharacterIndex = async () => 0; __api.getCurrentChatIndex = async () => 0;
  });
  await page.waitForTimeout(3300);   // 캐릭터 읽기 짧은 캐시(3초)가 지나야 바꾼 봇을 읽는다
  await page.evaluate(() => __app.ctx.ext.get("svc", "innerthought").refresh());
  await page.evaluate(() => __app.ctx.go("home")); await page.waitForTimeout(500);
  const row = page.locator("#rb-qs-innerthought");
  ok(`[${tag}] 홈 빠른 설정에 ‘인물 속마음 보기’ 줄(꺼짐)`, (await row.count()) === 1 && /꺼짐/.test(await row.textContent()));
  await row.scrollIntoViewIfNeeded(); await row.click(); await page.waitForTimeout(300);
  const dlg = page.locator(".rb-it-set").last();
  await dlg.locator("[role=switch]").first().click();
  await dlg.locator("[aria-label='인물당 최대 늘리기']").click(); await page.waitForTimeout(150);
  const st = await page.evaluate(() => __app.ctx.ext.get("svc", "innerthought").settings());
  ok(`[${tag}] 설정 창: 켜기·최대 2 저장`, st.on && st.max === 2 && st.min === 0, JSON.stringify(st));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/it-${tag}-settings.png` });
  await page.keyboard.press("Escape").catch(() => {});
  const req = await page.evaluate(() => __host.request([{ role: "system", content: "sys" }, { role: "assistant", content: 'a <dusk-thought name="시로코" emo="기쁨">옛 생각</dusk-thought> b' }, { role: "user", content: "다음" }]));
  const hint = req.find((m) => String(m.content).startsWith("[Dusk 속마음]"));
  ok(`[${tag}] 요청: 마지막 유저 글 앞에 안내(0~2번·인물별 실제 이미지 목록, 모듈 포함)`, !!hint && /0~2번/.test(hint.content) && /Hoshino_smile/.test(hint.content) && /시로코_angry/.test(hint.content) && /행동이나 대사 바로 뒤/.test(hint.content) && req.at(-1).content === "다음", JSON.stringify(req).slice(0, 400));
  ok(`[${tag}] 요청: 지난 속마음 태그는 뺌`, !JSON.stringify(req).includes("옛 생각"));
  const shown = await page.evaluate(() => __host.display('시로코가 고개를 돌렸다.\n<dusk-thought name="시로코" emo="부끄러움">들킨 건 아니겠지</dusk-thought>'));
  ok(`[${tag}] 화면: 그 행동 끝에 💭 아이콘, 안에 반투명 생각 풍선 + 감정 이미지({{emotion::shy}})`, /돌렸다\. <details x-dusk="thoughts"[^>]*><summary[^>]*>💭/.test(shown) && /data-dusk="thought"/.test(shown) && /\{\{emotion::shy\}\}/.test(shown) && /rgba\(255,255,255,\.10\)/.test(shown) && !shown.includes("<dusk-thought"), shown.slice(0, 300));
  const angry = await page.evaluate(() => __host.display('<dusk-thought name="시로코" emo="화남">짜증나</dusk-thought>'));
  ok(`[${tag}] 에셋 이미지는 봇 출력 방식(기본 <img="">)`, /<img="시로코_angry">/.test(angry), angry.slice(0, 200));
  const hos = await page.evaluate(() => __host.display('"괜찮아." 호시노가 웃었다. <dusk-thought name="호시노" emo="슬픔" img="hoshino cry">사실 안 괜찮아</dusk-thought> 그리고 걸어갔다.'));
  ok(`[${tag}] 모델이 고른 img=(대충 쓴 이름) → 모듈 실제 이미지 <img="Hoshino_cry">, 그 대사 끝에`, /웃었다\. <details[\s\S]*<img="Hoshino_cry">[\s\S]*<\/details> 그리고 걸어갔다/.test(hos), hos.slice(0, 300));
  // 풍선 모양 그려 보기
  await page.evaluate((h) => { const d = document.createElement("div"); d.id = "it-demo"; d.style.cssText = "position:fixed;left:0;top:0;right:0;padding:24px;background:linear-gradient(135deg,#2b2540,#4a3a6a);color:#eee;z-index:99999"; d.innerHTML = h.replace(/\{\{emotion::shy\}\}/, '<span style="display:block;width:72px;height:90px;background:#c9a7e8"></span>'); document.body.appendChild(d); }, shown);
  ok(`[${tag}] 처음엔 접혀 있음(풍선 안 보임)`, await page.evaluate(() => { const b = document.querySelector("#it-demo [data-dusk=thought]"); return !document.querySelector("#it-demo details").open && !b.checkVisibility(); }));
  if (SHOTS) await page.locator("#it-demo").screenshot({ path: `${SHOTS}/it-${tag}-icon.png` });
  await page.click("#it-demo summary");
  const box = await page.evaluate(() => { const b = document.querySelector("#it-demo [data-dusk=thought]"); const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, bg: getComputedStyle(b).backgroundColor }; });
  ok(`[${tag}] 풍선이 화면 폭 안에, 반투명 바탕`, box.w > 100 && box.w <= vp.width && /rgba\(255, 255, 255, 0\.1\)/.test(box.bg), JSON.stringify(box));
  if (SHOTS) await page.locator("#it-demo").screenshot({ path: `${SHOTS}/it-${tag}-bubble.png` });
  await page.evaluate(() => document.getElementById("it-demo").remove());
  const tab = await page.evaluate(() => __app.ctx.ext.get("svc", "innerthought").tabFor(["Shiroko", "시로코"]));
  ok(`[${tag}] 상태창 탭 내용: 인물 속마음 모음(최근 것이 위)`, tab.includes("들킨 건") && tab.indexOf("들킨 건") < tab.indexOf("좋은 날"), tab.slice(0, 200));
  ok(`[${tag}] 오류 없음`, !errs.length, errs.join(" | "));
}
await browser.close();
const n = out.filter(Boolean).length; console.log(`${n}/${out.length} 통과`); process.exit(n === out.length ? 0 : 1);
