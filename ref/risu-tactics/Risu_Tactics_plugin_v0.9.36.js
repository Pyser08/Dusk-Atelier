//@name risu_tactics
//@display-name Risu Tactics
//@api 3.0
//@version 0.9.36

// ───────────────────────── Engine: pure rules, no DOM, no Risu API ─────────────────────────
const RT = (() => {
  const STATS = ['hp', 'str', 'mag', 'skl', 'spd', 'lck', 'def', 'res'];
  const SL = { hp: 'HP', str: '힘', mag: '마력', skl: '기술', spd: '속도', lck: '행운', def: '수비', res: '마방' };
  const GROW = { hp: 60, str: 40, mag: 20, skl: 40, spd: 40, lck: 35, def: 30, res: 25 };
  const MAXLV = 40, INF = 99;
  // movement cost per movement type: [foot, armor, horse, fly]
  const TERRAIN = {
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
  const T0 = TERRAIN['.'];
  const MT = { foot: 0, armor: 1, horse: 2, fly: 3 };
  const MTL = { foot: '보병', armor: '중장', horse: '기마', fly: '비행' };
  const MOVE = { foot: 5, armor: 4, horse: 7, fly: 7 };
  // weapon triangle after Fates: sword·tome > axe·bow > lance·dagger > sword·tome. Weapons never wear out; u = default uses for staves and items.
  const WT = {
    sword: { n: '검', beats: ['axe', 'bow'], r: [1, 1], u: 40 }, lance: { n: '창', beats: ['sword', 'tome'], r: [1, 1], u: 40 }, axe: { n: '도끼', beats: ['lance', 'dagger'], r: [1, 1], u: 40 },
    bow: { n: '활', beats: ['lance', 'dagger'], r: [2, 2], u: 40 }, tome: { n: '마도서', beats: ['axe', 'bow'], r: [1, 2], u: 35 }, dagger: { n: '암기', beats: ['sword', 'tome'], r: [1, 2], u: 40 },
    staff: { n: '지팡이', r: [1, 1], u: 20 }, claw: { n: '건틀릿', r: [1, 1], u: 0 }, item: { n: '도구', r: [0, 0], u: 3 },
  };
  const arm = w => !!w && w.type !== 'staff' && w.type !== 'item';
  // the armory: gear named here can be handed out by name alone
  const G = (type, mt, hit, max, x) => Object.assign({ type, mt, hit, max }, x);
  const CAT = {
    '청동의 검': G('sword', 3, 100, 50), '철의 검': G('sword', 5, 95, 40), '강철의 검': G('sword', 8, 90, 35), '은의 검': G('sword', 11, 100, 30), '용사의 검': G('sword', 9, 80, 30, { brave: true }), '킬소드': G('sword', 9, 90, 30, { crit: 30 }), '아머킬러': G('sword', 8, 80, 25, { eff: ['armor'] }), '레이피어': G('sword', 5, 90, 35, { crit: 10, eff: ['armor', 'horse'] }),
    '청동의 창': G('lance', 3, 90, 50), '철의 창': G('lance', 6, 85, 40), '강철의 창': G('lance', 9, 80, 35), '은의 창': G('lance', 13, 90, 30), '용사의 창': G('lance', 10, 75, 30, { brave: true }), '킬러랜스': G('lance', 10, 85, 30, { crit: 30 }), '투창': G('lance', 4, 70, 25, { rmin: 1, rmax: 2 }), '나이트킬러': G('lance', 9, 75, 25, { eff: ['horse'] }),
    '청동의 도끼': G('axe', 4, 80, 50), '철의 도끼': G('axe', 7, 75, 40), '강철의 도끼': G('axe', 11, 70, 35), '은의 도끼': G('axe', 15, 80, 30), '용사의 도끼': G('axe', 12, 65, 30, { brave: true }), '킬러액스': G('axe', 12, 75, 30, { crit: 30 }), '손도끼': G('axe', 5, 65, 25, { rmin: 1, rmax: 2 }), '해머': G('axe', 10, 60, 25, { eff: ['armor'] }),
    '청동의 활': G('bow', 3, 90, 50), '철의 활': G('bow', 6, 85, 40), '강철의 활': G('bow', 9, 80, 35), '은의 활': G('bow', 13, 85, 30), '용사의 활': G('bow', 10, 75, 30, { brave: true }), '킬러보우': G('bow', 9, 85, 30, { crit: 30 }), '장궁': G('bow', 8, 70, 20, { rmin: 2, rmax: 3 }),
    '파이어': G('tome', 4, 90, 40), '엘파이어': G('tome', 7, 85, 35), '볼가논': G('tome', 12, 80, 20), '선더': G('tome', 5, 80, 40, { crit: 5 }), '엘선더': G('tome', 8, 75, 35, { crit: 10 }), '토론': G('tome', 13, 70, 20, { crit: 10 }), '윈드': G('tome', 3, 95, 40, { eff: ['fly'] }), '엘윈드': G('tome', 6, 90, 35, { eff: ['fly'] }), '리자이어': G('tome', 7, 75, 20, { drain: 50 }),
    '철의 수리검': G('dagger', 4, 90, 40), '강철의 수리검': G('dagger', 6, 85, 35), '은의 수리검': G('dagger', 9, 90, 30),
    '라이브': G('staff', 10, 100, 30), '리라이브': G('staff', 20, 100, 15), '리커버': G('staff', 40, 100, 8), '리브로': G('staff', 8, 100, 10, { rmin: 1, rmax: 5 }),
    '철의 건틀릿': G('claw', 4, 90, 0), '강철의 건틀릿': G('claw', 6, 85, 0), '은의 건틀릿': G('claw', 9, 90, 0), '샐러맨더': G('claw', 6, 80, 0, { rmin: 1, rmax: 2, magic: true }),
    '권총': G('claw', 4, 85, 0, { rmin: 1, rmax: 2 }), '산탄총': G('claw', 8, 70, 0, { rmin: 1, rmax: 2 }), '소총': G('claw', 6, 85, 0, { rmin: 1, rmax: 3 }), '저격총': G('claw', 9, 90, 0, { rmin: 2, rmax: 4 }), '레이저 건': G('claw', 6, 85, 0, { rmin: 1, rmax: 2, magic: true }),
    '상처약': G('item', 10, 0, 3), '특효약': G('item', 99, 0, 3),
  };
  const CONDS = { always: '항상', initiating: '공격 시', defending: '방어 시', hp_below_half: 'HP 절반 이하', hp_full: 'HP 최대', adjacent_ally: '아군 인접', alone: '주변 2칸에 아군 없음', on_cover: '엄폐 지형 위' };
  const OBJ = { rout: '적 전멸', boss: '보스 격파', survive: '생존', seize: '옥좌 제압' };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const SIDE = { ally: 0, friend: 0, enemy: 1, third: 2 }, TN = { ally: '아군', friend: '우군', enemy: '적', third: '제3세력' };
  const foe = (a, b) => SIDE[a.team] !== SIDE[b.team];
  const K = (x, y) => y * 64 + x, unK = k => [k % 64, Math.floor(k / 64)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const int = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? clamp(v, lo, hi) : d; };
  const txt = (v, max, d) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : d);
  const idOf = (v, d) => { v = String(v == null ? '' : v).trim().replace(/[^\w\-가-힣]/g, '_').slice(0, 40); return v || d; };
  const copy = o => JSON.parse(JSON.stringify(o));
  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  function rng(S) { let t = (S.seed = (S.seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const roll = S => Math.floor(rng(S) * 100);

  function fresh() { return { v: 2, seed: (Date.now() & 0x7fffffff) || 1, defs: {}, skills: {}, battle: null, log: [], seq: 0, sent: 0, flat: false, zoom: 1, autoEnd: true }; }
  function log(S, text, k) { S.seq++; S.log.push(k ? { n: S.seq, text, k } : { n: S.seq, text }); if (S.log.length > 300) S.log.splice(0, S.log.length - 300); }

  // ── normalizers: clamp instead of reject, so one odd number from the model does not kill a battle ──
  function normSkill(o, i) {
    o = o && typeof o === 'object' ? o : {};
    const type = ['art', 'passive', 'proc'].includes(o.type) ? o.type : 'passive';
    const m = o.mods && typeof o.mods === 'object' ? o.mods : {}, f = o.flags && typeof o.flags === 'object' ? o.flags : {};
    const mods = {}; for (const k of ['atk', 'def', 'res', 'spd']) { const v = int(m[k], -20, 20, 0); if (v) mods[k] = v; }
    for (const k of ['hit', 'avo', 'crit']) { const v = int(m[k], -50, 50, 0); if (v) mods[k] = v; }
    const flags = {};
    if (f.brave) flags.brave = true; if (f.noCounter) flags.noCounter = true; if (f.sure) flags.sure = true; if (f.magic) flags.magic = true;
    for (const [k, hi] of [['drain', 100], ['pierce', 100], ['block', 90], ['regen', 20]]) { const v = int(f[k], 0, hi, 0); if (v) flags[k] = v; }
    const mult = Number(f.mult); if (Number.isFinite(mult) && mult > 1) flags.mult = clamp(Math.round(mult * 10) / 10, 1.1, 3);
    const s = { id: idOf(o.id, 'skill_' + i), name: txt(o.name, 30, '이름 없는 기술'), desc: txt(o.desc, 160, ''), type, cond: CONDS[o.cond] ? o.cond : 'always', mods, flags };
    if (type === 'proc') s.rate = STATS.includes(o.rate) ? o.rate : int(o.rate, 1, 100, 25);
    if (type === 'art') { s.cd = int(o.cd, 0, 9, 2); if (Array.isArray(o.range)) { const a = int(o.range[0], 1, 3, 1); s.range = [a, int(o.range[1], a, 4, a)]; } }
    s.tier = ['common', 'faction', 'own'].includes(o.tier) ? o.tier : (txt(o.faction, 20, '') ? 'faction' : 'own');
    if (s.tier === 'faction') s.faction = txt(o.faction, 20, '세력');
    return s;
  }
  // the common library every save starts with
  const BASE_VER = 2;
  const BASE_SKILLS = [
    { id: 'luna', name: '월광', desc: '기술% 확률로 적의 수비·마방 절반 무시', type: 'proc', rate: 'skl', flags: { pierce: 50 } },
    { id: 'sol', name: '태양', desc: '기술% 확률로 준 피해의 절반만큼 회복', type: 'proc', rate: 'skl', flags: { drain: 50 } },
    { id: 'pavise', name: '큰 방패', desc: '수비% 확률로 받는 피해 반감', type: 'proc', rate: 'def', flags: { block: 50 } },
    { id: 'wrath', name: '분노', desc: 'HP 절반 이하에서 필살 +20', type: 'passive', cond: 'hp_below_half', mods: { crit: 20 } },
    { id: 'deathblow', name: '귀신의 일격', desc: '먼저 공격할 때 공격 +3', type: 'passive', cond: 'initiating', mods: { atk: 3 } },
    { id: 'armorblow', name: '금강의 일격', desc: '먼저 공격할 때 수비 +4', type: 'passive', cond: 'initiating', mods: { def: 4 } },
    { id: 'dartblow', name: '비연의 일격', desc: '먼저 공격할 때 속도 +4', type: 'passive', cond: 'initiating', mods: { spd: 4 } },
    { id: 'guard', name: '수비 태세', desc: '공격받을 때 수비·마방 +3', type: 'passive', cond: 'defending', mods: { def: 3, res: 3 } },
    { id: 'bond', name: '연계', desc: '아군과 인접하면 명중·회피 +10', type: 'passive', cond: 'adjacent_ally', mods: { hit: 10, avo: 10 } },
    { id: 'renewal', name: '재생', desc: '턴 시작 시 HP 5 회복', type: 'passive', flags: { regen: 5 } },
    { id: 'flurry', name: '연격', desc: '위력을 낮춰 두 번 공격', type: 'art', cd: 3, mods: { atk: -2 }, flags: { brave: true } },
    { id: 'focus', name: '집중', desc: '숨을 고르고 급소를 노린다', type: 'art', cd: 2, mods: { hit: 25, crit: 15 } },
    { id: 'wardblow', name: '명경의 일격', desc: '먼저 공격할 때 마방 +4', type: 'passive', cond: 'initiating', mods: { res: 4 } },
    { id: 'str2', name: '힘+2', desc: '공격 +2', type: 'passive', mods: { atk: 2 } },
    { id: 'def2', name: '수비+2', desc: '수비 +2', type: 'passive', mods: { def: 2 } },
    { id: 'spd2', name: '속도+2', desc: '속도 +2', type: 'passive', mods: { spd: 2 } },
    { id: 'hit15', name: '명중+15', desc: '명중 +15', type: 'passive', mods: { hit: 15 } },
    { id: 'avo10', name: '회피+10', desc: '회피 +10', type: 'passive', mods: { avo: 10 } },
    { id: 'laststand', name: '배수진', desc: 'HP 절반 이하에서 공격 +4', type: 'passive', cond: 'hp_below_half', mods: { atk: 4 } },
    { id: 'fullform', name: '만전', desc: 'HP가 가득일 때 공격 +2, 명중 +10', type: 'passive', cond: 'hp_full', mods: { atk: 2, hit: 10 } },
    { id: 'riposte', name: '맞받아치기', desc: '공격받을 때 공격 +3', type: 'passive', cond: 'defending', mods: { atk: 3 } },
    { id: 'terrain', name: '지형 활용', desc: '엄폐 지형 위에서 회피 +15, 수비 +1', type: 'passive', cond: 'on_cover', mods: { avo: 15, def: 1 } },
    { id: 'lonewolf', name: '독불장군', desc: '주변 2칸에 아군이 없으면 공격 +2, 회피 +10', type: 'passive', cond: 'alone', mods: { atk: 2, avo: 10 } },
    { id: 'smash', name: '강타', desc: '명중을 버리고 힘껏 내리친다', type: 'art', cd: 2, mods: { atk: 5, hit: -15 } },
    { id: 'breaker', name: '파갑', desc: '수비·마방의 60%를 무시하고 찌른다', type: 'art', cd: 3, flags: { pierce: 60 } },
    { id: 'surehit', name: '필중의 일격', desc: '반드시 맞는 일격', type: 'art', cd: 3, flags: { sure: true } },
    { id: 'ambush', name: '기습', desc: '반격받지 않는 공격', type: 'art', cd: 3, mods: { atk: -1 }, flags: { noCounter: true } },
    { id: 'spellblade', name: '마법검', desc: '무기에 마력을 실어 마방으로 계산', type: 'art', cd: 2, flags: { magic: true } },
  ];
  function ensureBase(S) { if (S.baseVer === BASE_VER) return; for (const o of BASE_SKILLS) { if (!S.skills[o.id]) S.skills[o.id] = normSkill(Object.assign({ tier: 'common' }, o), 0); else if (!S.skills[o.id].tier) S.skills[o.id].tier = 'common'; } S.baseVer = BASE_VER; }
  // a skill a model defines is never "common": it is a faction skill or somebody's own
  function normWeapon(o) {
    o = o && typeof o === 'object' ? o : {};
    const c = CAT[txt(o.name, 30, '')]; if (c) { const m = Object.assign({}, c); for (const k in o) if (o[k] != null && o[k] !== '') m[k] = o[k]; o = m; }
    const type = WT[o.type] ? o.type : 'sword', r = WT[type].r;
    const rmin = int(o.rmin, 1, 3, r[0]);
    const w = { name: txt(o.name, 30, WT[type].n), type, mt: int(o.mt, 0, 99, 5), hit: int(o.hit, 30, 150, 85), crit: int(o.crit, 0, 60, 0), rmin, rmax: int(o.rmax, rmin, 5, Math.max(rmin, r[1])) };
    if (type !== 'item' && type !== 'staff') w.mt = Math.min(w.mt, 30);
    if (type === 'item') { w.rmin = w.rmax = 0; w.hit = 0; w.crit = 0; }
    // only staves and items have uses
    w.max = arm(w) ? 0 : int(o.max, 0, 99, int(o.uses, 1, 99, WT[type].u)); w.uses = w.max ? int(o.uses, 1, w.max, w.max) : 0;
    if (o.brave === true || o.brave === 'true') w.brave = true; if (type === 'claw' && GUNS[o.gun]) w.gun = o.gun; if (o.magic === true || o.magic === 'true') w.magic = true; const dr = int(o.drain, 0, 100, 0); if (dr) w.drain = dr;
    if (Array.isArray(o.eff)) { const e = o.eff.filter(t => typeof t === 'string').map(t => t.slice(0, 16)).slice(0, 4); if (e.length) w.eff = e; }
    return w;
  }
  // stat budget by level: about 4 points a level on top of a level-1 body, with some slack
  function fitLevel(u) {
    const keys = STATS.slice(1), cap = Math.round((46 + u.level * 4) * 1.15), sum = keys.reduce((a, k) => a + u.stats[k], 0);
    if (sum > cap) for (const k of keys) u.stats[k] = Math.floor(u.stats[k] * cap / sum);
    u.stats.hp = Math.min(u.stats.hp, 30 + u.level * 2);
    for (const w of u.weapons) tameWeapon(w);
    return u;
  }
  function tameWeapon(w) { if (arm(w)) { w.mt = Math.min(w.mt, 20); w.crit = Math.min(w.crit, 50); w.hit = clamp(w.hit, 50, 120); } return w; }
  function tameSkill(s) {
    for (const k of ['atk', 'def', 'res', 'spd']) if (s.mods[k]) s.mods[k] = clamp(s.mods[k], -8, 8);
    for (const k of ['hit', 'avo', 'crit']) if (s.mods[k]) s.mods[k] = clamp(s.mods[k], -40, 40);
    const f = s.flags; if (f.mult) f.mult = Math.min(f.mult, 2.5); if (f.block) f.block = Math.min(f.block, 75); if (f.regen) f.regen = Math.min(f.regen, 10);
    if (s.type === 'proc' && typeof s.rate === 'number') s.rate = Math.min(s.rate, 60);
    return s;
  }
  const llmSkill = (o, i) => { const s = tameSkill(normSkill(o, i)); if (s.tier === 'common') s.tier = 'own'; return s; };
  // ready-made mobs: level-1 body, grown to the level asked for
  const M = (set, emoji, cls, mtype, st, weapons, x) => Object.assign({ set, emoji, cls, mtype, stats: { hp: st[0], str: st[1], mag: st[2], skl: st[3], spd: st[4], lck: st[5], def: st[6], res: st[7] }, weapons }, x);
  const PRE = {
    '고블린': M('판타지', '👺', '고블린', 'foot', [17, 5, 0, 5, 6, 2, 2, 0], [{ name: '청동의 검' }]),
    '고블린 궁수': M('판타지', '🏹', '고블린', 'foot', [15, 5, 0, 6, 6, 2, 1, 0], [{ name: '청동의 활' }]),
    '슬라임': M('판타지', '🟢', '슬라임', 'foot', [22, 4, 0, 2, 2, 0, 1, 6], [{ name: '몸통박치기', type: 'claw', mt: 3, hit: 85 }], { move: 4, skills: ['renewal'], growth: { hp: 90, str: 30, mag: 0, skl: 20, spd: 15, lck: 10, def: 25, res: 45 } }),
    '늑대': M('판타지', '🐺', '야수', 'foot', [17, 6, 0, 7, 10, 3, 2, 0], [{ name: '송곳니', type: 'claw', mt: 4, hit: 90 }], { move: 7, skills: ['bond'], tags: ['beast'] }),
    '스켈레톤': M('판타지', '💀', '언데드', 'foot', [19, 6, 0, 6, 5, 0, 4, 1], [{ name: '철의 검' }], { tags: ['undead'] }),
    '좀비': M('판타지', '🧟', '언데드', 'foot', [26, 7, 0, 3, 2, 0, 3, 0], [{ name: '썩은 손톱', type: 'claw', mt: 4, hit: 75 }], { move: 4, tags: ['undead'] }),
    '산적': M('판타지', '🪓', '산적', 'foot', [22, 7, 0, 4, 5, 1, 3, 0], [{ name: '철의 도끼' }]),
    '도적': M('판타지', '🗡️', '도적', 'foot', [18, 5, 0, 8, 10, 4, 2, 1], [{ name: '철의 수리검' }]),
    '오크': M('판타지', '👹', '오크', 'foot', [28, 9, 0, 4, 3, 1, 5, 0], [{ name: '철의 도끼' }], { skills: ['wrath'] }),
    '병사': M('판타지', '🔱', '창병', 'foot', [21, 6, 0, 6, 6, 2, 5, 1], [{ name: '철의 창' }]),
    '중장병': M('판타지', '🛡️', '중기사', 'armor', [25, 8, 0, 5, 3, 2, 9, 1], [{ name: '철의 창' }]),
    '기병': M('판타지', '🐎', '기병', 'horse', [22, 7, 0, 6, 7, 3, 5, 1], [{ name: '철의 검' }]),
    '암흑 마도사': M('판타지', '🔮', '마도사', 'foot', [17, 1, 7, 6, 6, 3, 2, 6], [{ name: '파이어' }]),
    '박쥐': M('판타지', '🦇', '마물', 'fly', [14, 4, 0, 6, 10, 3, 1, 2], [{ name: '흡혈', type: 'claw', mt: 2, hit: 85, drain: 50 }], { tags: ['beast'] }),
    '불량배': M('현대', '👊', '불량배', 'foot', [19, 6, 0, 5, 6, 2, 3, 0], [{ name: '쇠파이프', type: 'sword', mt: 4, hit: 85 }]),
    '칼잡이': M('현대', '🔪', '불량배', 'foot', [17, 5, 0, 8, 9, 3, 2, 0], [{ name: '나이프', type: 'dagger', mt: 3, hit: 90, rmin: 1, rmax: 1, crit: 5 }]),
    '조직원': M('현대', '🔫', '조직원', 'foot', [19, 6, 0, 7, 6, 2, 3, 1], [{ name: '권총' }]),
    '경비원': M('현대', '🦺', '경비원', 'foot', [23, 6, 0, 5, 4, 2, 6, 1], [{ name: '진압봉', type: 'lance', mt: 5, hit: 85 }], { skills: ['guard'] }),
    '무장 요원': M('현대', '🪖', '요원', 'foot', [22, 7, 0, 8, 7, 3, 5, 2], [{ name: '소총' }]),
    '저격수': M('현대', '🎯', '저격수', 'foot', [17, 7, 0, 10, 6, 3, 2, 1], [{ name: '저격총' }], { move: 4 }),
    '들개': M('현대', '🐕', '야수', 'foot', [15, 5, 0, 6, 9, 2, 1, 0], [{ name: '송곳니', type: 'claw', mt: 3, hit: 90 }], { move: 7, skills: ['bond'], tags: ['beast'] }),
    '드론': M('현대', '🛸', '기계', 'fly', [14, 5, 0, 7, 8, 0, 3, 3], [{ name: '레이저 건' }], { tags: ['machine'] }),
  };
  const UPG = { '청동의': ['철의', '강철의', '은의'], '철의': ['철의', '강철의', '은의'] };
  // a preset can be taken as it is, or with any part replaced: class, movement, gear, skills, single stats
  function presetUnit(name, level, o) {
    const p = PRE[name]; if (!p) return null; o = o || {}; level = int(level, 1, MAXLV, 1);
    const src = copy(p); delete src.set;
    // basic gear keeps pace: iron by level 6, steel by 14, silver by 24
    src.weapons = src.weapons.map(w => { const m = /^(청동의|철의) (.+)$/.exec(w.name), n = m && (level >= 24 ? UPG[m[1]][2] : level >= 14 ? UPG[m[1]][1] : level >= 6 ? UPG[m[1]][0] : m[1]) + ' ' + (m ? m[2] : ''); return m && CAT[n] ? { name: n } : w; });
    const over = {}; for (const k of ['cls', 'mtype', 'move', 'emoji', 'asset', 'tags', 'growth']) if (o[k] != null && o[k] !== '') over[k] = o[k];
    for (const k of ['weapons', 'skills']) if (Array.isArray(o[k]) && o[k].length) over[k] = o[k];
    const u = normUnit(Object.assign(src, over, { id: o.id || name, name: txt(o.name, 30, name), level }), 0);
    for (const k of STATS) u.stats[k] = Math.min(k === 'hp' ? 120 : 60, u.stats[k] + Math.round(u.growth[k] * (level - 1) / 100));
    if (o.stats && typeof o.stats === 'object') for (const k of STATS) if (o.stats[k] != null) u.stats[k] = int(o.stats[k], k === 'hp' ? 1 : 0, k === 'hp' ? 120 : 60, u.stats[k]);
    return fitLevel(u);
  }
  function growthFor(st) { const g = Object.assign({}, GROW); if (st.mag > st.str) { g.str = GROW.mag; g.mag = GROW.str; } return g; }
  function normUnit(o, i) {
    o = o && typeof o === 'object' ? o : {};
    const st = o.stats && typeof o.stats === 'object' ? o.stats : {}, mtype = MT[o.mtype] != null ? o.mtype : 'foot';
    const stats = { hp: int(st.hp, 1, 120, 20) }; for (const k of STATS.slice(1)) stats[k] = int(st[k], 0, 60, 4);
    const g0 = growthFor(stats), gi = o.growth && typeof o.growth === 'object' ? o.growth : {}, growth = {};
    for (const k of STATS) growth[k] = int(gi[k], 0, 150, g0[k]);
    const weapons = (Array.isArray(o.weapons) ? o.weapons : []).slice(0, 5).map(normWeapon);
    if (!weapons.length) weapons.push(normWeapon({ name: stats.mag > stats.str ? '파이어' : '철의 검', type: stats.mag > stats.str ? 'tome' : 'sword' }));
    const u = {
      id: idOf(o.id, 'unit_' + i), name: txt(o.name, 30, '이름 없음'), emoji: txt(o.emoji, 8, '🙂'), cls: txt(o.cls, 20, MTL[mtype]), mtype,
      move: int(o.move, 1, 10, MOVE[mtype]), level: int(o.level, 1, MAXLV, 1), exp: int(o.exp, 0, 99, 0), stats, growth, weapons,
      skills: (Array.isArray(o.skills) ? o.skills : []).filter(s => typeof s === 'string').map(s => idOf(s, '')).filter(Boolean).slice(0, 6),
      tags: (Array.isArray(o.tags) ? o.tags : []).filter(t => typeof t === 'string').map(t => t.slice(0, 16)).slice(0, 4),
      asset: txt(o.asset, 80, ''),
      history: (Array.isArray(o.history) ? o.history : []).filter(t => typeof t === 'string').map(t => t.slice(0, 120)).slice(-8),
    };
    if (typeof o.img === 'string' && /^(https?:|data:image\/)/.test(o.img)) u.img = o.img;
    if (o.ally) u.ally = true; if (o.ally && o.away) u.away = true;
    if (Array.isArray(o.later) && o.later.length) u.later = o.later.filter(s => typeof s === 'string').map(s => idOf(s, '')).filter(Boolean).slice(0, 12);
    return u;
  }
  const utags = d => [d.mtype].concat(d.tags || []);

  // ── board helpers ──
  const living = B => Object.values(B.units).filter(u => u.hp > 0);
  // units standing on the board; a rear partner (guard stance) shares its lead's tile and is not targetable
  const alive = B => living(B).filter(u => !u.rearOf);
  function syncRears(B) { for (const u of living(B)) if (u.rear && B.units[u.rear]) { B.units[u.rear].x = u.x; B.units[u.rear].y = u.y; } }
  // guard stance: the lead borrows a share of the rear partner's stats
  function pairBonus(S, u) {
    const o = {}; if (!u.rear || !S.battle.units[u.rear]) return o; const r = S.defs[S.battle.units[u.rear].ref].stats;
    for (const k of STATS.slice(1).sort((a, b) => r[b] - r[a]).slice(0, 3)) { const v = Math.min(4, Math.floor(r[k] / 5)); if (v) o[k] = v; }
    return o;
  }
  function est(S, u) { const d = S.defs[u.ref].stats; if (!u.rear) return d; const b = pairBonus(S, u), o = { hp: d.hp }; for (const k of STATS.slice(1)) o[k] = d[k] + (b[k] || 0); return o; }
  const terr = (B, x, y) => TERRAIN[(B.map[y] || '')[x]] || T0;
  const uterr = (S, u) => (S.defs[u.ref].mtype === 'fly' ? T0 : terr(S.battle, u.x, u.y));
  function occMap(B) { const m = new Map(); for (const u of alive(B)) m.set(K(u.x, u.y), u); return m; }
  const unitAt = (B, x, y) => alive(B).find(u => u.x === x && u.y === y) || null;
  function reach(S, u, o) {
    o = o || {}; const B = S.battle, d = S.defs[u.ref], mt = MT[d.mtype] || 0, max = o.unlimited ? 999 : d.move, occ = occMap(B);
    const R = new Map([[K(u.x, u.y), { c: 0, p: null }]]), q = [[0, u.x, u.y]];
    while (q.length) {
      let bi = 0; for (let i = 1; i < q.length; i++) if (q[i][0] < q[bi][0]) bi = i;
      const [c, x, y] = q.splice(bi, 1)[0]; if (c > R.get(K(x, y)).c) continue;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= B.w || ny >= B.h) continue;
        const tc = terr(B, nx, ny).c[mt], nc = c + tc; if (tc >= INF || nc > max) continue;
        const z = occ.get(K(nx, ny)); if (z && foe(z, u) && !o.ignoreUnits) continue;
        const cur = R.get(K(nx, ny)); if (!cur || nc < cur.c) { R.set(K(nx, ny), { c: nc, p: K(x, y) }); q.push([nc, nx, ny]); }
      }
    }
    return R;
  }
  function pathTo(R, key) { const p = []; while (key != null && R.has(key)) { const [x, y] = unK(key); p.unshift({ x, y }); key = R.get(key).p; } return p; }
  function stops(S, u, R) { const occ = occMap(S.battle); return [...R.keys()].filter(k => { const z = occ.get(k); return !z || z.id === u.id; }); }
  function ranges(S, d) { let lo = 9, hi = 0; for (const w of d.weapons) if (arm(w)) { const r = wr(S, w); lo = Math.min(lo, r[0]); hi = Math.max(hi, r[1]); } return hi ? [lo, hi] : null; }
  // every tile a unit could hit after moving (the red zone)
  function threat(S, u, R) {
    const B = S.battle, ws = S.defs[u.ref].weapons.filter(arm), out = new Set(); if (!ws.length) return out;
    for (const k of stops(S, u, R || reach(S, u))) {
      const [x, y] = unK(k), here = { x, y }, moved = x !== u.x || y !== u.y;
      for (const w of ws) {
        if (S.xcom && gunOf(w) === 'sniper' && moved) continue; const r = wr(S, w);
        for (let dy = -r[1]; dy <= r[1]; dy++) for (let dx = -r[1]; dx <= r[1]; dx++) {
          const m = Math.abs(dx) + Math.abs(dy), nx = x + dx, ny = y + dy; if (m < r[0] || m > r[1] || nx < 0 || ny < 0 || nx >= B.w || ny >= B.h || B.map[ny][nx] === '#' || out.has(K(nx, ny))) continue;
          if (!S.xcom || m < 2 || sees(B, here, { x: nx, y: ny })) out.add(K(nx, ny));
        }
      }
    }
    return out;
  }
  function danger(S, team) { const out = new Set(); for (const u of alive(S.battle)) if (team === 'enemy' ? SIDE[u.team] !== 0 : u.team === team) { const d = S.defs[u.ref]; const R = u.ai === 'guard' ? new Map([[K(u.x, u.y), { c: 0, p: null }]]) : reach(S, u); for (const k of threat(S, u, R)) out.add(k); } return out; }

  // ── XCOM rules (option S.xcom): cover, flanking, overwatch, line of sight, and firearms by kind ──
  const GUNS = {
    pistol: { n: '권총', r: [1, 3], mag: 6, tip: '' }, shotgun: { n: '산탄총', r: [1, 3], mag: 4, tip: '가까울수록 강함' }, rifle: { n: '소총', r: [1, 4], mag: 4, tip: '인접 사격 명중 −10' },
    sniper: { n: '저격총', r: [2, 6], mag: 3, tip: '이동 후 사격 불가 · 필살 +10' }, auto: { n: '기관총', r: [1, 3], mag: 6, tip: '2연사 · 명중 −10' },
  };
  function gunOf(w) {
    if (!w || w.type !== 'claw') return null; if (GUNS[w.gun]) return w.gun; const n = w.name || '';
    if (/저격|스나이퍼/.test(n)) return 'sniper'; if (/산탄|샷건/.test(n)) return 'shotgun'; if (/기관|머신|연발|개틀링/.test(n)) return 'auto'; if (/권총|리볼버|피스톨|핸드건/.test(n)) return 'pistol'; if (/소총|라이플|머스킷|카빈/.test(n)) return 'rifle';
    return w.rmax < 2 ? null : w.rmin >= 2 ? 'sniper' : w.rmax >= 3 ? 'rifle' : 'pistol';
  }
  const gun = (S, w) => (S.xcom ? gunOf(w) : null);
  const wr = (S, w) => { const g = gun(S, w); return g ? GUNS[g].r : [w.rmin, w.rmax]; };
  const ammo = (S, u, w) => { const g = gun(S, w), n = g && u && u.am ? u.am[w.name] : null; return g ? (n == null ? GUNS[g].mag : n) : INF; };
  function line(B, a, b) {
    let x = a.x, y = a.y; const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y), sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1; let err = dx - dy;
    while (x !== b.x || y !== b.y) { const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } if ((x !== b.x || y !== b.y) && (B.map[y] || '')[x] === '#') return false; }
    return true;
  }
  const sees = (B, a, b) => line(B, a, b) || line(B, b, a);
  // may this weapon be used on that target from where the unit stands
  function canShoot(S, u, w, z, moved) {
    const ds = dist(u, z), r = wr(S, w); return ds >= r[0] && ds <= r[1] && fireOk(S, u, w, z, moved);
  }
  // everything but range: rounds in the magazine, a sniper rifle that has not moved, no wall in the way
  function fireOk(S, u, w, z, moved) {
    if (!S.xcom) return true; const g = gunOf(w); if (g && (ammo(S, u, w) <= 0 || (g === 'sniper' && moved))) return false;
    return dist(u, z) < 2 || sees(S.battle, u, z);
  }
  const COVER = { '#': 40, p: 20, m: 20, F: 20 };
  // cover is whatever stands on the tile next to the target on the shooter's side
  function coverFrom(S, D, A) {
    const B = S.battle, at = (x, y) => (x < 0 || y < 0 || x >= B.w || y >= B.h ? 0 : COVER[B.map[y][x]] || 0); if (S.defs[D.ref].mtype === 'fly') return { v: 0 };
    const sx = Math.sign(A.x - D.x), sy = Math.sign(A.y - D.y), v = Math.max(sx ? at(D.x + sx, D.y) : 0, sy ? at(D.x, D.y + sy) : 0);
    return { v, flank: !v && DIRS.some(([dx, dy]) => at(D.x + dx, D.y + dy)) };
  }
  const coverAt = (S, u, foes) => (foes.length ? foes.reduce((n, f) => n + coverFrom(S, u, f).v, 0) / foes.length : 0);
  const canWatch = (S, u, w, moved) => !!S.xcom && arm(w) && wr(S, w)[1] >= 2 && ammo(S, u, w) > 0 && !(gunOf(w) === 'sniper' && moved);
  function actWatch(S, u) { const mv = went(S, u); u.ow = true; u.done = true; log(S, S.defs[u.ref].name + ': ' + (mv ? mv + ', ' : '') + '경계', 'ow'); }
  function actReload(S, u, i) { const d = S.defs[u.ref], w = d.weapons[i], mv = went(S, u); if (u.am) delete u.am[w.name]; u.done = true; log(S, d.name + ': ' + (mv ? mv + ', ' : '') + w.name + ' 재장전'); }
  // reaction fire: one shot at −15, no critical, nothing comes back
  function snap(S, z, u, ev) {
    const f = side(S, z, u, true, null, 'ow'), dz = S.defs[z.ref], du = S.defs[u.ref], h0 = u.hp; f.hit = Math.max(0, f.hit - 15); f.crit = 0; f.hits = 1;
    ev.push({ t: 'combat', a: z.id, d: u.id, art: '경계 사격' }); const n = ev.length; strike(S, z, u, f, ev); const s = ev[n];
    log(S, dz.name + ' (' + f.w.name + ') 경계 사격 → ' + du.name + ': ' + (s.guard ? '막힘' : s.miss ? '빗나감' : (h0 - u.hp) + ' 피해' + hpOf(S, u)) + (f.cover ? ' (' + f.cover + ')' : '') + (u.hp <= 0 ? ' — ' + du.name + ' 격파' : ''));
    if (u.hp <= 0) fall(S, u, ev);
    if (z.team === 'ally') grantExp(S, dz, expFor(S, z, u, u.hp <= 0, h0 - u.hp), ev, z.id); else if (z.team === 'friend') S.battle.pool = (S.battle.pool || 0) + expFor(S, z, u, u.hp <= 0, h0 - u.hp);
    outcome(S, ev);
  }
  // walk a path; enemies on overwatch fire as the unit comes into their sights. false when it fell on the way
  function travel(S, u, path, ev) {
    const B = S.battle, occ = occMap(B); let from = 0;
    if (S.xcom) for (let i = 1; i < path.length && u.hp > 0; i++) {
      const o = occ.get(K(path[i].x, path[i].y)); if (o && o.id !== u.id) continue; u.x = path[i].x; u.y = path[i].y;
      for (const z of alive(B)) {
        if (!z.ow || !foe(z, u) || z.hp <= 0) continue; const w = S.defs[z.ref].weapons[z.wi]; if (!arm(w) || dist(z, u) < 2 || !canShoot(S, z, w, u, false)) continue;
        if (i > from) { ev.push({ t: 'move', id: u.id, path: path.slice(from, i + 1) }); from = i; }
        z.ow = false; syncRears(B); snap(S, z, u, ev); if (u.hp <= 0 || B.status !== 'active') break;
      }
    }
    if (u.hp <= 0) return false;
    const last = path[path.length - 1]; u.x = last.x; u.y = last.y; syncRears(B); if (path.length - 1 > from) ev.push({ t: 'move', id: u.id, path: path.slice(from) });
    return true;
  }

  // ── combat ──
  function cond(S, u, c, ctx) {
    const B = S.battle, d = S.defs[u.ref];
    const mates = () => alive(B).filter(z => !foe(z, u) && z.id !== u.id);
    switch (c) {
      case 'initiating': return ctx.init === true; case 'defending': return ctx.init === false;
      case 'hp_below_half': return u.hp * 2 <= d.stats.hp; case 'hp_full': return u.hp >= d.stats.hp;
      case 'adjacent_ally': return mates().some(z => dist(z, u) === 1); case 'alone': return !mates().some(z => dist(z, u) <= 2);
      case 'on_cover': return uterr(S, u).avo > 0; default: return true;
    }
  }
  function mods(S, u, ctx) {
    const m = { atk: 0, hit: 0, avo: 0, crit: 0, def: 0, res: 0, spd: 0 }, fl = {}, d = S.defs[u.ref];
    for (const id of d.skills) {
      const sk = S.skills[id]; if (!sk) continue;
      if ((sk.type === 'passive' && cond(S, u, sk.cond, ctx)) || (sk.type === 'art' && ctx.art === id)) { for (const k in sk.mods) m[k] += sk.mods[k]; Object.assign(fl, sk.flags); }
    }
    return { m, fl };
  }
  // IF attack stance: an adjacent, unpaired ally joins each opening attack for half damage (no crit, no skills)
  function partnerOf(S, x, y, dart) {
    if (x.rear) return null; let best = null;
    for (const p of alive(S.battle)) {
      if (p.team !== x.team || p.id === x.id || p.rear || dist(p, x) !== 1) continue;
      const d = S.defs[p.ref], w = d.weapons[p.wi]; if (!arm(w) || !fireOk(S, p, w, y, false)) continue;
      const s = side(S, p, y, true, null, true, dart), dmg = Math.floor(s.dmg / 2), v = dmg * s.hit;
      if (!best || v > best.v) best = { v, id: p.id, wi: p.wi, dmg, hit: s.hit, name: d.name, n: w.brave ? 2 : 1 };
    }
    return best;
  }
  function side(S, A, D, init, art, free, dart) {
    const da = S.defs[A.ref], dd = S.defs[D.ref], sa = est(S, A), sd = est(S, D), w = da.weapons[A.wi] || da.weapons[0], ds = dist(A, D);
    const am = mods(S, A, { init, art: init ? art : null }), dm = mods(S, D, { init: !init, art: dart || null });
    const ask = init && art ? S.skills[art] : null;
    let [rmin, rmax] = w ? wr(S, w) : [0, 0]; if (ask && ask.range) { rmin = ask.range[0]; rmax = ask.range[1]; }
    const out = { can: arm(w) && (free || (ds >= rmin && ds <= rmax)), w, dmg: 0, hit: 0, crit: 0, hits: 0, fl: am.fl, as: sa.spd + am.m.spd };
    if (!out.can) return out;
    const wd = dd.weapons[D.wi] || dd.weapons[0]; let tri = 0;
    if (arm(wd) && (WT[w.type].beats || []).includes(wd.type)) tri = 1; else if (arm(wd) && (WT[wd.type].beats || []).includes(w.type)) tri = -1;
    const magic = w.type === 'tome' || !!w.magic || !!am.fl.magic, tags = utags(dd), tt = uterr(S, D);
    const eff = (w.eff || []).some(t => tags.includes(t)) || (w.type === 'bow' && tags.includes('fly'));
    const gk = gun(S, w), gm = { h: 0, d: 0, c: 0 };
    if (gk === 'shotgun') { gm.h = ds <= 1 ? 20 : ds === 2 ? 0 : -20; gm.d = ds <= 1 ? 3 : ds === 2 ? 0 : -3; } else if (gk === 'rifle' && ds <= 1) gm.h = -10; else if (gk === 'sniper') gm.c = 10; else if (gk === 'auto') gm.h = -10;
    const cv = S.xcom && free !== true && ds >= 2 ? coverFrom(S, D, A) : { v: 0 }, open = !!S.xcom && free !== true && ds >= 2 && !cv.v;
    out.cover = cv.v >= 40 ? '완전엄폐' : cv.v ? '반엄폐' : cv.flank ? '측면' : '';
    const atk = (magic ? sa.mag : sa.str) + w.mt * (eff ? 3 : 1) + tri + am.m.atk + gm.d;
    let df = (magic ? sd.res + dm.m.res : sd.def + dm.m.def) + tt.def; out.df0 = df;
    if (am.fl.pierce) df = Math.floor(df * (100 - am.fl.pierce) / 100);
    out.mul = am.fl.mult || 1; out.blk = dm.fl.block || 0; out.dmg = Math.floor(Math.floor(Math.max(0, atk - df) * out.mul) * (100 - out.blk) / 100); out.atk = atk; out.eff = eff; out.tri = tri; out.magic = magic;
    const pt = free ? null : partnerOf(S, A, D, dart); out.partner = pt;
    out.hit = am.fl.sure ? 100 : clamp(gm.h - cv.v + w.hit + sa.skl * 2 + Math.floor(sa.lck / 2) + tri * 15 + am.m.hit + (pt ? 10 : 0) - ((sd.spd + dm.m.spd) * 2 + sd.lck + tt.avo + dm.m.avo + (wd && wd.type === 'claw' && w.type !== 'claw' ? 15 : 0)), 0, 100);
    out.crit = clamp(gm.c + (open ? 10 : 0) + w.crit + Math.floor(sa.skl / 2) + am.m.crit - sd.lck - (D.rear ? 5 : 0), 0, 100);
    out.init = init; out.hits = gk === 'auto' ? (init ? clamp(ammo(S, A, w), 1, 2) : 1) : am.fl.brave || (init && w.brave) ? 2 : 1; if (gk) out.hits = clamp(ammo(S, A, w), 1, out.hits);
    return out;
  }
  function forecast(S, a, d, art) {
    const A = side(S, a, d, true, art), D = side(S, d, a, false, null, false, art);
    if (A.fl.noCounter || (S.xcom && (dist(a, d) >= 2 || gunOf(D.w)))) D.can = false;
    A.x2 = A.can && A.as - D.as >= 4; D.x2 = D.can && D.as - A.as >= 4; if (S.xcom && gunOf(A.w)) A.x2 = false;
    A.total = A.can ? A.dmg * A.hits * (A.x2 ? 2 : 1) : 0; D.total = D.can ? D.dmg * D.hits * (D.x2 ? 2 : 1) : 0;
    // a guard-stance pair (lead + rear) blocks every dual strike aimed at it
    A.dual = A.can && A.partner && !d.rear ? A.partner : null; D.dual = D.can && D.partner && !a.rear ? D.partner : null;
    A.gauge = a.rear ? (a.gauge || 0) : null; D.gauge = d.rear ? (d.gauge || 0) : null;
    return { a: A, d: D };
  }
  function spend(S, u, w) { if (u.team !== 'ally' || !w || !w.max || arm(w)) return false; w.uses = Math.max(0, (w.uses == null ? w.max : w.uses) - 1); return w.uses === 0; }
  function unslot(S, d, i) { const w = d.weapons.splice(i, 1)[0]; if (S.battle) for (const z of Object.values(S.battle.units)) if (z.ref === d.id) { if (z.wi === i) z.wi = Math.max(0, d.weapons.findIndex(arm)); else if (z.wi > i) z.wi--; } return w; }
  function discard(S, u, w) { const d = S.defs[u.ref], i = d.weapons.indexOf(w); if (i >= 0) unslot(S, d, i); }
  function strike(S, x, y, f, ev) {
    x.fought = y.fought = true; if (gun(S, f.w)) (x.am || (x.am = {}))[f.w.name] = Math.max(0, ammo(S, x, f.w) - 1);
    const dx = S.defs[x.ref], dy = S.defs[y.ref], e = { t: 'strike', from: x.id, to: y.id, dmg: 0, hp: y.hp };
    // guard stance: a full shield gauge cancels the next attack outright
    if (y.rear && (y.gauge || 0) >= 10) { y.gauge = 0; e.guard = true; ev.push(e); if (x.rear) x.gauge = Math.min(10, (x.gauge || 0) + 2); return 0; }
    if (x.rear) x.gauge = Math.min(10, (x.gauge || 0) + 2);
    if (y.rear) y.gauge = Math.min(10, (y.gauge || 0) + 2);
    if (!(f.fl.sure || (roll(S) + roll(S)) / 2 < f.hit)) { e.miss = true; ev.push(e); return 0; }
    if (spend(S, x, f.w)) e.brk = f.w.name;
    let dmg = f.dmg, drain = Math.max(f.fl.drain || 0, f.w.drain || 0); const names = [], stx = est(S, x), sty = est(S, y);
    for (const id of dx.skills) {
      const sk = S.skills[id]; if (!sk || sk.type !== 'proc' || sk.flags.block || !cond(S, x, sk.cond, { init: f.init })) continue;
      if (roll(S) >= (typeof sk.rate === 'string' ? stx[sk.rate] : sk.rate)) continue;
      names.push(sk.name); dmg += sk.mods.atk || 0;
      if (sk.flags.pierce) dmg = Math.max(dmg, Math.floor(Math.floor(Math.max(0, f.atk + (sk.mods.atk || 0) - Math.floor(f.df0 * (100 - sk.flags.pierce) / 100)) * (f.mul || 1)) * (100 - (f.blk || 0)) / 100));
      if (sk.flags.mult) dmg = Math.floor(dmg * sk.flags.mult);
      drain = Math.max(drain, sk.flags.drain || 0); break;
    }
    if (roll(S) < f.crit) { dmg *= 3; e.crit = true; }
    for (const id of dy.skills) { const sk = S.skills[id]; if (sk && sk.type === 'proc' && sk.flags.block && cond(S, y, sk.cond, { init: !f.init }) && roll(S) < (typeof sk.rate === 'string' ? sty[sk.rate] : sk.rate)) { dmg = Math.floor(dmg * (100 - sk.flags.block) / 100); e.block = sk.name; break; } }
    dmg = clamp(dmg, 0, y.hp); y.hp -= dmg; e.dmg = dmg; e.hp = y.hp; if (names.length) e.proc = names.join(', ');
    if (drain && dmg > 0) { const h = Math.min(dx.stats.hp - x.hp, Math.ceil(dmg * drain / 100)); if (h > 0) { x.hp += h; e.heal = h; e.hpFrom = x.hp; } }
    ev.push(e); return dmg;
  }
  function dualStrike(S, pt, y, ev, yInit) {
    const e = { t: 'strike', from: pt.id, to: y.id, dmg: 0, hp: y.hp, dual: true };
    const p = S.battle.units[pt.id], pw = p && S.defs[p.ref].weapons[pt.wi];
    if (pw && gun(S, pw)) { if (ammo(S, p, pw) <= 0) { e.miss = true; ev.push(e); return e; } (p.am || (p.am = {}))[pw.name] = ammo(S, p, pw) - 1; }
    if (y.rear) e.guard = true;
    else if ((roll(S) + roll(S)) / 2 < pt.hit) {
      let dmg = pt.dmg; const dy = S.defs[y.ref], sty = est(S, y);
      for (const id of dy.skills) { const sk = S.skills[id]; if (sk && sk.type === 'proc' && sk.flags.block && cond(S, y, sk.cond, { init: !!yInit }) && roll(S) < (typeof sk.rate === 'string' ? sty[sk.rate] : sk.rate)) { dmg = Math.floor(dmg * (100 - sk.flags.block) / 100); e.block = sk.name; break; } }
      e.dmg = Math.min(dmg, y.hp); y.hp -= e.dmg; e.hp = y.hp;
    }
    else e.miss = true;
    ev.push(e); return e;
  }
  const expRate = S => (S.expRate == null ? 1 : S.expRate);
  const xp = (S, n) => (expRate(S) > 0 ? Math.max(1, Math.round(n * expRate(S))) : 0);
  function expFor(S, a, d, kill, dealt) {
    const diff = S.defs[d.ref].level - S.defs[a.ref].level;
    if (kill) return xp(S, clamp(12 + diff * 3, 3, 40) + (d.boss ? 10 : 0));
    return xp(S, dealt > 0 ? clamp(4 + diff, 1, 10) : 1);
  }
  // the level a skill belongs to, read off its numbers (the same tiers the generators are given); arts sit one tier lower
  function reqLevel(sk) {
    const t = (v, a, b, c) => (v <= a ? 1 : v <= b ? 11 : v <= c ? 21 : 40), m = sk.mods || {}, f = sk.flags || {}; let r = 1;
    for (const k of ['atk', 'def', 'res', 'spd']) if (m[k] > 0) r = Math.max(r, t(m[k], 2, 3, 5));
    for (const k of ['hit', 'avo', 'crit']) if (m[k] > 0) r = Math.max(r, t(m[k], 10, 15, 25));
    for (const k of ['pierce', 'drain', 'block']) if (f[k]) r = Math.max(r, t(f[k], 30, 40, 60));
    if (f.mult) r = Math.max(r, f.mult <= 1.3 ? 11 : f.mult <= 2 ? 21 : 40);
    if (f.regen) r = Math.max(r, t(f.regen, 3, 5, 7));
    if (f.brave || f.sure || f.noCounter) r = Math.max(r, 21);
    return sk.type === 'art' ? (r >= 40 ? 21 : r >= 21 ? 11 : 1) : r;
  }
  // skills set aside by an adjustment come back once the level allows
  function relearn(S, d, lines) {
    if (!d.later || !d.later.length) return; const rest = [];
    for (const k of d.later) {
      const sk = S.skills[k]; if (!sk || d.skills.includes(k)) continue;
      if (reqLevel(sk) <= d.level && d.skills.length < 6) { d.skills.push(k); if (lines) lines.push('다시 습득: ' + sk.name); else log(S, d.name + ': ' + sk.name + ' 다시 습득'); }
      else rest.push(k);
    }
    d.later = rest;
  }
  function rescale(S, id, level) {
    const d = S.defs[id]; if (!d) return null; level = int(level, 1, MAXLV, d.level); const diff = level - d.level, lines = [];
    if (diff) { lines.push('Lv ' + d.level + ' → ' + level); const keepShare = diff < 0 && d.level > 1 ? 0.4 + 0.6 * (level - 1) / (d.level - 1) : 0; // going down never strips a stat below this share of what it was
      for (const k of STATS) d.stats[k] = clamp(Math.max(d.stats[k] + Math.round(d.growth[k] * diff / 100), Math.round(d.stats[k] * keepShare)), k === 'hp' ? 10 : 0, k === 'hp' ? 120 : 60); }
    d.level = level; d.exp = 0; fitLevel(d); d.later = d.later || [];
    const keep = []; for (const k of d.skills) { const sk = S.skills[k]; if (sk && reqLevel(sk) > level) { if (!d.later.includes(k)) d.later.push(k); lines.push('보류: ' + sk.name + ' (Lv ' + reqLevel(sk) + ')'); } else keep.push(k); }
    d.skills = keep; relearn(S, d, lines);
    if (S.battle) for (const u of Object.values(S.battle.units)) if (u.ref === id && u.hp > 0) u.hp = clamp(u.hp, 1, d.stats.hp);
    retro(S, id); return lines;
  }
  function grantExp(S, def, amount, ev, uid) {
    if (!def || amount <= 0 || def.level >= MAXLV) return;
    def.exp += amount; if (uid) ev.push({ t: 'exp', id: uid, gain: amount });
    while (def.exp >= 100 && def.level < MAXLV) {
      def.exp -= 100; def.level++; const gains = {};
      for (const k of STATS) { let g = def.growth[k], n = 0; while (g >= 100) { n++; g -= 100; } if (roll(S) < g) n++; if (n) gains[k] = n; }
      if (!Object.keys(gains).length) gains.hp = 1;
      for (const k in gains) def.stats[k] = Math.min(k === 'hp' ? 120 : 60, def.stats[k] + gains[k]);
      if (S.battle) for (const u of Object.values(S.battle.units)) if (u.ref === def.id && u.hp > 0 && gains.hp) u.hp += gains.hp;
      log(S, def.name + ' 레벨 업! Lv ' + def.level + ' (' + Object.keys(gains).map(k => SL[k] + '+' + gains[k]).join(' ') + ')');
      ev.push({ t: 'level', id: uid, level: def.level, gains });
      relearn(S, def);
    }
    if (def.level >= MAXLV) def.exp = 0;
  }
  function went(S, u) {
    const m = u.mv; delete u.mv; if (!m) return '';
    const n = Math.abs(u.x - m.x) + Math.abs(u.y - m.y); if (!n) return '';
    const t = uterr(S, u); return n + '칸 이동' + (t.n && t.n !== T0.n ? ', ' + t.n : '');
  }
  const hpOf = (S, u) => ' (' + u.hp + '/' + S.defs[u.ref].stats.hp + ')';
  function fall(S, u, ev) {
    const B = S.battle; ev.push({ t: 'die', id: u.id });
    if (u.rear && B.units[u.rear]) { const r = B.units[u.rear]; r.rearOf = null; r.x = u.x; r.y = u.y; r.done = true; u.rear = null; ev.push({ t: 'front', id: r.id }); log(S, S.defs[r.ref].name + ': 후위에서 전위로 나섬'); }
  }
  function resolve(S, a, d, art, ev) {
    syncRears(S.battle);
    const fc = forecast(S, a, d, art), na = S.defs[a.ref].name, nd = S.defs[d.ref].name, hp0 = { a: a.hp, d: d.hp };
    const order = [[a, d, fc.a, true]]; if (fc.d.can) order.push([d, a, fc.d, true]); if (fc.a.x2) order.push([a, d, fc.a, false]); else if (fc.d.x2) order.push([d, a, fc.d, false]);
    ev.push({ t: 'combat', a: a.id, d: d.id, art: art ? S.skills[art].name : null });
    let crit = false; const notes = [], broke = new Map(), cnt = { [a.id]: [0, 0], [d.id]: [0, 0] };
    for (const [x, y, f, first] of order) {
      for (let i = 0; i < f.hits; i++) { if (x.hp <= 0 || y.hp <= 0 || broke.has(x.id) || (gun(S, f.w) && ammo(S, x, f.w) <= 0)) break; const n = ev.length; strike(S, x, y, f, ev); const e = ev[n]; cnt[x.id][0]++; if (!e.miss && !e.guard) cnt[x.id][1]++; if (e.guard) cnt[x.id][2] = 1; if (e.brk) broke.set(x.id, f.w); if (e.crit) crit = true; if (e.proc) notes.push(e.proc); if (e.guard) notes.push('방진 방어'); }
      if (first && f.partner && x.hp > 0) for (let k = 0; k < (f.partner.n || 1) && y.hp > 0; k++) { const e = dualStrike(S, f.partner, y, ev, y.id === a.id); notes.push(e.guard ? '공진 차단' : f.partner.name + ' 공진' + (e.miss ? ' 빗나감' : ' ' + e.dmg)); }
    }
    if (fc.a.cover) notes.push(fc.a.cover);
    const mv = went(S, a), tally = c => (c[0] > 1 && c[1] > 0 && c[1] < c[0] ? ' (' + c[0] + '회 중 ' + c[1] + '회 명중)' : ''), ca = cnt[a.id], cd = cnt[d.id];
    let line = na + ' (' + [fc.a.w && fc.a.w.name, mv].filter(Boolean).join(', ') + ')' + (art ? ' [' + S.skills[art].name + ']' : '') + ' → ' + nd + ': ' + (ca[0] && !ca[1] && hp0.d === d.hp ? (ca[2] ? '막힘' : '빗나감') : (hp0.d - d.hp) + ' 피해' + hpOf(S, d) + tally(ca));
    if (fc.d.can && cd[0]) line += !cd[1] ? (cd[2] ? ', 반격 막힘' : ', 반격 빗나감') : ', 반격으로 ' + Math.max(0, hp0.a - a.hp) + ' 피해' + hpOf(S, a) + tally(cd); if (crit) line += ' (필살)'; if (notes.length) line += ' (' + [...new Set(notes)].join(', ') + ')';
    for (const u of [d, a]) if (u.hp <= 0) line += ' — ' + S.defs[u.ref].name + ' 격파';
    for (const [id, w] of broke) line += ' — ' + S.defs[S.battle.units[id].ref].name + '의 ' + w.name + ' 부서짐';
    log(S, line);
    for (const [id, w] of broke) { discard(S, S.battle.units[id], w); ev.push({ t: 'break', id, name: w.name }); }
    for (const u of [d, a]) if (u.hp <= 0) fall(S, u, ev);
    if (art) { a.cd[art] = (S.skills[art].cd || 0) + 1; }
    for (const [u, z, h0] of [[a, d, hp0.d], [d, a, hp0.a]]) if (u.team === 'friend' && u.hp > 0) S.battle.pool = (S.battle.pool || 0) + expFor(S, u, z, z.hp <= 0, h0 - z.hp);
    for (const [u, z, h0] of [[a, d, hp0.d], [d, a, hp0.a]]) if (u.team === 'ally' && u.hp > 0) {
      const amount = expFor(S, u, z, z.hp <= 0, h0 - z.hp); grantExp(S, S.defs[u.ref], amount, ev, u.id);
      if (u.rear && S.battle.units[u.rear]) grantExp(S, S.defs[S.battle.units[u.rear].ref], Math.floor(amount / 2), ev, null);
    }
    outcome(S, ev);
  }
  function healAmount(S, u) { const d = S.defs[u.ref], w = d.weapons[u.wi]; return w && w.type === 'staff' ? d.stats.mag + w.mt : 0; }
  function heal(S, u, z, ev) {
    const d = S.defs[u.ref], w = d.weapons[u.wi], amt = Math.min(S.defs[z.ref].stats.hp - z.hp, healAmount(S, u)); z.hp += amt;
    ev.push({ t: 'heal', from: u.id, id: z.id, amt, hp: z.hp }); log(S, d.name + ' (' + [w.name, went(S, u)].filter(Boolean).join(', ') + ') → ' + S.defs[z.ref].name + ': ' + amt + ' 회복' + hpOf(S, z));
    if (spend(S, u, w)) { log(S, d.name + '의 ' + w.name + ' 소진'); discard(S, u, w); ev.push({ t: 'break', id: u.id, name: w.name }); }
    if (u.team === 'ally') grantExp(S, d, xp(S, 6), ev, u.id);
  }
  // 도구: a consumable from the inventory, used on oneself
  function actItem(S, u, i, ev) {
    const d = S.defs[u.ref], w = d.weapons[i]; if (!w || w.type !== 'item') return;
    const amt = Math.min(d.stats.hp - u.hp, w.mt); u.hp += amt; ev.push({ t: 'heal', from: u.id, id: u.id, amt, hp: u.hp });
    const mv = went(S, u), out = spend(S, u, w);
    log(S, d.name + (mv ? ' (' + mv + ')' : '') + ': ' + w.name + ' 사용, ' + amt + ' 회복' + hpOf(S, u) + (out ? ' — ' + w.name + ' 다 씀' : w.max && u.team === 'ally' ? ' (남은 ' + w.uses + '회)' : '')); if (out) discard(S, u, w); u.done = true;
  }
  // 교환: hand one inventory entry to an adjacent ally
  function actGive(S, a, b, i) { const da = S.defs[a.ref], db = S.defs[b.ref]; if (da === db || !da.weapons[i] || db.weapons.length >= 5) return false; const w = unslot(S, da, i); db.weapons.push(w); const n = a.am ? a.am[w.name] : null; if (a.am && !da.weapons.some(x => x.name === w.name)) delete a.am[w.name]; if (n != null) (b.am || (b.am = {}))[w.name] = n; else if (b.am) delete b.am[w.name]; log(S, da.name + ' → ' + db.name + ': ' + w.name + ' 건넴'); return true; }
  function outcome(S, ev) {
    const B = S.battle; if (!B || B.status !== 'active') return;
    const us = alive(B), allies = us.filter(u => u.team === 'ally'), foes = us.filter(u => SIDE[u.team] !== 0);
    let st = null;
    if (!allies.length) st = 'defeat';
    else if (!foes.length) st = 'victory';
    else if (B.obj.type === 'boss' && B.hadBoss && !foes.some(u => u.boss)) st = 'victory';
    else if (B.obj.type === 'survive' && B.turn > B.obj.turns) st = 'victory';
    if (st) finish(S, st, ev);
  }
  function finish(S, st, ev) {
    const B = S.battle; B.status = st; log(S, st === 'victory' ? '전투 승리' : '전투 패배'); ev.push({ t: 'end', status: st });
    if (st !== 'victory') return;
    const party = living(B).filter(u => u.team === 'ally'), share = party.length ? Math.floor((B.pool || 0) / party.length) : 0;
    if (share > 0) log(S, '우군이 얻은 경험치 ' + B.pool + ' → 아군 ' + party.length + '명에게 ' + share + '씩');
    for (const u of party) grantExp(S, S.defs[u.ref], xp(S, 8) + share, ev, u.id);
    B.pool = 0;
  }
  function moveUnit(S, u, x, y, R, ev) { if (u.x === x && u.y === y) return true; const path = pathTo(R, K(x, y)); u.mv = { x: u.x, y: u.y }; return travel(S, u, path, ev); }

  // ── phases ──
  function beginPhase(S, team, ev) {
    const B = S.battle; B.phase = team; ev.push({ t: 'phase', team, turn: B.turn }); syncRears(B);
    if (waiting(B, team).some(w => w.turn <= B.turn)) {
      const taken = new Set(alive(B).map(u => K(u.x, u.y))), rest = [];
      for (const w of B.wait) {
        if (w.team !== team || w.turn > B.turn) { rest.push(w); continue; }
        if (team === 'ally' && Object.values(B.units).some(u => u.ref === w.ref)) continue;
        const u = enter(S, w, taken); if (!u && S.defs[w.ref]) rest.push(w); if (u) { ev.push({ t: 'spawn', id: u.id }); log(S, '증원: ' + TN[team] + ' ' + S.defs[u.ref].name + ' 도착'); }
      }
      B.wait = rest;
    }
    for (const u of living(B)) if (u.team === team) {
      u.done = false; u.ow = false; for (const k in u.cd) if (u.cd[k] > 0) u.cd[k]--;
      if (u.rear && !u.fought) u.gauge = Math.max(0, (u.gauge || 0) - 2); u.fought = false;
      if (u.rearOf) continue;
      const d = S.defs[u.ref], t = uterr(S, u); let h = t.heal ? Math.ceil(d.stats.hp * t.heal / 100) : 0;
      for (const id of d.skills) { const sk = S.skills[id]; if (sk && sk.type === 'passive' && sk.flags.regen && cond(S, u, sk.cond, {})) h += sk.flags.regen; }
      h = Math.min(h, d.stats.hp - u.hp); if (h > 0) { u.hp += h; ev.push({ t: 'heal', id: u.id, amt: h, hp: u.hp }); log(S, d.name + ': 턴 시작 ' + h + ' 회복' + hpOf(S, u) + (t.heal ? ' (' + t.n + ')' : ''), 'regen'); }
    }
  }
  function aiAct(S, u, ev) {
    const B = S.battle, d = S.defs[u.ref], foes = alive(B).filter(z => foe(z, u)), mates = alive(B).filter(z => !foe(z, u) && z.id !== u.id);
    u.done = true; if (!foes.length) return;
    const R = reach(S, u), ox = u.x, oy = u.y, owi = u.wi, ai = u.ai || 'charge';
    const cand = ai === 'guard' ? [K(ox, oy)] : stops(S, u, R);
    const staff = d.weapons.findIndex(w => w.type === 'staff');
    if (staff >= 0) {
      let bh = null; u.wi = staff; const w = d.weapons[staff];
      for (const k of cand) { const [x, y] = unK(k); for (const z of mates) { const miss = S.defs[z.ref].stats.hp - z.hp, ds = Math.abs(z.x - x) + Math.abs(z.y - y); if (miss >= 5 && ds >= w.rmin && ds <= w.rmax && (!bh || miss > bh.miss)) bh = { miss, x, y, z }; } }
      if (bh && (bh.miss * 2 >= S.defs[bh.z.ref].stats.hp || !d.weapons.some(arm))) { if (moveUnit(S, u, bh.x, bh.y, R, ev)) heal(S, u, bh.z, ev); return; }
      u.wi = owi;
    }
    let best = null;
    for (const k of cand) {
      const [x, y] = unK(k); u.x = x; u.y = y; const cover = uterr(S, u).avo / 10 - R.get(k).c * 0.01 + (S.xcom ? coverAt(S, u, foes) / 10 : 0);
      d.weapons.forEach((w, i) => {
        if (!arm(w)) return; u.wi = i;
        for (const f of foes) {
          if (!canShoot(S, u, w, f, x !== ox || y !== oy)) continue;
          const fc = forecast(S, u, f, null);
          const sc = Math.min(f.hp, fc.a.total) * fc.a.hit / 100 * 2 + (fc.a.dual ? fc.a.dual.dmg * fc.a.dual.hit / 100 : 0) - (fc.d.dual ? fc.d.dual.dmg * fc.d.dual.hit / 100 : 0) + (fc.a.total >= f.hp ? 40 * fc.a.hit / 100 : 0) - (fc.d.can ? Math.min(u.hp, fc.d.total) * fc.d.hit / 100 : 0) + cover;
          if (!best || sc > best.sc) best = { sc, x, y, wi: i, f };
        }
      });
    }
    u.x = ox; u.y = oy; u.wi = owi;
    if (best) { u.wi = best.wi; if (moveUnit(S, u, best.x, best.y, R, ev)) resolve(S, u, best.f, null, ev); return; }
    if (S.xcom) { const gi = d.weapons.findIndex(w => gun(S, w) && ammo(S, u, w) <= 0); if (gi >= 0) { actReload(S, u, gi); return; } }
    if (ai === 'charge') march();
    if (u.hp <= 0 || B.status !== 'active') return;
    const mv = went(S, u), wi = d.weapons.findIndex(w => canWatch(S, u, w, !!mv));
    if (wi >= 0) { u.wi = wi; u.ow = true; log(S, d.name + ': ' + (mv ? mv + ', ' : '') + '경계', 'ow'); } else if (mv) log(S, d.name + ': ' + mv, 'mv');
    // march: follow the cheapest route to the nearest opponent as far as this turn allows; under XCOM rules end the step behind cover if some is right there
    function march() {
      const lo = Math.min(...d.weapons.filter(arm).map(w => wr(S, w)[0]));
      if (S.xcom && lo >= 2 && lo < 9 && foes.some(f => dist(u, f) < lo)) {
        let bk = null; for (const k of stops(S, u, R)) { const [x, y] = unK(k), near = Math.min(lo + 1, ...foes.map(f => Math.abs(f.x - x) + Math.abs(f.y - y))), sc = near * 10 - R.get(k).c; if (!bk || sc > bk.sc) bk = { sc, x, y }; }
        if (bk) moveUnit(S, u, bk.x, bk.y, R, ev); return;
      }
      const full = reach(S, u, { unlimited: true, ignoreUnits: true }); let tk = null;
      const goals = (staff >= 0 && !d.weapons.some(arm) ? mates : foes);
      const hi = goals === foes ? Math.max(1, ...d.weapons.filter(arm).map(w => wr(S, w)[1])) : 1;
      for (const f of goals) {
        if (full.has(K(f.x, f.y))) { const k = K(f.x, f.y); if (tk == null || full.get(k).c < full.get(tk).c) tk = k; continue; }
        for (let dy = -hi; dy <= hi; dy++) for (let dx = -hi; dx <= hi; dx++) { const x = f.x + dx, y = f.y + dy, k = K(x, y); if (Math.abs(dx) + Math.abs(dy) <= hi && x >= 0 && y >= 0 && x < B.w && y < B.h && full.has(k) && (tk == null || full.get(k).c < full.get(tk).c)) tk = k; }
      }
      if (tk == null) return;
      const ok = new Set(stops(S, u, R)); let dest = null;
      for (const p of pathTo(full, tk)) { const k = K(p.x, p.y); if (ok.has(k)) dest = p; else if (!R.has(k)) break; }
      if (dest && S.xcom) {
        const cov = (x, y) => { u.x = x; u.y = y; const v = coverAt(S, u, foes); u.x = ox; u.y = oy; return v; }; let bv = cov(dest.x, dest.y);
        for (const [dx, dy] of DIRS) { const x = dest.x + dx, y = dest.y + dy; if (ok.has(K(x, y)) && (x !== ox || y !== oy)) { const v = cov(x, y); if (v > bv) { bv = v; dest = { x, y }; } } }
      }
      if (dest) moveUnit(S, u, dest.x, dest.y, R, ev);
    }
  }
  function runTeam(S, team, ev) { for (const u of alive(S.battle).filter(u => u.team === team).sort((a, b) => a.id < b.id ? -1 : 1)) { if (S.battle.status !== 'active') break; if (u.hp > 0 && !u.done) { aiAct(S, u, ev); delete u.mv; } } }
  function endTurn(S, ev) {
    const B = S.battle; if (!B || B.status !== 'active') return;
    for (const [team, head] of [['enemy', '적군 턴'], ['third', '제3세력 턴'], ['friend', '우군 턴']]) {
      if (team !== 'enemy' && !alive(B).some(u => u.team === team) && !waiting(B, team).some(w => w.turn <= B.turn)) continue;
      log(S, head, 'ph'); beginPhase(S, team, ev); runTeam(S, team, ev); outcome(S, ev);
      if (B.status !== 'active') return;
    }
    B.phase = 'ally';
    B.turn++; outcome(S, ev); if (B.status !== 'active') return;
    log(S, '아군 ' + B.turn + '턴', 'ph'); beginPhase(S, 'ally', ev); mark(S, '턴 시작');
  }
  // player commands; each returns nothing and pushes events
  function actAttack(S, u, z, art, ev) { resolve(S, u, z, art, ev); u.done = true; }
  function actHeal(S, u, z, ev) { heal(S, u, z, ev); u.done = true; }
  function actWait(S, u) { const mv = went(S, u); u.done = true; log(S, S.defs[u.ref].name + ': ' + (mv || '제자리 대기'), mv ? 'mv' : 'wait'); }
  // guard stance commands (IF pair up): the acting unit steps into an adjacent ally's tile as the rear partner
  function actPair(S, u, z) { u.rearOf = z.id; z.rear = u.id; z.gauge = 0; u.ow = false; u.x = z.x; u.y = z.y; u.done = true; delete u.mv; log(S, '방진 편성: 전위 ' + S.defs[z.ref].name + ' / 후위 ' + S.defs[u.ref].name); }
  function actSwitch(S, u) { const r = S.battle.units[u.rear]; r.rear = u.id; r.rearOf = null; r.gauge = u.gauge || 0; r.x = u.x; r.y = u.y; r.done = u.done; u.rear = null; u.rearOf = r.id; u.gauge = 0; return r; }
  function actDrop(S, u, x, y) { const r = S.battle.units[u.rear]; r.rearOf = null; r.x = x; r.y = y; r.done = false; u.rear = null; u.gauge = 0; u.done = true; log(S, '방진 해제: ' + S.defs[u.ref].name + ' / ' + S.defs[r.ref].name); }
  const standable = (S, u, x, y) => terr(S.battle, x, y).c[MT[S.defs[u.ref].mtype] || 0] < INF;
  function canSeize(S, u) { const B = S.battle; return B.obj.type === 'seize' && u.team === 'ally' && (B.map[u.y] || '')[u.x] === 'T'; }
  function actSeize(S, u, ev) { u.done = true; log(S, S.defs[u.ref].name + ' 옥좌 제압'); finish(S, 'victory', ev); }
  const allDone = S => !alive(S.battle).some(u => u.team === 'ally' && !u.done);
  function options(S, u, from) {
    const moved = !!from && (from.x !== u.x || from.y !== u.y);
    const d = S.defs[u.ref], foes = alive(S.battle).filter(z => foe(z, u)), mates = alive(S.battle).filter(z => !foe(z, u) && z.id !== u.id), out = [];
    d.weapons.forEach((w, i) => {
      if (w.type === 'staff') { const t = mates.filter(z => { const ds = dist(u, z); return ds >= w.rmin && ds <= w.rmax && z.hp < S.defs[z.ref].stats.hp; }); out.push({ kind: 'heal', wi: i, label: w.name, targets: t.map(z => z.id) }); return; }
      if (w.type === 'item') { out.push({ kind: 'item', wi: i, label: w.name, targets: u.hp < d.stats.hp ? [u.id] : [] }); return; }
      out.push({ kind: 'attack', wi: i, label: w.name, targets: foes.filter(z => canShoot(S, u, w, z, moved)).map(z => z.id) });
    });
    const ew = arm(d.weapons[u.wi]) ? u.wi : d.weapons.findIndex(arm);
    if (ew >= 0) for (const id of d.skills) {
      const sk = S.skills[id]; if (!sk || sk.type !== 'art') continue; const w = d.weapons[ew], r = sk.range || wr(S, w);
      out.push({ kind: 'attack', wi: ew, art: id, label: sk.name, cd: u.cd[id] || 0, targets: (u.cd[id] || 0) > 0 ? [] : foes.filter(z => { const ds = dist(u, z); return ds >= r[0] && ds <= r[1] && fireOk(S, u, w, z, moved); }).map(z => z.id) });
    }
    const B = S.battle;
    if (u.rear && B.units[u.rear]) {
      const rm = MT[S.defs[B.units[u.rear].ref].mtype] || 0;
      out.push({ kind: 'switch', label: S.defs[B.units[u.rear].ref].name, targets: terr(B, u.x, u.y).c[rm] < INF ? [u.rear] : [] });
      out.push({ kind: 'drop', label: '방진 해제', targets: DIRS.map(([dx, dy]) => [u.x + dx, u.y + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < B.w && y < B.h && !unitAt(B, x, y) && terr(B, x, y).c[rm] < INF).map(([x, y]) => K(x, y)) });
    } else out.push({ kind: 'pair', label: '방진 편성', targets: mates.filter(z => z.team === u.team && dist(z, u) === 1 && !z.rear).map(z => z.id) });
    if (S.xcom) {
      d.weapons.forEach((w, i) => { const g = gun(S, w); if (g && ammo(S, u, w) < GUNS[g].mag) out.push({ kind: 'reload', wi: i, label: w.name + ' 재장전', small: ammo(S, u, w) + '/' + GUNS[g].mag, targets: [u.id] }); });
      if (canWatch(S, u, d.weapons[u.wi], moved)) out.push({ kind: 'watch', label: '경계', small: d.weapons[u.wi].name, targets: [u.id] });
    }
    out.push({ kind: 'trade', label: '교환', targets: mates.filter(z => z.team === u.team && dist(z, u) === 1 && z.ref !== u.ref).map(z => z.id) });
    return out;
  }

  // ── encounters ──
  function nearestFree(S, def, x, y, taken) {
    const B = S.battle, mt = MT[def.mtype] || 0, seen = new Set([K(x, y)]), q = [[x, y]];
    while (q.length) { const [cx, cy] = q.shift(); if (terr(B, cx, cy).c[mt] < INF && !taken.has(K(cx, cy))) return [cx, cy]; for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy, k = K(nx, ny); if (nx >= 0 && ny >= 0 && nx < B.w && ny < B.h && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } } }
    return null;
  }
  // put a unit on the board at (or next to) the asked tile
  function enter(S, p, taken) {
    const B = S.battle, def = S.defs[p.ref]; if (!def) return null; const at = nearestFree(S, def, p.x, p.y, taken); if (!at) return null;
    let id = idOf(p.id, def.id), n = 2; while (B.units[id]) id = def.id + '_' + n++;
    if (p.team === 'ally') def.ally = true;
    const u = { id, ref: def.id, team: p.team, x: at[0], y: at[1], hp: def.stats.hp, wi: Math.max(0, def.weapons.findIndex(arm)), done: false, cd: {} };
    if (p.team !== 'ally') { const boss = !!p.boss && SIDE[p.team] !== 0; u.ai = ['charge', 'hold', 'guard'].includes(p.ai) ? p.ai : (boss ? 'guard' : 'charge'); if (boss) { u.boss = true; B.hadBoss = true; } }
    B.units[id] = u; taken.add(K(u.x, u.y)); return u;
  }
  const waiting = (B, team) => (B.wait || []).filter(w => !team || w.team === team);
  function loadEncounter(S, j) {
    if (!j || typeof j !== 'object') throw new Error('전투 데이터가 객체가 아닙니다.');
    endReplay(S); ensureBase(S);
    (Array.isArray(j.skills) ? j.skills : []).slice(0, 10).forEach((o, i) => { const s = llmSkill(o, i); if (!S.skills[s.id]) S.skills[s.id] = s; });
    (Array.isArray(j.units) ? j.units : []).slice(0, 40).forEach((o, i) => { const u = o && PRE[o.preset] ? presetUnit(o.preset, o.level, Object.assign({}, o, { id: idOf(o.id, 'unit_' + i) })) : fitLevel(normUnit(o, i)); if (!(S.defs[u.id] && S.defs[u.id].ally)) S.defs[u.id] = u; });
    for (const d of Object.values(S.defs)) d.skills = d.skills.filter(id => S.skills[id]);
    const mp = MAPS[String(j.mapPreset || '').trim()];
    if (mp && !(Array.isArray(j.map) && j.map.length >= 4)) {
      const all = [mp.rows].concat(mp.alts || []), fh = roll(S) < 50, fv = roll(S) < 50; let rows = all[roll(S) % all.length];
      if (fh) rows = rows.map(r => r.split('').reverse().join('')); if (fv) rows = rows.slice().reverse();
      const W = rows[0].length, H = rows.length;
      j = Object.assign({}, j, { map: rows, indoor: mp.indoor, place: (Array.isArray(j.place) ? j.place : []).map(p => (p && typeof p === 'object' ? Object.assign({}, p, { x: fh ? W + 1 - int(p.x, 1, W, 1) : p.x, y: fv ? H + 1 - int(p.y, 1, H, 1) : p.y }) : p)) });
    }
    let rows = (Array.isArray(j.map) ? j.map : []).filter(r => typeof r === 'string').slice(0, 16);
    if (rows.length < 4) rows = Array.from({ length: 8 }, () => '..........');
    const w = clamp(Math.max(...rows.map(r => r.length)), 5, 20);
    rows = rows.map(r => r.padEnd(w, '.').slice(0, w).replace(/[^.bfpmFTw#]/g, '.'));
    if (j.indoor === true) rows = rows.map(r => r.replace(/[fm]/g, 'p')); // an interior has no woods or mountains, whatever the model drew
    const obj = j.objective && typeof j.objective === 'object' ? j.objective : {};
    const B = { name: txt(j.name, 60, '이름 없는 전장'), map: rows, w, h: rows.length, turn: 1, phase: 'ally', status: 'active', units: {}, obj: { type: OBJ[obj.type] ? obj.type : 'rout' } };
    if (B.obj.type === 'survive') B.obj.turns = int(obj.turns, 1, 30, 6);
    if (B.obj.type === 'seize' && !rows.some(r => r.includes('T'))) B.obj.type = 'rout';
    const prev = S.battle; S.battle = B; const taken = new Set();
    B.wait = [];
    for (const p of (Array.isArray(j.place) ? j.place : []).slice(0, 40)) {
      const def = p && S.defs[idOf(p.ref, '')]; if (!def) continue;
      const o = { ref: def.id, id: p.id, team: SIDE[p.team] != null ? p.team : 'enemy', x: int(p.x, 1, B.w, 1) - 1, y: int(p.y, 1, B.h, 1) - 1, ai: p.ai, boss: !!p.boss }, late = int(p.turn, 2, 30, 0);
      if (late) { if (o.team === 'ally') def.ally = true; o.turn = late; delete o.id; B.wait.push(o); } else enter(S, o, taken);
    }
    const us = Object.values(B.units);
    const here = new Set(us.filter(u => u.team === 'ally').map(u => u.ref).concat(waiting(B, 'ally').map(w => w.ref))); for (const id of here) delete S.defs[id].away;
    for (const v of (Array.isArray(j.away) ? j.away : []).slice(0, 40)) { const d = S.defs[idOf(v, '')]; if (d && d.ally && !here.has(d.id)) d.away = true; }
    if (!us.some(u => u.team === 'ally') || !us.some(u => SIDE[u.team] !== 0)) { S.battle = prev; throw new Error('아군과 적이 각각 한 명 이상 배치되어야 합니다.'); }
    if (B.obj.type === 'boss' && !B.hadBoss && !waiting(B).some(w => w.boss && SIDE[w.team] !== 0)) B.obj.type = 'rout';
    // drop enemy templates no longer used
    const used = new Set(us.map(u => u.ref).concat(waiting(B).map(w => w.ref))); for (const id of Object.keys(S.defs)) if (!S.defs[id].ally && !used.has(id)) delete S.defs[id];
    const held = new Set(); for (const d of Object.values(S.defs)) for (const k of d.skills.concat(d.later || [])) held.add(k);
    for (const k of Object.keys(S.skills)) if ((S.skills[k].tier || 'own') === 'own' && !held.has(k)) delete S.skills[k];
    if (j.later) { B.later = true; B.premise = txt(j.premise, 500, ''); }
    S.log = []; S.sent = S.seq; log(S, '전투 시작: ' + B.name + ' (목표: ' + objText(B) + ')'); pulseReset(S);
    return S;
  }
  function spawn(S, id, team) {
    const B = S.battle, d = S.defs[id]; if (!B || !d) return null;
    if (team === 'ally' && Object.values(B.units).some(u => u.ref === id)) return null;
    const on = alive(B), mates = on.filter(u => u.team === team), a = mates[mates.length - 1] || on[0]; if (!a) return null;
    const at = nearestFree(S, d, a.x, a.y, new Set(on.map(u => K(u.x, u.y)))); if (!at) return null;
    let uid = d.id, n = 2; while (B.units[uid]) uid = d.id + '_' + n++;
    const u = { id: uid, ref: d.id, team, x: at[0], y: at[1], hp: d.stats.hp, wi: Math.max(0, d.weapons.findIndex(arm)), done: false, cd: {} };
    if (team === 'ally') d.ally = true; else u.ai = 'charge';
    B.units[uid] = u; log(S, d.name + ' 등장'); return u;
  }
  // take a unit off the board by hand (editor); never the last one standing on its side
  function unspawn(S, uid) {
    const B = S.battle, u = B && B.units[uid]; if (!u) return false;
    if (u.hp > 0 && !u.rearOf && alive(B).filter(z => !foe(z, u)).length <= 1) return false;
    if (u.rear && B.units[u.rear]) { const r = B.units[u.rear]; r.rearOf = null; r.x = u.x; r.y = u.y; }
    if (u.rearOf && B.units[u.rearOf]) { const l = B.units[u.rearOf]; l.rear = null; l.gauge = 0; }
    delete B.units[uid];
    if (u.boss && !Object.values(B.units).some(z => z.boss && z.hp > 0)) { B.hadBoss = false; if (B.obj.type === 'boss') B.obj.type = 'rout'; }
    return true; // a correction, not an event: nothing goes into the battle record
  }
  // a battle kept for later: its opening position with every sheet and skill it needs
  function mapOf(S) {
    const o = S.start ? JSON.parse(S.start) : S.battle ? copy({ defs: S.defs, skills: S.skills, battle: S.battle }) : null; if (!o || !o.battle) return null;
    const used = new Set(Object.values(o.battle.units).map(u => u.ref).concat(waiting(o.battle).map(w => w.ref))), defs = {}, skills = {};
    for (const id of used) { const d = o.defs[id]; if (!d) continue; defs[id] = d; for (const k of d.skills.concat(d.later || [])) if (o.skills[k]) skills[k] = o.skills[k]; }
    const B = o.battle; delete B.later; delete B.premise;
    return { name: B.name, defs, skills, battle: B };
  }
  // a replay borrows the saved sheets; when it is over the chat gets its own sheets and skills back, untouched
  function endReplay(S) { if (!S.back) return false; const o = JSON.parse(S.back); S.defs = o.defs; S.skills = o.skills; delete S.back; S.battle = null; S.start = null; return true; }
  // play a kept battle here. Plain replay: everyone exactly as saved, and nothing earned carries over.
  // grow: an ally this chat already has fights with the sheet it has now, and keeps what it earns.
  function loadMap(S, m, grow) {
    if (!m || !m.battle || !m.defs) throw new Error('전장 데이터가 아닙니다.');
    endReplay(S); ensureBase(S); m = copy(m);
    if (!grow) { S.back = JSON.stringify({ defs: S.defs, skills: S.skills }); for (const id in m.defs) delete S.defs[id]; }
    for (const k in m.skills || {}) if (!grow || !S.skills[k]) S.skills[k] = m.skills[k];
    for (const id in m.defs) { if (!(S.defs[id] && S.defs[id].ally)) S.defs[id] = m.defs[id]; const d = S.defs[id]; d.skills = d.skills.filter(k => S.skills[k]); if (d.later) d.later = d.later.filter(k => S.skills[k]); }
    const B = m.battle; B.turn = 1; B.phase = 'ally'; B.status = 'active';
    for (const u of Object.values(B.units)) {
      const d = S.defs[u.ref]; if (!d) { delete B.units[u.id]; continue; }
      u.hp = d.stats.hp; u.wi = Math.max(0, d.weapons.findIndex(arm)); u.done = false; u.cd = {}; u.rear = null; u.rearOf = null; u.gauge = 0; u.ow = false; delete u.am; delete u.mv; delete u.fought;
      if (u.team === 'ally') { d.ally = true; delete d.away; }
    }
    B.wait = waiting(B).filter(w => S.defs[w.ref]); for (const w of B.wait) if (w.team === 'ally') { S.defs[w.ref].ally = true; delete S.defs[w.ref].away; }
    S.battle = B;
    const used = new Set(Object.values(B.units).map(u => u.ref).concat(B.wait.map(w => w.ref))); for (const id of Object.keys(S.defs)) if (!S.defs[id].ally && !used.has(id)) delete S.defs[id];
    const held = new Set(); for (const d of Object.values(S.defs)) for (const k of d.skills.concat(d.later || [])) held.add(k);
    for (const k of Object.keys(S.skills)) if ((S.skills[k].tier || 'own') === 'own' && !held.has(k)) delete S.skills[k];
    S.log = []; S.sent = S.seq; log(S, '전투 시작: ' + B.name + ' (목표: ' + objText(B) + ')'); pulseReset(S);
    return S;
  }
  // keep the opening position so a lost battle can be retried
  function snapshot(S) { for (const d of Object.values(S.defs)) for (const w of d.weapons) delete w.am; S.start = JSON.stringify({ defs: S.defs, skills: S.skills, battle: S.battle, log: S.log }); }
  function restart(S) { if (!S.start) return false; const o = JSON.parse(S.start); S.defs = o.defs; S.skills = o.skills; S.battle = o.battle; S.log = o.log; S.sent = S.seq; pulseReset(S); return true; }
  // ── 천각의 박동: rewind points. Each holds the board, the dice seed and everyone's level/exp/stats at that moment. ──
  const pulseMax = S => (S.pulseMax == null ? 3 : S.pulseMax);
  const progOf = d => [d.level, d.exp, Object.assign({}, d.stats), copy(d.weapons), d.skills.slice(), (d.later || []).slice()];
  function mark(S, label) {
    const B = S.battle; if (!B) return; if (!S.hist) S.hist = [];
    const battle = JSON.stringify(B), last = S.hist[S.hist.length - 1];
    if (last && last.battle === battle && last.seed === S.seed) return;
    const prog = {}; for (const d of Object.values(S.defs)) if (d.ally) prog[d.id] = progOf(d);
    S.hist.push({ turn: B.turn, label, seq: S.seq, seed: S.seed, battle, prog });
    if (S.hist.length > 40) S.hist.shift();
  }
  function pulseReset(S) { S.hist = []; S.pulse = pulseMax(S); if (S.battle) mark(S, '전투 시작'); }
  function pulse(S, i) {
    const h = S.hist && S.hist[i]; if (!h || !(S.pulse > 0)) return false;
    S.battle = JSON.parse(h.battle); S.seed = h.seed;
    for (const z of Object.values(S.battle.units)) if (!S.defs[z.ref]) { for (const o of Object.values(S.battle.units)) { if (o.rear === z.id) { o.rear = null; o.gauge = 0; } if (o.rearOf === z.id) o.rearOf = null; } delete S.battle.units[z.id]; }
    for (const id in h.prog) { const d = S.defs[id]; if (d) { d.level = h.prog[id][0]; d.exp = h.prog[id][1]; d.stats = Object.assign({}, h.prog[id][2]); if (h.prog[id][3]) d.weapons = copy(h.prog[id][3]); if (h.prog[id][4]) { d.skills = h.prog[id][4].filter(k => S.skills[k]); if (d.later || h.prog[id][5].length) d.later = h.prog[id][5].slice(); } } }
    S.log = S.log.filter(x => x.n <= h.seq); S.hist.length = i + 1; S.pulse--;
    return true;
  }
  // a hand edit of level/exp/stats holds across rewinds
  function retro(S, id) { const d = S.defs[id]; if (d && d.ally) for (const h of S.hist || []) h.prog[id] = progOf(d); }
  // a renamed unit or skill is renamed in what was already written to the log
  function rename(S, kind, id, from, to) {
    if (!from || !to || from === to) return;
    const keep = ['적군', '아군', '전투'].concat(Object.values(S.defs).filter(d => !(kind === 'unit' && d.id === id)).map(d => d.name), Object.values(S.skills).filter(s => !(kind === 'skill' && s.id === id)).map(s => s.name)).filter(n => n !== from && n.includes(from));
    const tok = i => String.fromCharCode(1) + i + String.fromCharCode(2);
    const fix = t => { keep.forEach((n, i) => { t = t.split(n).join(tok(i)); }); t = t.split(from).join(to); keep.forEach((n, i) => { t = t.split(tok(i)).join(n); }); return t; };
    for (const x of S.log) x.text = fix(x.text);
    if (S.start) try { const o = JSON.parse(S.start), pool = kind === 'unit' ? o.defs : o.skills; for (const x of o.log || []) x.text = fix(x.text); if (pool && pool[id]) pool[id].name = to; S.start = JSON.stringify(o); } catch (err) {}
  }
  const objText = B => OBJ[B.obj.type] + (B.obj.turns ? ' ' + B.obj.turns + '턴' : '');

  // ── RP growth: bounded changes proposed by the model, applied only after the user confirms ──
  function planGrowth(S, items) {
    const out = [];
    for (const it of (Array.isArray(items) ? items : []).slice(0, 12)) {
      const d = it && S.defs[idOf(it.id, '')]; if (!d || !d.ally) continue;
      const g = { id: d.id, reason: txt(it.reason, 120, 'RP 성장'), stats: {}, exp: int(it.exp, 0, 300, 0), learn: [], forget: [], lines: [] };
      let budget = 6;
      for (const k of STATS) { let v = int(it.stats && it.stats[k], k === 'hp' ? -8 : -3, k === 'hp' ? 8 : 3, 0); if (v > 0 && k !== 'hp') { v = Math.min(v, budget); budget -= v; } if (v) g.stats[k] = v; }
      for (const s of (Array.isArray(it.learn) ? it.learn : []).slice(0, 3)) { const id = idOf(s, ''); if (S.skills[id] && !d.skills.includes(id) && !g.learn.includes(id) && d.skills.length + g.learn.length < 6) g.learn.push(id); }
      for (const s of (Array.isArray(it.forget) ? it.forget : []).slice(0, 3)) { const id = idOf(s, ''); if (d.skills.includes(id)) g.forget.push(id); }
      if (it.weapon && typeof it.weapon === 'object') g.weapon = tameWeapon(normWeapon(it.weapon));
      const st = Object.keys(g.stats).map(k => SL[k] + (g.stats[k] > 0 ? '+' : '') + g.stats[k]);
      if (st.length) g.lines.push(st.join(' ')); if (g.exp) g.lines.push('경험치 +' + g.exp);
      if (g.learn.length) g.lines.push('습득: ' + g.learn.map(id => S.skills[id].name).join(', '));
      if (g.forget.length) g.lines.push('제거: ' + g.forget.map(id => S.skills[id].name).join(', '));
      if (g.weapon) g.lines.push('무기: ' + g.weapon.name);
      if (g.lines.length) out.push(g);
    }
    return out;
  }
  function applyGrowth(S, plan) {
    const ev = [];
    for (const g of plan) {
      const d = S.defs[g.id]; if (!d) continue;
      for (const k in g.stats) d.stats[k] = clamp(d.stats[k] + g.stats[k], k === 'hp' ? 1 : 0, k === 'hp' ? 120 : 60);
      d.skills = [...new Set(d.skills.filter(id => !g.forget.includes(id)).concat(g.learn))].slice(0, 6);
      if (g.weapon) { const i = d.weapons.findIndex(w => w.name === g.weapon.name); if (i >= 0) d.weapons[i] = g.weapon; else if (d.weapons.length < 5) d.weapons.push(g.weapon); else d.weapons[d.weapons.length - 1] = g.weapon; }
      d.history = (d.history || []).concat(g.reason).slice(-8);
      log(S, d.name + ' 성장: ' + g.lines.join(' / ') + ' — ' + g.reason);
      grantExp(S, d, g.exp, ev, null);
      if (S.battle) for (const u of Object.values(S.battle.units)) if (u.ref === d.id) { u.hp = clamp(u.hp, u.hp > 0 ? 1 : 0, d.stats.hp); if (!d.weapons[u.wi]) u.wi = 0; }
    }
  }

  // the record as the story model gets it: one line per phase, moves and turn-start healing folded together,
  // idle waits and the running HP left out (the unit list above already carries the final HP)
  function digest(list) {
    const out = []; let cur = null;
    const open = head => { cur = { head, acts: [], mv: [], regen: [], ow: [] }; out.push(cur); };
    for (const e of list) {
      if (e.k === 'ph') { open(e.text); continue; }
      if (!cur) open('');
      if (e.k === 'wait') continue;
      const m = e.k === 'mv' && /^(.*): (\d+)칸 이동(?:, (.*))?$/.exec(e.text), r = e.k === 'regen' && /^(.*): 턴 시작 (\d+) 회복/.exec(e.text);
      const o = e.k === 'ow' && /^(.*?): (?:(\d+)칸 이동, (?:.+, )?)?경계$/.exec(e.text);
      if (o) cur.ow.push(o[1] + (o[2] ? '(' + o[2] + '칸 이동)' : ''));
      else if (m) cur.mv.push(m[1] + ' ' + m[2] + '칸' + (m[3] ? '(' + m[3] + ')' : ''));
      else if (r) cur.regen.push(r[1] + ' ' + r[2]);
      else cur.acts.push(e.text);
    }
    return out.map(g => { const parts = g.acts.slice(); if (g.ow.length) parts.push('경계 태세: ' + g.ow.join(', ')); if (g.mv.length) parts.push('이동만: ' + g.mv.join(', ')); if (g.regen.length) parts.push('턴 시작 회복: ' + g.regen.join(', ')); return parts.length ? (g.head ? g.head + ' — ' : '') + parts.join('; ') : ''; }).filter(Boolean);
  }
  // ── text handed to the story model ──
  function context(S) {
    const B = S.battle; if (!B) return '';
    if (B.status !== 'active' && S.seq <= S.sent) return '';
    const lines = ['[Risu Tactics — 게임 엔진이 확정한 전투 결과]',
      '전장: ' + B.name + ' / 목표: ' + objText(B) + ' / ' + B.turn + '턴 / ' + (B.status === 'active' ? '진행 중' : B.status === 'victory' ? '아군 승리' : '아군 패배')];
    if (B.later) lines.push('이 전투는 직전 장면에서 시간이 흐른 뒤에 벌어졌다.' + (B.premise ? ' 배경: ' + B.premise : ''));
    for (const u of Object.values(B.units)) { const d = S.defs[u.ref]; lines.push('- ' + TN[u.team] + ' ' + d.name + ' (Lv ' + d.level + ' ' + d.cls + ') ' + (u.hp > 0 ? 'HP ' + u.hp + '/' + d.stats.hp : '전투불능') + (u.rearOf && B.units[u.rearOf] ? ' — ' + S.defs[B.units[u.rearOf].ref].name + '의 후위(방진)' : '')); }
    const all = digest(S.log.filter(e => e.n > S.sent)), fresh = all.slice(-30); if (all.length > 30) fresh.unshift('(이보다 앞선 ' + (all.length - 30) + '개 턴의 기록은 길어서 생략)');
    if (fresh.length) { lines.push('아직 서술되지 않은 전투 기록:'); for (const t of fresh) lines.push('· ' + t); }
    return lines.join('\n');
  }
  // what the story model is told: the record, then how to turn it into prose (after PokeTale's narration guide)
  function storyNote(S) {
    const base = context(S); if (!base) return '';
    const active = S.battle.status === 'active';
    return base + '\n' + [
      '[서술 지침]',
      ...(S.battle.later ? ['- 이 전투는 직전 장면에 바로 이어지지 않는다. 위 배경에 맞춰 그 사이에 흐른 시간과 일을 짧게 잇고 나서 전투로 들어간다.'] : []),
      '- 턴별 나열이 아니라 하나로 이어지는 전투 장면으로 쓴다. 승부를 가른 몇 순간만 생생하게 그리고 나머지는 짧게 잇는다.',
      '- 타격의 무게는 깎인 HP에 맞춘다. 필살, 무기 상성, 협공, 방진 방어는 그에 맞는 모습으로, 공격은 인물의 몸과 무기로 보여 준다.',
      '- 수치(HP·피해·명중·레벨·경험치)와 게임 용어(턴·페이즈·게이지)는 본문에 옮기지 않고 상처, 숨, 자세 같은 묘사로 바꾼다.',
      '- 전투에 있던 인물을 모두 등장시키고, 지형이 싸움에 영향을 줬다면 보여 준다.',
      '- 기록에 없는 공격·명중·격파를 더하지 않고 결과를 바꾸지 않는다.',
      active ? '- 전투는 아직 끝나지 않았다. 긴장을 남겨 두고, 결말로 몰아가지 않는다.' : '- 전투가 끝난 바로 그 순간부터, 인물들의 반응과 그 뒤의 이야기로 이어 쓴다.',
    ].join('\n');
  }
  const skillLines = S => 'saved_skills — id | name | tier | effect\n' + Object.values(S.skills).sort((a, b) => (a.tier === 'common' ? 0 : a.tier === 'faction' ? 1 : 2) - (b.tier === 'common' ? 0 : b.tier === 'faction' ? 1 : 2)).map(s => s.id + ' | ' + s.name + ' | ' + (s.tier || 'own') + (s.faction ? '/' + s.faction : '') + ' | ' + skillText(s)).join('\n');
  const sheetLine = (S, d) => [d.id, d.name, d.cls + ' ' + d.mtype, 'Lv ' + d.level + (d.exp ? ' exp ' + d.exp : ''), STATS.map(k => d.stats[k]).join('/'), d.weapons.map(w => w.name + '(' + w.type + ')').join(', ') || '-', d.skills.join(', ') || '-'].join(' | ');
  function rosterText(S) {
    const allies = Object.values(S.defs).filter(d => d.ally).map(d => sheetLine(S, d) + ((d.history || []).length ? ' | history: ' + d.history.join('; ') : '') + (d.away ? ' | AWAY' : ''));
    return 'saved_allies — id | name | class move | level | ' + STATS.join('/') + ' | inventory | skill ids\n' + (allies.join('\n') || '(none)') + '\n' + skillLines(S);
  }
  function skillText(sk) {
    const p = [sk.type === 'art' ? '전투 기술' + (sk.cd ? ' · 재사용 ' + sk.cd + '턴' : '') : sk.type === 'proc' ? '발동 ' + (typeof sk.rate === 'string' ? SL[sk.rate] + '%' : sk.rate + '%') : '패시브'];
    if (sk.cond !== 'always') p.push(CONDS[sk.cond]);
    const ml = { atk: '공격', hit: '명중', avo: '회피', crit: '필살', def: '수비', res: '마방', spd: '속도' };
    for (const k in sk.mods) p.push(ml[k] + (sk.mods[k] > 0 ? '+' : '') + sk.mods[k]);
    const f = sk.flags; if (f.brave) p.push('2회 공격'); if (f.sure) p.push('필중'); if (f.noCounter) p.push('반격 불가'); if (f.magic) p.push('마법 피해');
    if (f.pierce) p.push('방어 ' + f.pierce + '% 무시'); if (f.drain) p.push('피해의 ' + f.drain + '% 흡수'); if (f.mult) p.push('피해 ×' + f.mult); if (f.block) p.push('받는 피해 ' + f.block + '% 감소'); if (f.regen) p.push('턴 시작 시 HP +' + f.regen);
    if (sk.range) p.push('사거리 ' + sk.range[0] + '–' + sk.range[1]);
    return p.join(' · ');
  }

  // ready-made layouts the model may use as they are, alter, or only look at
  const MAPS = {
    '평원': { indoor: false, about: 'open field, a few trees; no fixed sides', rows: '............/..f......f../............/.....ff...../............/...f....f.../............/..f......f../............'.split('/'), alts: ['............/....f......./.........ff./..ff......../............/.......f..../.f........../.........f../....f.......'.split('/'), '............/.f........f./....ff....../............/......f...../............/..f....ff.../..........f./............'.split('/')] },
    '숲길': { indoor: false, about: 'thick woods on all edges, open road north-south through the middle', rows: 'ffff..ffffff/fff....fffff/ff......f.ff/f....f....../......ff..../..f.......ff/ff.....f.fff/fff......fff/ffff..ffffff'.split('/'), alts: ['fffff..fffff/ffff...fffff/fff.....ffff/ff....f..fff/ff.......fff/fff..f....ff/ffff.....fff/ffff....ffff/fffff..fffff'.split('/'), 'fff...ffffff/ff.....fffff/ff..f....fff/f.........ff/ff......f..f/fff........f/fff...f...ff/ffff.....fff/fffff...ffff'.split('/')] },
    '강과 다리': { indoor: false, about: 'river down columns 5-6, bridges at rows 3 and 7; sides west and east', rows: '....ww....../....ww..f.../.f..bb....../....ww....../....ww...f../....ww....../....bb....../..f.ww....../....ww......'.split('/'), alts: ['.f..ww....../....ww....../....bb...f../....ww.f..../.f..ww....../....ww....../....bb....../....ww...ff./..f.ww......'.split('/'), '....ww...f../..f.ww....../....bb....../....ww....../....ww..f.../.ff.ww....../....bb....../....ww....f./....ww......'.split('/')] },
    '산길': { indoor: false, about: 'mountains in the corners and edges, open pass through the middle with exits north and south', rows: 'mmmm....mmmm/mmm......mmm/mm...f....mm/m..........m/....mm....../m......f...m/mm........mm/mmm......mmm/mmmm....mmmm'.split('/'), alts: ['mmmmm..mmmmm/mmmm....mmmm/mmm...f..mmm/mm........mm/m....mm....m/mm........mm/mmm..f...mmm/mmmm....mmmm/mmmmm..mmmmm'.split('/'), 'mmm.....mmmm/mm.......mmm/m....m....mm/m.........mm/mm...f.....m/mm.........m/mmm...m...mm/mmm......mmm/mmmm....mmmm'.split('/')] },
    '마을': { indoor: false, about: 'four houses at (2-3,2-3) (7-8,2-3) (2-3,6-7) (9-10,6-7), fort tile (5,5), open square between', rows: '............/.##...##..f./.##...##..../............/....F......./.##.....##../.##..f..##../............/............'.split('/'), alts: ['............/.##...##..../.##...##.f../.....f....../....F......./.##.....##../.##.....##../......f...../............'.split('/'), '.f........../.##...##..../.##...##..../..........f./....F......./.##.....##../.##.....##../....f......./............'.split('/')] },
    '성문': { indoor: false, about: 'wall down column 8 with the gate at (8,4)-(8,5); attackers west, defenders east, throne (12,5)', rows: '.......#..../..f....#..../.......#.F../............/.......F...T/.......#.F../.f.....#..../.......#..../.......#....'.split('/'), alts: ['..f....#..../.......#..F./.......#..../............/.......F...T/.......#..../.......#..F./.f.....#..../.......#....'.split('/'), '.......#..../.f.....#..../.......#F.../............/.......F...T/.......#F.../.......#..../...f...#..../.......#....'.split('/')] },
    '폐허': { indoor: false, about: 'open ground with scattered wall stumps and columns', rows: '..p....#..../.......#..p./.##........./....p...##../......p...../.p......p.../...##.....#./..........#./.p....p.....'.split('/'), alts: ['.p......##../............/...##...p.../.........p../.#..p......./.#.......#../......p..#../..p........./........p...'.split('/'), '....p......./.##......p../......#...../..p...#...p./............/.p...p..##../............/...#......p./...#..p.....'.split('/')] },
    '호숫가': { indoor: false, about: 'lake in the middle (columns 5-10, rows 3-6); paths around it north and south', rows: '............/..f........./.....wwww.../....wwwwww../....wwwwww../.....wwww.f./............/.f......f.../............'.split('/'), alts: ['............/.f........f./....wwwww.../....wwwwww../.....wwwww../.....wwww.../..f........./.........f../............'.split('/'), '..f........./............/.....wwww.../....wwwwww../....wwwwww../......www.../.f........../........f.../............'.split('/')] },
    '야영지': { indoor: false, about: 'open west; camp in the east: ring of fort tiles around the command seat (10,5)', rows: '............/.f....f...../........F.../...p......F./.........T../...p......F./........F.../.f....f...../............'.split('/'), alts: ['............/..f........./........F.F./....p......./.......F.T../....p......./........F.F./..f........./............'.split('/'), '.f........../.....f....../.........F../..p.....F.../.........T.F/..p.....F.../.........F../.....f....../.f..........'.split('/')] },
    '부두': { indoor: false, about: 'shore on columns 1-6; three piers at rows 3, 5, 7 over water (columns 7-11), joined along column 11', rows: '......wwwwww/..p...wwwwww/......bbbbbw/......wwwwbw/.p....bbbbbw/......wwwwbw/......bbbbbw/..p...wwwwww/......wwwwww'.split('/'), alts: ['......wwwwww/.p....wwwwww/....p.bbbbbw/......wwwwbw/......bbbbbw/..p...wwwwbw/......bbbbbw/....p.wwwwww/......wwwwww'.split('/'), '......wwwwww/......wwwwww/.pp...bbbbbw/......wwwwbw/......bbbbbw/......wwwwbw/.pp...bbbbbw/......wwwwww/......wwwwww'.split('/')] },
    '알현실': { indoor: true, about: 'walled hall, entrance (1,5), throne (11,5), pillars along rows 3 and 7', rows: '############/#..........#/#.p..p..p..#/#..........#/..........T#/#..........#/#.p..p..p..#/#..........#/############'.split('/'), alts: ['############/#..........#/#..p..p..p.#/#..........#/..........T#/#..........#/#..p..p..p.#/#..........#/############'.split('/'), '############/#..........#/#.p.p.p.p..#/#..........#/..........T#/#..........#/#.p.p.p.p..#/#..........#/############'.split('/')] },
    '지하 감옥': { indoor: true, about: 'walled; cells in the four corners, corridor along row 5', rows: '############/#....#.....#/#....#.....#/#.##...##..#/#..........#/#.##...##..#/#....#.....#/#....#.....#/############'.split('/'), alts: ['############/#...#......#/#...#..#...#/#.###..#.###/#..........#/#.###..#.###/#...#..#...#/#...#......#/############'.split('/'), '############/#....#.....#/#....#.....#/###.##..##.#/#..........#/###.##..##.#/#....#.....#/#....#.....#/############'.split('/')] },
    '동굴': { indoor: true, about: 'walled cave with irregular edges, pool at (9-10,4-5)', rows: '############/#...##....##/#....#.....#/##......ww.#/#..p....ww.#/#.......p..#/##...#.....#/###..##...##/############'.split('/'), alts: ['############/##....#...##/#..........#/#...p...ww.#/##......ww.#/#....#.....#/#..........#/##...##..###/############'.split('/'), '############/#..###....##/#...#......#/#.......ww.#/##.p....ww.#/#..........#/#...##...p.#/##..###...##/############'.split('/')] },
    '저택': { indoor: true, about: 'walled; two north rooms (rows 2-4), wall on row 5 with doors at (3,5) and (8,5), south hall (rows 6-8)', rows: '############/#....#.....#/#.p..#..p..#/#..........#/##.####.####/#..........#/#..p....p..#/#.....#....#/############'.split('/'), alts: ['############/#....#.....#/#..p.#.p...#/#....#.....#/##.####.####/#..........#/#.p......p.#/#....#.....#/############'.split('/'), '############/#.p..#...p.#/#....#.....#/#..........#/##.####.####/#..........#/#...p..p...#/#..........#/############'.split('/')] },
    '창고': { indoor: true, about: 'walled; doors at (1,5) and (12,5), blocks of crates on both sides of the middle aisle (row 5)', rows: '############/#..........#/#.pp..pp...#/#.pp..pp...#/............/#...pp..pp.#/#...pp..pp.#/#..........#/############'.split('/'), alts: ['############/#..........#/#..pp...pp.#/#..pp...pp.#/............/#.pp...pp..#/#.pp...pp..#/#..........#/############'.split('/'), '############/#.pp.......#/#.pp..ppp..#/#..........#/............/#..........#/#..ppp..pp.#/#.......pp.#/############'.split('/')] },
    '하수도': { indoor: true, about: 'walled; water channel down columns 6-7, crossings at rows 4 and 7; sides west and east', rows: '############/#....ww....#/#....ww....#/#....bb....#/#....ww....#/#.p..ww..p.#/#....bb....#/#....ww....#/############'.split('/'), alts: ['############/#.p..ww....#/#....ww....#/#....bb....#/#....ww..p.#/#....ww....#/#....bb....#/#..p.ww....#/############'.split('/'), '############/#....ww....#/#..p.ww.p..#/#....bb....#/#....ww....#/#....ww....#/#....bb....#/#..p.ww.p..#/############'.split('/')] },
    '도심 거리': { indoor: false, about: 'buildings on rows 1-2 and 8-9 with alleys at columns 4-5 and 8-9; street on rows 3-7 with parked cars', rows: '###..##..###/###..##..###/............/..p.....p.../............/....p.....p./............/###..##..###/###..##..###'.split('/'), alts: ['###..##..###/###..##..###/............/.p....p...../............/...p.....p../............/###..##..###/###..##..###'.split('/'), '###..##..###/###..##..###/...p......../............/.p....pp..../............/........p.../###..##..###/###..##..###'.split('/')] },
    '주차장': { indoor: false, about: 'open lot, rows of cars at rows 2, 5 and 8', rows: '............/.p.p.p.p.p../............/............/.p.p.p.p.p../............/............/.p.p.p.p.p../............'.split('/'), alts: ['............/..p.p.p.p.p./............/............/.p.p.p.p.p../............/............/..p.p.p.p.p./............'.split('/'), '............/.pp.pp.pp.../............/............/...pp.pp.pp./............/............/.pp.pp.pp.../............'.split('/')] },
    '사무실': { indoor: true, about: 'walled; two north offices (rows 2-5, door (7,4) between), wall on row 6 with doors at (4,6) and (10,6), south corridor (rows 7-8)', rows: '############/#..p..#..p.#/#.....#....#/#..p.....p.#/#.....#....#/###.#####.##/#..........#/#.p..p..p..#/############'.split('/'), alts: ['############/#.p...#.p..#/#.....#....#/#.p......p.#/#.....#....#/###.#####.##/#..........#/#..p..p..p.#/############'.split('/'), '############/#..p..#....#/#..p..#.pp.#/#..........#/#.....#....#/###.#####.##/#..........#/#p........p#/############'.split('/')] },
    '공원': { indoor: false, about: 'pond in the middle (columns 5-8, rows 3-6), trees toward the corners, open south', rows: '............/.ff......ff./.f...ww...f./....wwww..../....wwww..../.f...ww...f./.ff......ff./............/............'.split('/'), alts: ['.f........f./.ff......ff./.....ww...../....wwww..../....wwww..../.....ww...../.f........f./............/............'.split('/'), '............/ff........ff/f....ww....f/....wwww..../....wwww..../.....ww...../ff........ff/............/............'.split('/')] },
  };
  const MAP_LINES = Object.keys(MAPS).map(k => '- ' + k + (MAPS[k].indoor ? ' [indoor]' : '') + ': ' + MAPS[k].about).join('\n');
  const GEN_PROMPT = `Design one battle for a Fire Emblem style grid tactics game from the roleplay so far. Reply with ONE JSON object only — no prose, no code fence.
{
 "name": "전장 이름 (Korean)",
 "objective": {"type": "rout|boss|survive|seize", "turns": 6},
 "indoor": true,
 "map": ["one string per row, equal length; 8-14 columns, 7-11 rows"],
 "skills": [ {"id":"ascii_id","name":"한국어 이름","desc":"짧은 설명","type":"passive|proc|art","cond":"always|initiating|defending|hp_below_half|hp_full|adjacent_ally|alone|on_cover","mods":{"atk":0,"hit":0,"avo":0,"crit":0,"def":0,"res":0,"spd":0},"flags":{"brave":false,"sure":false,"noCounter":false,"magic":false,"pierce":0,"drain":0,"mult":1,"block":0,"regen":0},"rate":"skl","cd":2,"range":[1,2],"faction":"세력 이름 (faction skills only)"} ],
 "units": [ {"id":"ascii_id","name":"이름","emoji":"🗡️","cls":"직업명","mtype":"foot|armor|horse|fly","level":1,"stats":{"hp":22,"str":7,"mag":1,"skl":8,"spd":9,"lck":5,"def":5,"res":2},"weapons":[{"name":"철의 검","type":"sword|lance|axe|bow|tome|dagger|staff|claw|item","mt":5,"hit":90,"crit":0,"rmin":1,"rmax":1,"eff":["armor"]},{"name":"상처약"}],"skills":["skill_id"],"tags":["dragon"],"asset":"optional image name"} ],
 "place": [ {"ref":"unit id","team":"ally|friend|enemy|third","x":1,"y":1,"ai":"charge|hold|guard","boss":false,"turn":0} ],
 "away": ["saved ally id no longer with the party"],
 "growth": [ {"id":"saved ally id","reason":"무엇이 달라졌는가","stats":{"str":1},"exp":0,"learn":["skill_id"],"forget":[],"weapon":{"name":"...","type":"sword","mt":7,"hit":85}} ]
}
MAP CHARS: . plain | f forest (avo+20 def+1, slow) | m mountain (avo+30 def+2, very slow, no armor/horse) | F fort (avo+20 def+2, heals) | p pillar | w water (fliers only) | b bridge | # wall | T throne (required for "seize"; the boss stands on it).
TERRAIN RULES: every tile is something really in the scene. Over half the map plain; terrain in connected clumps and lines (a wood of 3-6, a wall with a gap, a river with 1-2 crossings), never sprinkled singles; 1-2 chokepoints or cover worth fighting over; everyone can walk to the enemy (no sealed room, no water without a bridge).
- "indoor": true for any interior (hall, dungeon, cave, building, ship, sewer): # walls shape rooms and corridors, cover is p (columns, furniture, crates); never f or m; w only as a pool or canal with b; F barricade; T throne, altar or command seat.
- Wilds: f woods, m cliffs and rubble, w rivers with b; # only for a real structure, p only in ruins.
- Town or modern street: # buildings, p vehicles and stalls, F checkpoint; f only in a park; no m.
MAP PRESETS (12x9; x 1-12 west to east, y 1-9 north to south), optional: give "mapPreset":"<name>" instead of "map" and place units by the description; a unit on a blocked tile moves to the nearest free one. If none fits the place, draw your own "map" — never force a preset.
${MAP_LINES}
STORY FIRST: this is a roleplay, not a balanced match. Odds, numbers and the shape of the fight follow the scene: a desperate stand against waves of reinforcements, an ambush, being surrounded, a chase, or a one-sided fight the party wins without breaking a sweat are all right when the story points there. Do not fall back on the same "party against a few more enemies and a boss" every time; vary the objective, the numbers, where everyone stands and who arrives when.
TEAMS: ally = the party, moved by the player. enemy = their opponents. friend = people fighting beside the party who are not under its command (town guards, an escorted NPC, a rival lending a hand): the game moves them, and losing them does not lose the battle. third = a force against everyone (monsters crashing a duel, a rival gang, a berserk beast): it attacks both sides and both may attack it. Use friend and third only when the story has such people; they are defined in "units" like enemies and take "ai". A rout is won when every enemy and third unit on the field is down, even if reinforcements were still to come.
PLACEMENT: coordinates are 1-based, x from the left, y from the top. Often allies on one side and enemies on the other, 4+ tiles apart, but follow the scene (surrounded, split up, holding a doorway, already face to face); never on w or #. "turn":N (2-30) makes the entry a reinforcement, either team: it is off the map at first and arrives at that tile at the start of its side's phase on turn N — a map edge, door or road is the natural spot. Omit turn for units on the field from the start; the party and its opponents each need at least one of those. ai: charge = advance and attack, hold = attack what comes into reach, guard = never moves. boss:true for objective "boss".
RULES OF THE GAME: damage = str (mag for tomes) + mt − def (res). Double strike at spd +4. Triangle (Fates): sword & tome > axe & bow > lance & dagger > sword & tome. Bows hit only at range 2 and are deadly to fliers. Staves heal mag + mt. A unit next to an ally gets hit +10 and that ally adds a half-damage strike — enemies too, so enemies side by side are stronger.
INVENTORY: "weapons" is the inventory, max 5: weapons, tomes, staves, items. Armory gear needs only its name ({"name":"강철의 검"}): ${Object.keys(CAT).join(', ')}. Other gear needs full fields. Weapons and tomes never wear out; staves ("uses" 8-30) and items (3) are spent. Tomes use mag, range 1-2; daggers (암기) 1-2; "item" restores mt HP to its holder. Give a second weapon when it fits (철의 창 + 투창) and most allies a 상처약.
GAUNTLETS AND GUNS: "claw" is the gauntlet type: outside the triangle, avoid +15 against other weapon types, range 1. Every firearm of any setting is "claw", never "bow": armory guns 권총, 산탄총, 소총, 저격총, 레이저 건 by name, or a story name (리볼버, 머스킷, 기관단총) with full fields — rmin/rmax 1/2 handguns and shotguns, 1/3 rifles, 2/4 sniper rifles. Bullets are physical; only energy, laser or magic guns take "magic":true (hits res).
LEVELS follow Fire Emblem: 1-10 novice, 11-20 seasoned (not yet a veteran), 21-39 veteran (promoted class: 소드마스터, 팔라딘, 제너럴, 현자), 40 hero of legend. Level and class name follow the unit's standing in the story, never the party's level: someone the story calls a master, a general, a legend or the strongest in the world gets the level that standing means (30-40) even when the party is level 1, and a famous veteran is not level 15 because the heroes met them early.
STAT SCALE: about 3 stat points per level. Lv 1: hp 18-24, main stats 6-9, weak 0-4. Lv 10: hp 24-30, main 10-13. Lv 20: hp 30-38, main 15-19. Lv 30: hp 36-46, main 20-25. Lv 40: hp 42-55, main 25-32. Main = the 2-3 stats the class lives on (str+spd swordsman, mag+res mage, str+def knight); the rest clearly lower. Armor trades spd for def. Sheets far above their level are cut down by the game.
PRESET ENEMIES, optional help: (1) as is — {"id":"gob1","preset":"고블린","level":3} and the game builds the sheet for that level; (2) as a base — add "name", "emoji", "asset", "cls", "mtype", "move", "weapons", "skills", "tags" or partial "stats" to replace those parts (산적 renamed "밀수꾼" with a 권총); (3) as a yardstick for a full sheet of your own. Level-1 bodies (hp/str/mag/skl/spd/lck/def/res gear): ${Object.keys(PRE).map(k => k + '[' + PRE[k].set + '] ' + STATS.map(s => PRE[k].stats[s]).join('/') + ' ' + PRE[k].weapons.map(w => w.name).join('+')).join('; ')}.
ENEMIES: these levels are for foes the story has not ranked — rank and file at or 1-2 levels below the party, plain gear (철/강철), no skills; 1-2 elites at party level; a boss 2-4 levels above with better gear and 1-2 skills. A character whose strength the story has established keeps their true level and stats however lopsided the fight; do not shrink them to fit. If that makes a rout impossible, keep it playable another way: objective "survive" (hold out N turns) or "seize", or place them far back with ai "guard". Enemy count is often allies + 1 to 3, but fewer or far more when the scene calls for it (40 place entries at most, reinforcements included). Weapon mt 3-7 to level 10, 6-11 to level 20, 9-15 beyond. Enemies are always defined in "units"; several placed enemies may share one template.
PARTY: USER CHARACTER, when given, is the player's own character and is always placed as an ally (define it in "units" if not saved). saved_allies already exist — place them by "ref" = id and do NOT redefine them; define a new ally only for a roleplay character not saved yet. Place only allies who are with the player in this scene; a saved ally who left the party (parted, sent away, captured, turned, dead) is not placed and its id goes in "away". One marked AWAY stays out unless the story clearly brought them back.
SKILLS: "passive" applies mods/flags while cond holds; "proc" triggers per strike at rate (1-100, or a stat name = that stat as %) with pierce/drain/mult, or block for defense; "art" is a chosen attack with cooldown cd. At most 2-3 skills per unit; most enemies none.
SKILL LIBRARY: saved_skills is shared. Hand out "common" skills by id first, to anyone. Give an "own" skill to another unit whose ability is essentially the same instead of writing a near-duplicate. Define a NEW skill only (a) for a named character's signature ability no saved skill covers — at most 1-2 per battle; (b) for one enemy group (clan, order, cult, species): up to 3-4 skills with "faction":"세력 이름" shared across it, reusing that faction's saved skills first. Rank-and-file enemies never get a new skill of their own.
SKILL POWER by owner level — Novice (1-10): atk/def/res/spd 1-2, hit/avo/crit 5-10, rate 15-25 or one stat, pierce/drain/block 20-30, regen 2-3. Seasoned (11-20): atk/def/res/spd 2-3, hit/avo 10-15, crit 10, pierce/drain/block 30-40, mult 1.3, regen 3-4, art cd 2. Veteran (21-39): atk/def/res/spd 3-5, hit/avo 15-25, crit 15-20, pierce/drain/block 40-60, mult 1.5-2, regen 5-7, brave or sure on an art with cd 3+. Hero (40): atk/def/res/spd 5-6, hit/avo/crit 25-30, pierce/drain 70-100, mult 2-2.5, brave, sure, noCounter, art cd 3-5. Stronger effect = narrower cond, lower rate or longer cd; a negative mod may pay for a bonus (atk +5, def -3). Do NOT default to flat hit/avo/crit +10 or +15 — only for a character who is about precision, evasion or lethal strikes. Build from what the character does: strength atk, wall def/block, duelist spd/brave, drainer drain, armor-breaker pierce, healer or troll regen, magic through a weapon the magic flag, ambusher noCounter. Skills on one unit differ in kind; two units rarely share numbers.
IMAGES: if a name in AVAILABLE_IMAGES clearly depicts a unit (same character name, or an obvious match), set "asset" to that exact name; otherwise omit it, never invent one. Always give a fitting "emoji".
NAMING: weapon, skill and class names follow the official Korean Fire Emblem localization — 철의 검, 강철의 검, 은의 검, 철의 창, 투창, 철의 도끼, 손도끼, 철의 활, 파이어, 선더, 라이브; never contracted (철검, 철창). Invented gear keeps the "재질의 무기" pattern.
GROWTH is optional: include "growth" only if the roleplay since the last battle clearly changed a saved ally (training, new weapon, injury, learned technique). Stat change at most ±3 (hp ±8). Never repeat what an ally's history already lists.`;
  // added to the generation prompt when the battle should not be the scene at hand
  const LATER_PROMPT = `TIME SKIP MODE: do NOT stage the current scene. Invent a believable battle some time AFTER the roleplay shown (hours, days or weeks) that follows from where the story is heading: unfinished business, an enemy introduced or implied, the party's plans, the dangers of where they are going. Stay consistent with what is established. Add "premise": 2-4 Korean sentences — how much time passed, where the party is, why the fight breaks out. The party is whoever would plausibly travel with the player by then. A BATTLE BRIEF from the user is the battle: its opponent, place and timing are fixed; fill in only what it leaves open.`;
  // the other prompts quote the rules they need from the generation prompt, line by line
  const XCOM_PROMPT = `XCOM RULES ARE ON for this battle: walls (#) block every attack from 2 tiles or more, and a unit standing next to a wall, pillar/crate/car (p), mountain or fort is covered from that side (shots at it lose accuracy; shots from an uncovered side crit more). Units can go on overwatch and fire at enemies that move in their sights. So: scatter plenty of p tiles and wall stumps across the map as cover with open lanes between, and start units beside cover. Firearms work by kind — add "gun":"pistol|shotgun|rifle|sniper|auto" to every firearm; the game sets range and magazine itself (pistol 1-3; shotgun 1-3, strongest adjacent; rifle 1-4; sniper 2-6, cannot fire after moving; auto 1-3, fires twice). Guns do not counterattack; melee weapons, bows and magic work as before.`;
  const genLines = re => GEN_PROMPT.split('\n').filter(l => re.test(l)).join('\n');
  const GROWTH_PROMPT = `Keep the character sheets of a Fire Emblem style tactics game in sync with a roleplay. Compare saved_allies with what happened and reply with ONE JSON object only, no prose:
{"skills":[ ...new skill definitions, only if someone learned something new... ],"growth":[{"id":"saved ally id","reason":"한국어로 무엇이 달라졌는가","stats":{"str":1},"exp":0,"learn":["skill_id"],"forget":[],"weapon":{"name":"...","type":"sword|lance|axe|bow|tome|dagger|staff|claw|item","mt":7,"hit":85,"crit":0}}]}
Include only characters whose abilities, gear or condition really changed. Stat change at most ±3 (hp ±8); "exp" 0-300 for meaningful off-battle experience. Never repeat what an ally's history already lists. Nothing changed: {"growth":[]}.
The shape of one skill definition:
${genLines(/^ "skills"/)}
${genLines(/^(GAUNTLETS AND GUNS|SKILLS|SKILL LIBRARY|SKILL POWER|NAMING)/)}`;
  // reroll of one unit: same rules text as battle generation, one sheet out
  const REGEN_PROMPT = `Rebuild the sheet of ONE unit of a Fire Emblem style tactics game so it matches who the character really is in the roleplay. Reply with ONE JSON object only, no prose, no code fence:
{"skills":[ ...new skill definitions, only if the unit needs one not saved yet... ],"unit":{ ...one unit definition... }}
The shapes (one skill definition, one unit definition):
${genLines(/^ "(skills|units)"/)}
current_sheet is being replaced and may be badly wrong (a swordsman built as a mage) — do not start from it. Decide class, movement type, stat spread, inventory and skills from the character's description, the roleplay and the notes. Keep the same "id", "name" and "level", with stats that fit the level; for an enemy keep about the same overall strength.
${genLines(/^(RULES OF THE GAME|INVENTORY|GAUNTLETS AND GUNS|LEVELS follow|STAT SCALE|ENEMIES|SKILLS|SKILL LIBRARY|SKILL POWER|IMAGES|NAMING)/)}`;
  function sheetText(S, id) {
    const d = S.defs[id]; if (!d) return '';
    return 'current_sheet (' + (d.ally ? 'ally' : 'enemy') + ') — id | name | class move | level | ' + STATS.join('/') + ' | inventory | skill ids\n' + sheetLine(S, d) + '\n' + skillLines(S);
  }
  function regen(S, id, j) {
    const d = S.defs[id], o = j && typeof j.unit === 'object' && j.unit ? j.unit : null; if (!d || !o || !o.stats) throw new Error('응답에 유닛 정보가 없습니다.');
    (Array.isArray(j.skills) ? j.skills : []).slice(0, 8).forEach((x, i) => { const s = llmSkill(x, i); if (!S.skills[s.id]) S.skills[s.id] = s; });
    const u = fitLevel(normUnit(Object.assign({}, o, { id: d.id, name: d.name, level: d.level, exp: d.exp, history: d.history, img: d.img, ally: d.ally, away: d.away, asset: txt(o.asset, 80, '') || d.asset }), 0));
    u.id = d.id; u.skills = u.skills.filter(k => S.skills[k]); S.defs[id] = u;
    if (S.battle) for (const z of Object.values(S.battle.units)) if (z.ref === id) { if (z.hp > 0) z.hp = clamp(Math.round(z.hp * u.stats.hp / d.stats.hp), 1, u.stats.hp); z.wi = Math.max(0, u.weapons.findIndex(arm)); z.cd = {}; }
    retro(S, id); return u;
  }
  function demo() {
    return {
      name: '끊어진 수로의 요새', objective: { type: 'boss' },
      map: ['....f...#....',
            '..f.....#..F.',
            '.....ww.p....',
            '..f..ww...f..',
            '.....bb....T.',
            '..f..ww...f..',
            '.....ww.p....',
            '..f.....#..F.',
            '....f...#....'],
      skills: [],
      units: [
        { id: 'arin', name: '아린', emoji: '🛡️', cls: '중기사', mtype: 'armor', stats: { hp: 26, str: 9, mag: 0, skl: 6, spd: 4, lck: 4, def: 11, res: 2 }, weapons: [{ name: '철의 창', type: 'lance', mt: 7, hit: 80 }, { name: '투창', type: 'lance', mt: 5, hit: 65, rmin: 1, rmax: 2 }, { name: '상처약' }], skills: ['pavise'] },
        { id: 'ren', name: '렌', emoji: '⚔️', cls: '검사', stats: { hp: 21, str: 7, mag: 1, skl: 11, spd: 12, lck: 7, def: 5, res: 2 }, weapons: [{ name: '철의 검', type: 'sword', mt: 5, hit: 90 }, { name: '아머킬러', type: 'sword', mt: 6, hit: 80, eff: ['armor'] }, { name: '상처약' }], skills: ['deathblow', 'flurry'] },
        { id: 'sera', name: '세라', emoji: '🧙', cls: '마도사', stats: { hp: 18, str: 1, mag: 9, skl: 8, spd: 8, lck: 6, def: 2, res: 8 }, weapons: [{ name: '파이어', type: 'tome', mt: 5, hit: 90 }, { name: '선더' }], skills: ['luna'] },
        { id: 'mira', name: '미라', emoji: '🏹', cls: '궁수', stats: { hp: 19, str: 7, mag: 0, skl: 10, spd: 9, lck: 6, def: 4, res: 3 }, weapons: [{ name: '철의 활', type: 'bow', mt: 6, hit: 85 }], skills: ['focus'] },
        { id: 'lia', name: '리아', emoji: '✨', cls: '수녀', stats: { hp: 17, str: 0, mag: 7, skl: 5, spd: 7, lck: 9, def: 1, res: 9 }, weapons: [{ name: '라이브', type: 'staff', mt: 6 }] },
        { id: 'raider', name: '약탈자', emoji: '🪓', cls: '산적', stats: { hp: 21, str: 7, mag: 0, skl: 4, spd: 5, lck: 1, def: 3, res: 0 }, weapons: [{ name: '철의 도끼', type: 'axe', mt: 8, hit: 70 }] },
        { id: 'soldier', name: '수비병', emoji: '🔱', cls: '창병', stats: { hp: 22, str: 6, mag: 0, skl: 6, spd: 6, lck: 2, def: 6, res: 1 }, weapons: [{ name: '철의 창', type: 'lance', mt: 7, hit: 80 }] },
        { id: 'sniper', name: '망루 궁수', emoji: '🎯', cls: '궁수', stats: { hp: 18, str: 6, mag: 0, skl: 8, spd: 7, lck: 2, def: 3, res: 1 }, weapons: [{ name: '철의 활', type: 'bow', mt: 6, hit: 85 }] },
        { id: 'rider', name: '기마 척후', emoji: '🐎', cls: '기병', mtype: 'horse', level: 2, stats: { hp: 23, str: 7, mag: 0, skl: 7, spd: 8, lck: 3, def: 5, res: 1 }, weapons: [{ name: '철의 검', type: 'sword', mt: 5, hit: 90 }] },
        { id: 'captain', name: '철갑 대장', emoji: '👹', cls: '장군', mtype: 'armor', level: 4, stats: { hp: 34, str: 11, mag: 0, skl: 7, spd: 4, lck: 4, def: 12, res: 3 }, weapons: [{ name: '강철의 도끼', type: 'axe', mt: 11, hit: 65 }, { name: '손도끼', type: 'axe', mt: 7, hit: 60, rmin: 1, rmax: 2 }], skills: ['wrath', 'renewal'] },
      ],
      place: [
        { ref: 'arin', team: 'ally', x: 3, y: 5 }, { ref: 'ren', team: 'ally', x: 2, y: 4 }, { ref: 'sera', team: 'ally', x: 2, y: 6 }, { ref: 'mira', team: 'ally', x: 1, y: 5 }, { ref: 'lia', team: 'ally', x: 1, y: 4 },
        { ref: 'raider', team: 'enemy', x: 8, y: 4 }, { ref: 'raider', team: 'enemy', x: 8, y: 6 }, { ref: 'soldier', team: 'enemy', x: 9, y: 5, ai: 'hold' },
        { ref: 'sniper', team: 'enemy', x: 12, y: 2, ai: 'hold' }, { ref: 'rider', team: 'enemy', x: 11, y: 8 }, { ref: 'captain', team: 'enemy', x: 12, y: 5, boss: true },
      ],
    };
  }
  // best-effort import of ally sheets from the old Lua module save (chat variable cv_rt_state)
  function importModule(S, old) {
    const names = [], reg = old && old.registry && old.registry.units; if (!reg) return names;
    const allyRefs = new Set(Object.values((old.battle && old.battle.units) || {}).filter(u => u.team === 'ally').map(u => u.ref));
    const km = { sword: 'sword', lance: 'lance', spear: 'lance', axe: 'axe', bow: 'bow', tome: 'tome', magic: 'tome', staff: 'staff' };
    for (const o of Object.values(reg)) {
      if (!o || !o.stats || (allyRefs.size && !allyRefs.has(o.id))) continue;
      const s = o.stats, g = o.growth || {}, w = o.weapon || {};
      const u = normUnit({ id: o.id, name: o.name, emoji: o.emoji, level: o.level, exp: o.exp, history: o.history, mtype: (o.tags || []).includes('flying') ? 'fly' : (o.tags || []).includes('cavalry') ? 'horse' : (o.tags || []).includes('armored') ? 'armor' : 'foot',
        stats: { hp: s.maxhp, str: s.str, mag: s.mag, skl: s.dex, spd: s.spd, lck: s.luck, def: s.def, res: s.res },
        growth: { hp: g.maxhp, str: g.str, mag: g.mag, skl: g.dex, spd: g.spd, lck: g.luck, def: g.def, res: g.res },
        weapons: [{ name: w.name, type: km[w.kind] || (s.mag > s.str ? 'tome' : 'sword'), mt: w.power, hit: w.hit, crit: w.crit, rmin: w.min, rmax: w.max }] }, 0);
      u.ally = true; S.defs[u.id] = u; names.push(u.name);
    }
    return names;
  }

  return { STATS, SL, TERRAIN, MT, MTL, WT, CONDS, OBJ, MAXLV, K, unK, clamp, copy, dist, fresh, log, normSkill, llmSkill, fitLevel, normUnit, normWeapon, alive, terr, uterr, unitAt, reach, pathTo, stops, threat, danger, forecast, options, healAmount,
    actAttack, actHeal, actWait, actSeize, canSeize, allDone, endTurn, runTeam, outcome, loadEncounter, objText, planGrowth, applyGrowth, context, storyNote, digest, mapOf, loadMap, endReplay, MAPS, GUNS, COVER, SIDE, TN, foe, standable, gunOf, wr, ammo, canShoot, coverFrom, travel, actWatch, actReload, XCOM_PROMPT, rosterText, skillText, GEN_PROMPT, LATER_PROMPT, GROWTH_PROMPT, REGEN_PROMPT, sheetText, regen, demo, importModule, utags, snapshot, restart, expRate, PRE, presetUnit, spawn, unspawn, reqLevel, rescale, idOf, ensureBase, arm, CAT, actItem, actGive, mark, pulse, pulseMax, pulseReset, retro, rename, living, est, pairBonus, syncRears, actPair, actSwitch, actDrop };
})();

// ───────────────────────── Host: every Risu API call lives here ─────────────────────────
const HOST = (() => {
  const api = typeof risuai !== 'undefined' ? risuai : (typeof Risuai !== 'undefined' ? Risuai : null);
  const mock = !api; // opened as a plain page: run standalone with localStorage
  let cur = null, ownCall = false, saveTimer = null, shown = false, root = null, bindTimer = null, scanning = false, rescan = () => {}, charFace = null;
  const cfg = { bar: true, aux: false, loreTokens: 6000, noteNow: '', noteLater: '' }; // plugin-wide preferences (not per chat)
  async function chatKey() {
    if (mock) return 'rt2:standalone';
    const ch = await api.getCharacter(); const chat = ch && ch.chats && ch.chats[ch.chatPage];
    return 'rt2:' + ((ch && (ch.chaId || ch.name)) || 'none') + ':' + ((chat && chat.id) || (ch ? ch.chatPage : 0));
  }
  async function read(key) {
    try {
      const raw = mock ? JSON.parse(localStorage.getItem(key) || 'null') : await api.pluginStorage.getItem(key);
      const S = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (S && S.v === 2 && S.defs && S.skills) return S;
    } catch (e) { console.log('Risu Tactics: 저장 읽기 실패', e); }
    return RT.fresh();
  }
  async function state(force) { const key = await chatKey(); if (force || !cur || cur.key !== key) { if (cur && saveTimer) await flush(); cur = { key, S: await read(key) }; } return cur.S; }
  async function flush() { if (!cur) return; clearTimeout(saveTimer); saveTimer = null; const data = JSON.stringify(cur.S); try { if (mock) localStorage.setItem(cur.key, data); else await api.pluginStorage.setItem(cur.key, data); } catch (e) { console.log('Risu Tactics: 저장 실패', e); } }
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 250); }
  function replace(S) { if (cur) cur.S = S; save(); }
  // character images: additional assets and emotion images of the current character, read once and cached
  let assetList = null; const imgCache = new Map();
  const faceKey = s => String(s || '').normalize('NFKC').replace(/\.[a-z0-9]{2,5}$/i, '').toLowerCase().replace(/[\s_.\-]+/g, ' ').trim();
  // true when two names differ by at most one inserted, removed or changed character
  function near(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false; let i = 0, j = 0, d = 0;
    while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++d > 1) return false; if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; } }
    return d + (a.length - i) + (b.length - j) <= 1;
  }
  async function assets(refresh) {
    if (mock) return [];
    if (assetList && !refresh) return assetList;
    const ch = await api.getCharacter(), out = [], seen = new Set();
    const add = a => { if (Array.isArray(a) && typeof a[0] === 'string' && typeof a[1] === 'string' && !seen.has(a[0])) { seen.add(a[0]); out.push({ name: a[0], key: faceKey(a[0]), path: a[1], ext: typeof a[2] === 'string' ? a[2] : '' }); } };
    for (const a of [].concat((ch && ch.additionalAssets) || [], (ch && ch.emotionImages) || [])) add(a);
    try { // images that enabled modules bring along (Risu asks for database read permission)
      const db = await api.getDatabase(['modules', 'enabledModules', 'moduleIntergration']), chat = ch && ch.chats && ch.chats[ch.chatPage];
      const on = new Set([].concat((db && db.enabledModules) || [], (ch && ch.modules) || [], (chat && chat.modules) || [], String((db && db.moduleIntergration) || '').split(',').map(s => s.trim()).filter(Boolean)));
      for (const m of (db && db.modules) || []) if (m && (on.has(m.id) || (m.namespace && on.has(m.namespace)))) for (const a of m.assets || []) add(a);
    } catch (e) { console.log('Risu Tactics: 모듈 에셋을 읽지 못함', e); }
    charFace = ch && typeof ch.image === 'string' && ch.image ? { key: faceKey(ch.name), path: ch.image } : null;
    assetList = out; return out;
  }
  function toUrl(data, ext) {
    if (!data) return null;
    if (typeof data === 'string') return /^(data:|https?:|blob:)/.test(data) ? data : 'data:image/' + (ext || 'png') + ';base64,' + data;
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? data : Array.isArray(data) ? new Uint8Array(data) : data.data ? toUrl(data.data, ext) : null;
    if (typeof bytes === 'string') return bytes;
    return bytes ? URL.createObjectURL(new Blob([bytes], { type: 'image/' + (ext && ext !== 'jpg' ? ext : ext === 'jpg' ? 'jpeg' : 'png') })) : null;
  }
  // find an image for a unit: the asset chosen at generation, an asset named like the unit ("이름" or "이름 default",
  // one typo allowed), or the character's own avatar when the unit is that character
  async function image(asset, name) {
    try {
      const list = await assets(), keys = [asset, name].map(faceKey).filter(Boolean); let hit = null;
      for (const k of keys) { hit = list.find(a => a.key === k) || list.find(a => a.key === k + ' default'); if (hit) break; }
      if (!hit) for (const k of keys) if (k.length >= 5) { hit = list.find(a => near(a.key.replace(/ default$/, ''), k)); if (hit) break; }
      if (!hit && charFace && keys.includes(charFace.key)) hit = { path: charFace.path, ext: '' };
      if (!hit) return null;
      if (!imgCache.has(hit.path)) imgCache.set(hit.path, toUrl(await api.readImage(hit.path), hit.ext));
      return imgCache.get(hit.path);
    } catch (e) { console.log('Risu Tactics: 이미지 읽기 실패', e); return null; }
  }
  // lorebook: the user picks which entries the generators may read
  const loreId = e => String(e.comment || '').trim() + String.fromCharCode(1) + String(e.key || '').trim();
  const arrOf = v => (Array.isArray(v) ? v : []);
  // (after S2D YGO's readLoreEntries) Risu's own list when it has one, else character + chat + enabled-module lorebooks
  async function readLore() {
    try { const l = await api.getCurrentLorebookEntries(); if (Array.isArray(l) && l.length) return l; } catch (e) {}
    try {
      const ch = await api.getCharacter(), chat = ch && ch.chats && ch.chats[ch.chatPage]; if (!ch) return [];
      let mods = [];
      try {
        const db = await api.getDatabase(['modules', 'enabledModules', 'moduleIntergration']);
        const on = new Set([...arrOf(db && db.enabledModules), ...arrOf(chat && chat.modules), ...arrOf(ch.modules), ...String((db && db.moduleIntergration) || '').split(',').map(s => s.trim()).filter(Boolean)]), used = new Set();
        mods = arrOf(db && db.modules).flatMap(m => { if (!m || used.has(m.id) || !(on.has(m.id) || (m.namespace && on.has(m.namespace)))) return []; used.add(m.id); return arrOf(m.lorebook); });
      } catch (e) {}
      return [...arrOf(ch.globalLore), ...arrOf(chat && chat.localLore), ...mods];
    } catch (e) { return []; }
  }
  // (after S2D YGO's estimateLoreTokens) rough count: Latin by half-length, Hangul two a syllable, the rest by byte width
  function loreTokens(s) {
    let n = 0;
    for (const p of String(s).matchAll(/[A-Za-z0-9]+|[가-힣]+|[\s\S]/gu)) { const x = p[0], c = x.codePointAt(0); if (/[A-Za-z0-9]/.test(x[0])) n += Math.ceil(x.length / 2); else if (c >= 44032 && c <= 55203) n += x.length * 2; else n += c <= 127 ? 1 : c <= 2047 ? 2 : c <= 65535 ? 3 : 4; }
    return n;
  }
  async function loreList() {
    if (mock) return []; const out = [];
    for (const e of await readLore()) {
      const content = e && e.mode !== 'folder' && e.type !== 'folder' ? String(e.content || '').trim() : ''; if (!content) continue;
      out.push({ id: loreId(e), name: String(e.comment || '').trim() || String(e.key || '').split(',')[0].trim() || '(이름 없음)', content, tokens: loreTokens(content), always: !!e.alwaysActive, keys: e.useRegex ? [] : String(e.key || '').split(',').concat(String(e.secondkey || '').split(',')).map(k => k.trim().toLowerCase()).filter(k => k.length >= 2) });
    }
    return out;
  }
  // automatic choice: what Risu itself would have active — always-on entries and entries keyed to the recent chat (or to `first`, a name)
  function loreAuto(list, text, first) { const low = String(text || '').toLowerCase() + '\n' + String(first || '').toLowerCase(); return list.filter(e => e.always || e.keys.some(k => low.includes(k))).map(e => e.id); }
  // chosen entries in lorebook order until the token budget runs out; the last one is cut to fit
  function loreText(list, ids, budget) {
    const want = new Set(ids || []), out = []; let left = Math.max(0, Math.round(Number(budget) || 0));
    for (const e of list) {
      if (!want.has(e.id) || left <= 20) continue;
      let body = e.content; const head = '[' + e.name + ']\n', cost = loreTokens(head + body);
      if (cost > left) { let lo = 0, hi = body.length; while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (loreTokens(head + body.slice(0, mid)) <= left) lo = mid; else hi = mid - 1; } body = body.slice(0, lo); if (!body) continue; }
      out.push(head + body); left -= loreTokens(head + body);
    }
    return out.join('\n\n');
  }
  // every persona Risu will show us; when it shows none, at least the one in use
  async function personaList() {
    if (mock) return []; const out = []; let curName = '';
    try { const n = String((await api.parseRisuChat('{{user}}')) || '').trim(); if (n && !n.includes('{{')) curName = n; } catch (e) {}
    try {
      const db = await api.getDatabase(['personas', 'selectedPersona']), sel = db && db.selectedPersona;
      arrOf(db && db.personas).forEach((p, i) => { const name = String((p && p.name) || '').trim(); if (name) out.push({ id: name, name, text: String((p && p.personaPrompt) || '').trim(), cur: i === sel }); });
    } catch (e) {}
    if (!out.length && curName) { let text = ''; try { const p = String((await api.parseRisuChat('{{persona}}')) || '').trim(); if (p && !p.includes('{{')) text = p; } catch (e) {} out.push({ id: curName, name: curName, text, cur: true }); }
    if (!out.some(p => p.cur)) { const c = out.find(p => p.name === curName); if (c) c.cur = true; }
    return out;
  }
  // o.lore: ids of the lorebook entries to hand over
  async function story(o) {
    o = o || {};
    if (mock) return { name: '테스트', desc: '', recent: '', images: [], user: '', persona: '', lore: '' };
    const ch = await api.getCharacter(); const chat = ch.chats[ch.chatPage]; const msgs = (chat && chat.message) || [];
    const recent = msgs.slice(-12).map(m => (m.role === 'user' ? '[User] ' : '[' + ch.name + '] ') + String(m.data || '').replace(/<[^>]{0,400}>/g, '').slice(-1500)).join('\n\n');
    const images = (await assets()).map(a => a.name).slice(0, 150); let user = '', persona = '', lore = '';
    try { const n = String((await api.parseRisuChat('{{user}}')) || '').trim(); if (n && !n.includes('{{')) user = n.slice(0, 80); } catch (e) {}
    let others = '';
    if (Array.isArray(o.persona)) {
      const want = new Set(o.persona), extra = [];
      for (const p of await personaList()) { if (!want.has(p.id) || !p.text) continue; if (p.cur) persona = p.text.slice(0, 2500); else if (extra.length < 6) extra.push('[' + p.name + ']\n' + p.text.slice(0, 2500)); }
      others = extra.join('\n\n');
    } else try { const p = String((await api.parseRisuChat('{{persona}}')) || '').trim(); if (p && !p.includes('{{')) persona = p.slice(0, 2500); } catch (e) {}
    if (o.lore === 'auto') { const list = await loreList(); lore = loreText(list, loreAuto(list, recent, o.match), cfg.loreTokens); }
    else if (Array.isArray(o.lore) && o.lore.length) lore = loreText(await loreList(), o.lore, cfg.loreTokens);
    return { name: ch.name || '', desc: String(ch.desc || '').slice(0, 6000), recent, images, user, persona, others, lore };
  }
  async function llm(messages) {
    if (mock) throw new Error('리수 밖에서는 모델을 호출할 수 없습니다.');
    ownCall = true;
    try {
      const r = await api.runLLMModel({ messages, mode: cfg.aux ? 'otherAx' : 'model', allowPlugins: true });
      const text = typeof r === 'string' ? r : r && typeof r.result === 'string' ? r.result : r && typeof r.content === 'string' ? r.content : null;
      if (text == null || (r && r.type === 'fail')) throw new Error('모델 응답을 받지 못했습니다' + (text ? ': ' + text.slice(0, 300) : '.'));
      return text;
    } finally { ownCall = false; }
  }
  // Risu shows its permission dialog in the main page, underneath a fullscreen plugin window:
  // step out of the way while it asks, then come back.
  async function ask(name) {
    if (mock) return true; const was = shown;
    try { if (was) await api.hideContainer(); return (await api.requestPluginPermission(name)) !== false; }
    catch (e) { console.log('Risu Tactics: 권한 확인 실패', name, e); return true; }
    finally { if (was) await api.showContainer('fullscreen'); }
  }
  // Let the story model answer with the battle record attached (the beforeRequest replacer adds it).
  // The battle result travels as a user message appended to the chat (optional words from the user + a result block).
  // With a user message waiting, pressing Risu's send continues the story; nothing is sent by the plugin itself.
  const TAG = 'risu-tactics-result', OPEN = '<' + TAG + '>', CLOSE = '</' + TAG + '>';
  const BLOCK = new RegExp(OPEN + '[\\s\\S]*?' + CLOSE, 'g');
  const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'rt-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  async function here() {
    const ci = await api.getCurrentCharacterIndex(), hi = await api.getCurrentChatIndex(), chat = ci >= 0 && hi >= 0 ? await api.getChatFromIndex(ci, hi) : null;
    if (!chat || !Array.isArray(chat.message)) throw new Error('현재 채팅을 찾을 수 없습니다.');
    return { ci, hi, chat };
  }
  async function staged() { if (mock) return false; try { const m = (await here()).chat.message.at(-1); return !!m && m.role === 'user' && String(m.data || '').includes(OPEN); } catch (e) { return false; } }
  async function stageResult(summary, note, speech) {
    if (mock) throw new Error('리수 밖에서는 채팅에 넣을 수 없습니다.');
    if (cur && cur.key !== (await chatKey())) throw new Error('이 전투를 시작한 채팅이 아닙니다. 원래 채팅으로 돌아가서 보내세요.');
    const { ci, hi, chat } = await here();
    const block = OPEN + '\n' + JSON.stringify(summary).replace(/</g, '\\u003c') + '\n' + String(note).replace(/</g, '＜') + '\n' + CLOSE;
    const say = String(speech || '').replace(BLOCK, '').trim();
    const row = { role: 'user', data: say ? say + '\n\n' + block : block, chatId: uuid(), time: Date.now() };
    if ((await api.setChatToIndex(ci, hi, { ...chat, message: [...chat.message, row] })) === false) throw new Error('리수가 채팅 저장을 허용하지 않았습니다.');
    return row;
  }
  // in the chat the block shows as a small card instead of raw text
  function showResult(text) {
    if (typeof text !== 'string' || !text.includes(OPEN)) return;
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return text.replace(BLOCK, block => {
      try {
        const r = JSON.parse(block.slice(OPEN.length, -CLOSE.length).trim().split('\n')[0]);
        const tone = r.status === 'victory' ? '#f4dc9c' : r.status === 'defeat' ? '#ff8a96' : '#8fc0ff', label = r.status === 'victory' ? '승리' : r.status === 'defeat' ? '패배' : '진행 중';
        return '<div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin:8px 0;padding:9px 14px;border:1px solid rgba(160,190,230,.22);border-left:3px solid ' + tone + ';border-radius:8px;background:rgba(9,14,26,.9);color:#e6ecf5;font-size:14px;line-height:1.5"><span style="color:#a9b6c8;font-size:12px;letter-spacing:.08em">TACTICS</span><strong style="color:' + tone + ';font-size:16px">' + label + '</strong><span>' + esc(String(r.name || '').slice(0, 40)) + '</span><span style="color:#a9b6c8">' + (Number(r.turn) || 1) + '턴</span></div>';
      } catch (e) { return ''; }
    });
  }
  // older result blocks drop out of requests once a few user turns have passed
  function stripBlock(s) { return typeof s === 'string' && s.includes(OPEN) ? s.replace(BLOCK, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : s; }
  function trimOld(messages, keep) {
    if (!Array.isArray(messages)) return messages; let turns = 0, changed = false; const out = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]; if (!m || m.role !== 'user' || ++turns <= keep) { out.push(m); continue; }
      const c = typeof m.content === 'string' ? stripBlock(m.content) : Array.isArray(m.content) ? m.content.map(p => (typeof p === 'string' ? stripBlock(p) : p && typeof p.text === 'string' ? { ...p, text: stripBlock(p.text) } : p)) : m.content;
      if (typeof m.content === 'string' ? c === m.content : JSON.stringify(c) === JSON.stringify(m.content)) { out.push(m); continue; }
      changed = true; if (c === '') continue; out.push({ ...m, content: c });
    }
    return changed ? out.reverse() : messages;
  }
  function letGo() { try { if (typeof document !== 'undefined' && document.activeElement && document.activeElement.blur) document.activeElement.blur(); if (typeof window !== 'undefined' && window.blur) window.blur(); } catch (e) {} }
  async function manualSend() {
    await flush(); shown = false; letGo(); await api.hideContainer();
    try { const b = root && (await root.querySelector('.button-icon-send')); if (b) { const old = String((await b.getStyleAttribute()) || ''); await b.setStyleAttribute(old + ';box-shadow:0 0 0 3px #ebc36b,0 0 18px 5px #ebc36b80 !important;'); setTimeout(() => { b.setStyleAttribute(old).catch(() => {}); }, 20000); } } catch (e) { console.log(e); }
  }
  // unit library: plugin-wide, so a character made in one chat can be called up in another chat or another bot
  async function libLoad() { try { const v = mock ? localStorage.getItem('rt2:lib') : await api.pluginStorage.getItem('rt2:lib'); const o = typeof v === 'string' ? JSON.parse(v) : v; return o && o.units ? o : { units: {}, off: {} }; } catch (e) { return { units: {}, off: {} }; } }
  async function libSave(lib) { const d = JSON.stringify(lib); if (mock) localStorage.setItem('rt2:lib', d); else await api.pluginStorage.setItem('rt2:lib', d); }
  // auto = the routine save of this chat's allies: it skips units the user removed from the library
  async function libPut(S, ids, auto) {
    const lib = await libLoad(); lib.off = lib.off || {}; let from = '', changed = false;
    try { if (!mock) from = String((await api.getCharacter()).name || ''); } catch (e) {}
    for (const id of ids) {
      const d = S.defs[id]; if (!d || (auto && lib.off[id])) continue;
      const was = lib.units[id]; if (auto && was && was.def && was.def.name !== d.name && was.home !== (cur && cur.key)) continue;
      const sk = {}; for (const k of d.skills.concat(d.later || [])) if (S.skills[k] && S.skills[k].tier !== 'common') sk[k] = S.skills[k];
      const prev = lib.units[id]; if (prev && JSON.stringify([prev.def, prev.skills]) === JSON.stringify([d, sk])) continue;
      lib.units[id] = { def: JSON.parse(JSON.stringify(d)), skills: JSON.parse(JSON.stringify(sk)), at: Date.now(), from, home: cur && cur.key }; delete lib.off[id]; changed = true;
    }
    if (changed) await libSave(lib); return lib;
  }
  async function libDrop(id) { const lib = await libLoad(); lib.off = lib.off || {}; delete lib.units[id]; lib.off[id] = true; await libSave(lib); }
  // battle shelf: plugin-wide like the unit library
  async function mapsLoad() { try { const v = mock ? localStorage.getItem('rt2:maps') : await api.pluginStorage.getItem('rt2:maps'); const o = typeof v === 'string' ? JSON.parse(v) : v; return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  async function mapsSave(o) { const d = JSON.stringify(o); if (mock) localStorage.setItem('rt2:maps', d); else await api.pluginStorage.setItem('rt2:maps', d); }
  async function mapPut(m) {
    const all = await mapsLoad(); let from = ''; try { if (!mock) from = String((await api.getCharacter()).name || ''); } catch (e) {}
    const old = Object.values(all).find(x => x.name === m.name && x.from === from), id = old ? old.id : 'm' + Date.now().toString(36);
    all[id] = { id, name: m.name, from, at: Date.now(), map: m }; await mapsSave(all); return id;
  }
  async function mapDrop(id) { const all = await mapsLoad(); delete all[id]; await mapsSave(all); }
  async function loadCfg() { try { const c = mock ? JSON.parse(localStorage.getItem('rt2:cfg') || 'null') : await api.pluginStorage.getItem('rt2:cfg'); Object.assign(cfg, typeof c === 'string' ? JSON.parse(c) : c || {}); } catch (e) { console.log(e); } }
  async function saveCfg() { try { const d = JSON.stringify(cfg); if (mock) localStorage.setItem('rt2:cfg', d); else await api.pluginStorage.setItem('rt2:cfg', d); } catch (e) { console.log(e); } }
  // ── buttons under the latest character message, placed straight into the chat page ──
  const BTN = 'margin:0;background:#243449;color:#edf4fc;border:1px solid #475972;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;line-height:1.3;';
  async function arr(v) {
    if (!v) return [];
    try { if (typeof api.unwarpSafeArray === 'function') return await api.unwarpSafeArray(v); } catch (e) {}
    const out = [], n = typeof v.length === 'function' ? await v.length() : Number(v.length) || 0;
    for (let i = 0; i < n; i++) out.push(typeof v.at === 'function' ? await v.at(i) : v[i]);
    return out;
  }
  async function scan(open) {
    if (!root || scanning) return; scanning = true;
    try {
      let index = -1;
      if (cfg.bar) {
        const ci = await api.getCurrentCharacterIndex(), hi = await api.getCurrentChatIndex(), chat = ci >= 0 && hi >= 0 ? await api.getChatFromIndex(ci, hi) : null;
        const msgs = chat && Array.isArray(chat.message) ? chat.message : [];
        for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i] && msgs[i].role === 'char') { index = i; break; }
      }
      for (const b of await arr(await root.querySelectorAll('[x-rt-bar]'))) if (Number(await b.getAttribute('x-rt-bar')) !== index) await b.remove();
      if (index < 0) return;
      const row = await root.querySelector('.risu-chat[data-chat-index="' + index + '"]'); if (!row || (await row.querySelector('[x-rt-bar]'))) return;
      const text = await row.querySelector('.chattext'); if (!text) return;
      const bar = await root.createElement('div'); await bar.setAttribute('x-rt-bar', String(index)); await bar.setStyleAttribute('display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 2px;');
      for (const [label, gen, style] of [['⚔ 이 장면으로 전투 생성', true, BTN + 'background:#6b5524;border-color:#e2c374;color:#fff6dc;'], ['Risu Tactics 열기', false, BTN]]) {
        const b = await root.createElement('button'); await b.setAttribute('x-rt-btn', gen ? 'gen' : 'open'); await b.setStyleAttribute(style); await b.setTextContent(label);
        await b.addEventListener('click', () => { Promise.resolve(open(gen)).catch(e => console.log(e)); });
        await bar.appendChild(b);
      }
      await text.appendChild(bar);
    } finally { scanning = false; }
  }
  async function chatBar(open) {
    root = await api.getRootDocument(); if (!root) return;
    rescan = () => { clearTimeout(bindTimer); bindTimer = setTimeout(() => scan(open).catch(e => console.log('Risu Tactics: 채팅 하단 버튼 실패', e)), 250); };
    try { const app = await root.getElementById('app'), obs = await api.createMutationObserver(rescan); if (app) await obs.observe(app, { childList: true, subtree: true }); } catch (e) { console.log(e); }
    const iv = setInterval(rescan, 3000); if (iv && iv.unref) iv.unref();
    rescan();
  }
  // Hand the battle record to the story model on the next normal chat request, once.
  async function install(open) {
    if (mock) return;
    await loadCfg();
    try { await api.registerSetting('Risu Tactics', () => open(false), '⚔️', 'html', 'risu-tactics-setting'); } catch (e) { console.log('Risu Tactics: 설정 메뉴 등록 실패', e); }
    for (const location of ['chat', 'action']) { try { await api.registerButton({ name: 'Risu Tactics', icon: '⚔️', iconType: 'html', location, id: 'risu-tactics-' + location }, () => open(false)); } catch (e) { console.log('Risu Tactics: 버튼 등록 실패', e); } }
    try { await api.addRisuScriptHandler('display', showResult); } catch (e) { console.log('Risu Tactics: 결과 카드 표시를 켜지 못함', e); }
    try { await chatBar(open); } catch (e) { console.log('Risu Tactics: 채팅 하단 버튼을 켜지 못함', e); }
    try {
      await api.addRisuReplacer('beforeRequest', messages => { try { return trimOld(messages, 3); } catch (e) { return messages; } });
      if (typeof api.requestPluginPermission === 'function') await api.requestPluginPermission('replacer');
    } catch (e) { console.log('Risu Tactics: 요청 연동 등록 실패', e); }
  }
  return { mock, cfg, saveCfg, rescan: () => rescan(), prepare: async () => { if (!mock) { try { await assets(true); } catch (e) { console.log(e); } } }, state, save, flush, replace, story, loreList, personaList, libLoad, libPut, libDrop, mapsLoad, mapPut, mapDrop, llm, image, staged, stageResult, manualSend, install,
    show: async () => { if (!mock) { shown = true; await api.showContainer('fullscreen'); } },
    hide: async () => { if (!mock) { shown = false; letGo(); await api.hideContainer(); } } };
})();

// ───────────────────────── UI: runs inside the plugin's own document ─────────────────────────
const UI = (() => {
  if (typeof document === 'undefined') return { open() {} };
  const HW = 34, HH = 17, TS = 50, PAD = 46;
  const TC = { '.': ['#3a4d64', '#34465c'], b: ['#8a6f4a', '#7f6644'], f: ['#2f5a41', '#2a523b'], p: ['#4c586c', '#465165'], m: ['#6b5d4d', '#625546'], F: ['#5d6682', '#555e79'], T: ['#7a6330', '#7a6330'], w: ['#173f63', '#153a5c'], '#': ['#727a8e', '#727a8e'] };
  const DECO = { f: '🌲', m: '⛰️', F: '🏰', T: '👑', p: '🏛️', w: '〰️' };
  const TEAM = { ally: '#62b7ee', enemy: '#ee7c87', friend: '#6fd08c', third: '#e6c453' };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let S = null, built = false, skip = false, touch = false; const IMG = {};
  const face = d => (IMG[d.id] || d.img ? '<img src="' + esc(IMG[d.id] || d.img) + '" alt="">' : esc(d.emoji));
  async function loadImages() {
    if (!S) return; let changed = false;
    for (const d of Object.values(S.defs)) { if (d.img || IMG[d.id]) continue; const url = await HOST.image(d.asset, d.name); if (url) { IMG[d.id] = url; changed = true; } }
    if (changed && S && B()) { for (const u of Object.values(B().units)) { const el = $('u_' + u.id); if (el) el.querySelector('.face').innerHTML = face(D(u)); } syncUnits(); side(); }
  }
  const V = { stage: 'idle', sel: null, from: null, R: null, opt: null, target: null, inspect: null, hover: null, danger: false, tile: null };
  const B = () => S.battle, U = id => (B() ? B().units[id] : null), D = u => S.defs[u.ref];

  const CSS = `
*{box-sizing:border-box} html,body{margin:0;height:100%;background:#0b1018;color:#e9eff7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;overflow:hidden}
button{font:inherit;color:inherit}
#app,#modal{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#top,#board,#cmd,.btn,.unit,.tile{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#app{display:flex;flex-direction:column;height:100%}
#top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;background:#121a27;border-bottom:1px solid #2b3a50}
#top h1{font-size:14px;letter-spacing:2px;color:#f0cd7c;margin:0 6px 0 0}
#title{font-weight:700;color:#f4ecd6}
.pill{background:#1d2b3e;border:1px solid #33455e;border-radius:999px;padding:2px 10px;font-size:12px;color:#c7d4e3;white-space:nowrap}
.pill.win{border-color:#d9b45f;color:#f4dc9c}.pill.lose{border-color:#b5606c;color:#f3b2ba}.pill.foe{border-color:#b5606c;color:#f3b2ba}
.sp{flex:1}
.btn{background:#243449;border:1px solid #475972;border-radius:8px;padding:6px 12px;cursor:pointer;min-height:34px;transition:background .1s}
@media(hover:hover){.btn:hover{background:#31475f;border-color:#dec078}}.btn:active{background:#3a5470;border-color:#dec078}.btn:disabled{opacity:.38;cursor:default;background:#243449;border-color:#475972}
.btn.pri{background:#6b5524;border-color:#e2c374;color:#fff6dc;font-weight:600}@media(hover:hover){.btn.pri:hover{background:#846a2c}}.btn.pri:active{background:#846a2c}
.btn.warn{background:#4a2630;border-color:#b5606c}.btn.on{background:#1f4d70;border-color:#66b9f2}
.btn.sm{min-height:28px;padding:2px 9px;font-size:12px}.btn.wide{display:block;width:100%;text-align:left;margin:5px 0}
.btn small{color:#9db0c7;margin-left:6px}
#main{flex:1;display:flex;min-height:0}
#boardwrap{flex:1;overflow:auto;padding:14px;display:flex}
#stage{margin:auto;transform-origin:0 0}
#board{position:relative}
.tile{position:absolute;margin:0;padding:0;border:0;cursor:pointer}
.tile i,.tile b,.tile u{position:absolute;pointer-events:none}
.iso .tile{width:${HW * 2}px;height:${HH * 2}px;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);background:#1b2636}
.iso .tile u,.iso .tile i,.iso .tile b{left:2px;right:2px;top:1px;bottom:1px;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}
.flat .tile{width:${TS}px;height:${TS}px;background:#1b2636}
.flat .tile u,.flat .tile i,.flat .tile b{left:1px;right:1px;top:1px;bottom:1px;border-radius:4px}
@media(hover:hover){.tile:hover{filter:brightness(1.3)}}
.tile[data-h=mv] i{background:#5fc4ffa0}.tile[data-h=at] i{background:#ff5d6e77}.tile[data-h=tg] i{background:#ffd34daa}.tile[data-h=pr] i{background:#66b9f2aa}.tile[data-h=hl] i{background:#5fe08a88}
.tile[data-d="1"] b{background:#c45cc655}
.tile.cur{background:#f1cd73}.iso .tile.cur u{left:5px;right:5px;top:2.5px;bottom:2.5px}.flat .tile.cur u{left:3px;right:3px;top:3px;bottom:3px}
.wl,.wr{position:absolute;width:${HW}px;height:21px;pointer-events:none}
.wl{transform:skewY(26.565deg);transform-origin:0 0;background:#4c5263}.wr{transform:skewY(-26.565deg);transform-origin:100% 0;background:#3d4353}
.deco{position:absolute;width:30px;text-align:center;font-size:22px;line-height:26px;pointer-events:none;text-shadow:0 2px 3px #000a;opacity:.92}
.unit{position:absolute;width:40px;height:50px;margin:0;padding:0;border:0;background:none;cursor:pointer;transition:left .085s linear,top .085s linear,opacity .3s,transform .12s}
.unit .base{position:absolute;left:3px;top:35px;width:34px;height:14px;border-radius:50%;opacity:.9;box-shadow:0 2px 5px #000b}
.unit .face{position:absolute;left:2px;top:2px;width:36px;height:38px;font-size:29px;line-height:38px;text-align:center;border-radius:10px 10px 13px 13px;overflow:hidden;text-shadow:0 2px 3px #000c}
.unit .face img{width:100%;height:100%;object-fit:cover;display:block}
.unit .hp{position:absolute;left:4px;top:-5px;width:32px;height:5px;background:#3a1c25;border:1px solid #0b1018;border-radius:3px;overflow:hidden}
.unit .hp span{display:block;height:100%;transition:width .25s}
.unit .rr{position:absolute;right:-7px;top:19px;width:21px;height:21px;border-radius:50%;background:#203249;border:1px solid #eed59b;font-size:12px;line-height:19px;text-align:center;overflow:hidden;display:none}.unit .rr img{width:100%;height:100%;object-fit:cover;display:block}
.unit .gg{position:absolute;left:4px;top:1px;width:32px;height:3px;background:#0b1018;border-radius:2px;overflow:hidden;display:none}.unit .gg span{display:block;height:100%;background:#66b9f2}
.unit .mk{position:absolute;right:-5px;top:-9px;font-size:11px;line-height:14px;text-shadow:0 0 3px #000}
.unit.done .face{filter:grayscale(.9) brightness(.65)}.unit.done .base{opacity:.4}
.unit.sel{filter:drop-shadow(0 0 5px #f1cd73)}.unit.sel .face{animation:bob .9s ease-in-out infinite}
.unit.dead{opacity:0;pointer-events:none}
@media(hover:hover){.unit:hover{filter:brightness(1.2) drop-shadow(0 0 4px #fff8)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.pop{position:absolute;width:80px;margin-left:-20px;text-align:center;font-weight:800;font-size:17px;pointer-events:none;text-shadow:0 0 4px #000,0 2px 2px #000;animation:pop .75s ease-out forwards;z-index:9999}
@keyframes pop{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-34px);opacity:0}}
#side{width:290px;overflow:auto;padding:12px;background:#101824;border-left:1px solid #2b3a50}
.card{background:#17212f;border:1px solid #2f4057;border-radius:10px;padding:10px 12px;margin-bottom:10px}
.card h2{margin:0 0 6px;font-size:16px;color:#f0d9a2;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tag{background:#2e3a52;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:400;color:#e9eff7}
.bar{display:flex;align-items:center;gap:6px;font-size:11px;margin:3px 0}.bar small{width:24px;color:#9db0c7}.bar em{font-style:normal;min-width:54px;text-align:right}
.bar span{flex:1;height:7px;background:#0c121b;border-radius:4px;overflow:hidden}.bar span span{display:block;height:100%}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:8px 0 6px}
.stats span{background:#101824;border-radius:6px;padding:3px 0;text-align:center;font-weight:600}.stats small{display:block;font-size:9px;font-weight:400;color:#8ea2ba}
.row{display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0;border-top:1px solid #243247}
.row>:first-child{white-space:nowrap}.row.eq{color:#f4dc9c}.row button{background:none;border:0;padding:0;cursor:pointer;text-align:left}.row button:hover{text-decoration:underline}
.help{font-size:12px;color:#9db0c7;margin:4px 0}
.fc{display:grid;grid-template-columns:1fr 1fr;border:1px solid #78673c;border-radius:10px;overflow:hidden;margin-bottom:8px}
.fc>div{padding:8px 10px}.fc>div:first-child{background:#1c3347}.fc>div:last-child{background:#412832}
.fc b{display:block}.fc small{display:block;color:#c4d1e0;font-size:11px}.fc strong{font-size:18px}
.fc table{width:100%;border-collapse:collapse;margin-top:4px}.fc td{padding:1px 0;font-size:12px}.fc td:last-child{text-align:right;font-weight:700;font-size:15px}
#log{max-height:92px;overflow:auto;padding:6px 14px;background:#0e151f;border-top:1px solid #2b3a50;font-size:12px;color:#b9c7d8}
#log .up{color:#f4dc9c;font-weight:600}#log .ph{color:#6f8299}
#modal{position:fixed;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}
#modal[hidden]{display:none}
.box{background:#121a27;border:1px solid #3a4c65;border-radius:14px;padding:16px;width:min(560px,100%);max-height:90%;overflow:auto}
.box h3{margin:0 0 10px;color:#f0cd7c}.box p{margin:6px 0;white-space:pre-wrap;overflow-wrap:anywhere}
.box textarea{width:100%;min-height:150px;background:#0b1018;color:#e9eff7;border:1px solid #3a4c65;border-radius:8px;padding:8px;font:12px/1.4 ui-monospace,monospace}
.box .acts{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}
.box.ed{width:min(920px,100%);max-height:94%;padding:12px}
.edtop{display:flex;gap:6px;margin-bottom:8px;align-items:center}
.edbody{display:flex;gap:10px;min-height:0}
.edlist{width:170px;flex:none;display:flex;flex-direction:column;gap:4px;max-height:72vh;overflow:auto}
.edlist .btn{text-align:left;min-height:30px;padding:4px 8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.edform{flex:1;min-width:0}
.prebox{display:grid;grid-template-columns:1fr 46px;gap:4px;margin-top:6px;padding-top:6px;border-top:1px solid #2b3a50}.prebox .btn{grid-column:1/3}
.ed h4{margin:10px 0 4px;font-size:12px;color:#8ea2ba;font-weight:600}
.f{display:flex;flex-direction:column;gap:2px;font-size:11px;color:#9db0c7;min-width:0}
.ed input:not([type=checkbox]),.ed select{width:100%;min-width:0;background:#0b1018;color:#e9eff7;border:1px solid #3a4c65;border-radius:6px;padding:5px 6px;font:inherit;font-size:13px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.g8{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}
.wrow{display:grid;grid-template-columns:2fr 1.2fr repeat(7,.7fr) 1.2fr auto auto;gap:4px;align-items:end;margin-bottom:4px}
.chips{display:flex;flex-wrap:wrap;gap:4px 12px}.c{display:flex;align-items:center;gap:4px;font-size:12px;color:#e9eff7}
.grp{display:inline-flex;gap:4px;padding-left:8px;margin-left:4px;border-left:1px solid #2b3a50}
@media(max-width:760px){.edbody{flex-direction:column}.edlist{width:auto;flex-direction:row;flex-wrap:wrap;max-height:92px}.g8{grid-template-columns:repeat(4,1fr)}.wrow{grid-template-columns:repeat(4,1fr)}}
#cmd{max-height:calc(100% - 16px);overflow-y:auto;overscroll-behavior:contain}#cmd .btn{flex:none}
#cmd{position:fixed;z-index:30;display:flex;flex-direction:column;gap:3px;min-width:150px;padding:5px;background:#121a27f2;border:1px solid #78673c;border-radius:10px;box-shadow:0 6px 18px #000a}
#cmd[hidden]{display:none}#cmd .btn{text-align:left;min-height:30px;padding:4px 10px;white-space:nowrap}
.trade{display:grid;grid-template-columns:1fr 1fr;gap:12px}.trade b{display:block;margin-bottom:4px;color:#f0d9a2}
.btn.pulse{border-color:#7fb6e8;color:#cfe6ff}.alts{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}
#banner{position:fixed;left:0;right:0;top:38%;text-align:center;font-size:30px;font-weight:800;letter-spacing:6px;padding:14px;background:linear-gradient(90deg,#0000,#000c,#0000);pointer-events:none;opacity:0;transition:opacity .2s;z-index:40}
#banner.show{opacity:1}
#empty{margin:auto;text-align:center;max-width:420px}#empty b{font-size:26px;color:#f1e3bf}
@media(pointer:coarse){.btn{min-height:40px}.btn.sm{min-height:34px;padding:4px 11px}#cmd{min-width:170px;gap:5px}#cmd .btn{min-height:44px;padding:8px 14px}.row button{padding:6px 0}}
@media(max-width:760px){#top{gap:4px;padding:5px 6px}#top .sp{display:none}#top .btn.sm{min-height:32px;padding:2px 8px}#top .pill{padding:1px 7px;font-size:11px}#title{font-size:13px;max-width:46vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#top .grp{gap:4px}}
@media(max-width:760px){#main{flex-direction:column}#side{width:auto;border-left:0;border-top:1px solid #2b3a50;max-height:44%}#top h1{display:none}}
`;

  function build() {
    if (built) return; built = true;
    if (!document.querySelector('meta[name=viewport]')) { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width,initial-scale=1'; document.head.appendChild(m); }
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    document.body.innerHTML = '<div id="app"><div id="top"></div><div id="main"><div id="boardwrap"><div id="stage"><div id="board"><div id="tiles"></div><div id="units"></div></div></div></div><div id="side"></div></div><div id="log"></div></div><div id="cmd" hidden></div><div id="modal" hidden></div><div id="banner"></div>';
    $('board').addEventListener('click', e => { const t = cellAt(e); if (!t) return; if (touch) { V.tile = { x: +t.dataset.x, y: +t.dataset.y }; V.hover = null; } onCell(+t.dataset.x, +t.dataset.y); });
    document.addEventListener('pointerdown', e => { touch = e.pointerType !== 'mouse'; }, true);
    $('cmd').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) sideAction(b.dataset.a, b.dataset.v); });
    $('boardwrap').addEventListener('scroll', () => cmdDraw());
    $('board').addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const t = e.target.closest('[data-x]'); if (!t) return; const x = +t.dataset.x, y = +t.dataset.y; if (V.tile && V.tile.x === x && V.tile.y === y) return; V.tile = { x, y }; const z = RT.unitAt(B(), x, y); const h = z ? z.id : null; if (h !== V.hover) { V.hover = h; if (V.stage === 'idle') paint(); } side(); });
    $('top').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) topAction(b.dataset.a); });
    $('side').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) sideAction(b.dataset.a, b.dataset.v); });
    $('modal').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (b) edAct(b.dataset.e, b.dataset.v); });
    document.addEventListener('keydown', e => { if (!$('modal').hidden) return; if (e.key === 'Escape') back(); else if (e.key === 'Enter' && V.stage === 'forecast') { e.preventDefault(); sideAction('go'); } else if (e.key === 'Tab') { e.preventDefault(); nextUnit(); } });
    window.addEventListener('resize', () => { if (S) { fit(); cmdDraw(); } });
    document.addEventListener('contextmenu', e => { if (e.target.closest('#board')) { e.preventDefault(); if (!touch) back(); } else if (touch && e.target.closest('button')) e.preventDefault(); });
  }

  // ── modal helpers (the sandbox may block window.confirm/prompt) ──
  function modal(html, wire) { return new Promise(res => { const m = $('modal'); m.innerHTML = '<div class="box">' + html + '</div>'; m.hidden = false; const done = v => { m.hidden = true; m.innerHTML = ''; res(v); }; m.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => done(wire ? wire(b.dataset.r, m) : b.dataset.r))); }); }
  const alertBox = (title, text) => modal('<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p><div class="acts"><button class="btn pri" data-r="ok">확인</button></div>');
  const confirmBox = (title, text, yes) => modal('<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p><div class="acts"><button class="btn" data-r="">취소</button><button class="btn pri" data-r="1">' + esc(yes || '확인') + '</button></div>').then(Boolean);
  const inputBox = (title, help, value, yes) => modal('<h3>' + esc(title) + '</h3><p class="help">' + esc(help) + '</p><textarea id="mi">' + esc(value || '') + '</textarea><div class="acts"><button class="btn" data-r="">취소</button><button class="btn pri" data-r="1">' + esc(yes || '확인') + '</button></div>', (r, m) => (r ? m.querySelector('#mi').value : null));
  function busy(text) { const m = $('modal'); m.innerHTML = '<div class="box"><h3>' + esc(text) + '</h3><p class="help">모델 응답을 기다리는 중입니다…</p></div>'; m.hidden = false; return () => { m.hidden = true; m.innerHTML = ''; }; }
  async function banner(text, color, ms) { const b = $('banner'); b.textContent = text; b.style.color = color; b.classList.add('show'); await sleep(skip ? 0 : ms); b.classList.remove('show'); }

  // ── geometry ──
  function pos(x, y) { const b = B(); return S.flat ? { l: x * TS, t: y * TS + PAD } : { l: (x - y + b.h - 1) * HW, t: (x + y) * HH + PAD }; }
  function upos(x, y) { const p = pos(x, y); return S.flat ? { l: p.l + TS / 2 - 20, t: p.t + TS / 2 - 27 } : { l: p.l + HW - 20, t: p.t + HH - 42 }; }
  const zi = (x, y) => (x + y) * 4;

  const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
  // bring a unit into the visible part of a scrolled board
  function see(id) { const el = $('u_' + id), w = $('boardwrap'); if (!el || !w || !el.getBoundingClientRect) return; const a = el.getBoundingClientRect(), b = w.getBoundingClientRect(); if (!b.width || !b.height) return; if (a.left < b.left + 8 || a.right > b.right - 8) w.scrollLeft += a.left + a.width / 2 - (b.left + b.width / 2); if (a.top < b.top + 8 || a.bottom > b.bottom - 8) w.scrollTop += a.top + a.height / 2 - (b.top + b.height / 2); }
  function fit() {
    const b = B(); if (!b) return; const w = S.flat ? b.w * TS : (b.w + b.h) * HW, h = S.flat ? b.h * TS + PAD + 6 : (b.w + b.h) * HH + PAD + 14;
    const avail = $('boardwrap').clientWidth - 30, sc = S.zoom * Math.max(Math.min(1, avail > 200 ? avail / w : 1), coarse() ? 0.8 : 0);
    V.sc = sc; const stg = $('stage'); stg.style.transform = 'scale(' + sc + ')'; stg.style.width = w * sc + 'px'; stg.style.height = h * sc + 'px';
  }
  // ── rendering ──
  function render() {
    build(); const b = B();
    $('main').style.display = b ? '' : 'none'; $('log').style.display = b ? '' : 'none';
    let e = $('empty');
    if (!b) {
      if (!e) { e = document.createElement('div'); e.id = 'empty'; $('app').insertBefore(e, $('log')); }
      e.style.display = ''; e.innerHTML = '<b>이야기를 전장으로.</b><p class="help">지금까지의 대화로 전장과 적을 만들거나, 샘플 전장으로 규칙을 먼저 익혀 보세요.</p><p><button class="btn pri" id="eg">현재 대화로 전투 생성</button> <button class="btn" id="ed">샘플 전장</button></p>';
      $('eg').onclick = () => generate(); $('ed').onclick = () => loadDemo();
    } else if (e) e.style.display = 'none';
    top(); if (!b) return;
    const bd = $('board'); bd.className = S.flat ? 'flat' : 'iso';
    const w = S.flat ? b.w * TS : (b.w + b.h) * HW, h = S.flat ? b.h * TS + PAD + 6 : (b.w + b.h) * HH + PAD + 14;
    bd.style.width = w + 'px'; bd.style.height = h + 'px';
    fit();
    let t = '';
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const c = b.map[y][x], p = pos(x, y), wall = c === '#' && !S.flat, col = TC[c] || TC['.'], z = zi(x, y);
      if (wall) t += '<span class="wl" style="left:' + p.l + 'px;top:' + (p.t + HH - 20) + 'px;z-index:' + z + '"></span><span class="wr" style="left:' + (p.l + HW) + 'px;top:' + (p.t + HH - 20) + 'px;z-index:' + z + '"></span>';
      t += '<button class="tile" data-x="' + x + '" data-y="' + y + '" id="t' + RT.K(x, y) + '" style="left:' + p.l + 'px;top:' + (p.t - (wall ? 20 : 0)) + 'px;z-index:' + (z + 1) + '"><u style="background:' + col[(x + y) % 2] + '"></u><b></b><i></i></button>';
      if (DECO[c]) t += '<span class="deco" style="left:' + (p.l + (S.flat ? TS / 2 : HW) - 15) + 'px;top:' + (p.t + (S.flat ? 4 : HH - 22)) + 'px;z-index:' + (z + 1) + '">' + DECO[c] + '</span>';
    }
    $('tiles').innerHTML = t; $('units').innerHTML = '';
    for (const u of Object.values(b.units)) if (u.hp > 0 && !u.rearOf) unitEl(u);
    paint(); side(); logView();
    const lead = U(V.sel) || Object.values(b.units).find(u => u.team === 'ally' && u.hp > 0 && !u.rearOf); if (lead) see(lead.id);
  }
  function unitEl(u) {
    let el = $('u_' + u.id); const d = D(u);
    if (!el) { el = document.createElement('button'); el.id = 'u_' + u.id; el.className = 'unit'; el.innerHTML = '<span class="base" style="background:' + TEAM[u.team] + '"></span><span class="face">' + face(d) + '</span><span class="hp"><span></span></span><span class="gg"><span></span></span><span class="rr"></span><span class="mk">' + (u.boss ? '⭐' : '') + '</span>'; $('units').appendChild(el); }
    place(el, u.x, u.y); hpBar(el, u.hp, d.stats.hp); el.querySelector('.mk').textContent = (u.boss ? '⭐' : '') + (u.ow ? '👁' : '');
    const rr = el.querySelector('.rr'), gg = el.querySelector('.gg'), rear = u.rear && U(u.rear);
    rr.style.display = gg.style.display = rear ? 'block' : 'none'; if (rear) { rr.innerHTML = face(D(rear)); gg.firstChild.style.width = Math.min(100, (u.gauge || 0) * 10) + '%'; gg.firstChild.style.background = (u.gauge || 0) >= 10 ? '#ffe08a' : '#66b9f2'; }
    el.classList.toggle('done', u.team === 'ally' && u.done && B().status === 'active' && B().phase === 'ally');
    el.classList.toggle('sel', V.sel === u.id); el.classList.toggle('dead', u.hp <= 0);
    return el;
  }
  function place(el, x, y) { const p = upos(x, y); el.style.left = p.l + 'px'; el.style.top = p.t + 'px'; el.style.zIndex = zi(x, y) + 2; el.dataset.x = x; el.dataset.y = y; }
  function hpBar(el, hp, max) { const r = Math.max(0, Math.round(hp * 100 / max)), s = el.querySelector('.hp span'); s.style.width = r + '%'; s.style.background = r > 50 ? '#7fd6a0' : r > 25 ? '#e8c55a' : '#ef6b6b'; }
  function syncUnits() { for (const u of Object.values(B().units)) { const el = $('u_' + u.id); if (u.hp > 0 && !u.rearOf) unitEl(u); else if (el && u.rearOf) el.remove(); else if (el) el.classList.add('dead'); } }
  // highlights only: cheap enough to run on every hover
  function paint() {
    const b = B(); if (!b) return; const hl = new Map(); let dz = null;
    const u = U(V.sel);
    if (u && V.stage === 'move') { const th = RT.threat(S, u, V.R); for (const k of th) hl.set(k, 'at'); for (const k of RT.stops(S, u, V.R)) hl.set(k, 'mv'); }
    else if (u && (V.stage === 'target' || V.stage === 'forecast') && V.opt) for (const id of V.opt.targets) { if (V.opt.kind === 'drop') { hl.set(id, 'pr'); continue; } const z = U(id); hl.set(RT.K(z.x, z.y), V.opt.kind === 'heal' ? 'hl' : V.opt.kind === 'pair' || V.opt.kind === 'trade' ? 'pr' : 'tg'); }
    else if (V.stage === 'idle') { const z = U(V.hover) || U(V.inspect); if (z && z.hp > 0) { const R = RT.reach(S, z); for (const k of RT.threat(S, z, R)) hl.set(k, 'at'); for (const k of RT.stops(S, z, R)) hl.set(k, 'mv'); } }
    if (V.danger) dz = RT.danger(S, 'enemy');
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const k = RT.K(x, y), el = $('t' + k); el.dataset.h = hl.get(k) || ''; el.dataset.d = dz && dz.has(k) ? '1' : ''; el.classList.toggle('cur', !!u && u.x === x && u.y === y); }
    for (const z of Object.values(b.units)) { const el = $('u_' + z.id); if (el) el.classList.toggle('sel', V.sel === z.id); }
  }
  function top() {
    const b = B(); let h = '<h1>RISU TACTICS</h1>';
    if (b) {
      const st = b.status === 'active' ? (b.phase === 'ally' ? '<span class="pill">아군 턴</span>' : '<span class="pill foe">적군 턴</span>') : b.status === 'victory' ? '<span class="pill win">승리</span>' : '<span class="pill lose">패배</span>';
      h += '<span id="title">' + esc(b.name) + '</span><span class="pill">목표 ' + esc(RT.objText(b)) + '</span><span class="pill">' + b.turn + '턴</span>' + st;
    }
    h += '<span class="sp"></span><button class="btn sm" data-a="mBattle">전투</button><button class="btn sm" data-a="mStory">이야기</button><button class="btn sm" data-a="edit">편집</button><button class="btn sm" data-a="mSet">설정</button>';
    if (b) h += '<span class="grp"><button class="btn sm' + (V.danger ? ' on' : '') + '" data-a="danger">위험 범위</button><button class="btn sm" data-a="flat">' + (S.flat ? '입체' : '평면') + '</button><button class="btn sm" data-a="zo">−</button><button class="btn sm" data-a="zi">＋</button></span>' + (RT.pulseMax(S) > 0 ? '<button class="btn sm pulse" data-a="pulse"' + (S.pulse > 0 && S.hist && S.hist.length && V.stage !== 'busy' ? '' : ' disabled') + '>천각의 박동 ' + (S.pulse || 0) + '</button>' : '') + '<button class="btn sm warn" data-a="end"' + (b.status !== 'active' || V.stage === 'busy' ? ' disabled' : '') + '>턴 종료</button>';
    h += '<button class="btn sm" data-a="close">✕</button>';
    $('top').innerHTML = h;
  }
  const bar = (label, v, max, color) => '<div class="bar"><small>' + label + '</small><span><span style="width:' + Math.max(0, Math.min(100, Math.round(v * 100 / max))) + '%;background:' + color + '"></span></span><em>' + v + ' / ' + max + '</em></div>';
  const rtxt = w => { const r = RT.wr(S, w); return r[0] === r[1] ? r[0] : r[0] + '–' + r[1]; };
  const gunTxt = (w, u) => { const g = S.xcom && RT.gunOf(w), G = g && RT.GUNS[g]; return G ? ' · ' + G.n + ' 탄 ' + RT.ammo(S, u, w) + '/' + G.mag + (G.tip ? ' · ' + G.tip : '') : ''; };
  const covTxt = (x, y) => { if (!S.xcom) return ''; const b = B(), l = [['북', 0, -1], ['남', 0, 1], ['서', -1, 0], ['동', 1, 0]].map(([n, dx, dy]) => { const v = RT.COVER[(b.map[y + dy] || '')[x + dx]]; return v ? n + (v >= 40 ? ' 완전' : ' 반') : ''; }).filter(Boolean); return l.length ? ' · 엄폐 ' + l.join(', ') : ''; };
  const wInfo = (d, w, u) => (RT.gunOf(w) ? '총' : RT.WT[w.type].n) + ' · ' + (w.type === 'item' ? 'HP ' + (w.mt >= 99 ? '전부' : w.mt) + ' 회복' : w.type === 'staff' ? '회복 ' + (d.stats.mag + w.mt) + ' · 사거리 ' + rtxt(w) : '위력 ' + w.mt + ' 명중 ' + w.hit + (w.crit ? ' 필살 ' + w.crit : '') + ' · 사거리 ' + rtxt(w) + (w.magic && w.type !== 'tome' ? ' · 마법 피해' : '') + (w.brave ? ' · 2회 공격' : '') + gunTxt(w, u) + (w.drain ? ' · 흡수' : '') + (w.eff ? ' · 특효 ' + w.eff.map(t => RT.MTL[t] || t).join('/') : ''));
  function unitCard(u, own) {
    const d = D(u), r = u.hp * 100 / d.stats.hp, es = RT.est(S, u), pb = RT.pairBonus(S, u), rear = u.rear && U(u.rear);
    let h = '<div class="card"><h2>' + (d.img ? '' : esc(d.emoji) + ' ') + esc(d.name) + '<span class="tag" style="background:' + TEAM[u.team] + ';color:#0f1722">' + RT.TN[u.team] + '</span><span class="tag">Lv ' + d.level + '</span><span class="tag">' + esc(d.cls) + '</span></h2>';
    h += bar('HP', u.hp, d.stats.hp, r > 50 ? '#7fd6a0' : r > 25 ? '#e8c55a' : '#ef6b6b'); if (u.team === 'ally') h += bar('EXP', d.exp, 100, '#d9b45f');
    h += '<div class="stats">'; for (const k of RT.STATS.slice(1)) h += '<span' + (pb[k] ? ' style="color:#8fd0ff"' : '') + '><small>' + RT.SL[k] + '</small>' + es[k] + '</span>'; h += '<span><small>이동</small>' + d.move + '</span></div>';
    if (rear) h += '<div class="row eq"><span>🛡 방진 · 후위 ' + esc(D(rear).name) + '</span><span class="help" style="margin:0">방어 게이지 ' + (u.gauge || 0) + '/10' + ((u.gauge || 0) >= 10 ? ' · 다음 공격 무효' : '') + '</span></div>';
    d.weapons.forEach((w, i) => { const info = wInfo(d, w, u); h += '<div class="row' + (i === u.wi ? ' eq' : '') + '">' + (own && w.type !== 'item' ? '<button data-a="equip" data-v="' + i + '">' : '<span>') + (i === u.wi && w.type !== 'item' ? '<b style="color:#f4dc9c">E</b> ' : '') + esc(w.name) + (w.max && !RT.arm(w) ? ' <small style="color:' + (w.uses <= 1 ? '#ef8b8b' : '#9db0c7') + '">' + w.uses + '/' + w.max + '</small>' : '') + (own && w.type !== 'item' ? '</button>' : '</span>') + '<span class="help" style="margin:0">' + esc(info) + '</span></div>'; });
    for (const id of d.skills) { const sk = S.skills[id]; if (sk) h += '<div class="row"><span>✦ ' + esc(sk.name) + ((u.cd[id] || 0) > 0 ? ' (' + u.cd[id] + ')' : '') + '</span><span class="help" style="margin:0;text-align:right">' + esc(RT.skillText(sk)) + '</span></div>'; }
    const t = RT.uterr(S, u), tn = RT.terr(B(), u.x, u.y).n;
    h += '<div class="help">' + RT.MTL[d.mtype] + ' · 지형 ' + tn + (t.avo || t.def ? ' (회피+' + t.avo + ' 수비+' + t.def + ')' : '') + (d.mtype === 'fly' ? '' : covTxt(u.x, u.y)) + (u.ow ? ' · 👁 경계 중' : '') + '</div></div>';
    return h;
  }
  function stanceInfo(u, z, f) {
    let h = '';
    for (const [x, y, s] of [[u, z, f.a], [z, u, f.d]]) {
      const n = esc(D(x).name);
      if (s.dual) h += '<div class="help">⚔ 공진 — ' + esc(s.dual.name) + '이(가) ' + n + ' 뒤이어 공격: 피해 ' + s.dual.dmg + ' · 명중 ' + s.dual.hit + '% (' + n + ' 명중 +10)</div>';
      else if (s.can && s.partner && y.rear) h += '<div class="help">🛡 ' + esc(D(y).name) + ' 방진 — ' + esc(s.partner.name) + '의 공진을 막습니다.</div>';
      if (s.gauge != null) h += '<div class="help">🛡 ' + n + ' 방진 게이지 ' + s.gauge + '/10' + (s.gauge >= 10 ? ' — 다음 공격 1회 무효' : '') + '</div>';
    }
    return h;
  }
  function side() {
    const b = B(); if (!b) return; const u = U(V.sel); let h = '';
    if (b.status !== 'active') h += '<div class="card"><h2>' + (b.status === 'victory' ? '🏆 전투 승리' : '💀 전투 패배') + '</h2><div class="help">' + (b.status === 'victory' ? '생존한 아군이 승리 경험치를 받았습니다.' : '천각의 박동으로 시간을 되돌리거나, 처음 배치부터 다시 할 수 있습니다.') + '</div>' + (b.status === 'defeat' && S.pulse > 0 && S.hist && S.hist.length ? '<button class="btn wide pulse" data-a="pulse">천각의 박동 ' + S.pulse + '</button>' : '') + (b.status === 'defeat' && S.start ? '<button class="btn wide pri" data-a="retry">이 전투 다시 하기</button>' : '') + '<button class="btn wide" data-a="narrate">결과를 이야기로 보내기</button><button class="btn wide" data-a="growth">성장 반영</button><button class="btn wide" data-a="generate">새 전투 생성</button></div>';
    if (V.stage === 'forecast' && u && U(V.target)) {
      const z = U(V.target);
      if (V.opt.kind === 'heal') { const amt = Math.min(D(z).stats.hp - z.hp, RT.healAmount(S, u)); h += '<div class="card"><h2>회복 예상</h2><div class="help">' + esc(D(z).name) + ' HP ' + z.hp + ' → ' + (z.hp + amt) + '</div><button class="btn wide pri" data-a="go">회복 확정</button><button class="btn wide" data-a="back">뒤로</button></div>'; }
      else {
        const f = RT.forecast(S, u, z, V.opt.art || null);
        const col = (x, y, s, o) => '<div><b>' + esc(D(x).name) + '</b><small>' + esc(s.w ? s.w.name : '—') + (s.tri > 0 ? ' ▲' : s.tri < 0 ? ' ▼' : '') + (s.eff ? ' 특효' : '') + (s.cover ? ' · ' + s.cover : '') + '</small><table><tr><td>HP</td><td>' + x.hp + ' → ' + Math.max(0, x.hp - o.total) + '</td></tr><tr><td>피해</td><td>' + (s.can ? s.dmg + (s.hits * (s.x2 ? 2 : 1) > 1 ? ' ×' + s.hits * (s.x2 ? 2 : 1) : '') : '—') + '</td></tr><tr><td>명중</td><td>' + (s.can ? s.hit + '%' : '—') + '</td></tr><tr><td>필살</td><td>' + (s.can ? s.crit + '%' : '—') + '</td></tr></table></div>';
        h += '<div class="fc">' + col(u, z, f.a, f.d) + col(z, u, f.d, f.a) + '</div><div class="card">' + (V.opt.art ? '<div class="help">✦ ' + esc(S.skills[V.opt.art].name) + ' — ' + esc(RT.skillText(S.skills[V.opt.art])) + '</div>' : '') + stanceInfo(u, z, f) + alts(z) + '<button class="btn wide pri" data-a="go">공격 확정</button><button class="btn wide" data-a="back">뒤로</button></div>';
      }
    } else if (u && V.stage === 'menu') h += unitCard(u, true);
    else if (u && V.stage === 'target') {    } else if (u && V.stage === 'target') { h += unitCard(u, false) + '<div class="card"><div class="help">' + (V.opt.kind === 'pair' ? '파란 칸의 아군을 고르면 그 아군의 후위가 됩니다. 전위는 후위의 능력치 일부를 받고, 게이지가 차면 공격을 한 번 막습니다. 대신 공진은 쓸 수 없습니다.' : V.opt.kind === 'trade' ? '소지품을 교환할 아군을 고르세요.' : V.opt.kind === 'drop' ? '후위를 내려놓을 파란 칸을 고르세요.' : (V.opt.kind === 'heal' ? '초록' : '노란') + ' 칸의 대상을 고르세요.') + '</div><button class="btn wide" data-a="back">뒤로</button></div>'; }
    else {
      const z = u || U(V.hover) || U(V.inspect);
      if (z && z.hp > 0) h += unitCard(z, false) + (u ? '<div class="card"><div class="help">파란 칸으로 이동하세요. 제자리에서 행동하려면 유닛을 한 번 더 누르세요. 붉은 칸의 적을 누르면 바로 공격 예상이 열립니다.</div><button class="btn wide" data-a="back">선택 해제</button></div>' : '');
      else if (b.status === 'active' && b.premise) h += '<div class="card"><h2>배경</h2><div class="help" style="white-space:pre-wrap">' + esc(b.premise) + '</div></div>';
      else if (b.status === 'active') h += '<div class="card"><h2>조작</h2><div class="help">아군 선택 → 파란 칸으로 이동 → 행동 선택.<br>' + (coarse() ? '적을 누르면 이동·공격 범위가 보입니다.<br>범위 밖 칸을 누르면 선택이 풀립니다.' : '적에 마우스를 올리면 이동·공격 범위가 보입니다.<br>우클릭 또는 Esc로 한 단계 취소합니다.') + '</div></div>';
    }
    if (V.tile && !(V.stage === 'forecast')) { const c = (b.map[V.tile.y] || '')[V.tile.x], t = RT.TERRAIN[c] || RT.TERRAIN['.']; h += '<div class="help">칸 ' + (V.tile.x + 1) + ',' + (V.tile.y + 1) + ' · ' + t.n + (t.avo ? ' · 회피+' + t.avo : '') + (t.def ? ' · 수비+' + t.def : '') + (t.heal ? ' · 턴마다 회복' : '') + (t.c[0] >= 99 ? ' · 통행 불가' : t.c[0] > 1 ? ' · 이동 비용 ' + t.c[0] : '') + (t.c[0] >= 99 ? '' : covTxt(V.tile.x, V.tile.y)) + '</div>'; }
    $('side').innerHTML = h; cmdDraw();
  }
  // other weapons and arts that also reach the chosen target
  function alts(z) { const l = (V.opts || []).map((o, i) => [o, i]).filter(([o]) => o.kind === 'attack' && o.targets.includes(z.id)); return l.length < 2 ? '' : '<div class="alts">' + l.map(([o, i]) => '<button class="btn sm' + (o === V.opt ? ' on' : '') + '" data-a="alt" data-v="' + i + '">' + (o.art ? '✦ ' : '') + esc(o.label) + '</button>').join('') + '</div>'; }
  // the command list opens next to the unit on the board
  function cmdDraw() {
    const c = $('cmd'), u = U(V.sel); if (!c) return;
    if (!u || V.stage !== 'menu' || !V.opts) { c.hidden = true; return; }
    const d = D(u), btn = (cls, a, v, label, off, small) => '<button class="btn' + cls + '" data-a="' + a + '" data-v="' + v + '"' + (off ? ' disabled' : '') + '>' + label + (small ? '<small>' + small + '</small>' : '') + '</button>';
    const atk = V.opts.map((o, i) => [o, i]).filter(([o]) => o.kind === 'attack' && !o.art && o.targets.length);
    let h = '';
    if (V.sub === 'atk') { for (const [o, i] of atk) h += btn(o.wi === u.wi ? ' pri' : '', 'opt', i, '⚔ ' + esc(o.label), false, o.wi === u.wi ? '장비 중' : ''); h += btn('', 'sub', '', '뒤로'); }
    else if (V.sub === 'inv') {
      d.weapons.forEach((w, i) => {
        if (w.type === 'item') { const oi = V.opts.findIndex(o => o.kind === 'item' && o.wi === i); h += btn('', 'opt', oi, '🧪 ' + esc(w.name), oi < 0 || !V.opts[oi].targets.length, w.uses + '/' + w.max); }
        else h += btn(i === u.wi ? ' on' : '', 'equip', i, esc(w.name), i === u.wi, i === u.wi ? '장비 중' : '장비');
      });
      h += btn('', 'sub', '', '뒤로');
    } else {
      if (atk.length) h += btn(' pri', atk.length === 1 ? 'opt' : 'sub', atk.length === 1 ? atk[0][1] : 'atk', '⚔ 공격', false, atk.length === 1 ? esc(atk[0][0].label) : '');
      for (const [i, o] of V.opts.entries()) {
        if (o.kind === 'item' || (o.kind === 'attack' && !o.art) || (!o.targets.length && !o.cd)) continue;
        h += btn('', 'opt', i, (o.kind === 'heal' ? '✚ ' : o.kind === 'trade' ? '⇄ ' : o.kind === 'pair' ? '🛡 ' : o.kind === 'switch' ? '🔄 교대: ' : o.kind === 'drop' ? '↩ ' : o.kind === 'reload' ? '🔃 ' : o.kind === 'watch' ? '👁 ' : '✦ ') + esc(o.label), !o.targets.length, o.cd ? o.cd + '턴 뒤' : esc(o.small || ''));
      }
      if (RT.canSeize(S, u)) h += '<button class="btn pri" data-a="seize">👑 제압</button>';
      h += btn('', 'sub', 'inv', '🎒 소지품') + '<button class="btn" data-a="wait">대기</button><button class="btn" data-a="back">취소</button>';
    }
    c.innerHTML = h; c.hidden = false;
    const r = $('stage').getBoundingClientRect(), p = upos(u.x, u.y), sc = V.sc || 1, w = c.offsetWidth, hh = c.offsetHeight;
    let l = r.left + (p.l + 48) * sc; if (l + w > innerWidth - 8) l = r.left + (p.l - 8) * sc - w;
    c.style.left = RT.clamp(l, 8, Math.max(8, innerWidth - w - 8)) + 'px'; c.style.top = RT.clamp(r.top + (p.t - 6) * sc, 8, Math.max(8, innerHeight - hh - 8)) + 'px';
  }
  function logView() { const l = $('log'); l.innerHTML = S.log.slice(-80).map(e => '<div class="' + (e.text.includes('레벨 업') || e.text.startsWith('전투 ') ? 'up' : /턴$/.test(e.text) ? 'ph' : '') + '">' + esc(e.text) + '</div>').join(''); l.scrollTop = l.scrollHeight; }

  // ── event playback ──
  function popup(id, text, color) { const el = $('u_' + id); if (!el) return; const p = document.createElement('div'); p.className = 'pop'; p.textContent = text; p.style.color = color; p.style.left = el.style.left; p.style.top = (parseFloat(el.style.top) - 16) + 'px'; $('units').appendChild(p); setTimeout(() => p.remove(), 800); }
  async function walk(id, path, ms) { const el = $('u_' + id); if (!el) return; for (const p of path.slice(1)) { place(el, p.x, p.y); await sleep(skip ? 0 : ms); } }
  async function play(ev) {
    V.stage = 'busy'; skip = false; V.queued = null; top(); paint();
    for (const e of ev) {
      if (e.t === 'phase') { await banner({ ally: 'PLAYER PHASE', enemy: 'ENEMY PHASE', friend: 'ALLY PHASE', third: 'OTHER PHASE' }[e.team], TEAM[e.team], 650); for (const el of document.querySelectorAll('.unit.done')) el.classList.remove('done'); }
      else if (e.t === 'move') { see(e.id); await walk(e.id, e.path, 85); see(e.id); }
      else if (e.t === 'strike') {
        see(e.to);
        const a = $('u_' + e.from), d = $('u_' + e.to);
        if (a && d && !skip) { const dx = (parseFloat(d.style.left) - parseFloat(a.style.left)) * 0.35, dy = (parseFloat(d.style.top) - parseFloat(a.style.top)) * 0.35; a.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; await sleep(120); a.style.transform = ''; }
        if (e.dual && !skip) popup(e.from, '공진', '#bfe2ff');
        popup(e.to, e.guard ? '방진!' : e.miss ? 'MISS' : (e.crit ? '필살! ' : '') + e.dmg, e.guard ? '#8fd0ff' : e.miss ? '#c7d4e3' : e.crit ? '#ffd34d' : '#ff7b88');
        if (e.proc) popup(e.from, e.proc, '#bfe2ff'); if (e.block) popup(e.to, e.block, '#bfe2ff');
        const z = U(e.to); if (d && z) hpBar(d, e.hp, D(z).stats.hp);
        if (e.heal) { const x = U(e.from); if (a && x) hpBar(a, e.hpFrom, D(x).stats.hp); }
        await sleep(skip ? 0 : 330);
      } else if (e.t === 'heal') { const el = $('u_' + e.id), z = U(e.id); if (el && z) hpBar(el, e.hp, D(z).stats.hp); popup(e.id, '+' + e.amt, '#7fd6a0'); await sleep(skip ? 0 : 280); }
      else if (e.t === 'break') { popup(e.id, '부서짐', '#c7d4e3'); await sleep(skip ? 0 : 300); }
      else if (e.t === 'spawn') { const z = U(e.id); if (z) { unitEl(z); see(e.id); popup(e.id, '증원', TEAM[z.team]); await sleep(skip ? 0 : 420); } }
      else if (e.t === 'die') { const el = $('u_' + e.id); if (el) el.classList.add('dead'); await sleep(skip ? 0 : 260); }
      else if (e.t === 'front') { const z = U(e.id); if (z && z.hp > 0) unitEl(z); }
      else if (e.t === 'exp' && e.id) popup(e.id, 'EXP +' + e.gain, '#d9b45f');
      else if (e.t === 'level' && e.id) { await sleep(skip ? 0 : 200); popup(e.id, 'LEVEL UP!', '#ffe08a'); await sleep(skip ? 0 : 500); }
      else if (e.t === 'end') await banner(e.status === 'victory' ? 'VICTORY' : 'DEFEAT', e.status === 'victory' ? '#f4dc9c' : '#f3b2ba', 1100);
    }
    V.stage = 'idle'; clearSel(); syncUnits(); top(); paint(); side(); logView();
    if (B() && B().status === 'active' && B().phase === 'ally') { const nx = RT.alive(B()).find(u => u.team === 'ally' && !u.done); if (nx) see(nx.id); }
    const q = V.queued; V.queued = null; if (q && Date.now() - q.at < 1500 && B() && B().status === 'active' && B().phase === 'ally') { const z = RT.unitAt(B(), q.x, q.y); if (z && z.team === 'ally' && !z.done) onCell(q.x, q.y); }
  }

  // ── input ──
  function clearSel() { V.lock = false; V.org = null; V.path = null; V.sub = null; V.sel = null; V.from = null; V.R = null; V.opt = null; V.opts = null; V.target = null; if (V.stage !== 'busy') V.stage = 'idle'; }
  function select(u) { clearSel(); V.sel = u.id; V.from = { x: u.x, y: u.y }; V.R = RT.reach(S, u); V.stage = 'move'; V.inspect = null;
    if (u.lk && u.lk.t === B().turn) { V.org = { x: u.lk.x, y: u.lk.y }; V.lock = true; V.R = new Map([[RT.K(u.x, u.y), { c: 0, p: null }]]); } else delete u.lk;
    paint(); side(); see(u.id); }
  function openMenu(u) { if (V.sel !== u.id) return; V.sub = null; V.opts = RT.options(S, u, V.org || V.from); V.stage = 'menu'; V.opt = null; V.target = null; paint(); side(); }
  async function moveTo(u, x, y) { const path = RT.pathTo(V.R, RT.K(x, y)); V.stage = 'busy'; V.moving = true; u.x = x; u.y = y; V.path = path; skip = false; await walk(u.id, path, touch ? 35 : 55); V.moving = false; V.queued = null; if (V.sel !== u.id) { if (V.stage === 'busy') V.stage = 'idle'; syncUnits(); paint(); side(); return; } V.stage = 'menu'; }
  function restore(u) { if (V.from && (u.x !== V.from.x || u.y !== V.from.y)) { if (RT.standable(S, u, V.from.x, V.from.y)) { u.x = V.from.x; u.y = V.from.y; place($('u_' + u.id), u.x, u.y); } else { const o = V.org || V.from; u.lk = { x: o.x, y: o.y, t: B().turn }; } } V.path = null; }
  function back() {
    if (!S || !B() || V.stage === 'busy') { skip = true; return; }
    const u = U(V.sel);
    if (V.stage === 'forecast' || V.stage === 'target') { V.stage = 'menu'; V.opt = null; V.target = null; }
    else if (V.stage === 'menu' && u) { if (V.sub) { V.sub = null; cmdDraw(); return; } if (V.lock || (V.from && !RT.standable(S, u, V.from.x, V.from.y))) return; restore(u); V.stage = 'move'; V.R = RT.reach(S, u); }
    else { clearSel(); V.inspect = null; }
    paint(); side();
  }
  // a click on the upper part of a standing unit belongs to the highlighted tile behind it
  function cellAt(e) {
    const t = e.target.closest('[data-x]'); if (!t) return null;
    if (t.classList.contains('unit') && !S.flat && V.stage !== 'idle') {
      const r = t.getBoundingClientRect();
      if (e.clientY - r.top < r.height * 0.4) { const under = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList && el.classList.contains('tile')); if (under && (under.dataset.h === 'mv' || under.dataset.h === 'pr') && (under.dataset.x !== t.dataset.x || under.dataset.y !== t.dataset.y)) return under; }
    }
    return t;
  }
  function toForecast() { V.stage = 'forecast'; V.fcAt = Date.now(); paint(); side(); }
  function nextUnit() {
    const b = B(); if (!b || b.status !== 'active' || b.phase !== 'ally' || (V.stage !== 'idle' && V.stage !== 'move')) return;
    const l = RT.alive(b).filter(u => u.team === 'ally' && !u.done); if (!l.length) return;
    const u = l[(l.findIndex(u => u.id === V.sel) + 1) % l.length]; select(u);
  }
  // quick attack: the tile this enemy can be hit from and the weapon that does it best
  function quickBest(u, z) {
    let best = null; const d = D(u), owi = u.wi, ox = u.x, oy = u.y;
    for (const only of [true, false]) { if (best) break; for (const k of RT.stops(S, u, V.R)) { const [tx, ty] = RT.unK(k); u.x = tx; u.y = ty; d.weapons.forEach((w, i) => { const ds = RT.dist(u, z); if ((only && i !== owi) || !RT.arm(w) || !RT.canShoot(S, u, w, z, !!V.org || (!!V.from && (tx !== V.from.x || ty !== V.from.y)))) return; u.wi = i; const f = RT.forecast(S, u, z, null); const sc = f.a.total * f.a.hit - (f.d.can ? f.d.total * f.d.hit : 0) * 0.5 - V.R.get(k).c; if (!best || sc > best.sc) best = { sc, x: tx, y: ty, wi: i }; }); } }
    u.x = ox; u.y = oy; u.wi = owi; return best;
  }
  async function quick(u, z) {
    const best = quickBest(u, z); if (!best) return false;
    if (best.x !== u.x || best.y !== u.y) { restore(u); await moveTo(u, best.x, best.y); if (V.sel !== u.id) return true; }
    u.wi = best.wi; V.opts = RT.options(S, u, V.org || V.from); V.opt = V.opts.find(o => o.kind === 'attack' && !o.art && o.wi === best.wi); V.target = z.id; toForecast(); return true;
  }
  async function onCell(x, y) {
    const b = B(); if (!b) return; if (V.stage === 'busy') { skip = true; V.queued = { x, y, at: Date.now() }; return; }
    const z = RT.unitAt(b, x, y), u = U(V.sel), playable = b.status === 'active' && b.phase === 'ally';
    if (V.stage === 'idle') { if (z && z.team === 'ally' && !z.done && playable) select(z); else { V.inspect = z ? z.id : null; paint(); side(); } return; }
    if (!u) { clearSel(); paint(); side(); return; }
    if (V.stage === 'target' && V.opt.kind === 'drop') { if (V.opt.targets.includes(RT.K(x, y))) return commit(() => RT.actDrop(S, u, x, y)); V.stage = 'menu'; V.opt = null; paint(); side(); return; }
    if (V.stage === 'target' && V.opt.kind === 'trade') { if (z && V.opt.targets.includes(z.id)) return tradeBox(u, z); V.stage = 'menu'; V.opt = null; paint(); side(); return; }
    if (V.stage === 'target' && V.opt.kind === 'pair') { if (z && V.opt.targets.includes(z.id)) return commit(() => RT.actPair(S, u, z)); V.stage = 'menu'; V.opt = null; paint(); side(); return; }
    if (V.stage === 'target' || V.stage === 'forecast') {
      if (z && V.opt.targets.includes(z.id)) {
        // a second click on the same target confirms
        if (V.stage === 'forecast' && z.id === V.target) { if (Date.now() - V.fcAt > 200) sideAction('go'); return; }
        V.target = z.id; return toForecast();
      }
      V.stage = 'menu'; V.opt = null; V.target = null;
    }
    // move or menu: the board stays live, so a move can be redone without stepping back first
    if (z && z.id === u.id) { if (V.stage === 'move') return openMenu(u); paint(); side(); return; }
    if (z && RT.foe(z, u)) {
      const o = V.stage === 'menu' && V.opts.find(o => o.kind === 'attack' && !o.art && o.targets.includes(z.id));
      if (o) { u.wi = o.wi; V.opt = o; V.target = z.id; return toForecast(); }
      if (!(await quick(u, z))) { if (V.stage === 'move') { V.inspect = z.id; clearSel(); } paint(); side(); }
      return;
    }
    if (z && z.team === 'ally' && !z.done) { if (V.lock) return; restore(u); return select(z); }
    if (!z && V.R.has(RT.K(x, y))) { restore(u); await moveTo(u, x, y); return openMenu(u); }
    if (V.stage === 'move') clearSel(); paint(); side();
  }
  // 교환: click an entry to hand it across; once something changed hands the move can no longer be taken back
  async function tradeBox(u, z) {
    let moved = false;
    // with enemies on overwatch the walk is settled before anything changes hands
    if (S.xcom && V.path && V.path.length > 1 && RT.alive(B()).some(e => e.ow && RT.foe(e, u)) && !(await sealMove(u))) return;
    const col = (a, b, k) => '<div><b>' + esc(D(a).name) + '</b>' + (D(a).weapons.map((w, i) => '<button class="btn wide" data-r="' + k + i + '"' + (D(b).weapons.length >= 5 ? ' disabled' : '') + '>' + esc(w.name) + '<small>' + (w.max && !RT.arm(w) ? w.uses + '/' + w.max : '') + '</small></button>').join('') || '<div class="help">없음</div>') + '</div>';
    for (;;) {
      const r = await modal('<h3>교환</h3><div class="trade">' + col(u, z, 'a') + col(z, u, 'b') + '</div><div class="acts"><button class="btn pri" data-r="">닫기</button></div>');
      if (!r) break; if (r[0] === 'a' ? RT.actGive(S, u, z, +r.slice(1)) : RT.actGive(S, z, u, +r.slice(1))) moved = true;
    }
    if (moved) { if (!(await sealMove(u))) return; HOST.save(); }
    V.opts = RT.options(S, u, V.org || V.from); V.stage = 'menu'; V.opt = null; V.target = null; paint(); side();
  }
  // XCOM: enemies on overwatch fire while the unit walks the path it took; false when it fell on the way
  function passWatch(u, ev) {
    const path = V.path; V.path = null; if (!(S.xcom && path && path.length > 1)) return true;
    u.x = path[0].x; u.y = path[0].y; const ok = RT.travel(S, u, path, ev);
    if (ev.some(e => e.t === 'strike')) place($('u_' + u.id), path[0].x, path[0].y); else ev.length = 0; return ok;
  }
  // a move becomes final before the action that ends the turn (a trade): overwatch answers it now. false when the unit can no longer act
  async function sealMove(u) {
    const org = V.org || V.from || { x: u.x, y: u.y }, ev = [], ok = passWatch(u, ev);
    u.lk = { x: org.x, y: org.y, t: B().turn }; if (!ok) u.done = true;
    if (ev.length) { await play(ev); HOST.save(); if (!ok || u.hp <= 0 || u.done || B().status !== 'active') return false; }
    V.sel = u.id; V.org = { x: org.x, y: org.y }; V.lock = true; V.from = { x: u.x, y: u.y }; V.R = new Map([[RT.K(u.x, u.y), { c: 0, p: null }]]); V.path = null; return true;
  }
  async function commit(fn) {
    const u = U(V.sel);
    if (u) { const p = { x: u.x, y: u.y }; if (V.from) { u.x = V.from.x; u.y = V.from.y; } RT.mark(S, D(u).name + ' 행동 전'); u.x = p.x; u.y = p.y; const o = V.org || V.from; if (o) u.mv = { x: o.x, y: o.y }; }
    const ev = [], ok = !u || passWatch(u, ev);
    if (ok) fn(ev); else u.done = true; if (u) { delete u.mv; delete u.lk; } await play(ev); HOST.save();
    if (B().status === 'active' && S.autoEnd && RT.allDone(S)) await endTurn(true);
  }
  async function endTurn(auto) {
    const b = B(); if (!b || b.status !== 'active' || V.stage === 'busy') return;
    if (!auto && !RT.allDone(S) && !(await confirmBox('턴 종료', '아직 행동하지 않은 아군이 있습니다. 턴을 넘길까요?', '턴 종료'))) return;
    const u = U(V.sel); if (u) restore(u); clearSel();
    RT.mark(S, '턴 종료 전'); const ev = []; RT.endTurn(S, ev); await play(ev); HOST.save();
  }
  function sideAction(a, v) {
    const u = U(V.sel);
    if (a === 'back') return back();
    if (a === 'pulse') return pulseMenu();
    if (a === 'retry') return retry(); if (a === 'narrate') return narrate(); if (a === 'growth') return growth(); if (a === 'generate') return generate();
    if (!u || V.stage === 'busy') return;
    if (a === 'sub') { V.sub = v || null; cmdDraw(); }
    else if (a === 'equip') { u.wi = +v; V.opts = RT.options(S, u, V.org || V.from); side(); }
    else if (a === 'alt') { const o = V.opts[+v]; if (o && V.stage === 'forecast') { u.wi = o.wi; V.opt = o; side(); } }
    else if (a === 'opt') {
      const o = V.opts[+v]; if (!o || !o.targets.length) return; V.sub = null;
      if (o.kind === 'switch') { const r = RT.actSwitch(S, u); V.sel = r.id; V.R = new Map([[RT.K(r.x, r.y), { c: 0, p: null }]]); if (u.lk) { r.lk = u.lk; delete u.lk; } syncUnits(); V.opts = RT.options(S, r, V.org || V.from); paint(); side(); return; }
      if (o.kind === 'item') return commit(ev => RT.actItem(S, u, o.wi, ev));
      if (o.kind === 'reload') return commit(() => RT.actReload(S, u, o.wi));
      if (o.kind === 'watch') return commit(() => RT.actWatch(S, u));
      if (o.kind === 'trade' && o.targets.length === 1) return tradeBox(u, U(o.targets[0]));
      if (o.kind === 'pair' || o.kind === 'drop' || o.kind === 'trade') { V.opt = o; V.stage = 'target'; paint(); side(); return; }
      u.wi = o.wi; V.opt = o; V.stage = 'target'; if (o.targets.length === 1) { V.target = o.targets[0]; return toForecast(); } paint(); side();
    }
    else if (a === 'wait') commit(() => RT.actWait(S, u));
    else if (a === 'seize') commit(ev => RT.actSeize(S, u, ev));
    else if (a === 'go') { const z = U(V.target), o = V.opt; if (!z || !o) return; commit(ev => (o.kind === 'heal' ? RT.actHeal(S, u, z, ev) : RT.actAttack(S, u, z, o.art || null, ev))); }
  }
  function topAction(a) {
    if (a === 'close') { const u = U(V.sel); if (u && (V.stage !== 'busy' || V.moving)) restore(u); if (V.moving) { V.stage = 'idle'; skip = true; } clearSel(); syncLib(); HOST.flush(); HOST.hide(); return; }
    if (V.stage === 'busy') return;
    if (['mBattle', 'mStory', 'mSet', 'edit'].includes(a) && S && B()) { const u = U(V.sel); if (u) restore(u); clearSel(); paint(); side(); }
    if (a === 'mBattle') return menuBattle(); if (a === 'mStory') return menuStory(); if (a === 'mSet') return menuSet(); if (a === 'edit') return edOpen();
    if (!B()) return;
    if (a === 'danger') { V.danger = !V.danger; top(); paint(); }
    else if (a === 'flat') { S.flat = !S.flat; HOST.save(); render(); }
    else if (a === 'zi' || a === 'zo') { S.zoom = RT.clamp(Math.round((S.zoom + (a === 'zi' ? 0.15 : -0.15)) * 100) / 100, 0.55, 1.75); HOST.save(); render(); }
    else if (a === 'end') endTurn(false);
    else if (a === 'pulse') pulseMenu();
  }

  // ── menu actions ──
  function parseJson(text) { const t = String(text).replace(/```(?:json)?/gi, ''); const i = t.indexOf('{'), j = t.lastIndexOf('}'); if (i < 0 || j <= i) throw new Error('응답에 JSON이 없습니다.'); return JSON.parse(t.slice(i, j + 1)); }
  const storyText = st => (st.user ? 'USER CHARACTER (the player; always an ally): ' + st.user + (st.persona ? '\n' + st.persona : '') + '\n\n' : '') + (st.others ? 'OTHER CHARACTERS OF THE USER (sheets the user chose to include; they are people of this story and allies unless the roleplay says otherwise):\n' + st.others + '\n\n' : '') + (st.lore ? 'WORLD NOTES:\n' + st.lore + '\n\n' : '') + 'ROLEPLAY SO FAR:\n' + st.recent;
  async function reviewGrowth(next, items) {
    const plan = RT.planGrowth(next, items); if (!plan.length) return false;
    const text = plan.map(g => next.defs[g.id].name + ': ' + g.lines.join(' / ') + '\n   사유: ' + g.reason).join('\n');
    if (!(await confirmBox('RP 성장 반영', text, '적용'))) return false;
    RT.applyGrowth(next, plan); return true;
  }
  function adopt(next) { S = next; HOST.replace(S); clearSel(); V.inspect = null; V.hover = null; render(); loadImages(); }
  async function loadDemo() { if (B() && B().status === 'active' && !(await confirmBox('샘플 전장', '진행 중인 전투를 샘플 전장으로 바꿀까요?'))) return; const next = RT.copy(S); RT.loadEncounter(next, RT.demo()); RT.snapshot(next); adopt(next); }
  async function retry() { if (!S.start) return alertBox('다시 하기', '되돌릴 시작 지점이 없습니다.'); if (!(await confirmBox('이 전투 다시 하기', '전투 시작 시점으로 되돌립니다. 이 전투에서 얻은 경험치도 함께 되돌아갑니다.', '다시 하기'))) return; const next = RT.copy(S); RT.restart(next); RT.log(next, '전투를 처음부터 다시 시작'); next.sent = next.seq; adopt(next); }
  const loreManual = () => S.loreMode === 'manual', loreArg = () => (loreManual() ? S.loreSel || [] : 'auto'), loreLabel = () => (loreManual() ? (S.loreSel || []).length + '개' : '자동');
  const perManual = () => S.perMode === 'manual', perArg = () => (perManual() ? S.perSel || [] : 'auto'), perLabel = () => (perManual() ? (S.perSel || []).length + '개' : '자동');
  async function personaPick() {
    const list = await HOST.personaList(), sel = new Set(S.perSel || []);
    if (!list.length) return alertBox('참고 페르소나', '읽을 수 있는 페르소나가 없습니다.');
    const p = modal('<h3>참고 페르소나</h3><label class="c" style="margin-bottom:8px"><input type="checkbox" id="pa"' + (perManual() ? '' : ' checked') + '>자동 — 지금 쓰는 페르소나</label><div id="pl" style="max-height:50vh;overflow:auto">'
      + list.map((e, i) => '<label class="c" style="padding:4px 0"><input type="checkbox" value="' + i + '"' + (sel.has(e.id) ? ' checked' : '') + '>' + esc(e.name) + (e.cur ? '<small style="color:#f0d9a2;margin-left:6px">사용 중</small>' : '') + '<small style="color:#8ea2ba;margin-left:6px">' + e.text.length + '자</small></label>').join('')
      + '</div><div class="acts"><button class="btn" data-r="">취소</button><button class="btn pri" data-r="ok">확인</button></div>',
      (r, m) => (r === 'ok' ? { auto: m.querySelector('#pa').checked, ids: [...m.querySelectorAll('#pl input:checked')].map(x => list[+x.value].id) } : null));
    const dim = () => { const a = $('pa').checked; $('pl').style.opacity = a ? '.4' : ''; $('pl').style.pointerEvents = a ? 'none' : ''; };
    $('pa').addEventListener('change', dim); dim();
    const r = await p; if (r) { S.perSel = r.ids; S.perMode = r.auto ? 'auto' : 'manual'; HOST.save(); }
  }
  // this chat's allies are kept in the library as they are now
  function syncLib() { try { if (S && !S.back) HOST.libPut(S, Object.values(S.defs).filter(d => d.ally).map(d => d.id), true).catch(e => console.log(e)); } catch (e) { console.log(e); } }
  function takeFromLib(T, u) {
    for (const k in u.skills) if (!T.skills[k]) T.skills[k] = RT.copy(u.skills[k]);
    const d = RT.copy(u.def); d.skills = d.skills.filter(k => T.skills[k]); if (d.later) d.later = d.later.filter(k => T.skills[k]); delete d.away; T.defs[d.id] = d;
    if (T.battle) for (const bu of Object.values(T.battle.units)) if (bu.ref === d.id) { bu.hp = Math.min(bu.hp, d.stats.hp); if (!d.weapons[bu.wi]) bu.wi = 0; }
    return d;
  }
  // library characters the model placed (by id, or by writing a new sheet under the same name) come in with their saved sheet
  function adoptLib(T, j, list) {
    const place = Array.isArray(j.place) ? j.place : []; j.units = Array.isArray(j.units) ? j.units : [];
    for (const u of list) {
      const id = u.def.id, twin = j.units.find(x => x && String(x.name || '').trim() === u.def.name && RT.idOf(x.id, '') !== id);
      if (!place.some(p => p && (RT.idOf(p.ref, '') === id || (twin && RT.idOf(p.ref, '') === RT.idOf(twin.id, ''))))) continue;
      takeFromLib(T, u);
      if (twin) { for (const p of place) if (p && RT.idOf(p.ref, '') === RT.idOf(twin.id, '')) p.ref = id; j.units = j.units.filter(x => x !== twin); }
    }
  }
  async function libBox() {
    ED.open = false;
    for (;;) {
      const lib = await HOST.libLoad(), list = Object.values(lib.units).sort((a, b) => b.at - a.at);
      const r = await modal('<h3>보관함</h3>' + (list.length ? '<div style="max-height:56vh;overflow:auto">' + list.map(u => '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid #243247"><span>' + esc(u.def.emoji) + ' ' + esc(u.def.name) + ' <small style="color:#8ea2ba">Lv ' + u.def.level + ' ' + esc(u.def.cls) + (u.def.ally ? '' : ' · 적') + (u.from ? ' · ' + esc(u.from) : '') + (S.defs[u.def.id] ? ' · 이 채팅에 있음' : '') + '</small></span><span style="white-space:nowrap"><button class="btn sm" data-r="L' + esc(u.def.id) + '">불러오기</button> <button class="btn sm warn" data-r="D' + esc(u.def.id) + '">삭제</button></span></div>').join('') + '</div>' : '<p class="help">보관된 유닛이 없습니다.</p>') + '<div class="acts"><button class="btn pri" data-r="">닫기</button></div>');
      if (!r) break; const id = r.slice(1);
      if (r[0] === 'D') { await HOST.libDrop(id); continue; }
      if (lib.units[id]) { const d = takeFromLib(S, lib.units[id]); delete IMG[d.id]; HOST.save(); ED.tab = 'unit'; ED.id = d.id; break; }
    }
    ED.open = true; edDraw(); loadImages();
  }
  async function rescaleBox(id) {
    ED.open = false; const d = S.defs[id];
    const v = await modal('<h3>' + esc(d.name) + ' 성장 보정</h3><p class="help">맞출 레벨 (지금 Lv ' + d.level + ')</p><input id="mi" type="number" min="1" max="40" value="' + d.level + '" style="width:120px;background:#0b1018;color:#e9eff7;border:1px solid #3a4c65;border-radius:6px;padding:6px 8px;font:inherit"><div class="acts"><button class="btn" data-r="">취소</button><button class="btn pri" data-r="1">보정</button></div>', (r, m) => (r ? m.querySelector('#mi').value : null));
    if (v != null && Number(v) > 0) { RT.rescale(S, id, Number(v)); HOST.save(); }
    ED.open = true; ED.tab = 'unit'; ED.id = id; edDraw();
  }
  async function lorePick() {
    const list = await HOST.loreList(), sel = new Set(S.loreSel || []);
    if (!list.length) return alertBox('참고 로어북', '이 채팅에서 읽을 수 있는 로어북 항목이 없습니다.');
    const p = modal('<h3>참고 로어북</h3><label class="c" style="margin-bottom:8px"><input type="checkbox" id="la"' + (loreManual() ? '' : ' checked') + '>자동 — 항상 활성 항목과 최근 대화에 걸리는 항목</label><label class="c" style="margin-bottom:8px">토큰 한도 <input id="lb" type="number" min="0" step="100" value="' + HOST.cfg.loreTokens + '" style="width:110px;background:#0b1018;color:#e9eff7;border:1px solid #3a4c65;border-radius:6px;padding:5px 8px;font:inherit"><span class="help" id="lt" style="margin:0"></span></label><input id="lf" placeholder="검색" style="width:100%;background:#0b1018;color:#e9eff7;border:1px solid #3a4c65;border-radius:6px;padding:6px 8px;font:inherit"><div id="ll" style="max-height:50vh;overflow:auto;margin-top:8px">'
      + list.map((e, i) => '<label class="c" style="padding:4px 0" data-n="' + esc(e.name.toLowerCase()) + '"><input type="checkbox" value="' + i + '"' + (sel.has(e.id) ? ' checked' : '') + '>' + esc(e.name) + '<small style="color:#8ea2ba;margin-left:6px">' + e.tokens + ' 토큰</small></label>').join('')
      + '</div><div class="acts"><button class="btn" data-r="none">모두 해제</button><button class="btn" data-r="">취소</button><button class="btn pri" data-r="ok">확인</button></div>',
      (r, m) => (r === 'ok' || r === 'none' ? { auto: m.querySelector('#la').checked, ids: r === 'none' ? [] : [...m.querySelectorAll('#ll input:checked')].map(x => list[+x.value].id) } : null));
    const f = $('lf'); if (f) f.addEventListener('input', () => { const q = f.value.trim().toLowerCase(); $('ll').querySelectorAll('label').forEach(l => { l.style.display = !q || l.dataset.n.includes(q) ? '' : 'none'; }); });
    const tot = () => { const n = [...$('ll').querySelectorAll('input:checked')].reduce((a, x) => a + list[+x.value].tokens, 0); const lim = Math.max(0, Math.round(Number($('lb').value) || 0)); $('lt').textContent = '선택 ' + n + ' 토큰' + (n > lim ? ' · 한도를 넘는 부분은 잘림' : ''); };
    const dim = () => { const a = $('la').checked; $('ll').style.opacity = a ? '.4' : ''; $('ll').style.pointerEvents = a ? 'none' : ''; $('lf').disabled = a; $('lt').style.display = a ? 'none' : ''; };
    $('la').addEventListener('change', dim); dim();
    $('ll').addEventListener('change', tot); $('lb').addEventListener('input', tot); tot();
    let lim = HOST.cfg.loreTokens; $('lb').addEventListener('input', () => { lim = Math.max(0, Math.round(Number($('lb').value) || 0)); });
    const r = await p; if (r) { S.loreSel = r.ids; S.loreMode = r.auto ? 'auto' : 'manual'; HOST.save(); if (lim !== HOST.cfg.loreTokens) { HOST.cfg.loreTokens = lim; await HOST.saveCfg(); } }
  }
  // a request box with the lorebook picker on it; what was typed survives a trip to the picker
  async function askBox(title, help, buttons) {
    let text = '';
    for (;;) {
      const r = await modal('<h3>' + title + '</h3><p class="help">' + help + '</p><textarea id="mi" style="min-height:80px">' + esc(text) + '</textarea><button class="btn sm" data-r="lore" style="margin:8px 4px 4px 0">참고 로어북: ' + loreLabel() + '</button><button class="btn sm" data-r="persona" style="margin:8px 0 4px">참고 페르소나: ' + perLabel() + '</button>' + buttons.map(b => '<button class="btn wide' + (b[2] || '') + '" data-r="' + b[0] + '">' + b[1] + '</button>').join('') + '<div class="acts"><button class="btn" data-r="">취소</button></div>', (r, m) => ({ r, text: m.querySelector('#mi').value }));
      text = r.text; if (r.r === 'lore') { await lorePick(); continue; } if (r.r === 'persona') { await personaPick(); continue; }
      return r.r ? { r: r.r, req: text.trim() } : null;
    }
  }
  async function generate() {
    if (B() && B().status === 'active' && !(await confirmBox('전투 생성', '진행 중인 전투를 새 전투로 바꿀까요?'))) return;
    const ask = await askBox('전투 생성', '원하는 전투 (선택) — 예: 숲속 매복, 적은 6명 정도, 흑기사단과 싸우는 전투', [['now', '지금 장면으로 생성', ' pri'], ['later', '시간이 지난 뒤의 전투로 생성'], ['note', '생성 지침 편집']]);
    if (ask && ask.r === 'note') { await editNotes(); return generate(); }
    if (!ask) return; ask.later = ask.r === 'later'; let req = ask.req;
    const S0 = S, base = RT.copy(S); RT.endReplay(base);

    const done = busy('전투 생성 중'); let raw = '';
    try {
      const st = await HOST.story({ lore: loreArg(), persona: perArg() });
      const shelf = Object.values((await HOST.libLoad()).units).filter(u => u.def.ally && !base.defs[u.def.id]).slice(0, 40);
      raw = await HOST.llm([{ role: 'system', content: RT.GEN_PROMPT + (ask.later ? '\n' + RT.LATER_PROMPT : '') + (S.xcom ? '\n' + RT.XCOM_PROMPT : '') + (String(ask.later ? HOST.cfg.noteLater : HOST.cfg.noteNow).trim() ? '\n\nSTANDING INSTRUCTIONS FROM THE USER (apply every time; they outrank the defaults above where they differ):\n' + String(ask.later ? HOST.cfg.noteLater : HOST.cfg.noteNow).trim() : '') + '\n\nCHARACTER / WORLD:\n' + st.desc }, { role: 'user', content: storyText(st) + '\n\nSAVED DATA:\n' + RT.rosterText(base) + (shelf.length ? '\n\nLIBRARY (the user\'s characters from other chats; if one is in this battle, place it by "ref" = id and do not define it — its saved sheet is used):\n' + shelf.map(u => u.def.id + ' | ' + u.def.name + ' | ' + u.def.cls + ' | Lv ' + u.def.level).join('\n') : '') + '\n\nAVAILABLE_IMAGES: ' + JSON.stringify(st.images || []) + (req.trim() ? (ask.later ? '\n\nBATTLE BRIEF FROM THE USER (this decides what the time-skip battle is — who is fought, where, when; build the battle and its premise around it):\n' : '\n\nUSER REQUEST: ') + req.trim() : '') + '\n\nReply with the JSON object only.' }]);
      const j = parseJson(raw), next = RT.copy(base); if (S !== S0) { done(); return; } j.later = ask.later; adoptLib(next, j, shelf); RT.loadEncounter(next, j); done();
      if (j.growth) await reviewGrowth(next, j.growth);
      RT.snapshot(next); adopt(next); syncLib();
    } catch (e) { done(); await alertBox('전투 생성 실패', String(e.message || e) + (raw ? '\n\n받은 응답 앞부분:\n' + raw.slice(0, 600) : '')); }
  }
  // reroll one unit's whole sheet; the editor comes back on the new one so it can be rolled again
  async function regenUnit(id) {
    ED.open = false;
    const r = await askBox(esc(S.defs[id].name) + ' 재생성', '원하는 방향 (선택) — 예: 검을 쓰는 기사, 마법은 못 씀', [['go', '재생성', ' pri']]);
    if (r) {
      const done = busy('재생성 중'); let raw = '';
      try {
        const d = S.defs[id], st = await HOST.story({ lore: loreArg(), persona: perArg(), match: d.name });
        raw = await HOST.llm([{ role: 'system', content: RT.REGEN_PROMPT + '\n\nCHARACTER / WORLD:\n' + st.desc }, { role: 'user', content: storyText(st) + '\n\nUNIT TO REBUILD: ' + d.name + (d.ally ? ' (ally)' : ' (enemy)') + '\n\nCURRENT SHEET AND SAVED SKILLS:\n' + RT.sheetText(S, id) + '\n\nAVAILABLE_IMAGES: ' + JSON.stringify(st.images || []) + (r.req ? '\n\nUSER REQUEST: ' + r.req : '') + '\n\nReply with the JSON object only.' }]);
        RT.regen(S, id, parseJson(raw)); delete IMG[id]; HOST.save(); done();
      } catch (e) { done(); await alertBox('재생성 실패', String(e.message || e) + (raw ? '\n\n받은 응답 앞부분:\n' + raw.slice(0, 600) : '')); }
    }
    ED.open = true; ED.tab = 'unit'; ED.id = id; edDraw(); loadImages();
  }
  async function growth() {
    if (!Object.values(S.defs).some(d => d.ally)) return alertBox('성장 반영', '저장된 아군이 없습니다. 먼저 전투를 한 번 시작하세요.');
    const req = await inputBox('성장 반영', '최근 대화에서 달라진 점을 모델이 찾아 제안합니다. 직접 알려 줄 내용이 있으면 적으세요.', '', '요청'); if (req == null) return;
    const done = busy('성장 검토 중'), S0 = S; let raw = '';
    try {
      const st = await HOST.story({ lore: loreArg(), persona: perArg() });
      raw = await HOST.llm([{ role: 'system', content: RT.GROWTH_PROMPT + '\n\nCHARACTER / WORLD:\n' + st.desc }, { role: 'user', content: storyText(st) + '\n\nSAVED DATA:\n' + RT.rosterText(S) + (req.trim() ? '\n\nUSER NOTE: ' + req.trim() : '') }]);
      if (S !== S0) { done(); return; }
      const j = parseJson(raw), next = RT.copy(S); done();
      (Array.isArray(j.skills) ? j.skills : []).slice(0, 12).forEach((o, i) => { const s = RT.llmSkill(o, i); if (!next.skills[s.id]) next.skills[s.id] = s; });
      if (await reviewGrowth(next, j.growth)) adopt(next); else await alertBox('성장 반영', '적용할 변화가 없습니다.');
    } catch (e) { done(); await alertBox('성장 반영 실패', String(e.message || e) + (raw ? '\n\n받은 응답 앞부분:\n' + raw.slice(0, 600) : '')); }
  }
  // Hand the record to the story: put it in the chat as the user's message, close, and light up Risu's send button.
  async function narrate() {
    const u = U(V.sel); if (u) restore(u); clearSel();
    const note = RT.storyNote(S);
    if (!note) { if (await HOST.staged()) await HOST.manualSend(); return; }
    const say = await inputBox('이야기로 보내기', '함께 보낼 말 (선택)', '', '보내기'); if (say == null) return;
    try { const b = B(); await HOST.stageResult({ name: b.name, status: b.status, turn: b.turn }, note, say); S.sent = S.seq; HOST.save(); syncLib(); await HOST.manualSend(); }
    catch (e) { await alertBox('보내기 실패', String((e && e.message) || e)); }
  }
  async function transfer() {
    const raw = await inputBox('저장 내보내기 / 가져오기', '현재 저장 전체입니다. 복사해 보관하거나, 보관해 둔 저장을 붙여 넣고 가져오기를 누르세요.', JSON.stringify(S), '가져오기'); if (raw == null) return;
    try { const j = JSON.parse(raw); if (!j || j.v !== 2 || !j.defs || !j.skills) throw new Error('Risu Tactics 저장 형식이 아닙니다.'); adopt(j); } catch (e) { await alertBox('가져오기 실패', e.message); }
  }
  const pick = (title, items) => modal('<h3>' + title + '</h3>' + items.map(i => '<button class="btn wide" data-r="' + i[0] + '"' + (i[2] ? ' disabled' : '') + '>' + esc(i[1]) + '</button>').join('') + '<div class="acts"><button class="btn" data-r="">닫기</button></div>');
  async function mapsBox() {
    for (;;) {
      const list = Object.values(await HOST.mapsLoad()).sort((a, b) => b.at - a.at);
      const r = await modal('<h3>저장한 전장</h3>' + (list.length ? '<div style="max-height:56vh;overflow:auto">' + list.map(x => { const b = x.map.battle, us = Object.values(b.units); return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid #243247"><span>' + esc(x.name) + ' <small style="color:#8ea2ba">' + b.w + '×' + b.h + ' · ' + esc(RT.objText(b)) + ' · 아군 ' + us.filter(u => u.team === 'ally').length + ' / 적 ' + us.filter(u => u.team !== 'ally').length + (x.from ? ' · ' + esc(x.from) : '') + '</small></span><span style="white-space:nowrap"><button class="btn sm" data-r="L' + esc(x.id) + '">플레이</button> <button class="btn sm warn" data-r="D' + esc(x.id) + '">삭제</button></span></div>'; }).join('') + '</div>' : '<p class="help">저장한 전장이 없습니다.</p>') + '<label class="c" style="margin-top:8px"><input type="checkbox" id="mg"' + (HOST.cfg.mapGrow ? ' checked' : '') + '>성장 반영</label><div class="acts"><button class="btn pri" data-r="">닫기</button></div>', (r, m) => { const g = m.querySelector('#mg').checked; if (g !== !!HOST.cfg.mapGrow) { HOST.cfg.mapGrow = g; HOST.saveCfg(); } return r; });
      if (!r) return; const id = r.slice(1), x = list.find(z => z.id === id);
      if (r[0] === 'D') { await HOST.mapDrop(id); continue; }
      if (!x) continue;
      if (B() && B().status === 'active' && !(await confirmBox('저장한 전장', '진행 중인 전투를 이 전장으로 바꿀까요?'))) continue;
      try { const next = RT.copy(S); RT.loadMap(next, x.map, !!HOST.cfg.mapGrow); RT.snapshot(next); adopt(next); } catch (e) { await alertBox('불러오기 실패', e.message); }
      return;
    }
  }
  async function menuBattle() {
    const r = await pick('전투', [['generate', '현재 대화로 전투 생성'], ['demo', '샘플 전장'], ['savemap', '이 전장 저장', !B()], ['maps', '저장한 전장'], ['retry', '이 전투 처음부터 다시 하기', !S.start || !B()], ['clear', '현재 전투 지우기', !B()]]);
    if (r === 'generate') generate(); else if (r === 'demo') loadDemo(); else if (r === 'retry') retry();
    else if (r === 'savemap') { const m = RT.mapOf(S); if (m) { await HOST.mapPut(m); mapsBox(); } }
    else if (r === 'maps') mapsBox();
    else if (r === 'clear' && (await confirmBox('전투 지우기', '현재 전투를 지웁니다. 아군의 레벨과 능력치는 남습니다.'))) { const next = RT.copy(S); RT.endReplay(next); next.battle = null; adopt(next); }
  }
  // 천각의 박동: go back to an earlier moment of this battle
  async function pulseMenu() {
    const b = B(); if (!b || !(S.pulse > 0) || V.stage === 'busy') return;
    const u = U(V.sel); if (u) restore(u); clearSel(); paint(); side();
    const now = JSON.stringify(b), pts = (S.hist || []).map((h, i) => [String(i), h.turn + '턴 · ' + h.label]).filter(([i]) => S.hist[+i].battle !== now).reverse();
    if (!pts.length) return;
    const r = await pick('천각의 박동 · 남은 횟수 ' + S.pulse, pts); if (!r) return;
    const next = RT.copy(S); if (!RT.pulse(next, +r)) return; adopt(next); banner('천각의 박동', '#bfe2ff', 800);
  }
  async function menuStory() {
    const r = await pick('이야기', [['narrate', '결과를 이야기로 보내기', !B()], ['growth', '성장 반영 (RP에서 달라진 점)']]);
    if (r === 'narrate') narrate(); else if (r === 'growth') growth();
  }
  async function editNotes() {
    for (;;) {
      const k = await pick('전투 생성 지침', [['noteNow', '지금 장면 전투' + (String(HOST.cfg.noteNow).trim() ? ' (작성됨)' : '')], ['noteLater', '시간이 지난 뒤의 전투' + (String(HOST.cfg.noteLater).trim() ? ' (작성됨)' : '')]]);
      if (!k) return;
      const v = await inputBox(k === 'noteNow' ? '지금 장면 전투 지침' : '시간이 지난 뒤의 전투 지침', '생성할 때마다 AI에게 함께 보냅니다. 비우면 보내지 않습니다.', HOST.cfg[k] || '', '저장');
      if (v != null) { HOST.cfg[k] = v.trim().slice(0, 4000); await HOST.saveCfg(); }
    }
  }
  async function menuSet() {
    for (;;) {
      const r = await pick('설정', [['auto', '모두 행동하면 자동 턴 종료: ' + (S.autoEnd ? '켜짐' : '꺼짐')], ['exp', '전투 경험치: ' + Math.round(RT.expRate(S) * 100) + '%'], ['pulse', '천각의 박동 횟수: ' + RT.pulseMax(S)], ['xcom', '엑스컴 규칙 (엄폐·경계·총기): ' + (S.xcom ? '켜짐' : '꺼짐')], ['bar', '채팅 하단 전투 생성 버튼: ' + (HOST.cfg.bar ? '켜짐' : '꺼짐')], ['lore', '참고 로어북: ' + loreLabel() + ' · 한도 ' + HOST.cfg.loreTokens + ' 토큰'], ['persona', '참고 페르소나: ' + perLabel()], ['note', '전투 생성 지침' + (String(HOST.cfg.noteNow).trim() || String(HOST.cfg.noteLater).trim() ? ' (작성됨)' : '')], ['aux', '전투 생성·성장에 쓸 모델: ' + (HOST.cfg.aux ? '보조 모델' : '주 모델')], ['transfer', '저장 내보내기 / 가져오기']]);
      if (r === 'auto') { S.autoEnd = !S.autoEnd; HOST.save(); }
      else if (r === 'xcom') { S.xcom = !S.xcom; if (!S.xcom && B()) for (const z of Object.values(B().units)) z.ow = false; HOST.save(); syncUnits(); paint(); side(); }
      else if (r === 'exp') { const o = [0.5, 1, 1.5, 2, 3]; S.expRate = o[(o.indexOf(RT.expRate(S)) + 1) % o.length]; HOST.save(); }
      else if (r === 'pulse') { const o = [0, 3, 5, 10]; S.pulseMax = o[(o.indexOf(RT.pulseMax(S)) + 1) % o.length]; S.pulse = S.pulseMax; HOST.save(); top(); }
      else if (r === 'bar') { HOST.cfg.bar = !HOST.cfg.bar; await HOST.saveCfg(); HOST.rescan(); }
      else if (r === 'lore') await lorePick();
      else if (r === 'persona') await personaPick();
      else if (r === 'note') await editNotes();
      else if (r === 'aux') { HOST.cfg.aux = !HOST.cfg.aux; await HOST.saveCfg(); }
      else { if (r === 'transfer') transfer(); return; }
    }
  }

  // ── editor: change any unit or skill by hand ──
  const ED = { tab: 'unit', id: null, open: false };
  const fld = (label, inner) => '<label class="f"><small>' + label + '</small>' + inner + '</label>';
  const inp = (name, val, type, extra) => '<input name="' + name + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '"' + (extra || '') + '>';
  const sel = (name, val, opts) => '<select name="' + name + '">' + opts.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  const chk = (name, on, label) => '<label class="c"><input type="checkbox" name="' + name + '"' + (on ? ' checked' : '') + '>' + esc(label) + '</label>';
  const ML = { atk: '공격', hit: '명중', avo: '회피', crit: '필살', def: '수비', res: '마방', spd: '속도' };
  const inBattle = id => (B() ? Object.values(B().units).filter(u => u.ref === id) : []);
  const TI = { common: '◆ ', faction: '⚑ ', own: '✦ ' }, tierOf = s => s.tier || 'own';
  function skillPick(d) {
    const all = Object.values(S.skills), row = l => '<div class="chips">' + l.map(s => '<span title="' + esc(RT.skillText(s)) + '">' + chk('k_' + s.id, d.skills.includes(s.id), s.name) + '</span>').join('') + '</div>';
    const fac = {}, own = [], rest = [];
    for (const s of all) { if (tierOf(s) === 'faction') (fac[s.faction] = fac[s.faction] || []).push(s); else if (tierOf(s) === 'own') (d.skills.includes(s.id) ? own : rest).push(s); }
    let h = '<h4>기술 (최대 6개) · 범용</h4>' + row(all.filter(s => tierOf(s) === 'common'));
    for (const f in fac) h += '<h4>세력 · ' + esc(f) + '</h4>' + row(fac[f]);
    if (own.length) h += '<h4>전용</h4>' + row(own);
    if (rest.length) h += '<details style="margin-top:8px"><summary class="help" style="cursor:pointer">다른 유닛의 전용 기술 ' + rest.length + '개</summary>' + row(rest) + '</details>';
    return h;
  }
  function unitForm(d) {
    const bu = inBattle(d.id).filter(u => u.hp > 0);
    let h = '<div class="g4">' + fld('이름', inp('name', d.name)) + fld('이모지', inp('emoji', d.emoji)) + fld('직업', inp('cls', d.cls)) + fld('이동 유형', sel('mtype', d.mtype, Object.entries(RT.MTL))) + fld('레벨', inp('level', d.level, 'number')) + fld('경험치', inp('exp', d.exp, 'number')) + fld('이동력', inp('move', d.move, 'number')) + fld('초상화 에셋 이름', inp('asset', d.asset || '')) + '</div>';
    h += '<h4>능력치</h4><div class="g8">' + RT.STATS.map(k => fld(RT.SL[k], inp('s_' + k, d.stats[k], 'number'))).join('') + '</div>';
    h += '<h4>성장률 (%)</h4><div class="g8">' + RT.STATS.map(k => fld(RT.SL[k], inp('g_' + k, d.growth[k], 'number'))).join('') + '</div>';
    if (bu.length) h += '<h4>전투 중</h4><div class="g4">' + bu.map(u => fld('현재 HP' + (bu.length > 1 ? ' · ' + esc(u.id) : ''), inp('hp_' + u.id, u.hp, 'number')) + chk('done_' + u.id, u.done, '행동 완료') + '<button class="btn sm" data-e="unspawn" data-v="' + esc(u.id) + '">전투에서 제외</button>').join('') + '</div>';
    h += '<h4>소지품 (최대 5개)</h4>' + d.weapons.map((w, i) => '<div class="wrow">' + fld('이름', inp('w' + i + '_name', w.name)) + fld('종류', sel('w' + i + '_type', w.type, Object.entries(RT.WT).map(([k, v]) => [k, v.n]))) + fld('위력', inp('w' + i + '_mt', w.mt, 'number')) + fld('명중', inp('w' + i + '_hit', w.hit, 'number')) + fld('필살', inp('w' + i + '_crit', w.crit, 'number')) + fld('횟수', inp('w' + i + '_uses', RT.arm(w) ? '' : w.uses, 'number', RT.arm(w) ? ' disabled' : '')) + fld('최대', inp('w' + i + '_max', RT.arm(w) ? '' : w.max, 'number', RT.arm(w) ? ' disabled' : '')) + fld('사거리', inp('w' + i + '_rmin', w.rmin, 'number')) + fld('~', inp('w' + i + '_rmax', w.rmax, 'number')) + fld('특효', inp('w' + i + '_eff', (w.eff || []).join(','))) + chk('w' + i + '_magic', w.magic, '마법') + '<button class="btn sm" data-e="wdel" data-v="' + i + '"' + (d.weapons.length < 2 ? ' disabled' : '') + '>✕</button></div>').join('') + '<div class="alts"><button class="btn sm" data-e="wadd"' + (d.weapons.length >= 5 ? ' disabled' : '') + '>＋ 빈 칸</button><select name="cat" style="width:auto">' + Object.keys(RT.CAT).map(n => '<option>' + esc(n) + '</option>').join('') + '</select><button class="btn sm" data-e="wcat"' + (d.weapons.length >= 5 ? ' disabled' : '') + '>＋ 목록에서 추가</button></div>';
    h += skillPick(d);
    if (d.later && d.later.length) h += '<div class="help" style="margin-top:6px">레벨이 오르면 다시 배움: ' + d.later.map(k => (S.skills[k] ? esc(S.skills[k].name) + ' (Lv ' + RT.reqLevel(S.skills[k]) + ')' : '')).filter(Boolean).join(', ') + '</div>';
    return h + '<div class="acts">' + (B() && B().status === 'active' && !(d.ally && inBattle(d.id).length) ? '<button class="btn sm" data-e="spawn">전투에 배치</button>' : '') + '<button class="btn sm" data-e="libput">보관함에 저장</button><button class="btn sm" data-e="rescale">성장 보정</button><button class="btn sm pri" data-e="regen">재생성</button>' + (d.ally ? '<button class="btn sm" data-e="away">' + (d.away ? '파티로 복귀' : '파티에서 이탈') + '</button>' : '') + '<button class="btn sm" data-e="ally">' + (d.ally ? '아군 명부에서 빼기' : '아군 명부에 넣기') + '</button><button class="btn sm warn" data-e="del">삭제</button></div>';
  }
  function skillForm(sk) {
    const f = sk.flags, m = sk.mods;
    let h = '<div class="g4">' + fld('이름', inp('name', sk.name)) + fld('종류', sel('type', sk.type, [['passive', '패시브'], ['proc', '확률 발동'], ['art', '전투 기술']])) + fld('분류', sel('tier', tierOf(sk), [['common', '범용'], ['faction', '세력'], ['own', '전용']])) + fld('세력 이름', inp('faction', sk.faction || '')) + fld('조건', sel('cond', sk.cond, Object.entries(RT.CONDS))) + fld('발동률 (숫자 또는 skl·lck 등)', inp('rate', sk.rate == null ? '' : sk.rate)) + fld('재사용 턴', inp('cd', sk.cd == null ? '' : sk.cd, 'number')) + fld('사거리 최소', inp('rmin', sk.range ? sk.range[0] : '', 'number')) + fld('사거리 최대', inp('rmax', sk.range ? sk.range[1] : '', 'number')) + '</div>' + fld('설명', inp('desc', sk.desc));
    h += '<h4>보정</h4><div class="g8">' + Object.keys(ML).map(k => fld(ML[k], inp('m_' + k, m[k] || 0, 'number'))).join('') + '</div>';
    h += '<h4>효과</h4><div class="g8">' + fld('방어 무시 %', inp('f_pierce', f.pierce || 0, 'number')) + fld('흡수 %', inp('f_drain', f.drain || 0, 'number')) + fld('피해 배율', inp('f_mult', f.mult || 1, 'number', ' step="0.1"')) + fld('피해 감소 %', inp('f_block', f.block || 0, 'number')) + fld('턴 회복', inp('f_regen', f.regen || 0, 'number')) + '</div>';
    h += '<div class="chips" style="margin-top:6px">' + chk('f_brave', f.brave, '2회 공격') + chk('f_sure', f.sure, '필중') + chk('f_noCounter', f.noCounter, '반격 불가') + chk('f_magic', f.magic, '마법 피해') + '</div>';
    return h + '<div class="help" style="margin-top:8px">' + esc(RT.skillText(sk)) + '</div><div class="acts"><button class="btn sm warn" data-e="del">삭제</button></div>';
  }
  function edDraw() {
    const m = $('modal'), unit = ED.tab === 'unit';
    const list = unit ? Object.values(S.defs).sort((a, b) => (b.ally ? 1 : 0) - (a.ally ? 1 : 0) || (a.away ? 1 : 0) - (b.away ? 1 : 0) || a.name.localeCompare(b.name)) : Object.values(S.skills).sort((a, b) => 'common faction own'.indexOf(tierOf(a)) - 'common faction own'.indexOf(tierOf(b)) || String(a.faction || '').localeCompare(String(b.faction || '')) || a.name.localeCompare(b.name));
    if (!list.find(x => x.id === ED.id)) ED.id = list[0] ? list[0].id : null;
    const cur = unit ? S.defs[ED.id] : S.skills[ED.id];
    m.innerHTML = '<div class="box ed"><div class="edtop"><button class="btn sm' + (unit ? ' on' : '') + '" data-e="tab" data-v="unit">유닛</button><button class="btn sm' + (unit ? '' : ' on') + '" data-e="tab" data-v="skill">기술</button><span class="sp"></span><button class="btn sm pri" data-e="close">저장하고 닫기</button></div><div class="edbody"><div class="edlist">'
      + list.map(x => '<button class="btn' + (x.id === ED.id ? ' on' : '') + '" data-e="pick" data-v="' + esc(x.id) + '">' + (unit ? (x.away ? '💤 ' : x.ally ? '🔵 ' : '🔴 ') : TI[tierOf(x)]) + esc(x.name) + '</button>').join('')
      + '<button class="btn" data-e="new">＋ 새로 만들기</button>' + (unit ? '<div class="prebox"><select name="pre">' + ['판타지', '현대'].map(g => '<optgroup label="' + g + '">' + Object.keys(RT.PRE).filter(k => RT.PRE[k].set === g).map(k => '<option>' + esc(k) + '</option>').join('') + '</optgroup>').join('') + '</select><input name="prelv" type="number" min="1" max="40" value="' + (ED.prelv || 1) + '" title="레벨"><button class="btn" data-e="preset">＋ 프리셋 적</button><button class="btn" data-e="lib">보관함</button></div>' : '') + '</div><div class="edform">' + (cur ? (unit ? unitForm(cur) : skillForm(cur)) : '<div class="help">왼쪽에서 고르거나 새로 만드세요.</div>') + '</div></div></div>';
    m.hidden = false;
  }
  // read the form back into the save; every editor action goes through here first, so nothing typed is lost
  function edSave() {
    if (!ED.open || !ED.id) return; const F = {};
    $('modal').querySelectorAll('[name]').forEach(el => { F[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    if (F.name === undefined) return;
    if (ED.tab === 'unit') {
      const d = S.defs[ED.id]; if (!d) return;
      const o = { id: d.id, name: F.name, emoji: F.emoji, cls: F.cls, mtype: F.mtype, level: F.level, exp: F.exp, move: F.move, asset: F.asset, img: d.img, ally: d.ally, away: d.away, history: d.history, later: d.later, tags: d.tags, stats: {}, growth: {}, weapons: [] };
      for (const k of RT.STATS) { o.stats[k] = F['s_' + k]; o.growth[k] = F['g_' + k]; }
      d.weapons.forEach((w, i) => { if (F['w' + i + '_name'] !== undefined) o.weapons.push({ name: F['w' + i + '_name'], type: F['w' + i + '_type'], mt: F['w' + i + '_mt'], hit: F['w' + i + '_hit'], crit: F['w' + i + '_crit'], uses: F['w' + i + '_uses'], max: F['w' + i + '_max'], brave: w.brave, gun: w.gun, drain: w.drain, magic: !!F['w' + i + '_magic'], rmin: F['w' + i + '_rmin'], rmax: F['w' + i + '_rmax'], eff: String(F['w' + i + '_eff'] || '').split(',').map(s => s.trim()).filter(Boolean) }); });
      o.skills = Object.keys(S.skills).filter(id => F['k_' + id]);
      const u = RT.normUnit(o, 0); u.id = d.id; S.defs[d.id] = u; if (u.asset !== d.asset) delete IMG[d.id];
      RT.rename(S, 'unit', d.id, d.name, u.name); if (JSON.stringify([u.level, u.exp, u.stats, u.weapons]) !== JSON.stringify([d.level, d.exp, d.stats, d.weapons])) RT.retro(S, d.id);
      for (const bu of inBattle(d.id)) { if (F['hp_' + bu.id] !== undefined) { bu.hp = RT.clamp(Math.round(Number(F['hp_' + bu.id]) || 0), 1, u.stats.hp); bu.done = !!F['done_' + bu.id]; } else bu.hp = Math.min(bu.hp, u.stats.hp); if (!u.weapons[bu.wi]) bu.wi = 0; }
    } else {
      const sk = S.skills[ED.id]; if (!sk) return;
      const o = { id: sk.id, name: F.name, desc: F.desc, type: F.type, tier: F.tier, faction: F.tier === 'faction' ? (F.faction || '세력') : '', cond: F.cond, rate: /^\d+$/.test(String(F.rate).trim()) ? Number(F.rate) : String(F.rate).trim(), cd: F.cd, mods: {}, flags: { brave: F.f_brave, sure: F.f_sure, noCounter: F.f_noCounter, magic: F.f_magic, pierce: F.f_pierce, drain: F.f_drain, mult: F.f_mult, block: F.f_block, regen: F.f_regen } };
      for (const k of Object.keys(ML)) o.mods[k] = F['m_' + k];
      if (String(F.rmin).trim() && String(F.rmax).trim()) o.range = [F.rmin, F.rmax];
      const n = RT.normSkill(o, 0); n.id = sk.id; S.skills[sk.id] = n; RT.rename(S, 'skill', sk.id, sk.name, n.name);
    }
    HOST.save();
  }
  function edOpen() { const u = U(V.sel); if (u) restore(u); clearSel(); ED.open = true; edDraw(); }
  function edAct(a, v) {
    if (!ED.open) return; const q = n => { const el = $('modal').querySelector('[name=' + n + ']'); return el ? el.value : ''; }, cat = q('cat'), pre = q('pre'), prelv = q('prelv'); edSave();
    const unit = ED.tab === 'unit', d = unit ? S.defs[ED.id] : null;
    if (a === 'close') { ED.open = false; $('modal').hidden = true; $('modal').innerHTML = ''; HOST.save(); syncLib(); render(); loadImages(); return; }
    if (a === 'lib') return libBox();
    if (a === 'rescale' && d) return rescaleBox(d.id);
    if (a === 'libput' && d) { HOST.libPut(S, [d.id], false).catch(e => console.log(e)); return; }
    if (a === 'regen' && d) return regenUnit(d.id);
    if (a === 'tab') { ED.tab = v; ED.id = null; }
    else if (a === 'pick') ED.id = v;
    else if (a === 'new') { const pool = unit ? S.defs : S.skills; let n = 1; while (pool[(unit ? 'unit_' : 'skill_') + n]) n++; const id = (unit ? 'unit_' : 'skill_') + n; if (unit) { S.defs[id] = RT.normUnit({ id, name: '새 유닛' }, 0); S.defs[id].ally = true; } else S.skills[id] = RT.normSkill({ id, name: '새 기술', tier: 'common' }, 0); ED.id = id; }
    else if (a === 'preset' && RT.PRE[pre]) { let n = 1; while (S.defs['pre_' + n]) n++; ED.prelv = prelv; S.defs['pre_' + n] = RT.presetUnit(pre, prelv, { id: 'pre_' + n }); ED.id = 'pre_' + n; }
    else if (a === 'spawn' && d) RT.spawn(S, d.id, d.ally ? 'ally' : 'enemy');
    else if (a === 'wadd' && d && d.weapons.length < 5) { d.weapons.push(RT.normWeapon({})); RT.retro(S, d.id); }
    else if (a === 'wcat' && d && d.weapons.length < 5 && RT.CAT[cat]) { d.weapons.push(RT.normWeapon({ name: cat })); RT.retro(S, d.id); }
    else if (a === 'wdel' && d && d.weapons.length > 1) { d.weapons.splice(+v, 1); for (const bu of inBattle(d.id)) if (!d.weapons[bu.wi]) bu.wi = 0; RT.retro(S, d.id); }
    else if (a === 'ally' && d) { if (d.ally) { delete d.ally; delete d.away; } else d.ally = true; }
    else if (a === 'away' && d && d.ally) { if (d.away) delete d.away; else d.away = true; }
    else if (a === 'unspawn') RT.unspawn(S, v);
    else if (a === 'del') { if (unit) { if (d) { for (const bu of inBattle(d.id)) RT.unspawn(S, bu.id); if (!inBattle(d.id).length) { delete S.defs[d.id]; if (B() && B().wait) B().wait = B().wait.filter(w => w.ref !== d.id); } } } else if (S.skills[ED.id]) { delete S.skills[ED.id]; for (const x of Object.values(S.defs)) x.skills = x.skills.filter(id => id !== ED.id); } ED.id = null; }
    HOST.save(); edDraw();
  }
  async function open(gen) {
    try { build(); S = await HOST.state(true); RT.ensureBase(S); if (S.battle && S.pulse == null) RT.pulseReset(S); clearSel(); V.inspect = null; V.hover = null; V.tile = null; render(); await HOST.prepare(); await HOST.show(); loadImages(); if (gen === true) generate(); }
    catch (e) { console.log('Risu Tactics: 열기 실패', e); }
  }
  return { open };
})();

(async () => {
  try { await HOST.install(g => UI.open(g)); if (HOST.mock && typeof document !== 'undefined') UI.open(); }
  catch (e) { console.log('Risu Tactics: 초기화 실패', e); }
})();
