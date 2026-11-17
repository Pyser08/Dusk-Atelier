// addon-rebuild 4단계: Erosync 순수 조각 — 장면 판단 입력·미리 판단·대기·주입 위치. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { EMERGENCY_UNLIMITED_CAP_MS, INJECTION_START } from "./pure-config.js";
import { clampInt, clampNumber, fnv1a, isPlainObject, normalizeStringList, safeKeyPart, truncate } from "./pure-util.js";
import { chatMessageText, commitContentHash } from "./pure-session.js";
import { SEXUAL_RUNG_DIRECTOR, normalizeGoalType } from "./pure-profile.js";

export const DIRECTOR_MODE_WORDS = Object.freeze({ nsfw: 'sexual_humor | flirt | seduce | pursue_goal', sfw: 'humor | flirt | approach | pursue_goal' });

export const NSFW_PLUS_REFUSAL = 'a sexual act that overrides the target\'s refusal (force, threat, an incapacitated state, deception)';

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

export function deterministicRoll(turnKey, action) {
  return Number.parseInt(fnv1a(`${turnKey}:${action.actor}:${action.target}:${action.mode}`), 16) % 100;
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

export function lookaheadCacheKey(scope, baseCommitId, baseContentHash, epoch) {
  const variantKey = String(scope?.variantKey || 'default');
  const signature = commitContentHash(String(scope?.variantSignature || ''));
  const sourceHash = String(scope?.sourceHash || '');
  const moduleSelectionRevision = clampInt(scope?.moduleSelectionRevision, 0, 0, 1000000000);
  const planningSignature = String(scope?.planningSignature || '');
  return `${scope?.scopeKey || ''}:${variantKey}:${signature}:${sourceHash}:modules=${moduleSelectionRevision}:${planningSignature}:persona=${scope?.userIdentity?.signature || ''}:${String(baseCommitId || '')}:${String(baseContentHash || '')}:${clampInt(epoch, 0, 0, 100000000)}`;
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
