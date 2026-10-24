// 테마 빌더: 고르기만 해서 채팅 테마(커스텀 HTML + CSS)를 만든다.
// 퀄리티는 미리 만든 스타일이 책임지고, 사용자 선택은 공통 변수(--t-*) 값으로만 바뀐다.
// 결과는 일반 테마로 저장 → 스튜디오에서 고급 편집 가능.
import { newTheme } from './themes.js';

// ── 색 (OKLCH) ──
var clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function hexToRgb(hex) {
  let s = String(hex || "").replace("#", "").trim();
  if (s.length === 3) s = [...s].map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(s)) s = "7c5cf0";
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
}
var rgbToHex = (rgb) => "#" + rgb.map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, "0")).join("");
var toLin = (c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
var toGam = (c) => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
export function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}
function oklchToRgb({ l, c, h }) {
  const hr = h * Math.PI / 180, A = c * Math.cos(hr), B = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_
  ];
}
// 색역 밖이면 채도를 줄여 맞춘다
export function oklch(l, c, h) {
  let cc = c;
  for (let i = 0; i < 24; i++) {
    const rgb = oklchToRgb({ l, c: cc, h });
    if (rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) return rgbToHex(rgb.map(toGam));
    cc *= 0.85;
  }
  return rgbToHex(oklchToRgb({ l, c: 0, h }).map((v) => toGam(clamp(v))));
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
// 배경과 대비가 min 이상 되도록 글자색 밝기를 민다 (WCAG)
export function ensureContrast(fg, bg, min = 4.5) {
  if (contrast(fg, bg) >= min) return fg;
  const o = hexToOklch(fg), up = luminance(bg) < 0.18;
  for (let i = 1; i <= 40; i++) {
    const l = clamp(o.l + (up ? 1 : -1) * i * 0.02);
    const c = oklch(l, o.c, o.h);
    if (contrast(c, bg) >= min) return c;
  }
  return up ? "#ffffff" : "#111111";
}

// 대표색 하나 + 밝기 모드 → 팔레트
// vivid 0~100 (차분↔화려): 바탕 채도·대표색 채도를 함께 민다
export function makePalette(accent, mode = "dark", vivid = 50) {
  const f = 0.35 + 1.3 * clamp(vivid, 0, 100) / 100;
  const a = hexToOklch(accent), h = a.h, c = Math.min(a.c * (0.55 + 0.9 * clamp(vivid, 0, 100) / 100), 0.24), cs = Math.min(a.c, 0.2) * f;
  const dark = mode === "dark";
  const P = dark ? {
    bg: oklch(0.17, cs * 0.12, h), paper: oklch(0.22, cs * 0.16, h), tint: oklch(0.27, cs * 0.28, h),
    line: oklch(0.34, cs * 0.22, h), ink: oklch(0.93, cs * 0.05, h), muted: oklch(0.72, cs * 0.12, h),
    accent: oklch(clamp(a.l, 0.62, 0.8), c, h), accent2: oklch(clamp(a.l, 0.62, 0.8), c, (h + 40) % 360)
  } : {
    bg: oklch(0.95, cs * 0.08, h), paper: oklch(0.985, cs * 0.04, h), tint: oklch(0.93, cs * 0.2, h),
    line: oklch(0.87, cs * 0.15, h), ink: oklch(0.27, cs * 0.12, h), muted: oklch(0.5, cs * 0.15, h),
    accent: oklch(clamp(a.l, 0.45, 0.6), c, h), accent2: oklch(clamp(a.l, 0.45, 0.6), c, (h + 40) % 360)
  };
  P.ink = ensureContrast(P.ink, P.paper, 7);
  P.muted = ensureContrast(P.muted, P.paper, 4.5);
  P.accentText = ensureContrast(P.accent, P.paper, 4.5);
  P.onAccent = contrast("#ffffff", P.accent) >= contrast("#111111", P.accent) ? "#ffffff" : "#111111";
  P.userBubble = ensureBubble(P.accent, P, dark);
  P.userBubble2 = oklch(hexToOklch(P.userBubble).l, hexToOklch(P.userBubble).c, (hexToOklch(P.userBubble).h + 40) % 360);
  P.onUser = ensureContrast(ensureContrast(P.onAccent, P.userBubble, 4.5), P.userBubble2, 4.5);
  P.shadow = (0.04 + 0.14 * clamp(vivid, 0, 100) / 100).toFixed(3);
  return P;
}
function ensureBubble(accent, P, dark) {
  const o = hexToOklch(accent);
  return oklch(dark ? 0.42 : 0.55, Math.min(o.c, 0.14), o.h);
}

// ── 공통 HTML 틀 (모든 스타일이 같은 구조, 모양은 CSS가 맡는다) ──
var NAME = "{{#when::{{role}}::is::char}}{{char}}{{:else}}{{user}}{{/when}}";
export var BUILDER_HTML = `<div class="dt dt-{{role}}">
  <div class="dt-card">
    <div class="dt-head">
      <div class="dt-av"><risuicon></risuicon></div>
      <div class="dt-meta"><span class="dt-name">${NAME}</span><span class="dt-date">{{date}}</span></div>
    </div>
    <div class="dt-body"><risutextbox></risutextbox></div>
    <div class="dt-foot"><risugeninfo></risugeninfo><risubuttons></risubuttons></div>
  </div>
</div>`;

// 공통 바탕: 변수 계약 + 리스 기본 요소 정리. 프로필은 캐릭터·내 글 모두 자기 카드 안(.dt-head)에 있다
var BASE = `.dt{display:block;width:100%;max-width:var(--t-card-width);margin:0 auto var(--t-gap);padding:0 12px;box-sizing:border-box;color:var(--t-ink);font-family:var(--t-font-body);text-align:left}
.dt *{box-sizing:border-box}
.dt-card{position:relative;width:100%;min-width:0}
.dt-head{display:flex;align-items:center;gap:12px;min-width:0}
.dt-av{position:relative;flex:none;width:var(--t-avatar-size);height:var(--t-avatar-size);border-radius:var(--t-avatar-radius);overflow:hidden;background:var(--t-tint)}
.dt-av img,.dt-av>*{display:block;width:100%;height:100%;object-fit:cover}
.dt-meta{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:0}
.dt-name{font-weight:700;color:var(--t-ink);font-family:var(--t-font-display)}
.dt-date{font-size:.78em;color:var(--t-muted)}
.dt-body{max-width:var(--t-text-width)}
.dt-body,.dt-body .chattext{font-size:var(--t-font-size);line-height:var(--t-line-height);color:var(--t-ink);word-break:keep-all;overflow-wrap:anywhere}
.dt-body p:first-child{margin-top:0}
.dt-body p:last-child{margin-bottom:0}
.dt-body em{color:var(--t-muted)}
.dt-body strong{color:var(--t-ink)}
.dt-body mark,.dt-body q{background:transparent;color:var(--t-accent-text)}
.dt-body img{max-width:100%;height:auto}
.dt-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 10px;margin-top:8px;font-size:12px;color:var(--t-muted)}
.dt-foot button{color:var(--t-muted)}
.dt-foot button:hover{color:var(--t-accent-text)}
@media (max-width:600px){.dt{padding:0 6px}}`;

// ── 스타일 ──
// css: 늘 들어가는 모양 / deco: 켜고 끌 장식 / 여백은 calc(..*var(--t-space))
// 모든 스타일은 같은 마크업: 카드 안 머리(프로필+이름·날짜) → 본문 → 아래줄
var CENTER = `.dt-body,.dt-foot{margin-inline:auto;max-width:var(--t-text-width)}`;
export var STYLES = [
  {
    id: "letter",
    name: "편지",
    desc: "종이 위에 쓴 편지. 명조, 넉넉한 여백, 우표 같은 프로필",
    mode: "light",
    accent: "#9a6b4f",
    vars: { radius: 4, fontSize: 15.5, lineHeight: 1.95, cardWidth: 820, gap: 26, avatarSize: 56, avatarRadius: 3 },
    font: "serif",
    avatar: "stamp",
    css: `.dt-card{background:var(--t-paper);border:1px solid var(--t-line);border-radius:var(--t-radius);padding:calc(24px*var(--t-space)) calc(30px*var(--t-space)) calc(16px*var(--t-space))}
.dt-head{border-bottom:1px solid var(--t-line);padding-bottom:calc(12px*var(--t-space));margin-bottom:calc(16px*var(--t-space))}
.dt-av{order:2;margin-left:auto}
.dt-name{font-size:1.15em;letter-spacing:.02em}
.dt-date{font-style:italic}
.dt-user .dt-card{background-color:var(--t-tint)}
.dt-foot{border-top:1px dotted var(--t-line);padding-top:8px}
${CENTER}
@media (max-width:600px){.dt-card{padding:16px 16px 12px}}`,
    deco: [
      { id: "lines", name: "줄 노트", on: true, css: `.dt-body{background-image:repeating-linear-gradient(transparent 0 calc(var(--t-font-size)*var(--t-line-height) - 1px),var(--t-tint) 0 calc(var(--t-font-size)*var(--t-line-height)))}
.dt-user .dt-body{background-image:repeating-linear-gradient(transparent 0 calc(var(--t-font-size)*var(--t-line-height) - 1px),var(--t-line) 0 calc(var(--t-font-size)*var(--t-line-height)))}` },
      { id: "salute", name: "To. / From.", on: true, css: `.dt-name::before{content:"To. ";font-weight:400;color:var(--t-muted)}
.dt-char .dt-name::before{content:"From. "}` },
      { id: "shadow", name: "종이 그림자", on: true, css: `.dt-card{box-shadow:0 1px 0 var(--t-line),0 8px 26px rgb(0 0 0/var(--t-shadow))}` },
      { id: "seal", name: "봉인 도장", on: false, css: `.dt-char .dt-card::after{content:"";position:absolute;right:22px;bottom:-12px;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 35%,var(--t-accent2),var(--t-accent));box-shadow:0 2px 4px rgb(0 0 0/.25)}` }
    ]
  },
  {
    id: "messenger",
    name: "메신저",
    desc: "익숙한 메신저 말풍선. 내 말은 오른쪽, 대표색 풍선",
    mode: "dark",
    accent: "#7c5cf0",
    vars: { radius: 18, fontSize: 15, lineHeight: 1.65, cardWidth: 860, gap: 12, avatarSize: 34, avatarRadius: 50 },
    font: "sans",
    avatar: "circle",
    css: `.dt-card{display:flex;flex-direction:column;align-items:flex-start}
.dt-head{gap:8px;margin:0 0 6px}
.dt-meta{flex-direction:row;align-items:baseline;gap:8px}
.dt-name{font-size:.88em;font-weight:600}
.dt-body{max-width:min(82%,var(--t-text-width));margin-left:calc(var(--t-avatar-size) + 8px);background:var(--t-paper);border:1px solid var(--t-line);border-radius:var(--t-radius);padding:calc(10px*var(--t-space)) calc(14px*var(--t-space))}
.dt-foot{margin-left:calc(var(--t-avatar-size) + 8px);margin-top:4px;justify-content:flex-start}
.dt-user .dt-card{align-items:flex-end}
.dt-user .dt-head{flex-direction:row-reverse}
.dt-user .dt-meta{flex-direction:row-reverse}
.dt-user .dt-body{margin-left:0;margin-right:calc(var(--t-avatar-size) + 8px);background:var(--t-user-bubble);border-color:transparent}
.dt-user .dt-foot{margin-left:0;margin-right:calc(var(--t-avatar-size) + 8px);justify-content:flex-end}
.dt-user .dt-body,.dt-user .dt-body .chattext,.dt-user .dt-body em,.dt-user .dt-body strong,.dt-user .dt-body mark,.dt-user .dt-body q{color:var(--t-on-user)}
@media (max-width:600px){.dt-body{max-width:92%}}`,
    deco: [
      { id: "tail", name: "말풍선 꼬리", on: true, css: `.dt-body{border-top-left-radius:4px}
.dt-user .dt-body{border-top-left-radius:var(--t-radius);border-top-right-radius:4px}` },
      { id: "name", name: "이름 표시", on: true, css: "", off: `.dt-name{display:none}` },
      { id: "grad", name: "그라데이션 풍선", on: false, css: `.dt-user .dt-body{background:linear-gradient(135deg,var(--t-user-bubble),var(--t-user-bubble2))}` },
      { id: "shadow", name: "떠 있는 풍선", on: false, css: `.dt-body{box-shadow:0 3px 12px rgb(0 0 0/var(--t-shadow))}` }
    ]
  },
  {
    id: "card",
    name: "미니멀 카드",
    desc: "군더더기 없는 카드. 얇은 선, 왼쪽 대표색 줄",
    mode: "dark",
    accent: "#4f9cf7",
    vars: { radius: 12, fontSize: 15, lineHeight: 1.75, cardWidth: 860, gap: 14, avatarSize: 36, avatarRadius: 10 },
    font: "sans",
    avatar: "style",
    css: `.dt-card{background:var(--t-paper);border:1px solid var(--t-line);border-radius:var(--t-radius);padding:calc(14px*var(--t-space)) calc(18px*var(--t-space)) calc(10px*var(--t-space))}
.dt-head{margin-bottom:calc(10px*var(--t-space))}
.dt-meta{flex-direction:row;align-items:center;gap:10px}
.dt-name{font-size:.9em;letter-spacing:.03em}
.dt-date{margin-left:auto}
.dt-user .dt-card{background:var(--t-tint)}
${CENTER}`,
    deco: [
      { id: "bar", name: "왼쪽 대표색 줄", on: true, css: `.dt-card{border-left:3px solid var(--t-accent)}
.dt-user .dt-card{border-left-color:var(--t-muted)}` },
      { id: "dot", name: "이름 앞 점", on: true, css: `.dt-meta::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--t-accent)}
.dt-user .dt-meta::before{background:var(--t-muted)}` },
      { id: "caps", name: "대문자 이름", on: true, css: `.dt-name{text-transform:uppercase}` },
      { id: "glow", name: "은은한 빛", on: false, css: `.dt-char .dt-card{box-shadow:0 0 0 1px color-mix(in srgb,var(--t-accent) 25%,transparent),0 8px 28px color-mix(in srgb,var(--t-accent) 18%,transparent)}` }
    ]
  },
  {
    id: "diary",
    name: "밤의 일기",
    desc: "별이 뜬 밤하늘 일기장. 우표 프로필, 날짜 배지, 점선 구분, 가운데 글줄",
    mode: "dark",
    accent: "#6a7cf0",
    vars: { radius: 14, fontSize: 15, lineHeight: 1.85, cardWidth: 960, gap: 22, avatarSize: 92, avatarRadius: 3 },
    font: "sans",
    avatar: "stamp",
    css: `.dt-card{border:1px solid var(--t-line);border-radius:var(--t-radius);padding:calc(20px*var(--t-space)) calc(26px*var(--t-space)) calc(10px*var(--t-space));background:linear-gradient(160deg,color-mix(in srgb,var(--t-accent) 14%,var(--t-paper)),var(--t-paper) 55%)}
.dt-head{align-items:flex-end;gap:16px;padding-bottom:calc(16px*var(--t-space));margin-bottom:calc(20px*var(--t-space));border-bottom:1px dashed var(--t-line)}
.dt-meta{gap:8px;padding-bottom:4px}
.dt-name{font-size:.72em;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--t-muted)}
.dt-char .dt-name::before{content:"FROM · ";opacity:.7}
.dt-user .dt-name::before{content:"TO · ";opacity:.7}
.dt-date{display:inline-flex;align-items:center;gap:6px;padding:3px 11px;border:1px solid var(--t-line);border-radius:99px;font-size:.74em;color:var(--t-muted)}
.dt-date::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--t-accent)}
.dt-foot{max-width:none;margin-top:calc(16px*var(--t-space));padding-top:8px;border-top:1px dashed var(--t-line)}
.dt-body{margin-inline:auto;max-width:var(--t-text-width)}
.dt-user .dt-card{background:linear-gradient(160deg,color-mix(in srgb,var(--t-accent2) 12%,var(--t-tint)),var(--t-tint) 55%)}
.dt-user .dt-head{flex-direction:row-reverse}
.dt-user .dt-meta{align-items:flex-end}
@media (max-width:600px){.dt-card{padding:14px 14px 8px}.dt-av{width:64px;height:64px}}`,
    deco: [
      { id: "stars", name: "별 반짝임", on: true, css: `.dt-card::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:.55;background:radial-gradient(1px 1px at 22% 18%,var(--t-ink),transparent),radial-gradient(1px 1px at 68% 9%,var(--t-ink),transparent),radial-gradient(1.5px 1.5px at 86% 26%,var(--t-accent2),transparent),radial-gradient(1px 1px at 47% 4%,var(--t-ink),transparent),radial-gradient(1px 1px at 93% 7%,var(--t-ink),transparent)}` },
      { id: "frame", name: "그라데이션 테두리", on: true, css: `.dt-card{border-color:color-mix(in srgb,var(--t-accent) 35%,var(--t-line))}
.dt-card::after{content:"";position:absolute;left:18px;right:18px;top:-1px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--t-accent),var(--t-accent2),transparent)}` },
      { id: "quote", name: "대사 강조색", on: true, css: `.dt-body q,.dt-body mark{color:var(--t-accent2)}` },
      { id: "shadow", name: "깊은 그림자", on: true, css: `.dt-card{box-shadow:0 14px 40px rgb(0 0 0/calc(var(--t-shadow)*2.2))}` }
    ]
  },
  {
    id: "novel",
    name: "비주얼 노벨",
    desc: "게임 대사창. 이름표가 붙은 반투명 상자, 상자 안 큰 초상화",
    mode: "dark",
    accent: "#e07a9a",
    vars: { radius: 10, fontSize: 15.5, lineHeight: 1.8, cardWidth: 900, gap: 24, avatarSize: 96, avatarRadius: 10 },
    font: "round",
    avatar: "style",
    css: `.dt{padding-top:16px}
.dt-card{display:grid;grid-template-columns:var(--t-avatar-size) minmax(0,1fr);column-gap:calc(18px*var(--t-space));align-items:start;background:color-mix(in srgb,var(--t-paper) 90%,transparent);border:1px solid var(--t-line);border-radius:var(--t-radius);padding:calc(24px*var(--t-space)) calc(20px*var(--t-space)) calc(10px*var(--t-space))}
.dt-head{display:contents}
.dt-av{grid-column:1;grid-row:1/3;border:2px solid var(--t-line);box-shadow:0 6px 18px rgb(0 0 0/var(--t-shadow))}
.dt-meta{position:absolute;top:-15px;left:calc(var(--t-avatar-size) + 30px);flex-direction:row;align-items:center;gap:8px;padding:4px 14px;border-radius:calc(var(--t-radius)*.8);background:var(--t-accent);box-shadow:0 3px 10px rgb(0 0 0/var(--t-shadow))}
.dt-name{color:var(--t-on-accent);font-size:.9em}
.dt-date{color:var(--t-on-accent);opacity:.75;font-size:.72em}
.dt-body{grid-column:2;grid-row:1}
.dt-foot{grid-column:2;grid-row:2}
.dt-user .dt-card{grid-template-columns:minmax(0,1fr) var(--t-avatar-size)}
.dt-user .dt-av{grid-column:2}
.dt-user .dt-body,.dt-user .dt-foot{grid-column:1}
.dt-user .dt-meta{left:auto;right:calc(var(--t-avatar-size) + 30px);background:var(--t-muted)}
.dt-user .dt-name,.dt-user .dt-date{color:var(--t-paper)}
@media (max-width:600px){.dt-card{--t-avatar-size:56px;column-gap:12px;padding:22px 12px 8px}.dt-meta{left:12px}.dt-user .dt-meta{right:12px}}`,
    deco: [
      { id: "arrow", name: "다음 표시 ▼", on: true, css: `.dt-char .dt-body::after{content:"▼";display:block;text-align:right;font-size:10px;color:var(--t-accent-text);animation:dt-blink 1.4s ease-in-out infinite}
@keyframes dt-blink{50%{opacity:.25}}` },
      { id: "glass", name: "유리 느낌", on: true, css: `.dt-card{backdrop-filter:blur(8px)}` },
      { id: "line", name: "윗줄 강조", on: false, css: `.dt-card{border-top:3px solid var(--t-accent)}` },
      { id: "corner", name: "모서리 장식", on: false, css: `.dt-card::after{content:"";position:absolute;right:8px;bottom:8px;width:14px;height:14px;border-right:2px solid var(--t-accent);border-bottom:2px solid var(--t-accent);border-radius:0 0 4px 0;opacity:.7}` }
    ]
  }
];
export var styleById = (id) => STYLES.find((s) => s.id === id) ?? STYLES[0];

// ── 프로필 모양 ──
export var AVATARS = [
  ["style", "스타일 기본"],
  ["circle", "원"],
  ["stamp", "우표"],
  ["polaroid", "폴라로이드"],
  ["none", "없음"]
];
var AVATAR_CSS = {
  circle: `.dt-av{display:block;border-radius:50%}`,
  stamp: `.dt-av{display:block;padding:4px;background:var(--t-paper);border:2px dashed var(--t-line);border-radius:3px;box-shadow:0 2px 6px rgb(0 0 0/.12);transform:rotate(3deg)}
.dt-av>*{border-radius:2px}`,
  polaroid: `.dt-av{display:block;width:calc(var(--t-avatar-size) + 4px);height:calc(var(--t-avatar-size) + 14px);padding:4px 4px 14px;box-sizing:border-box;background:#fbfaf6;border-radius:2px;box-shadow:0 3px 10px rgb(0 0 0/.22);transform:rotate(-3deg)}
.dt-av>*{border-radius:1px}`,
  none: `.dt-av{display:none!important}`
};

// ── 글꼴 짝 ──
var PRETENDARD = `@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");`;
var gf = (q) => `@import url("https://fonts.googleapis.com/css2?${q}&display=swap");`;
export var FONTS = [
  { id: "style", name: "스타일 기본" },
  { id: "serif", name: "감성 명조", imp: gf("family=Gowun+Batang:wght@400;700&family=Noto+Serif+KR:wght@600;700"), body: "'Gowun Batang','Noto Serif KR','Nanum Myeongjo',serif", display: "'Noto Serif KR','Gowun Batang',serif", size: 0.3 },
  { id: "sans", name: "깔끔 고딕", imp: PRETENDARD, body: "'Pretendard','Noto Sans KR','Apple SD Gothic Neo',sans-serif", display: "'Pretendard','Noto Sans KR',sans-serif", size: 0 },
  { id: "round", name: "동글 고딕", imp: gf("family=Gowun+Dodum"), body: "'Gowun Dodum','Noto Sans KR',sans-serif", display: "'Gowun Dodum','Noto Sans KR',sans-serif", size: 0.3 },
  { id: "hand", name: "손글씨", imp: gf("family=Gaegu:wght@400;700"), body: "'Gaegu','Nanum Pen Script',cursive", display: "'Gaegu',cursive", size: 2 },
  { id: "mono", name: "타자기", imp: gf("family=Nanum+Gothic+Coding:wght@400;700"), body: "'Nanum Gothic Coding','D2Coding',monospace", display: "'Nanum Gothic Coding',monospace", size: -0.5 }
];
var fontById = (id) => FONTS.find((f) => f.id === id && f.body);

// ── 선택 ──
// 다이얼 0~100: vivid 차분↔화려, round 각지게↔둥글게, space 촘촘↔여유
// 본문 너비: 카드가 넓어도 글줄은 읽기 좋은 길이로 (가운데 정렬은 스타일이 정함)
export var WIDTHS = [
  ["narrow", "좁게", "620px"],
  ["normal", "보통", "720px"],
  ["wide", "넓게", "860px"],
  ["full", "꽉 차게", "100%"]
];
export var DIALS = [
  ["vivid", "차분", "화려"],
  ["round", "각지게", "둥글게"],
  ["space", "촘촘", "여유"]
];
export function defaultChoice(styleId = "letter") {
  const s = styleById(styleId);
  return { v: 2, style: s.id, accent: s.accent, mode: s.mode, vivid: 50, round: 50, space: 50, avatar: "style", font: "style", width: "normal", deco: Object.fromEntries(s.deco.map((d) => [d.id, d.on])) };
}
var HEX = /^#[0-9a-f]{6}$/i;
var num = (x, d) => Number.isFinite(+x) ? Math.round(clamp(+x, 0, 100)) : d;
// 아무 값이나 받아서 올바른 선택으로 (1차 저장분·AI 응답 모두 여기를 지난다)
export function normalizeChoice(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const s = styleById(String(r.style ?? "").toLowerCase());
  const d = defaultChoice(s.id);
  let accent = String(r.accent ?? "").trim();
  if (/^#?[0-9a-f]{3}$/i.test(accent)) accent = "#" + [...accent.replace("#", "")].map((c) => c + c).join("");
  if (/^[0-9a-f]{6}$/i.test(accent)) accent = "#" + accent;
  const deco = { ...d.deco };
  if (Array.isArray(r.deco)) for (const k of Object.keys(deco)) deco[k] = r.deco.includes(k);
  else if (r.deco && typeof r.deco === "object") for (const k of Object.keys(deco)) if (typeof r.deco[k] === "boolean") deco[k] = r.deco[k];
  return {
    v: 2,
    style: s.id,
    accent: HEX.test(accent) ? accent.toLowerCase() : d.accent,
    mode: r.mode === "light" || r.mode === "dark" ? r.mode : d.mode,
    vivid: num(r.vivid, 50), round: num(r.round, 50), space: num(r.space, 50),
    avatar: AVATARS.some(([k]) => k === r.avatar) ? r.avatar : "style",
    font: FONTS.some((f) => f.id === r.font) ? r.font : "style",
    width: WIDTHS.some(([k]) => k === r.width) ? r.width : "normal",
    deco,
    ...typeof r.aiCss === "string" && r.aiCss.trim() ? { aiCss: sanitizeAiCss(r.aiCss) } : {}
  };
}

// 계열별 바깥 정리 (리스 기본 말풍선·배경을 비우고 바탕색을 맞춘다)
var WRAP = {
  risu: `body,.bg-bgcolor{background:var(--t-bg)!important}
.risu-chat{background:transparent!important;border:0!important}
.risu-chat div:has(> .dt),.risu-chat div:has(> .x-risu-dt){width:100%;max-width:none;flex:1 1 auto;min-width:0}`,
  pocket: `body{background:var(--t-bg)!important}
.risu-chat,.risu-chat>div{background:transparent!important;border:0!important}
.risu-chat .chat-width{max-width:var(--t-card-width);margin:0 auto;color:var(--t-muted);font-size:11px}
/* 내 글 칸이 내용 너비로 줄어 한쪽에 붙지 않게: 테마가 든 칸은 줄 전체를 쓴다 */
.risu-chat>div:has(.dt,.x-risu-dt),.risu-chat>div>div:has(.dt,.x-risu-dt),.risu-chat div:has(> .dt),.risu-chat div:has(> .x-risu-dt){width:100%!important;max-width:none!important;flex:1 1 auto!important;min-width:0!important;margin-left:0!important;margin-right:0!important;align-self:stretch!important}`
};

var scaleR = (base, round) => round <= 2 ? 0 : Math.round(clamp(Math.max(base, 2) * 2 ** ((round - 50) / 25), 0, 32));
export function compileBuilder(choice, target) {
  const c = normalizeChoice(choice);
  const s = styleById(c.style);
  const P = makePalette(c.accent, c.mode, c.vivid);
  const v = s.vars;
  const sp = c.space - 50;
  const font = fontById(c.font === "style" ? s.font : c.font) ?? fontById("sans");
  const avatar = c.avatar === "style" ? s.avatar : c.avatar;
  const root = {
    "--t-bg": P.bg, "--t-paper": P.paper, "--t-tint": P.tint, "--t-line": P.line, "--t-ink": P.ink, "--t-muted": P.muted,
    "--t-accent": P.accent, "--t-accent2": P.accent2, "--t-accent-text": P.accentText, "--t-on-accent": P.onAccent,
    "--t-user-bubble": P.userBubble, "--t-user-bubble2": P.userBubble2, "--t-on-user": P.onUser, "--t-shadow": P.shadow,
    "--t-radius": scaleR(v.radius, c.round) + "px",
    "--t-font-size": +(v.fontSize + font.size + sp / 50 * 0.6).toFixed(2) + "px",
    "--t-line-height": +(v.lineHeight + sp / 50 * 0.2).toFixed(2),
    "--t-space": +(1 + sp / 50 * 0.3).toFixed(2),
    "--t-card-width": (c.width === "full" ? "100%" : Math.max(v.cardWidth, parseInt(WIDTHS.find(([k]) => k === c.width)[2]) + 80) + "px"),
    "--t-text-width": WIDTHS.find(([k]) => k === c.width)[2], "--t-gap": Math.round(v.gap * (1 + sp / 50 * 0.45)) + "px",
    "--t-avatar-size": v.avatarSize + "px", "--t-avatar-radius": v.avatarRadius === 50 ? "50%" : scaleR(v.avatarRadius, c.round) + "px",
    "--t-font-body": font.body, "--t-font-display": font.display,
    // 리스 기본 변수도 맞춰 둔다 (설정 화면·입력창 등)
    "--risu-theme-bgcolor": P.bg, "--risu-theme-darkbg": P.paper, "--risu-theme-borderc": P.line, "--risu-theme-darkborderc": P.line,
    "--risu-theme-selected": P.tint, "--risu-theme-textcolor": P.ink, "--risu-theme-textcolor2": P.muted, "--risu-theme-darkbutton": P.tint,
    "--FontColorStandard": P.ink, "--FontColorItalic": P.muted, "--FontColorBold": P.ink, "--FontColorQuote1": P.accentText, "--FontColorQuote2": P.accentText
  };
  const css = [
    font.imp, // @import는 맨 앞
    `/* Dusk Theme Builder · ${s.name} · ${target} */`,
    `:root{\n${Object.entries(root).map(([k, x]) => `  ${k}: ${x};`).join("\n")}\n}`,
    WRAP[target] ?? WRAP.risu,
    BASE,
    ...c.aiCss ? ["/* AI 스타일 */", c.aiCss] : [s.css, ...s.deco.map((d) => c.deco[d.id] ? d.css : d.off ?? "")],
    c.aiCss && c.avatar === "style" ? "" : AVATAR_CSS[avatar] ?? ""
  ].filter(Boolean).join("\n");
  return { css: dualScope(css), html: BUILDER_HTML, palette: P };
}

// 포켓 계열 등은 커스텀 HTML의 class 앞에 "x-risu-"를 붙인다 (dt-card → x-risu-dt-card).
// 어느 쪽이든 맞도록 .dt 선택자마다 x-risu- 판을 함께 단다.
var XR = (sel) => sel.replace(/\.dt(?=[-\w]*)/g, ".x-risu-dt");
// 괄호 밖 쉼표로만 나눈다 (:has(a,b) 보호)
function splitTop(sel) {
  const out = [];
  let d = 0, cur = "";
  for (const ch of sel) {
    if (ch === "(") d++;
    else if (ch === ")") d--;
    if (ch === "," && d === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
export function dualScope(css) {
  let out = "", i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) {
      out += css.slice(i);
      break;
    }
    const head = css.slice(i, open);
    let d = 1, j = open + 1;
    while (j < css.length && d) {
      if (css[j] === "{") d++;
      else if (css[j] === "}") d--;
      j++;
    }
    const body = css.slice(open + 1, j - 1);
    const h = head.trim();
    if (/^@media|^@supports/i.test(h)) out += `${head}{${dualScope(body)}}`;
    else if (h.startsWith("@") || !/\.dt/.test(h)) out += `${head}{${body}}`;
    else {
      const sels = splitTop(h.replace(/\/\*[\s\S]*?\*\//g, "")).map((x) => x.trim()).filter(Boolean);
      const all = [...sels, ...sels.filter((x) => /\.dt/.test(x)).map(XR)];
      out += `\n${all.join(",")}{${body}}`;
    }
    i = j;
  }
  return out;
}

// 빌더 선택 → 일반 테마 (기존 테마를 넘기면 이름·id 유지하고 덮어씀)
export function buildTheme(choice, target, base = null) {
  const c = normalizeChoice(choice);
  const s = styleById(c.style);
  const { css, html, palette: P } = compileBuilder(c, target);
  const t = base ?? newTheme(target, s.name + " 테마");
  t.css = css;
  t.html = html;
  t.useTokens = false;
  t.builder = c;
  t.tokens = { ...t.tokens, bg: P.bg, panel: P.paper, border: P.line, accent: P.accent, accent2: P.accent2, text: P.ink, sub: P.muted, quote: P.accentText, userBubble: P.userBubble, botBubble: P.paper };
  t.updated = Date.now();
  return t;
}

// ── AI 스타일 CSS 거르기 ──
// .dt 안쪽만 꾸미게 한다: 다른 선택자·위험한 속성은 버리고, 계열 차이는 WRAP이 맡는다
var BAD_DECL = /(^|;)\s*(position\s*:\s*(fixed|sticky)|behavio[u]?r\s*:|-moz-binding\s*:|content\s*:\s*url)[^;]*/gi;
function cleanDecl(body) {
  return body
    .replace(/!important/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "none")
    .replace(/expression\s*\(/gi, "(")
    .replace(BAD_DECL, "$1")
    .replace(/[<>]/g, "")
    .trim();
}
var okSel = (sel) => splitTop(sel).every((x) => /^\s*\.dt([-\w]*)?([\s.:>+~\[(]|$)/.test(x));
// 중괄호를 직접 세어 규칙을 나눈다. @media는 안쪽을 다시 거른다. @keyframes는 이름이 dt-로 시작할 때만
export function sanitizeAiCss(css, depth = 0) {
  let src = String(css ?? "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/@import[^;]*;?/gi, "").replace(/@charset[^;]*;?/gi, "");
  const out = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf("{", i);
    if (open < 0) break;
    const head = src.slice(i, open).trim();
    let d = 1, j = open + 1;
    while (j < src.length && d) {
      if (src[j] === "{") d++;
      else if (src[j] === "}") d--;
      j++;
    }
    const body = src.slice(open + 1, j - 1);
    i = j;
    if (/^@media\b/i.test(head) && depth === 0) {
      const inner = sanitizeAiCss(body, 1);
      if (inner) out.push(`${head.replace(/[<>{}]/g, "")}{\n${inner}\n}`);
    } else if (/^@(-webkit-)?keyframes\s+dt-[\w-]+$/i.test(head) && depth === 0) {
      out.push(`${head}{${body.replace(/[<>]/g, "")}}`);
    } else if (!head.startsWith("@") && okSel(head)) {
      const b = cleanDecl(body);
      if (b) out.push(`${head.replace(/\s+/g, " ")}{${b}}`);
    }
  }
  return out.join("\n").slice(0, 16000);
}
// 모델 응답에서 CSS만 꺼낸다 (```css 블록 우선)
export function extractCss(text) {
  const t = String(text ?? "");
  const m = t.match(/```(?:css)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : t.slice(Math.max(0, t.indexOf(".dt")))).trim();
}

// AI가 지킬 계약: 일반 리스·포켓리스 어디서든 똑같이 보이도록
var CONTRACT = `You write CSS for a RisuAI chat theme. The SAME CSS must work in both original RisuAI and PocketRisu-family apps (PocketRisu, RisuBard...). The app already handles the outer differences; you ONLY style the message markup below.

Markup of every message (role is "char" or "user"). The avatar is INSIDE each message card for both roles:
<div class="dt dt-char|dt-user">                    full-width row (already width:100%, centered, max-width var(--t-card-width))
  <div class="dt-card">                             the message box
    <div class="dt-head">                           flex row: avatar + meta
      <div class="dt-av"><risuicon/></div>          avatar (an <img> or div inside)
      <div class="dt-meta"><span class="dt-name"/><span class="dt-date"/></div>
    </div>
    <div class="dt-body"><risutextbox/></div>       message text: p, em, strong, mark, q, code, img, a, ul, blockquote; may be wrapped in .chattext
    <div class="dt-foot"><risugeninfo/><risubuttons/></div>   small icon buttons (regenerate, edit, delete...)
  </div>
</div>

A base layer already exists: .dt is a full-width block; .dt-head is a flex row; .dt-av sized by vars with overflow hidden; .dt-meta is a column; text color/size/line-height from vars; .dt-foot is a small muted row with space-between.
Keep the avatar inside .dt-card. User messages must stay full width (never shrink-wrap or stick to one side unless it is a deliberate bubble layout with align-items:flex-end).

Variables you MUST use for all colors, sizes and fonts (never hard-code colors except transparent / rgb(0 0 0/x) for shadows):
--t-bg --t-paper --t-tint --t-line --t-ink --t-muted --t-accent --t-accent2 --t-accent-text --t-on-accent --t-user-bubble --t-user-bubble2 --t-on-user (text on user bubble) --t-shadow (0~0.2 alpha number, use as rgb(0 0 0/var(--t-shadow)))
--t-radius --t-font-size --t-line-height --t-text-width (max width of .dt-body, already applied) --t-space (spacing multiplier, use calc(Npx*var(--t-space))) --t-gap --t-card-width --t-avatar-size --t-avatar-radius --t-font-body --t-font-display
color-mix(in srgb, var(--t-accent) 30%, transparent) is allowed.

Rules (anything breaking them is deleted automatically):
- Every selector starts with .dt, .dt-char, .dt-user, .dt-av, .dt-card, .dt-head, .dt-meta, .dt-name, .dt-date, .dt-body, .dt-foot (descendants allowed, e.g. ".dt-user .dt-body p"). No :root, html, body, .risu-chat, or app classes.
- No @import, no url(), no !important, no position:fixed/sticky. position:absolute only inside an element you set position:relative on.
- ::before/::after with text or gradients for decoration are welcome. @keyframes names must start with dt- and stay subtle.
- Text must stay readable: text on --t-paper/--t-tint uses --t-ink/--t-muted; text on user bubble uses --t-on-user (also set it for em, strong, mark inside).
- Must not break on a 360px wide phone: add @media (max-width:600px) to shrink paddings/avatar or stack; never fixed widths wider than 100%; use max-width and min-width:0.
- Keep .dt-foot buttons visible and clickable; do not hide .dt-body or .dt-foot; overflow-wrap for long words.
- Both roles must look intentionally different (char vs user).`;

export function aiStylePrompt(want, choice) {
  const c = normalizeChoice(choice);
  return [
    { role: "system", content: `${CONTRACT}

Design a NEW, distinctive, polished style that matches the request. Think like a senior UI designer: clear hierarchy, consistent spacing, tasteful decoration, no clutter.
Reply with ONE \`\`\`css code block only. Under 160 lines.` },
    { role: "user", content: `Request: ${String(want || "").slice(0, 600)}
(Colors come from an accent ${c.accent} in ${c.mode} mode via the variables.)` }
  ];
}
export function aiEditPrompt(want, css) {
  return [
    { role: "system", content: `${CONTRACT}

You are editing an existing style. Change ONLY what the request asks; keep everything else exactly as it is. Reply with the FULL updated CSS in ONE \`\`\`css code block only.` },
    { role: "user", content: `Current CSS:\n\`\`\`css\n${String(css).slice(0, 14000)}\n\`\`\`\n\nRequest: ${String(want || "").slice(0, 600)}` }
  ];
}
// 스타일을 AI로 고칠 때 시작점: 이미 AI 스타일이면 그 CSS, 아니면 지금 스타일+켜진 장식+프로필
export function currentStyleCss(choice) {
  const c = normalizeChoice(choice);
  if (c.aiCss) return c.aiCss;
  const s = styleById(c.style);
  const av = c.avatar === "style" ? s.avatar : c.avatar;
  return [s.css, ...s.deco.map((d) => c.deco[d.id] ? d.css : d.off ?? ""), AVATAR_CSS[av] ?? ""].filter(Boolean).join("\n");
}
// 만들기·고치기 공통: CSS를 받아 거르고, 너무 적게 남으면 이유를 알려 1회 재시도
export async function aiStyle(msgs, run) {
  let text = await run(msgs);
  let css = sanitizeAiCss(extractCss(text));
  if ((css.match(/\{/g) ?? []).length < 4) {
    text = await run([...msgs, { role: "assistant", content: String(text).slice(0, 2000) }, { role: "user", content: "Most rules were invalid or missing (selectors must start with .dt..., no url/!important/@import). Reply again with the full CSS in one ```css block only." }]);
    css = sanitizeAiCss(extractCss(text));
    if ((css.match(/\{/g) ?? []).length < 4) throw new Error("쓸 수 있는 CSS를 받지 못했어요. 더 큰 모델로 해 보세요");
  }
  return css;
}

// ── AI로 시작하기: AI는 CSS를 쓰지 않고 선택지 JSON만 고른다 ──
export function aiPrompt(want) {
  const cat = {
    style: STYLES.map((s) => `${s.id}=${s.name}(${s.desc})`),
    deco: Object.fromEntries(STYLES.map((s) => [s.id, s.deco.map((d) => `${d.id}=${d.name}`)])),
    avatar: AVATARS.map(([k, l]) => `${k}=${l}`),
    font: FONTS.map((f) => `${f.id}=${f.name}`)
  };
  const ex1 = { style: "letter", accent: "#8a5a44", mode: "light", vivid: 35, round: 30, space: 75, avatar: "stamp", font: "serif", deco: ["lines", "salute", "shadow"], name: "오후의 편지" };
  const ex2 = { style: "messenger", accent: "#ff6fa8", mode: "dark", vivid: 85, round: 90, space: 40, avatar: "circle", font: "round", deco: ["tail", "name", "grad"], name: "네온 수다" };
  return [
    { role: "system", content: `You pick options for a chat theme builder. Reply with ONE JSON object only, no prose, no code fence.
Keys: style (enum), width (narrow|normal|wide|full: text column width), accent ("#rrggbb"), mode ("light"|"dark"), vivid/round/space (integers 0-100: calm→flashy, sharp→round, dense→airy), avatar (enum), font (enum), deco (array of deco ids of the chosen style), name (short Korean title).
Catalog: ${JSON.stringify(cat)}
Example: ${JSON.stringify(ex1)}
Example: ${JSON.stringify(ex2)}` },
    { role: "user", content: String(want || "").slice(0, 600) }
  ];
}
// 관대하게 꺼낸다: 코드블록·앞뒤 말·끝 쉼표·작은따옴표
export function parseAiJson(text) {
  let s = String(text ?? "").replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("JSON을 찾지 못했어요");
  s = s.slice(a, b + 1);
  try {
    return JSON.parse(s);
  } catch {
    return JSON.parse(s.replace(/,\s*([}\]])/g, "$1").replace(/'/g, '"').replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":'));
  }
}
// 모델 호출 + 파싱, 실패하면 이유를 알려 주고 1회 재시도. 빈 칸은 기본값으로 메운다
export async function aiChoose(want, run) {
  const msgs = aiPrompt(want);
  let text = await run(msgs), raw;
  try {
    raw = parseAiJson(text);
  } catch (e) {
    text = await run([...msgs, { role: "assistant", content: String(text).slice(0, 800) }, { role: "user", content: `That was not valid JSON (${e.message}). Reply with the JSON object only.` }]);
    raw = parseAiJson(text);
  }
  const name = typeof raw?.name === "string" ? raw.name.trim().slice(0, 40) : "";
  return { choice: normalizeChoice(raw), name };
}

// 썸네일 (스타일 모양을 흉내 낸 작은 그림)
export function thumbHtml(styleId, P) {
  const line = (w, c = P.muted) => `<div style="height:4px;width:${w}%;border-radius:2px;background:${c};opacity:.7;margin-top:4px"></div>`;
  if (styleId === "letter") return `<div style="background:${P.bg};padding:10px;height:100%;box-sizing:border-box"><div style="background:${P.paper};border:1px solid ${P.line};border-radius:3px;padding:8px;position:relative"><div style="position:absolute;right:6px;top:-6px;width:14px;height:16px;border:1.5px dashed ${P.line};background:${P.tint};transform:rotate(4deg)"></div><div style="height:5px;width:40%;background:${P.ink};opacity:.8;border-radius:2px"></div>${line(90)}${line(80)}${line(60)}</div></div>`;
  if (styleId === "diary") return `<div style="background:${P.bg};padding:10px;height:100%;box-sizing:border-box"><div style="border:1px solid ${P.accent};border-radius:8px;padding:7px;background:${P.paper};position:relative"><div style="display:flex;gap:5px;align-items:center"><span style="width:14px;height:14px;border:1px dashed ${P.line};background:${P.tint}"></span><span style="height:6px;width:26px;border-radius:3px;border:1px solid ${P.line}"></span></div>${line(80)}${line(70)}</div></div>`;
  if (styleId === "novel") return `<div style="background:${P.bg};padding:10px;height:100%;box-sizing:border-box;display:flex;gap:5px;align-items:flex-end"><span style="width:20px;height:30px;border-radius:4px;background:${P.tint};border:1px solid ${P.line};flex:none"></span><div style="flex:1;position:relative;background:${P.paper};border:1px solid ${P.line};border-radius:5px;padding:9px 6px 5px"><span style="position:absolute;top:-5px;left:5px;width:22px;height:8px;border-radius:3px;background:${P.accent}"></span>${line(90)}${line(60)}</div></div>`;
  if (styleId === "messenger") return `<div style="background:${P.bg};padding:10px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:6px"><div style="display:flex;gap:5px"><span style="width:14px;height:14px;border-radius:50%;background:${P.tint};flex:none"></span><div style="background:${P.paper};border:1px solid ${P.line};border-radius:3px 9px 9px 9px;padding:5px 7px;width:60%">${line(90)}${line(60)}</div></div><div style="align-self:flex-end;background:${P.userBubble};border-radius:9px 3px 9px 9px;padding:5px 7px;width:45%">${line(80, P.onUser)}</div></div>`;
  return `<div style="background:${P.bg};padding:10px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:6px"><div style="background:${P.paper};border:1px solid ${P.line};border-left:3px solid ${P.accent};border-radius:6px;padding:6px 8px">${line(30, P.accent)}${line(90)}${line(70)}</div><div style="background:${P.tint};border:1px solid ${P.line};border-left:3px solid ${P.muted};border-radius:6px;padding:6px 8px">${line(80)}</div></div>`;
}

// ── 사진에서 대표색 뽑기: 채도·밝기가 적당한 픽셀을 색상환 24칸으로 모아 가장 많은 칸의 평균 ──
export function pickAccentFromPixels(data) {
  const bins = Array.from({ length: 24 }, () => ({ n: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (mx < 40 || mx > 245 && d < 20 || d / (mx || 1) < 0.25) continue;
    let hh = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const bin = bins[Math.floor((hh * 60 + 360) % 360 / 15)];
    const w = d / 255; // 채도 높은 픽셀에 가중치
    bin.n += w; bin.r += r * w; bin.g += g * w; bin.b += b * w;
  }
  const best = bins.reduce((a, x) => x.n > a.n ? x : a);
  if (best.n < 1) return null;
  return rgbToHex([best.r / best.n / 255, best.g / best.n / 255, best.b / best.n / 255]);
}

// ── 공유 코드: 선택(AI CSS 포함)을 짧은 글자로 ──
export function shareCode(choice, name = "") {
  const json = JSON.stringify({ ...normalizeChoice(choice), name: String(name).slice(0, 40) });
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return "DTB1:" + b64;
}
export function readShareCode(text) {
  const m = String(text ?? "").match(/DTB1:([A-Za-z0-9+/=]+)/);
  if (!m) throw new Error("테마 빌더 공유 코드(DTB1:…)가 아니에요");
  const raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0))));
  return { choice: normalizeChoice(raw), name: typeof raw.name === "string" ? raw.name : "" };
}

// 화면 간 넘겨주기 (빌더 → 스튜디오에서 열 테마, 스튜디오 → 빌더에서 고칠 테마)
export var handoff = { studio: null, builder: null };
