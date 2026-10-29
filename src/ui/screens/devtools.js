import { buildPatch, changedAssetPaths, planPatch, viewKeys } from '../../engine/patch.js';
import { nextVersion } from '../../engine/devcheck.js';
import { findProject, recordRelease } from './dev.js';
import { pickView } from '../../engine/merge3.js';
import { createStore } from '../../engine/store.js';
import { safeFileName } from '../../engine/export.js';
import { loadCharacters } from '../../data/modules.js';
import { download, fmtBytes, fmtWhen, h, pickFiles, replace } from '../dom.js';
import { WORK_ACCEPT, identityDiff, readWorkFile } from '../../engine/devfile.js';
import { icon } from '../icons.js';
import { badge, btn, confirmDialog, loading, note, segmented, switchEl } from '../kit.js';

export var isDev = (ctx) => !!ctx.prefs.ui?.devMode;
var SKIP_CHAR = ["loreCache", "lowLevelHistory", "chatPage", "chats"];
export function baseViewOf(kind, obj) {
  const v = pickView(obj, viewKeys(kind, kind === "module" ? null : obj));
  if (kind === "character") for (const k of SKIP_CHAR) delete v[k];
  return v;
}
var GROUP = { field: "정보", lorebook: "로어북", regex: "정규식", trigger: "트리거", assets: "에셋", globalLore: "로어북", customscript: "정규식", triggerscript: "트리거", emotionImages: "감정 이미지", additionalAssets: "에셋" };
var KIND = { update: ["수정", "acc"], added: ["추가", "ok"], removed: ["삭제", "danger"], conflict: ["수정", "acc"], mine: ["수정", "acc"] };
export function devToggleCard(ctx, onChange) {
  const on = isDev(ctx);
  return h(
    "div",
    { class: "rb-card pad bordered", style: "display:flex;gap:14px;align-items:center;margin-bottom:14px", id: "rb-devmode" },
    h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon("code", 20)),
    h(
      "div",
      { style: "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px" },
      h("b", null, "개발자 모드"),
      h("span", { class: "rb-muted", style: "white-space:normal" }, "켜면 캐릭터·모듈 화면에 오른쪽 상세 패널과 패치·개발 목록 기능, 메뉴에 개발 탭이 생겨요.")
    ),
    switchEl(on, { label: "개발자 모드", onChange: async (v) => {
      await ctx.prefs.saveUi({ devMode: v });
      ctx.toast(v ? "개발자 모드를 켰어요" : "개발자 모드를 껐어요");
      onChange?.();
    } })
  );
}
async function loadTargets(ctx) {
  const { entries } = await ctx.svc.load();
  const mods = entries.map((e) => ({ kind: "module", key: `m:${e.module.id}`, id: e.module.id, name: e.module.name ?? "", sub: e.module.namespace || "" }));
  const db = await ctx.api.getDatabase(["characters"]);
  db.characters = (await loadCharacters(ctx.api, db?.characters)).list;
  const chars = (db?.characters ?? []).map((c, i) => c && !c.trashTime && c.type !== "group" ? { kind: "character", key: `c:${c.chaId}`, i, chaId: c.chaId, name: c.name ?? "", sub: c.creator ? `제작자 ${c.creator}` : "" } : null).filter(Boolean);
  return { mods, chars };
}
async function currentOf(ctx, t) {
  if (t.kind === "module") {
    const m = (await ctx.svc.load({ fresh: true })).entries.find((e) => e.module.id === t.id)?.module;
    if (!m) throw new Error("모듈을 다시 찾지 못했어요");
    return m;
  }
  const c = await ctx.api.getCharacterFromIndex(t.i);
  if (!c || c.chaId !== t.chaId) throw new Error("봇을 다시 찾지 못했어요. 목록을 새로 고쳐 주세요.");
  return c;
}
// 작업본 파일 고르기 (리스 DB에는 넣지 않음)
export async function pickWork(ctx, kind) {
  const [f] = await pickFiles({ accept: WORK_ACCEPT[kind] });
  if (!f) return null;
  const tt = ctx.toast(`${f.name} 읽는 중…`, { seconds: 120 });
  try {
    const w = await readWorkFile(f, kind);
    tt.close();
    return w;
  } catch (e) {
    tt.close();
    ctx.toast(`읽지 못했어요: ${e?.message ?? e}`, { error: true });
    return null;
  }
}
// 두 쪽이 서로 다른 대상처럼 보이면 진행할지 묻는다
export async function okIdentity(ctx, kind, base, cur) {
  const d = identityDiff(kind, base, cur);
  if (!d.length) return true;
  return confirmDialog(ctx.win, { title: "서로 다른 대상 같아요", body: `기준과 새 버전이 달라 보여요.
${d.join("\n")}

조립하면서 이름이 바뀐 거라면 그대로 진행해도 돼요. 이 둘을 비교해서 패치를 만들까요?`, ok: "그래도 진행", cancel: "취소" });
}
export async function renderPatchMaker(ctx, { backTo = "dev", backLabel = "개발" } = {}) {
  const st = ctx.state;
  st.pm ??= { kind: "module", target: null, q: "" };
  const pm = st.pm;
  pm.src ??= "risu";
  replace(ctx.main, loading("불러오는 중"));
  const { mods, chars } = await loadTargets(ctx);
  const store = createStore(ctx.api);
  const back = btn(backLabel, { size: "sm", icon: "back", onClick: () => {
    ctx.go(backTo);
  } });
  const pickBox = h("div", { class: "rb-list", style: "max-height:260px;overflow:auto;border:1px solid var(--rb-line);border-radius:14px;padding:6px" });
  const work = h("div", { style: "display:flex;flex-direction:column;gap:14px" });
  const search = h("input", { class: "rb-input", type: "search", placeholder: "이름으로 찾기", value: pm.q, "aria-label": "대상 찾기" });
  const pickWrap = h("div", { style: "display:flex;flex-direction:column;gap:14px" }, search, pickBox);
  const kindKo = () => pm.kind === "module" ? "모듈" : "봇";
  const paintList = () => {
    pickWrap.style.display = pm.src === "files" ? "none" : "flex";
    const list = (pm.kind === "module" ? mods : chars).filter((t) => !pm.q || t.name.toLowerCase().includes(pm.q.toLowerCase()));
    replace(
      pickBox,
      ...list.slice(0, 300).map((t) => h(
        "button",
        { type: "button", class: "rb-row", "aria-selected": pm.target?.key === t.key ? "true" : "false", onClick: () => {
          pm.target = t;
          paintList();
          paintWork();
        } },
        h("span", { style: "display:flex;color:var(--rb-sub)" }, icon(t.kind === "module" ? "module" : "character", 18)),
        h("div", { class: "txt" }, h("span", { class: "name" }, t.name || "(이름 없음)"), t.sub && h("span", { class: "meta" }, t.sub))
      )),
      !list.length && h("div", { class: "rb-empty" }, "없어요")
    );
  };
  search.addEventListener("input", () => {
    pm.q = search.value;
    paintList();
  });
  const cardEl = (...c) => h("div", { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:10px" }, ...c);
  const headEl = (...c) => h("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, ...c);
  const muted = (t) => h("span", { class: "rb-muted", style: "white-space:normal" }, t);
  let token = 0;
  // 바뀐 내용 + 패치 정보 카드. o: { kind, base, cur, getCur, readAsset, proj, onBase?, record? }
  async function compareCards(my, o) {
    const preview = await buildPatch({ kind: o.kind, name: o.cur.name, namespace: o.cur.namespace ?? o.cur.moduleNamespace, base: o.base, current: o.cur, readAsset: async () => null, includeAssets: false });
    if (my !== token) return null;
    const items = preview ? planPatch(preview, o.base).items : [];
    const newAssets = preview?.changes ? [...changedAssetPaths(preview.changes)].length : 0;
    const groups = /* @__PURE__ */ new Map();
    for (const it of items) {
      const g = GROUP[it.group] ?? it.group;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(it);
    }
    const changeCard = h(
      "div",
      { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:10px", id: "rb-pm-changes" },
      h(
        "div",
        { style: "display:flex;align-items:center;gap:8px" },
        h("b", null, "바뀐 내용"),
        badge(`${items.length}곳`, items.length ? "acc" : "mute"),
        preview ? h("span", { class: "rb-muted", style: "margin-left:auto", id: "rb-pm-size" }, `패치 크기 약 ${fmtBytes(new Blob([JSON.stringify(preview)]).size)}${newAssets ? ` + 바뀐 에셋 ${newAssets}개` : ""}`) : null
      ),
      items.length ? h(
        "div",
        { style: "display:flex;flex-direction:column;gap:10px;max-height:320px;overflow:auto" },
        ...[...groups].map(([g, list]) => h(
          "div",
          { style: "display:flex;flex-direction:column;gap:4px" },
          h("span", { class: "rb-label" }, `${g} (${list.length})`),
          ...list.slice(0, 200).map((it) => h("div", { style: "display:flex;gap:8px;align-items:center;min-width:0" }, badge(...KIND[it.kind] ?? [it.kind, "mute"]), h("span", { style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, String(it.label ?? it.id)))),
          list.length > 200 ? h("span", { class: "rb-muted" }, `외 ${list.length - 200}곳`) : null
        ))
      ) : h("span", { class: "rb-muted" }, "기준과 달라진 내용이 없어요.")
    );
    if (!items.length) return [changeCard];
    const proj = o.proj;
    if (!pm.version && proj) pm.version = proj.version && proj.version !== proj.releases?.[0]?.version ? proj.version : nextVersion(proj.releases?.[0]?.version || proj.version);
    if (!pm.version && !proj && o.cur.characterVersion) pm.version = String(o.cur.characterVersion);
    const ver = h("input", { class: "rb-input", value: pm.version ?? "", placeholder: "예: 1.1", "aria-label": "버전" });
    const who = h("input", { class: "rb-input", value: pm.author ?? (o.cur.creator ?? ""), placeholder: "제작자 이름", "aria-label": "제작자" });
    const memo = h("textarea", { class: "rb-textarea", placeholder: "받는 사람에게 보여 줄 변경 내용 (적용 전에 보여요)", style: "min-height:90px;font-family:inherit", "aria-label": "변경 내용" });
    memo.value = pm.note ?? "";
    ver.addEventListener("input", () => {
      pm.version = ver.value;
      fname.textContent = fileName();
    });
    who.addEventListener("input", () => {
      pm.author = who.value;
    });
    memo.addEventListener("input", () => {
      pm.note = memo.value;
    });
    let withAssets = pm.withAssets ?? true, moveBase = o.onBase ? pm.moveBase ?? true : false;
    const fileName = () => `${safeFileName(o.cur.name)}${ver.value.trim() ? `_v${safeFileName(ver.value.trim())}` : ""}.rbupatch`;
    const fname = h("code", null, fileName());
    const row2 = (label, desc, on, set) => h(
      "div",
      { style: "display:flex;gap:12px;align-items:center" },
      h("div", { style: "flex:1;min-width:0;display:flex;flex-direction:column" }, h("span", null, label), h("span", { class: "rb-muted", style: "white-space:normal" }, desc)),
      switchEl(on, { label, onChange: (v) => set(v) })
    );
    const make = btn("패치 파일 만들기", { kind: "primary", size: "lg", icon: "download", id: "rb-pm-make", onClick: async () => {
      make.disabled = true;
      const tt = ctx.toast("패치 만드는 중…", { seconds: 120 });
      try {
        const fresh = await o.getCur();
        const patch = await buildPatch({ kind: o.kind, name: fresh.name, namespace: fresh.namespace ?? fresh.moduleNamespace, base: o.base, current: fresh, readAsset: o.readAsset, includeAssets: withAssets, version: ver.value.trim(), note: memo.value.trim(), author: who.value.trim() });
        tt.close();
        if (!patch) {
          ctx.toast("기준과 달라진 내용이 없어요");
          return;
        }
        const text = JSON.stringify(patch);
        download(fileName(), text, "application/json");
        if (moveBase) await o.onBase(fresh);
        const items2 = planPatch(patch, o.base).items.length;
        await o.record?.({ version: ver.value.trim(), note: memo.value.trim(), size: text.length, items: items2, cumulative: !moveBase }).catch(() => {
        });
        pm.version = "";
        pm.note = "";
        ctx.toast(`패치를 만들었어요 (${fmtBytes(text.length)})${moveBase ? " · 새 버전이 다음 기준이에요" : ""}`);
        paintWork();
      } catch (e) {
        tt.close();
        ctx.toast(`만들지 못했어요: ${e?.message ?? e}`, { error: true });
      } finally {
        make.disabled = false;
      }
    } });
    const outCard = cardEl(
      h("b", null, "패치 정보"),
      h(
        "div",
        { class: "rb-form" },
        h("label", { class: "rb-field" }, h("span", { class: "rb-label" }, "버전"), ver),
        h("label", { class: "rb-field" }, h("span", { class: "rb-label" }, "제작자"), who),
        h("label", { class: "rb-field wide" }, h("span", { class: "rb-label" }, "변경 내용"), memo)
      ),
      row2("바뀐 에셋 넣기", "받는 사람이 이미지를 따로 구하지 않아도 돼요. 파일이 커질 수 있어요.", withAssets, (v) => {
        withAssets = pm.withAssets = v;
      }),
      o.onBase ? row2("만든 뒤 새 버전을 다음 기준으로", "다음 패치에는 이번 이후에 고친 것만 들어가요. 끄면 기준이 그대로라 누적 패치가 돼요.", moveBase, (v) => {
        moveBase = pm.moveBase = v;
      }) : null,
      h("div", { class: "rb-muted" }, "파일 이름: ", fname),
      h("div", null, make),
      note("info", '받는 사람은 모듈 메뉴나 봇 상세에서 "패치 적용"을 눌러 이 파일을 고르면 돼요. 받는 사람이 직접 고친 부분은 그대로 남아요.')
    );
    return [changeCard, outCard];
  }
  async function paintFiles(my) {
    const f = pm.files?.kind === pm.kind ? pm.files : pm.files = { kind: pm.kind, base: null, cur: null };
    const pickSide = (side) => async () => {
      const w = await pickWork(ctx, f.kind);
      if (!w) return;
      const other = side === "base" ? f.cur : f.base;
      if (other && !await okIdentity(ctx, f.kind, side === "base" ? w.obj : other.obj, side === "base" ? other.obj : w.obj)) return;
      f[side] = w;
      pm.version = "";
      paintWork();
    };
    const slot = (label, desc, w, side) => cardEl(
      headEl(h("b", null, label), w ? badge(w.fileName, "ok") : badge("없음", "warn")),
      muted(w ? `${w.obj.name || "(이름 없음)"} · ${fmtBytes(w.size)}` : desc),
      w?.notes?.length ? note("warn", w.notes.join("\n")) : null,
      h("div", null, btn(w ? "다른 파일" : "파일 고르기", { size: "sm", icon: "upload", onClick: pickSide(side), id: `rb-pm-f${side}` }))
    );
    const c1 = slot("① 배포한 버전 (기준 파일)", `사람들이 지금 가지고 있는 ${kindKo()} 파일이에요.`, f.base, "base");
    const c2 = slot("② 새 버전 (조립한 파일)", "업데이트를 마친 파일이에요. 리스에 넣지 않고 비교에만 써요.", f.cur, "cur");
    const info = note("info", "두 파일 모두 개발 모드 안에서만 읽어요. 리스의 모듈·봇 목록에는 들어가지 않아요.");
    if (!f.base || !f.cur) {
      replace(work, c1, c2, info);
      return;
    }
    replace(work, c1, c2, h("div", { class: "rb-empty" }, "비교하는 중…"));
    try {
      const parts = await compareCards(my, { kind: f.kind, base: baseViewOf(f.kind, f.base.obj), cur: f.cur.obj, getCur: async () => f.cur.obj, readAsset: f.cur.readAsset, proj: null });
      if (parts) replace(work, c1, c2, ...parts);
    } catch (e) {
      if (my === token) replace(work, c1, c2, note("err", e?.message ?? String(e)));
    }
  }
  async function paintWork() {
    const my = ++token;
    if (pm.src === "files") return paintFiles(my);
    const t = pm.target;
    if (!t) {
      replace(work, h("div", { class: "rb-empty" }, "위에서 패치를 만들 모듈이나 봇을 고르세요."));
      return;
    }
    replace(work, h("div", { class: "rb-empty" }, "비교하는 중…"));
    const fileCur = pm.curFile?.key === t.key ? pm.curFile.work : null;
    const getCur = async () => fileCur ? fileCur.obj : currentOf(ctx, t);
    let cur, risuCur, info, base, backups;
    try {
      [risuCur, info, backups] = await Promise.all([currentOf(ctx, t), store.baselineInfo(t.key), store.listBackups()]);
      cur = fileCur ? fileCur.obj : risuCur;
      base = pm.baseFrom?.key === t.key ? pm.baseFrom.view : info ? await store.getBaseline(t.key) : null;
    } catch (e) {
      if (my === token) replace(work, note("err", e?.message ?? String(e)));
      return;
    }
    if (my !== token) return;
    const targetId = t.kind === "module" ? t.id : t.chaId;
    const mineBackups = backups.filter((b) => b.target === targetId && b.path);
    const setBaseNow = async () => {
      if (base && !await confirmDialog(ctx.win, { title: "리스 안의 지금 상태를 배포 기준으로 할까요?", body: '지금 상태를 "배포한 버전"으로 기록해요. 이후 고친 부분만 패치에 들어가요.', ok: "기준으로 표시" })) return;
      await store.setBaseline(t.key, baseViewOf(t.kind, risuCur));
      pm.baseFrom = null;
      ctx.toast("지금 상태를 배포 기준으로 기록했어요");
      paintWork();
    };
    const loadBaseFile = async () => {
      const w = await pickWork(ctx, t.kind);
      if (!w) return;
      if (!await okIdentity(ctx, t.kind, w.obj, cur)) return;
      pm.baseFrom = { key: t.key, t: Date.now(), view: baseViewOf(t.kind, w.obj), label: w.fileName };
      paintWork();
    };
    const loadCurFile = async () => {
      const w = await pickWork(ctx, t.kind);
      if (!w) return;
      if (!await okIdentity(ctx, t.kind, base ?? risuCur, w.obj)) return;
      pm.curFile = { key: t.key, work: w };
      pm.version = "";
      paintWork();
    };
    const baseFrom = pm.baseFrom?.key === t.key ? pm.baseFrom : null;
    const baseCard2 = cardEl(
      headEl(
        h("b", null, "① 배포한 버전 (기준)"),
        base ? badge(baseFrom ? baseFrom.label ? `파일 · ${baseFrom.label}` : `기록에서 고름 · ${fmtWhen(baseFrom.t)}` : `기록됨 · ${fmtWhen(info?.t)}`, "ok") : badge("없음", "warn")
      ),
      muted(base ? "사람들에게 마지막으로 배포한 상태예요. 이 상태와 새 버전을 비교해서 바뀐 부분만 패치에 담아요." : '아직 기준이 없어요. 배포한 파일이 있으면 "파일에서 기준 불러오기"로 고르세요. 리스 안의 지금 상태가 배포한 그대로라면 "기준으로 표시"를 누르면 돼요.'),
      h(
        "div",
        { style: "display:flex;gap:8px;flex-wrap:wrap" },
        btn("파일에서 기준 불러오기", { size: "sm", icon: "upload", onClick: loadBaseFile, id: "rb-pm-basefile" }),
        btn("지금 상태를 기준으로 표시", { size: "sm", icon: "check", onClick: setBaseNow, id: "rb-pm-setbase" }),
        mineBackups.length ? (() => {
          const sel = h(
            "select",
            { class: "rb-input", style: "height:36px;width:auto;max-width:100%", "aria-label": "기록에서 기준 고르기" },
            h("option", { value: "" }, "기록에서 기준 고르기…"),
            ...mineBackups.map((b) => h("option", { value: b.id }, `${new Date(b.t).toLocaleString()} · ${b.note || "백업"}`))
          );
          sel.addEventListener("change", async () => {
            const rec = mineBackups.find((b) => b.id === sel.value);
            if (!rec) return;
            try {
              const snap = await store.loadBackup(rec);
              pm.baseFrom = { key: t.key, t: rec.t, view: baseViewOf(t.kind, snap) };
              paintWork();
            } catch (e) {
              ctx.toast(`기록을 읽지 못했어요: ${e?.message ?? e}`, { error: true });
            }
          });
          return sel;
        })() : null
      )
    );
    const curCard = cardEl(
      headEl(h("b", null, "② 새 버전 (비교 대상)"), badge(fileCur ? `파일 · ${fileCur.fileName}` : "리스 안의 지금 상태", fileCur ? "acc" : "mute")),
      muted(fileCur ? "불러온 파일은 개발 모드 안에서만 써요. 리스의 봇·모듈은 바뀌지 않아요." : "이미 업데이트하고 조립한 파일이 있으면 불러와서 그 파일과 비교할 수 있어요."),
      fileCur?.notes?.length ? note("warn", fileCur.notes.join("\n")) : null,
      h(
        "div",
        { style: "display:flex;gap:8px;flex-wrap:wrap" },
        btn(fileCur ? "다른 파일" : "조립한 파일 불러오기", { size: "sm", icon: "upload", onClick: loadCurFile, id: "rb-pm-curfile" }),
        fileCur ? btn("리스 상태로 돌아가기", { size: "sm", icon: "back", onClick: () => {
          pm.curFile = null;
          paintWork();
        } }) : null
      )
    );
    if (!base) {
      replace(work, baseCard2, curCard);
      return;
    }
    const parts = await compareCards(my, {
      kind: t.kind,
      base,
      cur,
      getCur,
      readAsset: fileCur ? fileCur.readAsset : (p) => ctx.assets.read(p),
      proj: findProject(ctx, t.kind, targetId),
      onBase: async (fresh) => {
        await store.setBaseline(t.key, baseViewOf(t.kind, fresh));
        pm.baseFrom = null;
      },
      record: (rel) => recordRelease(ctx, t.kind, targetId, rel)
    });
    if (parts) replace(work, baseCard2, curCard, ...parts);
  }
  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1;display:flex;flex-direction:column;gap:14px" },
    h("div", null, back),
    h("div", null, h("h2", { class: "rb-h2" }, "패치 만들기"), h("p", { class: "rb-p" }, "배포한 버전과 새 버전을 비교해서 바뀐 부분만 담은 업데이트 파일(.rbupatch)을 만들어요. 기준과 새 버전은 리스 안의 상태나 파일 중에서 고를 수 있어요.")),
    segmented([["risu", "리스의 모듈·봇"], ["files", "파일 두 개 비교"]], pm.src, (v) => {
      pm.src = v;
      paintList();
      paintWork();
    }, "비교 방식"),
    segmented([["module", "모듈"], ["character", "봇"]], pm.kind, (v) => {
      pm.kind = v;
      if (pm.target?.kind !== v) pm.target = null;
      paintList();
      paintWork();
    }, "종류"),
    pickWrap,
    work
  ));
  paintList();
  paintWork();
}
export function openPatchMaker(ctx, target) {
  ctx.state.pm = { ...ctx.state.pm ?? {}, kind: target.kind, target, q: "" };
  ctx.go("dev", "patchmaker");
}
