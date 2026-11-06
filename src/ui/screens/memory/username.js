// 기억 화면에서 {{user}}를 지금 페르소나 이름으로 보여 준다(1.8.3, 사용자 요청). 표시만 바꾸고 저장된 데이터는 그대로.
// 이름 뒤 조사(와/과·이/가·은/는·을/를)는 받침에 맞춰 고친다. 이름을 모르면 '나'.
import { loadPrimaryUserName } from "../../../data/usernames.js";

let NAME = "";
export const setUserName = (n) => { NAME = String(n ?? "").trim(); };
export const userLabel = () => NAME || "나";
const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
const PAIRS = { 와: ["과", "와"], 과: ["과", "와"], 이: ["이", "가"], 가: ["이", "가"], 은: ["은", "는"], 는: ["은", "는"], 을: ["을", "를"], 를: ["을", "를"] };
export function userText(s) {
  const name = userLabel(), b = hasBatchim(name);
  return String(s ?? "").replace(/\{\{user\}\}(와|과|이|가|은|는|을|를)?/gi, (_, p) => name + (p ? PAIRS[p][b ? 0 : 1] : ""));
}
export async function loadUserName(ctx) {
  try { setUserName(await loadPrimaryUserName(ctx.api)); } catch { /* 이름 없이 '나' */ }
  return userLabel();
}
// 화면 조각 안의 글자를 바꾼다(입력칸·편집 영역은 건드리지 않음 — 저장 값이 바뀌면 안 되니까). 부분 갱신도 따라가게 지켜본다.
const SKIP = new Set(["INPUT", "TEXTAREA", "SELECT", "OPTION", "SCRIPT", "STYLE"]);
function fix(node) {
  if (node.nodeType === 3) { if (node.nodeValue.includes("{{")) { const p = node.parentElement; if (!p || SKIP.has(p.tagName) || p.isContentEditable) return; const t = userText(node.nodeValue); if (t !== node.nodeValue) node.nodeValue = t; } return; }
  if (node.nodeType !== 1 || SKIP.has(node.tagName) || node.isContentEditable) return;
  const doc = node.ownerDocument, w = doc.createTreeWalker(node, 4);
  const list = []; while (w.nextNode()) if (w.currentNode.nodeValue.includes("{{")) list.push(w.currentNode);
  for (const t of list) fix(t);
}
export function watchUserName(host) {
  fix(host);
  const MO = host.ownerDocument?.defaultView?.MutationObserver;
  if (!MO) return null;
  const mo = new MO((muts) => { for (const m of muts) { if (m.type === "characterData") fix(m.target); else m.addedNodes.forEach(fix); } });
  mo.observe(host, { childList: true, subtree: true, characterData: true });
  return mo;
}
