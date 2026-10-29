// 주입 로어 편집 (v1.7.1, 고급 모드 전용): 대화에 실제로 들어가는 [Dusk Memory] 로어를 줄 단위로 고친다.
// 줄 수정·숨김·'내 로어' 추가. 저장된 기억 데이터는 건드리지 않고, 요청에 들어갈 때만 적용된다 (engine/memorylore.js).
import { h, replace, copyText } from "../../dom.js";
import { btn, note, confirmDialog, loading } from "../../kit.js";
import { fail } from "./common.js";
import { loreView, editLine, hideLine, resetLine, dropStale, addNote, editNote, deleteNote, resetLore, hasLoreEdits, NOTE_MAX, EDIT_MAX } from "../../../engine/memorylore.js";
import { injectReasonText } from "../../../engine/memoryinject.js";

const TITLES = [["", "현재 상황·이야기 시간"], ["Story so far", "지금까지의 이야기"], ["Characters", "인물 현재 상태"], ["Open threads", "열린 이야기(미해결)"], ["Feelings", "감정 게이지"], ["Relationship shifts", "관계 변화"], ["Knowledge limits", "누가 아는지"], ["Source lines", "원문 발췌"], ["Perspectives", "인물별 관점"], ["Inner states", "속마음(추정)"], ["Expectation gaps", "기대 어긋남"]];
const titleKo = (t) => (TITLES.find(([k]) => k === "" ? !t : t.startsWith(k)) ?? [0, t.replace(/:$/, "")])[1];

export function loreEditor(ctx, cur) {
  const M = ctx.memory, st = ctx.state.loreEd ??= { open: true };
  const body = h("div", { class: "rb-mem-lorebody" });
  let view = null;

  const mutate = async (fn) => {
    try { await M.store.updateFolder(cur.chaId, cur.chatId, (f) => { fn(f); }); } catch (e) { fail(ctx)(e); return; }
    await draw();
  };

  const lineRow = (l) => {
    const ta = h("textarea", { class: ["rb-input", "rb-mem-edtxt", l.hidden && "hid"], rows: 2, maxlength: EDIT_MAX, readonly: l.hidden ? "" : null, "aria-label": "로어 줄",
      onChange: (e) => mutate((f) => editLine(f, l.key, l.orig, e.target.value)) }, l.text);
    return h("li", { class: ["rb-mem-lorerow", l.hidden && "hidden", l.edited && "edited"] }, ta,
      h("div", { class: "rb-mem-edrow" }, l.edited ? h("span", { class: "rb-mem-tb k-infer" }, "수정됨") : null, l.hidden ? h("span", { class: "rb-mem-tb k-end" }, "숨김") : null,
        h("span", { style: "flex:1" }),
        l.hidden ? btn("보이기", { size: "sm", onClick: () => mutate((f) => hideLine(f, l.key, l.orig, false)) }) : btn("숨기기", { size: "sm", onClick: () => mutate((f) => hideLine(f, l.key, l.orig, true)) }),
        l.edited ? btn("원래대로", { size: "sm", onClick: () => mutate((f) => resetLine(f, l.key)) }) : null));
  };

  const notesBox = () => {
    const input = h("input", { class: "rb-input", placeholder: "대화에 항상 넣을 설정·사실 한 줄 (예: 둘은 비밀 연인이다)", maxlength: NOTE_MAX, "aria-label": "내 로어 추가",
      onKeydown: (e) => { if (e.key === "Enter" && e.target.value.trim()) mutate((f) => addNote(f, e.target.value)); } });
    return h("section", { class: "rb-card rb-mem-lorecard" }, h("div", { class: "rb-mem-edhead" }, h("b", null, "내 로어"), h("span", { class: "rb-muted" }, "내가 직접 쓴 줄 · 기억이 바뀌어도 그대로 남아요")),
      h("ul", { class: "rb-mem-edlist" }, view.notes.map((n) => h("li", { class: ["rb-mem-lorerow", n.on === false && "hidden"] },
        h("textarea", { class: "rb-input rb-mem-edtxt", rows: 2, maxlength: NOTE_MAX, "aria-label": "내 로어", onChange: (e) => mutate((f) => { if (!editNote(f, n.id, { text: e.target.value })) deleteNote(f, n.id); }) }, n.text),
        h("div", { class: "rb-mem-edrow" }, h("label", { class: "rb-mem-check" }, h("input", { type: "checkbox", checked: n.on !== false, onChange: (e) => mutate((f) => editNote(f, n.id, { on: e.target.checked })) }), "넣기"),
          h("span", { style: "flex:1" }), btn("삭제", { size: "sm", onClick: () => mutate((f) => deleteNote(f, n.id)) }))))),
      h("div", { class: "rb-mem-edrow" }, input, btn("추가", { size: "sm", onClick: () => { if (input.value.trim()) mutate((f) => addNote(f, input.value)); } })));
  };

  async function draw() {
    let pv, folder;
    try { [pv, folder] = await Promise.all([M.injector.preview(), M.store.getFolder(cur.chaId, cur.chatId)]); } catch (e) { return replace(body, note("err", e?.message ?? String(e))); }
    const lore = folder?.lore ?? null;
    view = loreView(pv?.raw ?? "", lore);
    const total = pv?.manifest?.tokens, hasEdits = hasLoreEdits(folder);
    const info = !pv?.ok ? pv?.why : pv.injected ? `다음 요청에 약 ${total} 토큰이 들어가요` : `지금은 기억이 들어가지 않아요${pv.reason ? ` — ${injectReasonText(pv.reason)}` : ""}`;
    const secs = view.sections.map((s) => h("section", { class: "rb-card rb-mem-lorecard" }, h("div", { class: "rb-mem-edhead" }, h("b", null, titleKo(s.title))),
      h("ul", { class: "rb-mem-edlist" }, s.lines.map(lineRow))));
    replace(body,
      h("div", { class: "rb-mem-edbar" }, h("span", { class: "rb-muted", style: "flex:1" }, info),
        btn("새로고침", { size: "sm", onClick: draw }), btn("복사", { size: "sm", onClick: async () => ctx.toast(await copyText(pv?.text ?? "") ? "들어가는 내용을 복사했어요." : "복사하지 못했어요.") }),
        hasEdits ? btn("수정 모두 지우기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "주입 로어 수정을 모두 지울까요?", body: "고친 줄·숨긴 줄·내 로어를 전부 지워요. 저장된 기억 자체는 그대로예요.", ok: "모두 지우기", danger: true })) mutate((f) => resetLore(f)); } }) : null),
      secs.length ? secs : h("p", { class: "rb-muted" }, "아직 대화에 넣을 기억이 없어요. 아래 '내 로어'는 기억이 없어도 들어가요."),
      notesBox(),
      view.stale.length ? h("section", { class: "rb-card rb-mem-lorecard" }, h("div", { class: "rb-mem-edhead" }, h("b", null, "적용 안 됨"), h("span", { class: "rb-muted" }, "원래 줄이 바뀌어서 더는 맞지 않는 수정이에요")),
        h("ul", { class: "rb-mem-edlist" }, view.stale.map((x) => h("li", { class: "rb-mem-lorerow hidden" }, h("div", { class: "rb-muted" }, `${x.kind === "hide" ? "숨김" : "수정"} · 원래: ${x.from}`), x.text ? h("div", null, `→ ${x.text}`) : null,
          h("div", { class: "rb-mem-edrow" }, btn("내 로어로 옮기기", { size: "sm", onClick: () => mutate((f) => { if (x.text) addNote(f, x.text); dropStale(f, x.key); }) }), btn("지우기", { size: "sm", onClick: () => mutate((f) => dropStale(f, x.key)) })))))) : null,
      h("p", { class: "rb-muted rb-mem-edhelp" }, "수정·숨김은 이 채팅의 다음 요청부터 적용돼요. 기억이 새로 분석돼 줄 내용이 바뀌면 그 수정은 '적용 안 됨'으로 내려가요. 계속 넣고 싶은 내용은 '내 로어'에 적으세요."));
  }

  let loaded = !!st.openBox;
  if (loaded) { replace(body, loading("불러오는 중")); draw(); }
  return h("details", { class: "rb-card rb-mem-ed rb-mem-lore", open: !!st.openBox, onToggle: (e) => { st.openBox = e.target.open; if (e.target.open && !loaded) { loaded = true; replace(body, loading("불러오는 중")); draw(); } } },
    h("summary", null, h("b", null, "주입 로어 편집"), h("small", { class: "rb-muted" }, " 대화에 들어가는 기억을 줄 단위로 고쳐요")),
    h("p", { class: "rb-muted rb-mem-edhelp" }, "플러그인이 요청마다 넣는 [Dusk Memory] 내용이에요. 고치거나 숨기고, 내가 쓴 로어를 더할 수 있어요."),
    body);
}
