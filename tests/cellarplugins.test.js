import { test } from "node:test";
import assert from "node:assert/strict";
import { createCellarPlugins, describeEditError, hasPluginEdit, headerProblem, lineDiff } from "../src/data/cellarplugins.js";

const res = (status, body) => ({ status, json: async () => body });
const conn = { url: "http://c", via: "native" };

test("hasPluginEdit: 연결됐고 features에 plugins가 있을 때만", () => {
  assert.equal(hasPluginEdit({ ok: true, features: ["mem", "plugins"] }), true);
  assert.equal(hasPluginEdit({ ok: true, features: ["mem", "backup"] }), false);
  assert.equal(hasPluginEdit({ ok: true }), false);
  assert.equal(hasPluginEdit({ ok: false, features: ["plugins"] }), false);
  assert.equal(hasPluginEdit(null), false);
});

test("list·get·apply: /cellar/plugins로 POST JSON을 보낸다(get은 index를 있을 때만)", async () => {
  const calls = [];
  const api = { nativeFetch: async (u, o) => { calls.push([o.method, new URL(u).pathname, JSON.parse(o.body)]); return res(200, { ok: true, plugins: [] }); } };
  const p = createCellarPlugins(api, conn);
  await p.list(); await p.get("a"); await p.get("a", 2);
  await p.apply([{ name: "a", expectSha: "x", script: "s" }]);
  assert.deepEqual(calls.map((c) => [c[0], c[1]]), Array(4).fill(["POST", "/cellar/plugins"]));
  assert.deepEqual(calls[0][2], { action: "list" });
  assert.deepEqual(calls[1][2], { action: "get", name: "a" });
  assert.deepEqual(calls[2][2], { action: "get", name: "a", index: 2 });
  assert.deepEqual(calls[3][2], { action: "apply", edits: [{ name: "a", expectSha: "x", script: "s" }] });
});

test("서버가 거절하면(4xx) 이유와 본문을 담아 실패한다", async () => {
  const api = { nativeFetch: async () => res(409, { ok: false, error: "그새 바뀌었어요", conflict: true, currentSha: "abc" }) };
  const p = createCellarPlugins(api, conn);
  await assert.rejects(p.apply([{}]), (e) => e.status === 409 && e.info.conflict === true && e.info.currentSha === "abc" && /그새/.test(e.message));
});

test("5xx(파일은 고쳤지만 받아들이기 실패)도 본문의 written·snapshot을 잃지 않는다", async () => {
  const api = { nativeFetch: async () => res(502, { ok: false, error: "파일은 고쳤지만 리스가 받아들이지 못했어요", written: true, snapshot: "2026-snap", file: "settings/app.json" }) };
  const p = createCellarPlugins(api, conn);
  await assert.rejects(p.apply([{}]), (e) => {
    const d = describeEditError(e);
    return d.kind === "written" && d.written === true && d.snapshot === "2026-snap" && d.file === "settings/app.json" && /받아들이지/.test(d.text);
  });
});

test("describeEditError: 종류별 분류", () => {
  const mk = (status, info, extra = {}) => Object.assign(new Error(info?.error ?? "x"), { status, info, ...extra });
  assert.equal(describeEditError(mk(409, { conflict: true, error: "e" })).kind, "conflict");
  assert.equal(describeEditError(mk(409, { pending: true, error: "대기 중" })).kind, "pending");
  assert.equal(describeEditError(mk(501, { error: "미지원", host: "pocketrisu" })).kind, "unsupported");
  assert.equal(describeEditError(Object.assign(new Error("응답이 없어요"), { network: true, status: 0 })).kind, "net");
  assert.equal(describeEditError(mk(400, { error: "머리말" })).kind, "fail");
  assert.equal(describeEditError(mk(424, { error: "로그인 실패" })).kind, "fail");
  assert.equal(describeEditError(mk(409, { conflict: true })).written, false);
});

test("headerProblem: //@name이 같으면 통과, 바뀌었거나 없으면 안내", () => {
  const ok = "//@name dusk_atelier\n//@api 3.0\ncode();\n";
  assert.equal(headerProblem(ok, "dusk_atelier"), "");
  assert.match(headerProblem("//@name 다른\ncode", "dusk_atelier"), /'다른'/);
  assert.match(headerProblem("code only", "dusk_atelier"), /없어요/);
  assert.equal(headerProblem("  //@name   dusk_atelier  \r\ncode", "dusk_atelier"), "", "서버와 같은 규칙(앞 공백·뒤 공백·CRLF 허용)");
});

test("lineDiff: 같으면 same, 한 줄 바뀌면 -1 +1과 앞뒤 문맥", () => {
  assert.equal(lineDiff("a\nb\nc", "a\nb\nc").same, true);
  const d = lineDiff("l1\nl2\nl3\nl4\nl5\nl6\nl7\nl8\nl9", "l1\nl2\nl3\nl4\nCHANGED\nl6\nl7\nl8\nl9", { context: 2 });
  assert.equal(d.same, false); assert.equal(d.added, 1); assert.equal(d.removed, 1);
  assert.deepEqual(d.rows.map((r) => r.t + r.s), [" l3", " l4", "-l5", "+CHANGED", " l6", " l7"]);
  assert.deepEqual(d.rows.map((r) => r.n), [3, 4, 5, 5, 6, 7], "줄 번호: -는 옛 코드, +·공백은 새 코드");
});

test("lineDiff: 줄 추가·삭제, 떨어진 두 곳은 '…'로 이어 붙인다", () => {
  const a = Array.from({ length: 30 }, (_, i) => `line${i + 1}`).join("\n");
  const b = a.replace("line3\n", "line3\nNEW\n").replace("\nline28", "");
  const d = lineDiff(a, b, { context: 1 });
  assert.equal(d.added, 1); assert.equal(d.removed, 1);
  assert.ok(d.rows.some((r) => r.t === "…" && Number(r.s) > 5), "가운데 안 바뀐 긴 구간은 건너뜀 표시");
  assert.ok(d.rows.some((r) => r.t === "+" && r.s === "NEW") && d.rows.some((r) => r.t === "-" && r.s === "line28"));
});

test("lineDiff: 빈 코드·끝 줄바꿈 차이도 다룬다", () => {
  const d = lineDiff("a\n", "a\nb\n");
  assert.equal(d.added, 1); assert.equal(d.removed, 0);
  assert.equal(lineDiff("", "x").added, 1);
});

test("lineDiff: 가운데가 아주 크면 통째로 바뀜으로 처리하고 오래 걸리지 않는다(3.6MB급)", () => {
  const big = (tag) => Array.from({ length: 60000 }, (_, i) => `const v${i}=${tag}${i};`).join("\n");
  const t0 = Date.now();
  const d = lineDiff(big("a"), big("b"), { maxRows: 50 });
  assert.ok(Date.now() - t0 < 3000, `느려요: ${Date.now() - t0}ms`);
  assert.equal(d.removed, 60000); assert.equal(d.added, 60000);
  assert.equal(d.rows.length, 50); assert.equal(d.truncated, true);
});

test("lineDiff: 큰 코드의 한 곳만 바뀌면 앞뒤를 떼어 내서 정확하다", () => {
  const lines = Array.from({ length: 80000 }, (_, i) => `x${i}`);
  const a = lines.join("\n"), b = [...lines.slice(0, 40000), "CHANGED", ...lines.slice(40001)].join("\n");
  const t0 = Date.now();
  const d = lineDiff(a, b);
  assert.ok(Date.now() - t0 < 2000);
  assert.equal(d.added, 1); assert.equal(d.removed, 1); assert.equal(d.rows.length, 8, "문맥 3+3 + 바뀐 2줄");
});
