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
.rb-win{width:100%;max-width:min(1560px,100%);height:100%;max-height:min(1040px,100%);display:flex;flex-direction:column;overflow:hidden;zoom:var(--rb-zoom,1);
  border-radius:var(--rb-r4);background:var(--rb-win);border:var(--rb-bw,1px) solid var(--rb-line);box-shadow:var(--rb-shadow);position:relative}
.rb-scroll{overflow:auto;scrollbar-width:thin;scrollbar-color:var(--rb-line3) transparent}
.rb-scroll::-webkit-scrollbar{width:10px;height:10px}.rb-scroll::-webkit-scrollbar-thumb{background:var(--rb-line3);border-radius:10px;border:3px solid var(--rb-win)}

/* 머리줄 */
.rb-head{height:60px;flex-shrink:0;display:flex;align-items:center;gap:12px;padding:0 18px;background:var(--rb-surf);border-bottom:var(--rb-bw,1px) solid var(--rb-line2)}
.rb-brand{display:flex;align-items:center;gap:11px;flex-shrink:0;border:0;background:transparent;padding:4px 8px 4px 0;margin:0;border-radius:var(--rb-r2);cursor:pointer;text-align:left;color:inherit}
@media (hover: hover){.rb-brand:hover .rb-logo{filter:brightness(1.08)}}
.rb-logo{width:34px;height:34px;border-radius:11px;background:var(--rb-acc-grad);color:var(--rb-on-acc);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rb-brand b{display:block;font-size:15px;font-weight:700;line-height:1.2;letter-spacing:-.01em}.rb-brand small{display:block;font-size:11px;color:var(--rb-sub)}
.rb-search{flex:1;max-width:360px;height:var(--rb-ctl);display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:999px;background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line3);color:var(--rb-sub)}
.rb-search:focus-within{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-search{min-width:0}
.rb-search input{flex:1;min-width:0;width:0;background:transparent;border:0;outline:none;font-size:14px;color:var(--rb-text)}
.rb-search input::placeholder{color:var(--rb-mute)}
.rb-kbd{font-size:11px;color:var(--rb-mute);border:1px solid var(--rb-line3);border-radius:6px;padding:1px 6px}
.rb-spacer{flex:1}

/* 버튼: 주(채움) · 보조(테두리) · 조용히(ghost) · 위험 */
.rb-btn{height:var(--rb-ctl);display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line3);
  background:var(--rb-surf);color:var(--rb-text);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,filter .15s,transform .08s,box-shadow .15s}
@media (hover: hover){.rb-btn:hover{background:var(--rb-hover);border-color:var(--rb-grip)}}
.rb-btn:focus-visible,.rb-chip:focus-visible,.rb-nav a:focus-visible,.rb-switch:focus-visible,.rb-icon-btn:focus-visible,.rb-hcard:focus-visible,.rb-brand:focus-visible,.rb-topnav a:focus-visible,.rb-tabbar a:focus-visible,.rb-opt:focus-visible,.rb-crumb button:focus-visible{outline:3px solid var(--rb-focus);outline-offset:2px}
.rb-row:focus-visible{outline:3px solid var(--rb-focus);outline-offset:-3px}
.rb-btn.primary{border-color:transparent;background:var(--rb-acc-grad);color:var(--rb-on-acc);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.18)}
@media (hover: hover){.rb-btn.primary:hover{filter:brightness(1.1);background:var(--rb-acc-grad)}}
.rb-btn.ghost{border-color:transparent;background:transparent;color:var(--rb-sub)}
@media (hover: hover){.rb-btn.ghost:hover{background:var(--rb-hover);color:var(--rb-text);border-color:transparent}}
.rb-btn.danger{border-color:transparent;background:var(--rb-danger-soft);color:var(--rb-danger);font-weight:600}
@media (hover: hover){.rb-btn.danger:hover{background:var(--rb-danger-soft);filter:brightness(.95);border-color:var(--rb-danger)}}
.rb-btn.lg{height:calc(var(--rb-ctl) + 4px);padding:0 22px;font-size:15px}
.rb-btn.sm{height:var(--rb-ctl-sm);padding:0 12px;border-radius:var(--rb-r1);font-size:13px}
.rb-btn[disabled]{opacity:.5;cursor:not-allowed;filter:none}
.rb-icon-btn{width:var(--rb-ctl);height:var(--rb-ctl);display:inline-flex;align-items:center;justify-content:center;border-radius:var(--rb-r2);border:0;background:transparent;color:var(--rb-sub);cursor:pointer;flex-shrink:0;transition:background .15s,color .15s,transform .08s}
@media (hover: hover){.rb-icon-btn:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-icon-btn.boxed{border:var(--rb-bw,1px) solid var(--rb-line3);background:var(--rb-surf)}

/* 본문: 왼쪽 메뉴(선택) · 본문 열 · 오른쪽 상세 */
.rb-body{flex:1;display:flex;min-height:0}
.rb-col{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0}
.rb-nav{width:208px;flex-shrink:0;padding:14px 10px;display:flex;flex-direction:column;gap:4px;border-right:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-win);overflow:auto}
.rb-nav a{height:calc(var(--rb-ctl) + 2px);display:flex;align-items:center;gap:12px;padding:0 12px;border-radius:var(--rb-r2);color:var(--rb-sub);text-decoration:none;font-size:14px;font-weight:500;cursor:pointer}
@media (hover: hover){.rb-nav a:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-nav a[aria-current=page]{background:var(--rb-surf);color:var(--rb-text);font-weight:700;box-shadow:var(--rb-shadow-card),inset 3px 0 0 var(--rb-acc-text)}
.rb-nav a[aria-current=page] svg{color:var(--rb-acc-text)}
.rb-nav a span{flex:1}.rb-nav a small{font-size:12px;color:var(--rb-sub)}
.rb-nav-card{padding:14px;border-radius:var(--rb-r3);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line);display:flex;flex-direction:column;gap:6px}
.rb-nav-hint{padding:12px 4px 0;font-size:12px;color:var(--rb-mute);line-height:1.5}
.rb-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
.rb-detail{width:380px;flex-shrink:0;border-left:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-win);padding:20px;display:flex;flex-direction:column;gap:18px}

/* 메뉴 위치: 왼쪽(기본) · 위쪽 */
.rb-lay-left .rb-topnav,.rb-lay-top .rb-nav{display:none}
.rb-nav-lab{padding:14px 12px 4px;font-size:11.5px;font-weight:700;letter-spacing:.04em;color:var(--rb-mute)}
.rb-nav-lab:first-child{padding-top:2px}
.rb-topsep{flex-shrink:0;width:1px;align-self:center;height:20px;background:var(--rb-line3);margin:0 4px}
.rb-win .rb-topnav{gap:0;padding-left:12px;padding-right:12px}
.rb-win .rb-topnav a{padding:0 10px;gap:6px}
.rb-topnav .rb-layseg{margin-left:auto;flex-shrink:0;align-self:center;position:sticky;right:0;box-shadow:-14px 0 10px -2px var(--rb-surf)}
.rb-layseg{display:inline-flex;border:var(--rb-bw,1px) solid var(--rb-line3);border-radius:999px;overflow:hidden;background:var(--rb-surf)}
.rb-layseg button{height:30px;padding:0 12px;border:0;background:transparent;color:var(--rb-sub);font-size:12.5px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit}
.rb-layseg button[aria-pressed=true]{background:var(--rb-text);color:var(--rb-win);font-weight:700}
.rb-nav .rb-layseg{margin:12px 4px 0;align-self:flex-start}
.rb-morenav{display:none}
/* 1.7.0 공용 부품: 머리 · 상태 카드 · 동작 줄 · 고급 · 시트 · 작은 창 */
.rb-phead{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:4px 0 2px}
.rb-phead .t{flex:1;min-width:160px;display:flex;flex-direction:column;gap:2px}
.rb-phead .sw{display:inline-flex;align-items:center;gap:10px;font-size:13.5px;font-weight:600;color:var(--rb-sub)}
.rb-status{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:var(--rb-r3);border:var(--rb-bw,1px) solid var(--rb-line);background:var(--rb-surf);box-shadow:var(--rb-shadow-card)}
.rb-status .dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;background:var(--rb-grip)}
.rb-status .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:13.5px;color:var(--rb-sub)}
.rb-status .t b{font-size:15px;color:var(--rb-text)}
.rb-status.k-on .dot{background:var(--rb-ok)}.rb-status.k-on .t b{color:var(--rb-ok)}
.rb-status.k-prep{background:var(--rb-warn-soft)}.rb-status.k-prep .dot{background:var(--rb-warn)}.rb-status.k-prep .t b{color:var(--rb-warn)}
.rb-status.k-err{background:var(--rb-danger-soft)}.rb-status.k-err .dot{background:var(--rb-danger)}.rb-status.k-err .t b{color:var(--rb-danger)}
.rb-actions{display:flex;gap:10px;flex-wrap:wrap}
.rb-actions .rb-btn{flex:1 1 auto;min-height:44px;justify-content:center}
.rb-adv{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:var(--rb-r3);border:var(--rb-bw,1px) dashed var(--rb-line3);background:transparent}
.rb-advlink{align-self:flex-start;display:inline-flex;align-items:center;gap:4px;border:0;background:none;color:var(--rb-mute);font-size:13px;cursor:pointer;padding:8px 2px;font-family:inherit;text-decoration:underline;text-underline-offset:3px}
.rb-bsheet-back{position:absolute;inset:0;z-index:60;background:rgba(10,9,8,.45);display:flex;align-items:flex-end}
.rb-bsheet{width:100%;max-height:82%;background:var(--rb-win);border-radius:var(--rb-r4) var(--rb-r4) 0 0;box-shadow:var(--rb-shadow);display:flex;flex-direction:column;animation:rb-bs-up .22s ease-out}
.rb-bsheet .grab{width:40px;height:4px;border-radius:4px;background:var(--rb-line3);margin:8px auto 0}
.rb-bsheet .hd{display:flex;align-items:center;justify-content:space-between;padding:8px 16px 4px;gap:8px}
.rb-bsheet .bd{padding:8px 16px 20px;overflow:auto;display:flex;flex-direction:column;gap:14px}
@keyframes rb-bs-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
.rb-pop{position:absolute;z-index:60;max-width:calc(100% - 16px);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line);border-radius:var(--rb-r3);box-shadow:var(--rb-shadow-sm);display:flex;flex-direction:column;max-height:70%}
.rb-pop .hd{padding:12px 16px 0}.rb-pop .bd{padding:12px 16px 16px;overflow:auto;display:flex;flex-direction:column;gap:12px}
.rb-interim{display:flex;flex-direction:column;gap:14px;padding:18px 22px 28px;max-width:720px}
.rb-mem2{display:flex;flex-direction:column;gap:14px;padding:18px 22px 28px;min-height:0}
.rb-mem2-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start;max-width:760px}
.rb-mem2-main,.rb-mem2-side{display:flex;flex-direction:column;gap:14px;min-width:0}
.rb-mem2-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.rb-mem2-head .rb-h2{margin:0}
.rb-mbar{display:flex;height:14px;border-radius:999px;overflow:hidden;background:var(--rb-line2);gap:2px}
.rb-mbar i,.rb-mbar-legend i{background:var(--rb-grip)}
.rb-mbar i.u-used,.rb-mbar-legend i.u-used{background:var(--rb-ok)}
.rb-mbar i.u-digested,.rb-mbar-legend i.u-digested{background:var(--rb-acc-a)}
.rb-mbar i.u-unrelated,.rb-mbar-legend i.u-unrelated{background:var(--rb-grip)}
.rb-mbar i.u-budget,.rb-mbar-legend i.u-budget{background:var(--rb-warn)}
.rb-mbar-legend{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--rb-sub)}
.rb-mbar-legend li{display:inline-flex;align-items:center;gap:6px}.rb-mbar-legend i{width:10px;height:10px;border-radius:50%;display:inline-block}
.rb-mem-usage,.rb-mem-recentbox{display:flex;flex-direction:column;gap:10px;padding:14px 16px}
.rb-mem-rechead{display:flex;align-items:center;justify-content:space-between}
.rb-mbots{gap:8px}.rb-mbot{display:flex;align-items:center;gap:10px;padding:8px 12px}
.rb-mbot-open{flex:1;min-width:0;display:flex;align-items:center;gap:12px;text-align:left;background:none;border:0;padding:4px 0;color:inherit;cursor:pointer}
.rb-mbot-open .txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.rb-mbot-open .name{font-weight:600;display:flex;gap:6px;align-items:center}.rb-mbot-open .meta{font-size:12px;color:var(--rb-mute)}
.rb-danger-zone h3{color:var(--rb-danger)}
.rb-pot-chars{display:flex;flex-direction:column;gap:10px;padding:14px 16px}
.rb-pot-charlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.rb-pot-charrow{display:flex;align-items:center;gap:12px;padding:6px 0}.rb-pot-charrow .n{flex:1;min-width:0;font-weight:600}
.rb-conflict{display:flex;flex-direction:column;gap:8px}
.rb-psec{display:flex;flex-direction:column;gap:8px;padding:14px 16px}.rb-psec h4{margin:0;font-size:15px}.rb-psec p{margin:0}
.rb-pcard .rb-mem-meter{grid-template-columns:48px 1fr auto}
.rb-ppl{display:flex;flex-direction:column;gap:14px;max-width:760px}
.rb-ppl.wide{display:grid;grid-template-columns:380px minmax(0,1fr);gap:20px;max-width:none;align-items:start}
.rb-ppl-left,.rb-ppl-right,.rb-ppl-list,.rb-pdetail{display:flex;flex-direction:column;gap:12px;min-width:0}
.rb-pcard{display:flex;align-items:flex-start;gap:12px;text-align:left;padding:12px 14px;border-radius:var(--rb-r3);border:var(--rb-bw,1px) solid var(--rb-line);background:var(--rb-surf);color:inherit;cursor:pointer;box-shadow:var(--rb-shadow-card)}
.rb-pcard.is-active{border-color:var(--rb-acc-a);background:var(--rb-acc-soft)}
.rb-pcard .txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.rb-pcard .name{font-weight:700;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.rb-pcard .meta{font-size:12.5px;color:var(--rb-sub);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

@media (min-width:1000px){.rb-mem2-grid.has-adv{max-width:none;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}}

.rb-topnav{flex-shrink:0;display:flex;gap:6px;padding:10px 16px;overflow-x:auto;scrollbar-width:thin;background:var(--rb-surf);border-bottom:var(--rb-bw,1px) solid var(--rb-line2)}
.rb-topnav a{height:var(--rb-ctl);display:inline-flex;align-items:center;gap:8px;padding:0 14px;border-radius:999px;color:var(--rb-sub);text-decoration:none;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;flex-shrink:0;border:var(--rb-bw,1px) solid transparent}
@media (hover: hover){.rb-topnav a:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-topnav a[aria-current=page]{background:var(--rb-acc-soft);color:var(--rb-text);font-weight:700;border-color:var(--rb-sel-ring)}
.rb-topnav a[aria-current=page] svg{color:var(--rb-acc-text)}
.rb-topnav a small{font-size:12px;color:var(--rb-sub)}
.rb-topnav a[hidden],.rb-nav a[hidden]{display:none !important}

/* 탭마다 맨 위 줄: 위치(홈 › 탭) + 한 줄 설명 + 검색 + 도움말 */
.rb-pagehead{flex-shrink:0;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:16px 22px 10px;position:relative}
.rb-is-home .rb-pagehead{display:none}
.rb-ph-text{flex:1;min-width:220px;display:flex;flex-direction:column;gap:3px}
.rb-crumb{display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:13px;color:var(--rb-sub)}
.rb-crumb button{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:0;border-radius:var(--rb-r1);background:transparent;color:var(--rb-sub);font-size:13px;font-weight:500;cursor:pointer}
@media (hover: hover){.rb-crumb button:hover{background:var(--rb-hover);color:var(--rb-text)}}
.rb-crumb button.cur{color:var(--rb-text);font-weight:700;font-size:15px}
.rb-crumb .sep{color:var(--rb-grip);display:flex}
.rb-ph-desc{font-size:13px;color:var(--rb-sub);line-height:1.5;padding-left:2px;word-break:keep-all}
.rb-ph-tools{display:flex;align-items:center;gap:8px;flex:0 1 auto}
.rb-ph-tools .rb-search{width:300px;max-width:100%;flex:0 1 300px}
.rb-nosearch .rb-ph-tools .rb-search{display:none}
.rb-help{position:absolute;right:22px;top:calc(100% - 4px);z-index:35;width:min(380px,calc(100% - 32px));padding:18px;border-radius:var(--rb-r3);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line3);box-shadow:var(--rb-shadow-sm);display:flex;flex-direction:column;gap:10px;animation:rb-pop .13s ease-out;transform-origin:top right}
.rb-help h3{margin:0;font-size:15px;display:flex;align-items:center;gap:8px}.rb-help h3 svg{color:var(--rb-acc-text)}
.rb-help ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--rb-sub);line-height:1.55}
.rb-help li{display:flex;gap:8px;word-break:keep-all}.rb-help li::before{content:"";flex-shrink:0;width:6px;height:6px;border-radius:99px;background:var(--rb-acc-text);margin-top:8px}

/* 홈 카드 */
.rb-home{flex:1;overflow:auto;padding:30px 30px 40px;display:flex;flex-direction:column;gap:28px;width:100%;max-width:1180px;margin:0 auto}
.rb-home-hero{display:flex;flex-direction:column;gap:6px}
.rb-home-hero h1{margin:0;font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.25}
.rb-home-hero p{margin:0;color:var(--rb-sub);font-size:14.5px;word-break:keep-all}
.rb-home-sec{display:flex;flex-direction:column;gap:12px}
.rb-home-sec>h2{margin:0;font-size:12.5px;font-weight:700;color:var(--rb-sub);letter-spacing:.02em}
.rb-home-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.rb-home-grid.sm{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
.rb-hcard{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:20px;border-radius:var(--rb-r3);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line2);box-shadow:var(--rb-shadow-card);text-align:left;cursor:pointer;color:inherit;min-height:160px;transition:transform .14s,border-color .15s,box-shadow .15s}
@media (hover: hover){.rb-hcard:hover{transform:translateY(-2px);border-color:var(--rb-sel-ring);box-shadow:var(--rb-shadow-sm)}}
.rb-hcard:active{transform:translateY(0)}
.rb-hcard .ico{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:var(--rb-acc-soft);color:var(--rb-acc-text);flex-shrink:0}
.rb-hcard b{font-size:17px;font-weight:700;letter-spacing:-.01em}
.rb-hcard small{font-size:13px;color:var(--rb-sub);line-height:1.5;word-break:keep-all}
.rb-hcard .t{display:flex;flex-direction:column;gap:5px;min-width:0}
.rb-hcard .cnt{position:absolute;top:18px;right:18px;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--rb-surf2);color:var(--rb-sub)}
.rb-hcard.main{background:var(--rb-acc-grad);color:var(--rb-on-acc);border-color:transparent}
.rb-hcard.main .ico{background:rgba(255,255,255,.22);color:var(--rb-on-acc)}
.rb-hcard.main small{color:var(--rb-on-acc);opacity:.92}
.rb-hcard.mini{min-height:0;flex-direction:row;align-items:center;gap:14px;padding:14px 16px}
.rb-hcard.mini .ico{width:40px;height:40px;border-radius:12px}
.rb-hcard.mini .t{display:flex;flex-direction:column;gap:2px;min-width:0}
.rb-hcard.mini b{font-size:15px}
.rb-home-foot{display:flex;gap:10px;flex-wrap:wrap;align-items:center;color:var(--rb-mute);font-size:12.5px}

/* 오른쪽 설명 패널 · 번호 안내 */
.rb-twocol{flex:1;display:flex;align-items:flex-start;gap:8px;container-type:inline-size}
.rb-guide{width:300px;flex-shrink:0;margin:20px 22px 20px 0;padding:18px;border-radius:var(--rb-r3);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line2);box-shadow:var(--rb-shadow-card);display:flex;flex-direction:column;gap:12px;position:sticky;top:20px}
.rb-guide-h{display:flex;align-items:center;gap:8px;color:var(--rb-acc-text)}.rb-guide-h b{font-size:15px;color:var(--rb-text)}
.rb-guide-list{display:flex;flex-direction:column;gap:6px}
.rb-guide-row{display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;text-align:left;padding:10px 12px;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-win);cursor:pointer;color:var(--rb-text)}
@media (hover: hover){.rb-guide-row:hover{border-color:var(--rb-sel-ring);background:var(--rb-hover)}}
.rb-guide-row:focus-visible{outline:3px solid var(--rb-focus);outline-offset:2px}
.rb-guide-row .q{flex:1 1 100%;font-size:13px;font-weight:600;line-height:1.4;word-break:keep-all}
.rb-guide-row small{flex:1;font-size:12px;color:var(--rb-acc-text);font-weight:600}
.rb-guide-row .go{color:var(--rb-mute);display:flex}
@container (max-width:900px){.rb-guide{display:none}}
.rb-steps{text-align:left;max-width:440px;margin:6px auto 0;display:flex;flex-direction:column;gap:10px}
.rb-steps ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.rb-steps li{display:flex;gap:12px;align-items:flex-start;font-size:13px;color:var(--rb-sub);line-height:1.55;word-break:keep-all}
.rb-steps li i{flex-shrink:0;width:24px;height:24px;border-radius:99px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:800}
.rb-mem-empty{display:flex;flex-direction:column;align-items:center;gap:10px;margin:auto}

/* 칩·배지 */
.rb-chips{display:flex;align-items:center;gap:8px;padding:12px 22px 10px;flex-wrap:wrap}
.rb-chips.rb-fchips{padding-top:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin}
.rb-chips.rb-fchips .rb-chip{flex-shrink:0}
.rb-chip{height:var(--rb-ctl-sm);padding:0 14px;border-radius:999px;border:var(--rb-bw,1px) solid var(--rb-line3);background:var(--rb-surf);color:var(--rb-sub);font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
@media (hover: hover){.rb-chip:hover{color:var(--rb-text);border-color:var(--rb-grip)}}
.rb-chip[aria-pressed=true]{border-color:var(--rb-sel-ring);background:var(--rb-acc-soft);color:var(--rb-text);font-weight:700}
.rb-chip small{opacity:.75;font-size:inherit}
.rb-traybtn{height:var(--rb-ctl-sm);padding:0 10px 0 12px;border-radius:999px;border:var(--rb-bw,1px) solid var(--rb-line3);background:var(--rb-surf);color:var(--rb-sub);font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;transition:background .15s,border-color .15s,color .15s}
@media (hover: hover){.rb-traybtn:hover{color:var(--rb-text);border-color:var(--rb-grip)}}
.rb-traybtn b{font-weight:600;color:var(--rb-text)}
.rb-traybtn.on{border-color:var(--rb-sel-ring);background:var(--rb-acc-soft)}
.rb-traybtn[aria-expanded=true]{border-color:var(--rb-sel-ring);color:var(--rb-text)}
.rb-traybtn .chev{display:flex;transition:transform .18s}
.rb-traybtn[aria-expanded=true] .chev{transform:rotate(180deg)}
.rb-tray{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0 22px 12px;animation:rb-expand .18s ease-out;transform-origin:top}
.rb-tray .rb-chip{flex-shrink:0}
.rb-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:600;border-radius:999px;padding:2px 9px;white-space:nowrap;flex-shrink:0}
.k-acc{color:var(--rb-acc-text);background:var(--rb-acc-soft)}.k-acc2{color:var(--rb-acc2-text);background:var(--rb-acc2-soft)}
.k-warn{color:var(--rb-warn);background:var(--rb-warn-soft)}.k-ok{color:var(--rb-teal);background:var(--rb-teal-soft)}
.k-danger{color:var(--rb-rose);background:var(--rb-rose-soft)}.k-mute{color:var(--rb-sub);background:var(--rb-surf2)}

/* 목록 줄: 둥근 카드 줄 (어디를 잡아도 끌 수 있어요) */
.rb-list{flex:1;padding:4px 22px 22px;display:flex;flex-direction:column;gap:8px}
.rb-row{display:flex;align-items:center;gap:12px;padding:var(--rb-row-py) 16px;border-radius:var(--rb-r3);cursor:pointer;border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf);box-shadow:var(--rb-shadow-card);text-align:left;width:100%;color:inherit;transition:background .15s,box-shadow .15s,opacity .15s,border-color .15s}
@media (hover: hover){.rb-row:hover{border-color:var(--rb-line3);background:var(--rb-surf);box-shadow:var(--rb-shadow-sm)}}
.rb-row[aria-selected=true]{background:linear-gradient(var(--rb-sel-bg),var(--rb-sel-bg)),var(--rb-surf);border-color:var(--rb-sel-ring);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-row .grip{color:var(--rb-grip);cursor:grab;flex-shrink:0;display:flex}
.rb-row .txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.rb-row .ttl{display:flex;align-items:center;gap:8px;min-width:0}
.rb-row .name{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-row .meta{font-size:12px;color:var(--rb-mute)}
.rb-row.off{background:transparent;box-shadow:none}
.rb-row.off .name{color:var(--rb-mute)}
.rb-row{-webkit-touch-callout:none}
.rb-mcb{display:none;flex-shrink:0;width:22px;height:22px;border-radius:7px;border:2px solid var(--rb-grip);align-items:center;justify-content:center;cursor:pointer;color:var(--rb-on-acc);margin:-4px -2px}
.rb-mcb::after{content:'';width:10px;height:6px;border:2.5px solid currentColor;border-top:0;border-right:0;transform:rotate(-45deg) translate(1px,-1px);opacity:0}
.picking .rb-mcb{display:flex}
.picking .rb-row{user-select:none;-webkit-user-select:none}
.rb-row.picked{background:linear-gradient(var(--rb-acc-soft),var(--rb-acc-soft)),var(--rb-surf);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}
.rb-row.picked .rb-mcb{background:var(--rb-acc-grad);border-color:transparent}
.rb-row.picked .rb-mcb::after{opacity:1}
.rb-pickbar{display:flex;flex-shrink:0;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 10px;margin:0 22px 6px;border-radius:var(--rb-r2);background:var(--rb-sel-bg);border:var(--rb-bw,1px) solid var(--rb-sel-ring)}
.rb-pickbar b{font-size:13px;margin-right:auto}
.rb-pickbar[hidden]{display:none}
.rb-folder{height:calc(var(--rb-ctl) - 2px);display:flex;align-items:center;gap:10px;padding:0 12px;margin-top:6px;border:0;border-radius:var(--rb-r2);background:transparent;color:var(--rb-text);cursor:pointer;text-align:left;width:100%}
@media (hover: hover){.rb-folder:hover{background:var(--rb-hover)}}
.rb-folder .chev{color:var(--rb-sub);transition:transform .15s;display:flex}
.rb-folder[aria-expanded=true] .chev{transform:rotate(90deg)}
.rb-folder b{font-size:13px;font-weight:700}.rb-folder small{font-size:12px;color:var(--rb-mute)}
.rb-folder-body{display:flex;flex-direction:column;gap:8px;padding-left:14px;margin-left:16px;box-shadow:inset 2px 0 0 var(--rb-line2)}

/* 스위치: 색 + 글자(켜짐/꺼짐)로 상태를 알려 줘요 */
.rb-switch{position:relative;flex-shrink:0;width:66px;height:30px;border-radius:999px;border:var(--rb-bw,1px) solid var(--rb-line3);padding:0;cursor:pointer;background:var(--rb-track-off);transition:background .15s,border-color .15s;display:inline-block}
.rb-switch>span{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:999px;background:var(--rb-knob-off);box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .16s cubic-bezier(.2,.7,.2,1)}
.rb-switch::after{content:"꺼짐";position:absolute;right:9px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:700;color:var(--rb-off-text,var(--rb-text));pointer-events:none;line-height:1}
.rb-switch[aria-checked=true]{background:var(--rb-acc-grad);border-color:transparent}
.rb-switch[aria-checked=true]>span{background:var(--rb-knob-on);transform:translateX(36px)}
.rb-switch[aria-checked=true]::after{content:"켜짐";right:auto;left:10px;color:var(--rb-on-acc)}
.rb-switch[disabled]{opacity:.5;cursor:not-allowed}

/* 카드·필드 */
.rb-card{border-radius:var(--rb-r3);background:var(--rb-surf);overflow:hidden}
.rb-card.pad{padding:18px}
.rb-card.bordered{border:var(--rb-bw,1px) solid var(--rb-line2);box-shadow:var(--rb-shadow-card)}
.rb-kv{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--rb-line2);font-size:13px}
.rb-kv:last-child{border-bottom:0}.rb-kv>span:first-child{flex:1}.rb-kv>span:last-child{font-size:12px;color:var(--rb-sub)}
.rb-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.rb-stat{padding:12px 14px;border-radius:var(--rb-r2);background:var(--rb-surf)}
.rb-stat small{display:block;font-size:11px;color:var(--rb-sub)}.rb-stat b{display:block;font-size:18px;font-weight:600;margin-top:2px}
.rb-label{font-size:12px;font-weight:700;color:var(--rb-sub)}
.rb-h2{margin:0;font-size:20px;font-weight:700;line-height:1.35;letter-spacing:-.01em}
.rb-h3{margin:0;font-size:16px;font-weight:600}
.rb-p{margin:0;font-size:13px;color:var(--rb-sub);line-height:1.6}
.rb-muted{font-size:12px;color:var(--rb-mute);line-height:1.5}
.rb-input{height:calc(var(--rb-ctl) + 2px);width:100%;padding:0 14px;border-radius:var(--rb-r2);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line3);color:var(--rb-text);font-size:14px;outline:none}
.rb-input:focus{border-color:var(--rb-sel-ring);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-field{display:flex;flex-direction:column;gap:6px}
.rb-seg{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);padding:4px;border-radius:var(--rb-r2);background:var(--rb-surf2);border:var(--rb-bw,1px) solid var(--rb-line2)}
.rb-seg button{height:calc(var(--rb-ctl) - 6px);border:0;border-radius:var(--rb-r1);background:transparent;color:var(--rb-sub);font-size:13px;cursor:pointer}
@media (hover: hover){.rb-seg button:hover{color:var(--rb-text)}}
.rb-seg-nowrap .rb-seg button{white-space:nowrap;padding:0 10px}
.rb-seg button[aria-checked=true]{background:var(--rb-surf);color:var(--rb-text);font-weight:700;box-shadow:var(--rb-shadow-card),inset 0 0 0 1px var(--rb-line3)}
.rb-empty{padding:44px 20px;text-align:center;color:var(--rb-mute);font-size:13px;line-height:1.7}.rb-empty-card{display:flex;flex-direction:column;align-items:center;gap:8px;max-width:420px;margin:0 auto}.rb-empty-card .ico{width:56px;height:56px;border-radius:18px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center}.rb-empty-card b{font-size:16px;color:var(--rb-text)}.rb-empty-card p{margin:0;word-break:keep-all}.rb-tour-card{position:absolute;z-index:80;width:min(340px,calc(100% - 24px));display:flex;flex-direction:column;gap:12px;padding:18px 18px 16px;border-radius:var(--rb-r4);background:var(--rb-win);border:var(--rb-bw,1px) solid var(--rb-line3);box-shadow:var(--rb-shadow);animation:rb-in .15s ease-out}
.rb-tour-card.center{left:50%;top:50%;transform:translate(-50%,-50%);width:min(400px,calc(100% - 24px))}
.rb-tour-card .head{display:flex;align-items:center;gap:10px}
.rb-tour-card .ico{width:40px;height:40px;border-radius:13px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex:none}
.rb-tour-card h2{margin:0;font-size:17px}
.rb-tour-card p{margin:0;font-size:14px;line-height:1.7;word-break:keep-all;color:var(--rb-mute)}
.rb-tour-card .dots{display:flex;gap:6px}
.rb-tour-card .dots i{width:7px;height:7px;border-radius:4px;background:var(--rb-line3);transition:width .18s}
.rb-tour-card .dots i.on{background:var(--rb-acc-text);width:20px}
.rb-tour-card .acts{display:flex;gap:8px;width:100%;justify-content:space-between;align-items:center}
.rb-tour-card .acts .r{display:flex;gap:8px}
.rb-tour-hl{position:relative;z-index:60;outline:3px solid var(--rb-acc-text);outline-offset:3px;border-radius:var(--rb-r3);animation:rb-tour-pulse 1.4s ease-in-out infinite}
@keyframes rb-tour-pulse{0%,100%{box-shadow:0 0 0 0 var(--rb-acc-soft)}50%{box-shadow:0 0 0 10px var(--rb-acc-soft)}}
.rb-tour{align-items:center;text-align:center;gap:10px}.rb-tour .ico{width:68px;height:68px;border-radius:22px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center}.rb-tour h2{margin:6px 0 0;font-size:19px}.rb-tour p{margin:0;font-size:14px;line-height:1.7;word-break:keep-all;color:var(--rb-mute)}.rb-tour .dots{display:flex;gap:6px;margin:6px 0}.rb-tour .dots i{width:7px;height:7px;border-radius:4px;background:var(--rb-line3);transition:width .18s}.rb-tour .dots i.on{background:var(--rb-acc-text);width:20px}.rb-tour .acts{display:flex;gap:8px;width:100%;justify-content:space-between;align-items:center}.rb-tour .acts .r{display:flex;gap:8px}.rb-tip{position:fixed;z-index:99999;max-width:260px;padding:7px 11px;border-radius:10px;background:var(--rb-text);color:var(--rb-win);font-size:12.5px;line-height:1.5;pointer-events:none;box-shadow:0 6px 20px rgba(0,0,0,.25);word-break:keep-all}.rb-empty-card .acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px}
.rb-section{padding:20px 22px;display:flex;flex-direction:column;gap:20px}
.rb-section.rb-scroll>*{flex-shrink:0}

/* 진행 · 알림 */
.rb-progress{height:8px;border-radius:999px;background:var(--rb-track-off);overflow:hidden}
.rb-progress>i{display:block;height:100%;width:0;border-radius:999px;background:var(--rb-deco-grad);transition:width .2s}
.rb-note{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:var(--rb-r2);font-size:13px;line-height:1.6}
.rb-note.warn{background:var(--rb-warn-soft);color:var(--rb-text);box-shadow:inset 0 0 0 1px var(--rb-warn)}
.rb-note.warn svg{color:var(--rb-warn);flex-shrink:0}
.rb-note.info{background:var(--rb-surf2);color:var(--rb-sub)}
.rb-note.info svg{color:var(--rb-acc-text);flex-shrink:0}
.rb-note.err{background:var(--rb-danger-soft);box-shadow:inset 0 0 0 1px var(--rb-danger)}
.rb-note.err svg{color:var(--rb-danger);flex-shrink:0}
.rb-toasts{position:absolute;left:20px;bottom:20px;display:flex;flex-direction:column;gap:8px;z-index:30;pointer-events:none}
.rb-toast{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:12px 14px 12px 16px;border-radius:var(--rb-r3);background:var(--rb-toast);border:var(--rb-bw,1px) solid var(--rb-line3);box-shadow:var(--rb-shadow-sm);font-size:13px;animation:rb-in .18s ease-out}
.rb-toast svg{flex-shrink:0;color:var(--rb-ok)}.rb-toast.err svg{color:var(--rb-danger)}
.rb-toast .act{height:32px;padding:0 12px;border-radius:var(--rb-r1);border:0;background:var(--rb-acc-soft);color:var(--rb-acc-text);font-size:13px;font-weight:600;cursor:pointer}
.rb-drop{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:var(--rb-backdrop);border-radius:var(--rb-r4)}
.rb-drop>div{display:flex;align-items:center;gap:12px;padding:28px 36px;border-radius:var(--rb-r4);border:2px dashed var(--rb-sel-ring);background:var(--rb-win);color:var(--rb-acc-text);font-size:15px;font-weight:600}
@keyframes rb-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes rb-fade{from{opacity:0}to{opacity:1}}
@keyframes rb-pop{from{opacity:0;transform:scale(.96) translateY(-4px)}to{opacity:1;transform:none}}
@keyframes rb-rot{to{transform:rotate(360deg)}}
@keyframes rb-shimmer{from{background-position:100% 0}to{background-position:-100% 0}}
@keyframes rb-flash{from{background:var(--rb-acc-soft);box-shadow:inset 0 0 0 1px var(--rb-sel-ring)}}
@keyframes rb-expand{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}

/* 움직임: 로딩 · 강조 */
.rb-loading{display:flex;flex-direction:column;gap:8px;padding:12px 22px;animation:rb-fade .2s ease-out .12s both}
.rb-skel-row{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:var(--rb-r3);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line2);animation:rb-in .25s ease-out var(--d,0ms) both}
.rb-skel{display:block;border-radius:8px;background:linear-gradient(90deg,var(--rb-surf2) 25%,var(--rb-hover) 50%,var(--rb-surf2) 75%);background-size:200% 100%;animation:rb-shimmer 1.3s linear infinite}
.rb-loading-label{display:flex;align-items:center;justify-content:center;gap:8px;padding:16px 0 4px;color:var(--rb-mute);font-size:13px}
.rb-spin{display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid var(--rb-line3);border-top-color:var(--rb-acc-text);animation:rb-rot .7s linear infinite;vertical-align:-2px;flex-shrink:0}
.rb-row.just-moved{animation:rb-flash .7s ease-out}
.rb-folder-body.just-opened{animation:rb-expand .16s ease-out}
.rb-btn:active:not([disabled]),.rb-icon-btn:active:not([disabled]){transform:translateY(1px)}

/* 대화상자 · 시트 · 메뉴 */
.rb-modal{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--rb-backdrop);animation:rb-fade .15s ease-out}
.rb-dialog{width:100%;max-width:440px;border-radius:var(--rb-r4);background:var(--rb-win);border:var(--rb-bw,1px) solid var(--rb-line3);box-shadow:var(--rb-shadow);padding:24px;display:flex;flex-direction:column;gap:14px;animation:rb-in .15s ease-out}
.rb-dialog .btns{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.rb-menu{position:absolute;z-index:60;min-width:210px;padding:6px;border-radius:var(--rb-r3);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line3);box-shadow:var(--rb-shadow-sm);display:flex;flex-direction:column;animation:rb-pop .13s cubic-bezier(.2,.7,.2,1);transform-origin:top right}
.rb-menu button{height:var(--rb-ctl);display:flex;align-items:center;gap:10px;padding:0 12px;border:0;border-radius:var(--rb-r1);background:transparent;color:var(--rb-text);font-size:13px;cursor:pointer;text-align:left}
.rb-menu button:focus-visible{background:var(--rb-hover);outline:none}
.rb-menu button[aria-current=true]{background:var(--rb-acc-soft);font-weight:700}
@media (hover: hover){.rb-menu button:hover{background:var(--rb-hover)}}
.rb-menu button.danger{color:var(--rb-danger)}
.rb-menu hr{border:0;border-top:1px solid var(--rb-line2);margin:4px 0}
.rb-swatches{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rb-swatch{width:32px;height:32px;border-radius:999px;border:0;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.rb-swatch[aria-pressed=true]{box-shadow:0 0 0 2px var(--rb-win),0 0 0 4px var(--rb-text)}
.rb-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.rb-preset{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:10px;border-radius:var(--rb-r2);cursor:pointer;color:var(--rb-text);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line3);position:relative}
@media (hover: hover){.rb-preset:hover{border-color:var(--rb-grip)}}
.rb-preset[aria-pressed=true]{border-color:var(--rb-text);box-shadow:0 0 0 1px var(--rb-text)}
.rb-preset[aria-pressed=true]::after{content:"✓ 사용 중";position:absolute;top:16px;right:16px;font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,.62);padding:2px 8px;border-radius:999px}
.rb-preset i{display:block;width:100%;height:34px;border-radius:var(--rb-r1)}
.rb-color{display:flex;align-items:center;gap:10px;height:48px;padding:0 12px;border-radius:var(--rb-r2);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line3);cursor:pointer}
.rb-color input{width:28px;height:28px;border:0;padding:0;background:transparent;cursor:pointer}
.rb-color span{flex:1;font-size:13px}.rb-color small{font-size:12px;color:var(--rb-sub)}

/* 고르기 카드(설정): 그림 + 이름 + 한 줄 설명 */
.rb-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.rb-opt{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line3);background:var(--rb-surf);cursor:pointer;text-align:left;color:var(--rb-text);position:relative}
@media (hover: hover){.rb-opt:hover{border-color:var(--rb-grip)}}
.rb-opt[aria-checked=true]{border-color:var(--rb-text);box-shadow:0 0 0 1px var(--rb-text)}
.rb-opt[aria-checked=true]::after{content:"✓";position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:99px;background:var(--rb-text);color:var(--rb-win);display:grid;place-items:center;font-size:12px;font-weight:800}
.rb-opt b{font-size:14px}.rb-opt small{font-size:12px;color:var(--rb-sub);line-height:1.45;word-break:keep-all}
.rb-opt .pic{height:58px;border-radius:var(--rb-r1);background:var(--rb-surf2);border:1px solid var(--rb-line2);display:flex;gap:4px;padding:6px;overflow:hidden}
.rb-opt .pic i{display:block;border-radius:4px;background:var(--rb-line3)}
.rb-opt .pic i.a{background:var(--rb-acc-a)}
.rb-toggle{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:var(--rb-r2);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line2)}
.rb-toggle .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.rb-toggle b{font-size:14px}.rb-toggle small{font-size:12.5px;color:var(--rb-sub);line-height:1.5;word-break:keep-all}
.rb-fold{border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf)}
.rb-fold>summary{display:flex;align-items:center;gap:8px;min-height:var(--rb-ctl);padding:0 14px;cursor:pointer;font-size:13px;font-weight:600;color:var(--rb-sub);list-style:none}
.rb-fold>summary::-webkit-details-marker{display:none}
.rb-fold>summary::after{content:"▾";margin-left:auto}
.rb-fold[open]>summary::after{content:"▴"}
.rb-fold>div{padding:4px 14px 14px;display:flex;flex-direction:column;gap:10px}

/* 전체 화면 패널(에디터·에셋 관리자) */
.rb-full{position:absolute;inset:0;z-index:25;display:flex;flex-direction:column;background:var(--rb-win);animation:rb-in .15s ease-out}
.rb-full-head{min-height:60px;flex-shrink:0;display:flex;align-items:center;gap:10px;padding:8px 16px;background:var(--rb-surf);border-bottom:var(--rb-bw,1px) solid var(--rb-line2);flex-wrap:wrap}
.rb-full-head .ttl{flex:1;min-width:120px;display:flex;flex-direction:column}
.rb-full-head .ttl small{font-size:11px;color:var(--rb-sub)}.rb-full-head .ttl b{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-tabs{display:flex;gap:4px;padding:8px 16px 0;background:var(--rb-surf);border-bottom:var(--rb-bw,1px) solid var(--rb-line2);overflow-x:auto;flex-shrink:0}
.rb-tabs button{height:var(--rb-ctl);padding:0 14px;border:0;border-bottom:3px solid transparent;background:transparent;color:var(--rb-sub);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap}
.rb-tabs button[aria-selected=true]{color:var(--rb-text);border-bottom-color:var(--rb-acc-text);font-weight:600}
.rb-tabs button small{margin-left:6px;font-size:12px;opacity:.75}
.rb-split{flex:1;display:flex;min-height:0}
.rb-split>*{min-height:0}
.rb-scroll,.rb-split>.pane,.rb-side-list{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.rb-split>.side{width:320px;flex-shrink:0;border-right:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf);display:flex;flex-direction:column;min-height:0}
.rb-split>.pane{flex:1;min-width:0;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
.rb-side-tools{display:flex;gap:6px;padding:12px;border-bottom:1px solid var(--rb-line2);flex-wrap:wrap}
.rb-side-list{flex:1;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:2px}
.rb-item{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:var(--rb-r1);border:0;background:transparent;color:var(--rb-text);text-align:left;cursor:pointer;width:100%;font-size:13px}
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
.rb-textarea{width:100%;min-height:120px;padding:12px 14px;border-radius:var(--rb-r2);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line3);color:var(--rb-text);font:13px/1.6 ui-monospace,'JetBrains Mono',Consolas,'D2Coding',monospace;resize:vertical;outline:none;tab-size:4}
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
.rb-tile{position:relative;display:flex;flex-direction:column;border-radius:var(--rb-r2);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line2);box-shadow:var(--rb-shadow-card);overflow:hidden;cursor:pointer;text-align:left;padding:0;color:var(--rb-text)}
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

/* 모바일: 아래 탭 바(홈·모듈·캐릭터·기억·더보기), 상세는 시트 */
.rb-tabbar{display:none}
.rb-tabbar a[hidden]{display:none!important}
.rb-sheet-back{display:none}
.rb-sheet-head{display:none}
@media (max-width: 760px){
  .rb-root{padding:0}
  .rb-win{max-width:none;max-height:none;border-radius:0;border:0}
  .rb-brand small{display:none}
  .rb-head{padding:0 12px;gap:8px;height:56px}
  .rb-head .rb-btn .lbl{display:none}.rb-head .rb-btn{width:44px;padding:0}
  .rb-nav,.rb-topnav{display:none !important}
  .rb-in-more .rb-morenav{display:flex;gap:8px;padding:10px 16px 4px;overflow-x:auto;scrollbar-width:none;flex-shrink:0}
  .rb-morenav .rb-chip{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px}
  .rb-morenav .rb-chip[aria-pressed=true]{background:var(--rb-text);color:var(--rb-win);border-color:var(--rb-text)}
  .rb-interim{padding:12px 16px 24px}
  .rb-mem2{padding:12px 16px 24px}
  .rb-pagehead{padding:12px 16px 8px;gap:8px}
  .rb-ph-tools{width:100%}
  .rb-ph-tools .rb-search{width:auto;flex:1 1 auto;max-width:none;height:44px}
  .rb-help{right:12px;left:12px;width:auto}
  .rb-home{padding:18px 16px 28px;gap:22px}
  .rb-home-hero h1{font-size:24px}
  .rb-home-grid,.rb-home-grid.sm{grid-template-columns:1fr;gap:10px}
  .rb-hcard{min-height:0;padding:16px;gap:14px;flex-direction:row;align-items:center}
  .rb-hcard .ico{width:46px;height:46px}
  .rb-hcard b{font-size:16px}
  .rb-hcard .cnt{top:12px;right:12px}
  .rb-kbd{display:none}
  .rb-tabbar{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);height:68px;flex-shrink:0;border-top:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf)}
  .rb-tabbar a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-decoration:none;color:var(--rb-sub);font-size:11px;font-weight:500;cursor:pointer;position:relative}
  .rb-tabbar a[aria-current=page]{color:var(--rb-acc-text);font-weight:700}
  .rb-tabbar a[aria-current=page]::before{content:"";position:absolute;top:0;left:30%;right:30%;height:3px;border-radius:0 0 4px 4px;background:var(--rb-acc-text)}
  .rb-chips{flex-wrap:nowrap;overflow-x:auto;padding:12px 16px 8px}
  .rb-list{padding:4px 14px 18px}
  .rb-chip{flex-shrink:0}
  .rb-tray{flex-wrap:nowrap;overflow-x:auto;padding:0 16px 10px}
  .rb-detail{position:absolute;left:0;right:0;bottom:68px;width:auto;max-height:72%;border-left:0;border-radius:var(--rb-r4) var(--rb-r4) 0 0;background:var(--rb-win);box-shadow:var(--rb-shadow);z-index:20;overflow:auto;transform:translateY(105%);visibility:hidden;pointer-events:none;transition:transform .2s ease-out,visibility 0s linear .2s}
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
.rb-credits{display:flex;flex-direction:column;gap:12px;margin-top:0}
.rb-cr{position:relative;border-radius:20px;overflow:hidden;padding:22px;color:#f3ecff;box-shadow:0 14px 40px rgba(30,16,70,.35);opacity:0;transform:translateY(-12px) scale(.98);animation:rb-cr-in .6s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--rb-ci) * .1s);transition:transform .25s,box-shadow .25s}
.rb-cr[data-credit=pot]{background:linear-gradient(135deg,#1a1245 0%,#2e1f7a 48%,#5b34a8 100%)}
.rb-cr[data-credit=arcana]{background:linear-gradient(135deg,#3a0f3a 0%,#7a1f5c 48%,#c2477a 100%)}
.rb-cr[data-credit=bb]{background:linear-gradient(135deg,#0b2a30 0%,#12565a 48%,#2f9a8a 100%)}
@media (hover:hover){.rb-cr:hover{transform:translateY(-3px);box-shadow:0 20px 48px rgba(60,30,120,.45)}}
.rb-cr-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.rb-cr-glow{position:absolute;width:260px;height:260px;right:-60px;top:-90px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.28),transparent 65%);animation:rb-cr-drift 7s ease-in-out infinite}
.rb-cr[data-credit=pot] .rb-cr-glow{background:radial-gradient(circle,rgba(150,170,255,.45),transparent 65%)}
.rb-cr[data-credit=arcana] .rb-cr-glow{background:radial-gradient(circle,rgba(255,190,120,.45),transparent 65%)}
.rb-cr[data-credit=bb] .rb-cr-glow{background:radial-gradient(circle,rgba(120,240,200,.4),transparent 65%)}
.rb-cr-shine{position:absolute;top:0;bottom:0;width:38%;left:-45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.14),transparent);transform:skewX(-18deg);animation:rb-cr-shine 5.5s ease-in-out infinite;animation-delay:calc(var(--rb-ci) * 1.2s)}
.rb-cr-star{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 8px 2px rgba(255,255,255,.7);opacity:.2;animation:rb-cr-twinkle 3s ease-in-out infinite}
.rb-cr-body{position:relative;display:flex;gap:18px;align-items:flex-start}
.rb-cr-emoji{font-size:46px;line-height:1;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35));animation:rb-bob 3.2s ease-in-out infinite;animation-delay:calc(var(--rb-ci) * -.8s)}
.rb-cr-txt{display:flex;flex-direction:column;gap:5px;min-width:0}
.rb-cr-kicker{font-size:11px;font-weight:800;letter-spacing:.18em;color:rgba(255,255,255,.62)}
.rb-cr-title{font-size:24px;font-weight:800;letter-spacing:-.01em;background:linear-gradient(90deg,#fff,#d9c8ff,#fff);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:rb-cr-text 6s linear infinite}
.rb-cr[data-credit=arcana] .rb-cr-title{background-image:linear-gradient(90deg,#fff,#ffd6a8,#fff)}
.rb-cr[data-credit=bb] .rb-cr-title{background-image:linear-gradient(90deg,#fff,#b8f5e4,#fff)}
.rb-cr-desc{font-size:13.5px;line-height:1.7;color:rgba(255,255,255,.82);word-break:keep-all}
.rb-cr-link{align-self:flex-start;margin-top:6px;font-size:12.5px;font-weight:700;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);color:#fff;text-decoration:none;backdrop-filter:blur(4px);transition:background .2s,transform .15s}
.rb-cr-link:hover{background:rgba(255,255,255,.28);transform:translateX(2px)}
@keyframes rb-cr-in{to{opacity:1;transform:none}}
@keyframes rb-cr-drift{0%,100%{transform:translate(0,0)}50%{transform:translate(-26px,18px)}}
@keyframes rb-cr-shine{0%,55%{left:-45%}100%{left:130%}}
@keyframes rb-cr-twinkle{0%,100%{opacity:.15;transform:scale(.8)}50%{opacity:.95;transform:scale(1.3)}}
@keyframes rb-cr-text{to{background-position:-200% 0}}
@media (max-width:520px){.rb-cr{padding:18px}.rb-cr-body{gap:14px}.rb-cr-emoji{font-size:36px}.rb-cr-title{font-size:21px}}
@media (prefers-reduced-motion:reduce){.rb-cr{opacity:1;transform:none;animation:none}.rb-cr-emoji,.rb-cr-glow,.rb-cr-shine,.rb-cr-star,.rb-cr-title{animation:none}.rb-cr-star{opacity:.5}}
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


`+String.raw`
@media(max-width:760px){
 .rb-mem-status{align-items:stretch}
 .rb-mem-status-actions{width:100%}
 .rb-mem-status-actions>.rb-btn{flex:1}
 .rb-mem-timeline-heading{align-items:flex-start}
 .rb-mem-filters{width:100%}
 .rb-mem-filters .rb-chip{flex:1;justify-content:center;padding:0 6px}
 .rb-mem-event{padding:12px}
 .rb-mem-event-head>.rb-muted{margin-left:0;width:100%}
}

.rb-mem-wrap{container-type:inline-size;container-name:memwrap;flex:1;min-height:0;min-width:0;display:flex}
.rb-mem-root{display:flex;flex:1;min-height:0;min-width:0;gap:0;overflow:hidden}
.rb-mem-back{display:none}
/* 세로 flex 안에서 내용이 길 때(설정 탭 등) 머리·상태·알약 탭이 줄어들어 가려지지 않게 */
.rb-mem-col>*{flex-shrink:0}
.rb-mem-tabs,.rb-mem-chats,.rb-mem-status,.rb-mem-head{flex-shrink:0}
.rb-mem-mode{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;background:var(--rb-surf2);color:var(--rb-sub);border:1px solid var(--rb-line2)}
.rb-mem-mode.bardwiki{background:var(--rb-acc-soft);color:var(--rb-acc-text);border-color:var(--rb-sel-ring)}
.rb-mem-mode.local{background:var(--rb-acc-soft);color:var(--rb-text)}
.rb-mem-col{display:flex;flex-direction:column;gap:10px;min-width:0;overflow:auto;padding:12px}
.rb-mem-col.list{width:280px;flex-shrink:0;border-right:1px solid var(--rb-line2)}.rb-mem-col.view{flex:1}
/* 좁은 폭(휴대폰·좁은 창)에서는 한 번에 한 칸만: 컨테이너 폭 기준 + 뷰포트 기준을 함께 건다 */
@container memwrap (max-width:900px){
 .rb-mem-root .rb-mem-col.list{width:auto;flex:1;border-right:0}
 .rb-mem-root[data-view=bots] .rb-mem-col.view{display:none}
 .rb-mem-root[data-view=bot] .rb-mem-col.list{display:none}
 .rb-mem-back{display:inline-flex}
 .rb-mem-col{padding:10px}
 .rb-mem-grid{grid-template-columns:1fr}
 .rb-mem-tabs{flex-wrap:nowrap;justify-content:center;gap:4px}.rb-mem-tabs .rb-chip{flex:1 1 0;min-width:0;min-height:44px;padding-left:4px;padding-right:4px;justify-content:center;text-align:center;white-space:nowrap;font-size:14px}
 .rb-mem-tools .rb-search{min-width:0;flex-basis:100%}
 .rb-mem-head{flex-wrap:wrap}
 .rb-mem-range input{width:96px}
}
@media(max-width:900px){
 .rb-mem-root .rb-mem-col.list{width:auto;flex:1;border-right:0}
 .rb-mem-root[data-view=bots] .rb-mem-col.view{display:none}
 .rb-mem-root[data-view=bot] .rb-mem-col.list{display:none}
 .rb-mem-back{display:inline-flex}
}
.rb-mem-diag{overflow-wrap:anywhere}
.rb-mem-fold{border:1px solid var(--rb-line2);border-radius:14px;background:var(--rb-surf);flex-shrink:0}
.rb-mem-fold>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;padding:0 14px;cursor:pointer;font-weight:700;list-style:none}
.rb-mem-fold>summary::-webkit-details-marker{display:none}
.rb-mem-fold>summary::after{content:"▾";color:var(--rb-mute);margin-left:auto;padding-left:8px}
.rb-mem-fold[open]>summary::after{content:"▴"}
.rb-mem-fold>summary .rb-mem-mode{margin-left:8px}
.rb-mem-setpanel{width:100%;max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:12px;padding:6px 4px 20px}.rb-mem-sethead{display:flex;align-items:center;gap:10px;font-size:17px;padding:6px 0}.rb-mem-sethead .rb-btn{margin-left:auto}
.rb-wk{display:grid;grid-template-columns:210px minmax(0,1fr);gap:16px;align-items:start}
.rb-wk-side{display:flex;flex-direction:column;gap:8px;min-width:0}
.rb-wk-count{display:flex;justify-content:space-between;font-size:12px;color:var(--rb-mute);padding:0 4px}
.rb-wk-list{display:flex;flex-direction:column;gap:6px}
.rb-wk-row{display:flex;align-items:center;gap:8px;min-height:48px;padding:6px 10px;border:1px solid var(--rb-line2);border-radius:12px;background:var(--rb-surf);color:inherit;text-align:left;cursor:pointer}
.rb-wk-row .txt{display:flex;flex-direction:column;min-width:0}.rb-wk-row .name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-wk-row[aria-pressed=true]{border-color:var(--rb-line3);box-shadow:inset 0 0 0 1px var(--rb-line3)}
.rb-wk-main,.rb-wk-page{display:flex;flex-direction:column;gap:14px;min-width:0}
.rb-wk-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.rb-wk-head h2{margin:2px 0 0;font-size:22px}
.rb-wk-eyebrow{font-size:11px;letter-spacing:.08em}
.rb-wk-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.rb-wk-title h3{margin:0;font-size:20px}
.rb-wk-n{display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;border:1px solid var(--rb-line2);font-size:12px;color:var(--rb-sub)}
.rb-wk-manage{border:1px solid var(--rb-line2);border-radius:12px;background:var(--rb-surf)}.rb-wk-manage>summary{padding:10px 14px;cursor:pointer;min-height:44px;display:flex;align-items:center;gap:8px}
.rb-wk-mbody{display:flex;flex-direction:column;gap:8px;padding:0 14px 12px}
.rb-wk-sec{display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--rb-line2);padding-top:12px}
.rb-wk-sh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.rb-wk-sh h3{margin:0;font-size:16px}
.rb-wk-stack{display:flex;flex-direction:column;gap:10px}
.rb-wk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rb-wk-grid .wide{grid-column:1/-1}
.rb-wk-card{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border:1px solid var(--rb-line2);border-radius:14px;background:var(--rb-surf);min-width:0}
.rb-wk-ch{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.rb-wk-val{font-variant-numeric:tabular-nums}
.rb-wk-meta{font-size:12px}.rb-wk-body{margin:0;white-space:pre-wrap;line-height:1.55;overflow-wrap:anywhere}
.rb-wk-unset{margin:6px 0;font-size:18px;color:var(--rb-mute)}
.rb-wk-delta{align-self:flex-start;font-size:12px;padding:1px 8px;border-radius:8px;border:1px solid var(--rb-line2)}
.rb-mem-advfold{border:1px solid var(--rb-line3);border-left:4px solid var(--rb-text);border-radius:12px;background:var(--rb-surf2);margin:6px 0}
.rb-mem-advfold>summary{display:flex;align-items:center;gap:8px;min-height:52px;padding:0 14px;font-size:15px;font-weight:700;cursor:pointer;list-style:none}
.rb-mem-advfold>summary::-webkit-details-marker{display:none}.rb-mem-advfold>summary::before{content:"고급";font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--rb-text);color:var(--rb-win)}
.rb-mem-advfold>summary::after{content:"▾";margin-left:auto;font-size:16px;color:var(--rb-sub)}.rb-mem-advfold[open]>summary::after{content:"▴"}
.rb-mem-advfold>*:not(summary){margin-left:14px;margin-right:14px}.rb-mem-advfold[open]{padding-bottom:12px}
.rb-mem-navtabs{position:sticky;top:-12px;z-index:3;background:var(--rb-win);padding-top:8px;margin-top:-8px}
.rb-mem-anchor{scroll-margin-top:64px;display:flex;flex-direction:column;gap:10px;padding-top:6px}.rb-mem-anchor+.rb-mem-anchor{border-top:1px solid var(--rb-line2);margin-top:18px;padding-top:18px}
.rb-mem-anchortitle{margin:0;font-size:18px}.rb-mem-anchor-body{min-width:0}
.rb-wk-headwrap{display:flex;flex-direction:column;gap:10px}.rb-wk-auto{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.rb-wk-auto .rb-note{flex:1;min-width:220px;margin:0}
.rb-wk-foot{display:flex;align-items:center;gap:10px;justify-content:space-between}
.rb-wk-empty{margin:0;font-size:13px}.rb-wk-form{display:flex;flex-direction:column;gap:10px}
.rb-wk-head .rb-mem-rowact{flex-wrap:wrap;justify-content:flex-end}
.rb-wk-story{display:flex;flex-direction:column;gap:10px}
.rb-wk-card .rb-mem-rowact,.rb-wk-ch .rb-mem-rowact{flex-wrap:wrap}
.rb-wk-row{transition:background .15s,border-color .15s,transform .15s,box-shadow .15s}
@media(hover:hover){.rb-wk-row:hover{border-color:var(--rb-sel-ring);transform:translateY(-1px);box-shadow:var(--rb-shadow-card)}.rb-wk-card:hover{box-shadow:0 4px 14px var(--rb-acc-soft)}}
.rb-wk-row[aria-pressed=true]{background:linear-gradient(var(--rb-acc-soft),var(--rb-acc-soft)),var(--rb-surf);border-color:var(--rb-sel-ring);box-shadow:inset 3px 0 0 var(--rb-acc-text)}
.rb-wk-card{border:1px solid var(--rb-line2);background:linear-gradient(180deg,var(--rb-acc-soft) 0,transparent 46px),var(--rb-surf)}
.rb-wk-eyebrow{color:var(--rb-acc-text);letter-spacing:.04em;font-weight:700}
.rb-wk-count,.rb-wk-n{background:var(--rb-acc-soft);color:var(--rb-acc-text);border-radius:99px;padding:1px 8px;font-weight:700}
.rb-wk-sh{display:flex;align-items:center;gap:8px}.rb-wk-sh::before{content:"";width:4px;height:1.1em;border-radius:4px;background:var(--rb-acc-grad)}
.rb-mem-navtabs{border-bottom:1px solid var(--rb-line2);padding-bottom:8px}
.rb-mem-navtabs .rb-chip{border-radius:999px;transition:background .15s}
.rb-mem-advfold{border-left-color:var(--rb-acc-text)}.rb-mem-advfold>summary::before{background:var(--rb-acc-grad);color:var(--rb-on-acc)}
.rb-mem-topgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:12px;align-items:start}
.rb-mem-topgrid>*{min-width:0;margin:0}
@container memwrap (max-width:900px){.rb-mem-topgrid{grid-template-columns:1fr}}
@media(max-width:900px){.rb-mem-topgrid{grid-template-columns:1fr}}
.rb-mem-status{border-radius:16px;box-shadow:var(--rb-shadow-card);border-left:4px solid var(--rb-acc-text)}
.rb-wk-card{border-radius:16px;box-shadow:var(--rb-shadow-card);transition:box-shadow .15s}
.rb-wk-bar{height:8px!important;background:var(--rb-acc-soft)!important}
.rb-wk-bar i{background:var(--rb-acc-grad)!important;opacity:1!important;box-shadow:0 0 6px var(--rb-acc-soft)}
.rb-wk-val{color:var(--rb-acc-text)}
.rb-mem-anchortitle{padding-left:10px;border-left:4px solid var(--rb-acc-text)}
.rb-mem-navtabs .rb-chip[aria-pressed=true]{background:var(--rb-acc-grad);color:var(--rb-on-acc);border-color:transparent}
.rb-wk-bar{height:6px;border-radius:99px;background:var(--rb-surf2);overflow:hidden}.rb-wk-bar i{display:block;height:100%;border-radius:99px;background:var(--rb-text);opacity:.7}
.rb-wk-range{display:flex;justify-content:space-between;gap:8px;font-size:12px}
@container memwrap (max-width:900px){.rb-wk{grid-template-columns:1fr}.rb-wk-list{flex-direction:row;overflow-x:auto}.rb-wk-row{flex:0 0 auto}.rb-wk-grid{grid-template-columns:1fr}}
@media(max-width:900px){.rb-wk{grid-template-columns:1fr}.rb-wk-list{flex-direction:row;overflow-x:auto}.rb-wk-row{flex:0 0 auto}.rb-wk-grid{grid-template-columns:1fr}}
.rb-mem-foldbody{display:flex;flex-direction:column;gap:10px;padding:0 10px 12px}
.rb-mem-modeline{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0 4px}
.rb-mem-fold-panel{display:flex;flex-direction:column;border:1px solid var(--rb-line2);border-radius:14px;background:var(--rb-surf);padding:10px 0 2px;flex-shrink:0}
.rb-mem-fold-panel[hidden]{display:none}
.rb-mem-scope{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:600;vertical-align:middle;border:1px solid var(--rb-line2);color:var(--rb-muted);background:var(--rb-surf)}
.rb-mem-scope.chat{color:var(--rb-acc-text);border-color:var(--rb-acc-text)}
.rb-mem-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}
.rb-mem-tools .rb-mem-search{flex:1 1 220px;min-width:0}
.rb-mem-botwrap{display:flex;flex-direction:column;gap:10px;min-height:0}
.rb-mem-botlist{display:flex;flex-direction:column;gap:4px}
.rb-mem-botlist .rb-row .txt,.rb-mem-card .txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left}
.rb-mem-botlist .name,.rb-mem-card .name{font-weight:600;display:flex;gap:6px;align-items:center}
.rb-mem-botlist .meta,.rb-mem-card .meta{font-size:12px;color:var(--rb-mute)}
.rb-mem-dot{width:8px;height:8px;border-radius:50%;background:var(--rb-line3);flex-shrink:0}.rb-mem-dot.on{background:var(--rb-acc-grad);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-mem-head{display:flex;align-items:center;gap:10px}.rb-mem-head h2{margin:0;font-size:18px}
.rb-mem-status{padding:12px 14px;display:flex;flex-direction:column;gap:4px;font-size:13px}
.rb-mem-chats{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;flex-wrap:wrap}
.rb-mem-tabs{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--rb-line2);padding-bottom:8px}
.rb-mem-tabs .rb-chip{min-height:40px}
.rb-mem-body{display:flex;flex-direction:column;gap:12px}
.rb-mem-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rb-mem-tools .rb-search{flex:1;min-width:160px}
.rb-mem-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
.rb-mem-card{display:flex;gap:12px;align-items:center;padding:12px;border-radius:14px;background:var(--rb-surf);border:1px solid var(--rb-line);cursor:pointer;min-height:56px;text-align:left;color:inherit}
.rb-mem-card:hover{border-color:var(--rb-sel-ring)}.rb-mem-card:focus-visible{outline:2px solid var(--rb-sel-ring);outline-offset:2px}
.rb-mem-av{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;background:var(--rb-surf2);box-shadow:0 0 0 3px var(--g,var(--rb-line3))}
[data-g=D]{--g:#8b9bb4}[data-g=C]{--g:#5b8def}[data-g=B]{--g:#9a6bff}[data-g=A]{--g:#f0a23c}[data-g=S]{--g:#e8548f}[data-g=EX]{--g:#ffd24a}
.rb-grade{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:20px;padding:0 6px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.02em;color:var(--g,var(--rb-sub));background:color-mix(in srgb,var(--g,var(--rb-sub)) 16%,transparent);border:1px solid color-mix(in srgb,var(--g,var(--rb-sub)) 55%,transparent);flex-shrink:0}
.rb-grade[data-g=A]{box-shadow:0 0 8px color-mix(in srgb,var(--g) 45%,transparent)}
.rb-grade[data-g=S]{box-shadow:0 0 10px color-mix(in srgb,var(--g) 55%,transparent)}
.rb-grade[data-g=EX]{background:linear-gradient(135deg,#ffd24a33,#e8548f33);box-shadow:0 0 12px #ffd24a77}
.rb-mem-minibar{display:flex;gap:2px;height:5px;margin-top:4px}.rb-mem-minibar i{border-radius:3px;background:var(--g);opacity:.85;min-width:2px}
.rb-mem-phead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.rb-mem-phead h3{margin:0}
.rb-mem-digest{padding:10px 14px;font-size:13px}
.rb-mem-reclist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.rb-mem-rec{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:var(--rb-surf)}.rb-mem-rec .txt{min-width:0;overflow-wrap:anywhere}
.rb-mem-link{border:0;background:none;color:var(--rb-acc-text);cursor:pointer;padding:2px 4px;border-radius:6px;font:inherit;display:inline-flex;gap:4px;align-items:center;min-height:28px}
.rb-mem-timeline{display:flex;flex-direction:column;gap:10px}.rb-mem-scene{padding:12px 14px;display:flex;flex-direction:column;gap:6px}.rb-mem-scene.is-focus{box-shadow:0 0 0 2px var(--rb-sel-ring)}
.rb-mem-scene p{margin:0}.rb-mem-shead{display:flex;gap:8px;align-items:center}.rb-mem-facts{margin:0;padding-left:18px;font-size:13px;color:var(--rb-sub)}
.rb-mem-who{display:flex;gap:6px;flex-wrap:wrap}.rb-mem-who .rb-mem-av{width:22px;height:22px;font-size:11px;box-shadow:none}
.rb-mem-sact{display:flex;gap:8px;flex-wrap:wrap}
.rb-mem-sec{padding:14px;display:flex;flex-direction:column;gap:10px}.rb-mem-sec h3{margin:0;font-size:14px}
.rb-mem-field{display:flex;flex-direction:column;gap:4px;font-size:13px}.rb-mem-field.row{flex-direction:row;align-items:center;justify-content:space-between}.rb-mem-field>span{font-weight:600;color:var(--rb-sub)}
.rb-mem-range{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rb-mem-range label{display:flex;gap:6px;align-items:center}.rb-mem-range input{width:110px}
.rb-mem-check{display:flex;gap:8px;align-items:center;font-size:13px;min-height:36px}
.rb-mem-flowsteps{display:flex;gap:6px;flex-wrap:wrap;list-style:none;margin:0;padding:0;font-size:12px}.rb-mem-flowsteps li{padding:5px 10px;border-radius:999px;background:var(--rb-surf2);color:var(--rb-mute)}
.rb-mem-flowsteps li[aria-current=step]{background:var(--rb-acc-soft);color:var(--rb-text);font-weight:700}.rb-mem-flowsteps li.done{color:var(--rb-sub)}
.rb-mem-card.pick input{flex-shrink:0}.rb-mem-pre{white-space:pre-wrap;font-size:12px;background:var(--rb-surf2);padding:10px;border-radius:10px;max-height:260px;overflow:auto}
.rb-mem-man summary{cursor:pointer;font-size:13px;min-height:32px}
.rb-card-edit{display:grid;grid-template-columns:minmax(220px,340px) minmax(0,1fr);gap:16px;align-items:start}
.rb-card-side{display:flex;flex-direction:column;gap:10px;position:sticky;top:0}
.rb-card-form{display:flex;flex-direction:column;gap:12px;min-width:0}
.rb-card-canvas{width:100%;aspect-ratio:2/3;height:auto;border-radius:14px;background:#0b0b14;box-shadow:0 6px 24px rgba(0,0,0,.35)}
.rb-card-slider{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--rb-sub)}.rb-card-slider span{width:56px;flex-shrink:0}.rb-card-slider input{flex:1;min-width:0;height:28px}
.rb-card-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;max-height:280px;overflow:auto;padding:2px}
.rb-card-thumb{display:flex;flex-direction:column;gap:4px;padding:4px;border-radius:10px;border:2px solid transparent;background:var(--rb-surf);cursor:pointer;color:var(--rb-sub);font-size:11px;min-height:44px}
.rb-card-thumb img{width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:8px;background:var(--rb-surf2)}
.rb-card-thumb span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-card-thumb[aria-pressed=true]{border-color:var(--rb-sel-ring);color:var(--rb-text)}
.rb-card-tagpool{max-height:200px;overflow:auto;margin-top:6px}
.rb-card-tile{border-left:4px solid var(--g,var(--rb-line))}
.rb-card-dialog{width:min(420px,94vw);max-height:92vh;overflow:auto}.rb-card-dialog .rb-card-canvas{margin:8px 0}
@container memwrap (max-width:900px){.rb-card-edit{grid-template-columns:1fr}.rb-card-side{position:static;max-width:340px;width:100%;margin:0 auto}}

.rb-wiz{display:flex;flex-direction:column;gap:14px;max-width:520px;width:100%}.rb-wiz-dots{display:flex;gap:8px;list-style:none;margin:0;padding:0}.rb-wiz-dots li{flex:1;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--rb-mute)}.rb-wiz-dots li i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--rb-surf2);font-style:normal;font-weight:700}.rb-wiz-dots li.on{color:var(--rb-text);font-weight:700}.rb-wiz-dots li.on i{background:var(--rb-acc-a);color:#fff}.rb-wiz-dots li.done i{background:var(--rb-acc-soft)}.rb-wiz-body{display:flex;flex-direction:column;gap:12px}.rb-wiz-sum{padding:10px 12px;border-radius:10px;background:var(--rb-surf2);font-weight:700}
.rb-guideq{width:22px;height:22px;border-radius:50%;border:1px solid var(--rb-line);background:var(--rb-surf2);color:var(--rb-sub);font-size:12px;font-weight:700;margin-left:6px;cursor:pointer;vertical-align:middle;line-height:1}.rb-guideq:hover,.rb-guideq:focus-visible{background:var(--rb-acc-soft);color:var(--rb-text)}.rb-gd{max-width:480px;display:flex;flex-direction:column;gap:12px}.rb-gd-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}.rb-gd-list li{display:flex;gap:8px;align-items:flex-start}.rb-gd-list i{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:var(--rb-acc-soft);font-style:normal;font-size:12px;font-weight:700}.rb-gd-more{display:flex;gap:6px;flex-wrap:wrap}
.rb-mem-modebar{padding:14px;display:flex;flex-direction:column;gap:12px;margin-bottom:10px;border:1px solid var(--rb-line);background:linear-gradient(135deg,var(--rb-acc-soft),transparent 70%)}.rb-mem-modebar.pot{border-color:var(--rb-acc-a)}
.rb-mem-mbrow{display:flex;align-items:center;gap:12px}.rb-mem-mbrow .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.rb-mem-mbrow b{font-size:15px}.rb-mem-mbrow .ic{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--rb-acc-soft);color:var(--rb-acc-text);flex-shrink:0}
.rb-mem-mbrow.pot{padding-top:12px;border-top:1px dashed var(--rb-line)}
.rb-mem-home{padding:14px;display:flex;flex-direction:column;gap:12px}.rb-mem-home.on{border-color:var(--rb-acc-a)}
.rb-mem-homehead{display:flex;align-items:center;gap:12px}.rb-mem-homehead .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.rb-mem-homehead b{font-size:16px}
.rb-mem-flowsteps{display:flex;gap:4px;list-style:none;margin:0;padding:0}
.rb-mem-flowstep{flex:1;min-width:0;white-space:nowrap;word-break:keep-all;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11.5px;color:var(--rb-mute);position:relative}
.rb-mem-flowstep i{width:12px;height:12px;border-radius:50%;background:var(--rb-line3);display:block}
.rb-mem-flowstep.is-done{color:var(--rb-text)}.rb-mem-flowstep.is-done i{background:var(--rb-acc-grad);box-shadow:0 0 0 3px var(--rb-acc-soft)}
.rb-mem-flowstep.is-skip i{background:transparent;border:2px solid var(--rb-line3)}
.rb-mem-recent{margin:0}.rb-mem-recent .rb-mem-rec{padding:6px 0}
.rb-mem-feats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:10px}
.rb-mem-feat{padding:12px;display:flex;flex-direction:column;gap:6px}.rb-mem-feat:not(.on){opacity:.72}
.rb-mem-feat p{margin:0}.rb-mem-featsum{font-size:12.5px;color:var(--rb-sub)}
.rb-mem-apiform{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.rb-mem-adv{margin-top:2px}.rb-mem-adv>summary{font-weight:700;cursor:pointer;min-height:40px;display:flex;align-items:center}
.rb-mem-cycle{font-size:13px;line-height:1.6;padding:8px 10px;border-radius:10px;background:var(--rb-acc-soft);color:var(--rb-acc-text)}
.rb-mem-meterrow{display:flex;align-items:center;gap:6px}.rb-mem-meterrow .rb-mem-meter{flex:1;min-width:0}
.rb-mem-rowact{display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle}
.rb-mem-wikinote{margin:6px 0;font-size:13px;line-height:1.6;color:var(--rb-mute)}.rb-mem-wikinote b{color:var(--rb-acc-text)}
.rb-mem-adult>summary{font-weight:700}
.rb-mem-state{padding:12px 14px;display:flex;flex-direction:column;gap:10px}.rb-mem-state h4{margin:0;font-size:14px}
.rb-mem-meters{display:flex;flex-direction:column;gap:6px}
.rb-mem-meter{display:grid;grid-template-columns:72px 1fr auto;align-items:center;gap:10px;background:none;border:0;padding:4px 0;text-align:left;cursor:pointer;color:inherit;font:inherit}
.rb-mem-meter .bar{height:8px;border-radius:99px;background:var(--rb-line2);overflow:hidden}.rb-mem-meter .bar i{display:block;height:100%;background:var(--rb-acc-grad);border-radius:99px}
.rb-mem-meter .v{font-variant-numeric:tabular-nums;font-weight:700}.rb-mem-meter .v small{color:var(--rb-sub);font-weight:400}
.rb-mem-texts{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px}.rb-mem-texts dt{color:var(--rb-mute);white-space:nowrap}.rb-mem-texts dd{margin:0;overflow-wrap:anywhere}
.rb-mem-tlchips{margin:2px 0}
.rb-mem-kind{flex-shrink:0;min-width:34px;text-align:center;font-size:11px;font-weight:700;padding:2px 6px;border-radius:99px;background:var(--rb-acc-soft);color:var(--rb-text)}
.rb-mem-kind.k-open{background:transparent;border:1px solid var(--rb-line3)}.rb-mem-kind.k-rel{background:var(--rb-line2)}
.rb-mem-story-row .txt{flex:1;min-width:0}
.rb-mem-checks{display:flex;flex-direction:column;max-height:260px;overflow:auto;border:1px solid var(--rb-line2);border-radius:10px;padding:4px 10px;margin:8px 0}
.rb-mem-pgroups{display:flex;flex-direction:column;gap:10px}.rb-mem-pgroup>summary{cursor:pointer;font-weight:700;font-size:14px;padding:8px 2px;display:flex;align-items:center;gap:4px;min-height:36px}.rb-mem-pgroup[open]>summary{margin-bottom:6px}
.rb-mem-usage{margin:6px 0 0;padding-left:18px;font-size:12px}.rb-mem-formula{font-size:12px;margin:4px 0 0}
@media (prefers-reduced-motion:no-preference){.rb-mem-flowstep i{transition:background .2s,box-shadow .2s}}
`+PROB_CSS;
