// addon-rebuild 4단계: Erosync 순수 조각 — 관계·상호작용 장부·이름 맞추기. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { clampInt, clampNumber, isPlainObject, normalizeStringList, safeClone, truncate } from "./pure-util.js";
import { durableValueHash } from "./pure-session.js";
import { RELATION_CHANGE_FIELDS } from "./pure-config.js";

export const PAIR_CONTACT_SUMMARY = 200;

// 자르기 사다리에서 짝 줄의 요약만 줄이거나(①) 뺀다(⑤). 턴·횟수는 남는다.
export function trimPairContact(rows, summaryChars) {
  return (Array.isArray(rows) ? rows : []).map(row => {
    if (!isPlainObject(row?.lastActual)) return row;
    const { summary, ...rest } = row.lastActual;
    return { ...row, lastActual: summaryChars > 0 && summary ? { ...rest, summary: truncate(summary, summaryChars) } : rest };
  });
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
