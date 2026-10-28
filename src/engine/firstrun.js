// 처음 쓰는 사람용(순수): 설정을 하나도 안 만져도 켜기만 하면 작동하도록 기본값을 정한다.
import { FEATURE_IDS, applyLevel } from "./trackpreset.js";

export const WIZARD = [
  { id: "model", title: "AI 고르기", text: "기록을 맡길 AI예요. 모르면 그대로 ‘리스 보조 모델’이면 돼요." },
  { id: "level", title: "무엇을 기억할까요", text: "처음엔 ‘기본’을 권해요. 나중에 언제든 바꿀 수 있어요." },
  { id: "go", title: "켜기", text: "마지막으로 확인하고 켜요." },
];

// 켜진 기능이 하나도 없으면(처음 켤 때) ‘기본’ 수준으로 맞춘다. 이미 정해 둔 설정은 건드리지 않는다.
export function firstRunFeatures(features) {
  const any = FEATURE_IDS.some((id) => features?.[id]?.enabled === true);
  return any ? features : applyLevel(features ?? {}, "basic");
}

// 리수폿 원본 플러그인이 같이 켜져 있는지(두 번 기록되는 것을 막기 위한 안내용)
export const isPotName = (name) => /risupot|리수폿/i.test(String(name ?? ""));
export const potInstalled = (plugins) => (plugins ?? []).some((p) => isPotName(p?.name) && p?.enabled !== false);

// 봇빌더(AI로 제작의 원본) 플러그인이 같이 켜져 있는지 (같은 기능이 Dusk 안에 있다는 안내용)
export const isBbName = (name) => /봇빌더|risu_story_workshop|botbuilder/i.test(String(name ?? ""));
export const bbInstalled = (plugins) => (plugins ?? []).some((p) => isBbName(p?.name) && p?.enabled !== false);

// 마법사 끝 요약 한 줄
export function wizardSummary({ easyKind, level, mode }) {
  const lv = { light: "가볍게", basic: "기본", full: "전부", custom: "맞춤" }[level] ?? "기본";
  return `${easyKind === "api" ? "내 API" : "리스 보조 모델"} · ${lv} · ${mode === "accurate" ? "더 정확하게" : "빠르게"}`;
}
