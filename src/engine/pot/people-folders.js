// 출처: risupot 2.3.0 src/people-folders.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

const PEOPLE_FOLDER_UNASSIGNED='';
const peopleFolderRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const peopleFolderAssert=(value,message)=>{if(!value)throw new Error(message);};
const peopleFolderSafeId=id=>typeof id==='string'&&id.length>0&&id.length<=200&&!['__proto__','constructor','prototype'].includes(id);
export function peopleFolderScopeKey(scope){const meta=scope?.scope||scope;return meta?.characterId&&meta?.chatKey?JSON.stringify([meta.characterId,meta.chatKey]):'';}
export function normalizePeopleLayout(raw,documents={}){
 const people=Object.values(documents).filter(item=>item.type==='Character'),ids=new Set(people.map(item=>item.id));
 if(raw===undefined)return{folders:[],order:people.sort((a,b)=>a.title.localeCompare(b.title)).map(item=>item.id),members:{}};
 peopleFolderAssert(peopleFolderRecord(raw)&&Object.keys(raw).every(key=>['folders','order','members'].includes(key))&&Array.isArray(raw.folders)&&Array.isArray(raw.order)&&peopleFolderRecord(raw.members),'인물 폴더 저장 형식이 잘못되었습니다.');
 peopleFolderAssert(raw.folders.length<=500&&raw.order.length<=500&&Object.keys(raw.members).length<=500,'인물 폴더 저장 범위를 넘었습니다.');
 const folderIds=new Set(),folders=raw.folders.map(item=>{peopleFolderAssert(peopleFolderRecord(item)&&Object.keys(item).every(key=>['id','name'].includes(key))&&peopleFolderSafeId(item.id)&&typeof item.name==='string'&&item.name.trim()&&item.name.length<=80&&!folderIds.has(item.id),'인물 폴더 이름 또는 ID가 잘못되었습니다.');folderIds.add(item.id);return{id:item.id,name:item.name.trim()};});
 const seen=new Set(),order=[];for(const id of raw.order){peopleFolderAssert(peopleFolderSafeId(id)&&!seen.has(id),'인물 정렬 ID가 잘못되었습니다.');seen.add(id);if(ids.has(id))order.push(id);}
 for(const person of people)if(!seen.has(person.id))order.push(person.id);
 const members={};for(const[id,folderId]of Object.entries(raw.members)){peopleFolderAssert(peopleFolderSafeId(id)&&peopleFolderSafeId(folderId),'인물 폴더 연결이 잘못되었습니다.');if(ids.has(id)&&folderIds.has(folderId))members[id]=folderId;}
 return{folders,order,members};
}
function peopleLayoutSignature(scope){return JSON.stringify(normalizePeopleLayout(scope?.peopleLayout,scope?.documents));}
function orderedPeople(scope){const layout=normalizePeopleLayout(scope?.peopleLayout,scope?.documents);return layout.order.map(id=>scope.documents[id]);}
export function applyPeopleLayout(scope,command,{expectedScope,expectedLayout}={}){
 peopleFolderAssert(peopleFolderScopeKey(scope)&&(!expectedScope||peopleFolderScopeKey(scope)===expectedScope),'폴더를 정리할 채팅이 바뀌었습니다.');
 const before=normalizePeopleLayout(scope.peopleLayout,scope.documents);peopleFolderAssert(!expectedLayout||JSON.stringify(before)===expectedLayout,'인물 목록이 바뀌었습니다. 현재 목록에서 다시 이동해주세요.');
 const next=JSON.parse(JSON.stringify(before)),folderExists=id=>id===''||next.folders.some(item=>item.id===id);
 peopleFolderAssert(peopleFolderRecord(command),'폴더 작업을 확인해주세요.');
 if(command.type==='create'||command.type==='rename'){
  const name=String(command.name??'').normalize('NFC').trim();peopleFolderAssert(name&&name.length<=80,'폴더 이름은 1~80자로 입력해주세요.');peopleFolderAssert(!next.folders.some(item=>item.id!==command.id&&item.name.normalize('NFC').toLocaleLowerCase()===name.toLocaleLowerCase())&&name!=='미분류','같은 이름의 폴더가 있습니다.');
  if(command.type==='create'){peopleFolderAssert(peopleFolderSafeId(command.id)&&!next.folders.some(item=>item.id===command.id)&&next.folders.length<500,'새 폴더를 만들 수 없습니다.');next.folders.push({id:command.id,name});}else{const folder=next.folders.find(item=>item.id===command.id);peopleFolderAssert(folder,'이름을 바꿀 폴더가 없습니다.');folder.name=name;}
 }else if(command.type==='delete'){
  peopleFolderAssert(command.id&&folderExists(command.id),'삭제할 폴더가 없습니다.');next.folders=next.folders.filter(item=>item.id!==command.id);const moved=next.order.filter(id=>next.members[id]===command.id);for(const id of moved)delete next.members[id];next.order=[...next.order.filter(id=>!moved.includes(id)),...moved];
 }else if(command.type==='move'){
  const ids=command.ids;peopleFolderAssert(Array.isArray(ids)&&ids.length>0&&new Set(ids).size===ids.length&&ids.every(id=>scope.documents[id]?.type==='Character'),'이동할 인물을 다시 선택해주세요.');peopleFolderAssert(typeof command.folderId==='string'&&folderExists(command.folderId),'이동할 폴더가 없습니다.');
  const moving=new Set(ids),ordered=next.order.filter(id=>moving.has(id)),rest=next.order.filter(id=>!moving.has(id));
  if(command.anchorId){peopleFolderAssert(!moving.has(command.anchorId)&&rest.includes(command.anchorId)&&(next.members[command.anchorId]||'')===command.folderId&&['before','after'].includes(command.position),'인물을 놓을 위치가 바뀌었습니다.');}
  for(const id of ordered)if(command.folderId)next.members[id]=command.folderId;else delete next.members[id];
  let index=rest.length;if(command.anchorId)index=rest.indexOf(command.anchorId)+(command.position==='after'?1:0);else{const inFolder=rest.filter(id=>(next.members[id]||'')===command.folderId);if(inFolder.length)index=rest.indexOf(inFolder.at(-1))+1;}
  next.order=[...rest.slice(0,index),...ordered,...rest.slice(index)];
 }else throw new Error('지원하지 않는 폴더 작업입니다.');
 if(JSON.stringify(before)===JSON.stringify(next))return scope;
 return{...scope,peopleLayout:next,revision:scope.revision+1,scope:{...scope.scope,updatedAt:new Date().toISOString()}};
}
