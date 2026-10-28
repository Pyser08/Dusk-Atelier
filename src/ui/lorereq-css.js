// v1.6.8 AI 창: 이번 요청에 포함할 로어북 목록 (모바일: 세로 한 줄씩, 겹침 없이, 목록 안에서만 스크롤)
export const LOREREQ_CSS = `
.rb-lorereq{border:1px solid var(--rb-line2);border-radius:10px;margin:0 12px 8px;min-width:0;max-width:100%;box-sizing:border-box}
.rb-lorereq>summary{cursor:pointer;font-size:13px;font-weight:600;padding:8px 10px;min-height:36px;display:flex;align-items:center;gap:6px;min-width:0}
.rb-lorereq-bar{display:flex;gap:6px;flex-wrap:wrap;padding:0 10px 6px;min-width:0}
.rb-lorereq-list{display:flex;flex-direction:column;gap:2px;max-height:min(40dvh,320px);max-height:min(40vh,320px);overflow-y:auto;overflow-x:hidden;touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:0 6px 6px;min-width:0;box-sizing:border-box}
.rb-lorereq-item{display:flex;align-items:center;gap:8px;min-width:0;min-height:36px;padding:4px 6px;border-radius:8px;box-sizing:border-box;flex:0 0 auto;cursor:pointer}
.rb-lorereq-item input{flex:0 0 auto;width:18px;height:18px;margin:0}
.rb-lorereq-item span{flex:1 1 auto;min-width:0;white-space:normal;overflow-wrap:anywhere;word-break:break-word;font-size:13px;line-height:1.35}
.rb-lorereq-item[data-off="1"] span{opacity:.55;text-decoration:line-through}
.rb-lorediff{display:flex;flex-direction:column;gap:3px;min-width:0}
.rb-lorediff>div{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;min-width:0;font-size:12.5px}
.rb-lorediff b{overflow-wrap:anywhere;min-width:0}
@media (max-width:640px){.rb-lorereq{margin:0 8px 6px}.rb-lorereq-list{max-height:min(34dvh,260px);max-height:min(34vh,260px)}}
`;
