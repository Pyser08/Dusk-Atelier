// 애인 판정(순수). 기록기가 남긴 오래가는 관계(tie: "B는 A의 무엇") 중 연인·배우자처럼 명확한 말이 있을 때만 애인으로 본다.
// 짝사랑·썸·전 애인·위장 연애처럼 애매하거나 지난 관계는 애인이 아니다. 사용자가 위키에서 직접 정한 값(folder.lovers)이 우선.
import { liveTies } from "./memoryplus.js";

const nk = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const LOVER_RE = /(연인|애인|여자\s*친구|남자\s*친구|여친|남친|아내|남편|부인|배우자|약혼|부부|신부|신랑|와이프|허즈번드|girl\s*friend|boy\s*friend|lover|wife|husband|spouse|fianc|romantic\s*partner|sweetheart)/i;
const NOT_RE = /(^|\s)(전|옛|예전|이전)\s*|전(남친|여친|남편|아내|애인|연인)|前|\bex[-\s]?|former|짝사랑|썸|crush|되고\s*싶|원하는|wants?\b|wannabe|가짜|위장|계약|fake|pretend|친구\s*같은|소꿉|사별|이혼|divorc|widow|헤어진|broke\s*up/i;

export function isLoverKind(kind) {
  const k = String(kind ?? "").trim();
  return !!k && LOVER_RE.test(k) && !NOT_RE.test(k);
}
export const pairKey = (a, b) => [nk(a), nk(b)].sort().join("~");

// 애인인 쌍 목록: [{ a, b, kind, at, by: "tie" | "user" }]. 방향 없음(한쪽만 적혀 있어도 둘 다).
export function loverPairs(folder) {
  const out = new Map();
  for (const t of liveTies(folder)) {
    if (!isLoverKind(t.kind)) continue;
    const k = pairKey(t.a, t.b);
    if (!out.has(k) || (t.at ?? -1) > (out.get(k).at ?? -1)) out.set(k, { a: t.a, b: t.b, kind: t.kind, at: t.at ?? null, by: "tie" });
  }
  for (const [k, v] of Object.entries(folder?.lovers ?? {})) {
    if (v === false) out.delete(k);
    else if (v && typeof v === "object" && v.on) out.set(k, { a: v.a, b: v.b, kind: v.kind || "애인", at: null, by: "user" });
  }
  return [...out.values()];
}
export const isLover = (folder, a, b) => !!a && !!b && nk(a) !== nk(b) && loverPairs(folder).some((p) => pairKey(p.a, p.b) === pairKey(a, b));
export function loverOf(folder, name) {
  const n = nk(name);
  return loverPairs(folder).filter((p) => nk(p.a) === n || nk(p.b) === n).map((p) => ({ ...p, other: nk(p.a) === n ? p.b : p.a }));
}

// 사용자가 위키에서 정하기: true = 애인으로, false = 애인 아님(자동 판정도 끔), null = 자동 판정으로 되돌리기
export function setLover(folder, a, b, on) {
  const k = pairKey(a, b);
  folder.lovers ??= {};
  if (on == null) delete folder.lovers[k];
  else folder.lovers[k] = on ? { on: true, a, b, kind: "애인" } : false;
  if (!Object.keys(folder.lovers).length) delete folder.lovers;
}
