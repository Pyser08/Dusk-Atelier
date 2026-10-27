// 항목 고르기: 폴더 트리 + 검색 모달. 드롭다운(select) 대신 쓴다.
// opts: { win, list, pickable(entry), isDivider(entry), value(현재 고른 항목 또는 null), empty(비었을 때 글자), labelOf(entry), noteOf(entry), onPick(entry|null), title }
import { h } from "./dom.js";
import { icon } from "./icons.js";
import { btn, modal } from "./kit.js";
import { pickTree, nameOf } from "../engine/lorelist.js";
import { folderIdOf } from "../engine/lorerules.js";

export function entryPicker(o) {
  const label = o.labelOf ?? ((x) => nameOf(x) || "(이름 없음)");
  const text = h("span", { style: "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left" });
  const paint = () => { text.textContent = o.value ? label(o.value) : o.empty ?? "항목 고르기"; text.style.opacity = o.value ? "1" : ".65"; };
  paint();
  const el = h("button", { type: "button", class: "rb-input", style: "display:flex;align-items:center;gap:8px;cursor:pointer;min-width:160px;max-width:100%", "aria-haspopup": "dialog" }, text, icon("chevron", 14));
  el.addEventListener("click", async () => {
    const r = await open(o);
    if (r === null) return;                    // 닫음
    o.value = r.entry ?? null; paint(); o.onPick?.(o.value);
  });
  return el;
}

// 반환: null(닫기) | { entry: 항목 | null }  (null이면 선택 해제)
function open(o) {
  const tree = pickTree(o.list, { pickable: o.pickable, isDivider: o.isDivider });
  const label = o.labelOf ?? ((x) => nameOf(x) || "(이름 없음)");
  const collapsed = new Set();
  return modal(o.win, (done) => {
    const q = h("input", { class: "rb-input", placeholder: "이름·키로 찾기", "aria-label": "찾기", "data-autofocus": "1", style: "flex:1" });
    const body = h("div", { style: "overflow:auto;max-height:min(56vh,460px);min-height:120px;margin-top:8px;padding-right:2px", role: "tree" });
    const hit = (x, s) => !s || [x.comment, x.key, x.secondkey].some((v) => String(v ?? "").toLowerCase().includes(s));
    const row = (n, depth, s, path) => {
      const x = n.entry, picked = o.value === x;
      const sel = () => done({ entry: x });
      const main = h("button", { type: "button", role: "treeitem", "aria-selected": picked ? "true" : "false", class: "rb-item", style: `${n.folder ? "flex:1;" : `margin-left:${depth * 14 + 26}px;`}${picked ? "box-shadow:inset 0 0 0 1.5px var(--rb-acc-text);" : ""}`, onClick: n.folder ? () => { if (!n.self) { toggle(x); return; } sel(); } : sel },
        n.folder ? h("span", { style: "display:flex;color:var(--rb-sub)" }, icon(n.self ? "link" : "folder", 15)) : null,
        h("span", { class: "t" }, label(x)),
        o.noteOf?.(x) ? h("small", { class: "rb-muted" }, o.noteOf(x)) : null,
        s && path ? h("small", { class: "rb-muted", style: "margin-left:auto" }, path) : null);
      if (!n.folder) return main;
      const open2 = s || !collapsed.has(folderIdOf(x));
      const chev = h("button", { type: "button", "aria-label": open2 ? "접기" : "펼치기", style: `flex:none;background:none;border:0;padding:4px;cursor:pointer;color:var(--rb-sub);display:flex;transform:rotate(${open2 ? 90 : 0}deg)`, onClick: () => toggle(x) }, icon("chevron", 14));
      return h("div", { class: "rb-item-row", style: `margin-left:${depth * 14}px` }, chev, main);
    };
    const toggle = (x) => { const id = folderIdOf(x); if (collapsed.has(id)) collapsed.delete(id); else collapsed.add(id); draw(); };
    function draw() {
      const s = q.value.trim().toLowerCase(), out = [];
      let count = 0;
      const walk = (nodes, depth, path) => {
        for (const n of nodes) {
          if (s) {
            if (!n.folder) { if (hit(n.entry, s)) { out.push(row(n, 0, s, path)); count++; } }
            else { if (n.self && hit(n.entry, s)) { out.push(row(n, 0, s, path)); count++; } walk(n.children, depth + 1, [path, nameOf(n.entry)].filter(Boolean).join(" › ")); }
          } else {
            out.push(row(n, depth, "", ""));
            count++;
            if (n.folder && !collapsed.has(folderIdOf(n.entry))) walk(n.children, depth + 1, "");
          }
        }
      };
      walk(tree, 0, "");
      body.replaceChildren(...(out.length ? out : [h("div", { class: "rb-empty", style: "padding:18px 6px" }, s ? "찾는 항목이 없어요." : "고를 수 있는 항목이 없어요.")]));
    }
    q.addEventListener("input", draw);
    draw();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": o.title ?? "항목 고르기", style: "width:min(520px,94vw)" },
      h("h3", { class: "rb-h3" }, o.title ?? "항목 고르기"),
      h("div", { style: "display:flex;gap:6px;align-items:center" }, icon("search", 16), q),
      body,
      h("div", { class: "btns" }, o.value ? btn("선택 해제", { onClick: () => done({ entry: null }) }) : null, btn("닫기", { onClick: () => done(null) })));
  });
}
