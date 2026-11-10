// 생성 중지 (engine/aistop.js): runAI·runLLMModel 래퍼가 돌고 있는 호출을 세고, stopAll로 바로 끊는다
import test from "node:test";
import assert from "node:assert/strict";
import { trackAi, stopAll, activeCount, onAiChange, trackedRunLLM, isStopError, STOP_MSG, __resetAiStop } from "../src/engine/aistop.js";
import { runAI } from "../src/engine/runai.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("runAI: 도는 동안 1개로 세고, 중지하면 바로 '생성을 중지했어요' 오류", async () => {
  __resetAiStop();
  const seen = [];
  onAiChange((n) => seen.push(n));
  const api = { runLLMModel: () => new Promise(() => {}) };   // 영영 안 끝나는 호출
  const p = runAI(api, [{ role: "user", content: "x" }], { noUserPrompts: true });
  await wait(5);
  assert.equal(activeCount(), 1);
  const t0 = Date.now();
  assert.equal(stopAll(), 1);
  await assert.rejects(p, (e) => isStopError(e) && e.message === STOP_MSG);
  assert.ok(Date.now() - t0 < 200);
  assert.equal(activeCount(), 0);
  assert.deepEqual(seen, [1, 0]);
});

test("중지 직후의 자동 재시도는 바로 막고, 잠시 뒤엔 다시 돈다", async () => {
  __resetAiStop();
  const run = trackedRunLLM(async () => ({ type: "success", result: "ok" }));
  stopAll();
  await assert.rejects(run({}), (e) => isStopError(e));
  __resetAiStop();
  assert.deepEqual(await run({}), { type: "success", result: "ok" });
  assert.equal(activeCount(), 0);
});

test("runLLMModel 래퍼: 직접 부르는 곳(리수폿·Erosync)도 세고 끊는다", async () => {
  __resetAiStop();
  const run = trackedRunLLM(() => new Promise(() => {}));
  const p = run({ mode: "submodel" });
  await wait(1);
  assert.equal(activeCount(), 1);
  stopAll();
  await assert.rejects(p, (e) => isStopError(e));
  assert.equal(activeCount(), 0);
});

test("부르는 쪽 취소 신호도 따른다, 끝나면 세지 않는다", async () => {
  __resetAiStop();
  const c = new AbortController();
  const t = trackAi("x", c.signal);
  const p = t.race(new Promise(() => {}));
  c.abort();
  await assert.rejects(p, (e) => isStopError(e));
  t.end();
  t.end();
  assert.equal(activeCount(), 0);
  __resetAiStop();
  const api = { runLLMModel: async () => ({ type: "success", result: "hi" }) };
  assert.equal(await runAI(api, [{ role: "user", content: "x" }], { noUserPrompts: true }), "hi");
  assert.equal(activeCount(), 0);
});
