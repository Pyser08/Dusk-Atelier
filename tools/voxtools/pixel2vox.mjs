#!/usr/bin/env node
// 픽셀아트 → 복셀 (범용 도구)
// 사용: node pixel2vox.mjs --front 앞.png [--side 옆.png] [--top 위.png] [--markers 표시점.png] [--depth 칸] [--round 0~1] [--out 이름]
//  · 앞 그림: 가로 = x(오른쪽), 세로 = y(위). 옆 그림: 가로 = z(왼쪽이 뒤, 오른쪽이 앞), 세로 = y. 위 그림: 가로 = x, 세로 = z(위쪽이 뒤)
//  · 투명(알파 < 128) 픽셀은 빈칸. 그림 크기는 같은 축끼리 같아야 함(앞·옆 높이, 앞·위 너비)
//  · 옆 그림이 없으면 앞 실루엣을 두께 --depth로 부풀린다(--round 1이면 가장자리로 갈수록 둥글게 얇아짐)
//  · 표시점 그림(앞 그림과 같은 크기): 정해진 색 점 → 이름 붙은 좌표(JSON). 색표는 --marks 파일로 바꿀 수 있음
import { readFileSync, writeFileSync } from "node:fs"; import { readPNG } from "./png.mjs"; import { writeVox } from "./vox.mjs";
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, l) => (v.startsWith("--") ? [...a, [v.slice(2), l[i + 1]?.startsWith("--") || l[i + 1] == null ? "1" : l[i + 1]]] : a), []));
if (!A.front) { console.log("사용: node pixel2vox.mjs --front 앞.png [--side 옆.png] [--top 위.png] [--markers 표시점.png] [--depth 6] [--round 0.8] [--out model]"); process.exit(1); }
const load = (f) => (f ? readPNG(readFileSync(f)) : null), F = load(A.front), S = load(A.side), T = load(A.top), MK = load(A.markers);
const W = F.w, H = F.h, D = S ? S.w : T ? T.h : +(A.depth ?? 6), round = +(A.round ?? .8), solid = (img, x, y) => img.at(x, y)[3] >= 128;
if (S && S.h !== H) throw new Error(`앞(${H})과 옆(${S.h}) 그림 높이가 달라요`); if (T && T.w !== W) throw new Error(`앞(${W})과 위(${T.w}) 그림 너비가 달라요`);
// 옆 그림 없이 부풀릴 때: 앞 실루엣 안에서 가장자리까지 거리 → 두께
let dist = null; if (!S && !T) { dist = new Float32Array(W * H).fill(1e9); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!solid(F, x, H - 1 - y)) dist[y * W + x] = 0;
  for (let it = 0; it < 2; it++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let d = dist[i]; if (x) d = Math.min(d, dist[i - 1] + 1); if (y) d = Math.min(d, dist[i - W] + 1); if (x < W - 1) d = Math.min(d, dist[i + 1] + 1); if (y < H - 1) d = Math.min(d, dist[i + W] + 1); if (x && y) d = Math.min(d, dist[i - W - 1] + 1.414); if (x < W - 1 && y) d = Math.min(d, dist[i - W + 1] + 1.414); dist[i] = d; } }
const vox = [], has = new Set(), K = (x, y, z) => x + "," + y + "," + z;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!solid(F, x, H - 1 - y)) continue;
  let zs = []; if (dist) { const half = (D / 2) * (round ? Math.min(1, Math.sqrt(Math.min(1, dist[y * W + x] / (D / 2 + 1))) * round + (1 - round)) : 1); for (let z = 0; z < D; z++) if (Math.abs(z - (D - 1) / 2) <= half) zs.push(z); if (!zs.length) zs.push(Math.floor((D - 1) / 2)); }
  else for (let z = 0; z < D; z++) { if (S && !solid(S, z, H - 1 - y)) continue; if (T && !solid(T, x, D - 1 - z)) continue; zs.push(z); }
  for (const z of zs) { vox.push({ x, y, z }); has.add(K(x, y, z)); } }
// 색: 앞·뒤 면에 가까우면 앞 그림, 옆면이면 옆 그림, 윗면이면 위 그림 색
for (const v of vox) { const exp = (dx, dy, dz) => !has.has(K(v.x + dx, v.y + dy, v.z + dz)); const side = S && (exp(1, 0, 0) || exp(-1, 0, 0)) && !(exp(0, 0, 1) || exp(0, 0, -1)), top = T && exp(0, 1, 0) && !(exp(0, 0, 1) || exp(0, 0, -1));
  const c = top ? T.at(v.x, D - 1 - v.z) : side ? S.at(v.z, H - 1 - v.y) : F.at(v.x, H - 1 - v.y); v.c = [c[0], c[1], c[2]]; }
// 표시점: 색 → 이름. 좌표는 그 칸의 두께 가운데
const MARKS = A.marks ? JSON.parse(readFileSync(A.marks, "utf8")) : { "255,0,0": "grip", "0,255,0": "off", "0,0,255": "back", "255,255,0": "tip", "255,0,255": "joint", "0,255,255": "extra" };
const points = {}; if (MK) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = MK.at(x, H - 1 - y); if (c[3] < 128) continue; const n = MARKS[c.slice(0, 3).join(",")]; if (!n) continue; let zs = []; for (let z = 0; z < D; z++) if (has.has(K(x, y, z))) zs.push(z); const z = zs.length ? (zs[0] + zs[zs.length - 1]) / 2 : D / 2; (points[n] ??= []).push([x, y, z]); }
const out = A.out ?? "model"; writeFileSync(out + ".vox", writeVox(vox)); writeFileSync(out + ".json", JSON.stringify({ size: [W, H, D], count: vox.length, points }, null, 1));
console.log(`${out}.vox · ${W}×${H}×${D} · 복셀 ${vox.length}개 · 표시점 ${Object.keys(points).join(", ") || "없음"}`);
