import { test } from "node:test";
import assert from "node:assert/strict";
import { callForms, callPhrase, setTalk } from "../src/engine/memoryhuman.js";

test("호칭 여러 개·상황별 (신고 #32)", () => {
  assert.equal(callPhrase("선배"), 'calls them "선배"');
  assert.deepEqual(callForms("유나야, 화날 때: 한유나"), [{ when: "", call: "유나야" }, { when: "화날 때", call: "한유나" }]);
  assert.equal(callPhrase("유나야, 선배, 화날 때: 한유나"), 'calls them "유나야" or "선배" (varies naturally); "한유나" when 화날 때');
  const f = {};
  assert.equal(setTalk(f, "A", "B", { call: "유나야, 선배, 유나 씨, 화날 때: 한유나, 장난칠 때: 꼬맹이", tone: "casual" }).call.length > 20, true);
});
