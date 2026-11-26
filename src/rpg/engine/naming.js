// Dusk Saga 고유 이름: 프리셋에서 온 무기('철의 창')와 공용 기술('선제 강공')은 성능은 그대로, 이름만 그 인물답게 새로 짓는다.
// 같은 인물·같은 물건이면 늘 같은 이름(이름으로 정해지는 흔들림). 모델이 이미 고유 이름을 줬으면 건드리지 않는다.
import { KINDS } from "./gear.js";

const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h; };
const pick = (l, k) => l[hash(k) % l.length];
// 속성별 수식어, 없으면 직업·분위기
const ADJ = {
  fire: ["불씨", "잉걸", "홍련", "작열", "붉은 맹세", "화톳"], water: ["물결", "청류", "심해", "이슬", "여울"], ice: ["서리꽃", "백야", "빙설", "한설", "얼음달"], thunder: ["벼락", "천둥", "섬광", "뇌명", "번개꼬리"],
  wind: ["바람결", "질풍", "회오리", "산들", "창공"], earth: ["대지", "바위심", "모래성", "황토"], plant: ["새싹", "가시덩굴", "고목", "숲그늘"], poison: ["독니", "자줏빛", "늪안개"], light: ["새벽빛", "성광", "은혜", "백은"],
  dark: ["달그림자", "흑요", "밤안개", "검은 깃"], steel: ["강철심", "무쇠", "백련"], blood: ["혈흔", "선홍"], arcane: ["별부스러기", "비전", "자수정"], sound: ["메아리", "울림"], gravity: ["무게", "심연"],
  "": ["잿빛", "황혼", "청람", "고요", "유랑", "맹세", "늑대이빨", "회색 바람", "옛 약속", "단풍", "철새", "등불", "첫눈", "들불"],
};
const GENERIC = /^(?:(?:청동|철|강철|은|용사|병사|기사|평범한|낡은|녹슨|훈련용)의?\s*)?(?:검|장검|단검|창|도끼|활|석궁|지팡이|마도서|방패|권갑|발톱|도|세검|대검|망치|낫|채찍|부채|수리검|완드|보주|부적|권총|소총|저격총|산탄총|미늘창|삼지창|투창|손도끼|장궁|단궁|치유의 지팡이|번개의 서|불씨의 서|바람의 서)$/;
/** 무기 이름이 흔한 프리셋 이름인가 */
export const genericWeapon = (w, d) => !!w && w.type !== "item" && (GENERIC.test(String(w.name || "").trim()) || String(w.name || "").trim() === KINDS[w.kind]?.n || (!!d?.name && new RegExp("^" + d.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "의 \\S+$").test(String(w.name || ""))));
export function weaponName(d, w) {
  const noun = KINDS[w.kind]?.n || String(w.name || "무기").replace(/^.*\s/, "").replace(/^(청동|철|강철|은)의/, "") || "무기", a = pick(ADJ[w.elem] || ADJ[""], d.name + "|" + noun);
  return (a + " " + noun).slice(0, 14);
}
// 공용 기술 → 이름 틀(성능은 같다). {a}=인물다운 수식어
const SK = {
  deathblow: ["{a} 선수", "{a}의 첫 일격", "{a} 돌파"], armorblow: ["{a} 견진", "{a} 맞섬"], dartblow: ["{a} 선보", "{a} 질주"], wardblow: ["{a} 결계 돌입", "{a} 진언"], guard: ["{a} 방어 자세", "{a} 철벽"],
  bond: ["{a} 호흡", "등을 맡긴 {a}"], renewal: ["{a} 숨결", "{a} 재기"], flurry: ["{a} 연참", "{a} 두 번 베기", "{a} 쌍격"], focus: ["{a} 집중", "{a} 노림수"], pavise: ["{a} 방벽", "{a} 막아서기"],
  gapstrike: ["{a} 관통", "{a} 틈새 찌르기"], lifesteal: ["{a} 흡기", "{a} 생명 훔치기"], wrath: ["{a} 분노", "{a} 역린"], laststand: ["{a} 배수진", "{a} 마지막 불씨"], fullform: ["{a} 만전", "{a} 완숙"],
  riposte: ["{a} 되받아치기", "{a} 반격"], terrain: ["{a} 지형 읽기", "{a} 엄폐술"], lonewolf: ["외톨이 {a}", "{a} 독행"], smash: ["{a} 강타", "{a} 내리찍기"], breaker: ["{a} 파갑", "{a} 껍질 깨기"],
  surehit: ["{a} 필중", "빗나가지 않는 {a}"], ambush: ["{a} 기습", "그림자 속 {a}"], spellblade: ["{a} 마법검", "{a} 깃든 칼날"], str2: ["{a} 완력"], def2: ["{a} 단단함"], spd2: ["{a} 몸놀림"], hit15: ["{a} 눈썰미"], avo10: ["{a} 몸 피하기"],
};
export function skillName(d, sk) { const l = SK[sk.id] || ["{a} " + sk.name], el = (d.weapons || []).find((w) => w.elem)?.elem || ""; return pick(l, d.name + sk.id).replace("{a}", pick(ADJ[el] || ADJ[""], d.name + "#" + sk.id)).slice(0, 16); }
/** 판의 아군·이름 있는 적(보스·고유 이름)에게 고유 이름을 붙인다. 몇 개 바꿨는지 */
export function personalize(S, PRE = {}) {
  let n = 0; const B = S.battle; if (!B) return 0;
  for (const u of Object.values(B.units)) {
    const d = S.defs[u.ref]; if (!d || d.named) continue; const who = u.team === "ally" || u.boss || (d.name && !PRE[d.name.replace(/\s*\d+$/, "")]); if (!who) continue; d.named = true;
    for (const w of d.weapons) if (genericWeapon(w, d)) { w.name = weaponName(d, w); n++; }
    d.skills = d.skills.map((k) => { const sk = S.skills[k]; if (!sk || sk.tier !== "common") return k; const id = k + "_" + d.id, nm = skillName(d, sk); if (!S.skills[id]) S.skills[id] = { ...JSON.parse(JSON.stringify(sk)), id, name: nm, tier: "named", base: k }; n++; return id; });
  }
  return n;
}

// 자동으로 붙이는 고유 기술·범위 기술 이름: 수식어 + 무기 계열의 기술 낱말
const SIG = { sword: ["일섬", "참월", "난무", "역린베기", "월광참"], lance: ["관통", "천공찌르기", "돌격창", "유성창"], axe: ["대지 가르기", "분쇄", "투부", "산사태"], bow: ["관통 화살", "연사", "매의 눈", "유성시"], dagger: ["그림자 찌르기", "급소 찌르기", "칼춤", "독아"],
  tome: ["비전탄", "주문 낙인", "마력 폭주", "성흔"], staff: ["축복", "은총", "치유의 빛"], claw: ["연권", "철권", "맹호권", "파쇄장"], item: ["비기"] };
const AOE2 = { sword: ["회오리베기", "선풍참", "원월참"], lance: ["휩쓸기", "창의 원무"], axe: ["대회전", "지진 일격"], bow: ["화살비", "산탄사격"], dagger: ["칼날 폭풍", "난무"], tome: ["폭렬", "연쇄 폭발", "광역 주문"], staff: ["빛의 고리"], claw: ["폭풍 연타", "충격파"] };
export function sigName(d, w, area) { const l = (area ? AOE2 : SIG)[w?.type] || (area ? ["휩쓸기"] : ["비기"]), el = w?.elem || ""; return (pick(ADJ[el] || ADJ[""], d.name + (area ? "@aoe" : "@sig")) + " " + pick(l, d.name + (w?.name || ""))).slice(0, 16); }
