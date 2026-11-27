import { test } from "node:test";
import assert from "node:assert/strict";
import { tagOnly, cleanTag } from "../src/engine/lorerules.js";

test("tagOnly keeps only text inside the tag", () => {
  assert.equal(tagOnly("본문 유키\n<status>\n소라\n</status>\n끝 <status a=1>나기</status>", "status"), "\n소라\n\n나기");
  assert.equal(tagOnly("<statusbar>x</statusbar>", "status"), "");
  assert.equal(tagOnly("태그 없음", "status"), "");
  assert.equal(tagOnly("그대로", ""), "그대로");
  assert.equal(cleanTag("<status>"), "status");
  assert.equal(cleanTag("st atus;"), "status");
});
