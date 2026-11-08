import test from "node:test";
import assert from "node:assert/strict";
import { createHostGate, HEAVY_RE } from "../src/data/hostgate.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function fakeHost() {
  let cur = 0, peak = 0;
  const heavy = async (v) => { cur++; peak = Math.max(peak, cur); await sleep(20); cur--; return v; };
  return { getDatabase: heavy, getCharacterFromIndex: heavy, setCharacterToIndex: heavy, registerButton: async () => "ok", pluginStorage: { getItem: async () => "s" }, peak: () => peak };
}

test("무거운 호스트 호출은 동시에 max개까지만 나가고 순서대로 나간다", async () => {
  const host = fakeHost(), g = createHostGate(host, { max: 3 });
  const out = await Promise.all(Array.from({ length: 20 }, (_, i) => g.getDatabase(i)));
  assert.deepEqual(out, Array.from({ length: 20 }, (_, i) => i));
  assert.ok(host.peak() <= 3, `동시 ${host.peak()}`);
  assert.ok(host.peak() >= 2);
});
test("가벼운 호출·하위 객체는 그대로 통과(막히지 않는다)", async () => {
  const host = fakeHost(), g = createHostGate(host, { max: 1 });
  const slow = g.getDatabase(1);
  assert.equal(await g.registerButton(), "ok");
  assert.equal(await g.pluginStorage.getItem("k"), "s");
  await slow;
});
test("호출이 실패해도 자리를 돌려주고 오류는 그대로 전달한다", async () => {
  const host = { getDatabase: async (x) => { if (x === "bad") throw new Error("실패"); return x; } };
  const g = createHostGate(host, { max: 1 });
  const [a, b, c] = await Promise.allSettled([g.getDatabase(1), g.getDatabase("bad"), g.getDatabase(3)]);
  assert.equal(a.value, 1); assert.equal(b.reason.message, "실패"); assert.equal(c.value, 3);
});
test("응답이 안 오는 호출이 있어도 제한시간 뒤 자리를 풀어 뒤 호출이 막히지 않는다", async () => {
  let n = 0;
  const host = { getDatabase: (x) => (n++ === 0 ? new Promise(() => {}) : Promise.resolve(x)) };
  const g = createHostGate(host, { max: 1, holdMs: 50 });
  g.getDatabase("멈춤");
  const t0 = Date.now();
  assert.equal(await g.getDatabase("다음"), "다음");
  assert.ok(Date.now() - t0 < 1000);
});
test("대기열 상태를 알려 준다(진단용)", async () => {
  const g = createHostGate(fakeHost(), { max: 1 });
  const ps = [g.getDatabase(1), g.getDatabase(2), g.getDatabase(3)];
  assert.deepEqual({ ...g.__gate.stats() }, { running: 1, waiting: 2, max: 1, peakWaiting: 2, total: 3 });
  await Promise.all(ps);
  assert.equal(g.__gate.stats().waiting, 0);
});
test("HEAVY_RE는 읽기·쓰기 큰 호출만 잡는다", () => {
  for (const n of ["getDatabase", "getCharacterFromIndex", "getChatFromIndex", "setCharacterToIndex", "setChatToIndex", "setDatabaseLite", "setDatabase", "getCharacter"]) assert.ok(HEAVY_RE.test(n), n);
  for (const n of ["registerButton", "showContainer", "log", "pluginStorage", "getCurrentCharacterIndex", "getCurrentChatIndex"]) assert.ok(!HEAVY_RE.test(n), n);
});
