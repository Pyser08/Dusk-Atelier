import { applyDroppedPatch } from './screens/patchui.js';
import { maybeShowTour } from './tour.js';
import { installTooltips } from './tooltip.js';
import { maybeShowWhatsNew, openChangelog, CHANGELOG } from './whatsnew.js';
import { btn, iconBtn, moreNav, openMenu, toast } from './kit.js';
import { CSS2, FONT_LINK } from './styles.js';
import { normalizeTheme, resolveMode, themeVars } from './theme.js';
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
import { renderPlugins } from './screens/plugins.js';
import { renderSettingsTab } from './screens/settingstab.js';
import { renderMemory } from './screens/memory/index.js';
import { renderCardsTab } from './screens/cards/index.js';
import { renderHome } from './screens/home.js';
import { renderSectionHome } from './screens/sectionhome.js';
import { createBotAndEdit } from './screens/newbot.js';
import { BASE_IDS, SEARCH, SECTION_IDS, SECTION_NAMES, TABS, subLabel } from './tabs.js';

export function createApp(api, { legacy, version, onPersonaChanged }) {
  const doc = document;
  if (!doc.getElementById("rb-style")) {
    doc.head.appendChild(h("link", { rel: "stylesheet", href: FONT_LINK }));
    doc.head.appendChild(h("style", { id: "rb-style" }, CSS2));
  }
  const prefs = createPrefs(api);
  const svc = createService(api, prefs);
  const assets = createAssetLoader(api);
  const state = { tab: "modules", search: "", risuScheme: "dark", mode: "dark", sub: null, opened: false, layout: "left", lastMore: "characters" };
  const root = h("div", { class: "rb-root", hidden: true });
  installTooltips(root);
  const win = h("div", { class: "rb-win", role: "dialog", "aria-modal": "true", "aria-label": "Dusk Atelier" });
  root.appendChild(win);
  doc.body.appendChild(root);
  const searchInput = h("input", { type: "search", placeholder: "검색", "aria-label": "검색" });
  let searchTimer = null;
  searchInput.addEventListener("input", (e) => {
    state.search = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => ctx.refresh(), 120);
  });
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
  // 응답 앞부분만 읽고 끊는다 (Range가 무시돼 파일 전체가 와도 다 받지 않게)
  async function headText(res) {
    const rd = res.body?.getReader?.();
    if (!rd) return (await res.text()).slice(0, 2048);
    let out = "";
    const dec = new TextDecoder();
    try {
      while (out.length < 512) {
        const { done, value } = await rd.read();
        if (done) break;
        out += dec.decode(value, { stream: true });
      }
    } finally {
      rd.cancel().catch(() => {
      });
    }
    return out;
  }
  // RisuTide가 켜져 있으면 한 번 알려 준다 (둘이 동시에 업데이트·백업 기록을 쓰면 꼬일 수 있음)
  let tideChecked = false;
  function checkTide() {
    if (tideChecked) return;
    tideChecked = true;
    setTimeout(async () => {
      try {
        const db = await api.getDatabase(["plugins"]);
        const on = (db?.plugins ?? []).some((p) => /^risutide$/i.test(String(p?.name ?? "")) && p.enabled !== false);
        if (on) ctx.toast("RisuTide의 업데이트·백업 기능이 Dusk Atelier로 옮겨왔어요. RisuTide 백업과 기준은 Dusk에서 그대로 보여요. 둘이 함께 켜져 있으면 기록이 꼬일 수 있으니 RisuTide는 꺼 주세요.", { seconds: 14 });
      } catch {
      }
    }, 1500);
  }
  async function checkUpdate() {
    // 열 때마다 확인하되 10분에 한 번까지. 주소 뒤에 시각을 붙여 GitHub 쪽 캐시(약 5분)를 피한다
    if (version === "dev" || Date.now() - updAt < 10 * 60e3) return;
    updAt = Date.now();
    const url = `${UPDATE_URL}?t=${Math.floor(Date.now() / 60e3)}`;
    const headers = { Range: "bytes=0-512" };
    // 플러그인 창은 보안 설정(CSP) 때문에 직접 fetch가 막혀 있어 RisuAI의 nativeFetch를 먼저 쓴다.
    // nativeFetch는 method를 안 주면 POST로 보내서 실패하므로 GET을 꼭 적는다
    let res = null;
    if (typeof api.nativeFetch === "function") res = await Promise.resolve().then(() => api.nativeFetch(url, { method: "GET", headers })).catch(() => null);
    if (!res || !(res.status >= 200 && res.status < 300)) res = await fetch(url, { headers, cache: "no-store" }).catch(() => null);
    if (!res || !(res.status >= 200 && res.status < 300)) return;
    const v = /\/\/@version\s+(\S+)/.exec(await headText(res))?.[1];
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
      "button",
      { type: "button", class: "rb-brand", title: "홈으로", "aria-label": "Dusk Atelier 홈으로", onClick: () => go("home") },
      h("div", { class: "rb-logo", "aria-hidden": "true" }, icon("module", 18)),
      h("span", null, h("b", null, "Dusk Atelier"), h("small", null, "for RisuBard"))
    ),
    h("div", { class: "rb-spacer" }),
    updBtn,
    btn("가져오기", { icon: "upload", labelClass: "lbl", onClick: () => legacy.open(), id: "rb-import" }),
    iconBtn("palette", "꾸미기", { onClick: () => go("look"), id: "rb-look" }),
    iconBtn("gear", "설정", { onClick: () => go("settings"), id: "rb-settings" }),
    iconBtn("x", "닫기", { onClick: () => close(), id: "rb-close" })
  );
  // 메뉴: 왼쪽(left) · 위쪽(top) · 모바일 아래 탭. 어떤 걸 보일지는 win 클래스(rb-lay-*)가 정한다
  const nav = h("nav", { class: "rb-nav", "aria-label": "탭" });
  const topnav = h("nav", { class: "rb-topnav", "aria-label": "탭" });
  const tabbar = h("nav", { class: "rb-tabbar", "aria-label": "탭" });
  const navLinks = /* @__PURE__ */ new Map(), topLinks = /* @__PURE__ */ new Map(), barLinks = /* @__PURE__ */ new Map();
  const mkLink = (t, size, withCount) => h("a", { href: "#", dataset: { tab: t.id }, onClick: (e) => {
    e.preventDefault();
    go(t.id);
  } }, icon(t.icon, size), withCount ? h("span", null, t.label) : t.label, withCount ? h("small") : null);
  // 사이드바·위쪽 바는 기억 → 관리 → 작업실 섹션별로 나눈다.
  let currentSection = null;
  for (const t of TABS) {
    if (t.section && t.section !== currentSection) {
      currentSection = t.section;
      nav.appendChild(h("div", { class: "rb-nav-lab", "aria-hidden": "true" }, SECTION_NAMES[currentSection]));
      topnav.appendChild(h("span", { class: "rb-topsep", "aria-hidden": "true" }));
    }
    const a = mkLink(t, 18, true);
    navLinks.set(t.id, a);
    nav.appendChild(a);
    const c = mkLink(t, 16, false);
    c.appendChild(h("small"));
    topLinks.set(t.id, c);
    topnav.appendChild(c);
  }
  // 메뉴 위치 바꾸기: 사이드바 맨 아래 · 위쪽 바 오른쪽의 `◧ 왼쪽 | ⬒ 위쪽` 분할 버튼 (설정 → 화면 → 메뉴 위치와 같은 값)
  const layoutSeg = () => {
    const seg = h("div", { class: "rb-layseg", role: "group", "aria-label": "메뉴 위치" });
    for (const [v, text, ic] of [["left", "왼쪽", "◧"], ["top", "위쪽", "⬒"]]) {
      seg.appendChild(h("button", { type: "button", dataset: { v }, "aria-pressed": "false", title: `메뉴를 ${text}에`, onClick: () => setLayout(v) }, h("span", { "aria-hidden": "true" }, ic), text));
    }
    return seg;
  };
  topnav.appendChild(layoutSeg());
  // 모바일 아래 탭바: 홈 + 기억 · 관리 · 작업실
  for (const id of BASE_IDS.filter((id) => id === "home")) {
    const t = TABS.find((x) => x.id === id);
    const b = mkLink(t, 22, false);
    barLinks.set(id, b);
    tabbar.appendChild(b);
  }
  for (const section of SECTION_IDS) {
    const first = TABS.find((t) => t.section === section);
    const b = h("a", { href: "#", dataset: { section }, onClick: (e) => {
      e.preventDefault();
      go(first.id);
    } }, icon(first.icon, 22), SECTION_NAMES[section]);
    tabbar.appendChild(b);
    barLinks.set(`section:${section}`, b);
  }
  const navFoot = h("div", { style: "margin-top:auto;display:flex;flex-direction:column" });
  nav.appendChild(navFoot);
  const moreHost = h("div", { class: "rb-morehost" });
  const main = h("section", { class: "rb-main", "aria-live": "polite" });
  const detail3 = h("aside", { class: "rb-detail rb-scroll", "aria-label": "상세" });
  const sheetBack = h("div", { class: "rb-sheet-back", onClick: () => ctx.closeSheet() });
  // 탭마다 맨 위 줄: 홈 › 탭(눌러서 다른 탭으로) · 한 줄 설명 · 검색 · 도움말
  const crumb = h("div", { class: "rb-crumb", "aria-label": "현재 위치" });
  const phDesc = h("div", { class: "rb-ph-desc" });
  const helpBtn = iconBtn("help", "이 화면 설명", { boxed: true, id: "rb-help-btn", onClick: () => toggleHelp() });
  const pagehead = h(
    "div",
    { class: "rb-pagehead" },
    h("div", { class: "rb-ph-text" }, crumb, phDesc),
    h("div", { class: "rb-ph-tools" }, h("label", { class: "rb-search" }, icon("search", 16), searchInput, h("span", { class: "rb-kbd", "aria-hidden": "true" }, "/")), helpBtn)
  );
  const col = h("div", { class: "rb-col" }, moreHost, pagehead, main);
  const body = h("div", { class: "rb-body" }, nav, col, sheetBack, detail3);
  let wasLoading = false;
  new MutationObserver(() => {
    const now = !!main.querySelector(":scope > .rb-loading");
    if (wasLoading && !now) for (const el of main.children) motion(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    wasLoading = now;
  }).observe(main, { childList: true });
  win.append(head, topnav, body, tabbar);
  const closeHelp = () => pagehead.querySelector(":scope > .rb-help")?.remove();
  function toggleHelp() {
    if (pagehead.querySelector(":scope > .rb-help")) return closeHelp();
    const t = TABS.find((x) => x.id === state.tab) ?? TABS[0];
    const tips = t.help ?? [];
    pagehead.appendChild(h(
      "div",
      { class: "rb-help", role: "dialog", "aria-label": `${t.label} 설명` },
      h("h3", null, icon("help", 18), `${t.label}, 이렇게 써요`),
      h("p", { class: "rb-p", style: "margin:0" }, t.desc),
      tips.length ? h("ul", null, ...tips.map((x) => h("li", null, x))) : null,
      btn("알겠어요", { size: "sm", kind: "primary", onClick: closeHelp })
    ));
  }
  const sep = () => h("span", { class: "sep", "aria-hidden": "true" }, icon("chevron", 14));
  function paintHead() {
    const t = TABS.find((x) => x.id === state.tab) ?? TABS[0];
    const sl = subLabel(state.tab, state.sub);
    const inMore = !!t.section;
    replace(
      crumb,
      h("button", { type: "button", title: "홈으로", onClick: () => go("home") }, icon("home", 14), "홈"),
      sep(),
      // 더보기 하위 화면은 `더보기 › 화면이름` 경로로 보인다
      ...inMore ? [h("button", { type: "button", id: "rb-crumb-more", onClick: () => go(TABS.find((x) => x.section === t.section)?.id ?? "home") }, SECTION_NAMES[t.section]), sep()] : [],
      h("button", { type: "button", class: sl ? "" : "cur", "aria-haspopup": "menu", id: "rb-tabmenu", onClick: (e) => {
        const dev = !!prefs.ui?.devMode;
        openMenu(win, e.currentTarget, TABS.filter((x) => x.id !== "home" && (!x.dev || dev)).map((x) => ({ icon: x.icon, label: x.label, onClick: () => go(x.id) })));
      } }, t.label, icon("down", 14)),
      ...sl ? [sep(), h("button", { type: "button", class: "cur", onClick: () => go(state.tab) }, sl)] : []
    );
    phDesc.textContent = t.desc;
    closeHelp();
  }
  let dragDepth = 0, dropEl = null;
  const hasFiles = (e) => [...e.dataTransfer?.types ?? []].includes("Files");
  win.addEventListener("dragenter", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    if (!dropEl) {
      dropEl = h("div", { class: "rb-drop" }, h("div", null, icon("upload", 20), "놓으면 종류와 대상을 알아서 찾아요 (.rbupatch 패치도 가능)"));
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
    const patches = files.filter((f) => /\.rbupatch$/i.test(f.name ?? ""));
    const rest = files.filter((f) => !patches.includes(f));
    if (rest.length) legacy.startWithFiles(rest);
    // 패치 파일은 이름이 같은 캐릭터·모듈을 찾아 하나씩 적용한다
    if (patches.length) (async () => { for (const f of patches) await applyDroppedPatch(ctx, f).catch((e) => ctx.toast(e?.message ?? String(e), { error: true })); })();
  });
  doc.addEventListener("keydown", (e) => {
    if (root.hidden) return;
    if (e.key === "Escape" && !win.querySelector(".rb-modal, .rb-menu, .rb-full, .rb-lightbox")) {
      if (pagehead.querySelector(":scope > .rb-help")) closeHelp();
      else if (detail3.classList.contains("open")) ctx.closeSheet();
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
    const th = normalizeTheme(theme);
    state.layout = th.layout;
    for (const c of [...win.classList]) if (c.startsWith("rb-lay-") || c.startsWith("rb-den-")) win.classList.remove(c);
    win.classList.add(`rb-lay-${th.layout}`, `rb-den-${th.density}`);
    win.classList.toggle("rb-hc", th.contrast === "high");
    paintLay();
  }
  // 메뉴 위치 분할 버튼(사이드바·위쪽 바)의 눌림 표시
  function paintLay() {
    for (const b of win.querySelectorAll(".rb-layseg button")) b.setAttribute("aria-pressed", b.dataset.v === state.layout ? "true" : "false");
  }
  async function setLayout(v) {
    const th = normalizeTheme({ ...prefs.ui?.theme, layout: v });
    prefs.ui.theme = th;
    applyTheme();
    try {
      await prefs.saveUi({ theme: th });
    } catch (e) {
      ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  }
  function go(tab, sub = null) {
    if (tab === "aibot") { createBotAndEdit(ctx, { tab: "ai" }); return; }
    // 기록은 설정 탭 안으로 옮겼다 (1.6.1, 그전엔 도구). 예전 go("history")·go("tools","history") 호출도 그대로 동작
    if (tab === "history" || tab === "tools" && sub === "history") {
      tab = "settings";
      sub = "history";
    }
    // 1.5.0: 프리셋은 도구 안으로, 색·업데이트 설정·설정 정리는 설정 탭으로
    if (tab === "presets") {
      tab = "tools";
      sub = "presets";
    }
    if (tab === "tools" && ["settings", "updset", "cleanup"].includes(sub)) {
      tab = "settings";
      sub = sub === "settings" ? "theme" : sub;
    }
    // 1.7.0: 테마 빌더·스튜디오는 도구 → 채팅 테마로 옮겼다 (예전 settings 호출도 그대로 동작)
    if (tab === "settings" && ["chattheme", "themebuilder", "themestudio"].includes(sub)) tab = "tools";
    const leaving = tab !== state.tab || sub !== state.sub;
    if (leaving) stashPane();
    if (tab !== state.tab || (sub === "history") !== (state.sub === "history")) {
      state.search = "";
      searchInput.value = "";
    }
    if (tab === "characters" && Date.now() - (state.charsAt ?? 0) > 3e4) state.charsBg = true;
    if (tab === "characters") state.charOrderStale = true;
    if (tab === "dev" && !prefs.ui?.devMode) {
      tab = "tools";
      sub = null;
    }
    const changed = tab !== state.tab || sub !== state.sub;
    state.tab = tab;
    state.sub = sub;
    ctx.closeSheet();
    render({ reuse: changed });
    if (changed) fadeUp(main, { duration: 180 });
  }
  // 1.6.3: 한 번 그린 탭은 DOM을 보존했다가 돌아오면 그대로 붙인다 (재렌더 생략)
  const paneCache = new Map();
  const CACHEABLE = /* @__PURE__ */ new Set(["plugins", "tools", "settings"]);
  const paneKey = () => `${state.tab}|${state.sub ?? ""}`;
  let paneReady = false;
  function stashPane() {
    if (!paneReady || !CACHEABLE.has(state.tab) || state.search) return;
    if (state.tab === "tools" && ["chattheme", "themebuilder", "themestudio"].includes(state.sub) || state.tab === "settings" && state.sub === "prompts") return; // 목록이 바뀌므로 다시 그린다
    paneCache.set(paneKey(), { nodes: [...main.childNodes], at: Date.now() });
  }
  function dropPanes() {
    paneCache.clear();
  }
  function refreshTabs() {
    const on = !!prefs.ui?.devMode;
    for (const links of [navLinks, topLinks]) {
      const a = links.get("dev");
      if (a) a.hidden = !on;
    }
    win.classList.toggle("rb-has-dev", on);
    if (!on && state.tab === "dev") go("tools");
  }
  const MORE = new Set(TABS.filter((t) => t.section).map((t) => t.id));
  // 화면 모드(간단/고급) 바꾸기: 고급 영역·개발자 모드가 바로 따라 바뀐다
  async function setUiMode(mode) {
    try {
      await prefs.setUiMode(mode);
    } catch (e) {
      return ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
    ctx.toast(mode === "advanced" ? "고급 모드로 바꿨어요. 설정에서 언제든 되돌릴 수 있어요." : "간단 모드로 바꿨어요.");
    dropPanes();
    render();
  }
  function render({ reuse = false } = {}) {
    refreshTabs();
    if (!reuse) dropPanes();
    if (MORE.has(state.tab)) state.lastMore = state.tab;
    win.classList.toggle("rb-in-more", MORE.has(state.tab));
    const activeSection = TABS.find((t) => t.id === state.tab)?.section;
    replace(moreHost, moreNav(TABS.filter((t) => t.section === activeSection && (!t.dev || prefs.ui?.devMode)), state.tab, (id) => go(id)));
    for (const links of [navLinks, topLinks, barLinks]) for (const [id, a] of links) {
      const activeTab = TABS.find((t) => t.id === state.tab);
      const on = id === state.tab || id.startsWith("section:") && activeTab?.section === id.slice("section:".length);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    replace(
      navFoot,
      h("div", { class: "rb-nav-hint" }, "파일을 창 어디에 끌어다 놓아도 바로 가져와요"),
      layoutSeg(),
      h("button", { type: "button", class: "rb-nav-hint", style: "padding-top:4px;background:none;border:0;color:inherit;cursor:pointer;text-align:left", title: "변경 기록 보기", onClick: () => openChangelog(ctx, CHANGELOG.slice(0, 4), "변경 기록") }, `v${version} · 변경 기록`)
    );
    paintLay();
    const inHist = state.tab === "settings" && state.sub === "history";
    const showSearch = inHist || ["modules", "plugins", "characters"].includes(state.tab);
    searchInput.placeholder = inHist ? "기록에서 이름 찾기" : SEARCH[state.tab] ?? "검색";
    win.classList.toggle("rb-nosearch", !showSearch);
    win.classList.toggle("rb-is-home", state.tab === "home");
    paintHead();
    replace(detail3);
    detail3.hidden = true;
    const hit = reuse ? paneCache.get(paneKey()) : null;
    if (hit) {
      paneCache.delete(paneKey());
      replace(main, ...hit.nodes);
      paneReady = true;
      return;
    }
    paneReady = false;
    const screen = { home: renderHome, "memory-home": renderSectionHome, "manage-home": renderSectionHome, "work-home": renderSectionHome, modules: renderModules, plugins: renderPlugins, characters: renderCharacters, memory: renderMemory, look: renderSettings, cards: renderCardsTab, presets: renderPresets, tools: renderTools, settings: state.sub === "history" ? renderHistory : renderSettingsTab, dev: renderDev }[state.tab] ?? renderPlaceholder;
    Promise.resolve(screen(ctx)).then(() => {
      paneReady = true;
    }).catch((err) => {
      replace(main, h("div", { class: "rb-section" }, h("div", { class: "rb-note err", role: "alert" }, icon("alert", 18), h("span", null, `화면을 열지 못했어요: ${err?.message ?? err}`))));
    });
  }
  async function open(opts) {
    try {
      const cs = await api.getColorScheme();
      state.risuScheme = cs?.scheme?.type === "light" ? "light" : "dark";
    } catch {
      state.risuScheme = "dark";
    }
    if (!prefs.ui) await prefs.load();
    else await prefs.reloadMeta();
    // 첫 화면: 홈 카드 방식이면 홈, 메뉴(왼쪽·위쪽) 방식이면 모듈 (창을 연 뒤 다시 열 땐 보던 곳 그대로)
    if (!state.opened) {
      state.tab = "home";
      state.sub = null;
    }
    if (opts?.tab) { state.tab = opts.tab; state.sub = null; }
    state.modDirty = true;
    state.charOrderStale = true;
    if (state.chars) state.charsBg = true;
    dropPanes();
    svc.invalidate();
    applyTheme();
    root.hidden = false;
    await api.showContainer("fullscreen");
    render();
    // 처음 둘러보기: 처음 설치한 사람, 그리고 둘러보기가 새로 바뀐 버전(TOUR_VER)으로 업데이트한 사람에게 한 번 띄운다
    // BardWiki 선택은 기억 탭에 들어갈 때 안내한다.
    maybeShowWhatsNew(ctx).then(() => maybeShowTour(ctx)).catch(() => {
    });
    checkUpdate().catch(() => {
    });
    checkTide();
    ctx.watcher?.check();
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
    setUiMode,
    setLayout,
    setNavCount(tab, n) {
      for (const links of [navLinks, topLinks]) {
        const s = links.get(tab)?.querySelector("small");
        if (s) s.textContent = n === void 0 ? "" : String(n);
      }
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
    isMobile: () => (root.clientWidth || 1e3) <= 760
  };
  onNotice((msg) => ctx.toast(msg, { seconds: 8 }));
  return { open, close, ctx };
}
