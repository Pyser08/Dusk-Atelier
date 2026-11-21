import test from "node:test";
import assert from "node:assert/strict";
import { createFloatButton, presetSpots, clampPos, FAB_STYLE } from "../src/data/floatbtn.js";

// 리스 화면 문서 흉내(비동기 래퍼)
function fakeDoc() {
  const docL = {}, els = [];
  const mk = (tag) => { const e = { tag, style: "", attrs: {}, L: {}, html: "", kids: [],
    setAttribute: async (k, v) => { e.attrs[k] = v; }, setStyleAttribute: async (v) => { e.style = v; }, setInnerHTML: async (v) => { e.html = v; }, setInnerText: async (v) => { e.html = v; },
    addEventListener: async (t, f) => { e.L[t] = f; }, appendChild: async (c) => { e.kids.push(c); els.push(c); }, remove: async () => { const i = els.indexOf(e); if (i >= 0) els.splice(i, 1); },
    getBoundingClientRect: async () => ({ width: 400, height: 800 }) }; return e; };
  const body = mk("body");
  return { els, docL, body, querySelector: async (q) => (q === "body" ? body : els.find((e) => q.includes(e.attrs["x-dusk"] ?? "§")) ?? null), createElement: async (t) => mk(t), addEventListener: async (t, f) => { docL[t] = f; } };
}
const store = () => { const m = new Map(); return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, m }; };

test("떠 있는 버튼: 동그랗고 반투명, 리스 테마 색 변수", () => {
  const s = FAB_STYLE(10, 20);
  assert.match(s, /border-radius:50%/); assert.match(s, /opacity:\.8\d/); assert.match(s, /var\(--risu-theme-selected/); assert.match(s, /touch-action:none/);
  assert.deepEqual(clampPos(-50, 9999, 400, 800), [12, 800 - 54 - 12]);
  assert.equal(presetSpots(400, 800).length, 6);
});

test("떠 있는 버튼: 끌면 옮겨지고 위치 기억, 탭은 열기, 길게 누르면 다음 가장자리, 좌표 없는 판도 동작", async () => {
  const d = fakeDoc(), ps = store(); let opened = 0;
  const fab = createFloatButton({ pluginStorage: ps }, { ensureDoc: async () => d, icon: "<svg></svg>", title: "인물 관계도", open: () => { opened++; } });
  assert.equal(await fab.show(), true);
  const el = d.els.find((e) => e.attrs["x-dusk"] === "fab"); assert.ok(el);
  const pos = () => [Number(/left:(\d+)px/.exec(el.style)[1]), Number(/top:(\d+)px/.exec(el.style)[1])];
  const p0 = pos();
  // 끌기(좌표 있는 판)
  el.L.pointerdown({ clientX: 300, clientY: 600 }); d.docL.pointermove({ clientX: 200, clientY: 300 }); await new Promise((r) => setTimeout(r, 5)); d.docL.pointerup({});
  const p1 = pos(); assert.notDeepEqual(p1, p0, "옮겨짐"); assert.equal(opened, 0, "끌기는 열지 않음");
  assert.deepEqual(JSON.parse(ps.m.get("dusk.ui.fabPos")), p1, "위치 기억");
  // 탭(사람처럼 간격을 두고)
  await new Promise((r) => setTimeout(r, 400));
  el.L.pointerdown({ clientX: 1, clientY: 1 }); d.docL.pointerup({}); await new Promise((r) => setTimeout(r, 5)); assert.equal(opened, 1, "탭은 열기");
  // 좌표 없는 판: 길게 누르면 자리 이동
  await new Promise((r) => setTimeout(r, 400));
  const before = pos(); el.L.pointerdown(undefined); await new Promise((r) => setTimeout(r, 700));   // 2.2.29: 손 뗀 이벤트가 안 와도 길게 누르면 이동
  assert.notDeepEqual(pos(), before, "길게 누르면 다음 자리"); assert.equal(opened, 1);
  // 다시 그려도 기억한 자리
  await fab.hide(); const fab2 = createFloatButton({ pluginStorage: ps }, { ensureDoc: async () => d, icon: "", title: "x", open: () => {} }); await fab2.show();
  const el2 = d.els.find((e) => e.attrs["x-dusk"] === "fab"); assert.match(el2.style, new RegExp(`left:${pos()[0]}px`));
});

test("리스 화면 권한이 없으면 그리지 않음(예전 버튼으로)", async () => {
  const fab = createFloatButton({ pluginStorage: store() }, { ensureDoc: async () => null, icon: "", title: "x", open: () => {} });
  assert.equal(await fab.show(), false);
});

test("2.2.29: 포인터 좌표가 없는 판도 터치 이벤트 좌표로 끌기, 누르기 이벤트가 없으면 click만으로 열기", async () => {
  const d = fakeDoc(); let opened = 0;
  const fab = createFloatButton({ pluginStorage: store() }, { ensureDoc: async () => d, icon: "", title: "x", open: () => { opened++; } });
  await fab.show(); const el = d.els.find((e) => e.attrs["x-dusk"] === "fab");
  const left = () => Number(/left:(\d+)px/.exec(el.style)[1]);
  const l0 = left();
  el.L.touchstart({ touches: [{ clientX: 300, clientY: 600 }] }); d.docL.touchmove({ touches: [{ clientX: 150, clientY: 500 }] }); d.docL.touchend({});
  assert.notEqual(left(), l0, "터치 좌표로 끌림"); assert.equal(opened, 0);
  el.L.click({}); await new Promise((r) => setTimeout(r, 100)); assert.equal(opened, 0, "끈 직후 따라오는 click은 무시");
  await new Promise((r) => setTimeout(r, 400));
  el.L.click({}); await new Promise((r) => setTimeout(r, 100)); assert.equal(opened, 1, "누르기 이벤트 없이 click만 와도 열림");
});
