// 장기기억 애드온: 화면 표시 훅은 글만 받아 유저 입력인지 모른다(11-21 제보: 장면 상태창이 유저 입력에도 붙음).
// 채팅의 유저 메시지 글을 모아 두고, 표시할 글이 그중 하나인지 본다(공백·줄바꿈 차이는 무시, 앞 40자로 비교).
const norm = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, "");
const isUserRole = (r) => ["user", "human"].includes(String(r ?? "").toLowerCase());
export function userTexts(messages, { last = 80 } = {}) {
  const out = new Set();
  for (const m of (Array.isArray(messages) ? messages : []).slice(-last)) if (isUserRole(m?.role)) { const n = norm(m.data ?? m.content ?? ""); if (n.length >= 8) out.add(n); }
  return out;
}
export function isUserText(set, text) {
  if (!set?.size) return false;
  const n = norm(text); if (n.length < 8) return false;
  if (set.has(n)) return true;
  if (n.length < 20) return false;
  const head = n.slice(0, 40);
  for (const u of set) if (u.length >= 20 && (u.startsWith(head) || n.startsWith(u.slice(0, 40)))) return true;
  return false;
}
