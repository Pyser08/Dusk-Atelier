// addon-rebuild: 기억 블록 척도 정리(버그리폿) — 방향별 감정·양방향 친밀도 구분, 위키 정리 노트가 있으면 Dusk 감정은 참고용, 기록 시점 표시, 원문 회상의 Status 줄 제거
import test from "node:test";
import assert from "node:assert/strict";
import { buildBlock } from "../src/engine/memoryinject.js";
import { scaleBlock, wikiAware } from "../src/engine/memoryscale.js";
const block = (f, o) => scaleBlock(buildBlock(f, o).text, { coveredAt: f.cursor?.at ?? -1, messageCount: o.messageCount });
import { buildChunks } from "../src/engine/rawrecall.js";

const f = (at) => ({ cursor: { at }, scenes: [{ id: "s1", at: 1, sum: "옥상", facts: [], who: ["미나"] }],
  people: { a: { name: "미나", records: [{ id: "r1", at: 1, h: "h", act: "고백", g: "A", orphan: false }] } },
  emo: { "미나>{{user}}": { from: "미나", to: "{{user}}", tags: { affection: 6 }, log: [] } } });

test("감정은 방향별 0~10, 관계 진도는 양방향이라고 제목에 적는다", () => {
  const t = block(f(1), { messageCount: 3, settings: {} });
  assert.match(t, /Feelings \(Dusk gauges 0-10, one direction A→B\)/);
  assert.ok(!t.includes("current gauges 0-10"));
});

test("기록 시점: 기록이 최신보다 2개 이상 뒤처지면 몇 번째까지인지 적는다", () => {
  assert.match(block(f(1), { messageCount: 6, settings: {} }), /Recorded through message 2 of 6/);
  assert.ok(!block(f(4), { messageCount: 6, settings: {} }).includes("Recorded through"), "하나 차이는 정상(지금 보낸 내 말)");
});

test("위키 정리 노트가 함께 들어가면 Dusk 감정은 참고용, 호감도 기준은 정리 노트", () => {
  const b = block(f(1), { messageCount: 3, settings: {} });
  const msgs = [{ role: "system", content: "<!-- RISUPOT_DIRECTOR_NOTE_START -->\n호감도 12 (무관심)\n<!-- RISUPOT_DIRECTOR_NOTE_END -->" }];
  const out = wikiAware(b, msgs);
  assert.match(out, /reference only/); assert.match(out, /−100~300/);
  assert.equal(wikiAware(b, [{ role: "user", content: "안녕" }]), b, "정리 노트가 없으면 그대로");
});

test("원문 회상 조각에서 [Status:…] 줄은 뺀다", () => {
  const c = buildChunks([{ text: "[Status:date=4월 2일|place=집]\n미나가 웃었다.", who: "char", mi: 3 }]);
  assert.equal(c.length, 1); assert.ok(!c[0].t.includes("Status")); assert.match(c[0].t, /미나가 웃었다/);
});

test("위키 정리 노트에 나온 수치는 척도를 한 줄로 덧붙인다", async () => {
  const { renderDirectorNote, directorScaleLine } = await import("../src/data/pot/director-runtime.js");
  const out = renderDirectorNote({ decision: "final", note: "미나 호감도 12 (무관심)", uncertainties: [] });
  assert.match(out, /Scales: 호감도\(affinity\) −100~300 — wiki values/);
  assert.equal(directorScaleLine("장면만 이어 가요"), "");
});

test("코어 공유 모듈(engine/memoryinject.js)은 건드리지 않는다 — 애드온이 옛 코어에서도 돌게", async () => {
  const fs = await import("node:fs");
  const lib = fs.readFileSync(new URL("../src/addonlib.gen.js", import.meta.url), "utf8");
  assert.ok(!lib.includes("memoryscale"), "memoryscale은 애드온 전용");
  const inj = fs.readFileSync(new URL("../src/engine/memoryinject.js", import.meta.url), "utf8");
  assert.ok(inj.includes('"Feelings (current gauges 0-10):"') && !inj.includes("wikiAware"));
});
