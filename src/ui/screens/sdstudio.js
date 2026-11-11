// 에셋 제작 화면(애드온 sdstudio 전용, 봇만): 개발 탭 '에셋 제작' → 플러그인 안 전체 화면(.rb-full, 에셋 관리와 같은 꼴).
// SDStudio 씬 갤러리 모양: 왼쪽 = 프롬프트(공통·고른 캐릭터·네거티브·크기·장 수·만들기), 오른쪽 = 폴더 줄 + 캐릭터 카드 + 고른 캐릭터의 이미지.
// - 카드 하나 = 그 봇에 들어갈 캐릭터 하나. 폴더 = 복장 베리에이션·소속 묶음. 폴더 안에 폴더, 한 캐릭터를 여러 폴더에(engine/sdstudio/project.js).
// - 만든 그림은 바로 api.saveAsset으로 저장하고 경로만 기록(IndexedDB는 플러그인 칸에서 막힘). 봇에 넣을 때는 그 경로를 덧붙이기만.
// - 화면 상태는 ctx.state.sdstudio[chaId], 작업 묶음은 pluginStorage dusk.sdstudio.p.<chaId>.
import { h, replace } from "../dom.js";
import { btn, iconBtn, modal, segmented, chip, openMenu, promptDialog, confirmDialog } from "../kit.js";
import { icon } from "../icons.js";
import { isStopError } from "../../engine/aistop.js";
import { isGenerating } from "../../engine/safety.js";
import { SIZES, withAsset, uniqueAssetName } from "../../engine/sdstudio/nai.js";
import * as P from "../../engine/sdstudio/project.js";

var SLOT_KO = { additionalAssets: "추가 에셋", emotionImages: "감정 이미지" };
var KIND_KO = { outfit: "복장", group: "소속" };
var OVER = "position:absolute;left:0;right:0;bottom:0;display:flex;gap:6px;align-items:center;padding:18px 10px 8px;background:linear-gradient(transparent,rgba(0,0,0,.66));color:#fff;font-size:13px;font-weight:600";   // 그림 위 글자(테마와 무관하게 읽히게)

function folderDialog(host, { title, name = "", kind = "", ok = "만들기" }) {
  let k = kind;
  const input = h("input", { type: "text", class: "rb-input", value: name, placeholder: "예: 수영복 / 아비도스", "data-autofocus": "", id: "rb-sd-fname" });
  return modal(host, (done) => {
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) done({ name: input.value.trim(), kind: k }); });
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("h3", { class: "rb-h3" }, title),
      h("label", { class: "rb-label", for: "rb-sd-fname" }, "폴더 이름"), input,
      h("span", { class: "rb-label" }, "무엇으로 묶나요"),
      segmented([["outfit", "복장 베리에이션"], ["group", "소속"], ["", "그 밖"]], k, (v) => { k = v; }, "폴더 종류"),
      h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), btn(ok, { kind: "primary", id: "rb-sd-fok", onClick: () => input.value.trim() && done({ name: input.value.trim(), kind: k }) })));
  });
}

export async function openAssetStudio(ctx, info, sd) {
  if (info?.kind !== "character") return;
  const bot = await ctx.api.getCharacterFromIndex(info.index);
  if (!bot || bot.chaId !== info.id) throw new Error("봇을 찾지 못했어요. 목록을 새로 고친 뒤 다시 해 주세요");
  let proj = await sd.loadProject(info.id);
  const st = ((ctx.state.sdstudio ??= {})[info.id] ??= { folder: null, sel: null, count: "1", slot: "additionalAssets" });
  if (st.folder && !proj.folders.some((f) => f.id === st.folder)) st.folder = null;
  if (st.sel && !proj.chars.some((c) => c.id === st.sel)) st.sel = null;
  const picks = new Set();
  const blobs = new Map();   // 이번에 만든 그림: 경로 → blob 주소(호스트에서 다시 읽지 않고 바로 보이게)
  let busy = false, abort = null, saveT = null;
  const cur = () => proj.chars.find((c) => c.id === st.sel) ?? null;
  const persist = (now = false) => {
    clearTimeout(saveT);
    const run = () => sd.saveProject(info.id, proj).catch((e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }));
    if (now) return run();
    saveT = setTimeout(run, 400);
  };
  const set = (next) => { proj = next; persist(); };

  // ── 틀 ──
  const panel = h("div", { class: "rb-full", role: "dialog", "aria-label": "에셋 제작", id: "rb-sd-studio" });
  const head = h("div", { class: "rb-full-head" },
    iconBtn("back", "닫기", { onClick: () => close() }),
    h("div", { class: "ttl" }, h("small", null, "에셋 제작"), h("b", null, bot.name || "이름 없는 봇")),
    btn("폴더", { icon: "folderPlus", id: "rb-sd-addfolder", title: "폴더 만들기", labelClass: "rb-pc-only", onClick: () => addFolder() }),
    btn("캐릭터 추가", { kind: "primary", icon: "plus", id: "rb-sd-addchar", title: "캐릭터 추가", labelClass: "rb-pc-only", onClick: () => addChar() }));   // 좁은 화면은 아이콘만
  const side = h("aside", { class: "side rb-scroll", style: "width:340px;overflow:auto;padding:16px;gap:12px", id: "rb-sd-side" });
  const crumbs = h("div", { style: "display:flex;align-items:center;gap:6px;flex-wrap:wrap", id: "rb-sd-crumbs" });
  const rowsEl = h("div", { style: "display:flex;flex-direction:column;gap:12px", id: "rb-sd-rows" });
  const cardsEl = h("section", { style: "display:flex;flex-direction:column;gap:10px", id: "rb-sd-cards" });
  const imgsEl = h("section", { style: "display:flex;flex-direction:column;gap:10px", id: "rb-sd-imgs" });
  const pane = h("div", { class: "rb-scroll", id: "rb-sd-pane", style: "flex:1;min-height:0;overflow:auto;padding:16px 20px 24px;display:flex;flex-direction:column;gap:16px" }, crumbs, rowsEl, cardsEl, imgsEl);
  const putBar = h("div", { style: "flex-shrink:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 16px;border-top:var(--rb-bw,1px) solid var(--rb-line2);background:var(--rb-surf)", id: "rb-sd-putbar" });
  const right = h("div", { style: "flex:1;min-width:0;display:flex;flex-direction:column;min-height:0" }, pane, putBar);
  panel.append(head, h("div", { class: "rb-split" }, side, right));
  ctx.win.appendChild(panel);
  let lazy = ctx.assets.lazy(pane);

  const thumb = (path) => {
    const img = h("img", { alt: "", style: "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block", dataset: { path, ext: "png" } });
    if (blobs.has(path)) img.src = blobs.get(path); else lazy.observe(img);
    return img;
  };
  const charCard = (c, w) => {
    const path = P.coverOf(c), on = st.sel === c.id;
    return h("button", { type: "button", class: "rb-sd-card", "aria-selected": on ? "true" : "false", dataset: { id: c.id }, title: c.name, onClick: () => select(c.id),
      style: `position:relative;padding:0;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);overflow:hidden;background:var(--rb-surf2);cursor:pointer;aspect-ratio:2/3;${w ? `width:${w}px;flex-shrink:0;` : "width:100%;"}${on ? "box-shadow:0 0 0 2px var(--rb-acc);border-color:var(--rb-acc);" : ""}` },
      path ? thumb(path) : h("span", { style: "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--rb-mute)" }, icon("character", 28)),
      h("span", { style: OVER }, h("span", { style: "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left" }, c.name), h("span", { style: "opacity:.85;font-variant-numeric:tabular-nums" }, String(c.images.length))));
  };
  const sectionHead = (title, count, ...right) => h("div", { style: "display:flex;align-items:center;gap:8px;min-height:32px" },
    h("b", { style: "font-size:14px" }, title), count != null ? h("span", { class: "rb-muted" }, String(count)) : null, h("span", { style: "flex:1" }), ...right);

  // ── 오른쪽 ──
  function paintCrumbs() {
    const path = P.pathOf(proj, st.folder);
    const items = [h("button", { type: "button", class: "rb-chip", "aria-pressed": st.folder ? "false" : "true", onClick: () => enter(null) }, "전체")];
    for (const f of path) items.push(h("span", { class: "rb-muted", "aria-hidden": "true" }, "›"), h("button", { type: "button", class: "rb-chip", "aria-pressed": f.id === st.folder ? "true" : "false", onClick: () => enter(f.id) }, f.name));
    if (st.folder) items.push(iconBtn("more", "폴더 메뉴", { onClick: (e) => folderMenu(e.currentTarget, st.folder) }));
    replace(crumbs, ...items);
  }
  function paintRows() {
    const { folders } = P.view(proj, st.folder);
    if (!folders.length) { replace(rowsEl); return; }
    replace(rowsEl, ...folders.map((f) => {
      const list = P.rowChars(proj, f.id), subs = proj.folders.filter((x) => x.parent === f.id).length;
      return h("div", { class: "rb-sd-frow", dataset: { id: f.id }, style: "border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r3);background:var(--rb-surf);padding:12px;display:flex;flex-direction:column;gap:10px" },
        h("div", { style: "display:flex;align-items:center;gap:8px" },
          h("button", { type: "button", class: "rb-sd-fopen", onClick: () => enter(f.id), style: "flex:1;min-width:0;display:flex;align-items:center;gap:8px;background:none;border:0;padding:0;color:var(--rb-text);cursor:pointer;text-align:left" },
            h("span", { style: "color:var(--rb-acc);display:flex" }, icon("folder", 18)),
            h("b", { style: "font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, f.name),
            f.kind ? h("span", { class: "rb-badge" }, KIND_KO[f.kind]) : null,
            h("span", { class: "rb-muted" }, `${list.length}명${subs ? ` · 폴더 ${subs}` : ""}`),
            h("span", { style: "color:var(--rb-mute);display:flex" }, icon("chevron", 16))),
          iconBtn("more", "폴더 메뉴", { onClick: (e) => folderMenu(e.currentTarget, f.id) })),
        list.length
          ? h("div", { class: "rb-scroll", style: "display:flex;gap:10px;overflow-x:auto;padding-bottom:4px" }, ...list.map((c) => charCard(c, 128)))
          : h("span", { class: "rb-muted", style: "white-space:normal" }, "아직 캐릭터가 없어요. 캐릭터를 고른 뒤 왼쪽 ‘폴더’에서 이 폴더를 눌러 넣어요."));
    }));
  }
  function paintCards() {
    const v = P.view(proj, st.folder);
    if (!proj.chars.length) {
      replace(cardsEl, h("div", { class: "rb-empty rb-empty-card", style: "display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;padding:28px 16px" },
        h("b", null, "이 봇에 들어갈 캐릭터를 만들어요"),
        h("span", { class: "rb-muted", style: "white-space:normal" }, "캐릭터마다 프롬프트를 적고 그림을 만들어 봇 에셋으로 넣어요. 복장·소속은 폴더로 묶어요."),
        btn("캐릭터 추가", { kind: "primary", icon: "plus", onClick: () => addChar() })));
      return;
    }
    if (!v.chars.length) { replace(cardsEl, st.folder && !v.folders.length ? h("span", { class: "rb-muted", style: "white-space:normal" }, "이 폴더에 바로 든 캐릭터가 없어요.") : null); return; }
    replace(cardsEl, sectionHead(st.folder ? "캐릭터" : v.folders.length ? "폴더 없는 캐릭터" : "캐릭터", v.chars.length),
      h("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px" }, ...v.chars.map((c) => charCard(c))));
  }
  function paintImages() {
    const c = cur();
    if (!c) { replace(imgsEl); paintPutBar(); return; }
    const tiles = c.images.map((im) => {
      const on = picks.has(im.path), cover = P.coverOf(c) === im.path;
      return h("button", { type: "button", class: "rb-sd-img", "aria-pressed": on ? "true" : "false", title: im.seed ? `시드 ${im.seed}` : "", dataset: { path: im.path },
        style: `position:relative;padding:0;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);overflow:hidden;background:var(--rb-surf2);cursor:pointer;aspect-ratio:2/3;${on ? "box-shadow:0 0 0 2px var(--rb-acc);border-color:var(--rb-acc);" : ""}`,
        onClick: () => { picks.has(im.path) ? picks.delete(im.path) : picks.add(im.path); paintImages(); } },
        thumb(im.path),
        on ? h("span", { style: "position:absolute;top:6px;left:6px;width:22px;height:22px;border-radius:7px;background:var(--rb-acc-grad);color:var(--rb-on-acc);display:flex;align-items:center;justify-content:center" }, icon("check", 14)) : null,
        cover ? h("span", { class: "rb-badge", style: "position:absolute;top:6px;right:6px" }, "대표") : null);
    });
    replace(imgsEl, sectionHead(`${c.name}의 이미지`, c.images.length, picks.size ? btn("고르기 풀기", { kind: "ghost", size: "sm", onClick: () => { picks.clear(); paintImages(); } }) : null),
      tiles.length ? h("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px" }, ...tiles)
        : h("span", { class: "rb-muted", style: "white-space:normal" }, "아직 만든 그림이 없어요. 왼쪽에서 프롬프트를 적고 ‘만들기’를 눌러요."));
    paintPutBar();
  }
  const nameIn = h("input", { type: "text", class: "rb-input", id: "rb-sd-name", "aria-label": "에셋 이름", style: "flex:1;min-width:120px;max-width:240px" });
  function paintPutBar() {
    const c = cur();
    putBar.hidden = !c || !picks.size;
    if (putBar.hidden) return;
    nameIn.placeholder = `이름(비우면 ${c.name})`;
    replace(putBar,
      h("b", { style: "font-size:13px" }, `${picks.size}장 고름`),
      segmented(Object.entries(SLOT_KO), st.slot, (v) => { st.slot = v; }, "넣을 자리"),
      nameIn,
      h("span", { style: "flex:1" }),
      iconBtn("more", "그림 메뉴", { onClick: (e) => openMenu(ctx.win, e.currentTarget, [
        ...(picks.size === 1 ? [{ label: "대표 그림으로", icon: "check", onClick: () => { set(P.updateChar(proj, c.id, { cover: [...picks][0] })); paintCards(); paintRows(); paintImages(); } }] : []),
        { label: "목록에서 빼기", icon: "trash", danger: true, onClick: async () => {
          if (!await confirmDialog(ctx.win, { title: `${picks.size}장을 목록에서 뺄까요?`, body: "이 화면 목록에서만 빠져요. 이미 봇에 넣은 에셋은 그대로예요.", ok: "빼기", danger: true })) return;
          let next = proj; for (const p of picks) next = P.removeImage(next, c.id, p);
          picks.clear(); set(next); paintCards(); paintRows(); paintImages();
        } }]) }),
      btn(picks.size > 1 ? `${picks.size}장 봇에 넣기` : "봇에 넣기", { kind: "primary", icon: "download", id: "rb-sd-put", disabled: busy, onClick: () => put() }));
  }
  const paintPane = () => { lazy.disconnect(); lazy = ctx.assets.lazy(pane); paintCrumbs(); paintRows(); paintCards(); paintImages(); };

  // ── 왼쪽 ──
  const status = h("span", { class: "rb-muted", style: "white-space:normal;min-height:1em", id: "rb-sd-status" });
  const genBtn = btn("만들기", { kind: "primary", size: "lg", icon: "sparkle", id: "rb-sd-gen", onClick: () => generate() });
  genBtn.style.width = "100%";
  const area = (id, rows, value, ph, on) => { const t = h("textarea", { class: "rb-textarea", rows, id, placeholder: ph }); t.value = value; t.addEventListener("input", () => on(t.value)); return t; };
  const tokenIn = h("input", { type: "password", class: "rb-input", placeholder: "pst-…", autocomplete: "off", id: "rb-sd-token" });
  let tokenOpen = !(await sd.getToken());
  const hr = () => h("hr", { style: "border:0;border-top:var(--rb-bw,1px) solid var(--rb-line2);margin:2px 0;width:100%" });
  const label = (text, forId, hint) => h("div", { style: "display:flex;flex-direction:column;gap:2px" }, h("label", { class: "rb-label", for: forId }, text), hint ? h("span", { class: "rb-muted", style: "white-space:normal;font-size:12px" }, hint) : null);
  function paintSide() {
    const c = cur();
    const charBox = c ? [
      h("div", { style: "display:flex;align-items:center;gap:8px" },
        h("input", { type: "text", class: "rb-input", value: c.name, id: "rb-sd-cname", "aria-label": "캐릭터 이름", style: "flex:1;min-width:0;font-weight:700", onChange: (e) => { set(P.updateChar(proj, c.id, { name: e.target.value.trim() || c.name })); paintCards(); paintRows(); paintImages(); } }),
        iconBtn("more", "캐릭터 메뉴", { onClick: (e) => openMenu(ctx.win, e.currentTarget, [{ label: "캐릭터 지우기", icon: "trash", danger: true, onClick: () => removeChar(c) }]) })),
      label("캐릭터 프롬프트", "rb-sd-cprompt", "생김새·복장·표정. 공통 프롬프트 뒤에 붙어요."),
      area("rb-sd-cprompt", 6, c.prompt, "예: 1girl, grey hair, wolf ears, school uniform, smile", (v) => set(P.updateChar(proj, c.id, { prompt: v }))),
      h("span", { class: "rb-label" }, "폴더"),
      proj.folders.length
        ? h("div", { style: "display:flex;gap:6px;flex-wrap:wrap", id: "rb-sd-cfolders" }, ...proj.folders.map((f) => {
            const on = f.members.includes(c.id);
            const b = chip(P.pathOf(proj, f.id).map((x) => x.name).join(" › "), { pressed: on, onClick: () => { set(P.setMember(proj, f.id, c.id, !on)); paintSide(); paintRows(); paintCards(); } });
            b.dataset.id = f.id; return b;
          }))
        : h("span", { class: "rb-muted", style: "white-space:normal" }, "폴더를 만들면 여기서 넣고 뺄 수 있어요. 한 캐릭터를 여러 폴더에 넣을 수 있어요.")
    ] : [h("div", { class: "rb-empty rb-empty-card", style: "padding:16px;text-align:center;white-space:normal" }, proj.chars.length ? "오른쪽에서 캐릭터를 고르면 여기서 프롬프트를 고쳐요." : "‘캐릭터 추가’로 이 봇에 들어갈 캐릭터를 만들어요.")];
    const tokenEls = tokenOpen
      ? [label("NovelAI 토큰", "rb-sd-token", "NovelAI → 계정 설정 → 영구 API 토큰. 이 기기에만 저장돼요."), tokenIn]
      : [h("div", { style: "display:flex;align-items:center;gap:8px" }, h("span", { class: "rb-muted", style: "flex:1" }, "NovelAI 토큰 저장됨"), btn("바꾸기", { kind: "ghost", size: "sm", onClick: () => { tokenOpen = true; paintSide(); tokenIn.focus(); } }))];
    replace(side,
      label("공통 프롬프트", "rb-sd-top", "모든 캐릭터 앞에 붙어요. 화풍·작가·품질 태그를 적어요."),
      area("rb-sd-top", 4, proj.top, "예: masterpiece, best quality, official art", (v) => set({ ...proj, top: v })),
      hr(), ...charBox, hr(),
      label("네거티브 프롬프트", "rb-sd-neg"),
      area("rb-sd-neg", 3, proj.neg, "", (v) => set({ ...proj, neg: v })),
      h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
        segmented(Object.entries(SIZES).map(([k, v]) => [k, v.label]), proj.size, (v) => set({ ...proj, size: v }), "크기"),
        segmented([["1", "1장"], ["2", "2장"], ["4", "4장"]], st.count, (v) => { st.count = v; }, "장 수")),
      ...tokenEls, genBtn, status);
    for (const el of side.children) el.style.flexShrink = "0";
    genBtn.disabled = busy || !c;
  }

  // ── 동작 ──
  function select(id) {
    if (st.sel !== id) picks.clear();
    st.sel = id;
    paintSide(); paintRows(); paintCards(); paintImages();
  }
  function enter(folderId) { st.folder = folderId; paintPane(); pane.scrollTop = 0; }
  async function addChar() {
    const name = await promptDialog(ctx.win, { title: "캐릭터 추가", label: "이름", value: proj.chars.length ? "" : (bot.name || ""), ok: "추가", placeholder: "예: 시로코" });
    if (name == null) return;
    let next = P.addChar(proj, { name });
    const id = next.chars.at(-1).id;
    if (st.folder) next = P.setMember(next, st.folder, id, true);
    set(next); picks.clear(); st.sel = id;
    paintSide(); paintPane();
    side.querySelector("#rb-sd-cprompt")?.focus();
  }
  async function removeChar(c) {
    if (!await confirmDialog(ctx.win, { title: `${c.name}을(를) 지울까요?`, body: "이 화면의 캐릭터·프롬프트·그림 목록이 지워져요. 이미 봇에 넣은 에셋은 그대로예요.", ok: "지우기", danger: true })) return;
    set(P.removeChar(proj, c.id)); st.sel = null; picks.clear(); paintSide(); paintPane();
  }
  async function addFolder(parent = st.folder) {
    const r = await folderDialog(ctx.win, { title: parent ? "안에 폴더 만들기" : "폴더 만들기" });
    if (!r) return;
    set(P.addFolder(proj, { ...r, parent })); paintSide(); paintPane();
  }
  function folderMenu(anchor, id) {
    const f = proj.folders.find((x) => x.id === id);
    if (!f) return;
    openMenu(ctx.win, anchor, [
      { label: "이름·종류 바꾸기", icon: "edit", onClick: async () => { const r = await folderDialog(ctx.win, { title: "폴더 바꾸기", name: f.name, kind: f.kind, ok: "저장" }); if (r) { set(P.updateFolder(proj, id, r)); paintSide(); paintPane(); } } },
      { label: "안에 폴더 만들기", icon: "folderPlus", onClick: () => addFolder(id) },
      ...(f.parent ? [{ label: "맨 위로 꺼내기", icon: "up", onClick: () => { set(P.moveFolder(proj, id, null)); paintSide(); paintPane(); } }] : []),
      "sep",
      { label: "폴더 지우기", icon: "trash", danger: true, onClick: async () => {
        if (!await confirmDialog(ctx.win, { title: `‘${f.name}’ 폴더를 지울까요?`, body: "안의 폴더도 함께 지워져요. 캐릭터와 그림은 남아요.", ok: "지우기", danger: true })) return;
        set(P.removeFolder(proj, id));
        if (st.folder && !proj.folders.some((x) => x.id === st.folder)) st.folder = f.parent && proj.folders.some((x) => x.id === f.parent) ? f.parent : null;
        paintSide(); paintPane();
      } }
    ]);
  }
  async function generate() {
    const c = cur();
    if (busy || !c) return;
    if (tokenOpen) {
      const v = tokenIn.value.trim();
      if (!v) { status.textContent = "토큰을 넣어 주세요."; tokenIn.focus(); return; }
      await sd.setToken(v); tokenOpen = false; paintSide();
    }
    const prompt = P.composePrompt(proj.top, c.prompt);
    if (!prompt) { status.textContent = "프롬프트를 적어 주세요."; side.querySelector("#rb-sd-cprompt")?.focus(); return; }
    busy = true; paintSide(); paintPutBar();
    abort = new AbortController();
    const n = Number(st.count) || 1, who = c.id;
    let made = 0;
    try {
      for (let i = 0; i < n; i++) {
        status.textContent = n > 1 ? `만드는 중 ${i + 1}/${n}…` : "만드는 중…";
        const r = await sd.generate({ prompt, uc: proj.neg, size: proj.size }, abort.signal);
        const path = await sd.saveAsset(r.data);
        blobs.set(path, URL.createObjectURL(new Blob([r.data], { type: "image/png" })));
        set(P.addImage(proj, who, { path, seed: r.seed }));
        made++;
        if (st.sel === who) paintImages();
        paintCards(); paintRows();
      }
      status.textContent = `${made}장 만들었어요. 넣을 그림을 눌러 골라요.`;
    } catch (e) {
      status.textContent = isStopError(e) ? (made ? `${made}장 만들고 멈췄어요.` : "멈췄어요.") : `만들지 못했어요: ${e?.message ?? e}`;
      if (/토큰/.test(e?.message ?? "")) tokenOpen = true;
    } finally {
      busy = false; abort = null; persist(true);
      const keep = status.textContent;
      paintSide(); status.textContent = keep; paintPutBar();
    }
  }
  async function put() {
    const c = cur();
    if (!c || !picks.size || busy) return;
    busy = true; paintPutBar();
    try {
      let b = await ctx.api.getCharacterFromIndex(info.index);
      if (!b || b.chaId !== info.id) throw new Error("봇을 찾지 못했어요");
      if (isGenerating(b)) throw new Error("봇이 응답을 생성하는 중이에요. 끝난 뒤 다시 해 주세요");
      const order = c.images.map((i) => i.path).filter((p) => picks.has(p)).reverse();   // 오래된 것부터 → 번호가 만든 순서대로
      for (const path of order) b = withAsset(b, st.slot, uniqueAssetName(b, st.slot, nameIn.value || c.name), path);
      await ctx.api.setCharacterToIndex(info.index, b);
      ctx.state.charsDirty = true;
      ctx.toast(`${SLOT_KO[st.slot]}에 ${order.length}장을 넣었어요`);
      picks.clear(); nameIn.value = "";
      paintImages();
    } catch (e) {
      ctx.toast(`넣지 못했어요: ${e?.message ?? e}`, { error: true });
    } finally { busy = false; paintPutBar(); }
  }
  function close() {
    abort?.abort();
    persist(true);
    lazy.disconnect();
    for (const u of blobs.values()) URL.revokeObjectURL(u);
    panel.remove();
  }
  panel.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || ctx.win.querySelector(".rb-modal, .rb-menu")) return;
    ev.stopPropagation();
    if (picks.size) { picks.clear(); paintImages(); } else close();
  });
  panel.tabIndex = -1;
  paintSide(); paintPane();
  panel.focus();
  return { panel, close };
}
