import { copyText, download, h, pickFiles, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, confirmDialog, iconBtn, modal, note, openMenu, promptDialog } from '../kit.js';
import { DEFAULT_PRESET, applyPreset, encodePresetCode, isMobileDevice, loadPresets, parsePresetBundle, presetBundle, remapPreset, savePresets, snapshotOf, uniquePresetName } from '../../data/presets.js';
import { reload } from './modules.js';

export async function renderPresets(ctx) {
  const data = await loadPresets(ctx.api);
  const st = await ctx.svc.load();
  if (!data.presets[DEFAULT_PRESET] && !Object.keys(data.presets).length) {
    data.presets[DEFAULT_PRESET] = snapshotOf(st.entries, [...st.globalOn]);
    data.active = DEFAULT_PRESET;
    await savePresets(ctx.api, data);
  }
  const names = Object.keys(data.presets);
  const device = isMobileDevice() ? "mobile" : "desktop";
  const summary = (p) => {
    const states = Object.values(p.moduleStates ?? {});
    return `켜짐 ${states.filter((s) => s.enabled).length} · 꺼짐 ${states.filter((s) => !s.enabled).length} · 글로벌 ${(p.globalEnabledIds ?? []).length}`;
  };
  const list = h("div", { style: "display:flex;flex-direction:column;gap:6px" }, names.map((name) => {
    const p = data.presets[name], active = data.active === name;
    return h(
      "div",
      { class: "rb-row", "aria-selected": active ? "true" : "false", style: "cursor:default" },
      h("span", { style: `display:flex;color:${active ? "var(--rb-acc-text)" : "var(--rb-sub)"}` }, icon("preset", 18)),
      h(
        "div",
        { class: "txt" },
        h(
          "div",
          { class: "ttl" },
          h("span", { class: "name" }, name),
          active && badge("사용 중", "acc"),
          data.defaultMobile === name && badge("모바일 기본", "acc2"),
          data.defaultDesktop === name && badge("데스크탑 기본", "acc2")
        ),
        h("span", { class: "meta" }, summary(p))
      ),
      active ? null : btn("전환", { size: "sm", kind: "primary", onClick: () => switchTo(ctx, name) }),
      iconBtn("more", `${name} 메뉴`, { onClick: (ev) => presetMenu(ctx, data, name, ev.currentTarget) })
    );
  }));
  const pairSel = (key, label) => {
    const sel = h("select", { class: "rb-input", "aria-label": label, onChange: async (ev) => {
      const d = await loadPresets(ctx.api);
      d[key] = ev.target.value || void 0;
      if (!d.lastDeviceType) d.lastDeviceType = device;
      if (d.defaultMobile && d.defaultMobile === d.defaultDesktop) {
        ctx.toast("모바일과 데스크탑에 서로 다른 프리셋을 골라 주세요", { error: true });
        ev.target.value = data[key] ?? "";
        return;
      }
      await savePresets(ctx.api, d);
      ctx.toast("디바이스 페어를 저장했어요");
      renderPresets(ctx);
    } }, h("option", { value: "" }, "지정 안 함"), names.map((n) => h("option", { value: n, selected: data[key] === n }, n)));
    return h("label", { class: "rb-field", style: "flex:1;min-width:200px" }, h("span", { class: "rb-label" }, label), sel);
  };
  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1" },
    h(
      "div",
      { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" },
      iconBtn("back", "도구로 돌아가기", { onClick: () => ctx.go("tools") }),
      h("div", { style: "flex:1" }, h("span", { class: "rb-muted" }, "도구"), h("h2", { class: "rb-h2" }, "프리셋"), h("p", { class: "rb-p" }, "어떤 모듈을 켜고 끌지, 순서, 글로벌 활성화를 묶어서 저장해요. 지금 상태는 사용 중인 프리셋에 자동으로 저장돼요.")),
      btn("가져오기", { icon: "upload", onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
        { label: "파일에서", icon: "upload", onClick: () => importPresets(ctx) },
        { label: "공유 코드 붙여넣기", icon: "link", onClick: () => importPresetCode(ctx) }
      ]) }),
      btn("새 프리셋", { kind: "primary", icon: "plus", onClick: () => newPreset(ctx) })
    ),
    list,
    h(
      "div",
      { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:12px" },
      h("h3", { class: "rb-h3" }, "디바이스 페어"),
      h("p", { class: "rb-p" }, `모바일과 데스크탑에서 쓸 프리셋을 정해 두면, 기기가 바뀔 때 자동으로 전환해요. 지금 기기: ${device === "mobile" ? "모바일" : "데스크탑"}`),
      h("div", { style: "display:flex;gap:12px;flex-wrap:wrap" }, pairSel("defaultMobile", "모바일 프리셋"), pairSel("defaultDesktop", "데스크탑 프리셋")),
      note("info", "페어로 지정한 프리셋을 쓰고 있을 때만 자동 전환돼요. 다른 프리셋을 직접 골랐다면 그대로 둬요.")
    )
  ));
}
async function switchTo(ctx, name) {
  try {
    const r = await ctx.svc.serial(() => applyPreset(ctx.api, name));
    ctx.toast(`'${name}' 프리셋으로 바꿨어요` + (r.skipped ? ` (에셋 모듈 ${r.skipped}개는 켜 둠)` : ""));
    await reload(ctx);
    renderPresets(ctx);
  } catch (err) {
    ctx.toast(err?.message ?? String(err), { error: true });
  }
}
async function newPreset(ctx) {
  const data = await loadPresets(ctx.api);
  const n = await promptDialog(ctx.win, { title: "새 프리셋", label: "지금 상태를 새 프리셋으로 저장해요", placeholder: "예: 가볍게" });
  if (!n?.trim()) return;
  const name = uniquePresetName(data, n);
  const st = await ctx.svc.load();
  data.presets[name] = snapshotOf(st.entries, [...st.globalOn]);
  data.active = name;
  await savePresets(ctx.api, data);
  ctx.toast(`'${name}' 프리셋을 만들었어요`);
  renderPresets(ctx);
}
function presetMenu(ctx, data, name, anchor) {
  const isDefault = name === DEFAULT_PRESET;
  openMenu(ctx.win, anchor, [
    { label: "지금 상태로 덮어쓰기", icon: "refresh", onClick: async () => {
      if (!await confirmDialog(ctx.win, { title: `'${name}'을(를) 지금 상태로 바꿀까요?`, ok: "덮어쓰기" })) return;
      const d = await loadPresets(ctx.api);
      const st = await ctx.svc.load();
      d.presets[name] = snapshotOf(st.entries, [...st.globalOn]);
      await savePresets(ctx.api, d);
      ctx.toast("덮어썼어요");
      renderPresets(ctx);
    } },
    isDefault ? null : { label: "이름 바꾸기", icon: "edit", onClick: async () => {
      const n = await promptDialog(ctx.win, { title: "프리셋 이름", value: name });
      if (!n?.trim() || n.trim() === name) return;
      const d = await loadPresets(ctx.api);
      if (d.presets[n.trim()]) {
        ctx.toast("같은 이름이 있어요", { error: true });
        return;
      }
      d.presets[n.trim()] = d.presets[name];
      delete d.presets[name];
      for (const k of ["active", "defaultMobile", "defaultDesktop"]) if (d[k] === name) d[k] = n.trim();
      await savePresets(ctx.api, d);
      renderPresets(ctx);
    } },
    { label: "공유 코드 복사", icon: "link", onClick: () => copyShare(ctx, { [name]: data.presets[name] }) },
    { label: "전체 공유 코드 복사", icon: "link", onClick: () => copyShare(ctx, data.presets) },
    { label: "내보내기 (파일)", icon: "download", onClick: async () => download(`preset-${name}.json`, JSON.stringify(presetBundle({ [name]: data.presets[name] }, await modulesOf(ctx)), null, 2), "application/json") },
    { label: "전체 내보내기", icon: "download", onClick: async () => download("presets.json", JSON.stringify(presetBundle(data.presets, await modulesOf(ctx)), null, 2), "application/json") },
    isDefault ? null : "sep",
    isDefault ? null : { label: "삭제", icon: "trash", danger: true, onClick: async () => {
      if (!await confirmDialog(ctx.win, { title: `'${name}' 프리셋을 지울까요?`, body: "모듈은 바뀌지 않아요.", ok: "삭제", danger: true })) return;
      const d = await loadPresets(ctx.api);
      delete d.presets[name];
      for (const k of ["defaultMobile", "defaultDesktop"]) if (d[k] === name) delete d[k];
      if (d.active === name) d.active = DEFAULT_PRESET;
      await savePresets(ctx.api, d);
      renderPresets(ctx);
    } }
  ].filter(Boolean));
}
var modulesOf = async (ctx) => (await ctx.svc.load()).entries.map((e) => e.module);
async function copyShare(ctx, presets) {
  const code = encodePresetCode(presetBundle(presets, await modulesOf(ctx)));
  const n = Object.keys(presets).length;
  ctx.toast(await copyText(code) ? `프리셋 ${n}개 공유 코드를 복사했어요. 받는 쪽에서 가져오기 → 공유 코드 붙여넣기` : "복사하지 못했어요", { error: false });
}
async function importPresets(ctx) {
  const [f] = await pickFiles({ accept: ".json,application/json" });
  if (!f) return;
  await importBundleText(ctx, await f.text());
}
async function importPresetCode(ctx) {
  let ta;
  const text = await modal(ctx.win, (done) => {
    ta = h("textarea", { class: "rb-textarea", spellcheck: "false", placeholder: "DA-PRESET:로 시작하는 코드나 프리셋 JSON", "data-autofocus": "1", style: "min-height:140px" });
    return h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "공유 코드 붙여넣기" },
      h("h3", { class: "rb-h3" }, "공유 코드 붙여넣기"),
      h("p", { class: "rb-p" }, "다른 기기나 다른 사람이 복사한 프리셋 코드를 붙여 넣으세요."),
      ta,
      h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn("가져오기", { kind: "primary", onClick: () => done(ta.value) }))
    );
  });
  if (text?.trim()) await importBundleText(ctx, text);
}
// 같은 이름이 있을 때 한 번만 묻는다
function askConflict(ctx, names) {
  return modal(ctx.win, (done) => h(
    "div",
    { class: "rb-dialog", role: "alertdialog", "aria-modal": "true", "aria-label": "같은 이름의 프리셋" },
    h("h3", { class: "rb-h3" }, "같은 이름의 프리셋이 있어요"),
    h("p", { class: "rb-p" }, names.slice(0, 6).join(", ") + (names.length > 6 ? ` 외 ${names.length - 6}개` : "")),
    h(
      "div",
      { class: "btns" },
      btn("취소", { onClick: () => done(null) }),
      btn("건너뛰기", { onClick: () => done("skip") }),
      btn("이름 바꿔 추가", { onClick: () => done("rename") }),
      btn("덮어쓰기", { kind: "danger", onClick: () => done("overwrite") })
    )
  ));
}
async function importBundleText(ctx, text) {
  try {
    const bundle = parsePresetBundle(text);
    const d = await loadPresets(ctx.api);
    const mods = await modulesOf(ctx);
    const clash = Object.keys(bundle.presets).filter((n) => d.presets[n]);
    const how = clash.length ? await askConflict(ctx, clash) : "rename";
    if (!how) return;
    let n = 0, renamed = 0, missing = 0;
    for (const [name, p] of Object.entries(bundle.presets)) {
      if (d.presets[name] && how === "skip") continue;
      const r = remapPreset(p, bundle.names, mods);
      renamed += r.renamed;
      missing += r.missing;
      d.presets[d.presets[name] && how === "rename" ? uniquePresetName(d, name) : name] = r.preset;
      n++;
    }
    await savePresets(ctx.api, d);
    const extra = [renamed && `이름으로 ${renamed}개 연결`, missing && `없는 모듈 ${missing}개는 건너뜀`].filter(Boolean).join(" · ");
    ctx.toast(`프리셋 ${n}개를 가져왔어요${extra ? ` (${extra})` : ""}`, { seconds: missing ? 8 : 4 });
    renderPresets(ctx);
  } catch (err) {
    ctx.toast(`가져오지 못했어요: ${err?.message ?? err}`, { error: true });
  }
}
