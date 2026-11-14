import test from "node:test";
import assert from "node:assert/strict";
import { insertBlock, PLACEHOLDER } from "../src/engine/memoryinject.js";

const base = () => [{ role: "system", content: "규칙" }, { role: "user", content: "안녕" }];
test("without placeholder behaves as before (before last user)", () => {
  const out = insertBlock(base(), "[Dusk Memory]\nA", "beforeLastUser");
  assert.equal(out.length, 3); assert.equal(out[1].content, "[Dusk Memory]\nA");
});
test("placeholder in a string message is replaced and no extra block is added", () => {
  const m = [{ role: "system", content: `앞 ${PLACEHOLDER} 뒤` }, { role: "user", content: "안녕" }];
  const out = insertBlock(m, "BLOCK", "beforeLastUser");
  assert.equal(out.length, 2); assert.equal(out[0].content, "앞 BLOCK 뒤");
  assert.equal(m[0].content, `앞 ${PLACEHOLDER} 뒤`, "원본 요청은 바뀌지 않음");
});
test("placeholder inside array content parts is replaced", () => {
  const m = [{ role: "user", content: [{ type: "text", text: `x${PLACEHOLDER}` }] }];
  assert.equal(insertBlock(m, "B")[0].content[0].text, "xB");
});
test("empty block removes the placeholder text instead of leaking it", () => {
  const m = [{ role: "system", content: `a${PLACEHOLDER}b` }, { role: "user", content: "q" }];
  assert.equal(insertBlock(m, "")[0].content, "ab");
});
test("only the first message holding the placeholder gets the block", () => {
  const m = [{ role: "system", content: PLACEHOLDER }, { role: "user", content: PLACEHOLDER }];
  const out = insertBlock(m, "B");
  assert.equal(out[0].content, "B"); assert.equal(out[1].content, "");
});

test("end: 맨 뒤에 넣고, 끝의 어시스턴트 prefill은 그 뒤에 남긴다", () => {
  const m = [{ role: "system", content: "S" }, { role: "user", content: "U" }];
  assert.equal(insertBlock(m, "BLOCK", "end").at(-1).content, "BLOCK");
  const pre = [...m, { role: "assistant", content: "P" }];
  const out = insertBlock(pre, "BLOCK", "end");
  assert.deepEqual(out.map((x) => x.content), ["S", "U", "BLOCK", "P"]);
  assert.equal(insertBlock(m, "BLOCK").at(-1).content, "BLOCK");
});
