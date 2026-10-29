// 화면 꾸미기 (예전 '색 바꾸기'): 색 · 밝기 · 메뉴 위치 · 밀도 · 글자 크기 · 고대비. 누르는 즉시 적용·자동 저장.
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, chip, iconBtn, optionCards, progressBar, segmented, switchEl, toggleRow } from '../kit.js';
import { DEFAULT_THEME, DENSITIES, LAYOUTS, PRESETS, SIZES, ZOOM, ZOOM_MIN, ZOOM_MAX, normalizeTheme, themeVars } from '../theme.js';

var pic = (...kids) => h("div", { class: "pic" }, ...kids);
var LAYOUT_TEXT = { left: "왼쪽에 메뉴가 늘 보여요. 자주 오갈 때 편해요.", top: "위쪽에 알약 메뉴가 늘 보여요. 화면이 넓게 쓰여요." };
var layoutPic = (id) => id === "left" ? pic(h("i", { style: "width:24%" }), h("i", { style: "flex:1;background:var(--rb-hover)" })) : h("div", { class: "pic", style: "flex-direction:column" }, h("i", { style: "height:24%" }), h("i", { style: "flex:1;background:var(--rb-hover)" }));

export function renderSettings(ctx) {
  const { prefs } = ctx;
  let theme = normalizeTheme(prefs.ui.theme);
  let saveTimer = null;
  const saved = h("span", { class: "rb-muted", "aria-live": "polite" });
  const persist = () => {
    clearTimeout(saveTimer);
    saved.textContent = "저장하는 중…";
    saveTimer = setTimeout(async () => {
      try {
        await prefs.saveUi({ theme });
        saved.textContent = "저장했어요";
      } catch (e) {
        saved.textContent = `저장하지 못했어요: ${e?.message ?? e}`;
      }
    }, 300);
  };
  const update = (patch) => {
    theme = normalizeTheme({ ...theme, ...patch });
    prefs.ui.theme = theme;
    ctx.applyTheme();
    paint();
    persist();
  };
  const presetBtns = PRESETS.map((p) => h(
    "button",
    { type: "button", class: "rb-preset", dataset: { id: p.id }, "aria-label": `${p.name} 색`, onClick: () => update({ preset: p.id, a: p.a, b: p.b }) },
    h("i", { style: { background: `linear-gradient(135deg, ${p.a}, ${p.b})` } }),
    h("span", { style: "font-size:13px;font-weight:600" }, p.name)
  ));
  const colorField = (key, label) => {
    const input = h("input", { type: "color", "aria-label": label });
    const code = h("small");
    input.addEventListener("input", () => update({ [key]: input.value, preset: "custom" }));
    const el = h("label", { class: "rb-color" }, input, h("span", null, label), code);
    el.sync = () => {
      input.value = theme[key];
      code.textContent = theme[key];
    };
    return el;
  };
  const fa = colorField("a", "시작 색"), fb = colorField("b", "끝 색");
  const contrastNote = h("span", { class: "rb-muted" });
  const modeNotes = { auto: "창을 열 때마다 RisuAI 테마의 밝기에 맞춰요.", dark: "RisuAI 설정과 상관없이 항상 다크로 열려요.", light: "RisuAI 설정과 상관없이 항상 라이트로 열려요." };
  const modeNote = h("span", { class: "rb-muted" });
  const modeSeg = segmented([["auto", "RisuAI 따라가기"], ["dark", "다크"], ["light", "라이트"]], theme.mode, (v) => update({ mode: v }), "밝기");
  const layoutCards = optionCards(LAYOUTS.map(([value, label]) => ({ value, label, text: LAYOUT_TEXT[value], pic: layoutPic(value) })), theme.layout, (v) => update({ layout: v }), "메뉴 위치");
  const densitySeg = segmented(DENSITIES, theme.density, (v) => update({ density: v }), "밀도");
  const zoomLabel = h("b", { style: "min-width:48px;text-align:right;font-variant-numeric:tabular-nums" }, `${theme.zoom}%`);
  const zoomRange = h("input", { type: "range", min: String(ZOOM_MIN), max: String(ZOOM_MAX), step: "5", value: String(theme.zoom), "aria-label": "글자 크기 (퍼센트)", style: "flex:1;min-width:120px;accent-color:var(--rb-acc)" });
  zoomRange.addEventListener("input", () => {
    zoomLabel.textContent = `${zoomRange.value}%`;
    update({ zoom: Number(zoomRange.value) });
    sizeSegPaint();
  });
  const sizeSegBase = segmented(SIZES, null, (v) => {
    update({ size: v, zoom: Math.round(ZOOM[v] * 100) });
    zoomRange.value = String(theme.zoom);
    zoomLabel.textContent = `${theme.zoom}%`;
  }, "글자 크기 빠른 선택");
  const sizeSegPaint = () => sizeSegBase.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", Math.round(ZOOM[b.dataset.v] * 100) === theme.zoom ? "true" : "false"));
  sizeSegPaint();
  const sizeSeg = h("div", { style: "display:flex;flex-direction:column;gap:10px" }, h("div", { style: "display:flex;align-items:center;gap:10px" }, h("span", { class: "rb-muted", "aria-hidden": "true" }, "작게"), zoomRange, h("span", { class: "rb-muted", "aria-hidden": "true" }, "크게"), zoomLabel), sizeSegBase);
  const hcRow = toggleRow("고대비 모드", "글자와 바탕의 대비를 크게, 테두리를 굵게 해요. 켜짐·꺼짐은 항상 글자로도 보여요.", theme.contrast === "high", (on) => update({ contrast: on ? "high" : "normal" }));
  function paint() {
    presetBtns.forEach((b) => b.setAttribute("aria-pressed", b.dataset.id === theme.preset ? "true" : "false"));
    fa.sync();
    fb.sync();
    const r = themeVars(theme, ctx.state.mode);
    const fgName = r.vars["--rb-on-acc"] === "#ffffff" ? "흰 글자" : "검은 글자";
    contrastNote.textContent = `버튼 글자색은 대비를 계산해서 자동으로 정해요. 지금: ${fgName} · 대비 ${r.onAccentRatio.toFixed(1)}:1` + (r.onAccentRatio < 4.5 ? " — 낮아요. 색을 조금 더 진하게 하면 잘 읽혀요." : "");
    modeNote.textContent = modeNotes[theme.mode] + (theme.mode === "auto" ? ` (지금 RisuAI: ${ctx.state.risuScheme === "light" ? "라이트" : "다크"})` : "");
  }
  const group = (ic, title, text, ...kids) => h(
    "section",
    { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:12px" },
    h("div", { style: "display:flex;gap:12px;align-items:center" }, h("span", { style: "width:36px;height:36px;border-radius:11px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon(ic, 18)), h("div", { style: "flex:1;min-width:0" }, h("b", { style: "font-size:15px" }, title), text ? h("div", { class: "rb-muted", style: "font-size:12.5px;margin-top:1px;word-break:keep-all" }, text) : null)),
    ...kids
  );
  const left = h(
    "div",
    { class: "rb-section", style: "flex:1 1 440px;min-width:300px;max-width:720px" },
    h("div", { style: "display:flex;align-items:center;gap:10px" }, iconBtn("back", "설정으로 돌아가기", { onClick: () => ctx.go("settings") }), h("div", null, h("h2", { class: "rb-h2" }, "화면 꾸미기"), h("span", { class: "rb-muted" }, "누르면 바로 바뀌고 자동으로 저장돼요."))),
    group(
      "palette",
      "색",
      "하나만 누르면 끝이에요.",
      h("div", { class: "rb-presets" }, presetBtns),
      h("details", { class: "rb-fold" }, h("summary", null, "고급 · 직접 색 고르기"), h("div", null, h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px" }, fa, fb), contrastNote))
    ),
    group("sun", "밝기", null, modeSeg, modeNote),
    group("layout", "메뉴 위치", "어디서 다른 화면으로 옮겨 다닐지 골라요.", layoutCards),
    group("list", "줄 간격", "목록과 버튼의 여유를 정해요.", densitySeg),
    group("size", "글자 크기", "막대를 움직이면 창 전체가 함께 커지고 작아져요. 아래 버튼으로 바로 고를 수도 있어요.", sizeSeg),
    group("contrast", "고대비", null, hcRow),
    h("div", { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" }, btn("기본값으로", { onClick: () => update({ ...DEFAULT_THEME }) }), saved)
  );
  const demoSwitch = switchEl(true, { label: "미리보기 스위치", onChange: (on, el) => el.setAttribute("aria-checked", on ? "true" : "false") });
  const demoOff = switchEl(false, { label: "미리보기 꺼진 스위치", onChange: (on, el) => el.setAttribute("aria-checked", on ? "true" : "false") });
  const preview = h(
    "div",
    { class: "rb-section", style: "flex:1 1 320px;min-width:280px" },
    h("span", { class: "rb-label" }, "미리보기"),
    h(
      "div",
      { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:14px" },
      h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap" }, btn("적용하기", { kind: "primary" }), btn("보조 버튼"), btn("위험", { kind: "danger" }), chip("선택된 필터", { pressed: true, count: 12 })),
      h("div", { class: "rb-row", "aria-selected": "true", style: "cursor:default" }, h("span", { class: "grip" }, icon("grip", 14)), h("div", { class: "txt" }, h("div", { class: "ttl" }, h("span", { class: "name" }, "예시 모듈"), badge("페르소나", "acc2")), h("span", { class: "meta" }, "로어 12 · 에셋 34")), demoSwitch),
      h("div", { class: "rb-row off", style: "cursor:default" }, h("span", { class: "grip" }, icon("grip", 14)), h("div", { class: "txt" }, h("div", { class: "ttl" }, h("span", { class: "name" }, "꺼 둔 모듈")), h("span", { class: "meta" }, "로어 3 · 에셋 0")), demoOff),
      h("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, badge("제작자 수정", "acc"), badge("내 수정", "acc2"), badge("충돌", "warn"), badge("추가", "ok"), badge("삭제", "danger")),
      progressBar(61)
    ),
    h("p", { class: "rb-muted" }, "모듈 이름 색과 폴더 색은 모듈 목록에서 각 모듈의 ⋯ 메뉴로 바꿔요. 어떤 밝기에서도 읽히도록 자동으로 진하기를 맞춰요.")
  );
  replace(ctx.main, h("div", { class: "rb-scroll", style: "flex:1;display:flex;flex-wrap:wrap;align-content:flex-start" }, left, preview));
  paint();
}
