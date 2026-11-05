import test from "node:test";
import assert from "node:assert/strict";
import { createUpdateToast } from "../src/data/updatetoast.js";

function fakeRoot() {
  const log = [], mk = (tag) => { const n = { tag, text: "", children: [], attrs: {}, handlers: {}, removed: false };
    n.setAttribute = async (k, v) => { n.attrs[k] = v; }; n.setStyleAttribute = async () => {}; n.setTextContent = async (t) => { n.text = t; }; n.appendChild = async (c) => { n.children.push(c); };
    n.addEventListener = async (e, f) => { n.handlers[e] = f; }; n.remove = async () => { n.removed = true; log.push("remove"); }; return n; };
  const body = mk("body"); const root = { body, createElement: async (t) => mk(t), querySelector: async (s) => (s === "body" ? body : null) };
  return { root, body, log };
}
test("알림을 띄우고 문구를 바꾸고, ‘확인하러 가기’는 열기 콜백을 부르고 알림을 지움", async () => {
  const r = fakeRoot(); let opened = 0, t = null;
  const api = { getRootDocument: async () => r.root, requestPluginPermission: async () => true };
  const toast = createUpdateToast(api, { onOpen: () => { opened++; }, scheduler: { setTimeout: (f) => { t = f; return 1; }, clearTimeout() {} } });
  assert.equal(await toast.show("새 업데이트가 있어요: 모듈 A"), true);
  const wrap = r.body.children[0], card = wrap.children[0];
  assert.equal(wrap.attrs["x-dusk-update-toast"], "1"); assert.equal(card.children[1].text, "새 업데이트가 있어요: 모듈 A");
  assert.equal(await toast.show("두 번째"), true); assert.equal(r.body.children.length, 1, "같은 알림을 다시 쓴다"); assert.equal(card.children[1].text, "두 번째");
  await card.children[2].children[0].handlers.click(); assert.equal(opened, 1); assert.equal(wrap.removed, true);
  assert.equal(typeof t, "function");
});
test("권한이 없거나 리스 화면에 닿지 못하면 false", async () => {
  assert.equal(await createUpdateToast({ getRootDocument: async () => fakeRoot().root, requestPluginPermission: async () => false }).show("x"), false);
  assert.equal(await createUpdateToast({}).show("x"), false);
  assert.equal(await createUpdateToast({ getRootDocument: async () => { throw new Error("no"); } }).show("x"), false);
});
