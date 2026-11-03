// 장기기억 조립: 저장소·러너·주입·BardWiki 백엔드를 묶고, 선택된 백엔드에 따라 훅을 등록한다.
import { DEFAULT_PROMPT_BLOCKS } from "./memory-default-prompts.js";
import { createMemoryStoreV3 as createMemoryStore } from "./memorystore3.js";
import { createMemoryRunner } from "./memoryrunner.js";
import { createMemoryInjector } from "./memoryinject.js";
import { createEmbedder } from "./embed.js";
import { createRegexPrep } from "./regexprep.js";
import { createHypaImporter } from "./hypaimport.js";
import { createBardWikiBackend } from "./memorybackend-bardwiki.js";
import { selectBackend, capabilitiesOf } from "./memorybackend.js";
import { createCardStore } from "./cardstore.js";
import { createTurnFlow } from "./memoryturn.js";
import { customPromptPlain } from "../engine/pot/custom-prompts.js";
import { createGaugeService } from "./gauge.js";
import { createSwitches } from "./memoryswitches.js";

export function createMemory(api, { storyNow = null, notify = () => {}, log = (...a) => console.log("[Dusk 기억]", ...a), potLibrary = null, onOpen = null } = {}) {
  const store = createMemoryStore(api);
  const cards = createCardStore(api);
  let runner = null;  // 아래에서 만든다. 요청 직전 훅은 이 시점 이후에만 불린다.
  const embedder = createEmbedder(api, { log });
  const prep = createRegexPrep(api, { store, log });
  const hypa = createHypaImporter(api, { store });
  const injector = createMemoryInjector(api, { store, prep, storyNow, log, embedder, onRequest: () => runner?.confirmNext() });
  const gauge = createGaugeService(api, { store, log });
  const link = {};  // 턴 흐름이 켜지면 채워진다(리수폿 Writer와 기록 호출을 합칠 때 러너가 쓴다)
  runner = createMemoryRunner(api, { store, prep, log, notify, gauge, prompts: async () => (await flow?.settings?.())?.rawSnapshot?.() ?? null, link, afterAnalyze: async (ci, ti) => { if (injector.mode() === "lore") await injector.syncLore(ci, ti); } });
  const bardwiki = createBardWikiBackend(api, { store, log });
  const flow = potLibrary ? createTurnFlow(api, { store, runner, injector, embedder, sourceLibrary: potLibrary, link, onOpen, log }) : null;
  // 화면이 저장소에 직접 쓴 위키(문서 만들기·편집·합치기 등)를 기억 흐름 런타임의 사본에도 반영한다.
  // 안 그러면 방금 만든 문서를 AI 채우기·직접 지시가 못 찾아 "저장을 완료한 뒤 실행해주세요"로 잘못 안내된다.
  let syncTimer = null, syncTries = 0;
  const syncRuntimeWiki = () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const rt = flow?.runtime?.(); if (!rt?.wiki?.refresh) return;
      if (rt.auto?.processingKeys?.size && syncTries++ < 8) return syncRuntimeWiki();  // 자동 기록이 도는 중이면 끝난 뒤에 맞춘다
      syncTries = 0;
      try { await rt.wiki.refresh(); } catch (e) { log("위키 사본 갱신 실패", e?.message ?? e); }
    }, syncTries ? 1000 : 150);
  };
  store.onWikiWritten?.(() => { if (flow?.isOn?.()) syncRuntimeWiki(); });
  const backend = (settings) => selectBackend(api, settings?.backend ?? "auto");
  let active = "off";
  // 반환: 선택된 백엔드 id. bardwiki/off면 러너·주입 훅을 등록하지 않는다(이중 비용·이중 주입 방지).
  async function start() {
    await store.migrate().catch((e) => log("v1 이전 실패", e?.message ?? e));
    const idx = await store.getIndex(), sel = backend(idx.settings);
    active = sel.id;
    if (sel.id === "local") {
      await injector.start().catch((e) => log("주입 시작 실패", e?.message ?? e));
      await runner.start();
      if (flow) await flow.start().catch((e) => log("턴 흐름 시작 실패", e?.message ?? e));
    } else {
      await store.updateIndex((i) => { i.status.hook = sel.id === "bardwiki" ? "bardwiki" : "off"; });
      // 리수폿 기능이 켜져 있고 장기기억(턴 흐름)을 켜 둔 경우엔 BardWiki와 함께 돌린다 (사용자가 직접 켠 경우만)
      if ((sel.id === "bardwiki" || sel.id === "off") && flow && idx.settings.potMode !== false && idx.settings.flow?.on === true) await flow.start().catch((e) => log("턴 흐름 시작 실패", e?.message ?? e));
    }
    if (sel.duplicate) notify("BardWiki와 장기기억이 중복돼요. 비용이 두 번 들 수 있어요.");
    return active;
  }
  const switches = createSwitches({ api, store, flow });
  // 내 프롬프트 중 '장기기억 분석' 단계를 켠 것을 위치별 글로 돌려준다. 플러그인의 모든 AI 호출이 같은 위치로 끼운다(runai.js).
  // 범위(전체·봇·채팅)는 지금 열린 채팅 기준. 열린 채팅이 없으면 '전체' 범위만 적용된다.
  async function userPrompts() {
    let s = null;
    try { s = (await flow?.settings?.())?.rawSnapshot?.() ?? null; } catch { s = null; }
    if (!s) return DEFAULT_PROMPT_BLOCKS;   // 설정을 못 읽으면 기본 프롬프트를 기억/리수폿과 같은 위치(앞·뒤)로
    if (!s.customPrompts?.length) return null;   // 사용자가 지운 경우는 존중
    const cur = await switches.currentChat({ fresh: true }).catch(() => null), sc = cur ? { characterId: cur.chaId, chatKey: cur.chatId } : {};
    return { front: customPromptPlain(s, "memory", sc, "front"), middle: customPromptPlain(s, "memory", sc, "middle"), back: customPromptPlain(s, "memory", sc, "back") };
  }
  return { store, userPrompts, gauge, link, cards, runner, injector, embedder, prep, hypa, flow, lib: potLibrary, bardwiki, backend, capabilities: capabilitiesOf, switches, start, active: () => active };
}
