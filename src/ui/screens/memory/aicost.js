// 장기기억 설정: 켜면 보조 모델(AI) 호출이 얼마나 드는지 색 배지로 보여 준다. 배지를 누르면(i) 몇 번 부르는지 설명이 뜬다.
//  · none  초록  호출 없음(엔진 계산)
//  · line  파랑  호출 수 그대로, 매 턴 기록 호출에 몇 줄만 더함(토큰 조금)
//  · call  주황  보조 모델 호출이 늘어남
//  · ext   보라  보조 모델이 아닌 다른 API(임베딩·오픈라우터)를 부름
import { h } from "../../dom.js";
import { infoBtn } from "./lifecards.js";

export const AI_KIND = Object.freeze({
  none: { label: "호출 없음", color: "#2e9d6a" },
  line: { label: "호출 +0 · 줄 추가", color: "#4a7fd6" },
  call: { label: "AI 호출 늘어남", color: "#d9822b" },
  ext: { label: "다른 API 호출", color: "#8a63d2" },
});
// 기능별 설명(배지 i 버튼). 숫자는 인물 8명이 꽉 찬 채팅 기준 대략값
export const AI_COST = Object.freeze({
  human: ["line", "매 턴 돌던 기록 호출에 관계 진도·호칭·추억 줄을 더해요. 호출 수는 그대로, 기록 토큰이 조금 늘어요."],
  cool: ["none", "감정이 식는 건 프로그램이 계산해요. 호출 없음."],
  beliefs: ["line", "기록 호출에 오해 줄을 더해요. 호출 수는 그대로예요."],
  saver: ["none", "호출 없음. 진행에 넣는 기억이 약 30% 줄어요(메인 호출 토큰이 줄어요)."],
  fork: ["none", "호출 없음. 원래 채팅의 기억을 복사만 해요."],
  trim: ["none", "호출 없음. 이미 정리된 옛 대화를 빼서 메인 호출 토큰이 줄어요."],
  backfill: ["call", "지난 대화 분석 때 묶음(기본 응답 3개)마다 인물 위키 기록 호출이 1번쯤 더 들어요. 분석할 때만이에요."],
  seed: ["none", "무작위로 정해서 호출 없음."],
  desire: ["call", "성인 프로필을 기본 성격 만드는 호출에 같이 실어요. 이미 성격이 있는 인물은 4명당 1번 더(처음 한 번만). 기록 호출엔 줄만 더해요 — 성욕·기분·장면 판단 계산은 엔진이 해서 매 턴 호출은 늘지 않아요."],
  cycle: ["line", "기록 호출에 월경·관계 줄을 더하고, 날짜 계산은 프로그램이 해요. 호출 수는 그대로예요."],
  explicit: ["none", "기록 문장의 말투만 바뀌어요. 호출 없음."],
  accurate: ["call", "응답 전에 관련 인물 찾기·장면 정리 호출이 1~2번 더 들어요(빠르게는 0번)."],
  embed: ["ext", "임베딩 API를 불러요: 응답마다 1번(의미 검색) + 기록이 늘 때 조금씩. 보조 모델 호출은 아니에요."],
  jev: ["ext", "응답마다 오픈라우터 재정렬 호출이 1번 들어요. 보조 모델 호출은 아니에요."],
});
// 배지: [색 점 + 짧은 글] + i 설명
export function aiTag(key) {
  const c = AI_COST[key]; if (!c) return null;
  const k = AI_KIND[c[0]];
  return h("span", { class: "rb-aitag", style: { display: "inline-flex", alignItems: "center", gap: "4px", marginLeft: "6px", verticalAlign: "middle", fontWeight: "600", fontSize: "11px", lineHeight: "18px", padding: "0 7px", borderRadius: "999px", color: k.color, background: `color-mix(in srgb, ${k.color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${k.color} 35%, transparent)`, whiteSpace: "nowrap" } },
    h("i", { "aria-hidden": "true", style: { width: "7px", height: "7px", borderRadius: "50%", background: k.color, display: "inline-block" } }), k.label, infoBtn(c[1]));
}
// 범례 + 한 채팅에서 대략 몇 번 부르는지
export function aiLegend() {
  const dot = (kind) => { const k = AI_KIND[kind]; return h("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px", marginRight: "10px", color: k.color, fontSize: "12px", fontWeight: "600" } }, h("i", { style: { width: "8px", height: "8px", borderRadius: "50%", background: k.color, display: "inline-block" } }), k.label); };
  return h("div", { class: "rb-ailegend", style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", padding: "8px 10px", borderRadius: "12px", background: "var(--rb-surf2)", margin: "4px 0 8px" } },
    dot("none"), dot("line"), dot("call"), dot("ext"),
    h("span", { style: { fontSize: "12px", color: "var(--rb-sub)", display: "inline-flex", alignItems: "center" } }, "한 채팅에서 몇 번?",
      infoBtn("인물 8명이 다 나오는 새 채팅 기준(대략): 처음 2턴은 턴마다 4번(기록 1 + 인물 기록 2 + 기본 성격·성인 프로필 1), 그 뒤엔 턴마다 3번. 나온 인물이 3명 이하면 2번. 기록이 20개 넘게 쌓인 인물은 10턴마다 정리 호출 1번. ‘더 정확하게’면 응답 전 1~2번 더.")));
}
