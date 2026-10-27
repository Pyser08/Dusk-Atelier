// 말풍선 도움말: 마우스를 올리면(0.4초), 모바일은 길게 누르면(0.5초) title 글자를 보여 준다.
import { h } from './dom.js';

var SEL = "[title],[data-tip],.rb-icon-btn[aria-label]";
export function installTooltips(root) {
  let tip = null, timer = 0, target = null, longAt = 0, sx = 0, sy = 0;
  const textOf = (el) => el.dataset.tip || el.getAttribute("title") || el.getAttribute("aria-label") || "";
  const hide = () => {
    clearTimeout(timer);
    timer = 0;
    tip?.remove();
    tip = null;
    if (target?.dataset.tip && !target.getAttribute("title")) target.setAttribute("title", target.dataset.tip);
    if (target) delete target.dataset.tip;
    target = null;
  };
  const show = (el) => {
    const text = textOf(el);
    if (!text || !el.isConnected) return;
    hide();
    target = el;
    el.dataset.tip = text;
    el.removeAttribute("title");
    tip = h("div", { class: "rb-tip", role: "tooltip" }, text);
    root.appendChild(tip);
    const r = el.getBoundingClientRect(), t = tip.getBoundingClientRect(), vw = root.ownerDocument.documentElement.clientWidth || 1e3;
    const left = Math.max(8, Math.min(vw - t.width - 8, r.left + r.width / 2 - t.width / 2));
    const below = r.bottom + 8 + t.height < (root.ownerDocument.documentElement.clientHeight || 1e3);
    tip.style.left = `${left}px`;
    tip.style.top = `${below ? r.bottom + 8 : Math.max(8, r.top - t.height - 8)}px`;
  };
  const arm = (el, ms) => {
    clearTimeout(timer);
    timer = setTimeout(() => show(el), ms);
  };
  const at = (e) => (e.target instanceof Element ? e.target.closest(SEL) : null);
  root.addEventListener("mouseover", (e) => {
    const el = at(e);
    if (el && el !== target && !(tip && tip.contains(el))) arm(el, 400);
  });
  root.addEventListener("mouseout", (e) => {
    const el = at(e);
    if (el && !el.contains(e.relatedTarget)) hide();
  });
  root.addEventListener("focusin", (e) => {
    const el = at(e);
    if (el && el.matches(":focus-visible")) arm(el, 400);
  });
  root.addEventListener("focusout", hide);
  root.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return hide();
    const el = at(e);
    if (!el) return;
    sx = e.clientX;
    sy = e.clientY;
    clearTimeout(timer);
    timer = setTimeout(() => {
      show(el);
      longAt = Date.now();
      setTimeout(hide, 2400);
    }, 500);
  });
  root.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" && timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) {
      clearTimeout(timer);
      timer = 0;
    }
  });
  const cancel = (e) => {
    if (e.pointerType === "touch" && timer) {
      clearTimeout(timer);
      timer = 0;
    }
  };
  root.addEventListener("pointerup", cancel);
  root.addEventListener("pointercancel", cancel);
  // 길게 눌러서 말풍선이 떴다면, 손을 뗄 때 생기는 클릭은 막는다.
  root.addEventListener("click", (e) => {
    if (longAt && Date.now() - longAt < 700) {
      e.stopPropagation();
      e.preventDefault();
    }
    longAt = 0;
  }, true);
  root.addEventListener("scroll", hide, true);
  root.ownerDocument.addEventListener("keydown", (e) => e.key === "Escape" && hide(), true);
}
