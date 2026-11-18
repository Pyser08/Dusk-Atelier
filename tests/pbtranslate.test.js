import test from "node:test";
import assert from "node:assert/strict";
import { translateItemsPrompt, readTranslatedItems } from "../src/data/personabuilder.js";
test("페르소나 번역: 칸 번호로 되찾는다(라벨을 한국어로 바꿔도, 여러 줄 값도)", () => {
  const items = [["기본|Name", "Mio"], ["성격|Traits", "Calm.\nKind to cats."]];
  const p = translateItemsPrompt(items); assert.match(p[1].content, /\[2\] Calm\. ⏎ Kind to cats\./);
  const t = readTranslatedItems("[1] 미오\n[2] 차분함. ⏎ 고양이에게 다정함.\n", items);
  assert.deepEqual(t, { "기본|Name": "미오", "성격|Traits": "차분함.\n고양이에게 다정함." });
  assert.deepEqual(readTranslatedItems("이름: 미오", items), {});
});
