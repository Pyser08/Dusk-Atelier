// 이야기 시간 자동 삽입 (v1.6.8, 순수). 장기기억과 무관하게 응답 글에서 날짜를 프로그램이 뽑아 요청 맨 위에 한 줄 넣는다.
// 날짜 규칙은 리수폿(storyDateFromText) 그대로: 앞 날짜보다 과거이거나 1년 넘게 건너뛴 날짜는 무시한다.
import { storyDateFromText } from "./pot/cycle-tracking.js";
import { extractMessageText, isUserMessage } from "./chattext.js";

export const TIME_MARK = "[Dusk Time]";
// 채팅 메시지(오래된 순)에서 가장 최근 이야기 날짜(YYYY-MM-DD). 없으면 "".
export function latestStoryDate(messages) {
  let best = "";
  for (const m of Array.isArray(messages) ? messages : []) {
    if (isUserMessage(m)) continue; // 날짜는 봇 응답에서만 읽는다
    const iso = storyDateFromText(extractMessageText(m), best);
    if (iso) best = iso;
  }
  return best;
}
const textOf = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => typeof p === "string" ? p : p?.text ?? "").join("") : "";
// 요청 맨 위(첫 메시지 앞)에 시간 줄을 넣는다. 이미 있으면 갱신(멱등). 원본 배열은 건드리지 않는다.
export function insertTime(messages, iso) {
  const list = (Array.isArray(messages) ? messages : []).filter((m) => !(m?.role === "system" && textOf(m.content).startsWith(TIME_MARK)));
  if (!iso) return list.length === (messages?.length ?? 0) ? messages : list;
  return [{ role: "system", content: `${TIME_MARK} Current story date: ${iso}` }, ...list];
}
