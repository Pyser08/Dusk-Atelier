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

import { statusCardHtml, linkNames } from "../src/engine/namecard.js";
test("상태이상: 기록 → 같은 상태는 합침 → 회복으로 지움 → 날짜로 만료, 주입 줄", () => {
  const f = { wiki: { documents: { a: doc("a", "카엘") } } };
  applyExtra(f, extraFrom("status|카엘|감기|2|3\nstatus|카엘|다리 부상|3|0", canon), { turn: 1, when: "2024-03-01" });
  applyExtra(f, extraFrom("status|카엘|감기|1|4", canon), { turn: 2, when: "2024-03-01" });
  let e = extraOf(f); assert.equal(e.status.length, 2); assert.equal(e.status[0].lv, 2, "정도는 높은 쪽");
  assert.match(extraSection(f, { present: ["카엘"], turn: 2, when: "2024-03-02" }), /Conditions.*카엘 — 감기 \(moderate, day 2\/4\).*다리 부상 \(severe, day 2, until cured\)/);
  assert.doesNotMatch(extraSection(f, { present: ["카엘"], turn: 2, when: "2024-03-02", status: false }), /Conditions/);
  applyExtra(f, extraFrom("cure|카엘|감기", canon), { turn: 3, when: "2024-03-02" });
  e = extraOf(f); assert.deepEqual(e.status.map((x) => x.effect), ["다리 부상"]);
  assert.deepEqual(extraFrom("status|카엘|감기|2|3", canon, { status: false }), []);
});

test("이름 링크: 인물마다 첫 등장에만 상태창, 태그·코드·남의 HTML 안은 그대로, 영어 이름은 낱말 경계", () => {
  const ppl = [{ names: ["세라", "Sera"], html: "<b>카드</b>" }, { names: ["시로코"], html: "C" }];
  const t = linkNames('세라는 웃었다. <img alt="세라"> 시로코와 세라가 걸었다. ```세라``` Serana met Sera.', ppl);
  assert.equal((t.match(/x-dusk="pc"/g) ?? []).length, 2, "세라·시로코 한 번씩");
  assert.ok(t.indexOf("x-dusk") < t.indexOf("는 웃었다"), "세라는 첫 등장에");
  assert.match(t, /<img alt="세라">/); assert.match(t, /```세라```/); assert.match(t, /Serana met Sera\./, "이미 단 인물(Sera=세라)은 다시 안 닮");
  assert.equal(linkNames(t, ppl), t, "두 번 달아도 같다");
  assert.equal((linkNames("세라 ".repeat(30), ppl).match(/x-dusk="pc"/g) ?? []).length, 1, "같은 인물 여러 번이어도 한 벌");
  // 2.2.22 버그리포트: 다른 플러그인 상태창 안 이름에 링크가 들어가 구조가 꼬였다
  const other = '<div class="status"><span>세라</span> HP 10</div><button>시로코</button><table><tr><td>세라</td></tr></table>';
  assert.equal(linkNames(other, ppl), other, "속성 있는 상자·버튼·표 안은 그대로");
  const plain = linkNames("<p><b>세라</b>가 왔다</p>", ppl);
  assert.equal((plain.match(/x-dusk="pc"/g) ?? []).length, 1, "꾸밈 태그(p·b) 안은 링크");
  assert.equal((linkNames('<div style="x">세라</div> 그리고 세라', ppl).match(/x-dusk="pc"/g) ?? []).length, 1, "상자 밖 첫 등장에");
});

test("상태창: 요약·스탯·상태이상·몸 흔적·NSFW(약점 자리)", () => {
  const f = { cursor: { at: 10 }, wiki: { documents: { a: { ...doc("a", "세라"), sections: [] } }, people: { profiles: { a: { summary: "검을 쓰는 기사 지망생", coreTraits: ["성실함"] } } } },
    people: { 세라: { name: "세라", records: [{ act: "시로코에게 비밀을 말했다", orphan: false }] } }, emo: { "세라>{{user}}": { from: "세라", to: "{{user}}", tags: { affection: 6, trust: 4 } } },
    life: { p: { a: { lust: 64, fat: 20, mood: { joy: 40 }, sex: { by: {} }, uses: {} } } },
    nsfw: { a: { sexual: { eroticInterest: 70 }, zones: [{ part: "ears", level: 3, spot: "왼쪽 귓불", note: "숨결에 움찔" }], positions: [], tags: { likes: ["밧줄"] } } } };
  applyExtra(f, [{ kind: "status", name: "세라", effect: "취함", lv: 2, days: 1 }, { kind: "mark", name: "세라", part: "목", desc: "키스마크", days: 3 }], { turn: 10 });
  const h = statusCardHtml(f, f.wiki.documents.a);
  for (const s of ["검을 쓰는 기사 지망생", "성실함", "시로코에게 비밀을 말했다", "호감", "6/10", "신뢰", "4/10", "취함", "목 키스마크", "약점", "왼쪽 귓불", "밧줄", ">지금 상태<", ">요약<", ">NSFW<"]) assert.ok(h.includes(s), s);
  assert.equal((h.match(/x-dusk="tab"/g) ?? []).length, 2, "일반·NSFW 두 탭");
  assert.match(h, /x-tab="g" name="(dkpc-[\w-]+)" open[\s\S]*x-tab="n" name="\1"(?! open)/, "같은 묶음, 일반이 열림");
  assert.ok(h.indexOf("목 키스마크") > h.indexOf('x-tab="n"'), "몸 흔적은 NSFW 탭");
  assert.doesNotMatch(statusCardHtml(f, f.wiki.documents.a, { adult: false }), /x-dusk="tab"/, "성인 프로필 없으면 탭 없이 한 판");
  const linked = linkNames("세라가 왔다", [{ names: ["세라"], html: h }]);
  assert.equal(linkNames(linked, [{ names: ["세라"], html: h }]), linked, "이미 단 상태창 안은 다시 안 건드림");
  assert.doesNotMatch(statusCardHtml(f, f.wiki.documents.a, { adult: false }), />NSFW</);
  assert.match(h, /linear-gradient\(140deg/, "사진 없으면 글자 동그라미");
  assert.match(statusCardHtml(f, f.wiki.documents.a, { img: "data:image/jpeg;base64,AAA" }), /<img x-face src="data:image\/jpeg;base64,AAA"/);
  applyExtra(f, extraFrom("wear|세라|상의|흰 블라우스|얇은 흰 면 블라우스, 단추 두 개 풀림\nwear|세라|목걸이|은 목걸이|가는 은사슬", (n) => n), { turn: 10 });
  const h2 = statusCardHtml(f, f.wiki.documents.a);
  assert.match(h2, />옷차림</); assert.match(h2, /흰 블라우스/); assert.match(h2, /삽화용 상세 ›/); assert.match(h2, /단추 두 개 풀림/);
  assert.match(extraSection(f, { present: ["세라"], turn: 10 }), /세라 is wearing: 상의 흰 블라우스 · 액세서리 은 목걸이/);
  applyExtra(f, extraFrom("strip|세라|상의", (n) => n), { turn: 11 });
  assert.doesNotMatch(statusCardHtml(f, f.wiki.documents.a), /흰 블라우스/, "벗으면 빠짐");
});

import { partOf, BODY_PARTS } from "../src/engine/humanitems.js";
test("여성 부위: 질·자궁·클리토리스를 따로 알아보고, 남성 무작위에선 뺀다", () => {
  assert.equal(partOf("클리")?.id, "clit"); assert.equal(partOf("음핵")?.id, "clit");
  assert.equal(partOf("질 입구")?.id, "vagina"); assert.equal(partOf("질")?.id, "vagina");
  assert.equal(partOf("자궁")?.id, "womb"); assert.equal(partOf("포르치오")?.id, "womb");
  assert.equal(partOf("사타구니")?.id, "groin"); assert.equal(partOf("성질")?.id ?? null, null, "‘성질’은 질이 아님");
  for (let i = 0; i < 40; i++) assert.ok(randomZones(`m${i}`, { female: false }).every((z) => !BODY_PARTS.find((p) => p.id === z.part)?.sex));
  assert.ok(Array.from({ length: 60 }, (_, i) => randomZones(`f${i}`, { female: true })).flat().some((z) => ["clit", "vagina", "womb"].includes(z.part)));
});

import { sceneOf, peopleIn, scenePanelHtml, dateLabel, WX } from "../src/engine/scenepanel.js";
import { imagePathFor } from "../src/data/charimg.js";
test("장면 상태창: 상태 줄에서 날짜·시간·장소, 본문에서 날씨, 나온 인물, 이름은 캐릭터 상태창 링크", () => {
  const f = { wiki: { documents: { a: doc("a", "세라"), b: doc("b", "시로코") } }, extra: { weather: { w: "맑음" } }, scenes: [{ at: 3, when: "2026-03-01 10:00", place: "교실" }] };
  const t = "[2026-03-02 22:40 | 은빛 여관]\n창밖에 비가 내렸다. 세라는 조용히 웃었다.";
  const s = sceneOf(t, f); assert.deepEqual([s.date, s.time, s.place, s.weather, s.fromLine], ["2026-03-02", "22:40", "은빛 여관", "비", true]);
  assert.equal(sceneOf("상태 줄 없음. 그냥 이야기.", f).weather, "맑음", "본문에 없으면 저장된 날씨");
  assert.equal(sceneOf("상태 줄 없음", f).place, "교실", "없으면 마지막 장면");
  assert.deepEqual(peopleIn(t, f, "봇").map((p) => p.name), ["세라"]);
  const h = scenePanelHtml({ ...s, people: [{ name: "세라", card: "<b>카드</b>" }, { name: "봇" }] });
  for (const x of ["x-dusk=\"scene\"", "2026년 3월 2일 (월)", "22:40", "은빛 여관", "🌧️", "dkRain", "등장", 'x-dusk="pc"', "봇"]) assert.ok(h.includes(x), x);
  assert.equal(scenePanelHtml({}), "");
  assert.ok(Object.keys(WX).length >= 10); assert.equal(dateLabel("2026-03-02"), "2026년 3월 2일 (월)");
});
test("캐릭터 사진: 봇 본인은 대표 이미지, 다른 인물은 이름이 든 에셋(기본 표정 먼저), 없으면 빈 값", () => {
  const ch = { name: "세라", image: "img/main.png", emotionImages: [["시로코_화남", "e/1.png"], ["시로코_기본", "e/2.png"]], additionalAssets: [["유나 프로필", "a/1.png", "png"]] };
  assert.equal(imagePathFor(ch, ["세라"]), "img/main.png");
  assert.equal(imagePathFor(ch, ["시로코"]), "e/2.png");
  assert.equal(imagePathFor(ch, ["유나"]), "a/1.png");
  assert.equal(imagePathFor(ch, ["카엘"]), "");
});
