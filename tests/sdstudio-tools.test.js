import test from "node:test";
import assert from "node:assert/strict";
import * as P from "../src/engine/sdstudio/project.js";
import * as T from "../src/engine/sdstudio/template.js";
import { createHistory } from "../src/engine/sdstudio/history.js";
import * as K from "../src/engine/sdstudio/keys.js";

const ids = () => { let n = 0; return () => `x${++n}`; };

test("템플릿: 캐릭터 씬 → 템플릿(그림·예약 빼고), 우리 파일 왕복", () => {
  const id = ids();
  let p = P.addChar(P.emptyProject(), { name: "A" }, id);
  const c = p.chars[0].id;
  p = P.addScene(p, c, { name: "angry", prompt: "angry" }, id);
  p = P.addImage(p, c, p.chars[0].scenes[1].id, { path: "assets/1.png" });
  p = P.setReserve(p, c, p.chars[0].scenes[1].id, 3);
  p = P.updateScene(p, c, p.chars[0].scenes[1].id, { size: "landscape" });
  p = { ...p, pieces: [{ name: "옷", pieces: [{ name: "교복", prompt: "school uniform", multi: false }] }] };
  const t = T.templateFromChar(P.charOf(p, c), "감정 기본", p.pieces);
  assert.deepEqual(t.scenes.map((s) => s.name), ["default", "angry"]);
  assert.deepEqual(t.scenes[1], { name: "angry", slots: [[{ prompt: "angry", on: true }]], size: "landscape" });
  const back = T.parseTemplateFile(JSON.parse(T.templateFile(t)));
  assert.equal(back.name, "감정 기본");
  assert.deepEqual(back.scenes, t.scenes);
  assert.deepEqual(back.pieces, t.pieces);
});

test("템플릿: SDStudio 씬 템플릿 파일·세션 그대로 가져오기", () => {
  const sd = { version: 1, type: "sdstudio-scene-template", name: "SD 템플릿", session: {
    scenes: {
      default: { type: "scene", name: "default", resolution: "portrait", slots: [[{ prompt: "", characterPrompts: [], id: "a" }]] },
      "blushing shyly": { type: "scene", name: "blushing shyly", resolution: "custom", resolutionWidth: 900, resolutionHeight: 1300, slots: [[{ prompt: "blush, shy", enabled: true, id: "b" }, { prompt: "embarrassed", enabled: false, id: "c" }], [{ prompt: "<옷.교복>", id: "d" }]] },
      broken: null
    },
    library: { 옷: { version: 1, name: "옷", pieces: [{ name: "교복", prompt: "school uniform" }, { name: "랜덤", prompt: "a\nb", multi: true }] } }
  } };
  const t = T.parseTemplateFile(sd);
  assert.equal(t.name, "SD 템플릿");
  assert.deepEqual(t.scenes.map((s) => s.name), ["default", "blushing shyly"]);
  assert.equal(t.scenes[0].size, "portrait");
  assert.equal(t.scenes[1].size, "896x1280");
  assert.deepEqual(t.scenes[1].slots, [[{ prompt: "blush, shy", on: true }, { prompt: "embarrassed", on: false }], [{ prompt: "<옷.교복>", on: true }]]);
  assert.deepEqual(t.pieces, [{ name: "옷", pieces: [{ name: "교복", prompt: "school uniform", multi: false }, { name: "랜덤", prompt: "a\nb", multi: true }] }]);
  const raw = T.parseTemplateFile({ name: "세션", scenes: { x: { name: "x", slots: [] } } });
  assert.deepEqual(raw.scenes.map((s) => s.name), ["x"]);
  assert.throws(() => T.parseTemplateFile({ hello: 1 }), /씬 템플릿/);
});

test("템플릿 적용: 여러 캐릭터에, 처음 상태면 그냥 바꿈, 합치기·바꾸기", () => {
  const id = ids();
  let p = P.emptyProject();
  for (const n of ["새것", "있음"]) p = P.addChar(p, { name: n }, id);
  const [fresh, busy] = p.chars.map((c) => c.id);
  p = P.addScene(p, busy, { name: "angry", prompt: "my angry" }, id);
  const angryId = P.charOf(p, busy).scenes[1].id;
  p = P.addImage(p, busy, angryId, { path: "assets/9.png" });
  p = P.addScene(p, busy, { name: "mine", prompt: "only mine" }, id);
  const tpl = { name: "t", scenes: [{ name: "default", slots: [], size: "" }, { name: "angry", slots: [[{ prompt: "tpl angry", on: true }]], size: "" }, { name: "smile", slots: [[{ prompt: "smile", on: true }]], size: "" }], pieces: [{ name: "옷", pieces: [{ name: "a", prompt: "x", multi: false }] }] };
  assert.equal(T.isPristine(P.charOf(p, fresh)), true);
  assert.equal(T.isPristine(P.charOf(p, busy)), false);
  assert.deepEqual(T.needsChoice(p, [fresh, busy]), [busy]);
  const m = T.applyTemplate(p, [fresh, busy], tpl, "merge", id);
  assert.deepEqual(P.charOf(m.project, fresh).scenes.map((s) => s.name), ["default", "angry", "smile"]);
  assert.deepEqual(P.charOf(m.project, busy).scenes.map((s) => s.name), ["default", "angry", "mine", "smile"]);
  assert.equal(P.sceneOf(m.project, busy, angryId).slots[0][0].prompt, "my angry", "합치기는 같은 이름 씬을 그대로 둠");
  assert.equal(m.project.pieces[0].name, "옷");
  assert.deepEqual(m.stats, { chars: 2, added: 3, kept: 2, removed: 0, updated: 1 }, "처음 상태 캐릭터는 바꾸기로(default 갱신)");
  const r = T.applyTemplate(p, [busy], tpl, "replace", id);
  const rs = P.charOf(r.project, busy).scenes;
  assert.deepEqual(rs.map((s) => s.name), ["default", "angry", "smile"]);
  assert.equal(rs[1].id, angryId, "바꾸기도 같은 이름 씬의 그림은 지킴");
  assert.equal(rs[1].images.length, 1);
  assert.equal(rs[1].slots[0][0].prompt, "tpl angry");
  assert.deepEqual(r.stats, { chars: 1, added: 1, kept: 0, removed: 1, updated: 2 });
});

test("조각 합치기: 없는 모음·조각만 더함", () => {
  const out = T.mergePieces([{ name: "옷", pieces: [{ name: "a", prompt: "mine", multi: false }] }], [{ name: "옷", pieces: [{ name: "a", prompt: "theirs" }, { name: "b", prompt: "new" }] }, { name: "표정", pieces: [] }]);
  assert.deepEqual(out, [{ name: "옷", pieces: [{ name: "a", prompt: "mine", multi: false }, { name: "b", prompt: "new", multi: false }] }, { name: "표정", pieces: [] }]);
});

test("되돌리기: 쌓기·되돌리기·다시하기·짧은 간격은 하나로·상한", () => {
  let t = 0;
  const h = createHistory({ limit: 3, mergeMs: 500, now: () => t });
  h.push("a"); t = 100; h.push("b");   // 0.5초 안 → 하나로(앞 상태 a 유지)
  t = 1000; h.push("c");
  assert.equal(h.undo("d"), "c");
  assert.equal(h.undo("c"), "a");
  assert.equal(h.undo("a"), null);
  assert.equal(h.redo("a"), "c");
  assert.equal(h.redo("c"), "d");
  assert.equal(h.redo("d"), null);
  t = 5000; h.push("e"); assert.equal(h.canRedo(), false, "새로 바꾸면 다시하기는 비움");
  for (const x of ["f", "g", "h", "i"]) { t += 1000; h.push(x); }
  let n = 0; let cur = "z"; while ((cur = h.undo(cur)) != null) n++;
  assert.equal(n, 3, "상한");
});

test("단축키: 누른 키 → 이름, 기본값·바꾸기·겹치면 비움", () => {
  assert.equal(K.comboOf({ key: "z", ctrlKey: true }), "Ctrl+Z");
  assert.equal(K.comboOf({ key: "Z", ctrlKey: true, shiftKey: true }), "Ctrl+Shift+Z");
  assert.equal(K.comboOf({ key: "z", metaKey: true }), "Ctrl+Z", "맥 ⌘도 Ctrl로");
  assert.equal(K.comboOf({ key: "Enter", ctrlKey: true }), "Ctrl+Enter");
  assert.equal(K.comboOf({ key: "F1" }), "F1");
  assert.equal(K.comboOf({ key: " " }), "Space");
  assert.equal(K.comboOf({ key: "Control", ctrlKey: true }), null, "보조키만은 없음");
  const keys = K.normalizeKeys({ undo: "Ctrl+Y", bogus: "X" });
  assert.equal(keys.undo, "Ctrl+Y");
  assert.equal(keys.bogus, undefined);
  assert.equal(keys.run, K.DEFAULT_KEYS.run);
  const k2 = K.rebind(keys, "redo", "Ctrl+Y");
  assert.equal(k2.redo, "Ctrl+Y"); assert.equal(k2.undo, "", "겹친 쪽은 비움");
  assert.equal(K.actionOf(k2, "Ctrl+Y"), "redo");
  assert.equal(K.typingSafe("Ctrl+Z"), true); assert.equal(K.typingSafe("1"), false); assert.equal(K.typingSafe("F1"), true);
});
