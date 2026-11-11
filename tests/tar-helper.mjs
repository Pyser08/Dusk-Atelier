// 시험용: SDStudio(tar-stream)처럼 tar를 만든다
// tar-stream처럼: 100바이트 넘거나 ASCII가 아닌 이름은 pax 머리글로
export function tar(entries) {
  const enc = new TextEncoder(), blocks = [];
  const header = (name, size, type) => {
    const b = new Uint8Array(512), w = (s, o) => b.set(enc.encode(s), o);
    w(name.slice(0, 99), 0); w("0000644\0", 100); w("0000000\0", 108); w("0000000\0", 116);
    w(size.toString(8).padStart(11, "0") + "\0", 124); w("00000000000\0", 136); w("        ", 148); b[156] = type.charCodeAt(0); w("ustar\0", 257); w("00", 263);
    let sum = 0; for (const x of b) sum += x; w(sum.toString(8).padStart(6, "0") + "\0 ", 148);
    return b;
  };
  const pad = (d) => { const n = Math.ceil(d.length / 512) * 512, o = new Uint8Array(n); o.set(d); return o; };
  for (const [name, data] of entries) {
    const d = typeof data === "string" ? enc.encode(data) : data;
    if (/[^\x20-\x7e]/.test(name) || name.length > 99) {
      const rec = (k, v) => { const body = ` ${k}=${v}\n`; let len = enc.encode(body).length; len += String(len).length; if (String(len).length !== String(len - String(len).length).length) len++; return `${len}${body}`; };
      const px = enc.encode(rec("path", name));
      blocks.push(header("PaxHeader", px.length, "x"), pad(px));
    }
    blocks.push(header(/[^\x20-\x7e]/.test(name) ? "x" : name, d.length, "0"), pad(d));
  }
  blocks.push(new Uint8Array(1024));
  const out = new Uint8Array(blocks.reduce((n, b) => n + b.length, 0)); let o = 0; for (const b of blocks) { out.set(b, o); o += b.length; }
  return out;
}
