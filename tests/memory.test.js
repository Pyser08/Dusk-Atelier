import test from "node:test";
import assert from "node:assert/strict";
import { createMemory } from "../src/data/memory.js";
import { extractRunAIText } from "../src/engine/airesponse.js";

const mkApi = (extra = {}) => { const m = new Map(); const api = { hooks: {}, pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } },
  addRisuScriptHandler: async (n, f) => { api.hooks[n] = f; }, addRisuReplacer: async (n, f) => { api.hooks["r:" + n] = f; }, ...extra }; return api; };

test("local backend registers runner and injection hooks", async () => {
  const api = mkApi(), mem = createMemory(api);
  assert.equal(await mem.start(), "local"); assert.ok(api.hooks.output); assert.ok(api.hooks["r:beforeRequest"]);
});
test("BardWiki detected → no runner or injection hook (no double cost/injection)", async () => {
  const api = mkApi({ bardWiki: { getDocuments: async () => [] } }), mem = createMemory(api);
  assert.equal(await mem.start(), "bardwiki"); assert.equal(api.hooks.output, undefined); assert.equal(api.hooks["r:beforeRequest"], undefined);
  assert.equal((await mem.store.getIndex()).status.hook, "bardwiki");
});
test("forcing local on BardWiki warns once; off registers nothing", async () => {
  const api = mkApi({ bardWiki: { getDocuments: async () => [] } }); const notes = [];
  const mem = createMemory(api, { notify: (t) => notes.push(t) });
  await mem.store.updateIndex((i) => { i.settings.backend = "local"; });
  assert.equal(await mem.start(), "local"); assert.equal(notes.length, 1);
  const api2 = mkApi(), mem2 = createMemory(api2); await mem2.store.updateIndex((i) => { i.settings.backend = "off"; });
  assert.equal(await mem2.start(), "off"); assert.equal(api2.hooks.output, undefined);
});
test("model response extraction supports common RisuAI response envelopes", () => {
  assert.equal(extractRunAIText("  direct text  "), "direct text");
  assert.equal(extractRunAIText({ type: "success", result: { content: [{ type: "text", text: "nested body" }] } }), "nested body");
  assert.equal(extractRunAIText({ choices: [{ message: { content: "choice body" } }] }), "choice body");
  assert.equal(extractRunAIText({ type: "error", result: "provider error" }), null);
});
