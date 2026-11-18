// DA Interop 역방향 브리지 (2.2.11): 다른 플러그인이 스니펫의 createDuskClient(id).call(method, params)로 Dusk 기능을 부른다.
// 통로는 pluginStorage(모든 플러그인 공용)뿐이라 키 세 개로 주고받는다.
//   da_interop:dusk          ← Dusk가 기록 (버전·메서드 목록)
//   da_interop:call:<id>     ← 부르는 플러그인이 기록 { rev, method, params, at }
//   da_interop:reply:<id>    ← Dusk가 기록 { rev, ok, result, error, at }
// 허용: 플러그인(id)마다 처음 한 번 사용자에게 묻고 기억한다. 쓰기 메서드는 매번 묻는다.
// 주의: pluginStorage에는 출처 확인이 없어서 id는 자기 신고다(다른 플러그인이 같은 id로 쓸 수 있음).
export const BRIDGE_KEY = "da_interop:dusk", CALL = "da_interop:call:", REPLY = "da_interop:reply:";
export const PERMS_KEY = "dusk.bridge.perms.v1";
var CALL_TTL_MS = 30000, RESULT_MAX = 8 * 1048576, ID_RE = /^[a-z0-9][a-z0-9._-]{1,63}$/;
var BAD_SEG = new Set(["__proto__", "prototype", "constructor"]);

const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
async function readJson(api, key, fb = null) {
  try { const v = await api.pluginStorage.getItem(key); return v == null || v === "" ? fb : typeof v === "string" ? JSON.parse(v) : v; } catch { return fb; }
}
const writeJson = (api, key, v) => api.pluginStorage.setItem(key, JSON.stringify(v));
async function keys(api) {
  const ps = api.pluginStorage;
  if (typeof ps.keys === "function") return (await ps.keys()) ?? [];
  if (typeof ps.key === "function") {
    const n = typeof ps.length === "function" ? await ps.length() : ps.length ?? 0, out = [];
    for (let i = 0; i < n; i++) { const k = await ps.key(i); if (k != null) out.push(k); }
    return out;
  }
  return [];
}
// 경로 ["wiki","people",0,"name"]에 값을 넣는다 (value === undefined면 지운다)
export function setPath(obj, path, value) {
  if (!Array.isArray(path) || !path.length) throw new Error("path가 필요해요");
  let cur = obj;
  for (let i = 0; i < path.length; i++) {
    const k = path[i];
    if (!(typeof k === "string" || Number.isInteger(k)) || BAD_SEG.has(String(k))) throw new Error("path 형식 오류: " + String(k));
    if (i === path.length - 1) { if (value === undefined) { if (Array.isArray(cur) && Number.isInteger(k)) cur.splice(k, 1); else delete cur[k]; } else cur[k] = value; return obj; }
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = Number.isInteger(path[i + 1]) ? [] : {};
    cur = cur[k];
  }
}
// Dusk 저장 키만 열어 준다 (다른 플러그인의 키·호스트 값은 아님)
const duskKey = (k) => typeof k === "string" && /^(dusk[.\-]|rbm:|risupot\.)/.test(k);

// deps: { version, memory()→기억 서비스|null, runAI(api,msgs,pick), open(tab), toast(text), ask({title,text})→Promise<bool>, loadLore, saveLore }
export function createDuskBridge(api, deps = {}) {
  const need = (v, what) => { if (!v) throw new Error(`${what}을(를) 쓸 수 없어요 (애드온이 꺼져 있거나 아직 준비 중)`); return v; };
  const store = () => need(deps.memory?.()?.store, "장기기억");
  // kind: read | write | ai | ui
  const M = {
    "dusk.info": { kind: "read", desc: "Dusk 버전과 메서드 목록", run: () => ({ version: deps.version ?? "", methods: methodList() }) },
    "memory.current": { kind: "read", desc: "지금 채팅 { chaId, chatId, ... }", run: () => clone(deps.memory?.()?.switches?.currentChat?.() ?? null) },
    "memory.index": { kind: "read", desc: "장기기억 목록(폴더 색인)", run: () => store().getIndex() },
    "memory.folder": { kind: "read", desc: "채팅 하나의 기억 폴더(위키·사건·카드 등) { chaId, chatId }", run: (p) => store().getFolder(String(p?.chaId ?? ""), String(p?.chatId ?? "")) },
    "memory.patch": { kind: "write", desc: "기억 폴더 안 값 바꾸기 { chaId, chatId, path:[...], value } (value 생략 = 지우기)", run: async (p) => {
      const { chaId, chatId, path } = p ?? {};
      if (!chaId || !chatId) throw new Error("chaId·chatId가 필요해요");
      await store().updateFolder(String(chaId), String(chatId), (folder) => {
        setPath(folder, path, p.value === undefined ? undefined : clone(p.value));
        if (path[0] === "wiki" && folder.wiki && typeof folder.wiki === "object") folder.wiki.revision = (Number(folder.wiki.revision) || 0) + 1;
      });
      return true;
    } },
    "storage.get": { kind: "read", desc: "Dusk 저장 값 읽기 { key } (dusk.*, rbm:*, risupot.* 키만)", run: async (p) => { if (!duskKey(p?.key)) throw new Error("Dusk 키만 읽을 수 있어요"); return readJson(api, p.key); } },
    "storage.keys": { kind: "read", desc: "Dusk 저장 키 목록", run: async () => (await keys(api)).filter(duskKey) },
    "storage.set": { kind: "write", desc: "Dusk 저장 값 쓰기 { key, value } (value 생략 = 지우기)", run: async (p) => {
      if (!duskKey(p?.key)) throw new Error("Dusk 키만 쓸 수 있어요");
      if (p.value === undefined) { if (typeof api.pluginStorage.removeItem === "function") await api.pluginStorage.removeItem(p.key); else await api.pluginStorage.setItem(p.key, ""); }
      else await writeJson(api, p.key, p.value);
      return true;
    } },
    "lore.settings": { kind: "read", desc: "로어북 규칙 설정", run: () => need(deps.loadLore, "로어북")(api) },
    "lore.saveSettings": { kind: "write", desc: "로어북 규칙 설정 저장 { value }", run: async (p) => { await need(deps.saveLore, "로어북")(api, p?.value ?? {}); return true; } },
    "ai.run": { kind: "ai", desc: "Dusk 모델 설정으로 AI 요청 { messages:[{role,content}] | prompt, mode?:'submodel'|'model' } → 답 글", run: (p, ctx) => {
      const msgs = Array.isArray(p?.messages) ? p.messages : [{ role: "user", content: String(p?.prompt ?? "") }];
      const mode = p?.mode === "model" ? "model" : "submodel";
      return need(deps.runAI, "AI")(api, msgs, { mode, stage: `플러그인 ${ctx.id}` });
    } },
    "ui.open": { kind: "ui", desc: "Dusk 화면 열기 { tab? }", run: async (p) => { await need(deps.open, "화면")(typeof p?.tab === "string" ? p.tab : null); return true; } },
    "ui.toast": { kind: "ui", desc: "Dusk 알림 띄우기 { text }", run: (p) => { need(deps.toast, "알림")(String(p?.text ?? "").slice(0, 300)); return true; } }
  };
  function methodList() { return Object.entries(M).map(([name, m]) => ({ name, kind: m.kind, desc: m.desc })); }

  const ask = (o) => (deps.ask ? Promise.resolve(deps.ask(o)).catch(() => false) : Promise.resolve(false));
  let perms = null;
  const loadPerms = async () => (perms ??= (await readJson(api, PERMS_KEY, {})) ?? {});
  async function allowed(id, method, m) {
    const p = await loadPerms();
    if (p[id]?.allow === false) return false;
    if (!p[id]?.allow) {
      const ok = await ask({ title: "플러그인 연동 허용", text: `‘${id}’ 플러그인이 Dusk 기능(기억·위키 읽기·쓰기, AI 요청)을 쓰려고 해요. 허용할까요?` });
      if (!ok) return false;   // 거절은 기억하지 않는다(눌러 보지 못하고 지나간 경우가 많아서). 막으려면 설정에서
      p[id] = { allow: true, at: Date.now() };
      await writeJson(api, PERMS_KEY, p);
    }
    if (m.kind === "write") return ask({ title: "플러그인이 바꾸려고 해요", text: `‘${id}’: ${method}${method === "memory.patch" ? " — 기억·위키 수정" : ""}. 허용할까요?` });
    return true;
  }

  const done = new Map(), busy = new Set();
  async function handle(id) {
    if (busy.has(id)) return;
    busy.add(id);
    try {
      const req = await readJson(api, CALL + id);
      if (!req || !Number.isInteger(req.rev) || req.rev <= (done.get(id) ?? 0)) return;
      const prev = await readJson(api, REPLY + id);
      if ((prev?.rev ?? 0) >= req.rev) { done.set(id, prev.rev); return; }
      done.set(id, req.rev);
      const reply = (ok, result, error) => writeJson(api, REPLY + id, { rev: req.rev, ok, result: ok ? result : null, error: ok ? null : error, at: Date.now() });
      const m = M[req.method];
      if (!m) return reply(false, null, "unknown method: " + req.method);
      if (!(Date.now() - (req.at ?? 0) <= CALL_TTL_MS)) return reply(false, null, "expired");
      if (!(await allowed(id, req.method, m))) return reply(false, null, "denied");
      try {
        const out = clone(await m.run(clone(req.params ?? null), { id }));
        if (JSON.stringify(out).length > RESULT_MAX) return reply(false, null, "result too large");
        return reply(true, out, null);
      } catch (e) { return reply(false, null, String(e?.message ?? e)); }
    } finally { busy.delete(id); }
  }
  async function tick() {
    const ids = (await keys(api)).filter((k) => typeof k === "string" && k.startsWith(CALL)).map((k) => k.slice(CALL.length)).filter((id) => ID_RE.test(id));
    await Promise.all(ids.map((id) => handle(id).catch((e) => console.warn("[Dusk] 플러그인 요청 처리 실패", id, e))));
  }
  async function publish() { await writeJson(api, BRIDGE_KEY, { spec: 1, version: deps.version ?? "", methods: methodList(), at: Date.now() }); }
  let timer = null;
  return {
    methods: methodList, tick, publish, handle,
    async start(ms = 1000) { await publish(); await tick(); timer ??= setInterval(() => { tick().catch(() => {}); }, ms); },
    stop() { if (timer) clearInterval(timer); timer = null; },
    async perms() { return { ...(await loadPerms()) }; },
    async setPerm(id, allow) { const p = await loadPerms(); if (allow == null) delete p[id]; else p[id] = { allow: !!allow, at: Date.now() }; await writeJson(api, PERMS_KEY, p); }
  };
}
