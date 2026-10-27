// 출처: risupot 2.3.0 src/people-candidate-edit.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { peopleItemPinned, peopleProfilePinKey } from './people-pins.js';
import { makeWikiId, normalizeWikiScope } from './wiki-schema.js';

export function updatePersonCandidateText(scope,documentId,{id=null,text,expected=null,scopeKey},{origin='manual',evidenceRefs=[],now=new Date().toISOString()}={}){
  const next=normalizeWikiScope(scope),old=id?next.people.candidates[id]:null;
  if(scopeKey!==next.scope.characterId+'\n'+next.scope.chatKey||!next.people.profiles[documentId])throw new Error('인물 기본 성격이나 현재 채팅을 확인해주세요.');
  if(id&&(!old||old.documentId!==documentId||JSON.stringify(scope.people?.candidates?.[id])!==expected))throw new Error('편집 중 변화 후보가 바뀌었습니다. 다시 열어주세요.');
  if(old&&!['collecting','review'].includes(old.status))throw new Error('이미 처리한 변화 후보는 되돌린 뒤 새 후보로 등록해주세요.');
  if(peopleItemPinned(next,documentId,peopleProfilePinKey(old?.axis||'qualitative')))throw new Error('고정핀을 먼저 해제해주세요.');
  if(typeof text!=='string'||!text.trim()||text.length>400)throw new Error('변화 후보는 1~400자로 입력해주세요.');
  const candidateId=old?.id||makeWikiId('candidate');
  next.people.candidates[candidateId]=old?{...old,pattern:text.trim(),updatedAt:now}:{id:candidateId,documentId,axis:'qualitative',direction:'new_pattern',pattern:text.trim(),status:'review',evidence:(origin==='requested_ai'?evidenceRefs:['source:manual_input']).map((ref,i)=>({id:candidateId+':'+i,ref,sceneKey:'',summary:origin==='requested_ai'?'사용자가 요청한 AI 변경안':'사용자가 직접 등록한 후보',confidence:0,strength:0,at:now})),sceneKeys:[],confidence:0,averageStrength:0,proposedDelta:0,createdAt:now,updatedAt:now,appliedChange:null,origin};
  next.revision++;next.scope.updatedAt=now;return next;
}
export function deletePersonCandidate(scope,documentId,{id,expected,scopeKey},{now=new Date().toISOString()}={}){
  const next=normalizeWikiScope(scope),candidate=next.people.candidates[id];if(scopeKey!==next.scope.characterId+'\n'+next.scope.chatKey||candidate?.documentId!==documentId)throw new Error('삭제할 변화 후보나 채팅이 바뀌었습니다.');
  if(peopleItemPinned(next,documentId,peopleProfilePinKey(candidate.axis)))throw new Error('고정핀을 먼저 해제해주세요.');
  if(!['collecting','review'].includes(candidate.status)||expected!==JSON.stringify(scope.people.candidates[id]))throw new Error('후보가 변경되었거나 이미 반영되었습니다. 다시 확인해주세요.');
  delete next.people.candidates[id];next.revision++;next.scope.updatedAt=now;return next;
}
