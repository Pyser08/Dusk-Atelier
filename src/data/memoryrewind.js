// 저장된 기억으로 새 채팅 만들기. 원본 채팅·봇 데이터는 수정하지 않고 새 채팅만 추가한다.
import { newId } from "../engine/util.js";
import { firstMessagePrompt } from "../engine/memorycompose.js";
import { runAI } from "../engine/runai.js";
import { stripVirtualContext } from "../engine/bardwikiadapt.js";

// 지점(at) 이하의 기억만 복사한 새 폴더 내용(순수). 앵커 없는 legacy 기록은 지점 상황 시각 이전 것만.
export function sliceFolder(folder, at, { carried = true } = {}) {
  const ms = (folder.scenes ?? []).filter((s) => s.at != null && s.at <= at).at(-1)?.at_ms ?? Infinity;
  const ok = (x) => !x.orphan && (x.at != null ? x.at <= at : (x.at_ms ?? 0) <= ms);
  const mark = (x) => ({ ...x, ...(carried ? { carried: true } : {}) });
  const people = {};
  for (const [k, p] of Object.entries(folder.people ?? {})) {
    const records = (p.records ?? []).filter(ok).map(mark);
    if (records.length || p.digest) people[k] = { ...structuredClone(p), records };
  }
  return { people, scenes: (folder.scenes ?? []).filter(ok).map(mark) };
}
export const sceneAt = (folder, at) => (folder.scenes ?? []).filter((s) => !s.orphan && s.at != null && s.at <= at).at(-1) ?? (folder.scenes ?? []).filter((s) => !s.orphan).at(-1) ?? null;

// 도입문을 서브 모델로 작성. 실패하면 상황 요약을 그대로 쓴다.
export async function draftFirstMessage(api, { name, scene, relationship = "", model, lang = "ko", signal }) {
  if (!scene) return "";
  const fallback = [scene.sum, ...(scene.facts ?? [])].filter(Boolean).join("\n");
  try { const t = (await runAI(api, firstMessagePrompt({ name, scene: { sum: scene.sum, facts: scene.facts, place: scene.place }, relationship, lang }), model, signal)).trim(); return t || fallback; }
  catch (e) { if (signal?.aborted) throw e; return fallback; }
}

// opts: {at, name, firstMessage, copyMessages, store, folder, isGenerating, Busy}
export async function createRewindChat(api, charIndex, chatIndex, opts) {
  const { at, store, folder, isGenerating, Busy, copyMessages = false, firstMessage = "" } = opts;
  const ch = await api.getCharacterFromIndex(charIndex);
  if (!ch) throw new Error("캐릭터를 찾지 못했어요.");
  if (isGenerating(ch)) throw new Busy();
  const src = ch.chats?.[chatIndex] ?? await api.getChatFromIndex(charIndex, chatIndex);
  if (!src) throw new Error("원본 채팅을 찾지 못했어요.");
  const scene = sceneAt(folder, at);
  const label = opts.name || `회귀 · ${scene?.place || folder.botName || "기억"} #${at + 1}`;
  const message = [];
  if (copyMessages) for (const m of stripVirtualContext({ message: (src.message ?? []).slice(0, at + 1) }).message) message.push(structuredClone(m));
  if (firstMessage.trim()) message.push({ role: "char", data: firstMessage.trim(), time: Date.now(), chatId: newId() });
  const chat = { id: newId(), message, note: "", name: label, localLore: [], supaMemory: false, fmIndex: -1 };
  // 최신 상태를 다시 읽고 생성 중이면 막은 뒤, 원본 채팅 객체는 그대로 두고 새 채팅만 덧붙인다.
  const fresh = await api.getCharacterFromIndex(charIndex);
  if (!fresh || fresh.chaId !== ch.chaId) throw new Error("캐릭터가 그 사이 바뀌었어요. 다시 시도해 주세요.");
  if (isGenerating(fresh)) throw new Busy();
  const before = (fresh.chats ?? []).length;
  await api.setCharacterToIndex(charIndex, { ...fresh, chats: [...(fresh.chats ?? []), chat] });
  const check = await api.getCharacterFromIndex(charIndex);
  if (check?.chaId !== ch.chaId || (check.chats ?? []).length !== before + 1) throw new Error("새 채팅을 추가한 뒤 확인에서 예상과 다르게 보여요. 채팅 목록을 확인해 주세요.");
  const slice = sliceFolder(folder, at, { carried: !copyMessages });
  await store.updateFolder(String(ch.chaId), String(chat.id), (f) => {
    Object.assign(f, slice, { botName: ch.name ?? "", chatName: label, chatIndex: before, cursor: { at: Math.max(0, message.length - 1), h: "rewind" } });
  });
  return { chat, chatIndex: before };
}
