// MagicaVoxel .vox 읽기·쓰기. 복셀 = { x, y, z, c:[r,g,b] } 목록. 축: x 오른쪽, y 위, z 앞 (MagicaVoxel은 z가 위라서 변환한다)
/** .vox → { size:[x,y,z], voxels:[{x,y,z,c}] } (첫 모델) */
export function readVox(buf) {
  if (buf.toString("ascii", 0, 4) !== "VOX ") throw new Error(".vox 파일이 아님");
  let p = 20, size = null, xyzi = null, pal = null; // MAIN 헤더 건너뜀
  while (p < buf.length) { const id = buf.toString("ascii", p, p + 4), n = buf.readUInt32LE(p + 4), m = buf.readUInt32LE(p + 8), d = p + 12;
    if (id === "SIZE" && !size) size = [buf.readUInt32LE(d), buf.readUInt32LE(d + 4), buf.readUInt32LE(d + 8)];
    else if (id === "XYZI" && !xyzi) { const k = buf.readUInt32LE(d); xyzi = []; for (let i = 0; i < k; i++) xyzi.push([buf[d + 4 + i * 4], buf[d + 5 + i * 4], buf[d + 6 + i * 4], buf[d + 7 + i * 4]]); }
    else if (id === "RGBA") { pal = []; for (let i = 0; i < 256; i++) pal.push([buf[d + i * 4], buf[d + i * 4 + 1], buf[d + i * 4 + 2]]); }
    p = d + n + (id === "MAIN" ? 0 : m); if (id === "MAIN") p = d + n; }
  if (!size || !xyzi) throw new Error("모델이 없음");
  const P = (i) => (pal ? pal[(i - 1) & 255] : [i, i, i]); // 팔레트 색 i는 RGBA[i-1]
  return { size: [size[0], size[2], size[1]], voxels: xyzi.map(([x, y, z, i]) => ({ x, y: z, z: size[1] - 1 - y, c: P(i) })) };
}
/** 복셀 목록 → .vox 버퍼. 색은 255개까지(넘으면 가까운 색으로 묶음) */
export function writeVox(voxels) {
  let mx = 0, my = 0, mz = 0, nx = 1e9, ny = 1e9, nz = 1e9; for (const v of voxels) { mx = Math.max(mx, v.x); my = Math.max(my, v.y); mz = Math.max(mz, v.z); nx = Math.min(nx, v.x); ny = Math.min(ny, v.y); nz = Math.min(nz, v.z); }
  const sx = mx - nx + 1, sy = my - ny + 1, sz = mz - nz + 1; if (sx > 256 || sy > 256 || sz > 256) throw new Error(`MagicaVoxel 한계(256) 초과: ${sx}×${sy}×${sz}`);
  const pal = quantize(voxels.map((v) => v.c), 255), idx = (c) => { let b = 0, bd = 1e9; pal.forEach((p, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; b = i; } }); return b + 1; };
  const cache = new Map(), I = (c) => { const k = c.join(","); if (!cache.has(k)) cache.set(k, idx(c)); return cache.get(k); };
  const ch = (id, body) => { const h = Buffer.alloc(12); h.write(id, 0, "ascii"); h.writeUInt32LE(body.length, 4); h.writeUInt32LE(0, 8); return Buffer.concat([h, body]); };
  const size = Buffer.alloc(12); size.writeUInt32LE(sx, 0); size.writeUInt32LE(sz, 4); size.writeUInt32LE(sy, 8); // vox: z 위
  const xyzi = Buffer.alloc(4 + voxels.length * 4); xyzi.writeUInt32LE(voxels.length, 0); voxels.forEach((v, i) => { xyzi[4 + i * 4] = v.x - nx; xyzi[5 + i * 4] = sz - 1 - (v.z - nz); xyzi[6 + i * 4] = v.y - ny; xyzi[7 + i * 4] = I(v.c); });
  const rgba = Buffer.alloc(1024); pal.forEach((p, i) => { rgba[i * 4] = p[0]; rgba[i * 4 + 1] = p[1]; rgba[i * 4 + 2] = p[2]; rgba[i * 4 + 3] = 255; });
  const kids = Buffer.concat([ch("SIZE", size), ch("XYZI", xyzi), ch("RGBA", rgba)]), main = Buffer.alloc(12); main.write("MAIN", 0, "ascii"); main.writeUInt32LE(0, 4); main.writeUInt32LE(kids.length, 8);
  const head = Buffer.alloc(8); head.write("VOX ", 0, "ascii"); head.writeUInt32LE(150, 4); return Buffer.concat([head, main, kids]);
}
// 색 줄이기(중앙값 분할)
export function quantize(cols, n) { const uniq = [...new Map(cols.map((c) => [c.join(","), c])).values()]; if (uniq.length <= n) return uniq; let boxes = [uniq];
  while (boxes.length < n) { boxes.sort((a, b) => b.length - a.length); const b = boxes.shift(); if (b.length < 2) { boxes.push(b); break; } const rng = [0, 1, 2].map((k) => Math.max(...b.map((c) => c[k])) - Math.min(...b.map((c) => c[k]))), k = rng.indexOf(Math.max(...rng)); b.sort((x, y) => x[k] - y[k]); boxes.push(b.slice(0, b.length >> 1), b.slice(b.length >> 1)); }
  return boxes.map((b) => [0, 1, 2].map((k) => Math.round(b.reduce((s, c) => s + c[k], 0) / b.length))); }
