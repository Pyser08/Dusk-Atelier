// 출처: risupot 2.3.0 src/cbs-visibility.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

// Semantics checked against RisuBard 0.9.12 parser/blockStartMatcher, cbs.ts and chatVar.svelte.ts.
// This deliberately cannot execute the host parser, mutate state, run functions or reproduce random rolls.
const CBS_VISIBILITY_LIMITS=Object.freeze({inputChars:100000,outputChars:100000,depth:32,nodes:12000,expressionTokens:512,expressionChars:8000});
const CBS_VISIBILITY_READS=new Set(['getvar','getglobalvar','equal','notequal','greater','less','greaterequal','lessequal','and','or','not','all','any','calc','user','char','bot','blank','none','br','newline']);
const CBS_VISIBILITY_RANDOM=new Set(['random','pick','roll','rollp','rand','randomp']);
const CBS_VISIBILITY_WRITES=new Set(['setvar','addvar','setdefaultvar','setglobalvar','addglobalvar','unsetvar','deletevar','settempvar','addtempvar','setlocalvar','call','func','function','return','eval','run','runlua','execute','declare','button','__']);
const cbsVisibilityTruthy=value=>value==='1'||value==='true';
const cbsVisibilityBit=value=>value?'1':'0';
const cbsVisibilityName=value=>value.toLowerCase().replace(/[\s_-]/g,'');
function cbsVisibilityStop(state,code){state.reasonCodes.add(code);state.unsupported=true;throw state.stop;}
function cbsVisibilityNode(state){if(++state.nodes>CBS_VISIBILITY_LIMITS.nodes)cbsVisibilityStop(state,'node-limit');}
function cbsVisibilityUnknown(state,code){state.reasonCodes.add(code);return null;}
function cbsVisibilityDescriptor(object,key){
  if(!object||typeof object!=='object')return null;
  try{const descriptor=Object.getOwnPropertyDescriptor(object,key);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor:null;}catch{return null;}
}
function cbsVisibilityValue(value,state){
  // Missing/JS null is not the host's explicit string "null". The caller supplies only known values.
  if(typeof value==='number'&&Number.isFinite(value))value=String(value);else if(typeof value==='boolean')value=String(value);
  if(typeof value!=='string')return cbsVisibilityUnknown(state,'unknown-value');
  if(value.length>CBS_VISIBILITY_LIMITS.outputChars)return cbsVisibilityUnknown(state,'context-value-limit');
  if(value.includes('{{')||value.includes('}}')||value.includes('{#')||value.includes('#}'))cbsVisibilityStop(state,'expanded-cbs');
  return value;
}
function cbsVisibilityVariable(state,global,key){
  if(key===null)return null;
  const map=cbsVisibilityDescriptor(state.context,global?'globals':'variables')?.value,descriptor=cbsVisibilityDescriptor(map,key);
  if(!descriptor)return cbsVisibilityUnknown(state,global?'missing-global':'missing-variable');
  return cbsVisibilityValue(descriptor.value,state);
}
function cbsVisibilityActor(state,field){const descriptor=cbsVisibilityDescriptor(state.context,field);return descriptor?cbsVisibilityValue(descriptor.value,state):cbsVisibilityUnknown(state,'missing-actor');}

function cbsVisibilityScan(source,state){
  let cursor=0;
  function parts(depth,inside){
    if(depth>CBS_VISIBILITY_LIMITS.depth)cbsVisibilityStop(state,'depth-limit');
    const result=[];
    while(cursor<source.length){
      if(source.startsWith('}}',cursor)){if(!inside)cbsVisibilityStop(state,'unmatched-close');cursor+=2;return result;}
      if(source.startsWith('{{',cursor)){cbsVisibilityNode(state);const start=cursor;cursor+=2;const content=parts(depth+1,true);result.push({kind:'tag',parts:content,start,end:cursor});continue;}
      const open=source.indexOf('{{',cursor),close=source.indexOf('}}',cursor),end=Math.min(open<0?source.length:open,close<0?source.length:close);
      if(end===cursor)cbsVisibilityStop(state,'malformed-braces');cbsVisibilityNode(state);result.push({kind:'text',text:source.slice(cursor,end)});cursor=end;
    }
    if(inside)cbsVisibilityStop(state,'unclosed-tag');return result;
  }
  return parts(0,false);
}
function cbsVisibilityStatic(tag,state){
  const first=tag.parts[0];if(!first||first.kind!=='text')cbsVisibilityStop(state,'dynamic-command');const text=first.text;
  if(text.startsWith('//'))return{kind:'inline',name:'//'};
  if(text.startsWith('? '))return{kind:'inline',name:'?'};
  if(text.startsWith('#')){const match=text.match(/^#(when|if_pure|if)(?=$| |::)/);if(!match)cbsVisibilityStop(state,/^#(?:func|function)/.test(text)?'side-effect':'unsupported-block');return{kind:'open',name:match[1]};}
  if(text.startsWith('/'))return{kind:'close',name:text.slice(1)};
  if(text.startsWith(':')){if(text!==':else'||tag.parts.length!==1)cbsVisibilityStop(state,'unsupported-branch');return{kind:'else'};}
  const index=text.indexOf(':'),name=cbsVisibilityName(index<0?text:text.slice(0,index));
  if(CBS_VISIBILITY_WRITES.has(name)||/^(?:set|add|delete|remove|unset|push|pop|insert|splice).*var$/.test(name))cbsVisibilityStop(state,'side-effect');
  if(!CBS_VISIBILITY_READS.has(name)&&!CBS_VISIBILITY_RANDOM.has(name))cbsVisibilityStop(state,'unsupported-inline');
  return{kind:'inline',name};
}
function cbsVisibilityValidateParts(parts,state,depth){
  if(depth>CBS_VISIBILITY_LIMITS.depth)cbsVisibilityStop(state,'depth-limit');
  for(const node of parts)if(node.kind==='tag'){cbsVisibilityNode(state);const info=cbsVisibilityStatic(node,state);if(info.kind!=='inline')cbsVisibilityStop(state,'nested-inline-block');node.info=info;cbsVisibilityValidateParts(node.parts,state,depth+1);}
}
function cbsVisibilityTree(tokens,state){
  const result=[],stack=[{name:'',target:result}];
  for(const token of tokens){
    const frame=stack.at(-1);if(token.kind==='text'){frame.target.push(token);continue;}
    const info=cbsVisibilityStatic(token,state);token.info=info;cbsVisibilityValidateParts(token.parts,state,stack.length);
    if(info.kind==='open'){
      if(stack.length>CBS_VISIBILITY_LIMITS.depth)cbsVisibilityStop(state,'depth-limit');
      const block={kind:'block',name:info.name,header:token,yes:[],no:[],hasElse:false};frame.target.push(block);stack.push({name:info.name,block,target:block.yes});
    }else if(info.kind==='else'){
      if(stack.length===1||frame.name!=='when'||frame.block.hasElse)cbsVisibilityStop(state,'misplaced-else');frame.block.hasElse=true;frame.block.elseToken=token;frame.target=frame.block.no;
    }else if(info.kind==='close'){
      if(token.parts.length!==1||stack.length===1||(info.name&&info.name!==frame.name))cbsVisibilityStop(state,'mismatched-block-close');
      if(frame.block.hasElse){const body=state.source.slice(frame.block.header.end,token.start),elseToken=frame.block.elseToken;if(body.includes('\n')){const lineStart=state.source.lastIndexOf('\n',elseToken.start-1)+1,lineEnd=state.source.indexOf('\n',elseToken.end),before=state.source.slice(Math.max(frame.block.header.end,lineStart),elseToken.start),after=state.source.slice(elseToken.end,lineEnd<0?token.start:Math.min(token.start,lineEnd));if(before.trim()||after.trim())cbsVisibilityStop(state,'else-line-layout');}else if(cbsVisibilityMayNewline(frame.block.yes,state)||cbsVisibilityMayNewline(frame.block.no,state))cbsVisibilityStop(state,'else-line-layout');}
      stack.pop();
    }else frame.target.push(token);
  }
  if(stack.length!==1)cbsVisibilityStop(state,'unclosed-block');return result;
}

function cbsVisibilityJoin(parts,state){
  const values=[];let length=0,unknown=false;
  for(const part of parts){const value=part.kind==='text'?part.text:cbsVisibilityInline(part,state);if(value===null){unknown=true;continue;}length+=value.length;if(length>CBS_VISIBILITY_LIMITS.outputChars)cbsVisibilityStop(state,'output-limit');values.push(value);}
  return unknown?null:values.join('');
}
function cbsVisibilitySplit(text){const index=text.indexOf(':'),delimiter=index>=0&&text[index+1]===':'?'::':':';return text.split(delimiter);}
function cbsVisibilityArity(args,min,max,state){if(args.length<min||args.length>max)cbsVisibilityStop(state,'argument-count');}
function cbsVisibilityArray(args,state){
  if(args.length!==1)return args;
  try{const value=JSON.parse(args[0]);if(Array.isArray(value)){if(value.length>CBS_VISIBILITY_LIMITS.expressionTokens)cbsVisibilityStop(state,'expression-limit');return value;}}catch(error){if(error===state.stop)throw error;}
  return args[0].split('§');
}
function cbsVisibilityInline(tag,state){
  cbsVisibilityNode(state);const info=tag.info||cbsVisibilityStatic(tag,state);
  if(info.name==='//')return'';
  if(CBS_VISIBILITY_RANDOM.has(info.name))return cbsVisibilityUnknown(state,'nondeterministic');
  const expanded=cbsVisibilityJoin(tag.parts,state);if(expanded===null)return null;
  if(info.name==='?')return cbsVisibilityExpression(expanded.slice(2),state);
  const [rawName,...args]=cbsVisibilitySplit(expanded),name=cbsVisibilityName(rawName);if(name!==info.name)cbsVisibilityStop(state,'dynamic-command');
  if(name==='user'||name==='char'||name==='bot'){cbsVisibilityArity(args,0,0,state);return cbsVisibilityActor(state,name==='user'?'userName':'characterName');}
  if(name==='blank'||name==='none'||name==='br'||name==='newline'){cbsVisibilityArity(args,0,0,state);return name==='br'||name==='newline'?'\n':'';}
  if(name==='getvar'||name==='getglobalvar'){cbsVisibilityArity(args,1,1,state);return cbsVisibilityVariable(state,name==='getglobalvar',args[0]);}
  if(name==='calc'){cbsVisibilityArity(args,1,1,state);return cbsVisibilityExpression(args[0],state);}
  if(name==='not'){cbsVisibilityArity(args,1,1,state);return cbsVisibilityBit(args[0]!=='1');}
  if(name==='all'||name==='any'){cbsVisibilityArity(args,1,CBS_VISIBILITY_LIMITS.expressionTokens,state);const values=cbsVisibilityArray(args,state);return cbsVisibilityBit(name==='all'?values.every(value=>value==='1'):values.some(value=>value==='1'));}
  cbsVisibilityArity(args,2,2,state);const[a,b]=args;
  switch(name){
    case'equal':return cbsVisibilityBit(a===b);
    case'notequal':return cbsVisibilityBit(a!==b);
    case'greater':return cbsVisibilityBit(Number(a)>Number(b));
    case'less':return cbsVisibilityBit(Number(a)<Number(b));
    case'greaterequal':return cbsVisibilityBit(Number(a)>=Number(b));
    case'lessequal':return cbsVisibilityBit(Number(a)<=Number(b));
    case'and':return cbsVisibilityBit(a==='1'&&b==='1');
    case'or':return cbsVisibilityBit(a==='1'||b==='1');
    default:cbsVisibilityStop(state,'unsupported-inline');
  }
}
function cbsVisibilityMayNewline(nodes,state){
  // Inline substitution can turn a one-line else into a malformed multiline host block.
  for(const node of nodes){cbsVisibilityNode(state);if(node.kind==='text'){if(node.text.includes('\n'))return true;}else if(node.kind==='block'){if(cbsVisibilityMayNewline(node.yes,state)||cbsVisibilityMayNewline(node.no,state))return true;}else{const value=cbsVisibilityInline(node,state);if(value===null||value.includes('\n'))return true;}}
  return false;
}

function cbsVisibilityCondition(block,state){
  const text=cbsVisibilityJoin(block.header.parts,state);if(text===null)return{value:null,mode:'normal'};
  if(block.name==='if'||block.name==='if_pure')return{value:cbsVisibilityTruthy(text.split(' ',2)[1]),mode:block.name==='if_pure'?'keep':'legacy'};
  if(text.startsWith('#when '))return{value:cbsVisibilityTruthy(text.split(' ',2)[1]),mode:'normal'};
  if(text==='#when')return{value:false,mode:'normal'};
  if(!text.startsWith('#when::'))cbsVisibilityStop(state,'unsupported-condition');
  const values=text.split('::').slice(1);let mode='normal';
  // Risu's actual when reducer is right-to-left, including variable operators and mode switches.
  while(values.length>1){
    cbsVisibilityNode(state);const value=values.pop(),operator=values.pop();
    if(operator==='keep'||operator==='legacy'){mode=operator;values.push(value);continue;}
    if(operator==='not'){values.push(cbsVisibilityBit(!cbsVisibilityTruthy(value)));continue;}
    if(operator==='var'||operator==='toggle'){const result=cbsVisibilityVariable(state,operator==='toggle',operator==='toggle'?'toggle_'+value:value);if(result===null)return{value:null,mode};values.push(cbsVisibilityBit(cbsVisibilityTruthy(result)));continue;}
    if(!['and','or','is','isnot','>','>=','<','<=','vis','visnot','tis','tisnot'].includes(operator))cbsVisibilityStop(state,'unsupported-condition');
    if(!values.length)cbsVisibilityStop(state,'argument-count');const left=values.pop();let answer;
    if(['vis','visnot','tis','tisnot'].includes(operator)){const global=operator.startsWith('t'),read=cbsVisibilityVariable(state,global,global?'toggle_'+left:left);if(read===null)return{value:null,mode};answer=operator.endsWith('not')?read!==value:read===value;}
    else switch(operator){
      case'and':answer=cbsVisibilityTruthy(left)&&cbsVisibilityTruthy(value);break;
      case'or':answer=cbsVisibilityTruthy(left)||cbsVisibilityTruthy(value);break;
      case'is':answer=left===value;break;
      case'isnot':answer=left!==value;break;
      case'>':answer=parseFloat(left)>parseFloat(value);break;
      case'>=':answer=parseFloat(left)>=parseFloat(value);break;
      case'<':answer=parseFloat(left)<parseFloat(value);break;
      case'<=':answer=parseFloat(left)<=parseFloat(value);break;
    }
    values.push(cbsVisibilityBit(answer));
  }
  return{value:cbsVisibilityTruthy(values[0]),mode};
}

// Bounded arithmetic parser. No eval, Function, host function lookup, random generator or property access.
function cbsVisibilityExpression(input,state){
  if(input.length>CBS_VISIBILITY_LIMITS.expressionChars)return cbsVisibilityUnknown(state,'expression-limit');
  const tokens=[];let cursor=0,unknown=false;
  while(cursor<input.length){
    const char=input[cursor];if(/\s/.test(char)){cursor++;continue;}
    if(tokens.length>=CBS_VISIBILITY_LIMITS.expressionTokens)return cbsVisibilityUnknown(state,'expression-limit');cbsVisibilityNode(state);
    if(char==='$'||char==='@'){
      const found=input.slice(cursor+1).match(/^[A-Za-z0-9_]+/);if(!found)return cbsVisibilityUnknown(state,'invalid-expression');const value=cbsVisibilityVariable(state,char==='@',found[0]);cursor+=1+found[0].length;
      if(value===null){unknown=true;tokens.push({type:'number',value:0});}else{const number=parseFloat(value);if(!Number.isFinite(number)){if(value==='null')tokens.push({type:'number',value:0});else return cbsVisibilityUnknown(state,'invalid-numeric-variable');}else tokens.push({type:'number',value:number});}continue;
    }
    const number=input.slice(cursor).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);if(number){if(Number(number[0])===0&&number[0]!=='0')return cbsVisibilityUnknown(state,'ambiguous-numeric-literal');tokens.push({type:'number',value:Number(number[0])});cursor+=number[0].length;continue;}
    const literal=input.slice(cursor).match(/^null(?![A-Za-z0-9_])/i);if(literal){tokens.push({type:'number',value:0});cursor+=literal[0].length;continue;}
    const pair=input.slice(cursor,cursor+2);if(['<=','>=','==','!=','&&','||'].includes(pair)){tokens.push({type:'operator',value:pair});cursor+=2;continue;}
    if('()+-*/%^<>=!&|≤≥≠'.includes(char)){tokens.push({type:'operator',value:char});cursor++;continue;}
    return cbsVisibilityUnknown(state,'invalid-expression');
  }
  if(unknown)return null;if(!tokens.length)return cbsVisibilityUnknown(state,'invalid-expression');let index=0;
  const precedence={'+':2,'-':2,'*':3,'/':3,'%':3,'^':4,'<':1,'>':1,'<=':1,'>=':1,'≤':1,'≥':1,'==':1,'=':1,'!=':1,'≠':1,'&&':1,'&':1,'||':1,'|':1};
  const invalid={};
  function parse(minimum=0,depth=0){
    if(depth>CBS_VISIBILITY_LIMITS.depth)throw invalid;
    const token=tokens[index++];if(!token)throw invalid;let value;
    if(token.type==='number')value=token.value;
    else if(token.value==='('){value=parse(0,depth+1);if(tokens[index++]?.value!==')')throw invalid;}
    else if(token.value==='-'||token.value==='+'||token.value==='!'){if(token.value!=='!'&&tokens[index]?.type!=='number')throw invalid;const operand=parse(5,depth+1);if(token.value==='-'&&operand===0)throw invalid;value=token.value==='-'?-operand:token.value==='!'?(operand?0:1):operand;}
    else throw invalid;
    while(index<tokens.length){const operator=tokens[index].value,rank=precedence[operator];if(rank===undefined||rank<minimum)break;index++;const right=parse(rank+1,depth+1);
      switch(operator){
        case'+':value+=right;break;case'-':value-=right;break;case'*':value*=right;break;case'/':value/=right;break;case'%':value%=right;break;case'^':value=value**right;break;
        case'<':value=Number(value<right);break;case'>':value=Number(value>right);break;case'<=':case'≤':value=Number(value<=right);break;case'>=':case'≥':value=Number(value>=right);break;
        case'==':case'=':value=Number(value===right);break;case'!=':case'≠':value=Number(value!==right);break;case'&&':case'&':value=value&&right;break;case'||':case'|':value=value||right;break;
      }
      if(!Number.isFinite(value))throw invalid;
    }
    return value;
  }
  try{const value=parse();if(index!==tokens.length||!Number.isFinite(value))return cbsVisibilityUnknown(state,'invalid-expression');return String(value);}catch(error){if(error===state.stop)throw error;return cbsVisibilityUnknown(state,'invalid-expression');}
}
function cbsVisibilityWhitespace(text,mode){
  if(mode==='keep')return text;if(mode==='legacy')return text.trim().split('\n').map(line=>line.trimStart()).join('\n').trim();
  const lines=text.split('\n');while(lines.length&&lines[0].trim()==='')lines.shift();while(lines.length&&lines.at(-1).trim()==='')lines.pop();return lines.join('\n');
}
function cbsVisibilityRender(nodes,state,depth=0){
  if(depth>CBS_VISIBILITY_LIMITS.depth)cbsVisibilityStop(state,'depth-limit');const result=[];let length=0;
  for(const node of nodes){cbsVisibilityNode(state);let text='';
    if(node.kind==='text')text=node.text;
    else if(node.kind==='tag'){const value=cbsVisibilityInline(node,state);if(value===null){state.unknownInline++;if(['user','char','bot'].includes(node.info?.name))text='{{'+node.info.name+'}}';}else text=value;}
    else{
      state.evaluatedBlocks++;const condition=cbsVisibilityCondition(node,state);
      if(condition.value===null){state.unknownBlocks++;continue;}
      if(node.hasElse&&condition.mode==='legacy')cbsVisibilityStop(state,'legacy-else');
      if(!condition.value||node.hasElse)state.hiddenBlocks++;
      text=cbsVisibilityWhitespace(cbsVisibilityRender(condition.value?node.yes:node.no,state,depth+1),condition.mode);
    }
    length+=text.length;if(length>CBS_VISIBILITY_LIMITS.outputChars)cbsVisibilityStop(state,'output-limit');result.push(text);
  }
  return result.join('');
}

/** Only scalar context values are read. Missing values stay unknown rather than becoming null/zero. */
export function evaluateCbsVisibility(text,context={}){
  const state={context,source:typeof text==='string'?text:'',reasonCodes:new Set(),stop:{},nodes:0,hiddenBlocks:0,unknownBlocks:0,unknownInline:0,evaluatedBlocks:0,unsupported:false};
  const hasCbs=typeof text==='string'&&(/\{\{|\}\}|(?:^|[^{])\{#/.test(text));let output='';
  try{
    if(typeof text!=='string')cbsVisibilityStop(state,'invalid-input');if(text.length>CBS_VISIBILITY_LIMITS.inputChars)cbsVisibilityStop(state,'input-limit');
    if(!hasCbs)output=text;
    else{if(/(?:^|[^{])\{#/.test(text))cbsVisibilityStop(state,'unsupported-legacy-braces');output=cbsVisibilityRender(cbsVisibilityTree(cbsVisibilityScan(text,state),state),state);const check=output.replace(/\{\{(?:user|char|bot)\}\}/g,'');if(/\{\{|\}\}|(?:^|[^{])\{#/.test(check))cbsVisibilityStop(state,'expanded-cbs');}
  }catch(error){output='';if(error!==state.stop){state.unsupported=true;state.reasonCodes.add('invalid-structure');}}
  return{text:output,hasCbs,hiddenBlocks:state.hiddenBlocks,unknownBlocks:state.unknownBlocks,unknownInline:state.unknownInline,evaluatedBlocks:state.evaluatedBlocks,unsupported:state.unsupported,skipped:state.unsupported,reasonCodes:[...state.reasonCodes]};
}
