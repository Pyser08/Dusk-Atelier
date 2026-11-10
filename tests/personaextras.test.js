// 페르소나 빌더: 파일 백업(personafile.js)·봇 기본 페르소나(personabotdef.js) — 페르소나 공방 기능을 Dusk 방식으로
import test from "node:test";
import assert from "node:assert/strict";
import { makeBackup, parseBackup, planImport, restoreImages, BACKUP_FORMAT } from "../src/data/personafile.js";
import { createBotDefaults, injectBlock, MARK, BOTDEF_KEY } from "../src/data/personabotdef.js";

const pb = { templates: [{ id: "default", name: "기본", text: "### A\n* X:", builtin: true }, { id: "t1", name: "내 양식", text: "### B" }], ais: [{ id: "default", name: "기본", mode: "submodel" }] };

test("백업: 고른 페르소나·이미지·양식·프리셋·백업·봇 기본을 담는다", async () => {
  const d = await makeBackup({ personas: [{ id: "p1", name: "미나", personaPrompt: "x", icon: "a.png", extra: 1 }], pb, backups: [{ id: "p1", at: 5 }], botDefaults: { b1: { pid: "p1", bot: "봇" } }, readImage: async () => new Uint8Array([1, 2, 3]) });
  assert.equal(d.format, BACKUP_FORMAT);
  assert.deepEqual(Object.keys(d.personas[0]).sort(), ["icon", "id", "name", "personaPrompt"]);
  assert.equal(d.images["a.png"], "AQID");
  assert.equal(d.templates.length, 2);
  assert.equal(parseBackup(JSON.stringify(d)).personas.length, 1);
  assert.throws(() => parseBackup("{}"), /백업 파일이 아니에요/);
  assert.throws(() => parseBackup("nope"), /JSON/);
});

test("가져오기: 같으면 건너뛰고, 같은 id 다른 내용은 사본, 새 것은 그대로 더한다", () => {
  let n = 0;
  const uid = () => `new${++n}`;
  const cur = { personas: [{ id: "p1", name: "미나", personaPrompt: "x" }, { id: "p2", name: "준", personaPrompt: "old" }], pb, backups: [{ id: "p1", at: 1 }], botDefaults: {} };
  const data = { format: BACKUP_FORMAT, personas: [{ id: "p1", name: "미나", personaPrompt: "x" }, { id: "p2", name: "준", personaPrompt: "new", icon: "j.png" }, { id: "p3", name: "새", personaPrompt: "y" }], images: { "j.png": "AQID" },
    templates: [{ id: "default", name: "기본", text: "### changed", builtin: true }, { id: "t1", name: "내 양식", text: "### B" }, { id: "t9", name: "다른", text: "### C" }],
    ais: [{ id: "default", name: "기본", mode: "submodel" }, { id: "a2", name: "강한", mode: "static", staticModel: "m" }],
    backups: [{ id: "p1", at: 1 }, { id: "p2", at: 9 }], botDefaults: { b1: { pid: "p2", bot: "봇" } } };
  const r = planImport(cur, data, uid);
  assert.deepEqual({ ...r.stat }, { added: 1, copies: 1, same: 1, templates: 2, ais: 1, backups: 1, botDefaults: 1 });
  const copy = r.personas.find((p) => p.name === "준 (가져옴)");
  assert.equal(copy.id, "new1");
  assert.equal(r.personas.find((p) => p.id === "p2").personaPrompt, "old");   // 원래 페르소나는 그대로
  assert.ok(r.templates.some((t) => t.name === "기본 (가져옴)" && !t.builtin));
  assert.ok(r.templates.some((t) => t.id === "t9"));
  assert.equal(r.backups[0].at, 9);
  assert.equal(r.botDefaults.b1.pid, "new1");   // 사본 id로 따라간다
  assert.equal(r.needImages.length, 1);
});

test("이미지 되살리기: 있으면 그 경로, 없으면 새 에셋", async () => {
  const p = { icon: "j.png" }, q = { icon: "k.png" };
  const plan = { needImages: [{ from: "j.png", persona: p }, { from: "k.png", persona: q }] };
  await restoreImages(plan, { images: { "j.png": "AQID", "k.png": "AQID" } }, { readImage: async (x) => (x === "j.png" ? new Uint8Array([1]) : null), saveAsset: async (b) => `saved-${b.length}` });
  assert.equal(p.icon, "j.png");
  assert.equal(q.icon, "saved-3");
});

test("설명 블록은 채팅 기록 앞에 하나만, 지우면 빠진다", () => {
  const msgs = [{ role: "system", content: "main" }, { role: "user", content: "hi", memo: "m1" }];
  const a = injectBlock(msgs, "SHEET");
  assert.equal(a.length, 3);
  assert.ok(a[1].content.startsWith(MARK) && a[1].content.endsWith("SHEET"));
  const b = injectBlock(a, "SHEET2");
  assert.equal(b.filter((m) => String(m.content).startsWith(MARK)).length, 1);
  assert.equal(injectBlock(b, "").length, 2);
});

function fakeApi({ bound = "", selected = -1, prompt = "PERSONA" } = {}) {
  const store = new Map(), hooks = [];
  let reads = 0;
  return {
    store, hooks, reads: () => reads,
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } },
    addRisuReplacer: async (k, f) => hooks.push(f),
    removeRisuReplacer: async (k, f) => hooks.splice(hooks.indexOf(f), 1),
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getChatFromIndex: async () => ({ name: "c", bindedPersona: bound }),
    getCharacterFromIndex: async () => { reads++; return { chaId: "bot1", name: "봇" }; },
    getDatabase: async () => ({ personas: [{ id: "p1", name: "미나", personaPrompt: prompt }], selectedPersona: selected })
  };
}
const MSG = [{ role: "user", content: "hi", memo: "m" }];

test("봇 기본 페르소나: 정해 둔 봇이 없으면 훅을 걸지 않는다", async () => {
  const api = fakeApi();
  const bd = createBotDefaults(api, { log() {} });
  await bd.start();
  assert.equal(api.hooks.length, 0);
  await bd.set("bot1", "p1", "봇");
  assert.equal(api.hooks.length, 1);
  assert.deepEqual(JSON.parse(api.store.get(BOTDEF_KEY)), { bot1: { pid: "p1", bot: "봇" } });
  await bd.stop();
  assert.equal(api.hooks.length, 0);
});

test("봇 기본 페르소나: 연결 없는 채팅에만, 매번 지금 설명으로, 봇 정보는 한 번만 읽는다", async () => {
  const api = fakeApi();
  const bd = createBotDefaults(api, { log() {} });
  await bd.set("bot1", "p1");
  const out = await bd.beforeRequest(MSG, "model");
  assert.ok(out[0].content.endsWith("PERSONA"));
  await bd.beforeRequest(MSG, "model");
  assert.equal(api.reads(), 1);
  assert.equal((await bd.beforeRequest(MSG, "submodel")).length, 1);   // 보조 모델 요청에는 안 넣음
  const bound = createBotDefaults(fakeApi({ bound: "p9" }), { log() {} });
  await bound.set("bot1", "p1");
  assert.equal((await bound.beforeRequest(MSG, "model")).length, 1);
  const global = createBotDefaults(fakeApi({ selected: 0 }), { log() {} });
  await global.set("bot1", "p1");
  assert.equal((await global.beforeRequest(MSG, "model")).length, 1);   // 이미 전역 페르소나면 겹쳐 넣지 않음
  await bd.set("bot1", "");
  assert.equal((await bd.beforeRequest(MSG, "model")).length, 1);
});
