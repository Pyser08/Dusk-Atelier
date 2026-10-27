// 출처: risupot 2.3.0 src/settings.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { normalizeTrackingSelections } from './auto-tracking.js';
import { normalizeCustomPrompts } from './custom-prompts.js';
import { HYPA_REFERENCE_DEFAULT_ITEMS, HYPA_REFERENCE_MAX_ITEMS } from './hypa-reference.js';
import { normalizeManualAIReferenceSettings } from './manual-ai-options.js';
import { assertSafeModelData, createModelPreset, validateModelPreset } from './model-options.js';
import { normalizePersonaNames } from './persona-name.js';
import { ROUTER_FIXED_LIMITS, routerFixedBotKey } from './router-fixed.js';
import { STAGE_CONTEXT_MAX, stageContextCount } from './stage-context.js';
import { WRITER_INPUT_BUDGET_DEFAULT, validateWriterInputBudget } from './writer-input-budget.js';

// its common settings and the auxiliary model switch in one place; update(mutator,{botCommon:true}) saves screen edits into the open bot's set.
// and useRisuSubmodel. The screen shows a bot without saved keywords as unchecked.
// saves and exports keep the raw value. Switching a bot off keeps its set; only an explicit delete removes it.

/** V10 (0.10.33): perception has OFF/LIGHT/ON modes, with a separate LIGHT default for relationship-only mode. */
const SETTINGS_KEY = 'risupot.settings';
const SCHEMA_VERSION = 16;
const FEATURE_IDS = ['affinity', 'register', 'perception', 'suspicion', 'openness', 'rhythm'];
const NUMERIC_FEATURES = ['affinity', 'suspicion', 'openness'];
const MODEL_STAGES = ['router', 'director', 'writer'];
const PROFILE_FIELDS = ['name', 'age', 'species', 'affiliation', 'appearance', 'summary'];
const SAMPLE_PROFILES = {
  ciel: { name: '시엘', age: '미상', species: '미상', affiliation: '무도회 참석자 · 소속 미상', appearance: '미기록', summary: '황궁 무도회에서 사용자와 교류한 인물.' },
  kyle: { name: '카일', age: '미상', species: '미상', affiliation: '기사단 · 직급 미상', appearance: '미기록', summary: '황궁 연회장 입구를 지키는 인물.' },
};

const cloneSettings = value => JSON.parse(JSON.stringify(value));
const settingsContent = ({ autoWriterEnabled: _autoWriterEnabled, writerSourceCheckEnabled: _writerSourceCheckEnabled, ...content }) => JSON.stringify(content);
const isSettingsRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const migrateRetiredModel = preset => {
  if (!preset || typeof preset.model !== 'string') return;
  if (preset.model === 'deepseek-v4-flash-vision-exp') preset.model = 'deepseek-v4-flash';
  if (preset.model === 'deepseek/deepseek-v4-flash-vision-exp') preset.model = 'deepseek/deepseek-v4-flash';
};

class SettingsError extends Error {
  constructor(code, message) { super(message); this.name = 'SettingsError'; this.code = code; }
}

function createDefaults() {
  return {
    enabled: true,
    autoWriterEnabled: true,
    writerSourceCheckEnabled: false,
    customPrompts: [],
    featuresByBot: {},
    routerFixedOffByBot: {},
    useRisuSubmodel: false,
    observerModeEnabled: false,
    commonByBot: {},
    routerFixedKeywords: '',
    routerFixedKeywordsByBot: {},
    trackedCharactersByScope: {},
    manualAIReferencesByScope: {},
    personaNamesByScope: {},
    writerSearchExistingLore: false,
    writerInputBudgetTokens: WRITER_INPUT_BUDGET_DEFAULT,
    relationshipOnlyMode: false,
    relationshipPerceptionMode: 'light',
    hypaReferenceEnabled: false,
    hypaPlusReferenceEnabled: true,
    directorMemoryLimit: HYPA_REFERENCE_DEFAULT_ITEMS,
    retrievalMode: 'keyword',
    directorRole: 'directing',
    stageContext: { router: 2, director: 2, writer: 2 },
    peopleProfileEnabled: true,
    npcRelationshipEnabled: true,
    sexualDesireEnabled: false,
    paraphiliaEnabled: false,
    explicitSexualStyleEnabled: false,
    traceRecordingMode: 'errors',
    tracePdfReferenceEnabled: true,
    features: {
      affinity: { enabled: true, numbers: true, increase: 1, decrease: 1 },
      register: { enabled: true, variety: 'off', change: 'ask', signLimit: 3 },
      perception: { enabled: true, mode: 'on' },
      suspicion: { enabled: true, numbers: false, increase: 1, decrease: 1 },
      openness: { enabled: false, numbers: true, increase: 1, decrease: 1, cycle: false, cycleRate: 1 },
      rhythm: { enabled: true },
    },
    models: { shared: createModelPreset('공통 보조 모델'), stages: Object.fromEntries(MODEL_STAGES.map(id => [id, { mode: 'shared', preset: createModelPreset(`${id} 전용 모델`) }])) },
    prompts: {},
    samples: { profiles: cloneSettings(SAMPLE_PROFILES), tones: {} },
  };
}

function settingsKeys(value, allowed, path) {
  if (!isSettingsRecord(value)) throw new SettingsError('invalid-data', `${path}: 객체가 필요합니다.`);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new SettingsError('invalid-data', `${path}: 지원하지 않는 항목이 있습니다.`);
  }
}

function settingsString(value, path) {
  if (typeof value !== 'string') throw new SettingsError('invalid-data', `${path}: 문자열이 필요합니다.`);
  return value;
}

function settingsBoolean(value, path) {
  if (typeof value !== 'boolean') throw new SettingsError('invalid-data', `${path}: ON/OFF 값이 필요합니다.`);
  return value;
}

function settingsPerceptionMode(value, path) {
  if (!['off', 'light', 'on'].includes(value)) throw new SettingsError('invalid-data', `${path}: OFF, 라이트, ON 중 하나가 필요합니다.`);
  return value;
}

function settingsMultiplier(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new SettingsError('invalid-data', `${path}: 0 이상의 유한한 숫자가 필요합니다.`);
  }
  return value;
}

function hydrateFeatureSet(target, rawFeatures, schemaVersion, label = '기능') {
    settingsKeys(rawFeatures, FEATURE_IDS, label);
    for (const [id, feature] of Object.entries(rawFeatures)) {
      const numeric = NUMERIC_FEATURES.includes(id);
      settingsKeys(feature, numeric ? ['enabled', 'numbers', 'increase', 'decrease', ...(id === 'openness' ? ['cycle', 'cycleRate'] : [])] : id === 'perception' && schemaVersion >= 5 ? ['enabled', 'mode'] : id === 'register' ? ['enabled', 'variety', 'change', 'signLimit'] : ['enabled'], id);
      if (id === 'register') {
        if (feature.variety !== undefined) { if (!['off', 'one', 'two'].includes(feature.variety)) throw new SettingsError('invalid-data', '말투 다변화 단계가 잘못되었습니다.'); target.register.variety = feature.variety; }
        if (feature.change !== undefined) { if (!['ask', 'auto'].includes(feature.change)) throw new SettingsError('invalid-data', '말투 변경 방식이 잘못되었습니다.'); target.register.change = feature.change; }
        if (feature.signLimit !== undefined) { if (!Number.isSafeInteger(feature.signLimit) || feature.signLimit < 1 || feature.signLimit > 9) throw new SettingsError('invalid-data', '말투 변화 조짐 횟수는 1~9의 정수여야 합니다.'); target.register.signLimit = feature.signLimit; }
      }
      if (id === 'openness') {
        if (feature.cycle !== undefined) target.openness.cycle = settingsBoolean(feature.cycle, '월경·임신 기록');
        if (feature.cycleRate !== undefined) { if (typeof feature.cycleRate !== 'number' || !Number.isFinite(feature.cycleRate) || feature.cycleRate < 0.5 || feature.cycleRate > 3) throw new SettingsError('invalid-data', '임신 확률 배수는 0.5~3 사이의 숫자여야 합니다.'); target.openness.cycleRate = feature.cycleRate; }
      }
      if (feature.enabled !== undefined) target[id].enabled = settingsBoolean(feature.enabled, `${id}.enabled`);
      if (id === 'perception' && feature.mode !== undefined) {
        target.perception.mode = settingsPerceptionMode(feature.mode, 'perception.mode');
        target.perception.enabled = target.perception.mode !== 'off';
      } else if (id === 'perception' && feature.enabled !== undefined) target.perception.mode = feature.enabled ? 'on' : 'off';
      if (numeric) {
        if (feature.numbers !== undefined) target[id].numbers = settingsBoolean(feature.numbers, `${id}.numbers`);
        for (const field of ['increase', 'decrease']) if (feature[field] !== undefined) target[id][field] = settingsMultiplier(feature[field], `${id}.${field}`);
      }
    }
  return target;
}
/** The feature set the given bot uses: its own set while switched on, otherwise the shared features. */
function risuSubmodelSettings(settings) {
  if (settings?.useRisuSubmodel !== true || !settings.models?.stages) return settings;
  const shared = { ...settings.models.shared, provider: 'risuai', baseUrl: '', model: 'RisuAI 보조모델', reasoningQuickSetting: 'default', vertexPaygoTier: 'default', extraBodyJson: '', receiveContextAsPdf: false }; delete shared.pdfMode;
  return { ...settings, models: { ...settings.models, shared, stages: Object.fromEntries(Object.entries(settings.models.stages).map(([stage, usage]) => [stage, { ...usage, mode: 'shared' }])) } };
}
// Common settings a bot may keep for itself. Model settings and useRisuSubmodel are never per bot.
const COMMON_BOT_KEYS = Object.freeze(['retrievalMode', 'directorRole', 'autoWriterEnabled', 'writerSourceCheckEnabled', 'hypaReferenceEnabled', 'hypaPlusReferenceEnabled', 'npcRelationshipEnabled', 'sexualDesireEnabled', 'paraphiliaEnabled', 'explicitSexualStyleEnabled', 'observerModeEnabled']);
function commonSettingsFor(settings, characterId) {
  const key = characterId ? routerFixedBotKey(String(characterId)) : '', own = key && settings?.commonByBot?.[key];
  return own?.active ? { ...settings, ...cloneSettings(own.values) } : settings;
}
export function featureSettingsFor(settings, characterId) {
  const key = characterId ? routerFixedBotKey(String(characterId)) : '', own = key && settings?.featuresByBot?.[key];
  return risuSubmodelSettings(commonSettingsFor(own?.active ? { ...settings, features: cloneSettings(own.features) } : settings, characterId));
}

/** Hydrates same-version partial fields; malformed and future versions never become defaults. */
function hydrateSettings(raw, { promptKeys = [] } = {}) {
  // createDefaults() stays OFF so saved settings that lack a key, validation and resets behave exactly as before.
  if (raw === null || raw === undefined) return { schemaVersion: SCHEMA_VERSION, revision: 0, settings: { ...createDefaults(), sexualDesireEnabled: true, paraphiliaEnabled: true, explicitSexualStyleEnabled: true } };
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); }
    catch { throw new SettingsError('invalid-json', '저장된 설정의 JSON을 읽지 못했습니다. 원본을 보존하고 저장을 잠급니다.'); }
  }
  if (!isSettingsRecord(raw) || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, SCHEMA_VERSION].includes(raw.schemaVersion)) {
    throw new SettingsError('unsupported-version', '지원하지 않는 설정 버전입니다. 원본을 보존하고 저장을 잠급니다.');
  }
  settingsKeys(raw, ['schemaVersion', 'revision', 'settings'], '설정');
  assertSafeModelData(raw);
  if (!Number.isSafeInteger(raw.revision) || raw.revision < 0) throw new SettingsError('invalid-data', '설정 revision이 잘못되었습니다.');
  settingsKeys(raw.settings, raw.schemaVersion < 4 ? ['enabled','relationshipOnlyMode','hypaReferenceEnabled','hypaPlusReferenceEnabled', 'autoApplyWiki', 'retrievalMode','peopleProfileEnabled','npcRelationshipEnabled','sexualDesireEnabled','paraphiliaEnabled','explicitSexualStyleEnabled','traceRecordingEnabled','traceRecordingMode','tracePdfReferenceEnabled', 'features', 'models', 'prompts', 'samples'] : raw.schemaVersion < 5 ? ['enabled','relationshipOnlyMode','hypaReferenceEnabled','hypaPlusReferenceEnabled', 'retrievalMode', 'peopleProfileEnabled','npcRelationshipEnabled','sexualDesireEnabled','paraphiliaEnabled','explicitSexualStyleEnabled','traceRecordingEnabled','traceRecordingMode','tracePdfReferenceEnabled', 'features', 'models', 'prompts', 'samples'] : [...(raw.schemaVersion >= 6 ? ['directorRole', 'stageContext'] : []),...(raw.schemaVersion >= 7 ? ['directorMemoryLimit'] : []),...(raw.schemaVersion >= 8 ? ['autoWriterEnabled','routerFixedKeywords'] : []),...(raw.schemaVersion >= 9 ? ['routerFixedKeywordsByBot'] : []),...(raw.schemaVersion >= 10 ? ['trackedCharactersByScope'] : []),...(raw.schemaVersion >= 11 ? ['manualAIReferencesByScope','writerInputBudgetTokens'] : []),...(raw.schemaVersion >= 12 ? ['personaNamesByScope','writerSearchExistingLore'] : []),...(raw.schemaVersion >= 13 ? ['writerSourceCheckEnabled','customPrompts'] : []),...(raw.schemaVersion >= 14 ? ['featuresByBot'] : []),...(raw.schemaVersion >= 15 ? ['routerFixedOffByBot','useRisuSubmodel','commonByBot'] : []),'observerModeEnabled','enabled','relationshipOnlyMode','relationshipPerceptionMode','hypaReferenceEnabled','hypaPlusReferenceEnabled', 'retrievalMode', 'peopleProfileEnabled','npcRelationshipEnabled','sexualDesireEnabled','paraphiliaEnabled','explicitSexualStyleEnabled','traceRecordingEnabled','traceRecordingMode','tracePdfReferenceEnabled', 'features', 'models', 'prompts', 'samples'], '설정 본문');
  const value = createDefaults();
  const input = raw.settings;
  if (input.enabled !== undefined) value.enabled = settingsBoolean(input.enabled, '리수폿 전체 사용');
  if (input.autoWriterEnabled !== undefined) value.autoWriterEnabled = settingsBoolean(input.autoWriterEnabled, 'RP 완료 후 자동 Writer');
  if(input.trackedCharactersByScope!==undefined){try{value.trackedCharactersByScope=normalizeTrackingSelections(input.trackedCharactersByScope);}catch(error){throw new SettingsError('invalid-data',error.message);}}
  if(input.manualAIReferencesByScope!==undefined){try{value.manualAIReferencesByScope=normalizeManualAIReferenceSettings(input.manualAIReferencesByScope);}catch(error){throw new SettingsError('invalid-data',error.message);}}
  if(input.customPrompts!==undefined){try{value.customPrompts=normalizeCustomPrompts(input.customPrompts);}catch(error){throw new SettingsError('invalid-data',error.message);}}
  if(input.writerSourceCheckEnabled!==undefined)value.writerSourceCheckEnabled=settingsBoolean(input.writerSourceCheckEnabled,'자동 Writer 본문 변경 검사');
  if(input.writerSearchExistingLore!==undefined)value.writerSearchExistingLore=settingsBoolean(input.writerSearchExistingLore,'기존 인물 Lorebook 검색');
  if(input.personaNamesByScope!==undefined){try{value.personaNamesByScope=normalizePersonaNames(input.personaNamesByScope);}catch(error){throw new SettingsError('invalid-data',error.message);}}
  if(input.writerInputBudgetTokens!==undefined){try{value.writerInputBudgetTokens=validateWriterInputBudget(input.writerInputBudgetTokens);}catch(error){throw new SettingsError('invalid-data',error.message);}}
  if (input.routerFixedKeywords !== undefined) {
    const text=settingsString(input.routerFixedKeywords,'Router 키워드 고정');
    if(text.length>2000)throw new SettingsError('invalid-data','Router 키워드 고정은 2,000자 이내로 입력해주세요.');
    value.routerFixedKeywords=text;
  }
  if(input.routerFixedKeywordsByBot!==undefined){
    const map=input.routerFixedKeywordsByBot;if(!isSettingsRecord(map)||Object.keys(map).length>ROUTER_FIXED_LIMITS.bots)throw new SettingsError('invalid-data','봇별 Router 키워드는 최대 512개 봇의 객체여야 합니다.');
    for(const[key,entry]of Object.entries(map)){
      let id='';try{if(key.startsWith('bot:'))id=decodeURIComponent(key.slice(4));}catch{}
      if(!id||routerFixedBotKey(id)!==key)throw new SettingsError('invalid-data','봇별 Router 키워드의 봇 ID가 잘못되었습니다.');
      const text=settingsString(entry,'봇별 Router 키워드');if(text.length>ROUTER_FIXED_LIMITS.inputChars)throw new SettingsError('invalid-data','봇별 Router 키워드는 각 4,000자 이내로 입력해주세요.');
      value.routerFixedKeywordsByBot[key]=text;
    }
  }
  if(input.useRisuSubmodel!==undefined)value.useRisuSubmodel=settingsBoolean(input.useRisuSubmodel,'RisuAI 보조모델 일괄 사용');
  if(input.observerModeEnabled!==undefined)value.observerModeEnabled=settingsBoolean(input.observerModeEnabled,'관찰자 모드');
  if(input.commonByBot!==undefined){
    const map=input.commonByBot;if(!isSettingsRecord(map)||Object.keys(map).length>ROUTER_FIXED_LIMITS.bots)throw new SettingsError('invalid-data','봇별 공통 설정은 최대 512개 봇의 객체여야 합니다.');
    for(const[key,entry]of Object.entries(map)){
      let id='';try{if(key.startsWith('bot:'))id=decodeURIComponent(key.slice(4));}catch{}
      if(!id||routerFixedBotKey(id)!==key)throw new SettingsError('invalid-data','봇별 공통 설정의 봇 ID가 잘못되었습니다.');
      settingsKeys(entry,['active','label','values'],'봇별 공통 설정');settingsKeys(entry.values,COMMON_BOT_KEYS,'봇별 공통 설정 값');
      const label=entry.label===undefined?'':settingsString(entry.label,'봇별 공통 설정 이름');if(label.length>200)throw new SettingsError('invalid-data','봇별 공통 설정 이름은 200자 이내여야 합니다.');
      const source=entry.values,values={};
      for(const name of COMMON_BOT_KEYS){
        if(name==='retrievalMode'){if(!['keyword','router'].includes(source[name]))throw new SettingsError('invalid-data','봇별 공통 설정의 검색 방식이 잘못되었습니다.');values[name]=source[name];}
        else if(name==='directorRole'){if(!['directing','facts'].includes(source[name]))throw new SettingsError('invalid-data','봇별 공통 설정의 Director 역할이 잘못되었습니다.');values[name]=source[name];}
        else if(name==='observerModeEnabled'&&source[name]===undefined)values[name]=false;
        else values[name]=settingsBoolean(source[name],'봇별 공통 설정 값');
      }
      if(values.hypaReferenceEnabled&&values.hypaPlusReferenceEnabled)values.hypaReferenceEnabled=false;
      value.commonByBot[key]={active:settingsBoolean(entry.active,'봇별 공통 설정 사용'),label:label.trim(),values};
    }
  }
  if(input.routerFixedOffByBot!==undefined){
    const map=input.routerFixedOffByBot;if(!isSettingsRecord(map)||Object.keys(map).length>ROUTER_FIXED_LIMITS.bots)throw new SettingsError('invalid-data','봇별 한정 키워드 끔 목록은 최대 512개 봇의 객체여야 합니다.');
    for(const[key,entry]of Object.entries(map)){
      let id='';try{if(key.startsWith('bot:'))id=decodeURIComponent(key.slice(4));}catch{}
      if(!id||routerFixedBotKey(id)!==key)throw new SettingsError('invalid-data','봇별 한정 키워드 끔 목록의 봇 ID가 잘못되었습니다.');
      if(entry!==true)throw new SettingsError('invalid-data','봇별 한정 키워드 끔 값은 true만 저장할 수 있습니다.');
      value.routerFixedOffByBot[key]=true;
    }
  }
  if (input.relationshipOnlyMode !== undefined) value.relationshipOnlyMode = settingsBoolean(input.relationshipOnlyMode, '서사관계 전용 모드');
  if (input.relationshipPerceptionMode !== undefined) value.relationshipPerceptionMode = settingsPerceptionMode(input.relationshipPerceptionMode, '서사관계 전용 지각·인지');
  if (input.hypaReferenceEnabled !== undefined) value.hypaReferenceEnabled = settingsBoolean(input.hypaReferenceEnabled, '하이파 참조');
  if (input.hypaPlusReferenceEnabled !== undefined) value.hypaPlusReferenceEnabled = settingsBoolean(input.hypaPlusReferenceEnabled, '하이파 플러스 참조');
  if(value.hypaReferenceEnabled&&value.hypaPlusReferenceEnabled)value.hypaReferenceEnabled=false;
  if(input.directorMemoryLimit!==undefined){if(!Number.isSafeInteger(input.directorMemoryLimit)||input.directorMemoryLimit<0||input.directorMemoryLimit>HYPA_REFERENCE_MAX_ITEMS)throw new SettingsError('invalid-data',`Director 하이파 참조 개수는 0~${HYPA_REFERENCE_MAX_ITEMS}의 정수여야 합니다.`);value.directorMemoryLimit=input.directorMemoryLimit;}
  if (input.retrievalMode !== undefined) { if (!['keyword','router'].includes(input.retrievalMode)) throw new SettingsError('invalid-data','Wiki 검색 방식이 잘못되었습니다.'); value.retrievalMode=input.retrievalMode; }
  if (input.peopleProfileEnabled !== undefined) value.peopleProfileEnabled = settingsBoolean(input.peopleProfileEnabled, '인물 기본정보 자동 생성');
  if (input.npcRelationshipEnabled !== undefined) value.npcRelationshipEnabled = settingsBoolean(input.npcRelationshipEnabled, '다른 NPC 간 감정·관계 기록');
  if (input.sexualDesireEnabled !== undefined) value.sexualDesireEnabled = settingsBoolean(input.sexualDesireEnabled, '성적 욕망');
  if (input.paraphiliaEnabled !== undefined) value.paraphiliaEnabled = settingsBoolean(input.paraphiliaEnabled, '이상성욕');
  if (input.explicitSexualStyleEnabled !== undefined) value.explicitSexualStyleEnabled = settingsBoolean(input.explicitSexualStyleEnabled, '발정 버전');
  if (input.traceRecordingMode !== undefined) { if(!['off','errors','all'].includes(input.traceRecordingMode))throw new SettingsError('invalid-data','Inspector 모델 실행 기록 모드가 잘못되었습니다.');value.traceRecordingMode=input.traceRecordingMode; }
  else if(input.traceRecordingEnabled!==undefined)value.traceRecordingMode=settingsBoolean(input.traceRecordingEnabled,'기존 Inspector 기록 설정')?'all':'off';
  if (input.tracePdfReferenceEnabled !== undefined) settingsBoolean(input.tracePdfReferenceEnabled, '기존 PDF Reference 전문 저장');
  if (input.features !== undefined) hydrateFeatureSet(value.features, input.features, raw.schemaVersion);
  if (input.featuresByBot !== undefined) {
    const map = input.featuresByBot; if (!isSettingsRecord(map) || Object.keys(map).length > ROUTER_FIXED_LIMITS.bots) throw new SettingsError('invalid-data', '봇별 기능 설정은 최대 512개 봇의 객체여야 합니다.');
    for (const [key, entry] of Object.entries(map)) {
      let id = ''; try { if (key.startsWith('bot:')) id = decodeURIComponent(key.slice(4)); } catch {}
      if (!id || routerFixedBotKey(id) !== key) throw new SettingsError('invalid-data', '봇별 기능 설정의 봇 ID가 잘못되었습니다.');
      settingsKeys(entry, ['active', 'label', 'features'], '봇별 기능 설정');
      const label = entry.label === undefined ? '' : settingsString(entry.label, '봇별 기능 설정 이름');
      if (label.length > 200) throw new SettingsError('invalid-data', '봇별 기능 설정 이름은 200자 이내여야 합니다.');
      if (!isSettingsRecord(entry.features)) throw new SettingsError('invalid-data', '봇별 기능 설정에 기능 목록이 필요합니다.');
      value.featuresByBot[key] = { active: settingsBoolean(entry.active, '봇별 기능 설정 사용'), label: label.trim(), features: hydrateFeatureSet(createDefaults().features, entry.features, raw.schemaVersion, '봇별 기능') };
    }
  }
  if (input.models !== undefined) {
    const legacy = raw.schemaVersion === 1;
    settingsKeys(input.models, legacy ? ['sharedName', 'stages'] : ['shared', 'stages'], '모델');
    if (legacy && input.models.sharedName !== undefined) value.models.shared.model = settingsString(input.models.sharedName, '기존 공통 모델 이름');
    if (!legacy && input.models.shared !== undefined) value.models.shared = validateModelPreset(input.models.shared);
    if (input.models.stages !== undefined) {
      settingsKeys(input.models.stages, MODEL_STAGES, '모델 단계');
      for (const [id, stage] of Object.entries(input.models.stages)) {
        settingsKeys(stage, legacy ? ['mode', 'name'] : ['mode', 'preset'], id);
        if (stage.mode !== undefined) {
          if (!['shared', 'dedicated'].includes(stage.mode)) throw new SettingsError('invalid-data', `${id}: 모델 모드가 잘못되었습니다.`);
          value.models.stages[id].mode = stage.mode;
        }
        if (legacy && stage.name !== undefined) value.models.stages[id].preset.model = settingsString(stage.name, `${id} 기존 모델 이름`);
        if (!legacy && stage.preset !== undefined) value.models.stages[id].preset = validateModelPreset(stage.preset);
      }
    }
  }
  migrateRetiredModel(value.models.shared);
  for (const stage of Object.values(value.models.stages)) migrateRetiredModel(stage.preset);
  if (input.directorRole !== undefined) {
    if (!['directing', 'facts'].includes(input.directorRole)) throw new SettingsError('invalid-data', 'Director 역할이 잘못되었습니다.');
    value.directorRole = input.directorRole;
  }
  if (input.stageContext !== undefined) settingsKeys(input.stageContext, MODEL_STAGES, '단계별 대화 범위');
  for (const stage of MODEL_STAGES) {
    const count = input.stageContext?.[stage] ?? (raw.schemaVersion<6?stageContextCount({...value, stageContext:null}, stage):value.stageContext[stage]);
    if (!Number.isSafeInteger(count) || count < 0 || count > STAGE_CONTEXT_MAX) throw new SettingsError('invalid-data', `단계별 대화 범위는 0~${STAGE_CONTEXT_MAX}의 정수여야 합니다.`);
    value.stageContext[stage] = count;
  }
  if (input.prompts !== undefined) {
    settingsKeys(input.prompts, promptKeys, '프롬프트');
    for (const [key, text] of Object.entries(input.prompts)) value.prompts[key] = settingsString(text, key);
  }
  if (input.samples !== undefined) {
    settingsKeys(input.samples, ['profiles', 'tones'], '예시 자료');
    if (input.samples.profiles !== undefined) {
      settingsKeys(input.samples.profiles, ['ciel', 'kyle'], '예시 프로필');
      for (const [id, profile] of Object.entries(input.samples.profiles)) {
        settingsKeys(profile, PROFILE_FIELDS, `예시 ${id}`);
        for (const [key, text] of Object.entries(profile)) value.samples.profiles[id][key] = settingsString(text, `예시 ${id}.${key}`);
        if (!value.samples.profiles[id].name.trim()) throw new SettingsError('invalid-data', '예시 인물 이름은 비울 수 없습니다.');
      }
    }
    if (input.samples.tones !== undefined) {
      settingsKeys(input.samples.tones, ['user', 'kyle'], '예시 말투');
      for (const [key, text] of Object.entries(input.samples.tones)) value.samples.tones[key] = settingsString(text, `예시 말투 ${key}`);
    }
  }
  return { schemaVersion: SCHEMA_VERSION, revision: raw.revision, settings: value };
}

/** One writer per instance, monotonically queued snapshots, no retries without an explicit action. */
class SettingsStore {
  constructor(storage, { promptKeys = [] } = {}) {
    this.storage = storage;
    this.promptKeys = [...promptKeys];
    this.value = createDefaults();
    this.revision = 0;
    this.savedRevision = 0;
    this.contentRevision = 0;
    this.savedContentRevision = 0;
    this.phase = 'idle';
    this.error = '';
    this.loaded = false;
    this.blocked = true;
    this.listeners = new Set();
    this.worker = null;
    this.loader = null;
  }
  snapshot() { const value = featureSettingsFor(cloneSettings(this.value), this.activeBotResolver?.() || ''); if (this.blocked) value.enabled = false; return value; }
  /** Stored value with shared features and every bot set as-is (saving, backups, exports). */
  rawSnapshot() { const value = cloneSettings(this.value); if (this.blocked) value.enabled = false; return value; }
  setActiveBotResolver(resolver) { this.activeBotResolver = typeof resolver === 'function' ? resolver : null; }
  forceRelationshipOnlyMode() { if (!this.loaded || this.blocked || this.value.relationshipOnlyMode) return this.snapshot(); this.value.relationshipOnlyMode = true; this.emit(); return this.snapshot(); }
  status() { return { phase: this.phase, error: this.error, loaded: this.loaded, blocked: this.blocked, dirty: this.revision > this.savedRevision, revision: this.revision, savedRevision: this.savedRevision, contentRevision: this.contentRevision, contentDirty: this.contentRevision > this.savedContentRevision }; }
  subscribe(listener) { this.listeners.add(listener); listener(this.status()); return () => this.listeners.delete(listener); }
  emit() { for (const listener of this.listeners) { try { listener(this.status()); } catch { console.error('리수폿 설정 상태 표시 오류'); } } }
  async load() {
    if (this.loader) return this.loader;
    if (this.loaded && !this.blocked) return this.snapshot();
    this.loader = (async () => {
      this.phase = 'loading'; this.error = ''; this.emit();
      try {
        const envelope = hydrateSettings(await this.storage.getItem(SETTINGS_KEY), { promptKeys: this.promptKeys });
        this.value = envelope.settings;
        this.revision = envelope.revision; this.savedRevision = envelope.revision;
        this.contentRevision = envelope.revision; this.savedContentRevision = envelope.revision;
        this.phase = 'ready'; this.loaded = true; this.blocked = false;
      } catch {
        this.phase = 'load-error'; this.error = '저장소 읽기 또는 설정 검증에 실패했습니다. 원본 설정을 보존합니다.';
        this.loaded = false; this.blocked = true;
      }
      this.emit(); return this.snapshot();
    })();
    try { return await this.loader; } finally { this.loader = null; }
  }
  update(mutator, { botCommon = false } = {}) {
    if (!this.loaded || this.blocked) throw new SettingsError('load-blocked', '저장된 설정을 먼저 정상적으로 읽어야 합니다. 읽기 재시도를 눌러주세요.');
    const next = cloneSettings(this.value);
    // Screen edits (botCommon) show and save the open bot's own common settings while its set is switched on; the shared values stay as they were.
    const botId = botCommon ? this.activeBotResolver?.() || '' : '', botKey = botId ? routerFixedBotKey(String(botId)) : '', ownCommon = botKey && this.value.commonByBot?.[botKey]?.active ? botKey : '';
    if (ownCommon) Object.assign(next, cloneSettings(this.value.commonByBot[ownCommon].values));
    mutator(next);
    if (ownCommon) { const entry = next.commonByBot?.[ownCommon]; for (const name of COMMON_BOT_KEYS) { if (entry?.active && entry.values) entry.values[name] = next[name]; next[name] = this.value[name]; } }
    if (this.revision >= Number.MAX_SAFE_INTEGER) throw new SettingsError('revision-limit', '설정 버전을 더 증가시킬 수 없습니다.');
    const validated = hydrateSettings({ schemaVersion: SCHEMA_VERSION, revision: this.revision + 1, settings: next }, { promptKeys: this.promptKeys });
    if (JSON.stringify(next) === JSON.stringify(this.value)) return this.snapshot();
    if (settingsContent(validated.settings) !== settingsContent(this.value)) this.contentRevision = validated.revision;
    this.value = validated.settings; this.revision = validated.revision;
    // An unresolved failure keeps its draft and waits for the visible Retry button.
    if (this.phase !== 'save-error') this.startSave();
    this.emit();
    return this.snapshot();
  }
  startSave() {
    if (this.worker || this.blocked || !this.loaded || this.revision === this.savedRevision) return;
    this.phase = 'saving'; this.error = '';
    this.worker = (async () => {
      while (this.savedRevision < this.revision) {
        const targetRevision = this.revision;
        const targetContentRevision = this.contentRevision;
        const envelope = { schemaVersion: SCHEMA_VERSION, revision: targetRevision, settings: cloneSettings(this.value) };
        try {
          await this.storage.setItem(SETTINGS_KEY, envelope);
          this.savedRevision = targetRevision;
          this.savedContentRevision = targetContentRevision;
          this.emit();
        } catch {
          this.phase = 'save-error'; this.error = '설정 저장에 실패했습니다. 입력 내용은 메모리에 유지됩니다.';
          this.emit(); return;
        }
      }
      this.phase = 'saved'; this.emit();
    })();
    this.worker.finally(() => {
      this.worker = null;
      if (this.phase !== 'save-error' && this.revision > this.savedRevision) this.startSave();
    });
  }
  async retry() {
    if (this.blocked) return this.load();
    if (this.phase === 'save-error') this.phase = 'ready';
    this.startSave(); this.emit();
    await this.flush();
    return this.snapshot();
  }
  async flush() {
    // New changes arriving during a write are coalesced into the next complete snapshot.
    while (this.worker) await this.worker;
    return this.status();
  }
}
