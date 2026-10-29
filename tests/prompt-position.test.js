import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCustomPrompts, customPromptBlock } from "../src/engine/pot/custom-prompts.js";

const mk = (position, text) => ({ id: text, name: text, stages: ["writer"], scope: { kind: "all" }, enabled: true, text, ...(position ? { position } : {}) });

test("프롬프트 위치: 기본은 뒤, 위치별로 나뉘어 들어간다", () => {
  const s = { customPrompts: normalizeCustomPrompts([mk("front", "AAA"), mk("middle", "BBB"), mk(null, "CCC")]) };
  assert.deepEqual(s.customPrompts.map((p) => p.position), ["front", "middle", "back"]);
  const f = customPromptBlock(s, "writer", null, "front"), m = customPromptBlock(s, "writer", null, "middle"), b = customPromptBlock(s, "writer", null, "back");
  assert.ok(f.includes("AAA") && !f.includes("BBB") && !f.includes("CCC"));
  assert.ok(m.includes("BBB") && !m.includes("AAA"));
  assert.ok(b.includes("CCC") && !b.includes("AAA"));
});

test("프롬프트 위치: 잘못된 값은 거부", () => {
  assert.throws(() => normalizeCustomPrompts([mk("top", "X")]));
});
