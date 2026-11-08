// 다시 요청(메인 모델이 검열·오류로 끊겨 같은 말을 다시 보냄)할 때 보조 모델을 또 부르지 않게 하는 열쇠(순수).
// 리수폿 고르기·정리 노트 캐시는 위키 개정 번호를 열쇠에 넣는데, 직전 응답 기록이 요청 사이에 끝나면 번호가 올라 같은 요청인데도 다시 불렀다.
// 여기서는 '플레이어 말 + 최근 대화 + 위키 문서 이름 목록'만으로 같은 요청인지 본다(문서 내용이 조금 바뀐 건 고르기·방향 결과에 영향이 작다).
const REF_START = "<<<RISUPOT_REFERENCE_DATA_START>>>", REF_END = "<<<RISUPOT_REFERENCE_DATA_END>>>";
const squash = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
export function routerKey(prompt) {
  const t = String(prompt ?? ""), a = t.indexOf(REF_START), b = t.indexOf(REF_END);
  if (a < 0 || b < a) return null;
  let ref; try { ref = JSON.parse(t.slice(a + REF_START.length, b).trim()); } catch { return null; }
  const user = /"current_user":\s*(\{[^{}]*\}|"(?:[^"\\]|\\.)*")/.exec(t)?.[1] ?? "";
  const recent = (ref.recent_chat?.messages ?? ref.recent_chat ?? []);
  const cat = Object.entries(ref.wiki_catalog ?? {}).map(([k, v]) => `${k}=${v?.title ?? ""}`).sort();
  return squash(JSON.stringify({ user, recent, cat }));
}
// 저장해 둔 응답의 request_ref를 이번 요청 것으로 바꾼다(리수폿은 같은 요청 번호만 받는다)
export function swapRequestRef(raw, prompt) {
  const want = /"request_ref":"([^"]+)"/.exec(String(prompt ?? ""))?.[1];
  if (!want) return raw;
  return String(raw ?? "").replace(/"request_ref"\s*:\s*"[^"]*"/, `"request_ref":"${want}"`);
}
export function directionKey(run) {
  return squash(JSON.stringify({ u: run.currentUser, r: run.recent.slice(-3).map((m) => m.text), d: run.docs.map((d) => d.title).sort() }));
}
// 작은 상한 Map
export function boundedSet(map, key, value, max = 8) { map.delete(key); map.set(key, value); while (map.size > max) map.delete(map.keys().next().value); }
