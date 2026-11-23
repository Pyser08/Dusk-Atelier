// 11-23 페르소나 변경: 옛 {{user}} 기록을 옛 페르소나 인물로 떼어 내고, 새 페르소나는 새로 시작
import test from "node:test";
import assert from "node:assert/strict";
import { notePersona, personaNames } from "../src/engine/personas.js";
import { tieKey } from "../src/engine/ties.js";
import { buildRelMap } from "../src/engine/relmap.js";
import * as L from "../src/engine/pot/wiki-schema.js";

const mk = () => {
  const now = "2026-01-01T00:00:00Z";
  let sc = L.createEmptyWikiScope({ characterId: "c", chatKey: "k", characterName: "봇", chatName: "채팅" }, now);
  sc = L.createWikiDocument(sc, { type: "Character", title: "아린", aliases: ["{{user}}"], tags: [], links: [], sections: [], metrics: [] }, { now });
  return { cursor: { at: 5 }, wiki: sc, people: { "{{user}}": { name: "{{user}}", aliases: [], records: [{ act: "하나를 만남", at: 1 }] }, 하나: { name: "하나", aliases: [], records: [{ act: "{{user}}와 만남", at: 1 }] } },
    emo: { "하나>{{user}}": { from: "하나", to: "{{user}}", tags: { affection: 5 } } },
    extra: { ties: { [tieKey("하나", "{{user}}")]: { a: "하나", b: "{{user}}", kinds: { lover: { at: 1 } } } } },
    nsfw: { "actor:user": { sexual: { a: 1 } } }, life: { p: { "actor:user": { sex: { n: 3 } } } }, userAliases: ["아린"] };
};

test("처음엔 이름만 기억하고 아무것도 옮기지 않는다", () => {
  const f = mk();
  assert.equal(notePersona(f, "아린").changed, false);
  assert.equal(f.persona.name, "아린");
  assert.equal(f.people["{{user}}"].records.length, 1);
});

test("페르소나가 바뀌면 옛 기록·관계·성인 칸이 옛 페르소나로 간다", () => {
  const f = mk(); notePersona(f, "아린");
  const r = notePersona(f, "세라", { turn: 5 });
  assert.deepEqual([r.changed, r.from, r.to], [true, "아린", "세라"]);
  assert.equal(f.people["아린"].records.length, 1);
  assert.equal(f.people["아린"].persona, true);
  assert.equal(f.people["{{user}}"].records.length, 0);
  assert.ok(f.emo["하나>아린"]);
  assert.equal(Object.values(f.extra.ties)[0].b === "아린" || Object.values(f.extra.ties)[0].a === "아린", true);
  const doc = Object.values(f.wiki.documents).find((d) => d.title === "아린");
  assert.ok(!doc.aliases.includes("{{user}}"));
  assert.deepEqual(f.nsfw[doc.id], { sexual: { a: 1 } });
  assert.equal(f.life.p[doc.id].sex.n, 3);
  assert.equal(f.nsfw["actor:user"], undefined);
  assert.deepEqual(personaNames(f), ["아린"]);
  assert.deepEqual(f.userAliases, []);
});

test("관계도: 옛 페르소나 노드가 persona 표시로 나온다", () => {
  const f = mk(); notePersona(f, "아린"); notePersona(f, "세라");
  const m = buildRelMap(f);
  const n = m.nodes.find((x) => x.name === "아린");
  assert.ok(n, "옛 페르소나 노드");
  assert.equal(n.persona, true);
});

test("옛 페르소나로 돌아오면 그 기록이 다시 나로 합쳐진다", () => {
  const f = mk(); notePersona(f, "아린"); notePersona(f, "세라"); notePersona(f, "아린");
  assert.ok(!personaNames(f).includes("아린"));
  assert.ok(personaNames(f).includes("세라"));
  assert.ok(f.people["{{user}}"].records.length >= 1);
});

test("관계도 노드에 성별(g)이 실린다 — 색 나누기용", () => {
  const f = mk();
  const d = Object.values(f.wiki.documents)[0];
  f.wiki.documents.h = { id: "h", type: "Character", title: "하나", aliases: [], sections: [] };
  f.gender = { h: { g: "f" } };
  const m = buildRelMap(f);
  assert.equal(m.nodes.find((n) => n.name === "하나").g, "f");
  void d;
});
