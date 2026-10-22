var be32 = (b, o) => (b[o] << 24 | b[o + 1] << 16 | b[o + 2] << 8 | b[o + 3]) >>> 0;
var isPng = (b) => b?.length > 8 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
var isJpeg = (b) => b?.length > 3 && b[0] === 255 && b[1] === 216;
var isWebp = (b) => b?.length > 12 && b[0] === 82 && b[1] === 73 && b[8] === 87 && b[9] === 69;
export var formatOf = (b) => isPng(b) ? "png" : isJpeg(b) ? "jpeg" : isWebp(b) ? "webp" : b?.[0] === 71 && b?.[1] === 73 ? "gif" : b?.[4] === 102 && b?.[8] === 97 && b?.[9] === 118 ? "avif" : "unknown";
export function imageSize(b) {
  try {
    if (isPng(b)) return { w: be32(b, 16), h: be32(b, 20) };
    if (isJpeg(b)) {
      let p = 2;
      while (p + 9 < b.length) {
        if (b[p] !== 255) {
          p++;
          continue;
        }
        const m = b[p + 1], len = b[p + 2] << 8 | b[p + 3];
        if (m >= 192 && m <= 207 && ![196, 200, 204].includes(m)) return { w: b[p + 7] << 8 | b[p + 8], h: b[p + 5] << 8 | b[p + 6] };
        p += 2 + len;
      }
    }
    if (isWebp(b)) {
      const t = String.fromCharCode(b[12], b[13], b[14], b[15]);
      if (t === "VP8X") return { w: 1 + (b[24] | b[25] << 8 | b[26] << 16), h: 1 + (b[27] | b[28] << 8 | b[29] << 16) };
      if (t === "VP8 ") return { w: (b[26] | b[27] << 8) & 16383, h: (b[28] | b[29] << 8) & 16383 };
      if (t === "VP8L") {
        const v = b[21] | b[22] << 8 | b[23] << 16 | b[24] << 24;
        return { w: (v & 16383) + 1, h: (v >> 14 & 16383) + 1 };
      }
    }
  } catch {
  }
  return null;
}
export function readMetadata(b) {
  const out = [];
  const dec = new TextDecoder("latin1"), utf = new TextDecoder();
  if (isPng(b)) {
    let p = 8;
    while (p + 12 <= b.length) {
      const len = be32(b, p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
      const data = b.subarray(p + 8, p + 8 + len);
      if (type === "tEXt" || type === "iTXt" || type === "zTXt") {
        const z = data.indexOf(0);
        const key = dec.decode(data.subarray(0, z));
        let value = "";
        if (type === "tEXt") value = dec.decode(data.subarray(z + 1));
        else if (type === "iTXt") {
          let q = z + 3;
          q = data.indexOf(0, q) + 1;
          q = data.indexOf(0, q) + 1;
          value = utf.decode(data.subarray(q));
        } else value = "(압축된 텍스트)";
        out.push({ kind: type, key, value: value.length > 2e3 ? value.slice(0, 2e3) + "…" : value, size: len });
      } else if (type === "eXIf") out.push({ kind: "EXIF", key: "eXIf", value: `${len} 바이트`, size: len });
      if (type === "IEND") break;
      p += 12 + len;
    }
  } else if (isJpeg(b)) {
    let p = 2;
    while (p + 4 < b.length && b[p] === 255) {
      const m = b[p + 1];
      if (m === 218 || m === 217) break;
      const len = b[p + 2] << 8 | b[p + 3];
      const seg = b.subarray(p + 4, p + 2 + len);
      if (m === 225) {
        const head = dec.decode(seg.subarray(0, 30));
        out.push({ kind: head.startsWith("Exif") ? "EXIF" : "XMP", key: head.startsWith("Exif") ? "Exif" : "XMP", value: head.startsWith("Exif") ? `${len} 바이트` : utf.decode(seg).slice(0, 2e3), size: len });
      } else if (m === 254) out.push({ kind: "COM", key: "주석", value: utf.decode(seg), size: len });
      else if (m >= 226 && m <= 239) out.push({ kind: `APP${m - 224}`, key: dec.decode(seg.subarray(0, 12)).replace(/\0.*$/, ""), value: `${len} 바이트`, size: len });
      p += 2 + len;
    }
  } else if (isWebp(b)) {
    let p = 12;
    while (p + 8 <= b.length) {
      const t = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]), len = b[p + 4] | b[p + 5] << 8 | b[p + 6] << 16 | b[p + 7] << 24;
      if (t === "EXIF" || t === "XMP ") out.push({ kind: t.trim(), key: t.trim(), value: t === "XMP " ? utf.decode(b.subarray(p + 8, p + 8 + len)).slice(0, 2e3) : `${len} 바이트`, size: len });
      p += 8 + len + (len & 1);
    }
  }
  return out;
}
export function stripMetadata(b, { keepKeys = [] } = {}) {
  if (isPng(b)) {
    const parts = [b.subarray(0, 8)];
    let p = 8;
    while (p + 12 <= b.length) {
      const len = be32(b, p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
      const chunk = b.subarray(p, p + 12 + len);
      let keep = !["tEXt", "iTXt", "zTXt", "eXIf", "tIME"].includes(type);
      if (!keep && keepKeys.length && type !== "eXIf") {
        const d = b.subarray(p + 8, p + 8 + len);
        const key = new TextDecoder("latin1").decode(d.subarray(0, d.indexOf(0)));
        keep = keepKeys.includes(key);
      }
      if (keep) parts.push(chunk);
      p += 12 + len;
      if (type === "IEND") break;
    }
    return concat(parts);
  }
  if (isJpeg(b)) {
    const parts = [b.subarray(0, 2)];
    let p = 2;
    while (p + 4 < b.length && b[p] === 255) {
      const m = b[p + 1];
      if (m === 218) {
        parts.push(b.subarray(p));
        return concat(parts);
      }
      const len = b[p + 2] << 8 | b[p + 3];
      const keep = !(m === 225 || m === 254 || m >= 227 && m <= 239);
      if (keep) parts.push(b.subarray(p, p + 2 + len));
      p += 2 + len;
    }
    parts.push(b.subarray(p));
    return concat(parts);
  }
  if (isWebp(b)) {
    const parts = [];
    let p = 12, flagsAt = -1;
    while (p + 8 <= b.length) {
      const t = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]), len = b[p + 4] | b[p + 5] << 8 | b[p + 6] << 16 | b[p + 7] << 24;
      const total = 8 + len + (len & 1);
      if (t !== "EXIF" && t !== "XMP ") {
        if (t === "VP8X") flagsAt = parts.reduce((s, x) => s + x.length, 12) + 8;
        parts.push(b.slice(p, p + total));
      }
      p += total;
    }
    const body = concat([b.subarray(0, 12), ...parts]);
    new DataView(body.buffer, body.byteOffset).setUint32(4, body.length - 8, true);
    if (flagsAt > 0) body[flagsAt] &= ~12;
    return body;
  }
  return b;
}
function concat(parts) {
  const n = parts.reduce((s, x) => s + x.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const x of parts) {
    out.set(x, o);
    o += x.length;
  }
  return out;
}
var avifOk = null;
export async function canEncode(format) {
  if (format !== "avif") return typeof OffscreenCanvas === "function" || typeof document !== "undefined";
  if (avifOk !== null) return avifOk;
  try {
    const c = new OffscreenCanvas(2, 2);
    c.getContext("2d").fillRect(0, 0, 1, 1);
    const b = await c.convertToBlob({ type: "image/avif", quality: 0.8 });
    avifOk = b.type === "image/avif";
  } catch {
    avifOk = false;
  }
  return avifOk;
}
export async function convertImage(bytes, { format = "webp", quality = 0.85, maxSide = 0 } = {}) {
  const bmp = await createImageBitmap(new Blob([bytes]));
  let w = bmp.width, hgt = bmp.height;
  if (maxSide && Math.max(w, hgt) > maxSide) {
    const s = maxSide / Math.max(w, hgt);
    w = Math.round(w * s);
    hgt = Math.round(hgt * s);
  }
  const c = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(w, hgt) : Object.assign(document.createElement("canvas"), { width: w, height: hgt });
  c.getContext("2d").drawImage(bmp, 0, 0, w, hgt);
  bmp.close?.();
  const type = `image/${format}`;
  const blob = c.convertToBlob ? await c.convertToBlob({ type, quality }) : await new Promise((r) => c.toBlob(r, type, quality));
  if (!blob || blob.type !== type) throw new Error(`이 브라우저는 ${format.toUpperCase()} 저장을 지원하지 않아요`);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h: hgt };
}
