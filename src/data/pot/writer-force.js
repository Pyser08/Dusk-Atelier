// 출처: risupot 2.3.0 src/writer-force.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { effectiveRelationshipSettings } from '../../engine/pot/relationship-mode.js';
import { WRITER_MANUAL_IMPORT, WRITER_MANUAL_SOURCE, writerManualReason } from '../../engine/pot/writer-import-mode.js';
import { preparePartialWriterProposal } from '../../engine/pot/writer-partial.js';
import { assembleWriterPrompt } from '../../engine/pot/writer-prompt.js';
import { readWriterProposalInput } from '../../engine/pot/writer-proposal.js';

const forceRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function markManualSource(value,maximumRefs=32){
  if(Array.isArray(value))return value.map(item=>markManualSource(item,maximumRefs));
  if(!forceRecord(value))return value;
  const marked={};
  for(const[key,item]of Object.entries(value)){
    // Keep malformed values for the ordinary structural validator to reject.
    if(key==='evidence_refs'&&Array.isArray(item)&&item.length>0&&item.length<=maximumRefs&&item.every(ref=>typeof ref==='string'&&ref.length>0&&ref.length<=160))marked[key]=[WRITER_MANUAL_SOURCE];
    else if(key==='reason'&&typeof item==='string'&&item.trim()&&item.length<=800)marked[key]=writerManualReason(item);
    else marked[key]=markManualSource(item,key==='people_ops'?24:maximumRefs);
  }
  return marked;
}

export function prepareForcedWriterProposal(raw,{sourceLibrary,settings,scope,userIdentity=null}){
  const parsed=readWriterProposalInput(raw);
  if(!forceRecord(parsed))throw new Error('Writer JSON은 객체여야 합니다.');
  const forcedRequestRef='req:manual_force_'+crypto.randomUUID().replaceAll('-','_');
  const marked=markManualSource(parsed);marked.request_ref=forcedRequestRef;
  const effective=effectiveRelationshipSettings(settings);
  const assembled=assembleWriterPrompt({sourceLibrary,settings:effective,wikiScope:scope,rpText:'',requestRef:forcedRequestRef,userIdentity});
  const contract={...assembled,[WRITER_MANUAL_IMPORT]:true,requestRef:forcedRequestRef,
    sourceCatalog:{[WRITER_MANUAL_SOURCE]:{kind:'manual_json_unverified',content:''}},
    confirmedSources:[WRITER_MANUAL_SOURCE],seedSources:[],metricBackgroundSources:[],
    overviewRequiredRefs:[],overviewSeedRefs:{},mentionedCharacterRefs:[],bootstrapRequiredRefs:[],
    speakingCharacterRefs:[],speechBootstrapRequiredRefs:[],requiredMetricSetups:[],reviewCandidateRefs:[],
    requireInitialSpeech:false,requireInitialCanonical:false,
    missingPeopleProfileRefs:Object.keys(assembled.catalog.documents).filter(ref=>assembled.catalog.documents[ref].type==='character'&&!assembled.peopleCatalog?.[ref]),
    contributionRef:forcedRequestRef,peopleContributionRef:forcedRequestRef};
  const prepared=preparePartialWriterProposal(JSON.stringify(marked),contract,scope,{applyContract:contract,batchRef:'batch:'+forcedRequestRef,allowEmptyRejected:true});
  return{...prepared,catalog:assembled.catalog,forcedRequestRef,originalRequestRef:typeof parsed.request_ref==='string'?parsed.request_ref:'',contract};
}
