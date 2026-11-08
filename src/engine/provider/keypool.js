// 키 풀 (v1.9.3, 순수): 여러 키 중 하나를 고르고, 실패한 키는 잠시 쉰다.
export function createKeyPool(keys, { mode = "random", now = () => Date.now(), rand = Math.random } = {}) {
  const list = [...new Set((keys ?? []).map((k) => String(k).trim()).filter(Boolean))];
  const cool = new Map(); let turn = 0, cur = 0; const affinity = new Map();
  const ready = (k) => (cool.get(k) ?? 0) <= now();
  return {
    size: () => list.length,
    ready: () => list.filter(ready).length,
    pick(affKey = "") {
      const live = list.filter(ready);
      if (!live.length) return null;
      if (mode === "affinity" && affKey) { const a = affinity.get(affKey); if (a && live.includes(a)) return a; const k = live[Math.floor(rand() * live.length)]; affinity.set(affKey, k); return k; }
      if (mode === "on-error") { for (let i = 0; i < list.length; i++) { const k = list[(cur + i) % list.length]; if (ready(k)) { cur = (cur + i) % list.length; return k; } } return null; }
      if (mode === "rotate") return live[turn++ % live.length];
      return live[Math.floor(rand() * live.length)];
    },
    fail(k, { ms = 60000 } = {}) { cool.set(k, now() + ms); if (mode === "on-error" && list[cur] === k) cur = (cur + 1) % list.length; for (const [a, v] of affinity) if (v === k) affinity.delete(a); },
    ok(k) { cool.delete(k); },
    nextReadyIn() { if (!list.length) return 0; const t = Math.min(...list.map((k) => cool.get(k) ?? 0)); return Math.max(0, t - now()); }
  };
}
