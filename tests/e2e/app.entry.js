// 1.7.0 메뉴 구조 시험용: 가짜 리스 api로 실제 createApp을 띄운다. node tests/e2e/run-app.mjs 로 실행.
import { createApp } from "../../src/ui/app.js";
import { createMemory } from "../../src/data/memory.js";
import POT_PROMPTS from "../../src/data/pot/prompts.json";
import { createEmptyWikiScope } from "../../src/engine/pot/wiki-schema.js";
import { createBlankPerson, ensureProfile, editProfile, addMetric } from "../../src/engine/wikiedit.js";
import { editMetricValue } from "../../src/engine/personedit.js";

export function fakeApi(seed = {}, story = false) {
  const store = { ...seed };
  const chars = [
    { chaId: "c1", name: "시로코", creator: "me", globalLore: [], chats: [{ message: [] }], image: "", type: "character" },
    { chaId: "c2", name: "호시노", creator: "me", globalLore: [], chats: [{ message: [] }], image: "", type: "character" }
  ];
  const MSGS = ["교실 문이 열렸다.", "안녕, 시로코. 오늘도 일찍 왔네.", "시로코는 고개를 끄덕였다. \"선생님이 먼저 오셨네요.\"", "같이 순찰 나갈래?", "시로코가 슬쩍 미소 지었다.", "좋아요, 가요.", "복도 끝에서 호시노가 졸고 있었다.", "호시노 선배, 또 여기서 자고 있어요?"];
  if (story) chars[0].chats = [{ id: "t1", name: "교실 이야기", message: MSGS.map((data, i) => ({ role: i % 2 ? "user" : "char", data, time: 1700000000000 + i * 60000 })) }];
  const db = { characters: chars, characterOrder: [], modules: [], plugins: [], personas: [] };
  return {
    store,
    pluginStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; }, removeItem: async (k) => { delete store[k]; }, keys: async () => Object.keys(store) },
    getColorScheme: async () => ({ scheme: { type: "light" } }),
    showContainer: async () => {}, hideContainer: async () => {},
    getDatabase: async () => structuredClone(db), setDatabaseLite: async () => {}, setDatabase: async () => {},
    getCharacterFromIndex: async (i) => structuredClone(chars[i]), setCharacterToIndex: async () => {},
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getChatFromIndex: async (ci, ti) => structuredClone(chars[ci]?.chats?.[ti] ?? { message: [] }),
    ...(seed.__bard ? { bardWiki: { getDocuments: async () => [] } } : {}),
    getRootDocument: async () => null, nativeFetch: async () => ({ status: 404 }), registerButton: async () => {}, registerSetting: async () => {}
  };
}
window.bootApp = async (seed, opts = {}) => {
  const api = fakeApi(seed, !!opts.story);
  delete api.store.__bard;
  const errors = (window.__errors = []);
  window.addEventListener("error", (e) => errors.push(e.message));
  window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason?.message ?? e.reason)));
  const app = createApp(api, { legacy: { open() {}, busy: false, startWithFiles() {} }, version: "1.7.0-dev", onPersonaChanged() {} });
  if (opts.memory) {  // 기억 탭까지 실제 저장소·흐름으로 띄운다(훅 등록은 가짜 api라 건너뜀)
    const memory = createMemory(api, { potLibrary: POT_PROMPTS });
    await memory.store.getIndex();
    app.ctx.memory = memory;
    if (opts.story) {  // 화면 사진용 기록·마지막 요청을 미리 채운다
      const rec = (id, act, g, at, extra = {}) => ({ id, act, g, at, at_ms: 1700000000000 + at * 60000, orphan: false, user: false, pin: false, ...extra });
      await memory.store.updateFolder("c1", "t1", (f) => {
        f.botName = "시로코"; f.chatName = "교실 이야기";
        f.people = {
          sirokko: { name: "시로코", records: [rec("r1", "선생님과 함께 순찰을 나가기로 했다", "B", 4), rec("r2", "교실에서 선생님을 기다렸다", "C", 2), rec("r3", "호시노를 걱정했다", "A", 6), rec("r4", "첫 인사를 나눴다", "D", 1, { digested: true })] },
          hoshino: { name: "호시노", records: [rec("r5", "복도에서 낮잠을 잤다", "C", 6), rec("r6", "선생님에게 잔소리를 들었다", "D", 7)] }
        };
        // 인물 위키: 시로코(수치·프로필 있음, AI가 40으로 쓴 호감도를 내가 62로 고침 → 롤백 충돌) · 호시노(비어 있음)
        const pol = JSON.parse(memory.lib.base.policies).policies["affinity.score"];
        let w = createBlankPerson(createEmptyWikiScope({ characterId: "c1", chatKey: "t1" }), "시로코");
        const sid = Object.keys(w.documents)[0];
        w = ensureProfile(w, sid); w = editProfile(w, sid, { summary: "차분하고 성실한 학생. 선생님을 믿고 따른다.", coreTraits: ["성실함", "조심스러움", "다정함"] });
        w = addMetric(w, sid, { slotId: "affinity.score", targetRefs: ["actor:user"], value: 40, reason: "AI 기록" }, pol);
        const aiHist = w.history[w.history.length - 1].id, mid = w.documents[sid].metrics[0].id;
        w = editMetricValue(w, sid, mid, 62, "직접 수정", pol);
        w = createBlankPerson(w, "호시노");
        const base = { identity: "x", messageId: "m4", contentHash: "h", requestRef: "req:x", batchRef: "", at: "2026-10-29T01:00:00.000Z", characterIndex: 0, chatIndex: 0, messageIndex: 4, messageKey: "k", documentCount: 1 };
        w.automation.records.done1 = { ...base, historyIds: [aiHist], status: "completed" };
        w.automation.records.conf1 = { ...base, historyIds: [], status: "manual", errorCode: "rollback-conflict", documentCount: 0 };
        f.wiki = w;
      }, { chaId: "c1", chatId: "t1" });
      memory.injector.lastRequest = () => ({ at: Date.now(), injected: true, manifest: { tokens: 420, recordIds: ["r1", "r2", "r3"], included: [{ kind: "person", name: "시로코", tokens: 300 }], excluded: [] } });
    }
  }
  window.__app = app;
  window.__api = api;
  // (opts.fresh: 처음 설치 흐름을 그대로 탄다)
  // 첫 둘러보기·새로 바뀐 점 창이 화면을 가리지 않게 미리 본 것으로 처리
  await app.open();
  if (!opts.fresh) document.querySelectorAll(".rb-modal, .rb-full").forEach((m) => m.remove());
  return true;
};
