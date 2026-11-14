// 2.2.0 홈 F안: 포커스 머리 + 위젯 격자. 예전 홈 클래스(.rb-htile 등)는 위젯 안에서 크기에 맞게 덮어쓴다.
export var HOMEGRID_CSS = `
.rb-home4{display:flex;flex-direction:column;gap:16px;padding-bottom:24px}
.rb-home4>*{flex-shrink:0}
.rb-hfocus{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:6px 0 4px}
.rb-hfocus .rb-hhead{justify-content:center;width:100%;padding:0 110px}
.rb-hfocus .rb-hhead .t{align-items:center}
.rb-hfocus .rb-hhead h1{font-size:28px;max-width:100%}
.rb-skin-glass .rb-hfocus .rb-hhead h1{background:linear-gradient(90deg,#fff,var(--rb-tint));-webkit-background-clip:text;background-clip:text;color:transparent}
.rb-hfocus .rb-hstats{width:min(560px,100%);text-align:left}
.rb-hfocus .rb-hstat-memory .rb-status{min-height:0}
.rb-hcmd{width:min(560px,100%);display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:999px;border:1px solid var(--rb-glass-line,var(--rb-line2));
  background:var(--rb-glass-bg,var(--rb-surf));color:var(--rb-mute);cursor:text;text-align:left;box-shadow:var(--rb-glass-hi,none)}
.rb-hcmd span:nth-child(2){flex:1}
.rb-hedit{position:absolute;right:0;top:0;padding:6px 14px;border-radius:999px;border:1px dashed var(--rb-line3);background:none;color:var(--rb-sub);cursor:pointer;font-size:13px}
.rb-hedit[aria-pressed=true]{background:var(--rb-acc-grad);color:var(--rb-on-acc);border-color:transparent;box-shadow:0 0 12px var(--rb-glow,transparent)}
.rb-htray{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12px;color:var(--rb-sub)}
.rb-htray-list{display:contents}
.rb-htray-tip{flex-basis:100%;color:var(--rb-mute)}
/* 격자 */
.rb-hgrid2{position:relative;flex:none;--hw-cell:96px;--hw-gap:16px;min-height:96px}
.rb-hgrid2.narrow{--hw-cell:84px;--hw-gap:12px}
.rb-hgrid2.editing{background-image:linear-gradient(var(--rb-line) 1px,transparent 1px),linear-gradient(90deg,var(--rb-line) 1px,transparent 1px);background-size:var(--hw-ux) var(--hw-uy);border-radius:12px}
.rb-hw{position:absolute;display:flex;flex-direction:column;min-width:0;overflow:auto;border-radius:var(--rb-r3);padding:14px 16px;
  background:var(--rb-glass-bg,var(--rb-surf));border:1px solid var(--rb-glass-line,var(--rb-line2));box-shadow:var(--rb-glass-shadow,var(--rb-shadow-card)),var(--rb-glass-hi,0 0 0 transparent);
  backdrop-filter:var(--rb-glass-blur,none);-webkit-backdrop-filter:var(--rb-glass-blur,none);transition:left .18s,top .18s,width .18s,height .18s;scrollbar-width:thin}
.rb-calm .rb-hw{transition:none}
.rb-hgrid2.editing .rb-hw{cursor:grab;touch-action:none;outline:1px dashed var(--rb-line3);outline-offset:-5px;user-select:none}
.rb-hgrid2.editing .rb-hw:focus-visible{outline:3px solid var(--rb-focus)}
.rb-hw.drag{transition:none;z-index:5;opacity:.92;cursor:grabbing;box-shadow:0 18px 40px rgba(0,0,0,.4),0 0 0 2px var(--rb-acc)}
.rb-hw-ghost{position:absolute;border:2px dashed var(--rb-acc);border-radius:var(--rb-r3);background:var(--rb-acc-soft);pointer-events:none}
.rb-hw-rm,.rb-hw-size{display:none}
.rb-hgrid2.editing .rb-hw-rm{display:grid;place-items:center;position:absolute;right:8px;top:8px;width:24px;height:24px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;font-size:12px;cursor:pointer;z-index:2}
.rb-hgrid2.editing .rb-hw-size{display:block;position:absolute;right:6px;bottom:6px;width:20px;height:20px;border-right:3px solid var(--rb-acc);border-bottom:3px solid var(--rb-acc);border-radius:0 0 7px 0;cursor:nwse-resize;z-index:2}
.rb-hw-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.rb-hw-head h2{margin:0;font-size:15px;font-weight:700}
/* 바로가기 위젯: 칸을 꽉 채우는 버튼. 1×1은 아이콘+이름만 */
.rb-hw[data-w=imp],.rb-hw[data-w=mem],.rb-hw[data-w=man],.rb-hw[data-w=wrk]{padding:0}
.rb-hw .rb-htile{width:100%;height:100%;border:0;background:none;box-shadow:none;border-radius:inherit;padding:14px;gap:12px}
.rb-hw[data-size="1x1"] .rb-htile{flex-direction:column;justify-content:center;text-align:center;gap:6px;padding:8px}
.rb-hw[data-size="1x1"] .rb-htile small{display:none}
.rb-hw[data-size="1x2"] .rb-htile,.rb-hw[data-size="2x2"] .rb-htile{flex-direction:column;align-items:flex-start;justify-content:flex-end}
.rb-hw[data-size="2x2"] .rb-htile .ico{width:56px;height:56px;border-radius:17px}
.rb-hw .rb-htile .t{display:flex;flex-direction:column;min-width:0}
.rb-hw .rb-htile small{color:var(--rb-mute);font-size:12px}
.rb-skin-glass .rb-htile .ico{color:#fff}
.rb-htile.tone-1{--k:#ff8a5c}.rb-htile.tone-2{--k:#e98bd6}.rb-htile.tone-3{--k:#6f9dff}.rb-htile.tone-4{--k:#3fcfa6}
/* 2.2.0 바로가기 아이콘: 네온 선(속 옅게 + 기능 색 테두리·아이콘 빛) */
.rb-hw .rb-htile[class*=tone-] .ico{background:color-mix(in srgb,var(--k) 10%,transparent)!important;border:1px solid color-mix(in srgb,var(--k) 60%,transparent);color:var(--k)!important;box-shadow:0 0 10px color-mix(in srgb,var(--k) 35%,transparent)}
.rb-hw .rb-htile[class*=tone-] .ico svg{filter:drop-shadow(0 0 3px color-mix(in srgb,var(--k) 70%,transparent))}
@media (hover:hover){.rb-hw .rb-htile[class*=tone-]:hover .ico{border-color:var(--k);box-shadow:0 0 16px color-mix(in srgb,var(--k) 55%,transparent)}}
.rb-lite .rb-hw .rb-htile .ico{box-shadow:none}.rb-lite .rb-hw .rb-htile .ico svg{filter:none}
@media (hover:hover){.rb-hgrid2:not(.editing) .rb-hw:has(.rb-htile):hover{border-color:var(--rb-sel-ring)}}
/* 숫자 위젯 */
.rb-hw .rb-hnum{height:100%;display:flex;flex-direction:column;justify-content:center;background:none;padding:0}
.rb-hw .rb-hnum b{font-size:30px;line-height:1.1;font-weight:800}
.rb-skin-glass .rb-hw .rb-hnum b{background:linear-gradient(180deg,#fff,var(--rb-tint));-webkit-background-clip:text;background-clip:text;color:transparent}
.rb-hw .rb-hnum small{font-size:12px;color:var(--rb-sub)}
/* 최근 기록 */
.rb-hw .rb-hrec{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--rb-line)}
.rb-hw .rb-hrec:last-child{border-bottom:0}
.rb-hw .rb-hrec>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-hdot{width:8px;height:8px;border-radius:50%;background:var(--rb-acc);box-shadow:0 0 8px var(--rb-glow,transparent);flex:none}
.rb-hw[data-w=add]{padding:0;overflow:hidden}
.rb-hadd{align-self:stretch}
.rb-hw:not([data-w=add]) .rb-card{background:none;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;width:100%}
.rb-hw .rb-discover-slot>*{margin:0;border:0;background:none;box-shadow:none;padding:0}
.rb-home-foot{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.rb-skin-glass .rb-home-foot .rb-btn{border:1px dashed var(--rb-ghost-line,rgba(255,255,255,.3));background:none}
@media (max-width:760px){
  .rb-hfocus .rb-hhead h1{font-size:20px}
  /* 모바일 홈 머리: 제목은 왼쪽, ‘홈 꾸미기’는 같은 줄 오른쪽 작은 버튼 */
  .rb-hfocus{align-items:stretch;text-align:left}
  .rb-hfocus .rb-hhead{padding:0 92px 0 0}
  .rb-hfocus .rb-hhead .t{align-items:flex-start}
  .rb-hedit{position:absolute;top:2px;right:0;order:0;align-self:auto;padding:4px 10px;font-size:12px}
  .rb-hw{padding:12px}
  .rb-hw .rb-hnum b{font-size:24px}
}

/* 2.2.0 라이트바(UI-GLASS 맨 위): 내용 카드(최근 기록·빠른 설정·이어서 하기·추천)와 위 상태 칸에만.
   바로가기 칸은 아이콘 색, 숫자 칸은 숫자가 이미 강조라 막대를 두지 않는다(한 화면에 강조 한 종류). */
.rb-hw:is([data-w=rec],[data-w=qs],[data-w=cont],[data-w=disc])::before,.rb-hfocus .rb-hstat-memory .rb-status::before{content:"";position:absolute;left:0;top:16px;bottom:16px;width:3px;border-radius:0 3px 3px 0;background:var(--lbg);box-shadow:0 0 8px color-mix(in srgb,var(--lb) 70%,transparent);pointer-events:none;z-index:1}
.rb-hw[data-w=rec]{--lb:#3fcfa6;--lbg:linear-gradient(180deg,#6ff0c4,#38b6a0)}
.rb-hw[data-w=qs]{--lb:#6f9dff;--lbg:linear-gradient(180deg,#7fd4ff,#5b8cff)}
.rb-hw[data-w=cont]{--lb:#ff8a5c;--lbg:linear-gradient(180deg,#ffb36b,#ff7a59)}
.rb-hw[data-w=disc]{--lb:#f5c451;--lbg:linear-gradient(180deg,#ffe08a,#f5b84a)}
.rb-hfocus .rb-hstat-memory .rb-status{position:relative;--lb:#5fe0a8;--lbg:#5fe0a8}
.rb-lite .rb-hw::before,.rb-lite .rb-hfocus .rb-hstat-memory .rb-status::before{box-shadow:none}
`;
