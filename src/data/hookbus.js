// 리스 스크립트 훅(input·output·display) 묶음 (v1.8.1 최적화).
// 훅은 하나 등록할 때마다 호스트와 글 전체를 주고받는다(스트리밍 중에는 조각마다, 화면에는 메시지마다).
// Dusk는 기능별로 훅을 5~6개씩 따로 달고 있어서 호스트 쪽 왕복이 그만큼 늘었다 → 종류별로 하나만 달고 안에서 순서대로 나눠 부른다.
// 각 처리기는 예전처럼 (text) → text 를 돌려주고, 앞 처리기의 결과가 다음 처리기로 넘어간다(등록한 순서). 예외는 그 처리기만 건너뛴다.
const TYPES = new Set(["input", "output", "display"]);

export function createHookBus(raw, { log = (...a) => console.log("[Dusk Atelier]", ...a) } = {}) {
  const lists = { input: [], output: [], display: [] };
  const real = { input: null, output: null, display: null };   // 호스트에 실제로 단 처리기(없으면 null)
  const pending = {};                                          // 첫 등록 진행 중인 약속

  const makeReal = (type) => async (text, ...rest) => {
    let cur = text;
    for (const fn of [...lists[type]]) {
      try {
        let r = fn(cur, ...rest);
        if (r && typeof r.then === "function") r = await r;
        if (r !== undefined && r !== null) cur = r;
      } catch (e) { log(`${type} 훅 처리 중 오류`, e?.message ?? e); }
    }
    return cur;
  };

  async function add(type, fn, ...opts) {
    if (!TYPES.has(type)) return raw.addRisuScriptHandler(type, fn, ...opts);
    if (typeof fn !== "function") throw new TypeError("handler must be a function");
    if (!lists[type].includes(fn)) lists[type].push(fn);
    try {
      if (!real[type]) {
        pending[type] ??= (async () => { const h = makeReal(type); await raw.addRisuScriptHandler(type, h); real[type] = h; })();
        await pending[type];
      }
    } catch (e) {   // 호스트가 훅을 못 달면 등록한 쪽이 예전처럼 오류를 받는다
      lists[type] = lists[type].filter((x) => x !== fn);
      pending[type] = null;
      throw e;
    }
    pending[type] = null;
  }

  async function remove(type, fn, ...opts) {
    if (!TYPES.has(type)) return raw.removeRisuScriptHandler(type, fn, ...opts);
    lists[type] = lists[type].filter((x) => x !== fn);
    if (!lists[type].length && real[type]) {
      const h = real[type]; real[type] = null;
      try { await raw.removeRisuScriptHandler(type, h); } catch { /* 이미 없으면 그대로 */ }
    }
  }
  return { add, remove, count: (t) => lists[t]?.length ?? 0 };
}
