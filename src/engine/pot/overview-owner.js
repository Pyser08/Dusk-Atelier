// 출처: risupot 2.3.0 src/overview-owner.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { isCharacterOverviewSection } from './relationship-mode.js';

export function overviewSections(document){return(Array.isArray(document)?document:document?.sections||[]).filter(isCharacterOverviewSection);}
/** Missing IDs may resolve only a unique existing overview; an explicit ID never selects another item. */
export function resolveOverviewSection(document,sectionId=null){
  if(sectionId!==null&&(typeof sectionId!=='string'||!sectionId.trim()))throw new Error('기본정보 항목 ID를 다시 확인해주세요.');
  const all=Array.isArray(document)?document:document?.sections||[];
  if(sectionId!==null){const selected=all.find(section=>section.id===sectionId);if(!selected||!isCharacterOverviewSection(selected))throw new Error('수정할 기본정보 항목이 바뀌었습니다. 기존 항목을 다시 선택해주세요.');return selected;}
  const candidates=overviewSections(all);if(candidates.length>1)throw new Error('기본정보 항목이 여러 개 있어 수정 대상을 정할 수 없습니다. 기존 항목 하나를 선택해 작성해주세요.');return candidates[0]||null;
}
