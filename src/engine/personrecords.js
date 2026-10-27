// 인물 항목 직접 추가·편집·삭제(리수폿 people-records-ui · npc-emotion-ui 대응, 순수 함수).
// 검증은 리수폿 규칙(engine/pot/people-records.js)이 그대로 한다 — 고정된 항목 거절, 편집 중 바뀐 항목 거절, 중복 대상 거절, NPC 감정 형식 검사.
// 여기서는 화면이 쓸 항목 종류 표·묶음 판별·목록 만들기만 더한다.
import { updatePersonRecord, deletePersonItem } from "./pot/people-records.js";
import { NPC_EMOTION_SLOT, NPC_EMOTION_LIMIT, npcEmotionParts } from "./pot/npc-emotion.js";
import { scopeKeyOf } from "./personedit.js";

// 대상: none(대상 없음) · user(나) · npc(다른 인물 1명) · required(대상 필수: 나 또는 인물) · optional(대상은 선택)
export const RECORD_GROUPS = [
  { id: "overview", label: "인물 개요", max: 700, slots: [["core.identity", "기본정보", "none", 700], ["core.relationship", "확인된 관계", "required", 900]] },
  { id: "behavior", label: "행동 경향", max: 900, slots: [["core.behavior", "기본 행동 경향", "optional"], ["core.current_state", "현재 상태", "none"], ["affinity.surface_actual", "겉으로 보이는 행동과 실제 목적", "required"], ["affinity.behavior.qualitative", "호감에 따른 행동", "required"], ["register.restraint", "감정과 표현의 절제", "required"]] },
  { id: "relationship", label: "관계 태도·인지 차이", max: 900, slots: [["register.context", "관계·지위·상황", "required"], ["register.stage_assessment", "관계 단계 판단", "required"], ["register.knowledge_gap", "서로 아는 정보의 차이", "required"], ["affinity.intent", "관심과 관계 의도", "required"], ["affinity.stance", "상대를 해석하고 대하는 태도", "required"], ["affinity.bind", "관계의 제약과 대처", "required"], ["affinity.private", "표현하지 않은 감정", "required"], ["affinity.approach", "접근과 확인된 경계", "required"]] },
  { id: "userRelationship", label: "현재 페르소나와의 관계", max: 900, slots: [["core.relationship", "현재 페르소나와의 관계", "user"]] },
  { id: "npc", label: "NPC 간 관계", max: 900, slots: [["core.relationship", "NPC 간 관계", "npc"]] },
  { id: "emotion", label: "다른 NPC 감정", max: NPC_EMOTION_LIMIT, slots: [[NPC_EMOTION_SLOT, "감정", "npc"]] },
  { id: "knowledge", label: "알고 있는 정보", max: 1200, slots: [["core.knowledge", "알고 있는 정보", "optional"]] },
  { id: "speech", label: "대상별 말투", max: 700, slots: [["core.speech", "대상별 말투", "required"]] },
  { id: "appraisal", label: "상대별 평가", max: 900, slots: [["affinity.appraisal", "첫인상", "required"], ["affinity.current_appraisal", "현재 평가", "required"]] },
  { id: "openness", label: "음란도 태도·행동", max: 900, adult: true, slots: [["openness.context", "태도의 배경과 조건", "optional"], ["openness.attitude.qualitative", "성적 태도", "optional"], ["openness.behavior.qualitative", "태도에 따른 행동", "optional"]] },
  { id: "secret", label: "비밀", max: 900, slots: [["perception.secret", "비밀", "optional"]] },
  { id: "suspicion", label: "불륜 의심", max: 900, adult: true, slots: [["suspicion.clue", "불륜 의심", "optional"]] },
];
export const groupInfo = (id) => RECORD_GROUPS.find((g) => g.id === id) ?? null;
export const EMOTION_HINT = "[감정1, 감정2] 짧은 이유 — 예: [서운함, 질투] 선생이 다른 학생만 챙겨서";

const RELATION = new Set(["register.context", "register.stage_assessment", "register.knowledge_gap", "affinity.intent", "affinity.stance", "affinity.bind", "affinity.private", "affinity.approach"]);
const norm = (s) => String(s ?? "").replace(/\s+/g, "");
// 절(section) → 항목 묶음. 리수폿 personRecordGroup과 같은 규칙(해당 없으면 null).
export function recordGroupOf(sec) {
  const slot = sec?.provenance?.slotId, head = norm(sec?.heading);
  if (slot === NPC_EMOTION_SLOT) return "emotion";
  if (slot === "core.identity" || (!slot && ["기본정보", "인물개요", "개요"].includes(head))) return "overview";
  if (slot === "perception.secret" || (!slot && ["비밀", "비밀정보"].includes(head))) return "secret";
  if (slot?.startsWith("suspicion.") || (!slot && ["불륜의심", "의심단서", "불륜단서"].includes(head))) return "suspicion";
  if (RELATION.has(slot ?? "")) return "relationship";
  for (const g of ["behavior", "openness", "appraisal", "knowledge", "speech"]) if (groupInfo(g).slots.some(([s]) => s === slot)) return g;
  if (slot === "core.relationship") return sec.provenance.targetRefs?.includes("actor:user") ? "userRelationship" : "npc";
  return null;
}

// 인물 문서의 절을 묶음별로. 반환: [{group, label, items:[{id, heading, body, target, pinned?}]}] (비어 있는 묶음은 뺀다)
export function listRecords(doc, scope) {
  const names = (refs) => (refs ?? []).map((r) => r === "actor:user" ? "나(user)" : scope?.documents?.[r]?.title ?? r).join(", ");
  const by = new Map();
  for (const sec of doc?.sections ?? []) {
    const g = recordGroupOf(sec); if (!g) continue;
    if (!by.has(g)) by.set(g, []);
    by.get(g).push({ id: sec.id, heading: sec.heading, body: sec.body, target: names(sec.provenance?.targetRefs), slotId: sec.provenance?.slotId, raw: sec });
  }
  return RECORD_GROUPS.filter((g) => by.has(g.id)).map((g) => ({ group: g.id, label: g.label, adult: !!g.adult, items: by.get(g.id) }));
}

// 이 인물 말고 다른 인물(대상 후보)
export const targetCandidates = (scope, docId) => Object.values(scope?.documents ?? {}).filter((d) => d?.type === "Character" && d.id !== docId).map((d) => ({ id: d.id, title: d.title }));

export function addRecord(scope, docId, { group, slotId, targetRef = "", title = "", text }) {
  return updatePersonRecord(scope, docId, { group, slotId, targetRef, title, text, scopeKey: scopeKeyOf(scope) });
}
export function editRecord(scope, docId, sectionId, text, title) {
  const sec = scope?.documents?.[docId]?.sections?.find((s) => s.id === sectionId);
  if (!sec) throw new Error("고칠 항목을 찾지 못했어요.");
  const group = recordGroupOf(sec); if (!group) throw new Error("이 항목은 여기서 고칠 수 없어요. 인물 페이지의 ✎를 써 주세요.");
  return updatePersonRecord(scope, docId, { id: sectionId, group, title: title ?? sec.heading, text, expected: JSON.stringify(sec), scopeKey: scopeKeyOf(scope) });
}
export function removeRecord(scope, docId, sectionId) {
  const sec = scope?.documents?.[docId]?.sections?.find((s) => s.id === sectionId);
  if (!sec) throw new Error("지울 항목을 찾지 못했어요.");
  return deletePersonItem(scope, docId, { id: sectionId, kind: "section", expected: JSON.stringify(sec), scopeKey: scopeKeyOf(scope) });
}
// NPC 감정 입력 미리 검사(형식이 틀리면 이유를 돌려준다)
export function checkEmotionText(text) { try { const p = npcEmotionParts(String(text ?? "")); return p.valid ? "" : `형식: ${EMOTION_HINT}`; } catch (e) { return e?.message ?? String(e); } }
