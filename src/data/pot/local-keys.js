// 출처: risupot 2.3.0 src/local-keys.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { PROVIDER_IDS, assertSafeModelData } from '../../engine/pot/model-options.js';

const LOCAL_KEYS_KEY = 'risupot.provider-keys';
const LOCAL_KEYS_VERSION = 1;

class LocalKeyError extends Error {
  constructor(message) { super(message); this.name = 'LocalKeyError'; this.code = 'local-key-error'; }
}

function validateCredential(provider, text) {
  if (!PROVIDER_IDS.includes(provider)) throw new LocalKeyError('지원하는 Provider를 선택해주세요.');
  if (typeof text !== 'string' || !text.trim() || /^[*•●·…\s]+$/.test(text)) throw new LocalKeyError('새 인증 정보를 직접 입력해주세요. 빈칸이나 마스크는 저장하지 않습니다.');
  const trimmed = text.trim();
  if (provider === 'vertex-ai') {
    let parsed;
    try { parsed = JSON.parse(trimmed); assertSafeModelData(parsed); }
    catch { throw new LocalKeyError('Vertex 인증 정보는 올바른 서비스 계정 JSON이어야 합니다.'); }
    if (!parsed || Array.isArray(parsed) || parsed.type !== 'service_account' || !['project_id', 'client_email', 'private_key'].every(key => typeof parsed[key] === 'string' && parsed[key].trim())) {
      throw new LocalKeyError('Vertex 서비스 계정 JSON의 type, project_id, client_email, private_key를 확인해주세요.');
    }
  } else if (/[\r\n\u0000]/.test(trimmed)) {
    throw new LocalKeyError('API 키에는 줄바꿈을 넣을 수 없습니다.');
  }
  return trimmed;
}

/** V2 (0.10.11): plaintext leaves the local store only through the user's explicit full-backup action. */
class LocalKeyStore {
  #values = {};
  #savedValues = {};
  #backend = null;
  constructor(api) {
    this.api = api;
    this.backendName = '';
    this.phase = 'idle'; this.blocked = true; this.loaded = false;
    this.revision = 0; this.savedRevision = 0;
    this.worker = null; this.loader = null; this.error = '';
    this.listeners = new Set();
  }
  status() {
    return { phase: this.phase, blocked: this.blocked, loaded: this.loaded, dirty: this.revision > this.savedRevision, error: this.error, backend: this.backendName, providers: Object.keys(this.#savedValues) };
  }
  has(provider) { return Object.hasOwn(this.#savedValues, provider); }
  exportPlaintextBackup(){if(!this.loaded||this.blocked)throw new LocalKeyError('전체 백업 전에 로컬 API 키 저장소를 정상적으로 불러와야 합니다.');return{...this.#savedValues};}
  validateBackup(input){if(!input||typeof input!=='object'||Array.isArray(input))throw new LocalKeyError('백업 API 키 형식이 잘못되었습니다.');assertSafeModelData(input);const values={};for(const[provider,text]of Object.entries(input))values[provider]=validateCredential(provider,text);return values;}
  async use(provider, callback) {
    if (!PROVIDER_IDS.includes(provider) || typeof callback !== 'function' || !this.loaded || this.blocked || !this.#savedValues[provider]) throw new LocalKeyError('이 Provider의 로컬 인증 정보를 사용할 수 없습니다.');
    return await callback(this.#savedValues[provider]);
  }
  subscribe(listener) { this.listeners.add(listener); listener(this.status()); return () => this.listeners.delete(listener); }
  emit() { for (const listener of this.listeners) { try { listener(this.status()); } catch { /* Never log credentials or errors containing them. */ } } }
  async load() {
    if (this.loader) return this.loader;
    if (this.loaded && !this.blocked) return this.status();
    this.loader = (async () => {
      this.phase = 'loading'; this.error = ''; this.emit();
      try {
        if (!this.#backend) {
          if (typeof this.api.getLocalPluginStorage === 'function') {
            const local = await this.api.getLocalPluginStorage();
            if (!local || typeof local.getItem !== 'function' || typeof local.setItem !== 'function') throw new Error();
            this.#backend = { read: async key => await local.getItem(key), write: async (key, value) => { await local.setItem(key, value); } };
            this.backendName = 'localPluginStorage';
          } else {
            const local = this.api.safeLocalStorage;
            if (!local || typeof local.getItem !== 'function' || typeof local.setItem !== 'function') throw new Error();
            this.#backend = { read: async key => await local.getItem(key), write: async (key, value) => { await local.setItem(key, JSON.stringify(value)); } };
            this.backendName = 'safeLocalStorage';
          }
        }
        let raw = await this.#backend.read(LOCAL_KEYS_KEY);
        if (typeof raw === 'string') raw = JSON.parse(raw);
        if (raw === null || raw === undefined) raw = { schemaVersion: LOCAL_KEYS_VERSION, revision: 0, keys: {} };
        assertSafeModelData(raw);
        if (!raw || Array.isArray(raw) || raw.schemaVersion !== LOCAL_KEYS_VERSION || Object.keys(raw).some(key => !['schemaVersion', 'revision', 'keys'].includes(key)) || !Number.isSafeInteger(raw.revision) || raw.revision < 0 || !raw.keys || typeof raw.keys !== 'object' || Array.isArray(raw.keys)) throw new Error();
        const values = {};
        for (const [provider, text] of Object.entries(raw.keys)) values[provider] = validateCredential(provider, text);
        this.#values = values; this.#savedValues = { ...values };
        this.revision = raw.revision; this.savedRevision = raw.revision;
        this.loaded = true; this.blocked = false; this.phase = 'ready';
      } catch {
        this.loaded = false; this.blocked = true; this.phase = 'load-error';
        this.error = '로컬 키 저장소를 읽거나 검증하지 못했습니다. 키 저장은 잠기며 일반 설정 저장소로 옮기지 않습니다.';
      }
      this.emit(); return this.status();
    })();
    try { return await this.loader; } finally { this.loader = null; }
  }
  assertWritable() {
    if (!this.loaded || this.blocked) throw new LocalKeyError('로컬 키 저장을 사용할 수 없습니다. 읽기 재시도 후 다시 확인해주세요.');
    if (this.revision >= Number.MAX_SAFE_INTEGER) throw new LocalKeyError('로컬 키 저장 버전을 더 증가시킬 수 없습니다.');
  }
  async set(provider, text) {
    this.assertWritable();
    const value = validateCredential(provider, text);
    if (this.#values[provider] === value) return this.status();
    this.#values = { ...this.#values, [provider]: value }; this.revision++;
    if (this.phase !== 'save-error') this.startSave();
    this.emit(); await this.flush(); return this.status();
  }
  async remove(provider) {
    this.assertWritable();
    if (!PROVIDER_IDS.includes(provider)) throw new LocalKeyError('지원하는 Provider를 선택해주세요.');
    if (!Object.hasOwn(this.#values, provider)) return this.status();
    const next = { ...this.#values }; delete next[provider]; this.#values = next; this.revision++;
    if (this.phase !== 'save-error') this.startSave();
    this.emit(); await this.flush(); return this.status();
  }
  async replaceAllFromBackup(input){this.assertWritable();const values=this.validateBackup(input);this.#values={...values};this.revision++;if(this.phase!=='save-error')this.startSave();this.emit();await this.flush();if(this.phase==='save-error')throw new LocalKeyError('백업 API 키를 로컬 저장소에 저장하지 못했습니다.');return this.status();}
  startSave() {
    if (this.worker || this.blocked || this.revision === this.savedRevision) return;
    this.phase = 'saving'; this.error = '';
    this.worker = (async () => {
      while (this.savedRevision < this.revision) {
        const revision = this.revision;
        const values = { ...this.#values };
        try {
          await this.#backend.write(LOCAL_KEYS_KEY, { schemaVersion: LOCAL_KEYS_VERSION, revision, keys: values });
          this.#savedValues = values; this.savedRevision = revision; this.emit();
        } catch {
          this.phase = 'save-error'; this.error = '로컬 키 저장 실패 · 입력한 변경을 메모리에 유지했습니다. 저장 다시 시도를 눌러주세요.';
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
    this.startSave(); this.emit(); await this.flush(); return this.status();
  }
  async flush() { while (this.worker) await this.worker; return this.status(); }
}
