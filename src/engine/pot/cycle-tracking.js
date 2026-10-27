// 출처: risupot 2.3.0 src/cycle-tracking.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

// The program owns the cycle, the pregnancy roll and the stages. The Writer only reports what the RP shows, as marker lines
// at the end of a woman's core.current_state text; writer-apply strips them and keeps one program section per woman.
// Story dates come from the RP text itself (a date written in the reply, usually a status line). A turn without a date moves nothing.
export const CYCLE_SLOT = 'cycle.state';
export const CYCLE_HEADING = '월경·임신';
const CYCLE_RATE_RANGE = Object.freeze({ min: 0.5, max: 3, step: 0.1, default: 1 });

/** Switched on in the feature set and allowed by the sexual desire record (both resolved per bot). */
function cycleTrackingOn(settings) { return settings?.features?.openness?.cycle === true && settings?.sexualDesireEnabled === true; }
function cycleRate(settings) { const value = Number(settings?.features?.openness?.cycleRate); return Number.isFinite(value) && value >= CYCLE_RATE_RANGE.min && value <= CYCLE_RATE_RANGE.max ? value : CYCLE_RATE_RANGE.default; }

// ---- dates ----
const cyclePad = n => String(n).padStart(2, '0');
const cycleIsoDate = (y, m, d) => y + '-' + cyclePad(m) + '-' + cyclePad(d);
const cycleValidDate = (y, m, d) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
function cycleDayNumber(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : NaN; }
function cycleAddDays(iso, days) { const t = new Date((cycleDayNumber(iso) + days) * 86400000); return cycleIsoDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
const CYCLE_FULL_DATE = /(\d{4})\s*(?:년|[.\-/])\s*(\d{1,2})\s*(?:월|[.\-/])\s*(\d{1,2})\s*일?/g;
const CYCLE_MONTH_DAY = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;
/**
 * The story date of this reply. A date on a short or bracketed line (a status line) wins over one inside prose.
 * A date without a year takes the year of `previous`. A date before `previous` or more than a year after it is ignored.
 */
function storyDateFromText(text, previous = '') {
  const lines = String(text || '').split(/\r?\n/), found = [];
  lines.forEach((line, index) => {
    const status = line.trim().length <= 80 || /[\[\]【】|]/.test(line);
    const full = [...line.matchAll(CYCLE_FULL_DATE)];
    for (const m of full) if (cycleValidDate(+m[1], +m[2], +m[3])) found.push({ iso: cycleIsoDate(+m[1], +m[2], +m[3]), status, index });
    if (full.length) return;
    for (const m of line.matchAll(CYCLE_MONTH_DAY)) {
      const base = /^\d{4}/.exec(previous)?.[0]; if (!base) continue;
      let y = +base; if (!cycleValidDate(y, +m[1], +m[2])) continue;
      let iso = cycleIsoDate(y, +m[1], +m[2]); if (cycleDayNumber(iso) < cycleDayNumber(previous) - 180) iso = cycleIsoDate(++y, +m[1], +m[2]);
      found.push({ iso, status, index });
    }
  });
  const usable = found.filter(item => !previous || (cycleDayNumber(item.iso) >= cycleDayNumber(previous) && cycleDayNumber(item.iso) <= cycleDayNumber(previous) + 366));
  const pick = usable.find(item => item.status) || usable[0];
  return pick ? pick.iso : '';
}

// ---- the program section ----
const CYCLE_DATE_RE = '(\\d{4}-\\d{2}-\\d{2}|미정)';
/** Reads the section body. Returns null when it holds no cycle length (never set up, or edited beyond recognition). */
export function parseCycleBody(body) {
  const text = String(body || ''), length = +(/주기:\s*(\d{2})일/.exec(text)?.[1] || 0);
  if (!(length >= 21 && length <= 45)) return null;
  const start = new RegExp('기준일:\\s*' + CYCLE_DATE_RE).exec(text)?.[1] || '미정', date = new RegExp('날짜:\\s*' + CYCLE_DATE_RE).exec(text)?.[1] || '미정';
  const preg = /임신:\s*(\d{4}-\d{2}-\d{2}) 수정(?:\s*·\s*상대:\s*([^·\n]+?))?(?:\s*·\s*본인:\s*(앎|모름))?(?:\(|\s*$|\n)/m.exec(text);
  const birth = /최근 출산:\s*(\d{4}-\d{2}-\d{2})/.exec(text)?.[1] || '';
  return { length, start: start === '미정' ? '' : start, date: date === '미정' ? '' : date, conception: preg?.[1] || '', partner: (preg?.[2] || '').trim(), known: preg?.[3] === '앎', birth };
}
const CYCLE_PHASES = [['period', '생리 중'], ['after', '생리 끝남 · 임신 가능성 낮음'], ['fertile', '배란기 · 임신 가능성 높음'], ['luteal', '배란 지남 · 임신 가능성 낮음'], ['premenstrual', '생리 예정일 가까움']];
/** Cycle day (1-based) and phase on `date`, or null when either date is unknown. */
function cycleDay(state, date) {
  if (!state?.start || !date) return null;
  const diff = cycleDayNumber(date) - cycleDayNumber(state.start); if (!Number.isFinite(diff) || diff < 0) return null;
  const day = (diff % state.length) + 1, ovulation = state.length - 14;
  const phase = day <= 5 ? 'period' : day < ovulation - 4 ? 'after' : day <= ovulation + 1 ? 'fertile' : day <= state.length - 4 ? 'luteal' : 'premenstrual';
  return { day, offset: day - ovulation, phase, label: CYCLE_PHASES.find(([id]) => id === phase)[1] };
}
const PREGNANCY_STAGES = [[14, '수정 직후 · 아직 몸의 변화 없음'], [35, '생리 예정일이 지남'], [84, '입덧 시기'], [112, '입덧이 줄어듦'], [196, '배가 나오기 시작함 · 태동'], [266, '배가 많이 부름'], [Infinity, '출산 예정일 무렵']];
function pregnancyStage(conception, date) {
  const days = cycleDayNumber(date) - cycleDayNumber(conception); if (!Number.isFinite(days) || days < 0) return null;
  return { days, weeks: Math.floor(days / 7), label: PREGNANCY_STAGES.find(([limit]) => days < limit)[1] };
}
/** The status written on the 날짜 line. */
function cycleStatus(state, date = state?.date) {
  if (!date) return '날짜 미확인';
  if (state.conception) { const stage = pregnancyStage(state.conception, date); return stage ? '임신 ' + stage.weeks + '주 · ' + stage.label : '임신'; }
  if (state.birth && state.start && cycleDayNumber(date) < cycleDayNumber(state.start)) return '출산 후 회복 중';
  return cycleDay(state, date)?.label || '날짜 미확인';
}
export function formatCycleBody(state) {
  const lines = ['주기: ' + state.length + '일 · 생리 시작 기준일: ' + (state.start || '미정'), '날짜: ' + (state.date || '미정') + ' · ' + cycleStatus(state)];
  lines.push(state.conception ? '임신: ' + state.conception + ' 수정' + (state.partner ? ' · 상대: ' + state.partner : '') + ' · 본인: ' + (state.known ? '앎' : '모름(아직 임신 사실을 모름)') : '임신: 아님' + (state.birth ? ' · 최근 출산: ' + state.birth : ''));
  return lines.join('\n');
}
/** A new cycle: length 26~32, and the given date falls on a random day of it. */
function newCycleState(date, random = Math.random) {
  const length = 26 + Math.floor(random() * 7), day = Math.floor(random() * length);
  return { length, start: date ? cycleAddDays(date, -day) : '', date: date || '', conception: '', partner: '', known: false, birth: '' };
}

// ---- pregnancy chance ----
// Chance of conception from one act of unprotected intercourse, by day relative to ovulation (published day-specific estimates).
const CONCEPTION_BY_OFFSET = { '-5': 0.10, '-4': 0.16, '-3': 0.14, '-2': 0.27, '-1': 0.31, '0': 0.33, '1': 0.08 };
function conceptionChance(state, date, rate = 1) {
  const day = cycleDay(state, date); if (!day) return 0.05 * rate;
  return Math.min(0.95, (CONCEPTION_BY_OFFSET[String(day.offset)] ?? 0.01) * rate);
}

// ---- Writer markers ----
const CYCLE_MARKERS = [
  ['adult', /^\s*CYCLE\s*[:：]\s*adult\s*woman\s*$/i],
  ['sex', /^\s*SEX\s*[:：]\s*(.*?)\s*(?:\|\s*contraception\s*[:：]\s*([a-z]+))?\s*$/i],
  ['known', /^\s*PREGNANCY\s+KNOWN\s*$/i],
  ['birth', /^\s*BIRTH\s*$/i],
];
/** Removes marker lines from an entry text. Returns the cleaned text and what was reported. */
export function takeCycleMarkers(text) {
  const report = { adult: false, sex: [], known: false, birth: false }, kept = [];
  for (const line of String(text || '').split('\n')) {
    const hit = CYCLE_MARKERS.find(([, re]) => re.test(line));
    if (!hit) { kept.push(line); continue; }
    if (hit[0] === 'sex') { const m = hit[1].exec(line); report.sex.push({ partner: (m[1] || '').trim().slice(0, 60), protected: String(m[2] || '').toLowerCase() === 'used' }); }
    else report[hit[0]] = true;
  }
  const any = report.adult || report.sex.length || report.known || report.birth;
  return { text: any ? kept.join('\n').trim() : String(text || ''), report: any ? report : null };
}

/**
 * Next state of one woman. `previous` is the parsed section (or null), `report` what the Writer reported this turn (or null),
 * `date` the story date of this reply ('' when the reply has none). Returns { state, rolled } or null when nothing applies.
 */
export function nextCycleState(previous, report, date, { rate = 1, random = Math.random } = {}) {
  if (!previous && !(report && (report.adult || report.sex.length))) return null;
  const state = previous ? { ...previous } : newCycleState(date, random);
  if (date && (!state.date || cycleDayNumber(date) >= cycleDayNumber(state.date))) { if (!state.start) state.start = cycleAddDays(date, -Math.floor(random() * state.length)); state.date = date; }
  let rolled = null;
  if (report?.birth && state.conception) { const when = state.date || date; Object.assign(state, { conception: '', partner: '', known: false, birth: when || '' }); if (when) state.start = cycleAddDays(when, 42); }
  if (report?.known && state.conception) state.known = true;
  const unprotected = (report?.sex || []).filter(item => !item.protected);
  if (unprotected.length && !state.conception && !(state.birth && state.start && state.date && cycleDayNumber(state.date) < cycleDayNumber(state.start))) {
    const chance = conceptionChance(state, state.date, rate), roll = random();
    rolled = { chance, roll, pregnant: roll < chance };
    if (rolled.pregnant) Object.assign(state, { conception: state.date || date || '', partner: unprotected[unprotected.length - 1].partner, known: false });
  }
  return { state, rolled };
}

// ---- prompt blocks ----
const CYCLE_WRITER = [
  '[MENSTRUAL CYCLE · REPORT LINES]',
  'The user switched on cycle tracking. The program keeps each woman\'s cycle, decides by chance whether she becomes pregnant, and counts the pregnancy stages. You only report what the RP shows, as extra lines at the very end of that woman\'s core.current_state entry text. The program removes these lines before saving.',
  '- When you write core.current_state for a woman who is clearly an adult, add the line: CYCLE: adult woman',
  '- When the RP shows this woman having vaginal intercourse with a man in this turn, write her core.current_state and add one line per partner: SEX: <partner name> | contraception: used   (only when the RP clearly shows contraception) or SEX: <partner name> | contraception: none   (in every other case, including when contraception is not mentioned).',
  '- When she learns in this turn that she is pregnant: PREGNANCY KNOWN',
  '- When she gives birth in this turn: BIRTH',
  'Never add these lines for anyone who is not clearly an adult woman. Do not decide yourself whether she is pregnant and do not invent cycle days or due dates; the program does that. Other characters learning about a pregnancy is ordinary knowledge and goes to core.knowledge as usual.',
].join('\n');
const CYCLE_DIRECTOR = [
  '[MENSTRUAL CYCLE · PROGRAM RECORD]',
  'A Character section titled 월경·임신 is kept by the program and is fact. Its 날짜 line gives her body condition on that story date (period, fertile days, pregnancy week and stage).',
  'Use it for physical detail and mood only when it fits the scene. While it says 본인: 모름, she does not know she is pregnant: show only the bodily signs of that stage, and never let her or anyone say or think she is pregnant unless the RP establishes that they learned it.',
  'Do not change these facts, and do not move the pregnancy faster or slower than the stage given.',
].join('\n');
/** Block placed in front of the user-added rules of the stage, or '' when the option is off. */
export function cycleBlock(settings, stage) {
  if (!cycleTrackingOn(settings)) return '';
  return stage === 'writer' ? CYCLE_WRITER : stage === 'director' ? CYCLE_DIRECTOR : '';
}

/** Values the Writer apply step needs. `wikiScope` gives the latest story date already recorded. */
export function cycleContract(settings, rpText, wikiScope) {
  if (!cycleTrackingOn(settings)) return null;
  let latest = '';
  for (const document of Object.values(wikiScope?.documents || {})) for (const section of document.sections || []) if (section.provenance?.slotId === CYCLE_SLOT || section.heading === CYCLE_HEADING) { const date = parseCycleBody(section.body)?.date; if (date && (!latest || cycleDayNumber(date) > cycleDayNumber(latest))) latest = date; }
  return { rate: cycleRate(settings), date: storyDateFromText(rpText, latest) };
}
export const isCycleSection = section => section?.provenance?.slotId === CYCLE_SLOT || section?.heading === CYCLE_HEADING;
