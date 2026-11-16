import test from "node:test";
import assert from "node:assert/strict";
import { clampSpeed, nudgeSpeed, stepY, lastCharIndex, speedLabel, SPEED_MIN, SPEED_MAX, SPEED_DEF } from "../src/engine/autoscroll.js";
import { createAutoScroll } from "../addons/autoscroll/runner.js";

test("속도: 범위 자르기·단계 오가기", () => {
  assert.equal(clampSpeed(0), SPEED_DEF);
  assert.equal(clampSpeed("abc"), SPEED_DEF);
  assert.equal(clampSpeed(3), SPEED_MIN);
  assert.equal(clampSpeed(9999), SPEED_MAX);
  assert.equal(nudgeSpeed(60, 1), 80);
  assert.equal(nudgeSpeed(60, -1), 50);
  assert.equal(nudgeSpeed(70, 1), 80);
  assert.equal(nudgeSpeed(70, -1), 60);
  assert.equal(nudgeSpeed(SPEED_MAX, 1), SPEED_MAX);
  assert.equal(nudgeSpeed(SPEED_MIN, -1), SPEED_MIN);
});
test("한 번에 내려갈 거리: 멈췄다 돌아와도 크게 안 뜀", () => {
  assert.equal(stepY(0, 100, 30), 3);
  assert.equal(stepY(10, 100, 5000), 20);   // dt는 100ms로 자름
  assert.equal(stepY(10, 100, -5), 10);
});
test("마지막 AI 응답 찾기", () => {
  assert.equal(lastCharIndex([{ role: "char" }, { role: "user" }, { role: "char" }, { role: "user" }]), 2);
  assert.equal(lastCharIndex([{ role: "user" }]), -1);
  assert.equal(lastCharIndex(null), -1);
});

// ── 가짜 리스 화면(SafeElement처럼 모든 호출이 비동기) ──
function fakeHost({ msgs = 4, msgTop = 2000, msgH = 1500, viewH = 500, maxScroll = 3200, now = () => 0 } = {}) {
  const S = { scroll: 1800, removed: [], scrolls: 0, tr: { from: 0, to: 0, t0: 0, dur: 0 }, dur: 0 };
  const visual = () => { const { from, to, t0, dur } = S.tr; const k = dur > 0 ? Math.min(1, (now() - t0) / dur) : 1; return from + (to - from) * k; };
  const listeners = new Map();
  let lid = 0;
  const el = (name, extra = {}) => {
    const o = {
      name, style: {}, attrs: {}, children: [], parent: null, text: "",
      async getStyle(k) { return o.style[k] ?? ""; },
      async setStyle(k, v) { o.style[k] = v; },
      async setStyleAttribute(v) { o.css = v; },
      async setAttribute(k, v) { if (!k.startsWith("x-")) throw new Error("x- only"); o.attrs[k] = v; },
      async getAttribute(k) { if (!k.startsWith("x-")) throw new Error("x- only"); return o.attrs[k] ?? null; },
      async setTextContent(t) { o.text = t; },
      async setInnerText(t) { o.text = t; },
      async addEventListener(type, fn) { const id = `l${++lid}`; listeners.set(id, { el: o, type, fn }); return id; },
      async removeEventListener(_t, id) { listeners.delete(id); },
      async prepend(c) { c.parent = o; o.children.unshift(c); },
      async appendChild(c) { c.parent = o; o.children.push(c); },
      async remove() { if (o.parent) o.parent.children = o.parent.children.filter((x) => x !== o); o.parent = null; S.removed.push(o.name); },
      async querySelector(sel) { const m = /\[x-dusk-as="(\w+)"\]/.exec(sel); if (!m) return null; const walk = (n) => { for (const c of n.children) { if (c.attrs["x-dusk-as"] === m[1]) return c; const r = walk(c); if (r) return r; } return null; }; return walk(o); },
      ...extra
    };
    return o;
  };
  const body = el("body");
  const sc = el("screen", { async getBoundingClientRect() { return { top: 0, height: viewH }; } });
  const first = el("first"); first.attrs["x-hashed"] = "h1";
  const msg = el("msg", { async getBoundingClientRect() { return { top: msgTop - S.scroll + visual(), height: msgH }; } });
  const list = el("list", {
    async setStyle(k, v) {
      list.style[k] = v;
      if (k === "transition") S.dur = v === "none" || !v ? 0 : parseFloat(/([\d.]+)s/.exec(v)?.[1] ?? "0") * 1000;
      if (k === "transform") { const to = parseFloat(/translateY\((-?[\d.]+)px\)/.exec(v)?.[1] ?? "0"); S.tr = { from: visual(), to, t0: now(), dur: S.dur }; }
    },
    async getBoundingClientRect() { return { top: 0, height: 9999 }; }
  });
  first.getParent = async () => list;
  body.children.push(sc); sc.parent = body;
  const doc = el("doc", {
    async querySelector(sel) {
      if (sel === ".default-chat-screen") return sc;
      if (sel.endsWith(".chat-message-container")) return first;
      if (sel === `.default-chat-screen .risu-chat[data-chat-index="${msgs - 2}"]`) return msg;
      if (sel === "body" || sel === "head") return body;
      return body.querySelector(sel).then((r) => r ?? msg.querySelector(sel));
    },
    async createElement(tag) {
      const n = el(tag);
      n.scrollIntoView = async () => { S.scrolls++; S.scroll = Math.min(maxScroll, msgTop + parseFloat(n.style.top || "0")); };
      return n;
    }
  });
  const chat = { message: Array.from({ length: msgs }, (_, i) => ({ role: i % 2 ? "user" : "char", data: `m${i}` })) };   // 마지막 AI 응답 = msgs-2
  const api = {
    getRootDocument: async () => doc, requestPluginPermission: async () => true,
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getChatFromIndex: async () => chat
  };
  const fire = (type, owner) => { for (const l of listeners.values()) if (l.type === type && (!owner || l.el === owner)) l.fn({ type }); };
  return { S, api, doc, sc, msg, list, body, first, fire, listeners };
}
function clock() {
  let t = 0, seq = 0;
  const timers = new Map();
  return {
    now: () => t,
    scheduler: {
      setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { fn, at: t + ms }); return id; },
      clearTimeout: (id) => timers.delete(id),
      setInterval: (fn, ms) => { const id = ++seq; timers.set(id, { fn, at: t + ms, every: ms }); return id; },
      clearInterval: (id) => timers.delete(id)
    },
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        const next = [...timers.entries()].filter(([, x]) => x.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [id, x] = next;
        t = x.at;
        if (x.every) x.at += x.every; else timers.delete(id);
        await x.fn();
        for (let i = 0; i < 300; i++) await Promise.resolve();
      }
      t = end;
    }
  };
}
const flush = async () => { for (let i = 0; i < 300; i++) await Promise.resolve(); };

test("켜면 마지막 AI 응답 맨 위에 버튼, 끄면 떼고 모양 되돌림", async () => {
  const C = clock(), H = fakeHost({ now: C.now });
  const R = createAutoScroll(H.api, { now: C.now, scheduler: C.scheduler });
  await R.setEnabled(true); await flush();
  assert.equal(H.msg.children.length, 0, "그리기가 끝났는지 한 번 더 보고 단다");
  await C.advance(1000); await flush();
  const btn = H.msg.children[0];
  assert.equal(btn?.attrs["x-dusk-as"], "btn");
  assert.equal(btn.text, "▼ 오토 스크롤");
  assert.equal(H.msg.style.position, "relative");
  await C.advance(3000); await flush();
  assert.equal(H.msg.children.filter((c) => c.attrs["x-dusk-as"] === "btn").length, 1, "같은 채팅이면 다시 달지 않음");
  await R.setEnabled(false); await flush();
  assert.equal(H.msg.children.length, 0);
  assert.equal(H.msg.style.position, "");
  assert.equal(H.msg.style.paddingTop, "");
});

test("누르면 transform 전환 하나로 부드럽게 내려가고, 끝에서 진짜 스크롤로 바꾼 뒤 멈춤", async () => {
  const C = clock(), H = fakeHost({ now: C.now });
  let speed = 200;
  const R = createAutoScroll(H.api, { now: C.now, scheduler: C.scheduler, getSpeed: () => speed, pollMs: 100000 });
  await R.setEnabled(true); await flush();
  await R.refresh(); await flush();
  const btn = H.msg.children[0];
  const top = async () => (await H.msg.getBoundingClientRect()).top;
  const t0 = await top();
  H.fire("click", btn); await flush();
  assert.ok(R.isRunning());
  assert.equal(btn.text, "■ 멈추기");
  assert.match(H.list.style.transition, /linear/, "브라우저가 직접 그리는 linear 전환");
  assert.ok(H.body.children.some((c) => c.attrs["x-dusk-as"] === "bar"), "떠 있는 조절 막대");
  await C.advance(1000); await flush();
  const moved = t0 - await top();
  assert.ok(moved > 180 && moved < 220, `1초에 약 200px (${moved})`);
  const callsBefore = H.S.scrolls;
  await C.advance(1000); await flush();
  assert.equal(H.S.scrolls, callsBefore, "도는 동안엔 리스로 호출을 보내지 않음");
  // 멈추면 보이는 자리를 그대로 진짜 스크롤 위치로
  const vis = await top();
  await R.stop(); await flush();
  assert.equal(R.isRunning(), false);
  assert.equal(H.list.style.transform, "", "transform 원래대로");
  assert.ok(Math.abs(await top() - vis) <= 2, `멈출 때 튀지 않음 (${vis} → ${await top()})`);
  assert.equal(btn.text, "▼ 오토 스크롤");
  // 다시 시작해서 끝까지
  H.fire("click", btn); await flush();
  await C.advance(20000); await flush();
  assert.equal(R.isRunning(), false, "끝에 닿으면 멈춤");
  const end = await top();
  assert.ok(Math.abs(end - (500 - 24 - 1500)) <= 3, `응답 끝이 화면 아래 24px 위 (${end})`);
  assert.ok(!H.body.children.some((c) => c.attrs["x-dusk-as"] === "bar"));
  assert.ok(!H.msg.children.some((c) => c.attrs["x-dusk-as"] === "probe"), "표식도 치움");
  await R.dispose();
});

test("속도를 바꾸면 그 자리에서 새 속도로 이어 감", async () => {
  const C = clock(), H = fakeHost({ now: C.now });
  let speed = 100;
  const R = createAutoScroll(H.api, { now: C.now, scheduler: C.scheduler, getSpeed: () => speed, pollMs: 100000 });
  await R.setEnabled(true); await flush(); await R.refresh(); await flush();
  const top = async () => (await H.msg.getBoundingClientRect()).top;
  H.fire("click", H.msg.children[0]); await flush();
  await C.advance(1000); await flush();
  const a = await top();
  speed = 300; await R.respeed(); await flush();
  assert.ok(Math.abs(await top() - a) <= 2, "바꿀 때 튀지 않음");
  await C.advance(1000); await flush();
  const d = a - await top();
  assert.ok(d > 270 && d < 330, `새 속도 약 300px/초 (${d})`);
  await R.dispose();
});

test("좌우 스크롤 막기: 켜 둔 동안만 CSS", async () => {
  const C = clock(), H = fakeHost({ now: C.now });
  const R = createAutoScroll(H.api, { now: C.now, scheduler: C.scheduler, pollMs: 100000, noX: true });
  const css = () => H.body.children.find((c) => c.attrs["x-dusk-as"] === "nox");
  await R.setEnabled(true); await flush();
  assert.match(css()?.text ?? "", /overflow-x:hidden/);
  await R.setNoX(false); await flush();
  assert.equal(css(), undefined);
  await R.setNoX(true); await flush();
  assert.ok(css());
  await R.setEnabled(false); await flush();
  assert.equal(css(), undefined, "끄면 뗌");
});

test("채팅을 누르면 멈추고, 같은 누르기의 클릭으로 다시 시작하지 않음", async () => {
  const C = clock(), H = fakeHost({ now: C.now });
  const R = createAutoScroll(H.api, { now: C.now, scheduler: C.scheduler, pollMs: 100000 });
  await R.setEnabled(true); await flush(); await R.refresh(); await flush();
  const btn = H.msg.children[0];
  H.fire("click", btn); await flush();
  await C.advance(300); await flush();
  assert.ok(R.isRunning());
  H.fire("pointerdown", H.sc); await flush();
  assert.equal(R.isRunning(), false);
  H.fire("click", btn); await flush();   // 버튼을 눌러 멈춘 경우: pointerdown 뒤 click
  assert.equal(R.isRunning(), false);
  await C.advance(1000); await flush();
  H.fire("click", btn); await flush();
  assert.ok(R.isRunning(), "조금 뒤 누르면 다시 시작");
  await R.dispose();
  assert.equal(R.isRunning(), false);
  assert.equal(H.listeners.size, 0, "리스 화면 이벤트를 모두 뗌");
});

test("화면 접근을 거절하면 버튼을 달지 않고 알림", async () => {
  const C = clock(), H = fakeHost({ now: C.now });
  let denied = 0;
  H.api.requestPluginPermission = async () => false;
  const R = createAutoScroll(H.api, { now: C.now, scheduler: C.scheduler, onDenied: () => denied++ });
  await R.setEnabled(true); await flush(); await C.advance(3000); await flush();
  assert.equal(denied, 1);
  assert.equal(H.msg.children.length, 0);
  await R.dispose();
});
