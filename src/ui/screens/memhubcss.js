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
`;
