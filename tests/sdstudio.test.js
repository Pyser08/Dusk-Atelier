import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, inflateSync } from "../src/vendor/fflate.js";
import * as N from "../src/engine/sdstudio/nai.js";
import * as Q from "../src/engine/sdstudio/prompt.js";

function descriptorZip(files) {
  const z = zipSync(files, { level: 6 });
  const dv = new DataView(z.buffer);
  dv.setUint16(6, dv.getUint16(6, true) | 8, true);
  dv.setUint32(18, 0, true); dv.setUint32(22, 0, true);
  return z;
}
const png = (n, tag = 0) => { const u = new Uint8Array(n); u.set([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 3, 64, 0, 0, 4, 192]); for (let i = 24; i < n; i++) u[i] = (i * 7 + tag) % 251; return u; };

test("zip: 보통·데이터 기술자 zip, 첫/마지막 항목, 깨진 zip", () => {
  const a = png(5000, 1), b = png(4000, 2);
  for (const z of [zipSync({ "image_0.png": a }), descriptorZip({ "image_0.png": a })]) assert.deepEqual(N.readZipFirst(z, inflateSync).data, a);
  const two = descriptorZip({ "a.png": a, "b.png": b });
  assert.deepEqual(N.readZipFirst(two, inflateSync, { last: true }).data, b, "디렉터 도구는 마지막 항목");
  assert.throws(() => N.readZipFirst(new TextEncoder().encode('{"error":"x"}'), inflateSync), /zip이 아니에요/);
  assert.deepEqual(N.pngSize(a), { width: 832, height: 1216 });
});

test("생성 본문: V4.5 — 품질 태그·UC 프리셋·캡션·시드", () => {
  const b = N.buildGenerateBody({ prompt: "1girl, smile", uc: "bad hands", size: "portrait", seed: 42, settings: { model: "4-5-full" } });
  assert.equal(b.model, "nai-diffusion-4-5-full");
  assert.equal(b.action, "generate");
  assert.equal(b.input, "1girl, smile, very aesthetic, masterpiece, no text");
  assert.equal(b.parameters.params_version, 3);
  assert.equal(b.parameters.ucPreset, 0);
  assert.ok(b.parameters.negative_prompt.startsWith("nsfw, lowres") && b.parameters.negative_prompt.endsWith(", bad hands"));
  assert.equal(b.parameters.seed, 42);
  assert.equal(b.parameters.v4_prompt.caption.base_caption, b.input);
  assert.equal(b.use_new_shared_trial, undefined);
  assert.throws(() => N.buildGenerateBody({ prompt: " " }), /프롬프트/);
});

test("생성 본문: V5 — 스텝·가이던스 상한, 노이즈 고정, 태그 힌트, 투명 배경, Medium 고정값", () => {
  const b = N.buildGenerateBody({ prompt: "cat", settings: { model: "5-full", steps: 40, scale: 9, quality: "light", ucPreset: "light", transparent: true } });
  assert.equal(b.parameters.params_version, 4);
  assert.equal(b.parameters.noise_schedule, "karras");
  assert.equal(b.input, "transparent background, cat, very aesthetic, amazing quality, no text");
  assert.equal(b.parameters.tag_hint_qt, 3);
  assert.equal(b.parameters.tag_hint_uc_preset, 3);
  assert.equal(b.parameters.tag_hint_transparent_background, true);
  assert.equal(b.use_new_shared_trial, true);
  const m = N.buildGenerateBody({ prompt: "cat", uc: "무시됨", settings: { model: "5-full-medium", steps: 28, sampler: "k_euler" } });
  assert.equal(m.parameters.steps, 14);
  assert.equal(m.parameters.sampler, "k_euler_ancestral");
  assert.equal(m.parameters.cfg_rescale, undefined, "Medium은 cfg_rescale을 보내지 않음");
  assert.ok(!m.parameters.negative_prompt.includes("무시됨"));
  assert.equal(N.normalizeSampling({ model: "5-full", sampler: "ddim_v3", scale: 30 }).sampler, "k_euler_ancestral");
  assert.equal(N.normalizeSampling({ model: "5-full", scale: 30 }).scale, 10);
});

test("생성 본문: NAI 캐릭터 프롬프트(좌표)·바이브(정규화)·레퍼런스·Variety+", () => {
  const b = N.buildGenerateBody({ prompt: "2girls", width: 832, height: 1216, settings: { model: "4-5-full", useCoords: true, varietyPlus: true },
    chars: [{ prompt: "girl a", uc: "x", x: 0.3, y: 0.5 }, { prompt: "  ", uc: "" }, { prompt: "girl b", x: 0.7, y: 0.5 }],
    vibes: [{ image: "V1", strength: 0.6 }, { image: "V2", strength: 0.2 }] });
  assert.deepEqual(b.parameters.v4_prompt.caption.char_captions, [{ char_caption: "girl a", centers: [{ x: 0.3, y: 0.5 }] }, { char_caption: "girl b", centers: [{ x: 0.7, y: 0.5 }] }]);
  assert.equal(b.parameters.v4_negative_prompt.caption.char_captions[0].char_caption, "x");
  assert.equal(b.parameters.use_coords, true);
  assert.deepEqual(b.parameters.reference_image_multiple, ["V1", "V2"]);
  assert.deepEqual(b.parameters.reference_strength_multiple.map((x) => +x.toFixed(2)), [0.75, 0.25]);
  assert.equal(b.parameters.skip_cfg_above_sigma, 58);
  const r = N.buildGenerateBody({ prompt: "a", settings: { model: "4-5-full", varietyPlus: true }, refs: [{ image: "R", strength: 0.5, fidelity: 0.8, type: "style" }] });
  assert.deepEqual(r.parameters.director_reference_images, ["R"]);
  assert.equal(+r.parameters.director_reference_secondary_strength_values[0].toFixed(2), 0.2);
  assert.equal(r.parameters.skip_cfg_above_sigma, null, "레퍼런스가 있으면 Variety+ 끔");
  const v5 = N.buildGenerateBody({ prompt: "a", settings: { model: "5-full" }, vibes: [{ image: "V" }], refs: [{ image: "R" }] });
  assert.equal(v5.parameters.reference_image_multiple, undefined, "V5는 바이브·레퍼런스 없음");
});

test("변형(img2img)·인페인트 본문", () => {
  const i = N.buildGenerateBody({ prompt: "a", action: "img2img", image: "IMG", strength: 0.5, noise: 0.1, seed: 7, settings: { model: "4-5-full" } });
  assert.equal(i.parameters.image, "IMG");
  assert.deepEqual(i.parameters.img2img, { strength: 0.5, begin_from_sigma: null, noise: 0.1, extra_noise_seed: 7, color_correct: true });
  const f = N.buildGenerateBody({ prompt: "a", action: "infill", image: "IMG", mask: "M", strength: 1, settings: { model: "4-5-full", sampler: "ddim_v3" } });
  assert.equal(f.model, "nai-diffusion-4-5-full-inpainting");
  assert.equal(f.parameters.mask, "M");
  assert.equal(f.parameters.sampler, "k_euler_ancestral");
  const f5 = N.buildGenerateBody({ prompt: "a", action: "infill", image: "I", mask: "M", addOriginal: true, settings: { model: "5-curated" } });
  assert.equal(f5.model, "nai-diffusion-4-5-curated-inpainting");
  assert.equal(f5.parameters.add_original_image, true);
});

test("디렉터 도구·업스케일·바이브 인코딩 본문", () => {
  assert.deepEqual(N.buildAugmentBody({ method: "bg-removal", image: "I", width: 832, height: 1216, prompt: "x" }), { image: "I", req_type: "bg-removal", width: 832, height: 1216 });
  const e = N.buildAugmentBody({ method: "emotion", image: "I", width: 1, height: 1, emotion: "happy", prompt: "smile", defry: 2 });
  assert.equal(e.prompt, "happy;;smile"); assert.equal(e.defry, 2);
  assert.throws(() => N.buildAugmentBody({ method: "nope" }), /디렉터/);
  assert.deepEqual(N.buildUpscaleBody("I"), { image: "I", model: "nai-diffusion-5-curated", declared_blur_sigma: 0 });
  assert.equal(N.upscaleCost(832, 1216), 1); assert.equal(N.upscaleCost(1024, 1536), 2);
  assert.throws(() => N.upscaleCost(4000, 4000), /픽셀/);
  assert.deepEqual(N.buildEncodeVibeBody("I", 0.8, "4-full"), { image: "I", model: "nai-diffusion-4-full", information_extracted: 0.8 });
});

test("가중치 띄어쓰기", () => {
  assert.equal(N.padWeights("2::1girl::, 1.5::year 2024::"), "2:: 1girl::, 1.5::year 2024 ::");
  assert.equal(N.padWeights("plain"), "plain");
});

test("프롬프트: 주석·줄바꿈·인라인 랜덤", () => {
  assert.deepEqual(Q.toPARR("a, ##지움, 안 보임## b\nc"), ["a", "b", "c"]);
  assert.equal(Q.expandInlineRandom("x, {jeans|black pants}, {artist:a}", () => 0.99), "x, black pants, {artist:a}");
  assert.equal(Q.expandInlineRandom("{{a|b}}", () => 0), "{a}");
});

test("조각: 전개·여러 줄 무작위·없는 조각·순환", () => {
  const libs = [{ name: "옷", pieces: [{ name: "교복", prompt: "school uniform, <옷.리본>" }, { name: "리본", prompt: "red ribbon" }, { name: "랜덤", prompt: "hoodie\nsweater", multi: true }, { name: "고리", prompt: "<옷.고리>" }] }];
  assert.equal(Q.expandPieces("1girl, <옷.교복>", libs), "1girl, school uniform, red ribbon");
  assert.equal(Q.expandPieces("<옷.랜덤>", libs, () => 0.9), "sweater");
  assert.throws(() => Q.expandPieces("<옷.없음>", libs), /없는 조각/);
  assert.throws(() => Q.expandPieces("<없음.x>", libs), /없는 조각 모음/);
  assert.throws(() => Q.expandPieces("<옷.고리>", libs), /자기 자신/);
});

test("상위 | 자리에 씬 조합, 하위는 뒤", () => {
  assert.deepEqual(Q.interleave(["a", "|", "b"], ["x", "y"]), ["a", "x", "y", "b"]);
  assert.deepEqual(Q.interleave(["a", "b"], ["x"]), ["a", "b", "x"]);
  assert.equal(Q.buildPrompt({ top: "masterpiece, |, white background", own: "1boy, cat ears", middle: "angry", back: "detailed" }, []), "masterpiece, angry, white background, 1boy, cat ears, detailed");
});

test("씬 조합: 개수·i번째·꺼진 조각", () => {
  const slots = [[{ prompt: "smile" }, { prompt: "angry" }, { prompt: "sad", on: false }], [{ prompt: "standing" }, { prompt: "sitting" }]];
  assert.equal(Q.combinationCount(slots), 4);
  assert.equal(Q.combinationCount([]), 1);
  assert.equal(Q.combinationCount([[{ prompt: "x", on: false }]]), 0);
  assert.equal(Q.middleOf(Q.combinationAt(slots, 0)), "smile, standing");
  assert.equal(Q.middleOf(Q.combinationAt(slots, 3)), "angry, sitting");
});

test("문법 칠하기", () => {
  const k = Q.highlight("2::cat::, -1::dog::, 0.5::x::, {a}, {a|b}, [c], <옷.교복>, ##m##, |").filter((x) => x.kind !== "text").map((x) => x.kind);
  assert.deepEqual(k, ["weight-up", "weight-neg", "weight-down", "brace", "random", "bracket", "piece", "comment", "pipe"]);
  assert.equal(Q.highlight("a, b").map((x) => x.text).join(""), "a, b");
});
