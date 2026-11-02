// 마스코트 루네 (1.8.3). 빈 화면 안내·시작 안내·왼쪽 위 로고에 쓴다. 그림 자체는 mascot-data.js(자동 생성).
import { h } from "./dom.js";
import { RUNE } from "./mascot-data.js";

export const MOODS = ["basic", "smile", "surprised", "shy", "thinking", "sleepy", "sorry", "wink"];
// 빈 화면 표정(사용자 결정: 상황별): 채팅 없음=놀람 · 아직 못 씀/준비 안 됨=미안 · 나를 기억하는 인물 없음=생각 중 · 나머지(아직 ○○ 없음)=기본
export function moodFor({ title = "", mood } = {}) {
  if (mood) return MOODS.includes(mood) ? mood : "basic";
  const t = String(title);
  if (/채팅이 없어요/.test(t)) return "surprised";
  if (/쓸 수 없어요|준비되지 않았어요|못 /.test(t)) return "sorry";
  if (/기억하는 인물/.test(t)) return "thinking";
  return "basic";
}
const img = (src, cls, size, alt = "") => h("img", { src, class: cls, alt, width: size, height: size, draggable: "false", decoding: "async" });
export const runeFace = (mood = "basic", size = 72) => img(RUNE["face_" + (MOODS.includes(mood) ? mood : "basic")], "rb-rune-face", size);
export const runeLogo = () => img(RUNE.logo, "rb-logo rb-rune-logo", 34, "");
export const runeSd = (kind, cls = "rb-rune-sd") => h("img", { src: RUNE[kind] ?? RUNE.wave, class: cls, alt: "", draggable: "false", decoding: "async" });
export const runeWave = () => h("img", { src: RUNE.wave, class: "rb-rune-wave", alt: "", draggable: "false", decoding: "async" });
