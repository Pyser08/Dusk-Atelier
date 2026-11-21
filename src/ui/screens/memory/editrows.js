// 장기기억 애드온(인간다움 2단계): 공통 편집 부품 — 목록 행마다 ✎ 고치기 · ✕ 지우기, 아래에 + 추가 · ↶ 되돌리기.
// 고친 값은 잠그지 않고 출발점이 된다(user 표시만). 지운 항목은 무시 목록에 넣어 기록기가 바로 다시 만들지 않게 한다.
// 되돌리기는 마지막 한 번(목록 전체를 그 전으로 + 그때 넣은 무시 키를 뺌). 저장은 로컬 저장소일 때만.
import { h } from "../../dom.js";
import { btn, modal, confirmDialog } from "../../kit.js";
import { memStore } from "./memstore.js";
import { mem, fail } from "./common.js";
import { ignoreKeyOf, addIgnore, dropIgnore, editAt, addTo, removeAt, findSame } from "../../../engine/memedit.js";

const turnOf = (f) => (Number.isInteger(f?.cursor?.at) ? f.cursor.at : 0);
const store = (env, fn) => Promise.resolve().then(() => memStore(env.ctx).updateFolder(env.bot.id, env.chatItem.id, fn)).then(() => env.redraw?.()).catch(fail(env.ctx));

// fields: [{k, label, type?: "text"|"area"|"num"|"select", max?, min?, len?, opts?: [[value, label]], need?}]
export function editForm(win, title, fields, cur = {}) {
  return modal(win, (done) => {
    const inputs = fields.map((fd) => {
      const v = cur[fd.k] ?? fd.def ?? "";
      const el = fd.type === "select"
        ? h("select", { class: "rb-input", "aria-label": fd.label }, fd.opts.map(([o, l]) => h("option", { value: o, selected: String(o) === String(v) ? "" : null }, l)))
        : fd.type === "area" ? h("textarea", { class: "rb-input", rows: 6, maxlength: fd.len ?? 600, "aria-label": fd.label }, String(v))
        : h("input", { class: "rb-input", type: fd.type === "num" ? "number" : "text", value: String(v), "aria-label": fd.label, ...(fd.type === "num" ? { min: fd.min, max: fd.max } : { maxlength: fd.len ?? 80 }) });
      return [fd, el];
    });
    const ok = () => {
      const out = {};
      for (const [fd, el] of inputs) {
        if (fd.type === "num") { const n = Math.round(Number(el.value)); out[fd.k] = Math.max(fd.min ?? -Infinity, Math.min(fd.max ?? Infinity, Number.isFinite(n) ? n : (fd.def ?? 0))); }
        else if (fd.type === "select") out[fd.k] = el.value;
        else { out[fd.k] = el.value.trim().slice(0, fd.len ?? 80); if (fd.need !== false && !out[fd.k]) { el.focus(); return; } }
      }
      done(out);
    };
    return h("div", { class: "rb-dialog rb-er-form", role: "dialog", "aria-modal": "true", "aria-label": title, style: "width:min(440px,94vw)" },
      h("h3", null, title),
      ...inputs.map(([fd, el]) => h("label", { class: "rb-mem-field" }, h("span", null, fd.label), el)),
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: ok })));
  });
}

// opt: { kind, id(되돌리기 구분), title(창 제목), rows:[{x, i}](보일 항목과 전체 목록 위치), get(f)→배열, set(f, 배열),
//        fields, row(x)→자식들, make?(vals, f)→새 항목(없으면 추가 버튼 없음), ttl?(무시 턴, 0=계속), addLabel?, base?(무시 키에 붙일 값), cls?(행 class) }
export function editRows(env, opt) {
  const local = env.backend?.id === "local", m = mem(env.ctx), undo = (m.erUndo ??= {});
  const li = (x, i) => h("li", { class: ["rb-er-row", opt.cls] }, ...[].concat(opt.row(x)),
    local ? h("span", { class: "rb-er-acts" },
      h("button", { type: "button", class: "rb-bzb", title: "고치기", "aria-label": "고치기", onClick: () => edit(x, i) }, "✎"),
      h("button", { type: "button", class: "rb-bzb", title: "지우기", "aria-label": "지우기", onClick: () => del(x, i) }, "✕")) : null);
  const remember = (f, key = null) => { undo[opt.id] = { prev: JSON.stringify(opt.get(f) ?? []), key }; };
  const edit = async (x, i) => {
    const v = await editForm(env.ctx.win, `${opt.title} 고치기`, opt.fields, x); if (!v) return;
    store(env, (f) => { const arr = opt.get(f) ?? [], j = findSame(arr, x, i); if (j < 0) return; remember(f); opt.set(f, editAt(arr, j, v)); });
  };
  const del = async (x, i) => {
    if (!(await confirmDialog(env.ctx.win, { title: "이 항목을 지울까요?", body: "기록기가 같은 내용을 바로 다시 적지 않게 막아요. ↶ 되돌리기로 살릴 수 있어요.", ok: "지우기", danger: true }))) return;
    store(env, (f) => { const arr = opt.get(f) ?? [], j = findSame(arr, x, i); if (j < 0) return;
      const key = ignoreKeyOf({ ...(opt.base ?? {}), ...x, kind: opt.kind }); remember(f, key);
      opt.set(f, removeAt(arr, j)); addIgnore(f, key, { turn: turnOf(f), ttl: opt.ttl ?? 0 }); });
  };
  const add = async () => {
    const v = await editForm(env.ctx.win, `${opt.title} 추가`, opt.fields); if (!v) return;
    store(env, (f) => { remember(f); const item = opt.make(v, f); dropIgnore(f, ignoreKeyOf({ ...(opt.base ?? {}), ...item, kind: opt.kind })); opt.set(f, addTo(opt.get(f) ?? [], item)); });
  };
  const back = () => store(env, (f) => { const u = undo[opt.id]; if (!u) return; opt.set(f, JSON.parse(u.prev)); if (u.key) dropIgnore(f, u.key); delete undo[opt.id]; });
  const foot = local && (opt.make || undo[opt.id]) ? h("div", { class: "rb-mem-rowact rb-er-foot" },
    opt.make ? btn(opt.addLabel ?? "+ 추가", { size: "sm", onClick: () => add().catch(fail(env.ctx)) }) : null,
    undo[opt.id] ? btn("↶ 되돌리기", { size: "sm", title: "마지막으로 고치거나 지운 것을 되돌려요", onClick: back }) : null) : null;
  return { rows: opt.rows.map(({ x, i }) => li(x, i)), foot };
}

export const EDITROWS_CSS = `.rb-er-row{position:relative}.rb-er-acts{display:inline-flex;gap:2px;margin-left:auto}.rb-er-foot{gap:6px;margin-top:6px}`;
