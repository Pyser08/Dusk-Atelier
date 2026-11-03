// Dusk Cellar 새 버전 알림 (1.9.0). Cellar가 연결돼 있을 때만, GitHub 최신 릴리스 번호를 읽어 지금 버전과 비교한다.
// 서버가 git으로 설치됐든 아니든 알 수 있다(적용은 '업데이트 확인' 버튼 또는 설치 파일 다시 실행).
const API = "https://api.github.com/repos/Pyser08/Dusk-Cellar/releases/latest";
export const CELLAR_NOTIFIED_KEY = "dusk.cellar.notified";

export const semverNewer = (a, b) => {
  const n = (v) => String(v).replace(/^v/i, "").split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const x = n(a), y = n(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};

export async function latestCellarVersion(api) {
  const headers = { Accept: "application/vnd.github+json" };
  let res = null;
  if (typeof api.nativeFetch === "function") res = await Promise.resolve().then(() => api.nativeFetch(API, { method: "GET", headers })).catch(() => null);
  if (!res || !(res.status >= 200 && res.status < 300)) res = await fetch(API, { headers, cache: "no-store" }).catch(() => null);
  if (!res || !(res.status >= 200 && res.status < 300)) return null;
  const j = await res.json().catch(() => null);
  const tag = typeof j?.tag_name === "string" ? j.tag_name.replace(/^v/i, "") : null;
  return tag && /^\d+(\.\d+)*$/.test(tag) ? tag : null;
}

// 반환: 새 버전 번호(없으면 null). 같은 버전은 알림을 한 번만(toast) 띄운다.
export async function checkCellarUpdate(api, cel, { toast = () => {}, latest = latestCellarVersion } = {}) {
  const st = await cel.status().catch(() => null);
  if (!st?.ok || !st.version) return null;
  const v = await latest(api).catch(() => null);
  if (!v || !semverNewer(v, st.version)) return null;
  let seen = null;
  try { seen = await api.pluginStorage.getItem(CELLAR_NOTIFIED_KEY); } catch { /* 저장소 없음 */ }
  if (seen !== v) {
    toast(`Dusk Cellar 새 버전 v${v}이 나왔어요 (지금 v${st.version}). 설정 → 서버 → Dusk Cellar에서 '업데이트 확인'을 눌러 주세요.`);
    try { await api.pluginStorage.setItem(CELLAR_NOTIFIED_KEY, v); } catch { /* 저장 못 해도 다음에 다시 알릴 뿐 */ }
  }
  return v;
}
