import { erosyncSection } from "../../src/ui/screens/memory/erosyncui.js";
import { createErosync } from "../../src/data/erosync.js";
window.makeCase = (opts = {}) => {
  const mem = new Map(), toasts = [], boots = { n: 0, off: 0 };
  const api = { pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } }, addRisuReplacer: opts.noHook ? undefined : async () => {}, getDatabase: async () => ({ plugins: opts.original ? [{ name: "erosync", enabled: true }] : [] }) };
  const er = createErosync(api, { boot: async () => { boots.n++; return { loaded: () => true, dispose: async () => { boots.off++; } }; } });
  const ctx = { erosync: er, memory: opts.cycle ? { flow: { settings: async () => ({ rawSnapshot: () => ({ features: { openness: { cycle: true } }, sexualDesireEnabled: true }) }) } } : undefined, toast: (t, o) => toasts.push([t, !!o?.error]) };
  document.body.replaceChildren(erosyncSection(ctx));
  return { mem, toasts, boots, er };
};
