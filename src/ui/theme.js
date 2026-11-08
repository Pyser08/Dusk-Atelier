import { alpha, contrast, ensureContrast, isHex, lightnessOf, mixHex, onAccent, withLightness } from './color.js';
import { ACCENTS, DIRECTIONS, EDGE_V, FONTS, GRADIENTS, ICONW_V, LINEH_V, ROUND_PX, THEME_SETS, VISUAL_KEYS } from './themekit.js';

export { ACCENTS, GRADIENTS, THEME_SETS, FONTS } from './themekit.js';
export var contrastOf = contrast;
// v1.6.3 UI 리뉴얼: 밝은 회백 + 코랄 포인트가 기본. 색은 전부 여기 토큰에서만 나온다.
// v1.8.3: 강조 색 18개(예전 6개 id 그대로). 화면은 PRESETS를 그대로 쓴다.
export var PRESETS = ACCENTS.map(({ id, name, g, a, b }) => ({ id, name, g, a, b }));
export var DEFAULT_THEME = {
  v: 2, preset: "coral", a: "#cc4b2e", b: "#b93e22", mode: "auto", contrast: "normal", layout: "left", density: "roomy", size: "m",
  // 1.8.3 꾸미기 확장 (없으면 아래 기본값 = 예전과 똑같은 모습)
  set: "", grad: "", dir: "d", round: "normal", shadowLv: "soft", edge: "normal", font: "base", weight: "normal", lineH: "normal", iconW: "normal",
  motion: "normal", pattern: "none", bgGrad: false, glass: false, cBg: "", cCard: "", cText: "", cSide: "", accUse: "all", mine: [], useLight: "", useDark: ""
};
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
    card: "0 1px 2px rgba(0, 0, 0, 0.28), 0 6px 18px rgba(0, 0, 0, 0.18)",
    ok: "#5fd3a5",
    warn: "#f2c066",
    danger: "#f4867a",
    teal: "#6fd8c4",
    blue: "#6fa8f2",
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
    card: "0 1px 2px rgba(50, 38, 28, 0.05), 0 6px 18px rgba(50, 38, 28, 0.06)",
    ok: "#12775a",
    warn: "#8a5a00",
    danger: "#bd2a4a",
    teal: "#0e7466",
    blue: "#2a62b8",
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
    blue: "#8ec5ff",
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
    blue: "#0b3f94",
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
  if (!["auto", "dark", "light", "time"].includes(out.mode)) out.mode = "auto";
  out.contrast = out.contrast === "high" ? "high" : "normal";
  out.layout = pick(LAYOUTS, out.layout === "home" ? "left" : out.layout, "left");
  out.density = pick(DENSITIES, out.density, "roomy");
  out.size = pick(SIZES, out.size, "m");
  // 글자 크기: 막대로 고른 값(퍼센트). 없으면 보통/크게/아주 크게에서 가져온다.
  const z = Number(out.zoom);
  if (Number.isFinite(z) && z > 0) out.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z / 5) * 5));
  else out.zoom = Math.round((ZOOM[out.size] ?? 1) * 100);
  out.v = 2;
  return normalizeLook(out);
}
var oneOf = (v, list, d) => list.includes(v) ? v : d;
var hexOr = (v) => isHex(v) ? String(v).toLowerCase().replace(/^([^#])/, "#$1") : "";
function normalizeLook(out) {
  out.set = oneOf(out.set, THEME_SETS.map((s) => s.id), "");
  out.grad = oneOf(out.grad, GRADIENTS.map((g) => g.id), "");
  out.dir = oneOf(out.dir, DIRECTIONS.map((d) => d[0]), "d");
  out.round = oneOf(out.round, ["sharp", "normal", "round"], "normal");
  out.shadowLv = oneOf(out.shadowLv, ["none", "soft", "strong"], "soft");
  out.edge = oneOf(out.edge, ["none", "normal", "bold"], "normal");
  out.font = oneOf(out.font, FONTS.map((f) => f.id), "base");
  out.weight = oneOf(out.weight, ["normal", "bold"], "normal");
  out.lineH = oneOf(out.lineH, ["tight", "normal", "loose"], "normal");
  out.iconW = oneOf(out.iconW, ["thin", "normal", "bold"], "normal");
  out.motion = out.motion === "reduce" ? "reduce" : "normal";
  out.pattern = oneOf(out.pattern, ["none", "dots", "grid", "paper"], "none");
  out.bgGrad = out.bgGrad === true;
  out.glass = out.glass === true;
  out.accUse = out.accUse === "btn" ? "btn" : "all";
  for (const k of ["cBg", "cCard", "cText", "cSide"]) out[k] = hexOr(out[k]);
  out.mine = (Array.isArray(out.mine) ? out.mine : []).filter((m) => m && typeof m === "object" && String(m.name ?? "").trim() && m.theme && typeof m.theme === "object").slice(0, 12).map((m, i) => ({ id: String(m.id ?? "m" + i).slice(0, 32), name: String(m.name).trim().slice(0, 24), theme: pickLook(m.theme) }));
  const ids = out.mine.map((m) => m.id);
  out.useLight = ids.includes(out.useLight) ? out.useLight : "";
  out.useDark = ids.includes(out.useDark) ? out.useDark : "";
  return out;
}
// 내 테마에 저장되는 '모양' 값만 골라 정리한다 (내 테마 목록·밝기·크기는 넣지 않음)
export function pickLook(t) {
  const n = normalizeTheme({ ...t, mine: [], useLight: "", useDark: "" });
  const o = {};
  for (const k of VISUAL_KEYS) o[k] = n[k];
  if (t?.mode && ["light", "dark"].includes(t.mode)) o.mode = t.mode;
  return o;
}
export function resolveMode(theme, risuScheme, now = new Date()) {
  if (theme.mode === "time") {
    const hr = now.getHours();
    return hr >= 7 && hr < 19 ? "light" : "dark";
  }
  return theme.mode === "auto" ? risuScheme === "light" ? "light" : "dark" : theme.mode;
}
export function applySet(theme, id) {
  const t = normalizeTheme(theme);
  const s = THEME_SETS.find((x) => x.id === id);
  if (!s) return { ...t, set: "" };
  return normalizeTheme({ ...t, set: s.id, a: s.a, b: s.b, preset: "set", mode: s.mode, grad: "", cBg: "", cCard: "", cText: "" });
}
// 🎲 아무거나: 테마 묶음 + (가끔) 그라데이션까지 무작위로
export function randomSet(theme, rnd = Math.random) {
  const s = THEME_SETS[Math.floor(rnd() * THEME_SETS.length) % THEME_SETS.length];
  const t = applySet(theme, s.id);
  return rnd() > 0.6 ? { ...t, grad: GRADIENTS[Math.floor(rnd() * GRADIENTS.length) % GRADIENTS.length].id } : t;
}
// 밝을 때/어두울 때 따로 쓰는 내 테마가 있으면 그 모양을 덮어 쓴다
function withPair(theme, mode) {
  const id = mode === "light" ? theme.useLight : theme.useDark;
  const m = id && theme.mine.find((x) => x.id === id);
  return m ? { ...theme, ...m.theme, mode: theme.mode } : theme;
}
// 테마 코드: 내 테마 한 개를 글자로 만들고 다시 읽는다
export function themeCode(look) {
  const json = JSON.stringify(pickLook(look));
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => bin += String.fromCharCode(b));
  return "DA1:" + btoa(bin);
}
export function parseThemeCode(code) {
  const m = /^DA1:([A-Za-z0-9+/=]+)$/.exec(String(code ?? "").trim());
  if (!m) return null;
  try {
    const bin = atob(m[1]);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const obj = JSON.parse(new TextDecoder().decode(bytes));
    return obj && typeof obj === "object" ? pickLook(obj) : null;
  } catch {
    return null;
  }
}
function textTone(hex, bg, mode, ratio = 4.5) {
  const seed = mode === "dark" ? withLightness(hex, Math.max(lightnessOf(hex), 0.74)) : withLightness(hex, Math.min(lightnessOf(hex), 0.45));
  return ensureContrast(seed, bg, ratio);
}
// 테마 묶음·직접 색(바탕·카드·글자)이 있으면 기본 팔레트 위에 덮어쓰고, 읽기 어려운 조합은 대비를 자동으로 맞춘다
function customBase(theme, mode) {
  const set = THEME_SETS.find((s) => s.id === theme.set && s.mode === mode);
  const seeds = { ...set?.base ?? {} };
  if (theme.cBg) seeds.win = theme.cBg;
  if (theme.cCard) seeds.surf = theme.cCard;
  if (theme.cText) seeds.text = theme.cText;
  if (!seeds.win && !seeds.surf && !seeds.text) return null;
  const scheme = theme.cBg ? (lightnessOf(theme.cBg) > 0.5 ? "light" : "dark") : mode;
  const P = BASE[scheme];
  const win = seeds.win ?? P.win;
  const surf = seeds.surf ?? (theme.cBg ? (scheme === "light" ? mixHex(win, "#ffffff", 0.65) : mixHex(win, "#ffffff", 0.06)) : P.surf);
  const text = ensureContrast(ensureContrast(seeds.text ?? P.text, win, 4.5), surf, 4.5);
  const dark = scheme === "dark";
  const fit = (c) => ensureContrast(c, surf, 4.5);
  return {
    ...P,
    win, surf, text,
    surf2: mixHex(win, text, dark ? 0.1 : 0.07),
    hover: mixHex(win, text, 0.05),
    line: mixHex(win, text, 0.14),
    line2: mixHex(win, text, 0.09),
    line3: mixHex(win, text, 0.24),
    sub: fit(mixHex(text, surf, 0.28)),
    mute: fit(mixHex(text, surf, 0.42)),
    grip: mixHex(win, text, 0.35),
    trackOff: mixHex(win, text, 0.22),
    toast: surf,
    ok: fit(P.ok), warn: fit(P.warn), danger: fit(P.danger), teal: fit(P.teal), blue: fit(P.blue), rose: fit(P.rose)
  };
}
var SHADOW_STRONG = { dark: ["0 4px 14px rgba(0, 0, 0, 0.5)", "0 14px 34px rgba(0, 0, 0, 0.55)"], light: ["0 4px 14px rgba(50, 38, 28, 0.2)", "0 14px 34px rgba(50, 38, 28, 0.24)"] };
export function themeVars(themeIn, mode) {
  const theme = withPair(normalizeTheme(themeIn), mode);
  const hc = theme.contrast === "high";
  let B = BASE[hc ? mode === "light" ? "hcLight" : "hcDark" : mode] ?? BASE.dark;
  if (!hc) B = customBase(theme, mode) ?? B;
  const gr = GRADIENTS.find((g) => g.id === theme.grad);
  let a = gr ? gr.a : theme.a, b = gr ? gr.b : theme.b;
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
  const deg = (DIRECTIONS.find((d) => d[0] === theme.dir) ?? DIRECTIONS[1])[2];
  const btnOnly = theme.accUse === "btn";
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
    // 예전 화면 코드가 쓰던 이름들(홈 타일 숫자 · 글자 크기 막대 · 테마 빌더 선택 표시 · 에디터 강조): 강조 색을 그대로 따라가게 이어 둔다
    "--rb-acc": a,
    "--rb-accent": accText,
    "--rb-muted": B.mute,
    "--rb-panel": B.surf,
    "--rb-acc-a": a,
    "--rb-acc-b": b,
    "--rb-acc-grad": hc ? a : `linear-gradient(${deg}, ${a}, ${b})`,
    "--rb-deco-grad": hc ? accText : `linear-gradient(90deg, ${decoA}, ${decoB})`,
    "--rb-on-acc": on.fg,
    "--rb-acc-text": accText,
    "--rb-acc2-text": acc2Text,
    "--rb-acc-soft": btnOnly ? alpha(B.text, 0.07) : alpha(a, soft),
    "--rb-acc2-soft": btnOnly ? alpha(B.text, 0.07) : alpha(b, soft),
    "--rb-sel-bg": btnOnly ? alpha(B.text, 0.06) : alpha(a, hc ? 0.14 : mode === "dark" ? 0.12 : 0.07),
    "--rb-sel-ring": hc ? accText : btnOnly ? B.line3 : alpha(accText, 0.5),
    "--rb-focus": hc ? B.text : alpha(accText, 0.7),
    "--rb-ok": B.ok,
    "--rb-warn": B.warn,
    "--rb-danger": B.danger,
    "--rb-teal": B.teal,
    "--rb-blue": B.blue,
    "--rb-rose": B.rose,
    "--rb-ok-soft": alpha(B.ok, 0.13),
    "--rb-warn-soft": alpha(B.warn, 0.13),
    "--rb-danger-soft": alpha(B.danger, 0.13),
    "--rb-teal-soft": alpha(B.teal, 0.12),
    "--rb-blue-soft": alpha(B.blue, 0.12),
    "--rb-rose-soft": alpha(B.rose, 0.13),
    "--rb-toast": B.toast,
    // 모양·크기 토큰: 둥글기 4단계, 컨트롤 높이, 줄 여백, 글자 배율
    "--rb-r1": "10px",
    "--rb-r2": "14px",
    "--rb-r3": "20px",
    "--rb-r4": "26px",
    "--rb-pill": "999px",
    "--rb-ctl": dens ? "36px" : "42px",
    "--rb-ctl-sm": dens ? "30px" : "34px",
    "--rb-row-py": dens ? "8px" : "13px",
    "--rb-gap": dens ? "10px" : "16px",
    "--rb-zoom": String(zoomOf(theme)),
    // 1.8.3 꾸미기 확장 토큰 (기본값은 예전 모습 그대로)
    "--rb-font": "inherit",
    "--rb-fw": "400",
    "--rb-lh": LINEH_V[theme.lineH],
    "--rb-icon-w": ICONW_V[theme.iconW],
    "--rb-motion": theme.motion === "reduce" ? "0.001ms" : "1",
    "--rb-pattern": "none",
    "--rb-pattern-size": "auto",
    "--rb-glass": "none",
    "--rb-side": theme.cSide || "transparent",
    "--rb-win-grad": "none"
  };
  if (!hc) {
    const px = ROUND_PX[theme.round];
    ["--rb-r1", "--rb-r2", "--rb-r3", "--rb-r4"].forEach((k, i) => v[k] = px[i]);
    v["--rb-pill"] = theme.round === "sharp" ? px[1] : "999px";   // 각지게를 고른 사람은 버튼·칩도 각지게
    v["--rb-bw"] = EDGE_V[theme.edge];
    if (theme.shadowLv === "none") {
      v["--rb-shadow-card"] = "none";
      v["--rb-shadow-sm"] = "none";
    } else if (theme.shadowLv === "strong") {
      const s2 = SHADOW_STRONG[B.scheme] ?? SHADOW_STRONG.dark;
      v["--rb-shadow-card"] = s2[0];
      v["--rb-shadow-sm"] = s2[1];
    }
    v["--rb-fw"] = theme.weight === "bold" ? "600" : "400";
    const pc = alpha(B.text, mode === "dark" ? 0.14 : 0.12);
    if (theme.pattern === "dots") { v["--rb-pattern"] = `radial-gradient(${pc} 1px, transparent 1.2px)`; v["--rb-pattern-size"] = "18px 18px"; }
    else if (theme.pattern === "grid") { v["--rb-pattern"] = `linear-gradient(${pc} 1px, transparent 1px), linear-gradient(90deg, ${pc} 1px, transparent 1px)`; v["--rb-pattern-size"] = "24px 24px"; }
    else if (theme.pattern === "paper") { v["--rb-pattern"] = `repeating-linear-gradient(0deg, ${alpha(B.text, 0.035)} 0 2px, transparent 2px 4px)`; v["--rb-pattern-size"] = "auto"; }
    if (theme.glass) v["--rb-glass"] = "blur(14px) saturate(1.2)";
    if (theme.bgGrad) v["--rb-win-grad"] = `linear-gradient(160deg, ${B.win}, ${mixHex(B.win, a, 0.14)})`;
  }
  v["--rb-font"] = (FONTS.find((f) => f.id === theme.font) ?? FONTS[0]).stack;
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
