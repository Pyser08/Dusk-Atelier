import test from "node:test";
import assert from "node:assert/strict";
import { EPISODIC_MEMORY_KEY, MEMORY_GRADES, loadEpisodicMemory, createEpisodicMemory } from "../src/data/episodicmemory.js";
import { extractRunAIText } from "../src/engine/airesponse.js";

function mockApi() {
  const store = new Map();
  return {
    pluginStorage: {
      getItem: async (key) => store.get(key) ?? null,
      setItem: async (key, value) => store.set(key, value)
    },
    store
  };
}

test("episodic memory storage defaults are stable and independent", async () => {
  const api = mockApi();
  const state = await loadEpisodicMemory(api);
  assert.equal(state.v, 1);
  assert.deepEqual(state.folders, {});
  assert.equal(state.status.hook, "pending");
  assert.equal(EPISODIC_MEMORY_KEY, "dusk.episodic-memory.v1");
});

test("memory grade scale is E through S", () => {
  assert.deepEqual(MEMORY_GRADES, ["E", "D", "C", "B", "A", "S"]);
});

test("automatic recorder registers the official output hook and preserves output", async () => {
  const api = mockApi();
  let hook;
  api.addRisuScriptHandler = async (name, fn) => { if (name === "output") hook = fn; };
  const memory = createEpisodicMemory(api, { log: () => {} });
  assert.equal(await memory.start(), true);
  assert.equal(typeof hook, "function");
  const output = "⟦C:Mio⟧안녕.⟦/C⟧";
  assert.equal(hook(output), output);
  await new Promise(resolve => setTimeout(resolve, 0));
  const state = await loadEpisodicMemory(api);
  assert.equal(state.status.hook, "ready");
});

test("unavailable output hook is surfaced in status", async () => {
  const api = mockApi();
  const memory = createEpisodicMemory(api, { log: () => {} });
  assert.equal(await memory.start(), false);
  const state = await loadEpisodicMemory(api);
  assert.equal(state.status.hook, "unavailable");
  assert.ok(state.status.lastError);
});

test("model response extraction supports common RisuAI response envelopes", () => {
  assert.equal(extractRunAIText("  direct text  "), "direct text");
  assert.equal(extractRunAIText({ type: "success", result: "JSON body" }), "JSON body");
  assert.equal(extractRunAIText({ type: "success", result: { content: [{ type: "text", text: "nested body" }] } }), "nested body");
  assert.equal(extractRunAIText({ choices: [{ message: { content: "choice body" } }] }), "choice body");
  assert.equal(extractRunAIText({ type: "error", result: "provider error" }), null);
  assert.equal(extractRunAIText({ type: "success", result: "" }), null);
});
