// v1.6.5 읽기 경로 대조: 폴더를 읽어 메모리 사본에서만 앵커 정합성(reconcile)을 맞춘다. 저장하지 않는다.
// 다시 생성·삭제된 응답에 달린 기록·장면·관계·떡밥이 요청에 들어가지 않게, 주입·회상·분석 입력 앞에서 쓴다.
// getFolder는 저장소 문자열을 매번 새로 파싱해 돌려주므로 사본을 따로 만들지 않는다.
// 2.2.4 분기 채팅 기억 이어받기: 기억이 없는 채팅이 같은 봇의 다른 채팅에서 갈라져 나온 것이면(메시지가 그 채팅의 기록과 맞으면)
//   그 채팅의 기억을 이어받는다. 갈라진 뒤의 기록은 이 채팅 메시지와 맞지 않아 대조(reconcile)에서 빠진다. 위키는 리수폿이 따로 복사한다.
import { reconcile } from "../engine/memoryreconcile.js";
import { logFailure } from "./memlog.js";

const checked = new Map();   // 봇|채팅 → 확인한 메시지 수(같은 상태로는 다시 찾지 않는다)
export const hasMemory = (f) => !!f && (Object.values(f.people ?? {}).some((p) => (p.records ?? []).length) || (f.scenes ?? []).length > 0);
const alive = (f) => [...Object.values(f.people ?? {}).flatMap((p) => p.records ?? []), ...(f.scenes ?? [])].filter((x) => !x.orphan && Number.isInteger(x.at));

// 이어받을 원본 고르기(순수에 가깝게: 폴더 목록과 읽기 함수만 받는다). 맞는 기록 5개 이상, 처음 인사말 너머(4번째 메시지 뒤)까지 맞아야 한다.
export async function findForkParent(candidates, readFolder, messages, { min = 5 } = {}) {
  let best = null;
  for (const c of candidates) {
    const parent = await readFolder(c.chatId); if (!hasMemory(parent)) continue;
    const copy = structuredClone(parent); reconcile(copy, messages);
    const live = alive(copy), far = live.some((x) => x.at >= 4);
    if (live.length >= min && far && (!best || live.length > best.n)) best = { chatId: String(c.chatId), n: live.length };
  }
  return best;
}
export async function inheritFromParent(store, chaId, chatId, messages, folder = null) {
  if (folder?.adoptedFrom || typeof store.botFolders !== "function" || typeof store.adoptFolder !== "function") return false;
  const k = `${chaId}|${chatId}`; if (checked.get(k) === messages.length) return false; checked.set(k, messages.length);
  if (checked.size > 300) checked.delete(checked.keys().next().value);
  const idx = await store.getIndex();
  if (idx.settings?.inject?.forkInherit === false || idx.noInherit?.[k]) return false;
  const list = (await store.botFolders(chaId)).filter((f) => String(f.chatId) !== String(chatId)).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 12);
  if (!list.length) return false;
  const best = await findForkParent(list, (cid) => store.getFolder(String(chaId), String(cid)), messages);
  if (!best) return false;
  await store.adoptFolder(String(chaId), best.chatId, String(chatId));
  return true;
}

// messages가 비었으면(채팅을 못 읽은 경우 등) 전부 고아로 오인하지 않도록 대조를 건너뛴다.
export async function loadReconciled(store, chaId, chatId, messages, index = null) {
  let folder = await store.getFolder(String(chaId), String(chatId));
  if (!hasMemory(folder) && Array.isArray(messages) && messages.length >= 6) {
    try { if (await inheritFromParent(store, String(chaId), String(chatId), messages, folder)) folder = await store.getFolder(String(chaId), String(chatId)); }
    catch (e) { logFailure({ area: "분기 기억 이어받기", title: "분기한 채팅이 원래 채팅의 기억을 이어받지 못했어요", error: e, fallback: "기억 없이 시작해요", ctx: { 채팅: String(chatId), 메시지: messages.length } }); }
  }
  if (folder && Array.isArray(messages) && messages.length) reconcile(folder, messages, index);
  return folder;
}
