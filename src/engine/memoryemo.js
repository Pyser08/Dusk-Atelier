// v1.7.1 2단계: 다차원 감정 태그(순수). 호감도 하나를 6태그로 나누고, 코드가 게이지와 종합 태그를 관리한다.
// 게이지: 정수 0~10. 키가 없으면 '미설정'(모름), 0은 '없음'(명시적으로 없다고 본 값)으로 구분한다. 태그끼리 공존한다.
// 새 관계의 초기값은 비워 둔다(추측 금지). 모델은 변화량(±1~3)만 내고 코드가 병합·범위 제한한다.
import { srcOf } from "./memoryreconcile.js";

export const EMO_TAGS = Object.freeze(["trust", "affection", "hostility", "dependence", "respect", "fear"]);
export const EMO_LABEL = Object.freeze({ trust: "신뢰", affection: "애정", hostility: "적대감", dependence: "의존", respect: "존경", fear: "두려움" });
export const GAUGE_MIN = 0, GAUGE_MAX = 10, STEP_MAX = 3, EMO_CAP = 40, HIGH = 4;  // HIGH: 종합 태그에 오르는 최소값

const cut = (v, n) => String(v ?? "").trim().slice(0, n);
const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const clampG = (n) => Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, Math.round(n)));

// 모델 출력 검증. {from,to,t:{tag:delta},why}. 근거(why)가 없거나 변화가 0이면 버린다. 한 응답 최대 3쌍.
export function validateEmo(obj) {
  const list = Array.isArray(obj?.emo) ? obj.emo : [];
  const out = [];
  for (const x of list) {
    const from = cut(x?.from, 60), to = cut(x?.to, 60), why = cut(x?.why, 40);
    if (!from || !to || !why || key(from) === key(to)) continue;
    const t = {};
    for (const tag of EMO_TAGS) {
      const d = Math.round(Number(x?.t?.[tag]));
      if (Number.isFinite(d) && d !== 0) t[tag] = Math.max(-STEP_MAX, Math.min(STEP_MAX, d));
    }
    if (Object.keys(t).length) out.push({ from, to, t, why });
    if (out.length >= 3) break;
  }
  return out;
}

// 변화량을 쌍별 게이지에 병합한다. 반환: 바뀐 태그 수.
// 미설정 태그는 올라갈 때만 0에서 시작해 시작한다(내려가는 변화만 있으면 '없음 0'으로 시작).
export function applyEmo(folder, emos, anchor, now = Date.now()) {
  folder.emo ??= {};
  const src = srcOf(anchor);
  let changed = 0;
  for (const e of emos ?? []) {
    const k = key(e.from) + ">" + key(e.to), pair = folder.emo[k] ??= { from: e.from, to: e.to, tags: {}, log: [] };
    const prev = {}, next = {};
    for (const [tag, d] of Object.entries(e.t)) {
      if (pair.lock?.[tag]) continue;  // 사용자가 정한 태그는 자동 갱신하지 않는다
      const before = pair.tags[tag];
      const v = clampG((before ?? 0) + d);
      if (v === before) continue;
      prev[tag] = before ?? null; next[tag] = v; pair.tags[tag] = v; changed++;
    }
    if (Object.keys(next).length) {
      pair.log.push({ t: next, from: prev, why: e.why, at: anchor?.at ?? null, at_ms: now, ...(src ? { src } : {}) });
      if (pair.log.length > EMO_CAP) pair.log = pair.log.slice(-EMO_CAP);
    }
  }
  return changed;
}

// 사용자 직접 수정(위키 인라인 편집용): 값을 정하고 그 태그를 잠근다. null이면 '미설정'으로 되돌린다.
export function setTag(folder, from, to, tag, value, now = Date.now()) {
  if (!EMO_TAGS.includes(tag)) return null;
  folder.emo ??= {};
  const k = key(from) + ">" + key(to), pair = folder.emo[k] ??= { from, to, tags: {}, log: [] };
  const before = pair.tags[tag] ?? null;
  if (value == null) { delete pair.tags[tag]; if (pair.lock) { delete pair.lock[tag]; if (!Object.keys(pair.lock).length) delete pair.lock; } }
  else { pair.tags[tag] = clampG(value); pair.lock = { ...(pair.lock ?? {}), [tag]: true }; }
  pair.log.push({ t: { [tag]: pair.tags[tag] ?? null }, from: { [tag]: before }, why: "user", at: null, at_ms: now });
  return pair;
}

// 쌍을 이루는 태그가 서로 어긋나는가(예: 애정↑ 신뢰↓). 3단계 7-4(감정 모순 → 자기 감정 기록 유도)가 쓴다.
export function tensionOf(tags) {
  const g = (t) => tags?.[t];
  const out = [];
  if (g("affection") >= 6 && g("trust") != null && g("trust") <= 2) out.push(["affection", "trust"]);
  if (g("affection") >= 6 && g("hostility") >= 5) out.push(["affection", "hostility"]);
  if (g("affection") >= 6 && g("fear") >= 5) out.push(["affection", "fear"]);
  if (g("trust") >= 6 && g("hostility") >= 5) out.push(["trust", "hostility"]);
  if (g("respect") >= 6 && g("hostility") >= 5) out.push(["respect", "hostility"]);
  return out;
}
// 종합 태그: 게이지에서 코드가 만든다(모델이 쓰지 않으므로 게이지와 모순될 수 없다). 값이 큰 순 최대 3개 + 어긋남 표시.
export function summaryOf(tags) {
  const set = EMO_TAGS.filter((t) => tags?.[t] != null);
  if (!set.length) return "";
  const top = set.filter((t) => tags[t] >= HIGH).sort((a, b) => tags[b] - tags[a]).slice(0, 3);
  const body = top.length ? top.map((t) => `${t} ${tags[t]}`).join(", ") : "mild (" + set.map((t) => `${t} ${tags[t]}`).join(", ") + ")";
  return tensionOf(tags).length ? body + " [conflicted]" : body;
}
export const hasEmo = (folder) => Object.values(folder?.emo ?? {}).some((p) => Object.keys(p?.tags ?? {}).length);

// 주입 문장: 관련 있는 쌍 우선, 최근에 움직인 쌍 순.
export function emoLines(folder, { limit = 5, relevant = null } = {}) {
  const pairs = Object.values(folder?.emo ?? {}).filter((p) => Object.keys(p.tags ?? {}).length && (!relevant || relevant.has(key(p.from)) || relevant.has(key(p.to))));
  pairs.sort((a, b) => (b.log?.at(-1)?.at_ms ?? 0) - (a.log?.at(-1)?.at_ms ?? 0));
  return pairs.slice(0, limit).map((p) => `- ${p.from} → ${p.to}: ${summaryOf(p.tags)}`);
}
// 다음 분석 입력에 넣을 현재 게이지(있을 때만, 최근에 움직인 쌍 n개).
export function emoForPrompt(folder, n = 6) {
  return Object.values(folder?.emo ?? {}).filter((p) => Object.keys(p.tags ?? {}).length)
    .sort((a, b) => (b.log?.at(-1)?.at_ms ?? 0) - (a.log?.at(-1)?.at_ms ?? 0)).slice(0, n).map((p) => ({ from: p.from, to: p.to, tags: { ...p.tags } }));
}

// ── 호감도 → 태그 변환 ──
// 원본(위키 affinity.score)은 건드리지 않는다. 근거가 있는 태그(애정)만 옮기고 나머지는 '미설정'으로 둔다.
// 이미 그 태그에 값이 있으면 덮지 않는다. 변환 기록(conv)을 남겨 복구할 수 있다. docs: 위키 Character 문서 배열, userName: 대상 이름.
export function convertAffinity(folder, docs, userName, now = Date.now()) {
  folder.emo ??= {};
  folder.emoConv ??= [];
  let n = 0;
  for (const d of docs ?? []) {
    const m = (d?.metrics ?? []).find((x) => x?.slotId === "affinity.score");
    const lo = Number(m?.minimum), hi = Number(m?.maximum), v = Number(m?.value);
    if (!m || ![lo, hi, v].every(Number.isFinite) || hi <= lo) continue;
    const k = key(d.title) + ">" + key(userName), pair = folder.emo[k] ??= { from: d.title, to: userName, tags: {}, log: [] };
    if (pair.tags.affection != null || folder.emoConv.some((c) => c.pair === k)) continue;
    const val = clampG(((v - lo) / (hi - lo)) * GAUGE_MAX);
    pair.tags.affection = val;
    pair.log.push({ t: { affection: val }, from: { affection: null }, why: "converted", at: null, at_ms: now });
    folder.emoConv.push({ pair: k, from: "affinity.score", value: v, min: lo, max: hi, to: { affection: val }, at_ms: now });
    n++;
  }
  return n;
}
// 변환 되돌리기: 변환으로만 생긴 애정 값을 지운다(그 뒤 사용자가 잠근 값은 둔다).
export function undoConversion(folder) {
  let n = 0;
  for (const c of folder.emoConv ?? []) {
    const p = folder.emo?.[c.pair];
    if (p && p.tags.affection === c.to.affection && !p.lock?.affection) { delete p.tags.affection; n++; }
  }
  folder.emoConv = []; folder.emoConvOff = true;  // 다시 자동 변환하지 않는다
  return n;
}
