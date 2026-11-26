// 몬스터 이름 → 무리·색(도감·방어구 세트가 같이 씀). 다른 모듈을 불러오지 않는다
// 몬스터 이름 → 무리·색
export const RULES = [
  [/화룡/, "dragon", "dragonr"], [/지룡/, "dragon", "dragong"], [/히드라/, "dragon", "dragong"], [/와이번/, "dragon", "dragonb"], [/용|룡/, "dragon", "dragonr"], [/키메라/, "chimera", "beast"],
  [/괴조/, "bird", "bird"], [/박쥐/, "beast", "blackhide"], [/늑대/, "beast", "wolf"], [/눈여우/, "beast", "whitehide"], [/곰/, "beast", "bear"], [/멧돼지/, "beast", "brownhide"], [/표범/, "beast", "blackhide"], [/쥐/, "beast", "beast"], [/악몽마/, "beast", "darkE"], [/들개|군견/, "beast", "beast"],
  [/거북/, "turtle", "reptile"], [/두꺼비/, "toad", "toad"], [/악어|왕뱀/, "reptile", "reptile"], [/거미/, "spider", "chitin"], [/전갈/, "insect", "scorpion"], [/벌$|살인 벌/, "insect", "topaz"], [/사마귀/, "insect", "insect"], [/지네/, "insect", "chitin"], [/갑충/, "insect", "insect"], [/벌레/, "insect", "scorpion"],
  [/해파리/, "jelly", "jelly"], [/집게|촉수|상어/, "aqua", "aqua"], [/화염 슬라임/, "slime", "fslime"], [/독 슬라임/, "slime", "pslime"], [/슬라임/, "slime", "slime"], [/포자 버섯/, "spore", "spore"], [/식인꽃/, "plant", "plantm"], [/트렌트/, "treant", "treant"],
  [/얼음 골렘/, "golem", "icegolem"], [/가고일/, "golem", "gargoyle"], [/골렘/, "golem", "golem"], [/움직이는 갑옷/, "armor", "iron"], [/미믹/, "mimic", "oak"], [/저주 인형/, "doll", "redcloth"],
  [/망령/, "ghost", "ghost"], [/리치/, "undead", "lich"], [/해골|스켈레톤|좀비|구울/, "undead", "undead"], [/외눈 마안/, "eye", "jelly"], [/그림자/, "shadow", "darkE"], [/임프/, "demon", "demon"], [/외눈 거인/, "giant", "bear"],
  [/불꽃 정령/, "spirit", "spiritf"], [/번개 정령/, "spirit", "spiritt"], [/수정 정령/, "spirit", "spiritc"], [/회오리 정령/, "spirit", "spiritw"], [/드론|로봇|포탑|전차|기갑병|다족 기계/, "machine", "machine"], [/실험체/, "chimera", "toad"],
];
export function familyOf(name) { const r = RULES.find(([re]) => re.test(name || "")); return r ? { fam: r[1], pal: r[2] } : null; }
