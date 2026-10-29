// v1.7.0 2단계: 화면이 쓰는 '기억 · 리수폿' 스위치 묶음. 저장은 인덱스(store.updateIndex)에, 흐름 반영은 flow.apply()로.
// 화면은 지금 열린 채팅을 기본으로 쓴다(currentChat). 다른 봇은 chaId를 직접 넘기면 된다.
import { comboOf, memoryState, potCharOn, potState, scopeKeyOf, setMemoryForBot, setMemoryGlobal, setPotChar, setPotForBot, setPotGlobal } from "../engine/memoryswitch.js";

// 지금 리스에서 열린 봇·채팅. 열린 채팅이 없으면 null.
export async function currentChat(api) {
  try {
    const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
    if (!(ci >= 0) || !(ti >= 0)) return null;
    const c = await api.getCharacterFromIndex(ci);
    if (!c?.chaId) return null;
    const chat = c.chats?.[ti];
    return { ci, ti, chaId: String(c.chaId), botName: c.name ?? "", chatId: String(chat?.id ?? ti), chatName: chat?.name ?? "" };
  } catch {
    return null;
  }
}

export function createSwitches({ api, store, flow = null }) {
  const applyFlow = async () => { try { await flow?.apply?.(); } catch { /* 흐름을 못 바꿔도 저장된 설정은 남는다 */ } };
  return {
    currentChat: () => currentChat(api),
    // 한 봇의 스위치 상태: 기억 · 리수폿 · 조합(both|memory|pot|none)
    async state(chaId) {
      const idx = await store.getIndex();
      return { memory: memoryState(idx, chaId), pot: potState(idx, chaId), combo: comboOf(idx, chaId) };
    },
    // 켜면 전체 기본도 함께 켜서 '이 채팅에서 바로 쓰이게' 한다. 끄면 이 봇만 끈다.
    async setMemory(chaId, on) {
      await store.updateIndex((idx) => { setMemoryForBot(idx, chaId, on); if (on) setMemoryGlobal(idx, true); });
    },
    async setPot(chaId, on) {
      await store.updateIndex((idx) => { setPotForBot(idx, chaId, on); if (on) setPotGlobal(idx, true); });
      await applyFlow();
    },
    // 전체 기본(모든 봇): 화면의 고급에서만 쓴다
    async setMemoryEverywhere(on) { await store.updateIndex((idx) => setMemoryGlobal(idx, on)); },
    async setPotEverywhere(on) { await store.updateIndex((idx) => setPotGlobal(idx, on)); await applyFlow(); },
    // 위키 인물(캐릭터)별 켜기/끄기: 범위는 이 봇의 이 채팅
    async charOn(chaId, chatId, docId) { return potCharOn(await store.getIndex(), scopeKeyOf(chaId, chatId), docId); },
    async setChar(chaId, chatId, docId, on) { await store.updateIndex((idx) => setPotChar(idx, scopeKeyOf(chaId, chatId), docId, on)); }
  };
}
