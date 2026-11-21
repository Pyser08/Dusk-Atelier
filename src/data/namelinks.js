// 장기기억 애드온(0.3.22): 응답 화면(display)에 붙이는 두 가지. 모델에 보내는 글·저장된 채팅은 그대로.
//  · 캐릭터 상태창: 본문 인물 이름에 링크(설정 inject.nameLinks, 기본 켜짐) — 얼굴 사진은 봇 이미지·에셋에서
//  · 장면 상태창: 응답 아래(로어북 버튼 위)에 날짜·시간·장소·날씨·등장인물(설정 inject.scenePanel, 기본 켜짐)
// 메시지마다 불리므로 지금 채팅 폴더·설정은 3초 동안 재사용하고, 상태창 HTML은 인물별로 한 번만 만든다.
import { readChar } from "./apiread.js";
import { statusCardHtml, linkNames, NAMECARD_CSS } from "../engine/namecard.js";
import { scenePanelHtml, sceneOf, peopleIn, SCENE_CSS } from "../engine/scenepanel.js";
import { charThumb } from "./charimg.js";
import { folderIdOf } from "./memorystore.js";

// 2.2.24: 상태창·장면 상태창 CSS는 응답 안 <style>이 아니라 리스 화면에 한 번만 넣는다.
// 응답 안 <style>은 리스가 바꿔 해석하다 ‘CSS ERROR’를 띄우고 일부만 적용돼 이름이 두 번 보이기도 했다.
// 리스 화면에 넣으려면 ‘메인 화면’ 권한이 필요하다(처음 한 번 물을 수 있음). 거절하면 애니메이션·바깥 눌러 닫기만 빠진다.
export const STATUS_CSS = NAMECARD_CSS + SCENE_CSS;
const CSS_ID = "dusk-status-css";
export function createCssMount(api) {
  let state = "idle";   // idle | busy | done | denied
  return async function ensureCss() {
    if (state === "done" || state === "denied" || state === "busy" || typeof api?.getRootDocument !== "function") return state;
    state = "busy";
    try {
      if (typeof api.requestPluginPermission === "function" && !await api.requestPluginPermission("mainDom")) { state = "denied"; return state; }
      const doc = await api.getRootDocument(); if (!doc) { state = "idle"; return state; }
      const old = await doc.querySelector(`[x-dusk="${CSS_ID}"]`); if (old) await old.remove();
      const parent = (await doc.querySelector("head")) ?? (await doc.querySelector("body"));
      const el = await doc.createElement("style"); await el.setAttribute("x-dusk", CSS_ID); await el.setInnerText(STATUS_CSS); await parent.appendChild(el);
      state = "done";
    } catch { state = "idle"; }
    return state;
  };
}

export function createNameLinks(memory, api = null) {
  const ensureCss = createCssMount(api);
  let cache = null, checked = 0, loading = null;
  // 2.2.22 성능: 캐릭터 통째(채팅 전체 포함, 큰 채팅은 수십 MB)는 봇이 바뀔 때만 한 번 읽고, 이름·설명·이미지 목록만 남긴다
  let charMemo = null;
  const charOf = async (cur) => {
    if (charMemo?.chaId === cur.chaId) return charMemo.v;
    const c = cur.ci != null && api?.getCharacterFromIndex ? await readChar(api, cur.ci, cur.ti).catch(() => null) : null;
    const v = c ? { name: c.name ?? "", desc: String(c.desc ?? "").slice(0, 1500), image: c.image, emotionImages: c.emotionImages ?? [], additionalAssets: c.additionalAssets ?? [] } : null;
    charMemo = { chaId: cur.chaId, v }; return v;
  };
  const load = async () => {
    if (cache && Date.now() - checked < 3000) return;
    const idx = await memory?.store?.getIndex?.().catch?.(() => null);
    const inj = idx?.settings?.inject ?? {};
    const links = inj.nameLinks !== false, scene = inj.scenePanel !== false;
    if ((!links && !scene) || idx?.settings?.backend === "off") { cache = { off: true }; checked = Date.now(); return; }
    const cur = await memory?.switches?.currentChat?.().catch?.(() => null); if (!cur) { cache = { off: true }; checked = Date.now(); return; }
    // 같은 채팅·같은 기억 폴더(저장 시각)·같은 설정이면 만든 것을 그대로 쓴다(시간이 지나도). 바뀌었을 때만 폴더를 다시 읽는다
    const key = `${cur.chaId}|${cur.chatId}|${idx?.folders?.[folderIdOf(cur.chaId, cur.chatId)]?.updatedAt ?? 0}|${links}|${scene}|${inj.status !== false}`;
    if (cache && !cache.off && cache.key === key) { checked = Date.now(); return; }
    const f = await memory.store.getFolder(cur.chaId, cur.chatId).catch(() => null);
    if (!f) { cache = { off: true }; checked = Date.now(); return; }
    const character = await charOf(cur);
    const when = [...(f.scenes ?? [])].filter((x) => !x.orphan && x.when).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]?.when ?? "";
    const docs = Object.values(f.wiki?.documents ?? {}).filter((d) => d?.type === "Character" && !/\{\{user\}\}/i.test(d.title ?? ""));
    const imgs = new Map();
    if (api && character) await Promise.all(docs.map(async (d) => { const u = await charThumb(api, character, [d.title, ...(d.aliases ?? [])]).catch(() => null); if (u) imgs.set(d.id, u); }));
    const htmls = new Map(), cardOf = (d) => { if (!htmls.has(d.id)) htmls.set(d.id, statusCardHtml(f, d, { when, status: inj.status !== false, img: imgs.get(d.id) ?? null })); return htmls.get(d.id); };
    const people = docs.map((d) => ({ names: [d.title, ...(d.aliases ?? [])].filter((n) => String(n ?? "").trim().length >= 2), get html() { return cardOf(d); } }));
    cache = { key, links, scene, people, folder: f, cardOf, botName: character?.name ?? "", seed: `${cur.chaId}|${cur.chatId}`, hint: [character?.name, character?.desc].filter(Boolean).join(" ") };
    checked = Date.now();   // 2.2.22: 다 읽은 뒤에 시각을 적는다(읽는 데 3초가 넘으면 다 읽자마자 만료돼 매번 처음부터 다시 읽었다)
  };
  const ready = async () => { loading ??= load().finally(() => { loading = null; }); await loading; if (cache && !cache.off) { ensureCss().catch(() => {}); return cache; } return null; };
  return {
    invalidate() { cache = null; checked = 0; charMemo = null; },
    css: () => STATUS_CSS,
    // 본문 글에만 링크(뒤에 붙는 게이지·일기·로어북 상자는 호출하는 쪽이 따로 붙인다)
    async link(text) {
      try { if (typeof text !== "string" || !text) return text; const c = await ready(); return c?.links && c.people.length ? linkNames(text, c.people) : text; } catch { return text; }
    },
    // 장면 상태창 HTML(없으면 ""). 상태 줄이 있는 응답, 또는 등장인물이 나온 긴 응답에만
    async scene(text) {
      try {
        if (typeof text !== "string" || !text || text.includes('x-dusk="scene"')) return "";
        const c = await ready(); if (!c?.scene) return "";
        const s = sceneOf(text, c.folder, { seed: c.seed, hint: c.hint }), ppl = peopleIn(text, c.folder, c.botName);
        if (!s.fromLine && !(ppl.length && text.length >= 300)) return "";
        return scenePanelHtml({ ...s, people: ppl.map((p) => ({ name: p.name, card: p.doc && c.links ? c.cardOf(p.doc) : null })) });
      } catch { return ""; }
    },
  };
}
