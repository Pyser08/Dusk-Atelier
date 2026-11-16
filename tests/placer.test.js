// 애드온 자리 자동 넣기(ui/placer.js): 코어를 고치지 않고 이름·선택자로 부품을 넣고, 화면이 다시 그려지면 다시 넣고, 끄면 뗀다.
import test from "node:test";
import assert from "node:assert/strict";
import { createPlacer, resolvePlace, PLACES } from "../src/ui/placer.js";

// 아주 작은 가짜 DOM(필요한 것만)
function node(cls = "") {
  const n = {
    cls, dataset: {}, children: [], parent: null,
    get isConnected() { let p = n; while (p.parent) p = p.parent; return p.root === true; },
    append(c) { c.remove?.(); c.parent = n; n.children.push(c); },
    prepend(c) { c.remove?.(); c.parent = n; n.children.unshift(c); },
    before(c) { const p = n.parent; c.remove?.(); c.parent = p; p.children.splice(p.children.indexOf(n), 0, c); },
    after(c) { const p = n.parent; c.remove?.(); c.parent = p; p.children.splice(p.children.indexOf(n) + 1, 0, c); },
    remove() { if (n.parent) { n.parent.children = n.parent.children.filter((x) => x !== n); n.parent = null; } },
    querySelectorAll(sel) {
      const want = sel.trim().split(/\s+/).at(-1).replace(/^\./, "");
      const out = [], walk = (x) => { for (const c of x.children) { if (c.cls.split(" ").includes(want)) out.push(c); walk(c); } };
      walk(n); return out;
    }
  };
  return n;
}

test("자리 이름 → 선택자·위치, 잘못된 값은 알려 줌", () => {
  assert.equal(resolvePlace("home.quickset").sel, PLACES["home.quickset"].sel);
  assert.equal(resolvePlace("home.quickset").position, "end");
  assert.deepEqual(resolvePlace(".x", "after"), { sel: ".x", position: "after" });
  assert.throws(() => resolvePlace(".x", "middle"));
  assert.throws(() => resolvePlace(null));
});

test("넣기 → 다시 그려져도 한 번만 다시 넣기 → 끄면 뗌", () => {
  const root = node(); root.root = true;
  const card = node("rb-story-helper"); root.append(card);
  card.append(node("rb-srow"));
  const P = createPlacer({ root: () => root });
  let made = 0;
  const off = P.place("home.quickset", () => { made++; return node("mine"); });
  assert.equal(card.children.at(-1).cls, "mine", "맨 아래에");
  assert.equal(card.children.at(-1).dataset.duskPlace, "home.quickset");
  P.scan(); P.scan();
  assert.equal(made, 1, "이미 있으면 다시 안 그림");
  // 홈이 다시 그려짐: 새 카드
  card.remove();
  const card2 = node("rb-story-helper"); root.append(card2);
  P.scan();
  assert.equal(card2.children.at(-1).cls, "mine");
  assert.equal(made, 2);
  off();
  assert.equal(card2.children.length, 0, "끄면 넣은 것을 뗌");
  assert.equal(P.size(), 0);
});

test("위치: start·before·after, render가 null이면 건너뜀, 오류는 다른 부품을 막지 않음", () => {
  const root = node(); root.root = true;
  const box = node("box"); root.append(box); box.append(node("a"));
  const P = createPlacer({ root: () => root, log: () => {} });
  P.place(".box", () => node("s"), { position: "start" });
  P.place(".box", () => node("b"), { position: "before" });
  P.place(".box", () => node("f"), { position: "after" });
  P.place(".box", () => null);
  P.place(".box", () => { throw new Error("터짐"); });
  assert.deepEqual(box.children.map((c) => c.cls), ["s", "a"]);
  assert.deepEqual(root.children.map((c) => c.cls), ["b", "box", "f"]);
});

test("refresh: 넣은 부품을 새로 그림", () => {
  const root = node(); root.root = true;
  const box = node("box"); root.append(box);
  const P = createPlacer({ root: () => root });
  let label = "1";
  P.place(".box", () => { const n = node("x"); n.label = label; return n; });
  label = "2"; P.refresh();
  assert.equal(box.children.length, 1);
  assert.equal(box.children[0].label, "2");
});
