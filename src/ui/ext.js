// 애드온이 코어 화면에 끼어드는 자리(2.0.0). 애드온이 없으면 아무것도 등록되지 않아 코어에 흔적이 안 남는다.
// - screen  "탭/하위" → (ctx) => 화면 그리기      예: ext.add("screen", "tools/chattheme", renderChatTheme)
// - row     "자리"    → { id, icon, title, desc, onClick(ctx), order? }  목록 한 줄(도구 탭 등)
// - slot    "자리"    → (ctx) => Node | null       화면 안 정해진 자리에 끼울 부품
// add()는 되돌리기 함수를 돌려준다(애드온 끌 때 부름).
// 바뀌면 onChange — 단, 지금 화면이 그 자리를 읽었을 때만(beginRender() 뒤에 읽힌 자리). 다른 화면(예: 설정에서 애드온 켜고 끄기)은 다시 그리지 않는다.
export function createExt(onChange = () => {}) {
  const reg = new Map();   // "kind|key" → [{ id, val }]
  let seq = 0, queued = false, read = new Set(), dirty = new Set();
  const changed = (k) => {
    dirty.add(k);
    if (queued) return; queued = true;
    queueMicrotask(() => { queued = false; const hit = [...dirty].some((x) => read.has(x)); dirty = new Set(); if (hit) { try { onChange(); } catch { /* 화면 오류 무시 */ } } });
  };
  const bucket = (kind, key, mark = true) => { const k = `${kind}|${key}`; if (mark) read.add(k); if (!reg.has(k)) reg.set(k, []); return reg.get(k); };
  return {
    beginRender() { read = new Set(); },   // 앱이 화면을 새로 그리기 직전에 부른다
    add(kind, key, val) {
      const id = ++seq;
      bucket(kind, key, false).push({ id, val });
      changed(`${kind}|${key}`);
      return () => { const b = bucket(kind, key, false), i = b.findIndex((x) => x.id === id); if (i >= 0) { b.splice(i, 1); changed(`${kind}|${key}`); } };
    },
    get: (kind, key) => bucket(kind, key).at(-1)?.val,
    list: (kind, key) => bucket(kind, key).map((x) => x.val).sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0)),
    has: (kind, key) => bucket(kind, key).length > 0,
    // slot 부품 모두 그리기(하나가 터져도 나머지는 그림)
    render(kind, key, ctx) { const out = []; for (const f of this.list(kind, key)) { try { const n = f(ctx); if (n) out.push(n); } catch (e) { console.log("[Dusk Atelier] 애드온 부품 오류", key, e?.message ?? e); } } return out; }
  };
}
