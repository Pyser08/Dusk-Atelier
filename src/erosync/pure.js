// addon-rebuild 4단계: Erosync 엔진에서 떼어 낸 순수 조각(상수·값 정리·자료 변환·제공자 요청 모양 등).
// 엔진 상태(저장소·api·실행 중 상태)를 쓰지 않는 것만 원본 erosync.js 순서·글자 그대로 옮겼다(tools 없이 eslint-scope로 자동 판정).
// 고칠 때는 이 파일을 고친다. 주제별로 더 나누는 건 다음 조각에서.
import { AXIS_KEYS, AXIS_SCALAR_KEYS, AXIS_DEFINITIONS, AXIS_OVERLAP_RULES, SEX_AXIS_KEYS, SEX_AXIS_SCALAR_KEYS, SEX_MOTIVE_TYPES, SEX_AXIS_COMMON_RULES, SEX_AXIS_OVERLAP_RULES, SEX_AXIS_DEFINITIONS, SEX_MOTIVE_DEFINITIONS, axisValueOf } from "./axes.js";
import { PROMPT_TEXT_LIMIT, PROMPT_BRANCHES, PROMPT_PAGES, PROMPT_SECTION_INDEX, PROMPT_PAGE_INDEX, PROMPT_TEXT, PROMPT_DIRECTOR_IDS } from "./prompts.js";

export const VERSION = '0.9.1';

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

export const LOG_PREFIX = '[Erosync]';

export const SETTINGS_UI_ID = 'erosync-settings';

export const LOCAL_CONFIG_KEY = 'erosync_local_config_v3';

export const RESTORE_RECOVERY_KEY = 'erosync_restore_recovery_v1';

export const RESTORE_META_KEY = 'erosync_restore_meta_v1';

export const IDENTITY_SCOPE_BACKUP_PREFIX = 'erosync_identity_scope_backup_v1:';

export const PROFILE_STORE_KEY = 'erosync_profiles_v3';

export const PROFILE_PRESET_KEY = 'erosync_profile_presets_v1';

export const REGISTRY_STORE_KEY = 'erosync_character_registry_v3';

export const SESSION_KEY_PREFIX = 'erosync_session_v3:';

export const SCOPE_CATALOG_KEY = 'erosync_scope_catalog_v1';

export const BOT_OVERRIDE_STORE_KEY = 'erosync_bot_overrides_v1';

export const PROFILE_AUDIT_KEY = 'erosync_profile_audit_v1';

export const BEHIND_KEY_PREFIX = 'erosync_behind_v1:';

export const STATE_TX_KEY = 'erosync_state_tx_v1';

export const STORAGE_MANIFEST_KEY = 'erosync_storage_manifest_v1';

export const LEGACY_PROFILE_STORE_KEY = 'erosync_character_profiles_v1';

export const LEGACY_SESSION_PREFIX = 'erosync_chat_state_v1:';

export const INJECTION_START = '[EROSYNC_TURN_V4]';

export const INJECTION_END = '[/EROSYNC_TURN_V4]';

export const SCHEMA_VERSION = 7;

export const COMMIT_JOURNAL_LIMIT = 40;

export const COMMIT_UNDO_DEPTH = COMMIT_JOURNAL_LIMIT;

export const SCOPE_CATALOG_SCHEMA = 2;

export const PROFILE_VERIFIER_VERSION = 2;

export const SOURCE_INVENTORY_SCHEMA = 2;

export const DEVELOPMENT_SCHEMA = 1;

export const DEFAULT_SCENE_PROMPT_CHARS = 80000;

export const MAX_SCENE_PROMPT_CHARS = 300000;

export const MAX_INJECTION_CHARS = 7000;

export const MAX_PROFILE_CHARACTERS = 2000;

export const DEFAULT_SCENE_CANDIDATES = 12;

export const MAX_SCENE_CANDIDATES = 40;

export const MAX_ACTIONS_PER_TURN = 10;

export const MAX_SOURCE_DOCUMENTS = 10000;

export const MAX_DISCOVERY_BATCHES = 10000;

export const MAX_PROFILE_BATCHES = 2000;

export const PROFILE_DISCOVERY_OUTPUT_LIMIT = 80;

export const EXTERNAL_CONTEXT_MAX_ITEMS = 80;

export const MAIN_REQUEST_DEADLINE_MS = 5000;

export const MAX_PENDING_MAIN_CONTEXTS = 64;

export const ANALYSIS_EXECUTION_HISTORY_LIMIT = 20;

export const ANALYSIS_EXECUTION_RESULT_LIMIT = 200;

export const ANALYSIS_EXECUTION_FIELD_LIMIT = 64;

export const ANALYSIS_EXECUTION_RESULT_BYTES = 192 * 1024;

export const PROVIDER_DEFS = Object.freeze({
  risu: {
    label: 'RisuAI 보조 모델',
    endpoint: '',
    model: '',
    apiFormat: 'risu',
  },
  openai: {
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/responses',
    model: 'gpt-5.4-mini',
    apiFormat: 'openai_responses',
  },
  claude: {
    label: 'Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-6',
    apiFormat: 'claude',
  },
  openrouter: {
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: '',
    apiFormat: 'openai_chat',
  },
  llmgateway: {
    label: 'LLM Gateway',
    endpoint: 'https://api.llmgateway.io/v1/chat/completions',
    model: '',
    apiFormat: 'openai_chat',
  },
  vercel: {
    label: 'Vercel AI Gateway',
    endpoint: 'https://ai-gateway.vercel.sh/v1/chat/completions',
    model: '',
    apiFormat: 'openai_chat',
  },
  neuralwatt: {
    label: 'NeuralWatt',
    endpoint: 'https://api.neuralwatt.com/v1/chat/completions',
    model: '',
    apiFormat: 'openai_chat',
  },
  // The request format follows the model in use: see resolveOpenCodeGoProfile.
  opencode_go: {
    label: 'OpenCode Go',
    endpoint: 'https://opencode.ai/zen/go/v1/chat/completions',
    model: '',
    apiFormat: 'auto',
  },
  vertex: {
    label: 'Vertex AI',
    endpoint: '',
    model: 'gemini-3-flash-preview',
    apiFormat: 'vertex',
  },
  copilot: {
    label: 'GitHub Copilot',
    endpoint: 'https://api.githubcopilot.com/chat/completions',
    model: 'gpt-4.1',
    apiFormat: 'openai_chat',
  },
  ollama: {
    label: 'Ollama 로컬',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    model: '',
    apiFormat: 'openai_chat',
  },
  ollama_cloud: {
    label: 'Ollama Cloud',
    endpoint: 'https://ollama.com/api/chat',
    model: '',
    apiFormat: 'ollama_chat',
  },
  custom: {
    label: 'Custom',
    endpoint: '',
    model: '',
    apiFormat: 'openai_chat',
  },
});

export const COMMON_PROFILE_DEFAULTS = Object.freeze({
  apiKey: '',
  endpoint: '',
  model: '',
  apiFormat: 'openai_chat',
  temperature: '',
  maxTokens: 5000,
  timeoutSeconds: 120,
  retryCount: 0,
  reasoningEffort: '',
  thinkingTokens: 0,
  claudeThinkingMode: 'off',
  serviceTier: '',
  region: 'global',
  projectId: '',
  serviceAccountJson: '',
  extraHeadersJson: '',
  extraBodyJson: '',
  pdfInput: false,
  openRouterReferer: '',
  openRouterTitle: 'Erosync',
  webSearch: false, // 웹 검색(2026-10-15): 검색 도구가 있는 제공자(OpenAI Responses·Claude·Vertex AI·OpenRouter)에서 인물 분석에만 쓴다
});

export function createDefaultProviderProfiles() {
  const profiles = {};
  for (const [id, definition] of Object.entries(PROVIDER_DEFS)) {
    profiles[id] = {
      ...COMMON_PROFILE_DEFAULTS,
      endpoint: definition.endpoint,
      model: definition.model,
      apiFormat: definition.apiFormat,
    };
  }
  return profiles;
}

export const DEFAULT_CONFIG = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  enabled: true,
  mode: 'normal',
  provider: 'risu',
  profileProvider: 'inherit',
  directorProvider: 'inherit',
  profileModel: '',
  directorModel: '',
  behindProvider: 'inherit',
  behindModel: '',
  behindLanguage: 'ko',
  risuAllowPluginModels: false,
  profilePreparationMode: 'full',
  progressiveFollowUp: true, // 점진 분석 후속(2026-10-31, Erosync.Progressive-Followup.Work-Plan.md): 응답 뒤 장면 인물의 로어·모듈을 찾아 한 턴에 한 명 분석
  sceneInterventionLevel: 'strict',
  profileAuditLimit: 20,
  behindEnabled: false,
  behindUseSeparateModel: false,
  frequency: 55,
  autonomy: 70,
  goalPersistence: 70,
  cooldownTurns: 2,
  maxActorsPerTurn: 2,
  recentMessages: 14,
  scenePromptMaxChars: DEFAULT_SCENE_PROMPT_CHARS,
  sceneCandidateLimit: DEFAULT_SCENE_CANDIDATES,
  maxEvents: 300,
  recordHistoryLimit: 1800,
  analysisSourceChunkChars: 12000,
  analysisProfileBatchChars: 22000,
  analysisCharactersPerBatch: 4,
  analysisMaxSourceChars: 0,
  autoVerifyCharacters: true,
  verificationBatchSize: 12,
  autoRefreshProfiles: false,
  developmentMode: 'standard_auto',
  developmentMinEvidence: 4,
  developmentMinScenes: 3,
  developmentAutoConfidence: 90,
  developmentStepScale: 1, // 성격 변화 폭 배수(2026-10-23, Erosync.Development-Scale.Work-Plan.md): 한 번 반영 폭에 곱한다
  developmentSexualStepScale: 1, // 성적 축 넷에만 더 곱한다
  preferenceChangeMode: 'auto',
  preferenceChangePace: 'standard',
  preferenceMinEvidence: 2,
  preferenceMinScenes: 1,
  preferenceMinConfidence: 80,
  cycleEnabled: true, // 생리 주기 사용(2026-10-13 사용자 건의): 끄면 판단·응답·목표 보정·주기 상태·프로필 칸이 모두 쉼, 저장된 주기 자료는 그대로
  cycleDisplay: true,
  cycleGoalInfluence: true,
  cycleMaxAdjustment: 5,
  cycleAmplitude: 'normal',
  compatibilityMode: 'context_only',
  externalContextMaxChars: 8000,
  debug: true,
  advancedOpen: true,
  emergencyReplanSeconds: 30, // 긴급 판단 대기(2026-10-13): 0(끄기) | 15 | 30 | 60초 | −1(무제한) — 동작 설정이라 백업 일반 설정에 들어감
  // UI 대개편(이 기기 화면 설정): 이펙트·소리·소리 크기·인트로·휴대폰 간편 모드·프로필 사진 제외 단어
  uiEffects: true,
  uiSound: true,
  uiSoundVolume: 60,
  introMode: 'first',
  mobileSimple: true,
  portraitExcludeWords: '',
  uiScale: 'auto', // 화면 배율(2026-10-12): 'auto'(= 100%) | '1.25' | '1.5'
  uiNetGalaxy: true, // 관계망 은하 몸체(2026-10-13)
  uiNetMotion: true, // 관계망 움직임(은하 회전·숨결·반짝임)
  uiNetAmbient: true, // 관계망 배경음
  uiNetStars: true, // 관계망 배경 별(2026-10-13 3판, 먼 별 두 겹)
  uiNetPiano: true, // 관계망 배경음 2단(2026-10-15, 270명부터)
  uiNetSeen: { galaxy: 0, motion: 0, ambient: 0, piano: 0 }, // 관계망 은하·움직임·배경음·2단을 관계망에서 본 적(0 아직 · 1 봤음 · 2 설정 화면에도 보임) — 이 기기 설정
  uiWorkPanel: 'chat', // 작동 표시(2026-10-13): 'chat'(채팅 패널) | 'screen'(화면 패널) | 'off'
  uiWorkPanelPos: null, // 화면 패널을 옮긴 자리 { x, y }(화면 크기에 대한 비율 0~1), 없으면 오른쪽 위
  uiWorkPanelShown: true, // 채팅 메뉴 "에로싱크 패널"로 패널 보임/안 보임(방식은 그대로)
  promptOverrides: {}, // 지시문 덮어쓰기(2026-10-15): 칸 id → {common|sfw|nsfw|plus: 글}. 동작 설정(백업 포함)
  promptPresets: [], // 지시문 프리셋 [{name, overrides}](백업 포함)
  promptPresetName: '', // 지금 불러온 프리셋 이름(백업 포함)
  promptCardOrder: [], // 프롬프트 화면 카드 순서(이 기기)
  providers: createDefaultProviderProfiles(),
});

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

export function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function clampNumber(value, fallback = 0, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

export function clampInt(value, fallback, min, max) {
  const number = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

export function optionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toText(value) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function truncate(value, maxChars) {
  const text = toText(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 24))}\n...[truncated]`;
}

export function normalizeStringList(value, maxItems = 12, maxChars = 300) {
  const input = Array.isArray(value) ? value : (value ? [value] : []);
  const result = [];
  for (const item of input) {
    let source = item;
    if (typeof item !== 'string') {
      try { source = JSON.stringify(item); } catch (_) { source = ''; }
    }
    const text = truncate(source, maxChars).trim();
    if (!text || result.includes(text)) continue;
    result.push(text);
    if (result.length >= maxItems) break;
  }
  return result;
}

// ---------- 기록의 연속성(2026-10-29, Erosync.Pair-Contact.Work-Plan.md) ----------
// 관계 메모는 최신 것을 남긴다: normalizeStringList는 앞에서부터 maxItems까지만 남겨서 30개가 차면 새 메모가 버려지고 판단에는 가장 오래된 8개만 갔다.
export function latestStringList(value, maxItems = 12, maxChars = 300) {
  const list = normalizeStringList(value, Number.MAX_SAFE_INTEGER, maxChars);
  const limit = Math.max(0, Number.isFinite(Number(maxItems)) ? Math.floor(Number(maxItems)) : 12);
  return limit > 0 && list.length > limit ? list.slice(-limit) : list;
}

// 마지막 실제 접촉(pairContact): 후보 인물 안에서 저장된 성적 목표 대상이나 활성 목표가 있는 방향 짝(행동 인물 → 대상; SFW는 목표 짝만)마다
// 두 사람 사이 마지막으로 실제 실행된 행동(두 방향 모두, 당신이 한 행동 포함)과 장부의 횟수(실제·부분·무시)·첫 턴을 한 줄로 보낸다. 기록 본문은 보내지 않는다.
export const PAIR_CONTACT_LIMIT = 24;

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

export function safeClone(value) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch (_) {}
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
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

export function fnv1a(text) {
  let hash = 2166136261;
  const input = String(text ?? '');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function safeKeyPart(value, fallback = 'unknown') {
  const normalized = String(value ?? '').trim().toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);
  return normalized || fallback;
}

export function mergeProviderProfile(providerId, value) {
  const definition = PROVIDER_DEFS[providerId] || PROVIDER_DEFS.custom;
  const source = isPlainObject(value) ? value : {};
  return {
    ...COMMON_PROFILE_DEFAULTS,
    endpoint: definition.endpoint,
    model: definition.model,
    apiFormat: definition.apiFormat,
    ...source,
    timeoutSeconds: clampInt(source.timeoutSeconds, 120, 15, 600),
    retryCount: clampInt(source.retryCount, 0, 0, 3),
    pdfInput: source.pdfInput === true,
    maxTokens: clampInt(source.maxTokens, 5000, 256, 100000),
    thinkingTokens: clampInt(source.thinkingTokens, 0, 0, 100000),
    webSearch: source.webSearch === true,
    model: String(source.model ?? definition.model ?? '').trim(), // 모델 ID 앞뒤 공백 제거(2026-10-15)
  };
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

export const ANALYSIS_WORKFLOWS = Object.freeze(['roster', 'selected_lore', 'full']);

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

export const RELATION_CHANGE_FIELDS = Object.freeze(['affection', 'eroticAttraction', 'hatred']);

export function parseRelationChangeMultiplier(value) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') return null;
  const number = Number(value), tenths = Math.round(number * 10);
  if (!Number.isFinite(number) || number < 0 || number > 3 || Math.abs(number * 10 - tenths) > 1e-8) return null;
  return tenths / 10;
}

export function normalizeRelationChangeMultipliers(value) {
  return Object.fromEntries(RELATION_CHANGE_FIELDS.map(field => [field, parseRelationChangeMultiplier(value?.[field]) ?? 1]));
}

export function relationChangePlanningSettings(botOverride) {
  const values = normalizeRelationChangeMultipliers(botOverride?.relationChangeMultipliers);
  if (botOverride?.domains?.conflict !== true) values.hatred = 1;
  return RELATION_CHANGE_FIELDS.some(field => values[field] !== 1) ? values : null;
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

export function normalizeContentMode(value) {
  return value === 'sfw' ? 'sfw' : 'nsfw';
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

// 수위 상한을 적용한 극단성. 값이 없거나 수위가 "사용 안 함"이면 undefined(보내지 않음).
export function cappedExtremity(value, policy) {
  if (!Number.isFinite(value) || !policy || policy.extremityCap === null) return undefined;
  return Math.min(Math.round(value), policy.extremityCap);
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

export function parseJsonRecord(text, fallback = {}) {
  const value = String(text || '').trim();
  if (!value) return { ...fallback };
  const parsed = JSON.parse(value);
  if (!isPlainObject(parsed)) throw new Error('JSON value must be an object');
  return parsed;
}

export function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => { if (timer) clearTimeout(timer); });
}

export function extractJsonObject(text) {
  const source = String(text || '').trim();
  if (!source) throw new Error('empty JSON response');
  const candidates = [source];
  for (const match of source.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) candidates.push(match[1].trim());
  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
      const character = source[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === '{') depth += 1;
      else if (character === '}') {
        depth -= 1;
        if (depth === 0) {
          candidates.push(source.slice(start, index + 1));
          start = index;
          break;
        }
      }
    }
  }
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isPlainObject(parsed)) return parsed;
    } catch (error) { lastError = error; }
  }
  throw new Error(`invalid JSON response: ${lastError?.message || 'no object found'}`);
}

export function extractOpenAIChatText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => typeof part === 'string' ? part : part?.text || '').join('');
  }
  return '';
}

export function extractOpenAIResponsesText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const texts = [];
  for (const output of Array.isArray(data?.output) ? data.output : []) {
    for (const part of Array.isArray(output?.content) ? output.content : []) {
      if (typeof part?.text === 'string') texts.push(part.text);
    }
  }
  return texts.join('');
}

export function extractClaudeText(data) {
  return (Array.isArray(data?.content) ? data.content : [])
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

export function extractGeminiText(data) {
  return (Array.isArray(data?.candidates) ? data.candidates : [])
    .flatMap((candidate) => Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [])
    .map((part) => typeof part?.text === 'string' ? part.text : '')
    .join('');
}

// The reason a provider gives with a refusal, for the status line. OpenCode Go explains its refusals this way.
export function providerErrorDetail(text) {
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}
  const raw = data ? data.error?.message || data.message || (typeof data.error === 'string' ? data.error : '') : String(text || '').trim().startsWith('<') ? '' : text;
  const detail = truncate(String(raw || '').replace(/\s+/g, ' ').trim(), 300);
  return detail ? ` · ${detail}` : '';
}

// 흘려받기(2026-10-13): 오래 생각하는 모델은 답을 다 만들 때까지 연결이 조용해서, 중간 장치가 60초 무응답으로 끊었다(HTTP 504).
// 흘려받으면 생각·글 조각이 계속 와서 연결이 살아 있다. 흘려받는 동안 "타임아웃(초)"은 아무것도 오지 않는 시간의 한도이고,
// 조각이 계속 오면 요청 한 번에 PROVIDER_STREAM_CAP_MS까지 기다린다.
export const PROVIDER_STREAM_CAP_MS = 600000;

export function providerStreams(providerId, profile) {
  return providerId !== 'risu' && providerId !== 'vertex' && !['vertex', 'gemini'].includes(profile?.apiFormat);
}

// 요청 한 번에 허용하는 시간: 흘려받는 제공자는 상한, 아니면 "타임아웃(초)" 그대로.
export function providerAttemptLimitMs(assignment) {
  const timeoutMs = clampInt(assignment?.profile?.timeoutSeconds, 120, 15, 600) * 1000;
  return providerStreams(assignment?.providerId, assignment?.profile) ? Math.max(timeoutMs, PROVIDER_STREAM_CAP_MS) : timeoutMs;
}

// 실패한 응답을 누가 보냈는지: server 머리글, 오류 페이지 제목, 또는 JSON 오류 문구. 키처럼 보이는 글자는 지운다.
export function providerFailureSource(response, text) {
  const clean = value => truncate(String(value || '').replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\b(?:sk|pk|rk|oc|key|token|bearer)[-_:][^\s,;]*/gi, '…').replace(/[\w\-.*~+/=]{24,}/g, '…').replace(/\s+/g, ' ').trim(), 80);
  let server = '';
  try { server = clean(response?.headers?.get?.('server')); } catch (_) {}
  const body = String(text || '').trim();
  const title = clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1]);
  const note = title || !body.startsWith('{') ? '' : clean(providerErrorDetail(body).replace(/^ · /, ''));
  return { server, title, text: truncate([server && `server ${server}`, title || note].filter(Boolean).join(' · '), 120) };
}

export function providerHttpError(label, response, text, detailErrors = false) {
  const source = providerFailureSource(response, text);
  // Gemini·Vertex(2026-10-15): 앞단 HTML 오류(제목·server 머리글뿐인 400)면 주소 확인을 덧붙이고, JSON 오류면 error.message 첫 줄을 보인다
  const google = /^(?:Vertex AI|Custom Gemini)$/.test(String(label || ''));
  const body = String(text || '').trim();
  const front = google && (body.startsWith('<') || !!source.title) ? ' · 구글 앞단에서 거부(주소 확인)' : '';
  const line = google && !front && !detailErrors ? providerJsonErrorLine(body) : '';
  const error = new Error(`${label} HTTP ${response.status}${detailErrors ? providerErrorDetail(text) : ''}${line ? ` · ${line}` : ''}${source.server ? ` · server ${source.server}` : ''}${source.title ? ` · ${source.title}` : ''}${front}`);
  error.code = 'EROSYNC_PROVIDER_HTTP';
  error.status = response.status;
  if (source.text) error.source = source.text;
  return error;
}

// JSON 오류의 error.message 첫 줄(배열로 오는 Vertex 오류도). 키처럼 보이는 글자는 지운다.
export function providerJsonErrorLine(body) {
  let data = null;
  try { data = JSON.parse(body); } catch (_) { return ''; }
  if (Array.isArray(data)) data = data[0];
  const raw = data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : '');
  return truncate(String(raw || '').split('\n')[0].replace(/\b(?:sk|pk|rk|oc|key|token|bearer)[-_:][^\s,;]*/gi, '…').trim(), 200);
}

// 흐름 안에서 온 오류 조각. 상태 번호가 있으면 HTTP 오류처럼(5xx는 재요청 대상), 없으면 문구로 나눈다.
export function providerStreamError(label, value, detailErrors = false) {
  const data = isPlainObject(value) ? value : { message: String(value || '') };
  const message = String(data.message || data.error?.message || (typeof data.error === 'string' ? data.error : '') || data.type || 'stream error').replace(/\s+/g, ' ').trim();
  const numbered = [data.status, data.code, data.error?.code, /\[(\d{3})\]/.exec(message)?.[1]].map(Number).find(number => number >= 400 && number <= 599) || 0;
  const status = numbered || (/overloaded/i.test(`${data.type || ''} ${message}`) ? 503 : 0);
  const error = new Error(`${label} stream error${status ? ` ${status}` : ''}${detailErrors && message ? ` · ${truncate(message, 300)}` : ''}`);
  error.code = status ? 'EROSYNC_PROVIDER_HTTP' : /timed? ?out|timeout/i.test(message) ? 'EROSYNC_PROVIDER_TIMEOUT' : 'EROSYNC_PROVIDER_FAILED';
  if (status) error.status = status;
  error.source = truncate(`stream · ${providerFailureSource(null, JSON.stringify({ error: { message } })).text || 'error'}`, 120);
  return error;
}

// 흘려받은 글을 형식마다 모아, 한 번에 받았을 때와 같은 모양의 응답으로 돌려준다(생각 조각은 답에 넣지 않음).
// 서버가 흘려보내지 않고 JSON 하나를 주면 그 JSON을 그대로 돌려준다.
export function providerStreamCollector(format, contentType, label, detailErrors = false) {
  let mode = /event-stream/.test(contentType) ? 'sse' : /ndjson|jsonl/.test(contentType) ? 'ndjson' : /json/.test(contentType) ? 'whole' : '';
  let head = '', whole = '', buffer = '', eventName = '', dataLines = [];
  let text = '', finish = '', model = '', usage = null, completed = null, received = false;
  const fail = value => { throw providerStreamError(label, value, detailErrors); };
  const take = (data, name = '') => {
    if (!isPlainObject(data)) return;
    received = true;
    const type = String(data.type || name || '');
    if (format === 'ollama_chat') {
      if (data.error) fail(data.error);
      if (typeof data.message?.content === 'string') text += data.message.content;
      else if (typeof data.response === 'string') text += data.response;
      if (data.done) finish = String(data.done_reason || 'stop');
    } else if (format === 'claude') {
      if (type === 'error' || data.error) fail(data.error || data);
      if (type === 'content_block_delta' && data.delta?.type === 'text_delta') text += String(data.delta.text || '');
      else if (type === 'content_block_start' && data.content_block?.type === 'text') text += String(data.content_block.text || '');
      else if (type === 'message_delta' && data.delta?.stop_reason) finish = String(data.delta.stop_reason);
      else if (type === 'message_start' && data.message?.model) model = String(data.message.model);
    } else if (format === 'openai_responses') {
      if (type === 'error') fail(data.error || data);
      if (type === 'response.failed') fail(data.response?.error || { message: 'response failed' });
      if (type === 'response.output_text.delta') text += String(data.delta || '');
      else if (type === 'response.completed' || type === 'response.incomplete') completed = isPlainObject(data.response) ? data.response : completed;
    } else {
      if (data.error) fail(data.error);
      const choice = Array.isArray(data.choices) ? data.choices[0] : null;
      const delta = choice?.delta?.content;
      if (typeof delta === 'string') text += delta;
      else if (Array.isArray(delta)) text += delta.map(part => typeof part === 'string' ? part : part?.text || '').join('');
      else if (!text && typeof choice?.message?.content === 'string') text = choice.message.content;
      if (choice?.finish_reason) finish = String(choice.finish_reason);
      if (data.model) model = String(data.model);
    }
    if (isPlainObject(data.usage)) usage = data.usage;
  };
  const dispatch = () => {
    const payload = dataLines.join('\n');
    const name = eventName;
    dataLines = []; eventName = '';
    if (!payload || payload.trim() === '[DONE]') return;
    let data = null;
    try { data = JSON.parse(payload); } catch (_) { return; }
    take(data, name);
  };
  const sseLine = line => {
    if (line === '') return dispatch();
    if (line[0] === ':') return;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'data') dataLines.push(value);
    else if (field === 'event') eventName = value;
  };
  const ndjsonLine = line => {
    if (!line.trim()) return;
    let data = null;
    try { data = JSON.parse(line); } catch (_) { whole += `${line}\n`; return; }
    take(data);
  };
  const feed = (chunk, final = false) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = final ? '' : lines.pop();
    for (const line of lines) (mode === 'sse' ? sseLine : ndjsonLine)(line);
    if (final && mode === 'sse') dispatch();
  };
  const result = () => {
    if (format === 'ollama_chat') return { message: { role: 'assistant', content: text }, done: true, ...(finish ? { done_reason: finish } : {}) };
    if (format === 'claude') return { type: 'message', role: 'assistant', ...(model ? { model } : {}), content: [{ type: 'text', text }], stop_reason: finish || null, ...(usage ? { usage } : {}) };
    if (format === 'openai_responses') return completed && (extractOpenAIResponsesText(completed) || !text) ? completed : { ...(completed || {}), output_text: text };
    return { ...(model ? { model } : {}), choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: finish || null }], ...(usage ? { usage } : {}) };
  };
  return {
    push(chunk) {
      if (!chunk) return;
      if (!mode) {
        head += chunk;
        const start = head.trimStart();
        if (!start) return;
        mode = /^(?:data|event|id|retry)\s*:|^:/.test(start) ? 'sse' : format === 'ollama_chat' ? 'ndjson' : 'whole';
        chunk = head; head = '';
      }
      if (mode === 'whole') whole += chunk;
      else feed(chunk);
    },
    finish() {
      if (!mode) { mode = 'whole'; whole = head; }
      if (mode === 'whole') {
        const body = whole.trim();
        try { return JSON.parse(body); } catch (_) {}
        // 머리말 없이 흘려보낸 글
        whole = '';
        mode = /^(?:data|event)\s*:/m.test(body) ? 'sse' : 'ndjson';
        feed(body, true);
      } else feed('', true);
      if (!received) {
        const rest = whole.trim();
        if (rest) { try { return JSON.parse(rest); } catch (_) {} }
        const failure = new Error(`${label} returned invalid JSON`);
        failure.code = 'EROSYNC_PROVIDER_RESPONSE_JSON';
        throw failure;
      }
      return result();
    },
  };
}

export function buildCommonBody(profile, messages) {
  const body = {
    model: profile.model,
    messages,
  };
  const temperature = optionalNumber(profile.temperature);
  if (temperature !== null) body.temperature = temperature;
  if (profile.maxTokens > 0) body.max_completion_tokens = profile.maxTokens;
  if (profile.reasoningEffort) body.reasoning_effort = profile.reasoningEffort;
  return body;
}

export function applyExtraBody(profile, body) {
  const extra = parseJsonRecord(profile.extraBodyJson, {});
  return { ...body, ...extra };
}

export function buildBearerHeaders(profile, extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extra,
    ...parseJsonRecord(profile.extraHeadersJson, {}),
  };
  if (profile.apiKey) headers.Authorization = `Bearer ${profile.apiKey}`;
  return headers;
}

export function risuProviderBusyError(executionRole, activeRoles, code = 'EROSYNC_RISU_PROVIDER_BUSY') {
  const error = new Error(`RisuAI auxiliary provider is busy (${activeRoles.join(', ') || 'unknown'}); ${executionRole} was skipped`);
  error.code = code;
  error.executionRole = executionRole;
  error.activeRoles = activeRoles;
  return error;
}

export function base64Url(input) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new TextEncoder().encode(String(input));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function pemToArrayBuffer(pem) {
  const base64 = String(pem || '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
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

// 웹 검색: 표준 도구 한 줄로 되는 제공자만. OpenAI(Responses 형식) · Claude · Vertex AI Gemini · OpenRouter(모델 무관). 나머지는 길이 없어 줄을 보이지 않는다.
// 인물 분석(처음·재검사)에만 붙이고, 턴마다 하는 장면 판단·긴급 판단·8축 한글 호출에는 붙이지 않는다(부르는 쪽이 webSearch 옵션을 주는 곳만).
export const WEB_SEARCH_NOTE = 'WEB SEARCH: use the search tool only to verify facts about the original work, its world, and its characters. Do not invent facts the search did not confirm.';

export function providerSearchTool(providerId, profile) {
  if (providerId === 'openai') return String(profile?.apiFormat || 'openai_responses') === 'openai_responses' ? { kind: 'openai_responses', tool: { type: 'web_search' } } : null;
  if (providerId === 'claude') return { kind: 'claude', tool: { type: 'web_search_20250305', name: 'web_search', max_uses: 3 } };
  if (providerId === 'vertex') return { kind: 'gemini', tool: { googleSearch: {} } };
  if (providerId === 'openrouter') return { kind: 'openrouter', tool: { id: 'web' } };
  return null;
}

// 그 역할의 제공자에 검색이 켜져 있고 도구가 있을 때만
export function webSearchAllowed(providerId, profile) {
  return profile?.webSearch === true && !!providerSearchTool(providerId, profile);
}

// 요청 표시: 메시지 배열에 보이지 않는 표지를 단다(직렬화·복사에는 안 들어간다). 제공자 호출부가 이 표지를 보고 도구를 붙인다.
export function webSearchMark(messages, on) {
  if (on) Object.defineProperty(messages, 'webSearch', { value: true, enumerable: false, configurable: true });
  return messages;
}

// Gemini 4(gemini-4-…): temperature는 무시되므로 보내지 않고, 생각 깊이는 thinkingLevel(0 → low · 8,192 이하 medium · 그 위 high),
// maxOutputTokens는 생각과 답을 합친 한도라 32,768 아래면 올리고 65,536을 넘기지 않는다. 다른 Gemini는 지금 그대로.
export function geminiGeneration4(model) {
  return /(?:^|\/)gemini-4(?:[-.]|$)/i.test(String(model || '').trim());
}

export function geminiThinkingLevel(thinkingTokens) {
  const tokens = Number(thinkingTokens) || 0;
  return tokens <= 0 ? 'low' : tokens <= 8192 ? 'medium' : 'high';
}

export function toGeminiRequest(messages, profile) {
  const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n');
  const contents = messages.filter((message) => message.role !== 'system').map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(message.content || '') }],
  }));
  const gen4 = geminiGeneration4(profile.model);
  const generationConfig = { maxOutputTokens: gen4 ? Math.min(65536, Math.max(32768, Number(profile.maxTokens) || 0)) : profile.maxTokens };
  const temperature = optionalNumber(profile.temperature);
  if (temperature !== null && !gen4) generationConfig.temperature = temperature;
  if (gen4) generationConfig.thinkingConfig = { thinkingLevel: geminiThinkingLevel(profile.thinkingTokens) };
  else if (profile.thinkingTokens > 0) generationConfig.thinkingConfig = { thinkingBudget: profile.thinkingTokens };
  return {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig,
    ...(messages.webSearch === true ? { tools: [{ googleSearch: {} }] } : {}), // 웹 검색(Vertex AI만 표지를 받는다)
  };
}

export function supportsGeminiPdf(providerId, profile) {
  return !['risu', 'ollama_cloud', 'claude'].includes(providerId)
    && (providerId === 'vertex' || ['vertex', 'gemini'].includes(profile?.apiFormat))
    && /(?:^|\/)gemini(?:[-.]|$)/i.test(String(profile?.model || ''));
}

export function pdfBytesBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

export function resolveRoleProfile(config, role) {
  const overrideProvider = role === 'profile' ? config.profileProvider : role === 'behind' ? config.behindProvider : config.directorProvider;
  const providerId = overrideProvider && overrideProvider !== 'inherit' ? overrideProvider : config.provider;
  const base = mergeProviderProfile(providerId, config.providers[providerId]);
  const overrideModel = role === 'profile' ? config.profileModel : role === 'behind' ? config.behindModel : config.directorModel;
  if (overrideModel) base.model = overrideModel;
  return { providerId, profile: providerId === 'opencode_go' ? resolveOpenCodeGoProfile(base, config.providers[providerId]?.model) : base };
}

// OpenCode Go serves each model family in its own request format, at its own path under one base address.
export const OPENCODE_GO_PATHS = Object.freeze({ openai_chat: '/chat/completions', openai_responses: '/responses', claude: '/messages' });

// OpenCode Go asks every client to name itself and to send a stable session ID, and refuses a console key
// without one (HTTP 400 MissingSessionID). One ID per plugin load keeps its routing and prompt caching stable.
export const OPENCODE_GO_SESSION = `erosync-${Array.from(globalThis.crypto?.getRandomValues?.(new Uint8Array(12)) || Array.from({ length: 12 }, () => Math.floor(Math.random() * 256)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;

export function openCodeGoHeaders(providerId) {
  return providerId === 'opencode_go' ? { 'x-opencode-session': OPENCODE_GO_SESSION, 'User-Agent': `Erosync/${VERSION}` } : {};
}

// Model IDs are lower case; the OpenCode app writes them with an `opencode-go/` prefix.
export function openCodeGoModelId(value) {
  return String(value || '').trim().replace(/^opencode-go\//i, '').toLowerCase();
}

export function openCodeGoModelFormat(model) {
  const id = openCodeGoModelId(model);
  if (/^(?:grok|gpt|muse-spark)/.test(id)) return 'openai_responses';
  if (/^(?:minimax|qwen)/.test(id)) return 'claude';
  return 'openai_chat';
}

// The format and address of the model actually requested. A format the user chose is for the provider's own
// model; a role's own model of another family is sent in the format of its family. The endpoint may be the
// base address or any of the paths, with a query kept as it is.
export function resolveOpenCodeGoProfile(profile, defaultModel = profile.model) {
  const model = openCodeGoModelId(profile.model);
  const apiFormat = OPENCODE_GO_PATHS[profile.apiFormat] && model === openCodeGoModelId(defaultModel) ? profile.apiFormat : openCodeGoModelFormat(model);
  const [, address = '', rest = ''] = /^([^?#]*)([\s\S]*)$/.exec(String(profile.endpoint || '').trim() || PROVIDER_DEFS.opencode_go.endpoint);
  const base = address.replace(/\/+$/, '').replace(/\/(?:chat\/completions|responses|messages)$/i, '');
  return { ...profile, model, apiFormat, endpoint: base + OPENCODE_GO_PATHS[apiFormat] + rest };
}

export function providerTaskBudgetMs(config, role) {
  const assignment = resolveRoleProfile(config, role);
  const retries = clampInt(assignment.profile.retryCount, 0, 0, 3);
  return providerAttemptLimitMs(assignment) * (retries + 1) + retries * 2000;
}

export function providerFailure(error) {
  if (error?.code && /^EROSYNC_|^DIRECTOR_/.test(error.code)) return error;
  const message = String(error?.message || error || '');
  const failure = new Error('AI provider request failed');
  failure.status = clampInt(error?.status || error?.statusCode, 0, 0, 599);
  failure.code = failure.status ? 'EROSYNC_PROVIDER_HTTP'
    : /empty content|empty JSON response|no (?:text|content)|returned empty/i.test(message) ? 'EROSYNC_PROVIDER_EMPTY'
    : /timed out|timeout|ETIMEDOUT/i.test(message) ? 'EROSYNC_PROVIDER_TIMEOUT'
    : error?.name === 'AbortError' ? 'EROSYNC_PROVIDER_CANCELLED'
    : /fetch failed|failed to fetch|network|ECONNRESET|ECONNREFUSED|ENOTFOUND|socket/i.test(message) ? 'EROSYNC_PROVIDER_NETWORK'
    : /model is empty|endpoint is empty|project ID is empty|service account|private.key|api.key|runLLMModel is unavailable|플러그인 제공 보조 모델|Unexpected token|JSON value must/i.test(message) ? 'EROSYNC_PROVIDER_CONFIG'
    : 'EROSYNC_PROVIDER_FAILED';
  return failure;
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

export function asObjectArray(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  if (!value || typeof value !== 'object') return [];
  if (typeof value.content === 'string' || typeof value.text === 'string' || typeof value.prompt === 'string') return [value];
  return Object.values(value).filter((item) => item && typeof item === 'object');
}

export function identityValues(value) {
  if (!value || typeof value !== 'object') return [];
  return [value.id, value._id, value.uid, value.uuid, value.namespace, value.name, value.displayName]
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

export function loreContent(value) {
  if (!value || typeof value !== 'object') return '';
  for (const key of ['content', 'text', 'prompt', 'data', 'description']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }
  return '';
}

export function isLoreDisabled(value) {
  const mode = String(value?.mode || '').trim().toLowerCase();
  return !value || value.enabled === false || value.disabled === true || value.disable === true || value.isDisabled === true || mode === 'disabled' || mode === 'folder';
}

export function visitEnabledModuleReferences(target, value) {
  const add = (item) => {
    const text = String(item || '').trim();
    if (text) target.add(text);
  };
  if (typeof value === 'string') {
    value.split(',').forEach(add);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') visitEnabledModuleReferences(target, item);
      else if (item && typeof item === 'object') identityValues(item).forEach(add);
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (item === true || item === 'true' || item === 1) add(key);
      else if (item && typeof item === 'object' && item.enabled !== false && item.disabled !== true) {
        add(key);
        identityValues(item).forEach(add);
      }
    }
  }
}

export function normalizedModuleText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function moduleContentFingerprint(module) {
  const parts = [module?.description, module?.backgroundEmbedding, module?.prompt, module?.data?.description]
    .filter((value) => typeof value === 'string' && value.trim())
    .map(normalizedModuleText);
  for (const collection of moduleLoreCollections(module)) {
    for (const entry of asObjectArray(collection)) {
      if (isLoreDisabled(entry)) continue;
      const content = loreContent(entry);
      if (content) parts.push(`${entry.id || entry._id || entry.uid || ''}:${normalizedModuleText(content)}`);
    }
  }
  return fnv1a(parts.sort().join('|'));
}

export function activeModuleList(db, character, chat, persona) {
  const refs = new Set();
  visitEnabledModuleReferences(refs, db?.enabledModules);
  visitEnabledModuleReferences(refs, db?.moduleIntergration);
  visitEnabledModuleReferences(refs, db?.moduleIntegration);
  visitEnabledModuleReferences(refs, character?.modules);
  visitEnabledModuleReferences(refs, character?.data?.modules);
  visitEnabledModuleReferences(refs, chat?.modules);
  visitEnabledModuleReferences(refs, chat?.data?.modules);
  visitEnabledModuleReferences(refs, persona?.embeddedModule);
  visitEnabledModuleReferences(refs, persona?.embeddedModules);

  const candidates = [];
  const add = (module, embedded = false, ownerKind = 'database', ownerId = '') => {
    if (!module || typeof module !== 'object') return;
    if (module.enabled === false || module.disabled === true || module.disable === true) return;
    const identities = identityValues(module);
    const strongIdentity = [module.uuid, module.uid, module._id, module.id, module.namespace].map((value) => String(value || '').trim()).find(Boolean) || '';
    const identityKind = strongIdentity ? ['uuid', 'uid', '_id', 'id', 'namespace'].find((key) => String(module[key] || '').trim() === strongIdentity) : 'fallback';
    const contentFingerprint = moduleContentFingerprint(module);
    const legacyKey = strongIdentity || identities[0] || `embedded_${candidates.length + 1}`;
    const explicit = module.enabled === true || module.active === true || module.isEnabled === true;
    if (!embedded && refs.size > 0 && !identities.some((id) => refs.has(id))) return;
    if (!embedded && refs.size === 0 && !explicit) return;
    const ownerFingerprint = fnv1a(`${ownerKind}:${ownerId || ''}`);
    const stableBase = strongIdentity || `fallback_${ownerFingerprint}_${contentFingerprint}`;
    candidates.push({ module, key: legacyKey, legacyKey, stableBase, stableKey: stableBase, embedded, ownerKind, ownerId: String(ownerId || ''), identityKind, identityValue: strongIdentity, contentFingerprint, selectable: true, collision: false, name: String(module.name || module.displayName || module.id || module.namespace || legacyKey) });
  };
  for (const module of asObjectArray(db?.modules)) add(module, false, 'database', 'global');
  const personaId = String(persona?.id || persona?.uid || persona?.name || 'persona');
  const characterId = String(character?.chaId || character?.characterId || character?.id || character?.name || 'character');
  const chatId = String(chat?.id || chat?.chatId || chat?.name || 'chat');
  for (const module of [persona?.embeddedModule, ...(Array.isArray(persona?.embeddedModules) ? persona.embeddedModules : [])]) add(module, true, 'persona', personaId);
  for (const module of [...(Array.isArray(character?.modules) ? character.modules : []), ...(Array.isArray(character?.data?.modules) ? character.data.modules : [])]) if (module && typeof module === 'object') add(module, true, 'character', characterId);
  for (const module of [...(Array.isArray(chat?.modules) ? chat.modules : []), ...(Array.isArray(chat?.data?.modules) ? chat.data.modules : [])]) if (module && typeof module === 'object') add(module, true, 'chat', chatId);
  const byBase = new Map();
  const byLegacy = new Map();
  for (const descriptor of candidates) {
    const baseList = byBase.get(descriptor.stableBase) || [];
    baseList.push(descriptor);
    byBase.set(descriptor.stableBase, baseList);
    const legacyList = byLegacy.get(descriptor.legacyKey) || [];
    legacyList.push(descriptor);
    byLegacy.set(descriptor.legacyKey, legacyList);
  }
  for (const list of byBase.values()) {
    if (list.length <= 1) continue;
    for (const descriptor of list) {
      descriptor.collision = true;
      descriptor.stableKey = `${descriptor.stableBase}_c_${descriptor.contentFingerprint}`;
    }
    const byResolved = new Map();
    for (const descriptor of list) {
      const resolved = byResolved.get(descriptor.stableKey) || [];
      resolved.push(descriptor);
      byResolved.set(descriptor.stableKey, resolved);
    }
    for (const duplicate of byResolved.values()) if (duplicate.length > 1) for (const descriptor of duplicate) descriptor.selectable = false;
  }
  for (const list of byLegacy.values()) {
    if (list.length <= 1) continue;
    for (const descriptor of list) {
      descriptor.collision = true;
      descriptor.key = `${descriptor.legacyKey}_${descriptor.contentFingerprint}`;
    }
  }
  return candidates;
}

export function resolveModuleAnalysisSelection(descriptors, analysisModules) {
  const excludedKeys = new Set(normalizeStringList(analysisModules?.excludedKeys, 1000, 240));
  const metadata = isPlainObject(analysisModules?.keyMetadata) ? analysisModules.keyMetadata : {};
  const included = [];
  const excluded = [];
  const unresolvedExclusions = new Set(excludedKeys);
  const warnings = [];
  for (const descriptor of descriptors) {
    const directMatch = excludedKeys.has(descriptor.stableKey) || excludedKeys.has(descriptor.key);
    let shouldExclude = directMatch;
    const stored = metadata[descriptor.stableKey] || metadata[descriptor.key];
    if (shouldExclude && descriptor.identityKind === 'fallback' && stored?.contentFingerprint && stored.contentFingerprint !== descriptor.contentFingerprint) shouldExclude = false;
    if (shouldExclude && (!descriptor.selectable || descriptor.collision)) {
      shouldExclude = false;
      warnings.push(`${descriptor.name} 모듈은 식별 키 충돌(collision)로 분석 제외를 적용하지 않고 포함했습니다.`);
    }
    if (descriptor.collision) warnings.push(`${descriptor.name} 모듈 식별 키 충돌(collision)이 감지되었습니다.`);
    if (shouldExclude) {
      excluded.push(descriptor);
      unresolvedExclusions.delete(descriptor.stableKey);
      unresolvedExclusions.delete(descriptor.key);
    } else included.push(descriptor);
  }
  return { included, excluded, unresolvedExclusions: [...unresolvedExclusions].sort(), warnings };
}

export function moduleLoreCollections(module) {
  return [
    module?.lore, module?.lorebook, module?.loreBook, module?.lorebooks, module?.entries,
    module?.data?.lore, module?.data?.lorebook, module?.data?.loreBook, module?.data?.lorebooks,
    module?.data?.characterBook?.entries, module?.data?.character_book?.entries,
    module?.extensions?.characterBook?.entries, module?.extensions?.character_book?.entries,
  ];
}

export function sourceDocumentLabel(entry, fallback) {
  return truncate(entry?.name || entry?.title || entry?.comment || entry?.key || (Array.isArray(entry?.keys) ? entry.keys.join(', ') : '') || fallback, 220);
}

export function cbsTagEnd(source, start) {
  let depth = 0;
  for (let index = start; index < source.length - 1; index += 1) {
    if (source[index] === '{' && source[index + 1] === '{') { depth += 1; index += 1; continue; }
    if (source[index] === '}' && source[index + 1] === '}') {
      depth -= 1;
      index += 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

export function stripCbsTemplateTags(value) {
  let text = String(value || '');
  for (let pass = 0; pass < 10; pass += 1) {
    const next = text
      .replace(/\{\{#(if|when|each|if_pure)[^{}]*(\{\{[^{}]*\}\}[^{}]*)*\}\}/gi, '')
      .replace(/\{\{\/(if|when|each|if_pure)?\}\}/gi, '')
      .replace(/\{\{else(?:[^{}]*)\}\}/gi, '')
      .replace(/\{\{[^{}]*\}\}/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    if (next === text) break;
    text = next;
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function appendPrimitiveVariables(target, value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (['string', 'number', 'boolean'].includes(typeof item) || item === null) target[String(key)] = item;
  }
}

// 로어북 조건 블록의 계산식(2026-10-22, 이용자 제보): 리스는 `{{#if {{? ($x=1)|($x=2)}}}}`처럼 계산식으로 토글을 거는데,
// 에로싱크는 이 꼴을 못 읽어 "미해결"로 두고 채팅 변수 블록을 통째로 남겼다(꺼진 가지까지 분석에 들어감).
// 리스 원본(src/ts/process/infunctions.ts calcString, src/ts/parser/chatVar.svelte.ts getChatVar)과 같은 규칙으로 평가한다.
//   - 괄호 안부터 계산, `$이름` = 채팅 변수(없으면 봇의 기본 변수 → 리스 기본 변수 틀 → 'null' → 0), `@이름` = 전역 채팅 변수
//   - 연산자 = != < > <= >= & | ! + - * / % ^ (`&&`·`||`·`==`도 됨), 숫자만 다루고 숫자가 아닌 토큰은 버린다(리스와 같음)
//   - `#if`는 결과의 첫 토큰이 1 또는 true일 때만 참
// 계산식 안의 {{getvar::}}·{{getglobalvar::}}·비교 함수도 먼저 푼다. 모르는 꼴이면 null을 돌려 지금처럼 둔다.
export function cbsParseKeyValue(template) {
  const result = [];
  if (typeof template !== 'string' || !template) return result;
  for (const line of template.split('\n')) {
    const [key, value] = line.split('=');
    if (key && value) result.push([key, value]);
  }
  return result;
}

export function buildConditionalVariableContext(db, character, chat) {
  const globalVariables = Object.create(null);
  const chatVariables = Object.create(null);
  const globalSources = [
    db?.globalChatVariables, db?.globalVariables, db?.globalVars, db?.scriptstate?.global,
    character?.globalChatVariables, character?.globalVariables, character?.globalVars,
    character?.scriptstate?.global, character?.data?.globalVariables, character?.data?.globalVars,
    chat?.globalChatVariables, chat?.globalVariables, chat?.scriptstate?.global,
    chat?.scriptState?.global, chat?.data?.globalVariables,
  ];
  const chatSources = [
    chat?.scriptstate?.variables, chat?.scriptstate?.vars, chat?.scriptstate,
    chat?.scriptState?.variables, chat?.scriptState?.vars, chat?.scriptState,
    chat?.variables, chat?.vars, chat?.data?.scriptstate?.variables,
    chat?.data?.scriptstate, chat?.data?.variables,
  ];
  globalSources.forEach((source) => appendPrimitiveVariables(globalVariables, source));
  chatSources.forEach((source) => appendPrimitiveVariables(chatVariables, source));
  // 기본 변수: 봇의 defaultVariables가 먼저, 리스의 templateDefaultVariables가 다음(리스 getChatVar의 find 순서)
  const defaultVariables = Object.create(null);
  for (const [key, value] of [...cbsParseKeyValue(character?.defaultVariables), ...cbsParseKeyValue(db?.templateDefaultVariables)]) {
    if (!Object.prototype.hasOwnProperty.call(defaultVariables, key)) defaultVariables[key] = value;
  }
  // 채팅에 따로 둔 전역 변수(useLocallySetGlobalVariables)
  const localGlobalVariables = Object.create(null);
  appendPrimitiveVariables(localGlobalVariables, chat?.GLGlobalVariables);
  return { globalVariables, chatVariables, defaultVariables, localGlobalVariables, chatAvailable: !!chat };
}

// 리스 getChatVar: scriptstate['$이름'] → 기본 변수 → 'null'
export function cbsChatVarValue(name, context) {
  const vars = context?.chatVariables;
  if (vars && typeof vars === 'object') {
    for (const key of [`$${name}`, name]) {
      if (Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== undefined && vars[key] !== null) return String(vars[key]);
    }
  }
  const defaults = context?.defaultVariables;
  if (defaults && typeof defaults === 'object' && Object.prototype.hasOwnProperty.call(defaults, name)) return String(defaults[name]);
  return 'null';
}

// 리스 getGlobalChatVar: 채팅에 따로 둔 값이 있으면 그것, 아니면 db.globalChatVariables → 'null'
export function cbsGlobalChatVarValue(name, context) {
  const local = context?.localGlobalVariables;
  if (local && typeof local === 'object' && Object.prototype.hasOwnProperty.call(local, name)) {
    const value = local[name];
    if (value !== undefined && value !== null && String(value) !== 'null' && String(value) !== '') return String(value);
  }
  const vars = context?.globalVariables;
  if (vars && typeof vars === 'object' && Object.prototype.hasOwnProperty.call(vars, name) && vars[name] !== undefined && vars[name] !== null) return String(vars[name]);
  return 'null';
}

export const CBS_CALC_OPERATORS = Object.freeze({
  '+': [2, 'L'], '-': [2, 'L'], '*': [3, 'L'], '/': [3, 'L'], '^': [4, 'L'], '%': [3, 'L'],
  '<': [1, 'L'], '>': [1, 'L'], '|': [1, 'L'], '&': [1, 'L'], '≤': [1, 'L'], '≥': [1, 'L'], '=': [1, 'L'], '≠': [1, 'L'], '!': [5, 'R'],
});

// 리스 toRPN 그대로: 숫자 토큰만 남기고 셔닝야드로 후위식을 만든다.
export function cbsCalcToRpn(expression) {
  const keys = Object.keys(CBS_CALC_OPERATORS);
  const text = String(expression).replace(/\s+/g, '');
  const tokens = [];
  let lastToken = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '-' && (index === 0 || keys.includes(text[index - 1]) || text[index - 1] === '(')) lastToken += char;
    else if (keys.includes(char)) {
      tokens.push(lastToken !== '' ? lastToken : '0');
      lastToken = '';
      tokens.push(char);
    } else lastToken += char;
  }
  tokens.push(lastToken !== '' ? lastToken : '0');
  let output = '';
  const stack = [];
  for (const token of tokens) {
    if (parseFloat(token) || token === '0') output += `${token} `;
    else if (keys.includes(token)) {
      const [precedence, associativity] = CBS_CALC_OPERATORS[token];
      while (stack.length > 0 && ((associativity === 'L' && precedence <= CBS_CALC_OPERATORS[stack[stack.length - 1]][0])
        || (associativity === 'R' && precedence < CBS_CALC_OPERATORS[stack[stack.length - 1]][0]))) output += `${stack.pop()} `;
      stack.push(token);
    }
  }
  while (stack.length > 0) output += `${stack.pop()} `;
  return output.trim();
}

// 리스 calculateRPN 그대로.
export function cbsCalcRpn(expression) {
  const stack = [];
  for (const token of String(expression).split(' ')) {
    if (parseFloat(token) || token === '0') { stack.push(parseFloat(token)); continue; }
    const b = stack.pop(), a = stack.pop();
    switch (token) {
      case '+': stack.push(a + b); break;
      case '-': stack.push(a - b); break;
      case '*': stack.push(a * b); break;
      case '/': stack.push(a / b); break;
      case '^': stack.push(a ** b); break;
      case '%': stack.push(a % b); break;
      case '<': stack.push(a < b ? 1 : 0); break;
      case '>': stack.push(a > b ? 1 : 0); break;
      case '|': stack.push(a || b); break;
      case '&': stack.push(a && b); break;
      case '≤': stack.push(a <= b ? 1 : 0); break;
      case '≥': stack.push(a >= b ? 1 : 0); break;
      case '=': stack.push(a === b ? 1 : 0); break;
      case '≠': stack.push(a !== b ? 1 : 0); break;
      case '!': stack.push(b ? 0 : 1); break;
      default: break;
    }
  }
  if (stack.length === 0) return 0;
  return stack.pop();
}

// 리스 executeRPNCalculation 그대로: 변수 치환 → 연산자 정리 → null → 0 → 후위식 계산.
export function cbsCalcExecute(text, context) {
  const number = value => { const parsed = parseFloat(value); return Number.isNaN(parsed) ? '0' : String(parsed); };
  const prepared = String(text)
    .replace(/\$([a-zA-Z0-9_]+)/g, (_, name) => number(cbsChatVarValue(name, context)))
    .replace(/@([a-zA-Z0-9_]+)/g, (_, name) => number(cbsGlobalChatVarValue(name, context)))
    .replace(/&&/g, '&').replace(/\|\|/g, '|').replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/==/g, '=').replace(/!=/g, '≠')
    .replace(/null/gi, '0');
  return cbsCalcRpn(cbsCalcToRpn(prepared));
}

// 리스 calcString 그대로: 괄호 안을 먼저 계산해 숫자로 바꾼다.
export function cbsCalcString(text, context) {
  const depth = [''];
  const source = String(text);
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') depth.push('');
    else if (char === ')' && depth.length > 1) {
      const result = String(cbsCalcExecute(depth.pop(), context));
      depth[depth.length - 1] += result;
    }
    else depth[depth.length - 1] += char;
  }
  return cbsCalcExecute(depth.join(''), context);
}

export function cbsValueTruthy(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (value === null || value === undefined) return false;
  const text = String(value).trim().toLowerCase();
  return text !== '' && !['0', 'false', 'null', 'undefined', 'off', 'no'].includes(text);
}

export function parseCbsLiteral(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  if (/^(?:true|false)$/i.test(text)) return /^true$/i.test(text);
  if (/^(?:null|undefined)$/i.test(text)) return null;
  return text;
}

export function isAssetMaidInternalLore(entry, content = undefined) {
  if (!isPlainObject(entry)) return false;
  const refs = Array.isArray(entry.sourceRefs) ? entry.sourceRefs : [];
  const ids = [entry.id, entry.originId, ...refs.map(ref => ref?.originId)].map(value => String(value || '').trim());
  const labels = [entry.comment, entry.label, entry.name, entry.title, ...refs.map(ref => ref?.label)].map(value => String(value || '').trim());
  const signatures = [
    ['asset-maid:data', '__ASSET_MAID_DATA__'],
    ['asset-maid:chat-data', '__ASSET_MAID_CHAT_DATA__'],
    ['asset-maid:current-actor-state', '__ASSET_MAID_CURRENT_ACTOR_STATE__'],
  ];
  if (labels.includes('__ASSET_MAID_BACKUP__') && ids.some(id => id.startsWith('asset-maid:quarantine:') || id.includes('_asset-maid_quarantine_'))) return true;
  const signature = signatures.find(([, label]) => labels.includes(label));
  if (!signature) return false;
  const knownId = ids.some(id => id === signature[0] || id === safeKeyPart(signature[0]) || id.endsWith(`_${safeKeyPart(signature[0])}`));
  const text = typeof content === 'string' ? content : typeof entry.content === 'string' ? entry.content : typeof entry.text === 'string' ? entry.text : null;
  // Stored source metadata has no body; current lore must also carry the
  // plugin's non-activating object envelope. Never blanket-filter the flag.
  return text === null ? knownId : /(?:^|\n)(?:(?:content|text|prompt|data):\s*)?@@dont_activate\s*\{/u.test(text.trim());
}

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

export function addRosterSourceEntry(target, seen, value) {
  const prepared = value?.prepared;
  if (!prepared?.rawContent?.trim()) return;
  const hash = fnv1a(prepared.rawContent);
  const sourceRef = {
    kind: String(value.kind || 'unknown'),
    label: truncate(value.label || '', 240),
    originId: truncate(value.originId || '', 240),
    moduleName: truncate(value.moduleName || '', 200),
  };
  const existingIndex = seen.get(hash);
  if (Number.isInteger(existingIndex)) {
    const existing = target[existingIndex];
    existing.sourceKinds = normalizeStringList([...(existing.sourceKinds || []), sourceRef.kind], 24, 120);
    existing.sourceRefs = [...(existing.sourceRefs || []), sourceRef]
      .filter((item, index, list) => list.findIndex((other) => other.kind === item.kind && other.originId === item.originId && other.moduleName === item.moduleName) === index)
      .slice(0, 80);
    return;
  }
  const entry = value.entry || {};
  const id = safeKeyPart(`${value.kind}_${value.originId || value.label || target.length + 1}`, `${value.kind}_${hash}`);
  seen.set(hash, target.length);
  target.push({
    id,
    comment: String(entry.comment || ''),
    name: String(entry.name || entry.title || ''),
    key: String(entry.key || (Array.isArray(entry.keys) ? entry.keys.join(', ') : '')),
    rawContent: prepared.rawContent,
    content: prepared.content,
    profileContent: prepared.profileContent,
    hash,
    originId: String(value.originId || ''),
    sourceKinds: [sourceRef.kind],
    sourceRefs: [sourceRef],
    conditionalDiagnostics: prepared.diagnostics,
  });
}

export function addSourceDocument(target, seen, state, value) {
  if (!value || !value.text) return;
  const text = String(value.text).trim();
  if (!text) return;
  const contentHash = fnv1a(text);
  const sourceRef = {
    kind: String(value.kind || 'unknown'),
    label: truncate(value.label || '', 240),
    originId: truncate(value.originId || '', 240),
    moduleName: truncate(value.moduleName || '', 200),
  };
  const existingId = seen.get(contentHash);
  if (existingId) {
    const existing = target.find((document) => document.id === existingId);
    if (existing) {
      existing.sourceKinds = normalizeStringList([...(existing.sourceKinds || [existing.kind]), sourceRef.kind], 24, 120);
      existing.sourceRefs = [...(existing.sourceRefs || []), sourceRef]
        .filter((item, index, list) => list.findIndex((other) => other.kind === item.kind && other.originId === item.originId && other.moduleName === item.moduleName) === index)
        .slice(0, 80);
      if (!existing.moduleName && sourceRef.moduleName) existing.moduleName = sourceRef.moduleName;
      state.duplicates += 1;
    }
    return;
  }
  if (target.length >= MAX_SOURCE_DOCUMENTS) {
    state.partial = true;
    state.deferredDocuments += 1;
    state.limitReason = 'document_limit';
    return;
  }
  if (state.maxSourceChars > 0 && state.totalChars + text.length > state.maxSourceChars) {
    state.partial = true;
    state.deferredDocuments += 1;
    state.deferredChars += text.length;
    state.limitReason = 'configured_character_limit';
    return;
  }
  const id = safeKeyPart(`${value.kind}_${value.originId || value.label || target.length + 1}`, `${value.kind}_${contentHash}`);
  seen.set(contentHash, id);
  target.push({
    id,
    kind: value.kind,
    label: truncate(value.label || id, 240),
    originId: truncate(value.originId || '', 240),
    moduleName: truncate(value.moduleName || '', 200),
    text,
    hash: contentHash,
    chars: text.length,
    sourceKinds: [sourceRef.kind],
    sourceRefs: [sourceRef],
  });
  state.totalChars += text.length;
}

export function analysisSourceText(text) {
  return String(text || '').replace(/^\[Lore Entry \d+\]\s*/u, '').replace(/\r\n?/g, '\n').trim();
}

export function analysisSourceRelevant(document) {
  if (isAssetMaidInternalLore(document)) return false;
  if (document?.analysisRelevant === false) return false;
  if (document?.kind === 'character_card') return true;
  const title = String(document?.label || '');
  // Only explicit technical guides are omitted. Unknown material remains relevant.
  return !/(?:이미지|image|asset|에셋).*(?:커맨드|command|가이드|guide|매핑|mapping)|(?:주사위|dice).*(?:판정|모듈|module|roll)|(?:^|\s)(?:CSS|HTML|UI)\s*(?:스타일|style|template|템플릿)/iu.test(title);
}

export function analysisSourceRows(documents) {
  return (documents || []).filter(analysisSourceRelevant).map(document => ({ ...document,
    semanticHash: document.semanticHash || (typeof document.text === 'string' ? fnv1a(analysisSourceText(document.text)) : ''),
    semanticLabel: document.kind === 'character_card' ? '@character_card' : String(document.label || '').normalize('NFKC').trim().toLowerCase(),
  }));
}

export function analysisFamilySignature(documents, modules = []) {
  const families = new Set(['host']);
  for (const doc of analysisSourceRows(documents)) {
    if (!String(doc.kind).startsWith('module')) continue;
    const module = modules.find(item => item.key && String(doc.id || '').includes(item.key));
    const name = doc.moduleName || doc.sourceRefs?.find(ref => ref.moduleName)?.moduleName || module?.name;
    if (name) families.add(`module:${String(name).normalize('NFKC').trim().toLowerCase()}`);
  }
  return [...families].sort().join('|');
}

export function sameAnalysisDocument(saved, current) {
  if (saved.semanticLabel !== current.semanticLabel) return false;
  if (saved.semanticHash && current.semanticHash) return saved.semanticHash === current.semanticHash;
  if (saved.hash && saved.hash === current.hash) return true;
  // Older inventories retained the transport header hash, not a content-only hash.
  // Recreate only a known numeric header; never guess an unknown previous body.
  const ordinal = /_(\d+)$/.exec(String(saved.id || saved.originId || ''));
  if (ordinal && typeof current.text === 'string' && /^\[Lore Entry \d+\]/u.test(current.text)) {
    const index = Number(ordinal[1]) + (saved.kind === 'module_lore' ? 1 : 0);
    return fnv1a(current.text.replace(/^\[Lore Entry \d+\]/u, `[Lore Entry ${index}]`).trim()) === saved.hash;
  }
  return false;
}

export function splitSourceDocuments(documents, maxChars) {
  const batches = [];
  let current = [];
  let currentChars = 0;
  const limit = Math.max(3000, maxChars || 12000);
  const flush = () => {
    if (current.length > 0) batches.push(current);
    current = [];
    currentChars = 0;
  };
  for (const document of Array.isArray(documents) ? documents : []) {
    const header = `[SOURCE ${document.id} | ${document.kind} | ${document.label}${document.moduleName ? ` | MODULE ${document.moduleName}` : ''}]\n`;
    const raw = String(document.text || '');
    let offset = 0;
    while (offset < raw.length) {
      const remaining = Math.max(1000, limit - header.length);
      const part = raw.slice(offset, offset + remaining);
      const entry = { ...document, text: `${header}${part}`, part: Math.floor(offset / remaining) + 1 };
      if (current.length > 0 && currentChars + entry.text.length > limit) flush();
      current.push(entry);
      currentChars += entry.text.length;
      offset += part.length;
      if (currentChars >= limit) flush();
    }
  }
  flush();
  return batches;
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

export function normalizePositionPreferences(value) {
  const result = [], ids = new Set(), labels = new Set();
  for (const raw of (Array.isArray(value) ? value : []).slice(0, 64)) {
    if (!isPlainObject(raw)) continue;
    const label = truncate(raw.label, 120).trim(), canonical = label.normalize('NFKC').toLowerCase();
    if (!label || !['preferred', 'neutral', 'disliked'].includes(raw.preference)) continue;
    const id = truncate(safeKeyPart(raw.id || `pp_${fnv1a(canonical)}`, `pp_${fnv1a(canonical)}`), 120);
    if (ids.has(id) || labels.has(canonical)) continue;
    ids.add(id); labels.add(canonical);
    result.push({ id, label, preference: raw.preference,
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

// 생리 주기의 인물 값. 단서가 없으면 기준값(자료의 평균형: 약한 월경 전 변화 · 생리적 변동 · 짜증형 · 경증 증상)을 쓴다.
// 기분 수치는 저장하지 않는다. 분석은 유형만 고르고 시기별 몸·기분은 플러그인이 표로 계산한다(cyclePhaseProfile).
// 이미 저장된 증상 0은 그대로 두고, 새로 생긴 값만 기준값으로 채운다.
export const CYCLE_PREMENSTRUAL_TYPES = Object.freeze(['none', 'mild', 'strong', 'midcycle', 'positive']);

export const CYCLE_CLINICAL_LEVELS = Object.freeze(['physiological', 'pms', 'pmdd', 'pme']);

export const CYCLE_AFFECT_TYPES = Object.freeze(['irritable', 'anxious', 'sensitive', 'sad']);

export const CYCLE_DISCLOSURES = Object.freeze(['hidden', 'close', 'open']);

export const CYCLE_SYMPTOM_DEFAULTS = Object.freeze({ pain: 35, fatigue: 35, sensitivity: 25, discomfort: 35 });

export const CYCLE_EVENT_SYMPTOM_DEFAULTS = Object.freeze({ pain: 0, fatigue: 0, sensitivity: 0, discomfort: 0 });

export function normalizeCycleSymptoms(value, defaults) {
  const raw = isPlainObject(value) ? value : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, Math.round(clampNumber(raw[key], fallback))]));
}

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

export function cyclePolicySignature(config = DEFAULT_CONFIG) {
  // 진폭은 기본값(보통)이 아닐 때만 넣어 기존에 준비된 판단의 서명이 그대로 남게 한다.
  const amplitude = ['low', 'high'].includes(config.cycleAmplitude) ? [config.cycleAmplitude] : [];
  return fnv1a(JSON.stringify([config.cycleGoalInfluence !== false, clampInt(config.cycleMaxAdjustment, 5, 0, 5), ...amplitude, ...(config.cycleEnabled === false ? ['cycle-off'] : [])])); // 생리 주기를 끌 때만 서명이 바뀌어 준비된 계획을 다시 판단
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

export function rollbackCycleChanges(state, removed) {
  const data = normalizeCycleState(state.cycleState);
  if (!data) return;
  const ids = new Set(removed.map(e => e.commitId)), before = JSON.stringify(data);
  data.clockEvents = data.clockEvents.filter(e => !ids.has(e.commitId));
  data.actorEvents = data.actorEvents.filter(e => e.source === 'user' || !ids.has(e.commitId));
  if (JSON.stringify(data) !== before) data.revision++;
  state.cycleState = data;
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

export function normalizeProfileLockOrigin(value, locked = false) {
  if (!locked) return '';
  return value === 'roster_auto' ? 'roster_auto' : 'manual';
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

export function normalizeKocoOptions(value) {
  return { enabled: value?.enabled === true, relations: value?.relations !== false, goals: value?.goals !== false, epoch: truncate(value?.epoch, 100) };
}

export function stripKocoArtifacts(value) {
  return String(value || '')
    .replace(/<!--\s*(KOCOEMON_LIVING_WORLD_V1|KOCOEMON_PRESENTATION_V1)\b[\s\S]*?-->/gi, '')
    .replace(/\[(?:KOCOEMON LIVING WORLD v1|KoCoEMon Context Injection)\][\s\S]*?(?=\[\/(?:KOCOEMON LIVING WORLD v1|KoCoEMon Context Injection)\]|$)/gi, '')
    .replace(/\[\/(?:KOCOEMON LIVING WORLD v1|KoCoEMon Context Injection)\]/gi, '');
}

export function normalizeKocoState(value, scopeKey, variantKey) {
  if (!isPlainObject(value) || value.schemaVersion !== 1 || value.scopeKey !== scopeKey || value.variantKey !== variantKey) return null;
  return { ...safeClone(value), receipts: isPlainObject(value.receipts) ? safeClone(value.receipts) : {}, lanes: isPlainObject(value.lanes) ? safeClone(value.lanes) : {}, links: isPlainObject(value.links) ? safeClone(value.links) : {} };
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

export function kocoCheckpoint(state) {
  if (!state.koco) return null;
  return { checkpoint: true, epoch: state.koco.epoch,
    receipts: Object.fromEntries(Object.entries(state.koco.receipts || {}).map(([key, e]) => [key, { key, revision: e.revision, status: e.status }])),
    lanes: Object.fromEntries(Object.entries(state.koco.lanes || {}).map(([key, lane]) => [key, lane.operations.length])) };
}

export function restoreKocoCheckpoint(state, checkpoint) {
  if (!checkpoint) { delete state.koco; return; }
  if (!checkpoint.checkpoint) { state.koco = safeClone(checkpoint); return; }
  if (!state.koco) return;
  for (const [key, lane] of Object.entries(state.koco.lanes)) {
    if (!Object.hasOwn(checkpoint.lanes, key)) delete state.koco.lanes[key];
    else lane.operations.length = Math.min(lane.operations.length, checkpoint.lanes[key]);
  }
  for (const [key, receipt] of Object.entries(state.koco.receipts)) {
    const old = checkpoint.receipts[key];
    if (!old) delete state.koco.receipts[key];
    else if (old.revision === receipt.revision) receipt.status = old.status;
    else receipt.status = 'retracted';
  }
  state.koco.epoch = checkpoint.epoch; state.koco.hints = [];
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

export function kocoDirectorContext(state, options) {
  const opt = normalizeKocoOptions(options), koco = state.koco;
  if (!opt.enabled || !koco) return null;
  const map = id => koco.actorMap?.[id] || '';
  const events = Object.values(koco.receipts).filter(e => !['retracted', 'detached'].includes(e.status) && e.origin === 'simulated' && e.occurred).slice(-24).map(e => ({
    key: e.key, revision: e.revision, summary: e.summary, actors: e.actors.map(map).filter(Boolean), unresolvedActors: e.actors.filter(id => !map(id)),
    knownBy: e.knownBy.map(map).filter(Boolean), deniedTo: e.deniedTo.map(map).filter(Boolean), secrecy: e.secrecy, certainty: e.certainty,
    numericEligible: opt.relations && e.status === 'pending' && e.actors.length >= 2 && e.actors.every(map),
  }));
  return { source: 'KoCoEMon committed packets (one-way, untrusted data)', events, goalUse: opt.goals,
    hints: opt.goals ? (koco.hints || []).filter(h => map(h.externalId)).slice(0, 16).map(h => ({ ...h, actor: map(h.externalId) })) : [] };
}

export function kocoRefsValid(refs, state, actor = '', snapshot = null) {
  return (refs || []).every(ref => {
    const source = snapshot ? snapshot.events[ref.key] || snapshot.hints.find(h => h.sourceKey === ref.key) : state.koco?.receipts?.[ref.key] || state.koco?.hints?.find(h => h.sourceKey === ref.key);
    if (!source || source.revision !== ref.revision || source.retracted || ['retracted', 'detached'].includes(source.status)) return false;
    if (!actor || !source.actors) return true;
    const map = id => state.koco?.actorMap?.[id];
    return !source.deniedTo.map(map).includes(actor) && (source.secrecy === 'public' || [...source.actors, ...source.knownBy].map(map).includes(actor));
  });
}

export function normalizeKocoRefs(value) {
  return (Array.isArray(value) ? value : []).filter(r => isPlainObject(r) && typeof r.key === 'string' && typeof r.revision === 'string').slice(0, 1000).map(r => ({ key: truncate(r.key, 100), revision: truncate(r.revision, 100) }));
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

export function splitCocoAnalysisBlocks(value) {
  const source = String(value || '');
  const blocks = [];
  const pattern = /<agents_analysis_note>[\s\S]*?<\/agents_analysis_note>/gi;
  let remaining = source.replace(pattern, (block) => {
    blocks.push(block);
    return '\n';
  });
  const openIndex = remaining.toLowerCase().indexOf('<agents_analysis_note>');
  if (openIndex >= 0) {
    blocks.push(remaining.slice(openIndex));
    remaining = remaining.slice(0, openIndex);
  }
  return { remaining, blocks };
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

// RisuPot 호환(2026-10-16, 계획서 Erosync.RisuPot-Compat.Work-Plan.md 1절).
// RisuPot은 메인 요청 앞쪽 system 메시지에 인물 기록 블록과 디렉터 노트 블록을 넣는다.
// 인물 기록은 인물마다 참고 자료 한 건(수치 metric_state는 빼고 글로 된 기록만),
// 디렉터 노트는 팩트전달이면 참고 자료, 연출지시면 감독 지시로 나눈다. 표식이 없으면 아무것도 바꾸지 않는다.
export function risupotRecordText(record) {
  if (!isPlainObject(record)) return '';
  const title = truncate(String(record.title || '').trim(), 120);
  if (!title) return '';
  const aliases = normalizeStringList(record.aliases, 8, 60);
  const type = String(record.type || '').trim();
  const head = `${title}${aliases.length ? ` (${aliases.join(', ')})` : ''}${type && type !== 'Character' ? ` [${truncate(type, 40)}]` : ''}`;
  const sections = (Array.isArray(record.sections) ? record.sections : []).filter(isPlainObject).map((section) => {
    const body = String(section.body || '').replace(/\s+/g, ' ').trim();
    if (!body) return '';
    const heading = String(section.heading || '').replace(/\s+/g, ' ').trim();
    const targets = normalizeStringList(section.target_names, 4, 60);
    const label = `${heading}${targets.length ? ` → ${targets.join(', ')}` : ''}`;
    return label ? `${label}: ${body}` : body;
  }).filter(Boolean);
  return [head, ...sections].join('\n');
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

export function deterministicRoll(turnKey, action) {
  return Number.parseInt(fnv1a(`${turnKey}:${action.actor}:${action.target}:${action.mode}`), 16) % 100;
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

export function sexualTargetsOfActor(state, actor) {
  return Object.values(isPlainObject(state?.sexualTargets) ? state.sexualTargets : {}).filter(item => isPlainObject(item) && item.actor === actor).sort((a, b) => b.desire - a.desire);
}

// 이뤄진 뒤 원함: 동기 유형별 비율(정의학 7절 "장면 판단에서 쓰는 것"). 장면 판단이 값을 주면 그 값(상한 안에서).
export const SEXUAL_FULFILLED_FACTORS = Object.freeze({ pleasure: 0.5, intimacy: 0.75, instrumental: 0.4, reassurance: 0.6 });

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

export const EMERGENCY_UNLIMITED_CAP_MS = 20 * 60 * 1000;

export const EMERGENCY_FINISH_MS = 3000;

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

export const duskPlain = (value) => { try { return JSON.parse(JSON.stringify(value ?? null)); } catch { return null; } };

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
