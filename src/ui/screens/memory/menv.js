// 열린 봇·채팅의 기억 환경(env)을 만든다. 기록 보기·리수폿·인물 화면이 같이 쓴다 (1.7.0 4단계).
import { loadBots, loadChats, loadFolder, potOn } from "./common.js";

// 반환: {env} 또는 {err: "bot"|"chat"}
export async function memoryEnv(ctx, { botId, chatIndex = 0, redraw }) {
  const M = ctx.memory, bots = await loadBots(ctx), bot = bots.find((b) => b.id === botId);
  if (!bot) return { err: "bot" };
  const chats = await loadChats(ctx, bot), chatItem = chats[chatIndex] ?? chats[0];
  if (!chatItem) return { err: "chat", bot, chats };
  const view = await loadFolder(ctx, bot, chatItem);
  const { folder, backend, idx } = view, caps = M.capabilities(backend.id);
  const cycleOn = await M.flow?.settings?.().then((st) => { const r = st.rawSnapshot(); return r.features?.openness?.cycle === true && r.sexualDesireEnabled === true; }).catch(() => false);
  const advanced = potOn(idx.settings) && idx.settings.flow?.advanced === true && idx.settings.flow?.on === true;
  return { env: { ctx, bot, chats, advanced, chatItem, folder, view, backend, caps, idx, cycleOn, redraw, redrawView: redraw, sess: M.runner?.session?.().calls ?? 0 } };
}
