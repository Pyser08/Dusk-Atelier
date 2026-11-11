import test from "node:test";
import assert from "node:assert/strict";
import * as P from "../src/engine/sdstudio/project.js";

const ids = () => { let n = 0; return () => `x${++n}`; };

test("v1 저장값 → v2: 캐릭터 그림은 default 씬으로, 프롬프트·크기는 설정으로", () => {
  const v1 = { v: 1, top: "masterpiece", neg: "bad", size: "landscape", chars: [{ id: "a", name: "A", prompt: "1girl", cover: "assets/1.png", images: [{ path: "assets/1.png", seed: 3 }, { nope: 1 }] }], folders: [{ id: "f", name: "F", members: ["a", "유령"] }] };
  const p = P.normalizeProject(v1);
  assert.equal(p.v, 2);
  assert.equal(p.settings.top, "masterpiece");
  assert.equal(p.settings.neg, "bad");
  assert.equal(p.settings.size.mode, "landscape");
  assert.equal(p.chars[0].scenes.length, 1);
  assert.equal(p.chars[0].scenes[0].name, "default");
  assert.equal(p.chars[0].scenes[0].images.length, 1);
  assert.equal(p.chars[0].scenes[0].cover, "assets/1.png");
  assert.deepEqual(p.folders[0].members, ["a"]);
  assert.deepEqual(P.normalizeProject("망가짐").chars, []);
  assert.equal(P.normalizeProject({ v: 2, settings: { sampling: { model: "없는모델" } } }).settings.sampling.model, "4-5-full");
});

test("캐릭터: 추가하면 default 씬 하나, 복제는 그림 없이 같은 폴더에, 지우면 폴더에서도 빠짐", () => {
  const id = ids();
  let p = P.addChar(P.emptyProject(), { name: "시로코", prompt: "grey hair" }, id);
  const a = p.chars[0].id;
  assert.equal(p.chars[0].scenes[0].name, "default");
  p = P.addFolder(p, { name: "아비도스", kind: "group" }, id);
  const f = p.folders[0].id;
  p = P.setMember(p, f, a, true);
  p = P.addImage(p, a, p.chars[0].scenes[0].id, { path: "assets/1.png" });
  p = P.duplicateChar(p, a, id);
  assert.equal(p.chars.length, 2);
  assert.equal(p.chars[1].name, "시로코 사본");
  assert.equal(P.imageCount(p.chars[1]), 0);
  assert.equal(p.folders[0].members.length, 2);
  const q = P.removeChar(p, a);
  assert.equal(q.chars.length, 1);
  assert.equal(q.folders[0].members.length, 1);
});

test("폴더: 안에 폴더·여러 폴더·자기 안으로 못 옮김·지우면 하위도", () => {
  const id = ids();
  let p = P.emptyProject();
  for (const n of ["A", "B"]) p = P.addChar(p, { name: n }, id);
  const [a, b] = p.chars.map((c) => c.id);
  p = P.addFolder(p, { name: "상위" }, id); const top = p.folders.at(-1).id;
  p = P.addFolder(p, { name: "하위", parent: top }, id); const sub = p.folders.at(-1).id;
  p = P.setMember(p, top, a, true); p = P.setMember(p, sub, a, true); p = P.setMember(p, sub, b, true);
  assert.equal(P.countIn(p, top), 2);
  assert.deepEqual(P.pathOf(p, sub).map((f) => f.name), ["상위", "하위"]);
  assert.deepEqual(P.view(p, null).chars, []);
  assert.throws(() => P.moveFolder(p, top, sub), /안으로/);
  const r = P.removeFolder(p, top);
  assert.equal(r.folders.length, 0);
  assert.equal(P.view(r, null).chars.length, 2);
});

test("씬: 추가·이름 겹침·복제(그림 없이)·순서·정렬·지우기", () => {
  const id = ids();
  let p = P.addChar(P.emptyProject(), { name: "A" }, id);
  const c = p.chars[0].id;
  p = P.addScene(p, c, { name: "angry", prompt: "angry, fang" }, id);
  p = P.addScene(p, c, { name: "blush" }, id);
  const [def, angry, blush] = P.charOf(p, c).scenes.map((s) => s.id);
  assert.deepEqual(P.sceneOf(p, c, angry).slots, [[{ prompt: "angry, fang", on: true }]]);
  assert.equal(P.uniqueSceneName(P.charOf(p, c), "Angry"), "Angry 2");
  p = P.addImage(p, c, angry, { path: "assets/9.png" });
  p = P.duplicateScene(p, c, angry, id);
  assert.equal(P.charOf(p, c).scenes[2].name, "angry 사본");
  assert.equal(P.charOf(p, c).scenes[2].images.length, 0);
  p = P.moveScene(p, c, blush, 0);
  assert.equal(P.charOf(p, c).scenes[0].id, blush);
  p = P.sortScenes(p, c, "desc");
  assert.deepEqual(P.charOf(p, c).scenes.map((s) => s.name), ["default", "blush", "angry 사본", "angry"]);
  p = P.removeScenes(p, c, [def, blush]);
  assert.equal(P.charOf(p, c).scenes.length, 2);
});

test("이미지: 순위·즐겨찾기·최신 순, 대표, 지우면 대표도 풀림", () => {
  const id = ids();
  let p = P.addChar(P.emptyProject(), { name: "A" }, id);
  const c = p.chars[0].id, s = p.chars[0].scenes[0].id;
  let t = 0; const now = () => ++t;
  for (const n of [1, 2, 3]) p = P.addImage(p, c, s, { path: `assets/${n}.png`, seed: n }, now);
  assert.deepEqual(P.sortedImages(P.sceneOf(p, c, s)).map((i) => i.path), ["assets/3.png", "assets/2.png", "assets/1.png"]);
  p = P.setImage(p, c, s, "assets/1.png", { fav: true });
  assert.equal(P.coverOf(P.sceneOf(p, c, s)), "assets/1.png");
  p = P.setImage(p, c, s, "assets/2.png", { rank: 1 });
  assert.equal(P.coverOf(P.sceneOf(p, c, s)), "assets/2.png", "순위가 즐겨찾기보다 앞");
  p = P.updateScene(p, c, s, { cover: "assets/3.png" });
  p = P.updateChar(p, c, { cover: "assets/3.png" });
  assert.equal(P.charCover(P.charOf(p, c)), "assets/3.png");
  p = P.removeImages(p, c, s, ["assets/3.png"]);
  assert.equal(P.charOf(p, c).cover, "");
  assert.equal(P.coverOf(P.sceneOf(p, c, s)), "assets/2.png");
});

test("예약: 1장 = 조합 전부, 모두 예약·비우기, 요약", () => {
  const id = ids();
  let p = P.addChar(P.emptyProject(), { name: "A" }, id);
  const c = p.chars[0].id;
  p = P.addScene(p, c, { name: "pose" }, id);
  const [s1, s2] = P.charOf(p, c).scenes.map((s) => s.id);
  p = P.setSlots(p, c, s2, [[{ prompt: "smile" }, { prompt: "angry" }], [{ prompt: "standing" }, { prompt: "sitting" }, { prompt: "x", on: false }]]);
  p = P.setReserve(p, c, s2, 2);
  assert.equal(P.planJobs(p).length, 8);
  assert.equal(P.middleFor(P.sceneOf(p, c, s2), 3), "angry, sitting");
  p = P.reserveAll(p, c, 1);
  assert.equal(P.sceneOf(p, c, s1).reserve, 1);
  assert.deepEqual(P.reserveSummary(p, c), { reserved: 2, scenes: 2, jobs: 1 + 12, combos: 5 });
  p = P.clearReserve(p, c);
  assert.equal(P.planJobs(p).length, 0);
});

test("시드·크기 규칙", () => {
  assert.equal(P.seedFor({ mode: "fixed", value: 77 }, 5), 77);
  assert.equal(P.seedFor({ mode: "chain", value: 77 }, 0), 77);
  assert.equal(P.seedFor({ mode: "chain", value: 77 }, 2), P.stepSeed(P.stepSeed(77)));
  assert.equal(P.seedFor({ mode: "random", value: 77 }, 0, () => 0), 1);
  assert.deepEqual(P.sizeFor({ mode: "scene" }, { size: "landscape" }), { width: 1216, height: 832 });
  assert.deepEqual(P.sizeFor({ mode: "scene" }, { size: "" }), { width: 832, height: 1216 });
  assert.deepEqual(P.sizeFor({ mode: "scene" }, { size: "700x1000" }), { width: 704, height: 1024 });
  assert.deepEqual(P.sizeFor({ mode: "square" }, { size: "landscape" }), { width: 1024, height: 1024 });
  assert.deepEqual(P.sizeFor({ mode: "custom", w: 900, h: 900 }, {}), { width: 896, height: 896 });
});

test("이미지 월드컵: 짝 고르기 → 1위·순위, 홀수 부전승", () => {
  let g = P.startCup(["a", "b", "c", "d", "e"], () => 0.5);
  const order = [...g.players];
  let guard = 0;
  while (!P.cupDone(g) && guard++ < 20) { const pair = P.cupPair(g); g = P.cupPick(g, pair.indexOf("a") === 1 ? 1 : 0); }
  assert.ok(P.cupDone(g));
  assert.equal(g.ranks.a, 1, "늘 a를 고르면 a가 우승");
  assert.equal(Object.keys(g.ranks).length, 5);
  assert.ok(order.every((x) => g.ranks[x] >= 1));
  assert.ok(P.cupDone(P.startCup(["x"])));
  const id = ids();
  let p = P.addChar(P.emptyProject(), { name: "A" }, id);
  const c = p.chars[0].id, s = p.chars[0].scenes[0].id;
  p = P.addImage(p, c, s, { path: "a" }); p = P.addImage(p, c, s, { path: "b" });
  p = P.applyCup(p, c, s, { a: 1, b: 2 });
  assert.deepEqual(P.sortedImages(P.sceneOf(p, c, s)).map((i) => i.path), ["a", "b"]);
});

test("보낼 그림 고르기: 그림마다 기억, 씬 순서대로 모음, 풀기", () => {
  const id = (() => { let n = 0; return () => `y${++n}`; })();
  let p = P.addChar(P.emptyProject(), { name: "A" }, id);
  const c = p.chars[0].id;
  p = P.addScene(p, c, { name: "angry" }, id);
  const [def, angry] = P.charOf(p, c).scenes.map((s) => s.id);
  let t = 0; const now = () => ++t;
  for (const n of [1, 2]) p = P.addImage(p, c, def, { path: `d${n}` }, now);
  for (const n of [1, 2, 3]) p = P.addImage(p, c, angry, { path: `a${n}` }, now);
  assert.deepEqual(P.pickedImages(P.charOf(p, c)), []);
  p = P.setPicks(p, c, angry, ["a1", "a3"], true);
  p = P.setPicks(p, c, def, ["d2"], true);
  assert.equal(P.pickCount(P.sceneOf(p, c, angry)), 2);
  assert.deepEqual(P.pickedImages(P.charOf(p, c)).map((x) => [x.name, x.path]), [["default", "d2"], ["angry", "a3"], ["angry", "a1"]], "씬 순서, 씬 안은 보이는 순서(최신 먼저)");
  assert.deepEqual(P.pickedImages(P.charOf(p, c), angry).map((x) => x.path), ["a3", "a1"]);
  assert.equal(P.normalizeProject(JSON.parse(JSON.stringify(p))).chars[0].scenes[1].images.filter((i) => i.pick).length, 2, "저장해도 남음");
  p = P.setPicks(p, c, angry, ["a1"], false);
  assert.deepEqual(P.pickedImages(P.charOf(p, c)).map((x) => x.path), ["d2", "a3"]);
  p = P.clearPicks(p, c);
  assert.deepEqual(P.pickedImages(P.charOf(p, c)), []);
});

// ── 끌어 옮기기 ──
test("드래그: 캐릭터를 폴더로 옮기기·복사·꺼내기·앞뒤 놓기", () => {
  let n = 0; const id = () => "d" + ++n;
  let p = P.emptyProject();
  for (const name of ["A", "B", "C"]) p = P.addChar(p, { name }, id);
  const [a, b, c] = p.chars.map((x) => x.id);
  p = P.addFolder(p, { name: "F" }, id); p = P.addFolder(p, { name: "G" }, id);
  const [F, G] = p.folders.map((f) => f.id);
  p = P.moveChars(p, [a, b], { to: F });
  assert.deepEqual(p.folders[0].members, [a, b]);
  p = P.moveChars(p, [a], { from: F, to: G });
  assert.deepEqual([p.folders[0].members, p.folders[1].members], [[b], [a]]);
  p = P.moveChars(p, [b], { from: F, to: G, copy: true, before: a });
  assert.deepEqual([p.folders[0].members, p.folders[1].members], [[b], [b, a]]);
  p = P.moveChars(p, [a], { from: G, to: F, before: b });
  assert.deepEqual(p.folders[0].members, [a, b]);
  p = P.moveChars(p, [a], { from: F, to: null });
  assert.deepEqual(p.folders[0].members, [b]);
  p = P.reorderChars(p, null, [c], a);
  assert.deepEqual(p.chars.map((x) => x.id), [b, c, a]);
  // 끌려가는 쪽이 before인 경우 제자리
  p = P.reorderChars(p, null, [c], c);
  assert.deepEqual(p.chars.map((x) => x.id), [b, c, a]);
});
test("드래그: 폴더 안으로·앞뒤·자기 안 금지", () => {
  let n = 0; const id = () => "e" + ++n;
  let p = P.emptyProject();
  for (const name of ["F", "G", "H"]) p = P.addFolder(p, { name }, id);
  const [F, G, H] = p.folders.map((f) => f.id);
  p = P.placeFolder(p, G, F);
  assert.equal(p.folders.find((f) => f.id === G).parent, F);
  assert.throws(() => P.placeFolder(p, F, G), /자기 안/);
  p = P.placeFolder(p, H, null, F);
  assert.deepEqual(p.folders.filter((f) => !f.parent).map((f) => f.id), [H, F]);
});
test("드래그: 씬 순서 바꾸기·다른 캐릭터로 옮기기/복사", () => {
  let n = 0; const id = () => "s" + ++n;
  let p = P.emptyProject();
  p = P.addChar(p, { name: "A" }, id); p = P.addChar(p, { name: "B" }, id);
  const [a, b] = p.chars.map((x) => x.id);
  p = P.addScene(p, a, { name: "x" }, id); p = P.addScene(p, a, { name: "y" }, id); p = P.addScene(p, b, { name: "x" }, id);
  const [, x, y] = P.charOf(p, a).scenes.map((s) => s.id);
  p = P.reorderScenes(p, a, [y], x);
  assert.deepEqual(P.charOf(p, a).scenes.map((s) => s.name), ["default", "y", "x"]);
  p = P.moveScenesToChar(p, a, [x], b);
  assert.deepEqual(P.charOf(p, a).scenes.map((s) => s.name), ["default", "y"]);
  assert.deepEqual(P.charOf(p, b).scenes.map((s) => s.name), ["default", "x", "x 2"]);
  p = P.moveScenesToChar(p, a, [y], b, { copy: true, mkId: id });
  assert.equal(P.charOf(p, a).scenes.length, 2);
  assert.equal(P.charOf(p, b).scenes.length, 4);
});
