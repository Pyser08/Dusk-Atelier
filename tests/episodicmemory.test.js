import test from "node:test";
import assert from "node:assert/strict";
import { EPISODIC_MEMORY_KEY, MEMORY_GRADES, loadEpisodicMemory, createEpisodicMemory } from "../src/data/episodicmemory.js";

test("episodic memory starts with independent chat folders", async () => {
  const store = new Map();
  const api = { pluginStorage: { getItem: async k => store.get(k) ?? null, setItem: async (k,v) => store.set(k,v) } };
  const state = await loadEpisodicMemory(api);
  assert.equal(state.v, 1);
  assert.deepEqual(state.folders, {});
  assert.equal(EPISODIC_MEMORY_KEY, "dusk.episodic-memory.v1");
});

test("memory grade scale is E through S in ascending order", () => {
  assert.deepEqual(MEMORY_GRADES, ["E", "D", "C", "B", "A", "S"]);
});

test("automatic recorder uses the official output script hook and preserves output", async () => {
  let hook;
  const api = { addRisuScriptHandler: async (name, fn) => { if (name === "output") hook = fn; } };
  const memory = createEpisodicMemory(api, { log: () => {} });
  assert.equal(await memory.start(), true);
  assert.equal(typeof hook, "function");
  const output = "⟦C:Mio⟧안녕.⟦/C⟧";
  assert.equal(hook(output), output);
});
