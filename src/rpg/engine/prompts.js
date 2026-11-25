// Dusk Saga 엔진 — 생성·성장·재생성 프롬프트 (순수 함수, DOM·api 없음)
import { MODELS } from "./bestiary.js";
import { GRADES, KIND_LINES, TRAITS } from "./gear.js";
import { ELEMENTS } from "./elements.js";
import { CLASS_LINES } from "./classes.js";
import { CAT, CONDS, SL, STATS } from "./rules.js";
import { MAP_LINES } from "./maps.js";
import { PRE } from "./normalize.js";
import { RACE_LINES } from "./races.js";

export const skillLines = S => 'saved_skills — id | name | tier | effect\n' + Object.values(S.skills).sort((a, b) => (a.tier === 'common' ? 0 : a.tier === 'faction' ? 1 : 2) - (b.tier === 'common' ? 0 : b.tier === 'faction' ? 1 : 2)).map(s => s.id + ' | ' + s.name + ' | ' + (s.tier || 'own') + (s.faction ? '/' + s.faction : '') + ' | ' + skillText(s)).join('\n');
export const sheetLine = (S, d) => [d.id, d.name, d.cls + ' ' + d.mtype, 'Lv ' + d.level + (d.exp ? ' exp ' + d.exp : ''), STATS.map(k => d.stats[k]).join('/'), d.weapons.map(w => w.name + '(' + w.type + ')').join(', ') || '-', d.skills.join(', ') || '-'].join(' | ');
export function rosterText(S) {
  const allies = Object.values(S.defs).filter(d => d.ally).map(d => sheetLine(S, d) + ((d.history || []).length ? ' | history: ' + d.history.join('; ') : '') + (d.away ? ' | AWAY' : ''));
  return 'saved_allies — id | name | class move | level | ' + STATS.join('/') + ' | inventory | skill ids\n' + (allies.join('\n') || '(none)') + '\n' + skillLines(S);
}
export function skillText(sk) {
  const p = [sk.type === 'art' ? '전투 기술' + (sk.cd ? ' · 재사용 ' + sk.cd + '턴' : '') : sk.type === 'proc' ? '발동 ' + (typeof sk.rate === 'string' ? SL[sk.rate] + '%' : sk.rate + '%') : '패시브'];
  if (sk.cond !== 'always') p.push(CONDS[sk.cond]);
  const ml = { atk: '공격', hit: '명중', avo: '회피', crit: '필살', def: '수비', res: '마방', spd: '속도' };
  for (const k in sk.mods) p.push(ml[k] + (sk.mods[k] > 0 ? '+' : '') + sk.mods[k]);
  const f = sk.flags; if (f.brave) p.push('2회 공격'); if (f.sure) p.push('필중'); if (f.noCounter) p.push('반격 불가'); if (f.magic) p.push('마법 피해');
  if (f.pierce) p.push('방어 ' + f.pierce + '% 무시'); if (f.drain) p.push('피해의 ' + f.drain + '% 흡수'); if (f.mult) p.push('피해 ×' + f.mult); if (f.block) p.push('받는 피해 ' + f.block + '% 감소'); if (f.regen) p.push('턴 시작 시 HP +' + f.regen);
  if (sk.range) p.push('사거리 ' + sk.range[0] + '–' + sk.range[1]);
  return p.join(' · ');
}
export const GEN_PROMPT = `Design one battle for an original grid tactics RPG from the roleplay so far. Reply with ONE JSON object only — no prose, no code fence.
{
 "name": "전장 이름 (Korean)",
 "objective": {"type": "rout|boss|survive|seize", "turns": 6},
 "indoor": true,
 "map": ["one string per row, equal length; 8-14 columns, 7-11 rows"],
 "skills": [ {"id":"ascii_id","name":"한국어 이름","desc":"짧은 설명","grade":"희귀","elem":"","traits":{"power":3},"cond":"always|initiating|defending|hp_below_half|hp_full|adjacent_ally|alone|on_cover","faction":"세력 이름 (faction skills only)"} ],
 "units": [ {"id":"ascii_id","name":"이름","emoji":"🗡️","cls":"직업명","mtype":"foot|armor|horse|fly","level":1,"stats":{"hp":22,"str":7,"mag":1,"skl":8,"spd":9,"lck":5,"def":5,"res":2},"weapons":[{"name":"서리 문 장검","desc":"푸른 날의 가보","kind":"sword","grade":"희귀","elem":"ice"},{"name":"상처약"}],"skills":["skill_id"],"race":"인간","job":"검사","sex":"f|m","tags":["dragon"],"asset":"optional image name"} ],
 "place": [ {"ref":"unit id","team":"ally|friend|enemy|third","x":1,"y":1,"ai":"charge|hold|guard","boss":false,"turn":0} ],
 "away": ["saved ally id no longer with the party"],
 "growth": [ {"id":"saved ally id","reason":"무엇이 달라졌는가","stats":{"str":1},"exp":0,"learn":["skill_id"],"forget":[],"weapon":{"name":"...","kind":"sword","grade":"양질","elem":""}} ]
}
MAP CHARS: . plain | f forest (avo+20 def+1, slow) | m mountain (avo+30 def+2, very slow, no armor/horse) | F fort (avo+20 def+2, heals) | p pillar | w water (fliers only) | b bridge | # wall | l lava (walkable, burns 15% HP each turn) | s swamp (very slow, avo-15) | i ice (avo-10) | h hill, H high ground (attacking down: hit+15; up: hit-10; H is reached only from h or H) | v empty sky (fliers only) | T throne (required for "seize"; the boss stands on it).
TERRAIN RULES: every tile is something really in the scene. Over half the map plain; terrain in connected clumps and lines (a wood of 3-6, a wall with a gap, a river with 1-2 crossings), never sprinkled singles; 1-2 chokepoints or cover worth fighting over; everyone can walk to the enemy (no sealed room, no water without a bridge).
- "indoor": true for any interior (hall, dungeon, cave, building, ship, sewer): # walls shape rooms and corridors, cover is p (columns, furniture, crates); never f or m; w only as a pool or canal with b; F barricade; T throne, altar or command seat.
- Wilds: f woods, m cliffs and rubble, w rivers with b; # only for a real structure, p only in ruins.
- Town or modern street: # buildings, p vehicles and stalls, F checkpoint; f only in a park; no m.
MAP PRESETS (12x9; x 1-12 west to east, y 1-9 north to south), optional: give "mapPreset":"<name>" instead of "map" and place units by the description; a unit on a blocked tile moves to the nearest free one. Presets bring their own scenery; with your own "map" you may give "theme":"snow|desert|lava|swamp|night". If none fits the place, draw your own "map" — never force a preset.
${MAP_LINES}
STORY FIRST: this is a roleplay, not a balanced match. Odds, numbers and the shape of the fight follow the scene: a desperate stand against waves of reinforcements, an ambush, being surrounded, a chase, or a one-sided fight the party wins without breaking a sweat are all right when the story points there. Do not fall back on the same "party against a few more enemies and a boss" every time; vary the objective, the numbers, where everyone stands and who arrives when.
TEAMS: ally = the party, moved by the player. enemy = their opponents. friend = people fighting beside the party who are not under its command (town guards, an escorted NPC, a rival lending a hand): the game moves them, and losing them does not lose the battle. third = a force against everyone (monsters crashing a duel, a rival gang, a berserk beast): it attacks both sides and both may attack it. Use friend and third only when the story has such people; they are defined in "units" like enemies and take "ai". A rout is won when every enemy and third unit on the field is down, even if reinforcements were still to come.
PLACEMENT: coordinates are 1-based, x from the left, y from the top. Often allies on one side and enemies on the other, 4+ tiles apart, but follow the scene (surrounded, split up, holding a doorway, already face to face); never on w or #. "turn":N (2-30) makes the entry a reinforcement, either team: it is off the map at first and arrives at that tile at the start of its side's phase on turn N — a map edge, door or road is the natural spot. Omit turn for units on the field from the start; the party and its opponents each need at least one of those. ai: charge = advance and attack, hold = attack what comes into reach, guard = never moves. boss:true for objective "boss".
RULES OF THE GAME: damage = str (mag for tomes) + mt − def (res). Double strike at spd +4. Triangle: sword & tome > axe & bow > lance & dagger > sword & tome. Bows hit only at range 2 and are deadly to fliers. Staves heal mag + mt. A unit next to an ally gets hit +10 and that ally adds a half-damage strike — enemies too, so enemies side by side are stronger.
INVENTORY: "weapons" is the inventory, max 5. There is no fixed armory: every weapon is the one the character carries in the story. Give {"name":"이야기 속 이름","desc":"짧은 생김새·내력","kind":"…","grade":"…","elem":"…"} and the game sets every number and the look from them. kind: ${KIND_LINES}. grade: ${GRADES.join(" < ")}, each with - or + (평범한 병사 보통-양질, 숙련자 정예-희귀, 이름난 보물 영웅-전설, 신의 무기 신화); follow what the story says of the weapon, not the owner's level. elem, only if the story shows it: ${Object.entries(ELEMENTS).map(([k, v]) => k + "(" + v.n + ")").join(" ")}. Items only: {"name":"상처약"}. Weapons never wear out; staves and items are spent. Invent a plain weapon only for someone whose weapon is never described.
ELEMENTS: advantage ×1.3, same element ×0.75, disadvantage ×0.85; thunder and ice are stronger on water tiles, fire in forest, wind against fliers, thunder against armor. Races carry their own element; a unit may take "elem" when the story gives it one.
GAUNTLETS AND GUNS: fists, claws, shields, chains and every firearm are the "claw" family, outside the triangle; pick the kind (pistol, rifle, shotgun, sniper, smg, beam).
LEVELS follow story standing: 1-10 novice, 11-20 seasoned (not yet a veteran), 21-39 veteran (promoted class: 검성, 성기사, 장군, 현자), 40 hero of legend. Level and class name follow the unit's standing in the story, never the party's level: someone the story calls a master, a general, a legend or the strongest in the world gets the level that standing means (30-40) even when the party is level 1, and a famous veteran is not level 15 because the heroes met them early.
STAT SCALE: about 3 stat points per level. Lv 1: hp 18-24, main stats 6-9, weak 0-4. Lv 10: hp 24-30, main 10-13. Lv 20: hp 30-38, main 15-19. Lv 30: hp 36-46, main 20-25. Lv 40: hp 42-55, main 25-32. Main = the 2-3 stats the class lives on (str+spd swordsman, mag+res mage, str+def knight); the rest clearly lower. Armor trades spd for def. Sheets far above their level are cut down by the game.
PRESET ENEMIES, optional help: (1) as is — {"id":"gob1","preset":"고블린","level":3} and the game builds the sheet for that level; (2) as a base — add "name", "emoji", "asset", "cls", "mtype", "move", "weapons", "skills", "tags" or partial "stats" to replace those parts (산적 renamed "밀수꾼" with a 권총); (3) as a yardstick for a full sheet of your own. The game has a sheet and a 3D body for each: ${['판타지', '현대'].map((t) => '[' + t + '] ' + Object.keys(PRE).filter((k) => PRE[k].set === t).join(', ')).join(' ')}. A story monster keeps its own name: give "preset" of the nearest one plus "name", or add "model" (${Object.keys(MODELS).join(', ')}.
ENEMIES: these levels are for foes the story has not ranked — rank and file at or 1-2 levels below the party, plain gear (보통-양질), no skills; 1-2 elites at party level; a boss 2-4 levels above with better gear and 1-2 skills. A character whose strength the story has established keeps their true level and stats however lopsided the fight; do not shrink them to fit. If that makes a rout impossible, keep it playable another way: objective "survive" (hold out N turns) or "seize", or place them far back with ai "guard". Enemy count is often allies + 1 to 3, but fewer or far more when the scene calls for it (40 place entries at most, reinforcements included). Enemies are always defined in "units"; several placed enemies may share one template.
PARTY: USER CHARACTER, when given, is the player's own character and is always placed as an ally (define it in "units" if not saved). saved_allies already exist — place them by "ref" = id and do NOT redefine them; define a new ally only for a roleplay character not saved yet. Place only allies who are with the player in this scene; a saved ally who left the party (parted, sent away, captured, turned, dead) is not placed and its id goes in "away". One marked AWAY stays out unless the story clearly brought them back.
SKILLS: "passive" applies mods/flags while cond holds; "proc" triggers per strike at rate (1-100, or a stat name = that stat as %) with pierce/drain/mult, or block for defense; "art" is a chosen attack with cooldown cd. At most 2-3 skills per unit; most enemies none.
STORY SKILLS: skills belong to the characters of this roleplay. Take every technique, spell and ability from the settings and the story under its own name and give {"id","name","desc","grade","elem","traits":{"power":3,"pierce":1}} with NO mods, flags, rate or cd. grade sets a hard point budget; the game spends it by the weights in traits (${Object.keys(TRAITS).join(", ")}; 1-10, only what the ability is really about). The same grade is worth the same total whatever the mix, so judge the grade by how the story ranks the ability. Only a character with no described ability may get a saved common skill.
SKILL LIBRARY: saved_skills is shared. "common" skills are only for nameless rank and file. Give an "own" skill to another unit whose ability is essentially the same instead of writing a near-duplicate. Define a NEW skill only (a) for a named character's signature ability no saved skill covers — at most 1-2 per battle; (b) for one enemy group (clan, order, cult, species): up to 3-4 skills with "faction":"세력 이름" shared across it, reusing that faction's saved skills first. Rank-and-file enemies never get a new skill of their own.
JOBS, optional: "job" takes a base job below, or an advanced one (after →) at level 21+. It sets growth, movement and usable weapon types, so give weapons it can use. A story profession that is not a fighting job stays in "cls".
${CLASS_LINES}
SEX: give "sex" ("f" or "m") for every person whose sex the story makes clear; omit it for beasts, machines and the unknown.
RACES, optional: "race" takes one of these names; the game adds its tags and trait (and, on a preset, its stat changes). Weapons with "eff" hit matching tags for triple might. Use a race only when the story says so; other peoples stay in "cls" and "tags".
${RACE_LINES}
IMAGES: if a name in AVAILABLE_IMAGES clearly depicts a unit (same character name, or an obvious match), set "asset" to that exact name; otherwise omit it, never invent one. Always give a fitting "emoji".
NAMING: story names first, exactly as written. Where none exists use a plain Korean description. Do not borrow names, characters or places from existing commercial games.
GROWTH is optional: include "growth" only if the roleplay since the last battle clearly changed a saved ally (training, new weapon, injury, learned technique). Stat change at most ±3 (hp ±8). Never repeat what an ally's history already lists.`;
// added to the generation prompt when the battle should not be the scene at hand
export const LATER_PROMPT = `TIME SKIP MODE: do NOT stage the current scene. Invent a believable battle some time AFTER the roleplay shown (hours, days or weeks) that follows from where the story is heading: unfinished business, an enemy introduced or implied, the party's plans, the dangers of where they are going. Stay consistent with what is established. Add "premise": 2-4 Korean sentences — how much time passed, where the party is, why the fight breaks out. The party is whoever would plausibly travel with the player by then. A BATTLE BRIEF from the user is the battle: its opponent, place and timing are fixed; fill in only what it leaves open.`;
// the other prompts quote the rules they need from the generation prompt, line by line
export const XCOM_PROMPT = `COVER RULES ARE ON for this battle: walls (#) block every attack from 2 tiles or more, and a unit standing next to a wall, pillar/crate/car (p), mountain or fort is covered from that side (shots at it lose accuracy; shots from an uncovered side crit more). Units can go on overwatch and fire at enemies that move in their sights. So: scatter plenty of p tiles and wall stumps across the map as cover with open lanes between, and start units beside cover. Firearms work by kind — add "gun":"pistol|shotgun|rifle|sniper|auto" to every firearm; the game sets range and magazine itself (pistol 1-3; shotgun 1-3, strongest adjacent; rifle 1-4; sniper 2-6, cannot fire after moving; auto 1-3, fires twice). Guns do not counterattack; melee weapons, bows and magic work as before.`;
export const genLines = re => GEN_PROMPT.split('\n').filter(l => re.test(l)).join('\n');
export const GROWTH_PROMPT = `Keep the character sheets of an original tactics RPG in sync with a roleplay. Compare saved_allies with what happened and reply with ONE JSON object only, no prose:
{"skills":[ ...new skill definitions, only if someone learned something new... ],"growth":[{"id":"saved ally id","reason":"한국어로 무엇이 달라졌는가","stats":{"str":1},"exp":0,"learn":["skill_id"],"forget":[],"weapon":{"name":"...","kind":"sword","grade":"양질","elem":""}}]}
Include only characters whose abilities, gear or condition really changed. Stat change at most ±3 (hp ±8); "exp" 0-300 for meaningful off-battle experience. Never repeat what an ally's history already lists. Nothing changed: {"growth":[]}.
The shape of one skill definition:
${genLines(/^ "skills"/)}
${genLines(/^(INVENTORY|ELEMENTS|GAUNTLETS AND GUNS|SKILLS|STORY SKILLS|SKILL LIBRARY|NAMING)/)}`;
// reroll of one unit: same rules text as battle generation, one sheet out
export const REGEN_PROMPT = `Rebuild the sheet of ONE unit of an original tactics RPG so it matches who the character really is in the roleplay. Reply with ONE JSON object only, no prose, no code fence:
{"skills":[ ...new skill definitions, only if the unit needs one not saved yet... ],"unit":{ ...one unit definition... }}
The shapes (one skill definition, one unit definition):
${genLines(/^ "(skills|units)"/)}
current_sheet is being replaced and may be badly wrong (a swordsman built as a mage) — do not start from it. Decide class, movement type, stat spread, inventory and skills from the character's description, the roleplay and the notes. Keep the same "id", "name" and "level", with stats that fit the level; for an enemy keep about the same overall strength.
${genLines(/^(RULES OF THE GAME|INVENTORY|ELEMENTS|GAUNTLETS AND GUNS|LEVELS follow|STAT SCALE|ENEMIES|SKILLS|STORY SKILLS|SKILL LIBRARY|IMAGES|NAMING)/)}`;
export function sheetText(S, id) {
  const d = S.defs[id]; if (!d) return '';
  return 'current_sheet (' + (d.ally ? 'ally' : 'enemy') + ') — id | name | class move | level | ' + STATS.join('/') + ' | inventory | skill ids\n' + sheetLine(S, d) + '\n' + skillLines(S);
}
