import { PROB_CSS } from './probpick.js';
export var FONT_LINK = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap";
export var CSS2 = `
*{box-sizing:border-box}
[hidden]{display:none !important}
html,body{margin:0;height:100%;background:transparent}
.rb-root{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--rb-backdrop);
  font:14px/1.5 'IBM Plex Sans KR',system-ui,-apple-system,'Segoe UI','Noto Sans KR',sans-serif;color:var(--rb-text);z-index:10}
.rb-root[hidden]{display:none}
.rb-root button,.rb-root input,.rb-root select,.rb-root textarea{font:inherit;color:inherit}
.rb-win{width:100%;max-width:min(1560px,100%);height:100%;max-height:min(1040px,100%);display:flex;flex-direction:column;overflow:hidden;
  border-radius:18px;background:var(--rb-win);border:1px solid var(--rb-line);box-shadow:var(--rb-shadow);position:relative}
.rb-scroll{overflow:auto;scrollbar-width:thin;scrollbar-color:var(--rb-line3) transparent}
.rb-scroll::-webkit-scrollbar{width:10px;height:10px}.rb-scroll::-webkit-scrollbar-thumb{background:var(--rb-line3);border-radius:10px;border:3px solid var(--rb-win)}

/* 머리줄 */
.rb-head{height:64px;flex-shrink:0;display:flex;align-items:center;gap:14px;padding:0 20px;border-bottom:1px solid var(--rb-line2)}
.rb-brand{display:flex;align-items:center;gap:12px;width:184px;flex-shrink:0}
.rb-logo{width:34px;height:34px;border-radius:10px;background:var(--rb-acc-grad);color:var(--rb-on-acc);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rb-brand b{display:block;font-size:15px;font-weight:700;line-height:1.2}.rb-brand small{display:block;font-size:11px;color:var(--rb-sub)}
.rb-search{flex:1;max-width:420px;height:40px;display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);color:var(--rb-sub)}
.rb-search:focus-within{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-search input{flex:1;min-width:0;background:transparent;border:0;outline:none;font-size:14px;color:var(--rb-text)}
.rb-search input::placeholder{color:var(--rb-mute)}
.rb-kbd{font-size:11px;color:var(--rb-mute);border:1px solid var(--rb-line);border-radius:6px;padding:1px 6px}
.rb-spacer{flex:1}

/* 버튼 */
.rb-btn{height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border-radius:12px;border:1px solid var(--rb-line3);
  background:var(--rb-surf);color:var(--rb-text);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,filter .15s,transform .08s}
@media (hover: hover){.rb-btn:hover{background:var(--rb-hover)}}
.rb-btn:focus-visible,.rb-chip:focus-visible,.rb-nav a:focus-visible,.rb-switch:focus-visible,.rb-icon-btn:focus-visible{outline:2px solid var(--rb-focus);outline-offset:2px}
.rb-row:focus-visible{outline:2px solid var(--rb-focus);outline-offset:-2px}
.rb-btn.primary{border:0;background:var(--rb-acc-grad);color:var(--rb-on-acc);font-weight:600}
@media (hover: hover){.rb-btn.primary:hover{filter:brightness(1.08)}}
.rb-btn.ghost{border-color:transparent;background:transparent;color:var(--rb-sub)}
@media (hover: hover){.rb-btn.ghost:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-btn.danger{border:0;background:var(--rb-danger-soft);color:var(--rb-danger);font-weight:600}
.rb-btn.lg{height:44px;padding:0 20px}
.rb-btn.sm{height:32px;padding:0 12px;border-radius:10px;font-size:13px}
.rb-btn[disabled]{opacity:.5;cursor:not-allowed;filter:none}
.rb-icon-btn{width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;border:0;background:transparent;color:var(--rb-sub);cursor:pointer;flex-shrink:0;transition:background .15s,color .15s,transform .08s}
@media (hover: hover){.rb-icon-btn:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-icon-btn.boxed{border:1px solid var(--rb-line3);background:var(--rb-surf)}

/* 본문 3단 */
.rb-body{flex:1;display:flex;min-height:0}
.rb-nav{width:216px;flex-shrink:0;padding:16px 12px;display:flex;flex-direction:column;gap:4px;border-right:1px solid var(--rb-line2)}
.rb-nav a{height:44px;display:flex;align-items:center;gap:12px;padding:0 12px;border-radius:12px;color:var(--rb-sub);text-decoration:none;font-size:14px;font-weight:500;cursor:pointer}
@media (hover: hover){.rb-nav a:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-nav a[aria-current=page]{background:var(--rb-sel-bg);color:var(--rb-text);font-weight:600}
.rb-nav a[aria-current=page] svg{color:var(--rb-acc-text)}
.rb-nav a span{flex:1}.rb-nav a small{font-size:12px;color:var(--rb-sub)}
.rb-nav-card{padding:14px;border-radius:14px;background:var(--rb-surf);border:1px solid var(--rb-line);display:flex;flex-direction:column;gap:6px}
.rb-nav-hint{padding:12px 4px 0;font-size:12px;color:var(--rb-mute);line-height:1.5}
.rb-main{flex:1;min-width:0;display:flex;flex-direction:column}
.rb-detail{width:380px;flex-shrink:0;border-left:1px solid var(--rb-line2);padding:20px;display:flex;flex-direction:column;gap:18px}

/* 칩·배지 */
.rb-chips{display:flex;align-items:center;gap:8px;padding:16px 20px 12px;flex-wrap:wrap}
.rb-chips.rb-fchips{padding-top:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin}
.rb-chips.rb-fchips .rb-chip{flex-shrink:0}
.rb-chip{height:34px;padding:0 14px;border-radius:999px;border:1px solid var(--rb-line);background:transparent;color:var(--rb-sub);font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
@media (hover: hover){.rb-chip:hover{color:var(--rb-text);border-color:var(--rb-line3)}}
.rb-chip[aria-pressed=true]{border-color:var(--rb-sel-ring);background:var(--rb-acc-soft);color:var(--rb-text);font-weight:600}
.rb-chip small{opacity:.75;font-size:inherit}
.rb-traybtn{height:34px;padding:0 10px 0 12px;border-radius:999px;border:1px solid var(--rb-line);background:transparent;color:var(--rb-sub);font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;transition:background .15s,border-color .15s,color .15s}
@media (hover: hover){.rb-traybtn:hover{color:var(--rb-text);border-color:var(--rb-line3)}}
.rb-traybtn b{font-weight:600;color:var(--rb-text)}
.rb-traybtn.on{border-color:var(--rb-sel-ring);background:var(--rb-acc-soft)}
.rb-traybtn[aria-expanded=true]{border-color:var(--rb-sel-ring);color:var(--rb-text)}
.rb-traybtn .chev{display:flex;transition:transform .18s}
.rb-traybtn[aria-expanded=true] .chev{transform:rotate(180deg)}
.rb-tray{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0 20px 12px;animation:rb-expand .18s ease-out;transform-origin:top}
.rb-tray .rb-chip{flex-shrink:0}
.rb-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:500;border-radius:999px;padding:2px 8px;white-space:nowrap;flex-shrink:0}
.k-acc{color:var(--rb-acc-text);background:var(--rb-acc-soft)}.k-acc2{color:var(--rb-acc2-text);background:var(--rb-acc2-soft)}
.k-warn{color:var(--rb-warn);background:var(--rb-warn-soft)}.k-ok{color:var(--rb-teal);background:var(--rb-teal-soft)}
.k-danger{color:var(--rb-rose);background:var(--rb-rose-soft)}.k-mute{color:var(--rb-sub);background:var(--rb-surf2)}

/* 목록 줄 */
.rb-list{flex:1;padding:0 12px 16px;display:flex;flex-direction:column;gap:4px}
.rb-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;cursor:pointer;border:0;background:transparent;text-align:left;width:100%;color:inherit;transition:background .15s,box-shadow .15s,opacity .15s}
@media (hover: hover){.rb-row:hover{background:var(--rb-hover)}}
.rb-row[aria-selected=true]{background:var(--rb-sel-bg);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-row .grip{color:var(--rb-grip);cursor:grab;flex-shrink:0;display:flex}
.rb-row .txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.rb-row .ttl{display:flex;align-items:center;gap:8px;min-width:0}
.rb-row .name{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-row .meta{font-size:12px;color:var(--rb-mute)}
.rb-row.off .name{color:var(--rb-mute)}
.rb-row{-webkit-touch-callout:none}
.rb-mcb{display:none;flex-shrink:0;width:22px;height:22px;border-radius:7px;border:1.5px solid var(--rb-grip);align-items:center;justify-content:center;cursor:pointer;color:#fff;margin:-4px -2px}
.rb-mcb::after{content:'';width:10px;height:6px;border:2.5px solid currentColor;border-top:0;border-right:0;transform:rotate(-45deg) translate(1px,-1px);opacity:0}
.picking .rb-mcb{display:flex}
.picking .rb-row{user-select:none;-webkit-user-select:none}
.rb-row.picked{background:var(--rb-acc-soft);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-row.picked .rb-mcb{background:var(--rb-acc-grad);border-color:transparent}
.rb-row.picked .rb-mcb::after{opacity:1}
.rb-pickbar{display:flex;flex-shrink:0;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 10px;margin:0 12px 6px;border-radius:12px;background:var(--rb-sel-bg);border:1px solid var(--rb-sel-ring)}
.rb-pickbar b{font-size:13px;margin-right:auto}
.rb-pickbar[hidden]{display:none}
.rb-folder{height:40px;display:flex;align-items:center;gap:10px;padding:0 10px;margin-top:6px;border:0;border-radius:10px;background:transparent;color:var(--rb-text);cursor:pointer;text-align:left;width:100%}
@media (hover: hover){.rb-folder:hover{background:var(--rb-hover)}}
.rb-folder .chev{color:var(--rb-sub);transition:transform .15s;display:flex}
.rb-folder[aria-expanded=true] .chev{transform:rotate(90deg)}
.rb-folder b{font-size:13px;font-weight:600}.rb-folder small{font-size:12px;color:var(--rb-mute)}
.rb-folder-body{display:flex;flex-direction:column;gap:4px;padding-left:14px;margin-left:16px;box-shadow:inset 2px 0 0 var(--rb-line2)}

/* 스위치 */
.rb-switch{flex-shrink:0;width:44px;height:26px;border-radius:999px;border:0;padding:3px;cursor:pointer;display:flex;justify-content:flex-start;background:var(--rb-track-off);transition:background .15s}
.rb-switch>span{width:20px;height:20px;border-radius:999px;background:var(--rb-knob-off);box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .15s}
.rb-switch[aria-checked=true]{background:var(--rb-acc-grad)}
.rb-switch[aria-checked=true]>span{background:var(--rb-knob-on);transform:translateX(18px)}
.rb-switch[disabled]{opacity:.5;cursor:not-allowed}

/* 카드·필드 */
.rb-card{border-radius:14px;background:var(--rb-surf);overflow:hidden}
.rb-card.pad{padding:16px}
.rb-card.bordered{border:1px solid var(--rb-line)}
.rb-kv{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--rb-line2);font-size:13px}
.rb-kv:last-child{border-bottom:0}.rb-kv>span:first-child{flex:1}.rb-kv>span:last-child{font-size:12px;color:var(--rb-sub)}
.rb-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.rb-stat{padding:12px 14px;border-radius:12px;background:var(--rb-surf)}
.rb-stat small{display:block;font-size:11px;color:var(--rb-sub)}.rb-stat b{display:block;font-size:18px;font-weight:600;margin-top:2px}
.rb-label{font-size:12px;font-weight:600;color:var(--rb-sub)}
.rb-h2{margin:0;font-size:20px;font-weight:700;line-height:1.35}
.rb-h3{margin:0;font-size:16px;font-weight:600}
.rb-p{margin:0;font-size:13px;color:var(--rb-sub);line-height:1.6}
.rb-muted{font-size:12px;color:var(--rb-mute);line-height:1.5}
.rb-input{height:44px;width:100%;padding:0 14px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);color:var(--rb-text);font-size:14px;outline:none}
.rb-input:focus{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-field{display:flex;flex-direction:column;gap:6px}
.rb-seg{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);padding:4px;border-radius:12px;background:var(--rb-surf)}
.rb-seg button{height:36px;border:0;border-radius:9px;background:transparent;color:var(--rb-sub);font-size:13px;cursor:pointer}
.rb-seg-nowrap .rb-seg button{white-space:nowrap;padding:0 10px}
.rb-seg button[aria-checked=true]{background:var(--rb-line);color:var(--rb-text);font-weight:600}
.rb-empty{padding:40px 20px;text-align:center;color:var(--rb-mute);font-size:13px;line-height:1.7}
.rb-section{padding:20px;display:flex;flex-direction:column;gap:20px}
.rb-section.rb-scroll>*{flex-shrink:0}

/* 진행 · 알림 */
.rb-progress{height:8px;border-radius:999px;background:var(--rb-track-off);overflow:hidden}
.rb-progress>i{display:block;height:100%;width:0;border-radius:999px;background:var(--rb-deco-grad);transition:width .2s}
.rb-note{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:14px;font-size:13px;line-height:1.6}
.rb-note.warn{background:var(--rb-warn-soft);color:var(--rb-text);box-shadow:inset 0 0 0 1px var(--rb-warn)}
.rb-note.warn svg{color:var(--rb-warn);flex-shrink:0}
.rb-note.info{background:var(--rb-surf2);color:var(--rb-sub)}
.rb-note.info svg{color:var(--rb-acc-text);flex-shrink:0}
.rb-note.err{background:var(--rb-danger-soft);box-shadow:inset 0 0 0 1px var(--rb-danger)}
.rb-note.err svg{color:var(--rb-danger);flex-shrink:0}
.rb-toasts{position:absolute;left:20px;bottom:20px;display:flex;flex-direction:column;gap:8px;z-index:30;pointer-events:none}
.rb-toast{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:12px 14px 12px 16px;border-radius:14px;background:var(--rb-toast);border:1px solid var(--rb-line3);box-shadow:var(--rb-shadow-sm);font-size:13px;animation:rb-in .18s ease-out}
.rb-toast svg{flex-shrink:0;color:var(--rb-ok)}.rb-toast.err svg{color:var(--rb-danger)}
.rb-toast .act{height:32px;padding:0 12px;border-radius:10px;border:0;background:var(--rb-acc-soft);color:var(--rb-acc-text);font-size:13px;font-weight:600;cursor:pointer}
.rb-drop{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:var(--rb-backdrop);border-radius:18px}
.rb-drop>div{display:flex;align-items:center;gap:12px;padding:28px 36px;border-radius:18px;border:1.5px dashed var(--rb-sel-ring);background:var(--rb-win);color:var(--rb-acc-text);font-size:15px;font-weight:600}
@keyframes rb-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes rb-fade{from{opacity:0}to{opacity:1}}
@keyframes rb-pop{from{opacity:0;transform:scale(.96) translateY(-4px)}to{opacity:1;transform:none}}
@keyframes rb-rot{to{transform:rotate(360deg)}}
@keyframes rb-shimmer{from{background-position:100% 0}to{background-position:-100% 0}}
@keyframes rb-flash{from{background:var(--rb-acc-soft);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}}
@keyframes rb-expand{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}

/* 움직임: 로딩 · 강조 */
.rb-loading{display:flex;flex-direction:column;gap:4px;padding:12px 4px;animation:rb-fade .2s ease-out .12s both}
.rb-skel-row{display:flex;align-items:center;gap:12px;padding:12px 14px;animation:rb-in .25s ease-out var(--d,0ms) both}
.rb-skel{display:block;border-radius:8px;background:linear-gradient(90deg,var(--rb-surf) 25%,var(--rb-surf2) 50%,var(--rb-surf) 75%);background-size:200% 100%;animation:rb-shimmer 1.3s linear infinite}
.rb-loading-label{display:flex;align-items:center;justify-content:center;gap:8px;padding:16px 0 4px;color:var(--rb-mute);font-size:13px}
.rb-spin{display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid var(--rb-line3);border-top-color:var(--rb-acc-text);animation:rb-rot .7s linear infinite;vertical-align:-2px;flex-shrink:0}
.rb-row.just-moved{animation:rb-flash .7s ease-out}
.rb-folder-body.just-opened{animation:rb-expand .16s ease-out}
.rb-btn:active:not([disabled]),.rb-icon-btn:active:not([disabled]){transform:translateY(1px)}

/* 대화상자 · 시트 · 메뉴 */
.rb-modal{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--rb-backdrop);animation:rb-fade .15s ease-out}
.rb-dialog{width:100%;max-width:440px;border-radius:18px;background:var(--rb-win);border:1px solid var(--rb-line3);box-shadow:var(--rb-shadow);padding:22px;display:flex;flex-direction:column;gap:14px;animation:rb-in .15s ease-out}
.rb-dialog .btns{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.rb-menu{position:absolute;z-index:60;min-width:200px;padding:6px;border-radius:14px;background:var(--rb-win);border:1px solid var(--rb-line3);box-shadow:var(--rb-shadow-sm);display:flex;flex-direction:column;animation:rb-pop .13s cubic-bezier(.2,.7,.2,1);transform-origin:top right}
.rb-menu button{height:40px;display:flex;align-items:center;gap:10px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:var(--rb-text);font-size:13px;cursor:pointer;text-align:left}
.rb-menu button:focus-visible{background:var(--rb-hover);outline:none}
@media (hover: hover){.rb-menu button:hover{background:var(--rb-hover)}}
.rb-menu button.danger{color:var(--rb-danger)}
.rb-menu hr{border:0;border-top:1px solid var(--rb-line2);margin:4px 0}
.rb-swatches{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rb-swatch{width:32px;height:32px;border-radius:999px;border:0;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.rb-swatch[aria-pressed=true]{box-shadow:0 0 0 2px var(--rb-win),0 0 0 4px var(--rb-text)}
.rb-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.rb-preset{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:10px;border-radius:12px;cursor:pointer;color:var(--rb-text);background:var(--rb-surf);border:1px solid var(--rb-line)}
.rb-preset[aria-pressed=true]{border-color:var(--rb-text)}
.rb-preset i{display:block;width:100%;height:28px;border-radius:8px}
.rb-color{display:flex;align-items:center;gap:10px;height:48px;padding:0 12px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);cursor:pointer}
.rb-color input{width:28px;height:28px;border:0;padding:0;background:transparent;cursor:pointer}
.rb-color span{flex:1;font-size:13px}.rb-color small{font-size:12px;color:var(--rb-sub)}

/* 전체 화면 패널(에디터·에셋 관리자) */
.rb-full{position:absolute;inset:0;z-index:25;display:flex;flex-direction:column;background:var(--rb-win);animation:rb-in .15s ease-out}
.rb-full-head{min-height:64px;flex-shrink:0;display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--rb-line2);flex-wrap:wrap}
.rb-full-head .ttl{flex:1;min-width:120px;display:flex;flex-direction:column}
.rb-full-head .ttl small{font-size:11px;color:var(--rb-sub)}.rb-full-head .ttl b{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-tabs{display:flex;gap:4px;padding:8px 16px 0;border-bottom:1px solid var(--rb-line2);overflow-x:auto;flex-shrink:0}
.rb-tabs button{height:40px;padding:0 14px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--rb-sub);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap}
.rb-tabs button[aria-selected=true]{color:var(--rb-text);border-bottom-color:var(--rb-acc-text);font-weight:600}
.rb-tabs button small{margin-left:6px;font-size:12px;opacity:.75}
.rb-split{flex:1;display:flex;min-height:0}
.rb-split>*{min-height:0}
.rb-scroll,.rb-split>.pane,.rb-side-list{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.rb-split>.side{width:320px;flex-shrink:0;border-right:1px solid var(--rb-line2);display:flex;flex-direction:column;min-height:0}
.rb-split>.pane{flex:1;min-width:0;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
.rb-side-tools{display:flex;gap:6px;padding:12px;border-bottom:1px solid var(--rb-line2);flex-wrap:wrap}
.rb-side-list{flex:1;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:2px}
.rb-item{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;border:0;background:transparent;color:var(--rb-text);text-align:left;cursor:pointer;width:100%;font-size:13px}
@media (hover: hover){.rb-item:hover{background:var(--rb-hover)}}
.rb-item[aria-selected=true]{background:var(--rb-sel-bg);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-item .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-item.off .t{color:var(--rb-mute);text-decoration:line-through}
.rb-item.child{padding-left:28px}
.rb-item-row{display:flex;align-items:center;gap:2px;border-radius:10px}
.rb-item-row>.grip{color:var(--rb-grip);cursor:grab;display:flex;padding:6px 2px;flex-shrink:0;touch-action:none}
.rb-item-row>.rb-item{flex:1;min-width:0}
.rb-item.divider .t{color:var(--rb-mute);font-size:12px;letter-spacing:.02em}
.rb-item.divider{padding-top:6px;padding-bottom:6px}
.rb-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.rb-form .wide{grid-column:1/-1}
.rb-textarea{width:100%;min-height:120px;padding:12px 14px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);color:var(--rb-text);font:13px/1.6 ui-monospace,'JetBrains Mono',Consolas,'D2Coding',monospace;resize:vertical;outline:none;tab-size:4}
.rb-textarea:focus{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-textarea.tall{min-height:max(300px,46vh)}
.rb-check{display:flex;align-items:center;gap:10px;min-height:44px;font-size:13px;cursor:pointer}
.rb-check input{width:18px;height:18px;accent-color:var(--rb-acc-a);margin:0}
select.rb-input{appearance:auto}
.rb-issues{display:flex;flex-direction:column;gap:6px}
.rb-issue{display:flex;gap:8px;align-items:flex-start;font-size:12px;padding:8px 10px;border-radius:10px;background:var(--rb-surf2);cursor:pointer;border:0;color:var(--rb-text);text-align:left;width:100%}
.rb-issue.err svg{color:var(--rb-danger)}.rb-issue.warn svg{color:var(--rb-warn)}
.rb-cbs{display:flex;flex-direction:column;gap:4px;max-height:60vh;overflow:auto}
.rb-cbs button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 10px;border-radius:10px;border:0;background:var(--rb-surf);color:var(--rb-text);cursor:pointer;text-align:left}
.rb-cbs code{font:12px ui-monospace,Consolas,monospace;color:var(--rb-acc-text)}.rb-cbs span{font-size:12px;color:var(--rb-sub)}
/* 에셋 격자 */
.rb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px;align-content:start}
.rb-tile{position:relative;display:flex;flex-direction:column;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line);overflow:hidden;cursor:pointer;text-align:left;padding:0;color:var(--rb-text)}
.rb-tile[aria-selected=true]{border-color:var(--rb-acc-text);box-shadow:0 0 0 2px var(--rb-sel-ring)}
.rb-tile .img{aspect-ratio:1/1;width:100%;background:var(--rb-surf2) center/contain no-repeat;display:flex;align-items:center;justify-content:center;color:var(--rb-mute)}
.rb-tile img{width:100%;height:100%;object-fit:contain;display:block}
.rb-tile .cap{padding:6px 8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-tile .cap small{display:block;color:var(--rb-mute);font-size:11px}
.rb-tile .sel{position:absolute;top:6px;left:6px;width:22px;height:22px;border-radius:7px;background:var(--rb-win);border:1px solid var(--rb-line3);display:flex;align-items:center;justify-content:center;color:var(--rb-on-acc)}
.rb-tile[aria-selected=true] .sel{background:var(--rb-acc-grad);border:0}
/* 에셋 목록 보기: 캐릭터별 묶음 */
.rb-grid.list{display:flex;flex-direction:column;gap:4px}
.rb-viewtoggle{position:relative;display:inline-grid;grid-template-columns:1fr 1fr;padding:3px;border-radius:12px;background:var(--rb-surf);border:1px solid var(--rb-line3);flex-shrink:0}
.rb-viewtoggle>i{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:9px;background:var(--rb-acc-grad);box-shadow:0 2px 8px rgba(0,0,0,.25);transition:transform .2s cubic-bezier(.2,.7,.2,1)}
.rb-viewtoggle[data-v=list]>i{transform:translateX(100%)}
.rb-viewtoggle button{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 14px;border:0;background:transparent;color:var(--rb-sub);font-size:13px;font-weight:500;cursor:pointer;transition:color .15s}
.rb-viewtoggle button[aria-checked=true]{color:var(--rb-on-acc);font-weight:600}
.rb-am-group{margin-top:6px}
.rb-am-group.sub{margin-top:2px;min-height:36px;font-size:13px}
.rb-am-group[aria-expanded=true] .chev{transform:rotate(90deg)}
.rb-am-group-body{display:flex;flex-direction:column;gap:4px;padding-left:14px;animation:rb-expand .16s ease-out}
.rb-grid.list .rb-tile{flex-direction:row;align-items:center;gap:10px;padding:6px 10px 6px 40px;min-height:52px}
.rb-grid.list .rb-tile .img{width:40px;height:40px;aspect-ratio:auto;flex-shrink:0;border-radius:8px;overflow:hidden}
.rb-grid.list .rb-tile .cap{flex:1;min-width:0;padding:0;font-size:13px}
.rb-grid.list .rb-tile .cap small{display:inline;margin-left:8px}
.rb-grid.list .rb-tile .sel{top:50%;left:10px;transform:translateY(-50%)}
.rb-folders{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.rb-lightbox{position:absolute;inset:0;z-index:55;background:rgba(5,6,12,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px}
.rb-lightbox img{max-width:100%;max-height:calc(100% - 80px);object-fit:contain;border-radius:8px}
.rb-lightbox .bar{display:flex;gap:8px;align-items:center;color:#e9eaf6;font-size:13px;flex-wrap:wrap;justify-content:center}
@media (max-width: 760px){
  .rb-split{flex-direction:column}
  .rb-split>.side{width:auto;max-height:38%;border-right:0;border-bottom:1px solid var(--rb-line2)}
  .rb-split>.pane{padding:14px}
  .rb-split>aside{width:auto !important;border-left:0 !important;border-top:1px solid var(--rb-line2);max-height:45%}
  .rb-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}
  .rb-am-info.none{display:none !important}
  .rb-am-thumb{max-height:140px !important}
  .rb-split.m-list>.side{max-height:none;flex:1;border-bottom:0}
  .rb-split.m-list>.pane{display:none}
  .rb-split.m-item>.side{display:none}
  .rb-hist-root{flex-direction:column;flex-wrap:nowrap}
  .rb-hist-pane{min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
}
.rb-mobile-only{display:none}
@media (max-width: 760px){ .rb-mobile-only{display:block} }

/* 모바일: 아래 탭 바, 상세는 시트 */
.rb-tabbar{display:none}
.rb-nav a[hidden],.rb-tabbar a[hidden]{display:none!important}
.rb-mobile-search{display:none !important}
.rb-win.rb-nosearch .rb-head .rb-search{visibility:hidden}
.rb-sheet-back{display:none}
.rb-sheet-head{display:none}
@media (max-width: 760px){
  .rb-root{padding:0}
  .rb-win{max-width:none;max-height:none;border-radius:0;border:0}
  .rb-brand{width:auto}.rb-brand small{display:none}
  .rb-head{padding:0 12px;gap:8px;height:60px}
  .rb-head .rb-search{display:none}
  .rb-head .rb-btn .lbl{display:none}.rb-head .rb-btn{width:44px;padding:0}
  .rb-nav{display:none}
  .rb-mobile-search{display:flex !important;flex:0 0 auto;height:44px;margin:12px 16px 0;max-width:none}
  .rb-win.rb-nosearch .rb-mobile-search{display:none !important}
  .rb-tabbar{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);height:68px;flex-shrink:0;border-top:1px solid var(--rb-line2);background:var(--rb-win)}
  .rb-tabbar a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-decoration:none;color:var(--rb-sub);font-size:11px;cursor:pointer}
  .rb-tabbar a[aria-current=page]{color:var(--rb-acc-text);font-weight:600}
  .rb-chips{flex-wrap:nowrap;overflow-x:auto;padding:12px 16px 8px}
  .rb-chip{flex-shrink:0}
  .rb-tray{flex-wrap:nowrap;overflow-x:auto;padding:0 16px 10px}
  .rb-detail{position:absolute;left:0;right:0;bottom:68px;width:auto;max-height:72%;border-left:0;border-radius:22px 22px 0 0;background:var(--rb-win);box-shadow:var(--rb-shadow);z-index:20;overflow:auto;transform:translateY(105%);visibility:hidden;pointer-events:none;transition:transform .2s ease-out,visibility 0s linear .2s}
  .rb-detail.open{transform:none;visibility:visible;pointer-events:auto;transition:transform .2s ease-out}
  .rb-detail::before{content:'';display:block;width:40px;height:5px;border-radius:999px;background:var(--rb-line3);margin:-8px auto 4px}
  .rb-sheet-head{display:flex;justify-content:flex-end;margin:-8px -8px -12px}
  .rb-sheet-back.open{display:block;position:absolute;inset:0;bottom:68px;background:var(--rb-backdrop);z-index:19}
  .rb-presets{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rb-toasts{left:12px;right:12px;bottom:80px}
}
button,a,[role=option],.rb-tile{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
@media (max-width: 760px){ .rb-input,.rb-textarea,.rb-search input,select{font-size:16px !important} }
@media (prefers-reduced-motion: reduce){*{transition:none !important;animation:none !important}}

.rb-thanks{position:relative;margin-top:22px;border-radius:20px;overflow:hidden;padding:22px 22px 54px;background:linear-gradient(135deg,#0d2a4a 0%,#123e66 45%,#1b5a86 100%);color:#e8f6ff;box-shadow:0 14px 40px rgba(6,30,60,.35);animation:rb-fade .4s ease-out}
.rb-thanks-waves{position:absolute;left:0;right:0;bottom:0;height:64px;color:#7fd3ff;pointer-events:none}
.rb-thanks-waves svg{width:200%;height:100%;animation:rb-wave 9s linear infinite}
@keyframes rb-wave{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.rb-thanks-waves svg{animation:none}}
.rb-thanks-body{position:relative;display:flex;gap:18px;align-items:flex-start}
.rb-thanks-emoji{font-size:46px;line-height:1;filter:drop-shadow(0 6px 14px rgba(0,0,0,.3));animation:rb-bob 3.2s ease-in-out infinite}
@keyframes rb-bob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-5px) rotate(4deg)}}
.rb-thanks-body>div{display:flex;flex-direction:column;gap:4px;min-width:0}
.rb-thanks-kicker{font-size:11px;font-weight:800;letter-spacing:.18em;color:#9fe0ff}
.rb-thanks-title{font-size:24px;font-weight:800;letter-spacing:-.01em;background:linear-gradient(90deg,#ffffff,#9fe0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.rb-thanks-text{font-size:13.5px;line-height:1.7;color:#cfeaff;word-break:keep-all}
.rb-da{margin-top:10px;border:1px solid var(--rb-line);border-radius:16px;background:var(--rb-surf);padding:14px;display:flex;flex-direction:column;gap:12px}
.rb-da.on{border-color:var(--rb-sel-ring);box-shadow:0 0 0 1px var(--rb-acc-soft) inset}
.rb-da-head{display:flex;align-items:center;gap:12px}
.rb-da-ico{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--rb-acc-soft);color:var(--rb-acc-text);flex-shrink:0}
.rb-da-ttl{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.rb-da-ttl b{font-size:15px;color:var(--rb-text)}
.rb-da-ttl small{font-size:12.5px;color:var(--rb-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-da-hint,.rb-da-foot{margin:0;font-size:12.5px;line-height:1.6;color:var(--rb-sub);word-break:keep-all}
.rb-da-foot{color:var(--rb-mute)}
.rb-da-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:10px}
.rb-da-card{background:var(--rb-win);border:1px solid var(--rb-line);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;min-width:0}
.rb-da-card>header{display:flex;align-items:center;gap:8px;color:var(--rb-text);flex-wrap:wrap}
.rb-da-card>header b{font-size:14px}
.rb-da-card>header small{flex-basis:100%;font-size:12px;color:var(--rb-sub);word-break:keep-all}
.rb-da-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.rb-da-line>.rb-seg{flex:1;min-width:200px}
.rb-da-line>.rb-input{flex:1;min-width:140px}
.rb-da-lab{width:84px;flex-shrink:0;font-size:12.5px;font-weight:600;color:var(--rb-sub)}
.rb-da-note{font-size:12.5px;color:var(--rb-sub)}
.rb-da-conds{display:flex;flex-direction:column;gap:6px}
.rb-da-cond{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px;border-radius:10px;background:var(--rb-surf)}
.rb-da-cond .rb-input{height:34px;min-width:0}
.rb-da-cond .rb-da-type{flex:0 1 230px}
.rb-da-params{flex:1 1 220px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.rb-da-params>.rb-input{flex:1 1 110px}
.rb-da-cond>select.rb-input{flex:1 1 180px}
.rb-da-idx{width:22px;height:22px;border-radius:999px;display:grid;place-items:center;font-size:11.5px;font-weight:700;background:var(--rb-acc-soft);color:var(--rb-acc-text);flex-shrink:0}
.rb-da-arrow{font-weight:700;color:var(--rb-acc-text);padding:0 2px}
.rb-da-empty{margin:0;font-size:12.5px;color:var(--rb-mute)}
.rb-da-sub{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px dashed var(--rb-line)}
.rb-da-range{flex:1;min-width:120px;accent-color:var(--rb-acc-text)}
.rb-da .rb-input.rb-da-num{flex:0 0 auto;min-width:0;height:36px;text-align:center;padding:0 6px}
.rb-da .rb-input{height:36px}
.rb-da-params>select.rb-input{flex:1 1 140px;min-width:140px}
.rb-da .rb-seg button{height:auto;min-height:36px;padding:6px 4px;line-height:1.35;word-break:keep-all}
.rb-da-note{line-height:1.55}
.rb-da-err{flex-basis:100%;font-size:12.5px;line-height:1.5;color:var(--rb-danger,#e5484d)}
.rb-da-pair{display:flex;flex-direction:column;gap:4px}
.rb-da-opts{display:flex;gap:12px;align-items:center;flex-wrap:nowrap}
.rb-da-opts .rb-check{white-space:nowrap}
@media (max-width:560px){.rb-da{padding:10px}.rb-da-lab{width:100%}.rb-da-line>.rb-seg{min-width:100%}}
`+PROB_CSS;
