// 2.2.0 기억 개요(6번 안): 상태 줄 → 기능 타일 2×2(왼쪽 색띠 + 약한 네온 아이콘) → 최근 기록.
// 글래스가 아니어도 같은 배치, 빛·색띠는 기능 색(--k)만 쓴다. 가벼운 화면에선 빛을 끈다.
export var MEMHUB_CSS = `
.rb-hub.rb-mhub{max-width:none}
.rb-mhub-empty{color:var(--rb-sub);font-size:13px;padding:6px 0}
.rb-mhub-stat{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 18px;border-radius:16px;position:relative}
.rb-mhub-stat::before{content:"";width:4px;align-self:stretch;border-radius:4px;background:var(--k,#5fe0a8);box-shadow:0 0 10px var(--k,#5fe0a8)}
.rb-mhub-stat.off{--k:var(--rb-mute,#888)}
.rb-mhub-stat .dot{width:9px;height:9px;border-radius:50%;background:var(--k,#5fe0a8);box-shadow:0 0 8px var(--k,#5fe0a8);flex:none}
.rb-mhub-stat .who{font-weight:700}
.rb-mhub-stat .line{flex:1;min-width:200px;color:var(--rb-sub);font-size:12.5px}
.rb-mhub-go{padding:8px 16px;border-radius:999px;font:inherit;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;color:var(--rb-acc-text,var(--rb-text));background:color-mix(in srgb,var(--rb-acc) 14%,transparent);border:1px solid color-mix(in srgb,var(--rb-acc) 60%,transparent);box-shadow:0 0 10px color-mix(in srgb,var(--rb-acc) 30%,transparent)}
.rb-mhub-tiles{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.rb-hubrow.rb-mtile{position:relative;align-items:flex-start;gap:12px;padding:16px 18px 16px 22px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,transparent);overflow:hidden;transition:border-color .15s,box-shadow .15s}
.rb-hubrow.rb-mtile:last-child{border-bottom:1px solid var(--rb-line2)}
.rb-mtile::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--kg);box-shadow:0 0 10px var(--k)}
.rb-hubrow.rb-mtile .ico{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,color-mix(in srgb,var(--k) 60%,transparent),color-mix(in srgb,var(--k) 30%,transparent));border:1px solid color-mix(in srgb,var(--k) 55%,transparent);color:color-mix(in srgb,var(--k) 25%,#fff);box-shadow:0 0 8px color-mix(in srgb,var(--k) 35%,transparent)}
.rb-mtile .t b{font-size:15px}
.rb-mtile .chip{align-self:flex-start;margin:2px 0;padding:2px 10px;border-radius:999px;background:var(--rb-hover);font-size:12px;color:var(--rb-sub)}
.rb-mtile .go{align-self:center}
@media (hover:hover){.rb-hubrow.rb-mtile:hover{background:var(--rb-card,transparent);border-color:color-mix(in srgb,var(--k) 45%,transparent);box-shadow:0 0 16px color-mix(in srgb,var(--k) 22%,transparent)}}
.rb-mtile:focus-visible{outline:2px solid var(--k);outline-offset:2px}
.rb-mtile.k-memory{--k:#e98bd6;--kg:linear-gradient(180deg,#ff8ec6,#8a7bff)}
.rb-mtile.k-relmap{--k:#6f9dff;--kg:linear-gradient(180deg,#7fd4ff,#5b8cff)}
.rb-mtile.k-cocoa{--k:#3fcfa6;--kg:linear-gradient(180deg,#6ff0c4,#38b6a0)}
.rb-mtile.k-cards{--k:#ff8a5c;--kg:linear-gradient(180deg,#ffb36b,#ff7a59)}
.rb-mhub-rec{padding:16px 20px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,transparent)}
.rb-mhub-rec .head{display:flex;align-items:center;margin-bottom:4px}.rb-mhub-rec .head b{flex:1}
.rb-mhub-rec ul{list-style:none;margin:0;padding:0}
.rb-mhub-rec li{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--rb-line2);font-size:13px}
.rb-mhub-rec li:last-child{border:0}.rb-mhub-rec li .t{flex:1;min-width:0}
.rb-mhub-rec .who{font-size:11.5px;padding:2px 8px;border-radius:999px;background:color-mix(in srgb,#c48bff 18%,transparent);white-space:nowrap}
.rb-skin-glass .rb-mhub-stat,.rb-skin-glass .rb-hubrow.rb-mtile,.rb-skin-glass .rb-mhub-rec{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
.rb-lite .rb-mtile::before,.rb-lite .rb-mhub-stat::before,.rb-lite .rb-hubrow.rb-mtile .ico,.rb-lite .rb-mhub-go{box-shadow:none}
@media (max-width:760px){.rb-mhub-tiles{gap:12px}.rb-hubrow.rb-mtile{flex-direction:column;gap:8px;padding:14px 14px 14px 18px}.rb-mtile .go{display:none}.rb-mhub-stat{padding:12px 16px}.rb-mhub-rec{padding:16px}}

/* 2.2.0 장기 기억 B안: 상태 위 고정 + 칸 나누기, 카드 왼쪽 색띠(초록=상태, 민트=기록, 분홍=옵션, 파랑=설정) */
.rb-mem4-wrap,.rb-mem3.rb-mem4-wrap{max-width:none}
.rb-mem4{display:flex;flex-direction:column;gap:14px;min-width:0}
.rb-mem4-tabs{display:inline-flex;align-self:flex-start;gap:2px;padding:4px;border-radius:999px;border:1px solid var(--rb-line2);background:var(--rb-card,transparent);max-width:100%;overflow-x:auto}
.rb-mem4-tab{padding:7px 16px;border:0;border-radius:999px;background:none;color:var(--rb-sub);font:inherit;font-size:13px;cursor:pointer;white-space:nowrap}
.rb-mem4-tab[aria-selected=true]{color:var(--rb-text);font-weight:700;background:color-mix(in srgb,#e98bd6 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,#e98bd6 60%,transparent),0 0 10px color-mix(in srgb,#e98bd6 28%,transparent)}
.rb-mem4-tab:focus-visible{outline:2px solid #e98bd6;outline-offset:2px}
.rb-mem4-two{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}
.rb-mem4-col{display:flex;flex-direction:column;gap:14px;min-width:0}
.rb-mem4-acts{display:flex;gap:8px;flex-wrap:wrap}
.rb-mem4 [hidden]{display:none!important}
.rb-mem4 .rb-mem-statuscard,.rb-mem4 .rb-mem-recentbox,.rb-mem4 .rb-mem-options,.rb-mem4 .rb-mem-integrated-settings{position:relative;padding-left:24px}
.rb-mem4 .rb-mem-statuscard::before,.rb-mem4 .rb-mem-recentbox::before,.rb-mem4 .rb-mem-options::before,.rb-mem4 .rb-mem-integrated-settings::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--k);box-shadow:0 0 10px var(--k)}
.rb-mem4 .rb-mem-statuscard{--k:#5fe0a8}.rb-mem4 .rb-mem-recentbox{--k:#3fcfa6}.rb-mem4 .rb-mem-options{--k:#e98bd6}.rb-mem4 .rb-mem-integrated-settings{--k:#6f9dff}
/* 아이콘: 둥근 네모 + 기능 색 얇은 테두리·옅은 빛(목업 6번). 바로가기·한 줄 카드 공통 */
.rb-mem4 .rb-mem-short .rb-htile .ico,.rb-mem4 .rb-me-entry .rb-mem-av.rb-me-av{--k:#c48bff;width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,color-mix(in srgb,var(--k) 60%,transparent),color-mix(in srgb,var(--k) 30%,transparent))!important;border:1px solid color-mix(in srgb,var(--k) 55%,transparent);color:color-mix(in srgb,var(--k) 25%,#fff)!important;box-shadow:0 0 8px color-mix(in srgb,var(--k) 35%,transparent)}
.rb-mem4 #rb-mem-go-wiki .ico,.rb-mem4 #rb-mem-go-me .rb-me-av{--k:#e98bd6}
.rb-mem4 #rb-mem-go-detail .ico,.rb-mem4 #rb-mem-go-relmap .rb-me-av{--k:#6f9dff}
.rb-mem4 #rb-mem-go-cards .ico,.rb-mem4 #rb-mem-go-erosync .rb-me-av{--k:#ff8a5c}
.rb-mem4 #rb-mem-go-bots .ico,.rb-mem4 #rb-mem-go-pot .rb-me-av{--k:#3fcfa6}
.rb-mem4 .rb-bigbtn{color:var(--rb-acc-text,var(--rb-text));background:color-mix(in srgb,var(--rb-acc) 14%,transparent);border:1px solid color-mix(in srgb,var(--rb-acc) 60%,transparent);box-shadow:0 0 10px color-mix(in srgb,var(--rb-acc) 30%,transparent)}
.rb-lite .rb-mem4 *::before,.rb-lite .rb-mem4-tab,.rb-lite .rb-mem4 .rb-bigbtn,.rb-lite .rb-mem4 .rb-me-av{box-shadow:none!important}
@media (max-width:760px){.rb-mem4-two{grid-template-columns:1fr}.rb-mem4-tabs{align-self:stretch;justify-content:space-between}.rb-mem4-tab{flex:1;padding:7px 8px}}

/* 한눈에 위쪽: 바로가기 4칸 | 나·관계도 넓은 칸 2개(같은 높이, 아이콘 위 + 제목·설명) */
.rb-mem4-top{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,3fr);gap:14px;align-items:stretch}
.rb-mem4-wide{display:flex;flex-direction:column;min-width:0}
.rb-mem4-wide h2{margin:0 0 8px;font-size:14px;font-weight:700;color:var(--rb-sub)}
.rb-mem4-widegrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:1}
.rb-mem4-widegrid .rb-me-entry{flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:6px;min-height:76px;height:100%;padding:10px 14px;margin:0;text-align:left;position:relative}
.rb-mem4-widegrid .rb-me-entry .t{display:flex;flex-direction:column;gap:2px;font-weight:700;font-size:13px}
.rb-mem4-widegrid .rb-me-entry .t small{font-weight:400;font-size:12px;color:var(--rb-sub);line-height:1.4}
.rb-mem4-widegrid .rb-me-entry .go{position:absolute;right:10px;top:12px}
.rb-mem4-top .rb-mem-short{display:flex;flex-direction:column;min-width:0}.rb-mem4-top .rb-mem-short .rb-hgrid{flex:1}.rb-mem4-top .rb-mem-short .rb-htile{height:100%}
@media (max-width:760px){.rb-mem4-top{grid-template-columns:1fr}}

/* 고급 묶음(옵션 칸): 라이트바 컨셉 + 읽기 쉽게. 묶음 = 왼쪽 빛 막대(파랑 설정·민트 진단·빨강 위험),
   안쪽 칸은 카드 대신 구분선으로 나눠 카드 속 카드를 없애고, 칸 제목에 작은 색 막대 */
.rb-mem4 .rb-mem-grp{position:relative;--k:#6f9dff;overflow:hidden}
.rb-mem4 .rb-mem-grp[data-g=diag]{--k:#3fcfa6}.rb-mem4 .rb-mem-grp.is-danger{--k:#ff6b7a}
.rb-mem4 .rb-mem-grp::before{content:"";position:absolute;left:0;top:14px;width:4px;height:36px;border-radius:0 4px 4px 0;background:var(--k);box-shadow:0 0 10px var(--k)}
.rb-mem4 .rb-mem-grp>summary{padding:14px 18px 14px 24px}
.rb-mem4 .rb-mem-grp>summary b{font-size:15px}
.rb-mem4 .rb-mem-grp[open]>summary{border-bottom:1px solid var(--rb-line2)}
.rb-mem4 .rb-mem-grp .rb-mem-foldbody{padding:4px 20px 12px 24px;gap:0}
.rb-mem4 .rb-mem-grp .rb-mem-advbody{display:flex;flex-direction:column}
.rb-mem4 .rb-mem-grp .rb-mem-sec{background:none!important;border:0!important;box-shadow:none!important;border-radius:0;padding:16px 0;gap:12px;border-top:1px solid var(--rb-line2)!important}
.rb-mem4 .rb-mem-grp .rb-mem-foldbody>.rb-mem-sec:first-child,.rb-mem4 .rb-mem-grp .rb-mem-advbody>.rb-mem-sec:first-child{border-top:0!important}
.rb-mem4 .rb-mem-grp .rb-mem-sec>h3{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--rb-text);letter-spacing:.01em}
.rb-mem4 .rb-mem-grp .rb-mem-sec>h3::before{content:"";width:3px;height:14px;border-radius:3px;background:var(--k);box-shadow:0 0 6px color-mix(in srgb,var(--k) 60%,transparent);flex:none}
.rb-mem4 .rb-mem-grp .rb-mem-field>span{font-weight:500;font-size:12.5px;color:var(--rb-sub)}
.rb-mem4 .rb-mem-grp .rb-muted,.rb-mem4 .rb-mem-grp p{line-height:1.55}
.rb-mem4 .rb-mem-grp .rb-input{min-height:40px}
.rb-lite .rb-mem4 .rb-mem-grp::before,.rb-lite .rb-mem4 .rb-mem-grp .rb-mem-sec>h3::before{box-shadow:none}
@media (max-width:760px){.rb-mem4 .rb-mem-grp>summary{padding:12px 14px 12px 20px}.rb-mem4 .rb-mem-grp .rb-mem-foldbody{padding:4px 14px 10px 20px}}

/* 세부 설정 주제 묶음 + 접힌 한 줄 칸 */
.rb-mem4 .rb-mem-cats{display:flex;flex-direction:column;gap:18px;padding:8px 0 4px}
.rb-mem4 .rb-mem-cat{--k:#6f9dff}.rb-mem4 .rb-mem-cat.c-rec{--k:#e98bd6}.rb-mem4 .rb-mem-cat.c-inj{--k:#3fcfa6}.rb-mem4 .rb-mem-cat.c-store{--k:#ff8a5c}
.rb-mem4 .rb-mem-cat[hidden]{display:none}
.rb-mem4 .rb-mem-cat>h4{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:13px;font-weight:700;color:var(--rb-sub)}
.rb-mem4 .rb-mem-cat>h4 .ci{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;background:linear-gradient(135deg,color-mix(in srgb,var(--k) 60%,transparent),color-mix(in srgb,var(--k) 30%,transparent));border:1px solid color-mix(in srgb,var(--k) 60%,transparent);color:color-mix(in srgb,var(--k) 25%,#fff)}
.rb-mem4 .rb-mem-catlist{display:flex;flex-direction:column;gap:6px}
.rb-mem4 .rb-mem-sub{position:relative;border:1px solid var(--rb-line2);border-radius:12px;background:color-mix(in srgb,var(--rb-text) 3%,transparent);overflow:hidden}
.rb-mem4 .rb-mem-sub::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--k);opacity:.85}
.rb-mem4 .rb-mem-sub>summary{display:flex;align-items:center;gap:10px;padding:11px 14px 11px 16px;cursor:pointer;list-style:none}
.rb-mem4 .rb-mem-sub>summary::-webkit-details-marker{display:none}
.rb-mem4 .rb-mem-sub>summary .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.rb-mem4 .rb-mem-sub>summary b{font-size:14px}.rb-mem4 .rb-mem-sub>summary small{font-size:12px;color:var(--rb-mute)}
.rb-mem4 .rb-mem-sub>summary .go{color:var(--rb-mute);transition:transform .15s}
.rb-mem4 .rb-mem-sub[open]>summary .go{transform:rotate(90deg)}
.rb-mem4 .rb-mem-sub[open]{border-color:color-mix(in srgb,var(--k) 45%,transparent);box-shadow:0 0 12px color-mix(in srgb,var(--k) 15%,transparent)}
.rb-mem4 .rb-mem-sub[open]>summary{border-bottom:1px solid var(--rb-line2)}
@media (hover:hover){.rb-mem4 .rb-mem-sub>summary:hover{background:var(--rb-hover)}}
.rb-mem4 .rb-mem-grp .rb-mem-sub>.rb-mem-sec{padding:14px 16px!important;border-top:0!important}
.rb-mem4 .rb-mem-grp .rb-mem-sub>.rb-mem-sec>h3{display:none}
.rb-mem4 .rb-mem-sub.is-lore{background:color-mix(in srgb,var(--rb-text) 3%,transparent)!important;box-shadow:none}
.rb-mem4 .rb-mem-sub.is-lore{padding:0!important}
.rb-mem4 .rb-mem-sub.is-lore>summary{display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:11px 40px 11px 16px;position:relative}
.rb-mem4 .rb-mem-sub.is-lore>summary small{font-size:12px;color:var(--rb-mute)}
.rb-mem4 .rb-mem-sub.is-lore>summary::after{content:"›";position:absolute;right:16px;top:50%;transform:translateY(-50%);color:var(--rb-mute);font-size:18px;transition:transform .15s}
.rb-mem4 .rb-mem-sub.is-lore[open]>summary::after{transform:translateY(-50%) rotate(90deg)}
.rb-mem4 .rb-mem-sub.is-lore>:not(summary){margin:12px 16px}
.rb-lite .rb-mem4 .rb-mem-sub[open]{box-shadow:none}

/* 옵션 칸 위쪽: 오른쪽(인물 위키 설정·NSFW 설정·프롬프트)이 왼쪽 기억 옵션과 같은 높이 — 두 줄 카드가 남는 높이를 나눠 가짐 */
@media (min-width:761px){.rb-mem4-optrow{align-items:stretch}.rb-mem4-optrow>.rb-mem4-col>.rb-mem-options{height:100%;box-sizing:border-box}}
.rb-mem4-side .rb-me-entry{flex:1 1 0;align-items:center;padding:16px 18px;min-height:96px;margin:0}
.rb-mem4-side .rb-me-entry .t{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:15px}
.rb-mem4-side .rb-me-entry .t small{font-weight:400;font-size:12.5px;line-height:1.55;color:var(--rb-sub)}
.rb-mem4-side .rb-me-entry .go{align-self:center}
.rb-mem4-side>.rb-mem-integrated-settings{flex:none}
@media (max-width:760px){.rb-mem4-optrow>.rb-mem4-side{order:-1}.rb-mem4-side .rb-me-entry{min-height:0;flex:none}}

/* 인물 위키 설정(.rb-pot-page)·NSFW 설정(.rb-ero-page): 라이트바 컨셉. 큰 카드 = 초록(상태), 나머지 카드 = 화면 색 막대,
   카드 제목 앞 작은 색 막대, 칸 고르기는 장기 기억 칸 단추와 같은 네온, 카드 속 카드는 옅게 */
.rb-pot-page{--k:#6f9dff}.rb-ero-page{--k:#ff6b9a}
:is(.rb-pot-page,.rb-ero-page)>.rb-card,:is(.rb-pot-page,.rb-ero-page)>div>.rb-card,:is(.rb-pot-page,.rb-ero-page)>div>section.rb-card,#rb-erosync-adult>.rb-card{position:relative;padding-left:24px!important}
:is(.rb-pot-page,.rb-ero-page)>.rb-card::before,:is(.rb-pot-page,.rb-ero-page)>div>.rb-card::before,#rb-erosync-adult>.rb-card::before{content:"";position:absolute;left:0;top:14px;width:4px;height:36px;border-radius:0 4px 4px 0;background:var(--k);box-shadow:0 0 10px var(--k);pointer-events:none}
:is(#rb-pot-hero,#rb-erosync){--k:#5fe0a8}
:is(.rb-pot-page,.rb-ero-page) .rb-card>h3{display:flex;align-items:center;gap:8px;font-size:15px}
:is(.rb-pot-page,.rb-ero-page) .rb-card .rb-card{background:color-mix(in srgb,var(--rb-text) 3%,transparent)!important;box-shadow:none!important;border:1px solid var(--rb-line2)!important;padding-left:14px!important}
:is(.rb-pot-page,.rb-ero-page) .rb-card .rb-card::before{display:none}
:is(.rb-pot-page,.rb-ero-page) .rb-card .rb-card>h3::before{content:"";width:3px;height:14px;border-radius:3px;background:var(--k);flex:none}
:is(.rb-pot-page,.rb-ero-page) .rb-muted{line-height:1.55}
:is(.rb-pot-page,.rb-ero-page) .rb-seg{border-radius:999px;padding:4px;gap:2px;border:1px solid var(--rb-line2);background:var(--rb-card,transparent)}
:is(.rb-pot-page,.rb-ero-page) .rb-seg button{border-radius:999px;border:0;background:none;color:var(--rb-sub);font-size:13px;padding:7px 14px}
:is(.rb-pot-page,.rb-ero-page) .rb-seg button[aria-checked=true]{color:var(--rb-text);font-weight:700;background:color-mix(in srgb,var(--k) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--k) 60%,transparent),0 0 10px color-mix(in srgb,var(--k) 28%,transparent)}
.rb-lite :is(.rb-pot-page,.rb-ero-page) .rb-card::before,.rb-lite :is(.rb-pot-page,.rb-ero-page) .rb-seg button{box-shadow:none!important}
@media (max-width:760px){:is(.rb-pot-page,.rb-ero-page)>.rb-card,:is(.rb-pot-page,.rb-ero-page)>div>.rb-card{padding-left:20px!important}}
`;
