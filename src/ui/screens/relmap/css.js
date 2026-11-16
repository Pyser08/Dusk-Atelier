// 인물 관계도 전용 CSS. 색은 --rb-* 토큰만 쓴다(꾸미기 자동 적용).
export const RELMAP_CSS = `
.rb-rm{display:flex;flex-direction:column;gap:12px;padding:18px 22px 20px;min-width:0}
@media (max-width:720px){.rb-rm{padding:12px 16px 20px}}
.rb-rm-app{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:12px;min-width:0}
.rb-rm-stage{position:relative;min-width:0;background:radial-gradient(100% 85% at 50% 45%,var(--rb-surf) 0%,var(--rb-win) 100%);border:1px solid var(--rb-line2);border-radius:var(--rb-r3);box-shadow:var(--rb-card);overflow:hidden;height:min(68vh,660px);min-height:420px}
.rb-rm-stage canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}
.rb-rm-stage canvas.flat{touch-action:pan-y;cursor:default}@media (pointer:coarse){.rb-rm-stage{height:min(56vh,560px);min-height:320px}}.rb-rm-stage canvas.hit{cursor:pointer}
.rb-rm-ctrls{position:absolute;top:10px;left:10px;right:54px;display:flex;flex-wrap:wrap;gap:8px;pointer-events:none}.rb-rm-ctrls .rb-chip{pointer-events:auto}
.rb-rm-legend{position:absolute;left:12px;right:12px;bottom:10px;display:flex;flex-wrap:wrap;gap:6px 12px;font-size:13px;color:var(--rb-sub);pointer-events:none}
.rb-rm-legend span{display:inline-flex;align-items:center;gap:6px;padding:2px 10px;border-radius:999px;background:var(--rb-surf);opacity:.92}
.rb-rm-legend i{display:inline-block;width:22px;height:0;border-top:2px solid}
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
.rb-rm-turnlbl{font-size:12px;min-width:4.5em;text-align:right;color:var(--rb-sub);font-variant-numeric:tabular-nums}.rb-rm-past .rb-rm-turnlbl{color:var(--rb-warn);font-weight:700}
.rb-rm-turnnow{border:0;background:none;color:var(--rb-acc);font:600 12px inherit;cursor:pointer;white-space:nowrap}
.rb-rm-stage .rb-rm-legend{bottom:56px}
.rb-rm-stage.rb-rm-swap canvas{animation:rbRmSwap .55s cubic-bezier(.34,1.56,.64,1)}
@keyframes rbRmSwap{0%{transform:scale(1)}30%{transform:scale(.94) rotate(-1.2deg);filter:saturate(1.6) brightness(1.08)}65%{transform:scale(1.025) rotate(.4deg)}100%{transform:none;filter:none}}
.rb-rm-romance .rb-rm-stage{box-shadow:inset 0 0 80px rgba(255,79,154,.12)}
@media (prefers-reduced-motion:reduce){.rb-rm-stage.rb-rm-swap canvas{animation:none}.rb-rm-mode{transition:none}}
.rb-rm-help{position:absolute;top:10px;right:10px;z-index:2;width:var(--rb-ctl-sm);height:var(--rb-ctl-sm);padding:0;justify-content:center;border-radius:50%;border:1px solid var(--rb-line3);background:var(--rb-surf);color:var(--rb-sub);font:700 15px/1 inherit;cursor:pointer;display:inline-flex;align-items:center}
.rb-rm-help[aria-expanded=true]{border-color:var(--rb-sel-ring);background:var(--rb-acc-soft);color:var(--rb-text)}
.rb-rm-pop{position:absolute;top:52px;right:10px;z-index:5;box-sizing:border-box;width:min(300px,calc(100% - 20px));max-height:calc(100% - 64px);overflow-y:auto;padding:14px;border-radius:var(--rb-r3);border:1px solid var(--rb-line3);background:var(--rb-surf);box-shadow:var(--rb-shadow,0 10px 28px rgba(0,0,0,.18))}
.rb-rm-pop h3{margin:0 0 10px;font-size:15px}.rb-rm-pop ul,.rb-rm-rules{display:grid;gap:6px;padding:0;margin:0;list-style:none}
.rb-rm-pop li,.rb-rm-rules li{background:var(--rb-surf2);border-radius:var(--rb-r2);padding:8px 12px;font-size:13px;color:var(--rb-sub)}
.rb-rm-pop li b{color:var(--rb-accent,var(--rb-acc));margin-right:8px}
.rb-rm-tip{position:absolute;z-index:3;pointer-events:none;max-width:230px;padding:8px 12px;border-radius:var(--rb-r2);border:1px solid var(--rb-line3);background:var(--rb-surf);box-shadow:0 10px 28px rgba(0,0,0,.18);font-size:13px;line-height:1.45}
.rb-rm-tip b{display:block;color:var(--rb-text)}.rb-rm-tip span{display:block;color:var(--rb-sub)}
.rb-rm-toast{position:absolute;left:50%;bottom:56px;transform:translateX(-50%);z-index:4;padding:9px 16px;border-radius:999px;background:var(--rb-text);color:var(--rb-win);font-size:13px;font-weight:600;white-space:nowrap}
.rb-rm [hidden]{display:none!important}
.rb-rm-panel{box-sizing:border-box;background:var(--rb-surf);border:1px solid var(--rb-line2);border-radius:var(--rb-r3);box-shadow:var(--rb-card);padding:16px;min-width:0;height:min(68vh,660px);min-height:420px;overflow-y:auto}
.rb-rm-panel h2{font-size:17px;font-weight:700;line-height:1.3;margin:0 0 4px}
.rb-rm-panel h3{font-size:13px;font-weight:700;line-height:1.4;color:var(--rb-muted);letter-spacing:.06em;margin:16px 0 8px}
.rb-rm-panel p{margin:6px 0;color:var(--rb-sub);overflow-wrap:anywhere}
.rb-rm-filters{display:grid;gap:10px;padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid var(--rb-line2)}
.rb-rm-filters input[type=search]{box-sizing:border-box;width:100%;height:var(--rb-ctl-sm);border-radius:var(--rb-r2);border:1px solid var(--rb-line3);background:var(--rb-surf2);color:var(--rb-text);padding:0 12px;font:inherit;font-size:14px}
.rb-rm-qres,.rb-rm-fchips{display:flex;flex-wrap:wrap;gap:6px;font-size:13px;color:var(--rb-muted)}
.rb-rm-range{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--rb-sub)}.rb-rm-range input{flex:1;min-width:0;accent-color:var(--rb-acc)}.rb-rm-range b{min-width:72px;text-align:right;font-weight:600;color:var(--rb-text)}
.rb-rm-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;margin-right:6px;background:var(--rb-surf2);color:var(--rb-sub)}.rb-rm-badge.new{color:var(--rb-accent,var(--rb-acc));background:var(--rb-acc-soft)}
.rb-rm-meter{display:grid;grid-template-columns:56px 1fr 30px;align-items:center;gap:8px;font-size:12px;color:var(--rb-muted);margin:4px 0;font-variant-numeric:tabular-nums}
.rb-rm-meter b{display:block;height:6px;border-radius:3px;background:var(--rb-surf2);overflow:hidden}.rb-rm-meter em{display:block;height:100%;background:var(--rb-acc-grad)}
.rb-rm-list{display:flex;flex-direction:column;gap:6px;padding:0;margin:0;list-style:none}.rb-rm-list.row{flex-direction:row;flex-wrap:wrap}
.rb-rm-list button{width:100%;min-height:var(--rb-ctl-sm);border-radius:var(--rb-r2);padding:4px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;background:var(--rb-surf2);border:1px solid var(--rb-line2);color:var(--rb-text);font:inherit;font-size:14px;cursor:pointer}
.rb-rm-list.row button{width:auto}.rb-rm-list button span:last-child{color:var(--rb-muted);font-size:12px;flex-shrink:0}
.rb-rm-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px}
.rb-rm-rec{font-size:14px;color:var(--rb-sub);border-left:2px solid var(--rb-line3);padding-left:10px;margin:8px 0;overflow-wrap:anywhere}.rb-rm-rec small{color:var(--rb-muted);display:block}
.rb-rm-hop{font-size:13px;font-weight:600;padding-left:16px;list-style:none}
.rb-rm-act{display:flex;flex-direction:column;gap:8px;margin-top:14px}.rb-rm-act .rb-btn{width:100%;justify-content:center}
.rb-rm-note{color:var(--rb-muted);font-size:12px;min-height:18px}
.rb-rm-box{display:flex;align-items:center;gap:12px;text-align:left}.rb-rm-box canvas{flex:none;width:72px;height:56px;border-radius:var(--rb-r2);background:var(--rb-surf2)}
@media (max-width:800px){.rb-rm-app{grid-template-columns:minmax(0,1fr)}.rb-rm-stage{height:60vh;min-height:360px}.rb-rm-panel{height:auto;min-height:0}}
`;
