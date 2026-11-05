import test from "node:test";
import assert from "node:assert/strict";
import { modeOf, patchOfMode } from "../src/ui/screens/memory/erosynclevel.js";
test("수위 모드 ↔ 엔진 설정 변환", () => {
  assert.equal(modeOf({ contentMode: "sfw" }), "sfw");
  assert.equal(modeOf({ contentMode: "nsfw", nsfwPlus: true }), "plus");
  assert.equal(modeOf({ contentMode: "nsfw" }), "nsfw");
  assert.deepEqual(patchOfMode("plus"), { contentMode: "nsfw", extremityLimit: "unlimited", nsfwPlus: true });
  assert.deepEqual(patchOfMode("sfw"), { contentMode: "sfw", nsfwPlus: false });
});
