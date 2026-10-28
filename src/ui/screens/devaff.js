// 개발 탭 → 봇: 호감도 HUD 기능 프리셋 카드. 설치하면 이 봇 배경 HTML에 ♡ 버튼 HUD가 들어가고,
// 응답이 끝날 때마다 호감도가 채팅 변수($aff…)에 기록된다. 값 출처: 자동(리스폿 우선, 없으면 자체 보조모델) / 자체 보조모델만.
import { hasHud } from "../../engine/affhud.js";
import { h, replace } from "../dom.js";
import { badge, btn, note, segmented } from "../kit.js";

export function affCard(ctx, t) {
  const box = h("div", { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:10px" });
  const aff = ctx.affhud;
  const draw = async () => {
    try {
      const ch = await ctx.api.getCharacterFromIndex(t.i), chaId = String(ch.chaId);
      const cfg = await aff.getCfg(chaId), on = cfg.on && hasHud(ch.backgroundHTML);
      const num = (key, label) => {
        const el = h("input", { class: "rb-input", type: "number", value: String(cfg[key]), "aria-label": label, style: "height:34px;width:84px" });
        el.addEventListener("change", async () => { const v = Number(el.value); if (Number.isFinite(v)) { await aff.setCfg(chaId, { [key]: v }); ctx.toast("저장했어요. HUD에 반영하려면 ‘다시 설치’를 눌러요."); } });
        return h("label", { style: "display:flex;gap:6px;align-items:center" }, h("span", { class: "rb-muted" }, label), el);
      };
      replace(
        box,
        h("div", { style: "display:flex;gap:8px;align-items:center" }, h("b", { style: "flex:1" }, "기능 프리셋 · 호감도 HUD"), badge(on ? "설치됨" : "꺼짐", on ? "ok" : "")),
        h("span", { class: "rb-muted", style: "white-space:normal" }, "채팅 우측 상단 ♡ 버튼을 누르면 캐릭터 사진·이름·호감도 게이지가 펼쳐져요. 이 봇에만 적용돼요."),
        h("span", { class: "rb-label" }, "값 출처"),
        segmented([["auto", "자동 (리스폿 우선)"], ["own", "자체 보조모델만"]], cfg.source, async (v) => { await aff.setCfg(chaId, { source: v }); }, "값 출처"),
        h("span", { class: "rb-muted", style: "white-space:normal" }, "자동: 리스폿 흐름이 켜져 있고 호감 수치가 있으면 그 값을 쓰고, 없으면 자체 보조모델로 대신해요. 자체: 응답마다 보조모델을 한 번 더 불러요."),
        h("div", { style: "display:flex;gap:12px;flex-wrap:wrap" }, num("min", "최소"), num("max", "최대"), num("start", "시작값"), num("step", "한 번에 최대")),
        note("info", "자체 보조모델은 모델 설정의 ‘기록하기’ 모델을 써요. 호출은 응답마다 1회예요."),
        h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
          btn(on ? "다시 설치" : "설치", { kind: "primary", onClick: async () => { await aff.install(t.i); ctx.toast("호감도 HUD를 설치했어요"); draw(); } }),
          on ? btn("지금 맞추기", { onClick: async () => {
            if ((await ctx.api.getCurrentCharacterIndex()) !== t.i) return ctx.toast("이 봇의 채팅을 연 상태에서 눌러 주세요");
            const ti = await ctx.api.getCurrentChatIndex(), r = await aff.syncAt(t.i, ti);
            ctx.toast({ pot: "리스폿 값으로 맞췄어요", own: "보조모델로 맞췄어요", same: "이미 최신이에요", noai: "아직 응답이 없어요", "parse-fail": "변화량을 읽지 못했어요" }[r] ?? r);
          } }) : null,
          on ? btn("제거", { onClick: async () => { await aff.uninstall(t.i); ctx.toast("호감도 HUD를 제거했어요"); draw(); } }) : null
        )
      );
    } catch (e) { replace(box, note("err", e?.message ?? String(e))); }
  };
  draw();
  return box;
}
