// 이야기 날짜 공유(v1.6.4): 응답 글에서 날짜를 프로그램이 한 번만 뽑고, 월경·임신 계산과 세계 시간선이 같이 쓴다.
// 규칙은 리수폿 그대로 — 날짜가 없거나, 앞 날짜보다 과거이거나 1년을 넘게 건너뛴 날짜는 무시한다(날짜 없는 턴은 아무것도 안 움직임).
import { storyDateFromText } from "./pot/cycle-tracking.js";

// 지금까지 기록된 가장 최근 이야기 날짜(YYYY-MM-DD). 없으면 "".
export function latestStoryIso(folder) {
  let best = "";
  for (const s of folder?.scenes ?? []) if (!s.orphan && /^\d{4}-\d{2}-\d{2}$/.test(s.iso ?? "") && s.iso > best) best = s.iso;
  return best;
}
export const storyDateOf = (text, folder) => storyDateFromText(text, latestStoryIso(folder));

// 모델이 적은 when과 프로그램이 뽑은 날짜를 합친다: when에 숫자(날짜)가 이미 있으면 모델 것을 쓰고, 시각만 있으면 앞에 날짜를 붙인다.
export function mergeWhen(when, iso) {
  const w = String(when ?? "").trim();
  if (!iso) return w;
  if (!w) return iso;
  return /\d/.test(w) ? w : `${iso} ${w}`;
}
