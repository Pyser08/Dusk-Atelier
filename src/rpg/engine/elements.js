// Dusk Saga 엔진 — 속성. 속성이 없는 공격은 예전 규칙 그대로다
import { RACES } from "./races.js";
// 상성표: 공격 → 받는 쪽. 약점 ×1.5 · 내성 ×0.75(무효는 없다). 둘이면 곱하되 ×0.6~×1.8 안으로
export const ELEMENTS = {
  fire: { n: "불", c: "#ff6a3a", x2: ["plant", "ice", "steel", "blood"], half: ["fire", "water", "earth"] }, water: { n: "물", c: "#3f9fe0", x2: ["fire", "earth"], half: ["water", "plant", "ice"] }, ice: { n: "얼음", c: "#9fe0f2", x2: ["plant", "wind", "earth"], half: ["fire", "water", "ice", "steel"] },
  thunder: { n: "번개", c: "#f2d23a", x2: ["water", "wind", "steel"], half: ["thunder", "plant", "earth"] }, wind: { n: "바람", c: "#8fe0b0", x2: ["plant", "poison", "sound"], half: ["thunder", "steel", "earth", "gravity"] }, earth: { n: "땅", c: "#b08a5a", x2: ["fire", "thunder", "poison", "steel"], half: ["plant", "ice", "wind"] },
  plant: { n: "풀", c: "#6fbf4a", x2: ["water", "earth", "sound"], half: ["fire", "plant", "poison", "wind", "steel"] }, poison: { n: "독", c: "#9a5fc0", x2: ["plant", "light", "blood"], half: ["poison", "earth", "dark", "steel"] }, steel: { n: "강철", c: "#b9c2d0", x2: ["ice", "earth", "arcane"], half: ["fire", "water", "thunder", "steel"] },
  light: { n: "빛", c: "#fff0a8", x2: ["dark", "poison", "blood"], half: ["light", "steel", "fire"] }, dark: { n: "어둠", c: "#5a3f80", x2: ["light", "arcane"], half: ["dark", "steel", "poison"] },
  arcane: { n: "비전", c: "#b07aff", x2: ["poison", "gravity", "dark"], half: ["arcane", "steel"] }, sound: { n: "음파", c: "#ffa8d0", x2: ["ice", "steel", "earth"], half: ["sound", "wind", "plant"] }, blood: { n: "피", c: "#c8283a", x2: ["plant", "water", "sound"], half: ["blood", "steel", "poison"] }, gravity: { n: "중력", c: "#7a68b8", x2: ["wind", "thunder", "sound"], half: ["gravity", "earth", "arcane"] },
};
for (const e of Object.values(ELEMENTS)) e.beats = e.x2; // 예전 이름
export const WEAK = 1.5, RESIST = .75, STAB = 1.2, GROUND = 1.15;
/** 공격 속성 하나가 받는 속성 하나에 주는 배율 */
export const chart = (a, d) => { const e = ELEMENTS[a]; return !e || !ELEMENTS[d] ? 1 : e.x2.includes(d) ? WEAK : e.half.includes(d) ? RESIST : 1; };
// 몸이 단단하거나 흐릿한 몬스터: 흔한 무속성 공격은 덜 먹고, 속성 공격은 그대로 · 약한 속성이면 ×1.5
export const PHYS = { ghost: [.55, ["light", "arcane", "fire"]], shadow: [.55, ["light", "arcane"]], lich: [.65, ["light", "fire"]], flame: [.55, ["water", "ice"]], storm: [.6, ["earth", "gravity"]], tornado: [.55, ["earth", "gravity"]], slime: [.6, ["fire", "thunder", "ice"]], jelly: [.7, ["thunder", "ice"]], eye: [.8, ["light", "sound"]], golem: [.7, ["water", "sound", "arcane"]], icegolem: [.7, ["fire", "sound"]], crystal: [.65, ["sound", "gravity", "earth"]], armor: [.65, ["thunder", "arcane", "sound"]], gargoyle: [.75, ["sound", "water"]], turtle: [.75, ["thunder", "plant"]], crab: [.8, ["thunder", "plant"]], beetle: [.8, ["fire", "wind"]], robot: [.75, ["thunder", "water"]], mech: [.7, ["thunder", "water"]], tank: [.65, ["thunder", "earth"]], turret: [.7, ["thunder", "earth"]], spiderbot: [.75, ["thunder", "water"]], drone: [.85, ["thunder", "wind"]], mimic: [.8, ["fire"]], skeleton: [.8, ["light", "earth"]], treant: [.85, ["fire", "wind"]] };
let modelOfHook = null; export const setModelHook = (f) => { modelOfHook = f; }; const modelOf = (d) => d?.model || modelOfHook?.(d) || "";
export const elemOf = (v) => (typeof v === "string" && Object.prototype.hasOwnProperty.call(ELEMENTS, v) ? v : "");
const W = [["fire", /불꽃|화염|불길|겁화|업화|작열|용암|홍염|화룡|염화|불의|불타|화속성|파이어|fire|flame|blaze|inferno/i], ["ice", /얼음|빙결|서리|냉기|빙하|한기|눈보라|설화|빙|ice|frost|snow|glacial|frozen/i], ["thunder", /번개|천둥|뇌전|뇌격|벼락|전격|뇌(?=[신제룡광]|의)|thunder|lightning|volt/i], ["water", /물의|물결|파도|해류|바다|해신|수류|빗물|심해|물속성|water|aqua|tidal|ocean/i], ["wind", /바람|질풍|폭풍|돌풍|풍신|선풍|회오리|태풍|wind|storm|gale|tempest/i], ["arcane", /비전|마나|룬(?:문자)?|마력탄|arcane|mana|rune/i], ["sound", /음파|굉음|선율|노래의|소리의|파동|sonic|sound|song/i], ["blood", /피의|혈(?:액|마|기|술|검)|선혈|blood|crimson/i], ["gravity", /중력|중압|인력|블랙홀|gravity|graviton/i], ["earth", /대지|바위|암석|지진|땅의|모래|흙|earth|stone|quake|sand/i], ["plant", /덩굴|가시나무|숲의|나무의|꽃잎|세계수|자연의|vine|thorn|nature|forest/i], ["poison", /맹독|독(?!립|자|수리|단|특|일|서)|산성|역병|부식|venom|poison|toxic|plague|acid/i], ["light", /성스러|신성|빛의|광휘|천상|축복|성검|성창|성궁|태양|여명|holy|light(?!ning|weight)|sacred|divine|radiant|solar/i], ["dark", /어둠|암흑|심연|저주|그림자|흑마|마검|명계|공허|칠흑|사신|dark|shadow|abyss|cursed?|void|necro/i], ["steel", /강철의\s?속성|금속 마법|steel magic/i]];
/** 글에서 속성 찾기(없으면 ""): 가장 먼저 나온 것 */
export function elemFromText(t) { const s = String(t ?? "").normalize("NFKC"); let best = "", at = 1e9; for (const [k, re] of W) { const m = re.exec(s); if (m && m.index < at) { best = k; at = m.index; } } return best; }
// 종족이 타고난 속성(장기기억 id)
const BY = { homunculus: "arcane", pixie: "arcane", xian: "arcane", phoenix: "fire", spirit_fire: "fire", spirit_water: "water", mermaid: "water", siren: "water", shark: "water", scylla: "water", kappa: "water", ryu: "water", spirit_wind: "wind", harpy: "wind", tengu: "wind", spirit_earth: "earth", golem: "earth", dwarf: "earth", dryad: "plant", alraune: "plant", woodelf: "plant", yukionna: "ice", penguin: "ice", android: "steel", cyborg: "steel", angel: "light", valkyrie: "light", unicorn: "light", god: "light", demon: "dark", fallen: "dark", vampire: "blood", undead: "dark", ghost: "dark", succubus: "dark", incubus: "dark", darkelf: "dark", lamia: "poison", naga: "poison", arachne: "poison", bee: "poison" };
/** 인물의 속성들(최대 2): 스스로 정한 것 → 종족이 타고난 것 */
export const elemsOfUnit = (d) => [...new Set([elemOf(d?.elem), elemOf(d?.elem2), BY[RACES[d?.race]?.mem] ?? ""].filter(Boolean))].slice(0, 2);
export const elemOfUnit = (d) => elemsOfUnit(d)[0] ?? "";
/** 상성만(곱, ×0.6~×1.8) */
export const typeMod = (elem, d) => { if (!elemOf(elem)) return 1; const m = elemsOfUnit(d).reduce((q, t) => q * chart(elem, t), 1), p = PHYS[modelOf(d)]; return Math.round(Math.min(1.8, Math.max(.6, m * (p && p[1].includes(elem) ? WEAK : 1))) * 100) / 100; };
/** 무속성 공격: 단단·흐릿한 몬스터만 덜 먹는다 */
export const physMod = (d) => PHYS[modelOf(d)]?.[0] ?? 1;
/** 피해 배율 = 상성 × 같은 속성 1.2 × 지형 1.15(물 위 번개·얼음, 숲 불, 중장에 번개). 무속성이면 몸 내성만 */
export function elemMod(elem, d, ground = "", a = null) {
  if (!elemOf(elem)) return physMod(d); let m = typeMod(elem, d);
  if (a && elemsOfUnit(a).includes(elem)) m *= STAB;
  if (((elem === "thunder" || elem === "ice") && "wbsiu".includes(ground || "-")) || (elem === "fire" && "fo".includes(ground || "-")) || (elem === "thunder" && d?.mtype === "armor")) m *= GROUND;
  return Math.round(m * 100) / 100;
}
/** 화면에 보일 말 */
export const typeWord = (m) => (m >= 1.7 ? "큰 약점" : m > 1.05 ? "약점" : m <= .65 ? "큰 내성" : m < .95 ? "내성" : "");
