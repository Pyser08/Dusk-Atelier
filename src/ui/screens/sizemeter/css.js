// 용량 측정 화면 전용 CSS. 색은 --rb-* 토큰만 쓴다(꾸미기 자동 적용).
export const SIZE_CSS = `
.rb-sz{max-width:820px;flex:1;min-width:0}
.rb-sz-head{display:flex;align-items:center;gap:10px}
.rb-sz-host{display:flex;flex-direction:column;gap:12px;min-width:0}
.rb-sz-sum{display:flex;flex-direction:column;gap:12px;padding:18px 20px}
.rb-sz-total{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.rb-sz-total b{font-size:26px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.15}
.rb-sz-total span{font-size:12.5px;color:var(--rb-mute)}
.rb-sz-bar{display:flex;gap:2px;height:10px;border-radius:999px;overflow:hidden;background:var(--rb-track-off)}
.rb-sz-bar i{display:block;height:100%;min-width:0;transition:width .3s}
.rb-sz-legend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
@media (max-width:560px){.rb-sz-legend{grid-template-columns:repeat(2,minmax(0,1fr))}.rb-sz-sum{padding:14px}}
.rb-sz-leg{display:flex;flex-direction:column;gap:2px;text-align:left;padding:10px 12px;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf);color:var(--rb-text);font:inherit;cursor:pointer;min-width:0}
.rb-sz-leg[aria-pressed="true"]{border-color:var(--rb-acc);background:var(--rb-acc-soft)}
@media (hover:hover){.rb-sz-leg:hover{border-color:var(--rb-line3)}}
.rb-sz-leg .k{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--rb-sub);font-weight:500}
.rb-sz-leg .k i{width:8px;height:8px;border-radius:50%;flex:none}
.rb-sz-leg b{font-size:14px;font-weight:650;font-variant-numeric:tabular-nums}
.rb-sz-leg small{font-size:12px;color:var(--rb-mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-sz-insights{display:flex;flex-direction:column;gap:10px}
.rb-sz-insights:empty{display:none}
.rb-sz-insight{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.rb-sz-insight .rb-note{align-self:stretch}
.rb-sz-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.rb-sz-tools .rb-input{flex:1;min-width:180px}
.rb-sz-tools .rb-seg{min-width:0}
.rb-sz-list{display:flex;flex-direction:column;padding:0;overflow:hidden}
.rb-sz-item+.rb-sz-item{border-top:var(--rb-bw,1px) solid var(--rb-line2)}
.rb-sz-head2{width:100%;display:flex;align-items:center;gap:12px;padding:13px 16px;background:none;border:0;color:inherit;font:inherit;text-align:left;cursor:pointer;min-height:var(--rb-ctl)}
@media (hover:hover){.rb-sz-head2:hover{background:var(--rb-surf2)}}
.rb-sz-head2:focus-visible{outline:2px solid var(--rb-focus,var(--rb-acc));outline-offset:-2px}
.rb-sz-rank{width:30px;flex:none;font-size:12px;font-weight:600;color:var(--rb-mute);font-variant-numeric:tabular-nums}
.rb-sz-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.rb-sz-titles{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.rb-sz-name{font-size:14px;font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.rb-sz-tag{display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:600;line-height:18px;white-space:nowrap;background:var(--rb-surf2);color:var(--rb-sub)}
.rb-sz-tag.acc{background:var(--rb-acc-soft);color:var(--rb-acc-text)}
.rb-sz-tag.ok{background:var(--rb-ok-soft);color:var(--rb-ok)}
.rb-sz-tag.warn{background:var(--rb-warn-soft);color:var(--rb-warn)}
.rb-sz-tag.danger{background:var(--rb-danger-soft);color:var(--rb-danger)}
.rb-sz-mini{height:4px;border-radius:999px;background:var(--rb-track-off);overflow:hidden}
.rb-sz-mini i{display:block;height:100%;border-radius:999px}
.rb-sz-size{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:1px;min-width:78px;font-variant-numeric:tabular-nums}
.rb-sz-size b{font-size:14px;font-weight:650}
.rb-sz-size small{font-size:12px;color:var(--rb-mute)}
.rb-sz-chev{flex:none;color:var(--rb-mute);display:flex;transition:transform .2s}
.rb-sz-item.open .rb-sz-chev{transform:rotate(90deg)}
.rb-sz-detail{display:flex;flex-direction:column;gap:8px;padding:4px 16px 14px 58px;background:var(--rb-surf2)}
@media (max-width:560px){.rb-sz-detail{padding-left:16px}.rb-sz-head2{padding:12px}}
.rb-sz-detail[hidden]{display:none}
.rb-sz-chips{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.rb-sz-lab{font-size:12px;font-weight:600;color:var(--rb-mute)}
.rb-sz-part{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;color:var(--rb-sub)}
.rb-sz-part b{font-weight:550;color:var(--rb-text);font-variant-numeric:tabular-nums;white-space:nowrap}
.rb-sz-more{padding:12px 16px;border-top:var(--rb-bw,1px) solid var(--rb-line2);display:flex;justify-content:center}
.rb-sz-foot{font-size:12px;color:var(--rb-mute);line-height:1.6}
.rb-sz-run{display:flex;flex-direction:column;gap:10px;padding:18px 20px}
`;
