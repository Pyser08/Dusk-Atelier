// 그림·로어북으로 옷차림 맞추기: AI는 '있는 파츠 중 고르기'만 하고, 그림은 이 기기 안에서 색만 뽑는다(바깥으로 보내지 않음)
import { PARTS, SLOTS } from "./wear.js";

const hx = (n) => "#" + (n >>> 0).toString(16).padStart(6, "0").slice(-6);
// 고를 수 있는 목록: 슬롯키: id=이름(색 슬롯)
export function LOOK_PROMPT(sex) {
  const sx = sex === "f" ? "f" : "m", rows = SLOTS.map(([k, name]) => { const o = Object.entries(PARTS).filter(([, q]) => q.slot === k && (q.sx === "a" || q.sx === sx || !q.sx)).map(([id, q]) => `${id}=${q.n}(${q.cn.join("/")})`); return o.length ? `${k}(${name}): ${o.join(", ")}` : ""; }).filter(Boolean);
  return `너는 게임 캐릭터의 옷차림을 정하는 도우미다. 설명·로어북·그림에서 뽑은 색을 읽고, 아래 목록에 있는 파츠 id만 골라 그 인물의 평소 차림을 재현한다.
목록에 없는 옷은 모양이 가장 가까운 파츠로 고르고 색으로 맞춘다. 정보가 없는 부위는 그 인물에게 자연스러운 것으로 고르되 속옷은 기본 것으로 한다.
설명 없이 줄만 쓴다. 한 줄에 한 부위: 슬롯키: 파츠id #색1 #색2 … (색은 그 파츠의 색 슬롯 순서. 모르면 생략)
머리 색은 hair 줄 첫 색으로. 피부색을 알면 마지막에 "skin: #색" 한 줄.

[고를 수 있는 파츠]
${rows.join("\n")}`;
}
// 답 읽기: 목록에 있는 것만 받는다
export function parseLook(t) {
  const wear = {}; let skin = null; const ok = new Set(SLOTS.map((s) => s[0]));
  for (const ln of String(t || "").split(/\n/)) {
    const m = /^\s*[-*]?\s*([a-zA-Z]+)\s*[:：]\s*(.+)$/.exec(ln); if (!m) continue; const k = m[1], rest = m[2], cols = (rest.match(/#[0-9a-fA-F]{6}\b/g) || []).map((c) => parseInt(c.slice(1), 16));
    if (k === "skin") { if (cols[0] != null) skin = cols[0]; continue; }
    if (!ok.has(k)) continue; const id = (/^\s*([A-Za-z0-9_]+)/.exec(rest) || [])[1]; const p = id && PARTS[id]; if (!p || p.slot !== k) continue;
    wear[k] = { id }; if (cols.length) wear[k].c = p.cd.map((d, i) => cols[i] ?? d ?? null);
  }
  return { wear, skin };
}
// 그림에서 색 뽑기: 배경(테두리 색)을 빼고, 위·가운데·아래 띠에서 가장 많은 색
export async function imagePalette(file) {
  const url = URL.createObjectURL(file); try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("그림을 못 읽었어요")); i.src = url; });
    const W = 72, H = Math.max(24, Math.round(72 * img.height / img.width)), cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H); const d = g.getImageData(0, 0, W, H).data;
    const q = (i) => ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4), bg = new Map();
    for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { const k = q((y * W + x) * 4); bg.set(k, (bg.get(k) || 0) + 1); }
    for (let y = 0; y < H; y++) for (const x of [0, W - 1]) { const k = q((y * W + x) * 4); bg.set(k, (bg.get(k) || 0) + 1); }
    const bgs = new Set([...bg.entries()].filter(([, n]) => n > (W + H) * .25).map(([k]) => k));
    const bgc = [...bgs].map((k) => [((k >> 8) & 15) * 16 + 8, ((k >> 4) & 15) * 16 + 8, (k & 15) * 16 + 8]), near = (r, g2, b2) => bgc.some(([R, G, B]) => Math.abs(R - r) + Math.abs(G - g2) + Math.abs(B - b2) < 60);
    const band = (a, b, skipSkin) => { const m = new Map(); for (let y = Math.floor(H * a); y < Math.floor(H * b); y++) for (let x = Math.floor(W * .2); x < Math.ceil(W * .8); x++) { const i = (y * W + x) * 4; if (d[i + 3] < 128) continue; const k = q(i); const r = d[i], gg = d[i + 1], bb = d[i + 2]; if (bgs.has(k) || near(r, gg, bb)) continue; if (skipSkin && r > gg && gg > bb && r - bb > 25 && r - bb < 110 && r > 150) continue; const e = m.get(k) || { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += r; e.g += gg; e.b += bb; m.set(k, e); }
      const top = [...m.values()].sort((x, y) => y.n - x.n)[0]; return top ? ((Math.round(top.r / top.n) << 16) | (Math.round(top.g / top.n) << 8) | Math.round(top.b / top.n)) : null; };
    return { hair: band(0, .16, true), top: band(.3, .5, true), bottom: band(.58, .8, true), shoes: band(.9, 1, true) };
  } finally { URL.revokeObjectURL(url); }
}
export const paletteLine = (p) => p ? `[그림에서 뽑은 색] 머리 ${p.hair != null ? hx(p.hair) : "?"}, 윗옷 ${p.top != null ? hx(p.top) : "?"}, 아래옷 ${p.bottom != null ? hx(p.bottom) : "?"}, 신발 ${p.shoes != null ? hx(p.shoes) : "?"} (전신 그림 기준 대략값)` : "";
// AI가 색을 안 줬으면 그림 색을 첫 색 슬롯에 입힌다
export function applyPalette(wear, p) {
  if (!p) return wear; const put = (k, c) => { const w = wear[k]; if (!w || c == null || w.c?.[0] != null && w.c[0] !== PARTS[w.id].cd[0]) return; const cd = PARTS[w.id].cd; w.c = cd.map((d, i) => w.c?.[i] ?? d ?? null); w.c[0] = c; };
  put("hair", p.hair); put(wear.one ? "one" : "top", p.top); if (!wear.one) put("bottom", p.bottom); put("shoes", p.shoes); return wear;
}
