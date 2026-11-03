// 플러그인 스토리지 편집 화면 (1.8.3): 값 수정 · 새 키 · 가져오기. 모든 플러그인이 함께 쓰는 저장소라 저장 직전에 값이 바뀌었는지 다시 확인한다.
import { fmtBytes, h, pickFiles, replace } from "../dom.js";
import { badge, btn, confirmDialog, modal, note } from "../kit.js";
import * as SM from "../../data/storagemgr.js";

var MONO = 'ui-monospace,"Cascadia Code","D2Coding",Menlo,Consolas,monospace';
var actions = (...k) => h("div", { class: "btns" }, ...k);
function dialog(ctx, title, build) {
  return modal(ctx.win, (done) => {
    const body = h("div", { style: "display:flex;flex-direction:column;gap:10px" });
    build({ show: (...k) => replace(body, ...k), done });
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title, style: "width:min(720px,94vw);max-width:min(720px,94vw);max-height:92vh;overflow:auto" }, h("h3", null, title), body);
  });
}
var area = (value, id) => { const ta = h("textarea", { class: "rb-input", id, spellcheck: "false", wrap: "off", style: `width:100%;box-sizing:border-box;min-height:200px;max-height:46vh;font:12.5px/1.6 ${MONO};white-space:pre` }); ta.value = value; return ta; };
var kindSel = (kind, onChange) => h("select", { class: "rb-input", id: "rb-st-kind", "aria-label": "값 형식", onChange: (e) => onChange(e.target.value) }, h("option", { value: "string", selected: kind === "string" }, "문자열"), h("option", { value: "json", selected: kind === "json" }, "JSON 값"));

// 저장 + 충돌 처리: 그새 바뀜/삭제/이미 있음이면 덮어쓸지 묻는다. 저장하면 true.
async function trySave(ctx, key, value, opts) {
  try { await SM.saveStorageItem(ctx.api, key, value, opts); return true; }
  catch (e) {
    if (!e.conflict) { ctx.toast?.(e.message); return false; }
    const hint = e.conflict === "gone" ? "덮어쓰면 편집 중인 값으로 키를 다시 만들어요." : e.conflict === "exists" ? "덮어쓰면 그 값이 사라져요." : "덮어쓰면 다른 곳에서 바뀐 값이 사라져요.";
    if (!(await confirmDialog(ctx.win, { title: e.message, body: hint, ok: "덮어쓰기", danger: true }))) return false;
    await SM.saveStorageItem(ctx.api, key, value, { ...opts, force: true }); return true;
  }
}

// 기존 키 수정
export function editStorageItem(ctx, it, refresh) {
  return dialog(ctx, `값 수정 · ${it.key}`, ({ show, done }) => {
    const origin = it.value, from = SM.valueKind(origin);
    let kind = from;
    const ta = area(SM.toEditText(origin), "rb-st-text");
    const warn = h("div", { id: "rb-st-warn" });
    const paint = () => replace(warn, SM.kindChangeWarning(from, kind) ? note("warn", SM.kindChangeWarning(from, kind)) : null, /\r/.test(String(origin)) ? note("info", "기존 값의 CR 줄바꿈(\\r)은 저장할 때 LF(\\n)로 바뀌어요.") : null);
    paint();
    show(h("p", { class: "rb-muted" }, `${fmtBytes(it.size)} · 모든 플러그인이 함께 쓰는 저장소예요. 저장 직전에 값이 바뀌었는지 다시 확인해요.`), kindSel(kind, (v) => { kind = v; paint(); }), ta, warn,
      actions(btn("닫기", { onClick: () => done(null) }), btn("저장", { kind: "primary", id: "rb-st-save", onClick: async () => {
        let v; try { v = SM.parseEdit(ta.value, kind); } catch (e) { return ctx.toast?.(e.message); }
        if (await trySave(ctx, it.key, v, { origin })) { ctx.toast?.("저장했어요"); done(true); refresh?.(); }
      } })));
  });
}

// 새 키
export function openStorageNew(ctx, refresh) {
  return dialog(ctx, "새 키", ({ show, done }) => {
    let kind = "string";
    const key = h("input", { class: "rb-input", id: "rb-st-newkey", placeholder: "키 이름 (예: myplugin:setting)", "aria-label": "키 이름" });
    const ta = area("", "rb-st-text");
    show(key, kindSel(kind, (v) => { kind = v; }), ta,
      actions(btn("닫기", { onClick: () => done(null) }), btn("만들기", { kind: "primary", id: "rb-st-create", onClick: async () => {
        const bad = SM.keyProblem(key.value); if (bad) return ctx.toast?.(bad);
        let v; try { v = SM.parseEdit(ta.value, kind); } catch (e) { return ctx.toast?.(e.message); }
        if (await trySave(ctx, key.value, v, { isNew: true })) { ctx.toast?.("만들었어요"); done(true); refresh?.(); }
      } })));
  });
}

// 가져오기: 파일 → 키 선택(이미 있는 키는 '덮어쓰기' 표시) → 쓰기. 선택하지 않은 키는 건드리지 않는다.
export function openStorageImport(ctx, existingKeys, refresh) {
  return dialog(ctx, "스토리지 가져오기", ({ show, done }) => {
    const pick = async () => {
      const [f] = await pickFiles({ accept: ".json,application/json" }); if (!f) return;
      let items; try { items = SM.parseStorageImport(await f.text(), existingKeys); } catch (e) { return ctx.toast?.(e.message); }
      if (!items.length) return ctx.toast?.("가져올 키가 없어요");
      const sel = new Set(items.map((i) => i.key));
      show(h("p", { class: "rb-p" }, `가져올 키 선택 (${items.length}개). 이미 있는 키는 덮어쓰기로 표시돼요. 선택하지 않은 키는 건드리지 않아요.`),
        h("div", { id: "rb-st-items", style: "display:flex;flex-direction:column;gap:4px;max-height:40vh;overflow:auto" }, items.map((i) => h("label", { class: "rb-p", style: "display:flex;gap:8px;align-items:center" }, h("input", { type: "checkbox", checked: true, onChange: (e) => { e.target.checked ? sel.add(i.key) : sel.delete(i.key); } }), h("span", { style: "word-break:break-all" }, i.key), i.exists && badge("덮어쓰기", "warn")))),
        actions(btn("닫기", { onClick: () => done(null) }), btn("가져오기", { kind: "primary", id: "rb-st-importgo", onClick: async () => {
          const over = items.some((i) => i.exists && sel.has(i.key));
          if (over && !(await confirmDialog(ctx.win, { title: "기존 값을 덮어쓸까요?", body: "'덮어쓰기'로 표시된 키는 기존 값이 사라져요.", ok: "덮어쓰기", danger: true }))) return;
          const r = await SM.applyStorageImport(ctx.api, items, [...sel], { overwrite: true });
          ctx.toast?.(`${r.written}개를 가져왔어요`); done(true); refresh?.();
        } })));
    };
    show(h("p", { class: "rb-p" }, "내보내기로 만든 JSON 파일을 고르세요."), actions(btn("닫기", { onClick: () => done(null) }), btn("파일 고르기", { kind: "primary", id: "rb-st-file", onClick: pick })));
  });
}
