import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCellarSd, hoistCommon } from "../src/data/cellarsd.js";

const res = (status, body) => ({ status, json: async () => body });
const cellarOf = (features, extra = {}) => ({ status: async () => ({ ok: true, url: "http://c", via: "native", features, ...extra }) });

test("공통 큰 값(참고 그림)만 base로 빼고 씬 값은 남긴다", () => {
  const big = "x".repeat(3000);
  const r = hoistCommon([{ input: "a", parameters: { ref: big, seed: 1 } }, { input: "b", parameters: { ref: big, seed: 2 } }]);
  assert.deepEqual(r.base, { parameters: { ref: big } });
  assert.deepEqual(r.bodies, [{ input: "a", parameters: { seed: 1 } }, { input: "b", parameters: { seed: 2 } }]);
  assert.equal(hoistCommon([{ parameters: { ref: big } }]).base, null, "한 장이면 그대로");
});

test("쓸 수 있는지: sd 기능 + 리스 저장소(risu) 둘 다 있어야. 다시 확인 중·옛 Cellar면 null", async () => {
  const api = { nativeFetch: async () => res(200, { ok: true, risu: true, last: 0, results: [] }) };
  assert.deepEqual(await createCellarSd(api, { cellar: cellarOf(["mem", "sd"]) }).available(), { url: "http://c", via: "native" });
  assert.equal(await createCellarSd(api, { cellar: cellarOf(["mem"]) }).available(), null);
  assert.equal(await createCellarSd(api, { cellar: cellarOf(["sd"], { retrying: true }) }).available(), null);
  const noRisu = { nativeFetch: async () => res(200, { ok: true, risu: false, results: [] }) };
  assert.equal(await createCellarSd(noRisu, { cellar: cellarOf(["sd"]) }).available(), null);
  assert.equal(await createCellarSd(api, { cellar: null }).available(), null);
});

test("예약은 100장씩 나눠 보내고 공통 값은 base로", async () => {
  const sent = [];
  const api = { nativeFetch: async (u, o) => { sent.push(JSON.parse(o.body)); return res(200, { ok: true, queued: 1 }); } };
  const cs = createCellarSd(api, { cellar: cellarOf(["sd"]) });
  const big = "r".repeat(5000);
  await cs.enqueue({ url: "http://c" }, Array.from({ length: 150 }, (_, i) => ({ id: `r:${i}`, meta: { cid: "c" }, body: { input: String(i), parameters: { ref: big, seed: i } } })), ["T"]);
  assert.equal(sent.length, 2); assert.equal(sent[0].jobs.length, 100); assert.equal(sent[1].jobs.length, 50);
  assert.equal(sent[0].base.parameters.ref, big); assert.equal(sent[1].jobs[0].body.parameters.ref, undefined);
  assert.deepEqual(sent[0].tokens, ["T"]); assert.equal(sent[1].jobs[0].id, "r:100");
});

test("빠른 넣기: sha256 경로로 없는 것만 한 번에 올리고 같은 순서로 경로를 돌려준다", async () => {
  const calls = [];
  const a = new Uint8Array([1, 2, 3]), b = new Uint8Array([4, 5]);
  const ka = `assets/${createHash("sha256").update(a).digest("hex")}.webp`, kb = `assets/${createHash("sha256").update(b).digest("hex")}.webp`;
  const api = { nativeFetch: async (u, o) => { const j = JSON.parse(o.body); calls.push(j); return res(200, j.action === "missing" ? { ok: true, missing: [kb] } : { ok: true, written: j.entries.length }); } };
  const keys = await createCellarSd(api, { cellar: cellarOf(["assets"]) }).putAssets([{ data: a, ext: "webp" }, { data: b, ext: "WEBP" }, { data: b, ext: "webp" }]);
  assert.deepEqual(keys, [ka, kb, kb]);
  assert.deepEqual(calls[1].entries.map((e) => e.key), [kb], "이미 있는 것·같은 것은 한 번만");
  assert.equal(await createCellarSd(api, { cellar: cellarOf(["mem"]) }).putAssets([{ data: a, ext: "webp" }]), null);
});
