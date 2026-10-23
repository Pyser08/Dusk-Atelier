import { CBS } from '../cbs.js';
import { codeEditor } from '../codeedit.js';
import { newId, stableJson } from '../../engine/util.js';
import { createStore } from '../../engine/store.js';
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, confirmDialog, folderDialog, folderPickPrefs, iconBtn, note, openMenu, promptDialog } from '../kit.js';
import { gripDrag } from '../sortable.js';
import { reload } from './modules.js';

var LORE_MODES = [["normal", "일반"], ["constant", "항상 켜짐"], ["multiple", "여러 키"], ["child", "하위"], ["folder", "폴더"]];
var REGEX_TYPES = [["editinput", "입력 수정"], ["editoutput", "출력 수정"], ["editprocess", "요청 데이터 수정"], ["editdisplay", "화면 표시 수정"], ["edittrans", "번역 표시 수정"], ["disabled", "사용 안 함"]];
var TRIGGER_TYPES = [["start", "채팅 시작"], ["input", "입력할 때"], ["output", "출력할 때"], ["display", "화면 표시"], ["request", "요청할 때"], ["manual", "수동(버튼)"]];
var newLore = () => ({ key: "", secondkey: "", insertorder: 100, comment: "새 항목", content: "", mode: "normal", alwaysActive: false, selective: false, useRegex: false });
var newLoreFolder = () => ({ key: "folder:" + newId(), comment: "새 폴더", content: "", mode: "folder", insertorder: 100, alwaysActive: false, secondkey: "", selective: false });
var newRegex = () => ({ comment: "새 정규식", in: "", out: "", type: "editoutput", flag: "g", ableFlag: false });
var newTrigger = () => ({ comment: "새 트리거", type: "output", conditions: [], effect: [{ type: "triggerlua", code: "" }], lowLevelAccess: false });
var DIV = /^\s*[-=─━═~*#_—–·•+<>]{2,}|[-=─━═~*#_—–·•+<>]{2,}\s*$/;
var isDividerName = (s) => DIV.test(String(s ?? ""));
var isLoreDivider = (l) => !String(l?.key ?? "").trim() && !l?.alwaysActive && l?.mode !== "constant" && (isDividerName(l?.comment) || !String(l?.content ?? "").trim());
var isRegexDivider = (r) => !r?.in && (isDividerName(r?.comment) || !String(r?.out ?? "").trim());
export function validateModule(m) {
  const out = [];
  if (!String(m.name ?? "").trim()) out.push({ level: "err", tab: "info", msg: "이름이 비어 있어요" });
  (m.lorebook ?? []).forEach((l, i) => {
    if (l.mode === "folder" || isLoreDivider(l)) return;
    if (!l.alwaysActive && l.mode !== "constant" && !String(l.key ?? "").trim()) out.push({ level: "warn", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 활성화 키가 없고 항상 켜짐도 아니라서 쓰이지 않아요` });
    if (l.useRegex) for (const k of String(l.key ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
      const mm = /^\/(.*)\/([a-z]*)$/s.exec(k);
      if (!mm) {
        out.push({ level: "warn", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 정규식 키는 /패턴/플래그 모양이어야 해요` });
        continue;
      }
      try {
        new RegExp(mm[1], mm[2]);
      } catch (e) {
        out.push({ level: "err", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 정규식 오류 — ${e.message}` });
      }
    }
    if (l.folder && !(m.lorebook ?? []).some((f) => f.mode === "folder" && f.key === l.folder)) out.push({ level: "warn", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 없는 폴더에 들어 있어요` });
  });
  (m.regex ?? []).forEach((r, i) => {
    if (isRegexDivider(r)) return;
    if (!r.in) {
      out.push({ level: "warn", tab: "regex", index: i, msg: `정규식 '${r.comment || i + 1}': 찾을 패턴이 비어 있어요` });
      return;
    }
    if (String(r.in).includes("{{")) return;
    try {
      new RegExp(r.in, String(r.ableFlag ? r.flag ?? "" : "g").replace(/[^dgimsuyv]/g, ""));
    } catch (e) {
      out.push({ level: "err", tab: "regex", index: i, msg: `정규식 '${r.comment || i + 1}': ${e.message}` });
    }
  });
  (m.trigger ?? []).forEach((t, i) => {
    if (!Array.isArray(t.conditions)) out.push({ level: "err", tab: "trigger", index: i, msg: `트리거 '${t.comment || i + 1}': conditions가 배열이 아니에요` });
    if (!Array.isArray(t.effect)) out.push({ level: "err", tab: "trigger", index: i, msg: `트리거 '${t.comment || i + 1}': effect가 배열이 아니에요` });
  });
  if (m.mcp !== void 0 && m.mcp !== null && typeof m.mcp !== "object") out.push({ level: "err", tab: "info", msg: "MCP 설정은 객체여야 해요" });
  return out;
}
var MOD_INFO_LABELS = { name: "이름", description: "설명", namespace: "네임스페이스", lowLevelAccess: "저수준 접근", hideIcon: "아이콘 숨김", backgroundEmbedding: "배경 HTML", customModuleToggle: "모듈 토글", cjs: "스크립트", mcp: "MCP" };
export function diffSummary(a, b, { infoLabels = MOD_INFO_LABELS, infoTitle = "모듈 정보" } = {}) {
  const lines = [];
  const changedInfo = Object.keys(infoLabels).filter((k) => stableJson(a[k] ?? null) !== stableJson(b[k] ?? null));
  if (changedInfo.length) lines.push(`${infoTitle}: ${changedInfo.map((k) => infoLabels[k]).join(", ")}`);
  for (const [k, label] of [["lorebook", "로어북"], ["regex", "정규식"], ["trigger", "트리거"], ["assets", "에셋"]]) {
    const A = (a[k] ?? []).map((x) => stableJson(x)), B = (b[k] ?? []).map((x) => stableJson(x));
    const count = (arr) => arr.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), /* @__PURE__ */ new Map());
    const ca = count(A), cb = count(B);
    let added = 0, removed = 0;
    for (const [x, n] of cb) added += Math.max(0, n - (ca.get(x) ?? 0));
    for (const [x, n] of ca) removed += Math.max(0, n - (cb.get(x) ?? 0));
    const moved = !added && !removed && A.join("\n") !== B.join("\n");
    const changed = Math.min(added, removed);
    if (added || removed || moved) lines.push(`${label}: ${[changed && `수정 ${changed}`, added - changed && `추가 ${added - changed}`, removed - changed && `삭제 ${removed - changed}`, moved && "순서 바뀜"].filter(Boolean).join(" · ")}`);
  }
  return lines;
}
export async function openEditor(ctx, id) {
  // 목록에서 이미 읽어 둔 것을 쓴다 (저장할 때는 어차피 봇·모듈을 새로 읽어 확인한다)
  let data = await ctx.svc.load();
  let entry2 = data.entries.find((e) => e.module.id === id);
  if (!entry2) {
    data = await ctx.svc.load({ fresh: true });
    entry2 = data.entries.find((e) => e.module.id === id);
  }
  if (!entry2) {
    ctx.toast("모듈을 찾지 못했어요", { error: true });
    return;
  }
  return openEditorCore(ctx, {
    view: entry2.module,
    kindLabel: "모듈 편집",
    idKey: "id",
    validate: validateModule,
    async save(draft, original) {
      await createStore(ctx.api).addBackup({ kind: "module", target: original.id, name: original.name, snapshot: original, note: "편집 전" }).catch(() => null);
      const patch = {};
      for (const k of /* @__PURE__ */ new Set([...Object.keys(original), ...Object.keys(draft)])) if (k !== "id" && stableJson(original[k] ?? null) !== stableJson(draft[k] ?? null)) patch[k] = draft[k];
      await ctx.svc.run("update", original.id, patch);
      reload(ctx).catch(() => {
      });
    }
  });
}
export async function openEditorCore(ctx, cfg) {
  const original = structuredClone(cfg.view);
  let draft = structuredClone(cfg.view);
  for (const k of ["lorebook", "regex", "trigger"]) if (!Array.isArray(draft[k])) draft[k] = [];
  const es = { tab: "lorebook", sel: { lorebook: 0, regex: 0, trigger: 0 }, q: { lorebook: "", regex: "", trigger: "" }, lastField: null, mItem: false };
  const dirty = () => stableJson(draft) !== stableJson(original);
  const panel = h("div", { class: "rb-full", role: "dialog", "aria-label": `${original.name} 편집` });
  const titleB = h("b", null, original.name || "(이름 없음)");
  const issuesBtn = btn("", { size: "sm", kind: "ghost", onClick: () => showIssues() });
  const applyBtn = btn("적용", { kind: "primary", icon: "check", onClick: () => apply() });
  const head = h(
    "div",
    { class: "rb-full-head" },
    iconBtn("back", "닫기", { onClick: () => close() }),
    h("div", { class: "ttl" }, h("small", null, cfg.kindLabel), titleB),
    issuesBtn,
    btn("CBS 사전", { size: "sm", onClick: () => cbsPanel() }),
    applyBtn
  );
  const tabsEl = h("div", { class: "rb-tabs", role: "tablist" });
  const body = h("div", { class: "rb-split" });
  panel.append(head, tabsEl, body);
  ctx.win.appendChild(panel);
  panel.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !ctx.win.querySelector(".rb-modal, .rb-menu")) {
      ev.stopPropagation();
      close();
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
      ev.preventDefault();
      apply();
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "f") {
      const s = panel.querySelector(".rb-side-tools input");
      if (s) {
        ev.preventDefault();
        s.focus();
        s.select();
      }
    }
  });
  panel.addEventListener("focusin", (ev) => {
    if (ev.target.matches("textarea, input[type=text], input:not([type])")) es.lastField = ev.target;
  });
  const TABS2 = [["info", "정보"], ["lorebook", "로어북"], ["regex", "정규식"], ["trigger", "트리거"], ["json", "JSON"]];
  function paintTabs() {
    replace(tabsEl, TABS2.map(([k, label]) => h(
      "button",
      { type: "button", role: "tab", "aria-selected": es.tab === k ? "true" : "false", onClick: () => {
        es.tab = k;
        es.mItem = false;
        render();
      } },
      label,
      ["lorebook", "regex", "trigger"].includes(k) ? h("small", null, String(draft[k].length)) : null
    )));
  }
  function paintHead() {
    const iss = cfg.validate(draft);
    const errs = iss.filter((i) => i.level === "err").length, warns = iss.length - errs;
    replace(issuesBtn, icon(errs || warns ? "alert" : "check", 16), h("span", null, errs ? `오류 ${errs}` : warns ? `경고 ${warns}` : "검증 통과"));
    issuesBtn.style.color = errs ? "var(--rb-danger)" : warns ? "var(--rb-warn)" : "var(--rb-teal)";
    applyBtn.disabled = !dirty();
    titleB.textContent = (draft.name || "(이름 없음)") + (dirty() ? " •" : "");
  }
  let headTimer = null, tabsTimer = null;
  const changed = () => {
    titleB.textContent = (draft.name || "(이름 없음)") + " •";
    applyBtn.disabled = false;
    clearTimeout(headTimer);
    headTimer = setTimeout(paintHead, 250);
    clearTimeout(tabsTimer);
    tabsTimer = setTimeout(paintTabs, 120);
  };
  const field = (label, input, wide) => h("label", { class: ["rb-field", wide && "wide"] }, h("span", { class: "rb-label" }, label), input);
  const text = (obj, key, { placeholder, onInput } = {}) => {
    const el = h("input", { class: "rb-input", value: obj[key] ?? "", placeholder });
    el.addEventListener("input", () => {
      obj[key] = el.value;
      onInput?.();
      changed();
    });
    return el;
  };
  const num = (obj, key) => {
    const el = h("input", { class: "rb-input", type: "number", value: obj[key] ?? "" });
    el.addEventListener("input", () => {
      obj[key] = el.value === "" ? void 0 : Number(el.value);
      changed();
    });
    return el;
  };
  const area = (obj, key, { tall, placeholder, mono = true } = {}) => {
    const el = h("textarea", { class: ["rb-textarea", tall && "tall"], spellcheck: "false", placeholder, style: mono ? null : "font-family:inherit;font-size:14px" });
    el.value = obj[key] ?? "";
    el.addEventListener("input", () => {
      obj[key] = el.value;
      changed();
    });
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Tab" && !ev.shiftKey && !ev.ctrlKey) {
        ev.preventDefault();
        el.setRangeText("	", el.selectionStart, el.selectionEnd, "end");
        el.dispatchEvent(new Event("input"));
      }
    });
    return el;
  };
  // 코드 편집기 모양의 칸 (정규식 IN/OUT): 색 입히기 + 괄호 짝 표시
  const codeArea = (obj, key, { lang, tall, placeholder } = {}) => {
    const ed = codeEditor(obj[key] ?? "", {
      lang,
      tab: "\t",
      placeholder,
      label: key,
      minHeight: tall ? "max(300px,46vh)" : "96px",
      maxHeight: tall ? "70vh" : "40vh",
      onChange: (v) => {
        obj[key] = v;
        changed();
      }
    });
    return ed.el;
  };
  const check = (obj, key, label) => {
    const el = h("input", { type: "checkbox", checked: !!obj[key] });
    el.addEventListener("change", () => {
      obj[key] = el.checked;
      changed();
    });
    return h("label", { class: "rb-check" }, el, h("span", null, label));
  };
  const select2 = (obj, key, options, onChange) => {
    const el = h("select", { class: "rb-input" }, options.map(([v, l]) => h("option", { value: v, selected: (obj[key] ?? options[0][0]) === v }, l)));
    el.addEventListener("change", () => {
      obj[key] = el.value;
      changed();
      onChange?.();
    });
    return el;
  };
  const jsonArea = (obj, key, { tall } = {}) => {
    const el = h("textarea", { class: ["rb-textarea", tall && "tall"], spellcheck: "false" });
    el.value = obj[key] === void 0 ? "" : JSON.stringify(obj[key], null, 2);
    const err = h("span", { class: "rb-muted" });
    el.addEventListener("input", () => {
      if (!el.value.trim()) {
        delete obj[key];
        err.textContent = "";
        changed();
        return;
      }
      try {
        obj[key] = JSON.parse(el.value);
        err.textContent = "";
        el.style.borderColor = "";
        changed();
      } catch (e) {
        err.textContent = `JSON 오류: ${e.message}`;
        el.style.borderColor = "var(--rb-danger)";
      }
    });
    return h("div", { style: "display:flex;flex-direction:column;gap:4px" }, el, err);
  };
  function renderInfo() {
    if (cfg.renderInfo) {
      replace(body, h("div", { class: "pane" }, cfg.renderInfo({ draft, field, text, area, check, num, jsonArea, select: select2, changed })));
      return;
    }
    replace(body, h(
      "div",
      { class: "pane" },
      h(
        "div",
        { class: "rb-form" },
        field("이름", text(draft, "name")),
        field("네임스페이스", text(draft, "namespace", { placeholder: "다른 모듈·트리거가 이 모듈을 가리킬 때 쓰는 이름" })),
        field("설명", area(draft, "description", { mono: false }), true),
        h("div", { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap" }, check(draft, "lowLevelAccess", "저수준 접근 (AI 호출·이미지 생성 등 고급 기능)"), check(draft, "hideIcon", "채팅에서 아이콘 숨기기")),
        field("모듈 토글 정의 (customModuleToggle)", area(draft, "customModuleToggle", { placeholder: "예) toggle_이름=보여줄 이름" }), true),
        field("배경 HTML (backgroundEmbedding)", area(draft, "backgroundEmbedding"), true),
        field("스크립트 (cjs)", area(draft, "cjs"), true),
        field("MCP 설정 (JSON)", jsonArea(draft, "mcp"), true)
      ),
      draft.lowLevelAccess ? note("warn", "저수준 접근을 켠 모듈은 믿을 수 있는 출처일 때만 쓰세요.") : null
    ));
  }
  function renderList(kind) {
    const list = draft[kind];
    const q = es.q[kind].trim().toLowerCase();
    const match = (it2) => !q || [it2.comment, it2.key, it2.secondkey, it2.content, it2.in, it2.out, JSON.stringify(it2.effect ?? "")].some((v) => String(v ?? "").toLowerCase().includes(q));
    if (es.sel[kind] >= list.length) es.sel[kind] = list.length - 1;
    if (list[es.sel[kind]]?.mode === "folder") {
      const j = list.findIndex((x, k) => k >= es.sel[kind] && x.mode !== "folder");
      es.sel[kind] = j >= 0 ? j : list.findIndex((x) => x.mode !== "folder");
    }
    const search = h("input", { class: "rb-input", style: "height:36px;flex:1;min-width:120px", placeholder: "찾기 (Ctrl+F) — 이름·키·내용", value: es.q[kind], "aria-label": "찾기" });
    search.addEventListener("input", () => {
      es.q[kind] = search.value;
      paintItems();
    });
    const add = (mk) => {
      const at = es.sel[kind] >= 0 ? es.sel[kind] + 1 : list.length;
      const it2 = mk();
      const cur = list[es.sel[kind]];
      if (kind === "lorebook" && cur && it2.mode !== "folder") {
        if (cur.mode === "folder") it2.folder = cur.key;
        else if (cur.folder) it2.folder = cur.folder;
      }
      list.splice(at, 0, it2);
      es.sel[kind] = at;
      es.mItem = true;
      changed();
      render();
    };
    const tools = h(
      "div",
      { class: "rb-side-tools" },
      search,
      btn("추가", { size: "sm", icon: "plus", onClick: () => add(kind === "lorebook" ? newLore : kind === "regex" ? newRegex : newTrigger) }),
      kind === "lorebook" ? btn("폴더", { size: "sm", icon: "folderPlus", onClick: () => newFolderPicked() }) : null
    );
    const items = h("div", { class: "rb-side-list", role: "listbox", "aria-label": "항목" });
    const uid = /* @__PURE__ */ new WeakMap();
    let seq = 0;
    const idOf = (it2) => {
      if (!uid.has(it2)) uid.set(it2, "i" + ++seq);
      return uid.get(it2);
    };
    const byUid = (id) => list.find((x) => uid.get(x) === id);
    const selObj = () => list[es.sel[kind]];
    const reselect = (obj) => {
      es.sel[kind] = obj ? list.indexOf(obj) : es.sel[kind];
    };
    es.loreCollapsed ??= /* @__PURE__ */ new Set();
    const dropTo = ({ beforeId, after, folderId }, dragged) => {
      const keepSel = selObj();
      const from = list.indexOf(dragged);
      if (from < 0) return;
      if (beforeId) {
        const target = byUid(beforeId);
        if (!target || target === dragged) return;
        list.splice(from, 1);
        list.splice(list.indexOf(target) + (after ? 1 : 0), 0, dragged);
        if (kind === "lorebook" && dragged.mode !== "folder") {
          if (target.mode === "folder") dragged.folder = target.key;
          else if (target.folder) dragged.folder = target.folder;
          else delete dragged.folder;
        }
      } else if (kind === "lorebook") {
        list.splice(from, 1);
        if (folderId) {
          let at = list.findIndex((x) => x.mode === "folder" && x.key === folderId);
          list.forEach((x, k) => {
            if (x.folder === folderId) at = k;
          });
          list.splice(at + 1, 0, dragged);
          dragged.folder = folderId;
        } else {
          list.push(dragged);
          delete dragged.folder;
        }
      }
      reselect(keepSel);
      changed();
      render();
    };
    const rowFor = (it2, i2, { child = false, grip = true } = {}) => {
      const divider = kind === "lorebook" ? isLoreDivider(it2) : kind === "regex" ? isRegexDivider(it2) : false;
      const label = it2.comment || (kind === "lorebook" ? it2.key : it2.in) || "(이름 없음)";
      const off = kind === "regex" ? it2.type === "disabled" : kind === "lorebook" ? it2.enabled === false : false;
      const b = h(
        "button",
        { type: "button", class: ["rb-item", off && "off", child && "child", divider && "divider"], role: "option", "aria-selected": es.sel[kind] === i2 ? "true" : "false", onClick: () => {
          es.sel[kind] = i2;
          es.mItem = true;
          render();
        } },
        h("span", { class: "t" }, label),
        kind === "lorebook" && !divider && (it2.alwaysActive || it2.mode === "constant") ? badge("항상", "acc") : null,
        kind === "trigger" ? badge(TRIGGER_TYPES.find((x) => x[0] === it2.type)?.[1] ?? it2.type, "mute") : null
      );
      if (!grip) return b;
      const g = h("span", { class: "grip", title: "끌어서 순서 바꾸기·폴더에 넣기", "aria-hidden": "true" }, icon("grip", 14));
      const w = h("div", { class: "rb-item-row", dataset: { dropRow: idOf(it2) } }, g, b);
      gripDrag({ grip: g, row: w, root: items, scroller: items, onDrop: (d) => dropTo(d, it2) });
      return w;
    };
    const folderHead = (f, kids) => {
      const open = !es.loreCollapsed.has(f.key);
      const head2 = h(
        "div",
        { class: "rb-item-row", dataset: { dropFolder: f.key } },
        h(
          "button",
          { type: "button", class: "rb-folder", style: "flex:1;margin-top:2px", "aria-expanded": open ? "true" : "false", onClick: () => {
            if (open) es.loreCollapsed.add(f.key);
            else es.loreCollapsed.delete(f.key);
            paintItems();
          } },
          h("span", { class: "chev" }, icon("chevron", 14)),
          h("span", { style: "display:flex;color:var(--rb-acc-text)" }, icon("folder", 15)),
          h("b", { style: "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, f.comment || "(이름 없는 폴더)"),
          h("small", null, String(kids.length))
        ),
        iconBtn("more", `${f.comment} 폴더 메뉴`, { onClick: (e) => folderMenuLore(f, e.currentTarget) })
      );
      return head2;
    };
    function paintItems() {
      const out = [];
      if (q || kind !== "lorebook") {
        list.forEach((it2, i2) => {
          if (match(it2)) out.push(rowFor(it2, i2, { grip: !q }));
        });
      } else {
        const keys = new Set(list.filter((x) => x.mode === "folder").map((x) => x.key));
        list.forEach((it2, i2) => {
          if (it2.mode === "folder") {
            const kids = list.map((x, k) => [x, k]).filter(([x]) => x.mode !== "folder" && x.folder === it2.key);
            out.push(folderHead(it2, kids));
            if (!es.loreCollapsed.has(it2.key)) {
              const bodyEl = h("div", { class: "rb-folder-body", style: "margin-left:12px;padding-left:8px" }, ...kids.map(([x, k]) => rowFor(x, k)));
              if (!kids.length) bodyEl.appendChild(h("div", { class: "rb-muted", style: "padding:6px 10px;font-size:12px" }, "항목을 여기로 끌어다 놓으세요"));
              out.push(bodyEl);
            }
            return;
          }
          if (it2.folder && keys.has(it2.folder)) return;
          out.push(rowFor(it2, i2));
        });
        if (keys.size) out.push(h("div", { class: "rb-label", style: "padding:10px 10px 6px;border-radius:8px", dataset: { dropFolder: "" } }, "여기에 놓으면 폴더 밖으로"));
      }
      replace(items, out.length ? out : h("div", { class: "rb-empty" }, list.length ? "찾는 항목이 없어요" : '항목이 없어요. "추가"를 눌러 만드세요.'));
    }
    const loreItems = () => list.filter((x) => x.mode !== "folder").map((x) => ({ id: idOf(x), label: x.comment || x.key || "(이름 없음)", folder: x.folder || null, sub: x.folder ? `지금: ${list.find((f) => f.mode === "folder" && f.key === x.folder)?.comment ?? "폴더"}` : "폴더 없음" }));
    async function newFolderPicked() {
      const r = await folderDialog(ctx.win, { title: "새 로어북 폴더", items: loreItems(), noun: "항목", ...folderPickPrefs(ctx) });
      if (!r) return;
      const keepSel = selObj();
      const f = { ...newLoreFolder(), comment: r.name };
      const picked = r.ids.map(byUid).filter(Boolean);
      let at = picked.length ? Math.min(...picked.map((x) => list.indexOf(x))) : list.length;
      for (const x of picked) list.splice(list.indexOf(x), 1);
      at = Math.min(at, list.length);
      list.splice(at, 0, f, ...picked);
      for (const x of picked) x.folder = f.key;
      reselect(keepSel);
      changed();
      render();
    }
    function folderMenuLore(f, anchor) {
      openMenu(ctx.win, anchor, [
        { label: "넣을 항목 고르기…", icon: "plus", onClick: async () => {
          const r = await folderDialog(ctx.win, { title: `'${f.comment}' 폴더에 넣을 항목`, items: loreItems(), checked: list.filter((x) => x.folder === f.key).map(idOf), ok: "저장", withName: false, noun: "항목", current: f.key, ...folderPickPrefs(ctx) });
          if (!r) return;
          const keepSel = selObj();
          for (const x of list) if (x.folder === f.key && !r.ids.includes(idOf(x))) delete x.folder;
          const picked = r.ids.map(byUid).filter(Boolean);
          for (const x of picked) list.splice(list.indexOf(x), 1);
          let at = list.indexOf(f);
          list.forEach((x, k) => {
            if (x.folder === f.key) at = k;
          });
          list.splice(at + 1, 0, ...picked);
          for (const x of picked) x.folder = f.key;
          reselect(keepSel);
          changed();
          render();
        } },
        { label: "이름 바꾸기", icon: "edit", onClick: async () => {
          const n = await promptDialog(ctx.win, { title: "폴더 이름", value: f.comment });
          if (n?.trim()) {
            f.comment = n.trim();
            changed();
            render();
          }
        } },
        "sep",
        { label: "폴더 삭제 (항목은 남음)", icon: "trash", danger: true, onClick: () => {
          const keepSel = selObj();
          for (const x of list) if (x.folder === f.key) delete x.folder;
          list.splice(list.indexOf(f), 1);
          reselect(keepSel === f ? null : keepSel);
          if (keepSel === f) es.sel[kind] = Math.min(es.sel[kind], list.length - 1);
          changed();
          render();
        } }
      ]);
    }
    paintItems();
    const i = es.sel[kind], it = list[i];
    const moveIt = (d) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      es.sel[kind] = j;
      changed();
      render();
    };
    const itemTools = it ? h(
      "div",
      { style: "display:flex;gap:6px;flex-wrap:wrap" },
      btn("복제", { size: "sm", onClick: () => {
        const c = structuredClone(it);
        if (c.mode === "folder") c.key = "folder:" + newId();
        delete c.id;
        c.comment = (c.comment || "") + " (복사)";
        list.splice(i + 1, 0, c);
        es.sel[kind] = i + 1;
        changed();
        render();
      } }),
      btn("위로", { size: "sm", icon: "up", onClick: () => moveIt(-1) }),
      btn("아래로", { size: "sm", icon: "down", onClick: () => moveIt(1) }),
      h("div", { class: "rb-spacer" }),
      btn("삭제", { size: "sm", kind: "danger", icon: "trash", onClick: async () => {
        if (it.mode === "folder" && list.some((x) => x.folder === it.key) && !await confirmDialog(ctx.win, { title: "폴더를 지울까요?", body: "안의 항목은 폴더 밖으로 나와요.", ok: "삭제", danger: true })) return;
        if (it.mode === "folder") {
          for (const x of list) if (x.folder === it.key) delete x.folder;
        }
        list.splice(i, 1);
        es.sel[kind] = Math.min(i, list.length - 1);
        changed();
        render();
      } })
    ) : null;
    const pane = h("div", { class: "pane" });
    body.classList.toggle("m-item", !!(es.mItem && it));
    body.classList.toggle("m-list", !(es.mItem && it));
    pane.appendChild(h("div", { class: "rb-mobile-only" }, btn("목록으로", { size: "sm", icon: "back", onClick: () => {
      es.mItem = false;
      render();
    } })));
    if (!it) pane.appendChild(h("div", { class: "rb-empty" }, "왼쪽에서 항목을 고르세요."));
    else pane.append(itemTools, kind === "lorebook" ? loreForm(it) : kind === "regex" ? regexForm(it) : triggerForm(it));
    replace(body, h("div", { class: "side" }, tools, items), pane);
  }
  function loreForm(l) {
    const folders = draft.lorebook.filter((x) => x.mode === "folder");
    if (l.mode === "folder") return h("div", { class: "rb-form" }, field("폴더 이름", text(l, "comment")), h("p", { class: "rb-muted wide" }, `이 폴더 안 항목 ${draft.lorebook.filter((x) => x.folder === l.key).length}개`));
    const enabled = h("input", { type: "checkbox", checked: l.enabled !== false });
    enabled.addEventListener("change", () => {
      if (enabled.checked) delete l.enabled;
      else l.enabled = false;
      changed();
    });
    const folderSel = h("select", { class: "rb-input" }, h("option", { value: "" }, "(폴더 없음)"), folders.map((f) => h("option", { value: f.key, selected: l.folder === f.key }, f.comment || "(이름 없는 폴더)")));
    folderSel.addEventListener("change", () => {
      if (folderSel.value) l.folder = folderSel.value;
      else delete l.folder;
      changed();
      renderList("lorebook");
    });
    return h(
      "div",
      { class: "rb-form" },
      field("이름", text(l, "comment")),
      field("방식", select2(l, "mode", LORE_MODES.filter((x) => x[0] !== "folder"))),
      field("활성화 키 (쉼표로 구분)", text(l, "key"), true),
      field("내용", area(l, "content", { tall: true, mono: false }), true),
      h(
        "div",
        { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap" },
        h("label", { class: "rb-check" }, enabled, h("span", null, "사용")),
        check(l, "alwaysActive", "항상 켜짐"),
        check(l, "selective", "보조 키 사용"),
        check(l, "useRegex", "키를 정규식으로")
      ),
      field("보조 키", text(l, "secondkey", { placeholder: "보조 키 사용을 켜면 둘 다 있어야 켜짐" })),
      field("삽입 순서", num(l, "insertorder")),
      field("켜질 확률 (%)", num(l, "activationPercent")),
      field("폴더", folderSel)
    );
  }
  function regexForm(r) {
    const flags = h("div", { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap;align-items:center" }, check(r, "ableFlag", "플래그 직접 지정"));
    const flagInput = text(r, "flag", { placeholder: "g, i, m, s…" });
    flags.appendChild(h("div", { style: "width:180px" }, flagInput));
    return h(
      "div",
      { class: "rb-form" },
      field("이름", text(r, "comment")),
      field("적용 시점", select2(r, "type", REGEX_TYPES)),
      field("찾을 패턴 (IN)", codeArea(r, "in", { lang: "regex" }), true),
      field("바꿀 내용 (OUT)", codeArea(r, "out", { lang: "replace", tall: true }), true),
      flags
    );
  }
  function triggerForm(t) {
    const lua = Array.isArray(t.effect) && t.effect.length === 1 && ["triggerlua", "triggercode"].includes(t.effect[0]?.type) ? t.effect[0] : null;
    return h(
      "div",
      { class: "rb-form" },
      field("이름", text(t, "comment")),
      field("실행 시점", select2(t, "type", TRIGGER_TYPES)),
      h("div", { class: "wide", style: "display:flex;gap:16px" }, check(t, "lowLevelAccess", "저수준 접근")),
      lua ? field(lua.type === "triggerlua" ? "Lua 코드" : "트리거 코드", area(lua, "code", { tall: true }), true) : null,
      field("조건 (conditions, JSON)", jsonArea(t, "conditions"), true),
      lua ? null : field("효과 (effect, JSON)", jsonArea(t, "effect", { tall: true }), true)
    );
  }
  function renderJson() {
    const view = structuredClone(draft);
    delete view[cfg.idKey];
    const el = h("textarea", { class: "rb-textarea", style: "flex:1;min-height:60vh", spellcheck: "false" });
    el.value = JSON.stringify(view, null, 2);
    const msg = h("span", { class: "rb-muted" }, "전체를 JSON으로 고쳐요. 식별자(id)는 바꿀 수 없어요.");
    const applyJson = btn("JSON 반영", { size: "sm", kind: "primary", onClick: () => {
      try {
        const j = JSON.parse(el.value);
        if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error("최상위는 객체({…})여야 해요");
        for (const k of ["lorebook", "regex", "trigger"]) if (j[k] !== void 0 && !Array.isArray(j[k])) throw new Error(`${k}는 배열이어야 해요`);
        draft = { ...j, [cfg.idKey]: original[cfg.idKey] };
        for (const k of ["lorebook", "regex", "trigger"]) if (!Array.isArray(draft[k])) draft[k] = [];
        msg.textContent = '반영했어요. "적용"을 눌러야 저장돼요.';
        msg.style.color = "var(--rb-teal)";
        changed();
      } catch (e) {
        msg.textContent = `JSON 오류: ${e.message}`;
        msg.style.color = "var(--rb-danger)";
      }
    } });
    replace(body, h("div", { class: "pane" }, h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap" }, msg, h("div", { class: "rb-spacer" }), applyJson), el));
  }
  function render() {
    paintTabs();
    paintHead();
    if (es.tab === "info" || es.tab === "json") body.classList.remove("m-item", "m-list");
    if (es.tab === "info") renderInfo();
    else if (es.tab === "json") renderJson();
    else renderList(es.tab);
  }
  function showIssues() {
    const iss = cfg.validate(draft);
    const back = h(
      "div",
      { class: "rb-modal", onMousedown: (ev) => {
        if (ev.target === back) back.remove();
      } },
      h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-label": "검증 결과" },
        h("h3", { class: "rb-h3" }, iss.length ? `검증 결과 (${iss.length})` : "문제 없어요"),
        h("div", { class: "rb-issues rb-scroll", style: "max-height:50vh" }, iss.map((x) => h("button", { type: "button", class: ["rb-issue", x.level], onClick: () => {
          back.remove();
          es.tab = x.tab;
          if (x.index !== void 0) {
            es.sel[x.tab] = x.index;
            es.q[x.tab] = "";
          }
          render();
        } }, icon("alert", 14), h("span", null, x.msg)))),
        h("div", { class: "btns" }, btn("닫기", { onClick: () => back.remove() }))
      )
    );
    ctx.win.appendChild(back);
  }
  function cbsPanel() {
    const target = es.lastField;
    const back = h("div", { class: "rb-modal", onMousedown: (ev) => {
      if (ev.target === back) back.remove();
    } });
    const box = h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-label": "CBS 사전", style: "max-width:560px" },
      h("h3", { class: "rb-h3" }, "CBS 사전"),
      h("p", { class: "rb-muted" }, target ? "누르면 마지막으로 고치던 칸의 커서 자리에 넣어요." : "누르면 복사해요."),
      h("div", { class: "rb-cbs" }, CBS.map(([group, items]) => [h("span", { class: "rb-label", style: "margin-top:8px" }, group), items.map(([code, desc]) => h("button", { type: "button", onClick: () => {
        if (target && target.isConnected) {
          target.focus();
          target.setRangeText(code, target.selectionStart ?? target.value.length, target.selectionEnd ?? target.value.length, "end");
          target.dispatchEvent(new Event("input"));
        } else navigator.clipboard?.writeText(code).catch(() => {
        });
        back.remove();
      } }, h("code", null, code), h("span", null, desc)))])),
      h("div", { class: "btns" }, btn("닫기", { onClick: () => back.remove() }))
    );
    back.appendChild(box);
    ctx.win.appendChild(back);
  }
  async function apply() {
    if (!dirty()) return;
    const iss = cfg.validate(draft);
    const errs = iss.filter((x) => x.level === "err");
    const lines = diffSummary(original, draft, { infoLabels: cfg.infoLabels, infoTitle: cfg.infoTitle });
    const ok = await confirmDialog(ctx.win, { title: "바뀐 내용을 저장할까요?", body: [...lines, "", errs.length ? `⚠ 오류 ${errs.length}개가 있어요. 그대로 저장할 수도 있어요.` : "", '저장하기 전 상태는 백업해서 "기록" 탭에서 되돌릴 수 있어요.'].filter((x, i, a) => x || i && a[i - 1]).join("\n"), ok: "저장" });
    if (!ok) return;
    applyBtn.disabled = true;
    try {
      await cfg.save(draft, original);
      Object.assign(original, structuredClone(draft));
      for (const k of Object.keys(original)) if (!(k in draft)) delete original[k];
      ctx.toast("저장했어요");
      paintHead();
    } catch (err) {
      ctx.toast(`저장하지 못했어요: ${err?.message ?? err}`, { error: true });
      applyBtn.disabled = false;
    }
  }
  async function close() {
    if (dirty() && !await confirmDialog(ctx.win, { title: "저장하지 않은 변경이 있어요", body: "닫으면 바뀐 내용이 사라져요.", ok: "버리고 닫기", danger: true })) return;
    panel.remove();
  }
  render();
  panel.querySelector(".rb-tabs button[aria-selected=true]")?.focus();
  return { panel, close, get draft() {
    return draft;
  }, apply };
}
