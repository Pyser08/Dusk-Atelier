// Dusk Saga: 이야기 속 무기·기술 → 종류·등급·속성 → 성능·겉모습
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";
const duel = (w, foe = {}, map) => { const S = E.fresh(); S.seed = 2; E.loadEncounter(S, { name: "t", map: map ?? Array(8).fill(".........."), units: [{ id: "a", preset: "병사", level: 10, weapons: [w] }, { id: "b", preset: "병사", level: 1, weapons: [{ name: "철의 도끼" }], ...foe }], place: [{ ref: "a", team: "ally", x: 5, y: 5 }, { ref: "b", team: "enemy", x: 6, y: 5 }] }); return S; };
const fc = (S) => E.forecast(S, S.battle.units.a, S.battle.units.b, null).a;

test("이름과 설명에서 무기 종류를 읽는다", () => {
  for (const [t, k] of [["용의 뼈로 만든 대검", "greatsword"], ["푸른 장검", "sword"], ["사신의 낫", "scythe"], ["벚꽃 카타나", "katana"], ["은빛 레이피어", "rapier"], ["성창", "lance"], ["세계수 활", "bow"], ["쇠뇌", "crossbow"], ["낡은 지팡이", "magestaff"], ["치유의 지팡이", "holystaff"], ["금서 그리모어", "tome"], ["철선 부채", "fan"], ["리볼버", "pistol"], ["저격총", "sniper"], ["사슬", "chain"], ["영원의 하프", "instrument"], ["창문", ""], ["활동", ""], ["검은 옷", ""]]) assert.equal(E.kindFromText(t), k, t);
  for (const [k, v] of Object.entries(E.KINDS)) { assert.ok(E.WT[v.base], k); const w = E.normWeapon({ name: "시험", kind: k, grade: "정예" }); assert.equal(w.kind, k); assert.equal(w.type, v.base); assert.ok(E.lookOf(w).shape, k); } assert.ok(Object.keys(E.KINDS).length >= 40);
});
test("등급 24칸: 이름·영문·랭크를 알아듣고 높을수록 세다", () => {
  for (const [v, r] of [["조악-", 0], ["희귀+", 14], ["신화+", 23], ["legendary", 19], ["S급", 19], ["A+", 17], ["SSS", 23], [7, 7], ["모름", null]]) assert.equal(E.rankOf(v), r, String(v));
  let last = -1; for (let r = 0; r <= E.RANK_MAX; r++) { const w = E.makeWeapon({ name: "검", kind: "sword", grade: r }); assert.ok(w.mt * 10 + w.hit / 10 + w.crit >= last); last = w.mt * 10 + w.hit / 10 + w.crit; assert.ok(w.mt <= 20); assert.equal(E.rankOf(E.gradeName(r)), r); }
  assert.ok(E.rankFromText("녹슨 검") < E.rankFromText("강철 검")); assert.ok(E.rankFromText("강철 검") < E.rankFromText("전설의 검")); assert.equal(E.rankFromText("달의 검", 10), E.rankFromText("달의 검", 10)); assert.ok(E.rankFromText("이름 없는 검", 40) <= 13, "레벨만으로 희귀 이상은 안 된다");
});
test("이야기 무기는 저장·불러오기를 거쳐도 그대로이고, 옛 무기는 바뀌지 않는다", () => {
  const w = E.normWeapon({ name: "서리 문 장검", desc: "얼음의 가보", grade: "영웅" }); assert.deepEqual([w.kind, w.elem, E.gradeName(w.grade)], ["sword", "ice", "영웅"]); assert.deepEqual(E.normWeapon(JSON.parse(JSON.stringify(w))), w);
  assert.deepEqual(E.normWeapon({ name: "철의 검" }).grade, undefined); assert.equal(E.normWeapon({ name: "쇠파이프", type: "sword", mt: 4, hit: 85 }).mt, 4);
});
test("속성 상성·지형이 피해에 반영되고 무속성은 그대로다", () => {
  const w = (elem) => ({ name: "검", kind: "sword", grade: "영웅", ...(elem ? { elem } : {}) }), base = fc(duel(w("")));
  assert.equal(base.em, 1); assert.ok(fc(duel(w("fire"), { race: "설녀" })).dmg > base.dmg); assert.ok(fc(duel(w("fire"), { race: "불의 정령" })).em < 1); assert.equal(fc(duel(w("light"), { race: "악마" })).em, 1.5); assert.equal(E.typeMod("fire", { elem: "plant", elem2: "ice" }), 1.8); assert.equal(E.typeMod("fire", { elem: "water", elem2: "fire" }), .6); assert.equal(E.elemMod("fire", { elem: "plant" }, "", { elem: "fire" }), 1.8); assert.equal(E.elemMod("", { model: "ghost" }), .55); assert.equal(E.elemMod("light", { model: "ghost" }), 1.5); assert.equal(E.elemMod("water", { model: "golem", race: "" }), 1.5); assert.equal(E.elemMod("", { name: "회색 늑대" }), 1); assert.equal(E.typeWord(1.8), "큰 약점"); assert.equal(fc(duel(w("dark"), { elem: "light" })).em, 1.5); for (const k of ["arcane", "sound", "blood", "gravity"]) assert.ok(E.ELEMENTS[k] && E.elemFromText({ arcane: "룬 검", sound: "음파의 칼", blood: "피의 낫", gravity: "중력 망치" }[k]) === k, k);
  assert.ok(fc(duel(w("thunder"), {}, Array(8).fill("bbbbbbbbbb"))).em > 1); for (const [k, v] of Object.entries(E.ELEMENTS)) for (const b of v.beats) assert.ok(E.ELEMENTS[b], k);
});
test("기술: 이름은 그대로, 등급이 정한 총합 안에서 특성대로 나눈다", () => {
  const f = (o, l = 10) => E.makeSpell(o, l); assert.equal(f({ name: "" }), null); assert.equal(f({ name: "생명 흡수", desc: "어둠의 마법" }).elem, "dark"); assert.equal(f({ name: "일섬", desc: "한 번의 베기" }).flags.magic, undefined); assert.equal(f({ name: "치유의 빛" }).type, "passive");
  const texts = ["불꽃을 터뜨리는 강력한 폭발 마법", "급소를 노리는 재빠른 기습", "방패로 막아 동료를 수호한다", "무수한 연격으로 꿰뚫는 창술", "생명력을 흡수하며 회복한다", "반드시 맞는 저격", "공격을 튕겨 반감한다", "궁극의 오의, 모든 힘을 담은 일격", "아무 설명 없음", "정밀한 조준 사격으로 멀리서 맞힌다"];
  for (const desc of texts) for (let r = 0; r <= E.RANK_MAX; r++) { const s = f({ name: "고유기" + desc.length, desc, grade: r }), k = E.normSkill(s, 0); assert.ok(E.costOf(s) <= E.budgetOf(r) + 1e-6, `${desc} ${r}: ${E.costOf(s)} > ${E.budgetOf(r)}`); assert.deepEqual({ ...k, desc: "" }, { ...E.normSkill(k, 0), desc: "" }); }
  // 상한을 놀리지 않는다: 높은 등급 공격기는 예산의 절반은 쓴다
  for (const desc of [texts[0], texts[1], texts[3]]) { const s = f({ name: "기", desc, grade: 18 }); assert.ok(E.costOf(s) >= E.budgetOf(18) * .5, desc + E.costOf(s)); }
  assert.deepEqual(f({ name: "같은 기술", desc: "폭발", grade: 9 }), f({ name: "같은 기술", desc: "폭발", grade: 9 })); const hi = f({ name: "홍염", desc: "폭발", grade: "신화" }), lo = f({ name: "홍염", desc: "폭발", grade: "조악" }); assert.ok(E.costOf(hi) > E.costOf(lo));
  const a = f({ name: "기", grade: 15, traits: { pierce: 5 } }), b = f({ name: "기", grade: 15, traits: { critical: 5 } }); assert.ok(a.flags.pierce > 0 && !b.flags.pierce && b.mods.crit > 0); assert.equal(f({ name: "기", grade: 5, traits: { 해킹: 9, power: 1 } }).mods.해킹, undefined);
});
test("모델이 수치를 부풀려 보내도 등급 상한으로 깎이고, 등급 없는 옛 기술은 그대로다", () => {
  const big = () => ({ id: "x", name: "과한 기술", grade: "보통", type: "art", cd: 2, mods: { atk: 20, crit: 50, hit: 50 }, flags: { brave: true, sure: true, pierce: 100, drain: 100, mult: 3 } }), s = E.llmSkill(big(), 0); assert.ok(E.costOf(s) <= E.budgetOf(4) + 1e-6, String(E.costOf(s))); const old = E.llmSkill({ ...big(), grade: undefined }, 0); assert.equal(old.mods.atk, 8); assert.equal(old.flags.brave, true);
  const S = duel({ name: "마도서", kind: "tome", grade: "정예" }); E.applyKit(S, "a", { skills: [E.makeSpell({ name: "빙화", desc: "얼음 마법", grade: "희귀" })] }); const o = E.options(S, S.battle.units.a).find((x) => x.label === "빙화"); assert.equal(E.forecast(S, S.battle.units.a, S.battle.units.b, o.art).a.elem, "ice");
});
test("장기기억·로어북·본문에서 그 인물의 무기와 기술만 모은다", () => {
  const f = { v: 3, cursor: { at: 1 }, wiki: { documents: { d: { id: "d", type: "Character", title: "아린", aliases: [], sections: [{ heading: "능력", body: "- 빙화: 얼음 꽃을 피우는 마법 (희귀)\n- 그림자 걸음: 은신 기습" }] } } }, extra: { world: { item: { x: { name: "서리 장검", desc: "가보", owner: "아린" }, y: { name: "불의 창", owner: "미오" } } } } };
  const k = E.storyKit(f, "아린", { entries: [{ key: "아린", comment: "", content: "무기: 은빛 단검(장인이 만든), 석궁\n나이: 20" }, { key: "미오", content: "무기: 대검" }], text: "아린은 천천히 달빛 세검을 뽑았다. 미오는 대검을 휘둘렀다.", level: 10 });
  assert.deepEqual(k.weapons.map((w) => w.kind), ["dagger", "crossbow", "sword", "rapier"]); assert.deepEqual(k.skills.map((s) => [s.name, s.type]), [["빙화", "art"], ["그림자 걸음", "art"]]); assert.equal(E.gradeName(k.skills[0].grade), "희귀"); assert.deepEqual(E.storyKit({}, "없음"), { weapons: [], skills: [] });
  const S = duel({ name: "철의 검" }); S.defs.a.weapons.push(E.normWeapon({ name: "상처약" })); const got = E.applyKit(S, "a", k); assert.ok(got.includes("빙화")); assert.equal(S.defs.a.weapons.at(-1).name, "상처약"); for (let i = 0; i < 4; i++) E.endTurn(S, []);
});
test("프롬프트: 정해 둔 무기 목록이 없고 등급·종류·속성을 안내한다", () => { assert.ok(!E.GEN_PROMPT.includes("쌍격의 검")); for (const w of ["신화", "katana", "thunder", "STORY SKILLS"]) assert.ok(E.GEN_PROMPT.includes(w), w); assert.ok(E.REGEN_PROMPT.includes("INVENTORY")); });
