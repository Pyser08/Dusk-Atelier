// 인물 성별(순수): 이 채팅 장기기억 폴더(folder.gender[문서 id 또는 actor:user])에 둔다. 성감대 모형·무작위 성감대가 쓴다.
// 순서: 이 채팅에 저장된 값(직접 고침·이야기에서 바뀜) → Erosync에서 옮긴 값(folder.orient) → 모름(null).
// 직접 고친 값(by:"user")은 잠겨서 기록기 보고로 바뀌지 않는다. 이야기에서 몸이 바뀌면(sex 줄) 그 턴에 바로 바뀐다.
const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
export const normG = (v) => { const s = String(v ?? "").trim().toLowerCase(); return /^(m|male|man|남|남자|남성)$/.test(s) ? "m" : /^(f|female|woman|여|여자|여성)$/.test(s) ? "f" : null; };

export function genderOf(f, doc) {
  if (!doc) return null;
  const g = f?.gender?.[doc.id]?.g;
  if (g === "m" || g === "f") return g;
  for (const n of [doc.title, ...(doc.aliases ?? [])]) { const o = f?.orient?.[nk(n)]?.g; if (o === "m" || o === "f") return o; }
  return null;
}
// by: "user"(직접, 잠금) | "story"(이야기에서 바뀜) | "persona"(페르소나 설명에서 읽음). 반환: 바뀌었으면 true
export function setGender(f, id, g0, { by = "story", quote = "", at = new Date().toISOString() } = {}) {
  if (!f || !id) return false;
  if (g0 === null) { if (!f.gender?.[id]) return false; delete f.gender[id]; return true; }   // '자동': 저장값(잠금 포함)을 지우고 Erosync·이야기 값을 따른다
  const g = normG(g0);
  if (!g) return false;
  const cur = f.gender?.[id];
  if (cur?.by === "user" && by !== "user") return false;
  if (by === "persona" && cur) return false;   // 처음 값으로만
  if (cur?.g === g && (cur?.by === by || by !== "user")) return false;
  f.gender ??= {};
  f.gender[id] = { g, by, at, ...(quote ? { quote: String(quote).slice(0, 160) } : {}), ...(cur?.g && cur.g !== g ? { prev: cur.g } : {}) };
  return true;
}
// 페르소나·성격 글에서 성별 짐작(분명할 때만)
export function guessGender(text) {
  const t = String(text ?? "");
  const m = (t.match(/남자|남성|소년|청년|아저씨|\bmale\b|\bman\b|\bboy\b|\bhe\b|\bhis\b|\bhim\b/gi) ?? []).length;
  const w = (t.match(/여자|여성|소녀|아가씨|\bfemale\b|\bwoman\b|\bgirl\b|\bshe\b|\bher\b/gi) ?? []).length;
  return m > w * 2 && m ? "m" : w > m * 2 && w ? "f" : null;
}
