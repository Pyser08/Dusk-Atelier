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
function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === void 0 || c === false || c === true) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}
export function replace(el, ...children) {
  clear(el);
  return append(el, children);
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
