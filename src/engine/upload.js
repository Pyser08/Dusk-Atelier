import { Cancelled } from './util.js';
import { readAssetBytes } from './formats/bytes.js';

export async function uploadAssets(blob, list, saveAsset, { onProgress, shouldStop, concurrency = 16, maxInflightBytes = 64 * 1024 * 1024, retryDelayMs = 1500 } = {}) {
  const uploaded = /* @__PURE__ */ new Map();
  const started = Date.now();
  let limit = Math.max(1, concurrency), next = 0, active = 0, inflight = 0, done = 0, bytes = 0, failed = null;
  const attempts = /* @__PURE__ */ new Map();
  const retry = [];
  const stopped = () => failed !== null || !!shouldStop?.();
  return await new Promise((resolve, reject) => {
    const finish = () => {
      if (active > 0) return;
      if (failed) return reject(failed);
      if (done < list.length && shouldStop?.()) return reject(new Cancelled());
      if (done === list.length) resolve(uploaded);
    };
    const pick = () => retry.length ? retry.shift() : next < list.length ? list[next++] : null;
    const pump = () => {
      while (!stopped() && active < limit) {
        const peek = retry.length ? retry[0] : list[next];
        if (!peek) break;
        if (active > 0 && inflight + (peek.size ?? 0) > maxInflightBytes) break;
        const a = pick();
        active++;
        inflight += a.size ?? 0;
        run(a);
      }
      finish();
    };
    const run = async (a) => {
      let ok = false;
      try {
        const data = await readAssetBytes(blob, a);
        const key = await saveAsset(data);
        if (typeof key !== "string" || !key) throw new Error("저장 결과가 비어 있습니다");
        uploaded.set(a.hash, key);
        done++;
        bytes += a.size ?? 0;
        ok = true;
        onProgress?.(done, list.length, bytes, Date.now() - started, limit);
      } catch (e) {
        const n = (attempts.get(a) ?? 0) + 1;
        attempts.set(a, n);
        if (n >= 4 || shouldStop?.()) failed ??= new Error(`에셋 저장 실패 (${a.name || a.index || a.hash?.slice(0, 8)}): ${e?.message ?? e}`);
        else {
          limit = Math.max(1, Math.floor(limit / 2));
          await new Promise((r) => setTimeout(r, retryDelayMs * n));
          retry.push(a);
        }
      } finally {
        active--;
        inflight -= a.size ?? 0;
        pump();
      }
    };
    if (!list.length) return resolve(uploaded);
    pump();
  });
}
