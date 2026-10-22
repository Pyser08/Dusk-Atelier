// RisuTide 판단 로직(src/tide/)을 Dusk 업데이트 흐름에 잇는 곳.
// - 캐릭터: 카드 필드(사용자 것 제외)끼리 세 방향 비교 → 항목 목록(plan) → 고른 대로 적용
// - 모듈: 모듈 필드를 카드 필드 이름으로 옮겨 같은 판단 로직을 쓴다 (RisuTide moduleUpdate와 같은 방식)
// - 기준(base)은 지문(해시)만 저장한다. 의미는 "마지막으로 받은 제작자 파일".
import { KEPT_FIELDS, isCredentialKey, isUnsafeCardKey, sanitizeCardValue, summarizeCharacterUpdate } from '../tide/characterUpdate.ts';
import { applyUpdatePlan, assetContentId, fingerprintCard, isFingerprintV1, planCharacterUpdate } from '../tide/characterUpdateMerge.ts';
import { greetingRemap } from '../tide/characterUpdateGreetings.ts';
import { wordDiff } from '../tide/characterMerge/wordDiff.ts';

export { fingerprintCard, isFingerprintV1, summarizeCharacterUpdate, wordDiff };

// RisuBard 전용 등 Dusk가 원래 지키던 사용자 필드도 함께 지킨다
var DUSK_USER = ["bardLore", "bardPainter"];
export var isUserField = (k) => KEPT_FIELDS.has(k) || isCredentialKey(k) || DUSK_USER.includes(k);

/** 캐릭터의 카드 필드(제작자 것)만 */
export function charFields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (isUserField(k) || isUnsafeCardKey(k) || v === void 0) continue;
    out[k] = v;
  }
  return out;
}

// ---- 모듈 필드 ↔ 카드 필드 ----
var MOD_MAP = { name: "name", description: "desc", lorebook: "globalLore", regex: "customscript", trigger: "triggerscript", assets: "additionalAssets", backgroundEmbedding: "backgroundHTML", lowLevelAccess: "lowLevelAccess" };
var MOD_BACK = Object.fromEntries(Object.entries(MOD_MAP).map(([a, b]) => [b, a]));
export function modFields(view) {
  const out = {};
  for (const [k, v] of Object.entries(view ?? {})) {
    if (k === "id" || isUnsafeCardKey(k) || v === void 0) continue;
    out[MOD_MAP[k] ?? `moduleField:${k}:value`] = v;
  }
  return out;
}
export function fieldsToMod(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    const name = MOD_BACK[k] ?? (k.startsWith("moduleField:") ? k.slice(12, -6) : void 0);
    if (name) out[name] = v;
  }
  return out;
}
// 모듈 에셋은 [이름, 경로, 확장자]라 확장자까지 비교에 넣는다
function modHash(fields) {
  return Array.isArray(fields.additionalAssets) ? { ...fields, additionalAssets: fields.additionalAssets.map((r) => [r[0], `module-asset:${assetContentId(r[1])}:${JSON.stringify(r.slice(2))}`]) } : fields;
}
export var modFingerprint = (fields) => fingerprintCard(modHash(fields));

/** 비교 계획. kind: "c"(캐릭터) | "m"(모듈). current·incoming은 카드 필드 */
export function makePlan(kind, current, incoming, base) {
  const b = isFingerprintV1(base) ? base : null;
  if (kind === "c") return planCharacterUpdate({ current, incomingFields: incoming, base: b });
  const plan = planCharacterUpdate({ current: modHash(current), incomingFields: modHash(incoming), base: b });
  for (const it of plan.items) if (it.unit === "asset") {
    const ci = plan.listIds?.asset?.current.indexOf(it.id) ?? -1, ni = plan.listIds?.asset?.incoming.indexOf(it.id) ?? -1;
    it.current = ci < 0 ? void 0 : structuredClone(current.additionalAssets[ci]);
    it.incoming = ni < 0 ? void 0 : structuredClone(incoming.additionalAssets[ni]);
  }
  return plan;
}

/** 고른 내용으로 keep 집합(= "내 것 유지"한 항목 id)을 만든다. choices: id → "cur" | "inc" */
export function keepSet(plan, choices, keepExistingOnly) {
  const keep = new Set();
  for (const it of plan.items) {
    const c = choices.get(it.id);
    const def = it.keepByDefault || (!plan.hasBase && keepExistingOnly && it.kind === "unknownExtra");
    if (c ? c === "cur" : def) keep.add(it.id);
  }
  return keep;
}

export function applyPlan(current, incoming, plan, keep) {
  return applyUpdatePlan({ current, incomingFields: incoming, plan, keep });
}

/** 적용 결과(카드 필드)를 실제 캐릭터에 쓴다. 사용자 필드·채팅은 그대로 */
export function writeCharFields(fresh, before, fields) {
  const out = { ...fresh };
  for (const k of new Set([...Object.keys(before), ...Object.keys(fields)])) {
    if (isUserField(k) || isUnsafeCardKey(k)) continue;
    if (fields[k] === void 0) delete out[k];
    else out[k] = sanitizeCardValue(fields[k]);
  }
  if ("additionalAssets" in fields) delete out.additionalAssetManifest;
  return out;
}

/**
 * 추가 인사말 순서가 바뀌어도 채팅마다 고른 인사말을 계속 가리키게 한다.
 * 고른 인사말이 새 버전에서 사라졌으면 맨 뒤에 붙여 남긴다. 바뀐 채팅 수를 돌려준다.
 */
export function remapGreetings(merged, before, fields) {
  if (!("alternateGreetings" in fields) && !("firstMessage" in fields)) return 0;
  const chats = merged.chats ?? [];
  const r = greetingRemap(before, fields, chats, true);
  if ("alternateGreetings" in fields || r.missingCount) merged.alternateGreetings = r.alternateGreetings;
  let n = 0;
  merged.chats = chats.map((c, i) => {
    const v = r.indexes[i];
    if (v === void 0 || v === c.fmIndex) return c;
    n++;
    return { ...c, fmIndex: v };
  });
  return n;
}

// ---- 화면용 ----
export var KIND_KO = {
  authorChanged: "새 버전 적용",
  mineEdited: "내가 고침",
  mineAdded: "내가 추가",
  mineDeleted: "내가 지움",
  conflict: "충돌",
  unknownDiff: "다름",
  unknownExtra: "새 버전에 없음"
};
/** 화면에 묶어 보여 줄 갈래 */
export function groupOf(it) {
  if (it.kind === "conflict") return "conflict";
  if (it.kind.startsWith("mine")) return "mine";
  if (it.kind === "unknownExtra") return "extra";
  return "update";
}
/** 새 버전을 적용할 때 이 항목이 어떻게 되는지 */
export function changeOf(it) {
  if (it.current === void 0 && it.incoming !== void 0) return "added";
  if (it.current !== void 0 && it.incoming === void 0) return "removed";
  return "changed";
}
var UNIT_KO = { lore: "로어북", regex: "정규식", trigger: "트리거", asset: "에셋", emotion: "감정 이미지" };
export function itemLabel(it, fieldLabel) {
  if (it.id.startsWith("order:")) return `${UNIT_KO[it.unit] ?? it.unit} 순서`;
  if (it.unit === "field") {
    const k = it.label.startsWith("moduleField:") ? it.label.slice(12, -6) : it.label;
    return fieldLabel(k);
  }
  const name = String(it.label).replace(/^ambiguous:/, "");
  return `${UNIT_KO[it.unit] ?? it.unit}: ${name || "(이름 없음)"}`;
}
/** 글로 비교할 수 있는 값(로어는 내용, 정규식은 바꿀 글 등) */
export function textOf(it, v) {
  if (v === void 0 || v === null) return "";
  if (typeof v === "string") return v;
  if (it.unit === "lore") return `${v.key ?? ""}\n${v.content ?? ""}`;
  if (it.unit === "regex") return `${v.in ?? ""}\n→ ${v.out ?? ""}`;
  if (Array.isArray(v) && (it.unit === "asset" || it.unit === "emotion")) return String(v[1] ?? "");
  try {
    return JSON.stringify(v, null, 1);
  } catch {
    return String(v);
  }
}
