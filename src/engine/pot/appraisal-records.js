// 출처: risupot 2.3.0 src/appraisal-records.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

export const APPRAISAL_FIRST_SLOT='affinity.appraisal';
export const APPRAISAL_CURRENT_SLOT='affinity.current_appraisal';
export const APPRAISAL_LABELS=Object.freeze({[APPRAISAL_FIRST_SLOT]:'첫인상',[APPRAISAL_CURRENT_SLOT]:'현재 평가'});
export const APPRAISAL_FIRST_PRESERVED='첫인상은 이미 작성된 최초 기록을 보존했습니다. 달라진 판단이나 감정은 현재 평가에 기록해주세요.';
export const isAppraisalSlot=slot=>Object.hasOwn(APPRAISAL_LABELS,slot||'');
const appraisalKey=section=>JSON.stringify([...(section?.provenance?.targetRefs||[])].sort());
const appraisalClone=value=>JSON.parse(JSON.stringify(value));

// Existing combined or unlabeled text stays whole in its original first-impression record.
function appraisalDisplayText(section){return section?.body||'';}

export function shouldPreserveFirstAppraisal(slotId,before,after){return slotId===APPRAISAL_FIRST_SLOT&&typeof before==='string'&&Boolean(before.trim())&&before!==after;}

// Protect automatic Writer updates/removals and duplicate attempts for a recorded target.
// Explicit direct editing/import remains a user action, outside this automatic guard.
export function preserveFirstAppraisalSections(before,proposed){
  const fixed=before.filter(s=>s.provenance?.slotId===APPRAISAL_FIRST_SLOT&&s.body?.trim());
  if(!fixed.length)return proposed;
  const byId=new Map(fixed.map(s=>[s.id,s])),keys=new Set(fixed.map(appraisalKey)),seen=new Set(),result=[];
  for(const section of proposed){
    if(byId.has(section.id)){result.push(appraisalClone(byId.get(section.id)));seen.add(section.id);}
    else if(section.provenance?.slotId===APPRAISAL_FIRST_SLOT&&keys.has(appraisalKey(section)))continue;
    else result.push(section);
  }
  for(const section of fixed)if(!seen.has(section.id)){const oldIndex=before.indexOf(section),nextAnchor=before.slice(oldIndex+1).map(s=>result.findIndex(row=>row.id===s.id)).find(index=>index>=0);result.splice(nextAnchor??Math.min(oldIndex,result.length),0,appraisalClone(section));}
  return JSON.stringify(result)===JSON.stringify(proposed)?proposed:result;
}

export const APPRAISAL_TEXT_CONTROL=`Appraisal text has two independent slot kinds: affinity.appraisal is the first impression, affinity.current_appraisal is the current evaluation. Use the exact requested slot and target. Do not combine both into one text or return first/current labels inside the text. First impression: only fill a missing/empty record during an actual conversation, using visible appearance, the owner's established personality/values and the resulting feeling; never rewrite a nonempty first impression. Current evaluation: write the owner's present judgment, its evidence and resulting feeling; use actual dialogue, behavior, observed appearance and facts the owner learned, and update only when new evidence supports a change or clarification. A changed opinion belongs only in current evaluation. No taste/affinity metric changes are authorized by writing either text. Existing first impressions and the other target's records are read-only context.`;
