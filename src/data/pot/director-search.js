// 출처: risupot 2.3.0 src/director-search.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { projectCbsLoreEntries } from '../../engine/pot/cbs-source.js';
import { messageText } from './chat-source.js';
import { sortRelatedWikiDocuments } from '../../engine/pot/event-chronology.js';
import { npcEmotionReference } from '../../engine/pot/npc-emotion.js';
import { npcRelationshipAllowed } from '../../engine/pot/npc-relationship.js';
import { perceptionModeFor, relationshipDocumentType, relationshipVisibleMetric, relationshipVisibleSection } from '../../engine/pot/relationship-mode.js';
import { assertSafeWikiData } from '../../engine/pot/wiki-schema.js';

const DIRECTOR_SEARCH_LIMITS = Object.freeze({
  queries: 8,
  resultsPerQuery: 5,
  queryChars: 600,
  reasonChars: 500,
  excerptChars: 1600,
  wikiDocumentChars: 20000,
  wikiCorpusChars: 3000000,
  loreEntries: 500,
  loreCorpusChars: 1000000,
});

const directorSearchPeopleProfile=profile=>profile?{summary:profile.summary||'',core_traits:profile.coreTraits||[],values:profile.values||[],emotion_expression:profile.emotionExpression||'',defense_response:profile.defenseResponse||'',intimacy_style:profile.intimacyStyle||'',axes:profile.axes||{},long_term_patterns:profile.longTermPatterns||[]}:null;

const directorSearchRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const directorSearchExact = (value, keys) => directorSearchRecord(value) && keys.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => keys.includes(key));
const directorSearchNormalize = value => String(value || '').normalize('NFC').toLocaleLowerCase().replace(/[^\p{L}\p{N}_]+/gu, ' ').trim();
const directorSearchRole = value => String(value || 'unknown').toLocaleLowerCase().slice(0, 32);
const directorSearchTruncate = (value, maximum) => String(value || '').slice(0, maximum);
const directorSearchMessages = chat => Array.isArray(chat?.message) ? chat.message : Array.isArray(chat?.messages) ? chat.messages : [];

function directorSearchFnv(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function directorSearchValidate(search) {
  if (!directorSearchExact(search, ['tool', 'query', 'reason'])) throw new Error('Director search item has unknown or missing fields.');
  if (!['chat_search', 'wiki_search', 'lore_seed_search'].includes(search.tool)) throw new Error('Director search tool is not supported.');
  const query = String(search.query || '').normalize('NFC').trim(), reason = String(search.reason || '').normalize('NFC').trim();
  if (!query || query.length > DIRECTOR_SEARCH_LIMITS.queryChars) throw new Error('Director search query is invalid.');
  if (!reason || reason.length > DIRECTOR_SEARCH_LIMITS.reasonChars) throw new Error('Director search reason is invalid.');
  return { tool: search.tool, query, reason };
}

function directorSearchScore(text, query) {
  const source = directorSearchNormalize(text), needle = directorSearchNormalize(query);
  if (!source || !needle) return 0;
  if (source === needle) return 500;
  let score = source.includes(needle) ? 220 : 0;
  const tokens = [...new Set(needle.split(/\s+/).filter(Boolean))];
  let matched = 0;
  for (const token of tokens) if (source.includes(token)) { score += token.length > 1 ? 30 : 8; matched++; }
  if (tokens.length && matched === tokens.length) score += 80;
  return score;
}

function directorSearchChatCorpus(chat) {
  return directorSearchMessages(chat).map((message, index) => ({
    ref: `source:chat_${index}`,
    message_index: index,
    role: directorSearchRole(message?.role),
    text: messageText(message),
  })).filter(item => item.text.trim());
}

function buildDirectorWikiCorpus(scope, preferredDocuments = [], features = {},peopleProfiles={},npcRelationshipEnabled=true,relationshipOnly=false) {
  const perceptionMode=perceptionModeFor({features}),documents = Object.values(scope?.documents || {}).filter(document=>!relationshipOnly||relationshipDocumentType(document.type)), preferredIds = new Set(preferredDocuments.filter(document=>!relationshipOnly||relationshipDocumentType(document?.type)).map(document => document?.id).filter(Boolean));
  const ordered = [...preferredDocuments.filter(document => document?.id&&(!relationshipOnly||relationshipDocumentType(document.type))), ...documents.filter(document => !preferredIds.has(document.id)).sort((a, b) => String(a.id).localeCompare(String(b.id)))];
  const seen = new Set(), catalog = {}, refById = {}, corpus = [];
  let preferredIndex = 0, otherIndex = 0, usedChars = 0;
  for (const document of ordered) {
    if (!document || seen.has(document.id)) continue;
    seen.add(document.id);
    const preferred = preferredIds.has(document.id), ref = preferred ? `doc:d${++preferredIndex}` : `doc:w${++otherIndex}`;
    const title = directorSearchTruncate(document.title, 120), aliases = (document.aliases || []).slice(0, 64).map(value => directorSearchTruncate(value, 80)), tags = (document.tags || []).slice(0, 64).map(value => directorSearchTruncate(value, 80));
    const header = [document.type, title, ...aliases, ...tags].join('\n'), remaining = Math.max(0, DIRECTOR_SEARCH_LIMITS.wikiCorpusChars - usedChars - header.length);
    const bodyLimit = Math.min(DIRECTOR_SEARCH_LIMITS.wikiDocumentChars, remaining), sections = [];
    let bodyUsed = 0;
    for (const section of (document.sections || []).filter(section=>relationshipVisibleSection(section,relationshipOnly,perceptionMode)&&npcRelationshipAllowed(section.provenance?.slotId,section.provenance?.targetRefs||[],npcRelationshipEnabled))) {
      if (bodyUsed >= bodyLimit) break;
      const heading = directorSearchTruncate(section.heading, 120), body = directorSearchTruncate(section.body, Math.max(0, bodyLimit - bodyUsed));
      bodyUsed += heading.length + body.length; sections.push({ ...npcEmotionReference(section,scope?.documents||{}),heading,body });
    }
    const metricState=(document.metrics||[]).filter(metric=>{const feature=features[metric.slotId.split('.')[0]];return relationshipVisibleMetric(metric,relationshipOnly,perceptionMode)&&feature?.enabled&&(!Object.hasOwn(feature,'numbers')||feature.numbers===true)&&npcRelationshipAllowed(metric.slotId,metric.targetRefs,npcRelationshipEnabled)}).map(metric=>({slot_id:metric.slotId,target_refs:metric.targetRefs,context_key:metric.contextKey,value:metric.value,minimum:metric.minimum,maximum:metric.maximum,stage:metric.stageLabel,status:metric.status,last_delta:metric.lastDelta})),searchText = [header, ...sections.flatMap(section => [section.heading, section.body]),...metricState.map(metric=>JSON.stringify(metric))].join('\n');
    usedChars += searchText.length;
    const item = { ref, id: document.id, type: document.type, title, aliases, tags, sections, searchText };
    corpus.push(item); refById[document.id] = ref; catalog[ref] = { type: document.type, title, aliases, tags, links: document.links || [], sections,metric_state:metricState,...(peopleProfiles[document.id]?{people_profile:directorSearchPeopleProfile(peopleProfiles[document.id])}:{}) };
    if (usedChars >= DIRECTOR_SEARCH_LIMITS.wikiCorpusChars) break;
  }
  for(const document of Object.values(catalog))for(const section of document.sections)if(section.target_refs)section.target_refs=section.target_refs.map(ref=>refById[ref]||ref);
  return { catalog, refById, corpus, truncated: seen.size < documents.length };
}

function directorSearchChatMatches(corpus, query, maximum) {
  return corpus.map(item => ({ item, score: directorSearchScore(item.text, query) })).filter(value => value.score > 0)
    .sort((a, b) => b.score - a.score || b.item.message_index - a.item.message_index)
    .slice(0, maximum).map(({ item }) => ({ ...item, text: directorSearchTruncate(item.text, DIRECTOR_SEARCH_LIMITS.excerptChars) }));
}

function directorSearchWikiMatches(corpus, query, maximum) {
  const matched=corpus.map(item => ({ item, score: directorSearchScore(item.searchText, query) })).filter(value => value.score > 0)
    .sort((a, b) => b.score - a.score || String(a.item.id).localeCompare(String(b.item.id)))
    .slice(0, maximum).map(({ item }) => ({ ref: item.ref, type: item.type, title: item.title, aliases: item.aliases, tags: item.tags, sections: item.sections }));return sortRelatedWikiDocuments(matched);
}

function directorLoreDisabled(entry){return!entry||entry.enabled===false||entry.disabled===true||entry.disable===true||entry.isDisabled===true||entry.mode==='disabled'||entry.mode==='folder'||entry.type==='folder'||entry.isFolder===true;}
function directorLoreText(entry){for(const key of ['content','prompt','text','entry'])if(typeof entry?.[key]==='string'&&entry[key].trim())return entry[key].trim();return'';}
function directorLoreValues(entry){const values=[];for(const raw of [entry?.name,entry?.comment,entry?.displayName,entry?.key,entry?.keys,entry?.keywords]){if(Array.isArray(raw))values.push(...raw);else if(typeof raw==='string')values.push(...raw.split(/[,\n]/));}return[...new Set(values.map(value=>String(value).normalize('NFC').trim()).filter(Boolean))].slice(0,64);}
function buildDirectorLoreCorpus(entries,cbsContext={}){if(!Array.isArray(entries))return[];entries=projectCbsLoreEntries(entries,cbsContext).entries;const result=[];let used=0;for(let index=0;index<Math.min(entries.length,DIRECTOR_SEARCH_LIMITS.loreEntries);index++){const entry=entries[index];if(directorLoreDisabled(entry))continue;const content=directorLoreText(entry);if(!content)continue;const keys=directorLoreValues(entry),label=String(entry.comment??entry.name??entry.displayName??`Lore ${index+1}`).normalize('NFC').trim().slice(0,160),searchText=[label,...keys,content].join('\n');if(used+searchText.length>DIRECTOR_SEARCH_LIMITS.loreCorpusChars)break;used+=searchText.length;result.push({index,label,keys,content,searchText});}return result;}
function directorSearchLoreSeedMatches(corpus,query,maximum){return corpus.map(item=>({item,score:directorSearchScore(item.searchText,query)})).filter(value=>value.score>0).sort((a,b)=>b.score-a.score||a.item.index-b.item.index).slice(0,maximum).map(({item})=>({ref:`source:lore_seed_${item.index}`,label:item.label,keys:item.keys,text:directorSearchTruncate(item.content,DIRECTOR_SEARCH_LIMITS.excerptChars)}));}
function directorWikiHasQuery(wiki,query){const needle=directorSearchNormalize(query);return Boolean(needle&&wiki.corpus.some(item=>[item.title,...item.aliases].map(directorSearchNormalize).some(name=>name===needle)));}

export function createDirectorSearchSnapshot({ characterIndex, chatIndex, chat, scope }) {
  const messages = directorSearchMessages(chat), messageDigest = messages.map((message, index) => `${index}\u0000${message?.chatId || message?.id || ''}\u0000${directorSearchRole(message?.role)}\u0000${messageText(message)}`).join('\u0001');
  return {
    characterIndex: Number(characterIndex), chatIndex: Number(chatIndex),
    chatKey: String(chat?.risupotWikiScopeId || chat?.id || scope?.scope?.chatKey || ''),
    wikiRevision: Number(scope?.revision ?? -1), messageCount: messages.length, messageHash: directorSearchFnv(messageDigest),
  };
}

export function directorSearchSnapshotMatches(expected, current) {
  if (!expected || !current) return false;
  return expected.characterIndex === current.characterIndex && expected.chatIndex === current.chatIndex && expected.chatKey === current.chatKey && expected.wikiRevision === current.wikiRevision && expected.messageCount === current.messageCount && expected.messageHash === current.messageHash;
}

export function executeDirectorSearchBatch({ searches, chat, scope, preferredDocuments = [],features={},peopleProfiles={},npcRelationshipEnabled=true,relationshipOnly=false,loreEntries=null,cbsContext={}, resultsPerQuery = DIRECTOR_SEARCH_LIMITS.resultsPerQuery }) {
  assertSafeWikiData(searches);
  if (!Array.isArray(searches) || searches.length < 1 || searches.length > DIRECTOR_SEARCH_LIMITS.queries) throw new Error('Director search batch must contain 1 to 8 searches.');
  const normalized = searches.map(directorSearchValidate), identities = normalized.map(search => `${search.tool}\n${directorSearchNormalize(search.query)}`);
  if (new Set(identities).size !== identities.length) throw new Error('Director search batch contains a duplicate tool and query.');
  const maximum = Math.max(1, Math.min(DIRECTOR_SEARCH_LIMITS.resultsPerQuery, Number(resultsPerQuery) || DIRECTOR_SEARCH_LIMITS.resultsPerQuery));
  const chatItems = directorSearchChatCorpus(chat), wiki = buildDirectorWikiCorpus(scope, preferredDocuments,features,peopleProfiles,npcRelationshipEnabled,relationshipOnly),lore=buildDirectorLoreCorpus(loreEntries,cbsContext), sourceCatalog = {}, results = [];
  for (const search of normalized) {
    let matches, status = 'ok', note = '';
    if (search.tool === 'chat_search') {
      matches = directorSearchChatMatches(chatItems, search.query, maximum);
      for (const match of matches) sourceCatalog[match.ref] = { kind: 'chat_search_result', message_index: match.message_index, role: match.role, text: match.text };
    } else if (search.tool === 'wiki_search') {
      matches = directorSearchWikiMatches(wiki.corpus, search.query, maximum);
      for (const match of matches) sourceCatalog[match.ref] = { kind: 'wiki_search_result', type: match.type, title: match.title, aliases: match.aliases, tags: match.tags, sections: match.sections };
      if (wiki.truncated) note = 'Wiki corpus reached its safe character cap; later documents were not searched.';
    } else if(directorWikiHasQuery(wiki,search.query)){
      matches=[];status='blocked_existing_wiki';note='lore_seed_search is allowed only when the entity is absent from Wiki. Use the existing Wiki document.';
    } else if(!Array.isArray(loreEntries)){
      matches=[];status='unsupported';note='lore_seed_search is unavailable because the host did not provide current Lore entries.';
    } else {
      matches=directorSearchLoreSeedMatches(lore,search.query,maximum);for(const match of matches)sourceCatalog[match.ref]={kind:'lore_seed_reference',label:match.label,keys:match.keys,text:match.text,canonical:false};note='Lore seed results are latent reference settings. They become canonical only after the entity appears and completed RP confirms them.';
    }
    results.push({ tool: search.tool, query: search.query, reason: search.reason, status, note, matches });
  }
  return { schema_version: 1, results, source_catalog: sourceCatalog, allowed_refs: new Set(Object.keys(sourceCatalog)), wiki_catalog: wiki.catalog, caps: { queries: DIRECTOR_SEARCH_LIMITS.queries, results_per_query: maximum, excerpt_chars: DIRECTOR_SEARCH_LIMITS.excerptChars } };
}
