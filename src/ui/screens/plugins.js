// 플러그인 탭 — 목록·카테고리·업데이트 확인 / DA Interop 연동 설정 / 저장소 보기 / 백업
import { download, fmtBytes, fmtWhen, h, pickFiles, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, confirmDialog, iconBtn, loading, note, openMenu, promptDialog, segmented, switchEl } from '../kit.js';
import * as P from '../../data/plugins.js';

var VIEWS = [["list", "목록"], ["interop", "연동 설정"], ["storage", "저장소"], ["backup", "백업"]];
var INTEROP_URL = "https://pyser08.github.io/dusk-atelier-interop/";

export async function renderPlugins(ctx) {
  const st = ctx.state;
  st.pluginView ??= "list";
  if (!st.pluginEnv) {
    replace(ctx.main, loading("플러그인 환경 확인 중"));
    st.pluginEnv = await ctx.svc.serial(() => P.detectEnv(ctx.api)).catch(() => ({ pluginsReadable: false, pluginsWritable: false, reason: "error" }));
  }
  const plugins = st.pluginEnv.pluginsReadable ? await P.listPlugins(ctx.api) : [];
  const interop = await P.listInterop(ctx.api, new Set(plugins.map((p) => p.name))).catch(() => []);
  ctx.setNavCount("plugins", plugins.length || void 0);
  const view = { list: viewList, interop: viewInterop, storage: viewStorage, backup: viewBackup }[st.pluginView] ?? viewList;
  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1" },
    h(
      "div",
      { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" },
      h("div", { style: "flex:1;min-width:200px" }, h("h2", { class: "rb-h2" }, "플러그인"), h("p", { class: "rb-p" }, "설치한 플러그인을 묶어 보고, 연동한 플러그인의 설정을 여기서 바꿔요.")),
      segmented(VIEWS, st.pluginView, (v) => {
        st.pluginView = v;
        ctx.closeSheet();
        renderPlugins(ctx);
      }, "보기")
    ),
    envNote(ctx),
    await view(ctx, plugins, interop)
  ));
}

function envNote(ctx) {
  const env = ctx.state.pluginEnv;
  if (env.pluginsWritable) return null;
  const text = !env.pluginsReadable ? "이 RisuAI에서는 플러그인 목록을 읽을 수 없어요. 연동 설정과 저장소 보기만 쓸 수 있어요." : "이 RisuAI에서는 다른 플러그인을 켜고 끄거나 순서·코드를 바꿀 수 없어요 (보안 제한). 보기, 카테고리, 업데이트 확인, 연동 설정은 그대로 쓸 수 있어요.";
  return h(
    "div",
    { style: "display:flex;gap:8px;align-items:flex-start" },
    h("div", { style: "flex:1" }, note("info", text)),
    btn("다시 확인", { size: "sm", icon: "refresh", onClick: () => {
      ctx.state.pluginEnv = null;
      renderPlugins(ctx);
    } })
  );
}

var writable = (ctx) => !!ctx.state.pluginEnv?.pluginsWritable;
async function run(ctx, fn, ok) {
  try {
    const r = await ctx.svc.serial(fn);
    if (ok) ctx.toast(typeof ok === "function" ? ok(r) : ok);
  } catch (err) {
    ctx.toast(err?.message ?? String(err), { error: true });
  }
  renderPlugins(ctx);
}

// ── 목록 ──
async function viewList(ctx, plugins, interop) {
  if (!ctx.state.pluginEnv.pluginsReadable) return h("div", { class: "rb-empty" }, "플러그인 목록을 볼 수 없는 환경이에요.");
  const upd = ctx.state.pluginUpd ?? {};
  const linked = new Map(interop.filter((e) => e.pluginName).map((e) => [e.pluginName, e]));
  const q = (ctx.state.search ?? "").trim().toLowerCase();
  const shown = q ? plugins.filter((p) => `${p.displayName} ${p.name} ${p.category}`.toLowerCase().includes(q)) : plugins;
  const groups = /* @__PURE__ */ new Map();
  for (const p of shown) {
    const g = p.category || "미분류";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(p);
  }
  const keys = [...groups.keys()].sort((a, b) => a === "미분류" ? 1 : b === "미분류" ? -1 : a.localeCompare(b));
  const dupCount = plugins.filter((p) => p.dup).length;
  const updCount = Object.values(upd).filter((u) => u.hasUpdate).length;
  const row = (p) => {
    const u = upd[p.name];
    const sw = switchEl(p.enabled, {
      label: `${p.displayName} 켜기`,
      disabled: !writable(ctx) || p.self,
      onChange: (on) => run(ctx, () => P.setEnabled(ctx.api, p.name, on), on ? "켰어요" : "껐어요")
    });
    return h(
      "div",
      { class: ["rb-row", !p.enabled && "off"], style: "cursor:default" },
      h("span", { style: "display:flex;color:var(--rb-sub)" }, icon("plugin", 18)),
      h(
        "div",
        { class: "txt" },
        h(
          "div",
          { class: "ttl" },
          h("span", { class: "name" }, p.displayName),
          p.self && badge("이 플러그인", "acc"),
          linked.has(p.name) && badge("연동", "acc2"),
          u?.hasUpdate && badge(`v${u.latest} 있음`, "acc"),
          p.dup && badge("중복", "warn")
        ),
        h("span", { class: "meta" }, [p.name, p.version && `v${p.version}`, fmtBytes(p.size)].filter(Boolean).join(" · "))
      ),
      sw,
      iconBtn("more", `${p.displayName} 메뉴`, { onClick: (ev) => rowMenu(ctx, p, linked.get(p.name), ev.currentTarget) })
    );
  };
  return h(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    h(
      "div",
      { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn(updCount ? `업데이트 ${updCount}개` : "업데이트 확인", { size: "sm", icon: "download", onClick: async () => {
        ctx.toast("업데이트를 확인하고 있어요");
        ctx.state.pluginUpd = await P.checkUpdates(ctx.api, plugins).catch(() => ({}));
        const n = Object.values(ctx.state.pluginUpd).filter((x) => x.hasUpdate).length;
        ctx.toast(n ? `새 버전이 있는 플러그인 ${n}개` : "모두 최신이에요 (업데이트 주소가 있는 것만 확인)");
        renderPlugins(ctx);
      } }),
      dupCount && writable(ctx) ? btn(`중복 정리 (${dupCount})`, { size: "sm", icon: "trash", onClick: async () => {
        if (!await confirmDialog(ctx.win, { title: "중복된 플러그인을 정리할까요?", body: "같은 이름이 여러 개면 가장 나중에 추가된 것만 남겨요. 정리 전 상태는 백업에 남아요.", ok: "정리" })) return;
        run(ctx, () => P.dedupe(ctx.api), (n) => `${n}개를 정리했어요`);
      } }) : null,
      btn("내보내기", { size: "sm", icon: "upload", onClick: async () => download(`dusk-plugins-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`, await P.exportAll(ctx.api), "application/json") })
    ),
    shown.length ? null : h("div", { class: "rb-empty" }, q ? "찾는 플러그인이 없어요." : "플러그인이 없어요."),
    keys.map((g) => h(
      "div",
      { style: "display:flex;flex-direction:column;gap:4px" },
      h("h3", { class: "rb-h3", style: "display:flex;gap:6px;align-items:center" }, icon("folder", 16), g, h("small", { class: "rb-muted" }, String(groups.get(g).length))),
      groups.get(g).map(row)
    ))
  );
}

function rowMenu(ctx, p, entry, anchor) {
  const w = writable(ctx);
  openMenu(ctx.win, anchor, [
    entry && { label: "연동 설정 열기", icon: "sliders", onClick: () => {
      ctx.state.pluginView = "interop";
      ctx.state.pluginOpen = entry.id;
      renderPlugins(ctx);
    } },
    { label: p.category ? `카테고리: ${p.category}` : "카테고리 지정", icon: "folder", onClick: async () => {
      const c = await promptDialog(ctx.win, { title: "카테고리", label: "비우면 미분류로 돌아가요", value: p.category, placeholder: "예: 번역, UI" });
      if (c === null) return;
      await P.setCategory(ctx.api, p.name, c.trim());
      renderPlugins(ctx);
    } },
    w && "sep",
    w && { label: "맨 위로", icon: "up", onClick: () => run(ctx, () => P.move(ctx.api, p.name, "top")) },
    w && { label: "위로", icon: "up", onClick: () => run(ctx, () => P.move(ctx.api, p.name, "up")) },
    w && { label: "아래로", icon: "down", onClick: () => run(ctx, () => P.move(ctx.api, p.name, "down")) },
    w && { label: "맨 아래로", icon: "down", onClick: () => run(ctx, () => P.move(ctx.api, p.name, "bottom")) },
    w && "sep",
    w && { label: "코드 교체 (.js 파일)", icon: "code", onClick: async () => {
      const [f] = await pickFiles({ accept: ".js,text/javascript" });
      if (!f) return;
      const script = await f.text();
      const hd = P.parseHeader(script);
      if (!await confirmDialog(ctx.win, { title: `'${p.displayName}' 코드를 바꿀까요?`, body: `${f.name}${hd.version ? ` (v${hd.version})` : ""}\n바꾸기 전 상태는 백업에 남아요. 적용하려면 RisuAI를 새로고침해야 할 수 있어요.`, ok: "바꾸기" })) return;
      run(ctx, () => P.replaceCode(ctx.api, p.name, script), "코드를 바꿨어요");
    } }
  ]);
}

// ── 연동 설정 ──
async function viewInterop(ctx, plugins, interop) {
  const open = ctx.state.pluginOpen && interop.find((e) => e.id === ctx.state.pluginOpen);
  if (open) setTimeout(() => showInterop(ctx, open), 0);
  ctx.state.pluginOpen = null;
  return h(
    "div",
    { style: "display:flex;flex-direction:column;gap:6px" },
    interop.length ? null : h(
      "div",
      { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:8px" },
      h("h3", { class: "rb-h3" }, "연동한 플러그인이 아직 없어요"),
      h("p", { class: "rb-p" }, "DA Interop 스니펫을 넣은 플러그인은 여기에 설정 화면이 자동으로 생겨요. 플러그인 제작자라면 생성기에서 스니펫을 만들 수 있어요."),
      h("p", { class: "rb-muted", style: "user-select:all;word-break:break-all" }, INTEROP_URL)
    ),
    interop.map((e) => h(
      "button",
      { type: "button", class: "rb-row", onClick: () => showInterop(ctx, e) },
      h("span", { style: "display:flex;color:var(--rb-acc-text)" }, icon("sliders", 18)),
      h(
        "div",
        { class: "txt" },
        h(
          "div",
          { class: "ttl" },
          h("span", { class: "name" }, e.name),
          e.pendingRev ? badge("적용 대기", "warn") : null,
          e.lastError ? badge("오류", "danger") : null,
          e.installed === false ? badge("설치 안 됨", "mute") : null
        ),
        h("span", { class: "meta" }, [e.version && `v${e.version}`, `항목 ${e.fields.length}`, e.presets.length && `프리셋 ${e.presets.length}`, e.updatedAt && fmtWhen(e.updatedAt)].filter(Boolean).join(" · "))
      ),
      icon("chevron", 16)
    ))
  );
}

function fieldInput(f, v) {
  const t = f.type;
  if (t === "toggle") {
    const el = switchEl(!!v, { label: f.label ?? f.key, onChange: (on) => el.setAttribute("aria-checked", on ? "true" : "false") });
    return { el, read: () => el.getAttribute("aria-checked") === "true" };
  }
  if (t === "select") {
    const opts = (f.options ?? []).map((o) => typeof o === "object" ? o : { value: o, label: o });
    const el = h("select", { class: "rb-input" }, opts.map((o) => h("option", { value: String(o.value), selected: String(o.value) === String(v) }, o.label ?? o.value)));
    return { el, read: () => opts.find((o) => String(o.value) === el.value)?.value ?? el.value };
  }
  if (t === "number" || t === "slider") {
    const el = h("input", { class: "rb-input", type: t === "slider" ? "range" : "number", min: f.min, max: f.max, step: f.step ?? "any" });
    el.value = String(v ?? 0);
    if (t !== "slider") return { el, read: () => el.value === "" ? null : Number(el.value) };
    const out = h("b", { style: "min-width:48px;text-align:right" }, String(el.value));
    el.style.cssText = "height:auto;padding:0;border:0;background:transparent";
    el.addEventListener("input", () => out.textContent = el.value);
    return { el: h("div", { style: "display:flex;gap:10px;align-items:center" }, el, out), read: () => Number(el.value) };
  }
  if (t === "textarea") {
    const el = h("textarea", { class: "rb-input", rows: 4, style: "height:auto;padding:10px 14px;resize:vertical" });
    el.value = v ?? "";
    return { el, read: () => el.value };
  }
  if (t === "color") {
    const el = h("input", { class: "rb-input", type: "color", value: v || "#000000", style: "padding:4px;width:64px" });
    return { el, read: () => el.value };
  }
  const el = h("input", { class: "rb-input", type: "text", value: v ?? "" });
  return { el, read: () => el.value };
}

function showInterop(ctx, e) {
  const inputs = {};
  const groups = /* @__PURE__ */ new Map();
  for (const f of e.fields) {
    const g = f.group ?? "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(f);
  }
  const apply = async (values, preset = null) => {
    try {
      const rev = await ctx.svc.serial(() => P.sendPatch(ctx.api, e.id, values, preset));
      ctx.toast(preset ? `'${preset}' 프리셋을 보냈어요` : "설정을 보냈어요");
      const r = await P.waitAck(ctx.api, e.id, rev);
      if (r.ok) ctx.toast(`${e.name}에 적용됐어요`);
      else ctx.toast(r.error === "timeout" ? `${e.name}이(가) 아직 응답하지 않아요. 켜져 있는지 확인해 주세요` : `적용 중 오류: ${r.error}`, { error: true, seconds: 8 });
    } catch (err) {
      ctx.toast(err?.message ?? String(err), { error: true });
    }
    const fresh = (await P.listInterop(ctx.api).catch(() => [])).find((x) => x.id === e.id);
    if (fresh && ctx.state.pluginView === "interop") showInterop(ctx, fresh);
  };
  const readAll = () => {
    const out = { ...e.values };
    for (const [k, r] of Object.entries(inputs)) out[k] = r.read();
    return out;
  };
  ctx.showDetail(h(
    "div",
    { class: "rb-section", style: "gap:14px" },
    h("div", null, h("h2", { class: "rb-h2" }, e.name), h("p", { class: "rb-p" }, e.description || `id: ${e.id}`)),
    e.lastError ? note("err", `마지막 적용 오류: ${e.lastError}`) : null,
    e.pendingRev ? note("warn", "보낸 설정을 아직 적용하지 않았어요. 해당 플러그인이 켜져 있어야 적용돼요.") : null,
    e.presets.length ? h(
      "div",
      { style: "display:flex;flex-direction:column;gap:6px" },
      h("span", { class: "rb-label" }, "프리셋"),
      h("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, e.presets.map((p) => btn(p.name, { size: "sm", onClick: () => apply(P.presetValues(e, p.name), p.name) })))
    ) : null,
    [...groups].map(([g, fields]) => h(
      "div",
      { class: g ? "rb-card pad bordered" : "", style: "display:flex;flex-direction:column;gap:12px" },
      g ? h("h3", { class: "rb-h3" }, g) : null,
      fields.map((f) => {
        const r = fieldInput(f, e.values?.[f.key] ?? f.default);
        inputs[f.key] = r;
        return h(
          "label",
          { class: "rb-field", style: f.type === "toggle" ? "display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:10px" : "" },
          h("span", { style: "display:flex;flex-direction:column;gap:2px" }, h("span", { class: "rb-label" }, f.label ?? f.key), f.description ? h("small", { class: "rb-muted" }, f.description) : null),
          r.el
        );
      })
    )),
    e.fields.length ? h("div", { style: "display:flex;gap:8px" }, btn("적용", { kind: "primary", icon: "check", onClick: () => apply(readAll()) })) : note("info", "바꿀 수 있는 항목이 없어요."),
    h("hr", { style: "border:0;border-top:1px solid var(--rb-line);width:100%" }),
    btn("연동 정보 지우기", { size: "sm", kind: "danger", icon: "trash", onClick: async () => {
      if (!await confirmDialog(ctx.win, { title: `${e.name} 연동 정보를 지울까요?`, body: "플러그인을 지웠을 때 정리용이에요. 플러그인이 켜져 있으면 다음 실행 때 다시 등록돼요.", ok: "지우기", danger: true })) return;
      await ctx.svc.serial(() => P.pruneInterop(ctx.api, e.id)).catch((err) => ctx.toast(err?.message ?? String(err), { error: true }));
      ctx.closeSheet();
      renderPlugins(ctx);
    } })
  ));
  ctx.openSheet();
}

// ── 저장소 (Dusk Atelier 자신의 pluginStorage) ──
async function viewStorage(ctx) {
  if (!P.storageAvailable(ctx.api)) return note("info", "이 RisuAI에서는 저장소 목록을 볼 수 없어요.");
  const items = await P.storageDump(ctx.api).catch(() => []);
  const total = items.reduce((s, x) => s + x.size, 0);
  return h(
    "div",
    { style: "display:flex;flex-direction:column;gap:6px" },
    h("p", { class: "rb-muted" }, `플러그인 저장소 값 ${items.length}개 · ${fmtBytes(total)} (모든 플러그인이 함께 쓰는 저장소예요. 다른 플러그인 값을 지우면 그 플러그인 설정이 사라질 수 있어요)`),
    items.map((it) => h(
      "button",
      { type: "button", class: "rb-row", onClick: () => {
        const text = typeof it.value === "string" ? prettyJson(it.value) : JSON.stringify(it.value, null, 2);
        ctx.showDetail(h(
          "div",
          { class: "rb-section", style: "gap:10px" },
          h("h2", { class: "rb-h2", style: "word-break:break-all" }, it.key),
          h("p", { class: "rb-muted" }, fmtBytes(it.size)),
          h("pre", { class: "rb-card pad bordered rb-scroll", style: "margin:0;max-height:60vh;overflow:auto;font-size:12px;white-space:pre-wrap;word-break:break-all" }, text.length > 2e5 ? text.slice(0, 2e5) + "\n…(잘림)" : text),
          h(
            "div",
            { style: "display:flex;gap:8px" },
            btn("내려받기", { size: "sm", icon: "download", onClick: () => download(`${it.key.replace(/[^\w.-]+/g, "_")}.json`, text, "application/json") }),
            btn("지우기", { size: "sm", kind: "danger", icon: "trash", onClick: async () => {
              if (!await confirmDialog(ctx.win, { title: `'${it.key}'을(를) 지울까요?`, body: "이 값을 쓰는 플러그인의 설정이나 기록이 사라질 수 있어요.", ok: "지우기", danger: true })) return;
              await ctx.api.pluginStorage.removeItem(it.key);
              ctx.closeSheet();
              renderPlugins(ctx);
            } })
          )
        ));
        ctx.openSheet();
      } },
      h("span", { style: "display:flex;color:var(--rb-sub)" }, icon("text", 18)),
      h("div", { class: "txt" }, h("div", { class: "ttl" }, h("span", { class: "name" }, it.key)), h("span", { class: "meta" }, fmtBytes(it.size))),
      icon("chevron", 16)
    ))
  );
}
function prettyJson(s) {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

// ── 백업 ──
async function viewBackup(ctx) {
  const list = await P.listBackups(ctx.api);
  const w = writable(ctx);
  return h(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px" },
    h(
      "div",
      { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:8px" },
      h("h3", { class: "rb-h3" }, "파일로 내보내기"),
      h("p", { class: "rb-p" }, "플러그인 목록(코드 포함), 카테고리, 연동 설정을 JSON 파일 하나로 받아요."),
      h("div", null, btn("내보내기", { icon: "download", onClick: async () => download(`dusk-plugins-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`, await P.exportAll(ctx.api), "application/json") }))
    ),
    h("h3", { class: "rb-h3" }, "자동 백업"),
    h("p", { class: "rb-muted" }, "플러그인을 켜고 끄거나 순서·코드를 바꾸기 직전 상태를 최근 5개까지 남겨요."),
    list.length ? null : h("div", { class: "rb-empty" }, "아직 백업이 없어요."),
    list.map((b) => h(
      "div",
      { class: "rb-row", style: "cursor:default" },
      h("span", { style: "display:flex;color:var(--rb-sub)" }, icon("history", 18)),
      h("div", { class: "txt" }, h("div", { class: "ttl" }, h("span", { class: "name" }, b.label)), h("span", { class: "meta" }, `${fmtWhen(b.at)} · 플러그인 ${b.count}개`)),
      w ? btn("복원", { size: "sm", onClick: async () => {
        if (!await confirmDialog(ctx.win, { title: "이 상태로 되돌릴까요?", body: `${b.label} 직전 상태로 플러그인 목록을 되돌려요. 지금 상태도 백업에 남아요.`, ok: "되돌리기" })) return;
        run(ctx, () => P.restoreBackup(ctx.api, b.id), "되돌렸어요");
      } }) : null
    ))
  );
}
