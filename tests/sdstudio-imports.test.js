import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePieceFile, addPieceLibs, addWildcard, parseCharPresets, readPngPrompt, piecesFile } from "../src/engine/sdstudio/imports.js";

test("조각 JSON: 한 모음·옛 형식·전역 백업·프로젝트 library, 이름 겹치면 _2", () => {
  const one = { version: 1, name: "옷", pieces: [{ name: "a", prompt: "x", multi: false }] };
  assert.deepEqual(parsePieceFile("a.json", JSON.stringify(one)).libs[0].pieces[0], { name: "a", prompt: "x", multi: false });
  assert.equal(parsePieceFile("a.json", JSON.stringify({ description: "옛", pieces: { k: "v" }, multi: { k: true } })).libs[0].pieces[0].multi, true);
  assert.equal(parsePieceFile("b.json", JSON.stringify({ 옷: one, 표정: { version: 1, name: "표정", pieces: [] } })).libs.length, 2);
  assert.equal(parsePieceFile("s.json", JSON.stringify({ name: "proj", scenes: {}, library: { 옷: one } })).libs[0].name, "옷");
  assert.throws(() => parsePieceFile("x.json", "{}"));
  const r = addPieceLibs([{ name: "옷", pieces: [] }], [one]);
  assert.deepEqual(r.names, ["옷_2"]);
  assert.equal(JSON.parse(piecesFile(one)).name, "옷");
});
test("와일드카드 txt → wildcards 모음 안 조각(여러 줄)", () => {
  const w = parsePieceFile("hair color.txt", "red\n\nblue\n").wild;
  assert.deepEqual(w, { name: "hair color", prompt: "red\nblue", multi: true });
  const x = addWildcard([], w);
  assert.equal(x.group, "wildcards");
  assert.equal(addWildcard(x.pieces, w).name, "hair color_2");
});
test("캐릭터 프리셋 JSON → 이름·외형", () => {
  assert.deepEqual(parseCharPresets(JSON.stringify({ version: 1, presets: [{ name: "시로코", characterPrompt: "grey hair" }] })), [{ name: "시로코", prompt: "grey hair" }]);
  assert.throws(() => parseCharPresets("{}"));
});
test("PNG 메타데이터: NAI Comment·SDStudio v1", () => {
  const chunk = (key, val) => { const d = new TextEncoder().encode(`${key}\0${val}`), b = new Uint8Array(12 + d.length), v = new DataView(b.buffer); v.setUint32(0, d.length); b.set(new TextEncoder().encode("tEXt"), 4); b.set(d, 8); return b; };
  const png = (...cs) => { const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]), ...cs, new Uint8Array([0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0])]; const out = new Uint8Array(parts.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of parts) { out.set(x, o); o += x.length; } return out; };
  const nai = chunk("Comment", JSON.stringify({ prompt: "1girl, 시로코", uc: "lowres", seed: 7 }));
  assert.deepEqual(readPngPrompt(png(nai)), { top: "1girl, 시로코", middle: "", back: "", neg: "lowres", seed: 7, split: false });
  const sds = chunk("SDStudio", "v1:" + JSON.stringify({ schemaVersion: 1, promptSource: { frontPrompt: "a", extraPrompt: "b", middlePrompt: "smile", backPrompt: "c" } }));
  const r = readPngPrompt(png(nai, sds));
  assert.equal(r.top, "a, b"); assert.equal(r.middle, "smile"); assert.equal(r.back, "c"); assert.equal(r.split, true);
  assert.equal(readPngPrompt(png()), null);
});
import * as P from "../src/engine/sdstudio/project.js";
test("조각 모음 이름 바꾸기: 프롬프트 참조도 함께", () => {
  let p = P.addChar(P.emptyProject(), { name: "A", prompt: "<옷.a>" });
  p = { ...p, pieces: [{ name: "옷", pieces: [{ name: "a", prompt: "x", multi: false }] }, { name: "옷2", pieces: [{ name: "b", prompt: "<옷.a>, <옷2.b>", multi: false }] }] };
  p = P.setSettings(p, { top: "q, <옷.a>, <옷2.b>" });
  p = P.setSlots(p, p.chars[0].id, p.chars[0].scenes[0].id, [[{ prompt: "<옷.a>" }]]);
  const r = P.renamePieceLib(p, "옷", "의상");
  assert.equal(r.settings.top, "q, <의상.a>, <옷2.b>");
  assert.equal(r.chars[0].prompt, "<의상.a>");
  assert.equal(r.chars[0].scenes[0].slots[0][0].prompt, "<의상.a>");
  assert.equal(r.pieces[1].pieces[0].prompt, "<의상.a>, <옷2.b>");
  assert.deepEqual(r.pieces.map((l) => l.name), ["의상", "옷2"]);
  assert.throws(() => P.renamePieceLib(p, "옷", "옷2"));
});
import { buildPrompt } from "../src/engine/sdstudio/prompt.js";
test("띄어쓰기 든 조각 이름: 가져와도 그대로, 띄어쓰기를 빼고 써도 찾음", () => {
  const libs = parsePieceFile("a.json", JSON.stringify({ version: 1, name: "hair style", pieces: [{ name: "long hair", prompt: "very long hair" }] })).libs;
  assert.equal(libs[0].name, "hair style"); assert.equal(libs[0].pieces[0].name, "long hair");
  assert.match(buildPrompt({ top: "<hair style.long hair>", own: "", middle: [], back: "" }, libs, () => 0), /very long hair/);
  assert.match(buildPrompt({ top: "<hairstyle.longhair>", own: "", middle: [], back: "" }, libs, () => 0), /very long hair/);
});
import { parseGlobalPresets, addPresets } from "../src/engine/sdstudio/imports.js";
test("글로벌 프리셋 → 우리 프리셋(프롬프트·샘플링·캐릭터 프롬프트), 이미지 생성 계열만", () => {
  const j = { version: 1, presets: [
    { name: "화풍", workflowType: "SDImageGen", preset: { frontPrompt: "artist:a", backPrompt: "detailed", uc: "lowres", steps: 23, promptGuidance: 6, sampling: "k_euler", noiseSchedule: "karras", characterPrompts: [{ prompt: "girl", uc: "", position: { x: 0.3, y: 0.5 } }] } },
    { name: "변형", workflowType: "SDI2I", preset: {} }] };
  const r = parseGlobalPresets(JSON.stringify(j), { sampling: { model: "4-5-full" } });
  assert.equal(r.length, 1);
  assert.equal(r[0].settings.top, "artist:a"); assert.equal(r[0].settings.neg, "lowres");
  assert.equal(r[0].settings.sampling.steps, 23); assert.equal(r[0].settings.sampling.scale, 6); assert.equal(r[0].settings.sampling.model, "4-5-full");
  assert.equal(r[0].settings.chars[0].x, 0.3);
  assert.deepEqual(addPresets([{ name: "화풍" }], r).names, ["화풍 2"]);
});
