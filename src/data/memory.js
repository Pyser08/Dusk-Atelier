// 장기기억 조립: 저장소·러너·주입·BardWiki 백엔드를 묶고, 선택된 백엔드에 따라 훅을 등록한다.
import { createMemoryStoreV3 as createMemoryStore } from "./memorystore3.js";
import { createMemoryRunner } from "./memoryrunner.js";
import { createMemoryInjector } from "./memoryinject.js";
import { createBardWikiBackend } from "./memorybackend-bardwiki.js";
import { selectBackend, capabilitiesOf } from "./memorybackend.js";
import { createCardStore } from "./cardstore.js";
import { createTurnFlow } from "./memoryturn.js";

export function createMemory(api, { notify = () => {}, log = (...a) => console.log("[Dusk 기억]", ...a), potLibrary = null, onOpen = null } = {}) {
  const store = createMemoryStore(api);
  const cards = createCardStore(api);
  const injector = createMemoryInjector(api, { store, log });
  const link = {};  // 턴 흐름이 켜지면 채워진다(리수폿 Writer와 기록 호출을 합칠 때 러너가 쓴다)
  const runner = createMemoryRunner(api, { store, log, notify, link, afterAnalyze: async (ci, ti) => { if (injector.mode() === "lore") await injector.syncLore(ci, ti); } });
  const bardwiki = createBardWikiBackend(api, { store, log });
  const flow = potLibrary ? createTurnFlow(api, { store, runner, injector, sourceLibrary: potLibrary, link, onOpen, log }) : null;
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
      if (sel.id === "bardwiki" && flow && idx.settings.potMode !== false && idx.settings.flow?.on === true) await flow.start().catch((e) => log("턴 흐름 시작 실패", e?.message ?? e));
    }
    if (sel.duplicate) notify("BardWiki와 장기기억이 중복돼요. 비용이 두 번 들 수 있어요.");
    return active;
  }
  return { store, link, cards, runner, injector, flow, lib: potLibrary, bardwiki, backend, capabilities: capabilitiesOf, start, active: () => active };
}
