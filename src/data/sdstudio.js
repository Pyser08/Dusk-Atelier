// SDStudio 이식(애드온 sdstudio 전용): NovelAI 토큰 보관·이미지 생성 요청·에셋 저장. 코어가 import하지 않음.
// - 토큰: getLocalPluginStorage에만(서버형 호스트의 공용 pluginStorage엔 안 넣음). 없으면 이 창이 닫힐 때까지 메모리.
// - 전송: nativeFetch(method 꼭 적기) → 안 되면 fetch. 응답 바디는 ReadableStream·ArrayBuffer·Uint8Array 어느 꼴이든 받는다.
// - zip 풀기는 Response/fetch에 기대지 않는다(RisuBard에서 new Response(stream)이 'Failed to fetch'로 깨짐 — 0단계 시험).
// - IndexedDB는 플러그인 칸에서 막혀 있어(RisuBard) 이미지는 api.saveAsset으로만 저장한다.
// - 생성은 AI 호출이라 trackAi로 세서 '생성 중지' 버튼에 잡힌다.
import { inflateSync } from "../vendor/fflate.js";
import { trackAi, justStopped, stopError } from "../engine/aistop.js";
import { buildGenerateBody, readZipFirst, isPng } from "../engine/sdstudio/nai.js";
import { normalizeProject } from "../engine/sdstudio/project.js";

export var NAI_IMAGE = "https://image.novelai.net";
var TOKEN_KEY = "dusk.sdstudio.token";
var projKey = (chaId) => `dusk.sdstudio.p.${chaId}`;   // 봇별 작업 묶음(캐릭터·폴더·만든 이미지 경로) — pluginStorage(공용, 서버형 호스트에서도 이어짐)

async function bodyBytes(res) {
  if (res instanceof Uint8Array) return res;
  if (res instanceof ArrayBuffer) return new Uint8Array(res);
  const b = res?.body;
  if (b instanceof Uint8Array) return b;
  if (b instanceof ArrayBuffer) return new Uint8Array(b);
  if (b && typeof b.getReader === "function") {
    const rd = b.getReader(), parts = []; let n = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); n += value.length; }
    const out = new Uint8Array(n); let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  if (typeof res?.arrayBuffer === "function") return new Uint8Array(await res.arrayBuffer());
  if (typeof res?.text === "function") return new TextEncoder().encode(await res.text());
  if (typeof b === "string") return new TextEncoder().encode(b);
  throw new Error("응답을 읽지 못했어요");
}
function errorText(status, bytes) {
  let msg = "";
  try { const t = new TextDecoder().decode(bytes.subarray(0, 2000)); try { msg = JSON.parse(t)?.message ?? t; } catch { msg = t; } } catch { /* 본문 없음 */ }
  if (status === 401) return "토큰이 맞지 않아요. 토큰을 다시 넣어 주세요";
  if (status === 402) return "Anlas가 모자라거나 구독이 필요해요";
  if (status === 429) return "요청이 너무 잦아요. 잠시 뒤 다시 해 주세요";
  return `NovelAI 오류 ${status}${msg ? `: ${String(msg).slice(0, 200)}` : ""}`;
}

export function createSdStudio(api) {
  let mem = "";
  const local = async () => { try { return (await api.getLocalPluginStorage?.()) ?? null; } catch { return null; } };
  // nativeFetch에는 signal을 넘기지 않는다(호스트로 복제가 안 됨) — 중지는 trackAi.race가 맡는다
  const send = async (url, init, signal) => {
    if (typeof api.nativeFetch === "function") {
      try { return await api.nativeFetch(url, init); } catch (e) { if (typeof fetch !== "function") throw e; }
    }
    return fetch(url, { ...init, signal });
  };
  return {
    async loadProject(chaId) {
      try { const v = await api.pluginStorage?.getItem(projKey(chaId)); return normalizeProject(v ? (typeof v === "string" ? JSON.parse(v) : v) : null); } catch { return normalizeProject(null); }
    },
    async saveProject(chaId, p) { await api.pluginStorage?.setItem(projKey(chaId), JSON.stringify(p)); },
    async getToken() {
      const s = await local();
      try { const v = await s?.getItem?.(TOKEN_KEY); if (v) return String(v); } catch { /* 로컬 저장소 없음 */ }
      return mem;
    },
    async setToken(v) {
      mem = String(v ?? "").trim();
      const s = await local();
      try { await s?.setItem?.(TOKEN_KEY, mem); } catch { /* 로컬 저장소 없음 — 메모리만 */ }
    },
    // 한 장 만들기 → { data: Uint8Array(PNG), seed }. 중지되면 isStopError인 오류.
    async generate(opts, signal) {
      if (justStopped()) throw stopError();
      const token = await this.getToken();
      if (!token) throw new Error("NovelAI 토큰을 먼저 넣어 주세요");
      const body = buildGenerateBody(opts);
      const t = trackAi("sdstudio", signal);
      try {
        return await t.race((async () => {
          const res = await send(`${NAI_IMAGE}/ai/generate-image`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/zip" }, body: JSON.stringify(body) }, t.signal);
          const bytes = await bodyBytes(res);
          if ((res?.status ?? 200) >= 400) throw new Error(errorText(res.status, bytes));
          const { data } = readZipFirst(bytes, inflateSync);
          if (!isPng(data)) throw new Error("받은 그림이 PNG가 아니에요");
          return { data, seed: body.parameters.seed };
        })());
      } finally { t.end(); }
    },
    // 호스트 에셋 저장(실패하면 두 번 더). 경로(assets/<해시>.png)를 돌려준다.
    async saveAsset(data) {
      if (typeof api.saveAsset !== "function") throw new Error("이 리스에서는 에셋을 저장할 수 없어요");
      let err;
      for (let i = 0; i < 3; i++) {
        try { const p = await api.saveAsset(data.slice()); if (p) return p; } catch (e) { err = e; }
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }
      throw new Error(`에셋을 저장하지 못했어요: ${err?.message ?? err ?? "경로 없음"}`);
    }
  };
}
