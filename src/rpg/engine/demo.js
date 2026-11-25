// Dusk Saga 엔진 — 예시 전장 (순수 함수, DOM·api 없음)


export function demo() {
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
      { id: 'ren', name: '렌', emoji: '⚔️', cls: '검사', stats: { hp: 21, str: 7, mag: 1, skl: 11, spd: 12, lck: 7, def: 5, res: 2 }, weapons: [{ name: '철의 검', type: 'sword', mt: 5, hit: 90 }, { name: '파갑검', type: 'sword', mt: 6, hit: 80, eff: ['armor'] }, { name: '상처약' }], skills: ['deathblow', 'flurry'] },
      { id: 'sera', name: '세라', emoji: '🧙', cls: '마도사', stats: { hp: 18, str: 1, mag: 9, skl: 8, spd: 8, lck: 6, def: 2, res: 8 }, weapons: [{ name: '불씨의 서', type: 'tome', mt: 5, hit: 90 }, { name: '번개의 서' }], skills: ['gapstrike'] },
      { id: 'mira', name: '미라', emoji: '🏹', cls: '궁수', stats: { hp: 19, str: 7, mag: 0, skl: 10, spd: 9, lck: 6, def: 4, res: 3 }, weapons: [{ name: '철의 활', type: 'bow', mt: 6, hit: 85 }], skills: ['focus'] },
      { id: 'lia', name: '리아', emoji: '✨', cls: '수녀', stats: { hp: 17, str: 0, mag: 7, skl: 5, spd: 7, lck: 9, def: 1, res: 9 }, weapons: [{ name: '치유의 지팡이', type: 'staff', mt: 6 }] },
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
