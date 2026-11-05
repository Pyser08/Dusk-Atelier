// Erosync 화면의 '수위' 카드: 콘텐츠 모드(SFW/NSFW/NSFW+)와 극단 행동 수위. 모든 봇·채팅에 일괄 적용(dusk.erosync.level에 저장).
import { h, replace } from "../../dom.js";
import { segmented } from "../../kit.js";
import { selectField, choiceField, toggleField } from "../../fields.js";

export const modeOf = (c) => (c?.contentMode === "sfw" ? "sfw" : c?.nsfwPlus ? "plus" : "nsfw");
// 화면 선택 → 엔진 설정. NSFW+는 극단 행동 수위가 '제한 없음'일 때만 유효하니 같이 맞춘다.
export const patchOfMode = (m) => (m === "sfw" ? { contentMode: "sfw", nsfwPlus: false } : m === "plus" ? { contentMode: "nsfw", extremityLimit: "unlimited", nsfwPlus: true } : { contentMode: "nsfw", nsfwPlus: false });

export function erosyncLevelCard(ctx) {
  const er = ctx.erosync;
  const body = h("div", { class: "rb-flds" });
  const card = h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-level" }, h("h3", null, "수위"), body);
  const save = async (patch) => { const r = typeof er.content === "function" ? await er.content(patch) : { ok: false, reason: "off" }; if (!r.ok) ctx.toast(r.reason || "수위를 바꾸지 못했어요", { error: true }); return paint(r); };
  function paint(c) {
    if (!c?.ok) { replace(body, h("p", { class: "rb-muted", style: "white-space:normal" }, c?.reason === "off" ? "Erosync를 켜면 여기서 수위를 정할 수 있어요." : "채팅을 열면 수위를 정할 수 있어요.")); return; }
    const mode = modeOf(c), sfw = mode === "sfw";
    replace(body,
      h("p", { class: "rb-muted", style: "white-space:normal" }, "모든 봇과 채팅에 한꺼번에 적용돼요. SFW는 성적인 내용을 읽지도 넣지도 않고, NSFW+는 극단 행동 수위가 ‘제한 없음’일 때만 켜져요."),
      choiceField({ id: "rb-erosync-mode-level", label: "내용 수위", options: [["sfw", "SFW", "성적인 내용을 읽지도 넣지도 않아요"], ["nsfw", "NSFW", "성적인 장면을 다뤄요"], ["plus", "NSFW+", "극단 행동까지 열어요(극단 행동 수위 ‘제한 없음’으로 맞춰져요)"]], value: mode, onChange: (v) => save(patchOfMode(v)) }),
      mode === "plus" ? selectField({ id: "rb-erosync-limit", label: "극단 행동 수위", hint: "NSFW+에서 장면이 어디까지 갈 수 있는지 상한을 정해요. ‘제한 없음’ 밖으로 내리면 NSFW+가 꺼져요", value: c.extremityLimit,
        options: c.limits.map((l) => [l.key, l.cap == null ? l.label : `${l.label} (${l.cap})`]), onChange: (val) => save({ extremityLimit: val }) }) : null,
      mode === "plus" ? toggleField({ id: "rb-erosync-recheck", label: "NSFW+ 재검사", hint: "NSFW+ 장면을 한 번 더 확인해 수위를 맞춰요", on: c.recheck, onChange: (v) => save({ nsfwPlusRecheck: v }) }) : null);
  }
  paint({ ok: false, reason: er.on() && er.isRunning() ? "" : "off" });
  if (er.on() && er.isRunning() && typeof er.content === "function") er.content().then(paint);
  return card;
}
