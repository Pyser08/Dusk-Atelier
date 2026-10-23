// 플러그인 탭 — 목록·카테고리·업데이트 확인 / DA Interop 연동 설정 / 플러그인 만들기 / 저장소 보기
import { download, fmtBytes, fmtWhen, h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, confirmDialog, iconBtn, loading, note, openMenu, promptDialog, segmented, switchEl } from '../kit.js';
import * as P from '../../data/plugins.js';
import * as T from '../../data/pluginTemplate.js';
import { codeEditor, highlight } from '../codeedit.js';

var VIEWS = [["list", "목록"], ["interop", "연동 설정"], ["create", "만들기"], ["storage", "저장소"]];
var INTEROP_URL = "https://pyser08.github.io/dusk-atelier-interop/";
var PLUGINS_TTL = 6e4;

// ── 캐시 ── 탭을 오갈 때마다 DB를 다시 읽지 않게 한다 (plugins는 코드까지 들어 있어 큼)
var memo = (ctx) => ctx.state.pluginCache ??= {};
async function getPlugins(ctx, fresh) {
  const c = memo(ctx);
  if (fresh || !c.plugins || Date.now() - c.pluginsAt > PLUGINS_TTL) {
    c.plugins = await P.listPlugins(ctx.api).catch(() => []);
    c.pluginsAt = Date.now();
    ctx.setNavCount("plugins", c.plugins.length || void 0);
  }
  return c.plugins;
}
async function getInterop(ctx, fresh) {
  const c = memo(ctx);
  // 연동 값은 다른 플러그인이 바꾸므로 짧게만 기억한다
  if (fresh || !c.interop || Date.now() - c.interopAt > 3e3) {
    const names = c.plugins ? new Set(c.plugins.map((p) => p.name)) : null;
    c.interop = await P.listInterop(ctx.api, names).catch(() => []);
    c.interopAt = Date.now();
  }
  return c.interop;
}

// ── 화면 틀 ── 머리글과 보기 전환 버튼은 한 번만 만들고, 아래 내용만 바꾼다
var LOADERS = { list: viewList, interop: viewInterop, create: viewCreate, storage: viewStorage };

export async function renderPlugins(ctx, { fresh = false } = {}) {
  const st = ctx.state;
  if (!LOADERS[st.pluginView]) st.pluginView = "list";
  let shell = ctx.main.querySelector(":scope > .rb-plugins");
  if (!shell) {
    const seg = segmented(VIEWS, st.pluginView, (v) => {
      if (v === st.pluginView) return;
      st.pluginView = v;
      ctx.closeSheet();
      renderPlugins(ctx);
    }, "보기");
    shell = h(
      "div",
      { class: "rb-section rb-scroll rb-plugins", style: "flex:1" },
      h(
        "div",
        { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" },
        h("div", { style: "flex:1;min-width:200px" }, h("h2", { class: "rb-h2" }, "플러그인"), h("p", { class: "rb-p" }, "설치한 플러그인을 묶어 보고, 연동한 플러그인의 설정을 바꾸거나 새로 만들어요.")),
        seg
      ),
      h("div", { class: "rb-plugins-body", style: "display:flex;flex-direction:column;gap:14px;transition:opacity .12s" })
    );
    replace(ctx.main, shell);
  }
  shell.querySelectorAll(".rb-seg button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === st.pluginView ? "true" : "false"));
  const body = shell.querySelector(".rb-plugins-body");
  const view = st.pluginView;
  // 마지막 요청만 화면에 반영한다 (빠르게 연달아 눌러도 늦게 끝난 이전 탭이 덮어쓰지 않게)
  const token = st.pluginToken = (st.pluginToken ?? 0) + 1;
  const slow = setTimeout(() => {
    if (token === st.pluginToken) replace(body, loading("불러오는 중", { rows: view === "list" ? 4 : 0 }));
  }, 150);
  body.style.opacity = ".55";
  try {
    const node = await LOADERS[view](ctx, { fresh });
    if (token !== st.pluginToken) return;
    if (body.firstElementChild !== node) replace(body, node);
  } catch (err) {
    if (token === st.pluginToken) replace(body, note("err", `화면을 열지 못했어요: ${err?.message ?? err}`));
  } finally {
    clearTimeout(slow);
    if (token === st.pluginToken) body.style.opacity = "";
  }
}
var refresh = (ctx) => renderPlugins(ctx, { fresh: true });

// ── 목록 ──
async function viewList(ctx, { fresh }) {
  const plugins = await getPlugins(ctx, fresh);
  const interop = await getInterop(ctx, fresh);
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
  const updCount = Object.values(upd).filter((u) => u.hasUpdate).length;
  const row = (p) => {
    const u = upd[p.name];
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
          !p.enabled && badge("꺼짐", "mute"),
          linked.has(p.name) && badge("연동", "acc2"),
          u?.hasUpdate && badge(`v${u.latest} 있음`, "acc"),
          p.dup && badge("중복", "warn")
        ),
        h("span", { class: "meta" }, [p.name, p.version && `v${p.version}`, fmtBytes(p.size)].filter(Boolean).join(" · "))
      ),
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
      btn("새로고침", { size: "sm", icon: "refresh", onClick: () => refresh(ctx) }),
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
      p.category = c.trim();
      renderPlugins(ctx);
    } }
  ]);
}

// ── 연동 설정 ──
async function viewInterop(ctx, { fresh }) {
  if (!memo(ctx).plugins) await getPlugins(ctx).catch(() => []);
  const interop = await getInterop(ctx, true);
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
    if (ctx.state.pluginView === "interop") refresh(ctx);
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
      refresh(ctx);
    } })
  ));
  ctx.openSheet();
}

// ── 저장소 (모든 플러그인이 함께 쓰는 pluginStorage) ──
async function viewStorage(ctx, { fresh }) {
  if (!P.storageAvailable(ctx.api)) return note("info", "이 RisuAI에서는 저장소 목록을 볼 수 없어요.");
  const c = memo(ctx);
  if (fresh || !c.storage || Date.now() - c.storageAt > 1e4) {
    c.storage = await P.storageDump(ctx.api).catch(() => []);
    c.storageAt = Date.now();
  }
  const items = c.storage;
  const total = items.reduce((s, x) => s + x.size, 0);
  return h(
    "div",
    { style: "display:flex;flex-direction:column;gap:6px" },
    h(
      "div",
      { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" },
      h("p", { class: "rb-muted", style: "flex:1;min-width:200px" }, `플러그인 저장소 값 ${items.length}개 · ${fmtBytes(total)} (모든 플러그인이 함께 쓰는 저장소예요. 다른 플러그인 값을 지우면 그 플러그인 설정이 사라질 수 있어요)`),
      btn("새로고침", { size: "sm", icon: "refresh", onClick: () => refresh(ctx) })
    ),
    items.map((it) => h(
      "button",
      { type: "button", class: "rb-row", onClick: () => showStorageItem(ctx, it) },
      h("span", { style: "display:flex;color:var(--rb-sub)" }, icon("text", 18)),
      h("div", { class: "txt" }, h("div", { class: "ttl" }, h("span", { class: "name" }, it.key)), h("span", { class: "meta" }, fmtBytes(it.size))),
      icon("chevron", 16)
    ))
  );
}
function showStorageItem(ctx, it) {
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
        refresh(ctx);
      } })
    )
  ));
  ctx.openSheet();
}
function prettyJson(s) {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

// ── 만들기 ──
// 코드에서 해당 부분을 찾을 때 쓰는 글자
var FIND = { header: "//@name", snippet: "const registerInterop", body: "===== 플러그인 본체", fields: "fields: [", presets: "presets: [", getValues: "getValues:", apply: "apply: async", id: "id: '", name: "//@name", displayName: "//@display-name", version: "//@version", description: "description:" };

function helpBtn(ctx, key, editor) {
  return h("button", { type: "button", class: "rb-help-q", "aria-label": `${T.HELP[key]?.[0] ?? key} 도움말`, title: "도움말", onClick: (e) => {
    e.preventDefault();
    e.stopPropagation();
    showHelp(ctx, key, editor);
  } }, "?");
}

function showHelp(ctx, key, editor) {
  const [title, desc, example] = T.HELP[key] ?? ["도움말", "", ""];
  const ex = example ? h("div", { class: "rb-code", style: "min-height:0;max-height:none" }, h("pre", { style: "padding:10px 12px" })) : null;
  if (ex) ex.firstChild.innerHTML = highlight(example);
  ctx.showDetail(h(
    "div",
    { class: "rb-section", style: "gap:12px" },
    h("h2", { class: "rb-h2" }, title),
    h("p", { class: "rb-p", style: "white-space:pre-line" }, desc),
    ex,
    FIND[key] && editor ? h("div", null, btn("코드에서 보기", { size: "sm", icon: "search", onClick: () => {
      if (!editor.reveal(FIND[key])) ctx.toast("코드에서 찾지 못했어요", { error: true });
      else if (ctx.isMobile()) ctx.closeSheet();
    } })) : null,
    h("hr", { style: "border:0;border-top:1px solid var(--rb-line);width:100%" }),
    h("span", { class: "rb-label" }, "다른 도움말"),
    h("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, T.HELP_ORDER.filter((k) => k !== key).map((k) => btn(T.HELP[k][0], { size: "sm", onClick: () => showHelp(ctx, k, editor) })))
  ));
  ctx.openSheet();
}

async function viewCreate(ctx) {
  // 만들기 화면은 한 번 만든 것을 그대로 다시 붙인다 (탭을 오가도 바로 뜨고, 쓰던 코드·커서가 그대로)
  const kept = memo(ctx).createNode;
  if (kept) return kept;
  if (!document.getElementById("rb-help-style")) document.head.appendChild(h("style", { id: "rb-help-style" }, `.rb-help-q{width:20px;height:20px;border-radius:50%;border:1px solid var(--rb-line);background:var(--rb-surf);color:var(--rb-acc-text);font-size:12px;font-weight:700;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;padding:0}.rb-help-q:hover{background:var(--rb-acc-soft)}.rb-sec-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 6px 4px 10px;border-radius:999px;border:1px solid var(--rb-line);font-size:12px;color:var(--rb-sub);cursor:pointer;background:transparent}.rb-sec-chip:hover{background:var(--rb-hover)}`));
  const saved = await (async () => {
    try {
      const raw = await ctx.api.pluginStorage.getItem(T.DRAFT_KEY);
      return raw ? typeof raw === "string" ? JSON.parse(raw) : raw : null;
    } catch {
      return null;
    }
  })();
  const meta = { ...T.DEFAULT_META, ...saved?.meta ?? {} };
  let saveTimer = null;
  const saveDraft = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => ctx.api.pluginStorage.setItem(T.DRAFT_KEY, JSON.stringify({ v: 1, meta, code: editor.value, at: Date.now() })).catch(() => {
    }), 600);
  };
  const editor = codeEditor(saved?.code || T.buildTemplate(meta), { label: "플러그인 코드", onChange: saveDraft, minHeight: "62vh", maxHeight: "82vh" });
  const results = h("div", { style: "display:flex;flex-direction:column;gap:6px" });
  const runCheck = () => {
    const r = T.checkCode(editor.value, meta);
    replace(results, r.length ? r.map((x) => note(x.level === "err" ? "err" : "warn", x.text)) : note("info", "문제를 찾지 못했어요."));
    return r;
  };
  const field = (key, label, placeholder) => {
    const input = h("input", { class: "rb-input", value: meta[key] ?? "", placeholder, "aria-label": label });
    input.addEventListener("input", () => {
      meta[key] = input.value.trim();
      editor.value = T.syncMeta(editor.value, meta);
      saveDraft();
    });
    return h("label", { class: "rb-field" }, h("span", { style: "display:flex;align-items:center;gap:6px" }, h("span", { class: "rb-label" }, label), helpBtn(ctx, key, editor)), input);
  };
  const sec = (key, label) => h("span", { class: "rb-sec-chip", role: "button", tabindex: "0", onClick: () => editor.reveal(FIND[key]) }, label, helpBtn(ctx, key, editor));
  const fileName = () => `${(meta.name || "plugin").replace(/[^\w.-]+/g, "_")}.js`;
  const node = h(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    h("p", { class: "rb-p" }, "DA Interop이 들어간 플러그인을 바로 만들어요. 맨 위에는 스니펫, 맨 아래에는 등록 코드가 들어 있어요. ? 를 누르면 어디에 무엇을 넣는지 볼 수 있어요."),
    h("h3", { class: "rb-h3" }, "기본 정보"),
    h(
      "div",
      { class: "rb-card pad bordered", style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px" },
      field("name", "플러그인 이름", "my_plugin"),
      field("displayName", "표시 이름", "내 플러그인"),
      field("version", "버전", "1.0.0"),
      field("id", "연동 id", "my-plugin"),
      h("div", { style: "grid-column:1/-1" }, field("description", "설명", "Dusk Atelier에 보일 한 줄 설명"))
    ),
    // 코드 칸: 위아래로 넉넉히 띄우고 선으로 구분해 스크롤하다가 바로 찾을 수 있게
    h(
      "div",
      { class: "rb-create-code", style: "display:flex;flex-direction:column;gap:12px;margin:26px 0;padding:22px 0;border-top:1px solid var(--rb-line);border-bottom:1px solid var(--rb-line)" },
      h(
        "div",
        { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" },
        h("h3", { class: "rb-h3", style: "display:flex;align-items:center;gap:6px;margin-right:6px" }, icon("code", 18), "플러그인 코드"),
        sec("header", "① 머리말"),
        sec("snippet", "② 스니펫"),
        sec("body", "③ 본체"),
        sec("fields", "④ fields"),
        sec("presets", "presets"),
        sec("apply", "apply")
      ),
      editor.el
    ),
    h("h3", { class: "rb-h3" }, "검사·설치"),
    results,
    h(
      "div",
      { style: "display:flex;gap:8px;flex-wrap:wrap;align-items:center" },
      btn("검사", { icon: "check", onClick: () => runCheck() }),
      btn("설치", { kind: "primary", icon: "plus", onClick: () => installDraft(ctx, editor.value, meta, runCheck) }),
      btn("내려받기", { icon: "download", onClick: () => {
        if (runCheck().some((x) => x.level === "err")) return ctx.toast("오류를 먼저 고쳐 주세요", { error: true });
        download(fileName(), editor.value, "text/javascript");
      } }),
      helpBtn(ctx, "install", editor),
      h("span", { style: "flex:1" }),
      btn("처음부터 다시", { size: "sm", kind: "danger", icon: "refresh", onClick: async () => {
        if (!await confirmDialog(ctx.win, { title: "템플릿으로 되돌릴까요?", body: "지금 쓴 코드는 사라지고 위 칸의 이름으로 새 템플릿을 만들어요.", ok: "되돌리기", danger: true })) return;
        editor.value = T.buildTemplate(meta);
        saveDraft();
        replace(results);
      } })
    )
  );
  memo(ctx).createNode = node;
  return node;
}

async function installDraft(ctx, code, meta, runCheck) {
  const r = runCheck();
  if (r.some((x) => x.level === "err")) return ctx.toast("오류를 먼저 고쳐 주세요", { error: true });
  if (typeof ctx.api.setDatabase !== "function") return ctx.toast("이 RisuAI에서는 플러그인 안에서 설치할 수 없어요. 내려받아서 설정 → 플러그인에서 가져와 주세요.", { error: true, seconds: 8 });
  const obj = T.toPluginObject(code);
  const before = (await ctx.api.getDatabase(["plugins"]).catch(() => null))?.plugins ?? [];
  const exists = before.some((p) => p.name === obj.name);
  if (!await confirmDialog(ctx.win, { title: `'${obj.displayName}' 플러그인을 설치할까요?`, body: `${exists ? "같은 이름의 플러그인이 있어서 덮어써요.\n" : ""}다음에 RisuAI가 한 번 더 확인 창을 띄워요. 허락해야 설치돼요.`, ok: "설치" })) return;
  try {
    await ctx.svc.serial(() => ctx.api.setDatabase({ plugins: [obj] }));
  } catch (err) {
    return ctx.toast(err?.message ?? String(err), { error: true });
  }
  const after = (await ctx.api.getDatabase(["plugins"]).catch(() => null))?.plugins ?? [];
  if (after.some((p) => p.name === obj.name && p.script === obj.script)) {
    ctx.toast(`'${obj.displayName}'을(를) 설치했어요. 실행되지 않으면 새로고침해 주세요.`, { seconds: 8 });
    memo(ctx).pluginsAt = 0;
  } else ctx.toast("설치되지 않았어요. 확인 창에서 취소했거나, 같은 코드가 이미 설치돼 있어요.", { error: true, seconds: 8 });
}
