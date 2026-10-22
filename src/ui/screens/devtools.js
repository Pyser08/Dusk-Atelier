import { buildPatch, changedAssetPaths, planPatch, viewKeys } from '../../engine/patch.js';
import { nextVersion } from '../../engine/devcheck.js';
import { findProject, recordRelease } from './dev.js';
import { pickView } from '../../engine/merge3.js';
import { createStore } from '../../engine/store.js';
import { safeFileName } from '../../engine/export.js';
import { loadCharacters } from '../../data/modules.js';
import { download, fmtBytes, fmtWhen, h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, confirmDialog, note, segmented, switchEl } from '../kit.js';

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
      h("span", { class: "rb-muted", style: "white-space:normal" }, "모듈·봇 제작자를 위한 기능이에요. 켜면 옆에 개발 탭이 생겨서, 개발 중인 모듈·봇을 모아 두고 검사·테스트·패치 배포를 한곳에서 할 수 있어요.")
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
export async function renderPatchMaker(ctx, { backTo = "dev", backLabel = "개발" } = {}) {
  const st = ctx.state;
  st.pm ??= { kind: "module", target: null, q: "" };
  const pm = st.pm;
  replace(ctx.main, h("div", { class: "rb-empty" }, "불러오는 중…"));
  const { mods, chars } = await loadTargets(ctx);
  const store = createStore(ctx.api);
  const back = btn(backLabel, { size: "sm", icon: "back", onClick: () => {
    ctx.go(backTo);
  } });
  const pickBox = h("div", { class: "rb-list", style: "max-height:260px;overflow:auto;border:1px solid var(--rb-line);border-radius:14px;padding:6px" });
  const work = h("div", { style: "display:flex;flex-direction:column;gap:14px" });
  const search = h("input", { class: "rb-input", type: "search", placeholder: "이름으로 찾기", value: pm.q, "aria-label": "대상 찾기" });
  const paintList = () => {
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
  let token = 0;
  async function paintWork() {
    const my = ++token;
    const t = pm.target;
    if (!t) {
      replace(work, h("div", { class: "rb-empty" }, "위에서 패치를 만들 모듈이나 봇을 고르세요."));
      return;
    }
    replace(work, h("div", { class: "rb-empty" }, "비교하는 중…"));
    let cur, info, base, backups;
    try {
      [cur, info, backups] = await Promise.all([currentOf(ctx, t), store.baselineInfo(t.key), store.listBackups()]);
      base = pm.baseFrom?.key === t.key ? pm.baseFrom.view : info ? await store.getBaseline(t.key) : null;
    } catch (e) {
      if (my === token) replace(work, note("err", e?.message ?? String(e)));
      return;
    }
    if (my !== token) return;
    const targetId = t.kind === "module" ? t.id : t.chaId;
    const mineBackups = backups.filter((b) => b.target === targetId && b.path);
    const setBaseNow = async () => {
      if (base && !await confirmDialog(ctx.win, { title: "지금 상태를 배포 기준으로 할까요?", body: '지금 상태를 "배포한 버전"으로 기록해요. 이후 고친 부분만 패치에 들어가요.', ok: "기준으로 표시" })) return;
      await store.setBaseline(t.key, baseViewOf(t.kind, cur));
      pm.baseFrom = null;
      ctx.toast("지금 상태를 배포 기준으로 기록했어요");
      paintWork();
    };
    const baseCard2 = h(
      "div",
      { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:10px" },
      h(
        "div",
        { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" },
        h("b", null, "① 배포한 버전 (기준)"),
        base ? badge(pm.baseFrom?.key === t.key ? `기록에서 고름 · ${fmtWhen(pm.baseFrom.t)}` : `기록됨 · ${fmtWhen(info?.t)}`, "ok") : badge("없음", "warn")
      ),
      h("span", { class: "rb-muted", style: "white-space:normal" }, base ? "사람들에게 마지막으로 배포한 상태예요. 이 상태와 지금을 비교해서 바뀐 부분만 패치에 담아요." : '아직 기준이 없어요. 배포한 파일 그대로인 지금 "기준으로 표시"를 누르고, 그다음에 수정하세요. 이미 수정했다면 아래 기록에서 수정 전 상태를 고를 수 있어요.'),
      h(
        "div",
        { style: "display:flex;gap:8px;flex-wrap:wrap" },
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
    if (!base) {
      replace(work, baseCard2);
      return;
    }
    const preview = await buildPatch({ kind: t.kind, name: cur.name, namespace: cur.namespace ?? cur.moduleNamespace, base, current: cur, readAsset: async () => null, includeAssets: false });
    if (my !== token) return;
    const items = preview ? planPatch(preview, base).items : [];
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
        h("b", null, "② 바뀐 내용"),
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
      ) : h("span", { class: "rb-muted" }, "기준과 달라진 내용이 없어요. 수정한 다음 다시 열어 보세요.")
    );
    if (!items.length) {
      replace(work, baseCard2, changeCard);
      return;
    }
    const proj = findProject(ctx, t.kind, t.kind === "module" ? t.id : t.chaId);
    if (!pm.version && proj) pm.version = proj.version && proj.version !== proj.releases?.[0]?.version ? proj.version : nextVersion(proj.releases?.[0]?.version || proj.version);
    const ver = h("input", { class: "rb-input", value: pm.version ?? "", placeholder: "예: 1.1", "aria-label": "버전" });
    const who = h("input", { class: "rb-input", value: pm.author ?? (cur.creator ?? ""), placeholder: "제작자 이름", "aria-label": "제작자" });
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
    let withAssets = pm.withAssets ?? true, moveBase = pm.moveBase ?? true;
    const fileName = () => `${safeFileName(cur.name)}${ver.value.trim() ? `_v${safeFileName(ver.value.trim())}` : ""}.rbupatch`;
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
        const fresh = await currentOf(ctx, t);
        const patch = await buildPatch({ kind: t.kind, name: fresh.name, namespace: fresh.namespace ?? fresh.moduleNamespace, base, current: fresh, readAsset: (p) => ctx.assets.read(p), includeAssets: withAssets, version: ver.value.trim(), note: memo.value.trim(), author: who.value.trim() });
        tt.close();
        if (!patch) {
          ctx.toast("기준과 달라진 내용이 없어요");
          return;
        }
        const text = JSON.stringify(patch);
        download(fileName(), text, "application/json");
        if (moveBase) {
          await store.setBaseline(t.key, baseViewOf(t.kind, fresh));
          pm.baseFrom = null;
        }
        const items2 = planPatch(patch, base).items.length;
        await recordRelease(ctx, t.kind, t.kind === "module" ? t.id : t.chaId, { version: ver.value.trim(), note: memo.value.trim(), size: text.length, items: items2, cumulative: !moveBase }).catch(() => {
        });
        pm.version = "";
        pm.note = "";
        ctx.toast(`패치를 만들었어요 (${fmtBytes(text.length)})${moveBase ? " · 지금 상태가 새 기준이에요" : ""}`);
        paintWork();
      } catch (e) {
        tt.close();
        ctx.toast(`만들지 못했어요: ${e?.message ?? e}`, { error: true });
      } finally {
        make.disabled = false;
      }
    } });
    const outCard = h(
      "div",
      { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:12px" },
      h("b", null, "③ 패치 정보"),
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
      row2("만든 뒤 지금 상태를 새 기준으로", "다음 패치에는 이번 이후에 고친 것만 들어가요. 끄면 기준이 그대로라 누적 패치가 돼요.", moveBase, (v) => {
        moveBase = pm.moveBase = v;
      }),
      h("div", { class: "rb-muted" }, "파일 이름: ", fname),
      h("div", null, make),
      note("info", '받는 사람은 모듈 메뉴나 봇 상세에서 "패치 적용"을 눌러 이 파일을 고르면 돼요. 받는 사람이 직접 고친 부분은 그대로 남아요.')
    );
    replace(work, baseCard2, changeCard, outCard);
  }
  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1;display:flex;flex-direction:column;gap:14px" },
    h("div", null, back),
    h("div", null, h("h2", { class: "rb-h2" }, "패치 만들기"), h("p", { class: "rb-p" }, "배포한 버전과 지금을 비교해서 바뀐 부분만 담은 업데이트 파일(.rbupatch)을 만들어요.")),
    segmented([["module", "모듈"], ["character", "봇"]], pm.kind, (v) => {
      pm.kind = v;
      if (pm.target?.kind !== v) pm.target = null;
      paintList();
      paintWork();
    }, "종류"),
    search,
    pickBox,
    work
  ));
  paintList();
  paintWork();
}
export function openPatchMaker(ctx, target) {
  ctx.state.pm = { ...ctx.state.pm ?? {}, kind: target.kind, target, q: "" };
  ctx.go("dev", "patchmaker");
}
