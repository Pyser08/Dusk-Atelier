// 유저({{user}}) NSFW 칸(순수): 리수폿은 유저용 인물 문서를 만들지 않아서, 문서 id로 저장하는 성인 프로필·성감대·몸 상태가 유저에게만 생기지 않았다.
// 위키 문서가 없으면 고정 키(actor:user)로 된 가짜 인물 문서를 하나 더해, 같은 저장 칸(folder.nsfw·folder.life)을 쓰게 한다. 위키에는 넣지 않는다.
import { userKeySet } from "./memoryuser.js";

export const USER_NSFW_ID = "actor:user";
let names = [];   // 지금 페르소나 이름들(화면·턴 처리 때 넣어 줌, 저장 안 함)
export function setUserNsfwNames(list) { names = [...new Set((list ?? []).map((n) => String(n ?? "").trim()).filter(Boolean))]; }
const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");

export function userNsfwDoc(extra = []) {
  const all = [...new Set([...names, ...extra].filter((n) => n && n !== "{{user}}"))];
  return { id: USER_NSFW_ID, type: "Character", title: all[0] || "{{user}}", aliases: ["{{user}}", "user", "유저", ...all.slice(1)], sections: [], virtual: true };
}
export const isUserNsfwDoc = (d) => d?.id === USER_NSFW_ID;
// 위키 인물 문서 + (유저 문서가 위키에 없으면) 유저 칸
export function characterDocs(f) {
  const docs = Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const set = userKeySet(names);
  if (docs.some((d) => [d.title, ...(d.aliases ?? [])].some((n) => set.has(key(n))))) return docs;
  return [...docs, userNsfwDoc()];
}
// 위키에 있는 인물 문서만(유저 칸 빼고) — 장면 계획·주입처럼 유저를 움직이면 안 되는 곳
export const npcDocs = (f) => characterDocs(f).filter((d) => !isUserNsfwDoc(d));
