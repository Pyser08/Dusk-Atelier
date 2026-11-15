// ProtLink+ (v1.9.2): Proton Drive 공유 링크를 캐릭터·모듈·플러그인에 연결해 두고, 새 파일이 올라오면 알려 주고 받아서 Dusk 업데이트로 넘긴다.
// Proton에 연결하는 부분(링크 열기·비밀번호·폴더 훑기·파일 받기)은 src/protlink/의 원본 그대로이고, 나머지는 Dusk 방식으로 새로 만들었다.
// 기본 켜짐, 키 dusk.protlink.on. 링크 목록 dusk.protlink.links.v1, 설정 dusk.protlink.settings.v1.
import { diffSnapshots, fitFiles, fitsKind, pendingOf, snapshotOf } from "../engine/protlink.js";
import { listPlugins } from "./plugins.js";
export const PL_KEY = "dusk.protlink.on";
export const PL_LINKS = "dusk.protlink.links.v1";
export const PL_SET = "dusk.protlink.settings.v1";
export const PL_ORIGINAL = "protlink_plus";   // 원본 플러그인 이름 — 같이 켜져 있으면 알림이 두 번 떠서 이쪽은 시작하지 않는다
const MAX_LINKS = 50, MAX_DL = 200 * 1024 * 1024;
export async function loadProtLinkOn(api) {
  try { const raw = await api.pluginStorage.getItem(PL_KEY); return !(raw === "off" || raw === false || raw === "false"); } catch { return true; }
}
async function readJson(api, key, fallback) {
  try { const raw = await api.pluginStorage.getItem(key); if (raw == null || raw === "") return fallback; return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return fallback; }
}
export function normLink(l) {
  if (!l || typeof l !== "object" || typeof l.url !== "string" || !l.url) return null;
  const kind = ["character", "module", "plugin"].includes(l.kind) ? l.kind : "character";
  const t = l.target && typeof l.target.id === "string" && l.target.id ? { id: l.target.id, name: String(l.target.name ?? "") } : null;
  return { id: String(l.id || ""), url: l.url, password: typeof l.password === "string" ? l.password : "", name: String(l.name || "").slice(0, 80) || "이름 없는 링크", kind, target: t,
    files: Array.isArray(l.files) ? l.files : [], pending: Array.isArray(l.pending) ? l.pending : [], latest: Array.isArray(l.latest) ? l.latest : [], addedAt: Number(l.addedAt) || 0, checkedAt: Number(l.checkedAt) || 0, error: typeof l.error === "string" ? l.error : "" };
}
// 화면·위젯에 보여 줄 요약(주소·비밀번호는 넣지 않는다)
export function summary(l) {
  return { id: l.id, name: l.name, kind: l.kind, target: l.target, fileCount: l.files.length, pending: l.pending.map((f) => f.name), checkedAt: l.checkedAt, addedAt: l.addedAt, error: l.error, update: l.pending.length > 0 };
}
const newId = () => `pl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const loadDriver = async (api) => { const m = await import("../protlink/protlink.js"); return m.loadProtLinkDriver(api); };
export function createProtLink(api, { log = () => {}, load = loadProtLinkOn, driver = null, hooks = {}, originalProbe = null, startDelay = 6000 } = {}) {
  let onNow = true, error = "", links = null, drv = null, sessions = null, timer = null, checking = null, ctl = new AbortController(), settings = { check: true };
  const ready = async () => {
    if (drv) return drv;
    drv = driver ?? (await loadDriver(api));
    sessions = drv.G3({ kv: drv.PZ(api) });
    return drv;
  };
  async function originalOn() { try { return originalProbe ? !!(await originalProbe()) : (await listPlugins(api)).some((p) => p.name === PL_ORIGINAL && p.enabled); } catch { return false; } }
  async function loadLinks() {
    if (links) return links;
    const raw = await readJson(api, PL_LINKS, []);
    links = (Array.isArray(raw) ? raw : []).map(normLink).filter((l) => l && l.id).slice(0, MAX_LINKS);
    return links;
  }
  const saveLinks = async () => { try { await api.pluginStorage.setItem(PL_LINKS, JSON.stringify(links)); } catch (e) { log(`ProtLink+ 저장 실패 ${e?.message ?? e}`); throw new Error("링크를 저장하지 못했어요."); } };
  async function open(url, password, signal) {
    await ready();
    const r = await sessions.open(url, signal ?? ctl.signal, password || undefined);
    if (r.kind === "password") return { status: "password" };
    if (r.kind === "wrongPassword") return { status: "wrongPassword" };
    return { status: "ready", share: r.share };
  }
  const errText = (e) => { try { return drv?.Ln ? drv.Ln(e) : String(e?.message ?? e); } catch { return String(e?.message ?? e); } };
  async function scan(share, signal) {
    const res = await drv.Sp(share, { signal: signal ?? ctl.signal, full: true });
    return snapshotOf(res.files);
  }
  const byId = async (id) => { const l = (await loadLinks()).find((x) => x.id === id); if (!l) throw new Error("링크를 찾지 못했어요."); return l; };
  const api2 = {
    isRunning: () => onNow && !!links,
    on: () => onNow,
    lastError: () => error,
    originalInstalled: originalOn,
    settings: () => ({ ...settings }),
    async setSettings(p) {
      settings = { check: p?.check !== false }; try { await api.pluginStorage.setItem(PL_SET, JSON.stringify(settings)); } catch { /* 이번 실행에는 반영 */ }
      schedule(); return { ...settings };
    },
    async boot() {
      onNow = await load(api);
      const s = await readJson(api, PL_SET, {}); settings = { check: s?.check !== false };
      if (!onNow) return false;
      if (await originalOn()) { error = "원래 ‘ProtLink+’ 플러그인이 켜져 있어요. 둘이 같이 돌면 업데이트 알림이 두 번 떠요. 원래 플러그인을 끄면 Dusk 안의 ProtLink+를 쓸 수 있어요."; return false; }
      error = ""; await loadLinks(); schedule(); return true;
    },
    async set(next) {
      onNow = !!next;
      try { await api.pluginStorage.setItem(PL_KEY, next ? "on" : "off"); } catch { /* 이번 실행에는 반영 */ }
      if (!next) { await stop(); return true; }
      return api2.boot();
    },
    async list() { try { return { ok: true, items: (await loadLinks()).map(summary) }; } catch { return { ok: false, items: [] }; } },
    // 링크를 열어 이름과 파일 목록을 본다(저장하지 않음). status: ready | password | wrongPassword
    async inspect(url, password = "", signal) {
      const u = String(url ?? "").trim();
      try { new URL(u); } catch { throw new Error("주소가 올바르지 않아요."); }
      const o = await open(u, password, signal);
      if (o.status !== "ready") return { status: o.status, files: [], rootName: "" };
      try { return { status: "ready", rootName: String(o.share.root?.name ?? ""), files: await scan(o.share, signal) }; } catch (e) { if (signal?.aborted) throw e; throw new Error(errText(e)); }
    },
    // 연결 후보: 캐릭터·모듈·플러그인 목록(휴지통 제외)
    async targets(kind) {
      if (kind === "plugin") return (await listPlugins(api)).filter((p) => !p.self).map((p) => ({ id: p.name, name: p.displayName, extra: p.version ? `v${p.version}` : "" }));
      const db = await api.getDatabase(["characters", "modules"]);
      if (kind === "module") return (db?.modules ?? []).filter((m) => m && m.id).map((m) => ({ id: String(m.id), name: String(m.name ?? "(이름 없음)"), extra: "" }));
      return (db?.characters ?? []).filter((c) => c && c.chaId && c.type !== "group" && !c.trashTime).map((c) => ({ id: String(c.chaId), name: String(c.name ?? "(이름 없음)"), extra: "" }));
    },
    async add({ url, password = "", name, kind, target, files }) {
      const all = await loadLinks();
      if (all.length >= MAX_LINKS) throw new Error(`링크는 ${MAX_LINKS}개까지 둘 수 있어요.`);
      if (all.some((l) => l.url === url)) throw new Error("이미 연결해 둔 링크예요.");
      const l = normLink({ id: newId(), url, password, name: name || "", kind, target, files: snapshotOf((files ?? []).filter((f) => fitsKind(f.name, kind))), pending: [], latest: [], addedAt: Date.now(), checkedAt: Date.now() });
      all.push(l); await saveLinks(); return summary(l);
    },
    async relink(id, kind, target) {
      const l = await byId(id); l.kind = kind; l.target = target ? { id: String(target.id), name: String(target.name ?? "") } : null; l.pending = []; l.files = []; l.checkedAt = 0; await saveLinks(); return summary(l);
    },
    async rename(id, name) { const l = await byId(id); l.name = String(name || "").trim().slice(0, 80) || l.name; await saveLinks(); return summary(l); },
    async remove(id) {
      const all = await loadLinks(); const i = all.findIndex((l) => l.id === id); if (i < 0) return false;
      all.splice(i, 1); await saveLinks(); try { sessions?.drop(); } catch { /* 무시 */ } return true;
    },
    // 새 파일 확인. 처음 확인(files가 비어 있음)이면 지금 목록을 기준으로만 삼는다.
    async check(id, signal) {
      const l = await byId(id);
      try {
        const o = await open(l.url, l.password, signal);
        if (o.status !== "ready") throw new Error(o.status === "password" ? "비밀번호가 필요해요" : "비밀번호가 맞지 않아요");
        const now = await scan(o.share, signal);
        const rel = now.filter((f) => fitsKind(f.name, l.kind));
        if (!l.files.length && !l.checkedAt) l.pending = []; else l.pending = pendingOf(diffSnapshots(l.files, rel), l.kind);
        l.latest = rel; l.error = "";
        if (!l.files.length) l.files = rel;
      } catch (e) { if (signal?.aborted) throw e; l.error = errText(e); }
      l.checkedAt = Date.now(); await saveLinks(); return summary(l);
    },
    async checkAll(signal) {
      if (checking) return checking;
      checking = (async () => { const out = []; for (const l of [...await loadLinks()]) { if ((signal ?? ctl.signal).aborted) break; try { out.push(await api2.check(l.id, signal)); } catch { /* 중단 */ } } return out; })().finally(() => { checking = null; });
      return checking;
    },
    // 받아서 넘긴다: 캐릭터·모듈은 Dusk 업데이트 흐름(연결한 항목이 맨 위 후보), 플러그인은 파일로 저장. 받은 뒤 지금 목록을 기준으로 삼는다.
    async apply(id, { signal, onProgress, files: only } = {}) {
      const l = await byId(id);
      const o = await open(l.url, l.password, signal);
      if (o.status !== "ready") throw new Error(o.status === "password" ? "비밀번호가 필요해요" : "비밀번호가 맞지 않아요");
      let list = only?.length ? only : l.pending.length ? l.pending : fitFiles(l.latest.length ? l.latest : l.files, l.kind).slice(0, 1);
      if (!list.length) list = fitFiles(await scan(o.share, signal), l.kind).slice(0, 1);
      if (!list.length) throw new Error("받을 수 있는 파일이 없어요.");
      const got = [];
      for (const [i, f] of list.entries()) {
        if (typeof f.size === "number" && f.size > MAX_DL) throw new Error(`${f.name} 파일이 너무 커요(200MB 넘음).`);
        let bytes;
        try { bytes = await o.share.download({ uid: f.uid, name: f.name, type: "file", size: f.size, modifiedAt: f.modifiedAt }, { signal, onProgress: (n, total) => onProgress?.({ index: i, count: list.length, name: f.name, done: n, total }) }); }
        catch (e) { if (signal?.aborted) throw e; throw new Error(`${f.name}: ${errText(e)}`); }
        got.push({ name: f.name, bytes });
      }
      // 플러그인: 연결한 플러그인이 있고 코드를 바꿀 길(Dusk Cellar 플러그인 편집)이 있으면 바로 바꾼다. 없으면 파일로 저장(플러그인 api로는 목록에 쓸 수 없음).
      let updated = false;
      if (l.kind === "plugin") {
        const js = got.find((g) => /\.js$/i.test(g.name));
        if (js && l.target?.id && hooks.updatePlugin) {
          try { updated = !!(await hooks.updatePlugin(l.target.id, new TextDecoder().decode(js.bytes))); } catch (e) { l.error = `플러그인을 바로 바꾸지 못해 파일로 저장했어요: ${errText(e)}`; }
        }
        if (!updated) for (const g of got) await hooks.saveFile?.(g.name, g.bytes);
      }
      else {
        const files = got.map((g) => new File([g.bytes], g.name, { type: "application/octet-stream" }));
        if (!hooks.importFiles) throw new Error("이 환경에서는 가져오기 창을 열 수 없어요.");
        await hooks.importFiles(files, l.target ? { kind: l.kind, id: l.target.id } : undefined);
      }
      if (l.latest.length) l.files = l.latest;
      const warn = l.error.startsWith("플러그인을 바로") ? l.error : "";
      l.pending = []; l.error = warn;
      await saveLinks();
      return { names: got.map((g) => g.name), kind: l.kind, summary: summary(l), pluginUpdated: updated };
    },
    // 연결 없이 한 번만: 받아서 가져오기 창으로 넘긴다(대상은 가져오기 창에서 고른다)
    async once(url, password, files, { signal, onProgress } = {}) {
      const o = await open(url, password, signal);
      if (o.status !== "ready") throw new Error("링크를 열지 못했어요.");
      const got = [];
      for (const [i, f] of files.entries()) got.push(new File([await o.share.download({ uid: f.uid, name: f.name, type: "file", size: f.size, modifiedAt: f.modifiedAt }, { signal, onProgress: (n, total) => onProgress?.({ index: i, count: files.length, name: f.name, done: n, total }) })], f.name));
      const js = got.filter((f) => /\.js$/i.test(f.name)), rest = got.filter((f) => !js.includes(f));
      for (const f of js) await hooks.saveFile?.(f.name, new Uint8Array(await f.arrayBuffer()));
      if (rest.length) await hooks.importFiles?.(rest);
      return got.map((f) => f.name);
    },
    stop
  };
  // 시작 몇 초 뒤 한 번, 설정이 켜져 있을 때만 새 파일 확인(화면이 보일 때만)
  function schedule() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!onNow || !settings.check || !links?.length) return;
    timer = setTimeout(() => { timer = null; if (typeof document !== "undefined" && document.visibilityState === "hidden") return; api2.checkAll().then((r) => { try { hooks.onChecked?.(r); } catch { /* 무시 */ } }).catch(() => {}); }, startDelay);
  }
  async function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
    ctl.abort(); ctl = new AbortController(); links = null;
    try { sessions?.drop(); } catch { /* 무시 */ }
    return true;
  }
  return api2;
}
