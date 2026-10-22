import { HASH_KEY } from './hash.js';

var DECOR = /[\s　_\-–—~·•|/\\:;,.!?'"`“”‘’「」『』【】〔〕<>《》()[\]{}♡♥❤☆★✦✧◆◇○●◎※♪♬#*+=^]+/g;
var VERSION_WORDS = /(?:^|[\s_\-(\[【])(?:최종|수정본?|최신|업데이트|update[d]?|fix(?:ed)?|final|new|latest|patch(?:ed)?|hotfix)(?=$|[\s_\-)\]】])/gi;
export function normalizeName(name) {
  let s = String(name ?? "").normalize("NFKC").toLowerCase();
  s = s.replace(/[(\[【{](?:\s*(?:v|ver|version|버전|vol)\.?\s*[\d.]+[a-z]?\s*)[)\]】}]/gi, " ");
  s = s.replace(/(?:^|[\s_\-])(?:v|ver|version|버전)\.?\s*\d+(?:\.\d+)*(?=$|[\s_\-)\]】])/gi, " ");
  s = s.replace(VERSION_WORDS, " ");
  s = s.replace(/(?:^|[\s_\-])\d+(?:\.\d+)+(?=$|[\s_\-)\]】])/g, " ");
  return s.replace(DECOR, "");
}
export function stripTrailingNumber(norm) {
  return norm.replace(/(?:v|ver|vol)?\d+$/i, "");
}
function moduleHashes(mod) {
  const set = /* @__PURE__ */ new Set();
  for (const a of mod.assets ?? []) {
    const m = HASH_KEY.exec(String(a?.[1] ?? ""));
    if (m) set.add(m[1]);
  }
  return set;
}
export function findCandidates(existingModules, incomingMod, incomingHashes) {
  const inNorm = normalizeName(incomingMod.name);
  const inLoose = stripTrailingNumber(inNorm);
  const out = [];
  existingModules.forEach((mod, index) => {
    if (!mod || typeof mod !== "object") return;
    const reasons = [];
    let score = 0;
    const exNorm = normalizeName(mod.name);
    if (inNorm && exNorm === inNorm) {
      score += 50;
      reasons.push(mod.name === incomingMod.name ? "이름이 같음" : "버전 표시를 빼면 이름이 같음");
    } else if (inLoose && inLoose.length >= 2 && stripTrailingNumber(exNorm) === inLoose) {
      score += 20;
      reasons.push("이름 끝 숫자만 다름");
    }
    if (incomingMod.namespace && mod.namespace && incomingMod.namespace === mod.namespace) {
      score += 30;
      reasons.push("네임스페이스가 같음");
    }
    const ex = moduleHashes(mod);
    if (incomingHashes.size >= 5 && ex.size >= 5) {
      let shared = 0;
      for (const h2 of incomingHashes) if (ex.has(h2)) shared++;
      const ratio = shared / Math.min(incomingHashes.size, ex.size);
      if (ratio >= 0.5) {
        score += 40;
        reasons.push(`에셋 ${Math.round(ratio * 100)}% 겹침 (${shared}개)`);
      } else if (shared > 0 && score > 0) reasons.push(`에셋 ${shared}개 겹침`);
    }
    if (score <= 0) return;
    const confidence = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
    out.push({ index, module: mod, score, confidence, reasons });
  });
  return out.sort((a, b) => b.score - a.score);
}
