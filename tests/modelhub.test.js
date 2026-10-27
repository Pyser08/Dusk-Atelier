import test from "node:test";
import assert from "node:assert/strict";
import { defaultCfg, normalizeCfg, addPreset, removePreset, pickFor, toPrompt, fromReply, emptyUsage, addUsage } from "../src/engine/modelcfg.js";
import { runAI } from "../src/engine/runai.js";
import { getCfg, saveCfg, keyStore, pickForStage, getUsage, testPreset } from "../src/data/modelhub.js";

const mockApi = (over = {}) => {
  const m = new Map(), L = new Map(), calls = [];
  return { calls, m, pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } },
    getLocalPluginStorage: async () => ({ getItem: async (k) => L.get(k) ?? null, setItem: async (k, v) => { L.set(k, v); } }),
    nativeFetch: async (url, o) => { calls.push({ url, o }); return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: over.reply ?? '{"text":"안녕하세요"}' } }], usage: { prompt_tokens: 120, completion_tokens: 30 } }) }; },
    runLLMModel: async (o) => { calls.push({ sub: o }); return { type: "success", result: over.reply ?? '{"text":"보조 답"}' }; } };
};

test("cfg: 정리·단계 선택·프리셋 삭제 시 되돌림", () => {
  let cfg = defaultCfg();
  assert.equal(pickFor(cfg, "router"), null);
  const a = addPreset(cfg, "내 GPT", "gpt-4o-mini", { provider: "openai", baseUrl: "https://api.openai.com/v1" });
  cfg = { ...a.cfg, easy: { kind: "api", presetId: a.id } };
  assert.deepEqual(pickFor(cfg, "writer"), { mode: "custom", presetId: a.id });
  const b = addPreset(cfg, "내 Claude", "claude-sonnet-4-6", { provider: "claude", baseUrl: "https://api.anthropic.com/v1" });
  cfg = { ...b.cfg, stages: { ...b.cfg.stages, router: { mode: "dedicated", presetId: b.id } } };
  assert.equal(pickFor(cfg, "router").presetId, b.id);
  assert.equal(pickFor(cfg, "director").presetId, a.id);
  const gone = removePreset(cfg, b.id);
  assert.equal(gone.stages.router.mode, "shared");
  assert.equal(normalizeCfg({ presets: [{ id: "x", preset: { provider: "nope" } }] }).presets.length, 0);
});

test("프롬프트: JSON 작업은 그대로, 글 작업은 {text}로 감싸 벗김", () => {
  const j = toPrompt([{ role: "system", content: "Reply as JSON" }, { role: "user", content: "x" }]);
  assert.equal(j.wrapped, false);
  const t = toPrompt([{ role: "user", content: "번역해 줘" }]);
  assert.equal(t.wrapped, true);
  assert.equal(fromReply('```json\n{"text":"가나다"}\n```', true), "가나다");
  assert.equal(fromReply("그냥 글", true), "그냥 글");
});

test("토큰 사용량 누적", () => {
  let u = emptyUsage();
  u = addUsage(u, "router", { inputTokens: 100, outputTokens: 10 });
  u = addUsage(u, "router", { inputTokens: 50, outputTokens: 5 });
  u = addUsage(u, null, { inputTokens: 1, outputTokens: 1 });
  assert.deepEqual(u.total, { calls: 3, input: 151, output: 16 });
  assert.equal(u.by.router.calls, 2);
  assert.equal(u.by.tools.input, 1);
});

test("runAI custom: OpenAI 형식 호출 + 키는 요청 헤더에만 + 사용량 기록", async () => {
  const api = mockApi();
  const a = addPreset(await getCfg(api), "내 GPT", "gpt-4o-mini", { provider: "openai", baseUrl: "https://api.openai.com/v1" });
  await saveCfg(api, { ...a.cfg, easy: { kind: "api", presetId: a.id } });
  const ks = await keyStore(api); await ks.set("openai", "sk-test-123");
  const pick = { ...(await pickForStage(api, "writer")), stage: "writer" };
  assert.equal(pick.mode, "custom");
  const out = await runAI(api, [{ role: "user", content: "번역해 줘" }], pick);
  assert.equal(out, "안녕하세요");
  const c = api.calls.find((x) => x.url);
  assert.match(c.url, /api\.openai\.com\/v1\/chat\/completions$/);
  assert.equal(c.o.headers.authorization, "Bearer sk-test-123");
  assert.ok(!JSON.stringify([...api.m.values()]).includes("sk-test-123"), "키가 일반 저장소에 들어가면 안 됨");
  const u = await getUsage(api);
  assert.deepEqual(u.by.writer, { calls: 1, input: 120, output: 30 });
});

test("runAI custom: 리스 보조 모델 프리셋과 연결 시험", async () => {
  const api = mockApi({ reply: '{"ok":true}' });
  const a = addPreset(await getCfg(api), "보조", "RisuAI 보조모델", { provider: "risuai", baseUrl: "" });
  await saveCfg(api, a.cfg);
  const r = await runAI(api, [{ role: "user", content: "JSON으로 답" }], { mode: "custom", presetId: a.id });
  assert.equal(r, '{"ok":true}');
  assert.ok(api.calls.some((x) => x.sub));
  assert.equal((await testPreset(api, a.id)).ok, true);
});

test("runAI custom: 없는 프리셋·기존 보조 모델 경로", async () => {
  const api = mockApi();
  await assert.rejects(() => runAI(api, [{ role: "user", content: "x" }], { mode: "custom", presetId: "none" }), /프리셋/);
});
