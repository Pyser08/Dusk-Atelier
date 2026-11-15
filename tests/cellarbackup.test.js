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
  assert.deepEqual(JSON.parse(calls[2][2]), { action: "restore", id: "20261103-010000", wait: true }, "예약 복원으로 요청(옛 Cellar는 무시하고 바로 복원)");
});

test("서버가 거절하면 그 이유로 실패", async () => {
  const api = { nativeFetch: async () => res(409, { ok: false, error: "백업이 끝난 뒤에 복원해 주세요" }) };
  const bk = createCellarBackups(api, { url: "http://c" }, { sleep: async () => {} });
  await assert.rejects(bk.restore("x"), /백업이 끝난 뒤/);
});

test("서버가 복원 실패를 알리면 성공으로 보지 않고 이유와 함께 실패", async () => {
  const api = { nativeFetch: async (u, o) => {
    if (u.endsWith("/cellar/health")) return res(200, { name: "dusk-cellar", version: "0.1.0" });
    if (o.method === "GET") return res(200, { ok: true, items: [], job: null, restore: { id: "a", phase: "failed", error: "디스크가 부족해요" } });
    return res(200, { ok: true, restarting: true });
  } };
  const bk = createCellarBackups(api, { url: "http://c" }, { sleep: async () => {} });
  await assert.rejects(bk.restore("a"), /디스크가 부족/);
});

test("복원이 진행 중(running)이면 끝날 때까지 기다린다", async () => {
  let n = 0;
  const api = { nativeFetch: async (u, o) => {
    if (u.endsWith("/cellar/health")) return res(200, { name: "dusk-cellar", version: "0.1.0" });
    if (o.method === "GET") return res(200, { ok: true, items: [], job: null, restore: { id: "a", phase: ++n < 3 ? "running" : "done" } });
    return res(200, { ok: true, restarting: true });
  } };
  const bk = createCellarBackups(api, { url: "http://c" }, { sleep: async () => {} });
  assert.equal(await bk.restore("a"), true);
  assert.ok(n >= 3);
});

test("새 Cellar: 리스가 켜져 있으면 예약되고 바로 \"waiting\" · 예약 취소", async () => {
  const bodies = [];
  const api = { nativeFetch: async (u, o) => { bodies.push(JSON.parse(o.body ?? "{}")); const b = bodies.at(-1); return res(200, b.action === "restore" ? { ok: true, waiting: true } : { ok: true, cancelled: true }); } };
  const bk = createCellarBackups(api, { url: "http://c", via: "native" }, { sleep: async () => { throw new Error("기다리면 안 됨"); } });
  assert.equal(await bk.restore("a"), "waiting");
  assert.equal((await bk.cancel()).cancelled, true);
  assert.deepEqual(bodies.at(-1), { action: "cancel" });
});
