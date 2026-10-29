import { alpha, ensureContrast, isHex, lightnessOf, onAccent, withLightness } from './color.js';

// v1.6.3 UI 리뉴얼: 밝은 회백 + 코랄 포인트가 기본. 색은 전부 여기 토큰에서만 나온다.
export var PRESETS = [
  { id: "coral", name: "코랄", a: "#cc4b2e", b: "#b93e22" },
  { id: "teal", name: "테알", a: "#0f766e", b: "#0b5f59" },
  { id: "sage", name: "세이지", a: "#4d7a4f", b: "#3d663f" },
  { id: "lilac", name: "라일락", a: "#7c4fc2", b: "#6840a8" },
  { id: "mono", name: "모노", a: "#3f4650", b: "#2b3038" },
  { id: "dusk", name: "황혼(예전 색)", a: "#4f63e0", b: "#7c4fe0" }
];
export var DEFAULT_THEME = { v: 2, preset: "coral", a: "#cc4b2e", b: "#b93e22", mode: "auto", contrast: "normal", layout: "left", density: "roomy", size: "m" };
// 1.7.0: 'home'(홈 카드) 메뉴 위치는 새 홈 화면이 대신하므로 없앴다. 예전 저장값 home은 left로 옮긴다.
export var LAYOUTS = [["left", "왼쪽 메뉴"], ["top", "위쪽 메뉴"]];
export var DENSITIES = [["roomy", "넉넉하게"], ["compact", "촘촘하게"]];
export var SIZES = [["m", "보통"], ["l", "크게"], ["xl", "아주 크게"]];
export var ZOOM = { m: 1, l: 1.12, xl: 1.26 };
export var ZOOM_MIN = 85, ZOOM_MAX = 160;
export var zoomOf = (t) => (Number.isFinite(t?.zoom) ? t.zoom / 100 : (ZOOM[t?.size] ?? 1));
export var NAME_SWATCHES = ["#f2b8d6", "#f58ea3", "#f5c26b", "#e8e27a", "#9be3c8", "#8fd3ff", "#8ea2ff", "#c4b1ff", "#d7a6ff", "#c9cbe4"];
export var FOLDER_SWATCHES = ["#8ea2ff", "#c4b1ff", "#f2b8d6", "#f5c26b", "#9be3c8", "#8fd3ff", "#f58ea3", "#a4a7c9"];
var BASE = {
  dark: {
    scheme: "dark",
    backdrop: "rgba(10, 9, 8, 0.6)",
    win: "#171615",
    surf: "#211f1d",
    surf2: "#2b2926",
    hover: "#272522",
    line: "#37332f",
    line2: "#2d2a27",
    line3: "#47423c",
    text: "#f3f0eb",
    sub: "#b9b3aa",
    mute: "#9d978d",
    grip: "#6f6960",
    trackOff: "#403c37",
    knobOff: "#a8a299",
    knobOn: "#ffffff",
    shadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
    shadowSm: "0 10px 28px rgba(0, 0, 0, 0.42)",
    card: "0 1px 2px rgba(0, 0, 0, 0.35)",
    ok: "#5fd3a5",
    warn: "#f2c066",
    danger: "#f4867a",
    teal: "#6fd8c4",
    rose: "#f28fa8",
    border: "1px",
    toast: "#2b2926"
  },
  light: {
    scheme: "light",
    backdrop: "rgba(40, 34, 28, 0.32)",
    win: "#f4f2ef",
    surf: "#ffffff",
    surf2: "#ebe8e3",
    hover: "#efece8",
    line: "#e3dfd9",
    line2: "#e9e5e0",
    line3: "#d4cec6",
    text: "#211f1c",
    sub: "#5a554e",
    mute: "#6c665e",
    grip: "#b9b2a8",
    trackOff: "#cfc9c0",
    knobOff: "#ffffff",
    knobOn: "#ffffff",
    shadow: "0 24px 64px rgba(50, 38, 28, 0.2)",
    shadowSm: "0 10px 28px rgba(50, 38, 28, 0.16)",
    card: "0 1px 2px rgba(50, 38, 28, 0.08)",
    ok: "#12775a",
    warn: "#8a5a00",
    danger: "#bd2a4a",
    teal: "#0e7466",
    rose: "#ad2347",
    border: "1px",
    toast: "#ffffff"
  },
  // 고대비: 순수 흑백 바탕, 굵은 테두리, 흐린 색 없음
  hcDark: {
    scheme: "dark",
    backdrop: "rgba(0, 0, 0, 0.78)",
    win: "#000000",
    surf: "#0a0a0a",
    surf2: "#1c1c1c",
    hover: "#2a2a2a",
    line: "#e6e6e6",
    line2: "#a8a8a8",
    line3: "#ffffff",
    text: "#ffffff",
    sub: "#f1f1f1",
    mute: "#d6d6d6",
    grip: "#d0d0d0",
    trackOff: "#5c5c5c",
    knobOff: "#ffffff",
    knobOn: "#000000",
    shadow: "0 0 0 2px #ffffff",
    shadowSm: "0 0 0 2px #ffffff",
    card: "none",
    ok: "#5dffb4",
    warn: "#ffd75e",
    danger: "#ff8a8a",
    teal: "#5df0dc",
    rose: "#ff9ab8",
    border: "2px",
    toast: "#000000"
  },
  hcLight: {
    scheme: "light",
    backdrop: "rgba(0, 0, 0, 0.6)",
    win: "#ffffff",
    surf: "#ffffff",
    surf2: "#eeeeee",
    hover: "#dedede",
    line: "#1a1a1a",
    line2: "#5c5c5c",
    line3: "#000000",
    text: "#000000",
    sub: "#1c1c1c",
    mute: "#383838",
    grip: "#333333",
    trackOff: "#5e5e5e",
    offText: "#ffffff",
    knobOff: "#ffffff",
    knobOn: "#ffffff",
    shadow: "0 0 0 2px #000000",
    shadowSm: "0 0 0 2px #000000",
    card: "none",
    ok: "#005c3f",
    warn: "#6b4300",
    danger: "#a30f33",
    teal: "#005a4e",
    rose: "#8f1237",
    border: "2px",
    toast: "#ffffff"
  }
};
var pick = (list, v, d) => list.some(([k]) => k === v) ? v : d;
export function normalizeTheme(t) {
  const out = { ...DEFAULT_THEME, ...t && typeof t === "object" ? t : {} };
  // 1.6.2 이전 저장값(v:1)은 고른 색을 그대로 두고, 새 설정은 기본값으로 채운다
  if (!isHex(out.a) || !isHex(out.b)) {
    out.a = DEFAULT_THEME.a;
    out.b = DEFAULT_THEME.b;
    out.preset = DEFAULT_THEME.preset;
  }
  if (!["auto", "dark", "light"].includes(out.mode)) out.mode = "auto";
  out.contrast = out.contrast === "high" ? "high" : "normal";
  out.layout = pick(LAYOUTS, out.layout === "home" ? "left" : out.layout, "left");
  out.density = pick(DENSITIES, out.density, "roomy");
  out.size = pick(SIZES, out.size, "m");
  // 글자 크기: 막대로 고른 값(퍼센트). 없으면 보통/크게/아주 크게에서 가져온다.
  const z = Number(out.zoom);
  if (Number.isFinite(z) && z > 0) out.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z / 5) * 5));
  else out.zoom = Math.round((ZOOM[out.size] ?? 1) * 100);
  out.v = 2;
  return out;
}
export var resolveMode = (theme, risuScheme) => theme.mode === "auto" ? risuScheme === "light" ? "light" : "dark" : theme.mode;
function textTone(hex, bg, mode, ratio = 4.5) {
  const seed = mode === "dark" ? withLightness(hex, Math.max(lightnessOf(hex), 0.74)) : withLightness(hex, Math.min(lightnessOf(hex), 0.45));
  return ensureContrast(seed, bg, ratio);
}
export function themeVars(themeIn, mode) {
  const theme = normalizeTheme(themeIn);
  const hc = theme.contrast === "high";
  const B = BASE[hc ? mode === "light" ? "hcLight" : "hcDark" : mode] ?? BASE.dark;
  let { a, b } = theme;
  if (hc) {
    // 고대비에서는 버튼 바탕도 글자와 7:1 이상이 되게 색을 진하게(다크에선 밝게) 맞춘다
    a = ensureContrast(a, mode === "light" ? "#ffffff" : "#000000", 7);
    b = ensureContrast(b, mode === "light" ? "#ffffff" : "#000000", 7);
  }
  const on = onAccent(a, b, mode === "light" ? "#000000" : "#000000");
  const tr = hc ? 7 : 4.5;
  const accText = textTone(a, B.surf, mode, tr), acc2Text = textTone(b, B.surf, mode, tr);
  const decoA = mode === "dark" ? withLightness(a, Math.max(lightnessOf(a), 0.68)) : a;
  const decoB = mode === "dark" ? withLightness(b, Math.max(lightnessOf(b), 0.68)) : b;
  const soft = hc ? 0.18 : mode === "dark" ? 0.16 : 0.1;
  const dens = theme.density === "compact";
  const v = {
    "--rb-backdrop": B.backdrop,
    "--rb-win": B.win,
    "--rb-surf": B.surf,
    "--rb-surf2": B.surf2,
    "--rb-hover": B.hover,
    "--rb-line": B.line,
    "--rb-line2": B.line2,
    "--rb-line3": B.line3,
    "--rb-bw": B.border,
    "--rb-text": B.text,
    "--rb-sub": B.sub,
    "--rb-mute": B.mute,
    "--rb-grip": B.grip,
    "--rb-track-off": B.trackOff,
    "--rb-off-text": B.offText ?? B.text,
    "--rb-knob-off": B.knobOff,
    "--rb-knob-on": B.knobOn,
    "--rb-shadow": B.shadow,
    "--rb-shadow-sm": B.shadowSm,
    "--rb-shadow-card": B.card,
    "--rb-acc-a": a,
    "--rb-acc-b": b,
    "--rb-acc-grad": hc ? a : `linear-gradient(135deg, ${a}, ${b})`,
    "--rb-deco-grad": hc ? accText : `linear-gradient(90deg, ${decoA}, ${decoB})`,
    "--rb-on-acc": on.fg,
    "--rb-acc-text": accText,
    "--rb-acc2-text": acc2Text,
    "--rb-acc-soft": alpha(a, soft),
    "--rb-acc2-soft": alpha(b, soft),
    "--rb-sel-bg": alpha(a, hc ? 0.14 : mode === "dark" ? 0.12 : 0.07),
    "--rb-sel-ring": hc ? accText : alpha(accText, 0.5),
    "--rb-focus": hc ? B.text : alpha(accText, 0.7),
    "--rb-ok": B.ok,
    "--rb-warn": B.warn,
    "--rb-danger": B.danger,
    "--rb-teal": B.teal,
    "--rb-rose": B.rose,
    "--rb-ok-soft": alpha(B.ok, 0.13),
    "--rb-warn-soft": alpha(B.warn, 0.13),
    "--rb-danger-soft": alpha(B.danger, 0.13),
    "--rb-teal-soft": alpha(B.teal, 0.12),
    "--rb-rose-soft": alpha(B.rose, 0.13),
    "--rb-toast": B.toast,
    // 모양·크기 토큰: 둥글기 4단계, 컨트롤 높이, 줄 여백, 글자 배율
    "--rb-r1": "8px",
    "--rb-r2": "12px",
    "--rb-r3": "16px",
    "--rb-r4": "22px",
    "--rb-ctl": dens ? "36px" : "42px",
    "--rb-ctl-sm": dens ? "30px" : "34px",
    "--rb-row-py": dens ? "8px" : "13px",
    "--rb-gap": dens ? "10px" : "16px",
    "--rb-zoom": String(zoomOf(theme))
  };
  return { vars: v, scheme: B.scheme, onAccentRatio: on.ratio, mode, hc };
}
export function readableName(hex, mode) {
  if (!isHex(hex)) return null;
  const bg = (BASE[mode] ?? BASE.dark).surf;
  return ensureContrast(hex, bg, 4.5);
}
export function folderTint(hex, mode) {
  if (!isHex(hex)) return null;
  const c = readableName(hex, mode);
  return { stroke: c, fill: alpha(c, 0.2) };
}
