// (편집기 AI 창) 브라우저 연기 시험 실행기: esbuild로 묶어 Playwright(Chromium)에서 돌린다. (클라우드 샌드박스: /opt/npm-tools, /opt/pw-browsers)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/editor-ai.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + '/src/vendor/fflate.js' } });
const browser = await chromium.launch(), page = await browser.newPage();
const logs = []; page.on("pageerror", (e) => logs.push("pageerror: " + e.message)); page.on("console", (m) => m.type() === "error" && logs.push("console: " + m.text()));
await page.setContent("<!doctype html><body></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
const res = await page.evaluate(() => window.runSmoke());
for (const x of res) console.log((x.ok ? "✔" : "✘") + " " + x.name + (x.ok ? "" : "  → " + x.extra));
if (logs.length) console.log(logs.join("\n"));
await browser.close(); process.exit(res.every((x) => x.ok) && !logs.length ? 0 : 1);
