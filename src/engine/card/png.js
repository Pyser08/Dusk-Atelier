// PNG tEXt 청크에 카드 JSON을 넣고 읽기. 순수 함수(Uint8Array).
const KEY = "dusk-card";
const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const u32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0); return b; };
const cat = (...a) => { const o = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let n = 0; for (const x of a) { o.set(x, n); n += x.length; } return o; };
const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));

export function chunk(type, data) { const body = cat(ascii(type), data); return cat(u32(data.length), body, u32(crc32(body))); }
export function chunks(png) {
  if (png.length < 8 || !SIG.every((x, i) => png[i] === x)) throw new Error("PNG가 아니에요.");
  const out = []; let p = 8;
  while (p + 12 <= png.length) {
    const len = new DataView(png.buffer, png.byteOffset + p, 4).getUint32(0);
    const type = String.fromCharCode(...png.subarray(p + 4, p + 8));
    if (p + 12 + len > png.length) throw new Error("PNG가 손상됐어요.");
    out.push({ type, data: png.subarray(p + 8, p + 8 + len) }); p += 12 + len;
    if (type === "IEND") break;
  }
  return out;
}
// 카드 JSON(UTF-8)을 base64로 감싸 Latin-1 tEXt에 넣는다. 기존 dusk-card 청크는 교체한다.
export function embedCard(png, card) {
  const json = new TextEncoder().encode(JSON.stringify(card));
  let s = ""; for (let i = 0; i < json.length; i += 0x8000) s += String.fromCharCode(...json.subarray(i, i + 0x8000));
  const text = chunk("tEXt", cat(ascii(KEY), new Uint8Array([0]), ascii(btoa(s))));
  const parts = [png.slice(0, 8)];
  for (const c of chunks(png)) {
    if (c.type === "tEXt" && String.fromCharCode(...c.data.subarray(0, KEY.length + 1)) === KEY + "\0") continue;
    if (c.type === "IEND") parts.push(text);
    parts.push(chunk(c.type, c.data));
  }
  return cat(...parts);
}
export function extractCard(png) {
  const c = chunks(png).find((x) => x.type === "tEXt" && String.fromCharCode(...x.data.subarray(0, KEY.length + 1)) === KEY + "\0");
  if (!c) return null;
  const b64 = String.fromCharCode(...c.data.subarray(KEY.length + 1));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (x) => x.charCodeAt(0))));
}
