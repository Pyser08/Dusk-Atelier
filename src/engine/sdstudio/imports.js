// 에셋 제작 — 원본 SDStudio 파일 가져오기(순수). 조각 모음(.json — 한 모음·옛 형식·전역 조각 백업·프로젝트 library, .txt 와일드카드),
// 캐릭터 프리셋(.json → 캐릭터 카드), PNG 메타데이터(NAI Comment·SDStudio v1 → 프롬프트 칸).
var str = (v, n = 8000) => String(v ?? "").slice(0, n);
var cleanName = (s) => String(s ?? "").replace(/[.<>,]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
var normLib = (l) => {
  if (!l || typeof l !== "object") return null;
  const name = cleanName(l.name ?? l.description);
  if (!name || !l.pieces) return null;
  const multi = l.multi && typeof l.multi === "object" ? l.multi : {};
  const list = Array.isArray(l.pieces) ? l.pieces : Object.entries(l.pieces).map(([k, v]) => ({ name: k, prompt: v, multi: multi[k] }));   // 옛 형식(version 없음)
  const pieces = list.filter((p) => p && cleanName(p.name)).map((p) => ({ name: cleanName(p.name), prompt: str(p.prompt), multi: !!p.multi }));
  return { name, pieces };
};
// → { libs:[...] } 또는 { wild:{ name, prompt, multi:true } }
export function parsePieceFile(fileName, text) {
  if (/\.txt$/i.test(fileName)) {
    const lines = String(text).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    if (!lines.length) throw new Error("파일이 비어 있어요");
    return { wild: { name: cleanName(fileName.replace(/\.txt$/i, "")) || "조각", prompt: lines.join("\n"), multi: lines.length > 1 } };
  }
  let j;
  try { j = JSON.parse(text); } catch { throw new Error("JSON을 읽지 못했어요"); }
  const one = normLib(j);
  if (one) return { libs: [one] };
  const src = j?.library && typeof j.library === "object" ? j.library : j;   // 프로젝트(세션) JSON이면 library
  const libs = (Array.isArray(src) ? src : Object.entries(src ?? {}).map(([k, v]) => (v && typeof v === "object" ? { ...v, name: v.name ?? k } : null))).map(normLib).filter(Boolean);
  if (!libs.length) throw new Error("조각 모음 JSON이 아니에요");
  return { libs };
}
var uniq = (want, used) => { if (!used.has(want)) return want; for (let i = 2; ; i++) if (!used.has(`${want}_${i}`)) return `${want}_${i}`; };
// 같은 이름 모음은 이름_2 로 더함(원본처럼 덮어쓰지 않음)
export function addPieceLibs(have, libs) {
  const out = [...(have ?? [])], used = new Set(out.map((l) => l.name)), names = [];
  for (const l of libs) { const name = uniq(l.name, used); used.add(name); names.push(name); out.push({ ...l, name }); }
  return { pieces: out, names };
}
// 와일드카드 .txt → group(없으면 만듦) 안 조각
export function addWildcard(have, wild, group = "wildcards") {
  const g = cleanName(group) || "wildcards", out = (have ?? []).map((l) => ({ ...l, pieces: [...l.pieces] }));
  let lib = out.find((l) => l.name === g);
  if (!lib) { lib = { name: g, pieces: [] }; out.push(lib); }
  const name = uniq(wild.name, new Set(lib.pieces.map((p) => p.name)));
  lib.pieces.push({ name, prompt: wild.prompt, multi: wild.multi });
  return { pieces: out, group: g, name };
}
export function piecesFile(lib) { return JSON.stringify({ version: 1, name: lib.name, pieces: lib.pieces.map((p) => ({ name: p.name, prompt: p.prompt, multi: !!p.multi })) }, null, 1); }

// 캐릭터 프리셋(.json { version, presets:[{ name, characterPrompt, characterUC, backgroundPrompt }] }) → [{ name, prompt }]
export function parseCharPresets(text) {
  let j;
  try { j = JSON.parse(text); } catch { throw new Error("JSON을 읽지 못했어요"); }
  const list = Array.isArray(j?.presets) ? j.presets : Array.isArray(j) ? j : null;
  if (!list) throw new Error("캐릭터 프리셋 파일이 아니에요");
  return list.filter((p) => p && typeof p === "object").map((p) => ({ name: str(p.name, 80).trim() || "캐릭터", prompt: str(p.characterPrompt ?? p.prompt) }));
}

// PNG 글자 칸(tEXt·iTXt 압축 안 된 것)
function pngTexts(b) {
  const out = {};
  if (!(b?.[0] === 0x89 && b[1] === 0x50)) return out;
  const be32 = (p) => ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0;
  const lat = new TextDecoder("latin1"), utf = new TextDecoder();
  for (let p = 8; p + 12 <= b.length;) {
    const len = be32(p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]), d = b.subarray(p + 8, p + 8 + len);
    if (type === "tEXt" || type === "iTXt") {
      const z = d.indexOf(0), key = lat.decode(d.subarray(0, z));
      if (type === "tEXt") out[key] = utf.decode(d.subarray(z + 1));
      else if (!d[z + 1]) { let q = d.indexOf(0, z + 3) + 1; q = d.indexOf(0, q) + 1; out[key] = utf.decode(d.subarray(q)); }
    }
    if (type === "IEND") break;
    p += 12 + len;
  }
  return out;
}
var join = (...a) => a.map((x) => String(x ?? "").trim()).filter(Boolean).join(", ");
// → { top, back, neg, middle, seed } | null. SDStudio v1 메타가 있으면 구획대로, 없으면 NAI 통합 프롬프트를 상위로
export function readPngPrompt(bytes) {
  const t = pngTexts(bytes);
  let nai = null, sds = null;
  try { nai = t.Comment ? JSON.parse(t.Comment) : null; } catch { /* 없음 */ }
  try { sds = t.SDStudio?.startsWith("v1:") ? JSON.parse(t.SDStudio.slice(3)) : null; } catch { /* 없음 */ }
  const ps = sds?.promptSource;
  if (ps && typeof ps.frontPrompt === "string") return { top: join(ps.frontPrompt, ps.extraPrompt, ps.characterPrompt), middle: str(ps.middlePrompt), back: join(ps.backgroundPrompt, ps.backPrompt), neg: str(nai?.uc ?? nai?.negative_prompt), seed: Number.isFinite(nai?.seed) ? nai.seed : null, split: true };
  const prompt = nai?.prompt ?? t.Description;
  if (typeof prompt !== "string") return null;
  return { top: str(prompt), middle: "", back: "", neg: str(nai?.uc ?? nai?.negative_prompt), seed: Number.isFinite(nai?.seed) ? nai.seed : null, split: false };
}

// 글로벌 프리셋(그림체 프리셋) — global_presets.json { version, presets:[{ name, workflowType, preset:{ frontPrompt, backPrompt, uc, steps, promptGuidance, cfgRescale, sampling, noiseSchedule, characterPrompts, varietyPlus, useCoords } }] }
// → 우리 프리셋 [{ name, at, settings:{ top, back, neg, sampling, chars } }] (이미지 생성 계열만)
export function presetFromSD(entry, base = {}) {
  const pre = entry?.preset ?? entry ?? {};
  const samp = { ...(base.sampling ?? {}) };
  if (Number.isFinite(pre.steps)) samp.steps = pre.steps;
  if (Number.isFinite(pre.promptGuidance)) samp.scale = pre.promptGuidance;
  if (Number.isFinite(pre.cfgRescale)) samp.cfgRescale = pre.cfgRescale;
  if (typeof pre.sampling === "string") samp.sampler = pre.sampling;
  if (typeof pre.noiseSchedule === "string") samp.noise = pre.noiseSchedule;
  for (const k of ["varietyPlus", "useCoords"]) if (typeof pre[k] === "boolean") samp[k] = pre[k];
  const settings = { top: str(pre.frontPrompt), back: str(pre.backPrompt), neg: str(pre.uc), sampling: samp };
  if (Array.isArray(pre.characterPrompts) && pre.characterPrompts.length) settings.chars = pre.characterPrompts.filter((c) => c && typeof c === "object").map((c) => ({ prompt: str(c.prompt), uc: str(c.uc), x: Number(c.position?.x) || 0.5, y: Number(c.position?.y) || 0.5, on: c.enabled !== false }));
  return { name: str(entry?.name, 80).trim() || "SDStudio 프리셋", at: Number(entry?.updatedAt) || Date.now(), settings };
}
export function parseGlobalPresets(text, base) {
  let j;
  try { j = typeof text === "string" ? JSON.parse(text) : text; } catch { throw new Error("JSON을 읽지 못했어요"); }
  const list = Array.isArray(j?.presets) ? j.presets : Array.isArray(j) ? j : null;
  if (!list) throw new Error("글로벌 프리셋 파일이 아니에요");
  return list.filter((e) => e && (!e.workflowType || /^SDImageGen/.test(e.workflowType))).map((e) => presetFromSD(e, base));
}
// 같은 이름은 이름 2로 더함
export function addPresets(have, add) {
  const out = [...(have ?? [])], used = new Set(out.map((x) => x.name)), names = [];
  for (const p of add) { let n = p.name; for (let i = 2; used.has(n); i++) n = `${p.name} ${i}`; used.add(n); names.push(n); out.push({ ...p, name: n }); }
  return { list: out, names };
}
