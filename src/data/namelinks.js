// 장기기억 애드온(0.3.22): 응답 화면(display)에 붙이는 두 가지. 모델에 보내는 글·저장된 채팅은 그대로.
//  · 캐릭터 상태창: 본문 인물 이름에 링크(설정 inject.nameLinks, 기본 켜짐) — 얼굴 사진은 봇 이미지·에셋에서
//  · 장면 상태창: 응답 아래(로어북 버튼 위)에 날짜·시간·장소·날씨·등장인물(설정 inject.scenePanel, 기본 켜짐)
// 메시지마다 불리므로 지금 채팅 폴더·설정은 3초 동안 재사용하고, 상태창 HTML은 인물별로 한 번만 만든다.
import { statusCardHtml, linkNames } from "../engine/namecard.js";
import { scenePanelHtml, sceneOf, peopleIn } from "../engine/scenepanel.js";
import { charThumb } from "./charimg.js";

export function createNameLinks(memory, api = null) {
  let cache = null, checked = 0, loading = null;
  const load = async () => {
    if (cache && Date.now() - checked < 3000) return;
    checked = Date.now();
    const idx = await memory?.store?.getIndex?.().catch?.(() => null);
    const inj = idx?.settings?.inject ?? {};
    const links = inj.nameLinks !== false, scene = inj.scenePanel !== false;
    if ((!links && !scene) || idx?.settings?.backend === "off") { cache = { off: true }; return; }
    const cur = await memory?.switches?.currentChat?.().catch?.(() => null); if (!cur) { cache = { off: true }; return; }
    const f = await memory.store.getFolder(cur.chaId, cur.chatId).catch(() => null);
    if (!f) { cache = { off: true }; return; }
    const character = cur.ci != null ? await api?.getCharacterFromIndex?.(cur.ci).catch?.(() => null) : null;
    const when = [...(f.scenes ?? [])].filter((x) => !x.orphan && x.when).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]?.when ?? "";
    const docs = Object.values(f.wiki?.documents ?? {}).filter((d) => d?.type === "Character" && !/\{\{user\}\}/i.test(d.title ?? ""));
    const imgs = new Map();
    if (api && character) await Promise.all(docs.map(async (d) => { const u = await charThumb(api, character, [d.title, ...(d.aliases ?? [])]).catch(() => null); if (u) imgs.set(d.id, u); }));
    const htmls = new Map(), cardOf = (d) => { if (!htmls.has(d.id)) htmls.set(d.id, statusCardHtml(f, d, { when, status: inj.status !== false, img: imgs.get(d.id) ?? null })); return htmls.get(d.id); };
    const people = docs.map((d) => ({ names: [d.title, ...(d.aliases ?? [])].filter((n) => String(n ?? "").trim().length >= 2), get html() { return cardOf(d); } }));
    cache = { links, scene, people, folder: f, cardOf, botName: character?.name ?? "" };
  };
  const ready = async () => { loading ??= load().finally(() => { loading = null; }); await loading; return cache && !cache.off ? cache : null; };
  return {
    invalidate() { cache = null; checked = 0; },
    // 본문 글에만 링크(뒤에 붙는 게이지·일기·로어북 상자는 호출하는 쪽이 따로 붙인다)
    async link(text) {
      try { if (typeof text !== "string" || !text) return text; const c = await ready(); return c?.links && c.people.length ? linkNames(text, c.people) : text; } catch { return text; }
    },
    // 장면 상태창 HTML(없으면 ""). 상태 줄이 있는 응답, 또는 등장인물이 나온 긴 응답에만
    async scene(text) {
      try {
        if (typeof text !== "string" || !text || text.includes('x-dusk="scene"')) return "";
        const c = await ready(); if (!c?.scene) return "";
        const s = sceneOf(text, c.folder), ppl = peopleIn(text, c.folder, c.botName);
        if (!s.fromLine && !(ppl.length && text.length >= 300)) return "";
        return scenePanelHtml({ ...s, people: ppl.map((p) => ({ name: p.name, card: p.doc && c.links ? c.cardOf(p.doc) : null })) });
      } catch { return ""; }
    },
  };
}
