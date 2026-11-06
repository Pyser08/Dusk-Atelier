// 프로바이더 묶음 (v1.9.3): 저장소·키 보관·전송·실행기·리스 등록을 한곳에서 엮는다. 화면과 main.js는 이것만 쓴다.
import { createProviderStore } from "./store.js";
import { createKeyVault } from "./keyvault.js";
import { createTransport } from "./transport.js";
import { createGeminiCache } from "./gemcache.js";
import { createRisuTools } from "./risutools.js";
import { createToolExec } from "./toolexec.js";
import { createProviderRunner } from "./runner.js";
import { createBoard } from "../../engine/provider/board.js";
import { createProgressWindow } from "./progress.js";
import { createRegistrar } from "./register.js";
import { listModels, fetchBalance, hasBalance } from "./models.js";
import { parseVertexAccount, vertexAccessToken } from "../pot/vertex-client.js";
import { copilotAccess, copilotHeaders } from "../pot/copilot-client.js";
import { currentChat } from "../memoryswitches.js";
import { toPotPreset } from "../../engine/provider/profile.js";
import { validateModelPreset } from "../../engine/pot/model-options.js";
import { kindOf } from "../../engine/provider/catalog.js";

export function createProvider(api, { notify = () => {}, confirm, memory = null, createStore, backupSnapshot, compat = () => false, allowed = () => true, log = () => {}, getDoc = null } = {}) {
  const store = createProviderStore(api), vault = createKeyVault(api), transport = createTransport(api, { compat });
  const owner = {};   // 인증 캐시 주인(이 묶음 하나당 하나)
  const fetchLike = (url, options) => api.nativeFetch(url, options);
  const vertex = async (keyText, signal) => (await vertexAccessToken(parseVertexAccount(keyText), { transport: fetchLike, cacheOwner: owner, signal })).token;
  const copilot = async (key, conn, signal) => {
    const access = await copilotAccess({ credential: key, engine: conn.copilotEngine || "vscode", baseUrl: conn.baseUrl || undefined, owner, transport: fetchLike, signal });
    return { origin: access.origin, headers: copilotHeaders(access, { format: conn.format === "anthropic" ? "anthropic" : "openai" }), invalidate: access.invalidate };
  };
  const risuTools = createRisuTools(api, { confirm, memory, log, store: createStore(api), backupSnapshot, currentIdx: null });
  const toolExec = createToolExec({ api });
  const gemcache = createGeminiCache();
  // 진행 창(2.0.0): 요청별 카드. 설정 '진행 창 보이기'(defaults.progress)를 끄면 창만 숨기고 상태는 그대로
  const board = createBoard();
  let progressOn = true; store.get().then((c) => { progressOn = c.defaults?.progress !== false; }).catch(() => {});
  const docOf = getDoc ?? (async () => { try { return await api.getRootDocument?.(); } catch { return null; } });
  const progress = createProgressWindow({ getDoc: docOf, board, enabled: () => progressOn, log });
  store.subscribe((c) => { progressOn = c?.defaults?.progress !== false; progress.refresh(); });
  const runner = createProviderRunner({ api, store, vault, transport, gemcache, risuTools, toolExec, vertex, copilot, currentChar: () => currentChat(api), notify, board, log });
  const registrar = createRegistrar(api, { runner, store, log, allowed });
  const credOf = async (conn) => { const v = await vault.values(conn.keyIds); return v[0] ?? ""; };
  return {
    store, vault, runner, registrar, risuTools, board, progress,
    supported: () => registrar.supported(),
    sync: () => registrar.sync(),
    names: () => registrar.names(),
    async models(conn, signal) { return listModels(transport, conn, await credOf(conn), signal); },
    async balance(conn, signal) { return fetchBalance(transport, conn, await credOf(conn), signal); },
    hasBalance,
    // Dusk 자체 AI 작업(기억 분석 등)에 지정한 프로필이 있으면 그 pick을 돌려준다
    async analysisPick() { const c = await store.get(); const id = c.purposes?.analysis?.profileId || c.subProfileId; return allowed() && c.enabled && id && c.profiles.some((p) => p.id === id) ? { mode: "dusk", profileId: id } : null; },
    async run(messages, pick, signal) {
      const r = await runner.handle({ mode: "other", __purpose: "analysis", __profile: pick.profileId, prompt_chat: messages }, signal);
      if (!r?.success) throw new Error(String(r?.content ?? "Dusk 프로바이더 호출에 실패했어요"));
      return typeof r.content === "string" ? r.content : "";
    },
    // Cellar 서버가 직접 부를 수 있는 모양으로 바꿔 준다. 못 바꾸면(Vertex·Responses 등) 이유를 돌려주고, 호출하는 쪽이 플러그인 중계로 돌린다.
    async serverModel(profileId) {
      const c = await store.get(), p = c.profiles.find((x) => x.id === profileId), conn = p && c.connections.find((x) => x.id === p.connectionId);
      if (!p || !conn) return { ok: false, reason: "프로필을 찾을 수 없어요" };
      const base = toPotPreset(conn, p); if (!base) return { ok: false, reason: "이 연결 종류는 서버에서 직접 못 불러요" };
      if (conn.kind === "vertex") return { ok: false, reason: "Vertex는 서버에서 직접 못 불러요" };
      const key = await credOf(conn); if (!key && !kindOf(conn.kind).keyOptional) return { ok: false, reason: "이 연결의 API 키가 없어요" };
      try { const preset = validateModelPreset({ name: p.name.slice(0, 40), ...base, ...(Number.isFinite(p.sampling.temperature) ? { temperature: p.sampling.temperature } : {}), ...(Number.isFinite(p.sampling.maxTokens) && p.sampling.maxTokens > 0 ? { maxTokens: Math.floor(p.sampling.maxTokens) } : {}), ...(conn.kind === "copilot" ? { copilotEngine: conn.copilotEngine || "vscode" } : {}) }); return { ok: true, model: { kind: "preset", preset, key } }; } catch (e) { return { ok: false, reason: String(e?.message ?? e).slice(0, 120) }; }
    },
    // 연결 시험: 아주 짧은 요청 한 번
    async test(profileId, signal) {
      const r = await runner.handle({ mode: "other", prompt_chat: [{ role: "user", content: "한 단어로만 답해: 안녕" }], max_tokens: 24, __profile: profileId }, signal);
      return r?.success ? { ok: true, text: typeof r.content === "string" ? r.content : "(스트림)" } : { ok: false, text: String(r?.content ?? "실패") };
    }
  };
}
