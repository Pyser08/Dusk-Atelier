// 인물 폴더 정리: 새 폴더 · 이름 바꾸기 · 삭제(인물은 미분류로) · 고른 인물을 폴더로 옮기기(리수폿 people-folders-ui 대응).
// 폴더 배치는 이 채팅의 인물 위키에 저장되고, 규칙 검사는 리수폿 엔진이 한다.
import { h, replace } from "../../dom.js";
import { btn, modal, promptDialog, confirmDialog } from "../../kit.js";
import { fail } from "./common.js";
import { findDoc } from "../../../engine/personview.js";
import { layoutOf, createFolder, renameFolder, deleteFolder, moveToFolder, UNASSIGNED } from "../../../engine/peoplegroup.js";

export async function openFolders(env, people) {
  const { ctx } = env, M = ctx.memory;
  let wiki = env.folder.wiki, changed = false;
  const apply = async (fn, okText) => {
    let next;
    try { await M.store.updateFolder(env.bot.id, env.chatItem.id, (f) => { next = fn(f.wiki); f.wiki = next; }); wiki = next; changed = true; if (okText) ctx.toast(okText); return true; }
    catch (e) { fail(ctx)(e); return false; }
  };
  const docs = people.map(([k, p]) => ({ k, name: p.name, doc: findDoc(wiki, p) })).filter((x) => x.doc);   // 인물 문서가 있는 인물만 옮길 수 있다
  await modal(ctx.win, (done) => {
    const body = h("div"), sel = new Set();
    let target = "";
    const paint = () => {
      const layout = layoutOf(wiki), folderOf = (id) => layout.members[id] ?? "";
      const folderName = (id) => id ? layout.folders.find((f) => f.id === id)?.name ?? UNASSIGNED : UNASSIGNED;
      const folderRows = layout.folders.map((f) => h("li", { class: "rb-mem-rec" },
        h("div", { class: "txt" }, h("b", null, f.name), h("small", { class: "rb-muted" }, ` ${layout.order.filter((id) => layout.members[id] === f.id).length}명`)),
        btn("이름 바꾸기", { size: "sm", onClick: async () => { const v = await promptDialog(ctx.win, { title: "폴더 이름", label: "1~80자", value: f.name, ok: "저장" }); if (v?.trim() && await apply((w) => renameFolder(w, f.id, v), "이름을 바꿨어요.")) paint(); } }),
        btn("지우기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: `‘${f.name}’ 폴더를 지울까요?`, body: "안에 있던 인물은 사라지지 않고 미분류로 돌아가요.", ok: "지우기", danger: true }) && await apply((w) => deleteFolder(w, f.id), "폴더를 지웠어요.")) paint(); } })));
      const targetSel = h("select", { class: "rb-input", "aria-label": "옮길 폴더", onChange: (e) => { target = e.target.value; } },
        h("option", { value: "" }, UNASSIGNED), layout.folders.map((f) => h("option", { value: f.id, selected: f.id === target }, f.name)));
      replace(body,
        h("p", { class: "rb-muted" }, "인물을 폴더로 묶어 목록을 정리해요. 폴더를 지워도 인물과 기록은 그대로예요."),
        h("div", { class: "rb-mem-sact" }, btn("새 폴더", { kind: "primary", icon: "plus", onClick: async () => { const v = await promptDialog(ctx.win, { title: "새 폴더", label: "폴더 이름 (1~80자)", value: "", ok: "만들기" }); if (v?.trim() && await apply((w) => createFolder(w, v), "폴더를 만들었어요.")) paint(); } })),
        layout.folders.length ? h("ul", { class: "rb-mem-reclist" }, folderRows) : h("p", { class: "rb-muted" }, "아직 폴더가 없어요."),
        h("h4", null, "인물 옮기기"),
        docs.length ? h("div", null,
          h("div", { class: "rb-mem-checks" }, docs.map((x) => { const cb = h("input", { type: "checkbox", checked: sel.has(x.doc.id), onChange: () => { cb.checked ? sel.add(x.doc.id) : sel.delete(x.doc.id); } }); return h("label", { class: "rb-mem-check" }, cb, x.name, h("small", { class: "rb-muted" }, ` · ${folderName(folderOf(x.doc.id))}`)); })),
          h("div", { class: "rb-mem-sact" }, targetSel, btn("선택한 인물 옮기기", { onClick: async () => { if (!sel.size) return ctx.toast("옮길 인물을 골라 주세요."); if (await apply((w) => moveToFolder(w, [...sel], target), "옮겼어요.")) { sel.clear(); paint(); } } })))
          : h("p", { class: "rb-muted" }, "인물 문서가 있는 인물만 폴더로 옮길 수 있어요."));
    };
    paint();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(560px,96vw);max-height:90vh;overflow:auto" }, h("h3", null, "인물 폴더 정리"), body,
      h("div", { class: "rb-dialog-actions" }, btn("닫기", { kind: "primary", onClick: () => done(null) })));
  });
  if (changed) env.redraw();
}
