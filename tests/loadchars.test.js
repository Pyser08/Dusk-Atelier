import test from "node:test";
import assert from "node:assert/strict";
import { loadCharacters } from "../src/data/modules.js";

test("loadCharacters: onBatch는 12개씩 읽을 때마다 부르고 결과는 같다 (단계별 불러오기, 1.8.3)", async () => {
  const ids = Array.from({ length: 30 }, (_, i) => "c" + i);
  const api = { getDatabase: async () => ({ characterOrder: ids }), getCharacterFromIndex: async (i) => (i < 30 ? { chaId: "c" + i, name: "n" + i } : null) };
  const seen = [];
  const r = await loadCharacters(api, undefined, { onBatch: (l) => seen.push(l.length) });
  assert.deepEqual(seen, [12, 24]); assert.equal(r.list.length, 30); assert.equal(r.unloaded, 0);
  const plain = await loadCharacters(api);
  assert.deepEqual(plain.list, r.list);
});
