// 플러그인 매니저 기능 화면 (1.8.3): 켜기/끄기·별칭·순서·삭제 / 파일에서 등록 / 중복 정리 / 백업·복원 / 글로벌 프리셋·카테고리 / 메타데이터 정리.
// 리스가 플러그인 목록 쓰기를 막아서, 목록을 바꾸는 모든 일은 Cellar(mutate)가 대신 한다. 리스를 새로고침해야 새 상태로 돈다.
import { download, fmtBytes, h, pickFiles, replace } from "../dom.js";
import { badge, btn, confirmDialog, modal, note, promptDialog } from "../kit.js";
import { describeEditError } from "../../data/cellarplugins.js";
import * as M from "../../data/pluginmgr.js";
import * as P from "../../data/plugins.js";

var MONO = 'ui-monospace,"Cascadia Code","D2Coding",Menlo,Consolas,monospace';
var today = () => new Date().toISOString().slice(0, 10);
export var mgrOf = (ctx, cellar) => M.createPluginMgr(ctx.api, { url: cellar.url, via: cellar.via });
var fail = (ctx, e) => ctx.toast?.(describeEditError(e).text);

// 목록을 바꾸는 작업을 한 번 실행하고 목록을 새로 그린다. 성공하면 true.
export async function runOps(ctx, cellar, ops, { expectListSha, ok = "바꿨어요", refresh } = {}) {
  try {
    const r = await mgrOf(ctx, cellar).mutate(ops, expectListSha);
    if (r.overwritten) ctx.toast?.("열려 있는 리스 화면이 옛 목록으로 다시 저장해서 변경이 사라졌어요. 리스를 새로고침(F5)한 뒤 다시 해 주세요");
    else ctx.toast?.(`${ok} · 리스를 새로고침하면 적용돼요${!r.adopted || r.stillPending ? " (리스의 '외부 변경 검토'에서 받아들여 주세요)" : ""}`);
    await refresh?.();
    return true;
  } catch (e) { fail(ctx, e); return false; }
}

// ── 줄 하나 ──
export const toggleEnabled = (ctx, cellar, p, on, refresh) => runOps(ctx, cellar, [{ op: "set", name: p.name, ...(p.dup ? { index: p.order } : {}), fields: { enabled: on } }], { ok: on ? "켰어요" : "껐어요", refresh });
export async function editAlias(ctx, cellar, p, refresh) {
  const v = await promptDialog(ctx.win, { title: "별칭", label: "목록에 보일 이름이에요. 비우면 원래 이름으로 돌아가요", value: p.alias ?? "", placeholder: p.name });
  if (v === null) return;
  return runOps(ctx, cellar, [{ op: "set", name: p.name, ...(p.dup ? { index: p.order } : {}), fields: { alias: v.trim() || null } }], { ok: "별칭을 바꿨어요", refresh });
}
export async function removePlugin(ctx, cellar, p, refresh) {
  const yes = await confirmDialog(ctx.win, { title: `'${p.displayName}'을(를) 지울까요?`, body: "리스 설정에서 이 플러그인과 설정값이 사라져요. 지우기 전에 설정 파일이 서버에 복사돼요(최근 20개).", ok: "지우기", danger: true });
  if (!yes) return;
  return runOps(ctx, cellar, [{ op: "remove", name: p.name, ...(p.dup ? { index: p.order } : {}) }], { ok: "지웠어요", refresh });
}
export async function movePlugin(ctx, cellar, p, dir, refresh) {
  try {
    const mgr = mgrOf(ctx, cellar), l = await mgr.list();
    const i = p.order, j = i + dir;
    if (j < 0 || j >= l.plugins.length) return;
    const order = l.plugins.map((_, k) => k); [order[i], order[j]] = [order[j], order[i]];
    return runOps(ctx, cellar, [{ op: "order", order }], { expectListSha: l.listSha, ok: "순서를 바꿨어요", refresh });
  } catch (e) { fail(ctx, e); }
}

// ── 공통 창 틀 ──
function dialog(ctx, title, build, width = 720) {
  return modal(ctx.win, (done) => {
    const body = h("div", { style: "display:flex;flex-direction:column;gap:10px" });
    const show = (...k) => replace(body, ...k);
    build({ show, done, body });
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title, style: `width:min(${width}px,94vw);max-width:min(${width}px,94vw);max-height:92vh;overflow:auto` }, h("h3", null, title), body);
  });
}
var actions = (...k) => h("div", { class: "btns" }, ...k);

// ── 파일에서 등록 ──
export function openRegister(ctx, cellar, refresh) {
  return dialog(ctx, "플러그인 등록", ({ show, done }) => {
    let code = "", keep = true, info = null, list = [];
    const ta = h("textarea", { class: "rb-input", id: "rb-pm-code", spellcheck: "false", wrap: "off", placeholder: "플러그인 코드를 붙여넣거나 파일을 고르세요", style: `width:100%;box-sizing:border-box;min-height:220px;max-height:46vh;font:12.5px/1.6 ${MONO};white-space:pre` });
    ta.addEventListener("input", () => { code = ta.value; check(); });
    const out = h("div", { id: "rb-pm-info", style: "display:flex;flex-direction:column;gap:8px" });
    const go = btn("등록", { kind: "primary", id: "rb-pm-go", disabled: true, onClick: install });
    function check() {
      info = M.buildRegister(code, { existing: list });
      go.disabled = !info.ok;
      go.textContent = info.exists ? "덮어쓰기" : "등록";
      replace(out,
        code.trim() ? h("p", { class: "rb-muted" }, info.ok ? `${info.plugin.displayName} · ${info.plugin.name} · ${fmtBytes(code.length)}${info.plugin.versionOfPlugin ? ` · v${info.plugin.versionOfPlugin}` : ""} · 인자 ${Object.keys(info.plugin.arguments).length}개` : "") : null,
        ...info.problems.map((t) => note("err", t)), ...info.warnings.map((t) => note("warn", t)),
        /^2(\.0)?$/.test(M.parseRegister(code).api) ? btn("API 2.1로 바꾸기", { size: "sm", id: "rb-pm-v21", onClick: () => { code = ta.value = M.convertApi21(code); check(); } }) : null,
        info.exists ? note("info", "같은 이름의 플러그인이 이미 있어요. 덮어쓰면 코드와 인자 목록이 바뀌어요.") : null,
        info.exists ? h("label", { class: "rb-p", style: "display:flex;gap:8px;align-items:flex-start" }, h("input", { type: "checkbox", id: "rb-pm-keep", checked: keep, onChange: (e) => { keep = e.target.checked; } }), h("span", null, "기존 인자값·켜짐/꺼짐·별칭 유지 (같은 이름·타입의 인자값만)")) : null);
    }
    async function install() {
      go.disabled = true;
      const pl = await mgrOf(ctx, cellar).packPlugin(info.plugin);
      const ok = await runOps(ctx, cellar, [{ op: "add", plugin: pl, ...(info.exists ? { replace: true, keepSettings: keep } : {}) }], { ok: info.exists ? "덮어썼어요" : "등록했어요", refresh });
      if (ok) done(true); else go.disabled = false;
    }
    mgrOf(ctx, cellar).list().then((l) => { list = l.plugins; check(); }).catch(() => {});
    show(
      h("p", { class: "rb-p" }, "플러그인 JavaScript 코드를 붙여넣거나 파일에서 가져오세요. 맨 위 머리말(//@name, //@arg 등)을 읽어서 등록해요."),
      btn("파일에서 가져오기", { size: "sm", id: "rb-pm-file", onClick: async () => { const [f] = await pickFiles({ accept: ".js,.mjs,.txt,text/javascript" }); if (f) { code = ta.value = await f.text(); check(); } } }),
      ta, out, actions(btn("닫기", { onClick: () => done(null) }), go));
  });
}

// ── 중복 정리 ──
export function openDup(ctx, cellar, refresh) {
  return dialog(ctx, "중복 플러그인 정리", async ({ show, done }) => {
    show(h("p", { class: "rb-muted" }, "확인하는 중…"));
    try {
      const l = await mgrOf(ctx, cellar).list();
      const plans = M.dupPlan(l.plugins);
      if (!plans.length) return show(h("p", { class: "rb-p", id: "rb-pm-nodup" }, "중복된 플러그인이 없어요."), actions(btn("닫기", { onClick: () => done(null) })));
      show(
        h("p", { class: "rb-p" }, "이름(ID)이 같은 사본 중 켜진 첫 번째(모두 꺼져 있으면 첫 번째)만 남기고 나머지를 지워요. 설정값은 남는 사본의 것이에요."),
        h("ul", { style: "margin:0;padding-left:18px;line-height:1.7" }, plans.map((g) => h("li", null, `${g.name} · ${g.count}개 → ${g.remove.length}개 지움 `, badge(g.same ? "같은 코드" : "다른 코드", g.same ? "mute" : "warn")))),
        actions(btn("닫기", { onClick: () => done(null) }), btn("정리", { kind: "danger", id: "rb-pm-dupgo", onClick: async () => { if (await runOps(ctx, cellar, M.dupOps(plans, l.plugins), { ok: "중복을 정리했어요", refresh })) done(true); } })));
    } catch (e) { show(note("err", describeEditError(e).text), actions(btn("닫기", { onClick: () => done(null) }))); }
  });
}

// ── 전체 백업 · 복원 ──
export async function backupAll(ctx, cellar) {
  try {
    const [ex, categories, presets] = await Promise.all([mgrOf(ctx, cellar).exportAll(), P.loadCategories(ctx.api), M.loadPresets(ctx.api)]);
    download(`dusk-plugins-backup-${today()}.json`, JSON.stringify(M.makeBackup({ plugins: ex.plugins, categories, presets: Object.keys(presets.presets).length ? presets : null })), "application/json");
    ctx.toast?.(`플러그인 ${ex.plugins.length}개를 백업했어요 (코드·설정값 포함, 플러그인 스토리지는 빠져요)`);
  } catch (e) { fail(ctx, e); }
}
export function openRestore(ctx, cellar, refresh) {
  return dialog(ctx, "백업 복원", ({ show, done }) => {
    let backup = null, scope = "all", mode = "replace";
    const radio = (name, val, cur, label, on) => h("label", { class: "rb-p", style: "display:flex;gap:8px;align-items:flex-start" }, h("input", { type: "radio", name, value: val, checked: cur === val, onChange: () => on(val) }), h("span", null, label));
    const pick = async () => { const [f] = await pickFiles({ accept: ".json,application/json" }); if (!f) return; try { backup = M.parseBackup(await f.text()); view(); } catch (e) { ctx.toast?.(e.message); } };
    function view() {
      if (!backup) return show(h("p", { class: "rb-p" }, "백업한 JSON 파일을 고르세요."), actions(btn("닫기", { onClick: () => done(null) }), btn("파일 고르기", { kind: "primary", id: "rb-pm-restorefile", onClick: pick })));
      show(
        h("p", { class: "rb-muted", id: "rb-pm-bkinfo" }, `백업 ${backup.createdAt?.slice(0, 10) ?? ""} · 플러그인 ${backup.plugins.length}개`),
        h("p", { class: "rb-h3" }, "1. 복원할 범위"),
        radio("scope", "all", scope, "전체", (v) => { scope = v; }), radio("scope", "plugins", scope, "플러그인만 (코드·인자값·별칭·켜짐 상태)", (v) => { scope = v; }), radio("scope", "meta", scope, "카테고리·프리셋만", (v) => { scope = v; }),
        h("p", { class: "rb-h3" }, "2. 처리 방식"),
        radio("mode", "replace", mode, "전체 교체 — 선택한 범위에서 백업에 없는 것은 삭제", (v) => { mode = v; }), radio("mode", "merge", mode, "병합 — 같은 이름은 백업으로 덮어쓰고, 없는 것은 그대로 둠", (v) => { mode = v; }),
        actions(btn("뒤로", { onClick: () => { backup = null; view(); } }), btn("복원", { kind: "danger", id: "rb-pm-restorego", onClick: go })));
    }
    async function go() {
      try {
        const mgr = mgrOf(ctx, cellar), [ex, categories, presets] = await Promise.all([mgr.exportAll(), P.loadCategories(ctx.api), M.loadPresets(ctx.api)]);
        const plan = M.planRestore(backup, ex.plugins, { scope, mode, curCategories: categories, curPresets: presets });
        const s = plan.summary;
        if (!(await confirmDialog(ctx.win, { title: "복원할까요?", body: plan.pluginsChanged ? `추가 ${s.added} · 덮어씀 ${s.replaced} · 삭제 ${s.removed}. 복원 전에 설정 파일이 서버에 복사돼요.` : "카테고리·프리셋을 바꿔요.", ok: "복원", danger: true }))) return;
        if (plan.pluginsChanged) {
          const packed = await Promise.all(plan.plugins.map((p) => mgr.packPlugin(p)));
          await mgr.mutate([{ op: "replaceAll", plugins: packed }], ex.listSha);
        }
        if (scope !== "plugins") { await ctx.api.pluginStorage.setItem("rbm:pluginCats:v1", JSON.stringify(plan.categories)); if (plan.presets) await M.savePresets(ctx.api, plan.presets); }
        ctx.toast?.("복원했어요 · 리스를 새로고침하면 적용돼요");
        await refresh?.(); done(true);
      } catch (e) { fail(ctx, e); }
    }
    view();
  });
}

// ── 글로벌 프리셋 · 카테고리 ──
export function openPresets(ctx, cellar, refresh) {
  return dialog(ctx, "글로벌 프리셋", ({ show, done }) => {
    let st = M.emptyPresets(), list = [], cats = {};
    const save = async () => { await M.savePresets(ctx.api, st); view(); };
    const mgr = mgrOf(ctx, cellar);
    async function load() { [st, cats] = await Promise.all([M.loadPresets(ctx.api), P.loadCategories(ctx.api)]); list = (await mgr.list()).plugins; view(); }
    async function apply(name) {
      const l = await mgr.list(), pr = M.presetOps(st.presets[name], l.plugins);
      const ops = [...pr.ops];
      const ok = ops.length || pr.order ? await (async () => { try { if (ops.length) await mgr.mutate(ops); if (pr.order) await mgr.mutate([{ op: "order", order: pr.order }], (await mgr.list()).listSha); return true; } catch (e) { fail(ctx, e); return false; } })() : true;
      if (!ok) return;
      for (const [n, c] of Object.entries(pr.categories)) await P.setCategory(ctx.api, n, c);
      st.active = name; await M.savePresets(ctx.api, st);
      ctx.toast?.(`'${name}' 프리셋을 적용했어요${pr.missing.length ? ` (없는 플러그인 ${pr.missing.length}개는 건너뜀)` : ""} · 리스를 새로고침하면 적용돼요`);
      await refresh?.(); await load();
    }
    async function create() {
      const name = (await promptDialog(ctx.win, { title: "새 프리셋", label: "지금 켜짐/꺼짐·순서·카테고리를 저장해요", placeholder: "프리셋 이름" }))?.trim();
      if (!name) return;
      if (st.presets[name] && !(await confirmDialog(ctx.win, { title: "덮어쓸까요?", body: `'${name}' 프리셋이 이미 있어요.`, ok: "덮어쓰기" }))) return;
      st.presets[name] = M.snapshotPreset(list, cats); await save();
    }
    async function rename(name) {
      const to = (await promptDialog(ctx.win, { title: "이름 변경", value: name }))?.trim();
      if (!to || to === name) return;
      if (st.presets[to]) return ctx.toast?.("같은 이름이 이미 있어요");
      st.presets[to] = st.presets[name]; delete st.presets[name];
      if (st.active === name) st.active = to;
      for (const k of ["mobile", "desktop"]) if (st.pair[k] === name) st.pair[k] = to;
      await save();
    }
    async function del(name) {
      if (!(await confirmDialog(ctx.win, { title: `'${name}' 프리셋을 지울까요?`, body: "플러그인은 그대로 두고 프리셋만 지워요.", ok: "지우기", danger: true }))) return;
      delete st.presets[name]; if (st.active === name) st.active = null;
      for (const k of ["mobile", "desktop"]) if (st.pair[k] === name) st.pair[k] = null;
      await save();
    }
    async function pair() {
      const names = Object.keys(st.presets);
      const mob = await promptDialog(ctx.win, { title: "디바이스 페어 · 모바일", label: `모바일(좁은 화면)에서 쓸 프리셋 이름 (${names.join(", ")}). 비우면 해제`, value: st.pair.mobile ?? "" });
      if (mob === null) return;
      const desk = await promptDialog(ctx.win, { title: "디바이스 페어 · 데스크탑", label: `데스크탑에서 쓸 프리셋 이름. 비우면 해제`, value: st.pair.desktop ?? "" });
      if (desk === null) return;
      const m = mob.trim(), d = desk.trim();
      if ((m && !st.presets[m]) || (d && !st.presets[d])) return ctx.toast?.("없는 프리셋 이름이에요");
      st.pair = { mobile: m || null, desktop: d || null }; await save();
    }
    async function exportSome() { const names = Object.keys(st.presets); if (!names.length) return ctx.toast?.("내보낼 프리셋이 없어요"); download(`dusk-plugin-presets-${today()}.json`, JSON.stringify(M.exportPresets(st, names)), "application/json"); }
    async function importFile() {
      const [f] = await pickFiles({ accept: ".json,application/json" }); if (!f) return;
      try {
        const text = await f.text(), probe = JSON.parse(text), dup = Object.keys(probe.presets ?? {}).some((n) => st.presets[n]);
        const over = dup ? await confirmDialog(ctx.win, { title: "같은 이름의 프리셋이 있어요", body: "덮어쓰면 기존 프리셋이 바뀌고, 취소하면 번호를 붙여 새로 추가해요.", ok: "덮어쓰기", cancel: "번호 붙여 추가" }) : false;
        const r = M.importPresets(st, text, { onDup: over ? "overwrite" : "number" });
        st = r.state; await save(); ctx.toast?.(`프리셋 ${r.added.length}개를 가져왔어요`);
      } catch (e) { ctx.toast?.(e.message); }
    }
    async function catsJson() {
      const text = await promptDialog(ctx.win, { title: "카테고리 JSON", label: "복사해 공유하거나 붙여넣어 복원해요. 저장하면 지금 카테고리를 교체해요", value: M.categoriesJson(cats), ok: "저장" });
      if (text === null) return;
      try { const next = M.parseCategories(text); for (const n of new Set([...Object.keys(cats), ...Object.keys(next)])) await P.setCategory(ctx.api, n, next[n] ?? ""); cats = next; ctx.toast?.("카테고리를 바꿨어요"); await refresh?.(); } catch (e) { ctx.toast?.(e.message); }
    }
    function view() {
      const names = Object.keys(st.presets);
      show(
        h("p", { class: "rb-p" }, "어떤 플러그인이 켜져 있는지, 순서, 카테고리를 프리셋으로 저장해 두고 한 번에 바꿔요. 인자값과 플러그인 스토리지는 들어가지 않아요."),
        names.length ? h("div", { id: "rb-pm-presets", style: "display:flex;flex-direction:column;gap:6px" }, names.map((n) => h("div", { class: "rb-row", style: "cursor:default" },
          h("div", { class: "txt" }, h("div", { class: "ttl" }, h("span", { class: "name" }, n), st.active === n && badge("사용 중", "acc"), st.pair.mobile === n && badge("모바일", "acc2"), st.pair.desktop === n && badge("데스크탑", "acc2")), h("span", { class: "meta" }, `플러그인 ${Object.keys(st.presets[n].enabled ?? {}).length}개 · 켜짐 ${Object.values(st.presets[n].enabled ?? {}).filter(Boolean).length}개`)),
          btn("적용", { size: "sm", kind: "primary", "data-act": "apply", onClick: () => apply(n) }), btn("이름", { size: "sm", onClick: () => rename(n) }), btn("삭제", { size: "sm", kind: "danger", onClick: () => del(n) })))) : h("div", { class: "rb-empty", id: "rb-pm-nopreset" }, "저장한 프리셋이 없어요."),
        h("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, btn("＋ 새 프리셋", { size: "sm", id: "rb-pm-newpreset", onClick: create }), btn("내보내기", { size: "sm", onClick: exportSome }), btn("가져오기", { size: "sm", onClick: importFile }), btn("디바이스 페어", { size: "sm", onClick: pair }), btn("카테고리 JSON", { size: "sm", onClick: catsJson })),
        actions(btn("닫기", { onClick: () => done(null) })));
    }
    load().catch((e) => show(note("err", describeEditError(e).text), actions(btn("닫기", { onClick: () => done(null) }))));
  }, 760);
}

// ── 메타데이터 정리 ── 설치되지 않은 플러그인에 남은 카테고리·프리셋 항목
export function openMetaClean(ctx, cellar, refresh) {
  return dialog(ctx, "메타데이터 정리", ({ show, done }) => {
    show(h("p", { class: "rb-muted" }, "확인하는 중…"));
    (async () => {
      try {
        const [l, categories, presets] = await Promise.all([mgrOf(ctx, cellar).list(), P.loadCategories(ctx.api), M.loadPresets(ctx.api)]);
        const o = M.orphanMeta(l.plugins, { categories, presets }), pCount = Object.values(o.presets).reduce((n, a) => n + a.length, 0);
        if (!o.categories.length && !pCount) return show(h("p", { class: "rb-p", id: "rb-pm-nometa" }, "정리할 항목이 없어요."), actions(btn("닫기", { onClick: () => done(null) })));
        show(
          note("warn", "선택한 항목이 영구 삭제돼요. 되돌릴 수 없어요."),
          o.categories.length ? h("p", { class: "rb-p" }, `설치되지 않은 플러그인의 카테고리 ${o.categories.length}개: ${o.categories.join(", ")}`) : null,
          pCount ? h("p", { class: "rb-p" }, `프리셋에 남은 없는 플러그인 항목 ${pCount}개 (${Object.keys(o.presets).join(", ")})`) : null,
          actions(btn("닫기", { onClick: () => done(null) }), btn("정리", { kind: "danger", id: "rb-pm-metago", onClick: async () => {
            for (const n of o.categories) await P.setCategory(ctx.api, n, "");
            for (const [pn, miss] of Object.entries(o.presets)) { const pr = presets.presets[pn]; for (const n of miss) { delete pr.enabled[n]; pr.order = (pr.order ?? []).filter((x) => x !== n); delete pr.categories?.[n]; } }
            await M.savePresets(ctx.api, presets); ctx.toast?.("정리했어요"); await refresh?.(); done(true);
          } })));
      } catch (e) { show(note("err", describeEditError(e).text), actions(btn("닫기", { onClick: () => done(null) }))); }
    })();
  });
}
