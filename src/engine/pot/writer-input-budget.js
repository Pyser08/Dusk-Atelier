// 출처: risupot 2.3.0 src/writer-input-budget.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

export const WRITER_INPUT_BUDGET_DEFAULT=48000;
const WRITER_INPUT_BUDGET_LIMITS=Object.freeze({minimum:1000,maximum:1000000,step:1000});
export function validateWriterInputBudget(value){
  if(!Number.isSafeInteger(value)||value<WRITER_INPUT_BUDGET_LIMITS.minimum||value>WRITER_INPUT_BUDGET_LIMITS.maximum)throw new Error('Writer 입력 예산은 1,000~1,000,000 사이의 정수로 입력해주세요.');
  return value;
}
export function writerInputBudgetTokens(settings){return settings?.writerInputBudgetTokens===undefined?WRITER_INPUT_BUDGET_DEFAULT:validateWriterInputBudget(settings.writerInputBudgetTokens);}
