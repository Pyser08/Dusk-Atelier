// addon-rebuild: 인물 위키 NSFW 탭 ‘성적 욕망 · 이상성향’ 카드(예전 ‘후보’ 목록을 새로).
// - 성적 욕망 / 이상성향 두 묶음, 항목마다 글 + 상태·출처 표시 + 잠금·삭제(거부 단추는 뺐다 — 삭제로 충분)
// - 우상단: 무작위 다시 뽑기 · 직접 추가. 직접 추가하면 성인 프로필도 새로 만들지 묻는다
// - 잠금은 채팅 폴더(f.adultLocks[후보 id])에 둔다(위키 정리 단계에서 모르는 칸이 지워지지 않게). 잠근 항목은 삭제·다시 뽑기에서 빠진다
import { isUserNsfwDoc } from "../../../engine/usernsfw.js";
import { h } from "../../dom.js";
import { btn, confirmDialog, modal } from "../../kit.js";
import { reviewPersonCandidate } from "../../../engine/pot/people-profile.js";
import { addManualAdult, deleteAdultCandidate } from "../../../engine/adultseed.js";
import { rerollAdult } from "./adultreroll.js";
import { addUserAdult, delUserAdult, lockUserAdult, rerollUserAdult, userAdultList } from "../../../engine/useradult.js";
import { readSeedOpt } from "../../../data/adultseed.js";
import { normalizeSeedOpt } from "../../../engine/adultseed.js";
import { regenerate } from "./nsfwcard.js";

const AXES = [["sexual_desire", "성적 욕망", "desire"], ["paraphilia", "이상성향", "kink"]];
const STATUS = { review: ["검토 대기", "wait"], collecting: ["근거 모으는 중", "wait"], approved: ["반영됨", "on"], rejected: ["뺌", "off"], reverted: ["되돌림", "off"] };
const originOf = (c) => String(c.id).startsWith("candidate_seed_") ? "무작위" : String(c.id).startsWith("candidate_manual_") || c.origin === "manual" && !String(c.id).startsWith("candidate_seed_") ? "직접" : "대화";

const edit = (env, fn, ok) => env.ctx.memory.store.updateFolder(env.bot.id, env.chatItem.id, fn).then(() => { if (ok) env.ctx.toast(ok); env.redraw?.(); }).catch((e) => env.ctx.toast(String(e?.message ?? e), { error: true }));

async function askRegen(env, doc, what) {
  if (!(await confirmDialog(env.ctx.win, { title: "성인 프로필도 새로 만들까요?", body: `${what} 내용을 바탕으로 체위·장소·플레이·유혹 등을 다시 만들어요(호출 1번). 성적 수치와 태그는 그대로 둬요.`, ok: "새로 만들기" }))) return;
  const n = env.folder?.nsfw?.[doc.id];
  await regenerate(env, doc, { keep: n?.sexual ? { sexual: n.sexual } : null });
}

async function addDialog(env, doc) {
  let axis = "sexual_desire";
  const ta = h("textarea", { class: "rb-input", rows: 3, id: "rb-ac-add-text", placeholder: "예: 위에서 주도하는 걸 좋아한다", style: "width:100%" });
  const seg = h("div", { class: "rb-ac-seg", role: "radiogroup" }, ...AXES.map(([k, label]) => h("button", { type: "button", class: ["rb-ac-segb", k === axis && "on"], role: "radio", "aria-checked": String(k === axis), "data-k": k,
    onClick: (e) => { axis = k; for (const b of seg.children) { const on = b.dataset.k === k; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); } } }, label)));
  const ok = await modal(env.ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "직접 추가", id: "rb-ac-add", style: "width:min(480px,94vw);display:flex;flex-direction:column;gap:10px" },
    h("h3", { class: "rb-h3" }, `${doc.title} · 직접 추가`), seg, ta,
    h("small", { class: "rb-muted" }, isUserNsfwDoc(doc) ? "적은 내용은 이 채팅의 내 칸에 저장돼요. 나중에 잠그거나 지울 수 있어요." : "적은 내용은 바로 인물 위키에 반영돼요. 나중에 잠그거나 지울 수 있어요."),
    h("div", { class: "rb-mem-edrow", style: "justify-content:flex-end;gap:6px" }, btn("취소", { onClick: () => done(false) }), btn("추가", { kind: "primary", id: "rb-ac-add-save", onClick: () => done(true) }))));
  if (!ok || !ta.value.trim()) return;
  if (isUserNsfwDoc(doc)) { await edit(env, (f) => { addUserAdult(f, axis, ta.value); }); return askRegen(env, doc, axis === "paraphilia" ? "추가한 이상성향" : "추가한 성적 욕망"); }
  let added = false;
  await edit(env, (f) => { addManualAdult(f.wiki, doc.id, axis, ta.value); added = true; });
  // 작동 중인 위키에도(다음 기록이 옛 값으로 덮지 않게)
  try { const st = env.ctx.memory?.flow?.runtime?.()?.wiki?.requireStore?.(); if (st) { st.replace((v) => { addManualAdult(v, doc.id, axis, ta.value); return v; }); await st.flush?.(); } } catch { /* 저장본만 */ }
  if (added) await askRegen(env, doc, axis === "paraphilia" ? "추가한 이상성향" : "추가한 성적 욕망");
}

export function adultCandCard(env, card, doc) {
  const wiki = env.folder?.wiki, locks = env.folder?.adultLocks ?? {};
  const all = Object.values(wiki?.people?.candidates ?? {}).filter((c) => c?.documentId === doc?.id && AXES.some(([k]) => k === c.axis) && !["rejected", "reverted"].includes(c.status));
  const item = (c) => {
    const lockedNow = !!locks[c.id], [st, stc] = STATUS[c.status] ?? [c.status, "wait"];
    return h("li", { class: ["rb-ac-item", lockedNow && "locked"], "data-id": c.id, "data-status": c.status },
      h("p", { class: "txt" }, c.pattern || c.summary || ""),
      h("div", { class: "meta" }, h("span", { class: ["rb-ac-badge", stc] }, st), h("span", { class: "rb-ac-badge src" }, originOf(c)), lockedNow ? h("span", { class: "rb-ac-badge lock" }, "잠김") : null),
      h("div", { class: "acts" },
        c.status === "review" ? btn("반영", { size: "sm", kind: "primary", onClick: () => edit(env, (f) => { f.wiki = reviewPersonCandidate(f.wiki, c.id, "approve"); }, "반영했어요.") }) : null,
        h("button", { type: "button", class: ["rb-ac-ic", lockedNow && "on"], "aria-pressed": String(lockedNow), title: lockedNow ? "잠금 풀기" : "잠그기(삭제·다시 뽑기에서 지켜요)", "aria-label": lockedNow ? "잠금 풀기" : "잠그기", "data-act": "lock",
          onClick: () => edit(env, (f) => { f.adultLocks ??= {}; if (f.adultLocks[c.id]) delete f.adultLocks[c.id]; else f.adultLocks[c.id] = true; }) }, lockedNow ? "🔒" : "🔓"),
        h("button", { type: "button", class: "rb-ac-ic del", title: lockedNow ? "잠긴 항목은 지울 수 없어요" : "지우기", "aria-label": "지우기", "data-act": "del", disabled: lockedNow,
          onClick: async () => { if (!(await confirmDialog(env.ctx.win, { title: "이 항목을 지울까요?", body: c.pattern || "", ok: "지우기", danger: true }))) return; edit(env, (f) => { f.wiki = deleteAdultCandidate(f.wiki, c.id); if (f.adultLocks) delete f.adultLocks[c.id]; }, "지웠어요."); } }, "🗑")));
  };
  const group = ([k, label, cls]) => {
    const list = all.filter((c) => c.axis === k).sort((a, b) => (locks[b.id] ? 1 : 0) - (locks[a.id] ? 1 : 0));
    return h("div", { class: ["rb-ac-group", cls], "data-axis": k }, h("div", { class: "gh" }, h("b", null, label), h("small", { class: "rb-muted" }, `${list.length}개`)),
      list.length ? h("ul", { class: "rb-ac-list" }, list.map(item)) : h("p", { class: "rb-muted rb-ac-empty" }, "아직 없어요."));
  };
  const head = h("div", { class: "rb-ac-head" },
    btn("다시 뽑기", { size: "sm", id: "rb-adult-reroll", title: "무작위 설정으로 이 인물만 새로 뽑아요(잠근 항목은 그대로)", onClick: () => rerollAdult(env, doc, () => env.redraw?.()) }),
    btn("직접 추가", { size: "sm", kind: "primary", id: "rb-ac-add-btn", onClick: () => addDialog(env, doc) }));
  return card("성적 욕망 · 이상성향", [h("div", { class: "rb-ac-wrap", id: "rb-nsfw-cands" }, ...AXES.map(group))], head, "rb-nsfw-base rb-ac-card");
}

// 11-24: 나({{user}})의 성적 욕망 · 이상성향 — 위키 문서가 없어 채팅 폴더(userAdult)에 둔다. 무작위는 누를 때만
export function userAdultCard(env, card, doc) {
  const list = userAdultList(env.folder);
  const item = (c) => h("li", { class: ["rb-ac-item", c.lock && "locked"], "data-id": c.id },
    h("p", { class: "txt" }, c.text),
    h("div", { class: "meta" }, h("span", { class: "rb-ac-badge src" }, c.src === "roll" ? "무작위" : "직접"), c.lock ? h("span", { class: "rb-ac-badge lock" }, "잠김") : null),
    h("div", { class: "acts" },
      h("button", { type: "button", class: ["rb-ac-ic", c.lock && "on"], "aria-pressed": String(!!c.lock), "aria-label": c.lock ? "잠금 풀기" : "잠그기", onClick: () => edit(env, (f) => { lockUserAdult(f, c.id); }) }, c.lock ? "🔒" : "🔓"),
      h("button", { type: "button", class: "rb-ac-ic del", "aria-label": "지우기", disabled: c.lock, onClick: async () => { if (await confirmDialog(env.ctx.win, { title: "이 항목을 지울까요?", body: c.text, ok: "지우기", danger: true })) edit(env, (f) => { delUserAdult(f, c.id); }, "지웠어요."); } }, "🗑")));
  const group = ([k, label, cls]) => { const xs = list.filter((c) => c.axis === k); return h("div", { class: ["rb-ac-group", cls], "data-axis": k }, h("div", { class: "gh" }, h("b", null, label), h("small", { class: "rb-muted" }, `${xs.length}개`)), xs.length ? h("ul", { class: "rb-ac-list" }, xs.map(item)) : h("p", { class: "rb-muted rb-ac-empty" }, "아직 없어요.")); };
  const roll = async () => {
    if (!(await confirmDialog(env.ctx.win, { title: "무작위로 뽑을까요?", body: "전에 무작위로 넣은 내 항목만 빼고 새로 뽑아요. 직접 적은 것과 잠근 것은 그대로예요.", ok: "뽑기" }))) return;
    const opt = normalizeSeedOpt({ ...(await readSeedOpt(env.ctx.api)), on: true, desires: true, kinks: true });
    await edit(env, (f) => { rerollUserAdult(f, doc.title, opt); }, "뽑았어요.");
  };
  const head = h("div", { class: "rb-ac-head" }, btn("무작위 뽑기", { size: "sm", onClick: roll }), btn("직접 추가", { size: "sm", kind: "primary", id: "rb-ac-user-add", onClick: () => addDialog(env, doc) }));
  return card("성적 욕망 · 이상성향", [h("div", { class: "rb-ac-wrap", id: "rb-nsfw-user-cands" }, ...AXES.map(group))], head, "rb-nsfw-base rb-ac-card");
}
