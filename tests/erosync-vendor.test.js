// Erosync 격리 이식 본체(src/erosync/): 실제 본체를 가짜 api로 올려 훅 등록·정리, 배경음 자료 지문, //@ 머리말 없음
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { bootErosync } from "../src/erosync/erosync.js";
import { UI_AMBIENT_TAPE, UI_AMBIENT_TAPE_BYTES, UI_AMBIENT_TAPE_SHA256 } from "../src/erosync/tape.js";

function fakeApi() {
  const store = new Map(), calls = [];
  const api = {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } },
    addRisuReplacer: async (n) => calls.push(["add", n]), removeRisuReplacer: async (n) => calls.push(["rm", n]),
    addRisuChatListener: async (n) => calls.push(["addLis", n]), removeRisuChatListener: async (n) => calls.push(["rmLis", n]),
    registerSetting: async (n) => calls.push(["setting", n]), unregisterUIPart: async (n) => calls.push(["unreg", n]),
    requestPluginPermission: async () => true,
    onUnload: async () => calls.push(["HOST-onUnload"])
  };
  return { api, calls };
}

test("본체를 올리면 요청·응답 훅과 설정 항목을 등록하고, 끄면 모두 뗀다", async () => {
  const { api, calls } = fakeApi();
  const e = await bootErosync(api);
  assert.equal(e.loaded(), true);
  const names = calls.map((c) => c.join(":"));
  for (const n of ["add:beforeRequest", "add:afterRequest", "addLis:output", "setting:Erosync"]) assert.ok(names.includes(n), n);
  await e.dispose();
  const after = calls.map((c) => c.join(":"));
  for (const n of ["rm:beforeRequest", "rm:afterRequest", "rmLis:output"]) assert.ok(after.includes(n), n);
  assert.equal(e.loaded(), false);
});

test("호스트의 onUnload에는 직접 맡기지 않는다(끄기 전에 호스트가 부르지 못하게)", async () => {
  const { api, calls } = fakeApi();
  const e = await bootErosync(api);
  assert.ok(!calls.some((c) => c[0] === "HOST-onUnload"));
  await e.dispose();
});

test("api가 없으면 던진다", async () => {
  await assert.rejects(() => bootErosync(null), /unavailable/);
});

test("배경음 자료는 길이·지문이 원본과 같다", () => {
  const bytes = Buffer.from(UI_AMBIENT_TAPE, "base64");
  assert.equal(bytes.length, UI_AMBIENT_TAPE_BYTES);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), UI_AMBIENT_TAPE_SHA256);
});

test("소스에 줄 맨 앞 //@ 머리말이 없다(빌드가 막는 것)", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.equal(src.split("\n").filter((l) => /^\s*\/\/@/.test(l)).length, 0);
});
