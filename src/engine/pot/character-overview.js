// 출처: risupot 2.3.0 src/character-overview.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { peopleItemPinned } from './people-pins.js';
import { isCharacterOverviewSection } from './relationship-mode.js';
import { namedCharacterMention } from './wiki-retrieval.js';
import { makeWikiId } from './wiki-schema.js';

export const OVERVIEW_UNKNOWN='미확인';
export function isUnknownOverview(section){
  const text=String(section?.body||'').trim();
  return !text||text===OVERVIEW_UNKNOWN||text.split(/\n/).filter(line=>line.trim()).every(line=>/^\s*(?:이름|별칭)\s*[:：]/.test(line));
}
export function overviewNeedsFill(document,scope=null){
  if(document?.type!=='Character')return false;
  const records=(document.sections||[]).filter(isCharacterOverviewSection);
  if(records.some(section=>!isUnknownOverview(section)))return false;
  return !records.some(section=>peopleItemPinned(scope,document.id,'section:'+section.id));
}
export function makeOverviewSection({text=OVERVIEW_UNKNOWN,evidenceRefs=[],requestRef='overview:unknown',existing=null}={}){
  return {id:existing?.id||makeWikiId('section'),heading:'인물 개요',body:String(text||'').trim()||OVERVIEW_UNKNOWN,provenance:{kind:'writer',entryRef:existing?.provenance?.entryRef||`entry:${makeWikiId('overview')}`,slotId:'core.identity',featureId:'core',mode:'core',targetRefs:[],contextKey:null,assertion:'fact',evidenceRefs,links:[],reason:text===OVERVIEW_UNKNOWN?'기본 프로필 근거가 아직 확인되지 않아 미확인으로 보관':'해당 인물의 제공 자료로 기본 프로필 작성',requestRef}};
}
export function ensureOverviewInSections(sections,{requestRef='overview:unknown',pinned=[]}={}){
  if(sections.some(section=>isCharacterOverviewSection(section)&&(String(section.body||'').trim()===OVERVIEW_UNKNOWN||!isUnknownOverview(section)||pinned.includes('section:'+section.id))))return sections;
  return [...sections,makeOverviewSection({requestRef})];
}
export function overviewSourceRefs(document,sources){
  const names=[document?.title,...(document?.aliases||[])].filter(Boolean);
  return Object.entries(sources||{}).filter(([,source])=>names.some(name=>namedCharacterMention([source.label,source.content].join('\n'),name))).sort(([,a],[,b])=>Number(b.kind==='lore')-Number(a.kind==='lore')).map(([ref])=>ref);
}
