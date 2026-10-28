// 턴 흐름 (v1.6.4 4단계): 리수폿 인물 위키(고르기·정리 노트·기록하기)와 Dusk 기록을 한 흐름으로 묶는다.
//
//  [요청 직전] 고르기(Router) → 회상(Recall) → 정리 노트(Director) → 주입(Inject)
//    - 위키 검색·고르기·정리 노트는 리수폿 MainWikiHook이 하고, 정리 노트에 Dusk 회상이 장기기억 참고로 같이 들어간다(mergeRecall).
//    - 마지막에 [Dusk Memory] 블록(이야기 요약·열린 항목·지식 경계 등)이 같은 요청에 들어간다. 고른 인물은 장면에 있는 것처럼 다룬다.
//  [응답 뒤] 기록하기(Writer): 리수폿 Writer 호출에 Dusk 기록 구획(dusk)을 같이 실어 한 번에 받는다.
//    - 두 구획은 따로 검증한다. dusk 구획이 없거나 틀리면 기존 방식(따로 한 번 더 호출)으로 대신한다.
//  빠른 모드: 모델 호출 없이 키워드로 인물을 고르고 정리 노트를 건너뛴다(응답 뒤 호출 1회). 정확하게: 고르기+정리 노트 사용.
import { SettingsStore } from "../engine/pot/settings.js";
import { WikiController } from "./pot/wiki-controller.js";
import { AutoWikiController } from "./pot/auto-wiki.js";
import { MainWikiHook } from "./pot/main-wiki-hook.js";
import { RuntimeTraceStore } from "./pot/runtime-trace.js";
import { RuntimeHookManager } from "./pot/runtime-hooks.js";
import { callWriterModel } from "./pot/llm-client.js";
import { createPotStorage } from "./potstorage.js";
import { keyStore as hubKeys, getCfg, recordUsage } from "./modelhub.js";
import { potModels } from "../engine/modelcfg.js";
import { recallFor, mergeMemory } from "../engine/recall.js";
import { createRetryToast, judgeAutoResult } from "./retrytoast.js";
import { loadReconciled } from "./memoryload.js";
import { appendDuskSection, splitDusk, checkDusk, SECTION_MARK } from "../engine/duskwriter.js";
import { cycleStates, milestonesBetween } from "../engine/cyclememo.js";
import { makeTools } from "./memorytools.js";

const READONLY = new Set(["writer_schema", "director_schema", "slots", "policies"]);
export const promptKeysOf = (lib) => Object.entries(lib).flatMap(([id, parts]) => Object.keys(parts).filter((p) => !READONLY.has(p)).map((p) => `${id}:${p}`));
export const stageOf = (label) => /^router/i.test(label) ? "router" : /^director/i.test(label) ? "director" : "writer";
const STASH_MAX = 8;

// link: 러너와 공유하는 빈 객체. 턴 흐름이 켜지면 settle/take가 채워진다.
export function createTurnFlow(api, { store, runner, injector, sourceLibrary, link = {}, onOpen = null, log = (...a) => console.log("[Dusk 기억]", ...a), scheduler = globalThis } = {}) {
  let rt = null, starting = null, lastTurn = null, cold = null;
  // pure: 기억 저장소가 '끔'이면 Dusk 자체 기억(기록·회상·주입)은 전부 빼고 리수폿 위키 정리만 돌린다
  let pure = false;
  let cyclePending = null; const cycleEvents = [];  // 월경·임신: 응답 전 상태 → 응답 뒤 달라진 큰 사건(출산 등)을 Dusk 기록 대기열에
  const stash = new Map();  // 메시지 해시 → 검증된 dusk 구획
  const putStash = (h, v) => { stash.set(h, v); while (stash.size > STASH_MAX) stash.delete(stash.keys().next().value); };
  const libFor = (mode) => mode === "accurate" ? sourceLibrary : { ...sourceLibrary, base: { ...sourceLibrary.base, director: undefined } };

  const flowOf = async () => { const f = (await store.getIndex()).settings.flow ?? {}; return { on: f.on === true, advanced: f.advanced === true, mode: f.mode === "accurate" ? "accurate" : "fast", recallTokens: f.recallTokens }; };

  async function syncPot(settings, f) {
    const cfg = await getCfg(api), m = potModels(cfg);
    settings.update((s) => {
      s.enabled = true; s.autoWriterEnabled = true; s.retrievalMode = f.mode === "accurate" ? "router" : "keyword";
      if (!f.advanced) { s.hypaReferenceEnabled = false; s.hypaPlusReferenceEnabled = false; }  // 리스 기본 메모리(Hypa)는 Dusk 장기기억이 대신한다: 고급 모드를 켰을 때만 설정값을 따른다
      s.useRisuSubmodel = m.useRisuSubmodel;
      if (!m.useRisuSubmodel) { s.models.shared = m.shared; for (const [k, v] of Object.entries(m.stages)) s.models.stages[k] = v.mode === "dedicated" ? v : { ...s.models.stages[k], mode: "shared" }; }
    });
  }

  async function build() {
    const storage = createPotStorage(api, store), keys = await hubKeys(api);
    const settings = new SettingsStore(storage, { promptKeys: promptKeysOf(sourceLibrary) });
    await settings.load();
    if (settings.status().blocked) {  // 가져온 설정이 해석되지 않으면 원본은 보관하고 새 설정으로 시작한다
      await store.updateIndex((idx) => { idx.pot ??= {}; idx.pot.settingsBackup = idx.pot.settings; idx.pot.settings = null; });
      await settings.load();
    }
    settings.forceRelationshipOnlyMode();
    const trace = new RuntimeTraceStore(api.pluginStorage); await trace.load().catch(() => {});
    const wiki = new WikiController(api, storage, { isEnabled: () => settings.snapshot().enabled });
    settings.setActiveBotResolver?.(() => wiki.scope?.characterId || "");

    const stageCall = async (a, k, preset, prompt, opts = {}) => callWriterModel(a, k, preset, prompt, { ...opts, onUsage: (u) => { opts.onUsage?.(u); recordUsage(api, stageOf(String(opts.stageLabel ?? "")), u).catch(() => {}); } });
    // 기록하기: Dusk 구획을 같이 싣고, 돌아온 응답에서 떼어 낸다.
    const writerCall = async (a, k, preset, prompt, opts = {}) => {
      const label = String(opts.stageLabel ?? ""); let sent = prompt, prep = null;
      if (/^writer/i.test(label)) { try { cyclePending = cycleStates(wiki.snapshot()); } catch { cyclePending = null; } }
      const had = String(prompt).includes(SECTION_MARK);
      if (/^writer/i.test(label) && !pure) {
        try { prep = await runner.prepareLatest(await api.getCurrentCharacterIndex(), await api.getCurrentChatIndex()); } catch { prep = null; }
        if (prep && !had && !stash.has(prep.h)) sent = appendDuskSection(prompt, prep.input);
      }
      const text = await stageCall(a, k, preset, sent, opts);
      if (prep && (sent !== prompt || had)) {
        const { raw, dusk } = splitDusk(text), ok = checkDusk(dusk, { ignore: prep.ignore });
        if (ok) putStash(prep.h, ok);
        return raw;
      }
      return text;
    };

    const auto = new AutoWikiController({ api, settingsStore: settings, keyStore: keys, wikiController: wiki, sourceLibrary, traceStore: trace, scheduler, llmCall: writerCall });
    // 자동 기록이 막히거나 비었을 때 오른쪽 아래에 알리고, 거기서 바로 다시 시도한다.
    const toast = createRetryToast(api, { scheduler, onRetry: () => auto.retry(), onOpen: () => onOpen?.() });
    let seen = "";
    auto.subscribe((st) => {
      const key = `${st.phase}|${st.message}`;
      if (key === seen || !["completed", "failed", "manual"].includes(st.phase)) return;
      seen = key;
      let scope = null; try { scope = wiki.snapshot(); } catch { /* 아직 준비 전 */ }
      const verdict = judgeAutoResult({ phase: st.phase, message: st.message, scope });
      if (verdict) toast.show(verdict.text).catch(() => {}); else toast.hide().catch(() => {});
    });
    const main = new MainWikiHook(api, settings, wiki, keys, libFor("fast"), auto, null, trace);
    main.llmCall = stageCall;
    main.mergeRecall = async (memory, ctx) => {
      if (pure) return memory;
      try {
        const idx = await store.getIndex(), character = await api.getCharacterFromIndex(ctx.characterIndex);
        const msgs = ctx.chat?.message ?? [];
        const folder = await loadReconciled(store, character?.chaId ?? ctx.characterIndex, ctx.chat?.id ?? ctx.chatIndex, msgs);  // 읽기 시점 대조(저장 안 함)
        if (!folder) return memory;
        const r = recallFor(folder, {
          names: (ctx.documents ?? []).flatMap((d) => [d.title, ...(d.aliases ?? [])]),
          query: [ctx.currentUser, ...(ctx.recentChat ?? []).map((m) => m.text)].join("\n"),
          messageCount: msgs.length, messages: msgs,
          settings: { tokens: idx.settings.flow?.recallTokens ?? 700, plus: idx.settings.inject?.plus !== false, forgetAfter: idx.settings.inject?.forgetAfter ?? 150 }
        });
        lastTurn = { ...(lastTurn ?? {}), recall: { at: Date.now(), people: r.people, tokens: r.tokens } };
        return mergeMemory(memory, r);
      } catch (e) { log("회상 실패", e?.message ?? e); return memory; }
    };
    // 요청 직전 훅은 하나만: 위키(고르기·정리 노트) → Dusk 블록
    main.listener = async (messages, type) => {
      const before = main.last?.at;
      let out = messages;
      try { out = await main.before(messages, type); } catch (e) { log("위키 주입 실패", e?.message ?? e); }
      const focus = main.last?.at !== before ? (main.last?.documents ?? []).map((d) => d.title) : [];
      lastTurn = { ...(lastTurn ?? {}), at: Date.now(), focus, mode: main.last?.actualMode ?? "", director: main.last?.director?.status ?? "idle" };
      return pure ? out : injector.beforeRequest(out, type, { focus });
    };
    const hooks = new RuntimeHookManager(api, auto, main, { scheduler });
    return { settings, wiki, auto, main, hooks, trace, keys, stageCall };
  }

  async function start() {
    if (rt) return rt;
    if (starting) return starting;
    starting = (async () => {
      pure = ((await store.getIndex()).settings.backend ?? "auto") === "off";
      const f = await flowOf(), r = await build();
      await syncPot(r.settings, f); r.main.sourceLibrary = libFor(f.mode);
      if (!pure) await injector.stop();
      const state = await r.hooks.ensure();
      if (state !== "ready") { log("턴 흐름 훅 등록 실패:", state); await r.hooks.dispose().catch(() => {}); if (!pure) await injector.start(); return null; }
      link.settle = async (ci, ti) => {
        const ok = await r.auto.waitForScope(ci, ti, { timeoutMs: 180000 });
        try { if (cyclePending) { const ev = milestonesBetween(cyclePending, cycleStates(r.wiki.snapshot())); cyclePending = null; cycleEvents.push(...ev); } } catch { cyclePending = null; }
        return ok;
      };
      link.takeCycle = () => cycleEvents.splice(0);
      link.take = (h) => { const v = stash.get(h); if (v) stash.delete(h); return v ?? null; };
      rt = r; return r;
    })();
    try { return await starting; } finally { starting = null; }
  }
  async function stop() {
    if (!rt) return false;
    const r = rt; rt = null; try { r.tools?.dispose(); } catch {} delete link.settle; delete link.take; delete link.takeCycle; stash.clear(); cycleEvents.length = 0; cyclePending = null;
    await r.hooks.dispose().catch(() => {});
    if (!pure) await injector.start();
    return true;
  }
  // 설정(flow.on·mode, 모델)이 바뀐 뒤 부른다.
  async function apply() {
    const f = await flowOf();
    if (!f.on) { await stop(); return false; }
    if (!rt) return !!(await start());
    await syncPot(rt.settings, f); rt.main.sourceLibrary = libFor(f.mode); rt.main.reset?.(f.mode === "accurate" ? "router" : "keyword");
    return true;
  }

  // 화면용 리수폿 설정 저장소: 흐름이 켜져 있으면 그것을, 꺼져 있으면 따로 읽은 것을 준다(둘 다 같은 저장소에 쓴다).
  async function settingsStore() {
    if (rt) return rt.settings;
    cold ??= (async () => { const s = new SettingsStore(createPotStorage(api, store), { promptKeys: promptKeysOf(sourceLibrary) }); await s.load(); return s; })();
    const s = await cold; if (!s.status().loaded) cold = null;
    return s;
  }
  const dropCold = () => { cold = null; };

  return { start: apply, apply: async () => { dropCold(); return apply(); }, stop, isOn: () => !!rt, tools: () => rt ? (rt.tools ??= makeTools({ api, rt, sourceLibrary, llmCall: rt.stageCall })) : null, last: () => lastTurn, runtime: () => rt, stash: () => stash.size, settings: settingsStore };
}
