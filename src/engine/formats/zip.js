import { readRange } from './risum.js';

var u16 = (b, o) => b[o] | b[o + 1] << 8;
var u32 = (b, o) => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0;
var u64 = (b, o) => u32(b, o) + u32(b, o + 4) * 4294967296;
export async function readZipDirectory(blob) {
  const tailLen = Math.min(blob.size, 22 + 65535 + 20);
  const tailStart = blob.size - tailLen;
  const tail = await readRange(blob, tailStart, blob.size);
  let e = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (u32(tail, i) === 101010256) {
    e = i;
    break;
  }
  if (e < 0) throw new Error("zip 파일이 아닙니다 (끝 표시 없음)");
  let count = u16(tail, e + 10), cdSize = u32(tail, e + 12), cdOffset = u32(tail, e + 16);
  if (e >= 20 && u32(tail, e - 20) === 117853008) {
    let z64 = u64(tail, e - 20 + 8);
    let rec = await readRange(blob, z64, z64 + 56);
    if (u32(rec, 0) !== 101075792) {
      z64 = tailStart + e - 20 - 56;
      rec = await readRange(blob, z64, z64 + 56);
    }
    if (u32(rec, 0) !== 101075792) throw new Error("zip64 정보가 손상되었습니다");
    count = u64(rec, 32);
    cdSize = u64(rec, 40);
    cdOffset = u64(rec, 48);
  }
  let base = 0;
  const eocdAbs = tailStart + e;
  const sigAt = async (off) => off >= 0 && off + 4 <= blob.size && u32(await readRange(blob, off, off + 4), 0) === 33639248;
  if (count > 0 && !await sigAt(cdOffset)) {
    const isZip64 = e >= 20 && u32(tail, e - 20) === 117853008;
    const cdAbs = isZip64 ? eocdAbs - 20 - 56 - cdSize : eocdAbs - cdSize;
    base = cdAbs - cdOffset;
    if (!await sigAt(cdOffset + base)) throw new Error("zip 목록 위치를 찾지 못했습니다");
  }
  cdOffset += base;
  if (cdOffset + cdSize > blob.size) throw new Error("zip 목록이 잘렸습니다");
  const cd = await readRange(blob, cdOffset, cdOffset + cdSize);
  const entries = [];
  let p = 0;
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (u32(cd, p) !== 33639248) throw new Error("zip 목록이 손상되었습니다");
    const method = u16(cd, p + 10);
    let compSize = u32(cd, p + 20), size = u32(cd, p + 24);
    const nameLen = u16(cd, p + 28), extraLen = u16(cd, p + 30), commentLen = u16(cd, p + 32);
    let localOffset = u32(cd, p + 42);
    const name = dec.decode(cd.subarray(p + 46, p + 46 + nameLen));
    let x = p + 46 + nameLen;
    const xEnd = x + extraLen;
    while (x + 4 <= xEnd) {
      const id = u16(cd, x), len = u16(cd, x + 2);
      if (id === 1) {
        let q = x + 4;
        if (size === 4294967295) {
          size = u64(cd, q);
          q += 8;
        }
        if (compSize === 4294967295) {
          compSize = u64(cd, q);
          q += 8;
        }
        if (localOffset === 4294967295) {
          localOffset = u64(cd, q);
          q += 8;
        }
      }
      x += 4 + len;
    }
    if (!name.endsWith("/")) entries.push({ name, method, compSize, size, localOffset: localOffset + base });
    p = xEnd + commentLen;
  }
  return entries;
}
export async function readZipEntry(blob, entry2) {
  const lh = await readRange(blob, entry2.localOffset, entry2.localOffset + 30);
  if (u32(lh, 0) !== 67324752) throw new Error(`zip 항목이 손상되었습니다: ${entry2.name}`);
  const start2 = entry2.localOffset + 30 + u16(lh, 26) + u16(lh, 28);
  const raw = blob.slice(start2, start2 + entry2.compSize);
  if (entry2.method === 0) return new Uint8Array(await raw.arrayBuffer());
  if (entry2.method !== 8) throw new Error(`지원하지 않는 압축 방식(${entry2.method}): ${entry2.name}`);
  const stream = raw.stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const out = new Uint8Array(await new Response(stream).arrayBuffer());
  if (out.length !== entry2.size) throw new Error(`압축 해제 크기가 맞지 않습니다: ${entry2.name}`);
  return out;
}
