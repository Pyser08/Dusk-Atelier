// 봇빌더(risu_story_workshop) 연동 (v1.8.1): 설치·연동판 감지, 화면 열기, 인계 저장, 돌아왔을 때 원고 읽기.
//   · 연동판(DA Interop 동작 open·draft가 들어간 봇빌더)이면 Dusk가 화면을 직접 열고 작업 중인 원고를 받아 온다.
//   · 원본 봇빌더면 열기는 사용자가 리스 메뉴에서 하고, 원고는 봇빌더의 자동 저장(공용 pluginStorage)에서 읽는다.
// 화면 코드 없음. 공식 플러그인 API(getDatabase·pluginStorage)만 쓴다.
import { WORKSHOP_INTEROP_ID, WORKSHOP_PLUGIN, makeHandoff, handoffAlive } from "../engine/workshop.js";
import { isBbName } from "../engine/firstrun.js";
import { readInterop, hasAction, runAction } from "./plugins.js";
import { isPatchedWorkshop, patchWorkshop } from "./workshoppatch.js";

export const HANDOFF_KEY = "dusk.workshop.handoff.v1";
export const WS_PREFIX = "risu-character-editor:v1:";      // 봇빌더 저장 키 접두어 (봇빌더 소스의 PREFIX)
const SLOTS = ["autosave", "autosave-1", "autosave-2", "manual"];
const parse = (raw) => { try { return raw == null || raw === "" ? null : typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; } };
const isWs = (p) => p && (p.name === WORKSHOP_PLUGIN || isBbName(p.name) || isBbName(p.displayName));

export function createWorkshopLink(api) {
  const ps = api.pluginStorage;
  async function plugin() {
    const db = await api.getDatabase(["plugins"]);
    return (Array.isArray(db?.plugins) ? db.plugins : []).find(isWs) ?? null;
  }
  // { installed, enabled, patched, linked(동작 open 등록됨), version }
  async function status() {
    const p = await plugin();
    if (!p) return { installed: false, enabled: false, patched: false, linked: false, version: "" };
    const patched = isPatchedWorkshop(p.script);
    const reg = patched ? await readInterop(api, WORKSHOP_INTEROP_ID).catch(() => null) : null;
    return { installed: true, enabled: p.enabled !== false, patched, linked: patched && hasAction(reg, "open"), version: String(p.versionOfPlugin ?? "") };
  }
  // 설치된 원본 봇빌더 스크립트로 연동판을 만든다 (원본은 바꾸지 않는다)
  async function patchedScript() {
    const p = await plugin();
    if (!p?.script) throw new Error("설치된 봇빌더 스크립트를 읽지 못했어요.");
    return patchWorkshop(p.script);
  }
  const open = () => runAction(api, WORKSHOP_INTEROP_ID, "open", null, 5000);
  async function saveHandoff(chars, mode) { const h = { ...makeHandoff(chars), mode }; await ps.setItem(HANDOFF_KEY, JSON.stringify(h)); return h; }
  const readHandoff = async () => parse(await ps.getItem(HANDOFF_KEY));
  const clearHandoff = () => (ps.removeItem ? ps.removeItem(HANDOFF_KEY) : ps.setItem(HANDOFF_KEY, ""));
  // 원고: 연동판이면 지금 화면의 원고, 아니면 인계 뒤에 저장된 가장 최근 저장본
  async function readDraft(h, { linked = false } = {}) {
    if (linked) {
      const r = await runAction(api, WORKSHOP_INTEROP_ID, "draft", null, 3000).catch(() => null);
      if (r?.ok) return r.result ?? null;
    }
    let best = null;
    for (const k of SLOTS) {
      const v = parse(await ps.getItem(WS_PREFIX + k).catch(() => null));
      const t = Date.parse(v?.savedAt ?? "");
      if (!v?.session?.draft || !Number.isFinite(t) || t < (Number(h?.at) || 0) - 5000) continue;
      if (!best || t > best.t) best = { t, v };
    }
    return best ? { name: String(best.v.name ?? best.v.session.draft.name ?? ""), targetId: best.v.session.targetId ?? null, started: true, savedAt: best.v.savedAt, draft: best.v.session.draft, fromSave: true } : null;
  }
  return { status, patchedScript, open, saveHandoff, readHandoff, clearHandoff, readDraft, alive: handoffAlive };
}
