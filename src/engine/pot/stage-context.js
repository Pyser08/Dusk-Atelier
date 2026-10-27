// 출처: risupot 2.3.0 src/stage-context.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

export const STAGE_CONTEXT_MAX = 200;
export function stageContextCount(settings, stage) {
  const value = settings?.stageContext?.[stage];
  if (Number.isSafeInteger(value) && value >= 0) return Math.min(STAGE_CONTEXT_MAX, value);
  if (stage === 'writer') return 2;
  // Older Director runs consumed Router's context. Preserve that behavior on migration.
  const router = settings?.models?.stages?.router;
  const preset = router?.mode === 'dedicated' ? router.preset : settings?.models?.shared;
  return Math.min(STAGE_CONTEXT_MAX, Math.max(0, preset?.contextWindow ?? 2));
}
export function recentStageMessages(messages, end, count, getText, appendedUser = null) {
  const limit = Math.max(0, Math.min(STAGE_CONTEXT_MAX, count));
  if (!limit) return [];
  const available = Math.max(0, limit - (appendedUser === null ? 0 : 1));
  const recent = messages.slice(Math.max(0, end - available), end).map((message, index) => ({position:index - available, role:message.role, text:getText(message)}));
  if (appendedUser !== null) recent.push({position:0, role:'user', text:appendedUser});
  return recent;
}
