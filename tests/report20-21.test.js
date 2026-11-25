import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAssetIndex } from "../src/engine/imgtagfix.js";
import { assetEmotions, cleanEmo, renderThoughts } from "../src/engine/innerthought.js";
import { replaceWikiMarker } from "../src/engine/pot/wiki-retrieval.js";

test("#20 에셋에서 감정 낱말만 뽑는다", () => {
  const idx = buildAssetIndex([["앨리스_기쁨", "앨리스_슬픔", "민수_기쁨", "지은_casual_smile", "지은_1", "민수", "지은 화남", "민수_smug.png"]]);
  assert.deepEqual(assetEmotions(idx, ["봇"]), ["기쁨", "슬픔", "smile", "화남", "smug"]);
});
test("#20 화면 감정: 이름을 떼고, 정상 감정은 그대로", () => {
  const v = { idx: buildAssetIndex([["앨리스_기쁨", "민수_smug", "민수_기쁨"]]), emos: ["기쁨", "smug"] };
  assert.equal(cleanEmo("민수_기쁨", "민수", v), "기쁨");
  assert.equal(cleanEmo("앨리스 기쁨", "민수", v), "기쁨");
  assert.equal(cleanEmo("민수_smug", "민수", v), "smug");
  assert.equal(cleanEmo("민수", "민수", v), "");
  assert.equal(cleanEmo("설레는 마음", "민수", v), "설레는 마음");
  assert.equal(cleanEmo("smug", "민수", v), "smug");
  let got = ""; const out = renderThoughts('x <dusk-thought name="민수" emo="민수_기쁨">좋다</dusk-thought>', (t) => { got = t.emo; return ""; }, (t) => cleanEmo(t.emo, t.name, v));
  assert.match(out, /💭 민수 · 기쁨</); assert.equal(got, "민수_기쁨", "이미지는 원래 값으로 고른다");
});
const S = { role: "system", content: "S" }, u1 = { role: "user", content: "u1" }, a1 = { role: "assistant", content: "a1" }, u2 = { role: "user", content: "u2" };
const at = (list) => list.findIndex((m) => m.content.startsWith("WIKI"));
test("#21 위키 위치", () => {
  const m = [S, u1, a1, u2];
  assert.equal(at(replaceWikiMarker(m, "WIKI")), 1, "기본은 예전 위치");
  assert.equal(at(replaceWikiMarker(m, "WIKI", "beforeLastUser")), 3);
  const end = replaceWikiMarker(m, "WIKI", "end");
  assert.equal(at(end), 4); assert.match(end[4].content, /latest message/);
  assert.equal(at(replaceWikiMarker([...m, { role: "system", content: "[Dusk Memory x" }, a1], "WIKI", "end")), 4, "장기 기억·prefill 앞");
  assert.deepEqual(replaceWikiMarker(m, "", "end"), m);
});
test("신고 창 아카 안내", () => assert.match(fs.readFileSync(new URL("../src/ui/screens/bugreport.js", import.meta.url), "utf8"), /아카에 다른 내용 없이 #\(번호\)/));
test("#21 설정 연결: 훅이 저장된 위치를 읽고, 실패하면 기본", async () => {
  const { MainWikiHook } = await import("../src/data/pot/main-wiki-hook.js");
  const p = (position) => MainWikiHook.prototype.wikiPosition.call({ position });
  assert.equal(await p(async () => "end"), "end"); assert.equal(await p(undefined), "afterSystem");
  assert.equal(await p(async () => { throw new Error("x"); }), "afterSystem");
  const src = fs.readFileSync(new URL("../src/data/memoryturn.js", import.meta.url), "utf8");
  assert.match(src, /main\.position = async \(\) => \(await store\.getIndex\(\)\)\?\.settings\?\.inject\?\.wikiPosition/);
});
