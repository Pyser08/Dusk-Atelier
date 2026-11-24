// 턴 흐름 (v1.6.4 4단계): 리수폿 인물 위키(고르기·정리 노트·기록하기)와 Dusk 기록을 한 흐름으로 묶는다.
//
//  [요청 직전] 고르기(Router) → 회상(Recall) → 정리 노트(Director) → 주입(Inject)
//    - 위키 검색·고르기·정리 노트는 리수폿 MainWikiHook이 하고, 정리 노트에 Dusk 회상이 장기기억 참고로 같이 들어간다(mergeRecall).
//    - 마지막에 [Dusk Memory] 블록(이야기 요약·열린 항목·지식 경계 등)이 같은 요청에 들어간다. 고른 인물은 장면에 있는 것처럼 다룬다.
//  [응답 뒤] 기록하기(Writer): 리수폿 Writer 호출에 Dusk 기록 구획(dusk)을 같이 실어 한 번에 받는다.
//    - 두 구획은 따로 검증한다. dusk 구획이 없거나 틀리면 기존 방식(따로 한 번 더 호출)으로 대신한다.
//  빠른 모드: 모델 호출 없이 키워드로 인물을 고르고 정리 노트를 건너뛴다(응답 뒤 호출 1회). 정확하게: 고르기+정리 노트 사용.
import { settleTarget } from "./settlescope.js";
import { cycleOnlyInScene, scenePeople } from "../engine/cyclescene.js";
import { readChar } from "./apiread.js";
import { stepUserCycle, userFemale } from "../engine/usercycle.js";
import { isUserNameLike } from "../engine/recorder.js";
import { USER_NSFW_ID } from "../engine/usernsfw.js";
import { cycleByGender } from "../engine/cyclegender.js";
import { logFailure, logEvent } from "./memlog.js";
import { applyCycleEvents, syncCycles } from "./cyclesync.js";
import { extraOf } from "../engine/memextra.js";
import { raceFor } from "../engine/races.js";
import { potState } from "../engine/memoryswitch.js";
import { aiTask, describeAi, trackAi } from "../engine/aistop.js";
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
import { CYCLE_BLOCK_MARK, CYCLE_FIELD_PROMPT, applyCycleReport, applyCycleReportObject } from "../engine/cyclereport.js";
import { parseJson } from "../engine/memoryprompt.js";
import { cycleStates, milestonesBetween } from "../engine/cyclememo.js";
import { setLeanWriter, LEAN_MARK } from "../engine/pot/writer-prompt.js";
import { syncAffinity } from "../engine/affinityderive.js";
import { keyOf as keyOfH, nowOf as nowOfH, effectiveTags as effectiveTagsH, intimacyOf as intimacyOfH } from "../engine/memoryhuman.js";
import { healDeps } from "../engine/settingdeps.js";
import { makeTools } from "./memorytools.js";
import { potConfirm } from "../engine/memoryswitch.js";
import { MEMORY_DEFAULT_PROMPT_1, MEMORY_DEFAULT_PROMPT_2 } from "./memory-default-prompts.js";
import { chatKeyOf } from "../engine/chatkey.js";
const NSFW_QUEUE_MAX = 400;   // 턴 뒤 반영 전까지 쌓이는 줄(지난 대화 분석이 묶여 돌 때 여러 응답분)
import { gateReports } from "../engine/fertility.js";   // 0.3.22 피임·체내 정액량·이력
const nkey = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
import { readGauge } from "./gaugemult.js";
import { readSeedOpt } from "./adultseed.js";
import { cleanJsonReply } from "../engine/jsonreply.js";
import { routerKey, castKey, swapRequestRef, directionKey, boundedSet } from "../engine/retrycache.js";
import { parseDirectorRun, factSheet, directionMessages, parseDirection, renderDirection, directorEnvelope } from "../engine/director.js";
import { createCastReader } from "./castlore.js";
import { dropCreates } from "../engine/castfilter.js";
import { parseWriterRun, recordTurn, buildEnvelope, buildDusk, summarize, recorderText, attemptDuskRecord } from "../engine/recorder.js";
import { customPromptPlain } from "../engine/pot/custom-prompts.js";

// 빈 응답이 출력 한도에 걸려 끊긴 것인가(호출층 오류 글의 finish_reason/stop_reason). 이유를 모르면 아니라고 본다.
export const cutByLimit = (e) => /(finish_reason|stop_reason)\s+(length|max_tokens|MAX_TOKENS|max_output_tokens)\b/i.test(String(e?.message ?? ""));
const READONLY = new Set(["writer_schema", "director_schema", "slots", "policies"]);
export const promptKeysOf = (lib) => Object.entries(lib).flatMap(([id, parts]) => Object.keys(parts).filter((p) => !READONLY.has(p)).map((p) => `${id}:${p}`));
export const stageOf = (label) => /^router/i.test(label) ? "router" : /^director/i.test(label) ? "director" : "writer";
const STASH_MAX = 8;

// link: 러너와 공유하는 빈 객체. 턴 흐름이 켜지면 settle/take가 채워진다.
export function createTurnFlow(api, { store, runner, injector, embedder = null, sourceLibrary, link = {}, onOpen = null, log = (...a) => console.log("[Dusk 기억]", ...a), scheduler = globalThis } = {}) {
  // 2.2.0: 기록기가 한 턴(묶음)을 기록하면 알린다 — Erosync 매 턴 계산이 듣는다. 듣는 쪽 실패는 기록에 영향 없음.
  const turnListeners = new Set();
  // addon-rebuild: 지난 대화 분석이 예약한 기록이면 턴 알림에 source "backfill". 취소돼 끝 알림(backfillPotWait)이 안 와도 풀리게 시각으로 둔다(마지막 예약 뒤 10분).
  let backfillUntil = 0; const BACKFILL_HOLD_MS = 10 * 60 * 1000;
  const tellTurn = (info) => { for (const fn of turnListeners) { try { Promise.resolve(fn(info)).catch((e) => log("턴 알림 처리 실패", e?.message ?? e)); } catch (e) { log("턴 알림 처리 실패", e?.message ?? e); } } };
  // 2.2.30: 기록은 늘 Dusk 기록기 → 리수폿 Writer 프롬프트는 지침 없이(데이터만) 조립한다(리수폿 기록 방식은 없앰)
  setLeanWriter(() => !!rt);
  let castHits = 0, rt = null, starting = null, lastTurn = null, cold = null, lastRecord = null, lastNote = null, retryHits = 0, lastSkipped = null;
  // pure: 기억 저장소가 '끔'이면 Dusk 자체 기억(기록·회상·주입)은 전부 빼고 리수폿 위키 정리만 돌린다
  let pure = false;
  let cyclePending = null, cycleNote = "", cycleMiss = 0, hookState = ""; const cycleEvents = [], cycleSync = [], nsfwQueue = [], driveQueue = [];  // 월경·임신: 응답 전 상태 → 응답 뒤 달라진 큰 사건(출산 등)을 Dusk 기록 대기열에
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
      // 보조 호출 장부(2.1.4): 내 API(직접 연결)는 공급자가 알려 준 실제 토큰을 적는다. 리스 보조 모델 길은 api.runLLMModel 래퍼가 어림해 적는다.
      // 장부는 globalThis로만 부른다(예전 코어에서도 애드온이 깨지지 않게).
      const auxName = describeAi(stage) ? `장기기억 · ${describeAi(stage)}` : "장기기억 기록";
      const send = async (text) => {
        let usage = null;
        try { return await callWriterModel(a, k, preset, text, { ...opts, onUsage: (u) => { usage = u; opts.onUsage?.(u); recordUsage(api, stage, u).catch(() => {}); } }); }
        finally { if (usage) { try { globalThis.__duskAux?.note?.({ label: auxName, inTok: usage.inputTokens ?? 0, outTok: (usage.outputTokens ?? 0) + (usage.reasoningIncluded === false ? usage.reasoningTokens ?? 0 : 0), real: true }); } catch { /* 무시 */ } } }
      };
      // 생성 중지에 잡히게: 내 API(직접 연결) 모델은 runLLMModel을 거치지 않아 따로 세고, 누르면 결과를 버리고 바로 멈춘다
      const out = await aiTask(auxName, async () => {
        const t = trackAi("");
        try { return await t.race(webWrap(stage, withSkills, send)); } finally { t.end(); }
      });   // 웹 도구(꺼짐이 기본, 켠 단계만 호출이 늘어남)
      // 리수폿 단계는 JSON을 받는다: 생각 글·설명·끝 쉼표 때문에 "완성된 JSON을 읽지 못했습니다"가 나지 않게 다듬어 넘긴다(Dusk 기록기 줄 응답은 그대로)
      return /Writer Dusk|Director Dusk/.test(String(opts.stageLabel ?? "")) || typeof out !== "string" ? out : cleanJsonReply(out);
    };
    // 2.0.0 Dusk 기록기: 리수폿 Writer 프롬프트(11만 자+)를 보내지 않고 데이터만 꺼내 짧은 단계별 질문으로 기록한 뒤,
    // 리수폿이 받던 응답(JSON)으로 바꿔 돌려준다. 해석이 안 되면(PDF 첨부 방식) 예전 길로. 월경 보고도 2.1.4부터 기록기에서 받는다.
    const potNext = new Set(); let lastKey = "", recorderFailed = false;
    const fullKeyOf = (run, s0) => `${run.rp.length}:${run.rp.slice(0, 200)}:${run.rp.slice(-200)}|${run.docs.filter((d) => d.writable).map((d) => d.title).sort().join(",")}|${run.allowCreate}|${s0.loreOnly !== false}|${run.cycleOn ? 1 : 0}`;
    const autoLight = { streak: 0, hold: 0 };   // 가벼운 지침 자동 전환 상태(이번 실행 동안만, 저장하지 않음)
    const recCache = new Map(), recDone = new Map();
    // 로어북에 있는 인물만 새로 기록(기본 켜짐, 설정 loreOnly). 판단기가 null이면(로어북 없음·봇이 바뀜·읽기 실패) 막지 않는다.
    const readCast = createCastReader(api);
    const castNow = async (s0) => { if (s0?.loreOnly === false) return null; try { return await readCast(wiki.scope?.characterId ?? ""); } catch { return null; } };   // 같은 응답의 1단계 결과(리수폿이 묶음을 나눠 여러 번 부를 때 재사용)
    // 월경 보고는 한 턴(Writer 묶음 여러 개)에서 인물당 한 번만 붙인다 — 첫 묶음에서 비우고, 같은 묶음 재시도는 그 묶음 몫을 다시 붙인다
    const cycleDone = new Map();
    const cycleScope = (label) => { const m = /batch\s*(\d+)/i.exec(String(label ?? "")); if (!m || +m[1] <= 1) cycleDone.clear(); return { done: cycleDone, label: String(label ?? "") }; };
    // 11-24 나의 월경: 지금 채팅 폴더(읽기 전용)와 위치
    const userSpot = async () => { const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex(), c = await readChar(api, ci, ti), chat = c?.chats?.[ti]; return chat ? { chaId: String(c.chaId), ck: chatKeyOf(chat, ti), n: chat.message?.length ?? null, folder: await store.peekFolder(String(c.chaId), chatKeyOf(chat, ti)) } : null; };
    const userWomanNow = async () => { try { const f = (await userSpot())?.folder; return userFemale(f) || !!f?.userCycle?.state?.conception; } catch { return false; } };
    const recordWithDusk = async (a, k, preset, prompt, opts, cy = { done: cycleDone, label: "" }) => {
      const s0 = (await store.getIndex()).settings ?? {};
      const cyc = String(prompt).includes(CYCLE_BLOCK_MARK);   // 2.1.4: 월경·임신 기록도 기록기로(1단계에 줄 몇 개 더, 예전엔 늘 리수폿 Writer)
      const run = parseWriterRun(prompt); if (!run) return null;
      try { const fo = (await userSpot())?.folder; run.userExplicit = fo?.userAliases ?? []; run.userNames = [...new Set([...run.userNames, ...run.userExplicit])]; } catch { run.userExplicit = []; }   // 신고 #12 직접 적은·합칠 때 배운 나의 이름
      run.cycleOn = cyc;
      // addon-rebuild: 월경·임신이 왜 안 잡히는지 전체 기록에(꺼짐 사유는 바뀔 때만 한 번)
      if (!cyc) { let why = "월경·임신 기록이 꺼져 있어요"; try { const ps = settings.snapshot(); why = ps?.sexualDesireEnabled !== true ? "꺼짐 — 기억 설정의 ‘욕구 기록’이 꺼져 있어요(월경·임신 기록의 바탕)" : ps?.features?.openness?.cycle !== true ? "꺼짐 — 기억 설정의 ‘월경·임신 기록’이 꺼져 있어요" : "꺼짐 — 이번 기록 요청에 월경 지침이 없어요"; } catch { /* 설정 없음 */ }
        if (why !== cycleNote) { cycleNote = why; logEvent({ kind: "skip", area: "월경·임신", title: why }); } }
      else cycleNote = "";
      let prep = null;
      if (!pure) { try { prep = await runner.prepareLatest(await api.getCurrentCharacterIndex(), await api.getCurrentChatIndex()); } catch { prep = null; } }
      const snap = settings.rawSnapshot(), sc = wiki.scope ? { characterId: wiki.scope.characterId, chatKey: wiki.scope.chatKey } : {};
      const front = customPromptPlain(snap, "writer", sc, "front"), back = customPromptPlain(snap, "writer", sc, "back");
      // 2.1.4: 빈 응답이 '출력 한도에 걸려 끊긴 것'일 때만(finish_reason length·MAX_TOKENS) 남은 호출의 출력 한도를 1.5배(최대 16384)로 넓힌다.
      // 다른 이유의 빈 응답·형식 오류에는 한도를 올리지 않는다(추론 토큰만 더 쓰고 결과는 같았다).
      let boost = false; const roomy = preset && Number(preset.maxTokens) > 0 ? { ...preset, maxTokens: Math.min(16384, Math.max(Number(preset.maxTokens), Math.round(Number(preset.maxTokens) * 1.5))) } : preset;
      const call = async (msgs) => { try { return await stageCall(a, k, boost ? roomy : preset, recorderText(msgs, { front, back }), { ...opts, stageLabel: "Writer Dusk" }); } catch (e) { if (e?.code === "empty-model-response" && cutByLimit(e)) boost = true; throw e; } };
      // 묶음 결과가 리수폿 검증에서 떨어진 응답은 받아 둔 결과를 버리고 가벼운 지침으로 새로 기록한다(예전: 리수폿 Writer 전체 지침으로 다시 기록 — 약 3만 토큰)
      const fresh = potNext.has(fullKeyOf(run, s0));
      const light = s0.light === true || fresh, beliefs = s0.inject?.beliefs === true;
      while (recCache.size > 4) recCache.delete(recCache.keys().next().value);
      // 같은 응답을 다시 기록하라고 불리면(앞선 시도가 저장 전에 끊김 등) 받아 둔 결과를 다시 쓴다 — 보조 모델을 또 부르지 않는다
      const fullKey = fullKeyOf(run, s0);
      // 이 응답의 기록기 결과가 리수폿 검증에서 떨어졌으면 같은 결과를 또 내지 않는다: 기본은 가벼운 지침으로 새로 기록,
      // '실패하면 예전 리수폿 기록으로 대신'을 켰을 때만 예전 리수폿 기록으로 넘긴다
      if (potNext.has(fullKey)) { potNext.delete(fullKey); recDone.delete(fullKey); }
      lastKey = fullKey;
      let rec = fresh ? null : recDone.get(fullKey);
      if (rec) retryHits++;
      else {
        const cast = await castNow(s0);
        rec = await recordTurn(call, run, { dusk: prep?.input ?? null, light, beliefs, cache: recCache, auto: autoLight, cast, group: s0.groupPeople !== false, world: s0.inject?.world === true, status: s0.inject?.status !== false, outfit: s0.inject?.outfit !== false, weather: s0.inject?.scenePanel !== false, race: s0.inject?.race !== false, cycle: cyc, userWoman: cyc && await userWomanNow(), nsfw: (() => { try { return settings.snapshot()?.sexualDesireEnabled === true || settings.rawSnapshot?.()?.sexualDesireEnabled === true; } catch { return false; } })()   /* 11-24: 화면은 전체 설정(rawSnapshot)만 보여 주고 바꾼다 — 봇별 공통 설정(commonByBot, 화면 없음·리수폿에서 가져온 값)이 꺼져 있으면 켜 둬도 성인 기록이 하나도 안 됐다 */, onWarn: (n, e) => log(`기록기: ${n} 세부 실패(개요만)`, String(e?.message ?? e).slice(0, 120)) });
        if (!rec.people.some((p) => p.failed)) boundedSet(recDone, fullKey, rec, 4);
      }
      run.gauge = await readGauge(api);   // 2.2.6 게이지 배수(위키 호감도·성격 막대)
      run.seed = await readSeedOpt(api);   // 2.2.6 처음 등장 음란도·첫인상(기본 0, 무작위 설정)
      let env = buildEnvelope(run, rec);
      if (cyc) { try {
        // addon-rebuild: 이번 턴 장면에 없는 여성의 성관계 보고는 버린다(가만히 있는 사람이 임신하던 문제)
        const cs = cycleOnlyInScene(rec.stage1?.cycle ?? [], rec.stage1, rec.people);
        // 11-24: TS 등으로 성별이 바뀐 인물 — 이 채팅 성별로 여성 목록을 맞춘다
        try {
          const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex(), cur = await readChar(api, ci, ti);
          const fg = cur?.chats?.[ti] ? await store.peekFolder(String(cur.chaId), chatKeyOf(cur.chats[ti], ti)) : null;
          const g = cycleByGender(cs.reports, { folder: fg, scene: scenePeople(rec.stage1, rec.people), changes: rec.stage1?.nsfw ?? [] });
          cs.reports = g.reports;
          if (g.added.length || g.removed.length) logEvent({ area: "월경·임신", title: [g.added.length && `성별이 여성이라 주기를 따라가요: ${g.added.join(", ")}`, g.removed.length && `지금 남성이라 뺐어요: ${g.removed.join(", ")}`].filter(Boolean).join(" · ") });
        } catch (e) { log("기록기: 성별로 월경 맞추기 건너뜀", e?.message ?? e); }
        // 11-24 나의 월경: 유저 보고를 떼어 이 채팅 폴더에서 따로 셈한다(위키 문서가 없음)
        try {
          const mineOf = (r) => r.name === "{{user}}" || isUserNameLike(r.name, run.userNames), mine = cs.reports.filter(mineOf);
          cs.reports = cs.reports.filter((r) => !mineOf(r));
          const at = await userSpot(), changes = rec.stage1?.nsfw ?? [];
          if (at && (userFemale(at.folder, changes) || at.folder?.userCycle?.state)) {
            const cums = (rec.stage1?.extra ?? []).filter((x) => x.kind === "cum" && x.where === "inside"), isU = (n) => n === "{{user}}" || isUserNameLike(n, run.userNames);
            const did = cums.some((x) => isU(x.name)) || changes.some((x) => x.kind === "act" && (x.act === "sex" || x.act === "climax") && (isU(x.name) || isU(x.partner)));
            let rep = mine.length ? { name: "{{user}}", sex: mine.flatMap((x) => x.sex ?? []), known: mine.some((x) => x.known), birth: mine.some((x) => x.birth), loss: mine.some((x) => x.loss), period: mine.some((x) => x.period) } : null;
            if (rep?.sex.length && rec.stage1?.nsfw && !did) rep.sex = [];
            if (rep?.sex.length) rep = gateReports([rep], () => ({ nsfw: at.folder?.nsfw?.[USER_NSFW_ID] ?? null, L: at.folder?.life?.p?.[USER_NSFW_ID] ?? null }), { turn: Number.isInteger(at.folder?.cursor?.at) ? at.folder.cursor.at : 0, cumOf: () => cums.find((x) => isU(x.name)) ?? null }).reports[0];
            let done = [];
            await store.updateFolder(at.chaId, at.ck, (f) => { done = stepUserCycle(f, { report: rep, text: run.rp, at: Date.now() < backfillUntil ? null : at.n, rate: Number(settings.snapshot()?.features?.openness?.cycleRate) || 1, changes }); });
            if (done.length) logEvent({ area: "월경·임신", title: `나 · ${done.join(" · ")}` });
          }
        } catch (e) { log("기록기: 나의 월경 계산 건너뜀", e?.message ?? e); }
        if (cs.dropped.length) log(`기록기: 장면에 없는 인물의 성관계 보고를 뺐어요 — ${cs.dropped.join(", ")}`);
        { const R = cs.reports, n = (f) => R.filter(f).map((x) => x.name);
          const parts = [`여성 ${R.length}명${R.length ? `(${R.map((x) => x.name).join(", ")})` : ""}`, ...R.flatMap((x) => x.sex.map((y) => `관계 ${x.name}↔${y.partner}(${y.contraception === "used" ? "피임" : "피임 안 함"})`)),
            n((x) => x.period).length && `생리 ${n((x) => x.period).join(", ")}`, n((x) => x.known).length && `임신 알게 됨 ${n((x) => x.known).join(", ")}`, n((x) => x.loss).length && `유산 ${n((x) => x.loss).join(", ")}`, n((x) => x.birth).length && `출산 ${n((x) => x.birth).join(", ")}`,
            cs.dropped.length && `장면에 없어 뺀 관계 ${cs.dropped.join(", ")}`].filter(Boolean);
          if (R.length || rec.stage1?.cycleDeclared) cycleMiss = 0;
          if (R.length) logEvent({ area: "월경·임신", title: parts.join(" · ") });
          else if (rec.stage1?.cycleDeclared) logEvent({ kind: "skip", area: "월경·임신", title: "기록기가 이번 응답 장면에 여성이 없다고 보고했어요(women|none)" });
          // 11-22 버그리포트: 한 번 빠뜨린 건(모델이 가끔 줄을 잊음) 문제로 띄우지 않고, 세 번 잇따라 빠질 때만 알린다
          else if (++cycleMiss < 3) logEvent({ kind: "skip", area: "월경·임신", title: `기록기가 이번 응답에서 월경 줄을 빠뜨렸어요(${cycleMiss}번째 — 다음 응답에서 다시 받아요)` });
          else logFailure({ area: "월경·임신", title: "기록기가 월경 줄을 빠뜨렸어요 — 문제", error: "문제: 월경 추적이 켜져 있는데 기록 모델 답에 women| 줄이 없어요", why: "기록 모델이 월경 지침을 따르지 않았어요(검열이 아니라 지침 누락).", todo: "계속되면 장기 기억 보조 모델을 지침을 더 잘 따르는 모델로 바꿔 보세요.", fallback: "이번 응답은 월경·임신을 기록하지 않았어요" }); }
        // 0.3.22 피임·강제 피임·체내 정액량·출산/유산 이력으로 관계마다 보호 여부를 정한다(코어 월경 추적이 비보호만 배란일 확률로 굴림)
        try {
          const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex(), ch = await api.getCharacterFromIndex(ci), chat0 = await api.getChatFromIndex(ci, ti);
          const fo = ch && chat0 ? await store.getFolder(String(ch.chaId), chatKeyOf(chat0, ti)) : null;
          const docOf = (n) => Object.values(fo?.wiki?.documents ?? {}).find((d) => d?.type === "Character" && [d.title, ...(d.aliases ?? [])].some((x) => nkey(x) === nkey(n)));
          const cums = (rec.stage1?.extra ?? []).filter((x) => x.kind === "cum" && x.where === "inside");
          const when0 = [...(fo?.scenes ?? [])].filter((x) => !x.orphan && x.when).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]?.when ?? "";
          const g = gateReports(cs.reports, (n) => { const d = docOf(n); return d ? { nsfw: fo?.nsfw?.[d.id] ?? null, L: fo?.life?.p?.[d.id] ?? null, race: raceFor(fo, [d.title, ...(d.aliases ?? [])]) } : {}; },
            { turn: Number.isInteger(fo?.cursor?.at) ? fo.cursor.at : 0, now: when0, cumOf: (her, him) => cums.find((x) => nkey(x.name) === nkey(her) && (!him || nkey(x.partner) === nkey(him))) ?? null });
          cs.reports = g.reports;
          // 2.2.29 버그리포트: 관계한 적 없는 인물이 임신 — 기록 모델이 월경 줄에 관계를 잘못 적어도 굴렸다.
          // 같은 응답에 관계·절정 행동(act) 또는 질 안 사정(cum) 기록이 있을 때만 임신을 굴린다(성인 항목 기록이 켜져 있을 때)
          if (rec.stage1?.nsfw) {
            const acts = (rec.stage1.nsfw ?? []).filter((x) => x.kind === "act" && (x.act === "sex" || x.act === "climax"));
            const did = (her, him) => cums.some((x) => nkey(x.name) === nkey(her)) || acts.some((x) => (nkey(x.name) === nkey(her) && (!him || !x.partner || nkey(x.partner) === nkey(him))) || (nkey(x.partner) === nkey(her) && (!him || nkey(x.name) === nkey(him))));
            const blocked = [];
            cs.reports = cs.reports.map((r) => !r?.sex?.length ? r : { ...r, sex: r.sex.map((x) => { if (x.contraception === "used" || did(r.name, x.partner)) return x; blocked.push(`${r.name}↔${x.partner}`); return { ...x, contraception: "used" }; }) });
            if (blocked.length) logEvent({ area: "임신·피임", title: `관계 기록이 없어 임신을 굴리지 않았어요 · ${blocked.join(", ")}` });
          }
          if (g.log.length) logEvent({ area: "임신·피임", title: g.log.join(" · ").slice(0, 160), detail: g.log });
          for (const x of cs.reports) { if (x.birth) nsfwQueue.push({ kind: "hist", name: x.name, ev: "birth" }); if (x.loss) nsfwQueue.push({ kind: "hist", name: x.name, ev: "loss" }); }
        } catch (e) { log("기록기: 피임 계산 건너뜀", e?.message ?? e); }
        env = applyCycleReportObject({ ...env, cycle_report: cs.reports }, wiki.snapshot(), cy).obj;
        // addon-rebuild: 생리 시작·유산은 주기 계산이 끝난 뒤(settle) 위키 구획에 맞춘다
        const ev = cs.reports.filter((x) => x.period || x.loss).map((x) => ({ name: x.name, period: !!x.period, loss: !!x.loss }));
        if (ev.length) cycleSync.push(...ev); } catch (e) { log("기록기: 월경 보고 변환 실패", e?.message ?? e); } }
      if (prep && !stash.has(prep.h)) { try { putStash(prep.h, buildDusk(rec, { ignore: prep.ignore, light, beliefs })); } catch (e) { log("기록기: Dusk 기록 변환 실패", e?.message ?? e); } }
      // 11-23 버그: 종류마다 합계 40·60개로 잘라 성인 줄을 넣을 때 앞서 넣은 정액·흔적 줄이 버려졌다 — 모두 넣고 한 번만, 넉넉히 자른다
      nsfwQueue.push(...(rec.stage1?.human ?? []), ...(rec.stage1?.extra ?? []), ...(rec.stage1?.nsfw ?? []));   // 0.3.22 소문·목표·세계·흔적
      while (nsfwQueue.length > NSFW_QUEUE_MAX) nsfwQueue.shift();
      if (rec.stage1?.drive) { driveQueue.push(rec.stage1.drive); while (driveQueue.length > 6) driveQueue.shift(); }   // 장면 판단 관찰(턴 하나 = 한 묶음)   // addon-rebuild: 채팅별 성인 프로필 변화(애드온이 턴 뒤 폴더에 반영)
      lastRecord = { at: Date.now(), batch: run.batch, ...summarize(rec, env) };
      tellTurn({ rp: run.rp, batch: run.batch, key: fullKey, source: Date.now() < backfillUntil ? "backfill" : "live", people: rec.people.filter((p) => !p.failed).map((p) => ({ name: p.name, aliases: Array.isArray(p.doc?.aliases) ? p.doc.aliases : [], memory: [personaOf(p.doc?.id), (p.lines ?? []).map((l) => typeof l === "string" ? l : l?.text ?? "").join("\n")].filter(Boolean).join("\n").slice(0, 1800) })) });
      return JSON.stringify(env);
    };
    // 기록하기: Dusk 구획을 같이 싣고, 돌아온 응답에서 떼어 낸다.
    const writerCall = async (a, k, preset, prompt, opts = {}) => {
      const label = String(opts.stageLabel ?? ""); let sent = prompt, prep = null;
      if (/^writer/i.test(label)) { try { cyclePending = cycleStates(wiki.snapshot()); } catch { cyclePending = null; } }   // 기록기 길에서도 큰 사건(출산 등)을 잡게 먼저
      if (/^writer batch/i.test(label)) {
        // 기록기가 끝내 실패하면: 2.1.4부터 기본은 이 기록을 실패로 끝내고 '다시 시도' 알림을 띄운다(다시 시도 = 기록기로 새로).
        // 예전처럼 리수폿 Writer 전체 지침(약 3만 토큰)으로 대신하려면 설정 '기록기가 실패하면 예전 리수폿 기록으로 대신'(potFallback). 취소는 그대로 던진다.
        let failed = null; recorderFailed = false;
        const out = await attemptDuskRecord(() => recordWithDusk(a, k, preset, prompt, opts, cycleScope(label)), (e) => { failed = e; });
        if (out != null) return out;
        // 2.2.30: 지침 없이 조립한 프롬프트(기록기 전용)는 모델에 그대로 보내면 안 된다 → 기록 실패로 끝낸다(다음 응답·다시 시도 때 전체로 다시 조립)
        if (!failed && String(prompt).includes(LEAN_MARK)) failed = new Error("기록기가 이번 요청을 읽지 못했어요");
        if (failed) {
          const message = String(failed?.message ?? failed).slice(0, 200);
          const fallback = false;   // 2.2.2 '예전 리수폿 기록으로 대신' 설정 없앰(늘 꺼짐)
          lastRecord = { at: Date.now(), error: message, ...(fallback ? { fallback: "risupot" } : {}) };
          if (!fallback) { recorderFailed = true; log("Dusk 기록기 실패(예전 리수폿 기록으로 대신하지 않음)", message); throw Object.assign(new Error(`Dusk 기록기 실패 — ${message}`), { code: "dusk-recorder-failed" }); }
          log("Dusk 기록기 실패 → 예전 리수폿 기록으로 대신", message);
        }
      }
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
      if (cyc) { try { text = applyCycleReport(text, wiki.snapshot(), parseJson, cycleScope(label)).raw; } catch { /* 보고 줄 없이 그대로 */ } }
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
      if (st.phase === "failed" && lastKey && !recorderFailed && !/리롤|삭제되어|RP 본문이 바뀌어|Dusk 기록기 실패/.test(String(st.message ?? ""))) { recDone.delete(lastKey); recCache.clear(); potNext.add(lastKey); while (potNext.size > 4) potNext.delete(potNext.values().next().value); }
      if (st.phase === "completed") lastKey = "";
      logEvent({ kind: st.phase === "completed" ? "ok" : st.phase === "failed" ? "fail" : "skip", area: "인물 위키 기록", title: st.phase, detail: String(st.message ?? "") });
      let scope = null; try { scope = wiki.snapshot(); } catch { /* 아직 준비 전 */ }
      const verdict = judgeAutoResult({ phase: st.phase, message: st.message, scope, names: lastRecord && !lastRecord.error ? lastRecord.names ?? null : null });
      if (verdict) {
        // 2.2.4 실패 기록에 남기고, 알림에 '이유 보기'를 단다
        const TITLE = { failed: "인물 위키 자동 기록 실패", manual: "이 응답은 자동 기록하지 않았어요", conflict: "직접 고친 문서와 겹쳐서 자동 기록을 멈췄어요", empty: "인물 문서가 만들어지지 않았어요", nometric: "수치가 빈 인물이 있어요" };
        Promise.resolve(logFailure({ area: "인물 위키 기록", title: TITLE[verdict.kind] ?? verdict.text.slice(0, 80), error: st.message || verdict.text, fallback: verdict.retry !== false ? "알림의 ‘다시 시도’로 다시 기록할 수 있어요" : "",
          ...(verdict.kind === "empty" || verdict.kind === "nometric" ? { why: verdict.text.replace(/ 다시 시도할까요\?$/, ""), todo: "‘다시 시도’를 눌러 보세요. 계속되면 보조 모델을 더 강한 것으로 바꿔 보세요." } : {}),
          ctx: { 단계: st.phase, 종류: verdict.kind, ...(lastRecord?.error ? { "Dusk 기록기": String(lastRecord.error).slice(0, 300) } : {}) } }))
          .then((e) => toast.show(verdict.text, { retry: verdict.retry !== false, reason: e?.id ?? null })).catch(() => {});
      } else toast.hide().catch(() => {});
    });
    const main = new MainWikiHook(api, settings, wiki, keys, libFor("fast"), auto, null, trace);
    // 2.0.0 Dusk 정리 노트: 리수폿 정리 노트 지침(8만 자 안팎)을 보내지 않고, 저장된 위키 값으로 인물 정리표를 프로그램이 만든다(늘 같은 값).
    // 연출 모드면 짧은 질문 1번으로 '이번 응답 방향'만 덧붙인다. 해석이 안 되면 예전 길로.
    const routerSeen = new Map(), dirSeen = new Map(); let lastCast = null;   // 다시 요청 때 재사용(retrycache.js)
    main.llmCall = async (a, k, preset, prompt, opts = {}) => {
      const label = String(opts.stageLabel ?? "");
      if (/^router/i.test(label)) {
        const key = routerKey(prompt);
        if (key && routerSeen.has(key)) { retryHits++; return swapRequestRef(routerSeen.get(key), prompt); }
        // 2.2.30: 나온 위키 인물·위키 목록이 지난번과 같으면 다시 묻지 않는다(연속 3번까지, 4번째엔 새로 물어 새 인물을 놓치지 않게)
        const ck = castKey(prompt);
        if (ck && lastCast?.key === ck && lastCast.n < 3) { lastCast.n++; castHits++; return swapRequestRef(lastCast.out, prompt); }
        const out = await stageCall(a, k, preset, prompt, opts);
        if (key && typeof out === "string") boundedSet(routerSeen, key, out);
        lastCast = ck && typeof out === "string" ? { key: ck, out, n: 0 } : null;
        return out;
      }
      if (/^director pass/i.test(label)) {
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
          settings: { tokens: idx.settings.flow?.recallTokens ?? 700, plus: idx.settings.inject?.plus !== false, forgetAfter: 150 }
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
      hookState = state;   // 11-22 버그리포트(포켓리스 위키 안 됨): 실패 이유를 화면 안내·기록에 쓴다
      if (state !== "ready") { log("턴 흐름 훅 등록 실패:", state); logEvent({ kind: "skip", area: "기억", title: `기억 기록 연결(리스 훅)을 켜지 못했어요: ${state}`, detail: { 다음: "위키 버튼을 누를 때 다시 시도해요" } }); await r.hooks.dispose().catch(() => {}); if (!pure) await injector.start(); return null; }
      link.settle = async (ci, ti) => {
        const ok = await r.auto.waitForScope(ci, ti, { timeoutMs: 180000 });
        try { if (cyclePending) { const ev = milestonesBetween(cyclePending, cycleStates(r.wiki.snapshot())); cyclePending = null; cycleEvents.push(...ev); } } catch { cyclePending = null; }
        if (ok && cycleSync.length) { const ev = cycleSync.splice(0); try { let changed = []; const st = r.wiki.requireStore(); st.replace((v) => { const o = applyCycleEvents(v, ev); changed = o.changed; return o.scope; }); await st.flush(); if (changed.length) { log(`월경 기록 맞춤: ${changed.join(", ")}`); logEvent({ area: "월경·임신", title: `생리 시작·유산 반영 · ${changed.join(", ")}`, detail: ev }); } } catch (e) { log("월경 기록 맞춤 실패", e?.message ?? e); } }
        // 0.3.22 동거 여성 월경 주기 동기화(한 주기 지날 때마다 조금씩)
        let target = null;   // 두 동기화가 같은 대상·같은 폴더 하나를 쓴다
        if (ok) { try {
          target = await settleTarget(r.wiki, store);
          const { chaId, ck, folder: fo } = target ?? {}, e = extraOf(fo);
          if (target && e.cohabit.length) { let res = null; const st = r.wiki.requireStore(); st.replace((v) => { res = syncCycles(v, e.cohabit, e.cycleSync); return res.scope; }); await st.flush();
            if (res && JSON.stringify(res.last) !== JSON.stringify(e.cycleSync)) await store.updateFolder(chaId, ck, (f) => { const x = extraOf(f); x.cycleSync = res.last; f.extra = x; });
            if (res?.changed.length) { log(`월경 주기 동기화: ${res.changed.join(", ")}`); logEvent({ area: "월경·임신", title: `함께 사는 사람끼리 주기가 조금 가까워졌어요 · ${res.changed.join(", ")}` }); } }
        } catch (e) { log("월경 주기 동기화 실패", e?.message ?? e); } }
        // 2.2.30 호감도 = 감정(인간적·이성적 호감·신뢰, 적대·두려움) + 친밀도 + 첫인상(엔진 계산, 호출 없음)
        if (ok) { try { await syncAffinityNow(r, target); } catch (e) { log("호감도 계산 실패", e?.message ?? e); } }
        return ok;
      };
      link.takeCycle = () => cycleEvents.splice(0);
      link.take = (h) => { const v = stash.get(h); if (v) stash.delete(h); return v ?? null; };
      // 지난 대화 분석에 리수폿 위키 기록도 함께: 묶음 끝 응답을 자동 기록 큐에 넣고, 끝나면 큐가 빌 때까지 기다린다.
      link.backfillPotReady = async (character) => {
        const idx = await store.getIndex();
        return potState(idx, character?.chaId).on && r.auto.enabled();
      };
      link.backfillPot = (ci, ti, messageIndex, shared) => { backfillUntil = Date.now() + BACKFILL_HOLD_MS; return r.auto.schedule({ chat: shared.chat, char: shared.character, characterIndex: ci, chatIndex: ti, messageIndex }); };
      link.backfillPotWait = (ci, ti, signal) => new Promise((res) => {
        const done = (v) => { backfillUntil = 0; res(v); };
        const p = r.auto.waitForScope(ci, ti, { timeoutMs: 10 * 60 * 1000 }).then(done, () => done(false));
        signal?.addEventListener?.("abort", () => done(false), { once: true });
        return p;
      });
      rt = r; return r;
    })();
    try { return await starting; } finally { starting = null; }
  }
  async function stop() {
    if (!rt) return false;
    const r = rt; rt = null; try { r.tools?.dispose(); } catch {} delete link.settle; delete link.take; delete link.takeCycle; delete link.backfillPot; delete link.backfillPotWait; delete link.backfillPotReady; stash.clear(); cycleEvents.length = 0; cycleSync.length = 0; cyclePending = null;
    await r.hooks.dispose().catch(() => {});
    if (!pure) await injector.start();
    return true;
  }
  // 설정(flow.on·mode, 모델)이 바뀐 뒤 부른다.
  async function syncAffinityNow(r, target) {
    const fo = target?.folder; if (!fo?.emo || !target.same()) return;
    let policy = null; try { policy = JSON.parse(r.main.sourceLibrary?.base?.policies ?? "{}")?.policies?.["affinity.score"] ?? null; } catch { policy = null; }
    if (!policy) return;
    const K = keyOfH(fo), now = nowOfH(fo), uk = K("{{user}}");
    const feelOf = (names) => { const ks = new Set(names.map(K)); const p = Object.values(fo.emo).find((x) => ks.has(K(x.from)) && K(x.to) === uk); return p ? { has: true, tags: effectiveTagsH(p, now) } : { has: false }; };
    let res = null; const st = r.wiki.requireStore();
    st.replace((v) => { res = syncAffinity(v, { feelOf, intimOf: (title) => intimacyOfH(fo, "{{user}}", title, now).v, policy }); return res.scope; }); await st.flush();
    if (res?.changed.length) log(`호감도 계산: ${res.changed.map((c) => `${c.title} ${c.from}→${c.to}`).join(", ")}`);
  }
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

  // addon-rebuild: Erosync 출발값에 넘길 인물 바탕(위키 기본 성격·성적 욕망·이상성향) — 체위·장소 기본값을 여기서 추론한다
  function personaOf(docId) {
    try {
      const pr = docId ? wiki.snapshot()?.people?.profiles?.[docId] : null; if (!pr) return "";
      return [pr.summary && `성격: ${pr.summary}`, pr.coreTraits?.length && `특성: ${pr.coreTraits.join(", ")}`, pr.intimacyStyle && `친밀감: ${pr.intimacyStyle}`,
        pr.sexualDesire?.text && `성적 욕망: ${pr.sexualDesire.text}`, pr.paraphilia?.text && `이상성향: ${pr.paraphilia.text}`].filter(Boolean).join("\n").slice(0, 900);
    } catch { return ""; }
  }
  return { takeNsfw: () => nsfwQueue.splice(0), takeDrive: () => driveQueue.splice(0), onTurn: (fn) => { turnListeners.add(fn); return () => turnListeners.delete(fn); }, start: apply, apply: async () => { dropCold(); return apply(); }, hookState: () => hookState, stop, isOn: () => !!rt, tools: () => rt ? (rt.tools ??= makeTools({ api, rt, sourceLibrary, llmCall: rt.stageCall })) : null, last: () => lastTurn, lastRecord: () => lastRecord, lastSkipped: () => lastSkipped, lastNote: () => lastNote, retryHits: () => retryHits, runtime: () => rt, stash: () => stash.size, settings: settingsStore };
}
