// {{user}}(플레이어)를 가리키는 이름 모으기 (v1.9.3). db.username 하나만 보면 놓치는 경우가 있어서
// 지금 고른 페르소나 이름 · 모든 페르소나 이름 · 여러 단어 이름의 첫 단어까지 함께 모은다.
import { dbRead } from "./dbcache.js";
const ok = (n) => typeof n === "string" && n.trim().length >= 1;
export function userNameList(db) {
  const out = [];
  const add = (n) => { if (ok(n) && !out.some((x) => x.toLowerCase() === n.trim().toLowerCase())) out.push(n.trim()); };
  add(db?.username);
  const list = Array.isArray(db?.personas) ? db.personas : [];
  add(list[db?.selectedPersona ?? 0]?.name);
  for (const p of list) add(p?.name);
  for (const n of [...out]) { const w = n.split(/\s+/); if (w.length > 1 && w[0].length >= 2) add(w[0]); }
  return out;
}
// 화면에 {{user}} 대신 보여 줄 이름: 지금 고른 페르소나 → username
// chat.bindedPersona(채팅에 묶인 페르소나)가 있으면 그쪽이 먼저(버그 3: 페르소나를 바꿔도 예전 이름이 가운데 남던 문제)
export function primaryUserName(db, chat = null) {
  const list = Array.isArray(db?.personas) ? db.personas : [];
  const bound = chat?.bindedPersona ? list.find((p) => p?.id === chat.bindedPersona) : null;
  const n = bound?.name ?? list[db?.selectedPersona ?? 0]?.name;
  return ok(n) ? n.trim() : ok(db?.username) ? db.username.trim() : "";
}
// fresh: 캐시(45초)를 건너뛴다 — 리스 화면에서 페르소나를 바꾸면 api를 거치지 않아 캐시가 모른다.
export async function loadPrimaryUserName(api, { fresh = false, chat = null } = {}) {
  const keys = ["username", "personas", "selectedPersona"];
  try { return primaryUserName(fresh && typeof api.getDatabase === "function" ? await api.getDatabase(keys) : await dbRead(api, keys), chat); } catch { return ""; }
}
export async function loadUserNames(api) {
  try { return userNameList(await dbRead(api, ["username", "personas", "selectedPersona"])); } catch { return []; }
}
