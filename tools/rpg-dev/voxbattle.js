// 전투 화면 ↔ 복셀: 유닛 정보(직업·무기·등급·속성·종족)를 차림으로 옮기고 프레임마다 움직인다. 규칙은 모른다
import * as THREE from "three";
import { makeVox, Player, stanceOf, movesOf, MOVE, GEARS, OFFABLE, TWO, ANIM, FXT } from "./voxkit.js";
import { makeMon, MONS } from "./voxmon.js";
import { MonPlayer, MANIM } from "./voxmonanim.js";
import { WeaponFx } from "./wfx.js";
import { raceOpt, SIZE } from "./voxrace.js";
export const K = .4; // 사람 키 약 1칸
const KIND = { katana: "katana", rapier: "thin", greatsword: "great", saber: "curve", twinsword: "sword", whip: "whip", halberd: "halberd", trident: "trident", javelin: "spear", pike: "lance", staffpole: "pole", scythe: "scythe", hammer: "hammer", greataxe: "battle", club: "club", throwaxe: "hatchet", crossbow: "crossbow", longbow: "longbow", shortbow: "bow", fan: "fan", chakram: "chakram", shuriken: "shuriken", needle: "dagger", dagger: "dagger", wand: "wand", orb: "orb", talisman: "charm", instrument: "lute", tome: "book", holystaff: "crook", magestaff: "staff", shield: "mace", claw: "claw", fist: "fist", chain: "flail", sniper: "sniper", shotgun: "shotgun", smg: "smg", rifle: "rifle", pistol: "pistol", beam: "beam", bow: "bow", lance: "lance", axe: "axe", sword: "sword" };
const TYPE = { sword: "sword", lance: "lance", axe: "axe", bow: "bow", tome: "book", dagger: "dagger", staff: "crook", claw: "fist" };
const NAME = [[/역수/, "rdagger"], [/대태도|노다치/, "nodachi"], [/소태도|와키자시/, "wakizashi"], [/쿠크리/, "kukri"], [/글라디우스|짧은 검/, "gladius"], [/플랑베르주|플람베르크|물결\s?대검/, "flam"], [/광선검/, "beam"], [/넓은 검|브로드/, "broad"], [/장검|롱소드|바스타드/, "long"], [/삼지 단검|(?:^|\s)사이$/, "sai"], [/카타르/, "katar"], [/한손 낫|작은 낫|사슬낫/, "sickle"], [/언월도|글레이브|월도/, "glaive"], [/곡괭이/, "pick"], [/가시 철퇴|모닝스타/, "morning"], [/사슬 철퇴|플레일/, "flail"], [/철퇴|메이스/, "mace"], [/톤파/, "tonfa"], [/쌍절곤/, "nunchaku"], [/셉터|왕홀/, "scepter"], [/횃불/, "torch"], [/등불|랜턴/, "lantern"], [/머스킷|플린트|구식 권총/, "flint"]];
export function gearOf(look, w) { const k = look?.kind ?? "", nm = String(look?.name ?? ""); if (!w) return ""; for (const [re, g] of NAME) if (re.test(nm)) return g; return KIND[k] ?? TYPE[w] ?? "sword"; }
const OUT = [[/암살|닌자|인자|쿠노이치/, "ninja"], [/왕(?!국|실)|군주|황제|여왕|폐하/, "royal"], [/귀족|백작|공작|영주/, "noble"], [/성벽|장군|중기사|중장/, "heavy"], [/기사|근위|성기사|팔라딘/, "knight"], [/마도|마법|현자|술사|마녀/, "mage"], [/사제|주교|성녀|신관|수녀/, "priest"], [/궁|레인저|사냥/, "ranger"], [/도적|괴도|산적|강도|도둑/, "rogue"], [/격투|권성|기공|투사|무도/, "fighter"], [/저격|속사|총사|군인|특수|용병/, "hunter"], [/경호|요원|정장|형사|조직/, "suit"], [/학생|교복/, "uniform"], [/무사|사무라이|낭인|검객/, "samurai"], [/해적|선장|항해/, "pirate"], [/음유|시인|악사|가수/, "bard"], [/수도승|승려|무승/, "monk"], [/야만|광전사|전사족|부족/, "barbarian"], [/메이드|하녀|시녀|집사/, "maid"], [/연금|약사|발명|학자/, "alchemist"], [/드루이드|자연|숲지기/, "druid"], [/병|수비|경비|창술/, "soldier"], [/무희|상인|평민|마을/, "dancer"]];
export function outfitOf(cls, w, mt, names) { const hit = OUT.find(([re, k]) => re.test(cls ?? "") && names.includes(k)); return hit?.[1] ?? (mt === "armor" ? "heavy" : mt === "horse" || mt === "fly" ? "knight" : { tome: "mage", staff: "priest", bow: "ranger", dagger: "rogue", claw: "fighter", lance: "soldier", axe: "soldier" }[w] ?? "traveler"); }
// 복셀로 바꾼 몬스터. 나머지는 예전 모형 그대로
const MON = { wolf: ["wolf"], fox: ["wolf", { c: [0xd8843a, 0xe89a50, 0xfaf0e0, 0xa85a24, 0xffd84a] }], slime: ["slime"], spider: ["spider"], golem: ["golem"], icegolem: ["golem", { elem: "ice", c: [0x9fc8dc, 0xc0e2f0, 0x6a98b4, 0xeafaff, 0xbff4ff] }], skeleton: ["skeleton"], ghost: ["ghost"], shadow: ["ghost", { c: [0x4a3f60, 0x6a5a88, 0x8a5ac0, 0x1f1830, 0xff5a8a] }], wyvern: ["wyvern"], dragon: ["dragon"] };
const DRG = { ice: [0x7ab0d0, 0x98c8e4, 0xeaf6fc, 0x3f6f9a, 0xbff4ff, 0x4a7aa8], thunder: [0xb8983a, 0xd8b850, 0xf4e8c0, 0x6a5420, 0x9af0ff, 0x8a6a28], dark: [0x3a3048, 0x54466a, 0x8a7a98, 0x1c1626, 0xd84aff, 0x2a1f3a], light: [0xe8e0d0, 0xfaf4e6, 0xfff8e0, 0xc8a850, 0xffd84a, 0xd8c08a], plant: [0x4f8a3f, 0x6aa854, 0xd8e0a0, 0x2f5428, 0xffd84a, 0x3f6a30], water: [0x3a78b0, 0x549ad0, 0xc8e8f4, 0x1f4a7a, 0xffe88a, 0x2a5a90], poison: [0x6a4a88, 0x8660a8, 0xc8d890, 0x3a2850, 0xb8ff4a, 0x54386a], earth: [0x8a7050, 0xa88a64, 0xd8c8a0, 0x54402c, 0xffc84a, 0x6a5038], wind: [0x6aa890, 0x88c4ac, 0xe8f4e0, 0x3f7060, 0xfff08a, 0x4a8872], steel: [0x8a94a4, 0xa8b2c2, 0xd0d8e2, 0x545e70, 0x5ae0ff, 0x646e80] };
const SK = {};
export function createVox(scene) {
  const fx = new WeaponFx(scene, K), live = new Set();
  /** 유닛 하나. 못 만드는 몬스터면 null */
  function make(team, info, boss, col, race0) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); let u, h;
    if (info.model) { const m = MON[info.model] ?? (info.model === "horse" ? ["nightmare"] : MONS[info.model] ? [info.model] : null); if (!m) return null; const el = info.elem, opt = { ...m[1], ...(el ? { elem: el } : {}), ...(/dragon|wyvern/.test(info.model) && DRG[el] ? { c: DRG[el] } : {}), tier: boss ? 6 : 3 }, v = makeMon(m[0], opt), sc = K * ({ dragon: .84, wyvern: .8, golem: .9, spider: .84, skeleton: .98, hydra: .86, kraken: .8, tank: .82, eagle: .84, bat: .84 }[m[0]] ?? .9) * (boss && m[0] !== "dragon" ? 1.25 : 1); v.root.scale.setScalar(sc); body.add(v.root); u = { v, p: new MonPlayer(v), sc: sc / K, o: { mon: m[0] } }; h = v.h * sc; }
    else {
      const w = info.w ?? "", lk = info.look ?? {}, gear = gearOf(lk, w), names = Object.keys(OUTN), outfit = names.includes(info.outfit) ? info.outfit : outfitOf(info.cls, w, info.mt, names), twin = lk.kind === "twinsword" || lk.shape === "twin" || /쌍|듀얼/.test(lk.name ?? ""), off = twin && OFFABLE.has(gear) ? gear : lk.kind === "shield" || (info.mt === "armor" && !TWO.test(gear) && OFFABLE.has(gear)) ? "kite" : outfit === "knight" && /^(sword|long|mace|spear)$/.test(gear) ? "kite" : "";
      const ro = raceOpt(info.race || "human"), race = ro.race, o = OUTN[outfit], tint = (c, k) => new THREE.Color(c).lerp(new THREE.Color(col), k).getHex();
      const v = makeVox({ outfit, sex: info.sex === "f" ? "f" : "m", gear, off, tier: lk.tier ?? 1, elem: lk.elem ?? "", race, skin: ro.skin || info.skin, hair: ro.hair || info.hair, dye: { cloth: tint(o.cloth, .5), capeC: col, ...(boss && !o.cape ? { cape: 1 } : {}) } });
      const mk = (info.mt === "horse" || (info.mt === "fly" && !race?.wings)) && !race?.lower ? (info.mt === "fly" ? "pegasus" : "horse") : "", small = SIZE(info.race ?? ""), sc = K * small * (boss ? 1.12 : 1); v.root.scale.setScalar(sc); body.add(v.root); u = { v, p: new Player(v, { stance: stanceOf(gear) }), sc: sc / K, o: { gear, off } }; h = 2.5 * sc;
      if (mk) { const m = makeMon(mk, { cloth: col }); m.root.scale.setScalar(K * .86); body.add(m.root); v.root.position.set(0, m.def.mount * m.U * K * .86 - 10.4 * .075 * sc, -.06); u.mount = { v: m, p: new MonPlayer(m) }; h += .42; }
    }
    const box = new THREE.Mesh(BOX, HID); box.scale.set(.75, h, .75); box.position.y = h / 2; g.add(box); Object.assign(g.userData, { body, rig: null, pick: box, vox: u, h }); u.g = g; return g;
  }
  const join = (u) => { live.add(u); fx.add(u); if (!u.v.mon) u.p.play(u.p.stance, { fade: 0 }); }, drop = (u) => { live.delete(u); fx.drop(u); };
  const pose = (u, dt) => { u.p.tick(dt); if (u.mount) { u.mount.p.tick(dt); if (u.p.cur !== "death") { const B = u.v.B; B.ulR.rotation.set(-1.15, 0, -.5); B.ulL.rotation.set(-1.15, 0, .5); B.llR.rotation.set(1.2, 0, 0); B.llL.rotation.set(1.2, 0, 0); } } };
  /** 판 위 상태에 맞춰: 걷기·쓰러짐·서기 */
  function tick(u, dt, s) { const p = u.p, mon = !!u.v.mon; if (s.gone) { if (p.cur !== "death") p.play("death"); } else if (!u.act) { const want = s.move ? "run" : mon ? "idle" : u.mount ? "idle" : p.stance, loop = mon ? p.an.loop : ANIM[p.cur].loop; if (p.cur === "death" || (loop && p.cur !== want && (want === "run" || p.cur === "run" || p.cur === "walk"))) p.play(u.mount && want === "run" ? "idle" : want); if (s.hurt && loop && !s.move) p.play("hurt"); } if (u.mount) { const q = u.mount.p, w = s.gone ? "death" : s.move ? "run" : "idle"; if (q.cur !== w) q.play(w); } pose(u, dt); }
  const frame = (dt) => { FXT.value = (FXT.value + dt) % 1000; fx.tick(dt); };
  /** 공격 하나: lunge(0~1)로 다가가고, 맞는 순간 land()가 한 번 불린다 */
  const isFar = (u, n) => (u.v.mon ? !!MANIM[u.v.mon][n].far : !!ANIM[n].far);
  function pick(u, gap, turn) { if (u.v.mon) { const l = u.v.def.at, want = l.filter((n) => isFar(u, n) === gap > 1.3); return (want.length ? want : l)[turn % (want.length || l.length)]; } const l = movesOf(u.o.gear, u.v.off || u.o.off), far = l.filter((n) => isFar(u, n)), near = l.filter((n) => !isFar(u, n)); if (gap > 1.3) return far[turn % far.length] ?? (u.o.gear === "whip" ? "lash" : "throwA"); return (near.length ? near : far)[turn % (near.length || far.length)]; }
  const reach = (u) => (u.v.mon ? (u.v.len + .25) * u.sc * K : Math.min(1.6, .5 + (u.o.gear === "whip" ? 1.4 : Math.abs(u.v.reachM || .25))) * K * u.sc);
  const timing = (u, n) => { const A = u.v.mon ? MANIM[u.v.mon][n] : ANIM[n]; return { d: A.d, hit: A.d * A.hit }; };
  return { timing, make, join, drop, tick, pose, frame, fx, pick, isFar, reach, K };
}
const BOX = new THREE.BoxGeometry(1, 1, 1), HID = new THREE.MeshBasicMaterial({ visible: false });
import { OUTFITS as OUTN } from "./voxkit.js"; void MOVE; void GEARS; void MONS; void SK;
