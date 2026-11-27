// 장기기억 애드온(0.3.22): 캐릭터 상태창 얼굴 사진. 봇 이미지·에셋에서 그 인물 이름에 맞는 기본 사진을 찾아 작은 썸네일(데이터 URL)로 만든다.
// 못 찾거나 이 환경에서 그림을 줄일 수 없으면 null → 상태창은 원래대로 글자 동그라미.
const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");

// 신고 #5: 이름 정규화는 캐릭터마다 한 번만(인물 수 × 에셋 수만큼 되풀이하던 것)
const pools = new WeakMap();
function poolOf(character) {
  let p = pools.get(character);
  if (!p) pools.set(character, p = [...(character.emotionImages ?? []).map((x) => ({ n: x?.[0], p: x?.[1] })), ...(character.additionalAssets ?? []).map((x) => ({ n: x?.[0], p: x?.[1] }))].filter((x) => x.n && x.p).map((x) => ({ ...x, k: nk(x.n) })));
  return p;
}

// 순수: 캐릭터(봇) 데이터에서 이름에 맞는 이미지 경로. 봇 본인 이름이면 봇 대표 이미지
export function imagePathFor(character, names = []) {
  if (!character) return "";
  const keys = names.map(nk).filter((k) => k.length >= 1);
  if (!keys.length) return "";
  if (keys.includes(nk(character.name)) && character.image) return character.image;
  const pool = poolOf(character);
  const DEF = /(기본|default|neutral|normal|평소|idle|base|profile|프로필|얼굴|face|portrait)/i;
  const hits = pool.filter((x) => keys.some((k) => x.k.includes(k)));
  if (!hits.length) return "";
  return (hits.find((x) => keys.some((k) => x.k === k)) ?? hits.find((x) => DEF.test(x.n)) ?? hits[0]).p;
}

// 바이트 → 정사각 썸네일 JPEG 데이터 URL(가운데 위쪽을 잘라 얼굴이 보이게). 브라우저 기능이 없으면 null
export async function thumbOf(bytes, size = 72) {
  try {
    if (!bytes || typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return null;
    const bmp = await createImageBitmap(new Blob([bytes]));
    const s = Math.min(bmp.width, bmp.height), sx = (bmp.width - s) / 2, sy = Math.max(0, (bmp.height - s) * 0.18);
    const cv = new OffscreenCanvas(size, size), g = cv.getContext("2d");
    g.drawImage(bmp, sx, sy, s, s, 0, 0, size, size); bmp.close?.();
    const blob = await cv.convertToBlob({ type: "image/jpeg", quality: 0.72 });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return `data:image/jpeg;base64,${btoa(bin)}`;
  } catch { return null; }
}

// 경로별 캐시(같은 세션)
const cache = new Map();
export const THUMB_MAX = 80;
export const thumbCacheSize = () => cache.size;
export async function charThumb(api, character, names) {
  const p = imagePathFor(character, names); if (!p) return null;
  if (cache.has(p)) { const j = cache.get(p); cache.delete(p); cache.set(p, j); return j; }   // 최근에 쓴 것을 뒤로
  const job = (async () => { try { const raw = await api.readImage?.(p); const u8 = raw ? (raw instanceof Uint8Array ? raw : new Uint8Array(raw)) : null; return u8 ? await thumbOf(u8) : null; } catch { return null; } })();
  cache.set(p, job);
  while (cache.size > THUMB_MAX) cache.delete(cache.keys().next().value);   // 신고 #31: 끝없이 쌓이지 않게 최근 THUMB_MAX개만
  return job;
}
