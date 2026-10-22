var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
export function sha256js(data) {
  const len = data.length;
  const total = len + 9 + 63 >> 6 << 6;
  const buf = new Uint8Array(total);
  buf.set(data);
  buf[len] = 128;
  const bits = len * 8;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 8, Math.floor(bits / 4294967296));
  dv.setUint32(total - 4, bits >>> 0);
  const h2 = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
  const w = new Uint32Array(64);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      const s0 = (a >>> 7 | a << 25) ^ (a >>> 18 | a << 14) ^ a >>> 3;
      const s1 = (b >>> 17 | b << 15) ^ (b >>> 19 | b << 13) ^ b >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
    }
    let [A, B, C, D, E, F, G, H] = h2;
    for (let i = 0; i < 64; i++) {
      const S1 = (E >>> 6 | E << 26) ^ (E >>> 11 | E << 21) ^ (E >>> 25 | E << 7);
      const ch = E & F ^ ~E & G;
      const t1 = H + S1 + ch + K[i] + w[i] >>> 0;
      const S0 = (A >>> 2 | A << 30) ^ (A >>> 13 | A << 19) ^ (A >>> 22 | A << 10);
      const mj = A & B ^ A & C ^ B & C;
      const t2 = S0 + mj >>> 0;
      H = G;
      G = F;
      F = E;
      E = D + t1 >>> 0;
      D = C;
      C = B;
      B = A;
      A = t1 + t2 >>> 0;
    }
    h2[0] += A;
    h2[1] += B;
    h2[2] += C;
    h2[3] += D;
    h2[4] += E;
    h2[5] += F;
    h2[6] += G;
    h2[7] += H;
  }
  let hex = "";
  for (let i = 0; i < 8; i++) hex += h2[i].toString(16).padStart(8, "0");
  return hex;
}
export var subtle = typeof crypto !== "undefined" && crypto.subtle ? crypto.subtle : null;
export async function sha256(data) {
  if (subtle) {
    try {
      const d = new Uint8Array(await subtle.digest("SHA-256", data));
      let hex = "";
      for (let i = 0; i < d.length; i++) hex += d[i].toString(16).padStart(2, "0");
      return hex;
    } catch {
    }
  }
  return sha256js(data);
}
export var assetKey = (hash) => `assets/${hash}.png`;
export var HASH_KEY = /^assets\/([a-f0-9]{64})\.[a-z0-9]+$/;
