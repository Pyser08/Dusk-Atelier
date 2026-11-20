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
  return finish(scope, docs, changed);
}
// 바뀐 문서를 scope에 넣는다(마지막 이력 after도 같이 맞춰 '직접 고친 문서와 겹침'으로 멈추지 않게)
function finish(scope, docs, changed) {
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

// 0.3.22 동거 여성 월경 주기 동기화(맥클린톡 효과처럼 몇 달에 걸쳐 비슷해짐). 엔진 계산 — 한 주기(평균 길이)가 지날 때마다 한 번,
// 두 사람의 생리 시작일 차이를 1/4(1~4일)씩 좁히고 주기 길이도 1일씩 가깝게. 임신 중이거나 날짜를 모르면 건너뜀.
// pairs = [{key, a, b}], last = {key: 마지막으로 맞춘 이야기 날짜} → {scope, last, changed}
const dn = (iso) => { const m = /^(\d{1,4})-(\d{2})-(\d{2})$/.exec(iso || ""); if (!m) return NaN; const t = new Date(0); t.setUTCFullYear(+m[1], +m[2] - 1, +m[3]); return Math.round(t.getTime() / 864e5); };
const iso = (n) => { const t = new Date(n * 864e5); return `${String(t.getUTCFullYear()).padStart(4, "0")}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`; };
export function syncCycles(scope, pairs, last = {}) {
  const out = { ...(last ?? {}) }, changed = [];
  if (!scope?.documents || !pairs?.length) return { scope, last: out, changed };
  const docs = { ...scope.documents };
  const find = (name) => Object.values(docs).find((d) => d?.type === "Character" && [d.title, ...(d.aliases ?? [])].map(key).includes(key(name)));
  for (const p of pairs) {
    const A = find(p.a), B = find(p.b); if (!A || !B || A === B) continue;
    const ia = A.sections?.findIndex(isCycleSection) ?? -1, ib = B.sections?.findIndex(isCycleSection) ?? -1; if (ia < 0 || ib < 0) continue;
    const sa = parseCycleBody(A.sections[ia].body), sb = parseCycleBody(B.sections[ib].body);
    if (!sa?.start || !sb?.start || !sa.date || sa.conception || sb.conception) continue;
    const now = Math.max(dn(sa.date), dn(sb.date)); if (!Number.isFinite(now)) continue;
    const L = Math.round((sa.length + sb.length) / 2), prev = dn(out[p.key]);
    if (!Number.isFinite(prev)) { out[p.key] = iso(now); continue; }   // 처음 본 날부터 센다
    if (now - prev < L) continue;
    let off = ((dn(sb.start) - dn(sa.start)) % L + L) % L; if (off > L / 2) off -= L;   // b가 a보다 며칠 늦게 시작하는지(−면 이름)
    const steps = Math.min(6, Math.floor((now - prev) / L));   // 날짜를 크게 건너뛰면 지난 주기만큼 여러 번(최대 6)
    let na = { ...sa }, nb = { ...sb };
    for (let k = 0; k < steps && Math.abs(off) > 1; k++) {
      const sh = Math.max(1, Math.min(4, Math.round(Math.abs(off) / 4))), half = Math.ceil(sh / 2), sg = Math.sign(off);
      na.start = iso(dn(na.start) + sg * half); nb.start = iso(dn(nb.start) - sg * (sh - half)); off -= sg * sh;
      if (na.length !== nb.length) { if (na.length > nb.length) { na.length--; nb.length++; } else { na.length++; nb.length--; } }
    }
    out[p.key] = iso(now);
    if (na.start === sa.start && nb.start === sb.start && na.length === sa.length) continue;
    docs[A.id] = { ...A, sections: A.sections.map((s, i) => (i === ia ? { ...s, body: formatCycleBody(na) } : s)) };
    docs[B.id] = { ...B, sections: B.sections.map((s, i) => (i === ib ? { ...s, body: formatCycleBody(nb) } : s)) };
    changed.push(`${A.title}·${B.title}`);
  }
  const r = finish(scope, docs, changed);
  return { scope: r.scope, last: out, changed };
}
