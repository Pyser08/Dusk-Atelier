import test from "node:test";
import assert from "node:assert/strict";
import { createHostToast } from "../src/ui/toast.js";
import { showHostUpdateToast, clearStaleUpdateToast } from "../src/ui/hostupdate.js";

const fakeDoc = () => {
  const styles = [], mk = () => { const n = { kids: [] }; n.setAttribute = async () => {}; n.setStyleAttribute = async (s) => { styles.push(s); }; n.setInnerText = async () => {}; n.setInnerHTML = async (s) => { n.html = s; }; n.setTextContent = async (t) => { n.text = t; };
    n.addEventListener = async () => {}; n.appendChild = async (c) => { n.kids.push(c); }; n.remove = async () => {}; n.setStyle = async () => {}; return n; };
  const body = mk();
  return { styles, body, doc: { querySelector: async (s) => (s === "body" ? body : null), createElement: async () => mk() } };
};

test("업데이트 알림은 작게(너비 300·낮은 여백), 다른 알림은 그대로", async () => {
  const a = fakeDoc(), t = createHostToast(() => a.doc);
  assert.equal(await t.show({ title: "새로고침해 주세요", text: "x", compact: true, ms: 1 }), true);
  assert.ok(a.styles[0].includes("width:300px") && a.styles[1].includes("padding:8px"));
  const b = fakeDoc(), t2 = createHostToast(() => b.doc);
  await t2.show({ title: "새 봇", text: "y", ms: 1 });
  assert.ok(b.styles[0].includes("width:340px"));
  const c = fakeDoc();
  const ok = await showHostUpdateToast({ getRootDocument: async () => c.doc }, "9.9.9", { version: "2.1.3" });
  assert.equal(ok, true);
  assert.ok(c.styles[0].includes("width:min(300px") && c.styles[0].includes("padding:9px"));
});

test("알림이 떠 있는 채로 업데이트해도 켜질 때 남은 알림을 지운다", async () => {
  let left = 2;
  const root = { querySelector: async (s) => (s === '[x-dusk-update-toast="1"]' && left > 0 ? { remove: async () => { left--; } } : null) };
  assert.equal(await clearStaleUpdateToast({ getRootDocument: async () => root }), 2);
  assert.equal(left, 0);
});
