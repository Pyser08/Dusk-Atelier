// 위젯 홈 'Dusk' 디자인 + 설정 창을 Dusk 화면처럼(스위치·알약 선택·둥근 대화상자). 모든 디자인에 공통인 설정 창 규칙과 data-surface="dusk" 전용 규칙.
export const DUSK_CSS = `
dialog{border:1px solid var(--line);border-radius:20px;background:var(--surface);color:var(--ink);padding:20px;box-shadow:0 24px 64px #0009;max-width:min(560px,calc(100vw - 24px))}
dialog::backdrop{background:#0b0a12b8;backdrop-filter:blur(3px)}
dialog .card-head h2{font-size:17px}
dialog .field input,dialog .field select,dialog .field textarea,dialog select,dialog input[type=text]{min-height:38px;padding:6px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg)}
dialog button{border-radius:12px}
dialog .primary{border-radius:12px;font-weight:700}
.check{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:8px 0;cursor:pointer}
.check input[type=checkbox]{order:2;appearance:none;-webkit-appearance:none;flex-shrink:0;width:42px;height:24px;margin:0;border-radius:999px;background:var(--line);position:relative;cursor:pointer;transition:background .15s}
.check input[type=checkbox]::before{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0005;transition:transform .15s}
.check input[type=checkbox]:checked{background:var(--accent)}
.check input[type=checkbox]:checked::before{transform:translateX(18px)}
.check input[type=checkbox]:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
label:has(> input[type=radio]){display:inline-flex;align-items:center;gap:6px;padding:7px 14px;margin:2px;border:1px solid var(--line);border-radius:999px;cursor:pointer;font-size:13px;transition:background .12s,border-color .12s}
label:has(> input[type=radio]:checked){background:color-mix(in srgb,var(--accent) 22%,transparent);border-color:var(--accent);font-weight:700}
label > input[type=radio]{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
label:has(> input[type=radio]:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
/* ── Dusk 디자인 */
.page[data-surface="dusk"]{--bg:#14121e;--surface:#1c1929;--soft:#26213a;--button:#2e2846;--line:#3b3452;--ink:#f2ece0;--muted:#a79fb9;--accent:#d8b678;font-family:"IBM Plex Sans KR",system-ui,-apple-system,"Segoe UI","Noto Sans KR",sans-serif;background:radial-gradient(ellipse at 10% -10%,#4b2f5c66,transparent 45%),radial-gradient(ellipse at 100% 0,#7a4f2e33,transparent 40%),linear-gradient(180deg,#191626,#100e18)}
.page[data-surface="dusk"] .backdrop{background:radial-gradient(ellipse at 10% -10%,#4b2f5c66,transparent 45%),radial-gradient(ellipse at 100% 0,#7a4f2e33,transparent 40%),linear-gradient(180deg,#191626,#100e18)}
.page[data-surface="dusk"] .layout-grid .card{background:linear-gradient(180deg,#221e33,#1b1828);border:1px solid #3b3452;border-radius:18px;box-shadow:0 1px 0 #ffffff0d inset,0 10px 28px #0006;position:relative}
.page[data-surface="dusk"] .layout-grid .card::before{content:"";position:absolute;left:18px;right:18px;top:0;height:1px;background:linear-gradient(90deg,transparent,#d8b67866,transparent);pointer-events:none}
.page[data-surface="dusk"] .card-head h2{font-weight:700;letter-spacing:-.2px}
.page[data-surface="dusk"] .card-head h2 svg{color:#d8b678}
.page[data-surface="dusk"] .primary{background:linear-gradient(180deg,#e2c38a,#c9a35f);border-color:#e9d2a2;color:#1b1626}
.page[data-surface="dusk"] .primary:hover{background:linear-gradient(180deg,#ebcd97,#d4ad6a)}
.page[data-surface="dusk"] .pill,.page[data-surface="dusk"] .top-actions button{border-color:#4a4163}
.page[data-surface="dusk"] .top-actions button:hover{border-color:#d8b678}
.page[data-surface="dusk"] .greeting-title{background:linear-gradient(90deg,#f2ece0,#e3c48c);-webkit-background-clip:text;background-clip:text;color:transparent}
.page[data-surface="dusk"] .brand-mark{color:#d8b678}
.page[data-surface="dusk"] .dusk-go:hover,.page[data-surface="dusk"] .timer-presets button:hover{border-color:#d8b678}
`;
