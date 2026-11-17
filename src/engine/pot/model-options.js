// 출처: risupot 2.3.0 src/model-options.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

/** Built-in provider and model options used by the settings UI. */
const DEFAULT_MAX_TOKENS = 8192;
const RISUAI_SUBMODEL_PROVIDER = 'risuai', RISUAI_SUBMODEL_LABEL = 'RisuAI 보조모델';
const PROVIDER_OPTIONS = [
  { value: RISUAI_SUBMODEL_PROVIDER, label: 'RisuAI 보조모델 (RisuAI 설정 사용)' },
  { value: 'openai', label: 'OpenAI' }, { value: 'google', label: 'Google' },
  { value: 'claude', label: 'Claude' }, { value: 'vertex-ai', label: 'Vertex AI' },
  { value: 'deepseek', label: 'DeepSeek' }, { value: 'ollama', label: 'Ollama (웹판은 Proxy 권장)' },
  { value: 'llmgateway', label: 'LLM Gateway' }, { value: 'openrouter', label: 'OpenRouter' }, { value: 'copilot', label: 'GitHub Copilot' }, { value: 'custom', label: 'Custom' },
  { value: 'custom2', label: 'Custom 2' }, { value: 'custom3', label: 'Custom 3' },
  { value: 'custom4', label: 'Custom 4' }, { value: 'custom5', label: 'Custom 5' },
  { value: 'custom6', label: 'Custom 6' },
];
export const PROVIDER_IDS = PROVIDER_OPTIONS.map(item => item.value);
const PROVIDER_DEFAULTS = {
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  copilot: { baseUrl: 'https://api.githubcopilot.com', model: 'gpt-4.1' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  google: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.5-flash-lite' },
  claude: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
  'vertex-ai': { baseUrl: 'https://aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/global/endpoints/openapi', model: 'google/gemini-3.5-flash-lite' },
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash' },
  ollama: { baseUrl: 'https://ollama.com/v1', model: 'gemini-3-flash-preview:cloud' },
  llmgateway: { baseUrl: 'https://api.llmgateway.io/v1', model: 'gpt-4o-mini' },
  risuai: { baseUrl: '', model: 'RisuAI 보조모델' },
};
const REASONING_OPTIONS = {
  risuai: ['default'],
  openrouter: ['default', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
  copilot: ['default', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
  openai: ['default', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
  google: ['default', 'none', 'minimal', 'low', 'medium', 'high'],
  'vertex-ai': ['default', 'low', 'medium', 'high'],
  deepseek: ['default', 'disabled', 'high', 'max'],
  claude: ['default', 'low', 'medium', 'high', 'xhigh', 'max'],
  ollama: ['default', 'none', 'low', 'medium', 'high'],
  llmgateway: ['default', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
};
function reasoningOptions(provider) { return [...(Object.hasOwn(REASONING_OPTIONS, provider) ? REASONING_OPTIONS[provider] : ['default'])]; }
class ModelSettingsError extends Error {
  constructor(message) { super(message); this.name = 'ModelSettingsError'; this.code = 'invalid-model-settings'; }
}
function isGeminiModelId(model) {
  return /(?:^|\/)gemini-[a-z0-9][a-z0-9._:-]*$/i.test(String(model || ''));
}
function isDeepSeekV4ModelId(model){return/(?:^|\/)deepseek-v4(?:-|$)/i.test(String(model||''));}
export function usesDeepSeekThinkingOff(preset){return Boolean(isDeepSeekV4ModelId(preset?.model)&&preset?.provider==='deepseek'&&preset?.reasoningQuickSetting==='disabled');}
export function createModelPreset(name = '', model = '') {
  return { name, provider: 'custom', baseUrl: '', model, temperature: 0.7, maxTokens: DEFAULT_MAX_TOKENS, contextWindow: 10, timeoutSeconds: 300, reasoningQuickSetting: 'default', vertexPaygoTier: 'default', extraBodyJson: '', receiveContextAsPdf: false };
}

const MODEL_PDF_MODES=Object.freeze(['none','reference','full']);
export function modelPdfMode(preset){if(preset?.pdfMode===undefined)return preset?.receiveContextAsPdf?'reference':'none';if(!MODEL_PDF_MODES.includes(preset.pdfMode))throw new ModelSettingsError('PDF 전송은 없음, 참고자료만, 전문 중에서 선택해주세요.');return preset.pdfMode;}

const modelRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const forbiddenObjectKeys = new Set(['__proto__', 'constructor', 'prototype']);
const secretBodyKeys = new Set(['apikey', 'authorization', 'proxyauthorization', 'password', 'clientsecret', 'privatekey', 'accesstoken', 'refreshtoken', 'secretkey', 'cookie', 'setcookie']);
function modelAssert(condition, message) { if (!condition) throw new ModelSettingsError(message); }

/** Validates JSON data recursively, without evaluating code or merging prototype-bearing objects. */
export function assertSafeModelData(value, depth = 0, seen = new Set()) {
  modelAssert(depth <= 64, 'JSON의 중첩이 너무 깊습니다.');
  if (typeof value === 'number') modelAssert(Number.isFinite(value), 'JSON 숫자는 유한해야 합니다.');
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return;
  modelAssert(typeof value === 'object' && !seen.has(value), '일반 JSON 데이터만 사용할 수 있습니다.');
  const proto = Object.getPrototypeOf(value);
  modelAssert(Array.isArray(value) || proto === Object.prototype || proto === null, '일반 JSON 객체만 사용할 수 있습니다.');
  seen.add(value);
  for (const key of Object.keys(value)) {
    modelAssert(!forbiddenObjectKeys.has(key), 'JSON에 허용되지 않는 객체 키가 있습니다.');
    assertSafeModelData(value[key], depth + 1, seen);
  }
  seen.delete(value);
}

export function parseExtraBodyJson(text) {
  modelAssert(typeof text === 'string', '추가 JSON은 텍스트여야 합니다.');
  let body;
  try { body = text.trim() ? JSON.parse(text) : {}; }
  catch { throw new ModelSettingsError('추가 JSON 문법이 올바르지 않습니다. 입력 내용을 확인해주세요.'); }
  modelAssert(modelRecord(body), '추가 JSON의 최상위 값은 객체여야 합니다.');
  assertSafeModelData(body);
  function checkSecrets(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, entry] of Object.entries(value)) {
      const compact = key.toLowerCase().replace(/[-_\s]/g, '');
      modelAssert(!secretBodyKeys.has(compact), '인증 정보는 추가 JSON에 저장할 수 없습니다. Provider 공통 키 영역을 사용해주세요.');
      checkSecrets(entry);
    }
  }
  checkSecrets(body);
  if (Object.hasOwn(body, '__headers')) {
    modelAssert(modelRecord(body.__headers), '__headers는 문자열 값의 헤더 객체여야 합니다.');
    for (const [name, value] of Object.entries(body.__headers)) {
      modelAssert(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name), '헤더 이름 형식이 올바르지 않습니다.');
      modelAssert(typeof value === 'string' && !/[\r\n\u0000]/.test(value), '헤더 값은 줄바꿈 없는 문자열이어야 합니다.');
      modelAssert(!/(authorization|cookie|api[-_]?key|token|secret)/i.test(name), '인증 헤더는 추가 JSON에 저장할 수 없습니다. Provider 공통 키 영역을 사용해주세요.');
    }
  }
  return body;
}

export function withoutDeepSeekThinkingOffFields(value){const body={...(typeof value==='string'?parseExtraBodyJson(value||''):value||{})},autoThinking=modelRecord(body.thinking)&&body.thinking.type==='disabled'&&Object.keys(body.thinking).length===1,autoFormat=modelRecord(body.response_format)&&body.response_format.type==='json_object'&&Object.keys(body.response_format).length===1;if(autoThinking&&autoFormat){delete body.thinking;delete body.response_format;}return body;}
function withoutDeepSeekThinkingOffJson(value){const original=String(value||''),parsed=parseExtraBodyJson(original),body=withoutDeepSeekThinkingOffFields(parsed);if(JSON.stringify(parsed)===JSON.stringify(body))return original;return Object.keys(body).length?JSON.stringify(body,null,2):'';}

function validateEndpoint(value) {
  modelAssert(typeof value === 'string', 'Endpoint는 문자열이어야 합니다.');
  if (value === '') return value;
  modelAssert(!/[\u0000-\u0020\u007f]/.test(value), 'Endpoint에는 공백이나 제어 문자를 넣을 수 없습니다.');
  let url;
  try { url = new URL(value); } catch { throw new ModelSettingsError('Endpoint는 올바른 http(s) URL이어야 합니다.'); }
  modelAssert(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password, 'Endpoint는 계정·비밀번호 없는 http(s) URL이어야 합니다.');
  modelAssert(!url.hash, 'Endpoint에 URL fragment는 사용할 수 없습니다.');
  for (const key of url.searchParams.keys()) modelAssert(!/(key|token|secret|password|auth)/i.test(key), 'Endpoint에 인증 정보를 넣지 마세요. Provider 공통 키 영역을 사용해주세요.');
  return value;
}

export function validateModelPreset(input) {
  modelAssert(modelRecord(input), '모델 설정은 객체여야 합니다.');
  assertSafeModelData(input);
  const output = createModelPreset();
  const fields = [...Object.keys(output),'copilotEngine','copilotFormat','pdfMode'];
  modelAssert(Object.keys(input).every(key => fields.includes(key)), '모델 설정에 지원하지 않는 항목이 있습니다.');
  for (const [key, value] of Object.entries(input)) output[key] = value;
  if(output.maxTokens===null)output.maxTokens=DEFAULT_MAX_TOKENS;
  // The RisuAI auxiliary model owns its endpoint, model, credentials and sampling; only name and timeout are RisuPot settings.
  if(output.provider===RISUAI_SUBMODEL_PROVIDER){output.baseUrl='';output.model=RISUAI_SUBMODEL_LABEL;output.reasoningQuickSetting='default';output.vertexPaygoTier='default';output.receiveContextAsPdf=false;delete output.pdfMode;}
  if(output.provider==='copilot'){output.copilotEngine??='vscode';output.copilotFormat??='auto';}else{delete output.copilotEngine;delete output.copilotFormat;}
  for (const key of ['name', 'provider', 'baseUrl', 'model', 'reasoningQuickSetting', 'vertexPaygoTier', 'extraBodyJson']) modelAssert(typeof output[key] === 'string', '모델 텍스트 항목의 형식이 잘못되었습니다.');
  modelAssert(PROVIDER_IDS.includes(output.provider), '지원하는 Provider를 선택해주세요.');
  validateEndpoint(output.baseUrl);
  modelAssert(typeof output.temperature === 'number' && Number.isFinite(output.temperature) && output.temperature >= 0, 'Temperature는 0 이상의 유한한 숫자여야 합니다.');
  modelAssert(Number.isSafeInteger(output.maxTokens) && output.maxTokens > 0, 'Max Tokens는 1 이상의 정수여야 합니다.');
  modelAssert(Number.isSafeInteger(output.contextWindow) && output.contextWindow >= 1, 'Context Window는 최근 대화 메시지 개수로, 1 이상의 정수여야 합니다.');
  modelAssert(Number.isSafeInteger(output.timeoutSeconds) && output.timeoutSeconds >= 30 && output.timeoutSeconds <= 900, '호출 제한시간은 30~900초 정수여야 합니다.');
  modelAssert(reasoningOptions(output.provider).includes(output.reasoningQuickSetting), '현재 Provider에 맞는 Reasoning Quick Setting을 직접 선택해주세요.');
  modelAssert(['default', 'flex'].includes(output.vertexPaygoTier), 'Vertex PayGo Tier 값이 잘못되었습니다.');
  modelAssert(output.provider!=='copilot'||['vscode','opencode'].includes(output.copilotEngine), 'Copilot 연결 방식이 잘못되었습니다.');
  modelAssert(output.provider!=='copilot'||['auto','openai','responses','anthropic'].includes(output.copilotFormat), 'Copilot 요청 형식이 잘못되었습니다.');
  parseExtraBodyJson(output.extraBodyJson);
  modelAssert(typeof output.receiveContextAsPdf === 'boolean', '참고자료 PDF 옵션은 ON/OFF 값이어야 합니다.');
  const pdfMode=(!isGeminiModelId(output.model)||output.provider==='copilot')?'none':modelPdfMode(output);
  if(input.pdfMode!==undefined){modelAssert(MODEL_PDF_MODES.includes(input.pdfMode),'PDF 전송 모드가 잘못되었습니다.');output.pdfMode=pdfMode;}
  output.receiveContextAsPdf=pdfMode!=='none';
  if(!usesDeepSeekThinkingOff(output))output.extraBodyJson=withoutDeepSeekThinkingOffJson(output.extraBodyJson);
  return output;
}
const MODEL_SEED_CATALOG = {
      openrouter: ['openai/gpt-4o-mini'],
      copilot: ['gpt-4.1'],
      ollama: [
        'gemini-3-flash-preview:cloud',
        'deepseek-v4-pro:cloud',
        'deepseek-v4-flash:cloud',
        'kimi-k2.6:cloud',
        'gemma4:31b-cloud',
        'qwen3.5:cloud',
        'qwen3.5:397b-cloud',
        'glm-5.1:cloud',
        'minimax-m2.7:cloud',
        'nemotron-3-super:cloud',
        'glm-5:cloud',
        'minimax-m2.5:cloud',
        'qwen3-coder-next:cloud',
        'deepseek-v3.2:cloud',
      ],
      openai: [
        'gpt-4o-mini',
        'gpt-5.5',
        'gpt-5.4',
        'gpt-5.4-mini',
        'gpt-5.4-nano',
        'gpt-5.2',
        'gpt-5.2-pro',
        'gpt-5.1',
        'gpt-5',
        'gpt-5-pro',
        'gpt-5-mini',
        'gpt-5-nano',
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4.1-nano',
      ],
      deepseek: [
        'deepseek-v4-flash',
        'deepseek-v4-pro',
      ],
      claude: [
        'claude-opus-4-7',
        'claude-sonnet-4-6',
        'claude-haiku-4-5-20251001',
        'claude-opus-4-1-20250805',
        'claude-opus-4-20250514',
        'claude-sonnet-4-20250514',
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
      ],
      google: [
        'gemini-3.1-pro-preview',
        'gemini-3-flash-preview',
        'gemini-3.5-flash-lite',
        'gemini-3.7-flash',
        'gemini-3.8-flash',
      ],
      'vertex-ai': [
        'google/gemini-3.1-pro-preview',
        'google/gemini-3-flash-preview',
        'google/gemini-3.5-flash-lite',
        'google/gemini-3.7-flash',
        'google/gemini-3.8-flash',
      ],
      // LLM Gateway는 여러 프로바이더를 한 키로 라우팅합니다. 'openai/...' 접두 형식도 지원하며
      // 전체 목록은 연결 테스트(/models)로 확인할 수 있습니다. 아래는 대표 시드입니다.
      llmgateway: [
        'gpt-4o-mini',
        'gpt-5-mini',
        'openai/gpt-5',
        'anthropic/claude-sonnet-4-6',
        'deepseek-v4-flash',
        'deepseek-v4-pro',
        'gemini-3.1-pro-preview',
        'gemini-3-flash-preview',
        'gemini-3.5-flash-lite',
        'gemini-3.7-flash',
        'gemini-3.8-flash',
      ],
    };
