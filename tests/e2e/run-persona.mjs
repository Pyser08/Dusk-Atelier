// 페르소나 빌더 입력칸 시험 (실제 키 입력으로 확인). 클라우드 샌드박스: /opt/npm-tools, /opt/pw-browsers
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/persona.entry.js"], bundle: true, write: false, format: "iife", globalName: "T", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + '/src/vendor/fflate.js' } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const mobile of [false, true]) {
  const page = await (mobile ? browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true }).then((c) => c.newPage()) : browser.newPage());
  const logs = []; page.on("pageerror", (e) => logs.push(e.message));
  await page.setContent("<!doctype html><body></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  const has = await page.evaluate(() => T.setup()); const tag = mobile ? "모바일" : "PC";
  ok(`[${tag}] 화면 렌더`, has);
  const inp = page.locator("input[aria-label='AI 수정 요청']");
  await inp.scrollIntoViewIfNeeded(); await inp.click();
  await page.keyboard.type("make it colder");
  ok(`[${tag}] 영문 입력`, (await inp.inputValue()) === "make it colder", await inp.inputValue());
  await page.keyboard.press("Backspace"); await page.keyboard.press("Backspace");
  ok(`[${tag}] 백스페이스`, (await inp.inputValue()) === "make it cold", await inp.inputValue());
  await page.keyboard.press("Control+a"); await page.keyboard.press("Delete");
  ok(`[${tag}] 전체 선택 후 지우기`, (await inp.inputValue()) === "", await inp.inputValue());
  await page.keyboard.insertText("더 냉소적으로");
  ok(`[${tag}] 한글 입력`, (await inp.inputValue()) === "더 냉소적으로");
  ok(`[${tag}] 오류 없음`, !logs.length, logs.join(";"));
  await page.close();
}
await browser.close(); process.exit(out.every(Boolean) ? 0 : 1);
