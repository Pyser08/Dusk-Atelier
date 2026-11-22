// 버그리포트 11-22: 카드가 응답 끝에 쓰는 긴 상태 줄([Status:date=…|time=…|location=…], 120자 넘음)을 못 읽어 장면 상태창 시간이 --:--
import test from "node:test";
import assert from "node:assert/strict";
import { kvStatus, wordTime } from "../src/engine/kvstatus.js";
import { sceneOf } from "../src/engine/scenepanel.js";
import { mergeWhen } from "../src/engine/storydate.js";

const LONG = "본문이 길게 이어진다.\n그녀는 웃었다.\n\n[Status:date=1214년 11월 29일|time=20:15|location=왕궁 동쪽 회랑|npc=리아, 세린|mood=긴장|weather=흐림|outfit=검은 망토|hp=80/100]";

test("긴 key=value 상태 줄에서 날짜·시간·장소", () => {
  assert.ok(LONG.split("\n").at(-1).length > 100);
  assert.deepEqual(kvStatus(LONG), { date: "1214-11-29", time: "20:15", place: "왕궁 동쪽 회랑" });
  assert.equal(kvStatus("상태 줄 없음"), null);
  assert.deepEqual(kvStatus("[상태 | 날짜=2026-03-02 | 시간=오후 3시 | 장소=교실]"), { date: "2026-03-02", time: "15:00", place: "교실" });
});

test("장면 상태창이 긴 상태 줄의 시간을 씀", () => {
  const s = sceneOf(LONG, { wiki: { documents: {} }, scenes: [] }, { seed: "x" });
  assert.deepEqual([s.date, s.time, s.place, s.fromLine], ["1214-11-29", "20:15", "왕궁 동쪽 회랑", true]);
});

test("저장된 장면 when이 ‘저녁’처럼 낱말이면 대략 시각(--:-- 대신)", () => {
  assert.equal(wordTime("1214년 11월 29일 저녁"), "19:00");
  assert.equal(wordTime("새벽"), "04:00"); assert.equal(wordTime("한밤중"), "00:00"); assert.equal(wordTime("그날"), "");
  const s = sceneOf("상태 줄 없음.", { wiki: { documents: {} }, scenes: [{ at: 1, when: "1214-11-29 저녁", place: "회랑" }] }, { seed: "x" });
  assert.equal(s.time, "19:00");
});

test("mergeWhen: 시각만 있는 when(‘[10:43]’)엔 날짜를 붙임, 날짜가 있으면 그대로", () => {
  assert.equal(mergeWhen("[10:43]", "1214-11-29"), "1214-11-29 [10:43]");
  assert.equal(mergeWhen("저녁", "1214-11-29"), "1214-11-29 저녁");
  assert.equal(mergeWhen("1214년 11월 29일 저녁", "1214-11-30"), "1214년 11월 29일 저녁");
  assert.equal(mergeWhen("2026-03-02 10:00", "2026-03-05"), "2026-03-02 10:00");
  assert.equal(mergeWhen("3월 2일 아침", "2026-03-05"), "3월 2일 아침");
});

test("날씨 줄이 빠지던 문제: 가장 최근 장면에 날짜가 없으면(‘[10:43]’·빈칸) 그 앞 장면의 날짜로 예보", () => {
  const f = { wiki: { documents: {} }, scenes: [{ at: 5, when: "1214년 11월 29일 저녁", place: "회랑" }, { at: 6, when: "[10:43]", place: "정원" }, { at: 7, place: "정원" }] };
  const s = sceneOf("", f, { seed: "x" });
  assert.equal(s.date, "1214-11-29"); assert.ok(s.forecast, "예보가 있어야 요청에 날씨 줄이 들어감");
  assert.equal(s.time, "10:43", "시간은 더 최근 장면의 시각"); assert.equal(s.place, "정원");
});

// 11-22 버그리포트: 이머헬퍼 상태 태그(<imh-now …/>) — att가 붙으면 100자를 넘어 못 읽어 시간이 --:--, 짧으면 연도 2000·장소 '>'
test("imh-now 태그에서 날짜·시간·장소를 읽는다(긴 att 포함)", async () => {
  const { kvStatus } = await import("../src/engine/kvstatus.js");
  const long = '본문이에요.\n<imh-now cal="2025년" date="6월 29일" wd="일" time="17:43" place="한강 공원 벤치" att="세라: 하얀 원피스, 밀짚모자, 샌들" />';
  assert.deepEqual(kvStatus(long), { date: "2025-06-29", time: "17:43", place: "한강 공원 벤치" });
  const short = '본문\n<imh-now cal="2025년" date="6월 29일" wd="일" time="17:43" place="카페" />';
  assert.deepEqual(kvStatus(short), { date: "2025-06-29", time: "17:43", place: "카페" });
});

test("peopleIn: 이미지 태그·속성 안의 봇 이름은 인물로 세지 않는다", async () => {
  const { peopleIn } = await import("../src/engine/scenepanel.js");
  const folder = { wiki: { documents: { a: { id: "a", type: "Character", title: "한세라", aliases: [] } } } };
  const t = '<img="Sera_normal_smile">\n한세라가 웃었다. 오늘은 날씨가 좋다.';
  assert.deepEqual(peopleIn(t, folder, "Sera").map((p) => p.name), ["한세라"]);
  assert.deepEqual(peopleIn("Sera가 손을 흔들었다.", { wiki: { documents: {} } }, "Sera").map((p) => p.name), ["Sera"], "본문에 나오면 그대로");
});

test("peopleIn: 영문 봇 이름이 본문에 있어도 한글 주인공 문서가 잡혔으면 더하지 않는다", async () => {
  const { peopleIn } = await import("../src/engine/scenepanel.js");
  const folder = { wiki: { documents: { a: { id: "a", type: "Character", title: "한세라", aliases: [] } } } };
  assert.deepEqual(peopleIn("한세라(Sera)가 웃었다.", folder, "Sera").map((p) => p.name), ["한세라"]);
});

test("streamMemo: 스트리밍으로 글이 늘어나는 동안은 다시 계산하지 않고, 글이 그대로면(응답 끝) 새로 계산", async () => {
  const { streamMemo } = await import("../src/engine/scenepanel.js");
  let t = 0, n = 0; const m = streamMemo({ now: () => t });
  const calc = (v) => () => { n++; return v; };
  assert.equal(await m("가나다", calc("A")), "A");
  t = 500; assert.equal(await m("가나다라", calc("B")), "A", "늘어나는 중: 직전 결과");
  t = 900; assert.equal(await m("가나다라마", calc("C")), "A");
  t = 1200; assert.equal(await m("가나다라마", calc("D")), "D", "글이 그대로 = 끝난 뒤 다시 그리기");
  t = 9000; assert.equal(await m("가나다라마바", calc("E")), "E", "오래 지나면 새로");
  assert.equal(await m("완전히 다른 응답", calc("F")), "F");
  assert.equal(n, 4);
});
