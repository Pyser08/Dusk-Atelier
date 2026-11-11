// 에셋 제작 화면 모양: SDStudio 씬 갤러리 배치를 Dusk 토큰(--rb-*)으로. 색을 새로 만들지 않고 테마를 따른다.
import { svgFrom } from "../../dom.js";

export var CSS = `
.sds{position:absolute;inset:0;z-index:25;display:flex;flex-direction:row;overflow:hidden;background:var(--rb-win);color:var(--rb-text);animation:rb-in .15s ease-out}
.sds *{box-sizing:border-box}
.sds-rail{width:44px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0;background:var(--rb-surf);border-right:var(--rb-bw,1px) solid var(--rb-line2)}
.sds-rail .tab{writing-mode:vertical-rl;letter-spacing:.2em;font-weight:800;font-size:13px;padding:10px 0;border:0;background:none;color:var(--rb-sub);cursor:pointer;border-radius:var(--rb-r1)}
.sds-rail .tab[aria-pressed=true]{color:var(--rb-acc-text);background:var(--rb-sel-bg)}
.sds-rail .key{font-size:10px;color:var(--rb-mute);font-weight:700}
.sds-left{width:380px;flex-shrink:0;display:flex;flex-direction:column;min-height:0;background:var(--rb-surf);border-right:var(--rb-bw,1px) solid var(--rb-line2)}
.sds-left[hidden]{display:none}
.sds-left-head{display:flex;align-items:center;gap:8px;padding:14px 16px 8px}
.sds-left-head b{font-size:16px;font-weight:800}
.sds-left-body{flex:1;min-height:0;overflow:auto;padding:4px 16px 16px;display:flex;flex-direction:column;gap:14px}
.sds-groups{display:flex;justify-content:center;gap:22px;padding:0 16px 10px}
.sds-group{display:flex;flex-direction:column;align-items:center;gap:4px}
.sds-group>small{font-size:10.5px;font-weight:700;color:var(--rb-sub);letter-spacing:.02em}
.sds-group>div{display:flex;gap:6px}
.sds-ib{width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:var(--rb-r1);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf2);color:var(--rb-text);cursor:pointer;padding:0;flex-shrink:0}
.sds-ib:disabled{opacity:.4;cursor:default}
.sds-ib.on,.sds-ib[aria-pressed=true]{background:var(--rb-acc-grad);color:var(--rb-on-acc);border-color:transparent}
.sds-ib.danger{color:var(--rb-danger)}
@media (hover:hover){.sds-ib:not(:disabled):hover{border-color:var(--rb-acc);color:var(--rb-acc-text)}.sds-ib.on:hover,.sds-ib[aria-pressed=true]:hover{color:var(--rb-on-acc)}}
.sds-lbl{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;margin-bottom:6px}
.sds-help{width:16px;height:16px;border-radius:50%;border:1px solid var(--rb-line3);font-size:10px;line-height:14px;text-align:center;color:var(--rb-sub);cursor:help;background:none;padding:0}
.sds-pa{position:relative;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-win)}
.sds-pa:focus-within{border-color:var(--rb-acc);box-shadow:0 0 0 3px var(--rb-focus)}
.sds-pa>pre,.sds-pa>textarea{margin:0;padding:10px 12px;font:inherit;font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;letter-spacing:normal}
.sds-pa>pre{position:absolute;inset:0;overflow:hidden;pointer-events:none;color:var(--rb-text)}
.sds-pa>textarea{position:relative;display:block;width:100%;min-height:72px;max-height:340px;resize:vertical;border:0;background:transparent;color:transparent;caret-color:var(--rb-text);outline:none}
.sds-pa>textarea::placeholder{color:var(--rb-mute)}
.sds-pa .k-weight-up,.sds-pa .k-brace{background:var(--rb-rose-soft);border-radius:3px}
.sds-pa .k-brace{font-weight:800}
.sds-pa .k-weight-down,.sds-pa .k-bracket{background:var(--rb-blue-soft);border-radius:3px}
.sds-pa .k-weight-neg{background:var(--rb-surf2);color:var(--rb-sub);border-radius:3px}
.sds-pa .k-piece{background:var(--rb-teal-soft);border-radius:3px}
.sds-pa .k-random{background:var(--rb-warn-soft);border-radius:3px}
.sds-pa .k-comment{color:var(--rb-mute);font-style:italic}
.sds-pa .k-pipe{color:var(--rb-acc-text);font-weight:800}
.sds-row{display:flex;gap:8px;align-items:center;min-width:0}
.sds-row>*{min-width:0}
.sds-sel,.sds-in{height:40px;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-win);color:var(--rb-text);padding:0 12px;font:inherit;font-size:14px}
.sds-sel:focus,.sds-in:focus{outline:none;border-color:var(--rb-acc);box-shadow:0 0 0 3px var(--rb-focus)}
.sds-sel.acc{background:var(--rb-sel-bg);color:var(--rb-acc-text);font-weight:700;text-align:center}
.sds-bar{display:flex;align-items:center;gap:10px;height:44px;padding:0 14px;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-win);color:var(--rb-text);font:inherit;font-size:14px;font-weight:700;cursor:pointer;width:100%;text-align:left}
.sds-bar>.t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sds-bar small{color:var(--rb-sub);font-weight:600}
.sds-bar.fill{background:var(--rb-acc-soft);color:var(--rb-acc-text);border-color:transparent}
@media (hover:hover){.sds-bar:hover{border-color:var(--rb-acc)}}
.sds-main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.sds-top{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf);flex-wrap:wrap;min-height:58px}
.sds-top .ttl{display:flex;align-items:center;gap:8px;min-width:0}
.sds-top .ttl b{font-size:17px;font-weight:800;white-space:nowrap}
.sds-pill{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;background:var(--rb-sel-bg);color:var(--rb-acc-text);font-size:12px;font-weight:800;white-space:nowrap}
.sds-modes{flex:1;display:flex;justify-content:center;gap:4px;min-width:0;overflow-x:auto;scrollbar-width:none}
.sds-modes button{border:0;background:none;color:var(--rb-sub);font:inherit;font-size:14px;font-weight:700;padding:8px 14px;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}
.sds-modes button[aria-selected=true]{color:var(--rb-text);border-bottom-color:var(--rb-acc)}
.sds-modes button:disabled{opacity:.35;cursor:default}
.sds-tools{display:flex;align-items:flex-end;gap:18px;padding:8px 16px 10px;border-bottom:var(--rb-bw,1px) solid var(--rb-line2);overflow-x:auto;scrollbar-width:thin;flex-shrink:0}
.sds-tools .sp{flex:1}
.sds-zoom{display:flex;align-items:center;gap:8px}
.sds-zoom input{width:120px;accent-color:var(--rb-acc)}
.sds-zoom span{font-size:12px;color:var(--rb-sub);width:34px;text-align:right;font-variant-numeric:tabular-nums}
.sds-body{flex:1;min-height:0;overflow:auto;padding:16px 20px 28px;display:flex;flex-direction:column;gap:16px;position:relative}
.sds-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--sds-card,180px),1fr));gap:14px}
.sds-card{position:relative;padding:0;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);overflow:hidden;background:var(--rb-surf2);cursor:pointer;aspect-ratio:2/3;width:100%;color:var(--rb-text);display:block;text-align:left}
.sds-card>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.sds-card .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--rb-mute)}
.sds-card .cap{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:6px;padding:20px 12px 9px;background:linear-gradient(transparent,rgba(0,0,0,.66));color:#fff;font-size:14px;font-weight:700}
.sds-card .cap .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sds-card .cap .c{opacity:.9;font-variant-numeric:tabular-nums}
.sds-card .cap .pk{height:20px;padding:0 7px;border-radius:999px;background:var(--rb-acc-grad);color:var(--rb-on-acc);font-size:11.5px;font-weight:800;display:inline-flex;align-items:center}
.sds.nonames .sds-card .cap .n{visibility:hidden}
.sds-card .rsv{position:absolute;top:8px;right:8px;height:22px;padding:0 8px;border-radius:999px;background:var(--rb-acc-grad);color:var(--rb-on-acc);font-size:12px;font-weight:800;display:flex;align-items:center}
.sds-card .chk{position:absolute;top:8px;left:8px;width:24px;height:24px;border-radius:7px;background:var(--rb-win);border:1px solid var(--rb-line3);display:flex;align-items:center;justify-content:center;color:var(--rb-on-acc);opacity:0;transition:opacity .12s}
.sds-card[aria-selected=true] .chk,.sds-card:focus-visible .chk{opacity:1}
.sds-card[aria-selected=true]{border-color:var(--rb-acc);box-shadow:0 0 0 2px var(--rb-acc)}
.sds-card[aria-selected=true] .chk{background:var(--rb-acc-grad);border:0}
.sds-card .badges{position:absolute;top:8px;right:8px;display:flex;gap:4px}
.sds-card .badge{height:22px;min-width:22px;padding:0 6px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:11.5px;font-weight:800;display:flex;align-items:center;justify-content:center}
.sds-card .quick{position:absolute;left:8px;right:8px;bottom:44px;display:flex;gap:6px;justify-content:flex-end;opacity:0;transition:opacity .12s}
@media (hover:hover){.sds-card:hover .chk,.sds-card:hover .quick{opacity:1}.sds-card:hover{border-color:var(--rb-acc)}}
.sds-card .quick button{height:26px;padding:0 9px;border-radius:999px;border:0;background:rgba(0,0,0,.6);color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
.sds-frow{border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r3);background:var(--rb-surf);padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.sds-frow .hd{display:flex;align-items:center;gap:8px}
.sds-frow .hd>button.open{flex:1;min-width:0;display:flex;align-items:center;gap:8px;background:none;border:0;padding:0;color:var(--rb-text);cursor:pointer;text-align:left;font:inherit}
.sds-frow .strip{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}
.sds-frow .strip .sds-card{width:var(--sds-row,132px);flex-shrink:0}
.sds-card.cur,.sds-frow.cur{border-color:var(--rb-acc);box-shadow:0 0 0 2px var(--rb-acc)}
.sds-dragging .dragging{opacity:.45}
.sds-card.drop-before::after,.sds-card.drop-after::after{content:"";position:absolute;top:0;bottom:0;width:6px;background:var(--rb-acc);z-index:3}
.sds-card.drop-before::after{left:0}.sds-card.drop-after::after{right:0}
.sds-frow.drop-into,.sds-grid.drop-into,.sds-rootdrop.drop-into,.sds-crumbs .rb-chip.drop-into,.sds-tray .rb-chip.drop-into{outline:2px solid var(--rb-acc);outline-offset:1px;background:var(--rb-sel-bg,var(--rb-surf2))}
.sds-frow.drop-before{box-shadow:0 -4px 0 var(--rb-acc)}.sds-frow.drop-after{box-shadow:0 4px 0 var(--rb-acc)}
.sds-frow{position:relative}
[data-drop-hint]::before{content:attr(data-drop-hint);position:absolute;top:-12px;left:50%;transform:translateX(-50%);z-index:5;padding:3px 10px;border-radius:999px;background:var(--rb-acc-grad);color:var(--rb-on-acc);font-size:12px;font-weight:800;white-space:nowrap;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.sds-crumbs .rb-chip{position:relative}
.sds-frow .sds-frow{background:var(--rb-surf2)}
.sds-subf.drop-into{outline:2px solid var(--rb-acc);outline-offset:1px}
.sds-rootdrop{display:none;border:2px dashed var(--rb-line3);border-radius:var(--rb-r3);padding:16px;text-align:center;color:var(--rb-sub);font-size:13px}
.sds-dragging .sds-rootdrop{display:block}
.sds-tray{display:none;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border:2px dashed var(--rb-line3);border-radius:var(--rb-r3);position:sticky;bottom:0;background:var(--rb-win);margin-top:6px}
.sds-drag-scene .sds-tray{display:flex}
.sds-crumbs{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.sds-sec{display:flex;align-items:center;gap:8px;min-height:30px}
.sds-sec b{font-size:14px}
.sds-sec .sp{flex:1}
.sds-empty{border:1px dashed var(--rb-line3);border-radius:var(--rb-r3);padding:32px 18px;display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;color:var(--rb-sub)}
.sds-empty b{color:var(--rb-text);font-size:15px}
.sds-run{display:flex;align-items:center;gap:8px}
.sds-queue{height:36px;padding:0 14px;border-radius:999px;border:0;font:inherit;font-weight:800;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:var(--rb-acc-grad);color:var(--rb-on-acc)}
.sds-queue.stop{background:var(--rb-danger);color:#fff}
.sds-queue:disabled{opacity:.45;cursor:default}
.sds-slots{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px;align-items:flex-start}
.sds-slot{width:260px;flex-shrink:0;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);background:var(--rb-surf);padding:10px;display:flex;flex-direction:column;gap:8px}
.sds-slot .hd{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:var(--rb-sub)}
.sds-piece{display:flex;gap:6px;align-items:flex-start}
.sds-piece .sds-pa{flex:1}
.sds-piece .sds-pa>textarea{min-height:44px}
.sds-piece.off .sds-pa{opacity:.45}
.sds-over{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;background:var(--rb-backdrop);backdrop-filter:blur(4px)}
.sds-lb{flex:1;min-height:0;display:flex;background:var(--rb-win)}
.sds-lb .stage{flex:1;min-width:0;position:relative;display:flex;align-items:center;justify-content:center;background:var(--rb-surf2)}
.sds-lb .stage img{max-width:100%;max-height:100%;object-fit:contain;display:block}
.sds-lb .nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.sds-lb .info{width:340px;flex-shrink:0;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px;border-left:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf)}
.sds-lb .info pre{margin:0;white-space:pre-wrap;word-break:break-word;font:inherit;font-size:12.5px;color:var(--rb-sub);background:var(--rb-win);border-radius:var(--rb-r1);padding:8px 10px;max-height:180px;overflow:auto}
.sds-acts{display:flex;flex-wrap:wrap;gap:6px}
.sds-cup{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--rb-win)}
.sds-cup .pair{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:16px}
.sds-cup .pair button{border:2px solid var(--rb-line2);border-radius:var(--rb-r3);background:var(--rb-surf2);cursor:pointer;padding:0;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:0}
.sds-cup .pair button img{max-width:100%;max-height:100%;object-fit:contain}
@media (hover:hover){.sds-cup .pair button:hover{border-color:var(--rb-acc)}}
.sds-cmp{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));align-items:start}
.sds-cmp figure{margin:0;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);overflow:hidden;background:var(--rb-surf2)}
.sds-cmp figure img{width:100%;display:block}
.sds-cmp figcaption{padding:6px 10px;font-size:12px;color:var(--rb-sub);display:flex;gap:8px;align-items:center}
.sds-table{width:100%;border-collapse:collapse;font-size:13px}
.sds-table th,.sds-table td{padding:6px 8px;border-bottom:1px solid var(--rb-line2);text-align:left;vertical-align:top}
.sds-table th{color:var(--rb-sub);font-weight:700;font-size:12px}
.sds-paint{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;background:var(--rb-surf2);overflow:auto}
.sds-paint canvas{display:block;touch-action:none;max-width:100%;max-height:100%}
@media (max-width:760px){
  .sds{flex-direction:column}
  .sds-rail{width:auto;height:auto;flex-direction:row;padding:6px 10px;border-right:0;border-bottom:var(--rb-bw,1px) solid var(--rb-line2)}
  .sds-rail .tab{writing-mode:horizontal-tb;padding:4px 10px;letter-spacing:0}
  .sds-left{width:auto;max-height:46%;border-right:0;border-bottom:var(--rb-bw,1px) solid var(--rb-line2)}
  .sds-modes{justify-content:flex-start}
  .sds-modes button{padding:8px 10px;font-size:13px}
  .sds-top .ttl b{font-size:15px}
  .sds-body{padding:12px}
  .sds-lb{flex-direction:column}.sds-lb .info{width:auto;max-height:45%;border-left:0;border-top:var(--rb-bw,1px) solid var(--rb-line2)}
  .sds-cup .pair{grid-template-columns:1fr;grid-template-rows:1fr 1fr}
}
@media (prefers-reduced-motion:reduce){.sds{animation:none}}
`;
export function ensureStyle(doc = document) {
  if (doc.getElementById("rb-sds-style")) return;
  const el = doc.createElement("style");
  el.id = "rb-sds-style";
  el.textContent = CSS;
  doc.head.appendChild(el);
}

// 아이콘(24px 선 아이콘) — SDStudio 도구 모음과 같은 뜻
var P = {
  calPlus: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M12 13v5M9.5 15.5h5"/>',
  calX: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M10 14l4 4M14 14l-4 4"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  swap: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  exportBot: '<path d="M4 4h10v16H4z"/><path d="M14 12h7M18 9l3 3-3 3"/>',
  exportAll: '<path d="M4 4h9v5H4zM4 11h9v9H4z"/><path d="M14 12h7M18 9l3 3-3 3"/>',
  zip: '<path d="M6 3h9l4 4v14H6z"/><path d="M10 3v2M10 7v2M10 11v2M9 15h2v3H9z"/>',
  expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
  sortAsc: '<path d="M7 4v16M3 16l4 4 4-4M14 6h7M14 12h5M14 18h3"/>',
  sortDesc: '<path d="M7 20V4M3 8l4-4 4 4M14 6h3M14 12h5M14 18h7"/>',
  clip: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  importIn: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M12 11v7M9 15l3 3 3-3"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17h.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  copies: '<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M8 21h11a2 2 0 0 0 2-2V8"/>',
  puzzle: '<path d="M10 3h4v3a2 2 0 1 0 4 0V3h3v7h-3a2 2 0 1 0 0 4h3v7h-7v-3a2 2 0 1 0-4 0v3H3v-7h3a2 2 0 1 0 0-4H3V3h7z"/>',
  warn: '<path d="M12 3 2 21h20zM12 10v5M12 18h.01"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>',
  load: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M12 18v-7M9 14l3-3 3 3"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
  chevL: '<path d="M15 18l-6-6 6-6"/>',
  chevR: '<path d="M9 18l6-6-6-6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  wand: '<path d="M15 4V2M15 10V8M11 6h2M17 6h2M4 20 14 10M18 13v2M17 14h2"/>',
  up2: '<path d="M7 17 17 7M9 7h8v8"/><rect x="3" y="3" width="18" height="18" rx="2"/>',
  brush: '<path d="M18 2l4 4-10 10-4-4zM8 12l-4 4a3 3 0 0 0 0 4c1 1 3 1 4 0l4-4"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  folderPlus: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 10v6M9 13h6"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  compare: '<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  keyboard: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 15h10"/>',
  template: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M17 13v8M13 17h8"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'
};
var FILL = new Set(["play", "stop", "more"]);
export function ico(name, size = 18) {
  const d = P[name] ?? P.help;
  return svgFrom(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${FILL.has(name) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`);
}
