import { rpackDecode } from '../rpack.js';
import { sha256 } from '../hash.js';
import { Cancelled } from '../util.js';

export async function readRange(blob, start2, end) {
  return new Uint8Array(await blob.slice(start2, end).arrayBuffer());
}
export async function scanRisum(blob, onProgress, shouldStop) {
  const head = await readRange(blob, 0, 6);
  if (head.length < 6 || head[0] !== 111) throw new Error(".risum 파일이 아닙니다 (시작 바이트가 다름)");
  if (head[1] !== 0) throw new Error("지원하지 않는 .risum 버전입니다");
  const mainLen = new DataView(head.buffer).getUint32(2, true);
  let pos = 6;
  if (pos + mainLen > blob.size) throw new Error("파일이 잘렸습니다 (모듈 정보)");
  const mainRaw = rpackDecode(await readRange(blob, pos, pos + mainLen));
  pos += mainLen;
  let main;
  try {
    main = JSON.parse(new TextDecoder().decode(mainRaw));
  } catch {
    throw new Error("모듈 정보를 읽을 수 없습니다");
  }
  if (main?.type !== "risuModule" || !main.module) throw new Error("RisuAI 모듈 파일이 아닙니다");
  const mod = main.module;
  const metaAssets = Array.isArray(mod.assets) ? mod.assets : [];
  const assets = [];
  for (let index = 0; ; index++) {
    if (shouldStop?.()) throw new Cancelled();
    if (pos >= blob.size) throw new Error("파일이 잘렸습니다 (에셋 목록 끝 표시 없음)");
    const hdr = await readRange(blob, pos, Math.min(pos + 5, blob.size));
    if (hdr[0] === 0) break;
    if (hdr[0] !== 1 || hdr.length < 5) throw new Error("에셋 구역이 손상되었습니다");
    const len = new DataView(hdr.buffer).getUint32(1, true);
    const start2 = pos + 5;
    if (start2 + len > blob.size) throw new Error("파일이 잘렸습니다 (에셋)");
    const data = rpackDecode(await readRange(blob, start2, start2 + len));
    const hash = await sha256(data);
    const meta = metaAssets[index] ?? [];
    assets.push({ index, name: String(meta[0] ?? ""), ext: String(meta[2] ?? ""), offset: start2, length: len, size: data.length, hash });
    pos = start2 + len;
    onProgress?.(pos, blob.size, index + 1);
  }
  if (assets.length !== metaAssets.length) throw new Error(`에셋 개수가 맞지 않습니다 (정보 ${metaAssets.length}개, 실제 ${assets.length}개)`);
  return { kind: "risum", module: mod, assets };
}
