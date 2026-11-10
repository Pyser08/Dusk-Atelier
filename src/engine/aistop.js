// AI 생성 중지 (2.1.0): 플러그인·애드온의 모든 AI 호출을 한곳에서 센다. 하나라도 돌고 있으면 화면 오른쪽 아래에
// '생성 중지' 버튼이 뜨고(ui/aistopbtn.js), 누르면 지금 도는 호출을 모두 끊는다.
// 잡는 곳 두 군데: runAI(engine/runai.js — Dusk 대부분의 AI 작업)와 api.runLLMModel 래퍼(main.js — 리수폿·Erosync·봇빌더처럼 직접 부르는 곳).
// 호스트의 모델 호출 자체를 되돌릴 수는 없어서, 기다리던 쪽이 바로 '중지' 오류를 받고 결과는 버린다(스트림이면 읽기를 끊는다).
export var STOP_MSG = "생성을 중지했어요.";
var GRACE_MS = 2000;   // 중지 직후 자동 재시도가 곧바로 다시 부르는 것을 막는 시간

var active = new Map();   // id → { ctrl, label, at }
var listeners = new Set();
var seq = 0, stoppedAt = 0;
var emit = () => { for (const f of listeners) { try { f(active.size); } catch { /* 화면 쪽 오류는 무시 */ } } };

export var stopError = () => Object.assign(new Error(STOP_MSG), { name: "AbortError", duskStopped: true });
export var isStopError = (e) => !!e?.duskStopped || e?.message === STOP_MSG;
export var activeCount = () => active.size;
export var justStopped = () => Date.now() - stoppedAt < GRACE_MS;
export function onAiChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// 호출 하나를 센다. signal: 부르는 쪽의 취소 신호(있으면 함께 따른다)
export function trackAi(label = "", signal = null) {
  const id = ++seq, ctrl = new AbortController();
  if (signal) { if (signal.aborted) ctrl.abort(); else signal.addEventListener?.("abort", () => ctrl.abort(), { once: true }); }
  let rej;
  const stopped = new Promise((_, r) => { rej = r; });
  stopped.catch(() => {});
  ctrl.signal.addEventListener("abort", () => rej(stopError()), { once: true });
  active.set(id, { ctrl, label, at: Date.now() });
  emit();
  return {
    signal: ctrl.signal,
    // 작업 promise와 중지를 겨룬다: 중지하면 바로 오류
    race: (p) => Promise.race([p, stopped]),
    end: () => { if (active.delete(id)) emit(); }
  };
}
export function stopAll() {
  stoppedAt = Date.now();
  const list = [...active.values()];
  for (const a of list) { try { a.ctrl.abort(); } catch { /* 이미 끝남 */ } }
  return list.length;
}
// api.runLLMModel을 세는 버전으로 감싼다(직접 부르는 리수폿·Erosync·봇빌더용)
export function trackedRunLLM(run) {
  return async (opts, ...rest) => {
    if (justStopped()) throw stopError();
    const t = trackAi(opts?.mode ? `model:${opts.mode}` : "model");
    try { return await t.race(Promise.resolve().then(() => run(opts, ...rest))); }
    finally { t.end(); }
  };
}
// 시험용
export function __resetAiStop() { active.clear(); listeners.clear(); stoppedAt = 0; }
