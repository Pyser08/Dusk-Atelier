// 스킬 저장소·가져오기·주입 공급자 (v1.8.1). 추가 AI 호출 없음. 실패해도 기억 흐름을 막지 않는다(주입 없이 진행).
import { zipSync, strToU8 } from "../vendor/fflate.js";
import { readZipDirectory, readZipEntry } from "../engine/formats/zip.js";
import { normalizeSkillLibrary, skillSetFromEntries, applySkillSetImport, parseSkillExport, exportSkillSet, exportSkillLibrary, skillLibraryChars, SKILL_LIMITS } from "../engine/skills.js";
import { normalizeSkillCfg, stageInjection, injectionBlock } from "../engine/skillcfg.js";

export const SKILL_LIB_KEY = "dusk.skills.v1", SKILL_CFG_KEY = "dusk.skills.cfg.v1";
export const COCOA_LIB_KEY = "risu_agents_skill_library_v1";   // 코코아전트가 쓰던 키(있으면 1회 가져오기 제안)
const parse = (raw) => { try { return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null; } catch { return null; } };

export function createSkillStore(api, { log = (...a) => console.log("[Dusk 스킬]", ...a) } = {}) {
  let lib = null, cfg = null; const cache = new Map();
  const ps = () => api.pluginStorage;
  async function getLibrary() { if (!lib) lib = normalizeSkillLibrary(parse(await ps().getItem(SKILL_LIB_KEY))); return lib; }
  async function getCfg() { if (!cfg) cfg = normalizeSkillCfg(parse(await ps().getItem(SKILL_CFG_KEY))); return cfg; }
  async function saveLibrary(next) {
    const n = normalizeSkillLibrary(next);
    if (skillLibraryChars(n) > SKILL_LIMITS.libraryChars) throw new Error(`스킬 라이브러리가 너무 커요 (최대 ${SKILL_LIMITS.libraryChars}자).`);
    await ps().setItem(SKILL_LIB_KEY, JSON.stringify(n)); lib = n; cache.clear(); return n;
  }
  async function saveCfg(next) { const n = normalizeSkillCfg(next); await ps().setItem(SKILL_CFG_KEY, JSON.stringify(n)); cfg = n; cache.clear(); return n; }

  // 단계에 붙일 글. 꺼짐·할당 없음·오류면 "" (프롬프트 원문 유지).
  async function blockFor(stage) {
    try {
      if (cache.has(stage)) return cache.get(stage);
      const c = await getCfg(); if (!c.on) return "";
      const inj = stageInjection(c, await getLibrary(), stage), block = injectionBlock(inj);
      inj?.warnings?.forEach((w) => log(w));
      cache.set(stage, block); return block;
    } catch (e) { log("주입 글 만들기 실패", e?.message ?? e); return ""; }
  }
  async function previewFor(stage) { const c = await getCfg(), inj = stageInjection({ ...c, on: true }, await getLibrary(), stage); return { block: injectionBlock(inj), inj }; }

  // zip 파일(Blob/File) → 세트(미리보기). 항목 수 상한으로 zip 폭탄을 막는다.
  async function readZipFile(file) {
    const entries = await readZipDirectory(file);
    if (entries.length > SKILL_LIMITS.zipEntries) throw new Error(`zip 안의 파일이 너무 많아요 (최대 ${SKILL_LIMITS.zipEntries}개).`);
    const out = [];
    for (const e of entries) {
      if (e.size > SKILL_LIMITS.fileChars * 8) continue;  // 큰 파일은 어차피 잘리므로 읽지 않음
      out.push({ path: e.name, bytes: await readZipEntry(file, e) });
    }
    return skillSetFromEntries(file.name, out);
  }
  // 파일(zip 또는 json) 가져오기 → { sets|library, warnings }. 적용은 importSet/importLibrary.
  async function readFile(file) {
    if (/\.zip$/i.test(file.name)) { const r = await readZipFile(file); return { kind: "set", set: r.set, warnings: r.warnings }; }
    const r = parseSkillExport(await file.text());
    if (r.error) throw new Error(r.error);
    return r.set ? { kind: "set", set: r.set, warnings: [] } : { kind: "library", library: r.library, warnings: [] };
  }
  async function importSet(set, mode) { const r = applySkillSetImport(await getLibrary(), set, mode); if (r.changed) await saveLibrary(r.library); return r; }
  async function importLibrary(incoming, mode = "new") {
    let cur = await getLibrary(), n = 0;
    for (const s of incoming.sets) { const r = applySkillSetImport(cur, s, mode); if (r.changed) { cur = r.library; n++; } }
    if (n) await saveLibrary(cur); return { count: n };
  }
  // 코코아전트가 같은 저장소에 남긴 라이브러리가 있으면 읽어 온다(자동 적용 안 함 — 화면에서 확인 후 importLibrary).
  async function detectCocoa() {
    try { const o = parse(await ps().getItem(COCOA_LIB_KEY)); const l = normalizeSkillLibrary(o); return l.sets.length ? l : null; } catch { return null; }
  }
  const zipOfSet = (set) => zipSync(Object.fromEntries(set.files.map((f) => [`${set.name}/${f.path}`, strToU8(f.content)])));
  return { getLibrary, getCfg, saveLibrary, saveCfg, blockFor, previewFor, readFile, importSet, importLibrary, detectCocoa, zipOfSet,
    exportSet: (set) => JSON.stringify(exportSkillSet(set), null, 2), exportLibrary: async () => JSON.stringify(exportSkillLibrary(await getLibrary()), null, 2) };
}
