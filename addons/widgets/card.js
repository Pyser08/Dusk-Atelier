// 설정 탭 '위젯 홈' 카드(원래 ui/screens/devtools.js에 있던 것). 위젯 애드온이 설정 탭 자리(slot settings.cards)에 끼운다.
import { h } from "../../src/ui/dom.js";
import { icon } from "../../src/ui/icons.js";
import { btn, setSwitch, switchEl } from "../../src/ui/kit.js";
export function widgetHomeCard(ctx, onChange, whArg) {
  const wh = whArg ?? ctx.widgetHome;
  const openWH = () => (ctx.openWidgetHome ? ctx.openWidgetHome() : wh.open());
  const noteEl = h("span", { class: "rb-muted", style: "white-space:normal;display:block;margin-top:4px" });
  const openBtn = btn("지금 열기", { size: "sm", id: "rb-wh-open", onClick: async () => {
    if (!wh.on()) return ctx.toast("먼저 위젯 홈을 켜 주세요");
    const ok = await openWH();
    if (!ok) ctx.toast(wh.lastError() || "위젯 홈을 열지 못했어요", { error: true });
  } });
  const refreshNote = async () => {
    const running = wh.isRunning();
    const orig = running ? await wh.originalInstalled() : false;
    noteEl.textContent = orig
      ? "원래 ‘위젯 홈’ 플러그인도 켜져 있어요. Dusk 쪽이 우선이라 그대로 동작하지만, 메뉴에 버튼이 두 개 보일 수 있으니 원래 플러그인은 끄는 걸 권해요. 저장된 내용은 같이 써요."
      : running && wh.autoStatus() ? wh.autoStatus() : wh.lastError() || "";
  };
  void refreshNote();
  return h(
    "div",
    { class: "rb-card pad bordered", style: "display:flex;gap:14px;align-items:center", id: "rb-widgethome" },
    h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon("grid", 20)),
    h(
      "div",
      { style: "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px" },
      h("b", null, "위젯 홈"),
      h("span", { class: "rb-muted", style: "white-space:normal" }, "음악·사진·시계·최근 대화·메모·D-day·타이머 등을 한 화면에 모은 홈이에요. 켜면 리스 메뉴에 ‘위젯 홈’ 버튼이 생기고, 홈 화면으로 가면 사이드바 옆 홈 자리에 자동으로 떠요(화면 접근 권한이 필요해요). 권한이 없으면 전체 화면으로 열려요."),
      noteEl,
      h("div", { style: "margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap" },
        openBtn,
        h("span", { class: "rb-muted", style: "display:inline-flex;align-items:center;gap:8px" }, "리스를 켜면 바로 열기", switchEl(wh.openOnLoad(), { label: "리스를 켜면 바로 열기", onChange: async (v, el) => { setSwitch(el, v); await wh.setOpenOnLoad(v); ctx.toast(v ? "리스를 켜면 위젯 홈이 바로 떠요" : "리스를 켜도 자동으로 열지 않아요"); } })))
    ),
    switchEl(wh.on(), { label: "위젯 홈", onChange: async (v, el) => {
      setSwitch(el, v);
      const ok = await wh.set(v);
      ctx.toast(v ? (ok ? "위젯 홈을 켰어요" : "위젯 홈을 켜지 못했어요") : "위젯 홈을 껐어요. 메뉴 버튼은 리스를 새로 열면 사라질 수 있어요", v && !ok ? { error: true } : undefined);
      ctx.dropPanes?.();   // 도구 화면의 위젯 홈 행이 바로 따라 바뀌도록
      await refreshNote();
      onChange?.(v);
    } })
  );
}
