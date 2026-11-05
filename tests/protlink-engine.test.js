import test from "node:test";
import assert from "node:assert/strict";
import { diffSnapshots, fileKinds, fitFiles, guessKind, pendingOf, rankTargets, snapshotOf } from "../src/engine/protlink.js";

test("파일 종류 분류", () => {
  assert.deepEqual(fileKinds("봇.charx"), ["character"]); assert.deepEqual(fileKinds("a.PNG"), ["character"]);
  assert.deepEqual(fileKinds("m.risum"), ["module"]); assert.deepEqual(fileKinds("m.module.charx"), ["module"]);
  assert.deepEqual(fileKinds("x.json"), ["character", "module"]); assert.deepEqual(fileKinds("p.js"), ["plugin"]);
  assert.deepEqual(fileKinds("readme.txt"), []);
});
test("종류 짐작: 많은 쪽, json만 있으면 모름", () => {
  assert.equal(guessKind([{ name: "a.risum" }, { name: "b.risum" }, { name: "c.js" }]), "module");
  assert.equal(guessKind([{ name: "a.json" }]), null);
  assert.equal(guessKind([{ name: "a.js" }, { name: "a.png" }]), "character");   // 동수면 캐릭터 우선
  assert.equal(guessKind([]), null);
});
test("후보 순위: 같은 이름 > 비슷한 이름 > 앞부분 > 나머지", () => {
  const items = [{ id: "1", name: "다른 봇" }, { id: "2", name: "시로코 v2" }, { id: "3", name: "시로코 외전" }, { id: "4", name: "Sirokko" }];
  const r = rankTargets(["시로코 최종.charx"], items);
  assert.equal(r[0].id, "2"); assert.equal(r[0].score, 100);
  assert.equal(r[1].id, "3"); assert.equal(r[1].score, 70);
  assert.equal(r.at(-1).score, 0); assert.equal(r.length, 4);
  assert.equal(rankTargets([], items).every((x) => x.score === 0), true);
});
test("스냅샷 비교: 새 파일·바뀐 파일·사라진 파일, uid만 바뀐 재업로드는 바뀜", () => {
  const old = snapshotOf([{ uid: "a", name: "x.risum", path: [], size: 10, modifiedAt: 1 }, { uid: "b", name: "y.risum", path: ["f"], size: 5, modifiedAt: 1 }, { uid: "c", name: "z.js", path: [], size: 1, modifiedAt: 1 }]);
  const now = snapshotOf([{ uid: "a", name: "x.risum", path: [], size: 12, modifiedAt: 2 }, { uid: "b2", name: "y.risum", path: ["f"], size: 5, modifiedAt: 3 }, { uid: "n", name: "new.js", path: [], size: 1, modifiedAt: 4 }]);
  const d = diffSnapshots(old, now);
  assert.deepEqual(d.changed.map((f) => f.uid), ["a", "b2"]); assert.deepEqual(d.added.map((f) => f.uid), ["n"]); assert.deepEqual(d.removed.map((f) => f.uid), ["c"]);
  assert.deepEqual(diffSnapshots(old, old), { added: [], changed: [], removed: [] });
});
test("연결한 종류에 맞는 파일만, 새 것 먼저", () => {
  const files = [{ name: "a.risum", modifiedAt: 1 }, { name: "b.js", modifiedAt: 9 }, { name: "c.risum", modifiedAt: 5 }];
  assert.deepEqual(fitFiles(files, "module").map((f) => f.name), ["c.risum", "a.risum"]);
  assert.deepEqual(pendingOf({ changed: [files[0]], added: [files[1], files[2]] }, "module").map((f) => f.name), ["c.risum", "a.risum"]);
  assert.deepEqual(pendingOf({ changed: [], added: [] }, "plugin"), []);
});
import { updateMessage } from "../src/engine/protlink.js";
test("밖에 띄울 알림 문구: 연결 항목 이름, 3개까지·나머지는 외 N개, 없으면 빈 글", () => {
  const row = (kind, name, update = true) => ({ kind, name: "링크", target: { name }, update });
  assert.equal(updateMessage([row("character", "시로코"), row("module", "A", false)]), "새 업데이트가 있어요: 캐릭터 시로코");
  assert.equal(updateMessage([row("character", "a"), row("module", "b"), row("plugin", "c"), row("module", "d")]), "새 업데이트가 있어요: 캐릭터 a · 모듈 b · 플러그인 c 외 1개");
  assert.equal(updateMessage([]), ""); assert.equal(updateMessage([row("module", "x", false)]), "");
});
