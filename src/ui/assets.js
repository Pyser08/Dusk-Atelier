var MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", svg: "image/svg+xml", mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", mp4: "video/mp4", webm: "video/webm" };
export var mimeOf = (ext, bytes) => {
  if (bytes?.length > 12) {
    const b = bytes;
    if (b[0] === 137 && b[1] === 80) return "image/png";
    if (b[0] === 255 && b[1] === 216) return "image/jpeg";
    if (b[0] === 71 && b[1] === 73) return "image/gif";
    if (b[0] === 82 && b[1] === 73 && b[8] === 87 && b[9] === 69) return "image/webp";
    if (b[4] === 102 && b[5] === 116 && b[6] === 121 && b[7] === 112 && b[8] === 97 && b[9] === 118) return "image/avif";
  }
  return MIME[String(ext ?? "").toLowerCase()] ?? "application/octet-stream";
};
export var isImageExt = (ext) => /^(png|jpe?g|webp|gif|avif|svg)$/i.test(String(ext ?? "")) || !ext;
export function createAssetLoader(api, { concurrency = 8, thumbSize = 240, maxBytesCache = 96 * 1024 * 1024 } = {}) {
  const inflight = /* @__PURE__ */ new Map();
  const bytes = /* @__PURE__ */ new Map();
  let cachedBytes = 0;
  const thumbs = /* @__PURE__ */ new Map();
  const thumbInflight = /* @__PURE__ */ new Map();
  const queue = [];
  let active = 0;
  const remember = (path, data) => {
    if (!data || data.length > maxBytesCache / 4) return;
    bytes.set(path, data);
    cachedBytes += data.length;
    while (cachedBytes > maxBytesCache && bytes.size) {
      const [k, v] = bytes.entries().next().value;
      bytes.delete(k);
      cachedBytes -= v.length;
    }
  };
  const pump = () => {
    while (active < concurrency && queue.length) {
      queue.sort((a, b) => b.prio - a.prio);
      const job = queue.shift();
      if (job.signal?.aborted) {
        job.resolve(null);
        continue;
      }
      active++;
      Promise.resolve().then(() => api.readImage(job.path)).then((d) => {
        const u8 = d ? d instanceof Uint8Array ? d : new Uint8Array(d) : null;
        job.resolve(u8);
      }).catch(job.reject).finally(() => {
        active--;
        pump();
      });
    }
  };
  function read(path, { prio = 0, signal } = {}) {
    if (!path) return Promise.resolve(null);
    if (path.startsWith("data:")) {
      const b642 = path.split(",")[1] ?? "";
      const bin = atob(b642);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return Promise.resolve(u8);
    }
    const hit = bytes.get(path);
    if (hit) {
      bytes.delete(path);
      bytes.set(path, hit);
      return Promise.resolve(hit);
    }
    if (inflight.has(path)) return inflight.get(path);
    const p = new Promise((resolve, reject) => {
      queue.push({ path, resolve, reject, prio, signal });
      pump();
    }).then((d) => {
      inflight.delete(path);
      if (d) remember(path, d);
      return d;
    }, (e) => {
      inflight.delete(path);
      throw e;
    });
    inflight.set(path, p);
    return p;
  }
  async function makeThumb(data, ext) {
    const type = mimeOf(ext, data);
    const blob = new Blob([data], { type });
    if (!type.startsWith("image/") || type === "image/svg+xml" || type === "image/gif" || data.length < 48 * 1024 || typeof createImageBitmap !== "function") return URL.createObjectURL(blob);
    try {
      const bmp = await createImageBitmap(blob);
      const scale = Math.min(1, thumbSize / Math.max(bmp.width, bmp.height));
      if (scale >= 1) {
        bmp.close?.();
        return URL.createObjectURL(blob);
      }
      const w = Math.max(1, Math.round(bmp.width * scale)), hgt = Math.max(1, Math.round(bmp.height * scale));
      let out;
      if (typeof OffscreenCanvas === "function") {
        const c = new OffscreenCanvas(w, hgt);
        c.getContext("2d").drawImage(bmp, 0, 0, w, hgt);
        out = await c.convertToBlob({ type: "image/webp", quality: 0.82 });
      } else {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = hgt;
        c.getContext("2d").drawImage(bmp, 0, 0, w, hgt);
        out = await new Promise((r) => c.toBlob(r, "image/webp", 0.82));
      }
      bmp.close?.();
      return URL.createObjectURL(out ?? blob);
    } catch {
      return URL.createObjectURL(blob);
    }
  }
  function thumb(path, ext, opts) {
    if (thumbs.has(path)) return Promise.resolve(thumbs.get(path));
    if (thumbInflight.has(path)) return thumbInflight.get(path);
    const p = read(path, opts).then((d) => d ? makeThumb(d, ext) : null).then((url) => {
      thumbInflight.delete(path);
      if (url) thumbs.set(path, url);
      return url;
    }, (e) => {
      thumbInflight.delete(path);
      throw e;
    });
    thumbInflight.set(path, p);
    return p;
  }
  async function fullUrl(path, ext) {
    const d = await read(path, { prio: 100 });
    return d ? URL.createObjectURL(new Blob([d], { type: mimeOf(ext, d) })) : null;
  }
  function lazy(root) {
    const ctl = /* @__PURE__ */ new Map();
    const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((items) => {
      for (const it of items) {
        const img = it.target;
        if (it.isIntersecting) {
          if (img.dataset.loaded) continue;
          const ac = new AbortController();
          ctl.set(img, ac);
          const prio = 50 - Math.min(49, Math.abs(it.boundingClientRect.top - (it.rootBounds?.top ?? 0)) / 100);
          thumb(img.dataset.path, img.dataset.ext, { prio, signal: ac.signal }).then((url) => {
            if (!url) {
              if (!ac.signal.aborted) img.dataset.failed = "1";
              return;
            }
            img.src = url;
            img.dataset.loaded = "1";
            io.unobserve(img);
          }).catch(() => {
            img.dataset.failed = "1";
          });
        } else {
          ctl.get(img)?.abort();
          ctl.delete(img);
        }
      }
    }, { root, rootMargin: "300px 0px" }) : null;
    return {
      observe(img) {
        const u = thumbs.get(img.dataset.path);
        if (u) {
          img.src = u;
          img.dataset.loaded = "1";
          return;
        }
        if (io) io.observe(img);
        else thumb(img.dataset.path, img.dataset.ext).then((u2) => {
          if (u2) img.src = u2;
        });
      },
      disconnect() {
        io?.disconnect();
        for (const a of ctl.values()) a.abort();
        ctl.clear();
      }
    };
  }
  function forget(path) {
    const u = thumbs.get(path);
    if (u) URL.revokeObjectURL(u);
    thumbs.delete(path);
    const b = bytes.get(path);
    if (b) {
      cachedBytes -= b.length;
      bytes.delete(path);
    }
  }
  return { read, thumb, fullUrl, lazy, forget, peek: (p) => thumbs.get(p), stats: () => ({ active, queued: queue.length, cachedBytes, thumbs: thumbs.size }) };
}
