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
.rb-rm-turnlbl{font-size:12px;min-width:4.5em;text-align:right;color:var(--rb-sub);font-variant-numeric:tabular-nums}.rb-rm-past .rb-rm-turnlbl{color:var(--rb-warn);font-weight:700}
.rb-rm-turnnow{border:0;background:none;color:var(--rb-acc);font:600 12px inherit;cursor:pointer;white-space:nowrap}
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
`;

export function ensureMemAddonCss(ctx) {
  try {
    const docs = new Set([ctx?.win?.ownerDocument, typeof document !== "undefined" ? document : null].filter(Boolean));
    for (const d of docs) if (!d.getElementById("rb-memaddon-css")) d.head.appendChild(h("style", { id: "rb-memaddon-css" }, MEM_ADDON_CSS));
  } catch { /* 문서 없음 */ }
}
