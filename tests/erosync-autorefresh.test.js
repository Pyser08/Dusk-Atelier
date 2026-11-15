// Erosync 자동 재분석: Dusk 모델 경로면 취소 가능, 고쳐진 자료는 같은 출처로 이어 붙여 아는 인물만 다시 분석
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { autoRefreshCancellable, matchEditedDocument } from "../src/erosync/autorefresh.js";

test("Dusk가 runAI를 주면 risu 제공자도 자동 재분석을 취소할 수 있다", () => {
  assert.equal(autoRefreshCancellable("risu", true), true);
  assert.equal(autoRefreshCancellable("risu", false), false);
  assert.equal(autoRefreshCancellable("claude", false), true);
});

test("내용만 바뀐 자료는 같은 종류·출처·이름의 유일한 문서로 이어 붙인다", () => {
  const same = (a, b) => a.kind === b.kind && (a.moduleName || "") === (b.moduleName || "");
  const old = { id: "o1", kind: "character_lore", semanticLabel: "앨리스", semanticHash: "h1" };
  const after = [{ id: "n1", kind: "character_lore", semanticLabel: "앨리스", semanticHash: "h2" }, { id: "n2", kind: "character_lore", semanticLabel: "밥", semanticHash: "h3" }];
  assert.equal(matchEditedDocument(old, after, same)?.id, "n1");
  assert.equal(matchEditedDocument(old, [...after, { id: "n3", kind: "character_lore", semanticLabel: "앨리스", semanticHash: "h4" }], same), null, "같은 이름이 둘이면 잇지 않는다");
  assert.equal(matchEditedDocument(old, [{ ...after[0], kind: "module_lore" }], same), null, "출처가 다르면 잇지 않는다");
});

test("본체가 자동 재분석에 두 도우미와 아는 인물만 모드를 쓴다", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.ok(!/assignment\.providerId === 'risu'\) return await manualPending/.test(src), "risu라서 바로 수동 대기로 넘기지 않는다");
  assert.ok(src.includes("autoRefreshCancellable("));
  assert.ok(src.includes("matchEditedDocument("));
  assert.ok(src.includes("knownPeopleOnly: true"));
  assert.ok(src.includes("EROSYNC_AUTO_NEEDS_FULL"));
});
