import test from "node:test";
import assert from "node:assert/strict";
import { shareCode, readShareCode, normalizeChoice, defaultChoice, STYLES, AVATARS, FONTS, WIDTHS } from "../src/data/themebuilder.js";

test("공유 코드는 짧고 그대로 돌아온다", () => {
  for (const s of STYLES) {
    const c = normalizeChoice({ ...defaultChoice(s.id), accent: "#3a7bd5", vivid: 80, round: 20, space: 65, avatar: AVATARS.at(-1)[0], font: FONTS.at(-1).id, width: WIDTHS.at(-1)[0] });
    const code = shareCode(c, "내 테마");
    assert.match(code, /^DTB2:[A-Za-z0-9_-]+$/);
    assert.ok(code.length < 45, `${s.id}: ${code.length}자`);
    const r = readShareCode(`공유합니다 ${code} 끝`);
    assert.deepEqual(r.choice, c);
    assert.equal(r.name, "내 테마");
  }
});

test("이름이 없으면 더 짧다", () => {
  const code = shareCode(defaultChoice("letter"));
  assert.ok(code.length <= 28, String(code.length));
  assert.equal(readShareCode(code).name, "");
});

test("AI가 만든 CSS도 들어간다", () => {
  const c = normalizeChoice({ ...defaultChoice("letter"), aiCss: ".dt{border-radius:12px;box-shadow:0 2px 8px #0003}" });
  const r = readShareCode(shareCode(c, "x"));
  assert.equal(r.choice.aiCss, c.aiCss);
});

test("한 글자라도 틀리면 거른다", () => {
  const code = shareCode(defaultChoice("letter"), "a");
  const bad = code.slice(0, 8) + (code[8] === "A" ? "B" : "A") + code.slice(9);
  assert.throws(() => readShareCode(bad), /깨져/);
  assert.throws(() => readShareCode(code.slice(0, -3)), /깨져/);
  assert.throws(() => readShareCode("hello"), /공유 코드/);
});

test("예전 DTB1 코드도 읽는다", () => {
  const c = normalizeChoice({ ...defaultChoice("letter"), accent: "#aa3355" });
  const old = "DTB1:" + btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({ ...c, name: "옛날" }))));
  const r = readShareCode(old);
  assert.deepEqual(r.choice, c);
  assert.equal(r.name, "옛날");
});
