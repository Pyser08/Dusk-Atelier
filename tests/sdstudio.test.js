import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, inflateSync } from "../src/vendor/fflate.js";
import { buildGenerateBody, readZipFirst, SIZES, assetSlotsOf, withAsset, uniqueAssetName } from "../src/engine/sdstudio/nai.js";

// NAI처럼 데이터 기술자(flags=8)로 감싼 zip: 로컬 머리의 크기를 0으로 지우고 bit3을 켠다
function descriptorZip(name, data) {
  const z = zipSync({ [name]: data }, { level: 6 });
  const dv = new DataView(z.buffer);
  dv.setUint16(6, dv.getUint16(6, true) | 8, true);
  dv.setUint32(18, 0, true); dv.setUint32(22, 0, true);
  return z;
}
const png = (n) => { const u = new Uint8Array(n); u.set([0x89, 0x50, 0x4e, 0x47]); for (let i = 4; i < n; i++) u[i] = (i * 7) % 251; return u; };

test("zip 첫 항목: 보통 zip과 데이터 기술자 zip 모두 풀림", () => {
  const img = png(50000);
  for (const z of [zipSync({ "image_0.png": img }), descriptorZip("image_0.png", img)]) {
    const e = readZipFirst(z, inflateSync);
    assert.equal(e.name, "image_0.png");
    assert.deepEqual(e.data, img);
  }
});
test("zip 아님·깨진 zip은 알기 쉬운 오류", () => {
  assert.throws(() => readZipFirst(new TextEncoder().encode('{"error":"x"}'), inflateSync), /zip이 아니에요/);
  const z = descriptorZip("a.png", png(100));
  assert.throws(() => readZipFirst(z.slice(0, z.length - 30), inflateSync), /zip/);
});
test("생성 요청 본문: 프롬프트·크기·시드가 v4 캡션까지 같이 들어감", () => {
  const b = buildGenerateBody({ prompt: "1girl, smile", uc: "lowres", size: "portrait", seed: 42 });
  assert.equal(b.action, "generate");
  assert.equal(b.input, "1girl, smile");
  assert.equal(b.parameters.width, SIZES.portrait.width);
  assert.equal(b.parameters.height, SIZES.portrait.height);
  assert.equal(b.parameters.seed, 42);
  assert.equal(b.parameters.v4_prompt.caption.base_caption, "1girl, smile");
  assert.equal(b.parameters.v4_negative_prompt.caption.base_caption, "lowres");
  assert.equal(b.parameters.n_samples, 1);
  assert.ok(b.parameters.steps <= 28 && SIZES.portrait.width * SIZES.portrait.height <= 1024 * 1024, "Opus 무료 범위");
  assert.throws(() => buildGenerateBody({ prompt: "  " }), /프롬프트/);
  const r = buildGenerateBody({ prompt: "a" });
  assert.ok(Number.isInteger(r.parameters.seed) && r.parameters.seed > 0);
});
test("에셋 넣기: 봇은 추가 에셋/감정 이미지, 모듈은 assets — 원본은 안 바뀜", () => {
  assert.deepEqual(assetSlotsOf("character"), ["additionalAssets", "emotionImages"]);
  assert.deepEqual(assetSlotsOf("module"), ["assets"]);
  const ch = { name: "시로코", additionalAssets: [["a", "assets/1.png", "png"]], emotionImages: [["smile", "assets/2.png"]] };
  const c2 = withAsset(ch, "additionalAssets", "b", "assets/3.png");
  assert.deepEqual(c2.additionalAssets.at(-1), ["b", "assets/3.png", "png"]);
  assert.equal(ch.additionalAssets.length, 1);
  const c3 = withAsset(ch, "emotionImages", "angry", "assets/4.png");
  assert.deepEqual(c3.emotionImages.at(-1), ["angry", "assets/4.png"]);
  const m = withAsset({ id: "m1" }, "assets", "bg", "assets/5.png");
  assert.deepEqual(m.assets, [["bg", "assets/5.png", "png"]]);
  assert.throws(() => withAsset(ch, "lorebook", "x", "y"), /에셋 자리/);
});
test("이름이 겹치면 뒤에 번호", () => {
  const ch = { additionalAssets: [["smile", "p"], ["smile_2", "p"]], emotionImages: [["Smile_3", "p"]] };
  assert.equal(uniqueAssetName(ch, "additionalAssets", "smile"), "smile_4");
  assert.equal(uniqueAssetName(ch, "additionalAssets", "new"), "new");
  assert.equal(uniqueAssetName(ch, "additionalAssets", "  "), "image");
});
