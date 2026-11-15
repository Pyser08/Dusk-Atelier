// Dusk 2.2.0: Erosync 매 턴 계산(변화분 1번 호출). 원본 분석부의 축 정의(AXIS_DEFINITIONS·SEX_AXIS_DEFINITIONS)와
// 성적 축 공통 규칙을 그대로 받아 채점 기준 글을 만들고, 응답(바뀐 항목만)을 정리한다. 엔진 연결부는 erosync.js duskTurnUpdate.
export const TURN_GROUPS = Object.freeze({
  axes: ["initiative", "spontaneity", "directness", "goalPersistence", "obsessiveness", "publicOpenness", "extremity"],
  sexual: ["eroticInterest", "sexualSpontaneity", "sexualOpenness", "sexualMomentum"]
});
export const TURN_STEP_MAX = 15;   // 한 턴에 한 값이 움직일 수 있는 폭

export function turnKeys(groups) {
  const on = Array.isArray(groups) && groups.length ? groups : Object.keys(TURN_GROUPS);
  return on.flatMap((g) => TURN_GROUPS[g] ?? []);
}

const bandText = (bands) => (Array.isArray(bands) ? bands : []).map(([range, text]) => `  - ${range}: ${text}`).join("\n");
function defText(key, def) {
  if (!def) return "";
  return [`### ${key} (${def.label || key})`, def.scoringQuestion || def.question || "", def.definition || "", bandText(def.bands),
    def.up ? `Clues up: ${def.up}` : "", def.down ? `Clues down: ${def.down}` : "", def.never ? `Never use: ${def.never}` : ""].filter(Boolean).join("\n");
}

// 채점 기준 + 변화분 규칙(시스템 지시문)
export function buildTurnSystem({ keys, axisDefs, sexDefs, sexRules = [] }) {
  const parts = keys.map((k) => defText(k, axisDefs?.[k] ?? sexDefs?.[k])).filter(Boolean);
  const hasSex = keys.some((k) => TURN_GROUPS.sexual.includes(k));
  return [
    "You update character trait scores (0-100) after one roleplay turn. The scales below are the same ones used for the full analysis.",
    "Each character already has current scores. Read ONLY the new turn and decide whether it shows lasting evidence that a score should move.",
    "Rules:",
    "- Most turns change nothing. Return a key only when this turn clearly shows the character acting differently from its current band.",
    `- Move gradually: at most ${TURN_STEP_MAX} points per key per turn. A single mood, a joke, or another character's words is not evidence.`,
    "- Never invent keys. Never return a key that is not listed under SCALES.",
    "- Output JSON only: {\"characters\":[{\"id\":\"<id>\",\"changes\":{\"<key>\":<new 0-100 integer>},\"reason\":\"<short Korean reason quoting the turn>\"}]}. Omit characters with no change.",
    hasSex && sexRules.length ? `Sexual scale rules:\n${sexRules.map((r) => `- ${r}`).join("\n")}` : "",
    "SCALES:", parts.join("\n\n")
  ].filter(Boolean).join("\n");
}

export function buildTurnUser({ targets, rp, keys }) {
  const list = targets.map((t) => ({ id: t.id, name: t.name, aliases: t.aliases ?? [], current: Object.fromEntries(keys.map((k) => [k, t.values?.[k] ?? null])), memory: t.memory || "" }));
  return ["TARGET CHARACTERS (current scores):", JSON.stringify(list, null, 2), "", "NEW TURN:", String(rp ?? "")].join("\n");
}

// 응답 → { id: { key: 값 } }. 모르는 인물·키는 버리고, 범위·한 턴 폭을 지킨다. 지금 값과 같으면 뺀다.
export function parseTurnReply(raw, targets, keys) {
  const allowed = new Set(keys), byId = new Map(targets.map((t) => [String(t.id), t])), out = {};
  for (const item of Array.isArray(raw?.characters) ? raw.characters : []) {
    const t = byId.get(String(item?.id ?? "")); if (!t || !item?.changes || typeof item.changes !== "object") continue;
    const changes = {};
    for (const [k, v] of Object.entries(item.changes)) {
      const n = Number(v); if (!allowed.has(k) || !Number.isFinite(n)) continue;
      const cur = Number.isFinite(t.values?.[k]) ? t.values[k] : 50;
      const next = Math.round(Math.max(0, Math.min(100, Math.max(cur - TURN_STEP_MAX, Math.min(cur + TURN_STEP_MAX, n)))));
      if (next !== cur) changes[k] = next;
    }
    if (Object.keys(changes).length) out[t.id] = { changes, reason: String(item.reason ?? "").slice(0, 300) };
  }
  return out;
}

// 장기기억 인물 이름 → Erosync 프로필(이름·별칭, 공백·대소문자 무시). 둘 이상 걸리면 잇지 않는다.
const norm = (s) => String(s ?? "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
export function matchProfile(person, profiles) {
  const names = new Set([person?.name, ...(person?.aliases ?? [])].map(norm).filter(Boolean));
  const hits = (profiles ?? []).filter((p) => [p.name, ...(p.aliases ?? [])].map(norm).some((n) => names.has(n)));
  return hits.length === 1 ? hits[0] : null;
}
