// 임베딩 설정 창: 주소·키·모델 입력, 기본 사용 토글, 연결 테스트. 키는 이 기기에만 저장된다(백업·공유에 안 들어감).
import { h } from "../../dom.js";
import { btn, modal, switchEl, note } from "../../kit.js";
import { fail } from "./common.js";

export async function openEmbedModal(ctx) {
  const E = ctx.memory.embedder; await E.load();
  const st = E.status();
  const f = { on: st.on, url: st.url, model: st.model, minSim: st.minSim };
  const msg = h("div", { "aria-live": "polite" });
  const field = (label, el, hint) => h("label", { class: "rb-mem-field", style: "flex-direction:column;align-items:stretch;gap:4px" }, h("span", null, label), el, hint ? h("small", { class: "rb-muted" }, hint) : null);
  const url = h("input", { class: "rb-input", value: f.url, placeholder: "https://api.openai.com/v1", "aria-label": "임베딩 API 주소", onInput: (e) => { f.url = e.target.value; } });
  const model = h("input", { class: "rb-input", value: f.model, placeholder: "text-embedding-3-small", "aria-label": "임베딩 모델", onInput: (e) => { f.model = e.target.value; } });
  const key = h("input", { class: "rb-input", type: "password", autocomplete: "off", placeholder: st.hasKey ? "저장된 키가 있어요 (바꿀 때만 입력)" : "API 키", "aria-label": "임베딩 API 키" });
  const sim = h("input", { class: "rb-input", type: "number", min: 0.1, max: 0.8, step: 0.02, value: f.minSim, "aria-label": "유사도 기준", onInput: (e) => { f.minSim = Number(e.target.value); } });
  const show = (kind, text) => { msg.replaceChildren(note(kind, text)); };
  const persist = async () => { const patch = { on: f.on, url: f.url, model: f.model, minSim: f.minSim }; if (key.value.trim()) patch.key = key.value; const s = await E.save(patch); key.value = ""; return s; };
  return modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "임베딩 설정", style: "max-width:520px;display:flex;flex-direction:column;gap:10px" },
    h("h3", { class: "rb-h3" }, "임베딩 설정"),
    h("p", { class: "rb-muted" }, "현재 장면과 뜻이 비슷한 기억을 찾아 넣을 때 써요. 단어가 달라도 찾을 수 있어요. 실패하거나 느리면 기존 방식으로 넘어가요."),
    h("div", { class: "rb-mem-field", style: "justify-content:space-between" }, h("span", null, "기본으로 사용"), switchEl(f.on, { label: "임베딩 기본 사용", onChange: (v) => { f.on = v; } })),
    field("API 주소", url, "OpenAI 호환 주소. /embeddings는 자동으로 붙어요."),
    field("모델 이름", model),
    field("API 키", key, "이 기기에만 저장돼요. 로컬 서버(localhost 등)는 비워도 돼요."),
    h("details", { class: "rb-mem-man" }, h("summary", null, "고급"), field("유사도 기준 (기본 0.32)", sim, "낮출수록 더 많이, 높일수록 확실한 것만 끌어와요. 모델마다 값 범위가 달라요.")),
    msg,
    h("div", { class: "rb-mem-edrow", style: "justify-content:flex-end;flex-wrap:wrap" },
      btn("벡터 지우기", { size: "sm", onClick: async () => { try { await E.clear(); show("info", "저장된 벡터를 지웠어요. 다음 요청 때 다시 만들어요."); } catch (e) { fail(ctx)(e); } } }),
      btn("연결 테스트", { size: "sm", onClick: async () => { show("info", "확인 중…"); try { await persist(); const r = await E.test(); show("info", `연결됐어요 · ${r.dim}차원 · ${r.ms}ms`); } catch (e) { show("err", e?.message ?? String(e)); } } }),
      btn("닫기", { onClick: () => done(true) }),
      btn("저장", { kind: "primary", onClick: async () => { try { const s = await persist(); ctx.toast(s.ready ? "임베딩을 저장했어요." : f.on ? "저장했지만 주소·모델이 비어 있어서 아직 안 쓰여요." : "저장했어요 (꺼짐)."); done(true); } catch (e) { fail(ctx)(e); } } }))));
}
