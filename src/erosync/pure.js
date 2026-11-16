// addon-rebuild 4단계: Erosync 엔진에서 떼어 낸 순수 조각(상수·값 정리·자료 변환·제공자 요청 모양 등).
// 엔진 상태(저장소·api·실행 중 상태)를 쓰지 않는 것만 원본 erosync.js 순서·글자 그대로 옮겼다(tools 없이 eslint-scope로 자동 판정).
// 고칠 때는 이 파일을 고친다. 주제별로 더 나누는 건 다음 조각에서.
import { clampInt, clampNumber, fnv1a, isPlainObject, latestStringList, normalizeStringList, safeClone, safeKeyPart, truncate } from "./pure-util.js";
import { ANALYSIS_EXECUTION_FIELD_LIMIT, ANALYSIS_EXECUTION_HISTORY_LIMIT, ANALYSIS_EXECUTION_RESULT_BYTES, ANALYSIS_EXECUTION_RESULT_LIMIT, ANALYSIS_WORKFLOWS, BEHIND_KEY_PREFIX, COMMIT_JOURNAL_LIMIT, COMMIT_UNDO_DEPTH, DEVELOPMENT_SCHEMA, EMERGENCY_UNLIMITED_CAP_MS, EXTERNAL_CONTEXT_MAX_ITEMS, INJECTION_START, LEGACY_SESSION_PREFIX, MAX_ACTIONS_PER_TURN, MAX_INJECTION_CHARS, PAIR_CONTACT_LIMIT, RELATION_CHANGE_FIELDS, SCHEMA_VERSION, SCOPE_CATALOG_SCHEMA, SESSION_KEY_PREFIX, VERSION, normalizeContentMode, relationChangePlanningSettings } from "./pure-config.js";
import { PROVIDER_DEFS, resolveRoleProfile, risupotRecordText } from "./pure-provider.js";
import { isAssetMaidInternalLore } from "./pure-source.js";
import { CYCLE_AFFECT_TYPES, CYCLE_CAUSES, CYCLE_CLINICAL_LEVELS, CYCLE_DISCLOSURES, CYCLE_EVENT_SYMPTOM_DEFAULTS, CYCLE_METHODS, CYCLE_NURSING, CYCLE_PREMENSTRUAL_TYPES, CYCLE_RESUME_DAYS, CYCLE_SYMPTOM_DEFAULTS, CYCLE_TIMING_TYPES, CYCLE_TRANSITIONS, cycleHash, cycleIntentLevel, cycleResumeTableKey, cycleSeededDays, cycleStartShift } from "./pure-cycle.js";
import { SEXUAL_RUNG_DIRECTOR, isNonActingMainProfile, normalizeBaseRelation, normalizeBehavior, normalizeEntityVerdict, normalizeGenderIdentity, normalizeGoalPlan, normalizeGoalType, normalizeSexualTarget, sexAxisValueOf, sexualTargetPlanningSettings } from "./pure-profile.js";
import { kocoCheckpoint, normalizeKocoRefs, stripKocoArtifacts } from "./pure-koco.js";

export const MAX_PROFILE_CHARACTERS = 2000;

export function mapGeneration(map, key) {
  return clampInt(map.get(String(key || '')) || 0, 0, 0, 1000000000);
}

export function staleLifecycleError(stage = 'background task') {
  const error = new Error(`stale ${stage} discarded after reset or unload`);
  error.code = 'EROSYNC_STALE_LIFECYCLE';
  return error;
}

export function isStaleLifecycleError(error) {
  return String(error?.code || '').startsWith('EROSYNC_STALE_')
    || error?.code === 'EROSYNC_RISU_PREEMPTED';
}

export function scheduleUiRefresh(delay = 80) { /* Dusk 이식: 원본 화면 연결 끊음 */ }

export function uiWorkSchedule() { /* Dusk 이식: 원본 화면 연결 끊음 */ }

export const PAIR_CONTACT_SUMMARY = 200;

export function pairContactForDirector(state, candidateIds, policy = null) {
  const allowed = new Set([...(Array.isArray(candidateIds) ? candidateIds : []), 'user']);
  const sfw = policy?.contentMode === 'sfw';
  const turnIndex = clampInt(state?.turnIndex, 0, 0, 100000000);
  const pairs = [];
  const seen = new Set();
  const push = (actor, target) => {
    if (!actor || !target || actor === target || actor === 'user' || !allowed.has(actor) || !allowed.has(target)) return;
    const key = relationKey(actor, target);
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push([actor, target]);
  };
  if (!sfw) {
    Object.values(isPlainObject(state?.sexualTargets) ? state.sexualTargets : {})
      .filter(item => isPlainObject(item)).sort((a, b) => clampInt(b.desire, 0, 0, 100) - clampInt(a.desire, 0, 0, 100))
      .forEach(item => push(item.actor, item.target));
  }
  Object.values(isPlainObject(state?.goals) ? state.goals : {})
    .filter(goal => isPlainObject(goal) && !['complete', 'abandon'].includes(goal.status)).sort((a, b) => clampInt(b.priority, 50, 0, 100) - clampInt(a.priority, 50, 0, 100))
    .forEach(goal => push(goal.actor, goal.target));
  const history = Array.isArray(state?.interactionHistory) ? state.interactionHistory : [];
  const ledgers = isPlainObject(state?.interactionLedger) ? state.interactionLedger : {};
  const count = value => clampInt(value, 0, 0, 100000000);
  const rows = pairs.slice(0, PAIR_CONTACT_LIMIT).map(([actor, target]) => {
    const ledger = isPlainObject(ledgers[relationKey(actor, target)]) ? ledgers[relationKey(actor, target)] : null;
    let lastActual = null;
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const event = history[index];
      if (!isPlainObject(event) || event.type !== 'observed_action' || !['executed', 'partially_executed'].includes(String(event.result || ''))) continue;
      const forward = event.actor === actor && event.target === target;
      const reverse = event.actor === target && event.target === actor;
      if (!forward && !reverse) continue;
      const turn = count(event.turn);
      lastActual = { turn, turnsAgo: Math.max(0, turnIndex - turn), by: String(event.actor), mode: String(event.mode || ''), summary: truncate(event.summary, PAIR_CONTACT_SUMMARY) };
      break;
    }
    if (!lastActual && ledger && count(ledger.lastActualTurn) > 0) {
      const turn = count(ledger.lastActualTurn);
      lastActual = { turn, turnsAgo: Math.max(0, turnIndex - turn), by: actor, mode: '' };
    }
    return {
      actor, target,
      firstTurn: ledger ? count(ledger.firstTurn) : 0,
      lastActual,
      ran: ledger ? count(ledger.actualCount) : 0,
      partly: ledger ? count(ledger.partialCount) : 0,
      notRun: ledger ? count(ledger.detailOnlyCount) : 0,
    };
  });
  return sfwDirectorView(rows, policy);
}

// 자르기 사다리에서 짝 줄의 요약만 줄이거나(①) 뺀다(⑤). 턴·횟수는 남는다.
export function trimPairContact(rows, summaryChars) {
  return (Array.isArray(rows) ? rows : []).map(row => {
    if (!isPlainObject(row?.lastActual)) return row;
    const { summary, ...rest } = row.lastActual;
    return { ...row, lastActual: summaryChars > 0 && summary ? { ...rest, summary: truncate(summary, summaryChars) } : rest };
  });
}

export function classifyStoredValue(raw) {
  if (raw === null || raw === undefined) return { status: 'missing', value: null, raw, error: null };
  if (typeof raw !== 'string') return { status: 'ok', value: raw, raw, error: null };
  try {
    return { status: 'ok', value: JSON.parse(raw), raw, error: null };
  } catch (error) {
    return { status: 'malformed', value: null, raw, error };
  }
}

export async function readStorageState(store, key) {
  try {
    return classifyStoredValue(await store.getItem(key));
  } catch (error) {
    return { status: 'read_failed', value: null, raw: null, error };
  }
}

export function storageReadError(key, state, detail = '') {
  const malformed = state?.status === 'malformed';
  const error = new Error(`${key} ${malformed ? 'contains malformed data' : 'could not be read'}${detail ? `: ${detail}` : ''}`);
  error.code = malformed ? 'EROSYNC_STORAGE_MALFORMED' : 'EROSYNC_STORAGE_READ_FAILED';
  error.storageKey = key;
  error.storageStatus = state?.status || 'read_failed';
  if (state?.error) error.cause = state.error;
  return error;
}

export function requireReadableStorageState(key, state, validator = null) {
  if (state?.status === 'read_failed' || state?.status === 'malformed') throw storageReadError(key, state);
  if (state?.status !== 'ok') return state;
  if (typeof validator === 'function' && !validator(state.value)) {
    throw storageReadError(key, { ...state, status: 'malformed' }, 'unexpected stored value shape');
  }
  return state;
}

export function emptyStorageManifest() {
  return { schemaVersion: 1, revision: 0, coverage: 'manifest_known_catalog_live_union', sessions: {}, behind: {}, auxiliaryKeys: [], updatedAt: null };
}

export function normalizeStorageManifest(value) {
  const source = isPlainObject(value) ? value : {};
  const next = emptyStorageManifest();
  next.revision = clampInt(source.revision, 0, 0, 1000000000);
  next.coverage = typeof source.coverage === 'string' || isPlainObject(source.coverage) ? safeClone(source.coverage) : next.coverage;
  next.updatedAt = source.updatedAt || null;
  for (const [scopeKey, raw] of Object.entries(isPlainObject(source.sessions) ? source.sessions : {})) {
    if (!isPlainObject(raw) || !scopeKey) continue;
    const normalizedScopeKey = String(raw.scopeKey || scopeKey);
    if (normalizedScopeKey !== scopeKey) continue;
    const v3Key = String(raw.v3Key ?? `${SESSION_KEY_PREFIX}${scopeKey}`);
    const legacyKey = String(raw.legacyKey ?? `${LEGACY_SESSION_PREFIX}${scopeKey}`);
    if (v3Key && v3Key !== `${SESSION_KEY_PREFIX}${scopeKey}`) continue;
    if (legacyKey && legacyKey !== `${LEGACY_SESSION_PREFIX}${scopeKey}`) continue;
    next.sessions[scopeKey] = {
      sourceBundleKey: String(raw.sourceBundleKey || scopeKey.split(':')[0] || ''),
      scopeKey,
      v3Key,
      legacyKey,
      variantKeys: normalizeStringList(raw.variantKeys, 200, 160).sort(),
      currentVariantKey: String(raw.currentVariantKey || raw.variantKeys?.[0] || 'default'),
      mobProfileIds: normalizeStringList(raw.mobProfileIds, 2000, 180).sort(),
      provenance: typeof raw.provenance === 'string' || Array.isArray(raw.provenance) ? safeClone(raw.provenance) : 'runtime',
    };
    if (next.sessions[scopeKey].variantKeys.length === 0) next.sessions[scopeKey].variantKeys = [next.sessions[scopeKey].currentVariantKey || 'default'];
  }
  for (const [storageKey, raw] of Object.entries(isPlainObject(source.behind) ? source.behind : {})) {
    if (!isPlainObject(raw)) continue;
    const scopeKey = String(raw.scopeKey || '');
    const variantKey = String(raw.variantKey || 'default');
    const expected = `${BEHIND_KEY_PREFIX}${scopeKey}:${variantKey}`;
    if (!scopeKey || storageKey !== expected || (raw.key && raw.key !== expected)) continue;
    next.behind[storageKey] = {
      key: storageKey,
      sourceBundleKey: String(raw.sourceBundleKey || scopeKey.split(':')[0] || ''),
      scopeKey,
      variantKey,
      provenance: typeof raw.provenance === 'string' || Array.isArray(raw.provenance) ? safeClone(raw.provenance) : 'runtime',
    };
  }
  next.auxiliaryKeys = normalizeStringList(Array.isArray(source.auxiliaryKeys) ? source.auxiliaryKeys : [], 5000, 260).sort();
  return next;
}

export function mergeOwnedScopeRecord(target, value) {
  const variants = normalizeStringList([...(target.variantKeys || []), ...(value.variantKeys || []), value.currentVariantKey], 200, 160).sort();
  target.sourceBundleKey = String(value.sourceBundleKey || target.sourceBundleKey || value.scopeKey?.split(':')[0] || '');
  target.scopeKey = String(value.scopeKey || target.scopeKey || '');
  if (value.v3Key !== undefined) target.v3Key = String(value.v3Key);
  else if (target.v3Key === undefined) target.v3Key = `${SESSION_KEY_PREFIX}${target.scopeKey}`;
  if (value.legacyKey !== undefined) target.legacyKey = String(value.legacyKey);
  else if (target.legacyKey === undefined) target.legacyKey = `${LEGACY_SESSION_PREFIX}${target.scopeKey}`;
  target.variantKeys = variants.length > 0 ? variants : ['default'];
  target.currentVariantKey = String(value.currentVariantKey || target.currentVariantKey || target.variantKeys[0] || 'default');
  target.mobProfileIds = normalizeStringList([...(target.mobProfileIds || []), ...(value.mobProfileIds || [])], 2000, 180).sort();
  target.provenance = target.provenance || value.provenance || 'runtime';
  return target;
}

export function durableValueHash(value) {
  return fnv1a(JSON.stringify(value === undefined ? null : value));
}

export function emptyScopeCatalog() {
  return { schemaVersion: SCOPE_CATALOG_SCHEMA, bots: {}, updatedAt: null };
}

export function normalizeScopeCatalog(value) {
  const source = isPlainObject(value) ? value : {};
  const next = emptyScopeCatalog();
  for (const [botKey, rawBot] of Object.entries(isPlainObject(source.bots) ? source.bots : {})) {
    if (!isPlainObject(rawBot)) continue;
    const bot = {
      sourceBundleKey: String(rawBot.sourceBundleKey || botKey),
      characterId: String(rawBot.characterId || ''),
      characterName: truncate(rawBot.characterName || rawBot.name || botKey, 200),
      lastScopeKey: String(rawBot.lastScopeKey || ''),
      lastSeenAt: rawBot.lastSeenAt || null,
      profileCount: clampInt(rawBot.profileCount, 0, 0, 100000),
      chats: {},
    };
    for (const [scopeKey, rawChat] of Object.entries(isPlainObject(rawBot.chats) ? rawBot.chats : {})) {
      if (!isPlainObject(rawChat)) continue;
      bot.chats[scopeKey] = {
        scopeKey,
        sourceBundleKey: bot.sourceBundleKey,
        chatId: String(rawChat.chatId || ''),
        chatName: truncate(rawChat.chatName || rawChat.name || scopeKey, 220),
        characterIndex: clampInt(rawChat.characterIndex, -1, -1, 100000),
        chatIndex: clampInt(rawChat.chatIndex, -1, -1, 100000),
        lastUpdatedAt: rawChat.lastUpdatedAt || null,
        turnIndex: clampInt(rawChat.turnIndex, 0, 0, 100000000),
        eventCount: clampInt(rawChat.eventCount, 0, 0, 10000000),
        interactionCount: clampInt(rawChat.interactionCount, 0, 0, 10000000),
        activeGoalCount: clampInt(rawChat.activeGoalCount, 0, 0, 1000000),
        mobCount: clampInt(rawChat.mobCount, 0, 0, 1000000),
        variantKey: String(rawChat.variantKey || ''),
        variantLabel: truncate(rawChat.variantLabel || '', 160),
        variantSignature: String(rawChat.variantSignature || rawChat.activationSignature || ''),
        sourceHash: String(rawChat.sourceHash || ''),
      };
    }
    if (bot.lastScopeKey && !bot.chats[bot.lastScopeKey]) bot.lastScopeKey = '';
    if (!bot.lastScopeKey) bot.lastScopeKey = Object.values(bot.chats).sort((left, right) => String(right.lastUpdatedAt || '').localeCompare(String(left.lastUpdatedAt || '')))[0]?.scopeKey || '';
    next.bots[bot.sourceBundleKey] = bot;
  }
  next.updatedAt = source.updatedAt || null;
  return next;
}

export function normalizeLoreSelection(value) {
  const raw = isPlainObject(value) ? value : {}, seen = new Set();
  // solo: the user keeps this source apart from other sources with the same activation keys.
  const selectedEntries = (Array.isArray(raw.selectedEntries) ? raw.selectedEntries : []).filter(isPlainObject).slice(0, MAX_PROFILE_CHARACTERS).map(entry => ({
    id: truncate(entry.id, 180), hash: truncate(entry.hash, 100), title: truncate(entry.title, 240), ...(entry.solo === true ? { solo: true } : {}),
  })).filter(entry => entry.id && !seen.has(entry.id) && seen.add(entry.id));
  return { schemaVersion: 1, revision: clampInt(raw.revision, 0, 0, 1000000000), selectedEntries };
}

export function normalizeSelectedLoreProfile(value) {
  if (!isPlainObject(value)) return null;
  return { entries: normalizeLoreSelection({ selectedEntries: value.entries }).selectedEntries.map(({ id, hash }) => ({ id, hash })) };
}

export function selectedLoreSelectionKey(value) {
  return fnv1a(JSON.stringify(normalizeLoreSelection(value).selectedEntries.map(entry => entry.id).sort()));
}

// 봇별 극단 행동 수위 · SFW/NSFW · NSFW+ · 재검사 (0.8.6). 기본값은 0.8.5와 같은 동작이다.
export const EXTREMITY_LIMITS = Object.freeze({
  off: { cap: null, label: '사용 안 함' },
  // 화면 이름은 정의학의 극단성 구간 이름과 맞춘다. 키와 상한값(저장값)은 그대로다.
  moderate: { cap: 20, label: '대화 안에서만' },
  pressure: { cap: 40, label: '비물리적 압박까지' },
  indirect: { cap: 60, label: '위협·통제·경미한 손실까지' },
  direct: { cap: 80, label: '폭력·감금·강압까지' },
  unlimited: { cap: 100, label: '제한 없음' },
});

export const EXTREMITY_LIMIT_KEYS = Object.freeze(Object.keys(EXTREMITY_LIMITS));

export function normalizeExtremityLimit(value) {
  return Object.prototype.hasOwnProperty.call(EXTREMITY_LIMITS, value) ? value : 'unlimited';
}

// 장면 판단 AI와 지시문에 무엇을 보낼지 정하는 봇 단위 정책. NSFW+는 NSFW이고 수위가 제한 없음일 때만 유효하다.
export function contentPolicyFor(botOverride) {
  const contentMode = normalizeContentMode(botOverride?.contentMode);
  const extremityLimit = normalizeExtremityLimit(botOverride?.extremityLimit);
  const nsfwPlus = contentMode === 'nsfw' && extremityLimit === 'unlimited' && botOverride?.nsfwPlus === true;
  return {
    contentMode,
    extremityLimit,
    extremityCap: EXTREMITY_LIMITS[extremityLimit].cap,
    nsfwPlus,
    recheck: nsfwPlus && botOverride?.nsfwPlusRecheck === true,
    tag: contentMode === 'sfw' ? 'SFW' : nsfwPlus ? 'NSFW+' : 'NSFW',
  };
}

// SFW에서는 행동 모드 이름을 농담/다가가기로 주고받고 저장할 때는 기존 키로 되돌린다.
export const SFW_MODE_OUT = Object.freeze({ sexual_humor: 'humor', seduce: 'approach' });

export const SFW_MODE_IN = Object.freeze({ humor: 'sexual_humor', approach: 'seduce' });

export function storedModeKey(value) {
  const text = String(value || '');
  return SFW_MODE_IN[text] || text;
}

export function directorModeName(value, policy) {
  const text = String(value || '');
  return policy?.contentMode === 'sfw' ? SFW_MODE_OUT[text] || text : text;
}

export function sfwDirectorView(value, policy, depth = 0) {
  if (policy?.contentMode !== 'sfw' || depth > 8) return value;
  if (Array.isArray(value)) return value.map(item => sfwDirectorView(item, policy, depth + 1));
  if (!isPlainObject(value)) return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) result[key] = key === 'mode' && typeof item === 'string' ? directorModeName(item, policy) : sfwDirectorView(item, policy, depth + 1);
  return result;
}

export function globalContentFields(value) {
  if (!isPlainObject(value)) return null;
  const out = {};
  if ('contentMode' in value) out.contentMode = normalizeContentMode(value.contentMode);
  if ('extremityLimit' in value) out.extremityLimit = normalizeExtremityLimit(value.extremityLimit);
  if ('nsfwPlus' in value) out.nsfwPlus = value.nsfwPlus === true;
  if ('nsfwPlusRecheck' in value) out.nsfwPlusRecheck = value.nsfwPlusRecheck === true;
  return Object.keys(out).length ? out : null;
}

export function scopeCatalogSummary(scope, state = null, extra = {}) {
  const goals = Object.values(state?.goals || {}).filter((goal) => !['complete', 'abandon'].includes(goal?.status));
  return {
    sourceBundleKey: scope.sourceBundleKey,
    characterId: String(scope.identity?.id || ''),
    characterName: truncate(scope.identity?.name || scope.sourceBundleKey, 200),
    scopeKey: scope.scopeKey,
    chatId: String(scope.chatId || scope.chat?.id || scope.chat?.chatId || ''),
    chatName: truncate(scope.chatName || scope.chat?.name || `채팅 ${Number(scope.chatIndex || 0) + 1}`, 220),
    characterIndex: Number.isInteger(scope.characterIndex) ? scope.characterIndex : -1,
    chatIndex: Number.isInteger(scope.chatIndex) ? scope.chatIndex : -1,
    lastUpdatedAt: state?.updatedAt || null,
    turnIndex: Number(state?.turnIndex || 0),
    eventCount: Array.isArray(state?.events) ? state.events.length : 0,
    interactionCount: Array.isArray(state?.interactionHistory) ? state.interactionHistory.length : 0,
    activeGoalCount: goals.length,
    mobCount: clampInt(extra.mobCount, 0, 0, 1000000),
    profileCount: clampInt(extra.profileCount, 0, 0, 100000),
    // Deprecated metadata has no consumer. Preserve old saved values without
    // rebuilding a new unused list on every commit.
    ...(Object.prototype.hasOwnProperty.call(state?.scopeMeta || {}, 'observedIds') ? { observedIds: safeClone(state.scopeMeta.observedIds) } : {}),
    variantKey: String(state?.variantKey || scope.variantKey || 'default'),
    variantLabel: truncate(scope.variantLabel || '', 160),
    variantSignature: String(scope.variantSignature || ''),
    sourceHash: String(scope.sourceHash || ''),
  };
}

export function ensureProfileBundlesInCatalog(catalog, profileStore) {
  let changed = false;
  for (const [bundleKey, bundle] of Object.entries(profileStore?.sourceBundles || {})) {
    if (!catalog.bots[bundleKey]) {
      catalog.bots[bundleKey] = {
        sourceBundleKey: bundleKey,
        characterId: String(bundle?.identity?.id || ''),
        characterName: truncate(bundle?.identity?.name || bundleKey, 200),
        lastScopeKey: '',
        lastSeenAt: bundle?.compiledAt || null,
        profileCount: Array.isArray(bundle?.characterIds) ? bundle.characterIds.length : 0,
        chats: {},
      };
      changed = true;
    } else {
      const bot = catalog.bots[bundleKey];
      const nextName = truncate(bundle?.identity?.name || bot.characterName || bundleKey, 200);
      const nextCount = Array.isArray(bundle?.characterIds) ? bundle.characterIds.length : bot.profileCount || 0;
      if (bot.characterName !== nextName || bot.profileCount !== nextCount) {
        bot.characterName = nextName;
        bot.characterId = String(bundle?.identity?.id || bot.characterId || '');
        bot.profileCount = nextCount;
        changed = true;
      }
    }
  }
  return changed;
}

// Adapted from the user-supplied text-to-pdf.ts (SHA-256 6E55654F).
// Lazy scope: unavailable browser PDF primitives cannot break the default text path.
export async function createGeminiInputPdf(text) {
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const DEFAULT_FONT_SIZE = 1;
  const DEFAULT_MARGIN = 0;
  const GLYPH_WIDTH = 0.5;
  const encoder = new TextEncoder();
  
  function bytes(value        )             {
      return encoder.encode(value);
  }
  
  function concat(chunks              )             {
      const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
      const result = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
      }
      return result;
  }
  
  function pdfNumber(value        )         {
      return Number(value.toFixed(6)).toString();
  }
  
  function calculatePageGrid(fontSize        , margin        )                                    {
      if (!Number.isFinite(fontSize) || fontSize <= 0) {
          throw new RangeError("fontSize must be a positive finite number");
      }
      if (!Number.isFinite(margin) || margin < 0) {
          throw new RangeError("margin must be a non-negative finite number");
      }
  
      const columns = Math.floor((PAGE_WIDTH - margin * 2) / (fontSize * GLYPH_WIDTH));
      const rows = Math.floor((PAGE_HEIGHT - margin * 2) / fontSize);
      if (columns < 1 || rows < 1) {
          throw new RangeError("fontSize and margin leave no usable page area");
      }
      return { columns, rows };
  }
  
  function hex(value        )         {
      return value.toString(16).toUpperCase().padStart(4, "0");
  }
  
  function unicodeHex(value        )         {
      return [...value]
          .map((character) => {
              const codePoint = character.codePointAt(0) ;
              if (codePoint <= 0xff_ff) return hex(codePoint);
              const supplementary = codePoint - 0x1_00_00;
              return hex(0xd8_00 + (supplementary >> 10)) + hex(0xdc_00 + (supplementary & 0x03_ff));
          })
          .join("");
  }
  
  function wrapText(text        , columns        )             {
      const lines           = [];
      for (const hardLine of text.replaceAll(/\r\n?/g, "\n").split("\n")) {
          const characters = [...hardLine];
          if (characters.length === 0) {
              lines.push("");
              continue;
          }
          for (let index = 0; index < characters.length; index += columns) {
              lines.push(characters.slice(index, index + columns).join(""));
          }
      }
      return lines.map((line) => [...line]);
  }
  
  function isRtlCharacter(character        )          {
      const codePoint = character.codePointAt(0) ;
      return (
          (codePoint >= 0x05_90 && codePoint <= 0x08_ff) ||
          (codePoint >= 0xfb_1d && codePoint <= 0xfd_ff) ||
          (codePoint >= 0xfe_70 && codePoint <= 0xfe_ff) ||
          (codePoint >= 0x1_08_00 && codePoint <= 0x1_0f_ff) ||
          (codePoint >= 0x1_e8_00 && codePoint <= 0x1_ef_ff)
      );
  }
  
  // PDF text operators do not apply bidirectional layout. Reversing strong RTL runs for display lets
  // ToUnicode-aware extractors reconstruct their original logical order without embedding a font.
  function visualOrder(line          )           {
      const clusters             = [];
      for (const character of line) {
          if (/\p{Mark}/u.test(character) && clusters.length > 0) clusters.at(-1) .push(character);
          else clusters.push([character]);
      }
  
      const visual           = [];
      for (let index = 0; index < clusters.length;) {
          if (!isRtlCharacter(clusters[index][0])) {
              visual.push(...clusters[index]);
              index += 1;
              continue;
          }
          let end = index + 1;
          while (end < clusters.length && isRtlCharacter(clusters[end][0])) end += 1;
          for (let cursor = end - 1; cursor >= index; cursor--) visual.push(...clusters[cursor]);
          index = end;
      }
      return visual;
  }
  
  function createCharacterMap(lines            )                      {
      const characters = new Map                ();
      for (const line of lines) {
          for (const character of line) {
              if (characters.has(character)) continue;
              if (characters.size === 65_535) {
                  throw new RangeError("A PDF can contain at most 65,535 distinct characters");
              }
              characters.set(character, characters.size + 1);
          }
      }
      return characters;
  }
  
  function createToUnicodeCMap(characters                     )             {
      const entries = Array.from(characters, ([character, cid]) => `<${hex(cid)}><${unicodeHex(character)}>`);
      const mappings           = [];
      for (let index = 0; index < entries.length; index += 100) {
          const chunk = entries.slice(index, index + 100);
          mappings.push(`${chunk.length} beginbfchar\n${chunk.join("\n")}\nendbfchar`);
      }
  
      return bytes(
          [
              "/CIDInit /ProcSet findresource begin",
              "12 dict begin",
              "begincmap",
              "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
              "/CMapName /PMUnicode-UCS def",
              "/CMapType 2 def",
              "1 begincodespacerange",
              "<0000><FFFF>",
              "endcodespacerange",
              ...mappings,
              "endcmap",
              "CMapName currentdict /CMap defineresource pop",
              "end",
              "end",
          ].join("\n"),
      );
  }
  
  function createPageContent(
      lines            ,
      characters                     ,
      fontSize        ,
      margin        ,
  )             {
      const commands = [
          "BT",
          `/F0 ${pdfNumber(fontSize)} Tf`,
          `${pdfNumber(fontSize)} TL`,
          `1 0 0 1 ${pdfNumber(margin)} ${pdfNumber(PAGE_HEIGHT - margin - fontSize)} Tm`,
      ];
      for (const [index, line] of lines.entries()) {
          const encoded = visualOrder(line)
              .map((character) => hex(characters.get(character) ))
              .join("");
          commands.push(`<${encoded}> Tj`);
          if (index < lines.length - 1) commands.push("T*");
      }
      commands.push("ET");
      return bytes(commands.join("\n"));
  }
  
  async function streamObject(data            )                      {
      const compressed = new Uint8Array(
          await new Response(
              new Blob([data            ]).stream().pipeThrough(new CompressionStream("deflate")),
          ).arrayBuffer(),
      );
      return concat([
          bytes(`<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`),
          compressed,
          bytes("\nendstream"),
      ]);
  }
  
  function serialize(objects              )             {
      const chunks = [concat([bytes("%PDF-1.7\n%"), new Uint8Array([255, 255, 255, 255]), bytes("\n")])];
      const offsets = [0];
      let length = chunks[0].length;
  
      for (const [index, object] of objects.entries()) {
          offsets.push(length);
          const serialized = concat([bytes(`${index + 1} 0 obj\n`), object, bytes("\nendobj\n")]);
          chunks.push(serialized);
          length += serialized.length;
      }
  
      const xrefOffset = length;
      const xref = [
          `xref\n0 ${objects.length + 1}`,
          "0000000000 65535 f ",
          ...offsets.slice(1).map((offset) => `${offset.toString().padStart(10, "0")} 00000 n `),
          "trailer",
          `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
          "startxref",
          String(xrefOffset),
          "%%EOF",
      ].join("\n");
      chunks.push(bytes(`${xref}\n`));
      return concat(chunks);
  }
  
  async function textToPdf(text        , options                   = {})                {
      const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
      const margin = options.margin ?? DEFAULT_MARGIN;
      const { columns, rows } = calculatePageGrid(fontSize, margin);
  
      const lines = wrapText(text, columns);
      const pages               = [];
      for (let index = 0; index < lines.length; index += rows) {
          pages.push(lines.slice(index, index + rows));
          if (pages.length > 1000) throw new RangeError("PDF page limit exceeded");
      }
      const characters = createCharacterMap(lines);
  
      const firstPageObject = 7;
      const pageIds = pages.map((_, index) => firstPageObject + index * 2);
      const objects               = [
          bytes("<< /Type /Catalog /Pages 2 0 R >>"),
          bytes(
              `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F0 3 0 R >> >> >>`,
          ),
          bytes(
              "<< /Type /Font /Subtype /Type0 /BaseFont /PMUnicode /Encoding /Identity-H /DescendantFonts [4 0 R] /ToUnicode 6 0 R >>",
          ),
          bytes(
              "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /PMUnicode /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 5 0 R /DW 500 /CIDToGIDMap /Identity >>",
          ),
          bytes(
              "<< /Type /FontDescriptor /FontName /PMUnicode /Flags 4 /FontBBox [0 -200 1000 800] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 /MissingWidth 500 >>",
          ),
          await streamObject(createToUnicodeCMap(characters)),
      ];
  
      for (const [index, page] of pages.entries()) {
          const pageId = pageIds[index];
          const contentId = pageId + 1;
          objects.push(
              bytes(`<< /Type /Page /Parent 2 0 R /Contents ${contentId} 0 R >>`),
              await streamObject(createPageContent(page, characters, fontSize, margin)),
          );
      }
  
      const pdf = serialize(objects);
      return new Blob([pdf            ], { type: "application/pdf" });
  }
  return textToPdf(text);
}

export function promptPolicyFor(branch) {
  return branch === 'sfw' ? { contentMode: 'sfw', nsfwPlus: false } : { contentMode: 'nsfw', nsfwPlus: branch === 'plus' };
}

export function promptBranchOf(policy) {
  return policy?.contentMode === 'sfw' ? 'sfw' : policy?.nsfwPlus === true ? 'plus' : 'nsfw';
}

// 자료 자리 채우기: 줄마다 {{이름}}을 값으로 바꾸고, 자리만 있고 값이 전부 빈 줄은 뺀다.
export function promptFill(template, values) {
  return String(template || '').split('\n').map(line => {
    let used = 0, filled = 0;
    const output = line.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      used += 1;
      const value = values?.[key];
      if (value === undefined || value === null || String(value) === '') return '';
      filled += 1;
      return String(value);
    });
    return used && !filled ? null : output;
  }).filter(line => line !== null).join('\n');
}

// ---------- 축 호출 나누기 (2026-10-22, 출력 한도) ----------
// 1단계 답이 길어지면(판단 의무) 네 사람분 여덟 축은 프로필 역할의 기본 출력 한도(5,000토큰)를 넘겨 잘리고, 잘린 JSON은 축 단계 실패로 끝나
// 프로필이 "축 미분석"으로 저장된다. 그래서 여덟 축 호출은 두 사람까지만 묶고, 성적 축 넷·동기 유형은 같은 자료로 바로 이어 따로 부른다.
export const AXIS_CALL_PEOPLE = 2;

export function axisCallChunks(group) {
  const chunks = [];
  for (let index = 0; index < group.length; index += AXIS_CALL_PEOPLE) chunks.push(group.slice(index, index + AXIS_CALL_PEOPLE));
  return chunks;
}

export function axisKoreanText(value) {
  if (typeof value === 'string') return value;
  if (!isPlainObject(value)) return '';
  for (const key of ['answerKo', 'ko', 'korean', 'kr', 'text', 'answer', 'value', 'description']) if (typeof value[key] === 'string') return value[key];
  return '';
}

// 프로필의 지금 변형에서 축 답이 들어 있는 기록들(읽기는 첫 기록, 쓰기는 영어가 같은 기록 전부).
// 고르는 순서는 materializeProfileVariant와 같다: 그 변형 → 기본 변형 → 겉 프로필.
export function axisKoreanBaseRecords(root, variantKey) {
  if (!isPlainObject(root)) return [];
  const variants = isPlainObject(root.variants) ? root.variants : {};
  const key = isPlainObject(variants[variantKey]) ? variantKey : isPlainObject(variants.default) ? 'default' : '';
  const records = [];
  if (key && isPlainObject(variants[key].baseProfile)) records.push(variants[key].baseProfile);
  if ((!key || String(root.activeVariantKey || 'default') === key) && isPlainObject(root.baseProfile)) records.push(root.baseProfile);
  return records;
}

// 한 호출에 묶는 사람 수: 분석 AI 최대 출력 토큰에 맞춘다(1명당 약 1,000토큰으로 잡음, 1~6명).
export function axisKoreanGroupSize(config) {
  const maxTokens = clampInt(resolveRoleProfile(config, 'profile').profile.maxTokens, 5000, 256, 100000);
  return Math.max(1, Math.min(6, Math.floor(maxTokens * 0.6 / 1000)));
}

// 실패 요약 한 줄("3명 실패 · 응답 형식"). 실패가 없으면 ''.
export function axisKoreanFailureText(summary) {
  return summary?.failed ? `${summary.failed}명 실패${summary.reason ? ` · ${summary.reason}` : ''}` : '';
}

export const DIRECTOR_MODE_WORDS = Object.freeze({ nsfw: 'sexual_humor | flirt | seduce | pursue_goal', sfw: 'humor | flirt | approach | pursue_goal' });

export const NSFW_PLUS_REFUSAL = 'a sexual act that overrides the target\'s refusal (force, threat, an incapacitated state, deception)';

export function externalLoreSource(entry, content) {
  if (isAssetMaidInternalLore(entry, content)) return 'asset_maid_storage';
  const labelText = [entry?.name, entry?.title, entry?.comment, entry?.key, ...(Array.isArray(entry?.keys) ? entry.keys : [])]
    .filter((value) => typeof value === 'string' && value.trim())
    .join('\n');
  return externalMessageSource({
    role: 'system',
    memo: labelText,
    content: `${labelText}${labelText ? '\n' : ''}${String(content || '')}`,
  });
}

export function characterIdentity(character) {
  const id = character?.chaId ?? character?.characterId ?? character?.id ?? character?.data?.id;
  const name = character?.name ?? character?.data?.name ?? character?.character?.name ?? 'current-character';
  return { id: String(id ?? name), name: String(name || 'current-character') };
}

export function scopeUnavailableError(detail = 'current chat coordinates are unavailable', cause = null) {
  const error = new Error(detail);
  error.code = 'EROSYNC_SCOPE_UNAVAILABLE';
  if (cause) error.cause = cause;
  return error;
}

export function normalizeCycleSymptoms(value, defaults) {
  const raw = isPlainObject(value) ? value : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, Math.round(clampNumber(raw[key], fallback))]));
}

export function normalizeCycleProfile(value, gender = null) {
  const raw = isPlainObject(value) ? value : {}, evidence = normalizeStringList(raw.evidence, 4, 240);
  const basis = ['explicit', 'inferred', 'rp_default', 'user'].includes(raw.basis) ? raw.basis : 'rp_default';
  const lengthDays = clampInt(raw.lengthDays, 28, 2, 366);
  const exception = raw.applicable === false && (['explicit', 'user'].includes(basis) || evidence.length > 0);
  const applicable = !exception && (raw.applicable === true || gender?.value === 'female');
  const premenstrualType = CYCLE_PREMENSTRUAL_TYPES.includes(raw.premenstrualType) ? raw.premenstrualType : 'mild';
  const clinicalLevel = CYCLE_CLINICAL_LEVELS.includes(raw.clinicalLevel) ? raw.clinicalLevel : 'physiological';
  const initialStatus = ['paused', 'waiting', 'ended'].includes(raw.initialStatus) && (basis === 'user' || evidence.length > 0) ? raw.initialStatus : 'active';
  const method = CYCLE_METHODS.includes(raw.method) ? raw.method : '';
  return { applicable, lengthDays, bleedingDays: clampInt(raw.bleedingDays, 5, 1, Math.min(30, lengthDays - 1)), lutealDays: clampInt(raw.lutealDays, 13, 10, 16),
    initialDay: clampInt(raw.initialDay, 0, 0, lengthDays),
    initialStatus,
    initialReason: truncate(raw.initialReason, 240), irregular: raw.irregular === true, aware: raw.aware === true, awareNextPeriod: raw.awareNextPeriod !== false,
    premenstrualType, clinicalLevel, affectType: CYCLE_AFFECT_TYPES.includes(raw.affectType) ? raw.affectType : 'irritable',
    // 시기에서 기분으로 바로 오는 경로는 강한 유형·PMDD·PME에만 있다.
    hormoneSensitive: raw.hormoneSensitive === true && (premenstrualType === 'strong' || ['pmdd', 'pme'].includes(clinicalLevel)),
    disclosure: CYCLE_DISCLOSURES.includes(raw.disclosure) ? raw.disclosure : 'hidden', contraception: raw.contraception === 'hormonal' || method ? 'hormonal' : 'none',
    symptoms: normalizeCycleSymptoms(raw.symptoms, CYCLE_SYMPTOM_DEFAULTS),
    basis, evidence, reason: truncate(raw.reason, 300),
    // 생리 2차: 피임 방법(방법 모름 = 알약), 폐경 이행, 시기 아형(기본 1주형), 임신 의향(원문에 있을 때만), 처음 상태의 원인·수유·경과 일수
    method, transition: CYCLE_TRANSITIONS.includes(raw.transition) ? raw.transition : '',
    timingType: CYCLE_TIMING_TYPES.includes(raw.timingType) ? raw.timingType : 'week',
    intentLevel: cycleIntentLevel(raw.intentLevel),
    initialCause: initialStatus !== 'active' && CYCLE_CAUSES.includes(raw.initialCause) ? raw.initialCause : '',
    initialNursing: CYCLE_NURSING.includes(raw.initialNursing) ? raw.initialNursing : '',
    initialElapsedDays: clampInt(raw.initialElapsedDays, 0, 0, 2000) };
}

export function normalizeCycleActor(value) {
  const raw = isPlainObject(value) ? value : {};
  const minute = number => typeof number === 'number' && Number.isFinite(number) ? clampInt(number, 0, -1000000000, 1000000000) : null;
  const base = { status: ['active', 'paused', 'waiting', 'ended'].includes(raw.status) ? raw.status : 'active', reason: truncate(raw.reason, 300),
    anchorMinute: clampInt(raw.anchorMinute, 0, -1000000000, 1000000000), initialDay: clampInt(raw.initialDay, 0, 0, 366),
    resumeAtMinute: typeof raw.resumeAtMinute === 'number' && Number.isFinite(raw.resumeAtMinute) ? clampInt(raw.resumeAtMinute, 0, 0, 1000000000) : null,
    lengthDays: clampInt(raw.lengthDays, 0, 0, 366), bleedingDays: clampInt(raw.bleedingDays, 0, 0, 30), irregular: raw.irregular === true,
    aware: raw.aware === true, symptoms: isPlainObject(raw.symptoms) ? normalizeCycleSymptoms(raw.symptoms, CYCLE_EVENT_SYMPTOM_DEFAULTS) : null,
    symptomToken: truncate(raw.symptomToken, 100), pregnancyIntent: ['avoid', 'seek'].includes(raw.pregnancyIntent) ? raw.pregnancyIntent : 'unspecified',
    intentTarget: truncate(raw.intentTarget, 180), intentKnown: raw.intentKnown === true, intentEvidence: truncate(raw.intentEvidence, 300),
    // 생리 재편에서 더한 채팅 값. 비어 있으면(0 · '' · null) 프로필 값을 따른다. 옛 채팅 자료는 전부 빈 값으로 읽힌다.
    lutealDays: (days => days >= 10 ? days : 0)(clampInt(raw.lutealDays, 0, 0, 16)),
    contraception: ['none', 'hormonal'].includes(raw.contraception) ? raw.contraception : '',
    awareNextPeriod: typeof raw.awareNextPeriod === 'boolean' ? raw.awareNextPeriod : null };
  // 생리 2차 값은 있을 때만 남긴다(옛 자료의 모양과 크기가 그대로다).
  const extra = {}, stopped = base.status !== 'active';
  const level = cycleIntentLevel(raw.intentLevel);
  if (level !== null && base.intentKnown) extra.intentLevel = level;
  if (stopped && CYCLE_CAUSES.includes(raw.cause)) extra.cause = raw.cause;
  if (extra.cause === 'birth' && CYCLE_NURSING.includes(raw.nursing)) extra.nursing = raw.nursing;
  const lossWeeks = clampInt(raw.lossWeeks, 0, 0, 45);
  if (extra.cause === 'loss' && lossWeeks) extra.lossWeeks = lossWeeks;
  if (extra.cause === 'stopped_contraception' && CYCLE_METHODS.includes(raw.stoppedMethod)) extra.stoppedMethod = raw.stoppedMethod;
  if (stopped) for (const key of ['stoppedAtMinute', 'lastOnsetMinute', 'expectedOnsetMinute']) { const at = minute(raw[key]); if (at !== null) extra[key] = at; }
  if (base.resumeAtMinute !== null && ['story', 'default'].includes(raw.resumeBasis)) extra.resumeBasis = raw.resumeBasis;
  const exposures = (Array.isArray(raw.exposures) ? raw.exposures : []).filter(isPlainObject).map(entry => ({ minute: clampInt(entry.minute, 0, -1000000000, 1000000000),
    ...(typeof entry.target === 'string' && entry.target ? { target: truncate(entry.target, 180) } : {}),
    protected: typeof entry.protected === 'boolean' ? entry.protected : null, aware: entry.aware !== false, knowsPartner: entry.aware !== false && entry.knowsPartner !== false }))
    .sort((left, right) => left.minute - right.minute).slice(-4);
  if (exposures.length) extra.exposures = exposures;
  if (isPlainObject(raw.check) && ['not_pregnant', 'pregnant'].includes(raw.check.result)) {
    extra.check = { minute: clampInt(raw.check.minute, 0, -1000000000, 1000000000), result: raw.check.result, means: truncate(raw.check.means, 80) };
  }
  const delays = (Array.isArray(raw.delays) ? raw.delays : []).filter(isPlainObject).map(entry => ({ cycle: clampInt(entry.cycle, 0, 0, 100000), days: clampInt(entry.days, 1, 1, 14) })).slice(-12);
  if (!stopped && delays.length) extra.delays = delays;
  if (CYCLE_METHODS.includes(raw.method)) extra.method = raw.method;
  if (CYCLE_TRANSITIONS.includes(raw.transition)) extra.transition = raw.transition;
  const resumed = minute(raw.resumedAtMinute);
  if (!stopped && resumed !== null) { extra.resumedAtMinute = resumed; if (CYCLE_CAUSES.includes(raw.resumedCause)) extra.resumedCause = raw.resumedCause; }
  return { ...base, ...extra };
}

// 처음 값: 분석의 처음 상태. 처음부터 멈춘 인물은 원인과 원문의 경과로 남은 기본 기간을 센다(이야기 시간 0분 = 채팅 시작).
export function cycleInitialValue(settings, seed) {
  const initialDay = settings.initialDay || (cycleHash(`${seed}:cycle`) % settings.lengthDays + 1);
  const value = normalizeCycleActor({ status: settings.initialStatus, reason: settings.initialReason, aware: settings.aware, irregular: settings.irregular,
    lengthDays: settings.lengthDays, bleedingDays: settings.bleedingDays, initialDay });
  if (value.status === 'active' || !settings.initialCause) return value;
  const elapsed = settings.initialElapsedDays, cause = settings.initialCause;
  const next = { ...value, cause, nursing: settings.initialNursing, stoppedAtMinute: -elapsed * 1440 };
  if (cause === 'pregnancy' && elapsed > 0) { next.lastOnsetMinute = -elapsed * 1440; next.expectedOnsetMinute = next.lastOnsetMinute + settings.lengthDays * 1440; }
  if (value.status === 'waiting') {
    const key = cycleResumeTableKey(cause, { nursing: settings.initialNursing, method: settings.method });
    if (key) { next.resumeAtMinute = Math.max(7, cycleSeededDays(`${seed}:initial-resume`, CYCLE_RESUME_DAYS[key]) - elapsed) * 1440; next.resumeBasis = 'default'; }
  }
  return normalizeCycleActor(next);
}

// 기다림이 끝나 월경이 돌아온 값. 원인이 있던 기다림은 "돌아온 뒤 첫 두 주기"를 표시한다.
export function cycleResumedValue(value, atMinute) {
  const next = { ...value, status: 'active', reason: '', initialDay: 1, anchorMinute: atMinute, resumeAtMinute: null, symptoms: null };
  for (const key of ['cause', 'nursing', 'lossWeeks', 'stoppedMethod', 'stoppedAtMinute', 'lastOnsetMinute', 'expectedOnsetMinute', 'resumeBasis', 'delays', 'resumedAtMinute', 'resumedCause']) delete next[key];
  if (value.cause) { next.resumedAtMinute = atMinute; next.resumedCause = value.cause; }
  return normalizeCycleActor(next);
}

// 기준점에서 센 날(ordinal, 0부터)을 주기 번호·그 주기 안의 일차·그 주기의 길이로 바꾼다.
// 주기 n은 n×기준 길이 + 흔들림에서 시작하므로 흔들린 길이를 차례로 더한 것과 같고, 먼 미래도 바로 계산된다.
// 기준점의 일차가 0번 주기 안에 남도록 1번 주기의 시작은 그 일차 뒤로만 흔든다.
export function locateCycleDay(ordinal, lengthDays, swing, seed, anchorDay) {
  const start = number => number * lengthDays + (number === 1 ? Math.max(anchorDay - lengthDays, cycleStartShift(seed, 1, swing)) : cycleStartShift(seed, number, swing));
  let number = Math.floor(ordinal / lengthDays);
  for (let guard = 0; guard < 16 && start(number) > ordinal; guard += 1) number -= 1;
  for (let guard = 0; guard < 16 && start(number + 1) <= ordinal; guard += 1) number += 1;
  const day = ordinal - start(number) + 1, length = start(number + 1) - start(number);
  // 비정상 자료(아주 짧은 주기 등)로 위치가 맞지 않으면 흔들림 없는 계산으로 돌아간다.
  if (day >= 1 && day <= length) return { number, day, length };
  const plain = Math.floor(ordinal / lengthDays);
  return { number: plain, day: ordinal - plain * lengthDays + 1, length: lengthDays };
}

// 주기마다 더해지는 날(한때의 지연, 후기 이행기의 긴 공백, 돌아온 뒤 첫 두 주기)이 있을 때의 위치. 앞에서부터 차례로 센다.
export function locateCycleDayExtra(ordinal, lengthDays, swing, seed, anchorDay, extraOf) {
  if (ordinal < 0) return locateCycleDay(ordinal, lengthDays, swing, seed, anchorDay);
  const base = number => number === 0 ? 0 : number * lengthDays + (number === 1 ? Math.max(anchorDay - lengthDays, cycleStartShift(seed, 1, swing)) : cycleStartShift(seed, number, swing));
  let number = 0, start = 0, added = 0;
  for (let guard = 0; guard < 20000; guard += 1) {
    const extra = Math.max(0, extraOf(number)), next = base(number + 1) + added + extra;
    if (next > ordinal) {
      const day = ordinal - start + 1, length = next - start;
      if (day >= 1 && day <= length) return { number, day, length };
      break;
    }
    added += extra; number += 1; start = next;
  }
  return locateCycleDay(ordinal, lengthDays, swing, seed, anchorDay);
}

export function cycleProfileFor(profile) {
  if (!profile || isNonActingMainProfile(profile)) return normalizeCycleProfile({ applicable: false, basis: 'explicit' });
  const base = profile.baseProfile || {}, gender = normalizeGenderIdentity(profile.userOverrides?.genderIdentity || base.genderIdentity);
  if (isPlainObject(base.menstrualCycle) || isPlainObject(profile.userOverrides?.menstrualCycle)) {
    return normalizeCycleProfile({ ...(base.menstrualCycle || {}), ...(profile.userOverrides?.menstrualCycle || {}),
      ...(profile.userOverrides?.menstrualCycle ? { basis: 'user' } : {}) }, gender);
  }
  const evidence = normalizeStringList(profile.evidence, 24, 600);
  const exception = evidence.find(text => /(?:species|race|종족)\s*[:：]\s*(?:robot|android|machine|로봇|안드로이드)|\bis (?:an? )?(?:robot|android)\b|does not menstruate|never menstruates|(?:생리|월경)(?:를|을)\s*하지\s*않|자궁이\s*없/iu.test(text));
  return normalizeCycleProfile({ applicable: gender.value === 'female' && !exception, basis: exception ? 'explicit' : 'rp_default',
    evidence: exception ? [exception] : [], reason: exception || '원문에 없는 주기는 RP 기본값을 사용합니다.' }, gender);
}

export function normalizeCycleState(value) {
  if (!isPlainObject(value) || value.schemaVersion !== 1) return null;
  const absolute = raw => typeof raw === 'number' && Number.isFinite(raw) ? Math.trunc(raw) : null;
  const clockEvents = (Array.isArray(value.clockEvents) ? value.clockEvents : []).slice(-80).filter(e => isPlainObject(e) && e.commitId)
    .map(e => ({ commitId: truncate(e.commitId, 300), turn: clampInt(e.turn, 0, 0, 100000000), delta: clampInt(e.delta, 0, 0, 1000000000), absolute: absolute(e.absolute) }));
  const actorBase = (Array.isArray(value.actorBase) ? value.actorBase : []).slice(-1000).filter(e => isPlainObject(e) && e.actor)
    .map(e => ({ actor: truncate(e.actor, 180), value: normalizeCycleActor(e.value) }));
  const actorEvents = (Array.isArray(value.actorEvents) ? value.actorEvents : []).slice(-512).filter(e => isPlainObject(e) && e.id && e.actor)
    .map(e => ({ id: truncate(e.id, 180), actor: truncate(e.actor, 180), commitId: truncate(e.commitId, 300), turn: clampInt(e.turn, 0, 0, 100000000),
      value: normalizeCycleActor(e.value), evidence: truncate(e.evidence, 300), source: e.source === 'user' ? 'user' : 'rp' }));
  return { schemaVersion: 1, revision: clampInt(value.revision, 0, 0, Number.MAX_SAFE_INTEGER), baseMinutes: clampInt(value.baseMinutes, 0, 0, 1000000000),
    baseAbsolute: absolute(value.baseAbsolute), clockEvents, actorBase, actorEvents };
}

export function cycleStateForRead(state) {
  return normalizeCycleState(state?.cycleState) || { schemaVersion: 1, revision: 0, baseMinutes: 0, baseAbsolute: null, clockEvents: [], actorBase: [], actorEvents: [] };
}

export function cycleClock(state) {
  const data = cycleStateForRead(state);
  let minutes = data.baseMinutes, absolute = data.baseAbsolute;
  for (const event of data.clockEvents) { minutes += event.delta; absolute = event.absolute !== null ? event.absolute : absolute === null ? null : absolute + event.delta; }
  return { minutes, absolute };
}

export function compactCycleHistory(state) {
  const data = state.cycleState, journal = state.commitJournal || [];
  if (!data || data.schemaVersion !== 1 || !journal.length) return;
  const ids = new Set(journal.map(e => e.commitId)), oldest = Math.min(...journal.map(e => Number(e.turnIndex || 0)));
  data.clockEvents = data.clockEvents.filter(event => {
    if (event.turn >= oldest || ids.has(event.commitId)) return true;
    data.baseMinutes += event.delta; data.baseAbsolute = event.absolute !== null ? event.absolute : data.baseAbsolute === null ? null : data.baseAbsolute + event.delta;
    return false;
  });
  data.actorEvents = data.actorEvents.filter(event => {
    if (event.turn >= oldest || ids.has(event.commitId)) return true;
    const at = data.actorBase.findIndex(e => e.actor === event.actor), value = { actor: event.actor, value: safeClone(event.value) };
    if (at < 0) data.actorBase.push(value); else data.actorBase[at] = value;
    return false;
  });
}

export function rollbackCycleChanges(state, removed) {
  const data = normalizeCycleState(state.cycleState);
  if (!data) return;
  const ids = new Set(removed.map(e => e.commitId)), before = JSON.stringify(data);
  data.clockEvents = data.clockEvents.filter(e => !ids.has(e.commitId));
  data.actorEvents = data.actorEvents.filter(e => e.source === 'user' || !ids.has(e.commitId));
  if (JSON.stringify(data) !== before) data.revision++;
  state.cycleState = data;
}

export function emptyAnalysisExecutionHistory() {
  return { schemaVersion: 1, partitions: {} };
}

export function analysisHistoryPartitionKey(sourceBundleKey, variantKey = 'default') {
  return `${String(sourceBundleKey || '')}::${String(variantKey || 'default')}`;
}

export function sanitizeAnalysisExecutionLabel(value, fallback = '') {
  const text = truncate(value, 180).trim();
  if (!text) return fallback;
  if (/(?:api[_ -]?key|authorization|bearer\s+|sk-[a-z0-9]|secret|raw[_ -]?(?:prompt|source|response))/i.test(text)) return '[redacted]';
  return text;
}

export function persistableAnalysisError(error, phase = 'analysis', batch = 0) {
  const safePhase = truncate(phase || error?.phase || 'analysis', 80).replace(/[^a-zA-Z0-9_.-]/g, '_') || 'analysis';
  const rawCode = String(error?.code || '').trim();
  const code = truncate(rawCode || (error?.name === 'AbortError' ? 'EROSYNC_PROVIDER_ABORTED' : 'EROSYNC_ANALYSIS_ERROR'), 80)
    .replace(/[^a-zA-Z0-9_.-]/g, '_') || 'EROSYNC_ANALYSIS_ERROR';
  const httpStatus = clampInt(error?.httpStatus || error?.status || error?.statusCode, 0, 0, 999);
  return {
    phase: safePhase,
    batch: clampInt(batch || error?.batch, 0, 0, 1000000),
    code,
    httpStatus,
    message: `${safePhase} · ${code}${httpStatus ? ` · HTTP ${httpStatus}` : ''}`,
  };
}

export function normalizeAnalysisExecutionCounts(value) {
  const source = isPlainObject(value) ? value : {};
  const next = {};
  for (const key of ['new', 'changed', 'unchanged', 'locked', 'retry', 'excluded', 'partial', 'cancelled', 'error', 'overrideMasked', 'effectiveUnchanged']) {
    next[key] = clampInt(source[key], 0, 0, 1000000);
  }
  return next;
}

export function normalizeAnalysisChangedFields(value) {
  return (Array.isArray(value) ? value : []).slice(0, ANALYSIS_EXECUTION_FIELD_LIMIT).map((entry) => {
    if (typeof entry === 'string') return truncate(entry, 180);
    if (!isPlainObject(entry)) return null;
    return {
      path: truncate(entry.path, 180),
      before: sanitizeProfileAuditValue(entry.before),
      after: sanitizeProfileAuditValue(entry.after),
    };
  }).filter(Boolean);
}

export function normalizeAnalysisExecutionResult(value) {
  if (!isPlainObject(value)) return null;
  const outcome = ['new', 'changed', 'unchanged', 'locked_preserved', 'override_masked', 'retry', 'excluded', 'partial', 'cancelled', 'error'].includes(value.outcome)
    ? value.outcome
    : value.equal === true ? 'unchanged' : 'changed';
  return {
    profileId: truncate(value.profileId || value.id, 180),
    name: truncate(value.name || value.profileName || value.profileId || value.id, 180),
    outcome,
    beforeHash: truncate(value.beforeHash, 80),
    afterHash: truncate(value.afterHash, 80),
    proposedHash: truncate(value.proposedHash, 80),
    effectiveBeforeHash: truncate(value.effectiveBeforeHash, 80),
    effectiveAfterHash: truncate(value.effectiveAfterHash, 80),
    equal: value.equal === true,
    effectiveEqual: value.effectiveEqual === true,
    changedFields: normalizeAnalysisChangedFields(value.changedFields || value.paths),
    ...(value.rawBefore === undefined ? {} : { rawBefore: sanitizeProfileAuditValue(value.rawBefore) }),
    ...(value.rawAfter === undefined ? {} : { rawAfter: sanitizeProfileAuditValue(value.rawAfter) }),
    ...(value.effectiveBefore === undefined ? {} : { effectiveBefore: sanitizeProfileAuditValue(value.effectiveBefore) }),
    ...(value.effectiveAfter === undefined ? {} : { effectiveAfter: sanitizeProfileAuditValue(value.effectiveAfter) }),
    flags: {
      locked: value.flags?.locked === true,
      userOverride: value.flags?.userOverride === true,
      identityOverride: value.flags?.identityOverride === true,
      retry: value.flags?.retry === true,
      excluded: value.flags?.excluded === true,
    },
  };
}

export function normalizeAnalysisExecutionRun(value, runId = '') {
  if (!isPlainObject(value)) return null;
  const id = truncate(value.runId || runId, 180);
  if (!id) return null;
  const providerSource = isPlainObject(value.provider) ? value.provider : {};
  const providerId = truncate(providerSource.id || value.providerId, 80);
  const providerLabel = sanitizeAnalysisExecutionLabel(providerSource.label || value.providerLabel, providerId || '알 수 없는 제공자');
  const modelId = sanitizeAnalysisExecutionLabel(providerSource.modelId || value.modelId, '');
  const modelLabel = sanitizeAnalysisExecutionLabel(providerSource.modelLabel || value.modelLabel, modelId || (providerId === 'risu' ? 'RisuAI 현재 선택 보조 모델' : '모델 미지정'));
  const status = ['running', 'success', 'partial', 'cancelled', 'error'].includes(value.status) ? value.status : value.status === 'complete' ? 'success' : 'error';
  const results = (Array.isArray(value.results) ? value.results : Array.isArray(value.profiles) ? value.profiles : [])
    .map(normalizeAnalysisExecutionResult)
    .filter(Boolean)
    .slice(0, ANALYSIS_EXECUTION_RESULT_LIMIT);
  const run = {
    schemaVersion: 1,
    runId: id,
    rootRunId: truncate(value.rootRunId || id, 180),
    resumedFromRunId: truncate(value.resumedFromRunId, 180),
    checkpointKey: truncate(value.checkpointKey, 260),
    executionType: truncate(value.executionType || value.type || 'reanalysis', 80),
    ...(ANALYSIS_WORKFLOWS.includes(value.analysisWorkflow) ? { analysisWorkflow: value.analysisWorkflow } : {}),
    ...(['start', 'resume'].includes(value.requestIntent) ? { requestIntent: value.requestIntent } : {}),
    status,
    provider: {
      id: providerId,
      label: providerLabel,
      modelId,
      modelLabel,
      modelResolved: providerSource.modelResolved === true || value.modelResolved === true,
      apiFormat: truncate(providerSource.apiFormat || value.apiFormat, 80),
    },
    providerLabel,
    modelLabel,
    sourceHash: truncate(value.sourceHash, 100),
    variantLabel: truncate(value.variantLabel, 180),
    startedAt: value.startedAt || null,
    finishedAt: value.finishedAt || null,
    durationMs: clampInt(value.durationMs, 0, 0, 86400000),
    counts: normalizeAnalysisExecutionCounts(value.counts),
    workload: Object.fromEntries(['documents', 'sourceChars', 'characters', 'discoveryBatches', 'profileBatches', 'verificationBatches']
      .filter((key) => Number.isFinite(value.workload?.[key]) && value.workload[key] >= 0)
      .map((key) => [key, Math.floor(value.workload[key])])),
    results,
    omittedResults: clampInt(value.omittedResults, 0, 0, 1000000),
    errors: (Array.isArray(value.errors) ? value.errors : []).slice(-20).map((entry) => persistableAnalysisError(entry, entry?.phase, entry?.batch)),
    ...(value.rawBefore === undefined ? {} : { rawBefore: sanitizeProfileAuditValue(value.rawBefore) }),
    ...(value.rawAfter === undefined ? {} : { rawAfter: sanitizeProfileAuditValue(value.rawAfter) }),
    ...(value.effectiveBefore === undefined ? {} : { effectiveBefore: sanitizeProfileAuditValue(value.effectiveBefore) }),
    ...(value.effectiveAfter === undefined ? {} : { effectiveAfter: sanitizeProfileAuditValue(value.effectiveAfter) }),
    ...(['equal', 'changed'].includes(value.outcome) ? { outcome: value.outcome } : {}),
    pluginVersion: truncate(value.pluginVersion || VERSION, 40),
  };
  while (run.results.length > 0 && JSON.stringify(run).length > ANALYSIS_EXECUTION_RESULT_BYTES) {
    run.results.pop();
    run.omittedResults += 1;
  }
  return run;
}

export function normalizeAnalysisExecutionHistory(value) {
  const source = isPlainObject(value) ? value : {};
  const next = emptyAnalysisExecutionHistory();
  for (const [partitionKey, rawPartition] of Object.entries(isPlainObject(source.partitions) ? source.partitions : {})) {
    if (!isPlainObject(rawPartition)) continue;
    const splitIndex = partitionKey.lastIndexOf('::');
    const sourceBundleKey = truncate(rawPartition.sourceBundleKey || (splitIndex >= 0 ? partitionKey.slice(0, splitIndex) : ''), 180);
    const variantKey = truncate(rawPartition.variantKey || (splitIndex >= 0 ? partitionKey.slice(splitIndex + 2) : 'default'), 180) || 'default';
    if (!sourceBundleKey) continue;
    const normalizedKey = analysisHistoryPartitionKey(sourceBundleKey, variantKey);
    const rawRuns = isPlainObject(rawPartition.runs) ? rawPartition.runs : {};
    const ordered = normalizeStringList([...(Array.isArray(rawPartition.runIds) ? rawPartition.runIds : []), ...Object.keys(rawRuns)], 1000, 180);
    const runs = {};
    for (const id of ordered) {
      const run = normalizeAnalysisExecutionRun(rawRuns[id], id);
      if (run) runs[run.runId] = run;
    }
    const required = new Set();
    for (const id of ordered) {
      const run = runs[id];
      if (!run || !['running', 'partial', 'cancelled'].includes(run.status)) continue;
      required.add(id);
      if (runs[run.rootRunId]) required.add(run.rootRunId);
    }
    const selected = new Set([...required].slice(-ANALYSIS_EXECUTION_HISTORY_LIMIT));
    for (let index = ordered.length - 1; index >= 0 && selected.size < ANALYSIS_EXECUTION_HISTORY_LIMIT; index -= 1) {
      if (runs[ordered[index]]) selected.add(ordered[index]);
    }
    const runIds = ordered.filter((id) => selected.has(id) && runs[id]);
    next.partitions[normalizedKey] = {
      sourceBundleKey,
      variantKey,
      runIds,
      runs: Object.fromEntries(runIds.map((id) => [id, runs[id]])),
    };
  }
  return next;
}

export function appendAnalysisExecutionRun(store, sourceBundleKey, variantKey, runValue) {
  store.analysisExecutionHistory = normalizeAnalysisExecutionHistory(store.analysisExecutionHistory);
  const key = analysisHistoryPartitionKey(sourceBundleKey, variantKey);
  const partition = store.analysisExecutionHistory.partitions[key] || { sourceBundleKey, variantKey, runIds: [], runs: {} };
  const run = normalizeAnalysisExecutionRun(runValue, runValue?.runId);
  if (!run) return null;
  partition.runs[run.runId] = run;
  partition.runIds = [...partition.runIds.filter((id) => id !== run.runId), run.runId];
  store.analysisExecutionHistory.partitions[key] = partition;
  store.analysisExecutionHistory = normalizeAnalysisExecutionHistory(store.analysisExecutionHistory);
  return store.analysisExecutionHistory.partitions[key]?.runs?.[run.runId] || run;
}

export function emptyBaseRelationSuppressions() {
  return { schemaVersion: 1, entries: {} };
}

export function baseRelationSuppressionKey(sourceBundleKey, variantKey, from, to) {
  return `${String(sourceBundleKey || '')}::${String(variantKey || 'default')}::${relationKey(from, to)}`;
}

export function normalizeBaseRelationSuppressions(value) {
  const source = isPlainObject(value) ? value : {};
  const next = emptyBaseRelationSuppressions();
  for (const [key, raw] of Object.entries(isPlainObject(source.entries) ? source.entries : {})) {
    if (!isPlainObject(raw)) continue;
    const sourceBundleKey = String(raw.sourceBundleKey || '');
    const variantKey = String(raw.variantKey || 'default');
    const from = String(raw.from || '');
    const to = String(raw.to || '');
    if (!sourceBundleKey || !from || !to || from === to) continue;
    const normalizedKey = baseRelationSuppressionKey(sourceBundleKey, variantKey, from, to);
    if (key && key !== normalizedKey) continue;
    next.entries[normalizedKey] = {
      sourceBundleKey,
      variantKey,
      from,
      to,
      reason: truncate(raw.reason, 500),
      reasonCodes: normalizeStringList(raw.reasonCodes, 20, 120),
      relationHash: truncate(raw.relationHash, 100),
      relationSnapshot: isPlainObject(raw.relationSnapshot) ? safeClone(raw.relationSnapshot) : null,
      sessionScopeKey: String(raw.sessionScopeKey || ''),
      sessionSnapshot: isPlainObject(raw.sessionSnapshot) ? safeClone(raw.sessionSnapshot) : null,
      suppressedBy: truncate(raw.suppressedBy || 'user', 80),
      suppressedAt: raw.suppressedAt || null,
    };
  }
  return next;
}

export function emptyProfileStore() {
  return { schemaVersion: SCHEMA_VERSION, sourceBundles: {}, profiles: {}, baseRelations: {}, analysisRuns: {}, deletedProfiles: {}, analysisExecutionHistory: emptyAnalysisExecutionHistory(), baseRelationSuppressions: emptyBaseRelationSuppressions() };
}

export function emptyRegistry() {
  return { schemaVersion: SCHEMA_VERSION, entities: {} };
}

export function emptyDevelopmentState() {
  return {
    schemaVersion: DEVELOPMENT_SCHEMA,
    global: {},
    relations: {},
    candidates: {},
    evidence: [],
    lastEvaluatedTurn: 0,
    updatedAt: null,
  };
}

export function normalizeDevelopmentState(value) {
  const source = isPlainObject(value) ? value : {};
  const next = emptyDevelopmentState();
  next.global = isPlainObject(source.global) ? source.global : {};
  next.relations = isPlainObject(source.relations) ? source.relations : {};
  next.candidates = isPlainObject(source.candidates) ? source.candidates : {};
  next.evidence = (Array.isArray(source.evidence) ? source.evidence : []).filter(isPlainObject).slice(-2000);
  next.lastEvaluatedTurn = clampInt(source.lastEvaluatedTurn, 0, 0, 100000000);
  next.updatedAt = source.updatedAt || null;
  return next;
}

export function saveBundleVariant(store, sourceBundleKey, variantKey, record) {
  const existing = isPlainObject(store.sourceBundles?.[sourceBundleKey]) ? store.sourceBundles[sourceBundleKey] : {};
  const variants = isPlainObject(existing.variants) ? existing.variants : {};
  const variantRecord = { ...safeClone(record) };
  delete variantRecord.variants;
  delete variantRecord.activeVariantKey;
  variants[variantKey] = variantRecord;
  store.sourceBundles[sourceBundleKey] = {
    ...existing,
    ...safeClone(record),
    variants,
    activeVariantKey: variantKey,
  };
  return store.sourceBundles[sourceBundleKey];
}

export function preserveNonActiveVariantRelations(projectedStore, durableStore, sourceBundleKey, activeVariantKey = 'default') {
  const merged = safeClone(projectedStore) || projectedStore;
  if (!isPlainObject(merged.baseRelations)) merged.baseRelations = {};
  for (const [key, relation] of Object.entries(durableStore?.baseRelations || {})) {
    if (relation?.sourceBundleKey !== sourceBundleKey) continue;
    if (String(relation.variantKey || 'default') === String(activeVariantKey || 'default')) continue;
    merged.baseRelations[key] = safeClone(relation) || relation;
  }
  return merged;
}

export function authoritativeMainProfileId(store, sourceBundleKey, hostIdentity = null) {
  const bundle = store?.sourceBundles?.[sourceBundleKey];
  const identity = hostIdentity || bundle?.identity || { id: sourceBundleKey };
  const hostId = safeKeyPart(identity.id || sourceBundleKey, safeKeyPart(identity.name, 'current_character'));
  const ids = new Set([...(Array.isArray(bundle?.characterIds) ? bundle.characterIds : []), ...Object.values(isPlainObject(bundle?.variants) ? bundle.variants : {}).flatMap(variant => Array.isArray(variant?.characterIds) ? variant.characterIds : [])]);
  const owns = id => !!store?.profiles?.[id] && (ids.has(id) || (Array.isArray(store.profiles[id].ownerBundleKeys) && store.profiles[id].ownerBundleKeys.includes(sourceBundleKey)));
  if (owns(hostId)) return hostId;
  const redirect = store?.identityRedirects?.[hostId];
  if (redirect?.sourceBundleKey === sourceBundleKey && owns(redirect.profileId)) return redirect.profileId;
  const name = String(identity.name || '').trim().toLowerCase();
  const legacy = [...ids].filter(id => owns(id) && name && String(store.profiles[id].name || '').trim().toLowerCase() === name
    && Array.isArray(store.profiles[id].sourceKinds) && store.profiles[id].sourceKinds.includes('character_card'));
  return legacy.find(id => store.profiles[id].isMain === true) || legacy[0] || hostId;
}

export function normalizeRegistryStore(value) {
  const source = isPlainObject(value) ? value : {};
  const entities = {};
  for (const [id, entity] of Object.entries(isPlainObject(source.entities) ? source.entities : {})) {
    if (!isPlainObject(entity)) continue;
    entities[id] = { ...safeClone(entity), id: String(entity.id || id) };
  }
  return { schemaVersion: SCHEMA_VERSION, entities };
}

export function kocoApplyOperation(previous, op) {
  if (op.replace !== undefined) return safeClone(op.replace);
  if (op.kind === 'relations') {
    const current = safeClone(previous) || { from: op.from, to: op.to, affection: 50, eroticAttraction: 50, notes: [], lastUpdatedTurn: 0 };
    const pending = { ...(current.changeRemainders || {}) };
    let changed = false;
    for (const [field, delta] of Object.entries(op.deltas || {})) if (delta !== 0) {
      const next = accumulatedRelationChange(current[field], delta, pending[field], field === 'hatred' ? 0 : 50);
      current[field] = next.value; pending[field] = next.remainder; changed = true;
    }
    if (changed) { current.changeRemainders = pending; current.lastUpdatedTurn = op.turn; }
    if (op.note) { current.notes = latestStringList([...(current.notes || []), op.note], 30, 500); current.lastNoteTurn = op.turn; } // 기록의 연속성(2026-10-29): 최신 30개
    return current;
  }
  const previousRival = safeClone(previous) || { id: op.key, actor: op.actor, rival: op.rival, focusTarget: op.focusTarget, kind: 'romantic', intensity: 0, evidence: [] };
  if (!op.delta) {
    if (previous && op.note) { previousRival.reason = op.note; previousRival.evidence = normalizeStringList([...(previousRival.evidence || []), op.note], 20, 500); previousRival.lastNoteTurn = op.turn; }
    return previous ? previousRival : null;
  }
  const intensity = Math.round(clampNumber(clampNumber(previousRival.intensity, 0) + op.delta, 0));
  if (intensity <= 0) return null;
  return { ...previousRival, intensity, reason: op.note || truncate(previousRival.reason, 500), evidence: normalizeStringList([...(previousRival.evidence || []), op.note], 20, 500), confidence: Math.round(clampNumber(op.confidence, previousRival.confidence || 40)), lastUpdatedTurn: op.turn };
}

export function kocoReplayLane(lane, invalid = new Set()) {
  let result = safeClone(lane.baseline);
  for (const op of lane.operations || []) if (!op.withdrawn && (!op.source || !invalid.has(op.source))) result = kocoApplyOperation(result, op);
  return result;
}

export function kocoTrackOperation(state, kind, key, before, operation, externalEvent = null) {
  if (!state.koco) return;
  const laneId = kind + ':' + key;
  let lane = state.koco.lanes[laneId];
  if (!lane && !externalEvent) return;
  if (!lane) lane = state.koco.lanes[laneId] = { kind, key, baseline: safeClone(before) || null, operations: [] };
  const expected = kocoReplayLane(lane);
  // An explicit repair/import/base update is authoritative, not a delta to undo.
  if (JSON.stringify(expected) !== JSON.stringify(before || null)) lane.operations.push({ kind, key, replace: safeClone(before) || null });
  lane.operations.push({ ...operation, kind, key, turn: state.turnIndex, ...(externalEvent ? { source: externalEvent.key + '@' + externalEvent.revision } : {}) });
}

export function kocoRetract(state, invalid) {
  if (!state.koco || !invalid.size) return;
  const replay = (holder, lane, undo = false) => {
    const bucket = holder[lane.kind];
    if (!isPlainObject(bucket)) return;
    const before = kocoReplayLane(lane), actual = bucket[lane.key] ?? null, after = kocoReplayLane(lane, invalid);
    if (JSON.stringify(actual) !== JSON.stringify(before)) return; // preserve a later explicit replacement
    if (after === null && (!undo || lane.kind === 'rivalries')) delete bucket[lane.key]; else bucket[lane.key] = after;
  };
  // Update exact before-images too, so a later reroll cannot resurrect a
  // withdrawn contribution. Normal deltas/caps/fractional carries are replayed.
  for (const [key, lane] of Object.entries(state.koco.lanes)) {
    if (!lane.operations.some(op => !op.withdrawn && invalid.has(op.source))) continue;
    replay(state, lane);
    for (const entry of state.commitJournal || []) {
      const length = entry.undo?.koco?.checkpoint ? entry.undo.koco.lanes[key] : null;
      if (Number.isInteger(length)) replay(entry.undo, { ...lane, operations: lane.operations.slice(0, length) }, true);
    }
    for (const op of lane.operations) if (invalid.has(op.source)) op.withdrawn = true;
  }
  for (const koco of [state.koco, ...(state.commitJournal || []).map(entry => entry.undo?.koco)]) {
    for (const receipt of Object.values(koco?.receipts || {})) if (invalid.has(receipt.key + '@' + receipt.revision)) receipt.status = 'retracted';
  }
  for (const event of [...(state.events || []), ...(state.commitJournal || []).flatMap(e => e.undo?.trimmedEvents || [])]) if (invalid.has(event.kocoRef)) { event.retracted = true; event.status = '철회됨'; }
  for (const goals of [state.goals, ...(state.commitJournal || []).map(e => e.undo?.goals)]) {
    for (const goal of Object.values(goals || {})) if (goal && !['complete', 'abandon', 'pause'].includes(goal.status) && (goal.kocoRefs || []).some(ref => invalid.has(ref.key + '@' + ref.revision))) { goal.status = 'pause'; goal.lastResult = '코코에몬 원본 사건 변경·철회'; }
  }
}

export function kocoRelationDependencies(state, actor, target) {
  const refs = new Map();
  for (const key of [relationKey(actor, target)]) {
    const lane = state.koco?.lanes?.['relations:' + key];
    for (const op of lane?.operations || []) {
      if (!op.source || op.withdrawn) continue;
      const [eventKey, revision] = op.source.split('@');
      if (state.koco.receipts[eventKey]?.status === 'applied') refs.set(op.source, { key: eventKey, revision });
    }
  }
  return [...refs.values()];
}

export function newSessionState(scopeKey) {
  return {
    schemaVersion: SCHEMA_VERSION,
    scopeKey,
    scopeMeta: null,
    variantKey: 'default',
    variantStates: {},
    turnIndex: 0,
    scene: { sequence: 0, location: '', presentAtEnd: [], departedAtEnd: [], nextCastForecast: { confirmed: [], likely: [], excluded: [], arrivalSupported: [], remoteContact: [], rememberedOnly: [] }, sceneTransition: false },
    relations: {},
    rivalries: {},
    goals: {},
    sexualTargets: {},
    actorStates: {},
    development: emptyDevelopmentState(),
    lastPlan: null,
    lastInjection: '',
    lastCommittedOutput: '',
    lastCommittedMessageIndex: -1,
    events: [],
    interactionHistory: [],
    interactionLedger: {},
    commitJournal: [],
    continuationReceipt: null,
    updatedAt: null,
  };
}

export function normalizeContinuationReceipt(value) {
  if (!isPlainObject(value) || value.schemaVersion !== 1 || !/^[0-9a-f]{64}$/i.test(value.sourceChecksum || '')) return null;
  return { schemaVersion: 1, sourceChecksum: String(value.sourceChecksum).toLowerCase(),
    sourceScopeKey: truncate(value.sourceScopeKey, 200), targetScopeKey: truncate(value.targetScopeKey, 200),
    sourceTurnIndex: clampInt(value.sourceTurnIndex, 0, 0, 100000000), at: truncate(value.at, 40) };
}

export const SESSION_VARIANT_FIELDS = Object.freeze([
  'turnIndex', 'scene', 'relations', 'rivalries', 'goals', 'sexualTargets', 'actorStates', 'development', 'preferenceState', 'cycleState', 'userIdentity', 'identityRepair', 'continuationReceipt', 'lastPlan', 'lastInjection',
  'lastCommittedOutput', 'lastCommittedMessageIndex', 'events', 'interactionHistory', 'interactionLedger',
  'commitJournal', 'lastDirectorAttempt', 'directorAttemptHistory', 'preparedLookahead', 'sceneRecovery', 'koco', 'updatedAt', 'duskUser',
]);

// 세션에 진행 기록이 있는가(확정·사건·목표). 변형 칸 입양과 화면 안내에 쓴다.
export function sessionHasProgress(value) {
  return Number(value?.turnIndex) > 0
    || (Array.isArray(value?.commitJournal) && value.commitJournal.length > 0)
    || (Array.isArray(value?.interactionHistory) && value.interactionHistory.length > 0)
    || Object.keys(isPlainObject(value?.goals) ? value.goals : {}).length > 0;
}

export function commitContentHash(value) {
  return fnv1a(String(value ?? '').replace(/\s+/g, ' ').trim());
}

export function commitNarrativeHash(value) {
  // Only these known transport markers may change without changing RP events.
  return commitContentHash(stripKocoArtifacts(String(value ?? ''))
    .replace(/<!--\s*pm:think:v1:[\s\S]*?-->/gi, '')
    .replace(/<!--\s*eo-snap:\d+\s*-->/gi, '')
    .replace(/📌(?:📦|💠)📌/gu, ''));
}

export function isCommittedChatMessage(message) {
  const role = String(message?.role || '');
  return role === 'char' || role === 'assistant';
}

export function chatMessageText(message) {
  if (typeof message?.data === 'string') return message.data;
  if (typeof message?.content === 'string') return message.content;
  return '';
}

export function firstJournalMessageIndex(journal) {
  if (!Array.isArray(journal) || !journal.length) return 0;
  const positions = journal.map(entry => entry?.messageIndex);
  return positions.every(index => Number.isInteger(index) && index >= 0) ? Math.min(...positions) : 0;
}

export function normalizeCommitJournal(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(isPlainObject).map((entry) => ({
    ...entry,
    commitId: String(entry.commitId || `commit_${Math.random().toString(36).slice(2, 10)}`),
    messageIndex: Number.isInteger(entry.messageIndex) ? entry.messageIndex : -1,
    messageId: String(entry.messageId || ''),
    contentHash: String(entry.contentHash || ''),
    userInputHash: String(entry.userInputHash || ''),
    currentContentHash: String(entry.currentContentHash || entry.contentHash || ''),
    currentUserInputHash: String(entry.currentUserInputHash || entry.userInputHash || ''),
    userMessageId: String(entry.userMessageId || ''),
    turnKey: String(entry.turnKey || ''),
    requestSlotKey: String(entry.requestSlotKey || entry.turnKey || ''),
    turnIndex: clampInt(entry.turnIndex, 0, 0, 100000000),
    undo: isPlainObject(entry.undo) ? cleanOptionalUndoGoalFields(entry.undo) : {},
  })).slice(-COMMIT_JOURNAL_LIMIT);
}

// 확정된 이번 턴과 그 직후의 look-ahead 상태 갱신을 같은 저널 항목으로 되돌릴 수 있게 기록합니다.
export function cleanOptionalUndoGoalFields(undo) {
  if (!isPlainObject(undo.goals)) return undo;
  let result = undo;
  for (const [key, goal] of Object.entries(undo.goals)) {
    if (!isPlainObject(goal) || !Object.prototype.hasOwnProperty.call(goal, 'desire') || goal.desire !== undefined) continue;
    if (result === undo) result = { ...undo, goals: { ...undo.goals } };
    const cleaned = { ...goal }; delete cleaned.desire;
    result.goals[key] = cleaned;
  }
  return result;
}

export function beginCommitRecorder(state) {
  return {
    hasBaseline: true,
    turnIndex: clampInt(state.turnIndex, 0, 0, 100000000),
    ...(state.userIdentity ? { userIdentity: safeClone(state.userIdentity) } : {}),
    scene: safeClone(state.scene),
    rivalries: safeClone(state.rivalries),
    actorStates: safeClone(state.actorStates),
    goals: safeClone(state.goals),
    sexualTargets: safeClone(isPlainObject(state.sexualTargets) ? state.sexualTargets : {}),
    lastPlan: safeClone(state.lastPlan),
    lastInjection: truncate(state.lastInjection, MAX_INJECTION_CHARS),
    lastCommittedOutput: truncate(state.lastCommittedOutput, 7000),
    lastCommittedMessageIndex: Number.isInteger(state.lastCommittedMessageIndex) ? state.lastCommittedMessageIndex : -1,
    devLastEvaluatedTurn: clampInt(state.development?.lastEvaluatedTurn, 0, 0, 100000000),
    koco: kocoCheckpoint(state),
    eventIds: [],
    trimmedEvents: [],
    trimmedInteractionHistory: [],
    interactionLedger: {},
    relations: {},
    candidates: {},
    devBuckets: {},
    evidenceIds: [],
    trimmedEvidence: [],
    entities: {},
    profiles: {},
    createdMobIds: [],
    bumpedIds: [],
    promotedIds: [],
  };
}

// 오래된 저널 항목은 되돌리기용 기준 상태를 버리고 식별 정보와 변경 목록만 남깁니다.
// 실제 채팅과의 대조는 계속 가능하고, 저장 용량만 줄어듭니다.
export function compressCommitJournal(journal) {
  const cutoff = journal.length - COMMIT_UNDO_DEPTH;
  for (let index = 0; index < cutoff; index += 1) {
    const undo = journal[index]?.undo;
    if (!isPlainObject(undo) || undo.hasBaseline !== true) continue;
    journal[index].undo = {
      hasBaseline: false,
      eventIds: undo.eventIds || [],
      interactionLedger: undo.interactionLedger || {},
      relations: undo.relations || {},
      candidates: undo.candidates || {},
      devBuckets: undo.devBuckets || {},
      evidenceIds: undo.evidenceIds || [],
      createdMobIds: undo.createdMobIds || [],
      bumpedIds: undo.bumpedIds || [],
      promotedIds: undo.promotedIds || [],
      ...(undo.koco ? { koco: undo.koco } : {}),
    };
  }
  return journal;
}

export function appendCommitJournal(state, entry) {
  if (!Array.isArray(state.commitJournal)) state.commitJournal = [];
  state.commitJournal.push(entry);
  if (state.commitJournal.length > COMMIT_JOURNAL_LIMIT) {
    state.commitJournal.splice(0, state.commitJournal.length - COMMIT_JOURNAL_LIMIT);
  }
  compressCommitJournal(state.commitJournal);
}

export function journalEntryMatchesChat(entry, chatCommits, afterIndex = -1) {
  if (entry?.unverified === true) {
    const found = chatCommits.find((commit) => commit.index > afterIndex
      && (!(entry.currentContentHash || entry.contentHash) || commit.hash === (entry.currentContentHash || entry.contentHash))
      && (!(entry.currentUserInputHash || entry.userInputHash) || commit.userInputHash === (entry.currentUserInputHash || entry.userInputHash)));
    if (!found) return false;
    entry.messageIndex = found.index;
    entry.messageId = found.id;
    entry.contentHash = found.hash;
    entry.currentContentHash = found.hash;
    entry.userInputHash = found.userInputHash || entry.userInputHash || '';
    entry.currentUserInputHash = found.userInputHash || entry.currentUserInputHash || '';
    entry.userMessageId = found.userMessageId || entry.userMessageId || '';
    entry.unverified = false;
    return true;
  }
  const currentHash = entry?.currentContentHash || entry?.contentHash;
  const currentUserHash = entry?.currentUserInputHash || entry?.userInputHash;
  if (!currentHash) return false;
  if (Number.isInteger(entry.messageIndex) && entry.messageIndex >= 0) {
    const found = chatCommits.find((commit) => commit.index === entry.messageIndex);
    if (!found) return false;
    if (entry.messageId && found.id && entry.messageId !== found.id) return false;
    if (entry.userMessageId && found.userMessageId && entry.userMessageId !== found.userMessageId) return false;
    if (currentUserHash && found.userInputHash && currentUserHash !== found.userInputHash) return false;
    if (Number.isInteger(entry.swipeId) && Number.isInteger(found.swipeId) && entry.swipeId !== found.swipeId) return false;
    return found.hash === currentHash;
  }
  return chatCommits.some((commit) => commit.hash === currentHash);
}

export function isEditedCommitCandidate(entry, found) {
  if (!entry || !found) return false;
  if (Number.isInteger(entry.swipeId) && Number.isInteger(found.swipeId) && entry.swipeId !== found.swipeId) return false;
  if (entry.userMessageId && found.userMessageId && entry.userMessageId !== found.userMessageId) return false;
  if (entry.messageId && found.id) return entry.messageId === found.id;
  return !entry.messageId && !found.id && entry.messageIndex === found.index
    && (!(entry.currentUserInputHash || entry.userInputHash) || !found.userInputHash
      || (entry.currentUserInputHash || entry.userInputHash) === found.userInputHash);
}

export function entityNames(entity) {
  return [entity?.id, entity?.name, ...(Array.isArray(entity?.aliases) ? entity.aliases : [])]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
}

export function entityNamePieces(value) {
  const text = String(value || '').normalize('NFKC').toLowerCase().replace(/[​-‍﻿]/g, '').replace(/[（(][^()（）]*[)）]/g, ' ');
  return text.split(/[\s\-‐‑‒–—·‧・,/]+/u).map(part => part.replace(/^['"“”‘’「」『』]+|['"“”‘’「」『』]+$/gu, '').trim()).filter(Boolean);
}

// 대화 글에 조각이 있는가: 로마자 조각은 낱말 경계("mai"는 "main"에 안 걸림), 한글·한자·가나 조각은 글자 포함(조사가 붙으므로).
export function mentionedInContext(context, part) {
  if (!part || !context) return false;
  if (/^[a-z0-9'’.]+$/.test(part)) {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}(?![a-z0-9])`, 'u').test(context);
  }
  return context.includes(part);
}

// 모호한 이름을 가르는 근거: ① 그 판단의 후보였던 쪽 ② 직전 응답 본문에 전체 이름이 적힌 쪽 ③ 현재 장면에 있는 쪽. 하나로 좁혀질 때만 답한다.
export function pickEntityByEvidence(pool, context) {
  let rest = Array.isArray(pool) ? pool.filter(Boolean) : [];
  if (!rest.length) return null;
  if (context?.candidateIds instanceof Set && context.candidateIds.size) {
    const inCandidates = rest.filter(entity => context.candidateIds.has(String(entity.id)));
    if (inCandidates.length === 1) return inCandidates[0];
    if (inCandidates.length > 1) rest = inCandidates;
  }
  const output = String(context?.committedOutput || '').normalize('NFKC').toLowerCase();
  if (output) {
    const named = rest.filter(entity => { const full = String(entity?.name || '').normalize('NFKC').toLowerCase().trim(); return full && mentionedInContext(output, full); });
    if (named.length === 1) return named[0];
    if (named.length > 1) rest = named;
  }
  if (context?.presentIds instanceof Set && context.presentIds.size) {
    const present = rest.filter(entity => context.presentIds.has(String(entity.id)));
    if (present.length === 1) return present[0];
  }
  return null;
}

export function identityRepairMatches(state, scope = null) {
  const scopeKey = String(scope?.scopeKey || state?.scopeKey || ''), repair = state?.identityRepair;
  return repair?.schemaVersion === 1 && repair.scopeKey === scopeKey
    && repair.sourceBundleKey === String(scope?.sourceBundleKey || state?.scopeMeta?.sourceBundleKey || scopeKey.split(':')[0] || '')
    && repair.variantKey === String(scope?.variantKey || state?.variantKey || 'default');
}

export function hasUserDirectionalState(state) {
  const fromUser = (key, value) => String(key).startsWith('user->') || value?.from === 'user';
  const userActor = (_, value) => value?.actor === 'user';
  const any = (map, test) => isPlainObject(map) && Object.entries(map).some(([key, value]) => test(key, value));
  const invalidEvent = event => event?.actor === 'user' && (event.target === 'user'
    || ['relation_update', 'koco_relation', 'decision', 'goal_result', 'plan_nonexecution', 'rivalry_update', 'koco_rivalry'].includes(event.type));
  const invalidLedger = (key, value) => (String(key).startsWith('user->') || value?.actor === 'user') && (
    !isPlainObject(value) || ['plannedCount', 'relationUpdateCount', 'goalEventCount'].some(field => Number(value[field] || 0) > 0)
    || value.lastEventType && value.lastEventType !== 'observed_action' || Number(value.byResult?.ACT || 0) > 0);
  const invalidPlan = plan => Array.isArray(plan?.actions) && plan.actions.some(action => action?.actor === 'user');
  const invalidUndo = undo => isPlainObject(undo) && (any(undo.relations, fromUser) || any(undo.goals, userActor)
    || any(undo.rivalries, userActor) || Object.prototype.hasOwnProperty.call(undo.actorStates || {}, 'user')
    || any(undo.devBuckets, key => key.startsWith('relation:user->') || key === 'global:user')
    || any(undo.interactionLedger, invalidLedger) || invalidPlan(undo.lastPlan)
    || (Array.isArray(undo.trimmedEvents) && undo.trimmedEvents.some(invalidEvent))
    || (Array.isArray(undo.trimmedInteractionHistory) && undo.trimmedInteractionHistory.some(event => event?.actor === 'user' && (event.target === 'user' || event.type !== 'observed_action'))));
  return any(state.relations, fromUser) || any(state.goals, userActor) || any(state.rivalries, userActor)
    || Object.prototype.hasOwnProperty.call(state.actorStates || {}, 'user')
    || any(state.development?.relations, key => key.startsWith('user->'))
    || any(state.development?.global, (key, value) => key === 'user' || value?.actor === 'user')
    || any(state.development?.candidates, userActor) || invalidPlan(state.lastPlan)
    || (state.events || []).some(invalidEvent)
    || (state.interactionHistory || []).some(event => event?.actor === 'user' && (event.target === 'user' || event.type !== 'observed_action'))
    || any(state.interactionLedger, invalidLedger)
    || (state.commitJournal || []).some(entry => invalidUndo(entry?.undo));
}

export function sanitizeUserDirectionalState(state, detached) {
  let changed = false;
  const archive = (path, value) => {
    detached.push({ path, reason: 'user_direction_not_owned', value: value === undefined ? null : safeClone(value) });
    changed = true;
  };
  const clearMap = (map, path, reject) => {
    if (!isPlainObject(map)) return;
    for (const [key, value] of Object.entries(map)) if (reject(key, value)) {
      archive(`${path}.${key}`, value);
      delete map[key];
    }
  };
  const isUserPlanEvent = event => event?.actor === 'user' && (event.target === 'user' || [
    'relation_update', 'koco_relation', 'decision', 'goal_result', 'plan_nonexecution', 'rivalry_update', 'koco_rivalry',
  ].includes(event.type));
  const filterRecords = (records, path, reject) => Array.isArray(records) ? records.filter((event, index) => {
    if (!reject(event)) return true;
    archive(`${path}[${index}]`, event);
    return false;
  }) : records;
  const stripPlan = (plan, path) => {
    if (!isPlainObject(plan) || !Array.isArray(plan.actions)) return plan;
    plan.actions = filterRecords(plan.actions, `${path}.actions`, action => action?.actor === 'user');
    return plan.actions.length || plan.type !== 'ACT' ? plan : null;
  };
  const stripLedger = (map, path, useCurrentHistory = true) => {
    if (!isPlainObject(map)) return;
    for (const [key, value] of Object.entries(map)) {
      if (!key.startsWith('user->') && value?.actor !== 'user') continue;
      if (!isPlainObject(value)) { archive(`${path}.${key}`, value); delete map[key]; continue; }
      const actual = ['actualCount', 'partialCount', 'detailOnlyCount', 'legacyUnclassifiedCount'].some(field => Number(value[field] || 0) > 0);
      if (!actual) { archive(`${path}.${key}`, value); delete map[key]; continue; }
      const next = { ...value, plannedCount: 0, relationUpdateCount: 0, goalEventCount: 0 };
      if (isPlainObject(next.byResult)) {
        next.byResult = { ...next.byResult };
        delete next.byResult.ACT;
      }
      if (next.lastEventType && next.lastEventType !== 'observed_action') {
        const lastAction = useCurrentHistory ? (state.interactionHistory || []).filter(event => event.actor === 'user' && event.target === next.target && event.type === 'observed_action').at(-1) : null;
        next.lastSummary = lastAction?.summary || '';
        next.lastEventType = lastAction?.type || '';
        next.lastTurn = Number(lastAction?.turn || next.lastActualTurn || 0);
        next.lastAt = lastAction?.at || next.lastActualAt || '';
      }
      if (durableValueHash(next) !== durableValueHash(value)) { archive(`${path}.${key}`, value); map[key] = next; }
    }
  };
  clearMap(state.relations, 'session.relations', (key, value) => key.startsWith('user->') || value?.from === 'user');
  clearMap(state.goals, 'session.goals', (_, value) => value?.actor === 'user');
  clearMap(state.rivalries, 'session.rivalries', (_, value) => value?.actor === 'user');
  clearMap(state.actorStates, 'session.actorStates', key => key === 'user');
  clearMap(state.development?.relations, 'session.development.relations', key => key.startsWith('user->'));
  clearMap(state.development?.global, 'session.development.global', (key, value) => key === 'user' || value?.actor === 'user');
  clearMap(state.development?.candidates, 'session.development.candidates', (_, value) => value?.actor === 'user');
  state.events = filterRecords(state.events, 'session.events', isUserPlanEvent);
  state.interactionHistory = filterRecords(state.interactionHistory, 'session.interactionHistory', event => event?.actor === 'user' && (event.target === 'user' || event.type !== 'observed_action'));
  state.lastPlan = stripPlan(state.lastPlan, 'session.lastPlan');
  stripLedger(state.interactionLedger, 'session.interactionLedger');
  for (const [index, entry] of (state.commitJournal || []).entries()) {
    const undo = entry?.undo;
    if (!isPlainObject(undo)) continue;
    const path = `session.commitJournal[${index}].undo`;
    clearMap(undo.relations, `${path}.relations`, (key, value) => key.startsWith('user->') || value?.from === 'user');
    clearMap(undo.goals, `${path}.goals`, (_, value) => value?.actor === 'user');
    clearMap(undo.rivalries, `${path}.rivalries`, (_, value) => value?.actor === 'user');
    clearMap(undo.actorStates, `${path}.actorStates`, key => key === 'user');
    clearMap(undo.devBuckets, `${path}.devBuckets`, key => key.startsWith('relation:user->') || key === 'global:user');
    if (Array.isArray(undo.trimmedEvents)) undo.trimmedEvents = filterRecords(undo.trimmedEvents, `${path}.trimmedEvents`, isUserPlanEvent);
    if (Array.isArray(undo.trimmedInteractionHistory)) undo.trimmedInteractionHistory = filterRecords(undo.trimmedInteractionHistory, `${path}.trimmedInteractionHistory`, event => event?.actor === 'user' && (event.target === 'user' || event.type !== 'observed_action'));
    if (isPlainObject(undo.lastPlan)) undo.lastPlan = stripPlan(undo.lastPlan, `${path}.lastPlan`);
    stripLedger(undo.interactionLedger, `${path}.interactionLedger`, false);
  }
  return changed;
}

export function relationKey(fromId, toId) {
  return `${fromId}->${toId}`;
}

export function variantRelationKey(variantKey, fromId, toId) {
  return `${String(variantKey || 'default')}::${relationKey(fromId, toId)}`;
}

export function isBaseRelationSuppressed(profileStore, sourceBundleKey, variantKey, fromId, toId) {
  const entries = profileStore?.baseRelationSuppressions?.entries;
  return !!(isPlainObject(entries) && entries[baseRelationSuppressionKey(sourceBundleKey, variantKey, fromId, toId)]);
}

export function isPairRecordEvent(event) {
  if (!event?.actor || !event?.target || event.actor === event.target) return false;
  if (event.type === 'observed_action' || event.type === 'relation_update' || event.type === 'goal_result') return true;
  return event.type === 'decision' && event.decisionType === 'ACT';
}

export function compactInteractionEvent(event) {
  return {
    id: String(event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    turn: Number.isFinite(Number(event.turn)) ? Number(event.turn) : 0,
    at: event.at || new Date().toISOString(),
    type: String(event.type || 'event'),
    actor: String(event.actor || ''),
    target: String(event.target || ''),
    mode: truncate(event.mode, 120),
    result: truncate(event.result, 120),
    status: truncate(event.status, 120),
    decisionType: truncate(event.decisionType, 80),
    goalId: truncate(event.goalId, 160),
    goalType: truncate(event.goalType, 120),
    desire: event.desire === null || event.desire === undefined ? null : Math.round(clampNumber(event.desire, 50)),
    summary: truncate(event.summary, 700),
  };
}

export function emptyPairLedger(actor, target) {
  return {
    accountingVersion: 2,
    actor,
    target,
    firstTurn: 0,
    lastTurn: 0,
    firstAt: '',
    lastAt: '',
    actualCount: 0,
    partialCount: 0,
    actualWeight: 0,
    detailOnlyCount: 0,
    lastActualTurn: 0,
    lastActualAt: '',
    plannedCount: 0,
    relationUpdateCount: 0,
    goalEventCount: 0,
    byMode: {},
    byResult: {},
    lastSummary: '',
    lastEventType: '',
  };
}

export function accumulatePairLedger(ledger, event) {
  const turn = Number(event.turn || 0);
  if (!ledger.firstTurn || turn < ledger.firstTurn) ledger.firstTurn = turn;
  if (turn >= ledger.lastTurn) {
    ledger.lastTurn = turn;
    ledger.lastAt = event.at || ledger.lastAt;
    ledger.lastSummary = truncate(event.summary, 700);
    ledger.lastEventType = event.type || '';
  }
  if (!ledger.firstAt) ledger.firstAt = event.at || '';
  if (event.type === 'observed_action') {
    const execution = String(event.result || event.execution || 'executed');
    if (execution === 'executed') {
      ledger.actualCount += 1;
      ledger.actualWeight = Number(ledger.actualWeight || 0) + 1;
      ledger.lastActualTurn = Math.max(Number(ledger.lastActualTurn || 0), turn);
      ledger.lastActualAt = event.at || ledger.lastActualAt;
    } else if (execution === 'partially_executed') {
      ledger.partialCount = Number(ledger.partialCount || 0) + 1;
      ledger.actualWeight = Number(ledger.actualWeight || 0) + 0.5;
      ledger.lastActualTurn = Math.max(Number(ledger.lastActualTurn || 0), turn);
      ledger.lastActualAt = event.at || ledger.lastActualAt;
    } else {
      ledger.detailOnlyCount = Number(ledger.detailOnlyCount || 0) + 1;
    }
  }
  else if (event.type === 'decision') ledger.plannedCount += 1;
  else if (event.type === 'relation_update') ledger.relationUpdateCount += 1;
  else if (event.type === 'goal_result') ledger.goalEventCount += 1;
  if (event.mode) ledger.byMode[event.mode] = (ledger.byMode[event.mode] || 0) + 1;
  const resultKey = event.result || event.status || event.decisionType;
  if (resultKey) ledger.byResult[resultKey] = (ledger.byResult[resultKey] || 0) + 1;
}

export function interactionLedgerNeedsAccountingV2(value, history = []) {
  if (!isPlainObject(value)) return true;
  const entries = Object.values(value);
  const pairHistory = (Array.isArray(history) ? history : []).filter(isPairRecordEvent);
  const historyHasMissingPair = pairHistory.some((event) => !value[relationKey(event.actor, event.target)]);
  return (entries.length === 0 && pairHistory.length > 0) || historyHasMissingPair || entries.some((entry) => !isPlainObject(entry)
    || entry.accountingVersion !== 2
    || !Object.prototype.hasOwnProperty.call(entry, 'actualCount')
    || !Object.prototype.hasOwnProperty.call(entry, 'partialCount')
    || !Object.prototype.hasOwnProperty.call(entry, 'actualWeight')
    || !Object.prototype.hasOwnProperty.call(entry, 'detailOnlyCount')
    || !Object.prototype.hasOwnProperty.call(entry, 'lastActualTurn'));
}

export function migratePairLedgerAccounting(value, retained) {
  const count = (n) => Math.max(0, Number.isFinite(Number(n)) ? Math.floor(Number(n)) : 0);
  const recent = retained || emptyPairLedger(value.actor, value.target);
  const results = isPlainObject(value.byResult) ? value.byResult : {};
  const reportedTotal = count(value.actualCount);
  const full = count(results.executed);
  const partial = count(results.partially_executed);
  const detail = count(results.ignored) + count(results.changed_by_main_model);
  const classified = full + partial + detail;
  // The history is only a retained suffix. Cumulative result counters are
  // stronger evidence when they are consistent with the legacy action total.
  const consistent = classified <= reportedTotal
    && full >= recent.actualCount
    && partial >= recent.partialCount
    && detail >= recent.detailOnlyCount;
  const next = { ...emptyPairLedger(value.actor, value.target), ...value };
  next.accountingVersion = 2;
  next.actualCount = consistent ? full : recent.actualCount;
  next.partialCount = consistent ? partial : recent.partialCount;
  next.detailOnlyCount = consistent ? detail : recent.detailOnlyCount;
  next.actualWeight = next.actualCount + next.partialCount * 0.5;
  next.legacyUnclassifiedCount = Math.max(0, reportedTotal - next.actualCount - next.partialCount - next.detailOnlyCount);
  next.legacyAccounting = {
    method: consistent ? 'cumulative_result_totals' : 'retained_history_only',
    original: safeClone(value),
  };
  for (const field of ['plannedCount', 'relationUpdateCount', 'goalEventCount']) {
    next[field] = Math.max(count(value[field]), count(recent[field]));
  }
  next.byMode = { ...(isPlainObject(value.byMode) ? value.byMode : {}) };
  next.byResult = { ...results };
  for (const field of ['byMode', 'byResult']) {
    for (const [key, amount] of Object.entries(recent[field] || {})) {
      next[field][key] = Math.max(count(next[field][key]), count(amount));
    }
  }
  next.lastActualTurn = Math.max(count(value.lastActualTurn), count(recent.lastActualTurn));
  next.lastActualAt = value.lastActualAt || recent.lastActualAt || '';
  return next;
}

export function rebuildInteractionState(state, config) {
  if (!Array.isArray(state.interactionHistory)) state.interactionHistory = [];
  if (!isPlainObject(state.interactionLedger)) state.interactionLedger = {};
  if (state.interactionHistory.length === 0) {
    state.interactionHistory = (Array.isArray(state.events) ? state.events : [])
      .filter(isPairRecordEvent)
      .map(compactInteractionEvent);
  }
  const needsAccountingV2Rebuild = interactionLedgerNeedsAccountingV2(state.interactionLedger, state.interactionHistory);
  if (needsAccountingV2Rebuild) {
    const ledger = {};
    const preservedV2Keys = new Set();
    for (const [key, value] of Object.entries(state.interactionLedger)) {
      if (!isPlainObject(value) || interactionLedgerNeedsAccountingV2({ [key]: value }, [])) continue;
      ledger[key] = {
        ...emptyPairLedger(value.actor, value.target),
        ...value,
        byMode: isPlainObject(value.byMode) ? value.byMode : {},
        byResult: isPlainObject(value.byResult) ? value.byResult : {},
      };
      preservedV2Keys.add(key);
    }
    for (const event of state.interactionHistory) {
      if (!isPairRecordEvent(event)) continue;
      const key = relationKey(event.actor, event.target);
      if (preservedV2Keys.has(key)) continue;
      if (!ledger[key]) ledger[key] = emptyPairLedger(event.actor, event.target);
      accumulatePairLedger(ledger[key], event);
    }
    for (const [key, value] of Object.entries(state.interactionLedger)) {
      if (preservedV2Keys.has(key) || !isPlainObject(value) || !value.actor || !value.target) continue;
      ledger[key] = migratePairLedgerAccounting(value, ledger[key]);
    }
    state.interactionLedger = ledger;
  } else {
    for (const [key, value] of Object.entries(state.interactionLedger)) {
      if (!isPlainObject(value) || !value.actor || !value.target) {
        delete state.interactionLedger[key];
        continue;
      }
      state.interactionLedger[key] = {
        ...emptyPairLedger(value.actor, value.target),
        ...value,
        byMode: isPlainObject(value.byMode) ? value.byMode : {},
        byResult: isPlainObject(value.byResult) ? value.byResult : {},
      };
    }
  }
  const limit = clampInt(config?.recordHistoryLimit, 1800, 200, 5000);
  if (state.interactionHistory.length > limit) state.interactionHistory.splice(0, state.interactionHistory.length - limit);
}

export function analysisSortedList(value, limit = 24, chars = 400) {
  return [...normalizeStringList(value, limit, chars)].sort((left, right) => left.localeCompare(right));
}

export function analysisSemanticEvidence(value, limit = 24, chars = 400) {
  const provenanceOnly = new Set(['named', 'source', 'current character card identity', 'current main character identity']);
  return analysisSortedList(value, limit, chars).filter((entry) => !provenanceOnly.has(String(entry).trim().toLowerCase()));
}

export function analysisBehaviorSnapshot(value) {
  const behavior = normalizeBehavior(value);
  return {
    frequency: behavior.frequency,
    directness: behavior.directness,
    styles: analysisSortedList(behavior.styles, 8, 240),
    typicalSituations: analysisSortedList(behavior.typicalSituations, 10, 300),
    preferredTargets: analysisSortedList(behavior.preferredTargets, 8, 240),
    preferredApproaches: analysisSortedList(behavior.preferredApproaches, 8, 300),
  };
}

export function analysisEntityVerdictSnapshot(value, isMain = false) {
  const verdict = normalizeEntityVerdict(value, isMain);
  return {
    status: verdict.status,
    entityType: verdict.entityType,
    confidence: verdict.confidence,
    reason: truncate(verdict.reason, 500),
    verifierVersion: verdict.verifierVersion,
  };
}

export function analysisSnapshotHash(value) {
  return value == null ? '' : fnv1a(JSON.stringify(value));
}

export function collectAnalysisChangedFields(before, after, path = '', output = []) {
  if (output.length >= ANALYSIS_EXECUTION_FIELD_LIMIT || JSON.stringify(before) === JSON.stringify(after)) return output;
  if (isPlainObject(before) && isPlainObject(after)) {
    for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])]) {
      collectAnalysisChangedFields(before[key], after[key], path ? `${path}.${key}` : key, output);
      if (output.length >= ANALYSIS_EXECUTION_FIELD_LIMIT) break;
    }
    return output;
  }
  output.push({ path: path || 'profile', before: sanitizeProfileAuditValue(before), after: sanitizeProfileAuditValue(after) });
  return output;
}

export function analysisProviderDescriptor(config) {
  const assignment = resolveRoleProfile(config, 'profile');
  const providerId = assignment.providerId;
  const modelId = String(assignment.profile?.model || '');
  return {
    id: providerId,
    label: PROVIDER_DEFS[providerId]?.label || providerId,
    modelId,
    modelLabel: modelId || (providerId === 'risu' ? 'RisuAI 현재 선택 보조 모델' : '모델 미지정'),
    modelResolved: !!modelId,
    apiFormat: assignment.profile?.apiFormat || '',
  };
}

export function remapUnpublishedAnalysisRelations(relations, remapped) {
  const next = {}, conflicts = [], blocked = new Set();
  for (const [key, value] of Object.entries(relations || {})) {
    const from = remapped.get(value.from) || value.from, to = remapped.get(value.to) || value.to;
    const relation = { ...value, from, to };
    const nextKey = from === value.from && to === value.to ? key : variantRelationKey(value.variantKey, from, to);
    if (from === to || blocked.has(nextKey) || (next[nextKey] && JSON.stringify(next[nextKey]) !== JSON.stringify(relation))) {
      conflicts.push({ reason: from === to ? 'identity_self_relation' : 'identity_relation_collision', originalKey: key, relation: safeClone(value), ...(next[nextKey] ? { previous: safeClone(next[nextKey]) } : {}) });
      delete next[nextKey];
      blocked.add(nextKey);
    } else next[nextKey] = relation;
  }
  return { relations: next, conflicts };
}

export function extractRelevantText(text, names, maxChars) {
  const source = String(text || '');
  if (source.length <= maxChars) return source;
  const lower = source.toLowerCase();
  const windows = [];
  const seenStarts = new Set();
  const addWindow = (center) => {
    const size = Math.max(1200, Math.min(5000, Math.floor(maxChars / Math.max(1, Math.min(names.length, 5)))));
    const start = Math.max(0, Math.min(source.length - size, center - Math.floor(size * .35)));
    const bucket = Math.floor(start / 500);
    if (seenStarts.has(bucket)) return;
    seenStarts.add(bucket);
    windows.push(source.slice(start, start + size));
  };
  for (const name of names) {
    let cursor = 0;
    let matches = 0;
    while (matches < 3) {
      const index = lower.indexOf(name, cursor);
      if (index < 0) break;
      addWindow(index);
      cursor = index + name.length;
      matches += 1;
    }
  }
  if (windows.length === 0) return truncate(source, maxChars);
  return truncate(windows.join('\n\n...[source window]...\n\n'), maxChars);
}

export function analysisCancelledError() {
  const error = new Error('캐릭터 분석이 사용자 요청으로 중지되었습니다.');
  error.code = 'EROSYNC_ANALYSIS_CANCELLED';
  return error;
}

export function analysisBatchId(kind, index, values) {
  const signature = (Array.isArray(values) ? values : [])
    .map((value) => String(value?.id || value?.hash || value || ''))
    .join('|');
  return `${kind}_${index + 1}_${fnv1a(signature)}`;
}

export function analysisIdSet(value) {
  return new Set(normalizeStringList(value, 10000, 220));
}

export function analysisCheckpointSnapshot(run, patch = {}) {
  const source = isPlainObject(run) ? run : {};
  return {
    ...source,
    completedDiscoveryBatchIds: [...analysisIdSet(source.completedDiscoveryBatchIds)],
    failedDiscoveryBatchIds: [...analysisIdSet(source.failedDiscoveryBatchIds)],
    completedProfileBatchIds: [...analysisIdSet(source.completedProfileBatchIds)],
    failedProfileBatchIds: [...analysisIdSet(source.failedProfileBatchIds)],
    completedVerificationBatchIds: [...analysisIdSet(source.completedVerificationBatchIds)],
    failedVerificationBatchIds: [...analysisIdSet(source.failedVerificationBatchIds)],
    stableIdMap: isPlainObject(source.stableIdMap) ? source.stableIdMap : {},
    ...patch,
  };
}

export function resolveDevelopmentPolicy(config) {
  if (config.developmentMode === 'cautious_auto') return { minEvidence: 5, minScenes: 4, minConfidence: 90, auto: true };
  if (config.developmentMode === 'standard_auto') return { minEvidence: 4, minScenes: 3, minConfidence: 80, auto: true };
  if (config.developmentMode === 'loose_auto') return { minEvidence: 3, minScenes: 2, minConfidence: 70, auto: true };
  return {
    minEvidence: clampInt(config.developmentMinEvidence, 4, 2, 20),
    minScenes: clampInt(config.developmentMinScenes, 3, 2, 12),
    minConfidence: clampInt(config.developmentAutoConfidence, 90, 70, 100),
    auto: config.developmentMode === 'custom',
  };
}

// 성격 변화 폭 배수(2026-10-23, Erosync.Development-Scale.Work-Plan.md): 설정값은 0.25~3을 0.25 단위로, 아니면 1.
export function developmentScaleValue(value, fallback = 1) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(clampNumber(number, fallback, 0.25, 3) * 4) / 4;
}

// 성적 동기 유형 변화(2026-10-23, Erosync.Motive-Change.Work-Plan.md): 인물이 제 입으로 대는 이유(own_words)와 성행위 뒤 아침의 모습(morning_after)만 근거로,
// 방식별 문턱의 두 배를 넘으면 검토 대기 후보가 된다(자동 반영 없음). 보조로 → 주된 유형으로 두 단계, 반영 뒤 40턴 냉각, 전반 범위만, SFW 제외(호출처에서 거른다).
export const MOTIVE_CHANGE_COOLDOWN_TURNS = 40;

export const MOTIVE_MIN_CONFIDENCE = 70;

export const MOTIVE_REASON_SOURCES = Object.freeze(['own_words', 'morning_after', 'behavior']);

export const MOTIVE_EVIDENCE_SOURCES = Object.freeze(['own_words', 'morning_after']);

export function motiveCandidateStage(current, motive) {
  if (!current) return 'secondary';
  if (current.primary === motive) return '';
  return current.secondary === motive ? 'primary' : 'secondary';
}

export function motiveChangeCooling(state, actor) {
  const changedTurn = Number(state?.development?.global?.[actor]?.motiveOverride?.changedTurn);
  return Number.isFinite(changedTurn) && Number(state?.turnIndex || 0) < changedTurn + MOTIVE_CHANGE_COOLDOWN_TURNS;
}

export function hasSessionRelationChanges(relation) {
  return Number(relation?.lastUpdatedTurn || 0) > 0 || (isPlainObject(relation?.changeRemainders)
    && RELATION_CHANGE_FIELDS.some(field => typeof relation.changeRemainders[field] === 'number'
      && Number.isFinite(relation.changeRemainders[field]) && Math.abs(relation.changeRemainders[field]) < 1));
}

export function accumulatedRelationChange(value, scaledDelta, remainder = 0, fallback = 50) {
  const current = clampNumber(value, fallback);
  const previous = typeof remainder === 'number' && Number.isFinite(remainder) && Math.abs(remainder) < 1 ? remainder : 0;
  if (!Number.isFinite(scaledDelta) || scaledDelta === 0) return { value: current, remainder: previous };
  const total = previous + scaledDelta;
  // Snap only the integer boundary; do not round each small incoming change away.
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(total)) * 8;
  const whole = Math.trunc(total + Math.sign(total) * tolerance);
  const deltaWhole = Math.trunc(scaledDelta);
  // Adding an integer must not perturb an already saved fractional remainder.
  let pending = previous + (scaledDelta - deltaWhole) - (whole - deltaWhole);
  if (pending && Math.sign(pending) !== Math.sign(total)) pending = 0;
  const wanted = current + whole;
  const next = clampNumber(wanted, fallback);
  if (next !== wanted || (next === 100 && pending > 0) || (next === 0 && pending < 0)) pending = 0;
  return { value: next, remainder: pending === 0 ? 0 : pending };
}

export function removeOwnInjection(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => {
      if (message?.role !== 'system' || typeof message.content !== 'string') return true;
      return !message.content.startsWith(INJECTION_START)
        && !message.content.startsWith('[EROSYNC_TURN_V3]')
        && !message.content.startsWith('[EROSYNC_TURN_V1]');
    })
    .map((message) => isPlainObject(message) ? { ...message } : message);
}

// RisuPot(2026-10-16): 인물 기록·팩트전달 노트는 기억(참고 자료), 연출지시 노트는 감독(판단에서 뺌). 홈 목록에는 RisuPot을 한 번만 보인다(home: false).
export const COMPATIBILITY_SOURCES = Object.freeze({
  flashback: { label: 'Flashback', group: 'memory' }, hayaku: { label: 'HAYAKU', group: 'memory' },
  libra: { label: 'LIBRA', group: 'memory' }, simcore: { label: 'SimCore', group: 'memory' }, wyglore: { label: 'WYGlore', group: 'memory' },
  risupot: { label: 'RisuPot', group: 'memory' },
  archive_director: { label: 'Archive Center', group: 'director' }, gradia_director: { label: 'GRADIA', group: 'director' },
  agents_director: { label: 'Agents!', group: 'director' }, coco_director: { label: 'cocoA(gent!)', group: 'director' },
  risupot_director: { label: 'RisuPot Director', group: 'director', home: false },
});

// Diagnostic-only storage: never included in sessions, backups or model inputs.
export function createCompatibilityDiagnostics(notify = () => {}) {
  const entries = new Map(), maxEntries = 100, maxBytes = 128 * 1024;
  let sequence = 0, generation = 0, bytes = 2, encoder = null;
  const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
  const scopeOf = scope => ({ sourceBundleKey: text(scope?.sourceBundleKey, 96), scopeKey: text(scope?.scopeKey, 200), variantKey: text(scope?.variantKey || 'default', 160) });
  const sameScope = (left, right) => left.sourceBundleKey === right?.sourceBundleKey && left.scopeKey === right?.scopeKey && left.variantKey === String(right?.variantKey || 'default');
  const announce = () => { try { notify(); } catch (_) {} };
  const excerpt = value => {
    const sample = text(value, 600);
    const hidden = /authorization|api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|client[_\s-]?secret|private[_\s-]?key|password|passwd|비밀번호|bearer\s|-----BEGIN|\b(?:sk|sess|rk)-[\w-]+|\bAIza[\w-]+|\bya29\.|\beyJ[\w-]{12,}/i.test(sample);
    return { excerpt: hidden ? '' : JSON.parse(JSON.stringify(sample.slice(0, 300))), excerptHidden: hidden, excerptTruncated: typeof value === 'string' && value.length > 300 };
  };
  const put = (row, create = false) => {
    const previous = entries.get(row.id);
    if (!create && !previous) return; // late completion cannot revive an evicted item
    encoder ||= new TextEncoder();
    const size = encoder.encode(JSON.stringify(row)).length + 1;
    if (size > maxBytes - 2) return;
    entries.set(row.id, { row, size }); bytes += size - (previous?.size || 0);
    while (entries.size > maxEntries || bytes > maxBytes) {
      const oldest = entries.keys().next().value; bytes -= entries.get(oldest).size; entries.delete(oldest);
    }
    announce();
  };
  const patch = (id, fields) => { const saved = entries.get(id); if (saved) put({ ...saved.row, ...fields }); };
  const api = {
    start(scope) {
      const selected = scopeOf(scope);
      if (!selected.sourceBundleKey || !selected.scopeKey) return null;
      return { id: `compat_${++sequence}`, generation, scope: selected, ids: [], externalIds: [], attemptId: '' };
    },
    record(trace, slot, source, content, stage, reason) {
      if (!trace || trace.generation !== generation || !Object.hasOwn(COMPATIBILITY_SOURCES, source)) return null;
      const id = `${trace.id}:${slot}`;
      if (!trace.ids.includes(id)) { trace.ids.push(id); if (trace.ids.length > maxEntries) trace.ids.shift(); }
      put({ id, ...trace.scope, source, at: new Date().toISOString(), requestId: trace.id, attemptId: '', baseCommitId: '', turn: null,
        stage, reason, collectedChars: typeof content === 'string' ? content.length : 0, preparedChars: 0, includedChars: stage.endsWith('_excluded') ? 0 : null,
        requestState: 'unknown', requestNumber: 0, errorCode: '', httpStatus: 0, invalidated: false, ...excerpt(content) }, true);
      return id;
    },
    prepared(id, chars, stage = 'reference_prepared', reason = 'bounded_reference') { patch(id, { preparedChars: chars, stage, reason, ...(stage.endsWith('_excluded') ? { includedChars: 0 } : {}) }); },
    references(trace, ids) { if (trace) trace.externalIds = ids.slice(0, EXTERNAL_CONTEXT_MAX_ITEMS); },
    fromReferences(scope, references) {
      const trace = api.start(scope); if (!trace) return null;
      trace.externalIds = (Array.isArray(references) ? references : []).slice(0, EXTERNAL_CONTEXT_MAX_ITEMS).map((item, index) => {
        const id = api.record(trace, index, item?.source, item?.content, 'reference_prepared', 'reused_reference');
        api.prepared(id, typeof item?.content === 'string' ? item.content.length : 0, 'reference_prepared', 'reused_reference');
        return id;
      });
      return trace;
    },
    bind(trace, values) {
      for (const id of trace?.ids || []) patch(id, {
        ...(typeof values.requestId === 'string' ? { requestId: text(values.requestId, 180) } : {}),
        ...(typeof values.baseCommitId === 'string' ? { baseCommitId: text(values.baseCommitId, 180) } : {}),
        ...(Number.isInteger(values.turn) && values.turn >= 0 ? { turn: values.turn } : {}),
        ...(values.requestState ? { requestState: values.requestState } : {}),
      });
    },
    finalInput(trace, references, tooLarge = false) {
      if (!trace) return;
      trace.inputTooLarge = tooLarge;
      for (const [index, id] of trace.externalIds.entries()) {
        const saved = entries.get(id)?.row; if (!saved) continue;
        const item = references?.[index];
        if (item?.source === saved.source && typeof item.content === 'string' && item.content.length) {
          const preview = excerpt(item.content);
          patch(id, { includedChars: item.content.length, stage: item.content.length < saved.collectedChars ? 'input_shortened' : 'input_included',
            reason: tooLarge ? 'prompt_limit_no_call' : 'final_input', requestState: tooLarge ? 'not_called' : 'preparing',
            ...preview, ...(saved.excerptHidden ? { excerpt: '', excerptHidden: true } : {}) });
        } else patch(id, { includedChars: 0, stage: 'limit_excluded', reason: 'final_compaction', requestState: tooLarge ? 'not_called' : 'preparing' });
      }
    },
    attempt(trace, value) {
      if (!trace || !value) return;
      const phases = ['queued', 'preparing', 'requesting', 'retry_wait', 'parsing', 'validating', 'applying', 'prepared', 'failed', 'cancelled', 'discarded', 'skipped'];
      if (value.id) trace.attemptId = text(value.id, 180);
      for (const id of trace.ids) patch(id, {
        attemptId: trace.attemptId, requestState: trace.inputTooLarge ? 'not_called' : phases.includes(value.phase) ? value.phase : 'unknown',
        requestNumber: Number.isInteger(value.attemptNumber) ? Math.max(0, Math.min(100, value.attemptNumber)) : 0,
        errorCode: /^[A-Z0-9_]{1,100}$/.test(value.errorCode || '') ? value.errorCode : '',
        httpStatus: Number.isInteger(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599 ? value.httpStatus : 0,
      });
    },
    invalidate(scope, commitIds) {
      const removed = new Set(commitIds || []);
      if (!removed.size) return;
      for (const { row } of entries.values()) if (sameScope(row, scope) && removed.has(row.baseCommitId)) patch(row.id, { invalidated: true });
    },
    rows(scope) { return [...entries.values()].filter(({ row }) => sameScope(row, scope)).map(({ row }) => ({ ...row })).reverse(); },
    has(scope) { return [...entries.values()].some(({ row }) => sameScope(row, scope)); },
    stats() { return { count: entries.size, bytes, maxEntries, maxBytes }; },
    clear(mode = 'all', botKey = '', scopeKey = '') {
      generation++;
      for (const [id, entry] of entries) if (mode === 'all' || mode === 'bot' && entry.row.sourceBundleKey === botKey || mode !== 'all' && mode !== 'bot' && entry.row.scopeKey === scopeKey) { bytes -= entry.size; entries.delete(id); }
      if (!entries.size) bytes = 2;
      announce();
    },
  };
  return api;
}

export function externalMessageSource(message, hasRemovableDialogue = false) {
  if (!message || typeof message.content !== 'string') return '';
  const memo = String(message.memo || message.metadata?.memo || '').toLowerCase();
  const content = message.content;
  if (/<\/?agents_analysis_note>|\[cocoA\(gent!\) Analysis Context\]/i.test(content)) return 'coco_director';
  if (memo.includes('debug') || memo.includes('diagnostic') || /^\s*\[(?:DEBUG|TRACE|DIAGNOSTIC|PLUGIN LOG)[^\]]*\]/i.test(content)) return 'technical_debug';
  if (memo.includes('hayaku-runtime-context') || memo.includes('hayaku-cache-static') || /\[HAYAKU(?:\s|_)/i.test(content)) return 'hayaku';
  if (/\[(?:FLASHBACK EVIDENCE CONTRACT|PAST EVIDENCE RULES|FLASHBACK MEMORY)/i.test(content)) return 'flashback';
  if (/\[(?:LIBRA[^\]\n]{0,100}(?:Injection|Runtime Contract)|LIBRA-HAYAKU|LIBRA-FLASHBACK)/i.test(content)) return 'libra';
  if (/\b(?:SIMCORE|simcore state|시뮬 엔진)\b|⟦simcore:\d+⟧/i.test(content)) return 'simcore';
  if (/\b(?:WYGlore|WygLore Leaf|WL MEMORY|WL LORE)\b/i.test(content)) return 'wyglore';
  if (/\b(?:GRADIA|SHADOW ACT|Character AIDE|World AIDE|Plot AIDE)\b/i.test(content)) return 'gradia_director';
  if (/\b(?:Agents!|AGENT NOTES|PRE-AGENT|POST-AGENT)\b/i.test(content)) return 'agents_director';
  if (/\b(?:Archive Center|Publisher Directive|Supervisor Directive|RECOMPOSER)\b/i.test(content)) return 'archive_director';
  if (hasRemovableDialogue && message.role === 'assistant' && message.removable !== true && message.isChat !== true) return 'omninode_or_synthetic';
  return '';
}

export function stripTechnicalArtifacts(value) {
  return stripKocoArtifacts(value)
    .replace(/\n?⟦simcore:\d+⟧\s*/gi, '\n')
    .replace(/<!--[\s\S]*?(?:HAYAKU_STATE_PACKET|HAYAKU|FLASHBACK|LIBRA|WYGLORE)[\s\S]*?-->/gi, '')
    .replace(/\[(?:EROSYNC|HAYAKU|FLASHBACK|LIBRA|WYGLORE)[^\]\n]*\][\s\S]*?\[\/(?:EROSYNC|HAYAKU|FLASHBACK|LIBRA|WYGLORE)[^\]\n]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitRisupotBlocks(content) {
  const result = { found: false, remaining: typeof content === 'string' ? content : '', references: [], facts: [], directives: [] };
  if (!result.remaining.includes('<!-- RISUPOT_')) return result;
  const take = (start, end, onBlock) => {
    for (let guard = 0; guard < 8; guard += 1) {
      const from = result.remaining.indexOf(start);
      if (from < 0) return;
      const to = result.remaining.indexOf(end, from + start.length);
      if (to < 0) return;
      result.found = true;
      onBlock(result.remaining.slice(from + start.length, to));
      result.remaining = result.remaining.slice(0, from) + result.remaining.slice(to + end.length);
    }
  };
  take('<!-- RISUPOT_WIKI_REFERENCE_START -->', '<!-- RISUPOT_WIKI_REFERENCE_END -->', (inner) => {
    const body = inner.replace(/^\s*\[CONTROL\][^\n]*\n?/, '').trim();
    if (!body) return;
    let records = null;
    try { const parsed = JSON.parse(body); if (Array.isArray(parsed)) records = parsed; } catch (_) {}
    if (!records) { result.references.push(body); return; }
    for (const record of records) {
      const text = risupotRecordText(record);
      if (text) result.references.push(text);
    }
  });
  take('<!-- RISUPOT_DIRECTOR_NOTE_START -->', '<!-- RISUPOT_DIRECTOR_NOTE_END -->', (inner) => {
    const lines = inner.trim().split('\n');
    const control = /^\[CONTROL\s*\S\s*DIRECTOR NOTE\]/.test(lines[0] || '') ? lines.shift() : '';
    const note = lines.join('\n').trim();
    if (!note) return;
    if (/^\[CONTROL\s*\S\s*DIRECTOR NOTE\]\s*Use the following as factual reference\b/.test(control)) result.facts.push(note);
    else result.directives.push(note);
  });
  if (result.found) result.remaining = result.remaining.trim();
  return result;
}

export function recentConversation(messages, limit) {
  const result = [];
  for (const message of Array.isArray(messages) ? messages : []) {
    if (!message || typeof message.content !== 'string') continue;
    const role = message.role === 'assistant' || message.role === 'char' ? 'assistant' : message.role === 'user' ? 'user' : null;
    if (!role) continue;
    const content = truncate(message.content.trim(), 6000);
    if (content) result.push({ role, content });
  }
  return result.slice(-limit);
}

export function buildTurnKey(scope, conversation) {
  const chatMessages = Array.isArray(scope?.chat?.message) ? scope.chat.message : [];
  let userCount = 0;
  let assistantCount = 0;
  let latestUserIndex = -1;
  let latestUserId = '';
  let latestUser = '';
  let latestAssistantId = '';
  let latestAssistant = '';
  for (let index = 0; index < chatMessages.length; index += 1) {
    const message = chatMessages[index];
    const role = String(message?.role || '');
    if (role === 'user') {
      userCount += 1;
      latestUserIndex = index;
      latestUserId = String(message?.id ?? message?.messageId ?? message?.chatId ?? '');
      latestUser = chatMessageText(message);
    } else if (role === 'char' || role === 'assistant') {
      assistantCount += 1;
      latestAssistantId = String(message?.id ?? message?.messageId ?? message?.chatId ?? '');
      latestAssistant = chatMessageText(message);
    }
  }
  if (latestUserIndex < 0) {
    const userMessages = conversation.filter((message) => message.role === 'user');
    userCount = userMessages.length;
    latestUser = userMessages[userMessages.length - 1]?.content || '';
  }
  return `${scope.scopeKey}:${userCount}:${latestUserIndex}:${safeKeyPart(latestUserId, 'noid')}:${commitContentHash(latestUser)}:${assistantCount}:${safeKeyPart(latestAssistantId, 'noid')}:${commitContentHash(latestAssistant)}`;
}

export function buildRequestSlotKey(scope, conversation) {
  const chatMessages = Array.isArray(scope?.chat?.message) ? scope.chat.message : [];
  let userCount = 0;
  let latestUserIndex = -1;
  let latestUserId = '';
  let latestUser = '';
  for (let index = 0; index < chatMessages.length; index += 1) {
    const message = chatMessages[index];
    if (String(message?.role || '') !== 'user') continue;
    userCount += 1;
    latestUserIndex = index;
    latestUserId = String(message?.id ?? message?.messageId ?? message?.chatId ?? '');
    latestUser = chatMessageText(message);
  }
  if (latestUserIndex < 0) {
    const userMessages = conversation.filter((message) => message.role === 'user');
    userCount = userMessages.length;
    latestUser = userMessages[userMessages.length - 1]?.content || '';
  }
  return `${scope.scopeKey}:${userCount}:${latestUserIndex}:${safeKeyPart(latestUserId, 'noid')}:${commitContentHash(latestUser)}`;
}

export function latestUserInputHash(scope, conversation) {
  const chatMessages = Array.isArray(scope?.chat?.message) ? scope.chat.message : [];
  for (let index = chatMessages.length - 1; index >= 0; index -= 1) {
    if (String(chatMessages[index]?.role || '') === 'user') return commitContentHash(chatMessageText(chatMessages[index]));
  }
  const userMessages = conversation.filter((message) => message.role === 'user');
  return commitContentHash(userMessages[userMessages.length - 1]?.content || '');
}

export function coordinatesKey(scopeOrIndices) {
  return `${scopeOrIndices?.characterIndex ?? -1}:${scopeOrIndices?.chatIndex ?? -1}`;
}

// 성격 변화 보정이 듣는 축 값 읽기·쓰기(2026-10-23): 성적 관심도는 {level} 객체라 level에 더한다. 그 밖의 축은 숫자 그대로.
export function developmentTraitValue(profile, trait) {
  return trait === 'eroticInterest' ? sexAxisValueOf(profile, 'eroticInterest') : profile?.[trait];
}

export function setDevelopmentTraitValue(profile, trait, value) {
  if (trait === 'eroticInterest') profile.eroticInterest = { ...(isPlainObject(profile.eroticInterest) ? profile.eroticInterest : {}), level: value };
  else profile[trait] = value;
}

export function normalizeDuskGuard(v) {
  const n = (x, d, lo, hi) => Math.round(clampNumber(x, d, lo, hi));
  return { on: v?.on === true, obsessionCap: n(v?.obsessionCap, 20, 0, 100), sameTargetTurns: n(v?.sameTargetTurns, 3, 1, 20), restTurns: n(v?.restTurns, 4, 1, 50) };
}

export function compactRivalriesForDirector(rivalries, candidateIds) {
  const allowed = new Set([...candidateIds, 'user']);
  return Object.values(isPlainObject(rivalries) ? rivalries : {})
    .filter((value) => isPlainObject(value) && value.actor !== 'user' && allowed.has(value.actor) && allowed.has(value.rival) && allowed.has(value.focusTarget))
    .slice(0, 40)
    .map((value) => ({
      id: value.id,
      actor: value.actor,
      rival: value.rival,
      focusTarget: value.focusTarget,
      kind: 'romantic',
      intensity: Math.round(clampNumber(value.intensity, 0)),
      reason: truncate(value.reason, 300),
      confidence: Math.round(clampNumber(value.confidence, 40)),
    }));
}

export function compactGoalsForDirector(goals, candidateIds) {
  const allowed = new Set([...candidateIds, 'user']);
  return Object.values(goals || {})
    .filter((goal) => isPlainObject(goal) && goal.actor !== 'user' && allowed.has(goal.actor) && allowed.has(goal.target) && !['complete', 'abandon'].includes(goal.status))
    .slice(0, 30)
    .map((goal) => ({
      goalId: goal.goalId,
      actor: goal.actor,
      target: goal.target,
      type: goal.type,
      ...(normalizeGoalType(goal.type) === 'sexual_intercourse' ? { desire: Math.round(clampNumber(goal.desire, 50)) } : {}),
      objective: goal.objective,
      currentApproach: goal.currentApproach,
      nextMove: goal.nextMove,
      priority: goal.priority,
      persistence: goal.persistence,
      status: goal.status,
      lastAttemptTurn: goal.lastAttemptTurn,
    }));
}

export function deterministicRoll(turnKey, action) {
  return Number.parseInt(fnv1a(`${turnKey}:${action.actor}:${action.target}:${action.mode}`), 16) % 100;
}

// 같은 행동 인물·같은 모드의 계획이 냉각 턴 안에 있으면 벌점 35. 되받은 이어가기(2026-10-22, 계획서 8절): 그 계획 뒤에 같은 상대가 몸으로 되받은
// 실제 행동(reciprocated true)이 있으면 벌점이 없다(모든 모드).
export function recentActionPenalty(state, actor, mode, config, target = '') {
  const events = Array.isArray(state.events) ? state.events : [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type !== 'decision' || event.decisionType !== 'ACT') continue;
    if (event.actor !== actor || event.mode !== mode) continue;
    const distance = state.turnIndex - Number(event.turn || 0);
    if (distance > config.cooldownTurns) break;
    const reciprocated = !!target && events.slice(index + 1).some(later => later.type === 'observed_action' && later.actor === actor && later.target === target && later.reciprocated === true);
    return reciprocated ? 0 : 35;
  }
  return 0;
}

export function botPlanningInputs(store) {
  return JSON.stringify(Object.entries(store?.bots || {}).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key,
    value.narrativePreset || 'general', value.domains || {}, value.activeVariantKey || 'default', value.analysisModules?.revision || 0,
    relationChangePlanningSettings(value),
    contentPolicyFor(value),
    sexualTargetPlanningSettings(value),
  ]));
}

// 관계 온도: 확정할 때마다 모든 관계의 호감·끌림·반감을 한 줄 남긴다(AI 호출 없음). 같은 턴 이상의 기록은 되돌리기·다시 쓰기에서 지운다.
export function duskTempRecord(state) {
  try {
    const turn = clampInt(state.turnIndex, 0, 0, 100000000);
    const rel = Object.values(isPlainObject(state.relations) ? state.relations : {}).filter((r) => r?.from && r?.to).slice(0, 40)
      .map((r) => [String(r.from), String(r.to), Math.round(clampNumber(r.affection, 50)), Math.round(clampNumber(r.eroticAttraction, 50)), Math.round(clampNumber(r.hatred, 0))]);
    const keep = (Array.isArray(state.duskTemp) ? state.duskTemp : []).filter((e) => Number(e?.turn) < turn);
    keep.push({ turn, rel });
    state.duskTemp = keep.slice(-120);
  } catch { /* 기록은 실패해도 본체는 계속 */ }
}

export function duskTempSeries(state, from, to) {
  const pts = [];
  for (const e of Array.isArray(state?.duskTemp) ? state.duskTemp : []) {
    if (Number.isFinite(Number(state?.turnIndex)) && Number(e.turn) > Number(state.turnIndex)) continue;   // 되돌린 뒤 남은 앞선 기록은 보지 않는다
    const r = (e.rel || []).find((x) => x[0] === from && x[1] === to);
    if (r) pts.push({ turn: e.turn, a: r[2], e: r[3], h: r[4] });
  }
  return pts;
}

export function injectBeforeLastUser(messages, content) {
  if (!content) return messages;
  const result = messages.map((message) => isPlainObject(message) ? { ...message } : message);
  let insertAt = -1;
  for (let index = result.length - 1; index >= 0; index -= 1) {
    if (result[index]?.role === 'user') { insertAt = index; break; }
  }
  if (insertAt < 0) {
    insertAt = result.findIndex((message) => message?.role !== 'system');
    if (insertAt < 0) insertAt = result.length;
  }
  result.splice(insertAt, 0, { role: 'system', content });
  return result;
}

export function nsfwPlusRecheckNeeded(raw, candidates, state) {
  const forecast = isPlainObject(raw?.nextCastForecast) ? raw.nextCastForecast : {};
  const present = new Set(['confirmed', 'likely', 'arrivalSupported'].flatMap(key => Array.isArray(forecast[key]) ? forecast[key].map(id => String(id || '').toLowerCase()) : []));
  const presentId = id => present.has(String(id || '').toLowerCase());
  const highExtremity = (candidates || []).some(candidate => presentId(candidate.id) && Number.isFinite(candidate.effectiveProfile?.extremity) && candidate.effectiveProfile.extremity >= 61);
  const retaliationActive = Object.values(state?.goals || {}).some(goal => isPlainObject(goal) && ['active', 'continue_later'].includes(goal.status) && normalizeGoalType(goal.type) === 'retaliation' && presentId(goal.actor));
  if (!highExtremity && !retaliationActive) return false;
  const chosen = raw?.decision?.type === 'ACT' && (Array.isArray(raw.decision.actions) ? raw.decision.actions : []).some(action => action?.refusalOverride === true);
  return !chosen;
}

// 보관 판정: 인물 참조가 현재 변형에서 허용되지 않으면 보관(판단 제외, 화면 접기). user와 빈 값은 늘 허용.
export function entityHeld(id, identityContext) {
  const value = String(id || '');
  return !!value && value !== 'user' && !identityContext.allowed(value);
}

export function recordHeld(record, identityContext) {
  return entityHeld(record?.actor, identityContext) || entityHeld(record?.target, identityContext);
}

export function heldFilteredScene(scene, identityContext) {
  if (!isPlainObject(scene)) return scene;
  const keep = list => (Array.isArray(list) ? list : []).filter(id => !entityHeld(id, identityContext));
  const forecast = isPlainObject(scene.nextCastForecast) ? scene.nextCastForecast : null;
  return {
    ...scene,
    presentAtEnd: keep(scene.presentAtEnd),
    departedAtEnd: keep(scene.departedAtEnd),
    ...(forecast ? { nextCastForecast: Object.fromEntries(Object.entries(forecast).map(([key, value]) => [key, Array.isArray(value) ? keep(value) : value])) } : {}),
  };
}

export function compactSceneValue(value, textLimit = 320, listLimit = 8, depth = 0) {
  if (typeof value === 'string') return truncate(value, textLimit);
  if (Array.isArray(value)) return value.slice(0, listLimit).map(item => compactSceneValue(item, textLimit, listLimit, depth + 1));
  if (!isPlainObject(value) || depth >= 6) return value;
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 40)) result[key] = compactSceneValue(item, textLimit, listLimit, depth + 1);
  return result;
}

export function normalizeSexualTargets(value) {
  const result = {};
  for (const [key, item] of Object.entries(isPlainObject(value) ? value : {})) {
    const entry = normalizeSexualTarget(item, key);
    if (entry) result[relationKey(entry.actor, entry.target)] = entry;
  }
  return result;
}

export function sexualTargetFor(state, actor, target) {
  const entry = state?.sexualTargets?.[relationKey(actor, target)];
  return isPlainObject(entry) ? entry : null;
}

// 장면 판단 입력 internalSexualTargets: 후보 인물의 대상만, 행동 인물당 원함이 높은 6명, 전체 40.
export function compactSexualTargetsForDirector(targets, candidateIds, turnIndex = 0) {
  const allowed = new Set([...(candidateIds || []), 'user']);
  const rows = Object.values(isPlainObject(targets) ? targets : {}).filter(item => isPlainObject(item) && allowed.has(item.actor) && allowed.has(item.target)).sort((a, b) => b.desire - a.desire);
  const perActor = new Map();
  for (const item of rows) {
    const list = perActor.get(item.actor) || [];
    if (list.length < 6) list.push(item);
    perActor.set(item.actor, list);
  }
  return [...perActor.values()].flat().slice(0, 40).map(item => ({
    actor: item.actor, target: item.target, desire: item.desire, rung: item.rung, rungLabel: SEXUAL_RUNG_DIRECTOR[clampInt(item.rung, 0, 0, 5)],
    lastReciprocated: item.lastReciprocated, established: item.established === true, fulfilledCount: clampInt(item.fulfilledCount, 0, 0, 100000),
    turnsSinceUpdate: Math.max(0, clampInt(turnIndex, 0, 0, 100000000) - clampInt(item.lastUpdatedTurn, 0, 0, 100000000)),
    ...(item.reason ? { reason: item.reason } : {}),
    // 수단 대상(2026-10-29): 표식과 목적은 해제 판단과 계획 style에 필요하다.
    ...(item.instrumental === true ? { instrumental: true, ...(item.purpose ? { purpose: item.purpose } : {}) } : {}),
  }));
}

export function safePassThroughDecision(reason = 'No prepared look-ahead plan was available for this request.') {
  return { type: 'NEUTRAL', reason: truncate(reason, 700), actions: [] };
}

export function preparedJournalHash(state) {
  return fnv1a(JSON.stringify((state?.commitJournal || []).map(entry => [entry.commitId, entry.contentHash, entry.narrativeHash || '', entry.userInputHash || ''])));
}

export function normalizePreparedLookahead(value) {
  if (!isPlainObject(value) || value.schemaVersion !== 1 || !isPlainObject(value.decision)) return null;
  const textField = (name, limit, required = true) => typeof value[name] === 'string' && value[name].length <= limit && (!required || value[name].length > 0);
  for (const name of ['planId', 'sourceBundleKey', 'scopeKey', 'variantKey', 'baseCommitId', 'baseContentHash', 'planningSignature', 'journalHash']) if (!textField(name, 300)) return null;
  if (!textField('sourceHash', 300, false) || !textField('variantSignatureHash', 80)
    || !Number.isInteger(value.baseTurnIndex) || value.baseTurnIndex < 0 || value.baseTurnIndex > 100000000
    || !Number.isFinite(value.createdAt) || value.createdAt <= 0
    || !value.scopeKey.startsWith(value.sourceBundleKey + ':')) return null;
  const decision = value.decision;
  if (!['ACT', 'NEUTRAL', 'NO_TARGET', 'SCENE_TRANSITION', 'CONTINUE_LATER'].includes(decision.type)
    || !Array.isArray(decision.actions) || decision.actions.length > MAX_ACTIONS_PER_TURN
    || (decision.type === 'ACT') !== (decision.actions.length > 0)) return null;
  const actions = [];
  for (const action of decision.actions) {
    if (!isPlainObject(action) || typeof action.actor !== 'string' || !action.actor || action.actor === 'user' || action.actor.length > 160
      || typeof action.target !== 'string' || !action.target || action.target.length > 160
      || !['sexual_humor', 'flirt', 'seduce', 'pursue_goal'].includes(action.mode)) return null;
    if (action.goal && (!isPlainObject(action.goal) || typeof action.goal.goalId !== 'string' || !action.goal.goalId)) return null;
    if (['score', 'intensity', 'activationChance', 'roll'].some(key => !Number.isFinite(action[key]) || action[key] < 0 || action[key] > 100)) return null;
    if (action.goal && ((action.goal.actor && action.goal.actor !== action.actor) || (action.goal.target && action.goal.target !== action.target)
      || ['priority', 'persistence'].some(key => !Number.isFinite(action.goal[key]) || action.goal[key] < 0 || action.goal[key] > 100))) return null;
    actions.push({ actor: action.actor, target: action.target, mode: action.mode,
      score: clampInt(action.score, 0, 0, 100), intensity: clampInt(action.intensity, 0, 0, 100), style: truncate(action.style, 500),
      ...(isPlainObject(action.cycleAdjustment) && Number.isFinite(action.cycleAdjustment.delta) && Math.abs(action.cycleAdjustment.delta) <= 5 ? {
        unadjustedScore: clampInt(action.unadjustedScore, action.score, 0, 100),
        cycleAdjustment: { delta: clampInt(action.cycleAdjustment.delta, 0, -5, 5), kind: action.cycleAdjustment.kind === 'fertility' ? 'fertility' : 'comfort', reason: truncate(action.cycleAdjustment.reason, 260) },
      } : {}),
      goal: action.goal ? normalizeGoalPlan(action.goal, action.actor, action.target, value.baseTurnIndex + 1) : null,
      activationChance: clampInt(action.activationChance, 0, 0, 100), roll: clampInt(action.roll, 0, 0, 100),
      // 성적 목표 대상(2026-10-22): 의도·사다리 관문·거절 넘김 표식(허용/보류)은 저장된 계획에도 남는다(장면 화면·기록이 본다).
      ...(action.intent === 'lead' ? { intent: 'lead' } : action.intent === 'play' ? { intent: 'play' } : {}),
      ...(action.gate === 'desire' ? { gate: 'desire' } : {}),
      ...(action.refusalOverride === true ? { refusalOverride: true } : {}),
      ...(action.refusalOverrideWithheld === true ? { refusalOverrideWithheld: true, refusalOverrideChance: clampInt(action.refusalOverrideChance, 0, 0, 100) } : {}),
      ...(normalizeKocoRefs(action.kocoRefs).length ? { kocoRefs: normalizeKocoRefs(action.kocoRefs) } : {}) });
  }
  // 확률 탈락 계획(2026-10-22): 확정 때 기록으로 남기려고 저장된 계획에 함께 둔다(12개까지).
  const dropped = (Array.isArray(decision.dropped) ? decision.dropped : []).filter(isPlainObject).slice(0, 12).map(item => ({
    actor: truncate(item.actor, 160), target: truncate(item.target, 160), mode: truncate(item.mode, 40), intent: item.intent === 'lead' ? 'lead' : 'play',
    gate: item.gate === 'desire' ? 'desire' : 'activation', activationChance: clampInt(item.activationChance, 0, 0, 100), roll: clampInt(item.roll, 0, 0, 100),
    ...(item.goalType ? { goalType: truncate(item.goalType, 60) } : {}) }));
  const forecast = { location: truncate(value.forecast?.location, 300) };
  for (const key of ['confirmed', 'likely', 'excluded', 'arrivalSupported', 'remoteContact', 'rememberedOnly']) forecast[key] = normalizeStringList(value.forecast?.[key], 30, 160);
  const result = { schemaVersion: 1, planId: value.planId, sourceBundleKey: value.sourceBundleKey,
    scopeKey: value.scopeKey, variantKey: value.variantKey, baseCommitId: value.baseCommitId, baseContentHash: value.baseContentHash,
    baseTurnIndex: value.baseTurnIndex, sourceHash: value.sourceHash, variantSignatureHash: value.variantSignatureHash,
    planningSignature: value.planningSignature, journalHash: value.journalHash, restoreHash: truncate(value.restoreHash, 100),
    userIdentitySignature: truncate(value.userIdentitySignature, 100),
    ...(Number(value.preferenceRevision) > 0 ? { preferenceRevision: clampInt(value.preferenceRevision, 0, 0, Number.MAX_SAFE_INTEGER) } : {}),
    ...(Number(value.cycleRevision) > 0 ? { cycleRevision: clampInt(value.cycleRevision, 0, 0, Number.MAX_SAFE_INTEGER) } : {}),
    ...(typeof value.cyclePolicySignature === 'string' ? { cyclePolicySignature: truncate(value.cyclePolicySignature, 100) } : {}),
    moduleSelectionRevision: clampInt(value.moduleSelectionRevision, 0, 0, 1000000000), createdAt: value.createdAt,
    decision: { type: decision.type, reason: truncate(decision.reason, 700), actions, ...(dropped.length ? { dropped } : {}) }, forecast,
    sceneAssessment: { category: truncate(value.sceneAssessment?.category, 80), relationalOpportunity: value.sceneAssessment?.relationalOpportunity === true, reason: truncate(value.sceneAssessment?.reason, 500) },
    profileSourceIds: normalizeStringList(value.profileSourceIds, MAX_PROFILE_CHARACTERS, 160), externalSources: normalizeStringList(value.externalSources, 30, 120),
    boundCommitId: truncate(value.boundCommitId, 180), boundRequestSlotKey: truncate(value.boundRequestSlotKey, 500), boundUserInputHash: truncate(value.boundUserInputHash, 160),
  };
  return result.profileSourceIds.length && JSON.stringify(result).length <= 262144 ? result : null;
}

export function lookaheadCacheKey(scope, baseCommitId, baseContentHash, epoch) {
  const variantKey = String(scope?.variantKey || 'default');
  const signature = commitContentHash(String(scope?.variantSignature || ''));
  const sourceHash = String(scope?.sourceHash || '');
  const moduleSelectionRevision = clampInt(scope?.moduleSelectionRevision, 0, 0, 1000000000);
  const planningSignature = String(scope?.planningSignature || '');
  return `${scope?.scopeKey || ''}:${variantKey}:${signature}:${sourceHash}:modules=${moduleSelectionRevision}:${planningSignature}:persona=${scope?.userIdentity?.signature || ''}:${String(baseCommitId || '')}:${String(baseContentHash || '')}:${clampInt(epoch, 0, 0, 100000000)}`;
}

export function latestCommitJournalEntry(state) {
  const journal = Array.isArray(state?.commitJournal) ? state.commitJournal : [];
  return journal.length > 0 && isPlainObject(journal[journal.length - 1]) ? journal[journal.length - 1] : null;
}

export function missedObservationTurns(state, messages) {
  const journal = Array.isArray(state?.commitJournal) ? state.commitJournal.filter(isPlainObject) : [];
  if (journal.length < 2 || !Array.isArray(messages)) return [];
  const caught = new Set(journal.flatMap(entry => Array.isArray(entry.caughtUpCommitIds) ? entry.caughtUpCommitIds : []));
  const missed = [];
  for (let k = journal.length - 2; k >= 0 && missed.length < 2; k -= 1) {
    const entry = journal[k];
    if (entry.directorObservationApplied !== false || caught.has(entry.commitId) || entry.unverified || !Number.isInteger(entry.messageIndex) || entry.messageIndex < 0) break;
    const message = messages[entry.messageIndex];
    const id = String(message?.id ?? message?.messageId ?? message?.chatId ?? '');
    const text = message ? chatMessageText(message) : '';
    if (!text || (entry.messageId && id && id !== entry.messageId) || commitContentHash(text) !== (entry.currentContentHash || entry.contentHash)) break;
    missed.unshift({ commitId: String(entry.commitId), turn: clampInt(entry.turnIndex, 0, 0, 100000000), text: stripTechnicalArtifacts(text) });
  }
  return missed;
}

// 새 입력이 준비된 계획과 어긋나는 신호(낱말 규칙). 앞의 다섯 가지는 원래 규칙에 줄어든 어미만 보탰고(떠났다·떠올린다·되새겼다·잠든다),
// 긴급 판단(2026-10-13, 계획서 Erosync.Emergency-Replan.Work-Plan.md)에서 넷을 더했다: 계획한 인물의 부재(그 인물 이름 바로 뒤에 떠남·없음 — plannedNames, 먼저 봄),
// 거절·밀어냄, 자리 이동, 위험 상황. 걸리면 긴급 판단(설정이 끄기면 지금처럼 보류).
// 놓치는 표현은 있다(낱말 규칙의 한계). 잘못 걸리면 계획을 새 입력까지 보고 다시 짜므로 기다리는 시간만 든다.
export function currentInputLookaheadBlockReason(value, plannedNames = []) {
  const text = String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!text) return '';
  // 계획한 행동 주체·대상 이름 바로 뒤에 떠남·없음(예: "○○는 이미 떠났다", "○○ 없이", "○○를 돌려보낸다")
  const escape = name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const raw of plannedNames) {
    const name = String(raw || '').trim().toLowerCase();
    if (name.length < 2) continue;
    const absent = new RegExp(`${escape(name)}(?:은|는|이|가|도|씨|님)?\\s*(?:이미\\s*|벌써\\s*)?(?:없|떠났|떠난|떠나|나갔|나가\\s*버|돌아갔|사라졌|사라진|자리를\\s*비)`
      + `|${escape(name)}\\s*없이|${escape(name)}(?:을|를)\\s*(?:보내|보냈|돌려보|내보내|내보냈)`
      + `|\\b${escape(name)}\\s+(?:is\\s+|was\\s+|has\\s+|had\\s+)?(?:gone|left|leaves|away|absent|not\\s+here)\\b`, 'i');
    if (absent.test(text)) return 'actor_absent';
  }
  const rules = [
    ['solitude', /(?:혼자(?:서|인|만|였다|있)|홀로|아무도\s*(?:없|없는)|나\s*혼자|단둘도\s*아닌|\balone\b|\bby\s+(?:myself|himself|herself|themselves)\b|\bno\s+one\s+else\b)/i],
    ['recollection', /(?:회상|떠올(?:리|린|렸)|되새(?:기|긴|겼)|생각에\s*잠|과거를\s*(?:생각|기억)|지난\s*(?:일|날|사건).*기억|\bremember(?:ing|ed)?\b|\brecollect(?:ing|ed)?\b|\breminisc(?:e|ing|ed)\b|\bthink(?:ing)?\s+back\b)/i],
    ['dream', /(?:꿈속|꿈을\s*꾸|잠(?:들|든)|몽상|상상\s*속|환상\s*속|\bdream(?:ing|ed)?\b|\basleep\b|\bfantas(?:y|ize|izing)\b)/i],
    ['scene_transition', /(?:장면\s*전환|시간이\s*(?:흐르|지나)|다음\s*(?:날|아침|장면)|며칠\s*후|그날\s*밤|한편\s*다른|\bscene\s+(?:shift|change|transition)s?\b|\b(?:hours?|days?|weeks?)\s+later\b|\bnext\s+(?:day|morning|scene)\b|\bmeanwhile\b)/i],
    ['departure', /(?:떠나(?:갔|간|기로|며|서|자)|떠났|떠난다|자리를\s*떠|헤어(?:졌|진|지며|지고)|돌아(?:갔|간|가며|가기로)|방을\s*나|집으로\s*(?:가|돌아)|작별|\b(?:leave|leaves|left|depart|departs|departed|walks?\s+away|goes?\s+home|went\s+home|goodbye|farewell)\b)/i],
    ['refusal', /(?:거절(?:한|했|하|당)|거부(?:한|했|하)|밀어(?:낸|냈|내)|밀쳐|뿌리(?:친|쳤|치)|외면(?:한|했|하)|무시(?:한|했|하)|그만(?:해|둬|두라|하라|하자)|꺼져|저리\s*가|비켜|손을\s*(?:쳐|뿌리|떼어)|싫다고|건드리지\s*마|만지지\s*마|다가오지\s*마|\brefus(?:e|es|ed|ing)\b|\breject(?:s|ed|ing)?\b|\bpush(?:es|ed|ing)?\s+(?:\w+\s+){0,2}away\b|\bshov(?:e|es|ed|ing)\b|\bignor(?:e|es|ed|ing)\b|\bget\s+away\b|\bback\s+off\b|\bleave\s+me\s+alone\b|\bdon'?t\s+touch\b|\bstop\s+(?:it|that|this)\b)/i],
    ['relocation', /(?:(?:밖으로|안으로|위층으로|아래층으로|옥상으로|건물\s*밖으로|방으로|거실로|부엌으로|침실로|화장실로|현관으로|복도로|학교로|회사로|역으로|가게로|병원으로)\s*(?:나가|나간|나갔|들어가|들어간|들어갔|올라가|올라간|올라갔|내려가|내려간|내려갔|간다|갔다|향하|향한|향했)|이동(?:한다|했다|하며|해서|하자)|자리를\s*옮|장소를\s*옮|(?:택시|버스|지하철)(?:를|에)?\s*(?:타|탄|탔)|\b(?:head|heads|headed|heading|go|goes|went|going|walk|walks|walked|run|runs|ran|move|moves|moved|drive|drives|drove)\s+(?:back\s+)?(?:outside|inside|upstairs|downstairs|home|out\s+of\s+the\s+\w+|to\s+the\s+(?:door|exit|street|car|station|kitchen|bathroom|bedroom|hallway|roof|office|school|hospital))\b)/i],
    // 위험: 친밀한 장면에도 흔한 말(때리다·비명·쓰러지다·기절·폭발 등)은 넣지 않는다 — 분명한 폭력·사고만
    ['danger', /(?:공격(?:한|했|하|당)|칼(?:을|로)\s*(?:꺼내|꺼낸|꺼냈|휘두|휘둘|찌르|찌른|찔|들이)|총(?:을|으로)\s*(?:꺼내|꺼낸|꺼냈|쏘|쏜|쐈|겨누|겨눈|겨눴)|불이\s*(?:났|나)|화재가|사고가\s*(?:났|나)|피를\s*(?:흘|토)|\b(?:attack(?:s|ed|ing)?|stab(?:s|bed|bing)?|shoot(?:s|ing)?|gunfire|explosion|car\s+crash)\b)/i],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || '';
}

export function normalizeDirectorAttempt(value) {
  if (!isPlainObject(value) || !value.id || !value.baseCommitId) return null;
  const phases = ['queued', 'preparing', 'requesting', 'retry_wait', 'parsing', 'validating', 'applying', 'prepared', 'failed', 'cancelled', 'discarded', 'skipped'];
  return {
    id: truncate(value.id, 220), scopeKey: truncate(value.scopeKey, 220), variantKey: truncate(value.variantKey || 'default', 160), baseCommitId: truncate(value.baseCommitId, 180),
    phase: phases.includes(value.phase) ? value.phase : 'failed',
    provider: truncate(value.provider, 80), model: truncate(value.model, 180),
    configuredTimeoutSeconds: clampInt(value.configuredTimeoutSeconds, 0, 0, 600), effectiveTimeoutSeconds: clampInt(value.effectiveTimeoutSeconds, 0, 0, 600),
    inputChars: clampInt(value.inputChars, 0, 0, 10000000), resultChars: clampInt(value.resultChars, 0, 0, 10000000), elapsedMs: clampInt(value.elapsedMs, 0, 0, 86400000),
    startedAt: truncate(value.startedAt, 40), finishedAt: truncate(value.finishedAt, 40),
    errorCode: String(value.errorCode || '').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100), httpStatus: clampInt(value.httpStatus, 0, 0, 599),
    ...(value.errorSource ? { errorSource: truncate(String(value.errorSource).replace(/[\u0000-\u001f\u007f]+/g, ' '), 120) } : {}),
    ...(value.streaming === true ? { streaming: true } : {}),
    ...(value.caughtUp ? { caughtUp: clampInt(value.caughtUp, 0, 0, 2) } : {}),
    applied: value.applied === true, decisionType: truncate(value.decisionType, 40),
    ...(['requesting', 'applied', 'kept', 'skipped_budget'].includes(value.recheck) ? { recheck: value.recheck } : {}),
    ...(typeof value.recoveryOf === 'string' ? { recoveryOf: truncate(value.recoveryOf, 220) } : {}),
    ...(typeof value.retryOf === 'string' && value.retryOf ? { retryOf: truncate(value.retryOf, 220) } : {}),
    ...(value.emergency === true ? { emergency: true } : {}),
    // 입력 줄임 표시(2026-10-29): 예산·닿은 단계·뺀 후보 수. 값이 있을 때만 둔다(이 칸이 없는 옛 기록은 모양이 그대로).
    ...(clampInt(value.inputBudget, 0, 0, 10000000) ? { inputBudget: clampInt(value.inputBudget, 0, 0, 10000000) } : {}),
    ...(clampInt(value.inputTrimLevel, 0, 0, 5) ? { inputTrimLevel: clampInt(value.inputTrimLevel, 0, 0, 5) } : {}),
    ...(clampInt(value.inputDroppedCandidates, 0, 0, 100) ? { inputDroppedCandidates: clampInt(value.inputDroppedCandidates, 0, 0, 100) } : {}),
    // 후보 이름 목록(2026-10-31, Erosync.Name-Collision.Work-Plan.md): 보낸 후보의 이름. 값이 있을 때만 둔다(옛 기록 모양 그대로).
    ...(Array.isArray(value.candidateNames) && value.candidateNames.length ? { candidateNames: normalizeStringList(value.candidateNames, 40, 60) } : {}),
    ...(typeof value.restoreHash === 'string' ? { restoreHash: truncate(value.restoreHash, 100) } : {}),
    ...(typeof value.sourceHash === 'string' ? { sourceHash: truncate(value.sourceHash, 100) } : {}),
    ...(typeof value.planningSignature === 'string' ? { planningSignature: truncate(value.planningSignature, 100) } : {}),
    attemptNumber: clampInt(value.attemptNumber, 0, 0, 10), maxRetries: clampInt(value.maxRetries, 0, 0, 3),
    retriesUsed: clampInt(value.retriesUsed, 0, 0, 3), retryDelayMs: clampInt(value.retryDelayMs, 0, 0, 3000),
    consumption: ['injected', 'neutral', 'withheld'].includes(value.consumption) ? value.consumption : '',
    consumptionReason: String(value.consumptionReason || '').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100),
    consumedAt: truncate(value.consumedAt, 40), consumedByCommitId: truncate(value.consumedByCommitId, 180),
    consumedRequestSlotKey: truncate(value.consumedRequestSlotKey, 500), consumedUserInputHash: truncate(value.consumedUserInputHash, 160),
    networkAttempts: (Array.isArray(value.networkAttempts) ? value.networkAttempts : []).filter(isPlainObject).slice(-4).map(item => ({
      number: clampInt(item.number, 1, 1, 10), startedAt: truncate(item.startedAt, 40), finishedAt: truncate(item.finishedAt, 40),
      elapsedMs: clampInt(item.elapsedMs, 0, 0, 86400000), resultChars: clampInt(item.resultChars, 0, 0, 10000000),
      outcome: ['waiting', 'received', 'failed', 'cancelled'].includes(item.outcome) ? item.outcome : 'waiting',
      httpStatus: clampInt(item.httpStatus, 0, 0, 599), errorCode: String(item.errorCode || '').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100),
      ...(item.errorSource ? { errorSource: truncate(String(item.errorSource).replace(/[\u0000-\u001f\u007f]+/g, ' '), 120) } : {}),
    })),
  };
}

export function isDirectorTerminal(attempt) {
  return ['prepared', 'failed', 'cancelled', 'discarded', 'skipped'].includes(attempt?.phase);
}

export function judgmentRetryable(attempt) {
  if (attempt?.phase !== 'failed' || attempt.applied) return false;
  const status = Number(attempt.httpStatus) || 0;
  if (status) return status === 408 || status === 429 || status >= 500;
  return ['EROSYNC_PROVIDER_TIMEOUT', 'EROSYNC_DIRECTOR_TIMEOUT', 'EROSYNC_PROVIDER_NETWORK', 'EROSYNC_PROVIDER_EMPTY', 'EROSYNC_PROVIDER_RESPONSE_JSON',
    'EROSYNC_PROVIDER_FAILED', 'JSON_PARSE_FAILED', 'DIRECTOR_RESULT_INVALID', 'DIRECTOR_REQUEST_FAILED'].includes(attempt.errorCode);
}

export function normalizeDirectorHistory(value, state) {
  const journalIds = new Set((state.commitJournal || []).map(entry => entry.commitId));
  const seen = new Set();
  return (Array.isArray(value) ? value : []).map(normalizeDirectorAttempt).filter(attempt => attempt && isDirectorTerminal(attempt)
    && attempt.scopeKey === state.scopeKey && attempt.variantKey === (state.variantKey || 'default') && journalIds.has(attempt.baseCommitId))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt)).filter(attempt => { if (seen.has(attempt.id)) return false; seen.add(attempt.id); return true; }).slice(0, 3);
}

// 긴급 판단(2026-10-13, 계획서 Erosync.Emergency-Replan.Work-Plan.md — 사용자 결정): 메인 요청 때 새 입력이 준비된 계획과 어긋나면
// (currentInputLookaheadBlockReason) 그 계획을 버리고, 새 입력까지 보고 계획만 다시 판단해(planOnly — 직전 응답의 기록은 앞 판단이 이미 반영)
// 이번 요청에 바로 넣는다. 메인 요청은 설정 → 동작 "긴급 판단 대기"(끄기·15·30·60초·무제한, 기본 30초)까지만 기다리고, 늦거나 실패하면 지금처럼
// 계획 없이 보낸다(기다림을 넘긴 판단은 멈춘다). "메인 요청 우선"(AI 호출 없이 5초 안 통과)은 어긋남이 걸린 턴에만 이 시간까지 늘어난다.
// 무제한(−1, 2026-10-13 사용자 건의)은 다 짤 때까지 기다린다. 판단 호출 자체의 한도(무응답 "타임아웃(초)", 흘려받기 한 번 최대 10분)가
// 그대로라 판단은 끝나거나 실패하고, 만일을 위해 메인 요청은 안전 상한 20분까지만 기다린다.
// 리스 자체 보조 모델로 판단하는 설정은 메인 요청 중에 부르지 않는다(그때는 지금처럼 보류).
export const EMERGENCY_WAIT_CHOICES = Object.freeze([0, 15, 30, 60, -1]);

export function emergencyReplanWaitMs(config) {
  const seconds = Number(config?.emergencyReplanSeconds);
  if (seconds === -1) return EMERGENCY_UNLIMITED_CAP_MS;
  return (EMERGENCY_WAIT_CHOICES.includes(seconds) ? seconds : 30) * 1000;
}

// 계획한 행동 주체·대상의 이름(별칭 포함) — 입력에서 "그 인물이 떠났다·없다"를 찾는 데 쓴다
export function plannedCharacterNames(decision, registry) {
  const names = [];
  for (const action of Array.isArray(decision?.actions) ? decision.actions : []) {
    for (const id of [action?.actor, action?.target]) {
      if (!id || id === 'user') continue;
      const entity = registry?.entities?.[id];
      names.push(entity?.name, ...(Array.isArray(entity?.aliases) ? entity.aliases : []));
    }
  }
  return [...new Set(names.map(name => String(name || '').trim()).filter(name => name.length >= 2))].slice(0, 24);
}

export function normalizeSceneRecovery(value) {
  if (!isPlainObject(value) || value.schemaVersion !== 1) return null;
  const result = { schemaVersion: 1 };
  for (const key of ['scopeKey', 'variantKey', 'baseCommitId', 'baseContentHash', 'sourceAttemptId', 'reservedAt']) {
    if (typeof value[key] !== 'string' || !value[key] || value[key].length > 300) return null;
    result[key] = value[key];
  }
  if (!Number.isFinite(Date.parse(result.reservedAt))) return null;
  result.restoreHash = truncate(value.restoreHash, 100);
  return result;
}

export function sameSceneRecovery(left, right) {
  const a = normalizeSceneRecovery(left), b = normalizeSceneRecovery(right);
  return !!a && !!b && Object.keys(a).every(key => a[key] === b[key]);
}

export const manualWait = ms => new Promise(resolve => setTimeout(resolve, ms));

// 최근 로그: 글 칸은 넣지 않는다(공백이 든 긴 문자열은 길이만, 객체는 한 단계의 코드·id·숫자만).
export function pluginLogValue(value, depth = 0) {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return /\s/.test(value) && value.length > 48 ? `<글 ${value.length}자>` : value.length > 120 ? `${value.slice(0, 120)}…` : value;
  if (value instanceof Error) return `오류(${value.code || ''}): ${String(value.message || '').slice(0, 120)}`;
  if (Array.isArray(value)) return `[목록 ${value.length}]`;
  if (typeof value === 'object') {
    if (depth > 0) return `{…${Object.keys(value).length}}`;
    return `{${Object.entries(value).slice(0, 12).map(([key, item]) => `${key}: ${pluginLogValue(item, 1)}`).join(', ')}}`;
  }
  return typeof value;
}

export function profileRefreshKey(scope) {
  return analysisHistoryPartitionKey(scope?.sourceBundleKey || '', scope?.variantKey || 'default');
}

export function profileRefreshReservationFence(pending) {
  if (!isPlainObject(pending?.backgroundFence)) return null;
  const fence = safeClone(pending.backgroundFence) || pending.backgroundFence;
  fence.enforceLifecycleEpoch = true;
  return fence;
}

export function createProfileRefreshState(scope, patch = {}) {
  return {
    status: truncate(patch.status || 'manual_pending', 80),
    reason: truncate(patch.reason, 120),
    message: truncate(patch.message, 700),
    sourceHash: String(patch.sourceHash || scope.sourceHash || ''),
    moduleSelectionRevision: clampInt(patch.moduleSelectionRevision, 0, 0, 1000000000),
    updatedAt: new Date().toISOString(),
  };
}

export function followUpSignature(documents) {
  return `fu_${fnv1a((documents || []).map(document => `${document.id}:${document.hash}`).sort().join('|'))}`;
}

export function normalizeFollowUp(value) {
  if (!isPlainObject(value)) return null;
  return { signature: String(value.signature || ''), status: ['done', 'no_sources', 'error'].includes(value.status) ? value.status : 'done',
    documents: clampInt(value.documents, 0, 0, 999), at: value.at || null };
}

export function behindStorageKey(scope) {
  return `${BEHIND_KEY_PREFIX}${scope.scopeKey}:${String(scope.variantKey || 'default')}`;
}

export function entityDisplayName(registry, id) {
  if (id === 'user') return 'user';
  return registry.entities?.[id]?.name || id || '—';
}

export function entityCategoryLabel(entity, profile) {
  if (entity?.category === 'temporary_mob') return '임시 모브';
  if (entity?.category === 'persistent_mob') return '지속 모브';
  if (profile?.isMain) return '메인';
  if ((profile?.sourceKinds || entity?.sourceKinds || []).some((kind) => String(kind).startsWith('module_'))) return '모듈';
  return '주요';
}

export function profileBelongsToContext(profile, entity, context) {
  if (!isPlainObject(profile)) return false;
  const botKey = context?.scope?.sourceBundleKey;
  if (botKey && Array.isArray(profile.ownerBundleKeys) && profile.ownerBundleKeys.length && !profile.ownerBundleKeys.includes(botKey)) return false;
  const bundleIds = new Set(context?.bundle?.characterIds || []);
  if (bundleIds.has(profile.id)) return true;
  if (entity?.scopeKey && entity.scopeKey === context?.scope?.scopeKey) return true;
  return false;
}

export function freezeUiInventory(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freezeUiInventory(child, seen);
  return Object.freeze(value);
}

export function analysisWorkflow(context) {
  const value = context?.botOverride?.analysisWorkflow;
  return ANALYSIS_WORKFLOWS.includes(value) ? value : context?.botOverride?.rosterDiscovery?.confirmed ? 'roster' : '';
}

export function contextProfiles(context) {
  return Object.values(context.profiles?.profiles || {})
    .filter((profile) => profileBelongsToContext(profile, context.registry?.entities?.[profile.id], context));
}

export function selectedLoreTitleKey(value) {
  return String(value || '').normalize('NFKC').trim().toLowerCase();
}

// Saved form of a resolved row. The slot id always follows the current source; the fingerprint advances
// only once a profile has been analysed from the new content, so an edit stays linked to that profile.
export function selectedLoreSavedEntry(row, settled) {
  const solo = row.solo === true ? { solo: true } : {};
  return row.available ? { id: row.id, title: row.title, hash: settled ? row.hash : row.savedHash, ...solo }
    : { id: row.savedId, title: row.savedTitle || row.title, hash: row.savedHash, ...solo };
}

export function selectedLoreProfileView(profile, variantKey = 'default') {
  if (!isPlainObject(profile)) return null;
  const variant = profile.variants?.[variantKey];
  if (!isPlainObject(variant)) return variantKey === 'default' && !Object.keys(profile.variants || {}).length ? profile : null;
  // Selection/status lists need metadata only, not a normalized copy of every personality field.
  return { ...profile, selectedLore: variant.selectedLore || null, roster: variant.roster || null,
    sourceDocumentIds: variant.sourceDocumentIds || [], sourceHash: variant.sourceHash || '',
    analysisStatus: variant.analysisStatus || profile.analysisStatus, locked: variant.locked === true, lockOrigin: variant.lockOrigin || '' };
}

export function selectedLoreOwnerScore(profile) {
  return (profile.isMain ? 100000 : 0) + (profile.locked ? 10000 : 0) + (Object.keys(profile.userOverrides || {}).length ? 1000 : 0)
    + (profile.entityVerdict?.status === 'verified_person' ? 100 : 0) + Number(profile.profileConfidence?.overall || profile.confidence || 0);
}

// The activation keys of a source as one comparable value: order, letter case and spacing do not matter.
export function selectedLoreKeySignature(entry) {
  return [...new Set(String(entry?.key || '').split(',').map(key => key.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))].sort().join('\n');
}

// A person is complete once one ready profile has been analysed from every source of the group.
export function selectedLoreUnitComplete(unit, owners) {
  return !!unit.profile && ['ready', 'low_evidence'].includes(unit.profile.analysisStatus)
    && unit.rows.every(row => row.available && owners.get(row).exact && owners.get(row).profile?.id === unit.profile.id);
}

export function selectedLoreProfileIsReady(profile, variantKey, entries) {
  const current = selectedLoreProfileView(profile, variantKey);
  return !!current && ['ready', 'low_evidence'].includes(current.analysisStatus) && entries.length > 0
    && entries.every(entry => !!entry.hash && (current.selectedLore?.entries || []).some(saved => saved.hash === entry.hash));
}

export function selectedLoreCountsText(progress) {
  return `선택 로어북 ${progress.lore}개(인물 ${progress.total - progress.unavailable}명) · 완료 ${progress.complete}명 · 미완료 ${progress.pending}명 · 저장 인물 ${progress.profileCount}명`;
}

// A selected source that only changed position keeps its profile: carry the profile's claims on
// that content to the slots that hold it now, without asking the model again. `sources` are the
// selected sources bound to this profile whose content it has already been analysed from.
export function stageSelectedLoreRebind(profile, variantKey, sources) {
  if (!profile || !sources.length) return false;
  const hashes = new Set(sources.map(source => source.hash)), slots = new Set(sources.map(source => source.id));
  let changed = false;
  for (const holder of [profile.variants?.[variantKey], String(profile.activeVariantKey || 'default') === variantKey ? profile : null]) {
    const entries = holder?.selectedLore?.entries;
    if (!Array.isArray(entries) || !entries.length) continue;
    const next = normalizeSelectedLoreProfile({ entries: [...sources, ...entries.filter(claim => !hashes.has(claim.hash) && !slots.has(claim.id))] });
    if (JSON.stringify(next.entries.map(claim => `${claim.id}\n${claim.hash}`).sort()) === JSON.stringify(entries.map(claim => `${claim.id}\n${claim.hash}`).sort())) continue;
    const dropped = new Set(entries.filter(claim => hashes.has(claim.hash) && !slots.has(claim.id)).map(claim => claim.id));
    holder.selectedLore = next;
    if (Array.isArray(holder.sourceDocumentIds)) holder.sourceDocumentIds = normalizeStringList([...holder.sourceDocumentIds.filter(id => !dropped.has(id)), ...sources.map(source => source.id)], 160, 160);
    changed = true;
  }
  return changed;
}

export function resolveSelectedLoreRelations(run, candidates, idMap, store, scope, inventory, variantKey) {
  const resolve = ref => {
    const matches = candidates.filter(candidate => (ref.entryIds || []).some(id => candidate.sourceDocumentIds.includes(id)));
    if (matches.length === 1) return matches[0].id;
    // A target id of an earlier run is not a name: it may spell the id of a profile that stood for other lore then.
    return /^selected_lore_/.test(ref.name) && !candidates.some(candidate => candidate.id === ref.name) ? '' : ref.name;
  };
  const allowedSources = new Set(candidates.flatMap(candidate => candidate.sourceDocumentIds));
  const ready = new Set(candidates.filter(candidate => selectedLoreProfileIsReady(store.profiles[idMap.get(candidate.id)], variantKey, candidate.selectedLore.entries)).map(candidate => idMap.get(candidate.id)));
  const relations = {};
  for (const draft of run.relationDrafts) {
    const relation = normalizeBaseRelation({ ...draft.value, from: resolve(draft.fromRef), to: resolve(draft.toRef) }, idMap, store, inventory.sourceHash, scope.sourceBundleKey, variantKey, allowedSources);
    if (!relation || relation.from !== 'user' && !ready.has(relation.from) || relation.to !== 'user' && !ready.has(relation.to)) continue;
    const key = `${variantKey}::${relationKey(relation.from, relation.to)}`;
    if (!relations[key] || relation.confidence >= relations[key].confidence) relations[key] = relation;
  }
  return relations;
}

// The source text of one analysis target for a prompt. A target with several sources keeps a block per
// source (sourceParts are the block lengths), and each block is cut to `share` characters.
export function candidateSourceExcerpt(candidate, share) {
  if (!Array.isArray(candidate.sourceParts)) return candidate.sourceText.slice(0, share);
  let start = 0;
  return candidate.sourceParts.map(length => { const block = candidate.sourceText.slice(start, start + Math.min(length, share)); start += length + 2; return block; }).join('\n\n');
}

export function resolveSelectedRosterEntry(selected, entries) {
  const rows = Array.isArray(entries) ? entries : [];
  const byHash = selected.hash ? rows.filter(entry => entry.hash === selected.hash) : [];
  if (byHash.length === 1) return byHash[0];
  const title = String(selected.title || '').normalize('NFKC').trim().toLowerCase();
  const byTitle = title ? rows.filter(entry => String(entry.comment || entry.name || entry.id || '').normalize('NFKC').trim().toLowerCase() === title) : [];
  if (byTitle.length === 1) return byTitle[0];
  return !title && !selected.hash ? rows.find(entry => entry.id === selected.id) || null : null;
}

export function rosterPersonInput(person, inventory) {
  const linked = (inventory?.rosterEntries || []).find(entry => entry.id === person.matchedLoreId);
  const linkedContent = String(linked?.profileContent ?? linked?.content ?? '');
  const sourceText = `[SOURCE ${person.rosterEntryId} | ROSTER MEMBER ${person.name}]\n${person.sourceBlock}`
    + (linkedContent ? `\n\n[SOURCE ${linked.id} | ${linked.comment || linked.name || person.name}]\n${linkedContent}` : '');
  return { sourceText, sourceHash: fnv1a(JSON.stringify([person.sourceBlock, person.matchedLoreId, linkedContent])),
    sourceBlock: person.sourceBlock, linkedContent, linked };
}

export function rosterInputMatchesStored(profile, input) {
  if (!input || !profile?.roster?.sourceHash) return false;
  if (profile.roster.sourceHash === input.sourceHash) return true;
  const oldLinkedId = String(profile.roster.matchedLoreId || '');
  return profile.roster.sourceHash === fnv1a(JSON.stringify([input.sourceBlock, oldLinkedId, input.linkedContent]));
}

export function sanitizeProfileAuditValue(value, depth = 0) {
  if (value === undefined) return null;
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return truncate(value, 280);
  if (depth >= 3) return truncate(JSON.stringify(value), 280);
  if (Array.isArray(value)) return value.slice(0, 12).map((item) => sanitizeProfileAuditValue(item, depth + 1));
  if (!isPlainObject(value)) return truncate(String(value), 280);
  const output = {};
  for (const key of Object.keys(value).sort().slice(0, 28)) output[key] = sanitizeProfileAuditValue(value[key], depth + 1);
  return output;
}

export function collectProfileAuditChanges(before, after, path = '', output = []) {
  if (output.length >= 32 || JSON.stringify(before) === JSON.stringify(after)) return output;
  if (isPlainObject(before) && isPlainObject(after)) {
    for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      collectProfileAuditChanges(before[key], after[key], path ? `${path}.${key}` : key, output);
      if (output.length >= 32) break;
    }
    return output;
  }
  output.push({
    path: path || 'profile',
    before: sanitizeProfileAuditValue(before),
    after: sanitizeProfileAuditValue(after),
  });
  return output;
}

export function retainProfileAuditRows(entries, requestedLimit) {
  const limit = clampInt(requestedLimit, 20, 0, 40);
  const partitions = new Map();
  for (const entry of entries.filter(isPlainObject)) {
    const repair = entry.source === 'relation_repair' && ['exclude', 'restore'].includes(entry.action);
    const key = `${entry.sourceBundleKey || ''}::${String(entry.variantKey || 'default')}::${repair ? 'relation_repair' : 'profile'}`;
    const partition = partitions.get(key) || { limit: repair ? 20 : limit, entries: [] };
    partition.entries.push(entry);
    partitions.set(key, partition);
  }
  return [...partitions.values()].flatMap((partition) => partition.limit > 0
    ? partition.entries.sort((left, right) => String(left.at || '').localeCompare(String(right.at || ''))).slice(-partition.limit) : [])
    .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
}

export function uiPersonName(context, id) {
  if (id === 'user') return '당신';
  const registry = context.registry; return entityDisplayName(registry, id);
}

export function normalizePortraitChoice(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    path: typeof value.path === 'string' ? value.path.slice(0, 400) : '',
    name: typeof value.name === 'string' ? value.name.slice(0, 200) : '',
    offsetY: Math.max(0, Math.min(100, Math.round(Number.isFinite(Number(value.offsetY)) ? Number(value.offsetY) : 12))),
    manual: value.manual === true,
    ...(value.none === true ? { none: true } : {}), // 사진 없음(2026-10-15): 직접 정함, 자동으로 고르지 않음. 아니면 키도 없다(저장 모양 그대로)
  };
}

export function trackTransferWrite(promise, tracked) {
  const pending = Promise.resolve(promise);
  tracked.add(pending);
  pending.then(() => tracked.delete(pending), () => tracked.delete(pending));
  return pending;
}

export async function transferBounded(promise, timeoutMs = 10000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('BACKUP_DRAIN_TIMEOUT')), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

export function scheduleCompatibilityUiRefresh() { /* Dusk 이식: 원본 화면 연결 끊음 */ }

export async function renderSettingsApp(show = true, { preserveProfileScroll = false, cachedContext = null } = {}) { /* Dusk 이식: 원본 화면 연결 끊음 */ }

// ── Dusk: {{user}} 관찰 칸 ── 기록은 턴 번호와 함께 쌓고, 읽을 때 지금 턴 이후 것은 버린다(다시 굴리기·되돌리기로 턴이 돌아가도 맞게).
export const DUSK_USER_MAX = 60;

export function duskUserView(state) {
  const turn = clampInt(state?.turnIndex, 0, 0, 100000000);
  const log = (state?.duskUser?.log || []).filter((e) => e.turn <= turn);
  const openness = Math.max(0, Math.min(100, 50 + log.reduce((n, e) => n + (Number(e.open) || 0) * 5, 0)));
  const last = (k) => [...log].reverse().find((e) => e[k])?.[k] || '';
  return { openness, state: last('state'), lastAction: last('action'), tendencies: log.flatMap((e) => (e.signals || []).map((x) => ({ ...x, turn: e.turn }))).slice(-8), entries: log.length };
}

// Dusk ‘동작·분석’ 카드 연결부: 허용된 설정 키만 읽고 쓴다(저장 때 normalizeConfig가 범위를 다시 맞춘다).
export const DUSK_CONFIG_KEYS = Object.freeze(['mode', 'frequency', 'autonomy', 'goalPersistence', 'cooldownTurns', 'maxActorsPerTurn', 'recentMessages', 'progressiveFollowUp', 'autoVerifyCharacters', 'autoRefreshProfiles', 'developmentMode', 'behindEnabled']);

// 성격 변화 검토: 반영을 기다리는 후보(근거가 문턱을 넘었지만 자동 반영 기준에 못 미치거나 ‘검토 후 반영’·‘후보만 쌓기’ 방식인 것)를 보여 주고 반영·무시한다.
export const DEV_REVIEW_STATUS = Object.freeze(['ready', 'pending_review']);

// ── Dusk 매 턴 계산(HandOff/EROSYNC-TURN.md): 장기기억이 기록한 인물만, 원본 축 정의로 변화분 1번 호출 → 분석값(baseProfile)에 반영 ──
// people: [{ name, aliases, memory }], rp: 이번 턴 글, groups: ['axes','sexual']. 사용자 수정값(userOverrides)·잠근 인물은 건드리지 않는다.
export const turnValueOf = (base, key) => key === 'eroticInterest' ? (Number.isFinite(base?.eroticInterest?.level) ? base.eroticInterest.level : null) : (Number.isFinite(base?.[key]) ? base[key] : null);

// 나눈 파일도 여기서 함께 내보낸다(엔진·시험은 pure.js 하나만 불러온다).
export * from "./pure-util.js";
export * from "./pure-cbs.js";
export * from "./pure-cycle.js";
export * from "./pure-provider.js";
export * from "./pure-source.js";
export * from "./pure-backup.js";
export * from "./pure-config.js";
export * from "./pure-koco.js";
export * from "./pure-profile.js";
