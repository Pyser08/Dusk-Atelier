// 출처: risupot 2.3.0 src/user-identity-host.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)
import { CHAT_SCOPE_FIELD } from '../../engine/pot/chat-scope.js';

const hostIdentityKey=chat=>String(chat?.[CHAT_SCOPE_FIELD]||chat?.id||'');
const hostIdentityBinding=chat=>String(chat?.bindedPersona||'');
const hostIdentityMessageId=message=>String(message?.chatId||message?.id||'');
const hostIdentitySelectorText=value=>Array.from(String(value),char=>'\\'+char.codePointAt(0).toString(16)+' ').join('');
// Exact native header paths, never a name-looking phrase inside rendered RP.
const HOST_USER_HEADER_SELECTORS=[
  ':scope > div > div > div.items-center.gap-3 > span.text-textcolor',
  ':scope > div > span > div.flexium.items-center.chat-width > div.chat-width.text-xl.unmargin.text-textcolor > span',
  ':scope > div > div > div > div > div.flex.flex-col.items-center > h2',
];
async function hostIdentityReadContext(api){
  const characterIndex=await api.getCurrentCharacterIndex(),chatIndex=await api.getCurrentChatIndex();
  if(characterIndex===null||characterIndex===undefined||chatIndex===null||chatIndex===undefined)return null;
  const chat=await api.getChatFromIndex(characterIndex,chatIndex);
  return chat?{characterIndex,chatIndex,chat,key:hostIdentityKey(chat),binding:hostIdentityBinding(chat)}:null;
}
function hostIdentityContextMatches(current,expectedChat,expected={}){
  return current?.key&&current.key===hostIdentityKey(expectedChat)&&current.binding===hostIdentityBinding(expectedChat)&&(expected.characterIndex===undefined||expected.characterIndex===current.characterIndex)&&(expected.chatIndex===undefined||expected.chatIndex===current.chatIndex);
}
async function readHostUserName(api,chat,{characterIndex,chatIndex,canRead=()=>false}={}){
  if(!canRead()||!hostIdentityKey(chat)||typeof api?.getRootDocument!=='function'||!['getCurrentCharacterIndex','getCurrentChatIndex','getChatFromIndex'].every(key=>typeof api[key]==='function'))return null;
  try{
    const expected={characterIndex,chatIndex},before=await hostIdentityReadContext(api);if(!hostIdentityContextMatches(before,chat,expected)||!canRead())return null;
    const messages=before.chat.message||[],userMessages=messages.map((message,index)=>({message,index})).filter(({message})=>message.role==='user'&&hostIdentityMessageId(message)).slice(-3).reverse();
    if(!userMessages.length)return null;
    const root=await api.getRootDocument();if(!root)return null;
    for(const {message,index} of userMessages){
      const id=hostIdentityMessageId(message),selector=`.risu-chat[data-chat-index="${index}"][data-chat-id="${hostIdentitySelectorText(id)}"]:not(.risu-chat .risu-chat)`;
      const row=await root.querySelector(selector);if(!row)continue;
      for(const headerSelector of HOST_USER_HEADER_SELECTORS){
        const header=await row.querySelector(headerSelector);if(!header||typeof header.textContent!=='function'||typeof header.getChildren!=='function')continue;
        const children=await header.getChildren(),childCount=Array.isArray(children)?children.length:typeof children?.length==='function'?await children.length():null;if(childCount!==0)continue;
        const raw=await header.textContent();if(typeof raw!=='string'||raw.trim().length>160||/\{\{|\}\}|[\r\n]/.test(raw))continue;
        const title=raw.normalize('NFC').trim();if(!title)continue;
        const after=await hostIdentityReadContext(api),latest=after?.chat?.message?.[index];
        if(!canRead()||!hostIdentityContextMatches(after,chat,expected)||before.characterIndex!==after.characterIndex||before.chatIndex!==after.chatIndex||latest?.role!=='user'||hostIdentityMessageId(latest)!==id)return null;
        return {title,known:true,source:'host.user-message-header',description:'',aliases:[]};
      }
    }
  }catch{ /* Optional display lookup must never block model requests or widen permissions. */ }
  return null;
}
