// 0.3.22 소문·목표·세계 문서·몸 흔적·근황·@인물·궁합·인물 옮기기·성감대 무작위
import test from "node:test";
import assert from "node:assert/strict";
import { extraFrom, applyExtra, extraSection, mentionsOf, compatOf, personPack, insertPack, activeMarks, extraOf, dayGap } from "../src/engine/memextra.js";
import { randomZones, spotXY, ZONE_BANK } from "../src/engine/zonegen.js";
import { applyHumanReports, normZones, extLine } from "../src/engine/humanitems.js";
import { nsfwFrom } from "../src/engine/recorder.js";
import { seedZones } from "../src/data/nsfwturn.js";

const canon = (n) => (["시로코", "카엘", "미나"].includes(n) ? n : "");
const doc = (id, title, aliases = []) => ({ id, title, aliases, type: "Character" });

test("기록기 줄 읽기: told·goal·place·item·faction, mark는 성인 항목일 때만", () => {
  const raw = ["told|시로코|카엘|미나가 왕녀라는 것", "goal|카엘|기사단장 되기|40|active", "place|은빛 여관|항구 옆 2층 여관",
    "item|은반지|어머니의 유품|{{user}}", "faction|검은 장미단|도적 길드|카엘, 미나", "mark|미나|목|키스마크|3", "told|시로코|시로코|자기 자신"].join("\n");
  const r = extraFrom(raw, canon);
  assert.deepEqual(r.map((x) => x.kind), ["told", "goal", "place", "item", "faction"]);
  assert.equal(r[3].owner, "{{user}}"); assert.deepEqual(r[4].members, ["카엘", "미나"]); assert.equal(r[1].prog, 40);
  assert.equal(extraFrom(raw, canon, { marks: true }).filter((x) => x.kind === "mark")[0].days, 3);
});

test("반영: 소문 중복 없음, 목표 진척 갱신, 세계 문서 병합, 흔적 만료", () => {
  const f = {};
  applyExtra(f, extraFrom("told|시로코|카엘|비밀 통로 위치\ngoal|카엘|기사단장 되기|10|active\nplace|은빛 여관|항구 옆", canon), { turn: 5, when: "2024-03-01" });
  applyExtra(f, extraFrom("told|시로코|카엘|비밀 통로 위치\ngoal|카엘|기사단장 되기|55|active\nplace|은빛 여관|항구 옆 2층, 주인은 노파", canon), { turn: 9 });
  const e = extraOf(f);
  assert.equal(e.rumors.length, 1);
  assert.equal(e.goals["카엘"].list.length, 1); assert.equal(e.goals["카엘"].list[0].prog, 55);
  assert.equal(e.world.place["은빛여관"].n, 2); assert.match(e.world.place["은빛여관"].desc, /노파/);
  applyExtra(f, [{ kind: "mark", name: "미나", part: "목", desc: "키스마크", days: 2 }], { turn: 10, when: "2024-03-01" });
  assert.equal(activeMarks(extraOf(f).marks, 11, "2024-03-02").length, 1);
  assert.equal(activeMarks(extraOf(f).marks, 11, "2024-03-05").length, 0, "날짜로 만료");
  assert.equal(activeMarks(extraOf(f).marks, 10 + 6 * 3, "").length, 0, "날짜 없으면 턴으로 만료");
  assert.equal(dayGap("2024-02-28", "2024-03-01"), 2);
});

test("주입: 돌아온 인물 근황·목표·들은 말·흔적·세계, @인물", () => {
  const f = { wiki: { documents: { a: doc("a", "카엘"), b: doc("b", "미나") } }, life: { p: { a: { seen: 3 }, b: { seen: 48 } } } };
  applyExtra(f, extraFrom("told|시로코|카엘|미나가 왕녀라는 것\ngoal|카엘|기사단장 되기|40|active\nplace|은빛 여관|항구 옆 여관", canon), { turn: 40 });
  applyExtra(f, [{ kind: "mark", name: "미나", part: "목", desc: "키스마크", days: 3 }], { turn: 49 });
  const t = extraSection(f, { present: ["카엘", "미나"], recent: "카엘이 은빛 여관 문을 열었다. 미나가 웃었다", turn: 50, pinned: ["미나"] });
  assert.match(t, /카엘 is back after 47 messages/); assert.match(t, /기사단장 되기 \(40%\)/);
  assert.match(t, /카엘 heard from 시로코/); assert.match(t, /미나 — 목 키스마크/); assert.match(t, /은빛 여관\(장소\)/);
  assert.match(t, /pointed at 미나/); assert.doesNotMatch(t, /미나 is back/);
  const t2 = extraSection(f, { present: ["카엘"], recent: "아무도 없다", turn: 50 });
  assert.doesNotMatch(t2, /is back/, "기억 블록에만 든 인물은 돌아온 것으로 보지 않음");
  assert.deepEqual(mentionsOf("@미나 어디 갔어? @카엘", Object.values(f.wiki.documents)), ["미나", "카엘"]);
});

test("궁합: 겹치는 취향·엇갈림·안 해 본 것", () => {
  const a = { positions: [{ label: "기승위", preference: "preferred" }], tags: { likes: ["밧줄"], limits: ["공개 장소"] }, sexual: { eroticInterest: 70 }, axes: { initiative: 80 } };
  const b = { positions: [{ label: "기승위", preference: "preferred" }], tags: { likes: ["밧줄", "공개 장소"], limits: [] }, sexual: { eroticInterest: 60 }, axes: { initiative: 30 } };
  const c = compatOf(a, b, { usesA: { 기승위: 2 } });
  assert.deepEqual(c.shared.sort(), ["기승위", "밧줄"].sort()); assert.equal(c.clash.length, 1); assert.deepEqual(c.untried, ["밧줄"]);
  assert.match(c.lead, /맞물려/); assert.ok(c.score > 0 && c.score <= 100);
});

test("인물 옮기기: 문서·프로필·성인·목표를 복사, 같은 이름이면 (옮김)", () => {
  const src = { wiki: { documents: { a: { ...doc("a", "카엘"), relations: [{ to: "x" }] } }, people: { profiles: { a: { p: 1 } } } }, nsfw: { a: { sexual: { eroticInterest: 50 } } }, life: { p: { a: { lust: 40, seen: 9 } } } };
  applyExtra(src, [{ kind: "goal", name: "카엘", goal: "기사단장", prog: 20, status: "active" }], { turn: 1 });
  const pack = personPack(src, "a");
  const dst = { wiki: { documents: { z: doc("z", "카엘") } } };
  const r = insertPack(dst, pack, { newId: "m1" });
  assert.equal(r.title, "카엘(옮김)"); assert.deepEqual(dst.wiki.documents.m1.relations, []);
  assert.equal(dst.nsfw.m1.sexual.eroticInterest, 50); assert.equal(dst.life.p.m1.seen, null); assert.equal(extraOf(dst).goals["카엘(옮김)"].list[0].goal, "기사단장");
  assert.equal(src.wiki.documents.a.title, "카엘", "원본은 그대로");
});

test("성감대 무작위: 같은 인물은 같은 결과, 약점 정확히 1곳(정확한 자리·특징 포함)", () => {
  const a = randomZones("doc1"), b = randomZones("doc1");
  assert.deepEqual(a, b);
  assert.ok(a.length >= 3 && a.length <= 5);
  const weak = a.filter((z) => z.level === 3); assert.equal(weak.length, 1); assert.ok(weak[0].spot);
  assert.ok(a.every((z) => z.note && z.src === "random"));
  const xy = spotXY(weak[0].part, weak[0].spot); assert.ok(Number.isFinite(xy.x) && Number.isFinite(xy.y));
  assert.ok(Object.values(ZONE_BANK).every((b) => b.f.length && b.s.length));
  const kept = randomZones("doc2", { keep: [{ part: "ears", level: 3, note: "x", spot: "왼쪽 귓불" }] });
  assert.equal(kept.filter((z) => z.level === 3).length, 1, "이미 약점이 있으면 더 안 만듦");
});

test("성감대 기록: 한 줄 특징과 약점의 정확한 자리, 주입 줄에 보임", () => {
  const r = nsfwFrom("zone|미나|귀|3|숨결만 닿아도 움찔한다|왼쪽 귓불", ["미나"].map((n) => ({ name: n })));
  assert.equal(r[0].spot, "왼쪽 귓불");
  const n = applyHumanReports({ zones: [{ part: "ears", level: 3, note: "" }] }, r).nsfw;
  assert.equal(n.zones[0].note, "숨결만 닿아도 움찔한다"); assert.equal(n.zones[0].spot, "왼쪽 귓불");
  assert.equal(normZones(n.zones)[0].spot, "왼쪽 귓불");
  assert.match(extLine(n), /귀\(약점: 왼쪽 귓불 — 숨결만/);
});

test("턴 처리: 성감대가 빈 성인 인물만 무작위로 채움(한 번만)", () => {
  const f = { wiki: { documents: { a: doc("a", "미나"), b: doc("b", "카엘") } }, nsfw: { a: { sexual: { eroticInterest: 50 } }, b: { sexual: {}, zones: [] } } };
  assert.deepEqual(seedZones(f, ["미나", "카엘"]), ["미나"]);
  assert.ok(f.nsfw.a.zones.length >= 3 && f.nsfw.a.zonesSeeded);
  assert.deepEqual(seedZones(f, ["미나"]), []);
});
