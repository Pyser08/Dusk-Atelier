// 0.3.22 전체 흐름: 기록기 답(새 줄) → 턴 반영(폴더 저장) → 다음 요청 주입. 세계 탭 켬/끔 둘 다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseWriterRun, recordTurn } from "../src/engine/recorder.js";
import { assembleWriterPrompt } from "../src/engine/pot/writer-prompt.js";
import { SettingsStore } from "../src/engine/pot/settings.js";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";
import { createBlankPerson } from "../src/engine/wikiedit.js";
import { applyNsfwTurn } from "../src/data/nsfwturn.js";
import { createMemoryStoreV3 } from "../src/data/memorystore3.js";
import { createMemoryInjector } from "../src/data/memoryinject.js";
import { extraOf } from "../src/engine/memextra.js";

const LIB = JSON.parse(fs.readFileSync(new URL("../src/data/pot/prompts.json", import.meta.url), "utf8"));
const RP = "2026년 3월 2일 밤. 세라는 은빛 여관 2층에서 시로코에게 유나가 왕녀라는 사실을 털어놓았다. 세라는 기사단장이 되겠다고 다짐했다. 시로코는 세라의 목에 입을 맞춰 자국을 남겼다.";
async function settingsSnap() {
  const m = new Map(), st = { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); return true; }, removeItem: async (k) => { m.delete(k); } };
  const s = new SettingsStore(st, {}); await s.load(); s.forceRelationshipOnlyMode();
  s.update((v) => { v.sexualDesireEnabled = true; });
  return s.snapshot();
}
const STAGE1 = ["scene|밤|은빛 여관|밤|yes", "who|세라|시로코에게 비밀을 말했다|2", "who|시로코|세라의 목에 입맞췄다|2",
  "told|세라|시로코|유나가 왕녀라는 것", "goal|세라|기사단장 되기|20|active", "place|은빛 여관|항구 옆 2층 여관", "item|은반지|어머니의 유품|세라",
  "mark|세라|목|키스마크|3", "zone|세라|귀|3|숨결만 닿아도 움찔한다|왼쪽 귓불"].join("\n");

async function record({ world }) {
  const scope0 = createEmptyWikiScope({ characterId: "c1", chatKey: "k1" });
  const run = parseWriterRun(assembleWriterPrompt({ sourceLibrary: LIB, settings: await settingsSnap(), wikiScope: scope0, rpText: RP, requestRef: "r0" }).prompt);
  let sys = "";
  const fake = async (msgs) => { if (/scene\|/i.test(msgs[0].content) && !/^id\|/m.test(msgs[0].content)) { sys = msgs[0].content; return STAGE1; } return "id|기사"; };
  const rec = await recordTurn(fake, run, { nsfw: true, world });
  return { rec, sys };
}

function setupStore() {
  const m = new Map();
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } },
    getLocalPluginStorage: async () => ({ getItem: async () => null, setItem: async () => {} }) };
  return { api, store: createMemoryStoreV3(api) };
}

test("기록기: 세계 탭 켬이면 소문·목표·장소 줄 안내가 붙고 읽힌다, 끄면 안 붙고 버린다(흔적·약점 자리는 그대로)", async () => {
  const on = await record({ world: true });
  assert.match(on.sys, /told\|Speaker\|Listener/); assert.match(on.sys, /mark\|Name\|body part/);
  assert.deepEqual(on.rec.stage1.extra.map((x) => x.kind).sort(), ["goal", "item", "mark", "place", "told"]);
  assert.equal(on.rec.stage1.nsfw.find((x) => x.kind === "zone").spot, "왼쪽 귓불");
  const off = await record({ world: false });
  assert.doesNotMatch(off.sys, /told\|Speaker/); assert.match(off.sys, /mark\|Name/);
  assert.deepEqual(off.rec.stage1.extra.map((x) => x.kind), ["mark"]);
});

test("턴 반영 → 폴더 저장 → 다음 요청 주입(세계 켬/끔, @인물, 근황)", async () => {
  const { rec } = await record({ world: true });
  const { api, store } = setupStore();
  let w = createEmptyWikiScope({ characterId: "c1", chatKey: "t1" });
  for (const n of ["세라", "시로코"]) w = createBlankPerson(w, n);
  const sid = Object.values(w.documents).find((d) => d.title === "세라").id;
  await store.updateFolder("c1", "t1", (f) => {
    f.wiki = w; f.cursor = { at: 40 }; f.scenes = [{ id: "s1", at: 40, sum: "여관", when: "2026-03-02 밤", orphan: false }];
    f.nsfw = { [sid]: { sexual: { eroticInterest: 60 }, axes: {}, positions: [] } };
    f.people["세라"] = { name: "세라", records: [{ id: "r1", act: "시로코에게 비밀을 말했다", g: "A", at: 40, at_ms: 1, orphan: false, user: false, pin: false }] };
    f.people["시로코"] = { name: "시로코", records: [{ id: "r2", act: "세라를 지켜봤다", g: "B", at: 2, at_ms: 1, orphan: false, user: false, pin: false }] };
  });
  const queue = [...(rec.stage1.human ?? []), ...(rec.stage1.extra ?? []), ...(rec.stage1.nsfw ?? [])];
  const memory = { store, flow: { takeNsfw: () => queue.splice(0), takeDrive: () => [] }, switches: { currentChat: async () => ({ chaId: "c1", chatId: "t1" }) } };
  await applyNsfwTurn(memory, () => {}, { people: [{ name: "세라" }], rp: RP }, api);
  const f = await store.getFolder("c1", "t1"), e = extraOf(f);
  assert.equal(e.rumors[0].to, "시로코"); assert.equal(e.goals["세라"].list[0].prog, 20);
  assert.equal(e.world.place["은빛여관"].desc, "항구 옆 2층 여관"); assert.equal(e.world.item["은반지"].owner, "세라");
  assert.equal(e.marks[0].when, "2026-03-02 밤");
  const ear = f.nsfw[sid].zones.find((z) => z.part === "ears");
  assert.ok(ear && ear.level === 3 && ear.spot === "왼쪽 귓불" && ear.note, "약점 자리·특징 저장");
  assert.ok(f.nsfw[sid].zones.length >= 1);
  // 시로코가 오래 안 나왔다가 돌아온 것처럼
  await store.updateFolder("c1", "t1", (g) => { g.life ??= { p: {} }; g.life.p ??= {}; const kid = Object.values(g.wiki.documents).find((d) => d.title === "시로코").id; g.life.p[kid] = { ...(g.life.p[kid] ?? {}), seen: 5 }; });
  const chat = { id: "t1", name: "채팅1", message: [{ role: "user", data: "안녕" }, { role: "char", data: RP, chatId: "m1" }, { role: "user", data: "@세라 시로코가 은빛 여관에 돌아왔어" }], localLore: [] };
  const character = { chaId: "c1", name: "봇", chats: [chat] };
  Object.assign(api, { getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => character, getChatFromIndex: async () => chat });
  const blockOf = async () => { const out = await createMemoryInjector(api, { store }).beforeRequest([{ role: "system", content: "S" }, { role: "user", content: "@세라 시로코가 은빛 여관에 돌아왔어" }], "model"); return out.map((m) => String(m.content)).find((c) => c.startsWith("[Dusk Memory")) ?? ""; };
  let b = await blockOf();
  assert.match(b, /Story threads/); assert.match(b, /pointed at 세라/); assert.match(b, /시로코 is back after 35 messages/);
  assert.match(b, /Visible traces: 세라 — 목 키스마크/);
  assert.doesNotMatch(b, /heard from|aims:|World:/, "세계 탭 꺼짐(기본): 소문·목표·세계 문서는 안 넣음");
  await store.updateIndex((i) => { i.settings.inject ??= {}; i.settings.inject.world = true; });
  b = await blockOf();
  assert.match(b, /시로코 heard from 세라 that 유나가 왕녀라는 것/); assert.match(b, /세라's aims: 기사단장 되기 \(20%\)/); assert.match(b, /은빛 여관\(장소\): 항구 옆 2층 여관/);
  assert.match(b, /귀\(약점: 왼쪽 귓불 — 숨결만/, "성인 프로필 줄에 약점 자리");
});

import { personPack, insertPack } from "../src/engine/memextra.js";
import { loadReconciled } from "../src/data/memoryload.js";
test("다른 봇으로 옮기기: 빈 채팅에도 위키 범위가 생기고, 옮긴 기억이 대상 채팅 대조에서 고아가 되지 않는다", async () => {
  const { store } = setupStore();
  let w = createEmptyWikiScope({ characterId: "c1", chatKey: "t1" }); w = createBlankPerson(w, "세라");
  const sid = Object.values(w.documents)[0].id;
  await store.updateFolder("c1", "t1", (f) => { f.wiki = w; f.people["세라"] = { name: "세라", records: [{ id: "r1", act: "기사단 시험에 붙었다", g: "A", at: 7, mid: "m7", h: "abc", at_ms: 1, orphan: false, user: false, pin: false, src: { x: 1 } }] }; });
  const src = await store.getFolder("c1", "t1");
  await store.updateFolder("c2", "u1", (f) => { insertPack(f, personPack(src, sid), { newId: "m1", scope: { characterId: "c2", chatKey: "u1" } }); });
  const dst0 = await store.getFolder("c2", "u1");
  assert.equal(dst0.wiki.scope.characterId, "c2"); assert.equal(dst0.wiki.documents.m1.title, "세라");
  const msgs = [{ role: "char", data: "다른 봇의 첫 메시지", chatId: "z1" }, { role: "user", data: "안녕" }];
  const dst = await loadReconciled(store, "c2", "u1", msgs);
  const r = dst.people["세라"].records[0];
  assert.ok(r && !r.orphan && r.carried && r.at == null && !r.src, JSON.stringify(r));
});
