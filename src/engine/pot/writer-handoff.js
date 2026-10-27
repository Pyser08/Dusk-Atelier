// 출처: risupot 2.3.0 src/writer-handoff.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { extractRpAt, messageText } from '../../data/pot/chat-source.js';
import { routerCacheHash } from '../../data/pot/router-runtime.js';
import { namedCharacterMention } from './wiki-retrieval.js';

const handoffText=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim();
const handoffKey=({scope,characterIndex,chatIndex})=>scope?.characterId&&scope?.chatKey?JSON.stringify([scope.characterId,scope.chatKey,characterIndex,chatIndex]):'';
export function writerCurrentCharacterIds(scope,rpText){
  const characters=Object.values(scope.documents||{}).filter(document=>document.type==='Character'),owners=new Map(),nameKey=name=>handoffText(name).toLocaleLowerCase();
  for(const document of characters)for(const name of [document.title,...(document.aliases||[])]){const key=nameKey(name);const ids=owners.get(key)||new Set();ids.add(document.id);owners.set(key,ids);}
  return characters.filter(document=>[document.title,...(document.aliases||[])].some(name=>owners.get(nameKey(name))?.size===1&&namedCharacterMention(rpText,name))).slice(0,32).map(document=>document.id);
}
async function handoffAnchor(chat,userIndex,userText){
  const messages=chat?.message||[];
  return routerCacheHash({userIndex,userText:handoffText(userText),previous:messages.slice(Math.max(0,userIndex-2),userIndex).map((message,index)=>({id:String(message.chatId||message.id||`index:${Math.max(0,userIndex-2)+index}`),role:message.role,text:messageText(message)}))});
}
export class WriterCandidateHandoff {
  constructor({maxScopes=8,maxAgeMs=60*60*1000,now=()=>Date.now()}={}){this.records=new Map();this.sequence=0;this.maxScopes=maxScopes;this.maxAgeMs=maxAgeMs;this.now=now;}
  prune(){for(const[key,record]of this.records)if(this.now()-record.at>this.maxAgeMs)this.records.delete(key);while(this.records.size>this.maxScopes)this.records.delete(this.records.keys().next().value);}
  async begin({scope,characterIndex,chatIndex,chat,userIndex,currentUser,userId=null}){
    this.prune();const key=handoffKey({scope,characterIndex,chatIndex});if(!key||!Number.isInteger(userIndex)||userIndex<0)return null;
    const ticket={key,sequence:++this.sequence},record={...ticket,at:this.now(),userIndex,userId,anchor:null,candidates:null,output:null};
    this.records.delete(key);this.records.set(key,record);this.prune();record.anchor=await handoffAnchor(chat,userIndex,currentUser);return ticket;
  }
  commit(ticket,documents,newCharacters=[]){
    const record=ticket&&this.records.get(ticket.key);if(!record||record.sequence!==ticket.sequence)return false;
    record.candidates=[...new Set((documents||[]).filter(document=>document?.type==='Character'&&typeof document.id==='string').map(document=>document.id))].slice(0,32);record.newCharacters=JSON.parse(JSON.stringify(newCharacters.slice(0,12)));return true;
  }
  async match({scope,characterIndex,chatIndex,chat,messageIndex,withNewCharacters=false}){
    const result=(ids=[],names=[])=>withNewCharacters?{documentIds:ids,newCharacters:JSON.parse(JSON.stringify(names))}:ids;
    this.prune();const key=handoffKey({scope,characterIndex,chatIndex}),record=this.records.get(key),recent=extractRpAt(chat,messageIndex);
    if(!record?.candidates||!recent.user||!recent.assistant||recent.user.index!==record.userIndex||(record.userId!==null&&record.userId!==recent.user.id))return result();
    const anchor=await handoffAnchor(chat,recent.user.index,recent.user.text);
    if(this.records.get(key)!==record||anchor!==record.anchor)return result();
    const output=await routerCacheHash({index:messageIndex,id:recent.assistant.id,text:recent.assistant.text});
    if(this.records.get(key)!==record||record.output&&record.output!==output)return result();
    record.output=output;return result([...record.candidates],record.newCharacters||[]);
  }
  clear(){this.records.clear();}
}
