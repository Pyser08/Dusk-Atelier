// 모델 허브 (v1.6.4 3단계): 모델 프리셋 저장·키 보관·내 API 호출·토큰 사용량. 화면은 5단계에서 연결.
// 키는 리수폿 방식 그대로 플러그인 로컬 저장소에만 두고, 설정·백업·공유 코드에는 절대 넣지 않는다.
import { LocalKeyStore } from "./pot/local-keys.js";
import { callWriterModel, testModelConnection, providerModelList, copilotLoginStep } from "./pot/llm-client.js";
import { setCustomRunner } from "../engine/runai.js";
import { defaultCfg, normalizeCfg, presetOf, pickFor, toPrompt, fromReply, emptyUsage, addUsage } from "../engine/modelcfg.js";

const CFG_KEY = "dusk.models.v1", USAGE_KEY = "dusk.models.usage.v1";
const state = new WeakMap(); // api → { keys, cfg, usage }

const parse = (raw) => { try { return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null; } catch { return null; } };

async function hub(api) {
  let s = state.get(api);
  if (s) return s;
  s = { keys: new LocalKeyStore(api), cfg: normalizeCfg(parse(await api.pluginStorage.getItem(CFG_KEY))), usage: null, saveT: null };
  const u = parse(await api.pluginStorage.getItem(USAGE_KEY));
  s.usage = u?.total && u?.by ? u : emptyUsage();
  state.set(api, s);
  return s;
}

export async function getCfg(api) { return (await hub(api)).cfg; }
export async function saveCfg(api, cfg) {
  const s = await hub(api);
  s.cfg = normalizeCfg(cfg);
  await api.pluginStorage.setItem(CFG_KEY, JSON.stringify(s.cfg));
  return s.cfg;
}
export async function keyStore(api) { const s = await hub(api); await s.keys.load(); return s.keys; }

// 단계(router|director|writer) 또는 일반 호출이 쓸 pick. null이면 리스 보조 모델.
export async function pickForStage(api, stage) { return pickFor((await hub(api)).cfg, stage); }

export async function getUsage(api) { return (await hub(api)).usage; }
export async function resetUsage(api) {
  const s = await hub(api); s.usage = emptyUsage();
  await api.pluginStorage.setItem(USAGE_KEY, JSON.stringify(s.usage));
}
function noteUsage(api, s, stage, usage) {
  s.usage = addUsage(s.usage, stage, usage);
  if (s.saveT) return;
  s.saveT = setTimeout(() => { s.saveT = null; Promise.resolve(api.pluginStorage.setItem(USAGE_KEY, JSON.stringify(s.usage))).catch(() => {}); }, 1500);
}

// runAI(pick.mode === "custom")가 부르는 실행기: 메시지 → 프롬프트 → 리수폿 모델 클라이언트 → 글
async function runCustom(api, messages, pick, signal) {
  const s = await hub(api);
  const preset = presetOf(s.cfg, pick.presetId);
  if (!preset) throw new Error("고른 모델 프리셋을 찾을 수 없어요. 모델 설정을 확인해 주세요.");
  if (preset.provider !== "risuai") await s.keys.load();
  const { prompt, wrapped } = toPrompt(messages);
  const text = await callWriterModel(api, s.keys, preset, prompt, { signal, stageLabel: pick.stage || "AI", onUsage: (u) => noteUsage(api, s, pick.stage, u) });
  return fromReply(text, wrapped);
}
setCustomRunner(runCustom);

// 연결 시험·모델 목록·Copilot 로그인은 리수폿 클라이언트 그대로
export async function testPreset(api, presetId, { signal } = {}) {
  const s = await hub(api), preset = presetOf(s.cfg, presetId);
  if (!preset) throw new Error("모델 프리셋을 찾을 수 없어요.");
  if (preset.provider !== "risuai") await s.keys.load();
  return testModelConnection(api, s.keys, preset, { signal });
}
export async function listModels(api, presetId, { signal } = {}) {
  const s = await hub(api); await s.keys.load();
  return providerModelList(api, s.keys, presetOf(s.cfg, presetId), { signal });
}
export const copilotLogin = (api, opts) => copilotLoginStep(api, opts);
export { defaultCfg };
