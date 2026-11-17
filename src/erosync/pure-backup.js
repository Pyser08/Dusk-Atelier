// addon-rebuild 4단계: Erosync 순수 조각 — 백업·이름 맞추기 도구. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.

export function createErosyncBackupCodec(options) {
  'use strict';
  let lastYieldAt = Date.now();
  const yieldControl = async () => {
    if (typeof options?.yieldControl === 'function') await options.yieldControl();
    else if (Date.now() - lastYieldAt >= 12) { await new Promise((resolve) => setTimeout(resolve, 0)); lastYieldAt = Date.now(); }
  };
  const FORMAT = 'erosync-portable-backup';
  const VERSION = 1;
  const PLUGIN_VERSION = '0.9.1';
  const LIMITS = Object.freeze({ maxBytes: 32 * 1024 * 1024, maxDepth: 64, maxNodes: 1000000, maxRecords: 20000, maxStringBytes: 2 * 1024 * 1024, maxCollectionItems: 200000 });
  const KINDS = ['scoped-chat', 'full-backup'];
  const EXACT_KEYS = Object.freeze({
    erosync_profiles_v3: 'profiles',
    erosync_character_registry_v3: 'registry',
    erosync_scope_catalog_v1: 'scope-catalog',
    erosync_bot_overrides_v1: 'bot-overrides',
    erosync_profile_audit_v1: 'profile-audit',
    erosync_profile_presets_v1: 'profile-presets',
    erosync_storage_manifest_v1: 'storage-manifest',
    erosync_character_profiles_v1: 'legacy-profiles',
  });
  const PREFIX_KEYS = Object.freeze([
    ['erosync_session_v3:', 'sessions'],
    ['erosync_behind_v1:', 'behind'],
    ['erosync_chat_state_v1:', 'legacy-sessions'],
  ]);
  const OMIT_NAMES = new Set([
    'apikey', 'apikeys', 'authorization', 'credentials', 'credential', 'password', 'secret', 'clientsecret',
    'accesstoken', 'refreshtoken', 'idtoken', 'bearertoken', 'privatekey', 'serviceaccount', 'serviceaccountjson',
    'headers', 'extraheaders', 'extraheadersjson', 'extrabody', 'extrabodyjson', 'endpoint', 'baseurl',
    'providers', 'providerprofiles', 'providersettings', 'connectionsettings', 'connections',
    'prompt', 'prompts', 'systemprompt', 'userprompt', 'fullprompt', 'rawprompt', 'messages',
    'rawrequest', 'requestbody', 'rawresponse', 'fullresponse', 'fullmodelresponse', 'modelresponse', 'responsebody',
    'raw', 'sourcetext', 'rawsource', 'originalsource', 'fullsource', 'sourcecontent',
    'lastinjection', 'lastcommittedoutput', 'rawafterresponse', 'lastassistantexcerpt',
    'preparedlookahead', 'scenerecovery',
  ]);
  const SOURCE_TEXT_NAMES = new Set(['text', 'content', 'body', 'description', 'script', 'data', 'raw']);
  const SETTINGS_FIELDS = new Set([
    'enabled', 'mode', 'behindLanguage', 'profilePreparationMode', 'sceneInterventionLevel', 'profileAuditLimit',
    'behindEnabled', 'behindUseSeparateModel', 'frequency', 'autonomy', 'goalPersistence', 'cooldownTurns',
    'maxActorsPerTurn', 'recentMessages', 'scenePromptMaxChars', 'sceneCandidateLimit', 'maxEvents', 'recordHistoryLimit', 'analysisSourceChunkChars',
    'analysisProfileBatchChars', 'analysisCharactersPerBatch', 'analysisMaxSourceChars', 'autoVerifyCharacters',
    'verificationBatchSize', 'autoRefreshProfiles', 'developmentMode', 'developmentMinEvidence',
    'developmentMinScenes', 'developmentAutoConfidence', 'developmentStepScale', 'developmentSexualStepScale', 'compatibilityMode', 'externalContextMaxChars',
    'preferenceChangeMode', 'preferenceChangePace', 'preferenceMinEvidence', 'preferenceMinScenes', 'preferenceMinConfidence',
    'cycleEnabled', 'cycleDisplay', 'cycleGoalInfluence', 'cycleMaxAdjustment', 'cycleAmplitude',
    'debug', 'advancedOpen', 'emergencyReplanSeconds',
    'promptOverrides', 'promptPresets', 'promptPresetName', // 지시문 덮어쓰기·프리셋(2026-10-15)은 동작 설정이라 백업에 들어간다
    'progressiveFollowUp', // 점진 분석 후속(2026-10-31)
  ]);
  const POLICY = Object.freeze({
    version: 1,
    credentials: 'omit-connection-settings-credentials-headers-extra-body',
    sourceMaterial: 'omit-raw-source-prompt-request-and-full-model-response-fields',
    transientCaches: 'omit-last-injection-committed-output-after-response-and-legacy-assistant-excerpt-recursively',
    retained: 'application-json-including-derived-profiles-evidence-diary-history-and-source-identifiers',
    unknownFields: 'reject-envelope-settings-fields-preserve-non-sensitive-application-record-fields',
    restoreContract: 'portable-projection-roundtrip-not-raw-storage-bytes',
  });
  const encoder = new TextEncoder();
  const fail = (code, detail) => { const error = new Error(`${code}: ${detail}`); error.code = code; throw error; };
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const normalizedName = (key) => key.replace(/[_\-\s]/g, '').toLowerCase();
  const unsafeKey = (key) => ['__proto__', 'prototype', 'constructor'].includes(key.toLowerCase());
  const scopePart = (part) => typeof part === 'string' && /^[a-z0-9가-힣_-]{1,96}$/.test(part) && !unsafeKey(part);
  const variantPart = (part) => typeof part === 'string' && /^[a-zA-Z0-9가-힣_-]{1,160}$/.test(part) && !unsafeKey(part);
  function exactFields(value, fields, label) {
    if (!plain(value)) fail('SHAPE', `${label} must be an object`);
    const allowed = new Set(fields);
    for (const key of Object.keys(value)) if (!allowed.has(key)) fail('UNKNOWN_FIELD', `${label}.${key}`);
    for (const key of fields) if (!own(value, key)) fail('MISSING_FIELD', `${label}.${key}`);
  }
  function familyForKey(key) {
    if (typeof key !== 'string' || key.length === 0 || key.length > 1000 || /[\u0000-\u001f]/.test(key)) fail('STORAGE_KEY', 'invalid storage key');
    if (own(EXACT_KEYS, key)) return EXACT_KEYS[key];
    for (const [prefix, family] of PREFIX_KEYS) {
      if (!key.startsWith(prefix)) continue;
      const suffix = key.slice(prefix.length);
      const parts = suffix.split(':');
      if (parts.length !== (family === 'behind' ? 3 : 2) || !parts.slice(0, 2).every(scopePart) || (family === 'behind' && !variantPart(parts[2]))) fail('STORAGE_KEY', key);
      return family;
    }
    fail('STORAGE_KEY', key);
  }
  function omittedField(key, value, path) {
    const name = normalizedName(key);
    if (OMIT_NAMES.has(name)) return true;
    if (path.some((part) => ['sourcedocuments', 'documents', 'rawsources', 'sourceinventory'].includes(normalizedName(String(part)))) && SOURCE_TEXT_NAMES.has(name)) return true;
    // Existing source fields are short provenance labels. Raw objects or multiline source
    // blobs do not belong to that persisted contract.
    if (name === 'source' && (typeof value !== 'string' || value.length > 160 || /[\r\n]/.test(value))) return true;
    return false;
  }
  function copyTree(value, options = {}) {
    const ancestors = new Set();
    let nodes = 0;
    const walk = (item, path, depth) => {
      nodes += 1;
      // unbounded: the plugin's own stored data, read to pick one chat out of it. What is exported is checked again with the limit.
      if (!options.unbounded && nodes > LIMITS.maxNodes) fail('LIMIT_NODES', 'JSON node limit exceeded');
      if (depth > LIMITS.maxDepth) fail('LIMIT_DEPTH', 'JSON nesting limit exceeded');
      if (item === null || typeof item === 'boolean') return item;
      if (typeof item === 'number') {
        if (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item))) fail('NUMBER', 'non-finite or unsafe integer');
        return Object.is(item, -0) ? 0 : item;
      }
      if (typeof item === 'string') {
        if (encoder.encode(item).length > LIMITS.maxStringBytes) fail('LIMIT_STRING', 'string limit exceeded');
        return item;
      }
      if (!Array.isArray(item) && !plain(item)) fail('SHAPE', `non-JSON value at ${path.join('.')}`);
      if (ancestors.has(item)) fail('CYCLE', 'cyclic JSON value');
      ancestors.add(item);
      let result;
      if (Array.isArray(item)) {
        if (item.length > LIMITS.maxCollectionItems) fail('LIMIT_COUNT', 'array limit exceeded');
        if (Object.getPrototypeOf(item) !== Array.prototype || Object.getOwnPropertySymbols(item).length) fail('SHAPE', 'non-JSON array properties');
        const descriptors = Object.getOwnPropertyDescriptors(item);
        for (const [key, descriptor] of Object.entries(descriptors)) {
          if (key === 'length') continue;
          if (unsafeKey(key)) fail('PROTOTYPE_KEY', path.concat(key).join('.'));
          if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= item.length || !own(descriptor, 'value') || descriptor.enumerable !== true) fail('SHAPE', 'non-JSON array properties');
        }
        result = item.map((entry, index) => walk(entry, [...path, index], depth + 1));
        // Array holes are not portable JSON values and must not silently become null.
        for (let index = 0; index < item.length; index += 1) if (!own(item, index)) fail('SHAPE', 'sparse array');
      } else {
        const descriptors = Object.getOwnPropertyDescriptors(item);
        const keys = Object.keys(descriptors);
        if (keys.length > LIMITS.maxCollectionItems || Object.getOwnPropertySymbols(item).length) fail('LIMIT_COUNT', 'object shape limit exceeded');
        result = {};
        for (const key of keys.sort()) {
          if (unsafeKey(key)) fail('PROTOTYPE_KEY', path.concat(key).join('.'));
          const descriptor = descriptors[key];
          if (!own(descriptor, 'value') || descriptor.enumerable !== true) fail('SHAPE', 'accessors and hidden properties are not portable');
          const child = descriptor.value;
          if (options.project && child === undefined) continue;
          if (options.project && omittedField(key, child, path)) continue;
          if (options.rejectOmitted && omittedField(key, child, path)) fail('OMITTED_MATERIAL', path.concat(key).join('.'));
          result[key] = walk(child, [...path, key], depth + 1);
        }
      }
      ancestors.delete(item);
      return result;
    };
    return walk(value, [], 0);
  }
  function canonicalStringify(value) {
    const safe = copyTree(value);
    const stringify = (item) => {
      if (item === null || typeof item !== 'object') return JSON.stringify(item);
      if (Array.isArray(item)) return `[${item.map(stringify).join(',')}]`;
      return `{${Object.keys(item).sort().map((key) => `${JSON.stringify(key)}:${stringify(item[key])}`).join(',')}}`;
    };
    return stringify(safe);
  }
  async function sha256(value) {
    const bytes = encoder.encode(typeof value === 'string' ? value : canonicalStringify(value));
    await yieldControl();
    if (!globalThis.crypto?.subtle) fail('CRYPTO', 'SHA-256 is unavailable');
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    await yieldControl();
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // A bounded parser checks duplicate keys before object construction; JSON.parse alone
  // would silently discard earlier duplicate fields before checksums/schema validation.
  function parseStrict(text) {
    if (typeof text !== 'string') fail('INPUT', 'backup must be UTF-8 JSON text');
    if (text.length > LIMITS.maxBytes || encoder.encode(text).length > LIMITS.maxBytes) fail('LIMIT_BYTES', 'backup file is too large');
    let index = 0;
    let nodes = 0;
    const whitespace = () => { while (index < text.length && /[\x20\t\r\n]/.test(text[index])) index += 1; };
    const string = () => {
      const start = index++;
      while (index < text.length) {
        const char = text[index++];
        if (char === '"') {
          let result;
          try { result = JSON.parse(text.slice(start, index)); } catch { fail('JSON', 'invalid JSON string'); }
          if (encoder.encode(result).length > LIMITS.maxStringBytes) fail('LIMIT_STRING', 'string limit exceeded');
          return result;
        }
        if (char === '\\') index += 1;
        else if (char.charCodeAt(0) < 32) fail('JSON', 'unescaped control character');
      }
      fail('JSON', 'unterminated JSON string');
    };
    const value = (depth) => {
      nodes += 1;
      if (nodes > LIMITS.maxNodes) fail('LIMIT_NODES', 'JSON node limit exceeded');
      if (depth > LIMITS.maxDepth) fail('LIMIT_DEPTH', 'JSON nesting limit exceeded');
      whitespace();
      const char = text[index];
      if (char === '"') return string();
      if (char === '{') {
        index += 1; whitespace();
        const result = {}; const keys = new Set();
        if (text[index] === '}') { index += 1; return result; }
        for (;;) {
          if (text[index] !== '"') fail('JSON', 'object key expected');
          const key = string();
          if (unsafeKey(key)) fail('PROTOTYPE_KEY', key);
          if (keys.has(key)) fail('DUPLICATE_KEY', key);
          keys.add(key);
          if (keys.size > LIMITS.maxCollectionItems) fail('LIMIT_COUNT', 'object limit exceeded');
          whitespace(); if (text[index++] !== ':') fail('JSON', 'colon expected');
          result[key] = value(depth + 1); whitespace();
          const separator = text[index++];
          if (separator === '}') return result;
          if (separator !== ',') fail('JSON', 'comma expected');
          whitespace();
        }
      }
      if (char === '[') {
        index += 1; whitespace(); const result = [];
        if (text[index] === ']') { index += 1; return result; }
        for (;;) {
          if (result.length >= LIMITS.maxCollectionItems) fail('LIMIT_COUNT', 'array limit exceeded');
          result.push(value(depth + 1)); whitespace();
          const separator = text[index++];
          if (separator === ']') return result;
          if (separator !== ',') fail('JSON', 'comma expected');
        }
      }
      for (const [literal, result] of [['true', true], ['false', false], ['null', null]]) {
        if (text.startsWith(literal, index)) { index += literal.length; return result; }
      }
      const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(index));
      if (!match) fail('JSON', 'JSON value expected');
      index += match[0].length;
      const number = Number(match[0]);
      if (!Number.isFinite(number) || (Number.isInteger(number) && !Number.isSafeInteger(number))) fail('NUMBER', 'non-finite or unsafe integer');
      return Object.is(number, -0) ? 0 : number;
    };
    const result = value(0); whitespace();
    if (index !== text.length) fail('JSON', 'trailing data');
    return result;
  }
  function validateScope(scope, kind) {
    if (kind === 'full-backup') { if (scope !== null) fail('SCOPE', 'full backup scope must be null'); return null; }
    exactFields(scope, ['sourceBundleKey', 'scopeKey', 'variantKey', 'characterId', 'chatId', 'characterName', 'chatName'], 'scope');
    for (const [key, value] of Object.entries(scope)) {
      if (typeof value !== 'string' || value.length > 1000 || /[\u0000-\u001f]/.test(value)) fail('SCOPE', `invalid ${key}`);
    }
    for (const key of ['sourceBundleKey', 'scopeKey', 'variantKey']) if (!scope[key]) fail('SCOPE', `${key} is required`);
    const parts = scope.scopeKey.split(':');
    if (!scopePart(scope.sourceBundleKey) || parts.length !== 2 || !parts.every(scopePart) || parts[0] !== scope.sourceBundleKey || !variantPart(scope.variantKey)) fail('SCOPE', 'inconsistent or malformed scope identifiers');
    return copyTree(scope);
  }
  // 지시문 덮어쓰기·프리셋(2026-10-15)은 글 하나가 아니라 묶음(칸 id → 갈래 → 글)이다. 내보내기·가져오기 때 모양만 확인한다(2026-10-31, 내보내기 실패 수정).
  const PROMPT_OVERRIDE_BRANCHES = ['common', 'sfw', 'nsfw', 'plus'];
  function promptOverridesShape(value, label) {
    if (!plain(value)) fail('SETTINGS', `${label} must be an object`);
    for (const [id, branches] of Object.entries(value)) {
      if (!plain(branches)) fail('SETTINGS', `${label}.${id} must be an object`);
      for (const [branch, text] of Object.entries(branches)) {
        if (!PROMPT_OVERRIDE_BRANCHES.includes(branch) || typeof text !== 'string') fail('SETTINGS', `${label}.${id}.${branch} must be prompt text`);
      }
    }
  }
  function promptPresetsShape(value, label) {
    if (!Array.isArray(value)) fail('SETTINGS', `${label} must be a preset list`);
    value.forEach((preset, index) => {
      exactFields(preset, ['name', 'overrides'], `${label}.${index}`);
      if (typeof preset.name !== 'string' || !preset.name.length || preset.name.length > 200) fail('SETTINGS', `${label}.${index}.name must be a short text`);
      promptOverridesShape(preset.overrides, `${label}.${index}.overrides`);
    });
  }
  function settingsProjection(settings, importing = false) {
    if (settings === null || settings === undefined) return null;
    if (!plain(settings)) fail('SETTINGS', 'ordinary settings must be an object');
    const safe = copyTree(settings, importing ? { rejectOmitted: true } : { project: true });
    const result = {};
    for (const [key, value] of Object.entries(safe)) {
      if (!SETTINGS_FIELDS.has(key)) {
        // Export callers must supply the explicitly ordinary subset; silently dropping
        // unknown config fields could hide a newly introduced setting or credential.
        fail('UNKNOWN_SETTING', key);
      }
      if (key === 'promptOverrides') promptOverridesShape(value, key);
      else if (key === 'promptPresets') promptPresetsShape(value, key);
      else if (!['boolean', 'string', 'number'].includes(typeof value)) fail('SETTINGS', `${key} must be a scalar`);
      result[key] = value;
    }
    return result;
  }
  const PRESET_PROFILE_KEYS = ['genderIdentity', 'eroticInterest', 'targetGenderPreference', 'legacyAttraction', 'attraction', 'initiative', 'spontaneity', 'directness', 'goalPersistence', 'obsessiveness', 'publicOpenness', 'extremity', 'retaliation', 'sexualPreferences', 'positionPreferences', 'menstrualCycle', 'sexualHumor', 'flirting', 'seduction', 'goalPatterns', 'voiceNotes', 'axisAnswers',
    'sexualSpontaneity', 'sexualOpenness', 'sexualMomentum', 'sexualMotive'];
  // 성적 축(2026-10-22): 숫자 셋과 동기 유형은 선택 필드다(미분석이면 없음). 그 전 프리셋에는 없다.
  const PRESET_SEXUAL_SCALARS = ['sexualSpontaneity', 'sexualOpenness', 'sexualMomentum'];
  const PRESET_SEXUAL_MOTIVES = ['pleasure', 'intimacy', 'instrumental', 'reassurance'];
  function validatePresetSexualMotive(value) {
    if (value === undefined) return;
    exactFields(value, ['primary', 'secondary', 'evidence', 'confidence'], 'sexual motive');
    if (!PRESET_SEXUAL_MOTIVES.includes(value.primary) || !(value.secondary === '' || (PRESET_SEXUAL_MOTIVES.includes(value.secondary) && value.secondary !== value.primary))) fail('PRESET_FIELD', 'sexual motive type');
    presetList(value.evidence, 4, 300, 'sexual motive evidence');
    if (!Number.isInteger(value.confidence) || value.confidence < 0 || value.confidence > 100) fail('PRESET_NUMBER', 'sexual motive confidence');
  }
  // 선택 필드: 없어도 되는 값. 극단성은 0.8.6에서 추가됐고 0.8.5 이전 프리셋에는 없다.
  // 정의학 반영 이후 여덟 축은 채점하지 못하면 값이 없고(미분석), 축마다의 답(axisAnswers)은 새로 생긴 선택 필드다.
  const PRESET_SCALAR_AXES = ['initiative', 'spontaneity', 'directness', 'goalPersistence', 'obsessiveness', 'publicOpenness', 'extremity'];
  const PRESET_OPTIONAL_KEYS = ['positionPreferences', 'menstrualCycle', 'axisAnswers', ...PRESET_SCALAR_AXES, ...PRESET_SEXUAL_SCALARS, 'sexualMotive'];
  function validatePresetAxisAnswers(value) {
    if (value === undefined) return;
    if (!plain(value) || !Object.keys(value).length) fail('PRESET_SHAPE', 'axis answers');
    for (const [axis, item] of Object.entries(value)) {
      if (![...PRESET_SCALAR_AXES, 'retaliation', 'eroticInterest', ...PRESET_SEXUAL_SCALARS].includes(axis)) fail('PRESET_FIELD', 'axis answer ' + axis);
      // answerKo(2026-10-12): 화면용 한글 설명, 선택 필드
      const hasKorean = plain(item) && own(item, 'answerKo');
      exactFields(item, hasKorean ? ['answer', 'evidence', 'confidence', 'answerKo'] : ['answer', 'evidence', 'confidence'], 'axis answer');
      presetText(item.answer, 400, 'axis answer'); presetList(item.evidence, 4, 300, 'axis evidence');
      if (hasKorean) presetText(item.answerKo, 400, 'axis answer korean');
      if (!Number.isInteger(item.confidence) || item.confidence < 0 || item.confidence > 100) fail('PRESET_NUMBER', 'axis confidence');
    }
  }
  function presetText(value, limit, label) { if (typeof value !== 'string' || value.length > limit) fail('PRESET_SHAPE', label); }
  function presetList(value, limit, chars, label) {
    if (!Array.isArray(value) || value.length > limit) fail('PRESET_SHAPE', label);
    value.forEach(item => presetText(item, chars, label));
  }
  function presetSources(value) {
    if (!Array.isArray(value) || !value.length || value.length > 200) fail('PRESET_SOURCES', 'source count');
    for (const source of value) {
      exactFields(source, ['kind', 'label', 'hash'], 'preset source');
      presetText(source.kind, 80, 'source kind'); presetText(source.label, 240, 'source label');
      if (!/^[a-f0-9]{64}$/.test(source.hash)) fail('PRESET_SOURCES', 'source hash');
    }
  }
  function validatePresetPositionPreferences(value) {
    if (value === undefined) return;
    if (!Array.isArray(value) || value.length > 16) fail('PRESET_LIMIT', 'position preferences');
    const ids = new Set(), labels = new Set();
    for (const item of value) {
      exactFields(item, ['id', 'label', 'preference', 'basis', 'confidence', 'evidence', 'reason'], 'position preference');
      presetText(item.id, 120, 'preference id'); presetText(item.label, 120, 'preference label');
      const label = item.label.normalize('NFKC').toLowerCase().trim();
      if (!item.id || !label || ids.has(item.id) || labels.has(label)) fail('PRESET_ID', 'position preference');
      ids.add(item.id); labels.add(label);
      if (!['preferred', 'neutral', 'disliked'].includes(item.preference) || !['explicit', 'inferred', 'user'].includes(item.basis)) fail('PRESET_FIELD', 'position preference classification');
      if (!Number.isInteger(item.confidence) || item.confidence < 0 || item.confidence > 100) fail('PRESET_NUMBER', 'preference confidence');
      presetList(item.evidence, 4, 240, 'preference evidence'); presetText(item.reason, 300, 'preference reason');
    }
  }

  // 생리 재편에서 더한 값(황체기·유형·임상 수준·정서 유형·호르몬 민감도·인지·공개·피임·불쾌감)은 선택 필드다. 0.8.6 프리셋에는 없다.
  // 생리 2차(2026-10-13)에서 더한 값(피임 방법·폐경 이행·시기 아형·임신 의향·처음 상태의 원인·수유·경과 일수)도 선택 필드다.
  const PRESET_CYCLE_OPTIONAL = ['lutealDays', 'awareNextPeriod', 'premenstrualType', 'clinicalLevel', 'affectType', 'hormoneSensitive', 'disclosure', 'contraception',
    'method', 'transition', 'timingType', 'intentLevel', 'initialCause', 'initialNursing', 'initialElapsedDays'];
  function validatePresetCycle(value) {
    if (value === undefined) return;
    exactFields(value, ['applicable', 'lengthDays', 'bleedingDays', 'initialDay', 'initialStatus', 'initialReason', 'irregular', 'aware', 'symptoms', 'basis', 'evidence', 'reason',
      ...(plain(value) ? PRESET_CYCLE_OPTIONAL.filter(key => own(value, key)) : [])], 'cycle profile');
    for (const field of ['applicable', 'irregular', 'aware']) if (typeof value[field] !== 'boolean') fail('PRESET_SHAPE', field);
    for (const field of ['awareNextPeriod', 'hormoneSensitive']) if (own(value, field) && typeof value[field] !== 'boolean') fail('PRESET_SHAPE', field);
    if (!Number.isInteger(value.lengthDays) || value.lengthDays < 2 || value.lengthDays > 366
      || !Number.isInteger(value.bleedingDays) || value.bleedingDays < 1 || value.bleedingDays > Math.min(30, value.lengthDays - 1)
      || !Number.isInteger(value.initialDay) || value.initialDay < 0 || value.initialDay > value.lengthDays
      || own(value, 'lutealDays') && (!Number.isInteger(value.lutealDays) || value.lutealDays < 10 || value.lutealDays > 16)) fail('PRESET_NUMBER', 'cycle length');
    if (!['active', 'paused', 'waiting', 'ended'].includes(value.initialStatus) || !['explicit', 'inferred', 'rp_default', 'user'].includes(value.basis)) fail('PRESET_FIELD', 'cycle classification');
    for (const [field, allowed] of [['premenstrualType', ['none', 'mild', 'strong', 'midcycle', 'positive']], ['clinicalLevel', ['physiological', 'pms', 'pmdd', 'pme']],
      ['affectType', ['irritable', 'anxious', 'sensitive', 'sad']], ['disclosure', ['hidden', 'close', 'open']], ['contraception', ['none', 'hormonal']],
      ['method', ['', 'pill', 'continuous', 'minipill', 'injection', 'implant', 'iud']], ['transition', ['', 'early', 'late']], ['timingType', ['week', 'luteal', 'lingering']],
      ['initialCause', ['', 'pregnancy', 'contraception', 'energy_deficit', 'birth', 'weaning', 'loss', 'stopped_contraception', 'recovered', 'menopause', 'other']],
      ['initialNursing', ['', 'full', 'partial', 'none']]]) {
      if (own(value, field) && !allowed.includes(value[field])) fail('PRESET_FIELD', `cycle ${field}`);
    }
    if (own(value, 'intentLevel') && value.intentLevel !== null && !(Number.isInteger(value.intentLevel) && value.intentLevel >= -2 && value.intentLevel <= 2)) fail('PRESET_FIELD', 'cycle intentLevel');
    if (own(value, 'initialElapsedDays') && !(Number.isInteger(value.initialElapsedDays) && value.initialElapsedDays >= 0 && value.initialElapsedDays <= 2000)) fail('PRESET_NUMBER', 'cycle elapsed days');
    exactFields(value.symptoms, ['pain', 'fatigue', 'sensitivity', ...(plain(value.symptoms) && own(value.symptoms, 'discomfort') ? ['discomfort'] : [])], 'cycle symptoms');
    for (const number of Object.values(value.symptoms)) if (!Number.isInteger(number) || number < 0 || number > 100) fail('PRESET_NUMBER', 'cycle symptoms');
    presetText(value.initialReason, 240, 'cycle reason'); presetText(value.reason, 300, 'cycle note'); presetList(value.evidence, 4, 240, 'cycle evidence');
  }

  function validateProfilePreset(value) {
    const preset = copyTree(value, { rejectOmitted: true });
    exactFields(preset, ['format', 'schemaVersion', 'createdAt', 'botName', 'variantLabel', 'sourceFingerprint', 'complete', 'profiles', 'relations', 'omissions', 'checksum', ...(own(preset, 'analysisWorkflow') ? ['analysisWorkflow'] : [])], 'preset');
    if (own(preset, 'analysisWorkflow') && preset.analysisWorkflow !== 'selected_lore') fail('PRESET_FIELD', 'analysis workflow');
    if (preset.format !== 'erosync-profile-preset' || preset.schemaVersion !== 1) fail('PRESET_FORMAT', 'unsupported preset');
    presetText(preset.botName, 240, 'bot name'); presetText(preset.variantLabel, 240, 'variant');
    if (typeof preset.createdAt !== 'string' || !Number.isFinite(Date.parse(preset.createdAt)) || new Date(preset.createdAt).toISOString() !== preset.createdAt
      || typeof preset.complete !== 'boolean' || !/^[a-f0-9]{64}$/.test(preset.sourceFingerprint)) fail('PRESET_SHAPE', 'metadata');
    exactFields(preset.omissions, ['profiles', 'relations'], 'preset omissions');
    for (const count of Object.values(preset.omissions)) if (!Number.isInteger(count) || count < 0) fail('PRESET_SHAPE', 'omission count');
    if (!Array.isArray(preset.profiles) || !preset.profiles.length || preset.profiles.length > 1000 || !Array.isArray(preset.relations) || preset.relations.length > 20000) fail('PRESET_LIMIT', 'entries');
    const ids = new Set(['user']); let mains = 0;
    for (const item of preset.profiles) {
      exactFields(item, ['key', 'name', 'aliases', 'isMain', 'match', 'value'], 'preset profile');
      presetText(item.key, 180, 'profile key'); presetText(item.name, 180, 'profile name'); presetList(item.aliases, 80, 180, 'aliases');
      if (!item.key || !item.name || ids.has(item.key) || typeof item.isMain !== 'boolean') fail('PRESET_ID', 'profile key');
      ids.add(item.key); if (item.isMain) mains++;
      exactFields(item.match, ['kind', 'sources', 'blockHash', 'loreHash', 'fingerprint'], 'preset match');
      if (!['main', 'roster', 'documents', 'selected_lore'].includes(item.match.kind) || !/^[a-f0-9]{64}$/.test(item.match.fingerprint)) fail('PRESET_SOURCES', 'match');
      if (item.match.kind === 'selected_lore' && preset.analysisWorkflow !== 'selected_lore') fail('PRESET_FIELD', 'selected lore match');
      for (const key of ['blockHash', 'loreHash']) if (item.match[key] && !/^[a-f0-9]{64}$/.test(item.match[key])) fail('PRESET_SOURCES', key);
      presetSources(item.match.sources);
      if (item.isMain !== (item.match.kind === 'main')) fail('PRESET_MAIN', 'main source kind');
      exactFields(item.value, ['baseProfile', 'userOverrides', 'profileConfidence', 'entityVerdict', 'analysisStatus', 'evidence'], 'preset value');
      if (!plain(item.value.baseProfile) || !plain(item.value.userOverrides)) fail('PRESET_SHAPE', 'profile values');
      exactFields(item.value.baseProfile, PRESET_PROFILE_KEYS.filter(key => !PRESET_OPTIONAL_KEYS.includes(key) || Object.prototype.hasOwnProperty.call(item.value.baseProfile, key)), 'preset base profile');
      for (const fields of [item.value.baseProfile, item.value.userOverrides]) for (const key of Object.keys(fields)) if (!PRESET_PROFILE_KEYS.includes(key)) fail('PRESET_FIELD', key);
      validatePresetPositionPreferences(item.value.baseProfile.positionPreferences);
      validatePresetPositionPreferences(item.value.userOverrides.positionPreferences);
      validatePresetCycle(item.value.baseProfile.menstrualCycle);
      validatePresetCycle(item.value.userOverrides.menstrualCycle);
      validatePresetAxisAnswers(item.value.baseProfile.axisAnswers);
      validatePresetAxisAnswers(item.value.userOverrides.axisAnswers);
      for (const key of [...PRESET_SCALAR_AXES, ...PRESET_SEXUAL_SCALARS].filter(key => Object.prototype.hasOwnProperty.call(item.value.baseProfile, key))) {
        const number = item.value.baseProfile[key]; if (!Number.isFinite(number) || number < 0 || number > 100) fail('PRESET_NUMBER', key);
      }
      validatePresetSexualMotive(item.value.baseProfile.sexualMotive);
      validatePresetSexualMotive(item.value.userOverrides.sexualMotive);
      exactFields(item.value.profileConfidence, ['overall', 'behavior', 'evidence', 'reason'], 'preset confidence');
      for (const key of ['overall', 'behavior', 'evidence']) if (!Number.isFinite(item.value.profileConfidence[key]) || item.value.profileConfidence[key] < 0 || item.value.profileConfidence[key] > 100) fail('PRESET_NUMBER', key);
      presetText(item.value.profileConfidence.reason, 500, 'confidence reason');
      exactFields(item.value.entityVerdict, ['status', 'entityType', 'confidence', 'reason', 'source'], 'preset verdict');
      if (!['verified_person', 'unverified', 'uncertain', 'rejected_nonperson'].includes(item.value.entityVerdict.status)
        || !['ready', 'low_evidence'].includes(item.value.analysisStatus)) fail('PRESET_STATUS', item.key);
      presetText(item.value.entityVerdict.entityType, 80, 'entity type'); presetText(item.value.entityVerdict.reason, 500, 'entity reason'); presetText(item.value.entityVerdict.source, 80, 'entity source');
      if (!Number.isFinite(item.value.entityVerdict.confidence) || item.value.entityVerdict.confidence < 0 || item.value.entityVerdict.confidence > 100) fail('PRESET_NUMBER', 'entity confidence');
      presetList(item.value.evidence, 24, 400, 'evidence');
    }
    if (mains > 1 || (preset.complete && mains !== 1 && preset.analysisWorkflow !== 'selected_lore')) fail('PRESET_MAIN', 'main identity');
    const pairs = new Set();
    for (const relation of preset.relations) {
      exactFields(relation, ['from', 'to', 'label', 'affection', 'eroticAttraction', 'hatred', 'notes', 'evidence', 'confidence', 'valuePresence', 'reportedValues', 'signalType', 'positiveInterestQualified', 'sources'], 'preset relation');
      if (!ids.has(relation.from) || !ids.has(relation.to) || relation.from === relation.to || pairs.has(relation.from + '->' + relation.to)) fail('PRESET_REFERENCE', 'relation');
      pairs.add(relation.from + '->' + relation.to); presetSources(relation.sources);
      exactFields(relation.valuePresence, ['affection', 'eroticAttraction', 'hatred'], 'relation presence');
      exactFields(relation.reportedValues, ['affection', 'eroticAttraction', 'hatred'], 'relation values');
      for (const key of ['affection', 'eroticAttraction', 'hatred']) {
        if (typeof relation.valuePresence[key] !== 'boolean' || !Number.isFinite(relation[key]) || relation[key] < 0 || relation[key] > 100
          || !Number.isFinite(relation.reportedValues[key]) || relation.reportedValues[key] < 0 || relation.reportedValues[key] > 100) fail('PRESET_NUMBER', key);
      }
      if (!Number.isFinite(relation.confidence) || relation.confidence < 0 || relation.confidence > 100 || typeof relation.positiveInterestQualified !== 'boolean'
        || !['setting_relation', 'positive_interest'].includes(relation.signalType)) fail('PRESET_SHAPE', 'relation signal');
      presetText(relation.label, 300, 'relation label'); presetList(relation.notes, 20, 400, 'relation notes'); presetList(relation.evidence, 16, 400, 'relation evidence');
    }
    exactFields(preset.checksum, ['algorithm', 'value'], 'preset checksum');
    if (preset.checksum.algorithm !== 'SHA-256' || !/^[a-f0-9]{64}$/.test(preset.checksum.value)) fail('PRESET_CHECKSUM', 'checksum');
    return preset;
  }
  async function authenticateProfilePreset(value) {
    const preset = validateProfilePreset(value), body = { ...preset }; delete body.checksum;
    if (await sha256(body) !== preset.checksum.value) fail('PRESET_CHECKSUM', 'content changed');
    for (const item of preset.profiles) {
      const source = item.match;
      const expected = await sha256(source.kind === 'roster' ? ['roster', source.blockHash, source.loreHash] : [source.kind, source.sources.map(value => value.kind + ':' + value.hash).sort()]);
      if (expected !== source.fingerprint) fail('PRESET_SOURCES', 'fingerprint mismatch');
    }
    return preset;
  }
  async function encodeProfilePreset(body) {
    const value = { ...copyTree(body, { rejectOmitted: true }), checksum: { algorithm: 'SHA-256', value: await sha256(body) } };
    validateProfilePreset(value);
    const text = canonicalStringify(value); if (encoder.encode(text).length > LIMITS.maxBytes) fail('LIMIT_BYTES', 'preset');
    return text;
  }
  async function decodeProfilePreset(text) { return await authenticateProfilePreset(parseStrict(text)); }
  function validateProfilePresetStore(value) {
    exactFields(value, ['schemaVersion', 'slots'], 'preset store');
    if (value.schemaVersion !== 1 || !plain(value.slots) || Object.keys(value.slots).length > 500) fail('PRESET_STORE', 'shape or count');
    if (encoder.encode(canonicalStringify(value)).length > LIMITS.maxBytes) fail('PRESET_STORE', 'archive size limit');
    for (const [key, preset] of Object.entries(value.slots)) { presetText(key, 360, 'preset slot'); validateProfilePreset(preset); }
    return value;
  }
  async function validateStoredPresets(records) {
    const store = records.find(record => record.key === 'erosync_profile_presets_v1')?.value;
    if (store) { validateProfilePresetStore(store); for (const preset of Object.values(store.slots)) await authenticateProfilePreset(preset); }
  }
  function validateRecordValue(key, value) {
    const family = familyForKey(key);
    if (family === 'profile-presets') validateProfilePresetStore(value);
    if (!plain(value)) fail('RECORD_VALUE', `${family} must be an object`);
    if (value.schemaVersion !== undefined && (!Number.isInteger(value.schemaVersion) || value.schemaVersion < 1 || value.schemaVersion > (['profiles', 'registry', 'sessions', 'legacy-sessions'].includes(family) ? 7 : family === 'scope-catalog' ? 2 : 1))) fail('RECORD_VERSION', key);
    const objects = { profiles: ['profiles'], registry: ['entities'], 'scope-catalog': ['bots'], 'bot-overrides': ['bots'], 'storage-manifest': ['sessions', 'behind'] };
    for (const field of objects[family] || []) if (!plain(value[field])) fail('RECORD_VALUE', `${key}.${field}`);
    if (['profile-audit', 'behind'].includes(family) && !Array.isArray(value.entries)) fail('RECORD_VALUE', `${key}.entries`);
    if (family === 'sessions' && value.scopeKey !== key.slice('erosync_session_v3:'.length)) fail('RECORD_SCOPE', key);
    if (family === 'sessions') for (const [variant, state] of [[value.variantKey || 'default', value], ...Object.entries(value.variantStates || {})]) {
      const external = state?.koco;
      if (external === undefined) continue;
      if (!plain(external) || external.schemaVersion !== 1 || external.scopeKey !== value.scopeKey || external.variantKey !== variant
        || !plain(external.receipts) || !plain(external.links) || !plain(external.lanes)) fail('KOCO_SCOPE_SHAPE', key);
      for (const [id, receipt] of Object.entries(external.receipts)) {
        if (!plain(receipt) || receipt.key !== id || typeof receipt.revision !== 'string' || typeof receipt.messageId !== 'string'
          || !['pending', 'applied', 'historical', 'context_only', 'retracted', 'detached'].includes(receipt.status)
          || ['actors', 'knownBy', 'deniedTo'].some(field => !Array.isArray(receipt[field]) || receipt[field].some(item => typeof item !== 'string'))) fail('KOCO_RECEIPT_SHAPE', id);
      }
      for (const lane of Object.values(external.lanes)) {
        if (!plain(lane) || !['relations', 'rivalries'].includes(lane.kind) || typeof lane.key !== 'string' || !Array.isArray(lane.operations)
          || lane.operations.some(op => !plain(op) || op.kind !== lane.kind || op.key !== lane.key)) fail('KOCO_REPLAY_SHAPE', key);
      }
    }
    if (family === 'legacy-profiles') {
      for (const [bundleKey, bundle] of Object.entries(value)) if (!plain(bundle) || !Array.isArray(bundle.characters)) fail('LEGACY_SHAPE', bundleKey);
    }
    if (family === 'legacy-sessions' && value.scopeKey !== undefined && value.scopeKey !== key.slice('erosync_chat_state_v1:'.length)) fail('RECORD_SCOPE', key);
    return family;
  }
  function projectRecords(records, importing = false, unbounded = false) {
    if (!Array.isArray(records) || records.length > LIMITS.maxRecords) fail('LIMIT_RECORDS', 'invalid record count');
    const seen = new Set();
    return records.map((record) => {
      exactFields(record, ['key', 'value'], 'record');
      familyForKey(record.key);
      if (seen.has(record.key)) fail('DUPLICATE_RECORD', record.key);
      seen.add(record.key);
      const value = copyTree(record.value, importing ? { rejectOmitted: true } : { project: true, unbounded: unbounded === true });
      validateRecordValue(record.key, value);
      return { key: record.key, value };
    }).sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
  }
  function validateRecordScopes(records, scope, kind) {
    if (kind !== 'scoped-chat') return;
    for (const { key } of records) {
      const family = familyForKey(key);
      const allowed = family === 'sessions' ? key === `erosync_session_v3:${scope.scopeKey}`
        : family === 'legacy-sessions' ? key === `erosync_chat_state_v1:${scope.scopeKey}`
          : family === 'behind' ? key.startsWith(`erosync_behind_v1:${scope.scopeKey}:`) : true;
      if (!allowed) fail('RECORD_SCOPE', `${key} is outside the selected chat`);
    }
  }
  async function encode(input) {
    if (!plain(input)) fail('INPUT', 'export input must be an object');
    for (const key of Object.keys(input)) if (!['kind', 'createdAt', 'scope', 'records', 'ordinarySettings'].includes(key)) fail('UNKNOWN_FIELD', `export.${key}`);
    if (!KINDS.includes(input.kind)) fail('KIND', 'unsupported backup kind');
    const scope = validateScope(input.scope, input.kind);
    const createdAt = input.createdAt;
    if (typeof createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(createdAt) || Number.isNaN(Date.parse(createdAt)) || new Date(createdAt).toISOString() !== createdAt) fail('DATE', 'createdAt must be an exact UTC ISO timestamp');
    const records = projectRecords(input.records);
    await validateStoredPresets(records);
    const ordinarySettings = settingsProjection(input.ordinarySettings);
    await yieldControl();
    validateRecordScopes(records, scope, input.kind);
    const grouped = new Map();
    for (const record of records) {
      const family = familyForKey(record.key);
      if (!grouped.has(family)) grouped.set(family, []);
      grouped.get(family).push(record);
    }
    const sections = [];
    for (const id of [...grouped.keys()].sort()) {
      const section = { id, recordCount: grouped.get(id).length, records: grouped.get(id) };
      sections.push({ ...section, sha256: await sha256(section) });
    }
    const body = {
      format: FORMAT, schemaVersion: VERSION, pluginVersion: PLUGIN_VERSION, kind: input.kind, createdAt, scope,
      omissionPolicy: { ...POLICY }, sections,
      counts: { records: records.length, sections: sections.length },
      ordinarySettings,
    };
    const envelope = { ...body, checksum: { algorithm: 'SHA-256', value: await sha256(body) } };
    const text = canonicalStringify(envelope);
    await yieldControl();
    if (encoder.encode(text).length > LIMITS.maxBytes) fail('LIMIT_BYTES', 'backup file is too large');
    return text;
  }
  async function decode(text, options = {}) {
    const envelope = parseStrict(text);
    await yieldControl();
    if (envelope?.format === 'erosync-export-diagnostic') fail('DIAGNOSTIC_ONLY', '오류 확인용 진단 파일입니다. 백업 불러오기에 사용할 수 없습니다.');
    exactFields(envelope, ['format', 'schemaVersion', 'pluginVersion', 'kind', 'createdAt', 'scope', 'omissionPolicy', 'sections', 'counts', 'ordinarySettings', 'checksum'], 'backup');
    if (envelope.format !== FORMAT) fail('FORMAT', 'unsupported legacy or foreign backup format');
    if (envelope.schemaVersion !== VERSION) fail('VERSION', 'only portable schema version 1 is supported');
    if (![PLUGIN_VERSION, '0.9.0', '0.8.6', '0.8.5', '0.8.4', '0.8.3', '0.8.2', '0.8.1', '0.8.0', '0.7.2', '0.7.1', '0.7.0', '0.6.0'].includes(envelope.pluginVersion)) fail('PLUGIN_VERSION', 'unsupported producer plugin version');
    if (!KINDS.includes(envelope.kind) || (options.expectedKind !== undefined && options.expectedKind !== envelope.kind)) fail('KIND', 'backup kind does not match the selected import action');
    validateScope(envelope.scope, envelope.kind);
    if (options.expectedScope !== undefined && options.expectedScope !== null) {
      if (envelope.kind !== 'scoped-chat') fail('SCOPE', 'scoped import expected');
      for (const key of ['sourceBundleKey', 'scopeKey', 'variantKey', 'characterId', 'chatId']) {
        if (own(options.expectedScope, key) && options.expectedScope[key] !== envelope.scope[key]) fail('SCOPE', `backup ${key} does not match the selected scope`);
      }
    }
    if (canonicalStringify(envelope.omissionPolicy) !== canonicalStringify(POLICY)) fail('POLICY', 'unknown omission policy');
    exactFields(envelope.counts, ['records', 'sections'], 'counts');
    exactFields(envelope.checksum, ['algorithm', 'value'], 'checksum');
    if (envelope.checksum.algorithm !== 'SHA-256' || !/^[0-9a-f]{64}$/.test(envelope.checksum.value)) fail('CHECKSUM', 'invalid checksum encoding');
    if (!Array.isArray(envelope.sections) || envelope.sections.length > Object.keys(EXACT_KEYS).length + PREFIX_KEYS.length) fail('SECTIONS', 'invalid sections');
    const seenSections = new Set();
    const records = [];
    for (const section of envelope.sections) {
      exactFields(section, ['id', 'recordCount', 'records', 'sha256'], 'section');
      if (typeof section.id !== 'string' || seenSections.has(section.id)) fail('SECTIONS', 'duplicate or invalid section');
      seenSections.add(section.id);
      if (!Array.isArray(section.records) || section.records.length === 0 || section.recordCount !== section.records.length) fail('COUNTS', 'section count mismatch');
      if (records.length + section.records.length > LIMITS.maxRecords) fail('LIMIT_RECORDS', 'record limit exceeded');
      const projected = projectRecords(section.records, true);
      await yieldControl();
      for (const record of projected) if (familyForKey(record.key) !== section.id) fail('SECTIONS', 'record family does not match section');
      if (typeof section.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(section.sha256)) fail('CHECKSUM', 'invalid section checksum encoding');
      const expectedHash = await sha256({ id: section.id, recordCount: section.recordCount, records: projected });
      if (expectedHash !== section.sha256) fail('SECTION_CHECKSUM', section.id);
      records.push(...projected);
    }
    projectRecords(records, true);
    await validateStoredPresets(records);
    await yieldControl();
    validateRecordScopes(records, envelope.scope, envelope.kind);
    if (envelope.counts.records !== records.length || envelope.counts.sections !== envelope.sections.length) fail('COUNTS', 'backup count mismatch');
    settingsProjection(envelope.ordinarySettings, true);
    const body = { ...envelope }; delete body.checksum;
    if (await sha256(body) !== envelope.checksum.value) fail('CHECKSUM', 'overall checksum mismatch');
    // Re-encoding validates date/settings and enforces the deterministic section/record
    // representation while leaving arbitrary JSON whitespace and object key order free.
    const normalizedText = await encode({ kind: envelope.kind, createdAt: envelope.createdAt, scope: envelope.scope, records, ordinarySettings: envelope.ordinarySettings });
    const normalized = parseStrict(normalizedText);
    // Validate the original producer's canonical layout without changing its
    // stamp/checksum merely because this reader is a newer compatible release.
    if (normalized.pluginVersion !== envelope.pluginVersion) {
      normalized.pluginVersion = envelope.pluginVersion;
      const producerBody = { ...normalized }; delete producerBody.checksum;
      normalized.checksum = { algorithm: 'SHA-256', value: await sha256(producerBody) };
    }
    await yieldControl();
    if (normalized.checksum.value !== envelope.checksum.value) fail('CANONICAL_LAYOUT', 'section or record ordering is not canonical');
    return normalized;
  }
  async function preview(envelope, options = {}) {
    // Preview may be passed an edited object; always authenticate structure/checksums again.
    const verified = await decode(canonicalStringify(envelope), options);
    const incoming = verified.sections.flatMap((section) => section.records);
    const current = options.currentRecords === undefined ? [] : projectRecords(options.currentRecords);
    await yieldControl();
    const previous = new Map(current.map((record) => [record.key, record.value]));
    const changes = [];
    for (const record of incoming) {
      const status = !previous.has(record.key) ? 'new' : canonicalStringify(previous.get(record.key)) === canonicalStringify(record.value) ? 'unchanged' : 'changed';
      changes.push({ key: record.key, section: familyForKey(record.key), status });
      previous.delete(record.key);
      await yieldControl();
    }
    return {
      kind: verified.kind, schemaVersion: verified.schemaVersion, scope: copyTree(verified.scope),
      counts: { ...verified.counts }, changes,
      currentOnlyKeys: [...previous.keys()].sort(),
      expectedWrites: incoming.length,
      ordinarySettingsIncluded: verified.ordinarySettings !== null,
      credentialsPreserved: true,
      omissions: { ...POLICY }, checksum: verified.checksum.value,
    };
  }
  return Object.freeze({
    format: FORMAT, schemaVersion: VERSION, pluginVersion: PLUGIN_VERSION, limits: LIMITS,
    omissionPolicy: Object.freeze({ ...POLICY }), ordinarySettingKeys: Object.freeze([...SETTINGS_FIELDS]),
    familyForKey, canonicalStringify, sha256, parseStrict, projectRecords, encode, decode, preview,
    encodeProfilePreset, decodeProfilePreset, authenticateProfilePreset, validateProfilePresetStore,
  });
}

export function createErosyncBackupScopeTools() {
  'use strict';
  const K = Object.freeze({ profiles: 'erosync_profiles_v3', registry: 'erosync_character_registry_v3', catalog: 'erosync_scope_catalog_v1', overrides: 'erosync_bot_overrides_v1', audit: 'erosync_profile_audit_v1', manifest: 'erosync_storage_manifest_v1', legacy: 'erosync_character_profiles_v1', presets: 'erosync_profile_presets_v1' });
  const SESSION_VARIANT_FIELDS = Object.freeze(['turnIndex', 'scene', 'relations', 'rivalries', 'goals', 'sexualTargets', 'actorStates', 'development', 'preferenceState', 'cycleState', 'userIdentity', 'identityRepair', 'continuationReceipt', 'lastPlan', 'lastInjection', 'lastCommittedOutput', 'lastCommittedMessageIndex', 'events', 'interactionHistory', 'interactionLedger', 'commitJournal', 'lastDirectorAttempt', 'directorAttemptHistory', 'preparedLookahead', 'sceneRecovery', 'koco', 'updatedAt']);
  const PROFILE_FIELDS = Object.freeze(['baseProfile', 'profileConfidence', 'userOverrides', 'locked', 'lockOrigin', 'roster', 'selectedLore', 'analysisStatus', 'evidence', 'sourceHash', 'sourceDocumentIds', 'updatedAt', 'activationSignature']);
  const PERSON_FIELDS = new Set(['actor', 'target', 'from', 'to', 'rival', 'focusTarget', 'profileId', 'actorId', 'targetId']);
  const PERSON_ARRAYS = new Set(['presentAtEnd', 'departedAtEnd', 'confirmed', 'likely', 'excluded', 'arrivalSupported', 'remoteContact', 'rememberedOnly', 'createdMobIds', 'bumpedIds', 'promotedIds']);
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const obj = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const entries = (value) => Object.entries(obj(value) ? value : {});
  const fail = (code, detail) => { const error = new Error(`${code}: ${detail}`); error.code = code; throw error; };
  function clone(value, depth = 0, seen = new Set()) {
    if (depth > 64) fail('SCOPE_DEPTH', 'nesting limit exceeded');
    if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (!obj(value) && !Array.isArray(value)) fail('SCOPE_SHAPE', 'non-JSON value');
    if (seen.has(value)) fail('SCOPE_SHAPE', 'cyclic value');
    const proto = Object.getPrototypeOf(value);
    if (proto !== (Array.isArray(value) ? Array.prototype : Object.prototype) && proto !== null) fail('SCOPE_SHAPE', 'non-JSON prototype');
    seen.add(value);
    const result = Array.isArray(value) ? [] : {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (Array.isArray(value) && key === 'length') continue;
      if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('SCOPE_KEY', key);
      if (!own(descriptor, 'value') || !descriptor.enumerable) fail('SCOPE_SHAPE', 'accessor or hidden property');
      result[key] = clone(descriptor.value, depth + 1, seen);
    }
    seen.delete(value);
    return result;
  }
  const canonical = (value) => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  const equal = (a, b) => canonical(a) === canonical(b);
  const copyWithout = (value, keys) => Object.fromEntries(entries(value).filter(([key]) => !keys.includes(key)).map(([key, item]) => [key, clone(item)]));
  const scalarMeta = (value) => Object.fromEntries(entries(value).filter(([, item]) => item === null || ['string', 'number', 'boolean'].includes(typeof item)).map(([key, item]) => [key, item]));
  const pick = (value, keys) => Object.fromEntries(keys.filter((key) => own(value || {}, key)).map((key) => [key, clone(value[key])]));
  const vkey = (value) => String(value?.variantKey || 'default');
  const mob = (value) => ['temporary_mob', 'persistent_mob'].includes(value?.category);
  function scopeCheck(scope) {
    if (!obj(scope) || !/^[a-z0-9가-힣_-]{1,96}$/.test(scope.sourceBundleKey || '') || !/^[a-zA-Z0-9가-힣_-]{1,160}$/.test(scope.variantKey || '')) fail('SCOPE', 'invalid bot or variant');
    const parts = String(scope.scopeKey || '').split(':');
    if (parts.length !== 2 || parts[0] !== scope.sourceBundleKey || !parts.every((part) => /^[a-z0-9가-힣_-]{1,96}$/.test(part))) fail('SCOPE', 'invalid chat scope');
  }
  function mapRecords(records) {
    if (!Array.isArray(records) || records.length > 20000) fail('SCOPE_RECORDS', 'invalid records');
    const map = new Map();
    for (const record of records) {
      if (!obj(record) || typeof record.key !== 'string' || !obj(record.value)) fail('SCOPE_RECORDS', 'invalid record');
      if (map.has(record.key)) fail('SCOPE_DUPLICATE', record.key);
      if (![...Object.values(K)].includes(record.key) && !/^erosync_(?:session_v3|chat_state_v1):[a-z0-9가-힣_-]{1,96}:[a-z0-9가-힣_-]{1,96}$/.test(record.key) && !/^erosync_behind_v1:[a-z0-9가-힣_-]{1,96}:[a-z0-9가-힣_-]{1,96}:[a-zA-Z0-9가-힣_-]{1,160}$/.test(record.key)) fail('SCOPE_KEY', record.key);
      map.set(record.key, clone(record.value));
    }
    return map;
  }
  const recordsOf = (map) => [...map].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => ({ key, value }));
  const inPartition = (value, scope) => value?.sourceBundleKey === scope.sourceBundleKey && vkey(value) === scope.variantKey;
  const auditOwned = (value, scope) => inPartition(value, scope) && (!value.scopeKey || value.scopeKey === scope.scopeKey);
  const trashOwned = (value, scope) => value?.sourceBundleKey === scope.sourceBundleKey && (!value.scopeKey || value.scopeKey === scope.scopeKey || value.referenceScopeKey === scope.scopeKey) && (value.variantKey ? value.variantKey === scope.variantKey : !!value.profile && (obj(value.profile.variants?.[scope.variantKey]) || (!Object.keys(value.profile.variants || {}).length && scope.variantKey === 'default')));
  const filterMap = (value, predicate) => Object.fromEntries(entries(value).filter(([key, item]) => predicate(item, key)));
  // 기록은 채팅 하나(뿌리). 이전 버전이 variantStates에 갈라 둔 칸은 뿌리에 진행이 없고 그 칸에 진행이 있을 때만 대신 쓴다.
  const sessionProgressed = (value) => Number(value?.turnIndex) > 0 || [value?.commitJournal, value?.interactionHistory].some((list) => Array.isArray(list) && list.length > 0) || Object.keys(value?.goals || {}).length > 0;
  function sessionCell(state, scope) {
    const active = String(state?.variantKey || 'default');
    const archived = active !== scope.variantKey ? state?.variantStates?.[scope.variantKey] : null;
    return obj(archived) && !sessionProgressed(state) && sessionProgressed(archived) ? archived : state;
  }
  function sessionProject(state, scope) {
    if (!state) return null;
    if (state.scopeKey !== scope.scopeKey) fail('SCOPE_MISMATCH', 'session scope');
    const selected = sessionCell(state, scope);
    const result = { ...copyWithout(state, [...SESSION_VARIANT_FIELDS, 'variantStates']), ...pick(selected, SESSION_VARIANT_FIELDS), variantKey: scope.variantKey, variantStates: {} };
    if (obj(result.koco)) result.koco = { ...result.koco, variantKey: scope.variantKey };
    if (obj(result.scopeMeta)) result.scopeMeta = { ...result.scopeMeta, sourceBundleKey: scope.sourceBundleKey };
    return result;
  }
  function profileProject(profile, scope, allowUnversionedMob = false) {
    const variants = obj(profile.variants) ? profile.variants : {};
    const selected = variants[scope.variantKey];
    if (!obj(selected)) {
      // Observed mobs are chat-owned and normalized with a single default snapshot;
      // that snapshot is not a card/module scenario variant.
      if (allowUnversionedMob && mob(profile) && Object.keys(variants).length === 1 && obj(variants.default)) return { ...clone(profile), ownerBundleKeys: [scope.sourceBundleKey] };
      if ((allowUnversionedMob && mob(profile) && !Object.keys(variants).length) || (scope.variantKey === 'default' && !Object.keys(variants).length)) return { ...clone(profile), ownerBundleKeys: [scope.sourceBundleKey] };
      fail('MISSING_VARIANT', `profile ${profile.id || ''}/${scope.variantKey}`);
    }
    const result = { ...copyWithout(profile, [...PROFILE_FIELDS, 'variants', 'variantLabel', 'activeVariantKey']), ...pick(selected, PROFILE_FIELDS), variants: { [scope.variantKey]: clone(selected) }, activeVariantKey: scope.variantKey, ownerBundleKeys: [scope.sourceBundleKey] };
    if (own(selected, 'label')) result.variantLabel = selected.label;
    return result;
  }
  function collectRefs(value, refs = new Set(), path = []) {
    if (Array.isArray(value)) { for (const item of value) collectRefs(item, refs, path); return refs; }
    if (!obj(value)) return refs;
    for (const [key, item] of entries(value)) {
      if (['identityRepair', 'variantStates', 'commitJournal'].includes(key)) continue;
      const undo = path.includes('undo');
      if (undo && ['profiles', 'entities', 'createdMobIds', 'bumpedIds', 'promotedIds'].includes(key)) continue;
      if (PERSON_FIELDS.has(key) && typeof item === 'string' && item) refs.add(item);
      if (PERSON_ARRAYS.has(key) && Array.isArray(item)) for (const id of item) if (typeof id === 'string' && id) refs.add(id);
      if (['actorStates', 'profiles', 'entities'].includes(key) && obj(item)) for (const id of Object.keys(item)) refs.add(id);
      collectRefs(item, refs, [...path, key]);
    }
    return refs;
  }
  function selectedBundle(bundle, scope, allowMissing) {
    const selected = bundle?.variants?.[scope.variantKey] || (scope.variantKey === 'default' && !Object.keys(bundle?.variants || {}).length ? bundle : null);
    if (!obj(selected)) { if (allowMissing) return null; fail('MISSING_VARIANT', `bundle ${scope.sourceBundleKey}/${scope.variantKey}`); }
    const record = copyWithout(selected, ['variants', 'activeVariantKey']);
    return { ...record, variants: { [scope.variantKey]: clone(record) }, activeVariantKey: scope.variantKey };
  }
  function projectInternal(records, scope, allowMissing, omitMissingSession = allowMissing) {
    scopeCheck(scope);
    const all = mapRecords(records), out = new Map();
    const store = all.get(K.profiles), registry = all.get(K.registry);
    if (!store || !obj(store.profiles) || !registry || !obj(registry.entities)) fail('SCOPE_REQUIRED', 'profile and registry stores are required');
    const bundle = selectedBundle(store.sourceBundles?.[scope.sourceBundleKey], scope, allowMissing);
    const sessionKey = `erosync_session_v3:${scope.scopeKey}`;
    const session = sessionProject(all.get(sessionKey), scope, omitMissingSession);
    // A chat has no session in a settings variant until a turn is committed there. An export of that
    // variant then carries no session record, which a restore reads as "no progress in this variant".
    const withoutSession = !session && omitMissingSession && !allowMissing;
    const baseRelations = filterMap(store.baseRelations, (value) => inPartition(value, scope));
    const suppressions = filterMap(store.baseRelationSuppressions?.entries, (value) => inPartition(value, scope));
    for (const suppression of Object.values(suppressions)) if (suppression.sessionScopeKey && suppression.sessionScopeKey !== scope.scopeKey) { delete suppression.sessionSnapshot; delete suppression.sessionScopeKey; }
    const trash = filterMap(store.deletedProfiles, (value) => trashOwned(value, scope));
    const audit = all.get(K.audit);
    const auditEntries = (audit?.entries || []).filter((value) => auditOwned(value, scope));
    const ids = new Set(bundle?.characterIds || []);
    for (const [id, entity] of entries(registry.entities)) if (mob(entity) && entity.scopeKey === scope.scopeKey) ids.add(entity.profileId || id);
    collectRefs([session, baseRelations, suppressions, auditEntries], ids);
    const liveIds = new Set(ids), historicalIds = new Set();
    for (const journal of session?.commitJournal || []) {
      for (const [id, snapshot] of entries(journal?.undo?.profiles)) if (obj(snapshot)) historicalIds.add(id);
      collectRefs(journal?.undo, ids, ['undo']);
    }
    // A bot-wide deleted profile may have been deleted while viewing another
    // chat. Include only the tombstones needed by this selected history.
    for (const [key, entry] of entries(store.deletedProfiles)) {
      if (!ids.has(entry.profileId) || own(trash, key)) continue;
      const dependency = { ...clone(entry), referenceScopeKey: scope.scopeKey };
      if (trashOwned(dependency, scope)) trash[key] = dependency;
    }
    for (const entry of Object.values(trash)) { ids.add(entry.profileId); collectRefs(entry.baseRelations, ids); }
    ids.delete('user');
    const projectedProfiles = {}, projectedEntities = {};
    const deletedIds = new Set(Object.values(trash).map((value) => value.profileId));
    const profileIds = new Set([...ids].map(id => registry.entities[id]?.profileId
      || (store.identityRedirects?.[id]?.sourceBundleKey === scope.sourceBundleKey ? store.identityRedirects[id].profileId : '') || id));
    for (const id of [...profileIds].sort()) {
      const profile = store.profiles[id];
      const entity = registry.entities[id] || Object.values(registry.entities).find((value) => value.profileId === id);
      if (!profile) { if (deletedIds.has(id) || !liveIds.has(id) && historicalIds.has(id)) continue; fail('DANGLING_PROFILE', id); }
      if (deletedIds.has(id) && !obj(profile.variants?.[scope.variantKey]) && Object.keys(profile.variants || {}).length) continue;
      const isMob = mob(profile) || mob(entity);
      if (isMob && (profile.scopeOwnership?.scopeKey || entity?.scopeKey) !== scope.scopeKey) fail('SCOPE_MISMATCH', `mob ${id}`);
      if (!isMob && ((profile.ownerBundleKeys || []).length
        ? !profile.ownerBundleKeys.includes(scope.sourceBundleKey) : !(bundle?.characterIds || []).includes(id))) {
        if (!liveIds.has(id) && historicalIds.has(id)) continue;
        fail('SCOPE_MISMATCH', `profile owner ${id}`);
      }
      projectedProfiles[id] = profileProject(profile, scope, isMob);
      if (entity) {
        const entityKey = entity.id || id;
        projectedEntities[entityKey] = clone(entity);
        if (entity.ownerBundleKeys) projectedEntities[entityKey].ownerBundleKeys = [scope.sourceBundleKey];
        if (!isMob && entity.scopeKey && entity.scopeKey !== scope.scopeKey) delete projectedEntities[entityKey].scopeKey;
      }
    }
    for (const entry of Object.values(trash)) {
      if (entry.profile) entry.profile = profileProject(entry.profile, scope, mob(entry.profile));
      entry.baseRelations = filterMap(entry.baseRelations, (value) => inPartition(value, scope));
    }
    if (session) {
      for (const journal of session.commitJournal || []) {
        const undo = journal?.undo;
        if (!obj(undo)) continue;
        for (const [id, profile] of entries(undo.profiles)) if (profile !== null) {
          if (!(profile.ownerBundleKeys || []).includes(scope.sourceBundleKey) && !own(projectedProfiles, id)) fail('SCOPE_MISMATCH', `historical profile owner ${id}`);
          undo.profiles[id] = !Object.keys(profile.variants || {}).length ? { ...clone(profile), ownerBundleKeys: [scope.sourceBundleKey] } : profileProject(profile, scope, mob(profile));
        }
        for (const entity of Object.values(undo.entities || {})) if (obj(entity) && entity.ownerBundleKeys) entity.ownerBundleKeys = [scope.sourceBundleKey];
      }
      out.set(sessionKey, session);
    }
    const runKey = `${scope.sourceBundleKey}::${scope.variantKey}`;
    const runs = {};
    if (store.analysisRuns?.[runKey]) runs[runKey] = clone(store.analysisRuns[runKey]);
    if (store.analysisRuns?.[scope.sourceBundleKey] && (vkey(store.analysisRuns[scope.sourceBundleKey]) === scope.variantKey || equal(store.analysisRuns[scope.sourceBundleKey], store.analysisRuns?.[runKey]))) runs[scope.sourceBundleKey] = clone(store.analysisRuns[scope.sourceBundleKey]);
    const history = store.analysisExecutionHistory;
    // Redirects are bot-wide identity history, but only selected canonical profiles
    // make their retired IDs and aliases relevant to this portable chat snapshot.
    const identityRedirects = Object.fromEntries(entries(store.identityRedirects)
      .filter(([, value]) => value?.sourceBundleKey === scope.sourceBundleKey && own(projectedProfiles, value.profileId))
      .map(([id, value]) => [id, pick(value, ['profileId', 'sourceBundleKey', 'aliases'])]));
    out.set(K.profiles, { ...scalarMeta(store), sourceBundles: bundle ? { [scope.sourceBundleKey]: bundle } : {}, profiles: projectedProfiles, ...(Object.keys(identityRedirects).length ? { identityRedirects } : {}), baseRelations, deletedProfiles: trash, analysisRuns: runs, analysisExecutionHistory: { ...scalarMeta(history), partitions: filterMap(history?.partitions, (value) => inPartition(value, scope)) }, baseRelationSuppressions: { ...scalarMeta(store.baseRelationSuppressions), entries: suppressions } });
    out.set(K.registry, { ...scalarMeta(registry), entities: projectedEntities });
    for (const key of [K.catalog, K.overrides]) if (all.has(key)) {
      const original = all.get(key), bot = original.bots?.[scope.sourceBundleKey];
      let selected = bot ? clone(bot) : null;
      if (selected && key === K.catalog) {
        selected.chats = selected.chats?.[scope.scopeKey] ? { [scope.scopeKey]: clone(selected.chats[scope.scopeKey]) } : {};
        selected.lastScopeKey = selected.chats[scope.scopeKey] ? scope.scopeKey : '';
        if (selected.chats[scope.scopeKey]) { selected.chats[scope.scopeKey].variantKey = scope.variantKey; if (bundle?.sourceHash !== undefined) selected.chats[scope.scopeKey].sourceHash = bundle.sourceHash; }
      }
      if (selected && key === K.overrides) selected.activeVariantKey = scope.variantKey;
      out.set(key, { ...scalarMeta(original), bots: selected ? { [scope.sourceBundleKey]: selected } : {} });
    }
    if (audit) out.set(K.audit, { ...scalarMeta(audit), entries: clone(auditEntries) });
    const manifest = all.get(K.manifest);
    if (manifest) {
      const owned = !withoutSession && manifest.sessions?.[scope.scopeKey] ? clone(manifest.sessions[scope.scopeKey]) : null;
      if (owned) { owned.variantKeys = [scope.variantKey]; owned.currentVariantKey = scope.variantKey; owned.mobProfileIds = Object.keys(projectedProfiles).filter((id) => mob(projectedProfiles[id])); }
      const behindKey = `erosync_behind_v1:${scope.scopeKey}:${scope.variantKey}`;
      out.set(K.manifest, { ...scalarMeta(manifest), sessions: owned ? { [scope.scopeKey]: owned } : {}, behind: manifest.behind?.[behindKey] ? { [behindKey]: clone(manifest.behind[behindKey]) } : {}, auxiliaryKeys: [] });
    }
    for (const key of [`erosync_behind_v1:${scope.scopeKey}:${scope.variantKey}`, `erosync_chat_state_v1:${scope.scopeKey}`]) if (all.has(key)) out.set(key, all.get(key));
    return recordsOf(out);
  }
  function validate(records, scope = null) {
    if (scope) scopeCheck(scope);
    const map = mapRecords(records), store = map.get(K.profiles), registry = map.get(K.registry);
    if (!store || !obj(store.profiles) || !registry || !obj(registry.entities)) fail('SCOPE_REQUIRED', 'profile and registry stores are required');
    const known = new Set(['user', ...Object.keys(store.profiles || {}), ...Object.values(store.deletedProfiles || {}).map((entry) => entry.profileId)]);
    if (own(store, 'identityRedirects') && !obj(store.identityRedirects)) fail('IDENTITY_REDIRECT_SHAPE', 'redirect map');
    for (const [id, redirect] of entries(store.identityRedirects)) {
      if (!obj(redirect) || !id || typeof redirect.profileId !== 'string' || !redirect.profileId || typeof redirect.sourceBundleKey !== 'string' || !redirect.sourceBundleKey
        || !Array.isArray(redirect.aliases) || redirect.aliases.length > 128 || redirect.aliases.some((alias) => typeof alias !== 'string' || !alias.trim() || alias.length > 180)
        || Object.keys(redirect).some((key) => !['profileId', 'sourceBundleKey', 'aliases'].includes(key))) fail('IDENTITY_REDIRECT_SHAPE', id);
      if (id === redirect.profileId || own(store.profiles, id)) fail('IDENTITY_REDIRECT_CONFLICT', `live or self-referencing retired ID ${id}`);
      const canonicalProfile = store.profiles[redirect.profileId];
      if (!canonicalProfile) fail('DANGLING_PROFILE', `redirect ${id}`);
      if (!(canonicalProfile.ownerBundleKeys || []).includes(redirect.sourceBundleKey) || (scope && redirect.sourceBundleKey !== scope.sourceBundleKey)) fail('SCOPE_MISMATCH', `redirect ${id}`);
      known.add(id);
    }
    for (const [id, entity] of entries(registry.entities)) {
      if (entity.id && entity.id !== id) fail('SCOPE_ID', `registry ${id}`);
      if (entity.profileId && !known.has(entity.profileId)) fail('DANGLING_PROFILE', `registry ${id}`);
      if (known.has(entity.profileId || id)) known.add(id);
      if (scope && mob(entity) && entity.scopeKey !== scope.scopeKey) fail('SCOPE_MISMATCH', `registry ${id}`);
    }
    const checkRefs = (value, label, allowed = known, path = []) => { for (const id of collectRefs(value, new Set(), path)) if (!allowed.has(id)) fail('DANGLING_PROFILE', `${label}/${id}`); };
    for (const [bot, bundle] of entries(store.sourceBundles)) {
      if (scope && bot !== scope.sourceBundleKey) fail('SCOPE_MISMATCH', `bundle ${bot}`);
      for (const id of bundle.characterIds || []) if (!store.profiles[id]) fail('DANGLING_PROFILE', `bundle ${id}`);
      for (const [variant, value] of entries(bundle.variants)) { if (scope && variant !== scope.variantKey) fail('SCOPE_MISMATCH', `bundle variant ${variant}`); for (const id of value.characterIds || []) if (!store.profiles[id]) fail('DANGLING_PROFILE', `variant ${id}`); }
    }
    for (const [id, profile] of entries(store.profiles)) {
      if (profile.id && profile.id !== id) fail('SCOPE_ID', `profile ${id}`);
      if (!registry.entities[id] && !Object.values(registry.entities).some((entity) => entity.profileId === id)) fail('DANGLING_PROFILE', `profile registry ${id}`);
      if (scope && (profile.ownerBundleKeys || []).some((bot) => bot !== scope.sourceBundleKey)) fail('SCOPE_MISMATCH', `profile owners ${id}`);
      const scopeMobDefault = scope && mob(profile) && profile.scopeOwnership?.scopeKey === scope.scopeKey && Object.keys(profile.variants || {}).length === 1 && obj(profile.variants.default);
      if (scope && !scopeMobDefault && Object.keys(profile.variants || {}).some((variant) => variant !== scope.variantKey)) fail('SCOPE_MISMATCH', `profile variant ${id}`);
      if (scope && mob(profile) && profile.scopeOwnership?.scopeKey && profile.scopeOwnership.scopeKey !== scope.scopeKey) fail('SCOPE_MISMATCH', `mob profile ${id}`);
    }
    for (const bucket of [store.baseRelations, store.baseRelationSuppressions?.entries]) for (const [id, relation] of entries(bucket)) {
      if (scope && !inPartition(relation, scope)) fail('SCOPE_MISMATCH', `relation ${id}`);
      if (!relation.from || !relation.to) fail('SCOPE_REFERENCE', `relation ${id}`);
      checkRefs(relation, id);
    }
    for (const [key, value] of map) {
      if (key.startsWith('erosync_session_v3:') || key.startsWith('erosync_chat_state_v1:')) {
        const prefix = key.startsWith('erosync_session_v3:') ? 'erosync_session_v3:' : 'erosync_chat_state_v1:';
        const keyScope = key.slice(prefix.length);
        if (scope && keyScope !== scope.scopeKey) fail('SCOPE_MISMATCH', key);
        if (value.scopeKey && value.scopeKey !== keyScope) fail('SCOPE_MISMATCH', key);
        if (scope && prefix === 'erosync_session_v3:' && (value.variantKey !== scope.variantKey || Object.keys(value.variantStates || {}).length)) fail('SCOPE_MISMATCH', 'session variant');
        for (const state of [value, ...Object.values(value.variantStates || {})]) {
          checkRefs(state, key);
          for (const journal of state.commitJournal || []) {
            const historicalKnown = new Set(known);
            for (const [id, snapshot] of entries(journal?.undo?.profiles)) {
              if (snapshot === null) continue;
              if (!obj(snapshot) || snapshot.id && snapshot.id !== id) fail('SCOPE_ID', `journal profile ${id}`);
              if (scope && (snapshot.ownerBundleKeys || []).some(bot => bot !== scope.sourceBundleKey)) fail('SCOPE_MISMATCH', `historical profile owner ${id}`);
              historicalKnown.add(id);
            }
            for (const [id, entity] of entries(journal?.undo?.entities)) {
              if (entity === null) continue;
              if (!obj(entity) || entity.id && entity.id !== id) fail('SCOPE_ID', `journal entity ${id}`);
              if (entity.profileId && !historicalKnown.has(entity.profileId)) fail('DANGLING_PROFILE', `journal registry ${id}`);
              historicalKnown.add(id);
            }
            checkRefs(journal?.undo, `${key}/journal/${journal.commitId || ''}`, historicalKnown, ['undo']);
          }
          const goals = new Set([...Object.keys(state.goals || {}), ...Object.values(state.goals || {}).map((goal) => goal.goalId).filter(Boolean)]);
          for (const [id, goal] of entries(state.goals)) if (goal.goalId && goal.goalId !== id) fail('SCOPE_REFERENCE', `goal ${id}`);
          const inspect = (item, historical = false) => {
            if (Array.isArray(item)) { for (const child of item) inspect(child, historical); return; }
            for (const [name, child] of entries(item)) {
              if (['identityRepair', 'variantStates'].includes(name)) continue;
              if (name === 'goalId' && child && !historical && !goals.has(child)) fail('DANGLING_GOAL', String(child));
              if (child && typeof child === 'object') inspect(child, historical || ['events', 'interactionHistory', 'interactionLedger', 'commitJournal'].includes(name));
            }
          };
          inspect(state);
        }
      } else if (scope && key.startsWith('erosync_behind_v1:') && key !== `erosync_behind_v1:${scope.scopeKey}:${scope.variantKey}`) fail('SCOPE_MISMATCH', key);
    }
    for (const entry of map.get(K.audit)?.entries || []) { if (scope && !auditOwned(entry, scope)) fail('SCOPE_MISMATCH', 'audit partition'); checkRefs(entry, 'audit'); }
    for (const [id, value] of entries(store.deletedProfiles)) { if (scope && !trashOwned(value, scope)) fail('SCOPE_MISMATCH', `trash ${id}`); checkRefs(value.baseRelations, id); }
    if (scope) {
      if (map.has(K.legacy)) fail('SCOPE_MISMATCH', 'global legacy profiles require full export');
      for (const key of [K.catalog, K.overrides]) if (Object.keys(map.get(key)?.bots || {}).some((bot) => bot !== scope.sourceBundleKey)) fail('SCOPE_MISMATCH', key);
      const bot = map.get(K.catalog)?.bots?.[scope.sourceBundleKey];
      if (bot?.sourceBundleKey && bot.sourceBundleKey !== scope.sourceBundleKey) fail('SCOPE_MISMATCH', 'catalog bot metadata');
      if (Object.keys(bot?.chats || {}).some((chat) => chat !== scope.scopeKey)) fail('SCOPE_MISMATCH', 'catalog chats');
      const chat = bot?.chats?.[scope.scopeKey];
      if (chat && ((chat.scopeKey && chat.scopeKey !== scope.scopeKey) || (chat.sourceBundleKey && chat.sourceBundleKey !== scope.sourceBundleKey) || (chat.variantKey && chat.variantKey !== scope.variantKey))) fail('SCOPE_MISMATCH', 'catalog chat metadata');
      const manifest = map.get(K.manifest);
      if (Object.keys(manifest?.sessions || {}).some((chat) => chat !== scope.scopeKey) || Object.keys(manifest?.behind || {}).some((key) => key !== `erosync_behind_v1:${scope.scopeKey}:${scope.variantKey}`)) fail('SCOPE_MISMATCH', 'manifest');
      const sessionEntry = manifest?.sessions?.[scope.scopeKey];
      if (sessionEntry && (sessionEntry.scopeKey !== scope.scopeKey || sessionEntry.sourceBundleKey !== scope.sourceBundleKey || (sessionEntry.v3Key && sessionEntry.v3Key !== `erosync_session_v3:${scope.scopeKey}`) || (sessionEntry.legacyKey && sessionEntry.legacyKey !== `erosync_chat_state_v1:${scope.scopeKey}`) || (sessionEntry.variantKeys || []).some((variant) => variant !== scope.variantKey))) fail('SCOPE_MISMATCH', 'manifest session metadata');
      for (const [key, entry] of entries(manifest?.behind)) if (entry.key !== key || entry.scopeKey !== scope.scopeKey || entry.sourceBundleKey !== scope.sourceBundleKey || entry.variantKey !== scope.variantKey) fail('SCOPE_MISMATCH', 'manifest Behind metadata');
      for (const [key, partition] of entries(store.analysisExecutionHistory?.partitions)) if (key !== `${scope.sourceBundleKey}::${scope.variantKey}` || !inPartition(partition, scope)) fail('SCOPE_MISMATCH', 'execution partition');
      for (const key of Object.keys(store.analysisRuns || {})) if (key !== scope.sourceBundleKey && key !== `${scope.sourceBundleKey}::${scope.variantKey}`) fail('SCOPE_MISMATCH', 'analysis run');
    }
    return { valid: true, records: map.size, profiles: Object.keys(store.profiles).length, scope: scope ? clone(scope) : null };
  }
  function project(records, scope, options = {}) { const output = projectInternal(records, scope, false, options.omitMissingSession === true); validate(output, scope); return output; }
  // A chat keeps separate progress per settings variant. When the selected variant has no session yet,
  // tells which variant holds the chat's progress (the selected one when there is none to carry).
  function progressVariant(records, scope) {
    scopeCheck(scope);
    const state = (Array.isArray(records) ? records : []).find((record) => record?.key === `erosync_session_v3:${scope.scopeKey}`)?.value;
    if (!obj(state)) return scope.variantKey;
    const active = String(state.variantKey || 'default');
    // 뿌리에 진행이 있으면 변형과 무관하게 뿌리가 채팅의 기록이다. 없을 때만 옛 보관 칸을 찾는다.
    if (sessionProgressed(state) || active === scope.variantKey || obj(state.variantStates?.[scope.variantKey])) return scope.variantKey;
    const held = entries(state.variantStates).filter(([, value]) => obj(value) && sessionProgressed(value))
      .sort(([, left], [, right]) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')));
    return held.length ? held[0][0] : scope.variantKey;
  }
  function replace(currentRecords, incomingRecords, scope) {
    scopeCheck(scope); validate(incomingRecords, scope);
    const current = mapRecords(currentRecords), incoming = mapRecords(incomingRecords);
    const oldProjection = new Map(projectInternal(currentRecords, scope, true).map(({ key, value }) => [key, value]));
    const oldStore = current.get(K.profiles), imported = incoming.get(K.profiles);
    const nextStore = clone(oldStore), incomingProfiles = imported.profiles;
    const selectedIds = new Set([...Object.keys(oldProjection.get(K.profiles)?.profiles || {}), ...Object.keys(incomingProfiles)]);
    // An absent redirect in one chat/variant is not deletion authority for the
    // bot-wide name history. Existing canonical mappings cannot be reassigned.
    for (const [id, redirect] of entries(imported.identityRedirects)) {
      const before = oldStore.identityRedirects?.[id];
      if (before && (before.sourceBundleKey !== redirect.sourceBundleKey || before.profileId !== redirect.profileId)) fail('IDENTITY_REDIRECT_CONFLICT', id);
      const aliases = [...new Set([...(before?.aliases || []), ...redirect.aliases])];
      if (aliases.length > 128) fail('IDENTITY_REDIRECT_CONFLICT', `alias limit ${id}`);
      if (!obj(nextStore.identityRedirects)) nextStore.identityRedirects = {};
      nextStore.identityRedirects[id] = { ...clone(redirect), aliases };
    }
    for (const id of selectedIds) {
      const before = oldStore.profiles?.[id], after = incomingProfiles[id];
      const otherOwners = (before?.ownerBundleKeys || []).filter((bot) => bot !== scope.sourceBundleKey);
      if (otherOwners.length) {
        if (after && !equal(profileProject(before, scope, mob(before)), after)) fail('SHARED_PROFILE_CONFLICT', id);
        continue;
      }
      if (!after) {
        if (!before) continue;
        const remaining = copyWithout(before.variants, [scope.variantKey]);
        if (!Object.keys(remaining).length) { delete nextStore.profiles[id]; continue; }
        nextStore.profiles[id] = { ...clone(before), variants: remaining };
        if (before.activeVariantKey === scope.variantKey) {
          const nextKey = Object.keys(remaining).sort()[0];
          const materialized = profileProject({ ...before, variants: remaining }, { ...scope, variantKey: nextKey });
          nextStore.profiles[id] = { ...materialized, variants: remaining };
        }
        continue;
      }
      const variants = { ...(before?.variants || {}), ...(after.variants || {}) };
      const inactive = before?.activeVariantKey && before.activeVariantKey !== scope.variantKey && obj(before.variants?.[before.activeVariantKey]);
      nextStore.profiles[id] = inactive ? { ...clone(before), variants: clone(variants) } : { ...clone(after), ...(Object.keys(variants).length ? { variants: clone(variants) } : {}) };
    }
    const oldBundle = oldStore.sourceBundles?.[scope.sourceBundleKey];
    const newBundle = imported.sourceBundles?.[scope.sourceBundleKey];
    if (!newBundle) fail('MISSING_VARIANT', 'incoming bundle');
    const variants = { ...(oldBundle?.variants || {}), ...newBundle.variants };
    nextStore.sourceBundles = { ...(oldStore.sourceBundles || {}), [scope.sourceBundleKey]: oldBundle?.activeVariantKey && oldBundle.activeVariantKey !== scope.variantKey ? { ...clone(oldBundle), variants: clone(variants) } : { ...clone(newBundle), variants: clone(variants) } };
    const replaceMap = (oldMap, newMap, predicate) => {
      const result = filterMap(oldMap, (value, key) => !predicate(value, key));
      for (const [key, value] of entries(newMap)) { if (own(result, key)) fail('SCOPE_COLLISION', key); result[key] = clone(value); }
      return result;
    };
    nextStore.baseRelations = replaceMap(oldStore.baseRelations, imported.baseRelations, (value) => inPartition(value, scope));
    nextStore.deletedProfiles = replaceMap(oldStore.deletedProfiles,
      filterMap(imported.deletedProfiles, value => value.referenceScopeKey !== scope.scopeKey), value => trashOwned(value, scope));
    for (const [key, entry] of entries(imported.deletedProfiles)) if (entry.referenceScopeKey === scope.scopeKey) {
      if (oldStore.deletedProfiles?.[key]) nextStore.deletedProfiles[key] = clone(oldStore.deletedProfiles[key]);
      else { nextStore.deletedProfiles[key] = clone(entry); delete nextStore.deletedProfiles[key].referenceScopeKey; }
    }
    for (const [key, oldTrash] of entries(oldStore.deletedProfiles)) {
      if (!trashOwned(oldTrash, scope) || oldTrash.variantOnly || !obj(oldTrash.profile?.variants)) continue;
      const otherVariants = copyWithout(oldTrash.profile.variants, [scope.variantKey]);
      if (!Object.keys(otherVariants).length) continue;
      const newTrash = nextStore.deletedProfiles[key];
      if (!newTrash) {
        nextStore.deletedProfiles[key] = { ...clone(oldTrash), profile: { ...clone(oldTrash.profile), variants: otherVariants }, baseRelations: filterMap(oldTrash.baseRelations, (value) => !inPartition(value, scope)) };
      } else {
        const variants = { ...otherVariants, ...(newTrash.profile?.variants || {}) };
        const inactive = oldTrash.profile.activeVariantKey && oldTrash.profile.activeVariantKey !== scope.variantKey;
        newTrash.profile = inactive ? { ...clone(oldTrash.profile), variants } : { ...newTrash.profile, variants };
        newTrash.baseRelations = { ...filterMap(oldTrash.baseRelations, (value) => !inPartition(value, scope)), ...(newTrash.baseRelations || {}) };
      }
    }
    nextStore.baseRelationSuppressions = { ...(oldStore.baseRelationSuppressions || {}), entries: replaceMap(oldStore.baseRelationSuppressions?.entries, imported.baseRelationSuppressions?.entries, (value) => inPartition(value, scope)) };
    for (const [key, entry] of entries(nextStore.baseRelationSuppressions.entries)) {
      const old = oldStore.baseRelationSuppressions?.entries?.[key];
      if (inPartition(entry, scope) && old?.sessionScopeKey && old.sessionScopeKey !== scope.scopeKey && !entry.sessionScopeKey) {
        entry.sessionScopeKey = old.sessionScopeKey;
        if (own(old, 'sessionSnapshot')) entry.sessionSnapshot = clone(old.sessionSnapshot);
      }
    }
    nextStore.analysisExecutionHistory = { ...(oldStore.analysisExecutionHistory || {}), partitions: replaceMap(oldStore.analysisExecutionHistory?.partitions, imported.analysisExecutionHistory?.partitions, (value) => inPartition(value, scope)) };
    const runKey = `${scope.sourceBundleKey}::${scope.variantKey}`;
    nextStore.analysisRuns = { ...(oldStore.analysisRuns || {}) }; delete nextStore.analysisRuns[runKey];
    if (imported.analysisRuns?.[runKey]) nextStore.analysisRuns[runKey] = clone(imported.analysisRuns[runKey]);
    const oldAlias = oldStore.analysisRuns?.[scope.sourceBundleKey];
    if (!oldAlias || equal(oldAlias, oldStore.analysisRuns?.[runKey]) || vkey(oldAlias) === scope.variantKey) {
      delete nextStore.analysisRuns[scope.sourceBundleKey];
      if (imported.analysisRuns?.[scope.sourceBundleKey]) nextStore.analysisRuns[scope.sourceBundleKey] = clone(imported.analysisRuns[scope.sourceBundleKey]);
    }
    current.set(K.profiles, nextStore);
    const nextRegistry = current.get(K.registry), importedRegistry = incoming.get(K.registry);
    for (const id of selectedIds) if (!nextStore.profiles[id]) delete nextRegistry.entities[id];
    for (const [id, entity] of entries(importedRegistry.entities)) {
      const otherOwners = (oldStore.profiles?.[entity.profileId || id]?.ownerBundleKeys || []).filter((bot) => bot !== scope.sourceBundleKey);
      if (otherOwners.length && nextRegistry.entities[id] && !equal(copyWithout(nextRegistry.entities[id], ['ownerBundleKeys']), copyWithout(entity, ['ownerBundleKeys']))) fail('SHARED_PROFILE_CONFLICT', `registry ${id}`);
      if (!otherOwners.length) nextRegistry.entities[id] = clone(entity);
    }
    const sessionKey = `erosync_session_v3:${scope.scopeKey}`, previousSession = current.get(sessionKey), incomingSession = incoming.get(sessionKey);
    if (incomingSession) {
      // The existing rollback path restores whole profile before-images. Rehydrate
      // foreign variants here so a later reroll cannot erase unselected ownership.
      for (const journal of incomingSession.commitJournal || []) {
        for (const [id, snapshot] of entries(journal?.undo?.profiles)) {
          const before = oldStore.profiles?.[id];
          if (!before) continue;
          const otherOwners = (before.ownerBundleKeys || []).filter((bot) => bot !== scope.sourceBundleKey);
          const chatOwnedDefaultMob = mob(before) && !otherOwners.length
            && (before.scopeOwnership?.scopeKey || current.get(K.registry)?.entities?.[id]?.scopeKey) === scope.scopeKey
            && Object.keys(before.variants || {}).every(key => key === 'default');
          const otherVariants = chatOwnedDefaultMob ? {} : copyWithout(before.variants, [scope.variantKey]);
          if (snapshot === null) {
            if (otherOwners.length || Object.keys(otherVariants).length) fail('SHARED_UNDO_CONFLICT', id);
            continue;
          }
          if (otherOwners.length && !equal(profileProject(before, scope, mob(before)), snapshot)) fail('SHARED_UNDO_CONFLICT', id);
          const variants = { ...otherVariants, ...(snapshot.variants || {}) };
          const inactive = !chatOwnedDefaultMob && before.activeVariantKey && before.activeVariantKey !== scope.variantKey && obj(before.variants?.[before.activeVariantKey]);
          journal.undo.profiles[id] = { ...(inactive ? clone(before) : clone(snapshot)), ...(Object.keys(variants).length ? { variants } : {}), ownerBundleKeys: clone(before.ownerBundleKeys || [scope.sourceBundleKey]) };
        }
        for (const [id, snapshot] of entries(journal?.undo?.entities)) {
          const oldEntity = current.get(K.registry)?.entities?.[id];
          const idProfile = oldEntity?.profileId || id;
          const otherOwners = (oldStore.profiles?.[idProfile]?.ownerBundleKeys || []).filter((bot) => bot !== scope.sourceBundleKey);
          if (otherOwners.length && !equal(oldEntity, snapshot)) fail('SHARED_UNDO_CONFLICT', `registry ${id}`);
        }
      }
      // 들어온 세션이 채팅의 기록(뿌리)을 교체한다. 변형 키가 달라도 보관 칸에 넣지 않는다. 같은 키의 옛 보관 칸은 지운다.
      const keptStates = clone(previousSession?.variantStates || {});
      delete keptStates[scope.variantKey];
      current.set(sessionKey, { ...clone(incomingSession), variantStates: keptStates });
    } else if (previousSession) {
      if (obj(previousSession.variantStates?.[scope.variantKey])) delete previousSession.variantStates[scope.variantKey];
      else fail('SCOPE_REQUIRED', 'active session cannot be deleted through an absent scoped record');
    }
    for (const key of [`erosync_behind_v1:${scope.scopeKey}:${scope.variantKey}`, `erosync_chat_state_v1:${scope.scopeKey}`]) { if (incoming.has(key)) current.set(key, incoming.get(key)); else current.delete(key); }
    for (const key of [K.catalog, K.overrides]) if (incoming.has(key)) {
      const value = current.get(key) || { ...scalarMeta(incoming.get(key)), bots: {} }, sourceBot = incoming.get(key).bots?.[scope.sourceBundleKey], oldBot = value.bots?.[scope.sourceBundleKey];
      if (sourceBot) {
        value.bots = { ...(value.bots || {}) };
        if (key === K.catalog && oldBot) {
          const chats = { ...(oldBot.chats || {}) };
          const activeOther = previousSession && previousSession.variantKey !== scope.variantKey;
          if (!activeOther) { delete chats[scope.scopeKey]; if (sourceBot.chats?.[scope.scopeKey]) chats[scope.scopeKey] = clone(sourceBot.chats[scope.scopeKey]); }
          value.bots[scope.sourceBundleKey] = { ...oldBot, chats };
        } else value.bots[scope.sourceBundleKey] = { ...clone(sourceBot), ...(key === K.overrides && oldBot?.activeVariantKey && oldBot.activeVariantKey !== scope.variantKey ? { activeVariantKey: oldBot.activeVariantKey } : {}) };
      }
      current.set(key, value);
    }
    if (incoming.has(K.audit)) {
      const value = current.get(K.audit) || { ...scalarMeta(incoming.get(K.audit)), entries: [] };
      value.entries = [...(value.entries || []).filter((entry) => !auditOwned(entry, scope)), ...clone(incoming.get(K.audit).entries || [])];
      current.set(K.audit, value);
    }
    if (incoming.has(K.manifest)) {
      const value = current.get(K.manifest) || { ...scalarMeta(incoming.get(K.manifest)), sessions: {}, behind: {}, auxiliaryKeys: [] };
      const importedManifest = incoming.get(K.manifest), oldEntry = value.sessions?.[scope.scopeKey], newEntry = importedManifest.sessions?.[scope.scopeKey];
      if (newEntry) {
        const variantKeys = [...new Set([...(oldEntry?.variantKeys || []).filter((key) => key !== scope.variantKey), ...newEntry.variantKeys])];
        value.sessions[scope.scopeKey] = { ...clone(newEntry), variantKeys, ...(oldEntry?.currentVariantKey && oldEntry.currentVariantKey !== scope.variantKey ? { currentVariantKey: oldEntry.currentVariantKey } : {}) };
      }
      const key = `erosync_behind_v1:${scope.scopeKey}:${scope.variantKey}`;
      delete value.behind[key]; if (importedManifest.behind?.[key]) value.behind[key] = clone(importedManifest.behind[key]);
      current.set(K.manifest, value);
    }
    const result = recordsOf(current);
    validate(result, null);
    return result;
  }
  function diagnoseProfileOwnership(records, scope) {
    scopeCheck(scope);
    const all = mapRecords(records), store = all.get(K.profiles), registry = all.get(K.registry);
    if (!obj(store?.profiles) || !obj(registry?.entities)) fail('SCOPE_REQUIRED', 'profile and registry stores are required');
    const sessionKey = `erosync_session_v3:${scope.scopeKey}`, rawSession = all.get(sessionKey);
    if (rawSession && rawSession.scopeKey !== scope.scopeKey) fail('SCOPE_MISMATCH', 'diagnostic session');
    const state = rawSession ? sessionCell(rawSession, scope) : null;
    const session = obj(state) ? { ...pick(rawSession, ['schemaVersion']), scopeKey: scope.scopeKey,
      variantKey: scope.variantKey, ...pick(state, SESSION_VARIANT_FIELDS), variantStates: {} } : null;
    const bundle = selectedBundle(store.sourceBundles?.[scope.sourceBundleKey], scope, true);
    const members = new Set(bundle?.characterIds || []);
    const baseRelations = filterMap(store.baseRelations, value => inPartition(value, scope));
    const auditEntries = (all.get(K.audit)?.entries || []).filter(value => auditOwned(value, scope));
    const references = new Map();
    let omittedLocations = 0;
    const add = (id, path) => {
      if (typeof id !== 'string' || !id || id === 'user') return;
      if (!references.has(id)) references.set(id, []);
      const paths = references.get(id);
      if (paths.length < 12) paths.push(path); else omittedLocations++;
    };
    const inspect = (value, path) => {
      if (Array.isArray(value)) { value.forEach((item, index) => inspect(item, `${path}[${index}]`)); return; }
      for (const [key, item] of entries(value)) {
        const field = `${path}.${key}`;
        if (PERSON_FIELDS.has(key)) add(item, field);
        if (PERSON_ARRAYS.has(key) && Array.isArray(item)) item.forEach((id, index) => add(id, `${field}[${index}]`));
        if (['actorStates', 'profiles', 'entities'].includes(key) && obj(item)) Object.keys(item).forEach(id => add(id, `${field}[${JSON.stringify(id)}]`));
        if (item && typeof item === 'object') inspect(item, field);
      }
    };
    for (const id of members) add(id, 'bundle.characterIds');
    inspect(session, sessionKey); inspect(baseRelations, 'baseRelations'); inspect(auditEntries, 'profileAudit');
    const summary = profile => ({ exists: !!profile, ownerBundleKeys: Array.isArray(profile?.ownerBundleKeys) ? clone(profile.ownerBundleKeys) : [],
      variantKeys: Object.keys(obj(profile?.variants) ? profile.variants : {}), category: String(profile?.category || '') });
    const belongs = (profile, id, entity = null) => !!profile && (mob(profile) || mob(entity)
      ? (profile.scopeOwnership?.scopeKey || entity?.scopeKey) === scope.scopeKey
      : (profile.ownerBundleKeys || []).length ? profile.ownerBundleKeys.includes(scope.sourceBundleKey) : members.has(id));
    const scopedProfile = (profile, id, entity = null) => {
      if (!belongs(profile, id, entity)) return null;
      try { return profileProject(profile, scope, mob(profile) || mob(entity)); }
      catch (error) { if (error?.code === 'MISSING_VARIANT') return null; throw error; }
    };
    const profiles = {}, entities = {}, referenceDetails = [];
    for (const [id, locations] of references) {
      const profileId = registry.entities[id]?.profileId || id;
      const profile = store.profiles[profileId];
      const entity = registry.entities[id] || registry.entities[profileId] || Object.values(registry.entities).find(value => value.profileId === profileId);
      const selected = scopedProfile(profile, profileId, entity);
      if (selected) {
        profiles[profileId] = selected;
        if (entity) entities[entity.id || profileId] = { ...pick(entity, ['id', 'profileId', 'name', 'aliases', 'category', 'source', 'sourceKinds']), ownerBundleKeys: [scope.sourceBundleKey], ...(mob(entity) ? { scopeKey: scope.scopeKey } : {}) };
      }
      const redirect = store.identityRedirects?.[id];
      referenceDetails.push({ id, profileId, locations, profile: summary(profile), includedProfile: !!selected,
        selectedBundleMember: members.has(profileId),
        registry: entity ? pick(entity, ['id', 'profileId', 'ownerBundleKeys', 'sourceBundleKey', 'scopeKey', 'category']) : null,
        redirect: obj(redirect) ? pick(redirect, ['profileId', 'sourceBundleKey']) : null,
        deletedEntries: entries(store.deletedProfiles).filter(([, value]) => value.profileId === profileId)
          .map(([key, value]) => ({ key, ...pick(value, ['sourceBundleKey', 'scopeKey', 'variantKey', 'variantOnly']), hasProfile: obj(value.profile), hasVariant: obj(value.variant) })) });
    }
    // Journal before-images can contain other variants. This diagnostic keeps
    // the selected snapshot, or ownership metadata when it cannot be scoped.
    for (const journal of session?.commitJournal || []) {
      for (const [id, profile] of entries(journal?.undo?.profiles)) {
        if (profile === null) continue;
        journal.undo.profiles[id] = scopedProfile(profile, id) || { id, diagnosticOmitted: 'profile_not_proven_in_selected_scope', ...summary(profile) };
      }
      for (const [id, entity] of entries(journal?.undo?.entities)) {
        if (entity !== null) journal.undo.entities[id] = pick(entity, ['id', 'profileId', 'category', 'ownerBundleKeys', 'sourceBundleKey', 'scopeKey']);
      }
    }
    const result = [
      { key: K.profiles, value: { ...pick(store, ['schemaVersion']), profiles, sourceBundles: bundle ? { [scope.sourceBundleKey]: bundle } : {}, baseRelations } },
      { key: K.registry, value: { ...pick(registry, ['schemaVersion']), entities } },
    ];
    if (session) result.push({ key: sessionKey, value: session });
    if (auditEntries.length) result.push({ key: K.audit, value: { schemaVersion: 1, entries: auditEntries } });
    const behindKey = `erosync_behind_v1:${scope.scopeKey}:${scope.variantKey}`;
    if (all.has(behindKey)) result.push({ key: behindKey, value: clone(all.get(behindKey)) });
    return { records: result, references: referenceDetails, omittedLocations };
  }
  return Object.freeze({ project, replace, validate, diagnoseProfileOwnership, progressVariant, sessionVariantFields: SESSION_VARIANT_FIELDS });
}

export function createErosyncBackupService(dependencies) {
  'use strict';
  const { codec, scopeTools, io } = dependencies;
  let lastYieldAt = Date.now();
  const yieldControl = async () => {
    if (typeof io.yieldControl === 'function') await io.yieldControl();
    else if (Date.now() - lastYieldAt >= 12) { await new Promise((resolve) => setTimeout(resolve, 0)); lastYieldAt = Date.now(); }
    if (typeof io.assertCurrent === 'function') io.assertCurrent();
  };
  const preparedImports = new WeakMap();
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const fail = (code) => { const error = new Error(code); error.code = code; throw error; };
  const rawString = (value) => codec.canonicalStringify(value);
  const clone = (value) => JSON.parse(rawString(value));
  const same = (left, right) => rawString(left) === rawString(right);
  const optionsFor = (kind, scope) => ({ expectedKind: kind, ...(kind === 'scoped-chat' ? { expectedScope: scope } : {}) });
  const recordsFrom = (envelope) => envelope.sections.flatMap((section) => section.records).map(clone);
  for (const method of ['exclusive', 'readRecords', 'transaction', 'readConfig', 'writeConfig', 'readRecovery', 'writeRecovery', 'invalidateCaches', 'markRecoveryRequired']) {
    if (typeof io?.[method] !== 'function') fail('BACKUP_IO_CONTRACT');
  }
  function checkedKind(kind, scope) {
    if (!['full-backup', 'scoped-chat'].includes(kind)) fail('BACKUP_KIND');
    if (kind === 'full-backup' && scope !== null) fail('BACKUP_SCOPE');
    if (kind === 'scoped-chat' && !plain(scope)) fail('BACKUP_SCOPE');
  }
  // Canonical raw JSON is used for integrity. projectRecords intentionally drops
  // sensitive/transient fields and must never stand in for a raw readback check.
  function recordsMap(records) {
    if (!Array.isArray(records) || records.length > codec.limits.maxRecords) fail('BACKUP_RECORDS');
    const map = new Map();
    for (const record of records) {
      if (!plain(record) || Object.keys(record).length !== 2 || !own(record, 'key') || !own(record, 'value') || map.has(record.key)) fail('BACKUP_RECORDS');
      codec.familyForKey(record.key);
      if (!plain(record.value)) fail('BACKUP_RECORDS');
      map.set(record.key, clone(record.value));
    }
    return map;
  }
  const sortedRecords = (map) => [...map].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => ({ key, value }));
  const normalizedRecords = (records) => sortedRecords(recordsMap(records));
  async function readAll() {
    const records = normalizedRecords(await io.readRecords());
    await yieldControl();
    return records;
  }
  function pruneExportBundleMemberships(records) {
    // Export-only: these are indexes of live profiles, not historical evidence.
    // Work on the already cloned projection; never rewrite storage, trash,
    // relationships or journal before-images to make a backup pass validation.
    const store = records.find(record => codec.familyForKey(record.key) === 'profiles')?.value;
    if (!plain(store?.profiles) || !plain(store?.sourceBundles)) return;
    const prune = bundle => {
      if (!plain(bundle) || !Array.isArray(bundle.characterIds)) return;
      bundle.characterIds = bundle.characterIds.filter(id => typeof id !== 'string' || own(store.profiles, id));
    };
    for (const bundle of Object.values(store.sourceBundles)) {
      prune(bundle);
      if (plain(bundle?.variants)) Object.values(bundle.variants).forEach(prune);
    }
  }
  function ordinarySettings(config) {
    if (!plain(config)) fail('BACKUP_CONFIG');
    return Object.fromEntries(codec.ordinarySettingKeys.filter((key) => own(config, key)).map((key) => [key, clone(config[key])]));
  }
  async function validateDesired(records) {
    recordsMap(records);
    scopeTools.validate(records);
    await yieldControl();
    if (typeof io.validateRecords === 'function') await io.validateRecords(clone(records));
  }
  async function pendingGuard() {
    const recovery = await io.readRecovery();
    if (recovery && (!plain(recovery) || recovery.schemaVersion !== 1 || !['prepared', 'applying', 'complete', 'cancelled', 'rolled_back', 'recovery_failed'].includes(recovery.phase))) fail('BACKUP_RECOVERY_REQUIRED');
    if (recovery && ['applying', 'recovery_failed'].includes(recovery.phase)) fail('BACKUP_RECOVERY_REQUIRED');
  }
  function writesFor(current, desired, keys = null) {
    const previous = recordsMap(current), next = recordsMap(desired);
    const targets = keys || [...new Set([...previous.keys(), ...next.keys()])].sort();
    return targets.flatMap((key) => {
      codec.familyForKey(key);
      if (!next.has(key)) return previous.has(key) ? [{ key, remove: true }] : [];
      if (previous.has(key) && same(previous.get(key), next.get(key))) return [];
      return [{ key, value: clone(next.get(key)) }];
    });
  }
  async function planned(envelope, current) {
    const incoming = recordsFrom(envelope);
    // Older backups predate the separate preset archive; absence is not deletion.
    if (envelope.kind === 'full-backup' && !incoming.some(record => record.key === 'erosync_profile_presets_v1')) {
      const archive = current.find(record => record.key === 'erosync_profile_presets_v1');
      if (archive) incoming.push(clone(archive));
    }
    await yieldControl();
    scopeTools.validate(incoming, envelope.kind === 'scoped-chat' ? envelope.scope : null);
    await yieldControl();
    const desired = normalizedRecords(envelope.kind === 'full-backup' ? incoming : scopeTools.replace(current, incoming, envelope.scope));
    await yieldControl();
    await validateDesired(desired);
    const writes = writesFor(current, desired);
    await yieldControl();
    const old = recordsMap(current);
    await yieldControl();
    const affectedRecords = writes.map((write) => ({ key: write.key, status: write.remove ? 'removed' : old.has(write.key) ? 'changed' : 'new' }));
    const base = await codec.preview(envelope);
    return {
      desired, writes,
      preview: {
        ...base,
        // These describe actual raw storage effects, including deletions and shared
        // scoped subtrees, rather than comparing whole global stores to projections.
        affectedRecords,
        changes: affectedRecords.map((record) => ({ ...record, section: codec.familyForKey(record.key) })),
        expectedWrites: writes.length,
        currentOnlyKeys: affectedRecords.filter((record) => record.status === 'removed').map((record) => record.key),
        changeCounts: {
          added: affectedRecords.filter((record) => record.status === 'new').length,
          changed: affectedRecords.filter((record) => record.status === 'changed').length,
          removed: affectedRecords.filter((record) => record.status === 'removed').length,
        },
      },
    };
  }
  async function saveRecovery(snapshot) {
    const copied = clone(snapshot);
    await yieldControl();
    await io.writeRecovery(copied);
    await yieldControl();
    const stored = await io.readRecovery();
    await yieldControl();
    if (!same(stored, snapshot)) fail('BACKUP_RECOVERY_READBACK');
    await yieldControl();
  }
  function validateRecovery(snapshot) {
    if (!plain(snapshot) || snapshot.schemaVersion !== 1 || !['prepared', 'applying', 'complete', 'cancelled', 'rolled_back', 'recovery_failed'].includes(snapshot.phase)) fail('BACKUP_RECOVERY_SHAPE');
    const before = normalizedRecords(snapshot.beforeRecords);
    if (!plain(snapshot.beforeConfig) || !Array.isArray(snapshot.targetKeys) || snapshot.targetKeys.length > codec.limits.maxRecords * 2 || new Set(snapshot.targetKeys).size !== snapshot.targetKeys.length) fail('BACKUP_RECOVERY_SHAPE');
    snapshot.targetKeys.forEach((key) => codec.familyForKey(key));
    if (before.some(({ key }) => !snapshot.targetKeys.includes(key))) fail('BACKUP_RECOVERY_SHAPE');
    clone(snapshot.beforeConfig);
    return { ...clone(snapshot), beforeRecords: before };
  }
  async function verifyRecords(expected, keys) {
    const actual = normalizedRecords(await io.readRecords([...keys]));
    await yieldControl();
    if (actual.some(({ key }) => !keys.includes(key))) fail('BACKUP_READBACK_SCOPE');
    if (!same(actual, normalizedRecords(expected).filter(({ key }) => keys.includes(key)))) fail('BACKUP_READBACK');
    await yieldControl();
  }
  async function rollback(snapshot) {
    const saved = validateRecovery(snapshot);
    await yieldControl();
    const before = recordsMap(saved.beforeRecords);
    await yieldControl();
    // Do not depend on a successful current read to start restoring known before-images.
    // Explicit removals also cover keys introduced before an interrupted transaction.
    const writes = saved.targetKeys.map((key) => before.has(key) ? { key, value: clone(before.get(key)) } : { key, remove: true });
    await yieldControl();
    await io.transaction('backup-rollback', writes);
    await io.writeConfig(clone(saved.beforeConfig));
    await verifyRecords(saved.beforeRecords, saved.targetKeys);
    if (!same(await io.readConfig(), saved.beforeConfig)) fail('BACKUP_CONFIG_READBACK');
    await saveRecovery({ ...saved, phase: 'rolled_back' });
    await io.invalidateCaches();
  }
  async function recoveryFailure(snapshot) {
    // Best effort updates never replace the original error with a provider message,
    // nor clear a raw before-image when rollback cannot be proven.
    try { await saveRecovery({ ...snapshot, phase: 'recovery_failed' }); } catch (_) { /* retained applying snapshot remains recoverable */ }
    try { await io.markRecoveryRequired('BACKUP_RECOVERY_FAILED'); } catch (_) { /* IO must persist its hook fence independently */ }
    fail('BACKUP_RECOVERY_FAILED');
  }
  async function exportBackup(kind, scope = null, includeSettings = true, report = null) {
    try {
      checkedKind(kind, scope);
      const selectedScope = clone(scope);
      return await io.exclusive('backup-export', async () => {
        await pendingGuard();
        // Apply the existing export-only projection before strict raw cloning:
        // optional undefined fields are omitted, while import/readback stays strict.
        // A chat export reads the whole store only to pick the selected chat out of it. The size limits of
        // a backup file apply to that chat, not to everything stored for every bot.
        const current = kind === 'scoped-chat' ? codec.projectRecords(await io.readRecords(), false, true)
          : normalizedRecords(codec.projectRecords(await io.readRecords()));
        pruneExportBundleMemberships(current);
        await yieldControl();
        try {
          // A chat's progress is stored per settings variant, and the selected variant has none until a turn
          // is committed in it. Export the variant that holds the progress while its profiles still exist;
          // otherwise export the selected variant without a session rather than failing.
          let exportScope = selectedScope, records = kind === 'scoped-chat' ? null : current, omittedVariant = '';
          if (kind === 'scoped-chat') {
            const held = scopeTools.progressVariant(current, selectedScope);
            if (held !== selectedScope.variantKey) {
              try {
                records = scopeTools.project(current, { ...selectedScope, variantKey: held });
                exportScope = { ...selectedScope, variantKey: held };
              } catch (error) {
                if (error?.code !== 'MISSING_VARIANT') throw error;
                omittedVariant = held;
              }
            }
            if (!records) records = scopeTools.project(current, selectedScope, { omitMissingSession: true });
          }
          await yieldControl();
          await validateDesired(records);
          const config = includeSettings ? ordinarySettings(await io.readConfig()) : null;
          if (report && typeof report === 'object') Object.assign(report, { variantKey: String(exportScope?.variantKey || ''), omittedProgressVariant: omittedVariant });
          return await codec.encode({ kind, scope: exportScope, records, ordinarySettings: config, createdAt: new Date().toISOString() });
        } catch (error) {
          if (['DANGLING_PROFILE', 'DANGLING_GOAL', 'MISSING_VARIANT'].includes(error?.code)
            || error?.code === 'SCOPE_MISMATCH' && /^SCOPE_MISMATCH: (?:historical )?profile owner /.test(String(error.message))) {
            try {
              const diagnostic = kind === 'scoped-chat' ? scopeTools.diagnoseProfileOwnership(current, selectedScope)
                : { records: current, references: [], omittedLocations: 0 };
              const payload = { format: 'erosync-export-diagnostic', schemaVersion: 1, pluginVersion: codec.pluginVersion,
                kind: `${kind}-diagnostic`, restorable: false, createdAt: new Date().toISOString(), scope: selectedScope,
                failure: { code: error.code, message: String(error.message).slice(0, 600) },
                omissionPolicy: kind === 'scoped-chat' ? 'portable-backup-redaction; foreign-profile-values-and-unselected-chat-variants-omitted'
                  : 'portable-backup-redaction; all-known-scopes; diagnostic-only', ...diagnostic };
              const checksum = await codec.sha256(payload);
              const text = JSON.stringify({ ...payload, checksum: { algorithm: 'SHA-256', value: checksum } }, null, 2);
              if (new TextEncoder().encode(text).length > codec.limits.maxBytes) fail('LIMIT_BYTES');
              await yieldControl();
              error.exportDiagnosticText = text;
            } catch (_) { /* Preserve the original failure if diagnosis cannot safely complete. */ }
          }
          throw error;
        }
      });
    } catch (error) {
      const failure = new Error(`BACKUP_EXPORT_FAILED: ${String(error?.message || error).slice(0, 600)}`);
      failure.code = 'BACKUP_EXPORT_FAILED';
      if (typeof error?.exportDiagnosticText === 'string') failure.exportDiagnosticText = error.exportDiagnosticText;
      throw failure;
    }
  }
  async function prepareImportWithReader(readText, kind, scope = null) {
    try {
      checkedKind(kind, scope);
      const selectedScope = clone(scope);
      return await io.exclusive('backup-preview', async () => {
        await pendingGuard();
        if (typeof readText !== 'function') fail('BACKUP_READER_INVALID');
        const text = await readText();
        await yieldControl();
        const envelope = await codec.decode(text, optionsFor(kind, selectedScope));
        const plan = await planned(envelope, await readAll());
        const metadata = typeof io.describeImport === 'function' ? clone(io.describeImport(envelope)) : null;
        const prepared = { kind, scope: selectedScope, preview: clone(plan.preview), ...(metadata ? { metadata } : {}) };
        preparedImports.set(prepared, { text, kind, scope: clone(selectedScope), signature: rawString(prepared) });
        return prepared;
      });
    } catch (error) {
      if (error?.code === 'DIAGNOSTIC_ONLY') throw error;
      fail('BACKUP_PREPARE_FAILED');
    }
  }
  async function prepareImport(text, kind, scope = null) {
    return await prepareImportWithReader(async () => text, kind, scope);
  }
  async function restore(prepared, { restoreSettings = false, confirm } = {}) {
    let trusted;
    try {
      trusted = preparedImports.get(prepared);
      if (!trusted || trusted.signature !== rawString(prepared) || typeof confirm !== 'function' || typeof restoreSettings !== 'boolean') fail('BACKUP_PREPARED_INVALID');
    } catch (_) { fail('BACKUP_PREPARED_INVALID'); }
    try { return await io.exclusive('backup-restore', async () => {
      let snapshot = null, applying = false;
      try {
        await pendingGuard();
        const envelope = await codec.decode(trusted.text, optionsFor(trusted.kind, trusted.scope));
        const current = await readAll();
        const beforeConfig = clone(await io.readConfig());
        if (!plain(beforeConfig)) fail('BACKUP_CONFIG');
        const plan = await planned(envelope, current);
        await yieldControl();
        const importedSettings = envelope.ordinarySettings;
        const desiredConfig = restoreSettings && importedSettings ? { ...beforeConfig, ...ordinarySettings(importedSettings) } : beforeConfig;
        snapshot = {
          schemaVersion: 1, phase: 'prepared',
          beforeRecords: current,
          targetKeys: [...new Set([...current.map(({ key }) => key), ...plan.desired.map(({ key }) => key)])].sort(),
          beforeConfig,
        };
        await saveRecovery(snapshot);
        const preview = { ...clone(plan.preview), restoreSettings, ordinarySettingsWillChange: !same(beforeConfig, desiredConfig) };
        if (await confirm(preview) !== true) {
          await saveRecovery({ ...snapshot, phase: 'cancelled' });
          return { status: 'cancelled', targetWrites: 0 };
        }
        // Even a foreign writer during a long confirmation must not invalidate the
        // saved snapshot and silently change the operation the user confirmed.
        if (!same(await readAll(), current) || !same(await io.readConfig(), beforeConfig)) fail('BACKUP_STALE_PREVIEW');
        snapshot = { ...snapshot, phase: 'applying' };
        await saveRecovery(snapshot);
        applying = true;
        if (plan.writes.length) await io.transaction('backup-restore', clone(plan.writes));
        await yieldControl();
        if (!same(beforeConfig, desiredConfig)) await io.writeConfig(clone(desiredConfig));
        await verifyRecords(plan.desired, snapshot.targetKeys);
        if (!same(await io.readConfig(), desiredConfig)) fail('BACKUP_CONFIG_READBACK');
        const finalRecords = await readAll();
        if (!same(finalRecords, plan.desired)) fail('BACKUP_READBACK');
        await yieldControl();
        await validateDesired(finalRecords);
        await saveRecovery({ ...snapshot, phase: 'complete' });
        await io.invalidateCaches();
        preparedImports.delete(prepared);
        return { status: 'restored', targetWrites: plan.writes.length, settingsRestored: !same(beforeConfig, desiredConfig), preview };
      } catch (_) {
        if (applying && snapshot) {
          try { await rollback(snapshot); } catch (_) { return await recoveryFailure(snapshot); }
          fail('BACKUP_RESTORE_ROLLED_BACK');
        }
        if (snapshot?.phase === 'applying') {
          // No target write has begun. Re-establish the proven prepared marker;
          // an uncertain local marker still requires the persistent recovery fence.
          try { await saveRecovery({ ...snapshot, phase: 'prepared' }); }
          catch (_) { return await recoveryFailure(snapshot); }
        }
        fail('BACKUP_RESTORE_FAILED');
      }
    }); } catch (error) {
      fail(['BACKUP_RESTORE_ROLLED_BACK', 'BACKUP_RECOVERY_FAILED'].includes(error?.code) ? error.code : 'BACKUP_RESTORE_FAILED');
    }
  }
  async function recoverPending() {
    try { return await io.exclusive('backup-recovery', async () => {
      let snapshot;
      try { snapshot = await io.readRecovery(); } catch (_) {
        try { await io.markRecoveryRequired('BACKUP_RECOVERY_FAILED'); } catch (_) { /* retained local marker */ }
        fail('BACKUP_RECOVERY_FAILED');
      }
      if (!snapshot) return { status: 'not-needed' };
      if (!plain(snapshot) || snapshot.schemaVersion !== 1 || !['prepared', 'applying', 'complete', 'cancelled', 'rolled_back', 'recovery_failed'].includes(snapshot.phase)) {
        try { await io.markRecoveryRequired('BACKUP_RECOVERY_FAILED'); } catch (_) { /* retain invalid marker */ }
        fail('BACKUP_RECOVERY_FAILED');
      }
      if (!['applying', 'recovery_failed'].includes(snapshot.phase)) return { status: 'not-needed' };
      try { await rollback(snapshot); } catch (_) { return await recoveryFailure(snapshot); }
      return { status: 'recovered' };
    }); } catch (_) { fail('BACKUP_RECOVERY_FAILED'); }
  }
  return Object.freeze({ exportBackup, prepareImport, prepareImportWithReader, restore, recoverPending });
}

export function createErosyncIdentityMatcher() {
  const genericNames = new Set([
    'director', 'executive director', 'general director', 'game director', 'gm', 'game master',
    'guild master', 'guildmaster', 'master', 'leader', 'guild leader', 'captain', 'commander',
    'chief', 'boss', 'king', 'queen', 'lord', 'lady', 'professor', 'teacher', 'doctor',
    'player', 'npc', 'user', 'character', 'person', 'unknown', 'none', 'null', 'undefined',
    'system', 'class', 'job', 'faction', 'guild', 'location', 'item', 'species', 'concept',
    'warrior', 'mage', 'wizard', 'archer', 'healer', 'assassin', 'berserker', 'warlord',
    'male', 'female', 'real life', 'reallife', 'in game', 'avatar',
    '디렉터', '총괄 디렉터', '게임 마스터', '길드 마스터', '길드장', '마스터', '수장',
    '대장', '단장', '관리자', '관리인', '선생님', '선생', '교수', '의사', '왕', '여왕',
    '플레이어', '주인공', '등장인물', '사용자', '인물', '시스템', '직업', '길드', '종족',
    '전사', '마법사', '궁수', '암살자', '미상', '없음', '남성', '여성', '현실', '아바타',
  ]);
  const nonpersonTypes = new Set(['role', 'job', 'class', 'faction', 'location', 'item', 'system', 'species', 'concept']);
  const list = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()) : typeof value === 'string' && value.trim() ? [value.trim()] : [];
  const unique = (values) => [...new Set(values)];
  const intersect = (left, right) => left.filter((value) => right.includes(value));
  const normalize = (value) => String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, '').replace(/[‘’]/g, "'")
    .replace(/[_\-‐‑‒–—]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^['"“”]+|['"“”]+$/g, '').trim();
  const isGeneric = (value) => {
    const token = normalize(value).replace(/^the\s+/, '');
    return !token || genericNames.has(token) || /^[\d\s.,]+$/.test(token)
      || /^(?:guild|game|executive|general|총괄|길드|게임)\s*(?:master|leader|director|마스터|장|디렉터)$/.test(token)
      || /^(?:(?:guild|game|executive|general)\s+)?(?:master|leader|director|captain|commander|chief|professor)\s+(?:of|for|at)\s+/.test(token)
      || /\s(?:길드장|총괄 디렉터|관리인)$/.test(token)
      || /^(?:phase|stage|form|version|페이즈|단계|형태)\s*\d+/.test(token);
  };
  function nameParts(value) {
    const raw = String(value || '').trim();
    if (!raw || raw.length > 180 || /[{}<>\[\]\\|=]/.test(raw)
      || /^(?:img|image|asset|portrait|expression)[_:]/i.test(raw)) return [];
    const parts = [raw];
    const parenthetical = /[（(]([^()（）]{1,120})[)）]/g;
    let match;
    while ((match = parenthetical.exec(raw))) {
      if (!/^(?:phase|stage|form|version|페이즈|단계|형태)\s*\d+/i.test(match[1].trim())) parts.push(match[1]);
    }
    // A form/phase suffix is meaningful. Do not strip it to create a new name.
    if (!/[（(]\s*(?:phase|stage|form|version|페이즈|단계|형태)\s*\d+/i.test(raw)) parts.push(raw.replace(parenthetical, ' ').trim());
    return unique(parts.map(normalize).filter((token) => !isGeneric(token)));
  }
  function tokens(candidate) {
    if (typeof candidate === 'string') return nameParts(candidate);
    return unique([candidate?.name, ...list(candidate?.aliases)].flatMap(nameParts));
  }
  function ownerKeys(candidate) {
    return unique([...list(candidate?.ownerBundleKeys), ...list(candidate?.sourceBundleKey), ...list(candidate?.botId)]);
  }
  const evidenceText = (candidate) => unique([...list(candidate?.evidence), ...list(candidate?.identityEvidence), ...list(candidate?.personEvidence)]);
  function activeText(document) {
    if (!document || document.active === false || document.enabled === false || document.disabled === true
      || document.isActive === false || document.inactive === true || document.activationResolved === false) return '';
    if (document.text === undefined && document.alwaysActive === false && document.active !== true && document.activationResolved !== true) return '';
    const value = String(document.text ?? document.content ?? '');
    // A raw conditional is not an evaluated active source, even inside a quote.
    if (/\{\{/.test(value)) return '';
    return value;
  }
  function parseLinks(text, documentId, title) {
    const links = [];
    const add = (names, evidence) => {
      const parts = unique(names.flatMap(nameParts));
      if (parts.length >= 2) links.push({ names: parts, documentId: String(documentId || ''), evidence: String(evidence).slice(0, 500) });
    };
    // A named translation dictionary is an explicit correspondence, not an
    // invitation to treat arbitrary JSON keys or image commands as people.
    try {
      const wrapped = text.match(/(?:^|\n)(?:content|text|data):\s*(\{[\s\S]*\})\s*$/);
      const parsed = JSON.parse(wrapped ? wrapped[1] : text);
      if (parsed && typeof parsed.kor_to_eng === 'object' && !Array.isArray(parsed.kor_to_eng)) {
        for (const [name, alias] of Object.entries(parsed.kor_to_eng || {})) if (typeof alias === 'string') add([name, alias], `${name} = ${alias}`);
      }
    } catch (_) { /* ordinary prose */ }
    if (/(?:real\s*name\s*mapping|character\s*(?:name\s*)?mapping|name\s*mapping|이름\s*매칭|이름\s*대응|실명\s*대응)/i.test(`${title || ''}\n${text}`)) {
      const mapping = /(?:^|[,;\n]|:\s*|only:\s*)\s*['"]?([\p{L}\p{N}][\p{L}\p{N}\s.'’_-]{0,100}?)['"]?\s*(?:=|→|->|['"]:\s*['"])\s*['"]?([\p{L}\p{N}][\p{L}\p{N}\s.'’_-]{0,100}?)(?=['"]|[,;\n.]|$)/gu;
      let match;
      while ((match = mapping.exec(text))) add([match[1], match[2]], match[0].trim());
    }
    // Keep the two identity fields in one local entry/paragraph. Never connect
    // two unrelated names merely because they occur in the same document.
    for (const paragraph of text.split(/\n\s*\n|(?=^#{1,4}\s)/m)) {
      const field = /(?:^|[,;\n])\s*(?:[-*]\s*)?(?:Erencha\s+)?(nickname|real\s*name|닉네임|실명)\s*[:：]\s*([^,;\n]{1,120})/gi;
      const fields = [];
      let match;
      while ((match = field.exec(paragraph))) fields.push({ label: match[1].toLowerCase(), value: match[2].trim(), at: match.index });
      for (let index = 0; index + 1 < fields.length; index++) {
        const previous = fields[index];
        const current = fields[index + 1];
        const previousReal = /real|실명/.test(previous.label);
        const currentReal = /real|실명/.test(current.label);
        if (previousReal !== currentReal && current.at - previous.at < 240) {
          add([previous.value, current.value], paragraph.slice(previous.at, current.at + current.value.length + current.label.length + 4).trim());
          index++;
        }
      }
    }
    return links;
  }
  function evidenceLinks(documents) {
    const output = [];
    for (const document of Array.isArray(documents) ? documents : []) {
      const text = activeText(document);
      if (!text) continue;
      output.push(...parseLinks(text, document.id, document.title || document.name || document.comment || document.label));
    }
    const seen = new Set();
    return output.filter((link) => { const key = `${link.documentId}:${[...link.names].sort().join('|')}`; if (seen.has(key)) return false; seen.add(key); return true; });
  }
  function declaredRealNames(candidate) {
    const output = [...list(candidate?.realName), ...list(candidate?.realNames), ...list(candidate?.identity?.realName)];
    for (const text of evidenceText(candidate)) {
      if (/\{\{/.test(text)) continue;
      const expression = /(?:^|[,;\n])\s*(?:[-*]\s*)?(?:real\s*name|실명)\s*(?:[:：]\s*|\s+)([^,;\n.]{1,100})/gi;
      let match;
      while ((match = expression.exec(text))) output.push(match[1]);
    }
    return unique(output.flatMap(nameParts));
  }
  function evidenceFor(candidate, options) {
    return [...(options.links || evidenceLinks(options.documents)), ...evidenceText(candidate).filter((text) => !/\{\{/.test(text)).flatMap((text) => parseLinks(text, '', ''))];
  }
  function compare(left, right, options = {}) {
    const a = left || {};
    const b = right || {};
    const aMetadata = options._identityMetadata?.get(a);
    const bMetadata = options._identityMetadata?.get(b);
    const aTokens = aMetadata?.tokens || tokens(a);
    const bTokens = bMetadata?.tokens || tokens(b);
    const sharedTokens = intersect(aTokens, bTokens);
    const evidence = [];
    const conflicts = [];
    const result = (decision, reason) => ({ decision, reason, evidence: unique(evidence), sharedTokens, conflicts: unique(conflicts) });
    const aOwners = aMetadata?.owners || ownerKeys(a);
    const bOwners = bMetadata?.owners || ownerKeys(b);
    if (aOwners.length && bOwners.length && !intersect(aOwners, bOwners).length) {
      conflicts.push('owner_scope_mismatch');
      return result('distinct', '소유 봇이 서로 다릅니다.');
    }
    if (options.sourceBundleKey && [aOwners, bOwners].some((owners) => owners.length && !owners.includes(options.sourceBundleKey))) {
      conflicts.push('outside_requested_scope');
      return result('distinct', '현재 봇 범위를 벗어난 프로필입니다.');
    }
    const aType = a.entityVerdict?.entityType || a.entityType;
    const bType = b.entityVerdict?.entityType || b.entityType;
    if (nonpersonTypes.has(aType) || nonpersonTypes.has(bType) || a.isPerson === false || b.isPerson === false) {
      conflicts.push('nonperson_candidate');
      return result('distinct', '직업·역할·집단 등 인물이 아닌 후보가 포함됩니다.');
    }
    if (list(a.distinctFromIds || a.identityDistinctIds).includes(String(b.id || '')) || list(b.distinctFromIds || b.identityDistinctIds).includes(String(a.id || ''))) {
      conflicts.push('explicitly_distinct');
      return result('distinct', '서로 다른 인물이라는 명시 기록이 있습니다.');
    }
    if (a.identityKey && b.identityKey && a.identityKey !== b.identityKey) {
      conflicts.push('identity_key_conflict');
      return result('distinct', '명시된 인물 식별자가 서로 다릅니다.');
    }
    if (!aTokens.length || !bTokens.length) return result('distinct', '비교할 고유 인물 이름이 없습니다.');
    const links = [...(aMetadata?.links || evidenceFor(a, options)), ...(bMetadata?.links || evidenceFor(b, options))];
    const aReal = aMetadata?.realNames || declaredRealNames(a);
    const bReal = bMetadata?.realNames || declaredRealNames(b);
    const script = (value) => /[가-힣]/.test(value) ? 'hangul' : /[a-z]/.test(value) ? 'latin' : 'other';
    const coveredByLink = (first, second) => links.some((link) => intersect(link.names, first).length && intersect(link.names, second).length);
    for (const kind of ['hangul', 'latin', 'other']) {
      const first = aReal.filter((name) => script(name) === kind);
      const second = bReal.filter((name) => script(name) === kind);
      if (first.length && second.length && !intersect(first, second).length && !coveredByLink(first, second)) conflicts.push('real_name_conflict');
    }
    if (conflicts.length) {
      const connected = sharedTokens.length || coveredByLink(aTokens, bTokens) || (a.identityKey && a.identityKey === b.identityKey);
      return result(connected ? 'review' : 'distinct', connected ? '같은 별칭을 사용하지만 명시된 실명이 다릅니다.' : '명시된 실명이 다른 인물입니다.');
    }
    if (a.identityKey && a.identityKey === b.identityKey) {
      evidence.push(`동일 인물 식별자: ${a.identityKey}`);
      return result('merge', '같은 명시 인물 식별자를 사용합니다.');
    }
    const sharedRealNames = unique([...intersect(aReal, bReal), ...intersect(aReal, bTokens), ...intersect(bReal, aTokens)]);
    if (sharedRealNames.length) {
      evidence.push(`명시된 실명 일치: ${sharedRealNames.join(', ')}`);
      return result('merge', '명시된 실명이 다른 후보의 실명 또는 이름과 일치합니다.');
    }
    // Link endpoints must add evidence beyond a single shared nickname.
    for (const link of links) {
      const first = intersect(link.names, aTokens);
      const second = intersect(link.names, bTokens);
      if (first.length && second.length && unique([...first, ...second]).length >= 2) evidence.push(`${link.documentId ? `${link.documentId}: ` : ''}${link.evidence}`);
    }
    if (evidence.length) return result('merge', '실명·닉네임·표기 대응이 자료에 명시되어 있습니다.');
    const aPrimary = nameParts(a.name);
    const bPrimary = nameParts(b.name);
    const aAliases = list(a.aliases).flatMap(nameParts);
    const bAliases = list(b.aliases).flatMap(nameParts);
    const crossAliases = unique([...intersect(aPrimary, bAliases), ...intersect(bPrimary, aAliases)]);
    if (sharedTokens.length >= 2) {
      evidence.push(`공유 이름·별칭: ${sharedTokens.join(', ')}`);
      return result('merge', '두 개 이상의 이름·별칭이 정확히 일치합니다.');
    }
    if (crossAliases.length && !intersect(aPrimary, bPrimary).length) {
      evidence.push(`별칭과 대표 이름의 명시 연결: ${crossAliases.join(', ')}`);
      return result('merge', '한 후보의 명시 별칭이 다른 후보의 대표 이름입니다.');
    }
    const sharedDocuments = intersect(list(a.sourceDocumentIds), list(b.sourceDocumentIds));
    if (sharedTokens.length && a.id && a.id === b.id && normalize(a.name) === normalize(b.name) && sharedDocuments.length) {
      evidence.push(`동일 후보 ID와 이름, 동일 자료: ${sharedDocuments.join(', ')}`);
      return result('merge', '같은 자료에서 같은 식별자와 이름으로 반복 발견된 후보입니다.');
    }
    if (sharedTokens.length) {
      evidence.push(`단일 공유 이름·별칭: ${sharedTokens.join(', ')}`);
      if (!intersect(aPrimary, bPrimary).length && !crossAliases.length) conflicts.push('ambiguous_shared_alias');
      return result('review', '이름 또는 별칭 하나만 같아 동명이인 여부를 확인해야 합니다.');
    }
    return result('distinct', '동일 인물이라는 명시 이름 연결이 없습니다.');
  }
  function groups(candidates, options = {}) {
    const entries = Array.isArray(candidates) ? candidates : [];
    const prepared = { ...options, links: options.links || evidenceLinks(options.documents) };
    // One analysis-local cache; never reuse it after aliases or source facts change.
    prepared._identityMetadata = new Map(entries.map(candidate => [candidate, {
      tokens: tokens(candidate), owners: ownerKeys(candidate),
      realNames: declaredRealNames(candidate), links: evidenceFor(candidate, prepared),
    }]));
    const edges = [];
    const reviews = [];
    const conflicts = [];
    const adjacency = entries.map(() => []);
    const pairs = new Map();
    for (let left = 0; left < entries.length; left++) {
      for (let right = left + 1; right < entries.length; right++) {
        const comparison = compare(entries[left], entries[right], prepared);
        const pair = { indices: [left, right], ids: [String(entries[left]?.id || ''), String(entries[right]?.id || '')], ...comparison };
        pairs.set(`${left}:${right}`, pair);
        if (comparison.decision === 'merge') { edges.push(pair); adjacency[left].push(right); adjacency[right].push(left); }
        else if (comparison.decision === 'review') reviews.push(pair);
        if (comparison.conflicts.length && (comparison.sharedTokens.length || comparison.conflicts.includes('explicitly_distinct'))) conflicts.push(pair);
      }
    }
    const output = [];
    const visited = new Set();
    for (let start = 0; start < entries.length; start++) {
      if (visited.has(start)) continue;
      const indices = [];
      const pending = [start];
      visited.add(start);
      while (pending.length) {
        const index = pending.pop();
        indices.push(index);
        for (const neighbor of adjacency[index]) if (!visited.has(neighbor)) { visited.add(neighbor); pending.push(neighbor); }
      }
      indices.sort((a, b) => a - b);
      if (indices.length < 2) continue;
      // Decide on the entire connected component before merging anything.
      // This prevents A--B--C from merging A/C despite conflicting real names,
      // owner scopes or explicit distinct-person records, independent of order.
      const internalConflicts = [];
      for (let first = 0; first < indices.length; first++) for (let second = first + 1; second < indices.length; second++) {
        const pair = pairs.get(`${indices[first]}:${indices[second]}`);
        if (pair.conflicts.length) internalConflicts.push(pair);
      }
      const scoped = indices.map((index) => ownerKeys(entries[index])).filter((owners) => owners.length);
      if (scoped.length && !scoped.reduce((common, owners) => intersect(common, owners)).length) internalConflicts.push({ conflicts: ['transitive_scope_conflict'], reason: '전체 연결 인물에게 공통인 소유 봇이 없습니다.' });
      const group = {
        indices,
        ids: indices.map((index) => String(entries[index]?.id || '')),
        evidence: unique(edges.filter((edge) => edge.indices.every((index) => indices.includes(index))).flatMap((edge) => edge.evidence)),
        reason: '명시 이름·별칭 연결로 같은 인물이 확인됩니다.',
      };
      if (internalConflicts.length) {
        reviews.push({ ...group, decision: 'review', reason: '별칭 연결망 안에 충돌이 있어 자동 통합하지 않습니다.', conflicts: unique(internalConflicts.flatMap((pair) => pair.conflicts)), blocked: true });
      } else output.push(group);
    }
    return { groups: output, reviews, conflicts };
  }
  return Object.freeze({ tokens, compare, groups, evidenceLinks });
}
