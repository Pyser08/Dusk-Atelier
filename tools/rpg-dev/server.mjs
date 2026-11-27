// Dusk Saga 실시간 미리보기: node tools/rpg-dev/server.mjs [포트=5180] (127.0.0.1 전용, 앞단은 nginx)
import { context } from "esbuild";
import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, watch } from "node:fs";
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
const ctx = await context({ entryPoints: [here + "app.js", here + "app3d.js", here + "pack3d.js", here + "pick3d.js", here + "vox.js", here + "wearview.js", here + "bagdev.js", here + "armorydev.js"], outdir: "/out", minify: true, bundle: true, format: "esm", write: false, logLevel: "silent",
  plugins: [{ name: "live", setup(b) { b.onEnd((r) => { err = r.errors.map((e) => e.text + " " + (e.location?.file ?? "") + ":" + (e.location?.line ?? "")).join("\n"); if (!err) js = Object.fromEntries(r.outputFiles.map((f) => ["/" + f.path.split("/").pop(), f.text])); ping(); }); } }] });
await ctx.watch();
watch(here, (_, f) => { if (f === "style.css") ping(); });
const page = (mode) => `<!doctype html><html lang=ko><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Dusk Saga 미리보기</title><link rel=stylesheet href=/font/noto-sans-kr/900.css><link rel=stylesheet href=/font/noto-sans-kr/500.css><link rel=stylesheet href=/font/noto-sans-kr/700.css><link rel=stylesheet href=/font/noto-serif-kr/500.css><link rel=stylesheet href=/font/noto-serif-kr/700.css><link rel=stylesheet href=/style.css><body data-mode=${mode}><div id=app></div><script type=module src=/${mode === "3d" || mode === "fx" ? "app3d" : "app"}.js></script><script>new EventSource("/live").onmessage=()=>location.reload()</script>`;
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
  if (p === "/fx") return send("text/html", page("fx"));
  if (p === "/chat") return send("text/html", readFileSync(here + "chat.html"));
  if (p === "/vox") return send("text/html", readFileSync(here + "vox.html"));
  if (p === "/wear") return send("text/html", `<!doctype html><html lang=ko><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>옷 파츠</title><link rel=stylesheet href=/font/noto-sans-kr/500.css><link rel=stylesheet href=/font/noto-sans-kr/700.css><style>*{box-sizing:border-box}body{margin:0;height:100dvh;display:flex;background:#16141a;color:#ece6da;font:500 13px "Noto Sans KR",sans-serif}#v{flex:1;min-width:0;touch-action:none}canvas{display:block}#p{width:360px;overflow:auto;padding:12px;background:#1e1b24;border-left:1px solid #ffffff14}.row{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-bottom:10px}.row b,.slot b{width:100%;font-size:12px;color:#a69e8f}.slot{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 0;border-top:1px solid #ffffff10}select,button{font:inherit;color:#ece6da;background:#2a2633;border:0;border-radius:8px;min-height:34px;padding:0 10px}select{flex:1}button.on{background:#c6ad7833;box-shadow:inset 0 0 0 1px #c6ad78}label{display:flex;align-items:center;gap:4px;font-size:11px;color:#a69e8f}input[type=color]{width:30px;height:26px;border:0;background:none;padding:0}#err{position:fixed;left:10px;top:10px;color:#ff8a7a}@media(max-width:700px){body{flex-direction:column}#v{flex:0 0 52vh}#p{width:auto;flex:1;border:0}}</style><div id=v></div><div id=p></div><div id=err></div><script type=module src=/wearview.js></script>`);
  if (p === "/pick") return send("text/html", readFileSync(here + "pick.html"));
  if (p === "/pack") return send("text/html", readFileSync(here + "pack.html"));
  const as = /^\/assets\/([\w.-]+)$/.exec(p);
  if (as) { try { const b = readFileSync(here + "assets/" + as[1]); r.writeHead(200, { "content-type": as[1].endsWith("webp") ? "image/webp" : as[1].endsWith("json") ? "application/json" : "model/gltf-binary", "cache-control": "max-age=600" }); return r.end(b); } catch { return send("text/plain", "없음", 404); } }
  if (p === "/cutscene") return send("text/html", page("cutscene"));
  if (p === "/compare") return send("text/html", compare);
  const font = /^\/font\/(noto-sans-kr|black-han-sans|noto-serif-kr)\/((?:files\/)?[\w.-]+)$/.exec(p);
  if (font) { try { const b = readFileSync(here + "node_modules/@fontsource/" + font[1] + "/" + font[2]); r.writeHead(200, { "content-type": p.endsWith(".css") ? "text/css" : "font/woff2", "cache-control": "max-age=86400" }); return r.end(b); } catch { return send("text/plain", "없음", 404); } }
  if (p === "/style.css") return send("text/css", readFileSync(here + "style.css"));
  if (p === "/addon") { const f = here + "../../test-addons/rpg-test.dka"; if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "application/octet-stream", "content-disposition": "attachment; filename=rpg-test-0.1.0.dka", "cache-control": "no-store" }); return r.end(readFileSync(f)); }
  if (p === "/armory") return send("text/html", `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><style>body{margin:0;background:#1a1420;color:#eee;font:12px sans-serif}#g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:6px}.c{text-align:center}.v{height:260px;background:radial-gradient(ellipse at 50% 85%,#4a3a5a,#1e1824 70%);border-radius:8px}</style><div id=g></div><script type=module src="/armorydev.js"></script>`);
  const sh = /^\/shots\/([\w-]+\.png)$/.exec(p); if (sh) { try { const b = readFileSync("/home/ubuntu/dusk-rpg/tools/rpg-dev/shots/" + sh[1]); r.writeHead(200, { "content-type": "image/png" }); return r.end(b); } catch { r.writeHead(404); return r.end(); } }
  if (p === "/shots") { const l = existsSync("/home/ubuntu/dusk-rpg/tools/rpg-dev/shots") ? readdirSync("/home/ubuntu/dusk-rpg/tools/rpg-dev/shots").filter((f) => f.endsWith(".png")) : []; return send("text/html", `<meta name=viewport content="width=device-width"><body style="background:#111;color:#ddd;font-family:sans-serif">${l.map((f) => `<p>${f}<br><a href="/shots/${f}" download><img src="/shots/${f}" style="max-width:100%;max-height:70vh"></a></p>`).join("")}</body>`); }
  if (p === "/bag") return send("text/html", `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href="/bag.css"><body style="margin:0"><div id=bag style="position:fixed;inset:0"></div><script type=module src="/bagdev.js"></script>`);
  if (p === "/bag.css") return send("text/css", readFileSync(here + "bag.css"));
  if (p === "/armorydev.js" || p === "/bagdev.js" || p === "/app.js" || p === "/app3d.js" || p === "/pack3d.js" || p === "/pick3d.js" || p === "/vox.js" || p === "/wearview.js") return send("text/javascript", err ? `document.body.innerText=${JSON.stringify("빌드 오류\n" + err)}` : js[p] ?? "");
  send("text/plain", "없음", 404);
}).listen(port, "127.0.0.1", () => console.log("Dusk Saga preview " + port));
setInterval(() => { for (const r of clients) r.write(": .\n\n"); }, 25000);
