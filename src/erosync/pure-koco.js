// addon-rebuild 4단계: Erosync 순수 조각 — undefined. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { isPlainObject, safeClone, truncate } from "./pure-util.js";

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
