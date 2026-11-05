// 회귀 (v1.9.2): 고른 인물의 기억만 들고 같은 봇에 새 채팅을 만든다. 원래 채팅과 그 기억은 건드리지 않는다.
import { newId } from "../engine/util.js";
import { regressSlice, continueSlice } from "../engine/regress.js";
import { normalizeWikiScope } from "../engine/pot/wiki-schema.js";
import { CHAT_SCOPE_FIELD } from "../engine/pot/chat-scope.js";

// opts: { store, folder, who, name, isGenerating(ch), Busy }
export async function createRegressChat(api, charIndex, opts) {
  const { store, folder, who, isGenerating = () => false, Busy = Error } = opts;
  const ch = await api.getCharacterFromIndex(charIndex);
  if (!ch) throw new Error("캐릭터를 찾지 못했어요.");
  if (String(ch.chaId) !== String(folder.chaId)) throw new Error("기억과 캐릭터가 맞지 않아요. 다시 열어 주세요.");
  if (isGenerating(ch)) throw new Busy();
  const id = newId();
  // mode "continue": 기억 전체를 들고 이어서 하기 · 그 밖: 고른 인물만 회귀
  const cont = opts.mode === "continue";
  const probe = cont ? continueSlice(folder) : regressSlice(folder, who);
  if (!probe) throw new Error("그 인물의 기억을 찾지 못했어요.");
  const label = (opts.name || (cont ? `이어서 · ${folder.chatName || ch.name || "기억"}` : `회귀 · ${probe.person}`)).slice(0, 120);
  const scope = { characterId: ch.chaId, chatKey: id, characterName: ch.name ?? "", chatName: label };
  const plan = cont ? { ...continueSlice(folder, { scope }), person: "모두" } : regressSlice(folder, who, { scope, fromChat: folder.chatName ?? "" });
  let wikiOk = !!plan.slice.wiki;
  if (wikiOk) { try { plan.slice.wiki = normalizeWikiScope(plan.slice.wiki); } catch { delete plan.slice.wiki; wikiOk = false; } }
  // 새 채팅: 메시지 없이 시작 → 봇의 첫 메시지가 나온다. 위키 범위 ID를 채팅 ID로 고정해 이 위키가 이 채팅에 붙게 한다.
  const chat = { id, message: [], note: "", name: label, localLore: [], supaMemory: false, fmIndex: -1, [CHAT_SCOPE_FIELD]: id };
  const fresh = await api.getCharacterFromIndex(charIndex);
  if (!fresh || fresh.chaId !== ch.chaId) throw new Error("캐릭터가 그 사이 바뀌었어요. 다시 시도해 주세요.");
  if (isGenerating(fresh)) throw new Busy();
  // 기억을 먼저 써 둔다(채팅이 생기자마자 열려도 기억이 있게). 채팅 추가에 실패하면 지운다.
  await store.updateFolder(String(ch.chaId), id, (f) => { Object.assign(f, plan.slice, { botName: ch.name ?? "", chatName: label, chatIndex: 0, cursor: null }); });
  try {
    // 리스가 새 채팅을 만들 때처럼 목록 맨 위(0번)에 넣고 그 채팅으로 이동한다
    await api.setCharacterToIndex(charIndex, { ...fresh, chats: [chat, ...(fresh.chats ?? [])], chatPage: 0 });
    const check = await api.getCharacterFromIndex(charIndex);
    if (check?.chaId !== ch.chaId || !(check.chats ?? []).some((c) => c?.id === id)) throw new Error("새 채팅을 추가한 뒤 확인에서 보이지 않아요. 채팅 목록을 확인해 주세요.");
  } catch (e) { await store.deleteFolder?.(String(ch.chaId), id).catch(() => {}); throw e; }
  return { chat, chatIndex: 0, person: plan.person, counts: { ...plan.counts, wiki: wikiOk } };
}
