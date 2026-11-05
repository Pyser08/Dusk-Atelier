// 애드온 로더 시험: 리스 플러그인 iframe과 같은 sandbox·CSP(eval 금지)에서 실제 addons/dist 파일을 import(blob:)로 켠다.
import { createRequire } from "node:module";
import fs from "node:fs";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/addonloader.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error" });
const manifest = fs.readFileSync("addons/addons.json", "utf8");
const files = Object.fromEntries(JSON.parse(manifest).addons.map((a) => [a.url, fs.readFileSync(`addons/dist/${a.id}.js`, "utf8")]));
const nonce = "n0nce" + Math.random().toString(36).slice(2);
const csp = `connect-src 'none'; script-src 'nonce-${nonce}' 'wasm-unsafe-eval'; frame-src 'none'; object-src 'none'; style-src * 'unsafe-inline'; default-src 'none'; img-src * data: blob:; font-src * data: blob:; media-src * data: blob:; base-uri 'none';`;
const code = r.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}" id="csp-meta"></head><body><script nonce="${nonce}">document.querySelector('meta#csp-meta')?.remove();(async()=>{${code}\nwindow.addEventListener('message', async (e) => { if (e.data?.go) parent.postMessage({ res: await window.runAddonLoader(e.data.go) }, '*'); }); parent.postMessage({ ready: 1 }, '*');})();</script></body></html>`;
const browser = await chromium.launch(), page = await browser.newPage();
await page.setContent("<body></body>");
const res = await page.evaluate(({ srcdoc, csp, go }) => new Promise((ok) => {
  const f = document.createElement("iframe"); ["allow-scripts", "allow-modals", "allow-downloads"].forEach((s) => f.sandbox.add(s)); f.setAttribute("csp", csp);
  addEventListener("message", (e) => { if (e.data?.ready) f.contentWindow.postMessage({ go }, "*"); if (e.data?.res) ok(e.data.res); });
  document.body.appendChild(f); f.srcdoc = srcdoc; setTimeout(() => ok({ timeout: true }), 10000);
}), { srcdoc, csp, go: { manifest, files } });
const checks = [["CSP가 eval을 막는 환경(리스와 같음)", res.evalBlocked], ["받기 → import(blob:)로 켜짐", res.installed, res.err], ["애드온이 같은 api로 버튼 등록", res.button], ["nativeFetch는 GET으로", res.getMethod], ["끄면 정리(버튼 해제)", res.unreg], ["다시 시작하면 저장본으로 켜짐", res.rebooted]];
for (const [n, c, x] of checks) console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + (x ?? JSON.stringify(res))));
await browser.close(); process.exit(checks.every((c) => c[1]) ? 0 : 1);
