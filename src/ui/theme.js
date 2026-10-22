import { alpha, ensureContrast, isHex, lightnessOf, onAccent, withLightness } from './color.js';

export var PRESETS = [
  { id: "dusk", name: "Soft Dusk", a: "#4f63e0", b: "#7c4fe0" },
  { id: "ocean", name: "바다", a: "#1660b5", b: "#127a86" },
  { id: "forest", name: "숲", a: "#26775a", b: "#3d7f2a" },
  { id: "sunset", name: "노을", a: "#c2472b", b: "#b0317f" },
  { id: "rose", name: "장미", a: "#c2386e", b: "#8f45c9" },
  { id: "mono", name: "모노", a: "#4a4f6b", b: "#6b6f8c" }
];
export var DEFAULT_THEME = { v: 1, preset: "dusk", a: "#4f63e0", b: "#7c4fe0", mode: "auto" };
export var NAME_SWATCHES = ["#f2b8d6", "#f58ea3", "#f5c26b", "#e8e27a", "#9be3c8", "#8fd3ff", "#8ea2ff", "#c4b1ff", "#d7a6ff", "#c9cbe4"];
export var FOLDER_SWATCHES = ["#8ea2ff", "#c4b1ff", "#f2b8d6", "#f5c26b", "#9be3c8", "#8fd3ff", "#f58ea3", "#a4a7c9"];
var BASE = {
  dark: {
    scheme: "dark",
    backdrop: "rgba(8, 9, 16, 0.55)",
    win: "#151726",
    surf: "#1c1f33",
    surf2: "#23263d",
    hover: "#20233a",
    line: "#2a2d47",
    line2: "#22253b",
    line3: "#343857",
    text: "#e9eaf6",
    sub: "#a4a7c9",
    mute: "#8487ab",
    grip: "#5a5e85",
    trackOff: "#2e3150",
    knobOff: "#8487ab",
    knobOn: "#ffffff",
    shadow: "0 24px 64px rgba(0, 0, 0, 0.45)",
    shadowSm: "0 12px 32px rgba(0, 0, 0, 0.4)",
    ok: "#5fd3b5",
    warn: "#f5c26b",
    danger: "#f27a93",
    teal: "#6fdcc0",
    rose: "#f58ea3"
  },
  light: {
    scheme: "light",
    backdrop: "rgba(35, 36, 58, 0.28)",
    win: "#f6f6fd",
    surf: "#ffffff",
    surf2: "#eef0fb",
    hover: "#eceefa",
    line: "#e1e3f3",
    line2: "#e8e9f6",
    line3: "#d6d9ee",
    text: "#23243a",
    sub: "#5d6080",
    mute: "#6b6e8f",
    grip: "#b3b6d1",
    trackOff: "#d6d9ee",
    knobOff: "#ffffff",
    knobOn: "#ffffff",
    shadow: "0 24px 64px rgba(35, 36, 58, 0.18)",
    shadowSm: "0 12px 32px rgba(35, 36, 58, 0.16)",
    ok: "#13795b",
    warn: "#8a5a00",
    danger: "#c0284f",
    teal: "#0f7a68",
    rose: "#b4234a"
  }
};
export function normalizeTheme(t) {
  const out = { ...DEFAULT_THEME, ...t && typeof t === "object" ? t : {} };
  if (!isHex(out.a) || !isHex(out.b)) {
    out.a = DEFAULT_THEME.a;
    out.b = DEFAULT_THEME.b;
    out.preset = DEFAULT_THEME.preset;
  }
  if (!["auto", "dark", "light"].includes(out.mode)) out.mode = "auto";
  return out;
}
export var resolveMode = (theme, risuScheme) => theme.mode === "auto" ? risuScheme === "light" ? "light" : "dark" : theme.mode;
function textTone(hex, bg, mode) {
  const seed = mode === "dark" ? withLightness(hex, Math.max(lightnessOf(hex), 0.74)) : withLightness(hex, Math.min(lightnessOf(hex), 0.45));
  return ensureContrast(seed, bg, 4.5);
}
export function themeVars(themeIn, mode) {
  const theme = normalizeTheme(themeIn);
  const B = BASE[mode] ?? BASE.dark;
  const { a, b } = theme;
  const on = onAccent(a, b);
  const accText = textTone(a, B.surf, mode), acc2Text = textTone(b, B.surf, mode);
  const decoA = mode === "dark" ? withLightness(a, Math.max(lightnessOf(a), 0.68)) : a;
  const decoB = mode === "dark" ? withLightness(b, Math.max(lightnessOf(b), 0.68)) : b;
  const v = {
    "--rb-backdrop": B.backdrop,
    "--rb-win": B.win,
    "--rb-surf": B.surf,
    "--rb-surf2": B.surf2,
    "--rb-hover": B.hover,
    "--rb-line": B.line,
    "--rb-line2": B.line2,
    "--rb-line3": B.line3,
    "--rb-text": B.text,
    "--rb-sub": B.sub,
    "--rb-mute": B.mute,
    "--rb-grip": B.grip,
    "--rb-track-off": B.trackOff,
    "--rb-knob-off": B.knobOff,
    "--rb-knob-on": B.knobOn,
    "--rb-shadow": B.shadow,
    "--rb-shadow-sm": B.shadowSm,
    "--rb-acc-a": a,
    "--rb-acc-b": b,
    "--rb-acc-grad": `linear-gradient(135deg, ${a}, ${b})`,
    "--rb-deco-grad": `linear-gradient(90deg, ${decoA}, ${decoB})`,
    "--rb-on-acc": on.fg,
    "--rb-acc-text": accText,
    "--rb-acc2-text": acc2Text,
    "--rb-acc-soft": alpha(a, mode === "dark" ? 0.16 : 0.12),
    "--rb-acc2-soft": alpha(b, mode === "dark" ? 0.16 : 0.12),
    "--rb-sel-bg": alpha(a, mode === "dark" ? 0.12 : 0.08),
    "--rb-sel-ring": alpha(accText, 0.45),
    "--rb-focus": alpha(accText, 0.55),
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
    "--rb-toast": mode === "dark" ? "#23263d" : "#ffffff"
  };
  return { vars: v, scheme: B.scheme, onAccentRatio: on.ratio, mode };
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
