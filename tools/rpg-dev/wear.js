// Dusk Saga 옷 파츠(일상복·속옷 포함). 시트 "Dusk Saga 일상복 목록"의 파츠를 형태 값으로 만든다.
// 몸(피부·머리)을 먼저 칠하고, 입은 파츠를 레이어 순서대로 덧칠한다. 겹이 높을수록 조금 더 바깥까지 칠해 아래 옷을 덮는다.
// 슬롯마다 하나씩 입고 벗는다(속옷은 위·아래 따로). 색은 파츠마다 정한 슬롯 순서대로 바꿀 수 있다.
// 속옷까지 벗으면 특징 없는 마네킹 같은 맨몸으로만 그린다(신체 세부를 그리지 않음).

export const SLOTS = [
  ["hair", "머리", 0], ["underT", "속옷(위)", 1], ["underB", "속옷(아래)", 1], ["socks", "양말", 2], ["top", "상의", 3], ["bottom", "하의", 3], ["one", "일체형", 3],
  ["waist", "허리·겹침", 4], ["outer", "아우터", 5], ["shoes", "신발", 6], ["neck", "목", 7], ["bag", "가방", 8], ["head", "머리", 9], ["face", "얼굴", 9], ["hands", "손", 9]];
export const SLOT_LAYER = Object.fromEntries(SLOTS.map(([k, , l]) => [k, l]));

// 파츠: [슬롯, 이름, 성별(a 공용·f 여·m 남), 색 슬롯 이름들, 기본 색들, 형태]
const P = (slot, n, sx, cn, cd, sh) => ({ slot, n, sx, cn, cd, sh }), HC = ["머리색", "속색", "머리끈"], HD = [null, null, 0x2a2a34];
export const PARTS = {
  // ── 상의 ──
  tee: P("top", "반팔 티셔츠", "a", ["바탕", "프린트"], [0xf2f0ea, 0x3a5a8a], { sl: 1, hem: "hip", print: 1 }),
  crop: P("top", "크롭 티셔츠", "f", ["바탕", "프린트"], [0xf2f0ea, 0xd85a7a], { sl: 1, hem: "crop", print: 1, snug: 1 }),
  longtee: P("top", "긴팔 티셔츠", "a", ["바탕", "소매 끝"], [0x8a8a90, 0x6a6a70], { sl: 2, hem: "hip", cuff: 1 }),
  tank: P("top", "민소매 탑", "a", ["바탕"], [0x2a2a30], { sl: 0, hem: "hip", snug: 1 }),
  oversize: P("top", "오버사이즈 티셔츠", "a", ["바탕", "프린트"], [0x9a9aa0, 0x5a5a62], { sl: 1, wide: 1, hem: "thigh", print: 1, loose: 1 }),
  mtm: P("top", "맨투맨", "a", ["바탕", "밴드"], [0xd8c8a8, 0xb8a888], { sl: 2, hem: "hip", band: 1, cuff: 1 }),
  hoodie: P("top", "후드티", "a", ["바탕", "후드 안감", "끈"], [0x8a8c94, 0x6a6c74, 0xf0f0f0], { sl: 2, hem: "hip", hood: 1, band: 1, cuff: 1, pocket: 1 }),
  knit: P("top", "니트 스웨터", "a", ["바탕", "무늬"], [0xf0e8d8, 0xd8c8a8], { sl: 2, hem: "hip", knit: 1, band: 1, cuff: 1, loose: 1 }),
  knitvest: P("top", "니트 조끼", "a", ["바탕", "테두리"], [0x8a6a4a, 0x6a4a34], { sl: -1, hem: "hip", vneck: 1, knit: 1, over: 1 }),
  shirt: P("top", "긴팔 셔츠", "a", ["바탕", "단추"], [0xf6f6f8, 0xd8d8de], { sl: 2, hem: "hip", collar: "shirt", buttons: 1 }),
  sshirt: P("top", "반팔 셔츠", "a", ["바탕", "단추"], [0xb8d4ec, 0xf0f0f0], { sl: 1, hem: "hip", collar: "shirt", buttons: 1 }),
  blouse: P("top", "리본 블라우스", "f", ["바탕", "리본"], [0xf8f6f2, 0x2a2a34], { sl: 2, puff: 1, hem: "waist", collar: "round", bow: 1 }),
  sailor: P("top", "세일러 상의", "f", ["바탕", "깃", "깃 줄"], [0xf6f6f8, 0x26325a, 0xf0f0f0], { sl: 2, hem: "waist", collar: "sailor" }),
  gym: P("top", "체육복 상의", "a", ["바탕", "테두리"], [0xf6f6f8, 0x2a3a6a], { sl: 1, hem: "hip", trimNeck: 1, tag: 1 }),
  sportsbra: P("top", "스포츠 브라탑", "f", ["바탕", "띠"], [0x2a2a30, 0xe85a8a], { sl: 0, hem: "bra", snug: 1 }),
  pjtop: P("top", "파자마 상의", "a", ["바탕", "체크선", "테두리"], [0xb8d8f0, 0x8ab0d8, 0xf0f6fa], { sl: 2, hem: "hip", collar: "shirt", buttons: 1, check: 1, loose: 1 }),
  jeogori: P("top", "저고리", "a", ["바탕", "깃", "고름"], [0xf0b8c8, 0xf0f0f0, 0xb8304a], { sl: 2, wide: 1, hem: "high", collar: "jeogori", goreum: 1 }),
  tunic: P("top", "튜닉", "a", ["바탕", "끈"], [0x7a6a4a, 0x3a2a1c], { sl: 2, hem: "hip", vneck: 1, lace: 1, loose: 1 }),
  gambeson: P("top", "누비 갬비슨", "a", ["바탕", "누빔선"], [0xb8a27a, 0x8a7656], { sl: 2, hem: "hip", quiltTop: 1, collar: "mandarin", loose: 1 }),
  leathervest: P("top", "가죽 조끼", "a", ["바탕", "끈"], [0x5a3a24, 0x2a1c12], { sl: -1, hem: "hip", vneck: 1, lace: 1, over: 1 }),
  peasant: P("top", "농부 블라우스", "f", ["바탕", "끈"], [0xf0e6cc, 0x8a5a34], { sl: 2, puff: 1, hem: "waist", lace: 1, corset: 1 }),
  // ── 아우터 ──
  cloak: P("outer", "여행 망토", "a", ["바탕", "안감", "브로치"], [0x3a4a3a, 0x6a2a2a, 0xd8b86a], { cape: "long", hood: 1, clasp: 1 }),
  shortcape: P("outer", "숄더 케이프", "a", ["바탕", "안감", "브로치"], [0x26325a, 0xd8b86a, 0xd8b86a], { cape: "short", clasp: 1 }),
  robe: P("outer", "마법사 로브", "a", ["바탕", "테두리"], [0x3a2a5a, 0xd8b86a], { len: "long", open: 1, hood: 1, trimEdge: 1 }),
  surcoat: P("outer", "기사 서코트", "a", ["바탕", "문장"], [0xf0e8d8, 0xb8202c], { len: "knee", sleeveless: 1, emblemBig: 1, belt: 1 }),
  hunter: P("outer", "사냥꾼 코트", "a", ["바탕", "벨트"], [0x4a3a2a, 0x2a1c12], { len: "knee", open: 1, lapel: 1, belt: 1, pocket2: 1 }),
  zipup: P("outer", "후드 집업", "a", ["바탕", "지퍼"], [0x2a3450, 0xd8d8de], { len: "hip", open: 1, zip: 1, hood: 1, cuff: 1 }),
  cardigan: P("outer", "가디건", "a", ["바탕", "단추"], [0xf0e6cc, 0xb89a6a], { len: "hip", open: 1, buttons: 1, knit: 1 }),
  blazer: P("outer", "블레이저", "a", ["바탕", "단추", "엠블럼"], [0x26325a, 0xd8b86a, 0xd8b86a], { len: "hip", open: 1, lapel: 1, buttons: 1, emblem: 1 }),
  suitjk: P("outer", "정장 재킷", "a", ["바탕", "단추"], [0x22242c, 0x14141a], { len: "hip", open: 1, lapel: 1, buttons: 1, sq: 1 }),
  rider: P("outer", "라이더 재킷", "a", ["바탕", "지퍼"], [0x1c1a20, 0xc8c8d0], { len: "waist", open: 1, zip: "diag", sq: 1 }),
  denimjk: P("outer", "데님 재킷", "a", ["바탕", "스티치"], [0x4a6a9a, 0xd8b86a], { len: "waist", open: 1, stitch: 1, pocket2: 1 }),
  trackjk: P("outer", "트랙 재킷", "a", ["바탕", "옆줄"], [0x1c1c24, 0xf0f0f0], { len: "hip", open: 1, zip: 1, stripe: 1 }),
  trench: P("outer", "트렌치코트", "a", ["바탕", "벨트"], [0xc0a070, 0x9a7a4a], { len: "knee", open: 1, lapel: 1, belt: 1, buttons: 1 }),
  longcoat: P("outer", "롱코트", "a", ["바탕", "단추"], [0x2a3450, 0x14141a], { len: "long", open: 1, lapel: 1, buttons: 1 }),
  padding: P("outer", "롱패딩", "a", ["바탕", "누빔선"], [0x1c1c22, 0x34343c], { len: "long", zip: 1, quilt: 1, puffy: 1, hood: 1 }),
  gown: P("outer", "흰 가운", "a", ["바탕"], [0xf6f6f8], { len: "knee", open: 1, lapel: 1, pocket2: 1 }),
  tailcoat: P("outer", "연미복", "m", ["바탕", "조끼"], [0x14141a, 0x5a5a62], { len: "tails", open: 1, lapel: 1, vest: 1 }),
  // ── 하의 ──
  jeans: P("bottom", "일자 청바지", "a", ["바탕", "스티치"], [0x3a5a8a, 0xc8a050], { pl: "ankle", stitch: 1 }),
  skinny: P("bottom", "스키니진", "a", ["바탕"], [0x1c1c24], { pl: "ankle", snug: 1 }),
  slacks: P("bottom", "슬랙스", "a", ["바탕"], [0x22242c], { pl: "ankle", crease: 1 }),
  chino: P("bottom", "치노 팬츠", "a", ["바탕"], [0xc8b08a], { pl: "ankle", loose: 1 }),
  jogger: P("bottom", "조거 팬츠", "a", ["바탕", "허리 끈"], [0x8a8c94, 0xf0f0f0], { pl: "ankle", loose: 1, cuffLeg: 1, string: 1 }),
  trackpants: P("bottom", "트랙 팬츠", "a", ["바탕", "옆줄"], [0x1c1c24, 0xf0f0f0], { pl: "ankle", stripe: 1 }),
  wide: P("bottom", "와이드 팬츠", "a", ["바탕"], [0x8a8a90], { pl: "ankle", wideLeg: 1 }),
  dolphin: P("bottom", "돌핀팬츠", "a", ["바탕", "테두리(파이핑)"], [0xf28aa8, 0xf6f6f8], { pl: "micro", dolphin: 1, snug: 1 }),
  shorts: P("bottom", "반바지", "a", ["바탕"], [0x2a3a6a], { pl: "short", loose: 1 }),
  leggings: P("bottom", "레깅스", "f", ["바탕"], [0x1c1c22], { pl: "ankle", snug: 2 }),
  pjpants: P("bottom", "파자마 바지", "a", ["바탕", "체크선"], [0xb8d8f0, 0x8ab0d8], { pl: "ankle", loose: 1, check: 1 }),
  pleatmini: P("bottom", "플리츠 미니스커트", "f", ["바탕", "체크선"], [0x26325a, 0x26325a], { sk: 4, fl: 1.4, pleat: 1 }),
  pleatlong: P("bottom", "플리츠 롱스커트", "f", ["바탕"], [0x8a6a4a], { sk: 11.5, fl: 2.2, pleat: 1 }),
  aline: P("bottom", "A라인 미니스커트", "f", ["바탕"], [0x1c1c22], { sk: 4.2, fl: 1.9 }),
  pencil: P("bottom", "펜슬 스커트", "f", ["바탕"], [0x6a6a72], { sk: 6.5, fl: .25 }),
  hanbokskirt: P("bottom", "한복 치마", "f", ["바탕", "단"], [0x26325a, 0xd8b86a], { sk: 12.5, fl: 3, high: 1, hemTrim: 1 }),
  leatherpants: P("bottom", "가죽 바지", "a", ["바탕"], [0x3a2a1c], { pl: "ankle", snug: 1, stitch: 1 }),
  breeches: P("bottom", "승마 바지", "a", ["바탕"], [0xc8b08a], { pl: "ankle", loose: 1, cuffLeg: 1 }),
  // ── 일체형 ──
  mageRobe: P("one", "마도사 로브 드레스", "a", ["바탕", "테두리"], [0x2a2a5a, 0xd8b86a], { sl: 3, wide: 1, hem: "waist", collar: "wrap", sk: 12, fl: 1.4, hemTrim: 1 }),
  habit: P("one", "수녀복", "f", ["바탕", "깃"], [0x14141a, 0xf6f6f8], { sl: 2, hem: "waist", collar: "round", sk: 12.5, fl: 1 }),
  priest: P("one", "사제복", "a", ["바탕", "테두리"], [0xf6f6f8, 0xd8b86a], { sl: 3, wide: 1, hem: "waist", collar: "mandarin", sk: 12, fl: .8, hemTrim: 1, sash: 1 }),
  dancer: P("one", "무희 의상", "f", ["바탕", "장식"], [0xb8303a, 0xd8b86a], { sl: 0, hem: "waist", sk: 10, fl: 2.6, slit: 1, hemTrim: 1, sash: 1 }),
  overall: P("one", "데님 멜빵바지", "a", ["바탕", "끈", "단추"], [0x4a6a9a, 0x4a6a9a, 0xd8b86a], { pl: "ankle", bib: 1, loose: 1 }),
  sundress: P("one", "민소매 원피스", "f", ["바탕", "무늬", "허리띠"], [0xa8d0ec, 0xf6f6f8, 0xf6f6f8], { sl: 0, hem: "waist", sk: 7, fl: 2.4, sash: 1, dots: 1 }),
  longdress: P("one", "긴팔 원피스", "f", ["바탕", "깃"], [0x6a2434, 0xf0e8d8], { sl: 2, hem: "waist", collar: "round", sk: 9, fl: 1.8 }),
  maid: P("one", "메이드 원피스", "f", ["바탕", "깃", "소매단"], [0x1c1c22, 0xf6f6f8, 0xf6f6f8], { sl: 1, puff: 1, hem: "waist", collar: "round", sk: 7, fl: 2.6, cuffC: 1 }),
  qipao: P("one", "치파오", "f", ["바탕", "테두리", "무늬"], [0xb8202c, 0xd8b86a, 0xd8b86a], { sl: 0, hem: "waist", collar: "mandarin", sk: 10, fl: .4, slit: 1, frog: 1 }),
  yukata: P("one", "유카타", "a", ["바탕", "무늬"], [0x26325a, 0xf0a8c0], { sl: 3, hem: "waist", collar: "wrap", sk: 12, fl: .6, flowers: 1 }),
  swimsuit: P("one", "원피스 수영복", "f", ["바탕", "테두리"], [0x2a6ab8, 0xf6f6f8], { sl: 0, hem: "swim", snug: 1 }),
  gothic: P("one", "고딕 드레스", "f", ["바탕", "프릴", "리본"], [0x1c1820, 0x6a1a2a, 0x6a1a2a], { sl: 2, puff: 1, hem: "waist", collar: "round", corset: 1, sk: 8, fl: 3, tiers: 1 }),
  // ── 신발 ──
  sneakers: P("shoes", "운동화", "a", ["바탕", "밑창"], [0xf6f6f8, 0xd8d8de], { sh: "low", sole: 1, laces: 1 }),
  loafer: P("shoes", "로퍼", "a", ["바탕"], [0x5a3a24], { sh: "low" }),
  dress: P("shoes", "구두", "a", ["바탕"], [0x14141a], { sh: "low", shine: 1 }),
  heels: P("shoes", "힐", "f", ["바탕"], [0x14141a], { sh: "low", heel: 1 }),
  maryjane: P("shoes", "메리제인", "f", ["바탕", "끈"], [0x14141a, 0x14141a], { sh: "low", strap: 1 }),
  sandal: P("shoes", "샌들", "a", ["끈"], [0x8a5a34], { sh: "sandal" }),
  slipper: P("shoes", "슬리퍼", "a", ["바탕"], [0x8a8a92], { sh: "slip" }),
  ankleboots: P("shoes", "앵클부츠", "a", ["바탕"], [0x5a3a24], { sh: "boot", h: 3.2 }),
  longboots: P("shoes", "롱부츠", "a", ["바탕"], [0x14141a], { sh: "boot", h: 6.4 }),
  walker: P("shoes", "워커", "a", ["바탕", "끈"], [0x1c1a18, 0x8a7a5a], { sh: "boot", h: 3, sole: 1, laces: 1, chunky: 1 }),
  geta: P("shoes", "게다", "a", ["바탕", "끈"], [0xb8925a, 0xb8202c], { sh: "geta" }),
  ranger: P("shoes", "레인저 부츠", "a", ["바탕", "끈"], [0x4a3220, 0x2a1c12], { sh: "boot", h: 5, laces: 1, sole: 1 }),
  // ── 양말·다리 ──
  kneesocks: P("socks", "니삭스", "f", ["바탕"], [0x1c1c22], { so: 6.2 }),
  anklesocks: P("socks", "발목 양말", "a", ["바탕"], [0xf6f6f8], { so: 1.9 }),
  stockings: P("socks", "스타킹", "f", ["바탕"], [0x2a2430], { so: 13, sheer: 1 }),
  // ── 허리·겹침 ──
  apron: P("waist", "앞치마(가슴)", "a", ["바탕", "프릴"], [0xf6f6f8, 0xf6f6f8], { apron: "full" }),
  waistapron: P("waist", "허리 앞치마", "a", ["바탕"], [0x5a3a24], { apron: "waist" }),
  belt: P("waist", "벨트", "a", ["바탕", "버클"], [0x3a2a1c, 0xd8c8a0], { beltW: .9 }),
  obi: P("waist", "오비", "a", ["바탕", "매듭"], [0xb8202c, 0xd8b86a], { beltW: 1.8, bow: 1 }),
  sash: P("waist", "천 허리띠", "a", ["바탕"], [0xb8303a], { beltW: 1.4 }),
  pouchbelt: P("waist", "주머니 벨트", "a", ["바탕", "주머니"], [0x3a2a1c, 0x6a4a2a], { beltW: 1, pouch: 1 }),
  // ── 목 ──
  amulet: P("neck", "부적 목걸이", "a", ["줄", "보석"], [0xd8b86a, 0x3a8ad8], { ne: "amulet" }),
  ribbon: P("neck", "목 리본", "f", ["바탕"], [0xb8202c], { ne: "ribbon" }),
  tie: P("neck", "넥타이", "a", ["바탕", "사선 줄"], [0x26325a, 0xb8202c], { ne: "tie" }),
  scarf: P("neck", "세일러 스카프", "f", ["바탕"], [0xb8202c], { ne: "scarf" }),
  muffler: P("neck", "목도리", "a", ["바탕", "줄무늬"], [0xb8303a, 0xf0e8d8], { ne: "muffler" }),
  choker: P("neck", "초커", "f", ["바탕", "장식"], [0x14141a, 0xd8d8de], { ne: "choker" }),
  // ── 머리 ──
  cap: P("head", "야구모자", "a", ["바탕", "챙"], [0x1c1c22, 0x1c1c22], { hd: "cap" }),
  beanie: P("head", "비니", "a", ["바탕"], [0x8a8a92], { hd: "beanie" }),
  straw: P("head", "밀짚모자", "a", ["바탕", "리본"], [0xe0c88a, 0x1c1c22], { hd: "straw" }),
  headband: P("head", "머리띠", "a", ["바탕"], [0xf6f6f8], { hd: "band" }),
  hairribbon: P("head", "머리 리본", "f", ["바탕"], [0xb8202c], { hd: "bow" }),
  hairpin: P("head", "헤어핀", "a", ["바탕"], [0xf0c840], { hd: "pin" }),
  ucap: P("head", "제복 모자", "a", ["바탕", "띠", "휘장"], [0x1c2440, 0x14141a, 0xd8b86a], { hd: "ucap" }),
  chef: P("head", "요리사 모자", "a", ["바탕"], [0xf6f6f8], { hd: "chef" }),
  hoodup: P("head", "쓴 후드", "a", ["바탕"], [0x3a4a3a], { hd: "hood" }),
  wizard: P("head", "마법사 모자", "a", ["바탕", "띠"], [0x3a2a5a, 0xd8b86a], { hd: "wizard" }),
  circlet: P("head", "서클릿", "a", ["바탕", "보석"], [0xd8b86a, 0xb8202c], { hd: "circlet" }),
  flowers: P("head", "화관", "f", ["꽃", "잎"], [0xf0a8c0, 0x5a8a4a], { hd: "flowers" }),
  // ── 얼굴·손·가방 ──
  bracers: P("hands", "가죽 팔보호대", "a", ["바탕", "끈"], [0x5a3a24, 0x2a1c12], { ha: "bracer" }),
  lgloves: P("hands", "가죽 장갑", "a", ["바탕"], [0x3a2a1c], { ha: "gloves" }),
  quiver: P("bag", "화살통", "a", ["바탕", "깃"], [0x5a3a24, 0xf0e8d8], { bg: "quiver" }),
  satchel: P("bag", "가죽 가방", "a", ["바탕", "끈"], [0x6a4a2a, 0x3a2a1c], { bg: "shoulder" }),
  glasses: P("face", "안경", "a", ["테"], [0x1c1c22], { fa: "glasses" }),
  sunglasses: P("face", "선글라스", "a", ["테", "알"], [0x1c1c22, 0x14141a], { fa: "sun" }),
  watch: P("hands", "손목시계", "a", ["띠", "시계판"], [0x5a3a24, 0xe8e8ec], { ha: "watch" }),
  gloves: P("hands", "흰 장갑", "a", ["바탕"], [0xf6f6f8], { ha: "gloves" }),
  backpack: P("bag", "백팩", "a", ["바탕", "끈"], [0x1c1c22, 0x2a2a30], { bg: "back" }),
  shoulderbag: P("bag", "숄더백", "f", ["바탕", "끈"], [0x8a5a34, 0x5a3a24], { bg: "shoulder" }),
  // ── 머리(헤어스타일). 색: 머리색(비우면 캐릭터 머리색) · 속색(브릿지·끝) · 머리끈 ──
  hBob: P("hair", "단발", "a", HC, HD, { bang: "full", back: 1, side: 1 }),
  hShort: P("hair", "숏컷", "a", HC, HD, { bang: "side", back: 0 }),
  hLong: P("hair", "긴 생머리", "a", HC, HD, { bang: "full", back: 2, side: 2 }),
  hXLong: P("hair", "허리까지 긴 머리", "f", HC, HD, { bang: "full", back: 3, side: 2 }),
  hPony: P("hair", "포니테일", "a", HC, HD, { bang: "side", back: 0, tail: "high" }),
  hLowPony: P("hair", "낮은 포니테일", "a", HC, HD, { bang: "full", back: 0, tail: "low" }),
  hTwin: P("hair", "트윈테일", "f", HC, HD, { bang: "full", back: 0, tail: "twin" }),
  hTwinBraid: P("hair", "양갈래 땋기", "f", HC, HD, { bang: "full", back: 0, tail: "twinbraid" }),
  hSideBraid: P("hair", "한쪽 땋기", "f", HC, HD, { bang: "side", back: 1, tail: "sidebraid" }),
  hBun: P("hair", "똥머리", "a", HC, HD, { bang: "none", back: 0, tail: "bun" }),
  hDoubleBun: P("hair", "양쪽 번", "f", HC, HD, { bang: "full", back: 0, tail: "dbun" }),
  hWave: P("hair", "웨이브 롱", "f", HC, HD, { bang: "side", back: 2, side: 2, wave: 1 }),
  hHime: P("hair", "히메컷", "f", HC, HD, { bang: "full", back: 3, side: 3 }),
  hWolf: P("hair", "울프컷", "a", HC, HD, { bang: "full", back: 1, spike: 1 }),
  hNoBang: P("hair", "앞머리 없는 긴 머리", "f", HC, HD, { bang: "none", back: 2, side: 2, part: 1 }),
  hHalf: P("hair", "반묶음", "f", HC, HD, { bang: "side", back: 2, side: 1, tail: "half" }),
  hCrew: P("hair", "짧은 머리", "a", HC, HD, { bang: "short", back: 0 }),
  hTwoBlock: P("hair", "투블럭", "m", HC, HD, { bang: "side", back: 0, under: 1 }),
  hBuzz: P("hair", "스포츠 머리", "m", HC, HD, { bang: "buzz", back: 0, buzz: 1 }),
  hSidePart: P("hair", "가르마", "a", HC, HD, { bang: "part", back: 0 }),
  hSlick: P("hair", "올백", "m", HC, HD, { bang: "none", back: 0, slick: 1 }),
  hMessy: P("hair", "덥수룩한 머리", "a", HC, HD, { bang: "full", back: 1, spike: 1, vol: 1 }),
  hManBun: P("hair", "장발 묶음", "m", HC, HD, { bang: "part", back: 0, tail: "bun" }),
  hSpiky: P("hair", "삐죽머리", "m", HC, HD, { bang: "spike", back: 0, spike: 2 }),
  // ── 속옷 ──
  bra: P("underT", "기본 브라", "f", ["바탕", "테두리"], [0xf6f4f0, 0xe8e0d8], { un: "bra" }),
  panty: P("underB", "기본 팬티", "f", ["바탕", "테두리"], [0xf6f4f0, 0xe8e0d8], { un: "panty" }),
  trunks: P("underB", "트렁크", "m", ["바탕", "허리밴드"], [0xa8c8e8, 0xf0f0f0], { un: "trunks" }),
  drawers: P("underB", "드로즈", "m", ["바탕", "허리밴드"], [0x5a5a62, 0x1c1c22], { un: "drawers" }),
  undershirt: P("underT", "러닝셔츠", "m", ["바탕"], [0xf6f6f8], { un: "undershirt" }),
  camisole: P("underT", "캐미솔", "f", ["바탕", "테두리"], [0xf0e8d8, 0xe0d4c0], { un: "cami" }),
  slip: P("underT", "슬립(속치마)", "f", ["바탕", "테두리"], [0xf0e8d8, 0xe0d4c0], { un: "slip" }),
  sportsunder: P("underT", "스포츠 속옷 세트", "a", ["바탕", "밴드"], [0x8a8a92, 0x2a2a30], { un: "sport" }),
  longjohns: P("underT", "내복(상하)", "a", ["바탕"], [0xd8c8a8], { un: "johns" }),
};

// 기본 차림: 아무것도 지정하지 않았을 때(속옷은 기본으로 입힌다)
export const DEFAULT_WEAR = (sex) => (sex === "f" ? { underT: { id: "bra" }, underB: { id: "panty" }, top: { id: "tee" }, bottom: { id: "jeans" }, shoes: { id: "sneakers" } } : { underB: { id: "trunks" }, top: { id: "tee" }, bottom: { id: "jeans" }, shoes: { id: "sneakers" } });

// 예시 차림(정비 화면·미리보기에서 한 번에 입히기)
export const WEAR_PRESETS = {
  "기본": (s) => DEFAULT_WEAR(s),
  "크롭티+돌핀팬츠": () => ({ underT: { id: "bra" }, underB: { id: "panty" }, top: { id: "crop" }, bottom: { id: "dolphin" }, socks: { id: "anklesocks" }, shoes: { id: "sneakers" } }),
  "세일러 교복": () => ({ underT: { id: "bra" }, underB: { id: "panty" }, top: { id: "sailor" }, bottom: { id: "pleatmini" }, neck: { id: "scarf" }, socks: { id: "kneesocks" }, shoes: { id: "loafer" } }),
  "블레이저 교복": (s) => (s === "f" ? { underT: { id: "bra" }, underB: { id: "panty" }, top: { id: "shirt" }, bottom: { id: "pleatmini", c: [0x2a3a6a, 0xb8303a] }, outer: { id: "blazer" }, neck: { id: "ribbon" }, socks: { id: "kneesocks" }, shoes: { id: "loafer" }, bag: { id: "backpack" } } : { underB: { id: "trunks" }, top: { id: "shirt" }, bottom: { id: "slacks" }, outer: { id: "blazer" }, neck: { id: "tie" }, shoes: { id: "loafer" } }),
  "정장": (s) => (s === "f" ? { underT: { id: "camisole" }, underB: { id: "panty" }, top: { id: "blouse" }, bottom: { id: "pencil" }, outer: { id: "suitjk" }, socks: { id: "stockings" }, shoes: { id: "heels" } } : { underT: { id: "undershirt" }, underB: { id: "trunks" }, top: { id: "shirt" }, bottom: { id: "slacks" }, outer: { id: "suitjk" }, neck: { id: "tie" }, shoes: { id: "dress" }, hands: { id: "watch" } }),
  "트레이닝복": () => ({ underB: { id: "drawers" }, top: { id: "tee" }, bottom: { id: "trackpants" }, outer: { id: "trackjk" }, shoes: { id: "sneakers" } }),
  "파자마": () => ({ underB: { id: "panty" }, top: { id: "pjtop" }, bottom: { id: "pjpants" }, shoes: { id: "slipper" } }),
  "겨울": () => ({ underT: { id: "longjohns" }, top: { id: "knit" }, bottom: { id: "slacks" }, outer: { id: "longcoat" }, neck: { id: "muffler" }, shoes: { id: "longboots" } }),
  "메이드": () => ({ underT: { id: "slip" }, one: { id: "maid" }, waist: { id: "apron" }, head: { id: "headband" }, socks: { id: "kneesocks", c: [0xf6f6f8] }, shoes: { id: "maryjane" } }),
  "유카타": () => ({ underT: { id: "slip" }, one: { id: "yukata" }, waist: { id: "obi" }, shoes: { id: "geta" } }),
  "모험가": (s) => ({ underT: { id: s === "f" ? "bra" : "undershirt" }, underB: { id: s === "f" ? "panty" : "drawers" }, top: { id: "tunic" }, bottom: { id: "leatherpants" }, outer: { id: "cloak" }, waist: { id: "pouchbelt" }, shoes: { id: "ranger" }, hands: { id: "bracers" }, bag: { id: "quiver" } }),
  "마법사": (s) => ({ underT: { id: s === "f" ? "slip" : "undershirt" }, one: { id: "mageRobe" }, head: { id: "wizard" }, neck: { id: "amulet" }, shoes: { id: "ankleboots" } }),
  "사제": () => ({ underT: { id: "undershirt" }, one: { id: "priest" }, head: { id: "circlet" }, shoes: { id: "sandal" } }),
  "기사": () => ({ underT: { id: "undershirt" }, top: { id: "gambeson" }, bottom: { id: "breeches" }, outer: { id: "surcoat" }, shoes: { id: "longboots" }, hands: { id: "lgloves" } }),
  "여름": () => ({ underT: { id: "bra" }, underB: { id: "panty" }, one: { id: "sundress" }, head: { id: "straw" }, shoes: { id: "sandal" } }),
  "속옷만": (s) => (s === "f" ? { underT: { id: "bra" }, underB: { id: "panty" } } : { underB: { id: "trunks" } }),
};

/** 몸과 옷을 칠한다. C = { blob, f, dk, lt, SKIN, HAIR } (voxkit body()의 도구) */
export function paintWear(C, wear) {
  const { blob, f, dk, lt, SKIN, HAIR } = C, hp = f ? 4.1 : 3.8, wa = f ? 3 : 3.9, sh = f ? 3.6 : 4.9, hy = 28;
  const LEG = [["R", -1], ["L", 1]];
  // ── 맨몸(마네킹처럼 특징 없이) ──
  for (const [s, k] of LEG) { const lx = k * 2.4; blob("ul" + s, lx, 9, 0, 1.9, 3.6, 2, 3, SKIN); blob("ll" + s, lx, 3.2, 0, 1.75, 3.8, 1.9, 3.4, SKIN); blob("ll" + s, lx, 1, .9, 1.9, 1.4, 2.9, 4, SKIN); }
  blob("hips", 0, 12, 0, hp, 2.2, 2.5, 3, SKIN); blob("chest", 0, 15.5, 0, wa, 3, 2.3, 3, SKIN); blob("chest", 0, 19, 0, sh, 3.4, 2.6, 2.8, SKIN); if (f) blob("chest", 0, 18.4, 1.5, 3, 1.5, 1.4, 2.4, SKIN); blob("chest", 0, 22.2, 0, 1.6, 1.6, 1.6, 3, SKIN);
  for (const [s, k] of LEG) { blob("ua" + s, k * 5.5, 18.6, 0, 1.6, 3.2, 1.7, 3, SKIN); blob("la" + s, k * 5.8, 13.6, .2, 1.45, 2.9, 1.55, 3.2, SKIN); blob("la" + s, k * 5.9, 10.9, .4, 1.5, 1.5, 1.6, 3, SKIN); }
  blob("head", 0, hy, 0, 4.3, 4.6, 4.2, 4.6, (x, y, z) => (y > hy + .8 && z > 0 ? dk(SKIN, .93) : SKIN));
  const hd = wear.head && PARTS[wear.head.id]?.sh.hd;
  const hw = wear.hair && PARTS[wear.hair.id]?.slot === "hair" ? wear.hair : null, capped = hd === "beanie" || hd === "chef";
  if (hw) style(PARTS[hw.id].sh, hw.c || [], capped); else if (!capped) hair(); else blob("head", 0, hy + 1.2, -.4, 4.9, 4.3, 4.8, 2.6, HAIR, (x, y, z) => z < -.6 && y < hy + 1);
  // 헤어스타일: 덮개(정수리)·앞머리·뒷머리 길이·옆머리·묶음
  function style(s, cc, capped) {
    const H0 = cc[0] ?? HAIR, H1 = cc[1] ?? lt(H0, 1.25), tie = cc[2] ?? 0x2a2a34, tex = (x, y, z, X, Y, Z) => ((X * 3 + Z * 2) % 5 === 0 ? lt(H0, 1.22) : (X + Z) % 4 === 0 ? dk(H0, .84) : H0), tip = (lo) => (x, y, z, X, Y, Z) => (y < lo + 1.2 ? H1 : tex(x, y, z, X, Y, Z));
    const vol = s.vol ? .35 : 0, buzz = s.buzz ? -.35 : 0;
    // 정수리 덮개
    if (!capped) blob("head", 0, hy + 1.2 + (s.slick ? .2 : 0), -.4, 4.85 + vol + buzz, 4.3 + vol + buzz, 4.75 + vol + buzz, 2.6, tex, (x, y, z) => y > hy + (s.under ? 1.6 : 1.2) || z < -.6 || (!s.under && !s.buzz && Math.abs(x) > 3.4 && z < .8 && y > hy - 2));
    if (s.under) blob("head", 0, hy, -.3, 4.5, 3.6, 4.4, 3, dk(H0, .7), (x, y, z) => y < hy + 1.6 && y > hy - 2.6 && z < 1.5);
    // 앞머리
    const b = s.bang;
    if (b === "full") blob("head", 0, hy + 2.4, 3.2, 3.9, 1.6, 1.7, 2.6, (x, y, z, X) => ((X + 90) % 4 === 0 ? lt(H0, 1.28) : (X + 90) % 4 === 2 ? dk(H0, .84) : H0));
    if (b === "side" || b === "part") blob("head", b === "part" ? 1 : .8, hy + 2.6, 3.1, 3.2, 1.3, 1.6, 2.6, tex, (x, y) => y > hy + 2 - x * .45);
    if (b === "short") blob("head", 0, hy + 3, 3.1, 3.6, .9, 1.4, 2.6, tex);
    if (b === "spike") for (let i = -2; i <= 2; i++) blob("head", i * 1.4, hy + 3.4, 3.4, .7, 1.4, .8, 2, tex);
    if (s.spike) for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; blob("head", Math.cos(a) * 3.6, hy + 4 + (s.spike > 1 ? 1 : 0), Math.sin(a) * 3.4 - .4, .9, 1.4 + (s.spike > 1 ? .6 : 0), .9, 2, tex); }
    if (s.part) blob("head", 0, hy + 4.4, 2, .2, .3, 2.4, 2, dk(H0, .7));
    // 뒷머리·옆머리
    const back = s.back || 0, lo = [hy - 1.4, hy - 6, hy - 11, hy - 16][back];
    if (back >= 1 && !capped) blob("head", 0, hy - 1.6, -3.2, 4.4 + vol, 3.6, 2, 2.6, tex);
    if (back >= 1) blob("head", 0, (hy - 1 + lo) / 2, -3.1, 4.3 + vol + (s.wave ? .3 : 0), (hy - 1 - lo) / 2, 1.9, 2.6, back >= 2 ? tip(lo) : tex, back >= 2 ? null : (x, y) => y > hy - 6);
    if (back >= 2) blob("chest", 0, Math.max(lo, 8) + 4, -3.4, 4 + (s.wave ? .4 : 0), Math.min(7, (22 - Math.max(lo, 8)) / 2 + 1), 1.4, 2.6, tip(lo), (x, y) => y > lo && y < 22);
    if (s.wave) for (let i = 0; i < 6; i++) blob("chest", (i % 2 ? 1 : -1) * 3.4, 20 - i * 1.6, -2.6, .9, 1, 1.2, 2, H1);
    if (s.side) for (const k of [-1, 1]) blob("head", k * 4.2, hy - 1.2 - s.side, .6, .9, 3 + s.side * 1.2, 1.6, 3, s.side >= 3 ? (x, y, z, X, Y) => (y < hy - 3 ? H0 : tex(x, y, z, X, Y)) : tex);
    // 묶음
    const t = s.tail, bun = (x, y, z, r) => { blob("head", x, y, z, r, r, r, 2.4, tex); };
    if (t === "high" || t === "low") { const y0 = t === "high" ? hy + 3 : hy - .5; blob("head", 0, y0, -4.4, .9, .7, .7, 3, tie); for (let i = 0; i < 6; i++) blob(i < 3 ? "head" : "chest", 0, i < 3 ? y0 - 1 - i * 1.6 : 22 - (i - 3) * 1.8, -5 - (i < 3 ? i * .2 : .6) - (i ? 0 : 0), 1.3 - i * .1, 1.2, 1.1, 2.4, i > 3 ? H1 : tex); }
    if (t === "twin" || t === "twinbraid") for (const k of [-1, 1]) { blob("head", k * 4.2, hy + 2.2, -1.6, .8, .8, .8, 3, tie); for (let i = 0; i < 7; i++) { const br = t === "twinbraid"; blob(i < 3 ? "head" : "chest", k * (4.8 + (br ? 0 : i * .12)), i < 3 ? hy + 1 - i * 1.8 : 22.6 - (i - 3) * 1.9, i < 3 ? -1.8 : -.9, br ? .9 : 1.3 - i * .06, 1.1, br ? .9 : 1.1, br ? 2 : 2.4, br && i % 2 ? dk(H0, .8) : i > 5 ? H1 : tex); } }
    if (t === "sidebraid") { for (let i = 0; i < 6; i++) blob(i < 2 ? "head" : "chest", 3.6, i < 2 ? hy - 3 - i * 1.6 : 21.4 - (i - 2) * 1.6, 2.2, .9, .9, .9, 2, i % 2 ? dk(H0, .8) : H0); blob("chest", 3.6, 15, 2.2, .6, .5, .6, 3, tie); }
    if (t === "bun") { bun(0, hy + 4.6, -3, 1.8); blob("head", 0, hy + 3.2, -3, 1, .5, 1, 3, tie); }
    if (t === "dbun") for (const k of [-1, 1]) { bun(k * 3.2, hy + 4, -1.4, 1.5); blob("head", k * 3.2, hy + 2.8, -1.4, .9, .4, .9, 3, tie); }
    if (t === "half") { blob("head", 0, hy + 1.8, -4.6, 1.2, 1, 1, 2.4, tex); blob("head", 0, hy + 1.8, -5.4, .7, .7, .5, 3, tie); }
  }
  function hair() { blob("head", 0, hy + 1.2, -.4, 4.9, 4.3, 4.8, 2.6, (x, y, z, X, Y, Z) => ((X * 3 + Z * 2) % 5 === 0 ? lt(HAIR, 1.28) : (X + Z) % 4 === 0 ? dk(HAIR, .84) : HAIR), (x, y, z) => y > hy + 1.2 || z < -.6 || (Math.abs(x) > 3.4 && z < (f ? 2 : .8) && y > hy - (f ? 4 : 2))); blob("head", 0, hy + 2.4, 3.2, 3.9, 1.6, 1.7, 2.6, (x, y, z, X) => ((X + 90) % 4 === 0 ? lt(HAIR, 1.28) : (X + 90) % 4 === 2 ? dk(HAIR, .84) : HAIR)); if (f) { blob("head", 0, hy - 3, -3, 4.3, 5.4, 2, 2.6, (x, y, z, X, Y) => ((X + 90) % 4 === 0 ? lt(HAIR, 1.2) : (X + 90 + (Y >> 2)) % 5 === 0 ? dk(HAIR, .78) : HAIR)); for (const k of [-1, 1]) blob("head", k * 4.2, hy - 1.6, .6, .9, 4.2, 1.6, 3, HAIR); } }

  // ── 칠하기 도구: g = 겹(바깥으로 얼마나 더) ──
  const fold = (base, x, z, n = 14) => { const v = Math.cos(Math.atan2(z, x) * n); return v > .45 ? lt(base, 1.1) : v < -.5 ? dk(base, .82) : base; };
  const torso = (g, col, o = {}) => { const yLo = { crop: 16.9, bra: 17.4, waist: 12.9, high: 18.2, swim: 12.9 }[o.hem] ?? 12.9, yHi = o.hem === "bra" ? 20.2 : 99, keep = (x, y, z) => y > yLo && y < yHi && (!o.open || !(Math.abs(x) < .75 && z > 0)) && (!o.vneck || !(z > 0 && Math.abs(x) < (y - 18.6) * .55 && y > 18.6));
    blob("chest", 0, 15.5, 0, wa + g + (o.loose ? .35 : 0), 3 + g * .4, 2.3 + g + (o.loose ? .3 : 0), 3, col, keep); blob("chest", 0, 19, 0, sh + g + (o.loose ? .3 : 0), 3.4 + g * .3, 2.6 + g, 2.8, col, (x, y, z) => keep(x, y, z) && y < 21.4 + (o.neckUp || 0)); if (f) blob("chest", 0, 18.4, 1.5, 3 + g, 1.5 + g * .3, 1.4 + g, 2.4, col, keep);
    if (o.hem === "hip" || o.hem === "thigh" || o.hem === "swim") blob("hips", 0, 12, 0, hp + g + (o.loose ? .4 : 0), 2.2 + g * .4, 2.5 + g + (o.loose ? .3 : 0), 3, col, (x, y, z) => (o.hem === "swim" ? y > 10.4 && !(Math.abs(x) > 1.5 && y < 11.4) : y > 11) && (!o.open || !(Math.abs(x) < .75 && z > 0)));
    if (o.hem === "thigh") rings(3.2, .6, g, col, null, o.open); };
  const sleeve = (g, col, len, o = {}) => { for (const [s, k] of LEG) { if (len >= 1) blob("ua" + s, k * 5.5, 18.6, 0, 1.6 + g + (o.wide ? .25 : 0) + (o.puff ? .6 : 0), 3.2 + g * .3, 1.7 + g + (o.puff ? .6 : 0), 3, col, (x, y) => len >= 2 || y > (o.puff ? 18.4 : 17.2)); if (len >= 2) { const w = len === 3 ? 2.3 : 1.45 + g + (o.wide ? .3 : 0); blob("la" + s, k * 5.8, 13.6, .2, w, 2.9 + g * .3, (len === 3 ? 2.4 : 1.55 + g + (o.wide ? .3 : 0)), 3.2, o.cuffC != null ? (x, y) => (y < 12.3 ? o.cuffC : col) : col, (x, y) => y > (len === 3 ? 10.8 : 11.7)); } } };
  const legs = (g, col, len, o = {}) => { const top = { micro: 10.2, short: 8, knee: 6, ankle: 1.7 }[len]; for (const [s, k] of LEG) { const lx = k * 2.4, ex = (o.wideLeg ? .5 : o.loose ? .25 : 0) - (o.snug ? .05 : 0);
      const thighCol = o.dolphin ? (x, y, z) => { const side = Math.max(0, (x - lx) * k) / 2, hem = top + side * 2.2; return y < hem + .45 ? o.trim : typeof col === "function" ? col(x, y, z) : col; } : col;
      blob("ul" + s, lx, 9, 0, 1.9 + g + ex, 3.6, 2 + g + ex, 3, thighCol, (x, y) => (o.dolphin ? y > top + Math.max(0, (x - lx) * k) / 2 * 2.2 : y > top));
      if (top < 5.4) blob("ll" + s, lx, 3.2, 0, 1.75 + g + ex + (o.wideLeg ? .4 : 0), 3.8, 1.9 + g + ex + (o.wideLeg ? .4 : 0), 3.4, o.cuffLeg ? (x, y) => (y < 2.6 ? dk(typeof col === "function" ? 0x888888 : col, .85) : col) : col, (x, y) => y > top); } };
  const hips = (g, col, keep) => blob("hips", 0, 12, 0, hp + g, 2.2 + g * .3, 2.5 + g, 3, col, keep);
  function rings(len, fl, g, col, colFn, open, fromY = 13) { for (let y = fromY; y > fromY - len; y--) { const t = (fromY - y) / len, rx = hp + .45 + g + fl * t, rz = 2.75 + g + fl * t * .9; blob("skirt", 0, y + .5, 0, rx, .62, rz, 2.6, colFn ? (x, yy, z, X, Y, Z) => colFn(x, y, z, X, Y, Z, y <= fromY - len + 1) : col, open === "back" ? (x, yy, z) => z < .2 : open === "front" ? (x, yy, z) => z > -.2 : open ? (x, yy, z) => !(Math.abs(x) < .8 + t * .6 && z > 0) : null); } }
  const pat = (c, s) => (s.check ? (x, y, z, X, Y, Z) => ((X + 128) % 4 === 0 || (Y + 128) % 4 === 0 ? c[1] : c[0]) : s.dots ? (x, y, z, X, Y, Z) => ((X * 7 + Y * 5 + Z * 3) % 13 === 0 ? c[1] : c[0]) : s.flowers ? (x, y, z, X, Y, Z) => ((X * 5 + Y * 3 + Z * 7) % 17 < 2 ? c[1] : c[0]) : s.knit ? (x, y, z, X, Y) => ((Y + 128) % 3 === 0 ? dk(c[0], .9) : c[0]) : c[0]);
  const mix = (a, b, t) => { const A = [a >> 16 & 255, a >> 8 & 255, a & 255], B = [b >> 16 & 255, b >> 8 & 255, b & 255]; return A.reduce((s, v, i) => (s << 8) | Math.round(v + (B[i] - v) * t), 0); };
  const zf = (y) => (f && y > 16.6 && y < 20.2 ? 3.15 : 2.7);

  // ── 레이어 순서대로 ──
  const worn = Object.entries(wear).filter(([k, v]) => v && PARTS[v.id] && PARTS[v.id].slot === k).sort((a, b) => SLOT_LAYER[a[0]] - SLOT_LAYER[b[0]] || (a[0] === "outer") - (b[0] === "outer"));
  for (const [slot, w] of worn) {
    const p = PARTS[w.id], s = p.sh, c = p.cd.map((d, i) => w.c?.[i] ?? d), L = SLOT_LAYER[slot], g = .1 + L * .07 + (s.over ? .12 : 0);
    if (slot === "underT" || slot === "underB") under(s.un, c, g);
    else if (slot === "socks") { for (const [sd, k] of LEG) { const lx = k * 2.4, col = s.sheer ? mix(c[0], SKIN, .42) : c[0]; blob("ll" + sd, lx, 3.2, 0, 1.75 + g, 3.8, 1.9 + g, 3.4, col, (x, y) => y < s.so); blob("ll" + sd, lx, 1, .9, 1.9 + g, 1.4, 2.9 + g, 4, col); if (s.so > 7) blob("ul" + sd, lx, 9, 0, 1.9 + g, 3.6, 2 + g, 3, col, (x, y) => y < s.so); } }
    else if (slot === "top" || slot === "one") top(s, c, g, slot === "one");
    else if (slot === "bottom") bottom(s, c, g);
    else if (slot === "outer") outer(s, c, g);
    else if (slot === "waist") waist(s, c, g);
    else if (slot === "shoes") shoes(s, c, g);
    else if (slot === "neck") neck(s, c, g);
    else if (slot === "head") head(s, c);
    else if (slot === "face") face(s, c);
    else if (slot === "hands") hands(s, c, g);
    else if (slot === "bag") bag(s, c, g);
  }

  function under(u, c, g) {
    const trim = c[1] ?? c[0];
    if (u === "bra") { blob("chest", 0, 18.6, 0, sh + g * .6, 1.2, 2.6 + g, 3, (x, y) => (y < 17.7 ? trim : c[0]), (x, y, z) => y > 17.4 && y < 19.6); if (f) blob("chest", 0, 18.4, 1.5, 3 + g, 1.5, 1.4 + g, 2.4, c[0], (x, y, z) => z > .8 && Math.abs(x) > .25); for (const k of [-1, 1]) blob("chest", k * 2, 20.4, .4, .35, 1.6, 2.7 + g, 4, c[0]); }
    if (u === "panty") hips(g, (x, y) => (y > 12.9 ? trim : c[0]), (x, y) => y < 13.2 && y > 10 - Math.abs(x) * .3 + 1.6);
    if (u === "trunks" || u === "drawers") { hips(g, (x, y) => (y > 12.9 ? c[1] : c[0]), (x, y) => y < 13.4); for (const [s, k] of LEG) blob("ul" + s, k * 2.4, 9, 0, 1.9 + g + (u === "trunks" ? .08 : 0), 3.6, 2 + g + (u === "trunks" ? .08 : 0), 3, u === "trunks" ? pat(c, { check: 1 }) : c[0], (x, y) => y > (u === "trunks" ? 8.2 : 9.4)); }
    if (u === "undershirt") torso(g, c[0], { hem: "hip" });
    if (u === "cami") { torso(g, c[0], { hem: "waist", neckUp: -1.4 }); for (const k of [-1, 1]) blob("chest", k * 1.9, 20.6, .2, .3, 1.2, 2.7 + g, 4, c[1]); }
    if (u === "slip") { torso(g, c[0], { hem: "waist", neckUp: -1.4 }); rings(6, .5, g, c[0], (x, y, z, X, Y, Z, last) => (last ? c[1] : c[0])); }
    if (u === "sport") { blob("chest", 0, 18.6, 0, sh + g * .6, 1.6, 2.6 + g, 3, (x, y) => (y < 17.6 ? c[1] : c[0]), (x, y) => y > 17.2 && y < 20.2); if (f) blob("chest", 0, 18.4, 1.5, 3 + g, 1.5, 1.4 + g, 2.4, c[0]); legs(g, c[0], "short", { snug: 1 }); hips(g, (x, y) => (y > 12.9 ? c[1] : c[0]), (x, y) => y < 13.4); }
    if (u === "johns") { torso(g, c[0], { hem: "hip" }); sleeve(g, c[0], 2); legs(g, c[0], "ankle", { snug: 1 }); hips(g, c[0]); }
  }
  function top(s, c, g, one) {
    const body = pat(c, s);
    if (s.hem === "swim") { torso(g, (x, y) => (y > 21 ? c[1] : c[0]), { hem: "swim", neckUp: -1 }); return; }
    torso(g, body, { hem: s.hem, loose: s.loose, vneck: s.vneck, neckUp: s.collar === "mandarin" ? .8 : s.hem === "bra" ? 0 : 0 });
    if (s.sl > 0) sleeve(g, body, s.sl, { wide: s.wide, puff: s.puff, cuffC: s.cuffC ? c[2] : s.cuff ? dk(c[0], .85) : null });
    if (s.band) blob("chest", 0, 13.2, 0, wa + g + .35, .5, 2.3 + g + .35, 4, dk(c[s.hood ? 0 : 1] ?? c[0], .9), (x, y) => s.hem !== "hip");
    if (s.band && s.hem === "hip") hips(g + .05, dk(c[0], .88), (x, y) => y > 10.6 && y < 11.4);
    if (s.print) blob("chest", 0, 18.6, zf(18.6) + g, 1.3, 1.1, .35, 3, c[1]);
    if (s.hood) blob("chest", 0, 22, -2.4, 2.6, 1.7, 1.6, 3, (x, y, z) => (z > -2 ? c[1] : c[0]));
    if (s.hood && c[2] != null) for (const k of [-1, 1]) blob("chest", k * .9, 19.6, zf(19.6) + g, .2, 1.4, .2, 3, c[2]);
    if (s.pocket) blob("chest", 0, 14.6, 2.6 + g, 2.4, .9, .3, 3, dk(c[0], .88));
    if (s.collar === "shirt") for (const k of [-1, 1]) blob("chest", k * .95, 21.3, 1.9 + g, .9, .55, .5, 3, lt(c[0], 1.05));
    if (s.buttons) for (let y = 13.8; y < 20.6; y += 1.4) blob("chest", 0, y, zf(y) + g, .22, .22, .25, 3, c[1]);
    if (s.collar === "round") blob("chest", 0, 21.3, .6, 2.5, .5, 2.4 + g, 3, c[1] ?? lt(c[0], 1.1));
    if (s.bow) { for (const k of [-1, 1]) blob("chest", k * .9, 20.8, zf(20.8) + g + .2, .9, .55, .3, 3, c[1]); blob("chest", 0, 20.2, zf(20.2) + g + .2, .3, 1.1, .25, 3, c[1]); }
    if (s.collar === "sailor") { blob("chest", 0, 20.6, -2.4 - g, 3.4, 1.9, .6, 3, (x, y) => (Math.abs(Math.abs(x) - 2.9) < .35 || Math.abs(y - 19) < .3 ? c[2] : c[1])); for (const k of [-1, 1]) for (let i = 0; i < 5; i++) blob("chest", k * (.5 + i * .55), 18.9 + i * .65, zf(18.9 + i * .65) + g - i * .12, .5, .5, .4, 3, i === 4 ? c[2] : c[1]); }
    if (s.trimNeck) blob("chest", 0, 21.4, .4, 2.4, .4, 2.4 + g, 3, c[1]);
    if (s.tag) blob("chest", -1.6, 19.4, zf(19.4) + g, .9, .5, .25, 3, 0xf6f6f8);
    if (s.collar === "jeogori") { for (let i = 0; i < 6; i++) blob("chest", -1.6 + i * .6, 21 - i * .6, zf(21 - i * .6) + g, .35, .35, .3, 3, c[1]); }
    if (s.goreum) for (const k of [-.4, .5]) blob("chest", k + .6, 17.6, zf(17.6) + g + .1, .3, 2.2, .25, 3, c[2]);
    if (s.lace) for (let i = 0; i < 4; i++) for (const k of [-1, 1]) blob("chest", k * (.4 + i * .08), 20.2 - i * .9, zf(20.2 - i * .9) + g + .1, .45, .15, .2, 3, c[1]);
    if (s.quiltTop) for (let y = 13; y < 21; y += 1.5) blob("chest", 0, y, 0, wa + g + .12, .12, 2.3 + g + .12, 4, c[1]);
    if (s.collar === "mandarin") blob("chest", 0, 22.2, 0, 1.9, .7, 1.9, 3, c[1]);
    if (s.collar === "wrap") for (let i = 0; i < 7; i++) blob("chest", -1.8 + i * .6, 21.2 - i * .75, zf(21.2 - i * .75) + g, .45, .45, .35, 3, dk(c[0], .7));
    if (s.frog) for (const y of [19.6, 18.4]) blob("chest", 1.4, y, zf(y) + g, .5, .2, .25, 3, c[2]);
    if (s.corset) blob("chest", 0, 15.2, 0, wa + g + .25, 2.2, 2.3 + g + .25, 3, (x, y, z, X, Y) => (z > 1.6 && (Y + 128) % 2 === 0 && Math.abs(x) < .6 ? c[2] : dk(c[0], .8)));
    if (s.sk) { rings(s.sk, s.fl, g, null, (x, y, z, X, Y, Z, last) => { if (s.tiers && (13 - y) % 3 === 2) return c[1]; if (last) return s.hemTrim ? c[1] : dk(c[0], .75); return s.dots || s.flowers ? pat(c, s)(x, y, z, X, Y, Z) : fold(c[0], x, z, s.tiers ? 18 : 12); });  }
    if (s.sash) blob("hips", 0, 13.2, 0, Math.max(wa, hp) + g + .3, .6, 2.6 + g + .3, 4, c[2]);
    if (s.trim && s.sk == null) { /* 테두리만 */ }
    if (s.bib) { legs(g, c[0], s.pl, { loose: 1 }); hips(g, c[0]); blob("chest", 0, 16, zf(16) - .5 + g, 2.4, 2.6, .6, 3, c[0]); for (const k of [-1, 1]) { blob("chest", k * 1.8, 19.6, .2, .45, 2.6, 2.75 + g, 4, c[1]); blob("chest", k * 1.8, 17.8, zf(17.8) + g, .35, .35, .3, 3, c[2]); } }
  }
  function bottom(s, c, g) {
    const body = pat(c, s);
    if (s.sk) { rings(s.sk, s.fl, g, null, (x, y, z, X, Y, Z, last) => (last ? (s.hemTrim ? c[1] : dk(c[0], .75)) : s.pleat ? fold(c[1] !== c[0] && (X + 128) % 5 === 0 ? c[1] : c[0], x, z, 16) : c[0]), false, s.high ? 15 : 13); if (s.high) torso(g, c[0], { hem: "waist", neckUp: -2.4 }); hips(g, c[0], (x, y) => y > 11.6); return; }
    hips(g + (s.loose ? .15 : 0), body, (x, y) => y < 13.6); legs(g, body, s.pl, { loose: s.loose, wideLeg: s.wideLeg, snug: s.snug, dolphin: s.dolphin, trim: c[1], cuffLeg: s.cuffLeg });
    if (s.dolphin) hips(g + .02, c[1], (x, y) => y > 13.2 && y < 13.7);
    if (s.stripe) for (const [sd, k] of LEG) { const lx = k * 2.4; blob("ul" + sd, lx + k * (1.9 + g), 9, 0, .25, 3.6, .35, 3, c[1]); blob("ll" + sd, lx + k * (1.75 + g), 3.4, 0, .25, 3.4, .35, 3, c[1], (x, y) => y > 1.8); }
    if (s.string) for (const k of [-1, 1]) blob("hips", k * .5, 12.4, 2.6 + g, .15, .9, .2, 3, c[1]);
    if (s.stitch && c[1] != null) for (const [sd, k] of LEG) blob("ul" + sd, k * 2.4, 11.4, 1.7 + g, 1.1, .2, .35, 3, c[1]);
    if (s.crease) for (const [sd, k] of LEG) blob("ll" + sd, k * 2.4, 3.6, 1.9 + g, .12, 2.4, .12, 3, lt(c[0], 1.25));
  }
  function outer(s, c, g) {
    if (s.cape) { const lg = s.cape === "long"; blob("chest", 0, 20.6, -.3, sh + g + .5, 1.6, 2.9 + g + .3, 3, c[0]); blob("chest", 0, 15.6, -2.9 - g - .4, sh + .4, 5.6, .5, 3, (x, y, z) => (z > -3.2 - g ? c[1] : c[0]), (x, y) => y < 21);
      if (lg) rings(11.5, 1.6, g + .6, null, (x, y, z, X, Y, Z, last) => (last ? dk(c[0], .7) : fold(c[0], x, z, 12)), "back");
      if (s.hood) blob("chest", 0, 21.8, -2.8 - g, 2.8, 1.6, 1.6, 3, dk(c[0], .9)); if (s.clasp) blob("chest", 0, 21.2, zf(21.2) + g + .4, .5, .5, .35, 3, c[2]); return; }
    const body = s.quilt ? (x, y, z, X, Y) => ((Y + 128) % 4 === 0 ? c[1] : c[0]) : pat(c, s), len = s.len, puff = s.puffy ? .45 : 0;
    torso(g + puff, body, { hem: len === "waist" ? "waist" : "hip", open: s.open, loose: !!s.puffy, neckUp: s.hood ? .4 : 0 }); if (!s.sleeveless) sleeve(g + puff, body, 2, { wide: s.puffy, puff: !!wear.top && !!PARTS[wear.top.id]?.sh.puff });
    if (len === "knee" || len === "long") rings(len === "knee" ? 7.5 : 10.5, 1.4 + puff, g + puff, null, (x, y, z, X, Y, Z, last) => (last ? dk(c[0], .7) : s.quilt ? body(x, y, z, X, Y) : c[0]), !!s.open);
    if (len === "tails") rings(8, .6, g, null, (x, y, z, X, Y, Z, last) => (last ? dk(c[0], .7) : c[0]), "back");
    if (s.lapel) for (const k of [-1, 1]) for (let i = 0; i < 5; i++) blob("chest", k * (.7 + i * .45), 21 - i * .9, zf(21 - i * .9) + g + .15 - i * .08, .45, .55, .3, 3, s.vest ? lt(c[0], 1.4) : dk(c[0], .78));
    if (s.vest) blob("chest", 0, 16.4, zf(16.4) - .3 + g, 1.3, 3, .4, 3, c[1]);
    if (s.zip === 1) for (let y = 13; y < 21; y += .8) blob("chest", s.open ? -.85 : 0, y, zf(y) + g + puff, .14, .3, .2, 3, c[1]);
    if (s.zip === "diag") for (let i = 0; i < 9; i++) blob("chest", 1.6 - i * .45, 20.6 - i * .9, zf(20.6 - i * .9) + g, .16, .3, .2, 3, c[1]);
    if (s.buttons) for (let y = 14; y < 19.6; y += 1.6) blob("chest", s.open ? -1.1 : 0, y, zf(y) + g + .05, .24, .24, .25, 3, c[1]);
    if (s.emblemBig) { blob("chest", 0, 17.2, zf(17.2) + g + .1, 1.3, 1.9, .25, 3, c[1]); }
    if (s.trimEdge) for (let y = 4; y < 21; y += .7) for (const k of [-1, 1]) blob(y > 13 ? "chest" : "hips", k * 1.2, y, (y > 13 ? zf(y) : 2.9) + g + .1, .25, .4, .2, 3, c[1]);
    if (s.emblem) blob("chest", -2.2, 18.6, zf(18.6) + g + .1, .55, .55, .25, 3, c[2]);
    if (s.belt) blob("chest", 0, 14.6, 0, wa + g + .45, .55, 2.3 + g + .45, 4, c[1]);
    if (s.stripe) for (const [sd, k] of LEG) { blob("ua" + sd, k * (5.5 + 1.6 + g), 18.6, 0, .25, 3, .4, 3, c[1]); blob("la" + sd, k * (5.8 + 1.45 + g), 13.8, .2, .25, 2.4, .4, 3, c[1]); }
    if (s.stitch) for (const k of [-1, 1]) blob("chest", k * 1.8, 19.2, zf(19.2) + g, 1.2, .2, .3, 3, c[1]);
    if (s.pocket2) for (const k of [-1, 1]) blob("chest", k * 2, 14.4, 2.6 + g, .9, .7, .3, 3, dk(c[0], .86));
    if (s.hood) blob("chest", 0, 22, -2.6 - g, 2.8, 1.8, 1.7, 3, dk(c[0], .9));
    if (s.cuff) for (const [sd, k] of LEG) blob("la" + sd, k * 5.8, 12.1, .3, 1.75 + g, .45, 1.85 + g, 4, dk(c[0], .85));
  }
  function waist(s, c, g) {
    if (s.apron) { const full = s.apron === "full"; if (full) { blob("chest", 0, 17.6, zf(17.6) - .4 + g, 2.6, 3.2, .45, 3, c[0], (x, y, z) => z > 1); for (const k of [-1, 1]) blob("chest", k * 1.7, 20.4, .2, .35, 1.4, 2.8 + g, 4, c[0]); } rings(full ? 7 : 6.5, 1.2, g + .15, null, (x, y, z, X, Y, Z, last) => (last && full ? c[1] : c[0]), "front"); blob("hips", 0, 13.3, 0, Math.max(wa, hp) + g + .2, .45, 2.6 + g + .2, 4, c[0]); if (full) blob("hips", 0, 13.3, -3, 1.4, .8, .6, 3, c[1]); return; }
    if (s.pouch) for (const k of [-1, 1]) blob("hips", k * 2.6, 12.4, 1.8 + g, .9, 1, .8, 3, c[1]);
    blob("hips", 0, 13.4, 0, Math.max(wa, hp) + g + .3, s.beltW / 2, 2.6 + g + .3, 4, c[0]); if (s.bow) { blob("hips", 0, 13.6, -3.2 - g, 2.2, 1.1, .8, 3, c[1]); blob("hips", 0, 13.6, -3.4 - g, .7, .7, .6, 3, c[0]); } else blob("hips", 0, 13.4, 2.6 + g + .3, .7, .55, .3, 3, c[1]);
  }
  function shoes(s, c, g) {
    for (const [sd, k] of LEG) { const lx = k * 2.4;
      if (s.sh === "sandal") { for (const y of [.9, 1.8]) blob("ll" + sd, lx, y, 1.2, 1.95 + g, .3, 2.6 + g, 4, c[0]); blob("ll" + sd, lx, .3, .9, 2 + g, .3, 3 + g, 4, dk(c[0], .8)); continue; }
      if (s.sh === "slip") { blob("ll" + sd, lx, .5, .9, 2 + g, .5, 3 + g, 4, c[0]); blob("ll" + sd, lx, 1.3, 1.8, 2 + g, .5, 1.5, 4, c[0]); continue; }
      if (s.sh === "geta") { blob("ll" + sd, lx, -.3, .9, 1.9 + g, .5, 2.9 + g, 5, c[0]); for (const z of [-1, 2]) blob("ll" + sd, lx, -1, z, 1.6, .5, .5, 5, dk(c[0], .8)); blob("ll" + sd, lx, 1.2, 2.4, .25, .6, .8, 3, c[1]); continue; }
      blob("ll" + sd, lx, 1, .9, 1.9 + g + (s.chunky ? .2 : 0), 1.4 + g, 2.9 + g, 4, s.shine ? (x, y, z) => (y > 1.6 && z > 2 ? lt(c[0], 1.6) : c[0]) : c[0]);
      if (s.sh === "boot") blob("ll" + sd, lx, 3.2, 0, 1.75 + g + .1, 3.8, 1.9 + g + .1, 3.4, c[0], (x, y) => y < s.h);
      if (s.sole) blob("ll" + sd, lx, .3, .9, 2 + g, .45, 3 + g, 4, c[1] ?? 0xe8e8ec);
      if (s.laces) for (const z of [1.4, 2.2]) blob("ll" + sd, lx, 1.9, z, .9, .15, .2, 3, c[1] ?? 0xffffff);
      if (s.strap) blob("ll" + sd, lx, 1.9, 1.6, 1.95 + g, .2, .3, 3, c[1]);
      if (s.heel) blob("ll" + sd, lx, -.4, -1.2, .45, .9, .45, 3, c[0]);
    } }
  function neck(s, c, g) {
    const n = s.ne, z0 = zf(21);
    if (n === "ribbon") { for (const k of [-1, 1]) blob("chest", k * 1, 21, z0 + g + .3, 1, .6, .35, 3, c[0]); blob("chest", 0, 21, z0 + g + .35, .4, .45, .35, 3, dk(c[0], .8)); for (const k of [-1, 1]) blob("chest", k * .6, 19.8, z0 + g + .25, .3, 1, .25, 3, c[0]); }
    if (n === "tie") for (let y = 15.6; y < 21.4; y += .5) blob("chest", 0, y, zf(y) + g + .2, y < 16.4 ? .5 : .55, .35, .25, 3, (y * 2 | 0) % 3 === 0 ? c[1] : c[0]);
    if (n === "scarf") { blob("chest", 0, 19.6, z0 + g + .3, 1.3, 1.1, .4, 3, c[0]); blob("chest", 0, 18.3, zf(18.3) + g + .3, .7, 1, .3, 3, c[0]); }
    if (n === "muffler") { blob("chest", 0, 22.2, 0, 2.3, 1, 2.3, 3, (x, y, z, X, Y) => ((Y + 128) % 3 === 0 ? c[1] : c[0])); blob("chest", -1.2, 18.6, zf(18.6) + g + .3, .8, 3.2, .45, 3, (x, y, z, X, Y) => ((Y + 128) % 3 === 0 ? c[1] : c[0])); }
    if (n === "amulet") { for (let i = 0; i < 7; i++) { const a = (i / 6 - .5) * 2.4; blob("chest", Math.sin(a) * 1.9, 21.6 - Math.cos(a * .5) * 1.6 + 1.2, zf(20.6) + g + .15, .18, .18, .18, 3, c[0]); } blob("chest", 0, 19.4, zf(19.4) + g + .25, .5, .6, .3, 3, c[1]); }
    if (n === "choker") { blob("chest", 0, 22.4, 0, 1.75, .3, 1.75, 4, c[0]); blob("chest", 0, 22.2, 1.8, .3, .35, .25, 3, c[1]); }
  }
  function head(s, c) {
    const h = s.hd;
    if (h === "cap") { blob("head", 0, hy + 2.4, -.2, 5, 2.6, 4.9, 2.4, c[0], (x, y) => y > hy + 1.6); blob("head", 0, hy + 1.8, 4.8, 3.2, .35, 2.2, 2.4, c[1]); }
    if (h === "beanie") { blob("head", 0, hy + 1.6, -.2, 5, 3.8, 4.9, 2.4, (x, y, z, X, Y) => (y < hy + .9 ? dk(c[0], .85) : (X + 128) % 2 ? c[0] : dk(c[0], .92)), (x, y) => y > hy + .1); }
    if (h === "straw") { blob("head", 0, hy + 2.6, 0, 7.6, .35, 7.6, 2, (x, y, z, X, Z) => ((X + Z) & 1 ? c[0] : dk(c[0], .9))); blob("head", 0, hy + 3.6, -.2, 4.6, 1.8, 4.6, 3, c[0], (x, y) => y > hy + 2.4); blob("head", 0, hy + 3, -.2, 4.7, .45, 4.7, 3, c[1]); }
    if (h === "band") blob("head", 0, hy + 1.4, -.4, 5.15, 4.4, 5, 2.6, c[0], (x, y, z) => Math.abs(z - .8) < .55 && y > hy + 1);
    if (h === "bow") { for (const k of [-1, 1]) blob("head", k * 1.4, hy + 1.6, -5.1, 1.4, .9, .6, 3, c[0]); blob("head", 0, hy + 1.6, -5.2, .55, .55, .55, 3, dk(c[0], .8)); }
    if (h === "hood") { blob("head", 0, hy + 1, -.6, 5.3, 5.2, 5.3, 2.6, c[0], (x, y, z) => z < 3.4 || y > hy + 3.4); blob("chest", 0, 21.6, 0, 2.8, 1.2, 2.8, 3, c[0]); }
    if (h === "wizard") { blob("head", 0, hy + 2.8, 0, 7, .35, 7, 2, c[0]); blob("head", 0, hy + 3.3, -.2, 4.6, .5, 4.6, 3, c[1]); for (let i = 0; i < 6; i++) blob("head", -i * .35, hy + 4 + i * 1.2, -.2 - i * .3, 3.8 - i * .6, .8, 3.8 - i * .6, 3, c[0]); }
    if (h === "circlet") { blob("head", 0, hy + 1.9, -.2, 5.1, .3, 5, 3, c[0], (x, y, z) => true); blob("head", 0, hy + 2, 4.9, .45, .5, .3, 3, c[1]); }
    if (h === "flowers") for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; blob("head", Math.sin(a) * 4.9, hy + 2.4, Math.cos(a) * 4.8 - .2, .65, .55, .65, 3, i % 3 === 2 ? c[1] : c[0]); }
    if (h === "pin") blob("head", 2.9, hy + 2.6, 3.3, .7, .25, .25, 3, c[0]);
    if (h === "ucap") { blob("head", 0, hy + 3.2, -.2, 5.3, 1.6, 5.3, 4, c[0], (x, y) => y > hy + 2.2); blob("head", 0, hy + 2.5, -.1, 4.95, .5, 4.9, 4, c[1]); blob("head", 0, hy + 2, 4.7, 3, .3, 1.8, 2.4, c[1]); blob("head", 0, hy + 3.4, 5, .6, .6, .3, 3, c[2]); }
    if (h === "chef") { blob("head", 0, hy + 2.6, -.2, 4.9, 1.2, 4.8, 4, c[0]); blob("head", 0, hy + 5.6, -.2, 4.2, 3.2, 4.2, 2.2, (x, y, z, X, Y) => ((X + Y) % 5 === 0 ? dk(c[0], .92) : c[0])); }
  }
  function face(s, c) {
    for (const k of [-1, 1]) { const x0 = k * 1.7; if (s.fa === "sun") blob("head", x0, hy - .3, 4.3, 1.15, .75, .25, 2.4, c[1]); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; blob("head", x0 + Math.cos(a) * 1.15, hy - .3 + Math.sin(a) * .75, 4.35, .2, .2, .2, 2, c[0]); } blob("head", k * 3.6, hy - .1, 2.4, .2, .2, 2, 2, c[0]); }
    blob("head", 0, hy - .1, 4.4, .45, .18, .18, 2, c[0]);
  }
  function hands(s, c, g) {
    for (const [sd, k] of LEG) { if (s.ha === "watch" && k > 0) { blob("la" + sd, k * 5.8, 11.9, .3, 1.6 + g, .4, 1.7 + g, 4, c[0]); blob("la" + sd, k * 5.8 + k * .4, 11.9, 1.6 + g, .5, .5, .25, 3, c[1]); } if (s.ha === "bracer") blob("la" + sd, k * 5.8, 13.4, .3, 1.7 + g, 1.6, 1.8 + g, 4, (x, y, z, X, Y) => ((Y + 128) % 2 === 0 && z > 1 ? c[1] : c[0])); if (s.ha === "gloves") blob("la" + sd, k * 5.9, 10.9, .4, 1.5 + g, 1.5 + g, 1.6 + g, 3, c[0], (x, y) => y < 12.2); }
  }
  function bag(s, c, g) {
    if (s.bg === "back") { blob("chest", 0, 17.4, -3.9 - g, 3, 3.4, 1.4, 4, c[0]); blob("chest", 0, 16, -5.1 - g, 2.2, 1.2, .4, 3, dk(c[0], .85)); for (const k of [-1, 1]) blob("chest", k * 2.2, 18.6, 0, .4, 3.6, 2.85 + g, 4, c[1], (x, y, z) => z > 0 || y > 20); }
    if (s.bg === "quiver") { blob("chest", 1.6, 17.6, -3.6 - g, 1.2, 4, 1.2, 4, c[0]); for (let i = 0; i < 4; i++) blob("chest", 1.2 + i * .35, 22.2, -3.6 - g, .25, .9, .25, 3, c[1]); for (let i = 0; i < 10; i++) blob("chest", -3 + i * .62, 21 - i * .75, zf(21 - i * .75) + g + .1, .25, .3, .25, 3, dk(c[0], .8)); }
    if (s.bg === "shoulder") { for (let i = 0; i < 12; i++) blob("chest", -3.4 + i * .62, 21.4 - i * .7, zf(21.4 - i * .7) + g + .1, .3, .35, .3, 3, c[1]); blob("hips", 4.8, 11.6, .4, 1, 1.4, 1.8, 4, c[0]); }
  }
}

// 이야기 AI에 싣는 옷차림 한 줄: "검은 세일러 상의, 남색 플리츠 미니스커트, …" (속옷·맨몸은 쓰지 않는다)
const CN = [[0x14141a, "검은"], [0xf6f6f8, "흰"], [0x8a8a92, "회색"], [0xb8202c, "빨간"], [0xf28aa8, "분홍"], [0xe08a3a, "주황"], [0xf0c840, "노란"], [0x4a8a4a, "초록"], [0x3a4a3a, "짙은 녹색"], [0x2a6ab8, "파란"], [0xa8d0ec, "하늘색"], [0x26325a, "남색"], [0x6a3a9a, "보라"], [0x3a2a5a, "짙은 보라"], [0x5a3a24, "갈색"], [0x7a6a4a, "카키"], [0x2a1c12, "짙은 갈색"], [0xc8b08a, "베이지"], [0xf0e6cc, "크림색"], [0xd8b86a, "금색"], [0x6a2434, "와인색"]];
export function colorName(n) { if (n == null) return ""; const r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; let best = CN[0], bd = 1e9; for (const e of CN) { const d = (r - (e[0] >> 16 & 255)) ** 2 * 2 + (g - (e[0] >> 8 & 255)) ** 2 * 4 + (b - (e[0] & 255)) ** 2 * 3; if (d < bd) { bd = d; best = e; } } return best[1]; }
export function wearText(wear) {
  if (!wear) return ""; const out = [];
  for (const [k] of SLOTS) { if (k === "underT" || k === "underB") continue; const w = wear[k], p = w && PARTS[w.id]; if (!p) continue; const c0 = w.c?.[0] ?? p.cd[0]; out.push(k === "hair" ? `${c0 != null ? colorName(c0) + " " : ""}${p.n}`.replace("검은 ", "검은 머리 ").trim() : `${colorName(c0)} ${p.n}`.trim()); }
  return out.join(", ");
}
