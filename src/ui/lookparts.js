// 꾸미기 화면과 시작 안내(2단계)가 함께 쓰는 선택 부품: 테마 묶음 · 강조 색 · 그라데이션 · 밝기 · 글자 크기 · 모양/글꼴.
// get()은 지금 테마(정규화됨), set(patch)는 바꾼 값을 적용·저장한다. paint()로 눌림 표시를 맞춘다.
import { h } from './dom.js';
import { segmented, toggleRow } from './kit.js';
import { ACCENT_GROUPS, DIRECTIONS, EDGES, FONTS, GRADIENTS, ICONWS, LINEHS, MODES, PATTERNS, ROUNDS, SHADOWS, THEME_SETS, WEIGHTS } from './themekit.js';
import { PRESETS, applySet, randomSet } from './theme.js';
import { GLASS_THEMES, glassSwatch } from './glassthemes.js';

// 글자 크기 빠른 선택(퍼센트). 세밀한 값은 고급의 '확대율' 막대로.
export var SIZE_CHOICES = [["90", "작게"], ["100", "보통"], ["110", "크게"], ["130", "아주 크게"]];
export var sizeOf = (zoom) => zoom >= 125 ? "xl" : zoom >= 105 ? "l" : "m";

export function lookParts({ get, set: rawSet }) {
  // 색을 직접 고르면(테마 묶음·강조 색·그라데이션·직접 색) 글래스 테마는 '내 강조색'으로 바꿔 고른 색이 보이게 한다
  const COLOR_KEYS = ["a", "b", "set", "preset", "grad", "cBg", "cCard", "cText", "cSide"];
  const set = (patch) => {
    const cur = get();
    // 부분 패치(강조 색·그라데이션·직접 색 버튼)는 누르기만 해도, 테마 전체(테마 묶음)는 색이 실제로 바뀔 때만
    const partial = patch && !("v" in patch);
    const colorChanged = patch && COLOR_KEYS.some((k) => k in patch && (partial || patch[k] !== cur[k]));
    return rawSet(colorChanged && (!("gtheme" in patch) || patch.gtheme === cur.gtheme) ? { ...patch, gtheme: "mine" } : patch);
  };
  // ── 글래스 테마 6종 + 내 강조색(2.2.0) ──
  const glassBtns = [...GLASS_THEMES.map((g) => h("button", { type: "button", class: "rb-gpick", dataset: { id: g.id }, "aria-label": `${g.name} 글래스 테마`, onClick: () => rawSet({ gtheme: g.id, skin: "glass" }) }, h("i", { style: { background: glassSwatch(g) } }), g.name)),
    h("button", { type: "button", class: "rb-gpick", dataset: { id: "mine" }, "aria-label": "내 강조색 글래스 테마", onClick: () => rawSet({ gtheme: "mine", skin: "glass" }) }, h("i", { class: "mine" }), "내 강조색")];
  const glass = h("div", { class: "rb-gpicks", role: "group", "aria-label": "글래스 테마" }, glassBtns);
  const press = (nodes, on) => nodes.forEach((b) => b.setAttribute("aria-pressed", on(b) ? "true" : "false"));

  // ── 테마 묶음 12 + 🎲 아무거나 ──
  const setBtns = THEME_SETS.map((s) => h(
    "button",
    { type: "button", class: "rb-setpick", dataset: { id: s.id }, "aria-label": `${s.name} 테마 묶음`, onClick: () => set(applySet(get(), s.id)) },
    h("i", { class: "mini", style: { background: s.base.win } }, h("b", { style: { background: s.base.surf } }), h("u", { style: { background: `linear-gradient(135deg, ${s.a}, ${s.b})` } })),
    s.name
  ));
  const dice = h("button", { type: "button", class: "rb-setpick dice", id: "rb-set-random", "aria-label": "테마 묶음 아무거나", onClick: () => set(randomSet(get())) }, h("i", { class: "mini die", "aria-hidden": "true" }, "🎲"), "아무거나");
  const sets = h("div", { class: "rb-setgrid", role: "group", "aria-label": "테마 묶음" }, setBtns, dice);

  // ── 강조 색 18 (따뜻한 · 차분한 · 파스텔) ──
  const accBtns = [];
  const accents = h("div", { class: "rb-accgroups" }, ACCENT_GROUPS.map(([g, label]) => h(
    "div",
    { class: "rb-accgroup" },
    h("small", null, label),
    h("div", { class: "rb-accpicks" }, PRESETS.filter((p) => p.g === g).map((p) => {
      const b = h(
        "button",
        { type: "button", class: "rb-accpick", dataset: { id: p.id }, "aria-label": `${p.name} 색`, onClick: () => set({ preset: p.id, a: p.a, b: p.b, grad: "" }) },
        h("i", { style: { background: `linear-gradient(135deg, ${p.a}, ${p.b})` } }),
        p.name
      );
      accBtns.push(b);
      return b;
    }))
  )));

  // ── 그라데이션 8 + 방향 ──
  const gradBtns = [h("button", { type: "button", class: "rb-accpick", dataset: { id: "" }, "aria-label": "그라데이션 없음", onClick: () => set({ grad: "" }) }, h("i", { class: "none" }, "–"), "없음")];
  for (const g of GRADIENTS) gradBtns.push(h("button", { type: "button", class: "rb-accpick", dataset: { id: g.id }, "aria-label": `${g.name} 그라데이션`, onClick: () => set({ grad: g.id }) }, h("i", { style: { background: `linear-gradient(135deg, ${g.a}, ${g.b})` } }), g.name));
  const dirSeg = segmented(DIRECTIONS.map(([v, n]) => [v, n]), get().dir, (v) => set({ dir: v }), "그라데이션 방향");
  const grads = h("div", { class: "rb-lfield" }, h("div", { class: "rb-accpicks" }, gradBtns), dirSeg);

  // ── 밝기 · 글자 크기 ──
  const modeNotes = { auto: "창을 열 때마다 RisuAI 테마의 밝기에 맞춰요.", dark: "RisuAI 설정과 상관없이 항상 다크로 열려요.", light: "RisuAI 설정과 상관없이 항상 라이트로 열려요.", time: "낮(7시~19시)엔 밝게, 밤엔 어둡게 열려요." };
  const modeNote = h("small", { class: "rb-muted" });
  const modeSeg = segmented(MODES, get().mode, (v) => set({ mode: v }), "밝기");
  const sizeSeg = segmented(SIZE_CHOICES, "", (v) => set({ zoom: Number(v), size: sizeOf(Number(v)) }), "글자 크기");

  // ── 모양 · 글꼴 (더 고르기) ──
  const segs = [];
  const seg = (key, options, label) => {
    const s = segmented(options, get()[key], (v) => set({ [key]: v }), label);
    segs.push([s, key]);
    return s;
  };
  const field = (title, ...kids) => h("div", { class: "rb-lfield" }, h("b", null, title), ...kids);
  const toggles = [];
  const tog = (key, title, text) => {
    const row = toggleRow(title, text, !!get()[key], (on) => set({ [key]: on }));
    toggles.push([row, key]);
    return row;
  };
  const fontSeg = seg("font", FONTS.map((f) => [f.id, f.name]), "글꼴");
  fontSeg.querySelectorAll("button").forEach((b) => { b.style.fontFamily = FONTS.find((f) => f.id === b.dataset.v).stack; });
  const shapeBasic = [
    field("모서리", seg("round", ROUNDS, "모서리")),
    field("그림자", seg("shadowLv", SHADOWS, "그림자")),
    field("글꼴", fontSeg, h("small", { class: "rb-muted" }, "기기에 있는 글꼴만 써요. 없으면 기본 글꼴로 보여요.")),
    field("바탕 무늬", seg("pattern", PATTERNS, "바탕 무늬"))
  ];
  const shapeMore = [
    field("테두리", seg("edge", EDGES, "테두리")),
    field("글자 굵기", seg("weight", WEIGHTS, "글자 굵기")),
    field("줄 높이", seg("lineH", LINEHS, "줄 높이")),
    field("아이콘 굵기", seg("iconW", ICONWS, "아이콘 굵기")),
    tog("bgGrad", "바탕 그라데이션", "창 바탕이 살짝 강조 색으로 물들어요."),
    tog("glass", "카드 유리 효과", "카드가 살짝 비쳐 보여요. 고대비에선 꺼져요.")
  ];
  // motion은 'reduce'/'normal' 문자열이라 따로 처리
  const motion = toggleRow("움직임 줄이기", "화면 전환과 반짝임을 줄여요.", get().motion === "reduce", (on) => set({ motion: on ? "reduce" : "normal" }));
  shapeMore.push(motion);
  // 2.2.0 글래스 화면: 어두운 모드에서 빛 번짐 배경 + 유리 카드. 가벼운 화면 = 블러·발광 끔(저사양 기기)
  shapeMore.push(toggleRow("글래스 화면", "어두운 모드에서 빛 번짐 배경과 유리 카드로 보여요.", get().skin !== "classic", (on) => set({ skin: on ? "glass" : "classic" })));
  shapeMore.push(toggleRow("가벼운 화면", "흐림·발광 효과를 꺼서 느린 기기에서 가볍게 보여요.", get().lite === true, (on) => set({ lite: on })));
  // 시작 안내처럼 간단히 보여 줄 땐 full:false (모서리·그림자·글꼴·바탕 무늬만)
  const shape = ({ full = true } = {}) => h("div", { class: "rb-shape" }, shapeBasic, full ? shapeMore : null);

  function paint() {
    const t = get();
    press(glassBtns, (b) => t.skin === "glass" && b.dataset.id === t.gtheme);
    press(setBtns, (b) => b.dataset.id === t.set);
    press(accBtns, (b) => !t.grad && b.dataset.id === t.preset);
    press(gradBtns, (b) => b.dataset.id === t.grad);
    dirSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === t.dir ? "true" : "false"));
    dirSeg.classList.toggle("is-off", !t.grad);
    modeSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === t.mode ? "true" : "false"));
    sizeSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", Math.abs(Number(b.dataset.v) - t.zoom) <= 2 ? "true" : "false"));
    for (const [s, key] of segs) s.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === t[key] ? "true" : "false"));
    for (const [row, key] of toggles) row.querySelector("[role=switch]")?.setAttribute("aria-checked", t[key] ? "true" : "false");
    motion.querySelector("[role=switch]")?.setAttribute("aria-checked", t.motion === "reduce" ? "true" : "false");
    modeNote.textContent = modeNotes[t.mode] ?? "";
  }
  return { glass, sets, accents, grads, dirSeg, modeSeg, modeNote, sizeSeg, shape, paint, field };
}
