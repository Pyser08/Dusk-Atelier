// 신고 #11 남은 P2
import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStoreV3 } from "../src/data/memorystore3.js";
import { createCardOverlay } from "../src/data/cardoverlay.js";
import { createGaugeService } from "../src/data/gauge.js";
const deep = (o) => { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deep); } return o; };
const mk = () => { const st = {}; return createMemoryStoreV3({ pluginStorage: { getItem: async (k) => st[k] ?? null, setItem: async (k, v) => { st[k] = v; }, removeItem: async (k) => { delete st[k]; } } }); };
test("peekIndex: 같은 원문이면 같은 값, 쓰면 새 값, getIndex는 독립 사본", async () => {
  const s = mk(); await s.updateIndex((i) => { i.bots.a = { on: true }; });
  const a = await s.peekIndex(); assert.equal(await s.peekIndex(), a); deep(a);
  const g = await s.getIndex(); assert.deepEqual(g, a); g.bots.a.on = false; assert.equal((await s.peekIndex()).bots.a.on, true);
  await s.updateIndex((i) => { i.bots.b = { on: true }; }); assert.ok((await s.peekIndex()).bots.b && !a.bots.b);
});
test("게이지 표시는 얼린 인덱스를 고치지 않는다", async () => {
  const idx = deep({ gauges: { A: { defs: [{ id: "g", name: "기" }], chats: { a1: 1 } } } });
  const g = createGaugeService({}, { store: { getIndex: async () => { throw new Error("안 불림"); }, peekIndex: async () => idx, peekFolder: async () => deep({ gauge: { log: [] } }) }, current: async () => ({ chaId: "A", chatId: "a1" }) });
  assert.equal(await g.onDisplay("안녕"), "안녕");
});
for (const id of ["k1", undefined]) test(`상태창 키 리스너: 번호 ${id}`, async () => {
  let add = 0, rem = [];
  const el = () => ({ setAttribute: async () => {}, setStyleAttribute: async () => {}, addEventListener: async () => {}, appendChild: async () => {}, setInnerText: async () => {}, remove: async () => {} });
  const body = el(), d = { querySelector: async () => body, createElement: async () => el(), addEventListener: async () => { add++; return id; }, removeEventListener: async (t, k) => { rem.push(k); } };
  const prev = globalThis.DOMParser; globalThis.DOMParser = class { parseFromString() { return { body: { childNodes: [] } }; } };
  try { const o = createCardOverlay({ ensureDoc: async () => d, cardOf: async () => "x" }); await o.show("p"); await o.close(); await o.show("p"); await o.close(); } finally { globalThis.DOMParser = prev; }
  assert.equal(add, id ? 2 : 1); assert.deepEqual(rem, id ? ["k1", "k1"] : []);
});
