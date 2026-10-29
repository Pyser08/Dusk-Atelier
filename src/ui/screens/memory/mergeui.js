// 인물 합치기(미리보기 포함): 남길 인물과 합칠 인물을 고르면, 인물 문서가 둘 다 있을 때는 리수폿 통합 규칙으로 변경안을 만들고
// 충돌 항목마다 남길 쪽을 고르게 한다. 사건 기록·별칭은 Dusk 쪽도 함께 합친다.
import { h, replace } from "../../dom.js";
import { btn, modal, note, confirmDialog } from "../../kit.js";
import { fail } from "./common.js";
import { findDoc } from "../../../engine/personview.js";
import { planPersonMerge, applyPersonMerge } from "../../../engine/pot/person-merge.js";

const show = (v) => v == null || v === "" ? "없음" : Array.isArray(v) ? v.map(show).join(" · ") : typeof v === "object" ? Object.values(v).map(show).join(" / ") : String(v);
const OPT = { keep: "남길 인물 값", source: "합칠 인물 값", exclude: "이 항목 제외" };

// 사건 기록·별칭 합치기(Dusk 쪽). 합칠 인물은 지워진다.
export function duskMerge(f, ka, kb) {
  const pa = f.people[ka], pb = f.people[kb];
  if (!pa || !pb || ka === kb) throw new Error("두 이름이 서로 다른 기존 인물이어야 해요.");
  pa.aliases = [...new Set([...(pa.aliases ?? []), pb.name, ...(pb.aliases ?? [])])];
  const seen = new Set(pa.records.map((r) => r.act));
  for (const r of pb.records) if (!seen.has(r.act)) pa.records.push(r);
  pa.records.sort((x, y) => (x.at ?? -1) - (y.at ?? -1)); delete f.people[kb];
}

export async function openMerge(env, people) {
  const { ctx } = env, M = ctx.memory;
  const items = people.map(([k, p]) => ({ k, p }));
  if (items.length < 2) return ctx.toast("합칠 인물이 둘 이상 있어야 해요.");
  const slots = (() => { try { return JSON.parse(M.lib.base.slots).slots; } catch { return []; } })();
  await modal(ctx.win, (done) => {
    let keepK = items[0].k, srcK = items[1].k, plan = null, choices = {}, err = "";
    const body = h("div"), docOf = (k) => findDoc(env.folder.wiki, env.folder.people[k]);
    const pick = (label, get, set) => h("label", { class: "rb-mem-field" }, h("span", null, label), h("select", { class: "rb-input", "aria-label": label, onChange: (e) => { set(e.target.value); plan = null; choices = {}; err = ""; paint(); } }, items.map((i) => h("option", { value: i.k, selected: i.k === get() }, i.p.name))));
    const make = () => {
      err = ""; plan = null; choices = {};
      try {
        const a = docOf(keepK), b = docOf(srcK);
        if (a && b) { if (a.id === b.id) throw new Error("두 인물이 같은 문서예요."); plan = planPersonMerge(env.folder.wiki, a.id, b.id, { slotDefinitions: slots }); for (const c of plan.conflicts) choices[c.id] = c.options[0]; }
      } catch (e) { err = e?.message ?? String(e); }
      paint();
    };
    const apply = async () => {
      try {
        // 합치기 전 백업: 두 인물과 두 위키 문서를 그대로 보관(최근 5건). 인물 메뉴 ‘합치기 되돌리기’로 복원한다.
        const a = docOf(keepK), b = docOf(srcK), clone = (v) => v == null ? null : JSON.parse(JSON.stringify(v));
        const snap = { at: Date.now(), botId: env.bot.id, chatId: env.chatItem.id, keepK, srcK, keepName: env.folder.people[keepK].name, srcName: env.folder.people[srcK].name,
          people: { [keepK]: clone(env.folder.people[keepK]), [srcK]: clone(env.folder.people[srcK]) }, docs: { [a?.id ?? ""]: clone(a), [b?.id ?? ""]: clone(b) } };
        delete snap.docs[""];
        await M.store.updateIndex((i) => { i.mergeBackups = [snap, ...(i.mergeBackups ?? [])].slice(0, 5); });
        await M.store.updateFolder(env.bot.id, env.chatItem.id, (f) => { if (plan) f.wiki = applyPersonMerge(f.wiki, plan, choices); duskMerge(f, keepK, srcK); });
        ctx.toast("합쳤어요."); done(null); env.redraw();
      } catch (e) { err = e?.message ?? String(e); paint(); }
    };
    const paint = () => {
      const a = docOf(keepK), b = docOf(srcK), both = !!(a && b);
      replace(body,
        h("p", { class: "rb-muted" }, "합칠 인물은 사라지고, 이름은 별칭으로 남아요. 합치기 전에 변경 내용을 먼저 보여 드려요."),
        pick("남길 인물", () => keepK, (v) => { keepK = v; }), pick("합칠 인물", () => srcK, (v) => { srcK = v; }),
        keepK === srcK ? note("warn", "서로 다른 인물을 골라 주세요.") : null,
        !both ? note("info", "인물 문서가 둘 다 있을 때만 위키 항목까지 합쳐요. 지금은 사건 기록과 별칭만 합쳐져요.") : null,
        err ? note("err", err) : null,
        both && !plan && keepK !== srcK ? btn("합치기 변경 내용 보기", { onClick: make }) : null,
        plan ? h("div", null,
          plan.blockers?.length ? note("err", plan.blockers.map((x) => `${x.label}: ${x.message}`).join("\n")) : null,
          plan.preview?.length ? h("details", { class: "rb-mem-man", open: true }, h("summary", null, `합쳐지는 내용 ${plan.preview.length}개`), h("ul", null, plan.preview.slice(0, 40).map((x) => h("li", null, typeof x === "string" ? x : x.label ?? show(x))))) : null,
          plan.conflicts.length ? h("div", null, h("h4", null, "겹치는 항목 — 남길 쪽을 골라 주세요"), plan.conflicts.map((c) => h("article", { class: "rb-card rb-mem-chg" }, h("b", null, c.label),
            h("div", { class: "rb-mem-diff" }, h("div", null, h("small", { class: "rb-muted" }, "남길 인물"), h("pre", { class: "rb-mem-pre" }, show(c.keepValue))), h("div", null, h("small", { class: "rb-muted" }, "합칠 인물"), h("pre", { class: "rb-mem-pre" }, show(c.sourceValue)))),
            h("div", { class: "rb-mem-chats" }, c.options.map((o) => h("label", { class: "rb-mem-check" }, h("input", { type: "radio", name: c.id, checked: choices[c.id] === o, onChange: () => { choices[c.id] = o; } }), OPT[o] ?? o)))))) : null) : null);
    };
    paint();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(680px,96vw);max-height:90vh;overflow:auto" }, h("h3", null, "인물 합치기"), body,
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("합치기", { kind: "primary", onClick: () => { if (keepK === srcK) return; const both = docOf(keepK) && docOf(srcK); if (both && !plan) return make(); if (plan && plan.blockers?.length) return; apply(); } })));
  });
}

// 합치기 되돌리기: 이 채팅에서 가장 최근에 합친 것을 합치기 전 상태로 되돌린다(그 뒤 두 인물에 쌓인 기록은 사라진다).
export async function restoreLastMerge(env) {
  const { ctx } = env, M = ctx.memory, idx = await M.store.getIndex();
  const snap = (idx.mergeBackups ?? []).find((x) => String(x.botId) === String(env.bot.id) && String(x.chatId) === String(env.chatItem.id));
  if (!snap) return ctx.toast("되돌릴 합치기 기록이 없어요.");
  if (!(await confirmDialog(ctx.win, { title: "합치기를 되돌릴까요?", body: `‘${snap.srcName}’을(를) ‘${snap.keepName}’에 합치기 전(${new Date(snap.at).toLocaleString()})으로 돌려요. 그 뒤에 두 인물에 쌓인 기록은 사라져요.`, ok: "되돌리기", danger: true }))) return;
  await M.store.updateFolder(env.bot.id, env.chatItem.id, (f) => {
    for (const [k, v] of Object.entries(snap.people)) f.people[k] = v;
    if (f.wiki?.documents) for (const [id, d] of Object.entries(snap.docs)) f.wiki.documents[id] = d;
  });
  await M.store.updateIndex((i) => { i.mergeBackups = (i.mergeBackups ?? []).filter((x) => x !== snap && x.at !== snap.at); });
  ctx.toast("합치기 전으로 되돌렸어요."); env.redraw();
}
