import { FOLDER_COLORS, FOLDER_COLOR_CSS, FOLDER_COLOR_KO, colorFolder, createFolder2, deleteFolder2, folderOf, layout, moveChar, moveFolder, renameFolder2, setMembers } from '../../data/charorder.js';
import { newId } from '../../engine/util.js';
import { characterAssetKeys } from '../../engine/character.js';
import { createStore } from '../../engine/store.js';
import { Busy, isGenerating } from '../../engine/safety.js';
import { loadCharacters } from '../../data/modules.js';
import { fmtWhen, h, replace, vanish } from '../dom.js';
import { icon } from '../icons.js';
import { emptyState, badge, btn, trayBtn, tray, sortChips, sortLabel, sortShort, sortBy, fmtSize, confirmDialog, loading, folderDialog, folderPickPrefs, iconBtn, note, openMenu, promptDialog } from '../kit.js';
import { createMulti } from '../multiselect.js';
import { dragBadge, gripDrag } from '../sortable.js';
import { openCharAssets, openCharEditor } from './chareditor.js';
import { addProjects, findProject } from './dev.js';
import { isDev, openPatchMaker } from './devtools.js';
import { applyPatchFile, exportMyChanges } from './patchui.js';

var COARSE = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
// 카드 크기: 채팅 기록을 뺀 캐릭터 데이터의 크기 (에셋 파일 자체는 포함하지 않음)
function cardSize(c) {
  try {
    const { chats, ...rest } = c;
    return new TextEncoder().encode(JSON.stringify(rest)).length;
  } catch {
    return 0;
  }
}
function charSummary(c, i) {
  return {
    i,
    chaId: c.chaId,
    name: c.name ?? "",
    type: c.type,
    image: c.image,
    creator: c.creator,
    version: c.characterVersion,
    lore: (c.globalLore ?? []).length,
    assets: characterAssetKeys(c).length,
    chats: (c.chats ?? []).length,
    modules: c.modules ?? [],
    streaming: isGenerating(c),
    desc: (c.creatorNotes || c.desc || "").slice(0, 400),
    size: cardSize(c)
  };
}
/** 봇 하나를 저장한 뒤: 전체를 다시 읽지 않고 그 봇만 목록에 바로 반영한다 */
export function patchSavedChar(ctx, index, saved) {
  const st = ctx.state;
  if (!st.chars || !saved || saved.trashTime) {
    st.charsDirty = true;
  } else {
    const next = charSummary(saved, index);
    const at = st.chars.findIndex((c) => c.chaId === next.chaId);
    if (at >= 0) st.chars[at] = next;
    else st.charsDirty = true;
  }
  if (ctx.state.tab === "characters") ctx.refresh();
}
export async function renderCharacters(ctx) {
  const st = ctx.state;
  // 오래된 목록: 먼저 있는 걸로 그리고, 뒤에서 새로 읽어 바뀌었으면 다시 그린다
  if (st.chars && !st.charsDirty && st.charsBg) {
    st.charsBg = false;
    const sig = (l) => l.map((c) => [c.chaId, c.name, c.chats, c.modules.join(","), c.streaming].join("\u0001")).join("\u0002");
    const before = sig(st.chars);
    const at = st.charsAt;
    setTimeout(async () => {
      try {
        const { lc, db } = await fetchChars(ctx);
        // 그 사이 다른 곳에서 새로 읽었으면 버린다
        if (st.charsAt !== at || st.charsDirty) return;
        applyChars(ctx, db, lc);
        if (ctx.state.tab === "characters" && sig(st.chars) !== before) renderCharacters(ctx);
      } catch {
      }
    }, 0);
  }
  if (!st.chars || st.charsDirty) {
    replace(ctx.main, loading("캐릭터를 불러오는 중", { rows: 7 }));
    const { lc, db } = await fetchChars(ctx);
    applyChars(ctx, db, lc);
  }
  return drawCharacters(ctx);
}
async function fetchChars(ctx) {
  const db = await ctx.api.getDatabase(["characters", "modules", "characterOrder"]);
  const lc = await loadCharacters(ctx.api, db?.characters);
  return { lc, db };
}
function applyChars(ctx, db, lc) {
  const st = ctx.state;
  {
    st.charOrder = Array.isArray(db?.characterOrder) ? db.characterOrder : [];
    db.characters = lc.list;
    st.charsUnloaded = lc.unloaded;
    st.chars = (db?.characters ?? []).map((c, i) => c && !c.trashTime ? charSummary(c, i) : null).filter(Boolean);
    st.charModNames = new Map((db?.modules ?? []).map((m) => [m.id, m.name]));
    st.charsDirty = false;
    st.charsAt = Date.now();
    st.charOrderStale = false;
  }
}
async function drawCharacters(ctx) {
  const st = ctx.state;
  if (st.charOrderStale) {
    st.charOrderStale = false;
    try {
      const o = (await ctx.api.getDatabase(["characterOrder"]))?.characterOrder;
      if (Array.isArray(o)) st.charOrder = o;
    } catch {
    }
  }
  const q = st.search.trim().toLowerCase();
  const filtering = !!q;
  const sort = ctx.prefs.ui?.charSort ?? null;
  st.charSorted = !!sort;
  const srt = (arr, get) => sortBy(arr, sort, (x) => get(x)?.name ?? "", (x) => get(x)?.size ?? 0);
  const list = srt(st.chars, (c) => c).filter((c) => !q || c.name.toLowerCase().includes(q) || String(c.creator ?? "").toLowerCase().includes(q));
  ctx.setNavCount("characters", st.chars.length);
  if (!st.charSel || !st.chars.some((c) => c.chaId === st.charSel)) st.charSel = list[0]?.chaId ?? null;
  const box = h("div", { class: "rb-list rb-scroll", role: "listbox", "aria-label": "캐릭터 목록", style: "padding-top:12px" });
  const lazy = ctx.assets.lazy(box);
  const byId = new Map(st.chars.map((c) => [c.chaId, c]));
  const collapsed = ctx.prefs.meta.charFoldersCollapsed ?? {};
  const mu = multiOf2(ctx);
  if (filtering) mu.clear();
  const rowOf = (c) => {
    const img = c.image ? h("img", { alt: "", dataset: { path: c.image, ext: "png" }, style: "width:40px;height:40px;border-radius:12px;object-fit:cover;background:var(--rb-surf2);flex-shrink:0" }) : h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-surf2);display:flex;align-items:center;justify-content:center;color:var(--rb-mute);flex-shrink:0" }, icon("character", 18));
    const grip = filtering ? null : h("span", { class: "grip", title: "끌어서 순서 바꾸기·폴더에 넣기 · Ctrl/⌘·Shift+클릭으로 여러 개", "aria-hidden": "true" }, icon("grip", 14));
    const mcb = filtering ? null : h("span", { class: "rb-mcb", role: "checkbox", "aria-checked": "false", "aria-label": `${c.name} 고르기` });
    const row2 = h(
      "div",
      {
        class: ["rb-row", st.justMoved?.includes(c.chaId) && "just-moved"],
        role: "option",
        tabindex: "0",
        "aria-selected": st.charSel === c.chaId ? "true" : "false",
        dataset: filtering ? { id: c.chaId } : sort ? { id: c.chaId, pick: c.chaId } : { id: c.chaId, dropRow: c.chaId, pick: c.chaId },
        onClick: (ev) => {
          if (!filtering && mu.click(ev, c.chaId, st.charSel)) return;
          st.charSel = c.chaId;
          box.querySelectorAll(".rb-row").forEach((r) => r.setAttribute("aria-selected", "false"));
          row2.setAttribute("aria-selected", "true");
          detail2(ctx, c);
          if (ctx.isMobile()) ctx.openSheet();
        },
        onKeydown: (ev) => {
          if (ev.target === row2 && (ev.key === "Enter" || ev.key === " ")) {
            ev.preventDefault();
            row2.click();
          }
        }
      },
      mcb,
      grip,
      img,
      h(
        "div",
        { class: "txt" },
        h("div", { class: "ttl" }, h("span", { class: "name" }, c.name || "(이름 없음)"), c.type === "group" && badge("그룹", "mute"), c.streaming && badge("응답 생성 중", "warn")),
        h("span", { class: "meta" }, [c.creator && `제작자 ${c.creator}`, `로어 ${c.lore}`, `에셋 ${c.assets}`, `채팅 ${c.chats}`, sort?.key === "size" && fmtSize(c.size)].filter(Boolean).join(" · "))
      ),
      iconBtn("more", `${c.name} 메뉴`, { onClick: (ev) => {
        ev.stopPropagation();
        charMenu(ctx, c, ev.currentTarget);
      } })
    );
    if (grip) gripDrag({
      grip,
      row: row2,
      root: box,
      scroller: box,
      count: () => mu.dragIds(c.chaId).length,
      skip: (t) => mu.dragIds(c.chaId).includes(t.getAttribute("data-drop-row")),
      onDrop: (d) => {
        const ids = mu.dragIds(c.chaId);
        st.justMoved = ids;
        return saveOrder(ctx, (o) => moveChar(o, ids, d), ids.length > 1 ? `봇 ${ids.length}개를 옮겼어요` : null);
      }
    });
    if (img.tagName === "IMG") lazy.observe(img);
    return row2;
  };
  if (filtering) {
    for (const c of list.slice(0, 600)) box.appendChild(rowOf(c));
  } else {
    let shown = 0;
    const items = layout(st.charOrder, st.chars.map((c) => ({ chaId: c.chaId })));
    if (sort) {
      // 폴더 안은 폴더 안끼리, 폴더 밖은 밖끼리. 폴더 자리는 그대로 두고 봇 자리만 다시 채운다
      const get = (id) => byId.get(id);
      for (const it of items) if (it.type === "folder") it.ids = srt(it.ids, get);
      const top = srt(items.filter((x) => x.type === "char").map((x) => x.id), get);
      let k = 0;
      for (const it of items) if (it.type === "char") it.id = top[k++];
    }
    const hasFolders = items.some((x) => x.type === "folder");
    for (const it of items) {
      if (shown > 600) break;
      if (it.type === "char") {
        const c = byId.get(it.id);
        if (c) {
          box.appendChild(rowOf(c));
          shown++;
        }
        continue;
      }
      const f = it.folder, open = !collapsed[f.id];
      const color = FOLDER_COLOR_CSS[f.color] ?? "var(--rb-sub)";
      const head = h(
        "div",
        { style: "display:flex;align-items:center;gap:4px", dataset: { dropFolder: f.id } },
        h(
          "button",
          { type: "button", class: "rb-folder", "aria-expanded": open ? "true" : "false", onClick: () => {
            ctx.svc.meta((m) => {
              m.charFoldersCollapsed ??= {};
              if (open) m.charFoldersCollapsed[f.id] = true;
              else delete m.charFoldersCollapsed[f.id];
            }).catch(() => {
            });
            if (!open) st.justOpened = f.id;
            renderCharacters(ctx);
          } },
          h("span", { class: "chev" }, icon("chevron", 14)),
          h("span", { style: { color, display: "flex" } }, icon("folder", 16)),
          h("b", null, f.name || "(이름 없는 폴더)"),
          h("small", null, String(it.ids.length))
        ),
        iconBtn("more", `${f.name} 폴더 메뉴`, { onClick: (e) => charFolderMenu(ctx, f, e.currentTarget) })
      );
      box.appendChild(head);
      if (open) {
        const body = h("div", { class: ["rb-folder-body", st.justOpened === f.id && "just-opened"] });
        for (const id of it.ids) {
          const c = byId.get(id);
          if (c) {
            body.appendChild(rowOf(c));
            shown++;
          }
        }
        if (!it.ids.length) body.appendChild(h("div", { class: "rb-muted", style: "padding:8px 10px" }, "봇을 여기로 끌어다 놓으세요"));
        box.appendChild(body);
      }
    }
    if (hasFolders) {
      const outside = h("div", { class: "rb-label", style: "padding:14px 12px 6px;border-radius:10px", dataset: { dropFolder: "" } }, "여기에 놓으면 폴더 밖으로");
      box.appendChild(outside);
    }
  }
  if (!list.length) box.appendChild(st.chars.length ? h("div", { class: "rb-empty" }, "찾는 캐릭터가 없어요.") : emptyState({ icon: "character", title: "아직 캐릭터가 없어요", text: "캐릭터 파일을 가져오면 폴더로 정리하고 에셋·로어북을 다듬을 수 있어요.", actions: [{ label: "파일 가져오기", icon: "upload", onClick: () => ctx.legacy.open() }] }));
  const keep = ctx.main.querySelector(".rb-list")?.scrollTop ?? 0;
  const bar = h("div", { class: "rb-pickbar", role: "toolbar", "aria-label": "고른 봇" });
  const openTray = () => {
    st.charTray = !st.charTray;
    renderCharacters(ctx);
  };
  const sortTray = st.charTray ? tray(
    ...sortChips(sort, (next) => {
      ctx.prefs.saveUi({ charSort: next }).catch(() => {
      });
      renderCharacters(ctx);
    }),
    h("span", { class: "rb-muted", style: "font-size:12px;white-space:nowrap" }, sort ? "폴더마다 따로 정렬해요 · 끌어서 순서 바꾸기는 원래대로에서" : "끌어서 정한 순서예요")
  ) : null;
  replace(ctx.main, h(
    "div",
    { class: "rb-chips" },
    trayBtn("정렬", { icon: "preset", value: sortShort(sort), title: sortLabel(sort), open: !!st.charTray, active: !!sort, onClick: openTray }),
    h("span", { class: "rb-muted", style: "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto" }, `캐릭터 ${st.chars.length}명${list.length > 600 ? " · 앞쪽 600명만 표시 (검색으로 좁혀 보세요)" : ""}${st.charsUnloaded ? ` · 앱이 아직 불러오는 중인 봇 ${st.charsUnloaded}명은 빠져 있어요` : ""}`),
    st.charsUnloaded ? btn("새로 고침", { size: "sm", icon: "refresh", onClick: () => {
      st.charsDirty = true;
      renderCharacters(ctx);
    } }) : null,
    h("div", { class: "rb-spacer" }),
    filtering ? null : btn(mu.active ? "선택 끝" : "선택", { size: "sm", icon: "check", id: "rb-pick-toggle", onClick: () => mu.setMode(!mu.active) }),
    btn("폴더", { size: "sm", icon: "folderPlus", onClick: () => newCharFolder(ctx) }),
    btn("업데이트·새로 넣기", { size: "sm", kind: "primary", icon: "upload", onClick: () => ctx.legacy.open() })
  ), sortTray, bar, box);
  box.scrollTop = keep;
  st.justOpened = null;
  st.justMoved = null;
  mu.bar = bar;
  mu.attach(box);
  paintBar2(ctx);
  const sel = st.chars.find((c) => c.chaId === st.charSel);
  if (sel) detail2(ctx, sel);
  else ctx.showDetail(h("div", { class: "rb-empty" }, "캐릭터를 고르면 여기에 자세히 보여요."));
}
var orderQ = Promise.resolve();
function saveOrder(ctx, fn, done) {
  const st = ctx.state;
  const next = fn(st.charOrder ?? []);
  st.charOrder = next;
  renderCharacters(ctx);
  if (done) ctx.toast(done);
  const p = orderQ.then(async () => {
    const fresh = (await ctx.api.getDatabase(["characterOrder"]))?.characterOrder;
    const out = Array.isArray(fresh) ? fn(fresh) : st.charOrder;
    await ctx.api.setDatabaseLite({ characterOrder: out });
    if (JSON.stringify(out) !== JSON.stringify(st.charOrder)) {
      st.charOrder = out;
      if (st.tab === "characters") renderCharacters(ctx);
    }
  }).catch(async (e) => {
    ctx.toast(`순서를 저장하지 못했어요: ${e?.message ?? e}`, { error: true });
    try {
      const cur = (await ctx.api.getDatabase(["characterOrder"]))?.characterOrder;
      if (Array.isArray(cur)) {
        st.charOrder = cur;
        renderCharacters(ctx);
      }
    } catch {
    }
  });
  orderQ = p;
  return p;
}
function multiOf2(ctx) {
  ctx.state.charMulti ??= createMulti({ onChange: () => paintBar2(ctx) });
  return ctx.state.charMulti;
}
function paintBar2(ctx) {
  const mu = multiOf2(ctx), bar = mu.bar;
  if (!bar) return;
  const tb = ctx.main.querySelector("#rb-pick-toggle");
  if (tb) tb.lastChild.textContent = mu.active ? "선택 끝" : "선택";
  bar.hidden = !mu.active;
  if (!mu.active) {
    bar.replaceChildren();
    return;
  }
  const n = mu.sel.size;
  const visible = () => [...ctx.main.querySelectorAll(".rb-list [data-pick]")].map((r) => r.dataset.pick);
  bar.replaceChildren(
    h("b", null, n ? `${n}개 고름` : "고를 봇을 누르세요"),
    btn("폴더로", { size: "sm", icon: "folder", disabled: !n, onClick: (ev) => {
      const ids = mu.ordered();
      const folders = (ctx.state.charOrder ?? []).filter((x) => x && typeof x === "object" && Array.isArray(x.data));
      openMenu(ctx.win, ev.currentTarget, [
        ...folders.map((f) => ({ label: f.name || "(이름 없는 폴더)", icon: "folder", onClick: () => saveOrder(ctx, (o) => moveChar(o, ids, { folderId: f.id }), `봇 ${ids.length}개를 '${f.name}'(으)로 옮겼어요`) })),
        folders.length ? "sep" : null,
        { label: "새 폴더…", icon: "folderPlus", onClick: async () => {
          const name = await promptDialog(ctx.win, { title: "새 봇 폴더", label: `고른 봇 ${ids.length}개를 넣어요`, placeholder: "폴더 이름" });
          if (name?.trim()) saveOrder(ctx, (o) => createFolder2(o, { id: "df_" + newId().slice(0, 10), name: name.trim(), ids }), `'${name.trim()}' 폴더를 만들었어요 (봇 ${ids.length}개)`);
        } }
      ].filter(Boolean));
    } }),
    btn("폴더 밖으로", { size: "sm", disabled: !n, onClick: () => {
      const ids = mu.ordered();
      saveOrder(ctx, (o) => moveChar(o, ids, { folderId: null }));
    } }),
    btn("보이는 것 모두", { size: "sm", onClick: () => {
      const v = visible();
      mu.set(v.every((id) => mu.has(id)) ? [] : v);
    } }),
    iconBtn("x", "고르기 끝내기", { onClick: () => mu.clear() })
  );
}
function charItems(ctx) {
  return ctx.state.chars.map((c) => {
    const f = folderOf(ctx.state.charOrder, c.chaId);
    return { id: c.chaId, label: c.name, folder: f?.id ?? null, sub: [f ? `지금: ${f.name}` : "폴더 없음", c.creator && `제작자 ${c.creator}`].filter(Boolean).join(" · ") };
  });
}
async function newCharFolder(ctx) {
  const r = await folderDialog(ctx.win, { title: "새 봇 폴더", items: charItems(ctx), noun: "봇", ...folderPickPrefs(ctx) });
  if (!r) return;
  await saveOrder(ctx, (o) => createFolder2(o, { id: "df_" + newId().slice(0, 10), name: r.name, ids: r.ids }), `'${r.name}' 폴더를 만들었어요${r.ids.length ? ` (봇 ${r.ids.length}개)` : ""}. RisuAI 사이드바에도 같은 폴더가 생겨요.`);
}
function charFolderMenu(ctx, f, anchor) {
  openMenu(ctx.win, anchor, [
    { label: "넣을 봇 고르기…", icon: "plus", onClick: async () => {
      const r = await folderDialog(ctx.win, { title: `'${f.name}' 폴더에 넣을 봇`, items: charItems(ctx), checked: [...f.data], ok: "저장", withName: false, noun: "봇", current: f.id, ...folderPickPrefs(ctx) });
      if (r) await saveOrder(ctx, (o) => setMembers(o, f.id, r.ids));
    } },
    { label: "이름 바꾸기", icon: "edit", onClick: async () => {
      const n = await promptDialog(ctx.win, { title: "폴더 이름", value: f.name });
      if (n?.trim()) await saveOrder(ctx, (o) => renameFolder2(o, f.id, n.trim()));
    } },
    { label: "폴더 색", icon: "palette", onClick: async () => {
      const c = await new Promise((res) => openMenu(ctx.win, anchor, FOLDER_COLORS.map((k) => ({ label: FOLDER_COLOR_KO[k], icon: "folder", onClick: () => res(k) }))));
      if (c) await saveOrder(ctx, (o) => colorFolder(o, f.id, c));
    } },
    { label: "위로", icon: "up", onClick: () => saveOrder(ctx, (o) => moveFolder(o, f.id, -1)) },
    { label: "아래로", icon: "down", onClick: () => saveOrder(ctx, (o) => moveFolder(o, f.id, 1)) },
    "sep",
    { label: "폴더 삭제 (봇은 남음)", icon: "trash", danger: true, onClick: async () => {
      if (await confirmDialog(ctx.win, { title: `'${f.name}' 폴더를 지울까요?`, body: "안에 있던 봇은 폴더 밖으로 나와요. 봇은 지워지지 않아요.", ok: "폴더 삭제", danger: true })) await saveOrder(ctx, (o) => deleteFolder2(o, f.id));
    } }
  ]);
}
function detail2(ctx, c) {
  const st = ctx.state;
  const stat = (label, v) => h("div", { class: "rb-stat" }, h("small", null, label), h("b", null, String(v)));
  const timeline = h("div", { style: "display:flex;flex-direction:column;gap:8px" });
  const full = async () => {
    const cur = await ctx.api.getCharacterFromIndex(c.i);
    if (!cur || cur.chaId !== c.chaId) throw new Error("캐릭터를 다시 찾지 못했어요. 목록을 새로 고쳐 주세요.");
    return cur;
  };
  ctx.showDetail(
    h(
      "div",
      { style: "display:flex;flex-direction:column;gap:6px" },
      c.creator ? h("span", { style: "font-size:12px;color:var(--rb-acc-text)" }, c.creator + (c.version ? ` · ${c.version}` : "")) : null,
      h("h2", { class: "rb-h2" }, c.name || "(이름 없음)"),
      c.desc ? h("p", { class: "rb-p", style: "white-space:pre-line;max-height:120px;overflow:auto" }, c.desc) : null,
      c.streaming ? note("warn", "지금 응답을 생성하는 중이에요. 끝난 뒤에 업데이트할 수 있어요.") : null
    ),
    h("div", { class: "rb-stats" }, stat("로어북", c.lore), stat("에셋", c.assets), stat("채팅", c.chats), stat("연결 모듈", c.modules.length)),
    h(
      "div",
      { class: "rb-field" },
      h("span", { class: "rb-label" }, "연결된 모듈"),
      h("div", { class: "rb-card" }, c.modules.length ? c.modules.map((id) => h(
        "div",
        { class: "rb-kv" },
        h("span", null, st.charModNames.get(id) ?? "(꺼졌거나 없는 모듈)"),
        h("a", { href: "#", style: "font-size:12px;color:var(--rb-acc-text)", onClick: (ev) => {
          ev.preventDefault();
          st.modSel = id;
          ctx.go("modules");
        } }, "열기")
      )) : h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "연결된 모듈이 없어요")))
    ),
    h("div", { class: "rb-field" }, h(
      "div",
      { style: "display:flex;align-items:center" },
      h("span", { class: "rb-label", style: "flex:1" }, "버전 타임라인"),
      h("a", { href: "#", style: "font-size:12px;color:var(--rb-acc-text)", onClick: (ev) => {
        ev.preventDefault();
        st.histTarget = c.chaId;
        ctx.go("history");
      } }, "전체 보기")
    ), timeline),
    h("div", { style: "flex:1" }),
    h(
      "div",
      { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("편집", { kind: "primary", size: "lg", icon: "edit", onClick: () => openCharEditor(ctx, c.i, c.chaId).catch((e) => ctx.toast(e?.message ?? String(e), { error: true })) }),
      btn("에셋", { size: "lg", icon: "image", onClick: () => openCharAssets(ctx, c.i, c.chaId).catch((e) => ctx.toast(e?.message ?? String(e), { error: true })) }),
      btn("삭제", { kind: "danger", size: "lg", icon: "trash", onClick: () => removeCharacter(ctx, c) })
    ),
    h(
      "div",
      { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("업데이트 가져오기", { size: "lg", icon: "upload", onClick: () => ctx.legacy.open() }),
      isDev(ctx) ? btn(findProject(ctx, "character", c.chaId) ? "개발 탭에서 보기" : "개발 목록에 넣기", { size: "lg", icon: "code", onClick: async () => {
        await addProjects(ctx, [{ kind: "character", id: c.chaId }]);
        ctx.state.devSel = `c:${c.chaId}`;
        ctx.go("dev");
      } }) : null,
      isDev(ctx) ? btn("패치 만들기", { size: "lg", icon: "code", onClick: () => openPatchMaker(ctx, { kind: "character", key: `c:${c.chaId}`, i: c.i, chaId: c.chaId, name: c.name }) }) : btn("내 수정 내보내기", { size: "lg", icon: "download", onClick: async () => {
        try {
          await exportMyChanges(ctx, "character", await full());
        } catch (e) {
          ctx.toast(e.message, { error: true });
        }
      } }),
      btn("패치 적용", { size: "lg", icon: "refresh", onClick: () => applyPatchFile(ctx, "character", full, async (res) => {
        const last2 = await full();
        if (isGenerating(last2)) throw new Busy();
        await ctx.api.setCharacterToIndex(c.i, res);
        st.charsDirty = true;
        renderCharacters(ctx);
      }) })
    )
  );
  (async () => {
    const list = (await createStore(ctx.api).listBackups()).filter((b) => b.target === c.chaId).slice(0, 3);
    replace(timeline, list.length ? list.map((b) => h("div", { class: "rb-card pad", style: "padding:10px 14px" }, h("div", { style: "display:flex;gap:8px" }, h("b", { style: "font-size:13px" }, b.note || "업데이트 전"), h("span", { class: "rb-muted" }, fmtWhen(b.t))), b.summary ? h("div", { class: "rb-muted" }, b.summary) : null)) : h("div", { class: "rb-muted", style: "padding:12px 14px;border-radius:12px;border:1px dashed var(--rb-line)" }, "아직 기록이 없어요."));
  })().catch(() => {
  });
}

// 행 아무 곳이나 잡고 끌기 (마우스). 터치는 손잡이(gripDrag)로.
var charDragIds = null;
function charDragSource(ctx, el, id) {
  el.addEventListener("dragstart", (ev) => {
    charDragIds = multiOf2(ctx).dragIds(id);
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/x-rbm-char", charDragIds.join("\n"));
    if (charDragIds.length > 1) {
      const g = el.cloneNode(true);
      Object.assign(g.style, { position: "absolute", top: "-1000px", left: "0", width: `${el.offsetWidth}px`, background: "var(--rb-surf2)", borderRadius: "12px" });
      g.appendChild(dragBadge(el.ownerDocument, charDragIds.length));
      ctx.win.appendChild(g);
      ev.dataTransfer.setDragImage(g, 24, 20);
      setTimeout(() => g.remove(), 0);
      ctx.main.querySelectorAll(".rb-row.picked").forEach((r) => {
        r.style.opacity = "0.5";
      });
    }
    el.style.opacity = "0.5";
  });
  el.addEventListener("dragend", () => {
    charDragIds = null;
    ctx.main.querySelectorAll(".rb-row").forEach((r) => {
      r.style.opacity = "";
    });
    ctx.main.querySelectorAll("[data-drop]").forEach((x) => {
      x.removeAttribute("data-drop");
      x.style.boxShadow = "";
    });
  });
}
function charDropTarget(ctx, el, { beforeId, folderId }) {
  const ok = (ev) => charDragIds && [...ev.dataTransfer?.types ?? []].includes("text/x-rbm-char") && !(beforeId && charDragIds.includes(beforeId));
  el.addEventListener("dragover", (ev) => {
    if (!ok(ev)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const after = beforeId && ev.offsetY > el.clientHeight / 2;
    const d = after ? "after" : "before";
    if (el.dataset.drop === d) return;
    el.dataset.drop = d;
    el.style.boxShadow = beforeId ? after ? "inset 0 -2px 0 var(--rb-acc-text)" : "inset 0 2px 0 var(--rb-acc-text)" : "inset 0 0 0 2px var(--rb-sel-ring)";
  });
  el.addEventListener("dragleave", (ev) => {
    if (el.contains(ev.relatedTarget)) return;
    el.style.boxShadow = "";
    el.removeAttribute("data-drop");
  });
  el.addEventListener("drop", (ev) => {
    if (!ok(ev)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const ids = charDragIds, after = el.dataset.drop === "after";
    el.style.boxShadow = "";
    el.removeAttribute("data-drop");
    if (!ids?.length) return;
    const d = beforeId ? { beforeId, after, folderId: void 0 } : { beforeId: null, after: false, folderId: folderId || null };
    ctx.state.justMoved = ids;
    saveOrder(ctx, (o) => moveChar(o, ids, d), ids.length > 1 ? `봇 ${ids.length}개를 옮겼어요` : null);
  });
}
async function fullChar(ctx, c) {
  const cur = await ctx.api.getCharacterFromIndex(c.i);
  if (!cur || cur.chaId !== c.chaId) throw new Error("캐릭터를 다시 찾지 못했어요. 목록을 새로 고쳐 주세요.");
  return cur;
}
function charMenu(ctx, c, anchor) {
  const err = (e) => ctx.toast(e?.message ?? String(e), { error: true });
  const folders = (ctx.state.charOrder ?? []).filter((x) => x && typeof x === "object" && Array.isArray(x.data));
  const cur = folderOf(ctx.state.charOrder, c.chaId);
  openMenu(ctx.win, anchor, [
    { label: "편집", icon: "edit", onClick: () => openCharEditor(ctx, c.i, c.chaId).catch(err) },
    { label: "에셋 관리", icon: "image", onClick: () => openCharAssets(ctx, c.i, c.chaId).catch(err) },
    "sep",
    { label: "폴더로 옮기기", icon: "folder", onClick: () => openMenu(ctx.win, anchor, [
      ...folders.map((f) => ({ label: (cur?.id === f.id ? "✓ " : "") + (f.name || "(이름 없는 폴더)"), icon: "folder", onClick: () => saveOrder(ctx, (o) => moveChar(o, [c.chaId], { folderId: f.id })) })),
      folders.length ? "sep" : null,
      cur ? { label: "폴더에서 빼기", icon: "x", onClick: () => saveOrder(ctx, (o) => moveChar(o, [c.chaId], { folderId: null })) } : null,
      { label: "새 폴더…", icon: "folderPlus", onClick: async () => {
        const name = await promptDialog(ctx.win, { title: "새 봇 폴더", label: "폴더 이름" });
        if (name?.trim()) saveOrder(ctx, (o) => createFolder2(o, { id: "df_" + newId().slice(0, 10), name: name.trim(), ids: [c.chaId] }));
      } }
    ].filter(Boolean)) },
    { label: "업데이트 가져오기", icon: "upload", onClick: () => ctx.legacy.open() },
    { label: "다른 봇에서 가져오기·합치기", icon: "link", onClick: () => ctx.legacy.openMerge(c.chaId) },
    isDev(ctx) ? { label: "패치 만들기 (개발자)", icon: "code", onClick: () => openPatchMaker(ctx, { kind: "character", key: `c:${c.chaId}`, i: c.i, chaId: c.chaId, name: c.name }) } : { label: "내 수정만 내보내기 (.rbupatch)", icon: "download", onClick: async () => {
      try {
        await exportMyChanges(ctx, "character", await fullChar(ctx, c));
      } catch (e) {
        err(e);
      }
    } },
    { label: "패치 적용…", icon: "refresh", onClick: () => applyPatchFile(ctx, "character", () => fullChar(ctx, c), async (res) => {
      if (isGenerating(await fullChar(ctx, c))) throw new Busy();
      await ctx.api.setCharacterToIndex(c.i, res);
      ctx.state.charsDirty = true;
      renderCharacters(ctx);
    }) },
    { label: "기록 보기", icon: "refresh", onClick: () => {
      ctx.state.histTarget = c.chaId;
      ctx.go("history");
    } },
    "sep",
    { label: "삭제", icon: "trash", danger: true, onClick: () => removeCharacter(ctx, c) }
  ]);
}
// RisuAI와 같은 방식으로 휴지통에 넣는다 (trashTime). 휴지통에서 3일 안에 되살릴 수 있다.
async function removeCharacter(ctx, c) {
  try {
    if (await ctx.api.getCurrentCharacterIndex() === c.i) {
      ctx.toast("지금 열려 있는 봇은 지울 수 없어요. 다른 봇을 연 뒤 지워 주세요.", { error: true });
      return;
    }
    const cur = await fullChar(ctx, c);
    if (isGenerating(cur)) throw new Busy();
    const ok = await confirmDialog(ctx.win, { title: `'${c.name}'을(를) 지울까요?`, body: `RisuAI 휴지통으로 옮겨요. 채팅 ${c.chats}개도 함께 옮겨지고, 휴지통에서 3일 안에 되살릴 수 있어요.`, ok: "삭제", danger: true });
    if (!ok) return;
    const again = await fullChar(ctx, c);
    if (isGenerating(again)) throw new Busy();
    await vanish(ctx.main.querySelector(`.rb-row[data-id="${CSS.escape(c.chaId)}"]`));
    await ctx.api.setCharacterToIndex(c.i, { ...again, trashTime: Date.now() });
    if (ctx.state.charMulti?.has?.(c.chaId)) ctx.state.charMulti.set([...ctx.state.charMulti.sel].filter((x) => x !== c.chaId));
    ctx.state.charsDirty = true;
    await renderCharacters(ctx);
    ctx.toast(`'${c.name}'을(를) 휴지통으로 옮겼어요`);
  } catch (e) {
    ctx.toast(e instanceof Busy ? "응답을 생성하는 중이라 지금은 지울 수 없어요." : `지우지 못했어요: ${e?.message ?? e}`, { error: true });
  }
}
