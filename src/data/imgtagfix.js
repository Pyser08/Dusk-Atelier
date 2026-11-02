// v1.8.2 AI 이미지 태그 교정·알림 훅. 설정에서 각각 켜고 끈다(기본 꺼짐). 모델 호출은 늘지 않는다.
// - 교정(output 훅): 응답 속 `<img …>` 태그를 이 봇·켜진 모듈의 에셋 이름에 맞춰 고친다.
// - 알림(beforeRequest): 요청 사본 끝에 지금 장면 캐릭터의 직전 옷·태그와 쓸 수 있는 키워드를 짧게 붙인다.
// - 직전 상황: 요청 기록에서 캐릭터별 마지막 옷·태그를 읽어(저장 안 함, 리롤 안전) 교정 때 빠진 옷을 채운다.
// 에셋 목록은 봇·채팅별로 5분 캐시. 응답이 나오는 중(스트리밍)에는 새로 읽지 않는다(getCharacterFromIndex는 채팅 전체를 복사해 무겁다).
import { buildAssetIndex, fixImgTags } from "../engine/imgtagfix.js";
import { hintForMessages, insertHint } from "../engine/imghint.js";
import { recentlyStreamed } from "./genstate.js";

export const IMGFIX_KEY = "dusk.ui.imgFix";
export const IMGFIX_HINT_KEY = "dusk.ui.imgFixHint";
export const IMGFIX_UNKNOWN_KEY = "dusk.ui.imgFixUnknown";
const isOn = (raw) => raw === "on" || raw === true || raw === "true";
const TTL = 5 * 60 * 1000, WAIT = 1500, KEEP = 30, KEY_MEMO = 1000;

export function createImgTagFix(api, { log = (...a) => console.log("[Dusk 이미지 태그]", ...a), now = () => Date.now(), streaming = () => recentlyStreamed() } = {}) {
  let on = false, hintOn = false, unknown = "remove";
  let outHooked = false, reqHooked = false, cache = null, loading = null, keyMemo = null, lastState = null;
  const recent = [];

  async function currentKey() {
    if (keyMemo && now() - keyMemo.at < KEY_MEMO && streaming()) return keyMemo.key;   // 조각마다 호스트에 묻지 않게(스트리밍 중에만 재사용)
    let key = null;
    try { key = `${(await api.getCurrentCharacterIndex?.()) ?? null}:${(await api.getCurrentChatIndex?.()) ?? ""}`; } catch { key = null; }
    keyMemo = { at: now(), key };
    return key;
  }

  async function readNames() {
    const names = [], groups = [names], pinned = [];   // 묶음: [봇 에셋, 모듈별 에셋…] — 모듈마다 이름 규칙을 따로 판단. pinned: 봇에 고정한 모듈 + 이 채팅에 지정한 모듈
    const idx = await api.getCurrentCharacterIndex?.();
    if (typeof idx === "number" && idx >= 0 && typeof api.getCharacterFromIndex === "function") {
      const ch = await api.getCharacterFromIndex(idx);
      if (ch?.type === "group") return [];   // 그룹 채팅: 멤버 봇의 에셋을 읽지 않으므로 아무것도 고치지 않는다(멀쩡한 태그를 지우지 않게)
      for (const a of [...(ch?.additionalAssets ?? []), ...(ch?.emotionImages ?? [])]) if (a?.[0]) names.push(String(a[0]));   // 추가 에셋 + 감정 이미지
      const chat = ch?.chats?.[ch?.chatPage ?? 0];
      if (Array.isArray(ch?.modules)) pinned.push(...ch.modules);
      if (Array.isArray(chat?.modules)) pinned.push(...chat.modules);
    }
    try {   // 켜진 모듈의 에셋(읽기만, 실패하면 봇 에셋만 쓴다)
      const db = typeof api.getDatabase === "function" ? await api.getDatabase(["modules", "enabledModules"]) : null;
      // 전역·봇 고정·채팅 지정을 모두 합친다. 모자라면 멀쩡한 태그를 지우게 되므로 넉넉하게 잡는 쪽이 안전하다.
      const enabled = new Set([...(Array.isArray(db?.enabledModules) ? db.enabledModules : []), ...pinned]);
      for (const m of Array.isArray(db?.modules) ? db.modules : []) {
        if (!enabled.has(m?.id)) continue;
        const list = (m?.assets ?? []).map((a) => a?.[0]).filter(Boolean).map(String);
        if (list.length) groups.push(list);
      }
    } catch { /* 모듈 에셋 없이 진행 */ }
    return groups;
  }
  function refresh(key) {
    loading ??= (async () => {
      try { cache = { at: now(), key, index: buildAssetIndex(await readNames()) }; }
      catch (e) { log("에셋 목록 읽기 실패", e?.message ?? e); cache = { at: now(), key, index: buildAssetIndex([]) }; }
      finally { loading = null; }
    })();
    return loading;
  }
  // wait=true: 목록이 없거나 오래됐으면 잠깐 기다려 새로 읽는다. 스트리밍 중에는 있는 목록(오래됐어도 같은 봇·채팅이면)을 쓴다.
  async function indexFor(key, { wait = true } = {}) {
    const same = cache && cache.key === key;
    if (same && now() - cache.at <= TTL) return cache.index;
    if (same && streaming()) return cache.index;
    if (!same && cache) cache = null;   // 다른 봇·채팅: 앞 목록은 쓰지 않는다
    const job = refresh(key);
    if (!wait) return null;
    const t = new Promise((r) => setTimeout(() => r("timeout"), WAIT));
    await Promise.race([job, t]);
    return cache?.key === key ? cache.index : null;
  }

  async function onOutput(text) {
    try {
      if (!on || typeof text !== "string" || !/<img\b/i.test(text)) return text;
      const key = await currentKey();
      const index = await indexFor(key, { wait: !streaming() });
      if (!index?.size) return text;
      const state = lastState?.key === key ? lastState.state : undefined;
      const r = fixImgTags(text, index, { unknown, state });
      if (!r.changed) return text;
      if (!streaming()) {   // 기록은 응답이 끝난 뒤 것만(조각마다 쌓이지 않게)
        recent.unshift({ at: now(), fixes: r.fixes });
        recent.length = Math.min(recent.length, KEEP);
        log(`태그 ${r.fixes.length}개 교정`, r.fixes.map((f) => `${f.from} → ${f.to ?? "(삭제)"} [${f.kind}]`).join(" | "));
      }
      return r.text;
    } catch (e) { log("교정 실패(원문 유지)", e?.message ?? e); return text; }
  }

  async function beforeRequest(messages, type) {
    try {
      if ((!on && !hintOn) || (type && type !== "model") || !Array.isArray(messages)) return messages;
      const key = await currentKey();
      const index = await indexFor(key);
      if (!index?.size) return messages;
      const r = hintForMessages(messages, index);
      if (!r) return messages;
      lastState = { key, state: r.state };
      return hintOn && r.hint ? insertHint(messages, r.hint) : messages;
    } catch (e) { log("알림 넣기 실패(원문 유지)", e?.message ?? e); return messages; }
  }

  async function hook() {
    if ((on || hintOn) && !reqHooked && typeof api.addRisuReplacer === "function") {
      try { await api.addRisuReplacer("beforeRequest", beforeRequest); reqHooked = true; } catch (e) { log("요청 훅 등록 실패(직전 상황·알림 없이 동작)", e?.message ?? e); }
    }
    if (on && !outHooked && typeof api.addRisuScriptHandler === "function") {
      try { await api.addRisuScriptHandler("output", onOutput); outHooked = true; } catch (e) { log("출력 훅 등록 실패", e?.message ?? e); }
    }
    return on ? outHooked : true;
  }
  async function start() {
    try { on = isOn(await api.pluginStorage.getItem(IMGFIX_KEY)); } catch { on = false; }
    try { hintOn = isOn(await api.pluginStorage.getItem(IMGFIX_HINT_KEY)); } catch { hintOn = false; }
    try { unknown = (await api.pluginStorage.getItem(IMGFIX_UNKNOWN_KEY)) === "keep" ? "keep" : "remove"; } catch { unknown = "remove"; }
    if (on || hintOn) await hook();
    return on;
  }
  async function set(v) {
    on = !!v; cache = null;
    await api.pluginStorage.setItem(IMGFIX_KEY, on ? "on" : "off");
    return on ? hook() : true;
  }
  async function setHint(v) {
    hintOn = !!v;
    await api.pluginStorage.setItem(IMGFIX_HINT_KEY, hintOn ? "on" : "off");
    return hintOn ? hook() : true;
  }
  async function setUnknown(v) {
    unknown = v === "keep" ? "keep" : "remove";
    await api.pluginStorage.setItem(IMGFIX_UNKNOWN_KEY, unknown);
    return unknown;
  }
  return {
    start, set, setHint, setUnknown, onOutput, beforeRequest,
    isOn: () => on, isHintOn: () => hintOn, unknownMode: () => unknown, recent: () => [...recent],
    invalidate: () => { cache = null; keyMemo = null; },
    assetIndex: async () => indexFor(await currentKey()),   // 지금 열린 봇·채팅의 에셋 색인(도구 탭 '에셋 태그 고치기'용)
  };
}
