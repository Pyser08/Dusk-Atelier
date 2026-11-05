// Erosync '검토' 탭: 대화가 쌓이며 생긴 인물 성격 변화 후보 중 아직 반영되지 않은 것을 보고 반영하거나 무시한다.
// 자동 반영 기준에 못 미친 후보, ‘검토 후 반영’·‘후보만 쌓기’ 방식에서 쌓인 후보가 여기로 와요.
import { h, replace } from "../../dom.js";
import { btn } from "../../kit.js";

const DIR = { increase: "올라가요", decrease: "내려가요" };
export function reviewTitle(it) {
  if (it.trait === "sexualMotive") return `${it.actorName}의 성적 동기가 ‘${it.motive}’ 쪽으로 ${it.stage === "primary" ? "주된 유형이" : "보조 유형이"} 돼요`;
  if (it.trait === "qualitative") return `${it.actorName}${it.targetName ? ` → ${it.targetName}` : ""}: ${it.pattern}`;
  return `${it.actorName}의 ${it.label}${it.targetName ? ` (${it.targetName}에게)` : ""}이(가) ${DIR[it.direction]}${it.step ? ` · 약 ${it.direction === "decrease" ? "-" : "+"}${it.step}` : ""}`;
}
export function erosyncReviewCard(ctx) {
  const er = ctx.erosync, live = !!(er?.on() && er?.isRunning());
  const list = h("div", { class: "rb-flds", id: "rb-erosync-review-list" });
  const sub = h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "대화가 쌓이며 인물의 성향이 바뀔 만한 근거가 모이면 후보가 생겨요. 자동 반영 기준에 못 미친 후보나 ‘검토 후 반영’·‘후보만 쌓기’ 방식에서 쌓인 후보를 여기서 반영하거나 무시해요. 반영해도 직접 고친 값은 바뀌지 않고, 무시한 후보는 다시 올라오지 않아요.");
  const card = h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-review", style: "display:grid;gap:12px" }, h("h3", null, "성격 변화 검토"), sub, list);
  const empty = (t) => replace(list, h("p", { class: "rb-muted", id: "rb-erosync-review-empty", style: "margin:0" }, t));
  async function load() {
    if (!live) { empty("Erosync를 켜면 여기서 검토할 수 있어요."); return; }
    const r = await er.review("list");
    if (!r.ok) { empty(r.reason === "off" ? "Erosync를 켜면 여기서 검토할 수 있어요." : (r.reason || "후보를 읽지 못했어요")); return; }
    if (!r.items.length) { empty("검토를 기다리는 변화가 없어요."); return; }
    replace(list, ...r.items.map((it) => {
      const act = async (op) => { const x = await er.review(op, it.id); if (!x.ok) { ctx.toast(x.reason || "처리하지 못했어요", { error: true }); return; } ctx.toast(op === "apply" ? "반영했어요" : "무시했어요"); load(); };
      const b1 = btn("반영", { size: "sm", kind: "primary", onClick: () => act("apply") }), b2 = btn("무시", { size: "sm", onClick: () => act("reject") });
      b1.dataset.act = "apply"; b2.dataset.act = "reject";
      return h("div", { class: "rb-fld", "data-cand": it.id },
        h("div", { class: "rb-fld-lab" }, h("b", null, reviewTitle(it)), h("small", null, `근거 ${it.evidenceCount}번 · 장면 ${it.scenes}개 · 확신 ${it.confidence}%`)),
        ...it.reasons.map((t) => h("small", { class: "rb-muted", style: "white-space:normal" }, `· ${t}`)),
        h("div", { class: "rb-mem-sact" }, b1, b2));
    }));
  }
  void load();
  return card;
}
