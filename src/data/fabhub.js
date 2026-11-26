// 떠 있는 버튼 막대(코어). 장기기억(인물 관계도·채팅 옮기기)·Dusk Saga(전투·가방) 같은 애드온이 칸을 붙인다.
// 칸이 하나도 없으면 아무것도 그리지 않는다. 리스 화면 권한(mainDom)이 없으면 add()가 false를 알려 부른 쪽이 예전 방식(리스 버튼)으로 간다.
// 칸: { key, title, open, icon?, order? } — order가 작을수록 위(장기기억 10·20, Saga 30·40)
import { createDock } from "./fabdock.js";

export function createFabHub(api, { log = () => {} } = {}) {
  let doc = null, denied = false, job = null; const items = new Map(); let seq = 0, dock = null, q = Promise.resolve();
  const serial = (fn) => { const p = q.then(fn, fn); q = p.catch(() => {}); return p; };
  const ensureDoc = async () => {
    if (doc) return doc; if (denied || typeof api.getRootDocument !== "function") return null;
    return (job ??= (async () => { try { if (typeof api.requestPluginPermission === "function" && !(await api.requestPluginPermission("mainDom"))) { denied = true; return null; } doc = await api.getRootDocument(); return doc; } catch { return null; } finally { job = null; } })());
  };
  const list = () => [...items.values()].sort((a, b) => (a.order ?? 50) - (b.order ?? 50) || a.n - b.n);
  const sync = () => serial(async () => {
    const l = list(); if (!l.length) { if (dock) await dock.hide(); return true; }
    if (!(await ensureDoc())) return false;
    if (!dock) dock = createDock(api, { ensureDoc, items: l, log, posKey: "dusk.ui.fabPos", tag: "fab" });
    await dock.setItems(l); if (!dock.isOn()) return dock.show(); return true;
  });
  return {
    /** 칸 붙이기 → 떼기 함수(붙일 수 없으면 null: 권한 없음 등) */
    async add(item) { if (!item?.key || typeof item.open !== "function") return null; const id = ++seq; items.set(id, { ...item, n: id }); const ok = await sync(); if (!ok) { items.delete(id); return null; } return async () => { if (items.delete(id)) await sync(); }; },
    has: (key) => [...items.values()].some((x) => x.key === key),
    ready: async () => !!(await ensureDoc()),
    setLook: (look) => serial(async () => (dock ? dock.setLook(look) : false)),
    hide: () => serial(async () => { if (dock) await dock.hide(); }),
  };
}
