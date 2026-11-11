// SDStudio 이식(애드온 sdstudio 전용): NovelAI 요청 본문(생성·변형·인페인트·디렉터 도구·업스케일·바이브 인코딩)·응답 zip 풀기·에셋 목록. 순수.
// 원본: SDStudio(sunho, MIT) backends/genVendors/nai.ts·naiModelCapabilities.ts·naiQualityPresets.ts·naiUpscale.ts·imageGen.ts — 규칙을 그대로 옮김.

// ── 모델 ──
var LEGACY_SAMPLERS = ["k_euler_ancestral", "k_euler", "k_dpmpp_2s_ancestral", "k_dpmpp_2m", "k_dpmpp_sde", "k_dpmpp_2m_sde", "ddim_v3"];
var V5_SAMPLERS = ["k_euler_ancestral", "k_euler", "k_dpmpp_2s_ancestral", "k_dpmpp_2m_sde", "k_dpmpp_2m", "k_dpmpp_sde"];
var legacy = { v5: false, samplers: LEGACY_SAMPLERS, vibe: true, reference: true, varietyPlus: true, transparent: false };
var v5 = (tokens) => ({ v5: true, samplers: V5_SAMPLERS, maxScale: 10, maxSteps: 50, maxChars: 32, tokens, vibe: false, reference: false, varietyPlus: false, transparent: true, forcedNoise: "karras" });
export var MODELS = [
  { id: "5-full", label: "V5 Full", gen: "nai-diffusion-5-full", inpaint: "nai-diffusion-5-full-inpainting", ...v5(1471) },
  { id: "5-full-medium", label: "V5 Medium", gen: "nai-diffusion-5-full-medium", inpaint: "nai-diffusion-5-full-medium-inpainting", ...v5(1471), noCfgRescale: true, fixed: { steps: 14, sampler: "k_euler_ancestral", uc: "heavy" } },
  { id: "5-curated", label: "V5 Curated", gen: "nai-diffusion-5-curated", inpaint: "nai-diffusion-4-5-curated-inpainting", ...v5(703) },
  { id: "4-5-full", label: "V4.5 Full", gen: "nai-diffusion-4-5-full", inpaint: "nai-diffusion-4-5-full-inpainting", ...legacy },
  { id: "4-5-curated", label: "V4.5 Curated", gen: "nai-diffusion-4-5-curated", inpaint: "nai-diffusion-4-5-curated-inpainting", ...legacy },
  { id: "4-full", label: "V4 Full", gen: "nai-diffusion-4-full", inpaint: "nai-diffusion-4-full-inpainting", ...legacy },
  { id: "4-curated", label: "V4 Curated", gen: "nai-diffusion-4-curated-preview", inpaint: "nai-diffusion-4-curated-inpainting", ...legacy }
];
export var modelOf = (id) => MODELS.find((m) => m.id === id) ?? MODELS.find((m) => m.id === "4-5-full");
export var SAMPLER_KO = { k_euler_ancestral: "Euler Ancestral", k_euler: "Euler", k_dpmpp_2s_ancestral: "DPM++ 2S Ancestral", k_dpmpp_2m: "DPM++ 2M", k_dpmpp_sde: "DPM++ SDE", k_dpmpp_2m_sde: "DPM++ 2M SDE", ddim_v3: "DDIM" };
export var NOISE_SCHEDULES = ["native", "karras", "exponential", "polyexponential"];

// ── 크기(SDStudio resolutionMap) — 1024×1024 넘으면 Anlas가 들어요 ──
export var RESOLUTIONS = {
  portrait: { width: 832, height: 1216, label: "세로" },
  landscape: { width: 1216, height: 832, label: "가로" },
  square: { width: 1024, height: 1024, label: "정사각" },
  small_portrait: { width: 512, height: 768, label: "작은 세로" },
  small_landscape: { width: 768, height: 512, label: "작은 가로" },
  small_square: { width: 640, height: 640, label: "작은 정사각" },
  large_portrait: { width: 1024, height: 1536, label: "큰 세로" },
  large_landscape: { width: 1536, height: 1024, label: "큰 가로" },
  large_square: { width: 1472, height: 1472, label: "큰 정사각" },
  wallpaper_portrait: { width: 1088, height: 1920, label: "배경화면 세로" },
  wallpaper_landscape: { width: 1920, height: 1088, label: "배경화면 가로" }
};
export var SIZES = { portrait: RESOLUTIONS.portrait, landscape: RESOLUTIONS.landscape, square: RESOLUTIONS.square };   // 예전 이름(호환)
export var isFreeSize = (w, h, steps = 28) => w * h <= 1024 * 1024 && steps <= 28;
export function clampSize(w, h) {   // 64 배수, 64~ 범위
  const r = (v) => Math.max(64, Math.min(2048, Math.round((Number(v) || 0) / 64) * 64));
  return { width: r(w), height: r(h) };
}

// ── 품질·네거티브 프리셋(naiQualityPresets) ──
var QUALITY_TAGS = { "4-5-full": ", very aesthetic, masterpiece, no text", "4-5-curated": ", location, masterpiece, no text, -0.8::feet::, rating:general", "4-full": ", no text, best quality, very aesthetic, absurdres", "4-curated": ", rating:general, amazing quality, very aesthetic, absurdres" };
var V5_QUALITY = { standard: "very aesthetic, masterpiece, no text", light: "very aesthetic, amazing quality, no text", none: "" };
export var QUALITY_KO = { standard: "표준", light: "가벼움", none: "없음" };
var V45_HEAVY = "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page";
var V5_HEAVY = "lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page";
var V5_FURRY = "{worst quality}, distracting watermark, unfinished, bad quality, {widescreen}, upscale, {sequence}, {{grandfathered content}}, blurred foreground, chromatic aberration, sketch, everyone, [sketch background], simple, [flat colors], ych (character), outline, multiple scenes, [[horror (theme)]], comic";
var v5Uc = { heavy: V5_HEAVY, light: "lowres, bad hands, bad anatomy, artistic error, sepia, white haze, worst quality, very displeasing, jpeg artifacts, 0::ai-generated::", humanFocus: V5_HEAVY + ", @_@, mismatched pupils, glowing eyes, bad anatomy", furryFocus: V5_FURRY };
var UC_PRESETS = {
  "5-full": v5Uc, "5-full-medium": v5Uc, "5-curated": v5Uc,
  "4-5-full": { heavy: V45_HEAVY, light: "nsfw, lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page", humanFocus: V45_HEAVY + ", @_@, mismatched pupils, glowing eyes, bad anatomy", furryFocus: "nsfw, " + V5_FURRY },
  "4-5-curated": { heavy: "blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page", light: "blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page", humanFocus: "blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page" },
  "4-full": { heavy: "nsfw, blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page", light: "nsfw, blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, white blank page, blank page" },
  "4-curated": { heavy: "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts, white blank page, blank page", light: "blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, logo, dated, signature" }
};
export var UC_KO = { heavy: "강함", light: "약함", humanFocus: "인물 중심", furryFocus: "퍼리 중심", none: "없음" };
export var ucPresetsFor = (model) => ["heavy", "light", "humanFocus", "furryFocus", "none"].filter((k) => k === "none" || UC_PRESETS[model]?.[k] !== undefined);
var effUc = (model, key) => (!key || key === "none" ? "none" : UC_PRESETS[model]?.[key] !== undefined ? key : "none");
export var ucPresetText = (model, key) => { const k = effUc(model, key); return k === "none" ? "" : UC_PRESETS[model]?.[k] ?? ""; };
export function mergeQualityTags(prompt, model, preset, transparent = false) {
  let r = prompt;
  if (transparent) r = r ? `transparent background, ${r}` : "transparent background";
  if (preset === "none") return r;
  if (modelOf(model).v5) { const s = V5_QUALITY[preset]; return s ? (r ? `${r}, ${s}` : s) : r; }
  return r + (QUALITY_TAGS[model] ?? "");
}
export var mergeUcPreset = (uc, model, key) => { const p = ucPresetText(model, key); return !p ? uc : uc ? `${p}, ${uc}` : p; };
var UC_API = { heavy: 0, light: 1, furryFocus: 2, humanFocus: 3, none: 4 };
var UC_HINT = { none: 0, heavy: 2, light: 3, humanFocus: 4, furryFocus: 5 };
var QT_HINT = { standard: 1, light: 3, none: 0 };

// 가중치 숫자 태그 띄어쓰기(promptWeightSpacing): `2::1girl::` → `2:: 1girl::` 처럼 내용이 숫자로 시작·끝나면 공백을 넣어 가중치와 헷갈리지 않게
export function padWeights(text) {
  if (!text || text.indexOf("::") < 0) return text;
  return text.replace(/(-?\d*\.?\d+::)([^:]*?)(::)/g, (all, open, body, close) => {
    if (!body.trim()) return all;
    let b = body;
    if (/^\d/.test(b)) b = " " + b;
    if (/\d$/.test(b)) b = b + " ";
    return open + b + close;
  });
}

export var DEFAULT_SAMPLING = { model: "4-5-full", sampler: "k_euler_ancestral", steps: 28, scale: 5, cfgRescale: 0, noise: "karras", quality: "standard", ucPreset: "heavy", varietyPlus: false, transparent: false, useCoords: false, legacyUc: false, normalizeVibes: true };
export var DEFAULT_UC = V5_HEAVY;   // 예전 이름(호환) — 이제 네거티브는 프리셋(ucPreset)이 앞에 붙는다
export function normalizeSampling(s) {
  const o = { ...DEFAULT_SAMPLING, ...(s && typeof s === "object" ? s : {}) };
  const m = modelOf(o.model);
  o.model = m.id;
  if (!m.samplers.includes(o.sampler)) o.sampler = "k_euler_ancestral";
  o.steps = Math.max(1, Math.min(m.maxSteps ?? 50, Math.round(Number(o.steps) || 28)));
  o.scale = Math.max(0, Math.min(m.maxScale ?? 10, Number(o.scale) || 0));
  o.cfgRescale = Math.max(0, Math.min(1, Number(o.cfgRescale) || 0));
  if (!NOISE_SCHEDULES.includes(o.noise)) o.noise = "karras";
  if (!(o.quality in QUALITY_KO)) o.quality = "standard";
  if (!ucPresetsFor(m.id).includes(o.ucPreset)) o.ucPreset = "heavy";
  for (const k of ["varietyPlus", "transparent", "useCoords", "legacyUc", "normalizeVibes"]) o[k] = !!o[k];
  return o;
}

// 생성 요청 본문. action: generate | img2img | infill.  chars: [{ prompt, uc, x, y }]  vibes: [{ image(인코딩된 base64), strength }]
// refs(캐릭터 레퍼런스): [{ image, strength, fidelity, type, info }]  image/mask: base64(PNG)
export function buildGenerateBody({ prompt, uc = "", width = 832, height = 1216, size, seed, settings, action = "generate", image, mask, strength = 0.7, noise = 0, addOriginal = true, chars = [], vibes = [], refs = [] } = {}) {
  const p = String(prompt ?? "").trim();
  if (!p) throw new Error("프롬프트를 적어 주세요");
  if (size && RESOLUTIONS[size]) ({ width, height } = RESOLUTIONS[size]);
  const s = normalizeSampling(settings);
  const m = modelOf(s.model), isV5 = m.v5, fixed = m.fixed;
  const sampler = fixed ? fixed.sampler : s.sampler;
  const quality = isV5 ? s.quality : s.quality === "none" ? "none" : "standard";
  const transparent = isV5 && m.transparent && s.transparent;
  const finalPrompt = padWeights(mergeQualityTags(p, m.id, quality, transparent));
  const ucKey = fixed ? fixed.uc : s.ucPreset;
  const finalUc = fixed ? ucPresetText(m.id, fixed.uc) : padWeights(mergeUcPreset(String(uc ?? ""), m.id, s.ucPreset));
  const sd = Number.isInteger(seed) && seed > 0 ? seed >>> 0 : 1 + Math.floor(Math.random() * 0xfffffffe);
  const caption = (text) => ({ caption: { base_caption: text, char_captions: [] } });
  let parameters;
  if (isV5) {
    parameters = {
      params_version: 4, width, height, noise_schedule: m.forcedNoise, scale: Math.min(s.scale, m.maxScale ?? s.scale), sampler,
      steps: fixed ? fixed.steps : Math.min(s.steps, m.maxSteps ?? s.steps), noise, seed: sd, n_samples: 1, negative_prompt: finalUc, strength, characterPrompts: [],
      use_coords: s.useCoords, cfg_rescale: s.cfgRescale, skip_cfg_above_sigma: null, prefer_brownian: sampler === "k_euler_ancestral", deliberate_euler_ancestral_bug: false,
      tag_hint_qt: QT_HINT[quality], tag_hint_uc_preset: UC_HINT[effUc(m.id, ucKey)], tag_hint_transparent_background: transparent,
      v4_prompt: { ...caption(finalPrompt), use_coords: s.useCoords, use_order: true }, v4_negative_prompt: caption(finalUc)
    };
    if (m.noCfgRescale) delete parameters.cfg_rescale;
  } else {
    parameters = {
      params_version: 3, width, height, noise_schedule: s.noise, controlnet_strength: 1, dynamic_thresholding: false, scale: s.scale, sampler, steps: s.steps,
      noise, seed: sd, n_samples: 1, ucPreset: UC_API[effUc(m.id, s.ucPreset)], negative_prompt: finalUc, strength, qualityToggle: quality !== "none", characterPrompts: [],
      use_coords: s.useCoords, legacy: false, legacy_v3_extend: false, prefer_brownian: true, autoSmea: false, legacy_uc: s.legacyUc, inpaintImg2ImgStrength: strength,
      cfg_rescale: s.cfgRescale, add_original_image: addOriginal, normalize_reference_strength_multiple: s.normalizeVibes, skip_cfg_above_sigma: null,
      v4_prompt: { ...caption(finalPrompt), use_coords: s.useCoords, use_order: true }, v4_negative_prompt: { ...caption(finalUc), legacy_uc: s.legacyUc }
    };
  }
  const body = { input: finalPrompt, model: action === "infill" ? m.inpaint : m.gen, action, parameters };
  if (isV5) body.use_new_shared_trial = true;
  if (isV5 && action === "infill") parameters.add_original_image = addOriginal;
  const vs = (vibes ?? []).filter((v) => v?.image);
  if (!isV5 && vs.length) {
    parameters.reference_image_multiple = vs.map((v) => v.image);
    let st = vs.map((v) => Number(v.strength ?? 0.6));
    if (s.normalizeVibes && st.length > 1) { const sum = st.reduce((a, b) => a + b, 0) || 1; st = st.map((x) => x / sum); }
    parameters.reference_strength_multiple = st;
  }
  const rs = (refs ?? []).filter((r) => r?.image);
  if (!isV5 && rs.length) {
    parameters.director_reference_images = rs.map((r) => r.image);
    parameters.director_reference_descriptions = rs.map((r) => ({ ...caption(r.type || "character"), legacy_uc: s.legacyUc }));
    parameters.director_reference_strength_values = rs.map((r) => r.strength ?? 0.6);
    parameters.director_reference_secondary_strength_values = rs.map((r) => 1 - (r.fidelity ?? 1));
    parameters.director_reference_information_extracted = rs.map((r) => r.info ?? 1);
  }
  if (image) parameters.image = image;
  if (mask) parameters.mask = mask;
  if (action === "infill") {
    parameters.img2img = { strength, begin_from_sigma: null, noise: 0, extra_noise_seed: sd, color_correct: true };
    if (sampler === "ddim_v3") parameters.sampler = "k_euler_ancestral";
  }
  if (action === "img2img") parameters.img2img = { strength, begin_from_sigma: null, noise, extra_noise_seed: sd, color_correct: true };
  if (sampler === "k_euler_ancestral") parameters.deliberate_euler_ancestral_bug = false;
  if (!isV5 && s.varietyPlus && !rs.length) {
    const coef = m.id.startsWith("4-5") ? 58 : m.id.startsWith("4-") ? 19 : 0;
    parameters.skip_cfg_above_sigma = coef * Math.sqrt((width * height) / (832 * 1216));
  }
  const cs = (chars ?? []).map((c) => ({ prompt: padWeights(String(c?.prompt ?? "")), uc: fixed ? "" : padWeights(String(c?.uc ?? "")), center: s.useCoords && Number.isFinite(c?.x) ? { x: c.x, y: c.y } : { x: 0.5, y: 0.5 } }))
    .filter((c) => c.prompt.trim()).slice(0, m.maxChars ?? 99);
  if (cs.length) {
    parameters.characterPrompts = cs;
    parameters.v4_prompt.caption.char_captions = cs.map((c) => ({ char_caption: c.prompt, centers: [c.center] }));
    parameters.v4_negative_prompt.caption.char_captions = cs.map((c) => ({ char_caption: c.uc, centers: [c.center] }));
  }
  return body;
}

// 디렉터 도구(augment-image): 배경 지우기·선화·스케치·채색·표정 바꾸기·정리
export var AUGMENTS = { "bg-removal": "배경 지우기", lineart: "선화", sketch: "스케치", colorize: "채색", emotion: "표정 바꾸기", declutter: "정리(글자·잡것 지우기)" };
export var EMOTIONS = ["neutral", "happy", "sad", "angry", "scared", "surprised", "tired", "excited", "nervous", "thinking", "confused", "shy", "disgusted", "smug", "bored", "laughing", "irritated", "aroused", "embarrassed", "worried", "love", "determined", "hurt", "playful"];
export function buildAugmentBody({ method, image, width, height, prompt = "", emotion = "neutral", defry = 0 }) {
  if (!AUGMENTS[method]) throw new Error("알 수 없는 디렉터 도구예요");
  const body = { image, req_type: method, width, height };
  if (method === "colorize" || method === "emotion") { body.prompt = method === "emotion" ? `${emotion};;${prompt}` : prompt; body.defry = defry; }
  return body;
}
export var UPSCALE_MODEL = "nai-diffusion-5-curated";
export function upscaleCost(w, h) {
  const px = w * h;
  if (!(w > 0 && h > 0) || px > 3145728) throw new Error("업스케일은 3,145,728픽셀 이하 그림만 돼요");
  return px <= 1048576 ? 1 : px <= 1747627 ? 2 : px <= 2446678 ? 3 : 4;
}
export var buildUpscaleBody = (image) => ({ image, model: UPSCALE_MODEL, declared_blur_sigma: 0 });
export var buildEncodeVibeBody = (image, info, model) => ({ image, model: modelOf(model).gen, information_extracted: info });

// 응답 zip의 첫 항목(또는 last: 마지막). NAI zip은 데이터 기술자(flags bit3)라 로컬 머리 크기가 0 → 중앙 디렉터리에서 읽는다.
export function readZipFirst(u8, inflate, { last = false } = {}) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (u8.length < 30 || dv.getUint32(0, true) !== 0x04034b50) throw new Error("받은 파일이 zip이 아니에요");
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  let local = 0, method = dv.getUint16(8, true), csize = dv.getUint32(18, true);
  if (eocd >= 0) {
    const n = dv.getUint16(eocd + 10, true);
    let cd = dv.getUint32(eocd + 16, true);
    if (cd + 46 > u8.length || dv.getUint32(cd, true) !== 0x02014b50) throw new Error("zip 목록이 깨졌어요");
    for (let k = 0; k < (last ? n : 1); k++) {
      if (dv.getUint32(cd, true) !== 0x02014b50) break;
      method = dv.getUint16(cd + 10, true); csize = dv.getUint32(cd + 20, true); local = dv.getUint32(cd + 42, true);
      cd += 46 + dv.getUint16(cd + 28, true) + dv.getUint16(cd + 30, true) + dv.getUint16(cd + 32, true);
    }
  } else if (dv.getUint16(6, true) & 8 || !csize) throw new Error("zip 끝을 찾지 못했어요(받다 끊겼을 수 있어요)");
  const nlen = dv.getUint16(local + 26, true), xlen = dv.getUint16(local + 28, true);
  const start = local + 30 + nlen + xlen;
  if (start + csize > u8.length) throw new Error("zip 내용이 잘렸어요");
  const raw = u8.subarray(start, start + csize);
  const data = method === 0 ? raw.slice() : method === 8 ? inflate(raw) : null;
  if (!data) throw new Error(`zip 압축 방식 ${method}은 못 풀어요`);
  return { name: new TextDecoder().decode(u8.subarray(local + 30, local + 30 + nlen)), data };
}
export var isPng = (u8) => u8?.[0] === 0x89 && u8?.[1] === 0x50 && u8?.[2] === 0x4e && u8?.[3] === 0x47;
export function pngSize(u8) {   // PNG IHDR에서 가로·세로
  if (!isPng(u8) || u8.length < 24) return null;
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

// 에셋 자리: 봇 = 추가 에셋·감정 이미지, 모듈 = assets
export var assetSlotsOf = (kind) => (kind === "module" ? ["assets"] : ["additionalAssets", "emotionImages"]);
var ALL_SLOTS = ["additionalAssets", "emotionImages", "assets"];
export function uniqueAssetName(target, slot, wanted) {
  const base = String(wanted ?? "").trim() || "image";
  const used = new Set(ALL_SLOTS.flatMap((k) => (target?.[k] ?? []).map((a) => String(a?.[0] ?? "").toLowerCase())));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}_${n}`.toLowerCase())) return `${base}_${n}`;
}
export function withAsset(target, slot, name, path, ext = "png") {
  if (!ALL_SLOTS.includes(slot)) throw new Error(`알 수 없는 에셋 자리예요: ${slot}`);
  const item = slot === "emotionImages" ? [name, path] : [name, path, ext];
  return { ...target, [slot]: [...(target?.[slot] ?? []), item] };
}
