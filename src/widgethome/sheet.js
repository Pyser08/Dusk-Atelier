// 위젯 홈 '설정' 시트: 오른쪽(휴대폰은 아래)에서 열리는 한 장짜리 설정. 누르면 바로 적용·저장돼요(저장 버튼 없음).
// 탭: 테마(색 프리셋·디자인) · 위젯(보이기·시계·사진) · 홈(문구·자동 열기) · 도구(배치·사진·배경·목록).
const t = (type, bg, surface, soft, button, line, ink, muted, accent) => ({ type, bg, surface, soft, button, line, ink, muted, accent });
export const PRESETS = Object.freeze([
  { id: "navy", name: "네이비", base: t("dark", "#282a36", "#21222c", "#303443", "#363c50", "#464c61", "#f8f8f2", "#a9b2c8", "#8aaaf3") },
  { id: "dusk", name: "황혼", base: t("dark", "#14121e", "#1d1a2b", "#28233b", "#2f2947", "#3d3655", "#f2ece0", "#a99fbb", "#d8b678") },
  { id: "midnight", name: "미드나잇", base: t("dark", "#0d1117", "#161b22", "#1f2630", "#262f3b", "#30363d", "#e6edf3", "#8b949e", "#58a6ff") },
  { id: "lavender", name: "라벤더 밤", base: t("dark", "#1b1626", "#241d33", "#2f2643", "#382d50", "#463a60", "#efe8ff", "#b3a6cf", "#b794f6") },
  { id: "sakura", name: "벚꽃 밤", base: t("dark", "#221820", "#2c1f2a", "#3a2836", "#452f40", "#56394f", "#fbeaf1", "#c9a3b6", "#f49ac1") },
  { id: "mint", name: "민트", base: t("dark", "#13201e", "#192a27", "#213632", "#27403b", "#30504a", "#e6fbf6", "#9cc2b9", "#5fe0c0") },
  { id: "forest", name: "숲", base: t("dark", "#141a14", "#1b231b", "#243024", "#2b392b", "#374837", "#ebf3e6", "#a3b59d", "#8fd16a") },
  { id: "ocean", name: "깊은 바다", base: t("dark", "#0e1a26", "#132332", "#1b2f42", "#20384e", "#2a4762", "#e5f2ff", "#94b2cc", "#4fc3f7") },
  { id: "sunset", name: "노을", base: t("dark", "#221614", "#2d1c19", "#3b2420", "#462b26", "#583631", "#fff0e8", "#d1a99a", "#ff8a5c") },
  { id: "mocha", name: "모카", base: t("dark", "#1e1915", "#28211c", "#342a24", "#3d322a", "#4c3f35", "#f5ece3", "#bba795", "#d9a066") },
  { id: "wine", name: "와인", base: t("dark", "#1f1216", "#2a181e", "#382029", "#432631", "#55303e", "#fbe9ee", "#c79aa8", "#e0607e") },
  { id: "neon", name: "네온", base: t("dark", "#0b0b12", "#12121c", "#1a1a28", "#202033", "#2c2c45", "#f0f0ff", "#9a9ac0", "#00e5ff") },
  { id: "mono", name: "흑백", base: t("dark", "#111111", "#1a1a1a", "#242424", "#2c2c2c", "#3a3a3a", "#f2f2f2", "#a0a0a0", "#ffffff") },
  { id: "cream", name: "크림(밝게)", base: t("light", "#f6f1e7", "#fffaf1", "#efe6d6", "#e7dcc8", "#d8cbb3", "#2d261d", "#7a6d5b", "#b7791f") },
  { id: "sky", name: "하늘(밝게)", base: t("light", "#eef4fb", "#ffffff", "#e3ecf7", "#d8e4f3", "#c3d3e8", "#1c2a3a", "#5d7189", "#2f80ed") },
  { id: "lilac", name: "라일락(밝게)", base: t("light", "#f4f0fb", "#fdfbff", "#ebe4f7", "#e1d7f2", "#cfc1e8", "#2b2240", "#6f6290", "#8b5cf6") },
  { id: "peach", name: "복숭아(밝게)", base: t("light", "#fdf1ec", "#fffaf7", "#f8e3da", "#f3d6ca", "#e8c2b2", "#3a2620", "#8a6a5f", "#e8735a") },
  { id: "matcha", name: "말차(밝게)", base: t("light", "#f1f5ec", "#fbfdf8", "#e4ecda", "#d9e4cc", "#c4d3b3", "#243020", "#62735a", "#5a9a3c") }
]);
export const presetById = (id) => PRESETS.find((p) => p.id === id) || null;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const WIDGETS = [["music", "음악"], ["photo", "사진"], ["clock", "시계"], ["recent", "최근 대화"], ["added", "최근 봇"], ["memo", "메모·할 일"], ["dusk", "Dusk 바로가기"], ["dday", "D-day"], ["timer", "타이머"], ["dice", "주사위·뽑기"], ["stats", "한눈에"]];

export function sheetHtml() {
  const sw = (p) => `<button class="sw" data-preset="${p.id}" aria-pressed="false" title="${esc(p.name)}"><span class="sw-chip" style="background:${p.base.bg}"><i style="background:${p.base.surface}"></i><i style="background:${p.base.accent}"></i></span><span class="sw-name">${esc(p.name)}</span></button>`;
  return `<aside class="qs" hidden role="dialog" aria-modal="true" aria-label="위젯 홈 설정"><div class="qs-scrim"></div><div class="qs-panel">
  <header class="qs-head"><b>설정</b><span class="qs-hint">바꾸면 바로 저장돼요</span><button class="qs-close" aria-label="닫기">✕</button></header>
  <nav class="qs-tabs" role="tablist"><button data-tab="theme" aria-selected="true">테마</button><button data-tab="widgets" aria-selected="false">위젯</button><button data-tab="home" aria-selected="false">홈</button><button data-tab="tools" aria-selected="false">도구</button></nav>
  <div class="qs-body">
   <section data-pane="theme">
    <h3>색 테마</h3>
    <div class="sw-grid"><button class="sw" data-preset="@app" aria-pressed="false" title="리스 색 따라가기"><span class="sw-chip sw-app">리스</span><span class="sw-name">리스 색 따라가기</span></button>${PRESETS.map(sw).join("")}<button class="sw" data-preset="@custom" aria-pressed="false" title="위젯마다 직접"><span class="sw-chip sw-custom">✎</span><span class="sw-name">위젯마다 직접</span></button></div>
    <h3>카드 모양</h3>
    <div class="seg" data-key="surface"><button data-v="navy">기본</button><button data-v="glass">글래스</button><button data-v="dusk">Dusk</button></div>
    <p class="qs-note">‘위젯마다 직접’은 위젯별 색을 고르는 자세한 꾸미기 창을 열어요.</p>
   </section>
   <section data-pane="widgets" hidden>
    <h3>보일 위젯</h3>
    <div class="qs-list">${WIDGETS.map(([id, n]) => `<label class="qs-row"><span>${esc(n)}</span><input type="checkbox" class="qs-w" data-w="${id}"></label>`).join("")}</div>
    <h3>시계 모양</h3>
    <div class="seg" data-key="clock"><button data-v="analog">바늘</button><button data-v="digital">숫자</button><button data-v="calendar">달력</button></div>
    <h3>사진 비율</h3>
    <div class="seg" data-key="photoShape"><button data-v="landscape">가로</button><button data-v="square">정사각</button></div>
   </section>
   <section data-pane="home" hidden>
    <h3>인사 문구</h3>
    <label class="qs-field"><span>제목</span><input class="qs-title" maxlength="80"></label>
    <label class="qs-field"><span>부제</span><input class="qs-subtitle" maxlength="120"></label>
    <h3>열기</h3>
    <label class="qs-row"><span>홈 화면으로 가면 자동으로 열기<small>사이드바는 그대로 보여요</small></span><input type="checkbox" class="qs-auto"></label>
    <label class="qs-row"><span>구형 봇도 목록에 보이기</span><input type="checkbox" class="qs-legacy"></label>
   </section>
   <section data-pane="tools" hidden>
    <div class="qs-actions">
     <button data-act="layout"><b>배치 편집</b><small>끌어서 옮기고 모서리로 크기 조절</small></button>
     <button data-act="photo"><b>사진 바꾸기</b><small>사진 위젯의 사진·위치</small></button>
     <button data-act="background"><b>배경 바꾸기</b><small>홈 전체 배경 사진</small></button>
     <button data-act="refresh"><b>목록 새로고침</b><small>최근 대화·봇 다시 읽기</small></button>
     <button data-act="custom"><b>자세한 꾸미기</b><small>위젯별 색·내 색 조합</small></button>
     <button data-act="advanced"><b>기타 설정</b><small>진단 정보·바로가기</small></button>
    </div>
   </section>
  </div></div></aside>`;
}

export const SHEET_CSS = `
.qs{position:fixed;inset:0;z-index:60}
.qs-scrim{position:absolute;inset:0;background:#06050bb3;backdrop-filter:blur(2px);animation:qs-fade .15s ease}
.qs-panel{position:absolute;top:0;right:0;bottom:0;width:min(420px,100%);background:var(--surface);color:var(--ink);border-left:1px solid var(--line);display:flex;flex-direction:column;box-shadow:-20px 0 50px #0008;animation:qs-in .2s ease}
@keyframes qs-in{from{transform:translateX(24px);opacity:0}}@keyframes qs-fade{from{opacity:0}}
@media(max-width:640px){.qs-panel{top:auto;left:0;width:100%;max-height:86dvh;border-left:0;border-top:1px solid var(--line);border-radius:22px 22px 0 0;animation-name:qs-up}@keyframes qs-up{from{transform:translateY(30px);opacity:0}}}
.qs-head{display:flex;align-items:center;gap:10px;padding:16px 18px 8px}.qs-head b{font-size:18px}.qs-hint{flex:1;font-size:11px;color:var(--muted)}
.qs-close{width:36px;height:36px;padding:0;border-radius:12px;font-size:16px}
.qs-tabs{display:flex;gap:4px;padding:6px 14px 10px;border-bottom:1px solid var(--line)}
.qs-tabs button{flex:1;min-height:36px;border-radius:12px;font-weight:600;color:var(--muted)}
.qs-tabs [aria-selected=true]{background:var(--soft);color:var(--ink);box-shadow:inset 0 -2px 0 var(--accent)}
.qs-body{overflow:auto;padding:6px 18px 22px;overscroll-behavior:contain}
.qs-body h3{font-size:12px;color:var(--muted);font-weight:700;letter-spacing:.3px;margin:16px 0 8px}
.sw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px}
.sw{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 4px;border:1px solid transparent;border-radius:14px;min-height:0}
.sw[aria-pressed=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}
.sw-chip{position:relative;width:56px;height:40px;border-radius:12px;border:1px solid #ffffff22;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
.sw-chip i{position:absolute;bottom:6px;width:18px;height:18px;border-radius:50%;border:1px solid #0003}.sw-chip i:first-child{left:8px}.sw-chip i:last-child{right:8px}
.sw-app{background:conic-gradient(#8aaaf3,#d8b678,#f49ac1,#5fe0c0,#8aaaf3);color:#111}.sw-custom{background:var(--soft);color:var(--ink);font-size:18px}
.sw-name{font-size:11px;text-align:center;line-height:1.25}
.seg{display:flex;gap:4px;background:var(--bg);padding:4px;border-radius:14px}
.seg button{flex:1;min-height:34px;border-radius:10px;font-size:13px}.seg [aria-pressed=true]{background:var(--button);font-weight:700;box-shadow:0 0 0 1px var(--accent) inset}
.qs-note{font-size:11px;color:var(--muted);margin-top:10px}
.qs-list{display:flex;flex-direction:column}
.qs-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 2px;border-bottom:1px solid color-mix(in srgb,var(--line) 60%,transparent);cursor:pointer}
.qs-row small{display:block;font-size:11px;color:var(--muted)}
.qs-row input[type=checkbox]{appearance:none;-webkit-appearance:none;flex-shrink:0;width:42px;height:24px;margin:0;border-radius:999px;background:var(--line);position:relative;cursor:pointer;transition:background .15s}
.qs-row input[type=checkbox]::before{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s}
.qs-row input[type=checkbox]:checked{background:var(--accent)}.qs-row input[type=checkbox]:checked::before{transform:translateX(18px)}
.qs-field{display:grid;gap:5px;margin-bottom:10px;font-size:12px;color:var(--muted)}.qs-field input{min-height:40px;padding:6px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px}
.qs-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.qs-actions button{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--soft);min-height:70px}
.qs-actions button:hover{border-color:var(--accent)}.qs-actions small{font-size:11px;color:var(--muted)}`;

// prefs: {themePreset, followTheme, surface, clock, photoShape, hiddenWidgets, title, subtitle, autoHome, includeLegacy}
export function createSheet({ sr, getPrefs, setPrefs, actions, toast }) {
  const $ = (s) => sr.querySelector(s), $$ = (s) => [...sr.querySelectorAll(s)], root = $(".qs");
  const save = (patch) => setPrefs(patch).then(paint).catch(() => toast("설정을 저장하지 못했어요. 다시 시도해 주세요."));
  function paint() {
    const p = getPrefs();
    const cur = p.followTheme ? "@app" : p.themePreset || "@custom";
    for (const b of $$(".sw")) b.setAttribute("aria-pressed", String(b.dataset.preset === cur));
    for (const g of $$(".qs .seg")) for (const b of g.querySelectorAll("button")) b.setAttribute("aria-pressed", String(p[g.dataset.key] === b.dataset.v));
    for (const c of $$(".qs-w")) c.checked = !p.hiddenWidgets.includes(c.dataset.w);
    if (sr.activeElement !== $(".qs-title")) $(".qs-title").value = p.title;
    if (sr.activeElement !== $(".qs-subtitle")) $(".qs-subtitle").value = p.subtitle;
    $(".qs-auto").checked = !!p.autoHome; $(".qs-legacy").checked = !!p.includeLegacy;
  }
  const tab = (name) => { for (const b of $$(".qs-tabs button")) b.setAttribute("aria-selected", String(b.dataset.tab === name)); for (const s of $$(".qs [data-pane]")) s.hidden = s.dataset.pane !== name; };
  const close = () => { root.hidden = true; };
  for (const b of $$(".qs-tabs button")) b.onclick = () => tab(b.dataset.tab);
  $(".qs-close").onclick = close; $(".qs-scrim").onclick = close;
  root.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
  for (const b of $$(".sw")) b.onclick = () => {
    const id = b.dataset.preset;
    if (id === "@app") return save({ followTheme: true });
    if (id === "@custom") { void save({ followTheme: false, themePreset: "" }); close(); return actions.custom(); }
    return save({ followTheme: false, themePreset: id });
  };
  for (const g of $$(".qs .seg")) for (const b of g.querySelectorAll("button")) b.onclick = () => save({ [g.dataset.key]: b.dataset.v });
  for (const c of $$(".qs-w")) c.onchange = () => {
    const hidden = new Set(getPrefs().hiddenWidgets);
    if (c.checked) hidden.delete(c.dataset.w); else hidden.add(c.dataset.w);
    if (hidden.size >= WIDGETS.length) { c.checked = true; return toast("위젯을 하나는 남겨 주세요."); }
    void save({ hiddenWidgets: [...hidden] });
  };
  const text = (sel, key) => { const el = $(sel); el.onchange = () => save({ [key]: el.value.trim() }); el.onkeydown = (e) => { if (e.key === "Enter" && !e.isComposing) el.blur(); }; };
  text(".qs-title", "title"); text(".qs-subtitle", "subtitle");
  $(".qs-auto").onchange = (e) => save({ autoHome: e.target.checked });
  $(".qs-legacy").onchange = (e) => save({ includeLegacy: e.target.checked });
  for (const b of $$(".qs-actions button")) b.onclick = () => { close(); actions[b.dataset.act]?.(); };
  return {
    open(name = "theme") { paint(); tab(name); root.hidden = false; setTimeout(() => $(".qs-tabs [aria-selected=true]")?.focus(), 30); },
    close, isOpen: () => !root.hidden, paint
  };
}
