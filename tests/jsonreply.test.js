import test from "node:test";
import assert from "node:assert/strict";
import { cleanJsonReply } from "../src/engine/jsonreply.js";

test("cleanJsonReply: <Thoughts> 추론 블록(provider-manager)도 지운다", () => {
  assert.equal(cleanJsonReply('<Thoughts>생각 {"a":0}</Thoughts>\n{"b":1}'), '{"b":1}');
  assert.equal(cleanJsonReply('생각만 있고 여는 태그 없음</Thoughts>{"b":1}'), '{"b":1}');
});
