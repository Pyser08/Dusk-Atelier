// 이름 클릭 → 화면 위 캐릭터 상태창(리스 SafeDocument 흉내: x- 속성만, 메시지 class는 x-risu- 접두)
import { createCardOverlay } from "../../src/data/cardoverlay.js";
import { linkNames } from "../../src/engine/namecard.js";
const wrap = (n) => n && {
  _n: n,
  querySelector: async (s) => wrap(n.querySelector(s)), querySelectorAll: async (s) => [...n.querySelectorAll(s)].map(wrap),
  setAttribute: async (k, v) => { if (!/^x-/.test(k)) throw new Error("x- only"); n.setAttribute(k, v); }, appendChild: async (c) => n.appendChild(c._n),
  createElement: async (t) => wrap(document.createElement(t)), setInnerText: async (t) => { n.innerText = t; }, remove: async () => n.remove(),
  setStyleAttribute: async (s) => n.setAttribute("style", s),
  addEventListener: async (t, f) => { n.addEventListener(t, (e) => f({ key: e.key })); return 1; }
};
// 리스 표시 새니타이즈 흉내: class → x-risu-class
const risuize = (html) => html.replace(/class="([^"]*)"/g, (_, c) => `class="${c.split(/\s+/).map((x) => "x-risu-" + x).join(" ")}"`);
window.run = async (pid) => {
  const people = [{ id: pid, names: ["시로코"], html: "<b>시로코 카드</b>" }];
  const html = risuize(linkNames("오늘 시로코가 웃었다.", people, { overlay: true }));
  const msg = document.createElement("div"); msg.className = "chat-message"; msg.innerHTML = html; document.body.appendChild(msg);
  window.ov = createCardOverlay({ ensureDoc: async () => wrap(document), pids: () => [pid], cardOf: async () => "<b>시로코 카드</b>", log: (...a) => (window.__log ??= []).push(a.join(" ")) });
  return { html, hooked: await ov.hook() };
};
