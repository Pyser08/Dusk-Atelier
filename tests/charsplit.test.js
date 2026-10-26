import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMarks, scanChat, chunkEntries, pickLore, summaryPrompt, extractMessageText, isUserMessage } from "../src/engine/charsplit.js";
import { makeInstruction, createCharSplit } from "../src/data/charsplit.js";

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

test("scanChat reads marks from nested content when data is only metadata", () => {
  const scan = scanChat([{
    data: "plain metadata",
    content: { type:"text", text:"⟦C:미오⟧안녕!⟦/C⟧" }
  }], { "미오":"Mio" });
  assert.equal(scan.chars.Mio.length, 1);
  assert.equal(scan.chars.Mio[0].text, "안녕!");
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
  assert.match(instruction, /OUTPUT CONTRACT: Return the normal in-character reply/);
});


test("empty allowed-name list explicitly records all identifiable characters", () => {
  const instruction = makeInstruction({ names:[] });
  assert.match(instruction, /EMPTY — record interactions for every identifiable named character/);
  assert.match(instruction, /when it is empty, include all identifiable named characters/);
});

test("canonical extraction detects marks in nested Risu content and supports is_user", () => {
  const message = { role:"char", is_user:true, data:"plain metadata", content:[{type:"text",text:"⟦C:미오⟧안녕⟦/C⟧"}] };
  assert.equal(extractMessageText(message), "⟦C:미오⟧안녕⟦/C⟧");
  assert.equal(isUserMessage(message), true);
  const scan = scanChat([
    { is_user:true, data:"우리는 어디에 있어?" },
    { role:"char", data:"⟦C:미오⟧여기 카페야.⟦/C⟧" }
  ]);
  assert.equal(scan.chars["미오"][0].userBefore, "우리는 어디에 있어?");
  assert.equal(scan.messageCount, 2);
});

test("scanChat recognizes Risu snake_case user flag and preserves the following character interaction", () => {
  const scan = scanChat([
    { is_user:true, data:"오늘은 뭐 할까?" },
    { is_user:false, data:"⟦C:미오⟧같이 산책하자.⟦/C⟧" }
  ]);
  assert.equal(scan.chars["미오"].length, 1);
  assert.equal(scan.chars["미오"][0].userBefore, "오늘은 뭐 할까?");
});

test("beforeRequest removes hidden marks without dropping non-text payload parts", async () => {
  let hook;
  const storage = new Map();
  const api = {
    pluginStorage: { getItem: async k => storage.get(k) ?? null, setItem: async (k,v) => storage.set(k,v) },
    getCurrentCharacterIndex: async () => 0,
    getCharacterFromIndex: async () => ({ chaId:"bot-1", name:"Original" }),
    addRisuReplacer: async (_name, fn) => { hook=fn; },
    addRisuScriptHandler: async () => {}
  };
  const runtime=createCharSplit(api,{log:()=>{}});
  await runtime.start();
  const input=[
    {role:"system",content:"Base system"},
    {role:"user",content:[
      {type:"text",text:"⟦T:2026-10-26 08:00⟧⟦C:Mio⟧Hello⟦/C⟧"},
      {type:"image",url:"data:image/png;base64,abc"}
    ]}
  ];
  const output=await hook(input,"model");
  assert.equal(output[1].content[0].text,"Hello");
  assert.equal(output[1].content[1].url,"data:image/png;base64,abc");
  assert.match(output[0].content,/Dusk Atelier – interaction and situation marks/);
  assert.match(output[0].content,/SITUATION MARKS — record scene state/);
});

test("normalizer closes an unfinished C block and keeps a single current time mark", () => {
  const out=normalizeMarks("⟦T:old⟧⟦T:new⟧⟦C:Mio⟧Hello");
  assert.equal((out.match(/⟦T:/g)??[]).length,1);
  assert.match(out,/⟦T:old⟧/);
  assert.ok(out.endsWith("⟦C:Mio⟧Hello⟦/C⟧"));
});
