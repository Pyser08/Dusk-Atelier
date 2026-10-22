import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, chip, iconBtn, progressBar, segmented, switchEl } from '../kit.js';
import { DEFAULT_THEME, PRESETS, themeVars } from '../theme.js';

export function renderSettings(ctx) {
  const { prefs } = ctx;
  let theme = { ...prefs.ui.theme };
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
    theme = { ...theme, ...patch };
    prefs.ui.theme = theme;
    ctx.applyTheme();
    paint();
    persist();
  };
  const presetBtns = PRESETS.map((p) => h(
    "button",
    { type: "button", class: "rb-preset", dataset: { id: p.id }, onClick: () => update({ preset: p.id, a: p.a, b: p.b }) },
    h("i", { style: { background: `linear-gradient(135deg, ${p.a}, ${p.b})` } }),
    h("span", { style: "font-size:13px;font-weight:500" }, p.name)
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
  const modeSeg = segmented([["auto", "RisuAI 따라가기"], ["dark", "다크 고정"], ["light", "라이트 고정"]], theme.mode, (v) => update({ mode: v }), "밝기");
  function paint() {
    presetBtns.forEach((b) => b.setAttribute("aria-pressed", b.dataset.id === theme.preset ? "true" : "false"));
    fa.sync();
    fb.sync();
    const r = themeVars(theme, ctx.state.mode);
    const fgName = r.vars["--rb-on-acc"] === "#ffffff" ? "흰 글자" : "검은 글자";
    contrastNote.textContent = `버튼 글자색은 대비를 계산해서 자동으로 정해요. 지금: ${fgName} · 대비 ${r.onAccentRatio.toFixed(1)}:1` + (r.onAccentRatio < 4.5 ? " — 낮아요. 색을 조금 더 진하게 하면 잘 읽혀요." : "");
    modeNote.textContent = modeNotes[theme.mode] + (theme.mode === "auto" ? ` (지금 RisuAI: ${ctx.state.risuScheme === "light" ? "라이트" : "다크"})` : "");
  }
  const left = h(
    "div",
    { class: "rb-section", style: "flex:1;min-width:300px;max-width:600px" },
    h(
      "div",
      { style: "display:flex;align-items:center;gap:10px" },
      iconBtn("back", "도구로 돌아가기", { onClick: () => ctx.go("tools") }),
      h("div", null, h("span", { class: "rb-muted" }, "도구 · 설정"), h("h2", { class: "rb-h2" }, "색 바꾸기"))
    ),
    h("div", { class: "rb-field" }, h("span", { class: "rb-label" }, "테마"), h("div", { class: "rb-presets" }, presetBtns)),
    h(
      "div",
      { class: "rb-field" },
      h("span", { class: "rb-label" }, "직접 고르기"),
      h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px" }, fa, fb),
      contrastNote
    ),
    h("div", { class: "rb-field" }, h("span", { class: "rb-label" }, "밝기"), modeSeg, modeNote),
    h(
      "div",
      { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" },
      btn("기본값으로", { onClick: () => {
        update({ ...DEFAULT_THEME, mode: theme.mode });
      } }),
      saved
    )
  );
  const demoSwitch = switchEl(true, { label: "미리보기 스위치", onChange: (on, el) => el.setAttribute("aria-checked", on ? "true" : "false") });
  const preview = h(
    "div",
    { class: "rb-section", style: "flex:1;min-width:280px" },
    h("span", { class: "rb-label" }, "미리보기"),
    h(
      "div",
      { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:14px" },
      h(
        "div",
        { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap" },
        btn("적용하기", { kind: "primary" }),
        btn("보조 버튼"),
        chip("선택된 필터", { pressed: true, count: 12 }),
        demoSwitch
      ),
      h(
        "div",
        { class: "rb-row", "aria-selected": "true", style: "cursor:default" },
        h("span", { class: "grip" }, icon("grip", 14)),
        h("div", { class: "txt" }, h("div", { class: "ttl" }, h("span", { class: "name" }, "예시 모듈"), badge("페르소나", "acc2")), h("span", { class: "meta" }, "로어 12 · 에셋 34"))
      ),
      h("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, badge("제작자 수정", "acc"), badge("내 수정", "acc2"), badge("충돌", "warn"), badge("추가", "ok"), badge("삭제", "danger")),
      progressBar(61)
    ),
    h("p", { class: "rb-muted" }, "모듈 이름 색과 폴더 색은 모듈 목록에서 각 모듈의 ⋯ 메뉴로 바꿔요. 어떤 밝기에서도 읽히도록 자동으로 진하기를 맞춰요.")
  );
  replace(ctx.main, h("div", { class: "rb-scroll", style: "flex:1;display:flex;flex-wrap:wrap;align-content:flex-start" }, left, preview));
  paint();
}
