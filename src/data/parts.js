// Dusk Atelier 파츠 목록. 파츠 자체의 설치·교체는 RisuAI 플러그인 화면에서 한다.
var MANIFEST_URL = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/test/parts-updates/parts/manifest.json";

async function readJsonResponse(res) {
  if (!res || !(res.status >= 200 && res.status < 300)) throw new Error(`HTTP ${res?.status ?? "?"}`);
  return await res.json();
}

export async function loadPartManifest(api) {
  const url = `${MANIFEST_URL}?t=${Math.floor(Date.now() / 6e4)}`;
  let res = null;
  if (typeof api.nativeFetch === "function") res = await Promise.resolve().then(() => api.nativeFetch(url, { method: "GET", cache: "no-store" })).catch(() => null);
  if (!res) res = await fetch(url, { cache: "no-store" }).catch(() => null);
  const raw = await readJsonResponse(res);
  if (!raw || raw.schemaVersion !== 1 || !Array.isArray(raw.parts)) throw new Error("파츠 manifest 형식이 올바르지 않아요");
  return raw.parts.filter((p) => p && p.id && p.displayName).map((p) => ({ id: String(p.id), displayName: String(p.displayName), version: String(p.version ?? ""), pluginUrl: String(p.pluginUrl ?? ""), enabled: p.enabled !== false, description: String(p.description ?? "") }));
}

export function partStatus(part, installed) {
  const p = installed.find((x) => x.name === part.id);
  if (!p) return { label: "설치 안 됨", kind: "mute", installed: null };
  if (!p.enabled) return { label: "꺼짐", kind: "warn", installed: p };
  if (part.version && p.version && part.version !== p.version) return { label: `설치됨 v${p.version}`, kind: "acc", installed: p };
  return { label: `설치됨 v${p.version || "?"}`, kind: "acc2", installed: p };
}
