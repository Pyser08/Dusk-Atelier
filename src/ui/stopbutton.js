// 보조 모델로 장기 기억을 쓰는 동안 리스 화면 오른쪽 아래에 띄우는 작은 '중지' 버튼.
// 리스 샌드박스: x- 속성만 쓸 수 있고 내용은 DOMPurify를 거친다 → 인라인 style로만 꾸민다(toast.js와 같은 방식).
const BOX = "position:fixed;right:14px;bottom:88px;z-index:2147482000;display:flex;align-items:center;gap:8px;padding:7px 12px 7px 10px;border-radius:999px;background:#1d1b33;border:1px solid rgba(124,92,240,.55);box-shadow:0 6px 20px rgba(0,0,0,.45);color:#e7e3ff;font:600 12px/1 system-ui,sans-serif;cursor:pointer;opacity:0;transition:opacity .2s";
const HTML = '<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#ff6b8b"></span><span>기억 작성 중 · 중지</span>';

export function createStopButton(getDoc, onStop) {
  let el = null, busy = false, want = false;
  async function sync() {
    if (busy) return; busy = true;
    try {
      while (true) {
        const target = want;
        if (target && !el) {
          const doc = getDoc(); if (!doc) break;
          const body = await doc.querySelector("body"); if (!body) break;
          const box = await doc.createElement("div");
          await Promise.all([box.setAttribute("x-dusk", "stopbtn"), box.setStyleAttribute(BOX), box.setInnerHTML(HTML), box.addEventListener("click", () => { try { onStop?.(); } catch { /* 없음 */ } })]);
          await body.appendChild(box); el = box;
          setTimeout(() => { box.setStyleAttribute(BOX.replace("opacity:0", "opacity:1")).catch(() => {}); }, 30);
        } else if (!target && el) {
          const e = el; el = null;
          try { await e.remove(); } catch { /* 이미 없음 */ }
        }
        if (want === target) break;   // 그 사이 상태가 바뀌었으면 한 번 더
      }
    } catch { el = null; }
    finally { busy = false; }
  }
  return { set(active) { want = !!active; return sync(); }, shown: () => !!el };
}
