// 장기기억 애드온(0.3.22): 홈 빠른 설정에 붙는 줄 — 캐릭터 상태창(본문 이름 링크)·장면 상태창(응답 아래). 장기 기억 설정과 같은 값.
import { h } from "../../dom.js";
import { switchEl } from "../../kit.js";

const ROWS = [
  ["nameLinks", "캐릭터 상태창", "본문에 나온 인물 이름을 누르면 사진·수치·상태·옷차림이 떠요."],
  ["scenePanel", "장면 상태창", "응답 아래에 날짜·시간·장소·날씨·등장인물을 보여줘요."],
];
export function quickRows(ctx, memory) {
  if (!memory?.store?.getIndex) return null;
  const box = h("div", { style: "display:contents" });
  memory.store.getIndex().then((idx) => {
    const inj = idx?.settings?.inject ?? {};
    for (const [key, title, text] of ROWS) box.append(h("div", { class: "rb-srow", "data-quick": key }, h("span", { class: "t" }, title, h("small", null, text)),
      switchEl(inj[key] !== false, { label: title, onChange: async (v, el) => {
        el.setAttribute("aria-checked", v ? "true" : "false");
        try { await memory.store.updateIndex((i) => { i.settings.inject ??= {}; i.settings.inject[key] = v; }); memory.nameLinks?.invalidate?.(); ctx.toast?.(`${title}을 ${v ? "켰어요" : "껐어요"}. 응답을 다시 그리면 바뀌어요.`); }
        catch (e) { ctx.toast?.(e?.message ?? String(e), { error: true }); }
      } })));
  }).catch(() => {});
  return box;
}
