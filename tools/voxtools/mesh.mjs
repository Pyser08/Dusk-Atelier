// 복셀 → 면 합치기 메시(같은 색 이웃 면을 큰 사각형으로). 결과는 three.js BufferGeometry에 바로 넣을 배열
export function greedy(voxels, scale = 1) {
  const S = new Map(); let lo = [1e9, 1e9, 1e9]; for (const v of voxels) { S.set(v.x + "," + v.y + "," + v.z, v.c); lo = [Math.min(lo[0], v.x), Math.min(lo[1], v.y), Math.min(lo[2], v.z)]; }
  const at = (x, y, z) => S.get(x + "," + y + "," + z), P = [], N = [], C = [], I = [], dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], shade = [1, .94, 1.1, .72, 1, .9];
  for (let f = 0; f < 6; f++) { const d = dirs[f], ax = f >> 1, u = ax === 0 ? 2 : 0, w = ax === 1 ? 2 : 1, layers = new Map();
    for (const v of voxels) { if (at(v.x + d[0], v.y + d[1], v.z + d[2])) continue; const q = [v.x, v.y, v.z]; let L = layers.get(q[ax]); if (!L) layers.set(q[ax], (L = new Map())); L.set(q[u] + "," + q[w], v.c.join(",")); }
    for (const [k, L] of layers) { const done = new Set(); for (const [key, col] of L) { if (done.has(key)) continue; const [a0, b0] = key.split(",").map(Number); let wa = 1; while (L.get(a0 + wa + "," + b0) === col && !done.has(a0 + wa + "," + b0)) wa++; let hb = 1; grow: for (;;) { for (let i = 0; i < wa; i++) { const kk = a0 + i + "," + (b0 + hb); if (L.get(kk) !== col || done.has(kk)) break grow; } hb++; }
      for (let j = 0; j < hb; j++) for (let i = 0; i < wa; i++) done.add(a0 + i + "," + (b0 + j)); const base = P.length / 3, D = k + (f % 2 ? 0 : 1), c = col.split(",").map((x) => (x / 255) * shade[f]);
      for (const [da, db] of [[0, 0], [wa, 0], [wa, hb], [0, hb]]) { const q = [0, 0, 0]; q[ax] = D; q[u] = a0 + da; q[w] = b0 + db; P.push(q[0] * scale, q[1] * scale, q[2] * scale); N.push(...d); C.push(...c); }
      const e1 = [0, 0, 0], e2 = [0, 0, 0]; e1[u] = 1; e2[w] = 1; const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], flip = cr[0] * d[0] + cr[1] * d[1] + cr[2] * d[2] < 0; I.push(...(flip ? [base, base + 2, base + 1, base, base + 3, base + 2] : [base, base + 1, base + 2, base, base + 2, base + 3])); } } }
  return { position: P, normal: N, color: C, index: I, tris: I.length / 3 };
}
