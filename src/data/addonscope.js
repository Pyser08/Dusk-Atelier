// 애드온마다 따로 쓰는 api: 애드온이 호스트에 단 훅(요청·스크립트·채팅 리스너)을 기록해 두었다가 끌 때 모두 뗀다.
// 그래서 훅이 있는 애드온(장기기억·Erosync·프로바이더)도 새로고침 없이 바로 새 버전으로 갈아 끼울 수 있다.
// 프로바이더는 호스트에서 뺄 방법이 없어서, 이름마다 한 번만 호스트에 달고 안에서 지금 처리기로 넘겨 준다(providerRelay).
const PAIRS = [["addRisuReplacer", "removeRisuReplacer"], ["addRisuScriptHandler", "removeRisuScriptHandler"], ["addRisuChatListener", "removeRisuChatListener"]];

// 애드온 api 사본의 원본: api를 열쇠로 쓰는 표(저장 잠금·모델 설정 캐시)가 코어와 애드온에서 같은 칸을 쓰게
export const BASE = Symbol.for("dusk.baseApi");
export const baseApi = (api) => api?.[BASE] ?? api;

export function createProviderRelay(api) {
  const current = new Map(), hosted = new Map();   // 이름 → 지금 처리기 / 호스트 등록 약속
  async function add(name, fn, opts) {
    if (typeof api.addProvider !== "function") throw new Error("addProvider가 없어요");
    current.set(name, fn);
    if (!hosted.has(name)) {
      const p = Promise.resolve(api.addProvider(name, async (...a) => {
        const f = current.get(name);
        if (!f) throw new Error(`‘${name}’ 프로바이더가 꺼져 있어요. Dusk 애드온에서 프로바이더를 켜 주세요.`);
        return f(...a);
      }, opts));
      hosted.set(name, p);
      try { await p; } catch (e) { hosted.delete(name); current.delete(name); throw e; }
    } else await hosted.get(name);
  }
  return { add, drop: (name, fn) => { if (!fn || current.get(name) === fn) current.delete(name); }, has: (name) => current.has(name) };
}

export function scopeApi(api, relay) {
  const live = [];   // [remove 이름, 인자들]
  const provs = [];  // [이름, 처리기]
  const wrapped = {};
  for (const [add, rem] of PAIRS) {
    wrapped[add] = async (...a) => { const r = await api[add](...a); live.push([rem, a]); return r; };
    wrapped[rem] = async (...a) => {
      const i = live.findIndex(([n, b]) => n === rem && b[0] === a[0] && b[1] === a[1]);
      if (i >= 0) live.splice(i, 1);
      return api[rem]?.(...a);
    };
  }
  if (relay) wrapped.addProvider = async (name, fn, opts) => { await relay.add(name, fn, opts); provs.push([name, fn]); };
  const scoped = new Proxy(api, {
    get: (t, k) => (k === BASE ? (t[BASE] ?? t) : typeof k === "string" && k in wrapped && typeof t[k] === "function" ? wrapped[k] : Reflect.get(t, k)),
    set: (t, k, v) => Reflect.set(t, k, v),   // 스텔스처럼 api 함수를 감싸 바꾸는 건 모두가 쓰는 원본에 그대로
    has: (t, k) => Reflect.has(t, k)
  });
  async function cleanup() {
    for (const [rem, a] of live.splice(0).reverse()) { try { await api[rem]?.(...a); } catch { /* 이미 떨어짐 */ } }
    for (const [name, fn] of provs.splice(0)) relay?.drop(name, fn);
  }
  return { api: scoped, cleanup, count: () => live.length + provs.length };
}
