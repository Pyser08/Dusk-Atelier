// Dusk Saga 엔진 — 적은 토큰 전투 생성: 짧은 프롬프트 + 한 줄 형식(사가 줄) → loadEncounter용 전투 (순수 함수)
import { hairFromText } from "./armor.js";
import { personalize, sigName } from "./naming.js";
import { guessMonster } from "./monguess.js";
// 모델은 이름표만 고르고(맵 프리셋·몬스터 프리셋·직업·종족), 능력치·크기·부위·버팀은 엔진이 채운다.
import { PRE } from "./normalize.js";
import { MAPS } from "./maps.js";
import { CLASSES, jobLike } from "./classes.js";
import { RACES } from "./races.js";
import { THEMES, loadEncounter } from "./phase.js";
import { applyGrowth, planGrowth } from "./growth.js";
import { makeSpell, traitsFromText } from "./gear.js";
import { ELEMENTS } from "./elements.js";
import { copy } from "./rules.js";
import { onFoe, supportFrom } from "./status.js";
const hid = (t) => { let x = 7; for (const c of String(t)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return "sk_" + x.toString(36); };

const STAT = { HP: "hp", 체력: "hp", 힘: "str", 마력: "mag", 기술: "skl", 속도: "spd", 행운: "lck", 수비: "def", 마방: "res" };
const STAT_RE = /(HP|체력|힘|마력|기술|속도|행운|수비|마방)\s*([+-]\d{1,2})/g;
const ids = (t) => t.split(/[,\s]+/).map((x) => x.replace(/^#/, "").trim()).filter(Boolean);
const statsOf = (t) => { const o = {}; for (const m of t.matchAll(STAT_RE)) o[STAT[m[1]]] = (o[STAT[m[1]]] || 0) + +m[2]; return o; };

const SIDE = { 아군: "ally", 적: "enemy", 우군: "friend", 제3: "third", 제3세력: "third" };
const OBJ = { rout: "rout", boss: "boss", survive: "survive", seize: "seize", escort: "escort", escape: "escape", steal: "steal", hunt: "hunt", break: "hunt", 전멸: "rout", 보스: "boss", 생존: "survive", 제압: "seize", 호위: "escort", 탈출: "escape", 탈취: "steal", 부위파괴: "hunt", 사냥: "hunt" };
const AI = { charge: "charge", hold: "hold", guard: "guard", 돌격: "charge", 대기: "hold", 수비: "guard" };
const byLen = (a) => a.slice().sort((p, q) => q.length - p.length);
const presets = (set) => Object.keys(PRE).filter((n) => !set || PRE[n].set === set);

/** 프롬프트(짧게). set: "판타지" | "현대" | 없으면 둘 다 */
export function compactPrompt(set, later, roster) {
  const mon = presets(set).join(", ");
  return `Design one battle for an original grid tactics RPG from the roleplay. Reply ONLY with lines in this format (Korean names, no JSON, no prose):
전장 <이름> | 맵 <map> | 목표 <rout|boss|survive N|seize|호위 N|탈출|탈취 <물건>|부위파괴 <곳 수> <턴>> [| 테마 <theme>] [| 날씨 <맑음|비|눈|안개|폭풍|모래바람>] [| 시간 <낮|황혼|밤>]
아군 "<이름>" <직업(이야기 속 이름 그대로, 예: 탱커·성녀·검호)> [종족] Lv<n> [m|f] 무기 <고유 이름>/<kind>/<등급>/<속성> 익힘 "<기술>" [머리 <금발|은발|흑발|갈색|빨간|파란|분홍…>] [상태 <부상|중상|피로|몸살|취기|겁먹음|격앙>] [@x,y]
적 <프리셋 or "<이름>" 직업 or "<몬스터 이름>" 몬스터프리셋> Lv<n> [x<수>] [보스] [hold|guard] [턴<n>] [@x,y]
우군 ... / 제3 ...   (same as 적)
관계 "<이름>" "<이름>" <연인|가족|친구|전우|사제|주종|라이벌> [합체기 "<둘만의 합동 공격 이름>"]   (allies whose bond the story shows; 1-3 lines)
난입 제3 ... / 난입 우군 ...   (optional: who MIGHT burst in mid-fight by chance — a beast of this place, a rival, a patrol, or a person from [로어북 인물] who fits the scene: a 제3 attacks everyone, a 우군 helps; give them their real name, rank and signature weapon; not on the field at first)
기술 "<이름>" <등급> [속성] <공격|지원|패시브|발동> <한 줄 효과>   then on the unit line: 익힘 "<이름>"
지도   (optional, instead of 맵: next 7-11 lines are rows of map chars . f m F p w b # l s i h H d n o r k u q c x(explosive barrel), equal length 8-14)
Signature skills: EVERY 아군 and every named 적 gets one 기술 that only they would have — named from their personality, weapon, element, title (not generic like "강타"). 공격 = a strike; 지원 = acts on others, its effect words decide it: 회복, 정화, 강화, 수호, 신속, 집중, 재생 (allies) or 독, 화상, 출혈, 빙결, 수면, 침묵, 둔화, 약화, 방어 저하, 실명 (enemies). Healers, bards, casters, commanders usually get 지원.
Weapons: every 아군 and every named 적 carries 무기 with a unique name from the story or their style (not "철의 검"), kind = what they really fight with (a tank: sword or axe with a shield in the name; a mage: tome/wand/orb/staff; a healer: holystaff). kinds: sword katana rapier greatsword dagger lance halberd axe greataxe hammer club whip bow longbow crossbow tome wand orb magestaff holystaff staff claw fist shield pistol rifle.
Area skill: every character who attacks also has one 공격 skill hitting an area (put 광역/휩쓸/폭발 in its effect), e.g. 기술 "강철 선풍" 희귀 공격 광역 — 방패검을 휘둘러 주변을 쓸어버린다.
Faithful to the story: Lv shows rank (rookie 3-8, veteran 10-18, famous/A-rank 20-28, legend/S-rank 30+, 1-3 ★ for the truly exceptional) and stat tweaks show what the text says (a famed archer 기술+5, a brute 힘+5 속도-2).
Objectives: 호위 = one 우군 line marked 호위대상 must live N turns; 탈출 = the party flees off the far edge; 탈취 = one 적 marked 보물 carries the thing, the party takes it and escapes; 부위파괴 = break N parts of a big monster within T turns. Pick what the scene is about, not always 전멸. 날씨/시간 follow the story. 상태 only when the story shows that person hurt, drunk, exhausted etc.
Balance: the fight should be winnable — usually as many foes as allies (bosses count as two or three); give minions lower Lv than the party, a boss about party Lv +2.
Monsters: a creature (beast, dragon, lizard, slime, undead, golem, spirit, machine …) MUST be written with its name and then the closest monster preset from the list, e.g. 적 "거대 화염 도마뱀" 늪 악어 Lv12 or 적 "그림자 늑대" 회색 늑대 Lv8 x3 — never with a human job, or it will be drawn as a person.
Unit extras: ★/★★/★★★ = clearly stronger than the level suggests (a legend, a dragon lord, the story's monster); stat tweaks like 힘+4 속도+3 수비-2 for who they are. Use them when the story shows someone exceptional, not by default.
Rules: one unit per line (x3 = three copies). The story's own people are 아군 (usually 2-5). Pick the map whose layout fits the place; coordinates are optional (x 1-12 west→east, y 1-9 north→south; allies default west, foes east). 보스 marks the leader (목표 boss). Monsters: use a preset name exactly; big beasts (dragons, golems, bears…) are sized automatically. Humans: "이름" + 직업 (+ 종족); no stats, the engine fills them. 무기 only for a named or special weapon.
${roster ? `Saved party (reuse: 아군 #id [@x,y]; do not recreate them):\n${roster}\nAfter the battle-relevant lines you may add, only for what the story really showed:\n성장 #id 힘+1 속도+1 [경험 30] [배움 skill_id] [무기 이름/kind/등급/속성] | 이유\n이탈 #id   (left the party)\n` : ""}maps: ${Object.keys(MAPS).join(", ")}
themes (only with your own map idea): ${THEMES.join(", ")}
presets: ${mon}
직업: ${Object.keys(CLASSES).join(", ")}
종족 e.g.: ${Object.keys(RACES).slice(0, 14).join(", ")} …
Example:
전장 잿빛 성당의 밤 | 맵 대성당 | 목표 boss
기술 "잿불 가르기" 희귀 화염 공격 불붙은 칼로 크게 벤다
기술 "잿불 선풍" 희귀 화염 공격 광역 — 불붙은 칼을 휘돌려 주변을 벤다
기술 "새벽 기도" 양질 지원 동료 하나를 회복시킨다
기술 "침묵의 경문" 희귀 어둠 지원 적의 입을 막는 저주(침묵)
아군 "카일" 용병 검사 인간 Lv8 m 무기 잿불의 장검/sword/희귀/fire 익힘 "잿불 가르기", "잿불 선풍"
아군 "세린" 성녀 엘프 Lv7 f 무기 새벽빛 성장/holystaff/양질 익힘 "새벽 기도"
적 해골 전사 Lv7 x3
적 "검은 사제 오르반" 암흑술사 Lv10 m 보스 guard 익힘 "침묵의 경문" @11,5` + (later ? `\nTIME SKIP: do not stage the current scene; invent a believable later battle that follows from the story, and add a line 배경 <2-4 Korean sentences: time passed, where, why the fight starts>.` : "");
}

/** 사가 줄 → loadEncounter 입력. 모르는 낱말은 버리고, 아무 것도 못 읽으면 null */
export function parseCompact(text, set, o) {
  const lines = String(text || "").replace(/```[a-z]*|```/g, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = { name: "이름 없는 전장", objective: { type: "rout" }, units: [], place: [] }, pre = byLen(presets()), jobs = byLen(Object.keys(CLASSES)), races = byLen(Object.keys(RACES)), maps = byLen(Object.keys(MAPS));
  let n = 0, boss = false, map = null, inMap = false; const grades = ["조악", "보통", "양질", "정예", "희귀", "영웅", "전설", "신화"], saved = (o && o.saved) || {};
  for (const raw of lines) {
    const l = raw.replace(/\*\*|__|`/g, "").replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").replace(/^적군/, "적").replace(/^(전장|아군|적|우군|제3세력|제3|기술|성장|이탈|배경|맵|지도)\s*[:：]\s*/, "$1 ").trim();
    if (/^전장(\s|$)/.test(l)) {
      for (const part of l.split("|").map((p) => p.trim())) {
        let m;
        if ((m = /^전장\s+(.+)$/.exec(part))) out.name = m[1].slice(0, 60);
        else if ((m = /^맵\s+(.+)$/.exec(part))) map = maps.find((k) => m[1].includes(k)) || null;
        else if ((m = /^목표\s+(부위\s?파괴|\S+)(?:\s+(\d+))?(?:\s+(\d+))?(?:\s+(.+))?/.exec(part))) { const t = OBJ[m[1].replace(/\s/g, "")]; if (t) out.objective = { type: t, ...(m[2] ? { [t === "hunt" && m[3] ? "need" : "turns"]: +m[2] } : {}), ...(t === "hunt" && m[3] ? { turns: +m[3] } : {}), ...(m[4] && t === "steal" ? { item: m[4].trim() } : {}) }; if (t === "steal" && !m[2] && /^목표\s+\S+\s+(\D.*)$/.test(part)) out.objective.item = /^목표\s+\S+\s+(.+)$/.exec(part)[1].trim(); }
        else if ((m = /^날씨\s+(\S+)/.exec(part))) out.weather = m[1];
        else if ((m = /^시간\s+(\S+)/.exec(part))) out.time = m[1];
        else if ((m = /^테마\s+(\S+)/.exec(part)) && THEMES.includes(m[1])) out.theme = m[1];
        else if (/^실내$/.test(part)) out.indoor = true;
      }
      continue;
    }
    if (inMap) { if (/^[.#a-zA-Z]{5,20}$/.test(l)) { (out.map || (out.map = [])).push(l); continue; } inMap = false; }
    if (/^지도$/.test(l)) { inMap = true; continue; }
    const bg = /^배경\s+(.+)$/.exec(l); if (bg) { out.premise = bg[1].slice(0, 500); continue; }
    const sk = /^기술\s+(?:([A-Za-z][\w-]{1,30})\s+)?["“]([^"”]{1,24})["”]\s*(.*)$/.exec(l);
    if (sk) { let rest = " " + sk[3] + " "; const gr = grades.find((g) => rest.includes(" " + g + " ")), el = Object.keys(ELEMENTS).find((e) => rest.includes(" " + e + " ")) || Object.entries(ELEMENTS).find(([, v]) => rest.includes(" " + v.n + " "))?.[0], ty = /\s(공격|기술|패시브|발동|지원)\s/.exec(rest); for (const t of [gr, el, el && ELEMENTS[el].n, ty && ty[1]]) if (t) rest = rest.replace(" " + t + " ", " "); const desc = rest.trim().slice(0, 80), kind = ty ? { 공격: "art", 기술: "art", 패시브: "passive", 발동: "proc", 지원: "support" }[ty[1]] : supportFrom(sk[2] + " " + desc) && !/공격|베|찌르|쏘|때리/.test(desc) ? "support" : undefined, id = sk[1] || hid(sk[2]);
      const o2 = { id, name: sk[2], desc, ...(gr ? { grade: gr } : {}), ...(el ? { elem: el } : {}), ...(kind ? { type: kind } : {}), traits: traitsFromText(desc + " " + sk[2]) };
      if (kind !== "support" && kind !== "passive" && kind !== "proc" && /광역|범위|주변|휩쓸|폭발|일대|난사|회전|쓸어|연쇄|폭풍|소용돌이|area|aoe/i.test(sk[2] + " " + desc)) { o2.area = true; o2.type = "art"; }
      if (kind === "support") { const eff = supportFrom(sk[2] + " " + desc) || "heal"; Object.assign(o2, { eff, on: onFoe(eff) ? "foe" : "ally", range: /원거리|멀리|광역|range/.test(desc) ? [1, 3] : [eff === "heal" || eff === "cleanse" ? 0 : 1, 2], cd: eff === "heal" ? 2 : 3 }); }
      (out.skills || (out.skills = [])).push(o2); continue; }
    const gw = /^성장\s+#?([\w-]+)\s*(.*)$/.exec(l);
    if (gw) { const [body, why] = gw[2].split("|"); const g = { id: gw[1], stats: statsOf(body), reason: (why || "").trim() || "이야기 속 성장" }, ex = /경험\s*(\d{1,3})/.exec(body), le = /배움\s+([\w,\s-]+?)(?=\s(?:무기|잊음|경험)|$)/.exec(body), fo = /잊음\s+([\w,\s-]+?)(?=\s(?:무기|배움|경험)|$)/.exec(body), wp = /무기\s+([^|]+)$/.exec(body); if (ex) g.exp = +ex[1]; if (le) g.learn = ids(le[1]); if (fo) g.forget = ids(fo[1]); if (wp) { const [name, kind, grade, elem] = wp[1].trim().split("/").map((x) => x.trim()); g.weapon = { name, ...(kind ? { kind } : {}), ...(grade ? { grade } : {}), ...(elem ? { elem } : {}) }; } (out.growth || (out.growth = [])).push(g); continue; }
    const bw = /^관계\s+["“]?([^"”]+?)["”]?\s+["“]?([^"”]+?)["”]?\s+(\S+)(?:\s+합체기\s+["“]?([^"”]+)["”]?)?\s*$/.exec(l); if (bw) { (out.bondsRaw || (out.bondsRaw = [])).push({ a: bw[1].replace(/^#/, ""), b: bw[2].replace(/^#/, ""), kind: bw[3], duo: bw[4] }); continue; }
    const aw = /^이탈\s+(.+)$/.exec(l); if (aw) { (out.away || (out.away = [])).push(...ids(aw[1])); continue; }
    const rd = /^난입\s+/.test(l), sm = /^(아군|적|우군|제3세력|제3)\s+(.+)$/.exec(l.replace(/^난입\s+/, "")); if (!sm) continue;
    const team = SIDE[sm[1]]; let s = " " + sm[2] + " ";
    const sv = /\s#([\w-]+)/.exec(s), byName = /"([^"]+)"/.exec(s), sid = sv ? sv[1] : byName && Object.keys(saved).find((k) => saved[k] === byName[1]);
    if (team === "ally" && sid && saved[sid] != null) { const at0 = /@\s*(\d{1,2})\s*,\s*(\d{1,2})/.exec(s); out.place.push({ ref: sid, team, ...(at0 ? { x: +at0[1], y: +at0[2] } : {}) }); continue; }
    const star = (s.match(/★/g) || []).length; s = s.replace(/★+/g, " "); const plus = statsOf(s); s = s.replace(STAT_RE, " ");
    const learnM = /\s익힘\s+((?:["“][^"”]+["”]|[\w-]+)(?:\s*,\s*(?:["“][^"”]+["”]|[\w-]+))*)/.exec(s); if (learnM) s = s.replace(learnM[0], " ");
    const learn = learnM ? [...learnM[1].matchAll(/["“]([^"”]+)["”]|([\w-]+)/g)].map((m) => (m[1] ? (out.skills || []).find((k) => k.name === m[1])?.id || hid(m[1]) : m[2])) : null;
    const take = (re) => { const m = re.exec(s); if (m) s = s.replace(m[0], " "); return m; };
    const cnd = take(/\s상태\s+([^\s@]+(?:\s*,\s*[^\s@,]+)*)/), vip = !!take(/\s호위대상(?=\s)/), carry = !!take(/\s보물(?=\s)/);
    const nm = take(/"([^"]{1,30})"|“([^”]{1,30})”/), lv = take(/\bLv\.?\s*(\d{1,2})\b/i), cnt = take(/\s[x×](\d)\b/), at = take(/@\s*(\d{1,2})\s*,\s*(\d{1,2})/), turn = take(/\s턴\s*(\d{1,2})\b/), isBoss = !!take(/\s보스(?=\s)/), ai = take(/\s(charge|hold|guard|돌격|대기|수비)(?=\s)/), sex = take(/\s(m|f|남|여)(?=\s)/);
    const weps = []; let wm; while ((wm = take(/\s무기\s+([^@|]+?)(?=\s(?:무기|@|Lv|보스|hold|guard|턴)|\s*$)/))) { const [name, kind, grade, elem] = wm[1].trim().split("/").map((x) => x.trim()); if (name) weps.push({ name, ...(kind ? { kind } : {}), ...(grade ? { grade } : {}), ...(elem ? { elem } : {}) }); }
    const race = races.find((k) => s.includes(k)), jt0 = /["“][^"”]+["”]\s+([^\s@]+)/.exec(sm[2]), jt = jt0 && !races.includes(jt0[1]) && !/^(Lv|★|익힘|무기|보스|[mf]$|남$|여$)/i.test(jt0[1]) ? jt0[1] : "";
    const pr = pre.find((k) => s.includes(" " + k + " ") || s.includes(" " + k)), gm = !pr && team !== "ally" ? guessMonster((nm ? nm[1] || nm[2] : "") + " " + sm[2], PRE) : null, job = gm ? "" : jobs.find((k) => s.includes(k)) || jobLike(jt);
    if (!pr && !job && !nm) continue;
    const base = pr || gm?.preset || (set === "현대" ? "경비원" : "병사"), level = Math.max(1, Math.min(40, lv ? +lv[1] : 5)), copies = Math.max(1, Math.min(6, cnt ? +cnt[1] : 1));
    for (let c = 0; c < copies; c++) {
      let id = (team === "ally" ? "a" : "u") + n++; while (saved[id] != null || (o && o.taken && o.taken.has(id))) id = (team === "ally" ? "a" : "u") + n++;
      const name = nm ? (nm[1] || nm[2]) : null, u = { id, preset: base, level, ...(name ? { name: copies > 1 ? name + " " + (c + 1) : name } : {}), ...(pr ? {} : job ? { job } : {}), ...(race && !pr && !gm ? { race } : {}), ...(gm?.elem ? { elem: gm.elem } : {}), ...(gm?.size ? { size: gm.size } : {}), ...(sex ? { sex: /m|남/.test(sex[1]) ? "m" : "f" } : {}), ...(weps.length ? { weapons: weps } : {}), ...(star ? { boost: Math.min(3, star) } : {}), ...(Object.keys(plus).length ? { plus } : {}), ...(learn ? { skills: learn } : {}), ...(cnd ? { cond: cnd[1].split(/\s*,\s*/).slice(0, 4) } : {}), ...(hairFromText(sm[2]) ? { hair: hairFromText(sm[2]) } : {}) };
      if (pr && job) u.job = job; if (!pr && job) { u.fitJob = true; if (jt && jt !== job) u.clsName = jt.slice(0, 12); } if (!weps.length && !pr && job && name) { const k = { 중기사: ["sword", "방패검"], 사제: ["holystaff", "성장"], 마도사: ["tome", "마도서"], 궁수: ["bow", "활"], 도적: ["dagger", "단검"], 창병: ["lance", "창"], 도끼전사: ["axe", "도끼"], 격투가: ["fist", "건틀릿"], 총사: ["pistol", "권총"], 기병: ["lance", "기병창"], 비행병: ["lance", "창"], 검사: ["sword", "검"] }[job]; if (k) { u.weapons = [{ name: (name.length > 6 ? name.slice(-3) : name) + "의 " + k[1], kind: k[0], grade: level >= 20 ? "희귀" : level >= 10 ? "정예" : "양질" }]; u.storyW = true; } }
      if (weps.length || u.storyW) u.storyW = true; out.units.push(u);
      const p = { ref: id, team, ...(at ? { x: +at[1] + (c % 2), y: +at[2] + Math.floor(c / 2) } : {}), ...(ai ? { ai: AI[ai[1]] } : {}), ...(isBoss && c === 0 && team !== "ally" ? { boss: true } : {}), ...(turn ? { turn: +turn[1] } : {}), ...(vip && c === 0 ? { vip: true } : {}), ...(carry && c === 0 ? { carry: true } : {}), ...(rd && (team === "friend" || team === "third") ? { pool: true } : {}) };
      if (p.boss) boss = true; out.place.push(p);
    }
  }
  if (!out.units.length) return null;
  if (out.bondsRaw) { const idBy = (n) => { const u = out.units.find((x) => x.name === n || (x.name && x.name.replace(/\s\d+$/, "") === n)); if (u) return u.id; if (saved[n] != null) return n; return Object.keys(saved).find((k) => saved[k] === n) || null; }; out.bonds = out.bondsRaw.map((b) => ({ a: idBy(b.a), b: idBy(b.b), kind: b.kind, duo: b.duo })).filter((b) => b.a && b.b); delete out.bondsRaw; }
  // 좌표가 없으면 아군은 서쪽, 나머지는 동쪽에 세로로 늘어선다(엔진이 빈 칸으로 옮겨 준다)
  const k = { ally: 0, enemy: 0, friend: 0, third: 0 };
  for (const p of out.place) if (p.x == null) { const i = k[p.team]++, west = p.team === "ally" || p.team === "friend"; p.x = west ? 2 + Math.floor(i / 5) : 11 - Math.floor(i / 5); p.y = 2 + (i % 5) * 1.6 | 0; }
  if (out.map && out.map.length >= 4) { const w = Math.max(...out.map.map((r) => r.length)); out.map = out.map.map((r) => r.padEnd(w, ".")); if (out.indoor == null) out.indoor = out.map.some((r) => r.includes("#")) && out.map[0].split("").filter((c) => c === "#").length > w / 2; } else { delete out.map; out.mapPreset = map || "평원"; }
  if (out.objective.type === "boss" && !boss) out.objective = { type: "rout" };
  return out;
}

/** 저장된 동료 목록(프롬프트용 짧은 줄). 떠난 동료는 뺀다 */
export function rosterCompact(S) {
  return Object.values(S.defs || {}).filter((d) => d.ally && !d.away).map((d) => `#${d.id} ${d.name} ${d.job || d.cls || ""} ${d.race || ""} Lv${d.level}${(d.history || []).length ? " — " + d.history.slice(-2).join("; ") : ""}`.replace(/\s+/g, " ")).join("\n");
}
/** 이전 판의 동료(능력치·레벨·장비·기술)를 새 판으로 옮긴다 */
export function carryParty(from, to) {
  if (!from || !from.defs) return; for (const d of Object.values(from.defs)) if (d.ally) { to.defs[d.id] = copy(d); delete to.defs[d.id].cond; for (const k of d.skills.concat(d.later || [])) if (from.skills[k] && !to.skills[k]) to.skills[k] = copy(from.skills[k]); }
}
/** 사가 줄을 읽어 판을 세우고, 성장·이탈까지 반영한다. 못 읽으면 null */
export function loadCompact(S, text, o) {
  const saved = Object.fromEntries(Object.values(S.defs || {}).filter((d) => d.ally).map((d) => [d.id, d.name]));
  const j = typeof text === "string" ? parseCompact(text, o && o.set, { saved, taken: new Set(Object.keys(S.defs || {})) }) : text; if (!j) return null; if (o && o.later) j.later = true;
  loadEncounter(S, j); if (j.growth && j.growth.length) applyGrowth(S, planGrowth(S, j.growth)); if (S.hunt) { balance(S); giveArea(S); giveUnique(S); personalize(S, PRE); } return j;
}

// ── 밸런스: 적 전력이 아군 전력 × 난이도 배수를 넘지 않게 졸개부터 빼고, 난이도만큼 적 능력치를 낮춘다(한 번만) ──
const POW = (S, u) => { const d = S.defs[u.ref]; return (d.level + 6) * ({ 1: 1, 2: 2.2, 3: 3.6 }[u.sz || 1]) * (u.boss ? 1.6 : 1); };
export const BUDGET = [0.65, 0.85, 1.1], ESTAT = [0.8, 0.9, 1];
export function balance(S) {
  const B = S.battle; if (!B || B.balanced || S.noBalance) return false; B.balanced = true; const df = S.diff == null ? 1 : S.diff, live = () => Object.values(B.units).filter((u) => u.hp > 0);
  const ally = live().filter((u) => u.team === "ally" || u.team === "friend").reduce((n, u) => n + POW(S, u), 0) || 1, budget = ally * BUDGET[df];
  let foes = () => live().filter((u) => u.team === "enemy" || u.team === "third"), pow = () => foes().reduce((n, u) => n + POW(S, u), 0), cut = 0;
  while (pow() > budget) { const l = foes().filter((u) => !u.boss).sort((a, b) => POW(S, a) - POW(S, b)); if (l.length <= 1) break; delete B.units[l[0].id]; cut++; }
  const over = pow() / budget, m = ESTAT[df] * (over > 1 ? Math.max(.7, 1 / Math.sqrt(over)) : 1), done = new Set();
  for (const u of foes()) { if (done.has(u.ref)) continue; done.add(u.ref); const d = S.defs[u.ref]; for (const k of Object.keys(d.stats)) d.stats[k] = Math.max(k === "hp" ? 1 : 0, Math.round(d.stats[k] * m)); }
  for (const u of foes()) { const max = S.defs[u.ref].stats.hp; if (u.hp > max) u.hp = max; if (u.parts) for (const p of Object.values(u.parts)) { p.max = Math.max(3, Math.round(p.max * m)); p.hp = Math.min(p.hp, p.max); } }
  if (B.wait) B.wait = B.wait.filter(() => true); return { cut, m };
}
// ── 광역기: 공격할 수 있는 아군·보스가 광역 기술이 없으면 무기에 맞춰 하나 붙인다 ──
const AOE = { sword: "회전베기", lance: "휩쓸어 찌르기", axe: "대지 가르기", bow: "화살비", dagger: "칼날 난무", claw: "연환격", tome: "폭발" };
/** 고유 기술: 아군·보스마다 기본(공용) 기술 말고 자기만의 기술이 하나는 있게(없으면 무기·이름으로 만든다) */
export function giveUnique(S) {
  for (const u of Object.values(S.battle.units)) {
    if (!(u.team === "ally" || u.boss)) continue; const d = S.defs[u.ref]; if (d.skills.some((k) => S.skills[k] && (S.skills[k].tier || "own") !== "common" && !S.skills[k].flags?.area)) continue;
    const w = d.weapons.find((x) => x && x.type !== "item") || {}, nm = sigName(d, w, false), sp = makeSpell({ name: nm, desc: (w.name || "") + "를 다루는 " + d.name + "만의 일격", grade: Math.min(20, 6 + Math.floor((d.level || 1) / 2)) }, d.level || 1);
    if (sp && !S.skills[sp.id]) S.skills[sp.id] = sp; if (sp && d.skills.length < 6 && !d.skills.includes(sp.id)) d.skills.push(sp.id);
  }
}
export function giveArea(S) {
  for (const u of Object.values(S.battle.units)) {
    if (!(u.team === "ally" || u.boss)) continue; const d = S.defs[u.ref], w = d.weapons.find((x) => x && x.type !== "staff" && x.type !== "item"); if (!w) continue;
    if (d.skills.some((k) => S.skills[k] && S.skills[k].type === "art" && S.skills[k].flags.area)) continue;
    const el = w.elem && ELEMENTS[w.elem] ? ELEMENTS[w.elem].n : "", base = w.type === "tome" ? (el || "마력") + " 폭발" : (el ? el + " " : "") + (AOE[w.type] || "휘두르기"), name = sigName(d, w, true); void base;
    const id = hid(d.id + name); if (!S.skills[id]) S.skills[id] = { id, name: name.slice(0, 24), desc: "목표와 그 둘레의 적을 함께 친다", type: "art", cond: "always", mods: { atk: -1 }, flags: { area: 1, ...(w.type === "tome" ? { magic: true } : {}) }, cd: 3, range: w.type === "tome" || w.type === "bow" ? [1, 2] : [1, 1], tier: "own" };
    if (d.skills.length < 6) d.skills.push(id);
  }
}
