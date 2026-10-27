// 출처: risupot 2.3.0 src/writer-targets.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { routerFixedDocuments, routerFixedKeywords, routerFixedName, routerFixedSettings } from './router-fixed.js';

const writerTargetKey=value=>String(value||'').normalize('NFC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
export function writerTargetKeywords(value){const values=Array.isArray(value)?value:String(value||'').split(/[,;\n]/);const words=[...new Set(values.map(value=>String(value).trim()).filter(Boolean))];if(words.length>16||words.some(word=>word.length>120||writerTargetKey(word).length<2))throw new Error('인물 키워드는 2~120자씩, 쉼표로 구분하여 최대 16개 입력해주세요.');return words;}
function targetNameMatches(name,words){const key=writerTargetKey(name);return key.length>=2&&words.some(word=>{const keyword=writerTargetKey(word);return keyword.length>=2&&key.includes(keyword);});}
export function manualWriterNameAllowed(title,filter){if(filter?.kind==='router-fixed'){const key=routerFixedName(title);return Boolean(key&&[...(filter.keywords||[]),...(filter.canonicalNames||[])].some(name=>routerFixedName(name)===key));}return !filter||targetNameMatches(title,filter.keywords)||filter.canonicalNames.some(name=>{const full=writerTargetKey(name),key=writerTargetKey(title);return key.length>=2&&(key===full||full.startsWith(key));});}
export function buildRouterWriterFilter(scope,settings){
  settings=typeof settings==='string'?settings:routerFixedSettings(settings,scope);
  const policy=routerFixedKeywords(settings);if(!policy.active)return null;
  const documents=routerFixedDocuments(scope,settings);
  return{kind:'router-fixed',keywords:[...policy.names],canonicalNames:[...new Set(documents.flatMap(document=>[document.title,...(Array.isArray(document.aliases)?document.aliases:[])]).filter(name=>typeof name==='string'&&routerFixedName(name)))],documentIds:documents.map(document=>document.id)};
}
export function buildManualWriterFilter(scope,keywords,seedSources={}){
  const words=writerTargetKeywords(keywords);if(!words.length)return null;
  const matched=Object.values(seedSources).filter(source=>{const metadata=[source.label,...String(source.content||'').split(/\r?\n/).slice(0,2).filter(line=>line.startsWith('[Keywords:'))].join('\n');return targetNameMatches(metadata,words);});
  const canonicalNames=[...new Set(matched.map(source=>String(source.label||'').replace(/\s*\([^)]*\)\s*$/,'').replace(/\s+character card$/i,'').trim()).filter(Boolean))].slice(0,8),filter={keywords:words,canonicalNames};
  const documentIds=Object.values(scope.documents||{}).filter(doc=>doc.type==='Character'&&([doc.title,...(doc.aliases||[])].some(name=>targetNameMatches(name,words))||[doc.title,...(doc.aliases||[])].some(name=>canonicalNames.some(label=>writerTargetKey(label).startsWith(writerTargetKey(name))&&writerTargetKey(name).length>=2)))).map(doc=>doc.id).slice(0,32);
  return{...filter,documentIds};
}
