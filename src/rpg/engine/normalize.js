// Dusk Saga 엔진 — LLM 출력 정규화와 프리셋 적 (순수 함수, DOM·api 없음)
import { KINDS, fitBudget, makeSpell, makeWeapon, rankOf } from "./gear.js";
import { elemOf } from "./elements.js";
import { mods } from "./combat.js";
import { CAT, CONDS, GROW, GUNS, MAXLV, MOVE, MT, MTL, STATS, WT, arm, clamp, copy, idOf, int, txt } from "./rules.js";

// ── normalizers: clamp instead of reject, so one odd number from the model does not kill a battle ──
export function normSkill(o, i) {
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
  if (elemOf(o.elem)) s.elem = o.elem; { const rk = rankOf(o.grade); if (rk != null) s.grade = rk; }
  s.tier = ['common', 'faction', 'own'].includes(o.tier) ? o.tier : (txt(o.faction, 20, '') ? 'faction' : 'own');
  if (s.tier === 'faction') s.faction = txt(o.faction, 20, '세력');
  return s;
}
// the common library every save starts with
export const BASE_VER = 2;
export const BASE_SKILLS = [
  { id: 'gapstrike', name: '틈새 꿰기', desc: '기술% 확률로 적의 수비·마방 절반 무시', type: 'proc', rate: 'skl', flags: { pierce: 50 } },
  { id: 'lifesteal', name: '생기 흡수', desc: '기술% 확률로 준 피해의 절반만큼 회복', type: 'proc', rate: 'skl', flags: { drain: 50 } },
  { id: 'pavise', name: '철벽', desc: '수비% 확률로 받는 피해 반감', type: 'proc', rate: 'def', flags: { block: 50 } },
  { id: 'wrath', name: '분노', desc: 'HP 절반 이하에서 필살 +20', type: 'passive', cond: 'hp_below_half', mods: { crit: 20 } },
  { id: 'deathblow', name: '선제 강공', desc: '먼저 공격할 때 공격 +3', type: 'passive', cond: 'initiating', mods: { atk: 3 } },
  { id: 'armorblow', name: '선제 수비', desc: '먼저 공격할 때 수비 +4', type: 'passive', cond: 'initiating', mods: { def: 4 } },
  { id: 'dartblow', name: '선제 쾌속', desc: '먼저 공격할 때 속도 +4', type: 'passive', cond: 'initiating', mods: { spd: 4 } },
  { id: 'guard', name: '수비 태세', desc: '공격받을 때 수비·마방 +3', type: 'passive', cond: 'defending', mods: { def: 3, res: 3 } },
  { id: 'bond', name: '연계', desc: '아군과 인접하면 명중·회피 +10', type: 'passive', cond: 'adjacent_ally', mods: { hit: 10, avo: 10 } },
  { id: 'renewal', name: '재생', desc: '턴 시작 시 HP 5 회복', type: 'passive', flags: { regen: 5 } },
  { id: 'flurry', name: '연격', desc: '위력을 낮춰 두 번 공격', type: 'art', cd: 3, mods: { atk: -2 }, flags: { brave: true } },
  { id: 'focus', name: '집중', desc: '숨을 고르고 급소를 노린다', type: 'art', cd: 2, mods: { hit: 25, crit: 15 } },
  { id: 'wardblow', name: '선제 마방', desc: '먼저 공격할 때 마방 +4', type: 'passive', cond: 'initiating', mods: { res: 4 } },
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
export function ensureBase(S) { if (S.baseVer === BASE_VER) return; for (const o of BASE_SKILLS) { if (!S.skills[o.id]) S.skills[o.id] = normSkill(Object.assign({ tier: 'common' }, o), 0); else if (!S.skills[o.id].tier) S.skills[o.id].tier = 'common'; } S.baseVer = BASE_VER; }
// a skill a model defines is never "common": it is a faction skill or somebody's own
export function normWeapon(o) {
  o = o && typeof o === 'object' ? o : {};
  if (o.mt == null && (o.kind || o.grade != null || o.desc || o.elem) && !CAT[txt(o.name, 30, '')]) o = Object.assign({}, makeWeapon(o, o.level), { uses: undefined }); // 이야기 속 무기: 종류·등급·속성으로 성능을 매긴다
  const c = CAT[txt(o.name, 30, '')]; if (c) { const m = Object.assign({}, c); for (const k in o) if (o[k] != null && o[k] !== '') m[k] = o[k]; o = m; }
  const type = WT[o.type] ? o.type : 'sword', r = WT[type].r;
  const rmin = int(o.rmin, 1, 3, r[0]);
  const w = { name: txt(o.name, 30, WT[type].n), type, mt: int(o.mt, 0, 99, 5), hit: int(o.hit, 30, 150, 85), crit: int(o.crit, 0, 60, 0), rmin, rmax: int(o.rmax, rmin, 5, Math.max(rmin, r[1])) };
  if (type !== 'item' && type !== 'staff') w.mt = Math.min(w.mt, 30);
  if (type === 'item') { w.rmin = w.rmax = 0; w.hit = 0; w.crit = 0; }
  // only staves and items have uses
  w.max = arm(w) ? 0 : int(o.max, 0, 99, int(o.uses, 1, 99, WT[type].u)); w.uses = w.max ? int(o.uses, 1, w.max, w.max) : 0;
  if (KINDS[o.kind]) w.kind = o.kind; { const rk = rankOf(o.grade); if (rk != null) w.grade = rk; } if (elemOf(o.elem)) w.elem = o.elem; if (o.brave === true || o.brave === 'true') w.brave = true; if (type === 'claw' && GUNS[o.gun]) w.gun = o.gun; if (o.magic === true || o.magic === 'true') w.magic = true; const dr = int(o.drain, 0, 100, 0); if (dr) w.drain = dr;
  if (Array.isArray(o.eff)) { const e = o.eff.filter(t => typeof t === 'string').map(t => t.slice(0, 16)).slice(0, 4); if (e.length) w.eff = e; }
  return w;
}
// stat budget by level: about 4 points a level on top of a level-1 body, with some slack
export function fitLevel(u) {
  const keys = STATS.slice(1), cap = Math.round((46 + u.level * 4) * 1.15), sum = keys.reduce((a, k) => a + u.stats[k], 0);
  if (sum > cap) for (const k of keys) u.stats[k] = Math.floor(u.stats[k] * cap / sum);
  u.stats.hp = Math.min(u.stats.hp, 30 + u.level * 2);
  for (const w of u.weapons) tameWeapon(w);
  return u;
}
export function tameWeapon(w) { if (arm(w)) { w.mt = Math.min(w.mt, 20); w.crit = Math.min(w.crit, 50); w.hit = clamp(w.hit, 50, 120); } return w; }
export function tameSkill(s) {
  for (const k of ['atk', 'def', 'res', 'spd']) if (s.mods[k]) s.mods[k] = clamp(s.mods[k], -8, 8);
  for (const k of ['hit', 'avo', 'crit']) if (s.mods[k]) s.mods[k] = clamp(s.mods[k], -40, 40);
  const f = s.flags; if (f.mult) f.mult = Math.min(f.mult, 2.5); if (f.block) f.block = Math.min(f.block, 75); if (f.regen) f.regen = Math.min(f.regen, 10);
  if (s.type === 'proc' && typeof s.rate === 'number') s.rate = Math.min(s.rate, 60);
  return s;
}
export const llmSkill = (o, i) => { if (o && o.name && ((!o.mods && !o.flags) || o.traits)) { const sp = makeSpell(o, int(o.level, 1, MAXLV, 10)); if (sp) o = Object.assign(sp, o.id ? { id: o.id } : {}, o.faction ? { faction: o.faction } : {}); } const s = tameSkill(normSkill(o, i)); if (s.tier === 'common') s.tier = 'own'; return s.grade != null ? fitBudget(s, s.grade) : s; };
// ready-made mobs: level-1 body, grown to the level asked for
export const M = (set, emoji, cls, mtype, st, weapons, x) => Object.assign({ set, emoji, cls, mtype, stats: { hp: st[0], str: st[1], mag: st[2], skl: st[3], spd: st[4], lck: st[5], def: st[6], res: st[7] }, weapons }, x);
export const PRE = {
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
  '암흑 마도사': M('판타지', '🔮', '마도사', 'foot', [17, 1, 7, 6, 6, 3, 2, 6], [{ name: '불씨의 서' }]),
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
export const UPG = { '청동의': ['철의', '강철의', '은의'], '철의': ['철의', '강철의', '은의'] };
// a preset can be taken as it is, or with any part replaced: class, movement, gear, skills, single stats
export function presetUnit(name, level, o) {
  const p = PRE[name]; if (!p) return null; o = o || {}; level = int(level, 1, MAXLV, 1);
  const src = copy(p); delete src.set;
  // basic gear keeps pace: iron by level 6, steel by 14, silver by 24
  src.weapons = src.weapons.map(w => { const m = /^(청동의|철의) (.+)$/.exec(w.name), n = m && (level >= 24 ? UPG[m[1]][2] : level >= 14 ? UPG[m[1]][1] : level >= 6 ? UPG[m[1]][0] : m[1]) + ' ' + (m ? m[2] : ''); return m && CAT[n] ? { name: n } : w; });
  const over = {}; for (const k of ['cls', 'mtype', 'move', 'emoji', 'asset', 'tags', 'growth', 'sex', 'elem', 'model']) if (o[k] != null && o[k] !== '') over[k] = o[k];
  for (const k of ['weapons', 'skills']) if (Array.isArray(o[k]) && o[k].length) over[k] = o[k];
  const u = normUnit(Object.assign(src, over, { id: o.id || name, name: txt(o.name, 30, name), level }), 0);
  for (const k of STATS) u.stats[k] = Math.min(k === 'hp' ? 120 : 60, u.stats[k] + Math.round(u.growth[k] * (level - 1) / 100));
  if (o.stats && typeof o.stats === 'object') for (const k of STATS) if (o.stats[k] != null) u.stats[k] = int(o.stats[k], k === 'hp' ? 1 : 0, k === 'hp' ? 120 : 60, u.stats[k]);
  return fitLevel(u);
}
export function growthFor(st) { const g = Object.assign({}, GROW); if (st.mag > st.str) { g.str = GROW.mag; g.mag = GROW.str; } return g; }
export function normUnit(o, i) {
  o = o && typeof o === 'object' ? o : {};
  const st = o.stats && typeof o.stats === 'object' ? o.stats : {}, mtype = MT[o.mtype] != null ? o.mtype : 'foot';
  const stats = { hp: int(st.hp, 1, 120, 20) }; for (const k of STATS.slice(1)) stats[k] = int(st[k], 0, 60, 4);
  const g0 = growthFor(stats), gi = o.growth && typeof o.growth === 'object' ? o.growth : {}, growth = {};
  for (const k of STATS) growth[k] = int(gi[k], 0, 150, g0[k]);
  const weapons = (Array.isArray(o.weapons) ? o.weapons : []).slice(0, 5).map((w) => normWeapon(w && typeof w === 'object' ? Object.assign({ level: o.level }, w) : w));
  if (!weapons.length) weapons.push(normWeapon({ name: stats.mag > stats.str ? '불씨의 서' : '철의 검', type: stats.mag > stats.str ? 'tome' : 'sword' }));
  const u = {
    id: idOf(o.id, 'unit_' + i), name: txt(o.name, 30, '이름 없음'), emoji: txt(o.emoji, 8, '🙂'), cls: txt(o.cls, 20, MTL[mtype]), mtype,
    move: int(o.move, 1, 10, MOVE[mtype]), level: int(o.level, 1, MAXLV, 1), exp: int(o.exp, 0, 99, 0), stats, growth, weapons,
    skills: (Array.isArray(o.skills) ? o.skills : []).filter(s => typeof s === 'string').map(s => idOf(s, '')).filter(Boolean).slice(0, 6),
    tags: (Array.isArray(o.tags) ? o.tags : []).filter(t => typeof t === 'string').map(t => t.slice(0, 16)).slice(0, 4),
    asset: txt(o.asset, 80, ''),
    history: (Array.isArray(o.history) ? o.history : []).filter(t => typeof t === 'string').map(t => t.slice(0, 120)).slice(-8),
  };
  if (typeof o.img === 'string' && /^(https?:|data:image\/)/.test(o.img)) u.img = o.img;
  if (elemOf(o.elem)) u.elem = o.elem; if (typeof o.model === 'string' && /^[a-z]{2,12}$/.test(o.model)) u.model = o.model; if (o.sex === 'f' || o.sex === 'm') u.sex = o.sex; if (o.ally) u.ally = true; if (o.ally && o.away) u.away = true;
  if (Array.isArray(o.later) && o.later.length) u.later = o.later.filter(s => typeof s === 'string').map(s => idOf(s, '')).filter(Boolean).slice(0, 12);
  return u;
}
// best-effort import of ally sheets from the old Lua module save (chat variable cv_rt_state)
export function importModule(S, old) {
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
