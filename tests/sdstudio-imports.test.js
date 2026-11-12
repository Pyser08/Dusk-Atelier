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
  assert.deepEqual(w, { name: "haircolor", prompt: "red\nblue", multi: true });
  const x = addWildcard([], w);
  assert.equal(x.group, "wildcards");
  assert.equal(addWildcard(x.pieces, w).name, "haircolor_2");
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
