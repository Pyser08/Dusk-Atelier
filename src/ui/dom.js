export function h(tag, props, ...children) {
  const el = tag === "svg" || props?.svg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === void 0 || v === null || v === false || k === "svg") continue;
      if (k === "class") el.setAttribute("class", Array.isArray(v) ? v.filter(Boolean).join(" ") : v);
      else if (k === "style") {
        if (typeof v === "string") el.style.cssText = v;
        else for (const [sk, sv] of Object.entries(v)) {
          if (sv === void 0 || sv === null) continue;
          if (sk.startsWith("--")) el.style.setProperty(sk, sv);
          else el.style[sk] = sv;
        }
      } else if (k === "ref") v(el);
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k === "onKeyDown" && typeof v === "function" && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) el.addEventListener("keydown", (e) => { if (e.isComposing || e.keyCode === 229) return; v(e); });   // 조합 중 Enter가 저장·전송으로 처리되지 않게
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "value" && "value" in el) el.value = v;
      else if (k === "checked" && "checked" in el) el.checked = !!v;
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}
// 2.2.2 한글(천지인 등) 입력: 플러그인 화면 전체에서, 조합 중인 input 이벤트는 위에서 붙잡아 입력칸까지 내려보내지 않고
// 조합이 끝나면 input을 한 번 다시 보낸다. 조합 중 처리 함수가 화면을 다시 그리거나 값을 다시 넣으면 첫 글자들이 낱자로 끊겼다
// (원격 접속 모바일에서 특히 잘 보임). 입력칸을 어떤 방식으로 만들었든 모두 적용된다.
export function installImeGuard(root) {
  if (!root || root.__duskIme) return; root.__duskIme = true;
  const editable = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  const composing = new WeakSet();
  root.addEventListener("compositionstart", (e) => { if (editable(e.target)) composing.add(e.target); }, true);
  root.addEventListener("compositionend", (e) => {
    const t = e.target; if (!editable(t) || !composing.has(t)) return;
    composing.delete(t);
    setTimeout(() => { try { t.dispatchEvent(new Event("input", { bubbles: true })); } catch { /* 이미 사라진 칸 */ } }, 0);
  }, true);
  root.addEventListener("input", (e) => { if (editable(e.target) && (e.isComposing || composing.has(e.target))) e.stopImmediatePropagation(); }, true);
}
function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === void 0 || c === false || c === true) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
function clear(el) {
  // 지운 자식이 그대로면(낡은 화면 보호 staleguard가 removeChild를 무시한 경우) 멈춘다 — 안 그러면 무한 반복으로 창이 얼어붙음(2.2.0)
  let n;
  while ((n = el.firstChild)) { el.removeChild(n); if (el.firstChild === n) break; }
  return el;
}
// 같은 화면을 다시 그릴 때(설정 바꾸기 등) 스크롤 위치를 지켜 '창을 다시 불러온' 듯 튀지 않게 한다.
// data-keep-scroll이 붙은 곳(메인 영역)에서, 새 첫 자식의 화면 표시(data-page 또는 class)가 이전과 같을 때만.
const sig = (n) => n && n.nodeType === 1 ? (n.getAttribute("data-page") || n.getAttribute("class") || n.tagName) : "";
function scrollState(el) {
  const list = [el, ...el.querySelectorAll(".rb-scroll,[data-keep-scroll-item]")];
  return list.map((n) => [n.scrollTop, n.scrollLeft]);
}
function restoreScroll(el, st) {
  const apply = () => { const list = [el, ...el.querySelectorAll(".rb-scroll,[data-keep-scroll-item]")]; st.forEach(([t, l], i) => { const n = list[i]; if (n && (t || l)) { n.scrollTop = t; n.scrollLeft = l; } }); };
  apply();
  try { requestAnimationFrame(apply); } catch { /* 테스트 환경 */ }
}
export function replace(el, ...children) {
  if (!el?.hasAttribute?.("data-keep-scroll")) { clear(el); return append(el, children); }
  const view = el.getAttribute("data-view") || "";
  if (el.__keep && el.__keep.view !== view) el.__keep = null;
  const old = sig(el.firstElementChild), st = scrollState(el);
  if (st.some(([t, l]) => t || l)) el.__keep = { view, sig: old, st };   // 불러오는 중 화면을 거쳐도 마지막 위치를 기억
  else if (el.__keep?.sig === old) el.__keep = null;
  clear(el);
  const out = append(el, children);
  const k = el.__keep;
  if (k && k.view === view && k.sig === sig(el.firstElementChild)) restoreScroll(el, k.st);
  return out;
}
var tpl = typeof document !== "undefined" ? document.createElement("template") : null;
export function svgFrom(markup) {
  tpl.innerHTML = markup.trim();
  return tpl.content.firstChild;
}
export var fmtBytes = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + " GB" : n >= 1e6 ? (n / 1e6).toFixed(1) + " MB" : n >= 1e3 ? (n / 1e3).toFixed(0) + " KB" : (n ?? 0) + " B";
export function fmtWhen(t, now = Date.now()) {
  const d = new Date(t), n = new Date(now);
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (d.toDateString() === n.toDateString()) return `오늘 ${hm}`;
  const y = new Date(n);
  y.setDate(n.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `어제 ${hm}`;
  return d.getFullYear() === n.getFullYear() ? `${d.getMonth() + 1}월 ${d.getDate()}일` : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
export function download(name, blobOrText, type = "application/octet-stream") {
  const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3e4);
}
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
export function pickFiles({ accept = "", multiple = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = "none";
    input.addEventListener("change", () => {
      resolve([...input.files ?? []]);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}
// ── 움직임 ── 빠르고 짧게. 움직임 줄이기 설정이면 건너뛴다.
export var EASE = "cubic-bezier(.2,.7,.2,1)";
export function reduceMotion() {
  try {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
export function motion(el, frames, opts = {}) {
  if (!el?.animate || reduceMotion()) return null;
  try {
    return el.animate(frames, { duration: 160, easing: EASE, ...opts });
  } catch {
    return null;
  }
}
export var fadeUp = (el, opts) => motion(el, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], opts);
// 줄을 접으며 사라지게 한다 (지우기 전에). 끝나면 resolve.
export function vanish(el, ms = 170) {
  if (!el?.isConnected) return Promise.resolve();
  const hgt = el.offsetHeight;
  const a = motion(el, [
    { opacity: 1, height: `${hgt}px`, transform: "none" },
    { opacity: 0, height: "0px", paddingTop: "0px", paddingBottom: "0px", marginTop: "0px", marginBottom: "0px", transform: "translateX(-8px)" }
  ], { duration: ms, fill: "forwards" });
  if (!a) return Promise.resolve();
  el.style.overflow = "hidden";
  return a.finished.catch(() => {
  });
}
