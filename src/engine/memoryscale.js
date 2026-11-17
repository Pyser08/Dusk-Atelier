// addon-rebuild 기억 블록 척도 정리(애드온 전용 — engine/memoryinject.js는 코어와 같이 쓰는 모듈이라 건드리지 않고 다 만든 블록 글을 고친다).
// · 감정 게이지는 방향별(A→B) 0~10, 관계 진도는 양방향(두 방향 중 큰 값 + 함께한 장면)이라 서로 다를 수 있다고 제목에 적는다.
// · 기록이 최신보다 2개 이상 뒤처지면(직전 응답 미반영) 몇 번째 메시지까지 기록됐는지 머리말 아래에 적는다.
// · 위키 정리 노트(RISUPOT_DIRECTOR_NOTE)가 같은 요청에 있으면 호감도 기준은 정리 노트(−100~300), Dusk 감정은 참고용.
export const EMO_OLD = "Feelings (current gauges 0-10):";
export const STAGE_OLD = "Relationship stage (closeness should change gradually):";
export const EMO_TITLE = "Feelings (Dusk gauges 0-10, one direction A→B):";
export const STAGE_TITLE = "Relationship stage (mutual: the closer of both directions + shared scenes; may differ from one-way feelings; closeness should change gradually):";
export const EMO_TITLE_WIKI = "Feelings (Dusk gauges 0-10, one direction A→B; reference only — a different scale from the director note's affinity −100~300; for feelings toward {{user}} follow the director note):";
const DIRECTOR_MARK = "<!-- RISUPOT_DIRECTOR_NOTE_START -->";
const HEAD = "[Dusk Memory";
const lineSwap = (text, from, to) => text.split("\n").map((l) => (l === from ? to : l)).join("\n");
export const recordedLine = (coveredAt, messageCount) => Number.isInteger(coveredAt) && coveredAt >= 0 && messageCount - (coveredAt + 1) >= 2
  ? `Recorded through message ${coveredAt + 1} of ${messageCount}; later messages (including the latest reply) are not reflected here yet — where they disagree, the messages win.` : "";
export function scaleBlock(text, { coveredAt = -1, messageCount = 0 } = {}) {
  if (!text || !String(text).startsWith(HEAD)) return text;
  let t = lineSwap(lineSwap(String(text), EMO_OLD, EMO_TITLE), STAGE_OLD, STAGE_TITLE);
  const rec = recordedLine(coveredAt, messageCount);
  if (rec && !t.includes("\nRecorded through message ")) { const i = t.indexOf("\n"); t = i < 0 ? `${t}\n${rec}` : `${t.slice(0, i)}\n${rec}${t.slice(i)}`; }
  return t;
}
const msgText = (m) => typeof m?.content === "string" ? m.content : Array.isArray(m?.content) ? m.content.map((p) => typeof p === "string" ? p : p?.text ?? "").join("\n") : "";
export function wikiAware(text, messages) {
  if (!text || !(Array.isArray(messages) ? messages : []).some((m) => msgText(m).includes(DIRECTOR_MARK))) return text;
  return lineSwap(String(text), EMO_TITLE, EMO_TITLE_WIKI);
}
