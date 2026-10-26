// 카드 등급(D·C·B·A·S·EX) 규칙: 색, 태그 수, 기억 중요도 매핑, 색 파생. 순수 함수.
import { GRADES, gradeRank } from "../memorygrade.js";

export const GRADE_COLOR = Object.freeze({ D: "#8b9bb4", C: "#5b8def", B: "#9a6bff", A: "#f0a23c", S: "#e8548f", EX: "#ffd24a" });
export const TAG_COUNT = Object.freeze({ D: 0, C: 1, B: 2, A: 3, S: 4, EX: 5 });
// 기록 등급 → 카드 기억 중요도
export const MEMORY_LEVEL = Object.freeze({ D: "M0", C: "M1", B: "M2", A: "M3", S: "M3", EX: "M3" });
export const MEMORY_LABEL = Object.freeze({ M0: "일상", M1: "기억", M2: "추억", M3: "분기점" });
export const MEMORY_LIMIT = Object.freeze({ M1: 12, M2: 6, M3: 3 });

export const normGrade = (g) => (GRADES.includes(g) ? g : "D");
export const tagCountOf = (g) => TAG_COUNT[normGrade(g)];
export const colorOf = (g) => GRADE_COLOR[normGrade(g)];
export const stepGrade = (g, d) => GRADES[Math.min(GRADES.length - 1, Math.max(0, gradeRank(normGrade(g)) + d))];

// 선택한 기록들 중 최고 등급(없으면 D). 인물 기록은 이미 구간·하한으로 거른 것을 넘긴다.
export function autoGrade(records) {
  let best = "D";
  for (const r of records ?? []) if (r?.g && gradeRank(r.g) > gradeRank(best)) best = r.g;
  return best;
}

// ── 색 계산 ──
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export function hexToRgb(hex) {
  const s = String(hex).replace("#", "");
  const f = s.length === 3 ? [...s].map((c) => c + c).join("") : s.slice(0, 6);
  const n = parseInt(f, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
export function hslToRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360;
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
const hsl = (h, s, l) => rgbToHex(hslToRgb([h, clamp(s), clamp(l)]));
const alpha = (hex, a) => hex + Math.round(clamp(a) * 255).toString(16).padStart(2, "0");

// 등급색 하나에서 이름 그라데이션·태그 테두리·글로우·밤 베일 색을 파생한다.
export function deriveTheme(color) {
  const [h, s, l] = rgbToHsl(hexToRgb(color));
  const sat = Math.max(0.28, Math.min(0.95, s));
  const tone = (light, satMul = 1) => hsl(h, sat * satMul, light);
  const night = hslToRgb([h, Math.min(0.55, sat * 0.6), 0.075]).map(Math.round);
  const mid = tone(Math.min(0.78, Math.max(0.6, l + 0.12)), 0.9), deep = tone(Math.max(0.36, l - 0.12));
  return {
    color,
    nightRgb: night,
    nameGradient: [tone(0.96, 0.35), mid, tone(0.92, 0.5), "#ffffff", deep, tone(0.9, 0.45)],
    body: tone(0.95, 0.3), quote: tone(0.96, 0.25),
    tagText: tone(0.95, 0.3), tagBorder: alpha(mid, 0.81), nameStroke: alpha(tone(0.9, 0.5), 0.5), nameGlow: alpha(mid, 0.16),
    tagOutline: alpha(deep, 0.33), tagShine: alpha(tone(0.88, 0.5), 0.08), tagGlow: alpha(mid, 0.15),
    letter: [tone(0.98, 0.2), mid, deep], tint: color
  };
}
