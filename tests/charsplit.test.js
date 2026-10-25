import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMarks, scanChat, chunkEntries, pickLore, summaryPrompt } from "../src/engine/charsplit.js";
import { makeInstruction } from "../src/data/charsplit.js";

test("normalizer closes an S block before opening C; blocks never nest", () => {
  const out = normalizeMarks('⟦T:2026-10-25 20:00⟧⟦S⟧At the café.⟦C:Mio⟧"Hi."⟦/C⟧');
  assert.match(out, /⟦S⟧At the café\.⟦\/S⟧⟦C:Mio⟧/);
  assert.equal((out.match(/⟦S⟧/g) ?? []).length, (out.match(/⟦\/S⟧/g) ?? []).length);
  assert.equal((out.match(/⟦C:Mio⟧/g) ?? []).length, (out.match(/⟦\/C⟧/g) ?? []).length);
});

test("normalizer repairs missing close markers and canonicalizes aliases", () => {
  const out = normalizeMarks('⟦S⟧Scene changed.⟦C:미오⟧Hello', { "미오":"Mio" });
  assert.match(out, /Scene changed\.⟦\/S⟧⟦C:Mio⟧Hello⟦\/C⟧$/);
});

test("scanChat extracts character interactions with the latest situation context", () => {
  const scan = scanChat([
    { role:"user", data:"우리는 어디에 있어?" },
    { role:"assistant", data:'⟦T:2026-10-25 20:00⟧⟦S⟧At the café.⟦C:Mio⟧"여기 카페야." 미오가 의자를 가리킨다.⟦/C⟧' }
  ]);
  assert.equal(scan.situations.length, 1);
  assert.equal(scan.situations[0].text, "At the café.");
  assert.equal(scan.chars.Mio.length, 1);
  assert.equal(scan.chars.Mio[0].situation, "At the café.");
  assert.equal(scan.chars.Mio[0].userBefore, "우리는 어디에 있어?");
});

test("scanChat tolerates an unclosed S at end of a message", () => {
  const scan = scanChat([{ role:"assistant", data:"⟦S⟧They leave the station." }]);
  assert.equal(scan.situations.length, 1);
  assert.equal(scan.situations[0].text, "They leave the station.");
});

test("chunkEntries carries situation and user context into summary input", () => {
  const entries = chunkEntries([{ t:"20:00", situation:"At the café.", userBefore:"Where are we?", text:"Mio answers." }]);
  assert.equal(entries.length, 1);
  assert.match(entries[0][0]._line, /\[situation: At the café\.\]/);
  assert.match(entries[0][0]._line, /\(user context: Where are we\?\)/);
  assert.match(summaryPrompt({ name:"Mio", entries:entries[0] ?? [] })[1].content, /At the café/);
});

test("pickLore defaults to own and related entries, while keeping unrelated entries off", () => {
  const lore = [
    { comment:"Mio", key:["Mio"], content:"Mio is a student." },
    { comment:"Café", key:["Café"], content:"Mio often visits this café." },
    { comment:"Unrelated", key:["Castle"], content:"An old castle." }
  ];
  const picked = pickLore(lore, "Mio");
  assert.deepEqual(picked.map(x=>x.selected), [true, true, false]);
});

test("situation instructions avoid repeating unchanged scenes and use previous context", () => {
  const instruction = makeInstruction({ names:["Mio"], last:"2026-10-25 20:00", lastSituation:"At the café with Mio." });
  assert.match(instruction, /At the café with Mio\./);
  assert.match(instruction, /ONLY when the scene state materially changes/);
  assert.match(instruction, /Do NOT create a new S block for ordinary dialogue/);
  assert.match(instruction, /Never nest or overlap S and C blocks/);
});


test("empty allowed-name list explicitly records all identifiable characters", () => {
  const instruction = makeInstruction({ names:[] });
  assert.match(instruction, /EMPTY — record interactions for every identifiable named character/);
  assert.match(instruction, /when it is empty, include all identifiable named characters/);
});
