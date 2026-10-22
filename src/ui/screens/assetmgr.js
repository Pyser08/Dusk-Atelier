import { isImageExt, mimeOf } from '../assets.js';
import { childFolders, createFolder, deleteFolder, folderPath, foldersOf, inFolder, isEmpty, leaf, renameFolder, renameMapping, setAssetFolder } from '../../data/assetfolders.js';
import { canEncode, convertImage, formatOf, imageSize, readMetadata, stripMetadata } from '../../engine/image.js';
import { createStore } from '../../engine/store.js';
import { safeFileName } from '../../engine/export.js';
import { createZip } from '../../engine/zipwrite.js';
import { copyText, download, fmtBytes, h, pickFiles, replace } from '../dom.js';
import { icon } from '../icons.js';
import { btn, confirmDialog, iconBtn, note, openMenu, progressBar, promptDialog, segmented } from '../kit.js';
import { reload } from './modules.js';

var PAGE = 240;
var extOf = (name) => {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "png";
};
var stemOf = (name) => name.replace(/\.[a-z0-9]+$/i, "");
var COARSE = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
// 에셋 이름 끝의 파일 확장자. 아는 확장자만 떼서 "kami.happy"의 ".happy"를 확장자로 오해하지 않는다.
var MEDIA_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|svg|ico|mp3|ogg|wav|flac|m4a|aac|opus|mp4|webm|mov|m4v)$/i;
export var stripMediaExt = (name) => String(name ?? "").replace(MEDIA_EXT, "");
// 캐릭터 이름: 확장자를 뗀 뒤 첫 '.'이나 '_' 앞부분 (kami.happy.webp, kami_happy.webp, kami_happy → kami). 없으면 null
export function charOfAsset(name) {
  const m = /^\s*([^._]+?)\s*[._]/.exec(stripMediaExt(name));
  return m && m[1] ? m[1] : null;
}
// 목록 보기용 묶음: 같은 캐릭터 이름(대소문자 무시)끼리. 하나뿐인 이름과 구분자가 없는 것은 "기타"로
export function groupAssetsByChar(list) {
  const groups = new Map();
  for (const a of list) {
    const c = charOfAsset(a[0]);
    const key = c ? c.toLowerCase() : "";
    if (!groups.has(key)) groups.set(key, { key, label: c ?? "기타", items: [] });
    groups.get(key).items.push(a);
  }
  const etc = groups.get("") ?? { key: "", label: "기타", items: [] };
  groups.delete("");
  const out = [];
  for (const g of groups.values()) {
    if (g.items.length < 2) etc.items.push(...g.items);
    else out.push(g);
  }
  out.sort((x, y) => x.label.localeCompare(y.label, "ko"));
  if (etc.items.length) out.push(etc);
  for (const g of out) g.subs = g.key ? outfitGroups(g.items) : null;
  return out;
}
// 의상: 세 부분 이상인 이름의 두 번째 부분 (kami_casual_happy → casual). 두 부분뿐이면 의상 없음(기본)
export function outfitOfAsset(name) {
  const parts = stripMediaExt(name).split(/[._]/).map((x) => x.trim()).filter(Boolean);
  return parts.length >= 3 ? parts[1] : null;
}
// 캐릭터 안의 의상 묶음. 2장 이상인 의상만 따로, 나머지는 "기본". 나눌 의상이 없으면 null
function outfitGroups(items) {
  const m = new Map();
  for (const a of items) {
    const o = outfitOfAsset(a[0]);
    const key = o ? o.toLowerCase() : "";
    if (!m.has(key)) m.set(key, { key, label: o ?? "기본", items: [] });
    m.get(key).items.push(a);
  }
  const base = m.get("") ?? { key: "", label: "기본", items: [] };
  m.delete("");
  const subs = [];
  for (const g of m.values()) {
    if (g.items.length < 2) base.items.push(...g.items);
    else subs.push(g);
  }
  if (!subs.length) return null;
  subs.sort((x, y) => x.label.localeCompare(y.label, "ko"));
  if (base.items.length) subs.unshift(base);
  return subs;
}
export async function openAssets(ctx, id) {
  const data = await ctx.svc.load({ fresh: true });
  const entry2 = data.entries.find((e) => e.module.id === id);
  if (!entry2) {
    ctx.toast("모듈을 찾지 못했어요", { error: true });
    return;
  }
  let mod = structuredClone(entry2.module), backedUp = false;
  return openAssetsCore(ctx, {
    name: mod.name,
    label: "에셋 관리",
    assets: (mod.assets ?? []).map((a) => [String(a[0] ?? ""), String(a[1] ?? ""), String(a[2] ?? "")]),
    folders: foldersOf(ctx.prefs.meta.moduleAssetFolders?.[mod.id]),
    async save(nextAssets, nextFd, note2) {
      if (!backedUp) {
        await createStore(ctx.api).addBackup({ kind: "module", target: mod.id, name: mod.name, snapshot: mod, note: "에셋 관리 전", summary: note2 }).catch(() => null);
        backedUp = true;
      }
      if (JSON.stringify(nextAssets) !== JSON.stringify(mod.assets ?? [])) await ctx.svc.run("update", mod.id, { assets: nextAssets });
      await ctx.svc.meta((m) => {
        m.moduleAssetFolders ??= {};
        if (isEmpty(nextFd)) delete m.moduleAssetFolders[mod.id];
        else m.moduleAssetFolders[mod.id] = nextFd;
      });
      mod = { ...mod, assets: nextAssets.map((a) => [...a]) };
      reload(ctx).catch(() => {
      });
    }
  });
}
export async function openAssetsCore(ctx, src) {
  const mod = { name: src.name };
  let assets = src.assets;
  let fd = src.folders;
  const as = { folder: null, q: "", sel: /* @__PURE__ */ new Set(), focus: null, shown: PAGE, busy: false, view: ctx.prefs.ui?.assetView === "list" ? "list" : "grid", closed: /* @__PURE__ */ new Set() };
  const keyOf3 = (a) => a[1] + "\0" + a[0];
  const panel = h("div", { class: "rb-full", role: "dialog", "aria-label": `${mod.name} 에셋` });
  const titleB = h("b", null, mod.name);
  const subT = h("small", null, src.label ?? "에셋 관리");
  const head = h(
    "div",
    { class: "rb-full-head" },
    iconBtn("back", "닫기", { onClick: () => close() }),
    h("div", { class: "ttl" }, subT, titleB),
    btn("이미지 추가", { kind: "primary", icon: "plus", onClick: () => addFiles() })
  );
  const bar = h("div", { class: "rb-side-tools", style: "border-bottom:1px solid var(--rb-line2);padding:10px 16px" });
  const folderBar = h("div", { class: "rb-folders", style: "padding:10px 16px 0" });
  const grid = h("div", { class: "rb-grid" });
  const gridWrap = h("div", { class: "rb-scroll", style: "flex:1;overflow:auto;padding:12px 16px 24px;position:relative" }, grid);
  const info = h("aside", { class: "rb-scroll rb-am-info", style: "width:320px;flex-shrink:0;border-left:1px solid var(--rb-line2);padding:16px;display:flex;flex-direction:column;gap:14px;overflow:auto" });
  const main = h("div", { style: "flex:1;min-width:0;display:flex;flex-direction:column" }, folderBar, bar, gridWrap);
  const bodyEl = h("div", { class: "rb-split" }, main, info);
  panel.append(head, bodyEl);
  ctx.win.appendChild(panel);
  let lazy = ctx.assets.lazy(gridWrap);
  panel.addEventListener("dragover", (ev) => {
    if ([...ev.dataTransfer?.types ?? []].includes("Files")) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  });
  panel.addEventListener("drop", (ev) => {
    if (!ev.dataTransfer?.files?.length) return;
    ev.preventDefault();
    ev.stopPropagation();
    addFiles([...ev.dataTransfer.files]);
  });
  panel.addEventListener("dragenter", (ev) => ev.stopPropagation());
  panel.addEventListener("keydown", (ev) => {
    if (ctx.win.querySelector(".rb-modal, .rb-menu")) return;
    if (ev.key === "Escape") {
      ev.stopPropagation();
      if (ctx.win.querySelector(".rb-lightbox")) return;
      if (as.sel.size) {
        as.sel.clear();
        paint();
      } else close();
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "a" && ev.target.tagName !== "INPUT") {
      ev.preventDefault();
      visible().forEach((a) => as.sel.add(keyOf3(a)));
      paint();
    }
    if (ev.key === "Delete" && as.sel.size && ev.target.tagName !== "INPUT") removeSelected();
  });
  const visible = () => {
    const q = as.q.trim().toLowerCase();
    return assets.filter((a) => inFolder(fd, a[0], as.folder) && (!q || a[0].toLowerCase().includes(q)));
  };
  const selected = () => assets.filter((a) => as.sel.has(keyOf3(a)));
  async function save(nextAssets, nextFd, note2) {
    as.busy = true;
    try {
      await src.save(nextAssets, nextFd, note2);
      assets = nextAssets;
      fd = nextFd;
    } finally {
      as.busy = false;
    }
  }
  const saveFolders = async (nextFd) => {
    await save(assets, nextFd, "에셋 폴더 변경 전");
    paint();
  };
  function paint() {
    paintFolders();
    paintBar3();
    paintGrid();
    paintInfo();
    subT.textContent = `${src.label ?? "에셋 관리"} · ${assets.length}개${as.sel.size ? ` · ${as.sel.size}개 선택` : ""}`;
  }
  function paintFolders() {
    const count = (fid) => assets.filter((a) => inFolder(fd, a[0], fid)).length;
    const chipEl = (label, fid, extra) => h(
      "button",
      { type: "button", class: "rb-chip", "aria-pressed": as.folder === fid ? "true" : "false", dataset: { folder: fid ?? "" }, onClick: () => {
        as.folder = fid;
        as.shown = PAGE;
        paint();
      } },
      extra ?? null,
      label,
      h("small", null, String(count(fid)))
    );
    const cur = as.folder && as.folder !== "uncategorized" ? as.folder : null;
    const crumbs = cur ? folderPath(fd, cur) : [];
    const kids = childFolders(fd, cur);
    const folderChips = kids.map((f) => {
      const c = chipEl(leaf(f.name), f.id, icon("folder", 14));
      dropAssets(c, f.id);
      return c;
    });
    replace(
      folderBar,
      chipEl("전체", null),
      chipEl("미분류", "uncategorized"),
      crumbs.length ? h("span", { class: "rb-muted" }, "›") : null,
      crumbs.slice(0, -1).map((f) => [chipEl(leaf(f.name), f.id, icon("folder", 14)), h("span", { class: "rb-muted" }, "›")]),
      crumbs.length ? chipEl(leaf(crumbs.at(-1).name), crumbs.at(-1).id, icon("folder", 14)) : null,
      folderChips,
      btn("폴더", { size: "sm", kind: "ghost", icon: "folderPlus", onClick: async () => {
        const n = await promptDialog(ctx.win, { title: cur ? `'${leaf(crumbs.at(-1).name)}' 안에 새 폴더` : "새 폴더", label: "폴더 이름" });
        if (!n?.trim()) return;
        try {
          const next = structuredClone(fd);
          createFolder(next, n, cur);
          await saveFolders(next);
        } catch (e) {
          ctx.toast(e.message, { error: true });
        }
      } }),
      cur ? iconBtn("more", "이 폴더 메뉴", { onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
        { label: "이름 바꾸기", icon: "edit", onClick: async () => {
          const f = fd._folders.find((x) => x.id === cur);
          const n = await promptDialog(ctx.win, { title: "폴더 이름", value: leaf(f.name) });
          if (!n?.trim()) return;
          try {
            const next = structuredClone(fd);
            renameFolder(next, cur, n);
            await saveFolders(next);
          } catch (e) {
            ctx.toast(e.message, { error: true });
          }
        } },
        { label: "폴더 삭제 (에셋은 남음)", icon: "trash", danger: true, onClick: async () => {
          if (!await confirmDialog(ctx.win, { title: "이 폴더를 지울까요?", body: '하위 폴더도 함께 지워지고, 안의 에셋은 "미분류"로 가요.', ok: "삭제", danger: true })) return;
          const next = structuredClone(fd);
          deleteFolder(next, cur);
          as.folder = null;
          await saveFolders(next);
        } }
      ]) }) : null
    );
  }
  function paintBar3() {
    const search = h("input", { class: "rb-input", style: "height:36px;flex:1;min-width:140px;max-width:320px", placeholder: "이름으로 찾기", value: as.q, "aria-label": "에셋 찾기" });
    search.addEventListener("input", () => {
      as.q = search.value;
      as.shown = PAGE;
      paintGrid();
    });
    const n = as.sel.size;
    replace(
      bar,
      search,
      btn(n ? "선택 해제" : "모두 선택", { size: "sm", onClick: () => {
        if (n) as.sel.clear();
        else visible().forEach((a) => as.sel.add(keyOf3(a)));
        paint();
      } }),
      btn("이름 복사", { size: "sm", icon: "link", title: n ? "고른 에셋 이름을 한 줄에 하나씩 복사" : "보이는 에셋 이름을 한 줄에 하나씩 복사", onClick: async () => {
        const names = (n ? selected() : visible()).map((a) => a[0]);
        ctx.toast(await copyText(names.join("\n")) ? `이름 ${names.length}개를 복사했어요` : "복사하지 못했어요", { error: false });
      } }),
      btn("확장자 제거", { size: "sm", icon: "edit", title: n ? "고른 에셋 이름에서 .png·.webp 같은 확장자를 뺌" : "보이는 에셋 이름에서 .png·.webp 같은 확장자를 뺌", onClick: () => stripExtNames(n ? selected() : visible()) }),
      btn(as.view === "list" ? "격자로 보기" : "목록으로 보기", { size: "sm", icon: as.view === "list" ? "image" : "preset", onClick: () => {
        as.view = as.view === "list" ? "grid" : "list";
        ctx.prefs.saveUi({ assetView: as.view }).catch(() => {
        });
        as.shown = PAGE;
        paint();
      } }),
      h("div", { class: "rb-spacer" }),
      n ? [
        btn("폴더로", { size: "sm", icon: "folder", onClick: (ev) => moveMenu(ev.currentTarget) }),
        btn("내려받기", { size: "sm", icon: "download", onClick: () => downloadAssets(selected()) }),
        btn("최적화", { size: "sm", icon: "image", onClick: () => optimize(selected()) }),
        btn("일괄 교체", { size: "sm", icon: "refresh", onClick: () => batchReplace(selected()) }),
        iconBtn("more", "더 보기", { onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
          { label: "메타데이터 지우기", icon: "x", onClick: () => stripSelected() },
          { label: "삭제", icon: "trash", danger: true, onClick: () => removeSelected() }
        ]) })
      ] : [
        btn("일괄 교체", { size: "sm", icon: "refresh", onClick: () => batchReplace(visible()) }),
        btn("ZIP 받기", { size: "sm", icon: "download", onClick: () => downloadAssets(visible()) })
      ]
    );
  }
  function paintGrid() {
    lazy.disconnect();
    lazy = ctx.assets.lazy(gridWrap);
    const list = visible();
    grid.classList.toggle("list", as.view === "list");
    if (as.view === "list") {
      // 목록 보기: 에셋 이름의 캐릭터별로 자동 묶음 (에셋 폴더와는 별개, 데이터는 바꾸지 않음)
      let left = as.shown;
      const out = [];
      for (const g of groupAssetsByChar(list)) {
        if (left <= 0) break;
        const open = !as.closed.has(g.key);
        out.push(h(
          "button",
          { type: "button", class: "rb-folder rb-am-group", "aria-expanded": open ? "true" : "false", onClick: () => {
            if (open) as.closed.add(g.key);
            else as.closed.delete(g.key);
            paintGrid();
          } },
          h("span", { class: "chev" }, icon("chevron", 14)),
          h("span", { style: "display:flex;color:var(--rb-sub)" }, icon(g.key ? "character" : "folder", 16)),
          h("b", null, g.label),
          h("small", null, String(g.items.length))
        ));
        if (!open) continue;
        if (!g.subs) {
          const take = g.items.slice(0, left);
          left -= take.length;
          out.push(h("div", { class: "rb-am-group-body" }, take.map((a) => tile2(a))));
          continue;
        }
        const body = h("div", { class: "rb-am-group-body" });
        for (const sg of g.subs) {
          if (left <= 0) break;
          const sk = g.key + "/" + sg.key;
          const sOpen = !as.closed.has(sk);
          body.appendChild(h(
            "button",
            { type: "button", class: "rb-folder rb-am-group sub", "aria-expanded": sOpen ? "true" : "false", onClick: () => {
              if (sOpen) as.closed.add(sk);
              else as.closed.delete(sk);
              paintGrid();
            } },
            h("span", { class: "chev" }, icon("chevron", 14)),
            h("span", { style: "display:flex;color:var(--rb-sub)" }, icon("folder", 15)),
            h("b", null, sg.label),
            h("small", null, String(sg.items.length))
          ));
          if (!sOpen) continue;
          const take = sg.items.slice(0, left);
          left -= take.length;
          body.appendChild(h("div", { class: "rb-am-group-body" }, take.map((a) => tile2(a))));
        }
        out.push(body);
      }
      replace(grid, out);
    } else replace(grid, list.slice(0, as.shown).map((a) => tile2(a)));
    if (!list.length) grid.appendChild(h("div", { class: "rb-empty", style: "grid-column:1/-1" }, assets.length ? "이 폴더에 에셋이 없어요." : '에셋이 없어요. 이미지를 끌어다 놓거나 "이미지 추가"를 누르세요.'));
    if (list.length > as.shown) {
      const more = h("div", { style: "grid-column:1/-1;display:flex;justify-content:center;padding:12px" }, btn(`더 보기 (${list.length - as.shown}개 남음)`, { size: "sm", onClick: () => {
        as.shown += PAGE * 2;
        paintGrid();
      } }));
      grid.appendChild(more);
      if (typeof IntersectionObserver === "function") {
        const io = new IntersectionObserver((es) => {
          if (es.some((e) => e.isIntersecting)) {
            io.disconnect();
            as.shown += PAGE;
            paintGrid();
          }
        }, { root: gridWrap, rootMargin: "600px 0px" });
        io.observe(more);
      }
    }
  }
  let lastClicked = null;
  function tile2(a) {
    const k = keyOf3(a), isSel = as.sel.has(k);
    const img = isImageExt(a[2]) ? h("img", { alt: "", loading: "lazy", decoding: "async", dataset: { path: a[1], ext: a[2] }, draggable: "false" }) : null;
    const el = h(
      "button",
      {
        type: "button",
        class: "rb-tile",
        "aria-selected": isSel ? "true" : "false",
        title: a[0],
        draggable: COARSE ? "false" : "true",
        onClick: (ev) => {
          if (ev.shiftKey && lastClicked) {
            const list = visible();
            const i = list.findIndex((x) => keyOf3(x) === lastClicked), j = list.findIndex((x) => keyOf3(x) === k);
            for (let x = Math.min(i, j); x <= Math.max(i, j); x++) as.sel.add(keyOf3(list[x]));
          } else if (ev.ctrlKey || ev.metaKey || as.sel.size || ev.target.closest?.(".sel")) {
            if (as.sel.has(k)) as.sel.delete(k);
            else as.sel.add(k);
          }
          as.focus = k;
          lastClicked = k;
          paintBar3();
          paintInfo();
          subT.textContent = `${src.label ?? "에셋 관리"} · ${assets.length}개${as.sel.size ? ` · ${as.sel.size}개 선택` : ""}`;
          grid.querySelectorAll(".rb-tile").forEach((t) => t.setAttribute("aria-selected", "false"));
          for (const t of grid.querySelectorAll(".rb-tile")) if (as.sel.has(t.dataset.key) || !as.sel.size && t.dataset.key === as.focus) t.setAttribute("aria-selected", "true");
        },
        onDblclick: () => lightbox(a),
        dataset: { key: k }
      },
      h("span", { class: "sel", "aria-hidden": "true" }, isSel ? icon("check", 14) : null),
      h("span", { class: "img" }, img ?? icon(/^(mp3|ogg|wav)$/i.test(a[2]) ? "info" : "image", 28)),
      h("span", { class: "cap" }, a[0] || "(이름 없음)", h("small", null, (a[2] || "?").toUpperCase()))
    );
    el.addEventListener("dragstart", (ev) => {
      if (!as.sel.has(k)) {
        as.sel.clear();
        as.sel.add(k);
      }
      ev.dataTransfer.setData("text/x-rbm-assets", "1");
      ev.dataTransfer.effectAllowed = "move";
    });
    if (img) lazy.observe(img);
    return el;
  }
  function dropAssets(el, folderId) {
    el.addEventListener("dragover", (ev) => {
      if ([...ev.dataTransfer?.types ?? []].includes("text/x-rbm-assets")) {
        ev.preventDefault();
        el.style.boxShadow = "inset 0 0 0 2px var(--rb-sel-ring)";
      }
    });
    el.addEventListener("dragleave", () => {
      el.style.boxShadow = "";
    });
    el.addEventListener("drop", async (ev) => {
      if (![...ev.dataTransfer?.types ?? []].includes("text/x-rbm-assets")) return;
      ev.preventDefault();
      ev.stopPropagation();
      el.style.boxShadow = "";
      await moveTo(folderId);
    });
  }
  async function moveTo(folderId) {
    const next = structuredClone(fd);
    const names = selected().map((a) => a[0]);
    setAssetFolder(next, names, folderId);
    await save(assets, next, "에셋 이동 전");
    as.sel.clear();
    ctx.toast(`${names.length}개를 옮겼어요`);
    paint();
  }
  function moveMenu(anchor) {
    openMenu(ctx.win, anchor, [
      ...fd._folders.slice().sort((a, b) => a.name.localeCompare(b.name)).map((f) => ({ label: f.name.replace(/\//g, " › "), icon: "folder", onClick: () => moveTo(f.id) })),
      fd._folders.length ? "sep" : null,
      { label: "미분류로", icon: "x", onClick: () => moveTo(null) }
    ].filter(Boolean));
  }
  async function paintInfo() {
    const sel = selected();
    const a = sel.length === 1 ? sel[0] : !sel.length && as.focus ? assets.find((x) => keyOf3(x) === as.focus) : null;
    info.classList.toggle("none", !a && !sel.length);
    if (!a) {
      const total = sel.length ? sel : visible();
      replace(
        info,
        h("h3", { class: "rb-h3" }, sel.length ? `${sel.length}개 선택` : "에셋"),
        h("p", { class: "rb-p" }, sel.length ? "위쪽 도구로 한꺼번에 옮기거나 내려받고, 최적화·교체·삭제할 수 있어요." : "눌러서 고르고, 두 번 누르면 크게 봐요. Ctrl·Shift로 여러 개 고를 수 있어요. 고른 것을 폴더 칩으로 끌어 옮길 수도 있어요."),
        h("div", { class: "rb-stats" }, h("div", { class: "rb-stat" }, h("small", null, "개수"), h("b", null, String(total.length))), h("div", { class: "rb-stat" }, h("small", null, "폴더"), h("b", null, String(fd._folders.length)))),
        note("info", '바꾸면 바로 저장돼요. 바꾸기 전 상태는 "기록" 탭에 백업돼요.')
      );
      return;
    }
    const thumb = h("img", { alt: a[0], class: "rb-am-thumb", style: "width:100%;max-height:260px;object-fit:contain;border-radius:12px;background:var(--rb-surf2)" });
    const metaBox = h("div", { class: "rb-card" }, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "읽는 중…")));
    replace(
      info,
      isImageExt(a[2]) ? h("button", { type: "button", style: "border:0;padding:0;background:none;cursor:zoom-in", "aria-label": "크게 보기", onClick: () => lightbox(a) }, thumb) : null,
      h("div", { style: "display:flex;flex-direction:column;gap:2px" }, h("h3", { class: "rb-h3", style: "word-break:break-all" }, a[0] || "(이름 없음)"), h("span", { class: "rb-muted", style: "word-break:break-all" }, a[1])),
      metaBox,
      h(
        "div",
        { style: "display:flex;gap:6px;flex-wrap:wrap" },
        btn("이름", { size: "sm", icon: "edit", onClick: () => renameAsset(a) }),
        btn("교체", { size: "sm", icon: "refresh", onClick: () => replaceOne(a) }),
        btn("받기", { size: "sm", icon: "download", onClick: () => downloadAssets([a]) }),
        btn("삭제", { size: "sm", kind: "danger", icon: "trash", onClick: () => {
          as.sel = /* @__PURE__ */ new Set([keyOf3(a)]);
          removeSelected();
        } })
      )
    );
    ctx.assets.thumb(a[1], a[2], { prio: 90 }).then((u) => {
      if (u) thumb.src = u;
    }).catch(() => {
    });
    try {
      const bytes = await ctx.assets.read(a[1], { prio: 80 });
      if (!bytes) throw new Error("없음");
      const size = imageSize(bytes), md = readMetadata(bytes);
      replace(
        metaBox,
        h("div", { class: "rb-kv" }, h("span", null, "형식"), h("span", null, formatOf(bytes).toUpperCase())),
        h("div", { class: "rb-kv" }, h("span", null, "크기"), h("span", null, fmtBytes(bytes.length))),
        size ? h("div", { class: "rb-kv" }, h("span", null, "해상도"), h("span", null, `${size.w} × ${size.h}`)) : null,
        h("div", { class: "rb-kv" }, h("span", null, "폴더"), h("span", null, fd._folders.find((f) => f.id === fd._mapping[a[0]])?.name.replace(/\//g, " › ") ?? "미분류")),
        h("div", { class: "rb-kv" }, h("span", null, "메타데이터"), h("span", null, md.length ? `${md.length}개` : "없음")),
        md.length ? h(
          "details",
          { style: "padding:0 14px 12px" },
          h("summary", { class: "rb-muted", style: "cursor:pointer;padding:6px 0" }, "자세히 보기"),
          md.map((m) => h("div", { style: "font-size:12px;padding:6px 0;border-top:1px solid var(--rb-line2)" }, h("b", null, `${m.kind} · ${m.key}`), h("div", { style: "white-space:pre-wrap;word-break:break-all;color:var(--rb-sub);max-height:160px;overflow:auto" }, m.value))),
          btn("메타데이터 지우기", { size: "sm", onClick: () => {
            as.sel = /* @__PURE__ */ new Set([keyOf3(a)]);
            stripSelected();
          } })
        ) : null
      );
    } catch {
      replace(metaBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "서버에서 파일을 읽지 못했어요 (지워졌을 수 있어요)")));
    }
  }
  const uniqueName = (base, taken) => {
    let n = base || "image", i = 2;
    const t = new Set([...taken].map((x) => x.toLowerCase()));
    while (t.has(n.toLowerCase())) n = `${base}_${i++}`;
    return n;
  };
  async function uploadMany(files, onEach) {
    const out = new Array(files.length);
    let next = 0, done = 0;
    const t = ctx.toast(`올리는 중 0/${files.length}`, { seconds: 600 });
    const span = t && ctx.win.querySelector(".rb-toasts .rb-toast:last-child span");
    const worker = async () => {
      while (next < files.length) {
        const i = next++;
        const f = files[i];
        const bytes = f instanceof Uint8Array ? f : new Uint8Array(await f.arrayBuffer());
        const size = bytes.length;
        let path, err;
        for (let attempt = 0; attempt < 3 && !path; attempt++) {
          try {
            path = await ctx.api.saveAsset(bytes.slice());
          } catch (e) {
            err = e;
            await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          }
        }
        if (!path) {
          t.close();
          throw new Error(`올리지 못했어요: ${err?.message ?? err}`);
        }
        out[i] = { path, size };
        done++;
        if (span) span.textContent = `올리는 중 ${done}/${files.length}`;
        onEach?.(i, path);
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, files.length) }, worker));
    t.close();
    return out;
  }
  async function addFiles(files) {
    files ??= await pickFiles({ accept: "image/*,audio/*,video/*", multiple: true });
    if (!files?.length) return;
    try {
      const up = await uploadMany(files);
      const taken = new Set(assets.map((a) => a[0]));
      const added = files.map((f, i) => {
        const n = uniqueName(stemOf(f.name), taken);
        taken.add(n);
        return [n, up[i].path, extOf(f.name)];
      });
      const next = structuredClone(fd);
      const target = as.folder && as.folder !== "uncategorized" ? as.folder : null;
      if (target) setAssetFolder(next, added.map((a) => a[0]), target);
      await save([...assets, ...added], next, "에셋 추가 전");
      ctx.toast(`${added.length}개를 추가했어요`);
      paint();
    } catch (e) {
      ctx.toast(e?.message ?? String(e), { error: true });
    }
  }
  // 확장자만 뺀다. 이미 같은 이름이 있거나 한 번에 같은 이름이 둘 이상 생기면 그 에셋은 건너뛴다(겹치면 하나만 불러와져서)
  async function stripExtNames(list) {
    const want = list.map((a) => [a, stripMediaExt(a[0]).trim()]).filter(([a, nn]) => nn && nn !== a[0]);
    if (!want.length) {
      ctx.toast("뺄 확장자가 있는 이름이 없어요");
      return;
    }
    const changing = new Set(want.map(([a]) => a));
    const taken = new Map();
    for (const x of assets) if (!changing.has(x)) taken.set(x[0].toLowerCase(), true);
    const ok = [], skip = [];
    const count = new Map();
    for (const [, nn] of want) count.set(nn.toLowerCase(), (count.get(nn.toLowerCase()) ?? 0) + 1);
    for (const [a, nn] of want) {
      if (taken.has(nn.toLowerCase()) || count.get(nn.toLowerCase()) > 1) skip.push(a[0]);
      else ok.push([a, nn]);
    }
    if (!ok.length) {
      ctx.toast(`확장자를 빼면 이름이 겹쳐서 하나도 바꾸지 않았어요 (${skip.length}개)`, { error: true, seconds: 6 });
      return;
    }
    const ex = ok.slice(0, 3).map(([a, nn]) => `${a[0]} → ${nn}`).join("\n");
    if (!await confirmDialog(ctx.win, { title: `에셋 ${ok.length}개 이름에서 확장자를 뺄까요?`, body: `${ex}${ok.length > 3 ? `\n… 외 ${ok.length - 3}개` : ""}${skip.length ? `\n\n이름이 겹치는 ${skip.length}개는 그대로 둬요.` : ""}\n\n로어북·정규식 등에서 예전 이름으로 부르고 있었다면 함께 고쳐야 해요. 바꾸기 전 상태는 백업돼요.`, ok: "확장자 제거" })) return;
    const nextFd = structuredClone(fd);
    const map = new Map(ok);
    for (const [a, nn] of ok) renameMapping(nextFd, a[0], nn);
    const next = assets.map((x) => map.has(x) ? [map.get(x), x[1], x[2]] : x);
    const selKeys = new Set([...as.sel]);
    await save(next, nextFd, "확장자 제거 전");
    as.sel = new Set([...selKeys].map((k) => {
      const hit = ok.find(([a]) => keyOf3(a) === k);
      return hit ? keyOf3([hit[1], hit[0][1]]) : k;
    }));
    paint();
    ctx.toast(`${ok.length}개 이름에서 확장자를 뺐어요${skip.length ? ` · 겹치는 ${skip.length}개는 그대로` : ""}`);
  }
  async function renameAsset(a) {
    const n = await promptDialog(ctx.win, { title: "에셋 이름", label: "{{asset::이름}}처럼 이 이름으로 불러와요", value: a[0] });
    if (n === null || n.trim() === a[0]) return;
    const name = n.trim();
    if (!name) return;
    if (assets.some((x) => x !== a && x[0].toLowerCase() === name.toLowerCase()) && !await confirmDialog(ctx.win, { title: "같은 이름이 있어요", body: "그래도 바꿀까요? 같은 이름이면 앞쪽 것만 불러와질 수 있어요.", ok: "바꾸기" })) return;
    const nextFd = structuredClone(fd);
    renameMapping(nextFd, a[0], name);
    const next = assets.map((x) => x === a ? [name, x[1], x[2]] : x);
    await save(next, nextFd, "이름 바꾸기 전");
    as.focus = keyOf3([name, a[1]]);
    paint();
  }
  async function replaceOne(a) {
    const [f] = await pickFiles({ accept: "image/*,audio/*,video/*" });
    if (!f) return;
    try {
      const [up] = await uploadMany([f]);
      const next = assets.map((x) => x === a ? [x[0], up.path, extOf(f.name)] : x);
      await save(next, fd, "이미지 교체 전");
      ctx.assets.forget(a[1]);
      as.focus = keyOf3([a[0], up.path]);
      as.sel.clear();
      ctx.toast("바꿨어요", { action: { label: "되돌리기", run: () => undoTo(a, (x) => x[0] === a[0] && x[1] === up.path) }, seconds: 10 });
      paint();
    } catch (e) {
      ctx.toast(e?.message ?? String(e), { error: true });
    }
  }
  async function undoTo(oldAsset, match) {
    const next = assets.map((x) => match(x) ? [...oldAsset] : x);
    await save(next, fd, "되돌리기 전");
    paint();
  }
  async function removeSelected() {
    const sel = selected();
    if (!sel.length) return;
    if (!await confirmDialog(ctx.win, { title: `에셋 ${sel.length}개를 지울까요?`, body: "모듈 목록에서 빠져요. 바꾸기 전 상태는 백업돼요.", ok: "삭제", danger: true })) return;
    const before = assets, beforeFd = fd;
    const gone = new Set(sel.map(keyOf3));
    const nextFd = structuredClone(fd);
    for (const a of sel) if (!assets.some((x) => !gone.has(keyOf3(x)) && x[0] === a[0])) delete nextFd._mapping[a[0]];
    await save(assets.filter((a) => !gone.has(keyOf3(a))), nextFd, "에셋 삭제 전");
    as.sel.clear();
    as.focus = null;
    ctx.toast(`${sel.length}개를 지웠어요`, { action: { label: "되돌리기", run: async () => {
      await save(before, beforeFd, "삭제 되돌리기 전");
      paint();
    } }, seconds: 10 });
    paint();
  }
  async function downloadAssets(list) {
    if (!list.length) return;
    if (list.length === 1) {
      const d = await ctx.assets.read(list[0][1], { prio: 100 });
      if (!d) {
        ctx.toast("파일을 읽지 못했어요", { error: true });
        return;
      }
      download(`${safeFileName(list[0][0])}.${list[0][2] || "png"}`, new Blob([d], { type: mimeOf(list[0][2], d) }));
      return;
    }
    const t = ctx.toast(`ZIP 만드는 중 0/${list.length}`, { seconds: 600 });
    try {
      const zip = createZip();
      let i = 0;
      await Promise.all(Array.from({ length: 6 }, async () => {
        while (i < list.length) {
          const a = list[i++];
          const d = await ctx.assets.read(a[1]);
          if (!d) continue;
          const folder = fd._folders.find((f) => f.id === fd._mapping[a[0]])?.name;
          zip.add(`${folder ? folder.split("/").map(safeFileName).join("/") + "/" : ""}${safeFileName(a[0])}.${a[2] || "png"}`, d);
          const span = ctx.win.querySelector(".rb-toasts .rb-toast:last-child span");
          if (span) span.textContent = `ZIP 만드는 중 ${i}/${list.length}`;
        }
      }));
      download(`${safeFileName(mod.name)}-assets.zip`, zip.blob());
      t.close();
    } catch (e) {
      t.close();
      ctx.toast(`ZIP을 만들지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  }
  async function stripSelected() {
    const sel = selected().filter((a) => isImageExt(a[2]));
    if (!sel.length) return;
    const t = ctx.toast(`메타데이터 확인 중 0/${sel.length}`, { seconds: 600 });
    try {
      const changes = [];
      for (const a of sel) {
        const d = await ctx.assets.read(a[1]);
        if (!d) continue;
        if (!readMetadata(d).length) continue;
        changes.push({ a, bytes: stripMetadata(d) });
      }
      t.close();
      if (!changes.length) {
        ctx.toast("지울 메타데이터가 없어요");
        return;
      }
      const up = await uploadMany(changes.map((c) => c.bytes));
      const map = new Map(changes.map((c, i) => [c.a, up[i].path]));
      await save(assets.map((x) => map.has(x) ? [x[0], map.get(x), x[2]] : x), fd, "메타데이터 지우기 전");
      as.sel.clear();
      ctx.toast(`${changes.length}개에서 메타데이터를 지웠어요`);
      paint();
    } catch (e) {
      t.close();
      ctx.toast(e?.message ?? String(e), { error: true });
    }
  }
  async function optimize(list) {
    list = list.filter((a) => isImageExt(a[2]) && !/gif|svg/i.test(a[2]));
    if (!list.length) {
      ctx.toast("최적화할 이미지가 없어요 (GIF·SVG 제외)");
      return;
    }
    const avif = await canEncode("avif");
    let format = "webp", quality = 0.85, maxSide = 0;
    const formats = [["webp", "WebP"], ...avif ? [["avif", "AVIF"]] : []];
    const result = h("div", { class: "rb-muted" });
    const bar2 = progressBar(0);
    let prepared = null;
    const ok = await new Promise((resolve) => {
      const back = h("div", { class: "rb-modal" });
      const done = (v) => {
        back.remove();
        resolve(v);
      };
      const run = btn("미리 계산", { kind: "primary", onClick: async () => {
        run.disabled = true;
        prepared = [];
        let before = 0, after = 0, skipped = 0, i = 0;
        for (const a of list) {
          try {
            const d = await ctx.assets.read(a[1]);
            if (!d) {
              skipped++;
              continue;
            }
            const out = await convertImage(d, { format, quality, maxSide });
            before += d.length;
            if (out.bytes.length < d.length * 0.97) {
              prepared.push({ a, bytes: out.bytes });
              after += out.bytes.length;
            } else {
              after += d.length;
              skipped++;
            }
          } catch {
            skipped++;
          }
          bar2.set(++i / list.length * 100);
        }
        result.textContent = `${fmtBytes(before)} → ${fmtBytes(after)} (${before ? Math.round((1 - after / before) * 100) : 0}% 줄어듦) · 바꿀 것 ${prepared.length}개${skipped ? ` · 그대로 ${skipped}개(더 커지거나 못 읽음)` : ""}`;
        apply.disabled = !prepared.length;
        run.disabled = false;
        run.querySelector("span").textContent = "다시 계산";
      } });
      const apply = btn("적용", { kind: "primary", disabled: true, onClick: () => done(true) });
      back.appendChild(h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-label": "이미지 최적화", style: "max-width:480px" },
        h("h3", { class: "rb-h3" }, `이미지 최적화 (${list.length}개)`),
        h("span", { class: "rb-label" }, "형식"),
        segmented(formats, format, (v) => {
          format = v;
        }, "형식"),
        h("span", { class: "rb-label" }, "품질"),
        segmented([["0.95", "고품질"], ["0.85", "균형"], ["0.7", "최대 압축"]], "0.85", (v) => {
          quality = Number(v);
        }, "품질"),
        h("span", { class: "rb-label" }, "최대 크기"),
        segmented([["0", "원본"], ["2048", "2048px"], ["1024", "1024px"]], "0", (v) => {
          maxSide = Number(v);
        }, "최대 크기"),
        avif ? null : h("p", { class: "rb-muted" }, "이 브라우저는 AVIF 저장을 지원하지 않아 WebP만 쓸 수 있어요."),
        bar2,
        result,
        h("p", { class: "rb-muted" }, "더 작아지는 것만 바꿔요. 바꾸기 전 모듈은 백업되고, 원래 파일은 서버에 남아 있어요."),
        h("div", { class: "btns" }, btn("취소", { onClick: () => done(false) }), run, apply)
      ));
      ctx.win.appendChild(back);
    });
    if (!ok || !prepared?.length) return;
    try {
      const up = await uploadMany(prepared.map((p) => p.bytes));
      const map = new Map(prepared.map((p, i) => [p.a, up[i].path]));
      await save(assets.map((x) => map.has(x) ? [x[0], map.get(x), format] : x), fd, "최적화 전");
      as.sel.clear();
      ctx.toast(`${prepared.length}개를 최적화했어요`);
      paint();
    } catch (e) {
      ctx.toast(e?.message ?? String(e), { error: true });
    }
  }
  async function batchReplace(targets) {
    if (!targets.length) {
      ctx.toast("바꿀 에셋이 없어요");
      return;
    }
    const files = await pickFiles({ accept: "image/*,audio/*,video/*", multiple: true });
    if (!files.length) return;
    let mode = "name";
    const summary = h("div", { class: "rb-scroll", style: "max-height:240px;display:flex;flex-direction:column;gap:4px" });
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, void 0, { numeric: true }));
    const match = () => {
      if (mode === "order") return targets.map((a, i) => ({ a, f: sortedFiles[i] })).filter((x) => x.f);
      const by = new Map(files.map((f) => [stemOf(f.name).toLowerCase(), f]));
      return targets.map((a) => ({ a, f: by.get(a[0].toLowerCase()) })).filter((x) => x.f);
    };
    const paintSum = () => {
      const m2 = match();
      replace(
        summary,
        h("span", { class: "rb-label" }, `맞춘 것 ${m2.length}개 · 못 맞춘 에셋 ${targets.length - m2.length}개 · 남은 파일 ${files.length - m2.length}개`),
        m2.slice(0, 200).map((x) => h("div", { style: "font-size:12px;display:flex;gap:8px" }, h("span", { style: "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, x.a[0]), h("span", { class: "rb-muted" }, "←"), h("span", { style: "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--rb-sub)" }, x.f.name)))
      );
    };
    const ok = await new Promise((resolve) => {
      const back = h("div", { class: "rb-modal" });
      const done = (v) => {
        back.remove();
        resolve(v);
      };
      back.appendChild(h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-label": "일괄 교체", style: "max-width:520px" },
        h("h3", { class: "rb-h3" }, `일괄 교체 — 파일 ${files.length}개`),
        segmented([["name", "이름으로 맞추기"], ["order", "순서로 맞추기"]], mode, (v) => {
          mode = v;
          paintSum();
        }, "맞추는 방식"),
        h("p", { class: "rb-muted" }, mode === "name" ? "파일 이름(확장자 빼고)이 에셋 이름과 같은 것끼리 바꿔요." : "대상 에셋 순서와 파일 이름 순서대로 바꿔요."),
        summary,
        h("div", { class: "btns" }, btn("취소", { onClick: () => done(false) }), btn("바꾸기", { kind: "primary", onClick: () => done(true) }))
      ));
      ctx.win.appendChild(back);
      paintSum();
    });
    if (!ok) return;
    const m = match();
    if (!m.length) {
      ctx.toast("맞춘 것이 없어요", { error: true });
      return;
    }
    try {
      const up = await uploadMany(m.map((x) => x.f));
      const map = new Map(m.map((x, i) => [x.a, [x.a[0], up[i].path, extOf(x.f.name)]]));
      await save(assets.map((x) => map.get(x) ?? x), fd, "일괄 교체 전");
      for (const x of m) ctx.assets.forget(x.a[1]);
      as.sel.clear();
      ctx.toast(`${m.length}개를 바꿨어요`);
      paint();
    } catch (e) {
      ctx.toast(e?.message ?? String(e), { error: true });
    }
  }
  function lightbox(a) {
    const list = visible().filter((x) => isImageExt(x[2]));
    let i = Math.max(0, list.findIndex((x) => keyOf3(x) === keyOf3(a)));
    const img = h("img", { alt: "" });
    const cap = h("span");
    let url = null;
    const show = async () => {
      const cur = list[i];
      cap.textContent = `${cur[0]} · ${i + 1}/${list.length}`;
      const thumbUrl = await ctx.assets.thumb(cur[1], cur[2], { prio: 100 }).catch(() => null);
      if (thumbUrl) img.src = thumbUrl;
      const full = await ctx.assets.fullUrl(cur[1], cur[2]).catch(() => null);
      if (list[i] !== cur) {
        if (full) URL.revokeObjectURL(full);
        return;
      }
      if (url) URL.revokeObjectURL(url);
      url = full;
      if (full) img.src = full;
      const n = list[i + 1];
      if (n) ctx.assets.read(n[1], { prio: 60 }).catch(() => {
      });
    };
    const closeLb = () => {
      box.remove();
      if (url) URL.revokeObjectURL(url);
      panel.focus();
    };
    const box = h(
      "div",
      { class: "rb-lightbox", role: "dialog", "aria-label": "크게 보기", tabindex: "-1" },
      img,
      h(
        "div",
        { class: "bar" },
        btn("이전", { size: "sm", icon: "back", onClick: () => {
          i = (i - 1 + list.length) % list.length;
          show();
        } }),
        cap,
        btn("다음", { size: "sm", icon: "chevron", onClick: () => {
          i = (i + 1) % list.length;
          show();
        } }),
        btn("받기", { size: "sm", icon: "download", onClick: () => downloadAssets([list[i]]) }),
        btn("닫기", { size: "sm", icon: "x", onClick: closeLb })
      )
    );
    box.addEventListener("keydown", (ev) => {
      ev.stopPropagation();
      if (ev.key === "Escape") closeLb();
      if (ev.key === "ArrowLeft") {
        i = (i - 1 + list.length) % list.length;
        show();
      }
      if (ev.key === "ArrowRight") {
        i = (i + 1) % list.length;
        show();
      }
    });
    box.addEventListener("mousedown", (ev) => {
      if (ev.target === box) closeLb();
    });
    ctx.win.appendChild(box);
    box.focus();
    show();
  }
  function close() {
    if (as.busy) return;
    lazy.disconnect();
    panel.remove();
  }
  panel.tabIndex = -1;
  paint();
  panel.focus();
  return { panel, close, get assets() {
    return assets;
  }, get folders() {
    return fd;
  } };
}
