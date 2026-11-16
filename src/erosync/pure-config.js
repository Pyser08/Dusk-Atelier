// addon-rebuild 4단계: Erosync 순수 조각 — undefined. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { OPENCODE_GO_SESSION, createDefaultProviderProfiles } from "./pure-provider.js";
import { clampInt, fnv1a, normalizeStringList, safeKeyPart, truncate } from "./pure-util.js";

export const VERSION = '0.9.1';

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

export const DEVELOPMENT_SCHEMA = 1;

export const DEFAULT_SCENE_PROMPT_CHARS = 80000;

export const MAX_SCENE_PROMPT_CHARS = 300000;

export const MAX_INJECTION_CHARS = 7000;

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

// 마지막 실제 접촉(pairContact): 후보 인물 안에서 저장된 성적 목표 대상이나 활성 목표가 있는 방향 짝(행동 인물 → 대상; SFW는 목표 짝만)마다
// 두 사람 사이 마지막으로 실제 실행된 행동(두 방향 모두, 당신이 한 행동 포함)과 장부의 횟수(실제·부분·무시)·첫 턴을 한 줄로 보낸다. 기록 본문은 보내지 않는다.
export const PAIR_CONTACT_LIMIT = 24;

export const ANALYSIS_WORKFLOWS = Object.freeze(['roster', 'selected_lore', 'full']);

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

export function normalizeContentMode(value) {
  return value === 'sfw' ? 'sfw' : 'nsfw';
}

// 수위 상한을 적용한 극단성. 값이 없거나 수위가 "사용 안 함"이면 undefined(보내지 않음).
export function cappedExtremity(value, policy) {
  if (!Number.isFinite(value) || !policy || policy.extremityCap === null) return undefined;
  return Math.min(Math.round(value), policy.extremityCap);
}

export function openCodeGoHeaders(providerId) {
  return providerId === 'opencode_go' ? { 'x-opencode-session': OPENCODE_GO_SESSION, 'User-Agent': `Erosync/${VERSION}` } : {};
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

export function cyclePolicySignature(config = DEFAULT_CONFIG) {
  // 진폭은 기본값(보통)이 아닐 때만 넣어 기존에 준비된 판단의 서명이 그대로 남게 한다.
  const amplitude = ['low', 'high'].includes(config.cycleAmplitude) ? [config.cycleAmplitude] : [];
  return fnv1a(JSON.stringify([config.cycleGoalInfluence !== false, clampInt(config.cycleMaxAdjustment, 5, 0, 5), ...amplitude, ...(config.cycleEnabled === false ? ['cycle-off'] : [])])); // 생리 주기를 끌 때만 서명이 바뀌어 준비된 계획을 다시 판단
}

export const EMERGENCY_UNLIMITED_CAP_MS = 20 * 60 * 1000;

export const EMERGENCY_FINISH_MS = 3000;
