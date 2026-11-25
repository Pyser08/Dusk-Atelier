// Dusk Saga 실시간 미리보기: node tools/rpg-dev/server.mjs [포트=5180] (127.0.0.1 전용, 앞단은 nginx)
import { context } from "esbuild";
import { createServer } from "node:http";
import { readFileSync, watch } from "node:fs";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
// 비밀번호 한 칸 로그인: 리스바드 비밀번호 해시(sha256)와 비교만 한다. 파일이 없거나 이상하면 아무도 못 들어온다.
const PASS = process.env.RPG_PASS_FILE ?? "/home/ubuntu/RisuBard/save/__password";
const stored = () => { try { const t = readFileSync(PASS, "utf8").trim().toLowerCase(); return /^[0-9a-f]{64}$/.test(t) ? t : null; } catch { return null; } };
const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const token = (h) => createHmac("sha256", h).update("dusk-rpg-dev").digest("hex");
const authed = (q) => { const h = stored(), c = /(?:^|;\s*)rpg=([0-9a-f]{64})(?:;|$)/.exec(q.headers.cookie ?? ""); return !!h && !!c && same(c[1], token(h)); };
let fails = 0; setInterval(() => { fails = 0; }, 60000);
const loginPage = (msg) => `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Dusk Saga</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#17131f;color:#efeaf7;font:16px system-ui"><form method=post action=/login style="display:grid;gap:12px;padding:24px;width:min(320px,90vw)"><b>Dusk Saga</b><input type=password name=p placeholder=비밀번호 autofocus autocomplete=current-password style="font:inherit;padding:12px;border-radius:10px;border:0"><button style="font:inherit;padding:12px;border-radius:10px;border:0;background:#e8a05c">들어가기</button><span>${msg}</span></form>`;
const port = Number(process.argv[2] ?? 5180), here = new URL(".", import.meta.url).pathname;
let js = {}, err = ""; const clients = new Set();
const ping = () => { for (const r of clients) r.write("data: reload\n\n"); };
const ctx = await context({ entryPoints: [here + "app.js", here + "app3d.js"], outdir: "/out", minify: true, bundle: true, format: "iife", write: false, logLevel: "silent",
  plugins: [{ name: "live", setup(b) { b.onEnd((r) => { err = r.errors.map((e) => e.text + " " + (e.location?.file ?? "") + ":" + (e.location?.line ?? "")).join("\n"); if (!err) js = Object.fromEntries(r.outputFiles.map((f) => ["/" + f.path.split("/").pop(), f.text])); ping(); }); } }] });
await ctx.watch();
watch(here, (_, f) => { if (f === "style.css") ping(); });
const page = (mode) => `<!doctype html><html lang=ko><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Dusk Saga 미리보기</title><link rel=stylesheet href=/font/noto-sans-kr/900.css><link rel=stylesheet href=/font/noto-sans-kr/500.css><link rel=stylesheet href=/font/noto-sans-kr/700.css><link rel=stylesheet href=/style.css><body data-mode=${mode}><div id=app></div><script src=/${mode === "3d" ? "app3d" : "app"}.js></script><script>new EventSource("/live").onmessage=()=>location.reload()</script>`;
const compare = `<!doctype html><meta charset=utf-8><title>비교</title><body style="margin:16px;background:#111;display:flex;gap:16px"><iframe src="/?k=m" style="flex:none;width:390px;height:844px;border:0"></iframe><iframe src="/?k=d" style="flex:none;width:1280px;height:844px;border:0"></iframe>`;
createServer((q, r) => {
  const p = q.url.split("?")[0], send = (t, b, c = 200) => { r.writeHead(c, { "content-type": t + "; charset=utf-8", "cache-control": "no-store" }); r.end(b); };
  if (p === "/login" && q.method === "POST") {
    if (fails >= 10) return send("text/html", loginPage("잠시 뒤 다시 해 주세요."), 429);
    let b = ""; q.on("data", (c) => { b += c; if (b.length > 2000) q.destroy(); });
    q.on("end", () => {
      const h = stored(), d = createHash("sha256").update(new URLSearchParams(b).get("p") ?? "").digest("hex");
      if (!h || !same(d, h)) { fails++; return send("text/html", loginPage("비밀번호가 달라요."), 401); }
      r.writeHead(303, { location: "/", "set-cookie": `rpg=${token(h)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7776000` }); r.end();
    });
    return;
  }
  if (!authed(q)) return send("text/html", loginPage(""), 401);
  if (p === "/live") { r.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", "x-accel-buffering": "no" }); r.write(": ok\n\n"); clients.add(r); q.on("close", () => clients.delete(r)); return; }
  if (p === "/") return send("text/html", page("3d"));
  if (p === "/2d") return send("text/html", page("game"));
  if (p === "/3d") return send("text/html", page("3d"));
  if (p === "/cutscene") return send("text/html", page("cutscene"));
  if (p === "/compare") return send("text/html", compare);
  const font = /^\/font\/(noto-sans-kr)\/((?:files\/)?[\w.-]+)$/.exec(p);
  if (font) { try { const b = readFileSync(here + "node_modules/@fontsource/" + font[1] + "/" + font[2]); r.writeHead(200, { "content-type": p.endsWith(".css") ? "text/css" : "font/woff2", "cache-control": "max-age=86400" }); return r.end(b); } catch { return send("text/plain", "없음", 404); } }
  if (p === "/style.css") return send("text/css", readFileSync(here + "style.css"));
  if (p === "/app.js" || p === "/app3d.js") return send("text/javascript", err ? `document.body.innerText=${JSON.stringify("빌드 오류\n" + err)}` : js[p] ?? "");
  send("text/plain", "없음", 404);
}).listen(port, "127.0.0.1", () => console.log("Dusk Saga preview " + port));
setInterval(() => { for (const r of clients) r.write(": .\n\n"); }, 25000);
