import { LIB as ADDON_LIB } from "../../src/addonlib.gen.js";
globalThis.__duskLib = ADDON_LIB;   // 배포용 애드온 파일(addons/dist) 시험용
import { activate as chatthemeAddon } from "../../addons/chattheme/index.js";
import { activate as aibuildAddon } from "../../addons/aibuild/index.js";
import { activate as widgetsAddon } from "../../addons/widgets/index.js";
import { activate as manageAddon } from "../../addons/manage/index.js";
import { activate as memoryAddon } from "../../addons/memory/index.js";
import { activate as cardsAddon } from "../../addons/cards/index.js";
import { activate as protlinkAddon } from "../../addons/protlink/index.js";
import { renderProtLink as _rp } from "../../src/ui/screens/protlink.js";
import { renderMemory as _rm } from "../../src/ui/screens/memory/index.js";
import { renderRelMap as _rr } from "../../src/ui/screens/relmap.js";
import { renderCardsTab as _rc } from "../../src/ui/screens/cards/index.js";
const FEATURE_ADDONS = [manageAddon, chatthemeAddon, aibuildAddon, widgetsAddon];
import { createAddons } from "../../src/data/addons.js";
import { createSkillStore } from "../../src/data/skillstore.js";
import { normalizeSkillSet } from "../../src/engine/skills.js";
// 1.7.0 메뉴 구조 시험용: 가짜 리스 api로 실제 createApp을 띄운다. node tests/e2e/run-app.mjs 로 실행.
import { createApp } from "../../src/ui/app.js";
import { createProvider } from "../../src/data/provider/index.js";
import { createWidgetHome } from "../../src/data/widgethome.js";
import { createProtLink } from "../../src/data/protlink.js";
import { createStore as createBackupStore, backupSnapshot } from "../../src/engine/index.js";
import { createMemory } from "../../src/data/memory.js";
import POT_PROMPTS from "../../src/data/pot/prompts.json";
import { createEmptyWikiScope } from "../../src/engine/pot/wiki-schema.js";
import { createBlankPerson, ensureProfile, editProfile, addMetric } from "../../src/engine/wikiedit.js";
import { editMetricValue } from "../../src/engine/personedit.js";

export function fakeApi(seed = {}, story = false, mods = false) {
  const store = { ...seed };
  const chars = [
    { chaId: "c1", name: "시로코", creator: "me", globalLore: [], chats: [{ message: [] }], image: "", type: "character" },
    { chaId: "c2", name: "호시노", creator: "me", globalLore: [], chats: [{ message: [] }], image: "", type: "character" }
  ];
  const MSGS = ["교실 문이 열렸다.", "안녕, 시로코. 오늘도 일찍 왔네.", "시로코는 고개를 끄덕였다. \"선생님이 먼저 오셨네요.\"", "같이 순찰 나갈래?", "시로코가 슬쩍 미소 지었다.", "좋아요, 가요.", "복도 끝에서 호시노가 졸고 있었다.", "호시노 선배, 또 여기서 자고 있어요?"];
  if (story) chars[0].chats = [{ id: "t1", name: "교실 이야기", message: MSGS.map((data, i) => ({ role: i % 2 ? "user" : "char", data, time: 1700000000000 + i * 60000 })) }];
  const db = { characters: chars, characterOrder: [], modules: [], plugins: [], personas: [] };
  if (mods) {  // 5단계 시험·사진용 모듈·페르소나
    const lore = (n) => Array.from({ length: n }, (_, i) => ({ comment: `항목 ${i + 1}`, key: "k" + i, content: "내용", mode: "normal" }));
    db.modules = [
      { id: "m1", name: "학원 세계관", namespace: "school", description: "학원 배경 설정과 용어 모음", lorebook: lore(12), regex: [{ comment: "이모지 제거", in: "x", out: "" }], trigger: [], assets: [] },
      { id: "m2", name: "전투 규칙", description: "전투 판정 보조", lorebook: lore(4), regex: [], trigger: [{ comment: "t", conditions: [], effect: [] }], assets: [] },
      { id: "m3", name: "연애 시스템", description: "호감도 연출", lorebook: lore(7), regex: [{ comment: "r", in: "a", out: "b" }, { comment: "r2", in: "c", out: "d" }], trigger: [], assets: [] }
    ];
    db.enabledModules = ["m1", "m3"];
    db.personas = [{ id: "p1", name: "선생님" }, { id: "p2", name: "학생회장" }];
    db.plugins = [
      { name: "dusk_atelier", displayName: "Dusk Atelier", versionOfPlugin: "1.7.0", version: 3, script: "x".repeat(3300000), enabled: true },
      { name: "risupot", displayName: "RisuPot", versionOfPlugin: "2.3.0", version: 3, script: "x".repeat(180000), enabled: true },
      { name: "tts_helper", displayName: "TTS 도우미", versionOfPlugin: "0.9.1", version: 3, script: "x".repeat(24000), enabled: false }
    ];
    chars[0].modules = ["m1", "m3"];
    store["rbm:persona:v1"] = JSON.stringify({ map: { p1: ["m1"] }, injectedIndex: {}, chatInjected: {} });
  }
  return {
    store,
    pluginStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; }, removeItem: async (k) => { delete store[k]; }, keys: async () => Object.keys(store) },
    getColorScheme: async () => ({ scheme: { type: "light" } }),
    showContainer: async () => {}, hideContainer: async () => {},
    getDatabase: async () => structuredClone(db), setDatabaseLite: async () => {}, setDatabase: async () => {},
    getCharacterFromIndex: async (i) => structuredClone(chars[i]), setCharacterToIndex: async (i, c) => { (window.__charWrites ??= []).push({ i, c: structuredClone(c) }); },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getChatFromIndex: async (ci, ti) => structuredClone(chars[ci]?.chats?.[ti] ?? { message: [] }),
    ...(seed.__bard ? { bardWiki: { getDocuments: async () => [] } } : {}),
    getRootDocument: async () => null, nativeFetch: async (u, o) => { (window.__nf ??= []).push([u, o?.method]); if (window.__cellarOn && /\/cellar\/plugins$/.test(u)) { const b = JSON.parse(o.body); (window.__cpCalls ??= []).push(b); const r = window.__cpHandle(b); return { status: r.status, json: async () => r.body }; } if (window.__cellarOn && /\/cellar\/backup$/.test(u)) { if (o?.method === "POST") (window.__bkPosts ??= []).push(JSON.parse(o.body)); return { status: 200, json: async () => (o?.method === "POST" ? { ok: true, job: { done: 0 } } : { ok: true, items: window.__bkItems ?? [], job: window.__bkJob ?? null }) }; } return window.__cellarOn && /\/cellar\/health$/.test(u) ? { status: 200, json: async () => ({ ok: true, name: "dusk-cellar", version: "0.1.0", auth: true, ...(window.__cellarFeat ? { features: window.__cellarFeat } : {}) }) } : { status: 404 }; }, registerButton: async () => {}, registerSetting: async () => {}
  };
}
window.bootApp = async (seed, opts = {}) => {
  // 1.8.3 시작 안내는 기본으로 '본 것'으로 시작한다(안내 자체를 시험할 때만 opts.onboard)
  if (!opts.onboard) { const ui = JSON.parse(seed["rbm:ui:v1"] ?? "{}"); ui.onboardDone ??= true; ui.onboardVer ??= 99; seed = { ...seed, "rbm:ui:v1": JSON.stringify(ui) }; }
  const api = fakeApi(seed, !!opts.story, !!opts.mods);
  delete api.store.__bard;
  const errors = (window.__errors = []);
  window.addEventListener("error", (e) => errors.push(e.message));
  window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason?.message ?? e.reason)));
  if (opts.provider) {  // 프로바이더 화면 시험: 가짜 호스트에 addProvider·nativeFetch·로컬 저장소를 붙인다
    window.__providers = []; const local = {};
    api.addProvider = async (name) => { window.__providers.push(name); };
    api.getLocalPluginStorage = async () => ({ getItem: async (k) => local[k] ?? null, setItem: async (k, v) => { local[k] = v; } });
    api.nativeFetch = async (url) => new Response(JSON.stringify({ data: [{ id: "gpt-test-mini" }, { id: "gpt-test-large" }] }), { status: 200, headers: { "content-type": "application/json" } });
  }
  const app = createApp(api, { legacy: { open() {}, busy: false, startWithFiles() {} }, version: "1.7.0-dev", onPersonaChanged() {} });
  if (opts.provider) { app.ctx.provider = createProvider(api, { confirm: async () => false, createStore: createBackupStore, backupSnapshot }); }
  if (opts.widgetHome) {  // 위젯 홈 설정 카드·도구 행 시험: 실제 컨트롤러 + 가짜 화면
    window.__wh = { boots: 0, disposed: 0, opened: 0 };
    const store = {}; api.pluginStorage = api.pluginStorage ?? { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; } };
    api.showContainer = api.showContainer ?? (async () => {}); api.registerButton = api.registerButton ?? (async () => ({}));
    app.ctx.widgetHome = createWidgetHome(api, { boot: async () => { __wh.boots++; return { dispose: async () => { __wh.disposed++; }, isVisible: () => false, close: async () => {}, open: async () => { __wh.opened++; return true; }, autoStatus: () => "" }; } });
    app.ctx.openWidgetHome = async () => { try { await app.close(); } catch {} return app.ctx.widgetHome.open(); };
  }
  if (opts.protlink) {  // ProtLink+ 화면 시험: 실제 컨트롤러 + 가짜 Proton 연결부
    window.__pl = { opened: [], imported: [], saved: [], files: [{ uid: "a", name: "시로코.risum", size: 2048, modifiedAt: 1, path: [] }], state: "ready" };
    const base = api.pluginStorage;
    api.pluginStorage = { ...base };
    api.getDatabase = async () => ({ characters: [{ chaId: "c1", name: "시로코" }, { chaId: "c2", name: "호시노" }], modules: [{ id: "m1", name: "시로코 모듈" }, { id: "m2", name: "다른 모듈" }], plugins: [{ name: "plug_a", displayName: "내 플러그인", versionOfPlugin: "1.0.0" }] });
    api.showContainer = api.showContainer ?? (async () => {}); api.hideContainer = api.hideContainer ?? (async () => {});
    const driver = { PZ: () => ({}), Ln: (e) => String(e?.message ?? e), G3: () => ({ open: async () => (__pl.state === "ready" ? { kind: "ready", share: { root: { name: "시로코 모음" }, download: async (f) => new Uint8Array([1, 2, 3]) } } : { kind: __pl.state }), drop() {} }), Sp: async () => ({ files: __pl.files.slice(), folders: 0, partial: false }) };
    app.ctx.protlink = createProtLink(api, { driver, originalProbe: async () => !!window.__plOriginal, startDelay: 1e9, hooks: { importFiles: async (f, t) => { __pl.imported.push([f.map((x) => x.name), t]); }, saveFile: async (n) => { __pl.saved.push(n); } } });
    await app.ctx.protlink.boot();
  }
  // 코코아(스킬) 화면: 실제 스킬 저장소. opts.skills면 세트 3개를 미리 넣는다(첫 세트는 정리 노트·기록하기에 붙임).
  app.ctx.skills = createSkillStore(api, { log() {} });
  if (opts.skills) {
    const md = (n) => `---\nname: ${n}\ndescription: ${n} 설명\nskill_format: 2\ninject_order: 100\nsystem_prompt: |\n  ${n} 지침\n---\n# ${n}\n`;
    for (const [i, n] of ["문체 다듬기", "전투 묘사", "관계 메모"].entries()) await app.ctx.skills.importSet(normalizeSkillSet({ name: n, files: [{ path: `${n}/SKILL.md`, content: md(n) }] }, i), "new");
    const lib = await app.ctx.skills.getLibrary(), cfg = await app.ctx.skills.getCfg(), first = lib.sets[0];
    await app.ctx.skills.saveCfg({ ...cfg, on: true, stages: { ...cfg.stages, director: [{ id: first.id, name: first.name }], writer: [{ id: first.id, name: first.name }] } });
  }
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
  // 기능 애드온: 실제 사용자처럼 켜 둔 상태로 시험(소스를 바로 불러 같은 모듈 사용). coreOnly면 코어만.
  if (!opts.coreOnly) for (const act of FEATURE_ADDONS) await act(api, { ext: app.ctx.ext, app: app.ctx, toast: (t, o) => { app.ctx.toast?.(t, o); }, openDusk: async () => {} });
  // 장기기억·기억카드 애드온(2.0.0): opts.memory면 위에서 만든 기억으로 실제 애드온을 켠다.
  // 아니면 예전처럼 기억 없이 탭만 보이게(화면은 '준비되지 않았어요') 자리만 채운다.
  if (!opts.coreOnly) {
    const actx = { ext: app.ctx.ext, app: app.ctx, toast: (t, o) => { app.ctx.toast?.(t, o); }, openDusk: async () => {} };
    // ProtLink+: opts.protlink면 위에서 만든 컨트롤러로 애드온을 켜고, 아니면 탭 자리만(예전처럼 ctx.protlink 없음)
    if (app.ctx.protlink) { app.ctx.protlinkForTest = app.ctx.protlink; await protlinkAddon(api, actx); }
    else { app.ctx.ext.add("tab", "protlink", _rp); app.ctx.ext.add("svc", "protlink", { on: () => false, list: async () => ({ ok: false, items: [] }), lastError: () => "", targets: async () => [] }); }
    if (app.ctx.memory) { app.ctx.memoryForTest = app.ctx.memory; await memoryAddon(api, actx); await cardsAddon(api, actx); }
    else {
      app.ctx.ext.add("tab", "memory", _rm); app.ctx.ext.add("tab", "relmap", _rr); app.ctx.ext.add("tab", "cards", _rc);
      app.ctx.ext.add("svc", "memory", {}); app.ctx.ext.add("svc", "cards", {}); app.ctx.ext.add("svc", "memoryui", { tracked: () => null, STAGE_NAMES: {} });
    }
  }
  if (opts.onboard && !opts.addons) {  // 시작 안내 '기능' 단계용 가짜 애드온 관리자(받기·켜기만 기록)
    const idx = {}, man = [{ id: "memory", name: "장기기억·관계도", version: "1.0.0", desc: "기억", requires: [] }, { id: "cards", name: "기억카드", version: "1.0.0", desc: "카드", requires: ["memory"] }];
    window.__addonLog = [];
    app.ctx.addons = { loadManifest: async () => man, manifest: () => man, getIndex: async () => ({ ...idx }), core: () => "2.0.0", lastError: () => "", running: () => [], check: async () => ({ updates: [], held: [] }), remove: async () => {}, subscribe: () => () => {},
      install: async (id) => { for (const r of man.find((a) => a.id === id).requires) idx[r] ??= { version: "1.0.0", on: true }; idx[id] = { version: "1.0.0", on: true }; window.__addonLog.push(["install", id]); },
      setOn: async (id, on) => { idx[id] = { ...idx[id], on }; window.__addonLog.push(["setOn", id, on]); } };
  }
  if (opts.addons) {  // 애드온 카드 시험: 파일은 실행기가 window.__addonFiles로 넣어 준다(주소 → 내용)
    app.ctx.addons = createAddons(api, { core: "2.0.0", ctx: { toast: (t, o) => app.ctx.toast?.(t, o) }, fetcher: async (_a, url0) => { const url = url0.split("?")[0]; return (url.endsWith("addons.json") ? window.__addonFiles?.manifest : window.__addonFiles?.[url]) ?? null; } });
    await app.ctx.addons.boot();
  }
  window.__app = app;
  window.__api = api;
  // (opts.fresh: 처음 설치 흐름을 그대로 탄다)
  // 첫 둘러보기·새로 바뀐 점 창이 화면을 가리지 않게 미리 본 것으로 처리
  await app.open();
  if (!opts.fresh) document.querySelectorAll(".rb-modal, .rb-full").forEach((m) => m.remove());
  return true;
};
