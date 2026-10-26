// 카드 미리보기 캔버스. 그림 에셋은 한 번만 읽어 두고, 그리기 요청은 마지막 것만 처리한다.
import { h } from "../dom.js";
import { drawCard, decodeImage } from "./render.js";

export function cardPreview(ctx) {
  const canvas = h("canvas", { class: "rb-card-canvas", role: "img", "aria-label": "카드 미리보기" });
  const cache = { ref: undefined, bmp: null };
  let busy = false, pending = null;
  async function bitmapFor(ref) {
    if (cache.ref === (ref ?? null)) return cache.bmp;
    cache.ref = ref ?? null; cache.bmp = null;
    if (ref) { try { cache.bmp = await decodeImage(await ctx.assets.read(ref, { prio: 100 })); } catch { cache.bmp = null; } }
    return cache.bmp;
  }
  async function draw(card) {
    pending = card; if (busy) return; busy = true;
    try {
      while (pending) {
        const c = pending; pending = null;
        canvas.setAttribute("aria-label", `${c.name} 카드, 등급 ${c.grade}`);
        await drawCard(c, await bitmapFor(c.image?.ref), { canvas });
      }
    } finally { busy = false; }
  }
  return { el: canvas, draw, bitmapFor };
}

// 에셋 썸네일 버튼
export function assetThumb(ctx, a, { selected = false, onClick } = {}) {
  const img = h("img", { alt: a.name, loading: "lazy" });
  ctx.assets.thumb(a.path, a.ext, { prio: 60 }).then((u) => { if (u) img.src = u; }).catch(() => {});
  return h("button", { type: "button", class: "rb-card-thumb", "aria-pressed": selected ? "true" : "false", title: a.name, onClick }, img, h("span", null, a.name));
}
