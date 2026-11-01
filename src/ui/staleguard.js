// 화면 그리기 경쟁 방지(v1.8.1): 탭 A를 불러오는 중에 탭 B로 가면, 늦게 끝난 A의 그리기가 B 화면을 덮어쓰던 문제.
// render()마다 번호표를 받고, 번호가 낡은 화면이 main을 바꾸려 하면 조용히 무시한다(읽기·검색은 그대로 된다).
const MUTATORS = new Set(["replaceChildren", "append", "appendChild", "prepend", "insertBefore", "removeChild", "replaceChild", "insertAdjacentElement", "insertAdjacentHTML", "insertAdjacentText", "replaceWith", "remove"]);

export function guardMain(main, isStale) {
  return new Proxy(main, {
    get(t, k) {
      const v = Reflect.get(t, k, t);
      return typeof v === "function" ? (...a) => (isStale() && MUTATORS.has(k) ? undefined : v.apply(t, a)) : v;
    },
    set(t, k, v) {
      if (isStale() && (k === "innerHTML" || k === "textContent")) return true;
      t[k] = v;
      return true;
    }
  });
}

// ctx.main만 보호된 main으로 바꾼 ctx. 나머지는 그대로 통과(쓰기 포함).
export const scopeCtx = (ctx, main, isStale) => {
  const guarded = guardMain(main, isStale);
  return new Proxy(ctx, { get: (t, k) => (k === "main" ? guarded : Reflect.get(t, k, t)) });
};
