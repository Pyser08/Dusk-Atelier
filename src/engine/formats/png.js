import { sha256, subtle } from '../hash.js';
import { Cancelled } from '../util.js';
import { readRange } from './risum.js';
import { b64bytes, cardToCharacter, inlineRef, offSpecToCharacter } from './card.js';
import { readAssetBytes } from './bytes.js';

export async function readPngCard(blob, onProgress, shouldStop, hooks) {
  const sig = await readRange(blob, 0, 8);
  if (sig.length < 8 || sig[0] !== 137 || sig[1] !== 80 || sig[2] !== 78 || sig[3] !== 71) throw new Error("PNG 파일이 아닙니다");
  const trimmed = [sig];
  const chunkRefs = /* @__PURE__ */ new Map();
  let chara = "", ccv3 = "", pos = 8, count = 0;
  const be322 = (b, o2) => (b[o2] << 24 | b[o2 + 1] << 16 | b[o2 + 2] << 8 | b[o2 + 3]) >>> 0;
  const dec = new TextDecoder();
  while (pos + 12 <= blob.size) {
    if (shouldStop?.()) throw new Cancelled();
    const h2 = await readRange(blob, pos, pos + 8);
    const len = be322(h2, 0);
    const type = String.fromCharCode(h2[4], h2[5], h2[6], h2[7]);
    const end = pos + 12 + len;
    if (end > blob.size) throw new Error("PNG가 잘렸습니다");
    if (type === "tEXt") {
      const head = await readRange(blob, pos + 8, pos + 8 + Math.min(len, 80));
      let z = -1;
      for (let i = 0; i < Math.min(70, head.length); i++) if (head[i] === 0) {
        z = i;
        break;
      }
      if (z >= 0) {
        const key = dec.decode(head.subarray(0, z));
        const vStart = pos + 8 + z + 1, vLen = len - z - 1;
        if (key === "chara" || key === "ccv3") {
          const v = dec.decode(await readRange(blob, vStart, vStart + vLen));
          if (key === "chara" && chara.length < 5 * 1024 * 1024) chara = v;
          if (key === "ccv3" && ccv3.length < 5 * 1024 * 1024) ccv3 = v;
        } else if (key.startsWith("chara-ext-asset_")) {
          const idx = key.replace("chara-ext-asset_:", "").replace("chara-ext-asset_", "");
          const ref = { source: "png", offset: vStart, length: vLen };
          const bytes = await readAssetBytes(blob, ref);
          chunkRefs.set(idx, { ...ref, size: bytes.length, hash: await sha256(bytes) });
          count++;
        }
      }
    } else {
      trimmed.push(await readRange(blob, pos, end));
      if (type === "IEND") break;
    }
    pos = end;
    onProgress?.(pos, blob.size, count);
  }
  if (!chara && !ccv3) throw new Error("PNG 안에 캐릭터 카드 정보가 없습니다");
  const total = trimmed.reduce((n, b) => n + b.length, 0);
  const img = new Uint8Array(total);
  let o = 0;
  for (const b of trimmed) {
    img.set(b, o);
    o += b.length;
  }
  const mainRef = { source: "mem", bytes: img, size: img.length, hash: await sha256(img) };
  let raw = ccv3 || chara;
  let card2;
  if (raw.startsWith("rcc||")) card2 = await decryptRcc(raw, hooks);
  else {
    const text = new TextDecoder().decode(b64bytes(raw));
    card2 = JSON.parse(text);
    if (typeof card2?.data?.character_version === "number") card2.data.character_version = card2.data.character_version.toString();
  }
  const assetRef = (key, mode) => {
    if (mode === true) {
      const r = chunkRefs.get(key);
      if (!r) throw new Error(`카드가 가리키는 에셋이 PNG 안에 없습니다: ${key}`);
      return r;
    }
    if (!key) return null;
    return inlineRef(mode === false ? key.split(",")[1] ?? "" : key);
  };
  const character = card2?.spec === "chara_card_v2" || card2?.spec === "chara_card_v3" ? cardToCharacter(card2, null, assetRef, mainRef) : offSpecToCharacter(card2, mainRef);
  return { kind: "png", assets: [], character, notes: card2?.data?.extensions?.risubard ? ["RisuBard 전용 확장(bardLore 등)이 있는 카드입니다. 로어북 처리 결과가 기본 임포트와 조금 다를 수 있습니다."] : [] };
}
async function decryptRcc(raw, hooks) {
  const parts = raw.split("||");
  if (parts[1] !== "rccv1" || parts.length !== 5) throw new Error("알 수 없는 암호 카드 형식입니다");
  if (!subtle) throw new Error("암호 카드는 https 또는 localhost 접속에서만 풀 수 있습니다");
  const enc = b64bytes(parts[2]);
  if (await sha256(enc) !== parts[3]) throw new Error("암호 카드가 손상되었습니다");
  const meta = JSON.parse(new TextDecoder().decode(b64bytes(parts[4])));
  let pw = "RISU_NONE";
  if (meta?.usePassword) {
    pw = await hooks?.askPassword?.();
    if (!pw) throw new Cancelled();
  }
  try {
    const keyBytes = await subtle.digest("SHA-256", new TextEncoder().encode(pw));
    const key = await subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
    const out = await subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(12) }, key, enc);
    return JSON.parse(new TextDecoder().decode(new Uint8Array(out)));
  } catch {
    throw new Error(meta?.usePassword ? "비밀번호가 틀렸습니다" : "암호 카드를 풀지 못했습니다");
  }
}
