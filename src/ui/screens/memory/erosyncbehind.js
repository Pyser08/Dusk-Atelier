// Erosync 화면의 '비하인드' 탭: 장면 뒷이야기 기록 보기·지우기, 켜기·끄기.
import { h, replace } from "../../dom.js";
import { btn, confirmDialog, switchEl, setSwitch } from "../../kit.js";

export function erosyncBehindCard(ctx) {
  const er = ctx.erosync, body = h("div"), card = h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-behind" }, h("h3", null, "비하인드"), body);
  async function paint() {
    if (!(er.on() && er.isRunning())) { replace(body, h("p", { class: "rb-muted" }, "Erosync를 켜면 장면의 뒷이야기를 모아 볼 수 있어요.")); return; }
    const [cfg, list] = await Promise.all([er.config?.() ?? { ok: false }, er.behind("list")]);
    const on = cfg?.values?.behindEnabled === true;
    const sw = switchEl(on, { label: "비하인드 기록", onChange: async (v, el) => { setSwitch(el, v); const r = await er.config({ behindEnabled: v }); if (!r.ok) ctx.toast(r.reason || "바꾸지 못했어요", { error: true }); } });
    const entries = list?.ok ? list.entries : [];
    replace(body,
      h("p", { class: "rb-muted", style: "white-space:normal" }, "켜면 응답이 끝날 때마다 AI가 장면의 뒷이야기를 짧게 적어 둬요. AI 호출이 한 번 더 들어가요. 메인 응답에는 들어가지 않아요."),
      h("div", { class: "rb-mem-field row" }, h("span", null, "비하인드 기록"), sw),
      !list?.ok ? h("p", { class: "rb-muted" }, list?.reason || "채팅을 열면 그 채팅의 비하인드를 볼 수 있어요.")
        : entries.length ? h("ul", { class: "rb-mem-reclist", id: "rb-erosync-behind-list" }, entries.map((e) => h("li", { class: "rb-mem-rec" },
          h("div", { class: "txt" }, h("b", null, `턴 ${e.turn ?? "?"}`), h("div", { style: "white-space:pre-wrap" }, e.text)),
          h("span", { class: "rb-mem-rowact" }, btn("지우기", { size: "sm", onClick: async () => { const r = await er.behind("remove", e.id); if (!r.ok) ctx.toast(r.reason || "지우지 못했어요", { error: true }); paint(); } })))))
        : h("p", { class: "rb-muted" }, "이 채팅에는 아직 비하인드 기록이 없어요."),
      entries.length ? btn("이 채팅 비하인드 모두 지우기", { size: "sm", id: "rb-erosync-behind-clear", onClick: async () => { if (!(await confirmDialog(ctx.win, { title: "비하인드를 모두 지울까요?", body: "이 채팅의 비하인드 기록만 지워요.", ok: "지우기", danger: true }))) return; await er.behind("remove", ""); paint(); } }) : null);
  }
  void paint();
  return card;
}
