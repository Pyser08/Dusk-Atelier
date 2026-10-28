import test from "node:test";
import assert from "node:assert/strict";
import { insertFairness, FAIR_MARK } from "../src/engine/fairplay.js";
import { createFairPlay, FAIR_KEY } from "../src/data/fairplay.js";

test("맨 앞 시스템 메시지들 뒤에 한 번만 넣고 원본은 그대로", () => {
  const m = [{ role: "system", content: "S1" }, { role: "system", content: "S2" }, { role: "user", content: "hi" }];
  const a = insertFairness(m);
  assert.equal(a.length, 4); assert.ok(a[2].content.startsWith(FAIR_MARK)); assert.equal(m.length, 3);
  assert.equal(insertFairness(a).length, 4);
});
test("훅: 기본 꺼짐 → 켜면 삽입, 모델 요청이 아니면 통과", async () => {
  const store = new Map(); let hooks = 0;
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, addRisuReplacer: async () => { hooks++; } };
  const f = createFairPlay(api); const m = [{ role: "user", content: "x" }];
  assert.equal(await f.start(), false); assert.equal(await f.beforeRequest(m, "model"), m); assert.equal(hooks, 0);
  await f.set(true); await f.set(false); await f.set(true);
  assert.equal(hooks, 1); assert.equal(store.get(FAIR_KEY), "on");
  assert.equal((await f.beforeRequest(m, "model")).length, 2); assert.equal(await f.beforeRequest(m, "memory"), m);
});
