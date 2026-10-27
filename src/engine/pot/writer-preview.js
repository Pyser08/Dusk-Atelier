// 출처: risupot 2.3.0 src/writer-preview.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { metricDisplay } from './metric-engine.js';

const previewEqual=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
const previewValue=value=>Array.isArray(value)?value.join(' · '):value===undefined||value===null?'':typeof value==='object'?JSON.stringify(value):String(value);
const previewProfileFields={summary:'성격 요약',coreTraits:'핵심 기질',values:'가치관',emotionExpression:'감정 표현',defenseResponse:'방어 반응',intimacyStyle:'친밀감 방식',longTermPatterns:'장기 변화',sexualDesire:'성적 욕망',paraphilia:'이상성욕'};
const previewMetricNames={'affinity.score':'호감도','affinity.taste_band':'첫인상','suspicion.score':'의심도','openness.score':'음란도','perception.acuity':'지각 보정'};
const previewAxisNames={relationalInitiative:'관계 주도성',expressionDirectness:'표현 직접성',emotionalExpressiveness:'감정 표현성',guardedness:'경계 성향',impulsivity:'충동성',relationshipPersistence:'관계 지속성'};
export function buildWriterPreview(before,after,userName='사용자'){
  const people=[];
  for(const [id,document]of Object.entries(after.documents||{})){
    const old=before.documents?.[id],texts=[],metrics=[],personality=[],candidates=[],targetName=refs=>(refs||[]).map(ref=>ref==='actor:user'?userName:after.documents[ref]?.title||before.documents?.[ref]?.title||ref).join(' · ')||'인물 공통';
    for(const section of document.sections||[]){const prior=old?.sections?.find(item=>item.id===section.id);if(!prior||prior.body!==section.body)texts.push({label:section.heading||section.provenance?.slotId||'문서 항목',target:targetName(section.provenance?.targetRefs),before:prior?.body??null,after:section.body,operation:prior?'수정':'추가'});}
    for(const prior of old?.sections||[])if(!document.sections.some(section=>section.id===prior.id))texts.push({label:prior.heading,target:targetName(prior.provenance?.targetRefs),before:prior.body,after:null,operation:'삭제'});
    for(const key of ['aliases','tags'])if(!previewEqual(old?.[key]||[],document[key]||[]))texts.push({label:key==='aliases'?'별칭':'태그',target:'인물 공통',before:previewValue(old?.[key]),after:previewValue(document[key]),operation:old?'수정':'추가'});
    for(const metric of document.metrics||[]){const prior=old?.metrics?.find(item=>item.id===metric.id);if(previewEqual(prior,metric))continue;const display=metricDisplay(metric,after.documents,userName),previous=prior?metricDisplay(prior,before.documents,userName):null,delta=prior?Math.round((metric.value-prior.value)*1e12)/1e12:null;metrics.push({label:previewMetricNames[metric.slotId]||metric.slotId,target:display.target,before:prior?String(prior.value):'미지정',after:String(metric.value),beforeStage:previous?.stage||'',afterStage:display.stage||'',delta,reason:metric.reason||''});}
    const profile=after.people?.profiles?.[id],oldProfile=before.people?.profiles?.[id];
    if(profile){for(const [key,label]of Object.entries(previewProfileFields)){const current=['sexualDesire','paraphilia'].includes(key)?profile[key]?.text:profile[key],prior=['sexualDesire','paraphilia'].includes(key)?oldProfile?.[key]?.text:oldProfile?.[key];if(!previewEqual(current,prior)&&previewValue(current)!=='')personality.push({label,before:oldProfile?previewValue(prior):null,after:previewValue(current),operation:oldProfile?'수정':'초기 생성'});}for(const [key,label]of Object.entries(previewAxisNames))if(profile.axes?.[key]!==oldProfile?.axes?.[key])personality.push({label,before:oldProfile?String(oldProfile.axes?.[key]??'미지정'):null,after:String(profile.axes?.[key]??'미지정'),operation:oldProfile?'수정':'초기 생성'});}
    for(const candidate of Object.values(after.people?.candidates||{}))if(candidate.documentId===id&&!previewEqual(candidate,before.people?.candidates?.[candidate.id]))candidates.push({label:previewAxisNames[candidate.axis]||'장기 변화 후보',text:candidate.pattern||'',status:candidate.status});
    if(!old||texts.length||metrics.length||personality.length||candidates.length)people.push({documentId:id,name:document.title,type:document.type,created:!old,texts,metrics,personality,candidates});
  }
  return{people,changed:people.length>0};
}
