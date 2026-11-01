import test from "node:test";
import assert from "node:assert/strict";
import { normEntry, parseRegexFile, collectEntries, applyRegex, DEFAULT_REGEX } from "../src/engine/regexprep.js";

const ed = (i, o = "", extra = {}) => ({ type: "editprocess", in: i, out: o, ableFlag: true, flag: "g", ...extra });

test("only editprocess entries are kept; ableFlag=false forces plain g", () => {
  assert.equal(normEntry({ type: "editinput", in: "a", out: "" }), null);
  assert.equal(normEntry(ed("")), null);
  assert.equal(normEntry(ed("a", "", { ableFlag: false, flag: "gi" })).flag, "g");
  assert.equal(normEntry(ed("a", "", { flag: "gi" })).flag, "gi");
  assert.equal(normEntry(ed("a", "", { flag: "zz" })).flag, "g");
});
test("parseRegexFile reads risu export and reports problems", () => {
  const ok = parseRegexFile(JSON.stringify({ type: "regex", data: [ed("<x>"), { type: "editdisplay", in: "q", out: "" }] }));
  assert.equal(ok.entries.length, 1);
  assert.match(parseRegexFile("{").error, /JSON/);
  assert.match(parseRegexFile(JSON.stringify({ type: "other" })).error, /정규식 파일/);
  assert.match(parseRegexFile(JSON.stringify({ type: "regex", data: [{ type: "editdisplay", in: "a", out: "" }] })).error, /요청 데이터 수정/);
});
test("collectEntries: off → none; order = files, char, enabled modules only", () => {
  const cfg = { ...DEFAULT_REGEX, on: true, files: [{ name: "f", entries: [ed("F")] }] };
  const character = { customscript: [ed("C")] };
  const modules = [{ id: "m1", regex: [ed("M1")] }, { id: "m2", regex: [ed("M2")] }];
  assert.deepEqual(collectEntries({ cfg: { ...cfg, on: false }, character, modules, enabledIds: ["m1"] }), []);
  assert.deepEqual(collectEntries({ cfg, character, modules, enabledIds: ["m1"] }).map((e) => e.in), ["F", "C", "M1"]);
  assert.deepEqual(collectEntries({ cfg: { ...cfg, useChar: false, useModules: false }, character, modules, enabledIds: ["m1"] }).map((e) => e.in), ["F"]);
});
test("applyRegex strips status blocks, skips invalid patterns, never returns empty", () => {
  const es = [normEntry(ed("<status>[\\s\\S]*?</status>")), normEntry(ed("(", "")), normEntry(ed("(\\d+)시", "$1:00"))];
  assert.equal(applyRegex("본문<status>HP 3</status> 3시에", es).trim(), "본문 3:00에");
  assert.equal(applyRegex("<status>전부</status>", [normEntry(ed("<status>[\\s\\S]*?</status>"))]), "<status>전부</status>");
  assert.equal(applyRegex("abc", []), "abc");
  assert.equal(applyRegex("aaa", [normEntry(ed("a"))]), "aaa");
});
