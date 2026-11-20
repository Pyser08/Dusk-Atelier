// 장기기억 애드온(0.3.22): 종족 표·계산(순수). 기록기 AI가 인물의 종족을 한 줄로 알려 주면 엔진이 체질을 계산한다.
// 원칙: 성격·말솜씨·태도 같은 캐릭터 해석에 끼어드는 특성은 넣지 않는다(몸·체질·생활만). 강한 제약은 완화(예: 수생은 물만 자주 마셔도 됨).
// 수인은 케모미미(사람 몸 + 동물 귀·꼬리). 인간과 수인 사이 임신 가능. 임신을 본인이 정하는 종족(will)은 기본 켬. 사마귀 습성은 뺌.
import { dayIndex, yearPos } from "./weather.js";

// 주기: menses(월경 — 기존 월경 추적) · heat(발정: every일마다 len일, months = 그 달에만) · moon(보름 전후) · none
// lust: 성욕 오르는 폭 배수 · heatK: 발정 중 배수 · preg: {p 확률 배수(1 이하만 적용), wk 임신 주수, multi 다태아, none 불가, will 본인 조절}
// zones: 성감대 기본값 [[부위, 1~3]] · body: 모형 {ears, horns, tail, wings, lower} · wx: 날씨 반응(가벼운 불편만) · temp: 체온 · size
const B = (o) => Object.freeze(o);
const BEAST = { cycle: { k: "heat", every: 30, len: 5 }, heatK: 1.6, zones: [["ears", 2], ["tail", 2]] };
const beast = (id, label, re, ears, tail, o = {}) => B({ id, label, re, frame: "beast", ...BEAST, ...o, body: { ears, tail, ...(o.body ?? {}) }, zones: o.zones ?? BEAST.zones });
export const RACES = Object.freeze([
  // ── 인간형 ──
  B({ id: "human", label: "인간", re: /^인간|사람|human/i, frame: "human", cycle: { k: "menses" }, gen: "수명 70~90년. 모든 값의 기준이에요.", nsfw: "월경 주기 28일 안팎, 임신 약 40주." }),
  B({ id: "highelf", label: "하이엘프", re: /하이\s?엘프|high\s?elf/i, frame: "elf", life: 1000, cycle: { k: "menses", len: 75 }, lust: 0.6, preg: { p: 0.2, wk: 52 }, zones: [["ears", 3]], body: { ears: "elf" },
    gen: "수명 천 년 가까이, 외모가 20대에 멈춤. 길고 뾰족한 귀, 시력·청각이 좋음, 잠이 짧음(명상 4시간 정도). 마력이 매우 강함.", nsfw: "귀가 아주 예민함. 성욕은 천천히 오르고 오래 감. 임신이 드물고 임신 기간이 1년 정도." }),
  B({ id: "darkelf", label: "다크엘프", re: /다크\s?엘프|dark\s?elf|드로우/i, frame: "elf", life: 800, cycle: { k: "menses", len: 60 }, lust: 0.8, preg: { p: 0.25, wk: 50 }, zones: [["ears", 3], ["neck", 2]], body: { ears: "elf" }, wx: { sun: "강한 햇빛이 눈부셔서 그늘을 찾는 편" },
    gen: "수명 수백 년, 어두운 피부·뾰족한 귀, 어둠 속에서 잘 봄. 강한 햇빛엔 눈이 부심.", nsfw: "귀·목덜미가 예민함. 임신이 드물고 기간이 김." }),
  B({ id: "woodelf", label: "우드엘프", re: /우드\s?엘프|숲\s?엘프|wood\s?elf/i, frame: "elf", life: 700, cycle: { k: "menses", len: 50 }, lust: 0.75, preg: { p: 0.25, wk: 48 }, zones: [["ears", 3], ["feet", 1]], body: { ears: "elf" },
    gen: "수명 수백 년, 뾰족한 귀, 숲에서 감각이 가장 좋음, 발이 가볍고 맨발로도 잘 다님.", nsfw: "귀가 예민함. 계절이 따뜻할수록 몸이 가벼워짐. 임신이 드묾." }),
  B({ id: "elf", label: "엘프", re: /엘프|elf/i, frame: "elf", life: 800, cycle: { k: "menses", len: 60 }, lust: 0.7, preg: { p: 0.2, wk: 52 }, zones: [["ears", 3]], body: { ears: "elf" },
    gen: "수명 수백~천 년, 외모가 젊은 채로 멈춤. 길고 뾰족한 귀, 시력·청각이 좋음, 잠이 짧음.", nsfw: "귀가 아주 예민함. 성욕은 천천히 오르고 오래 감. 임신이 드물고 1년 가까이 걸림." }),
  B({ id: "halfelf", label: "하프엘프", re: /하프\s?엘프|half[-\s]?elf/i, frame: "elf", life: 200, cycle: { k: "menses", len: 35 }, lust: 0.9, preg: { p: 0.6, wk: 44 }, zones: [["ears", 2]], body: { ears: "halfelf" },
    gen: "수명 150~250년, 살짝 뾰족한 귀, 감각이 인간보다 조금 좋음.", nsfw: "귀가 예민한 편. 임신은 인간보다 조금 어려움." }),
  B({ id: "dwarf", label: "드워프", re: /드워프|dwarf|난쟁이/i, frame: "dwarf", life: 300, size: "small", cycle: { k: "menses", len: 30 }, preg: { p: 0.8, wk: 52 }, fat: 0.6, wx: { cold: "추위에 강함", hot: "더위에도 강함" },
    gen: "키 120~140cm, 단단하고 튼튼한 몸, 수명 250~350년. 어둠 속에서 잘 보고 추위·더위·독에 강함. 술에 아주 강함.", nsfw: "체력이 많아 잘 지치지 않음. 임신 기간이 1년 정도." }),
  B({ id: "halfling", label: "하플링", re: /하플링|호빗|halfling|hobbit/i, frame: "small", life: 130, size: "small", cycle: { k: "menses" }, hungry: true, zones: [["feet", 2]],
    gen: "키 90~120cm, 털 많은 큰 발로 맨발 생활, 하루에 여러 끼, 몸이 가볍고 조용히 움직임.", nsfw: "체격 차이가 큰 상대와는 장면에 차이가 드러남. 월경·임신은 인간과 비슷." }),
  B({ id: "gnome", label: "노움", re: /노움|gnome/i, frame: "small", life: 350, size: "small", cycle: { k: "menses", len: 32 }, preg: { p: 0.7 },
    gen: "키 90~110cm, 수명 300년 안팎, 손이 작고 섬세함, 땅속·작은 공간이 편함.", nsfw: "체격 차이가 장면에 드러남. 임신은 인간보다 조금 드묾." }),
  B({ id: "giant", label: "거인", re: /^거인|자이언트|giant/i, frame: "giant", life: 400, size: "huge", cycle: { k: "menses", len: 40 }, preg: { p: 0.5, wk: 60 }, fat: 0.6, hungry: true,
    gen: "키 3m 이상, 힘이 매우 셈, 많이 먹음. 사람용 문·가구는 작음.", nsfw: "체격 차이가 매우 큼. 체력이 많고 임신 기간이 김." }),
  B({ id: "halfgiant", label: "하프거인", re: /하프\s?거인|반거인|half[-\s]?giant/i, frame: "giant", life: 150, size: "big", cycle: { k: "menses" }, fat: 0.75,
    gen: "키 2m 안팎, 힘이 셈, 많이 먹음.", nsfw: "체격 차이가 큼. 체력이 많음." }),
  B({ id: "ogre", label: "오우거", re: /오우거|오거|ogre/i, frame: "giant", life: 120, size: "huge", cycle: { k: "menses" }, lust: 1.2, fat: 0.7, hungry: true, body: { horns: "oni" },
    gen: "키 2.5m 이상, 큰 몸과 작은 뿔, 힘이 매우 셈, 많이 먹음.", nsfw: "체격 차이가 큼. 성욕이 쉽게 오름." }),

  // ── 수인(케모미미) ──
  beast("cat", "고양이 수인", /고양이|냥|캣|cat|neko|네코(?!마타)/i, "cat", "cat", { cycle: { k: "heat", months: [3, 4, 9, 10], len: 10 }, zones: [["ears", 2], ["tail", 3]], sleepy: true, preg: { p: 1, multi: true },
    gen: "고양이 귀·가는 꼬리. 밤눈이 밝고 낮잠이 많음, 높은 곳이 편함, 몸이 젖는 건 조금 꺼림.", nsfw: "봄·가을에 발정기(1~2주). 꼬리 뿌리가 아주 예민함. 관계 뒤 임신이 잘 되는 체질." }),
  beast("dog", "개 수인", /^개|강아지|멍멍|도그|dog|inu/i, "dog", "dog", { cycle: { k: "heat", every: 180, len: 18 }, jeal: 1.3,
    gen: "개 귀·꼬리(감정에 따라 흔들림). 후각이 아주 좋고 체력이 좋음.", nsfw: "1년에 두 번 발정기(약 3주). 쓰다듬기에 크게 반응함. 정한 상대에게 질투가 큰 편." }),
  beast("wolf", "늑대 수인", /늑대(?!인간)|울프(?!맨)|wolf(?!man)/i, "wolf", "wolf", { cycle: { k: "heat", months: [12, 1, 2], len: 14 }, bond: true, moonK: 1.2,
    gen: "늑대 귀·굵은 꼬리. 후각·지구력이 좋고 추위에 강함. 보름달 밤엔 몸이 들뜸.", nsfw: "겨울에 발정기(약 2주). 한 짝과 강하게 결속함. 보름 무렵 성욕이 오름." }),
  beast("fox", "여우 수인", /여우(?!\s*요괴)|폭스|페넥|fox|kitsune/i, "fox", "fox", { cycle: { k: "heat", months: [12, 1, 2], len: 4 }, heatK: 1.9, zones: [["ears", 2], ["tail", 3]],
    gen: "여우 귀·풍성한 꼬리, 청각이 좋고 몸이 날렵함.", nsfw: "겨울에 짧고 강한 발정기(며칠). 꼬리가 아주 예민해서 가까운 사이에게만 만지게 함." }),
  beast("rabbit", "토끼 수인", /토끼|버니|rabbit|bunny|usagi/i, "rabbit", "puff", { cycle: { k: "heat", every: 7, len: 3 }, heatK: 1.4, lust: 1.3, preg: { p: 1, multi: true },
    gen: "긴 토끼 귀·동그란 꼬리. 소리에 아주 민감하고 다리 힘이 좋음, 채소·과일을 좋아함, 새벽·해질녘에 활발.", nsfw: "뚜렷한 주기 없이 자주 달아오름. 다태아(쌍둥이 이상)가 잘 생김. 오래 혼자면 성욕이 더 오름." }),
  beast("raccoon", "너구리 수인", /너구리|타누키|tanuki|raccoon/i, "round", "fluffy", { cycle: { k: "heat", months: [2, 3], len: 7 }, bond: true,
    gen: "둥근 귀·굵은 줄무늬 꼬리. 잘 먹고 몸이 통통한 편, 손재주가 좋음.", nsfw: "봄에 발정기. 짝과 결속이 강함." }),
  beast("bear", "곰 수인", /곰|베어|bear/i, "round", "puff", { cycle: { k: "heat", months: [6, 7], len: 10 }, fat: 0.7, size: "big", hibernate: true, zones: [["ears", 2], ["neck", 1]],
    gen: "둥근 귀·짧은 꼬리, 큰 몸, 힘이 셈, 단 것(꿀)을 좋아함. 겨울엔 졸리고 잠이 많아짐.", nsfw: "여름에 발정기. 체력이 많고 껴안는 걸 좋아함. 겨울엔 성욕이 줄고 잠이 늚." }),
  beast("lion", "사자 수인", /사자|라이온|lion/i, "cat", "lion", { cycle: { k: "heat", every: 21, len: 4 }, refr: 0.5, sleepy: true, zones: [["ears", 2], ["nape", 2], ["tail", 1]],
    gen: "둥근 고양잇과 귀·끝에 술이 달린 꼬리, 힘이 셈, 낮엔 쉬는 시간이 많음.", nsfw: "3주마다 짧은 발정기. 발정 중엔 짧은 간격으로 여러 번 원함. 목덜미가 예민함." }),
  beast("tiger", "호랑이 수인", /호랑이|타이거|tiger|범(?!인)/i, "cat", "tiger", { cycle: { k: "heat", months: [12, 1, 2, 3], len: 5 }, jeal: 1.3, wx: { rain: "물을 좋아해서 비가 싫지 않음" },
    gen: "줄무늬 귀·꼬리, 힘이 셈, 헤엄을 잘 치고 물을 좋아함.", nsfw: "겨울~봄에 발정기(며칠). 소유욕·질투가 큰 편." }),
  beast("leopard", "표범 수인", /표범|치타|흑표|재규어|퓨마|leopard|cheetah|panther|jaguar/i, "cat", "cat", { cycle: { k: "heat", every: 25, len: 5 }, zones: [["ears", 2], ["tail", 2], ["back", 1]],
    gen: "고양잇과 귀·긴 꼬리, 몸이 날렵하고 유연함, 나무를 잘 탐(치타는 순간 속도가 빠름).", nsfw: "몇 주마다 발정기. 몸이 아주 유연함." }),
  beast("cow", "소 수인", /^소\s|소\s?수인|젖소|홀스타인|cow|ushi/i, "side", "cow", { body: { horns: "small" }, cycle: { k: "heat", every: 21, len: 1 }, heatK: 1.8, milk: true, zones: [["chest", 2], ["nipples", 3], ["ears", 1]],
    gen: "옆으로 난 귀·작은 뿔·끝에 술 달린 꼬리, 힘이 셈, 채식 위주.", nsfw: "3주마다 하루 정도 강한 발정. 가슴이 예민하고, 임신 없이도 모유가 나오는 체질일 수 있음." }),
  beast("sheep", "양 수인", /^양\s|양\s?수인|sheep|hitsuji/i, "side", "puff", { body: { horns: "curl" }, cycle: { k: "heat", months: [9, 10, 11], len: 2 }, wx: { hot: "털이 많아 더위를 조금 탐", cold: "추위에 강함" },
    gen: "옆으로 난 귀·말린 뿔·폭신한 머리카락, 추위에 강하고 더위를 조금 탐.", nsfw: "가을에 발정기." }),
  beast("goat", "염소 수인", /염소|goat|사티로스|satyr/i, "side", "puff", { body: { horns: "goat" }, cycle: { k: "heat", months: [9, 10, 11], len: 2 }, lust: 1.3,
    gen: "옆으로 난 귀·뒤로 휜 뿔, 균형 감각이 좋고 높은 곳을 잘 오름, 아무거나 잘 먹음.", nsfw: "가을에 발정기. 성욕이 쉽게 오르는 편." }),
  beast("deer", "사슴 수인", /사슴|순록|deer|reindeer/i, "side", "puff", { body: { horns: "antler" }, cycle: { k: "heat", months: [9, 10], len: 3 }, zones: [["ears", 2], ["horns", 2]],
    gen: "옆으로 난 귀·짧은 꼬리, 수컷은 계절마다 빠지고 다시 나는 뿔. 소리에 민감하고 다리가 빠름.", nsfw: "가을에 발정기. 귀·뿔 뿌리가 예민함." }),
  beast("horse", "말 수인", /^말\s|말\s?수인|포니|horse|pony|uma/i, "horse", "horse", { cycle: { k: "heat", every: 21, len: 6, months: [3, 4, 5, 6, 7, 8] }, fat: 0.7, size: "big",
    gen: "곧게 선 귀·긴 머리털 꼬리, 달리기와 지구력이 좋음, 당근·단 것을 좋아함.", nsfw: "봄~여름에 3주마다 발정기. 체력이 많음." }),
  beast("mouse", "쥐 수인", /^쥐|마우스|생쥐|mouse|rat/i, "round", "thin", { size: "small", cycle: { k: "heat", every: 5, len: 1 }, heatK: 1.4, preg: { p: 1, multi: true },
    gen: "둥글고 큰 귀·가는 꼬리, 몸이 작고 재빠름, 좁은 곳이 편함.", nsfw: "4~5일마다 짧은 발정. 다태아가 잘 생김." }),
  beast("squirrel", "다람쥐 수인", /다람쥐|squirrel|risu(?!ai)/i, "round", "fluffy", { size: "small", cycle: { k: "heat", months: [1, 2, 6, 7], len: 2 }, hoard: true,
    gen: "작은 귀·큰 털 꼬리, 몸이 가볍고 나무를 잘 탐, 먹을 걸 모아 두는 습성.", nsfw: "겨울 끝·여름에 발정기." }),
  beast("hamster", "햄스터 수인", /햄스터|hamster/i, "round", "puff", { size: "small", cycle: { k: "heat", every: 4, len: 1 }, preg: { p: 1, multi: true }, hoard: true, sleepy: true,
    gen: "작고 둥근 귀·아주 짧은 꼬리, 밤에 활발, 볼에 먹을 걸 넣어 모으는 습성.", nsfw: "4일마다 짧은 발정. 다태아가 잘 생김." }),
  beast("bird", "새 수인", /새\s?수인|조류\s?수인|참새|까마귀|부엉이|올빼미|앵무|bird|crow|owl/i, "feather", "bird", { cycle: { k: "heat", months: [3, 4, 5], len: 20 }, egg: true, zones: [["ears", 1], ["back", 2]],
    gen: "깃털 귀(귀 자리에 깃털)·꽁지깃, 시력이 좋음, 아침형(참새)·밤형(올빼미)은 종류를 따름. 반짝이는 걸 모으는 종류도 있음.", nsfw: "봄 번식기. 체질에 따라 무정란을 낳는 주기가 있을 수 있음." }),
  beast("panda", "판다 수인", /판다|panda/i, "round", "puff", { cycle: { k: "heat", months: [3, 4], len: 3 }, lust: 0.6, sleepy: true, size: "big",
    gen: "검은 둥근 귀·짧은 꼬리, 대나무·채소를 즐김, 잘 먹고 잘 잠.", nsfw: "봄에 짧은 발정기. 평소 성욕이 낮은 편." }),
  beast("otter", "수달 수인", /수달|otter/i, "round", "thick", { cycle: { k: "heat", every: 40, len: 4 }, wx: { rain: "물을 좋아해서 비가 반가움" },
    gen: "작은 둥근 귀·굵은 꼬리, 헤엄을 아주 잘 침, 물가를 좋아함.", nsfw: "몇 주마다 발정기. 손을 잡고 붙어 있는 걸 좋아함." }),
  beast("bat", "박쥐 수인", /박쥐|bat(?!tle)/i, "bat", "none", { body: { wings: "batsmall" }, cycle: { k: "heat", months: [9, 10], len: 7 }, night: true, zones: [["ears", 2], ["wings", 2]],
    gen: "크고 뾰족한 귀·등에 작은 박쥐 날개, 밤에 활발, 소리로 주변을 잘 앎.", nsfw: "가을에 발정기. 귀·날개 뿌리가 예민함." }),
  beast("hyena", "하이에나 수인", /하이에나|hyena/i, "round", "fluffy", { cycle: { k: "heat", every: 14, len: 3 },
    gen: "둥근 귀·털 꼬리, 턱 힘과 지구력이 좋음. 여성 쪽 체격이 큰 편.", nsfw: "2주마다 짧은 발정." }),
  beast("ferret", "족제비 수인", /족제비|페럿|담비|ferret|weasel/i, "round", "thin", { size: "small", cycle: { k: "heat", months: [3, 4, 5, 6, 7, 8], len: 14 },
    gen: "작고 둥근 귀·길쭉한 꼬리, 몸이 길고 유연함, 좁은 곳을 잘 빠져나감.", nsfw: "봄~여름 내내 발정이 이어지는 편." }),
  beast("penguin", "펭귄 수인", /펭귄|penguin/i, "none", "puff", { cycle: { k: "heat", months: [4, 5], len: 10 }, bond: true, egg: true, wx: { cold: "추위에 아주 강함", hot: "더위를 탐" },
    gen: "짧은 꽁지깃, 추위에 아주 강하고 헤엄을 잘 침, 더위엔 약함.", nsfw: "봄 번식기. 짝과 결속이 강하고 알을 낳는 체질일 수 있음." }),

  // ── 비인간 몸 ──
  B({ id: "harpy", label: "하피", re: /하피|조인|harpy/i, frame: "bird", body: { wings: "feather", ears: "feather" }, cycle: { k: "heat", months: [3, 4, 5], len: 20 }, egg: true, zones: [["wings", 3], ["back", 2]],
    gen: "팔이 커다란 날개라 물건을 잡기 어렵고 하늘을 낢. 뼈가 가벼워 몸무게가 적음.", nsfw: "번식기에 산란. 서로 깃털을 다듬어 주는 게 애정 표현. 날개 뿌리가 아주 예민함." }),
  B({ id: "lizard", label: "리자드맨", re: /리자드|도마뱀|lizard/i, frame: "reptile", body: { tail: "thick", ears: "none" }, cycle: { k: "heat", months: [4, 5], len: 14 }, egg: true, temp: "cold", wx: { cold: "추우면 몸이 둔해지고 졸림", hot: "따뜻하면 몸이 가벼움" }, zones: [["tail", 2], ["neck", 2]],
    gen: "비늘 피부·굵은 꼬리, 체온이 기온을 따라 추우면 둔해지고 따뜻하면 활발. 때때로 탈피.", nsfw: "봄 번식기, 알을 낳음. 체온이 낮아 따뜻한 상대에게 붙는 걸 좋아함." }),
  B({ id: "lamia", label: "라미아", re: /라미아|뱀\s?여인|lamia/i, frame: "reptile", body: { lower: "serpent", ears: "elf" }, cycle: { k: "heat", months: [4, 5], len: 14 }, egg: true, temp: "cold", wx: { cold: "추우면 몸이 둔해지고 졸림" }, zones: [["waist", 2], ["neck", 2], ["tail", 2]],
    gen: "상반신은 사람, 하반신은 긴 뱀 꼬리. 체온이 기온을 따름, 혀로 냄새를 잘 맡음, 때때로 탈피.", nsfw: "봄 번식기, 알을 낳음. 꼬리로 감아 안고 오래 붙어 있는 걸 좋아함." }),
  B({ id: "naga", label: "나가", re: /나가|naga/i, frame: "reptile", body: { lower: "serpent", ears: "elf" }, cycle: { k: "heat", months: [4, 5], len: 14 }, egg: true, temp: "cold", zones: [["waist", 2], ["tail", 2]],
    gen: "상반신 사람·하반신 큰 뱀, 물가·신전 같은 곳이 편함, 체온이 기온을 따름.", nsfw: "봄 번식기, 알을 낳음. 꼬리로 감싸 안는 걸 좋아함." }),
  B({ id: "mermaid", label: "인어", re: /인어|머메이드|mermaid|merfolk/i, frame: "aquatic", body: { lower: "fish", ears: "fin" }, cycle: { k: "menses" }, wx: { rain: "비가 오면 기분 좋게 몸이 가벼움" }, zones: [["ears", 2], ["waist", 2]],
    gen: "하반신이 물고기 꼬리(뭍에선 다리로 바꾸는 세계관도 있음), 물을 자주 마시거나 몸을 적시면 뭍에서도 괜찮음, 헤엄이 아주 빠름, 노래를 잘함.", nsfw: "물속에서 감각이 더 예민해짐. 임신은 세계관을 따름." }),
  B({ id: "siren", label: "세이렌", re: /세이렌|사이렌|siren/i, frame: "aquatic", body: { lower: "fish", ears: "fin" }, cycle: { k: "menses" }, charm: true, zones: [["ears", 2], ["neck", 2]],
    gen: "물고기 꼬리 또는 새 날개를 가진 바다 종족, 목소리가 아주 아름답고 멀리 들림. 물을 자주 마시면 뭍에서도 괜찮음.", nsfw: "노래로 듣는 사람을 달아오르게 할 수 있음(본인이 원할 때만)." }),
  B({ id: "shark", label: "상어 수인", re: /상어|shark/i, frame: "aquatic", body: { ears: "fin", tail: "thick" }, cycle: { k: "heat", every: 60, len: 7 }, zones: [["tail", 2], ["neck", 1]],
    gen: "지느러미 귀·굵은 꼬리, 뾰족한 이, 피 냄새에 민감, 헤엄이 빠름. 물을 자주 마시면 충분함.", nsfw: "몇 달마다 발정기. 무는 버릇이 애정 표현일 수 있음." }),
  B({ id: "scylla", label: "스킬라", re: /스킬라|문어|scylla|octopus/i, frame: "aquatic", body: { lower: "tentacle" }, cycle: { k: "menses" }, zones: [["waist", 2]],
    gen: "하반신이 여러 개의 촉수라 물건을 동시에 여러 개 잡음, 몸을 작게 접어 좁은 곳에 들어감, 먹물. 물을 자주 마시면 괜찮음.", nsfw: "촉수 끝까지 감각이 있어 접촉에 예민함." }),
  B({ id: "bee", label: "벌 수인", re: /벌\s?수인|꿀벌|여왕벌|bee/i, frame: "insect", body: { horns: "antenna", wings: "insect", tail: "none" }, cycle: { k: "heat", months: [4, 5, 6], len: 10 }, egg: true, pher: true, zones: [["horns", 2], ["wings", 2]],
    gen: "더듬이·얇은 날개, 꽃꿀·단 것을 좋아함, 무리 생활(여왕·일벌 체계는 세계관을 따름).", nsfw: "번식기에 페로몬이 강해져 주변 사람을 끌어당김. 여왕은 알을 많이 낳음." }),
  B({ id: "butterfly", label: "나비 수인", re: /나비|butterfly|moth|나방/i, frame: "insect", body: { horns: "antenna", wings: "butterfly" }, cycle: { k: "heat", months: [5, 6, 7], len: 7 }, egg: true, zones: [["horns", 2], ["wings", 3]],
    gen: "더듬이·크고 화려한 날개, 꽃꿀을 즐김, 몸이 가벼움, 추운 날엔 날기 어려움.", nsfw: "여름에 번식기. 날개가 아주 예민함." }),
  B({ id: "arachne", label: "아라크네", re: /아라크네|거미|arachne|spider/i, frame: "insect", body: { lower: "spider" }, cycle: { k: "heat", months: [8, 9], len: 10 }, egg: true, zones: [["waist", 2], ["back", 2]],
    gen: "상반신 사람·하반신 거미, 실을 뽑아 옷감·거미줄을 만듦, 벽과 천장을 걸음.", nsfw: "실로 묶고 감싸는 걸 좋아할 수 있음. 늦여름 번식기, 알을 낳음." }),
  B({ id: "ant", label: "개미 수인", re: /개미|ant\b/i, frame: "insect", body: { horns: "antenna" }, cycle: { k: "heat", months: [6, 7], len: 5 }, egg: true, pher: true, zones: [["horns", 2]],
    gen: "더듬이, 몸집에 비해 힘이 아주 셈, 무리 생활(여왕·일개미는 세계관을 따름).", nsfw: "여름 번식기에 페로몬. 여왕은 알을 낳음." }),
  B({ id: "mantis", label: "사마귀 수인", re: /사마귀|mantis/i, frame: "insect", body: { horns: "antenna", wings: "insect" }, cycle: { k: "heat", months: [8, 9], len: 7 }, egg: true, zones: [["horns", 1], ["neck", 2]],
    gen: "더듬이·얇은 날개, 앞팔이 길고 빠름, 시야가 넓음.", nsfw: "늦여름 번식기, 알을 낳음." }),
  B({ id: "centaur", label: "켄타우로스", re: /켄타우|센타우|centaur/i, frame: "beast", body: { lower: "horse", ears: "elf" }, size: "huge", cycle: { k: "heat", every: 21, len: 6, months: [3, 4, 5, 6, 7, 8] }, fat: 0.6, hungry: true, zones: [["back", 2], ["lowback", 2]],
    gen: "상반신 사람·하반신 말, 아주 빠르고 지구력이 좋음, 계단·좁은 실내가 불편함, 많이 먹음.", nsfw: "봄~여름에 3주마다 발정. 몸 구조가 달라 자세에 제약이 있음." }),

  // ── 용·신비계 ──
  B({ id: "dragon", label: "용족", re: /용족|용인|드래곤|드라코|dragon|ryu/i, frame: "dragon", life: 3000, body: { horns: "dragon", tail: "dragon", wings: "bat" }, temp: "hot", cycle: { k: "heat", every: 365, len: 10 }, heatK: 2, bond: true, jeal: 1.4, egg: true, preg: { p: 0.3, wk: 60 }, zones: [["horns", 2], ["tail", 2], ["neck", 3]],
    gen: "뿔·꼬리·날개(일부만 비늘), 수명 수천 년, 체온이 높음. 브레스 속성에 맞는 추위·더위에 강함. 잠을 아주 길게 잘 때가 있음.", nsfw: "발정기가 드물지만(1년에 한 번 이하) 아주 강함. 한 번 정한 짝에게 강하게 결속함. 목 아래 거꾸로 난 비늘(역린)이 약점. 알을 낳음." }),
  B({ id: "phoenix", label: "봉황", re: /봉황|주작|피닉스|불사조|phoenix/i, frame: "holy", life: 9999, body: { wings: "feather", tail: "bird" }, temp: "hot", cycle: { k: "heat", every: 365, len: 7 }, bond: true, egg: true, zones: [["wings", 3]], wx: { cold: "추위에 강함" },
    gen: "불꽃 같은 깃털 날개·꽁지, 체온이 높음, 죽어도 불 속에서 다시 태어난다는 전승.", nsfw: "평생 한 짝. 날개가 아주 예민함. 알을 낳음." }),
  B({ id: "unicorn", label: "유니콘", re: /유니콘|기린(?!\s*수인)|unicorn|qilin|kirin/i, frame: "holy", life: 1000, body: { horns: "unicorn", ears: "horse", tail: "horse" }, cycle: { k: "menses", len: 40 }, preg: { p: 0.5 }, zones: [["horns", 3]],
    gen: "이마의 뿔, 말 귀·꼬리, 상처를 낫게 하는 힘, 깨끗한 물과 숲을 좋아함.", nsfw: "뿔이 아주 예민함. 종족 전통상 첫 경험에 큰 의미를 둠." }),
  B({ id: "angel", label: "천사", re: /(?<!타락\s?)천사|엔젤|angel|seraph/i, frame: "holy", life: 9999, body: { wings: "feather" }, cycle: { k: "none" }, lust: 0.5, preg: { p: 0.3, will: true }, fall: true, zones: [["wings", 3], ["back", 2]],
    gen: "하얀 날개(감정에 따라 펼쳐짐), 늙지 않음, 성스러운 힘.", nsfw: "처음엔 성욕이 낮음. 욕망을 느낄수록 날개 끝 색이 짙어지는 체질. 날개 뿌리가 아주 예민함. 임신은 본인이 원할 때만." }),
  B({ id: "fallen", label: "타락천사", re: /타락\s?천사|fallen/i, frame: "holy", life: 9999, body: { wings: "featherdark" }, cycle: { k: "none" }, lust: 1.2, preg: { p: 0.3, will: true }, zones: [["wings", 3], ["back", 2]],
    gen: "검은 날개, 늙지 않음.", nsfw: "날개 뿌리가 아주 예민함. 임신은 본인이 원할 때만." }),
  B({ id: "valkyrie", label: "발키리", re: /발키리|valkyrie/i, frame: "holy", life: 9999, body: { wings: "feather" }, cycle: { k: "menses" }, fat: 0.7, zones: [["wings", 2]],
    gen: "날개, 전사의 몸, 영혼을 볼 수 있음.", nsfw: "체력이 많음. 날개가 예민함." }),
  B({ id: "god", label: "신", re: /^신$|^신\s|여신|god|goddess|deity/i, frame: "holy", life: 99999, cycle: { k: "none" }, preg: { will: true }, fat: 0.2,
    gen: "늙지 않고 거의 지치지 않음, 권능이 있음(믿는 이가 많을수록 강해지는 세계관도 있음).", nsfw: "체력과 회복이 아주 높음. 임신은 본인이 원할 때만." }),
  B({ id: "demigod", label: "반신", re: /반신|데미갓|demigod/i, frame: "holy", life: 300, cycle: { k: "menses" }, fat: 0.6,
    gen: "신의 핏줄, 수명이 길고 몸이 강함.", nsfw: "체력이 많음. 월경·임신은 인간과 비슷." }),
  B({ id: "spirit_fire", label: "불의 정령", re: /불의?\s?정령|이프리트|샐러맨더|fire spirit|ifrit/i, frame: "spirit", temp: "hot", cycle: { k: "none" }, preg: { none: true }, wx: { rain: "비가 오면 기운이 조금 빠짐", sun: "맑고 더우면 기운이 남" },
    gen: "몸이 따뜻하고 빛을 냄, 실체로 있으려면 마력이 듦.", nsfw: "몸이 뜨거움. 생식은 하지 않음." }),
  B({ id: "spirit_water", label: "물의 정령", re: /물의?\s?정령|운디네|water spirit|undine/i, frame: "spirit", temp: "cold", cycle: { k: "none" }, preg: { none: true }, wx: { rain: "비가 오면 기운이 남", hot: "덥고 건조하면 조금 지침" },
    gen: "몸이 서늘하고 촉촉함, 물과 가까울수록 힘이 남.", nsfw: "몸이 차갑고 부드러움. 생식은 하지 않음." }),
  B({ id: "spirit_wind", label: "바람의 정령", re: /바람의?\s?정령|실프|wind spirit|sylph/i, frame: "spirit", cycle: { k: "none" }, preg: { none: true }, wx: { wind: "바람이 불면 기운이 남" },
    gen: "몸이 아주 가볍고 공중에 뜸, 바람이 불면 힘이 남.", nsfw: "몸이 가볍고 간지럼에 약함. 생식은 하지 않음." }),
  B({ id: "spirit_earth", label: "땅의 정령", re: /땅의?\s?정령|노움\s?정령|earth spirit/i, frame: "spirit", cycle: { k: "none" }, preg: { none: true }, fat: 0.5,
    gen: "몸이 단단하고 무거움, 땅에 닿아 있으면 잘 지치지 않음.", nsfw: "체력이 많음. 생식은 하지 않음." }),
  B({ id: "pixie", label: "픽시", re: /픽시|요정|페어리|pixie|fairy|sprite/i, frame: "spirit", size: "tiny", body: { wings: "fairy", ears: "elf" }, cycle: { k: "heat", months: [3, 4, 5], len: 30 }, zones: [["wings", 3]],
    gen: "손바닥만 한 몸·투명한 날개, 날 수 있음, 꽃가루·꿀을 먹음, 봄에 가장 활발.", nsfw: "체격 차이가 매우 커서 인간형과는 장면에 크게 드러남. 날개가 아주 예민함." }),
  B({ id: "dryad", label: "드라이어드", re: /드라이어드|나무\s?요정|dryad/i, frame: "plant", body: { ears: "elf" }, cycle: { k: "heat", months: [3, 4, 5], len: 30 }, wx: { sun: "맑은 날 기운이 남", rain: "비를 반김" },
    gen: "나무와 이어진 몸(머리카락에 잎), 자기 나무 가까이 있을 때 가장 편함, 햇빛·물을 좋아함.", nsfw: "봄에 생명력이 넘쳐 성욕이 가장 높음." }),
  B({ id: "nymph", label: "님프", re: /님프|nymph|나이아드|오레아드/i, frame: "spirit", body: { ears: "elf" }, cycle: { k: "heat", months: [3, 4, 5, 6], len: 30 }, lust: 1.2,
    gen: "물·숲·산 같은 자연에 깃든 정령, 깃든 곳에서 기운이 남, 늙지 않음.", nsfw: "봄~초여름에 성욕이 높음." }),

  // ── 마족·어둠계 ──
  B({ id: "succubus", label: "서큐버스", re: /서큐버스|서큐|succubus/i, frame: "demon", life: 9999, body: { horns: "demon", wings: "bat", tail: "demon" }, cycle: { k: "none" }, lust: 1.5, preg: { will: true }, essence: true, charm: true, zones: [["tail", 3], ["horns", 2], ["wings", 1]],
    gen: "뿔·박쥐 날개·끝이 하트 모양인 꼬리(숨길 수 있음), 꿈에 들어갈 수 있음, 늙지 않음.", nsfw: "관계로 정기를 얻어 기운을 차림(오래 못 얻으면 조금 지침). 성욕이 높음. 꼬리 끝이 약점. 임신은 본인이 원할 때만." }),
  B({ id: "incubus", label: "인큐버스", re: /인큐버스|incubus/i, frame: "demon", life: 9999, body: { horns: "demon", wings: "bat", tail: "demon" }, cycle: { k: "none" }, lust: 1.5, preg: { will: true }, essence: true, charm: true, zones: [["tail", 3], ["horns", 2]],
    gen: "뿔·박쥐 날개·꼬리(숨길 수 있음), 꿈에 들어갈 수 있음, 늙지 않음.", nsfw: "관계로 정기를 얻어 기운을 차림. 성욕이 높음. 상대의 임신도 본인이 정함." }),
  B({ id: "demon", label: "악마", re: /악마|마족|마인|데몬|demon|devil|fiend/i, frame: "demon", life: 5000, body: { horns: "demon", tail: "demon", wings: "bat" }, cycle: { k: "menses", len: 40 }, preg: { will: true }, zones: [["horns", 2], ["tail", 2]],
    gen: "뿔·꼬리(날개는 종류마다), 마력이 강하고 늙지 않거나 아주 천천히 늙음.", nsfw: "뿔·꼬리가 예민함. 임신은 본인이 원할 때만." }),
  B({ id: "vampire", label: "흡혈귀", re: /흡혈귀|뱀파이어|vampire/i, frame: "vampire", life: 9999, temp: "cold", cycle: { k: "none" }, preg: { none: true }, thirst: true, night: true, zones: [["neck", 3]], wx: { sun: "강한 햇빛이 불편해서 그늘·양산을 찾음(위험할 정도는 아님)" }, body: { ears: "halfelf" },
    gen: "늙지 않음, 체온이 낮음, 밤에 힘이 남. 피를 즐겨 마시지만 보통 음식도 먹을 수 있음. 강한 햇빛은 불편해서 피하는 편.", nsfw: "피를 마실 때 쾌감이 있고, 물리는 쪽도 쾌감을 느낄 수 있음. 목이 아주 예민함. 임신은 하지 않음." }),
  B({ id: "dhampir", label: "담피르", re: /담피르|다크\s?스토커|dhampir|dhampyr/i, frame: "vampire", life: 400, cycle: { k: "menses" }, preg: { p: 0.5 }, zones: [["neck", 2]], body: { ears: "halfelf" },
    gen: "흡혈귀와 인간의 혼혈, 낮에도 문제없이 다님, 가끔 피가 당김, 수명이 김.", nsfw: "목이 예민함. 임신은 인간보다 조금 어려움." }),
  B({ id: "werewolf", label: "늑대인간", re: /늑대\s?인간|웨어울프|라이칸|werewolf|lycan/i, frame: "beast", cycle: { k: "moon" }, heatK: 1.8, body: { ears: "wolf", tail: "wolf" }, regen: true, temp: "hot", bond: true, zones: [["ears", 2], ["neck", 2]],
    gen: "보름달 무렵 몸이 늑대처럼 변하고 감각이 날카로워짐, 상처가 빨리 나음, 체온이 높음, 후각이 좋음.", nsfw: "보름 전후로 성욕이 크게 오름. 냄새로 짝을 정하고 강하게 결속함." }),
  B({ id: "undead", label: "언데드", re: /언데드|구울|좀비|리치|레버넌트|해골|undead|ghoul|zombie|lich|revenant/i, frame: "undead", life: 99999, temp: "cold", cycle: { k: "none" }, preg: { none: true }, fat: 0, lust: 0.7,
    gen: "체온·맥박이 없거나 아주 약함, 잠이 필요 없음, 늙지 않음.", nsfw: "몸이 차가움. 감각이 무딘 편이라 강한 자극을 찾기도 함. 임신은 하지 않음." }),
  B({ id: "orc", label: "오크", re: /오크|orc/i, frame: "orc", life: 70, size: "big", cycle: { k: "menses", len: 24 }, preg: { p: 1, wk: 30, multi: true }, fat: 0.7, body: { ears: "halfelf" },
    gen: "초록·회색 피부, 아래 송곳니, 큰 몸, 힘이 셈, 빨리 자람.", nsfw: "체력이 많음. 임신 기간이 짧고 쌍둥이가 잘 생김." }),
  B({ id: "goblin", label: "고블린", re: /(?<!홉)고블린|goblin/i, frame: "orc", life: 40, size: "small", cycle: { k: "menses", len: 21 }, preg: { p: 1, wk: 20, multi: true }, body: { ears: "elf" },
    gen: "작은 몸·크고 뾰족한 귀, 아주 빨리 자람, 어둠 속에서 잘 봄.", nsfw: "체격 차이가 장면에 드러남. 임신 기간이 짧고 다태아가 잘 생김." }),
  B({ id: "hobgoblin", label: "홉고블린", re: /홉고블린|hobgoblin/i, frame: "orc", life: 60, cycle: { k: "menses", len: 24 }, preg: { p: 1, wk: 30 }, body: { ears: "elf" },
    gen: "사람만 한 키·뾰족한 귀, 고블린보다 크고 튼튼함.", nsfw: "체력이 많음. 임신 기간이 짧은 편." }),
  B({ id: "troll", label: "트롤", re: /트롤|troll/i, frame: "orc", life: 200, size: "huge", cycle: { k: "menses", len: 35 }, regen: true, fat: 0.6, body: { ears: "elf" }, wx: { sun: "강한 햇빛을 싫어해서 그늘을 찾음" },
    gen: "아주 큰 몸, 상처가 아주 빨리 나음, 강한 햇빛을 싫어함, 많이 먹음.", nsfw: "체격 차이가 큼. 회복이 아주 빨라 금방 다시 힘이 남." }),
  B({ id: "oni", label: "오니", re: /오니|도깨비|야차|oni|ogre-?kin|yaksha/i, frame: "demon", life: 500, body: { horns: "oni" }, cycle: { k: "menses" }, drink: true, fat: 0.7, zones: [["horns", 2]],
    gen: "뿔, 힘이 아주 셈, 술에 강하고 잔치를 좋아함(도깨비는 방망이로 물건을 만들어 내는 전승).", nsfw: "술이 들어가면 달아오르기 쉬움. 뿔 뿌리가 예민함. 체력이 많음." }),

  // ── 동양 요괴·설화 ──
  B({ id: "gumiho", label: "구미호", re: /구미호|여우\s*요괴|천호|nine[-\s]?tail|kyuubi/i, frame: "yokai", life: 1000, body: { ears: "fox", tail: "ninetail" }, cycle: { k: "heat", months: [12, 1, 2], len: 7 }, essence: true, charm: true, preg: { will: true }, zones: [["ears", 2], ["tail", 3]],
    gen: "여우 귀·여러 개의 꼬리(꼬리 수 = 수련 정도), 둔갑술, 수명이 아주 김.", nsfw: "관계로 정기를 얻어 수련에 보탬. 꼬리 하나하나가 예민함. 임신은 본인이 원할 때만." }),
  B({ id: "yukionna", label: "설녀", re: /설녀|유키온나|눈\s?여인|yuki-?onna|snow woman/i, frame: "yokai", temp: "cold", cycle: { k: "menses" }, wx: { snow: "눈 오는 날 기운이 남", hot: "더우면 조금 나른해짐" }, zones: [["lips", 2], ["neck", 2]],
    gen: "체온이 아주 낮고 숨결이 차가움, 추위에 아주 강함, 더운 날엔 조금 나른함.", nsfw: "몸이 차가워 따뜻한 상대에게 끌림. 눈 오는 날 성욕이 오름." }),
  B({ id: "kappa", label: "갓파", re: /갓파|캇파|kappa/i, frame: "yokai", cycle: { k: "menses" }, body: { ears: "none" }, wx: { rain: "비가 오면 기운이 남" },
    gen: "머리 위 접시, 물갈퀴, 헤엄을 잘 침, 오이를 좋아함. 물을 자주 마시면 뭍에서도 괜찮음.", nsfw: "물가에서 더 편안해짐." }),
  B({ id: "tengu", label: "텐구", re: /텐구|tengu|까마귀\s?요괴/i, frame: "yokai", body: { wings: "featherdark" }, cycle: { k: "menses" }, zones: [["wings", 2]],
    gen: "검은 날개, 산에 살며 하늘을 낢, 바람을 다룬다는 전승.", nsfw: "날개가 예민함." }),
  B({ id: "nekomata", label: "네코마타", re: /네코마타|nekomata|고양이\s?요괴/i, frame: "yokai", life: 300, body: { ears: "cat", tail: "twin" }, cycle: { k: "heat", months: [3, 4, 9, 10], len: 10 }, zones: [["ears", 2], ["tail", 3]],
    gen: "고양이 귀·끝이 둘로 갈라진 꼬리, 오래 산 고양이가 된 요괴, 둔갑할 수 있음.", nsfw: "봄·가을 발정기. 두 꼬리 뿌리가 아주 예민함." }),
  B({ id: "imugi", label: "이무기", re: /이무기|imugi/i, frame: "yokai", life: 1000, body: { lower: "serpent", horns: "small" }, temp: "cold", cycle: { k: "heat", months: [6, 7], len: 10 }, egg: true, zones: [["tail", 2], ["neck", 2]],
    gen: "용이 되려고 수련하는 큰 뱀(사람 모습일 땐 하반신이나 비늘 일부만), 물을 좋아함.", nsfw: "여름 번식기. 꼬리로 감싸는 걸 좋아함." }),
  B({ id: "xian", label: "선인", re: /선인|신선|선녀|수선자|도사|immortal cultivator|xian/i, frame: "holy", life: 9999, cycle: { k: "menses", len: 60 }, lust: 0.7, fat: 0.5, dual: true,
    gen: "수련 경지가 있음, 늙지 않거나 아주 천천히 늙음, 오래 먹지 않아도 괜찮음.", nsfw: "함께 수련하는 쌍수로 경지가 오를 수 있음. 성욕은 천천히 오름." }),

  // ── 인공·기타 ──
  B({ id: "android", label: "안드로이드", re: /안드로이드|오토마타|기계\s?인형|로봇|android|automaton|robot/i, frame: "construct", cycle: { k: "none" }, preg: { none: true }, battery: true, wx: { rain: "비에 오래 젖는 건 조금 신경 씀" },
    gen: "잠 대신 충전, 먹지 않거나 조금만 먹음, 몸이 아주 정밀함.", nsfw: "감각 모듈 민감도가 정해져 있음. 임신은 하지 않음." }),
  B({ id: "cyborg", label: "사이보그", re: /사이보그|cyborg/i, frame: "construct", cycle: { k: "menses" }, preg: { p: 0.6 },
    gen: "몸 일부가 기계, 정기 점검이 필요함, 기계 부분은 힘이 셈.", nsfw: "기계 부분은 감각이 다를 수 있음. 임신은 남은 몸에 따름." }),
  B({ id: "golem", label: "골렘", re: /골렘|golem/i, frame: "construct", size: "big", cycle: { k: "none" }, preg: { none: true }, fat: 0, temp: "cold",
    gen: "돌·흙·금속으로 만든 몸, 핵(코어)으로 움직임, 지치지 않고 아주 무거움.", nsfw: "몸이 단단하고 차가움. 생식은 하지 않음." }),
  B({ id: "homunculus", label: "호문쿨루스", re: /호문쿨루스|키메라|실험체|인조인간|homunculus|chimera/i, frame: "construct", cycle: { k: "menses" }, preg: { p: 0.4 },
    gen: "만들어진 몸, 정기적으로 약이나 점검이 필요할 수 있음(키메라는 섞인 동물 특징이 남음).", nsfw: "임신이 드물거나 불안정함." }),
  B({ id: "slime", label: "슬라임", re: /슬라임|slime/i, frame: "slime", body: { lower: "slime" }, cycle: { k: "none" }, preg: { none: true }, zones: [["belly", 2], ["chest", 2]],
    gen: "말랑한 몸, 사람 모습을 유지하고 모양을 바꿀 수 있음, 몸이 감정에 따라 색이 살짝 변함. 물을 자주 마시면 충분함.", nsfw: "온몸이 감각 기관이라 예민함. 몸을 늘려 감싸 안을 수 있음. 아이 대신 분열로 늘어나는 세계관도 있음." }),
  B({ id: "alraune", label: "알라우네", re: /알라우네|만드라고라|식물\s?인|꽃\s?요정|alraune|mandragora/i, frame: "plant", cycle: { k: "heat", months: [3, 4, 5], len: 20 }, pher: true, wx: { sun: "맑은 날 기운이 남", rain: "비를 반김" }, zones: [["chest", 2]],
    gen: "꽃·잎이 달린 몸, 햇빛과 물로 기운을 얻음(보통 음식도 먹음), 꽃향기가 남.", nsfw: "봄 개화기에 꿀과 향기로 상대를 끌어당김. 꽃 부분이 예민함." }),
  B({ id: "ghost", label: "유령", re: /유령|원령|망령|귀신|ghost|spirit(?!\s)/i, frame: "ghost", body: { lower: "ghost" }, temp: "cold", cycle: { k: "none" }, preg: { none: true }, fat: 0, night: true,
    gen: "모습이 옅고 몸이 가벼움(원하면 만질 수 있음), 밤에 또렷해짐, 주변이 서늘해짐.", nsfw: "몸이 차가움. 생식은 하지 않음." }),
]);
export const RACE_BY_ID = Object.freeze(Object.fromEntries(RACES.map((r) => [r.id, r])));
// AI가 표에 없는 종족을 말할 때 고르는 가장 가까운 틀 → 대표 종족
export const FRAMES = Object.freeze({ human: "human", elf: "elf", dwarf: "dwarf", small: "halfling", giant: "giant", beast: "cat", bird: "harpy", reptile: "lizard", aquatic: "mermaid", insect: "bee", dragon: "dragon", holy: "angel", demon: "demon", vampire: "vampire", undead: "undead", orc: "orc", construct: "android", spirit: "spirit_wind", plant: "alraune", slime: "slime", ghost: "ghost", yokai: "gumiho" });

// 글 → 종족 id(못 찾으면 ""). 혼혈은 "하프"가 붙은 쪽 우선(하프엘프·하프거인)
export function raceIdOf(text) {
  const t = String(text ?? "").trim(); if (!t) return "";
  if (RACE_BY_ID[t.toLowerCase()]) return t.toLowerCase();
  let best = "", len = 0;   // 가장 길게 맞는 종족(고양이 요괴 → 네코마타, 하프엘프 → 하프엘프)
  for (const r of RACES) { const m = t.match(r.re); if (m && m[0].length > len) { best = r.id; len = m[0].length; } }
  return best;
}
// 기록기 줄: race|이름|종족(한국어)|틀(표에 없을 때)
export const RACE_STAGE1 = "\nrace|Name|race in Korean (e.g. 인간, 엘프, 고양이 수인, 서큐버스, 흡혈귀)|closest of human, elf, dwarf, small, giant, beast, bird, reptile, aquatic, insect, dragon, holy, demon, vampire, undead, orc, construct, spirit, plant, slime, ghost, yokai      a character's race when first clear or when it changes (skip plain humans unless the setting has other races)";
export function raceReport(f, canon = (n) => n) {
  const name = canon(String(f?.[1] ?? "").trim()), label = String(f?.[2] ?? "").trim().slice(0, 20);
  if (!name || !label || name === "{{user}}") return null;
  const id = raceIdOf(label) || FRAMES[String(f?.[3] ?? "").trim().toLowerCase()] || "human";
  return { kind: "race", name, id, label: RACE_BY_ID[id]?.label === label ? "" : label };
}
// 인물 이름 → 종족(저장값, 없으면 인간). {…표 값, label(표시 이름), custom(표에 없는 이름이면 그 이름)}
const nk = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
export function raceFor(f, names) {
  const list = (Array.isArray(names) ? names : [names]).map(nk).filter(Boolean);
  const rec = Object.values(f?.extra?.race ?? {}).find((x) => list.includes(nk(x.name)));
  const r = RACE_BY_ID[rec?.id] ?? RACE_BY_ID.human;
  return { ...r, label: rec?.label || r.label, custom: rec?.label && rec.label !== r.label ? rec.label : "", known: !!rec };
}

// ── 계산 ──
const SYNODIC = 29.530589, NEW0 = dayIndex("2000-01-06", null);   // 2000-01-06 삭
export function moonPhase(iso, cal = null) { const n = dayIndex(iso, cal); if (!Number.isFinite(n)) return null; return (((n - NEW0) % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC; }   // 0 삭 · 0.5 보름
const monthOf = (iso, cal, hemi) => Math.floor(yearPos(iso, cal, hemi) * 12 + 0.0001) + 1;   // 달력·반구에 맞춘 1~12월
// 발정·주기 상태 {on, label, why}
export function heatOf(race, iso, { cal = null, hemi = "N", seed = "" } = {}) {
  const c = race?.cycle ?? { k: "menses" };
  if (c.k === "moon") { const p = moonPhase(iso, cal); if (p == null) return { on: false, label: "" }; const full = Math.abs(p - 0.5) < 0.06; return { on: full, label: full ? "보름 — 몸이 들뜸" : p > 0.38 && p < 0.5 ? "보름이 다가옴" : "" }; }
  if (c.k !== "heat") return { on: false, label: "" };
  const n = dayIndex(iso, cal); if (!Number.isFinite(n)) return { on: false, label: "" };
  if (c.months?.length) {
    const m = monthOf(iso, cal, hemi); if (!c.months.includes(m)) return { on: false, label: "발정기 아님" };
    if (!c.every) { const start = seedDay(seed, 20), d = ((n - start) % 30 + 30) % 30; const on = d < (c.len ?? 7); return { on, label: on ? "발정기" : "발정기 무렵" }; }
  }
  const every = c.every ?? 30, off = seedDay(seed, every), d = ((n - off) % every + every) % every;
  const on = d < (c.len ?? 3);
  return { on, label: on ? "발정기" : every - d <= 2 ? "발정기가 다가옴" : "" };
}
function seedDay(seed, m) { let h = 0; for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % Math.max(1, m); }
// 성욕 배수(AI가 올린 폭에 곱함): 종족 기본 × 발정 × 보름(늑대)
export function raceLustK(race, iso, o = {}) {
  let k = Number(race?.lust) || 1; const h = heatOf(race, iso, o); if (h.on) k *= race.heatK ?? 1.5;
  if (race?.moonK && moonPhase(iso, o.cal) != null && Math.abs(moonPhase(iso, o.cal) - 0.5) < 0.06) k *= race.moonK;
  return { k: Math.max(0.2, Math.min(3, k)), heat: h };
}
// 임신: k = 보호 안 된 관계를 굴릴 확률 배수(0이면 막힘). will(본인 조절)은 기본 켬 → 원할 때만(기본 막힘)
export function raceFert(race, { will = true } = {}) {
  const p = race?.preg ?? {};
  if (p.none) return { k: 0, label: `${race.label}: 임신하지 않는 종족` };
  if (p.will && will) return { k: 0, label: `${race.label}: 임신은 본인이 원할 때만` };
  const k = Math.min(1, Number.isFinite(p.p) ? p.p : 1);
  return { k, label: k < 1 ? `${race.label}: 임신이 드문 편(×${k})` : "" };
}
// 성감대 기본값
export const raceZones = (race) => (race?.zones ?? []).map(([part, level]) => ({ part, level, note: `${race.label} 체질`, src: "race" }));
// 날씨 반응 한 줄(맞는 날씨일 때만)
const WX_KEY = { 맑음: "sun", 비: "rain", 폭우: "rain", 천둥: "rain", 눈: "snow", 바람: "wind" };
export function raceWeather(race, w, temp = null, night = false) {
  const x = race?.wx ?? {}, out = [];
  const k = WX_KEY[w]; if (k && x[k] && !(k === "sun" && night)) out.push(x[k]);
  if (Number.isFinite(temp) && temp >= 28 && x.hot) out.push(x.hot);
  if (Number.isFinite(temp) && temp <= 3 && x.cold) out.push(x.cold);
  if (race?.temp === "cold" && Number.isFinite(temp) && temp <= 5 && race.frame === "reptile" && !x.cold) out.push("추우면 몸이 둔해짐");
  return out;
}
// 상태창·위키에 쓰는 요약
export function raceView(f, doc, { iso = "", cal = null, hemi = "N" } = {}) {
  const r = raceFor(f, [doc?.title, ...(doc?.aliases ?? [])]);
  return { id: r.id, label: r.label, base: RACE_BY_ID[r.id]?.label ?? "", custom: r.custom, known: r.known, gen: r.gen ?? "", nsfw: r.nsfw ?? "", life: r.life ?? null, size: r.size ?? "", body: r.body ?? {},
    heat: iso ? heatOf(r, iso, { cal, hemi, seed: doc?.id }) : { on: false, label: "" }, cycle: r.cycle?.k ?? "menses" };
}
// 주입: 장면 인물 중 인간이 아닌 종족만(종족 체질 + 지금 발정·날씨 반응). 성격·태도는 넣지 않는다
export const RACE_TITLE = "[Races — body & biology only; never let it override the character's own personality]";
export function raceSection(f, present = [], { adult = true, iso = "", cal = null, hemi = "N", weather = "", temp = null, night = false } = {}) {
  const P = new Set(present.map(nk)), lines = [];
  for (const d of Object.values(f?.wiki?.documents ?? {})) {
    if (d?.type !== "Character" || ![d.title, ...(d.aliases ?? [])].some((n) => P.has(nk(n)))) continue;
    const r = raceFor(f, [d.title, ...(d.aliases ?? [])]); if (!r.known || r.id === "human") continue;
    const isAdult = adult && !!f?.nsfw?.[d.id] && Object.keys(f.nsfw[d.id].sexual ?? {}).length > 0;
    const h = isAdult && iso ? heatOf(r, iso, { cal, hemi, seed: d.id }) : null;
    const wx = raceWeather(r, weather, temp, night);
    lines.push(`- ${d.title} — ${r.custom || r.label}: ${r.gen ?? ""}${isAdult && r.nsfw ? ` / ${r.nsfw}` : ""}${h?.label ? ` / 지금: ${h.label}` : ""}${wx.length ? ` / 날씨: ${wx.join(", ")}` : ""}`.slice(0, 420));
  }
  return lines.length ? `${RACE_TITLE}\n${lines.join("\n")}` : "";
}
