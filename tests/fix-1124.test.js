// 11-24 버그리포트(2.2.44 + 장기기억 0.3.55): 관계도 버튼·읽기 합치기·게이지 파싱·리롤 준비·애드온 이전·성인 기록 횟수
import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryButton } from "../src/data/memorybutton.js";
import { readChar } from "../src/data/apiread.js";
import { createMemoryStoreV3, FOLDER_PREFIX } from "../src/data/memorystore3.js";
import { nsfwFrom, actTimes, isHotText, NSFW_LITE_STAGE1 } from "../src/engine/recorder.js";

const mem = () => { const m = new Map(); return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); }, m }; };

test("관계도 버튼: start()가 ReferenceError 없이 등록하고 set()이 설정을 저장한다", async () => {
  const ps = mem(); let reg = 0;
  const api = { pluginStorage: ps, registerButton: async () => { reg++; return { id: "x" }; }, unregisterUIPart: async () => {} };
  const b = createMemoryButton(api, { name: "관계도", icon: "", open: () => {} });
  await b.start();
  assert.equal(reg, 1);
  await b.set(false);
  assert.equal(ps.m.get("dusk.ui.memoryButton"), "off");
});

test("캐릭터 읽기: fresh 읽기도 읽는 중인 같은 요청과 합쳐진다", async () => {
  let n = 0; const api = { getCharacterFromIndex: async () => { n++; await new Promise((r) => setTimeout(r, 20)); return { chaId: "a" }; } };
  await Promise.all([readChar(api, 1, 0), readChar(api, 1, 0, { fresh: true }), readChar(api, 1, 0)]);
  assert.equal(n, 1);
  await readChar(api, 1, 0, { fresh: true });   // 다 읽은 뒤 fresh는 새로
  assert.equal(n, 2);
});

test("기억 폴더 peekFolder: 같은 원문이면 다시 파싱하지 않는다", async () => {
  const ps = mem(); const store = createMemoryStoreV3({ pluginStorage: ps }, { storage: ps });
  const id = "c1"; // folderIdOf 구현에 맞춰 키를 찾는다
  await store.updateFolder("c1", "t1", (f) => { f.gauge = { log: [{ head: "h", snap: [1] }] }; });
  const a = await store.peekFolder("c1", "t1"), b = await store.peekFolder("c1", "t1");
  assert.ok(a && a === b);
  assert.ok([...ps.m.keys()].some((k) => k.startsWith(FOLDER_PREFIX)), id);
});

test("성인 기록: act 줄 횟수를 읽고, 완곡한 응답에도 act 줄을 묻는다", () => {
  assert.equal(actTimes("3"), 3); assert.equal(actTimes("세 번"), 3); assert.equal(actTimes(""), 1); assert.equal(actTimes("99"), 20);
  const r = nsfwFrom("act|미오|{{user}}|sex|정상위|3", [{ name: "미오" }]);
  assert.equal(r[0].times, 3);
  assert.match(NSFW_LITE_STAGE1, /\nact\|/);
  assert.ok(isHotText("그날 밤 둘은 몸을 섞었다. 모두 세 번이었다."));
  assert.ok(isHotText("그렇게 5번 했다"));
});
