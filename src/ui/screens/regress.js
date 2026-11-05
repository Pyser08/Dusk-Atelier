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
  let pick = src.who && people.find((p) => p.key === src.who) ? src.who : people[0]?.key ?? null;
  return modal(ctx.win, (done) => {
    const root = h("div", { class: "rb-rg", role: "dialog", "aria-modal": "true", "aria-labelledby": "rb-rg-title" });
    const list = h("div", { class: "rb-rg-list", role: "group", "aria-label": "회귀할 인물" });
    const stage = h("div", { class: "rb-rg-stage", "aria-live": "polite" });
    const nameOf = () => people.find((p) => p.key === pick)?.name ?? "";
    const nm = h("input", { value: pick ? `회귀 · ${people.find((p) => p.key === pick).me ? "나" : nameOf()}` : "", "aria-label": "새 채팅 이름", maxlength: 120 });
    let touched = false; nm.addEventListener("input", () => { touched = true; });
    const go = h("button", { type: "button", class: "rb-rg-go", disabled: !pick || null }, "회귀한다");
    const paint = () => replace(list, people.map((p) => h("button", {
      type: "button", class: "rb-rg-p", "aria-pressed": String(p.key === pick),
      onClick: () => { pick = p.key; if (!touched) nm.value = `회귀 · ${p.me ? "나" : p.name}`; go.disabled = false; paint(); }
    }, h("span", { class: "rb-rg-av", "aria-hidden": "true" }, (p.me ? "나" : p.name).trim().slice(0, 1) || "?"),
      h("span", null, h("b", null, p.me ? `나 (${p.name})` : p.name), h("small", null, `기억 ${p.records}개${p.digest ? " · 요약" : ""}`)))));
    paint();
    let busy = false;
    const close = () => { if (!busy) done(null); };
    go.addEventListener("click", async () => {
      if (!pick || busy) return;
      busy = true; root.classList.add("spinning"); go.disabled = true;
      let i = 0; stage.textContent = STAGES[0];
      const tick = setInterval(() => { i = (i + 1) % STAGES.length; stage.textContent = STAGES[i]; }, 900);
      try {
        const [res] = await Promise.all([
          createRegressChat(ctx.api, src.ci, { store: M.store, folder, who: pick, name: nm.value.trim(), isGenerating, Busy }),
          sleep(2600)   // 연출: 시계가 충분히 돌아가게
        ]);
        clearInterval(tick); root.classList.remove("spinning"); root.classList.add("done");
        stage.textContent = `${res.person}의 기억과 함께, 처음으로 돌아왔어요.`;
        await sleep(1100);
        busy = false; done(res);
      } catch (e) {
        clearInterval(tick); root.classList.remove("spinning"); busy = false; go.disabled = false;
        stage.textContent = e instanceof Busy ? "응답이 나오는 중이에요. 끝난 뒤에 다시 시도해 주세요." : `회귀하지 못했어요: ${e?.message ?? e}`;
      }
    });
    root.append(
      h("style", null, CSS), h("div", { class: "rb-rg-stars", "aria-hidden": "true" }), h("div", { class: "rb-rg-flash", "aria-hidden": "true" }),
      h("button", { type: "button", class: "rb-rg-x", "aria-label": "닫기", onClick: close }, "✕"),
      h("div", { class: "rb-rg-head" }, clockSvg(ctx.win.ownerDocument ?? document), h("span", { class: "rb-rg-eyebrow" }, "Regression"), h("h3", { id: "rb-rg-title" }, "회귀"),
        h("p", { class: "rb-rg-sub" }, "한 사람을 고르세요. 그 사람만 지금까지의 기억을 안고 처음으로 돌아가요. 다른 이들은 아무것도 기억하지 못해요.")),
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
