#!/usr/bin/env node
// Dusk Atelier 실행기 — 리스 서버와 Dusk 서버를 한 명령으로 함께 켠다.
//
// 쓰는 법 (리스 폴더에 이 파일을 두고):
//   node dusk-start.cjs                       리스(server/node/server.cjs)와 Dusk 서버를 함께 켬
//   node dusk-start.cjs --risu 경로/server.cjs   리스 시작 파일이 다른 곳에 있을 때
//   node dusk-start.cjs --dusk-port 6011      Dusk 서버 포트(기본 6011)
//   node dusk-start.cjs --no-dusk             Dusk 없이 리스만
//   pm2 start dusk-start.cjs --name risu      pm2로 쓸 때(리스 대신 이 파일을 등록)
//   -- 뒤의 인자는 리스에 그대로 넘긴다:  node dusk-start.cjs -- --port 6001
//
// 동작:
//   · 리스를 먼저 켜고, Dusk 서버를 따로(자식 프로세스) 켠다 — 서로 오류가 번지지 않는다.
//   · 리스가 꺼지면 Dusk도 끄고 같은 종료 코드로 끝낸다(pm2가 리스 재시작을 그대로 맡는다).
//   · Dusk가 죽으면 Dusk만 다시 켠다(최대 5번, 점점 늦게). 리스는 건드리지 않는다.
//   · Ctrl+C·종료 신호는 둘 다에게 전한다.
//   · Node 기본 기능만 쓴다(npm install 불필요). 리스 파일은 읽지도 고치지도 않는다.
//   · Dusk 데이터는 이 파일 옆 dusk-data/ 에만 쓴다.
"use strict";
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");

const VERSION = "0.1.0";
const argv = process.argv.slice(2);
const dash = argv.indexOf("--");
const own = dash < 0 ? argv : argv.slice(0, dash);
const pass = dash < 0 ? [] : argv.slice(dash + 1);
const opt = (name, def) => { const i = own.indexOf(name); return i >= 0 && own[i + 1] && !own[i + 1].startsWith("--") ? own[i + 1] : def; };
const flag = (name) => own.includes(name);
const log = (...a) => console.log("[dusk]", ...a);

// ── Dusk 서버 (자식 프로세스로 실행됨) ──
if (flag("--role-server")) {
  const port = Number(opt("--dusk-port", 6011));
  const host = opt("--dusk-host", "127.0.0.1");
  const dataDir = path.resolve(opt("--data-dir", path.join(__dirname, "dusk-data")));
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const tokenFile = path.join(dataDir, "token.txt");
  let token;
  try { token = fs.readFileSync(tokenFile, "utf8").trim(); } catch { /* 처음 */ }
  if (!token) {
    token = crypto.randomBytes(24).toString("base64url");
    fs.writeFileSync(tokenFile, token + "\n", { mode: 0o600 });
    log(`접속 토큰을 만들었어요: ${tokenFile}`);
  }
  const started = Date.now();
  const send = (res, code, body) => {
    res.writeHead(code, {
      "content-type": "application/json; charset=utf-8",
      // 플러그인은 리스 페이지(다른 포트) 안에서 부르므로 열어 둔다. 실제 보호는 토큰이 맡는다.
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-private-network": "true",
    });
    res.end(JSON.stringify(body));
  };
  const authed = (req) => {
    const h = String(req.headers.authorization ?? "");
    const got = Buffer.from(h.startsWith("Bearer ") ? h.slice(7) : "");
    const want = Buffer.from(token);
    return got.length === want.length && crypto.timingSafeEqual(got, want);
  };
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      if (req.method === "OPTIONS") return send(res, 204, {});
      // 연결 확인은 토큰 없이도 된다(있는지만 알려 줌, 데이터 없음)
      if (url.pathname === "/dusk/health") return send(res, 200, { ok: true, name: "dusk-atelier-server", version: VERSION, uptime: Math.round((Date.now() - started) / 1000), auth: authed(req) });
      if (!authed(req)) return send(res, 401, { ok: false, error: "토큰이 없거나 달라요" });
      return send(res, 404, { ok: false, error: "없는 주소예요" });
    } catch (e) {
      send(res, 500, { ok: false, error: String(e?.message ?? e) });
    }
  });
  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") { log(`포트 ${port}를 이미 쓰고 있어요. --dusk-port로 다른 번호를 주세요.`); process.exit(78); }
    log("서버 오류:", e.message); process.exit(1);
  });
  server.listen(port, host, () => log(`Dusk 서버 v${VERSION} — http://${host}:${port}/dusk/health`));
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  // 부모(실행기)가 사라지면 같이 끝난다
  process.on("disconnect", stop);
  return;
}

// ── 실행기 ──
function findRisu() {
  const given = opt("--risu", process.env.DUSK_RISU_ENTRY);
  const cands = given ? [given] : [
    path.join(process.cwd(), "server", "node", "server.cjs"),
    path.join(__dirname, "server", "node", "server.cjs"),
    path.join(__dirname, "..", "server", "node", "server.cjs"),
  ];
  for (const c of cands) { const p = path.resolve(c); if (fs.existsSync(p)) return p; }
  return null;
}
const entry = findRisu();
if (!entry) {
  log("리스 시작 파일(server/node/server.cjs)을 못 찾았어요. 리스 폴더에서 실행하거나 --risu 경로를 주세요.");
  process.exit(66);
}
// 리스 폴더 = server/node/server.cjs 의 두 단계 위 (리스가 기대하는 작업 폴더)
const risuRoot = path.basename(path.dirname(entry)) === "node" && path.basename(path.dirname(path.dirname(entry))) === "server" ? path.dirname(path.dirname(path.dirname(entry))) : path.dirname(entry);

let stopping = false;
log(`리스 시작: ${path.relative(process.cwd(), entry) || entry}`);
const risu = spawn(process.execPath, [...process.execArgv, entry, ...pass], { cwd: risuRoot, stdio: "inherit", env: process.env });

let dusk = null, fails = 0, restartTimer = null;
function startDusk() {
  if (stopping || flag("--no-dusk")) return;
  const args = [__filename, "--role-server", "--dusk-port", opt("--dusk-port", "6011"), "--dusk-host", opt("--dusk-host", "127.0.0.1"), "--data-dir", opt("--data-dir", path.join(__dirname, "dusk-data"))];
  const t0 = Date.now();
  dusk = spawn(process.execPath, args, { stdio: ["ignore", "inherit", "inherit", "ipc"], env: process.env });
  dusk.on("exit", (code) => {
    dusk = null;
    if (stopping) return;
    if (code === 78) { log("Dusk 서버를 켜지 못했어요(포트 사용 중). 리스는 그대로 돌아요."); return; }
    if (Date.now() - t0 > 60_000) fails = 0;   // 1분 넘게 잘 돌았으면 실패 횟수 초기화
    if (++fails > 5) { log("Dusk 서버가 계속 꺼져서 다시 켜지 않아요. 리스는 그대로 돌아요."); return; }
    const wait = Math.min(30_000, 1000 * 2 ** (fails - 1));
    log(`Dusk 서버가 꺼졌어요(코드 ${code}). ${Math.round(wait / 1000)}초 뒤 다시 켜요.`);
    restartTimer = setTimeout(startDusk, wait);
  });
}
startDusk();

function shutdown(sig) {
  if (stopping) return;
  stopping = true;
  clearTimeout(restartTimer);
  if (dusk) dusk.kill("SIGTERM");
  if (risu.exitCode === null) risu.kill(sig);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
risu.on("exit", (code, sig) => {
  stopping = true;
  clearTimeout(restartTimer);
  if (dusk) dusk.kill("SIGTERM");
  log(`리스가 꺼졌어요(${sig ?? code}). Dusk 서버도 끕니다.`);
  setTimeout(() => process.exit(code ?? (sig ? 1 : 0)), 300);
});
risu.on("error", (e) => { log("리스를 켜지 못했어요:", e.message); shutdown("SIGTERM"); process.exit(1); });
