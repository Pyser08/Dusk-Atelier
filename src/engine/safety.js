import { isUserField } from './tideplan.js';

export var isGenerating = (ch) => (ch?.chats ?? []).some((c) => c?.isStreaming === true || c?.message?.at?.(-1)?.isStreaming === true || c?.message?.at?.(-1)?.streaming === true);
export var Busy = class extends Error {
  constructor() {
    super("응답을 생성하는 중입니다. 생성이 끝난 뒤 다시 시도해 주세요. (에셋은 이미 올라가 있어 다음엔 빨리 끝납니다)");
    this.name = "Busy";
  }
};
// 백업 시점으로 되돌린다. 채팅·사용자 설정(TTS·메모리 등, RisuTide 기준)은 지금 것을 그대로 둔다.
// RisuTide 백업은 카드 필드만 있어(__tide = 들어 있는 필드 이름) 나머지는 지금 캐릭터에서 채운다.
export function restoreFromBackup(kind, current, snapshot) {
  if (kind !== "character") {
    const { __tide, ...m } = snapshot;
    return { ...m, id: current.id };
  }
  let snap = snapshot;
  if (Array.isArray(snapshot.__tide)) {
    snap = { ...current };
    for (const k of Object.keys(current)) if (!isUserField(k) && !snapshot.__tide.includes(k)) delete snap[k];
    for (const k of snapshot.__tide) snap[k] = snapshot[k];
  }
  const out = { ...current };
  for (const k of /* @__PURE__ */ new Set([...Object.keys(current), ...Object.keys(snap)])) {
    if (k === "__tide" || isUserField(k)) continue;
    if (snap[k] === void 0) delete out[k];
    else out[k] = snap[k];
  }
  return out;
}
export var backupSnapshot = (kind, obj) => kind === "character" ? Object.fromEntries(Object.entries(obj).filter(([k]) => !["chats"].includes(k))) : obj;
