import test from "node:test";
import assert from "node:assert/strict";
import { prefixInfo, cacheCause } from "../src/engine/turninfo.js";

const S = (c) => ({ role: "system", content: c }), U = (c) => ({ role: "user", content: c }), A = (c) => ({ role: "assistant", content: c });
const long = (t) => t + " " + "본문이 길게 이어지는 메시지입니다. ".repeat(20);

test("Dusk 블록에서 깨지면 그 기능을 이름으로 알려 준다", () => {
  const prev = [S("[Dusk Time]\nNow: 10:00"), U(long("a"))], cur = [S("[Dusk Time]\nNow: 11:00"), U(long("a")), A("b"), U("c")];
  const c = cacheCause(prev, cur, prefixInfo(prev, cur));
  assert.equal(c.kind, "dusk"); assert.match(c.text, /이야기 시간/);
  assert.match(c.prev, /10:00/); assert.match(c.cur, /11:00/);
});
test("옛 대화가 빠지면 '옛 대화가 빠짐'", () => {
  const prev = [S("sys"), U(long("1")), A(long("2")), U(long("3")), A(long("4"))], cur = [S("sys"), U(long("3")), A(long("4")), U("5")];
  assert.equal(cacheCause(prev, cur, prefixInfo(prev, cur)).kind, "dropped");
});
test("앞쪽 시스템 글이 바뀌면 로어북·프롬프트 변화", () => {
  const prev = [S("sys"), S("로어 A"), U(long("1"))], cur = [S("sys"), S("로어 B"), U(long("1")), A("x")];
  assert.equal(cacheCause(prev, cur, prefixInfo(prev, cur)).kind, "prompt");
});
test("대화 글이 고쳐지면 편집", () => {
  const prev = [S("sys"), U(long("1")), A(long("2"))], cur = [S("sys"), U(long("1")), A(long("2 고침")), U("3")];
  assert.equal(cacheCause(prev, cur, prefixInfo(prev, cur)).kind, "edited");
});
test("깨지지 않았으면 null", () => {
  const prev = [S("sys"), U("1")], cur = [S("sys"), U("1"), A("2"), U("3")];
  assert.equal(cacheCause(prev, cur, prefixInfo(prev, cur)), null);
});
