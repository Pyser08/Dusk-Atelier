// 최소 PNG 읽기·쓰기(의존성 없음): 8비트 회색/RGB/RGBA/팔레트, 인터레이스 없음
import { inflateSync, deflateSync } from "node:zlib";
export function readPNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("PNG가 아님");
  let p = 8, w = 0, h = 0, depth = 0, ct = 0, il = 0, pal = null, trns = null; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len); p += 12 + len;
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ct = d[9]; il = d[12]; } else if (type === "PLTE") pal = d; else if (type === "tRNS") trns = d; else if (type === "IDAT") idat.push(d); else if (type === "IEND") break; }
  if (depth !== 8 || il) throw new Error("8비트, 인터레이스 없는 PNG만 지원(그림판·Aseprite 기본 저장이면 됨)");
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct], raw = inflateSync(Buffer.concat(idat)), stride = w * ch, out = new Uint8Array(w * h * 4), prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) { const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0; let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } cur[i] = v & 255; }
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 4, s = x * ch; let r, g, bb, al = 255;
      if (ct === 0) r = g = bb = cur[s]; else if (ct === 4) { r = g = bb = cur[s]; al = cur[s + 1]; } else if (ct === 2) { r = cur[s]; g = cur[s + 1]; bb = cur[s + 2]; } else if (ct === 6) { r = cur[s]; g = cur[s + 1]; bb = cur[s + 2]; al = cur[s + 3]; } else { const k = cur[s]; r = pal[k * 3]; g = pal[k * 3 + 1]; bb = pal[k * 3 + 2]; al = trns && k < trns.length ? trns[k] : 255; }
      out[o] = r; out[o + 1] = g; out[o + 2] = bb; out[o + 3] = al; }
    prev.set(cur); }
  return { w, h, data: out, at: (x, y) => { const o = (y * w + x) * 4; return [out[o], out[o + 1], out[o + 2], out[o + 3]]; } };
}
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
/** RGBA(Uint8Array w*h*4) → PNG 버퍼 */
export function writePNG(w, h, rgba) { const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]); }
