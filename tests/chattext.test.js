import test from "node:test";
import assert from "node:assert/strict";
import { extractMessageText, isUserMessage, hashText, snippet } from "../src/engine/chattext.js";

test("extractMessageText picks first non-empty field", () => {
  assert.equal(extractMessageText({ data: "  ", content: "본문" }), "본문");
  assert.equal(extractMessageText({ data: [{ text: "a" }, "b"] }), "a\nb");
  assert.equal(extractMessageText(null), "");
});
test("isUserMessage recognizes common shapes", () => {
  assert.ok(isUserMessage({ role: "user" }));
  assert.ok(isUserMessage({ is_user: true }));
  assert.ok(!isUserMessage({ role: "char" }));
});
test("hashText is stable, whitespace-insensitive, 8 hex chars", () => {
  assert.equal(hashText("a  b\n"), hashText("a b"));
  assert.match(hashText("x"), /^[0-9a-f]{8}$/);
  assert.notEqual(hashText("x"), hashText("y"));
});
test("snippet truncates", () => assert.equal(snippet("abcdef", 4), "abc…"));
