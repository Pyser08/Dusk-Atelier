// 기억 탭 맨 위: 저장소(플러그인 / BardWiki) 고르기 + 리수폿 기능 켜고 끄기 (v1.6.5)
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { switchEl, setSwitch, segmented, note } from "../../kit.js";
import { fail, potOn } from "./common.js";

export async function renderModeBar(ctx, host, { redraw }) {
  const M = ctx.memory, idx = await M.store.getIndex(), S = idx.settings;
  const backend = M.backend(S), local = backend.id === "local", pot = potOn(S);
  const setBackend = async (v) => {
    try {
      await M.store.updateIndex((i) => { i.settings.backend = v; });
      ctx.toast("저장했어요. 훅에 반영하려면 RisuAI를 다시 불러와 주세요.");
    } catch (e) { fail(ctx)(e); }
    redraw();
  };
  const setPot = async (v, el) => {
    setSwitch(el, v);
    try {
      await M.store.updateIndex((i) => { i.settings.potMode = v; if (!v) i.settings.flow = { ...(i.settings.flow ?? {}), on: false }; });
      if (!v) await M.flow?.apply?.();
      ctx.toast(v ? "리수폿 기능을 켰어요. 인물 위키와 턴 흐름은 ‘장기기억 켜기’를 눌러 시작해요." : "리수폿 기능을 껐어요. 기존 Dusk 기능만 보여요.");
    } catch (e) { fail(ctx)(e); }
    redraw();
  };
  const seg = segmented([["auto", "자동"], ["local", "플러그인"], ["bardwiki", "BardWiki"], ["off", "끔"]], S.backend ?? "auto", setBackend, "기억 저장소");
  const sw = switchEl(pot && local, { label: "리수폿 기능", disabled: !local, onChange: setPot });
  const label = backend.id === "bardwiki" ? "BardWiki" : backend.id === "off" ? "꺼짐" : "플러그인";
  replace(host, h("section", { class: ["rb-card", "rb-mem-modebar", pot && local && "pot"] },
    h("div", { class: "rb-mem-mbrow" }, h("span", { class: "ic" }, icon("brain", 20)), h("div", { class: "t" }, h("b", null, "장기기억 방식"), h("small", { class: "rb-muted" }, `지금: ${label} · ${backend.reason}`))),
    seg,
    h("div", { class: "rb-mem-mbrow pot" }, h("div", { class: "t" }, h("b", null, "리수폿 기능"), h("small", { class: "rb-muted" }, !local ? "플러그인 저장소에서만 쓸 수 있어요." : pot ? "켜짐 · 인물 위키, 한 번에 도는 기억 흐름, 고급 설정까지 써요." : "꺼짐 · 인물 위키 등은 가리고 기존 Dusk 기억 기능만 써요.")), sw),
    backend.duplicate ? note("warn", "BardWiki와 장기기억이 중복돼요. 비용이 두 번 들 수 있어요.") : null));
}
