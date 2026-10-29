// 장기기억 러너: output 훅 → 디바운스 → 마지막 AI 응답 분석 → 폴더 반영. 훅 안에서는 await 하지 않는다.
import { extractMessageText, isUserMessage, hashText, confirmedAiIndex, isChatGenerating as isGenerating } from "../engine/chattext.js";
import { analyze } from "../engine/memoryprompt.js";
import { customPromptPlain } from "../engine/pot/custom-prompts.js";
import { reconcile } from "../engine/memoryreconcile.js";
import { loadReconciled } from "./memoryload.js";
import { applyAnalysis, knownPeople, doneHashes } from "../engine/memoryapply.js";
import { storyDateOf } from "../engine/storydate.js";
import { addMilestones } from "../engine/cyclememo.js";
import { runAI } from "../engine/runai.js";
import { openForPrompt } from "../engine/memoryplus.js";
import { emoForPrompt } from "../engine/memoryemo.js";
import { hintsForPrompt } from "../engine/memoryinner.js";
import { needsDigest, digestTargets, digestMessages, applyDigest } from "../engine/memorydigest.js";

const midOf = (m) => typeof m?.chatId === "string" && m.chatId && !m.chatId.startsWith("inherited:") ? m.chatId : null;
const MAX_FAILS = 5;
// 자동 기록 시점: next(기본) = 다음 입력을 보낼 때 직전 응답을 확정해 기록 | now = 응답 직후
const confirmOf = (idx) => idx?.settings?.confirm === "now" ? "now" : "next";

export function createMemoryRunner(api, { store, prompts = null, afterAnalyze = null, log = (...a) => console.log("[Dusk 기억]", ...a), notify = () => {}, retryMs = 2000, call = null, link = null } = {}) {
  let timer = null, dirty = false, running = false, started = false;
  let session = { calls: 0, hooks: 0, displays: 0, hookAt: 0, tick: null }; const lastTried = new Map(); let lastTickAt = 0;
  const note = (result, extra = {}) => { session.tick = { at: Date.now(), result, ...extra }; };
  // 보조 모델 호출 제한시간(초): 기록·주입 세부 설정에서 바꾼다. 기본 600초
  const modelOf = (s) => ({ ...s.model, timeoutSec: Number.isFinite(s.modelTimeoutSec) ? s.modelTimeoutSec : 600 });
  const run = call ?? ((msgs, pick, signal) => runAI(api, msgs, pick, signal));

  const aiIndexes = (messages) => messages.map((m, i) => (!isUserMessage(m) && extractMessageText(m).trim() ? i : -1)).filter((i) => i >= 0);
  const line = (m, i, n = 1500) => `[${i}] ${isUserMessage(m) ? "{{user}}" : "{{char}}"}: ${extractMessageText(m).trim().slice(0, n)}`;
  const nameOf = (c, chat, i) => ({ botName: String(c?.name ?? "").slice(0, 160), chatName: String(chat?.name ?? chat?.chatName ?? `채팅 ${i + 1}`).slice(0, 160) });

  async function bump(chaId, fn) { return store.updateIndex((idx) => { const b = idx.bots[chaId] ??= { on: true, ignore: [], fails: 0 }; return fn(b, idx); }); }
  async function status(patch) { return store.updateIndex((idx) => { Object.assign(idx.status, patch); }).catch(() => {}); }

  // 분석 대상 한 묶음의 공통 자료(채팅·앵커·설정). 모델 호출 없음.
  async function gather(charIndex, chatIndex, group) {
    const character = await api.getCharacterFromIndex(charIndex), chat = await api.getChatFromIndex(charIndex, chatIndex);
    if (!character || !chat) throw new Error("캐릭터 또는 채팅을 찾지 못했어요.");
    const chaId = String(character.chaId ?? charIndex), chatId = String(chat.id ?? chatIndex);
    const messages = chat.message ?? [], last = group.at(-1), m = messages[last];
    const text = group.map((i) => group.length > 1 ? line(messages[i], i, 3000) : extractMessageText(messages[i]).trim()).join("\n\n");
    const h = hashText(extractMessageText(m)), anchor = { at: last, mid: midOf(m), h };
    const idx = await store.getIndex(), bot = idx.bots[chaId] ?? { on: true, ignore: [] };
    return { character, chat, chaId, chatId, messages, last, text, h, anchor, idx, bot };
  }
  // 자동 기록 조건. 문자열이면 기록하지 않는 이유, null이면 기록 대상.
  function gate(g, manual) {
    if (manual) return null;
    if (g.bot.on === false || g.bot.paused || g.idx.settings.autoRecord === false) return "off";
    const ordinal = aiIndexes(g.messages).filter((i) => i <= g.last).length;
    if (ordinal < (g.idx.settings.startTurn ?? 1)) return "early";
    if (g.text.length < g.idx.settings.minChars) return "short";
    if ((g.idx.settings.everyN ?? 1) > 1 && ordinal % g.idx.settings.everyN !== 0) return "skip";
    return null;
  }
  // 설정의 '내 프롬프트' 중 장기기억 분석에 쓸 것을 위치별로 모은다. 실패해도 기록은 계속한다.
  async function customOf(chaId, chatId) {
    try {
      const s = await prompts?.(); if (!s) return null;
      const sc = { characterId: chaId, chatKey: chatId };
      return { front: customPromptPlain(s, "memory", sc, "front"), middle: customPromptPlain(s, "memory", sc, "middle"), back: customPromptPlain(s, "memory", sc, "back") };
    } catch { return null; }
  }
  // 분석 모델에 보낼 입력(기존 폴더 기준).
  function inputOf(g, existing, group) {
    const recent = g.messages.slice(Math.max(0, group[0] - 6), group[0]).map((mm, k) => line(mm, Math.max(0, group[0] - 6) + k));
    return { bot: g.character.name, known: existing ? knownPeople(existing) : [], ignore: [...(g.bot.ignore ?? [])],
      previousScene: existing ? (({ sum, facts, when } = {}) => sum ? { sum, facts, ...(when ? { when } : {}) } : null)([...(existing.scenes ?? [])].reverse().find((s) => !s.orphan)) : null, openItems: existing ? openForPrompt(existing) : [], emoState: existing ? emoForPrompt(existing) : [], selfHint: existing ? hintsForPrompt(existing) : [], recent, newest: { index: g.last, text: g.text }, storyDate: storyDateOf(g.text, existing) };
  }
  // 리수폿 Writer 호출에 같이 실을 때 쓰는 준비물. 기록 대상이 아니면 null.
  async function prepareLatest(charIndex, chatIndex) {
    const i = await targetIndex(charIndex, chatIndex, confirmOf(await store.getIndex())); if (i < 0) return null;
    const g = await gather(charIndex, chatIndex, [i]);
    if (gate(g, false)) return null;
    const existing = await loadReconciled(store, g.chaId, g.chatId, g.messages);  // 옛 장면·떡밥이 새 요약에 섞이지 않게 먼저 대조
    if (existing?.cursor?.h === g.h && existing.cursor.at === g.last) return null;
    return { h: g.h, ignore: [...(g.bot.ignore ?? [])], input: inputOf(g, existing, [i]) };
  }

  // 한 메시지(또는 묶음)를 분석해 반영. group: 같은 입력에 합칠 메시지 인덱스들(마지막이 앵커).
  async function analyzeAt(charIndex, chatIndex, group, { signal, manual = false } = {}) {
    const g = await gather(charIndex, chatIndex, group);
    const { character, chat, chaId, chatId, messages, last, text, h, anchor, idx, bot } = g;
    const why = gate(g, manual); if (why) return why;
    const existing = await loadReconciled(store, chaId, chatId, messages);  // 옛 장면·떡밥이 새 요약에 섞이지 않게 먼저 대조
    if (existing?.cursor?.h === h && existing.cursor.at === last) return "done";
    const tryKey = chaId + "::" + chatId;
    if (!manual && lastTried.get(tryKey) === h) return "done";
    lastTried.set(tryKey, h);
    const firstTime = !existing && !bot.notified;
    const input = inputOf(g, existing, group);
    input.custom = await customOf(g.chaId, g.chatId);
    let result = manual ? null : link?.take?.(h) ?? null;
    if (result) session.combined = (session.combined ?? 0) + 1;
    else session.calls++;
    try { if (!result) result = await analyze((msgs) => run(msgs, modelOf(idx.settings), signal), input); }
    catch (e) {
      const fails = await bump(chaId, (b) => ++b.fails);
      await status({ lastError: String(e?.message ?? e).slice(0, 300) });
      if (fails >= MAX_FAILS) { await bump(chaId, (b) => { b.paused = true; }); notify(`"${character.name}"의 장기 기억 분석이 ${MAX_FAILS}번 연속 실패해서 이 봇의 자동 기록을 멈췄어요. 기억 탭에서 다시 켤 수 있어요.`); }
      lastTried.delete(tryKey);
      throw e;
    }
    const names = nameOf(character, chat, chatIndex);
    const out = await store.updateFolder(chaId, chatId, (folder) => {
      Object.assign(folder, names, { chatIndex });
      reconcile(folder, messages);
      const res = applyAnalysis(folder, result, anchor, { storyDate: input.storyDate, ignore: bot.ignore ?? [], covered: group.map((i) => hashText(extractMessageText(messages[i]))) });
      const ev = link?.takeCycle?.() ?? [];
      if (ev.length) res.cycle = addMilestones(folder, ev);
      return res;
    });
    await bump(chaId, (b) => { b.fails = 0; b.lastRunAt = Date.now(); b.notified = true; });
    await status({ processed: (idx.status.processed ?? 0) + 1, lastSuccessAt: Date.now(), lastError: "" });
    digestIfNeeded(chaId, chatId, modelOf(idx.settings)).catch((e) => log("digest 실패", e?.message ?? e));
    try { await afterAnalyze?.(charIndex, chatIndex); } catch (e) { log("후처리 실패", e?.message ?? e); }
    if (firstTime) notify("이 봇의 장기 기억 자동 기록을 시작했어요 (기억 탭에서 끌 수 있어요)");
    return out;
  }

  // 지연 압축: 조건이 맞는 인물 1명만, 호출은 큐 밖에서 하고 결과만 큐 안에서 반영. 실패하면 다음 분석 때 재시도.
  async function digestIfNeeded(chaId, chatId, model) {
    const f = await store.getFolder(chaId, chatId); if (!f) return false;
    const pk = Object.keys(f.people).find((k) => needsDigest(f.people[k], f.runs ?? 0)); if (!pk) return false;
    const targets = digestTargets(f.people[pk]); if (!targets.length) return false;
    const raw = await run(digestMessages(f.people[pk], targets), model);
    await store.updateFolder(chaId, chatId, (folder) => {
      const p = folder.people[pk]; if (!p || p.digestUser) return;
      const ids = new Set(targets.map((r) => r.id));
      applyDigest(p, p.records.filter((r) => ids.has(r.id)), raw, folder.runs ?? 0);
    });
    return true;
  }

  async function latestAiIndex(charIndex, chatIndex) {
    const chat = await api.getChatFromIndex(charIndex, chatIndex);
    const ai = aiIndexes(chat?.message ?? []); return ai.at(-1) ?? -1;
  }
  // 이번에 기록할 응답: now면 가장 최근 AI 응답, next면 마지막 사용자 메시지 앞의 확정된 응답
  async function targetIndex(charIndex, chatIndex, mode) {
    if (mode === "now") return latestAiIndex(charIndex, chatIndex);
    const chat = await api.getChatFromIndex(charIndex, chatIndex);
    return confirmedAiIndex(chat?.message ?? []);
  }

  // 메인 모델이 생성 중이면 2초마다 다시 확인한다(최대 3분). 훅이 다시 불리지 않아도 놓치지 않는다.
  const WAIT_MS = 180000;
  async function tick(since = Date.now()) {
    if (running) { dirty = true; return; }
    running = true; dirty = false; lastTickAt = Date.now();
    try {
      const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
      if (!(ci >= 0) || !(ti >= 0)) { note("nochat"); return; }
      const character = await api.getCharacterFromIndex(ci), mode = confirmOf(await store.getIndex());
      // 응답 직후(now) 방식은 생성이 끝나길 기다린다. 다음 입력(next) 방식은 이미 끝난 직전 응답을 보므로 기다리지 않는다.
      if (mode === "now" && isGenerating(character)) {
        if (Date.now() - since < WAIT_MS) { note("generating"); running = false; timer = setTimeout(() => tick(since), retryMs); } else note("generating-timeout");
        return;
      }
      const i = await targetIndex(ci, ti, mode);
      if (i < 0) { note(mode === "next" ? "noconfirmed" : "noai"); return; }
      if (link?.settle) await link.settle(ci, ti).catch(() => {});  // 리수폿 Writer가 같은 응답을 처리 중이면 끝날 때까지 기다려 호출을 합친다
      const r = await analyzeAt(ci, ti, [i]);
      note(typeof r === "string" ? r : "ok", { at_msg: i });
    } catch (e) { note("error", { error: String(e?.message ?? e).slice(0, 200) }); log("자동 분석 실패", e?.message ?? e); }
    finally { if (running) running = false; if (dirty) schedule(lastKind).catch(() => {}); }
  }
  // kind: "output"(응답 직후 훅) | "confirm"(다음 입력을 보낼 때). 설정한 자동 기록 시점과 맞는 쪽만 일정을 잡는다.
  let lastKind = "output";
  async function schedule(kind = "output") {
    const idx = await store.getIndex().catch(() => null);
    if ((kind === "confirm") !== (confirmOf(idx) === "next")) return;
    clearTimeout(timer); dirty = true; lastKind = kind;
    const ms = Math.max(0, Number(idx?.settings?.debounceSec ?? 4) * 1000);
    timer = setTimeout(() => tick(), ms);
  }
  const onOutput = (text) => { session.hooks++; session.hookAt = Date.now(); schedule("output").catch(() => {}); return text; };  // 본문은 그대로 반환
  // 사용자가 다음 말을 보내는 순간(요청 직전 훅)에 부른다: 직전 응답을 확정해 기록하기 시작한다.
  const confirmNext = () => schedule("confirm");
  // 출력 훅이 안 불리는 환경 대비: 화면 갱신 때 30초에 한 번, 현재 채팅의 마지막 AI 응답이 최근 것이면 점검한다(같은 응답은 해시로 중복 방지).
  const onDisplay = (text) => {
    session.displays++;
    if (!running && !timer && Date.now() - lastTickAt > 30000) { lastTickAt = Date.now(); recentCheck().catch(() => {}); }
    return text;
  };
  async function recentCheck() {
    const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
    if (!(ci >= 0) || !(ti >= 0)) return;
    const chat = await api.getChatFromIndex(ci, ti), i = (await latestAiIndex(ci, ti));
    const t = chat?.message?.[i]?.time;
    if (i < 0 || (typeof t === "number" && Date.now() - t > 10 * 60e3)) return;
    schedule().catch(() => {});
  }

  async function start() {
    await store.migrate().catch((e) => log("v1 이전 실패", e?.message ?? e));
    if (typeof api.addRisuScriptHandler !== "function") { await status({ hook: "unavailable", lastError: "이 환경에서는 출력 훅 API를 사용할 수 없어요." }); return false; }
    try {
      await api.addRisuScriptHandler("output", onOutput); started = true;
      try { await api.addRisuScriptHandler("display", onDisplay); } catch (e) { log("display 보조 훅 등록 실패", e?.message ?? e); }
      await status({ hook: "ready" }); return true;
    }
    catch (e) { await status({ hook: "error", lastError: String(e?.message ?? e).slice(0, 300) }); return false; }
  }

  // 수동·일괄 분석. range: {from,to} 메시지 인덱스(포함). AI 응답 3개씩 묶음.
  // 반환: groups·calls·tokens + 현황(total 범위 안 AI 응답 수, done 분석됨, todo 미처리, failed 미처리 중 지난번 실패한 것)
  function planBackfill(messages, { from = 0, to = Infinity } = {}, folder = null) {
    const ai = aiIndexes(messages).filter((i) => i >= from && i <= to);
    const done = doneHashes(folder), failedSet = new Set(folder?.failedBackfill ?? []);
    const hOf = (i) => hashText(extractMessageText(messages[i]));
    const todo = ai.filter((i) => !done.has(hOf(i)));
    const groups = []; for (let k = 0; k < todo.length; k += 3) groups.push(todo.slice(k, k + 3));
    const chars = groups.reduce((n, g) => n + g.reduce((s, i) => s + extractMessageText(messages[i]).length, 0) + 4000, 0);
    return { groups, calls: groups.length, tokens: Math.round(chars / 1.5), total: ai.length, done: ai.length - todo.length, todo: todo.length, failed: todo.filter((i) => failedSet.has(hOf(i))).length };
  }
  async function backfill(charIndex, chatIndex, range, { signal, onProgress } = {}) {
    const chat = await api.getChatFromIndex(charIndex, chatIndex), character = await api.getCharacterFromIndex(charIndex);
    const folder = await store.getFolder(String(character.chaId), String(chat.id ?? chatIndex));
    const { groups } = planBackfill(chat.message ?? [], range, folder);
    const failed = []; let n = 0;
    for (const g of groups) {
      if (signal?.aborted) break;
      if (isGenerating(await api.getCharacterFromIndex(charIndex))) throw new Error("응답을 생성하는 중이에요. 끝난 뒤 다시 시도해 주세요.");
      try { await analyzeAt(charIndex, chatIndex, g, { signal, manual: true }); } catch (e) { failed.push(g); if (signal?.aborted) break; }
      onProgress?.(++n, groups.length, failed.length);
    }
    if (failed.length) {  // 실패한 응답은 기억해 두었다가 현황에 '실패'로 보여 준다(성공하면 applyAnalysis가 지운다)
      const msgs = chat.message ?? [], hs = failed.flat().map((i) => hashText(extractMessageText(msgs[i])));
      await store.updateFolder(String(character.chaId), String(chat.id ?? chatIndex), (f) => { f.failedBackfill = [...new Set([...(f.failedBackfill ?? []), ...hs])].slice(-500); }).catch(() => {});
    }
    return { total: groups.length, failed };
  }

  return { start, onOutput, confirmNext, tick, analyzeAt, prepareLatest, analyzeLatest: async (ci, ti) => { const i = await latestAiIndex(ci, ti); if (i < 0) throw new Error("분석할 AI 응답이 없어요."); return analyzeAt(ci, ti, [i], { manual: true }); },
    planBackfill, backfill, digestIfNeeded, session: () => ({ ...session }), isStarted: () => started, stop: () => clearTimeout(timer) };
}
