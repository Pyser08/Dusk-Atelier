// 애드온 자리 자동 넣기: 애드온이 코어를 고치지 않고 Dusk 화면 어디든 부품을 넣는다.
// place(대상, render, { position }) — 대상은 아래 PLACES의 이름이나 CSS 선택자.
// 화면이 다시 그려져 대상이 새로 생기면 알아서 다시 넣고, 되돌리기 함수를 부르면 넣은 것을 모두 뗀다.
// 코어 화면이 바뀌어 선택자가 달라지면 여기 PLACES만 고치면 된다(애드온은 이름으로 부르므로 그대로).
//   position: "end"(대상 안 맨 아래, 기본) · "start"(안 맨 위) · "before"(대상 앞) · "after"(대상 뒤)
//   render(ctx, target) → Node | null
export const PLACES = {
  "home.quickset": { sel: ".rb-hqs .rb-story-helper", position: "end" },   // 홈 빠른 설정 카드
  "home.top": { sel: ".rb-home .rb-hfocus", position: "after" },          // 홈 맨 위(지금 열린 채팅 줄 아래)
  "home.foot": { sel: ".rb-home .rb-home-foot", position: "before" },     // 홈 맨 아래
  "settings.top": { sel: ".rb-set2 .rb-mem2-main > header", position: "after" },   // 설정 탭 제목 아래
  "settings.end": { sel: ".rb-set2 .rb-mem2-main", position: "end" }                // 설정 탭 맨 아래
};
export const POSITIONS = ["end", "start", "before", "after"];

export function resolvePlace(target, position) {
  const named = typeof target === "string" ? PLACES[target] : null;
  const sel = named ? named.sel : typeof target === "string" ? target : target?.selector;
  if (!sel || typeof sel !== "string") throw new Error("place: 대상(자리 이름이나 CSS 선택자)이 필요해요");
  const pos = position ?? named?.position ?? "end";
  if (!POSITIONS.includes(pos)) throw new Error(`place: position은 ${POSITIONS.join("·")} 중 하나예요`);
  return { sel, position: pos };
}

export function createPlacer({ root = () => globalThis.document?.body, ctx = () => null, log = () => {} } = {}) {
  const regs = new Map();   // id → { sel, position, render, nodes: Map<target, node> }
  let seq = 0, mo = null, queued = false, scanning = false;
  const insert = (t, node, pos) => {
    if (pos === "start") t.prepend(node);
    else if (pos === "before") t.before(node);
    else if (pos === "after") t.after(node);
    else t.append(node);
  };
  function scan() {
    const r0 = root();
    if (!r0 || scanning) return;
    scanning = true;
    try {
      for (const r of regs.values()) {
        let list = [];
        try { list = [...r0.querySelectorAll(r.sel)]; } catch { continue; }   // 잘못된 선택자
        for (const [t, n] of r.nodes) if (!t.isConnected) { n.remove(); r.nodes.delete(t); }
        for (const t of list) {
          const old = r.nodes.get(t);
          if (old?.isConnected) continue;
          let node = null;
          try { node = r.render(ctx(), t); } catch (e) { log(`애드온 부품 오류 ${e?.message ?? e}`); }
          if (!node) continue;
          if (node.dataset) node.dataset.duskPlace = r.key;
          insert(t, node, r.position);
          r.nodes.set(t, node);
        }
      }
    } finally { scanning = false; }
  }
  const schedule = () => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; scan(); }); };
  function watch() {
    if (mo || typeof MutationObserver !== "function") return;
    const r0 = root();
    if (!r0) return;
    mo = new MutationObserver(schedule);
    mo.observe(r0, { childList: true, subtree: true });
  }
  return {
    place(target, render, { position, key } = {}) {
      if (typeof render !== "function") throw new Error("place: render 함수가 필요해요");
      const id = ++seq, at = resolvePlace(target, position);
      regs.set(id, { ...at, render, key: String(key ?? (typeof target === "string" ? target : "custom")), nodes: new Map() });
      watch();
      scan();
      return () => {
        const r = regs.get(id);
        if (!r) return;
        regs.delete(id);
        for (const n of r.nodes.values()) n.remove();
        if (!regs.size && mo) { mo.disconnect(); mo = null; }
      };
    },
    // 지금 넣은 부품을 모두 새로 그린다(설정이 바뀌어 모양을 바꿀 때)
    refresh() { for (const r of regs.values()) { for (const n of r.nodes.values()) n.remove(); r.nodes.clear(); } scan(); },
    scan,
    size: () => regs.size
  };
}
