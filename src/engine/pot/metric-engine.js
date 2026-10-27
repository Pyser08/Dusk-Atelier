// 출처: risupot 2.3.0 src/metric-engine.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

const round=value=>{const next=Math.round((value+Number.EPSILON)*1e12)/1e12;return Object.is(next,-0)?0:next};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const keyOf=(slotId,targetRefs,contextKey)=>`${slotId}\n${targetRefs.join('|')}\n${contextKey||''}`;
function hash(text){let value=2166136261;for(const char of text){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return(value>>>0).toString(36)}
const STAGE_KO={
  visceral_aversion:'강한 거부감',clear_repel:'뚜렷한 비호감',slight_friction:'약한 거슬림',neutral:'중립',slight_draw:'약한 끌림',clear_draw:'뚜렷한 끌림',striking_draw:'강한 끌림',
  'Extreme hostility':'극도의 적대','Hostility':'적대','Aversion':'혐오','Indifference':'무관심','Recognition':'인식','Interest':'관심','Attraction':'끌림','Affection':'애정',
  'Baseline and slight unease':'기준·약한 불안','Noticing':'주목','Suspicion and questions':'의심·질문','Distrust and verification':'불신·확인','Strong conviction':'강한 확신',
  'Chaste':'금욕적','Shy':'수줍음','Open':'개방적','Awakened':'각성','Indulgent':'탐닉적',
  'Must use contraception':'피임 필수','Hesitant':'주저함','Considers no contraception acceptable on a safe day':'안전일에는 비피임을 고려 가능','Does not care much':'피임 여부를 크게 신경 쓰지 않음','Prefers no contraception':'비피임 선호',
};
const label=value=>STAGE_KO[value]||String(value||'상태');
function stage(policy,value){const ceilings=policy.stage_ceilings||[policy.maximum],labels=policy.stage_labels||['상태'];let index=ceilings.findIndex(ceiling=>value<=ceiling);if(index<0)index=ceilings.length-1;return{index,label:label(labels[index]||labels.at(-1)||'상태'),rawLabel:String(labels[index]||'')};}
function range(policy){const values=Object.values(policy.value_map||{}).filter(Number.isFinite);return{minimum:Number.isFinite(policy.minimum)?policy.minimum:Math.min(...values),maximum:Number.isFinite(policy.maximum)?policy.maximum:Math.max(...values)};}
export function manuallySetMetric(metric,value,policy,{reason='사용자 직접 수정',now=new Date().toISOString()}={}){
  if(!['affinity.score','affinity.taste_band','openness.score','suspicion.score'].includes(metric.slotId)||!policy)throw new Error('직접 수정할 수 없는 수치입니다.');
  const bounds=range(policy);if(!Number.isFinite(value)||value<bounds.minimum||value>bounds.maximum||(policy.value_map&&!Object.values(policy.value_map).includes(value)))throw new Error('점수는 '+bounds.minimum+'~'+bounds.maximum+(policy.value_map?'의 정수':' 범위')+'로 입력해주세요.');
  if(typeof reason!=='string'||!reason.trim()||reason.length>800)throw new Error('수정 이유를 1~800자로 입력해주세요.');
  const grade=stage(policy,value),choice=policy.value_map?Object.keys(policy.value_map).find(key=>policy.value_map[key]===value):null,delta=round(value-metric.value),requestRef='req:manual_metric_'+hash(metric.id+'|'+now+'|'+value+'|'+reason);
  const stageLabel=choice?label(choice):policy.contraception_labels?.[grade.index]?grade.label+' · 피임: '+label(policy.contraception_labels[grade.index]):grade.label;
  return{...metric,value:round(value),minimum:bounds.minimum,maximum:bounds.maximum,stageIndex:grade.index,stageLabel,lastDelta:delta,baseDelta:0,updatedAt:now,evidenceRefs:['source:manual_input'],reason:reason.trim(),requestRef,contributions:[...(metric.contributions||[]),{ref:requestRef,baseDelta:0,scaledDelta:0,appliedDelta:delta,at:now,requestRef}].slice(-64)};
}
function targetRefs(operation,refToId,documents,wikiDocuments){return operation.target_refs.map(ref=>{if(ref==='actor:user')return ref;const id=refToId[ref],type=documents.get(id)?.input?.type||wikiDocuments?.[id]?.type;if(!id||type!=='Character')throw new Error('metric 대상은 사용자 또는 Character여야 합니다.');return id;});}
function evidence(operation){if(operation.operation==='delta')return{refs:[...new Set(operation.events.flatMap(event=>event.evidence_refs))],reason:operation.events.map(event=>event.reason).join(' / ').slice(0,800)};return{refs:operation.evidence_refs,reason:operation.reason};}
function derivedValue(policy,operation){
  for(const[key,allowed]of Object.entries(policy.choices||{}))if(!allowed.includes(operation.choices[key]))throw new Error(`metric derive 선택 ${key}가 정책에 없습니다.`);
  const choiceKeys=Object.keys(operation.choices);
  if(policy.value_map){const key=choiceKeys[0],value=policy.value_map[operation.choices[key]];if(!Number.isFinite(value))throw new Error('metric derive 값 매핑이 없습니다.');return value;}
  if(policy.baseline_values){let value=policy.baseline_values[operation.choices.baseline];if(!Number.isFinite(value))throw new Error('metric baseline 값이 없습니다.');for(const key of policy.positive_flags||[])if(operation.choices[key]==='yes')value++;for(const key of policy.negative_flags||[])if(operation.choices[key]==='yes')value--;return clamp(value,policy.minimum,policy.maximum);}
  throw new Error('이 derive metric은 아직 숫자 상태로 계산할 수 없습니다.');
}

export function applyMetricOperations({documents,wikiDocuments,proposal,contract,refToId,pins={},now=new Date().toISOString()}){
  const report={applied:0,ignored:0,changedDocumentIds:new Set(),changes:[]},seen=new Set(),maxEvents=Number(contract.counterRules?.max_events_per_source_turn||8),contributionBase=String(contract.contributionRef||proposal.request_ref);
  for(let opIndex=0;opIndex<proposal.metric_ops.length;opIndex++){
    const operation=proposal.metric_ops[opIndex];try{const policy=contract.policies?.[operation.slot_id],slot=contract.activeSlotMap?.[operation.slot_id];if(!policy||!slot)throw new Error(`metric 정책 ${operation.slot_id}가 없습니다.`);
    const documentId=refToId[operation.document_ref],draft=documents.get(documentId);if(!draft||draft.input.type!=='Character')throw new Error('metric 소유 문서는 Character여야 합니다.');
    const targets=targetRefs(operation,refToId,documents,wikiDocuments);if(new Set(targets).size!==targets.length)throw new Error('metric 대상이 중복됐습니다.');
    const identity=keyOf(operation.slot_id,targets,operation.context_key??null),operationIdentity=`${documentId}\n${identity}\n${operation.operation}`;if(seen.has(operationIdentity))throw new Error('같은 metric 연산을 한 응답에서 중복 실행할 수 없습니다.');seen.add(operationIdentity);
    const metrics=draft.input.metrics||[],existing=metrics.find(metric=>keyOf(metric.slotId,metric.targetRefs,metric.contextKey)===identity),info=evidence(operation),contributionRef=`${contributionBase}:${operation.slot_id}:${opIndex}`;
    if(existing&&pins[documentId]?.includes('metric:'+existing.id)){report.ignored++;continue;}
    if(existing?.contributions?.some(item=>item.ref===contributionRef)){report.ignored++;continue;}
    const bounds=range(policy);if(!Number.isFinite(bounds.minimum)||!Number.isFinite(bounds.maximum))throw new Error('metric 최소·최대 범위가 없습니다.');let value=existing?.value??0,baseDelta=0,scaledDelta=0,status=existing?.status||'active';
    if(operation.operation==='init'){
      if(existing)throw new Error('이미 존재하는 metric은 다시 초기화할 수 없습니다.');if(!policy.initial_values?.includes(operation.value))throw new Error('metric 초기값이 정책에 없습니다.');value=clamp(operation.value,bounds.minimum,bounds.maximum);baseDelta=value;scaledDelta=value;
    }else if(operation.operation==='delta'){
      if(!existing)throw new Error('metric delta 전에 init이 필요합니다.');if(operation.events.length>maxEvents)throw new Error('한 source turn의 metric 사건 수가 너무 많습니다.');for(const event of operation.events)if(!policy.delta_values?.includes(event.amount))throw new Error(`metric 변화량 ${event.amount}이 정책에 없습니다.`);
      baseDelta=round(operation.events.reduce((sum,event)=>sum+event.amount,0));const feature=contract.multipliers?.[policy.feature]||{increase:1,decrease:1};scaledDelta=round(operation.events.reduce((sum,event)=>sum+event.amount*(event.amount>=0?feature.increase:feature.decrease),0));let lower=policy.turn_minimum*(feature.decrease??1),upper=policy.turn_maximum*(feature.increase??1);for(const event of operation.events)if(policy.exceptional_deltas?.includes(event.amount))lower=Math.min(lower,event.amount*(feature.decrease??1));const prior=Number(contract.recoveryPriorDeltas?.[JSON.stringify([documentId,operation.slot_id,targets,operation.context_key??null])]||0);scaledDelta=round(clamp(prior+scaledDelta,Math.min(lower,prior),Math.max(upper,prior))-prior);value=round(clamp(existing.value+scaledDelta,bounds.minimum,bounds.maximum));
    }else if(operation.operation==='transition'){
      if(!existing)throw new Error('metric transition 전에 init이 필요합니다.');const transition=policy.transitions?.[operation.name];if(!transition)throw new Error('metric transition이 정책에 없습니다.');if(transition.operation==='floor')value=Math.max(existing.value,transition.value);else if(transition.operation==='set')value=transition.value;else if(transition.operation!=='keep')throw new Error('metric transition 연산이 잘못되었습니다.');value=clamp(value,bounds.minimum,bounds.maximum);baseDelta=round(value-existing.value);scaledDelta=baseDelta;status=transition.status||status;
    }else if(operation.operation==='derive'){
      value=derivedValue(policy,operation);baseDelta=round(value-(existing?.value??0));scaledDelta=baseDelta;
    }else throw new Error('지원하지 않는 metric 연산입니다.');
    const appliedDelta=round(value-(existing?.value??0)),grade=stage({...policy,maximum:bounds.maximum},value),stageLabel=operation.operation==='derive'&&Object.values(operation.choices||{}).length?label(Object.values(operation.choices)[0]):policy.contraception_labels?.[grade.index]?`${grade.label} · 피임: ${label(policy.contraception_labels[grade.index])}`:grade.label,contribution={ref:contributionRef,baseDelta,scaledDelta,appliedDelta,at:now,requestRef:proposal.request_ref},metric={id:existing?.id||`metric-${hash(identity)}`,slotId:operation.slot_id,targetRefs:targets,contextKey:operation.context_key??null,value,minimum:bounds.minimum,maximum:bounds.maximum,stageIndex:grade.index,stageLabel,status,lastDelta:appliedDelta,baseDelta,updatedAt:now,evidenceRefs:info.refs,reason:info.reason,requestRef:proposal.request_ref,contributions:[...(existing?.contributions||[]),contribution].slice(-64)};
    if(existing)metrics[metrics.indexOf(existing)]=metric;else metrics.push(metric);draft.input.metrics=metrics;draft.touched=true;report.applied++;report.changedDocumentIds.add(documentId);report.changes.push({documentId,slotId:operation.slot_id,value,maximum:bounds.maximum,minimum:bounds.minimum,stageLabel,lastDelta:appliedDelta,status,targetRefs:targets});
    }catch(error){error.writerUnit={kind:'metric',value:JSON.parse(JSON.stringify(operation))};throw error;}
  }
  return report;
}

export function metricDisplay(metric,documents={},userName='사용자'){const target=metric.targetRefs.length?metric.targetRefs.map(ref=>ref==='actor:user'?userName:documents[ref]?.title||ref).join(' · '):'인물 공통',delta=`${metric.lastDelta>=0?'+':''}${metric.lastDelta}`;return{title:`${metric.slotId} · ${target}`,score:`${metric.value}/${metric.maximum}`,range:`${metric.minimum}~${metric.maximum}`,stage:label(metric.stageLabel),delta,status:metric.status,target};}
function metricStageDescription(metric){
  const value=Math.round(Number(metric?.value));
  if(metric?.slotId==='affinity.score'){
    if(value<=-71)return'극도의 적대감이 있어 관계 단절이나 적극적인 배척을 우선함';
    if(value<=-31)return'분명한 적대감이 있어 자발적 협조와 친절이 크게 줄어듦';
    if(value<=-1)return'비호감이 있어 거리를 두고 필요한 만큼만 상대함';
    if(value<=60)return'특별한 호감 없이 기본 성격·예의·관계에 따라 대함';
    if(value<=120)return'상대를 긍정적으로 인식해 관심과 배려가 조금씩 늘어남';
    if(value<=180)return'뚜렷한 관심이 생겨 먼저 살피거나 대화를 이어가려 함';
    if(value<=240)return'강한 끌림으로 상대에게 시간과 노력을 더 쓰려 함';
    return'깊은 애정으로 자발적인 지지와 정서적 친밀감을 표현함';
  }
  if(metric?.slotId==='affinity.taste_band')return({[-3]:'강한 거부감으로 접촉을 끝내거나 피하려 함',[-2]:'분명한 비호감으로 마찰과 거리가 늘고 자발적 친절이 줄어듦',[-1]:'약간 거슬리거나 취향에 맞지 않아 필요한 만큼만 반응함',[0]:'특별한 끌림이나 거부감 없이 기존 관계대로 대함',[1]:'약하게 끌려 조금 더 주목하고 기억하거나 대화를 이어가려 함',[2]:'핵심 취향이 분명히 맞아 먼저 질문하거나 시간과 노력을 더 씀',[3]:'여러 핵심 취향이 강하게 맞아 관심의 우선순위가 달라질 수 있음'})[value]||'';
  if(metric?.slotId==='affinity.decorum')return({[0]:'감정을 거의 감추지 않아 말·표정·행동에 비교적 직접 드러남',[1]:'감추려 하지만 서툴러 말과 시선에서 여러 작은 단서가 드러남',[2]:'대체로 감추며 짧은 침묵·반응 지연 같은 작은 단서만 나타남',[3]:'감정을 능숙하게 숨겨 아주 미세한 행동과 타이밍 차이만 보임'})[value]||'';
  return'';
}
