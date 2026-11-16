// addon-rebuild 4단계: Erosync 순수 조각 — 선택 로어북·명단 인물. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { fnv1a, isPlainObject } from "./pure-util.js";
import { normalizeBaseRelation } from "./pure-profile.js";
import { relationKey } from "./pure-relation.js";

export function selectedLoreTitleKey(value) {
  return String(value || '').normalize('NFKC').trim().toLowerCase();
}

// Saved form of a resolved row. The slot id always follows the current source; the fingerprint advances
// only once a profile has been analysed from the new content, so an edit stays linked to that profile.
export function selectedLoreSavedEntry(row, settled) {
  const solo = row.solo === true ? { solo: true } : {};
  return row.available ? { id: row.id, title: row.title, hash: settled ? row.hash : row.savedHash, ...solo }
    : { id: row.savedId, title: row.savedTitle || row.title, hash: row.savedHash, ...solo };
}

export function selectedLoreProfileView(profile, variantKey = 'default') {
  if (!isPlainObject(profile)) return null;
  const variant = profile.variants?.[variantKey];
  if (!isPlainObject(variant)) return variantKey === 'default' && !Object.keys(profile.variants || {}).length ? profile : null;
  // Selection/status lists need metadata only, not a normalized copy of every personality field.
  return { ...profile, selectedLore: variant.selectedLore || null, roster: variant.roster || null,
    sourceDocumentIds: variant.sourceDocumentIds || [], sourceHash: variant.sourceHash || '',
    analysisStatus: variant.analysisStatus || profile.analysisStatus, locked: variant.locked === true, lockOrigin: variant.lockOrigin || '' };
}

export function selectedLoreOwnerScore(profile) {
  return (profile.isMain ? 100000 : 0) + (profile.locked ? 10000 : 0) + (Object.keys(profile.userOverrides || {}).length ? 1000 : 0)
    + (profile.entityVerdict?.status === 'verified_person' ? 100 : 0) + Number(profile.profileConfidence?.overall || profile.confidence || 0);
}

// The activation keys of a source as one comparable value: order, letter case and spacing do not matter.
export function selectedLoreKeySignature(entry) {
  return [...new Set(String(entry?.key || '').split(',').map(key => key.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))].sort().join('\n');
}

// A person is complete once one ready profile has been analysed from every source of the group.
export function selectedLoreUnitComplete(unit, owners) {
  return !!unit.profile && ['ready', 'low_evidence'].includes(unit.profile.analysisStatus)
    && unit.rows.every(row => row.available && owners.get(row).exact && owners.get(row).profile?.id === unit.profile.id);
}

export function selectedLoreProfileIsReady(profile, variantKey, entries) {
  const current = selectedLoreProfileView(profile, variantKey);
  return !!current && ['ready', 'low_evidence'].includes(current.analysisStatus) && entries.length > 0
    && entries.every(entry => !!entry.hash && (current.selectedLore?.entries || []).some(saved => saved.hash === entry.hash));
}

export function selectedLoreCountsText(progress) {
  return `선택 로어북 ${progress.lore}개(인물 ${progress.total - progress.unavailable}명) · 완료 ${progress.complete}명 · 미완료 ${progress.pending}명 · 저장 인물 ${progress.profileCount}명`;
}

export function resolveSelectedLoreRelations(run, candidates, idMap, store, scope, inventory, variantKey) {
  const resolve = ref => {
    const matches = candidates.filter(candidate => (ref.entryIds || []).some(id => candidate.sourceDocumentIds.includes(id)));
    if (matches.length === 1) return matches[0].id;
    // A target id of an earlier run is not a name: it may spell the id of a profile that stood for other lore then.
    return /^selected_lore_/.test(ref.name) && !candidates.some(candidate => candidate.id === ref.name) ? '' : ref.name;
  };
  const allowedSources = new Set(candidates.flatMap(candidate => candidate.sourceDocumentIds));
  const ready = new Set(candidates.filter(candidate => selectedLoreProfileIsReady(store.profiles[idMap.get(candidate.id)], variantKey, candidate.selectedLore.entries)).map(candidate => idMap.get(candidate.id)));
  const relations = {};
  for (const draft of run.relationDrafts) {
    const relation = normalizeBaseRelation({ ...draft.value, from: resolve(draft.fromRef), to: resolve(draft.toRef) }, idMap, store, inventory.sourceHash, scope.sourceBundleKey, variantKey, allowedSources);
    if (!relation || relation.from !== 'user' && !ready.has(relation.from) || relation.to !== 'user' && !ready.has(relation.to)) continue;
    const key = `${variantKey}::${relationKey(relation.from, relation.to)}`;
    if (!relations[key] || relation.confidence >= relations[key].confidence) relations[key] = relation;
  }
  return relations;
}

// The source text of one analysis target for a prompt. A target with several sources keeps a block per
// source (sourceParts are the block lengths), and each block is cut to `share` characters.
export function candidateSourceExcerpt(candidate, share) {
  if (!Array.isArray(candidate.sourceParts)) return candidate.sourceText.slice(0, share);
  let start = 0;
  return candidate.sourceParts.map(length => { const block = candidate.sourceText.slice(start, start + Math.min(length, share)); start += length + 2; return block; }).join('\n\n');
}

export function resolveSelectedRosterEntry(selected, entries) {
  const rows = Array.isArray(entries) ? entries : [];
  const byHash = selected.hash ? rows.filter(entry => entry.hash === selected.hash) : [];
  if (byHash.length === 1) return byHash[0];
  const title = String(selected.title || '').normalize('NFKC').trim().toLowerCase();
  const byTitle = title ? rows.filter(entry => String(entry.comment || entry.name || entry.id || '').normalize('NFKC').trim().toLowerCase() === title) : [];
  if (byTitle.length === 1) return byTitle[0];
  return !title && !selected.hash ? rows.find(entry => entry.id === selected.id) || null : null;
}

export function rosterPersonInput(person, inventory) {
  const linked = (inventory?.rosterEntries || []).find(entry => entry.id === person.matchedLoreId);
  const linkedContent = String(linked?.profileContent ?? linked?.content ?? '');
  const sourceText = `[SOURCE ${person.rosterEntryId} | ROSTER MEMBER ${person.name}]\n${person.sourceBlock}`
    + (linkedContent ? `\n\n[SOURCE ${linked.id} | ${linked.comment || linked.name || person.name}]\n${linkedContent}` : '');
  return { sourceText, sourceHash: fnv1a(JSON.stringify([person.sourceBlock, person.matchedLoreId, linkedContent])),
    sourceBlock: person.sourceBlock, linkedContent, linked };
}

export function rosterInputMatchesStored(profile, input) {
  if (!input || !profile?.roster?.sourceHash) return false;
  if (profile.roster.sourceHash === input.sourceHash) return true;
  const oldLinkedId = String(profile.roster.matchedLoreId || '');
  return profile.roster.sourceHash === fnv1a(JSON.stringify([input.sourceBlock, oldLinkedId, input.linkedContent]));
}
