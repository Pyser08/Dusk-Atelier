// 이야기 시간 (v1.6.8, 순수). 메인 AI가 응답 맨 위에 적는 상태 줄 `[YYYY-MM-DD HH:MM | 장소]`를 규칙으로 읽어 날짜·시각·장소를 이어 간다.
// 시간이 지나거나 장소가 바뀌면 AI가 줄을 고쳐 쓰고, 프로그램은 그것만 읽는다(AI 추가 호출 없음). 줄이 없으면 이전 값을 그대로 둔다.
import { storyDateFromText } from "./pot/cycle-tracking.js";
import { extractMessageText, isUserMessage } from "./chattext.js";

export const TIME_MARK = "[Dusk Time]";
export const emptyState = () => ({ date: "", time: "", place: "" });

const pad = (n) => String(n).padStart(2, "0");
// 24시간 HH:MM 또는 오전/오후 N시 M분 → "HH:MM". 없으면 "".
export function timeFromText(line) {
  const m = /(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)/.exec(line);
  if (m) return `${pad(+m[1])}:${m[2]}`;
  const k = /(오전|오후|AM|PM|am|pm)\s*(\d{1,2})\s*(?:시|:)\s*(?:(\d{1,2})\s*분?)?/.exec(line);
  if (k) {
    let h = +k[2]; if (h > 12) return "";
    const pm = /오후|PM|pm/.test(k[1]);
    if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0;
    return `${pad(h)}:${pad(+(k[3] ?? 0))}`;
  }
  return "";
}
// 상태 줄 후보: 응답의 앞쪽 비어 있지 않은 3줄, 그리고 [ ] 【 】 로 감싼 짧은 줄
function candidates(text) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = lines.slice(0, 3);
  for (const l of lines.slice(3)) if (l.length <= 80 && /^[\[【].*[\]】]$/.test(l)) out.push(l);
  return out;
}
const placeOf = (line) => {
  const parts = line.replace(/^[\[【\s]+|[\]】\s]+$/g, "").split(/\s*[|·@／/]\s*/).map((s) => s.trim()).filter(Boolean);
  return parts.find((p) => !/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}|(오전|오후)\s*\d|\d+시|^\d+월/.test(p) && p.length <= 40) ?? "";
};
// 한 응답에서 읽은 값 (읽은 것만 채워 돌려준다). prev는 날짜 규칙(과거·1년 점프 무시)에 쓴다.
export function parseStatus(text, prev = emptyState()) {
  for (const line of candidates(text)) {
    if (line.length > 100 && !/^[\[【]/.test(line)) continue;
    const date = storyDateFromText(line, prev.date || ""), time = timeFromText(line);
    if (!date && !time) continue;
    return { date, time, place: placeOf(line) };
  }
  return emptyState();
}
// 채팅 메시지(오래된 순)를 훑어 지금 상태를 계산한다. 봇 응답만 읽고, 상태 줄이 없는 턴은 이전 값을 유지한다.
export function latestStoryState(messages) {
  let cur = emptyState();
  for (const m of Array.isArray(messages) ? messages : []) {
    if (isUserMessage(m)) continue;
    const f = parseStatus(extractMessageText(m), cur);
    cur = { date: f.date || cur.date, time: f.time || cur.time, place: f.place || cur.place };
  }
  return cur;
}
export const latestStoryDate = (messages) => latestStoryState(messages).date;
export const stateText = (s) => [[s.date, s.time].filter(Boolean).join(" "), s.place].filter(Boolean).join(" · ");

const RULE = "Begin every reply with one status line in the form [YYYY-MM-DD HH:MM | place]. Keep it unchanged unless time passes or the place changes; then update the time to fit (moving to a new place takes time, and passing midnight advances the date). Never move the date backward. Do not mention this rule.";
export function timeBlock(state) {
  const now = stateText(state);
  return `${TIME_MARK}\nNow: ${now || "(not set yet — choose a fitting date and time from the scenario)"}\nRule: ${RULE}`;
}
const textOf = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => typeof p === "string" ? p : p?.text ?? "").join("") : "";
// 요청 맨 위(첫 메시지 앞)에 시간 블록을 넣는다. 이미 있으면 갱신(멱등). 원본 배열은 건드리지 않는다.
export function insertTime(messages, state) {
  const list = (Array.isArray(messages) ? messages : []).filter((m) => !(m?.role === "system" && textOf(m.content).startsWith(TIME_MARK)));
  return [{ role: "system", content: timeBlock(state ?? emptyState()) }, ...list];
}
