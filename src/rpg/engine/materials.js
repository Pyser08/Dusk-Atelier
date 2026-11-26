// Dusk Saga 소재 도감: 이름·분류·등급·속성·아이콘(12×12 도트 모양 + 색). 순수 데이터와 SVG 문자열만.
// 몬스터 부위 소재는 전투에서 부순 부위(머리·다리·꼬리·날개·몸)와 몬스터 무리(용·짐승·벌레·언데드…)로 모양과 이름이 정해진다.
// 분류(cat): ore 광석 · metal 금속 · gem 보석 · wood 나무 · plant 풀 · hide 가죽·천 · part 몬스터 부위 · essence 정수 · misc 잡화 · gear 장비(무기 자체)

// ── 모양: o 테두리 · d 어둠 · b 바탕 · l 밝음 · w 반짝임 · a 강조(두 번째 색) ──
export const SHAPES = {
  ore: ["............", "............", "....oooo....", "..oodbbloo..", ".odbbabblwo.", ".obbbbbalbo.", "odbabbbbblbo", "odbbbbabbbbo", "oddbbbbbbbdo", ".oddddbbddo.", "..oooooooo..", "............"],
  ingot: ["............", "............", "............", "....oooooo..", "...olllllwo.", "..olbbbbblo.", ".obbbbbbbdo.", "oooooooobdo.", "odddddddodo.", "odddddddoo..", "oooooooooo..", "............"],
  gem: ["............", "...oooooo...", "..olwllblo..", ".olwlbbbbdo.", "oooooooooooo", "obllbbbbbddo", ".obbbbbbbdo.", "..obbbbbdo..", "...obbbdo...", "....obdo....", ".....oo.....", "............"],
  crystal: ["......o.....", ".....owo....", ".....olbo...", "..o..olbo...", ".owo.olbbo..", ".olbooblbo..", ".olbbolbbdo.", ".obbbobbbdo.", "..obbobbddo.", "..odbbbbdo..", "...oooooo...", "............"],
  log: ["............", "............", "..oooooooo..", ".oaaaaaaaaoo", "oabbaabaaao.", "oaabaaaabbo.", ".obbbbbbbbdo", ".olllbbbbbdo", ".obbbbbdbbdo", ".odddddddddo", "..oooooooooo", "............"],
  plank: ["............", "............", "oooooooooooo", "olllllllllbo", "obbbbdbbbbbo", "oooooooooooo", "olllllllllbo", "obbbbbbbdbbo", "oooooooooooo", "............", "............", "............"],
  stick: ["............", ".........oo.", "........olo.", ".......olbo.", "......olbo..", ".....olbo...", "....olbo....", "...olbo.....", "..olbo......", ".odbo.......", ".oo.........", "............"],
  herb: ["............", ".....oo.....", "....olbo.oo.", "..oo.olbolbo", ".olbo.obobo.", ".obbboo.oo..", "..oobobooo..", "....oaoolbo.", "....oao.oo..", "....oao.....", "...ooaoo....", "............"],
  flower: ["............", "....oooo....", "...olaaao...", "..oaawaaao..", "..oaaaaaao..", "...oaaaao...", "....oooo....", ".....obo.oo.", ".oo..obooblo", "olbo.obo.oo.", ".oooooboo...", "............"],
  mushroom: ["............", "...oooooo...", "..oaawaaao..", ".oaawaaaaao.", ".oaaaaaaaao.", "oooooooooooo", "....olbo....", "....olbo....", "....olbo....", "...olbbbo...", "...oooooo...", "............"],
  hide: ["............", ".oo......oo.", "olbooooooblo", ".olbbbbbbbo.", "..obbdbbbo..", "..obbbbdbo..", "..obdbbbbo..", "..obbbbbbo..", ".olbbbdbbbo.", "olbooooooblo", ".oo......oo.", "............"],
  leather: ["............", "............", "..oooooooo..", ".olllllllwo.", ".obbbbbbblo.", ".obaaaaaabo.", ".obbbbbbbbo.", ".obaaaaaabo.", ".odbbbbbbdo.", "..oooooooo..", "............", "............"],
  cloth: ["............", ".oooooooooo.", ".olllwlllbo.", ".obabababbo.", ".obbbbbbbbo.", ".oababababo.", ".obbbbbbbbo.", ".obabababdo.", ".odddddddoo.", ".oooooooo.o.", "..........o.", "............"],
  thread: ["............", "....oooo....", "...olwllo...", "..olbbbblo..", "..obababbo..", "..olbbbbbo..", "..obababbo..", "..olbbbbbo..", "...odbbdo...", "....oooo....", ".......ooo..", ".........oo."],
  rope: ["............", "...oooo.....", "..oblbbo....", ".obo..obo...", ".obo..obo...", "..oblbbo....", "...oooobo...", "......obo...", "......oboo..", ".......oblo.", "........oo..", "............"],
  scale: ["............", "....oooo....", "...olwllo...", "..olllbbbo..", ".olbbbbbbdo.", ".obbbbbbbdo.", ".obbbbbbddo.", "..obbbbddo..", "...obbddo...", "....oddo....", ".....oo.....", "............"],
  fang: ["............", "..oooooooo..", ".olwllllbbo.", ".obbbbbbbdo.", "..olbbbbdo..", "..olbbbbdo..", "...olbbdo...", "...olbbdo...", "....olbo....", "....oldo....", ".....oo.....", "............"],
  claw: ["............", ".oo.........", ".olo........", "..olo.......", "..olbo......", "...olbo.....", "...olbbo....", "...obbbdooo.", "...obbbddddo", "....obbbddo.", ".....oooooo.", "............"],
  horn: ["..........o.", ".........olo", "........olo.", ".......olbo.", "......olbbo.", ".....olbbdo.", "....olbbbdo.", "...olbbbdo..", "..oabbbddo..", ".oaaaaddo...", ".ooooooo....", "............"],
  skull: ["............", "...oooooo...", "..olwlllbo..", ".olllllbbbo.", ".olbbbbbbdo.", ".oooblboood.", ".o.oblbo.od.", ".oooblbooo..", "..obbbbbdo..", "..oobobobo..", "...ooooooo..", "............"],
  bone: ["............", ".oo......oo.", "olwo....olbo", "olbbooooobdo", ".obllllllbo.", ".obbbbbbbdo.", "odbbooooobdo", "odbo....odbo", ".oo......oo.", "............", "............", "............"],
  wing: ["............", "o...........", "olo.........", "olbo........", "obbbo.......", "obabbo...oo.", "obbbabooolbo", "obabbbabbbo.", "obbbabbbbo..", "oddddddoo...", "oooooooo....", "............"],
  feather: ["...........o", ".........ool", "........olbo", ".......olbo.", "......olbao.", ".....olbao..", "....olbao...", "...olbao....", "..olbdo.....", "..oddo......", ".oao........", "oo.........."],
  shell: ["............", "....oooo....", "..oollbboo..", ".olwlbabbbo.", ".olbabbbabo.", "olbbabbbabdo", "obbbabbbabdo", "obbbabbbaddo", ".odddddddddo", "..oooooooooo", "............", "............"],
  tentacle: ["............", "....ooo.....", "...olbbo....", "...obabo....", "....obbo....", "...obabo....", "...obbo.....", "..obabo..oo.", "..obbo..oao.", "..obaooooao.", "...obbaaaao.", "....oooooo.."],
  eye: ["............", "............", "...oooooo...", "..olllllbo..", ".olloooolbo.", "olloaaaaolbo", "oblowaaoobdo", ".obloaaooddo", "..obboooddo.", "...odddddo..", "....oooooo..", "............"],
  core: ["............", "....oooo....", "...owlaao...", "..owlaaaao..", ".olaaaaaado.", ".oaaaaaaado.", ".oaaaaaaddo.", ".odaaaaaddo.", "..oddaaddo..", "...odddddo..", "....oooo....", "............"],
  vial: ["............", "....oooo....", "....odbo....", "....oo.o....", "...o.lw.o...", "..o.lw...o..", ".o.aaaaaaa.o", ".oaawaaaaaao", ".oaaaaaaaado", ".odaaaaaaddo", "..ooooooooo.", "............"],
  goo: ["............", "............", "....oooo....", "...owllbo...", "..olllbbbo..", ".olbbbbbbbo.", "olbbbbbbbbdo", "obbbbbbbbbdo", "obdbbbbbbddo", ".oddddddddo.", "..oooooooo..", "............"],
  gearp: ["............", ".....oo.....", "..oo.ob.oo..", "..oboooobo..", "...obllbbo..", "oooblooolbooo".slice(0, 12), "obbbo..obbbo", "oooblooobooo", "...obbbbdo..", "..obooooobo.", "..oo.od.oo..", ".....oo....."],
  chip: ["............", ".o.o.o.o.o..", "oooooooooooo", ".olllllllbo.", "oolaaaaablo.", ".olawwaablo.", "oolaaaaablo.", ".olaaaaablo.", "oobbbbbbbdo.", "oooooooooooo", ".o.o.o.o.o..", "............"],
  powder: ["............", "............", "............", "............", ".....oo.....", "....olbo....", "...olwbbo...", "..olbbbbdo..", ".olbabbbadoo", "olbbbbbbbbdo", "oooooooooooo", "............"],
  coal: ["............", "............", "...oooo.....", "..oaddbo....", ".oddddbboo..", ".odbddddddo.", "oddddddbdddo", "odddbdddddo.", ".odddddddo..", "..oooooooo..", "............", "............"],
  seed: ["............", "............", "....oo......", "...olbo.....", "..olbbo..oo.", "..obbdo.olbo", "...ooo..obdo", ".oo......oo.", "olbo...oo...", "obdo..olbo..", ".oo...obdo..", ".......oo..."],
  tail: ["............", "...........o", "..........ob", ".........obo", "........obbo", "......oobbo.", "..ooooabbo..", ".oaaabbbo...", "olbbbbdo....", "obbbddo.....", ".oooo.......", "............"],
  egg: ["............", "....oooo....", "...olwlbo...", "..olllbbbo..", "..olbbbabo..", ".olbbabbbdo.", ".obbbbbbbdo.", ".obabbbbadd.", ".odbbbbbddo.", "..oddddddo..", "...oooooo...", "............"],
  plate: ["............", "............", ".oooooooooo.", ".olwllllllo.", ".olbbbbbbbo.", ".olbabbabbo.", ".olbbbbbbbo.", ".olbabbabbo.", ".odbbbbbbdo.", ".oooooooooo.", "............", "............"],
  charm: ["....oooo....", "...o....o...", "...o....o...", "....oooo....", "....oaao....", "...oawlao...", "..oawaaaao..", "..oaaaaaao..", "...oaaaao...", "....oaao....", ".....oo.....", "............"],
  potion: ["............", "....oooo....", "....oaao....", "....odbo....", "...o.ww.o...", "..o.wa...o..", ".oaaaaaaaaao", ".oawaaaaaaao", ".oaaaaaaaado", ".odaaaaaaddo", "..ooooooooo.", "............"],
  bomb_old: ["........oaa.", ".......oa...", "......oo....", "....oooooo..", "...olwlbbbo.", "..olwbbbbbdo", "..obbbbbbbdo", "..obbbbbbddo", "..obbbbbdddo", "...odddddoo.", "....oooooo..", "............"],
  // 무기(가방·정비 칸)
  w_sword: ["..........oo", ".........olo", "........olbo", ".......olbo.", "......olbo..", ".....olbo...", "..oo.olbo...", "..oaolbo....", "...oaoo.....", "..odoao.....", ".odo..oo....", ".oo........."],
  w_greatsword: [".........ooo", "........olwo", ".......olbbo", "......olbbo.", ".....olbbo..", "....olbbo...", ".oo.olbbo...", ".oaaobbo....", "..oaaao.....", ".odoaaao....", "odo...oo....", "oo.........."],
  w_dagger: ["............", "............", "..........o.", ".........olo", "........olo.", ".......olo..", "...o..olo...", "...oaolo....", "....oao.....", "...odoao....", "..odo.oo....", "..oo........"],
  w_lance: ["..........oo", ".........owo", "........olbo", ".......oboo.", "......odo...", ".....odo....", "....odo.....", "...odo......", "..odo.......", ".odo........", "odo.........", "oo.........."],
  w_axe: ["....oooo....", "...olwlbo...", "..olllbbbo..", "..oblbbbbo..", "...obbooodo.", "....oo.odo..", "......odo...", ".....odo....", "....odo.....", "...odo......", "..odo.......", "..oo........"],
  w_hammer: ["...oooooo...", "..olwlllbo..", "..olbbbbbo..", "..obbbbbdo..", "...oooodoo..", "......odo...", ".....odo....", "....odo.....", "...odo......", "..odo.......", ".odo........", ".oo........."],
  w_bow: ["...oo.......", "..olbo......", "..obo.o.....", ".obo...o....", ".obo....o...", ".obo....o...", ".obo....o...", ".obo...o....", "..obo.o.....", "..olbo......", "...oo.......", "............"],
  w_staff: ["........ooo.", ".......oaaao", ".......awaao", ".......oaado", "......oodoo.", ".....odo....", "....odo.....", "...odo......", "..odo.......", ".odo........", "odo.........", "oo.........."],
  w_wand: ["............", "........o...", ".......oao..", "......oawao.", ".......oao..", "......odo...", ".....odo....", "....odo.....", "...odo......", "..odo.......", "..oo........", "............"],
  w_tome: ["............", ".oooooooooo.", ".oaaaaaaaao.", ".oaoooooaao.", ".oaowlaoaao.", ".oaoaaaoaao.", ".oaoooooaao.", ".oaaaaaaaao.", ".oaaaaaaaao.", ".olllllllldo", ".oooooooooo.", "............"],
  w_shield: ["............", ".oooooooooo.", ".olllwlllbo.", ".olbbabbbbo.", ".obbbaabbbo.", ".obaaaaaabo.", ".obbbaabbdo.", "..obbabbdo..", "..obbbbbdo..", "...obbbdo...", "....oddo....", ".....oo....."],
  w_fist: ["............", "..oooooooo..", ".olwlolwlbo.", ".olbbobbbbo.", ".oooooooooo.", ".obbbbbbbdo.", ".obbbbbbbdo.", "..oaaaaaao..", "..oaaaaaao..", "..oaaaaaao..", "...oooooo...", "............"],
  w_whip: ["..........o.", ".........oao", "........oao.", "..ooo..oao..", ".oaaao.oao..", "oao..oaao...", "oao...oo....", ".oao........", "..oao.......", "...odo......", "...odo......", "...oo......."],
  w_bomb: ["........oaa.", ".......oa...", "......oo....", "....oooooo..", "...olwlbbbo.", "..olwbbbbbdo", "..obbbbbbbdo", "..obbbbbbddo", "..obbbbbdddo", "...odddddoo.", "....oooooo..", "............"],
};
// 색: [어둠, 바탕, 밝음, 강조] (테두리는 어두운 공통색, 반짝임은 흰색)
const C = (d, b, l, a = l) => [d, b, l, a];
export const PAL = {
  copper: C("#7a3e1c", "#c46a34", "#f2a66a", "#3f8a6a"), iron: C("#4a4c54", "#7c818c", "#c2c8d2", "#5a5550"), steel: C("#3c4656", "#6f86a0", "#cde0f2", "#3c4656"), silver: C("#6a7080", "#b4bccc", "#f2f6ff", "#8a90a0"),
  gold: C("#8a5a10", "#e0a52a", "#ffe58a", "#b07a10"), mithril: C("#3a6a8a", "#7ac2e0", "#e0f8ff", "#9ae0f2"), adamant: C("#2a1a3a", "#5a3a7a", "#a07ac8", "#d0a0ff"), darksteel: C("#141418", "#34343e", "#6a6a7c", "#a02030"),
  holy: C("#8a7a3a", "#e8e0b0", "#fffbe8", "#ffd35a"), meteor: C("#2a1a10", "#6a4a3a", "#c0906a", "#ff7a2a"), stone: C("#4a443e", "#847a6e", "#bab0a2", "#5a5450"),
  ruby: C("#6a0a1a", "#d02040", "#ff8aa0"), sapphire: C("#0a2a6a", "#2a60d0", "#8ab8ff"), emerald: C("#0a4a2a", "#20a060", "#8af0b8"), topaz: C("#7a5a0a", "#e0b020", "#fff08a"), amethyst: C("#3a1a5a", "#8a40c8", "#d0a0ff"),
  diamond: C("#6a8aa0", "#c8e8f8", "#ffffff"), icegem: C("#3a7a9a", "#8ad8f2", "#e8fbff"), amber: C("#7a4a0a", "#d08a20", "#ffd080"), obsidian: C("#0a0a12", "#2a2a3a", "#6a6a8a"), pearl: C("#9a8a9a", "#e8e0ea", "#ffffff"), onyx: C("#101010", "#303030", "#808080"),
  oak: C("#4a2a12", "#8a5a2a", "#c08a50", "#6a4020"), pine: C("#3a2a1a", "#6a4a2a", "#a07a4a", "#2a5a2a"), ebony: C("#120a08", "#2e2018", "#5a4030", "#3a2a20"), elder: C("#4a3a5a", "#8a7aa0", "#c8bce0", "#5a8a5a"), bamboo: C("#4a6a1a", "#8ab03a", "#d0f08a", "#4a6a1a"),
  leaf: C("#1a4a1a", "#3a8a3a", "#8ad06a", "#6a3a1a"), redherb: C("#1a4a1a", "#3a8a3a", "#8ad06a", "#d02a2a"), blueherb: C("#1a3a4a", "#3a7a8a", "#8ad0e0", "#2a5ad0"), moon: C("#2a2a5a", "#6a6ac0", "#d0d0ff", "#fff0a0"), fire_f: C("#6a1a0a", "#d04a1a", "#ffb04a", "#ffe08a"),
  shroom: C("#6a1a1a", "#c83a2a", "#ffa08a", "#f2e8d8"), glowshroom: C("#1a3a5a", "#2a8ac0", "#8af0ff", "#e0f8ff"), poisonshroom: C("#3a1a4a", "#8a3ab0", "#d08aff", "#b0f06a"),
  brownhide: C("#4a2a12", "#8a5a30", "#c09060", "#6a4020"), whitehide: C("#8a8070", "#d8d0c0", "#fffaf0", "#a09080"), blackhide: C("#101010", "#2a2620", "#5a5040", "#3a3020"), leather: C("#4a2a10", "#9a5a2a", "#d0905a", "#5a3010"), silk: C("#8a7a90", "#e8e0f0", "#ffffff", "#c0a0d0"), linen: C("#7a6a50", "#c8b890", "#f0e8d0", "#a09070"), redcloth: C("#5a0a1a", "#b02a3a", "#f07a8a", "#f2d0a0"),
  bonew: C("#8a7e66", "#e0d6bc", "#fffbee", "#a09070"), boneb: C("#2a2420", "#5a5048", "#a09888", "#3a3028"), ivory: C("#8a7a5a", "#f0e6c8", "#fffdf2", "#c0a070"),
  dragonr: C("#5a0a0a", "#c02a1a", "#ff8a4a", "#ffd35a"), dragong: C("#0a3a1a", "#2a8a3a", "#8ae06a", "#e0d04a"), dragonb: C("#0a1a4a", "#2a4ab0", "#8ab0ff", "#e0f0ff"), dragonk: C("#0a0a10", "#2a2a40", "#6a6a9a", "#a02ae0"),
  beast: C("#3a2a1a", "#7a5a3a", "#b89060", "#e0d0b0"), wolf: C("#3a3a40", "#7a7a86", "#c0c0cc", "#e8e8f0"), bear: C("#2a1a10", "#5a3a20", "#9a6a40", "#c09060"), bird: C("#3a2a10", "#a07a3a", "#f0d08a", "#d04a2a"),
  insect: C("#1a2a0a", "#4a6a1a", "#9ac04a", "#e0f06a"), chitin: C("#2a0a2a", "#6a2a5a", "#c06ab0", "#f0c0e8"), scorpion: C("#4a2a0a", "#a06a2a", "#e0b06a", "#3a1a0a"),
  aqua: C("#0a2a4a", "#2a6aa0", "#7ac0f0", "#f0a0c0"), jelly: C("#3a2a6a", "#8a7ae0", "#e0d8ff", "#ff8ad0"), reptile: C("#1a3a1a", "#4a7a3a", "#a0c06a", "#e0e0a0"), toad: C("#2a3a0a", "#6a8a2a", "#b0d06a", "#e0a02a"),
  slime: C("#0a4a1a", "#2ab04a", "#8af0a0", "#e0fff0"), fslime: C("#6a1a0a", "#e04a1a", "#ffb06a", "#ffe08a"), pslime: C("#3a0a4a", "#9a3ac0", "#e08aff", "#b0f06a"),
  plantm: C("#1a3a0a", "#4a8a2a", "#9ad05a", "#d04a6a"), treant: C("#2a1a0a", "#5a3a1a", "#8a6a3a", "#4a8a2a"), spore: C("#4a3a2a", "#a08a6a", "#e0d0b0", "#c0e08a"),
  golem: C("#3a3530", "#7a7268", "#bab2a6", "#5ac0e0"), icegolem: C("#2a5a7a", "#7ab8d8", "#e0f4ff", "#ffffff"), gargoyle: C("#20202a", "#4a4a5a", "#8a8a9a", "#d04a2a"),
  undead: C("#3a3a2a", "#8a8a6a", "#d0d0b0", "#6af0a0"), ghost: C("#2a3a5a", "#8aa0d0", "#e8f0ff", "#a0ffe0"), lich: C("#1a0a2a", "#4a2a6a", "#a07ad0", "#6af0a0"),
  demon: C("#2a0a0a", "#6a1a1a", "#c04a3a", "#ffb03a"), spiritf: C("#6a1a0a", "#ff6a2a", "#ffd08a", "#ffffff"), spiritt: C("#5a4a0a", "#e0c020", "#fff8a0", "#ffffff"), spiritc: C("#3a2a6a", "#a08af0", "#f0e8ff", "#ffffff"), spiritw: C("#1a4a3a", "#5ac0a0", "#d0fff0", "#ffffff"),
  machine: C("#2a2e36", "#5a6270", "#a8b2c0", "#3ae0ff"), brass: C("#5a3a0a", "#b08030", "#f0d08a", "#6a4a1a"), circuit: C("#0a2a1a", "#1a6a3a", "#4ac07a", "#ffd35a"),
  coal: C("#08080a", "#202024", "#4a4a54"), sulfur: C("#6a5a0a", "#d0c02a", "#fff88a"), salt: C("#8a8a90", "#e8e8f0", "#ffffff"), blood: C("#3a0008", "#900a1a", "#e03a4a"), oil: C("#1a1408", "#4a3a1a", "#8a7a4a", "#2a2010"), water: C("#0a3a6a", "#3a8ae0", "#a0d8ff"),
  fire: C("#6a0a0a", "#e0401a", "#ffc04a"), waterE: C("#0a2a6a", "#2a7ae0", "#9ad8ff"), iceE: C("#2a6a8a", "#8ad8f2", "#ffffff"), thunderE: C("#6a5a0a", "#f0d020", "#fffbc0"), windE: C("#1a5a3a", "#6ad0a0", "#e0fff0"), earthE: C("#4a2a0a", "#a0703a", "#e0c08a"),
  plantE: C("#1a4a0a", "#5ab03a", "#c0f08a"), poisonE: C("#3a0a4a", "#9a4ac8", "#e0a0ff"), lightE: C("#8a7a2a", "#ffe88a", "#ffffff"), darkE: C("#0a0614", "#3a2060", "#8a6ad0"), steelE: C("#3a4050", "#8a98b0", "#e8f0ff"), bloodE: C("#3a0010", "#b01a3a", "#ff6a8a"), arcaneE: C("#2a0a4a", "#8a3ae0", "#e8a0ff"), soundE: C("#4a1a4a", "#d05ac0", "#ffc0f0"), gravityE: C("#0a0a1a", "#2a2a6a", "#7a7ae0"),
};
const ELEM_PAL = { fire: "fire", water: "waterE", ice: "iceE", thunder: "thunderE", wind: "windE", earth: "earthE", plant: "plantE", poison: "poisonE", light: "lightE", dark: "darkE", steel: "steelE", blood: "bloodE", arcane: "arcaneE", sound: "soundE", gravity: "gravityE" };
export const ELEM_NAME = { fire: "불", water: "물", ice: "얼음", thunder: "번개", wind: "바람", earth: "땅", plant: "풀", poison: "독", light: "빛", dark: "어둠", steel: "강철", blood: "피", arcane: "비전", sound: "소리", gravity: "중력" };
export const GRADE_ORDER = ["조악", "보통", "양질", "정예", "희귀", "영웅", "전설", "신화"];
export const CATS = { ore: "광석", metal: "금속", gem: "보석", wood: "나무", plant: "약초", hide: "가죽·천", part: "몬스터 부위", essence: "정수", misc: "잡화", gear: "장비", made: "제작품" };

// ── 기본 소재 목록 [id, 이름, 분류, 모양, 색, 등급, 속성?, 꼬리표(레시피 재료 구분)] ──
const M = (id, name, cat, shape, pal, grade, elem = "", tags = []) => ({ id, name, cat, shape, pal, grade, elem, tags });
export const BASE = [
  // 광석 → 제련하면 주괴
  M("ore_copper", "구리 광석", "ore", "ore", "copper", "보통", "", ["ore"]), M("ore_iron", "철광석", "ore", "ore", "iron", "보통", "", ["ore"]), M("ore_silver", "은광석", "ore", "ore", "silver", "양질", "", ["ore"]), M("ore_gold", "금광석", "ore", "ore", "gold", "정예", "", ["ore"]),
  M("ore_mithril", "미스릴 원석", "ore", "ore", "mithril", "희귀", "", ["ore"]), M("ore_adamant", "아다만 원석", "ore", "ore", "adamant", "영웅", "", ["ore"]), M("ore_meteor", "운철", "ore", "ore", "meteor", "전설", "", ["ore"]), M("ore_dark", "흑철 원석", "ore", "ore", "darksteel", "희귀", "dark", ["ore"]),
  M("stone", "단단한 돌", "ore", "ore", "stone", "조악", "earth", ["stone"]), M("coal", "석탄", "misc", "coal", "coal", "보통", "fire", ["fuel"]), M("sulfur", "유황", "misc", "powder", "sulfur", "보통", "fire", ["powder"]), M("salt", "소금 결정", "misc", "powder", "salt", "조악", "", ["powder"]),
  M("ingot_copper", "구리 주괴", "metal", "ingot", "copper", "보통", "", ["metal"]), M("ingot_iron", "철 주괴", "metal", "ingot", "iron", "양질", "", ["metal"]), M("ingot_steel", "강철 주괴", "metal", "ingot", "steel", "정예", "steel", ["metal"]), M("ingot_silver", "은 주괴", "metal", "ingot", "silver", "정예", "light", ["metal"]),
  M("ingot_gold", "금 주괴", "metal", "ingot", "gold", "희귀", "", ["metal"]), M("ingot_mithril", "미스릴 주괴", "metal", "ingot", "mithril", "영웅", "wind", ["metal"]), M("ingot_adamant", "아다만 주괴", "metal", "ingot", "adamant", "전설", "", ["metal"]), M("ingot_dark", "흑철 주괴", "metal", "ingot", "darksteel", "영웅", "dark", ["metal"]),
  M("ingot_holy", "성은 주괴", "metal", "ingot", "holy", "전설", "light", ["metal"]), M("ingot_meteor", "운철 주괴", "metal", "ingot", "meteor", "신화", "gravity", ["metal"]), M("plate_steel", "강철판", "metal", "plate", "steel", "정예", "", ["plate"]), M("nail", "쇠못 한 줌", "metal", "powder", "iron", "보통", "", ["nail"]),
  // 보석
  M("gem_ruby", "루비", "gem", "gem", "ruby", "희귀", "fire", ["gem"]), M("gem_sapphire", "사파이어", "gem", "gem", "sapphire", "희귀", "water", ["gem"]), M("gem_emerald", "에메랄드", "gem", "gem", "emerald", "희귀", "plant", ["gem"]), M("gem_topaz", "토파즈", "gem", "gem", "topaz", "희귀", "thunder", ["gem"]),
  M("gem_amethyst", "자수정", "gem", "gem", "amethyst", "희귀", "arcane", ["gem"]), M("gem_diamond", "다이아몬드", "gem", "gem", "diamond", "영웅", "light", ["gem"]), M("gem_ice", "빙정석", "gem", "crystal", "icegem", "희귀", "ice", ["gem"]), M("gem_amber", "호박", "gem", "gem", "amber", "정예", "earth", ["gem"]),
  M("gem_obsidian", "흑요석", "gem", "crystal", "obsidian", "정예", "dark", ["gem"]), M("gem_pearl", "진주", "gem", "egg", "pearl", "정예", "water", ["gem"]), M("gem_onyx", "오닉스", "gem", "gem", "onyx", "정예", "dark", ["gem"]), M("quartz", "석영", "gem", "crystal", "diamond", "양질", "", ["gem"]),
  // 나무
  M("log_oak", "참나무 원목", "wood", "log", "oak", "보통", "", ["log"]), M("log_pine", "소나무 원목", "wood", "log", "pine", "조악", "", ["log"]), M("log_ebony", "흑단 원목", "wood", "log", "ebony", "희귀", "dark", ["log"]), M("log_elder", "고목 가지", "wood", "log", "elder", "영웅", "arcane", ["log"]),
  M("bamboo", "대나무", "wood", "stick", "bamboo", "보통", "wind", ["stick"]), M("plank", "판자", "wood", "plank", "oak", "보통", "", ["plank"]), M("stick", "손잡이 막대", "wood", "stick", "oak", "보통", "", ["stick"]), M("resin", "송진", "wood", "goo", "amber", "보통", "", ["glue"]),
  // 약초·버섯·꽃
  M("herb_green", "푸른 약초", "plant", "herb", "leaf", "보통", "plant", ["herb"]), M("herb_red", "붉은 약초", "plant", "herb", "redherb", "양질", "fire", ["herb"]), M("herb_blue", "푸른 이슬풀", "plant", "herb", "blueherb", "양질", "water", ["herb"]), M("flower_moon", "달빛꽃", "plant", "flower", "moon", "희귀", "light", ["herb", "flower"]),
  M("flower_fire", "불꽃 백합", "plant", "flower", "fire_f", "정예", "fire", ["herb", "flower"]), M("shroom_red", "붉은 버섯", "plant", "mushroom", "shroom", "보통", "", ["shroom"]), M("shroom_glow", "빛버섯", "plant", "mushroom", "glowshroom", "정예", "light", ["shroom"]), M("shroom_poison", "독버섯", "plant", "mushroom", "poisonshroom", "양질", "poison", ["shroom"]),
  M("seed", "이상한 씨앗", "plant", "seed", "leaf", "보통", "plant", ["seed"]), M("fiber", "질긴 섬유", "plant", "thread", "linen", "조악", "", ["fiber"]),
  // 가죽·천
  M("hide_raw", "날가죽", "hide", "hide", "brownhide", "보통", "", ["hide"]), M("hide_white", "흰 털가죽", "hide", "hide", "whitehide", "양질", "ice", ["hide"]), M("hide_black", "검은 털가죽", "hide", "hide", "blackhide", "정예", "dark", ["hide"]), M("leather", "무두질한 가죽", "hide", "leather", "leather", "양질", "", ["leather"]),
  M("cloth_linen", "아마포", "hide", "cloth", "linen", "보통", "", ["cloth"]), M("cloth_silk", "비단", "hide", "cloth", "silk", "희귀", "", ["cloth"]), M("cloth_red", "붉은 천", "hide", "cloth", "redcloth", "양질", "", ["cloth"]), M("thread", "실타래", "hide", "thread", "linen", "보통", "", ["string"]),
  M("string_silk", "거미줄 실", "hide", "thread", "silk", "정예", "", ["string"]), M("rope", "밧줄", "hide", "rope", "linen", "보통", "", ["string"]),
  // 정수(속성 결정)
  ...Object.entries(ELEM_PAL).map(([e, p]) => M("ess_" + e, ELEM_NAME[e] + "의 정수", "essence", "crystal", p, "희귀", e, ["essence"])),
  // 잡화·소모품 재료
  M("water", "맑은 물", "misc", "vial", "water", "조악", "water", ["liquid"]), M("oil", "기름", "misc", "vial", "oil", "보통", "", ["liquid"]), M("blood_vial", "피 한 병", "misc", "vial", "blood", "양질", "blood", ["liquid"]), M("gunpowder", "화약", "misc", "powder", "coal", "양질", "fire", ["powder"]),
  M("glass", "유리병", "misc", "vial", "diamond", "보통", "", ["bottle"]), M("gearp", "톱니바퀴", "misc", "gearp", "brass", "양질", "", ["mech"]), M("chip", "회로 조각", "misc", "chip", "circuit", "희귀", "thunder", ["mech"]),
];
export const BY_ID = Object.fromEntries(BASE.map((m) => [m.id, m]));

// ── 몬스터 부위 → 소재 모양·색·이름 ──
// 무리(모델·꼬리표)마다 부위 이름과 모양이 다르다: 용의 머리=용의 뿔, 짐승 머리=송곳니, 벌레 몸=갑각 …
const FAMILY = [
  [/dragon|wyvern|drake|hydra|용|룡|와이번|히드라/i, { head: ["뿔", "horn"], body: ["비늘", "scale"], tail: ["꼬리", "tail"], wings: ["날개막", "wing"], legs: ["발톱", "claw"], core: ["용심", "core"] }],
  [/chimera|키메라/i, { head: ["갈기", "hide"], body: ["가죽", "hide"], tail: ["뱀꼬리", "tail"], wings: ["날개", "wing"], legs: ["발톱", "claw"] }],
  [/bird|괴조|griffon|그리폰/i, { head: ["부리", "fang"], body: ["깃털", "feather"], tail: ["꽁지깃", "feather"], wings: ["칼깃", "feather"], legs: ["발톱", "claw"] }],
  [/beast|wolf|bear|boar|panther|rat|늑대|곰|멧돼지|표범|쥐|여우|들개|군견|악몽마/i, { head: ["송곳니", "fang"], body: ["털가죽", "hide"], tail: ["꼬리털", "tail"], legs: ["발톱", "claw"], wings: ["날개", "wing"] }],
  [/insect|spider|scorpion|mantis|centipede|bee|worm|벌레|거미|전갈|사마귀|지네|벌|갑충/i, { head: ["겹눈", "eye"], body: ["갑각", "shell"], tail: ["독침", "fang"], legs: ["가시다리", "claw"], wings: ["날개", "wing"], core: ["독샘", "vial"] }],
  [/aqua|crab|kraken|tentacle|jelly|shark|집게|촉수|해파리|상어/i, { head: ["눈알", "eye"], body: ["껍데기", "shell"], tail: ["촉수", "tentacle"], legs: ["집게발", "claw"], wings: ["지느러미", "wing"] }],
  [/reptile|snake|croc|toad|turtle|뱀|악어|두꺼비|거북/i, { head: ["독니", "fang"], body: ["비늘", "scale"], tail: ["꼬리", "tail"], legs: ["발톱", "claw"] }],
  [/slime|슬라임/i, { head: ["핵", "core"], body: ["점액", "goo"], tail: ["점액", "goo"], legs: ["점액", "goo"] }],
  [/plant|treant|flower|spore|트렌트|식인꽃|버섯/i, { head: ["꽃봉오리", "flower"], body: ["껍질", "log"], tail: ["덩굴", "rope"], legs: ["뿌리", "stick"], core: ["씨앗", "seed"] }],
  [/golem|gargoyle|armor|mimic|doll|골렘|가고일|갑옷|미믹|인형/i, { head: ["핵", "core"], body: ["돌조각", "ore"], tail: ["파편", "ore"], legs: ["관절석", "ore"], wings: ["돌날개", "wing"] }],
  [/undead|skeleton|zombie|ghoul|lich|wraith|ghost|해골|좀비|구울|리치|망령|유령/i, { head: ["두개골", "skull"], body: ["뼈", "bone"], tail: ["척추", "bone"], legs: ["대퇴골", "bone"], core: ["영혼석", "core"] }],
  [/spirit|elemental|정령/i, { head: ["결정", "crystal"], body: ["정수", "crystal"], tail: ["잔불", "core"], legs: ["결정", "crystal"] }],
  [/demon|imp|임프|악마/i, { head: ["뿔", "horn"], body: ["가죽", "hide"], tail: ["꼬리", "tail"], wings: ["날개막", "wing"], legs: ["발톱", "claw"] }],
  [/machine|drone|robot|turret|tank|mech|드론|로봇|포탑|전차|기갑|기계/i, { head: ["센서", "eye"], body: ["장갑판", "plate"], tail: ["배선", "chip"], legs: ["구동부", "gearp"], wings: ["로터", "gearp"], core: ["동력핵", "core"] }],
  [/eye|마안/i, { head: ["마안", "eye"], body: ["살점", "goo"] }],
];
const FAM_PAL = [[/화룡|fire|불꽃|화염/i, "dragonr"], [/지룡|earth/i, "dragong"], [/히드라|hydra|와이번|wyvern/i, "dragong"], [/용|룡|dragon/i, "dragonr"], [/늑대|wolf|여우/i, "wolf"], [/곰|bear/i, "bear"], [/괴조|bird/i, "bird"], [/전갈|scorpion/i, "scorpion"], [/거미|사마귀|지네|갑충|벌|insect/i, "chitin"], [/해파리|jelly/i, "jelly"],
  [/집게|촉수|상어|aqua|kraken/i, "aqua"], [/두꺼비|toad/i, "toad"], [/뱀|악어|거북|reptile/i, "reptile"], [/화염 슬라임/i, "fslime"], [/독 슬라임/i, "pslime"], [/슬라임/i, "slime"], [/트렌트/i, "treant"], [/버섯|spore/i, "spore"], [/꽃|plant/i, "plantm"], [/얼음 골렘/i, "icegolem"], [/가고일/i, "gargoyle"], [/골렘|golem/i, "golem"],
  [/리치/i, "lich"], [/망령|유령|ghost/i, "ghost"], [/해골|좀비|구울|undead/i, "undead"], [/불꽃 정령/i, "spiritf"], [/번개 정령/i, "spiritt"], [/수정 정령/i, "spiritc"], [/회오리 정령/i, "spiritw"], [/임프|demon/i, "demon"], [/드론|로봇|포탑|전차|기갑|기계|machine/i, "machine"], [/쥐|들개|군견|beast/i, "beast"]];
const famOf = (src, model) => (FAMILY.find(([re]) => re.test(model || "") || re.test(src || "")) || [null, { head: ["머리", "skull"], body: ["조각", "hide"], tail: ["꼬리", "tail"], wings: ["날개", "wing"], legs: ["발톱", "claw"] }])[1];
/** 전투에서 얻은 부위 → 소재 이름·모양·색. src = 몬스터 이름, part = head|body|tail|wings|legs */
export function partMaterial(src, part, model = "", elem = "") {
  const fam = famOf(src, model), [pn, shape] = fam[part] || fam.body || ["조각", "hide"], pal = (FAM_PAL.find(([re]) => re.test(src || "") || re.test(model || "")) || [null, elem ? ELEM_PAL[elem] : "beast"])[1];
  const base = String(src || "몬스터").replace(/\s*\d+$/, "").replace(/ 대장$/, "");
  const tag = { horn: "horn", fang: "fang", claw: "claw", scale: "scale", hide: "hide", wing: "wing", feather: "feather", shell: "shell", tail: "tail", skull: "bone", bone: "bone", eye: "eye", core: "core", goo: "goo", crystal: "essence", tentacle: "tail", plate: "plate", chip: "mech", gearp: "mech", ore: "stone", log: "log", rope: "string", stick: "stick", seed: "seed", flower: "herb", vial: "liquid" }[shape] || "part";
  return { name: base + "의 " + pn, shape, pal, tags: ["part", tag] };
}

// ── 아이콘(SVG 문자열) ──
const OUT = "#1a1420", W = "#ffffff";
/** 소재·아이템 아이콘. it = 장부 항목(shape·pal) 또는 도감 항목. size px */
const ICON_CACHE = new Map();
export function iconSvg(it, size = 32) {
  const ck = (it.shape || "") + "|" + (it.pal || "") + "|" + (it.elem || "") + "|" + size, hit = ICON_CACHE.get(ck); if (hit) return hit; if (ICON_CACHE.size > 3000) ICON_CACHE.clear();
  const shape = SHAPES[it.shape] || SHAPES.ore, pal = PAL[it.pal] || PAL[ELEM_PAL[it.elem]] || PAL.stone, col = { o: OUT, d: pal[0], b: pal[1], l: pal[2], a: pal[3], w: W };
  let r = ""; shape.forEach((row, y) => { for (let x = 0; x < 12; x++) { const c = row[x]; if (c && c !== "." && col[c]) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${col[c]}"/>`; } });
  const out = `<svg viewBox="0 0 12 12" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`; ICON_CACHE.set(ck, out); return out;
}
/** 장비(무기) 아이콘 모양: 종류 → 도트 모양 */
const WSHAPE = { sword: "w_sword", dagger: "w_dagger", lance: "w_lance", axe: "w_axe", bow: "w_bow", tome: "w_tome", staff: "w_staff", claw: "w_fist", item: "potion" };
const KSHAPE = { greatsword: "w_greatsword", katana: "w_sword", rapier: "w_sword", hammer: "w_hammer", greataxe: "w_axe", scythe: "w_axe", shield: "w_shield", orb: "core", wand: "w_wand", magestaff: "w_staff", holystaff: "w_staff", talisman: "charm", whip: "w_whip", claw: "claw", fist: "w_fist", shuriken: "w_dagger", crossbow: "w_bow", longbow: "w_bow", halberd: "w_lance", trident: "w_lance" };
const GPAL = ["iron", "iron", "steel", "steel", "silver", "mithril", "gold", "adamant"];
export const weaponIcon = (w) => ({ shape: /폭탄/.test(w.name || "") ? "w_bomb" : KSHAPE[w.kind] || WSHAPE[w.type] || "w_sword", pal: w.type === "item" ? "ruby" : w.elem ? ELEM_PAL[w.elem] : GPAL[Math.min(7, Math.floor((w.grade ?? 6) / 3))] });

// ── 채집: 전투 뒤 지형 테마·적에 따라 기본 소재를 몇 개 얻는다 ──
const GATHER = {
  "": ["log_oak", "herb_green", "stone", "fiber", "hide_raw", "ore_iron"], snow: ["hide_white", "gem_ice", "log_pine", "ore_silver", "salt"], desert: ["ore_copper", "gem_amber", "sulfur", "salt", "bamboo"], lava: ["ore_dark", "sulfur", "coal", "gem_ruby", "gem_obsidian", "flower_fire"],
  swamp: ["shroom_poison", "herb_blue", "resin", "log_ebony", "seed"], night: ["flower_moon", "shroom_glow", "gem_onyx", "hide_black"], cave: ["ore_iron", "ore_silver", "coal", "quartz", "gem_amethyst", "shroom_glow", "ore_mithril"],
  sea: ["gem_pearl", "water", "salt", "rope", "gem_sapphire"], city: ["nail", "gearp", "cloth_linen", "glass", "oil", "chip"], sky: ["gem_topaz", "ore_mithril", "bamboo", "string_silk"], autumn: ["log_oak", "shroom_red", "herb_red", "hide_raw", "seed"], hall: ["ingot_iron", "cloth_red", "gem_diamond", "ingot_silver", "glass"],
};
const HUMAN_DROP = ["ingot_iron", "leather", "cloth_linen", "thread", "nail", "oil", "ingot_copper", "rope"];
/** rnd: () => 0..1. 돌려주는 값: 도감 id 목록 */
export function gatherDrops(theme, foes, rnd, won = true) {
  if (!won) return []; const pool = GATHER[theme] || GATHER[""], out = [];
  const n = 2 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) out.push(pool[Math.floor(rnd() * pool.length)]);
  for (const f of foes) if (f.human && rnd() < 0.5) out.push(HUMAN_DROP[Math.floor(rnd() * HUMAN_DROP.length)]);
  if (rnd() < 0.15) out.push(["gem_ruby", "gem_sapphire", "gem_emerald", "gem_topaz"][Math.floor(rnd() * 4)]);
  return out;
}
/** 처음 장부: 손으로 만들어 볼 수 있게 기본 소재를 조금 */
export const STARTER = [["log_oak", 3], ["ingot_iron", 3], ["leather", 2], ["thread", 2], ["herb_green", 4], ["glass", 2], ["stone", 2], ["fiber", 3]];
