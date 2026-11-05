// 회귀 창 (v1.9.2): 인물을 골라, 그 인물의 기억만 들고 새 채팅을 시작한다.
// 이 창만 따로 신비한 분위기(밤하늘·금빛 시계)로 꾸민다. 다른 화면 스타일에는 영향을 주지 않는다(.rb-rg 안에서만).
import { h, replace } from "../dom.js";
import { modal } from "../kit.js";
import { regressCandidates } from "../../engine/regress.js";
import { createRegressChat } from "../../data/regress.js";
import { isGenerating, Busy } from "../../engine/safety.js";

const CSS = `
.rb-rg{--rg-ink:#efe6cf;--rg-dim:#b8ad95;--rg-gold:#e2bd6b;--rg-gold2:#f6dc9a;--rg-deep:#0d0b1f;--rg-violet:#2a1f55;--rg-line:rgba(226,189,107,.28);
  position:relative;width:min(560px,94vw);max-height:min(88vh,760px);overflow:hidden auto;border-radius:22px;color:var(--rg-ink);
  background:radial-gradient(120% 80% at 50% -10%,#3a2a78 0%,var(--rg-violet) 38%,var(--rg-deep) 78%);
  border:1px solid var(--rg-line);box-shadow:0 0 0 1px rgba(0,0,0,.4),0 30px 80px rgba(8,4,30,.7),inset 0 0 60px rgba(120,90,220,.18);
  font-family:"Nanum Myeongjo","Noto Serif KR",Georgia,serif;padding:22px 20px 18px;box-sizing:border-box}
.rb-rg *{box-sizing:border-box}
.rb-rg-stars{position:absolute;inset:0;pointer-events:none;opacity:.75;
  background-image:radial-gradient(1px 1px at 12% 18%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 72% 12%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 40% 62%,#f6dc9a 50%,transparent 51%),radial-gradient(1px 1px at 88% 48%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 22% 82%,#cfc2ff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 60% 88%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 6% 52%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 94% 80%,#f6dc9a 50%,transparent 51%);
  animation:rg-twinkle 5s ease-in-out infinite alternate}
@keyframes rg-twinkle{from{opacity:.45}to{opacity:.9}}
.rb-rg-x{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;border:1px solid var(--rg-line);background:rgba(13,11,31,.5);color:var(--rg-dim);font-size:16px;cursor:pointer;z-index:2}
.rb-rg-x:hover{color:var(--rg-gold2);border-color:var(--rg-gold)}
.rb-rg-head{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;margin-bottom:14px}
.rb-rg-clock{width:132px;height:132px;filter:drop-shadow(0 0 18px rgba(226,189,107,.35))}
.rb-rg-clock .ring{transform-origin:60px 60px;animation:rg-slow 60s linear infinite}
.rb-rg-clock .hand-m{transform-origin:60px 60px;animation:rg-slow 24s linear infinite reverse}
.rb-rg-clock .hand-h{transform-origin:60px 60px;animation:rg-slow 120s linear infinite reverse}
@keyframes rg-slow{to{transform:rotate(360deg)}}
.rb-rg.spinning .rb-rg-clock .ring{animation:rg-slow 1.6s linear infinite reverse}
.rb-rg.spinning .rb-rg-clock .hand-m{animation:rg-slow .35s linear infinite reverse}
.rb-rg.spinning .rb-rg-clock .hand-h{animation:rg-slow 1.1s linear infinite reverse}
.rb-rg.spinning .rb-rg-clock{animation:rg-pulse 1.2s ease-in-out infinite}
@keyframes rg-pulse{50%{filter:drop-shadow(0 0 34px rgba(246,220,154,.75))}}
.rb-rg-eyebrow{font-size:11px;letter-spacing:.42em;color:var(--rg-gold);text-transform:uppercase;font-family:system-ui,sans-serif}
.rb-rg h3{margin:0;font-size:24px;font-weight:700;letter-spacing:.08em;color:var(--rg-gold2);text-shadow:0 0 18px rgba(226,189,107,.4)}
.rb-rg-sub{margin:0;max-width:40ch;font-size:13.5px;line-height:1.65;color:var(--rg-dim)}
.rb-rg-list{position:relative;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:6px 0 14px}
.rb-rg-p{display:flex;align-items:center;gap:10px;min-height:58px;padding:10px 12px;border-radius:14px;cursor:pointer;text-align:left;color:var(--rg-ink);font:inherit;
  background:rgba(13,11,31,.45);border:1px solid rgba(226,189,107,.16);transition:border-color .2s,background .2s,transform .2s}
.rb-rg-p:hover{border-color:var(--rg-line);transform:translateY(-1px)}
.rb-rg-p[aria-pressed=true]{border-color:var(--rg-gold);background:linear-gradient(135deg,rgba(226,189,107,.18),rgba(90,60,180,.25));box-shadow:0 0 22px rgba(226,189,107,.22)}
.rb-rg-av{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:var(--rg-deep);background:radial-gradient(circle at 35% 30%,var(--rg-gold2),var(--rg-gold) 60%,#a07b33)}
.rb-rg-p b{display:block;font-size:14.5px;line-height:1.25;word-break:keep-all}
.rb-rg-p small{display:block;font-size:11.5px;color:var(--rg-dim);font-family:system-ui,sans-serif;margin-top:2px}
.rb-rg-field{position:relative;display:flex;flex-direction:column;gap:6px;margin-bottom:12px;font-size:12px;color:var(--rg-dim);font-family:system-ui,sans-serif}
.rb-rg-field input{min-height:42px;padding:0 14px;border-radius:12px;border:1px solid var(--rg-line);background:rgba(13,11,31,.55);color:var(--rg-ink);font:15px "Nanum Myeongjo","Noto Serif KR",Georgia,serif}
.rb-rg-field input:focus{outline:none;border-color:var(--rg-gold);box-shadow:0 0 0 3px rgba(226,189,107,.18)}
.rb-rg-note{position:relative;margin:0 0 14px;padding:10px 12px;border-left:2px solid var(--rg-gold);font-size:12.5px;line-height:1.6;color:var(--rg-dim);background:rgba(13,11,31,.35);border-radius:0 10px 10px 0;font-family:system-ui,sans-serif}
.rb-rg button.rb-rg-go{position:relative;display:block;width:100%;min-height:50px;border-radius:999px;border:1px solid var(--rg-gold2);cursor:pointer;font:700 16px "Nanum Myeongjo","Noto Serif KR",Georgia,serif;letter-spacing:.2em;color:#20170a!important;-webkit-text-fill-color:#20170a;text-shadow:0 1px 0 rgba(255,240,200,.5);
  background:linear-gradient(180deg,var(--rg-gold2),var(--rg-gold) 55%,#b98c3c);box-shadow:0 8px 28px rgba(226,189,107,.3)}
.rb-rg button.rb-rg-go:disabled{opacity:.45;cursor:default;box-shadow:none}
.rb-rg-stage{position:relative;min-height:22px;margin-top:10px;text-align:center;font-size:13.5px;color:var(--rg-gold2);letter-spacing:.06em}
.rb-rg-empty{position:relative;text-align:center;color:var(--rg-dim);font-size:14px;line-height:1.7;padding:14px 4px 6px}
.rb-rg.spinning .rb-rg-list,.rb-rg.spinning .rb-rg-field,.rb-rg.spinning .rb-rg-note,.rb-rg.spinning .rb-rg-go{opacity:.25;pointer-events:none;transition:opacity .4s}
.rb-rg-flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 22%,rgba(246,220,154,.9),rgba(246,220,154,0) 60%)}
.rb-rg.done .rb-rg-flash{animation:rg-flash 1s ease-out}
@keyframes rg-flash{30%{opacity:1}to{opacity:0}}
.rb-rg-full{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(14px,3vh,28px);padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
  background:transparent;pointer-events:auto;color:#f6dc9a;font-family:"Nanum Myeongjo","Noto Serif KR",Georgia,serif;opacity:0;transition:opacity .45s ease}
.rb-rg-full.on{opacity:1}
.rb-modal:has(.rb-rg.spinning){background:transparent!important;backdrop-filter:none!important}
.rb-rg.spinning{opacity:0!important;pointer-events:none}
.rb-rg-stagewrap{position:relative;width:min(80vmin,660px);aspect-ratio:1;display:grid;place-items:center}
.rb-rg-rays{position:absolute;inset:-18%;border-radius:50%;pointer-events:none;mix-blend-mode:screen;opacity:.75;
  background:repeating-conic-gradient(from 0deg,rgba(246,220,154,.0) 0deg 7deg,rgba(246,220,154,.22) 9deg,rgba(246,220,154,0) 11deg 22deg);
  -webkit-mask:radial-gradient(circle,transparent 30%,#000 46%,transparent 70%);mask:radial-gradient(circle,transparent 30%,#000 46%,transparent 70%);animation:rg-slow 9s linear infinite}
.rb-rg-halo{position:absolute;inset:4%;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(180,140,255,.35) 0%,rgba(90,60,200,.18) 40%,transparent 68%);animation:rg-breathe 2.4s ease-in-out infinite}
@keyframes rg-breathe{50%{transform:scale(1.06);opacity:.7}}
.rb-rg-big{position:relative;width:100%;height:100%;filter:drop-shadow(0 0 28px rgba(226,189,107,.55)) drop-shadow(0 0 70px rgba(140,100,255,.35));transition:transform .25s cubic-bezier(.2,1.6,.4,1)}
.rb-rg-big .runes{transform-origin:100px 100px;animation:rg-slow 14s linear infinite}
.rb-rg-big .gear{transform-origin:100px 100px;animation:rg-slow 6s linear infinite reverse}
.rb-rg-big .orbit{transform-origin:100px 100px;animation:rg-slow 3.2s linear infinite}
.rb-rg-big .orbit2{transform-origin:100px 100px;animation:rg-slow 5.5s linear infinite reverse}
.rb-rg-full.tick .rb-rg-big{transform:scale(1.07)}
.rb-rg-full.tick .rb-rg-big .xii{fill:#fff;filter:url(#rg-glow)}
.rb-rg-wave{position:absolute;left:50%;top:50%;width:40%;aspect-ratio:1;border-radius:50%;border:2px solid rgba(246,220,154,.9);transform:translate(-50%,-50%) scale(.6);opacity:0;pointer-events:none;box-shadow:0 0 30px rgba(246,220,154,.6),inset 0 0 30px rgba(246,220,154,.4)}
.rb-rg-full.tick .rb-rg-wave{animation:rg-wave 1.1s cubic-bezier(.1,.7,.3,1) forwards}
.rb-rg-full.tick .rb-rg-wave.w2{animation-delay:.12s}
@keyframes rg-wave{0%{opacity:1;transform:translate(-50%,-50%) scale(.6)}100%{opacity:0;transform:translate(-50%,-50%) scale(3.2)}}
.rb-rg-spark{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#fff6d8;box-shadow:0 0 10px 3px rgba(246,220,154,.9);opacity:0;pointer-events:none}
.rb-rg-full.tick .rb-rg-spark{animation:rg-spark 1.2s cubic-bezier(.15,.8,.3,1) forwards}
@keyframes rg-spark{0%{opacity:1;transform:rotate(var(--a)) translateY(0) scale(1)}100%{opacity:0;transform:rotate(var(--a)) translateY(calc(var(--d) * -1)) scale(.2)}}
.rb-rg-dust{position:absolute;width:3px;height:3px;border-radius:50%;background:#f6dc9a;box-shadow:0 0 8px #f6dc9a;opacity:0;pointer-events:none;animation:rg-dust var(--t) linear var(--dl) infinite}
@keyframes rg-dust{0%{opacity:0;transform:translateY(0)}15%{opacity:.9}100%{opacity:0;transform:translateY(-38vh)}}
.rb-rg-full .rb-rg-fstage{position:relative;min-height:1.6em;padding:8px 22px;border-radius:999px;background:rgba(13,11,31,.82);border:1px solid rgba(226,189,107,.45);box-shadow:0 0 24px rgba(140,100,255,.35);max-width:min(92vw,560px);word-break:keep-all;font-size:clamp(16px,2.6vmin,24px);letter-spacing:.14em;text-align:center;text-shadow:0 0 18px rgba(226,189,107,.7)}
/* 글리치 공명: 크림색 선화 + 색수차, 금 간 유리, 사슬, 깨진 글자가 RETURN으로 맞춰진다 */
.rb-rg-full.glitch .rb-rg-big{filter:drop-shadow(-2.5px 0 0 rgba(255,70,140,.75)) drop-shadow(2.5px 0 0 rgba(70,225,255,.7)) drop-shadow(0 0 16px rgba(255,236,200,.65));animation:rg-gl 2.2s steps(1) infinite}
@keyframes rg-gl{0%,100%{transform:none}91%{transform:translate(3px,-2px) skewX(-2deg)}93%{transform:translate(-4px,1px)}95%{transform:none}}
.rb-rg-full.glitch .rb-rg-big .face{fill:rgba(16,11,6,.72);stroke:#fff1d6}
.rb-rg-full.glitch .rb-rg-big text{fill:#fff1d6}
.rb-rg-full.glitch .rb-rg-halo{background:radial-gradient(circle,rgba(255,236,200,.22) 0%,rgba(255,236,200,.06) 45%,transparent 68%)}
.rb-rg-full.glitch .rb-rg-rays{opacity:.35}
.rb-rg-fx{position:absolute;inset:-16%;width:132%;height:132%;pointer-events:none;overflow:visible;filter:drop-shadow(-2px 0 0 rgba(255,70,140,.7)) drop-shadow(2px 0 0 rgba(70,225,255,.65)) drop-shadow(0 0 10px rgba(255,236,200,.6))}
.rb-rg-fx .crack{fill:none;stroke:#fffaf0;stroke-width:.55;stroke-linecap:round;stroke-dasharray:var(--l);stroke-dashoffset:var(--l);animation:rg-crack .5s ease-out var(--dl) forwards}
@keyframes rg-crack{to{stroke-dashoffset:0}}
.rb-rg-full.tick .rb-rg-fx .crack{animation:rg-crack .5s ease-out var(--dl) forwards,rg-crackflash .6s ease-out}
@keyframes rg-crackflash{0%{stroke:#fff;stroke-width:1.4}100%{stroke-width:.55}}
.rb-rg-fx .chain{transform-origin:100px 100px;animation:rg-sway 2.6s ease-in-out infinite alternate}
.rb-rg-fx .chain.r{animation-delay:-1.3s}
@keyframes rg-sway{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
.rb-rg-fx .chain ellipse{fill:none;stroke:#fff1d6;stroke-width:1.6}
.rb-rg-full.tick .rb-rg-fx .chain.l{animation:rg-snapl .9s cubic-bezier(.2,.8,.3,1) forwards}
.rb-rg-full.tick .rb-rg-fx .chain.r{animation:rg-snapr .9s cubic-bezier(.2,.8,.3,1) forwards}
@keyframes rg-snapl{to{transform:translate(-26px,18px) rotate(-14deg);opacity:0}}
@keyframes rg-snapr{to{transform:translate(26px,18px) rotate(14deg);opacity:0}}
.rb-rg-word{position:relative;margin-top:clamp(-40px,-4vmin,-10px);font-family:Impact,"Arial Black","Bebas Neue",system-ui,sans-serif;font-weight:900;font-size:clamp(48px,13vmin,128px);letter-spacing:.08em;line-height:1;color:#ffe9ef;
  text-shadow:-4px 0 0 rgba(255,70,140,.8),4px 0 0 rgba(70,225,255,.75),0 0 22px rgba(255,236,200,.8);animation:rg-wjit .14s steps(2) infinite}
@keyframes rg-wjit{50%{transform:translate(1px,-1px) skewX(-1.5deg)}}
.rb-rg-word::after{content:attr(data-t);position:absolute;inset:0;color:#fff;clip-path:inset(40% 0 42% 0);transform:translateX(6px);opacity:.85;animation:rg-slice 1.3s steps(1) infinite}
@keyframes rg-slice{0%{clip-path:inset(40% 0 42% 0);transform:translateX(6px)}25%{clip-path:inset(10% 0 78% 0);transform:translateX(-7px)}50%{clip-path:inset(70% 0 12% 0);transform:translateX(4px)}75%{clip-path:inset(0 0 100% 0)}}
.rb-rg-full.tick .rb-rg-word{animation:rg-wsettle .5s ease-out forwards}
@keyframes rg-wsettle{0%{transform:scale(1.18);filter:brightness(2)}100%{transform:none;filter:none}}
.rb-rg-full.tick .rb-rg-word::after{animation:none;opacity:0}
.rb-rg-full.glitch .rb-rg-fstage{font-size:clamp(13px,2vmin,17px);padding:5px 16px}
@media (prefers-reduced-motion:reduce){.rb-rg-fx .crack{stroke-dashoffset:0}}
.rb-rg-full .rb-rg-flash{position:fixed;inset:0;opacity:0;background:radial-gradient(circle at 50% 45%,rgba(255,246,214,.85),rgba(246,220,154,.25) 30%,transparent 60%)}
.rb-rg-full.tick .rb-rg-flash{animation:rg-flash .9s ease-out}
@media (prefers-reduced-motion:reduce){.rb-rg-full,.rb-rg-full *{animation:none!important;transition:none!important}}
@media (prefers-reduced-motion:reduce){.rb-rg *,.rb-rg-stars{animation:none!important;transition:none!important}}
`;

function clockSvg(doc) {
  const ns = "http://www.w3.org/2000/svg";
  const el = (t, a, kids = []) => { const n = doc.createElementNS(ns, t); for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); kids.forEach((c) => n.appendChild(c)); return n; };
  const nums = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  const ring = el("g", { class: "ring" }, [
    el("circle", { cx: 60, cy: 60, r: 56, fill: "none", stroke: "#e2bd6b", "stroke-width": 1.2, "stroke-dasharray": "2 4" }),
    ...nums.map((t, i) => { const a = (i * 30 - 90) * Math.PI / 180; const x = el("text", { x: (60 + Math.cos(a) * 47).toFixed(1), y: (60 + Math.sin(a) * 47 + 3).toFixed(1), "text-anchor": "middle", "font-size": 7.5, fill: "#f6dc9a", "font-family": "Georgia,serif" }); x.textContent = t; return x; })
  ]);
  return el("svg", { class: "rb-rg-clock", viewBox: "0 0 120 120", "aria-hidden": "true" }, [
    el("circle", { cx: 60, cy: 60, r: 40, fill: "rgba(13,11,31,.65)", stroke: "#e2bd6b", "stroke-width": 1.5 }),
    el("circle", { cx: 60, cy: 60, r: 36, fill: "none", stroke: "rgba(226,189,107,.35)", "stroke-width": .8 }),
    ring,
    el("line", { class: "hand-h", x1: 60, y1: 60, x2: 60, y2: 38, stroke: "#f6dc9a", "stroke-width": 2.6, "stroke-linecap": "round" }),
    el("line", { class: "hand-m", x1: 60, y1: 64, x2: 60, y2: 28, stroke: "#e2bd6b", "stroke-width": 1.6, "stroke-linecap": "round" }),
    el("circle", { cx: 60, cy: 60, r: 3, fill: "#f6dc9a" })
  ]);
}

// 화면 가운데 큰 시계: 금빛 테·룬 고리·톱니·눈금·떠도는 빛. 바늘은 JS가 돌린다(멈출 때 12시에 '딸깍' 맞추려고)
function bigClock(doc) {
  const ns = "http://www.w3.org/2000/svg";
  const el = (t, a = {}, kids = []) => { const n = doc.createElementNS(ns, t); for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); kids.forEach((c) => n.appendChild(c)); return n; };
  const txt = (x, y, t, a) => { const n = el("text", { x, y, "text-anchor": "middle", "dominant-baseline": "middle", ...a }); n.textContent = t; return n; };
  const C = 100, pt = (r, deg) => [C + Math.cos((deg - 90) * Math.PI / 180) * r, C + Math.sin((deg - 90) * Math.PI / 180) * r];
  const defs = el("defs", {}, [
    el("radialGradient", { id: "rg-face", cx: "50%", cy: "42%", r: "60%" }, [el("stop", { offset: "0", "stop-color": "#3b2b7a" }), el("stop", { offset: ".6", "stop-color": "#17113a" }), el("stop", { offset: "1", "stop-color": "#08061a" })]),
    el("linearGradient", { id: "rg-gold", x1: "0", y1: "0", x2: "1", y2: "1" }, [el("stop", { offset: "0", "stop-color": "#fff1c4" }), el("stop", { offset: ".45", "stop-color": "#e2bd6b" }), el("stop", { offset: "1", "stop-color": "#9b7330" })]),
    el("filter", { id: "rg-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, [el("feGaussianBlur", { stdDeviation: "1.6", result: "b" }), el("feMerge", {}, [el("feMergeNode", { in: "b" }), el("feMergeNode", { in: "SourceGraphic" })])])
  ]);
  const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";
  const runes = el("g", { class: "runes" }, [el("circle", { cx: C, cy: C, r: 96, fill: "none", stroke: "rgba(226,189,107,.35)", "stroke-width": .6 }), el("circle", { cx: C, cy: C, r: 88, fill: "none", stroke: "rgba(226,189,107,.35)", "stroke-width": .6 }),
    ...[...RUNES].map((r, i) => { const [x, y] = pt(92, i * 15); return txt(x.toFixed(1), y.toFixed(1), r, { "font-size": 6, fill: "rgba(246,220,154,.8)", transform: `rotate(${i * 15} ${x.toFixed(1)} ${y.toFixed(1)})` }); })]);
  const gear = el("g", { class: "gear" }, Array.from({ length: 48 }, (_, i) => { const [x1, y1] = pt(84, i * 7.5), [x2, y2] = pt(86.5, i * 7.5); return el("line", { x1, y1, x2, y2, stroke: "#e2bd6b", "stroke-width": 1.4, opacity: .7 }); }));
  const ticks = el("g", {}, Array.from({ length: 60 }, (_, i) => { const big = i % 5 === 0, [x1, y1] = pt(big ? 70 : 73, i * 6), [x2, y2] = pt(76, i * 6); return el("line", { x1, y1, x2, y2, stroke: big ? "#f6dc9a" : "rgba(246,220,154,.5)", "stroke-width": big ? 1.6 : .6 }); }));
  const NUMS = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  const nums = el("g", {}, NUMS.map((t, i) => { const [x, y] = pt(60, i * 30); return txt(x.toFixed(1), y.toFixed(1), t, { "font-size": i === 0 ? 10 : 8, fill: "#f6dc9a", "font-family": "Georgia,serif", class: i === 0 ? "xii" : "" }); }));
  const orbit = el("g", { class: "orbit" }, [0, 120, 240].map((d) => { const [x, y] = pt(80, d); return el("circle", { cx: x, cy: y, r: 1.6, fill: "#fff6d8", filter: "url(#rg-glow)" }); }));
  const orbit2 = el("g", { class: "orbit2" }, [60, 200, 300].map((d) => { const [x, y] = pt(66, d); return el("circle", { cx: x, cy: y, r: 1.1, fill: "#cfc2ff", filter: "url(#rg-glow)" }); }));
  const hh = el("g", {}, [el("path", { d: `M${C} ${C + 8} L${C - 3.2} ${C} L${C} ${C - 40} L${C + 3.2} ${C} Z`, fill: "url(#rg-gold)" })]);
  const mh = el("g", {}, [el("path", { d: `M${C} ${C + 12} L${C - 2} ${C} L${C} ${C - 62} L${C + 2} ${C} Z`, fill: "#fff1c4" }), el("circle", { cx: C, cy: C - 50, r: 2.4, fill: "none", stroke: "#fff1c4", "stroke-width": .8 })]);
  const svg = el("svg", { class: "rb-rg-big", viewBox: "0 0 200 200", "aria-hidden": "true" }, [
    defs, runes, gear,
    el("circle", { class: "face", cx: C, cy: C, r: 80, fill: "url(#rg-face)", stroke: "url(#rg-gold)", "stroke-width": 3 }),
    el("circle", { cx: C, cy: C, r: 77, fill: "none", stroke: "rgba(226,189,107,.4)", "stroke-width": .6 }),
    orbit, ticks, nums, orbit2,
    el("circle", { cx: C, cy: C, r: 30, fill: "none", stroke: "rgba(207,194,255,.25)", "stroke-width": .6, "stroke-dasharray": "1 3" }),
    hh, mh, el("circle", { cx: C, cy: C, r: 4.5, fill: "url(#rg-gold)" }), el("circle", { cx: C, cy: C, r: 1.6, fill: "#08061a" })
  ]);
  const set = (m, hr) => { mh.setAttribute("transform", `rotate(${m} ${C} ${C})`); hh.setAttribute("transform", `rotate(${hr} ${C} ${C})`); };
  return { svg, set };
}

// 금 간 유리 + 사슬(시계 위에 겹치는 선화). 무작위 대신 고정 씨앗으로 매번 같은 모양
function fxLayer(doc) {
  const ns = "http://www.w3.org/2000/svg";
  const el = (t, a = {}, kids = []) => { const n = doc.createElementNS(ns, t); for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); kids.forEach((c) => n.appendChild(c)); return n; };
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cracks = [];
  for (let i = 0; i < 16; i++) {   // 가운데서 뻗는 금 + 가지
    let a = (i / 16) * Math.PI * 2 + rnd() * .3, x = 100 + Math.cos(a) * 8, y = 100 + Math.sin(a) * 8, d = `M${x.toFixed(1)} ${y.toFixed(1)}`, len = 0;
    const steps = 4 + Math.floor(rnd() * 4);
    for (let k = 0; k < steps; k++) { const r = 6 + rnd() * 9; a += (rnd() - .5) * .7; x += Math.cos(a) * r; y += Math.sin(a) * r; len += r; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      if (rnd() < .35) { const b = a + (rnd() < .5 ? -1 : 1) * (.6 + rnd() * .6), r2 = 6 + rnd() * 10; cracks.push(el("path", { class: "crack", d: `M${x.toFixed(1)} ${y.toFixed(1)} L${(x + Math.cos(b) * r2).toFixed(1)} ${(y + Math.sin(b) * r2).toFixed(1)}`, style: `--l:${r2.toFixed(0)};--dl:${(.5 + k * .18 + i * .03).toFixed(2)}s` })); } }
    cracks.unshift(el("path", { class: "crack", d, style: `--l:${len.toFixed(0)};--dl:${(.25 + i * .05).toFixed(2)}s` }));
  }
  const chain = (side) => {   // 시계 옆을 감싸는 사슬(타원 고리를 호를 따라 늘어놓음)
    const links = [];
    for (let k = 0; k < 24; k++) { const t = side === "l" ? 196 + k * 5.6 : 30 + k * 5.6, a = (t - 90) * Math.PI / 180, R = 90 + Math.sin(k * .5) * 3, x = 100 + Math.cos(a) * R, y = 100 + Math.sin(a) * R;
      links.push(el("ellipse", { cx: x.toFixed(1), cy: y.toFixed(1), rx: k % 2 ? 2.2 : 5.4, ry: k % 2 ? 1.2 : 2.5, transform: `rotate(${(t).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})` })); }
    return el("g", { class: `chain ${side}` }, links);
  };
  return el("svg", { class: "rb-rg-fx", viewBox: "0 0 200 200", "aria-hidden": "true" }, [el("g", {}, cracks), chain("l"), chain("r")]);
}

// 깨진 글자: 잠시 기호로 깨져 있다가 끝에 RETURN으로 맞춰진다
function glitchWord(el, target = "RETURN") {
  const junk = "@#%!$&*?/<>";
  let on = true;
  const id = setInterval(() => { if (!on) return; const t = [...target].map((c, i) => (Math.random() < .45 ? junk[(Math.random() * junk.length) | 0] : c)).join(""); el.textContent = t; el.dataset.t = t; }, 110);
  return { settle() { on = false; clearInterval(id); el.textContent = target; el.dataset.t = target; }, stop() { clearInterval(id); } };
}

// 바늘 돌리기: 거꾸로(시간을 되감듯) 빠르게 돌다가, land()를 부르면 느려지며 12시 바로 앞에서 멈칫한 뒤 '딸깍' 12시에 맞는다
function spinner(clock, { reduced = false, onTick = () => {} } = {}) {
  let m = 300, hr = 300 / 12 + 150, speed = 0, raf = 0, last = 0, mode = "spin";
  const now = () => (globalThis.performance?.now?.() ?? Date.now());
  const frame = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    if (mode === "spin") { speed = Math.min(1800, speed + 2600 * dt); m -= speed * dt; hr -= speed / 9 * dt; clock.set(m, hr); }
    raf = requestAnimationFrame(frame);
  };
  if (!reduced) { last = now(); raf = requestAnimationFrame(frame); } else clock.set(0, 0);
  const tween = (ms, fn) => new Promise((res) => { const t0 = now(); const step = () => { const k = Math.min(1, (now() - t0) / ms); fn(k); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
  return {
    async land() {
      mode = "land"; cancelAnimationFrame(raf);
      if (reduced) { clock.set(0, 0); onTick(); return; }
      // 거꾸로 돌고 있으므로 지금보다 작은(1바퀴 반 이상 남은) 360의 배수로
      const tm = Math.floor((m - 540) / 360) * 360, th = Math.floor((hr - 200) / 360) * 360;
      const m0 = m, h0 = hr, nearM = tm + 9, nearH = th + 4;   // 12시 바로 앞(9°)에서 멈칫
      const ease = (k) => 1 - Math.pow(1 - k, 4);
      await tween(1700, (k) => clock.set(m0 + (nearM - m0) * ease(k), h0 + (nearH - h0) * ease(k)));
      await new Promise((r) => setTimeout(r, 260));
      // 딸깍: 짧게 넘어갔다 돌아와 12시에 고정
      await tween(70, (k) => clock.set(nearM + (tm - 2.5 - nearM) * k, nearH + (th - 1 - nearH) * k));
      onTick();
      await tween(140, (k) => clock.set(tm - 2.5 + 2.5 * k, th - 1 + 1 * k));
      clock.set(0, 0);
    },
    stop() { cancelAnimationFrame(raf); }
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STAGES = ["시간의 실을 되감는 중…", "기억을 한데 모으는 중…", "새로운 시간선을 여는 중…"];

/**
 * 회귀 창을 연다. src: {ci, chaId, chatId, chatName?, folder?, who?}
 * 반환: 만든 결과 {chat, chatIndex, person, counts} 또는 null(닫음)
 */
export async function openRegress(ctx, src) {
  const M = ctx.memory;
  const folder = src.folder ?? await M.store.getFolder(src.chaId, src.chatId).catch(() => null);
  const people = regressCandidates(folder);
  const pick = new Set(src.who && people.some((p) => p.key === src.who) ? [src.who] : people[0] ? [people[0].key] : []);
  const label = () => `회귀 · ${people.filter((p) => pick.has(p.key)).map((p) => p.name).join(" · ")}`;
  return modal(ctx.win, (done) => {
    const root = h("div", { class: "rb-rg", role: "dialog", "aria-modal": "true", "aria-labelledby": "rb-rg-title" });
    const list = h("div", { class: "rb-rg-list", role: "group", "aria-label": "회귀할 인물" });
    const stage = h("div", { class: "rb-rg-stage", "aria-live": "polite" });
    const nm = h("input", { value: pick.size ? label() : "", "aria-label": "새 채팅 이름", maxlength: 120 });
    let touched = false; nm.addEventListener("input", () => { touched = true; });
    const go = h("button", { type: "button", class: "rb-rg-go", disabled: !pick.size || null }, "회귀한다");
    const paint = () => replace(list, people.map((p) => h("button", {
      type: "button", class: "rb-rg-p", "aria-pressed": String(pick.has(p.key)),
      onClick: () => { pick.has(p.key) ? pick.delete(p.key) : pick.add(p.key); if (!touched) nm.value = pick.size ? label() : ""; go.disabled = !pick.size; paint(); }
    }, h("span", { class: "rb-rg-av", "aria-hidden": "true" }, p.name.trim().slice(0, 1) || "?"),
      h("span", null, h("b", null, p.name), h("small", null, `기억 ${p.records}개${p.digest ? " · 요약" : ""}`)))));
    paint();
    let busy = false;
    const close = () => { if (!busy) done(null); };
    go.addEventListener("click", async () => {
      if (!pick.size || busy) return;
      busy = true; root.classList.add("spinning"); go.disabled = true;
      // 화면 전체를 덮는 큰 시계 연출(모달 밖, 문서 맨 위에 붙인다)
      const doc = ctx.win.ownerDocument ?? document;
      const fstage = h("div", { class: "rb-rg-fstage", "aria-live": "polite" }, STAGES[0]);
      const big = bigClock(doc), reduced = !!ctx.win.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const sparks = Array.from({ length: 18 }, (_, k) => h("i", { class: "rb-rg-spark", style: `--a:${k * 20 + (k % 2) * 7}deg;--d:${28 + (k % 3) * 9}vmin` }));
      const dust = Array.from({ length: 22 }, (_, k) => h("i", { class: "rb-rg-dust", style: `left:${(k * 37) % 100}%;top:${60 + (k * 13) % 40}%;--t:${3 + (k % 5) * 0.7}s;--dl:${(k % 7) * 0.35}s` }));
      const stageWrap = h("div", { class: "rb-rg-stagewrap" }, h("div", { class: "rb-rg-halo" }), h("div", { class: "rb-rg-rays" }), big.svg, fxLayer(doc), h("i", { class: "rb-rg-wave" }), h("i", { class: "rb-rg-wave w2" }), ...sparks);
      const word = h("div", { class: "rb-rg-word", "aria-hidden": "true", "data-t": "RETURN" }, "RETURN"), gw = glitchWord(word);
      const full = h("div", { class: "rb-rg-full glitch", role: "status" }, h("style", null, CSS), ...dust, h("div", { class: "rb-rg-flash", "aria-hidden": "true" }), stageWrap, word, fstage);
      (doc.body ?? ctx.win).appendChild(full);
      requestAnimationFrame(() => full.classList.add("on"));
      const spin = spinner(big, { reduced, onTick: () => { gw.settle(); full.classList.add("tick"); } });
      const endFull = async () => { full.classList.remove("on"); await sleep(450); full.remove(); };
      let i = 0; stage.textContent = STAGES[0];
      const tick = setInterval(() => { i = (i + 1) % STAGES.length; stage.textContent = fstage.textContent = STAGES[i]; }, 900);
      try {
        const [res] = await Promise.all([
          createRegressChat(ctx.api, src.ci, { store: M.store, folder, who: [...pick], name: nm.value.trim(), isGenerating, Busy }),
          sleep(2800)   // 연출: 시계가 충분히 돌아가게
        ]);
        clearInterval(tick); fstage.textContent = "XII…";
        await spin.land();   // 느려지다가 딸깍, 12시
        fstage.textContent = stage.textContent = `${res.person}의 기억과 함께, 처음으로 돌아왔어요.`;
        await sleep(1500);
        await endFull();
        busy = false; done(res);
      } catch (e) {
        clearInterval(tick); spin.stop(); gw.stop(); await endFull(); root.classList.remove("spinning"); busy = false; go.disabled = false;
        stage.textContent = e instanceof Busy ? "응답이 나오는 중이에요. 끝난 뒤에 다시 시도해 주세요." : `회귀하지 못했어요: ${e?.message ?? e}`;
      }
    });
    root.append(
      h("style", null, CSS), h("div", { class: "rb-rg-stars", "aria-hidden": "true" }), h("div", { class: "rb-rg-flash", "aria-hidden": "true" }),
      h("button", { type: "button", class: "rb-rg-x", "aria-label": "닫기", onClick: close }, "✕"),
      h("div", { class: "rb-rg-head" }, clockSvg(ctx.win.ownerDocument ?? document), h("span", { class: "rb-rg-eyebrow" }, "Regression"), h("h3", { id: "rb-rg-title" }, "회귀"),
        h("p", { class: "rb-rg-sub" }, "회귀할 사람을 고르세요. 여러 명도 돼요. 고른 사람만 지금까지의 기억을 안고 처음으로 돌아가고, 다른 이들은 아무것도 기억하지 못해요.")),
      ...(people.length ? [
        list,
        h("label", { class: "rb-rg-field" }, "새 채팅 이름", nm),
        h("p", { class: "rb-rg-note" }, "고른 인물의 장기 기억·인물 위키·관계와 감정이 새 채팅으로 함께 가요. 장면과 진행 중인 일은 새로 시작해요. 지금 채팅은 그대로 남아요."),
        go, stage
      ] : [h("div", { class: "rb-rg-empty" }, "이 채팅에는 아직 기억된 인물이 없어요.", h("br"), "대화가 조금 쌓인 뒤에 다시 와 주세요.")])
    );
    return root;
  });
}

/** 지금 열린 채팅에서 회귀 창 열기(채팅 메뉴용). 결과가 있으면 안내 토스트 */
export async function openRegressHere(ctx) {
  const cur = await ctx.memory.switches.currentChat({ fresh: true });
  if (!cur) { ctx.toast("먼저 채팅을 열어 주세요."); return null; }
  const res = await openRegress(ctx, { ci: cur.ci, chaId: cur.chaId, chatId: cur.chatId, chatName: cur.chatName });
  if (res) ctx.toast(`‘${res.chat.name}’ 채팅을 만들었어요.${res.counts.wiki ? "" : " (인물 위키 문서는 없어서 기억만 옮겼어요)"}`);
  return res;
}
