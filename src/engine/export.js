import { DECODE } from './rpack.js';

var ENCODE = (() => {
  const e = new Uint8Array(256);
  for (let i = 0; i < 256; i++) e[DECODE[i]] = i;
  return e;
})();
export function rpackEncode(data) {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = ENCODE[data[i]];
  return out;
}
var u322 = (n) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
};
export async function buildRisum(module, readAsset, { onProgress, shouldStop } = {}) {
  const assets = module.assets ?? [];
  const clean = JSON.parse(JSON.stringify(module));
  delete clean.enabled;
  clean.assets = assets.map((a) => [a[0], "", a[2]]);
  const main = rpackEncode(new TextEncoder().encode(JSON.stringify({ module: clean, type: "risuModule" }, null, 2)));
  const parts = [new Uint8Array([111, 0]), u322(main.length), main];
  for (let i = 0; i < assets.length; i++) {
    if (shouldStop?.()) throw new Error("취소됨");
    const data = await readAsset(assets[i][1]);
    if (!data?.length) throw new Error(`에셋을 읽지 못했어요: ${assets[i][0] || assets[i][1]}`);
    const enc = rpackEncode(data instanceof Uint8Array ? data : new Uint8Array(data));
    parts.push(new Uint8Array([1]), u322(enc.length), enc);
    onProgress?.(i + 1, assets.length);
  }
  parts.push(new Uint8Array([0]));
  return new Blob(parts, { type: "application/octet-stream" });
}
export function moduleJson(module) {
  const clean = JSON.parse(JSON.stringify(module));
  delete clean.enabled;
  return JSON.stringify({ ...clean, type: "risuModule" }, null, 2);
}
export var safeFileName = (s) => String(s || "module").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").trim().slice(0, 120) || "module";
