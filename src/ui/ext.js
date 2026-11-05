// 애드온이 코어 화면에 끼어드는 자리(2.0.0). 애드온이 없으면 아무것도 등록되지 않아 코어에 흔적이 안 남는다.
// - screen  "탭/하위" → (ctx) => 화면 그리기      예: ext.add("screen", "tools/chattheme", renderChatTheme)
// - row     "자리"    → { id, icon, title, desc, onClick(ctx), order? }  목록 한 줄(도구 탭 등)
// - slot    "자리"    → (ctx) => Node | null       화면 안 정해진 자리에 끼울 부품
// add()는 되돌리기 함수를 돌려준다(애드온 끌 때 부름). 바뀌면 onChange(화면 다시 그리기).
export function createExt(onChange = () => {}) {
  const reg = new Map();   // "kind|key" → [{ id, val }]
  let seq = 0, queued = false;
  const changed = () => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; try { onChange(); } catch { /* 화면 오류 무시 */ } }); };
  const bucket = (kind, key) => { const k = `${kind}|${key}`; if (!reg.has(k)) reg.set(k, []); return reg.get(k); };
  return {
    add(kind, key, val) {
      const id = ++seq;
      bucket(kind, key).push({ id, val });
      changed();
      return () => { const b = bucket(kind, key), i = b.findIndex((x) => x.id === id); if (i >= 0) { b.splice(i, 1); changed(); } };
    },
    get: (kind, key) => bucket(kind, key).at(-1)?.val,
    list: (kind, key) => bucket(kind, key).map((x) => x.val).sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0)),
    has: (kind, key) => bucket(kind, key).length > 0,
    // slot 부품 모두 그리기(하나가 터져도 나머지는 그림)
    render(kind, key, ctx) { const out = []; for (const f of this.list(kind, key)) { try { const n = f(ctx); if (n) out.push(n); } catch (e) { console.log("[Dusk Atelier] 애드온 부품 오류", key, e?.message ?? e); } } return out; }
  };
}
