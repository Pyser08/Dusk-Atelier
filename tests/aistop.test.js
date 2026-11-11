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

// ── 무슨 작업 중인지 (버튼 글자) ──
import { aiTask, activeTasks, describeAi } from "../src/engine/aistop.js";

test("이름표: 알려진 단계 id는 한국어로, 모르는 영문 id·모델 호출은 비우고, 한국어는 그대로", () => {
  assert.equal(describeAi("writer"), "기억 기록");
  assert.equal(describeAi("analysis"), "기억 분석");
  assert.equal(describeAi("erosync-director"), "Erosync");
  assert.equal(describeAi("sdstudio"), "NAI 이미지 생성");
  assert.equal(describeAi("sdstudio:upscale"), "NAI 업스케일");
  assert.equal(describeAi("애드온 만들기"), "애드온 만들기");
  assert.equal(describeAi("model:submodel"), "");
  assert.equal(describeAi("limit_excluded"), "");
  assert.equal(describeAi(""), "");
});

test("activeTasks: 도는 호출의 이름표 + 열린 작업 이름, 겹치면 하나, 이름 없으면 'AI 작업'", async () => {
  __resetAiStop();
  const a = trackAi("model:submodel");
  assert.deepEqual(activeTasks(), ["AI 작업"]);
  let release;
  const job = aiTask("장기기억 기록", () => new Promise((r) => { release = r; }));
  assert.deepEqual(activeTasks(), ["장기기억 기록"]);
  const b = trackAi("sdstudio");
  assert.deepEqual(activeTasks(), ["NAI 이미지 생성", "장기기억 기록"]);
  const c = trackAi("sdstudio");
  assert.deepEqual(activeTasks(), ["NAI 이미지 생성", "장기기억 기록"]);
  b.end(); c.end();
  release("ok");
  assert.equal(await job, "ok");
  assert.deepEqual(activeTasks(), ["AI 작업"]);
  a.end();
  assert.deepEqual(activeTasks(), []);
});

test("aiTask: 실패해도 작업 이름을 지우고, 이름이 바뀌면 버튼에 알린다", async () => {
  __resetAiStop();
  let calls = 0;
  onAiChange(() => calls++);
  await assert.rejects(aiTask("로어북 정리", async () => { throw new Error("x"); }));
  assert.deepEqual(activeTasks(), []);
  assert.ok(calls >= 2);
});

test("runAI: pick.label이 있으면 그 이름으로 보인다", async () => {
  __resetAiStop();
  const api = { runLLMModel: () => new Promise(() => {}) };
  const p = runAI(api, [{ role: "user", content: "x" }], { noUserPrompts: true, label: "테마 만들기" });
  await wait(1);
  assert.deepEqual(activeTasks(), ["테마 만들기"]);
  stopAll();
  await assert.rejects(p);
});

test("중지하면 그 작업 뒤에 줄 선 호출까지 바로 끊기고, 작업이 끝나면 다시 된다", async () => {
  __resetAiStop();
  const api = { runLLMModel: () => new Promise(() => {}) };
  const results = [];
  const job = aiTask("로어북 정리", async () => {
    for (let i = 0; i < 5; i++) {
      try { await runAI(api, [{ role: "user", content: "x" }], { noUserPrompts: true }); results.push("ok"); }
      catch (e) { results.push(isStopError(e) ? "stop" : "err"); await wait(5); }
    }
  });
  await wait(5);
  stopAll();
  await job;
  assert.deepEqual(results, ["stop", "stop", "stop", "stop", "stop"]);
  // trackAi로 직접 부르는 곳(NAI 등)도 줄 서 있으면 시작하자마자 끊긴다
  __resetAiStop();
  let rel; const j2 = aiTask("x", () => new Promise((r) => { rel = r; }));
  stopAll();
  const t = trackAi("sdstudio");
  assert.ok(t.signal.aborted);
  t.end(); rel(); await j2;
  __resetAiStop();
  const ok = { runLLMModel: async () => ({ type: "success", result: "hi" }) };
  assert.equal(await runAI(ok, [{ role: "user", content: "x" }], { noUserPrompts: true }), "hi");
});
