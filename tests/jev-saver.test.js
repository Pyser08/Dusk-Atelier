// 2.2.4 기억 토큰 절약 · Jev 재정렬(선택)
import test from "node:test";
import assert from "node:assert/strict";
import { effectiveInject, SAVER_INJECT } from "../src/data/memoryinject.js";
import { createJev, jevScore, jevBody } from "../src/data/jev.js";

test("토큰 절약: 켜면 칸별 예산을 줄인 값, 끄면 그대로", () => {
  assert.equal(effectiveInject({ saver: true, recallTokens: 900 }).recallTokens, SAVER_INJECT.recallTokens);
  assert.equal(effectiveInject({ recallTokens: 900 }).recallTokens, 900);
  assert.deepEqual(effectiveInject(undefined), {});
});
test("Jev 점수: 확률 기대값, 없으면 score", () => {
  assert.equal(jevScore({ probabilities: { 0: 0, 1: 0, 2: 0.5, 3: 0.5 } }), 2.5);
  assert.equal(jevScore({ score: 1.2 }), 1.2);
  const b = jevBody("m", { query: "q", recent: "r", items: [{ id: 5, text: "a" }, { id: 9, text: "b" }] });
  assert.deepEqual(Object.keys(b.questions), ["r0", "r1"]);
  assert.match(b.state, /C1: b/);
});
test("Jev: 꺼져 있으면 null, 켜면 20개씩 나눠 묻고 id별 점수", async () => {
  const mem = new Map(), calls = [];
  const api = { safeLocalStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } },
    nativeFetch: async (url, o) => { const b = JSON.parse(o.body); calls.push(Object.keys(b.questions).length); const answers = Object.fromEntries(Object.keys(b.questions).map((k, i) => [k, { score: i % 2 ? 0.2 : 2.6 }])); return { ok: true, json: async () => ({ answers }) }; } };
  const J = createJev(api, { log: () => {} });
  const items = Array.from({ length: 25 }, (_, i) => ({ id: 100 + i, text: "t" + i }));
  assert.equal(await J.rerank({ query: "q", recent: "", items }), null);
  await J.save({ on: true, key: "sk-x" });
  const m = await J.rerank({ query: "q", recent: "", items });
  assert.deepEqual(calls.sort(), [20, 5].sort());
  assert.equal(m.get(100), 2.6); assert.equal(m.get(101), 0.2); assert.equal(m.size, 25);
});
