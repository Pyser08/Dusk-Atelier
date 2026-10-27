// 장기기억 조립: 저장소·러너·주입·BardWiki 백엔드를 묶고, 선택된 백엔드에 따라 훅을 등록한다.
import { createMemoryStoreV3 as createMemoryStore } from "./memorystore3.js";
import { createMemoryRunner } from "./memoryrunner.js";
import { createMemoryInjector } from "./memoryinject.js";
import { createBardWikiBackend } from "./memorybackend-bardwiki.js";
import { selectBackend, capabilitiesOf } from "./memorybackend.js";
import { createCardStore } from "./cardstore.js";

export function createMemory(api, { notify = () => {}, log = (...a) => console.log("[Dusk 기억]", ...a) } = {}) {
  const store = createMemoryStore(api);
  const cards = createCardStore(api);
  const injector = createMemoryInjector(api, { store, log });
  const runner = createMemoryRunner(api, { store, log, notify, afterAnalyze: async (ci, ti) => { if (injector.mode() === "lore") await injector.syncLore(ci, ti); } });
  const bardwiki = createBardWikiBackend(api, { store, log });
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
    } else {
      await store.updateIndex((i) => { i.status.hook = sel.id === "bardwiki" ? "bardwiki" : "off"; });
    }
    if (sel.duplicate) notify("BardWiki와 장기기억이 중복돼요. 비용이 두 번 들 수 있어요.");
    return active;
  }
  return { store, cards, runner, injector, bardwiki, backend, capabilities: capabilitiesOf, start, active: () => active };
}
