var CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(data) {
  let c = 4294967295;
  for (let i = 0; i < data.length; i++) c = CRC[(c ^ data[i]) & 255] ^ c >>> 8;
  return (c ^ 4294967295) >>> 0;
}
export function createZip() {
  const parts = [], central = [];
  let offset = 0;
  const enc = new TextEncoder();
  const names = /* @__PURE__ */ new Set();
  const uniq = (name) => {
    let n = name, i = 2;
    const dot = name.lastIndexOf(".");
    while (names.has(n.toLowerCase())) n = dot > 0 ? `${name.slice(0, dot)} (${i++})${name.slice(dot)}` : `${name} (${i++})`;
    names.add(n.toLowerCase());
    return n;
  };
  return {
    add(name, data) {
      const bytes = typeof data === "string" ? enc.encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
      const nm = enc.encode(uniq(String(name).replace(/^\/+/, "")));
      const crc = crc32(bytes);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 67324752, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 2048, true);
      lh.setUint16(8, 0, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, bytes.length, true);
      lh.setUint32(22, bytes.length, true);
      lh.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(lh.buffer), nm, bytes);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 33639248, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 2048, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, bytes.length, true);
      ch.setUint32(24, bytes.length, true);
      ch.setUint16(28, nm.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nm);
      offset += 30 + nm.length + bytes.length;
    },
    blob() {
      const cdSize = central.reduce((s, p) => s + p.length, 0);
      const count = central.length / 2;
      const end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 101010256, true);
      end.setUint16(8, count, true);
      end.setUint16(10, count, true);
      end.setUint32(12, cdSize, true);
      end.setUint32(16, offset, true);
      return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
    },
    get size() {
      return offset;
    }
  };
}
