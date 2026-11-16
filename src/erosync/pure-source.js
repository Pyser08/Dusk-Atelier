// addon-rebuild 4단계: Erosync 순수 조각 — 분석 자료(카드·로어북·모듈) 모으기·나누기. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.
import { asObjectArray, fnv1a, identityValues, isPlainObject, normalizeStringList, safeKeyPart, truncate } from "./pure-util.js";

export const SOURCE_INVENTORY_SCHEMA = 2;

export function loreContent(value) {
  if (!value || typeof value !== 'object') return '';
  for (const key of ['content', 'text', 'prompt', 'data', 'description']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }
  return '';
}

export function isLoreDisabled(value) {
  const mode = String(value?.mode || '').trim().toLowerCase();
  return !value || value.enabled === false || value.disabled === true || value.disable === true || value.isDisabled === true || mode === 'disabled' || mode === 'folder';
}

export function visitEnabledModuleReferences(target, value) {
  const add = (item) => {
    const text = String(item || '').trim();
    if (text) target.add(text);
  };
  if (typeof value === 'string') {
    value.split(',').forEach(add);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') visitEnabledModuleReferences(target, item);
      else if (item && typeof item === 'object') identityValues(item).forEach(add);
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (item === true || item === 'true' || item === 1) add(key);
      else if (item && typeof item === 'object' && item.enabled !== false && item.disabled !== true) {
        add(key);
        identityValues(item).forEach(add);
      }
    }
  }
}

export function normalizedModuleText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function moduleContentFingerprint(module) {
  const parts = [module?.description, module?.backgroundEmbedding, module?.prompt, module?.data?.description]
    .filter((value) => typeof value === 'string' && value.trim())
    .map(normalizedModuleText);
  for (const collection of moduleLoreCollections(module)) {
    for (const entry of asObjectArray(collection)) {
      if (isLoreDisabled(entry)) continue;
      const content = loreContent(entry);
      if (content) parts.push(`${entry.id || entry._id || entry.uid || ''}:${normalizedModuleText(content)}`);
    }
  }
  return fnv1a(parts.sort().join('|'));
}

export function activeModuleList(db, character, chat, persona) {
  const refs = new Set();
  visitEnabledModuleReferences(refs, db?.enabledModules);
  visitEnabledModuleReferences(refs, db?.moduleIntergration);
  visitEnabledModuleReferences(refs, db?.moduleIntegration);
  visitEnabledModuleReferences(refs, character?.modules);
  visitEnabledModuleReferences(refs, character?.data?.modules);
  visitEnabledModuleReferences(refs, chat?.modules);
  visitEnabledModuleReferences(refs, chat?.data?.modules);
  visitEnabledModuleReferences(refs, persona?.embeddedModule);
  visitEnabledModuleReferences(refs, persona?.embeddedModules);

  const candidates = [];
  const add = (module, embedded = false, ownerKind = 'database', ownerId = '') => {
    if (!module || typeof module !== 'object') return;
    if (module.enabled === false || module.disabled === true || module.disable === true) return;
    const identities = identityValues(module);
    const strongIdentity = [module.uuid, module.uid, module._id, module.id, module.namespace].map((value) => String(value || '').trim()).find(Boolean) || '';
    const identityKind = strongIdentity ? ['uuid', 'uid', '_id', 'id', 'namespace'].find((key) => String(module[key] || '').trim() === strongIdentity) : 'fallback';
    const contentFingerprint = moduleContentFingerprint(module);
    const legacyKey = strongIdentity || identities[0] || `embedded_${candidates.length + 1}`;
    const explicit = module.enabled === true || module.active === true || module.isEnabled === true;
    if (!embedded && refs.size > 0 && !identities.some((id) => refs.has(id))) return;
    if (!embedded && refs.size === 0 && !explicit) return;
    const ownerFingerprint = fnv1a(`${ownerKind}:${ownerId || ''}`);
    const stableBase = strongIdentity || `fallback_${ownerFingerprint}_${contentFingerprint}`;
    candidates.push({ module, key: legacyKey, legacyKey, stableBase, stableKey: stableBase, embedded, ownerKind, ownerId: String(ownerId || ''), identityKind, identityValue: strongIdentity, contentFingerprint, selectable: true, collision: false, name: String(module.name || module.displayName || module.id || module.namespace || legacyKey) });
  };
  for (const module of asObjectArray(db?.modules)) add(module, false, 'database', 'global');
  const personaId = String(persona?.id || persona?.uid || persona?.name || 'persona');
  const characterId = String(character?.chaId || character?.characterId || character?.id || character?.name || 'character');
  const chatId = String(chat?.id || chat?.chatId || chat?.name || 'chat');
  for (const module of [persona?.embeddedModule, ...(Array.isArray(persona?.embeddedModules) ? persona.embeddedModules : [])]) add(module, true, 'persona', personaId);
  for (const module of [...(Array.isArray(character?.modules) ? character.modules : []), ...(Array.isArray(character?.data?.modules) ? character.data.modules : [])]) if (module && typeof module === 'object') add(module, true, 'character', characterId);
  for (const module of [...(Array.isArray(chat?.modules) ? chat.modules : []), ...(Array.isArray(chat?.data?.modules) ? chat.data.modules : [])]) if (module && typeof module === 'object') add(module, true, 'chat', chatId);
  const byBase = new Map();
  const byLegacy = new Map();
  for (const descriptor of candidates) {
    const baseList = byBase.get(descriptor.stableBase) || [];
    baseList.push(descriptor);
    byBase.set(descriptor.stableBase, baseList);
    const legacyList = byLegacy.get(descriptor.legacyKey) || [];
    legacyList.push(descriptor);
    byLegacy.set(descriptor.legacyKey, legacyList);
  }
  for (const list of byBase.values()) {
    if (list.length <= 1) continue;
    for (const descriptor of list) {
      descriptor.collision = true;
      descriptor.stableKey = `${descriptor.stableBase}_c_${descriptor.contentFingerprint}`;
    }
    const byResolved = new Map();
    for (const descriptor of list) {
      const resolved = byResolved.get(descriptor.stableKey) || [];
      resolved.push(descriptor);
      byResolved.set(descriptor.stableKey, resolved);
    }
    for (const duplicate of byResolved.values()) if (duplicate.length > 1) for (const descriptor of duplicate) descriptor.selectable = false;
  }
  for (const list of byLegacy.values()) {
    if (list.length <= 1) continue;
    for (const descriptor of list) {
      descriptor.collision = true;
      descriptor.key = `${descriptor.legacyKey}_${descriptor.contentFingerprint}`;
    }
  }
  return candidates;
}

export function resolveModuleAnalysisSelection(descriptors, analysisModules) {
  const excludedKeys = new Set(normalizeStringList(analysisModules?.excludedKeys, 1000, 240));
  const metadata = isPlainObject(analysisModules?.keyMetadata) ? analysisModules.keyMetadata : {};
  const included = [];
  const excluded = [];
  const unresolvedExclusions = new Set(excludedKeys);
  const warnings = [];
  for (const descriptor of descriptors) {
    const directMatch = excludedKeys.has(descriptor.stableKey) || excludedKeys.has(descriptor.key);
    let shouldExclude = directMatch;
    const stored = metadata[descriptor.stableKey] || metadata[descriptor.key];
    if (shouldExclude && descriptor.identityKind === 'fallback' && stored?.contentFingerprint && stored.contentFingerprint !== descriptor.contentFingerprint) shouldExclude = false;
    if (shouldExclude && (!descriptor.selectable || descriptor.collision)) {
      shouldExclude = false;
      warnings.push(`${descriptor.name} 모듈은 식별 키 충돌(collision)로 분석 제외를 적용하지 않고 포함했습니다.`);
    }
    if (descriptor.collision) warnings.push(`${descriptor.name} 모듈 식별 키 충돌(collision)이 감지되었습니다.`);
    if (shouldExclude) {
      excluded.push(descriptor);
      unresolvedExclusions.delete(descriptor.stableKey);
      unresolvedExclusions.delete(descriptor.key);
    } else included.push(descriptor);
  }
  return { included, excluded, unresolvedExclusions: [...unresolvedExclusions].sort(), warnings };
}

export function moduleLoreCollections(module) {
  return [
    module?.lore, module?.lorebook, module?.loreBook, module?.lorebooks, module?.entries,
    module?.data?.lore, module?.data?.lorebook, module?.data?.loreBook, module?.data?.lorebooks,
    module?.data?.characterBook?.entries, module?.data?.character_book?.entries,
    module?.extensions?.characterBook?.entries, module?.extensions?.character_book?.entries,
  ];
}

export function sourceDocumentLabel(entry, fallback) {
  return truncate(entry?.name || entry?.title || entry?.comment || entry?.key || (Array.isArray(entry?.keys) ? entry.keys.join(', ') : '') || fallback, 220);
}

export function isAssetMaidInternalLore(entry, content = undefined) {
  if (!isPlainObject(entry)) return false;
  const refs = Array.isArray(entry.sourceRefs) ? entry.sourceRefs : [];
  const ids = [entry.id, entry.originId, ...refs.map(ref => ref?.originId)].map(value => String(value || '').trim());
  const labels = [entry.comment, entry.label, entry.name, entry.title, ...refs.map(ref => ref?.label)].map(value => String(value || '').trim());
  const signatures = [
    ['asset-maid:data', '__ASSET_MAID_DATA__'],
    ['asset-maid:chat-data', '__ASSET_MAID_CHAT_DATA__'],
    ['asset-maid:current-actor-state', '__ASSET_MAID_CURRENT_ACTOR_STATE__'],
  ];
  if (labels.includes('__ASSET_MAID_BACKUP__') && ids.some(id => id.startsWith('asset-maid:quarantine:') || id.includes('_asset-maid_quarantine_'))) return true;
  const signature = signatures.find(([, label]) => labels.includes(label));
  if (!signature) return false;
  const knownId = ids.some(id => id === signature[0] || id === safeKeyPart(signature[0]) || id.endsWith(`_${safeKeyPart(signature[0])}`));
  const text = typeof content === 'string' ? content : typeof entry.content === 'string' ? entry.content : typeof entry.text === 'string' ? entry.text : null;
  // Stored source metadata has no body; current lore must also carry the
  // plugin's non-activating object envelope. Never blanket-filter the flag.
  return text === null ? knownId : /(?:^|\n)(?:(?:content|text|prompt|data):\s*)?@@dont_activate\s*\{/u.test(text.trim());
}

export function addRosterSourceEntry(target, seen, value) {
  const prepared = value?.prepared;
  if (!prepared?.rawContent?.trim()) return;
  const hash = fnv1a(prepared.rawContent);
  const sourceRef = {
    kind: String(value.kind || 'unknown'),
    label: truncate(value.label || '', 240),
    originId: truncate(value.originId || '', 240),
    moduleName: truncate(value.moduleName || '', 200),
  };
  const existingIndex = seen.get(hash);
  if (Number.isInteger(existingIndex)) {
    const existing = target[existingIndex];
    existing.sourceKinds = normalizeStringList([...(existing.sourceKinds || []), sourceRef.kind], 24, 120);
    existing.sourceRefs = [...(existing.sourceRefs || []), sourceRef]
      .filter((item, index, list) => list.findIndex((other) => other.kind === item.kind && other.originId === item.originId && other.moduleName === item.moduleName) === index)
      .slice(0, 80);
    return;
  }
  const entry = value.entry || {};
  const id = safeKeyPart(`${value.kind}_${value.originId || value.label || target.length + 1}`, `${value.kind}_${hash}`);
  seen.set(hash, target.length);
  target.push({
    id,
    comment: String(entry.comment || ''),
    name: String(entry.name || entry.title || ''),
    key: String(entry.key || (Array.isArray(entry.keys) ? entry.keys.join(', ') : '')),
    rawContent: prepared.rawContent,
    content: prepared.content,
    profileContent: prepared.profileContent,
    hash,
    originId: String(value.originId || ''),
    sourceKinds: [sourceRef.kind],
    sourceRefs: [sourceRef],
    conditionalDiagnostics: prepared.diagnostics,
  });
}

export function analysisSourceText(text) {
  return String(text || '').replace(/^\[Lore Entry \d+\]\s*/u, '').replace(/\r\n?/g, '\n').trim();
}

export function analysisSourceRelevant(document) {
  if (isAssetMaidInternalLore(document)) return false;
  if (document?.analysisRelevant === false) return false;
  if (document?.kind === 'character_card') return true;
  const title = String(document?.label || '');
  // Only explicit technical guides are omitted. Unknown material remains relevant.
  return !/(?:이미지|image|asset|에셋).*(?:커맨드|command|가이드|guide|매핑|mapping)|(?:주사위|dice).*(?:판정|모듈|module|roll)|(?:^|\s)(?:CSS|HTML|UI)\s*(?:스타일|style|template|템플릿)/iu.test(title);
}

export function analysisSourceRows(documents) {
  return (documents || []).filter(analysisSourceRelevant).map(document => ({ ...document,
    semanticHash: document.semanticHash || (typeof document.text === 'string' ? fnv1a(analysisSourceText(document.text)) : ''),
    semanticLabel: document.kind === 'character_card' ? '@character_card' : String(document.label || '').normalize('NFKC').trim().toLowerCase(),
  }));
}

export function analysisFamilySignature(documents, modules = []) {
  const families = new Set(['host']);
  for (const doc of analysisSourceRows(documents)) {
    if (!String(doc.kind).startsWith('module')) continue;
    const module = modules.find(item => item.key && String(doc.id || '').includes(item.key));
    const name = doc.moduleName || doc.sourceRefs?.find(ref => ref.moduleName)?.moduleName || module?.name;
    if (name) families.add(`module:${String(name).normalize('NFKC').trim().toLowerCase()}`);
  }
  return [...families].sort().join('|');
}

export function sameAnalysisDocument(saved, current) {
  if (saved.semanticLabel !== current.semanticLabel) return false;
  if (saved.semanticHash && current.semanticHash) return saved.semanticHash === current.semanticHash;
  if (saved.hash && saved.hash === current.hash) return true;
  // Older inventories retained the transport header hash, not a content-only hash.
  // Recreate only a known numeric header; never guess an unknown previous body.
  const ordinal = /_(\d+)$/.exec(String(saved.id || saved.originId || ''));
  if (ordinal && typeof current.text === 'string' && /^\[Lore Entry \d+\]/u.test(current.text)) {
    const index = Number(ordinal[1]) + (saved.kind === 'module_lore' ? 1 : 0);
    return fnv1a(current.text.replace(/^\[Lore Entry \d+\]/u, `[Lore Entry ${index}]`).trim()) === saved.hash;
  }
  return false;
}

export function splitSourceDocuments(documents, maxChars) {
  const batches = [];
  let current = [];
  let currentChars = 0;
  const limit = Math.max(3000, maxChars || 12000);
  const flush = () => {
    if (current.length > 0) batches.push(current);
    current = [];
    currentChars = 0;
  };
  for (const document of Array.isArray(documents) ? documents : []) {
    const header = `[SOURCE ${document.id} | ${document.kind} | ${document.label}${document.moduleName ? ` | MODULE ${document.moduleName}` : ''}]\n`;
    const raw = String(document.text || '');
    let offset = 0;
    while (offset < raw.length) {
      const remaining = Math.max(1000, limit - header.length);
      const part = raw.slice(offset, offset + remaining);
      const entry = { ...document, text: `${header}${part}`, part: Math.floor(offset / remaining) + 1 };
      if (current.length > 0 && currentChars + entry.text.length > limit) flush();
      current.push(entry);
      currentChars += entry.text.length;
      offset += part.length;
      if (currentChars >= limit) flush();
    }
  }
  flush();
  return batches;
}
