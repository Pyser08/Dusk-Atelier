// Erosync '수위' 탭의 프리셋 카드: 지금 수위·동작·집착 방지 값을 이름 붙여 저장하고, 지금 열린 봇에 한 번에 적용한다.
import { h, replace } from "../../dom.js";
import { btn } from "../../kit.js";

const act = (b, k) => { b.dataset.act = k; return b; };
export function erosyncPresetCard(ctx, redraw) {
  const er = ctx.erosync;
  const live = !!(er?.on() && er?.isRunning());
  const list = h("div", { style: "display:grid;gap:8px", id: "rb-erosync-preset-list" });
  const name = h("input", { type: "text", class: "rb-input", id: "rb-erosync-preset-name", maxlength: 40, placeholder: "프리셋 이름 (예: 순한맛, 강하게)", style: "flex:1;min-width:0" });
  const paint = (items) => replace(list, ...(items.length ? items.map((p) => h("div", { class: "rb-mem-field row", "data-preset": p.id, style: "gap:8px" },
    h("span", { style: "flex:1;min-width:0" }, p.name, h("small", { class: "rb-muted" }, `  ${p.level.contentMode === "sfw" ? "SFW" : p.level.nsfwPlus ? "NSFW+" : p.level.contentMode ? "NSFW" : "수위 그대로"}${p.guard?.on ? " · 집착 방지" : ""}`)),
    act(btn("적용", { disabled: !live, onClick: async () => { const r = await er.applyPreset(p.id); ctx.toast(r.ok ? `‘${p.name}’을 모든 봇에 적용했어요` : r.reason === "off" ? "Erosync를 켜야 적용할 수 있어요" : r.reason, r.ok ? undefined : { error: true }); if (r.ok) redraw?.(); } }), "apply"),
    act(btn("삭제", { onClick: async () => { paint(await er.deletePreset(p.id)); } }), "del"))) : [h("p", { class: "rb-muted", style: "margin:0", id: "rb-erosync-preset-empty" }, "저장한 프리셋이 없어요.")]));
  er.presets().then(paint);
  const save = btn("지금 설정 저장", { id: "rb-erosync-preset-save", disabled: !live, onClick: async () => {
    const r = await er.savePreset(name.value);
    if (!r.ok) { ctx.toast(r.reason === "off" ? "Erosync를 켜야 저장할 수 있어요" : r.reason, { error: true }); return; }
    name.value = ""; paint(r.list); ctx.toast(r.replaced ? "같은 이름의 프리셋을 덮어썼어요" : "프리셋을 저장했어요");
  } });
  return h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-presets", style: "display:grid;gap:12px" }, h("h3", null, "프리셋"),
    h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "지금의 수위·동작·집착 방지 값을 이름 붙여 저장해 두고, 다른 봇에서도 한 번에 적용해요. 적용하면 지금 열린 봇의 수위와 공용 동작·집착 방지 값이 바뀌어요."),
    h("div", { class: "rb-mem-field row", style: "gap:8px" }, name, save), list);
}
