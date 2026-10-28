import { validateModule } from './editor.js';
import { openCharAssets, openCharEditor } from './chareditor.js';
import { newCharacterBase, uniqueDisplayName } from '../../engine/character.js';
import { createStore } from '../../engine/store.js';
import { Busy, backupSnapshot, isGenerating } from '../../engine/safety.js';
import { buildRisum, moduleJson, safeFileName } from '../../engine/export.js';
import { LIST_KO, applyListImport, buildCharx, listExportText, parseListFile } from '../../engine/devfile.js';
import { changedKeys } from './patchui.js';
import { loadCharacters } from '../../data/modules.js';
import { copyText, download, fmtBytes, fmtWhen, h, pickFiles, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, confirmDialog, loading, folderDialog, iconBtn, modal, note, openMenu, promptDialog, segmented } from '../kit.js';
import { buildPatch, planPatch } from '../../engine/patch.js';
import { devLint, devStats, loreActivation, nextVersion, projView, regexRun } from '../../engine/devcheck.js';
import { baseViewOf, okIdentity, pickWork, renderPatchMaker } from './devtools.js';
import { affCard } from './devaff.js';

var KIND_KO = { module: "모듈", character: "봇" };
var keyOf = (p) => p.kind === "module" ? `m:${p.id}` : `c:${p.id}`;
var projects = (ctx) => ctx.prefs.meta.devProjects ?? [];
export var findProject = (ctx, kind, id) => projects(ctx).find((p) => p.kind === kind && p.id === id) ?? null;
function saveProjects(ctx, fn) {
  return ctx.svc.meta((m) => {
    m.devProjects ??= [];
    return fn(m.devProjects, m);
  });
}
export function addProjects(ctx, list) {
  return saveProjects(ctx, (ps) => {
    let n = 0;
    for (const x of list) if (!ps.some((p) => p.kind === x.kind && p.id === x.id)) {
      ps.push({ kind: x.kind, id: x.id, addedAt: Date.now(), version: "", releases: [] });
      n++;
    }
    return n;
  });
}
export function recordRelease(ctx, kind, id, rel) {
  return saveProjects(ctx, (ps) => {
    let p = ps.find((x) => x.kind === kind && x.id === id);
    if (!p) {
      p = { kind, id, addedAt: Date.now(), version: "", releases: [] };
      ps.push(p);
    }
    p.releases = [{ t: Date.now(), ...rel }, ...p.releases ?? []].slice(0, 100);
    if (rel.version) p.version = rel.version;
  });
}
async function loadAll(ctx, fresh) {
  const st = ctx.state;
  if (!fresh && st.devAll && Date.now() - st.devAll.t < 3e4) return st.devAll;
  const { entries } = await ctx.svc.load(fresh ? { fresh: true } : void 0);
  const db = await ctx.api.getDatabase(["characters"]);
  const lc = await loadCharacters(ctx.api, db?.characters);
  const mods = new Map(entries.map((e) => [e.module.id, { kind: "module", id: e.module.id, name: e.module.name ?? "", enabled: e.enabled, module: e.module }]));
  const chars = /* @__PURE__ */ new Map();
  lc.list.forEach((c, i) => {
    if (c && !c.trashTime && c.type !== "group") chars.set(c.chaId, { kind: "character", id: c.chaId, i, name: c.name ?? "", image: c.image, creator: c.creator });
  });
  st.devAll = { t: Date.now(), mods, chars, unloaded: lc.unloaded };
  return st.devAll;
}
var targetOf = (all, p) => (p.kind === "module" ? all.mods.get(p.id) : all.chars.get(p.id)) ?? null;
async function fullOf(ctx, all, p) {
  const t = targetOf(all, p);
  if (!t) throw new Error("찾을 수 없어요. 지워졌거나 아직 불러오는 중이에요.");
  if (p.kind === "module") return (await ctx.svc.load({ fresh: true })).entries.find((e) => e.module.id === p.id)?.module ?? t.module;
  const c = await ctx.api.getCharacterFromIndex(t.i);
  if (!c || c.chaId !== p.id) throw new Error("봇을 다시 찾지 못했어요. 새로 고침을 눌러 주세요.");
  return c;
}
export async function renderDev(ctx) {
  const st = ctx.state;
  if (st.sub === "patchmaker") return renderPatchMaker(ctx, { backTo: "dev", backLabel: "개발" });
  if (!st.devAll) replace(ctx.main, loading("개발 목록을 불러오는 중", { rows: 5 }));
  const all = await loadAll(ctx);
  const ps = projects(ctx);
  ctx.setNavCount("dev", ps.length || void 0);
  if (!st.devSel || !ps.some((p) => keyOf(p) === st.devSel)) st.devSel = ps[0] ? keyOf(ps[0]) : null;
  const list = h("div", { class: "rb-list rb-scroll", role: "listbox", "aria-label": "개발 목록" });
  const lazy = ctx.assets.lazy(list);
  const row2 = (p) => {
    const t = targetOf(all, p);
    const meta = rowMeta(p);
    const pic = p.kind === "character" && t?.image ? h("img", { alt: "", dataset: { path: t.image, ext: "png" }, style: "width:36px;height:36px;border-radius:10px;object-fit:cover;background:var(--rb-surf2);flex-shrink:0" }) : h("span", { style: "width:36px;height:36px;border-radius:10px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon(p.kind === "module" ? "module" : "character", 18));
    if (pic.tagName === "IMG") lazy.observe(pic);
    const r = h(
      "div",
      {
        class: ["rb-row", !t && "off"],
        role: "option",
        tabindex: "0",
        "aria-selected": st.devSel === keyOf(p) ? "true" : "false",
        dataset: { id: keyOf(p) },
        onClick: () => {
          st.devSel = keyOf(p);
          list.querySelectorAll(".rb-row").forEach((x) => x.setAttribute("aria-selected", "false"));
          r.setAttribute("aria-selected", "true");
          detail(ctx, all, p);
          if (ctx.isMobile()) ctx.openSheet();
        },
        onKeydown: (ev) => {
          if (ev.target === r && (ev.key === "Enter" || ev.key === " ")) {
            ev.preventDefault();
            r.click();
          }
        }
      },
      pic,
      h(
        "div",
        { class: "txt" },
        h("div", { class: "ttl" }, h("span", { class: "name" }, t?.name || "(찾을 수 없음)"), !t && badge("없음", "warn"), t && p.kind === "module" && !t.enabled && badge("꺼짐", "mute")),
        h("span", { class: "meta" }, meta)
      )
    );
    return r;
  };
  for (const kind of ["module", "character"]) {
    const mine = ps.filter((p) => p.kind === kind);
    if (!mine.length) continue;
    list.appendChild(h("div", { class: "rb-label", style: "padding:12px 12px 4px" }, `${KIND_KO[kind]} ${mine.length}`));
    for (const p of mine) list.appendChild(row2(p));
  }
  if (!ps.length) list.appendChild(h(
    "div",
    { class: "rb-card pad bordered", style: "margin:12px;display:flex;flex-direction:column;gap:10px" },
    h("b", null, "개발 중인 모듈·봇을 모아 두는 곳이에요"),
    h("span", { class: "rb-muted", style: "white-space:normal" }, '"추가"로 이미 있는 모듈·봇을 고르거나, "새 모듈"·"새 봇"으로 바로 만들어요. 여기 넣은 것만 모아서 버전·배포 기준·검사·테스트·패치를 관리해요. 목록에서 빼도 모듈·봇은 그대로예요.'),
    h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, btn("추가", { size: "sm", icon: "plus", onClick: () => pickProjects(ctx) }), btn("새 모듈", { size: "sm", icon: "module", onClick: () => newDevModule(ctx) }), btn("새 봇", { size: "sm", icon: "character", onClick: () => newDevBot(ctx) }))
  ));
  const keep = ctx.main.querySelector(".rb-list")?.scrollTop ?? 0;
  replace(
    ctx.main,
    h(
      "div",
      { class: "rb-chips", role: "toolbar", "aria-label": "개발" },
      h("span", { class: "rb-muted", style: "white-space:nowrap;flex-shrink:0" }, `개발 중 ${ps.length}개${all.unloaded ? ` · 앱이 아직 불러오는 중인 봇 ${all.unloaded}명` : ""}`),
      h("div", { class: "rb-spacer" }),
      btn("추가", { size: "sm", icon: "plus", onClick: () => pickProjects(ctx), id: "rb-dev-add" }),
      btn("새로 만들기", { size: "sm", icon: "plus", onClick: (e) => openMenu(ctx.win, e.currentTarget, [
        { label: "새 모듈", icon: "module", onClick: () => newDevModule(ctx) },
        { label: "새 봇", icon: "character", onClick: () => newDevBot(ctx) }
      ]), id: "rb-dev-new" }),
      btn("패치 만들기", { size: "sm", kind: "primary", icon: "code", onClick: () => ctx.go("dev", "patchmaker"), id: "rb-dev-pm" }),
      iconBtn("refresh", "새로 고침", { onClick: async () => {
        await loadAll(ctx, true);
        renderDev(ctx);
      } })
    ),
    list
  );
  list.scrollTop = keep;
  const sel = ps.find((p) => keyOf(p) === st.devSel);
  if (sel) detail(ctx, all, sel);
  else ctx.showDetail(h("div", { class: "rb-empty" }, "개발 중인 모듈·봇을 고르면 여기에 도구가 나와요."));
}
async function pickProjects(ctx) {
  const all = await loadAll(ctx, true);
  const mine = new Set(projects(ctx).map(keyOf));
  const items = [
    ...[...all.mods.values()].map((m) => ({ id: `m:${m.id}`, label: m.name, sub: `모듈${m.enabled ? "" : " · 꺼짐"}` })),
    ...[...all.chars.values()].map((c) => ({ id: `c:${c.id}`, label: c.name, sub: `봇${c.creator ? ` · 제작자 ${c.creator}` : ""}` }))
  ].filter((x) => !mine.has(x.id));
  const r = await folderDialog(ctx.win, { title: "개발 목록에 넣기", items, ok: "넣기", withName: false, noun: "모듈·봇" });
  if (!r?.ids.length) return;
  const n = await addProjects(ctx, r.ids.map((k) => ({ kind: k.startsWith("m:") ? "module" : "character", id: k.slice(2) })));
  ctx.state.devSel = r.ids[0];
  ctx.toast(`${n}개를 개발 목록에 넣었어요`);
  renderDev(ctx);
}
async function newDevModule(ctx) {
  const n = await promptDialog(ctx.win, { title: "새 개발 모듈", label: "모듈 이름", placeholder: "예: 내 세계관" });
  if (!n?.trim()) return;
  const m = ctx.svc.newModule(n.trim());
  try {
    await ctx.svc.run("create", m);
    await addProjects(ctx, [{ kind: "module", id: m.id }]);
    ctx.state.modDirty = true;
    ctx.state.devSel = `m:${m.id}`;
    await loadAll(ctx, true);
    ctx.toast(`'${m.name}' 모듈을 만들고 개발 목록에 넣었어요`);
    renderDev(ctx);
  } catch (e) {
    ctx.toast(`만들지 못했어요: ${e?.message ?? e}`, { error: true });
  }
}
async function newDevBot(ctx) {
  const n = await promptDialog(ctx.win, { title: "새 개발 봇", label: "봇 이름", placeholder: "예: 테스트 봇" });
  if (!n?.trim()) return;
  try {
    const db = await ctx.api.getDatabase(["characters"]);
    const chars = db?.characters;
    if (!Array.isArray(chars)) throw new Error("앱이 아직 봇 목록을 불러오는 중이에요. 잠시 뒤 다시 해 주세요.");
    if (chars.some(isGenerating)) throw new Busy();
    const c = newCharacterBase({});
    c.name = uniqueDisplayName(n.trim(), chars);
    c.firstMessage = "";
    c.desc = "";
    c.image = "";
    chars.push(c);
    await ctx.api.setDatabaseLite({ characters: chars });
    try {
      await ctx.api.checkCharOrder();
    } catch {
    }
    await addProjects(ctx, [{ kind: "character", id: c.chaId }]);
    ctx.state.charsDirty = true;
    ctx.state.devSel = `c:${c.chaId}`;
    await loadAll(ctx, true);
    ctx.toast(`'${c.name}' 봇을 만들고 개발 목록에 넣었어요`);
    renderDev(ctx);
  } catch (e) {
    ctx.toast(e instanceof Busy ? "다른 봇이 응답을 생성하는 중이에요. 끝난 뒤 다시 해 주세요." : `만들지 못했어요: ${e?.message ?? e}`, { error: true });
  }
}
function card(title, ...children) {
  return h("div", { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:10px" }, typeof title === "string" ? h("b", null, title) : title, ...children);
}
function detail(ctx, all, p) {
  const st = ctx.state;
  const t = targetOf(all, p);
  const remove = btn("개발 목록에서 빼기", { size: "sm", icon: "x", onClick: async () => {
    await saveProjects(ctx, (ps) => {
      const i = ps.findIndex((x) => x.kind === p.kind && x.id === p.id);
      if (i >= 0) ps.splice(i, 1);
    });
    ctx.toast(`개발 목록에서 뺐어요. ${KIND_KO[p.kind]}은(는) 그대로예요.`);
    renderDev(ctx);
  } });
  if (!t) {
    ctx.showDetail(h("h2", { class: "rb-h2" }, "(찾을 수 없음)"), note("warn", `이 ${KIND_KO[p.kind]}을(를) 찾지 못했어요. 지워졌거나 앱이 아직 불러오는 중이에요.`), h("div", null, remove));
    return;
  }
  const body = h("div", { style: "display:flex;flex-direction:column;gap:12px" }, loading("불러오는 중"));
  ctx.showDetail(
    h("div", { style: "display:flex;flex-direction:column;gap:4px" }, h("span", { style: "font-size:12px;color:var(--rb-acc-text)" }, `개발 중인 ${KIND_KO[p.kind]}`), h("h2", { class: "rb-h2" }, t.name || "(이름 없음)")),
    body
  );
  const my = st.devToken = (st.devToken ?? 0) + 1;
  (async () => {
    const obj = await fullOf(ctx, all, p);
    if (my !== st.devToken) return;
    const view = projView(p.kind, obj);
    const s = devStats(view);
    const stat = (label, v) => h("div", { class: "rb-stat" }, h("small", null, label), h("b", null, String(v)));
    replace(
      body,
      versionCard(ctx, p),
      h("div", { class: "rb-stats" }, stat("로어북", s.lore), stat("정규식", s.regex), stat("트리거", s.trigger), stat("항상 켜짐", `약 ${s.alwaysTokens.toLocaleString()} 토큰`)),
      actions(ctx, all, p, obj),
      baseCard(ctx, all, p, obj),
      lintCard(ctx, p, obj, view),
      testCard(ctx, p, view),
      affCard(ctx, p.kind === "character" ? { kind: "character", i: t.i } : { kind: "module", id: p.id }),
      releaseCard(ctx, p, t),
      h("div", null, remove)
    );
  })().catch((e) => {
    if (my === st.devToken) replace(body, note("err", e?.message ?? String(e)), h("div", null, remove));
  });
}
function versionCard(ctx, p) {
  const inp = h("input", { class: "rb-input", value: p.version ?? "", placeholder: "예: 1.0", "aria-label": "개발 버전", id: "rb-dev-version", style: "height:38px" });
  const last2 = p.releases?.[0]?.version;
  const suggest = () => nextVersion(last2 || inp.value.trim() || p.version);
  const nextBtn = btn("", { size: "sm", onClick: () => {
    inp.value = suggest();
    save();
    ctx.toast(`버전을 ${inp.value}(으)로 바꿨어요`);
  } });
  const paintNext = () => {
    const v = suggest();
    nextBtn.textContent = `다음: ${v}`;
    nextBtn.hidden = v === inp.value.trim();
  };
  const save = () => {
    const v = inp.value.trim();
    p.version = v;
    paintNext();
    const meta = ctx.main.querySelector(`.rb-row[data-id="${CSS.escape(keyOf(p))}"] .meta`);
    if (meta) meta.textContent = rowMeta(p);
    return saveProjects(ctx, (ps) => {
      const x = ps.find((y) => y.kind === p.kind && y.id === p.id);
      if (x) x.version = v;
    });
  };
  inp.addEventListener("change", save);
  inp.addEventListener("input", paintNext);
  paintNext();
  return card(
    h("div", { style: "display:flex;align-items:center;gap:8px" }, h("b", { style: "flex:1" }, "개발 버전"), last2 ? h("span", { class: "rb-muted" }, `마지막 배포 v${last2}`) : null),
    h("div", { style: "display:flex;gap:8px" }, h("div", { style: "flex:1" }, inp), nextBtn),
    h("span", { class: "rb-muted", style: "white-space:normal" }, "패치를 만들 때 이 버전이 미리 채워지고, 만든 뒤에는 릴리스 기록에 남아요.")
  );
}
var rowMeta = (p) => {
  const rel = p.releases?.[0];
  return [p.version ? `v${p.version}` : "버전 없음", rel ? `패치 ${p.releases.length}번 · 최근 ${fmtWhen(rel.t)}` : "아직 패치 없음"].join(" · ");
};
function actions(ctx, all, p, obj) {
  const t = targetOf(all, p);
  const edit = () => (p.kind === "module" ? ctx.openEditor(p.id) : openCharEditor(ctx, t.i, p.id)).catch?.((e) => ctx.toast(e?.message ?? String(e), { error: true }));
  const assets = () => (p.kind === "module" ? ctx.openAssets(p.id) : openCharAssets(ctx, t.i, p.id)).catch?.((e) => ctx.toast(e?.message ?? String(e), { error: true }));
  const checkpoint = async () => {
    const n = await promptDialog(ctx.win, { title: "체크포인트 저장", label: "메모 (도구 → 기록에 보여요)", value: p.version ? `v${p.version} 작업 중` : "작업 중", ok: "저장" });
    if (n === null) return;
    try {
      const fresh = await fullOf(ctx, all, p);
      await createStore(ctx.api).addBackup({ kind: p.kind, target: p.id, name: fresh.name, snapshot: p.kind === "module" ? fresh : backupSnapshot("character", fresh), note: `체크포인트${n.trim() ? ` · ${n.trim()}` : ""}` });
      ctx.toast("체크포인트를 저장했어요. 도구 → 기록에서 언제든 이 상태로 되돌릴 수 있어요.");
    } catch (e) {
      ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  };
  const exportFull = async () => {
    const tt = ctx.toast(".risum 만드는 중…", { seconds: 120 });
    try {
      const m = await fullOf(ctx, all, p);
      const bytes = await buildRisum(m, (path) => ctx.assets.read(path));
      tt.close();
      download(`${safeFileName(m.name)}${p.version ? `_v${safeFileName(p.version)}` : ""}.risum`, bytes, "application/octet-stream");
      ctx.toast(`전체 파일을 만들었어요 (${fmtBytes(bytes.size)})`);
    } catch (e) {
      tt.close();
      ctx.toast(`만들지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  };
  const fail = (e) => ctx.toast(e instanceof Busy ? "봇이 응답을 생성하는 중이에요. 끝난 뒤 다시 해 주세요." : `하지 못했어요: ${e?.message ?? e}`, { error: true });
  const save = async (res, cur) => {
    if (p.kind === "module") {
      await ctx.svc.run("update", p.id, changedKeys(cur, res));
      ctx.state.modDirty = true;
      return;
    }
    if (isGenerating(await fullOf(ctx, all, p))) throw new Busy();
    await ctx.api.setCharacterToIndex(t.i, res);
    ctx.state.charsDirty = true;
  };
  const importLists = async () => {
    const [f] = await pickFiles({ accept: ".json,application/json" });
    if (!f) return;
    let lists;
    try {
      lists = parseListFile(await f.text());
    } catch (e) {
      ctx.toast(e?.message ?? String(e), { error: true });
      return;
    }
    const pick = await listImportDialog(ctx, lists, f.name);
    if (!pick) return;
    try {
      const cur = await fullOf(ctx, all, p);
      if (p.kind === "character" && isGenerating(cur)) throw new Busy();
      const chosen = Object.fromEntries(Object.entries(lists).filter(([k]) => pick.keys.includes(k)));
      const { next, stat } = applyListImport(p.kind, cur, chosen, pick.mode);
      await createStore(ctx.api).addBackup({ kind: p.kind, target: p.id, name: cur.name, snapshot: p.kind === "module" ? cur : backupSnapshot("character", cur), note: "파일 불러오기 전", summary: f.name });
      await save({ ...cur, ...next }, cur);
      const msg = Object.entries(stat).map(([k, s2]) => pick.mode === "replace" ? `${LIST_KO[k]} ${s2.added}개로 교체` : `${LIST_KO[k]} 바꿈 ${s2.updated} · 추가 ${s2.added}`).join(" / ");
      ctx.toast(`불러왔어요: ${msg}. 이전 상태는 도구 → 기록에 있어요.`);
      await loadAll(ctx, true);
      renderDev(ctx);
    } catch (e) {
      fail(e);
    }
  };
  const builtToPatch = async () => {
    const w = await pickWork(ctx, p.kind);
    if (!w) return;
    try {
      const key = keyOf(p);
      const base = await createStore(ctx.api).getBaseline(key);
      if (!await okIdentity(ctx, p.kind, base ?? await fullOf(ctx, all, p), w.obj)) return;
      ctx.state.pm = { ...ctx.state.pm ?? {}, src: "risu", kind: p.kind, target: p.kind === "module" ? { kind: "module", key, id: p.id, name: t.name } : { kind: "character", key, i: t.i, chaId: p.id, name: t.name }, q: "", curFile: { key, work: w }, version: "" };
      ctx.go("dev", "patchmaker");
    } catch (e) {
      fail(e);
    }
  };
  const exportList = (k) => async () => {
    try {
      const fresh = await fullOf(ctx, all, p);
      download(`${safeFileName(fresh.name)}_${LIST_KO[k]}.json`, listExportText(p.kind, fresh, k), "application/json");
    } catch (e) {
      fail(e);
    }
  };
  const exportModJson = async () => {
    try {
      const m = await fullOf(ctx, all, p);
      download(`${safeFileName(m.name)}${p.version ? `_v${safeFileName(p.version)}` : ""}.json`, moduleJson(m), "application/json");
    } catch (e) {
      fail(e);
    }
  };
  const exportCharx = async () => {
    const tt = ctx.toast(".charx 만드는 중…", { seconds: 300 });
    try {
      const c = await fullOf(ctx, all, p);
      const bytes = await buildCharx(c, (path) => ctx.assets.read(path));
      tt.close();
      download(`${safeFileName(c.name)}${p.version ? `_v${safeFileName(p.version)}` : ""}.charx`, bytes, "application/octet-stream");
      ctx.toast(`봇 카드를 만들었어요 (${fmtBytes(bytes.size)})`);
    } catch (e) {
      tt.close();
      fail(e);
    }
  };
  const importMenu = (e) => openMenu(ctx.win, e.currentTarget, [
    { label: "로어북·정규식·트리거 (.json)…", icon: "upload", onClick: importLists },
    { label: p.kind === "module" ? "조립한 모듈과 비교해 패치…" : "조립한 봇 카드와 비교해 패치…", icon: "code", onClick: builtToPatch },
    { label: "파일 두 개로 패치…", icon: "code", onClick: () => {
      ctx.state.pm = { ...ctx.state.pm ?? {}, src: "files", kind: p.kind, version: "" };
      ctx.go("dev", "patchmaker");
    } }
  ]);
  const exportMenu = (e) => openMenu(ctx.win, e.currentTarget, [
    { label: "로어북 (.json)", icon: "download", onClick: exportList("lore") },
    { label: "정규식 (.json)", icon: "download", onClick: exportList("regex") },
    { label: "트리거 (.json)", icon: "download", onClick: exportList("trigger") },
    "sep",
    ...p.kind === "module" ? [{ label: "모듈 .json", icon: "download", onClick: exportModJson }, { label: ".risum 전체", icon: "download", onClick: exportFull }] : [{ label: "봇 카드 .charx", icon: "download", onClick: exportCharx }]
  ]);
  return h(
    "div",
    { style: "display:flex;gap:8px;flex-wrap:wrap" },
    btn("편집", { kind: "primary", icon: "edit", onClick: edit, id: "rb-dev-edit" }),
    btn("에셋", { icon: "image", onClick: assets }),
    btn("체크포인트", { icon: "check", onClick: checkpoint, id: "rb-dev-checkpoint" }),
    btn("불러오기", { icon: "upload", onClick: importMenu, id: "rb-dev-import" }),
    btn("내보내기", { icon: "download", onClick: exportMenu, id: "rb-dev-export" })
  );
}
function listImportDialog(ctx, lists, fileName) {
  const keys = new Set(Object.keys(lists));
  let mode = "merge";
  const DESC = { merge: "이름·키가 같은 항목은 파일 내용으로 바꾸고, 새 항목은 뒤에 붙여요. 파일에 없는 기존 항목은 남아요.", replace: "고른 목록을 통째로 파일 내용으로 바꿔요. 파일에 없는 기존 항목은 지워져요." };
  const desc = h("span", { class: "rb-muted", style: "white-space:normal" }, DESC[mode]);
  return modal(ctx.win, (done) => h(
    "div",
    { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "파일 불러오기" },
    h("h3", { class: "rb-h3" }, "무엇을 불러올까요?"),
    h("span", { class: "rb-muted" }, fileName),
    ...Object.entries(lists).map(([k, arr]) => {
      const cb = h("input", { type: "checkbox", checked: true });
      cb.addEventListener("change", () => cb.checked ? keys.add(k) : keys.delete(k));
      return h("label", { style: "display:flex;gap:8px;align-items:center" }, cb, `${LIST_KO[k]} ${arr.length}개`);
    }),
    h("span", { class: "rb-label" }, "방식"),
    segmented([["merge", "합치기"], ["replace", "전체 덮어쓰기"]], mode, (v) => {
      mode = v;
      desc.textContent = DESC[v];
    }, "불러오기 방식"),
    desc,
    h("span", { class: "rb-muted" }, "불러오기 전 상태는 자동으로 백업해요."),
    h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn("불러오기", { kind: "primary", onClick: () => {
      if (keys.size) done({ keys: [...keys], mode });
    } }))
  ));
}
function baseCard(ctx, all, p, obj) {
  const store = createStore(ctx.api);
  const st = h("div", { class: "rb-muted" }, "배포 기준과 비교하는 중…");
  const head = h("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, h("b", { style: "flex:1" }, "배포 기준"));
  const go = () => {
    const t = targetOf(all, p);
    ctx.state.pm = { ...ctx.state.pm ?? {}, kind: p.kind, target: p.kind === "module" ? { kind: "module", key: keyOf(p), id: p.id, name: t.name } : { kind: "character", key: keyOf(p), i: t.i, chaId: p.id, name: t.name }, q: "", version: p.version || nextVersion(p.releases?.[0]?.version) };
    ctx.go("dev", "patchmaker");
  };
  const btns = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" });
  (async () => {
    const [info, base] = await Promise.all([store.baselineInfo(keyOf(p)), store.getBaseline(keyOf(p))]);
    const setBase = btn(base ? "지금 상태를 새 기준으로" : "지금 상태를 기준으로 표시", { size: "sm", icon: "check", id: "rb-dev-setbase", onClick: async () => {
      if (base && !await confirmDialog(ctx.win, { title: "지금 상태를 배포 기준으로 할까요?", body: "이후 고친 부분만 다음 패치에 들어가요. 아직 패치로 내보내지 않은 변경은 기준에 묻혀요.", ok: "기준으로 표시" })) return;
      await store.setBaseline(keyOf(p), baseViewOf(p.kind, await fullOf(ctx, all, p)));
      ctx.toast("지금 상태를 배포 기준으로 기록했어요");
      renderDev(ctx);
    } });
    if (!base) {
      head.appendChild(badge("없음", "warn"));
      replace(st, "아직 배포 기준이 없어요. 사람들에게 올린 파일과 같은 상태일 때 기준으로 표시해 두면, 그 뒤에 고친 것만 패치로 만들 수 있어요.");
      replace(btns, setBase);
      return;
    }
    head.appendChild(badge(`기록됨 · ${fmtWhen(info?.t)}`, "ok"));
    const patch = await buildPatch({ kind: p.kind, name: obj.name, namespace: obj.namespace ?? obj.moduleNamespace, base, current: obj, readAsset: async () => null, includeAssets: false });
    const n = patch ? planPatch(patch, base).items.length : 0;
    head.appendChild(badge(n ? `바뀐 곳 ${n}` : "바뀐 곳 없음", n ? "acc" : "mute"));
    replace(st, n ? `기준 뒤로 ${n}곳을 고쳤어요. 패치 크기 약 ${fmtBytes(new Blob([JSON.stringify(patch)]).size)} (에셋 제외).` : "기준과 같아요. 고친 뒤 다시 보면 바뀐 곳이 나와요.");
    replace(btns, n ? btn("패치 만들기", { size: "sm", kind: "primary", icon: "code", onClick: go, id: "rb-dev-makepatch" }) : null, setBase);
  })().catch((e) => replace(st, `비교하지 못했어요: ${e?.message ?? e}`));
  return card(head, st, btns);
}
function lintCard(ctx, p, obj, view) {
  const base = validateModule({ name: view.name, lorebook: view.lore, regex: view.regex, trigger: view.trigger, mcp: obj.mcp });
  const items = [...base, ...devLint(view)];
  const lv = { err: ["오류", "danger"], warn: ["주의", "warn"], info: ["참고", "mute"] };
  const errs = items.filter((x) => x.level === "err").length, warns = items.filter((x) => x.level === "warn").length;
  const head = h(
    "div",
    { style: "display:flex;align-items:center;gap:8px" },
    h("b", { style: "flex:1" }, "검사"),
    items.length ? badge(`오류 ${errs} · 주의 ${warns} · 참고 ${items.length - errs - warns}`, errs ? "danger" : warns ? "warn" : "mute") : badge("문제 없음", "ok")
  );
  return card(
    head,
    items.length ? h(
      "div",
      { id: "rb-dev-lint", style: "display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto" },
      ...items.slice(0, 120).map((x) => h("div", { style: "display:flex;gap:8px;align-items:flex-start" }, badge(...lv[x.level]), h("span", { style: "white-space:normal;font-size:13px" }, x.msg)))
    ) : h("span", { class: "rb-muted" }, "빈 키, 정규식 오류, 쓰이지 않는 항목, 늘 켜지는 실수 키 같은 문제가 없어요."),
    h("span", { class: "rb-muted", style: "white-space:normal" }, "편집기에서 저장할 때도 같은 검사를 해요.")
  );
}
function testCard(ctx, p, view) {
  const st = ctx.state;
  st.devTest ??= { tab: "lore", text: "", mode: "editoutput", recursive: false };
  const T = st.devTest;
  const input = h("textarea", { class: "rb-textarea", style: "min-height:90px", placeholder: "", "aria-label": "테스트 문장", id: "rb-dev-test-input" });
  input.value = T.text;
  const out = h("div", { style: "display:flex;flex-direction:column;gap:6px", id: "rb-dev-test-out" });
  const opts = h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" });
  const run = () => {
    T.text = input.value;
    if (T.tab === "lore") {
      input.placeholder = "최근 대화를 붙여 넣으면 켜지는 로어북 항목을 보여 줘요";
      const res = loreActivation(view.lore, input.value, { recursive: T.recursive });
      const chars = res.reduce((n, r) => n + String(r.entry.content ?? "").length, 0);
      replace(
        out,
        h("span", { class: "rb-muted" }, `켜지는 항목 ${res.length}개 · 약 ${Math.round(chars / 2.5).toLocaleString()} 토큰`),
        ...res.slice(0, 80).map((r) => h(
          "div",
          { style: "display:flex;gap:8px;align-items:center;min-width:0" },
          badge(r.reason, r.reason.startsWith("빈 키") ? "warn" : r.reason.startsWith("키") ? "acc" : "mute"),
          h("span", { style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, r.entry.comment || r.entry.key || `#${r.index + 1}`)
        ))
      );
    } else {
      input.placeholder = "응답 예시를 넣으면 정규식을 순서대로 적용한 결과를 보여 줘요";
      const res = regexRun(view.regex, input.value, T.mode);
      replace(
        out,
        h("span", { class: "rb-muted" }, `적용된 스크립트 ${res.steps.filter((s) => s.matched && !s.skipped && !s.error).length}개 / 이 종류 ${res.steps.length}개`),
        ...res.steps.filter((s) => s.matched || s.error || s.skipped).slice(0, 60).map((s) => h(
          "div",
          { style: "display:flex;gap:8px;align-items:flex-start" },
          badge(s.error ? "오류" : s.skipped ? "건너뜀" : `${s.matched}곳`, s.error ? "danger" : s.skipped ? "mute" : "acc"),
          h("span", { style: "white-space:normal;font-size:13px" }, s.comment, s.error || s.skipped ? h("small", { class: "rb-muted" }, ` — ${s.error ?? s.skipped}`) : null)
        )),
        h("span", { class: "rb-label" }, "결과"),
        h("pre", { style: "margin:0;padding:10px 12px;border-radius:10px;background:var(--rb-surf);white-space:pre-wrap;word-break:break-word;font-size:12px;max-height:200px;overflow:auto" }, res.out || " ")
      );
    }
  };
  const paintOpts = () => {
    if (T.tab === "lore") {
      const cb = h("input", { type: "checkbox", checked: T.recursive });
      cb.addEventListener("change", () => {
        T.recursive = cb.checked;
        run();
      });
      replace(opts, h("label", { class: "rb-check", style: "display:flex;gap:6px;align-items:center" }, cb, "재귀 검색 (켜진 항목 내용으로 다시 찾기)"));
    } else {
      replace(opts, segmented([["editinput", "입력"], ["editoutput", "출력"], ["editprocess", "요청"], ["editdisplay", "표시"]], T.mode, (v) => {
        T.mode = v;
        run();
      }, "정규식 종류"));
    }
  };
  let timer = 0;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });
  paintOpts();
  run();
  return card(
    h("div", { style: "display:flex;align-items:center;gap:8px" }, h("b", { style: "flex:1" }, "테스트")),
    segmented([["lore", "로어북 활성"], ["regex", "정규식"]], T.tab, (v) => {
      T.tab = v;
      paintOpts();
      run();
    }, "테스트 종류"),
    opts,
    input,
    out,
    h("span", { class: "rb-muted", style: "white-space:normal" }, "RisuAI 규칙대로 미리 돌려 봐요. CBS({{…}})·트리거·확률처럼 채팅 중에만 정해지는 것은 계산하지 않아요.")
  );
}
function releaseCard(ctx, p, t) {
  const rels = p.releases ?? [];
  const md = () => rels.map((r) => `## v${r.version || "?"} (${new Date(r.t).toLocaleDateString()})
${(r.note || "").trim() || "- (변경 내용 없음)"}`).join("\n\n");
  return card(
    h("div", { style: "display:flex;align-items:center;gap:8px" }, h("b", { style: "flex:1" }, "릴리스 기록"), badge(`${rels.length}번`, rels.length ? "acc" : "mute")),
    rels.length ? h(
      "div",
      { style: "display:flex;flex-direction:column;gap:8px;max-height:240px;overflow:auto", id: "rb-dev-releases" },
      ...rels.slice(0, 30).map((r) => h(
        "div",
        { style: "display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:10px;background:var(--rb-surf)" },
        h("div", { style: "display:flex;gap:8px;align-items:center" }, h("b", null, `v${r.version || "?"}`), h("span", { class: "rb-muted" }, fmtWhen(r.t)), r.size ? h("span", { class: "rb-muted", style: "margin-left:auto" }, fmtBytes(r.size)) : null),
        r.note ? h("span", { style: "white-space:pre-line;font-size:13px" }, r.note) : null
      ))
    ) : h("span", { class: "rb-muted", style: "white-space:normal" }, "패치를 만들면 버전·변경 내용·크기가 여기에 쌓여요."),
    rels.length ? h(
      "div",
      { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("변경 기록 복사", { size: "sm", icon: "link", onClick: async () => ctx.toast(await copyText(md()) ? "마크다운으로 복사했어요. 배포글에 붙여 넣으세요." : "복사하지 못했어요") }),
      btn("CHANGELOG.md", { size: "sm", icon: "download", onClick: () => download(`${safeFileName(t.name)}_CHANGELOG.md`, `# ${t.name} 변경 기록

${md()}
`, "text/markdown") })
    ) : null
  );
}
