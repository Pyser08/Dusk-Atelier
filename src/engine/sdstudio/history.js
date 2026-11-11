// 에셋 제작 — 되돌리기/다시하기 기록. 순수. 바꾸기 직전 상태를 쌓는다.
// 글자 입력(typing)이 mergeMs 안에 잇따르면 하나로 묶고, 버튼 동작은 아무리 빨라도 따로 쌓는다.
export function createHistory({ limit = 60, mergeMs = 700, now = () => Date.now() } = {}) {
  let back = [], fwd = [], last = -Infinity, lastTyping = false;
  return {
    push(prev, { typing = false } = {}) {
      const t = now();
      if (!(typing && lastTyping && t - last <= mergeMs && back.length)) { back.push(prev); if (back.length > limit) back.shift(); }
      last = t; lastTyping = typing;
      fwd = [];
    },
    undo(cur) { if (!back.length) return null; fwd.push(cur); lastTyping = false; return back.pop(); },
    redo(cur) { if (!fwd.length) return null; back.push(cur); lastTyping = false; return fwd.pop(); },
    canUndo: () => back.length > 0,
    canRedo: () => fwd.length > 0,
    clear() { back = []; fwd = []; last = -Infinity; lastTyping = false; }
  };
}
