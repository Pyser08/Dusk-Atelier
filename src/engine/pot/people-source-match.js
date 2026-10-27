// 출처: risupot 2.3.0 src/people-source-match.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

export const peopleSourceNormalize=value=>String(value||'').normalize('NFC').toLocaleLowerCase().replace(/[^\p{L}\p{N}_]+/gu,' ').trim();
export function peopleSourceIndex(source){return{label:peopleSourceNormalize(source.label),keys:(source.keys||[]).map(peopleSourceNormalize).filter(Boolean),content:peopleSourceNormalize(source.content)};}
export function peopleSourceMatchRank(index,keywords){
  let best=0;for(const raw of keywords||[]){const word=peopleSourceNormalize(raw);if(!word)continue;
    if(index.label===word)best=Math.max(best,120);
    if(index.keys.includes(word))best=Math.max(best,110);
    const compact=word.replace(/\s+/g,'');if(compact.length>=2&&[index.label,...index.keys].some(name=>name.replace(/\s+/g,'')===compact))best=Math.max(best,105);
    if(index.label.includes(word)||index.keys.some(key=>key.includes(word)))best=Math.max(best,80);
    if(index.content.includes(word))best=Math.max(best,40);
  }return best;
}
export function peopleSourceKeywordMatches(source,keywords){return peopleSourceMatchRank(peopleSourceIndex(source),keywords)>0;}
export function peopleSourceKeys(entry){
  const values=[];for(const raw of [entry?.key,entry?.keys,entry?.keywords]){if(Array.isArray(raw))values.push(...raw);else if(typeof raw==='string')values.push(...raw.split(/[,\n]/));}
  return[...new Set(values.map(value=>String(value??'').normalize('NFC').trim().slice(0,120)).filter(Boolean))].slice(0,64);
}
