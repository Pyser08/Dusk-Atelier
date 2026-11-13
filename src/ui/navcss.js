// 2.2.0 사이드바: 섹션 접기 · 섹션 색 · 아래 한 줄 + ⋯ 메뉴 · 아이콘 레일(올리면 펼침, .rb-nav-pinned면 늘 펼침).
// 펼친 묶음/접힌 묶음 모두 링크는 DOM에 남는다(접힘 = 높이 0). 위쪽 메뉴(.rb-lay-top)·모바일에선 쓰지 않음.
export var NAV_CSS = `
.rb-navwrap{position:relative;flex:none;display:flex;width:calc(216px + var(--nav-pl,0px))}
.rb-lay-top .rb-navwrap{display:none}
.rb-nav{gap:2px;overflow-x:hidden}
.rb-nav-sec{display:flex;align-items:center;gap:10px;height:38px;padding:0 8px;margin-top:6px;border:0;border-radius:var(--rb-r2);background:none;color:var(--rb-text);font-weight:700;font-size:13.5px;cursor:pointer;white-space:nowrap;text-align:left;width:100%}
.rb-nav-sec[hidden]{display:none}
@media (hover:hover){.rb-nav-sec:hover{background:var(--rb-hover)}}
.rb-nav-sec:focus-visible{outline:3px solid var(--rb-focus);outline-offset:2px}
.rb-nav-sec .t{flex:1}
.rb-nav-sec .chev{display:grid;place-items:center;color:var(--rb-mute);transition:transform .18s}
.rb-nav-sec[aria-expanded=true] .chev{transform:rotate(90deg)}
.rb-nav .ci{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;flex:none;color:#fff;background:var(--k-grad)}
.rb-nav .sec-memory{--k:#c48bff;--k-grad:linear-gradient(135deg,#ff8ec6,#8a7bff)}
.rb-nav .sec-manage{--k:#6aaeff;--k-grad:linear-gradient(135deg,#7fd4ff,#5b8cff)}
.rb-nav .sec-work{--k:#4fd6b0;--k-grad:linear-gradient(135deg,#6ff0c4,#38b6a0)}
.rb-nav-group{display:flex;flex-direction:column;gap:2px;max-height:0;overflow:hidden;margin-left:21px;padding-left:8px;border-left:2px solid color-mix(in srgb,var(--k) 40%,transparent);transition:max-height .2s ease}
.rb-nav-group.open{max-height:640px;margin-bottom:4px}
.rb-calm .rb-nav-group,.rb-calm .rb-nav-sec .chev{transition:none}
.rb-nav a>svg{flex:none}
.rb-nav-group a{height:34px;font-size:13.5px;padding:0 10px}
.rb-nav-group a svg{color:var(--k)}
.rb-nav-group a[aria-current=page]{box-shadow:inset 3px 0 0 var(--k)}
.rb-nav-group a[aria-current=page] svg{color:var(--k)}
.rb-nav a.rb-nav-home svg{width:28px;height:28px;padding:6px;border-radius:9px;color:#fff;background:linear-gradient(135deg,#ffd27a,#ff9a5c);flex:none}
.rb-nav a.rb-nav-home{padding:0 8px;gap:10px}
.rb-nav a.rb-nav-home[aria-current=page] svg{color:#fff}
/* 아래 한 줄 + ⋯ 메뉴 */
.rb-nav-foot{margin-top:auto;position:relative;padding-top:10px}
.rb-nav-mini{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 8px;border-radius:var(--rb-r2);background:var(--rb-hover);font-size:12px;color:var(--rb-mute);white-space:nowrap}
.rb-nav-mini .ci{width:22px;height:22px;border-radius:7px;background:none;color:var(--rb-mute)}
.rb-nav-mini .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.rb-nav-more{width:28px;height:28px;border-radius:8px;border:0;background:var(--rb-surf2);color:var(--rb-text);cursor:pointer;font-size:15px;line-height:1;flex:none}
.rb-nav-more:focus-visible{outline:3px solid var(--rb-focus)}
.rb-nav-menu{position:absolute;left:0;right:0;bottom:calc(100% + 6px);z-index:40;display:flex;flex-direction:column;gap:2px;padding:8px;border-radius:var(--rb-r3);background:var(--rb-win);border:1px solid var(--rb-line3);box-shadow:var(--rb-shadow);min-width:200px}
.rb-skin-glass .rb-nav-menu{background:color-mix(in srgb,var(--rb-gbg) 88%,transparent);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px)}
.rb-nav-menu[hidden]{display:none}
.rb-nav-menu>button{display:flex;align-items:center;gap:8px;height:34px;padding:0 10px;border:0;border-radius:9px;background:none;color:var(--rb-text);cursor:pointer;font-size:13px;text-align:left;white-space:nowrap}
@media (hover:hover){.rb-nav-menu>button:hover{background:var(--rb-hover)}}
.rb-nav-menu-lab{font-size:11px;color:var(--rb-mute);padding:2px 10px 4px}
.rb-nav-menu .rb-layseg{margin:0 6px 6px;align-self:flex-start}
.rb-nav-menu-tip{font-size:11.5px;color:var(--rb-mute);padding:6px 10px 2px;white-space:normal;line-height:1.5}
/* 레일(늘 펼침이 아닐 때): 아이콘만, 올리거나 포커스하면 내용 위로 펼침 */
@media (min-width:761px){
  .rb-win:not(.rb-nav-pinned) .rb-navwrap{width:calc(68px + var(--nav-pl,0px))}
  .rb-win:not(.rb-nav-pinned) .rb-nav{position:absolute;top:0;bottom:var(--nav-pb,0px);left:var(--nav-pl,0px);width:68px;z-index:30;padding:14px 10px;transition:width .18s ease,box-shadow .18s}
  .rb-win:not(.rb-nav-pinned) .rb-nav:hover,.rb-win:not(.rb-nav-pinned) .rb-nav:focus-within{width:216px;box-shadow:var(--rb-shadow)}
  .rb-win:not(.rb-nav-pinned) .rb-nav:not(:hover):not(:focus-within) :is(a>span,a>small,.rb-nav-sec .t,.rb-nav-sec .chev,.rb-nav-mini .t,.rb-nav-more){opacity:0;pointer-events:none}
  .rb-win:not(.rb-nav-pinned) .rb-nav:not(:hover):not(:focus-within) .rb-nav-group{margin-left:0;padding-left:0;border-left-color:transparent}
  .rb-win:not(.rb-nav-pinned) .rb-nav:not(:hover):not(:focus-within) .rb-nav-group a{padding:0 14px;box-shadow:none}
  .rb-win:not(.rb-nav-pinned) .rb-nav:not(:hover):not(:focus-within) .rb-nav-mini{background:none;padding:6px 7px}
  .rb-win.rb-calm:not(.rb-nav-pinned) .rb-nav{transition:none}
  .rb-skin-glass:not(.rb-nav-pinned) .rb-nav:hover,.rb-skin-glass:not(.rb-nav-pinned) .rb-nav:focus-within{background:color-mix(in srgb,var(--rb-gbg) 80%,transparent)}
}

/* 위쪽 메뉴(.rb-lay-top): 홈 + 섹션 알약(색) · 섹션 메뉴는 아래 칩 줄 · ⋯ 메뉴 */
.rb-topnav{align-items:center;overflow:visible;position:relative;z-index:6}
.rb-topnav a[data-tab]:not([data-tab=home]),.rb-topnav .rb-topsep{display:none !important}
.rb-topsecs{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--rb-glass-bg,var(--rb-surf2));border:1px solid var(--rb-glass-line,var(--rb-line2));box-shadow:var(--rb-glass-hi,none)}
.rb-win .rb-topsecs a{height:36px;padding:0 14px 0 6px;gap:8px;border-radius:999px;font-weight:600}
.rb-win .rb-topsecs a[data-tab=home]{padding-left:6px}
.rb-topsecs a[data-tab=home] svg{width:24px;height:24px;padding:5px;border-radius:50%;color:#fff;background:linear-gradient(135deg,#ffd27a,#ff9a5c)}
.rb-topsecs a[data-tab=home][aria-current=page] svg{color:#fff}
.rb-topsec .ci{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;background:var(--k-grad)}
.rb-topsec.sec-memory{--k:#c48bff;--k-grad:linear-gradient(135deg,#ff8ec6,#8a7bff)}
.rb-topsec.sec-manage{--k:#6aaeff;--k-grad:linear-gradient(135deg,#7fd4ff,#5b8cff)}
.rb-topsec.sec-work{--k:#4fd6b0;--k-grad:linear-gradient(135deg,#6ff0c4,#38b6a0)}
.rb-topsecs a[aria-current=page]{background:var(--rb-glass-2,var(--rb-acc-soft));color:var(--rb-text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--k,var(--rb-acc)) 60%,transparent)}
.rb-topsec[hidden]{display:none !important}
.rb-topnav .rb-topsec .ci svg{color:#fff}
.rb-top-tools{margin-left:auto;position:relative;flex:none}
.rb-top-menu{top:calc(100% + 8px);bottom:auto;left:auto;right:0;width:240px}
@media (min-width:761px){
  .rb-lay-top.rb-in-more:not(.rb-on-hub) .rb-morenav{display:flex;gap:8px;padding:2px 20px 4px;overflow-x:auto;scrollbar-width:none;flex-shrink:0}
  .rb-lay-top .rb-morenav .rb-chip{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px}
  .rb-lay-top .rb-morenav .rb-chip[aria-pressed=true]{background:var(--rb-glass-2,var(--rb-acc-soft));color:var(--rb-text);border-color:var(--rb-sel-ring);font-weight:700}
}

/* 섹션 색 변수(지금 섹션) — 칩 줄·탭바가 씀 */
.rb-win[data-sec=home]{--sec-k:#ffb36b}.rb-win[data-sec=memory]{--sec-k:#c48bff}.rb-win[data-sec=manage]{--sec-k:#6aaeff}.rb-win[data-sec=work]{--sec-k:#4fd6b0}
.rb-skin-glass .rb-morenav .rb-chip[aria-pressed=true]{background:var(--rb-glass-2);color:var(--rb-text);border-color:color-mix(in srgb,var(--sec-k,var(--rb-acc)) 70%,transparent);box-shadow:0 0 10px color-mix(in srgb,var(--sec-k,var(--rb-acc)) 35%,transparent)}
.rb-skin-glass .rb-morenav .rb-chip[aria-pressed=true] svg{color:var(--sec-k,var(--rb-acc-text))}
/* 모바일 아래 탭바: 섹션 색 동그라미, 지금 탭은 그 색으로 빛남 */
.rb-tabbar .sec-home{--k:#ffb36b;--k-grad:linear-gradient(135deg,#ffd27a,#ff9a5c)}
.rb-tabbar .sec-memory{--k:#c48bff;--k-grad:linear-gradient(135deg,#ff8ec6,#8a7bff)}
.rb-tabbar .sec-manage{--k:#6aaeff;--k-grad:linear-gradient(135deg,#7fd4ff,#5b8cff)}
.rb-tabbar .sec-work{--k:#4fd6b0;--k-grad:linear-gradient(135deg,#6ff0c4,#38b6a0)}
@media (max-width:760px){
  .rb-tabbar{height:72px;padding:6px 8px calc(6px + env(safe-area-inset-bottom,0px))}
  .rb-tabbar a{gap:3px;border-radius:16px;margin:0 3px}
  .rb-tabbar a .ci{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;color:var(--rb-sub);background:var(--rb-hover);transition:background .15s,box-shadow .15s,color .15s}
  .rb-tabbar a[aria-current=page]{color:var(--rb-text)}
  .rb-tabbar a[aria-current=page]::before{display:none}
  .rb-tabbar a[aria-current=page] .ci{color:#fff;background:var(--k-grad);box-shadow:0 0 14px color-mix(in srgb,var(--k) 55%,transparent)}
  .rb-lite .rb-tabbar a[aria-current=page] .ci{box-shadow:none}
  .rb-skin-glass .rb-tabbar{margin:0 10px 10px;border:1px solid var(--rb-glass-line);border-radius:22px;background:color-mix(in srgb,var(--rb-gbg) 62%,transparent);box-shadow:var(--rb-glass-shadow),var(--rb-glass-hi)}
}

/* 꾸미기: 글래스 테마 고르기(둥근 버튼 + 16px 동그라미) */
.rb-gpicks{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.rb-gpick{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px 0 10px;border-radius:999px;border:1px solid var(--rb-line2);background:var(--rb-surf);color:var(--rb-sub);cursor:pointer;font-size:13px}
.rb-gpick i{width:16px;height:16px;border-radius:50%;flex:none}
.rb-gpick i.mine{background:var(--rb-acc-grad)}
.rb-gpick[aria-pressed=true]{color:var(--rb-text);font-weight:700;border-color:var(--rb-sel-ring);box-shadow:0 0 0 1px var(--rb-sel-ring)}
@media (hover:hover){.rb-gpick:hover{color:var(--rb-text);border-color:var(--rb-line3)}}

/* 기능 찾기: 모든 탭 오른쪽 위(? 옆). 홈에서도 머리 줄을 보이되 위치 글자는 숨김 */
.rb-win .rb-nosearch .rb-ph-tools .rb-search,.rb-nosearch .rb-ph-tools .rb-search{display:flex}
.rb-is-home .rb-pagehead{display:flex}
.rb-is-home .rb-ph-text{visibility:hidden}
@media (max-width:760px){.rb-is-home .rb-ph-text{display:none}.rb-is-home .rb-ph-tools{width:100%}}
`;
