// addon-rebuild 4단계: Erosync 순수 조각 — undefined. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { clampInt, clampNumber, fnv1a, isPlainObject, normalizeStringList, optionalNumber, safeClone, safeKeyPart, truncate } from "./pure-util.js";
import { DEFAULT_CONFIG, PROFILE_VERIFIER_VERSION } from "./pure-config.js";
import { normalizeKocoRefs } from "./pure-koco.js";

// 성적 축 값 읽기(프로필 객체에서). eroticInterest는 level, 나머지는 최상위 숫자. 없으면 undefined.
export function sexAxisValueOf(profile, axis) {
  if (!isPlainObject(profile)) return undefined;
  if (axis === 'eroticInterest') return Number.isFinite(profile.eroticInterest?.level) ? profile.eroticInterest.level : undefined;
  return Number.isFinite(profile[axis]) ? profile[axis] : undefined;
}

// 1단계 응답에서 한 대상의 인물분을 찾는다(id·후보 id → 이름·별칭). 성적 축 호출의 답을 읽을 때 쓴다(여덟 축이 없어도 받는다).
export function sexualAxesReplyItem(raw, target) {
  if (!isPlainObject(raw) || !Array.isArray(raw.characters)) return null;
  const items = raw.characters.filter(isPlainObject);
  const ids = new Set([target.id, ...(target.candidateIds || [])].map(id => String(id || '').toLowerCase()));
  let item = items.find(value => ids.has(String(value.id || '').toLowerCase()));
  if (!item) {
    const names = new Set([target.name, ...(target.aliases || [])].map(name => String(name || '').trim().toLowerCase()).filter(Boolean));
    const matches = items.filter(value => names.has(String(value.name || '').trim().toLowerCase()));
    if (matches.length === 1) item = matches[0];
  }
  return item || null;
}

export function normalizeUserIdentity(value) {
  if (!isPlainObject(value) || !String(value.name || '').trim()) return null;
  const name = truncate(value.name, 180).trim();
  const aliases = normalizeStringList([name, ...(Array.isArray(value.aliases) ? value.aliases : [])], 32, 180);
  const personaId = truncate(value.personaId, 160);
  return { schemaVersion: 1, id: 'user', personaId, name, aliases, source: truncate(value.source, 60),
    signature: fnv1a(JSON.stringify([personaId, name, aliases])) };
}

export function normalizeBehavior(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    frequency: Math.round(clampNumber(source.frequency, 50)),
    directness: Math.round(clampNumber(source.directness, 50)),
    styles: normalizeStringList(source.styles, 8, 240),
    typicalSituations: normalizeStringList(source.typicalSituations, 10, 300),
    preferredTargets: normalizeStringList(source.preferredTargets, 8, 240),
    preferredApproaches: normalizeStringList(source.preferredApproaches, 8, 300),
  };
}

export function normalizeAttraction(value) {
  if (!hasLegacyAttraction(value)) return null;
  const source = value;
  let opposite = isPreferenceNumber(source.oppositeSexPercent) ? Math.round(Number(source.oppositeSexPercent)) : 0;
  let same = isPreferenceNumber(source.sameSexPercent) ? Math.round(Number(source.sameSexPercent)) : 0;
  const total = opposite + same;
  if (total > 0 && total !== 100) {
    opposite = Math.round((opposite / total) * 100);
    same = 100 - opposite;
  }
  return {
    oppositeSexPercent: opposite,
    sameSexPercent: same,
    confidence: Math.round(clampNumber(source.confidence, 0)),
    notes: truncate(source.notes, 500),
  };
}

export function isPreferenceNumber(value) {
  return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
    && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
}

export function hasLegacyAttraction(value) {
  return isPlainObject(value) && ['oppositeSexPercent', 'sameSexPercent'].some((field) => isPreferenceNumber(value[field]));
}

export function normalizeGenderIdentity(value) {
  const source = isPlainObject(value) ? value : { value };
  const raw = String(source.value || source.gender || '').trim().toLowerCase();
  const aliases = {
    man: 'male', boy: 'male', masculine: 'male', '남성': 'male', '남자': 'male',
    woman: 'female', girl: 'female', feminine: 'female', '여성': 'female', '여자': 'female',
    neutral: 'genderless', agender: 'genderless', none: 'genderless', '무성': 'genderless', '무성별': 'genderless', '성별없음': 'genderless',
    unspecified: 'unknown', unclear: 'unknown', '미상': 'unknown', '불명': 'unknown',
  };
  const normalized = ['male', 'female', 'genderless', 'unknown'].includes(raw) ? raw : aliases[raw] || 'unknown';
  return {
    value: normalized,
    confidence: Math.round(clampNumber(source.confidence, normalized === 'unknown' ? 0 : 50)),
    evidence: normalizeStringList(source.evidence, 8, 300),
  };
}

export function normalizeEroticInterest(value) {
  const source = isPlainObject(value) ? value : { level: value };
  return {
    level: Math.round(clampNumber(source.level, 50)),
    confidence: Math.round(clampNumber(source.confidence, 0)),
    notes: truncate(source.notes, 500),
  };
}

export function normalizeTargetGenderPreference(value, genderIdentity, legacyAttraction = null) {
  const source = isPlainObject(value) ? value : {};
  const fields = ['malePercent', 'femalePercent', 'genderlessPercent'];
  const hasValues = fields.some((field) => isPreferenceNumber(source[field]));
  let male = isPreferenceNumber(source.malePercent) ? Math.round(Number(source.malePercent)) : 0;
  let female = isPreferenceNumber(source.femalePercent) ? Math.round(Number(source.femalePercent)) : 0;
  let genderless = isPreferenceNumber(source.genderlessPercent) ? Math.round(Number(source.genderlessPercent)) : 0;
  let confidence = Math.round(clampNumber(source.confidence, 0));
  let migratedFromLegacy = source.migratedFromLegacy === true;
  let needsReanalysis = source.needsReanalysis === true;
  let basis = ['explicit', 'inferred', 'legacy', 'unspecified', 'unknown', 'user'].includes(source.basis) ? source.basis : 'unknown';
  let notes = truncate(source.notes, 500);
  if (!hasValues && !['unknown', 'incomplete'].includes(source.status) && hasLegacyAttraction(legacyAttraction)) {
    const opposite = Math.round(clampNumber(legacyAttraction.oppositeSexPercent, 0));
    const same = Math.round(clampNumber(legacyAttraction.sameSexPercent, 0));
    if (opposite + same > 0 && genderIdentity?.value === 'male') {
      male = same; female = opposite; genderless = 0; migratedFromLegacy = true;
    } else if (opposite + same > 0 && genderIdentity?.value === 'female') {
      male = opposite; female = same; genderless = 0; migratedFromLegacy = true;
    } else {
      needsReanalysis = true;
    }
    confidence = migratedFromLegacy ? Math.round(clampNumber(legacyAttraction.confidence, 0)) : 0;
    basis = 'legacy';
    notes = notes || truncate(legacyAttraction.notes, 500);
  }
  const total = male + female + genderless;
  if (total > 0 && total !== 100) {
    male = Math.round((male / total) * 100);
    female = Math.min(100 - male, Math.round((female / total) * 100));
    genderless = 100 - male - female;
  }
  if (basis === 'unknown' && total > 0) basis = migratedFromLegacy ? 'legacy' : 'unspecified';
  const status = needsReanalysis ? 'incomplete'
    : total > 0 ? (['unknown', 'incomplete'].includes(source.status) ? 'incomplete' : 'ready')
      : source.status === 'unknown' || (!hasValues && !needsReanalysis) ? 'unknown' : 'incomplete';
  if (total <= 0) confidence = 0;
  return {
    malePercent: male,
    femalePercent: female,
    genderlessPercent: genderless,
    confidence,
    notes,
    evidence: normalizeStringList(source.evidence, 8, 400),
    basis,
    status,
    migratedFromLegacy,
    needsReanalysis,
    lastAnalysisStatus: ['ready', 'unknown', 'incomplete'].includes(source.lastAnalysisStatus) ? source.lastAnalysisStatus : '',
    lastAnalysisNote: truncate(source.lastAnalysisNote, 500),
  };
}

export function positionPreferenceValue(v) {
  const t = String(v ?? '').normalize('NFKC').trim().toLowerCase();
  if (['preferred', 'neutral', 'disliked'].includes(t)) return t;
  if (/^(prefer|like|love|enjoy|favou?r)|선호|좋아|즐김|좋음/.test(t) && !/비선호|안\s*좋|싫/.test(t)) return 'preferred';
  if (/^(dislik|hate|avoid|refus)|비선호|싫|기피|거부|꺼림|안\s*좋/.test(t)) return 'disliked';
  if (/^(neutral|indifferent|mixed|ok)|보통|중립|무난|상관/.test(t)) return 'neutral';
  return '';
}
export function normalizePositionPreferences(value) {
  const result = [], ids = new Set(), labels = new Set();
  for (const raw of (Array.isArray(value) ? value : []).slice(0, 64)) {
    if (!isPlainObject(raw)) continue;
    const label = truncate(raw.label, 120).trim(), canonical = label.normalize('NFKC').toLowerCase();
    // addon-rebuild: 한국어 출력 규칙 때문에 preference를 '선호'·'싫어함' 등으로 쓰면 예전엔 항목을 조용히 버렸다 → 같은 뜻은 받아 준다
    const preference = positionPreferenceValue(raw.preference);
    if (!label || !preference) continue;
    const id = truncate(safeKeyPart(raw.id || `pp_${fnv1a(canonical)}`, `pp_${fnv1a(canonical)}`), 120);
    if (ids.has(id) || labels.has(canonical)) continue;
    ids.add(id); labels.add(canonical);
    result.push({ id, label, preference,
      basis: ['explicit', 'inferred', 'user', 'observed'].includes(raw.basis) ? raw.basis : 'inferred',
      confidence: Math.round(clampNumber(raw.confidence, 0)), evidence: normalizeStringList(raw.evidence, 4, 240), reason: truncate(raw.reason, 300) });
    if (result.length >= 16) break;
  }
  return result;
}

export function preferenceChangePolicy(config = DEFAULT_CONFIG) {
  const presets = { cautious: [4, 2, 90], standard: [2, 1, 80], fast: [1, 1, 70] };
  const values = presets[config.preferenceChangePace] || [clampInt(config.preferenceMinEvidence, 2, 1, 20), clampInt(config.preferenceMinScenes, 1, 1, 12), clampInt(config.preferenceMinConfidence, 80, 0, 100)];
  return { mode: ['off', 'candidates', 'review', 'auto'].includes(config.preferenceChangeMode) ? config.preferenceChangeMode : 'auto', minEvidence: values[0], minScenes: values[1], minConfidence: values[2] };
}

export function preferencePolicySignature(config) {
  return fnv1a(JSON.stringify(preferenceChangePolicy(config)));
}

export function normalizePreferenceState(value) {
  if (!isPlainObject(value) || value.schemaVersion !== 1) return null;
  const item = raw => normalizePositionPreferences([raw])[0] || null;
  const entries = (Array.isArray(value.entries) ? value.entries : []).slice(-1024).flatMap(raw => {
    const normalized = item(raw?.item);
    if (!isPlainObject(raw) || !raw.id || !raw.actor || !normalized) return [];
    return [{ id: truncate(raw.id, 180), actor: truncate(raw.actor, 180), item: normalized,
      previousPreference: ['preferred', 'neutral', 'disliked'].includes(raw.previousPreference) ? raw.previousPreference : '',
      evidenceIds: normalizeStringList(raw.evidenceIds, 20, 180), commitIds: normalizeStringList(raw.commitIds, 20, 300),
      order: clampInt(raw.order, 0, 0, Number.MAX_SAFE_INTEGER), turn: clampInt(raw.turn, 0, 0, 100000000),
      at: truncate(raw.at, 80), method: raw.method === 'review' ? 'review' : 'auto', reverted: raw.reverted === true }];
  });
  const settled = (Array.isArray(value.settled) ? value.settled : []).slice(-16000).flatMap(raw => {
    const normalized = item(raw?.item);
    return raw?.actor && normalized ? [{ actor: truncate(raw.actor, 180), item: normalized, order: clampInt(raw.order, 0, 0, Number.MAX_SAFE_INTEGER) }] : [];
  });
  const candidates = (Array.isArray(value.candidates) ? value.candidates : []).slice(-512).flatMap(raw => {
    const normalized = item(raw?.item);
    if (!isPlainObject(raw) || !raw.id || !raw.actor || !normalized) return [];
    const evidence = (Array.isArray(raw.evidence) ? raw.evidence : []).slice(-20).filter(e => isPlainObject(e) && e.id && e.commitId)
      .map(e => ({ id: truncate(e.id, 180), commitId: truncate(e.commitId, 300), scene: truncate(e.scene, 400), turn: clampInt(e.turn, 0, 0, 100000000), confidence: Math.round(clampNumber(e.confidence, 0)), summary: truncate(e.summary, 300) }));
    return [{ id: truncate(raw.id, 180), actor: truncate(raw.actor, 180), item: normalized, previousPreference: ['preferred', 'neutral', 'disliked'].includes(raw.previousPreference) ? raw.previousPreference : '',
      predecessor: clampInt(raw.predecessor, 0, 0, Number.MAX_SAFE_INTEGER), evidence,
      status: ['collecting', 'ready', 'pending_review', 'applied', 'rejected'].includes(raw.status) ? raw.status : 'collecting',
      appliedId: truncate(raw.appliedId, 180), updatedTurn: clampInt(raw.updatedTurn, 0, 0, 100000000) }];
  });
  return { schemaVersion: 1, revision: clampInt(value.revision, 0, 0, Number.MAX_SAFE_INTEGER), sequence: clampInt(value.sequence, 0, 0, Number.MAX_SAFE_INTEGER),
    policySignature: truncate(value.policySignature, 100), entries, settled, candidates };
}

export function preferenceStateForRead(state) {
  return normalizePreferenceState(state?.preferenceState) || { schemaVersion: 1, revision: 0, sequence: 0, policySignature: '', entries: [], settled: [], candidates: [] };
}

export function compactPreferenceHistory(state) {
  const data = state.preferenceState;
  if (!data || data.schemaVersion !== 1) return;
  const journal = state.commitJournal || [], current = new Set(journal.map(entry => entry.commitId));
  const oldestTurn = journal.length ? Math.min(...journal.map(entry => Number(entry.turnIndex || 0))) : 0;
  const retained = [];
  for (const entry of data.entries) {
    if (entry.turn < oldestTurn && entry.commitIds.every(id => !current.has(id))) {
      if (!entry.reverted) {
        const at = data.settled.findIndex(old => old.actor === entry.actor && old.item.id === entry.item.id);
        const settled = { actor: entry.actor, item: safeClone(entry.item), order: entry.order };
        if (at < 0) data.settled.push(settled);
        else if (data.settled[at].order < entry.order) data.settled[at] = settled;
      }
    } else retained.push(entry);
  }
  data.entries = retained;
  if (data.candidates.length > 512) data.candidates.splice(0, data.candidates.length - 512);
}

export function dynamicsProfileAllowed(profile, state, store, registry = null) {
  if (!profile?.id) return false;
  const ownedScope = profile.scopeOwnership?.scopeKey || registry?.entities?.[profile.id]?.scopeKey;
  if (ownedScope === state.scopeKey) return true;
  if (profile.scopeOwnership?.scopeKey) return false;
  const botKey = String(state.scopeMeta?.sourceBundleKey || state.scopeKey?.split(':')[0] || '');
  const bundle = store?.sourceBundles?.[botKey], variant = bundle?.variants?.[state.variantKey] || bundle;
  return !!botKey && ((profile.ownerBundleKeys || []).includes(botKey) || profile.sourceBundleKey === botKey || (variant?.characterIds || []).includes(profile.id));
}

export function rollbackPreferenceChanges(state, removed) {
  const data = normalizePreferenceState(state.preferenceState);
  if (!data) return;
  const ids = new Set(removed.map(entry => entry.commitId)), previous = JSON.stringify(data);
  const removedApplied = new Set(data.entries.filter(entry => entry.commitIds.some(id => ids.has(id))).map(entry => entry.id));
  data.entries = data.entries.filter(entry => !entry.commitIds.some(id => ids.has(id)));
  data.candidates = data.candidates.filter(candidate => {
    candidate.evidence = candidate.evidence.filter(e => !ids.has(e.commitId));
    if (candidate.status === 'applied' && removedApplied.has(candidate.appliedId)) { candidate.status = 'collecting'; candidate.appliedId = ''; }
    return candidate.evidence.length > 0;
  });
  if (JSON.stringify(data) !== previous) data.revision++;
  state.preferenceState = data;
}

// 축 값은 값이 없으면 "미분석"으로 두고 채우지 않는다. 기존 인물에게 값을 지어내지 않기 위해서다(0.8.6 극단성, 정의학 이후 여덟 축 전부).
export function optionalTrait(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(clampNumber(number, 0)) : undefined;
}

export function normalizeProfileConfidence(value, fallback = 50) {
  const source = isPlainObject(value) ? value : { overall: value };
  return {
    overall: Math.round(clampNumber(source.overall, fallback)),
    behavior: Math.round(clampNumber(source.behavior, source.overall ?? fallback)),
    evidence: Math.round(clampNumber(source.evidence, source.overall ?? fallback)),
    reason: truncate(source.reason, 500),
  };
}

export function normalizeEntityVerdict(value, isMain = false) {
  let source = isPlainObject(value) ? value : {};
  // Source identity and person identity are independent. Retain real verdicts,
  // but retire the legacy synthetic 100% PERSON stamp for host cards.
  if (isMain && (source.source === 'main_identity' || source.reason === 'current main character identity')) {
    source = { ...source, status: 'unverified', entityType: 'unknown', confidence: 0, reason: '메인 출처 · 인물 여부는 별도 판정', source: 'main_identity' };
  }
  const status = ['verified_person', 'uncertain', 'rejected_nonperson', 'unverified'].includes(source.status) ? source.status : 'unverified';
  const allowedTypes = ['person', 'role', 'job', 'class', 'faction', 'location', 'item', 'system', 'species', 'concept', 'unknown'];
  return {
    status,
    entityType: allowedTypes.includes(source.entityType) ? source.entityType : status === 'verified_person' ? 'person' : 'unknown',
    confidence: Math.round(clampNumber(source.confidence, status === 'unverified' ? 0 : 50)),
    reason: truncate(source.reason, 500),
    verifiedAt: source.verifiedAt || null,
    verifierVersion: clampInt(source.verifierVersion, 0, 0, 1000),
    source: truncate(source.source, 80),
  };
}

export function effectiveEntityVerdict(profile) {
  const override = isPlainObject(profile?.identityOverride) ? profile.identityOverride : null;
  if (override && ['verified_person', 'rejected_nonperson'].includes(override.status)) {
    return normalizeEntityVerdict({
      status: override.status,
      entityType: override.status === 'verified_person' ? 'person' : override.entityType,
      confidence: 100,
      reason: override.reason || '사용자 확인 판정',
      verifiedAt: override.at,
      verifierVersion: PROFILE_VERIFIER_VERSION,
      source: override.source || 'user_override',
    });
  }
  const verdict = normalizeEntityVerdict(profile?.entityVerdict, profile?.isMain === true);
  if (!profile?.isMain || !['unverified', 'uncertain'].includes(verdict.status)) return verdict;
  const evidence = normalizeStringList(profile.evidence, 24, 600);
  const identity = text => String(text || '').normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  const names = [profile.name, ...(profile.aliases || [])].map(identity).filter(Boolean);
  const explicitContainer = evidence.find(text => /world(?:view)?|setting|simulation|narrator|system|세계관|시뮬|비인격/iu.test(text)
    && /(?:no|without)\s+(?:an?\s+)?(?:specific\s+)?individual\s+(?:character|personality|identity)|(?:세계관|시뮬레이션|시스템).{0,50}(?:개별\s*인물.*(?:없|아니)|인물(?:이|은)\s*아)/iu.test(text));
  const namedWorld = evidence.find(text => {
    const match = /(?:worldview\s+name|세계관\s*(?:이름|명))\s*[:：]\s*(.+)/iu.exec(text);
    return match && names.some(name => identity(match[1]).startsWith(name));
  });
  const individual = evidence.some(text => /(?:this (?:card|profile|main)|메인).{0,60}(?:is an? (?:individual|person)|개별\s*인물(?:이다|입니다))/iu.test(text));
  if (!explicitContainer && (!namedWorld || individual)) return verdict;
  return normalizeEntityVerdict({ status: 'rejected_nonperson', entityType: 'system', confidence: 90,
    reason: truncate(explicitContainer || namedWorld, 500), source: 'main_source_evidence', verifiedAt: verdict.verifiedAt });
}

export function profileVerdictStatus(profile) {
  return effectiveEntityVerdict(profile).status;
}

export function isProfileDirectorEligible(profile) {
  const status = profileVerdictStatus(profile);
  return status !== 'uncertain' && status !== 'rejected_nonperson' && status !== 'deleted';
}

export function isNonActingMainProfile(profile) {
  return profile?.isMain === true && effectiveEntityVerdict(profile).status === 'rejected_nonperson';
}

export function normalizeProfileLockOrigin(value, locked = false) {
  if (!locked) return '';
  return value === 'roster_auto' ? 'roster_auto' : 'manual';
}

export function normalizeCandidate(value, documents, scope, hostMain = false) {
  if (!isPlainObject(value)) return null;
  const name = truncate(value.name || value.id, 160).trim();
  if (!name) return null;
  const isMain = hostMain === true;
  const hostId = safeKeyPart(scope.identity.id, safeKeyPart(scope.identity.name, 'current_character'));
  let candidateId = safeKeyPart(value.id || name, `character_${fnv1a(name)}`);
  if (!isMain && candidateId === hostId) candidateId = `discovered_${hostId}`;
  const declaredKinds = normalizeStringList(value.sourceKinds, 12, 120);
  const supportingDocuments = declaredKinds.length > 0
    ? documents.filter((document) => (document.sourceKinds || [document.kind]).some((kind) => declaredKinds.includes(kind)))
    : documents;
  const entityType = ['person', 'role', 'job', 'class', 'faction', 'location', 'item', 'system', 'species', 'concept', 'unknown'].includes(value.entityType) ? value.entityType : 'unknown';
  const personEvidence = normalizeStringList(value.personEvidence, 12, 400);
  const discoveryStatus = value.isPerson === false || (entityType !== 'person' && entityType !== 'unknown') ? 'rejected_nonperson' : 'unverified';
  return {
    id: isMain ? hostId : candidateId,
    name,
    aliases: normalizeStringList(Array.isArray(value.aliases) ? value.aliases : typeof value.aliases === 'string' ? [value.aliases] : [], 80, 180),
    isMain,
    sourceKinds: declaredKinds.length > 0 ? declaredKinds : normalizeStringList(documents.map((document) => document.kind), 12, 120),
    sourceDocumentIds: normalizeStringList(supportingDocuments.map((document) => document.id), 120, 160),
    evidence: normalizeStringList([...normalizeStringList(value.evidence, 16, 400), ...personEvidence], 20, 400),
    confidence: Math.round(clampNumber(value.confidence, 45)),
    entityVerdict: normalizeEntityVerdict({
      status: discoveryStatus,
      entityType,
      confidence: isMain && entityType === 'unknown' ? 0 : value.confidence,
      reason: value.rejectReason || personEvidence.join('; '),
      source: 'discovery',
    }, isMain),
  };
}

export function mergeCandidateFacts(existing, incoming) {
  existing.aliases = normalizeStringList([...existing.aliases, ...incoming.aliases, incoming.name !== existing.name ? incoming.name : ''], 80, 180);
  existing.candidateIds = [...new Set([existing.id, ...(existing.candidateIds || []), incoming.id, ...(incoming.candidateIds || [])])];
  existing.sourceKinds = normalizeStringList([...existing.sourceKinds, ...incoming.sourceKinds], 12, 120);
  existing.sourceDocumentIds = normalizeStringList([...existing.sourceDocumentIds, ...incoming.sourceDocumentIds], 160, 160);
  existing.evidence = normalizeStringList([...existing.evidence, ...incoming.evidence], 24, 400);
  existing.confidence = Math.max(existing.confidence, incoming.confidence);
  existing.isMain = existing.isMain || incoming.isMain;
  const existingVerdict = normalizeEntityVerdict(existing.entityVerdict, existing.isMain);
  const incomingVerdict = normalizeEntityVerdict(incoming.entityVerdict, incoming.isMain);
  existing.entityVerdict = existingVerdict.status === incomingVerdict.status
      ? (incomingVerdict.confidence > existingVerdict.confidence ? incomingVerdict : existingVerdict)
      : normalizeEntityVerdict({ status: 'unverified', entityType: 'unknown', confidence: Math.max(existingVerdict.confidence, incomingVerdict.confidence), reason: 'discovery batches disagreed', source: 'discovery' });
  return existing;
}

export function normalizeBaseRelation(value, idMap, store, sourceHash, sourceBundleKey = '', variantKey = 'default', allowedSourceDocumentIds = null) {
  if (!isPlainObject(value)) return null;
  const resolve = (reference) => {
    const raw = String(reference || '').trim();
    if (!raw) return null;
    if (raw.toLowerCase() === 'user' || raw.toLowerCase() === 'persona') return 'user';
    if (idMap.has(raw)) return idMap.get(raw);
    const normalized = raw.toLowerCase();
    if (idMap.has(normalized)) return idMap.get(normalized);
    // Ambiguous names were intentionally omitted when building this map.
    // Do not silently reintroduce them by scanning the first profile alias.
    return null;
  };
  const from = resolve(value.from);
  const to = resolve(value.to);
  if (!from || !to || from === to || from === 'user') return null;
  const allowed = allowedSourceDocumentIds instanceof Set ? allowedSourceDocumentIds : null;
  const sourceDocumentIds = normalizeStringList(value.sourceDocumentIds, 40, 180).filter((id) => !allowed || allowed.has(id));
  const evidence = normalizeStringList(value.evidence, 16, 400);
  const confidence = Math.round(clampNumber(value.confidence, 0));
  const involvesUser = from === 'user' || to === 'user';
  if (involvesUser && (sourceDocumentIds.length === 0 || evidence.length === 0 || confidence < 50)) return null;
  const affectionValue = optionalNumber(value.affection);
  const eroticValue = optionalNumber(value.eroticAttraction);
  const hatredValue = optionalNumber(value.hatred);
  const valuePresence = { affection: affectionValue !== null, eroticAttraction: eroticValue !== null, hatred: hatredValue !== null };
  const reportedValues = {
    affection: Math.round(clampNumber(affectionValue === null ? 50 : affectionValue, 50)),
    eroticAttraction: Math.round(clampNumber(eroticValue === null ? 50 : eroticValue, 50)),
    hatred: Math.round(clampNumber(hatredValue === null ? 0 : hatredValue, 0)),
  };
  const positiveInterestQualified = sourceDocumentIds.length > 0 && evidence.length > 0 && confidence >= 60
    && ((valuePresence.affection && reportedValues.affection > 50) || (valuePresence.eroticAttraction && reportedValues.eroticAttraction > 50));
  return {
    from,
    to,
    label: truncate(value.label, 300),
    affection: positiveInterestQualified ? reportedValues.affection : Math.min(50, reportedValues.affection),
    eroticAttraction: positiveInterestQualified ? reportedValues.eroticAttraction : Math.min(50, reportedValues.eroticAttraction),
    hatred: reportedValues.hatred,
    notes: normalizeStringList(value.notes, 20, 400),
    evidence,
    sourceDocumentIds,
    confidence,
    valuePresence,
    reportedValues,
    signalType: positiveInterestQualified ? 'positive_interest' : 'setting_relation',
    positiveInterestQualified,
    provenance: 'profile_analysis',
    sourceHash,
    sourceBundleKey,
    variantKey,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeVerifierVerdict(value, profile, source = 'automatic') {
  const verdict = String(value?.verdict || '').trim().toLowerCase();
  const confidence = Math.round(clampNumber(value?.confidence, 0));
  let status = 'uncertain';
  if (verdict === 'person' && confidence >= 35) status = 'verified_person';
  else if (verdict === 'non_person' && confidence >= 60) status = 'rejected_nonperson';
  return normalizeEntityVerdict({
    status,
    entityType: value?.entityType,
    confidence,
    reason: value?.reason || (status === 'uncertain' ? 'insufficient individual-character evidence' : ''),
    verifiedAt: new Date().toISOString(),
    verifierVersion: PROFILE_VERIFIER_VERSION,
    source,
  });
}

export function applyProfileVerdict(store, registry, profileId, verdict) {
  const profile = store.profiles?.[profileId];
  if (!profile) return;
  profile.entityVerdict = normalizeEntityVerdict(verdict, profile.isMain === true);
  profile.updatedAt = new Date().toISOString();
  const effective = effectiveEntityVerdict(profile);
  const entity = registry.entities?.[profileId];
  if (entity) {
    entity.entityType = effective.entityType;
    entity.entityVerdict = effective.status;
    entity.excludedFromDirector = ['uncertain', 'rejected_nonperson'].includes(effective.status);
  }
}

export function normalizeGoalType(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['sexual_intercourse', 'intercourse', 'sex', 'sex_goal'].includes(raw)) return 'sexual_intercourse';
  return truncate(raw || 'erotic_goal', 120);
}

export function goalTypeLabel(value) {
  const type = normalizeGoalType(value);
  if (type === 'sexual_intercourse') return '성관계 목표';
  if (type === 'retaliation') return '보복 목표';
  return String(value || '일반 목표');
}

export function normalizeGoalPlan(value, actor, target, turnIndex) {
  if (!isPlainObject(value)) return null;
  const goalId = safeKeyPart(value.goalId || `${actor}_${target}_${value.type || 'goal'}`, `goal_${turnIndex}_${fnv1a(`${actor}:${target}`)}`);
  const status = ['start', 'active', 'continue_later', 'pause', 'change', 'complete', 'abandon'].includes(value.status)
    ? value.status
    : 'active';
  const type = normalizeGoalType(value.type);
  return {
    goalId,
    actor,
    target,
    type,
    ...(type === 'sexual_intercourse' ? { desire: Math.round(clampNumber(value.desire, 50)) } : {}),
    triggerEventId: truncate(value.triggerEventId, 160),
    objective: truncate(value.objective, 600),
    currentApproach: truncate(value.currentApproach, 600),
    nextMove: truncate(value.nextMove, 700),
    priority: Math.round(clampNumber(value.priority, 50)),
    persistence: Math.round(clampNumber(value.persistence, 50)),
    status,
    lastAttemptTurn: turnIndex,
    ...(normalizeKocoRefs(value.kocoRefs).length ? { kocoRefs: normalizeKocoRefs(value.kocoRefs) } : {}),
  };
}

// 성별 선호도 관문(2026-10-23, Erosync.Gender-Preference-Gate.Work-Plan.md): 성적 목표 대상이 생길 때 대상 성별에 대한 행동 인물의 선호도를 통과 확률로 쓴다.
// 60 이상은 그대로(100), 1~59는 선호도%로 턴 고정 주사위, 0은 안 생김. 당신(성별 모름)·대상 성별 미상·선호도 미상·합 0이면 관문 없음(null).
export const GENDER_GATE_FREE_PERCENT = 60;

export function targetGenderPreferencePercent(preference, gender) {
  if (!isPlainObject(preference) || ['unknown', 'incomplete'].includes(preference.status)) return null;
  const male = Math.round(clampNumber(preference.malePercent, 0)), female = Math.round(clampNumber(preference.femalePercent, 0)), genderless = Math.round(clampNumber(preference.genderlessPercent, 0));
  if (male + female + genderless <= 0) return null;
  return gender === 'male' ? male : gender === 'female' ? female : gender === 'genderless' ? genderless : null;
}

// 편집기용: 여성·남성·성별 없음 퍼센트를 합 100으로 맞춘다(모두 0이면 null). 내림한 뒤 남는 몫은 소수가 큰 쪽부터 더한다.
export function normalizePreferencePercents(values) {
  const keys = ['femalePercent', 'malePercent', 'genderlessPercent'];
  const raw = keys.map(key => Math.max(0, Number(values?.[key]) || 0));
  const sum = raw[0] + raw[1] + raw[2];
  if (sum <= 0) return null;
  const exact = raw.map(value => value * 100 / sum);
  const scaled = exact.map(value => Math.floor(value));
  let rest = 100 - scaled.reduce((total, value) => total + value, 0);
  const order = exact.map((value, index) => [value - scaled[index], index]).sort((left, right) => right[0] - left[0] || left[1] - right[1]);
  for (const [, index] of order) { if (rest <= 0) break; scaled[index] += 1; rest -= 1; }
  return { femalePercent: scaled[0], malePercent: scaled[1], genderlessPercent: scaled[2] };
}

// ---------- 성적 목표 대상 (2026-10-22, Erosync.Sexual-Axes.Work-Plan.md 5·6·7절) ----------
// 세션 상태 sexualTargets: "행동 인물->대상" 키마다 { actor, target, desire 1~100(턴마다 행동이 실행될 확률, 100은 무조건), rung 0~5(사다리 칸),
// lastReciprocated(마지막 되받음: true 호응·false 몸으로 거절·null 유지), established(이미 성관계한 사이), createdTurn, lastUpdatedTurn, lastEvent, fulfilledCount, reason }.
// 장면 판단이 previousTurnUpdate.sexualTargetPatches로 생김·변화·이뤄짐·해제를 보고하고, 봇별 설정(생김 정도·원함 속도·거절 넘김)이 상한을 정한다.
// 메인 모델에는 보내지 않는다(계획 줄의 의도만 간다). SFW 봇은 상태를 두지 않는다(저장된 것은 그대로, 판단에 싣지 않음).
export const SEXUAL_TARGET_FORMATION = Object.freeze({ rare: { label: '드묾' }, normal: { label: '보통' }, frequent: { label: '빈번' } });

export const SEXUAL_DESIRE_SPEEDS = Object.freeze({
  slow: { label: '느림', initial: 30, delta: 10 }, normal: { label: '보통', initial: 60, delta: 20 },
  fast: { label: '빠름', initial: 90, delta: 40 }, unlimited: { label: '제한 없음', initial: 100, delta: 100 },
});

export const SEXUAL_REFUSAL_OVERRIDES = Object.freeze({ rare: { label: '드묾', chance: 25 }, normal: { label: '보통', chance: 65 }, frequent: { label: '잦음', chance: 90 }, always: { label: '무조건', chance: 100 } });

export const SEXUAL_TARGET_DEFAULTS = Object.freeze({ formation: 'normal', desireSpeed: 'normal', refusalOverride: 'normal' });

export function normalizeSexualTargetSettings(value) {
  const source = isPlainObject(value) ? value : {};
  const pick = (table, key, fallback) => Object.prototype.hasOwnProperty.call(table, String(source[key] || '')) ? String(source[key]) : fallback;
  return {
    formation: pick(SEXUAL_TARGET_FORMATION, 'formation', SEXUAL_TARGET_DEFAULTS.formation),
    desireSpeed: pick(SEXUAL_DESIRE_SPEEDS, 'desireSpeed', SEXUAL_TARGET_DEFAULTS.desireSpeed),
    refusalOverride: pick(SEXUAL_REFUSAL_OVERRIDES, 'refusalOverride', SEXUAL_TARGET_DEFAULTS.refusalOverride),
  };
}

// 계획 서명·봇 계획 입력용: 기본값 그대로면 null(전 판과 같은 서명).
export function sexualTargetPlanningSettings(botOverride) {
  const values = normalizeSexualTargetSettings(botOverride?.sexualTargets);
  return Object.keys(SEXUAL_TARGET_DEFAULTS).some(key => values[key] !== SEXUAL_TARGET_DEFAULTS[key]) ? values : null;
}

// 장면 판단 입력 settings.sexualTargets: 생김 정도 · 원함 속도(첫 값 상한·턴당 변화 상한) · 거절 넘김(NSFW+만).
export function sexualTargetDirectorSettings(botOverride, policy) {
  const values = normalizeSexualTargetSettings(botOverride?.sexualTargets);
  const speed = SEXUAL_DESIRE_SPEEDS[values.desireSpeed];
  return { formation: values.formation, desireSpeed: values.desireSpeed, initialDesireCap: speed.initial, desireDeltaCap: speed.delta,
    ...(policy?.nsfwPlus ? { refusalOverride: values.refusalOverride } : {}) };
}

export function refusalOverrideChance(settings) { return SEXUAL_REFUSAL_OVERRIDES[normalizeSexualTargetSettings(settings).refusalOverride].chance; }

// 원함 10단계 이름(화면): 1~10 씨앗 · 11~20 드묾 · 21~30 가끔 · 31~40 때때로 · 41~50 반반 · 51~60 자주 · 61~70 잦음 · 71~80 거의 늘 · 81~90 늘 · 91~99 매 턴 · 100 무조건
export const SEXUAL_DESIRE_WORDS = Object.freeze(['씨앗', '드묾', '가끔', '때때로', '반반', '자주', '잦음', '거의 늘', '늘', '매 턴']);

export function sexualDesireWord(value) {
  const number = clampNumber(value, 0);
  return number >= 100 ? '무조건' : SEXUAL_DESIRE_WORDS[Math.min(9, Math.max(0, Math.ceil(number / 10) - 1))];
}

export const SEXUAL_RUNG_LABELS = Object.freeze(['없음', '무대·주의 신호', '근접·가벼운 접촉', '전신 접촉·사적 공간', '입맞춤', '마지막 걸음']);

export const SEXUAL_RUNG_DIRECTOR = Object.freeze(['none', 'stage and attention signals', 'closeness and light touch', 'full-body contact and private space', 'a kiss', 'the final step']);

export function sexualRungLabel(rung) { return SEXUAL_RUNG_LABELS[clampInt(rung, 0, 0, 5)]; }

export function normalizeSexualTarget(value, key = '') {
  if (!isPlainObject(value)) return null;
  const [keyActor = '', keyTarget = ''] = String(key).split('->');
  const actor = String(value.actor || keyActor || ''), target = String(value.target || keyTarget || '');
  if (!actor || !target || actor === target || actor === 'user') return null;
  return {
    actor, target,
    desire: clampInt(value.desire, 30, 1, 100),
    rung: clampInt(value.rung, 0, 0, 5),
    lastReciprocated: value.lastReciprocated === true ? true : value.lastReciprocated === false ? false : null,
    established: value.established === true,
    createdTurn: clampInt(value.createdTurn, 0, 0, 100000000),
    lastUpdatedTurn: clampInt(value.lastUpdatedTurn, 0, 0, 100000000),
    lastEvent: ['formed', 'changed', 'fulfilled'].includes(value.lastEvent) ? value.lastEvent : 'formed',
    fulfilledCount: clampInt(value.fulfilledCount, 0, 0, 100000),
    reason: truncate(value.reason, 300),
    // 수단 대상(2026-10-29, Erosync.Instrumental-Target.Work-Plan.md): 성을 이득의 수단으로 쓰려고 생긴 대상 표식과 목적 글. 없으면 보통 대상(옛 기록 호환).
    ...(value.instrumental === true ? { instrumental: true, purpose: truncate(value.purpose, 120).trim() } : {}),
    // 시험 도구(2026-10-29): 수동으로 만든 대상 표식
    ...(value.manual === true ? { manual: true } : {}),
  };
}

export function sexualTargetsOfActor(state, actor) {
  return Object.values(isPlainObject(state?.sexualTargets) ? state.sexualTargets : {}).filter(item => isPlainObject(item) && item.actor === actor).sort((a, b) => b.desire - a.desire);
}

// 이뤄진 뒤 원함: 동기 유형별 비율(정의학 7절 "장면 판단에서 쓰는 것"). 장면 판단이 값을 주면 그 값(상한 안에서).
export const SEXUAL_FULFILLED_FACTORS = Object.freeze({ pleasure: 0.5, intimacy: 0.75, instrumental: 0.4, reassurance: 0.6 });

export function genderDisplay(value) {
  const gender = normalizeGenderIdentity(value).value;
  if (gender === 'male') return { key: gender, label: '♂ 남성', tone: 'male' };
  if (gender === 'female') return { key: gender, label: '♀ 여성', tone: 'female' };
  if (gender === 'genderless') return { key: gender, label: '◇ 성별 없음', tone: 'genderless' };
  return { key: 'unknown', label: '? 미상', tone: 'unknown' };
}

// 편집기 성별 수정·생리 주기 적용(2026-10-23, Erosync.Gender-Cycle-Edit.Work-Plan.md): 화면이 읽는 성별은 사용자 수정값이 우선이다.
export function profileGenderValue(profile) {
  return normalizeGenderIdentity(profile?.userOverrides?.genderIdentity || profile?.baseProfile?.genderIdentity).value;
}
