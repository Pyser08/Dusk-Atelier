// 11-23 페르소나 변경 → 옛 페르소나 로어북 항목({{user}} 지우기)
import test from "node:test";
import assert from "node:assert/strict";
import { personaLoreEntry, stripUserTag } from "../src/engine/personalore.js";
import { upsertWikiLore } from "../src/engine/wikilore.js";

test("{{user}}·{{persona}}를 옛 페르소나 이름으로 바꿔 지운다", () => {
  assert.equal(stripUserTag("{{user}}는 {{ User }}의 칼을 든다. {{persona}}", "아린"), "아린는 아린의 칼을 든다. 아린");
});

test("로어북 항목: 이름 키·표식·내용에 {{user}} 없음", () => {
  const e = personaLoreEntry("아린", "{{user}}는 기사다.\n{{user}}는 단 걸 좋아한다.");
  assert.equal(e.key, "아린");
  assert.ok(!/\{\{user\}\}/i.test(e.content));
  assert.ok(e.content.startsWith("[인물 정보: 아린]"));
  assert.equal(e.extentions.da_wiki, "persona:아린");
  assert.equal(personaLoreEntry("아린", "   "), null);
  assert.equal(personaLoreEntry("{{user}}", "x"), null);
});

test("같은 페르소나는 다시 넣어도 하나만(갱신)", () => {
  const a = upsertWikiLore([], [personaLoreEntry("아린", "기사")]);
  const b = upsertWikiLore(a.list, [personaLoreEntry("아린", "왕국 기사")]);
  assert.equal(b.list.length, 1); assert.equal(b.updated, 1);
  assert.match(b.list[0].content, /왕국 기사/);
});
