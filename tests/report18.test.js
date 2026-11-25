import test from "node:test";
import assert from "node:assert/strict";
import { parseThoughts, renderThoughts, stripThoughts } from "../src/engine/innerthought.js";
const C = "</dusk-thought>", O = '<dusk-thought name="유리" emo="기쁨"';
const V = { ok: `${O} img="y">생각${C}`, nested: `${O} img="<img="y">">생각${C}`, bare: `${O} <img="y">>생각${C}`, gt: `<dusk-thought name="유리" emo="a>b" img="y">생각${C}`, quote: `${O} img="y>생각${C}`, curly: `<dusk-thought name=“유리” emo=“기쁨” img=“y”>생각${C}` };
for (const [k, t] of Object.entries(V)) test(`#18 ${k}`, () => {
  const r = parseThoughts(`대사 ${t} 뒤`);
  assert.equal(r.length, 1); assert.equal(r[0].name, "유리"); assert.equal(r[0].text, "생각"); assert.equal(r[0].img, "y");
  assert.equal(stripThoughts(`대사 ${t} 뒤`), "대사  뒤");
});
test("#18 안 닫힌 태그가 다음 속마음·본문을 삼키지 않는다", () => {
  const t = `대사 ${O}>생각\n\n다음 본문\n대사2 ${O}>둘째\n끝 본문`;
  assert.deepEqual(parseThoughts(t).map((x) => x.text), ["생각", "둘째"]);
  const h = renderThoughts(t); assert.match(h, /다음 본문/); assert.match(h, /끝 본문/); assert.doesNotMatch(h, /<dusk-thought/);
});
test("#18 스트리밍 중인 태그는 숨기고, 이름이 없어도 보이고, 태그 없는 글은 그대로", () => {
  assert.equal(renderThoughts(`본문 ${O}>쓰는 중`), "본문");
  assert.equal(renderThoughts(`본문 <dusk-thought na`), "본문");
  assert.match(renderThoughts(`본문 <dusk-thought emo="기쁨">생각${C}`), /생각/);
  assert.equal(renderThoughts("“본문” &lt;b&gt;"), "“본문” &lt;b&gt;");
});
