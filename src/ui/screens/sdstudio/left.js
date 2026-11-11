// 에셋 제작 — 왼쪽 '프롬프트 에디터'(SDStudio 왼쪽 칸 그대로): 프로젝트·프리셋 버튼, 상위·하위·네거티브 프롬프트(문법 색칠),
// 시드(값·잠금·방식), 이미지 사이즈(씬대로·고정 크기·직접), 캐릭터 프롬프트, 샘플링/모델 설정, 바이브 이미지, 레퍼런스 설정.
// 캐릭터를 연 동안은 '외형 프롬프트'(그 캐릭터 카드의 프롬프트)도 여기서 고친다.
import { h, replace } from "../../dom.js";
import { highlight } from "../../../engine/sdstudio/prompt.js";
import { RESOLUTIONS, modelOf, isFreeSize, clampSize } from "../../../engine/sdstudio/nai.js";
import * as P from "../../../engine/sdstudio/project.js";
import { ico } from "./look.js";

// 문법 색칠되는 프롬프트 칸(뒤에 색칠한 글, 위에 투명 글자 textarea)
export function promptArea({ value = "", onInput, rows = 4, placeholder = "", id, label }) {
  const pre = h("pre", { "aria-hidden": "true" });
  const ta = h("textarea", { rows, placeholder, id, spellcheck: "false", "aria-label": label });
  ta.value = value;
  const paint = () => {
    pre.replaceChildren(...highlight(ta.value).map((s) => (s.kind === "text" ? document.createTextNode(s.text) : h("span", { class: `k-${s.kind}` }, s.text))), document.createTextNode("\n"));
    pre.scrollTop = ta.scrollTop;
  };
  ta.addEventListener("input", () => { paint(); onInput?.(ta.value); });
  ta.addEventListener("scroll", () => { pre.scrollTop = ta.scrollTop; });
  new (globalThis.ResizeObserver ?? class { observe() {} })(() => { pre.style.height = `${ta.offsetHeight}px`; }).observe(ta);
  paint();
  const box = h("div", { class: "sds-pa" }, pre, ta);
  box.textarea = ta;
  return box;
}
export var helpDot = (text) => h("button", { type: "button", class: "sds-help", title: text, "aria-label": text, onClick: (e) => e.preventDefault() }, "?");
export var ib = (name, title, onClick, { on = false, danger = false, id, disabled = false } = {}) => {
  const b = h("button", { type: "button", class: ["sds-ib", on && "on", danger && "danger"], title, "aria-label": title, id, disabled, onClick }, ico(name, 18));
  return b;
};
var label = (text, help, forId) => h("label", { class: "sds-lbl", for: forId }, text, help ? helpDot(help) : null);

export function renderLeft(S, body) {
  const pr = S.proj, s = pr.settings, c = S.curChar();
  const setS = (patch, repaint = false) => { S.set(P.setSettings(S.proj, patch)); if (repaint) S.paintLeft(); S.paintTop(); };
  const els = [];
  els.push(h("div", null, label("상위 프롬프트", "모든 그림 맨 앞에 붙어요. | 를 넣으면 그 자리에 씬 조합이 들어가요. <모음.조각>으로 조각을 불러요.", "sds-top"),
    promptArea({ id: "sds-top", value: s.top, rows: 5, placeholder: "예: masterpiece, best quality, |, white background", label: "상위 프롬프트", onInput: (v) => setS({ top: v }) })));
  if (c) els.push(h("div", null, label(`${c.name} 외형 프롬프트`, "이 캐릭터의 생김새·복장. 상위 프롬프트 뒤에 붙어요.", "sds-own"),
    promptArea({ id: "sds-own", value: c.prompt, rows: 4, placeholder: "예: 1boy, cat ears, black hair, black hoodie", label: "외형 프롬프트", onInput: (v) => { S.set(P.updateChar(S.proj, c.id, { prompt: v })); } })));
  els.push(h("div", null, label("하위 프롬프트", "씬 조합 뒤, 맨 끝에 붙어요.", "sds-back"),
    promptArea({ id: "sds-back", value: s.back, rows: 4, placeholder: "예: 2::white background::, cat tail", label: "하위 프롬프트", onInput: (v) => setS({ back: v }) })));
  els.push(h("div", null, label("네거티브 프롬프트", "피할 것. 샘플링 설정의 네거티브 프리셋이 앞에 붙어요.", "sds-neg"),
    promptArea({ id: "sds-neg", value: s.neg, rows: 4, placeholder: "예: text, logo, watermark", label: "네거티브 프롬프트", onInput: (v) => setS({ neg: v }) })));

  // 시드: 값 · 잠금(고정) · 방식
  const seedIn = h("input", { class: "sds-in", id: "sds-seed", inputmode: "numeric", placeholder: "비우면 랜덤", value: s.seed.value ? String(s.seed.value) : "", style: "flex:1", onChange: (e) => { const v = Math.max(0, Math.floor(Number(e.target.value) || 0)) >>> 0; setS({ seed: { ...S.proj.settings.seed, value: v, mode: v && S.proj.settings.seed.mode === "random" ? "fixed" : S.proj.settings.seed.mode } }, true); } });
  const lock = h("label", { title: "시드 잠금(고정)", style: "display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--rb-sub)" }, ico("lock", 14),
    h("input", { type: "checkbox", id: "sds-seedlock", checked: s.seed.mode !== "random", onChange: (e) => setS({ seed: { ...S.proj.settings.seed, mode: e.target.checked ? "fixed" : "random" } }, true) }));
  const mode = h("select", { class: "sds-sel acc", id: "sds-seedmode", style: "flex:1", onChange: (e) => setS({ seed: { ...S.proj.settings.seed, mode: e.target.value } }, true) },
    ...[["random", "완전 랜덤"], ["fixed", "시드 고정"], ["chain", "장마다 이어서"]].map(([v, t]) => h("option", { value: v, selected: s.seed.mode === v }, t)));
  els.push(h("div", null, label("시드"), h("div", { class: "sds-row" }, seedIn, lock, mode)));

  // 이미지 사이즈
  const sz = s.size, cur = P.sizeFor(sz, S.curScene());
  const sizeSel = h("select", { class: "sds-sel", id: "sds-size", style: "flex:1", onChange: (e) => { const m = e.target.value; const r = RESOLUTIONS[m]; setS({ size: { ...S.proj.settings.size, mode: m, ...(r ? { w: r.width, h: r.height } : {}) } }, true); } },
    h("option", { value: "scene", selected: sz.mode === "scene" }, "각 씬의 설정대로"),
    ...Object.entries(RESOLUTIONS).map(([k, r]) => h("option", { value: k, selected: sz.mode === k }, `${r.label} ${r.width}×${r.height}${isFreeSize(r.width, r.height) ? "" : " · Anlas"}`)),
    h("option", { value: "custom", selected: sz.mode === "custom" }, "직접 입력"));
  const wh = (k, v) => h("input", { class: "sds-in", inputmode: "numeric", value: String(v), style: "width:76px;text-align:center", disabled: sz.mode !== "custom", "aria-label": k === "w" ? "가로" : "세로",
    onChange: (e) => { const n = clampSize(k === "w" ? e.target.value : S.proj.settings.size.w, k === "h" ? e.target.value : S.proj.settings.size.h); setS({ size: { ...S.proj.settings.size, w: n.width, h: n.height } }, true); } });
  els.push(h("div", null, label("이미지 사이즈", "‘각 씬의 설정대로’면 씬마다 정한 크기(없으면 세로)로 만들어요. 1024×1024를 넘거나 스텝이 28을 넘으면 Anlas가 들어요."),
    h("div", { class: "sds-row" }, sizeSel, wh("w", cur.width), h("span", { style: "color:var(--rb-sub)" }, "×"), wh("h", cur.height))));

  // 캐릭터 프롬프트 · 샘플링/모델 · 바이브 · 레퍼런스
  const m = modelOf(s.sampling.model);
  const nChars = s.chars.filter((x) => x.on && x.prompt.trim()).length;
  els.push(h("div", { class: "sds-row" },
    h("button", { type: "button", class: "sds-bar", id: "sds-chars", onClick: () => S.dlg.charPrompts() }, h("span", { class: "t" }, "캐릭터 프롬프트"), h("small", null, nChars ? `${nChars}명` : "")),
    ib("person", "캐릭터 프롬프트 편집", () => S.dlg.charPrompts()), ib("puzzle", "조각 모음", () => S.dlg.pieces())));
  els.push(h("button", { type: "button", class: "sds-bar", id: "sds-sampling", onClick: () => S.dlg.sampling() }, h("span", { class: "t" }, "샘플링/모델 설정"), h("small", null, `${m.label} · ${s.sampling.steps}스텝`), ico("chevR", 16)));
  const vOn = s.vibes.filter((v) => v.on).length;
  els.push(h("button", { type: "button", class: "sds-bar fill", id: "sds-vibe", disabled: false, onClick: () => S.dlg.vibes() }, h("span", { class: "t" }, "바이브 이미지"), h("small", null, m.vibe ? (s.vibes.length ? `${vOn}/${s.vibes.length} 켜짐` : "") : "V5는 못 써요")));
  const rOn = s.refs.filter((r) => r.on).length;
  els.push(h("div", { class: "sds-row", style: "gap:10px" },
    h("span", { style: "font-size:13px;font-weight:800;white-space:nowrap" }, "레퍼런스 설정: ", h("span", { style: "color:var(--rb-acc-text)" }, `(${rOn}/2 활성화)`)),
    h("span", { class: "sds-in", style: "flex:1;display:flex;align-items:center;color:var(--rb-sub);font-size:13px;overflow:hidden;white-space:nowrap" }, rOn ? s.refs.filter((r) => r.on).map((r) => ({ character: "캐릭터", style: "그림체", "character&style": "캐릭터+그림체" }[r.type])).join(", ") : m.reference ? "활성화된 이미지 없음" : "V5는 못 써요"),
    h("button", { type: "button", class: "rb-btn primary sm", id: "sds-ref", onClick: () => S.dlg.refs() }, "편집")));
  replace(body, ...els);
}

export function leftHead(S) {
  return [
    h("div", { class: "sds-left-head" }, h("b", null, "프롬프트 에디터"), helpDot("이 봇(모듈)의 그림 설정이에요. 바뀐 내용은 바로 저장되고 Ctrl+Z로 되돌려요."), h("span", { style: "flex:1" }),
      h("button", { type: "button", class: "sds-ib", title: "접기", "aria-label": "프롬프트 에디터 접기", style: "border:0;background:none", onClick: () => S.toggleLeft(false) }, ico("chevL", 18))),
    h("div", { class: "sds-groups" },
      h("div", { class: "sds-group" }, h("small", null, "도구"), h("div", null,
        ib("puzzle", "조각 모음", () => S.dlg.pieces(), { id: "sds-pieces" }),
        ib("warn", "문제 확인(없는 조각·빈 프롬프트·Anlas)", () => S.dlg.check(), { id: "sds-check" }))),
      h("div", { class: "sds-group" }, h("small", null, "프리셋"), h("div", null,
        ib("save", "지금 설정을 프리셋으로 저장", () => S.dlg.savePreset(), { on: true, id: "sds-psave" }),
        ib("load", "프리셋 불러오기", (e) => S.dlg.loadPreset(e.currentTarget), { id: "sds-pload" }))))
  ];
}
