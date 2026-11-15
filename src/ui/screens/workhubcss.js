// 2.2.0 작업실 개요(3번 목업): 하는 일별 묶음 카드(라이트바) 4개 → 최근 연 것·고정. 가벼운 화면은 빛만 끈다.
export var WORKHUB_CSS = `
.rb-hub.rb-whub{max-width:none}
.rb-wgroups{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.rb-wside{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:16px}
.rb-wgroup{position:relative;padding:18px 20px 12px 24px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,transparent);min-width:0}
.rb-wgroup::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--kg);box-shadow:0 0 10px var(--k)}
.rb-wgroup .hd{display:flex;align-items:center;gap:12px;margin-bottom:4px}
.rb-wgroup .hd .ico{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;flex:none;background:linear-gradient(135deg,color-mix(in srgb,var(--k) 60%,transparent),color-mix(in srgb,var(--k) 30%,transparent));border:1px solid color-mix(in srgb,var(--k) 55%,transparent);color:color-mix(in srgb,var(--k) 25%,white);box-shadow:0 0 8px color-mix(in srgb,var(--k) 35%,transparent)}
.rb-wgroup .hd .t{display:flex;flex-direction:column;flex:1;min-width:0}.rb-wgroup .hd b{font-size:15px}.rb-wgroup .hd small{color:var(--rb-sub);font-size:12.5px}
.rb-wwarn{font-size:11.5px;padding:2px 9px;border-radius:999px;color:#f5c451;background:color-mix(in srgb,#f5c451 14%,transparent);border:1px solid color-mix(in srgb,#f5c451 45%,transparent);white-space:nowrap}
.rb-wrow{display:flex;align-items:center;gap:8px;border-top:1px solid var(--rb-line);min-width:0}
.rb-wgroup .hd+.rb-wrow{border-top:0}
.rb-wrow .rb-hubrow{flex:1;min-width:0;border:0;background:none;padding:10px 0;gap:10px;align-items:center;display:flex;text-align:left;color:inherit;font:inherit;cursor:pointer}
.rb-wrow .rb-hubrow .ico{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;flex:none;color:var(--k);background:color-mix(in srgb,var(--k) 10%,transparent);border:1px solid color-mix(in srgb,var(--k) 40%,transparent)}
.rb-wrow .rb-hubrow .t{display:flex;flex-direction:column;min-width:0}.rb-wrow .rb-hubrow b{font-size:13.5px;font-weight:650}
.rb-wrow .rb-hubrow small{color:var(--rb-sub);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-wpin{width:28px;height:28px;border-radius:8px;border:1px solid transparent;background:none;color:var(--rb-sub);display:grid;place-items:center;flex:none;cursor:pointer;opacity:.45}
.rb-wpin.on{opacity:1;color:#f5c451;border-color:color-mix(in srgb,#f5c451 45%,transparent)}
@media (hover:hover){.rb-wpin:hover{opacity:1}.rb-wrow .rb-hubrow:hover b{color:var(--k)}}
.rb-wrow .rb-hubrow:focus-visible,.rb-wpin:focus-visible{outline:2px solid var(--k);outline-offset:2px;border-radius:8px}
.rb-wmeter{width:72px;height:6px;border-radius:9px;background:var(--rb-hover);overflow:hidden;flex:none}.rb-wmeter i{display:block;height:100%;background:var(--kg)}
.rb-wdot{width:16px;height:16px;border-radius:50%;flex:none}
.rb-wempty{color:var(--rb-sub);font-size:13px;margin:6px 0 8px}
.rb-wgroup.k-make{--k:#ff8a5c;--kg:linear-gradient(180deg,#ffb36b,#ff7a59)}
.rb-wgroup.k-look{--k:#e98bd6;--kg:linear-gradient(180deg,#ff8ec6,#8a7bff)}
.rb-wgroup.k-link{--k:#6f9dff;--kg:linear-gradient(180deg,#7fd4ff,#5b8cff)}
.rb-wgroup.k-fix,.rb-wgroup.k-recent{--k:#3fcfa6;--kg:linear-gradient(180deg,#6ff0c4,#38b6a0)}
.rb-wgroup.k-pin{--k:#f5c451;--kg:linear-gradient(180deg,#ffe08a,#f5b43c)}
.rb-skin-glass .rb-wgroup{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
.rb-lite .rb-wgroup::before,.rb-lite .rb-wgroup .hd .ico{box-shadow:none}
@media (max-width:760px){.rb-wgroups,.rb-wside{grid-template-columns:1fr;gap:12px}.rb-wside{margin-top:12px}.rb-wgroup{padding:16px 14px 10px 18px}}
/* 꾸미기(3번 B+C): 글래스 테마 갤러리 큰 칸 + 접는 목록 */
.rb-look-galh{display:flex;align-items:baseline;gap:10px;justify-content:space-between}
.rb-look-gal .rb-gpicks{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px;margin-top:12px}
.rb-look-gal .rb-gpick{position:relative;height:auto;min-height:84px;padding:10px 12px;border-radius:14px;flex-direction:column;align-items:flex-start;justify-content:flex-end;gap:0;overflow:hidden;color:#fff;font-weight:650;text-shadow:0 1px 3px rgba(0,0,0,.45);border-color:transparent;background:none}
.rb-look-gal .rb-gpick i{position:absolute;inset:0;width:auto;height:auto;border-radius:0;z-index:-2}
.rb-look-gal .rb-gpick::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.35));z-index:-1}
.rb-look-gal .rb-gpick{isolation:isolate;min-height:72px}
.rb-look-gal:not(.all) .rb-gpick:nth-child(n+9):not([aria-pressed=true]){display:none}
.rb-look-galmore{display:flex;justify-content:center;margin-top:10px}
.rb-look-gal .rb-gpick[aria-pressed=true]{box-shadow:0 0 0 2px var(--rb-text),0 0 14px var(--rb-acc);color:#fff}
.rb-look-list{padding-top:6px;padding-bottom:6px}
.rb-lacc{border-top:1px solid var(--rb-line)}.rb-lacc:first-child{border-top:0}
.rb-lacc > summary{display:flex;align-items:center;gap:12px;padding:12px 0;cursor:pointer;list-style:none;font-weight:650}
.rb-lacc > summary::-webkit-details-marker{display:none}
.rb-lacc > summary .ico{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;flex:none;color:#e98bd6;background:color-mix(in srgb,#e98bd6 10%,transparent);border:1px solid color-mix(in srgb,#e98bd6 45%,transparent)}
.rb-lacc > summary .t{flex:1;min-width:0}
.rb-lacc > summary .v{color:var(--rb-sub);font-weight:500;font-size:12.5px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:45%}
.rb-lacc > summary .v .sw{width:14px;height:14px;border-radius:50%;flex:none}
.rb-lacc > summary .chev{color:var(--rb-sub);transition:transform .15s;display:grid}
.rb-lacc[open] > summary .chev{transform:rotate(180deg)}
.rb-lacc > summary:focus-visible{outline:2px solid var(--rb-acc);outline-offset:2px;border-radius:8px}
.rb-lacc-b{display:flex;flex-direction:column;gap:14px;padding:2px 0 16px 44px;min-width:0}
.rb-look-reset{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--rb-line);padding:12px 0}
@media (max-width:760px){.rb-lacc-b{padding-left:0}.rb-look-gal .rb-gpicks{grid-template-columns:repeat(2,1fr)}.rb-lacc > summary .v{max-width:40%}}
/* 더스크 스텔스(3번 A): 큰 미리보기 넘기기 + 모양 칩 */
.rb-stx{position:relative;display:flex;flex-direction:column;gap:10px;padding:18px 20px 16px 24px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,transparent)}
.rb-stx::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:linear-gradient(180deg,#ffb36b,#ff7a59);box-shadow:0 0 10px #ff8a5c}
.rb-stx-top{display:flex;align-items:baseline;gap:10px;justify-content:center}.rb-stx-top b{font-size:17px}
.rb-stx-on{font-size:11.5px;padding:1px 9px;border-radius:999px;color:#5fe0a8;border:1px solid color-mix(in srgb,#5fe0a8 50%,transparent);align-self:center}
.rb-stx-view{display:grid;grid-template-columns:40px minmax(0,1fr) 40px;align-items:center;gap:10px}
.rb-stx-nav{width:40px;height:40px;border-radius:50%;border:1px solid var(--rb-line2);background:var(--rb-surf);color:var(--rb-text);display:grid;place-items:center;cursor:pointer}
.rb-stx-nav.next svg{transform:scaleX(-1)}
.rb-stx-prev{border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.55;min-height:190px;box-shadow:0 6px 20px rgba(0,0,0,.18);max-width:560px;width:100%;justify-self:center}
.rb-stx-prev .u{align-self:flex-end;max-width:78%;padding:9px 13px;border-radius:var(--r)}
.rb-stx-prev .a{max-width:92%}
.rb-stx-prev .in{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid;border-radius:var(--ir);padding:9px 10px 9px 15px}
.rb-stx-prev .in i{width:24px;height:24px;border-radius:50%;flex:none}
.rb-stx-desc{text-align:center}
.rb-stx-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.rb-stx-chip{padding:6px 13px;border-radius:999px;border:1px solid var(--rb-line2);background:var(--rb-surf);color:var(--rb-sub);font:inherit;font-size:12.5px;cursor:pointer}
.rb-stx-chip[aria-pressed=true]{color:var(--rb-text);font-weight:700;border-color:var(--rb-sel-ring,var(--rb-acc));box-shadow:0 0 0 1px var(--rb-sel-ring,var(--rb-acc))}
.rb-skin-glass .rb-stx{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
.rb-lite .rb-stx::before{box-shadow:none}
@media (max-width:760px){.rb-stx{padding:16px 14px 14px 18px}.rb-stx-view{grid-template-columns:32px minmax(0,1fr) 32px;gap:6px}.rb-stx-nav{width:32px;height:32px}}
/* 도구(3번 A): 큰 아이콘 타일 */
.rb-tools3-grid:has(.rb-tooltiles){grid-template-columns:minmax(0,1fr) !important;max-width:none}
.rb-tooltiles{display:flex;flex-direction:column;gap:10px}.rb-tooltiles > .h{font-size:13px;font-weight:700;color:var(--rb-sub)}
.rb-tooltiles .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
.rb-tooltile{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:16px 16px 16px 20px;min-height:128px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,var(--rb-surf));color:var(--rb-text);font:inherit;text-align:left;cursor:pointer}
.rb-tooltile::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--kg);box-shadow:0 0 10px var(--k)}
.rb-tooltile .ico{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;margin-bottom:6px;background:linear-gradient(135deg,color-mix(in srgb,var(--k) 60%,transparent),color-mix(in srgb,var(--k) 30%,transparent));border:1px solid color-mix(in srgb,var(--k) 55%,transparent);color:color-mix(in srgb,var(--k) 25%,white);box-shadow:0 0 8px color-mix(in srgb,var(--k) 35%,transparent)}
.rb-tooltile b{font-size:14px}.rb-tooltile small{color:var(--rb-sub);font-size:12.5px;line-height:1.45}
@media (hover:hover){.rb-tooltile:hover{border-color:color-mix(in srgb,var(--k) 45%,transparent);box-shadow:0 0 16px color-mix(in srgb,var(--k) 22%,transparent)}}
.rb-tooltile:focus-visible{outline:2px solid var(--k);outline-offset:2px}
.rb-tooltile.k-make{--k:#ff8a5c;--kg:linear-gradient(180deg,#ffb36b,#ff7a59)}.rb-tooltile.k-look{--k:#e98bd6;--kg:linear-gradient(180deg,#ff8ec6,#8a7bff)}
.rb-tooltile.k-link{--k:#6f9dff;--kg:linear-gradient(180deg,#7fd4ff,#5b8cff)}.rb-tooltile.k-fix{--k:#3fcfa6;--kg:linear-gradient(180deg,#6ff0c4,#38b6a0)}.rb-tooltile.k-pin{--k:#f5c451;--kg:linear-gradient(180deg,#ffe08a,#f5b43c)}
.rb-skin-glass .rb-tooltile{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
.rb-lite .rb-tooltile::before,.rb-lite .rb-tooltile .ico{box-shadow:none}
@media (max-width:760px){.rb-tooltiles .grid{grid-template-columns:1fr 1fr;gap:10px}.rb-tooltile{min-height:112px;padding:14px 12px 14px 16px}.rb-tooltile small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
/* 개발(3번 보충): 유리 카드 라이트바 · 바뀐 곳 미리보기 */
.rb-devcard{position:relative;padding-left:22px !important}
.rb-devcard::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:linear-gradient(180deg,#6ff0c4,#38b6a0);box-shadow:0 0 10px #3fcfa6}
.rb-skin-glass .rb-devcard{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
.rb-lite .rb-devcard::before{box-shadow:none}
.rb-dev-diff{list-style:none;margin:0;padding:8px 10px;border-radius:10px;background:var(--rb-hover);display:flex;flex-direction:column;gap:4px;font-size:12.5px}
.rb-dev-diff li{display:flex;gap:8px;align-items:center;min-width:0}.rb-dev-diff li > span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-dev-diff .k{font-size:11px;font-weight:700;padding:0 7px;border-radius:999px;flex:none;color:#6f9dff;border:1px solid color-mix(in srgb,#6f9dff 45%,transparent)}
.rb-dev-diff .k.added{color:#5fe0a8;border-color:color-mix(in srgb,#5fe0a8 45%,transparent)}.rb-dev-diff .k.removed{color:#ff8a8a;border-color:color-mix(in srgb,#ff8a8a 45%,transparent)}.rb-dev-diff .k.conflict{color:#f5c451;border-color:color-mix(in srgb,#f5c451 45%,transparent)}
.rb-dev-diff .more{color:var(--rb-sub)}
`;
