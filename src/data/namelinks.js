// 장기기억 애드온(0.3.22): 응답 화면(display)에서 인물 이름에 상태창 링크를 단다. 모델에 보내는 글·저장된 채팅은 그대로.
// 메시지마다 불리므로 지금 채팅 폴더·설정은 3초 동안 재사용하고, 상태창 HTML은 인물별로 한 번만 만든다.
import { statusCardHtml, linkNames } from "../engine/namecard.js";

export function createNameLinks(memory) {
  let cache = null, checked = 0, loading = null;
  const load = async () => {
    if (cache && Date.now() - checked < 3000) return;
    checked = Date.now();
    const idx = await memory?.store?.getIndex?.().catch?.(() => null);
    const inj = idx?.settings?.inject ?? {};
    if (inj.nameLinks === false || idx?.settings?.backend === "off") { cache = { off: true }; return; }
    const cur = await memory?.switches?.currentChat?.().catch?.(() => null); if (!cur) { cache = { off: true }; return; }
    const f = await memory.store.getFolder(cur.chaId, cur.chatId).catch(() => null);
    if (!f) { cache = { off: true }; return; }
    const when = [...(f.scenes ?? [])].filter((x) => !x.orphan && x.when).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]?.when ?? "";
    const docs = Object.values(f.wiki?.documents ?? {}).filter((d) => d?.type === "Character" && !/\{\{user\}\}/i.test(d.title ?? ""));
    const htmls = new Map();
    const people = docs.map((d) => ({ names: [d.title, ...(d.aliases ?? [])].filter((n) => String(n ?? "").trim().length >= 2), get html() { if (!htmls.has(d.id)) htmls.set(d.id, statusCardHtml(f, d, { when, status: inj.status !== false })); return htmls.get(d.id); } }));
    cache = { people };
  };
  return {
    invalidate() { cache = null; checked = 0; },
    // 본문 글에만 링크를 단다(뒤에 붙는 게이지·일기·로어북 상자는 호출하는 쪽이 따로 붙인다)
    async link(text) {
      try {
        if (typeof text !== "string" || !text) return text;
        loading ??= load().finally(() => { loading = null; }); await loading;
        if (!cache || cache.off || !cache.people?.length) return text;
        return linkNames(text, cache.people);
      } catch { return text; }
    },
  };
}
