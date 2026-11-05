// 프로바이더 화면 전용 스타일(v1.9.3). 색·모서리는 Dusk 토큰만 쓴다.
export const PROVIDER_CSS = `
.rb-prov{display:flex;flex-direction:column;gap:14px;padding-bottom:28px}
.rb-prov .rb-seg{width:100%}
.rb-pcard{display:flex;flex-direction:column;gap:12px;padding:14px 16px;border-radius:var(--rb-r3);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line2)}
.rb-pcard .top{display:flex;align-items:center;gap:10px}.rb-pcard .top .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.rb-pcard .top b{font-size:14.5px}
.rb-pcard .acts{display:flex;flex-wrap:wrap;gap:8px}
.rb-pgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px}
@media (max-width:560px){.rb-pgrid{grid-template-columns:minmax(0,1fr)}}
.rb-pfield{display:flex;flex-direction:column;gap:4px;min-width:0}.rb-pfield.wide{grid-column:1/-1}
.rb-pfield small{font-size:12px;color:var(--rb-mute);line-height:1.5}
.rb-pkeys{display:flex;flex-direction:column;gap:6px}
.rb-pkey{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:var(--rb-r2);background:var(--rb-bg2,var(--rb-surf));border:var(--rb-bw,1px) solid var(--rb-line3)}
.rb-pkey .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.rb-pkey code{font-size:12px;color:var(--rb-mute)}
.rb-pkeyadd{display:flex;gap:8px}.rb-pkeyadd input{flex:1}
textarea.rb-input.area{height:auto;min-height:84px;padding:10px 14px;line-height:1.5;resize:vertical;font-family:inherit}
.rb-pstat{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
.rb-pstat>div{padding:10px 12px;border-radius:var(--rb-r2);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line2);display:flex;flex-direction:column;gap:2px}
.rb-pstat b{font-size:17px}.rb-pstat span{font-size:12px;color:var(--rb-mute)}
.rb-ptable{width:100%;border-collapse:collapse;font-size:13px}.rb-ptable td,.rb-ptable th{padding:6px 8px;text-align:left;border-bottom:var(--rb-bw,1px) solid var(--rb-line2)}.rb-ptable th{font-size:12px;color:var(--rb-mute);font-weight:600}
.rb-pwarn{padding:10px 12px;border-radius:var(--rb-r2);border:var(--rb-bw,1px) solid var(--rb-line3);font-size:12.5px;line-height:1.55;color:var(--rb-sub)}
.rb-pdiff{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}@media (max-width:560px){.rb-pdiff{grid-template-columns:minmax(0,1fr)}}
.rb-pdiff pre{margin:0;padding:10px 12px;border-radius:var(--rb-r2);background:var(--rb-surf);border:var(--rb-bw,1px) solid var(--rb-line2);white-space:pre-wrap;word-break:break-word;font:12.5px/1.55 inherit;max-height:320px;overflow:auto}
`;
