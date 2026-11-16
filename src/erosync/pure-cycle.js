// addon-rebuild 4단계: Erosync 순수 조각 — 생리 주기 계산. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { fnv1a } from "./pure-util.js";

// 생리 주기의 인물 값. 단서가 없으면 기준값(자료의 평균형: 약한 월경 전 변화 · 생리적 변동 · 짜증형 · 경증 증상)을 쓴다.
// 기분 수치는 저장하지 않는다. 분석은 유형만 고르고 시기별 몸·기분은 플러그인이 표로 계산한다(cyclePhaseProfile).
// 이미 저장된 증상 0은 그대로 두고, 새로 생긴 값만 기준값으로 채운다.
export const CYCLE_PREMENSTRUAL_TYPES = Object.freeze(['none', 'mild', 'strong', 'midcycle', 'positive']);

export const CYCLE_CLINICAL_LEVELS = Object.freeze(['physiological', 'pms', 'pmdd', 'pme']);

export const CYCLE_AFFECT_TYPES = Object.freeze(['irritable', 'anxious', 'sensitive', 'sad']);

export const CYCLE_DISCLOSURES = Object.freeze(['hidden', 'close', 'open']);

export const CYCLE_SYMPTOM_DEFAULTS = Object.freeze({ pain: 35, fatigue: 35, sensitivity: 25, discomfort: 35 });

export const CYCLE_EVENT_SYMPTOM_DEFAULTS = Object.freeze({ pain: 0, fatigue: 0, sensitivity: 0, discomfort: 0 });

// ---- 생리 주기 2차(2026-10-13, Erosync.Cycle-Second.Work-Plan.md · 근거 reports\생리 2차 보충 조사.md) ----
// 임신 의향 5단계(−2 강하게 피함 ~ +2 강하게 원함, 없음 = 모름), 늦음·관계·확인 기록과 걱정 세기, 원인별 기본 기간,
// 피임 방법, 폐경 이행, 한때의 지연, 날짜 곡선·시기 아형. 새 값은 모두 비어 있으면 지금 동작이다(옛 채팅·프로필은 그대로 읽힌다).
// 플러그인은 날짜와 사실만 계산한다. 임신은 이야기가 정하며 플러그인이 임신·출산을 만들지 않는다.
export const CYCLE_METHODS = Object.freeze(['pill', 'continuous', 'minipill', 'injection', 'implant', 'iud']);

export const CYCLE_NO_BLEED_METHODS = Object.freeze(['continuous', 'minipill', 'injection', 'implant']);

export const CYCLE_TRANSITIONS = Object.freeze(['early', 'late']);

export const CYCLE_TIMING_TYPES = Object.freeze(['week', 'luteal', 'lingering']);

export const CYCLE_CAUSES = Object.freeze(['pregnancy', 'contraception', 'energy_deficit', 'birth', 'weaning', 'loss', 'stopped_contraception', 'recovered', 'menopause', 'other']);

export const CYCLE_NURSING = Object.freeze(['full', 'partial', 'none']);

export const CYCLE_EVENT_TYPES = Object.freeze(['pause', 'wait', 'resume', 'end', 'change', 'symptoms', 'intent', 'exposure', 'check', 'delay']);

export const CYCLE_INTENT_NAMES = Object.freeze({ '-2': 'strongly avoid', '-1': 'lean avoid', 0: 'mixed or indifferent', 1: 'lean seek', 2: 'strongly seek' });

export const CYCLE_LEGACY_INTENT = Object.freeze({ avoid: -2, seek: 2, unspecified: 0 });

// 이야기에 일정이 없을 때 쓰는 기본 기간(첫 월경까지 일수의 분위점 [누적 확률, 일]).
// 출산: 수유 안 함 중앙 약 8주, 완전 수유 중앙 약 8개월, 부분·모름 중앙 약 4개월 / 젖 뗌 중앙 약 3주 / 유산·종결 13주 미만 중앙 약 5주
// 저에너지 회복 뒤 중앙 약 9개월 / 피임을 끊은 뒤: 알약 2~3일 뒤 소퇴 출혈, 프로게스틴 알약·임플란트 약 4~6주, 주사 중앙 약 4~5개월, 자궁 내 장치 1개월 74%
export const CYCLE_RESUME_DAYS = Object.freeze({
  birth_none: [[0, 35], [0.5, 56], [0.9, 91], [1, 182]],
  birth_full: [[0, 56], [0.1, 150], [0.5, 240], [0.9, 330], [1, 730]],
  birth_partial: [[0, 42], [0.1, 60], [0.5, 120], [0.9, 240], [1, 365]],
  nursing_reduced: [[0, 45], [0.1, 60], [0.5, 90], [0.9, 120], [1, 150]],
  weaning: [[0, 10], [0.5, 21], [0.8, 28], [0.93, 56], [1, 84]],
  loss_early: [[0, 21], [0.1, 28], [0.5, 35], [0.9, 56], [1, 90]],
  loss_mid: [[0, 28], [0.5, 42], [1, 70]],
  recovered: [[0, 120], [0.1, 180], [0.5, 270], [0.67, 365], [0.9, 540], [1, 730]],
  stop_pill: [[0, 2], [1, 3]],
  stop_minipill: [[0, 21], [0.5, 35], [1, 49]],
  stop_implant: [[0, 21], [0.5, 35], [1, 56]],
  stop_injection: [[0, 30], [0.1, 45], [0.5, 135], [0.9, 240], [1, 300]],
  stop_iud: [[0, 10], [0.74, 30], [0.95, 60], [1, 120]],
});

export const cycleHash = text => parseInt(fnv1a(String(text)), 16);

export function cycleSeededDays(seed, table) {
  const u = cycleHash(seed) % 10000 / 10000;
  for (let i = 1; i < table.length; i += 1) {
    const [p0, d0] = table[i - 1], [p1, d1] = table[i];
    if (u <= p1) return Math.round(d0 + (d1 - d0) * (p1 > p0 ? (u - p0) / (p1 - p0) : 0));
  }
  return table[table.length - 1][1];
}

export function cycleResumeTableKey(cause, { nursing = '', lossWeeks = 0, method = '', previous = null } = {}) {
  if (cause === 'birth' || (cause === 'loss' && lossWeeks >= 20)) {
    if (previous?.status === 'waiting' && previous.cause === 'birth' && previous.nursing === 'full' && nursing === 'partial') return 'nursing_reduced';
    if (previous?.status === 'waiting' && previous.cause === 'birth' && ['full', 'partial'].includes(previous.nursing) && nursing === 'none') return 'weaning';
    return nursing === 'none' ? 'birth_none' : nursing === 'full' ? 'birth_full' : 'birth_partial';
  }
  if (cause === 'weaning') return 'weaning';
  if (cause === 'loss') return lossWeeks >= 13 ? 'loss_mid' : 'loss_early';
  if (cause === 'recovered') return 'recovered';
  if (cause === 'stopped_contraception') return ({ pill: 'stop_pill', continuous: 'stop_pill', minipill: 'stop_minipill', implant: 'stop_implant', injection: 'stop_injection', iud: 'stop_iud' })[method || 'pill'];
  return '';
}

export function cycleIntentLevel(raw) {
  const number = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  return Number.isInteger(number) && number >= -2 && number <= 2 ? number : null;
}

// 대화에서 밝힌 의향(옛 피함·원함은 ±2, 미정은 0으로 읽는다). 모르면 null.
export function cycleActorIntentLevel(value) {
  if (!value?.intentKnown) return null;
  if (Number.isInteger(value.intentLevel)) return value.intentLevel;
  return CYCLE_LEGACY_INTENT[value.pregnancyIntent] ?? null;
}

// 이 상대에 대한 의향: 대화(그 상대) > 대화(모두) > 분석(모두). 대화의 의향이 다른 상대를 향하면 분석값을 쓴다.
export function cycleIntentToward(cycle, target = '') {
  const value = cycle.value, chat = cycleActorIntentLevel(value);
  if (chat !== null && (!value.intentTarget || (target && value.intentTarget === target))) return chat;
  return Number.isInteger(cycle.settings.intentLevel) ? cycle.settings.intentLevel : null;
}

// 후기 이행기: 주기마다 약 1/4 확률로 30~90일이 더해진다(60일 넘는 공백).
export function cycleTransitionGap(seed, number) {
  const hash = cycleHash(`${seed}:${number}`);
  return hash % 100 < 25 ? 30 + Math.floor(hash / 256) % 61 : 0;
}

// 걱정·기대의 세기(0~3, 플러그인 계산). 관계 기록은 그녀가 아는 것만 쓴다.
export function cycleConcern(cycle) {
  const known = cycle.knownExposures || [], latest = known.at(-1), check = cycle.value.check;
  const recentNegative = check?.result === 'not_pregnant' && cycle.sinceMinute !== null && check.minute >= cycle.sinceMinute && cycle.clock.minutes - check.minute < 3 * 1440;
  const kindOf = intent => intent === null ? 'unsure' : intent < 0 ? 'worry' : intent > 0 ? 'hope' : 'mixed';
  if (cycle.lateNoticed) {
    const since = cycle.lateNoticed - cycle.noticeAt;
    if (!latest) { const level = since >= 21 ? 2 : since >= 7 ? 1 : 0; return level ? { kind: 'health', level } : null; }
    const intent = cycleIntentToward(cycle, latest.knowsPartner ? latest.target || '' : '');
    let cap = intent !== null && Math.abs(intent) === 2 ? 3 : 2;
    if (known.every(entry => entry.protected === true)) cap = Math.max(1, cap - 1);
    const level = Math.min(since <= 1 ? 1 : since <= 5 ? 2 : 3, cap) - (recentNegative ? 1 : 0);
    return level > 0 ? { kind: kindOf(intent), level } : null;
  }
  if (cycle.value.status !== 'active') return null;
  if (latest && cycle.awareNextPeriod && cycle.expectedDueIn >= 1 && cycle.expectedDueIn <= 4 && !recentNegative) {
    const intent = cycleIntentToward(cycle, latest.knowsPartner ? latest.target || '' : '');
    if (intent !== null && intent > 0) return { kind: 'hope', level: 1 };
  }
  const previous = (cycle.previousExposures || []).at(-1);
  if (previous && ['menstrual_early', 'menstrual_late'].includes(cycle.phase)) {
    const intent = cycleIntentToward(cycle, previous.knowsPartner ? previous.target || '' : ''), day = cycle.day;
    if (intent === null) return day === 1 ? { kind: 'unsure', level: 1 } : null;
    if (intent < 0) return day === 1 ? { kind: 'relief', level: intent === -2 ? 2 : 1 } : null;
    if (intent > 0) return intent === 2 ? (day <= 3 ? { kind: 'disappointment', level: 2 } : null) : (day <= 2 ? { kind: 'disappointment', level: 1 } : null);
    return day <= 2 ? { kind: 'mixed', level: 1 } : null;
  }
  return null;
}

// 임신 중 몸 신호(마지막 월경부터 주수). 신호가 있고 없음과 세기는 인물마다 고정 난수(자료의 빈도).
export function cyclePregnancySigns(cycle) {
  const weeks = cycle.weeks;
  if (weeks === null || weeks < 4) return [];
  const roll = key => cycleHash(`${cycle.seed}:preg:${cycle.value.lastOnsetMinute}:${key}`) % 1000 / 1000;
  const out = [], add = (en, ko) => out.push({ en, ko });
  const severity = (r => r < 0.4 ? ['mild', '가벼움'] : r < 0.86 ? ['moderate', '중등도'] : ['severe', '심함'])(roll('severity'));
  const nauseaStart = roll('early') < 0.25 ? 4 : roll('start') < 0.5 ? 5 : 6;
  const nauseaEnd = (r => r < 0.5 ? 12 + Math.floor(roll('end1') * 3) : r < 0.9 ? 15 + Math.floor(roll('end2') * 6) : 21 + Math.floor(roll('end3') * 4))(roll('end'));
  if (roll('nausea') < 0.7 && weeks >= nauseaStart && weeks < nauseaEnd) {
    if (weeks >= 8 && weeks <= 10) add(`nausea (${severity[0]}, at its worst)`, `메스꺼움 · ${severity[1]} · 가장 심함`);
    else if (weeks >= 13) add(`nausea (${severity[0]}, easing)`, `메스꺼움 · ${severity[1]} · 줄어드는 중`);
    else add(`nausea (${severity[0]})`, `메스꺼움 · ${severity[1]}`);
  }
  if (weeks <= 16 && roll('tired') < 0.9) add('tiredness', '피로');
  if (weeks <= 14 && roll('breast') < 0.77) add('breast tenderness', '가슴 통증');
  if (weeks >= 5 && weeks <= 14 && roll('urine') < 0.68) add('needing to pee more often', '잦은 소변');
  if (weeks >= 5 && weeks <= 14 && roll('smell') < 0.56) add('sensitive to smells', '냄새 민감');
  if (weeks === 4 && roll('spot') < 0.1) add('light spotting around the expected period', '예정일 무렵 적은 출혈');
  const belly = 14 + Math.floor(roll('belly') * 7), quick = 16 + Math.floor(roll('quick') * 6);
  if (weeks >= belly) add(weeks >= 22 ? 'belly clearly showing' : 'belly starting to show', weeks >= 22 ? '배가 뚜렷이 보임' : '배가 보이기 시작함');
  if (weeks >= quick) add(weeks >= quick + 2 ? 'feels the baby move' : 'first faint fluttering movements', weeks >= quick + 2 ? '태동' : '첫 태동(희미함)');
  if (weeks >= 37) add('at term', '만기');
  return out.slice(0, 7);
}

export function cycleIntentContext(cycle) {
  const value = cycle.value, chat = cycleActorIntentLevel(value);
  const level = chat !== null ? chat : cycle.settings.intentLevel;
  if (!Number.isInteger(level)) return {};
  return { pregnancyIntent: { level, meaning: CYCLE_INTENT_NAMES[level], toward: chat !== null && value.intentTarget ? value.intentTarget : 'everyone',
    source: chat !== null ? 'story' : 'profile', ...(chat !== null && value.intentEvidence ? { evidence: value.intentEvidence } : {}) } };
}

// 그녀가 아는 관계·걱정·최근 확인 결과(NSFW)
export function cycleConceptionContext(cycle) {
  const known = cycle.knownExposures || [], latest = known.at(-1), out = {};
  if (latest) {
    out.possibleConception = { partner: latest.knowsPartner && latest.target ? latest.target : 'unknown', protected: latest.protected === null ? 'unknown' : latest.protected,
      daysAgo: Math.max(0, Math.floor((cycle.clock.minutes - latest.minute) / 1440)), ...(known.length > 1 ? { times: known.length } : {}) };
  }
  const concern = cycleConcern(cycle);
  if (concern) out.periodConcern = concern;
  const check = cycle.value.check;
  if (check && cycle.sinceMinute !== null && check.minute >= cycle.sinceMinute) {
    out.lastCheck = { result: check.result, daysAgo: Math.max(0, Math.floor((cycle.clock.minutes - check.minute) / 1440)), ...(check.means ? { means: check.means } : {}) };
  }
  return out;
}

// 진폭 설정. 몸 세기와 평균형보다 강한 개인차에만 곱한다(cyclePhaseProfile).
export const CYCLE_AMPLITUDES = Object.freeze({ low: 0.6, normal: 1, high: 1.5 });

export function cycleAmplitudeFactor(config) {
  return CYCLE_AMPLITUDES[config?.cycleAmplitude] || 1;
}

// 시기별 몸 계수(인물 증상값 × 계수). 배란통은 넣지 않는다. steady는 호르몬 피임의 평탄 구간이다.
export const CYCLE_BODY_FACTORS = Object.freeze({
  menstrual_early: { pain: 1, fatigue: 0.7, discomfort: 0.5 },
  menstrual_late: { pain: 0.4, fatigue: 0.4 },
  follicular: {}, periovulatory: {}, steady: {},
  luteal: { discomfort: 0.4 },
  premenstrual: { fatigue: 0.8, sensitivity: 1, discomfort: 1 },
});

// 주기 n의 시작 위치 흔들림(일). 채팅·인물·주기 번호로 정한 고정값이라 되돌리기나 다시 그리기에서 같은 값이 나온다.
// 시작일을 ±1(불규칙 ±2) 흔들면 주기 길이는 ±2(불규칙 ±4) 흔들린다. 기준점이 있는 0번 주기의 시작은 흔들지 않는다.
export function cycleStartShift(seed, number, swing) {
  if (!swing || number === 0) return 0;
  return parseInt(fnv1a(`${seed}:${number}`), 16) % (swing * 2 + 1) - swing;
}

// 6구간: 월경 1~2일 / 월경 3일~끝 / 난포기(월경 뒤~배란 3일 전) / 배란 −2~+1 / 황체기(배란 +2 ~ 월경 −8) / 월경 전(월경 −7~−1).
export function cyclePhaseFor(day, bleedingDays, ovulation, length, hormonal) {
  if (day <= Math.min(2, bleedingDays)) return 'menstrual_early';
  if (day <= bleedingDays) return 'menstrual_late';
  if (hormonal) return 'steady';
  if (day >= ovulation - 2 && day <= ovulation + 1) return 'periovulatory';
  if (day >= length - 6) return 'premenstrual';
  return day < ovulation ? 'follicular' : 'luteal';
}

// 시기별 기분·활력·사교 기준표. 강한 월경 전 변화형(배율 1)이 기준이고 평균형(약한 변화형 0.5)은 그 절반을 0 쪽으로 반올림한다.
// 그래서 평균형은 월경 전·월경 초에 정서 1·활력 -1·사교 -1, 배란기 전후에 긍정 1·활력 +1, 나머지는 0이 된다.
// 기분 4축(짜증·불안·예민·슬픔)은 0 없음 ~ 3 심함, 활력 -3 ~ +1, 사교 -2 ~ 0, 손상 0 ~ 3.
// affect 행(월경 전·월경 초의 부정 정서 묶음)은 인물의 정서 유형이 정점을 가진다. 황체기 예민(거절 민감)은 시기 고유의 작은 변화로 둔다.
export const CYCLE_MOOD_ROWS = Object.freeze({
  menstrual_early: { mood: { irritable: 2, anxious: 0, sensitive: 1, sad: 1 }, energy: -2, social: -2, positive: 0, affect: true },
  menstrual_late: { mood: { irritable: 1, anxious: 0, sensitive: 0, sad: 0 }, energy: -1, social: 0, positive: 0 },
  follicular: { mood: { irritable: 0, anxious: 0, sensitive: 0, sad: 0 }, energy: 0, social: 0, positive: 0 },
  periovulatory: { mood: { irritable: 0, anxious: 0, sensitive: 0, sad: 0 }, energy: 2, social: 0, positive: 2 },
  luteal: { mood: { irritable: 0, anxious: 0, sensitive: 1, sad: 0 }, energy: 0, social: 0, positive: 0 },
  premenstrual: { mood: { irritable: 2, anxious: 0, sensitive: 1, sad: 1 }, energy: -2, social: -2, positive: 0, affect: true, premenstrual: true },
  steady: { mood: { irritable: 0, anxious: 0, sensitive: 0, sad: 0 }, energy: 0, social: 0, positive: 0 },
});

export const CYCLE_TYPE_SCALE = Object.freeze({ none: 0, mild: 0.5, strong: 1, midcycle: 0.5, positive: 0.5 });

export const CYCLE_CLINICAL_SCALE = Object.freeze({ physiological: 1, pms: 1.3, pmdd: 2, pme: 2 });

export const CYCLE_CLINICAL_IMPAIRMENT = Object.freeze({ physiological: 0, pms: 1, pmdd: 2, pme: 2 });

// 0.5는 0 쪽으로 반올림한다(평균형의 반 단계는 드러내지 않는다).
export const cycleLevel = number => Math.sign(number) * Math.max(0, Math.ceil(Math.abs(number) - 0.5));

// SFW 거친 시기 라벨. 배란·가임이라는 말이 드러나지 않는다.
export const CYCLE_SFW_PHASE_LABELS = Object.freeze({ menstrual_early: 'menstruating', menstrual_late: 'menstruating', follicular: 'post-menstrual',
  periovulatory: 'late follicular', luteal: 'luteal', premenstrual: 'premenstrual', steady: 'steady' });
