// 2.2.0 AI로 봇 만들기 세 단계 — 순수 계산(시험용으로 따로 둠)
export var AIBOT_WAYS = [
  { id: "blank", icon: "plus", label: "새 봇", text: "처음부터 AI와 함께 채워요" },
  { id: "edit", icon: "edit", label: "기존 봇 고치기", text: "고른 봇을 AI 제작 화면으로 열어요" },
  { id: "workshop", icon: "link", label: "봇빌더로", text: "설치된 봇빌더 화면에서 만들어요" }
];
// 지금 단계(0~2): 이름이 있으면 1, 방식까지 정해지면(고치기는 봇까지) 2
export function aibotStep({ name, way, botId }) {
  if (way === "edit") return botId ? 2 : 1;
  if (way === "workshop") return 2;
  return String(name ?? "").trim() ? (way ? 2 : 1) : 0;
}
