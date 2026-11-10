// 턴 흐름 (v1.6.4 4단계): 리수폿 인물 위키(고르기·정리 노트·기록하기)와 Dusk 기록을 한 흐름으로 묶는다.
//
//  [요청 직전] 고르기(Router) → 회상(Recall) → 정리 노트(Director) → 주입(Inject)
//    - 위키 검색·고르기·정리 노트는 리수폿 MainWikiHook이 하고, 정리 노트에 Dusk 회상이 장기기억 참고로 같이 들어간다(mergeRecall).
//    - 마지막에 [Dusk Memory] 블록(이야기 요약·열린 항목·지식 경계 등)이 같은 요청에 들어간다. 고른 인물은 장면에 있는 것처럼 다룬다.
//  [응답 뒤] 기록하기(Writer): 리수폿 Writer 호출에 Dusk 기록 구획(dusk)을 같이 실어 한 번에 받는다.
//    - 두 구획은 따로 검증한다. dusk 구획이 없거나 틀리면 기존 방식(따로 한 번 더 호출)으로 대신한다.
//  빠른 모드: 모델 호출 없이 키워드로 인물을 고르고 정리 노트를 건너뛴다(응답 뒤 호출 1회). 정확하게: 고르기+정리 노트 사용.
import { potState } from "../engine/memoryswitch.js";
import { folderIdOf } from "./memorystore.js";
import { SettingsStore } from "../engine/pot/settings.js";
import { WikiController } from "./pot/wiki-controller.js";
import { AutoWikiController } from "./pot/auto-wiki.js";
import { MainWikiHook } from "./pot/main-wiki-hook.js";
import { RuntimeTraceStore } from "./pot/runtime-trace.js";
import { RuntimeHookManager } from "./pot/runtime-hooks.js";
import { callWriterModel } from "./pot/llm-client.js";
import { skillBlock } from "../engine/skillhook.js";
import { webWrap } from "../engine/webhook.js";
import { appendToPrompt } from "../engine/skillcfg.js";
import { createPotStorage } from "./potstorage.js";
import { keyStore as hubKeys, getCfg, recordUsage } from "./modelhub.js";
import { potModels } from "../engine/modelcfg.js";
import { recallFor, mergeMemory } from "../engine/recall.js";
import { createRetryToast, judgeAutoResult } from "./retrytoast.js";
import { loadReconciled } from "./memoryload.js";
import { confirmedAiIndex, messageIdentity } from "../engine/chattext.js";
import { appendDuskSection, splitDusk, checkDusk, SECTION_MARK } from "../engine/duskwriter.js";
import { CYCLE_BLOCK_MARK, CYCLE_FIELD_PROMPT, applyCycleReport } from "../engine/cyclereport.js";
import { parseJson } from "../engine/memoryprompt.js";
import { cycleStates, milestonesBetween } from "../engine/cyclememo.js";
import { healDeps } from "../engine/settingdeps.js";
import { makeTools } from "./memorytools.js";
import { potConfirm } from "../engine/memoryswitch.js";
import { MEMORY_DEFAULT_PROMPT_1, MEMORY_DEFAULT_PROMPT_2 } from "./memory-default-prompts.js";
import { chatKeyOf } from "../engine/chatkey.js";
import { cleanJsonReply } from "../engine/jsonreply.js";
import { routerKey, swapRequestRef, directionKey, boundedSet } from "../engine/retrycache.js";
import { parseDirectorRun, factSheet, directionMessages, parseDirection, renderDirection, directorEnvelope } from "../engine/director.js";
import { createCastReader } from "./castlore.js";
import { dropCreates } from "../engine/castfilter.js";
import { parseWriterRun, recordTurn, buildEnvelope, buildDusk, summarize, recorderText, attemptDuskRecord } from "../engine/recorder.js";
import { customPromptPlain } from "../engine/pot/custom-prompts.js";

const READONLY = new Set(["writer_schema", "director_schema", "slots", "policies"]);
export const promptKeysOf = (lib) => Object.entries(lib).flatMap(([id, parts]) => Object.keys(parts).filter((p) => !READONLY.has(p)).map((p) => `${id}:${p}`));
export const stageOf = (label) => /^router/i.test(label) ? "router" : /^director/i.test(label) ? "director" : "writer";
const STASH_MAX = 8;

// link: 러너와 공유하는 빈 객체. 턴 흐름이 켜지면 settle/take가 채워진다.
export function createTurnFlow(api, { store, runner, injector, embedder = null, sourceLibrary, link = {}, onOpen = null, log = (...a) => console.log("[Dusk 기억]", ...a), scheduler = globalThis } = {}) {
  let rt = null, starting = null, lastTurn = null, cold = null, lastRecord = null, lastNote = null, retryHits = 0, lastSkipped = null;
  // pure: 기억 저장소가 '끔'이면 Dusk 자체 기억(기록·회상·주입)은 전부 빼고 리수폿 위키 정리만 돌린다
  let pure = false;
  let cyclePending = null; const cycleEvents = [];  // 월경·임신: 응답 전 상태 → 응답 뒤 달라진 큰 사건(출산 등)을 Dusk 기록 대기열에
  const stash = new Map();  // 메시지 해시 → 검증된 dusk 구획
  const putStash = (h, v) => { stash.set(h, v); while (stash.size > STASH_MAX) stash.delete(stash.keys().next().value); };
  const libFor = (mode) => mode === "accurate" ? sourceLibrary : { ...sourceLibrary, base: { ...sourceLibrary.base, director: undefined } };

  const flowOf = async () => { const f = (await store.getIndex()).settings.flow ?? {}; return { on: f.on === true, advanced: f.advanced === true, mode: f.mode === "fast" ? "fast" : "accurate", recallTokens: f.recallTokens }; };

  async function syncPot(settings, f) {
    const cfg = await getCfg(api), m = potModels(cfg);
    settings.update((s) => {
      s.enabled = true; s.autoWriterEnabled = true; s.retrievalMode = f.mode === "accurate" ? "router" : "keyword";
      if (!f.advanced) { s.hypaReferenceEnabled = false; s.hypaPlusReferenceEnabled = false; }  // 리스 기본 메모리(Hypa)는 Dusk 장기기억이 대신한다: 고급 모드를 켰을 때만 설정값을 따른다
      healDeps(s);  // 켜 둔 기능의 선행 조건(예: 월경·임신 기록 → 인물 상태 기록)을 함께 맞춘다 — 화면을 거치지 않고 켜진 예전 설정도 여기서 고쳐진다
      s.useRisuSubmodel = m.useRisuSubmodel;
      if (!m.useRisuSubmodel) { s.models.shared = m.shared; for (const [k, v] of Object.entries(m.stages)) s.models.stages[k] = v.mode === "dedicated" ? v : { ...s.models.stages[k], mode: "shared" }; }
    });
  }

  async function build() {
    const storage = createPotStorage(api, store), keys = await hubKeys(api);
    const settings = new SettingsStore(storage, { promptKeys: promptKeysOf(sourceLibrary) });
    await settings.load();
    // 첫 실행에 기본 프롬프트 두 개를 한 번만 추가한다. 사용자가 나중에 삭제해도 다시 생성하지 않는다.
    const promptPresetIndex = await store.getIndex();
    if (promptPresetIndex.pot?.defaultPromptPresetsV1 !== true) {
      const existing = settings.rawSnapshot().customPrompts ?? [];
      const ids = new Set(existing.map((item) => item.id));
      // 2.0.0: '뒤'(장면 작성 점검표)는 본편 응답용이라 기록 단계에 넣지 않는다(기록 모델에게 "장면을 출력하라"고 해서 기록이 흐려졌다).
      const defaults = [
        { id: "dusk-default-front-v1", name: "기본 프롬프트 · 앞", stages: ["memory", "router", "director", "writer"], scope: { kind: "all" }, enabled: true, position: "front", text: MEMORY_DEFAULT_PROMPT_1 },
      ].filter((item) => !ids.has(item.id));
      if (defaults.length) {
        settings.update((value) => { value.customPrompts = [...(value.customPrompts ?? []), ...defaults]; });
        await settings.flush();
      }
      await store.updateIndex((idx) => { idx.pot ??= {}; idx.pot.defaultPromptPresetsV1 = true; });
    }
    // 2.0.0 이전: 예전에 자동으로 넣은 '기본 프롬프트 · 뒤'가 손대지 않은 그대로면 끈다(한 번만). 사용자가 고친 글은 그대로 둔다.
    if ((await store.getIndex()).pot?.defaultBackOffV2 !== true) {
      const list = settings.rawSnapshot().customPrompts ?? [];
      if (list.some((c) => c.id === "dusk-default-back-v1" && c.enabled !== false && String(c.text ?? "").trim() === MEMORY_DEFAULT_PROMPT_2.trim())) {
        settings.update((v) => { v.customPrompts = (v.customPrompts ?? []).map((c) => c.id === "dusk-default-back-v1" && String(c.text ?? "").trim() === MEMORY_DEFAULT_PROMPT_2.trim() ? { ...c, enabled: false } : c); });
        await settings.flush();
      }
      await store.updateIndex((idx) => { idx.pot ??= {}; idx.pot.defaultBackOffV2 = true; });
    }
    if (settings.status().blocked) {  // 가져온 설정이 해석되지 않으면 원본은 보관하고 새 설정으로 시작한다
      await store.updateIndex((idx) => { idx.pot ??= {}; idx.pot.settingsBackup = idx.pot.settings; idx.pot.settings = null; });
      await settings.load();
    }
    // 서사관계 전용 모드는 Dusk 기본값이라 처음 한 번만 켠다. 예전엔 시작할 때마다 다시 켜서, 고급 설정에서 꺼도 새로고침하면 말없이 되돌아갔다.
    if ((await store.getIndex()).pot?.relOnlyDefaultV1 !== true) {
      settings.forceRelationshipOnlyMode();
      await store.updateIndex((idx) => { idx.pot ??= {}; idx.pot.relOnlyDefaultV1 = true; });
    }
    const trace = new RuntimeTraceStore(api.pluginStorage); await trace.load().catch(() => {});
    const wiki = new WikiController(api, storage, { isEnabled: () => settings.snapshot().enabled });
    settings.setActiveBotResolver?.(() => wiki.scope?.characterId || "");

    const stageCall = async (a, k, preset, prompt, opts = {}) => {
      const stage = stageOf(String(opts.stageLabel ?? "")), withSkills = appendToPrompt(prompt, await skillBlock(stage));   // 스킬 주입(꺼짐이면 원문)
      const send = (text) => callWriterModel(a, k, preset, text, { ...opts, onUsage: (u) => { opts.onUsage?.(u); recordUsage(api, stage, u).catch(() => {}); } });
      const out = await webWrap(stage, withSkills, send);   // 웹 도구(꺼짐이 기본, 켠 단계만 호출이 늘어남)
      // 리수폿 단계는 JSON을 받는다: 생각 글·설명·끝 쉼표 때문에 "완성된 JSON을 읽지 못했습니다"가 나지 않게 다듬어 넘긴다(Dusk 기록기 줄 응답은 그대로)
      return /Writer Dusk|Director Dusk/.test(String(opts.stageLabel ?? "")) || typeof out !== "string" ? out : cleanJsonReply(out);
    };
    // 2.0.0 Dusk 기록기: 리수폿 Writer 프롬프트(11만 자+)를 보내지 않고 데이터만 꺼내 짧은 단계별 질문으로 기록한 뒤,
    // 리수폿이 받던 응답(JSON)으로 바꿔 돌려준다. 해석이 안 되거나(PDF 첨부 방식)·월경 보고가 필요하면 예전 길로.
    const potNext = new Set(); let lastKey = "";
    const autoLight = { streak: 0, hold: 0 };   // 가벼운 지침 자동 전환 상태(이번 실행 동안만, 저장하지 않음)
    const recCache = new Map(), recDone = new Map();
    // 로어북에 있는 인물만 새로 기록(기본 켜짐, 설정 loreOnly). 판단기가 null이면(로어북 없음·봇이 바뀜·읽기 실패) 막지 않는다.
    const readCast = createCastReader(api);
    const castNow = async (s0) => { if (s0?.loreOnly === false) return null; try { return await readCast(wiki.scope?.characterId ?? ""); } catch { return null; } };   // 같은 응답의 1단계 결과(리수폿이 묶음을 나눠 여러 번 부를 때 재사용)
    const recordWithDusk = async (a, k, preset, prompt, opts) => {
      const s0 = (await store.getIndex()).settings ?? {};
      if (s0.recorder === "pot" || String(prompt).includes(CYCLE_BLOCK_MARK)) return null;
      const run = parseWriterRun(prompt); if (!run) return null;
      let prep = null;
      if (!pure) { try { prep = await runner.prepareLatest(await api.getCurrentCharacterIndex(), await api.getCurrentChatIndex()); } catch { prep = null; } }
      const snap = settings.rawSnapshot(), sc = wiki.scope ? { characterId: wiki.scope.characterId, chatKey: wiki.scope.chatKey } : {};
      const front = customPromptPlain(snap, "writer", sc, "front"), back = customPromptPlain(snap, "writer", sc, "back");
      // 빈 응답(추론이 출력 한도를 다 씀)이 한 번 나오면 이 기록의 남은 호출은 출력 한도를 넓혀 보낸다
      let boost = false; const roomy = preset && Number(preset.maxTokens) > 0 ? { ...preset, maxTokens: Math.min(32768, Math.max(16384, Number(preset.maxTokens) * 2)) } : preset;
      const call = async (msgs) => { try { return await stageCall(a, k, boost ? roomy : preset, recorderText(msgs, { front, back }), { ...opts, stageLabel: "Writer Dusk" }); } catch (e) { if (e?.code === "empty-model-response") boost = true; throw e; } };
      const light = s0.light === true, beliefs = s0.inject?.beliefs === true;
      while (recCache.size > 4) recCache.delete(recCache.keys().next().value);
      // 같은 응답을 다시 기록하라고 불리면(앞선 시도가 저장 전에 끊김 등) 받아 둔 결과를 다시 쓴다 — 보조 모델을 또 부르지 않는다
      const fullKey = `${run.rp.length}:${run.rp.slice(0, 200)}:${run.rp.slice(-200)}|${run.docs.filter((d) => d.writable).map((d) => d.title).sort().join(",")}|${run.allowCreate}|${s0.loreOnly !== false}`;
      // 이 응답의 기록기 결과가 리수폿 검증에서 떨어졌으면(자동 재시도 포함) 같은 결과를 또 내지 않고 예전 리수폿 기록으로 넘긴다
      if (potNext.has(fullKey)) { potNext.delete(fullKey); return null; }
      lastKey = fullKey;
      let rec = recDone.get(fullKey);
      if (rec) retryHits++;
      else {
        const cast = await castNow(s0);
        rec = await recordTurn(call, run, { dusk: prep?.input ?? null, light, beliefs, cache: recCache, auto: autoLight, cast, onWarn: (n, e) => log(`기록기: ${n} 세부 실패(개요만)`, String(e?.message ?? e).slice(0, 120)) });
        if (!rec.people.some((p) => p.failed)) boundedSet(recDone, fullKey, rec, 4);
      }
      const env = buildEnvelope(run, rec);
      if (prep && !stash.has(prep.h)) { try { putStash(prep.h, buildDusk(rec, { ignore: prep.ignore, light, beliefs })); } catch (e) { log("기록기: Dusk 기록 변환 실패", e?.message ?? e); } }
      lastRecord = { at: Date.now(), batch: run.batch, ...summarize(rec, env) };
      return JSON.stringify(env);
    };
    // 기록하기: Dusk 구획을 같이 싣고, 돌아온 응답에서 떼어 낸다.
    const writerCall = async (a, k, preset, prompt, opts = {}) => {
      const label = String(opts.stageLabel ?? ""); let sent = prompt, prep = null;
      if (/^writer batch/i.test(label)) {
        // 3.0.8: 기록기가 끝내 실패하면 응답 전체를 실패로 끝내지 않고 예전 리수폿 Writer(한 번 호출)로 대신한다. 취소는 그대로 던진다.
        const out = await attemptDuskRecord(() => recordWithDusk(a, k, preset, prompt, opts), (e) => {
          const message = String(e?.message ?? e).slice(0, 200);
          lastRecord = { at: Date.now(), error: message, fallback: "risupot" };
          log("Dusk 기록기 실패 → 예전 리수폿 기록으로 대신", message);
        });
        if (out != null) return out;
      }
      if (/^writer/i.test(label)) { try { cyclePending = cycleStates(wiki.snapshot()); } catch { cyclePending = null; } }
      const had = String(prompt).includes(SECTION_MARK);
      if (/^writer/i.test(label) && !pure) {
        try { prep = await runner.prepareLatest(await api.getCurrentCharacterIndex(), await api.getCurrentChatIndex()); } catch { prep = null; }
        if (prep && !had && !stash.has(prep.h)) sent = appendDuskSection(prompt, prep.input);
      }
      // 월경 추적이 켜져 있으면 보고를 별도 칸(cycle_report)으로도 받는다(버그 5)
      const cyc = /^writer/i.test(label) && String(prompt).includes(CYCLE_BLOCK_MARK);
      if (cyc) sent += CYCLE_FIELD_PROMPT;
      let text = await stageCall(a, k, preset, sent, opts);
      if (prep && (sent !== prompt || had)) {
        const { raw, dusk } = splitDusk(text), ok = checkDusk(dusk, { ignore: prep.ignore });
        if (ok) putStash(prep.h, ok);
        text = raw;
      }
      if (cyc) { try { text = applyCycleReport(text, wiki.snapshot(), parseJson).raw; } catch { /* 보고 줄 없이 그대로 */ } }
      // 예전 리수폿 기록(대신 길 포함)도 로어북에 없는 새 인물은 빼고 넘긴다
      if (/^writer/i.test(label) && typeof text === "string") {
        try {
          const cast = await castNow((await store.getIndex()).settings ?? {});
          if (cast) { const { env, dropped } = dropCreates(JSON.parse(text), (t, al) => cast(t, al)); if (dropped.length) { text = JSON.stringify(env); lastSkipped = { at: Date.now(), names: dropped }; log("로어북에 없는 새 인물 빼고 기록", dropped.join(", ")); } }
        } catch { /* JSON이 아니면(리수폿이 고쳐 읽음) 그대로 */ }
      }
      return text;
    };

    const auto = new AutoWikiController({ api, settingsStore: settings, keyStore: keys, wikiController: wiki, sourceLibrary, traceStore: trace, scheduler, llmCall: writerCall });
    // 자동 기록이 막히거나 비었을 때 오른쪽 아래에 알리고, 거기서 바로 다시 시도한다.
    // 사용자가 '다시 시도'를 누르면 받아 둔 결과를 다시 쓰지 않고 새로 기록한다
    const toast = createRetryToast(api, { scheduler, onRetry: () => { recDone.clear(); recCache.clear(); return auto.retry(); }, onOpen: () => onOpen?.() });
    let seen = "";
    auto.subscribe((st) => {
      const key = `${st.phase}|${st.message}`;
      if (key === seen || !["completed", "failed", "manual"].includes(st.phase)) return;
      seen = key;
      if (st.phase === "failed" && lastKey && !/리롤|삭제되어|RP 본문이 바뀌어/.test(String(st.message ?? ""))) { recDone.delete(lastKey); recCache.clear(); potNext.add(lastKey); while (potNext.size > 4) potNext.delete(potNext.values().next().value); }
      if (st.phase === "completed") lastKey = "";
      let scope = null; try { scope = wiki.snapshot(); } catch { /* 아직 준비 전 */ }
      const verdict = judgeAutoResult({ phase: st.phase, message: st.message, scope, names: lastRecord && !lastRecord.error ? lastRecord.names ?? null : null });
      if (verdict) toast.show(verdict.text, { retry: verdict.retry !== false }).catch(() => {}); else toast.hide().catch(() => {});
    });
    const main = new MainWikiHook(api, settings, wiki, keys, libFor("fast"), auto, null, trace);
    // 2.0.0 Dusk 정리 노트: 리수폿 정리 노트 지침(8만 자 안팎)을 보내지 않고, 저장된 위키 값으로 인물 정리표를 프로그램이 만든다(늘 같은 값).
    // 연출 모드면 짧은 질문 1번으로 '이번 응답 방향'만 덧붙인다. 해석이 안 되면 예전 길로.
    const routerSeen = new Map(), dirSeen = new Map();   // 다시 요청 때 재사용(retrycache.js)
    main.llmCall = async (a, k, preset, prompt, opts = {}) => {
      const label = String(opts.stageLabel ?? "");
      if (/^router/i.test(label)) {
        const key = routerKey(prompt);
        if (key && routerSeen.has(key)) { retryHits++; return swapRequestRef(routerSeen.get(key), prompt); }
        const out = await stageCall(a, k, preset, prompt, opts);
        if (key && typeof out === "string") boundedSet(routerSeen, key, out);
        return out;
      }
      if (/^director pass/i.test(label) && (await store.getIndex()).settings?.recorder !== "pot") {
        const run = parseDirectorRun(prompt);
        if (run) {
          const sheet = factSheet(run); let rows = [];
          const dkey = directionKey(run);
          if (dirSeen.has(dkey)) { rows = dirSeen.get(dkey); retryHits++; }
          else if (run.role !== "facts" && run.docs.length) {
            const snap = settings.rawSnapshot(), sc = wiki.scope ? { characterId: wiki.scope.characterId, chatKey: wiki.scope.chatKey } : {};
            const front = customPromptPlain(snap, "director", sc, "front"), back = customPromptPlain(snap, "director", sc, "back");
            const [sys, usr] = directionMessages(run, sheet.text);
            try { rows = parseDirection(await stageCall(a, k, preset, recorderText([sys, usr], { front, back }), { ...opts, stageLabel: "Director Dusk" })); }
            catch (e) { log("정리 노트 방향 호출 실패(정리표만 넣음)", String(e?.message ?? e).slice(0, 120)); }
            if (rows.length) boundedSet(dirSeen, dkey, rows);
          }
          const dir = renderDirection(rows);
          lastNote = { at: Date.now(), people: sheet.used.length, direction: rows.length, chars: sheet.text.length + dir.length };
          return JSON.stringify(directorEnvelope(run, [sheet.text, dir].filter(Boolean).join("\n"), sheet.used));
        }
      }
      return stageCall(a, k, preset, prompt, opts);
    };
    main.mergeRecall = async (memory, ctx) => {
      if (pure) return memory;
      try {
        const idx = await store.getIndex(), character = await api.getCharacterFromIndex(ctx.characterIndex);
        const msgs = ctx.chat?.message ?? [];
        const folder = await loadReconciled(store, character?.chaId ?? ctx.characterIndex, chatKeyOf(ctx.chat, ctx.chatIndex), msgs);  // 읽기 시점 대조(저장 안 함)
        if (!folder) return memory;
        const query = [ctx.currentUser, ...(ctx.recentChat ?? []).map((m) => m.text)].join("\n");
        let sem = null; try { if (embedder) sem = await embedder.scores(folderIdOf(character?.chaId ?? ctx.characterIndex, chatKeyOf(ctx.chat, ctx.chatIndex)), folder, query); } catch { sem = null; }
        const r = recallFor(folder, {
          sem, semMin: embedder?.cfg().minSim,
          names: (ctx.documents ?? []).flatMap((d) => [d.title, ...(d.aliases ?? [])]),
          query: [ctx.currentUser, ...(ctx.recentChat ?? []).map((m) => m.text)].join("\n"),
          messageCount: msgs.length, messages: msgs,
          settings: { tokens: idx.settings.flow?.recallTokens ?? 700, plus: idx.settings.inject?.plus !== false, forgetAfter: idx.settings.inject?.forgetAfter ?? 150 }
        });
        lastTurn = { ...(lastTurn ?? {}), recall: { at: Date.now(), people: r.people, tokens: r.tokens } };
        return mergeMemory(memory, r);
      } catch (e) { log("회상 실패", e?.message ?? e); return memory; }
    };
    // 리수폿이 이 채팅에서 꺼졌는지: 전체 끔이면 바로, 아니면 봇별 끔(v3.1). 끈 봇이 하나도 없으면 봇 정보를 읽지 않는다.
    const botPotOff = async () => {
      try {
        const idx = await store.getIndex();
        if (!potState(idx, "").on) return true;   // 전체 끔(모든 채팅 장기 기억 끔·리수폿 끔)이면 봇 정보 없이 바로
        if (!Object.keys(idx.potBots ?? {}).length) return false;
        const c = await api.getCharacterFromIndex(await api.getCurrentCharacterIndex());
        return !potState(idx, c?.chaId).on;   // 봇별 끔만이 아니라 전체 판단(모든 채팅 끔·리수폿 끔 포함)을 한 곳에서
      } catch { return false; }
    };
    // 요청 직전 훅은 하나만: 위키(고르기·정리 노트) → Dusk 블록
    main.listener = async (messages, type) => {
      const before = main.last?.at;
      let out = messages;
      const potOff = await botPotOff();  // 리수폿이 꺼진 봇은 위키 주입을 건너뛴다(기억은 그대로)
      if (!potOff) { try { out = await main.before(messages, type); } catch (e) { log("위키 주입 실패", e?.message ?? e); } }
      const focus = !potOff && main.last?.at !== before ? (main.last?.documents ?? []).map((d) => d.title) : [];
      lastTurn = { ...(lastTurn ?? {}), at: Date.now(), focus, mode: main.last?.actualMode ?? "", director: main.last?.director?.status ?? "idle" };
      const result = pure ? out : await injector.beforeRequest(out, type, { focus });
      if (!type || type === "model") confirmPrevious().catch((e) => log("직전 응답 확정 실패", e?.message ?? e));  // 요청은 기다리지 않는다
      return result;
    };
    // 자동 위키 기록 시점. 기본(next)은 사용자가 다음 말을 보낼 때 직전 응답을 확정해 기록한다(리롤 중인 응답은 건드리지 않음).
    // 설정이 now(응답 직후)면 예전처럼 출력 훅에서 바로 기록한다.
    const confirmed = new Set();  // 이미 기록을 맡긴 응답(같은 응답으로 요청마다 다시 맡기지 않는다)
    async function confirmPrevious() {
      if (potConfirm((await store.getIndex()).settings) === "now") return;
      if (await botPotOff()) return;
      const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
      if (!(ci >= 0) || !(ti >= 0)) return;
      const char = await api.getCharacterFromIndex(ci), chat = await api.getChatFromIndex(ci, ti);
      const messageIndex = confirmedAiIndex(chat?.message ?? []); if (messageIndex < 0) return;
      const m = chat.message[messageIndex], key = `${ci}:${ti}:${messageIndex}:${messageIdentity(m)}`;
      if (confirmed.has(key)) return;
      confirmed.add(key); if (confirmed.size > 50) confirmed.delete(confirmed.keys().next().value);
      auto.schedule({ chat, char, characterIndex: ci, chatIndex: ti, messageIndex });
    }
    const hooks = new RuntimeHookManager(api, auto, main, { scheduler });
    hooks.chatListener = (arg) => {  // 출력 훅: now일 때만 바로 기록
      // 출력마다 정리 노트 캐시를 비우면 끊긴 응답(검열·오류) 뒤 다시 요청할 때 정리 노트를 또 불렀다. 캐시 열쇠가 입력·개정 번호를 포함하므로 비우지 않는다.
      store.getIndex().then(async (idx) => { if (potConfirm(idx.settings) === "now" && !(await botPotOff())) auto.onOutput(arg); }).catch(() => auto.onOutput(arg));
    };
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
      // 지난 대화 분석에 리수폿 위키 기록도 함께: 묶음 끝 응답을 자동 기록 큐에 넣고, 끝나면 큐가 빌 때까지 기다린다.
      link.backfillPotReady = async (character) => {
        const idx = await store.getIndex();
        return potState(idx, character?.chaId).on && r.auto.enabled();
      };
      link.backfillPot = (ci, ti, messageIndex, shared) => r.auto.schedule({ chat: shared.chat, char: shared.character, characterIndex: ci, chatIndex: ti, messageIndex });
      link.backfillPotWait = (ci, ti, signal) => new Promise((res) => {
        const p = r.auto.waitForScope(ci, ti, { timeoutMs: 10 * 60 * 1000 }).then(res, () => res(false));
        signal?.addEventListener?.("abort", () => res(false), { once: true });
        return p;
      });
      rt = r; return r;
    })();
    try { return await starting; } finally { starting = null; }
  }
  async function stop() {
    if (!rt) return false;
    const r = rt; rt = null; try { r.tools?.dispose(); } catch {} delete link.settle; delete link.take; delete link.takeCycle; delete link.backfillPot; delete link.backfillPotWait; delete link.backfillPotReady; stash.clear(); cycleEvents.length = 0; cyclePending = null;
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

  return { start: apply, apply: async () => { dropCold(); return apply(); }, stop, isOn: () => !!rt, tools: () => rt ? (rt.tools ??= makeTools({ api, rt, sourceLibrary, llmCall: rt.stageCall })) : null, last: () => lastTurn, lastRecord: () => lastRecord, lastSkipped: () => lastSkipped, lastNote: () => lastNote, retryHits: () => retryHits, runtime: () => rt, stash: () => stash.size, settings: settingsStore };
}
