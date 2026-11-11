// Dusk 2.1.4: 응답이 확정된 뒤 '다음 턴 계획 미리 짜기'(+ 인물 재분석·비하인드)를 바로 하지 않고 잠깐 미룬다.
// 그 사이 같은 채팅에서 다시 생성(검열·직접 중지로 잘린 응답을 다시 누름)하면 잘린 응답 몫은 짜지 않는다(보조 모델 호출 절약).
// 다음 말을 보내면 기다리지 않고 바로 시작한다.
export const LOOKAHEAD_CANCELLED = Symbol("erosync-lookahead-cancelled");
export function createLookaheadDelay({ delayMs = 20000, setTimer = (f, ms) => setTimeout(f, ms), clearTimer = (t) => clearTimeout(t) } = {}) {
  const waiting = new Map();   // 채팅 열쇠 → { run, cancel }
  // start: 미뤘다가 부를 함수. 돌려주는 약속은 start의 결과, 취소되면 LOOKAHEAD_CANCELLED.
  function delay(key, start) {
    cancel(key);
    let done = false, timer = null, resolve;
    const promise = new Promise((r) => { resolve = r; });
    const run = () => {
      if (done) return promise; done = true; clearTimer(timer);
      if (waiting.get(key)?.run === run) waiting.delete(key);
      Promise.resolve().then(start).then(resolve, () => resolve(null));
      return promise;
    };
    const stop = () => { if (done) return false; done = true; clearTimer(timer); if (waiting.get(key)?.run === run) waiting.delete(key); resolve(LOOKAHEAD_CANCELLED); return true; };
    timer = setTimer(run, delayMs);
    waiting.set(key, { run, cancel: stop });
    return promise;
  }
  const cancel = (key) => waiting.get(key)?.cancel() ?? false;
  const flush = (key) => { const w = waiting.get(key); return w ? w.run() : null; };
  const cancelAll = () => { for (const k of [...waiting.keys()]) cancel(k); };
  return { delay, cancel, flush, cancelAll, has: (key) => waiting.has(key) };
}
