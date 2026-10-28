// AI로 제작(봇빌더 이식) 저장소 — 키는 전부 da_aibuild:* (봇빌더 원본 키와 분리).
// 직렬 쓰기 큐 + 설정·작업별 프롬프트·프리셋 작업공간·저장본 2개(자동/임시).
import { assert, clone } from './util.js';
import { restoreSnapshot, snapshot, TASKS } from './core.js';
import { validatePresetState } from './preset-engine.js';
import { DEFAULT_INPUT_CHARS, INPUT_LIMIT_VERSION, migrateInputSettings } from './limits.js';

export const STORE_PREFIX = 'da_aibuild:';
export const AUTOSAVE_MS = 18e4; // 자동저장 3분
export const DEFAULT_SETTINGS = { model: 'submodel', timeout: 300, maxInputChars: DEFAULT_INPUT_CHARS, inputLimitVersion: INPUT_LIMIT_VERSION, lore: 'auto', retry: true, loreByBot: {} };

export function normalizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}), ...migrateInputSettings(raw) };
  delete s.maxInputTokens; // 중간 작업본의 토큰 한도 설정은 글자·바이트 한도로 대체됨
  if (!['model', 'submodel'].includes(s.model)) s.model = 'submodel';
  if (!Number.isFinite(s.timeout) || s.timeout < 10 || s.timeout > 3600) s.timeout = 300;
  if (!['auto', 'dusk', 'plain'].includes(s.lore)) s.lore = 'auto';
  s.retry = s.retry !== false;
  // 봇마다 마지막으로 고른 로어북 방식 (dusk | plain), 최대 200개
  const by = s.loreByBot && typeof s.loreByBot === 'object' && !Array.isArray(s.loreByBot) ? s.loreByBot : {};
  s.loreByBot = Object.fromEntries(Object.entries(by).filter(([k, v]) => k && ['dusk', 'plain'].includes(v)).slice(-200));
  return s;
}

const parse = (raw) => {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

export function createAiStore(api) {
  let queue = Promise.resolve();
  const get = async (k) => parse(await api.pluginStorage.getItem(STORE_PREFIX + k));
  const set = (k, data) => {
    const text = JSON.stringify(data);
    const work = queue.catch(() => {}).then(() => api.pluginStorage.setItem(STORE_PREFIX + k, text));
    queue = work;
    return work;
  };
  const del = (k) => {
    const work = queue.catch(() => {}).then(() => api.pluginStorage.removeItem?.(STORE_PREFIX + k) ?? api.pluginStorage.setItem(STORE_PREFIX + k, ''));
    queue = work;
    return work;
  };
  return {
    async loadSettings() { return normalizeSettings(await get('settings')); },
    saveSettings: (s) => set('settings', normalizeSettings(s)),
    // 작업별 프롬프트(작업 편집 화면에서 바꾼 것). 없으면 기본값을 쓴다.
    async loadPrompts() {
      const out = {};
      await Promise.all(Object.keys(TASKS).map(async (task) => {
        const p = await get('prompt:' + task);
        if (p && typeof p.system === 'string' && typeof p.user === 'string') out[task] = p;
      }));
      return out;
    },
    savePrompt: (task, p) => set('prompt:' + task, { system: p.system, user: p.user }),
    resetPrompt: (task) => del('prompt:' + task),
    async loadPreset() {
      const raw = await get('preset-workspace');
      if (!raw) return null;
      return validatePresetState(raw);
    },
    savePreset: (state) => set('preset-workspace', state),
    // 저장본: 'autosave'(3분마다 자동) · 'manual'(임시 저장) 각 1개
    async readSlots() {
      const slots = {};
      for (const name of ['autosave', 'manual']) {
        const raw = await get(name);
        if (!raw) { slots[name] = null; continue; }
        try {
          const session = restoreSnapshot(raw);
          if (session.preset) session.preset = validatePresetState(session.preset);
          slots[name] = { ...raw, session };
        } catch (error) {
          slots[name] = { error: error.message, name: '읽을 수 없는 저장본' };
        }
      }
      return slots;
    },
    async saveSlot(name, session) {
      assert(['autosave', 'manual'].includes(name), '저장본 이름이 올바르지 않습니다.');
      const value = snapshot(session);
      await set(name, value);
      return value;
    },
    clearSlot: (name) => del(name),
    // 봇빌더 원본의 저장본/프롬프트/프리셋 JSON을 읽어 온다(붙여넣은 글자 또는 파일 내용).
    importBB(text) {
      const v = typeof text === 'string' ? JSON.parse(text) : text;
      assert(v && typeof v === 'object', 'JSON 형식이 아닙니다.');
      if (v.schemaVersion === 1 && v.session) return { kind: 'snapshot', value: v, session: restoreSnapshot(clone(v)) };
      if (typeof v.system === 'string' && typeof v.user === 'string') return { kind: 'prompt', value: v };
      if (v.schemaVersion === 1 && ['direct', 'preset'].includes(v.mode)) return { kind: 'preset', value: validatePresetState(v) };
      throw new Error('봇빌더 저장본·프롬프트·프리셋 중 어느 것인지 알 수 없는 JSON입니다.');
    }
  };
}
