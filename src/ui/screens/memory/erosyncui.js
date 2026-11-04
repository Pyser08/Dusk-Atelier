// 기억 설정의 'Erosync(NSFW 장면 강화)' 카드: 켜기/끄기, 비용 안내, 상태. 본체는 src/erosync/, 컨트롤러는 data/erosync.js.
import { h } from "../../dom.js";
import { switchEl, setSwitch } from "../../kit.js";

export const EROSYNC_COST_NOTE = "켜면 AI 호출이 늘어요. 인물 프로필을 만들 때 호출이 여러 번 들어가고, 응답이 끝날 때마다 장면을 읽는 호출이 한 번 더 들어가요. 모델은 Erosync 설정에서 따로 고를 수 있고, 쓰는 만큼 토큰·요금이 더 들어요.";

export function erosyncSection(ctx) {
  const er = ctx.erosync;
  if (!er) return null;
  const note = h("p", { class: "rb-muted", id: "rb-erosync-note", style: "white-space:normal" });
  const paint = async () => {
    if (!er.on()) { note.textContent = ""; return; }
    if (er.isRunning()) { note.textContent = "켜져 있어요. 채팅 메뉴의 ‘에로싱크’ 버튼이나 리스 설정의 ‘Erosync’에서 설정을 열 수 있어요."; return; }
    note.textContent = er.lastError() || "시작하는 중이에요…";
  };
  const sw = switchEl(er.on(), { label: "Erosync", onChange: async (v, el) => {
    setSwitch(el, v);
    const ok = await er.set(v);
    if (v && !ok) { await er.set(false); setSwitch(el, false); ctx.toast(er.lastError() || "Erosync를 켜지 못했어요", { error: true }); note.textContent = er.lastError(); return; }
    ctx.toast(v ? "Erosync를 켰어요" : "Erosync를 껐어요. 메뉴 버튼은 리스를 새로 열면 사라질 수 있어요");
    await paint();
  } });
  void paint();
  return h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync" },
    h("h3", null, "Erosync (NSFW 장면 강화)"),
    h("div", { class: "rb-mem-field row" }, h("span", null, "Erosync 켜기"), sw),
    h("p", { class: "rb-muted", style: "white-space:normal" }, "인물마다 성향·관계를 따로 읽어 두고, 다음 응답에서 누가 무엇을 향해 움직일지 계획해 요청에 넣어요. 기본 꺼짐이에요."),
    h("p", { class: "rb-muted", style: "white-space:normal" }, EROSYNC_COST_NOTE),
    h("p", { class: "rb-muted", style: "white-space:normal" }, "원래 ‘Erosync’ 플러그인과 같이 켜 둘 수 없어요. 저장된 프로필·기록은 같은 키를 써서 이어서 읽어요."),
    note);
}
