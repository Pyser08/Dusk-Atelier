// 스텔스 사이드바·상단 줄 CSS. 리스 설정의 커스텀 CSS에도 넣는다(stealth.js buildStealth):
// 포켓리스 등 일부 판은 플러그인이 리스 화면에 <style>을 만들어 넣는 것을 막아 사이드바가 모양 없이 글자만 보였다.
// 사이드바 요소는 setInnerHTML(소독기가 class·x-* 속성을 지울 수 있음)이 아니라 createElement+setAttribute("x-c")로 만든다(stealth-shell.js mountHtml) → 선택자는 [x-c~=…].
export var SHELL_CSS = `
html body [x-dusk][x-vis="0"]{display:none !important}
[x-dusk="stealth-sb"][x-fold="1"]{display:none}   /* 접기 버튼은 없앴다(11-08): 넓은 화면은 늘 펼침, 휴대폰만 접힘 */
body[x-dusk-fold="1"][x-dusk-st]{padding-left:0 !important}
body[x-dusk-fold="1"] [x-dusk="stealth-top"]{display:none !important}
body[x-dusk-fold="1"] [x-dusk="stealth-note"]{left:0}
[x-dusk="stealth-sb"]{position:fixed;left:0;top:0;bottom:0;width:var(--st-sw,260px);z-index:9000;display:flex;flex-direction:column;box-sizing:border-box;background:var(--st-side);border-right:1px solid var(--st-line);color:var(--st-fg);font-size:13.5px;user-select:none}
[x-dusk="stealth-sb"] *{box-sizing:border-box}
[x-c~="st-sb-head"]{display:flex;align-items:center;gap:8px;padding:14px 14px 8px}
[x-c~="st-sb-word"]{font-size:21px;font-weight:600;letter-spacing:-.01em}
[x-c~="st-sb-hright"]{margin-left:auto;display:inline-flex;gap:2px}
[x-c~="st-sb-hbtn"]{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;color:var(--st-fg2)}
[x-c~="st-sb-hbtn"]:hover{background:var(--st-bubble)}
[x-c~="st-sb-who"][x-c~="st-two"]{display:flex;flex-direction:column;line-height:1.25}
[x-c~="st-sb-who"][x-c~="st-two"] small{margin-left:0;font-size:12.5px}
[x-c~="st-top-fold"],[x-c~="st-top-chev"]{display:inline-flex;align-items:center;color:var(--st-fg2);flex:none}
[x-c~="st-top-fold"]{margin-right:6px}
[x-c~="st-top-share"]{margin-left:auto;display:inline-flex;align-items:center;gap:6px;color:var(--st-fg);font-size:14px;flex:none;padding:0 6px}
[x-dusk="stealth-sb"][x-rail="1"]{flex-direction:row}
[x-c~="st-sb-rail"]{flex:none;width:52px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 0;background:color-mix(in srgb,var(--st-bg) 70%,#000);border-right:1px solid var(--st-line)}
[x-c~="st-sb-rbtn"]{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;color:var(--st-fg2)}
[x-c~="st-sb-rbtn"][x-c~="st-on"]{background:var(--st-bubble);color:var(--st-fg)}
[x-c~="st-sb-rsep"]{width:22px;height:1px;background:var(--st-line2);margin:4px 0}
[x-c~="st-sb-rgap"]{flex:1}
[x-c~="st-sb-main"]{flex:1;min-width:0;display:flex;flex-direction:column}
[x-c~="st-sb-wchev"]{display:inline-flex;align-items:center;color:var(--st-fg2);margin-left:4px;vertical-align:middle}
[x-c~="st-sb-head"] [x-c~="st-sb-wchev"]{margin-left:-4px}
[x-c~="st-sb-badge"]{margin-left:6px;padding:1px 7px;border-radius:6px;font-size:11.5px;background:color-mix(in srgb,#4a8cff 22%,transparent);color:#6fa4ff}
[x-c~="st-sb-item"][x-c~="st-dot"]::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;border:1.5px solid var(--st-dim);margin-right:10px;vertical-align:middle;box-sizing:border-box}
[x-c~="st-sb-item"][x-c~="st-dot"][x-c~="st-on"]::before{background:var(--st-fg2);border-color:var(--st-fg2)}
[x-c~="st-sb-secico"]{display:inline-flex;color:var(--st-dim)}
[x-c~="st-sb-word"][x-c~="st-accent"]{color:var(--st-accent);font-weight:700;letter-spacing:-.02em}
[x-c~="st-sb-newwrap"]{padding:8px 12px 4px}
[x-c~="st-sb-new"]{display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 16px;border-radius:999px;background:var(--st-bubble);color:var(--st-fg);font-size:14.5px}
[x-dusk="stealth-top"][x-empty="1"]{display:none}
[x-c~="st-sb-logo"]{flex:none;width:24px;height:24px;margin-right:8px;background:center/contain no-repeat}
[x-c~="st-sb-hico"]{display:inline-flex;align-items:center;color:var(--st-fg2);margin-right:6px}
[x-c~="st-sb-seg"]{margin-left:auto;display:inline-flex;gap:2px;padding:3px;border-radius:12px;background:color-mix(in srgb,var(--st-fg) 6%,transparent)}
[x-c~="st-sb-segb"]{display:inline-flex;align-items:center;justify-content:center;width:34px;height:30px;border-radius:9px;color:var(--st-fg2)}
[x-c~="st-sb-segb"][x-c~="st-on"]{background:color-mix(in srgb,var(--st-fg) 13%,transparent);color:var(--st-fg);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--st-fg) 14%,transparent)}
[x-c~="st-sb-word"][x-c~="st-serif"]{font-family:"Tiempos Headline","Source Serif Pro",Georgia,"Noto Serif KR","Nanum Myeongjo",serif !important}
[x-c~="st-sb-nav"]{display:flex;flex-direction:column;padding:6px 8px;gap:1px}
[x-c~="st-sb-row"]{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;color:var(--st-fg);cursor:default;border:0;background:transparent;text-align:left;font:inherit;width:100%}
[x-c~="st-sb-row"][x-c~="st-act"]{cursor:pointer}
[x-c~="st-sb-row"]:hover{background:var(--st-bubble)}
[x-c~="st-sb-row"][x-c~="st-on"]{background:var(--st-bubble)}
[x-c~="st-sb-sec"]{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 6px;color:var(--st-dim);font-size:12px}
[x-c~="st-sb-list"]{flex:1;min-height:0;overflow-y:auto;padding:0 8px 8px}
[x-c~="st-sb-item"]{display:block;width:100%;padding:8px 10px;border-radius:8px;border:0;background:transparent;color:var(--st-fg);font:inherit;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[x-c~="st-sb-item"]:hover,[x-c~="st-sb-item"][x-c~="st-on"]{background:var(--st-bubble)}
[x-c~="st-sb-empty"]{padding:28px 16px;color:var(--st-dim);text-align:center;font-size:12.5px}
[x-c~="st-sb-foot"]{display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid var(--st-line)}
[x-c~="st-sb-av"]{width:26px;height:26px;border-radius:50%;background:var(--st-bubble);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex:none}
[x-c~="st-sb-who"]{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[x-c~="st-sb-who"] small{color:var(--st-dim);margin-left:4px;font-size:12px}
[x-c~="st-sb-gear"]{border:0;background:transparent;color:var(--st-fg2);padding:6px;border-radius:8px;cursor:pointer;display:flex}
[x-c~="st-sb-gear"]:hover{background:var(--st-bubble);color:var(--st-fg)}
[x-dusk="stealth-top"]{position:fixed;left:var(--st-sw,260px);right:0;top:0;height:44px;z-index:8990;display:flex;align-items:center;padding:0 24px;background:var(--st-bg);border-bottom:1px solid var(--st-line);color:var(--st-fg2);font-size:13.5px;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[x-dusk="stealth-top"] b{color:var(--st-fg);font-weight:500;margin-right:8px}
[x-dusk="stealth-note"]{position:fixed;left:var(--st-sw,260px);right:0;bottom:10px;z-index:8980;text-align:center;color:var(--st-dim);font-size:12px;pointer-events:none}
[x-dusk="stealth-pop"]{position:fixed;left:10px;bottom:56px;width:calc(var(--st-sw,260px) - 20px);max-height:60vh;overflow-y:auto;z-index:9100;background:var(--st-input);border:1px solid var(--st-line2);border-radius:12px;padding:8px;box-shadow:0 8px 28px rgba(0,0,0,.35);color:var(--st-fg);font-size:13px}
[x-dusk="stealth-pop"] h4{margin:4px 8px 6px;font-size:12px;font-weight:500;color:var(--st-dim)}
[x-c~="st-pop-row"]{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 8px;border-radius:8px}
[x-c~="st-pop-row"]:hover{background:var(--st-bubble)}
[x-c~="st-pop-row"] label{flex:1;min-width:0}
[x-dusk="stealth-pop"] select,[x-dusk="stealth-pop"] input[type=text]{max-width:120px;background:var(--st-bg);color:var(--st-fg);border:1px solid var(--st-line2);border-radius:6px;padding:3px 6px;font:inherit}
[x-c~="st-sw"]{appearance:none;width:30px;height:18px;border-radius:9px;background:var(--st-line2);position:relative;cursor:pointer;flex:none;border:0}
[x-c~="st-sw"]::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .12s}
[x-c~="st-sw"]:checked{background:var(--st-accent)}
[x-c~="st-sw"]:checked::after{left:14px}
[x-c~="st-top-btn"]{display:none}
[x-c~="st-top-t"]{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}
[x-c~="st-top-ico"]{display:none}
[x-c~="st-top-sub"]{color:var(--st-fg2);overflow:hidden;text-overflow:ellipsis}
@media (max-width:760px){
[x-dusk="stealth-note"]{display:none}
[x-dusk="stealth-sb"][x-fold="1"]{display:none}
[x-dusk="stealth-sb"][x-fold="0"]{width:min(86vw,320px);z-index:9200;box-shadow:0 0 0 100vmax rgba(0,0,0,.45)}
body[x-dusk-st] [x-dusk="stealth-top"]{display:flex !important;left:0;height:56px;padding:0 6px 0 4px;gap:2px;border-bottom:0;pointer-events:none;font-size:16px}
[x-c~="st-top-more"]{pointer-events:auto}
[x-c~="st-top-btn"]{display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;border:0;background:transparent;color:var(--st-fg);border-radius:10px;cursor:pointer;padding:0}
[x-c~="st-top-ico"]{display:inline-flex;color:var(--st-fg2)}
[x-dusk="stealth-top"] b{font-weight:600;color:var(--st-fg)}
[x-c~="st-top-sub"]{font-weight:400;color:var(--st-fg2)}
[x-dusk="stealth-top"][x-plain="1"]{left:auto;width:auto;background:transparent}
[x-dusk="stealth-top"][x-plain="1"] > :not([x-c~="st-top-more"]){display:none !important}
}

[x-dusk] [x-ico]{display:inline-flex;align-items:center;line-height:0;flex:none}
/* 설정 팝업은 체크·값이 필요해 setInnerHTML로 넣는다 → class 선택자도 둔다 */
.st-pop-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 8px;border-radius:8px}
.st-pop-row:hover{background:var(--st-bubble)}
.st-pop-row label{flex:1;min-width:0}
.st-sw{appearance:none;width:30px;height:18px;border-radius:9px;background:var(--st-line2);position:relative;cursor:pointer;flex:none;border:0}
.st-sw::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .12s}
.st-sw:checked{background:var(--st-accent)}
.st-sw:checked::after{left:14px}
`;
