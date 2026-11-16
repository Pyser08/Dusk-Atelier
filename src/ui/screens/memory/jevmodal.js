// 2.2.4 Jev 재정렬 설정 창(선택 기능): 켜기·오픈라우터 키·모델·연결 테스트. 키는 이 기기에만 저장된다.
import { h } from "../../dom.js";
import { btn, modal, switchEl, setSwitch, note } from "../../kit.js";
import { DEFAULT_JEV } from "../../../data/jev.js";

export async function openJevModal(ctx) {
  const J = ctx.memory.jev; await J.load();
  const st = J.status(), f = { on: st.on, model: st.model, url: st.url, timeoutMs: st.timeoutMs };
  const msg = h("div", { "aria-live": "polite" });
  const show = (kind, text) => msg.replaceChildren(note(kind, text));
  const field = (label, el, hint) => h("label", { class: "rb-mem-field", style: "flex-direction:column;align-items:stretch;gap:4px" }, h("span", null, label), el, hint ? h("small", { class: "rb-muted" }, hint) : null);
  const key = h("input", { class: "rb-input", type: "password", autocomplete: "off", value: J.keyValue(), placeholder: st.hasKey ? `저장된 키 ••••${st.keyTail} (바꿀 때만 입력)` : "오픈라우터 API 키 (sk-or-v1-…)", "aria-label": "Jev API 키" });
  const model = h("input", { class: "rb-input", value: f.model, placeholder: DEFAULT_JEV.model, "aria-label": "Jev 모델", onInput: (e) => { f.model = e.target.value; } });
  const persist = async () => { const patch = { on: f.on, model: f.model, url: f.url, timeoutMs: f.timeoutMs }; if (key.value.trim()) patch.key = key.value; return J.save(patch); };
  return modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "Jev 재정렬", style: "max-width:520px;display:flex;flex-direction:column;gap:10px" },
    h("h3", { class: "rb-h3" }, "Jev 재정렬 (선택)"),
    h("p", { class: "rb-muted" }, "원문 회상 후보 40개를 Jev가 0~3점으로 매겨, 지금 말에 쓸모 있는 것만 넣어요. 임베딩이 켜져 있어야 쓰여요. 켜면 후보 조각(대화 원문 일부)과 최근 대화를 오픈라우터로 보내요."),
    note("info", "비싼 메인 모델(입력 100만 토큰당 약 1.6달러 이상)을 쓸 때 ‘기억 토큰 절약’과 함께 켜면 이득이에요. 응답마다 약 0.5초 늦어지고, 응답 1,000번에 약 0.25달러가 들어요. 싼 모델이면 토큰 절약만 켜는 게 더 아껴요."),
    h("div", { class: "rb-mem-field", style: "justify-content:space-between" }, h("span", null, "사용"), switchEl(f.on, { label: "Jev 재정렬 사용", onChange: (v, el) => { f.on = v; setSwitch(el, v); } })),
    field("오픈라우터 API 키", key, "이 기기에만 저장돼요. 오픈라우터 키 하나로 써요."),
    h("details", { class: "rb-mem-man" }, h("summary", null, "고급"), field(`모델 (기본 ${DEFAULT_JEV.model})`, model, "주소는 오픈라우터 /systemone이에요.")),
    msg,
    h("div", { class: "rb-mem-edrow", style: "justify-content:flex-end;flex-wrap:wrap" },
      btn("연결 테스트", { size: "sm", onClick: async () => { show("info", "확인 중…"); try { const s = await persist(); const r = await J.test(); show(r.ok ? "info" : "warn", `연결됐어요 · ${r.ms}ms${r.ok ? "" : " · 점수가 이상해요(모델 이름 확인)"}${s.persisted ? " · 키 저장됨" : " · 하지만 키가 저장되지 않았어요"}`); } catch (e) { show("err", e?.message ?? String(e)); } } }),
      btn("닫기", { onClick: () => done(true) }),
      btn("저장", { kind: "primary", onClick: async () => { try { const s = await persist(); if (!s.persisted) { show("err", "저장하지 못했어요. 이 환경의 로컬 저장소에 쓸 수 없는 것 같아요."); return; } ctx.toast(s.ready ? "Jev 재정렬을 켰어요." : f.on ? "저장했지만 키가 없어서 아직 안 쓰여요." : "저장했어요 (꺼짐)."); done(true); } catch (e) { show("err", e?.message ?? String(e)); } } }))));
}
