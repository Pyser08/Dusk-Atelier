// 출처: risupot 2.3.0 src/source-check.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

// OFF keeps chat identity, message IDs/order, Lore, person baseline and memory in the comparison;
// only chat message body text and the prior-turn transcript may differ (image plugins rewrite them).
const CHAT_REFERENCE_KINDS=new Set(['confirmed_chat','user_context']);
const MESSAGE_KEYS=new Set(['index','id','text']);
export const writerSourceCheckEnabled=settings=>settings?.writerSourceCheckEnabled===true;
function withoutChatText(value){
  if(typeof value==='string'){const head=value.trimStart()[0];if(head==='{'||head==='['){try{const parsed=JSON.parse(value);if(parsed&&typeof parsed==='object')return JSON.stringify(withoutChatText(parsed));}catch{}}return value;}
  if(Array.isArray(value))return value.map(withoutChatText);
  if(!value||typeof value!=='object')return value;
  const message=typeof value.id==='string'&&typeof value.text==='string'&&Object.keys(value).every(key=>MESSAGE_KEYS.has(key)),reference=CHAT_REFERENCE_KINDS.has(value.kind)&&typeof value.content==='string',out={};
  for(const[key,item]of Object.entries(value)){if(key==='recentContext'||message&&key==='text'||reference&&key==='content')continue;out[key]=withoutChatText(item);}
  return out;
}
/** Exact match, or with the check OFF, the same messages whose body text alone changed. */
export function sameSourceSignature(a,b,settings){if(a===b)return true;if(writerSourceCheckEnabled(settings))return false;return JSON.stringify(withoutChatText(a))===JSON.stringify(withoutChatText(b));}
