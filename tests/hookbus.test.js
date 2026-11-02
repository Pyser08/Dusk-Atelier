import test from "node:test";
import assert from "node:assert/strict";
import { createHookBus } from "../src/data/hookbus.js";

function fakeRaw() {
  const reg = []; const r = { reg,
    addRisuScriptHandler: async (t, f) => { reg.push([t, f]); },
    removeRisuScriptHandler: async (t, f) => { const i = reg.findIndex(([a, b]) => a === t && b === f); if (i >= 0) reg.splice(i, 1); } };
  return r;
}
test("종류별로 호스트 훅은 하나만 달고, 등록 순서대로 글을 이어 받는다", async () => {
  const raw = fakeRaw(), bus = createHookBus(raw, { log: () => {} });
  await Promise.all([bus.add("display", (t) => t + "A"), bus.add("display", async (t) => t + "B"), bus.add("display", () => undefined)]);
  await bus.add("output", (t) => t); await bus.add("output", (t) => t);
  assert.equal(raw.reg.filter(([t]) => t === "display").length, 1);
  assert.equal(raw.reg.filter(([t]) => t === "output").length, 1);
  const f = raw.reg.find(([t]) => t === "display")[1];
  assert.equal(await f("x"), "xAB", "undefined를 돌려주면 글은 그대로 이어진다");
});
test("예외는 그 처리기만 건너뛰고, 지우면 호스트 훅도 정리된다", async () => {
  const raw = fakeRaw(), bus = createHookBus(raw, { log: () => {} });
  const bad = () => { throw new Error("boom"); }, ok = (t) => t + "!";
  await bus.add("input", bad); await bus.add("input", ok);
  assert.equal(await raw.reg[0][1]("a"), "a!");
  await bus.remove("input", bad); assert.equal(bus.count("input"), 1);
  await bus.remove("input", ok); assert.equal(raw.reg.length, 0, "마지막 처리기를 지우면 호스트 훅도 뗀다");
  await bus.add("input", ok); assert.equal(raw.reg.length, 1, "다시 달 수 있다");
});
test("호스트가 훅 등록을 거부하면 등록한 쪽이 오류를 받는다", async () => {
  const raw = { addRisuScriptHandler: async () => { throw new Error("denied"); }, removeRisuScriptHandler: async () => {} };
  const bus = createHookBus(raw, { log: () => {} });
  await assert.rejects(bus.add("output", (t) => t), /denied/);
  assert.equal(bus.count("output"), 0);
});
test("다른 종류의 훅은 그대로 호스트에 넘긴다", async () => {
  const raw = fakeRaw(), bus = createHookBus(raw, { log: () => {} });
  const f = (t) => t; await bus.add("editRequest", f);
  assert.equal(raw.reg[0][0], "editRequest");
});
