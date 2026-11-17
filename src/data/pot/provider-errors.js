// 출처: risupot 2.3.0 src/provider-errors.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

function redactProviderError(value,secrets=[]){
  let text=String(value||'');
  for(const secret of secrets.filter(value=>typeof value==='string'&&value.length>=4).sort((a,b)=>b.length-a.length)){
    for(const form of new Set([secret,JSON.stringify(secret).slice(1,-1),encodeURIComponent(secret)]))text=text.split(form).join('[인증정보 숨김]');
    try{const account=JSON.parse(secret);if(account?.private_key)text=text.split(account.private_key).join('[인증정보 숨김]').split(JSON.stringify(account.private_key).slice(1,-1)).join('[인증정보 숨김]');}catch{}
  }
  return text.replace(/-----BEGIN [\s\S]*?PRIVATE KEY-----[\s\S]*?-----END [\s\S]*?PRIVATE KEY-----/g,'[인증정보 숨김]').replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]{8,})\b/g,'[인증정보 숨김]').replace(/\bBearer\s+[^\s"'<>]+/gi,'Bearer [숨김]').replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization)\s*[=:]\s*)[^\s,;]+/gi,'$1[숨김]').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,650);
}
export async function providerHttpDetail(response,secrets=[]){
  let data,raw='';try{if(typeof response.text==='function'){raw=String(await response.text());if(raw.length<=32000)try{data=JSON.parse(raw);}catch{}}else if(typeof response.json==='function')data=await response.json();}catch{}
  const err=data?.error,parts=[typeof err==='string'?err:err?.message,data?.message,typeof data?.detail==='string'?data.detail:'',err?.code,err?.param].filter(value=>typeof value==='string'||typeof value==='number');
  if(!parts.length&&raw&&data===undefined&&!/^\s*[<{[]/.test(raw))parts.push(raw.slice(0,4000));
  const detail=redactProviderError([...new Set(parts)].join(' · '),secrets);
  return detail?' · '+detail:'';
}
