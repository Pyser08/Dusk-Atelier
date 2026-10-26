import { h } from '../../dom.js';
import { loadCharacters } from '../../../data/modules.js';
import { emptyFolder } from '../../../data/memorystore.js';
import { reconcile } from '../../../engine/memoryreconcile.js';

export const mem = (ctx) => ctx.state.mem ??= { view: "bots", botId: "", chatIndex: 0, tab: "people", personKey: "", grades: [], search: "", personSearch: "", sort: "time", sceneDesc: true, page: 1, bots: null, showHidden: false, compose: null };
export const fail = (ctx) => (e) => ctx.toast(e?.message ?? String(e), { error: true, seconds: 8 });
export const gradeBadge = (g) => h("span", { class: "rb-grade", "data-g": g || "-", title: g ? `등급 ${g}` : "등급 없음" }, g || "–");
export const avatar = (name, g) => h("span", { class: "rb-mem-av", "data-g": g || "-", "aria-hidden": "true" }, [...String(name || "?")][0]);
export const at = (n) => n == null ? "" : `#${n + 1}`;

export async function loadBots(ctx, force = false) {
  const m = mem(ctx);
  if (m.bots && !force) return m.bots;
  const db = await ctx.api.getDatabase(["characters", "characterOrder"]);
  const loaded = await loadCharacters(ctx.api, db?.characters);
  m.bots = loaded.list.map((c, index) => c && !c.trashTime ? { character: c, index, id: String(c.chaId ?? c.id ?? index) } : null).filter(Boolean);
  return m.bots;
}
// 채팅 본문 읽기가 가장 느리다: 봇별로 20초 동안 재사용한다(봇을 열 때·force로 비운다).
export async function loadChats(ctx, bot, force = false) {
  const m = mem(ctx), c = (m.chatCache ??= {}), hit = c[bot.id];
  if (!force && hit && Date.now() - hit.t < 20000 && hit.n === (bot.character.chats?.length ?? 0)) return hit.v;
  const v = await readChats(ctx, bot); c[bot.id] = { t: Date.now(), n: v.length, v }; return v;
}
async function readChats(ctx, bot) {
  const n = bot.character.chats?.length ?? 0;
  return Promise.all(Array.from({ length: n }, async (_, index) => {
    let chat = null; try { chat = await ctx.api.getChatFromIndex(bot.index, index); } catch {}
    const meta = bot.character.chats[index];
    return { index, chat, id: String(chat?.id ?? meta?.id ?? index), name: String(chat?.name ?? meta?.name ?? `채팅 ${index + 1}`), count: (chat?.message ?? meta?.message ?? []).length };
  }));
}
// 현재 백엔드에 맞춰 폴더를 읽는다. 반환: {folder, snapshot, live, backend}
export async function loadFolder(ctx, bot, chatItem) {
  const M = ctx.memory, idx = await M.store.getIndex(), backend = M.backend(idx.settings);
  const msgs = chatItem.chat?.message ?? [];
  if (backend.id === "bardwiki") {
    const ci = await ctx.api.getCurrentCharacterIndex().catch(() => -1), ti = await ctx.api.getCurrentChatIndex().catch(() => -1);
    const live = ci === bot.index && ti === chatItem.index;
    const f = await M.bardwiki.loadFolder(bot.id, chatItem.id, { live, messages: msgs, showHidden: mem(ctx).showHidden });
    return { folder: f ? M.bardwiki.withGrades(f) : emptyFolder(bot.id, chatItem.id), snapshot: !!f?.snapshot, live, missing: !f, backend, idx };
  }
  const f = await M.store.getFolder(bot.id, chatItem.id) ?? emptyFolder(bot.id, chatItem.id);
  reconcile(f, msgs);  // 화면용 사본: 저장하지 않는다
  return { folder: f, snapshot: false, live: true, backend, idx };
}
export const visibleRecords = (p) => (p.records ?? []).filter((r) => !r.orphan);
export const topGrade = (p) => { const order = ["D", "C", "B", "A", "S", "EX"]; return visibleRecords(p).reduce((b, r) => r.g && order.indexOf(r.g) > order.indexOf(b) ? r.g : b, ""); };
export const lastAt = (p) => visibleRecords(p).reduce((m, r) => Math.max(m, r.at ?? -1), -1);
