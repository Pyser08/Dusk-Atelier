import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeKeepMine } from "../src/engine/textmerge.js";

test("ABCDE → 내 AZCDE + 새 ABCDEF = AZCDEF (줄)", () => {
  const r = mergeKeepMine("A\nZ\nC\nD\nE", "A\nB\nC\nD\nE\nF");
  assert.equal(r.text, "A\nZ\nC\nD\nE\nF"); assert.equal(r.added, 1); assert.equal(r.skipped, 1);
});
test("중간에 새로 끼운 문단도 제자리에", () => {
  assert.equal(mergeKeepMine("A\nZ\nC\nD", "A\nB\nC\nX\nD").text, "A\nZ\nC\nX\nD");
});
test("한 덩어리 글은 문장으로", () => {
  const r = mergeKeepMine("그는 키가 크다. 내 설정이다. 눈이 파랗다.", "그는 키가 크다. 원래 설정. 눈이 파랗다. 새 설정이 붙었다.");
  assert.equal(r.text, "그는 키가 크다. 내 설정이다. 눈이 파랗다. 새 설정이 붙었다.");
});
test("같으면 그대로", () => { assert.equal(mergeKeepMine("A\nB\nC\nD", "A\nB\nC\nD").text, "A\nB\nC\nD"); });
