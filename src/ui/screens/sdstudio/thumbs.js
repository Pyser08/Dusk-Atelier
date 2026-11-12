// 에셋 제작 썸네일: 브라우저 IndexedDB에 작은 썸네일(webp)을 남겨 다음에 열 때 원본 PNG(1~2MB)를 다시 읽고 줄이지 않게.
// 화면에 보일 때만(IntersectionObserver) 읽고, 동시에 6장씩. IndexedDB가 없으면(시크릿 창 등) 호스트 썸네일만 씀.
var DB = "dusk-sds-thumbs", ST = "t", MAX = 12000;
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
const tx = async (mode, fn) => { const d = await db(); if (!d) return null; return new Promise((res) => { try { const t = d.transaction(ST, mode), q = fn(t.objectStore(ST)); t.oncomplete = () => res(q?.result ?? null); t.onerror = () => res(null); t.onabort = () => res(null); } catch { res(null); } }); };
export var getThumb = (path) => tx("readonly", (s) => s.get(path));
let puts = 0;
export async function putThumb(path, blob) {
  if (!blob || blob.size > 400 * 1024) return;
  await tx("readwrite", (s) => s.put(blob, path));
  if (++puts % 200 === 0) {   // 가끔 개수 확인 — 넘치면 앞쪽부터 지움
    const n = await tx("readonly", (s) => s.count());
    if (n > MAX) await tx("readwrite", (s) => { const r = s.openCursor(); let k = n - MAX + 500; r.onsuccess = () => { const c = r.result; if (c && k-- > 0) { c.delete(); c.continue(); } }; return r; });
  }
}
export var dropThumb = (path) => tx("readwrite", (s) => s.delete(path));

// ── 그림 원본 캐시: OPFS(브라우저 전용 파일 공간) — 리스 저장소(서버면 네트워크)를 다시 거치지 않게. 없으면 null ──
// 이름 = 경로를 안전한 파일 이름으로. 최대 개수를 넘으면 오래된(lastModified) 것부터 지움.
var OMAX = 2500;
let odir = null;
async function opfs() {
  if (odir !== null) return odir;
  try { const root = await navigator.storage?.getDirectory?.(); odir = root ? await root.getDirectoryHandle("dusk-sds-img", { create: true }) : false; }
  catch { odir = false; }
  return odir;
}
var fname = (path) => encodeURIComponent(path).replace(/%/g, "_").slice(0, 200);
export async function getOrig(path) {
  const d = await opfs(); if (!d) return null;
  try { const f = await (await d.getFileHandle(fname(path))).getFile(); return f.size ? new Uint8Array(await f.arrayBuffer()) : null; } catch { return null; }
}
let oputs = 0;
export async function putOrig(path, data) {
  const d = await opfs(); if (!d || !data?.length) return;
  try {
    const fh = await d.getFileHandle(fname(path), { create: true });
    if (fh.createWritable) { const w = await fh.createWritable(); await w.write(data); await w.close(); }   // 다 쓴 뒤 바꿔치기(중간에 꺼져도 깨진 파일 안 남음)
    else return;
  } catch { return; }
  if (++oputs % 100 === 0) pruneOrig().catch(() => {});
}
async function pruneOrig() {
  const d = await opfs(); if (!d) return;
  const all = [];
  for await (const [n, h] of d.entries()) { if (h.kind !== "file") continue; try { all.push([n, (await h.getFile()).lastModified]); } catch { /* 넘김 */ } }
  if (all.length <= OMAX) return;
  all.sort((a, b) => a[1] - b[1]);
  for (const [n] of all.slice(0, all.length - OMAX + 200)) await d.removeEntry(n).catch(() => {});
}

// 작은 썸네일 만들기(이미 가진 바이트에서)
export async function makeThumb(data, size = 320) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: "image/png" });
  if (typeof createImageBitmap !== "function") return blob;
  try {
    const bmp = await createImageBitmap(blob), sc = Math.min(1, size / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * sc)), hh = Math.max(1, Math.round(bmp.height * sc));
    let out;
    if (typeof OffscreenCanvas === "function") { const c = new OffscreenCanvas(w, hh); c.getContext("2d").drawImage(bmp, 0, 0, w, hh); out = await c.convertToBlob({ type: "image/webp", quality: 0.8 }); }
    else { const c = document.createElement("canvas"); c.width = w; c.height = hh; c.getContext("2d").drawImage(bmp, 0, 0, w, hh); out = await new Promise((r) => c.toBlob(r, "image/webp", 0.8)); }
    bmp.close?.();
    return out ?? blob;
  } catch { return blob; }
}

// 보일 때 불러오기. load(path) → Promise<url|null>
export function createLazy(root, load, { concurrency = 6 } = {}) {
  const waiting = new Set(); let active = 0;
  const pump = () => {
    while (active < concurrency && waiting.size) {
      const img = waiting.values().next().value; waiting.delete(img);
      if (!img.isConnected) continue;
      active++;
      load(img.dataset.path).then((u) => { if (u) { img.src = u; img.dataset.loaded = "1"; } else img.dataset.failed = "1"; }).catch(() => { img.dataset.failed = "1"; }).finally(() => { active--; pump(); });
    }
  };
  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((items) => {
    for (const it of items) { if (it.isIntersecting) { io.unobserve(it.target); waiting.add(it.target); } else waiting.delete(it.target); }
    pump();
  }, { root, rootMargin: "600px 0px" }) : null;
  return {
    observe(img) { if (io) io.observe(img); else { waiting.add(img); pump(); } },
    disconnect() { io?.disconnect(); waiting.clear(); }
  };
}

// 많은 카드를 나눠 붙이기: 처음 first개, 끝에 닿으면 step개씩
export function chunkedAppend(container, items, make, { first = 120, step = 160, root = null, onCount } = {}) {
  let i = 0;
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "grid-column:1/-1;height:1px";
  const more = () => { const end = Math.min(items.length, i + (i ? step : first)); const frag = document.createDocumentFragment(); for (; i < end; i++) frag.appendChild(make(items[i], i)); container.insertBefore(frag, sentinel); onCount?.(i); if (i >= items.length) { io?.disconnect(); sentinel.remove(); } };
  container.appendChild(sentinel);
  const io = typeof IntersectionObserver === "function" && items.length > first ? new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) more(); }, { root, rootMargin: "800px 0px" }) : null;
  more();
  if (io && i < items.length) io.observe(sentinel);
  else if (i < items.length) while (i < items.length) more();
  return container;
}
