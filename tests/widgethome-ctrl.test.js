// 위젯 홈 컨트롤러(src/data/widgethome.js): 기본 꺼짐, 켜기/끄기 수명, 시작 실패 보고, 원본 감지, Dusk 양보
import test from "node:test";
import assert from "node:assert/strict";
import { createWidgetHome, WH_KEY, WH_ORIGINAL } from "../src/data/widgethome.js";

function fakeApi(over = {}) {
  const mem = new Map();
  return {
    mem,
    pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } },
    showContainer: async () => {}, registerButton: async () => ({}),
    ...over
  };
}
function fakeBoot() {
  const log = { boots: 0, disposed: 0, visible: false, closed: 0 };
  const boot = async () => {
    log.boots++;
    return {
      dispose: async () => { log.disposed++; },
      isVisible: () => log.visible, close: async () => { log.closed++; log.visible = false; },
      open: async () => { log.visible = true; return true; }, autoStatus: () => "연결됨"
    };
  };
  return { log, boot };
}

test("기본은 꺼짐: boot()는 아무것도 시작하지 않는다", async () => {
  const api = fakeApi(), { log, boot } = fakeBoot();
  const wh = createWidgetHome(api, { boot });
  await wh.boot();
  assert.equal(wh.on(), false);
  assert.equal(wh.isRunning(), false);
  assert.equal(log.boots, 0);
});

test("저장값이 on이면 boot()가 시작한다", async () => {
  const api = fakeApi(); api.mem.set(WH_KEY, "on");
  const { log, boot } = fakeBoot();
  const wh = createWidgetHome(api, { boot });
  await wh.boot();
  assert.equal(wh.on(), true);
  assert.equal(wh.isRunning(), true);
  assert.equal(log.boots, 1);
});

test("set(true)/set(false): 저장하고 시작·정리, 두 번 켜도 한 번만 시작", async () => {
  const api = fakeApi(), { log, boot } = fakeBoot();
  const wh = createWidgetHome(api, { boot });
  const [a, b] = await Promise.all([wh.set(true), wh.set(true)]);
  assert.ok(a && b);
  assert.equal(log.boots, 1);
  assert.equal(api.mem.get(WH_KEY), "on");
  await wh.set(false);
  assert.equal(log.disposed, 1);
  assert.equal(wh.isRunning(), false);
  assert.equal(api.mem.get(WH_KEY), "off");
});

test("저장소가 실패해도 이번 실행에는 반영된다", async () => {
  const api = fakeApi(); api.pluginStorage.setItem = async () => { throw new Error("nope"); };
  const { boot } = fakeBoot();
  const wh = createWidgetHome(api, { boot });
  assert.equal(await wh.set(true), true);
  assert.equal(wh.isRunning(), true);
});

test("시작 실패: false를 돌려주고 이유를 남기며 던지지 않는다", async () => {
  const api = fakeApi(), logs = [];
  const wh = createWidgetHome(api, { log: (m) => logs.push(m), boot: async () => { throw new Error("깨짐"); } });
  assert.equal(await wh.set(true), false);
  assert.equal(wh.isRunning(), false);
  assert.match(wh.lastError(), /깨짐/);
  assert.ok(logs.some((m) => /깨짐/.test(m)));
});

test("showContainer가 없는 환경에서는 켜지지 않고 안내한다", async () => {
  const api = fakeApi(); delete api.showContainer;
  const { log, boot } = fakeBoot();
  const wh = createWidgetHome(api, { boot });
  assert.equal(await wh.set(true), false);
  assert.match(wh.lastError(), /쓸 수 없/);
  assert.equal(log.boots, 0);
});

test("open()은 꺼져 있어도(아직 시작 전) 시작한 뒤 연다 · 실패하면 false", async () => {
  const api = fakeApi(), { log, boot } = fakeBoot();
  const wh = createWidgetHome(api, { boot });
  assert.equal(await wh.open(), true);
  assert.equal(log.boots, 1);
  const bad = createWidgetHome(fakeApi(), { boot: async () => { throw new Error("x"); } });
  assert.equal(await bad.open(), false);
});

test("Dusk 창을 열기 전: 떠 있는 위젯 홈만 닫는다", async () => {
  const api = fakeApi(), { log, boot } = fakeBoot();
  const wh = createWidgetHome(api, { boot });
  await wh.set(true);
  await wh.yieldToDusk();
  assert.equal(log.closed, 0);
  log.visible = true;
  await wh.yieldToDusk();
  assert.equal(log.closed, 1);
});

test("원본 플러그인(pocketrisu_basic_home)이 켜져 있으면 감지한다", async () => {
  const mk = (plugins) => fakeApi({ getDatabase: async () => ({ plugins }) });
  const { boot } = fakeBoot();
  const on = createWidgetHome(mk([{ name: WH_ORIGINAL, enabled: true, script: "" }]), { boot });
  assert.equal(await on.originalInstalled(), true);
  const off = createWidgetHome(mk([{ name: WH_ORIGINAL, enabled: false }]), { boot });
  assert.equal(await off.originalInstalled(), false);
  const none = createWidgetHome(mk([]), { boot });
  assert.equal(await none.originalInstalled(), false);
  const broken = createWidgetHome(fakeApi({ getDatabase: async () => { throw new Error("x"); } }), { boot });
  assert.equal(await broken.originalInstalled(), false);
});

test("바로 열기: 켜져 있으면 boot()가 곧장 열고, 끄면 열지 않는다", async () => {
  const a1 = fakeApi(); a1.mem.set(WH_KEY, "on");
  const f1 = fakeBoot(); const w1 = createWidgetHome(a1, { boot: f1.boot });
  await w1.boot(); await new Promise((r) => setTimeout(r, 5));
  assert.equal(w1.openOnLoad(), true);
  assert.equal(f1.log.visible, true);
  const a2 = fakeApi(); a2.mem.set(WH_KEY, "on"); a2.mem.set("dusk.widgethome.onload", "off");
  const f2 = fakeBoot(); const w2 = createWidgetHome(a2, { boot: f2.boot });
  await w2.boot(); await new Promise((r) => setTimeout(r, 5));
  assert.equal(w2.openOnLoad(), false);
  assert.equal(f2.log.visible, false);
  assert.equal(w2.isRunning(), true);
});
test("바로 열기 설정은 저장되고, 꺼진 상태(위젯 홈 꺼짐)에서는 아무것도 열지 않는다", async () => {
  const api = fakeApi(), f = fakeBoot(); const w = createWidgetHome(api, { boot: f.boot });
  await w.setOpenOnLoad(false);
  assert.equal(api.mem.get("dusk.widgethome.onload"), "off");
  await w.boot();
  assert.equal(f.log.boots, 0);
});
