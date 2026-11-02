// 플러그인 꾸미기 (v1.7.0 7단계, 계획 §3.12 → v1.8.3 확장): 미리보기 → 테마 묶음 → 강조 색 18 → 그라데이션 → 밝기·글자 크기 → 모양·글꼴 → 내 테마.
// 누르는 즉시 적용·자동 저장. PC는 왼쪽에 고르는 곳, 오른쪽에 미리보기·내 테마(고정).
// 고급(고급 모드): 직접 색(바탕·카드·글자·사이드바, 대비 자동 맞춤) · 강조 색 쓰는 곳 · 메뉴 위치 · 줄 간격 · 확대율 · 고대비 · 테마 스튜디오 · 기본값으로.
import { h, replace } from '../dom.js';
import { advFold, btn, optionCards, pageHead, segmented, toggleRow } from '../kit.js';
import { DEFAULT_THEME, DENSITIES, LAYOUTS, ZOOM_MIN, ZOOM_MAX, contrastOf, normalizeTheme, parseThemeCode, pickLook, themeCode, themeVars } from '../theme.js';
import { lookParts, sizeOf, SIZE_CHOICES } from '../lookparts.js';

export { SIZE_CHOICES };
var pic = (...kids) => h("div", { class: "pic" }, ...kids);
var LAYOUT_TEXT = { left: "왼쪽에 메뉴가 늘 보여요. 자주 오갈 때 편해요.", top: "위쪽에 알약 메뉴가 늘 보여요. 화면이 넓게 쓰여요." };
var layoutPic = (id) => id === "left" ? pic(h("i", { style: "width:24%" }), h("i", { style: "flex:1;background:var(--rb-hover)" })) : h("div", { class: "pic", style: "flex-direction:column" }, h("i", { style: "height:24%" }), h("i", { style: "flex:1;background:var(--rb-hover)" }));
var copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

export function renderSettings(ctx) {
  const { prefs } = ctx;
  let theme = normalizeTheme(prefs.ui.theme);
  let saveTimer = null;
  let prevMode = null; // null = 지금 밝기 그대로
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
  const parts = lookParts({ get: () => theme, set: update });

  // ── 미리보기 (밝게/어둡게 바꿔 볼 수 있음) ──
  const bubbles = [h("div", { class: "rb-bub o" }, "오늘 회의 자료는 준비됐어요."), h("div", { class: "rb-bub m" }, "고마워요, 바로 확인할게요.")];
  const sample = h("div", { class: "rb-prev-sample" }, h("span", { class: "rb-prev-btn" }, "버튼"), h("span", { class: "rb-prev-chip" }, "칩"), h("span", { class: "rb-prev-sw", "aria-hidden": "true" }));
  const prevSeg = segmented([["now", "지금"], ["light", "밝게"], ["dark", "어둡게"]], "now", (v) => { prevMode = v === "now" ? null : v; paintPreview(); }, "미리보기 밝기");
  const prev = h("div", { class: "rb-card bordered rb-look-prev", "aria-label": "미리보기" }, h("span", { class: "cap" }, "미리보기"), ...bubbles, sample, prevSeg);
  const paintPreview = () => {
    const r = themeVars(theme, prevMode ?? ctx.state.mode);
    for (const [k, v] of Object.entries(r.vars)) prev.style.setProperty(k, v);
    prev.style.colorScheme = r.scheme;
    prev.classList.add("is-scoped");
  };

  // ── 직접 색(고급) ──
  const colorField = (key, label, { optional = false, varName } = {}) => {
    const input = h("input", { type: "color", "aria-label": label });
    const code = h("small");
    input.addEventListener("input", () => update({ [key]: input.value, ...key === "a" || key === "b" ? { preset: "custom", grad: "" } : {} }));
    const kids = [input, h("span", null, label), code];
    if (optional) kids.push(h("button", { type: "button", class: "rb-textlink", "aria-label": `${label} 자동으로`, onClick: (e) => { e.preventDefault(); update({ [key]: "" }); } }, "자동"));
    const el = h("label", { class: "rb-color" }, ...kids);
    el.sync = () => {
      const eff = optional ? (theme[key] || themeVars(theme, ctx.state.mode).vars[varName] || "#000000") : theme[key];
      input.value = /^#[0-9a-f]{6}$/i.test(eff) ? eff : "#000000";
      code.textContent = optional && !theme[key] ? "자동" : theme[key];
    };
    return el;
  };
  const fa = colorField("a", "시작 색"), fb = colorField("b", "끝 색");
  const fBg = colorField("cBg", "바탕", { optional: true, varName: "--rb-win" }), fCard = colorField("cCard", "카드", { optional: true, varName: "--rb-surf" });
  const fText = colorField("cText", "글자", { optional: true, varName: "--rb-text" }), fSide = colorField("cSide", "사이드바", { optional: true, varName: "--rb-win" });
  const contrastNote = h("small", { class: "rb-muted" });
  const fixText = btn("글자색 자동 맞추기", { onClick: () => update({ cText: themeVars(theme, ctx.state.mode).vars["--rb-text"] }) });
  const layoutCards = optionCards(LAYOUTS.map(([value, label]) => ({ value, label, text: LAYOUT_TEXT[value], pic: layoutPic(value) })), theme.layout, (v) => update({ layout: v }), "메뉴 위치");
  const densitySeg = segmented(DENSITIES, theme.density, (v) => update({ density: v }), "밀도");
  const accUseSeg = segmented([["all", "곳곳에"], ["btn", "버튼만"]], theme.accUse, (v) => update({ accUse: v }), "강조 색 쓰는 곳");
  const zoomLabel = h("b", { style: "min-width:48px;text-align:right;font-variant-numeric:tabular-nums" }, `${theme.zoom}%`);
  const zoomRange = h("input", { type: "range", min: String(ZOOM_MIN), max: String(ZOOM_MAX), step: "5", value: String(theme.zoom), "aria-label": "확대율 (퍼센트)", style: "flex:1;min-width:120px;accent-color:var(--rb-acc)" });
  zoomRange.addEventListener("input", () => update({ zoom: Number(zoomRange.value), size: sizeOf(Number(zoomRange.value)) }));
  const hcRow = toggleRow("고대비", "글자와 바탕의 대비를 크게, 테두리를 굵게 해요.", theme.contrast === "high", (on) => update({ contrast: on ? "high" : "normal" }));
  const field = parts.field;

  // ── 내 테마: 이름 붙여 저장 · 적용 · 밝을 때/어두울 때 · 코드 주고받기 ──
  const nameIn = h("input", { type: "text", class: "rb-input", maxlength: "24", placeholder: "내 테마 이름", "aria-label": "내 테마 이름" });
  const mineList = h("div", { class: "rb-minelist", role: "list" });
  const codeBox = h("textarea", { class: "rb-input", rows: "2", placeholder: "받은 테마 코드(DA1:…)를 붙여 넣어요", "aria-label": "테마 코드", style: "width:100%;resize:vertical" });
  const mineNote = h("small", { class: "rb-muted", "aria-live": "polite" });
  const saveMine = () => {
    const name = nameIn.value.trim();
    if (!name) { mineNote.textContent = "이름을 먼저 적어 주세요."; return; }
    if (theme.mine.length >= 12) { mineNote.textContent = "내 테마는 12개까지 저장돼요. 하나를 지우고 다시 저장해 주세요."; return; }
    const id = "m" + Date.now().toString(36);
    nameIn.value = "";
    mineNote.textContent = `'${name}'을(를) 저장했어요.`;
    update({ mine: [...theme.mine, { id, name, theme: pickLook(theme) }] });
  };
  const applyMine = (m) => update({ ...m.theme, mode: m.theme.mode ?? theme.mode });
  const paintMine = () => {
    replace(mineList, theme.mine.length ? theme.mine.map((m) => h(
      "div",
      { class: "rb-mine", role: "listitem", dataset: { id: m.id } },
      h("button", { type: "button", class: "rb-mine-name", onClick: () => applyMine(m), "aria-label": `${m.name} 적용` }, h("i", { style: { background: `linear-gradient(135deg, ${m.theme.a}, ${m.theme.b})` } }), m.name),
      h("button", { type: "button", class: "rb-chip", "aria-pressed": theme.useLight === m.id ? "true" : "false", title: "밝을 때 이 테마 쓰기", onClick: () => update({ useLight: theme.useLight === m.id ? "" : m.id }) }, "☀ 밝을 때"),
      h("button", { type: "button", class: "rb-chip", "aria-pressed": theme.useDark === m.id ? "true" : "false", title: "어두울 때 이 테마 쓰기", onClick: () => update({ useDark: theme.useDark === m.id ? "" : m.id }) }, "🌙 어두울 때"),
      h("button", { type: "button", class: "rb-chip", "aria-label": `${m.name} 지우기`, onClick: () => update({ mine: theme.mine.filter((x) => x.id !== m.id) }) }, "지우기")
    )) : [h("p", { class: "rb-muted", style: "margin:0;font-size:13px" }, "저장한 테마가 아직 없어요. 지금 모양에 이름을 붙여 저장해 보세요.")]);
  };
  const mineCard = h(
    "section",
    { class: "rb-card bordered rb-lcard", id: "rb-look-mine" },
    h("span", { class: "h" }, "내 테마"),
    h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, nameIn, btn("지금 모양 저장", { onClick: saveMine, id: "rb-mine-save" })),
    mineList,
    h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("테마 코드 복사", { id: "rb-mine-copy", onClick: async () => { const c = themeCode(theme); mineNote.textContent = (await copyText(c)) ? "테마 코드를 복사했어요. 친구에게 붙여 넣어 주세요." : c; } }),
      btn("코드로 불러오기", { id: "rb-mine-load", onClick: () => {
        const look = parseThemeCode(codeBox.value);
        if (!look) { mineNote.textContent = "테마 코드를 읽지 못했어요. DA1: 로 시작하는 코드를 그대로 붙여 넣어 주세요."; return; }
        mineNote.textContent = "불러왔어요.";
        codeBox.value = "";
        update({ ...look });
      } })
    ),
    codeBox,
    mineNote
  );

  function paint() {
    parts.paint();
    fa.sync(); fb.sync(); fBg.sync(); fCard.sync(); fText.sync(); fSide.sync();
    zoomLabel.textContent = `${theme.zoom}%`;
    if (Number(zoomRange.value) !== theme.zoom) zoomRange.value = String(theme.zoom);
    accUseSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === theme.accUse ? "true" : "false"));
    const r = themeVars(theme, ctx.state.mode);
    const fgName = r.vars["--rb-on-acc"] === "#ffffff" ? "흰 글자" : "검은 글자";
    const body = contrastOf(r.vars["--rb-text"], r.vars["--rb-win"]);
    contrastNote.textContent = `버튼 글자색은 자동으로 정해요. 지금: ${fgName} · 대비 ${r.onAccentRatio.toFixed(1)}:1` + (r.onAccentRatio < 4.5 ? " — 낮아요. 색을 조금 더 진하게 하면 잘 읽혀요." : "") + ` · 본문 글자 대비 ${body.toFixed(1)}:1` + (theme.cText || theme.cBg ? " (읽기 어려우면 자동으로 맞춰 줘요)" : "");
    parts.modeNote.textContent = parts.modeNote.textContent + (theme.mode === "auto" ? ` (지금 RisuAI: ${ctx.state.risuScheme === "light" ? "라이트" : "다크"})` : "");
    paintPreview();
    paintMine();
  }

  const fromSettings = ctx.state.tab === "settings";
  const card = (title, ...kids) => h("section", { class: "rb-card bordered rb-lcard" }, h("span", { class: "h" }, title), ...kids);
  const pick = h(
    "div",
    { class: "rb-mem2-main rb-look-pick" },
    pageHead("플러그인 꾸미기", { sub: "누르면 바로 바뀌고 자동으로 저장돼요.", back: fromSettings ? { label: "설정으로 돌아가기", onClick: () => ctx.go("settings") } : void 0 }),
    card("테마 묶음", parts.sets),
    card("강조 색", parts.accents),
    card("그라데이션", parts.grads),
    card("밝기 · 글자 크기", field("밝기", parts.modeSeg, parts.modeNote), field("글자 크기", parts.sizeSeg)),
    h("section", { class: "rb-card bordered rb-lcard" }, h("details", { class: "rb-morefold", id: "rb-look-shape" }, h("summary", null, "모양 · 글꼴 더 고르기"), parts.shape({ full: true }))),
    btn("내 채팅 테마 만들기", { kind: "primary", onClick: () => ctx.go("tools", "chattheme"), id: "rb-look-themebuilder" }),
    saved
  );
  const side = h("div", { class: "rb-look-side" }, prev, mineCard);
  const adv = advFold(
    ctx,
    "look",
    ...ctx.prefs.advanced ? [
      field("직접 색 고르기", h("small", null, "시작 색·끝 색과 바탕·카드·글자·사이드바 색을 직접 골라요."), h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px" }, fa, fb, fBg, fCard, fText, fSide), contrastNote, fixText),
      field("강조 색 쓰는 곳", h("small", null, "'버튼만'이면 선택 표시 같은 곳은 회색으로 둬요."), accUseSeg),
      field("메뉴 위치", h("small", null, "PC에서 어디서 다른 화면으로 옮겨 다닐지 골라요."), layoutCards),
      field("줄 간격", h("small", null, "목록과 버튼의 여유를 정해요."), densitySeg),
      field("확대율", h("small", null, "막대를 움직이면 창 전체가 함께 커지고 작아져요."), h("div", { style: "display:flex;align-items:center;gap:10px" }, h("span", { class: "rb-muted", "aria-hidden": "true" }, "작게"), zoomRange, h("span", { class: "rb-muted", "aria-hidden": "true" }, "크게"), zoomLabel)),
      hcRow,
      field("테마 스튜디오", h("small", null, "말풍선·글꼴·CSS를 직접 고치고 공유 코드로 주고받아요."), btn("테마 스튜디오 열기", { onClick: () => ctx.go("tools", "themestudio"), id: "rb-look-themestudio" })),
      h("p", { class: "rb-adv-note" }, "모듈 이름 색과 폴더 색은 모듈 목록에서 각 모듈의 ⋯ 메뉴로 바꿔요."),
      h("div", { style: "display:flex;gap:10px;flex-wrap:wrap" }, btn("기본값으로", { onClick: () => update({ ...DEFAULT_THEME, mine: theme.mine }) }))
    ] : [true]
  );
  replace(ctx.main, h("div", { class: "rb-scroll rb-mem2", "data-page": "look" }, h("div", { class: "rb-look-grid" }, pick, side, adv ? h("div", { class: "rb-look-adv" }, adv) : null)));
  paint();
}
