// 프로바이더 키 보관 (v1.9.3): 로컬 저장소에만 둔다(기기 간 동기화·내보내기 없음). 값은 로그·오류에 남기지 않는다.
const KEY = "dusk.prov.keys.v1";
const uid = () => `k${Math.random().toString(36).slice(2, 10)}`;
export const tailOf = (v) => (v && v.length > 8 ? `…${v.slice(-4)}` : v ? "••••" : "");
export function createKeyVault(api) {
  let data = null, loading = null;
  async function backend() {
    if (typeof api.getLocalPluginStorage === "function") { const s = await api.getLocalPluginStorage(); if (s?.getItem && s?.setItem) return { read: async () => s.getItem(KEY), write: async (v) => s.setItem(KEY, v) }; }
    const l = api.safeLocalStorage; if (l?.getItem && l?.setItem) return { read: async () => l.getItem(KEY), write: async (v) => l.setItem(KEY, JSON.stringify(v)) };
    return null;
  }
  let be = null;
  async function load() {
    if (data) return data;
    return (loading ??= (async () => {
      be = await backend(); let raw = be ? await be.read() : null;
      if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = null; } }
      data = raw && typeof raw === "object" && raw.keys && typeof raw.keys === "object" ? { v: 1, keys: raw.keys } : { v: 1, keys: {} };
      return data;
    })().finally(() => { loading = null; }));
  }
  const save = async () => { if (!be) throw new Error("키를 안전하게 저장할 곳이 없어요(로컬 저장소 사용 불가)"); await be.write(data); };
  return {
    available: async () => { await load(); return !!be; },
    async list() { const d = await load(); return Object.entries(d.keys).map(([id, k]) => ({ id, label: k.label, tail: tailOf(k.value) })); },
    async add(label, value) { const d = await load(); const v = String(value ?? "").trim(); if (!v || /[\r\n\u0000]/.test(v) && !v.startsWith("{")) throw new Error("키 값을 확인해 주세요"); const id = uid(); d.keys[id] = { label: String(label || "키").slice(0, 40), value: v }; await save(); return id; },
    async rename(id, label) { const d = await load(); if (d.keys[id]) { d.keys[id].label = String(label).slice(0, 40); await save(); } },
    async remove(id) { const d = await load(); if (d.keys[id]) { delete d.keys[id]; await save(); } },
    async values(ids) { const d = await load(); return (ids ?? []).map((i) => d.keys[i]?.value).filter(Boolean); },
    async has(id) { const d = await load(); return !!d.keys[id]; }
  };
}
