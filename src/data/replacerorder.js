// 요청 훅(addRisuReplacer) 등록 알림 (2.1.4).
// 리스는 beforeRequest 훅을 등록한 순서대로 부른다. '모델 호출 표시'는 최종 프롬프트를 세야 하므로,
// 다른 훅(장기 기억 애드온 등)이 나중에 붙으면 알려 줘서 맨 뒤로 다시 붙을 수 있게 한다.
export function createReplacerWatch(raw) {
  const subs = new Set();
  async function add(type, fn, ...rest) {
    const r = await raw.addRisuReplacer(type, fn, ...rest);
    for (const cb of [...subs]) { try { cb(type, fn); } catch { /* 알림 오류는 등록을 막지 않는다 */ } }
    return r;
  }
  const onAdded = (cb) => { subs.add(cb); return () => subs.delete(cb); };
  return { add, onAdded };
}
