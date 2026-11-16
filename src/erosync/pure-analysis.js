// addon-rebuild 4단계: Erosync 순수 조각 — 분석 실행 기록·성격 변화·프로필 감사. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { clampInt, clampNumber, fnv1a, isPlainObject, normalizeStringList, safeClone, truncate } from "./pure-util.js";
import { ANALYSIS_EXECUTION_FIELD_LIMIT, ANALYSIS_EXECUTION_HISTORY_LIMIT, ANALYSIS_EXECUTION_RESULT_BYTES, ANALYSIS_EXECUTION_RESULT_LIMIT, ANALYSIS_WORKFLOWS, DEVELOPMENT_SCHEMA, SCHEMA_VERSION, VERSION } from "./pure-config.js";
import { emptyBaseRelationSuppressions, variantRelationKey } from "./pure-relation.js";
import { normalizeBehavior, normalizeEntityVerdict, sexAxisValueOf } from "./pure-profile.js";
import { PROVIDER_DEFS, resolveRoleProfile } from "./pure-provider.js";

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

export function emptyProfileStore() {
  return { schemaVersion: SCHEMA_VERSION, sourceBundles: {}, profiles: {}, baseRelations: {}, analysisRuns: {}, deletedProfiles: {}, analysisExecutionHistory: emptyAnalysisExecutionHistory(), baseRelationSuppressions: emptyBaseRelationSuppressions() };
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

// 성격 변화 보정이 듣는 축 값 읽기·쓰기(2026-10-23): 성적 관심도는 {level} 객체라 level에 더한다. 그 밖의 축은 숫자 그대로.
export function developmentTraitValue(profile, trait) {
  return trait === 'eroticInterest' ? sexAxisValueOf(profile, 'eroticInterest') : profile?.[trait];
}

export function setDevelopmentTraitValue(profile, trait, value) {
  if (trait === 'eroticInterest') profile.eroticInterest = { ...(isPlainObject(profile.eroticInterest) ? profile.eroticInterest : {}), level: value };
  else profile[trait] = value;
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

export function analysisWorkflow(context) {
  const value = context?.botOverride?.analysisWorkflow;
  return ANALYSIS_WORKFLOWS.includes(value) ? value : context?.botOverride?.rosterDiscovery?.confirmed ? 'roster' : '';
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
