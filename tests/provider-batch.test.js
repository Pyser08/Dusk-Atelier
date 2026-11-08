// 8단계(2.0.0): Anthropic 배치 — 요청 만들기·상태·결과 읽기·같은 입력 재사용
import test from "node:test";
import assert from "node:assert/strict";
import { batchKey, batchCreateRequest, batchStatusRequest, parseBatchStatus, parseBatchResults, batchBaseOf } from "../src/engine/provider/batch.js";
import { createProviderStore } from "../src/data/provider/store.js";
import { createProviderRunner } from "../src/data/provider/runner.js";

const body = { model: "claude-sonnet-4", max_tokens: 100, stream: true, messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }] };
test("배치 키: 같은 입력이면 같고 stream 여부와 무관", () => {
  assert.equal(batchKey(body), batchKey({ ...body, stream: false })); assert.notEqual(batchKey(body), batchKey({ ...body, max_tokens: 101 }));
});
test("배치 요청 모양", () => {
  const r = batchCreateRequest({ url: "https://api.anthropic.com/v1/messages", headers: { "x-api-key": "K", "content-type": "application/json", accept: "text/event-stream" }, body }, "cid");
  assert.equal(r.url, "https://api.anthropic.com/v1/messages/batches"); assert.equal(r.method, "POST"); assert.equal(r.headers.accept, undefined);
  assert.equal(r.body.requests[0].custom_id, "cid"); assert.equal(r.body.requests[0].params.stream, undefined); assert.equal(r.body.requests[0].params.model, "claude-sonnet-4");
  assert.equal(batchStatusRequest({ url: "https://api.anthropic.com/v1/messages", headers: { "x-api-key": "K" } }, "b1").url, "https://api.anthropic.com/v1/messages/batches/b1");
  assert.equal(batchBaseOf("https://x.test/v1/messages"), "https://x.test/v1/messages/batches");
});
test("상태·결과 읽기", () => {
  assert.deepEqual(parseBatchStatus({ id: "b", processing_status: "ended", request_counts: { succeeded: 1 }, results_url: "https://r" }), { id: "b", ended: true, resultsUrl: "https://r", counts: { succeeded: 1 } });
  assert.equal(parseBatchStatus({ id: "b", processing_status: "in_progress" }).ended, false);
  const ok = parseBatchResults(JSON.stringify({ custom_id: "cid", result: { type: "succeeded", message: { content: [{ type: "text", text: "안녕" }], usage: { input_tokens: 5, output_tokens: 2 } } } }) + "\n", "cid");
  assert.equal(ok.text, "안녕"); assert.equal(ok.usage.output, 2);
  assert.match(parseBatchResults(JSON.stringify({ custom_id: "cid", result: { type: "errored", error: { error: { message: "bad" } } } }), "cid").error, /bad/);
  assert.match(parseBatchResults(JSON.stringify({ custom_id: "cid", result: { type: "expired" } }), "cid").error, /만료/);
});

// 실행기 연결
const res = (j, ok = true, status = 200) => ({ ok, status, text: async () => (typeof j === "string" ? j : JSON.stringify(j)), json: async () => j, body: null });
function harness(batch, script) {
  const mem = new Map(), api = { pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } } };
  const store = createProviderStore(api), calls = [], notes = []; let n = 0;
  const transport = { send: async (r) => { calls.push(r); const s = script[Math.min(n++, script.length - 1)]; return typeof s === "function" ? s(r) : s; } };
  const vault = { values: async (ids) => ids.map(() => "sk-ant-1111"), has: async () => true };
  const ready = store.save({ enabled: true, connections: [{ id: "c1", kind: "anthropic", keyIds: ["k1"] }], profiles: [{ id: "p1", connectionId: "c1", model: "claude-sonnet-4", batch }], purposes: { main: { profileId: "p1" } }, defaults: { batchWaitMin: 5 } });
  const runner = createProviderRunner({ api, store, vault, transport, notify: (t) => notes.push(t), sleep: async () => {} });
  return { runner, calls, notes, ready, mem };
}
const req = () => ({ mode: "model", prompt_chat: [{ role: "system", content: "S" }, { role: "user", content: "hi" }] });
const ended = { id: "msgbatch_1", processing_status: "ended", results_url: "https://api.anthropic.com/v1/messages/batches/msgbatch_1/results" };
const resultLine = JSON.stringify({ custom_id: "x", result: { type: "succeeded", message: { content: [{ type: "text", text: "배치 답" }], usage: { input_tokens: 10, output_tokens: 3 } } } });
test("기다리기: 만들고 → 진행 중 → 끝나면 결과를 돌려줌, 비용은 절반", async () => {
  const h = harness("wait", [res({ id: "msgbatch_1", processing_status: "in_progress" }), res({ id: "msgbatch_1", processing_status: "in_progress" }), res(ended), res(resultLine)]); await h.ready;
  const r = await h.runner.handle(req()); assert.equal(r.success, true); assert.equal(r.content, "배치 답");
  assert.match(h.calls[0].url, /messages\/batches$/); assert.match(h.calls[1].url, /batches\/msgbatch_1$/); assert.match(h.calls[3].url, /results$/);
  assert.equal(h.calls[0].body.requests.length, 1);
});
test("만들고 끝내기: 알려 주고, 같은 입력으로 다시 하면 새 배치를 안 만들고 결과를 가져옴", async () => {
  const h = harness("create", [res({ id: "msgbatch_1", processing_status: "in_progress" }), res({ id: "msgbatch_1", processing_status: "in_progress" }), res({ id: "msgbatch_1", processing_status: "in_progress" }), res(ended), res(resultLine)]); await h.ready;
  const a = await h.runner.handle(req()); assert.equal(a.success, false); assert.match(a.content, /msgbatch_1/);
  const b = await h.runner.handle(req()); assert.equal(b.success, false);                         // 아직 진행 중
  assert.equal(h.calls.filter((c) => /batches$/.test(c.url) && c.method === "POST").length, 1);   // 만들기는 한 번뿐
  const c = await h.runner.handle(req()); assert.equal(c.success, true); assert.equal(c.content, "배치 답");
});
test("배치 실패(errored)는 오류로", async () => {
  const bad = JSON.stringify({ custom_id: "x", result: { type: "errored", error: { error: { message: "overloaded" } } } });
  const h = harness("wait", [res({ id: "b9", processing_status: "in_progress" }), res({ id: "b9", processing_status: "ended", results_url: "https://r/results" }), res(bad)]); await h.ready;
  const r = await h.runner.handle(req()); assert.equal(r.success, false); assert.match(r.content, /overloaded/);
});
