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
// 2.2.30 보조 토큰 절약: 고르기(router)는 '이번 대화에 나온 위키 인물'을 고르는 호출이다. 위키 목록이 같고, 내 말·최근 대화에 이름이 나온
// 위키 인물이 지난번과 같으면 결과도 같으므로 지난 답을 다시 쓴다(호출자가 연속 재사용 횟수를 제한). 이름이 안 나오면 null(재사용 안 함).
export function castKey(prompt) {
  const t = String(prompt ?? ""), a = t.indexOf(REF_START), b = t.indexOf(REF_END);
  if (a < 0 || b < a) return null;
  let ref; try { ref = JSON.parse(t.slice(a + REF_START.length, b).trim()); } catch { return null; }
  const user = /"current_user":\s*(\{[^{}]*\}|"(?:[^"\\]|\\.)*")/.exec(t)?.[1] ?? "";
  const recent = JSON.stringify((ref.recent_chat?.messages ?? ref.recent_chat ?? []).slice(-2));
  const text = (user + "\n" + recent).toLowerCase();
  const cat = Object.entries(ref.wiki_catalog ?? {});
  if (!cat.length) return null;
  const hit = cat.filter(([, v]) => [v?.title, ...(v?.aliases ?? [])].some((n) => n && String(n).length >= 2 && text.includes(String(n).toLowerCase()))).map(([k]) => k).sort();
  if (!hit.length) return null;
  return squash(JSON.stringify({ cat: cat.map(([k]) => k).sort(), hit }));
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
