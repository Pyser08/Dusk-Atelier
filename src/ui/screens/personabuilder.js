// 페르소나 빌더 화면: 양식(프리셋)의 ### 섹션 = 폴더, * 항목 = 칸.
// AI 없이 손으로 채우거나, AI 프리셋(모델·추가 지시·번역)으로 전체/빈 칸/부분 고치기.
// AI 출력은 영어 고정, 번역은 보기용(저장되지 않음).
import { copyText, h, replace } from '../dom.js';
import { btn, iconBtn, confirmDialog, promptDialog, modal, note, openMenu, switchEl, setSwitch } from '../kit.js';
import { attachUndo } from '../undo.js';
import { AI_MODES, runAI } from '../../engine/merge.js';
import { parseTemplate, compose, readValues, buildPrompt, translatePrompt, fieldKey, freeKey, loadPB, savePB, pushBackup, loadBackups, newId, templateCode, aiCode, readCode, DEFAULT_AI } from '../../data/personabuilder.js';

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
  const undo = [];
  let busy = false;
  const tpl = () => pb.templates.find((t) => t.id === pb.template) ?? pb.templates[0];
  const aip = () => pb.ais.find((a) => a.id === pb.ai) ?? pb.ais[0];
  let sections = parseTemplate(tpl().text);

  let saveT = null;
  const persist = () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      pb.draft = { target, name, values, off, ko, concept };
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
  const editIn = h("input", { class: "rb-input", style: "height:36px;flex:1;min-width:160px", placeholder: "켜진 섹션 전체에 적용할 수정 요청 (예: 더 냉소적으로)", "aria-label": "AI 수정 요청" });
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
    const { messages, target: tg } = buildPrompt({ sections, values, off, task, keys, concept: extraConcept, instruction, extra: P.extra });
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
    editIn.onkeydown = (e) => e.key === "Enter" && !e.isComposing && b3.click();
    replace(
      aiBox,
      h("div", { class: "rb-pb-h" }, "AI로 쓰기", h("span", { class: "rb-muted", style: "font-weight:500;font-size:12px" }, `· ${AI_MODES.find(([v]) => v === P.mode)?.[1] ?? ""}${P.mode === "static" ? ` ${P.staticModel || "(ID 없음)"}` : ""} · 영어로 써요`)),
      h("div", { class: "rb-pb-bar" },
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
  const fieldBox = (k, label, hint, big) => {
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
    return h("div", { class: "rb-pb-f" }, h("div", { class: "lab" }, h("span", null, label), mini), ta, koEl);
  };
  const drawSheet = () => {
    replace(sheet, ...sections.map((s) => {
      const filled = s.kind === "fields" ? s.fields.filter((f) => String(values[fieldKey(s.title, f.label)] ?? "").trim()).length : s.kind === "free" ? +!!String(values[freeKey(s.title)] ?? "").trim() : 0;
      const total = s.kind === "fields" ? s.fields.length : s.kind === "free" ? 1 : 0;
      const det = h("details", { class: "rb-pb-sec", open: open.has(s.title), "data-off": !!off[s.title] });
      det.addEventListener("toggle", () => det.open ? open.add(s.title) : open.delete(s.title));
      const sw = switchEl(!off[s.title], { label: `${s.title} 포함`, onChange: (v, el) => {
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
        askEdit(`'${s.title}' 섹션 AI로 고치기`, keys);
      } }, "✦ AI");
      det.append(
        h("summary", null, h("span", { style: "display:flex;color:var(--rb-sub)" }, "📁"), h("span", { class: "ttl" }, s.title), s.kind === "fixed" ? h("span", { class: "cnt" }, "고정 문구") : h("span", { class: "cnt" }, `${filled}/${total}`), secAi, sw),
        h("div", { class: "rb-pb-body" }, s.kind === "fixed" ? h("div", { class: "rb-pb-fixed" }, s.text, h("div", { class: "rb-muted", style: "margin-top:6px" }, "양식 편집에서 바꿀 수 있어요.")) : s.kind === "free" ? fieldBox(freeKey(s.title), s.title, s.hint ? `(${s.hint})` : "자유롭게", true) : s.fields.map((f) => fieldBox(fieldKey(s.title, f.label), f.label, f.hint, false)))
      );
      return det;
    }));
    drawPreview();
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

  const back = h("div", { style: "display:flex;align-items:center;gap:10px" }, btn("", { kind: "ghost", icon: "back", onClick: () => ctx.go("tools") }), h("div", null, h("span", { class: "rb-muted" }, "도구"), h("h2", { class: "rb-h2" }, "페르소나 빌더")));
  back.querySelector("button").setAttribute("aria-label", "도구로 돌아가기");
  drawPersonaSel();
  drawTplSel();
  drawAi();
  drawSheet();
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
        note("info", "AI 결과는 항상 영어예요. 번역은 확인용이라 저장되지 않아요. 꺼진 섹션과 빈 칸은 설명에 들어가지 않아요."))
    )
  ));
}
