// 리스를 켤 때 새 버전이 있으면 메인 화면 오른쪽 위에 큰 알림 카드를 잠깐 띄운다 (닫기 버튼 · 자동으로 내려감)
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
  await wrap.setStyleAttribute("position:fixed;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));z-index:9999;width:min(420px,calc(100vw - 28px));box-sizing:border-box;padding:18px 20px 16px;border-radius:16px;border:1px solid #6a43d6;background:linear-gradient(135deg,#1b1930,#26204a);box-shadow:0 14px 40px rgba(0,0,0,.55);color:#ecebf6;font-family:inherit;transform:translateY(-24px);opacity:0;transition:transform .35s ease,opacity .35s ease;");
  const row = await root.createElement("div");
  await row.setStyleAttribute("display:flex;align-items:flex-start;gap:12px;");
  const ic = await root.createElement("div");
  await ic.setTextContent("⬇");
  await ic.setStyleAttribute("flex:none;width:40px;height:40px;line-height:40px;text-align:center;border-radius:12px;background:linear-gradient(135deg,#4f7cf7,#7c5cf0);font-size:20px;font-weight:800;color:#fff;");
  const col = await root.createElement("div");
  await col.setStyleAttribute("flex:1;min-width:0;");
  const t = await root.createElement("div");
  await t.setTextContent(`Dusk Atelier 새 버전 v${v}`);
  await t.setStyleAttribute("font-size:17px;font-weight:800;line-height:1.35;");
  const d = await root.createElement("div");
  await d.setTextContent(`지금 v${version}을 쓰고 있어요. 설정 → 플러그인에서 Dusk Atelier 옆 초록색 + 버튼을 눌러 업데이트해 주세요.`);
  await d.setStyleAttribute("margin-top:6px;font-size:14px;line-height:1.6;color:#c9c6e3;word-break:keep-all;");
  const x = await root.createElement("button");
  await x.setTextContent("✕");
  await x.setAttribute("x-dusk-update-close", "1");
  await x.setStyleAttribute("flex:none;border:0;background:transparent;color:#9d99c1;font-size:18px;line-height:1;cursor:pointer;padding:2px 4px;");
  await col.appendChild(t); await col.appendChild(d);
  await row.appendChild(ic); await row.appendChild(col); await row.appendChild(x);
  await wrap.appendChild(row);
  await host.appendChild(wrap);
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      await wrap.setStyleAttribute("position:fixed;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));z-index:9999;width:min(420px,calc(100vw - 28px));box-sizing:border-box;padding:18px 20px 16px;border-radius:16px;border:1px solid #6a43d6;background:#1b1930;color:#ecebf6;transform:translateY(-24px);opacity:0;transition:transform .35s ease,opacity .35s ease;pointer-events:none;");
      setTimeout(() => wrap.remove().catch(() => {}), 450);
    } catch {}
  };
  await x.addEventListener("click", close);
  await wrap.addEventListener("click", close);
  setTimeout(() => wrap.setStyleAttribute("position:fixed;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));z-index:9999;width:min(420px,calc(100vw - 28px));box-sizing:border-box;padding:18px 20px 16px;border-radius:16px;border:1px solid #6a43d6;background:linear-gradient(135deg,#1b1930,#26204a);box-shadow:0 14px 40px rgba(0,0,0,.55);color:#ecebf6;font-family:inherit;transform:none;opacity:1;transition:transform .35s ease,opacity .35s ease;").catch(() => {}), 60);
  setTimeout(close, SHOW_MS);
  return true;
}
export async function startHostUpdateToast(api, { version, log = () => {} }) {
  if (!version || version === "dev") return;
  const v = await latestVersion(api);
  if (!v || !newer(v, version)) return;
  await showHostUpdateToast(api, v, { version }).catch((e) => log(`업데이트 알림 실패: ${e?.message ?? e}`));
}
