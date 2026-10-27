// 추적 수준 프리셋·기능 카드(순수). 리수폿 features(affinity·register·perception·suspicion·openness·rhythm)를
// 사용자 말("무엇을 기억하나")로 보여 주고, 가볍게/기본/전부 3단계로 한 번에 맞춘다.
export const FEATURE_IDS = ["affinity", "register", "perception", "suspicion", "openness", "rhythm"];

export const FEATURE_CARDS = [
  { id: "affinity", label: "호감", desc: "인물이 사용자를 얼마나 좋아하는지 점수로 따라가요.", detail: "numbers" },
  { id: "register", label: "관계·호칭", desc: "서로 부르는 말과 말투가 어떻게 달라졌는지 기억해요.", detail: "register" },
  { id: "perception", label: "인식", desc: "사용자의 정체나 비밀을 인물이 얼마나 아는지 따라가요.", detail: "perception" },
  { id: "suspicion", label: "의심", desc: "인물이 사용자를 의심하는 정도를 따라가요.", detail: "numbers" },
  { id: "openness", label: "마음 열기", desc: "인물이 마음을 얼마나 열었는지(주기 포함) 따라가요.", detail: "numbers", adult: false },
  { id: "rhythm", label: "대화 리듬", desc: "인물별 말의 속도·길이 같은 리듬을 맞춰 줘요.", detail: null },
];

const base = () => ({
  affinity: { enabled: true, numbers: true, increase: 1, decrease: 1 },
  register: { enabled: true, variety: "off", change: "ask", signLimit: 3 },
  perception: { enabled: true, mode: "on" },
  suspicion: { enabled: true, numbers: false, increase: 1, decrease: 1 },
  openness: { enabled: false, numbers: true, increase: 1, decrease: 1, cycle: false, cycleRate: 1 },
  rhythm: { enabled: true },
});

export const LEVELS = [
  { id: "light", label: "가볍게", text: "호감과 호칭만. 호출·비용이 가장 적어요." },
  { id: "basic", label: "기본", text: "호감·호칭·인식·의심·리듬. 처음엔 이걸 권해요." },
  { id: "full", label: "전부", text: "마음 열기까지 모두. 정리 노트가 길어질 수 있어요." },
];

// 프리셋이 정하는 값. 기존 세부값(증감량 등)은 덮지 않고 켜짐·표시 여부만 맞춘다.
export function levelPatch(level) {
  const b = base();
  if (level === "light") return { affinity: { ...b.affinity, numbers: false }, register: b.register, perception: { enabled: false, mode: "off" }, suspicion: { ...b.suspicion, enabled: false }, openness: b.openness, rhythm: { enabled: false } };
  if (level === "full") return { ...b, openness: { ...b.openness, enabled: true } };
  return b;
}

export function applyLevel(features, level) {
  const patch = levelPatch(level), out = { ...features };
  for (const id of FEATURE_IDS) out[id] = { ...(features?.[id] ?? {}), enabled: patch[id].enabled, ...(id === "perception" ? { mode: patch[id].mode } : {}), ...(id === "affinity" ? { numbers: patch[id].numbers } : {}) };
  return out;
}

// 지금 켜진 모양이 어느 프리셋인지. 어느 것도 아니면 "custom".
export function levelOf(features) {
  const on = (f) => FEATURE_IDS.map((id) => f?.[id]?.enabled === true ? 1 : 0).join("");
  const sig = (l) => on(levelPatch(l));
  const mine = on(features);
  return ["light", "basic", "full"].find((l) => sig(l) === mine) ?? "custom";
}

// 카드 아래 한 줄: 지금 상태 미리보기
export function summaryOf(id, f = {}) {
  if (!f.enabled) return "꺼져 있어요";
  if (id === "affinity" || id === "suspicion" || id === "openness") return `${f.numbers ? "숫자 표시" : "숫자 숨김"} · 한 번에 +${f.increase ?? 1} / -${f.decrease ?? 1}${id === "openness" && f.cycle ? " · 주기 반영" : ""}`;
  if (id === "register") return `말투 변화 ${{ ask: "확인 후 적용", auto: "자동 적용" }[f.change] ?? "확인 후 적용"}${f.variety && f.variety !== "off" ? " · 말투 다변화" : ""}`;
  if (id === "perception") return { off: "꺼짐", light: "라이트", on: "켜짐" }[f.mode] ?? "켜짐";
  return "켜져 있어요";
}

// 의존 관계: 켤 수 없는 기능과 이유. {needs:[{label, fix(s)}]}
export function needsOf(id, settings) {
  const f = settings?.features ?? {};
  if (id === "openness" && f.openness?.cycle && !settings?.sexualDesireEnabled) return [{ label: "‘욕구 기록’(성인 항목)을 먼저 켜 주세요", fix: (s) => { s.sexualDesireEnabled = true; } }];
  return [];
}
