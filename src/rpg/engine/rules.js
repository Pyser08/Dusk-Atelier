// Dusk Saga 엔진 — 기본 표·숫자·난수 (순수 함수, DOM·api 없음)


export const STATS = ['hp', 'str', 'mag', 'skl', 'spd', 'lck', 'def', 'res'];
export const SL = { hp: 'HP', str: '힘', mag: '마력', skl: '기술', spd: '속도', lck: '행운', def: '수비', res: '마방' };
export const GROW = { hp: 60, str: 40, mag: 20, skl: 40, spd: 40, lck: 35, def: 30, res: 25 };
export const MAXLV = 40, INF = 99;
// movement cost per movement type: [foot, armor, horse, fly]
export const TERRAIN = {
  '.': { n: '평지', c: [1, 1, 1, 1], avo: 0, def: 0 },
  'b': { n: '다리', c: [1, 1, 1, 1], avo: 0, def: 0 },
  'f': { n: '숲', c: [2, 2, 3, 1], avo: 20, def: 1 },
  'p': { n: '기둥', c: [2, 2, 3, 1], avo: 20, def: 1 },
  'm': { n: '산', c: [4, INF, INF, 1], avo: 30, def: 2 },
  'F': { n: '요새', c: [2, 2, 2, 1], avo: 20, def: 2, heal: 20 },
  'T': { n: '옥좌', c: [1, 1, 1, 1], avo: 30, def: 3, heal: 10 },
  'w': { n: '물', c: [INF, INF, INF, 1], avo: 0, def: 0 },
  '#': { n: '벽', c: [INF, INF, INF, INF], avo: 0, def: 0 },
};
export const T0 = TERRAIN['.'];
export const MT = { foot: 0, armor: 1, horse: 2, fly: 3 };
export const MTL = { foot: '보병', armor: '중장', horse: '기마', fly: '비행' };
export const MOVE = { foot: 5, armor: 4, horse: 7, fly: 7 };
// weapon triangle: sword·tome > axe·bow > lance·dagger > sword·tome. Weapons never wear out; u = default uses for staves and items.
export const WT = {
  sword: { n: '검', beats: ['axe', 'bow'], r: [1, 1], u: 40 }, lance: { n: '창', beats: ['sword', 'tome'], r: [1, 1], u: 40 }, axe: { n: '도끼', beats: ['lance', 'dagger'], r: [1, 1], u: 40 },
  bow: { n: '활', beats: ['lance', 'dagger'], r: [2, 2], u: 40 }, tome: { n: '마도서', beats: ['axe', 'bow'], r: [1, 2], u: 35 }, dagger: { n: '암기', beats: ['sword', 'tome'], r: [1, 2], u: 40 },
  staff: { n: '지팡이', r: [1, 1], u: 20 }, claw: { n: '건틀릿', r: [1, 1], u: 0 }, item: { n: '도구', r: [0, 0], u: 3 },
};
export const arm = w => !!w && w.type !== 'staff' && w.type !== 'item';
// the armory: gear named here can be handed out by name alone
export const G = (type, mt, hit, max, x) => Object.assign({ type, mt, hit, max }, x);
export const CAT = {
  '청동의 검': G('sword', 3, 100, 50), '철의 검': G('sword', 5, 95, 40), '강철의 검': G('sword', 8, 90, 35), '은의 검': G('sword', 11, 100, 30), '쌍격의 검': G('sword', 9, 80, 30, { brave: true }), '절명검': G('sword', 9, 90, 30, { crit: 30 }), '파갑검': G('sword', 8, 80, 25, { eff: ['armor'] }), '레이피어': G('sword', 5, 90, 35, { crit: 10, eff: ['armor', 'horse'] }),
  '청동의 창': G('lance', 3, 90, 50), '철의 창': G('lance', 6, 85, 40), '강철의 창': G('lance', 9, 80, 35), '은의 창': G('lance', 13, 90, 30), '쌍격의 창': G('lance', 10, 75, 30, { brave: true }), '절명창': G('lance', 10, 85, 30, { crit: 30 }), '투창': G('lance', 4, 70, 25, { rmin: 1, rmax: 2 }), '기병 사냥창': G('lance', 9, 75, 25, { eff: ['horse'] }),
  '청동의 도끼': G('axe', 4, 80, 50), '철의 도끼': G('axe', 7, 75, 40), '강철의 도끼': G('axe', 11, 70, 35), '은의 도끼': G('axe', 15, 80, 30), '쌍격의 도끼': G('axe', 12, 65, 30, { brave: true }), '절명도끼': G('axe', 12, 75, 30, { crit: 30 }), '손도끼': G('axe', 5, 65, 25, { rmin: 1, rmax: 2 }), '해머': G('axe', 10, 60, 25, { eff: ['armor'] }),
  '청동의 활': G('bow', 3, 90, 50), '철의 활': G('bow', 6, 85, 40), '강철의 활': G('bow', 9, 80, 35), '은의 활': G('bow', 13, 85, 30), '쌍격의 활': G('bow', 10, 75, 30, { brave: true }), '절명궁': G('bow', 9, 85, 30, { crit: 30 }), '장궁': G('bow', 8, 70, 20, { rmin: 2, rmax: 3 }),
  '불씨의 서': G('tome', 4, 90, 40), '화염의 서': G('tome', 7, 85, 35), '겁화의 서': G('tome', 12, 80, 20), '번개의 서': G('tome', 5, 80, 40, { crit: 5 }), '뇌격의 서': G('tome', 8, 75, 35, { crit: 10 }), '천뢰의 서': G('tome', 13, 70, 20, { crit: 10 }), '바람의 서': G('tome', 3, 95, 40, { eff: ['fly'] }), '질풍의 서': G('tome', 6, 90, 35, { eff: ['fly'] }), '흡혈의 서': G('tome', 7, 75, 20, { drain: 50 }),
  '철의 수리검': G('dagger', 4, 90, 40), '강철의 수리검': G('dagger', 6, 85, 35), '은의 수리검': G('dagger', 9, 90, 30),
  '치유의 지팡이': G('staff', 10, 100, 30), '회복의 지팡이': G('staff', 20, 100, 15), '소생의 지팡이': G('staff', 40, 100, 8), '원격 치유의 지팡이': G('staff', 8, 100, 10, { rmin: 1, rmax: 5 }),
  '철의 건틀릿': G('claw', 4, 90, 0), '강철의 건틀릿': G('claw', 6, 85, 0), '은의 건틀릿': G('claw', 9, 90, 0), '불꽃 건틀릿': G('claw', 6, 80, 0, { rmin: 1, rmax: 2, magic: true }),
  '권총': G('claw', 4, 85, 0, { rmin: 1, rmax: 2 }), '산탄총': G('claw', 8, 70, 0, { rmin: 1, rmax: 2 }), '소총': G('claw', 6, 85, 0, { rmin: 1, rmax: 3 }), '저격총': G('claw', 9, 90, 0, { rmin: 2, rmax: 4 }), '레이저 건': G('claw', 6, 85, 0, { rmin: 1, rmax: 2, magic: true }),
  '목검': G('sword', 2, 100, 60), '곡도': G('sword', 6, 90, 35, { crit: 10 }), '대검': G('sword', 12, 70, 30), '쌍검': G('sword', 6, 85, 30, { brave: true }), '성검': G('sword', 11, 90, 25, { eff: ['undead', 'demon'] }), '용 사냥 검': G('sword', 9, 80, 25, { eff: ['dragon'] }), '마력검': G('sword', 8, 85, 25, { magic: true, rmin: 1, rmax: 2 }), '흡혈검': G('sword', 8, 85, 25, { drain: 40 }),
  '죽창': G('lance', 3, 85, 50), '미늘창': G('lance', 10, 75, 30, { eff: ['armor'] }), '삼지창': G('lance', 8, 85, 30, { crit: 15 }), '돌격창': G('lance', 12, 70, 25), '성창': G('lance', 11, 85, 25, { eff: ['undead', 'demon'] }), '용 사냥 창': G('lance', 10, 75, 25, { eff: ['dragon'] }), '번개창': G('lance', 8, 80, 25, { magic: true, rmin: 1, rmax: 2 }),
  '벌목 도끼': G('axe', 6, 75, 50), '전투 망치': G('axe', 9, 70, 30, { eff: ['armor', 'machine'] }), '쌍날 도끼': G('axe', 13, 65, 30), '짐승 사냥 도끼': G('axe', 10, 70, 25, { eff: ['beast'] }), '처형 도끼': G('axe', 14, 60, 25, { crit: 20 }), '지진 도끼': G('axe', 9, 70, 25, { magic: true }),
  '사냥활': G('bow', 4, 90, 50, { eff: ['beast'] }), '단궁': G('bow', 5, 95, 35, { rmin: 1, rmax: 2 }), '석궁': G('bow', 9, 85, 30), '저격궁': G('bow', 10, 90, 25, { rmin: 2, rmax: 4 }), '성궁': G('bow', 10, 85, 25, { eff: ['undead', 'demon'] }), '연발 석궁': G('bow', 6, 75, 25, { brave: true }),
  '냉기의 서': G('tome', 5, 90, 40), '빙결의 서': G('tome', 9, 80, 30), '대지의 서': G('tome', 8, 80, 30, { eff: ['machine', 'armor'] }), '빛의 서': G('tome', 6, 95, 35, { eff: ['undead', 'demon'] }), '심판의 서': G('tome', 12, 80, 20, { eff: ['undead', 'demon'] }), '어둠의 서': G('tome', 9, 75, 30, { crit: 15 }), '독무의 서': G('tome', 7, 90, 30), '유성의 서': G('tome', 8, 65, 15, { rmin: 2, rmax: 4 }),
  '투척 단검': G('dagger', 4, 90, 40), '독침': G('dagger', 5, 95, 30), '암살 단검': G('dagger', 6, 90, 30, { crit: 30, rmin: 1, rmax: 1 }), '은빛 부채': G('dagger', 6, 95, 30), '쌍단검': G('dagger', 5, 85, 30, { brave: true, rmin: 1, rmax: 1 }),
  '짐승 발톱': G('claw', 6, 90, 0, { crit: 10 }), '강철 너클': G('claw', 7, 85, 0), '용의 송곳니': G('claw', 11, 80, 0), '기관단총': G('claw', 5, 75, 0, { rmin: 1, rmax: 2, brave: true, gun: 'auto' }), '리볼버': G('claw', 7, 80, 0, { rmin: 1, rmax: 2, crit: 15, gun: 'pistol' }), '머스킷': G('claw', 9, 70, 0, { rmin: 1, rmax: 3, gun: 'rifle' }),
  '구호의 지팡이': G('staff', 15, 100, 20), '대지의 지팡이': G('staff', 12, 100, 15, { rmin: 1, rmax: 2 }),
  '붕대': G('item', 6, 0, 5), '고급 상처약': G('item', 20, 0, 3), '비상식량': G('item', 8, 0, 4),
  '상처약': G('item', 10, 0, 3), '특효약': G('item', 99, 0, 3),
};
export const CONDS = { always: '항상', initiating: '공격 시', defending: '방어 시', hp_below_half: 'HP 절반 이하', hp_full: 'HP 최대', adjacent_ally: '아군 인접', alone: '주변 2칸에 아군 없음', on_cover: '엄폐 지형 위' };
export const OBJ = { rout: '적 전멸', boss: '보스 격파', survive: '생존', seize: '옥좌 제압' };
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const SIDE = { ally: 0, friend: 0, enemy: 1, third: 2 }, TN = { ally: '아군', friend: '우군', enemy: '적', third: '제3세력' };
export const foe = (a, b) => SIDE[a.team] !== SIDE[b.team];
export const K = (x, y) => y * 64 + x, unK = k => [k % 64, Math.floor(k / 64)];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const int = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? clamp(v, lo, hi) : d; };
export const txt = (v, max, d) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : d);
export const idOf = (v, d) => { v = String(v == null ? '' : v).trim().replace(/[^\w\-가-힣]/g, '_').slice(0, 40); return v || d; };
export const copy = o => JSON.parse(JSON.stringify(o));
export const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export function rng(S) { let t = (S.seed = (S.seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
export const roll = S => Math.floor(rng(S) * 100);
export function fresh() { return { v: 3, seed: (Date.now() & 0x7fffffff) || 1, defs: {}, skills: {}, battle: null, log: [], seq: 0, sent: 0, flat: false, zoom: 1, autoEnd: true }; }
export function log(S, text, k) { S.seq++; S.log.push(k ? { n: S.seq, text, k } : { n: S.seq, text }); if (S.log.length > 300) S.log.splice(0, S.log.length - 300); }
export const utags = d => [d.mtype].concat(d.tags || []);
// ── Cover rules (option S.xcom): cover, flanking, overwatch, line of sight, and firearms by kind ──
export const GUNS = {
  pistol: { n: '권총', r: [1, 3], mag: 6, tip: '' }, shotgun: { n: '산탄총', r: [1, 3], mag: 4, tip: '가까울수록 강함' }, rifle: { n: '소총', r: [1, 4], mag: 4, tip: '인접 사격 명중 −10' },
  sniper: { n: '저격총', r: [2, 6], mag: 3, tip: '이동 후 사격 불가 · 필살 +10' }, auto: { n: '기관총', r: [1, 3], mag: 6, tip: '2연사 · 명중 −10' },
};
export function gunOf(w) {
  if (!w || w.type !== 'claw') return null; if (GUNS[w.gun]) return w.gun; const n = w.name || '';
  if (/저격|스나이퍼/.test(n)) return 'sniper'; if (/산탄|샷건/.test(n)) return 'shotgun'; if (/기관|머신|연발|개틀링/.test(n)) return 'auto'; if (/권총|리볼버|피스톨|핸드건/.test(n)) return 'pistol'; if (/소총|라이플|머스킷|카빈/.test(n)) return 'rifle';
  return w.rmax < 2 ? null : w.rmin >= 2 ? 'sniper' : w.rmax >= 3 ? 'rifle' : 'pistol';
}
export const COVER = { '#': 40, p: 20, m: 20, F: 20 };
export const objText = B => OBJ[B.obj.type] + (B.obj.turns ? ' ' + B.obj.turns + '턴' : '');
