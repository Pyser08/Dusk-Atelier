// 11-24: 나({{user}})의 월경·임신(순수). 위키 인물 문서가 없어 채팅 폴더 f.userCycle = { state, hist:[{at,h,before}] }에 둔다.
// 몸이 여성일 때만(직접 고름·이야기에서 바뀜·페르소나 설명). 남성이 되면 멈추고, 리롤·삭제로 되돌아가면 그 응답 앞 상태에서 다시 셈한다.
import { nextCycleState, storyDateFromText, formatCycleBody } from "./pot/cycle-tracking.js";
import { USER_NSFW_ID } from "./usernsfw.js";
const copy = (v) => (v ? JSON.parse(JSON.stringify(v)) : null);
export const userFemale = (f, changes = []) => { const cur = f?.gender?.[USER_NSFW_ID]; if (cur?.by === "user") return cur.g === "f"; const c = changes.filter((x) => x?.kind === "sex" && x.name === "{{user}}").at(-1); return (c?.g ?? cur?.g) === "f"; };
export const userCycleState = (f) => (f?.userCycle?.state && userActive(f) ? f.userCycle.state : null);
const userActive = (f) => userFemale(f) || !!f?.userCycle?.state?.conception;
const hashOf = (t) => { const s = String(t ?? ""); return `${s.length}:${s.slice(0, 60)}:${s.slice(-60)}`; };
// at: 이 응답의 메시지 번호(모르면 null = 되돌리기 안 함). 반환: 바뀐 글(없으면 [])
export function stepUserCycle(f, { report = null, text = "", at = null, rate = 1, random = Math.random, changes = [] } = {}) {
  const uc = f.userCycle ?? { state: null, hist: [] }; let hist = [...(uc.hist ?? [])], state = copy(uc.state);
  const h = hashOf(text); if (hist.at(-1)?.h === h && hist.at(-1)?.at === at) return [];
  if (Number.isInteger(at)) { const i = hist.findIndex((x) => x.at >= at); if (i >= 0) { state = copy(hist[i].before); hist = hist.slice(0, i); } }
  const female = userFemale(f, changes);
  if (!female && !state?.conception) { if (state) f.userCycle = { state, hist }; else if (uc.state) f.userCycle = { state: null, hist }; return []; }
  const before = copy(state), date = storyDateFromText(text, state?.date ?? "");
  const r = nextCycleState(state, { adult: true, sex: (report?.sex ?? []).map((s) => ({ partner: s.partner, protected: s.contraception === "used" })), known: !!report?.known, birth: !!report?.birth }, date, { rate, random });
  if (!r) return [];
  const next = r.state, out = [];
  if (report?.loss && next.conception) { Object.assign(next, { conception: "", partner: "", known: false }); if (next.date) next.start = next.date; out.push("유산"); }
  if (report?.period && !next.conception && next.date) next.start = next.date;
  hist.push({ at, h, before }); f.userCycle = { state: next, hist: hist.slice(-12) };
  if (!before) out.push("주기 시작"); if (report?.birth && before?.conception) out.push("출산"); if (next.known && !before?.known) out.push("임신을 알게 됨");
  if (r.rolled) out.push(`임신 판정 ${Math.round(r.rolled.chance * 100)}%`);
  return out;
}
export const userCycleText = (f) => { const s = userCycleState(f); return s ? formatCycleBody(s) : ""; };
export function userCycleSection(f) {
  const t = userCycleText(f); if (!t) return "";
  return `[{{user}}'s body — menstrual cycle, program record]\n${t}\nFact about {{user}}'s body on that story date. Use only as physical detail others could notice when it fits; never decide {{user}}'s actions, words or feelings. While it says 본인: 모름, nobody knows about the pregnancy.`;
}
