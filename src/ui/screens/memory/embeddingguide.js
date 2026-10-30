// 기억 탭 첫 진입 때 임베딩(의미 검색)을 한 번만 소개한다.
import { h } from "../../dom.js";
import { btn, modal } from "../../kit.js";
import { openEmbedModal } from "./embedmodal.js";

const KEY = "rbm:memoryEmbeddingGuide:shown:v1";
let shownThisSession = false;

export async function maybeShowEmbeddingGuide(ctx) {
  if (shownThisSession) return;
  shownThisSession = true;
  let seen = false;
  try { seen = !!(await ctx.api.pluginStorage.getItem(KEY)); } catch {}
  if (seen) return;
  try { await ctx.api.pluginStorage.setItem(KEY, "1"); } catch {}
  await modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "임베딩 안내", style: "max-width:480px" },
    h("div", { style: "display:flex;align-items:center;gap:10px" }, h("span", { style: "font-size:25px" }, "🔎"), h("h3", { class: "rb-h3" }, "임베딩으로 기억을 더 잘 찾아요")),
    h("p", null, "임베딩은 단어가 달라도 뜻이 비슷한 기억을 찾아 주는 기능이에요. 예를 들어 ‘검은 열쇠’를 ‘낡은 자물쇠 열쇠’라고 표현해도 관련 기억을 찾을 수 있어요."),
    h("p", { class: "rb-muted" }, "기본 설정은 꺼져 있어요. 사용하려면 API 주소·모델·키를 설정하고 ‘기본으로 사용’을 켜 주세요. 임베딩이 느리거나 실패하면 기존 기억 검색으로 이어져요."),
    h("div", { class: "rb-mem-edrow", style: "justify-content:flex-end;flex-wrap:wrap" },
      btn("나중에", { onClick: () => done(true) }),
      btn("임베딩 설정", { kind: "primary", onClick: () => { done(true); openEmbedModal(ctx).catch(() => {}); } }))));
}
