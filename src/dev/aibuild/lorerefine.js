// 로어북 더스크화 2단계 '규칙 설계' (v1.8.1) — 순수 함수.
// 기존 로어북의 내용·키·이름·폴더는 그대로 두고, AI가 항목마다 Dusk 규칙(조건·확률·반복·유지·그룹·배치·연쇄·변수·이름 경계)과
// 소속 확률을 설계한다. 설계 형식·검사·변환은 'AI로 제작'의 Dusk 방식(duskdesign.js)을 그대로 쓴다.
//   refineTargets → refineMessages → (AI) → readRefine → refineStep(작업 목록에 적용) → refineChanges(미리보기) → pickRefine(체크한 것만)
import { DUSK_GUIDE, convertDesign, duskContext, ruleLine } from './duskdesign.js';
import { parseLoose } from '../../engine/card/prompt.js';
import { affName, affOf, folderIdOf, folderMap, isAff, isFolder, isPlace, parentOf, ruleOf } from '../../engine/lorerules.js';

export const REFINE_BATCH = 40;
const clean = (s) => String(s ?? '').trim();
const snip = (s, n) => clean(s).replace(/\s+/g, ' ').slice(0, n);

const TASK = String.raw`[이번 일: 이미 있는 로어북에 Dusk 규칙 입히기]
로어북의 내용·키·이름·폴더 구조는 이미 정해져 있다. 너는 규칙(rule)과 소속 확률만 설계한다.
- entries에는 이번 묶음 항목만 ref로 쓰고, 각 항목에는 ref와 rule만 쓴다. content·keys·name·folder·links·probBlocks·새 항목·remove는 쓰지 않는다.
- folders에는 이미 있는 소속 폴더만 name으로 쓰고 affiliation(chance·max·members)과 rule만 고친다. 새 폴더는 만들지 않는다.
- 내용을 읽고 Dusk 기능을 적극적으로 쓴다:
  · 인물: hold 2~3(대화가 이어지는 동안 유지). 이름이 다른 이름의 일부거나 한두 글자면 wholeWord, 흔한 낱말 이름이면 commonWord+confirmWords.
  · 장소: hold 2~3. 같은 장소의 시간대·날씨·상황 변형처럼 동시에 나오면 안 되는 것끼리 같은 group.
  · 사건·비밀·떡밥·관계 진전: turn 범위, count(누적 단어)·times(앞 사건이 켜진 횟수) + repeat once 또는 cooldown.
  · 분위기·문체·출력 규칙 같은 지시문: position depth(2~4) 또는 bottom, role system.
  · 함께 나와야 자연스러운 항목은 chain(target, chance), 서로 배제는 without 또는 group.
  · 호감도·피로·진행도 같은 상태가 내용에 드러나면 set으로 변수를 바꾸고, 그 변수를 쓰는 항목에는 var 조건.
  · 가끔만 나와야 하는 소문·잡담·랜덤 사건: chance 20~60 + cooldown.
  · 소속: 핵심 인물 100, 조연 30~60, 동시에 너무 많이 나오면 max.
- 규칙이 필요 없거나 확실하지 않은 항목은 쓰지 않는다(지금 그대로 둔다). 모든 항목에 억지로 넣지 않는다.
- target·members에는 [전체 항목] 목록에 있는 이름만 쓴다. 자기 자신은 가리키지 않는다.
응답은 JSON 하나만: {"design":{"folders":[...],"entries":[{"ref":"l3","rule":{...}}]},"why":{"l3":"이 규칙을 고른 이유 한 줄"}}`;

// 규칙을 설계할 항목 번호 묶음 (폴더·빈 항목 제외)
export function refineTargets(list, size = REFINE_BATCH) {
  const idx = [];
  (list ?? []).forEach((e, i) => { if (e && !isFolder(e) && (clean(e.content) || clean(e.key))) idx.push(i); });
  const out = [];
  for (let i = 0; i < idx.length; i += size) out.push(idx.slice(i, i + size));
  return out;
}

export function refineMessages(list, batch, { instruction = '', reference = '' } = {}) {
  const fmap = folderMap(list);
  const folderName = (e) => { const p = parentOf(e); const f = p && fmap.get(p); return f ? affName(f) || f.comment : ''; };
  const all = list.map((e, i) => `l${i} | ${isAff(e) ? 'affiliation' : isFolder(e) ? 'folder' : isPlace(e) ? 'place' : 'entry'} | ${snip(affName(e) || e.comment, 40)}${folderName(e) ? ` | in ${folderName(e)}` : ''}${!isFolder(e) && e.key ? ` | keys ${snip(e.key, 40)}` : ''}`);
  const ctx = duskContext(list, { bodyMax: 400 });
  const affs = ctx.filter((o) => o.kind === 'affiliation');
  const targets = batch.map((i) => ctx[i]);
  const user = [
    instruction ? `사용자 추가 요청: ${instruction}` : '',
    reference ? `[참고: 같은 봇의 다른 설정]\n${reference}` : '',
    `[전체 항목] (ref | 종류 | 이름 | 폴더 | 키)\n${all.join('\n')}`,
    affs.length ? `[소속 폴더]\n${JSON.stringify(affs)}` : '',
    `[이번 묶음: 규칙을 설계할 항목]\n${JSON.stringify(targets)}`
  ].filter(Boolean).join('\n\n');
  return [{ role: 'system', content: `${DUSK_GUIDE}\n\n${TASK}` }, { role: 'user', content: user }];
}

// AI 답 → 안전한 설계(규칙·소속 확률만 남김) + 이유
export function readRefine(raw, list, batch) {
  const o = parseLoose(raw);
  const d = o?.design ?? o?.data?.design ?? {};
  const ok = new Set(batch.map((i) => 'l' + i));
  const names = new Set(list.filter(isAff).map((e) => clean(affName(e)).toLowerCase()));
  const entries = (Array.isArray(d.entries) ? d.entries : []).filter((x) => x && ok.has(String(x.ref)) && x.rule && typeof x.rule === 'object').map((x) => ({ ref: String(x.ref), rule: x.rule }));
  const folders = (Array.isArray(d.folders) ? d.folders : []).filter((f) => f && names.has(clean(f.name).toLowerCase())).map((f) => {
    const out = { name: clean(f.name) };
    if (f.affiliation && typeof f.affiliation === 'object') out.affiliation = f.affiliation;
    if (f.rule && typeof f.rule === 'object') out.rule = f.rule;
    return out;
  }).filter((f) => f.affiliation || f.rule);
  const why = o?.why && typeof o.why === 'object' ? Object.fromEntries(Object.entries(o.why).map(([k, v]) => [String(k), snip(v, 120)])) : {};
  return { design: { folders, entries }, why };
}

// 바뀐 항목만 반영한 새 작업 목록
function applyUpsert(work, upsert) {
  const out = [...work];
  for (const u of upsert) {
    const m = /^l(\d+)$/.exec(String(u.ref ?? ''));
    if (!m) continue;        // 규칙 설계에서는 새 항목을 만들지 않는다
    const i = Number(m[1]);
    if (out[i]) out[i] = { ...structuredClone(out[i]), ...structuredClone(u.entry) };
  }
  return out;
}
// 설계 하나를 작업 목록에 적용한다. 한꺼번에 검사가 통과하면 그대로, 아니면 하나씩 넣어 문제 있는 것만 뺀다.
// 반환: { work, errors[], warnings[] }
export function refineStep(work, design) {
  const whole = convertDesign(design, work);
  if (!whole.errors.length) return { work: applyUpsert(work, whole.upsert), errors: [], warnings: whole.warnings };
  let cur = work;
  const errors = [], warnings = [];
  const parts = [...design.folders.map((f) => ({ folders: [f], entries: [] })), ...design.entries.map((e) => ({ folders: [], entries: [e] }))];
  for (const p of parts) {
    const r = convertDesign(p, cur);
    if (r.errors.length) { errors.push(...r.errors); continue; }
    warnings.push(...r.warnings);
    cur = applyUpsert(cur, r.upsert);
  }
  return { work: cur, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

const affLine = (e) => { const a = affOf(e); if (!a) return ''; const n = Object.keys(a.prob ?? {}).length; return `구성원 기본 ${a.def}%${a.max !== '' ? ` · 최대 ${a.max}명` : ''}${n ? ` · 개별 확률 ${n}명` : ''}`; };
const lineOf = (e) => (isAff(e) ? [affLine(e), ruleLine(ruleOf(e))].filter(Boolean).join(' · ') : ruleOf(e)?.on !== false ? ruleLine(ruleOf(e)) : '');
// 원래 목록과 작업 목록을 비교해 바뀐 항목 (미리보기)
export function refineChanges(list, work, why = {}) {
  const out = [];
  list.forEach((e, i) => {
    const w = work[i];
    if (!w || JSON.stringify(w) === JSON.stringify(e)) return;
    out.push({ i, name: affName(w) || w.comment || '(이름 없음)', kind: isAff(w) ? 'affiliation' : isPlace(w) ? 'place' : 'entry', before: lineOf(e) || '규칙 없음', after: lineOf(w) || '규칙 없음', why: why['l' + i] ?? '', checked: true, folderId: folderIdOf(w) || null });
  });
  return out;
}
// 체크한 항목만 바꾼 최종 목록
export function pickRefine(list, work, changes) {
  const on = new Set(changes.filter((c) => c.checked).map((c) => c.i));
  return list.map((e, i) => (on.has(i) ? work[i] : e));
}
