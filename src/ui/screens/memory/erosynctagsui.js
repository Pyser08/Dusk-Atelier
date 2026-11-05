// 인물 위키 NSFW 탭의 '선호·금기 태그' 칸. 직접 적은 글만 저장하고 AI는 부르지 않는다.
// 선호는 NSFW 이상에서만, 금기는 모든 수위에서 장면 판단에 '지켜야 할 값'으로 들어간다.
import { h } from "../../dom.js";
import { btn } from "../../kit.js";
import { normTagList, MAX_TAGS, MAX_TAG_LEN } from "../../../data/erosynctags.js";

export function eroTagsCard(ctx, card, person) {
  const er = ctx.erosync;
  if (typeof er?.setTags !== "function" || !person?.id) return null;
  const mk = (id, label, ph) => ({ id, label, el: h("input", { type: "text", class: "rb-input", id, placeholder: ph, style: "width:100%;min-width:0" }) });
  const likes = mk("rb-ero-tags-likes", "선호", "쉼표로 구분 (예: 목덜미, 느린 전개)");
  const limits = mk("rb-ero-tags-limits", "금기", "쉼표로 구분 (여기 적은 건 넣지 않아요)");
  const chips = h("div", { id: "rb-ero-tags-chips", style: "display:flex;flex-wrap:wrap;gap:6px" });
  const paint = (v) => {
    likes.el.value = (v.likes ?? []).join(", "); limits.el.value = (v.limits ?? []).join(", ");
    chips.replaceChildren(...(v.likes ?? []).map((t) => h("span", { class: "rb-chip", "data-kind": "like" }, t)), ...(v.limits ?? []).map((t) => h("span", { class: "rb-chip warn", "data-kind": "limit" }, `금기 · ${t}`)));
  };
  er.tags(person.id).then(paint).catch(() => {});
  const save = btn("태그 저장", { size: "sm", id: "rb-ero-tags-save", onClick: async () => {
    const r = await er.setTags(person.id, { likes: normTagList(likes.el.value), limits: normTagList(limits.el.value) });
    if (!r.ok) { ctx.toast(r.reason, { error: true }); return; }
    paint(r.value); ctx.toast("태그를 저장했어요");
  } });
  const field = (f) => h("div", { class: "rb-mem-field", style: "display:grid;gap:4px" }, h("span", null, f.label), f.el);
  return card("선호·금기 태그", [
    h("small", { class: "rb-muted" }, `직접 적은 글만 쓰고 AI는 부르지 않아요. 태그는 ${MAX_TAGS}개, ${MAX_TAG_LEN}자까지예요. 같은 태그가 둘 다 있으면 금기가 우선이에요.`),
    field(likes), field(limits), chips, h("div", { class: "rb-mem-sact" }, save)], h("small", { class: "rb-wk2-badge" }, "Erosync"), "rb-wk2-ero");
}
