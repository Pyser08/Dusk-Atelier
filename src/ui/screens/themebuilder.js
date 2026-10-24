// 테마 빌더 화면: 스타일 → 대표색 → 밝기만 고르면 테마 완성. 결과는 일반 테마로 저장된다.
import { h, replace } from '../dom.js';
import { btn, iconBtn, segmented, note } from '../kit.js';
import { ensureStudioCss, mockDoc } from './themestudio.js';
import { TARGETS, loadThemes, saveThemes, detectTarget } from '../../data/themes.js';
import { STYLES, styleById, defaultChoice, buildTheme, makePalette, thumbHtml, contrast, handoff } from '../../data/themebuilder.js';

var SWATCHES = ["#9a6b4f", "#c2557a", "#e07a5f", "#d4a72c", "#5a9e6f", "#3a9ca8", "#4f9cf7", "#7c5cf0", "#8a8fa3"];
var CSS = `
.rb-tb{display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:16px;flex:1;min-height:0}
.rb-tb-side{display:flex;flex-direction:column;gap:16px;overflow:auto;padding-right:4px}
.rb-tb-h{font-size:13px;font-weight:800;margin-bottom:8px}
.rb-tb-styles{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px}
.rb-tb-style{border:2px solid var(--rb-line);border-radius:12px;background:none;padding:0;cursor:pointer;overflow:hidden;text-align:left;color:inherit;transition:border-color .15s,transform .15s}
.rb-tb-style:hover{transform:translateY(-1px)}
.rb-tb-style[aria-pressed=true]{border-color:var(--rb-accent,#7c5cf0)}
.rb-tb-style .th{height:74px;pointer-events:none}
.rb-tb-style .nm{display:block;padding:6px 8px;font-size:12.5px;font-weight:700}
.rb-tb-sw{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.rb-tb-sw button{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;box-shadow:inset 0 0 0 1px rgb(0 0 0/.2)}
.rb-tb-sw button[aria-pressed=true]{border-color:var(--rb-text);transform:scale(1.08)}
.rb-tb-sw input[type=color]{width:34px;height:30px;border:1px solid var(--rb-line);border-radius:8px;background:none;padding:2px;cursor:pointer}
.rb-tb-pal{display:flex;height:22px;border-radius:8px;overflow:hidden;border:1px solid var(--rb-line)}
.rb-tb-pal span{flex:1}
.rb-tb-name{width:100%;box-sizing:border-box;height:34px;border-radius:9px;border:1px solid var(--rb-line);background:var(--rb-surf);color:var(--rb-text);padding:0 10px}
@media (max-width:760px){.rb-tb{grid-template-columns:1fr}.rb-tb-side{overflow:visible}}
`;
var cssDone = false;

export async function renderThemeBuilder(ctx) {
  ensureStudioCss();
  if (!cssDone) {
    document.head.appendChild(h("style", null, CSS));
    cssDone = true;
  }
  const data = await loadThemes(ctx.api);
  const rootDoc = await ctx.api.getRootDocument?.().catch(() => null) ?? null;
  const target = data.target ?? await detectTarget(rootDoc);
  const list = data.themes[target];

  // 스튜디오에서 "빌더에서 고치기"로 왔으면 그 테마를 이어서 편집
  const editing = list.find((t) => t.id === handoff.builder && t.builder) ?? null;
  handoff.builder = null;
  let choice = editing ? { ...defaultChoice(editing.builder.style), ...editing.builder } : defaultChoice("letter");
  let accentTouched = !!editing;
  const nameIn = h("input", { class: "rb-tb-name", type: "text", value: editing?.name ?? styleById(choice.style).name + " 테마", "aria-label": "테마 이름" });
  let nameTouched = !!editing;
  nameIn.addEventListener("input", () => nameTouched = true);

  const iframe = h("iframe", { title: "테마 미리보기", sandbox: "allow-same-origin" });
  const frame = h("div", { class: "rb-ts-frame" }, iframe);
  const stylesEl = h("div", { class: "rb-tb-styles", role: "group", "aria-label": "스타일" });
  const swEl = h("div", { class: "rb-tb-sw" });
  const palEl = h("div", { class: "rb-tb-pal", title: "만들어진 팔레트" });
  const infoEl = h("div", { class: "rb-muted", style: "font-size:12px;line-height:1.6" });
  const modeEl = h("div");
  const viewEl = h("div");
  let mobile = false;

  const theme = () => buildTheme(choice, target, editing ? structuredClone(editing) : null);
  let timer = 0;
  const preview = () => {
    clearTimeout(timer);
    timer = setTimeout(() => iframe.srcdoc = mockDoc(theme()), 60);
  };
  const draw = () => {
    const P = makePalette(choice.accent, choice.mode);
    replace(stylesEl, ...STYLES.map((s) => {
      const sp = makePalette(accentTouched ? choice.accent : s.accent, accentTouched ? choice.mode : s.mode);
      const th = h("div", { class: "th" });
      th.innerHTML = thumbHtml(s.id, sp);
      return h("button", { type: "button", class: "rb-tb-style", "aria-pressed": String(choice.style === s.id), title: s.desc, onClick: () => {
        choice = accentTouched ? { ...choice, style: s.id } : defaultChoice(s.id);
        if (!nameTouched) nameIn.value = s.name + " 테마";
        draw();
      } }, th, h("span", { class: "nm" }, s.name));
    }));
    const custom = h("input", { type: "color", value: choice.accent, "aria-label": "직접 고르기", title: "직접 고르기" });
    custom.addEventListener("input", () => {
      choice.accent = custom.value;
      accentTouched = true;
      drawPal();
      preview();
    });
    custom.addEventListener("change", draw);
    replace(swEl, ...SWATCHES.map((c) => h("button", { type: "button", style: `background:${c}`, "aria-label": c, "aria-pressed": String(c === choice.accent), onClick: () => {
      choice.accent = c;
      accentTouched = true;
      draw();
    } })), custom);
    replace(modeEl, segmented([["light", "밝게"], ["dark", "어둡게"]], choice.mode, (v) => {
      choice.mode = v;
      accentTouched = true;
      draw();
    }, "밝기"));
    drawPal(P);
    preview();
  };
  const drawPal = (P = makePalette(choice.accent, choice.mode)) => {
    replace(palEl, ...["bg", "paper", "tint", "line", "muted", "ink", "accent", "userBubble"].map((k) => h("span", { style: `background:${P[k]}`, title: k })));
    const cr = contrast(P.ink, P.paper);
    replace(infoEl, `${styleById(choice.style).desc}. 글자 대비 ${cr.toFixed(1)}:1 — 읽기 편하게 자동으로 맞췄어요.`);
  };
  replace(viewEl, segmented([["pc", "PC"], ["mobile", "모바일"]], "pc", (v) => {
    mobile = v === "mobile";
    frame.classList.toggle("mobile", mobile);
  }, "미리보기 크기"));

  const save = async (thenStudio) => {
    const t = theme();
    t.name = nameIn.value.trim() || t.name;
    const i = list.findIndex((x) => x.id === t.id);
    if (i >= 0) list[i] = t;
    else list.push(t);
    try {
      await saveThemes(ctx.api, data);
    } catch (e) {
      ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
      return;
    }
    ctx.toast(editing ? "테마를 고쳤어요" : "테마를 만들었어요. 스튜디오에서 적용하거나 더 다듬을 수 있어요");
    if (thenStudio) {
      handoff.studio = t.id;
      ctx.go("settings", "themestudio");
    }
  };

  const top = h("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" },
    iconBtn("back", "설정으로", { onClick: () => ctx.go("settings") }),
    h("b", { style: "font-size:16px" }, editing ? `테마 빌더 · ${editing.name}` : "테마 빌더"),
    h("span", { class: "rb-muted", style: "font-size:12.5px" }, TARGETS[target].label + "용"),
    h("div", { style: "margin-left:auto" }, viewEl));
  const side = h("div", { class: "rb-tb-side" },
    h("div", null, h("div", { class: "rb-tb-h" }, "1. 스타일"), stylesEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "2. 대표색"), swEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "3. 밝기"), modeEl),
    h("div", { style: "display:flex;flex-direction:column;gap:6px" }, palEl, infoEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "이름"), nameIn),
    h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("스튜디오에서 열기", { kind: "primary", icon: "check", onClick: () => save(true) }),
      btn("저장만", { icon: "check", onClick: () => save(false) })),
    note("info", "만든 테마는 스튜디오에서 적용하고, CSS·HTML을 직접 더 고칠 수도 있어요. 스튜디오에서 고친 뒤 빌더에서 다시 저장하면 직접 고친 부분은 덮어써져요."));
  const wrap = h("div", { class: "rb-section", style: "flex:1;display:flex;flex-direction:column;gap:12px;min-height:0" }, top, h("div", { class: "rb-tb" }, side, frame));
  replace(ctx.main, h("div", { class: "rb-scroll", style: "flex:1;display:flex;flex-direction:column;padding:4px" }, wrap));
  draw();
}
