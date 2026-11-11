// 리스를 켤 때 새 버전이 있으면 메인 화면 오른쪽 위에 작은 알림을 잠깐 띄운다(설정 → 업데이트 설정 → 업데이트 알림으로 끔) (닫기 버튼 · 자동으로 내려감)
const UPDATE_URL = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/main/dusk_atelier.js";
const SHOW_MS = 20000;
const newer = (a, b) => {
  const x = String(a).split(".").map((n) => parseInt(n, 10) || 0), y = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};
async function headText(res) {
  const rd = res.body?.getReader?.();
  if (!rd) return (await res.text()).slice(0, 2048);
  let out = "";
  const dec = new TextDecoder();
  try {
    while (out.length < 512) {
      const { done, value } = await rd.read();
      if (done) break;
      out += dec.decode(value, { stream: true });
    }
  } finally {
    rd.cancel().catch(() => {});
  }
  return out;
}
export async function latestVersion(api) {
  const url = `${UPDATE_URL}?t=${Math.floor(Date.now() / 60e3)}`, headers = { Range: "bytes=0-512" };
  let res = null;
  if (typeof api.nativeFetch === "function") res = await Promise.resolve().then(() => api.nativeFetch(url, { method: "GET", headers })).catch(() => null);
  if (!res || !(res.status >= 200 && res.status < 300)) res = await fetch(url, { headers, cache: "no-store" }).catch(() => null);
  if (!res || !(res.status >= 200 && res.status < 300)) return null;
  return /\/\/@version\s+(\S+)/.exec(await headText(res))?.[1] ?? null;
}
export async function showHostUpdateToast(api, v, { version }) {
  if (typeof api.getRootDocument !== "function") return false;
  if (typeof api.requestPluginPermission === "function" && !await api.requestPluginPermission("mainDom")) return false;
  const root = await api.getRootDocument();
  if (!root) return false;
  for (let i = 0; i < 3; i++) { const old = await root.querySelector('[x-dusk-update-toast="1"]'); if (!old) break; await old.remove(); }
  const host = await root.querySelector("body") || root;
  const wrap = await root.createElement("div");
  await wrap.setAttribute("x-dusk-update-toast", "1");
  await wrap.setStyleAttribute("position:fixed;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));z-index:9999;width:min(300px,calc(100vw - 24px));box-sizing:border-box;padding:9px 10px 9px 12px;border-radius:12px;border:1px solid #6a43d6;background:linear-gradient(135deg,#1b1930,#26204a);box-shadow:0 8px 24px rgba(0,0,0,.45);color:#ecebf6;font-family:inherit;transform:translateY(-12px);opacity:0;transition:transform .35s ease,opacity .35s ease;");
  const row = await root.createElement("div");
  await row.setStyleAttribute("display:flex;align-items:center;gap:9px;");
  const ic = await root.createElement("div");
  await ic.setTextContent("⬇");
  await ic.setStyleAttribute("flex:none;width:24px;height:24px;line-height:24px;text-align:center;border-radius:7px;background:linear-gradient(135deg,#4f7cf7,#7c5cf0);font-size:13px;font-weight:800;color:#fff;");
  const col = await root.createElement("div");
  await col.setStyleAttribute("flex:1;min-width:0;");
  const t = await root.createElement("div");
  await t.setTextContent(`Dusk 새 버전 v${v}`);
  await t.setStyleAttribute("font-size:13px;font-weight:800;line-height:1.3;");
  const d = await root.createElement("div");
  await d.setTextContent(`지금 v${version} · 설정 → 플러그인에서 Dusk 옆 + 로 업데이트`);
  await d.setStyleAttribute("margin-top:1px;font-size:11.5px;line-height:1.4;color:#c9c6e3;word-break:keep-all;");
  const x = await root.createElement("button");
  await x.setTextContent("✕");
  await x.setAttribute("x-dusk-update-close", "1");
  await x.setStyleAttribute("flex:none;border:0;background:transparent;color:#9d99c1;font-size:14px;line-height:1;cursor:pointer;padding:2px 3px;");
  await col.appendChild(t); await col.appendChild(d);
  await row.appendChild(ic); await row.appendChild(col); await row.appendChild(x);
  await wrap.appendChild(row);
  await host.appendChild(wrap);
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      await wrap.setStyleAttribute("position:fixed;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));z-index:9999;width:min(300px,calc(100vw - 24px));box-sizing:border-box;padding:9px 10px 9px 12px;border-radius:12px;border:1px solid #6a43d6;background:#1b1930;color:#ecebf6;transform:translateY(-12px);opacity:0;transition:transform .35s ease,opacity .35s ease;pointer-events:none;");
      setTimeout(() => wrap.remove().catch(() => {}), 450);
    } catch {}
  };
  await x.addEventListener("click", close);
  await wrap.addEventListener("click", close);
  setTimeout(() => wrap.setStyleAttribute("position:fixed;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));z-index:9999;width:min(300px,calc(100vw - 24px));box-sizing:border-box;padding:9px 10px 9px 12px;border-radius:12px;border:1px solid #6a43d6;background:linear-gradient(135deg,#1b1930,#26204a);box-shadow:0 8px 24px rgba(0,0,0,.45);color:#ecebf6;font-family:inherit;transform:none;opacity:1;transition:transform .35s ease,opacity .35s ease;").catch(() => {}), 60);
  setTimeout(close, SHOW_MS);
  return true;
}
export async function startHostUpdateToast(api, { version, log = () => {} }) {
  if (!version || version === "dev") return;
  const v = await latestVersion(api);
  if (!v || !newer(v, version)) return;
  await showHostUpdateToast(api, v, { version }).catch((e) => log(`업데이트 알림 실패: ${e?.message ?? e}`));
}
