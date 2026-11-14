// 2.2.0 관리(4번)·설정(5번) 글래스 배치: 관리 개요(통합 검색 + 숫자 타일) · 캐릭터 카드 갤러리 · 모듈 순서 번호·펼침 · 플러그인 카테고리 카드 · ProtLink+ 타임라인 · 설정 왼쪽 목차.
// 스크롤 안 카드는 블러를 쓰지 않는다(깜빡임 규칙). 가벼운 화면은 빛만 끈다.
export var MANAGEHUB_CSS = `
.rb-hub.rb-manhub{max-width:none}
.rb-manbar{display:flex;align-items:center;gap:10px;padding:6px 8px 6px 16px;border:1px solid var(--rb-line2);border-radius:999px;background:var(--rb-card,var(--rb-surf))}
.rb-manbar .ico{color:var(--rb-sub);display:grid}
.rb-manbar .rb-mansearch{flex:1;border:0;background:none;font-size:15px;padding:10px 4px;min-width:0;box-shadow:none}
.rb-manbar:focus-within{border-color:var(--rb-sel-ring,var(--rb-acc));box-shadow:0 0 0 1px var(--rb-sel-ring,var(--rb-acc))}
.rb-manres{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.rb-manres:empty{display:none}
.rb-manhit{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--rb-line);border-radius:12px;background:var(--rb-card,var(--rb-surf));color:inherit;font:inherit;text-align:left;cursor:pointer;min-width:0}
.rb-manhit .ico{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;flex:none;color:var(--k);background:color-mix(in srgb,var(--k) 10%,transparent);border:1px solid color-mix(in srgb,var(--k) 40%,transparent)}
.rb-manhit .t{flex:1;min-width:0;display:flex;flex-direction:column}.rb-manhit .t b,.rb-manhit .t small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rb-manhit .t small{color:var(--rb-sub);font-size:12px}
.rb-manhit .kind{font-size:11.5px;padding:2px 9px;border-radius:999px;color:var(--k);border:1px solid color-mix(in srgb,var(--k) 45%,transparent);flex:none}
.rb-manhit:focus-visible{outline:2px solid var(--k);outline-offset:2px}
.rb-mantiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:16px}
.rb-mantile{display:flex !important;flex-direction:column;align-items:stretch !important;gap:6px;padding:18px 20px !important;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,var(--rb-surf));color:inherit;font:inherit;text-align:left;cursor:pointer;min-width:0}
.rb-mantile .hd{display:flex;align-items:center;gap:10px}.rb-mantile .hd b{flex:1;font-size:15px}
.rb-mantile .ico{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;flex:none;color:color-mix(in srgb,var(--k) 25%,#fff);background:linear-gradient(135deg,color-mix(in srgb,var(--k) 60%,transparent),color-mix(in srgb,var(--k) 30%,transparent));border:1px solid color-mix(in srgb,var(--k) 55%,transparent);box-shadow:0 0 8px color-mix(in srgb,var(--k) 35%,transparent)}
.rb-mantile .go{color:var(--rb-sub);display:grid}
.rb-mantile .big{font-size:30px;font-weight:800;line-height:1.1;margin-top:4px}.rb-mantile .big small{font-size:13px;font-weight:600;color:var(--rb-sub);margin-left:3px}
.rb-mantile .d{color:var(--rb-sub);font-size:12.5px}
.rb-mantile .warn{align-self:flex-start;font-size:11.5px;padding:2px 9px;border-radius:999px;color:#f5c451;border:1px solid color-mix(in srgb,#f5c451 45%,transparent)}
@media (hover:hover){.rb-mantile:hover,.rb-manhit:hover{border-color:color-mix(in srgb,var(--k) 50%,transparent);box-shadow:0 0 16px color-mix(in srgb,var(--k) 22%,transparent)}}
.rb-mantile:focus-visible{outline:2px solid var(--k);outline-offset:2px}
.rb-mantile.k-characters,.rb-manhit.k-characters{--k:#6f9dff}.rb-mantile.k-modules,.rb-manhit.k-modules{--k:#b07cff}.rb-mantile.k-plugins,.rb-manhit.k-plugins{--k:#3fcfa6}.rb-mantile.k-protlink{--k:#ff8a5c}
.rb-skin-glass .rb-manbar,.rb-skin-glass .rb-mantile,.rb-skin-glass .rb-manhit{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
@media (max-width:760px){.rb-mantiles{grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.rb-mantile{padding:14px !important}.rb-mantile .big{font-size:24px}.rb-mantile .d{display:none}}

/* 캐릭터: 보기 전환·카드 크기 게이지 */
.rb-charview{display:inline-flex;align-items:center;gap:6px;flex:none}
.rb-cgsize{width:110px;accent-color:var(--rb-acc);cursor:pointer}
@media (max-width:760px){.rb-cgsize{width:80px}}
/* 캐릭터 카드 갤러리: 줄 DOM 그대로 카드 모양으로 */
.rb-list.rb-chargal{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--cg,160px),1fr));gap:12px;align-content:start}
.rb-chargal > :not(.rb-row){grid-column:1/-1}
.rb-chargal .rb-folder-body{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--cg,160px),1fr));gap:12px;padding:4px 0 8px}
.rb-chargal .rb-folder-body > :not(.rb-row){grid-column:1/-1}
.rb-chargal .rb-row{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:6px 4px;padding:8px 8px 6px;border:1px solid var(--rb-line);border-radius:14px;background:var(--rb-card,var(--rb-surf));min-width:0;margin:0}
.rb-chargal .rb-row > img,.rb-chargal .rb-row > span:not(.grip):not(.rb-mcb){order:-1;width:100% !important;height:auto !important;aspect-ratio:1/1;border-radius:10px !important;flex:0 0 100%}
.rb-chargal .rb-row > .txt{flex:1 1 100%;min-width:0;order:0}
.rb-chargal .rb-row .ttl{flex-wrap:wrap}
.rb-chargal .rb-row .meta{display:block;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-chargal .rb-row .rb-rowedit{order:1;flex:1;justify-content:center}
.rb-chargal .rb-row > .rb-icon-btn{order:2}
.rb-chargal .rb-row > .grip{position:absolute;left:12px;top:12px;z-index:1;padding:4px;border-radius:8px;background:rgba(0,0,0,.45);color:#fff}
.rb-chargal .rb-row > .rb-mcb{position:absolute;right:12px;top:12px;z-index:1}
.rb-chargal .rb-row[aria-selected=true]{border-color:var(--rb-sel-ring,var(--rb-acc));box-shadow:0 0 0 1px var(--rb-sel-ring,var(--rb-acc))}
.rb-skin-glass .rb-chargal .rb-row{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
@media (max-width:760px){.rb-chargal .rb-row .meta{display:none}.rb-list.rb-chargal,.rb-chargal .rb-folder-body{gap:8px}}

/* 모듈: 순서 번호 · 켜짐 글자 · 줄 펼침 */
.rb-list:has(.rb-ordnum){counter-reset:rbord}
.rb-ordnum{counter-increment:rbord;width:22px;text-align:center;color:var(--rb-sub);font-size:12px;font-variant-numeric:tabular-nums;flex:none}
.rb-ordnum::before{content:counter(rbord)}
.rb-onlab{font-size:12px;color:var(--rb-sub);white-space:nowrap;flex:none}.rb-onlab.on{color:#5fe0a8}
.rb-modexp{display:flex;flex-wrap:wrap;gap:6px;padding:4px 10px 12px 58px;border-bottom:1px solid var(--rb-line)}
@media (max-width:760px){.rb-onlab{display:none}.rb-modexp{padding-left:10px}}

/* 플러그인: 카테고리 = 색띠 카드 */
.rb-plcat{position:relative;padding:14px 18px 10px 24px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,transparent)}
.rb-plcat::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--kg);box-shadow:0 0 10px var(--k)}
.rb-plcat > summary.hd{display:flex;align-items:center;gap:12px;list-style:none;cursor:pointer;margin:0;padding:2px 0 8px}
.rb-plcat > summary::-webkit-details-marker{display:none}
.rb-plcat > summary .ico{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:none;color:var(--k);background:color-mix(in srgb,var(--k) 12%,transparent);border:1px solid color-mix(in srgb,var(--k) 55%,transparent)}
.rb-plcat > summary .t{flex:1;min-width:0;font-size:15.5px;font-weight:750;letter-spacing:.01em}
.rb-plcat > summary .n{font-size:12px;padding:2px 10px;border-radius:999px;color:var(--k);border:1px solid color-mix(in srgb,var(--k) 45%,transparent);font-weight:600}
.rb-plcat > summary .chev{color:var(--rb-sub);display:grid;transition:transform .15s}
.rb-plcat:not([open]) > summary .chev{transform:rotate(-90deg)}
.rb-plcat:not([open]) > summary{padding-bottom:2px}
.rb-plcat > summary:focus-visible{outline:2px solid var(--k);outline-offset:2px;border-radius:8px}
.rb-plcat-b{display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--rb-line);padding-top:4px}
.rb-plcat.k-0{--k:#6f9dff;--kg:linear-gradient(180deg,#7fd4ff,#5b8cff)}.rb-plcat.k-1{--k:#3fcfa6;--kg:linear-gradient(180deg,#6ff0c4,#38b6a0)}.rb-plcat.k-2{--k:#ff8a5c;--kg:linear-gradient(180deg,#ffb36b,#ff7a59)}.rb-plcat.k-3{--k:#e98bd6;--kg:linear-gradient(180deg,#ff8ec6,#b07cff)}.rb-plcat.k-4{--k:#f5c451;--kg:linear-gradient(180deg,#ffe08a,#f5b43c)}
.rb-plcat.k-none{--k:#9aa3b5;--kg:linear-gradient(180deg,#b6bdcc,#7d8597)}
.rb-skin-glass .rb-plcat{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
@media (max-width:760px){.rb-plcat{padding:12px 12px 8px 18px}}

/* ProtLink+: 왼쪽 링크 목록 · 오른쪽 세로 타임라인 */
.rb-pl2{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}
.rb-pl-main{display:grid;gap:12px;min-width:0}
.rb-pl-tl{position:sticky;top:0;align-self:stretch;min-height:320px;padding:18px 18px 18px 24px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,transparent)}
.rb-pl-tl::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:linear-gradient(180deg,#6ff0c4,#38b6a0);box-shadow:0 0 10px #3fcfa6}
.rb-pl-tl .hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}.rb-pl-tl .hd .ico{color:#3fcfa6;display:grid}
.rb-pl-tl ol{list-style:none;margin:0 0 0 6px;padding:0 0 0 16px;border-left:2px solid var(--rb-line);display:flex;flex-direction:column;gap:14px}
.rb-pl-tl li{position:relative;display:flex;flex-wrap:wrap;gap:2px 8px;font-size:13px;min-width:0}
.rb-pl-tl li::before{content:"";position:absolute;left:-22px;top:5px;width:10px;height:10px;border-radius:50%;background:var(--c,#6f9dff);box-shadow:0 0 8px var(--c,#6f9dff)}
.rb-pl-tl li b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.rb-pl-tl li small{color:var(--rb-sub)}.rb-pl-tl li span{flex:1 1 100%;color:var(--rb-sub);font-size:12.5px}
.rb-pl-tl li.new{--c:#ff8a5c}.rb-pl-tl li.ok{--c:#5fe0a8}.rb-pl-tl li.err{--c:#ff6b6b}.rb-pl-tl li.add{--c:#b07cff}
.rb-skin-glass .rb-pl-tl{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
@media (max-width:900px){.rb-pl2{grid-template-columns:minmax(0,1fr)}.rb-pl-tl{position:static;min-height:0}}

/* 설정: 왼쪽 목차 */
.rb-set2{display:grid;grid-template-columns:200px minmax(0,1fr);gap:20px;align-items:start}
.rb-settoc{position:sticky;top:0;display:flex;flex-direction:column;gap:4px;padding:12px 8px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,transparent)}
.rb-settoc-i{display:flex;align-items:center;gap:10px;padding:9px 12px;border:0;border-radius:10px;background:none;color:var(--rb-sub);font:inherit;font-size:13.5px;text-align:left;cursor:pointer;white-space:nowrap}
.rb-settoc-i .ico{display:grid;color:#6f9dff}
.rb-settoc-i.on{color:var(--rb-text);background:color-mix(in srgb,#6f9dff 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,#6f9dff 50%,transparent)}
@media (hover:hover){.rb-settoc-i:hover{color:var(--rb-text)}}
.rb-settoc-i:focus-visible{outline:2px solid #6f9dff;outline-offset:2px}
.rb-set2 .rb-scard{scroll-margin-top:12px}
.rb-toc-hit{animation:rbtochit 1.2s ease}
@keyframes rbtochit{0%{box-shadow:0 0 0 2px #6f9dff,0 0 18px color-mix(in srgb,#6f9dff 45%,transparent)}100%{box-shadow:none}}
.rb-skin-glass .rb-settoc{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
@media (max-width:760px){.rb-set2{grid-template-columns:minmax(0,1fr);gap:12px}.rb-settoc{position:static;flex-direction:row;overflow-x:auto;scrollbar-width:none;padding:6px}.rb-settoc-i{padding:7px 12px}}
.rb-lite .rb-mantile .ico,.rb-lite .rb-plcat::before,.rb-lite .rb-pl-tl::before,.rb-lite .rb-pl-tl li::before{box-shadow:none}
@media (prefers-reduced-motion:reduce){.rb-toc-hit{animation:none}}
`;
