// 이름 클릭 → 화면 위 상태창이 실제로 뜨는지(가짜 SafeDocument)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/namecard-ov.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error" });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
for (const pid of ["doc_abc123", "a1b2-c3", "인물:시로코", "p.1"]) {
  const page = await browser.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  const res = await page.evaluate((p) => run(p), pid);
  ok(`[${pid}] 이름에 클릭이 달림`, res.hooked === 1, JSON.stringify(res));
  await page.click("text=시로코").catch(() => {}); await page.waitForTimeout(200);
  ok(`[${pid}] 누르면 상태창이 뜸`, await page.evaluate(() => !!document.querySelector('[x-dusk="card-ov"]') && document.body.textContent.includes("시로코 카드")), JSON.stringify(await page.evaluate(() => window.__log ?? [])));
  ok(`[${pid}] 오류 없음`, !errs.length, errs.join(" | "));
}
await browser.close();
const n = out.filter(Boolean).length; console.log(`${n}/${out.length} 통과`); process.exit(n === out.length ? 0 : 1);
