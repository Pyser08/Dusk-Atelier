// v1.8.3 꾸미기 카탈로그: 테마 묶음 · 강조 색 · 그라데이션 · 모양 · 글꼴. 순수 데이터라 화면(꾸미기·시작 안내)이 같이 쓴다.
// 외부 글꼴은 쓰지 않는다(RisuAI 안에서 막힐 수 있음) — 기기에 있는 글꼴 목록만 쓴다.

// 강조 색 18개 (따뜻한 4 · 차분한 8 · 파스텔 6). 앞의 6개 id는 예전 저장값과 같다.
export var ACCENTS = [
  { id: "coral", name: "코랄", g: "warm", a: "#cc4b2e", b: "#b93e22" },
  { id: "rose", name: "로즈", g: "warm", a: "#c43a5a", b: "#a82f4c" },
  { id: "amber", name: "호박", g: "warm", a: "#b4690e", b: "#9a5808" },
  { id: "terra", name: "테라코타", g: "warm", a: "#b5533c", b: "#9a4430" },
  { id: "teal", name: "청록", g: "calm", a: "#0f766e", b: "#0b5f59" },
  { id: "sage", name: "세이지", g: "calm", a: "#4d7a4f", b: "#3d663f" },
  { id: "lilac", name: "라일락", g: "calm", a: "#7c4fc2", b: "#6840a8" },
  { id: "mono", name: "모노", g: "calm", a: "#3f4650", b: "#2b3038" },
  { id: "dusk", name: "황혼", g: "calm", a: "#4f63e0", b: "#7c4fe0" },
  { id: "ocean", name: "바다", g: "calm", a: "#2466a8", b: "#1c5287" },
  { id: "slate", name: "청회", g: "calm", a: "#51697f", b: "#3f566a" },
  { id: "indigo", name: "남색", g: "calm", a: "#3f4aa8", b: "#323b8c" },
  { id: "p-pink", name: "분홍", g: "pastel", a: "#e58aa8", b: "#d27393" },
  { id: "p-peach", name: "복숭아", g: "pastel", a: "#f0a37a", b: "#e08c62" },
  { id: "p-mint", name: "민트", g: "pastel", a: "#74c9ae", b: "#5db99c" },
  { id: "p-sky", name: "하늘", g: "pastel", a: "#7fb7e6", b: "#689fd2" },
  { id: "p-lav", name: "연보라", g: "pastel", a: "#b79af0", b: "#a284e0" },
  { id: "p-lemon", name: "레몬", g: "pastel", a: "#e6cf6a", b: "#d3bb52" }
];
export var ACCENT_GROUPS = [["warm", "따뜻한"], ["calm", "차분한"], ["pastel", "파스텔"]];

// 그라데이션 8개 (고르면 버튼·포인트가 두 색으로 흐른다)
export var GRADIENTS = [
  { id: "sunset", name: "노을", a: "#f6a35c", b: "#e0567a" },
  { id: "dusk", name: "황혼", a: "#7c4fe0", b: "#e0567a" },
  { id: "night", name: "밤하늘", a: "#2b3a8f", b: "#6a3fb5" },
  { id: "aurora", name: "오로라", a: "#2fbf9a", b: "#6a7fe8" },
  { id: "peach", name: "복숭아", a: "#f7b38a", b: "#f08aa6" },
  { id: "forest", name: "숲", a: "#3f8f5f", b: "#2f6f6f" },
  { id: "sand", name: "모래", a: "#d9b27a", b: "#b9805a" },
  { id: "neon", name: "네온", a: "#22e0c8", b: "#a64bff" }
];
export var DIRECTIONS = [["h", "가로", "90deg"], ["d", "대각선", "135deg"], ["v", "세로", "180deg"]];

// 테마 묶음 12개: 바탕·카드·글자 색 + 어울리는 강조 색. mode는 이 묶음이 설계된 밝기.
export var THEME_SETS = [
  { id: "paper-gray", name: "기본 회백", mode: "light", base: { win: "#f4f2ef", surf: "#ffffff", text: "#211f1c" }, a: "#cc4b2e", b: "#b93e22" },
  { id: "warm-paper", name: "따뜻한 종이", mode: "light", base: { win: "#f6efe3", surf: "#fffaf0", text: "#2e2418" }, a: "#a8552d", b: "#8f4623" },
  { id: "cool-gray", name: "차가운 회색", mode: "light", base: { win: "#eef1f4", surf: "#ffffff", text: "#1c2530" }, a: "#2f6fa8", b: "#255a8a" },
  { id: "charcoal", name: "숯", mode: "dark", base: { win: "#171615", surf: "#211f1d", text: "#f3f0eb" }, a: "#cc4b2e", b: "#b93e22" },
  { id: "midnight", name: "미드나잇", mode: "dark", base: { win: "#0f1424", surf: "#171d33", text: "#e8ecfa" }, a: "#6d86ff", b: "#5470f0" },
  { id: "violet-night", name: "보랏빛 밤", mode: "dark", base: { win: "#1a1326", surf: "#241a35", text: "#f0e9fb" }, a: "#a98bf0", b: "#8f6fe0" },
  { id: "sakura", name: "벚꽃", mode: "light", base: { win: "#fbf1f3", surf: "#ffffff", text: "#3a2229" }, a: "#d0577a", b: "#b9486a" },
  { id: "mint-cream", name: "민트 크림", mode: "light", base: { win: "#eef7f2", surf: "#ffffff", text: "#1d2b25" }, a: "#2e8f78", b: "#257a65" },
  { id: "sepia", name: "세피아", mode: "light", base: { win: "#efe4d0", surf: "#f8f0e0", text: "#3a2c1a" }, a: "#8a5a2b", b: "#734a22" },
  { id: "oled", name: "OLED 블랙", mode: "dark", base: { win: "#000000", surf: "#0b0b0b", text: "#f5f5f5" }, a: "#6fd8c4", b: "#52c4ae" },
  { id: "forest-night", name: "숲속", mode: "dark", base: { win: "#101a14", surf: "#17251c", text: "#e6f1e9" }, a: "#6fbf86", b: "#58a870" },
  { id: "deep-sea", name: "바다", mode: "dark", base: { win: "#0b1a24", surf: "#112634", text: "#e4f1f8" }, a: "#4fb0d8", b: "#3a98c0" }
];

export var FONTS = [
  { id: "base", name: "기본", stack: "inherit" },
  { id: "system", name: "기기 글꼴", stack: 'system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
  { id: "serif", name: "명조", stack: '"Nanum Myeongjo", "Noto Serif KR", "Apple Myungjo", "Batang", serif' },
  { id: "round", name: "둥근", stack: '"Nanum Gothic", ui-rounded, "SF Pro Rounded", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif' },
  { id: "mono", name: "고정폭", stack: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "D2Coding", monospace' }
];
export var ROUNDS = [["sharp", "각지게"], ["normal", "보통"], ["round", "둥글게"]];
export var ROUND_PX = { sharp: ["4px", "6px", "8px", "12px"], normal: ["8px", "12px", "16px", "22px"], round: ["12px", "18px", "24px", "32px"] };
export var SHADOWS = [["none", "없음"], ["soft", "은은하게"], ["strong", "진하게"]];
export var EDGES = [["none", "없음"], ["normal", "보통"], ["bold", "굵게"]];
export var WEIGHTS = [["normal", "보통"], ["bold", "굵게"]];
export var LINEHS = [["tight", "촘촘"], ["normal", "보통"], ["loose", "넉넉"]];
export var ICONWS = [["thin", "가늘게"], ["normal", "보통"], ["bold", "굵게"]];
export var PATTERNS = [["none", "없음"], ["dots", "점"], ["grid", "모눈"], ["paper", "종이"]];
export var MODES = [["auto", "자동"], ["light", "밝게"], ["dark", "어둡게"], ["time", "시간 따라"]];
// 고르는 값 ↔ 실제 토큰
export var LINEH_V = { tight: "1.35", normal: "1.5", loose: "1.75" };
export var ICONW_V = { thin: "1.6", normal: "2", bold: "2.4" };
export var EDGE_V = { none: "0px", normal: "1px", bold: "2px" };

// 테마 코드: 내 테마를 문자열로 주고받는다 (앞에 DA1: 이 붙음)
export var VISUAL_KEYS = ["preset", "a", "b", "set", "grad", "dir", "round", "shadowLv", "edge", "font", "weight", "lineH", "iconW", "pattern", "bgGrad", "glass", "cBg", "cCard", "cText", "cSide", "accUse"];
