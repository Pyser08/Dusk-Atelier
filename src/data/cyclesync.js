// addon-rebuild: 월경·임신 측정 보강(애드온 전용 — 주기 계산 모듈 cycle-tracking.js는 본체와 같이 쓰므로 고치지 않고, 계산이 끝난 위키 구획만 다시 맞춘다).
// - period: 이번 응답에서 생리가 시작됐거나 생리 중인 게 보이면 그날을 생리 시작 기준일로 맞춘다(임의로 정한 주기가 이야기와 어긋나지 않게).
// - loss: 유산·임신 중단이 보이면 임신 상태를 지우고 그날부터 새 주기.
import { isCycleSection, parseCycleBody, formatCycleBody } from "../engine/pot/cycle-tracking.js";

const key = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");

// events: [{name, period, loss}] → 바뀐 scope(바뀐 게 없으면 같은 객체)와 바뀐 이름
export function applyCycleEvents(scope, events) {
  const want = (events ?? []).filter((e) => e && (e.period || e.loss) && key(e.name));
  if (!want.length || !scope?.documents) return { scope, changed: [] };
  const docs = { ...scope.documents }, changed = [];
  for (const e of want) {
    const doc = Object.values(docs).find((d) => d?.type === "Character" && [d.title, ...(d.aliases ?? [])].map(key).includes(key(e.name)));
    const idx = doc?.sections?.findIndex(isCycleSection) ?? -1;
    if (idx < 0) continue;
    const st = parseCycleBody(doc.sections[idx].body);
    if (!st || !st.date) continue;   // 이야기 날짜를 모르면 맞출 기준이 없다
    let next = null;
    if (e.loss && st.conception) next = { ...st, conception: "", partner: "", known: false, start: st.date };
    else if (e.period && !st.conception && st.start !== st.date) {
      // 이미 생리 기간(시작 뒤 6일 안)으로 계산돼 있으면 그대로 둔다
      const days = st.start ? Math.round((Date.parse(st.date) - Date.parse(st.start)) / 86400000) : -1;
      if (!(days >= 0 && days % st.length < 6)) next = { ...st, start: st.date };
    }
    if (!next) continue;
    const sections = doc.sections.map((s, i) => i === idx ? { ...s, body: formatCycleBody(next) } : s);
    docs[doc.id] = { ...doc, sections };
    changed.push(doc.title);
  }
  if (!changed.length) return { scope, changed };
  // 2.2.9 버그: 이력 없이 문서만 바꾸면 그 턴을 다시 기록(수정·리롤)할 때 '직접 고친 문서와 겹침'으로 멈췄다.
  // 이 맞춤은 그 턴 응답에서 나온 것이므로, 문서별 마지막 이력의 after가 바꾸기 전 문서와 같으면 after를 새 문서로 맞춘다.
  let history = scope.history;
  if (Array.isArray(history)) {
    history = history.slice();
    for (const id of Object.keys(docs)) {
      if (docs[id] === scope.documents[id]) continue;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i]?.documentId !== id) continue;
        if (JSON.stringify(history[i].after) === JSON.stringify(scope.documents[id])) history[i] = { ...history[i], after: structuredClone(docs[id]) };
        break;
      }
    }
  }
  return { scope: { ...scope, documents: docs, ...(history ? { history } : {}), revision: (scope.revision ?? 0) + 1 }, changed };
}
