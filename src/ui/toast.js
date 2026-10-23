// 리스 메인 화면 오른쪽 위에 띄우는 알림 (메인 화면 접근 권한이 있을 때만)
// 리스 샌드박스: x- 속성만 쓸 수 있고, 내용은 DOMPurify를 거친다 → 인라인 style로만 꾸민다.
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var BOX = "position:fixed;top:16px;right:16px;z-index:2147483000;width:340px;max-width:calc(100vw - 32px);display:flex;align-items:stretch;border-radius:14px;background:linear-gradient(135deg,#1b1930,#221f3a);border:1px solid #4b4580;box-shadow:0 12px 36px rgba(0,0,0,.5),0 0 0 1px rgba(124,92,240,.25);color:#ecebf6;font:14px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;transition:opacity .25s,transform .25s;opacity:0;transform:translateY(-8px)";

export function createHostToast(getDoc) {
  let el = null, timer = null;
  async function close() {
    clearTimeout(timer);
    const e = el;
    el = null;
    if (!e) return;
    try {
      await e.setStyle("opacity", "0");
      setTimeout(() => e.remove().catch(() => {
      }), 260);
    } catch {
    }
  }
  return {
    /** 띄웠으면 true (권한이 없으면 false → 대신 창을 띄운다) */
    async show({ title, text, action = "눌러서 고르기", onClick, ms = 45e3 }) {
      const doc = getDoc();
      if (!doc) return false;
      try {
        await close();
        const body = await doc.querySelector("body");
        if (!body) return false;
        // 메인 화면 호출은 하나하나가 왕복이라, 서로 상관없는 것은 한꺼번에 보낸다
        const [box, main, x] = await Promise.all([doc.createElement("div"), doc.createElement("div"), doc.createElement("div")]);
        await Promise.all([
          box.setAttribute("x-dusk", "toast"),
          box.setStyleAttribute(BOX),
          main.setStyleAttribute("flex:1;min-width:0;display:flex;gap:12px;align-items:center;padding:14px 4px 14px 16px;cursor:pointer"),
          x.setStyleAttribute("flex:none;width:36px;display:flex;align-items:flex-start;justify-content:center;padding-top:10px;cursor:pointer;color:#9d99c1;font-size:18px"),
          x.setInnerText("×"),
          main.setInnerHTML(`<span style="flex:none;display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:10px;background:linear-gradient(135deg,#4f7cf7,#7c5cf0);font-size:17px">🔗</span><span style="flex:1;min-width:0"><b style="display:block;font-size:14px;color:#ffffff">${esc(title)}</b><span style="display:block;font-size:13px;color:#b1aecb;word-break:keep-all">${esc(text)}</span><span style="display:block;margin-top:4px;font-size:12px;font-weight:700;color:#c4b1ff">${esc(action)} →</span></span>`),
          main.addEventListener("click", () => {
            close();
            onClick?.();
          }),
          x.addEventListener("click", () => close())
        ]);
        await Promise.all([box.appendChild(main), box.appendChild(x)]);
        await body.appendChild(box);
        el = box;
        setTimeout(() => {
          box.setStyleAttribute(BOX.replace("opacity:0;transform:translateY(-8px)", "opacity:1;transform:none")).catch(() => {
          });
        }, 30);
        timer = setTimeout(close, ms);
        return true;
      } catch {
        el = null;
        return false;
      }
    },
    close
  };
}
