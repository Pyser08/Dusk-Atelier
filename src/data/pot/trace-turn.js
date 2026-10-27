// 출처: risupot 2.3.0 src/trace-turn.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

export function chatTraceTurn(chat,endIndex=null,{next=false}={}){
  const messages=Array.isArray(chat?.message)?chat.message:Array.isArray(chat?.messages)?chat.messages:[];
  const end=endIndex===null?messages.length-1:Math.min(messages.length-1,Math.max(-1,endIndex));
  let count=0;for(let index=0;index<=end;index++)if(['user','human'].includes(String(messages[index]?.role||'').toLowerCase()))count++;
  if(next)count++;return count>0?count:null;
}
export function chatTraceInputTurn(chat,userIndex,{matched=false}={}){
  const messages=Array.isArray(chat?.message)?chat.message:Array.isArray(chat?.messages)?chat.messages:[];
  // CBS/regex formatting can differ from the DB text without adding another user message.
  const pendingUser=Number.isInteger(userIndex)&&userIndex>=0&&userIndex===messages.length-1&&['user','human'].includes(String(messages[userIndex]?.role||'').toLowerCase());
  return matched||pendingUser?chatTraceTurn(chat,userIndex):chatTraceTurn(chat,null,{next:true});
}
function inspectorTraceTitle(record){
  const stage=String(record?.stage||''),name=/^router/i.test(stage)?'Router':/^director/i.test(stage)?'Director':/^writer/i.test(stage)?'Writer':/^people/i.test(stage)?'People':stage||'Model';
  return Number.isSafeInteger(record?.turnNumber)&&record.turnNumber>0?`${name} #${record.turnNumber}턴`:`${name} · 턴 미상`;
}
function inspectorTraceSubstage(record){
  const stage=String(record?.stage||''),pass=stage.match(/^Director pass (\d+)/i),batch=stage.match(/^Writer batch (\d+)\/(\d+)/i);
  if(pass)return`${pass[1]}차`;if(batch)return`묶음 ${batch[1]}/${batch[2]}`;
  return stage.replace(/^(Router|Director|Writer|People)\s*/i,'');
}
