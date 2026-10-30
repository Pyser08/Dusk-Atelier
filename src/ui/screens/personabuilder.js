// 페르소나 빌더 화면: 양식(프리셋)의 ### 섹션 = 폴더, * 항목 = 칸.
// AI 없이 손으로 채우거나, AI 프리셋(모델·추가 지시·번역)으로 전체/빈 칸/부분 고치기.
// AI 출력은 영어 고정, 번역은 보기용(저장되지 않음).
import { copyText, h, replace } from '../dom.js';
import { btn, iconBtn, confirmDialog, promptDialog, modal, note, openMenu, switchEl, setSwitch } from '../kit.js';
import { attachUndo } from '../undo.js';
import { AI_MODES, runAI } from '../../engine/merge.js';
import { parseTemplate, compose, readValues, buildPrompt, translatePrompt, fieldKey, freeKey, loadPB, savePB, pushBackup, loadBackups, newId, templateCode, aiCode, readCode, DEFAULT_AI, addField, removeField, addSection, removeSection } from '../../data/personabuilder.js';
import { ROULETTE, DEFAULT_SLOTS, catById, spin, rouletteText } from '../../data/personaroulette.js';

var CSS = `
.rb-pb{display:flex;flex-direction:column;gap:14px}
.rb-pb-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.rb-pb-bar select,.rb-pb-bar input{height:36px;flex:1;min-width:140px}
.rb-pb-box{border:1px solid var(--rb-line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--rb-surf)}
.rb-pb-h{font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px}
.rb-pb-sec{border:1px solid var(--rb-line);border-radius:12px;overflow:hidden}
.rb-pb-sec>summary,.rb-dialog .rb-pb-sec>summary{list-style:none;display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;font-weight:700;font-size:13.5px;background:var(--rb-surf)}
.rb-pb-sec>summary::-webkit-details-marker{display:none}
.rb-pb-sec>summary .ttl{flex:1}
.rb-pb-sec[data-off] >summary .ttl{opacity:.45;text-decoration:line-through}
.rb-pb-sec .cnt{font-size:11.5px;color:var(--rb-mute);font-weight:600}
.rb-pb-body{padding:10px 12px;display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--rb-line)}
.rb-pb-f{display:flex;flex-direction:column;gap:4px}
.rb-pb-f .lab{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--rb-sub)}
.rb-pb-f .lab span{flex:1}
.rb-pb-f textarea,.rb-pb textarea,.rb-dialog textarea{width:100%;box-sizing:border-box;min-height:38px;resize:vertical;border-radius:10px;border:1px solid var(--rb-line);background:var(--rb-bg,transparent);color:var(--rb-text);padding:8px 10px;font:inherit;font-size:13px;line-height:1.5}
.rb-pb-f textarea:focus,.rb-pb textarea:focus,.rb-dialog textarea:focus{outline:none;border-color:var(--rb-sel-ring)}
.rb-pb-ko{font-size:12px;color:var(--rb-sub);background:var(--rb-acc-soft);border-radius:8px;padding:6px 9px;line-height:1.5;white-space:pre-wrap}
.rb-pb-ko[data-stale]{opacity:.55}
.rb-pb-fixed{font-size:12px;color:var(--rb-sub);white-space:pre-wrap;line-height:1.55}
.rb-pb-pre{white-space:pre-wrap;font-size:12px;line-height:1.55;max-height:360px;overflow:auto;background:var(--rb-bg,transparent);border:1px solid var(--rb-line);border-radius:10px;padding:10px;margin:0}
.rb-pb-mini{border:0;background:none;color:var(--rb-acc-text);cursor:pointer;padding:2px 4px;border-radius:6px;font-size:11.5px;font-weight:700}
.rb-pb-mini:hover{background:var(--rb-acc-soft)}
.rb-pb-mini:disabled{opacity:.4;cursor:default}
.rb-pb-x{border:0;background:none;color:var(--rb-mute);cursor:pointer;padding:0 4px;font-size:14px;line-height:1;border-radius:6px}
.rb-pb-x:hover{color:var(--rb-danger,#e5484d);background:var(--rb-acc-soft)}
.rb-pb-add{border:1px dashed var(--rb-line);background:none;color:var(--rb-sub);border-radius:10px;padding:7px;cursor:pointer;font-size:12.5px;font-weight:600}
.rb-pb-add:hover{color:var(--rb-acc-text);border-color:var(--rb-acc-text)}
.rb-pb-folders{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.rb-pb-chip{border:1px solid var(--rb-line);background:var(--rb-bg,transparent);color:var(--rb-text);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:600;cursor:pointer}
.rb-pb-chip:hover{border-color:var(--rb-acc-text);color:var(--rb-acc-text)}
.rb-pb-cab{position:relative;display:flex;align-items:center;gap:10px;padding:18px 14px 14px;border-radius:18px;background:linear-gradient(180deg,#3a1f4a,#24142f);border:3px solid #d9b45a;box-shadow:inset 0 0 0 2px #00000055,0 8px 22px rgb(0 0 0/.35)}
.rb-pb-cab .lights{position:absolute;left:14px;right:14px;top:5px;height:6px;background:radial-gradient(circle,#ffe08a 0 2px,transparent 2.5px) 0 0/14px 6px repeat-x;opacity:.8;animation:rbPbLights 1.2s steps(2) infinite}
.rb-pb-cab.win .lights{animation-duration:.18s;opacity:1}
.rb-pb-cab.win{box-shadow:inset 0 0 0 2px #00000055,0 0 26px #ffe08a88}
@keyframes rbPbLights{50%{background-position:7px 0}}
.rb-pb-reels{flex:1;min-width:0;display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}
.rb-pb-reel{flex:1 0 128px;max-width:200px;display:flex;flex-direction:column;gap:6px}
.rb-pb-reel select{height:28px;font-size:11.5px;border-radius:8px;padding:0 4px;background:#1a1022;color:#f3e9ff;border-color:#d9b45a66}
.rb-pb-reel .win{position:relative;height:138px;overflow:hidden;border-radius:10px;background:linear-gradient(180deg,#d8d0c4,#fffdf8 30%,#fffdf8 70%,#d8d0c4);box-shadow:inset 0 6px 10px rgb(0 0 0/.35),inset 0 -6px 10px rgb(0 0 0/.35);cursor:pointer}
.rb-pb-reel .win::after{content:"";position:absolute;left:0;right:0;top:46px;height:46px;border-top:2px solid #e5484d99;border-bottom:2px solid #e5484d99;pointer-events:none}
.rb-pb-reel .strip{will-change:transform}
.rb-pb-reel .cell{height:46px;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 6px;font-size:12.5px;font-weight:800;color:#2a1a33;line-height:1.2;overflow:hidden;word-break:keep-all}
.rb-pb-reel.go .strip{filter:blur(1.4px)}
.rb-pb-reel.hit .win{animation:rbPbHit .6s ease}
@keyframes rbPbHit{30%{box-shadow:inset 0 6px 10px rgb(0 0 0/.35),inset 0 -6px 10px rgb(0 0 0/.35),0 0 0 3px #ffe08a}}
.rb-pb-reel[data-lock] .win{outline:2px solid #ffe08a;outline-offset:1px}
.rb-pb-reel .ops{display:flex;justify-content:center;gap:2px}
.rb-pb-reel .rb-pb-mini{color:#ffe08a}
.rb-pb-lever{flex:none;position:relative;width:28px;height:172px;border:0;background:none;cursor:pointer;padding:0}
.rb-pb-lever .rod{position:absolute;left:11px;top:16px;width:6px;height:92px;border-radius:3px;background:linear-gradient(90deg,#9aa,#eee,#9aa);transform-origin:50% 100%;transition:transform .2s}
.rb-pb-lever .knob{position:absolute;left:2px;top:0;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ff8a8a,#c0262d);box-shadow:0 2px 4px rgb(0 0 0/.5);transition:transform .2s;z-index:1}
.rb-pb-lever.pull .knob{transform:translateY(92px)}
.rb-pb-lever.pull .rod{transform:scaleY(.15)}
@media (prefers-reduced-motion:reduce){.rb-pb-cab .lights{animation:none}.rb-pb-reel.go .strip{filter:none}}
`;

export async function renderPersonaBuilder(ctx) {
  if (!document.getElementById("rb-pb-style")) document.head.appendChild(h("style", { id: "rb-pb-style" }, CSS));
  const api = ctx.api;
  const pb = await loadPB(api);
  let personas = [];
  const loadPersonas = async () => {
    const db = await api.getDatabase(["personas"]);
    personas = (db?.personas ?? []).map((p, i) => ({ ...p, _i: i }));
  };
  await loadPersonas();

  // 작업 상태
  const d = pb.draft ?? {};
  let target = typeof d.target === "string" ? d.target : ""; // persona id, "" = 새 페르소나
  let name = typeof d.name === "string" ? d.name : "";
  let values = d.values && typeof d.values === "object" ? { ...d.values } : {};
  let off = d.off && typeof d.off === "object" ? { ...d.off } : {};
  let ko = d.ko && typeof d.ko === "object" ? { ...d.ko } : {}; // key → { t: 번역, src: 번역할 때의 원문 }
  let concept = typeof d.concept === "string" ? d.concept : "";
  let runNote = typeof d.note === "string" ? d.note : "";
  let slots = Array.isArray(d.slots) && d.slots.length ? d.slots.filter((x) => x && typeof x.cat === "string").map((x) => ({ cat: catById(x.cat).id, value: String(x.value ?? ""), lock: !!x.lock })) : DEFAULT_SLOTS.map((cat) => ({ cat, value: "", lock: false }));
  const undo = [];
  let busy = false;
  const tpl = () => pb.templates.find((t) => t.id === pb.template) ?? pb.templates[0];
  const aip = () => pb.ais.find((a) => a.id === pb.ai) ?? pb.ais[0];
  let sections = parseTemplate(tpl().text);

  let saveT = null;
  const persist = () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      pb.draft = { target, name, values, off, ko, concept, note: runNote, slots };
      savePB(api, pb).catch(() => {});
    }, 400);
  };
  const snap = () => {
    undo.push(structuredClone({ values, off, ko }));
    if (undo.length > 20) undo.shift();
  };

  const msg = h("div", { class: "rb-muted", style: "font-size:12px;line-height:1.6;min-height:1em" });
  const say = (t) => replace(msg, t);

  // ── 상단: 페르소나 ──
  const personaSel = h("select", { class: "rb-input", "aria-label": "편집할 페르소나" });
  const nameIn = h("input", { class: "rb-input", placeholder: "페르소나 이름", "aria-label": "페르소나 이름", value: name });
  nameIn.addEventListener("input", () => {
    name = nameIn.value;
    persist();
  });
  const drawPersonaSel = () => replace(personaSel, h("option", { value: "", selected: !target }, "＋ 새 페르소나"), ...personas.filter((p) => p.id).map((p) => h("option", { value: p.id, selected: p.id === target }, p.name || "(이름 없음)")));
  personaSel.addEventListener("change", async () => {
    const id = personaSel.value;
    const hasWork = Object.values(values).some((v) => String(v ?? "").trim());
    if (hasWork && !await confirmDialog(ctx.win, { title: "지금 쓰던 내용을 바꿀까요?", body: id ? "고른 페르소나의 설명을 칸에 불러와요." : "빈 양식으로 새로 시작해요.", ok: "바꾸기" })) {
      drawPersonaSel();
      return;
    }
    snap();
    target = id;
    const p = personas.find((x) => x.id === id);
    name = p?.name ?? "";
    nameIn.value = name;
    values = p ? readValues(sections, p.personaPrompt) : {};
    ko = {};
    off = {};
    if (p && String(p.personaPrompt ?? "").trim() && !Object.keys(values).length) say("이 페르소나의 설명이 지금 양식과 맞지 않아 칸에 넣지 못했어요. 원래 설명은 저장하기 전까지 그대로예요. AI로 '전체 쓰기'를 하면 원래 설명을 참고해 양식에 맞춰 줘요.");
    else say(p ? "불러왔어요." : "");
    persist();
    drawSheet();
  });

  // ── 양식(설명 프리셋) ──
  const tplSel = h("select", { class: "rb-input", "aria-label": "설명 양식" });
  const drawTplSel = () => replace(tplSel, ...pb.templates.map((t) => h("option", { value: t.id, selected: t.id === pb.template }, t.name)));
  const useTemplate = (id) => {
    pb.template = id;
    sections = parseTemplate(tpl().text);
    drawTplSel();
    savePB(api, pb).catch(() => {});
    drawSheet();
  };
  tplSel.addEventListener("change", () => useTemplate(tplSel.value));
  const tplMenu = iconBtn("more", "양식 메뉴", { boxed: true, onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
    { label: "양식 편집", icon: "edit", onClick: () => editTemplate(tpl()) },
    { label: "복제해서 새 양식", icon: "plus", onClick: () => editTemplate({ id: newId(), name: `${tpl().name} 사본`, text: tpl().text }, true) },
    { label: "공유 코드 복사", icon: "link", onClick: async () => {
      await copyText(templateCode(tpl()));
      ctx.toast("양식 공유 코드를 복사했어요");
    } },
    { label: "공유 코드 가져오기", icon: "download", onClick: importCode },
    tpl().builtin ? null : { label: "이 양식 지우기", icon: "trash", danger: true, onClick: async () => {
      if (!await confirmDialog(ctx.win, { title: `'${tpl().name}' 양식을 지울까요?`, body: "적어 둔 내용은 남아요.", ok: "삭제", danger: true })) return;
      pb.templates = pb.templates.filter((t) => t.id !== pb.template);
      useTemplate("default");
    } }
  ].filter(Boolean)) });
  async function editTemplate(t, isNew = false) {
    const res = await modal(ctx.win, (done) => {
      const nm = h("input", { class: "rb-input", value: t.name, "aria-label": "양식 이름", "data-autofocus": "1" });
      const ta = h("textarea", { style: "min-height:340px;font-family:ui-monospace,monospace;font-size:12px", "aria-label": "양식 내용" });
      ta.value = t.text;
      attachUndo(ta);
      return h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(720px,94vw)" },
        h("h3", { class: "rb-h3" }, t.builtin ? "기본 양식 편집" : "양식 편집"),
        h("p", { class: "rb-p" }, "### 제목 = 폴더, * 항목: 설명 = 칸 하나예요. '- '로 쓴 줄은 그대로 들어가는 고정 문구(규칙 등), 내용 없이 (괄호)만 있는 섹션은 자유롭게 쓰는 칸이 돼요."),
        nm,
        ta,
        h("div", { class: "btns" },
          t.builtin && !isNew ? btn("처음 상태로", { onClick: () => done({ reset: true }) }) : null,
          btn("취소", { onClick: () => done(null) }),
          btn("저장", { kind: "primary", onClick: () => done({ name: nm.value.trim() || t.name, text: ta.value }) }))
      );
    });
    if (!res) return;
    if (res.reset) {
      pb.templates = pb.templates.filter((x) => x.id !== "default");
      const fresh = await loadPB({ pluginStorage: { getItem: async () => JSON.stringify({ templates: pb.templates }) } });
      pb.templates = fresh.templates;
      return useTemplate("default");
    }
    if (!parseTemplate(res.text).some((s) => s.kind !== "fixed")) return ctx.toast("### 섹션이나 * 항목을 찾지 못했어요", { error: true });
    if (isNew) pb.templates.push({ id: t.id, name: res.name, text: res.text });
    else Object.assign(pb.templates.find((x) => x.id === t.id), { name: res.name, text: res.text });
    useTemplate(t.id);
  }
  async function importCode() {
    const s = await promptDialog(ctx.win, { title: "공유 코드 가져오기", label: "DPB1:(양식) 또는 DPA1:(AI 프리셋) 코드", placeholder: "DPB1:…" });
    if (!s) return;
    try {
      const r = readCode(s);
      if (r.kind === "template") {
        pb.templates.push(r.value);
        useTemplate(r.value.id);
      } else {
        pb.ais.push(r.value);
        pb.ai = r.value.id;
        savePB(api, pb).catch(() => {});
        drawAi();
      }
      ctx.toast(`'${r.value.name}'을(를) 가져왔어요`);
    } catch (e) {
      ctx.toast(e?.message ?? String(e), { error: true });
    }
  }

  // ── AI ──
  const aiBox = h("div", { class: "rb-pb-box" });
  const aiSel = h("select", { class: "rb-input", "aria-label": "AI 프리셋" });
  aiSel.addEventListener("change", () => {
    pb.ai = aiSel.value;
    savePB(api, pb).catch(() => {});
    drawAi();
  });
  const conceptIn = h("textarea", { placeholder: "예: 25살 야간 편의점 알바생, 무뚝뚝하지만 길고양이를 몰래 챙김. 한국어로 써도 돼요.", "aria-label": "캐릭터 콘셉트", style: "min-height:64px" });
  conceptIn.value = concept;
  attachUndo(conceptIn);
  conceptIn.addEventListener("input", () => {
    concept = conceptIn.value;
    persist();
  });
  const noteIn = h("textarea", { placeholder: "추가 지시 (선택) — 이번 AI 작업마다 함께 들어가요. 예: 판타지 세계관, 25살 이상, 말투 예시는 반말로", "aria-label": "추가 지시", style: "min-height:44px" });
  noteIn.value = runNote;
  attachUndo(noteIn);
  noteIn.addEventListener("input", () => {
    runNote = noteIn.value;
    persist();
  });
  const editIn = h("input", { class: "rb-input", style: "height:36px;flex:1;min-width:160px", placeholder: "켜진 섹션 전체에 적용할 수정 요청 (예: 더 냉소적으로)", "aria-label": "AI 수정 요청", enterkeyhint: "send", autocapitalize: "off", autocomplete: "off" });
  const koSw = switchEl(pb.showKo, { label: "번역 같이 보기", onChange: (v, el) => {
    pb.showKo = v;
    setSwitch(el, v);
    savePB(api, pb).catch(() => {});
    drawSheet();
    if (v && aip().translate !== false && !Object.keys(ko).length && hasAny()) translateNow();
  } });
  const hasAny = () => Object.values(values).some((v) => String(v ?? "").trim());
  const aiButtons = [];
  const setBusy = (b) => {
    busy = b;
    aiButtons.forEach((x) => x.disabled = b);
    ctx.main.querySelectorAll(".rb-pb-mini").forEach((x) => x.disabled = b);
  };
  const run = (m) => runAI(api, m, aip());
  async function translateNow(keys = null) {
    const P = aip();
    if (!pb.showKo) return;
    const vals = keys ? Object.fromEntries([...keys].map((k) => [k, values[k]])) : values;
    const text = compose(sections.filter((s) => s.kind !== "fixed"), vals, off);
    if (!text.trim()) return;
    try {
      const out = await runAI(api, translatePrompt(text), P);
      const t = readValues(sections, out);
      for (const [k, v] of Object.entries(t)) if (v) ko[k] = { t: v, src: String(values[k] ?? "").trim() };
      persist();
      drawSheet();
    } catch (e) {
      say(`번역하지 못했어요: ${e?.message ?? e}`);
    }
  }
  // task: draft | fill | edit
  async function aiDo(label, task, { keys = [], instruction = "" } = {}) {
    if (busy) return;
    const P = aip();
    if (P.mode === "static" && !P.staticModel) return say("AI 프리셋에 모델 ID를 먼저 적어 주세요.");
    const orig = task === "draft" && target ? String(personas.find((p) => p.id === target)?.personaPrompt ?? "") : "";
    const extraConcept = [concept.trim(), !Object.keys(values).length && orig.trim() ? `Existing description to convert (keep its facts):\n${orig.slice(0, 6000)}` : ""].filter(Boolean).join("\n\n");
    if (task === "draft" && !extraConcept && !hasAny()) {
      conceptIn.focus();
      return say("콘셉트를 한 줄이라도 적어 주세요.");
    }
    const { messages, target: tg } = buildPrompt({ sections, values, off, task, keys, concept: extraConcept, instruction, extra: P.extra, note: runNote.trim() });
    if (tg && !tg.size) return say(task === "fill" ? "빈 칸이 없어요." : "고칠 칸이 없어요.");
    setBusy(true);
    say(label);
    try {
      let out = await run(messages);
      let got = readValues(sections, out);
      if (!Object.keys(got).length) {
        out = await run([...messages, { role: "assistant", content: out.slice(0, 1500) }, { role: "user", content: "Use the exact format: \"### Section\" headers and \"* Label: value\" lines only." }]);
        got = readValues(sections, out);
      }
      if (!Object.keys(got).length) throw new Error("양식에 맞는 답을 받지 못했어요");
      snap();
      const changed = new Set();
      for (const [k, v] of Object.entries(got)) {
        if (tg && !tg.has(k)) continue;
        if (!v || /^\(leave empty\)$/i.test(v) || /<<WRITE/.test(v)) continue;
        values[k] = v;
        changed.add(k);
        delete ko[k];
      }
      persist();
      drawSheet();
      say(`${changed.size}칸을 썼어요. 마음에 안 들면 '되돌리기'를 눌러요.`);
      if (pb.showKo && P.translate !== false && changed.size) {
        say(`${changed.size}칸을 썼어요. 번역하는 중…`);
        await translateNow(changed);
        say(`${changed.size}칸을 썼어요. 마음에 안 들면 '되돌리기'를 눌러요.`);
      }
    } catch (e) {
      say(`AI가 하지 못했어요: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
      drawUndo();
    }
  }
  const askEdit = async (title, keys) => {
    const ins = await promptDialog(ctx.win, { title, label: "어떻게 고칠까요? 비워 두면 새로 써요. (한국어 OK)", placeholder: "예: 더 짧게, 고양이 알레르기 추가" });
    if (ins === null) return;
    aiDo("AI가 고치는 중…", "edit", { keys, instruction: ins.trim() });
  };
  const undoWrap = h("span");
  const drawUndo = () => replace(undoWrap, undo.length ? btn(`되돌리기 (${undo.length})`, { size: "sm", icon: "undo", onClick: () => {
    const s = undo.pop();
    ({ values, off, ko } = s);
    persist();
    drawSheet();
    drawUndo();
    say("되돌렸어요.");
  } }) : null);
  async function editAi(a, isNew = false) {
    const res = await modal(ctx.win, (done) => {
      const nm = h("input", { class: "rb-input", value: a.name, "aria-label": "프리셋 이름", "data-autofocus": "1" });
      const sel = h("select", { class: "rb-input", "aria-label": "AI 모델" }, ...AI_MODES.map(([v, l]) => h("option", { value: v, selected: a.mode === v }, l)));
      const mid = h("input", { class: "rb-input", value: a.staticModel ?? "", placeholder: "모델 ID (예: gpt-4o, claude-…)", "aria-label": "모델 ID" });
      const showMid = () => mid.style.display = sel.value === "static" ? "" : "none";
      sel.addEventListener("change", showMid);
      showMid();
      const ex = h("textarea", { style: "min-height:110px", "aria-label": "추가 지시", placeholder: "예: 어두운 판타지 톤으로. 외모는 구체적으로, 말투 샘플은 반말 위주. 성적인 묘사는 암시만." });
      ex.value = a.extra ?? "";
      attachUndo(ex);
      let tr = a.translate !== false;
      const trSw = switchEl(tr, { label: "번역도 받기", onChange: (v, el) => {
        tr = v;
        setSwitch(el, v);
      } });
      return h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(560px,94vw)" },
        h("h3", { class: "rb-h3" }, isNew ? "새 AI 프리셋" : "AI 프리셋 편집"),
        h("span", { class: "rb-label" }, "이름"), nm,
        h("span", { class: "rb-label" }, "모델"), sel, mid,
        h("span", { class: "rb-label" }, "추가 지시 (모든 AI 작업에 붙어요)"), ex,
        h("label", { style: "display:flex;align-items:center;gap:8px;font-size:13px" }, trSw, "결과를 받을 때 한국어 번역도 같이 받기"),
        h("p", { class: "rb-p" }, "AI가 쓰는 설명은 항상 영어예요. 번역은 확인용으로만 보이고 저장되지 않아요."),
        h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: () => done({ name: nm.value.trim() || a.name, mode: sel.value, staticModel: mid.value.trim(), extra: ex.value.trim(), translate: tr }) }))
      );
    });
    if (!res) return;
    if (isNew) pb.ais.push({ ...a, ...res });
    else Object.assign(pb.ais.find((x) => x.id === a.id), res);
    pb.ai = a.id;
    savePB(api, pb).catch(() => {});
    drawAi();
  }
  const drawAi = () => {
    replace(aiSel, ...pb.ais.map((a) => h("option", { value: a.id, selected: a.id === pb.ai }, a.name)));
    const P = aip();
    aiButtons.length = 0;
    const b1 = btn("전체 쓰기", { kind: "primary", size: "sm", icon: "zap", onClick: () => aiDo("AI가 페르소나를 쓰는 중… (큰 모델일수록 좋아요)", "draft") });
    const b2 = btn("빈 칸만 채우기", { size: "sm", icon: "plus", onClick: () => aiDo("AI가 빈 칸을 채우는 중…", "fill") });
    const b3 = btn("고치기", { size: "sm", icon: "brush", onClick: () => {
      if (!editIn.value.trim()) return editIn.focus();
      const keys = sections.filter((s) => !off[s.title]).flatMap((s) => s.kind === "fields" ? s.fields.map((f) => fieldKey(s.title, f.label)) : s.kind === "free" ? [freeKey(s.title)] : []).filter((k) => String(values[k] ?? "").trim());
      aiDo("AI가 고치는 중…", "edit", { keys, instruction: editIn.value.trim() }).then(() => editIn.value = "");
    } });
    const b4 = btn("번역 새로 받기", { size: "sm", icon: "globe", onClick: async () => {
      if (busy) return;
      if (!pb.showKo) {
        pb.showKo = true;
        setSwitch(koSw, true);
      }
      setBusy(true);
      say("번역하는 중…");
      await translateNow();
      setBusy(false);
      say("번역했어요.");
    } });
    aiButtons.push(b1, b2, b3, b4);
    // on* 속성 핸들러가 false를 돌려주면 브라우저가 입력을 취소해 영문·지우기가 막힌다 → 값을 돌려주지 않는 리스너로 연결
    if (editIn.__pbKey) editIn.removeEventListener("keydown", editIn.__pbKey);
    editIn.__pbKey = (e) => {
      if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        b3.click();
      }
    };
    editIn.addEventListener("keydown", editIn.__pbKey);
    replace(
      aiBox,
      h("div", { class: "rb-pb-h" }, "AI로 쓰기", h("span", { class: "rb-muted", style: "font-weight:500;font-size:12px" }, `· ${AI_MODES.find(([v]) => v === P.mode)?.[1] ?? ""}${P.mode === "static" ? ` ${P.staticModel || "(ID 없음)"}` : ""} · 영어로 써요`)),
      h("div", { class: "rb-pb-bar" },
        h("span", { class: "rb-label", style: "flex:none" }, "AI 모델"),
        (() => {
          const sel = h("select", { class: "rb-input", "aria-label": "AI 모델", style: "max-width:220px" }, ...AI_MODES.map(([v, l]) => h("option", { value: v, selected: P.mode === v }, l)));
          sel.addEventListener("change", () => {
            P.mode = sel.value;
            savePB(api, pb).catch(() => {});
            drawAi();
            if (P.mode === "static") aiBox.querySelector('input[aria-label="모델 ID"]')?.focus();
          });
          return sel;
        })(),
        P.mode === "static" ? (() => {
          const mid = h("input", { class: "rb-input", "aria-label": "모델 ID", placeholder: "모델 ID (예: gpt-4o, claude-…)", value: P.staticModel ?? "" });
          mid.addEventListener("change", () => {
            P.staticModel = mid.value.trim();
            savePB(api, pb).catch(() => {});
          });
          return mid;
        })() : null),
      h("div", { class: "rb-pb-bar" },
        h("span", { class: "rb-label", style: "flex:none" }, "AI 프리셋"),
        aiSel,
        iconBtn("edit", "AI 프리셋 편집", { boxed: true, onClick: () => editAi(aip()) }),
        iconBtn("more", "AI 프리셋 메뉴", { boxed: true, onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
          { label: "새 AI 프리셋", icon: "plus", onClick: () => editAi({ ...DEFAULT_AI, id: newId(), name: "새 AI 프리셋" }, true) },
          { label: "복제", icon: "plus", onClick: () => editAi({ ...aip(), id: newId(), name: `${aip().name} 사본` }, true) },
          { label: "공유 코드 복사", icon: "link", onClick: async () => {
            await copyText(aiCode(aip()));
            ctx.toast("AI 프리셋 공유 코드를 복사했어요");
          } },
          { label: "공유 코드 가져오기", icon: "download", onClick: importCode },
          aip().id === "default" ? null : { label: "이 프리셋 지우기", icon: "trash", danger: true, onClick: async () => {
            if (!await confirmDialog(ctx.win, { title: `'${aip().name}'을(를) 지울까요?`, ok: "삭제", danger: true })) return;
            pb.ais = pb.ais.filter((a) => a.id !== pb.ai);
            pb.ai = "default";
            savePB(api, pb).catch(() => {});
            drawAi();
          } }
        ].filter(Boolean)) })),
      conceptIn,
      noteIn,
      h("div", { class: "rb-pb-bar" }, b1, b2, undoWrap, h("span", { style: "flex:1" }), h("label", { style: "display:flex;align-items:center;gap:6px;font-size:12.5px" }, koSw, "번역 같이 보기"), b4),
      h("div", { class: "rb-pb-bar" }, editIn, b3),
      msg
    );
    setBusy(busy);
    drawUndo();
  };

  // ── 시트: 섹션 = 폴더, 항목 = 칸 ──
  const sheet = h("div", { style: "display:flex;flex-direction:column;gap:8px" });
  const open = new Set(sections.filter((s) => s.kind !== "fixed").slice(0, 1).map((s) => s.title));
  const autoGrow = (ta) => {
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight + 2, 320)}px`;
  };
  const fieldBox = (k, label, hint, big, en = "", onRemove = null) => {
    const ta = h("textarea", { placeholder: hint || "", "aria-label": label, rows: big ? 6 : 1 });
    ta.value = values[k] ?? "";
    attachUndo(ta);
    const koEl = h("div", { class: "rb-pb-ko" });
    const paintKo = () => {
      const t = ko[k];
      const v = String(values[k] ?? "").trim();
      koEl.style.display = pb.showKo && t?.t && v ? "" : "none";
      if (t?.t) koEl.textContent = t.t;
      if (t && t.src !== v) koEl.setAttribute("data-stale", "");
      else koEl.removeAttribute("data-stale");
      koEl.title = t && t.src !== v ? "수정한 뒤의 번역이 아니에요 · '번역 새로 받기'로 다시 받아요" : "";
    };
    ta.addEventListener("input", () => {
      values[k] = ta.value;
      if (!ta.value.trim()) delete values[k];
      if (!big) autoGrow(ta);
      paintKo();
      persist();
      drawPreview();
    });
    paintKo();
    if (!big) requestAnimationFrame(() => autoGrow(ta));
    const mini = h("button", { type: "button", class: "rb-pb-mini", title: "이 칸만 AI로 고치기", onClick: () => askEdit(`'${label}' 칸 AI로 고치기`, [k]), disabled: busy }, "✦ AI");
    return h("div", { class: "rb-pb-f" }, h("div", { class: "lab" }, h("span", { title: en ? `설명에는 영어 이름 '${en}'으로 들어가요` : "" }, label), mini, onRemove ? h("button", { type: "button", class: "rb-pb-x", title: "이 항목을 양식에서 빼기", "aria-label": `${label} 항목 빼기`, onClick: onRemove }, "×") : null), ta, koEl);
  };
  const drawSheet = () => {
    replace(sheet, ...sections.map((s) => {
      const filled = s.kind === "fields" ? s.fields.filter((f) => String(values[fieldKey(s.title, f.label)] ?? "").trim()).length : s.kind === "free" ? +!!String(values[freeKey(s.title)] ?? "").trim() : 0;
      const total = s.kind === "fields" ? s.fields.length : s.kind === "free" ? 1 : 0;
      const det = h("details", { class: "rb-pb-sec", open: open.has(s.title), "data-off": !!off[s.title] });
      det.addEventListener("toggle", () => det.open ? open.add(s.title) : open.delete(s.title));
      const sw = switchEl(!off[s.title], { label: `${s.ko} 포함`, onChange: (v, el) => {
        setSwitch(el, v);
        if (v) delete off[s.title];
        else off[s.title] = true;
        det.toggleAttribute("data-off", !v);
        persist();
        drawPreview();
      } });
      const keys = s.kind === "fields" ? s.fields.map((f) => fieldKey(s.title, f.label)) : [freeKey(s.title)];
      const secAi = s.kind === "fixed" ? null : h("button", { type: "button", class: "rb-pb-mini", title: "이 섹션만 AI로 고치기", disabled: busy, onClick: (e) => {
        e.preventDefault();
        askEdit(`'${s.ko}' 폴더 AI로 고치기`, keys);
      } }, "✦ AI");
      det.append(
        h("summary", null, h("span", { style: "display:flex;color:var(--rb-sub)" }, "📁"), h("span", { class: "ttl", title: s.title }, s.ko), s.kind === "fixed" ? h("span", { class: "cnt" }, "고정 문구") : h("span", { class: "cnt" }, `${filled}/${total}`), secAi, sw),
        h("div", { class: "rb-pb-body" },
          s.kind === "fixed" ? h("div", { class: "rb-pb-fixed" }, h("div", { class: "rb-muted", style: "margin-bottom:6px" }, "AI에게 주는 규칙이에요. 영어 그대로 설명 맨 위에 들어가요. (양식 편집에서 바꿀 수 있어요)"), s.text) : s.kind === "free" ? fieldBox(freeKey(s.title), s.ko, s.hint ? `(${s.hint})` : "자유롭게", true, s.title) : s.fields.map((f) => fieldBox(fieldKey(s.title, f.label), f.ko, f.hint, false, f.label, () => dropField(s, f))),
          s.kind === "fixed" || s.kind === "free" ? null : h("button", { type: "button", class: "rb-pb-add", onClick: () => newField(s) }, `＋ '${s.ko}'에 항목 추가`),
          s.kind === "fixed" ? null : h("div", { style: "display:flex;justify-content:flex-end" }, h("button", { type: "button", class: "rb-pb-x", style: "font-size:12px;padding:3px 6px", onClick: () => dropSection(s) }, "이 폴더 양식에서 빼기")))
      );
      return det;
    }), h("button", { type: "button", class: "rb-pb-add", onClick: newSection }, "＋ 폴더 추가"));
    drawPreview();
  };

  // ── 양식에 항목·폴더 더하고 빼기 (지금 고른 양식이 바뀐다) ──
  const nameDialog = (title, koLabel, enLabel, enPh) => modal(ctx.win, (done) => {
    const ko = h("input", { class: "rb-input", placeholder: "예: 머리 모양", "aria-label": koLabel, "data-autofocus": "1" });
    const en = h("input", { class: "rb-input", placeholder: enPh, "aria-label": enLabel });
    const hint = h("input", { class: "rb-input", placeholder: "칸 안내 문구 (선택)", "aria-label": "안내 문구" });
    const ok = () => {
      const k = ko.value.replace(/[\[\]:#*]/g, "").trim(), e = en.value.replace(/[\[\]:#*]/g, "").trim();
      if (!k && !e) return ko.focus();
      done({ ko: k, en: e || k, hint: hint.value.trim() });
    };
    [ko, en, hint].forEach((x) => x.addEventListener("keydown", (ev) => ev.key === "Enter" && !ev.isComposing && ok()));
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true" },
      h("h3", { class: "rb-h3" }, title),
      h("span", { class: "rb-label" }, koLabel), ko,
      h("span", { class: "rb-label" }, `${enLabel} — 실제 설명에 들어가는 이름`), en,
      enLabel.includes("항목") ? hint : null,
      h("p", { class: "rb-p" }, `양식 '${tpl().name}'에 저장돼요. 영어 이름을 비우면 한글 이름이 그대로 들어가요.`),
      h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn("추가", { kind: "primary", onClick: ok })));
  });
  const changeTpl = (fn) => {
    const t = tpl();
    t.text = fn(t.text);
    useTemplate(t.id);
  };
  async function newField(s) {
    const r = await nameDialog(`'${s.ko}'에 항목 추가`, "항목 이름 (화면에 보여요)", "영어 항목 이름", "예: Hairstyle");
    if (!r) return;
    if (s.fields.some((f) => f.label.toLowerCase() === r.en.toLowerCase())) return ctx.toast("이미 있는 항목이에요", { error: true });
    open.add(s.title);
    changeTpl((t) => addField(t, s.title, r.en, r.ko !== r.en ? r.ko : "", r.hint));
  }
  async function dropField(s, f) {
    const k = fieldKey(s.title, f.label);
    if (!await confirmDialog(ctx.win, { title: `'${f.ko}' 항목을 양식에서 뺄까요?`, body: String(values[k] ?? "").trim() ? "적어 둔 내용도 함께 빠져요. (되돌리기 가능)" : "", ok: "빼기", danger: true })) return;
    snap();
    delete values[k];
    changeTpl((t) => removeField(t, s.title, f.label));
    drawUndo();
  }
  async function newSection() {
    const r = await nameDialog("폴더 추가", "폴더 이름 (화면에 보여요)", "영어 폴더 이름", "예: Relationships");
    if (!r) return;
    if (sections.some((x) => x.title.toLowerCase() === r.en.toLowerCase())) return ctx.toast("이미 있는 폴더예요", { error: true });
    open.add(r.en);
    changeTpl((t) => addSection(t, r.en, r.ko !== r.en ? r.ko : ""));
    ctx.toast(`'${r.ko || r.en}' 폴더를 만들었어요. 폴더를 열어 항목을 추가해 주세요.`);
  }
  async function dropSection(s) {
    if (!await confirmDialog(ctx.win, { title: `'${s.ko}' 폴더를 양식에서 뺄까요?`, body: "폴더 안 항목도 모두 빠져요. 다시 넣으려면 '양식 편집'에서 처음 상태로 되돌릴 수 있어요(기본 양식).", ok: "빼기", danger: true })) return;
    snap();
    changeTpl((t) => removeSection(t, s.title));
    drawUndo();
  }

  // ── 슬롯머신: 릴(칸)마다 범주 하나, 레버를 당기면 모든 릴이 같이 돌고 왼쪽부터 차례로 멈춘다 ──
  const rlBox = h("div", { class: "rb-pb-box" });
  const groups = [...new Set(ROULETTE.map((c) => c.group))];
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RH = 46; // 릴 한 줄 높이
  let spinning = false;
  const reelRow = h("div", { class: "rb-pb-reels" });
  const lever = h("button", { type: "button", class: "rb-pb-lever", title: "레버 당기기 (전부 돌리기)", "aria-label": "레버 당기기", onClick: () => spinAll() }, h("span", { class: "knob" }), h("span", { class: "rod" }));
  const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);
  const fillers = (cat, n) => {
    const it = catById(cat).items, out = [];
    while (out.length < n) out.push(...shuffle(it));
    return out.slice(0, n);
  };
  const reelEls = [];
  const setStrip = (el, list, idx, ms = 0) => {
    const strip = el.querySelector(".strip");
    replace(strip, ...list.map((x) => h("div", { class: "cell" }, x)));
    strip.style.transition = "none";
    strip.style.transform = `translateY(${-(idx - 1) * RH}px)`;
    return strip;
  };
  const spinReel = (i, order = 0) => new Promise((res) => {
    const sl = slots[i], el = reelEls[i];
    if (!sl || !el) return res();
    const winner = spin(sl.cat, sl.value);
    const n = 16 + order * 6;
    const list = [fillers(sl.cat, 1)[0], sl.value || "?", ...fillers(sl.cat, n), winner, fillers(sl.cat, 1)[0]];
    const end = list.length - 2;
    const done = () => {
      sl.value = winner;
      el.classList.remove("go");
      el.classList.add("hit");
      setTimeout(() => el.classList.remove("hit"), 700);
      res();
    };
    const strip = setStrip(el, list, 1);
    if (reduce()) {
      strip.style.transform = `translateY(${-(end - 1) * RH}px)`;
      return done();
    }
    const dur = 1100 + order * 380;
    strip.getBoundingClientRect();
    el.classList.add("go");
    requestAnimationFrame(() => {
      strip.style.transition = `transform ${dur}ms cubic-bezier(.25,.9,.3,1.06)`;
      strip.style.transform = `translateY(${-(end - 1) * RH}px)`;
    });
    setTimeout(() => el.classList.remove("go"), dur * 0.75);
    setTimeout(done, dur + 30);
  });
  const lockBtns = () => rlBox.querySelectorAll("button, select").forEach((b) => {
    if (!b.classList.contains("keep")) b.disabled = spinning;
  });
  async function spinAll(only = null) {
    if (spinning) return;
    const idx = only === null ? slots.map((s, i) => s.lock ? -1 : i).filter((i) => i >= 0) : [only];
    if (!idx.length) return say("모든 릴이 고정돼 있어요. 🔒를 풀어 주세요.");
    spinning = true;
    lockBtns();
    lever.classList.add("pull");
    setTimeout(() => lever.classList.remove("pull"), 450);
    await Promise.all(idx.map((i, k) => spinReel(i, k)));
    spinning = false;
    lockBtns();
    persist();
    drawSlots();
    rlBox.querySelector(".rb-pb-cab")?.classList.add("win");
    setTimeout(() => rlBox.querySelector(".rb-pb-cab")?.classList.remove("win"), 900);
  }
  const catSelect = (sl, i) => {
    const sel = h("select", { class: "rb-input", "aria-label": `${i + 1}번 릴 범주` }, ...groups.map((g) => h("optgroup", { label: `📁 ${g}` }, ...ROULETTE.filter((c) => c.group === g).map((c) => h("option", { value: c.id, selected: c.id === sl.cat }, c.ko)))));
    sel.addEventListener("change", () => {
      sl.cat = sel.value;
      sl.value = "";
      persist();
      drawSlots();
    });
    return sel;
  };
  const drawSlots = () => {
    reelEls.length = 0;
    replace(reelRow, ...slots.map((sl, i) => {
      const win = h("div", { class: "win", title: "이 릴만 돌리기", onClick: () => {
        if (spinning) return;
        sl.lock = false;
        spinAll(i);
      } }, h("div", { class: "strip" }));
      const el = h("div", { class: "rb-pb-reel", "data-lock": sl.lock },
        catSelect(sl, i),
        win,
        h("div", { class: "ops" },
          h("button", { type: "button", class: "rb-pb-mini", "aria-pressed": sl.lock ? "true" : "false", title: sl.lock ? "고정 풀기" : "고정하면 레버를 당겨도 안 돌아요", onClick: () => {
            sl.lock = !sl.lock;
            persist();
            drawSlots();
          } }, sl.lock ? "🔒 고정" : "🔓"),
          slots.length > 1 ? h("button", { type: "button", class: "rb-pb-x", title: "릴 빼기", "aria-label": `${i + 1}번 릴 빼기`, onClick: () => {
            slots.splice(i, 1);
            persist();
            drawSlots();
          } }, "×") : null));
      reelEls.push(el);
      const c = catById(sl.cat).items;
      setStrip(el, [c[(i * 7 + 3) % c.length], sl.value || "?", c[(i * 11 + 5) % c.length]], 1);
      return el;
    }));
    const picked = rouletteText(slots);
    rlBox.querySelectorAll("[data-need]").forEach((b) => b.disabled = spinning || !picked);
  };
  const useConcept = () => {
    concept = [concept.trim(), rouletteText(slots)].filter(Boolean).join("\n");
    conceptIn.value = concept;
    persist();
  };
  const fillFolder = (g) => {
    if (spinning) return;
    const cats = g === "*" ? shuffle(ROULETTE).slice(0, 5) : ROULETTE.filter((c) => c.group === g);
    const kept = slots.filter((s) => s.lock);
    slots = [...kept, ...cats.filter((c) => !kept.some((k) => k.cat === c.id)).map((c) => ({ cat: c.id, value: "", lock: false }))].slice(0, 10);
    persist();
    drawSlots();
  };
  const need = (b) => {
    b.dataset.need = "1";
    return b;
  };
  const drawRoulette = () => {
    replace(rlBox,
      h("div", { class: "rb-pb-h" }, "🎰 슬롯머신", h("span", { class: "rb-muted", style: "font-weight:500;font-size:12px" }, "· 릴마다 범주를 고르고 레버를 당겨요. 릴을 누르면 그 릴만 돌아요")),
      h("div", { class: "rb-pb-folders" }, h("span", { class: "rb-label" }, "폴더로 채우기"),
        ...groups.map((g) => h("button", { type: "button", class: "rb-pb-chip", title: ROULETTE.filter((c) => c.group === g).map((c) => c.ko).join(", "), onClick: () => fillFolder(g) }, `📁 ${g} (${ROULETTE.filter((c) => c.group === g).length})`)),
        h("button", { type: "button", class: "rb-pb-chip", onClick: () => fillFolder("*") }, "🎲 무작위 5개")),
      h("div", { class: "rb-pb-cab" }, h("div", { class: "lights", "aria-hidden": "true" }), reelRow, lever),
      h("div", { class: "rb-pb-bar" },
        btn("레버 당기기", { kind: "primary", size: "sm", icon: "refresh", onClick: () => spinAll() }),
        btn("릴 추가", { size: "sm", icon: "plus", onClick: () => {
          if (slots.length >= 10) return ctx.toast("릴은 10개까지예요");
          const used = new Set(slots.map((x) => x.cat));
          slots.push({ cat: (ROULETTE.find((c) => !used.has(c.id)) ?? ROULETTE[0]).id, value: "", lock: false });
          persist();
          drawSlots();
        } }),
        h("span", { style: "flex:1" }),
        need(btn("콘셉트에 넣기", { size: "sm", icon: "plus", onClick: () => {
          useConcept();
          say("슬롯 결과를 콘셉트에 넣었어요. '전체 쓰기'나 '빈 칸만 채우기'를 눌러 보세요.");
        } })),
        need(btn("이걸로 전체 쓰기", { size: "sm", icon: "zap", onClick: () => {
          useConcept();
          aiDo("슬롯 결과로 AI가 페르소나를 쓰는 중…", "draft");
        } }))));
    drawSlots();
  };

  // ── 미리보기 · 저장 ──
  const pre = h("pre", { class: "rb-pb-pre" });
  const charCount = h("span", { class: "rb-muted", style: "font-size:12px" });
  const drawPreview = () => {
    const t = compose(sections, values, off);
    pre.textContent = t || "(아직 비어 있어요)";
    charCount.textContent = `${t.length.toLocaleString()}자`;
  };
  async function save(asNew) {
    const text = compose(sections, values, off);
    if (!hasAny()) return ctx.toast("칸을 하나 이상 채워 주세요", { error: true });
    await loadPersonas();
    const db = await api.getDatabase(["personas"]);
    const list = [...db?.personas ?? []];
    const nm = name.trim() || "새 페르소나";
    if (!asNew && target) {
      const i = list.findIndex((p) => p?.id === target);
      if (i < 0) return ctx.toast("페르소나를 찾지 못했어요. 새 페르소나로 저장해 주세요.", { error: true });
      if (!await confirmDialog(ctx.win, { title: `'${list[i].name}'의 설명을 바꿀까요?`, body: "지금 설명은 백업해 두고, 저장 뒤 바로 되돌릴 수 있어요.", ok: "덮어쓰기" })) return;
      const before = { id: target, name: list[i].name, personaPrompt: list[i].personaPrompt ?? "" };
      await pushBackup(api, before);
      list[i] = { ...list[i], personaPrompt: text, name: nm };
      await api.setDatabaseLite({ personas: list });
      ctx.toast(`'${nm}'에 저장했어요`, { seconds: 8, action: { label: "되돌리기", run: async () => {
        const cur = [...(await api.getDatabase(["personas"]))?.personas ?? []];
        const j = cur.findIndex((p) => p?.id === before.id);
        if (j < 0) return;
        cur[j] = { ...cur[j], personaPrompt: before.personaPrompt, name: before.name };
        await api.setDatabaseLite({ personas: cur });
        ctx.toast("되돌렸어요");
      } } });
    } else {
      const id = crypto.randomUUID?.() ?? newId() + newId();
      list.push({ personaPrompt: text, name: nm, icon: "", largePortrait: false, id, note: "" });
      await api.setDatabaseLite({ personas: list });
      target = id;
      ctx.toast(`새 페르소나 '${nm}'을(를) 만들었어요. 리스의 페르소나 목록에서 고를 수 있어요.`, { seconds: 8 });
    }
    await loadPersonas();
    drawPersonaSel();
    persist();
  }
  async function showBackups() {
    const list = await loadBackups(api);
    if (!list.length) return ctx.toast("덮어쓰기 전 백업이 아직 없어요");
    await modal(ctx.win, (done) => h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(620px,94vw)" },
      h("h3", { class: "rb-h3" }, "덮어쓰기 전 설명 (최근 20개)"),
      h("div", { style: "display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow:auto" }, list.map((b) => h(
        "details",
        { class: "rb-pb-sec" },
        h("summary", null, h("span", { class: "ttl" }, b.name || "(이름 없음)"), h("span", { class: "cnt" }, new Date(b.at).toLocaleString())),
        h("div", { class: "rb-pb-body" }, h("pre", { class: "rb-pb-pre" }, b.personaPrompt || "(비어 있음)"), h("div", { class: "rb-pb-bar" },
          btn("칸으로 불러오기", { size: "sm", onClick: () => {
            snap();
            values = readValues(sections, b.personaPrompt);
            ko = {};
            persist();
            drawSheet();
            drawUndo();
            done(null);
          } }),
          btn("복사", { size: "sm", onClick: async () => {
            await copyText(b.personaPrompt ?? "");
            ctx.toast("복사했어요");
          } })))
      ))),
      h("div", { class: "btns" }, btn("닫기", { onClick: () => done(null) }))
    ));
  }

  const back = h("div", { style: "display:flex;align-items:center;gap:10px" }, btn("", { kind: "ghost", icon: "back", onClick: () => ctx.go("work-home") }), h("div", null, h("span", { class: "rb-muted" }, "작업실"), h("h2", { class: "rb-h2" }, "AI로 페르소나 만들기")));
  back.querySelector("button").setAttribute("aria-label", "도구로 돌아가기");
  drawPersonaSel();
  drawTplSel();
  drawAi();
  drawSheet();
  drawRoulette();
  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1" },
    h("div", { class: "rb-pb" },
      back,
      h("div", { class: "rb-pb-box" },
        h("div", { class: "rb-pb-h" }, "페르소나"),
        h("div", { class: "rb-pb-bar" }, personaSel, nameIn),
        h("div", { class: "rb-pb-bar" }, h("span", { class: "rb-label", style: "flex:none" }, "설명 양식"), tplSel, tplMenu)),
      aiBox,
      rlBox,
      sheet,
      h("div", { class: "rb-pb-box" },
        h("div", { class: "rb-pb-h" }, "미리보기", charCount, h("span", { style: "flex:1" }), btn("복사", { size: "sm", onClick: async () => {
          await copyText(compose(sections, values, off));
          ctx.toast("복사했어요");
        } })),
        pre,
        h("div", { class: "rb-pb-bar" },
          btn("백업 보기", { size: "sm", icon: "history", onClick: showBackups }),
          h("span", { style: "flex:1" }),
          btn("새 페르소나로 저장", { size: "sm", icon: "plus", onClick: () => save(true).catch((e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true })) }),
          btn("이 페르소나에 저장", { size: "sm", kind: "primary", icon: "check", onClick: () => target ? save(false).catch((e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true })) : save(true).catch((e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true })) })),
        note("info", "AI 결과는 항상 영어예요. 번역은 확인용이라 저장되지 않아요. 꺼진 섹션과 빈 칸은 설명에 들어가지 않아요.")),
      h("div", { style: "margin:6px 0 4px;text-align:center;font-size:11px;line-height:1.6;color:var(--rb-mute)" },
        "🪶 Special thanks · ",
        h("a", { href: "https://arca.live/b/characterai/179512405/995597043#c_995597043", target: "_blank", rel: "noopener noreferrer", style: "color:inherit;font-weight:700;text-decoration:underline" }, "홍루"),
        "님 — 기본 양식(페르소나 프롬프트)의 바탕을 만드는 데 도움을 주셨어요")
    )
  ));
}
