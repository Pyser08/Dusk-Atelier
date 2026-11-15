import test from "node:test";
import assert from "node:assert/strict";
import { applyEntryMerge, mergeEntries, alignDocTitles } from "../src/engine/peoplemerge.js";
import { findDoc } from "../src/engine/personview.js";

const folder = () => ({
  people: {
    "린": { name: "린", aliases: [], records: [{ id: "r1", act: "웃었다", at: 5 }] },
    "시라유키린": { name: "시라유키 린", aliases: [], records: [{ id: "r2", act: "인사했다", at: 1 }] },
  },
  emo: [{ from: "시라유키 린", to: "{{user}}", t: { affection: 3 } }, { from: "린", to: "{{user}}", t: { affection: 9 } }],
  wiki: { documents: { d1: { id: "d1", type: "Character", title: "시라유키 린", aliases: [], sections: [], metrics: [] } }, people: { profiles: { d1: { name: "시라유키 린" } } } },
});

test("남길 인물(문서 없음)에 합칠 인물(문서 있음)을 합치면 문서가 남길 인물 이름이 된다", () => {
  const f = folder(), items = mergeEntries(f);
  const keep = items.find((i) => i.name === "린"), src = items.find((i) => i.name === "시라유키 린");
  applyEntryMerge(f, keep, src, null, {});
  assert.deepEqual(Object.keys(f.people), ["린"]);
  assert.equal(f.wiki.documents.d1.title, "린");
  assert.ok(f.wiki.documents.d1.aliases.includes("시라유키 린"));
  assert.equal(f.wiki.people.profiles.d1.name, "린");
  assert.equal(findDoc(f.wiki, f.people["린"]).title, "린");
});

test("이미 합쳐져 옛 이름으로 남은 문서는 alignDocTitles로 인물 이름에 맞춘다", () => {
  const f = folder(); delete f.people["시라유키린"]; f.people["린"].aliases = ["시라유키 린"];
  const fixed = alignDocTitles(f);
  assert.deepEqual(fixed, [{ from: "시라유키 린", to: "린" }]);
  assert.equal(f.wiki.documents.d1.title, "린");
});

test("문서 이름 맞추기는 {{user}}를 건드리지 않는다(페르소나 이름 별칭으로 남의 문서를 잡지 않게)", () => {
  const f = { people: { "{{user}}": { name: "{{user}}", aliases: ["하루"], records: [] } },
    wiki: { documents: { d9: { id: "d9", type: "Character", title: "하루", aliases: [], sections: [], metrics: [] } } } };
  assert.deepEqual(alignDocTitles(f), []);
  assert.equal(f.wiki.documents.d9.title, "하루");
});
