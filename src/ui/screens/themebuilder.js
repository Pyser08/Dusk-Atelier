// 테마 빌더 화면: 스타일 → 대표색 → 밝기만 고르면 테마 완성. 결과는 일반 테마로 저장된다.
import { h, replace } from '../dom.js';
import { btn, iconBtn, segmented, note, chip, switchEl, promptDialog } from '../kit.js';
import { AI_MODES, runAI } from '../../engine/merge.js';
import { ensureStudioCss, mockDoc } from './themestudio.js';
import { TARGETS, loadThemes, saveThemes, detectTarget } from '../../data/themes.js';
import { STYLES, styleById, defaultChoice, normalizeChoice, buildTheme, makePalette, thumbHtml, contrast, handoff, DIALS, WIDTHS, AVATARS, FONTS, aiChoose, aiStyle, aiStylePrompt, aiEditPrompt, currentStyleCss, pickAccentFromPixels, shareCode, readShareCode, loadStyles } from '../../data/themebuilder.js';

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
.rb-tb-dial{display:grid;grid-template-columns:52px 1fr 52px;align-items:center;gap:8px;font-size:12px;margin-bottom:6px}
.rb-tb-dial span:last-child{text-align:right}
.rb-tb-dial input{width:100%;accent-color:var(--rb-accent,#7c5cf0)}
.rb-tb-chips{display:flex;flex-wrap:wrap;gap:6px}
.rb-tb-deco{display:flex;flex-direction:column;gap:6px}
.rb-tb-ai{border:1px solid var(--rb-line);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--rb-surf)}
.rb-tb-ai textarea{width:100%;box-sizing:border-box;min-height:58px;resize:vertical;border-radius:9px;border:1px solid var(--rb-line);background:var(--rb-bg,transparent);color:var(--rb-text);padding:8px 10px;font:inherit;font-size:13px}
.rb-tb-ai select,.rb-tb-ai input{height:32px;border-radius:8px;border:1px solid var(--rb-line);background:var(--rb-surf);color:var(--rb-text);padding:0 8px;min-width:0}
@media (max-width:760px){.rb-tb{grid-template-columns:1fr}.rb-tb-side{overflow:visible}}
`;
var cssDone = false;

export async function renderThemeBuilder(ctx) {
  await loadStyles(ctx.api);
  ensureStudioCss();
  if (!cssDone) {
    document.head.appendChild(h("style", null, CSS));
    cssDone = true;
  }
  const data = await loadThemes(ctx.api);
  const rootDoc = await ctx.api.getRootDocument?.().catch(() => null) ?? null;
  const target = data.target ?? await detectTarget(rootDoc, ctx.api);
  const list = data.themes[target];

  // 스튜디오에서 "빌더에서 고치기"로 왔으면 그 테마를 이어서 편집
  const editing = list.find((t) => t.id === handoff.builder && t.builder) ?? null;
  handoff.builder = null;
  let choice = editing ? normalizeChoice(editing.builder) : defaultChoice("letter");
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
  const dialEl = h("div");
  const decoEl = h("div", { class: "rb-tb-deco" });
  const widthEl = h("div");
  const avEl = h("div", { class: "rb-tb-chips", role: "group", "aria-label": "프로필 모양" });
  const fontEl = h("div", { class: "rb-tb-chips", role: "group", "aria-label": "글꼴" });
  let mobile = false;

  const theme = () => buildTheme(choice, target, editing ? structuredClone(editing) : null);
  let timer = 0;
  const preview = () => {
    clearTimeout(timer);
    timer = setTimeout(() => iframe.srcdoc = mockDoc(theme()), 60);
  };
  const draw = () => {
    const P = makePalette(choice.accent, choice.mode, choice.vivid);
    replace(stylesEl, ...STYLES.map((s) => {
      const sp = makePalette(accentTouched ? choice.accent : s.accent, accentTouched ? choice.mode : s.mode, choice.vivid);
      const th = h("div", { class: "th" });
      th.innerHTML = thumbHtml(s.id, sp);
      return h("button", { type: "button", class: "rb-tb-style", "aria-pressed": String(!choice.aiCss && choice.style === s.id), title: s.desc, onClick: () => {
        const d = defaultChoice(s.id);
        delete choice.aiCss;
        choice = accentTouched ? { ...choice, style: s.id, deco: d.deco } : { ...d, vivid: choice.vivid, round: choice.round, space: choice.space, avatar: choice.avatar, font: choice.font };
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
    const photo = h("input", { type: "file", accept: "image/*", style: "display:none" });
    photo.addEventListener("change", async () => {
      const f = photo.files?.[0];
      if (!f) return;
      try {
        const bmp = await createImageBitmap(f);
        const k = Math.min(1, 160 / Math.max(bmp.width, bmp.height));
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(bmp.width * k));
        cv.height = Math.max(1, Math.round(bmp.height * k));
        const g = cv.getContext("2d");
        g.drawImage(bmp, 0, 0, cv.width, cv.height);
        const c = pickAccentFromPixels(g.getImageData(0, 0, cv.width, cv.height).data);
        if (!c) return ctx.toast("뚜렷한 색을 찾지 못했어요");
        choice.accent = c;
        accentTouched = true;
        draw();
      } catch (e) {
        ctx.toast(`사진을 읽지 못했어요: ${e?.message ?? e}`, { error: true });
      }
    });
    const photoBtn = btn("사진에서", { size: "sm", icon: "image", title: "캐릭터 사진에서 대표색 뽑기", onClick: () => photo.click() });
    replace(swEl, ...SWATCHES.map((c) => h("button", { type: "button", style: `background:${c}`, "aria-label": c, "aria-pressed": String(c === choice.accent), onClick: () => {
      choice.accent = c;
      accentTouched = true;
      draw();
    } })), custom, photoBtn, photo);
    replace(modeEl, segmented([["light", "밝게"], ["dark", "어둡게"]], choice.mode, (v) => {
      choice.mode = v;
      accentTouched = true;
      draw();
    }, "밝기"));
    replace(dialEl, ...DIALS.map(([k, lo, hi]) => {
      const r = h("input", { type: "range", min: "0", max: "100", step: "5", value: String(choice[k]), "aria-label": `${lo}↔${hi}` });
      r.addEventListener("input", () => {
        choice[k] = +r.value;
        drawPal();
        preview();
      });
      if (k === "vivid") r.addEventListener("change", draw);
      return h("label", { class: "rb-tb-dial" }, h("span", null, lo), r, h("span", null, hi));
    }));
    if (choice.aiCss) replace(decoEl, h("div", { class: "rb-muted", style: "font-size:12px" }, "AI 스타일을 쓰는 중이라 장식은 AI가 정했어요. 바꾸고 싶으면 위 'AI로 고치기'에 말해 주세요."));
    else replace(decoEl, ...styleById(choice.style).deco.map((d) => h("div", { style: "display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px" }, h("span", null, d.name), switchEl(!!choice.deco[d.id], { label: d.name, onChange: (on, el) => {
      choice.deco = { ...choice.deco, [d.id]: on };
      el.setAttribute("aria-checked", String(on));
      preview();
    } }))));
    replace(widthEl, segmented(WIDTHS.map(([k, l]) => [k, l]), choice.width, (v) => {
      choice.width = v;
      preview();
    }, "본문 너비"));
    replace(avEl, ...AVATARS.map(([k, l]) => chip(l, { pressed: choice.avatar === k, onClick: () => {
      choice.avatar = k;
      draw();
    } })));
    replace(fontEl, ...FONTS.map((f) => chip(f.name, { pressed: choice.font === f.id, onClick: () => {
      choice.font = f.id;
      draw();
    } })));
    drawPal(P);
    preview();
  };
  const drawPal = (P = makePalette(choice.accent, choice.mode, choice.vivid)) => {
    replace(palEl, ...["bg", "paper", "tint", "line", "muted", "ink", "accent", "userBubble"].map((k) => h("span", { style: `background:${P[k]}`, title: k })));
    const cr = contrast(P.ink, P.paper);
    replace(infoEl, `${styleById(choice.style).desc}. 글자 대비 ${cr.toFixed(1)}:1 — 읽기 편하게 자동으로 맞췄어요.`);
  };
  replace(viewEl, segmented([["pc", "PC"], ["mobile", "모바일"]], "pc", (v) => {
    mobile = v === "mobile";
    frame.classList.toggle("mobile", mobile);
  }, "미리보기 크기"));

  // ── AI로 시작하기 (모델 설정은 합치기 AI와 같은 rbm:aiModel:v1) ──
  let ai = { mode: "submodel", staticModel: "" };
  try {
    ai = { ...ai, ...JSON.parse(await ctx.api.pluginStorage.getItem("rbm:aiModel:v1") || "{}") };
  } catch {}
  const saveAi = () => ctx.api.pluginStorage.setItem("rbm:aiModel:v1", JSON.stringify({ mode: ai.mode, staticModel: ai.staticModel })).catch(() => {});
  const wantIn = h("textarea", { placeholder: "예: 비 오는 밤 카페에서 쓰는 손편지 느낌, 차분한 남색", "aria-label": "원하는 분위기" });
  const modelSel = h("select", { "aria-label": "AI 모델" }, ...AI_MODES.map(([v, l]) => h("option", { value: v, selected: ai.mode === v }, l)));
  const modelId = h("input", { type: "text", placeholder: "모델 ID", value: ai.staticModel ?? "", style: ai.mode === "static" ? "flex:1" : "display:none" });
  modelSel.addEventListener("change", () => {
    ai.mode = modelSel.value;
    modelId.style.cssText = ai.mode === "static" ? "flex:1" : "display:none";
    saveAi();
  });
  modelId.addEventListener("change", () => {
    ai.staticModel = modelId.value.trim();
    saveAi();
  });
  const aiMsg = h("div", { class: "rb-muted", style: "font-size:12px;line-height:1.6" });
  let aiMode = "new";
  const modeSeg = h("div");
  const aiStatus = h("div");
  const undo = [];
  let aiBusy = false;
  const runBusy = async (label, fn) => {
    if (aiBusy) return;
    if (ai.mode === "static" && !ai.staticModel) return replace(aiMsg, "모델 ID를 먼저 적어 주세요.");
    aiBusy = true;
    aiBox.querySelectorAll("button").forEach((b) => b.disabled = true);
    replace(aiMsg, label);
    try {
      undo.push(structuredClone(choice));
      if (undo.length > 10) undo.shift();
      await fn((m) => runAI(ctx.api, m, ai));
      accentTouched = true;
      draw();
    } catch (e) {
      undo.pop();
      replace(aiMsg, `AI가 하지 못했어요: ${e?.message ?? e}`);
    } finally {
      aiBusy = false;
      aiBox.querySelectorAll("button").forEach((b) => b.disabled = false);
      drawAi();
    }
  };
  const aiBtn = btn("AI로 만들기", { kind: "primary", size: "sm", icon: "zap", onClick: () => {
    if (!wantIn.value.trim()) return wantIn.focus();
    if (aiMode === "pick") return runBusy("AI가 고르는 중…", async (run) => {
      const r = await aiChoose(wantIn.value, run);
      choice = r.choice;
      if (r.name && !nameTouched) nameIn.value = r.name;
      replace(aiMsg, "골랐어요. 아래에서 마음대로 더 바꿔도 돼요.");
    });
    return runBusy("AI가 새 스타일을 디자인하는 중… (큰 모델일수록 좋아요)", async (run) => {
      // 색·밝기·글꼴은 먼저 고르게 하고, 모양은 새로 쓴다
      const r = await aiChoose(wantIn.value, run).catch(() => null);
      const base = r ? { ...r.choice, avatar: "style" } : { ...choice };
      const css = await aiStyle(aiStylePrompt(wantIn.value, base), run);
      choice = { ...base, aiCss: css };
      if (r?.name && !nameTouched) nameIn.value = r.name;
      replace(aiMsg, "새 스타일을 만들었어요. 일반 리스·포켓 계열 모두 같은 규칙으로 보여요. 고치고 싶은 곳은 아래에 말해 주세요.");
    });
  } });
  const editIn = h("input", { type: "text", placeholder: "예: 이름을 더 크게, 내 말풍선 모서리는 각지게", "aria-label": "AI로 고칠 내용", style: "flex:1;min-width:160px" });
  const editBtn = btn("AI로 고치기", { size: "sm", icon: "brush", onClick: () => {
    if (!editIn.value.trim()) return editIn.focus();
    runBusy("AI가 고치는 중…", async (run) => {
      const css = await aiStyle(aiEditPrompt(editIn.value, currentStyleCss(choice)), run);
      choice = { ...choice, aiCss: css };
      editIn.value = "";
      replace(aiMsg, "고쳤어요. 마음에 안 들면 '되돌리기'를 눌러요.");
    });
  } });
  editIn.addEventListener("keydown", (e) => e.key === "Enter" && !e.isComposing && editBtn.click());
  const drawAi = () => {
    replace(modeSeg, segmented([["new", "새 스타일 만들기"], ["pick", "있는 스타일에서 고르기"]], aiMode, (v) => {
      aiMode = v;
    }, "AI 방식"));
    replace(aiStatus, choice.aiCss || undo.length ? h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px" },
      choice.aiCss ? h("span", { class: "rb-muted" }, "AI 스타일 사용 중") : null,
      undo.length ? btn("되돌리기", { size: "sm", icon: "undo", onClick: () => {
        choice = undo.pop();
        draw();
        drawAi();
        replace(aiMsg, "되돌렸어요.");
      } }) : null,
      choice.aiCss ? btn("기본 스타일로", { size: "sm", onClick: () => {
        undo.push(structuredClone(choice));
        delete choice.aiCss;
        draw();
        drawAi();
      } }) : null) : "");
  };
  const aiBox = h("div", { class: "rb-tb-ai" }, h("div", { class: "rb-tb-h", style: "margin:0" }, "✨ AI"), modeSeg, wantIn,
    h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;align-items:center" }, modelSel, modelId, aiBtn),
    h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;align-items:center;border-top:1px dashed var(--rb-line);padding-top:8px" }, editIn, editBtn),
    aiStatus, aiMsg);
  drawAi();

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
    aiBox,
    h("div", null, h("div", { class: "rb-tb-h" }, "1. 스타일"), stylesEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "2. 대표색"), swEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "3. 밝기"), modeEl),
    h("div", { style: "display:flex;flex-direction:column;gap:6px" }, palEl, infoEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "4. 분위기"), dialEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "본문 너비"), widthEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "5. 장식"), decoEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "6. 프로필 모양"), avEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "7. 글꼴"), fontEl),
    h("div", null, h("div", { class: "rb-tb-h" }, "이름"), nameIn),
    h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("스튜디오에서 열기", { kind: "primary", icon: "check", onClick: () => save(true) }),
      btn("저장만", { icon: "check", onClick: () => save(false) })),
    h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("공유 코드 복사", { size: "sm", icon: "link", onClick: async () => {
        const code = shareCode(choice, nameIn.value.trim());
        try {
          await navigator.clipboard.writeText(code);
          ctx.toast("공유 코드를 복사했어요. 받은 사람은 '코드로 불러오기'에 붙여 넣으면 돼요");
        } catch {
          await promptDialog(ctx.win, { title: "공유 코드", label: "아래 글자를 복사해 주세요", value: code, ok: "닫기" });
        }
      } }),
      btn("코드로 불러오기", { size: "sm", icon: "download", onClick: async () => {
        const text = await promptDialog(ctx.win, { title: "공유 코드 불러오기", label: "DTB1: 로 시작하는 코드를 붙여 넣어요", placeholder: "DTB1:…", ok: "불러오기" });
        if (!text) return;
        try {
          const r = readShareCode(text);
          choice = r.choice;
          accentTouched = true;
          if (r.name) {
            nameIn.value = r.name;
            nameTouched = true;
          }
          draw();
          drawAi();
          ctx.toast("불러왔어요");
        } catch (e) {
          ctx.toast(e?.message ?? String(e), { error: true });
        }
      } })),
    note("info", "만든 테마는 스튜디오에서 적용하고, CSS·HTML을 직접 더 고칠 수도 있어요. 스튜디오에서 고친 뒤 빌더에서 다시 저장하면 직접 고친 부분은 덮어써져요."));
  const wrap = h("div", { class: "rb-section", style: "flex:1;display:flex;flex-direction:column;gap:12px;min-height:0" }, top, h("div", { class: "rb-tb" }, side, frame));
  // 화면 전환 중 비동기 렌더가 늦게 끝나 이전 화면을 덮어쓰지 않도록 한다.
  if (ctx.state.tab !== "settings" || ctx.state.sub !== "themebuilder") return;
  replace(ctx.main, h("div", { class: "rb-scroll", style: "flex:1;display:flex;flex-direction:column;padding:4px" }, wrap));
  draw();
}
