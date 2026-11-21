// 장기기억 애드온(0.3.22): 응답 화면(display)에 붙이는 두 가지. 모델에 보내는 글·저장된 채팅은 그대로.
//  · 캐릭터 상태창: 본문 인물 이름에 링크(설정 inject.nameLinks, 기본 켜짐) — 얼굴 사진은 봇 이미지·에셋에서
//  · 장면 상태창: 응답 아래(로어북 버튼 위)에 날짜·시간·장소·날씨·등장인물(설정 inject.scenePanel, 기본 켜짐)
// 메시지마다 불리므로 지금 채팅 폴더·설정은 3초 동안 재사용하고, 상태창 HTML은 인물별로 한 번만 만든다.
import { readChar } from "./apiread.js";
import { statusCardHtml, linkNames, NAMECARD_CSS } from "../engine/namecard.js";
import { scenePanelHtml, sceneOf, peopleIn, SCENE_CSS } from "../engine/scenepanel.js";
import { charThumb } from "./charimg.js";
import { createCardOverlay } from "./cardoverlay.js";
import { FAB_CSS } from "./floatbtn.js";
import { logEvent } from "./memlog.js";
import { folderIdOf } from "./memorystore.js";

// 2.2.24: 상태창·장면 상태창 CSS는 응답 안 <style>이 아니라 리스 화면에 한 번만 넣는다.
// 응답 안 <style>은 리스가 바꿔 해석하다 ‘CSS ERROR’를 띄우고 일부만 적용돼 이름이 두 번 보이기도 했다.
// 리스 화면에 넣으려면 ‘메인 화면’ 권한이 필요하다(처음 한 번 물을 수 있음). 거절하면 애니메이션·바깥 눌러 닫기만 빠진다.
export const STATUS_CSS = NAMECARD_CSS + SCENE_CSS + FAB_CSS;
const CSS_ID = "dusk-status-css";
// 리스 화면 문서: ‘메인 화면’ 권한을 한 번 묻고(거절하면 다시 묻지 않음), 상태창 CSS를 한 번 넣는다
export function createCssMount(api) {
  let state = "idle", doc = null, job = null;   // idle | done | denied
  const ensureDoc = () => (job ??= (async () => {
    if (state === "done") return doc;
    if (state === "denied" || typeof api?.getRootDocument !== "function") return null;
    try {
      if (typeof api.requestPluginPermission === "function" && !await api.requestPluginPermission("mainDom")) { state = "denied"; return null; }
      const d = await api.getRootDocument(); if (!d) return null;
      const old = await d.querySelector(`[x-dusk="${CSS_ID}"]`); if (old) await old.remove();
      const parent = (await d.querySelector("head")) ?? (await d.querySelector("body"));
      const el = await d.createElement("style"); await el.setAttribute("x-dusk", CSS_ID); await el.setInnerText(STATUS_CSS); await parent.appendChild(el);
      doc = d; state = "done"; return d;
    } catch { return null; }
  })().finally(() => { job = null; }));
  return { ensureDoc, ready: () => state === "done" };
}

export function createNameLinks(memory, api = null) {
  const mount = createCssMount(api);
  let byId = new Map();
  // 2.2.28: 방식(화면 위/펼침)을 정하기 전에 응답을 그리면 펼침으로 남았다 → 권한 확인을 잠깐(최대 1.2초) 기다린다
  // 2.2.30: 화면 위 방식으로 이름만 넣었는데 리스 화면에서 그 이름을 하나도 못 찾으면(판에 따라 응답이 다른 문서·막힌 곳에 그려짐)
  // 이름을 눌러도 아무 일이 없다 → 펼침 방식으로 바꾸고 기록에 남긴다
  let spanMode = true, probe = null;
  const checkSpans = () => { if (probe || !spanMode) return; probe = setTimeout(async () => { probe = null; try { await overlay.hook(); } catch { /* 아래서 판단 */ } if (overlay.total() === 0 && spanMode) { spanMode = false; cache = null; logEvent({ area: "캐릭터 상태창", title: "리스 화면에서 이름을 찾지 못해 상태창을 이름 아래 펼침으로 바꿨어요(이름을 다시 누르면 닫혀요)" }); } }, 5000); };
  const decided = async () => { if (!spanMode) return false; if (mount.ready()) return true; await Promise.race([mount.ensureDoc().catch(() => null), new Promise((r) => setTimeout(r, 1200))]); return mount.ready() && spanMode; };
  const overlay = createCardOverlay({ ensureDoc: mount.ensureDoc, pids: () => [...byId.keys()], cardOf: (pid) => { const d = byId.get(pid); return d && cache?.cardOf ? cache.cardOf(d) : ""; }, log: (...a) => { console.log("[Dusk 상태창]", ...a); try { logEvent({ area: "캐릭터 상태창", title: a.map(String).join(" ").slice(0, 160) }); } catch { /* 기록 실패 무시 */ } } });
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
    byId = new Map(docs.map((d) => [d.id, d]));
    const people = docs.map((d) => ({ id: d.id, names: [d.title, ...(d.aliases ?? [])].filter((n) => String(n ?? "").trim().length >= 2), get html() { return cardOf(d); } }));
    cache = { key, links, scene, people, folder: f, cardOf, botName: character?.name ?? "", seed: `${cur.chaId}|${cur.chatId}`, hint: [character?.name, character?.desc].filter(Boolean).join(" ") };
    checked = Date.now();   // 2.2.22: 다 읽은 뒤에 시각을 적는다(읽는 데 3초가 넘으면 다 읽자마자 만료돼 매번 처음부터 다시 읽었다)
  };
  const ready = async () => { loading ??= load().finally(() => { loading = null; }); await loading; if (cache && !cache.off) { mount.ensureDoc().catch(() => {}); return cache; } return null; };
  return {
    invalidate() { cache = null; checked = 0; charMemo = null; },
    css: () => STATUS_CSS,
    overlay,
    ensureDoc: () => mount.ensureDoc(),
    // 2.2.25: 애드온이 켜질 때 미리 리스 화면 권한을 확인한다(응답을 그리기 전에 방식이 정해지게). 상태창이 꺼져 있으면 묻지 않는다
    async prepare() {
      const idx = await memory?.store?.getIndex?.().catch?.(() => null), inj = idx?.settings?.inject ?? {};
      if ((inj.nameLinks === false && inj.scenePanel === false) || idx?.settings?.backend === "off") return "off";
      const d = await mount.ensureDoc().catch(() => null);
      logEvent({ area: "캐릭터 상태창", title: d ? "리스 화면 맨 위에 상태창을 띄워요(바깥을 누르면 닫혀요)" : "리스 화면 권한이 없어 상태창을 이름 아래에 펼쳐요(이름을 다시 누르면 닫혀요)" });
      return d ? "overlay" : "inline";
    },
    // 본문 글에만 링크(뒤에 붙는 게이지·일기·로어북 상자는 호출하는 쪽이 따로 붙인다)
    async link(text) {
      try { if (typeof text !== "string" || !text) return text; const c = await ready(); if (!(c?.links && c.people.length)) return text; const ov = await decided(); const out = linkNames(text, c.people, { overlay: ov }); if (ov && out !== text) { overlay.soon(); checkSpans(); } return out; } catch { return text; }
    },
    // 장면 상태창 HTML(없으면 ""). 상태 줄이 있는 응답, 또는 등장인물이 나온 긴 응답에만
    async scene(text) {
      try {
        if (typeof text !== "string" || !text || text.includes('x-dusk="scene"')) return "";
        const c = await ready(); if (!c?.scene) return "";
        const s = sceneOf(text, c.folder, { seed: c.seed, hint: c.hint }), ppl = peopleIn(text, c.folder, c.botName);
        // 2.2.30: 상태 줄이 없으면 등장인물(위키 인물·봇 이름)이 글에 나온 긴 응답에만 — 리스바드는 응답 말고 다른 긴 글에도 이 처리를 거쳐 엉뚱한 곳(채팅 위쪽 전체 너비)에 붙었다
        if (!s.fromLine && !(ppl.length && text.length >= 300)) return "";
        const ov = await decided(); if (ov && c.links && ppl.some((p) => p.doc)) { overlay.soon(); checkSpans(); }
        return scenePanelHtml({ ...s, force: true, people: ppl.map((p) => (p.doc && c.links ? (ov ? { name: p.name, pid: p.doc.id } : { name: p.name, card: c.cardOf(p.doc) }) : { name: p.name })) });
      } catch { return ""; }
    },
  };
}
