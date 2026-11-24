// 장기기억 애드온(0.3.22): 인물 일기 — 고른 인물의 시점으로 최근 일을 한 단락 회고한다(누를 때만 AI 1번).
// 결과는 이 채팅 기억 폴더(folder.extra.diary)에 두고, 가장 최근 AI 응답 맨 아래(게이지 박스 자리 = 로어북·주사위 위)에 보여 준다.
import { runAITask } from "../engine/runai.js";
import { pickForStage } from "./modelhub.js";
import { extraOf, nk } from "../engine/memextra.js";
import { extractMessageText, isUserMessage } from "../engine/chattext.js";
import { cleanForMemory } from "../engine/cleantext.js";
import { lifeView, todayLine } from "../engine/nsfwlife.js";

export const DIARY_MAX = 30;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// 메시지 글에서 매칭용 조각(가운데쯤 40자, 공백 없앰)
export function snipOf(t) { const s = nk(cleanForMemory(String(t ?? ""))); if (s.length < 12) return s; const mid = Math.floor(s.length / 2); return s.slice(Math.max(0, mid - 20), mid + 20); }

// 순수: 일기 지시문
export function diaryPrompt(folder, doc, { recent = "", lang = "ko" } = {}) {
  const names = new Set([doc.title, ...(doc.aliases ?? [])].map(nk));
  const person = Object.entries(folder?.people ?? {}).find(([k, p]) => names.has(nk(k)) || names.has(nk(p?.name)))?.[1];
  const recs = (person?.records ?? []).filter((r) => !r.orphan).slice(-12).map((r) => `- ${r.act ?? r.t ?? ""}`).filter((x) => x.length > 3).join("\n");
  const e = extraOf(folder), goals = (e.goals[nk(doc.title)]?.list ?? []).filter((x) => x.status === "active").map((x) => `${x.goal}(${x.prog ?? 0}%)`).join(", ");
  const turn = Number.isInteger(folder?.cursor?.at) ? folder.cursor.at : 0;
  let today = ""; try { const v = lifeView(folder, doc, turn); today = v ? todayLine(v, true) : ""; } catch { today = ""; }
  const heard = e.rumors.filter((r) => names.has(nk(r.to))).slice(-3).map((r) => `${r.from}에게 들은 말: ${r.info}`).join("; ");
  const sys = [`You write a short private diary entry in the first person as ${doc.title}.`,
    "Stay in character: their voice, feelings and what THEY know only (never things they did not witness or hear).",
    `Write in ${lang === "ko" ? "Korean" : "the story's language"}, 4-7 sentences, one paragraph, no title, no date line, no quotes around it, no meta talk.`,
    "Reflect on the latest events and how they feel about the people involved; hint at hopes or worries. Do not invent big new facts."].join("\n");
  const user = [`[${doc.title}의 기억]`, recs || "(기록 적음)", goals && `[지금 이루려는 것] ${goals}`, today && `[오늘 몸과 마음] ${today}`, heard && `[전해 들은 말] ${heard}`, `[방금 일어난 일]`, String(recent).slice(-2400)].filter(Boolean).join("\n");
  return [{ role: "system", content: sys }, { role: "user", content: user }];
}

// AI로 일기를 쓰고 폴더에 저장. 반환 {text, name}
export async function writeDiary(api, store, { chaId, chatId, chat, doc, folder, signal = null }) {
  const msgs = chat?.message ?? [];
  let lastAi = -1; for (let i = msgs.length - 1; i >= 0; i--) if (!isUserMessage(msgs[i])) { lastAi = i; break; }
  if (lastAi < 0) throw new Error("아직 AI 응답이 없어요. 응답이 하나 있어야 그 아래에 일기를 붙여요.");
  const recent = msgs.slice(Math.max(0, lastAi - 3), lastAi + 1).map((m) => `${isUserMessage(m) ? "{{user}}" : "AI"}: ${cleanForMemory(extractMessageText(m))}`).join("\n");
  const raw = await runAITask(`인물 일기 · ${doc.title}`, api, diaryPrompt(folder, doc, { recent }), await pickForStage(api, "writer"), signal);
  const text = String(raw ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim().replace(/^["“]|["”]$/g, "").slice(0, 1200);
  if (!text) throw new Error("일기 내용이 비어 있어요. 다시 시도해 주세요.");
  const entry = { name: doc.title, docId: doc.id, text, at: lastAi, snip: snipOf(extractMessageText(msgs[lastAi])), ts: Date.now() };
  await store.updateFolder(chaId, chatId, (f) => { const e = extraOf(f); e.diary = [...e.diary.filter((d) => !(d.at === lastAi && d.docId === doc.id)), entry].slice(-DIARY_MAX); f.extra = e; });
  return entry;
}

// 화면: 응답 글(text)에 맞는 일기가 있으면 그 아래에 붙인다(게이지 박스 자리)
export function diaryHtml(list) {
  return list.map((d) => `<div x-dusk="diary" style="margin:10px 0 4px;padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(236,79,134,.07),rgba(155,127,224,.07));border:1px solid rgba(155,127,224,.25);font-size:.92em;line-height:1.6">`
    + `<div style="font-size:.78em;font-weight:700;letter-spacing:.04em;opacity:.7;margin-bottom:4px">📔 ${esc(d.name)}의 일기</div>`
    + `<div style="white-space:pre-wrap;font-style:italic">${esc(d.text)}</div></div>`).join("");
}
export function createDiaryDisplay(memory) {
  let cache = null, key = "", loading = null, checked = 0;
  const load = async () => {
    if (cache && Date.now() - checked < 3000) return;   // 메시지마다 불리므로 3초에 한 번만 지금 채팅을 다시 본다
    const cur = await memory?.switches?.currentChat?.().catch?.(() => null); if (!cur) { cache = []; key = ""; checked = Date.now(); return; }
    const k = `${cur.chaId}|${cur.chatId}`; if (k === key && cache) { checked = Date.now(); return; }
    const f = await memory.store.getFolder(cur.chaId, cur.chatId).catch(() => null);
    cache = extraOf(f).diary; key = k; checked = Date.now();   // 신고 #11: 시각은 다 읽은 뒤에
  };
  return {
    invalidate() { cache = null; key = ""; checked = 0; },
    async onDisplay(text) {
      try {
        if (typeof text !== "string" || text.includes('x-dusk="diary"')) return text;
        loading ??= load().finally(() => { loading = null; }); await loading;
        if (!cache?.length) return text;
        const s = nk(cleanForMemory(text)), hit = cache.filter((d) => d.snip && s.includes(d.snip));
        return hit.length ? text + diaryHtml(hit) : text;
      } catch { return text; }
    },
  };
}
