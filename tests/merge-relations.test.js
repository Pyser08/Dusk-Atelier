// 11-23: 인물 합치기 때 관계도(관계 종류 extra.ties)·흔적·성인 기록도 남길 인물로 옮기고, 이름이 완전히 같으면 자동으로 합친다
import test from "node:test";
import assert from "node:assert/strict";
import { relinkNames } from "../src/engine/memoryuser.js";
import { applyEntryMerge, mergeEntries } from "../src/engine/peoplemerge.js";
import { duplicateGroups, mergeExactDuplicates } from "../src/engine/peopledupe.js";
import { tieKey } from "../src/engine/ties.js";

test("relinkNames가 관계 종류(extra.ties)를 새 이름으로 옮기고 겹치면 합친다", () => {
  const f = { extra: { ties: {
    [tieKey("민지", "{{user}}")]: { a: "민지", b: "{{user}}", kinds: { lover: { up: "", at: 1 } } },
    [tieKey("김민지", "{{user}}")]: { a: "김민지", b: "{{user}}", kinds: { friend: { up: "", at: 2 } } },
    [tieKey("민지", "김민지")]: { a: "민지", b: "김민지", kinds: { friend: { at: 0 } } },
  }, marks: [{ name: "민지", part: "목", desc: "키스마크", days: 3 }] } };
  relinkNames(f, ["민지"], "김민지");
  const t = Object.values(f.extra.ties);
  assert.equal(t.length, 1);
  assert.deepEqual(Object.keys(t[0].kinds).sort(), ["friend", "lover"]);
  assert.equal(f.extra.marks[0].name, "김민지");
});

test("합치기: 합칠 문서의 성인 기록(life·nsfw)이 남길 문서로 옮겨진다", () => {
  const f = { people: {}, wiki: { documents: {
    a: { id: "a", type: "Character", title: "하나", aliases: [], sections: [] },
    b: { id: "b", type: "Character", title: "하나2", aliases: [], sections: [] } } },
    life: { p: { a: { sex: { n: 1, by: {} } }, b: { sex: { n: 2, by: {} }, cum: { ml: 5 } } } }, nsfw: { b: { sexual: { x: 1 } } } };
  const items = mergeEntries(f);
  applyEntryMerge(f, items.find((i) => i.docId === "a"), items.find((i) => i.docId === "b"), null);
  assert.equal(f.life.p.a.sex.n, 3);
  assert.equal(f.life.p.a.cum.ml, 5);
  assert.deepEqual(f.nsfw.a, { sexual: { x: 1 } });
  assert.equal(f.life.p.b, undefined);
});

import * as L from "../src/engine/pot/wiki-schema.js";
test("이름이 완전히 같은 문서만 자동으로 합친다(성+이름은 아님)", () => {
  const now = "2026-01-01T00:00:00Z";
  let sc = L.createEmptyWikiScope({ characterId: "c", chatKey: "k", characterName: "봇", chatName: "채팅" }, now);
  for (const t of ["하나", "하나", "김하나"]) sc = L.createWikiDocument(sc, { type: "Character", title: t, aliases: [], sections: [], tags: [], links: [], metrics: [] }, { now });
  const f = { people: {}, wiki: sc };
  assert.equal(duplicateGroups(f, { exact: true }).length, 1);
  assert.equal(duplicateGroups(f, { exact: true })[0].length, 2);
  assert.equal(mergeExactDuplicates(f).merged, 1);
  assert.deepEqual(Object.values(f.wiki.documents).map((d) => d.title).sort(), ["김하나", "하나"]);
});
