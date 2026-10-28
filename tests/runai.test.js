import test from "node:test";
import assert from "node:assert/strict";
import { runAI } from "../src/engine/runai.js";

test("runAI reads the official RisuAI success response", async () => {
  const api = { runLLMModel: async (options) => {
    assert.equal(options.mode, "submodel");
    return { type: "success", result: '{"characters":[],"situation":null}' };
  } };
  assert.equal(await runAI(api, [{ role: "user", content: "test" }], { mode: "submodel" }), '{"characters":[],"situation":null}');
});

test("runAI extracts nested text response bodies", async () => {
  const api = { runLLMModel: async () => ({ type: "success", result: { choices: [{ message: { content: "nested body" } }] } }) };
  assert.equal(await runAI(api, [{ role: "user", content: "test" }]), "nested body");
});

const streamOf = (chunks) => new ReadableStream({ start(c) { for (const x of chunks) c.enqueue(x); c.close(); } });
test("runAI drains a streaming response (cumulative object chunks)", async () => {
  const api = { runLLMModel: async () => ({ type: "streaming", result: streamOf([{ 0: "{\"a\"" }, { 0: "{\"a\":1}" }]) }) };
  assert.equal(await runAI(api, [{ role: "user", content: "x" }]), "{\"a\":1}");
});
test("runAI drains a streaming response (string deltas) and a bare stream", async () => {
  assert.equal(await runAI({ runLLMModel: async () => ({ type: "streaming", result: streamOf(["he", "llo"]) }) }, []), "hello");
  assert.equal(await runAI({ runLLMModel: async () => streamOf(["ok"]) }, []), "ok");
});

test('v1.6.8: pick.timeoutSec가 있으면 오래 걸리는 호출을 실패로 본다', async () => {
  const { runAI } = await import('../src/engine/runai.js');
  const slow = { runLLMModel: () => new Promise(() => {}) };
  const t0 = Date.now();
  await assert.rejects(() => runAI(slow, [], { mode: 'submodel', timeoutSec: 0.01 }), /제한시간/);
  assert.ok(Date.now() - t0 < 20000);
  const ok = { runLLMModel: async () => ({ type: 'success', result: '완료' }) };
  assert.equal(await runAI(ok, [], { mode: 'submodel', timeoutSec: 600 }), '완료');
});
