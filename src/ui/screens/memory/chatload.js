// 봇의 채팅 목록. 이름·개수는 이미 읽은 캐릭터 정보에서 바로 만들고, 본문은 '지금 볼 채팅 하나'만 읽는다(v1.8.1 속도).
// 예전에는 채팅 전부를 getChatFromIndex로 다시 읽어 채팅이 많은 봇에서 탭 진입이 느렸다.
import { chatKeyOf } from "../../../engine/chatkey.js";
const metaItem = (bot, index) => {
  const meta = bot.character.chats?.[index];
  return { index, chat: null, loaded: false, id: chatKeyOf(meta, index), name: String(meta?.name ?? `채팅 ${index + 1}`), count: Array.isArray(meta?.message) ? meta.message.length : null };
};
export const countOf = (c) => (c.count == null ? "" : ` (${c.count})`);

export async function loadChats(ctx, bot, force = false, want = null) {
  const cache = (ctx.state.chatCache ??= {}), n = bot.character.chats?.length ?? 0;
  let w = Math.max(0, Number(want ?? ctx.state.mem?.chatIndex ?? 0) || 0); if (w >= n) w = 0;   // 범위 밖이면 호출 쪽이 0으로 돌리므로 0을 읽는다
  let hit = cache[bot.id];
  if (force || !hit || Date.now() - hit.t >= 20000 || hit.n !== n) hit = cache[bot.id] = { t: Date.now(), n, v: Array.from({ length: n }, (_, i) => metaItem(bot, i)) };
  const it = hit.v[w];
  if (it && !it.loaded) {
    let chat = null; try { chat = await ctx.api.getChatFromIndex(bot.index, w); } catch { /* 목록 정보로 대신 */ }
    it.chat = chat; it.loaded = true;
    if (chat) { it.id = chatKeyOf(chat, it.index); it.name = String(chat.name ?? it.name); it.count = (chat.message ?? []).length; }
  }
  return hit.v;
}
