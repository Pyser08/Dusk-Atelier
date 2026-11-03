import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LAUNCHER = path.resolve("server/dusk-start.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = () => 20000 + Math.floor(Math.random() * 20000);

// 가짜 리스: server/node/server.cjs 자리에 두고, 작업 폴더를 파일로 남긴 뒤 계속 돈다
function fakeRisu() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "risu-"));
  fs.mkdirSync(path.join(root, "server", "node"), { recursive: true });
  fs.writeFileSync(path.join(root, "server", "node", "server.cjs"),
    `require("fs").writeFileSync("cwd.txt", process.cwd() + "|" + process.argv.slice(2).join(","));
     process.on("SIGTERM", () => process.exit(0));
     if (process.argv.includes("--die")) setTimeout(() => process.exit(3), 1500); else setInterval(() => {}, 1000);`);
  return root;
}
async function health(p, token) {
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`http://127.0.0.1:${p}/dusk/health`, { headers: token ? { authorization: `Bearer ${token}` } : {} }); return await r.json(); } catch { await sleep(100); }
  }
  throw new Error("Dusk 서버가 안 떴어요");
}
const exited = (child) => new Promise((r) => child.on("exit", (code) => r(code)));

test("리스와 Dusk 서버가 함께 켜지고, 리스 폴더에서 리스를 돌린다", async () => {
  const root = fakeRisu(), p = port();
  const data = path.join(root, "dusk-data");
  const ch = spawn(process.execPath, [LAUNCHER, "--risu", path.join(root, "server/node/server.cjs"), "--dusk-port", String(p), "--data-dir", data, "--", "--port", "6001"], { stdio: "ignore" });
  try {
    const h = await health(p);
    assert.equal(h.ok, true); assert.equal(h.auth, false);
    const token = fs.readFileSync(path.join(data, "token.txt"), "utf8").trim();
    assert.equal((await health(p, token)).auth, true);
    const r = await fetch(`http://127.0.0.1:${p}/dusk/x`);
    assert.equal(r.status, 401);
    assert.equal(fs.readFileSync(path.join(root, "cwd.txt"), "utf8"), `${fs.realpathSync(root)}|--port,6001`);
  } finally { ch.kill("SIGTERM"); await exited(ch); }
});

test("리스가 꺼지면 Dusk도 꺼지고 같은 종료 코드로 끝난다", async () => {
  const root = fakeRisu(), p = port();
  const ch = spawn(process.execPath, [LAUNCHER, "--risu", path.join(root, "server/node/server.cjs"), "--dusk-port", String(p), "--data-dir", path.join(root, "d"), "--", "--die"], { stdio: "ignore" });
  await health(p);
  assert.equal(await exited(ch), 3);
  await sleep(200);
  await assert.rejects(fetch(`http://127.0.0.1:${p}/dusk/health`));
});

test("리스 시작 파일이 없으면 알려 주고 끝난다", async () => {
  const ch = spawn(process.execPath, [LAUNCHER, "--risu", "/없는/경로/server.cjs"], { stdio: "ignore" });
  assert.equal(await exited(ch), 66);
});
