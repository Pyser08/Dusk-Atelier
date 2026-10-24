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
export function makePalette(accent, mode = "dark") {
  const a = hexToOklch(accent), h = a.h, c = Math.min(a.c, 0.2);
  const dark = mode === "dark";
  const P = dark ? {
    bg: oklch(0.17, c * 0.12, h), paper: oklch(0.22, c * 0.16, h), tint: oklch(0.27, c * 0.28, h),
    line: oklch(0.34, c * 0.22, h), ink: oklch(0.93, c * 0.05, h), muted: oklch(0.72, c * 0.12, h),
    accent: oklch(clamp(a.l, 0.62, 0.8), c, h), accent2: oklch(clamp(a.l, 0.62, 0.8), c, (h + 40) % 360)
  } : {
    bg: oklch(0.95, c * 0.08, h), paper: oklch(0.985, c * 0.04, h), tint: oklch(0.93, c * 0.2, h),
    line: oklch(0.87, c * 0.15, h), ink: oklch(0.27, c * 0.12, h), muted: oklch(0.5, c * 0.15, h),
    accent: oklch(clamp(a.l, 0.45, 0.6), c, h), accent2: oklch(clamp(a.l, 0.45, 0.6), c, (h + 40) % 360)
  };
  P.ink = ensureContrast(P.ink, P.paper, 7);
  P.muted = ensureContrast(P.muted, P.paper, 4.5);
  P.accentText = ensureContrast(P.accent, P.paper, 4.5);
  P.onAccent = contrast("#ffffff", P.accent) >= contrast("#111111", P.accent) ? "#ffffff" : "#111111";
  P.userBubble = ensureBubble(P.accent, P, dark);
  P.onUser = ensureContrast(P.onAccent, P.userBubble, 4.5);
  return P;
}
function ensureBubble(accent, P, dark) {
  const o = hexToOklch(accent);
  return oklch(dark ? 0.42 : 0.55, Math.min(o.c, 0.14), o.h);
}

// ── 공통 HTML 틀 (모든 스타일이 같은 구조, 모양은 CSS가 맡는다) ──
var NAME = "{{#when::{{role}}::is::char}}{{char}}{{:else}}{{user}}{{/when}}";
export var BUILDER_HTML = `<div class="dt dt-{{role}}">
  <div class="dt-av"><risuicon></risuicon></div>
  <div class="dt-card">
    <div class="dt-head"><span class="dt-name">${NAME}</span><span class="dt-date">{{date}}</span></div>
    <div class="dt-body"><risutextbox></risutextbox></div>
    <div class="dt-foot"><risugeninfo></risugeninfo><risubuttons></risubuttons></div>
  </div>
</div>`;

// 공통 바탕: 변수 계약 + 리스 기본 요소 정리
var BASE = `.dt{display:flex;gap:12px;align-items:flex-start;max-width:var(--t-card-width);margin:0 auto var(--t-gap);padding:0 12px;box-sizing:border-box;color:var(--t-ink);font-family:var(--t-font-body)}
.dt-av{flex:none;width:var(--t-avatar-size);height:var(--t-avatar-size);border-radius:var(--t-avatar-radius);overflow:hidden;background:var(--t-tint)}
.dt-av img,.dt-av>*{width:100%;height:100%;object-fit:cover}
.dt-card{flex:1;min-width:0;box-sizing:border-box}
.dt-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.dt-name{font-weight:700;color:var(--t-ink);font-family:var(--t-font-display)}
.dt-date{font-size:.78em;color:var(--t-muted)}
.dt-body,.dt-body .chattext{font-size:var(--t-font-size);line-height:var(--t-line-height);color:var(--t-ink);word-break:keep-all;overflow-wrap:anywhere}
.dt-body p:first-child{margin-top:0}
.dt-body p:last-child{margin-bottom:0}
.dt-body em{color:var(--t-muted)}
.dt-body strong{color:var(--t-ink)}
.dt-body mark,.dt-body q{background:transparent;color:var(--t-accent-text)}
.dt-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;font-size:12px;color:var(--t-muted)}
.dt-foot button{color:var(--t-muted)}
.dt-foot button:hover{color:var(--t-accent-text)}`;

// ── 스타일 ──
export var STYLES = [
  {
    id: "letter",
    name: "편지",
    desc: "종이 위에 쓴 편지. 명조, 넉넉한 여백, 우표 같은 프로필",
    mode: "light",
    accent: "#9a6b4f",
    vars: { radius: 4, fontSize: 15.5, lineHeight: 1.95, cardWidth: 760, gap: 22, avatarSize: 52, avatarRadius: 3 },
    fontBody: "'Noto Serif KR','Nanum Myeongjo','Batang',serif",
    fontDisplay: "'Noto Serif KR','Nanum Myeongjo',serif",
    css: `.dt{flex-direction:column;align-items:stretch;gap:0}
.dt-av{position:relative;z-index:1;align-self:flex-end;margin:0 18px -26px 0;padding:4px;background:var(--t-paper);border:2px dashed var(--t-line);border-radius:var(--t-avatar-radius);box-shadow:0 2px 6px rgb(0 0 0/.12);transform:rotate(3deg)}
.dt-av>*{border-radius:2px}
.dt-card{background:var(--t-paper);border:1px solid var(--t-line);border-radius:var(--t-radius);padding:26px 28px 18px;box-shadow:0 6px 22px rgb(0 0 0/.08);background-image:repeating-linear-gradient(transparent 0 calc(var(--t-font-size)*var(--t-line-height) - 1px),var(--t-tint) 0 calc(var(--t-font-size)*var(--t-line-height)))}
.dt-head{border-bottom:1px solid var(--t-line);padding-bottom:8px;margin-bottom:10px}
.dt-name{font-size:1.15em;letter-spacing:.02em}
.dt-name::before{content:"To. ";font-weight:400;color:var(--t-muted)}
.dt-char .dt-name::before{content:"From. "}
.dt-date{margin-left:auto;font-style:italic}
.dt-user .dt-card{background-color:var(--t-tint)}`
  },
  {
    id: "messenger",
    name: "메신저",
    desc: "익숙한 메신저 말풍선. 내 말은 오른쪽, 대표색 풍선",
    mode: "dark",
    accent: "#7c5cf0",
    vars: { radius: 18, fontSize: 15, lineHeight: 1.65, cardWidth: 860, gap: 10, avatarSize: 40, avatarRadius: 50 },
    fontBody: "'Pretendard','Noto Sans KR','Apple SD Gothic Neo',sans-serif",
    fontDisplay: "'Pretendard','Noto Sans KR',sans-serif",
    css: `.dt-card{max-width:min(78%,640px)}
.dt-head{margin:0 4px 4px}
.dt-name{font-size:.85em;font-weight:600}
.dt-body{background:var(--t-paper);border:1px solid var(--t-line);border-radius:4px var(--t-radius) var(--t-radius) var(--t-radius);padding:10px 14px}
.dt-user{flex-direction:row-reverse}
.dt-user .dt-av{display:none}
.dt-user .dt-card{display:flex;flex-direction:column;align-items:flex-end}
.dt-user .dt-head{display:none}
.dt-user .dt-body{background:var(--t-user-bubble);border-color:transparent;border-radius:var(--t-radius) 4px var(--t-radius) var(--t-radius)}
.dt-user .dt-body,.dt-user .dt-body .chattext,.dt-user .dt-body em,.dt-user .dt-body strong,.dt-user .dt-body mark{color:var(--t-on-user)}
.dt-user .dt-foot{justify-content:flex-end}`
  },
  {
    id: "card",
    name: "미니멀 카드",
    desc: "군더더기 없는 카드. 얇은 선, 왼쪽 대표색 줄",
    mode: "dark",
    accent: "#4f9cf7",
    vars: { radius: 12, fontSize: 15, lineHeight: 1.75, cardWidth: 820, gap: 14, avatarSize: 34, avatarRadius: 10 },
    fontBody: "'Pretendard','Noto Sans KR','Apple SD Gothic Neo',sans-serif",
    fontDisplay: "'Pretendard','Noto Sans KR',sans-serif",
    css: `.dt{flex-direction:column;gap:0}
.dt-av{display:none}
.dt-card{background:var(--t-paper);border:1px solid var(--t-line);border-left:3px solid var(--t-accent);border-radius:var(--t-radius);padding:14px 18px 10px}
.dt-head::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--t-accent);align-self:center}
.dt-name{font-size:.9em;letter-spacing:.03em;text-transform:uppercase}
.dt-head{margin-bottom:6px}
.dt-user .dt-card{background:var(--t-tint);border-left-color:var(--t-muted)}
.dt-user .dt-head::before{background:var(--t-muted)}`
  }
];
export var styleById = (id) => STYLES.find((s) => s.id === id) ?? STYLES[0];

// 계열별 바깥 정리 (리스 기본 말풍선·배경을 비우고 바탕색을 맞춘다)
var WRAP = {
  risu: `body,.bg-bgcolor{background:var(--t-bg)!important}
.risu-chat{background:transparent!important;border:0!important}`,
  pocket: `body{background:var(--t-bg)!important}
.risu-chat,.risu-chat>div{background:transparent!important;border:0!important}
.risu-chat .chat-width{max-width:var(--t-card-width);margin:0 auto;color:var(--t-muted);font-size:11px}`
};

export function defaultChoice(styleId = "letter") {
  const s = styleById(styleId);
  return { v: 1, style: s.id, accent: s.accent, mode: s.mode };
}

export function compileBuilder(choice, target) {
  const s = styleById(choice.style);
  const P = makePalette(choice.accent, choice.mode);
  const v = s.vars;
  const root = {
    "--t-bg": P.bg, "--t-paper": P.paper, "--t-tint": P.tint, "--t-line": P.line, "--t-ink": P.ink, "--t-muted": P.muted,
    "--t-accent": P.accent, "--t-accent2": P.accent2, "--t-accent-text": P.accentText, "--t-on-accent": P.onAccent,
    "--t-user-bubble": P.userBubble, "--t-on-user": P.onUser,
    "--t-radius": v.radius + "px", "--t-font-size": v.fontSize + "px", "--t-line-height": v.lineHeight,
    "--t-card-width": v.cardWidth + "px", "--t-gap": v.gap + "px",
    "--t-avatar-size": v.avatarSize + "px", "--t-avatar-radius": v.avatarRadius === 50 ? "50%" : v.avatarRadius + "px",
    "--t-font-body": s.fontBody, "--t-font-display": s.fontDisplay,
    // 리스 기본 변수도 맞춰 둔다 (설정 화면·입력창 등)
    "--risu-theme-bgcolor": P.bg, "--risu-theme-darkbg": P.paper, "--risu-theme-borderc": P.line, "--risu-theme-darkborderc": P.line,
    "--risu-theme-selected": P.tint, "--risu-theme-textcolor": P.ink, "--risu-theme-textcolor2": P.muted, "--risu-theme-darkbutton": P.tint,
    "--FontColorStandard": P.ink, "--FontColorItalic": P.muted, "--FontColorBold": P.ink, "--FontColorQuote1": P.accentText, "--FontColorQuote2": P.accentText
  };
  const css = [
    `/* Dusk Theme Builder · ${s.name} · ${target} */`,
    `:root{\n${Object.entries(root).map(([k, x]) => `  ${k}: ${x};`).join("\n")}\n}`,
    WRAP[target] ?? WRAP.risu,
    BASE,
    s.css
  ].join("\n");
  return { css, html: BUILDER_HTML, palette: P };
}

// 빌더 선택 → 일반 테마 (기존 테마를 넘기면 이름·id 유지하고 덮어씀)
export function buildTheme(choice, target, base = null) {
  const s = styleById(choice.style);
  const { css, html, palette: P } = compileBuilder(choice, target);
  const t = base ?? newTheme(target, s.name + " 테마");
  t.css = css;
  t.html = html;
  t.useTokens = false;
  t.builder = { ...choice };
  t.tokens = { ...t.tokens, bg: P.bg, panel: P.paper, border: P.line, accent: P.accent, accent2: P.accent2, text: P.ink, sub: P.muted, quote: P.accentText, userBubble: P.userBubble, botBubble: P.paper };
  t.updated = Date.now();
  return t;
}

// 썸네일 (스타일 모양을 흉내 낸 작은 그림)
export function thumbHtml(styleId, P) {
  const line = (w, c = P.muted) => `<div style="height:4px;width:${w}%;border-radius:2px;background:${c};opacity:.7;margin-top:4px"></div>`;
  if (styleId === "letter") return `<div style="background:${P.bg};padding:10px;height:100%;box-sizing:border-box"><div style="background:${P.paper};border:1px solid ${P.line};border-radius:3px;padding:8px;position:relative"><div style="position:absolute;right:6px;top:-6px;width:14px;height:16px;border:1.5px dashed ${P.line};background:${P.tint};transform:rotate(4deg)"></div><div style="height:5px;width:40%;background:${P.ink};opacity:.8;border-radius:2px"></div>${line(90)}${line(80)}${line(60)}</div></div>`;
  if (styleId === "messenger") return `<div style="background:${P.bg};padding:10px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:6px"><div style="display:flex;gap:5px"><span style="width:14px;height:14px;border-radius:50%;background:${P.tint};flex:none"></span><div style="background:${P.paper};border:1px solid ${P.line};border-radius:3px 9px 9px 9px;padding:5px 7px;width:60%">${line(90)}${line(60)}</div></div><div style="align-self:flex-end;background:${P.userBubble};border-radius:9px 3px 9px 9px;padding:5px 7px;width:45%">${line(80, P.onUser)}</div></div>`;
  return `<div style="background:${P.bg};padding:10px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:6px"><div style="background:${P.paper};border:1px solid ${P.line};border-left:3px solid ${P.accent};border-radius:6px;padding:6px 8px">${line(30, P.accent)}${line(90)}${line(70)}</div><div style="background:${P.tint};border:1px solid ${P.line};border-left:3px solid ${P.muted};border-radius:6px;padding:6px 8px">${line(80)}</div></div>`;
}

// 화면 간 넘겨주기 (빌더 → 스튜디오에서 열 테마, 스튜디오 → 빌더에서 고칠 테마)
export var handoff = { studio: null, builder: null };
