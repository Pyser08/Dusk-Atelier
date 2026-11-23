// 폴더 관리/쉬운 로어북 — 책장 화면.
//   책상: 폴더에 안 든 봇(책)만 쫙. 옆 책장(폴더)은 작게. 책을 끌어 책장 위에서 놓으면 꽂힌다(쫀득한 스프링).
//   책장을 누르면 아래로 펼쳐져 그 안의 책을 다른 책장이나 책상으로 옮길 수 있다.
//   책을 누르면 펼쳐진다: 왼쪽 위 봇 이미지·분류, 오른쪽 쪽은 쉬운 로어북(겹치는 이름 목록 + 막기/되돌리기).
// 그리기는 캐시 요약만 쓴다(빠름). 바뀐 책만 다시 그린다.
import { KIND_NAME } from "../../src/engine/easyfolder.js";

const WHY = { inside: "다른 이름 안에", short: "짧은 이름", common: "흔한 낱말 이름" };
const MODES = [["genre", "장르별"], ["kind", "시뮬봇·단일봇"], ["both", "장르 + 종류"]];
const TILE_HUES = [265, 335, 190, 145, 25, 215, 300, 55];
const HUES = { "블루 아카이브": 205, "무협": 15, "판타지": 275, "SF": 185, "호러": 350, "현대": 35, "로맨스": 330, "일상": 120, "기타": 220 };
const reduce = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

export const SHELF_CSS = `
.el-wrap{--ink:#4a4058;--soft:#8b8299;--paper:#fffdf9;--cream:#faf5ee;--board:#efe3d3;--boardt:#f7eee3;--line:#ece4f0;display:flex;flex-direction:column;gap:14px;user-select:none;-webkit-user-select:none;color:var(--ink)}
.el-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.el-search{flex:1;min-width:150px;height:38px;border-radius:19px;border:1.5px solid var(--line);background:var(--paper);padding:0 14px 0 36px;font-size:13.5px;color:var(--ink);outline:none;transition:border-color .2s,box-shadow .2s;
  background-image:radial-gradient(circle at 18px 50%,transparent 5px,var(--soft) 5.5px,var(--soft) 7px,transparent 7.5px);background-repeat:no-repeat}
.el-search:focus{border-color:#cdb8f0;box-shadow:0 0 0 4px #efe6fd}
.el-stat{color:var(--soft);font-size:12px;width:100%;order:9;padding-left:4px}
/* 위: 책장 줄 (끌어 놓는 곳) */
.el-shelves{display:flex;gap:12px;overflow-x:auto;padding:6px 4px 12px;scroll-snap-type:x proximity;scrollbar-width:thin}
.el-tile{--h:250;position:relative;flex:none;width:150px;scroll-snap-align:start;border-radius:20px;padding:10px 10px 9px;cursor:pointer;background:hsl(var(--h) 70% 96%);border:1.5px solid hsl(var(--h) 55% 89%);
  box-shadow:0 6px 16px -10px hsl(var(--h) 40% 50% / .45);transition:transform .45s cubic-bezier(.34,1.56,.64,1),box-shadow .25s,border-color .2s,background .2s}
.el-tile:hover{transform:translateY(-3px)}
.el-tile .el-sn{display:flex;gap:6px;align-items:center;font-size:12.5px;font-weight:700;color:hsl(var(--h) 30% 32%)}
.el-tile .el-sn span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.el-tile .el-sn small{min-width:22px;height:20px;padding:0 7px;border-radius:10px;background:#fff;color:hsl(var(--h) 35% 40%);font-size:11px;font-weight:700;line-height:20px;text-align:center;box-shadow:0 1px 3px hsl(var(--h) 40% 60% / .25)}
.el-tile .el-mini{margin-top:8px;border-radius:12px;background:#fff;padding:6px 7px 0;box-shadow:inset 0 2px 6px hsl(var(--h) 40% 70% / .25)}
.el-tile .el-row{display:flex;gap:2px;align-items:flex-end;height:34px;overflow:hidden}
.el-tile .el-row i{display:block;flex:none;border-radius:4px 4px 2px 2px;background:linear-gradient(90deg,hsl(var(--h) 60% 80%),hsl(var(--h) 75% 90%) 50%,hsl(var(--h) 60% 80%))}
.el-tile .el-row:empty::after{content:"비어 있어요";margin:auto;color:hsl(var(--h) 20% 70%);font-size:11px}
.el-tile .el-plank{height:6px;margin:0 -7px;border-radius:0 0 12px 12px;background:hsl(var(--h) 45% 86%)}
.el-tile .el-more{border:0;background:#fff;color:hsl(var(--h) 25% 45%);width:24px;height:22px;border-radius:11px;font-size:13px;line-height:1;cursor:pointer;box-shadow:0 1px 3px hsl(var(--h) 40% 60% / .25)}
.el-tile.el-on{background:hsl(var(--h) 75% 92%);border-color:hsl(var(--h) 60% 72%);box-shadow:0 0 0 3px hsl(var(--h) 70% 90%),0 8px 18px -10px hsl(var(--h) 40% 50% / .5)}
.el-tile.el-hot{transform:scale(1.08) translateY(-4px);border-color:hsl(var(--h) 60% 65%);box-shadow:0 0 0 4px hsl(var(--h) 75% 88%),0 16px 28px -12px hsl(var(--h) 45% 45% / .6)}
.el-tile.el-got{animation:el-got .6s cubic-bezier(.34,1.56,.64,1)}
@keyframes el-got{0%{transform:scale(1.08)}35%{transform:scale(.92,1.05)}65%{transform:scale(1.03,.97)}100%{transform:none}}
.el-tile.el-desk{--h:35}
.el-tile.el-gone{display:none}
.el-dragging .el-tile.el-gone{display:block;animation:el-pop .4s cubic-bezier(.34,1.56,.64,1)}
.el-tile.el-add{display:flex;align-items:center;justify-content:center;width:110px;background:transparent;border:2px dashed #e2d8ec;box-shadow:none;color:var(--soft);font-weight:600;font-size:13px}
.el-tile.el-add:hover{border-color:#cdb8f0;color:#7c5cc4}
/* 아래: 고른 책장 하나를 크게 */
.el-case{border-radius:26px;padding:16px 16px 18px;background:var(--cream);border:1.5px solid #f0e6da;box-shadow:0 14px 30px -22px rgba(120,90,60,.45)}
.el-case h4{display:flex;align-items:center;gap:8px;margin:2px 4px 12px;font-size:15px;font-weight:800;color:var(--ink)}
.el-case h4 small{font-size:12px;font-weight:600;color:var(--soft);white-space:nowrap}
.el-narrow .el-case h4 .el-hint{display:none}
.el-narrow .el-case{padding:14px 12px 16px}
.el-case h4 .el-hint{margin-left:auto;font-size:12px;font-weight:500;color:var(--soft)}
.el-inner{border-radius:18px;padding:4px 14px 0;background:linear-gradient(180deg,#f6eee4,#fbf6ef);box-shadow:inset 0 6px 12px -8px rgba(140,100,60,.35)}
.el-tier{position:relative;padding-top:16px}
.el-books{display:flex;gap:6px;align-items:flex-end;min-height:226px;padding:22px 4px 0;perspective:900px;perspective-origin:50% -60%}
.el-board{height:14px;margin:0 -14px;border-radius:7px;background:linear-gradient(180deg,var(--boardt),var(--board));box-shadow:0 6px 10px -6px rgba(140,100,60,.4)}
.el-tier:last-child .el-board{border-radius:7px 7px 18px 18px}
/* 책등: 모던 미니멀 (단색 · 가는 글씨 · 밑줄 하나). 마우스를 올리면 비스듬히 돌아 표지가 보인다 */
.el-book{--h:220;--w:38px;--bh:140px;--cw:calc(var(--bh) * .68);position:relative;width:var(--w);height:var(--bh);flex:none;cursor:grab;touch-action:pan-y;transform-style:preserve-3d;transition:opacity .2s}
.el-book .el-pull{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .34s cubic-bezier(.3,.7,.3,1) .34s}
.el-book .el-sp{position:absolute;inset:0;transform-style:preserve-3d;border-radius:7px;
  background:hsl(var(--h) 60% 88%);box-shadow:inset -8px 0 0 hsl(var(--h) 50% 82%),2px 3px 6px -3px hsl(var(--h) 30% 40% / .35);
  transition:transform .45s cubic-bezier(.4,0,.2,1),box-shadow .3s;transform-origin:50% 50%}
.el-book .el-sp::before{content:"";position:absolute;left:1px;right:1px;top:0;height:18px;border-radius:4px;background:repeating-linear-gradient(90deg,#fffdf8 0 1.5px,#eee6da 1.5px 2.5px);transform:rotateX(-90deg);transform-origin:top}
.el-book .el-t{position:absolute;top:18px;left:0;right:7px;bottom:36px;writing-mode:vertical-rl;display:flex;align-items:center;justify-content:flex-start;font:500 13px/1 system-ui,"Apple SD Gothic Neo",sans-serif;letter-spacing:.24em;color:hsl(var(--h) 30% 30%);white-space:nowrap;overflow:hidden;line-height:calc(var(--w) - 6px)}
.el-book .el-ln{position:absolute;bottom:18px;left:11px;right:18px;height:2.5px;border-radius:1px;background:hsl(var(--h) 35% 45%)}
/* 표지 면: 책등 오른쪽 모서리에 붙어 옆을 보고 있다가, 책이 돌면 앞으로 보인다 */
.el-book .el-cvf{position:absolute;top:0;left:100%;width:var(--cw);height:100%;transform-origin:left center;transform:rotateY(90deg);backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:0 6px 6px 0;overflow:hidden;opacity:.35;transition:opacity .25s .2s;
  background:hsl(var(--h) 60% 90%);box-shadow:inset 0 0 0 1px hsl(var(--h) 45% 82%);display:flex;flex-direction:column;padding:11px 11px 12px 10px;gap:8px;pointer-events:none}
.el-book .el-cvf img,.el-book .el-cvf .el-ph{display:block;width:100%;flex:1;min-height:0;object-fit:cover;border-radius:2px;background:hsl(var(--h) 55% 82%)}
.el-book .el-cvf .el-ph{display:flex;align-items:center;justify-content:center;font:300 36px system-ui,sans-serif;color:hsl(var(--h) 30% 40%)}
.el-book .el-cvf b{font:600 13px/1.2 system-ui,"Apple SD Gothic Neo",sans-serif;letter-spacing:.08em;color:hsl(var(--h) 30% 28%);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.el-book .el-cvf i{display:block;height:2px;width:40%;background:hsl(var(--h) 35% 45%)}
.el-book:hover .el-cvf,.el-book:focus-visible .el-cvf{opacity:1}
.el-book:hover,.el-book:focus-visible{z-index:5;outline:none}
.el-book:hover .el-pull,.el-book:focus-visible .el-pull{transform:translateY(-18px) translateZ(90px);transition-delay:0s}
.el-book:hover .el-sp,.el-book:focus-visible .el-sp{transition:transform .55s cubic-bezier(.34,1.25,.64,1) .3s,box-shadow .3s;transform:rotateY(-64deg);box-shadow:inset -6px 0 0 hsl(var(--h) 50% 82%),0 18px 22px -12px hsl(var(--h) 30% 30% / .45)}
.el-book .el-tag{position:absolute;top:-8px;right:-7px;z-index:2;min-width:20px;height:20px;padding:0 5px;border-radius:10px;font-size:11px;font-weight:800;line-height:20px;text-align:center;color:#a14d16;background:#ffe2c6;box-shadow:0 0 0 2px #fff,0 2px 5px rgba(160,90,40,.3);transform:translateZ(24px)}
.el-book .el-tag.ok{color:#1d7a46;background:#d3f5df}
.el-book.el-lifted{opacity:.2}
.el-book.el-new{animation:el-pop .55s cubic-bezier(.34,1.56,.64,1)}
@keyframes el-pop{0%{transform:translateY(-36px) scale(.8);opacity:0}100%{transform:none;opacity:1}}
.el-ghost{position:fixed;left:0;top:0;z-index:2147483000;pointer-events:none;cursor:grabbing;will-change:transform;filter:drop-shadow(0 20px 18px rgba(90,60,120,.3))}
.el-ghost::before{display:none}
.el-empty{min-height:140px;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--soft);font-size:13px;padding:20px}
.el-guide{font-size:12px;color:var(--soft);padding:0 4px}
/* 펼친 책: 실제 책 비율(쪽 2:3), 표지가 등을 축으로 넘어가며 펼쳐진다 */
.el-ov{position:fixed;inset:0;z-index:2147482000;background:radial-gradient(ellipse at 50% 40%,rgba(90,70,120,.28),rgba(40,30,60,.5));display:flex;align-items:center;justify-content:center;animation:el-fade .3s ease;backdrop-filter:blur(3px)}
@keyframes el-fade{from{opacity:0}}
.el-stage{--pw:300px;--ph:450px;position:relative;width:calc(var(--pw) * 2);height:var(--ph);perspective:2400px;transition:transform .5s cubic-bezier(.22,1,.36,1)}
.el-one .el-stage{width:var(--pw)}
.el-bk{--h:220;position:absolute;inset:0;transform-style:preserve-3d;transition:transform .95s cubic-bezier(.65,0,.35,1);transform:translateX(-25%)}
.el-one .el-bk{transform:none}
.el-bk.el-opened{transform:none}
.el-bk::before{content:"";position:absolute;left:calc(50% - 6px);right:calc(50% - 6px);top:-4px;bottom:-4px;border-radius:3px;background:hsl(var(--h) 45% 72%);box-shadow:0 30px 50px -10px rgba(50,30,80,.5)}
.el-one .el-bk::before{display:none}
.el-pg{position:absolute;top:0;bottom:0;width:50%;overflow:hidden;color:#4a4058;font-size:13px;line-height:1.55;
  background:radial-gradient(circle at 20% 30%,hsl(40 60% 98%) 0,transparent 60%),repeating-linear-gradient(0deg,hsl(35 40% 60% / .035) 0 1px,transparent 1px 4px),#fffaf2}
.el-one .el-pg{width:100%}
.el-pg.r{right:0;border-radius:4px 18px 18px 4px;box-shadow:inset 26px 0 26px -20px hsl(30 30% 40% / .35),inset -3px 0 0 hsl(35 30% 85%),inset -5px 0 0 #fffaf2,inset -7px 0 0 hsl(35 30% 87%),0 20px 40px -14px rgba(50,30,80,.45)}
.el-one .el-pg.r{border-radius:18px}
.el-leaf{position:absolute;top:0;bottom:0;left:50%;width:50%;transform-origin:left center;transform-style:preserve-3d;transition:transform .95s cubic-bezier(.65,0,.35,1)}
.el-one .el-leaf{left:0;width:100%}
.el-bk.el-opened .el-leaf{transform:rotateY(-180deg)}
.el-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}
.el-face.back{transform:rotateY(180deg)}
.el-face.back .el-pg{width:100%;border-radius:18px 4px 4px 18px;box-shadow:inset -26px 0 26px -20px hsl(30 30% 40% / .35),inset 3px 0 0 hsl(35 30% 85%),inset 5px 0 0 #fffaf2,inset 7px 0 0 hsl(35 30% 87%)}
/* 표지 */
.el-cv{position:absolute;inset:0;border-radius:3px 10px 10px 3px;display:flex;flex-direction:column;gap:14px;padding:30px 28px 26px;background:hsl(var(--h) 60% 90%);box-shadow:inset 8px 0 0 hsl(var(--h) 50% 84%),inset 0 0 0 1px hsl(var(--h) 45% 82%)}
.el-cv .el-cvimg{display:block;width:100%;flex:1;min-height:0;object-fit:cover;border-radius:3px;background:hsl(var(--h) 55% 82%)}
.el-cv .el-ph{display:flex;align-items:center;justify-content:center;font:300 64px system-ui,sans-serif;color:hsl(var(--h) 30% 40%)}
.el-cv h2{margin:0;font:600 22px/1.2 system-ui,"Apple SD Gothic Neo",sans-serif;letter-spacing:.06em;color:hsl(var(--h) 30% 26%)}
.el-cv i{display:block;width:34%;height:3px;background:hsl(var(--h) 35% 45%)}
.el-cv small{font-size:11px;letter-spacing:.3em;color:hsl(var(--h) 30% 40%)}
/* 쪽 안 */
.el-in{position:absolute;inset:0;padding:30px 30px 18px;display:flex;flex-direction:column;overflow:auto;scrollbar-width:thin}
.el-run{display:flex;justify-content:space-between;padding-right:22px;font-size:10px;letter-spacing:.22em;color:#b3a7c2;text-transform:uppercase;margin-bottom:14px}
.el-sw + .el-folio,.el-go + .el-folio{margin-top:0!important}
.el-folio{margin-top:auto;padding-top:16px;text-align:center;font-family:ui-serif,Georgia,serif;font-size:11px;color:#b3a7c2}
.el-orn{text-align:center;color:hsl(var(--h) 40% 72%);letter-spacing:.5em;font-size:12px;margin:10px 0}
.el-frame{position:relative;align-self:center;width:62%;aspect-ratio:3/4;margin:4px 0 14px;padding:8px;background:#fff;border-radius:14px;box-shadow:0 10px 24px -12px hsl(var(--h) 40% 35% / .5);transform:rotate(-1.5deg)}
.el-frame img,.el-frame .el-ph{width:100%;height:100%;object-fit:cover;border-radius:9px;display:flex;align-items:center;justify-content:center;font:800 44px ui-serif,Georgia,serif;color:hsl(var(--h) 35% 45%);background:linear-gradient(160deg,hsl(var(--h) 75% 92%),hsl(var(--h) 60% 82%))}
.el-frame::before,.el-frame::after{content:"";position:absolute;width:54px;height:18px;background:hsl(var(--h) 70% 86% / .85);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.el-frame::before{top:-7px;left:-14px;transform:rotate(-32deg)}
.el-frame::after{bottom:-7px;right:-14px;transform:rotate(-32deg)}
.el-name{margin:0;text-align:center;font-family:ui-serif,"Noto Serif KR",Georgia,serif;font-size:22px;color:#3d3450}
.el-chips{text-align:center;margin:6px 0 2px}
.el-chip{display:inline-block;margin:2px 3px;padding:3px 10px;border-radius:99px;background:hsl(var(--h) 75% 93%);font-size:11.5px;font-weight:600;color:hsl(var(--h) 35% 38%)}
.el-sw{margin-top:auto;flex:none;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:hsl(var(--h) 70% 96%);box-shadow:inset 0 0 0 1.5px hsl(var(--h) 55% 88%);cursor:pointer;text-align:left;border:0;width:100%;font:inherit;color:inherit}
.el-sw b{display:block;font-size:13.5px;color:#3d3450}
.el-sw span{display:block;font-size:11.5px;color:#8b8299}
.el-knob{position:relative;flex:none;width:46px;height:26px;border-radius:13px;background:#e6dcef;transition:background .25s}
.el-knob::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(80,50,110,.3);transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
.el-sw[aria-checked=true] .el-knob{background:linear-gradient(90deg,#b9a2ef,#f0a6c8)}
.el-sw[aria-checked=true] .el-knob::after{transform:translateX(20px)}
.el-sw[aria-busy=true]{opacity:.6;cursor:wait}
.el-sw[disabled]{cursor:default;opacity:.55}
.el-go{margin-top:8px;width:100%;border:0;border-radius:14px;padding:10px 14px;background:#fff;color:hsl(var(--h) 35% 38%);font:600 12.5px system-ui,"Apple SD Gothic Neo",sans-serif;cursor:pointer;box-shadow:inset 0 0 0 1.5px hsl(var(--h) 55% 88%);display:flex;align-items:center;justify-content:center;gap:6px}
.el-go:hover{background:hsl(var(--h) 70% 97%)}
.el-bulk{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:16px;background:var(--paper);box-shadow:inset 0 0 0 1.5px var(--line);border:0;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;--h:265}
.el-bulk b{display:block;font-size:13px;color:var(--ink)}
.el-bulk span.s{display:block;font-size:11.5px;color:var(--soft)}
.el-bulk[aria-checked=true] .el-knob{background:linear-gradient(90deg,#b9a2ef,#f0a6c8)}
.el-bulk[aria-checked=true] .el-knob::after{transform:translateX(20px)}
.el-bulk[disabled]{opacity:.55;cursor:default}
.el-bulk[aria-busy=true]{opacity:.7;cursor:wait}
.el-stamp{position:absolute;right:22px;bottom:96px;width:78px;height:78px;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;font:800 11px/1.25 ui-serif,Georgia,serif;color:#d0679a;border:2.5px solid #e9a2c2;box-shadow:inset 0 0 0 3px #fffaf2,inset 0 0 0 4.5px #e9a2c2;transform:rotate(-14deg) scale(0);opacity:0;transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .3s}
.el-stamp.on{transform:rotate(-14deg) scale(1);opacity:.85}
.el-pg h3{margin:0;font-family:ui-serif,"Noto Serif KR",Georgia,serif;font-size:21px;color:#3d3450}
.el-lead{color:#8b8299;font-size:12.5px;margin:6px 0 0}
.el-lead::first-letter{float:left;font:800 30px/0.95 ui-serif,Georgia,serif;margin:3px 6px 0 0;color:hsl(var(--h) 45% 60%)}
.el-hit{display:flex;gap:10px;padding:11px 0;border-top:1.5px dotted #e7dcef;animation:el-ink .45s ease both}
.el-hit:first-of-type{border-top:0}
.el-num{flex:none;width:24px;height:24px;border-radius:50%;background:hsl(var(--h) 70% 92%);color:hsl(var(--h) 35% 40%);font:800 11px/24px ui-serif,Georgia,serif;text-align:center}
.el-hit b{font-family:ui-serif,"Noto Serif KR",Georgia,serif;font-size:15px;color:#3d3450}
.el-key{display:inline-block;margin:4px 5px 0 0;padding:2px 9px;border-radius:10px;background:#fff;border:1.5px solid #ece4f0;font-size:11.5px}
.el-key s{color:#c0612b;text-decoration:none;font-weight:700}
.el-confirm{color:#8b8299;font-size:11.5px;margin-top:4px}
.el-hrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.el-kind{display:inline-flex;margin-left:auto;border-radius:10px;background:#f4eef8;padding:2px}
.el-kc{border:0;background:transparent;border-radius:8px;padding:2px 9px;font:600 11px system-ui,"Apple SD Gothic Neo",sans-serif;color:#8b8299;cursor:pointer}
.el-kc[aria-pressed=true]{background:#fff;color:hsl(var(--h) 40% 38%);box-shadow:0 1px 3px rgba(80,50,110,.18)}
.el-k-q .el-num{background:#fff3d6;color:#a26a12}
.el-k-q b::after{content:" · 애매";font:500 11px system-ui,sans-serif;color:#b8873a}
.el-busy{margin-top:8px}
.el-lead2{color:#8b8299;font-size:12px;margin:4px 0 8px}
.el-brow{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1.5px dotted #e7dcef}
.el-brow b{font-family:ui-serif,"Noto Serif KR",Georgia,serif;font-size:14px;color:#3d3450}
.el-bar2{height:5px;border-radius:3px;background:#f1eaf6;margin:4px 0 2px;overflow:hidden}
.el-bar2 i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#f6c39b,#ef9fb8)}
.el-calm{background:#fff4ea;color:#b4602a;box-shadow:inset 0 0 0 1.5px #f7d9bf;padding:5px 10px}
.el-more2{margin-top:12px;border-top:1.5px dotted #e7dcef;padding-top:8px}
.el-more2 summary{cursor:pointer;font-size:12px;color:#8b8299;list-style:none}
.el-more2 summary::before{content:"▸ ";color:#c7b8d6}
.el-more2[open] summary::before{content:"▾ "}
.el-more2 .el-hit{opacity:.75}
@keyframes el-ink{from{opacity:0;transform:translateX(10px)}}
.el-msg{margin:10px 0 0;padding:8px 12px;border-radius:12px;font-size:12px;background:#eef9f1;color:#2f7a4c}
.el-msg.err{background:#fdeef0;color:#b23a52}
.el-ribbon{position:absolute;top:-6px;right:12px;width:16px;height:92px;background:linear-gradient(90deg,#e9a2c2,#f5c2d8 50%,#e9a2c2);clip-path:polygon(0 0,100% 0,100% 100%,50% 86%,0 100%);box-shadow:0 2px 3px rgba(0,0,0,.1);z-index:2}
.el-close{position:fixed;top:14px;right:16px;z-index:3;border:0;background:#fffaf2;color:#6b5f7d;width:38px;height:38px;border-radius:50%;font-size:17px;cursor:pointer;box-shadow:0 4px 12px rgba(40,20,60,.25)}
.el-nav{position:absolute;bottom:-52px;left:0;right:0;display:flex;justify-content:center;gap:12px}
.el-nav button{border:0;background:#fffaf2;color:#6b5f7d;min-width:44px;height:38px;border-radius:19px;padding:0 14px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(40,20,60,.2)}
.el-nav button[disabled]{opacity:.4;cursor:default}
/* 휴대폰: 한 쪽씩 넘긴다 */
.el-one .el-frame{width:46%;margin-bottom:10px}
.el-one .el-in{padding:24px 22px 14px}
.el-one .el-page2{transition:transform .8s cubic-bezier(.65,0,.35,1);transform-origin:left center;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.el-one .el-turned{transform:rotateY(-180deg)}
@media (prefers-reduced-motion:reduce){.el-book,.el-tile,.el-bk,.el-leaf,.el-stage,.el-page2{transition:none!important}.el-book:hover{transform:none}.el-hit,.el-ov,.el-book.el-new,.el-tile.el-got{animation:none!important}}
`;

export function renderShelf(el, { dusk, store, assets, app, log = () => {} }) {
  const { h, replace, btn, note } = dusk.ui;
  const st = { open: null, msg: null, q: "", bulk: "" };   // open: 아래에 크게 보는 책장(폴더 id, null이면 분류 안 된 책)
  const imgs = new Map();
  const doc = el.ownerDocument;

  const style = h("style", null, SHELF_CSS);
  const root = h("div", { class: "el-wrap" });
  replace(el, style, root);
  const narrow = () => (el.clientWidth || 999) < 620;   // 펼친 책 모양만 바꾼다

  // ---------- 데이터 ----------
  const bots = () => store.cache?.bots ?? {};
  function layoutNow() {
    const b = bots(), seen = new Set(), shelves = [];
    for (const x of store.order ?? []) {
      if (x && typeof x === "object" && Array.isArray(x.data)) {
        const ids = x.data.filter((id) => b[id] && !seen.has(id));
        ids.forEach((id) => seen.add(id));
        shelves.push({ id: x.id, name: x.name || "(이름 없는 책장)", ids });
      }
    }
    const filed = new Set(shelves.flatMap((s) => s.ids));
    const loose = [];
    for (const x of store.order ?? []) if (typeof x === "string" && b[x] && !filed.has(x) && !loose.includes(x)) loose.push(x);
    for (const id of Object.keys(b)) if (!filed.has(id) && !loose.includes(id)) loose.push(id);
    return { shelves, loose };
  }

  // ---------- 그림 ----------
  function cover(b, img) {
    if (!b.image || !assets?.thumb) return;
    if (imgs.has(b.image)) { const u = imgs.get(b.image); if (u) img.src = u; return; }
    imgs.set(b.image, null);
    assets.thumb(b.image, "png").then((u) => { if (u) { imgs.set(b.image, u); for (const x of root.querySelectorAll(`img[data-p="${CSS.escape(b.image)}"]`)) x.src = u; } }).catch(() => {});
  }
  // 책마다 두께·키를 조금씩 다르게 (같은 봇은 늘 같은 모양)
  const seed = (id) => { let x = 0; for (const ch of String(id)) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; };
  function bookEl(id, from, fresh = false) {
    const b = bots()[id];
    const hue = HUES[b.genre] ?? 220, r = seed(id);
    const w = 46 + (r % 4) * 4, bh = 182 + ((r >> 3) % 5) * 8;
    const img = b.image ? h("img", { alt: "", draggable: "false", dataset: { p: b.image } }) : null;
    if (img) cover(b, img);
    const tag = b.todo.length ? h("span", { class: "el-tag", title: `겹치는 이름 ${b.todo.length}개` }, String(b.todo.length)) : b.on.length ? h("span", { class: "el-tag ok", title: "이름 겹침 막는 중" }, "✓") : null;
    const el2 = h("div", { class: `el-book${fresh ? " el-new" : ""}`, role: "button", tabindex: "0", "aria-label": `${b.name} 책 · ${b.genre} · ${KIND_NAME[b.kind]}${b.todo.length ? ` · 겹치는 이름 ${b.todo.length}개` : ""}`, style: `--h:${hue};--w:${w}px;--bh:${bh}px`, dataset: { id, from: from ?? "" } },
      h("span", { class: "el-pull" }, h("span", { class: "el-sp" }, h("span", { class: "el-t" }, b.name), h("span", { class: "el-ln" }),
        h("span", { class: "el-cvf", "aria-hidden": "true" }, img ?? h("span", { class: "el-ph" }, (b.name || "?").slice(0, 1)), h("b", null, b.name), h("i")))), tag);
    el2.addEventListener("pointerdown", (ev) => grab(ev, el2, id, from));
    el2.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openBook(id, el2); } });
    return el2;
  }
  // 큰 책장 하나: 너비에 맞춰 칸을 나누고 칸마다 선반
  function caseEl({ title, ids, total, from, fresh, empty, menu }) {
    const per = Math.max(3, Math.floor(Math.max(200, el.clientWidth - 70) / 60));
    const rows = [];
    for (let i = 0; i < ids.length; i += per) rows.push(ids.slice(i, i + per));
    return h("section", { class: "el-case", "aria-label": title, dataset: { view: from ?? "desk" } },
      h("h4", null, title, h("small", null, ids.length === total ? `${total}권` : `${ids.length} / ${total}권`), h("span", { class: "el-hint" }, ids.length ? "누르면 펼치고, 끌어서 위 책장에 꽂아요" : ""), menu ?? null),
      h("div", { class: "el-inner" },
        ...(rows.length ? rows.map((row) => h("div", { class: "el-tier" }, h("div", { class: "el-books" }, ...row.map((id) => bookEl(id, from, fresh.has(id)))), h("div", { class: "el-board" })))
          : [h("div", { class: "el-tier" }, h("div", { class: "el-empty" }, empty), h("div", { class: "el-board" }))])));
  }
  const pick = (v) => { st.open = v; draw(); };
  let curView = null;
  const view = () => curView;
  function miniRow(ids, hue) {
    const b = bots();
    return h("div", { class: "el-mini" }, h("div", { class: "el-row", "aria-hidden": "true" }, ...ids.slice(0, 16).map((id) => { const r = seed(id); return h("i", { style: `--h:${HUES[b[id]?.genre] ?? hue};height:${22 + (r % 5) * 3}px;width:${8 + (r % 3)}px` }); })), h("div", { class: "el-plank" }));
  }
  function deskTile(ids) {
    return h("div", { class: `el-tile el-desk${curView === null ? " el-on" : ""}${ids.length ? "" : " el-gone"}`, role: "button", tabindex: "0", "aria-pressed": curView === null ? "true" : "false", "aria-label": `분류 안 된 책 ${ids.length}권`, dataset: { desk: "1" }, onClick: () => pick(null), onKeydown: (ev) => { if (ev.key === "Enter") pick(null); } },
      h("div", { class: "el-sn" }, h("span", null, "분류 안 된 책"), h("small", null, String(ids.length))), miniRow(ids, 35));
  }
  function shelfEl(s, i) {
    const hue = TILE_HUES[i % TILE_HUES.length];
    const more = h("button", { class: "el-more", "aria-label": `${s.name} 책장 메뉴`, onClick: (ev) => { ev.stopPropagation(); shelfMenu(s, more); } }, "⋯");
    return h("div", { class: `el-tile${view() === s.id ? " el-on" : ""}`, role: "button", tabindex: "0", "aria-pressed": view() === s.id ? "true" : "false", "aria-label": `${s.name} 책장 · ${s.ids.length}권`, style: `--h:${hue}`, dataset: { shelf: s.id }, onClick: () => pick(s.id), onKeydown: (ev) => { if (ev.key === "Enter") pick(s.id); } },
      h("div", { class: "el-sn" }, h("span", null, s.name), h("small", null, String(s.ids.length)), more), miniRow(s.ids, hue));
  }
  function stat() {
    const n = Object.keys(bots()).length;
    const t = store.verifiedAt ? Math.round((Date.now() - store.verifiedAt) / 60000) : null;
    return `책 ${n}권${store.busy ? " · 확인하는 중…" : t == null ? "" : t < 1 ? " · 방금 확인함" : ` · ${t}분 전에 확인함`}`;
  }
  function draw(fresh = []) {
    const { shelves, loose } = layoutNow();
    root.classList.toggle("el-narrow", narrow());
    if (st.open && !shelves.some((s) => s.id === st.open)) st.open = null;
    // 분류 안 된 책이 다 없어지면 그 칸은 숨기고 첫 책장을 보여 준다 (끄는 동안에만 꺼내 놓을 곳으로 다시 나타남)
    // 책을 다 읽은 뒤 분류 안 된 책이 없으면 첫 책장을 고른다(고른 채로 남아 꺼내도 화면이 튀지 않음)
    if (!st.open && !loose.length && shelves.length && Object.keys(bots()).length) st.open = shelves[0].id;
    const view = st.open;
    curView = view;
    const opened = shelves.find((s) => s.id === view);
    const fs = new Set(fresh);
    const q = st.q.trim().toLowerCase();
    const match = (ids) => (q ? ids.filter((id) => (bots()[id]?.name ?? "").toLowerCase().includes(q)) : ids);
    const focused = doc.activeElement?.classList?.contains("el-search");
    const search = h("input", { class: "el-search", type: "search", placeholder: "책 이름 찾기", "aria-label": "책 이름 찾기", value: st.q, onInput: (ev) => { st.q = ev.target.value; draw(); } });
    const empty = !Object.keys(bots()).length;
    const src = opened ? opened.ids : loose;
    const shown = match(src);
    const need = shown.filter((id) => bots()[id]?.todo.length), onIds = shown.filter((id) => bots()[id]?.on.length);
    const allOn = !need.length && onIds.length > 0;
    const bulk = h("button", { type: "button", class: "el-bulk", role: "switch", "aria-checked": allOn ? "true" : "false", "aria-busy": st.bulk ? "true" : "false", disabled: !need.length && !onIds.length ? true : null, onClick: () => bulkToggle(allOn ? onIds : need, allOn ? "revert" : "apply") },
      h("span", { class: "el-knob" }),
      h("span", null, h("b", null, `${opened ? `‘${opened.name}’ 책장` : "분류 안 된 책"}${q ? " (찾은 책)" : ""} 모두 이름 겹침 막기`),
        h("span", { class: "s" }, st.bulk ? st.bulk : need.length ? `겹치는 이름이 있는 책 ${need.length}권${onIds.length ? ` · 막는 중 ${onIds.length}권` : ""}` : onIds.length ? `${onIds.length}권 모두 막는 중 — 끄면 원래대로` : "겹치는 이름이 있는 책이 없어요")));
    replace(root,
      h("div", { class: "el-bar" }, search, btn("자동 정리", { onClick: autoDialog }), btn("⋯", { title: "더보기", onClick: (ev) => moreMenu(ev.currentTarget) }), h("span", { class: "el-stat", "aria-live": "polite" }, stat())),
      shown.length || need.length ? bulk : null,
      st.msg,
      empty ? note("info", store.busy ? "책을 처음 불러오는 중이에요. 다음부터는 바로 열려요." : "봇이 하나도 없어요.") : null,
      h("div", { class: "el-shelves", "aria-label": "책장 — 책을 여기로 끌어 놓으면 꽂혀요" }, deskTile(loose), ...shelves.map(shelfEl), h("div", { class: "el-tile el-add", role: "button", tabindex: "0", onClick: addShelf, onKeydown: (ev) => { if (ev.key === "Enter") addShelf(); } }, "+ 새 책장")),
      caseEl({
        title: opened ? opened.name : "분류 안 된 책", ids: match(src), total: src.length, from: opened?.id ?? null, fresh: fs,
        empty: q ? "찾는 책이 없어요." : opened ? "빈 책장이에요. 책을 끌어 이 책장 칸(위)에 놓으면 꽂혀요." : "모든 책이 책장에 꽂혀 있어요. 위 책장을 누르면 그 안의 책을 볼 수 있어요.",
        menu: opened ? btn("⋯", { size: "sm", title: "책장 메뉴", onClick: (ev) => shelfMenu(opened, ev.currentTarget) }) : null
      }));
    if (focused) { const i = root.querySelector(".el-search"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }

  // ---------- 끌기 (쫀득) ----------
  function grab(ev, book, id, from) {
    if (ev.button > 0) return;
    const touch = ev.pointerType === "touch";
    const sx = ev.clientX, sy = ev.clientY;
    let started = false, timer = null, ghost = null, hot = null, raf = 0;
    let tx = sx, ty = sy, px = sx, py = sy, vx = 0, rot = 0, sc = 1;
    const rect = book.getBoundingClientRect();
    const ox = sx - rect.left, oy = sy - rect.top;
    const blockScroll = (e) => { if (started) e.preventDefault(); };
    const begin = () => {
      started = true;
      ghost = book.cloneNode(true);
      ghost.classList.add("el-ghost");
      ghost.classList.remove("el-new");
      Object.assign(ghost.style, { width: rect.width + "px", height: rect.height + "px", margin: "0" });
      doc.body.appendChild(ghost);
      book.classList.add("el-lifted");
      root.classList.add("el-dragging");
      // 숨어 있던 '분류 안 된 책' 칸이 나타나면 책장 줄을 맨 앞으로 (꺼낼 곳이 보이게)
      if (from && root.querySelector(".el-tile.el-gone")) root.querySelector(".el-shelves").scrollLeft = 0;
      navigator.vibrate?.(8);
      const tick = () => {
        const k = reduce() ? 1 : 0.32;
        const nx = px + (tx - px) * k, ny = py + (ty - py) * k;
        vx = vx * 0.7 + (nx - px) * 0.3;
        px = nx; py = ny;
        rot += (Math.max(-16, Math.min(16, vx * 1.6)) - rot) * 0.25;
        sc += ((hot ? 0.82 : 1.08) - sc) * 0.25;
        ghost.style.transform = `translate(${px - ox}px,${py - oy}px) rotate(${rot}deg) scale(${sc})`;
        edgeScroll(tx, ty);
        raf = requestAnimationFrame(tick);
      };
      tick();
    };
    const target = (x, y) => {
      const e = doc.elementFromPoint(x, y);
      const s = e?.closest?.("[data-shelf]");
      if (s && s.dataset.shelf !== (from ?? "")) return s;
      const d = e?.closest?.("[data-desk]");
      return d && from ? d : null;
    };
    const move = (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!started) {
        const far = Math.hypot(tx - sx, ty - sy) > 7;
        if (touch) { if (far) cleanup(); return; }   // 손가락은 길게 눌러야 끈다(그냥 밀면 스크롤)
        if (far) begin();
        return;
      }
      const t = target(tx, ty);
      if (t !== hot) { hot?.classList.remove("el-hot"); hot = t; hot?.classList.add("el-hot"); }
    };
    const up = (e) => {
      if (!started) { cleanup(); if (Math.hypot(e.clientX - sx, e.clientY - sy) < 8) openBook(id, book); return; }
      const t = hot;
      cancelAnimationFrame(raf);
      hot?.classList.remove("el-hot");
      const fid = t?.dataset.shelf ?? null;
      if (t) {
        const r = t.getBoundingClientRect();
        land(ghost, r.left + r.width / 2 - rect.width / 2, r.top + 4, 0.3, 0, () => {
          t.classList.add("el-got");
          store.moveTo(id, fid).then(() => {}).catch((err) => { flash(note("err", `옮기지 못했어요: ${err?.message ?? err}`)); draw(); });
        });
      } else {
        const r = book.getBoundingClientRect();
        land(ghost, r.left, r.top, 1, 1, () => book.classList.remove("el-lifted"));
      }
      cleanup(true);
    };
    const cleanup = (keepGhost) => {
      clearTimeout(timer);
      root.classList.remove("el-dragging");
      doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", up);
      doc.removeEventListener("pointercancel", cancel);
      doc.removeEventListener("touchmove", blockScroll);
      if (!keepGhost && ghost) { cancelAnimationFrame(raf); ghost.remove(); book.classList.remove("el-lifted"); }
    };
    const cancel = () => { if (started) { const r = book.getBoundingClientRect(); cancelAnimationFrame(raf); hot?.classList.remove("el-hot"); land(ghost, r.left, r.top, 1, 1, () => book.classList.remove("el-lifted")); cleanup(true); } else cleanup(); };
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", up);
    doc.addEventListener("pointercancel", cancel);
    doc.addEventListener("touchmove", blockScroll, { passive: false });
    if (touch) timer = setTimeout(() => { begin(); }, 240);
  }
  // 끄는 동안 가장자리에 가면 저절로 스크롤 (좁은 화면의 가로 책장 줄 · 세로 화면)
  function edgeScroll(x, y) {
    const strip = root.querySelector(".el-shelves");
    if (strip) {
      const r = strip.getBoundingClientRect();
      if (y >= r.top - 20 && y <= r.bottom + 20) {
        if (x < r.left + 44) strip.scrollLeft -= 9;
        else if (x > r.right - 44) strip.scrollLeft += 9;
      }
    }
    let sc = el;
    while (sc && sc !== doc.body && !(sc.scrollHeight > sc.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    if (sc && sc !== doc.body) {
      const r = sc.getBoundingClientRect();
      if (y < r.top + 50) sc.scrollTop -= 10;
      else if (y > r.bottom - 50) sc.scrollTop += 10;
    }
  }
  // 고스트를 목표 자리로 튕기듯 보내고 지운다
  function land(ghost, x, y, scale, opacity, done) {
    if (!ghost) { done?.(); return; }
    if (reduce()) { ghost.remove(); done?.(); return; }
    ghost.style.transition = "transform .42s cubic-bezier(.34,1.56,.64,1), opacity .42s ease";
    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${x}px,${y}px) rotate(0deg) scale(${scale})`;
      ghost.style.opacity = String(opacity || (scale < 1 ? 0 : 1));
    });
    setTimeout(() => { ghost.remove(); done?.(); }, 430);
  }

  // ---------- 책 펼치기 ----------
  // 넓은 화면: 펼친 두 쪽(쪽마다 2:3). 닫힌 책이 책등 자리에서 커지며 가운데로 오고, 표지가 등을 축으로 넘어가 왼쪽 쪽이 된다.
  // 좁은 화면: 한 쪽(2:3)씩. 표지 → 봇 쪽(토글) → 쉬운 로어북 쪽을 넘긴다.
  function openBook(id, from) {
    const b = bots()[id];
    if (!b) return;
    const hue = HUES[b.genre] ?? 220;
    const win = doc.defaultView ?? globalThis;
    const vw = win.innerWidth || 1024, vh = win.innerHeight || 768;
    const one = vw < 760;
    let pw, ph;
    if (one) { pw = Math.min(vw - 32, (vh - 140) * 2 / 3); ph = pw * 1.5; }
    else { ph = Math.min(vh - 90, 640); pw = ph * 2 / 3; if (pw * 2 > vw - 60) { pw = (vw - 60) / 2; ph = pw * 1.5; } }
    const pic = (cls) => (b.image ? h("img", { class: cls, alt: "", dataset: { p: b.image } }) : h("div", { class: `${cls} el-ph` }, (b.name || "?").slice(0, 1)));
    const cvImg = pic("el-cvimg"), frImg = pic("");
    if (b.image) { cover(b, cvImg); cover(b, frImg); }
    let busy = false, msg = null;
    const info = h("div", { class: "el-in" }), lore = h("div", { class: "el-in" });
    const stamp = h("div", { class: "el-stamp", "aria-hidden": "true" }, "이름", h("br"), "지킴");
    function paint() {
      const x = bots()[id];
      const on = x.on.length > 0, has = x.todo.length > 0;
      const sw = h("button", { type: "button", class: "el-sw", role: "switch", "aria-checked": on ? "true" : "false", "aria-busy": busy ? "true" : "false", disabled: !on && !has ? true : null, onClick: () => toggle(on) },
        h("span", { class: "el-knob" }),
        h("span", null, h("b", null, "이름 겹침 막기"), h("span", null, on ? `막는 중 · ${x.on.join(", ")}` : has ? `겹치는 이름 ${x.todo.length}개를 막아요` : "겹치는 이름이 없어요")));
      stamp.classList.toggle("on", on);
      replace(info,
        h("div", { class: "el-run" }, h("span", null, "Dusk 서재"), h("span", null, x.genre)),
        h("div", { class: "el-frame" }, frImg),
        h("h2", { class: "el-name" }, x.name),
        h("div", { class: "el-chips" }, h("span", { class: "el-chip" }, x.genre), h("span", { class: "el-chip" }, KIND_NAME[x.kind])),
        h("div", { class: "el-orn" }, "· ✿ ·"),
        sw,
        app?.go ? h("button", { type: "button", class: "el-go", onClick: () => { try { app.state.charSel = id; } catch { /* 상태 없음 */ } close(); app.go("characters"); } }, "관리 › 캐릭터 탭에서 이 봇 보기") : null,
        h("div", { class: "el-folio" }, "1"));
      const KIND = { p: "인물", "?": "애매", n: "인물 아님" };
      const hit = (t, i) => h("div", { class: `el-hit el-k-${t.person === "?" ? "q" : t.person}`, style: `animation-delay:${Math.min(i, 12) * 50}ms` },
        h("span", { class: "el-num" }, String(i + 1)),
        h("div", { style: "flex:1;min-width:0" }, h("div", { class: "el-hrow" }, h("b", null, t.name),
            h("span", { class: "el-kind", role: "group", "aria-label": `${t.name} 인물인지` },
              ...[["p", "인물"], ["n", "아님"]].map(([v, lab]) => h("button", { type: "button", class: "el-kc", "aria-pressed": t.person === v ? "true" : "false", onClick: () => setKind(t.ek, t.person === v ? null : v) }, lab)))),
          h("div", null, ...t.keys.map((k) => h("span", { class: "el-key" }, h("s", null, k.key), ` ${WHY[k.why]}${k.inside.length ? ` · ${k.inside.join(", ")}` : ""}`))),
          t.confirm.length ? h("div", { class: "el-confirm" }, `확인 단어: ${t.confirm.join(", ")}`) : null));
      const people = [...x.todo, ...(x.maybe ?? [])];
      const hits = people.map(hit);
      const others = (x.other ?? []).map((t, i) => hit(t, i + people.length));
      const aiBtn = (x.maybe ?? []).length ? h("button", { type: "button", class: "el-go", style: "margin:6px 0 10px", onClick: async (ev) => { ev.currentTarget.disabled = true; ev.currentTarget.textContent = "보조 모델에게 묻는 중…"; try { const n = await store.aiJudge(id); msg = h("div", { class: "el-msg" }, `${n}개 항목을 판별했어요.`); } catch (e) { msg = h("div", { class: "el-msg err" }, `판별하지 못했어요: ${e?.message ?? e}`); } paint(); } }, `애매한 ${x.maybe.length}개를 보조 모델로 판별하기`) : null;
      replace(lore,
        h("div", { class: "el-run" }, h("span", null, "쉬운 로어북"), h("span", null, x.name)),
        h("h3", null, "겹치는 이름"),
        h("p", { class: "el-lead" }, "이름이 겹치는 항목이에요. ‘마리’ 키가 ‘히마리’에도 걸리는 것처럼요. 봇 쪽의 ‘이름 겹침 막기’를 켜면 이름이 제대로 나올 때(마리가·마리야·마리 씨)만 켜지고, 흔한 낱말 이름은 부르거나 그 인물만의 단어가 같이 나올 때만 켜져요."),
        h("div", { class: "el-orn" }, "· ❦ ·"),
        msg,
        aiBtn,
        hits.length ? h("div", null, ...hits) : h("p", { class: "el-lead2", style: "text-align:center;margin-top:24px" }, on ? `모두 막아 두었어요 — ${x.on.join(", ")}` : "이 책에는 겹치는 인물 이름이 없어요."),
        busyBox(x),
        others.length ? h("details", { class: "el-more2" }, h("summary", null, `인물이 아닌 겹침 ${others.length}개 (막지 않아요)`), ...others) : null,
        h("div", { class: "el-folio" }, "2"));
    }
    // 필요 없이 자주 켜지는 항목 (가장 최근 채팅 기준)
    function busyBox(x) {
      const list = x.busy ?? [];
      if (!list.length) return null;
      const calm = async (eks, btnEl) => { if (btnEl) { btnEl.disabled = true; btnEl.textContent = "고치는 중…"; } try { const n = await store.calmBot(id, eks); msg = h("div", { class: "el-msg" }, `${n}개 항목을 덜 켜지게 했어요. 방금 메시지에 이름이 제대로 나올 때만 켜져요.`); } catch (e) { msg = h("div", { class: "el-msg err" }, `실패했어요: ${e?.message ?? e}`); } paint(); };
      return h("div", { class: "el-busy" },
        h("div", { class: "el-orn" }, "· ☾ ·"),
        h("h3", { style: "font-size:17px" }, "너무 자주 켜지는 항목"),
        h("p", { class: "el-lead2" }, `최근 대화 ${list[0].of}개 메시지 중 절반 넘게 켜지는 항목이에요. ‘덜 켜지게’를 누르면 방금 메시지에 키가 제대로(이름 경계) 나올 때만 켜져요. 되돌리기 토글로 원래대로 돌아가요.`),
        ...list.slice(0, 12).map((b2) => h("div", { class: "el-brow" },
          h("div", { style: "flex:1;min-width:0" }, h("b", null, b2.name), h("div", { class: "el-bar2" }, h("i", { style: `width:${Math.round(b2.rate * 100)}%` })), h("span", { class: "el-confirm" }, `${b2.of}개 중 ${b2.hits}번 · 키: ${b2.keys.slice(0, 3).join(", ")}`)),
          h("button", { type: "button", class: "el-kc el-calm", onClick: (ev) => calm([b2.ek], ev.currentTarget) }, "덜 켜지게"))),
        list.length > 1 ? h("button", { type: "button", class: "el-go", onClick: (ev) => calm(list.map((b2) => b2.ek), ev.currentTarget) }, `모두 덜 켜지게 (${list.length})`) : null);
    }
    async function setKind(ek, v) {
      try { await store.setKind(id, ek, v); } catch (e) { msg = h("div", { class: "el-msg err" }, `바꾸지 못했어요: ${e?.message ?? e}`); }
      paint();
    }
    async function toggle(on) {
      if (busy) return;
      busy = true; paint();
      try { const n = on ? await store.revertBot(id) : await store.applyBot(id); msg = h("div", { class: "el-msg" }, on ? `${n}개 항목을 원래대로 돌렸어요.` : `${n}개 항목을 고쳤어요.`); }
      catch (e) { msg = h("div", { class: "el-msg err" }, `실패했어요: ${e?.message ?? e}`); }
      busy = false; paint();
    }
    paint();
    const cv = h("div", { class: "el-cv" }, cvImg, h("h2", null, b.name), h("i"), h("small", null, b.genre));
    const right = h("div", { class: "el-pg r" }, h("div", { class: "el-ribbon", "aria-hidden": "true" }), one ? lore : lore);
    let page2 = null, nav = null;
    let leaf;
    if (one) {
      page2 = h("div", { class: "el-pg r el-page2", style: "z-index:2" }, info, stamp);
      leaf = h("div", { class: "el-leaf", style: "z-index:3" }, h("div", { class: "el-face" }, cv));
    } else {
      leaf = h("div", { class: "el-leaf" }, h("div", { class: "el-face" }, cv), h("div", { class: "el-face back" }, h("div", { class: "el-pg", style: "left:0" }, info, stamp)));
    }
    const bk = h("div", { class: "el-bk", style: `--h:${hue}` }, right, page2, leaf);
    const stage = h("div", { class: "el-stage", role: "dialog", "aria-modal": "true", "aria-label": `${b.name} 펼친 책`, style: `--pw:${pw}px;--ph:${ph}px` }, bk);
    if (one) {
      const prev = h("button", { type: "button", "aria-label": "앞 쪽", disabled: true, onClick: () => turn(false) }, "‹");
      const next = h("button", { type: "button", "aria-label": "다음 쪽", onClick: () => turn(true) }, "쉬운 로어북 ›");
      const turn = (fw) => { page2.classList.toggle("el-turned", fw); prev.disabled = !fw; next.disabled = fw; };
      nav = h("div", { class: "el-nav" }, prev, next);
      stage.appendChild(nav);
    }
    const close = () => { ov.remove(); doc.removeEventListener("keydown", esc, true); from?.isConnected && from.focus?.(); };
    // Esc는 Dusk 창 닫기보다 먼저 받아 책만 닫는다
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } };
    const ov = h("div", { class: `el-ov${one ? " el-one" : ""}`, onClick: (e) => { if (e.target === ov) close(); } }, h("button", { class: "el-close", "aria-label": "닫기", onClick: close }, "✕"), stage);
    el.appendChild(ov);
    doc.addEventListener("keydown", esc, true);
    // 책등 자리에서 커지며 나온다
    const r = from?.getBoundingClientRect?.();
    if (r && r.width && !reduce()) {
      const s0 = Math.max(0.12, r.height / ph);
      stage.style.transition = "none";
      stage.style.transform = `translate(${r.left + r.width / 2 - vw / 2}px,${r.top + r.height / 2 - vh / 2}px) scale(${s0})`;
      stage.getBoundingClientRect();
      stage.style.transition = "";
      requestAnimationFrame(() => { stage.style.transform = ""; });
    }
    setTimeout(() => bk.classList.add("el-opened"), reduce() ? 0 : 480);
    ov.querySelector(".el-close").focus();
    // 펼칠 때 그 봇만 새로 확인 (바뀌었으면 쪽이 다시 그려진다)
    store.refreshBot?.(id).then((ch) => { if (ch && ov.isConnected) paint(); }).catch(() => {});
  }

  // ---------- 책장 메뉴·대화상자 ----------
  function flash(n) { st.msg = n; draw(); setTimeout(() => { if (st.msg === n) { st.msg = null; draw(); } }, 5000); }
  async function addShelf() {
    const name = await dusk.ui.prompt({ title: "새 책장", label: "책장(폴더) 이름" });
    if (!name?.trim()) return;
    try { await store.newShelf(name.trim()); } catch (e) { flash(note("err", `만들지 못했어요: ${e?.message ?? e}`)); }
  }
  function shelfMenu(s, anchor) {
    dusk.ui.menu(anchor, [
      { label: "이름 바꾸기", onClick: async () => { const n = await dusk.ui.prompt({ title: "책장 이름 바꾸기", label: "새 이름", value: s.name }); if (n?.trim()) store.renameShelf(s.id, n.trim()).catch((e) => flash(note("err", String(e?.message ?? e)))); } },
      { label: `책 ${s.ids.length}권 이름 겹침 막기`, onClick: () => bulk(s.ids, "apply") },
      { label: "책장 풀기 (책은 책상으로)", onClick: async () => { if (await dusk.ui.confirm({ title: "책장 풀기", body: `‘${s.name}’ 책장만 없애고 책 ${s.ids.length}권은 책상으로 꺼내요. 봇은 지우지 않아요.`, ok: "풀기" })) store.unshelve(s.id).catch((e) => flash(note("err", String(e?.message ?? e)))); } }
    ]);
  }
  async function bulkToggle(ids, kind) {
    if (st.bulk) return;
    let n = 0, i = 0;
    try {
      for (const id of ids) { i++; st.bulk = `${kind === "apply" ? "막는" : "되돌리는"} 중… ${i}/${ids.length}`; draw(); n += await (kind === "apply" ? store.applyBot(id) : store.revertBot(id)); }
      st.bulk = ""; flash(note("ok", `책 ${ids.length}권에서 ${n}개 항목을 ${kind === "apply" ? "고쳤어요" : "원래대로 돌렸어요"}.`));
    } catch (e) { st.bulk = ""; flash(note("err", `실패했어요: ${e?.message ?? e}`)); }
  }
  async function bulk(ids, kind) {
    let n = 0;
    flash(note("info", "고치는 중이에요…"));
    try { for (const id of ids) if (kind === "apply" ? bots()[id]?.todo.length : bots()[id]?.on.length) n += await (kind === "apply" ? store.applyBot(id) : store.revertBot(id)); flash(note("ok", `${n}개 항목을 ${kind === "apply" ? "고쳤어요" : "원래대로 돌렸어요"}.`)); }
    catch (e) { flash(note("err", `실패했어요: ${e?.message ?? e}`)); }
  }
  function moreMenu(anchor) {
    dusk.ui.menu(anchor, [
      { label: "다시 확인하기", onClick: () => { store.refresh({ force: true }).catch((e) => flash(note("err", String(e?.message ?? e)))); draw(); } },
      { label: "자동 정리 전으로", onClick: () => store.undoPlan().then((at) => flash(note("ok", `${new Date(at).toLocaleString()} 정리 전 배치로 돌렸어요.`))).catch((e) => flash(note("err", String(e?.message ?? e)))) },
      { label: "모든 봇에서 되돌리기 (Dusk 지우기 전)", onClick: async () => {
        if (!(await dusk.ui.confirm({ title: "모든 봇에서 되돌리기", body: "고친 로어북 항목은 Dusk가 있어야 켜져요. Dusk를 지우거나 봇을 남에게 줄 때 먼저 되돌려 주세요.", ok: "되돌리기" }))) return;
        flash(note("info", "되돌리는 중이에요…"));
        store.revertEverything().then((r) => flash(note("ok", `봇 ${r.bots}개에서 ${r.total}개 항목을 원래대로 돌렸어요.`))).catch((e) => flash(note("err", String(e?.message ?? e))));
      } }
    ]);
  }
  function autoDialog() {
    let mode = "genre", keep = true;
    dusk.ui.modal((done) => {
      const box = h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "자동 정리", style: "max-width:520px" });
      const paint = () => {
        const p = store.plan(mode, keep);
        replace(box,
          h("h3", { class: "rb-h3" }, "자동 정리"),
          h("p", { class: "rb-mc-sub" }, "봇 이름·태그·설명·로어북을 보고 장르와 종류(인물 여럿인 시뮬봇·단일 캐릭터봇·그룹)로 책장을 나눠요. AI는 쓰지 않아요. 같은 이름 책장이 있으면 거기에 꽂아요."),
          h("div", { class: "rb-seg", role: "radiogroup", "aria-label": "나누는 방법", style: "margin:8px 0" }, ...MODES.map(([v, t]) => h("button", { type: "button", role: "radio", "aria-checked": mode === v ? "true" : "false", onClick: () => { mode = v; paint(); } }, t))),
          dusk.ui.toggleRow("이미 책장에 꽂힌 책은 그대로", "끄면 모든 책을 다시 나눠요.", keep, (v) => { keep = v; paint(); }),
          p.length ? h("div", { style: "max-height:40vh;overflow:auto;margin:8px 0" }, ...p.map((g) => h("div", { class: "rb-mc-row" }, h("b", null, `📚 ${g.name} (${g.ids.length})`), h("div", { class: "rb-mc-meta" }, g.names.slice(0, 12).join(", ") + (g.names.length > 12 ? ` 외 ${g.names.length - 12}권` : ""))))) : note("info", "새로 나눌 책이 없어요."),
          h("div", { style: "display:flex;gap:8px;justify-content:flex-end;margin-top:12px" },
            btn("닫기", { onClick: () => done(null) }),
            btn(`이대로 정리 (${p.reduce((n, g) => n + g.ids.length, 0)}권)`, { kind: "primary", disabled: !p.length, onClick: () => { done(null); store.applyAutoPlan(p).then(() => flash(note("ok", `책장 ${p.length}개로 정리했어요. 마음에 안 들면 ⋯ → ‘자동 정리 전으로’.`))).catch((e) => flash(note("err", String(e?.message ?? e)))); } })));
      };
      paint();
      return box;
    });
  }

  // ---------- 시작 ----------
  const off = store.subscribe((changed) => { if (el.isConnected) draw(changed); });
  let lastW = el.clientWidth;
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (Math.abs(el.clientWidth - lastW) > 40) { lastW = el.clientWidth; draw(); } }) : null;
  ro?.observe(el);
  store.load().then(() => { draw(); return store.refresh(); }).catch((e) => { log("불러오기 실패", e); flash(note("err", `불러오지 못했어요: ${e?.message ?? e}`)); });
  return () => { off(); ro?.disconnect(); };
}
