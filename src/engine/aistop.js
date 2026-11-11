// AI 생성 중지 (2.1.0): 플러그인·애드온의 모든 AI 호출을 한곳에서 센다. 하나라도 돌고 있으면 화면 오른쪽 아래에
// '생성 중지' 버튼이 뜨고(ui/aistopbtn.js), 누르면 지금 도는 호출을 모두 끊는다.
// 잡는 곳 두 군데: runAI(engine/runai.js — Dusk 대부분의 AI 작업)와 api.runLLMModel 래퍼(main.js — 리수폿·Erosync·봇빌더처럼 직접 부르는 곳).
// 호스트의 모델 호출 자체를 되돌릴 수는 없어서, 기다리던 쪽이 바로 '중지' 오류를 받고 결과는 버린다(스트림이면 읽기를 끊는다).
export var STOP_MSG = "생성을 중지했어요.";
var GRACE_MS = 3000;   // 중지 직후 자동 재시도·대기 작업이 곧바로 다시 부르는 것을 막는 시간(막힐 때마다 다시 잼)

var active = new Map();   // id → { ctrl, label, at }
var listeners = new Set();
var tasks = new Map();    // id → { label, stopped } — aiTask로 연 '작업'(여러 AI 호출을 묶는 단위: 기억 기록, 로어북 정리…)
var seq = 0, stoppedAt = 0;
var emit = () => { for (const f of listeners) { try { f(active.size); } catch { /* 화면 쪽 오류는 무시 */ } } };

// 단계 id·내부 이름 → 버튼에 보일 이름. 모르는 영문 id·그냥 모델 호출은 "" (열린 작업 이름이나 'AI 작업'으로 대신)
var NAMES = { router: "관련 인물 고르기", director: "정리 노트", writer: "기억 기록", analysis: "기억 분석", sdstudio: "NAI 이미지 생성", "sdstudio:upscale": "NAI 업스케일", "sdstudio:vibe": "NAI 바이브 준비" };
export function describeAi(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (NAMES[s]) return NAMES[s];
  if (/^erosync\b/i.test(s)) return "Erosync";
  if (/^sdstudio\b/i.test(s)) return "NAI 이미지 생성";
  if (/^model\b/i.test(s) || /^[\x00-\x7f]*$/.test(s)) return "";
  return s.slice(0, 40);
}
// 지금 도는 것의 이름들(최근 것 먼저, 겹치면 하나). 호출은 있는데 이름이 하나도 없으면 ["AI 작업"]
export function activeTasks() {
  const out = [];
  const add = (n) => { if (n && !out.includes(n)) out.push(n); };
  [...active.values()].reverse().forEach((a) => add(describeAi(a.label)));
  [...tasks.values()].reverse().forEach((t) => { if (!t.stopped) add(t.label); });
  if (!out.length && active.size) out.push("AI 작업");
  return out;
}
// 여러 AI 호출을 하나의 작업으로 묶는다. 생성 중지를 누르면 이 작업은 끝날 때까지 새 AI 호출이 바로 막힌다(뒤에 줄 선 호출까지 멈춤)
export async function aiTask(label, fn) {
  const id = ++seq;
  tasks.set(id, { label: describeAi(label) || String(label ?? ""), stopped: false });
  emit();
  try { return await fn(); }
  finally { tasks.delete(id); emit(); }
}
// 중지 뒤에 막을 때인가: 중지된 작업이 아직 열려 있거나, 중지(또는 막힌 시도) 직후
function blocked() {
  for (const t of tasks.values()) if (t.stopped) return true;
  return Date.now() - stoppedAt < GRACE_MS;
}

export var stopError = () => Object.assign(new Error(STOP_MSG), { name: "AbortError", duskStopped: true });
export var isStopError = (e) => !!e?.duskStopped || e?.message === STOP_MSG;
export var activeCount = () => active.size;
export var justStopped = () => { if (!blocked()) return false; stoppedAt = Date.now(); return true; };
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
  if (justStopped()) ctrl.abort();   // 중지 직후 줄 서 있던 호출은 시작하자마자 끊는다
  return {
    signal: ctrl.signal,
    // 작업 promise와 중지를 겨룬다: 중지하면 바로 오류
    race: (p) => Promise.race([p, stopped]),
    end: () => { if (active.delete(id)) emit(); }
  };
}
export function stopAll() {
  stoppedAt = Date.now();
  for (const t of tasks.values()) t.stopped = true;
  const list = [...active.values()];
  for (const a of list) { try { a.ctrl.abort(); } catch { /* 이미 끝남 */ } }
  if (tasks.size) emit();   // 중지된 작업 이름을 버튼에서 뺀다
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
export function __resetAiStop() { active.clear(); tasks.clear(); listeners.clear(); stoppedAt = 0; }
