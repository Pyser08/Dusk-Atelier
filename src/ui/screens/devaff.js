// 개발 탭 → 봇: 호감도 HUD 기능 프리셋 카드. 설치하면 이 봇 배경 HTML에 ♡ 버튼 HUD가 들어가고,
// 응답이 끝날 때마다 호감도가 채팅 변수($aff…)에 기록된다. 값 출처: 자동(리스폿 우선, 없으면 자체 보조모델) / 자체 보조모델만.
import { hasHud, hudHtml, previewDoc } from "../../engine/affhud.js";
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
        on ? designBox(ctx, t, cfg, draw) : null,
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

// AI 디자인 변경: 요청 → 미리보기 → 적용. 로직(변수·식)은 고정이라 기능이 깨지지 않는다.
function designBox(ctx, t, cfg, redraw) {
  const aff = ctx.affhud;
  const ta = h("textarea", { class: "rb-input", rows: 3, placeholder: "예: 파스텔 핑크 젤리 느낌으로, 게이지는 하트 모양 끝, 글자는 동글동글하게", "aria-label": "디자인 요청", style: "width:100%;resize:vertical" });
  const out = h("div", { style: "display:flex;flex-direction:column;gap:8px" });
  let busy = false;
  const make = btn("AI로 디자인 바꾸기", { icon: "sparkle", onClick: async () => {
    const req = ta.value.trim();
    if (!req || busy) return;
    busy = true; replace(out, h("span", { class: "rb-muted" }, "디자인을 만드는 중… (보조모델 1~2회 호출)"));
    try {
      const r = await aff.design(t.i, req);
      if (!r.ok) { replace(out, note("err", `디자인이 검사를 통과하지 못했어요: ${r.errors.slice(0, 3).join(" / ")}. 요청을 조금 바꿔 다시 해 보세요.`)); return; }
      const frame = h("iframe", { sandbox: "", srcdoc: previewDoc(r.html), style: "width:100%;height:150px;border:1px solid var(--rb-line,#444);border-radius:10px", title: "미리보기" });
      replace(out,
        h("span", { class: "rb-muted" }, "미리보기 (샘플 값, 사진은 실제 채팅에서 보여요)"), frame,
        h("div", { style: "display:flex;gap:8px" },
          btn("적용", { kind: "primary", onClick: async () => { await aff.applyDesign(t.i, r.html); ctx.toast("새 디자인을 적용했어요"); redraw(); } }),
          btn("취소", { onClick: () => replace(out) })));
    } catch (e) { replace(out, note("err", e?.message ?? String(e))); } finally { busy = false; }
  } });
  return h("div", { style: "display:flex;flex-direction:column;gap:8px" },
    h("span", { class: "rb-label" }, "디자인 변경 (AI)"), ta,
    h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, make, cfg.html ? btn("기본 디자인으로", { onClick: async () => { await aff.resetDesign(t.i); ctx.toast("기본 디자인으로 되돌렸어요"); redraw(); } }) : null),
    out);
}
