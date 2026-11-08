// AI 작성이 막힐 때 어느 조건 때문인지 알려 준다 (ready()와 같은 조건, 같은 순서)
import test from "node:test";
import assert from "node:assert/strict";
import { PersonRefreshController } from "../src/data/pot/person-thorough-refresh.js";

const make = ({ enabled = true, saved = {}, status = {}, docs = { p: { type: "Character" } }, disposed = false } = {}) => {
  const c = Object.create(PersonRefreshController.prototype);
  Object.assign(c, { disposed, targetId: "p", settingsStore: { snapshot: () => ({ enabled }), status: () => ({ revision: 1, ...saved }) }, wikiController: { snapshot: () => ({ documents: docs, revision: 1 }), status: () => status } });
  return c;
};
test("정상이면 ready, 사유는 일반 문구", () => { const c = make(); assert.equal(c.ready(), true); assert.match(c.notReadyWhy(), /작성 중 바뀜/); });
test("막힌 이유마다 다른 사유를 알려 준다", () => {
  const cases = [
    [{ disposed: true }, /닫힘/], [{ enabled: false }, /설정 꺼짐/], [{ saved: { blocked: true } }, /설정 저장 막힘/], [{ saved: { dirty: true } }, /설정 저장 대기/],
    [{ saved: { contentDirty: true } }, /설정 저장 대기/], [{ status: { writeBlocked: true } }, /위키 쓰기 막힘/], [{ status: { store: { phase: "save-error" } } }, /위키 저장 오류/],
    [{ status: { store: { dirty: true } } }, /위키 저장 대기/], [{ docs: {} }, /인물 문서 없음/], [{ docs: { p: { type: "Place" } } }, /인물 문서 없음/]];
  for (const [opt, re] of cases) { const c = make(opt); assert.equal(c.ready(), false, JSON.stringify(opt)); assert.match(c.notReadyWhy(), re, JSON.stringify(opt)); }
});
test("generate가 막히면 사유가 오류로 나온다", async () => {
  const c = make({ saved: { dirty: true } }); Object.assign(c, { token: 0, phase: "idle", abort: null, emit() {}, status: () => ({ running: false }) });
  await c.generate("p", { groups: ["overview"] }).catch(() => {});
  assert.match(c.error, /설정 저장 대기/);
});
