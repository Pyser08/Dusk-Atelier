// addon-rebuild 4단계: Erosync 순수 조각 — AI 제공자 요청 모양·응답 꺼내기·오류 분류. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { clampInt, isPlainObject, normalizeStringList, optionalNumber, parseJsonRecord, truncate } from "./pure-util.js";

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
