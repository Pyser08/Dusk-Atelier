// 봇빌더(risu_story_workshop) 연동 — 순수 함수 (v1.8.1)
// 'AI로 봇 만들기'로 봇빌더를 열 때 그때의 봇 목록을 적어 두고(인계), Dusk로 돌아왔을 때 새로 생긴 봇·작업한 봇을 찾는다.
export const WORKSHOP_PLUGIN = "risu_story_workshop";
export const WORKSHOP_INTEROP_ID = "risu-story-workshop";
export const HANDOFF_TTL = 24 * 3600e3;
// 봇빌더가 편집하는 필드 (봇빌더 FIELDS와 같음). 새 봇을 만들 때 이것만 옮긴다.
export const WORKSHOP_FIELDS = ["name", "image", "desc", "personality", "scenario", "systemPrompt", "postHistoryInstructions", "exampleMessage", "creatorNotes", "creator", "characterVersion", "tags", "firstMessage", "alternateGreetings", "globalLore", "customscript", "triggerscript", "defaultVariables", "additionalAssets", "ccAssets"];
const ARRAYS = new Set(["tags", "alternateGreetings", "globalLore", "customscript", "triggerscript", "additionalAssets", "ccAssets"]);
const DANGER = new Set(["__proto__", "prototype", "constructor"]);

export function makeHandoff(chars, now = Date.now()) {
  return { v: 1, at: now, ids: [...new Set((chars ?? []).map((c) => c?.chaId).filter(Boolean))] };
}
export const handoffAlive = (h, now = Date.now()) => !!h && h.v === 1 && Array.isArray(h.ids) && now - (Number(h.at) || 0) <= HANDOFF_TTL;

// 인계 뒤에 새로 생긴 일반 봇 (휴지통·그룹 제외)
export function newBotsSince(h, chars) {
  if (!h || !Array.isArray(h.ids)) return [];
  const before = new Set(h.ids);
  return (chars ?? []).filter((c) => c?.chaId && !before.has(c.chaId) && !c.trashTime && (!c.type || c.type === "character"));
}

// 봇빌더 원고 → 새 봇에 덮어쓸 필드 (형식이 맞는 것만)
export function draftFields(draft) {
  const out = {};
  if (!draft || typeof draft !== "object") return out;
  for (const f of WORKSHOP_FIELDS) {
    if (!Object.hasOwn(draft, f) || DANGER.has(f)) continue;
    const v = draft[f];
    if (ARRAYS.has(f)) { if (Array.isArray(v)) out[f] = structuredClone(v); }
    else if (typeof v === "string") out[f] = v;
  }
  if (Array.isArray(out.globalLore)) out.globalLore = out.globalLore.filter((l) => l && typeof l.key === "string" && typeof l.content === "string");
  if (Array.isArray(out.customscript)) out.customscript = out.customscript.filter((r) => r && typeof r.in === "string" && typeof r.out === "string");
  return out;
}
// 옮길 만한 내용이 있는 원고인지 (이름만 기본값인 빈 원고는 아님)
export function draftHasContent(d) {
  const f = draftFields(d?.draft ?? d);
  return !!(String(f.desc ?? "").trim() || String(f.firstMessage ?? "").trim() || String(f.personality ?? "").trim() || (f.globalLore?.length ?? 0) || (f.customscript?.length ?? 0) || (f.triggerscript?.length ?? 0) || (f.alternateGreetings?.length ?? 0));
}

// 돌아왔을 때 할 일 정하기 → { add: [chaId...], draft: 원고|null }
//   ① 인계 뒤 새로 생긴 봇 → 개발 목록에 넣기
//   ② 봇빌더가 기존 봇을 편집 중이었다면(targetId) 그 봇도 넣기
//   ③ 새 봇도 없고 원고가 저장 안 된 새 작업이면 → 원고로 봇을 만들지 물어보기
export function planReturn(h, chars, draft = null) {
  if (!handoffAlive(h)) return { add: [], draft: null };
  const fresh = newBotsSince(h, chars).map((c) => c.chaId);
  const add = [...fresh];
  const tid = draft?.targetId;
  if (tid && (chars ?? []).some((c) => c?.chaId === tid) && !add.includes(tid)) add.push(tid);
  const offer = !fresh.length && !tid && draft?.started && draftHasContent(draft) ? draft : null;
  return { add, draft: offer };
}
