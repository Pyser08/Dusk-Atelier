// addon-rebuild 4단계: Erosync 순수 조각 — 세션·확정 기록(저널)·저장 목록 정리. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { clampInt, fnv1a, isPlainObject, normalizeStringList, safeClone, safeKeyPart, truncate } from "./pure-util.js";
import { BEHIND_KEY_PREFIX, COMMIT_JOURNAL_LIMIT, COMMIT_UNDO_DEPTH, LEGACY_SESSION_PREFIX, MAX_INJECTION_CHARS, SCHEMA_VERSION, SCOPE_CATALOG_SCHEMA, SESSION_KEY_PREFIX } from "./pure-config.js";
import { kocoCheckpoint, stripKocoArtifacts } from "./pure-koco.js";

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

export function emptyRegistry() {
  return { schemaVersion: SCHEMA_VERSION, entities: {} };
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

export function preparedJournalHash(state) {
  return fnv1a(JSON.stringify((state?.commitJournal || []).map(entry => [entry.commitId, entry.contentHash, entry.narrativeHash || '', entry.userInputHash || ''])));
}

export function latestCommitJournalEntry(state) {
  const journal = Array.isArray(state?.commitJournal) ? state.commitJournal : [];
  return journal.length > 0 && isPlainObject(journal[journal.length - 1]) ? journal[journal.length - 1] : null;
}
