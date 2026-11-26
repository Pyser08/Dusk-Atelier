// 신고 #22: 장기기억이 '나'로 묶는 이름 — 지금 고른 페르소나·username만(모든 페르소나 X). engine/pastpersona.js liveUserNames 참고.
import { dbRead } from "./dbcache.js";
import { liveUserNames } from "../engine/pastpersona.js";
export async function loadLiveUserNames(api) {
  try { return liveUserNames(await dbRead(api, ["username", "personas", "selectedPersona"])); } catch { return []; }
}
