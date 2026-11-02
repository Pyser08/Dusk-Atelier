// v1.8.2 AI 이미지 태그 교정 훅. 설정에서 켜고 끈다(기본 꺼짐).
// 응답이 저장되기 전(output 훅)에 `<img …>` 태그를 이 봇의 에셋 목록에 맞춰 고친다. 모델은 부르지 않는다.
// 에셋 목록은 `<img` 가 들어 있는 응답에서만, 20초 캐시로 읽는다(스트리밍 조각마다 읽지 않는다). 읽기가 느리면 이번 응답은 그대로 두고 다음에 고친다.
import { buildAssetIndex, fixImgTags } from "../engine/imgtagfix.js";

export const IMGFIX_KEY = "dusk.ui.imgFix";
export const IMGFIX_UNKNOWN_KEY = "dusk.ui.imgFixUnknown";
const isOn = (raw) => raw === "on" || raw === true || raw === "true";
const TTL = 20000, WAIT = 1500, KEEP = 30;

export function createImgTagFix(api, { log = (...a) => console.log("[Dusk 이미지 태그]", ...a), now = () => Date.now() } = {}) {
  let on = false, hooked = false, unknown = "remove", cache = null, loading = null;
  const recent = [];

  async function readNames() {
    const names = [];
    const pinned = [];   // 봇에 고정한 모듈 + 이 채팅에 지정한 모듈
    const idx = await api.getCurrentCharacterIndex?.();
    if (typeof idx === "number" && idx >= 0 && typeof api.getCharacterFromIndex === "function") {
      const ch = await api.getCharacterFromIndex(idx);
      for (const a of ch?.additionalAssets ?? []) if (a?.[0]) names.push(String(a[0]));
      const chat = ch?.chats?.[ch?.chatPage ?? 0];
      if (Array.isArray(ch?.modules)) pinned.push(...ch.modules);
      if (Array.isArray(chat?.modules)) pinned.push(...chat.modules);
    }
    try {   // 켜진 모듈의 에셋(읽기만, 실패하면 봇 에셋만 쓴다)
      const db = typeof api.getDatabase === "function" ? await api.getDatabase(["modules", "enabledModules"]) : null;
      // 전역·봇 고정·채팅 지정을 모두 합친다. 모자라면 멀쩡한 태그를 지우게 되므로 넉넉하게 잡는 쪽이 안전하다.
      const enabled = new Set([...(Array.isArray(db?.enabledModules) ? db.enabledModules : []), ...pinned]);
      for (const m of Array.isArray(db?.modules) ? db.modules : []) if (enabled.has(m?.id)) for (const a of m?.assets ?? []) if (a?.[0]) names.push(String(a[0]));
    } catch { /* 모듈 에셋 없이 진행 */ }
    return { idx, names, chat: await api.getCurrentChatIndex?.() };
  }
  function refresh() {
    loading ??= (async () => {
      try {
        const { idx, names, chat } = await readNames();
        cache = { at: now(), key: `${idx}:${chat ?? ""}`, index: buildAssetIndex(names) };
      } catch (e) { log("에셋 목록 읽기 실패", e?.message ?? e); cache = { at: now(), key: undefined, index: buildAssetIndex([]) }; }
      finally { loading = null; }
    })();
    return loading;
  }
  async function indexNow() {
    let cur = null;   // 봇·채팅이 바뀌면 목록이 달라질 수 있다(채팅마다 켠 모듈이 다름)
    try { cur = `${(await api.getCurrentCharacterIndex?.()) ?? null}:${(await api.getCurrentChatIndex?.()) ?? ""}`; } catch { cur = null; }
    if (cache && cur !== cache.key) cache = null;   // 다른 봇으로 바뀌면 앞 봇의 목록을 쓰지 않는다
    if (!cache || now() - cache.at > TTL) {
      const wait = new Promise((r) => setTimeout(() => r("timeout"), WAIT));
      if ((await Promise.race([refresh(), wait])) === "timeout" && !cache) return null;
    }
    return cache?.index ?? null;
  }

  async function onOutput(text) {
    try {
      if (!on || typeof text !== "string" || !/<img\b/i.test(text)) return text;
      const index = await indexNow();
      if (!index?.size) return text;
      const r = fixImgTags(text, index, { unknown });
      if (!r.changed) return text;
      recent.unshift({ at: now(), fixes: r.fixes });
      recent.length = Math.min(recent.length, KEEP);
      log(`태그 ${r.fixes.length}개 교정`, r.fixes.map((f) => `${f.from} → ${f.to ?? "(삭제)"} [${f.kind}]`).join(" | "));
      return r.text;
    } catch (e) { log("교정 실패(원문 유지)", e?.message ?? e); return text; }
  }

  async function hook() {
    if (hooked || typeof api.addRisuScriptHandler !== "function") return hooked;
    try { await api.addRisuScriptHandler("output", onOutput); hooked = true; } catch (e) { log("출력 훅 등록 실패", e?.message ?? e); }
    return hooked;
  }
  async function start() {
    try { on = isOn(await api.pluginStorage.getItem(IMGFIX_KEY)); } catch { on = false; }
    try { unknown = (await api.pluginStorage.getItem(IMGFIX_UNKNOWN_KEY)) === "keep" ? "keep" : "remove"; } catch { unknown = "remove"; }
    if (on) await hook();
    return on;
  }
  async function set(v) {
    on = !!v; cache = null;
    await api.pluginStorage.setItem(IMGFIX_KEY, on ? "on" : "off");
    return on ? hook() : true;
  }
  async function setUnknown(v) {
    unknown = v === "keep" ? "keep" : "remove";
    await api.pluginStorage.setItem(IMGFIX_UNKNOWN_KEY, unknown);
    return unknown;
  }
  return { start, set, setUnknown, isOn: () => on, unknownMode: () => unknown, recent: () => [...recent], onOutput, invalidate: () => { cache = null; } };
}
