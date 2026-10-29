// v1.7.1 1단계: 기억의 신뢰성(순수). 출처·확신도·유효성, 충돌 판정, 반복 횟수 중복 제거.
// 신규 필드는 전부 선택 기입이다. 없는 기록(구버전)은 그대로 두고, 갱신될 때 채운다.
//  kd 구분 "f"(사실)|"i"(추론) · fc 사실확실성 · ic 해석확실성(kd=i일 때만) · H/M/L
//  attr {c,k,v,cond?,tm?} 비교할 속성(취향·관계·직업·거주·신념) · valid:false = 현재 적용 종료(과거 사실로 보존)
//  inv {why,at_ms,by?} 종료 이유 · hist [{id,act,v,why,at_ms}] 이전 기록(내부 저장은 전부, 화면·프롬프트는 최근 1건)
//  pat 패턴 · mean 의미(추정) · lock {필드:true} 사용자 수정으로 잠긴 필드 · hs 출처 목록(횟수 중복 제거용)
import { srcOf } from "./memoryreconcile.js";

export const CONF_RANK = Object.freeze({ H: 3, M: 2, L: 1 });
export const CONF_LABEL = Object.freeze({ H: "높음", M: "중간", L: "낮음" });
export const KIND_LABEL = Object.freeze({ f: "사실", i: "추론" });
export const ATTR_CATS = Object.freeze({ pref: "취향", rel: "관계", job: "직업", home: "거주", belief: "신념" });
export const HIST_MAX = 50;  // 안전 상한(보통 속성 하나가 이만큼 바뀌지 않는다)

const cut = (v, n) => String(v ?? "").trim().slice(0, n);
const nk = (v) => String(v ?? "").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");

export function normConf(v) {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const u = s.toUpperCase();
  if (CONF_RANK[u]) return u;
  if (/^(높|high)/i.test(s)) return "H";
  if (/^(중|med|mid)/i.test(s)) return "M";
  if (/^(낮|low)/i.test(s)) return "L";
  return undefined;
}
export function normKind(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "f" || s === "fact" || s === "사실") return "f";
  if (s === "i" || s === "infer" || s === "inference" || s === "추론") return "i";
  return undefined;
}

// 모델이 낸 한 행동(people[])의 신뢰 필드를 검증한다. 잘못된 값은 조용히 버린다.
export function validateTrust(e) {
  const out = {};
  const kd = normKind(e?.kd), fc = normConf(e?.fc);
  if (kd) out.kd = kd;
  if (fc) out.fc = fc;
  if (kd === "i") { const ic = normConf(e?.ic); if (ic) out.ic = ic; }  // 해석확실성은 추론일 때만
  const a = e?.attr;
  if (a && typeof a === "object") {
    const c = ATTR_CATS[a.c] ? a.c : null, k = cut(a.k, 30), v = cut(a.v, 40);
    if (c && nk(k) && nk(v)) {
      out.attr = { c, k, v };
      const cond = cut(a.cond, 40); if (nk(cond)) out.attr.cond = cond;
      if (a.tm === "past") out.attr.tm = "past";
    }
  }
  const pat = cut(e?.pat, 40); if (pat) out.pat = pat;
  const mean = cut(e?.mean, 60);
  if (mean && out.kd === "i" && out.ic) out.mean = mean;  // 의미는 근거가 있는 추론으로 표시된 것만
  return out;
}

export const isValid = (r) => r?.valid !== false;
export const isLocked = (r, f) => !!r?.lock?.[f];
// 비교에 쓰는 확신도 등급. 사용자가 직접 정한 값은 객관 근거로 치지 않는다(undefined).
export function effRank(r) {
  if (isLocked(r, "fc") || isLocked(r, "ic")) return undefined;
  const fc = CONF_RANK[r?.fc];
  if (!fc) return undefined;
  if (r.kd === "i") { const ic = CONF_RANK[r.ic]; return ic ? Math.min(fc, ic) : fc; }
  return fc;
}
const attrKey = (r) => r?.attr ? nk(r.attr.c) + "|" + nk(r.attr.k) : "";

// 새 기록에 붙일 신뢰 필드(분석 결과 e → 저장 모양). 출처 목록(hs)도 여기서 만든다.
export function trustFields(e, anchor) {
  const out = {};
  for (const f of ["kd", "fc", "ic", "attr", "pat", "mean"]) if (e?.[f] != null) out[f] = e[f];
  if (out.mean) out.est = true;  // 의미는 항상 '추정' 표시
  const s = srcOf(anchor);
  if (s) out.hs = [{ ...s }];
  return out;
}

// 같은 기록이 다시 나왔을 때: 불변 필드(kd·fc·attr)는 비어 있을 때만 채우고, 해석·패턴·의미는 새 근거가 있으면 갱신한다. 잠긴 필드는 건드리지 않는다.
export function mergeTrust(rec, e) {
  let n = 0;
  for (const f of ["kd", "fc", "attr"]) if (e?.[f] != null && rec[f] == null && !isLocked(rec, f)) { rec[f] = e[f]; n++; }
  for (const f of ["ic", "pat", "mean"]) if (e?.[f] != null && rec[f] !== e[f] && !isLocked(rec, f)) { rec[f] = e[f]; if (f === "mean") rec.est = true; n++; }
  return n;
}

// ── 횟수: 출처 응답(메시지) 기준 중복 제거 ──
// 같은 응답을 다시 분석하거나(재분석) 같은 자리의 응답을 고쳐 다시 쓴 경우(같은 chatId, 다른 해시)는 올리지 않는다.
export function addSource(rec, anchor) {
  const s = srcOf(anchor);
  if (!s) return false;
  if (!rec.hs) {  // 구버전 기록: 처음 올릴 때 자기 출처를 시드하고, 이전 횟수는 m0로 보존
    const own = rec.h ? [{ chatId: rec.mid ?? null, hash: rec.h, at: rec.at ?? null }] : [];
    rec.hs = own; rec.m0 = Math.max(0, (rec.m ?? 1) - Math.max(1, own.length));
  }
  const hit = rec.hs.find((x) => x.hash === s.hash || (s.chatId && x.chatId === s.chatId));
  if (hit) { hit.hash = s.hash; hit.at = s.at; rec.m = (rec.m0 ?? 0) + rec.hs.length; return false; }
  rec.hs.push({ ...s });
  rec.m = (rec.m0 ?? 0) + rec.hs.length;
  return true;
}

// ── 충돌 판정 ──
// 순서: 1 같은 대상·속성 → 2 시점·조건 비교 → 3 분류(변화/조건부/모순 후보/과거) → 4 모순 후보만 확신도 비교, 근거가 부족하면 보류.
export function classify(old, nw) {
  const oa = old.attr, na = nw.attr;
  const nc = nk(na.cond), oc = nk(oa.cond);
  if ((nc || oc) && nc !== oc) return "conditional";
  if (na.tm === "past") return oa.tm === "past" ? "contradiction" : "history";
  if (oa.tm === "past") return "change";
  if (nw.at != null && old.at != null && nw.at > old.at) return "change";
  return "contradiction";
}
function endRecord(old, nw, why, now) {
  old.valid = false;
  old.inv = { why, at_ms: now, by: nw.id };
  delete old.hold;
}
function chain(old, nw) {  // 새 기록에 이전 → 현재 이력을 이어 붙인다(내부 저장은 유지)
  const h = [...(old.hist ?? []), { id: old.id, act: old.act, v: old.attr?.v ?? "", why: old.inv?.why ?? "", at_ms: old.inv?.at_ms ?? null }];
  nw.hist = h.slice(-HIST_MAX);
  nw.prev = { id: old.id, act: old.act, v: old.attr?.v ?? "" };
}

// person.records에 nw를 넣기 *전에* 부른다. nw.valid·이력을 정하고 옛 기록을 종료한다. 반환: {verdicts:[...], alerts:[...]}
// verdict: {kind:'change'|'conditional'|'contradiction-adopt'|'contradiction-lost'|'hold'|'history', old:id}
export function resolveConflicts(records, nw, { now = Date.now() } = {}) {
  const out = { verdicts: [], alerts: [] };
  if (!nw.attr) return out;
  const k = attrKey(nw), nv = nk(nw.attr.v);
  const olds = (records ?? []).filter((r) => r.id !== nw.id && !r.orphan && isValid(r) && r.attr && attrKey(r) === k && nk(r.attr.v) !== nv);
  for (const old of olds) {
    const kind = classify(old, nw);
    if (kind === "conditional") { out.verdicts.push({ kind, old: old.id }); continue; }
    if (kind === "history") { nw.valid = false; nw.inv = { why: "past", at_ms: now }; out.verdicts.push({ kind, old: old.id }); continue; }
    const locked = isLocked(old, "valid") || isLocked(old, "attr") || isLocked(old, "act");
    const rn = effRank(nw), ro = effRank(old);
    if (kind === "change") {
      // 약한 추론(낮음)이 확실한 기록(중간 이상)을 곧바로 끝내지 못한다 → 보류
      if (nw.kd === "i" && rn === 1 && ro >= 2) { markHold(old, nw); out.verdicts.push({ kind: "hold", old: old.id }); continue; }
      if (locked) { out.alerts.push({ type: "locked", old: old.id, text: nw.act }); markHold(old, nw); out.verdicts.push({ kind: "hold", old: old.id }); continue; }
      endRecord(old, nw, "newer", now); chain(old, nw); out.verdicts.push({ kind, old: old.id }); continue;
    }
    // 모순 후보: 확신도 등급 비교
    if (locked) { out.alerts.push({ type: "locked", old: old.id, text: nw.act }); markHold(old, nw); out.verdicts.push({ kind: "hold", old: old.id }); continue; }
    if (rn != null && ro != null && rn > ro) { endRecord(old, nw, "contradiction", now); chain(old, nw); out.verdicts.push({ kind: "contradiction-adopt", old: old.id }); }
    else if (rn != null && ro != null && rn < ro) { nw.valid = false; nw.inv = { why: "contradiction", at_ms: now, by: old.id }; out.verdicts.push({ kind: "contradiction-lost", old: old.id }); }
    else { markHold(old, nw); out.verdicts.push({ kind: "hold", old: old.id }); }
  }
  return out;
}
function markHold(old, nw) { old.hold = nw.id; nw.hold = old.id; }

// 사용자 수정: 현재 적용 여부를 직접 켜고 끈다(필드 잠금 + 이유 기록). 켜면 종료 기록을 지운다.
export function setValid(rec, valid, now = Date.now()) {
  rec.lock = { ...(rec.lock ?? {}), valid: true };
  if (valid) { delete rec.valid; delete rec.inv; } else { rec.valid = false; rec.inv = { why: "user", at_ms: now }; }
  delete rec.hold;
  return rec;
}
// 필드 잠금(사용자가 값을 직접 고친 필드). 이후 자동 갱신은 이 필드를 건드리지 않는다.
export function setLock(rec, field, on = true) {
  if (on) rec.lock = { ...(rec.lock ?? {}), [field]: true };
  else if (rec.lock) { delete rec.lock[field]; if (!Object.keys(rec.lock).length) delete rec.lock; }
  return rec;
}

// ── 프롬프트·화면용 짧은 표기 ──
// 주입 대상: 현재 적용되는 기록만(종료된 것은 과거 사실로 보존만 한다).
export const injectable = (r) => !r.orphan && isValid(r);
// 확신도·구분 꼬리표. 보통(사실·높음/미설정)은 비워 토큰을 아낀다.
export function trustTag(r) {
  const t = [];
  if (r.kd === "i") t.push("inferred");
  if (effRank(r) === 1) t.push("uncertain");
  if (r.hold) t.push("disputed");
  return t.length ? ` [${t.join(", ")}]` : "";
}
// 이전 → 현재 한 줄(최근 1건만).
export function changeNote(r, max = 40) {
  const p = r.prev ?? r.hist?.at(-1);
  return p?.act ? ` (was: ${String(p.act).replace(/\s+/g, " ").trim().slice(0, max)})` : "";
}
// 다음 분석 입력에 넣을 인물별 속성 키(모델이 같은 키를 다시 쓰게 한다). 현재 적용되는 것만 최대 n개.
export function attrsForPrompt(person, n = 4) {
  return (person.records ?? []).filter((r) => injectable(r) && r.attr).slice(-n).map((r) => ({ c: r.attr.c, k: r.attr.k, v: r.attr.v, ...(r.attr.cond ? { cond: r.attr.cond } : {}) }));
}
