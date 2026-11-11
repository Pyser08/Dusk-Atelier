// SDStudio 이식(애드온 sdstudio 전용): NovelAI 이미지 생성 요청 본문·응답 zip 풀기·에셋 목록 다루기. 순수(브라우저·api 없음).
// 원본: SDStudio(sunho, MIT) src/renderer/backends/genVendors/nai.ts — 지금은 v4.5 기본 생성만 옮김(i2i·인페인트·바이브는 다음 단계).

export var MODEL = "nai-diffusion-4-5-full";
export var DEFAULT_UC = "lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page";
// Opus 무료 범위(1024×1024 넘지 않음, 28스텝 이하)
export var SIZES = {
  portrait: { width: 832, height: 1216, label: "세로" },
  landscape: { width: 1216, height: 832, label: "가로" },
  square: { width: 1024, height: 1024, label: "정사각" }
};

export function buildGenerateBody({ prompt, uc = DEFAULT_UC, size = "portrait", seed, steps = 28, scale = 5, model = MODEL } = {}) {
  const p = String(prompt ?? "").trim();
  if (!p) throw new Error("프롬프트를 적어 주세요");
  const { width, height } = SIZES[size] ?? SIZES.portrait;
  const s = Number.isInteger(seed) && seed > 0 ? seed : 1 + Math.floor(Math.random() * 0xfffffffe);
  const neg = String(uc ?? "");
  return {
    input: p, model, action: "generate", use_new_shared_trial: true,
    parameters: {
      params_version: 3, width, height, scale, sampler: "k_euler_ancestral", steps: Math.min(28, steps),
      n_samples: 1, ucPreset: 0, qualityToggle: true, seed: s, negative_prompt: neg,
      noise_schedule: "karras", cfg_rescale: 0, legacy: false, legacy_v3_extend: false, legacy_uc: false,
      prefer_brownian: true, autoSmea: false, dynamic_thresholding: false, controlnet_strength: 1,
      add_original_image: false, skip_cfg_above_sigma: null, use_coords: false, characterPrompts: [],
      v4_prompt: { caption: { base_caption: p, char_captions: [] }, use_coords: false, use_order: true },
      v4_negative_prompt: { caption: { base_caption: neg, char_captions: [] }, legacy_uc: false }
    }
  };
}

// 응답 zip의 첫 항목. NAI zip은 데이터 기술자(flags bit3)라 로컬 머리 크기가 0 → 중앙 디렉터리에서 읽는다.
// inflate: raw deflate 풀기 함수(fflate inflateSync)
export function readZipFirst(u8, inflate) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (u8.length < 30 || dv.getUint32(0, true) !== 0x04034b50) throw new Error("받은 파일이 zip이 아니에요");
  const flags = dv.getUint16(6, true), nlen = dv.getUint16(26, true), xlen = dv.getUint16(28, true);
  let method = dv.getUint16(8, true), csize = dv.getUint32(18, true);
  if (flags & 8 || !csize) {
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("zip 끝을 찾지 못했어요(받다 끊겼을 수 있어요)");
    const cd = dv.getUint32(eocd + 16, true);
    if (cd + 46 > u8.length || dv.getUint32(cd, true) !== 0x02014b50) throw new Error("zip 목록이 깨졌어요");
    method = dv.getUint16(cd + 10, true); csize = dv.getUint32(cd + 20, true);
  }
  const start = 30 + nlen + xlen;
  if (start + csize > u8.length) throw new Error("zip 내용이 잘렸어요");
  const raw = u8.subarray(start, start + csize);
  let data;
  if (method === 0) data = raw.slice();
  else if (method === 8) data = inflate(raw);
  else throw new Error(`zip 압축 방식 ${method}은 못 풀어요`);
  return { name: new TextDecoder().decode(u8.subarray(30, 30 + nlen)), data };
}

export var isPng = (u8) => u8?.[0] === 0x89 && u8?.[1] === 0x50 && u8?.[2] === 0x4e && u8?.[3] === 0x47;

// 에셋 자리: 봇 = 추가 에셋·감정 이미지, 모듈 = assets
export var assetSlotsOf = (kind) => (kind === "module" ? ["assets"] : ["additionalAssets", "emotionImages"]);
var ALL_SLOTS = ["additionalAssets", "emotionImages", "assets"];

export function uniqueAssetName(target, slot, wanted) {
  const base = String(wanted ?? "").trim() || "image";
  const used = new Set(ALL_SLOTS.flatMap((k) => (target?.[k] ?? []).map((a) => String(a?.[0] ?? "").toLowerCase())));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}_${n}`.toLowerCase())) return `${base}_${n}`;
}

// 사본을 돌려준다(원본 안 바꿈). 감정 이미지는 [이름, 경로], 나머지는 [이름, 경로, 확장자]
export function withAsset(target, slot, name, path, ext = "png") {
  if (!ALL_SLOTS.includes(slot)) throw new Error(`알 수 없는 에셋 자리예요: ${slot}`);
  const item = slot === "emotionImages" ? [name, path] : [name, path, ext];
  return { ...target, [slot]: [...(target?.[slot] ?? []), item] };
}
