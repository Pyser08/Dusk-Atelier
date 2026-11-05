import test from "node:test";
import assert from "node:assert/strict";
import { normTagList, normTags, withProfileTags, loadTags, saveTags, TAGS_KEY } from "../src/data/erosynctags.js";
import { createErosync } from "../src/data/erosync.js";

test("태그 정리: 쉼표 분리·공백 정리·중복(대소문자 무시) 제거·개수·길이 제한", () => {
  assert.deepEqual(normTagList(" a , A,b\n c,,"), ["a", "b", "c"]);
  assert.equal(normTagList(Array.from({ length: 30 }, (_, i) => `t${i}`)).length, 12);
  assert.equal(normTagList("x".repeat(80))[0].length, 30);
});
test("같은 태그가 선호·금기에 같이 있으면 금기가 이긴다, 둘 다 비면 인물을 지운다", () => {
  const m = withProfileTags({}, "p1", { likes: ["a", "b"], limits: ["B"] });
  assert.deepEqual(m.p1, { likes: ["a"], limits: ["B"] });
  assert.deepEqual(withProfileTags(m, "p1", { likes: [], limits: [] }), {});
  assert.deepEqual(normTags(null), {});
});
test("키는 erosync_ 로 시작해 장기 기억 파일에 자동으로 들어간다", () => assert.ok(TAGS_KEY.startsWith("erosync_")));
const mem = () => { const m = new Map(); return { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } }, addRisuReplacer: async () => {} }; };
test("저장·불러오기와 컨트롤러가 엔진에 넘긴다", async () => {
  const api = mem(); await saveTags(api, { p1: { likes: ["a"], limits: [] } });
  assert.deepEqual((await loadTags(api)).p1.likes, ["a"]);
  let pushed = null;
  const inst = { loaded: () => true, dispose: async () => {}, tags: { set: (m) => { pushed = m; } } };
  const er = createErosync(api, { boot: async () => inst, load: async () => true });
  await er.boot();
  assert.deepEqual(pushed.p1.likes, ["a"]);
  const r = await er.setTags("p2", { likes: ["z"], limits: ["q"] }); assert.ok(r.ok);
  assert.deepEqual(pushed.p2, { likes: ["z"], limits: ["q"] });
  assert.deepEqual(await er.tags("p2"), { likes: ["z"], limits: ["q"] });
  assert.equal((await er.setTags("", {})).ok, false);
  await er.stop();
});
