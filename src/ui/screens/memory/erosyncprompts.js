// Erosync 화면의 '프롬프트' 카드: 장면 판단·분석 지시문 칸을 보고 고친다. 고친 칸은 ‘고침’ 표시, ‘기본으로’로 되돌린다.
// 메인 모델에 보내는 글이 아니라 Erosync가 쓰는 보조 모델용 지시문이다(성적 내용 지시문은 이 칸들 안에 있다).
import { h, replace } from "../../dom.js";
import { btn } from "../../kit.js";

export const BRANCH_LABEL = { common: "공통", sfw: "SFW", nsfw: "NSFW", plus: "NSFW+" };
export const missingNote = (m) => (m?.length ? `빠진 자료 자리: ${m.map((x) => `{{${x}}}`).join(" ")}` : "");

export function erosyncPromptsCard(ctx) {
  const er = ctx.erosync, st = { page: "", open: "" };
  const body = h("div", { class: "rb-mem-fields" });
  const card = h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-prompts" }, h("h3", null, "프롬프트"), body);
  const save = async (id, branch, text) => { const r = typeof er.prompts === "function" ? await er.prompts({ id, branch, text }) : { ok: false, reason: "off" }; if (!r.ok) ctx.toast(r.reason || "저장하지 못했어요", { error: true }); else ctx.toast(text ? "고쳤어요" : "기본으로 되돌렸어요"); paint(r); };
  function section(sec) {
    const ta = {};
    const rows = sec.branches.map((b) => { const t = sec.texts[b];
      const area = h("textarea", { class: "rb-input", rows: 8, "data-b": b, style: "height:auto;padding:10px;width:100%;font-family:monospace;font-size:12px" }); area.value = t.text; ta[b] = area;
      return h("div", { class: "rb-mem-field", style: "display:block" },
        sec.branches.length > 1 ? h("b", null, `${BRANCH_LABEL[b]} ${t.changed ? "· 고침" : ""}`) : (t.changed ? h("b", null, "고침") : null), area,
        t.missing.length ? h("small", { class: "rb-muted", style: "display:block" }, missingNote(t.missing)) : null,
        h("div", { class: "rb-mem-sact" }, btn("저장", { size: "sm", onClick: () => save(sec.id, b, area.value) }), btn("기본으로", { size: "sm", onClick: () => save(sec.id, b, "") }))); });
    const changed = sec.branches.some((b) => sec.texts[b].changed);
    return h("details", { class: "rb-mem-man", open: st.open === sec.id, onToggle: (e) => { if (e.target.open) st.open = sec.id; } },
      h("summary", null, `${sec.title}${changed ? " · 고침" : ""}`), h("p", { class: "rb-muted", style: "white-space:normal" }, sec.desc), ...rows);
  }
  function paint(r) {
    if (!r?.ok) { replace(body, h("p", { class: "rb-muted", style: "white-space:normal" }, "Erosync를 켜면 여기서 지시문을 볼 수 있어요.")); return; }
    st.page ||= r.pages[0]?.id;
    const page = r.pages.find((p) => p.id === st.page) ?? r.pages[0];
    replace(body,
      h("p", { class: "rb-muted", style: "white-space:normal" }, "Erosync가 쓰는 보조 모델용 지시문이에요. 잘못 고치면 장면 판단이 어긋날 수 있으니, 고친 칸은 ‘기본으로’로 되돌릴 수 있어요. 이 기기에 저장돼요."),
      h("div", { class: "rb-mem-field" }, h("span", null, "지시문 종류"),
        h("select", { class: "rb-input", id: "rb-erosync-prompt-page", onChange: (e) => { st.page = e.target.value; st.open = ""; paint(r); } }, ...r.pages.map((p) => h("option", { value: p.id, selected: p.id === page.id }, p.name)))),
      page?.use ? h("p", { class: "rb-muted", style: "white-space:normal" }, page.use) : null,
      ...(page?.sections ?? []).map(section));
  }
  paint({ ok: false });
  if (er.on() && er.isRunning() && typeof er.prompts === "function") er.prompts().then(paint);
  return card;
}
