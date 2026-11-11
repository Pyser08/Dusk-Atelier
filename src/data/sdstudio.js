// SDStudio 이식(애드온 sdstudio 전용): NovelAI 호출·토큰·작업 묶음 저장·프리셋. 코어가 import하지 않음.
// - 토큰: getLocalPluginStorage에만(서버형 호스트의 공용 pluginStorage엔 안 넣음). 없으면 이 창이 닫힐 때까지 메모리.
// - 전송: nativeFetch(method 꼭 적기, signal은 안 넘김 — 호스트로 복제 안 됨) → 안 되면 fetch. 바디는 ReadableStream·ArrayBuffer·Uint8Array 어느 꼴이든.
// - zip 풀기는 Response/fetch에 기대지 않는다(RisuBard에서 new Response(stream)이 'Failed to fetch' — 0단계 시험).
// - IndexedDB는 플러그인 칸에서 막혀 있어(RisuBard) 그림은 api.saveAsset으로만 저장한다.
// - 모든 NAI 호출은 AI 호출이라 trackAi로 세서 '생성 중지' 버튼에 잡힌다.
import { inflateSync } from "../vendor/fflate.js";
import { trackAi, justStopped, stopError } from "../engine/aistop.js";
import { readZipFirst, isPng, buildGenerateBody } from "../engine/sdstudio/nai.js";
import { normalizeProject } from "../engine/sdstudio/project.js";

export var NAI_IMAGE = "https://image.novelai.net";
var TOKEN_KEY = "dusk.sdstudio.token";
var PRESET_KEY = "dusk.sdstudio.presets";
// 봇: dusk.sdstudio.p.<chaId>(예전 그대로) · 모듈: dusk.sdstudio.m.<id>
export var projectKey = (target) => (target?.kind === "module" ? `dusk.sdstudio.m.${target.id}` : `dusk.sdstudio.p.${target?.id}`);

export function toB64(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromB64(b64) {
  const bin = atob(String(b64 ?? "").replace(/^data:[^,]*,/, ""));
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
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
  const send = async (url, init, signal) => {
    if (typeof api.nativeFetch === "function") {
      try { return await api.nativeFetch(url, init); } catch (e) { if (typeof fetch !== "function") throw e; }
    }
    return fetch(url, { ...init, signal });
  };
  const store = () => api.pluginStorage;
  const keyOf = (target) => (typeof target === "string" ? `dusk.sdstudio.p.${target}` : projectKey(target));
  return {
    async loadProject(target) {
      try { const v = await store()?.getItem(keyOf(target)); return normalizeProject(v ? (typeof v === "string" ? JSON.parse(v) : v) : null); } catch { return normalizeProject(null); }
    },
    async saveProject(target, p) { await store()?.setItem(keyOf(target), JSON.stringify(p)); },
    async loadPresets() { try { const v = await store()?.getItem(PRESET_KEY); const a = v ? (typeof v === "string" ? JSON.parse(v) : v) : []; return Array.isArray(a) ? a : []; } catch { return []; } },
    async savePresets(list) { await store()?.setItem(PRESET_KEY, JSON.stringify(list)); },
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
    // NAI POST 하나 → 받은 바이트. label은 생성 중지 버튼이 세는 이름
    async call(path, body, { signal, label = "sdstudio", zip = true } = {}) {
      if (justStopped()) throw stopError();
      const token = await this.getToken();
      if (!token) throw new Error("NovelAI 토큰을 먼저 넣어 주세요");
      const t = trackAi(label, signal);
      try {
        return await t.race((async () => {
          const res = await send(`${NAI_IMAGE}${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: zip ? "application/zip" : "*/*" }, body: JSON.stringify(body) }, t.signal);
          const bytes = await bodyBytes(res);
          if ((res?.status ?? 200) >= 400) throw new Error(errorText(res.status, bytes));
          return bytes;
        })());
      } finally { t.end(); }
    },
    // 생성·변형·인페인트 → PNG 바이트
    async image(body, opts) {
      const { data } = readZipFirst(await this.call("/ai/generate-image", body, opts), inflateSync);
      if (!isPng(data)) throw new Error("받은 그림이 PNG가 아니에요");
      return data;
    },
    async augment(body, opts) { return readZipFirst(await this.call("/ai/augment-image", body, opts), inflateSync, { last: true }).data; },
    async upscale(body, opts) {
      const { data } = readZipFirst(await this.call("/ai/upscale", body, opts), inflateSync);
      if (!isPng(data)) throw new Error("업스케일 결과가 PNG가 아니에요");
      return data;
    },
    async encodeVibe(body, opts) { return toB64(await this.call("/ai/encode-vibe", body, { ...opts, zip: false })); },
    // 한 장 생성(간단 호출) → { data, seed }
    async generate(opts, signal) {
      const body = buildGenerateBody(opts);
      return { data: await this.image(body, { signal }), seed: body.parameters.seed };
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
