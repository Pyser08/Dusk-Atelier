// 에셋 제작 — 되돌리기/다시하기 기록. 순수. 바꾸기 직전 상태를 쌓고, mergeMs 안에 잇따른 바꿈(글자 입력 등)은 하나로 묶는다.
export function createHistory({ limit = 60, mergeMs = 700, now = () => Date.now() } = {}) {
  let back = [], fwd = [], last = -Infinity;
  return {
    push(prev) {
      const t = now();
      if (t - last > mergeMs || !back.length) { back.push(prev); if (back.length > limit) back.shift(); }
      last = t;
      fwd = [];
    },
    undo(cur) { if (!back.length) return null; fwd.push(cur); last = -Infinity; return back.pop(); },
    redo(cur) { if (!fwd.length) return null; back.push(cur); last = -Infinity; return fwd.pop(); },
    canUndo: () => back.length > 0,
    canRedo: () => fwd.length > 0,
    clear() { back = []; fwd = []; last = -Infinity; }
  };
}
