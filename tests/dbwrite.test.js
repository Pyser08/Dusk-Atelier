import { test } from "node:test";
import assert from "node:assert/strict";
import { createDbWriteGuard, isDbWriteError } from "../src/data/dbwrite.js";

const mkHost = (over = {}) => {
  const log = [];
  return { log, requestPluginPermission: async (p) => { log.push("ask:" + p); return false; }, ...over };
};

test("asks dbWrite once before the first write and ignores a false answer", async () => {
  const host = mkHost();
  const g = createDbWriteGuard(host, { log: () => {} });
  const w = g.wrapWrite("setCharacterToIndex", async (i) => { host.log.push("w" + i); return "ok"; });
  assert.equal(await w(1), "ok");
  assert.equal(await w(2), "ok");
  assert.deepEqual(host.log, ["ask:dbWrite", "w1", "w2"]);
});

test("works on hosts without requestPluginPermission", async () => {
  const g = createDbWriteGuard({}, { log: () => {} });
  assert.equal(await g.wrapWrite("setDatabaseLite", async () => 5)(), 5);
});

test("retries once when the error mentions dbWrite", async () => {
  let n = 0;
  const g = createDbWriteGuard(mkHost(), { log: () => {} });
  const w = g.wrapWrite("setCharacterToIndex", async () => { if (++n === 1) throw new Error("Permission dbWrite denied"); return "ok"; });
  assert.equal(await w(0, {}), "ok");
  assert.equal(n, 2);
  n = -5;
  const always = g.wrapWrite("setCharacterToIndex", async () => { n++; throw new Error("dbWrite"); });
  await assert.rejects(always(0, {}), /dbWrite/);
  assert.equal(n, -3);
});

test("does not retry other errors", async () => {
  let n = 0;
  const g = createDbWriteGuard(mkHost(), { log: () => {} });
  await assert.rejects(g.wrapWrite("setDatabaseLite", async () => { n++; throw new Error("boom"); })(), /boom/);
  assert.equal(n, 1);
});

test("chat retry skipped when the chat grew meanwhile", async () => {
  let n = 0;
  const host = mkHost({ getChatFromIndex: async () => ({ message: [1, 2, 3] }) });
  const g = createDbWriteGuard(host, { log: () => {} });
  const w = g.wrapWrite("setChatToIndex", async () => { n++; throw new Error("dbWrite"); });
  await assert.rejects(w(0, 0, { message: [1, 2] }), /dbWrite/);
  assert.equal(n, 1);
});

test("writes to the same target run one at a time; reads wait while asking", async () => {
  let release;
  const host = mkHost({ requestPluginPermission: () => new Promise((r) => { release = r; }) });
  const g = createDbWriteGuard(host, { log: () => {} });
  const order = [];
  let active = 0;
  const w = g.wrapWrite("setChatToIndex", async (ci, ti, tag) => { active++; assert.equal(active, 1); await new Promise((r) => setTimeout(r, 5)); order.push(tag); active--; });
  const read = g.wrapRead(async () => order.push("read"));
  const p = [w(0, 0, "a"), w(0, 0, "b")];
  const rp = read();
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(order, []);
  release(true);
  await Promise.all([...p, rp]);
  assert.deepEqual(order, ["read", "a", "b"]);
  assert.ok(isDbWriteError({ message: "x", cause: { message: "needs dbWrite" } }));
});
