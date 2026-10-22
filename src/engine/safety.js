import { USER_KEYS, applyView } from './merge3.js';

export var isGenerating = (ch) => (ch?.chats ?? []).some((c) => c?.isStreaming === true || c?.message?.at?.(-1)?.isStreaming === true || c?.message?.at?.(-1)?.streaming === true);
export var Busy = class extends Error {
  constructor() {
    super("응답을 생성하는 중입니다. 생성이 끝난 뒤 다시 시도해 주세요. (에셋은 이미 올라가 있어 다음엔 빨리 끝납니다)");
    this.name = "Busy";
  }
};
export function restoreFromBackup(kind, current, snapshot) {
  if (kind === "character") return applyView(current, Object.fromEntries(Object.keys({ ...current, ...snapshot }).filter((k) => !USER_KEYS.includes(k)).map((k) => [k, snapshot[k]])), { userKeys: USER_KEYS });
  return { ...snapshot, id: current.id };
}
export var backupSnapshot = (kind, obj) => kind === "character" ? Object.fromEntries(Object.entries(obj).filter(([k]) => !["chats"].includes(k))) : obj;
