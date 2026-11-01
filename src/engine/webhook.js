// 웹 도구 공급자 연결점 (v1.8.1). 공급자가 없으면 프롬프트를 그대로 한 번 부른다.
let wrap = null;
export function setWebWrapProvider(fn) { wrap = fn; }
export async function webWrap(stage, prompt, call) { return wrap ? wrap(stage, prompt, call) : call(prompt); }
