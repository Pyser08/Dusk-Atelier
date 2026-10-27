// 출처: risupot 2.3.0 src/time-format.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

const KOREAN_TIME_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** Keeps stored timestamps as UTC ISO and converts only user-facing text to Korea Standard Time. */
function formatKoreanTimestamp(value) {
  const date = new Date(String(value || ''));
  if (!Number.isFinite(date.getTime())) return String(value || '시각 없음');
  const parts = Object.fromEntries(KOREAN_TIME_FORMATTER.formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} KST`;
}
