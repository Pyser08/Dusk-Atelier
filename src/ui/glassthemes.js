// 2.2.0 글래스 테마 6종(HandOff/UI-GLASS.md §3-3) + 밝은 모드 짝. DOM 없음.
// 적용: themeVars에 바탕(cBg)·강조(a,b)를 넣어 기존 토큰(--rb-acc·--rb-text…)을 그대로 계산하고,
// 빛 번짐·발광·숫자 끝 색만 --rb-gb1~4·--rb-gtint·--rb-gglow로 따로 준다. 'mine' = 고른 강조색을 그대로(빛 번짐도 강조색에서).

export var GLASS_THEMES = [
  // 기본: Dusk(황혼) — 해가 진 직후 보랏빛 하늘, 지평선의 주황·분홍 빛
  { id: "dusk", name: "Dusk 황혼", acc: "#ff9a76", acc2: "#b07cff", acc3: "#ffc27a", tint: "#ffd9c7",
    dark: { bg: "#171028", blobs: ["rgba(255,140,90,.5)", "rgba(120,90,255,.55)", "rgba(255,190,110,.38)", "rgba(220,90,170,.45)"] },
    light: { bg: "#fbf3f4", blobs: ["rgba(255,160,110,.42)", "rgba(150,120,255,.36)", "rgba(255,205,130,.42)", "rgba(235,120,185,.32)"] } },
  { id: "night", name: "나이트 다이어리", acc: "#6ea8ff", acc2: "#a77bff", acc3: "#7fe0ff", tint: "#cfe0ff",
    dark: { bg: "#0a1230", blobs: ["rgba(70,120,255,.55)", "rgba(150,80,255,.55)", "rgba(80,200,255,.35)", "rgba(60,60,200,.5)"] },
    light: { bg: "#eef3ff", blobs: ["rgba(90,140,255,.4)", "rgba(160,110,255,.35)", "rgba(90,210,255,.35)", "rgba(80,90,220,.3)"] } },
  { id: "sakura", name: "벚꽃", acc: "#ff9ec4", acc2: "#ffc2d9", acc3: "#ffe0a8", tint: "#ffe3ee",
    dark: { bg: "#2a1324", blobs: ["rgba(255,150,190,.6)", "rgba(255,200,220,.4)", "rgba(255,230,180,.35)", "rgba(220,120,200,.45)"] },
    light: { bg: "#fff3f7", blobs: ["rgba(255,150,190,.45)", "rgba(255,200,220,.5)", "rgba(255,225,170,.4)", "rgba(230,140,210,.35)"] } },
  { id: "aurora", name: "오로라", acc: "#4fe3b5", acc2: "#5b8cff", acc3: "#b4ff8c", tint: "#d4fff0",
    dark: { bg: "#071a1f", blobs: ["rgba(60,230,180,.5)", "rgba(80,140,255,.5)", "rgba(170,255,140,.3)", "rgba(40,190,220,.45)"] },
    light: { bg: "#effbf7", blobs: ["rgba(60,220,170,.38)", "rgba(90,150,255,.35)", "rgba(170,240,130,.35)", "rgba(50,190,220,.35)"] } },
  { id: "sunset", name: "노을", acc: "#ff8a5c", acc2: "#ff5c8a", acc3: "#ffd36b", tint: "#ffe2cf",
    dark: { bg: "#24100c", blobs: ["rgba(255,120,70,.6)", "rgba(255,70,120,.45)", "rgba(255,200,90,.45)", "rgba(170,60,140,.45)"] },
    light: { bg: "#fff4ee", blobs: ["rgba(255,140,90,.42)", "rgba(255,90,140,.32)", "rgba(255,205,100,.42)", "rgba(190,90,160,.3)"] } },
  { id: "mono", name: "모노 글래스", acc: "#d8d8e6", acc2: "#9a9ab8", acc3: "#ffffff", tint: "#eeeeff", lightAcc: "#5a5a78", lightAcc2: "#8a8aa8",
    dark: { bg: "#141418", blobs: ["rgba(200,200,220,.22)", "rgba(140,140,170,.28)", "rgba(255,255,255,.12)", "rgba(110,110,140,.3)"] },
    light: { bg: "#f3f3f6", blobs: ["rgba(170,170,190,.35)", "rgba(140,140,170,.3)", "rgba(255,255,255,.6)", "rgba(120,120,150,.25)"] } },
  ...[
    // id, 이름, 강조, 강조2, 셋째(빛), 어두운 바탕, 밝은 바탕
    ["lavender", "라벤더", "#b9a2ff", "#7f8cff", "#f0c6ff", "#140f26", "#f6f3ff"],
    ["ocean", "깊은 바다", "#4cc3ff", "#3a6dff", "#7ff0e0", "#06142a", "#eef7ff"],
    ["forest", "숲", "#7fdc8f", "#2fb39a", "#e4f08a", "#0b1a12", "#f1f9f1"],
    ["rosegold", "로즈 골드", "#f4a9a0", "#d98bb0", "#ffd9a0", "#21141a", "#fdf4f2"],
    ["coral", "코랄", "#ff8a7a", "#ffb36b", "#ff7ab8", "#22110f", "#fff4f1"],
    ["cherry", "체리", "#ff5f86", "#c14bff", "#ff9fb4", "#200a14", "#fff1f5"],
    ["galaxy", "은하", "#9b7bff", "#ff6ad5", "#59c8ff", "#0b0820", "#f4f2ff"],
    ["neon", "네온", "#2ff3e0", "#ff3fb4", "#c6ff3f", "#08090f", "#f2fbfb"],
    ["mocha", "모카", "#d9a37a", "#b98a6a", "#f2d4a6", "#1a120d", "#f9f4ef"],
    ["ice", "얼음", "#9fdcff", "#b6c6ff", "#e6fbff", "#0b1420", "#f3f9ff"],
    ["wine", "와인", "#d9607a", "#8f4bb8", "#f0a070", "#1c0a12", "#fbf1f4"],
    ["peach", "복숭아", "#ffb08a", "#ff8fa8", "#ffe08a", "#22140f", "#fff6f0"],
    ["lemon", "레몬", "#f2e06a", "#8fe08a", "#ffb86b", "#17160a", "#fdfcef"],
    ["matcha", "말차", "#a8d08d", "#6fbf9f", "#e8e6a0", "#111a10", "#f5f9f0"],
    ["midnight", "한밤", "#7aa2ff", "#5d6cff", "#c9d6ff", "#070b18", "#f1f4fb"],
    ["twilight", "보랏빛 새벽", "#c79bff", "#7fb0ff", "#ffb3d9", "#120c22", "#f8f4ff"]
  ].map(([id, name, acc, acc2, acc3, dbg, lbg]) => ({ id, name, acc, acc2, acc3, tint: mixW(acc, 0.6),
    dark: { bg: dbg, blobs: [hexA(acc, 0.5), hexA(acc2, 0.5), hexA(acc3, 0.32), hexA(mixC(acc, acc2), 0.42)] },
    light: { bg: lbg, blobs: [hexA(acc, 0.4), hexA(acc2, 0.34), hexA(acc3, 0.4), hexA(mixC(acc, acc2), 0.3)] } }))
];
export var GLASS_IDS = [...GLASS_THEMES.map((t) => t.id), "mine"];
export var glassTheme = (id) => GLASS_THEMES.find((t) => t.id === id) ?? null;

// themeVars에 넘길 테마: 글래스 테마면 바탕·강조를 그 테마 값으로(모양·글꼴 등 나머지는 그대로)
export function glassThemeInput(theme, mode) {
  const g = glassTheme(theme.gtheme);
  if (!g) return theme;
  const light = mode === "light";
  return { ...theme, set: "", grad: "", preset: "custom", cCard: "", cText: "", cSide: "",
    a: light && g.lightAcc ? g.lightAcc : g.acc, b: light && g.lightAcc2 ? g.lightAcc2 : g.acc2, cBg: (light ? g.light : g.dark).bg };
}

// 빛 번짐·발광·숫자 끝 색. 'mine'이면 빈 값(=CSS 기본: 강조색에서 만듦)
export function glassExtraVars(theme, mode) {
  const g = glassTheme(theme.gtheme);
  const keys = ["--rb-gb1", "--rb-gb2", "--rb-gb3", "--rb-gb4", "--rb-gtint", "--rb-gglow", "--rb-gacc3"];
  if (!g) return Object.fromEntries(keys.map((k) => [k, ""]));
  const p = mode === "light" ? g.light : g.dark;
  const glowA = g.id === "mono" ? 0.35 : 0.55;
  return {
    "--rb-gb1": p.blobs[0], "--rb-gb2": p.blobs[1], "--rb-gb3": p.blobs[2], "--rb-gb4": p.blobs[3],
    "--rb-gtint": mode === "light" ? g.acc2 : g.tint,
    "--rb-gglow": hexA(g.acc, mode === "light" ? glowA * 0.6 : glowA),
    "--rb-gacc3": g.acc3
  };
}
function rgbOf(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function toHex(rgb) { return "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""); }
function mixW(hex, w) { return toHex(rgbOf(hex).map((v) => v + (255 - v) * w)); }
function mixC(a, b) { const x = rgbOf(a), y = rgbOf(b); return toHex(x.map((v, i) => (v + y[i]) / 2)); }
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
// 고르기 버튼의 동그라미 색
export var glassSwatch = (g) => `linear-gradient(135deg, ${g.acc}, ${g.acc2})`;
