// Dusk Saga 엔진 — 속성. 속성이 없는 공격은 예전 규칙 그대로다
import { RACES } from "./races.js";
export const ELEMENTS = {
  fire: { n: "불", c: "#ff6a3a", beats: ["ice", "plant", "poison"] }, water: { n: "물", c: "#3f9fe0", beats: ["fire", "earth"] }, ice: { n: "얼음", c: "#9fe0f2", beats: ["wind", "plant", "water"] },
  thunder: { n: "번개", c: "#f2d23a", beats: ["water", "steel"] }, wind: { n: "바람", c: "#8fe0b0", beats: ["earth", "poison"] }, earth: { n: "땅", c: "#b08a5a", beats: ["thunder", "fire", "steel"] },
  plant: { n: "풀", c: "#6fbf4a", beats: ["water", "earth"] }, poison: { n: "독", c: "#9a5fc0", beats: ["plant"] }, steel: { n: "강철", c: "#b9c2d0", beats: ["ice"] },
  light: { n: "빛", c: "#fff0a8", beats: ["dark"] }, dark: { n: "어둠", c: "#5a3f80", beats: ["light"] },
};
export const elemOf = (v) => (typeof v === "string" && Object.prototype.hasOwnProperty.call(ELEMENTS, v) ? v : "");
const W = [["fire", /불꽃|화염|불길|겁화|업화|작열|용암|홍염|화룡|염화|불의|불타|화속성|파이어|fire|flame|blaze|inferno/i], ["ice", /얼음|빙결|서리|냉기|빙하|한기|눈보라|설화|빙|ice|frost|snow|glacial|frozen/i], ["thunder", /번개|천둥|뇌전|뇌격|벼락|전격|뇌(?=[신제룡광]|의)|thunder|lightning|volt/i], ["water", /물의|물결|파도|해류|바다|해신|수류|빗물|심해|물속성|water|aqua|tidal|ocean/i], ["wind", /바람|질풍|폭풍|돌풍|풍신|선풍|회오리|태풍|wind|storm|gale|tempest/i], ["earth", /대지|바위|암석|지진|땅의|모래|흙|earth|stone|quake|sand/i], ["plant", /덩굴|가시나무|숲의|나무의|꽃잎|세계수|자연의|vine|thorn|nature|forest/i], ["poison", /맹독|독(?!립|자|수리|단|특|일|서)|산성|역병|부식|venom|poison|toxic|plague|acid/i], ["light", /성스러|신성|빛의|광휘|천상|축복|성검|성창|성궁|태양|여명|holy|light(?!ning|weight)|sacred|divine|radiant|solar/i], ["dark", /어둠|암흑|심연|저주|그림자|흑마|마검|명계|공허|칠흑|사신|dark|shadow|abyss|cursed?|void|necro/i], ["steel", /강철의\s?속성|금속 마법|steel magic/i]];
/** 글에서 속성 찾기(없으면 ""): 가장 먼저 나온 것 */
export function elemFromText(t) { const s = String(t ?? "").normalize("NFKC"); let best = "", at = 1e9; for (const [k, re] of W) { const m = re.exec(s); if (m && m.index < at) { best = k; at = m.index; } } return best; }
// 종족이 타고난 속성(장기기억 id)
const BY = { phoenix: "fire", spirit_fire: "fire", spirit_water: "water", mermaid: "water", siren: "water", shark: "water", scylla: "water", kappa: "water", ryu: "water", spirit_wind: "wind", harpy: "wind", tengu: "wind", spirit_earth: "earth", golem: "earth", dwarf: "earth", dryad: "plant", alraune: "plant", woodelf: "plant", yukionna: "ice", penguin: "ice", android: "steel", cyborg: "steel", angel: "light", valkyrie: "light", unicorn: "light", god: "light", demon: "dark", fallen: "dark", vampire: "dark", undead: "dark", ghost: "dark", succubus: "dark", incubus: "dark", darkelf: "dark", lamia: "poison", naga: "poison", arachne: "poison", bee: "poison" };
export const elemOfUnit = (d) => elemOf(d?.elem) || BY[RACES[d?.race]?.mem] || "";
/** 피해 배율: 상성 1.3 · 같은 속성 0.75 · 역상성 0.85. 젖은 곳 번개·물가 얼음·숲 불·비행 바람 +15% */
export function elemMod(elem, d, ground = "") {
  if (!elemOf(elem)) return 1; const e = elemOfUnit(d); let m = 1;
  if (e) m = ELEMENTS[elem].beats.includes(e) ? 1.3 : e === elem ? 0.75 : ELEMENTS[e].beats.includes(elem) ? 0.85 : 1;
  if ((elem === "thunder" || elem === "ice") && (ground === "w" || ground === "b" || ground === "s" || ground === "i")) m += .15; if (elem === "fire" && ground === "f") m += .15; if (elem === "wind" && d?.mtype === "fly") m += .15; if (elem === "thunder" && d?.mtype === "armor") m += .15;
  return Math.round(m * 100) / 100;
}
