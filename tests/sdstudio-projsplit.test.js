import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../src/engine/sdstudio/project.js";
import { splitProject, joinProject, diffRecords, HEAD } from "../src/engine/sdstudio/projsplit.js";

const sample = () => {
  let p = P.addChar(P.emptyProject(), { name: "A" });
  p = P.addImage(p, p.chars[0].id, p.chars[0].scenes[0].id, { path: "a.png" });
  p = P.addFolder(p, { name: "F" });
  p = P.setMember(p, p.folders[0].id, p.chars[0].id, true);
  p = P.switchSet(p, "nsfw", { copy: true });
  p = P.addChar(p, { name: "B" });
  return P.normalizeProject(JSON.parse(JSON.stringify(p)));
};
test("쪼갰다 합치면 그대로(다른 세트 캐릭터·소속 포함)", () => {
  const p = sample(), recs = splitProject(p);
  const r = joinProject((k) => recs.get(k) ?? null);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(P.normalizeProject(r.project), p);
  assert.equal(recs.size, 1 + 3);   // head + nsfw 2명 + sfw 1명
});
test("바뀐 캐릭터 기록만 다시 씀, 지운 캐릭터는 지움", () => {
  const p = sample(), a = splitProject(p);
  const q = P.updateChar(p, p.chars[0].id, { prompt: "x" });
  const d = diffRecords(a, splitProject(q));
  assert.deepEqual(d.puts.map(([k]) => k).sort(), [`c:nsfw:${p.chars[0].id}`].sort());
  const r = P.removeChar(q, p.chars[1].id);
  const d2 = diffRecords(splitProject(q), splitProject(r));
  assert.deepEqual(d2.dels, [`c:nsfw:${p.chars[1].id}`]);
  assert.ok(d2.puts.some(([k]) => k === HEAD));
});
test("빠진 캐릭터 기록은 missing으로 알려 줌", () => {
  const p = sample(), recs = splitProject(p);
  const k = [...recs.keys()].find((x) => x !== HEAD);
  const r = joinProject((x) => (x === k ? null : recs.get(x) ?? null));
  assert.deepEqual(r.missing, [k]);
  assert.equal(joinProject(() => null), null);
});
