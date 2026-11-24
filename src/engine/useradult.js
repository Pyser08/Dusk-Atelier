// 11-24: 나({{user}})의 성적 욕망·이상성향(순수). 위키 인물 문서가 없어 후보 칸을 못 쓰므로 채팅 폴더 f.userAdult에 둔다.
// 모양: [{ id, axis:"sexual_desire"|"paraphilia", text, src:"manual"|"roll", lock }]
import { rollAdult } from "./adultseed.js";
const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
export const userAdultList = (f) => (Array.isArray(f?.userAdult) ? f.userAdult : []).filter((x) => x?.id && clean(x.text));
export function addUserAdult(f, axis, text, src = "manual") {
  const t = clean(text), list = userAdultList(f); if (!t || list.length >= 30 || list.some((x) => x.axis === axis && x.text === t)) return false;
  const n = (f.userAdultSeq = (Number(f.userAdultSeq) || 0) + 1);
  f.userAdult = [...list, { id: `ua${n}`, axis: axis === "paraphilia" ? "paraphilia" : "sexual_desire", text: t, src, lock: false }]; return true;
}
export function delUserAdult(f, id) { f.userAdult = userAdultList(f).filter((x) => x.id !== id || x.lock); }
export function lockUserAdult(f, id) { f.userAdult = userAdultList(f).map((x) => (x.id === id ? { ...x, lock: !x.lock } : x)); }
// 무작위로 넣었던 것만(잠근 것 빼고) 빼고 새로 뽑는다. 직접 적은 것은 그대로
export function rerollUserAdult(f, name, opt) {
  const n = (f.userAdultRoll = (Number(f.userAdultRoll) || 0) + 1), r = rollAdult(`${name}#${n}`, null, opt);
  f.userAdult = userAdultList(f).filter((x) => x.src !== "roll" || x.lock);
  for (const t of r.desires) addUserAdult(f, "sexual_desire", t, "roll");
  for (const t of r.kinks) addUserAdult(f, "paraphilia", t, "roll");
  return r;
}
export const userAdultText = (f, axis) => userAdultList(f).filter((x) => x.axis === axis).map((x) => x.text).join("\n");
export const userAdultProfile = (f) => [["sexual_desire", "성적 욕망"], ["paraphilia", "이상성향"]].map(([a, l]) => { const t = userAdultText(f, a); return t && `${l}: ${t}`; }).filter(Boolean).join("\n");
