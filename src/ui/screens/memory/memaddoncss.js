// 2.2.6 장기기억 애드온이 직접 넣는 CSS(애인 분홍·새 감정 색, 게이지 배수 카드, 관계도 시점 막대·관계도 바꾸기 단추).
// 코어 styles.js에 두면 애드온만 올려서는 반영되지 않으므로, 화면을 그릴 때 한 번 <style>로 붙인다.
import { h } from "../../dom.js";

export const MEM_ADDON_CSS = `.e-attraction{background:#ff6fae}.e-possess{background:#d94f9b}.e-exclusive{background:#b8408a}.rb-wk2-who.lover,.rb-wk2-gl.lover{border-color:#ff6fae!important;background:color-mix(in srgb,#ff6fae 16%,transparent)!important;color:inherit}.rb-wk2-who.lover b,.rb-wk2-gl.lover b{color:#ff4f9a}.rb-wk2-who.lover[aria-pressed="true"]{border:2px solid #ff4f9a!important}.rb-wk2-lovercard:not(.off){border-color:#ff6fae!important;background:color-mix(in srgb,#ff6fae 10%,var(--rb-card,transparent))!important}.rb-wk2-lovercard:not(.off) .rb-wk2-ch b{color:#ff4f9a}
.rb-gauge-card{display:flex;flex-direction:column;gap:10px;padding:16px 18px}
.rb-gauge-head{display:flex;gap:10px;align-items:flex-start}.rb-gauge-head .t{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:15px}.rb-gauge-head .t small{font-weight:400;font-size:12.5px;line-height:1.55;color:var(--rb-sub)}
.rb-gauge-row{display:grid;grid-template-columns:minmax(90px,1fr) 2fr auto;gap:10px;align-items:center}.rb-gauge-row .t{display:flex;flex-direction:column;font-size:13.5px}.rb-gauge-row .t small{font-size:11.5px;color:var(--rb-mute)}
.rb-gauge-row input[type=range]{width:100%;accent-color:var(--rb-acc)}.rb-gauge-row .v{min-width:3.2em;text-align:right;font-variant-numeric:tabular-nums}
@media (max-width:760px){.rb-gauge-row{grid-template-columns:1fr auto}.rb-gauge-row input[type=range]{grid-column:1/-1;grid-row:2}}
.rb-rm-modes{position:absolute;top:calc(10px + var(--rb-ctl-sm) + 8px);right:10px;z-index:2;display:flex;flex-direction:column;gap:6px;align-items:flex-end}
.rb-rm-mode{position:relative;overflow:hidden;padding:6px 12px;border-radius:999px;border:1px solid var(--rb-line3);background:var(--rb-surf);color:var(--rb-sub);font:600 12.5px/1.2 inherit;cursor:pointer;transition:transform .25s cubic-bezier(.34,1.8,.5,1),background .2s,color .2s,border-color .2s,box-shadow .2s}
.rb-rm-mode:active{transform:scale(.92)}
.rb-rm-mode[aria-pressed=true]{color:#fff;border-color:transparent;transform:scale(1.06)}
.rb-rm-mode.m-affinity[aria-pressed=true]{background:linear-gradient(135deg,var(--rb-acc),var(--rb-rose));box-shadow:0 4px 14px color-mix(in srgb,var(--rb-acc) 45%,transparent)}
.rb-rm-mode.m-romance[aria-pressed=true]{background:linear-gradient(135deg,#ff7ab8,#ff2f86);box-shadow:0 4px 16px rgba(255,64,140,.5)}
.rb-rm-turnbar{position:absolute;left:12px;right:12px;bottom:10px;z-index:2;display:flex;align-items:center;gap:10px;padding:6px 12px;border-radius:999px;background:var(--rb-surf);border:1px solid var(--rb-line2)}
.rb-rm-turnbar input[type=range]{flex:1;min-width:60px;height:6px;border-radius:6px;appearance:none;-webkit-appearance:none;background:linear-gradient(90deg,var(--rb-acc) var(--p,100%),color-mix(in srgb,var(--rb-text) 14%,transparent) var(--p,100%));cursor:pointer}
.rb-rm-romance .rb-rm-turnbar input[type=range]{background:linear-gradient(90deg,#ff4f9a var(--p,100%),color-mix(in srgb,var(--rb-text) 14%,transparent) var(--p,100%))}
.rb-rm-turnbar input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid var(--rb-acc);box-shadow:0 2px 6px rgba(0,0,0,.25);transition:transform .15s}
.rb-rm-turnbar input[type=range]:active::-webkit-slider-thumb{transform:scale(1.25)}
.rb-rm-turnbar input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--rb-acc)}
.rb-rm-turnbar input[type=range]:disabled{opacity:.4;cursor:default}
.rb-rm-turnlbl{flex:none;width:6.2em;font-size:12px;text-align:right;white-space:nowrap;overflow:hidden;color:var(--rb-sub);font-variant-numeric:tabular-nums;font-weight:700}.rb-rm-past .rb-rm-turnlbl{color:var(--rb-warn)}
.rb-rm-turnnow{flex:none;width:4.6em;border:0;background:none;color:var(--rb-acc);font:600 12px inherit;cursor:pointer;white-space:nowrap;text-align:center}.rb-rm-turnnow[hidden]{display:inline-block!important;visibility:hidden}   /* 시점 막대 폭이 바뀌어 떨리지 않게 글자 칸 폭 고정 */
.rb-rm-stage .rb-rm-legend{bottom:56px}
.rb-rm-stage.rb-rm-swap canvas{animation:rbRmSwap .55s cubic-bezier(.34,1.56,.64,1)}
@keyframes rbRmSwap{0%{transform:scale(1)}30%{transform:scale(.94) rotate(-1.2deg);filter:saturate(1.6) brightness(1.08)}65%{transform:scale(1.025) rotate(.4deg)}100%{transform:none;filter:none}}
.rb-rm-romance .rb-rm-stage{box-shadow:inset 0 0 80px rgba(255,79,154,.12)}
@media (prefers-reduced-motion:reduce){.rb-rm-stage.rb-rm-swap canvas{animation:none}.rb-rm-mode{transition:none}}
.rb-seed-dlg{width:min(640px,96vw);max-height:88vh;overflow:auto;display:flex;flex-direction:column;gap:10px}
.rb-seed-h4{margin:6px 0 0;font-size:13px;color:var(--rb-sub)}.rb-seed-sw{padding:8px 2px}
.rb-seed-pools{display:flex;flex-direction:column;gap:12px}.rb-seed-kind{border:1px solid var(--rb-line2);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}
.rb-seed-kh{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.rb-seed-cat{display:flex;flex-direction:column;gap:6px}
.rb-seed-ch{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;font-weight:700;color:var(--rb-sub)}
.rb-seed-chips{display:flex;flex-wrap:wrap;gap:6px}
.rb-seed-chip{display:inline-flex;align-items:center;border-radius:999px;border:1px solid var(--rb-line3);background:var(--rb-surf);opacity:.55;transition:opacity .15s,border-color .15s,background .15s}
.rb-seed-chip.on{opacity:1;border-color:color-mix(in srgb,#ff6fae 60%,transparent);background:color-mix(in srgb,#ff6fae 12%,var(--rb-surf))}
.rb-seed-chip.mine{border-style:dashed}
.rb-seed-chip button{border:0;background:none;color:inherit;font:12.5px/1.3 inherit;padding:5px 10px;cursor:pointer;text-align:left}
.rb-seed-chip button.x{padding:5px 9px 5px 0;color:var(--rb-mute)}
.rb-seed-add{display:grid;grid-template-columns:minmax(110px,auto) 1fr auto;gap:6px}
@media (max-width:560px){.rb-seed-add{grid-template-columns:1fr auto}.rb-seed-add select{grid-column:1/-1}}
.rb-wk2-tl{margin:0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:6px;border-left:2px solid color-mix(in srgb,#ff6fae 50%,transparent);padding-left:12px}
.rb-wk2-tl li{display:flex;flex-direction:column;gap:1px;position:relative}.rb-wk2-tl li::before{content:"";position:absolute;left:-17px;top:6px;width:8px;height:8px;border-radius:50%;background:#ff6fae}
.rb-wk2-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;align-items:start}
.rb-wk2-empty{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:12px 16px;border:1px dashed var(--rb-line3);border-radius:var(--rb-r3,14px)}.rb-wk2-emptybody{flex-basis:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.rb-wk2-duel{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,260px) minmax(0,1fr);gap:12px;align-items:start}
.rb-wk2-duelmid{display:flex;flex-direction:column;gap:10px;min-width:0}.rb-wk2-duelav{display:flex;align-items:center;justify-content:center;gap:10px;padding:6px 0}.rb-wk2-duelav .heart{font-size:22px}
.lay-a .rb-wk2-tl,.rb-wk2-cbody .rb-wk2-tl{flex-direction:row;overflow-x:auto;border-left:0;border-top:2px solid color-mix(in srgb,#ff6fae 50%,transparent);padding:10px 0 4px;gap:18px}
.lay-a .rb-wk2-tl li,.rb-wk2-cbody .rb-wk2-tl li{flex:none;min-width:110px;max-width:200px}.lay-a .rb-wk2-tl li::before,.rb-wk2-cbody .rb-wk2-tl li::before{left:0;top:-15px}
@container wk2 (max-width:760px){.rb-wk2-duel{grid-template-columns:1fr}.rb-wk2-duelmid{order:-1}}
@media (max-width:760px){.rb-wk2-duel{grid-template-columns:1fr}.rb-wk2-duelmid{order:-1}}
.rb-wk2-bwrap{display:grid;grid-template-columns:220px minmax(0,1fr);gap:12px;align-items:start}
.rb-wk2-side{display:flex;flex-direction:column;gap:6px;position:sticky;top:0}
.rb-wk2-sidewho{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:14px;border:1px solid var(--rb-line);background:var(--rb-surf);color:inherit;text-align:left;cursor:pointer;font:inherit}
.rb-wk2-sidewho[aria-pressed="true"]{border:2px solid var(--rb-acc,#c58bf5)}.rb-wk2-sidewho.lover[aria-pressed="true"]{border-color:#ff4f9a}.rb-wk2-sidewho.lover b{color:#ff4f9a}
.rb-wk2-sidewho .t{display:flex;flex-direction:column;gap:2px;min-width:0}.rb-wk2-mini{display:flex;gap:3px;margin-top:2px}.rb-wk2-mini i{display:block;height:4px;border-radius:4px;min-width:2px}
.rb-wk2-bmain{display:flex;flex-direction:column;gap:10px;min-width:0}
.rb-wk2-acc{border:1px solid var(--rb-line);border-radius:var(--rb-r3,14px);background:var(--rb-glass-bg,var(--rb-surf))}
.rb-wk2-acc>summary{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:14px 16px;cursor:pointer;list-style:none}.rb-wk2-acc>summary::-webkit-details-marker{display:none}
.rb-wk2-acc .arr,.rb-wk2-crowh .arr{width:8px;height:8px;border-right:2px solid var(--rb-sub);border-bottom:2px solid var(--rb-sub);transform:rotate(-45deg);transition:transform .15s}.rb-wk2-acc[open] .arr,.rb-wk2-crow.open .arr{transform:rotate(45deg)}
.rb-wk2-accb{display:flex;flex-direction:column;gap:12px;padding:0 16px 16px}
@container wk2 (max-width:760px){.rb-wk2-bwrap{grid-template-columns:1fr}.rb-wk2-side{flex-direction:row;overflow-x:auto;position:static}.rb-wk2-sidewho{flex:none}}
@media (max-width:760px){.rb-wk2-bwrap{grid-template-columns:1fr}.rb-wk2-side{flex-direction:row;overflow-x:auto;position:static}.rb-wk2-sidewho{flex:none}}
.rb-wk2[data-tab="one"] .rb-wk2-sum,.rb-wk2[data-tab="one"] .rb-wk2-pane{display:flex!important}
.rb-wk2-toc{position:sticky;top:0;z-index:3;display:flex;gap:6px;overflow-x:auto;padding:8px 0;background:linear-gradient(var(--rb-win,transparent) 70%,transparent)}
.rb-wk2-one{display:flex;flex-direction:column;gap:18px}.rb-wk2-sec{display:flex;flex-direction:column;gap:10px;scroll-margin-top:52px}.rb-wk2-sec>h4{margin:0;font-size:15px}
.rb-wk2-crel{display:flex;flex-direction:column;gap:8px}.rb-wk2-crow{padding:0!important}
.rb-wk2-crowh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%;padding:12px 16px;background:none;border:0;color:inherit;font:inherit;text-align:left;cursor:pointer}
.rb-wk2-crowh .bars{flex:1;min-width:180px;display:flex;flex-direction:column;gap:4px}
.rb-wk2-cbody{display:flex;flex-direction:column;gap:12px;padding:0 16px 16px}
.rb-mem3.rb-mem-dgrid{display:flex!important;flex-direction:column;gap:14px}
.rb-mem3 .rb-mem-sectabs{flex-direction:row!important;position:static!important;overflow-x:auto;gap:4px;padding:4px;border-radius:999px;background:var(--rb-glass-bg,var(--rb-surf));border:1px solid var(--rb-line)}
.rb-mem3 .rb-mem-sectab{width:auto!important;height:36px!important;flex:1 0 auto;justify-content:center!important;border:0!important;background:transparent;border-radius:999px!important;padding:0 14px!important}
.rb-mem3 .rb-mem-sectab[aria-pressed=true]{background:var(--rb-acc-grad);color:var(--rb-on-acc);font-weight:700}
.rb-wk4{display:flex!important;flex-direction:column;align-items:stretch!important;gap:12px;width:100%}.rb-mem3 .rb-mem-secbody,.rb-mem3 .rb-mem-anchor{width:100%}
.rb-wk4-top{display:flex;flex-direction:column;gap:8px}
.rb-wk4-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.rb-wk4-bar .t{font-size:16px;display:flex;align-items:center;gap:6px}.rb-wk4-search{min-width:200px;flex:0 1 280px}
.rb-wk4-auto .rb-wk-auto{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px}.rb-wk4-auto .rb-note{padding:6px 12px;flex:1 1 300px;min-width:0}
.rb-wk4-body{display:flex;flex-direction:column;align-items:stretch;gap:12px;min-width:0;width:100%}.rb-wk4 .rb-wk-main{width:100%}
.rb-wk4 .rb-wk-side{position:static!important;max-height:none!important;padding:0!important;background:none!important;border:0!important}
.rb-wk4 .rb-wk-list{flex-direction:row!important;overflow-x:auto;gap:8px;padding:2px 2px 6px}
.rb-wk4 .rb-wk-row{flex:0 0 auto;border-radius:999px!important;padding:4px 14px 4px 4px!important}.rb-wk4 .rb-wk-row small{display:none}
.rb-wk4 .rb-wk-row.lover{border-color:#ff6fae!important}.rb-wk4 .rb-wk-row.lover .name::after{content:" 💗"}
.rb-wk4.lay-B:not(.lay-B4) .rb-wk4-body{display:grid;grid-template-columns:200px minmax(0,1fr);align-items:start}
.rb-wk4.lay-B:not(.lay-B4) .rb-wk-list{flex-direction:column!important;position:sticky;top:0}.rb-wk4.lay-B:not(.lay-B4) .rb-wk-row{border-radius:14px!important;padding:8px 10px!important}.rb-wk4.lay-B:not(.lay-B4) .rb-wk-row small{display:block}
@media (max-width:760px){.rb-wk4.lay-B:not(.lay-B4) .rb-wk4-body{display:flex}.rb-wk4.lay-B:not(.lay-B4) .rb-wk-list{flex-direction:row!important;position:static}}
.rb-wk4-hero{position:relative;display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:16px 18px 16px 22px;border-radius:var(--rb-r4,20px);border:1px solid var(--rb-line);background:var(--rb-glass-bg,var(--rb-surf))}
.rb-wk4-hero::before{content:"";position:absolute;left:0;top:16px;bottom:16px;width:4px;border-radius:0 4px 4px 0;background:linear-gradient(#e98bd6,#c58bf5);box-shadow:0 0 10px #e98bd6}
.rb-wk4-hero>.rb-avatar,.rb-wk4-hero>.rb-mem-av{transform:scale(1.35);margin:0 8px}
.rb-wk4-hname{flex:1 1 280px;min-width:0;display:flex;flex-direction:column;gap:6px}.rb-wk4-hname .row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.rb-wk4-hname h3{margin:0;font-size:20px}.rb-wk4-hname p{margin:0;white-space:normal}
.rb-wk2-chip.lover{background:color-mix(in srgb,#ff6fae 18%,transparent);color:#d23c8a}
.rb-wk4-kpi{display:flex;gap:8px;flex-wrap:wrap}.rb-wk4-kpi .k{display:flex;flex-direction:column;padding:8px 14px;border-radius:14px;background:var(--rb-surf2);min-width:84px}.rb-wk4-kpi b{font-size:18px}
.rb-wk4-more{position:relative}.rb-wk4-more>summary{list-style:none;cursor:pointer}.rb-wk4-more>summary::-webkit-details-marker{display:none}
.rb-wk4-morebox{position:absolute;right:0;top:calc(100% + 6px);z-index:5;padding:10px;border-radius:14px;background:var(--rb-pop-bg,var(--rb-win));border:1px solid var(--rb-line);box-shadow:var(--rb-shadow)}.rb-wk4-morebox .rb-mem-rowact{display:flex;flex-direction:column;align-items:stretch;gap:6px}
.rb-wk2[data-lay="A"] .rb-wk2-body,.rb-wk2[data-lay^="B"] .rb-wk2-body{display:flex!important;flex-direction:column}
.rb-wk2[data-lay="A"] .rb-wk2-tab[data-t="sum"],.rb-wk2[data-lay^="B"] .rb-wk2-tab[data-t="sum"]{display:block!important}
.rb-wk2[data-lay="A"]:not([data-tab="sum"]) .rb-wk2-sum,.rb-wk2[data-lay^="B"]:not([data-tab="sum"]):not([data-tab="one"]) .rb-wk2-sum{display:none!important}
.rb-wk2[data-lay="A"][data-tab="sum"] .rb-wk2-pane,.rb-wk2[data-lay^="B"][data-tab="sum"] .rb-wk2-pane{display:none!important}
.rb-wk2[data-lay="A"][data-tab="sum"] .rb-wk2-sum{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start}
.rb-wk2-bchips{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 6px}.rb-wk2-bchips .rb-wk2-sidewho{flex:none;min-width:150px}
.rb-wk2-bmain.panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:12px;align-items:start}.rb-wk2-bmain.panels>.rb-wk2-empty,.rb-wk2-bmain.panels>[data-acc="feel"]{grid-column:1/-1}
.rb-wk2-acc.panel{padding:0}.rb-wk2-acch{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:14px 16px 10px}
.rb-wk2-acc .rb-wk2-card{box-shadow:none}
.rb-wk2-fold{display:flex;flex-direction:column;gap:10px}.rb-wk2-acc.big>summary{padding:16px 18px;font-size:15px}
.rb-wk2-ibox{display:grid;grid-template-columns:minmax(260px,320px) minmax(0,1fr);gap:16px;align-items:start}
.rb-wk2-iside{display:flex;flex-direction:column;gap:12px;position:sticky;top:0;min-width:0}.rb-wk2-iside .rb-wk4-hero{flex-direction:column;align-items:flex-start;gap:10px}.rb-wk2-iside .rb-wk4-hero>.rb-wk4-more{align-self:stretch}.rb-wk2-iside .rb-wk4-hname{flex:none;width:100%}
.rb-wk2-iside .rb-wk4-hero>.rb-avatar,.rb-wk2-iside .rb-wk4-hero>.rb-mem-av{transform:scale(1.6);margin:10px 14px}
.rb-wk2-imain{display:flex;flex-direction:column;gap:12px;min-width:0}
@media (max-width:760px){.rb-wk2-ibox{grid-template-columns:1fr}.rb-wk2-iside{position:static}}
@container wk2 (max-width:700px){.rb-wk2-ibox{grid-template-columns:1fr}.rb-wk2-iside{position:static}}
.rb-mem3 .rb-mem-sectabs{background:none!important;border:0!important;border-bottom:1px solid var(--rb-line)!important;border-radius:0!important;padding:0!important;gap:2px!important}
.rb-mem3 .rb-mem-sectab{flex:none!important;height:40px!important;border-radius:0!important;padding:0 14px!important;color:var(--rb-sub);border-bottom:2px solid transparent!important;margin-bottom:-1px}
.rb-mem3 .rb-mem-sectab[aria-pressed=true]{background:none!important;color:var(--rb-text)!important;border-bottom-color:#e98bd6!important}
.rb-mem3 .rb-mem-sectab .n{background:var(--rb-surf2)!important;color:var(--rb-sub)!important}.rb-mem3 .rb-mem-sectab[aria-pressed=true] .n{background:#e98bd6!important;color:#fff!important}
.rb-wk4-top{gap:8px}
.rb-wk4-bar{display:flex;align-items:center;gap:10px;flex-wrap:nowrap;padding:8px 8px 8px 14px;border-radius:18px;background:var(--rb-glass-bg,var(--rb-surf));border:1px solid var(--rb-line)}
.rb-wk4-lead{display:flex;align-items:center;gap:6px;flex:none}.rb-wk4-lead .t{font-size:14px}
.rb-wk4-search{display:flex;align-items:center;gap:4px;height:32px;padding:0 10px;border-radius:999px;background:var(--rb-surf2);color:var(--rb-sub);width:110px}.rb-wk4-search input{border:0;background:none;outline:0;min-width:0;width:100%;font:inherit;color:var(--rb-text)}
.rb-wk4-people{flex:1;min-width:0;overflow:hidden;border-left:1px solid var(--rb-line);padding-left:10px}
.rb-wk4-people .rb-wk-list{flex-direction:row!important;flex-wrap:nowrap;overflow-x:auto;gap:6px;padding:2px;scrollbar-width:thin}
.rb-wk4-people .rb-wk-row{flex:none;display:flex;align-items:center;gap:7px;height:36px;padding:0 12px 0 3px!important;border-radius:999px!important;border:1px solid transparent!important;background:transparent!important;box-shadow:none!important}
.rb-wk4-people .rb-wk-row .rb-avatar,.rb-wk4-people .rb-wk-row .rb-mem-av{width:30px!important;height:30px!important;font-size:13px}
.rb-wk4-people .rb-wk-row small{display:none}.rb-wk4-people .rb-wk-row .name{font-size:13.5px;font-weight:600}
.rb-wk4-people .rb-wk-row[aria-pressed=true]{background:color-mix(in srgb,#e98bd6 16%,transparent)!important;border-color:color-mix(in srgb,#e98bd6 70%,transparent)!important}
.rb-wk4-people .rb-wk-row.lover .name::after{content:" ♥";color:#ff4f9a;font-size:12px}
.rb-wk4-people .rb-wk-row::before{display:none!important}
@media (hover:hover){.rb-wk4-people .rb-wk-row:hover{background:var(--rb-surf2)!important}}
.rb-wk4-acts{display:flex;gap:6px;flex:none}.rb-wk4-ico{width:34px;padding:0!important;justify-content:center}
.rb-wk4-status{border-radius:14px;border:1px solid var(--rb-line);background:var(--rb-glass-bg,var(--rb-surf));font-size:13px}
.rb-wk4-status>summary{display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;list-style:none}.rb-wk4-status>summary::-webkit-details-marker{display:none}
.rb-wk4-status .dot{width:8px;height:8px;border-radius:50%;background:#6f9dff;flex:none}.rb-wk4-status.warn .dot{background:#f5c451;box-shadow:0 0 8px #f5c451}
.rb-wk4-status .rb-wk-auto{padding:0 14px 12px;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
@media (max-width:760px){.rb-wk4-bar{flex-wrap:wrap;padding:8px 10px}.rb-wk4-people{order:3;flex-basis:100%;border-left:0;padding-left:0;border-top:1px solid var(--rb-line);padding-top:6px}.rb-wk4-lead{flex:1}.rb-wk4-search{flex:1;width:auto}}
.rb-wk4-lead .t{white-space:nowrap}
.rb-wk2-ibox .rb-wk2-sum2{display:flex;flex-direction:column}
@media (max-width:760px){
.rb-wk2-iside .rb-wk4-hero{flex-direction:row;align-items:center;flex-wrap:wrap}.rb-wk2-iside .rb-wk4-hero>.rb-avatar,.rb-wk2-iside .rb-wk4-hero>.rb-mem-av{transform:scale(1.2);margin:4px 8px}.rb-wk2-iside .rb-wk4-hname{flex:1 1 200px;width:auto}}
.rb-wk4-people .rb-wk-row.me{background:color-mix(in srgb,#6f9dff 14%,transparent)!important;border-color:color-mix(in srgb,#6f9dff 60%,transparent)!important;margin-right:6px}
.rb-wk4-people .rb-wk-row.me .name::before{content:"나";display:inline-block;margin-right:5px;padding:0 6px;border-radius:999px;background:#6f9dff;color:#fff;font-size:10.5px;line-height:17px;vertical-align:1px}
.rb-wk4-people .rb-wk-row.me[aria-pressed=true]{border-color:#6f9dff!important;box-shadow:0 0 0 1px #6f9dff inset!important}
.rb-wk4-people .rb-wk-row.me+.rb-wk-row{margin-left:4px;position:relative}.rb-wk4-people .rb-wk-row.me::after{content:"";position:absolute;right:-7px;top:8px;bottom:8px;width:1px;background:var(--rb-line3)}.rb-wk4-people .rb-wk-row.me{position:relative}
.rb-wk2-imain{container-type:inline-size;container-name:wk4m}
.rb-wk2-imain .rb-wk3{display:flex!important;flex-direction:column;gap:12px}
.rb-wk2-imain .rb-wk3-toc{position:sticky!important;top:0;z-index:4;flex-direction:row!important;gap:6px!important;overflow-x:auto!important;padding:6px 0!important;background:linear-gradient(var(--rb-win,#fff) 75%,transparent)}
.rb-wk2-imain .rb-wk3-toc .lbl{display:none!important}
.rb-wk2-imain .rb-wk3-tocb{border:1px solid var(--rb-line)!important;background:var(--rb-surf)!important;color:var(--rb-text)!important;justify-content:center!important;border-radius:999px!important}
.rb-wk2-imain .rb-wk3-card,.rb-wk2-imain [data-sec]{scroll-margin-top:60px}
.rb-wk2-imain .rb-wk3-grid{display:block!important;column-count:1!important}
@container wk4m (min-width:680px){.rb-wk2-imain .rb-wk3-grid{column-count:2!important;column-gap:12px}.rb-wk2-imain .rb-wk3-grid>[data-sec="prof"],.rb-wk2-imain .rb-wk3-grid>[data-sec="num"],.rb-wk2-imain .rb-wk3-grid>[data-sec="emo"],.rb-wk2-imain .rb-wk3-empty,.rb-wk2-imain .rb-wk3-panel{column-span:all}}
.rb-wk2-imain .rb-wk3-grid>*{break-inside:avoid;margin:0 0 14px;width:100%;box-sizing:border-box}
.rb-wk2-iside .rb-wk2-num{grid-template-columns:minmax(0,1fr) auto!important}.rb-wk2-iside .rb-wk2-num .n{grid-column:1/-1;white-space:normal!important;overflow:visible!important;font-weight:600}.rb-wk2-sum2 .rb-wk2-num .track,.rb-wk2-iside .rb-wk2-num .track{grid-column:1}
@media (min-width:761px){.lay-b4 .rb-wk2-bchips{display:none}}
.rb-wk2-iside .rb-wk2-gl[aria-pressed=true]{outline:2px solid #e98bd6;outline-offset:-2px}
.rb-wk2-imain .rb-wk3,.rb-wk2-imain .rb-wk3-grid{width:100%;align-items:stretch}
.rb-wk3-ihead{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.rb-wk3-ihead b{font-size:12.5px;color:var(--rb-sub);font-weight:700}
.rb-wk3-to{padding:1px 8px;border-radius:999px;background:color-mix(in srgb,#e98bd6 14%,transparent);color:color-mix(in srgb,#e98bd6 60%,var(--rb-text));font-size:11.5px;font-weight:600}
.rb-wk2-imain .rb-wk3-item p{font-size:14px;line-height:1.55;color:var(--rb-text)}
.rb-wk2-toward{display:grid;grid-template-columns:minmax(64px,auto) minmax(80px,1fr) auto;align-items:center;gap:10px;font-size:13.5px}.rb-wk2-toward b{white-space:nowrap}
.rb-wk2-toward .track{position:relative;height:8px;border-radius:4px;background:var(--rb-surf2);overflow:hidden}.rb-wk2-toward .track i{position:absolute;inset:0 auto 0 0;border-radius:4px;background:#ff6fae}
.rb-wk2-imain .rb-wk3-grid>*{margin:0 0 12px!important}
.rb-wk2-imain .rb-wk3-card{padding:14px 16px!important}
.rb-wk2-imain .rb-wk3-card .rb-wk2-ch{margin-bottom:8px}.rb-wk2-imain .rb-wk3-card .rb-wk2-ch b{font-size:14px}
.rb-wk2-imain .rb-wk3-card .rb-wk2-ch .rb-btn.sm{height:28px;padding:0 10px;font-size:12px}
.rb-wk2-imain .rb-wk3-item{padding:8px 10px!important;gap:6px!important;align-items:center!important}
.rb-wk2-imain .rb-wk3-item+.rb-wk3-item{margin-top:6px}
.rb-wk2-imain .rb-wk3-item .rb-btn,.rb-wk2-imain .rb-wk3-item .rb-iconbtn{width:28px;height:28px;min-height:28px;padding:0;border-color:transparent;background:transparent;opacity:.7}
/* ── 2.2.6 위키 B4: 성별 색 ── */
.rb-wk4-people .rb-wk-row.g-f .rb-avatar,.rb-wk4-people .rb-wk-row.g-f .rb-mem-av,.rb-wk2-gl.g-f .rb-avatar,.rb-wk2-gl.g-f .rb-mem-av,.rb-wk4-hero.g-f>.rb-avatar,.rb-wk4-hero.g-f>.rb-mem-av,.rb-wk2-sidewho.g-f .rb-avatar,.rb-wk2-sidewho.g-f .rb-mem-av{background:linear-gradient(135deg,#ffd1ea,#ff9fcf)!important;color:#a3246a!important;border-color:#ff9fcf!important}
.rb-wk4-people .rb-wk-row.g-m .rb-avatar,.rb-wk4-people .rb-wk-row.g-m .rb-mem-av,.rb-wk2-gl.g-m .rb-avatar,.rb-wk2-gl.g-m .rb-mem-av,.rb-wk4-hero.g-m>.rb-avatar,.rb-wk4-hero.g-m>.rb-mem-av,.rb-wk2-sidewho.g-m .rb-avatar,.rb-wk2-sidewho.g-m .rb-mem-av{background:linear-gradient(135deg,#d6e4ff,#8fb2ff)!important;color:#2346a3!important;border-color:#8fb2ff!important}
.rb-wk4-hero.g-f::before{background:linear-gradient(#ff9fcf,#e98bd6)!important;box-shadow:0 0 12px #ff9fcf!important}.rb-wk4-hero.g-m::before{background:linear-gradient(#8fb2ff,#6f9dff)!important;box-shadow:0 0 12px #8fb2ff!important}
.rb-wk4-hero.g-f{background:linear-gradient(160deg,color-mix(in srgb,#ff9fcf 14%,var(--rb-glass-bg,var(--rb-surf))),var(--rb-glass-bg,var(--rb-surf)) 60%)}
.rb-wk4-hero.g-m{background:linear-gradient(160deg,color-mix(in srgb,#8fb2ff 16%,var(--rb-glass-bg,var(--rb-surf))),var(--rb-glass-bg,var(--rb-surf)) 60%)}
.rb-wk4-people .rb-wk-row.g-f[aria-pressed=true]:not(.me){background:color-mix(in srgb,#ff9fcf 18%,transparent)!important;border-color:#ff9fcf!important}
.rb-wk4-people .rb-wk-row.g-m[aria-pressed=true]:not(.me){background:color-mix(in srgb,#8fb2ff 18%,transparent)!important;border-color:#8fb2ff!important}
/* ── 감정 게이지 여러 모양 ── */
.e-affection-c{--c:#ff7a9c}.e-attraction-c{--c:#ff4fa3}.e-trust-c{--c:#3fcfa6}.e-respect-c{--c:#f5b841}.e-dependence-c{--c:#3fb8cf}.e-hostility-c{--c:#ef5350}.e-fear-c{--c:#8b8fa3}.e-possess-c{--c:#d94f9b}.e-exclusive-c{--c:#b8408a}
.rb-gx{display:flex;flex-direction:column;gap:14px}
.rb-gx-rings{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rb-gx-ring{position:relative;display:grid;place-items:center;padding:12px 6px 34px;border-radius:18px;background:color-mix(in srgb,var(--c) 9%,transparent);border:1px solid color-mix(in srgb,var(--c) 30%,transparent)}
.rb-gx-ring svg{width:96px;height:96px;transform:rotate(-90deg)}
.rb-gx-ring circle{fill:none;stroke-width:9;stroke-linecap:round}.rb-gx-ring .bg{stroke:color-mix(in srgb,var(--c) 16%,transparent)}
.rb-gx-ring .fg{stroke:var(--c);stroke-dashoffset:var(--off);filter:drop-shadow(0 0 5px color-mix(in srgb,var(--c) 60%,transparent));animation:rbGxRing .9s cubic-bezier(.2,.8,.2,1) both}
@keyframes rbGxRing{from{stroke-dashoffset:213.6}}
.rb-gx-ring .in{position:absolute;left:0;right:0;top:12px;height:96px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0}.rb-gx-ring .in b{font-size:30px;line-height:1;color:var(--c);font-variant-numeric:tabular-nums}.rb-gx-ring .in small{position:absolute;top:104px;font-size:12.5px;color:var(--rb-text);font-weight:700;white-space:nowrap}
.rb-gx-ring.empty{opacity:.55}.rb-gx-ring .lk{position:absolute;top:6px;right:8px}
.rb-gx-group{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px dashed var(--rb-line)}
.rb-gx-bar{display:grid;grid-template-columns:52px minmax(0,1fr) 22px;align-items:center;gap:10px;font-size:13px}
.rb-gx-bar .track{height:10px;border-radius:6px;background:var(--rb-surf2);overflow:hidden}.rb-gx-bar .track i{display:block;height:100%;border-radius:6px;transform-origin:left;animation:rbGxGrow .7s cubic-bezier(.2,.8,.2,1) both}
.rb-gx-bar small,.rb-gx-pips small{text-align:right;font-variant-numeric:tabular-nums;color:var(--rb-sub)}
@keyframes rbGxGrow{from{transform:scaleX(0)}}
.rb-gx-pips{display:grid;grid-template-columns:52px minmax(0,1fr) 22px;align-items:center;gap:10px;font-size:13px}
.rb-gx-pips .row{display:flex;gap:3px}.rb-gx-pips .row i{flex:1;height:10px;border-radius:3px;background:var(--rb-surf2);max-width:22px}
.rb-gx-pips .row i.on{background:var(--c);animation:rbGxPop .35s both;animation-delay:calc(var(--i) * 35ms)}
.rb-gx-pips.heart .row i{height:12px;border-radius:0;background:var(--rb-line2);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z'/%3E%3C/svg%3E") center/contain no-repeat}
.rb-gx-pips.heart .row i.on{background:var(--c)}
@keyframes rbGxPop{from{transform:scale(.3);opacity:0}}
/* ── 월경·임신 ── */
.rb-cyc{display:flex;flex-direction:column;gap:12px}
.rb-cyc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}
.rb-cyc-stat{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:14px;background:var(--rb-surf2)}.rb-cyc-stat b{font-size:18px;font-variant-numeric:tabular-nums}.rb-cyc-stat small{font-size:11.5px;color:var(--rb-sub)}
.rb-cyc-stat.acc{background:linear-gradient(135deg,color-mix(in srgb,#ff6fae 22%,transparent),color-mix(in srgb,#c58bf5 16%,transparent));color:#c2347e}
.rb-cyc-strip{display:flex;gap:2px;padding:4px 0}.rb-cyc-strip i{flex:1;height:18px;border-radius:4px;background:var(--rb-surf2);position:relative;animation:rbGxPop .3s both}
.rb-cyc-strip i.p{background:#ef6a8a}.rb-cyc-strip i.f{background:color-mix(in srgb,#ff9fcf 70%,transparent)}.rb-cyc-strip i.ov{background:#e94fb1;box-shadow:0 0 8px #e94fb1}
.rb-cyc-strip i.now{outline:2px solid var(--rb-text);outline-offset:1px;z-index:1}.rb-cyc-strip i.now::after{content:"오늘";position:absolute;top:-17px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:700;white-space:nowrap;color:var(--rb-text)}
.rb-cyc-strip{margin-top:14px}
.rb-cyc-legend{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--rb-sub)}.rb-cyc-legend span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.rb-cyc-legend .p::before{background:#ef6a8a}.rb-cyc-legend .f::before{background:#ff9fcf}.rb-cyc-legend .ov::before{background:#e94fb1}.rb-cyc-legend small{margin-left:auto}
.rb-cyc-bar{height:10px;border-radius:6px;background:var(--rb-surf2);overflow:hidden}.rb-cyc-bar .fill{display:block;height:100%;background:linear-gradient(90deg,#ff9fcf,#c58bf5);transform-origin:left;animation:rbGxGrow .8s both}
/* ── 지금 상태 ── */
.rb-ero-now{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}
.rb-ero-now li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:14px;background:var(--rb-surf2);animation:rbWkIn .35s both}
.rb-ero-now .ic{width:32px;height:32px;flex:none;display:grid;place-items:center;border-radius:10px;background:var(--rb-surf);font-size:16px}
.rb-ero-now .t{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}.rb-ero-now .t>small{font-size:11px;color:var(--rb-sub);font-weight:600}
.rb-ero-now li[data-k=rel]{grid-column:1/-1;background:linear-gradient(135deg,color-mix(in srgb,#ff6fae 12%,transparent),var(--rb-surf2))}
.rb-ero-now .ms{display:flex;flex-direction:column;gap:5px;margin-top:4px}
.rb-ero-m{display:grid;grid-template-columns:30px minmax(0,1fr) 26px;align-items:center;gap:8px;font-size:12px}.rb-ero-m .track{height:7px;border-radius:5px;background:var(--rb-surf);overflow:hidden}.rb-ero-m .track i{display:block;height:100%;border-radius:5px;transform-origin:left;animation:rbGxGrow .7s both}
.rb-ero-m.aff i{background:#ff7a9c}.rb-ero-m.att i{background:#ff4fa3}.rb-ero-m.hat i{background:#ef5350}.rb-ero-m b{text-align:right;font-variant-numeric:tabular-nums}
/* ── 전체 다듬기 · 자잘한 움직임 ── */
@keyframes rbWkIn{from{opacity:0;transform:translateY(6px)}}
.rb-wk2-imain .rb-wk2-card,.rb-wk2-imain .rb-wk2-acc,.rb-wk2-imain .rb-wk3-card{animation:rbWkIn .32s cubic-bezier(.2,.8,.2,1) both}
.rb-wk2-imain>*:nth-child(2)>*:nth-child(2){animation-delay:.04s}.rb-wk2-imain>*:nth-child(2)>*:nth-child(3){animation-delay:.08s}.rb-wk2-imain>*:nth-child(2)>*:nth-child(4){animation-delay:.12s}
.rb-wk2-ibox .rb-wk2-card,.rb-wk2-imain .rb-wk3-card,.rb-wk2-ibox .rb-wk2-acc{border-radius:18px;box-shadow:0 1px 2px rgba(60,20,70,.04),0 6px 20px rgba(60,20,70,.05)}
.rb-wk2-ibox .rb-wk2-tabs{padding:4px;gap:4px}.rb-wk2-ibox .rb-wk2-tab{transition:background .2s,color .2s,transform .15s}
@media (hover:hover){.rb-wk4-people .rb-wk-row{transition:transform .15s,background .15s}.rb-wk4-people .rb-wk-row:hover{transform:translateY(-1px)}
.rb-wk2-gl,.rb-wk2-sidewho,.rb-wk3-tocb{transition:transform .15s,box-shadow .15s}.rb-wk2-gl:hover,.rb-wk2-sidewho:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(60,20,70,.08)}}
.rb-wk2-acc[open]>.rb-wk2-accb{animation:rbWkIn .25s both}
.rb-wk2-ibox .rb-wk2-ch b{letter-spacing:-.01em}
.rb-wk4-status .dot{animation:rbPulse 2s ease-in-out infinite}@keyframes rbPulse{50%{opacity:.45}}
.rb-wk4-hero .rb-wk2-chip.lover{animation:rbBeat 2.4s ease-in-out infinite}@keyframes rbBeat{0%,100%{transform:scale(1)}8%{transform:scale(1.08)}16%{transform:scale(1)}24%{transform:scale(1.05)}}
@media (prefers-reduced-motion:reduce){.rb-wk2 *,.rb-wk4 *{animation:none!important;transition:none!important}}
.rb-lite .rb-wk2 *,.rb-lite .rb-wk4 *{animation:none!important}
/* ── 상세 정보: 기록 묶음마다 색·아이콘·항목 모양 ── */
.rb-wk2-imain .rg-overview{--gc:#8a7cff}.rb-wk2-imain .rg-overview .rb-wk2-ch>b::before{content:"👤"}
.rb-wk2-imain .rg-userRelationship{--gc:#ff6fae}.rb-wk2-imain .rg-userRelationship .rb-wk2-ch>b::before{content:"💞"}
.rb-wk2-imain .rg-appraisal{--gc:#f5a742}.rb-wk2-imain .rg-appraisal .rb-wk2-ch>b::before{content:"✨"}
.rb-wk2-imain .rg-speech{--gc:#4fb3ff}.rb-wk2-imain .rg-speech .rb-wk2-ch>b::before{content:"💬"}
.rb-wk2-imain .rg-npc{--gc:#9b8cff}.rb-wk2-imain .rg-npc .rb-wk2-ch>b::before{content:"🕸"}
.rb-wk2-imain .rg-knowledge{--gc:#3fcfa6}.rb-wk2-imain .rg-knowledge .rb-wk2-ch>b::before{content:"📖"}
.rb-wk2-imain .rg-relationship{--gc:#e98bd6}.rb-wk2-imain .rg-relationship .rb-wk2-ch>b::before{content:"🧩"}
.rb-wk2-imain .rg-behavior{--gc:#ff8a5c}.rb-wk2-imain .rg-behavior .rb-wk2-ch>b::before{content:"🔁"}
.rb-wk2-imain .rg-secret{--gc:#7a6a8f}.rb-wk2-imain .rg-secret .rb-wk2-ch>b::before{content:"🔒"}
.rb-wk2-imain .rg-openness{--gc:#ff5f9e}.rb-wk2-imain .rg-openness .rb-wk2-ch>b::before{content:"🌙"}
.rb-wk2-imain .rg-suspicion{--gc:#f0b429}.rb-wk2-imain .rg-suspicion .rb-wk2-ch>b::before{content:"🔍"}
.rb-wk2-imain .rg-etc{--gc:#9aa0ab}.rb-wk2-imain .rg-etc .rb-wk2-ch>b::before{content:"📎"}
.rb-wk2-imain .rb-wk3-rec{position:relative;overflow:hidden;padding-left:20px!important}
.rb-wk2-imain .rb-wk3-rec::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--gc);box-shadow:0 0 10px color-mix(in srgb,var(--gc) 70%,transparent)}
.rb-wk2-imain .rb-wk3-rec::after{content:"";position:absolute;right:-40px;top:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(color-mix(in srgb,var(--gc) 16%,transparent),transparent 70%);pointer-events:none}
.rb-wk2-imain .rb-wk3-rec .rb-wk2-ch>b{display:inline-flex;align-items:center;gap:8px}
.rb-wk2-imain .rb-wk3-rec .rb-wk2-ch>b::before{width:28px;height:28px;display:inline-grid;place-items:center;border-radius:9px;font-size:14px;background:color-mix(in srgb,var(--gc) 16%,transparent);border:1px solid color-mix(in srgb,var(--gc) 40%,transparent)}
.rb-wk2-imain .rb-wk3-rec .rb-wk2-ch>b small{padding:0 7px;border-radius:999px;background:color-mix(in srgb,var(--gc) 16%,transparent);color:color-mix(in srgb,var(--gc) 70%,var(--rb-text));font-size:11px;line-height:18px}
.rb-wk2-imain .rb-wk3-rec .rb-wk3-item{background:color-mix(in srgb,var(--gc) 6%,var(--rb-surf2))!important;border-left:3px solid color-mix(in srgb,var(--gc) 55%,transparent);border-radius:4px 12px 12px 4px!important}
.rb-wk2-imain .rb-wk3-rec .rb-wk3-to{background:color-mix(in srgb,var(--gc) 16%,transparent);color:color-mix(in srgb,var(--gc) 65%,var(--rb-text))}
/* 말투: 말풍선 */
.rb-wk2-imain .rg-speech .rb-wk3-item{border-left:0;border-radius:14px 14px 14px 4px!important;background:color-mix(in srgb,var(--gc) 12%,var(--rb-surf))!important}
.rb-wk2-imain .rg-speech .rb-wk3-item p{font-weight:600}
/* 알고 있는 정보: 인용 */
.rb-wk2-imain .rg-knowledge .rb-wk3-item p::before{content:"“";font:700 22px/0 Georgia,serif;color:var(--gc);vertical-align:-6px;margin-right:3px}
/* 비밀: 점선·잠금 */
.rb-wk2-imain .rg-secret .rb-wk3-item{border:1px dashed color-mix(in srgb,var(--gc) 60%,transparent)!important;border-left:3px solid var(--gc)!important;background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--gc) 6%,var(--rb-surf2)) 0 8px,var(--rb-surf2) 8px 16px)!important}
/* 의심: 노란 경고 */
.rb-wk2-imain .rg-suspicion .rb-wk3-item{background:color-mix(in srgb,var(--gc) 10%,var(--rb-surf2))!important}
.rb-wk2-imain .rg-suspicion .rb-wk3-ihead b::before{content:"⚠ ";color:var(--gc)}
/* 행동 경향: 반복 표시 */
.rb-wk2-imain .rg-behavior .rb-wk3-item p::before{content:"↻ ";color:var(--gc);font-weight:700}
/* 관계 쪽: 하트 점 */
.rb-wk2-imain .rg-userRelationship .rb-wk3-item p::before,.rb-wk2-imain .rg-relationship .rb-wk3-item p::before{content:"♥ ";color:var(--gc);font-size:12px}
/* ── 기본 성격 축: 가운데 기준 + 점 표시 ── */
.rb-wk2-imain .rb-wk3-axes{gap:12px 18px!important}
.rb-wk2-imain .rb-wk3-ax .track{position:relative;height:8px!important;border-radius:6px;overflow:visible!important;background:linear-gradient(90deg,color-mix(in srgb,#6f9dff 30%,transparent),var(--rb-surf2) 50%,color-mix(in srgb,#ff8a5c 30%,transparent))!important}
.rb-wk2-imain .rb-wk3-ax .track::before{content:"";position:absolute;left:50%;top:-3px;bottom:-3px;width:2px;background:var(--rb-line3);border-radius:2px}
.rb-wk2-imain .rb-wk3-ax .track i{opacity:0}
.rb-wk2-imain .rb-wk3-ax .track::after{content:"";position:absolute;left:var(--v);top:50%;width:16px;height:16px;border-radius:50%;transform:translate(-50%,-50%);background:#fff;border:3px solid #e98bd6;box-shadow:0 2px 8px rgba(233,139,214,.5);animation:rbAxIn .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes rbAxIn{from{left:50%;opacity:0}}
.rb-wk2-imain .rb-wk3-ax .l b{padding:0 8px;border-radius:999px;background:color-mix(in srgb,#e98bd6 15%,transparent);color:#c2347e;font-size:12px}
/* ── 수치: 굵은 그라데이션 막대 + 종류별 색 ── */
.rb-wk2-imain .rb-wk3-num{--mc:#e98bd6;padding:10px 12px!important;border-radius:14px!important;background:color-mix(in srgb,var(--mc) 6%,transparent)!important;border:1px solid color-mix(in srgb,var(--mc) 18%,transparent)!important}
.rb-wk2-imain .rb-wk3-num[data-slot=suspicion]{--mc:#f0b429}.rb-wk2-imain .rb-wk3-num[data-slot=affinity]{--mc:#ff6fae}.rb-wk2-imain .rb-wk3-num[data-slot=openness]{--mc:#b77bf5}.rb-wk2-imain .rb-wk3-num[data-slot=trust]{--mc:#3fcfa6}
.rb-wk2-imain .rb-wk3-nums{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px!important}
.rb-wk2-imain .rb-wk3-num .track{height:10px!important;border-radius:6px!important;background:color-mix(in srgb,var(--mc) 12%,var(--rb-surf2))!important}
.rb-wk2-imain .rb-wk3-num .track i{background:linear-gradient(90deg,color-mix(in srgb,var(--mc) 55%,#fff),var(--mc))!important;box-shadow:0 0 8px color-mix(in srgb,var(--mc) 50%,transparent);border-radius:6px;transform-origin:left;animation:rbGxGrow .8s cubic-bezier(.2,.8,.2,1) both}
.rb-wk2-imain .rb-wk3-num .v{color:color-mix(in srgb,var(--mc) 70%,var(--rb-text));font-size:16px}
/* ── 감정: 상대별 카드 ── */
.rb-wk2-imain .rb-wk3-emo{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.rb-emo2{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:16px;border:1px solid var(--rb-line);background:var(--rb-surf);text-align:left;font:inherit;color:inherit;cursor:pointer;transition:transform .15s,box-shadow .15s}
@media (hover:hover){.rb-emo2:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(60,20,70,.08)}}
.rb-emo2 .hd{display:flex;justify-content:space-between;align-items:center}.rb-emo2 .hd b{font-size:14.5px}
.rb-emo2-big{display:grid;grid-template-columns:66px minmax(0,1fr) 22px;gap:8px;align-items:center;font-size:12px}.rb-emo2-big small{color:var(--rb-sub);font-weight:600}
.rb-emo2-big .track{height:12px;border-radius:7px;background:color-mix(in srgb,var(--c) 14%,var(--rb-surf2));overflow:hidden}.rb-emo2-big .track i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 50%,#fff),var(--c));transform-origin:left;animation:rbGxGrow .8s both}
.rb-emo2-big b{color:var(--c);text-align:right;font-size:15px}.rb-emo2-big.empty{opacity:.5}
.rb-emo2 .chips{display:flex;flex-wrap:wrap;gap:4px}.rb-emo2-chip{display:inline-flex;gap:4px;align-items:center;padding:2px 8px;border-radius:999px;font-size:11.5px;background:color-mix(in srgb,var(--c) 14%,transparent);color:color-mix(in srgb,var(--c) 70%,var(--rb-text))}
/* ── Erosync 막대(NSFW·상세 정보) ── */
.rb-wk2-ibox .rb-wk2-ero .rb-wk2-num .track{height:10px!important;border-radius:6px!important;background:color-mix(in srgb,#ff4fa3 12%,var(--rb-surf2))!important}
.rb-wk2-ibox .rb-wk2-ero .rb-wk2-num .track i:not(.ghost){background:linear-gradient(90deg,#ffb3d6,#ff4fa3 60%,#c13fd8)!important;box-shadow:0 0 8px rgba(255,79,163,.45);border-radius:6px!important;transform-origin:left;animation:rbGxGrow .8s both}
.rb-wk2-ibox .rb-wk2-ero .rb-wk2-num .v{color:#d23c8a;font-weight:700}
.rb-wk2-ibox .rb-wk2-ero .rb-wk2-num{padding:4px 0}
/* ── Erosync 카드 꾸미기 ── */
.rb-wk2-ibox .rb-wk2-ero{position:relative;overflow:hidden;border-color:color-mix(in srgb,#ff4fa3 28%,var(--rb-line))!important;background:linear-gradient(165deg,color-mix(in srgb,#ff4fa3 8%,var(--rb-glass-bg,var(--rb-surf))),var(--rb-glass-bg,var(--rb-surf)) 45%)!important}
.rb-wk2-ibox .rb-wk2-ero::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,#ffb3d6,#ff4fa3,#c13fd8)}
.rb-wk2-ibox .rb-wk2-ero .rb-wk2-badge{background:linear-gradient(90deg,#ff4fa3,#c13fd8)!important;color:#fff!important;border:0!important}
.rb-wk2-ibox .rb-wk2-ero-row{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;background:var(--rb-surf2);margin-top:6px}
.rb-wk2-ibox .rb-wk2-ero-row>small:first-child{font-weight:700;color:var(--rb-sub)}
.rb-wk2-ibox .rb-wk2-ero-row.k-like{background:color-mix(in srgb,#3fcfa6 10%,var(--rb-surf2))}.rb-wk2-ibox .rb-wk2-ero-row.k-like>small:first-child::before{content:"♥ ";color:#1fa985}
.rb-wk2-ibox .rb-wk2-ero-row.k-like .rb-wk2-chip{background:color-mix(in srgb,#3fcfa6 16%,transparent);color:color-mix(in srgb,#3fcfa6 35%,var(--rb-text));border:1px solid color-mix(in srgb,#3fcfa6 45%,transparent)}
.rb-wk2-ibox .rb-wk2-ero-row.k-hate{background:color-mix(in srgb,#ef5350 8%,var(--rb-surf2))}.rb-wk2-ibox .rb-wk2-ero-row.k-hate>small:first-child::before{content:"✕ ";color:#d43a37}
.rb-wk2-ibox .rb-wk2-ero-row.k-hate .rb-wk2-chip{background:color-mix(in srgb,#ef5350 14%,transparent);color:color-mix(in srgb,#ef5350 35%,var(--rb-text));border:1px solid color-mix(in srgb,#ef5350 45%,transparent)}
.rb-wk2-ibox .rb-wk2-ero-row.k-mid .rb-wk2-chip{background:color-mix(in srgb,#b77bf5 16%,transparent);color:color-mix(in srgb,#b77bf5 35%,var(--rb-text))}
.rb-wk2-ibox #rb-ero-toward{background:linear-gradient(135deg,color-mix(in srgb,#ff4fa3 10%,var(--rb-surf2)),var(--rb-surf2))}
.rb-ero-pref{display:flex;flex-direction:column;gap:6px;margin-top:8px}.rb-ero-pref .bar{display:flex;height:12px;border-radius:7px;overflow:hidden;gap:2px;background:var(--rb-surf2)}
.rb-ero-pref .bar i{display:block;height:100%;transform-origin:left;animation:rbGxGrow .8s both}.rb-ero-pref i.f{background:linear-gradient(90deg,#ffb3d6,#ff6fae)}.rb-ero-pref i.m{background:linear-gradient(90deg,#8fb2ff,#5b86f0)}.rb-ero-pref i.x{background:#b9bccb}
.rb-ero-pref .lg{display:flex;gap:12px;font-size:12px;color:var(--rb-sub)}.rb-ero-pref .lg span::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:0}
.rb-ero-pref .lg .f::before{background:#ff6fae}.rb-ero-pref .lg .m::before{background:#5b86f0}.rb-ero-pref .lg .x::before{background:#b9bccb}
.rb-ero-acts{display:flex;flex-wrap:wrap;gap:6px;padding-top:12px;margin-top:10px;border-top:1px dashed color-mix(in srgb,#ff4fa3 30%,var(--rb-line))}
.rb-ero-acts .rb-btn{border-color:color-mix(in srgb,#ff4fa3 35%,var(--rb-line))!important}
.rb-ero-acts #rb-ero-edit,.rb-ero-acts #rb-ero-reanalyze{background:color-mix(in srgb,#ff4fa3 14%,transparent)!important;border-color:color-mix(in srgb,#ff4fa3 60%,transparent)!important;color:#c2347e!important;font-weight:700}
.rb-wk2-ibox .rb-wk2-ero .rb-wk2-bond{padding:10px 12px;border-radius:12px;background:color-mix(in srgb,#ff4fa3 7%,var(--rb-surf2));border-left:3px solid #ff4fa3}
@media (max-width:760px){
.rb-wk2-ibox .rb-wk2-num{grid-template-columns:minmax(0,1fr) auto!important;row-gap:4px}.rb-wk2-ibox .rb-wk2-num .n{grid-column:1/-1;white-space:normal!important;overflow:visible!important}.rb-wk2-ibox .rb-wk2-num .track{grid-column:1}
.rb-wk2-ibox .rb-mem-rec{flex-direction:column;align-items:stretch!important;gap:8px}.rb-wk2-ibox .rb-mem-rec .rb-mem-rowact{justify-content:flex-start;flex-wrap:wrap}
.rb-wk2-imain .rb-wk3-axes{grid-template-columns:1fr!important}
.rb-wk2-imain .rb-wk3-toc{margin:0 -2px}
.rb-ero-acts .rb-btn{flex:1 1 auto}
}
/* ── 요약 탭 꾸미기 ── */
.rb-wk2[data-tab] .rb-wk2-sum.rb-sum-tab{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;align-items:start}
.rb-sum-tab>.rb-sum-prof,.rb-sum-tab>.rb-wk2-moments{grid-column:1/-1}
.rb-sum-prof{position:relative;overflow:hidden;padding:18px 20px 18px 22px!important;background:linear-gradient(135deg,color-mix(in srgb,#e98bd6 12%,var(--rb-glass-bg,var(--rb-surf))),color-mix(in srgb,#c58bf5 8%,var(--rb-glass-bg,var(--rb-surf))))!important}
.rb-sum-prof::before{content:"“";position:absolute;right:14px;top:-18px;font:700 110px/1 Georgia,serif;color:color-mix(in srgb,#e98bd6 22%,transparent);pointer-events:none}
.rb-sum-prof .rb-wk2-p{font-size:15.5px;line-height:1.7;font-weight:500;position:relative}
.rb-sum-prof .rb-wk2-chip{background:var(--rb-surf);border:1px solid color-mix(in srgb,#e98bd6 35%,transparent)}.rb-sum-prof .rb-wk2-chip small{color:#c2347e;font-weight:700}
.rb-sum-chg .rb-wk2-chg{display:flex!important;flex-direction:column;gap:8px}
.rb-sum-chgrow{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:12px;background:var(--rb-surf2);border-left:3px solid #ff8a5c}
.rb-sum-chgrow small{font-size:11.5px;color:var(--rb-sub);font-weight:700}.rb-sum-chgrow s{color:var(--rb-mute,var(--rb-sub));opacity:.8}.rb-sum-chgrow .arr{margin:0 6px;color:#ff8a5c;font-style:normal}.rb-sum-chgrow b{color:var(--rb-text)}
.rb-sum-tab .rb-wk2-mom{position:relative;padding-left:6px;display:flex;flex-direction:column;gap:2px}
.rb-sum-tab .rb-wk2-mom::before{content:"";position:absolute;left:18px;top:12px;bottom:12px;width:2px;background:linear-gradient(#e98bd6,#c58bf5 60%,var(--rb-line));border-radius:2px}
.rb-sum-tab .rb-wk2-mrow{position:relative;display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:12px}
@media (hover:hover){.rb-sum-tab .rb-wk2-mrow:hover{background:var(--rb-surf2)}}
.rb-sum-tab .rb-wk2-g{position:relative;z-index:1;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:11.5px;font-weight:800;box-shadow:0 0 0 3px var(--rb-glass-bg,var(--rb-surf))}
.rb-sum-tab .rb-wk2-g.g-A{background:linear-gradient(135deg,#ff9fcf,#e94fb1);color:#fff}.rb-sum-tab .rb-wk2-g.g-B{background:linear-gradient(135deg,#c9b2ff,#9b7bf5);color:#fff}.rb-sum-tab .rb-wk2-g.g-C{background:var(--rb-surf2);color:var(--rb-sub)}
.rb-sum-tab .rb-wk2-mrow .t{font-size:14px}
.rb-sum-tab .rb-wk2-mrow:nth-child(n){animation:rbWkIn .3s both}.rb-sum-tab .rb-wk2-mrow:nth-child(2){animation-delay:.04s}.rb-sum-tab .rb-wk2-mrow:nth-child(3){animation-delay:.08s}.rb-sum-tab .rb-wk2-mrow:nth-child(4){animation-delay:.12s}.rb-sum-tab .rb-wk2-mrow:nth-child(5){animation-delay:.16s}
.rb-sum-tab>*{min-width:0}
.rb-wk2-sum2 .rb-wk2-num .track,.rb-wk2-iside .rb-wk2-num .track{height:9px!important;border-radius:6px!important;background:color-mix(in srgb,#e98bd6 12%,var(--rb-surf2))!important}
.rb-wk2-sum2 .rb-wk2-num .track i,.rb-wk2-iside .rb-wk2-num .track i{background:linear-gradient(90deg,#ffb3d6,#e98bd6)!important;border-radius:6px!important;box-shadow:0 0 6px rgba(233,139,214,.45);transform-origin:left;animation:rbGxGrow .8s both}
.rb-wk2-sum2 .rb-wk2-num .v,.rb-wk2-iside .rb-wk2-num .v{color:#c2347e;font-weight:700}
/* ── 적대감 3+: 호감에 금 · 6+: 깨짐 ── */
.rb-gx-crack{position:absolute;left:50%;top:12px;width:96px;height:96px;transform:translateX(-50%);pointer-events:none}
.rb-gx-ring .rb-gx-crack svg{width:100%;height:100%;transform:none}.rb-gx-crack path{fill:none;stroke:var(--rb-glass-bg,#fff);stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 1px rgba(0,0,0,.35));stroke-dasharray:120;animation:rbCrack .6s .5s ease-out both}
@keyframes rbCrack{from{stroke-dashoffset:120}to{stroke-dashoffset:0}}
.rb-gx-ring.cracked .rb-gx-crack path:nth-child(n+2){display:none}
.rb-gx-ring.cracked{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--c) 8%,transparent) 0 6px,transparent 6px 12px)!important;border-style:dashed!important}
.rb-gx-ring.cracked .fg{filter:saturate(.6) drop-shadow(0 0 3px color-mix(in srgb,var(--c) 40%,transparent))}
.rb-gx-ring.broken{background:color-mix(in srgb,#8b8fa3 10%,transparent)!important;border-color:color-mix(in srgb,#ef5350 45%,transparent)!important;border-style:dashed!important;animation:rbShake .45s .9s both}
.rb-gx-ring.broken .fg{filter:grayscale(.7) opacity(.75)}.rb-gx-ring.broken .in b{color:color-mix(in srgb,var(--c) 45%,#8b8fa3)!important;text-decoration:line-through;text-decoration-color:#ef5350;text-decoration-thickness:2px}
.rb-gx-ring.broken>svg{clip-path:polygon(0 0,52% 0,44% 26%,57% 36%,42% 52%,55% 64%,48% 100%,0 100%);transform:rotate(-90deg) translateX(0)}
.rb-gx-hb{position:absolute;top:6px;left:8px;font-size:15px;animation:rbGxPop .4s .8s both}
@keyframes rbShake{0%,100%{transform:none}20%{transform:translateX(-3px) rotate(-1deg)}40%{transform:translateX(3px) rotate(1deg)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
.rb-emo2-big.cracked .track{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--c) 14%,var(--rb-surf2)) 0 5px,var(--rb-surf2) 5px 10px)!important}
.rb-emo2-big.cracked .track i{-webkit-mask:linear-gradient(90deg,#000 0 44%,transparent 44% 47%,#000 47%);mask:linear-gradient(90deg,#000 0 44%,transparent 44% 47%,#000 47%)}
.rb-emo2-big.broken .track i{filter:grayscale(.7);-webkit-mask:linear-gradient(90deg,#000 0 30%,transparent 30% 34%,#000 34% 62%,transparent 62% 67%,#000 67%);mask:linear-gradient(90deg,#000 0 30%,transparent 30% 34%,#000 34% 62%,transparent 62% 67%,#000 67%)}
.rb-emo2-big.broken b{text-decoration:line-through;text-decoration-color:#ef5350}.rb-emo2-big.cracked small::after,.rb-emo2-big.broken small::after{content:" 💔";font-size:10px}
.rb-wk2-iside .rb-wk2-glance{max-height:360px;overflow-y:auto;scrollbar-width:thin;padding-right:2px}
`;

export function ensureMemAddonCss(ctx) {
  try {
    const docs = new Set([ctx?.win?.ownerDocument, typeof document !== "undefined" ? document : null].filter(Boolean));
    for (const d of docs) if (!d.getElementById("rb-memaddon-css")) d.head.appendChild(h("style", { id: "rb-memaddon-css" }, MEM_ADDON_CSS));
  } catch { /* 문서 없음 */ }
}

// 2.2.6 인물 위키 배치: 기본은 B4(왼쪽 프로필 열 + 오른쪽 탭). "" 이면 예전 화면(미리보기 시험용). 코어 common.js는 v2.2.5와 같게 두려고 여기에 둔다.
export const wkLayoutOf = (m) => (m?.wkLayout ?? "B4");
