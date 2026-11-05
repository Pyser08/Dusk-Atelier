// 리스와 같은 CSP iframe 안에서 실제 import(blob:)·sha256으로 애드온을 받고 켜는지 본다. run-addon-loader.mjs가 쓴다.
import { createAddons } from "../../src/data/addons.js";
window.runAddonLoader = async ({ manifest, files }) => {
  const out = {}, kv = new Map(), calls = [];
  const store = { getItem: async (k) => kv.get(k) ?? null, setItem: async (k, v) => { kv.set(k, v); }, removeItem: async (k) => { kv.delete(k); } };
  const api = { getLocalPluginStorage: async () => store, pluginStorage: store,   // 실제 호스트처럼 Promise
    nativeFetch: async (url, init) => { calls.push(["fetch", init?.method]); const body = url.endsWith("addons.json") ? manifest : files[url]; return body == null ? { ok: false, status: 404 } : { ok: true, status: 200, text: async () => body }; },
    registerButton: async (o, cb) => { calls.push(["button", o.name]); window.__cb = cb; return "b1"; }, unregisterUIPart: (id) => calls.push(["unreg", id]) };
  const toasts = [];
  try { eval("1"); out.evalBlocked = false; } catch { out.evalBlocked = true; }
  const A = createAddons(api, { core: "2.0.0", ctx: { toast: (t) => { toasts.push(t); return document.createElement("div"); } }, log: (m) => toasts.push("log:" + m) });
  try { await A.install("hello"); out.installed = A.running("hello"); } catch (e) { out.err = String(e?.message ?? e); }
  out.button = calls.some((c) => c[0] === "button");
  // 호스트는 콜백 반환값을 postMessage로 복제한다 → 복제할 수 있어야 함
  try { structuredClone(await window.__cb?.()); out.cbCloneable = true; } catch (e) { out.cbCloneable = false; out.err = "콜백 반환값 복제 불가 " + e.message; }
  out.getMethod = calls.filter((c) => c[0] === "fetch").every((c) => c[1] === "GET");
  await A.dispose(); out.unreg = calls.some((c) => c[0] === "unreg");
  calls.length = 0; await A.boot(); out.rebooted = A.running("hello") && calls.some((c) => c[0] === "button");
  out.toasts = toasts;
  return out;
};
