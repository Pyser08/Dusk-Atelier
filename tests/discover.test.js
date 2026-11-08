import test from "node:test";
import assert from "node:assert/strict";
import { pickDiscover, needsAddon, SNOOZE_MS } from "../src/engine/discover.js";

const base = (x = {}) => ({ opens: 1, records: 0, wikiDocs: 0, hasChat: true, addons: new Set(["memory"]), visited: new Set(), advanced: false, memoryOn: true, ...x });
test("처음엔 아무것도 권하지 않고, 쓰는 만큼 하나씩 권한다", () => {
  assert.equal(pickDiscover(base()), null);
  assert.equal(pickDiscover(base({ memoryOn: false })).id, "memory-on");
  assert.equal(pickDiscover(base({ records: 3 })).id, "wiki");
  assert.equal(pickDiscover(base({ records: 3, visited: new Set(["memory:detail"]) })), null, "이미 가 본 곳은 건너뜀");
  assert.equal(pickDiscover(base({ records: 3, wikiDocs: 2 }), { seen: ["wiki"] }).id, "relmap");
});
test("나중에(하루 쉼)·그만, 애드온 필요 표시", () => {
  const now = 1e12;
  assert.equal(pickDiscover(base({ memoryOn: false }), { snoozeUntil: now + SNOOZE_MS }, now), null);
  assert.equal(pickDiscover(base({ memoryOn: false }), { off: true }, now), null);
  const f = pickDiscover(base({ records: 15, opens: 1 }), { seen: ["wiki"] });
  assert.equal(f.id, "cards"); assert.equal(needsAddon(f, base()), true);
});
