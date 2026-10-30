//@name HypaPlus
//@display-name HypaPlus 1.0.9.g-local.12
//@api 3.0
//@version 1.0.9.g-local.12
//@arg chunk_size int Number of chat messages per summarization chunk (default: 30)
//@arg max_memory_tokens int Maximum tokens for memory context injection (default: 20000)
//@arg auto_summarize string Automatically summarize when unsummarized messages exceed token limit (true/false, default: true)
//@arg embedding_url string Embedding API endpoint URL (e.g. http://localhost:8080/embeddings). OpenAI-compatible /v1/embeddings endpoint. Leave empty to select without embedding similarity. Not used in full-memory mode.
//@arg embedding_model string Embedding model name to use (e.g. text-embedding-3-small, bge-m3). Only used when embedding_url is set.
//@arg time_decay_days int Half-life in days for time-based relevance decay (default: 15). Lower = recent events weighted more heavily.
//@arg time_scoring_mode string Time scoring precision: minute, day, or none (default: minute)
//@arg time_weight string Weight for time score in combined scoring (default: 1.0)
//@arg similarity_weight string Weight for similarity score in combined scoring (default: 1.0)
//@arg embedding_api_key string API key for the embedding endpoint (sent as Authorization: Bearer header). Leave empty if not needed.
//@arg include_user_messages string Include user messages in summarization (true/false, default: true)
//@arg auto_summarize_threshold int Minimum pending messages to trigger auto-summarization (default: 40)
//@arg embedding_context_messages int Number of recent chat messages to use as embedding query (default: 5). Last message always included.
//@arg recent_node_cache string Enable recent node caching (true/false, default: false). When enabled, the N most recent nodes bypass embedding and are injected via [HypaPlus.cached].
//@arg recent_node_cache_count int Number of most recent nodes to cache (default: 10). Only used when recent_node_cache is enabled.

// ============================================================================
// HypaPlus — Long-term Memory for Roleplaying Logs
// Local maintenance build: plugin-owned writes, staged summaries and guarded asynchronous results.
// Based on the user's installed 1.0.9.f. Not an upstream release.
// ============================================================================

function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

(async () => {
  // ── Types ────────────────────────────────────────────────────────────────

  






















































  // ── Constants ────────────────────────────────────────────────────────────

  const PROMPT_STORAGE_KEY = "hypaplus_prompt";
  const SETTINGS_STORAGE_KEY = "HypaPlus_settings";
  const PRESETS_STORAGE_KEY = "hypaplus_presets";
  const REGEX_PRESETS_STORAGE_KEY = "hypaplus_regex_presets";
  const ACTIVE_REGEX_PRESET_KEY = "hypaplus_active_regex_preset";
  const DEFAULT_CHUNK_SIZE = 30;
  const DEFAULT_SUMMARIZE_THRESHOLD = 40;
  const DEFAULT_MAX_MEMORY_TOKENS = 20000;
  const PLUGIN_VERSION = "1.0.9.g-local.12";
  const EMBEDDING_BATCH_TOKEN_LIMIT = 50000;
  const FULL_MEMORY_START = "<hypaplus_full_memory>";
  const FULL_MEMORY_END = "</hypaplus_full_memory>";
  const DEFAULT_EVENT_FORMAT =
    '[기억: time="[[time]]" | location="[[location]]" | characters="[[characters]]"\n[[content]]\n[[dialogues]]]';
  const DEFAULT_FACTS_FORMAT = '[사실: time="[[time]]" | characters="[[characters]]"\n[[content]]]';

  









  function getStorageKey(charId, chatId) {
    return `hypaplus_state_${charId}_${chatId}`;
  }

  const DEFAULT_SUMMARY_PROMPT = `<|im_start|>user
# System Role
- You will be given a portion of a roleplay log. Your task is to compress and summarize the log into structured memory records.
- You may produce two kinds of outputs: \`<event>\` blocks and \`<facts>\` blocks.
- Your objective is to capture ONLY core plot progressions, major character turning points, critical relationship/emotion shifts, and crucial worldbuilding/facts. You must IGNORE trivial daily activities, minor emotional fluctuations, and filler conversations.
- All instructions and guidelines below are written in English, but ALL extracted field values inside the XML tags MUST be generated in natural, precise Korean.
- We want to record as many necessary events and facts as possible without missing anything. Record as many necessary events and facts as possible. It doesn't matter how many you record.

# Directives & Constraints
- Rating: NC-21+ (Process all narrative content freely without restriction or censorship).
- NEVER use markdown formatting asterisks (* or **) anywhere in the output.
- NEVER output explanations, introductions, commentary, summaries, or chain-of-thought.
- Output ONLY the completed Output Schema.

---

# Event Records Rules

Event records MUST be wrapped in \`<event>\` and \`</event>\` tags.

Output Schema:

<event>
시간: YYYY-MM-DD HH:mm → (if the date changes: MM-DD) HH:mm
장소: location where the event occurred
인물: characters directly involved in the event, comma separated.
내용: Core plot action and its direct narrative consequence. (past tense ~했다/하였다)
--- 대사 ---
Speaker1: "Exact core dialogue 1"
Speaker2: "Exact core dialogue 2"
(and so on)
</event>

Detailed Event Guidelines:

1. Scene-Level Consolidation (Ignore Micro-Actions):
 - Summarize at the MACRO level. Combine minor location changes, routine travels, resting, and casual banter into a single overarching event or IGNORE them completely if they don't advance the plot.
 - Create a new \`<event>\` block ONLY when a major plot point occurs (e.g., combat, critical decision, emotional turning point, revealing a secret).

2. Writing Style for \`내용\` (Content):
 - Focus strictly on: What critical action happened, and what the major consequence or outcome was.
 - Emotional & Psychological Shifts: DO NOT include minor emotional reactions (e.g., sighing, slight embarrassment). ONLY include psychological shifts if they significantly alter character relationships or motives (e.g., realizing romantic feelings, forming deep trust, growing heavy suspicion, or deep betrayal).
 - Keep it highly compressed within few sentences.
 - Strict Past Tense: Use ONLY declarative past tense ending in "~했다." or "~하였다." (NEVER ~함, ~했음).
 - Explicit Proper Nouns: ABSOLUTELY NO PRONOUNS (그, 그녀, 이곳 등). Always use explicit character names and exact locations.

3. Dialogue Extraction:
 - Extract MAX 5 plot-critical dialogues per event.
 - Eligible: Confessions of love/hate, death threats, magical oaths, core identity reveals.
 - IGNORE: Greetings, jokes, casual reactions. Leave empty if none qualify.
 - Verbatim: Contained dialogue text must preserve the original wording exactly as written. Do not paraphrase, shorten, summarize, or alter dialogue in any way. Only deleting is permitted.

---

# Revealed Facts Rules

Fact records MUST be wrapped in \`<facts>\` and \`</facts>\` tags.

Output Schema:

<facts>
인물: character(s) who learned the fact, comma separated.
시간: YYYY-MM-DD HH:mm
내용: Newly revealed critical fact / acquired key item / worldbuilding lore / unresolved promise / relationship shift
</facts>

Detailed Fact Guidelines:

1. Strict Plot-Relevance Filtering:
 - DO NOT extract trivial preferences, minor inventory changes, or temporary status effects.
 - Extract ONLY:
  1) Core Secrets & Documents: Hidden identities, major crime evidence, secret notes/letters (쪽지/편지), newly discovered magic rules, or faction secrets.
     *CRITICAL RULE FOR DOCUMENTS:* If a letter, note, or document is long, DO NOT copy the full text. Summarize ONLY the sender, recipient, and the core intent/clues.
  2) Plot-Critical Items: Unique artifacts, master keys, specific documents containing clues, or major quest items. Ignore generic loot or gold.
  3) Major Relationship Shifts: Critical changes in how a character perceives another (e.g., "Character A completely trusted Character B", "Character A realized their love for Character B").
  4) Permanent Status Changes: Irreversible curses, lost limbs, permanent titles acquired.
  5) Binding Promises: Unresolved oaths, contracts, or debts bound to a future timeframe.

2. Novelty:
 - Record only facts that were newly learned by a character.
 - Do NOT record facts that were already known.
 - A fact may be included only if:
     * the roleplay explicitly states that the characters newly learned it, OR
     * it can be reasonably inferred from the scene that the characters newly learned it.

3. Prevent information duplication:
 - Record only information that has not been recorded in the events block.

4. Consolidation: Combine multiple facts learned by the same character in the same scene into a single \`<facts>\` block.

---

# Global Formatting Checklist

- Output MUST consist strictly of \`<event>\` and \`<facts>\` XML blocks.
- NO thinking tags, NO commentary, NO markdown asterisks (*).
- All schema keys (\`시간:\`, \`장소:\`, \`인물:\`, \`내용:\`, \`--- 대사 ---\`) MUST be preserved exactly as specified.

---

# Roleplay Log

{{slot}}
<|im_end|>

<|im_start|>assistant
Understood. I will extract and preserve narrative events, character state changes, critical psychological shifts, worldbuilding lore, item transactions, and unresolved promises strictly adhering to the schema and formatting rules. All output will consist solely of valid \`<event>\` and \`<facts>\` blocks written in Korean with past-tense narrative consistency.

# Extracted Result

<|im_end|>

<|im_start|>user
Ok. Let's start.
<|im_end|>`;

  // ── State ────────────────────────────────────────────────────────────────

  function createEmptyState() {
    return {
      chunks: [],
      lastNodeScores: {},
      lastSelectedNodeIds: [],
      chatRegex: [],
    };
  }

  let state = createEmptyState();
  let currentCharIndex = -1;
  let currentChatIndex = -1;
  let currentCharId = "";
  let currentChatId = "";

  // RisuAI invokes the process hook once per message while composing a request.
  // Treat calls separated by a long idle gap as a new batch. 500 ms remains the
  // base tuning value, while the wider idle window avoids reopening a batch in
  // the middle of PocketRisu's long, serial stage-1 pass.
  const PROCESS_CHAT_REFRESH_INTERVAL_MS = 500;
  const PROCESS_BATCH_IDLE_RESET_MS = Math.max(5000, PROCESS_CHAT_REFRESH_INTERVAL_MS * 10);
  let processBatchPrepared = false;
  let lastProcessCallAt = 0;

  let chunkSize = DEFAULT_CHUNK_SIZE;
  let maxMemoryTokens = DEFAULT_MAX_MEMORY_TOKENS;
  let memoryInjectionMode = "selected";
  let memoryModeChangePending = false;
  let autoSummarize = true;
  let summaryPrompt = DEFAULT_SUMMARY_PROMPT;
  let isSummarizing = false;
  let includeUserMessages = true;
  let autoSummarizeThreshold = DEFAULT_SUMMARIZE_THRESHOLD;
  let embeddingContextMessages = 5;
  let embeddingUrl = "";
  let embeddingModel = "";
  let timeDecayDays = 15;
  let timeScoringMode = "minute";
  let timeWeight = 1.0;
  let similarityWeight = 1.0;
  let embeddingApiKey = "";
  let recentNodeCache = false;
  let recentNodeCacheCount = 10;
  let eventFormat = DEFAULT_EVENT_FORMAT;
  let factsFormat = DEFAULT_FACTS_FORMAT;
  let showGuiButton = true;
  let guiButtonPartId = null;

  // ── Regex Engine ─────────────────────────────────────────────────────────

  let activeRegexPresetName = ""; // empty = none selected
  let moduleRegexCache = []; // auto-loaded on chat open

  async function loadActiveRegexPreset() {
    try {
      const saved = await readStoredValue(ACTIVE_REGEX_PRESET_KEY);
      if (typeof saved === "string") activeRegexPresetName = saved;
    } catch (_) {
      activeRegexPresetName = "";
    }
  }

  async function saveActiveRegexPreset() {
    await writeStoredValue(ACTIVE_REGEX_PRESET_KEY, activeRegexPresetName);
  }

  /**
   * Get all currently active regex entries from all sources:
   * 1. Chat regex (per-chat upload)
   * 2. Active main regex preset (global, user-selected)
   * 3. Module regex (auto-loaded from enabled modules)
   */
  async function getActiveRegexEntries() {
    // Refresh only on memory work/preview, never on every process-hook message.
    await refreshModuleRegexCache();
    const entries = [];
    const addEntry = (entry) => {
      entries.push(entry.ableFlag === false ? { ...entry, flag: "g" } : entry);
    };

    // 1. Chat regex
    for (const e of state.chatRegex) {
      addEntry(e);
    }

    // 2. Active main regex preset
    if (activeRegexPresetName) {
      const presets = await loadRegexPresets();
      const preset = presets.find((p) => p.name === activeRegexPresetName);
      if (preset) {
        for (const e of preset.entries) {
          addEntry(e);
        }
      }
    }

    // 3. Module regex (cached)
    for (const e of moduleRegexCache) {
      addEntry(e);
    }

    return entries;
  }

  /**
   * Apply all active regex to a single message content.
   * Each regex is applied individually to the message.
   */
  const MEMORY_CLEANUP_STORAGE_KEY = "hypaplus_memory_cleanup";
  const DEFAULT_EXCLUDED_HTML_CLASSES = ["am-illustration-projection"];
  let memoryExcludedHtmlClasses = [...DEFAULT_EXCLUDED_HTML_CLASSES];

  function parseExcludedHtmlClasses(text) {
    const classes = [...new Set(text.split(/\r?\n/).map(line => line.trim()).filter(Boolean))];
    if (classes.some(name => !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name))) {
      throw new Error("클래스 이름을 한 줄에 하나씩 입력하세요. 영문·숫자·밑줄·하이픈을 사용할 수 있습니다.");
    }
    return classes;
  }

  async function loadMemoryCleanupSettings() {
    try {
      const saved = await readStoredValue(MEMORY_CLEANUP_STORAGE_KEY);
      memoryExcludedHtmlClasses = Array.isArray(saved?.excludedHtmlClasses)
        ? parseExcludedHtmlClasses(saved.excludedHtmlClasses.join("\n"))
        : [...DEFAULT_EXCLUDED_HTML_CLASSES];
    } catch (_) {
      memoryExcludedHtmlClasses = [...DEFAULT_EXCLUDED_HTML_CLASSES];
    }
  }

  // Match markup lexically, without creating DOM nodes or loading image URLs.
  // Fenced/inline code and HTML comments are opaque, including any fake tags.
  function memoryMarkupTokens(text) {
    const tokens = [];
    const pattern = /(^ {0,3}(`{3,}|~{3,})[^\r\n]*\r?\n)|(`+)|<!--[\s\S]*?(?:-->|$)|<\/?([a-zA-Z][a-zA-Z0-9:-]*)\b(?:"[^"]*"|'[^']*'|[^'"<>])*\/?>/gm;
    let match;
    while ((match = pattern.exec(text))) {
      if (match[1]) {
        const fence = match[2];
        const closing = new RegExp("^ {0,3}" + fence[0] + "{" + fence.length + ",}[ \\t]*\\r?$", "gm");
        closing.lastIndex = pattern.lastIndex;
        const end = closing.exec(text);
        pattern.lastIndex = end ? closing.lastIndex : text.length;
        continue;
      }
      if (match[3]) {
        // An unmatched backtick is literal text, not an open code span.
        const ticks = match[3];
        let end = text.indexOf(ticks, pattern.lastIndex);
        while (end >= 0 && (text[end - 1] === "`" || text[end + ticks.length] === "`")) {
          end = text.indexOf(ticks, end + ticks.length);
        }
        if (end >= 0) pattern.lastIndex = end + ticks.length;
        continue;
      }
      if (!match[4]) {
        tokens.push({ start: match.index, end: pattern.lastIndex, name: "#comment", closing: false, void: true, attributes: {} });
        continue;
      }
      const raw = match[0];
      const name = match[4].toLowerCase();
      const attributes = {};
      const attrs = raw.slice(raw.indexOf(match[4]) + match[4].length, -1);
      const attrPattern = /\s+([^\s=/'"<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s'"=<>`]+)))?/g;
      let attr;
      while ((attr = attrPattern.exec(attrs))) {
        const key = attr[1].toLowerCase();
        if (!(key in attributes)) attributes[key] = attr[2] ?? attr[3] ?? attr[4] ?? "";
      }
      tokens.push({ start: match.index, end: pattern.lastIndex, name,
        closing: /^<\//.test(raw), void: /\/\s*>$/.test(raw) ||
          /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name), attributes });
      // Raw-text elements cannot introduce a real nested display block.
      if (/^(script|style|textarea|title)$/.test(name) && !/^<\//.test(raw)) {
        const endPattern = new RegExp("</" + name + "\\s*>", "gi");
        endPattern.lastIndex = pattern.lastIndex;
        const end = endPattern.exec(text);
        if (end) {
          tokens.push({ start: end.index, end: endPattern.lastIndex, name, closing: true, void: false, attributes: {} });
          pattern.lastIndex = endPattern.lastIndex;
        } else pattern.lastIndex = text.length;
      }
    }
    return tokens;
  }

  function stripExcludedHtmlBlocks(text, classNames) {
    const result = { text, blocksRemoved: 0, captionsPreserved: 0, charactersRemoved: 0, unclosedBlocks: 0 };
    if (!classNames.length || !text.includes("<")) return result;
    const wanted = new Set(classNames);
    const tokens = memoryMarkupTokens(text);
    const pairs = new Map();
    const stacks = new Map();
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.void) continue;
      if (!stacks.has(token.name)) stacks.set(token.name, []);
      const stack = stacks.get(token.name);
      if (token.closing) {
        if (stack.length) pairs.set(stack.pop(), i);
      } else stack.push(i);
    }
    const pieces = [];
    let cursor = 0;
    for (let i = 0; i < tokens.length; i++) {
      const opening = tokens[i];
      if (opening.closing || !(opening.attributes.class || "").split(/\s+/).some(name => wanted.has(name))) continue;
      const closingIndex = opening.void ? i : pairs.get(i);
      if (closingIndex === undefined) { result.unclosedBlocks++; break; }
      const closing = tokens[closingIndex];
      let caption = opening.name === "img" ? (opening.attributes.alt || "") : "";
      let innerCursor = opening.end;
      for (let j = i + 1; j < closingIndex; j++) {
        const token = tokens[j];
        caption += text.slice(innerCursor, token.start);
        if (!token.closing && /^(script|style)$/.test(token.name) && pairs.has(j)) {
          j = pairs.get(j);
          innerCursor = tokens[j].end;
          continue;
        }
        if (token.name === "img" && !token.closing) caption += token.attributes.alt || "";
        if (/^(br|p|div|section|figure|figcaption|li)$/.test(token.name)) caption += "\n";
        innerCursor = token.end;
      }
      if (!opening.void) caption += text.slice(innerCursor, closing.start);
      // Do not let the selected raw-text container itself expose script/style.
      if (/^(script|style)$/.test(opening.name)) caption = "";
      caption = caption.trim();
      const replacement = caption ? "\n" + caption + "\n" : "\n";
      pieces.push(text.slice(cursor, opening.start), replacement);
      cursor = closing.end;
      result.blocksRemoved++;
      if (caption) result.captionsPreserved++;
      i = closingIndex;
    }
    if (result.blocksRemoved) {
      pieces.push(text.slice(cursor));
      result.text = pieces.join("");
      result.charactersRemoved = text.length - result.text.length;
    }
    return result;
  }

  function renderMemoryCleanupSettings() {
    return `<div class="hp-card">
      <h4 style="margin:0 0 8px;">기억에서 제외할 표시 블록</h4>
      <p style="font-size:12px;color:#aaa;">그림·장식용 HTML의 클래스 이름을 한 줄에 하나씩 등록하세요. 예: <code>am-illustration-projection</code></p>
      <textarea class="hp-textarea" id="hp-excluded-html-classes" style="height:90px;" spellcheck="false">${escapeHtml(memoryExcludedHtmlClasses.join("\n"))}</textarea>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="hp-btn primary" id="hp-save-html-cleanup">저장</button>
        <button class="hp-btn secondary" id="hp-default-html-cleanup">기본값 채우기</button>
      </div>
      <p style="font-size:12px;color:#aaa;">전체 대화의 기억 입력에 적용합니다. 원문과 그림 표시는 유지하고, 블록 안의 글·캡션·이미지 설명은 텍스트로 남깁니다. 비워서 저장하면 이 기능을 끕니다. 저장 후 ‘기억에 사용할 내용’ 또는 ‘검색 입력 미리보기’에서 확인할 수 있습니다.</p>
      <div id="hp-html-cleanup-status" role="status" style="font-size:12px;margin-top:8px;"></div>
    </div>`;
  }


  // Only pure JavaScript replacements belong in the memory pipeline. Host CBS,
  // commands and metadata flags need a separate, read-only host interpreter.
  function compileMemoryRegex(entry) {
    const flags = entry.ableFlag === false ? "g" : (entry.flag || "g");
    let reason = "";
    if (!entry.in) reason = "찾을 패턴 없음";
    else if (typeof entry.out !== "string") reason = "치환 문자열 형식 오류";
    else if (/\{\{|\{#/.test(entry.out)) reason = "조건문·변수 치환은 기억 처리에서 지원하지 않음";
    else if (/^\s*@@/.test(entry.out)) reason = "포켓리스 전용 명령";
    else if (/[<>]/.test(flags)) reason = "포켓리스 전용 플래그";
    if (reason) return { entry, flags, reason, regex: null };
    try {
      return { entry, flags, reason: "", regex: new RegExp(entry.in, flags) };
    } catch (_) {
      return { entry, flags, reason: "잘못된 정규식 또는 플래그", regex: null };
    }
  }

  function applyCompiledMemoryRegex(content, compiled) {
    let result = content;
    for (const rule of compiled) {
      if (!rule.regex) continue;
      rule.regex.lastIndex = 0;
      result = result.replace(rule.regex, rule.entry.out);
    }
    return result;
  }

  function applyRegexToMessage(content, entries) {
    return applyCompiledMemoryRegex(stripExcludedHtmlBlocks(content, memoryExcludedHtmlClasses).text, entries.map(compileMemoryRegex));
  }

  function renderMemoryRegexStatus(entry) {
    const rule = compileMemoryRegex(entry);
    return `사용 플래그: ${escapeHtml(rule.flags)}${entry.ableFlag === false ? " (기본값)" : ""} · ` +
      (rule.reason ? `기억 처리에서 건너뜀: ${escapeHtml(rule.reason)}` : "기억 처리 지원");
  }

  async function prepareMemoryMessages(messages) {
    const entries = await getActiveRegexEntries();
    return prepareMemoryMessageValues(messages, entries, memoryExcludedHtmlClasses);
  }


  /**
   * Read all messages from the current chat (raw, no regex applied).
   * Returns only chat.message — indices match RisuAI chat_index (0, 1, 2, …).
   * The first message (chat_index -1) is NOT included; use fetchFirstMessage() for it.
   */
  const FIRST_MESSAGE_CHAT_ID = "__hypaplus_first_message__";

  

  /** Current chatId -> chat array-index map, refreshed when messages are read. */
  let messageIndexByChatId = new Map();
  /** One immutable PocketRisu chat clone, shared through the current request. */
  let cachedChatMessages = null;
  /** Summarized boundary derived once whenever the chat map or chunks change. */
  let cachedLastSummarizedMsgIndex = -1;

  let committedMessageIds = new Set();
  let committedFirstMessage = false;

  function hasCommittedSummary(chunk) {
    return chunk.summarized === "done" &&
      (chunk.nodes.length > 0 || chunk.emptyAccepted === true);
  }

  function getChunkStatus(chunk) {
    if (chunk.summarized === "done" && !hasCommittedSummary(chunk)) return "needs_review";
    return chunk.summarized;
  }

  function getChunkCoverageIds(chunk) {
    return Array.isArray(chunk.sourceWindowIds) ? chunk.sourceWindowIds : (chunk.chatIds || []);
  }

  function recomputeLastSummarizedMsgIndex() {
    const result = calculateSummaryCoverage(
      state.chunks, cachedChatMessages || [], messageIndexByChatId, FIRST_MESSAGE_CHAT_ID,
    );
    committedMessageIds = result.covered;
    committedFirstMessage = result.firstCommitted;
    cachedLastSummarizedMsgIndex = result.frontier;
    return result.frontier;
  }


  function cacheChatMessages(chat) {
    const snapshot = chatMessageSnapshot(chat);
    cachedChatMessages = snapshot.messages;
    messageIndexByChatId = snapshot.indexByChatId;
    recomputeLastSummarizedMsgIndex();
    return cachedChatMessages;
  }

  function invalidateChatMessageCache() {
    cachedChatMessages = null;
  }

  async function readChatMessagesRaw(forceRefresh = false, context = summaryContext()) {
    if (context.charIndex < 0 || context.chatIndex < 0) return [];
    if (!forceRefresh && isSummaryContextCurrent(context) && cachedChatMessages) return cachedChatMessages;
    const chat = await readHostChat(context.charIndex, context.chatIndex);
    if (chat?.id !== context.chatId) throw new Error("읽는 동안 채팅이 바뀌었습니다.");
    return chatMessageSnapshot(chat, false).messages;
  }

  /**
   * Fetch the first message (chat_index -1) from the character object.
   * Returns null if not available.
   */
  async function fetchFirstMessage(context = summaryContext()) {
    if (context.charIndex < 0 || context.chatIndex < 0) return null;
    try {
      const chat = await readHostChat(context.charIndex, context.chatIndex);
      const char = await readHostCharacter(context.charIndex);
      if (!char) return null;
      let text = null;
      const fmIndex = Number(chat.fmIndex);
      const fmIndexNum = isNaN(fmIndex) ? -1 : fmIndex;
      if (
        fmIndexNum >= 0 &&
        Array.isArray(char.alternateGreetings) &&
        char.alternateGreetings[fmIndexNum] !== undefined
      ) {
        text = char.alternateGreetings[fmIndexNum].toString();
      } else if (char.firstMessage !== undefined) {
        text = char.firstMessage.toString();
      }
      return text !== null ? { role: "char", content: text } : null;
    } catch (_) {
      console.log("[HypaPlus] fetchFirstMessage — error:", _);
      return null;
    }
  }

  /**
   * Apply active regex to an array of messages (in-place).
   * Only call this on the subset you actually need.
   */
  async function applyRegexToMessages(
    messages,
  ) {
    const prepared = await prepareMemoryMessages(messages);
    for (let i = 0; i < messages.length; i++) messages[i].content = prepared.messages[i].content;
  }

  /**
   * Auto-load module regex cache. Called on chat open.
   */
  async function refreshModuleRegexCache() {
    const context = summaryContext();
    try {
      const loaded = await fetchModuleRegex();
      if (isSummaryContextCurrent(context)) moduleRegexCache = loaded;
    } catch (_) {
      if (isSummaryContextCurrent(context)) moduleRegexCache = [];
    }
  }

  // ── Batch Embedding ─────────────────────────────────────────────────────

  /**
   * Fetch embeddings for multiple texts in a single API call.
   * Returns an array of embeddings in the same order as the input texts.
   * Each element is either a number[] or null if the embedding failed.
   */
  async function getBatchEmbeddings(texts, connection = { url: embeddingUrl, model: embeddingModel, apiKey: embeddingApiKey }) {
    if (!connection.url || texts.length === 0) return texts.map(() => null);

    console.log("[HypaPlus] getBatchEmbeddings — requesting", texts.length, "embedding(s)");

    try {
      const body = {
        input: texts,
      };
      if (connection.model) body.model = connection.model;

      const headers = { "Content-Type": "application/json" };
      if (connection.apiKey) headers["Authorization"] = `Bearer ${connection.apiKey}`;

      const response = await requestNativeFetch(connection.url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.log("[HypaPlus] Batch embedding fetch failed, status:", response.status);
        return texts.map(() => null);
      }

      const data = await response.json();

      // OpenAI format: { data: [{ embedding: [...] }, ...] }
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((item) => {
          const emb = _optionalChain([item, 'optionalAccess', _2 => _2.embedding]);
          return Array.isArray(emb) && emb.length > 0 ? emb : null;
        });
      }

      return texts.map(() => null);
    } catch (e) {
      console.log("[HypaPlus] Batch embedding fetch error:", e);
      return texts.map(() => null);
    }
  }

  function cosineSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  // ── Tokenizer ────────────────────────────────────────────────────────────

  // Simple in-memory cache for token counts
  const tokenCache = new Map();
  const TOKEN_CACHE_MAX = 500;

  async function countTokens(text) {
    if (!text) return 0;
    const cached = tokenCache.get(text);
    if (cached !== undefined) return cached;
    const count = heuristicEstimateTokens(text);
    if (tokenCache.size >= TOKEN_CACHE_MAX) {
      const firstKey = tokenCache.keys().next().value;
      if (firstKey !== undefined) tokenCache.delete(firstKey);
    }
    tokenCache.set(text, count);
    return count;
  }

  function heuristicEstimateTokens(text) {
    let tokens = 0;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code >= 0xac00 && code <= 0xd7af)
        tokens += 0.8; // Korean
      else if (code >= 0x4e00 && code <= 0x9fff)
        tokens += 0.9; // CJK
      else if (code >= 0x3040 && code <= 0x30ff)
        tokens += 0.9; // Japanese
      else tokens += 0.25;
    }
    return Math.ceil(tokens);
  }

  function clearTokenCache() {
    tokenCache.clear();
  }

  /**
   * Collect all nodes from all chunks. This is the single source of truth —
   * nodes are stored only inside chunks, not duplicated in PluginState.
   */
  function getNodes() {
    return collectNodes(state.chunks);
  }

  function nextNodeId() {
    return nextNodeIdFromList(getNodes());
  }

  /** Find a node by id across all chunks. */
  function findNodeById(nodeId) {
    return findNodeInChunks(state.chunks, nodeId);
  }

  /** Remove a node by id from its parent chunk. Returns true if found and removed. */
  function removeNodeById(nodeId) {
    for (const chunk of state.chunks) {
      const idx = chunk.nodes.findIndex((n) => n.id === nodeId);
      if (idx !== -1) {
        chunk.nodes.splice(idx, 1);
        if (!chunk.nodes.length && chunk.summarized === "done") chunk.emptyAccepted = true;
        recomputeLastSummarizedMsgIndex();
        return true;
      }
    }
    return false;
  }

  /** Remove all nodes with the given ids from their parent chunks. */
  function removeNodesByIds(nodeIds) {
    for (const chunk of state.chunks) {
      chunk.nodes = chunk.nodes.filter((n) => !nodeIds.has(n.id));
    }
  }

  function nextChunkId() {
    let maxId = 0;
    for (const c of state.chunks) {
      const num = parseInt(c.id, 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    }
    return String(maxId + 1);
  }

  /**
   * Get or create the virtual "Chunk 0" that holds manually created nodes.
   * This chunk has id "0", no chatIds, and is always marked "done".
   * It is excluded from getLastSummarizedMsgIndex() and other summarization logic.
   */
  function getOrCreateManualChunk() {
    let chunk = state.chunks.find((c) => c.id === "0");
    if (!chunk) {
      chunk = {
        id: "0",
        messageCount: 0,
        nodes: [],
        memo: "",
        summarized: "done",
        createdAt: Date.now(),
        chatIds: [],
        chatIndex: currentChatIndex,
      };
      state.chunks.unshift(chunk);
    }
    return chunk;
  }

  

  

  /**
   * Normalize supported date/time strings before storing them.
   * Short numeric components are left-padded while the existing full-date
   * (YYYY-MM-DD), short-date (MM-DD), or time-only shape is preserved.
   * For a time range, each side of the arrow is normalized independently.
   */
  

  // ── Node Parser ──────────────────────────────────────────────────────────

  function parseNodesFromSummary(raw) {
    let nextId = Number(nextNodeIdFromList(getNodes()));
    const getId = () => String(nextId++);
    const nodes = [];
    for (const block of summaryBlocks(raw)) {
      const node = block.type === "event"
        ? parseEventBlock(block.text, getId)
        : parseFactsBlock(block.text, getId);
      if (node) nodes.push(node);
    }
    return nodes;
  }

  function parseEventBlock(block, getId) {
    const fields = parseEventFields(block);
    if (!fields) return null;
    return { id: (getId ?? nextNodeId)(), ...fields, createdAt: Date.now() };
  }

  function parseFactsBlock(block, getId) {
    const fields = parseFactsFields(block);
    if (!fields) return null;
    // Undated facts remain undated; createdAt below is metadata only.
    if (fields.time === null) fields.time = "";
    return { id: (getId ?? nextNodeId)(), ...fields, createdAt: Date.now() };
  }

  // ── Storage ──────────────────────────────────────────────────────────────

  async function detectCurrentChat()





 {
    const ci = await readCurrentCharacterIndex();
    const chi = await readCurrentChatIndex();
    // A full character clone can be larger than the chat itself. Reuse the
    // stable character ID while the selected character index is unchanged.
    let charId = ci === currentCharIndex ? currentCharId : "";
    let chatId = "";
    let chat = null;
    if (!charId) {
      try {
        const char = await readHostCharacter(ci);
        if (char && char.chaId) charId = char.chaId;
      } catch (_) {
        /* fallback to empty */
      }
    }
    try {
      chat = await readHostChat(ci, chi);
      if (chat && chat.id) chatId = chat.id;
    } catch (_) {
      /* fallback to empty */
    }
    return { charIndex: ci, chatIndex: chi, charId, chatId, chat };
  }

  async function ensureChatContext(refreshSnapshot = false) {
    const previous = summaryContext();
    const previousValue = captureStateComparison(previous.state);
    const target = await detectCurrentChat();
    if (!target.charId || !target.chatId || !target.chat) throw new Error("현재 채팅을 읽을 수 없습니다.");
    if (sameChatTarget(target, previous) && isSummaryContextCurrent(previous)) {
      const actual = await detectCurrentChat();
      if (!sameChatTarget(actual, target) || !isSummaryContextCurrent(previous)) throw new Error("읽는 동안 채팅이 바뀌었습니다.");
      if (refreshSnapshot) cacheChatMessages(actual.chat);
      return false;
    }
    const loaded = await loadStateForChat(target.charId, target.chatId, chatMessageSnapshot(target.chat).messages);
    const actual = await detectCurrentChat();
    if (!sameChatTarget(actual, target)) throw new Error("읽는 동안 채팅이 바뀌었습니다.");
    if (!isSummaryContextCurrent(previous) || !stateMatchesComparison(previous.state, previousValue)) {
      if (sameChatTarget(summaryContext(), target)) return false;
      throw new Error("읽는 동안 기억이 바뀌었습니다. 다시 시도해 주세요.");
    }
    currentCharIndex = target.charIndex;
    currentChatIndex = target.chatIndex;
    currentCharId = target.charId;
    currentChatId = target.chatId;
    state = loaded.value;
    cacheChatMessages(actual.chat);
    const published = summaryContext();
    if (loaded.migrated && !isSummarizing) await applyMemoryChange(published, () => {});
    await refreshModuleRegexCache();
    return true;
  }

  /**
   * Get the time of the chronologically latest node.
   * This is the reference point for time decay scoring.
   */
  function getLatestNodeTime() {
    return latestNodeTimeFromList(getNodes(), parseTimeString);
  }

  /**
   * Get the N most recent nodes (by time, newest first).
   * Used for recent node caching feature.
   */
  function getRecentNodes(count) {
    return recentNodesFromList(getNodes(), count);
  }

  /** Resolve a chunk's stored chat IDs to current message indices. */
  function getChunkMessageIndices(chunk) {
    return resolveChunkMessageIndices(chunk, messageIndexByChatId, FIRST_MESSAGE_CHAT_ID);
  }

  /** Compute the last summarized current-chat index from stored chat IDs. */
  function getLastSummarizedMsgIndex() {
    return cachedLastSummarizedMsgIndex;
  }

  /**
   * Read pending (unsummarized) messages from chat history on-the-fly.
   * Returns messages whose index is > lastSummarizedMsgIndex.
   * When startIdx === 0, the first message (chat_index -1) is prepended.
   */
  async function getPendingMessages({ countOnly = false } = {}) {
    const context = summaryContext();
    if (currentCharIndex < 0 || currentChatIndex < 0) return countOnly ? 0 : [];

    try {
      const allMessages = cachedChatMessages || await refreshChatSnapshot(context);

      if (!isSummaryContextCurrent(context)) return countOnly ? 0 : [];
      const startIdx = getLastSummarizedMsgIndex() + 1;

      let pending = countOnly ? 0 : [];

      // Prepend first message (chat_index -1) if we're starting from the beginning
      if (startIdx <= 0 && !committedFirstMessage) {
        const firstMsg = await fetchFirstMessage(context);
        if (firstMsg) {
          if (countOnly) pending++;
          else pending.push(firstMsg);
        }
      }

      if (!isSummaryContextCurrent(context)) return countOnly ? 0 : [];
      for (const message of allMessages) {
        const index = messageIndexByChatId.get(message.chatId);
        if (index !== undefined && index >= Math.max(0, startIdx)) {
          if (countOnly) pending++;
          else pending.push({ ...message });
        }
      }

      // Eligibility is based on raw message IDs and indices, not transformed
      // text. Summary execution and previews still prepare their own text.
      if (countOnly) return isSummaryContextCurrent(context) ? pending : 0;

      // Apply regex only to pending subset
      await applyRegexToMessages(pending);

      return isSummaryContextCurrent(context) ? pending : [];
    } catch (e) {
      return countOnly ? 0 : [];
    }
  }

  async function loadStateForChat(charId, chatId, messages = []) {
    const saved = await readStoredValue(getStorageKey(charId, chatId));
    const value = saved ? decodeStoredStateEnvelope(copyStorageValue(saved)) : createEmptyState();
    const decoded = decodeStoredChatState(value, messages, FIRST_MESSAGE_CHAT_ID);
    applyStoredStateCompatibility(value, decoded.value);
    value.chatRegex = await loadChatRegex(charId, chatId);
    return { value, migrated: decoded.migrated };
  }

  function saveStateForChat(charId, chatId, value) {
    return writeStoredValue(getStorageKey(charId, chatId), value);
  }

  async function loadState() {
    // Load global prompt
    try {
      const savedPrompt = await readStoredValue(PROMPT_STORAGE_KEY);
      if (savedPrompt) {
        summaryPrompt = savedPrompt;
      }
    } catch (_) {
      /* use default */
    }

    // Load arguments
    const cs = await readPluginArgument("chunk_size");
    if (cs !== undefined) chunkSize = Number(cs) || DEFAULT_CHUNK_SIZE;

    const mmt = await readPluginArgument("max_memory_tokens");
    if (mmt !== undefined) maxMemoryTokens = Number(mmt) || DEFAULT_MAX_MEMORY_TOKENS;

    const as = await readPluginArgument("auto_summarize");
    if (as !== undefined) autoSummarize = as === true || as === "true";

    const eu = await readPluginArgument("embedding_url");
    if (eu !== undefined && typeof eu === "string") embeddingUrl = eu.trim();

    const em = await readPluginArgument("embedding_model");
    if (em !== undefined && typeof em === "string") embeddingModel = em.trim();

    const td = await readPluginArgument("time_decay_days");
    if (td !== undefined) timeDecayDays = Number(td) || 15;

    const tsm = await readPluginArgument("time_scoring_mode");
    if (tsm === "minute" || tsm === "day" || tsm === "none") timeScoringMode = tsm;

    const tw = await readPluginArgument("time_weight");
    if (tw !== undefined) timeWeight = Number(tw) || 1.0;

    const sw = await readPluginArgument("similarity_weight");
    if (sw !== undefined) similarityWeight = Number(sw) || 1.0;

    const eak = await readPluginArgument("embedding_api_key");
    if (eak !== undefined && typeof eak === "string") embeddingApiKey = eak.trim();

    const ium = await readPluginArgument("include_user_messages");
    if (ium !== undefined) includeUserMessages = ium === true || ium === "true";

    const ast = await readPluginArgument("auto_summarize_threshold");
    if (ast !== undefined) autoSummarizeThreshold = Number(ast) || chunkSize;

    const ecm = await readPluginArgument("embedding_context_messages");
    if (ecm !== undefined) embeddingContextMessages = Number(ecm) || 5;

    const rnc = await readPluginArgument("recent_node_cache");
    if (rnc !== undefined) recentNodeCache = rnc === true || rnc === "true";

    const rncc = await readPluginArgument("recent_node_cache_count");
    if (rncc !== undefined) recentNodeCacheCount = Number(rncc) || 10;

    // Load persisted settings (survives plugin updates)
    try {
      const savedSettings = await readStoredValue(SETTINGS_STORAGE_KEY);
      memoryInjectionMode = normalizeMemoryInjectionMode(savedSettings?.memoryInjectionMode);
      if (savedSettings) {
        if (savedSettings.chunkSize !== undefined) chunkSize = savedSettings.chunkSize;
        if (savedSettings.maxMemoryTokens !== undefined)
          maxMemoryTokens = savedSettings.maxMemoryTokens;
        if (savedSettings.autoSummarize !== undefined) autoSummarize = savedSettings.autoSummarize;
        if (savedSettings.embeddingUrl !== undefined) embeddingUrl = savedSettings.embeddingUrl;
        if (savedSettings.embeddingModel !== undefined)
          embeddingModel = savedSettings.embeddingModel;
        if (savedSettings.timeDecayDays !== undefined) timeDecayDays = savedSettings.timeDecayDays;
        if (
          savedSettings.timeScoringMode === "minute" ||
          savedSettings.timeScoringMode === "day" ||
          savedSettings.timeScoringMode === "none"
        ) {
          timeScoringMode = savedSettings.timeScoringMode;
        }
        if (savedSettings.timeWeight !== undefined) timeWeight = savedSettings.timeWeight;
        if (savedSettings.similarityWeight !== undefined)
          similarityWeight = savedSettings.similarityWeight;
        if (savedSettings.embeddingApiKey !== undefined)
          embeddingApiKey = savedSettings.embeddingApiKey;
        if (savedSettings.includeUserMessages !== undefined)
          includeUserMessages = savedSettings.includeUserMessages;
        if (savedSettings.autoSummarizeThreshold !== undefined)
          autoSummarizeThreshold = savedSettings.autoSummarizeThreshold;
        if (savedSettings.embeddingContextMessages !== undefined)
          embeddingContextMessages = savedSettings.embeddingContextMessages;
        if (savedSettings.recentNodeCache !== undefined)
          recentNodeCache = savedSettings.recentNodeCache;
        if (savedSettings.recentNodeCacheCount !== undefined)
          recentNodeCacheCount = savedSettings.recentNodeCacheCount;
        if (savedSettings.eventFormat !== undefined) eventFormat = savedSettings.eventFormat;
        if (savedSettings.factsFormat !== undefined) factsFormat = savedSettings.factsFormat;
        if (savedSettings.showGuiButton !== undefined) showGuiButton = savedSettings.showGuiButton;
      }
    } catch (_) {
      /* ignore */
    }

    // Keep hooks available after a failed initial read, without publishing empty chat data.
    try { await ensureChatContext(true); }
    catch (error) { console.error("[HypaPlus] Initial chat read failed:", error); }

    // Load active regex preset (global, persists across sessions)
    await loadActiveRegexPreset();
    await loadMemoryCleanupSettings();
    await refreshModuleRegexCache();
  }

  

  async function savePrompt() {
    await writeStoredValue(PROMPT_STORAGE_KEY, summaryPrompt);
  }

  async function saveSettings() {
    await writeStoredValue(SETTINGS_STORAGE_KEY, {
      chunkSize,
      maxMemoryTokens,
      memoryInjectionMode,
      autoSummarize,
      embeddingUrl,
      embeddingModel,
      timeDecayDays,
      timeScoringMode,
      timeWeight,
      similarityWeight,
      embeddingApiKey,
      includeUserMessages,
      autoSummarizeThreshold,
      embeddingContextMessages,
      recentNodeCache,
      recentNodeCacheCount,
      eventFormat,
      factsFormat,
      showGuiButton,
    });
  }

  // ── Presets ──────────────────────────────────────────────────────────────

  async function loadPresets() {
    try {
      const saved = await readStoredValue(PRESETS_STORAGE_KEY);
      if (saved && Array.isArray(saved)) return saved;
    } catch (_) {
      /* ignore */
    }
    return [];
  }

  async function savePresets(presets) {
    await writeStoredValue(PRESETS_STORAGE_KEY, presets);
  }

  function currentSettingsAsPreset() {
    return {
      name: "",
      summaryPrompt,
      chunkSize,
      includeUserMessages,
      embeddingContextMessages,
      eventFormat,
      factsFormat,
    };
  }

  function applyPreset(p) {
    summaryPrompt = p.summaryPrompt;
    chunkSize = p.chunkSize;
    includeUserMessages = p.includeUserMessages;
    embeddingContextMessages = p.embeddingContextMessages;
    if (p.eventFormat !== undefined) eventFormat = p.eventFormat;
    if (p.factsFormat !== undefined) factsFormat = p.factsFormat;
  }

  function parseRisuPreset(json) {
    try {
      const data = JSON.parse(json);
      if (_optionalChain([data, 'optionalAccess', _5 => _5.type]) !== "risu" || !_optionalChain([data, 'optionalAccess', _6 => _6.data, 'optionalAccess', _7 => _7.settings])) return null;
      const s = data.data.settings;
      return {
        name: data.data.name || "Imported Preset",
        summaryPrompt: s.summarizationPrompt || "",
        chunkSize: s.maxChatsPerSummary || DEFAULT_CHUNK_SIZE,
        includeUserMessages: !s.doNotSummarizeUserMessage,
        embeddingContextMessages: s.queryChatCount || 5,
        eventFormat: DEFAULT_EVENT_FORMAT,
        factsFormat: DEFAULT_FACTS_FORMAT,
      };
    } catch (_) {
      return null;
    }
  }

  // ── Regex Presets (global) ───────────────────────────────────────────────

  async function loadRegexPresets() {
    try {
      const saved = await readStoredValue(REGEX_PRESETS_STORAGE_KEY);
      if (saved && Array.isArray(saved)) return saved;
    } catch (_) {
      /* ignore */
    }
    return [];
  }

  async function saveRegexPresets(presets) {
    await writeStoredValue(REGEX_PRESETS_STORAGE_KEY, presets);
  }

  function parseRegexFile(json) {
    try {
      const data = JSON.parse(json);
      if (_optionalChain([data, 'optionalAccess', _8 => _8.type]) !== "regex" || !Array.isArray(_optionalChain([data, 'optionalAccess', _9 => _9.data]))) return null;
      // Only keep "editprocess" type entries
      return data.data
        .filter((e) => e.type === "editprocess")
        .map(
          (e) => ({
            comment: e.comment || "",
            in: e.in || "",
            out: e.out || "",
            type: e.type || "editprocess",
            ableFlag: _nullishCoalesce(e.ableFlag, () => ( true)),
            flag: typeof e.flag === "string" && e.flag ? e.flag : "g",
          }),
        );
    } catch (_) {
      return null;
    }
  }

  // ── Chat Regex (per-chat) ────────────────────────────────────────────────

  function getChatRegexStorageKey(charId, chatId) {
    return `hypaplus_chat_regex_${charId}_${chatId}`;
  }

  async function loadChatRegex(charId = currentCharId, chatId = currentChatId) {
    if (!charId || !chatId) return [];
    const saved = await readStoredValue(getChatRegexStorageKey(charId, chatId));
    return Array.isArray(saved) ? copyStorageValue(saved) : [];
  }

  

  // ── Module Regex (read-only, fetched on-the-fly) ─────────────────────────

  async function fetchModuleRegex() {
    try {
      const db = await readHostDatabase(["modules"]);
      if (!db || !db.modules) return [];

      // Get chat-specific enabled modules (falls back to global enabledModules)
      let enabledIds = [];
      try {
        const chat = await readHostChat(currentCharIndex, currentChatIndex);
        if (_optionalChain([chat, 'optionalAccess', _10 => _10.modules]) && Array.isArray(chat.modules)) {
          enabledIds = chat.modules;
        }
      } catch (_) {
        /* ignore */
      }
      // Fallback to global enabledModules if chat.modules is empty
      if (enabledIds.length === 0) {
        try {
          const db2 = await readHostDatabase(["enabledModules"]);
          if (_optionalChain([db2, 'optionalAccess', _11 => _11.enabledModules])) enabledIds = db2.enabledModules;
        } catch (_) {
          /* ignore */
        }
      }

      const enabledSet = new Set(enabledIds);
      const allEntries = [];
      for (const mod of db.modules) {
        if (!enabledSet.has(mod.id)) continue;
        if (mod.regex && Array.isArray(mod.regex)) {
          for (const entry of mod.regex) {
            if (entry.type === "editprocess") {
              allEntries.push({
                comment: entry.comment || "",
                in: entry.in || "",
                out: entry.out || "",
                type: entry.type || "editprocess",
                ableFlag: _nullishCoalesce(entry.ableFlag, () => ( true)),
                flag: entry.flag || "g",
              });
            }
          }
        }
      }
      return allEntries;
    } catch (_) {
      return [];
    }
  }

  // ── Backup / Restore ────────────────────────────────────────────────────

  



  /**
   * Export current chat's chunks (which contain nodes) as a JSON backup file download.
   * Nodes are stored only inside chunks — no duplication.
   */
  async function downloadBackup() {
    // Resolve char/chat names
    let charName = `char_${currentCharIndex}`;
    let chatName = `chat_${currentChatIndex}`;
    try {
      const char = await readHostCharacter(currentCharIndex);
      if (char && char.name) charName = char.name;
    } catch (_) {
      /* fallback to index */
    }
    try {
      const chat = await readHostChat(currentCharIndex, currentChatIndex);
      if (chat && chat.name) chatName = chat.name;
    } catch (_) {
      /* fallback to index */
    }

    const exportedAt = new Date().toISOString();
    const json = serializeBackupChunks(state.chunks);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Sanitize names for filename (replace problematic chars)
    const safeCharName = charName.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
    const safeChatName = chatName.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
    const safeDate = exportedAt.replace(/[:.]/g, "-");

    const a = document.createElement("a");
    a.href = url;
    a.download = `hypaplus_backup_${safeCharName}_${safeChatName}_${safeDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Parse and validate a backup JSON file.
   * Supports both new format (chunks-only) and legacy format (nodes + chunks).
   */
  function parseBackupFile(json) {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data.chunks)) {
        return null;
      }
      // Validate chunk structure
      for (const c of data.chunks) {
        if (
          !c.id ||
          !Array.isArray(c.nodes) ||
          (!Array.isArray(c.chatIds) && !Array.isArray(c.msgIndices))
        )
          return null;
        if (typeof c.memo !== "string") c.memo = "";
        // Validate nodes inside each chunk
        for (const n of c.nodes) {
          if (!n.id || !n.type || !n.content) return null;
          if (n.time == null) n.time = "";
          if (typeof n.time !== "string") return null;
        }
      }
      return data ;
    } catch (_) {
      return null;
    }
  }

  /**
   * Restore state from a backup JSON file.
   * Replaces chunks (and their contained nodes).
   */
  async function restoreFromBackup(backup, context = summaryContext(), expected = copyStorageValue(context.state)) {
    assertMemoryChange(context);
    const messages = await readChatMessagesRaw(false, context);
    const chunks = copyStorageValue(backup.chunks);
    for (const chunk of chunks) {
      if (!Array.isArray(chunk.chatIds) && Array.isArray(chunk.msgIndices)) {
        chunk.chatIds = chunk.msgIndices.map(index => index === -1 ? FIRST_MESSAGE_CHAT_ID : messages[index]?.chatId).filter(Boolean);
        delete chunk.msgIndices;
      }
    }
    return applyMemoryChange(context, target => {
      assertUnchangedValue(target, expected);
      target.chunks = chunks;
      target.lastNodeScores = {};
      target.lastSelectedNodeIds = [];
    });
  }

  /**
   * Build embedding query from recent N chat messages.
   * Always includes the last message regardless of role.
   */
  async function buildEmbeddingQuery() {
    const context = summaryContext();
    if (currentCharIndex < 0 || currentChatIndex < 0) return "";
    try {
      const allMessages = await readChatMessagesRaw(false, context);
      if (!isSummaryContextCurrent(context)) return "";
      if (allMessages.length === 0) return "";

      // Always include the last message
      const lastMsg = allMessages[allMessages.length - 1];
      // Take up to N-1 more recent messages before the last one
      const startIdx = Math.max(0, allMessages.length - embeddingContextMessages);
      const contextMsgs = allMessages.slice(startIdx, allMessages.length - 1);

      // Apply regex only to the subset we need
      const subset = [...contextMsgs, lastMsg].map((message) => ({ ...message }));
      await applyRegexToMessages(subset);

      const parts = subset.map((m) => m.content);
      return isSummaryContextCurrent(context) ? parts.join("\n") : "";
    } catch (e) {
      return "";
    }
  }

  // ── Summarization ────────────────────────────────────────────────────────

  /**
   * Turn a ChatML prompt into the OpenAI-style messages expected by runLLMModel.
   *
   * Summary prompts may be authored as a multi-turn ChatML conversation. Sending
   * that entire string as one user message makes the ChatML markers literal text
   * instead of conversation roles, so only parse when the complete prompt is
   * made of valid ChatML blocks. Plain-text/custom prompts remain unchanged.
   */
  function parseChatMLPrompt(prompt) {
    const blocks = [];
    const blockPattern = /<\|im_start\|>\s*([^\r\n]+)\r?\n([\s\S]*?)<\|im_end\|>/g;
    let cursor = 0;
    let match;

    while ((match = blockPattern.exec(prompt)) !== null) {
      // Any non-whitespace text between blocks means this is not a pure ChatML prompt.
      if (prompt.slice(cursor, match.index).trim() !== "") return null;
      const role = match[1].trim().split(/\s+/, 1)[0].toLowerCase();
      if (role !== "system" && role !== "user" && role !== "assistant") return null;
      blocks.push({ role, content: match[2] });
      cursor = blockPattern.lastIndex;
    }

    if (blocks.length === 0 || prompt.slice(cursor).trim() !== "") return null;
    return blocks;
  }

  async function summarizeChunk(messages, promptTemplate = summaryPrompt) {
    if (messages.length === 0) return { status: "needs_review", reason: "요약할 입력이 없습니다." };
    const messagesText = messages.map(m => m.content).join("\n\n");
    const prompt = promptTemplate.replace("{{slot}}", () => messagesText);
    const promptMessages = parseChatMLPrompt(prompt) || [{ role: "user", content: prompt }];
    let timeout;
    try {
      const result = await Promise.race([
        requestMemoryModel({ messages: promptMessages, mode: "memory", allowPlugins: true }),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error("summary-timeout")), 300000);
        }),
      ]);
      // V3 returns a typed result. Do not parse failed/error/streaming objects
      // as records, even if an error happens to contain valid-looking XML.
      if (typeof result !== "string" && (!result || result.type !== "success")) {
        return { status: "failed", reason: "요약 API가 성공 결과를 반환하지 않았습니다." };
      }
      const rawOutput = typeof result === "string" ? result : (result.result ?? result.content);
      if (typeof rawOutput !== "string") {
        return { status: "needs_review", reason: "요약 응답이 문자열 형식이 아닙니다." };
      }
      const cleaned = rawOutput.replace(/<Thoughts>[\s\S]*?<\/Thoughts>/gi, "").trim();
      const nodes = parseNodesFromSummary(cleaned).filter(node => node.content.trim());
      if (!nodes.length) {
        return { status: "needs_review", reason: "유효한 기억을 읽지 못했습니다. 원문은 계속 유지됩니다." };
      }
      return { status: "done", nodes };
    } catch (error) {
      return { status: "failed", reason: error?.message === "summary-timeout"
        ? "요약 응답 대기 시간이 초과되었습니다." : "요약 API 호출 중 오류가 발생했습니다." };
    } finally {
      clearTimeout(timeout);
    }
  }

  function summaryContext() {
    return { state, charId: currentCharId, chatId: currentChatId,
      charIndex: currentCharIndex, chatIndex: currentChatIndex, prompt: summaryPrompt };
  }

  function isSummaryContextCurrent(context) {
    return state === context.state && currentCharId === context.charId &&
      currentChatId === context.chatId && currentCharIndex === context.charIndex &&
      currentChatIndex === context.chatIndex;
  }

  // Fetch a chunk's exact input and its complete source window independently.
  // Legacy assistant-only chunks infer just the intervening user messages.
  async function readChunkSources(chunk) {
    const context = summaryContext();
    const all = await readChatMessagesRaw(true, context);
    if (!isSummaryContextCurrent(context)) return null;
    const byId = new Map(all.map(m => [m.chatId, m]));
    const ids = getChunkCoverageIds(chunk);
    if (ids.includes(FIRST_MESSAGE_CHAT_ID) || chunk.chatIds.includes(FIRST_MESSAGE_CHAT_ID)) {
      const first = await fetchFirstMessage(context);
      if (first) byId.set(FIRST_MESSAGE_CHAT_ID, { ...first, chatId: FIRST_MESSAGE_CHAT_ID });
    }
    if (!ids.length || ids.some(id => !byId.has(id)) || chunk.chatIds.some(id => !byId.has(id))) return null;
    const input = chunk.chatIds.map(id => ({ ...byId.get(id) }));
    let window;
    if (Array.isArray(chunk.sourceWindowIds)) {
      window = chunk.sourceWindowIds.map(id => ({ ...byId.get(id) }));
    } else {
      const positions = ids.map(id => all.findIndex(m => m.chatId === id)).filter(i => i >= 0);
      window = [];
      if (ids.includes(FIRST_MESSAGE_CHAT_ID)) window.push({ ...byId.get(FIRST_MESSAGE_CHAT_ID) });
      if (positions.length) {
        let start = Math.min(...positions);
        if (input.every(m => m.role !== "user")) {
          while (start > 0 && all[start - 1].role === "user") start--;
        }
        window.push(...all.slice(start, Math.max(...positions) + 1).map(m => ({ ...m })));
      }
    }
    return isSummaryContextCurrent(context) ? { input, window } : null;
  }

  async function sourceWindowStillMatches(context, window) {
    if (!isSummaryContextCurrent(context)) return false;
    const chat = await readHostChat(context.charIndex, context.chatIndex);
    if (!isSummaryContextCurrent(context) || chat?.id !== context.chatId) return false;
    const fresh = (chat.message || []).filter(m => m.data && m.chatId)
      .map(m => ({ chatId: String(m.chatId), role: String(m.role).toLowerCase(), content: String(m.data) }));
    const expected = window.filter(m => m.chatId !== FIRST_MESSAGE_CHAT_ID);
    if (expected.length) {
      const start = fresh.findIndex(m => m.chatId === expected[0].chatId);
      const actual = fresh.slice(start, start + expected.length);
      if (start < 0 || actual.length !== expected.length || actual.some((m, i) =>
        m.chatId !== expected[i].chatId || m.role !== expected[i].role || m.content !== expected[i].content)) return false;
    }
    const greeting = window.find(m => m.chatId === FIRST_MESSAGE_CHAT_ID);
    if (greeting) {
      const current = await fetchFirstMessage();
      if (!isSummaryContextCurrent(context) || !current || current.content !== greeting.content) return false;
    }
    return true;
  }

  async function persistSummaryState(context, value) {
    if (!isSummaryContextCurrent(context)) return false;
    await writeStoredValue(getStorageKey(context.charId, context.chatId), value);
    return isSummaryContextCurrent(context);
  }

  async function executeSummary(chunk, sources, context) {
    const keepPrevious = hasCommittedSummary(chunk);
    const wasStored = context.state.chunks.includes(chunk);
    try {
      const prepared = await prepareMemoryMessages(sources.input);
      if (!isSummaryContextCurrent(context) || (wasStored && !context.state.chunks.includes(chunk))) return false;
      const result = await summarizeChunk(prepared.messages, context.prompt);
      if (!isSummaryContextCurrent(context) || (wasStored && !context.state.chunks.includes(chunk))) return false;
      if (!await sourceWindowStillMatches(context, sources.window)) {
        result.status = "needs_review";
        result.reason = "처리 중 원문이 바뀌었습니다. 현재 원문을 확인한 뒤 다시 시도하세요.";
      }
      if (!isSummaryContextCurrent(context)) return false;
      const draft = { ...chunk,
        lastSummaryAttempt: { status: result.status, at: Date.now(), reason: result.reason || "" } };
      if (result.status === "done") {
        let id = Number(nextNodeId());
        draft.nodes = result.nodes.map(node => ({ ...node, id: String(id++) }));
        draft.summarized = "done";
        draft.emptyAccepted = false;
        draft.sourceWindowIds = sources.window.map(message => message.chatId);
        draft.summaryCommittedAt = Date.now();
      } else if (!keepPrevious) draft.summarized = result.status;
      return await commitSummaryChunk(context, chunk, draft) && result.status === "done";
    } catch (error) {
      if (isSummaryContextCurrent(context)) {
        if (!keepPrevious) chunk.summarized = "failed";
        chunk.lastSummaryAttempt = { status: "failed", at: Date.now(), reason: "요약 처리 또는 저장에 실패했습니다. 원문과 이전 기억을 유지합니다." };
        if (!context.state.chunks.includes(chunk)) context.state.chunks.push(chunk);
        recomputeLastSummarizedMsgIndex();
      }
      console.error("[HypaPlus] Summary failed:", error);
      return false;
    }
  }

  async function summarizeExistingChunk(chunk, context) {
    const sources = await readChunkSources(chunk);
    if (!isSummaryContextCurrent(context) || !state.chunks.includes(chunk)) return false;
    if (!sources) {
      const draft = { ...chunk,
        lastSummaryAttempt: { status: "needs_review", at: Date.now(), reason: "연결된 원문의 일부를 찾을 수 없습니다. 기존 기억을 보존합니다." } };
      if (!hasCommittedSummary(chunk)) draft.summarized = "needs_review";
      await commitSummaryChunk(context, chunk, draft);
      return false;
    }
    return executeSummary(chunk, sources, context);
  }

  

  async function runSummarization(count, options = {}) {
    if (isSummarizing || (options.context && !isSummaryContextCurrent(options.context))) return false;
    isSummarizing = true;
    if (document.getElementById("hp-body")) renderUI();
    const context = summaryContext();
    try {
      const take = Math.max(1, Math.floor(count ?? chunkSize));
      const all = await refreshChatSnapshot(context);
      if (!isSummaryContextCurrent(context)) return false;
      const startIdx = getLastSummarizedMsgIndex() + 1;
      const candidates = [];
      if (startIdx <= 0 && !committedFirstMessage) {
        const first = await fetchFirstMessage();
        if (first) candidates.push({ ...first, chatId: FIRST_MESSAGE_CHAT_ID });
      }
      candidates.push(...all.filter(m => messageIndexByChatId.get(m.chatId) >= Math.max(0, startIdx)));
      const firstPending = candidates.find(m => !committedMessageIds.has(m.chatId));
      if (!firstPending || !isSummaryContextCurrent(context)) return false;
      const unresolvedChunks = state.chunks.filter(c => c.id !== "0" && !hasCommittedSummary(c));
      const nextNonUser = candidates.slice(candidates.indexOf(firstPending)).find(m => m.role !== "user");
      const unresolved = unresolvedChunks.find(c => getChunkCoverageIds(c).includes(firstPending.chatId) ||
        (firstPending.role === "user" && !Array.isArray(c.sourceWindowIds) && nextNonUser && c.chatIds.includes(nextNonUser.chatId)));
      // Automatic processing never retries a failed/interrupted window on every
      // request. A manual retry reuses the existing chunk and its original input.
      if (unresolved) return options.automatic ? false : await summarizeExistingChunk(unresolved, context);
      const window = [];
      let boundedGap = false;
      for (const message of candidates) {
        if (window.length && unresolvedChunks.some(c => getChunkCoverageIds(c).includes(message.chatId))) {
          boundedGap = true;
          break;
        }
        if (committedMessageIds.has(message.chatId)) {
          if (window.length) { boundedGap = true; break; }
          continue;
        }
        if (window.length >= take) break;
        window.push({ ...message });
      }
      // A repaired hole may be smaller than chunkSize. Stop at existing valid
      // coverage instead of summarizing already remembered messages again.
      if (!window.length || (window.length < take && !boundedGap)) return false;
      const input = (includeUserMessages ? window : window.filter(m => m.role !== "user"))
        .map(m => ({ ...m }));
      const chunk = { id: nextChunkId(), messageCount: input.length, nodes: [], memo: "",
        summarized: "pending", createdAt: Date.now(), chatIds: input.map(m => m.chatId),
        sourceWindowIds: window.map(m => m.chatId), chatIndex: context.chatIndex };
      return await executeSummary(chunk, { input, window }, context);
    } finally {
      isSummarizing = false;
      if (document.getElementById("hp-body")) renderUI();
    }
  }

  async function reSummarizeChunk(chunkId, context = summaryContext()) {
    if (isSummarizing || !isSummaryContextCurrent(context)) return false;
    const chunk = state.chunks.find(c => c.id === chunkId && c.id !== "0");
    if (!chunk) return false;
    isSummarizing = true;
    if (document.getElementById("hp-body")) renderUI();
    try {
      return await summarizeExistingChunk(chunk, context);
    } finally {
      isSummarizing = false;
      if (document.getElementById("hp-body")) renderUI();
    }
  }

  async function acceptEmptyChunk(chunkId, context = summaryContext()) {
    if (isSummarizing) return false;
    if (!isSummaryContextCurrent(context)) return false;
    const chunk = state.chunks.find(chunk => chunk.id === chunkId && chunk.id !== "0");
    if (!chunk || chunk.nodes.length) return false;
    isSummarizing = true;
    if (document.getElementById("hp-body")) renderUI();
    try {
      const sources = await readChunkSources(chunk);
      if (!sources || !isSummaryContextCurrent(context)) return false;
      const draft = { ...chunk, sourceWindowIds: sources.window.map(message => message.chatId),
        emptyAccepted: true, summarized: "done",
        lastSummaryAttempt: { status: "done", at: Date.now(), reason: "사용자가 기억 없이 완료하도록 확인했습니다." } };
      return await commitSummaryChunk(context, chunk, draft);
    } finally { isSummarizing = false;
      if (document.getElementById("hp-body")) renderUI(); }
  }


  // ── Memory Retrieval ─────────────────────────────────────────────────────

  function buildNodeText(node) {
    return [
      node.content,
      _nullishCoalesce(node.location, () => ( "")),
      node.characters.join(" "),
      ...(_nullishCoalesce(_optionalChain([node, 'access', _16 => _16.dialogues, 'optionalAccess', _17 => _17.map, 'call', _18 => _18((d) => d.text)]), () => ( []))),
    ].join(" ");
  }

  /**
   * The same text can only reuse a vector when it was created by the currently
   * configured embedding endpoint and model. API keys are deliberately excluded.
   */
  function getEmbeddingConfig() {
    return `${embeddingUrl}\u0000${embeddingModel}`;
  }

  function clearNodeEmbedding(node) {
    delete node.embedding;
    delete node.embeddingConfig;
  }

  function computeTimeScore(node, lastTime) {
    return scoreStoryTimes(parseStoryTime(node.time), parseStoryTime(lastTime), timeScoringMode, timeDecayDays);
  }

  function parseTimeString(ts) {
    const time = parseStoryTime(ts);
    return time.value === null ? null : new Date(time.value);
  }

  function compareNodesByTime(a, b) {
    return compareStoryTimeEntries({ node: a, time: parseStoryTime(a.time) },
      { node: b, time: parseStoryTime(b.time) });
  }

  async function retrieveRelevantNodes(
    query,
    lastTime,
    tokenBudget,
  ) {
    if (memoryInjectionMode === "all") throw new Error("전체 기억 주입에서는 선별 검색을 실행하지 않습니다.");
    const context = summaryContext();
    const readOnly = isSummarizing;
    const allNodes = copyRetrievalNodes(getNodes());
    const inputOf = nodes => JSON.stringify(nodes.map(retrievalInput));
    const originalInput = inputOf(allNodes);
    const settings = () => JSON.stringify([memoryInjectionMode, memoryModeChangePending, getEmbeddingConfig(), timeScoringMode, timeDecayDays, timeWeight, similarityWeight,
      recentNodeCache, recentNodeCacheCount, eventFormat, factsFormat]);
    const originalSettings = settings();
    const connection = { url: embeddingUrl, model: embeddingModel, apiKey: embeddingApiKey };
    const embeddingConfig = getEmbeddingConfig();
    const valid = () => isSummaryContextCurrent(context) && originalInput === inputOf(getNodes()) && originalSettings === settings();
    if (allNodes.length === 0) return [];

    // If recent node cache is enabled, exclude those nodes from retrieval
    // (they will be injected separately via [HypaPlus.cached])
    let excludedIds = new Set();
    if (recentNodeCache && recentNodeCacheCount > 0) {
      const recentNodes = recentNodesFromList(allNodes, recentNodeCacheCount);
      for (const n of recentNodes) {
        excludedIds.add(n.id);
      }
    }

    // Separate favorites — they always get included regardless of score
    const { favorites, nonFavorites } = partitionRetrievalNodes(allNodes, excludedIds);

    // Compute similarity scores with batched embeddings if configured
    const similarityScores = new Map();
    if (embeddingUrl && nonFavorites.length > 0) {
      // Step 1: Get query embedding alone first
      const queryEmbResult = await getBatchEmbeddings([query], connection);
      const queryEmb = queryEmbResult[0];

      if (queryEmb) {
        // Step 2: Reuse persistent node vectors. Only nodes without a valid
        // cached vector are sent to the embedding API.
        if (!valid()) return [];
        const missingNodeIndices = [];
        for (let i = 0; i < nonFavorites.length; i++) {
          const node = nonFavorites[i];
          if (
            Array.isArray(node.embedding) &&
            node.embedding.length > 0 &&
            node.embeddingConfig === embeddingConfig
          ) {
            similarityScores.set(node.id, cosineSimilarity(queryEmb, node.embedding));
          } else {
            missingNodeIndices.push(i);
          }
        }

        // Split only missing node texts into token-limited batches.
        const nodeTexts = missingNodeIndices.map((index) => buildNodeText(nonFavorites[index]));

        // Split nodeTexts into batches where total tokens ≤ EMBEDDING_BATCH_TOKEN_LIMIT
        const batches = [];
        let currentBatchTexts = [];
        let currentBatchIndices = [];
        let currentBatchTokens = 0;

        for (let i = 0; i < nodeTexts.length; i++) {
          const textTokens = await countTokens(nodeTexts[i]);

          // If adding this text would exceed the limit and we already have items, flush the batch
          if (
            currentBatchTexts.length > 0 &&
            currentBatchTokens + textTokens > EMBEDDING_BATCH_TOKEN_LIMIT
          ) {
            batches.push({ texts: currentBatchTexts, indices: currentBatchIndices });
            currentBatchTexts = [];
            currentBatchIndices = [];
            currentBatchTokens = 0;
          }

          currentBatchTexts.push(nodeTexts[i]);
          currentBatchIndices.push(missingNodeIndices[i]);
          currentBatchTokens += textTokens;
        }
        // Flush the last batch
        if (currentBatchTexts.length > 0) {
          batches.push({ texts: currentBatchTexts, indices: currentBatchIndices });
        }

        // Step 3: Send missing vectors, persist successful responses, and score.

        for (const batch of batches) {
          console.log(
            "[HypaPlus] retrieveRelevantNodes — sending node embedding batch:",
            batch.texts.length,
            "node(s)",
          );
          const batchEmbeddings = await getBatchEmbeddings(batch.texts, connection);
          for (let j = 0; j < batch.indices.length; j++) {
            const nodeIdx = batch.indices[j];
            const nodeEmb = batchEmbeddings[j];
            if (nodeEmb) {
              const node = nonFavorites[nodeIdx];
              node.embedding = nodeEmb;
              node.embeddingConfig = embeddingConfig;
              similarityScores.set(node.id, cosineSimilarity(queryEmb, nodeEmb));

            }
          }
        }
        if (!valid()) return [];
      }
    }

    // Work on local vectors and scores; validate the source before one state update.
    const scored = calculateRetrievalScores(
      nonFavorites, similarityScores, nonFavorites.map(node => computeTimeScore(node, lastTime)),
      timeScoringMode, timeWeight, similarityWeight,
    );
    const nodeScores = retrievalDisplayScores(scored, favorites);
    const selectedNodeIds = new Set();
    scored.sort((a, b) => b.combined - a.combined);

    const candidates = retrievalCandidates(favorites, scored, compareNodesByTime);
    const tokenCounts = [];
    for (const node of candidates) {
      // A format change invalidates this result before publication.
      tokenCounts.push(await countTokens(formatNodeForContext(node)));
    }
    const selected = selectNodesWithinBudget(candidates, tokenCounts, tokenBudget);

    // Track which nodes were selected
    for (const n of selected) {
      selectedNodeIds.add(n.id);
    }

    // Sort selected by time for chronological context
    selected.sort(compareNodesByTime);

    if (!valid()) return [];
    if (!readOnly && !isSummarizing) {
      await applyMemoryChange(context, target => {
        const currentNodes = getNodes();
        for (let index = 0; index < allNodes.length; index++) {
          const node = allNodes[index];
          const current = currentNodes[index];
          if (current && node.embeddingConfig === embeddingConfig && Array.isArray(node.embedding)) {
            current.embedding = node.embedding;
            current.embeddingConfig = node.embeddingConfig;
          }
        }
        target.lastNodeScores = Object.fromEntries(nodeScores);
        target.lastSelectedNodeIds = [...selectedNodeIds];
      });
      return valid() ? selected : [];
    }
    return selected;
  }

  function formatNodeForContext(node) {
    return formatNodeWithTemplates(node, eventFormat, factsFormat);
  }

  async function buildMemoryContext(userInput) {
    if (memoryInjectionMode === "all") return buildAllMemoryContext(state.chunks, eventFormat, factsFormat);
    const context = summaryContext();
    // Build query from recent chat messages for embedding
    const embeddingQuery = await buildEmbeddingQuery();
    if (!isSummaryContextCurrent(context)) return "";
    const query = embeddingQuery || userInput;
    console.log(
      "[HypaPlus] buildMemoryContext — embeddingQuery length:",
      embeddingQuery.length,
      "| userInput length:",
      userInput.length,
      "| final query length:",
      query.length,
    );

    // Use the latest node's time as reference for time decay
    const refTime = getLatestNodeTime();
    console.log("[HypaPlus] buildMemoryContext — refTime:", refTime || "(null)");
    const nodes = await retrieveRelevantNodes(query, refTime, maxMemoryTokens);
    console.log(
      "[HypaPlus] buildMemoryContext — retrieved nodes:",
      nodes.length,
      "| maxMemoryTokens:",
      maxMemoryTokens,
    );

    if (!isSummaryContextCurrent(context) || nodes.length === 0) {
      console.log("[HypaPlus] buildMemoryContext — returning EMPTY string (no nodes retrieved)");
      return "";
    }

    const result = nodes.map((n) => formatNodeForContext(n)).join("\n");
    console.log("[HypaPlus] buildMemoryContext — result length:", result.length);
    return result;
  }

  // ── Message Tracking ─────────────────────────────────────────────────────

  async function trackUserMessage(content) {
    // Time tracking is derived from getLatestNodeTime() — no explicit storage needed

    // Check if we should auto-summarize — keep summarizing until pending < threshold
    if (autoSummarize) {
      while (true) {
        const pending = await getPendingMessages({ countOnly: true });
        if (pending < autoSummarizeThreshold) break;
        const prevCount = pending;
        if (!await runSummarization(undefined, { automatic: true })) break;
        // If summarization didn't reduce pending count (e.g. not enough for a full chunk), stop
        const after = await getPendingMessages({ countOnly: true });
        if (after >= prevCount) break;
      }
    }
  }

  async function trackAssistantMessage(content) {

    if (autoSummarize) {
      while (true) {
        const pending = await getPendingMessages({ countOnly: true });
        if (pending < autoSummarizeThreshold) break;
        const prevCount = pending;
        if (!await runSummarization(undefined, { automatic: true })) break;
        // If summarization didn't reduce pending count (e.g. not enough for a full chunk), stop
        const after = await getPendingMessages({ countOnly: true });
        if (after >= prevCount) break;
      }
    }
  }

  // ── Replacers ────────────────────────────────────────────────────────────

  // beforeRequest: inject memory context + track user messages
  async function beforeRequestHandler(messages, type) {
    // A normal request reaches beforeRequest after every serial process call.
    // Close the latch here, but keep its chat snapshot available to the rest of
    // this request (pending-message checks and the embedding query).
    const hadPreparedProcessBatch = processBatchPrepared;
    processBatchPrepared = false;
    lastProcessCallAt = 0;

    console.log(
      "[HypaPlus] beforeRequest called — type:",
      type,
      "| messages:",
      messages.length,
      "| currentCharId:",
      currentCharId || "(none)",
      "| isSummarizing:",
      isSummarizing,
    );

    // Only process main chat requests — skip auxiliary model calls (memory, emotion, translate, etc.)
    if (type !== "main" && type !== "model") {
      console.log("[HypaPlus] beforeRequest SKIP — type not main/model:", type);
      return messages;
    }

    if (memoryModeChangePending) {
      throw new Error("[HypaPlus] 기억 주입 방식이 바뀌었습니다. 진행 중이던 요청 대신 대화를 새로 요청해 주세요.");
    }
    const requestMode = memoryInjectionMode;
    if (requestMode === "all") return beforeFullMemoryRequest(messages, hadPreparedProcessBatch);
    if (hasFullMemoryBlock(messages)) {
      throw new Error("[HypaPlus] 주입 방식이 변경된 요청입니다. 대화를 새로 요청해 주세요.");
    }

    // Guard against re-entry during summarization
    if (isSummarizing) {
      console.log("[HypaPlus] beforeRequest SKIP — isSummarizing is true");
      return messages;
    }

    try {
      // Always resolve the current chat before using state. A previous chat's
      // currentCharId may still be populated when the user switches chats.
      console.log("[HypaPlus] beforeRequest — checking current chat context...");
      await ensureChatContext(!hadPreparedProcessBatch);
      console.log(
        "[HypaPlus] beforeRequest — after ensureChatContext: currentCharId:",
        currentCharId || "(none)",
        "| chunks:",
        state.chunks.length,
        "| nodes:",
        getNodes().length,
      );

      if (memoryModeChangePending || memoryInjectionMode !== requestMode) throw new Error("기억 주입 방식이 바뀌었습니다. 대화를 다시 요청해 주세요.");
      const requestContext = summaryContext();
      // Find the last user message for tracking and retrieval
      let lastUserContent = "";
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          lastUserContent = messages[i].content;
          break;
        }
      }

      console.log(
        "[HypaPlus] beforeRequest — lastUserContent found:",
        lastUserContent ? `yes (${lastUserContent.length} chars)` : "NO",
      );

      if (lastUserContent) {
        // Track the user message
        await trackUserMessage(lastUserContent);

        if (!isSummaryContextCurrent(requestContext)) return messages;
        // Build memory context
        console.log("[HypaPlus] beforeRequest — building memoryContext...");
        const memoryContext = await buildMemoryContext(lastUserContent);
        console.log(
          "[HypaPlus] beforeRequest — memoryContext length:",
          memoryContext.length,
          "| total nodes:",
          getNodes().length,
        );

        if (memoryModeChangePending || memoryInjectionMode !== requestMode) throw new Error("기억 주입 방식이 바뀌었습니다. 대화를 다시 요청해 주세요.");
        if (!isSummaryContextCurrent(requestContext) || isSummarizing) return messages;
        // Build recent node cache context (if enabled)
        let cachedContext = "";
        if (recentNodeCache && recentNodeCacheCount > 0) {
          const recentNodes = getRecentNodes(recentNodeCacheCount);
          if (recentNodes.length > 0) {
            // Sort chronologically for display
            recentNodes.sort(compareNodesByTime);
            cachedContext = recentNodes.map((n) => formatNodeForContext(n)).join("\n");
          }
        }

        // Replace [HypaPlus.cached] placeholder if present
        if (cachedContext) {
          for (let i = 0; i < messages.length; i++) {
            if (messages[i].content.includes("[HypaPlus.cached]")) {
              messages[i] = {
                ...messages[i],
                content: messages[i].content.replace("[HypaPlus.cached]", cachedContext),
              };
              console.log("[HypaPlus] Cached nodes injected into message");
              break;
            }
          }
        }

        if (memoryContext) {
          console.log(
            "[HypaPlus] beforeRequest — memoryContext is truthy, searching for [HypaPlus.memory] placeholder...",
          );
          // Strategy 1: Replace [HypaPlus.memory] placeholder if present in any message
          let replaced = false;
          for (let i = 0; i < messages.length; i++) {
            const hasPlaceholder = messages[i].content.includes("[HypaPlus.memory]");
            console.log(
              "[HypaPlus] beforeRequest — message[",
              i,
              "] role:",
              messages[i].role,
              "| has [HypaPlus.memory]:",
              hasPlaceholder,
            );
            if (hasPlaceholder) {
              messages[i] = {
                ...messages[i],
                content: messages[i].content.replace("[HypaPlus.memory]", memoryContext),
              };
              replaced = true;
              console.log(
                "[HypaPlus] beforeRequest — [HypaPlus.memory] REPLACED in message[",
                i,
                "]",
              );
              break;
            }
          }
          if (replaced) {
            // Log memory injection to console
            console.log("[HypaPlus] Memory injected into message");
          }
          if (!replaced) {
            console.log(
              "[HypaPlus] beforeRequest — [HypaPlus.memory] NOT FOUND in any message, falling back to system message append...",
            );
            // Strategy 2: Append to system message or insert at beginning
            const systemIndex = messages.findIndex((m) => m.role === "system");
            if (systemIndex >= 0) {
              messages[systemIndex] = {
                ...messages[systemIndex],
                content: messages[systemIndex].content + "\n\n" + memoryContext,
              };
              console.log(
                "[HypaPlus] beforeRequest — memoryContext appended to system message[",
                systemIndex,
                "]",
              );
            } else {
              messages.unshift({ role: "system", content: memoryContext });
              console.log(
                "[HypaPlus] beforeRequest — memoryContext inserted as new system message at index 0",
              );
            }
          }
        } else {
          console.log(
            "[HypaPlus] beforeRequest — memoryContext is EMPTY/FALSY, placeholder NOT replaced. Nodes exist?",
            getNodes().length > 0,
          );
        }
      }
    } catch (e) {
      if (memoryModeChangePending || memoryInjectionMode !== requestMode) throw e;
      console.error("[HypaPlus] beforeRequest ERROR:", e);
      // Return messages unchanged on error — don't block the main request
    }

    console.log("[HypaPlus] beforeRequest — returning", messages.length, "messages");
    return messages;
  }

  // afterRequest: track assistant responses
  async function afterRequestHandler(content, type) {
    if ((type !== "main" && type !== "model") || isSummarizing) return content;
    console.log(
      "[HypaPlus] afterRequest called — type:",
      type,
      "| content length:",
      _nullishCoalesce(_optionalChain([content, 'optionalAccess', _27 => _27.length]), () => ( 0)),
    );
    // The assistant message may have been appended since beforeRequest.
    invalidateChatMessageCache();
    if (content) {
      try {
        if (await ensureChatContext(true)) return content;
        invalidateChatMessageCache();
        await trackAssistantMessage(content);
        console.log("[HypaPlus] afterRequest — trackAssistantMessage done");
      } catch (e) {
        console.error("[HypaPlus] afterRequest — trackAssistantMessage error:", e);
      }
    }
    return content;
  }

  // ── Settings UI ──────────────────────────────────────────────────────────

  let activeTab = "nodes";
  let editingNodeId = null;
  let nodeListPage = 0;
  let nodeSearchQuery = "";
  let nodeSearchComposing = false;
  let nodeSearchSelStart = null;
  let nodeSearchSelEnd = null;
  let nodeSearchShouldFocus = false;
  let showIncludedNodesOnly = false;
  let showFavoriteNodesOnly = false;
  let nodeSortDirection = "asc";
  let uiScrollTop = 0;
  let showSummarizeDialog = false;
  let showCreateNodeDialog = false;
  const NODES_PER_PAGE = 30;

  async function openSettings() {
    // Auto-load current chat state before showing GUI (gracefully handle no chat)
    try {
      if (await ensureChatContext(true)) uiScrollTop = 0;
    } catch (e) {
      alert("채팅을 읽지 못해 기억 화면을 열지 않았습니다. " + (e?.message || e));
      return;
    }
    await showPluginContainer("fullscreen");
    renderUI();
  }

  async function syncGuiButtonRegistration() {
    if (showGuiButton && !guiButtonPartId) {
      const part = await registerHostButton(
        {
          name: "HypaPlus 1.0.9.g-local.12",
          icon: "🗂️",
          iconType: "html",
          location: "action",
          id: "hypaplus-gui",
        },
        async () => {
          await openSettings();
        },
      );
      guiButtonPartId = part.id;
    } else if (!showGuiButton && guiButtonPartId) {
      await unregisterHostUIPart(guiButtonPartId);
      guiButtonPartId = null;
    }
  }

  function renderUI(scrollTopOverride) {
    if (scrollTopOverride === undefined) {
      const existingBody = document.getElementById("hp-body");
      if (existingBody) uiScrollTop = existingBody.scrollTop;
    } else {
      uiScrollTop = scrollTopOverride;
    }
    // Keep this render's value in its closure: concurrent asynchronous renders
    // must not overwrite the scroll position captured for this one.
    const renderScrollTop = uiScrollTop;
    const context = summaryContext();
    const root = document.createElement("div");
    root.id = "hp-render-pending";
    root.hidden = true;
    document.getElementById("hp-render-pending")?.remove();
    document.body.appendChild(root);
    // Fetch pending messages and char/chat names asynchronously, then render
    Promise.all([
      getPendingMessages(),
      (async () => {
        if (currentCharIndex < 0 || currentChatIndex < 0) return { charName: "?", chatName: "?" };
        let charName = `Char#${currentCharIndex}`;
        let chatName = `Chat#${currentChatIndex}`;
        try {
          const char = await readHostCharacter(context.charIndex);
          if (char && char.name) charName = char.name;
        } catch (_) {
          /* fallback to index */
        }
        try {
          const chat = await readHostChat(context.charIndex, context.chatIndex);
          if (chat && chat.name) chatName = chat.name;
        } catch (_) {
          /* fallback to index */
        }
        return { charName, chatName };
      })(),
    ]).then(([pendingMessages, { charName, chatName }]) => {
      if (root.isConnected && isSummaryContextCurrent(context)) {
        renderUIWithPending(pendingMessages, charName, chatName, renderScrollTop, root);
      } else { root.remove(); }
    }).catch(error => {
      if (root.isConnected) {
        root.remove();
        if (isSummaryContextCurrent(context)) alert("화면을 읽지 못했습니다. " + (error?.message || error));
      }
    });
  }

  function renderUIWithPending(
    pendingMessages,
    charName,
    chatName,
    scrollTop,
    root = document.body,
  ) {
    const allNodes = getNodes();
    const display = activeTab === "nodes" || activeTab === "chunks" ? prepareNodeDisplay(allNodes) : null;
    root.innerHTML = `
      <style>
        .hp-wrap { display:flex; flex-direction:column; height:100vh; color:var(--textcolor,#ccc); font-family:sans-serif; background:var(--bgcolor,#111); }
        .hp-tabs { display:flex; gap:0; border-bottom:2px solid var(--borderc,#333); flex-shrink:0; align-items:center; }
        .hp-tab { padding:10px 18px; cursor:pointer; border:none; background:none; color:var(--textcolor2,#888); font-size:14px; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .15s; }
        .hp-tab:hover { color:var(--textcolor,#eee); }
        .hp-tab.active { color:#4a6cf7; border-bottom-color:#4a6cf7; font-weight:bold; }
        .hp-header-actions { margin-left:auto; display:flex; align-items:center; gap:4px; }
        .hp-version { color:var(--textcolor2,#888); font-size:12px; white-space:nowrap; }
        .hp-close-btn { padding:8px 14px; cursor:pointer; border:none; background:none; color:var(--textcolor2,#888); font-size:18px; line-height:1; transition:all .15s; }
        .hp-close-btn:hover { color:#e74c3c; }
        .hp-body { flex:1; overflow-y:auto; overflow-anchor:none; padding:16px; }
        .hp-panel { display:none; }
        .hp-panel.active { display:block; }
        .hp-stat { display:inline-block; padding:6px 12px; margin:2px 4px; background:var(--darkbg,#1e1e1e); border-radius:6px; font-size:13px; }
        .hp-stat b { color:#4a6cf7; }
        .hp-btn { padding:7px 14px; border:none; border-radius:5px; cursor:pointer; font-size:13px; margin:2px; transition:all .15s; }
        .hp-btn.primary { background:#4a6cf7; color:#fff; }
        .hp-btn.primary:hover { background:#5b7df8; }
        .hp-btn.danger { background:#c0392b; color:#fff; }
        .hp-btn.danger:hover { background:#e74c3c; }
        .hp-btn.secondary { background:#444; color:#ddd; }
        .hp-btn.secondary:hover { background:#555; }
        .hp-btn.small { padding:4px 10px; font-size:12px; }
        .hp-card { background:var(--darkbg,#1a1a1a); border:1px solid var(--borderc,#333); border-radius:8px; padding:12px; margin:8px 0; }
        .hp-card-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; }
        .hp-badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold; }
        .hp-badge.event { background:#2d5a27; color:#8fdf82; }
        .hp-badge.facts { background:#5a3e27; color:#dfb882; }
        .hp-meta { font-size:12px; color:var(--textcolor2,#888); margin:4px 0; }
        .hp-content { font-size:13px; line-height:1.5; margin:6px 0; white-space:pre-wrap; }
        .hp-dialogues { margin:6px 0; padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:4px; font-size:12px; }
        .hp-dialogues .dl-line { margin:2px 0; }
        .hp-dialogues .dl-speaker { color:#dfb882; }
        .hp-input, .hp-textarea, .hp-select { background:#111; color:#ddd; border:1px solid var(--borderc,#444); border-radius:4px; padding:6px 10px; font-size:13px; }
        .hp-textarea { width:100%; resize:vertical; font-family:monospace; }
        .hp-input { width:100%; }
        .hp-select { cursor:pointer; }
        .hp-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:6px 0; }
        .hp-label { font-size:13px; font-weight:bold; min-width:120px; }
        .hp-pagination { display:flex; gap:4px; justify-content:center; margin:12px 0; }
        .hp-empty { color:var(--textcolor2,#666); text-align:center; padding:40px; font-size:14px; }
        .hp-edit-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:100; color:#ddd; }
        .hp-edit-box { background:var(--bgcolor,#1a1a1a); border:1px solid var(--borderc,#444); border-radius:12px; padding:20px; width:90%; max-width:650px; max-height:90vh; overflow-y:auto; color:#ddd; }
        .hp-edit-box h3 { margin-top:0; color:#eee; }
        .hp-edit-box pre { color:#ddd; }
        .hp-edit-box .hp-row { margin:8px 0; }
        .hp-edit-box .hp-label { min-width:80px; }
        .hp-toggle { position:relative; display:inline-block; width:44px; height:24px; }
        .hp-toggle input { opacity:0; width:0; height:0; }
        .hp-toggle .slider { position:absolute; cursor:pointer; inset:0; background:#555; border-radius:24px; transition:.2s; }
        .hp-toggle .slider:before { content:""; position:absolute; height:18px; width:18px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:.2s; }
        .hp-toggle input:checked+.slider { background:#4a6cf7; }
        .hp-toggle input:checked+.slider:before { transform:translateX(20px); }
      </style>
      <div class="hp-wrap">
      ${isSummarizing ? '<div role="status" style="padding:8px">요약 중에는 기억과 설정을 변경할 수 없습니다.</div>' : ""}
        <div class="hp-tabs">
          <button class="hp-tab${activeTab === "nodes" ? " active" : ""}" data-tab="nodes">📋 노드 (${allNodes.length})</button>
          <button class="hp-tab${activeTab === "chunks" ? " active" : ""}" data-tab="chunks">📦 청크 (${state.chunks.length})</button>
          <button class="hp-tab${activeTab === "settings" ? " active" : ""}" data-tab="settings">⚙️ 설정</button>
          <button class="hp-tab${activeTab === "presets" ? " active" : ""}" data-tab="presets">💾 프리셋</button>
          <button class="hp-tab${activeTab === "prompt" ? " active" : ""}" data-tab="prompt">📝 프롬프트</button>
          <button class="hp-tab${activeTab === "regex" ? " active" : ""}" data-tab="regex">🔧 정규식</button>
          <div class="hp-header-actions">
            <span class="hp-version">v${PLUGIN_VERSION}</span>
            <button class="hp-close-btn" id="hp-close" title="Close">✕</button>
          </div>
        </div>
        <div class="hp-body" id="hp-body">
          ${renderActivePanel(pendingMessages, charName, chatName, allNodes, display)}
        </div>
      </div>
      ${showSummarizeDialog ? renderSummarizeDialog(pendingMessages) : ""}
      ${showCreateNodeDialog ? renderCreateNodeOverlay() : ""}
    `;

    if (root !== document.body) {
      root.id = "hp-render-root";
      root.hidden = false;
      document.body.replaceChildren(root);
    }
    const renderedBody = document.getElementById("hp-body");
    if (renderedBody) {
      renderedBody.scrollTop = scrollTop;
      // The browser can reset a newly inserted scroll container after layout.
      // Restore it once more on the next frame, without affecting newer renders.
      requestAnimationFrame(() => {
        if (document.getElementById("hp-body") === renderedBody) renderedBody.scrollTop = scrollTop;
      });
    }
    attachUIEvents(pendingMessages);
    attachChunkNodeEvents();
  }

  // ── Panel: Nodes ─────────────────────────────────────────────────────────

  function renderNodesPanel(
    pendingMessages,
    charName,
    chatName,
    allNodes = getNodes(),
    display = prepareNodeDisplay(allNodes),
  ) {

    // Sort nodes with one consistent key before filtering and paginating.
    const sortedNodes = sortNodesByStoryTime(allNodes, nodeSortDirection === "desc");
    const cachedNodeIds = display.cachedNodeIds;
    const embeddedNodeIds = display.selectedNodeIds;

    const selection = selectNodePage(sortedNodes, {
      includedOnly: memoryInjectionMode !== "all" && showIncludedNodesOnly, favoritesOnly: showFavoriteNodesOnly,
      query: nodeSearchQuery, cachedNodeIds, selectedNodeIds: embeddedNodeIds,
      page: nodeListPage, pageSize: NODES_PER_PAGE,
    });
    nodeListPage = selection.page;
    const { filteredNodes, totalPages, pageNodes } = selection;

    let html = `<div class="hp-panel${activeTab === "nodes" ? " active" : ""}" data-panel="nodes">`;

    // Stats bar
    const selectedCount = memoryInjectionMode === "all" ? allNodes.length : _nullishCoalesce(_optionalChain([state, 'access', _28 => _28.lastSelectedNodeIds, 'optionalAccess', _29 => _29.length]), () => ( 0));
    html += `<div style="margin-bottom:12px;">
      <span class="hp-stat">📊 노드 <b>${allNodes.length}</b>개</span>
      ${nodeSearchQuery || (memoryInjectionMode !== "all" && showIncludedNodesOnly) || showFavoriteNodesOnly ? `<span class="hp-stat">🔍 필터 결과 <b>${filteredNodes.length}</b>개</span>` : ""}
      <span class="hp-stat">📦 청크 <b>${state.chunks.length}</b> 개</span>
      <span class="hp-stat">⏳ 미요약 <b>${pendingMessages.length}</b> 개</span>
      <span class="hp-stat">✅ ${memoryInjectionMode === "all" ? "전체 주입 대상" : "컨텍스트 포함"} <b>${selectedCount}</b> 개</span>
      <span class="hp-stat">🆔 챗: <b>${escapeHtml(charName)} / ${escapeHtml(chatName)}</b></span>
    </div>`;

    if (memoryInjectionMode === "all") html += '<p style="font-size:12px;color:#aaa;">전체 기억은 등록 순서로 주입합니다. 아래 목록의 시간순 정렬·검색·페이지는 주입 순서를 바꾸지 않습니다.</p>';

    // Action buttons
    html += `<div style="margin-bottom:12px;">
      <button class="hp-btn primary" id="hp-force-summarize">📋 수동 요약 (미요약 ${pendingMessages.length}개)</button>
      <button class="hp-btn primary" id="hp-auto-summarize-btn" style="background:#27ae60;">⚡ 자동 요약 (미요약 개수 &lt; ${autoSummarizeThreshold}까지)</button>
      <button class="hp-btn primary" id="hp-create-node" style="background:#8e44ad;">➕ 수동 노드 추가</button>
      <button class="hp-btn secondary" id="hp-filter-included-nodes" ${memoryInjectionMode === "all" ? "disabled" : ""} style="${memoryInjectionMode !== "all" && showIncludedNodesOnly ? "background:#4a6cf7;color:#fff;" : ""}">🧩 캐시/임베딩 노드만</button>
      <button class="hp-btn secondary" id="hp-filter-favorite-nodes" style="${showFavoriteNodesOnly ? "background:#f39c12;color:#000;" : ""}">⭐ 즐겨찾기만</button>
      <button class="hp-btn secondary" id="hp-toggle-node-sort">${nodeSortDirection === "asc" ? "↑ 오래된 순" : "↓ 최신순"}</button>
      <button class="hp-btn secondary" id="hp-backup-download">💾 백업</button>
      <button class="hp-btn secondary" id="hp-backup-restore">📥 복구</button>
      <input type="file" id="hp-restore-file" accept=".json" style="display:none;">
      <button class="hp-btn danger" id="hp-clear-memory">🗑️ 모두 지우기</button>
    </div>`;

    // Search bar
    html += `<div style="margin-bottom:12px;">
      <input class="hp-input" type="text" id="hp-node-search" placeholder="🔍 노드 검색 (내용, 시간, 인물, 장소)..." value="${escapeHtml(nodeSearchQuery)}" style="max-width:400px;">
      ${nodeSearchQuery ? `<button class="hp-btn secondary small" id="hp-node-search-clear">✕ 초기화</button>` : ""}
    </div>`;

    // Pending messages preview
    if (pendingMessages.length > 0) {
      const window = pendingMessages.slice(0, chunkSize);
      const displayPending = includeUserMessages ? window : window.filter((m) => m.role !== "user");
      const previewCount = displayPending.length;
      html += `<details style="margin-bottom:12px;" open>
        <summary style="cursor:pointer;font-size:13px;color:#4a6cf7;font-weight:bold;">⏳ 미요약 메시지 (총 ${pendingMessages.length} 개 — 첫 ${chunkSize}개 중 ${previewCount}개 출력)</summary>
        <div style="max-height:200px;overflow-y:auto;margin-top:6px;background:#0a0a0a;padding:8px;border-radius:4px;font-size:12px;">`;
      for (let i = 0; i < previewCount; i++) {
        const msg = displayPending[i];
        const roleLabel = msg.role === "user" ? "👤" : "🤖";
        const preview = msg.content.length > 200 ? msg.content.slice(0, 200) + "..." : msg.content;
        html += `<div style="padding:3px 0;border-bottom:1px solid #1a1a1a;">
          <span style="color:#4a6cf7;">[${i + 1}]</span> ${roleLabel} ${escapeHtml(preview)}
        </div>`;
      }
      html += `</div></details>`;
    }

    if (pageNodes.length === 0) {
      html += `<div class="hp-empty">${nodeSearchQuery || (memoryInjectionMode !== "all" && showIncludedNodesOnly) || showFavoriteNodesOnly ? "필터 결과가 없습니다." : "요약 노드가 없습니다. 요약 노드를 생성하세요!"}</div>`;
    } else {
      const firstUndated = pageNodes.find(node => parseStoryTime(node.time).day === null);
      for (const node of pageNodes) {
        if (node === firstUndated) html += `<h4 style="color:#999;margin-top:16px;">날짜 미상</h4>`;
        html += renderNodeCard(node, nodeDisplayValues(node, display));
      }
    }

    // Pagination
    if (totalPages > 1) {
      html += `<div class="hp-pagination">
        <button class="hp-btn secondary small" data-page="0" ${nodeListPage === 0 ? "disabled" : ""}>« First</button>
        <button class="hp-btn secondary small" data-page="${nodeListPage - 1}" ${nodeListPage === 0 ? "disabled" : ""}>‹ Prev</button>
        <span style="padding:4px 12px;font-size:13px;">Page ${nodeListPage + 1} / ${totalPages}</span>
        <button class="hp-btn secondary small" data-page="${nodeListPage + 1}" ${nodeListPage >= totalPages - 1 ? "disabled" : ""}>Next ›</button>
        <button class="hp-btn secondary small" data-page="${totalPages - 1}" ${nodeListPage >= totalPages - 1 ? "disabled" : ""}>Last »</button>
      </div>`;
    }

    html += `</div>`;
    return html;
  }

  function renderNodeCard(node, { parentChunk, scores, isSelected, isCached, timeScoringMode }) {
    // Find which chunk this node belongs to
    const chunkLink = parentChunk
      ? `<span style="font-size:11px;color:#4a6cf7;margin-left:6px;" title="Chunk #${parentChunk.id}">📦 Chunk #${parentChunk.id}</span>`
      : "";
    const cardBackground = isCached
      ? "background:rgb(15,10,0);"
      : isSelected
        ? "background:rgb(0,20,0);"
        : "";
    const selectedBadge = isSelected
      ? `<span style="font-size:11px;color:#8fdf82;margin-left:4px;" title="임베딩 검색으로 컨텍스트에 포함">🧬</span>`
      : "";
    const cachedBadge = isCached
      ? `<span style="font-size:11px;color:#dfb882;margin-left:4px;" title="최근 노드 캐시에 포함">📌 캐시</span>`
      : "";
    const scoreBar = scores
      ? `
      <div style="margin-top:6px;display:flex;gap:8px;font-size:11px;">
        <span style="color:#8fdf82;" title="유사도 점수">🧬 Sim: ${(scores.similarity * 100).toFixed(1)}%</span>
        <span style="color:#dfb882;" title="시간 기반 점수">⏱️ 시간: ${timeScoringMode === "none" ? "사용 안 함" : `${(scores.time * 100).toFixed(1)}%`}</span>
        <span style="color:#4a6cf7;" title="최종 점수">⭐ Total: ${(scores.combined * 100).toFixed(1)}%</span>
      </div>`
      : "";

    return `
    <div class="hp-card" data-node-id="${node.id}" style="${cardBackground}">
      <div class="hp-card-header">
        <span>
          <span class="hp-badge ${node.type}">${node.type.toUpperCase()}</span>
          <strong>${escapeHtml(node.time)}</strong>
          <span style="font-size:11px;color:#666;margin-left:6px;">#${node.id}</span>
          ${selectedBadge}
          ${cachedBadge}
          ${chunkLink}
        </span>
        <span>
          <button class="hp-btn secondary small hp-fav-node" data-node-id="${node.id}" style="${node.favorite ? "background:#f39c12;color:#000;" : ""}">${node.favorite ? "⭐" : "☆"}</button>
          <button class="hp-btn secondary small hp-edit-node" data-node-id="${node.id}">✏️ 편집</button>
          <button class="hp-btn danger small hp-delete-node" data-node-id="${node.id}">🗑️ 삭제</button>
        </span>
      </div>
      ${node.location ? `<div class="hp-meta">📍 ${escapeHtml(node.location)}</div>` : ""}
      ${node.characters.length > 0 ? `<div class="hp-meta">👤 ${escapeHtml(node.characters.join(", "))}</div>` : ""}
      <div class="hp-content">${escapeHtml(node.content)}</div>
      ${
        node.dialogues && node.dialogues.length > 0
          ? `
        <div class="hp-dialogues">
          ${node.dialogues.map((d) => `<div class="dl-line"><span class="dl-speaker">${escapeHtml(d.speaker)}:</span> "${escapeHtml(d.text)}"</div>`).join("")}
        </div>
      `
          : ""
      }
      ${scoreBar}
    </div>`;
  }

  // ── Panel: Chunks ────────────────────────────────────────────────────────

  function renderChunkMemoEditor(chunk) {
    const memo = _nullishCoalesce(chunk.memo, () => ( ""));
    return `
      <div style="margin-top:8px;">
        ${
          memo.trim()
            ? `<div style="padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:4px;font-size:12px;white-space:pre-wrap;"><strong style="color:#bbb;">📝 메모</strong><div style="margin-top:4px;">${escapeHtml(memo)}</div></div>`
            : ""
        }
        <details style="margin-top:6px;">
          <summary style="cursor:pointer;font-size:12px;color:#4a6cf7;">✏️ 메모 편집</summary>
          <div style="margin-top:6px;">
            <textarea class="hp-textarea hp-chunk-memo" data-chunk-id="${chunk.id}" style="height:64px;" placeholder="이 청크에 대한 메모를 입력하세요...">${escapeHtml(memo)}</textarea>
            <button class="hp-btn secondary small hp-save-chunk-memo" data-chunk-id="${chunk.id}" style="margin-top:4px;">💾 메모 저장</button>
          </div>
        </details>
      </div>`;
  }

  function renderChunksPanel(display = prepareNodeDisplay(getNodes())) {
    let html = `<div class="hp-panel${activeTab === "chunks" ? " active" : ""}" data-panel="chunks">`;
    html += `<h3>📦 요약 청크</h3>`;

    // Separate manual chunk (id "0") from auto chunks
    const manualChunk = state.chunks.find((c) => c.id === "0");
    const autoChunks = state.chunks.filter((c) => c.id !== "0");

    // Show manual chunk first if it exists
    if (manualChunk) {
      html += `<h4 style="margin:16px 0 8px;color:#8e44ad;">✋ 수동 노드 (청크 0)</h4>`;
      html += `
      <div class="hp-card" style="border-color:#8e44ad;">
        <div class="hp-card-header">
          <span>
            <strong style="color:#8e44ad;">✋ Chunk #0 — 수동 노드</strong>
            <span style="font-size:12px;color:#888;margin-left:8px;"><span class="hp-chunk-node-count">${manualChunk.nodes.length}</span> nodes</span>
          </span>
        </div>
        ${renderChunkMemoEditor(manualChunk)}`;
      if (manualChunk.nodes.length > 0) {
        html += `<details class="hp-chunk-nodes" data-chunk-id="${manualChunk.id}" style="margin-top:8px;" open>
          <summary style="cursor:pointer;font-size:13px;color:#8e44ad;font-weight:bold;">📋 수동 노드 (${manualChunk.nodes.length}개)</summary>
          <div class="hp-chunk-node-list" style="margin-top:6px;">`;
        for (const node of manualChunk.nodes) {
          html += renderNodeCardCompact(node, nodeDisplayValues(node, display));
        }
        html += `</div></details>`;
      } else {
        html += `<div style="margin-top:6px;font-size:12px;color:#888;">수동 노드가 없습니다.</div>`;
      }
      html += `</div>`;
    }

    if (autoChunks.length === 0) {
      if (!manualChunk) {
        html += `<div class="hp-empty">아직 요약 청크가 없습니다. 요약을 생성하세요!</div>`;
      }
    } else {
      html += `<h4 style="margin:16px 0 8px;color:#4a6cf7;">🤖 자동 요약 청크</h4>`;
      // Show newest first
      const reversed = [...autoChunks].reverse();
      for (const chunk of reversed) {
        const date = new Date(chunk.createdAt).toLocaleString();
        let statusBadge = "";
        if (getChunkStatus(chunk) === "needs_review") {
          statusBadge = `<span style="font-size:11px;color:#f39c12;margin-left:6px;">⚠️ 확인 필요 · 원문 유지</span>`;
        } else if (chunk.summarized === "pending") {
          statusBadge = `<span style="font-size:11px;color:#f39c12;margin-left:6px;" title="노드 생성 대기중">⏳ 응답 대기중...</span>`;
        } else if (chunk.summarized === "failed") {
          statusBadge = `<span style="font-size:11px;color:#e74c3c;margin-left:6px;" title="요약 실패 — 재요약 버튼으로 다시 시도하세요">❌ 요약 실패</span>`;
        }
        html += `
        <div class="hp-card">
          <div class="hp-card-header">
            <span>
              <strong>Chunk #${chunk.id}</strong>
              <span style="font-size:12px;color:#888;margin-left:8px;">${date}</span>
              <span style="font-size:12px;color:#888;margin-left:8px;">${chunk.messageCount} msgs → <span class="hp-chunk-node-count">${chunk.nodes.length}</span> nodes</span>
              ${statusBadge}
            </span>
            <span>
              <button class="hp-btn secondary small hp-reroll-chunk" data-chunk-id="${chunk.id}">🔄 재요약</button>
              <button class="hp-btn danger small hp-delete-chunk" data-chunk-id="${chunk.id}">🗑️ 삭제</button>
            </span>
          </div>
          <div style="margin-top:8px;font-size:12px;color:#888;">
            📍 메시지 ${chunk.chatIds.length}개 (인덱스: ${getChunkMessageIndices(chunk).slice(0, 5).join(", ")}${chunk.chatIds.length > 5 ? "..." : ""})
            <button class="hp-btn secondary small hp-view-chunk-msgs" data-chunk-id="${chunk.id}" style="margin-left:8px;">👁️ 저장 원문</button>
            <button class="hp-btn secondary small hp-view-processed-msgs" data-chunk-id="${chunk.id}">기억에 사용할 내용</button>
          </div>
          ${renderChunkMemoEditor(chunk)}
          ${chunk.lastSummaryAttempt?.reason ? `<div style="font-size:12px;margin-top:8px;color:#c9aa72;">${escapeHtml(chunk.lastSummaryAttempt.reason)}${hasCommittedSummary(chunk) && chunk.lastSummaryAttempt.status !== "done" ? " 이전 기억은 유지됩니다." : ""}</div>` : ""}
          ${!hasCommittedSummary(chunk) && chunk.nodes.length === 0 ? `<div style="font-size:12px;margin-top:8px;color:#aaa;">이 구간은 자동 완료하지 않습니다. 원문 확인 후 재요약하거나 기억 없이 완료할 수 있습니다. <button class="hp-btn secondary small hp-accept-empty-chunk" data-chunk-id="${chunk.id}">기억 없이 완료</button></div>` : ""}`;


        // Show connected nodes within the chunk
        if (chunk.nodes.length > 0) {
          html += `<details class="hp-chunk-nodes" data-chunk-id="${chunk.id}" style="margin-top:8px;">
            <summary style="cursor:pointer;font-size:13px;color:#4a6cf7;font-weight:bold;">📋 연결된 노드 (${chunk.nodes.length}개)</summary>
            <div class="hp-chunk-node-list" style="margin-top:6px;">`;
          html += `</div></details>`;
        } else if (hasCommittedSummary(chunk)) {
          html += `<div style="margin-top:6px;font-size:12px;color:#888;">사용자가 기억 없이 완료한 구간입니다.</div>`;
        } else if (chunk.summarized === "failed") {
          html += `<div style="margin-top:6px;font-size:12px;color:#e74c3c;">⚠️ 요약에 실패했습니다. 재요약 버튼으로 다시 시도하세요.</div>`;
        }

        html += `</div>`;
      }
    }

    html += `</div>`;
    return html;
  }

  /** Compact node card for chunk panel (with edit button) */
  function renderNodeCardCompact(node, { parentChunk, scores, isSelected, isCached, timeScoringMode }) {
    const cardBackground = isCached
      ? "background:rgb(30,20,0);"
      : isSelected
        ? "background:rgb(0,40,0);"
        : "";
    const selectedBadge = isSelected
      ? `<span style="font-size:11px;color:#8fdf82;margin-left:4px;" title="임베딩 검색으로 컨텍스트에 포함">🧬</span>`
      : "";
    const cachedBadge = isCached
      ? `<span style="font-size:11px;color:#dfb882;margin-left:4px;" title="최근 노드 캐시에 포함">📌 캐시</span>`
      : "";

    return `
    <div class="hp-card" data-node-id="${node.id}" style="margin:4px 0;padding:8px;${cardBackground}">
      <div class="hp-card-header">
        <span>
          <span class="hp-badge ${node.type}">${node.type.toUpperCase()}</span>
          <strong>${escapeHtml(node.time)}</strong>
          <span style="font-size:11px;color:#666;margin-left:6px;">#${node.id}</span>
          <span class="hp-node-status">${selectedBadge}${cachedBadge}</span>
        </span>
        <span>
          <button class="hp-btn secondary small hp-fav-node" data-node-id="${node.id}" style="${node.favorite ? "background:#f39c12;color:#000;" : ""}">${node.favorite ? "⭐" : "☆"}</button>
          <button class="hp-btn secondary small hp-edit-node" data-node-id="${node.id}">✏️ 편집</button>
          <button class="hp-btn danger small hp-delete-node" data-node-id="${node.id}">🗑️ 삭제</button>
        </span>
      </div>
      ${node.location ? `<div class="hp-meta">📍 ${escapeHtml(node.location)}</div>` : ""}
      ${node.characters.length > 0 ? `<div class="hp-meta">👤 ${escapeHtml(node.characters.join(", "))}</div>` : ""}
      <div class="hp-content">${escapeHtml(node.content)}</div>
      ${
        node.dialogues && node.dialogues.length > 0
          ? `
        <div class="hp-dialogues">
          ${node.dialogues.map((d) => `<div class="dl-line"><span class="dl-speaker">${escapeHtml(d.speaker)}:</span> "${escapeHtml(d.text)}"</div>`).join("")}
        </div>
      `
          : ""
      }
      ${
        scores
          ? `
      <div style="margin-top:4px;display:flex;gap:8px;font-size:11px;">
        <span style="color:#8fdf82;">🧬 Sim: ${(scores.similarity * 100).toFixed(1)}%</span>
        <span style="color:#dfb882;">⏱️ 시간: ${timeScoringMode === "none" ? "사용 안 함" : `${(scores.time * 100).toFixed(1)}%`}</span>
        <span style="color:#4a6cf7;">⭐ Total: ${(scores.combined * 100).toFixed(1)}%</span>
      </div>`
          : ""
      }
    </div>`;
  }

  // ── Panel: Settings ──────────────────────────────────────────────────────

  function renderSettingsPanel(pendingMessages) {
    return `
    <div class="hp-panel${activeTab === "settings" ? " active" : ""}" data-panel="settings">
      <style>
        [data-panel="settings"] [data-hp-selection-control]:disabled { opacity:0.55; }
        [data-panel="settings"] .hp-toggle:has(input:disabled) { opacity:0.5; filter:grayscale(1); }
      </style>
      <h3>⚙️ HypaPlus 설정</h3>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">🧠 기억 주입</h4>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">주입 방식</span>
          <label><input type="radio" name="hp-memory-injection-mode" value="selected" ${memoryInjectionMode === "selected" ? "checked" : ""}> 선별 주입</label>
          <label><input type="radio" name="hp-memory-injection-mode" value="all" ${memoryInjectionMode === "all" ? "checked" : ""}> 전체 기억 주입</label>
        </div>
        <div style="font-size:12px;color:#aaa;margin:4px 0 8px;">모든 채팅에 적용 · 설정 저장 후 반영</div>
        <div id="hp-memory-mode-description" role="status" aria-live="polite" style="font-size:13px;margin-bottom:12px;"></div>
        <div class="hp-row">
          <span class="hp-label">현재 채팅의 전체 기억량</span>
          <span id="hp-memory-volume-result" role="status" aria-live="polite">미계산</span>
          <button type="button" class="hp-btn secondary small" id="hp-calculate-memory-volume">계산</button>
          <span style="font-size:12px;color:#888;">최근 캐시 포함 · 현재 기억 출력 형식 기준</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">최대 토큰 용량</span>
          <input class="hp-input" type="number" id="hp-max-tokens" data-hp-selection-control value="${maxMemoryTokens}" min="100" max="10000" step="50" style="width:100px;">
          <span style="font-size:12px;color:#888;">장기기억에 할당되는 최대 토큰 수. 추정치이며, 실제 토큰 수와 다를 수 있습니다.</span>
          <span data-hp-full-note hidden style="font-size:12px;color:#aaa;">전체 주입에서는 이 한도를 적용하지 않습니다.</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">최근 노드 캐시</span>
          <label class="hp-toggle">
            <input type="checkbox" id="hp-recent-node-cache" data-hp-selection-control ${recentNodeCache ? "checked" : ""}>
            <span class="slider"></span>
          </label>
          <span style="font-size:12px;color:#888;">최근 노드를 [HypaPlus.cached]로 주입하고 임베딩/메모리에서 제외합니다</span>
          <span data-hp-full-note hidden style="font-size:12px;color:#aaa;">전체 주입에서는 모든 기억에 한 번만 포함합니다.</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">캐시할 노드 수</span>
          <input class="hp-input" type="number" id="hp-recent-node-cache-count" data-hp-selection-control value="${recentNodeCacheCount}" min="1" max="100" style="width:100px;">
          <span style="font-size:12px;color:#888;">최근(시간순) 노드 중 캐시할 개수</span>
        </div>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">📋 요약</h4>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">청크 크기</span>
          <input class="hp-input" type="number" id="hp-chunk-size" value="${chunkSize}" min="2" max="100" style="width:100px;">
          <span style="font-size:12px;color:#888;">한 요약 청크에 들어가는 메시지 수</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">자동 요약</span>
          <label class="hp-toggle">
            <input type="checkbox" id="hp-auto-summarize" ${autoSummarize ? "checked" : ""}>
            <span class="slider"></span>
          </label>
          <span style="font-size:12px;color:#888;">자동 요약을 켭니다</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">자동 요약 임계값</span>
          <input class="hp-input" type="number" id="hp-auto-threshold" value="${autoSummarizeThreshold}" min="2" max="500" style="width:100px;">
          <span style="font-size:12px;color:#888;">남은 메시지 수가 값보다 작아질 때까지 자동 요약</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">User 메시지 포함</span>
          <label class="hp-toggle">
            <input type="checkbox" id="hp-include-user" ${includeUserMessages ? "checked" : ""}>
            <span class="slider"></span>
          </label>
          <span style="font-size:12px;color:#888;">User 메시지를 요약에 포함합니다</span>
        </div>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">🧬 임베딩</h4>
      <p data-hp-full-note hidden style="font-size:12px;color:#aaa;">전체 주입에서는 임베딩을 호출하지 않습니다. 연결 설정은 보관합니다.</p>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">임베딩 URL</span>
          <input class="hp-input" type="text" id="hp-embedding-url" data-hp-selection-control value="${escapeHtml(embeddingUrl)}" placeholder="http://localhost:8080/embeddings">
          <span style="font-size:12px;color:#888;">OpenAI-호환 /v1/embeddings 엔드포인트</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">임베딩 모델</span>
          <input class="hp-input" type="text" id="hp-embedding-model" data-hp-selection-control value="${escapeHtml(embeddingModel)}" placeholder="text-embedding-3-small">
          <span style="font-size:12px;color:#888;">임베딩 모델 이름</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">API 키</span>
          <input class="hp-input" type="password" id="hp-embedding-api-key" data-hp-selection-control value="${escapeHtml(embeddingApiKey)}" placeholder="sk-...">
          <span style="font-size:12px;color:#888;">임베딩 모델 API 키</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">임베딩 요청 메시지 수</span>
          <input class="hp-input" type="number" id="hp-embedding-context" data-hp-selection-control value="${embeddingContextMessages}" min="1" max="50" style="width:100px;">
          <span style="font-size:12px;color:#888;">임베딩 유사도 측정에 포함할 최근 메시지 개수</span>
        </div>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">⭐ 점수</h4>
      <p data-hp-full-note hidden style="font-size:12px;color:#aaa;">전체 주입에서는 점수로 기억을 선별하지 않습니다. 가중치는 보관합니다.</p>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">망각 시간 (일)</span>
          <input class="hp-input" type="number" id="hp-time-decay" data-hp-selection-control value="${timeDecayDays}" min="1" max="365" style="width:100px;">
          <span style="font-size:12px;color:#888;">기억이 감쇠하는 스케일</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">시간 반영 범위</span>
          <select class="hp-select" id="hp-time-scoring-mode" data-hp-selection-control>
            <option value="minute" ${timeScoringMode === "minute" ? "selected" : ""}>날짜와 분까지</option>
            <option value="day" ${timeScoringMode === "day" ? "selected" : ""}>날짜까지만</option>
            <option value="none" ${timeScoringMode === "none" ? "selected" : ""}>사용하지 않음</option>
          </select>
          <span style="font-size:12px;color:#888;">노드 검색 점수에 시간 차이를 얼마나 정밀하게 반영할지 선택합니다.</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">시간 가중치</span>
          <input class="hp-input" type="number" id="hp-time-weight" data-hp-selection-control value="${timeWeight}" min="0" max="10" step="0.1" style="width:100px;">
          <span style="font-size:12px;color:#888;">시간 기반 점수의 가중치입니다. 기본값 1.</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">유사도 가중치</span>
          <input class="hp-input" type="number" id="hp-similarity-weight" data-hp-selection-control value="${similarityWeight}" min="0" max="10" step="0.1" style="width:100px;">
          <span style="font-size:12px;color:#888;">유사도 점수의 가중치입니다. 기본값 1.</span>
        </div>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">🖥️ 인터페이스</h4>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">GUI 아이콘 버튼 표시</span>
          <label class="hp-toggle">
            <input type="checkbox" id="hp-show-gui-button" ${showGuiButton ? "checked" : ""}>
            <span class="slider"></span>
          </label>
          <span style="font-size:12px;color:#888;">기본 채팅창에 HypaPlus GUI 버튼을 표시합니다</span>
        </div>
      </div>

      <button class="hp-btn primary" id="hp-save-settings" style="margin-top:12px;">💾 설정 저장</button>

      <h3 style="margin-top:20px;">⚡ 동작</h3>
      <div class="hp-card">
        <button class="hp-btn primary" id="hp-force-summarize2">📋 수동 요약 (미요약 ${pendingMessages.length}개)</button>
        <button class="hp-btn secondary" id="hp-preview-query" data-hp-selection-action>👁️ 검색 입력 미리보기</button>
        <button class="hp-btn secondary" id="hp-test-embedding" data-hp-selection-action>🧪 임베딩 테스트</button>
        <button class="hp-btn danger" id="hp-clear-memory2">🗑️ 모든 기억 제거</button>
      </div>
    </div>`;
  }

  // ── Panel: Presets ───────────────────────────────────────────────────────

  function renderPresetsPanel() {
    return `
    <div class="hp-panel${activeTab === "presets" ? " active" : ""}" data-panel="presets">
      <h3>💾 프리셋</h3>
      <p style="font-size:12px;color:#888;">요약 프리셋(프롬프트, 청크 크기, user 메시지 포함 여부, 임베딩 메시지 개수)을 저장하거나 불러옵니다.</p>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">💾 현재 설정을 프리셋으로 저장</h4>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">Preset Name</span>
          <input class="hp-input" type="text" id="hp-preset-name" placeholder="My Preset" style="width:200px;">
        </div>
        <button class="hp-btn primary" id="hp-save-preset">💾 프리셋 이름</button>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">📥 하이파에서 불러오기</h4>
      <div class="hp-card">
        <p style="font-size:12px;color:#888;">하이파 JSON 프리셋 파일을 선택하세요.</p>
        <input type="file" id="hp-import-file" accept=".json" style="color:#ddd;font-size:13px;">
        <button class="hp-btn primary" id="hp-import-preset" style="margin-top:8px;">📥 불러오기</button>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">📂 저장된 프리셋</h4>
      <div id="hp-preset-list"><span style="color:#888;font-size:13px;">Loading...</span></div>
    </div>`;
  }

  // ── Panel: Regex ─────────────────────────────────────────────────────────

  function renderRegexPanel() {
    return `
    <div class="hp-panel${activeTab === "regex" ? " active" : ""}" data-panel="regex">
      <h3>🔧 정규식 관리</h3>
      ${renderMemoryCleanupSettings()}
      <p style="font-size:12px;color:#888;">메인 프리셋, 채팅방 정규식, 모듈 정규식에서 리퀘스트 데이터 수정 정규식을 불러옵니다. (선택)</p>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">✅ 활성 정규식 현황</h4>
      <div class="hp-card">
        <div style="font-size:13px;">
          <span style="color:#888;">메인 프리셋:</span>
          <b id="hp-active-preset-name" style="color:#4a6cf7;">${activeRegexPresetName || "(none)"}</b>
          <span style="color:#888;margin-left:12px;">채팅방 정규식:</span>
          <b style="color:#27ae60;">${state.chatRegex.length}개 활성화</b>
          <span style="color:#888;margin-left:12px;">모듈 정규식:</span>
          <b style="color:#dfb882;">${moduleRegexCache.length}개 자동 감지</b>
        </div>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">📂 메인 정규식 프리셋 (글로벌)</h4>
      <div class="hp-card">
        <p style="font-size:12px;color:#888;">메인 채팅 프롬프트 정규식을 JSON 파일로 다운로드하여 여기에 업로드하세요.</p>
        <div class="hp-row">
          <span class="hp-label">프리셋 이름</span>
          <input class="hp-input" type="text" id="hp-regex-preset-name" placeholder="My Regex Preset" style="width:200px;">
        </div>
        <input type="file" id="hp-regex-import-file" accept=".json" style="color:#ddd;font-size:13px;margin:6px 0;">
        <button class="hp-btn primary" id="hp-regex-import-preset" style="margin-top:4px;">📥 프리셋 불러오기</button>
      </div>
      <div id="hp-regex-preset-list"><span style="color:#888;font-size:13px;">Loading...</span></div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">💬 채팅방 정규식 (읽기 전용)</h4>
      <div class="hp-card">
        <p style="font-size:12px;color:#888;">채팅방 설정의 정규식을 JSON 파일로 다운로드하여 여기에 업로드하세요. 바꾸려면 다시 업로드하세요.</p>
        <input type="file" id="hp-chat-regex-file" accept=".json" style="color:#ddd;font-size:13px;margin:6px 0;">
        <button class="hp-btn primary" id="hp-chat-regex-upload" style="margin-top:4px;">📤 업로드 / 바꾸기</button>
        <span style="font-size:12px;color:#888;margin-left:8px;">${state.chatRegex.length}개 정규식 감지됨</span>
      </div>
      <div id="hp-chat-regex-list"></div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">📦 모듈 정규식 (읽기 전용, 자동 감지)</h4>
      <div class="hp-card">
        <p style="font-size:12px;color:#888;">활성화된 모듈에서 리퀘스트 데이터 수정 정규식을 자동으로 감지합니다. 정규식이 보이지 않으면 새로고침하세요.</p>
        <button class="hp-btn secondary" id="hp-refresh-module-regex">🔄 새로고침</button>
        <span style="font-size:12px;color:#888;margin-left:8px;">${moduleRegexCache.length}개 정규식 캐시됨</span>
      </div>
      <div id="hp-module-regex-list"></div>
      <p style="font-size:12px;color:#aaa;">기억에는 일반 정규식만 적용합니다. 조건문·변수·포켓리스 전용 명령은 건너뛰며, 저장 원문은 바꾸지 않습니다.</p>
    </div>`;
  }

  // ── Panel: Prompt ────────────────────────────────────────────────────────

  function renderPromptPanel() {
    return `
    <div class="hp-panel${activeTab === "prompt" ? " active" : ""}" data-panel="prompt">
      <h3>📝 요약 프롬프트</h3>
      <p style="font-size:12px;color:#888;">챗 메시지는 <code>{{slot}}</code> 에 들어갑니다.</p>
      <textarea class="hp-textarea" id="hp-prompt-textarea" style="height:400px;">${escapeHtml(summaryPrompt)}</textarea>
      <div style="margin-top:8px;">
        <button class="hp-btn primary" id="hp-save-prompt">💾 프롬프트 저장</button>
        <button class="hp-btn secondary" id="hp-reset-prompt">🔄 기본값으로 초기화</button>
      </div>

      <h3 style="margin-top:24px;">🏷️ 컨텍스트 출력 포맷</h3>
      <p style="font-size:12px;color:#888;">
        출력 템플릿입니다. 아래 플레이스홀더가 실제 값으로 치환됩니다:<br>
        <code>[[time]]</code> = 시간, <code>[[location]]</code> = 장소, <code>[[characters]]</code> = 인물, <code>[[content]]</code> = 내용, <code>[[dialogues]]</code> = 대사<br>
        빈 필드는 자동으로 정리됩니다.
      </p>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">이벤트 포맷</span>
        </div>
        <textarea class="hp-textarea" id="hp-event-format" style="height:80px;">${escapeHtml(eventFormat)}</textarea>
        <div class="hp-row">
          <span class="hp-label">사실 포맷</span>
        </div>
        <textarea class="hp-textarea" id="hp-facts-format" style="height:80px;">${escapeHtml(factsFormat)}</textarea>
        <button class="hp-btn primary" id="hp-save-format-labels" style="margin-top:8px;">💾 포맷 저장</button>
        <button class="hp-btn secondary" id="hp-reset-format-labels" style="margin-top:8px;">🔄 기본값으로 초기화</button>
      </div>
    </div>`;
  }

  // ── Edit Overlay ─────────────────────────────────────────────────────────

  function renderEditOverlay(nodeId = editingNodeId) {
    const node = findNodeById(nodeId);
    if (!node) return "";

    const dialoguesText = node.dialogues
      ? node.dialogues.map((d) => `${d.speaker}: "${d.text}"`).join("\n")
      : "";

    return `
    <div class="hp-edit-overlay" id="hp-edit-overlay">
      <div class="hp-edit-box">
        <h3>✏️ 노드 수정</h3>
        <div class="hp-row">
          <span class="hp-label">종류</span>
          <select class="hp-select" id="hp-edit-type">
            <option value="event" ${node.type === "event" ? "selected" : ""}>Event</option>
            <option value="facts" ${node.type === "facts" ? "selected" : ""}>Facts</option>
          </select>
        </div>
        <div class="hp-row">
          <span class="hp-label">시간</span>
          <input class="hp-input" id="hp-edit-time" value="${escapeHtml(node.time)}">
        </div>
        <div class="hp-row">
          <span class="hp-label">위치</span>
          <input class="hp-input" id="hp-edit-location" value="${escapeHtml(_nullishCoalesce(node.location, () => ( "")))}" placeholder="(optional)">
        </div>
        <div class="hp-row">
          <span class="hp-label">인물</span>
          <input class="hp-input" id="hp-edit-characters" value="${escapeHtml(node.characters.join(", "))}" placeholder="쉼표로 구분">
        </div>
        <div class="hp-row">
          <span class="hp-label">내용</span>
          <textarea class="hp-textarea" id="hp-edit-content" style="height:120px;">${escapeHtml(node.content)}</textarea>
        </div>
        <div class="hp-row">
          <span class="hp-label">대사</span>
          <textarea class="hp-textarea" id="hp-edit-dialogues" style="height:80px;" placeholder="발화자: &quot;대사&quot;&#10;한 줄에 하나씩">${escapeHtml(dialoguesText)}</textarea>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
          <button class="hp-btn secondary" id="hp-edit-cancel">취소</button>
          <button class="hp-btn primary" id="hp-edit-save">💾 저장</button>
        </div>
      </div>
    </div>`;
  }

  // ── Create Node Overlay ──────────────────────────────────────────────────

  function renderCreateNodeOverlay() {
    return `
    <div class="hp-edit-overlay" id="hp-create-overlay">
      <div class="hp-edit-box">
        <h3>➕ 수동 노드 추가</h3>
        <p style="font-size:12px;color:#888;">이 노드는 가상의 '청크 0'에 저장되며, 자동 요약과 무관하게 유지됩니다.</p>
        <div class="hp-row">
          <span class="hp-label">종류</span>
          <select class="hp-select" id="hp-create-type">
            <option value="event" selected>Event</option>
            <option value="facts">Facts</option>
          </select>
        </div>
        <div class="hp-row">
          <span class="hp-label">시간</span>
          <input class="hp-input" id="hp-create-time" value="" placeholder="이야기 날짜와 시간 (YYYY-MM-DD 오전)">
        </div>
        <div class="hp-row">
          <span class="hp-label">위치</span>
          <input class="hp-input" id="hp-create-location" placeholder="(선택)">
        </div>
        <div class="hp-row">
          <span class="hp-label">인물</span>
          <input class="hp-input" id="hp-create-characters" placeholder="쉼표로 구분">
        </div>
        <div class="hp-row">
          <span class="hp-label">내용</span>
          <textarea class="hp-textarea" id="hp-create-content" style="height:120px;" placeholder="노드 내용을 입력하세요..."></textarea>
        </div>
        <div class="hp-row">
          <span class="hp-label">대사</span>
          <textarea class="hp-textarea" id="hp-create-dialogues" style="height:80px;" placeholder='발화자: "대사"&#10;한 줄에 하나씩 (선택)'></textarea>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
          <button class="hp-btn secondary" id="hp-create-cancel">취소</button>
          <button class="hp-btn primary" id="hp-create-save">💾 저장</button>
        </div>
      </div>
    </div>`;
  }

  // ── Summarize Dialog ─────────────────────────────────────────────────────

  function renderSummarizeDialog(pendingMessages) {
    const totalPending = pendingMessages.length;
    const maxChunks = Math.max(1, Math.floor(totalPending / chunkSize));
    const defaultChunks = Math.min(1, maxChunks);
    const window = pendingMessages.slice(0, chunkSize);
    const displayPending = includeUserMessages ? window : window.filter((m) => m.role !== "user");
    const previewCount = displayPending.length;

    let previewHtml = "";
    for (let i = 0; i < previewCount; i++) {
      const msg = displayPending[i];
      const roleLabel = msg.role === "user" ? "👤" : "🤖";
      const preview = msg.content.length > 150 ? msg.content.slice(0, 150) + "..." : msg.content;
      previewHtml += `<div style="padding:4px 0;border-bottom:1px solid #222;font-size:12px;">
        <span style="color:#4a6cf7;">[${i + 1}]</span> <b>${roleLabel}</b>: ${escapeHtml(preview)}
      </div>`;
    }

    return `
    <div class="hp-edit-overlay" id="hp-summarize-overlay">
      <div class="hp-edit-box" style="max-width:700px;">
        <h3>📋 수동 메시지 요약</h3>
        <p style="font-size:13px;color:#888;">미요약 메시지 ${totalPending}개 (${chunkSize}개 메시지가 포함된 청크 ${maxChunks}개를 만들 수 있습니다).</p>
        <div class="hp-row">
          <span class="hp-label">요약할 청크 수</span>
          <input class="hp-input" type="number" id="hp-summarize-chunks" value="${defaultChunks}" min="1" max="${maxChunks}" style="width:100px;">
          <span style="font-size:12px;color:#888;">/ ${maxChunks} 청크 (각 메시지 ${chunkSize}개)</span>
        </div>
        <div style="margin:8px 0;">
          <strong style="font-size:13px;">📝 미리보기 (첫 ${chunkSize}개 메시지 중 ${previewCount}개 보기)</strong>
          <div style="max-height:300px;overflow-y:auto;margin-top:4px;background:#0a0a0a;padding:8px;border-radius:4px;">
            ${previewHtml}
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
          <button class="hp-btn secondary" id="hp-summarize-cancel">취소</button>
          <button class="hp-btn primary" id="hp-summarize-confirm">📋 요약</button>
        </div>
      </div>
    </div>`;
  }

  // ── Custom Confirm Dialog (iframe-safe) ─────────────────────────────────

  function showConfirmDialog(msg) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "hp-edit-overlay";
      overlay.innerHTML = `
        <div class="hp-edit-box" style="max-width:450px;text-align:center;">
          <p style="font-size:14px;margin:12px 0;color:#ddd;">${msg}</p>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
            <button class="hp-btn danger" id="hp-confirm-yes">예</button>
            <button class="hp-btn secondary" id="hp-confirm-no">아니오</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector("#hp-confirm-yes").addEventListener("click", () => {
        overlay.remove();
        resolve(true);
      });
      overlay.querySelector("#hp-confirm-no").addEventListener("click", () => {
        overlay.remove();
        resolve(false);
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });
    });
  }

  // ── Event Binding ────────────────────────────────────────────────────────

  function attachUIEvents(pendingMessages) {
    const viewContext = summaryContext();
    // Helper: wrap async handlers with error boundary
    // Close button
    const closeBtn = document.getElementById("hp-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.getElementById("hp-render-pending")?.remove();
        document.getElementById("hp-render-root")?.remove();
        document.getElementById("hp-edit-overlay")?.remove();
        hidePluginContainer();
      });
    }

    // Tab switching
    document.querySelectorAll(".hp-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        activeTab = (tab ).dataset.tab;
        nodeListPage = 0;
        uiScrollTop = 0;
        editingNodeId = null;
        renderUI();
      });
    });

    // Pagination
    document.querySelectorAll("[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt((btn ).dataset.page);
        if (!isNaN(page)) {
          nodeListPage = page;
          renderUI();
        }
      });
    });

    // Node search (IME-safe: only re-render when composition ends)
    const searchInput = document.getElementById("hp-node-search") ;
    if (searchInput) {
      const doSearch = () => {
        nodeSearchQuery = searchInput.value.trim();
        nodeListPage = 0;
        // Save cursor position before re-render destroys the DOM
        nodeSearchSelStart = searchInput.selectionStart;
        nodeSearchSelEnd = searchInput.selectionEnd;
        nodeSearchShouldFocus = true;
        renderUI();
      };
      searchInput.addEventListener("compositionstart", () => {
        nodeSearchComposing = true;
      });
      searchInput.addEventListener("compositionend", () => {
        nodeSearchComposing = false;
        doSearch();
      });
      searchInput.addEventListener("input", () => {
        if (!nodeSearchComposing) {
          doSearch();
        }
      });
      // Restore cursor position after re-render
      if (nodeSearchSelStart !== null && nodeSearchSelEnd !== null) {
        searchInput.setSelectionRange(nodeSearchSelStart, nodeSearchSelEnd);
      } else {
        // Place cursor at end on initial focus
        const len = searchInput.value.length;
        searchInput.setSelectionRange(len, len);
      }
      if (nodeSearchShouldFocus) {
        searchInput.focus({ preventScroll: true });
        nodeSearchShouldFocus = false;
      }
    }
    const searchClearBtn = document.getElementById("hp-node-search-clear");
    if (searchClearBtn) {
      searchClearBtn.addEventListener("click", () => {
        nodeSearchQuery = "";
        nodeListPage = 0;
        renderUI();
      });
    }

    const includedFilterBtn = document.getElementById("hp-filter-included-nodes");
    if (includedFilterBtn) {
      includedFilterBtn.addEventListener("click", () => {
        showIncludedNodesOnly = !showIncludedNodesOnly;
        if (showIncludedNodesOnly) showFavoriteNodesOnly = false;
        nodeListPage = 0;
        renderUI();
      });
    }

    const favoriteFilterBtn = document.getElementById("hp-filter-favorite-nodes");
    if (favoriteFilterBtn) {
      favoriteFilterBtn.addEventListener("click", () => {
        showFavoriteNodesOnly = !showFavoriteNodesOnly;
        if (showFavoriteNodesOnly) showIncludedNodesOnly = false;
        nodeListPage = 0;
        renderUI();
      });
    }

    const nodeSortBtn = document.getElementById("hp-toggle-node-sort");
    if (nodeSortBtn) {
      nodeSortBtn.addEventListener("click", () => {
        nodeSortDirection = nodeSortDirection === "asc" ? "desc" : "asc";
        nodeListPage = 0;
        renderUI();
      });
    }

    // Force summarize (both buttons) — opens dialog with warning
    document.querySelectorAll("#hp-force-summarize, #hp-force-summarize2").forEach((btn) => {
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          if (pendingMessages.length === 0) {
            alert("No pending messages to summarize.");
            return;
          }
          const ok = await showConfirmDialog(
            "요약하는 동안 기억과 설정을 변경할 수 없습니다. 채팅을 바꾸면 진행 중인 요약이 중단될 수 있습니다.<br><br>계속하시겠습니까?",
          );
          if (!ok) return;
          showSummarizeDialog = true;
          renderUI();
        }, "force-summarize"),
      );
    });

    // Create node button
    const createNodeBtn = document.getElementById("hp-create-node");
    if (createNodeBtn) {
      createNodeBtn.addEventListener("click", () => {
        showCreateNodeDialog = true;
        renderUI();
      });
    }

    // Auto Summarize button — runs summarization in a loop until pending < threshold
    const autoSummarizeBtn = document.getElementById("hp-auto-summarize-btn");
    if (autoSummarizeBtn) {
      autoSummarizeBtn.addEventListener(
        "click",
        safeAsync(async () => {
          if (pendingMessages.length === 0) {
            alert("No pending messages to summarize.");
            return;
          }
          const ok = await showConfirmDialog(
            "미요약 구간을 순서대로 요약합니다. 요약 API가 호출되며, 실패하거나 채팅이 바뀌면 중단합니다.<br><br>계속하시겠습니까?",
          );
          if (!ok) return;
          autoSummarizeBtn.textContent = "⏳ Summarizing...";
          (autoSummarizeBtn ).disabled = true;
          try {
            let loopCount = 0;
            const maxLoops = 50; // safety limit
            while (loopCount < maxLoops) {
              const pending = await getPendingMessages();
              if (pending.length < autoSummarizeThreshold) break;
              if (!await runSummarization(undefined, { context: viewContext })) break;
              loopCount++;
            }
          } finally {
            renderUI();
          }
        }, "auto-summarize"),
      );
    }

    // Backup download
    const backupDownloadBtn = document.getElementById("hp-backup-download");
    if (backupDownloadBtn) {
      backupDownloadBtn.addEventListener("click", () => {
        if (getNodes().length === 0 && state.chunks.length === 0) {
          alert("No data to backup. Chat more to generate summaries first!");
          return;
        }
        downloadBackup();
      });
    }

    // Backup restore — trigger file picker
    const backupRestoreBtn = document.getElementById("hp-backup-restore");
    const restoreFileInput = document.getElementById("hp-restore-file") ;
    if (backupRestoreBtn && restoreFileInput) {
      backupRestoreBtn.addEventListener("click", () => {
        restoreFileInput.click();
      });
      restoreFileInput.addEventListener(
        "change",
        safeAsync(async () => {
          const file = _optionalChain([restoreFileInput, 'access', _40 => _40.files, 'optionalAccess', _41 => _41[0]]);
          if (!file) return;
          const restoreBase = copyStorageValue(viewContext.state);
          try {
            const json = await file.text();
            const backup = parseBackupFile(json);
            if (!backup) {
              alert("유효한 HypaPlus JSON 백업 파일이 아닙니다.");
              return;
            }
            const nodeCount = backup.chunks.reduce((sum, c) => sum + c.nodes.length, 0);
            const chunkCount = backup.chunks.length;
            const ok = await showConfirmDialog(
              `백업을 불러옵니까?\n\n• 노드 ${nodeCount}개\n• 청크 ${chunkCount}개\n\n⚠️ 이 작업은 모든 노드와 청크를 덮어씌웁니다.`,
            );
            if (!ok) return;
            await restoreFromBackup(backup, viewContext, restoreBase);
            nodeListPage = 0;
            alert(`노드 ${nodeCount}개와 청크 ${chunkCount}개를 불러왔습니다!`);
            renderUI();
          } finally {
            // Reset file input so the same file can be re-selected
            restoreFileInput.value = "";
          }
        }, "backup-restore"),
      );
    }

    // Clear memory (both buttons) — custom confirm (iframe-safe)
    document.querySelectorAll("#hp-clear-memory, #hp-clear-memory2").forEach((btn) => {
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          const clearBase = copyStorageValue(viewContext.state);
          const ok1 = await showConfirmDialog(
            "⚠️ 모든 요약 노드와 청크를 지웁니까? 이 동작은 되돌릴 수 없습니다.",
          );
          if (!ok1) return;
          const ok2 = await showConfirmDialog("⚠️ 정말 확실합니까? 모든 요약 데이터가 지워집니다.");
          if (!ok2) return;
          await clearMemoryState(viewContext, clearBase);
          nodeListPage = 0;
          renderUI();
        }, "clear-memory"),
      );
    });

    attachNodeCardEvents(document);

    // Save a chunk memo without rebuilding or re-summarizing the chunk.
    document.querySelectorAll(".hp-save-chunk-memo").forEach((btn) => {
      const memoBase = state.chunks.find(chunk => chunk.id === btn.dataset.chunkId)?.memo;
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          const chunkId = (btn ).dataset.chunkId;
          const chunk = state.chunks.find((c) => c.id === chunkId);
          const memoInput = document.querySelector(
            `.hp-chunk-memo[data-chunk-id="${chunkId}"]`,
          ) ;
          if (!chunk || !memoInput) return;
          await saveChunkMemo(chunk, memoInput.value, viewContext, memoBase);
          renderUI();
        }, "save-chunk-memo"),
      );
    });

    // Reroll chunk — custom confirm
    document.querySelectorAll(".hp-reroll-chunk").forEach((btn) => {
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          const chunkId = (btn ).dataset.chunkId;
          const chunk = state.chunks.find((c) => c.id === chunkId);
          if (!chunk) return;
          const ok = await showConfirmDialog(`이 청크를 다시 요약하겠습니까?`);
          if (!ok) return;
          await reSummarizeChunk(chunkId, viewContext);
          renderUI();
        }, "reroll-chunk"),
      );
    });

    // Delete chunk — custom confirm
    document.querySelectorAll(".hp-delete-chunk").forEach((btn) => {
      const chunkBase = copyStorageValue(state.chunks.find(chunk => chunk.id === btn.dataset.chunkId));
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          const chunkId = (btn ).dataset.chunkId;
          const chunk = state.chunks.find((c) => c.id === chunkId);
          if (!chunk) return;
          const ok = await showConfirmDialog(
            `이 청크와, 연결된 노드 ${chunk.nodes.length}개를 지웁니까?`,
          );
          if (!ok) return;

          await deleteMemoryChunk(chunkId, chunk, viewContext, chunkBase);
          renderUI();
        }, "delete-chunk"),
      );
    });

    // Both views read raw source again; preprocessing never changes stored text.
    document.querySelectorAll(".hp-view-chunk-msgs, .hp-view-processed-msgs").forEach(btn => {
      btn.addEventListener("click", safeAsync(async () => {
        const chunk = state.chunks.find(c => c.id === btn.dataset.chunkId);
        if (!chunk) return;
        const context = summaryContext();
        const all = await readChatMessagesRaw(true);
        const byId = new Map(all.map(m => [m.chatId, m]));
        const processed = btn.classList.contains("hp-view-processed-msgs");
        const ids = processed ? chunk.chatIds : getChunkCoverageIds(chunk);
        if (ids.includes(FIRST_MESSAGE_CHAT_ID)) {
          const first = await fetchFirstMessage();
          if (first) byId.set(FIRST_MESSAGE_CHAT_ID, { ...first, chatId: FIRST_MESSAGE_CHAT_ID });
        }
        if (!isSummaryContextCurrent(context)) return;
        const messages = ids.filter(id => byId.has(id)).map(id => ({ ...byId.get(id) }));
        if (!messages.length) { alert("연결된 원문을 찾을 수 없습니다."); return; }
        const missing = ids.length - messages.length;
        const title = (processed ? "기억에 사용할 내용" : "저장 원문") +
          (missing ? ` · 찾을 수 없는 메시지 ${missing}개` : "");
        if (processed) {
          const prepared = await prepareMemoryMessages(messages);
          if (isSummaryContextCurrent(context)) showMemoryPreview(title, prepared.messages, prepared.skipped, false, prepared.cleanup);
        } else showMemoryPreview(title, messages);
      }, "view-chunk-source"));
    });

    document.querySelectorAll(".hp-accept-empty-chunk").forEach(btn => {
      btn.addEventListener("click", safeAsync(async () => {
        if (isSummarizing) return;
        const context = summaryContext();
        const ok = await showConfirmDialog("이 구간에 남길 기억이 없음을 확인하고 완료 처리합니까? 이후 이 구간의 원문은 본문 문맥에서 제외될 수 있습니다. API는 호출하지 않습니다.");
        if (!ok || !isSummaryContextCurrent(context)) return;
        if (!await acceptEmptyChunk(btn.dataset.chunkId, context)) alert("완료 처리하지 못했습니다. 연결된 원문을 확인해 주세요.");
        renderUI();
      }, "accept-empty-chunk"));
    });

    const queryPreviewBtn = document.getElementById("hp-preview-query");
    if (queryPreviewBtn) queryPreviewBtn.addEventListener("click", safeAsync(async () => {
      assertSelectiveMemoryToolsAvailable();
      const context = summaryContext();
      const all = await readChatMessagesRaw(true);
      const prepared = await prepareMemoryMessages(all.slice(-Math.max(1, embeddingContextMessages)));
      if (isSummaryContextCurrent(context)) showMemoryPreview("검색에 사용할 입력", prepared.messages, prepared.skipped, true, prepared.cleanup);
    }, "preview-query"));

    const cleanupSaveBtn = document.getElementById("hp-save-html-cleanup");
    if (cleanupSaveBtn) cleanupSaveBtn.addEventListener("click", safeAsync(async () => {
      const input = document.getElementById("hp-excluded-html-classes");
      const status = document.getElementById("hp-html-cleanup-status");
      let classes;
      try { classes = parseExcludedHtmlClasses(input.value); }
      catch (error) { status.textContent = error.message; return; }
      cleanupSaveBtn.disabled = true;
      try {
        await saveMemoryCleanupClasses(classes);
        status.textContent = "저장했습니다. 다음 기억 입력부터 적용됩니다.";
      } catch (_) {
        status.textContent = "저장하지 못했습니다. 기존 설정을 유지합니다.";
      } finally { cleanupSaveBtn.disabled = false; }
    }, "save-html-cleanup"));
    const cleanupDefaultBtn = document.getElementById("hp-default-html-cleanup");
    if (cleanupDefaultBtn) cleanupDefaultBtn.addEventListener("click", () => {
      document.getElementById("hp-excluded-html-classes").value = DEFAULT_EXCLUDED_HTML_CLASSES.join("\n");
      document.getElementById("hp-html-cleanup-status").textContent = "기본값을 채웠습니다. 저장하면 적용됩니다.";
    });


    // Test Embedding button — runs full retrieval and displays scores
    const testEmbBtn = document.getElementById("hp-test-embedding");
    if (testEmbBtn) {
      testEmbBtn.addEventListener(
        "click",
        safeAsync(async () => {
          assertSelectiveMemoryToolsAvailable();
          if (!embeddingUrl) {
            alert("No embedding URL configured. Set it in Settings first.");
            return;
          }
          // Build query from recent messages
          const query = await buildEmbeddingQuery();
          if (!query) {
            alert("No chat messages available to build embedding query.");
            return;
          }

          // Run retrieval
          await retrieveRelevantNodes(query, getLatestNodeTime(), maxMemoryTokens);

          // Switch to nodes tab to show results
          activeTab = "nodes";
          renderUI();
        }, "test-embedding"),
      );
    }

    // Summarize dialog: cancel
    const summarizeCancelBtn = document.getElementById("hp-summarize-cancel");
    if (summarizeCancelBtn) {
      summarizeCancelBtn.addEventListener("click", () => {
        showSummarizeDialog = false;
        renderUI();
      });
    }

    // Summarize dialog: confirm
    const summarizeConfirmBtn = document.getElementById("hp-summarize-confirm");
    if (summarizeConfirmBtn) {
      summarizeConfirmBtn.addEventListener(
        "click",
        safeAsync(async () => {
          const numChunks =
            parseInt((document.getElementById("hp-summarize-chunks") ).value) ||
            1;
          showSummarizeDialog = false;
          renderUI();
          for (let i = 0; i < numChunks; i++) {
            if (!await runSummarization(chunkSize, { context: viewContext })) break;
          }
          renderUI();
        }, "summarize-confirm"),
      );
    }

    // Create node overlay: cancel
    const createCancelBtn = document.getElementById("hp-create-cancel");
    if (createCancelBtn) {
      createCancelBtn.addEventListener("click", () => {
        showCreateNodeDialog = false;
        renderUI();
      });
    }

    // Create node overlay: save
    const createSaveBtn = document.getElementById("hp-create-save");
    if (createSaveBtn) {
      createSaveBtn.addEventListener(
        "click",
        safeAsync(async () => {
          const type = (document.getElementById("hp-create-type") ).value 

;
          const time = (document.getElementById("hp-create-time") ).value;
          const location =
            (document.getElementById("hp-create-location") ).value.trim() ||
            undefined;
          const characters = (
            document.getElementById("hp-create-characters") 
          ).value
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          const content = (
            document.getElementById("hp-create-content") 
          ).value.trim();

          if (!time.trim() || !content) {
            alert("시간과 내용은 필수 입력 항목입니다.");
            return;
          }

          const dialoguesRaw = (
            document.getElementById("hp-create-dialogues") 
          ).value.trim();
          let dialogues;
          if (dialoguesRaw) {
            const lines = dialoguesRaw.split("\n").filter(Boolean);
            dialogues = [];
            for (const line of lines) {
              const m = line.match(/^(.+?)\s*:\s*"(.+)"$/);
              if (m) {
                dialogues.push({ speaker: m[1].trim(), text: m[2].trim() });
              }
            }
            if (dialogues.length === 0) dialogues = undefined;
          }

          await createManualMemoryNode({ type, time, location, characters, content, dialogues }, viewContext);
          showCreateNodeDialog = false;
          renderUI();
        }, "create-save"),
      );
    }

    // Read-only, on-demand total for the chat represented by this view.
    const memoryVolumeButton = document.getElementById("hp-calculate-memory-volume");
    const memoryVolumeResult = document.getElementById("hp-memory-volume-result");
    if (memoryVolumeButton && memoryVolumeResult) {
      memoryVolumeButton.addEventListener("click", safeAsync(() => {
        if (!isSummaryContextCurrent(viewContext)) {
          memoryVolumeResult.textContent = "채팅이 바뀌었습니다. 화면을 다시 열어 주세요.";
          return;
        }
        const total = estimateStoredMemoryTokens(viewContext.state.chunks, eventFormat, factsFormat);
        memoryVolumeResult.textContent = "약 " + total.toLocaleString() + "토큰 · 계산 시점 기준";
      }, "memory-volume"));
    }

    // Draft changes affect controls only; settings are applied by the save button.
    document.querySelectorAll('input[name="hp-memory-injection-mode"]').forEach(input => {
      input.addEventListener("change", () => updateMemoryModeControls());
    });
    updateMemoryModeControls();

    // Settings: save
    const saveSettingsBtn = document.getElementById("hp-save-settings");
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener(
        "click",
        safeAsync(async () => {
          const values = {};
          values.memoryInjectionMode = normalizeMemoryInjectionMode(document.querySelector('input[name="hp-memory-injection-mode"]:checked')?.value);
          values.chunkSize =
            parseInt((document.getElementById("hp-chunk-size") ).value) ||
            DEFAULT_CHUNK_SIZE;
          values.maxMemoryTokens =
            parseInt((document.getElementById("hp-max-tokens") ).value) ||
            DEFAULT_MAX_MEMORY_TOKENS;
          values.autoSummarize = (document.getElementById("hp-auto-summarize") )
            .checked;
          values.includeUserMessages = (document.getElementById("hp-include-user") )
            .checked;
          values.autoSummarizeThreshold =
            parseInt((document.getElementById("hp-auto-threshold") ).value) ||
            values.chunkSize;
          values.embeddingUrl = (
            document.getElementById("hp-embedding-url") 
          ).value.trim();
          values.embeddingModel = (
            document.getElementById("hp-embedding-model") 
          ).value.trim();
          values.timeDecayDays =
            parseInt((document.getElementById("hp-time-decay") ).value) || 15;
          values.timeScoringMode = (document.getElementById("hp-time-scoring-mode") )
            .value ;
          values.timeWeight = parseFloat(document.getElementById("hp-time-weight").value);
          if (!Number.isFinite(values.timeWeight)) values.timeWeight = 1.0;
          values.similarityWeight = parseFloat(document.getElementById("hp-similarity-weight").value);
          if (!Number.isFinite(values.similarityWeight)) values.similarityWeight = 1.0;
          values.embeddingApiKey = (
            document.getElementById("hp-embedding-api-key") 
          ).value.trim();
          values.embeddingContextMessages =
            parseInt((document.getElementById("hp-embedding-context") ).value) ||
            5;
          values.recentNodeCache = (document.getElementById("hp-recent-node-cache") )
            .checked;
          values.recentNodeCacheCount =
            parseInt(
              (document.getElementById("hp-recent-node-cache-count") ).value,
            ) || 10;
          values.showGuiButton = (document.getElementById("hp-show-gui-button") )
            .checked;

          await saveSettingsFromInput(values);

          alert("Settings saved!");
          renderUI();
        }, "save-settings"),
      );
    }

    // Prompt: save
    const savePromptBtn = document.getElementById("hp-save-prompt");
    if (savePromptBtn) {
      savePromptBtn.addEventListener("click", safeAsync(async () => {
        await saveSummaryPrompt(document.getElementById("hp-prompt-textarea").value);
        alert("Prompt saved!");
      }, "ui-action"));
    }

    // Prompt: reset
    const resetPromptBtn = document.getElementById("hp-reset-prompt");
    if (resetPromptBtn) {
      resetPromptBtn.addEventListener("click", safeAsync(async () => {
        await saveSummaryPrompt(DEFAULT_SUMMARY_PROMPT);
        renderUI();
      }, "ui-action"));
    }

    // Format labels: save
    const saveFormatLabelsBtn = document.getElementById("hp-save-format-labels");
    if (saveFormatLabelsBtn) {
      saveFormatLabelsBtn.addEventListener("click", safeAsync(async () => {
        const nextEventFormat =
          (document.getElementById("hp-event-format") ).value.trim() ||
          DEFAULT_EVENT_FORMAT;
        const nextFactsFormat =
          (document.getElementById("hp-facts-format") ).value.trim() ||
          DEFAULT_FACTS_FORMAT;
        await saveMemoryFormats(nextEventFormat, nextFactsFormat);
        alert("Format templates saved!");
      }, "ui-action"));
    }

    // Format labels: reset
    const resetFormatLabelsBtn = document.getElementById("hp-reset-format-labels");
    if (resetFormatLabelsBtn) {
      resetFormatLabelsBtn.addEventListener("click", safeAsync(async () => {
        await saveMemoryFormats(DEFAULT_EVENT_FORMAT, DEFAULT_FACTS_FORMAT);
        renderUI();
      }, "ui-action"));
    }

    // Presets: load list (async, on tab switch to presets)
    if (activeTab === "presets") {
      const presetList = document.getElementById("hp-preset-list");
      loadPresets().then((presets) => {
        const listEl = presetList;
        if (!listEl?.isConnected || !isSummaryContextCurrent(viewContext)) return;
        if (presets.length === 0) {
          listEl.innerHTML = `<span style="color:#888;font-size:13px;">저장된 프리셋이 없습니다.</span>`;
          return;
        }
        listEl.innerHTML = presets
          .map(
            (p, i) => `
          <div class="hp-card">
            <details>
              <summary style="cursor:pointer;font-size:14px;font-weight:bold;color:#ddd;">${escapeHtml(p.name)} <span style="font-size:12px;color:#888;margin-left:8px;">chunk:${p.chunkSize} user:${p.includeUserMessages ? "yes" : "no"} query:${p.embeddingContextMessages}</span></summary>
              <div style="margin-top:8px;font-size:12px;color:#aaa;">
                <div style="margin:4px 0;"><b>Chunk Size:</b> ${p.chunkSize}</div>
                <div style="margin:4px 0;"><b>Include User:</b> ${p.includeUserMessages ? "Yes" : "No"}</div>
                <div style="margin:4px 0;"><b>Query Msgs:</b> ${p.embeddingContextMessages}</div>
                <div style="margin:4px 0;"><b>Event Format:</b> <pre style="background:#0a0a0a;padding:4px;border-radius:4px;font-size:11px;white-space:pre-wrap;">${escapeHtml(p.eventFormat || DEFAULT_EVENT_FORMAT)}</pre></div>
                <div style="margin:4px 0;"><b>Facts Format:</b> <pre style="background:#0a0a0a;padding:4px;border-radius:4px;font-size:11px;white-space:pre-wrap;">${escapeHtml(p.factsFormat || DEFAULT_FACTS_FORMAT)}</pre></div>
                <div style="margin:8px 0;"><b>Prompt:</b></div>
                <pre style="background:#0a0a0a;padding:8px;border-radius:4px;font-size:11px;max-height:200px;overflow:auto;white-space:pre-wrap;">${escapeHtml(p.summaryPrompt)}</pre>
              </div>
            </details>
            <div style="margin-top:8px;display:flex;gap:6px;">
              <button class="hp-btn primary small hp-apply-preset" data-preset-idx="${i}">Apply</button>
              <button class="hp-btn danger small hp-delete-preset" data-preset-idx="${i}">🗑️</button>
            </div>
          </div>`,
          )
          .join("");

        // Bind preset actions after DOM is populated
        listEl.querySelectorAll(".hp-apply-preset").forEach((btn) => {
          btn.addEventListener("click", safeAsync(async () => {
            const idx = parseInt((btn ).dataset.presetIdx);
            const presets = await loadPresets();
            if (idx < 0 || idx >= presets.length) return;
            await applyStoredPreset(presets[idx]);
            alert(`Preset "${presets[idx].name}" applied!`);
            renderUI();
          }, "ui-action"));
        });

        listEl.querySelectorAll(".hp-delete-preset").forEach((btn) => {
          btn.addEventListener("click", safeAsync(async () => {
            const idx = parseInt((btn ).dataset.presetIdx);
            const presets = await loadPresets();
            if (idx < 0 || idx >= presets.length) return;
            const ok = await showConfirmDialog(`Delete preset "${presets[idx].name}"?`);
            if (!ok) return;
            await deleteStoredPreset(presets, idx);
            renderUI();
          }, "ui-action"));
        });
      });
    }

    // Presets: save (overwrites if same name exists)
    const savePresetBtn = document.getElementById("hp-save-preset");
    if (savePresetBtn) {
      savePresetBtn.addEventListener("click", safeAsync(async () => {
        const name = (document.getElementById("hp-preset-name") ).value.trim();
        if (!name) {
          alert("Enter a preset name.");
          return;
        }
        const presets = await loadPresets();
        const preset = currentSettingsAsPreset();
        preset.name = name;
        await saveStoredPreset(presets, preset);
        alert(`Preset "${name}" saved!`);
        renderUI();
      }, "ui-action"));
    }

    // Presets: import
    const importPresetBtn = document.getElementById("hp-import-preset");
    if (importPresetBtn) {
      importPresetBtn.addEventListener("click", safeAsync(async () => {
        const fileInput = document.getElementById("hp-import-file") ;
        const file = _optionalChain([fileInput, 'optionalAccess', _42 => _42.files, 'optionalAccess', _43 => _43[0]]);
        if (!file) {
          alert("Select a RisuAI preset JSON file first.");
          return;
        }
        {
          const json = await file.text();
          const preset = parseRisuPreset(json);
          if (!preset) {
            alert("Invalid RisuAI preset JSON.");
            return;
          }
          const presets = await loadPresets();
          await saveStoredPreset(presets, preset);
          alert(`Preset "${preset.name}" imported!`);
          renderUI();
        }
      }, "ui-action"));
    }

    // ── Regex tab handlers ───────────────────────────────────────────────

    if (activeTab === "regex") {
      // Load regex presets list
      const regexList = document.getElementById("hp-regex-preset-list");
      loadRegexPresets().then((regexPresets) => {
        const listEl = regexList;
        if (!listEl?.isConnected || !isSummaryContextCurrent(viewContext)) return;
        if (regexPresets.length === 0) {
          listEl.innerHTML = `<span style="color:#888;font-size:13px;">No regex presets saved yet.</span>`;
        } else {
          listEl.innerHTML = regexPresets
            .map(
              (rp, i) => `
            <div class="hp-card">
              <details>
                <summary style="cursor:pointer;font-size:14px;font-weight:bold;color:#ddd;">${escapeHtml(rp.name)} <span style="font-size:12px;color:#888;margin-left:8px;">${rp.entries.length} entries</span></summary>
                <div style="margin-top:8px;max-height:300px;overflow:auto;">
                  ${rp.entries
                    .map(
                      (e, j) => `
                    <div style="margin:4px 0;padding:6px;background:#0a0a0a;border-radius:4px;font-size:12px;">
                      <div style="color:#4a6cf7;font-weight:bold;">#${j + 1} ${escapeHtml(e.comment || "(no comment)")}</div>
                      <div style="color:#888;">in: <code>${escapeHtml(e.in)}</code></div>
                      <div style="color:#888;">out: <code>${escapeHtml(e.out)}</code></div>
                      <div style="color:#666;">${renderMemoryRegexStatus(e)}</div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </details>
              <div style="margin-top:8px;display:flex;gap:6px;">
                <button class="hp-btn primary small hp-activate-regex-preset" data-regex-preset-idx="${i}" ${activeRegexPresetName === rp.name ? "disabled" : ""}>${activeRegexPresetName === rp.name ? "✅ 활성화" : "▶ 활성화"}</button>
                ${activeRegexPresetName === rp.name ? `<button class="hp-btn secondary small hp-deactivate-regex-preset">⏹ 비활성화</button>` : ""}
                <button class="hp-btn danger small hp-delete-regex-preset" data-regex-preset-idx="${i}">🗑️ 삭제</button>
              </div>
            </div>
          `,
            )
            .join("");

          listEl.querySelectorAll(".hp-delete-regex-preset").forEach((btn) => {
            btn.addEventListener("click", safeAsync(async () => {
              const idx = parseInt((btn ).dataset.regexPresetIdx);
              const presets = await loadRegexPresets();
              if (idx < 0 || idx >= presets.length) return;
              const ok = await showConfirmDialog(`Delete regex preset "${presets[idx].name}"?`);
              if (!ok) return;
              await deleteStoredRegexPreset(presets, idx);
              renderUI();
            }, "ui-action"));
          });

          listEl.querySelectorAll(".hp-activate-regex-preset").forEach((btn) => {
            btn.addEventListener("click", safeAsync(async () => {
              const idx = parseInt((btn ).dataset.regexPresetIdx);
              const presets = await loadRegexPresets();
              if (idx < 0 || idx >= presets.length) return;
              await selectRegexPreset(presets[idx].name);
              renderUI();
            }, "ui-action"));
          });

          listEl.querySelectorAll(".hp-deactivate-regex-preset").forEach((btn) => {
            btn.addEventListener("click", safeAsync(async () => {
              await selectRegexPreset("");
              renderUI();
            }, "ui-action"));
          });
        }
      });

      // Render chat regex list
      const chatRegexList = document.getElementById("hp-chat-regex-list");
      if (chatRegexList) {
        if (state.chatRegex.length === 0) {
          chatRegexList.innerHTML = `<span style="color:#888;font-size:13px;">채팅방 정규식이 업로드되지 않았습니다.</span>`;
        } else {
          chatRegexList.innerHTML = state.chatRegex
            .map(
              (e, j) => `
            <div style="margin:4px 0;padding:6px;background:#0a0a0a;border-radius:4px;font-size:12px;">
              <div style="color:#4a6cf7;font-weight:bold;">#${j + 1} ${escapeHtml(e.comment || "(no comment)")}</div>
              <div style="color:#888;">in: <code>${escapeHtml(e.in)}</code></div>
              <div style="color:#888;">out: <code>${escapeHtml(e.out)}</code></div>
              <div style="color:#666;">${renderMemoryRegexStatus(e)}</div>
            </div>
          `,
            )
            .join("");
        }
      }
    }

    // Regex: import preset
    const regexImportBtn = document.getElementById("hp-regex-import-preset");
    if (regexImportBtn) {
      regexImportBtn.addEventListener("click", safeAsync(async () => {
        const nameInput = document.getElementById("hp-regex-preset-name") ;
        const name = _optionalChain([nameInput, 'optionalAccess', _44 => _44.value, 'optionalAccess', _45 => _45.trim, 'call', _46 => _46()]);
        if (!name) {
          alert("Enter a preset name.");
          return;
        }
        const fileInput = document.getElementById("hp-regex-import-file") ;
        const file = _optionalChain([fileInput, 'optionalAccess', _47 => _47.files, 'optionalAccess', _48 => _48[0]]);
        if (!file) {
          alert("Select a regex JSON file first.");
          return;
        }
        {
          const json = await file.text();
          const entries = parseRegexFile(json);
          if (!entries || entries.length === 0) {
            alert("No editprocess entries found in the file.");
            return;
          }
          const presets = await loadRegexPresets();
          await saveStoredRegexPreset(presets, name, entries);
          alert(`Regex preset "${name}" imported with ${entries.length} entries!`);
          renderUI();
        }
      }, "ui-action"));
    }

    // Regex: chat regex upload
    const chatRegexUploadBtn = document.getElementById("hp-chat-regex-upload");
    if (chatRegexUploadBtn) {
      chatRegexUploadBtn.addEventListener("click", safeAsync(async () => {
        const regexBase = copyStorageValue(viewContext.state.chatRegex);
        const fileInput = document.getElementById("hp-chat-regex-file") ;
        const file = _optionalChain([fileInput, 'optionalAccess', _49 => _49.files, 'optionalAccess', _50 => _50[0]]);
        if (!file) {
          alert("Select a regex JSON file first.");
          return;
        }
        {
          const json = await file.text();
          const entries = parseRegexFile(json);
          if (!entries || entries.length === 0) {
            alert("No editprocess entries found in the file.");
            return;
          }
          await replaceChatRegex(entries, viewContext, regexBase);
          alert(`Chat regex uploaded with ${entries.length} entries!`);
          renderUI();
        }
      }, "ui-action"));
    }

    // Regex: refresh module regex
    const refreshModuleBtn = document.getElementById("hp-refresh-module-regex");
    if (refreshModuleBtn) {
      // Auto-render cached module regex
      const listEl = document.getElementById("hp-module-regex-list");
      if (listEl && moduleRegexCache.length > 0) {
        listEl.innerHTML = moduleRegexCache
          .map(
            (e, j) => `
          <div style="margin:4px 0;padding:6px;background:#0a0a0a;border-radius:4px;font-size:12px;">
            <div style="color:#4a6cf7;font-weight:bold;">#${j + 1} ${escapeHtml(e.comment || "(no comment)")}</div>
            <div style="color:#888;">in: <code>${escapeHtml(e.in)}</code></div>
            <div style="color:#888;">out: <code>${escapeHtml(e.out)}</code></div>
            <div style="color:#666;">${renderMemoryRegexStatus(e)}</div>
          </div>
        `,
          )
          .join("");
      }
      refreshModuleBtn.addEventListener("click", safeAsync(async () => {
        const listEl2 = document.getElementById("hp-module-regex-list");
        if (!listEl2) return;
        listEl2.innerHTML = `<span style="color:#888;font-size:13px;">Loading...</span>`;
        try {
          await refreshModuleRegexCache();
          const entries = moduleRegexCache;
          if (entries.length === 0) {
            listEl2.innerHTML = `<span style="color:#888;font-size:13px;">No editprocess regex found in enabled modules.</span>`;
          } else {
            listEl2.innerHTML = entries
              .map(
                (e, j) => `
              <div style="margin:4px 0;padding:6px;background:#0a0a0a;border-radius:4px;font-size:12px;">
                <div style="color:#4a6cf7;font-weight:bold;">#${j + 1} ${escapeHtml(e.comment || "(no comment)")}</div>
                <div style="color:#888;">in: <code>${escapeHtml(e.in)}</code></div>
                <div style="color:#888;">out: <code>${escapeHtml(e.out)}</code></div>
                <div style="color:#666;">${renderMemoryRegexStatus(e)}</div>
              </div>
            `,
              )
              .join("");
          }
        } catch (_) {
          listEl2.innerHTML = `<span style="color:#e74c3c;font-size:13px;">Failed to fetch module regex. Check database permissions.</span>`;
        }
      }, "ui-action"));
    }
  }

  function showMemoryPreview(title, messages, skipped = [], joinedQuery = false, cleanup = null) {
    const text = joinedQuery ? messages.map(m => m.content).join("\n") : messages.map(m =>
      `[${m.displayIdx ?? messageIndexByChatId.get(m.chatId) ?? -1}] ${m.role}:\n${m.content}`).join("\n\n---\n\n");
    const overlay = document.createElement("div");
    overlay.className = "hp-edit-overlay";
    const diagnostics = skipped.length ? `<details style="margin:8px 0;"><summary>기억 처리에서 건너뛴 규칙 ${skipped.length}개</summary><ul>${skipped.map(rule =>
      `<li>${escapeHtml(rule.name)}: ${escapeHtml(rule.reason)}</li>`).join("")}</ul></details>` : "";
    overlay.innerHTML = `<div class="hp-edit-box" style="max-width:800px;">
      <h3>${escapeHtml(title)}</h3>
      <div style="font-size:12px;color:#aaa;">${messages.length}개 메시지 · ${text.length.toLocaleString()}자 · 로컬 미리보기</div>
      ${cleanup?.blocksRemoved ? `<div style="font-size:12px;color:#aaa;margin-top:6px;">표시 블록 ${cleanup.blocksRemoved}개 제외 · 캡션/설명 ${cleanup.captionsPreserved}개 보존</div>` : ""}
      ${cleanup?.unclosedBlocks ? `<div style="font-size:12px;color:#c9aa72;margin-top:6px;">닫힘을 확인하지 못한 표시 블록은 원문 그대로 유지했습니다.</div>` : ""}
      ${diagnostics}
      <pre style="background:#0a0a0a;padding:12px;border-radius:4px;font-size:13px;max-height:65vh;overflow:auto;white-space:pre-wrap;">${escapeHtml(text)}</pre>
      <div style="margin-top:12px;display:flex;justify-content:flex-end;"><button class="hp-btn secondary" id="hp-view-close">닫기</button></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#hp-view-close").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });
  }


  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Pure calculations with explicit inputs ──

  function prepareMemoryMessageValues(messages, entries, excludedClasses) {
    const compiled = entries.map(compileMemoryRegex);
    const cleanup = { blocksRemoved: 0, captionsPreserved: 0, charactersRemoved: 0, unclosedBlocks: 0 };
    const prepared = messages.map(message => {
      const cleaned = stripExcludedHtmlBlocks(message.content, excludedClasses);
      for (const key of Object.keys(cleanup)) cleanup[key] += cleaned[key];
      return { ...message, content: applyCompiledMemoryRegex(cleaned.text, compiled) };
    });
    return {
      messages: prepared,
      cleanup,
      skipped: compiled.filter(rule => rule.reason).map(rule => ({
        name: rule.entry.comment || "이름 없는 규칙", reason: rule.reason,
      })),
    };
  }

  function calculateSummaryCoverage(chunks, messages, indexById, firstMessageId) {
    const covered = new Set();
    const legacyCovered = new Set();
    const blocked = new Set();
    for (const chunk of chunks) {
      if (chunk.id === "0") continue;
      const ids = getChunkCoverageIds(chunk);
      if (hasCommittedSummary(chunk)) {
        for (const id of ids) {
          covered.add(id);
          if (!Array.isArray(chunk.sourceWindowIds)) legacyCovered.add(id);
        }
      } else {
        for (const id of ids) blocked.add(id);
      }
    }
    // Older versions stored only model input IDs, often omitting user turns.
    // Bridge those user turns only when the next non-user message has a valid
    // legacy summary. Never bridge an unrecorded assistant or a failed window.
    let nextIsLegacyCovered = false;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        if (nextIsLegacyCovered && !blocked.has(message.chatId)) covered.add(message.chatId);
      } else {
        nextIsLegacyCovered = legacyCovered.has(message.chatId);
      }
    }
    const firstCommitted = covered.has(firstMessageId);
    let frontier = -1;
    for (const message of messages) {
      if (!covered.has(message.chatId)) break;
      const index = indexById.get(message.chatId);
      if (index !== undefined) frontier = index;
    }
    if (blocked.has(firstMessageId) && !firstCommitted) frontier = -1;
    return { covered, firstCommitted, frontier };
  }

  function collectNodes(chunks) {
    const nodes = [];
    for (const chunk of chunks) {
      for (const node of chunk.nodes) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  function nextNodeIdFromList(nodes) {
    let maxId = 0;
    for (const n of nodes) {
      const num = parseInt(n.id, 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    }
    return String(maxId + 1);
  }

  function findNodeInChunks(chunks, nodeId) {
    for (const chunk of chunks) {
      const found = chunk.nodes.find((n) => n.id === nodeId);
      if (found) return found;
    }
    return undefined;
  }

  function resolveChunkMessageIndices(chunk, indexById, firstMessageId) {
    return chunk.chatIds
      .map((chatId) => (chatId === firstMessageId ? -1 : indexById.get(chatId)))
      .filter((index) => index !== undefined);
  }

  

  function summaryBlocks(raw) {
    const blocks = [];
    for (const type of ["event", "facts"]) {
      const pattern = new RegExp(`<${type}>([\\s\\S]*?)<\/${type}>`, "gi");
      let match;
      while ((match = pattern.exec(raw)) !== null) blocks.push({ type, text: match[1].trim() });
    }
    return blocks;
  }

  function parseEventFields(block) {
    const timeMatch = block.match(/(?:시간|Time)\s*:\s*(.+)/);
    const locMatch = block.match(/(?:장소|Loc)\s*:\s*(.+)/);
    const charMatch = block.match(/(?:인물|Chars)\s*:\s*(.+)/);
    const contentMatch = block.match(
      /(?:내용|Content)\s*:\s*([\s\S]*?)(?:---\s*(?:대사|Dialogues)\s*---|$)/,
    );

    if (!timeMatch || !contentMatch) return null;

    const time = timeMatch[1].trim();
    const location = locMatch ? locMatch[1].trim() : undefined;
    const characters = charMatch
      ? charMatch[1]
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];
    const content = contentMatch[1].trim();

    // Parse dialogues
    const dialogues = [];
    const dialogueSection = block.match(/---\s*(?:대사|Dialogues)\s*---\s*([\s\S]*)/);
    if (dialogueSection) {
      const dialogueLines = dialogueSection[1].trim().split("\n");
      for (const line of dialogueLines) {
        const dMatch = line.match(/^(.+?)\s*:\s*"(.+)"$/);
        if (dMatch) {
          dialogues.push({ speaker: dMatch[1].trim(), text: dMatch[2].trim() });
        }
      }
    }

    return {
      type: "event",
      time,
      location,
      characters,
      content,
      dialogues: dialogues.length > 0 ? dialogues : undefined,
    };
  }

  function parseFactsFields(block) {
    const charMatch = block.match(/(?:인물|Chars)\s*:\s*(.+)/);
    const timeMatch = block.match(/(?:시간|Time)\s*:\s*(.+)/);
    const contentMatch = block.match(/(?:내용|Content)\s*:\s*([\s\S]*)/);

    if (!contentMatch) return null;

    const characters = charMatch
      ? charMatch[1]
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];
    const time = timeMatch ? timeMatch[1].trim() : null;
    const content = contentMatch[1].trim();

    return {
      type: "facts",
      time,
      characters,
      content,
    };
  }

  

  

  

  function latestNodeTimeFromList(allNodes, parseTime) {
    if (allNodes.length === 0) return null;
    let latest = null;
    for (const node of allNodes) {
      const d = parseTime(node.time);
      if (!d) continue;
      if (!latest) {
        latest = node;
        continue;
      }
      const ld = parseTime(latest.time);
      if (ld && d.getTime() > ld.getTime()) latest = node;
    }
    return latest ? latest.time : null;
  }

  function recentNodesFromList(allNodes, count) {
    return sortNodesByStoryTime(allNodes, true, true).slice(0, Math.max(0, count));
  }

  function formatNodeWithTemplates(node, eventTemplate, factsTemplate) {
    const dialoguesText =
      node.dialogues && node.dialogues.length > 0
        ? node.dialogues.map((d) => `${d.speaker}: "${d.text}"`).join("\n")
        : "";

    const template = node.type === "event" ? eventTemplate : factsTemplate;

    return (
      template
        .replace(/\[\[time\]\]/g, node.time)
        .replace(/\[\[location\]\]/g, _nullishCoalesce(node.location, () => ( "")))
        .replace(/\[\[characters\]\]/g, node.characters.join(", "))
        .replace(/\[\[content\]\]/g, node.content)
        .replace(/\[\[dialogues\]\]/g, dialoguesText)
        // Clean up: collapse " |  | " → " | "
        .replace(/\s*\|\s+\|\s*/g, " | ")
        // Clean up: remove " | " at start of line (after leading text like "[기억: ")
        .replace(/^(\[.*?)\s*\|\s*\]/gm, "$1]")
        // Clean up: remove trailing " | " before newline
        .replace(/\s*\|\s*\n/g, "\n")
        // Clean up: remove empty lines that only have separators
        .replace(/^[ |\t]+$/gm, "")
        // Clean up: collapse 3+ newlines to 2
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  }

  function selectNodePage(sortedNodes, options) {
    const includedNodes = options.includedOnly
      ? sortedNodes.filter(node => options.cachedNodeIds.has(node.id) || options.selectedNodeIds.has(node.id))
      : options.favoritesOnly ? sortedNodes.filter(node => node.favorite) : sortedNodes;
    const query = options.query.toLowerCase();
    const filteredNodes = query ? includedNodes.filter(node =>
      node.content.toLowerCase().includes(query) || node.time.toLowerCase().includes(query) ||
      node.characters.some(character => character.toLowerCase().includes(query)) ||
      (node.location && node.location.toLowerCase().includes(query)) ||
      (node.dialogues && node.dialogues.some(dialogue =>
        dialogue.text.toLowerCase().includes(query) || dialogue.speaker.toLowerCase().includes(query)))
    ) : includedNodes;
    const totalPages = Math.max(1, Math.ceil(filteredNodes.length / options.pageSize));
    const page = options.page >= totalPages ? totalPages - 1 : options.page;
    const pageStart = page * options.pageSize;
    return { filteredNodes, totalPages, page, pageStart,
      pageNodes: filteredNodes.slice(pageStart, pageStart + options.pageSize) };
  }

  function partitionRetrievalNodes(nodes, excludedIds) {
    return {
      favorites: nodes.filter(node => node.favorite && !excludedIds.has(node.id)),
      nonFavorites: nodes.filter(node => !node.favorite && !excludedIds.has(node.id)),
    };
  }

  function calculateRetrievalScores(nodes, similarityScores, timeScores, mode, timeWeight, similarityWeight) {
    return nodes.map((node, index) => {
      const similarity = similarityScores.get(node.id) ?? 0.5;
      const time = timeScores[index];
      const timeFactor = mode === "none" ? 1 : Math.pow(1.0 - time, timeWeight);
      const combined = 1.0 - timeFactor * Math.pow(1.0 - similarity, similarityWeight);
      return { node, similarity, time, combined };
    });
  }

  function retrievalDisplayScores(scored, favorites) {
    const scores = new Map();
    for (const score of scored) {
      scores.set(score.node.id, { similarity: score.similarity, time: score.time, combined: score.combined });
    }
    for (const node of favorites) scores.set(node.id, { similarity: 1.0, time: 1.0, combined: 1.0 });
    return scores;
  }

  function retrievalCandidates(favorites, rankedScores, compare) {
    return [...favorites].sort(compare).concat(
      rankedScores.filter(score => !(score.combined < 0.05)).map(score => score.node),
    );
  }

  function selectNodesWithinBudget(candidates, tokenCounts, budget) {
    const selected = [];
    let usedTokens = 0;
    for (let index = 0; index < candidates.length; index++) {
      const tokens = tokenCounts[index];
      if (usedTokens + tokens > budget) continue;
      selected.push(candidates[index]);
      usedTokens += tokens;
    }
    return selected;
  }

  // ── UI-triggered state-changing workflows ──

  function clearMemoryState(context = summaryContext(), expected) {
    return applyMemoryChange(context, target => {
      if (expected !== undefined) assertUnchangedValue(target, expected);
      for (const key of Object.keys(target)) delete target[key];
      Object.assign(target, createEmptyState());
    });
  }

  function saveFavoriteToggle(node, context = summaryContext()) {
    return applyMemoryChange(context, () => {
      const current = getNodes().find(entry => entry.id === node.id);
      if (!current) throw new Error("기억이 삭제되었습니다.");
      current.favorite = !current.favorite;
    });
  }

  function deleteMemoryNode(nodeId, context = summaryContext(), expected) {
    return applyMemoryChange(context, () => {
      if (expected !== undefined) assertUnchangedValue(getNodes().find(node => node.id === nodeId), expected);
      removeNodeById(nodeId);
    });
  }

  function saveChunkMemo(chunk, memo, context = summaryContext(), expected = chunk.memo) {
    return applyMemoryChange(context, target => {
      const current = target.chunks.find(entry => entry.id === chunk.id);
      if (!current) throw new Error("청크가 삭제되었습니다.");
      assertUnchangedValue(current.memo, expected);
      current.memo = memo;
    });
  }

  function deleteMemoryChunk(chunkId, chunk, context = summaryContext(), expected = chunk) {
    return applyMemoryChange(context, target => {
      const current = target.chunks.find(entry => entry.id === chunkId);
      assertUnchangedValue(current, expected);
      if (!current) return;
      removeNodesByIds(new Set(current.nodes.map(node => node.id)));
      target.chunks = target.chunks.filter(entry => entry.id !== chunkId);
    });
  }

  async function saveMemoryCleanupClasses(classes) {
    assertMemoryChange();
    memoryExcludedHtmlClasses = classes;
    await writeStoredValue(MEMORY_CLEANUP_STORAGE_KEY, { excludedHtmlClasses: classes });
  }

  function saveNodeEdit(node, values, context = summaryContext(), expected = nodeEditValues(node)) {
    return applyMemoryChange(context, () => {
      const current = getNodes().find(entry => entry.id === node.id);
      if (!current) throw new Error("기억이 삭제되었습니다.");
      assertUnchangedValue(nodeEditValues(current), expected);
      Object.assign(current, values);
      clearNodeEmbedding(current);
    });
  }

  function createManualMemoryNode(values, context = summaryContext()) {
    return applyMemoryChange(context, () => {
      const node = { ...values, id: nextNodeId(), createdAt: Date.now() };
      getOrCreateManualChunk().nodes.push(node);
    });
  }

  async function saveSettingsFromInput(values) {
    assertMemoryChange();
    chunkSize = values.chunkSize;
    maxMemoryTokens = values.maxMemoryTokens;
    const nextMemoryMode = normalizeMemoryInjectionMode(values.memoryInjectionMode);
    if (nextMemoryMode !== memoryInjectionMode) memoryModeChangePending = true;
    memoryInjectionMode = nextMemoryMode;
    autoSummarize = values.autoSummarize;
    includeUserMessages = values.includeUserMessages;
    autoSummarizeThreshold = values.autoSummarizeThreshold;
    embeddingUrl = values.embeddingUrl;
    embeddingModel = values.embeddingModel;
    timeDecayDays = values.timeDecayDays;
    timeScoringMode = values.timeScoringMode;
    timeWeight = values.timeWeight;
    similarityWeight = values.similarityWeight;
    embeddingApiKey = values.embeddingApiKey;
    embeddingContextMessages = values.embeddingContextMessages;
    recentNodeCache = values.recentNodeCache;
    recentNodeCacheCount = values.recentNodeCacheCount;
    showGuiButton = values.showGuiButton;

    await Promise.all([
      writePluginArgument("chunk_size", values.chunkSize),
      writePluginArgument("max_memory_tokens", values.maxMemoryTokens),
      writePluginArgument("auto_summarize", values.autoSummarize ? "true" : "false"),
      writePluginArgument("include_user_messages", values.includeUserMessages ? "true" : "false"),
      writePluginArgument("auto_summarize_threshold", values.autoSummarizeThreshold),
      writePluginArgument("embedding_url", values.embeddingUrl),
      writePluginArgument("embedding_model", values.embeddingModel),
      writePluginArgument("time_decay_days", values.timeDecayDays),
      writePluginArgument("time_scoring_mode", values.timeScoringMode),
      writePluginArgument("time_weight", values.timeWeight),
      writePluginArgument("similarity_weight", values.similarityWeight),
      writePluginArgument("embedding_api_key", values.embeddingApiKey),
      writePluginArgument("embedding_context_messages", values.embeddingContextMessages),
      writePluginArgument("recent_node_cache", values.recentNodeCache ? "true" : "false"),
      writePluginArgument("recent_node_cache_count", values.recentNodeCacheCount),
      saveSettings(),
    ]);
    await syncGuiButtonRegistration();
    clearTokenCache();
  }

  function saveSummaryPrompt(prompt) {
    assertMemoryChange();
    summaryPrompt = prompt;
    return savePrompt();
  }

  function saveMemoryFormats(nextEventFormat, nextFactsFormat) {
    assertMemoryChange();
    eventFormat = nextEventFormat;
    factsFormat = nextFactsFormat;
    return saveSettings();
  }

  async function applyStoredPreset(preset) {
    assertMemoryChange();
    applyPreset(preset);
    await Promise.all([savePrompt(), saveSettings()]);
  }

  function deleteStoredPreset(presets, index) {
    presets.splice(index, 1);
    return savePresets(presets);
  }

  function saveStoredPreset(presets, preset) {
    const existingIndex = presets.findIndex((entry) => entry.name === preset.name);
    if (existingIndex >= 0) presets[existingIndex] = preset;
    else presets.push(preset);
    return savePresets(presets);
  }

  async function deleteStoredRegexPreset(presets, index) {
    assertMemoryChange();
    const active = activeRegexPresetName === presets[index].name;
    if (active) activeRegexPresetName = "";
    presets.splice(index, 1);
    await Promise.all([saveRegexPresets(presets), ...(active ? [saveActiveRegexPreset()] : [])]);
  }

  function selectRegexPreset(name) {
    assertMemoryChange();
    activeRegexPresetName = name;
    return saveActiveRegexPreset();
  }

  function saveStoredRegexPreset(presets, name, entries) {
    assertMemoryChange();
    const existingIndex = presets.findIndex((entry) => entry.name === name);
    if (existingIndex >= 0) presets[existingIndex] = { name, entries };
    else presets.push({ name, entries });
    return saveRegexPresets(presets);
  }

  function replaceChatRegex(entries, context = summaryContext(), expected = context.state.chatRegex) {
    assertMemoryChange(context);
    assertUnchangedValue(context.state.chatRegex, expected);
    context.state.chatRegex = copyStorageValue(entries);
    return writeStoredValue(getChatRegexStorageKey(context.charId, context.chatId), context.state.chatRegex);
  }

  // ── Ephemeral display data and active-panel rendering ──

  function prepareNodeDisplay(nodes) {
    const cachedNodeIds = new Set(memoryInjectionMode !== "all" && recentNodeCache && recentNodeCacheCount > 0
      ? recentNodesFromList(nodes, recentNodeCacheCount).map(n => n.id) : []);
    const parentChunks = new Map();
    for (const chunk of state.chunks) for (const node of chunk.nodes) {
      if (!parentChunks.has(node.id)) parentChunks.set(node.id, chunk);
    }
    return {cachedNodeIds, selectedNodeIds: new Set(memoryInjectionMode === "all" ? [] : state.lastSelectedNodeIds ?? []),
      scores: memoryInjectionMode === "all" ? {} : state.lastNodeScores ?? {}, parentChunks, timeScoringMode};
  }

  function nodeDisplayValues(node, display) {
    return {parentChunk: display.parentChunks.get(node.id), scores: display.scores[node.id] ?? null,
      isSelected: display.selectedNodeIds.has(node.id), isCached: display.cachedNodeIds.has(node.id),
      timeScoringMode: display.timeScoringMode};
  }

  function renderActivePanel(pendingMessages, charName, chatName, allNodes, display) {
    switch (activeTab) {
      case "nodes": return renderNodesPanel(pendingMessages, charName, chatName, allNodes, display);
      case "chunks": return renderChunksPanel(display);
      case "settings": return renderSettingsPanel(pendingMessages);
      case "presets": return renderPresetsPanel();
      case "prompt": return renderPromptPanel();
      case "regex": return renderRegexPanel();
      default: return "";
    }
  }

  function populateChunkNodes(chunkId, container) {
    const chunk = state.chunks.find(c => c.id === chunkId);
    if (!chunk) return;
    if (!chunk.nodes.length) { container.textContent = "연결된 노드 없음"; return; }
    const display = prepareNodeDisplay(getNodes());
    container.innerHTML = chunk.nodes.map(node => renderNodeCardCompact(node, nodeDisplayValues(node, display))).join("");
    attachNodeCardEvents(container);
  }

  function attachChunkNodeEvents() {
    document.querySelectorAll(".hp-chunk-nodes").forEach(details => {
      details.ontoggle = () => {
        const container = details.querySelector(".hp-chunk-node-list");
        if (!container) return;
        if (!details.open) container.textContent = "";
        else if (!container.childElementCount) populateChunkNodes(details.dataset.chunkId, container);
      };
    });
  }

  // ── Shared UI event entry points ──

  function safeAsync(fn, label) {
    return async () => {
      const context = summaryContext();
      try { await fn(context); }
      catch (error) {
        console.error(`[HypaPlus] UI error (${label}):`, error);
        alert(error instanceof Error ? error.message : String(error));
      }
    };
  }

  function attachNodeCardEvents(root) {
    const viewContext = summaryContext();
    root.querySelectorAll(".hp-fav-node").forEach(btn => {
      btn.addEventListener("click", safeAsync(async () => {
        const card = btn.closest("[data-node-id].hp-card");
        const node = findNodeById(btn.dataset.nodeId);
        if (!node || btn.disabled) return;
        const previousFavorite = node.favorite;
        btn.disabled = true;
        try { await saveFavoriteToggle(node, viewContext); }
        finally {
          btn.disabled = false;
          if (node.favorite !== previousFavorite && card.isConnected && isSummaryContextCurrent(viewContext)) {
            if (!refreshConnectedNode(card, false)) renderUI();
          }
        }
      }, "fav-node"));
    });
    root.querySelectorAll(".hp-edit-node").forEach(btn => {
      btn.addEventListener("click", () => openNodeEditor(btn, viewContext));
    });
    root.querySelectorAll(".hp-delete-node").forEach(btn => {
      btn.addEventListener("click", safeAsync(async () => {
        const card = btn.closest("[data-node-id].hp-card");
        if (btn.disabled) return;
        const nodeId = btn.dataset.nodeId;
        const nodeBase = copyStorageValue(getNodes().find(node => node.id === nodeId));
        if (!nodeBase) return;
        btn.disabled = true;
        try {
          const ok = await showConfirmDialog("이 노드를 지웁니까?");
          if (!ok || !card.isConnected || !isSummaryContextCurrent(viewContext)) return;
          await deleteMemoryNode(nodeId, viewContext, nodeBase);
        } finally {
          btn.disabled = false;
          if (card.isConnected && isSummaryContextCurrent(viewContext) && !findNodeById(nodeId)) {
            if (!refreshConnectedNode(card)) renderUI();
          }
        }
      }, "delete-node"));
    });
  }

  // ── Host IO and stored-data compatibility ──

  function readStoredValue(key) {
    return risuai.pluginStorage.getItem(key);
  }

  async function writeStoredValue(key, value) {
    const sent = copyStorageValue(value);
    const result = await risuai.pluginStorage.setItem(key, sent);
    if (result === false) throw new Error("저장에 실패했습니다. 화면의 변경이 저장되지 않았을 수 있습니다.");
    return result;
  }

  function readCurrentCharacterIndex() {
    return risuai.getCurrentCharacterIndex();
  }

  function readCurrentChatIndex() {
    return risuai.getCurrentChatIndex();
  }

  function readHostCharacter(index) {
    return risuai.getCharacterFromIndex(index);
  }

  function readHostChat(characterIndex, chatIndex) {
    return risuai.getChatFromIndex(characterIndex, chatIndex);
  }

  function readHostDatabase(fields) {
    return risuai.getDatabase(fields);
  }

  function readPluginArgument(key) {
    return risuai.getArgument(key);
  }

  function writePluginArgument(key, value) {
    return risuai.setArgument(key, value);
  }

  function requestMemoryModel(options) {
    return risuai.runLLMModel(options);
  }

  function requestNativeFetch(url, options) {
    return risuai.nativeFetch(url, options);
  }

  function showPluginContainer(mode) {
    return risuai.showContainer(mode);
  }

  function hidePluginContainer() {
    return risuai.hideContainer();
  }

  function registerHostButton(options, handler) {
    return risuai.registerButton(options, handler);
  }

  function unregisterHostUIPart(id) {
    return risuai.unregisterUIPart(id);
  }

  function registerHostSetting(name, handler, icon, iconType, id) {
    return risuai.registerSetting(name, handler, icon, iconType, id);
  }

  function registerHostScriptHandler(name, handler) {
    return risuai.addRisuScriptHandler(name, handler);
  }

  function registerHostReplacer(name, handler) {
    return risuai.addRisuReplacer(name, handler);
  }

  function decodeStoredStateEnvelope(saved) {
    return {
      ...saved,
      chatRegex: saved.chatRegex || [],
      lastNodeScores: saved.lastNodeScores || {},
      lastSelectedNodeIds: saved.lastSelectedNodeIds || [],
    };
  }

  function needsStoredMessageMigration(value) {
    return value.chunks.some(chunk => !Array.isArray(chunk.chatIds) && Array.isArray(chunk.msgIndices));
  }

  function decodeStoredChatState(value, messages, firstMessageId) {
    let migrated = false;
    const chunks = value.chunks.map(chunk => {
      let decoded = chunk;
      const copyChunk = () => {
        if (decoded === chunk) decoded = { ...chunk };
        migrated = true;
        return decoded;
      };
      if (!Array.isArray(chunk.chatIds) && Array.isArray(chunk.msgIndices)) {
        const target = copyChunk();
        target.chatIds = chunk.msgIndices
          .map(index => index === -1 ? firstMessageId : messages[index]?.chatId)
          .filter(chatId => Boolean(chatId));
        delete target.msgIndices;
      }
      if (typeof chunk.memo !== "string") copyChunk().memo = "";
      if (chunk.summarized === true) copyChunk().summarized = "done";
      else if (chunk.summarized === false) copyChunk().summarized = "failed";
      // Time interpretation is read-only; preserve stored node.time verbatim.
      return decoded;
    });
    return { value: migrated ? { ...value, chunks } : value, migrated };
  }

  function applyStoredStateCompatibility(target, decoded) {
    for (let i = 0; i < target.chunks.length; i++) {
      const chunk = target.chunks[i];
      const next = decoded.chunks[i];
      if (chunk === next) continue;
      if (chunk.chatIds !== next.chatIds) {
        chunk.chatIds = next.chatIds;
        delete chunk.msgIndices;
      }
      chunk.memo = next.memo;
      if (chunk.summarized !== next.summarized) chunk.summarized = next.summarized;
    }
  }

  function serializeBackupChunks(chunks) {
    return JSON.stringify({ chunks }, null, 2);
  }

  // Story calendar arithmetic uses UTC fields only as a timezone-neutral scale.
  // No wall clock, createdAt, or machine-current year is an event-time fallback.
  function storyDayValue(year, month, day) {
    if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(0, 0, 0, 0);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day ? date.getTime() : null;
  }

  function storyClockValue(text) {
    const value = text.trim();
    // Representative times are an ordering convention, not edits to node.time.
    const periods = { 자정: 0, 새벽: 240, 아침: 420, 오전: 540, 정오: 720,
      낮: 720, 오후: 900, 저녁: 1080, 밤: 1260, 심야: 1380 };
    if (Object.prototype.hasOwnProperty.call(periods, value)) {
      return { minute: periods[value], precision: "period" };
    }
    const match = value.match(/^(?:(오전|오후)\s*)?(\d{1,2})(?::(\d{1,2})|시(?:\s*(\d{1,2})분)?)$/);
    if (!match) return { minute: null, precision: "day" };
    let hour = Number(match[2]);
    const minute = Number(match[3] ?? match[4] ?? 0);
    if (minute > 59) return { minute: null, precision: "day" };
    if (match[1]) {
      if (hour < 1 || hour > 12) return { minute: null, precision: "day" };
      hour = hour % 12 + (match[1] === "오후" ? 12 : 0);
    } else if (hour > 23) return { minute: null, precision: "day" };
    return { minute: hour * 60 + minute, precision: "minute" };
  }

  function parseStoryTimePart(text, base = null) {
    const unknown = { day: null, minute: null, precision: "unknown", inheritedDate: false };
    const value = text.trim();
    let match = value.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T]+(.*))?$/) ||
      value.match(/^(\d{1,4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s*(.*))?$/);
    let day, clock, inheritedDate = false;
    if (match) {
      day = storyDayValue(Number(match[1]), Number(match[2]), Number(match[3]));
      clock = match[4] ?? "";
    } else if (base?.day !== null && base?.day !== undefined) {
      match = value.match(/^(\d{1,2})[-/.](\d{1,2})(?:\s+(.*))?$/);
      if (match) {
        day = storyDayValue(new Date(base.day).getUTCFullYear(), Number(match[1]), Number(match[2]));
        clock = match[3] ?? "";
      } else {
        // A malformed explicit date must not silently inherit the start date.
        if (/^\d{1,4}[-/.]|^\d+년/.test(value)) return unknown;
        day = base.day;
        clock = value;
        inheritedDate = true;
      }
    } else return unknown;
    if (day === null) return unknown;
    return { day, ...storyClockValue(clock), inheritedDate };
  }

  function parseStoryTime(text) {
    const unknown = { day: null, minute: null, precision: "unknown", value: null };
    if (typeof text !== "string" || !text.trim()) return unknown;
    const parts = text.trim().split(/\s*(?:→|->|~|～)\s*/);
    if (parts.length > 2) return unknown;
    const start = parseStoryTimePart(parts[0]);
    if (start.day === null) return unknown;
    let end = start;
    if (parts.length === 2) {
      if (!parts[1]) return { day: start.day, minute: null, precision: "day", value: start.day };
      end = parseStoryTimePart(parts[1], start);
      if (end.day === null) return unknown;
      if (end.inheritedDate && start.minute !== null && end.minute !== null && end.minute < start.minute) {
        end = { ...end, day: end.day + 86400000 };
      }
      if (end.day < start.day || (end.day === start.day && end.minute !== null &&
        start.minute !== null && end.minute < start.minute)) return unknown;
    }
    return { day: end.day, minute: end.minute, precision: end.precision,
      value: end.day + (end.minute ?? 0) * 60000 };
  }

  function compareStoryTimeEntries(a, b, descending = false) {
    const aUnknown = a.time.day === null, bUnknown = b.time.day === null;
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
    const order = (aUnknown ? 0 : a.time.value - b.time.value) ||
      a.node.id.localeCompare(b.node.id, undefined, { numeric: true });
    return descending ? -order : order;
  }

  function sortNodesByStoryTime(nodes, descending = false, datedOnly = false) {
    const entries = nodes.map(node => ({ node, time: parseStoryTime(node.time) }));
    const eligible = datedOnly ? entries.filter(entry => entry.time.day !== null) : entries;
    eligible.sort((a, b) => compareStoryTimeEntries(a, b, descending));
    return eligible.map(entry => entry.node);
  }

  function scoreStoryTimes(nodeTime, referenceTime, mode, decayDays) {
    if (mode === "none") return 0;
    if (nodeTime.day === null || referenceTime.day === null) return 0.5;
    const dayOnly = mode === "day" || nodeTime.precision === "day" || referenceTime.precision === "day";
    const diffDays = Math.abs((dayOnly ? nodeTime.day : nodeTime.value) -
      (dayOnly ? referenceTime.day : referenceTime.value)) / 86400000;
    return 1.0 / Math.sqrt(1.0 + diffDays / decayDays);
  }


  function copyStorageValue(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function assertMemoryChange(context = summaryContext()) {
    if (isSummarizing) throw new Error("요약이 끝난 뒤 기억과 설정을 변경해 주세요.");
    if (!context.charId || !context.chatId) throw new Error("채팅을 읽은 뒤 변경해 주세요.");
    if (!isSummaryContextCurrent(context)) throw new Error("채팅이 바뀌었습니다. 현재 화면에서 다시 시도해 주세요.");
  }

  function applyMemoryChange(context, change) {
    assertMemoryChange(context);
    change(context.state);
    recomputeLastSummarizedMsgIndex();
    return saveStateForChat(context.charId, context.chatId, context.state);
  }

  function assertUnchangedValue(actual, expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error("대기 중 대상 내용이 바뀌었습니다. 현재 내용을 확인한 뒤 다시 시도해 주세요.");
    }
  }

  function nodeEditValues(node) {
    if (!node) return null;
    const { type, time, location, characters, content, dialogues } = node;
    return copyStorageValue({ type, time, location, characters, content, dialogues });
  }

  function chatMessageSnapshot(chat, includeIndex = true) {
    const messages = [], indexByChatId = includeIndex ? new Map() : null;
    for (let index = 0; index < (chat?.message || []).length; index++) {
      const message = chat.message[index];
      const role = String(message.role ?? "").toLowerCase();
      const content = String(message.data ?? "");
      const chatId = String(message.chatId ?? "");
      if (content && chatId) {
        messages.push({ chatId, role, content });
        if (indexByChatId) indexByChatId.set(chatId, index);
      }
    }
    return { messages, indexByChatId };
  }

  async function refreshChatSnapshot(context) {
    if (context.charIndex < 0 || context.chatIndex < 0) return [];
    const chat = await readHostChat(context.charIndex, context.chatIndex);
    if (!isSummaryContextCurrent(context) || chat?.id !== context.chatId) throw new Error("읽는 동안 채팅이 바뀌었습니다.");
    return cacheChatMessages(chat);
  }

  function sameChatTarget(a, b) {
    return a.charId === b.charId && a.chatId === b.chatId &&
      a.charIndex === b.charIndex && a.chatIndex === b.chatIndex;
  }

  async function commitSummaryChunk(context, original, draft) {
    if (!isSummaryContextCurrent(context)) return false;
    const exists = context.state.chunks.includes(original);
    const candidate = { ...context.state,
      chunks: exists ? context.state.chunks.map(chunk => chunk === original ? draft : chunk) : [...context.state.chunks, draft] };
    if (draft.summarized === "done") {
      candidate.lastNodeScores = {};
      candidate.lastSelectedNodeIds = [];
    }
    if (!await persistSummaryState(context, candidate)) return false;
    // No other semantic writer is admitted while the existing summary guard is held.
    if (exists) Object.assign(original, draft);
    else context.state.chunks.push(draft);
    context.state.lastNodeScores = candidate.lastNodeScores;
    context.state.lastSelectedNodeIds = candidate.lastSelectedNodeIds;
    recomputeLastSummarizedMsgIndex();
    return true;
  }


  // These vectors are replaced/deleted, never edited in place by this plugin.
  // Keep the comparison boundary before the first await without serializing them.
  function captureStateComparison(value) {
    const nodes = new Set(collectNodes(value.chunks));
    const vectors = [];
    const text = JSON.stringify(value, function(key, item) {
      if (key === "embedding" && nodes.has(this)) {
        if (Array.isArray(item)) {
          vectors.push(item);
          return { vector: vectors.length - 1 };
        }
        if (item === undefined || typeof item === "function" || typeof item === "symbol") return item;
        return { value: item };
      }
      return item;
    });
    return { text, vectors };
  }

  function stateMatchesComparison(value, previous) {
    const current = captureStateComparison(value);
    if (current.text !== previous.text || current.vectors.length !== previous.vectors.length) return false;
    return current.vectors.every((vector, index) => vector === previous.vectors[index] ||
      JSON.stringify(vector) === JSON.stringify(previous.vectors[index]));
  }

  function copyRetrievalNodes(nodes) {
    return nodes.map(node => {
      if (!Array.isArray(node.embedding)) return copyStorageValue(node);
      const { embedding, ...input } = node;
      return { ...copyStorageValue(input), embedding };
    });
  }

  function retrievalInput(node) {
    const { id, type, time, favorite, content, location, characters } = node;
    const dialogues = node.dialogues?.map(({ speaker, text }) => ({ speaker, text }));
    return { id, type, time, favorite, content, location, characters, dialogues };
  }


  // The editor owns only its overlay and the originating card, never a new view.
  function openNodeEditor(button, context) {
    const card = button.closest("[data-node-id].hp-card");
    const node = findNodeById(button.dataset.nodeId);
    if (!node || !card.isConnected || !isSummaryContextCurrent(context)) return;
    // Editing the still-visible view supersedes a pending tab transition.
    document.getElementById("hp-render-pending")?.remove();
    activeTab = card.closest("[data-panel]").dataset.panel;
    document.getElementById("hp-edit-overlay")?.remove();
    editingNodeId = node.id;
    const holder = document.createElement("div");
    holder.innerHTML = renderEditOverlay(node.id);
    const overlay = holder.firstElementChild;
    (document.getElementById("hp-render-root") || document.body).appendChild(overlay);
    let editBase = nodeEditValues(node);
    const originalFields = editBase;
    const finish = (refresh) => {
      if (!overlay.isConnected || !isSummaryContextCurrent(context)) return;
      overlay.remove();
      editingNodeId = null;
      if (!card.isConnected) return;
      if (refresh) {
        if (!refreshConnectedNode(card, node.time !== originalFields.time)) renderUI();
      } else button.focus({ preventScroll: true });
    };
    overlay.querySelector("#hp-edit-cancel").addEventListener("click", () => {
      // A rejected save may already have changed session memory; show that value.
      finish(JSON.stringify(nodeEditValues(node)) !== JSON.stringify(originalFields));
    });
    const save = overlay.querySelector("#hp-edit-save");
    save.addEventListener("click", safeAsync(async () => {
      if (save.disabled || !overlay.isConnected) return;
      save.disabled = true;
      try {
          const values = {};
          values.type = (overlay.querySelector("#hp-edit-type") ).value 

;
          values.time = (overlay.querySelector("#hp-edit-time") ).value;
          values.location =
            (overlay.querySelector("#hp-edit-location") ).value.trim() ||
            undefined;
          values.characters = (
            overlay.querySelector("#hp-edit-characters") 
          ).value
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          values.content = (
            overlay.querySelector("#hp-edit-content") 
          ).value.trim();

          const dialoguesRaw = (
            overlay.querySelector("#hp-edit-dialogues") 
          ).value.trim();
          if (dialoguesRaw) {
            const lines = dialoguesRaw.split("\n").filter(Boolean);
            values.dialogues = [];
            for (const line of lines) {
              const m = line.match(/^(.+?)\s*:\s*"(.+)"$/);
              if (m) {
                values.dialogues.push({ speaker: m[1].trim(), text: m[2].trim() });
              }
            }
            if (values.dialogues.length === 0) values.dialogues = undefined;
          } else {
            values.dialogues = undefined;
          }


        // The mutation is synchronous before its storage promise. Capture that
        // value so retry after storage failure still detects later outside edits.
        const saving = saveNodeEdit(node, values, context, editBase);
        editBase = nodeEditValues(node);
        await saving;
        finish(true);
      } finally { save.disabled = false; }
    }, "edit-save"));
    overlay.querySelector("#hp-edit-content").focus({ preventScroll: true });
  }

  function refreshConnectedNode(card, timeChanged = true) {
    const details = card.closest(".hp-chunk-nodes");
    if (!details) return false;
    const container = card.parentElement;
    const body = card.closest("#hp-body");
    const chunk = state.chunks.find(entry => entry.id === details.dataset.chunkId);
    if (!chunk || !body) return true;
    const node = chunk.nodes.find(entry => entry.id === card.dataset.nodeId);
    const next = card.nextElementSibling;
    const previous = card.previousElementSibling;
    const anchor = node ? card : next || previous || details.querySelector("summary");
    const top = !node && next ? card.getBoundingClientRect().top : anchor.getBoundingClientRect().top;
    // Only a changed story time or deletion can change chronological membership.
    // Unchanged membership is already represented by the existing card's badge.
    const cachedIds = memoryInjectionMode !== "all" && (timeChanged || !node)
      ? new Set(recentNodeCache && recentNodeCacheCount > 0
        ? recentNodesFromList(getNodes(), recentNodeCacheCount).map(entry => entry.id) : [])
      : null;
    const selectedIds = cachedIds ? new Set(state.lastSelectedNodeIds ?? []) : null;
    let target = anchor;
    if (node) {
      const holder = document.createElement("div");
      holder.innerHTML = renderNodeCardCompact(node, {
        scores: memoryInjectionMode === "all" ? null : state.lastNodeScores?.[node.id] ?? null,
        isSelected: memoryInjectionMode !== "all" && (selectedIds ? selectedIds.has(node.id) : (state.lastSelectedNodeIds ?? []).includes(node.id)),
        isCached: memoryInjectionMode !== "all" && (cachedIds ? cachedIds.has(node.id) : !!card.querySelector('[title="최근 노드 캐시에 포함"]')),
        timeScoringMode,
      });
      attachNodeCardEvents(holder);
      target = holder.firstElementChild;
      card.replaceWith(target);
    } else {
      card.remove();
      if (!chunk.nodes.length) container.textContent = "연결된 노드 없음";
      details.querySelector("summary").textContent = (chunk.id === "0" ? "📋 수동 노드" : "📋 연결된 노드") + " (" + chunk.nodes.length + "개)";
      const count = details.closest(".hp-card").querySelector(".hp-chunk-node-count");
      if (count) count.textContent = String(chunk.nodes.length);
      const nodesTab = document.querySelector('.hp-tab[data-tab="nodes"]');
      if (nodesTab) nodesTab.textContent = "📋 노드 (" + state.chunks.reduce((count, entry) => count + entry.nodes.length, 0) + ")";
    }
    if (cachedIds) {
      body.querySelectorAll('.hp-chunk-node-list > .hp-card[data-node-id]').forEach(visible => {
        const id = visible.dataset.nodeId, cached = cachedIds.has(id), selected = selectedIds.has(id);
        const markers = visible.querySelector(".hp-node-status");
        if (!markers || (!!markers.querySelector('[title="최근 노드 캐시에 포함"]') === cached &&
          !!markers.querySelector('[title="임베딩 검색으로 컨텍스트에 포함"]') === selected)) return;
        markers.innerHTML = (selected ? '<span style="font-size:11px;color:#8fdf82;margin-left:4px;" title="임베딩 검색으로 컨텍스트에 포함">🧬</span>' : "") +
          (cached ? '<span style="font-size:11px;color:#dfb882;margin-left:4px;" title="최근 노드 캐시에 포함">📌 캐시</span>' : "");
        visible.style.background = cached ? "rgb(30,20,0)" : selected ? "rgb(0,40,0)" : "";
      });
    }
    body.scrollTop += target.getBoundingClientRect().top - top;
    (target.querySelector(".hp-edit-node") || target).focus({ preventScroll: true });
    return true;
  }


  // Match per-node retrieval budget estimates without changing its shared cache.
  function estimateStoredMemoryTokens(chunks, eventTemplate, factsTemplate) {
    let total = 0;
    for (const chunk of chunks) {
      for (const node of chunk.nodes) {
        total += heuristicEstimateTokens(formatNodeWithTemplates(node, eventTemplate, factsTemplate));
      }
    }
    return total;
  }

  function normalizeMemoryInjectionMode(value) {
    return value === "all" ? "all" : "selected";
  }

  // Compare decimal IDs without locale or floating-point rounding. Legacy IDs
  // stay in a stable leading group, so new ordinary IDs still append at the end.
  function orderAllMemoryNodes(chunks) {
    const entries = [];
    for (const chunk of chunks) {
      if (!Array.isArray(chunk.nodes)) throw new Error("기억의 노드 목록을 읽을 수 없습니다.");
      for (const node of chunk.nodes) {
        if (!node || typeof node !== "object") throw new Error("기억 노드를 읽을 수 없습니다.");
        const raw = typeof node.id === "string" || typeof node.id === "number" ? String(node.id) : "";
        const digits = /^\d+$/.test(raw) ? raw.replace(/^0+/, "") : "";
        entries.push({ node, digits, index: entries.length });
      }
    }
    entries.sort((a, b) => {
      if (!a.digits || !b.digits) return a.digits ? 1 : b.digits ? -1 : a.index - b.index;
      return a.digits.length - b.digits.length ||
        (a.digits < b.digits ? -1 : a.digits > b.digits ? 1 : a.index - b.index);
    });
    return entries.map(entry => entry.node);
  }

  function buildAllMemoryContext(chunks, eventTemplate, factsTemplate) {
    const text = orderAllMemoryNodes(chunks)
      .map(node => formatNodeWithTemplates(node, eventTemplate, factsTemplate)).join("\n");
    if (text.includes(FULL_MEMORY_START) || text.includes(FULL_MEMORY_END)) {
      throw new Error("기억 본문에 HypaPlus 전체 주입의 예약 표식이 들어 있습니다. 해당 표식을 수정해 주세요.");
    }
    return text;
  }

  function hasFullMemoryBlock(messages) {
    return messages.some(message => typeof message.content === "string" &&
      (message.content.includes(FULL_MEMORY_START) || message.content.includes(FULL_MEMORY_END)));
  }

  // Only a single balanced owned block can be restored. Never guess where a
  // malformed block ends or delete other message fields while replacing it.
  function restoreFullMemoryPlaceholder(messages) {
    let blocks = 0;
    return messages.map(message => {
      const content = message.content;
      if (typeof content !== "string") return { ...message };
      const start = content.indexOf(FULL_MEMORY_START), end = content.indexOf(FULL_MEMORY_END);
      if (start === -1 && end === -1) return { ...message };
      if (start === -1 || end < start ||
          content.indexOf(FULL_MEMORY_START, start + FULL_MEMORY_START.length) !== -1 ||
          content.indexOf(FULL_MEMORY_END, end + FULL_MEMORY_END.length) !== -1 || ++blocks > 1) {
        throw new Error("HypaPlus 전체 기억 주입 표식이 중복되거나 손상되었습니다. 대화를 새로 요청해 주세요.");
      }
      return { ...message, content: content.slice(0, start) + "[HypaPlus.memory]" + content.slice(end + FULL_MEMORY_END.length) };
    });
  }

  // Internal only: prepared owns shallow message copies made by the validating
  // restoreFullMemoryPlaceholder call. Never pass host messages directly here.
  function injectPreparedMemoryContext(prepared, memoryContext) {
    const block = memoryContext ? FULL_MEMORY_START + "\n" + memoryContext + "\n" + FULL_MEMORY_END : "";
    let placed = false;
    for (const message of prepared) {
      if (typeof message.content !== "string") continue;
      message.content = message.content.replace(/\[HypaPlus\.(memory|cached)\]/g, (_, kind) => {
        if (kind === "memory" && !placed) { placed = true; return block; }
        return "";
      });
    }
    if (!placed && block) {
      const index = prepared.findIndex(message => message.role === "system" && typeof message.content === "string");
      if (index === -1) prepared.unshift({ role: "system", content: block });
      else prepared[index].content += "\n\n" + block;
    }
    return prepared;
  }

  function injectAllMemoryContext(messages, memoryContext) {
    return injectPreparedMemoryContext(restoreFullMemoryPlaceholder(messages), memoryContext);
  }

  async function beforeFullMemoryRequest(messages, hadPreparedProcessBatch) {
    try {
      if (isSummarizing) throw new Error("요약이 진행 중입니다. 요약 완료 후 대화를 다시 요청해 주세요.");
      await ensureChatContext(!hadPreparedProcessBatch);
      const context = summaryContext();
      if (!context.charId || !context.chatId) throw new Error("현재 채팅의 기억을 읽을 수 없습니다.");
      const prepared = restoreFullMemoryPlaceholder(messages);
      let user;
      for (let i = prepared.length - 1; i >= 0; i--) {
        if (prepared[i].role === "user" && prepared[i].content) {
          user = prepared[i];
          break;
        }
      }
      if (memoryModeChangePending || memoryInjectionMode !== "all" || isSummarizing) throw new Error("기억 주입 설정 또는 요약 상태가 바뀌었습니다. 대화를 다시 요청해 주세요.");
      if (user) await trackUserMessage(user.content);
      if (!isSummaryContextCurrent(context) || memoryModeChangePending || memoryInjectionMode !== "all" || isSummarizing) {
        throw new Error("기억을 준비하는 동안 채팅 또는 주입 설정이 바뀌었습니다. 대화를 다시 요청해 주세요.");
      }
      // No awaits between reading the committed nodes, formatting and returning.
      return injectPreparedMemoryContext(prepared, buildAllMemoryContext(context.state.chunks, eventFormat, factsFormat));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error("[HypaPlus] 전체 기억을 주입하지 못해 요청을 중단했습니다. " + reason);
    }
  }

  function updateMemoryModeControls(root = document) {
    const chosen = root.querySelector('input[name="hp-memory-injection-mode"]:checked');
    if (!chosen) return;
    const full = normalizeMemoryInjectionMode(chosen.value) === "all";
    root.querySelectorAll("[data-hp-selection-control]").forEach(control => { control.disabled = full; });
    root.querySelectorAll("[data-hp-selection-action]").forEach(control => {
      control.disabled = full || memoryInjectionMode === "all";
    });
    root.querySelectorAll("[data-hp-full-note]").forEach(note => { note.hidden = !full; });
    const description = root.querySelector("#hp-memory-mode-description");
    if (description) description.textContent = full
      ? "저장된 모든 기억을 등록 순서로 주입합니다. 새 기억은 뒤에 추가하며, 모델 입력 한도를 넘으면 요청이 실패할 수 있습니다."
      : "즐겨찾기·점수·토큰 한도에 따라 기억을 선택합니다. 임베딩 연결 없이도 선별 주입을 사용할 수 있습니다.";
  }

  function assertSelectiveMemoryToolsAvailable() {
    const chosen = document.querySelector('input[name="hp-memory-injection-mode"]:checked');
    if (memoryInjectionMode === "all" || chosen?.value === "all") {
      throw new Error("전체 기억 주입에서는 임베딩 검색을 사용하지 않습니다. 선별 주입을 선택하고 설정을 저장한 뒤 실행해 주세요.");
    }
  }


  // ── Initialization ───────────────────────────────────────────────────────

  await loadState();

  // Keep only unsummarized messages in the live context.
  // When no chunks exist, all messages pass through unchanged.
  // When chunks exist, only messages with chat_index > lastSummarizedMsgIndex are kept.
  // The first message (chat_index -1) is handled via msgIndex -1 in chunks.
  await registerHostScriptHandler("process", async (text) => {
    const now = Date.now();
    const idleExpired =
      processBatchPrepared && now - lastProcessCallAt >= PROCESS_BATCH_IDLE_RESET_MS;
    lastProcessCallAt = now;
    if (!processBatchPrepared || idleExpired) {
      processBatchPrepared = true;
      // A fresh process batch starts a new request; a retry must not mix modes.
      memoryModeChangePending = false;
      try {
        // Resolve IDs, clone the current chat once, build the index, and derive
        // the summarized boundary for every process call in this request.
        await ensureChatContext(true);
      } catch (error) {
        processBatchPrepared = false;
        throw error;
      }
    }
    const lastIdx = getLastSummarizedMsgIndex();
    // No chunks yet — keep everything
    if (lastIdx < 0) return text;
    // Chunks exist — filter out already-summarized messages
    const firstPendingIdx = lastIdx + 1;
    return `{{#if {{greater_equal::{{chat_index}}::${firstPendingIdx}}}}}\n${text}\n{{/if}}`;
  });

  // Register replacers for message tracking and memory injection
  await registerHostReplacer("beforeRequest", beforeRequestHandler);
  await registerHostReplacer("afterRequest", afterRequestHandler);
  console.log("[HypaPlus] Replacers registered — beforeRequest + afterRequest");
  console.log(
    "[HypaPlus] Init complete — chunks:",
    state.chunks.length,
    "| nodes:",
    getNodes().length,
    "| charId:",
    currentCharId || "(none)",
    "| chatId:",
    currentChatId || "(none)",
  );

  // Register settings UI
  await registerHostSetting(
    "HypaPlus 1.0.9.g-local.12",
    openSettings,
    "🗂️",
    "html",
    "hypaplus-settings",
  );

  // Register the optional quick action button to open the HypaPlus GUI
  await syncGuiButtonRegistration();
})();
