// Erosync 화면의 '수위' 카드: 이 봇의 콘텐츠 모드(SFW/NSFW/NSFW+)와 극단 행동 수위. 값은 엔진의 봇별 설정(erosync_bot_overrides_v1)에 저장된다.
import { h, replace } from "../../dom.js";
import { segmented, switchEl, setSwitch } from "../../kit.js";

export const modeOf = (c) => (c?.contentMode === "sfw" ? "sfw" : c?.nsfwPlus ? "plus" : "nsfw");
// 화면 선택 → 엔진 설정. NSFW+는 극단 행동 수위가 '제한 없음'일 때만 유효하니 같이 맞춘다.
export const patchOfMode = (m) => (m === "sfw" ? { contentMode: "sfw", nsfwPlus: false } : m === "plus" ? { contentMode: "nsfw", extremityLimit: "unlimited", nsfwPlus: true } : { contentMode: "nsfw", nsfwPlus: false });

export function erosyncLevelCard(ctx) {
  const er = ctx.erosync;
  const body = h("div", { class: "rb-mem-fields", style: "display:grid;gap:14px" });
  const card = h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-level" }, h("h3", null, "수위"), body);
  const save = async (patch) => { const r = typeof er.content === "function" ? await er.content(patch) : { ok: false, reason: "off" }; if (!r.ok) ctx.toast(r.reason || "수위를 바꾸지 못했어요", { error: true }); return paint(r); };
  function paint(c) {
    if (!c?.ok) { replace(body, h("p", { class: "rb-muted", style: "white-space:normal" }, c?.reason === "off" ? "Erosync를 켜면 여기서 수위를 정할 수 있어요." : "채팅을 열면 그 봇의 수위를 정할 수 있어요.")); return; }
    const mode = modeOf(c), sfw = mode === "sfw";
    replace(body,
      h("p", { class: "rb-muted", style: "white-space:normal" }, "이 봇에만 적용돼요. SFW는 성적인 내용을 읽지도 넣지도 않고, NSFW+는 극단 행동 수위가 ‘제한 없음’일 때만 켜져요."),
      h("div", { class: "rb-mem-field" }, h("span", null, "내용 수위"), segmented([["sfw", "SFW"], ["nsfw", "NSFW"], ["plus", "NSFW+"]], mode, (v) => save(patchOfMode(v)), "내용 수위")),
      h("div", { class: "rb-mem-field" }, h("span", null, "극단 행동 수위"),
        h("select", { id: "rb-erosync-limit", disabled: sfw, onChange: (e) => save({ extremityLimit: e.target.value }) },
          ...c.limits.map((l) => h("option", { value: l.key, selected: l.key === c.extremityLimit }, l.cap == null ? l.label : `${l.label} (${l.cap})`)))),
      mode === "plus" ? h("div", { class: "rb-mem-field row" }, h("span", null, "NSFW+ 재검사"), (() => { const sw = switchEl(c.recheck, { label: "NSFW+ 재검사", onChange: (v, el) => { setSwitch(el, v); save({ nsfwPlusRecheck: v }); } }); return sw; })()) : null);
  }
  paint({ ok: false, reason: er.on() && er.isRunning() ? "" : "off" });
  if (er.on() && er.isRunning() && typeof er.content === "function") er.content().then(paint);
  return card;
}
