// Dusk Cellar 그림 생성 (2.2.0, Cellar "sd" 기능): 에셋 제작(SDStudio 애드온)의 예약 그리기를 Cellar가 대신 한다.
// · Cellar가 NovelAI를 직접 부르므로 리스 창·앱을 닫아도 계속 그린다. 토큰은 Cellar가 메모리에만 둔다.
// · 결과 PNG는 Cellar가 리스 에셋 저장소에 'assets/<sha256>.png'로 바로 넣는다(리스 saveAsset과 같은 경로) →
//   플러그인은 보통 에셋처럼 읽고, 봇·모듈에 넣을 때 다시 올리지 않는다. 리스에 못 넣은 그림은 Cellar 사본(image)에서 읽는다.
// · 쓸 수 없으면(Cellar 없음·옛 버전·리스 세이브 폴더 모름) available()이 null → 지금처럼 플러그인이 그린다.
import { cellarRequest } from "./cellar.js";

const CHUNK = 100;   // 한 번에 보내는 예약 수(본문이 너무 커지지 않게)
const b64 = (u) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };

// 씬 본문들에서 모두 같은 큰 값(참고 그림·바이브 등)을 base로 빼서 한 번만 보낸다
export function hoistCommon(bodies, minLen = 2000) {
  if (bodies.length < 2) return { base: null, bodies };
  const first = bodies[0]?.parameters ?? {}, keys = [];
  for (const [k, v] of Object.entries(first)) {
    const s = JSON.stringify(v);
    if (s && s.length >= minLen && bodies.every((b) => JSON.stringify(b?.parameters?.[k]) === s)) keys.push(k);
  }
  if (!keys.length) return { base: null, bodies };
  const base = { parameters: Object.fromEntries(keys.map((k) => [k, first[k]])) };
  return { base, bodies: bodies.map((b) => { const p = { ...b.parameters }; for (const k of keys) delete p[k]; return { ...b, parameters: p }; }) };
}

export function createCellarSd(api, { cellar }) {
  const req = (conn, body, timeout = 30000) => cellarRequest(api, conn, "/cellar/sd", { method: "POST", body, timeout }).then(({ status, json }) => {
    if (status !== 200 || !json.ok) throw new Error(json.error ?? `응답 ${status}`);
    return json;
  });
  return {
    // 쓸 수 있으면 연결({url, via}), 아니면 null. 리스 에셋 저장소에 넣을 수 있어야(risu) 쓴다.
    async available() {
      try {
        const c = await cellar?.status?.();
        if (!c?.ok || c.retrying || !c.features?.includes("sd")) return null;
        const conn = { url: c.url, via: c.via };
        const st = await req(conn, { action: "status", since: Number.MAX_SAFE_INTEGER }, 10000);
        return st.risu ? conn : null;
      } catch { return null; }
    },
    // jobs: [{ id, body, meta }] → 공통 값을 빼고 CHUNK씩 보낸다
    async enqueue(conn, jobs, tokens) {
      const { base, bodies } = hoistCommon(jobs.map((j) => j.body));
      let last = null;
      for (let i = 0; i < jobs.length; i += CHUNK) {
        last = await req(conn, { action: "enqueue", tokens, base, jobs: jobs.slice(i, i + CHUNK).map((j, n) => ({ id: j.id, meta: j.meta, body: bodies[i + n] })) }, 120000);
      }
      return last;
    },
    // 빠른 넣기: 변환한 그림들을 리스 에셋 저장소에 50장씩 한 번에 넣는다(Cellar "assets"). 반환: 경로 배열(같은 순서) 또는 null(못 씀)
    async putAssets(items) {
      const c = await cellar?.status?.().catch(() => null);
      if (!c?.ok || c.retrying || !c.features?.includes("assets") || !globalThis.crypto?.subtle) return null;
      const conn = { url: c.url, via: c.via };
      const hex = async (u8) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", u8))].map((b) => b.toString(16).padStart(2, "0")).join("");
      const keys = [];
      for (const it of items) keys.push(`assets/${await hex(it.data)}.${String(it.ext).toLowerCase()}`);
      const ask = (body) => cellarRequest(api, conn, "/cellar/assets", { method: "POST", body, timeout: 120000 }).then(({ status, json }) => { if (status !== 200 || !json.ok) throw new Error(json.error ?? `응답 ${status}`); return json; });
      const { missing } = await ask({ action: "missing", keys });
      const need = new Set(missing), seen = new Set(), entries = [];
      items.forEach((it, i) => { if (need.has(keys[i]) && !seen.has(keys[i])) { seen.add(keys[i]); entries.push({ key: keys[i], value: b64(it.data) }); } });
      for (let i = 0; i < entries.length; i += 50) await ask({ action: "put", entries: entries.slice(i, i + 50) });
      return keys;
    },
    status: (conn, since = 0) => req(conn, { action: "status", since }, 15000),
    stop: (conn) => req(conn, { action: "stop" }),
    sync: (conn) => req(conn, { action: "sync" }, 120000),
    // Cellar에 남은 원본(리스에 못 넣었을 때). 반환: Uint8Array 또는 null
    async image(conn, path) {
      const m = /^assets\/([a-f0-9]{64})\.png$/.exec(String(path ?? ""));
      if (!m || !conn) return null;
      const url = `${conn.url}/cellar/sd/img/${m[1]}`;
      try {
        const res = conn.via === "fetch" ? await fetch(url, { cache: "no-store" }) : await api.nativeFetch(url, { method: "GET" });
        if (!res || res.status !== 200) return null;
        if (typeof res.arrayBuffer === "function") return new Uint8Array(await res.arrayBuffer());
        const b = res.body ?? res.data;
        return b instanceof Uint8Array ? b : b instanceof ArrayBuffer ? new Uint8Array(b) : null;
      } catch { return null; }
    },
  };
}
