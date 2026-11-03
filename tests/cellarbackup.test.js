import { test } from "node:test";
import assert from "node:assert/strict";
import { createCellarBackups } from "../src/data/cellarbackup.js";

const res = (status, body) => ({ status, json: async () => body });
test("목록·시작·복원 요청: POST JSON, 복원 뒤 health가 돌아올 때까지 기다린다", async () => {
  const calls = []; let down = 0;
  const api = { nativeFetch: async (u, o) => {
    calls.push([o.method, new URL(u).pathname, o.body]);
    if (u.endsWith("/cellar/health")) return down-- > 0 ? res(502, {}) : res(200, { name: "dusk-cellar", version: "0.1.0" });
    if (o.method === "GET") return res(200, { ok: true, items: [{ id: "20261103-010000", files: 3 }], job: null });
    const b = JSON.parse(o.body);
    return res(200, b.action === "restore" ? { ok: true, restarting: true } : { ok: true, job: { done: 0 } });
  } };
  const bk = createCellarBackups(api, { url: "http://c", via: "native" }, { sleep: async () => {} });
  assert.equal((await bk.list()).items.length, 1);
  await bk.create("수동");
  assert.deepEqual(JSON.parse(calls[1][2]), { action: "create", label: "수동" });
  down = 2; const waits = [];
  assert.equal(await bk.restore("20261103-010000", { onWait: (i) => waits.push(i) }), true);
  assert.deepEqual(waits, [0, 1, 2]);
  assert.deepEqual(JSON.parse(calls[2][2]), { action: "restore", id: "20261103-010000" });
});

test("서버가 거절하면 그 이유로 실패", async () => {
  const api = { nativeFetch: async () => res(409, { ok: false, error: "백업이 끝난 뒤에 복원해 주세요" }) };
  const bk = createCellarBackups(api, { url: "http://c" }, { sleep: async () => {} });
  await assert.rejects(bk.restore("x"), /백업이 끝난 뒤/);
});
