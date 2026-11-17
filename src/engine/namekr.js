// addon-rebuild: 띄어쓰기 없는 한국 이름(성 한 글자 + 이름) 맞추기 — 애드온 전용(engine/memorylines.js의 canonName은 코어 공유라 감싸서 쓴다).
// '하연'(이름만)과 '지하연'(성+이름)을 같은 사람으로 본다. 기존 canonName은 성이 두 글자 이상일 때만 맞춰서(아리스·리스 같은 오합 방지) 한국 이름 성 한 글자를 놓쳤다.
// 첫 글자가 흔한 한국 성일 때만, 그리고 맞는 사람이 딱 한 명일 때만 합친다.
import { canonName } from "./memorylines.js";
export const KO_SURNAMES = new Set("김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부".split(""));
const HANGUL = /^[가-힣]+$/;
const nk = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
// a·b 중 하나가 '성 한 글자 + 다른 쪽'이면 true (다른 쪽은 2글자 이상)
export function sameKoreanPerson(a, b) {
  const x = nk(a), y = nk(b);
  if (!HANGUL.test(x) || !HANGUL.test(y) || x === y) return false;
  const [s, l] = x.length < y.length ? [x, y] : [y, x];
  return s.length >= 2 && l.length === s.length + 1 && KO_SURNAMES.has(l[0]) && l.slice(1) === s;
}
export function canonNameKo(name, known = [], extra = []) {
  const r = canonName(name, known, extra);
  if (!r || r === "{{user}}") return r;
  const k = nk(r);
  if (known.some((p) => nk(p.name) === k || (p.aliases ?? []).some((a) => nk(a) === k))) return r;   // 이미 맞춘 이름
  const hit = known.filter((p) => [p.name, ...(p.aliases ?? [])].some((n) => sameKoreanPerson(r, n)));
  return hit.length === 1 ? hit[0].name : r;
}
