// v1.8.2 에셋 태그 고치기(도구 탭, 사용자가 누를 때만): 지금 열린 채팅 읽기 · 고친 응답 저장 · 되돌리기.
// 저장된 채팅을 바꾸는 유일한 경로라 ① 미리보기에서 고른 것만 ② 미리보기 뒤 사용자가 고친 응답은 건너뛰고 ③ 되돌리기 기록을 남긴다.
// 장기기억은 메시지를 '본문 전체 해시'로 알아보므로, 바뀐 응답의 식별자를 새 것으로 옮겨 다시 분석·연결 끊김을 막는다.
import { extractMessageText, isUserMessage, messageIdentity } from "../engine/chattext.js";
import { renameIds } from "../engine/assetfix.js";
import { chatKeyOf } from "../engine/chatkey.js";

export const UNDO_KEY = "dusk.assetfix.undo.v1";
const TEXT_FIELDS = ["data", "content", "text", "mes", "message"];
const BEFORE = 3;

async function openChat(api) {
  const ci = await api.getCurrentCharacterIndex?.(), ti = await api.getCurrentChatIndex?.();
  if (typeof ci !== "number" || ci < 0 || typeof ti !== "number" || ti < 0) throw new Error("열린 채팅이 없어요. 리스에서 채팅을 연 뒤 다시 눌러 주세요.");
  const character = await api.getCharacterFromIndex(ci);
  const chat = (typeof api.getChatFromIndex === "function" ? await api.getChatFromIndex(ci, ti) : null) ?? character?.chats?.[ti];
  if (!chat || !Array.isArray(chat.message)) throw new Error("채팅을 읽지 못했어요.");
  return { ci, ti, character, chat, chaId: String(character?.chaId ?? ci), chatId: chatKeyOf(chat, ti) };
}

// 마지막 n개 AI 응답(오래된 것 → 최신)과 그 앞 응답 몇 개(직전 옷 기억용)
export async function loadRange(api, n) {
  const o = await openChat(api);
  const ai = [];
  o.chat.message.forEach((m, i) => { if (!isUserMessage(m) && extractMessageText(m).trim()) ai.push({ key: i, text: extractMessageText(m) }); });
  const count = Math.max(1, Math.min(200, Math.floor(Number(n) || 1)));
  const picks = ai.slice(-count), first = ai.length - picks.length;
  return { ci: o.ci, ti: o.ti, chaId: o.chaId, chatId: o.chatId, picks, before: ai.slice(Math.max(0, first - BEFORE), first).map((p) => p.text) };
}

const fieldOf = (m, text) => TEXT_FIELDS.find((f) => typeof m?.[f] === "string" && m[f] === text) ?? null;

async function moveMemory(store, chaId, chatId, map) {
  if (!store || !map.size) return 0;
  try {
    if (!(await store.getFolder(chaId, chatId))) return 0;   // 기억 폴더가 없으면 새로 만들지 않는다
    let n = 0;
    await store.updateFolder(chaId, chatId, (f) => { n = renameIds(f, map); });
    return n;
  } catch (e) { console.log("[Dusk 에셋 고치기] 기억 연결 옮기기 실패", e?.message ?? e); return 0; }
}

// changes: [{ key(메시지 번호), before, after }] → { changed, skipped, memory }
export async function applyFix(api, store, range, changes) {
  const o = await openChat(api);
  if (o.chaId !== range.chaId || o.chatId !== range.chatId) throw new Error("검사한 뒤 다른 채팅으로 바뀌었어요. 다시 검사해 주세요.");
  const message = [...o.chat.message], map = new Map(), undo = [];
  let skipped = 0;
  for (const c of changes ?? []) {
    const m = message[c.key], f = fieldOf(m, c.before);
    if (!f || c.after === c.before) { skipped++; continue; }   // 미리보기 뒤에 바뀐 응답은 건드리지 않는다
    const next = { ...m, [f]: c.after };
    message[c.key] = next;
    map.set(messageIdentity(m), messageIdentity(next));
    undo.push({ key: c.key, mid: m?.chatId ?? null, field: f, before: c.before, after: c.after });
  }
  if (!undo.length) return { changed: 0, skipped, memory: 0 };
  await api.setChatToIndex(o.ci, o.ti, { ...o.chat, message });
  const memory = await moveMemory(store, o.chaId, o.chatId, map);
  try { await api.pluginStorage.setItem(UNDO_KEY, JSON.stringify({ at: Date.now(), chaId: o.chaId, chatId: o.chatId, items: undo })); } catch { /* 되돌리기 기록 실패는 적용을 막지 않는다 */ }
  return { changed: undo.length, skipped, memory };
}

export async function lastUndo(api) {
  try { const raw = await api.pluginStorage.getItem(UNDO_KEY); const r = typeof raw === "string" ? JSON.parse(raw) : raw; return r?.items?.length ? r : null; } catch { return null; }
}

// 마지막 적용을 되돌린다(그 채팅이 열려 있어야 함). 그 뒤에 다시 고친 응답은 건너뛴다.
export async function undoFix(api, store) {
  const rec = await lastUndo(api);
  if (!rec) throw new Error("되돌릴 기록이 없어요.");
  const o = await openChat(api);
  if (o.chaId !== rec.chaId || o.chatId !== rec.chatId) throw new Error("고쳤던 채팅을 연 뒤 되돌려 주세요.");
  const message = [...o.chat.message], map = new Map();
  let restored = 0, skipped = 0;
  for (const it of rec.items) {
    let i = it.mid ? message.findIndex((m) => m?.chatId === it.mid) : -1;
    if (i < 0) i = it.key;
    const m = message[i];
    if (!m || m[it.field] !== it.after) { skipped++; continue; }
    const prev = { ...m, [it.field]: it.before };
    message[i] = prev;
    map.set(messageIdentity(m), messageIdentity(prev));
    restored++;
  }
  if (restored) {
    await api.setChatToIndex(o.ci, o.ti, { ...o.chat, message });
    await moveMemory(store, o.chaId, o.chatId, map);
  }
  try { await api.pluginStorage.setItem(UNDO_KEY, ""); } catch { /* 무시 */ }
  return { restored, skipped };
}
