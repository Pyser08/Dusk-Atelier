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
export function primaryUserName(db) {
  const list = Array.isArray(db?.personas) ? db.personas : [];
  const n = list[db?.selectedPersona ?? 0]?.name;
  return ok(n) ? n.trim() : ok(db?.username) ? db.username.trim() : "";
}
export async function loadPrimaryUserName(api) {
  try { return primaryUserName(await dbRead(api, ["username", "personas", "selectedPersona"])); } catch { return ""; }
}
export async function loadUserNames(api) {
  try { return userNameList(await dbRead(api, ["username", "personas", "selectedPersona"])); } catch { return []; }
}
