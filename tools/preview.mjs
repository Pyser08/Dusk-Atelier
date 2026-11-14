// 실시간 미리보기: 소스를 고치면 다시 묶어서 브라우저가 새로고침한다(e2e와 같은 가짜 호스트).
// node tools/preview.mjs [포트=5178] → http://localhost:5178/?chat=0&adv=1&light=1&tab=memory
import { context } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
import { writeFileSync, mkdirSync } from "node:fs";
const port = Number(process.argv[2] ?? 5178);
mkdirSync(".preview", { recursive: true });
writeFileSync(".preview/index.html", `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Dusk 미리보기</title><body style="margin:0;background:#111">
<script src="app.js"></script><script>
new EventSource("/esbuild").addEventListener("change", () => location.reload());
const q = new URLSearchParams(location.search), adv = q.get("adv") === "1";
const ui = { promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true, uiMode: adv ? "advanced" : "simple", theme: { mode: q.get("light") === "1" ? "light" : "dark" } };
window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify(ui) }, { memory: true, story: true, mods: true, cards: true, noChat: q.get("chat") === "0" })
  .then(() => { const t = q.get("tab"); if (t) setTimeout(() => __app.ctx.go(t), 500); });
</script>`);
const ctx = await context({ entryPoints: { app: "tests/e2e/app.entry.js" }, bundle: true, outdir: ".preview", format: "iife", platform: "browser", logLevel: "info",
  define: { __VERSION__: '"preview"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
await ctx.watch();
await ctx.serve({ servedir: ".preview", port });
console.log(`미리보기: http://localhost:${port}/  (옵션: ?chat=0 채팅 없음 · ?adv=1 고급 모드 · ?light=1 밝게 · ?tab=memory)`);
