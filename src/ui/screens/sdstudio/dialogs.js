// 에셋 제작 — 대화상자들: 샘플링/모델, 캐릭터 프롬프트(NAI 다인), 조각 모음, 바이브 이미지, 레퍼런스, 프리셋, 작업 묶음 파일,
// 문제 확인, 도움말, 설정(토큰·기본 예약), 봇·모듈에 넣기, 폴더. 저장은 모두 S.set(사본)으로.
import { h, replace, download, pickFiles } from "../../dom.js";
import { btn, modal, segmented, confirmDialog, promptDialog, openMenu, switchEl } from "../../kit.js";
import { MODELS, modelOf, SAMPLER_KO, NOISE_SCHEDULES, QUALITY_KO, UC_KO, ucPresetsFor, normalizeSampling, ucPresetText, isFreeSize } from "../../../engine/sdstudio/nai.js";
import { buildPrompt, buildNegative, toPARR, combinationCount } from "../../../engine/sdstudio/prompt.js";
import * as P from "../../../engine/sdstudio/project.js";
import { promptArea, helpDot } from "./left.js";
import { ico } from "./look.js";

var dialog = (title, wide, ...kids) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title, style: `max-width:${wide ?? 520}px;max-height:calc(100vh - 32px);overflow:auto` }, h("h3", { class: "rb-h3" }, title), ...kids);
var shrinkless = (box) => { for (const el of box.children) el.style.flexShrink = "0"; return box; };
var field = (text, ...kids) => h("div", { style: "display:flex;flex-direction:column;gap:6px" }, h("span", { class: "rb-label" }, text), ...kids);
var num = (value, { min, max, step = 1, id, onChange }) => { const i = h("input", { type: "number", class: "rb-input", value: String(value), min, max, step, id, style: "width:110px" }); i.addEventListener("change", () => onChange(Number(i.value))); return i; };
var sel = (options, value, onChange, id) => h("select", { class: "rb-input", id, onChange: (e) => onChange(e.target.value) }, ...options.map(([v, t]) => h("option", { value: v, selected: v === value }, t)));

export function createDialogs(S) {
  const win = S.ctx.win;
  const setSampling = (patch) => { S.set(P.setSettings(S.proj, { sampling: normalizeSampling({ ...S.proj.settings.sampling, ...patch }) })); S.paintLeft(); };

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
        m.varietyPlus ? switchEl(s.varietyPlus, { label: "Variety+ (구도 다양하게)", onChange: (v) => setSampling({ varietyPlus: v }) }) : null,
        m.transparent ? switchEl(s.transparent, { label: "투명 배경", onChange: (v) => setSampling({ transparent: v }) }) : null,
        switchEl(s.useCoords, { label: "캐릭터 위치 쓰기(캐릭터 프롬프트)", onChange: (v) => setSampling({ useCoords: v }) }),
        m.v5 ? null : switchEl(s.legacyUc, { label: "옛 네거티브 방식(legacy UC)", onChange: (v) => setSampling({ legacyUc: v }) }),
        m.vibe ? switchEl(s.normalizeVibes, { label: "바이브 세기 합을 1로 맞추기", onChange: (v) => setSampling({ normalizeVibes: v }) }) : null);
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

  // ── 작업 묶음 파일 ──
  function projectMenu(anchor) {
    openMenu(win, anchor, [
      { label: "작업 묶음 내보내기(.json)", icon: "download", onClick: () => download(`${S.title}-에셋제작.json`, JSON.stringify({ format: "dusk-sdstudio", v: 2, project: S.proj }, null, 1), "application/json") },
      { label: "작업 묶음 가져오기…", icon: "upload", onClick: async () => {
        const [f] = await pickFiles({ accept: "application/json,.json" });
        if (!f) return;
        try {
          const j = JSON.parse(await f.text());
          const p = P.normalizeProject(j?.project ?? j);
          if (!await confirmDialog(win, { title: "지금 작업 묶음을 바꿀까요?", body: `캐릭터 ${p.chars.length}명·폴더 ${p.folders.length}개로 바뀌어요. 그림 경로는 같은 리스에서만 보여요.`, ok: "바꾸기", danger: true })) return;
          S.set(p); S.st.charId = null; S.st.sceneId = null; S.st.folder = null; S.paint();
        } catch (e) { S.toast(`읽지 못했어요: ${e?.message ?? e}`, { error: true }); }
      } }
    ]);
  }

  async function check() {
    const out = [], pr = S.proj, s = pr.settings;
    if (!(await S.sd.getToken())) out.push(["warn", "NovelAI 토큰이 없어요. 설정(톱니)에서 넣어요."]);
    for (const c of pr.chars) for (const sc of c.scenes) {
      if (!combinationCount(sc.slots)) { out.push(["warn", `${c.name} › ${sc.name}: 켜진 조각이 없는 슬롯이 있어 그릴 수 없어요.`]); continue; }
      try { const pmt = buildPrompt({ top: s.top, own: c.prompt, middle: P.middleFor(sc, 0), back: s.back }, pr.pieces); if (!toPARR(pmt).length) out.push(["warn", `${c.name} › ${sc.name}: 프롬프트가 비었어요.`]); }
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
      sec("폴더", "복장 베리에이션·소속으로 캐릭터를 묶어요. 폴더 안에 폴더, 한 캐릭터를 여러 폴더에 넣을 수 있어요. 왼쪽 ‘폴더’ 탭이나 카드 메뉴로 넣어요."),
      sec("저장", "그림은 만들자마자 리스 에셋 저장소에 저장되고, 이 화면 목록에서 빼도 저장소 파일은 남아요. 작업 묶음은 봇·모듈마다 따로 저장돼요."),
      h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(true) }))));
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
    const has = !!(await S.sd.getToken());
    await modal(win, (done) => dialog("설정", 480,
      field("NovelAI 토큰", h("div", { style: "display:flex;gap:8px;align-items:center" }, h("span", { class: "rb-muted", style: "flex:1" }, has ? "저장됨(이 기기)" : "없음"), btn(has ? "바꾸기" : "넣기", { size: "sm", onClick: () => { done(true); token({ force: true }); } }))),
      field("‘모두 예약’ 장 수", num(S.proj.settings.reserveDefault, { min: 1, max: 20, id: "sds-rdef", onChange: (v) => { S.set(P.setSettings(S.proj, { reserveDefault: Math.max(1, Math.min(20, Math.round(v) || 1)) })); S.paintTools(); } })),
      h("span", { class: "rb-muted", style: "white-space:normal" }, "그림은 만들 때 바로 리스 에셋 저장소에 저장돼요. 목록에서 빼도 파일은 남으니, 많이 만들었다면 리스의 에셋 정리로 지워요."),
      h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(true) }))));
  }

  // 봇·모듈에 넣기 → { slot, name, replace } | null
  async function put({ count, name = "", allScenes = false }) {
    const slots = S.target.kind === "module" ? [["assets", "모듈 에셋"]] : [["emotionImages", "감정 이미지"], ["additionalAssets", "추가 에셋"]];
    let slot = slots[0][0], mode = "add";
    const nameIn = h("input", { class: "rb-input", value: name, id: "sds-put-name", placeholder: "에셋 이름" });
    return modal(win, (done) => dialog(allScenes ? "씬 대표 그림을 넣을까요?" : `${count}장을 넣을까요?`, 480,
      h("span", { class: "rb-muted", style: "white-space:normal" }, allScenes ? `씬 ${count}개의 대표 그림(1위·즐겨찾기·최신 순)을 씬 이름으로 넣어요.` : "기존 에셋 뒤에 덧붙여요. 같은 이름이 있으면 뒤에 번호가 붙어요."),
      slots.length > 1 ? field("넣을 자리", segmented(slots, slot, (v) => { slot = v; }, "넣을 자리")) : null,
      allScenes ? field("같은 이름이 이미 있으면", segmented([["add", "번호 붙여 더하기"], ["replace", "그림 바꾸기"]], mode, (v) => { mode = v; }, "같은 이름")) : field("이름", nameIn),
      h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), btn("넣기", { kind: "primary", id: "sds-put-ok", onClick: () => done({ slot, name: nameIn.value.trim(), replace: mode === "replace" }) }))));
  }

  function folderDialog({ title, name = "", kind = "", ok = "만들기" }) {
    let k = kind;
    const input = h("input", { type: "text", class: "rb-input", value: name, placeholder: "예: 수영복 / 아비도스", "data-autofocus": "", id: "sds-fname" });
    return modal(win, (done) => {
      input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) done({ name: input.value.trim(), kind: k }); });
      return dialog(title, 460, field("폴더 이름", input), field("무엇으로 묶나요", segmented([["outfit", "복장 베리에이션"], ["group", "소속"], ["", "그 밖"]], k, (v) => { k = v; }, "폴더 종류")),
        h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), btn(ok, { kind: "primary", id: "sds-fok", onClick: () => input.value.trim() && done({ name: input.value.trim(), kind: k }) })));
    });
  }

  return { sampling, charPrompts, pieces, vibes, refs, savePreset, loadPreset, projectMenu, check, help, token, settings, put, folderDialog };
}
