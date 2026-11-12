// 에셋 제작 — 대화상자들: 샘플링/모델, 캐릭터 프롬프트(NAI 다인), 조각 모음, 바이브 이미지, 레퍼런스, 프리셋, 작업 묶음 파일,
// 문제 확인, 도움말, 설정(토큰·기본 예약), 봇·모듈에 넣기, 폴더. 저장은 모두 S.set(사본)으로.
import { h, replace, download, pickFiles } from "../../dom.js";
import { btn, modal, segmented, confirmDialog, promptDialog, openMenu, switchEl as kitSwitch, setSwitch } from "../../kit.js";
// 스위치 옆에 이름을 보이게 하고, 누르면 모양부터 바로 바꾼다(kit 스위치는 스스로 안 바뀜)
function switchEl(on, { label, onChange, disabled } = {}) {
  const sw = kitSwitch(on, { label, disabled, onChange: (v, el) => { setSwitch(el, v); onChange?.(v, el); } });
  return h("label", { class: "sds-sw", style: "display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600" }, sw, label ? h("span", null, label) : null);
}

import { MODELS, modelOf, SAMPLER_KO, NOISE_SCHEDULES, QUALITY_KO, UC_KO, ucPresetsFor, normalizeSampling, ucPresetText, isFreeSize } from "../../../engine/sdstudio/nai.js";
import { buildPrompt, buildNegative, toPARR, combinationCount } from "../../../engine/sdstudio/prompt.js";
import * as P from "../../../engine/sdstudio/project.js";
import { promptArea, helpDot } from "./left.js";
import { ACTIONS, DEFAULT_KEYS, comboOf, rebind, keyLabel, isMacLike } from "../../../engine/sdstudio/keys.js";
import { templateFile } from "../../../engine/sdstudio/template.js";
import { ico } from "./look.js";
import { norm, fmtFreq } from "../../../engine/sdstudio/tags.js";

var dialog = (title, wide, ...kids) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title, style: `max-width:${wide ?? 520}px;max-height:calc(100vh - 32px);overflow:auto` }, h("h3", { class: "rb-h3" }, title), ...kids);
var shrinkless = (box) => { for (const el of box.children) el.style.flexShrink = "0"; return box; };
var field = (text, ...kids) => h("div", { style: "display:flex;flex-direction:column;gap:6px" }, h("span", { class: "rb-label" }, text), ...kids);
var num = (value, { min, max, step = 1, id, onChange }) => { const i = h("input", { type: "number", class: "rb-input", value: String(value), min, max, step, id, style: "width:110px" }); i.addEventListener("change", () => onChange(Number(i.value))); return i; };
var sel = (options, value, onChange, id) => h("select", { class: "rb-input", id, onChange: (e) => onChange(e.target.value) }, ...options.map(([v, t]) => h("option", { value: v, selected: v === value }, t)));

export function createDialogs(S) {
  const win = S.ctx.win;
  const setSampling = (patch) => { S.set(P.setSettings(S.proj, { sampling: normalizeSampling({ ...S.proj.settings.sampling, ...patch }) })); S.paintLeft(); };

  // 설명이 붙은 스위치
  const tog = (on, label, desc, onChange) => h("div", { style: "display:flex;flex-direction:column;gap:3px" }, switchEl(on, { label, onChange }), h("span", { class: "rb-muted", style: "font-size:12px;white-space:normal;line-height:1.5" }, desc));

  async function sampling() {
    const body = h("div", { style: "display:flex;flex-direction:column;gap:14px" });
    const paint = () => {
      const s = S.proj.settings.sampling, m = modelOf(s.model);
      const free = isFreeSize(832, 1216, s.steps);
      replace(body,
        field("모델", sel(MODELS.map((x) => [x.id, x.label]), s.model, (v) => { setSampling({ model: v }); paint(); }, "sds-model")),
        field("샘플러", m.fixed ? h("span", { class: "rb-muted" }, `${SAMPLER_KO[m.fixed.sampler]} (이 모델은 고정)`) : sel(m.samplers.map((x) => [x, SAMPLER_KO[x]]), s.sampler, (v) => { setSampling({ sampler: v }); paint(); }, "sds-sampler")),
        h("div", { style: "display:flex;gap:14px;flex-wrap:wrap" },
          field("스텝", m.fixed ? h("span", { class: "rb-muted" }, `${m.fixed.steps} (고정)`) : num(s.steps, { min: 1, max: m.maxSteps ?? 50, id: "sds-steps", onChange: (v) => { setSampling({ steps: v }); paint(); } })),
          field("프롬프트 가이던스", num(s.scale, { min: 0, max: m.maxScale ?? 10, step: 0.1, id: "sds-scale", onChange: (v) => setSampling({ scale: v }) })),
          m.noCfgRescale ? null : field("CFG 리스케일", num(s.cfgRescale, { min: 0, max: 1, step: 0.02, onChange: (v) => setSampling({ cfgRescale: v }) }))),
        free ? h("span", { class: "rb-muted", style: "white-space:normal" }, "28스텝 이하·1024×1024 이하면 Opus 무료예요.") : h("span", { style: "color:var(--rb-warn);font-size:13px;white-space:normal" }, "28스텝을 넘으면 Anlas가 들어요."),
        field("노이즈 스케줄", m.v5 ? h("span", { class: "rb-muted" }, "karras (V5는 고정)") : sel(NOISE_SCHEDULES.map((x) => [x, x]), s.noise, (v) => setSampling({ noise: v }))),
        field("품질 태그", m.v5 ? segmented(Object.entries(QUALITY_KO), s.quality, (v) => setSampling({ quality: v }), "품질 태그") : segmented([["standard", "켬"], ["none", "끔"]], s.quality === "none" ? "none" : "standard", (v) => setSampling({ quality: v }), "품질 태그")),
        field("네거티브 프리셋", sel(ucPresetsFor(s.model).map((k) => [k, UC_KO[k]]), s.ucPreset, (v) => { setSampling({ ucPreset: v }); paint(); }, "sds-ucpreset"),
          ucPresetText(s.model, s.ucPreset) ? h("span", { class: "rb-muted", style: "white-space:normal;font-size:12px" }, ucPresetText(s.model, s.ucPreset)) : null),
        m.varietyPlus ? tog(s.varietyPlus, "Variety+ (구도 다양하게)", "초반 단계의 가이던스를 줄여서 같은 프롬프트도 구도·표정이 더 다양하게 나와요. 결과가 너무 비슷할 때 켜요.", (v) => setSampling({ varietyPlus: v })) : null,
        m.transparent ? tog(s.transparent, "투명 배경", "배경을 투명하게 그려 달라고 요청하고 ‘transparent background’ 태그를 붙여요. 누끼가 필요한 에셋에 써요.", (v) => setSampling({ transparent: v })) : null,
        tog(s.useCoords, "캐릭터 위치 쓰기", "캐릭터 프롬프트에서 정한 자리(가운데·왼쪽·오른쪽…)를 모델에 알려요. 끄면 자리는 모델이 알아서 정해요. 캐릭터 프롬프트를 쓸 때만 뜻이 있어요.", (v) => setSampling({ useCoords: v })),
        (m.v5 && !m.vibe) ? null : h("details", { style: "border:1px solid var(--rb-line2);border-radius:var(--rb-r2);padding:8px 12px" },
          h("summary", { style: "cursor:pointer;font-weight:700;font-size:13px" }, "고급 (거의 안 건드려요)"),
          h("div", { style: "display:flex;flex-direction:column;gap:12px;margin-top:10px" },
            m.v5 ? null : tog(s.legacyUc, "옛 네거티브 방식(legacy UC)", "네거티브 프롬프트를 예전 방식으로 처리해요. 예전에 그린 그림을 똑같이 다시 뽑고 싶을 때만 켜요.", (v) => setSampling({ legacyUc: v })),
            m.vibe ? tog(s.normalizeVibes, "바이브 세기 합을 1로 맞추기", "바이브를 여러 장 쓸 때 세기를 합이 1이 되게 나눠요. 끄면 각 바이브의 세기가 그대로 들어가요.", (v) => setSampling({ normalizeVibes: v })) : null)));
      shrinkless(body);
    };
    paint();
    await modal(win, (done) => dialog("샘플링/모델 설정", 520, body, h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(true) }))));
    S.paintLeft();
  }

  async function charPrompts() {
    const body = h("div", { style: "display:flex;flex-direction:column;gap:12px" });
    const upd = (list) => { S.set(P.setSettings(S.proj, { chars: list })); };
    const paint = () => {
      const s = S.proj.settings, m = modelOf(s.sampling.model), list = s.chars;
      replace(body,
        h("span", { class: "rb-muted", style: "white-space:normal" }, "한 그림에 여러 인물을 그릴 때 인물마다 프롬프트를 따로 적어요(NAI 캐릭터 프롬프트). 위치를 쓰려면 샘플링 설정에서 ‘캐릭터 위치 쓰기’를 켜요."),
        ...list.map((c, i) => {
          const setC = (patch) => upd(S.proj.settings.chars.map((x, k) => (k === i ? { ...x, ...patch } : x)));
          const posSel = s.sampling.useCoords ? sel([0.1, 0.3, 0.5, 0.7, 0.9].flatMap((y) => [0.1, 0.3, 0.5, 0.7, 0.9].map((x) => [`${x},${y}`, `${"ABCDE"[Math.round((x - 0.1) / 0.2)]}${Math.round((y - 0.1) / 0.2) + 1}`])), `${c.x},${c.y}`, (v) => { const [x, y] = v.split(",").map(Number); setC({ x, y }); }) : null;
          return h("div", { class: "rb-card", style: "padding:12px;display:flex;flex-direction:column;gap:8px;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2)" },
            h("div", { style: "display:flex;align-items:center;gap:8px" }, h("b", { style: "flex:1" }, `캐릭터 ${i + 1}`), posSel,
              switchEl(c.on, { label: "켜기", onChange: (v) => setC({ on: v }) }),
              btn("", { size: "sm", kind: "ghost", icon: "trash", title: "지우기", onClick: () => { upd(S.proj.settings.chars.filter((_, k) => k !== i)); paint(); } })),
            promptArea({ value: c.prompt, rows: 3, placeholder: "예: girl, cat ears, black hoodie", label: `캐릭터 ${i + 1} 프롬프트`, onInput: (v) => setC({ prompt: v }) }),
            h("input", { class: "rb-input", value: c.uc, placeholder: "이 인물 네거티브(선택)", onChange: (e) => setC({ uc: e.target.value }) }));
        }),
        btn("캐릭터 더하기", { icon: "plus", id: "sds-char-add", disabled: list.length >= (m.maxChars ?? 6), onClick: () => { upd([...S.proj.settings.chars, { id: Math.random().toString(36).slice(2, 10), prompt: "", uc: "", x: 0.5, y: 0.5, on: true }]); paint(); } }));
      shrinkless(body);
    };
    paint();
    await modal(win, (done) => dialog("캐릭터 프롬프트", 560, body, h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(true) }))));
    S.paintLeft();
  }

  async function pieces() {
    let libI = 0;
    const left = h("div", { style: "display:flex;flex-direction:column;gap:6px;min-width:150px" });
    const right = h("div", { style: "flex:1;min-width:0;display:flex;flex-direction:column;gap:10px" });
    const clean = (s) => String(s ?? "").replace(/[.<>,\s]/g, "").slice(0, 40);
    const upd = (libs) => S.set({ ...S.proj, pieces: libs });
    const paint = () => {
      const libs = S.proj.pieces;
      if (libI >= libs.length) libI = Math.max(0, libs.length - 1);
      replace(left, ...libs.map((l, i) => h("button", { type: "button", class: "rb-chip", "aria-pressed": i === libI ? "true" : "false", onClick: () => { libI = i; paint(); } }, `${l.name} ${l.pieces.length}`)),
        btn("모음 더하기", { size: "sm", icon: "plus", id: "sds-lib-add", onClick: async () => { const n = clean(await promptDialog(win, { title: "조각 모음 이름", label: "이름(점·꺾쇠·쉼표·띄어쓰기 없이)", placeholder: "예: 옷" })); if (!n || libs.some((l) => l.name === n)) return; upd([...S.proj.pieces, { name: n, pieces: [] }]); libI = S.proj.pieces.length - 1; paint(); } }));
      const lib = libs[libI];
      if (!lib) { replace(right, h("span", { class: "rb-muted", style: "white-space:normal" }, "조각은 자주 쓰는 프롬프트 묶음이에요. 프롬프트에 <모음.조각>으로 넣으면 펼쳐져요. ‘여러 줄’ 조각은 줄 하나를 무작위로 골라요.")); return; }
      const setLib = (patch) => upd(S.proj.pieces.map((l, i) => (i === libI ? { ...l, ...patch } : l)));
      replace(right,
        h("div", { style: "display:flex;gap:8px;align-items:center" }, h("b", { style: "flex:1" }, `<${lib.name}.…>`),
          btn("모음 지우기", { size: "sm", kind: "danger", onClick: async () => { if (await confirmDialog(win, { title: `‘${lib.name}’ 모음을 지울까요?`, body: "이 모음을 부르는 프롬프트는 오류가 나요.", ok: "지우기", danger: true })) { upd(S.proj.pieces.filter((_, i) => i !== libI)); paint(); } } })),
        ...lib.pieces.map((pc, k) => {
          const setPc = (patch) => setLib({ pieces: S.proj.pieces[libI].pieces.map((x, j) => (j === k ? { ...x, ...patch } : x)) });
          return h("div", { style: "display:flex;flex-direction:column;gap:6px;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);padding:10px" },
            h("div", { style: "display:flex;gap:8px;align-items:center" },
              h("input", { class: "rb-input", value: pc.name, style: "flex:1", "aria-label": "조각 이름", onChange: (e) => { const n = clean(e.target.value); if (n) setPc({ name: n }); paint(); } }),
              switchEl(pc.multi, { label: "여러 줄", onChange: (v) => setPc({ multi: v }) }),
              btn("", { size: "sm", kind: "ghost", icon: "trash", title: "조각 지우기", onClick: () => { setLib({ pieces: S.proj.pieces[libI].pieces.filter((_, j) => j !== k) }); paint(); } })),
            promptArea({ value: pc.prompt, rows: 3, label: `조각 ${pc.name}`, onInput: (v) => setPc({ prompt: v }) }));
        }),
        btn("조각 더하기", { icon: "plus", id: "sds-piece-add", onClick: () => { let n = "조각"; for (let i = 2; lib.pieces.some((x) => x.name === n); i++) n = `조각${i}`; setLib({ pieces: [...lib.pieces, { name: n, prompt: "", multi: false }] }); paint(); } }));
      shrinkless(right);
    };
    paint();
    await modal(win, (done) => dialog("조각 모음", 760, h("div", { style: "display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start" }, left, right), h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(true) }))));
    S.paintLeft();
  }

  // 바이브·레퍼런스 그림은 호스트 에셋으로 저장하고 경로만 기억
  async function pickImage() {
    const [f] = await pickFiles({ accept: "image/png,image/jpeg,image/webp" });
    if (!f) return null;
    const bytes = new Uint8Array(await f.arrayBuffer());
    const path = await S.sd.saveAsset(bytes);
    S.remember(path, bytes);
    return path;
  }
  async function vibes() {
    const body = h("div", { style: "display:flex;flex-direction:column;gap:12px" });
    const upd = (list) => S.set(P.setSettings(S.proj, { vibes: list }));
    const paint = () => {
      const s = S.proj.settings, m = modelOf(s.sampling.model);
      replace(body,
        m.vibe ? h("span", { class: "rb-muted", style: "white-space:normal" }, "그림의 분위기·그림체를 따라 그려요. 처음 쓰는 그림(또는 정보량을 바꾼 그림)은 NovelAI가 한 번 분석해요(Anlas 2).") : h("div", { class: "rb-note warn", style: "white-space:normal" }, "V5 모델은 바이브를 쓸 수 없어요. 샘플링/모델 설정에서 V4.5·V4를 고르면 켜져요."),
        h("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px" }, ...s.vibes.map((v, i) => {
          const setV = (patch) => upd(S.proj.settings.vibes.map((x, k) => (k === i ? { ...x, ...patch } : x)));
          return h("div", { style: "display:flex;flex-direction:column;gap:6px;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);padding:8px" },
            h("div", { class: "sds-card", style: "aspect-ratio:1/1;cursor:default" }, S.thumb(v.path, { now: true })),
            switchEl(v.on, { label: "켜기", onChange: (x) => setV({ on: x }) }),
            h("label", { class: "rb-muted", style: "font-size:12px" }, `세기 ${v.strength.toFixed(2)}`), h("input", { type: "range", min: 0, max: 1, step: 0.01, value: v.strength, onChange: (e) => { setV({ strength: Number(e.target.value) }); paint(); } }),
            h("label", { class: "rb-muted", style: "font-size:12px" }, `정보량 ${v.info.toFixed(2)}`), h("input", { type: "range", min: 0.01, max: 1, step: 0.01, value: v.info, onChange: (e) => { setV({ info: Number(e.target.value), enc: null }); paint(); } }),
            btn("빼기", { size: "sm", kind: "ghost", icon: "trash", onClick: () => { upd(S.proj.settings.vibes.filter((_, k) => k !== i)); paint(); } }));
        })),
        btn("그림 더하기", { icon: "plus", id: "sds-vibe-add", onClick: async () => { try { const path = await pickImage(); if (path) { upd([...S.proj.settings.vibes, { id: Math.random().toString(36).slice(2, 10), path, strength: 0.6, info: 1, on: true, enc: null }]); paint(); } } catch (e) { S.toast(e?.message ?? String(e), { error: true }); } } }));
      shrinkless(body);
    };
    paint();
    await modal(win, (done) => dialog("바이브 이미지", 640, body, h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(true) }))));
    S.paintLeft();
  }
  async function refs() {
    const body = h("div", { style: "display:flex;flex-direction:column;gap:12px" });
    const upd = (list) => S.set(P.setSettings(S.proj, { refs: list }));
    const paint = () => {
      const s = S.proj.settings, m = modelOf(s.sampling.model);
      replace(body,
        m.reference ? h("span", { class: "rb-muted", style: "white-space:normal" }, "고른 그림의 캐릭터·그림체를 따라 그려요(캐릭터 레퍼런스, 최대 2장). 장당 Anlas가 들 수 있어요.") : h("div", { class: "rb-note warn", style: "white-space:normal" }, "V5 모델은 레퍼런스를 쓸 수 없어요. V4.5를 골라 주세요."),
        ...s.refs.map((r, i) => {
          const setR = (patch) => upd(S.proj.settings.refs.map((x, k) => (k === i ? { ...x, ...patch } : x)));
          return h("div", { style: "display:flex;gap:12px;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);padding:10px;align-items:flex-start" },
            h("div", { class: "sds-card", style: "width:110px;cursor:default;flex-shrink:0" }, S.thumb(r.path, { now: true })),
            h("div", { style: "flex:1;display:flex;flex-direction:column;gap:8px" },
              segmented([["character", "캐릭터"], ["style", "그림체"], ["character&style", "둘 다"]], r.type, (v) => setR({ type: v }), "레퍼런스 종류"),
              h("label", { class: "rb-muted", style: "font-size:12px" }, `세기 ${r.strength.toFixed(2)}`), h("input", { type: "range", min: 0, max: 1, step: 0.01, value: r.strength, onChange: (e) => { setR({ strength: Number(e.target.value) }); paint(); } }),
              h("label", { class: "rb-muted", style: "font-size:12px" }, `충실도 ${r.fidelity.toFixed(2)}`), h("input", { type: "range", min: 0, max: 1, step: 0.01, value: r.fidelity, onChange: (e) => { setR({ fidelity: Number(e.target.value) }); paint(); } }),
              h("div", { style: "display:flex;gap:8px" }, switchEl(r.on, { label: "켜기", onChange: (v) => setR({ on: v }) }), btn("빼기", { size: "sm", kind: "ghost", icon: "trash", onClick: () => { upd(S.proj.settings.refs.filter((_, k) => k !== i)); paint(); } }))));
        }),
        btn("그림 더하기", { icon: "plus", id: "sds-ref-add", disabled: s.refs.length >= 2, onClick: async () => { try { const path = await pickImage(); if (path) { upd([...S.proj.settings.refs, { id: Math.random().toString(36).slice(2, 10), path, strength: 0.6, fidelity: 1, type: "character&style", on: true }]); paint(); } } catch (e) { S.toast(e?.message ?? String(e), { error: true }); } } }));
      shrinkless(body);
    };
    paint();
    await modal(win, (done) => dialog("레퍼런스 설정", 560, body, h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(true) }))));
    S.paintLeft();
  }

  // ── 프리셋(봇과 상관없이 이 기기 전체) ──
  const PRESET_KEYS = ["top", "back", "neg", "sampling", "size", "seed", "chars"];
  async function savePreset() {
    const name = await promptDialog(win, { title: "프리셋 저장", label: "이름", placeholder: "예: 하얀 배경 고양이 화풍" });
    if (!name?.trim()) return;
    const list = (await S.sd.loadPresets()).filter((x) => x.name !== name.trim());
    const s = S.proj.settings;
    await S.sd.savePresets([...list, { name: name.trim(), at: Date.now(), settings: Object.fromEntries(PRESET_KEYS.map((k) => [k, structuredClone(s[k])])) }]);
    S.toast(`프리셋 ‘${name.trim()}’을 저장했어요`);
  }
  async function loadPreset(anchor) {
    const list = await S.sd.loadPresets();
    if (!list.length) { S.toast("저장한 프리셋이 없어요. 왼쪽 위 저장 버튼으로 만들어요."); return; }
    openMenu(win, anchor, [
      ...list.map((p) => ({ label: p.name, icon: "preset", onClick: async () => {
        if (!await confirmDialog(win, { title: `‘${p.name}’을 불러올까요?`, body: "상위·하위·네거티브 프롬프트와 시드·크기·샘플링·캐릭터 프롬프트가 바뀌어요. 캐릭터·씬·그림은 그대로예요.", ok: "불러오기" })) return;
        S.set(P.normalizeProject({ ...S.proj, settings: { ...S.proj.settings, ...p.settings } })); S.paint(); S.toast(`‘${p.name}’을 불러왔어요`);
      } })),
      "sep",
      { label: "프리셋 지우기…", icon: "trash", danger: true, onClick: async () => {
        const n = await promptDialog(win, { title: "지울 프리셋 이름", label: `있는 것: ${list.map((x) => x.name).join(", ")}` });
        if (!n) return;
        await S.sd.savePresets(list.filter((x) => x.name !== n.trim())); S.toast("지웠어요");
      } }
    ]);
  }

  async function check() {
    const out = [], pr = S.proj, s = pr.settings;
    if (!(await S.sd.getToken())) out.push(["warn", "NovelAI 토큰이 없어요. 설정(톱니)에서 넣어요."]);
    for (const c of pr.chars) for (const sc of c.scenes) {
      if (!combinationCount(sc.slots)) { out.push(["warn", `${c.name} › ${sc.name}: 켜진 조각이 없는 슬롯이 있어 그릴 수 없어요.`]); continue; }
      try { const pmt = buildPrompt({ top: s.top, own: P.ownPrompt(pr, c), middle: P.middleFor(sc, 0), back: s.back }, pr.pieces); if (!toPARR(pmt).length) out.push(["warn", `${c.name} › ${sc.name}: 프롬프트가 비었어요.`]); }
      catch (e) { out.push(["err", `${c.name} › ${sc.name}: ${e.message}`]); }
    }
    try { buildNegative(s.neg, pr.pieces); } catch (e) { out.push(["err", `네거티브: ${e.message}`]); }
    const big = pr.chars.flatMap((c) => c.scenes.map((sc) => [c, sc, P.sizeFor(s.size, sc)])).filter(([, , z]) => !isFreeSize(z.width, z.height, s.sampling.steps));
    if (big.length) out.push(["info", `Anlas가 드는 크기·스텝인 씬 ${big.length}개(1024×1024·28스텝 넘음).`]);
    await modal(win, (done) => dialog("문제 확인", 560,
      out.length ? h("div", { style: "display:flex;flex-direction:column;gap:6px" }, ...out.map(([k, t]) => h("div", { class: `rb-note ${k}`, style: "white-space:normal" }, t))) : h("div", { class: "rb-note info" }, "문제가 없어요."),
      h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(true) }))));
  }

  async function help() {
    const sec = (t, ...ps) => h("div", null, h("b", null, t), ...ps.map((p) => h("p", { style: "margin:4px 0 0;white-space:normal;color:var(--rb-sub)" }, p)));
    await modal(win, (done) => dialog("에셋 제작 도움말", 620,
      sec("흐름", "캐릭터 카드를 만들고 → 캐릭터를 열어 씬(표정·포즈)을 만들고 → 씬마다 예약하고 → 위 ‘생성’을 누르면 차례로 그려요. 고른 그림을 봇의 감정 이미지·추가 에셋(모듈은 모듈 에셋)으로 넣어요."),
      sec("프롬프트", "최종 = 상위 + 외형 + 씬 조합 + 하위. 상위에 | 를 넣으면 그 자리에 씬 조합이 들어가요. ##주석##은 지워지고, {a|b}는 하나를 골라요. <모음.조각>은 조각 모음에서 펼쳐요."),
      sec("씬 조합", "씬은 슬롯(열) 여러 개로 되어 있고 슬롯마다 켜진 조각 하나씩 골라 조합해요. 예약 1장 = 조합 전부를 한 장씩."),
      sec("모드", "씬 모드: 카드로 보기 · 갤러리 모드: 모든 그림 · 검색 모드: 이름·프롬프트 찾기 · 비교 모드: 그림 여러 장 나란히 · 동시편집: 여러 씬 프롬프트를 한 번에."),
      sec("그림", "그림을 누르면 크게 보고, 즐겨찾기·대표·변형·인페인트·업스케일·디렉터 도구(배경 지우기 등)를 써요. 이미지 월드컵으로 순위를 매기면 1위가 대표가 돼요."),
      sec("폴더", "캐릭터·소속으로 캐릭터를 묶어요. 폴더 안에 폴더, 한 캐릭터를 여러 폴더에 넣을 수 있어요. 카드를 고른 뒤 ‘폴더에 넣기’나 카드 메뉴로 넣어요."),
      sec("보낼 그림 고르기·바로 넣기", `그림 카드 왼쪽 위 체크(또는 ${isMacLike() ? "⌘" : "Ctrl"}+클릭)로 보낼 그림을 골라요. 고른 것은 씬을 옮기거나 다시 열어도 남고, 씬 카드에 ✓수로 보여요. ‘고른 그림 바로 넣기’(${S.keyLabel("put")})를 누르면 고른 그림만 씬 이름으로 봇에 들어가요. 자리·형식(WebP·AVIF)·같은 이름 처리는 설정에서, 알림의 ‘되돌리기’로 바로 취소해요.`),
      sec("템플릿", "씬 구성을 템플릿으로 저장하고 다른 캐릭터에 적용해요. SDStudio 씬 템플릿 파일(.json)도 가져와요. 맨 위에서 적용하면 모든 캐릭터, 폴더 안에서는 그 폴더의 캐릭터, 캐릭터 안에서는 그 캐릭터에 들어가요. 씬이 이미 있으면 합칠지 바꿀지 골라요."),
      sec("되돌리기·단축키", `${S.keyLabel("undo")} 되돌리기, ${S.keyLabel("redo")} 다시하기(봇에 넣은 것은 알림의 되돌리기로). 단축키는 설정 → 단축키 설정에서 바꿔요. 맥은 ⌘ 기준이에요.`),
      sec("부스트 모드", "설정에서 켜고 토큰을 여러 개 넣으면 동시에 그려요. 한 기기에서 여러 계정을 쓰면 NovelAI 제재 대상이 될 수 있어요."),
      sec("씬 세트(SFW·NSFW·+)", "도구 줄 ‘보기’ 아래 버튼으로 세트를 바꿔요. 폴더 구조는 모든 세트가 함께 쓰고, 캐릭터 카드·그림은 세트마다 따로예요. 세트마다 씬 프리셋(저장된 씬 템플릿, 리스 전체에서 공유)을 정해 두면 새 캐릭터가 그 씬으로 시작해요. 봇 데이터는 넣기 전까지 안 바뀌어요. 우클릭으로 이름·프리셋·지우기."),
      sec("로어북 연동", "설정에서 켜면(기본 끔) 폴더가 봇·모듈 로어북 폴더로 만들어지고, 로어북에서 만든 Dusk 폴더·[소속] 폴더도 여기로 가져와요. 지우기는 어느 쪽으로도 전해지지 않아요."),
      sec("저장", "그림은 만들자마자 리스 에셋 저장소에 저장되고, 이 화면 목록에서 빼도 저장소 파일은 남아요. 작업 묶음은 봇·모듈마다 따로 저장돼요."),
      h("div", { class: "btns" }, btn("튜토리얼 다시 보기", { kind: "ghost", id: "sds-help-tut", onClick: () => { done(true); setTimeout(() => tutorial(), 0); } }), btn("닫기", { kind: "primary", onClick: () => done(true) }))));
  }

  // 처음 열 때(그리고 도움말에서) 보는 튜토리얼. 단계: 로어북 연동 → SDStudio 백업 → 씬 프리셋 → 저장·백업
  async function tutorial() {
    const pf = await S.sd.getPrefs();
    const p = (t) => h("p", { style: "margin:6px 0 0;white-space:normal;color:var(--rb-sub)" }, t);
    const act = (label, id, fn) => btn(label, { size: "sm", id, onClick: fn });
    const pages = [
      () => [h("b", null, "1. 로어북 연동"), p("폴더(캐릭터·소속)를 봇·모듈 로어북 폴더로도 만들고, 로어북에서 만든 Dusk 폴더·[소속] 폴더를 여기로 가져와요. 지우기는 양쪽 다 전해지지 않아요. 나중에 설정에서 바꿀 수 있어요."),
        segmented([["off", "끄기(기본)"], ["on", "켜기"]], pf.loreSync ? "on" : "off", async (v) => { const on = v === "on"; await S.sd.setPrefs({ loreSync: on }); S.prefs.loreSync = on; pf.loreSync = on; if (on) S.syncLore?.(); }, "로어북 연동")],
      () => [h("b", null, "2. 원본 SDStudio에서 옮겨 오기"), p("SDStudio의 백업(.tar)이나 프로젝트 .json을 가져오면 캐릭터·씬·조각 모음이 들어와요. 씬 템플릿 파일만 있다면 다음 단계에서 가져와요."),
        h("div", { class: "btns", style: "justify-content:flex-start" }, act("SDStudio 백업 가져오기…", "sds-tut-backup", () => S.tut?.importBackup?.()))],
      () => [h("b", null, "3. 씬 프리셋(SFW·NSFW)"), p("도구 줄 ‘보기’ 아래의 [SFW] [NSFW] [+]가 씬 세트예요. 세트마다 씬 프리셋(씬 템플릿)을 정해 두면 새 캐릭터가 그 씬으로 시작하고, 프리셋은 리스 전체에 저장돼 다른 봇에서도 써요. 폴더는 세트끼리 공유하고 캐릭터 카드는 세트마다 따로예요."),
        h("div", { class: "btns", style: "justify-content:flex-start;flex-wrap:wrap" }, act("씬 템플릿 파일 가져오기…", "sds-tut-tpl", () => S.tut?.importTemplate?.()),
          ...P.setsOf(S.proj).list.slice(0, 4).map((t) => act(`${t.name} 프리셋 고르기`, `sds-tut-set-${t.id}`, (e) => S.tut?.pickSetTpl?.(e.currentTarget, t.id))))],
      () => [h("b", null, "4. 저장과 백업"), p("작업은 플러그인 저장소·이 기기 사본·봇 안 사본에 함께 저장되고, 열 때 가장 최근 것을 써요. 봇 안 사본은 카드를 배포할 땐 방패 버튼으로 꺼요(코어 내보내기는 이 칸을 빼요)."),
        p("‘이미지·관리’의 zip은 그림만, ‘프로젝트 전체 백업’은 설정과 그림을 모두 담아요. 복원은 백업 가져오기로 해요.")]
    ];
    let i = 0;
    await modal(win, (done) => {
      const body = h("div", { id: "sds-tut-body" }), nav = h("div", { class: "btns" });
      const paint = () => {
        replace(body, ...pages[i]());
        replace(nav, h("span", { class: "rb-muted", style: "margin-right:auto" }, `${i + 1} / ${pages.length}`),
          i ? btn("이전", { kind: "ghost", onClick: () => { i--; paint(); } }) : btn("건너뛰기", { kind: "ghost", id: "sds-tut-skip", onClick: () => done(true) }),
          i < pages.length - 1 ? btn("다음", { kind: "primary", id: "sds-tut-next", onClick: () => { i++; paint(); } }) : btn("시작하기", { kind: "primary", id: "sds-tut-done", onClick: () => done(true) }));
      };
      paint();
      return dialog("에셋 제작 시작하기", 560, body, nav);
    });
    await S.sd.setPrefs({ tutorialDone: true }); S.prefs.tutorialDone = true;
  }

  async function token({ force = false } = {}) {
    if (!force && (await S.sd.getToken())) return true;
    const input = h("input", { type: "password", class: "rb-input", placeholder: "pst-…", autocomplete: "off", id: "sds-token", "data-autofocus": "" });
    const ok = await modal(win, (done) => {
      input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) done(true); });
      return dialog("NovelAI 토큰", 460, h("span", { class: "rb-muted", style: "white-space:normal" }, "NovelAI → 계정 설정 → 영구 API 토큰(pst-…)을 넣어요. 이 기기에만 저장되고 다른 곳으로 보내지 않아요."), input,
        h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(false) }), btn("저장", { kind: "primary", id: "sds-token-ok", onClick: () => input.value.trim() && done(true) })));
    });
    if (ok && input.value.trim()) { await S.sd.setToken(input.value.trim()); return true; }
    return false;
  }
  async function settings() {
    const pf = await S.sd.getPrefs();
    const has = !!(await S.sd.getToken());
    const slots = S.target.kind === "module" ? [["assets", "모듈 에셋"]] : [["additionalAssets", "추가 에셋"], ["emotionImages", "감정 이미지"]];
    const ql = h("span", { class: "rb-muted" }, `품질 ${Math.round(pf.putQuality * 100)}`);
    const tokensBox = h("div", { style: "display:flex;flex-direction:column;gap:6px" });
    const paintTokens = async () => {
      const list = await S.sd.getTokens();
      replace(tokensBox, ...list.map((t, i) => h("div", { style: "display:flex;gap:8px;align-items:center" }, h("span", { style: "flex:1" }, `${t.label || `토큰 ${i + 1}`} · …${t.token.slice(-4)}`),
        btn("빼기", { size: "sm", kind: "ghost", onClick: async () => { await S.sd.setTokens(list.filter((_, k) => k !== i)); paintTokens(); } }))),
        btn("토큰 더하기", { size: "sm", icon: "plus", id: "sds-token-add", onClick: async () => { const t = await askToken("부스트 모드 토큰 더하기"); if (t) { await S.sd.setTokens([...list, { label: `계정 ${list.length + 1}`, token: t }]); paintTokens(); } } }));
    };
    paintTokens();
    const boostSw = h("div", { id: "sds-boost" });
    const paintBoost = () => replace(boostSw, segmented([["off", "끔"], ["on", "켬"]], S.prefs.boost ? "on" : "off", async (v) => {
      const on = v === "on";
      if (on && !await confirmDialog(win, { title: "부스트 모드를 켤까요?", body: "한 기기에서 여러 NovelAI 계정으로 동시에 그리는 것은 NovelAI 정책상 제재·계정 정지 대상이 될 수 있어요. 모든 책임은 사용하는 사람에게 있어요(SDStudio 원본 안내와 같음).", ok: "알고 켜기", danger: true })) { paintBoost(); return; }
      await S.sd.setPrefs({ boost: on }); S.prefs.boost = on; S.paintTop(); paintBoost();
    }, "부스트 모드"));
    paintBoost();
    await modal(win, (done) => dialog("설정", 560,
      field("NovelAI 토큰", h("div", { style: "display:flex;gap:8px;align-items:center" }, h("span", { class: "rb-muted", style: "flex:1" }, has ? "저장됨(이 기기)" : "없음"), btn(has ? "바꾸기" : "넣기", { size: "sm", onClick: () => { done(true); token({ force: true }); } }))),
      h("b", null, "태그 자동완성"),
      h("div", { style: "display:flex;flex-direction:column;gap:8px" },
        switchEl(!!pf.loreSync, { label: "폴더를 봇·모듈 로어북에도 만들기(이름·위치 따라감, 지워도 로어북은 남음)", onChange: async (v) => { await S.sd.setPrefs({ loreSync: v }); S.prefs.loreSync = v; if (v) S.syncLore?.(); } }),
        switchEl(pf.tags !== false, { label: "프롬프트 칸에서 태그 자동완성", onChange: async (v) => { await S.sd.setPrefs({ tags: v }); S.prefs.tags = v; } }),
        h("span", { class: "rb-muted", style: "font-size:12px;white-space:normal" }, `${S.sd.tags() ? `사전 ${S.sd.tags().size.toLocaleString()}개 있음` : "사전 없음 — 프롬프트를 칠 때 받기를 권해요(약 2MB, 처음 한 번)"} · 두 글자부터 · ↑↓로 고르고 Enter·Tab으로 넣기 · 한글(예: 긴 머리)로도 찾아요. 사전: SDStudio(MIT).`),
        h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
          btn("지금 받기", { size: "sm", id: "sds-tags-dl", onClick: async () => { try { const db = await S.sd.loadTags(); S.toast(`태그 ${db.size.toLocaleString()}개`); } catch (e) { S.toast(e?.message ?? String(e), { error: true }); } } }),
          btn("파일에서 불러오기(.csv/.csv.gz)", { size: "sm", onClick: async () => { const [f] = await pickFiles({ accept: ".csv,.gz,text/csv,application/gzip" }); if (!f) return; try { const db = await S.sd.loadTagsFromBytes(new Uint8Array(await f.arrayBuffer())); S.toast(`태그 ${db.size.toLocaleString()}개를 불러왔어요`); } catch (e) { S.toast(`불러오지 못했어요: ${e?.message ?? e}`, { error: true }); } } }))),
      h("b", null, "봇에 넣기"),
      slots.length > 1 ? field("바로 넣을 자리", segmented(slots, pf.putSlot || slots[0][0], async (v) => { await S.sd.setPrefs({ putSlot: v }); S.prefs.putSlot = v; }, "바로 넣을 자리")) : null,
      field("넣을 때 형식(용량 줄이기)", segmented([["png", "원본 PNG"], ["webp", "WebP"], ["avif", "AVIF"]], pf.putFormat, async (v) => { await S.sd.setPrefs({ putFormat: v }); S.prefs.putFormat = v; }, "넣을 때 형식"),
        ql, h("input", { type: "range", min: 0.5, max: 1, step: 0.01, value: pf.putQuality, onInput: (e) => { ql.textContent = `품질 ${Math.round(e.target.value * 100)}`; }, onChange: async (e) => { const q = Number(e.target.value); await S.sd.setPrefs({ putQuality: q }); S.prefs.putQuality = q; } }),
        h("span", { class: "rb-muted", style: "white-space:normal;font-size:12px" }, "AVIF를 못 만드는 브라우저면 WebP로 넣어요. 바꾼 것이 더 크면 원본 그대로 넣어요.")),
      field("넣을 때 에셋 이름", segmented([["scene", "씬"], ["us", "폴더_캐릭터_씬.확장자"], ["dot", "폴더.캐릭터.씬.확장자"]], pf.nameStyle ?? "scene", async (v) => { await S.sd.setPrefs({ nameStyle: v }); S.prefs.nameStyle = v; }, "에셋 이름"),
        h("span", { class: "rb-muted", style: "white-space:normal;font-size:12px" }, "폴더 = 그 캐릭터가 든 캐릭터 폴더(없으면 첫 폴더, 폴더가 없으면 빼요). 예: 아비도스_호시노_smile.webp")),
      field("같은 이름이 이미 있으면", segmented([["number", "번호 붙여 더하기"], ["replace", "그림 바꾸기"]], pf.dup, async (v) => { await S.sd.setPrefs({ dup: v }); S.prefs.dup = v; }, "같은 이름")),
      h("b", null, "부스트 모드(여러 계정으로 동시에 그리기)"), boostSw,
      h("span", { class: "rb-muted", style: "white-space:normal;font-size:12px" }, "켜면 아래 토큰 수만큼(최대 4) 동시에 그려요. 토큰은 이 기기에만 저장돼요."), tokensBox,
      h("b", null, "그 밖"),
      field("‘모두 예약’ 장 수", num(S.proj.settings.reserveDefault, { min: 1, max: 20, id: "sds-rdef", onChange: (v) => { S.set(P.setSettings(S.proj, { reserveDefault: Math.max(1, Math.min(20, Math.round(v) || 1)) })); S.paintTools(); } })),
      btn("단축키 설정…", { icon: "zap", id: "sds-keys", onClick: () => { done(true); keysDialog(); } }),
      h("span", { class: "rb-muted", style: "white-space:normal" }, "그림은 만들 때 바로 리스 에셋 저장소에 저장돼요. 목록에서 빼도 파일은 남아요."),
      h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(true) }))));
  }
  async function askToken(title) {
    const input = h("input", { type: "password", class: "rb-input", placeholder: "pst-…", autocomplete: "off", "data-autofocus": "" });
    const ok = await modal(win, (done) => dialog(title, 440, input, h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(false) }), btn("더하기", { kind: "primary", onClick: () => input.value.trim() && done(true) }))));
    return ok ? input.value.trim() : "";
  }

  // 단축키: 줄을 누르고 새 키를 누르면 바뀜(겹치는 쪽은 비움)
  async function keysDialog() {
    let keys = { ...S.keys }, waiting = null;
    const body = h("div", { style: "display:grid;grid-template-columns:1fr auto;gap:6px 12px;align-items:center" });
    const paint = () => replace(body, ...Object.entries(ACTIONS).flatMap(([a, label]) => [h("span", null, label),
      h("button", { type: "button", class: "rb-chip", "aria-pressed": String(waiting === a), dataset: { action: a }, style: "min-width:120px;justify-content:center", onClick: () => { waiting = a; paint(); } }, waiting === a ? "키를 누르세요…" : keyLabel(keys[a]) || "없음")]));
    const onKey = (e) => {
      if (!waiting) return;
      e.preventDefault(); e.stopPropagation();
      if (e.key === "Escape") { waiting = null; paint(); return; }
      if (e.key === "Backspace" || e.key === "Delete") { keys = rebind(keys, waiting, ""); waiting = null; paint(); return; }
      const c = comboOf(e);
      if (!c) return;
      keys = rebind(keys, waiting, c); waiting = null; paint();
    };
    win.ownerDocument.addEventListener("keydown", onKey, true);
    paint();
    const ok = await modal(win, (done) => dialog("단축키 설정", 520, h("span", { class: "rb-muted", style: "white-space:normal" }, `줄을 누르고 새 키를 눌러요. 지우려면 Backspace. 다른 동작과 겹치면 그쪽은 비워져요.${isMacLike() ? " 맥은 ⌘가 주 보조키예요(⌃ Control·⌥ Option도 따로 쓸 수 있어요)." : ""}`), body,
      h("div", { class: "btns" }, btn("기본값", { kind: "ghost", onClick: () => { keys = { ...DEFAULT_KEYS }; paint(); } }), btn("취소", { kind: "ghost", onClick: () => done(false) }), btn("저장", { kind: "primary", id: "sds-keys-save", onClick: () => done(true) }))));
    win.ownerDocument.removeEventListener("keydown", onKey, true);
    if (ok) { S.keys = keys; await S.sd.setPrefs({ keys2: keys }); S.paintTools(); S.toast("단축키를 저장했어요"); }
  }

  // 템플릿: 이미 씬이 있는 캐릭터가 있으면 합칠지 바꿀지
  async function templateChoice(count, name) {
    let mode = "merge";
    desc.textContent = DESC.merge;
    return modal(win, (done) => dialog(`‘${name}’ 템플릿 적용`, 500,
      h("span", { class: "rb-muted", style: "white-space:normal" }, `씬이 이미 있는 캐릭터가 ${count}명이에요. 어떻게 할까요? (처음 상태인 캐릭터는 그냥 템플릿 씬으로 채워요)`),
      segmented([["merge", "합치기"], ["replace", "바꾸기"]], mode, (v) => { mode = v; desc.textContent = DESC[v]; }, "적용 방식"),
      desc,
      h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), btn("적용", { kind: "primary", id: "sds-tpl-ok", onClick: () => done(mode) }))));
  }
  var DESC = { merge: "있는 씬은 그대로 두고, 템플릿에만 있는 씬을 뒤에 더해요.", replace: "씬 목록을 템플릿대로 바꿔요. 이름이 같은 씬은 프롬프트만 바뀌고 그림은 남아요. 템플릿에 없는 씬은 빠져요(되돌리기 가능)." };
  var desc = h("span", { style: "white-space:normal;font-size:13px" }, DESC.merge);
  async function templateManager({ apply }) {
    const body = h("div", { style: "display:flex;flex-direction:column;gap:8px" });
    const paint = async () => {
      const list = await S.sd.loadTemplates();
      replace(body, ...(list.length ? list.map((t, i) => h("div", { style: "display:flex;gap:8px;align-items:center;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);padding:8px 10px" },
        h("div", { style: "flex:1;min-width:0;display:flex;flex-direction:column" }, h("b", null, t.name), h("span", { class: "rb-muted", style: "font-size:12px;white-space:normal" }, `씬 ${t.scenes.length}개 · ${t.scenes.slice(0, 6).map((x) => x.name).join(", ")}${t.scenes.length > 6 ? " …" : ""}`)),
        btn("적용", { size: "sm", kind: "primary", onClick: async () => { done?.(true); await apply(t); } }),
        btn("", { size: "sm", kind: "ghost", icon: "edit", title: "이름 바꾸기", onClick: async () => { const n = await promptDialog(win, { title: "템플릿 이름", label: "이름", value: t.name }); if (n?.trim()) { list[i] = { ...t, name: n.trim() }; await S.sd.saveTemplates(list); paint(); } } }),
        btn("", { size: "sm", kind: "ghost", icon: "download", title: "파일로 내보내기", onClick: () => download(`${t.name}.dusk-template.json`, templateFile(t), "application/json") }),
        btn("", { size: "sm", kind: "ghost", icon: "trash", title: "지우기", onClick: async () => { if (await confirmDialog(win, { title: `‘${t.name}’ 템플릿을 지울까요?`, ok: "지우기", danger: true })) { list.splice(i, 1); await S.sd.saveTemplates(list); paint(); } } })))
        : [h("span", { class: "rb-muted", style: "white-space:normal" }, "저장한 템플릿이 없어요. 캐릭터를 연 뒤 ‘씬을 템플릿으로 저장’하거나 SDStudio 씬 템플릿 파일을 가져와요.")]));
    };
    let done = null;
    await paint();
    await modal(win, (d) => { done = d; return dialog("템플릿 관리", 620, body, h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => d(true) }))); });
  }

  // 넣는 방법 고르기 → { slot, name(비우면 씬 이름), dup } | null
  async function put({ count }) {
    const slots = S.target.kind === "module" ? [["assets", "모듈 에셋"]] : [["additionalAssets", "추가 에셋"], ["emotionImages", "감정 이미지"]];
    let slot = slots.some((x) => x[0] === S.prefs.putSlot) ? S.prefs.putSlot : slots[0][0], dup = S.prefs.dup ?? "number";
    const nameIn = h("input", { class: "rb-input", id: "sds-put-name", placeholder: "비우면 씬 이름" });
    return modal(win, (done) => dialog(`고른 그림 ${count}장을 넣을까요?`, 480,
      h("span", { class: "rb-muted", style: "white-space:normal" }, `고른 그림만 넣어요. 형식은 설정대로(${{ png: "원본 PNG", webp: "WebP", avif: "AVIF" }[S.prefs.putFormat] ?? "WebP"}) 바꿔요.`),
      slots.length > 1 ? field("넣을 자리", segmented(slots, slot, (v) => { slot = v; }, "넣을 자리")) : null,
      field("이름", nameIn),
      field("같은 이름이 이미 있으면", segmented([["number", "번호 붙여 더하기"], ["replace", "그림 바꾸기"]], dup, (v) => { dup = v; }, "같은 이름")),
      h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), btn("넣기", { kind: "primary", id: "sds-put-ok", onClick: () => done({ slot, name: nameIn.value.trim(), dup }) }))));
  }

  // 내보내기 전에 확인: rows=[{ it, label, nameFor(slot) }], names={ slot: Set(소문자) } → { idx:[], slot, dup } | null
  async function exportPreview({ rows, names, title = "즐겨찾기를 봇에 넣기" }) {
    const slots = S.target.kind === "module" ? [["assets", "모듈 에셋"]] : [["additionalAssets", "추가 에셋"], ["emotionImages", "감정 이미지"]];
    let slot = slots.some((x) => x[0] === S.prefs.putSlot) ? S.prefs.putSlot : slots[0][0], dup = S.prefs.dup ?? "number";
    const on = rows.map(() => true), listEl = h("div", { class: "sds-exp-list", id: "sds-exp-list" }), sumEl = h("span", { class: "rb-muted", style: "white-space:normal;font-size:12.5px" });
    let okBtn = null;
    const statusOf = (r) => {
      const ex = names[slot] ?? new Set(), nm = r.nameFor(slot).toLowerCase();
      if (r.it.sent && ex.has(r.it.sent.toLowerCase())) return ["sent", "이미 넣음"];
      if (ex.has(nm)) return ["dup", dup === "replace" ? "바꿈" : "같은 이름 있음 → 번호"];
      return ["new", "새로"];
    };
    rows.forEach((r, i) => { if (statusOf(r)[0] === "sent") on[i] = false; });
    const paint = () => {
      const cnt = { new: 0, dup: 0, sent: 0 };
      replace(listEl, ...rows.map((r, i) => {
        const [k, t] = statusOf(r); if (on[i]) cnt[k]++;
        return h("label", { class: "sds-exp-row", dataset: { st: k } },
          h("input", { type: "checkbox", checked: on[i], "aria-label": `${r.nameFor(slot)} 넣기`, onChange: (e) => { on[i] = e.target.checked; paint(); } }),
          S.thumb(r.it.path, { now: true }),
          h("span", { class: "nm", title: r.nameFor(slot) }, r.nameFor(slot), h("small", { class: "rb-muted", style: "display:block;font-weight:500" }, r.label)),
          h("span", { class: ["st", k] }, t));
      }));
      const n = on.filter(Boolean).length;
      sumEl.textContent = `넣을 그림 ${n}장 · 새로 ${cnt.new} · 같은 이름 ${cnt.dup}${cnt.sent ? ` · 이미 넣은 것 ${cnt.sent}` : ""} — 형식은 설정대로(${{ png: "원본 PNG", webp: "WebP", avif: "AVIF" }[S.prefs.putFormat] ?? "WebP"}), 이름 끝 확장자는 바뀔 수 있어요.`;
      if (okBtn) { okBtn.disabled = !n; okBtn.lastChild.textContent = `${n}장 넣기`; }
    };
    const setAll = (v) => { on.fill(v); paint(); };
    const unsent = () => { rows.forEach((r, i) => { on[i] = statusOf(r)[0] !== "sent"; }); paint(); };
    return modal(win, (done) => {
      okBtn = btn("넣기", { kind: "primary", id: "sds-exp-ok", onClick: () => { const idx = on.flatMap((v, i) => (v ? [i] : [])); if (idx.length) done({ idx, slot, dup }); } });
      paint();
      return dialog(title, 620,
        slots.length > 1 ? field("넣을 자리", segmented(slots, slot, (v) => { slot = v; unsent(); }, "넣을 자리")) : null,
        field("같은 이름이 이미 있으면", segmented([["number", "번호 붙여 더하기"], ["replace", "그림 바꾸기"]], dup, (v) => { dup = v; paint(); }, "같은 이름")),
        h("div", { class: "sds-row", style: "gap:6px;flex-wrap:wrap" }, btn("모두", { size: "sm", kind: "ghost", onClick: () => setAll(true) }), btn("안 넣은 것만", { size: "sm", kind: "ghost", id: "sds-exp-unsent", onClick: unsent }), btn("모두 풀기", { size: "sm", kind: "ghost", onClick: () => setAll(false) })),
        listEl, sumEl,
        h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), okBtn));
    });
  }

  // SDStudio 백업 가져오기: projs=[{ name, folder, tpl, count, favCount }] → { idx:[], mode } | null
  async function backupImport({ projs, hasImages }) {
    const on = projs.map(() => true), favAll = projs.reduce((n, x) => n + x.favCount, 0);
    let mode = !hasImages ? "none" : favAll ? "fav" : "all";
    const listEl = h("div", { class: "sds-exp-list", id: "sds-bk-list" }), sumEl = h("span", { class: "rb-muted", style: "white-space:normal;font-size:12.5px" });
    let okBtn = null;
    const paint = () => {
      replace(listEl, ...projs.map((x, i) => h("label", { class: "sds-exp-row" },
        h("input", { type: "checkbox", checked: on[i], "aria-label": `${x.name} 가져오기`, onChange: (e) => { on[i] = e.target.checked; paint(); } }),
        h("span", { class: "nm", title: x.name }, x.name, h("small", { class: "rb-muted", style: "display:block;font-weight:500" }, [x.folder && `폴더 ${x.folder}`, `씬 ${x.tpl.scenes.length}`, hasImages && `그림 ${x.count}`, hasImages && `즐겨찾기 ${x.favCount}`].filter(Boolean).join(" · "))))));
      const sel = projs.filter((_, i) => on[i]), n = mode === "none" ? 0 : sel.reduce((k, x) => k + (mode === "all" ? x.count : x.favCount), 0);
      sumEl.textContent = `캐릭터 ${sel.length}명으로 가져와요${n ? ` · 그림 ${n}장` : ""}. 폴더는 같은 이름 폴더에 넣고, 같은 이름 캐릭터가 있으면 번호를 붙여요. 상위·제외 프롬프트는 비어 있을 때만 채워요.`;
      if (okBtn) { okBtn.disabled = !sel.length; okBtn.lastChild.textContent = `${sel.length}명 가져오기`; }
    };
    return modal(win, (done) => {
      okBtn = btn("가져오기", { kind: "primary", id: "sds-bk-ok", onClick: () => { const idx = on.flatMap((v, i) => (v ? [i] : [])); if (idx.length) done({ idx, mode }); } });
      paint();
      return dialog("SDStudio 백업 가져오기", 600,
        h("span", { class: "rb-muted", style: "white-space:normal;font-size:12.5px" }, "SDStudio 프로젝트 하나가 캐릭터 하나가 돼요. 씬 구성·조각·앞쪽 프롬프트(외형)를 가져오고, 그림은 리스 에셋 저장소에 저장해요."),
        hasImages ? field("그림", segmented([["fav", "즐겨찾기만"], ["all", "모두"], ["none", "그림 없이"]], mode, (v) => { mode = v; paint(); }, "가져올 그림")) : h("span", { class: "rb-muted", style: "font-size:12.5px" }, "이 파일에는 그림이 없어 씬 구성만 가져와요."),
        listEl, sumEl,
        h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), okBtn));
    });
  }

  // 캐릭터 이름 두 칸: 표기(화면·로어북) / 영어(파일·에셋 내보내기)
  function charNames({ title, name = "", en = "", ok = "만들기" }) {
    const nIn = h("input", { type: "text", class: "rb-input", value: name, placeholder: "예: 시로코", "data-autofocus": "", id: "sds-cname" });
    const eIn = h("input", { type: "text", class: "rb-input", value: en, placeholder: "예: shiroko (비우면 표기 이름 사용)", id: "sds-cen" });
    const val = () => ({ name: nIn.value.trim(), en: eIn.value.trim().replace(/[\\/:*?"<>|]/g, "_") });
    return modal(win, (done) => {
      for (const x of [nIn, eIn]) x.addEventListener("keydown", (e) => { if (e.key === "Enter" && nIn.value.trim()) done(val()); });
      return dialog(title, 420, field("표기 이름(화면·로어북)", nIn), field("영어 이름(이미지 내보내기·에셋 이름)", eIn),
        h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), btn(ok, { kind: "primary", id: "sds-cok", onClick: () => nIn.value.trim() && done(val()) })));
    });
  }
  function folderDialog({ title, name = "", en = "", kind = "", prompt = "", ok = "만들기" }) {
    let k = kind;
    const eIn = h("input", { type: "text", class: "rb-input", value: en, placeholder: "예: swimsuit — 비우면 폴더 이름", id: "sds-fen" });
    const pIn = h("textarea", { class: "rb-input", rows: 3, id: "sds-fprompt", placeholder: "예: school uniform, halo — 이 폴더(안의 폴더 포함) 캐릭터 프롬프트 앞에 붙어요" }, prompt);
    const val = () => ({ name: input.value.trim(), en: eIn.value.trim(), kind: k, prompt: pIn.value });
    const input = h("input", { type: "text", class: "rb-input", value: name, placeholder: "예: 수영복 / 아비도스", "data-autofocus": "", id: "sds-fname" });
    return modal(win, (done) => {
      for (const x of [input, eIn]) x.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) done(val()); });
      return dialog(title, 460, field("표기 이름(화면·로어북)", input), field("영어 이름(이미지 내보내기·에셋 이름)", eIn), field("무엇으로 묶나요", segmented([["outfit", "캐릭터"], ["group", "소속"], ["", "그 밖"]], k, (v) => { k = v; }, "폴더 종류")),
        field("폴더 프롬프트", pIn, h("span", { class: "rb-muted", style: "font-size:12px;white-space:normal" }, "상위 폴더 프롬프트 → 하위 폴더 프롬프트 → 캐릭터 외형 순으로 이어져요.")),
        h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), btn(ok, { kind: "primary", id: "sds-fok", onClick: () => input.value.trim() && done(val()) })));
    });
  }

  // 작가 태그(그림체): 사전의 작가 종류에서 찾아 상위 프롬프트에 artist:이름 으로 더한다. 자주 쓰는 건 별표로 모아 둠.
  async function artists() {
    let db = S.sd.tags();
    if (!db) { try { db = await S.sd.loadTags(); } catch (e) { S.toast(`${e?.message ?? e} — 설정 → 태그 자동완성에서 파일로 불러올 수 있어요`, { error: true }); return; } }
    const fav = () => S.prefs.artistFav ?? [];
    const saveFav = async (list) => { S.prefs.artistFav = list; await S.sd.setPrefs({ artistFav: list }); };
    const q = h("input", { class: "rb-input", type: "search", id: "sds-art-q", placeholder: "작가 이름 찾기(두 글자부터)", "data-autofocus": "" });
    const list = h("div", { class: "sds-artlist", id: "sds-art-list" });
    const inTop = (name) => new RegExp(`(^|,)\\s*artist:${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(,|$)`, "i").test(S.proj.settings.top ?? "");
    const add = (name) => {
      const top = String(S.proj.settings.top ?? "").replace(/\s*,?\s*$/, "");
      S.set(P.setSettings(S.proj, { top: inTop(name) ? top : `${top}${top ? ", " : ""}artist:${name}` })); S.paintLeft(); paint();
    };
    const row = (name, freq) => h("div", { class: "it" },
      h("button", { type: "button", class: ["sds-ib", fav().includes(name) && "on"], title: "자주 쓰는 작가", "aria-label": "자주 쓰는 작가", onClick: async () => { await saveFav(fav().includes(name) ? fav().filter((x) => x !== name) : [...fav(), name]); paint(); } }, ico("star", 16)),
      h("span", { class: "w" }, name), freq != null ? h("span", { class: "rb-muted", style: "font-size:12px" }, fmtFreq(freq)) : null,
      btn(inTop(name) ? "넣음" : "넣기", { size: "sm", kind: inTop(name) ? "ghost" : "primary", disabled: inTop(name), onClick: () => add(name) }));
    const paint = () => {
      const k = q.value.trim();
      const hits = k.length >= 2 ? (() => { const out = []; const nk = norm(k); for (let i = 0; i < db.size && out.length < 400; i++) if (db.cats[i] === 1 && !db.redirs[i] && db.keys[i].includes(nk)) out.push(i); return out.sort((a, b) => db.freqs[b] - db.freqs[a]).slice(0, 40); })() : [];
      replace(list,
        fav().length ? h("small", { class: "rb-muted" }, "자주 쓰는 작가") : null, ...fav().map((n) => row(n, null)),
        k.length >= 2 ? h("small", { class: "rb-muted" }, hits.length ? `찾은 작가 ${hits.length}` : "없어요") : h("small", { class: "rb-muted" }, "이름을 두 글자 이상 쳐요. 넣으면 상위 프롬프트 끝에 artist:이름 으로 붙어요."),
        ...hits.map((i) => row(db.words[i], db.freqs[i])));
    };
    q.addEventListener("input", () => paint());
    paint();
    await modal(win, (done) => dialog("작가 태그(그림체)", 520, q, list, h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done() }))));
  }

  return { artists, sampling, charPrompts, pieces, vibes, refs, savePreset, loadPreset, check, help, token, settings, put, exportPreview, backupImport, folderDialog, charNames, keysDialog, templateChoice, templateManager, tutorial };
}
