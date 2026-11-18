// Risu64 연동 (DA Interop 동작): Risu64가 'obfuscate' 동작을 등록해 두면 Dusk의 모델 요청 메시지를 보내기 전에 거기서 난독화한다.
// - Risu64가 없거나 동작이 없으면 아무것도 하지 않는다(지금처럼 동작).
// - 실패·시간 초과·이상한 결과면 원래 메시지로 보낸다. 시간 초과가 나면 60초 동안은 묻지 않는다(지운 플러그인의 등록이 남아 있을 때 매번 기다리지 않게).
// - 동작 요청 칸은 플러그인마다 하나라서 요청을 한 줄로 세워 하나씩 보낸다.
import { readInterop, hasAction, runAction } from "./plugins.js";

export var R64_ID = "risu64", R64_ACTION = "obfuscate";
var WAIT_MS = 10000, CHECK_MS = 5000, BACKOFF_MS = 60000;
var chain = Promise.resolve(), ready = { at: 0, ok: false }, offUntil = 0;

export function _resetR64() { chain = Promise.resolve(); ready = { at: 0, ok: false }; offUntil = 0; }

async function isReady(api) {
  if (Date.now() < offUntil) return false;
  if (Date.now() - ready.at < CHECK_MS) return ready.ok;
  const e = await readInterop(api, R64_ID).catch(() => null);
  ready = { at: Date.now(), ok: hasAction(e, R64_ACTION) };
  return ready.ok;
}
const validMsgs = (v) => Array.isArray(v) && v.length > 0 && v.every((m) => m && typeof m.role === "string" && (typeof m.content === "string" || Array.isArray(m.content)));

export async function r64Messages(api, messages) {
  if (!Array.isArray(messages) || !messages.length || !api?.pluginStorage?.getItem) return messages;
  if (!(await isReady(api))) return messages;
  const job = chain.then(async () => {
    const r = await runAction(api, R64_ID, R64_ACTION, { messages, source: "dusk" }, WAIT_MS).catch((e) => ({ ok: false, error: String(e?.message ?? e) }));
    if (r?.error === "timeout") offUntil = Date.now() + BACKOFF_MS;
    const out = Array.isArray(r?.result) ? r.result : r?.result?.messages;
    if (r?.ok && validMsgs(out)) return out;
    if (r && !r.ok) console.warn("[Dusk] Risu64 난독화 실패, 원문으로 보냄:", r.error);
    return messages;
  });
  chain = job.catch(() => {});
  return job;
}

// runLLMModel 옵션용: messages만 바꾼 새 객체 (메시지가 없으면 그대로)
export async function r64Opts(api, opts) {
  if (!opts || !Array.isArray(opts.messages)) return opts;
  const messages = await r64Messages(api, opts.messages);
  return messages === opts.messages ? opts : { ...opts, messages };
}
