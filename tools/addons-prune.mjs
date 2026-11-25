// jsDelivr는 브랜치 전체가 50MB를 넘으면 파일을 안 준다 → 애드온마다 내용 주소 모듈(.mjs)을 최근 KEEP개만 남긴다.
// 순서는 addons/history.json(새것이 앞). 지금 목록이 가리키는 파일은 늘 맨 앞이라 지워지지 않는다.
import fs from "node:fs";
import path from "node:path";
export const KEEP = 3, MAX_BYTES = 45 * 1048576;
export function pruneModules(dir, manifest) {
  const dist = path.join(dir, "addons/dist"), hp = path.join(dir, "addons/history.json");
  const old = fs.existsSync(hp) ? JSON.parse(fs.readFileSync(hp, "utf8")) : {}, hist = {}, keep = new Set();
  for (const a of manifest.addons) {
    const cur = `${a.id}.${a.sha256.slice(0, 12)}.mjs`;
    hist[a.id] = [...new Set([cur, ...(old[a.id] ?? [])])].filter((f) => fs.existsSync(path.join(dist, f))).slice(0, KEEP);
    if (hist[a.id][0] !== cur) throw new Error(`지금 목록의 파일이 없어요: ${cur}`);
    for (const f of hist[a.id]) keep.add(f);
  }
  // 목록에서 빠진 애드온(erosync·sdstudio 등)도 최근 것은 남긴다
  for (const [id, list] of Object.entries(old)) if (!hist[id]) { hist[id] = list.filter((f) => fs.existsSync(path.join(dist, f))).slice(0, KEEP); for (const f of hist[id]) keep.add(f); }
  const removed = fs.readdirSync(dist).filter((f) => f.endsWith(".mjs") && !keep.has(f));
  for (const f of removed) fs.rmSync(path.join(dist, f));
  fs.writeFileSync(hp, `${JSON.stringify(hist, null, 1)}\n`);
  let bytes = 0;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === ".git") continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size; } };
  walk(dir);
  if (bytes > MAX_BYTES) throw new Error(`addons 브랜치가 ${(bytes / 1048576).toFixed(1)}MB예요(한도 45MB) — 남기는 개수를 줄여 주세요.`);
  return { removed, bytes };
}
