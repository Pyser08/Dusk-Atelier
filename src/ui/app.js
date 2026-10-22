import { btn, iconBtn, toast } from './kit.js';
import { CSS2, FONT_LINK } from './styles.js';
import { resolveMode, themeVars } from './theme.js';
import { createPrefs } from './prefs.js';
import { renderModules } from './screens/modules.js';
import { renderSettings } from './screens/settings.js';
import { renderTools } from './screens/tools.js';
import { renderPlaceholder } from './screens/placeholder.js';
import { renderPresets } from './screens/presets.js';
import { renderCharacters } from './screens/characters.js';
import { renderHistory } from './screens/history.js';
import { onNotice } from '../data/modules.js';
import { fadeUp, h, motion, replace } from './dom.js';
import { icon } from './icons.js';
import { createService } from '../data/service.js';
import { openEditor } from './screens/editor.js';
import { createAssetLoader } from './assets.js';
import { openAssets } from './screens/assetmgr.js';
import { renderDev } from './screens/dev.js';

var TABS = [
  { id: "modules", label: "모듈", icon: "module" },
  { id: "characters", label: "캐릭터", icon: "character" },
  { id: "presets", label: "프리셋", icon: "preset" },
  { id: "history", label: "기록", icon: "history" },
  { id: "tools", label: "도구", icon: "tools" },
  { id: "dev", label: "개발", icon: "code", dev: true }
];
export function createApp(api, { legacy, version, onPersonaChanged }) {
  const doc = document;
  if (!doc.getElementById("rb-style")) {
    doc.head.appendChild(h("link", { rel: "stylesheet", href: FONT_LINK }));
    doc.head.appendChild(h("style", { id: "rb-style" }, CSS2));
  }
  const prefs = createPrefs(api);
  const svc = createService(api, prefs);
  const assets = createAssetLoader(api);
  const state = { tab: "modules", search: "", risuScheme: "dark", mode: "dark", sub: null, opened: false };
  const root = h("div", { class: "rb-root", hidden: true });
  const win = h("div", { class: "rb-win", role: "dialog", "aria-modal": "true", "aria-label": "Dusk Atelier" });
  root.appendChild(win);
  doc.body.appendChild(root);
  const searchInput = h("input", { type: "search", placeholder: "모듈 이름, 로어북 키워드 검색", "aria-label": "검색" });
  const mobileSearchInput = h("input", { type: "search", placeholder: "검색", "aria-label": "검색" });
  let searchTimer = null;
  const onSearch = (e) => {
    state.search = e.target.value;
    (e.target === searchInput ? mobileSearchInput : searchInput).value = state.search;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => ctx.refresh(), 120);
  };
  searchInput.addEventListener("input", onSearch);
  mobileSearchInput.addEventListener("input", onSearch);
  // 새 버전 알림: 열 때 업데이트 주소의 머리말(앞 512바이트)만 읽어 버전을 비교한다
  const UPDATE_URL = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/main/dusk_atelier.js";
  const UPDATE_HOW = "RisuAI 설정 → 플러그인에서 Dusk Atelier 옆 초록색 + 버튼을 누르면 업데이트돼요.";
  let latest = null, updAt = 0;
  const updBtn = btn("업데이트", { size: "sm", kind: "primary", icon: "download", labelClass: "lbl", onClick: () => ctx.toast(`새 버전 v${latest}이 있어요. ${UPDATE_HOW}`, { seconds: 12 }) });
  updBtn.hidden = true;
  const newer = (a, b) => {
    const x = String(a).split(".").map((n) => parseInt(n, 10) || 0), y = String(b).split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
    return false;
  };
  async function checkUpdate() {
    if (version === "dev" || Date.now() - updAt < 3 * 3600e3) return;
    updAt = Date.now();
    const opts = { headers: { Range: "bytes=0-512" } };
    let res = await fetch(UPDATE_URL, opts).catch(() => null);
    if ((!res || !res.ok) && typeof api.nativeFetch === "function") res = await api.nativeFetch(UPDATE_URL, opts).catch(() => null);
    if (!res || !(res.status >= 200 && res.status < 300)) return;
    const v = /\/\/@version\s+(\S+)/.exec(await res.text())?.[1];
    if (!v || !newer(v, version)) return;
    const first = latest !== v;
    latest = v;
    updBtn.querySelector("span").textContent = `v${v} 업데이트`;
    updBtn.title = `새 버전 v${v}`;
    updBtn.hidden = false;
    if (first) ctx.toast(`새 버전 v${v}이 나왔어요. ${UPDATE_HOW}`, { seconds: 12 });
  }
  const head = h(
    "header",
    { class: "rb-head" },
    h(
      "div",
      { class: "rb-brand" },
      h("div", { class: "rb-logo", "aria-hidden": "true" }, icon("module", 18)),
      h("div", null, h("b", null, "Dusk Atelier"), h("small", null, "for RisuBard"))
    ),
    h("label", { class: "rb-search" }, icon("search", 16), searchInput, h("span", { class: "rb-kbd", "aria-hidden": "true" }, "/")),
    h("div", { class: "rb-spacer" }),
    updBtn,
    btn("가져오기", { icon: "upload", labelClass: "lbl", onClick: () => legacy.open(), id: "rb-import" }),
    iconBtn("palette", "색 바꾸기", { onClick: () => go("tools", "settings") }),
    iconBtn("x", "닫기", { onClick: () => close(), id: "rb-close" })
  );
  const nav = h("nav", { class: "rb-nav", "aria-label": "탭" });
  const tabbar = h("nav", { class: "rb-tabbar", "aria-label": "탭" });
  const navLinks = /* @__PURE__ */ new Map(), barLinks = /* @__PURE__ */ new Map();
  for (const t of TABS) {
    const a = h("a", { href: "#", dataset: { tab: t.id }, onClick: (e) => {
      e.preventDefault();
      go(t.id);
    } }, icon(t.icon, 18), h("span", null, t.label), h("small"));
    navLinks.set(t.id, a);
    nav.appendChild(a);
    const b = h("a", { href: "#", dataset: { tab: t.id }, onClick: (e) => {
      e.preventDefault();
      go(t.id);
    } }, icon(t.icon, 22), t.label);
    barLinks.set(t.id, b);
    tabbar.appendChild(b);
  }
  const navFoot = h("div", { style: "margin-top:auto;display:flex;flex-direction:column" });
  nav.appendChild(navFoot);
  const main = h("section", { class: "rb-main", "aria-live": "polite" });
  const detail3 = h("aside", { class: "rb-detail rb-scroll", "aria-label": "상세" });
  const sheetBack = h("div", { class: "rb-sheet-back", onClick: () => ctx.closeSheet() });
  const body = h("div", { class: "rb-body" }, nav, main, sheetBack, detail3);
  let wasLoading = false;
  new MutationObserver(() => {
    const now = !!main.querySelector(":scope > .rb-loading");
    if (wasLoading && !now) for (const el of main.children) motion(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    wasLoading = now;
  }).observe(main, { childList: true });
  win.append(head, h("label", { class: "rb-search rb-mobile-search" }, icon("search", 16), mobileSearchInput), body, tabbar);
  let dragDepth = 0, dropEl = null;
  const hasFiles = (e) => [...e.dataTransfer?.types ?? []].includes("Files");
  win.addEventListener("dragenter", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    if (!dropEl) {
      dropEl = h("div", { class: "rb-drop" }, h("div", null, icon("upload", 20), "놓으면 종류와 대상을 알아서 찾아요"));
      win.appendChild(dropEl);
    }
  });
  win.addEventListener("dragover", (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  win.addEventListener("dragleave", () => {
    if (--dragDepth <= 0) {
      dragDepth = 0;
      dropEl?.remove();
      dropEl = null;
    }
  });
  win.addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    dropEl?.remove();
    dropEl = null;
    const files = [...e.dataTransfer.files ?? []];
    if (files.length) legacy.startWithFiles(files);
  });
  doc.addEventListener("keydown", (e) => {
    if (root.hidden) return;
    if (e.key === "Escape" && !win.querySelector(".rb-modal, .rb-menu, .rb-full, .rb-lightbox")) {
      if (detail3.classList.contains("open")) ctx.closeSheet();
      else close();
    }
    if (e.key === "/" && doc.activeElement?.tagName !== "INPUT" && doc.activeElement?.tagName !== "TEXTAREA") {
      e.preventDefault();
      searchInput.focus();
    }
  });
  function applyTheme() {
    const theme = prefs.ui?.theme;
    state.mode = resolveMode(theme ?? { mode: "auto" }, state.risuScheme);
    const { vars, scheme } = themeVars(theme, state.mode);
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    doc.documentElement.style.colorScheme = state.risuScheme;
    win.style.colorScheme = scheme;
  }
  function go(tab, sub = null) {
    if (tab !== state.tab) {
      state.search = "";
      searchInput.value = "";
      mobileSearchInput.value = "";
    }
    if (tab === "characters" && Date.now() - (state.charsAt ?? 0) > 3e4) state.charsDirty = true;
    if (tab === "characters") state.charOrderStale = true;
    if (tab === "dev" && !prefs.ui?.devMode) {
      tab = "tools";
      sub = null;
    }
    const changed = tab !== state.tab || sub !== state.sub;
    state.tab = tab;
    state.sub = sub;
    ctx.closeSheet();
    render();
    if (changed) fadeUp(main, { duration: 180 });
  }
  function refreshTabs() {
    const on = !!prefs.ui?.devMode;
    for (const links of [navLinks, barLinks]) {
      const a = links.get("dev");
      if (a) a.hidden = !on;
    }
    win.classList.toggle("rb-has-dev", on);
    if (!on && state.tab === "dev") go("tools");
  }
  function render() {
    refreshTabs();
    for (const links of [navLinks, barLinks]) for (const [id, a] of links) {
      if (id === state.tab) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    replace(
      navFoot,
      h("div", { class: "rb-nav-hint" }, "파일을 창 어디에 끌어다 놓아도 바로 가져와요"),
      h("div", { class: "rb-nav-hint", style: "padding-top:4px" }, `v${version}`)
    );
    const showSearch = ["modules", "characters", "history"].includes(state.tab);
    searchInput.placeholder = { modules: "모듈 이름, 로어북 키워드 검색", characters: "캐릭터 이름, 제작자 검색", history: "기록에서 이름 찾기" }[state.tab] ?? "검색";
    win.classList.toggle("rb-nosearch", !showSearch);
    replace(detail3);
    detail3.hidden = true;
    const screen = { modules: renderModules, characters: renderCharacters, presets: renderPresets, history: renderHistory, tools: state.sub === "settings" ? renderSettings : renderTools, dev: renderDev }[state.tab] ?? renderPlaceholder;
    Promise.resolve(screen(ctx)).catch((err) => {
      replace(main, h("div", { class: "rb-section" }, h("div", { class: "rb-note err", role: "alert" }, icon("alert", 18), h("span", null, `화면을 열지 못했어요: ${err?.message ?? err}`))));
    });
  }
  async function open() {
    try {
      const cs = await api.getColorScheme();
      state.risuScheme = cs?.scheme?.type === "light" ? "light" : "dark";
    } catch {
      state.risuScheme = "dark";
    }
    if (!prefs.ui) await prefs.load();
    else await prefs.reloadMeta();
    state.modDirty = true;
    state.charOrderStale = true;
    svc.invalidate();
    applyTheme();
    root.hidden = false;
    await api.showContainer("fullscreen");
    render();
    checkUpdate().catch(() => {
    });
    motion(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    motion(win, [{ opacity: 0, transform: "translateY(12px) scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 220 });
    state.opened = true;
    setTimeout(() => (win.querySelector(".rb-row") ?? searchInput).focus?.(), 50);
  }
  let closing = false;
  async function close() {
    if (legacy.busy || closing) return;
    closing = true;
    const out = motion(win, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(8px) scale(.99)" }], { duration: 130, fill: "forwards" });
    motion(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: "forwards" });
    if (out) await out.finished.catch(() => {
    });
    root.hidden = true;
    for (const a of [...win.getAnimations(), ...root.getAnimations()]) a.cancel();
    closing = false;
    await api.hideContainer();
  }
  let lastDetail = "";
  const ctx = {
    api,
    prefs,
    svc,
    assets,
    state,
    root,
    win,
    main,
    detail: detail3,
    version,
    legacy,
    onPersonaChanged,
    openEditor: (id) => openEditor(ctx, id),
    openAssets: (id) => openAssets(ctx, id),
    tabs: TABS,
    navLinks,
    go,
    refresh: () => render(),
    applyTheme,
    refreshTabs: () => refreshTabs(),
    setNavCount(tab, n) {
      const s = navLinks.get(tab)?.querySelector("small");
      if (s) s.textContent = n === void 0 ? "" : String(n);
    },
    openSheet() {
      detail3.hidden = false;
      detail3.classList.add("open");
      sheetBack.classList.add("open");
    },
    closeSheet() {
      detail3.classList.remove("open");
      sheetBack.classList.remove("open");
    },
    showDetail(...children) {
      replace(detail3, h("div", { class: "rb-sheet-head" }, iconBtn("x", "상세 닫기", { onClick: () => ctx.closeSheet() })), ...children);
      detail3.hidden = false;
      const key = state.tab + "|" + (detail3.querySelector("h2")?.textContent ?? detail3.textContent.slice(0, 40));
      if (key !== lastDetail) {
        lastDetail = key;
        if (!ctx.isMobile()) motion(detail3, [{ opacity: 0, transform: "translateX(6px)" }, { opacity: 1, transform: "none" }], { duration: 170 });
      }
    },
    toast: (text, opts) => toast(win, text, opts),
    isMobile: () => (win.clientWidth || 1e3) <= 760
  };
  onNotice((msg) => ctx.toast(msg, { seconds: 8 }));
  return { open, close, ctx };
}
