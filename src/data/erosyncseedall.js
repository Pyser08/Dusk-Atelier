// addon-rebuild '대화 속 인물로 만들기': 지금 채팅 장기기억에 있는 인물 중 Erosync 프로필이 없는 인물을 한 명씩 출발값 만들기(엔진 seed).
// 전체 인물 찾기(카드·로어북·모듈 전체 훑기)와 달리 대화에 실제로 나와 기억된 인물만 대상이다.
const nk = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const arr = (v) => (Array.isArray(v) ? v : []);
export function chatPeopleToSeed(folder, snap) {
  const have = new Set(arr(snap?.people).flatMap((p) => [p.name, ...arr(p.aliases)]).map(nk).filter(Boolean));
  const out = [];
  for (const p of Object.values(folder?.people ?? {})) {
    const name = String(p?.name ?? "").trim();
    if (!name || /\{\{user\}\}/i.test(name) || (p.ctx ?? "auto") === "never") continue;
    const aliases = arr(p.aliases).map(String);
    if ([name, ...aliases].some((n) => have.has(nk(n)))) continue;
    const recs = arr(p.records).filter((r) => r && !r.orphan && r.act).slice(-8).map((r) => String(r.act));
    const memory = [p.digest && !p.digestStale ? String(p.digest) : "", ...recs].filter(Boolean).join("\n").slice(0, 1200);
    if (!out.some((x) => nk(x.name) === nk(name))) out.push({ name, aliases, memory });
  }
  return out;
}
export async function seedAllChatPeople(ctx, { onProgress = () => {}, list = null } = {}) {
  const todo = list ?? await chatPeopleList(ctx);
  const results = [];
  for (const [i, p] of todo.entries()) {
    onProgress({ index: i, total: todo.length, name: p.name });
    try { const r = await ctx.erosync.profile("seed", p); results.push({ name: p.name, ok: !!r?.ok, analyzed: !!r?.analyzed, reason: r?.reason || "" }); }
    catch (e) { results.push({ name: p.name, ok: false, reason: String(e?.message ?? e) }); }
  }
  return results;
}
export async function chatPeopleList(ctx) {
  const M = ctx.memory, cur = await M?.switches?.currentChat?.({ fresh: true }).catch?.(() => null);
  if (!cur) return [];
  const [folder, snap] = await Promise.all([M.store.getFolder(cur.chaId, cur.chatId), ctx.erosync.read().catch(() => null)]);
  return chatPeopleToSeed(folder, snap);
}
