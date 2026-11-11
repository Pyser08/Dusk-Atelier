import test from "node:test";
import assert from "node:assert/strict";
import * as P from "../src/engine/sdstudio/project.js";

const ids = () => { let n = 0; return () => `x${++n}`; };

test("빈 프로젝트·깨진 저장값 정리", () => {
  const e = P.emptyProject();
  assert.deepEqual(e.chars, []); assert.deepEqual(e.folders, []);
  assert.equal(e.size, "portrait");
  const n = P.normalizeProject({ chars: [{ id: "a", name: "A", images: [{ path: "assets/1.png" }, { nope: 1 }] }, null, { name: "id없음" }], folders: [{ id: "f", name: "F", parent: "없는폴더", members: ["a", "a", "유령"] }], size: "huge" });
  assert.equal(n.chars.length, 1);
  assert.equal(n.chars[0].images.length, 1);
  assert.equal(n.folders[0].parent, null, "없는 부모는 맨 위로");
  assert.deepEqual(n.folders[0].members, ["a"], "중복·없는 캐릭터 정리");
  assert.equal(n.size, "portrait");
  assert.deepEqual(P.normalizeProject("망가짐").chars, []);
});

test("캐릭터 더하기·고치기·지우기(폴더에서도 빠짐)", () => {
  const id = ids();
  let p = P.emptyProject();
  p = P.addChar(p, { name: "시로코", prompt: "1girl, grey hair" }, id);
  const a = p.chars[0].id;
  p = P.addFolder(p, { name: "교복" }, id);
  const f = p.folders[0].id;
  p = P.setMember(p, f, a, true);
  p = P.updateChar(p, a, { prompt: "1girl, wolf ears" });
  assert.equal(p.chars[0].prompt, "1girl, wolf ears");
  const q = P.removeChar(p, a);
  assert.equal(q.chars.length, 0);
  assert.deepEqual(q.folders[0].members, []);
  assert.equal(p.chars.length, 1, "원본은 그대로");
});

test("폴더: 안에 폴더(겹치기)·한 캐릭터가 여러 폴더에", () => {
  const id = ids();
  let p = P.emptyProject();
  for (const n of ["시로코", "호시노", "노노미"]) p = P.addChar(p, { name: n }, id);
  const [s, h, n] = p.chars.map((c) => c.id);
  p = P.addFolder(p, { name: "아비도스", kind: "group" }, id);
  const abi = p.folders.at(-1).id;
  p = P.addFolder(p, { name: "수영복", kind: "outfit", parent: abi }, id);
  const swim = p.folders.at(-1).id;
  p = P.addFolder(p, { name: "교복", kind: "outfit" }, id);
  const uni = p.folders.at(-1).id;
  for (const c of [s, h, n]) p = P.setMember(p, abi, c, true);
  p = P.setMember(p, swim, s, true);
  p = P.setMember(p, uni, s, true);
  p = P.setMember(p, uni, s, true);   // 두 번 넣어도 한 번
  assert.deepEqual(P.foldersOf(p, s).map((f) => f.id).sort(), [abi, swim, uni].sort());
  const root = P.view(p, null);
  assert.deepEqual(root.folders.map((f) => f.name), ["아비도스", "교복"]);
  assert.deepEqual(root.chars, [], "모두 폴더에 들어가면 맨 위 '폴더 없음'은 빔");
  const inAbi = P.view(p, abi);
  assert.deepEqual(inAbi.folders.map((f) => f.name), ["수영복"]);
  assert.deepEqual(inAbi.chars.map((c) => c.name), ["시로코", "호시노", "노노미"]);
  assert.deepEqual(P.pathOf(p, swim).map((f) => f.name), ["아비도스", "수영복"]);
  assert.equal(P.countIn(p, abi), 3, "하위 폴더까지 겹치지 않게 센 캐릭터 수");
  p = P.setMember(p, uni, s, false);
  assert.deepEqual(P.foldersOf(p, s).map((f) => f.id).sort(), [abi, swim].sort());
});

test("폴더 옮기기는 자기 안으로 못 감, 지우면 하위 폴더도 지우고 캐릭터는 남음", () => {
  const id = ids();
  let p = P.emptyProject();
  p = P.addChar(p, { name: "A" }, id);
  const a = p.chars[0].id;
  p = P.addFolder(p, { name: "상위" }, id); const top = p.folders.at(-1).id;
  p = P.addFolder(p, { name: "하위", parent: top }, id); const sub = p.folders.at(-1).id;
  p = P.setMember(p, sub, a, true);
  assert.throws(() => P.moveFolder(p, top, sub), /안으로/);
  assert.throws(() => P.moveFolder(p, top, top), /안으로/);
  const r = P.removeFolder(p, top);
  assert.equal(r.folders.length, 0);
  assert.equal(r.chars.length, 1);
  assert.deepEqual(P.view(r, null).chars.map((c) => c.id), [a], "폴더가 사라지면 '폴더 없음'으로");
});

test("이미지: 새 것이 앞, 대표 이미지, 지우기, 상한", () => {
  const id = ids();
  let p = P.addChar(P.emptyProject(), { name: "A" }, id);
  const a = p.chars[0].id;
  p = P.addImage(p, a, { path: "assets/1.png", seed: 1 }, () => 100);
  p = P.addImage(p, a, { path: "assets/2.png", seed: 2 }, () => 200);
  assert.deepEqual(p.chars[0].images.map((i) => i.path), ["assets/2.png", "assets/1.png"]);
  assert.equal(P.coverOf(p.chars[0]), "assets/2.png", "대표가 없으면 최신");
  p = P.updateChar(p, a, { cover: "assets/1.png" });
  assert.equal(P.coverOf(p.chars[0]), "assets/1.png");
  p = P.removeImage(p, a, "assets/1.png");
  assert.equal(P.coverOf(p.chars[0]), "assets/2.png", "대표를 지우면 최신으로");
  let q = P.addChar(P.emptyProject(), { name: "B" }, id);
  const b = q.chars[0].id;
  for (let i = 0; i < P.MAX_IMAGES + 5; i++) q = P.addImage(q, b, { path: `assets/${i}.png` });
  assert.equal(q.chars[0].images.length, P.MAX_IMAGES);
});

test("프롬프트 합치기: 공통 + 캐릭터, 빈 칸·겹친 쉼표 정리", () => {
  assert.equal(P.composePrompt(" masterpiece, best quality, ", "1girl,  smile "), "masterpiece, best quality, 1girl, smile");
  assert.equal(P.composePrompt("", "1girl"), "1girl");
  assert.equal(P.composePrompt("a", ""), "a");
});
