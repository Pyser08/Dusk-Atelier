// 꾸미기 (v1.7.0 7단계, 계획 §3.12): 미리보기 → 강조 색 6개 → 밝기·글자 크기 → 내 채팅 테마 만들기. 누르는 즉시 적용·자동 저장.
// 고급(고급 모드): 직접 색 · 메뉴 위치 · 줄 간격 · 확대율 · 고대비 · 테마 스튜디오 · 기본값으로.
import { h, replace } from '../dom.js';
import { advFold, btn, optionCards, pageHead, segmented, toggleRow } from '../kit.js';
import { DEFAULT_THEME, DENSITIES, LAYOUTS, PRESETS, ZOOM_MIN, ZOOM_MAX, normalizeTheme, themeVars } from '../theme.js';

var pic = (...kids) => h("div", { class: "pic" }, ...kids);
var LAYOUT_TEXT = { left: "왼쪽에 메뉴가 늘 보여요. 자주 오갈 때 편해요.", top: "위쪽에 알약 메뉴가 늘 보여요. 화면이 넓게 쓰여요." };
var layoutPic = (id) => id === "left" ? pic(h("i", { style: "width:24%" }), h("i", { style: "flex:1;background:var(--rb-hover)" })) : h("div", { class: "pic", style: "flex-direction:column" }, h("i", { style: "height:24%" }), h("i", { style: "flex:1;background:var(--rb-hover)" }));
// 글자 크기 빠른 선택(퍼센트). 아주 크게·세밀한 값은 고급의 '확대율' 막대로.
export var SIZE_CHOICES = [["90", "작게"], ["100", "보통"], ["110", "크게"]];
var sizeOf = (zoom) => zoom >= 125 ? "xl" : zoom >= 105 ? "l" : "m";

export function renderSettings(ctx) {
  const { prefs } = ctx;
  let theme = normalizeTheme(prefs.ui.theme);
  let saveTimer = null;
  const saved = h("span", { class: "rb-muted", "aria-live": "polite", style: "font-size:12.5px;min-height:18px" });
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

  // ── 강조 색 6개 ──
  const swatches = PRESETS.map((p) => h(
    "button",
    { type: "button", class: "rb-accpick", dataset: { id: p.id }, "aria-label": `${p.name} 색`, onClick: () => update({ preset: p.id, a: p.a, b: p.b }) },
    h("i", { style: { background: `linear-gradient(135deg, ${p.a}, ${p.b})` } }),
    p.name
  ));
  // ── 밝기 · 글자 크기 ──
  const modeNotes = { auto: "창을 열 때마다 RisuAI 테마의 밝기에 맞춰요.", dark: "RisuAI 설정과 상관없이 항상 다크로 열려요.", light: "RisuAI 설정과 상관없이 항상 라이트로 열려요." };
  const modeNote = h("small", { class: "rb-muted" });
  const modeSeg = segmented([["auto", "자동"], ["light", "밝게"], ["dark", "어둡게"]], theme.mode, (v) => update({ mode: v }), "밝기");
  const sizeSeg = segmented(SIZE_CHOICES, "", (v) => update({ zoom: Number(v), size: sizeOf(Number(v)) }), "글자 크기");
  const sizePaint = () => sizeSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", Math.abs(Number(b.dataset.v) - theme.zoom) <= 2 ? "true" : "false"));

  // ── 고급 ──
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
  const contrastNote = h("small", { class: "rb-muted" });
  const layoutCards = optionCards(LAYOUTS.map(([value, label]) => ({ value, label, text: LAYOUT_TEXT[value], pic: layoutPic(value) })), theme.layout, (v) => update({ layout: v }), "메뉴 위치");
  const densitySeg = segmented(DENSITIES, theme.density, (v) => update({ density: v }), "밀도");
  const zoomLabel = h("b", { style: "min-width:48px;text-align:right;font-variant-numeric:tabular-nums" }, `${theme.zoom}%`);
  const zoomRange = h("input", { type: "range", min: String(ZOOM_MIN), max: String(ZOOM_MAX), step: "5", value: String(theme.zoom), "aria-label": "확대율 (퍼센트)", style: "flex:1;min-width:120px;accent-color:var(--rb-acc)" });
  zoomRange.addEventListener("input", () => update({ zoom: Number(zoomRange.value), size: sizeOf(Number(zoomRange.value)) }));
  const hcRow = toggleRow("고대비", "글자와 바탕의 대비를 크게, 테두리를 굵게 해요.", theme.contrast === "high", (on) => update({ contrast: on ? "high" : "normal" }));
  const field = (title, text, ...kids) => h("div", { class: "rb-lfield" }, h("b", null, title), text ? h("small", null, text) : null, ...kids);

  function paint() {
    swatches.forEach((b) => b.setAttribute("aria-pressed", b.dataset.id === theme.preset ? "true" : "false"));
    fa.sync();
    fb.sync();
    sizePaint();
    zoomLabel.textContent = `${theme.zoom}%`;
    if (Number(zoomRange.value) !== theme.zoom) zoomRange.value = String(theme.zoom);
    const r = themeVars(theme, ctx.state.mode);
    const fgName = r.vars["--rb-on-acc"] === "#ffffff" ? "흰 글자" : "검은 글자";
    contrastNote.textContent = `버튼 글자색은 대비를 계산해서 자동으로 정해요. 지금: ${fgName} · 대비 ${r.onAccentRatio.toFixed(1)}:1` + (r.onAccentRatio < 4.5 ? " — 낮아요. 색을 조금 더 진하게 하면 잘 읽혀요." : "");
    modeNote.textContent = modeNotes[theme.mode] + (theme.mode === "auto" ? ` (지금 RisuAI: ${ctx.state.risuScheme === "light" ? "라이트" : "다크"})` : "");
  }

  const fromSettings = ctx.state.tab === "settings";
  const main = h(
    "div",
    { class: "rb-mem2-main" },
    pageHead("꾸미기", { sub: "누르면 바로 바뀌고 자동으로 저장돼요.", back: fromSettings ? { label: "설정으로 돌아가기", onClick: () => ctx.go("settings") } : void 0 }),
    h("div", { class: "rb-card bordered rb-look-prev", "aria-label": "미리보기" }, h("span", { class: "cap" }, "미리보기"), h("div", { class: "rb-bub o" }, "오늘 회의 자료는 준비됐어요."), h("div", { class: "rb-bub m" }, "고마워요, 바로 확인할게요.")),
    h("section", { class: "rb-card bordered rb-lcard" }, h("span", { class: "h" }, "강조 색"), h("div", { class: "rb-accpicks" }, swatches)),
    h("section", { class: "rb-card bordered rb-lcard" }, field("밝기", null, modeSeg, modeNote), field("글자 크기", null, sizeSeg)),
    btn("내 채팅 테마 만들기", { kind: "primary", onClick: () => ctx.go("settings", "themebuilder"), id: "rb-look-themebuilder" }),
    saved
  );
  const adv = advFold(
    ctx,
    "look",
    ...ctx.prefs.advanced ? [
      field("직접 색 고르기", "시작 색과 끝 색을 직접 골라요.", h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px" }, fa, fb), contrastNote),
      field("메뉴 위치", "PC에서 어디서 다른 화면으로 옮겨 다닐지 골라요.", layoutCards),
      field("줄 간격", "목록과 버튼의 여유를 정해요.", densitySeg),
      field("확대율", "막대를 움직이면 창 전체가 함께 커지고 작아져요.", h("div", { style: "display:flex;align-items:center;gap:10px" }, h("span", { class: "rb-muted", "aria-hidden": "true" }, "작게"), zoomRange, h("span", { class: "rb-muted", "aria-hidden": "true" }, "크게"), zoomLabel)),
      hcRow,
      field("테마 스튜디오", "말풍선·글꼴·CSS를 직접 고치고 공유 코드로 주고받아요.", btn("테마 스튜디오 열기", { onClick: () => ctx.go("settings", "themestudio"), id: "rb-look-themestudio" })),
      h("p", { class: "rb-adv-note" }, "모듈 이름 색과 폴더 색은 모듈 목록에서 각 모듈의 ⋯ 메뉴로 바꿔요."),
      h("div", { style: "display:flex;gap:10px;flex-wrap:wrap" }, btn("기본값으로", { onClick: () => update({ ...DEFAULT_THEME }) }))
    ] : [true]
  );
  replace(ctx.main, h("div", { class: "rb-scroll rb-mem2", "data-page": "look" }, h("div", { class: ["rb-mem2-grid", ctx.prefs.advanced && "has-adv"] }, main, adv ? h("div", { class: "rb-mem2-side" }, adv) : null)));
  paint();
}
