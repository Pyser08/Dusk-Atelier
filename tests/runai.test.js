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
