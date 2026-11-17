// 출처: risupot 2.3.0 src/token-usage.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

const tokenCount=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const firstTokenCount=(...values)=>values.map(tokenCount).find(value=>value!==null)??null;
export function normalizeTokenUsage(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const inputTokens=tokenCount(value.inputTokens),outputTokens=tokenCount(value.outputTokens),reasoningTokens=tokenCount(value.reasoningTokens);
  if(inputTokens===null&&outputTokens===null&&reasoningTokens===null)return null;
  return{inputTokens,outputTokens,reasoningTokens,reasoningIncluded:typeof value.reasoningIncluded==='boolean'?value.reasoningIncluded:null};
}
function readModelTokenUsage(data,format='openai'){
  const u=data?.usage||{};let inputTokens=null,outputTokens=null,reasoningTokens=null,reasoningIncluded=null;
  if(format==='google'){
    const g=data?.usageMetadata||{};inputTokens=tokenCount(g.promptTokenCount);outputTokens=tokenCount(g.candidatesTokenCount);reasoningTokens=tokenCount(g.thoughtsTokenCount);
    if(outputTokens!==null&&reasoningTokens!==null){outputTokens=tokenCount(outputTokens+reasoningTokens);reasoningIncluded=outputTokens!==null?true:null;}
  }else{
    inputTokens=firstTokenCount(u.prompt_tokens,u.input_tokens);outputTokens=firstTokenCount(u.completion_tokens,u.output_tokens);
    reasoningTokens=firstTokenCount(u.completion_tokens_details?.reasoning_tokens,u.output_tokens_details?.reasoning_tokens,u.output_tokens_details?.thinking_tokens,u.reasoning_tokens);
    if(format==='anthropic'&&inputTokens!==null)inputTokens=tokenCount(inputTokens+(tokenCount(u.cache_read_input_tokens)??0)+(tokenCount(u.cache_creation_input_tokens)??0));
    if(reasoningTokens!==null&&outputTokens!==null&&reasoningTokens<=outputTokens)reasoningIncluded=true;
  }
  return normalizeTokenUsage({inputTokens,outputTokens,reasoningTokens,reasoningIncluded});
}
export function reportModelTokenUsage(data,format,onUsage){const usage=readModelTokenUsage(data,format);if(usage&&typeof onUsage==='function')try{onUsage(usage);}catch{/* Diagnostic callbacks cannot fail a model request. */}}
function traceTokenDisplay(record){
  const usage=normalizeTokenUsage(record?.usage),format=value=>value.toLocaleString('en-US'),part=(actual,estimate)=>actual!==null&&actual!==undefined?format(actual)+'토큰 (API)':'≈'+(Math.max(0,Number(estimate)||0)/1000).toFixed(1)+'K (추정)';
  const input=part(usage?.inputTokens,record?.estimatedInputTokens),output=part(usage?.outputTokens,record?.estimatedOutputTokens),reasoning=usage?.reasoningTokens!==null&&usage?.reasoningTokens!==undefined?(usage.reasoningIncluded===true?'그중 사고 ':'사고 ')+format(usage.reasoningTokens)+'토큰'+(usage.reasoningIncluded===true?'':' (API)'):'사고 미제공';
  return{input,output,reasoning,summary:'입력 '+input+' · 출력 '+output+' · '+reasoning};
}
