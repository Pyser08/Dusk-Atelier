// 출처: risupot 2.3.0 src/speech-variety.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

//   off  = address and register only (as before)
//   one  = also record how the character speaks to this target and observed speech habits
//   two  = one + signs that the speech is shifting; the program counts the signs, and after three in the same direction
//          the address/register may change (asked first or automatic). An opposite sign starts the count again.
//          The number of signs needed is a user setting (1 to 9, default 3).
//          A setting below 3 is read as "let the AI decide": the program keeps no count and the Writer may change the speech
//          as soon as it judges that the relation has really changed.
// Turning 관계·호칭 off stops writing and passing on core.speech; stored entries stay and return when it is turned on again.
const SPEECH_VARIETY_LEVELS = ['off', 'one', 'two'];
const SPEECH_CHANGE_MODES = ['ask', 'auto'];
const SPEECH_SIGN_LIMIT = 3, SPEECH_SIGN_LIMIT_RANGE = Object.freeze({ min: 1, max: 9 });
/** How many signs in one direction are needed before the speech may change (the user sets it; default 3). */
export function speechSignLimit(settings) { const value = settings?.features?.register?.signLimit; return Number.isSafeInteger(value) && value >= SPEECH_SIGN_LIMIT_RANGE.min && value <= SPEECH_SIGN_LIMIT_RANGE.max ? value : SPEECH_SIGN_LIMIT; }
export function speechVarietyLevel(settings) { const register = settings?.features?.register; return !register || register.enabled === false ? 'off' : SPEECH_VARIETY_LEVELS.includes(register.variety) ? register.variety : 'off'; }
export function speechChangeMode(settings) { return settings?.features?.register?.change === 'auto' ? 'auto' : 'ask'; }
/** True only when 관계·호칭 is explicitly switched off; callers without that feature object keep the old behaviour. */
function speechRecordsOff(features) { return features?.register?.enabled === false; }

const SPEECH_VARIETY_WRITER_ONE = [
  '[SPEECH VARIETY · WRITER]',
  'The user switched on speech variety. These lines add to the core.speech rules above and win where they differ.',
  'In each core.speech entry, after the form of address and the register, also write, in Korean and only from dialogue this character actually spoke in the supplied RP:',
  '- what is different in how the character speaks to this target compared with other targets;',
  '- speech habits that were actually observed: sentence endings, sentence length and pace, recurring openers or interjections.',
  'You may quote one short line as an example. Keep the whole entry under 450 characters.',
  'If the character has not spoken to this target yet, write only the address and register. Never invent a habit, an ending or an example.',
  'Complete old entries: when a stored core.speech entry for a target holds only address and register (no difference toward this target, no speech habits), and the supplied RP contains dialogue this character speaks to that target, update that entry in this response to add those details. This is required and overrides the rule above that tells you to leave an unchanged core.speech entry alone.',
  'Completing an entry is not a register change: keep the stored form of address and honorific level exactly as they are.',
  'An entry that already lists speech habits is complete. Leave it alone unless the RP shows a clearly new habit that is not listed yet.',
].join('\n');
const SPEECH_VARIETY_WRITER_TWO = [
  'Speech change signs are also on.',
  'A sign is evidence in this scene that the way the character speaks to one target is starting to shift: closer (more relaxed, familiar, warmer) or more distant (stiffer, colder, more formal). Growing or broken closeness, a change of status or role, and a clear rise or fall of affinity all count when the RP shows them.',
  'When this scene gives a sign for a target, upsert that core.speech entry with its stored wording kept, and add one last line in exactly this form: SIGN closer: <reason in Korean, under 60 characters>  or  SIGN distant: <reason in Korean, under 60 characters>. At most one sign per target in one response. A scene without a sign needs no upsert.',
  'Do not put a SIGN line in the same upsert that completes an old entry with speech habits: when a SIGN line is present the program keeps the stored wording and drops the rest. Complete the entry first and report the sign in a later scene.',
  'Do not change the form of address or the honorific level because of a sign. The program counts the signs.',
  'Lines in square brackets that begin with 말투 변화 or 말투 변경 belong to the program. Never write, edit or remove them yourself.',
  'Only when the stored entry contains a line beginning with [말투 변경 가능 may you rewrite the address and register of that entry to fit the listed reasons and the current RP. If the RP does not support a change after all, write the entry again unchanged.',
].join('\n');
const SPEECH_VARIETY_DIRECTOR = [
  '[SPEECH VARIETY · DIRECTOR]',
  'core.speech entries may list speech habits and target-specific differences. Pass them to Main as tendencies of that character toward that target.',
  'Tell Main not to repeat a quoted example line and not to put the same habit into every line.',
  'A bracket line beginning with 말투 변화 조짐 is a count kept by the program: the address and register have not changed yet, only the warmth of the current scene may follow it. A line beginning with 말투 변경 승인 대기 also means no change yet.',
].join('\n');
// A sign limit below 3 means the user leaves the decision to the AI: nothing is counted and nothing is asked.
const SPEECH_VARIETY_WRITER_TWO_FREE = [
  'Speech change by your own judgment is also on.',
  'When the RP shows that closeness, status or role, or affinity toward a target has really changed, you may update the form of address and the register of that core.speech entry in the same response, without waiting for a second scene. Write the reason for the change in the entry in Korean.',
  'A passing mood, a joke or one angry line is still not a change.',
].join('\n');
function speechSignsCounted(settings) { return speechSignLimit(settings) >= SPEECH_SIGN_LIMIT; }
/** Built-in rule block for one stage, or '' when the option is off. */
export function speechVarietyBlock(settings, stage) {
  const level = speechVarietyLevel(settings); if (level === 'off') return '';
  if (stage === 'writer') return SPEECH_VARIETY_WRITER_ONE + (level === 'two' ? '\n' + (speechSignsCounted(settings) ? SPEECH_VARIETY_WRITER_TWO : SPEECH_VARIETY_WRITER_TWO_FREE) : '');
  if (stage === 'director') return SPEECH_VARIETY_DIRECTOR;
  return '';
}

// Manual AI writing (one item, the whole person, the thorough pass, a direct instruction) follows the same level.
// It never counts signs: the count belongs to the automatic Writer, so program lines are only kept in place here.
const SPEECH_VARIETY_MANUAL_ONE = [
  '[SPEECH VARIETY · MANUAL WRITING]',
  'The user switched on speech variety. When this request writes or rewrites a speech entry (말투, core.speech) of the selected character, these lines apply.',
  'After the form of address and the register, also write, in Korean and only from dialogue this character actually spoke in the supplied sources:',
  '- what is different in how the character speaks to this target compared with other targets;',
  '- speech habits that were actually observed: sentence endings, sentence length and pace, recurring openers or interjections.',
  'You may quote one short line as an example. Keep one entry under 450 characters.',
  'If the sources hold no dialogue from this character toward that target, write only the address and register. Never invent a habit, an ending or an example.',
  'A stored entry that has only address and register should be completed with these details when the sources show them; keep its address and honorific level unless the instruction or the sources clearly establish a change.',
].join('\n');
const SPEECH_VARIETY_MANUAL_TWO_COUNTED = 'A last line in square brackets that begins with 말투 변화 or 말투 변경 is a count kept by the program. Copy such a line unchanged as the last line of that entry, and never write a new one. Only when the stored entry has a line beginning with [말투 변경 가능 may you also rewrite its address and register to fit the listed reasons.';
const SPEECH_VARIETY_MANUAL_TWO_FREE = 'When the sources show that closeness, status or role, or affinity toward the target has really changed, you may also update the form of address and the register of that entry, and write the reason in Korean. A passing mood, a joke or one angry line is not a change.';
/** Block placed in front of a manual AI prompt, ending with a blank line, or '' when the option is off. */
export function speechVarietyManualBlock(settings) {
  const level = speechVarietyLevel(settings); if (level === 'off') return '';
  return SPEECH_VARIETY_MANUAL_ONE + (level === 'two' ? '\n' + (speechSignsCounted(settings) ? SPEECH_VARIETY_MANUAL_TWO_COUNTED : SPEECH_VARIETY_MANUAL_TWO_FREE) : '') + '\n\n';
}

// ---- sign count kept as the last line of a core.speech body, written only by the program ----
const SPEECH_DIRECTIONS = { closer: '가까워짐', distant: '멀어짐' };
const SPEECH_STATES = { '변화 조짐': 'count', '변경 가능': 'ready', '변경 승인 대기': 'pending' };
const SPEECH_MARKER_LINE = /^\[말투 (변화 조짐|변경 가능|변경 승인 대기) (가까워짐|멀어짐)(?: ([1-9])\/[1-9])?\](.*)$/;
const SPEECH_SIGN_LINE = /^\s*SIGN\s+(closer|distant)\s*[:：]\s*(.*)$/i;
const speechReason = text => String(text || '').replace(/[\[\]\/\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
function parseSpeechMarker(body) {
  const lines = String(body || '').split('\n'); let marker = null; const rest = [];
  for (const line of lines) { const match = line.trim().match(SPEECH_MARKER_LINE); if (match) marker = { state: SPEECH_STATES[match[1]], direction: match[2], count: match[1] === '변화 조짐' ? Number(match[3] || 1) : 0, reasons: match[4].split(' / ').map(speechReason).filter(Boolean) }; else rest.push(line); }
  return { base: rest.join('\n').trim(), ...(marker || { state: 'none', direction: '', count: 0, reasons: [] }) };
}
function formatSpeechMarker({ state, direction, count, reasons }, limit = SPEECH_SIGN_LIMIT) {
  if (!['count', 'ready', 'pending'].includes(state) || !direction) return '';
  const head = state === 'count' ? `[말투 변화 조짐 ${direction} ${Math.max(1, count)}/${limit}]` : state === 'ready' ? `[말투 변경 가능 ${direction}]` : `[말투 변경 승인 대기 ${direction}]`;
  return head + (reasons?.length ? ' ' + reasons.slice(-SPEECH_SIGN_LIMIT_RANGE.max).join(' / ') : '');
}
const joinSpeech = (base, marker) => [String(base || '').trim(), marker].filter(Boolean).join('\n');
/** Final body for a Writer upsert of core.speech. previousBody is '' for a new entry. */
export function applySpeechSign(previousBody, nextText, { level = 'off', mode = 'ask', limit = SPEECH_SIGN_LIMIT } = {}) {
  if (level !== 'two') return nextText;
  // Below 3 the AI decides by itself: no count is kept, and a stray SIGN or program line is simply dropped.
  if (limit < SPEECH_SIGN_LIMIT) return String(nextText || '').split('\n').filter(line => !line.match(SPEECH_SIGN_LINE) && !line.trim().match(SPEECH_MARKER_LINE)).join('\n').trim();
  const previous = parseSpeechMarker(previousBody); let sign = null; const kept = [];
  for (const line of String(nextText || '').split('\n')) { const match = line.match(SPEECH_SIGN_LINE); if (match) { if (!sign) sign = { direction: SPEECH_DIRECTIONS[match[1].toLowerCase()], reason: speechReason(match[2]) }; } else if (!line.trim().match(SPEECH_MARKER_LINE)) kept.push(line); }
  const nextBase = kept.join('\n').trim();
  if (previous.state === 'ready') return nextBase;                                       // the permitted change was written; the count starts over
  if (previous.state === 'pending') return joinSpeech(sign ? previous.base || nextBase : nextBase, formatSpeechMarker(previous, limit)); // waiting for the user's answer
  if (!sign) return joinSpeech(nextBase, formatSpeechMarker(previous, limit));
  const same = previous.state === 'count' && previous.direction === sign.direction, count = same ? previous.count + 1 : 1, reasons = [...(same ? previous.reasons : []), sign.reason].filter(Boolean).slice(-SPEECH_SIGN_LIMIT_RANGE.max);
  const state = count >= limit ? (mode === 'auto' ? 'ready' : 'pending') : 'count';
  // A sign never changes the stored wording; only a new entry takes the text the model sent.
  return joinSpeech(String(previousBody || '').trim() ? previous.base : nextBase, formatSpeechMarker({ state, direction: sign.direction, count, reasons }, limit));
}
/** The user's answer to a pending change: approve lets the Writer change it next turn, reject clears the count. */
function decideSpeechPending(body, approve) {
  const parsed = parseSpeechMarker(body); if (parsed.state !== 'pending') return String(body || '');
  return approve ? joinSpeech(parsed.base, formatSpeechMarker({ ...parsed, state: 'ready' })) : parsed.base;
}
function speechPending(body) { return parseSpeechMarker(body).state === 'pending'; }
