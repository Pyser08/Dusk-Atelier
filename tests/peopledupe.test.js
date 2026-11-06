import test from "node:test";
import assert from "node:assert/strict";
import { duplicateGroups, mergeAllDuplicates } from "../src/engine/peopledupe.js";

const doc = (id, title, aliases = [], n = 0) => ({ id, type: "Character", title, aliases, sections: Array.from({ length: n }, (_, i) => ({ id: id + i })) });
const folder = (docs, people = {}) => ({ people, wiki: { documents: Object.fromEntries(docs.map((d) => [d.id, d])) } });

test("같은 이름(띄어쓰기·기호 무시)과 '제목=상대 별칭'은 한 묶음, 별칭끼리만 겹치면 아니다", () => {
  const f = folder([doc("a", "텐도 아리스", [], 3), doc("b", "텐도아리스", [], 1), doc("c", "아리스짱", ["아리스"]), doc("d", "아리스", [], 0), doc("e", "유즈", ["별"]), doc("f", "모모", ["별"])]);
  const g = duplicateGroups(f);
  const names = g.map((x) => x.map((e) => e.name).sort());
  assert.ok(names.some((n) => n.join() === ["텐도 아리스", "텐도아리스"].sort().join()));
  assert.ok(names.some((n) => n.includes("아리스") && n.includes("아리스짱")));
  assert.ok(!names.some((n) => n.includes("유즈") || n.includes("모모")), "별칭끼리만 겹치면 합치지 않음");
  assert.equal(g.find((x) => x.some((e) => e.name === "텐도 아리스"))[0].name, "텐도 아리스", "내용이 많은 쪽이 남는다");
});
test("중복이 없으면 아무것도 하지 않는다", () => {
  const f = folder([doc("a", "미도리"), doc("b", "모모이")]);
  assert.deepEqual(duplicateGroups(f), []);
  assert.deepEqual(mergeAllDuplicates(f), { merged: 0, skipped: [] });
});
test("문서 없이 Dusk 인물만 있는 같은 이름은 별칭으로 합쳐진다", () => {
  const f = { people: { 미도리: { name: "미도리", aliases: [], records: [{ act: "가", at: 1 }] }, "미 도리": { name: "미 도리", aliases: [], records: [{ act: "나", at: 2 }] } }, wiki: { documents: {} } };
  const r = mergeAllDuplicates(f);
  assert.equal(r.merged, 1); assert.equal(Object.keys(f.people).length, 1);
  assert.equal(Object.values(f.people)[0].records.length, 2);
});
import * as L from "../src/engine/pot/wiki-schema.js";
test("실제 위키 문서 둘도 한 번에 합쳐진다", () => {
  const now = "2026-01-01T00:00:00Z";
  let sc = L.createEmptyWikiScope({ characterId: "c", chatKey: "k", characterName: "봇", chatName: "채팅" }, now);
  for (const t of ["텐도 아리스", "텐도 아리스", "오마가리 하레"]) sc = L.createWikiDocument(sc, { type: "Character", title: t, aliases: [], sections: [], tags: [], links: [], metrics: [] }, { now });
  const f = { people: {}, wiki: sc };
  assert.equal(duplicateGroups(f).length, 1);
  const r = mergeAllDuplicates(f);
  assert.equal(r.merged, 1, JSON.stringify(r));
  assert.deepEqual(Object.values(f.wiki.documents).map((d) => d.title).sort(), ["오마가리 하레", "텐도 아리스"]);
});
