// 채팅 기억 폴더 키 규칙 — 화면·러너·리수폿 런타임이 모두 이 규칙 하나로 폴더를 연다(2.0.0 버그 1).
// 리수폿 런타임(chat-scope.js)은 risupotWikiScopeId → chat.id 순서로 범위를 정하고, 복사·분기된 채팅은
// 새 chat-<uuid>로 갈라 risupotWikiScopeId에 적는다. 화면이 chat.id만 보면 복사본에서 서로 다른 폴더를 연다.
const text = (v) => typeof v === "string" || typeof v === "number" ? String(v).trim() : "";
export const SCOPE_FIELD = "risupotWikiScopeId";
export const chatKeyOf = (chat, index) => text(chat?.[SCOPE_FIELD]) || text(chat?.id) || String(index ?? "");
// 예전 규칙(chat.id ?? index)으로 열던 폴더 키. 지금 키와 다르면 그쪽에 쌓인 기억을 옮겨 와야 한다.
export const legacyChatKeyOf = (chat, index) => String(chat?.id ?? index ?? "");
// 화면에서 고른 채팅의 범위와 런타임이 지금 연 범위가 다른지(저장 대기와 구분하는 안내용)
export const scopeMismatch = (chat, index, runtimeChatKey) => !!runtimeChatKey && chatKeyOf(chat, index) !== String(runtimeChatKey);
