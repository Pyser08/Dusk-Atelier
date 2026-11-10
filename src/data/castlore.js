// 지금 채팅에 걸린 로어북으로 '새로 만들어도 되는 인물' 판단기를 만든다(장기기억 애드온 전용).
// 읽는 곳: 캐릭터 로어북(globalLore)·채팅 로어북(localLore)·켜진 모듈(전역·봇·채팅)의 로어북 + 봇 이름·설명.
// getCharacterFromIndex는 카드를 통째로 복사하므로 같은 채팅이면 60초 동안 다시 읽지 않는다.
import { loreCast, inCast } from "../engine/castfilter.js";

export function createCastReader(api, { now = () => Date.now(), ttl = 60_000 } = {}) {
  let memo = null;
  // characterId: 기록 중인 위키의 봇(chaId). 지금 열린 봇과 다르면(기록 도중 채팅을 옮김) 판단하지 않는다(null = 막지 않음).
  return async function castFor(characterId = "") {
    let ci, ti;
    try { ci = await api.getCurrentCharacterIndex(); ti = await api.getCurrentChatIndex(); } catch { return null; }
    if (!(ci >= 0)) return null;
    const key = `${ci}:${ti}`;
    if (!memo || memo.key !== key || now() - memo.at > ttl) {
      let ch = null, chat = null, mods = [];
      try { ch = await api.getCharacterFromIndex(ci); } catch { return null; }
      if (!ch) return null;
      chat = ch.chats?.[ti] ?? null;
      if (!chat && ti >= 0) { try { chat = await api.getChatFromIndex?.(ci, ti); } catch { chat = null; } }
      try {
        const db = await api.getDatabase(["modules", "enabledModules"]);
        const ids = new Set([...(db?.enabledModules ?? []), ...(ch.modules ?? []), ...(chat?.modules ?? [])]);
        mods = (db?.modules ?? []).filter((m) => ids.has(m?.id));
      } catch { mods = []; }
      const entries = [...(ch.globalLore ?? []), ...(chat?.localLore ?? []), ...mods.flatMap((m) => m.lorebook ?? [])];
      memo = { key, at: now(), chaId: String(ch.chaId ?? ""), cast: loreCast({ botName: ch.name ?? "", description: [ch.desc, ch.personality].filter(Boolean).join("\n"), entries }) };
    }
    if (characterId && memo.chaId && String(characterId) !== memo.chaId) return null;
    const cast = memo.cast;
    return cast.empty ? null : (name, aliases = []) => inCast(cast, name, aliases);
  };
}
