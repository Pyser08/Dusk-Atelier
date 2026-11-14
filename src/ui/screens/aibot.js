// 2.2.0 AI로 봇 만들기(3번 목업 A): 세 단계 — 봇 이름 → 시작 방식(빈 봇 · 기존 봇 고치기 · 봇빌더) → AI 제작 화면 열기.
// 실제 만들기는 예전과 같은 길(createBotAndEdit 초안·openCharEditor·startWorkshop)을 그대로 쓴다.
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { btn, emptyState } from '../kit.js';
import { dbRead } from '../../data/dbcache.js';
import { createWorkshopLink } from '../../data/workshop.js';
import { createBotAndEdit } from './newbot.js';
import { openCharEditor } from './chareditor.js';
import { startWorkshop } from './workshoplink.js';

import { AIBOT_WAYS, aibotStep } from "./aibotsteps.js";
export { AIBOT_WAYS, aibotStep };

export async function renderAiBot(ctx) {
  const host = h("div", { class: "rb-section rb-scroll rb-aib", "data-page": "aibot" });
  replace(ctx.main, host);
  if (!ctx.ext?.get?.("svc", "aibuild")) { replace(host, emptyState({ icon: "sparkle", title: "AI 봇 만들기 애드온이 꺼져 있어요", text: "관리 → 애드온에서 ‘AI 제작’을 켜면 쓸 수 있어요." })); return; }
  const st = (ctx.state.aibot ??= { name: "", way: "blank", botId: "" });
  const [db, ws] = await Promise.all([dbRead(ctx.api, ["characters"]).catch(() => null), (ctx.workshop ??= createWorkshopLink(ctx.api)).status().catch(() => null)]);
  const chars = (Array.isArray(db?.characters) ? db.characters : []).map((c, i) => ({ id: c.chaId, name: c.name || "이름 없는 봇", i })).filter((c) => c.id);
  const ways = AIBOT_WAYS.filter((w) => w.id !== "workshop" || (ws?.installed && ws.enabled));
  if (!ways.some((w) => w.id === st.way)) st.way = "blank";
  let busy = false;

  const go = async () => {
    if (busy) return;
    busy = true;
    try {
      if (st.way === "workshop") { if (!await startWorkshop(ctx)) await createBotAndEdit(ctx, { tab: "ai", name: st.name.trim() || "새 봇" }); }
      else if (st.way === "edit") { const c = chars.find((x) => x.id === st.botId); if (c) await openCharEditor(ctx, c.i, c.id, { startTab: "ai" }); }
      else await createBotAndEdit(ctx, { tab: "ai", name: st.name.trim() || "새 봇" });
    } catch (e) { ctx.toast(e?.message ?? String(e), { error: true }); }
    finally { busy = false; }
  };

  const draw = () => {
    const step = aibotStep(st);
    const num = (i) => h("span", { class: ["num", step > i ? "ok" : step === i && "on"], "aria-hidden": "true" }, step > i ? icon("check", 14) : String(i + 1));
    const nameIn = h("input", { class: "rb-input", type: "text", maxlength: "60", placeholder: "예: 검은 숲의 마녀", "aria-label": "봇 이름", value: st.name });
    nameIn.addEventListener("input", () => { const had = !!st.name.trim(); st.name = nameIn.value; if (had !== !!st.name.trim()) paintBar(); });
    nameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    const wayBtn = (w) => h("button", { type: "button", class: "rb-aib-way", "aria-pressed": st.way === w.id ? "true" : "false", dataset: { way: w.id }, onClick: () => { st.way = w.id; draw(); } },
      h("span", { class: "ico" }, icon(w.icon, 18)), h("b", null, w.label), h("small", null, w.text));
    const pickBot = st.way === "edit" ? (chars.length
      ? h("select", { class: "rb-input", "aria-label": "고칠 봇", onChange: (e) => { st.botId = e.target.value; draw(); } }, h("option", { value: "", selected: !st.botId }, "봇 고르기…"), ...chars.map((c) => h("option", { value: c.id, selected: c.id === st.botId }, c.name)))
      : h("small", { class: "rb-muted" }, "고칠 봇이 아직 없어요.")) : null;
    const label = st.way === "workshop" ? "봇빌더 열기" : st.way === "edit" ? "이 봇을 AI 제작 화면으로" : "AI 제작 화면 열기";
    const bar = h("div", { class: "rb-aib-bar", "aria-hidden": "true" });
    const paintBar = () => { const s = aibotStep(st); replace(bar, ...[0, 1, 2].map((i) => h("i", { class: i <= s ? "on" : "" }))); };
    paintBar();
    replace(host,
      h("div", { class: "rb-section-head" }, h("h1", { class: "rb-h2" }, "AI로 봇 만들기"), h("p", { class: "rb-muted" }, "세 단계면 돼요. 설명·첫 메시지·로어북은 제작 화면에서 AI와 함께 채워요.")),
      h("section", { class: "rb-aib-card" },
        bar,
        h("div", { class: "rb-aib-step" }, num(0), h("div", { class: "t" }, h("b", null, "봇 이름"), st.way === "edit" ? h("small", { class: "rb-muted" }, "기존 봇을 고칠 때는 그 봇 이름을 써요.") : nameIn)),
        h("div", { class: "rb-aib-step" }, num(1), h("div", { class: "t" }, h("b", null, "어떻게 시작할까요?"), h("div", { class: "rb-aib-ways" }, ways.map(wayBtn)), pickBot)),
        h("div", { class: "rb-aib-step" }, num(2), h("div", { class: "t" }, h("b", null, "AI 제작 화면 열기"), h("small", { class: "rb-muted" }, "만든 봇은 처음 저장할 때 목록에 들어가요. 저장 전에 닫으면 남지 않아요."),
          h("div", { class: "go" }, btn(label, { kind: "primary", icon: "sparkle", id: "rb-aib-go", disabled: st.way === "edit" && !st.botId, onClick: go }))))));
  };
  draw();
}

export var AIBOT_CSS = `
.rb-aib-card{position:relative;padding:20px 22px 12px 26px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,transparent);max-width:860px}
.rb-aib-card::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:linear-gradient(180deg,#ffb36b,#ff7a59);box-shadow:0 0 10px #ff8a5c}
.rb-aib-bar{display:flex;gap:6px;margin-bottom:8px}.rb-aib-bar i{flex:1;height:5px;border-radius:9px;background:var(--rb-hover)}.rb-aib-bar i.on{background:linear-gradient(90deg,#ffb36b,#ff7a59);box-shadow:0 0 8px color-mix(in srgb,#ff8a5c 60%,transparent)}
.rb-aib-step{display:flex;gap:14px;align-items:flex-start;padding:16px 0;border-top:1px solid var(--rb-line)}.rb-aib-bar+.rb-aib-step{border-top:0}
.rb-aib-step .num{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:800;background:var(--rb-hover);color:var(--rb-sub);flex:none}
.rb-aib-step .num.on{background:linear-gradient(135deg,#ffb36b,#ff7a59);color:#fff}.rb-aib-step .num.ok{background:color-mix(in srgb,#5fe0a8 22%,transparent);color:#5fe0a8}
.rb-aib-step .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}.rb-aib-step .t > b{font-size:15px}
.rb-aib-ways{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.rb-aib-way{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:14px;border-radius:14px;border:1px solid var(--rb-line2);background:var(--rb-surf);color:var(--rb-text);font:inherit;text-align:left;cursor:pointer}
.rb-aib-way .ico{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;margin-bottom:4px;color:#ff8a5c;background:color-mix(in srgb,#ff8a5c 10%,transparent);border:1px solid color-mix(in srgb,#ff8a5c 45%,transparent)}
.rb-aib-way small{color:var(--rb-sub);font-size:12.5px}
.rb-aib-way[aria-pressed=true]{border-color:#ff8a5c;box-shadow:0 0 0 1px #ff8a5c,0 0 12px color-mix(in srgb,#ff8a5c 30%,transparent)}
.rb-aib-way:focus-visible{outline:2px solid #ff8a5c;outline-offset:2px}
.rb-aib-step .go{display:flex;justify-content:flex-end}
.rb-skin-glass .rb-aib-card{background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
.rb-lite .rb-aib-card::before,.rb-lite .rb-aib-bar i.on{box-shadow:none}
@media (max-width:760px){.rb-aib-card{padding:16px 14px 8px 18px}.rb-aib-ways{grid-template-columns:1fr}.rb-aib-step .go{justify-content:stretch}.rb-aib-step .go .rb-btn{width:100%}}
`;
