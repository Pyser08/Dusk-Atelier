// addon-rebuild 4단계: Erosync 순수 조각 — CBS 조건문·변수 해석. 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.

export function cbsTagEnd(source, start) {
  let depth = 0;
  for (let index = start; index < source.length - 1; index += 1) {
    if (source[index] === '{' && source[index + 1] === '{') { depth += 1; index += 1; continue; }
    if (source[index] === '}' && source[index + 1] === '}') {
      depth -= 1;
      index += 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

export function stripCbsTemplateTags(value) {
  let text = String(value || '');
  for (let pass = 0; pass < 10; pass += 1) {
    const next = text
      .replace(/\{\{#(if|when|each|if_pure)[^{}]*(\{\{[^{}]*\}\}[^{}]*)*\}\}/gi, '')
      .replace(/\{\{\/(if|when|each|if_pure)?\}\}/gi, '')
      .replace(/\{\{else(?:[^{}]*)\}\}/gi, '')
      .replace(/\{\{[^{}]*\}\}/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    if (next === text) break;
    text = next;
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function appendPrimitiveVariables(target, value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (['string', 'number', 'boolean'].includes(typeof item) || item === null) target[String(key)] = item;
  }
}

// 로어북 조건 블록의 계산식(2026-10-22, 이용자 제보): 리스는 `{{#if {{? ($x=1)|($x=2)}}}}`처럼 계산식으로 토글을 거는데,
// 에로싱크는 이 꼴을 못 읽어 "미해결"로 두고 채팅 변수 블록을 통째로 남겼다(꺼진 가지까지 분석에 들어감).
// 리스 원본(src/ts/process/infunctions.ts calcString, src/ts/parser/chatVar.svelte.ts getChatVar)과 같은 규칙으로 평가한다.
//   - 괄호 안부터 계산, `$이름` = 채팅 변수(없으면 봇의 기본 변수 → 리스 기본 변수 틀 → 'null' → 0), `@이름` = 전역 채팅 변수
//   - 연산자 = != < > <= >= & | ! + - * / % ^ (`&&`·`||`·`==`도 됨), 숫자만 다루고 숫자가 아닌 토큰은 버린다(리스와 같음)
//   - `#if`는 결과의 첫 토큰이 1 또는 true일 때만 참
// 계산식 안의 {{getvar::}}·{{getglobalvar::}}·비교 함수도 먼저 푼다. 모르는 꼴이면 null을 돌려 지금처럼 둔다.
export function cbsParseKeyValue(template) {
  const result = [];
  if (typeof template !== 'string' || !template) return result;
  for (const line of template.split('\n')) {
    const [key, value] = line.split('=');
    if (key && value) result.push([key, value]);
  }
  return result;
}

export function buildConditionalVariableContext(db, character, chat) {
  const globalVariables = Object.create(null);
  const chatVariables = Object.create(null);
  const globalSources = [
    db?.globalChatVariables, db?.globalVariables, db?.globalVars, db?.scriptstate?.global,
    character?.globalChatVariables, character?.globalVariables, character?.globalVars,
    character?.scriptstate?.global, character?.data?.globalVariables, character?.data?.globalVars,
    chat?.globalChatVariables, chat?.globalVariables, chat?.scriptstate?.global,
    chat?.scriptState?.global, chat?.data?.globalVariables,
  ];
  const chatSources = [
    chat?.scriptstate?.variables, chat?.scriptstate?.vars, chat?.scriptstate,
    chat?.scriptState?.variables, chat?.scriptState?.vars, chat?.scriptState,
    chat?.variables, chat?.vars, chat?.data?.scriptstate?.variables,
    chat?.data?.scriptstate, chat?.data?.variables,
  ];
  globalSources.forEach((source) => appendPrimitiveVariables(globalVariables, source));
  chatSources.forEach((source) => appendPrimitiveVariables(chatVariables, source));
  // 기본 변수: 봇의 defaultVariables가 먼저, 리스의 templateDefaultVariables가 다음(리스 getChatVar의 find 순서)
  const defaultVariables = Object.create(null);
  for (const [key, value] of [...cbsParseKeyValue(character?.defaultVariables), ...cbsParseKeyValue(db?.templateDefaultVariables)]) {
    if (!Object.prototype.hasOwnProperty.call(defaultVariables, key)) defaultVariables[key] = value;
  }
  // 채팅에 따로 둔 전역 변수(useLocallySetGlobalVariables)
  const localGlobalVariables = Object.create(null);
  appendPrimitiveVariables(localGlobalVariables, chat?.GLGlobalVariables);
  return { globalVariables, chatVariables, defaultVariables, localGlobalVariables, chatAvailable: !!chat };
}

// 리스 getChatVar: scriptstate['$이름'] → 기본 변수 → 'null'
export function cbsChatVarValue(name, context) {
  const vars = context?.chatVariables;
  if (vars && typeof vars === 'object') {
    for (const key of [`$${name}`, name]) {
      if (Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== undefined && vars[key] !== null) return String(vars[key]);
    }
  }
  const defaults = context?.defaultVariables;
  if (defaults && typeof defaults === 'object' && Object.prototype.hasOwnProperty.call(defaults, name)) return String(defaults[name]);
  return 'null';
}

// 리스 getGlobalChatVar: 채팅에 따로 둔 값이 있으면 그것, 아니면 db.globalChatVariables → 'null'
export function cbsGlobalChatVarValue(name, context) {
  const local = context?.localGlobalVariables;
  if (local && typeof local === 'object' && Object.prototype.hasOwnProperty.call(local, name)) {
    const value = local[name];
    if (value !== undefined && value !== null && String(value) !== 'null' && String(value) !== '') return String(value);
  }
  const vars = context?.globalVariables;
  if (vars && typeof vars === 'object' && Object.prototype.hasOwnProperty.call(vars, name) && vars[name] !== undefined && vars[name] !== null) return String(vars[name]);
  return 'null';
}

export const CBS_CALC_OPERATORS = Object.freeze({
  '+': [2, 'L'], '-': [2, 'L'], '*': [3, 'L'], '/': [3, 'L'], '^': [4, 'L'], '%': [3, 'L'],
  '<': [1, 'L'], '>': [1, 'L'], '|': [1, 'L'], '&': [1, 'L'], '≤': [1, 'L'], '≥': [1, 'L'], '=': [1, 'L'], '≠': [1, 'L'], '!': [5, 'R'],
});

// 리스 toRPN 그대로: 숫자 토큰만 남기고 셔닝야드로 후위식을 만든다.
export function cbsCalcToRpn(expression) {
  const keys = Object.keys(CBS_CALC_OPERATORS);
  const text = String(expression).replace(/\s+/g, '');
  const tokens = [];
  let lastToken = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '-' && (index === 0 || keys.includes(text[index - 1]) || text[index - 1] === '(')) lastToken += char;
    else if (keys.includes(char)) {
      tokens.push(lastToken !== '' ? lastToken : '0');
      lastToken = '';
      tokens.push(char);
    } else lastToken += char;
  }
  tokens.push(lastToken !== '' ? lastToken : '0');
  let output = '';
  const stack = [];
  for (const token of tokens) {
    if (parseFloat(token) || token === '0') output += `${token} `;
    else if (keys.includes(token)) {
      const [precedence, associativity] = CBS_CALC_OPERATORS[token];
      while (stack.length > 0 && ((associativity === 'L' && precedence <= CBS_CALC_OPERATORS[stack[stack.length - 1]][0])
        || (associativity === 'R' && precedence < CBS_CALC_OPERATORS[stack[stack.length - 1]][0]))) output += `${stack.pop()} `;
      stack.push(token);
    }
  }
  while (stack.length > 0) output += `${stack.pop()} `;
  return output.trim();
}

// 리스 calculateRPN 그대로.
export function cbsCalcRpn(expression) {
  const stack = [];
  for (const token of String(expression).split(' ')) {
    if (parseFloat(token) || token === '0') { stack.push(parseFloat(token)); continue; }
    const b = stack.pop(), a = stack.pop();
    switch (token) {
      case '+': stack.push(a + b); break;
      case '-': stack.push(a - b); break;
      case '*': stack.push(a * b); break;
      case '/': stack.push(a / b); break;
      case '^': stack.push(a ** b); break;
      case '%': stack.push(a % b); break;
      case '<': stack.push(a < b ? 1 : 0); break;
      case '>': stack.push(a > b ? 1 : 0); break;
      case '|': stack.push(a || b); break;
      case '&': stack.push(a && b); break;
      case '≤': stack.push(a <= b ? 1 : 0); break;
      case '≥': stack.push(a >= b ? 1 : 0); break;
      case '=': stack.push(a === b ? 1 : 0); break;
      case '≠': stack.push(a !== b ? 1 : 0); break;
      case '!': stack.push(b ? 0 : 1); break;
      default: break;
    }
  }
  if (stack.length === 0) return 0;
  return stack.pop();
}

// 리스 executeRPNCalculation 그대로: 변수 치환 → 연산자 정리 → null → 0 → 후위식 계산.
export function cbsCalcExecute(text, context) {
  const number = value => { const parsed = parseFloat(value); return Number.isNaN(parsed) ? '0' : String(parsed); };
  const prepared = String(text)
    .replace(/\$([a-zA-Z0-9_]+)/g, (_, name) => number(cbsChatVarValue(name, context)))
    .replace(/@([a-zA-Z0-9_]+)/g, (_, name) => number(cbsGlobalChatVarValue(name, context)))
    .replace(/&&/g, '&').replace(/\|\|/g, '|').replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/==/g, '=').replace(/!=/g, '≠')
    .replace(/null/gi, '0');
  return cbsCalcRpn(cbsCalcToRpn(prepared));
}

// 리스 calcString 그대로: 괄호 안을 먼저 계산해 숫자로 바꾼다.
export function cbsCalcString(text, context) {
  const depth = [''];
  const source = String(text);
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') depth.push('');
    else if (char === ')' && depth.length > 1) {
      const result = String(cbsCalcExecute(depth.pop(), context));
      depth[depth.length - 1] += result;
    }
    else depth[depth.length - 1] += char;
  }
  return cbsCalcExecute(depth.join(''), context);
}

export function cbsValueTruthy(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (value === null || value === undefined) return false;
  const text = String(value).trim().toLowerCase();
  return text !== '' && !['0', 'false', 'null', 'undefined', 'off', 'no'].includes(text);
}

export function parseCbsLiteral(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  if (/^(?:true|false)$/i.test(text)) return /^true$/i.test(text);
  if (/^(?:null|undefined)$/i.test(text)) return null;
  return text;
}
