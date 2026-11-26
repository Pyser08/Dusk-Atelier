import test from "node:test";
import assert from "node:assert/strict";
import { cleanEmo, emotionWords, assetEmotions } from "../src/engine/innerthought.js";
import { buildAssetIndex } from "../src/engine/imgtagfix.js";

test("신고 #25: UUID 에셋 이름은 감정이 아니다", () => {
  const uuid = "764ac8fb-f2b6-4e11-b6a2-3923e02c9e20";
  assert.deepEqual(assetEmotions(buildAssetIndex([[uuid, "Mina_happy"]]), ["Mina"]).filter((w) => /\d/.test(w)), []);
  assert.deepEqual(emotionWords([uuid, "smug"]), ["smug"]);
  assert.equal(cleanEmo("764ac8fb f2b6 b6a2 3923e02c9e20", "Mina", { emos: ["764ac8fb f2b6 b6a2 3923e02c9e20"] }), "");
  assert.equal(cleanEmo("happy 3923e02c9e20", "Mina", {}), "happy");
  assert.equal(cleanEmo("설렘", "Mina", {}), "설렘");
  assert.equal(cleanEmo("face", "Mina", {}), "face");
});
