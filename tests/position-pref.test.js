import test from "node:test";
import assert from "node:assert/strict";
import { normalizePositionPreferences, positionPreferenceValue } from "../src/erosync/pure-profile.js";

test("체위·장소 preference: 한국어·다른 영어 표현도 받고, 모르는 값만 버린다", () => {
  assert.equal(positionPreferenceValue("선호"), "preferred");
  assert.equal(positionPreferenceValue("좋아함"), "preferred");
  assert.equal(positionPreferenceValue("비선호"), "disliked");
  assert.equal(positionPreferenceValue("싫어함"), "disliked");
  assert.equal(positionPreferenceValue("liked"), "preferred");
  assert.equal(positionPreferenceValue("dislike"), "disliked");
  assert.equal(positionPreferenceValue("보통"), "neutral");
  assert.equal(positionPreferenceValue("???"), "");
  const r = normalizePositionPreferences([{ label: "기승위", preference: "선호" }, { label: "공공장소", preference: "싫어함" }, { label: "x", preference: "모름" }]);
  assert.deepEqual(r.map((x) => [x.label, x.preference]), [["기승위", "preferred"], ["공공장소", "disliked"]]);
});
