// 게이지 배수 카드 CSS(gaugemultui.js)
export const GAUGE_CSS = `.rb-gauge-card{display:flex;flex-direction:column;gap:10px;padding:16px 18px}
.rb-gauge-head{display:flex;gap:10px;align-items:flex-start}.rb-gauge-head .t{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:15px}.rb-gauge-head .t small{font-weight:400;font-size:12.5px;line-height:1.55;color:var(--rb-sub)}
.rb-gauge-row{display:grid;grid-template-columns:minmax(90px,1fr) 2fr auto;gap:10px;align-items:center}.rb-gauge-row .t{display:flex;flex-direction:column;font-size:13.5px}.rb-gauge-row .t small{font-size:11.5px;color:var(--rb-mute)}
.rb-gauge-row input[type=range]{width:100%;accent-color:var(--rb-acc)}.rb-gauge-row .v{min-width:3.2em;text-align:right;font-variant-numeric:tabular-nums}
@media (max-width:760px){.rb-gauge-row{grid-template-columns:1fr auto}.rb-gauge-row input[type=range]{grid-column:1/-1;grid-row:2}}`;
