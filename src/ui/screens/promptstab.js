// 설정 → 기억·리수폿 프롬프트 (v1.7.0): 기억·리수폿을 쓸 때 기본 규칙 뒤에 덧붙는 '내 프롬프트'를 모든 사용자가 바로 다룬다.
// 값은 리수폿 설정 저장소의 customPrompts(모든 채팅 범위)를 그대로 쓴다. JSON·리스 프리셋(.risup)·글 파일에서 불러올 수 있다.
import { h, replace, pickFiles, download } from '../dom.js';
import { btn, switchEl, setSwitch, pageHead, note, confirmDialog, emptyState, modal } from '../kit.js';
import { tracked } from './memory/settingstools.js';
import { STAGE_NAMES } from './memory/advanced.js';
import { decodePreset } from '../../dev/aibuild/preset-format.js';
import { fromJson, fit, toJson, PROMPT_MAX } from '../../engine/promptimport.js';

var STAGES = ["router", "director", "writer"];
var MAX_ITEMS = 40;
var POSITIONS = [["front", "앞"], ["middle", "중간"], ["back", "뒤"]];
var POS_HINT = { front: "기본 규칙보다 앞에 들어가요.", middle: "기본 규칙 뒤, 기능별 규칙 앞에 들어가요.", back: "모든 규칙의 맨 뒤에 들어가요." };
var newId = (ids) => { let id = `p${Date.now().toString(36)}`; while (ids.has(id)) id += "x"; return id; };

// 파일 → 후보 [{name,text,cut}]. .risup/.risupreset · .json(프리셋이든 목록이든) · .txt/.md
export async function readPromptFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name ?? "";
  if (/\.(risup|risupreset)$/i.test(name)) return preset(decodePreset(bytes, name));
  const text = new TextDecoder("utf-8").decode(bytes);
  if (/\.json$/i.test(name)) {
    let v;
    try { v = JSON.parse(text); } catch { throw new Error("JSON을 읽지 못했어요."); }
    if (v && !Array.isArray(v) && typeof v === "object" && ("promptTemplate" in v || "mainPrompt" in v)) {
      try { return preset(decodePreset(bytes, name)); } catch { /* 프리셋 검사에서 막히면 일반 JSON으로 */ }
    }
    return fromJson(v).map(fit);
  }
  return text.trim() ? [fit({ name: name.replace(/\.[^.]+$/, ""), text })] : [];
}
function preset(p) { return fromJson({ promptTemplate: p.promptTemplate }).map(fit); }

export async function renderPrompts(ctx) {
  const st = tracked(ctx, await ctx.memory?.flow?.settings?.().catch(() => null));
  const host = h("div", { class: "rb-mem2-main" });
  replace(ctx.main, h("div", { class: "rb-scroll" }, h("div", { class: "rb-mem2", dataset: { page: "prompts" } }, host)));
  const head = () => pageHead("기억·리수폿 프롬프트", { sub: "기억·리수폿을 쓸 때 덧붙는 프롬프트예요. 앞·중간·뒤 위치를 고를 수 있어요.", back: { label: "설정으로", onClick: () => ctx.go("settings") } });
  if (!st) return replace(host, head(), emptyState({ icon: "info", title: "아직 쓸 수 없어요", text: "기억·리수폿을 한 번 켠 뒤에 다시 열어 주세요." }));
  const fail = (e) => ctx.toast(e?.message ?? String(e), { error: true });
  const edit = (fn) => { try { st.update(fn); } catch (e) { fail(e); } paint(); };

  const addMany = (items) => {
    const have = (st.rawSnapshot().customPrompts ?? []).length;
    if (have + items.length > MAX_ITEMS) return fail(new Error(`프롬프트는 ${MAX_ITEMS}개까지예요. 지금 ${have}개 있어요.`));
    edit((x) => {
      const list = x.customPrompts ?? [], ids = new Set(list.map((p) => p.id));
      for (const it of items) { const id = newId(ids); ids.add(id); list.push({ id, name: it.name ?? "", stages: it.stages ?? ["writer"], scope: { kind: "all" }, enabled: true, text: it.text ?? "", position: it.position ?? "back" }); }
      x.customPrompts = list;
    });
  };
  const doImport = async () => {
    const [f] = await pickFiles({ accept: ".json,.risup,.risupreset,.txt,.md" });
    if (!f) return;
    let cands;
    try { cands = await readPromptFile(f); } catch (e) { return fail(e); }
    if (!cands.length) return fail(new Error("가져올 프롬프트를 찾지 못했어요. 글이 든 항목이 없어요."));
    const picked = await pickDialog(ctx, f.name, cands);
    if (picked?.length) { addMany(picked); ctx.toast(`${picked.length}개를 추가했어요`); }
  };

  const row = (p, i) => {
    const set = (k, v) => edit((x) => { x.customPrompts[i][k] = v; });
    const stages = STAGES.map((k) => h("label", { class: "rb-mem-field row" }, h("span", null, STAGE_NAMES[k]), switchEl(p.stages.includes(k), { label: STAGE_NAMES[k], onChange: (v, el) => {
      const next = STAGES.filter((s) => s === k ? v : p.stages.includes(s));
      if (!next.length) { setSwitch(el, true); return fail(new Error("적용할 단계를 하나는 골라야 해요.")); }
      set("stages", next);
    } })));
    const pos = p.position || "back";
    const where = h("div", { class: "rb-mem-field", role: "radiogroup", "aria-label": "넣을 위치", style: "display:flex;gap:6px;align-items:center;flex-wrap:wrap" },
      h("span", null, "넣을 위치"),
      ...POSITIONS.map(([k, label]) => btn(label, { size: "sm", kind: pos === k ? "primary" : "", id: `rb-pos-${i}-${k}`, title: POS_HINT[k], onClick: () => set("position", k) })),
      h("span", { class: "rb-muted" }, POS_HINT[pos]));
    return h("article", { class: ["rb-card", "rb-mem-feat", p.enabled && "on"] },
      h("div", { class: "rb-mem-shead" },
        h("input", { class: "rb-input", value: p.name, placeholder: "이름(선택)", "aria-label": "이름", maxlength: 60, onChange: (e) => set("name", e.target.value.trim()) }),
        h("span", { style: "flex:1" }),
        switchEl(p.enabled, { label: "사용", onChange: (v, el) => { setSwitch(el, v); set("enabled", v); } })),
      p.scope.kind === "all" ? null : h("p", { class: "rb-muted" }, p.scope.kind === "bot" ? `이 봇에만 (${p.scope.label || p.scope.characterId})` : `이 채팅에만 (${p.scope.label || p.scope.characterId})`),
      h("textarea", { class: "rb-input", rows: 5, "aria-label": "프롬프트 본문", maxlength: PROMPT_MAX, placeholder: "AI에게 덧붙일 규칙을 적어요.", onChange: (e) => set("text", e.target.value) }, p.text),
      where,
      h("div", { class: "rb-mem-chats" }, stages),
      btn("삭제", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "프롬프트를 지울까요?", body: p.name || "이름 없는 프롬프트", ok: "지우기", danger: true })) edit((x) => { x.customPrompts.splice(i, 1); }); } }));
  };

  function paint() {
    const list = st.rawSnapshot().customPrompts ?? [];
    replace(host, head(),
      h("div", { class: "rb-mem-sact", style: "display:flex;gap:8px;flex-wrap:wrap" },
        btn("새 프롬프트", { kind: "primary", icon: "plus", id: "rb-pr-new", onClick: () => addMany([{ name: "", text: "" }]) }),
        btn("파일에서 불러오기", { icon: "upload", id: "rb-pr-import", onClick: doImport }),
        btn("내보내기", { icon: "download", id: "rb-pr-export", disabled: !list.length, title: "내 프롬프트를 JSON 파일로 저장해요", onClick: () => { download("dusk-prompts.json", toJson(list), "application/json"); ctx.toast(`${list.length}개를 내보냈어요`); } })),
      note("info", "JSON · 리스 프리셋(.risup) · 글 파일(.txt)에서 불러오고, 내 프롬프트는 JSON으로 내보내요(단계·위치도 함께 저장). 출력 형식은 바꾸지 못해요. 단계마다 켜고 끌 수 있어요."),
      list.length ? h("div", { style: "display:flex;flex-direction:column;gap:12px" }, ...list.map(row)) : h("p", { class: "rb-muted" }, "아직 없어요. 새 프롬프트를 만들거나 파일에서 불러와 보세요."));
  }
  paint();
}

// 불러올 항목 고르기 (처음엔 모두 선택)
function pickDialog(ctx, fileName, cands) {
  return modal(ctx.win, (done) => {
    const on = cands.map(() => true);
    const rows = cands.map((c, i) => {
      const cb = h("input", { type: "checkbox", checked: true, onChange: (e) => { on[i] = e.target.checked; } });
      return h("label", { style: "display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--rb-line);cursor:pointer" }, cb,
        h("span", { style: "flex:1;min-width:0" }, h("b", null, c.name || "(이름 없음)"), c.cut ? h("span", { class: "rb-muted" }, ` · 너무 길어 ${PROMPT_MAX.toLocaleString()}자까지만`) : null,
          h("div", { class: "rb-muted", style: "font-size:12.5px;word-break:break-all" }, c.text.replace(/\s+/g, " ").slice(0, 90))));
    });
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "프롬프트 불러오기", style: "width:min(560px,100%);max-height:80vh;display:flex;flex-direction:column;gap:8px" },
      h("h3", { class: "rb-h3" }, "프롬프트 불러오기"),
      h("p", { class: "rb-p rb-muted", style: "font-size:12.5px" }, `${fileName} · ${cands.length}개. 쓸 것만 골라요.`),
      h("div", { style: "overflow:auto;min-height:0" }, ...rows),
      h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn("추가", { kind: "primary", id: "rb-pr-add", onClick: () => done(cands.filter((_, i) => on[i])) })));
  });
}

// 기억·리수폿을 처음 켤 때 한 번: 프롬프트를 넣을 수 있다고 알려 준다
export async function maybePromptIntro(ctx) {
  if (ctx.prefs.ui?.promptIntroDone) return;
  try { await ctx.prefs.saveUi({ promptIntroDone: true }); } catch { /* 저장 못 해도 안내는 보여 준다 */ }
  const go = await modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "프롬프트 추가 안내", style: "width:min(440px,100%);display:flex;flex-direction:column;gap:10px" },
    h("h3", { class: "rb-h3" }, "내 프롬프트를 넣을 수 있어요"),
    h("p", { class: "rb-p", style: "word-break:keep-all" }, "기억·리수폿을 쓸 때 기본 규칙 뒤에 덧붙일 내 프롬프트를 추가할 수 있어요. JSON이나 리스 프리셋(.risup) 파일에서 불러와도 돼요."),
    h("p", { class: "rb-p rb-muted", style: "font-size:12.5px" }, "나중에 설정 → 기억·리수폿 프롬프트에서 언제든 열어요."),
    h("div", { class: "btns" }, btn("나중에", { onClick: () => done(false) }), btn("프롬프트 추가하기", { kind: "primary", id: "rb-pr-intro-go", onClick: () => done(true) }))));
  if (go) ctx.go("settings", "prompts");
}
