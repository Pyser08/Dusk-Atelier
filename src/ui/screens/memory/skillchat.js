// AI로 스킬 만들기(v1.8.1): 코코아 탭 우하단 버튼 → AI와 대화하며 스킬 초안을 실시간으로 만든다.
// 시스템 글은 SKILL_GUIDE 원문 + 출력 규칙(engine/skillchat.js). 메시지 한 번에 AI 호출 한 번.
import { h, replace } from "../../dom.js";
import { btn, iconBtn, confirmDialog, promptDialog } from "../../kit.js";
import { runAI } from "../../../engine/runai.js";
import { loadPB } from "../../../data/personabuilder.js";
import { SKILL_GUIDE } from "../../../data/skillguide.js";
import { extractSkillFiles, stripSkillFiles, mergeDraft, draftToSet, skillChatSystem, trimChat } from "../../../engine/skillchat.js";
import { saveBlob } from "./skills.js";

const HELLO = "어떤 스킬을 만들고 싶으신가요? 예를 들어 ‘전투 판정 규칙’, ‘감정 변화 추적’처럼 한 줄로 알려 주시면 필요한 걸 물어보면서 같이 만들어 갈게요. 만드는 동안 아래 ‘초안’에 파일이 실시간으로 쌓여요.";

// noFab: 떠 있는 버튼 없이 열기 함수만 돌려준다(코코아 목록 머리의 'AI로 만들기'가 연다 — 모바일 탭바와 겹치지 않게, 1.8.3).
export function mountSkillChat(ctx, { onSaved, noFab = false } = {}) {
  const S = ctx.skills; if (!S) return;
  const st = (ctx.state.skillChat ??= { open: false, msgs: [], draft: [], file: "", ai: "", ais: null, busy: false, ctrl: null });
  const fab = btn("AI로 스킬 만들기", { kind: "primary", icon: "message-circle", onClick: () => toggle(!st.open) });
  fab.className += " rb-pb-chat-fab rb-sk-fab"; fab.setAttribute("aria-expanded", st.open ? "true" : "false");
  const log = h("div", { class: "rb-pb-chat-log", "aria-live": "polite" });
  const input = h("textarea", { class: "rb-pb-chat-input", rows: 1, placeholder: "만들고 싶은 스킬을 알려 주세요", "aria-label": "AI 스킬 대화 입력" });
  const send = btn("", { kind: "primary", icon: "arrow-up", onClick: () => sendMsg() }); send.className += " rb-pb-chat-send";
  const draftBox = h("div", { class: "rb-sk-draft" });
  const sel = h("select", { class: "rb-input rb-sk-ai", "aria-label": "AI 모델", onChange: () => { st.ai = sel.value; } });
  const panel = h("section", { class: "rb-pb-chat rb-sk-chat", role: "region", "aria-label": "AI 스킬 만들기", hidden: !st.open },
    h("header", { class: "rb-pb-chat-head" },
      h("div", { class: "rb-pb-chat-brand" }, h("span", { class: "rb-pb-chat-mark" }, "✳"), h("div", null, h("b", null, "스킬 도우미"), h("small", null, "코코아전트 스킬 규격으로 함께 만들어요"))),
      sel, iconBtn("x", "대화 닫기", { onClick: () => toggle(false) })),
    log, draftBox,
    h("div", { class: "rb-pb-chat-compose" }, input, send),
    h("p", { class: "rb-pb-chat-hint" }, "메시지를 보낼 때마다 AI 호출이 한 번 생겨요 · ⌘/Ctrl + Enter로 전송"));
  if (noFab) ctx.main.append(panel); else ctx.main.append(panel, fab);

  async function loadAis() {
    if (!st.ais) st.ais = await loadPB(ctx.api).then((d) => { st.ai ||= d.ai; return d.ais; }).catch(() => [{ id: "default", name: "기본", mode: "submodel" }]);
    st.ai ||= st.ais[0]?.id;
    replace(sel, ...st.ais.map((a) => h("option", { value: a.id, selected: a.id === st.ai }, a.name)));
  }
  const pick = () => st.ais?.find((a) => a.id === st.ai) ?? st.ais?.[0];
  function toggle(open) {
    st.open = open; panel.hidden = !open; fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { loadAis(); paint(); setTimeout(() => input.focus(), 0); }
  }
  function paint() {
    const bubbles = [{ role: "assistant", content: HELLO, shown: HELLO }, ...st.msgs.map((m) => ({ ...m, shown: m.role === "user" ? m.content : (stripSkillFiles(m.content) || "(초안을 갱신했어요)") }))];
    replace(log, ...bubbles.map((m) => h("div", { class: "rb-pb-chat-msg " + (m.role === "user" ? "user" : "assistant") },
      m.role === "user" ? h("div", { class: "bubble" }, m.content) : h("div", { class: "answer" }, m.shown, m.files ? h("div", { class: "rb-sk-upd" }, `초안 갱신 · 파일 ${m.files}개`) : null))),
      st.busy ? h("div", { class: "rb-pb-chat-msg assistant" }, h("div", { class: "answer rb-muted" }, "생각하는 중…")) : null);
    log.scrollTop = log.scrollHeight; send.disabled = st.busy; paintDraft();
  }
  function paintDraft() {
    if (!st.draft.length) return replace(draftBox, h("p", { class: "rb-muted rb-sk-empty" }, "초안: 아직 없어요. 대화하다 보면 여기에 파일이 쌓여요."));
    const file = st.draft.find((f) => f.path === st.file) ?? st.draft[0], { diag } = draftToSet(st.draft);
    const warn = diag.filter((d) => d.level === "warn");
    const pre = h("pre", { class: "rb-sk-pre" }); pre.textContent = file.content;
    replace(draftBox, h("details", { class: "rb-sk-det", open: true },
      h("summary", null, `초안 · 파일 ${st.draft.length}개`, warn.length ? h("span", { class: "rb-sk-warn" }, ` ⚠ ${warn.length}`) : null),
      h("div", { class: "rb-chips" }, st.draft.map((f) => h("button", { type: "button", class: "rb-chip", "aria-pressed": f.path === file.path ? "true" : "false", onClick: () => { st.file = f.path; paintDraft(); } }, f.path))),
      pre,
      warn.length ? h("ul", { class: "rb-muted rb-sk-diag" }, warn.map((d) => h("li", null, d.text))) : null,
      h("div", { class: "rb-sk-bar rb-sk-acts" }, btn("라이브러리에 추가", { size: "sm", kind: "primary", onClick: saveDraft }), btn("ZIP", { size: "sm", onClick: exportDraft("zip") }), btn("JSON", { size: "sm", onClick: exportDraft("json") }), btn("초안 지우기", { size: "sm", onClick: clearDraft }))));
  }
  const exportDraft = (kind) => () => { const { set } = draftToSet(st.draft); saveBlob(ctx, `${set.name}.${kind}`, kind === "zip" ? S.zipOfSet(set) : S.exportSet(set), kind === "zip" ? "application/zip" : "application/json"); };
  async function clearDraft() { if (await confirmDialog(ctx.win, { title: "초안을 지울까요?", body: "대화는 남고 초안 파일만 비워요.", ok: "지우기", cancel: "취소", danger: true })) { st.draft = []; st.file = ""; paintDraft(); } }
  async function saveDraft() {
    try {
      let { set } = draftToSet(st.draft);
      const lib = await S.getLibrary(), exists = lib.sets.some((x) => x.name.toLowerCase() === set.name.toLowerCase());
      let mode = "new";
      if (exists) {
        const over = await confirmDialog(ctx.win, { title: `'${set.name}' 세트가 이미 있어요`, body: "덮어쓰면 기존 내용이 바뀌어요. ‘취소’를 누르면 다른 이름을 정해요.", ok: "덮어쓰기", cancel: "취소" });
        if (over) mode = "overwrite";
        else { const name = (await promptDialog(ctx.win, { title: "다른 이름으로 추가", label: "세트 이름", ok: "추가" }))?.trim(); if (!name) return; set = draftToSet(st.draft, name).set; }
      }
      const r = await S.importSet(set, mode);
      if (r.error) throw new Error(r.error);
      ctx.toast(`‘${set.name}’ 세트를 라이브러리에 넣었어요.`); onSaved?.();
    } catch (e) { ctx.toast(String(e?.message ?? e)); }
  }
  async function sendMsg() {
    const text = input.value.trim(); if (!text || st.busy) return;
    await loadAis(); st.msgs.push({ role: "user", content: text }); input.value = ""; st.busy = true; paint();
    try {
      const lib = await S.getLibrary(), system = skillChatSystem(SKILL_GUIDE, st.draft, { existing: lib.sets.map((x) => x.name) });
      const out = String(await runAI(ctx.api, [{ role: "system", content: system }, ...trimChat(st.msgs).map(({ role, content }) => ({ role, content }))], pick()) ?? "").trim();
      const files = extractSkillFiles(out);
      st.msgs.push({ role: "assistant", content: out || "응답이 비어 있어요.", files: files.length || 0 });
      if (files.length) { st.draft = mergeDraft(st.draft, files); if (!st.draft.some((f) => f.path === st.file)) st.file = files[0].path; }
    } catch (e) { st.msgs.push({ role: "assistant", content: "오류: " + (e?.message ?? String(e)) }); }
    finally { st.busy = false; paint(); input.focus(); }
  }
  input.addEventListener("keydown", (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") { ev.preventDefault(); sendMsg(); } });
  if (st.open) { loadAis(); paint(); } else paintDraft();
  return { open: () => toggle(true), close: () => toggle(false) };
}
