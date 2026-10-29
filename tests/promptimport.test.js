import test from "node:test";
import assert from "node:assert/strict";
import { fromJson, fromPreset, fit, PROMPT_MAX } from "../src/engine/promptimport.js";

test("JSON 모양 여러 가지에서 후보를 뽑는다", () => {
  assert.deepEqual(fromJson("규칙 하나"), [{ name: "", text: "규칙 하나" }]);
  assert.deepEqual(fromJson([{ name: "a", text: "x" }, "y", { content: "z", title: "t" }]).map((c) => c.text), ["x", "y", "z"]);
  assert.equal(fromJson({ customPrompts: [{ name: "n", text: "t" }] })[0].name, "n");
  assert.deepEqual(fromJson({ foo: 1 }), []);
});
test("프리셋은 글이 든 블록만", () => {
  const r = fromPreset({ promptTemplate: [{ type: "plain", type2: "main", name: "메인", text: "안녕" }, { type: "chat" }, { type: "plain", text: "  " }] });
  assert.deepEqual(r, [{ name: "메인", text: "안녕" }]);
});
test("한도를 넘으면 자르고 표시", () => {
  const r = fit({ name: "a", text: "x".repeat(PROMPT_MAX + 5) });
  assert.equal(r.text.length, PROMPT_MAX); assert.equal(r.cut, true);
});
