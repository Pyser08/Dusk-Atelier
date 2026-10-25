import assert from "node:assert/strict";
import {normalizeMarks,stripMarksForPrompt,hideMarksForDisplay,scanChat,chunkEntries,pickLore} from "../src/engine/charsplit.js";
const a=normalizeMarks("⟦C:미나짱⟧안녕⟦/C⟧⟦/C⟧",{"미나짱":"미나"});assert.equal(a,"⟦C:미나⟧안녕⟦/C⟧");assert.equal(normalizeMarks(a),a);
assert.equal(stripMarksForPrompt("⟦T:a⟧x⟦T:b⟧",{keepTime:true}),"x⟦T:b⟧");
assert.equal(hideMarksForDisplay("⟦T:x⟧⟦C:A⟧hi⟦/C⟧"),"hi");
const s=scanChat([{role:"user",data:"hello"},{role:"char",data:"⟦T:D+1 저녁⟧⟦C:미나,하루⟧안녕⟦/C⟧"}]);assert.equal(s.chars.미나.length,1);assert.equal(s.chars.하루[0].t,"D+1 저녁");assert.equal(s.chars.미나[0].userBefore,"hello");
assert.equal(chunkEntries([{text:"a"},{text:"b"}],8).length,2);assert.equal(pickLore([{comment:"미나",content:"x"}],"미나")[0].category,"본인");console.log("charsplit tests passed");

// Build trigger: keep the test suite tied to the v1.6.2 branch.
