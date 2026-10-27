// 인물 항목 관리: 항목 직접 추가·고치기·지우기와 NPC 감정 기록(리수폿 people-records-ui · npc-emotion-ui 대응).
// 규칙 검사는 리수폿 엔진이 한다(고정된 항목·편집 중 바뀐 항목·중복 대상·감정 형식은 거절하고 이유를 알려 준다).
import { h, replace } from "../../dom.js";
import { btn, modal, note, confirmDialog } from "../../kit.js";
import { fail } from "./common.js";
import { RECORD_GROUPS, groupInfo, listRecords, targetCandidates, addRecord, editRecord, removeRecord, checkEmotionText, EMOTION_HINT } from "../../../engine/personrecords.js";

const TARGET_HELP = { none: "", user: "대상은 나(user)로 정해져요.", npc: "대상은 다른 인물 1명이에요.", required: "누구에 대한 내용인지 골라 주세요.", optional: "대상을 고르지 않아도 돼요." };

export async function openRecords(env, doc) {
  const { ctx } = env, M = ctx.memory;
  const flowSt = await M.flow?.settings?.().catch?.(() => null), adult = flowSt?.rawSnapshot?.().sexualDesireEnabled === true;
  let wiki = env.folder.wiki, changed = false;
  const apply = async (fn, okText) => {
    let next;
    try { await M.store.updateFolder(env.bot.id, env.chatItem.id, (f) => { next = fn(f.wiki); f.wiki = next; }); wiki = next; changed = true; if (okText) ctx.toast(okText); return true; }
    catch (e) { fail(ctx)(e); return false; }
  };
  await modal(ctx.win, (done) => {
    const body = h("div"), docNow = () => wiki.documents[doc.id] ?? doc;
    let form = null;                       // { group, slot, target, text, title, editId }
    const groups = RECORD_GROUPS.filter((g) => adult || !g.adult);
    const paint = () => replace(body, form ? formView() : listView());
    const listView = () => {
      const lists = listRecords(docNow(), wiki);
      return h("div", null,
        h("p", { class: "rb-muted" }, "AI가 쓴 항목을 직접 고치거나, 없는 항목을 새로 적어요. 📌 고정된 항목은 먼저 고정을 풀어야 해요."),
        h("div", { class: "rb-mem-sact" }, btn("항목 추가", { kind: "primary", onClick: () => { form = { group: "secret", slot: "", target: "", text: "", title: "" }; paint(); } }),
          btn("NPC 감정 추가", { onClick: () => { form = { group: "emotion", slot: "", target: "", text: "", title: "" }; paint(); } })),
        lists.length ? lists.map((g) => h("section", { class: "rb-mem-sec" }, h("h4", null, g.label), h("ul", { class: "rb-mem-reclist" }, g.items.map((it) => h("li", { class: "rb-mem-rec" },
          h("div", { class: "txt" }, h("div", null, h("b", null, it.heading), it.target ? h("small", { class: "rb-muted" }, ` → ${it.target}`) : null), h("div", { class: "rb-muted", style: "white-space:pre-wrap" }, it.body.length > 260 ? it.body.slice(0, 260) + "…" : it.body)),
          btn("고치기", { size: "sm", onClick: () => { form = { group: g.group, editId: it.id, text: it.body, title: it.heading, slot: it.slotId ?? "", target: "" }; paint(); } }),
          btn("지우기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 항목을 지울까요?", body: it.heading, ok: "지우기", danger: true })) { if (await apply((w) => removeRecord(w, doc.id, it.id), "지웠어요.")) paint(); } } })))))) : h("div", { class: "rb-empty" }, "직접 관리할 수 있는 항목이 아직 없어요."));
    };
    const formView = () => {
      const editing = !!form.editId, g = groupInfo(form.group), slots = g.slots, slotDef = slots.find(([s]) => s === (form.slot || slots[0][0])) ?? slots[0];
      form.slot ||= slotDef[0];
      const mode = slotDef[2], cands = targetCandidates(wiki, doc.id);
      const tf = h("textarea", { class: "rb-input", style: "min-height:140px;height:auto;padding:10px", "aria-label": "내용", maxlength: slotDef[3] ?? g.max, onInput: (e) => { form.text = e.target.value; } }); tf.value = form.text;
      const grpSel = h("select", { class: "rb-input", "aria-label": "항목 종류", disabled: editing, onChange: (e) => { form.group = e.target.value; form.slot = ""; form.target = ""; paint(); } }, groups.map((x) => h("option", { value: x.id, selected: x.id === form.group }, x.label)));
      const slotSel = slots.length > 1 ? h("select", { class: "rb-input", "aria-label": "세부 종류", disabled: editing, onChange: (e) => { form.slot = e.target.value; form.target = ""; paint(); } }, slots.map(([s, l]) => h("option", { value: s, selected: s === form.slot }, l))) : null;
      const needsTarget = !editing && ["required", "npc", "optional"].includes(mode);
      const tgtSel = needsTarget ? h("select", { class: "rb-input", "aria-label": "대상", onChange: (e) => { form.target = e.target.value; } },
        h("option", { value: "" }, mode === "optional" ? "대상 없음" : "대상을 골라 주세요"),
        mode === "required" || mode === "optional" ? h("option", { value: "actor:user", selected: form.target === "actor:user" }, "나(user)") : null,
        cands.map((c) => h("option", { value: c.id, selected: form.target === c.id }, c.title))) : null;
      const hint = form.group === "emotion" ? note("info", `형식 ${EMOTION_HINT}`) : null;
      return h("div", null,
        h("h4", null, editing ? `${g.label} 고치기` : "항목 추가"),
        editing ? null : h("label", { class: "rb-mem-field" }, h("span", null, "항목 종류"), grpSel),
        !editing && slotSel ? h("label", { class: "rb-mem-field" }, h("span", null, "세부 종류"), slotSel) : null,
        needsTarget ? h("label", { class: "rb-mem-field" }, h("span", null, "대상"), tgtSel, h("small", { class: "rb-muted" }, TARGET_HELP[mode])) : null,
        hint, tf,
        h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => { form = null; paint(); } }), btn("저장", { kind: "primary", onClick: async () => {
          const text = form.text.trim(); if (!text) return ctx.toast("내용을 적어 주세요.", { error: true });
          if (form.group === "emotion") { const bad = checkEmotionText(text); if (bad) return ctx.toast(bad, { error: true }); }
          const ok = editing ? await apply((w) => editRecord(w, doc.id, form.editId, text), "고쳤어요.")
            : await apply((w) => addRecord(w, doc.id, { group: form.group, slotId: form.slot, targetRef: mode === "user" ? "actor:user" : mode === "none" ? "" : form.target, text }), "추가했어요.");
          if (ok) { form = null; paint(); }
        } })));
    };
    paint();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(680px,96vw);max-height:90vh;overflow:auto" }, h("h3", null, `${doc.title} 항목 관리`), body,
      h("div", { class: "rb-dialog-actions" }, btn("닫기", { kind: "primary", onClick: () => done(null) })));
  });
  if (changed) env.redraw();
}
