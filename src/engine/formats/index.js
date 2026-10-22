import { HASH_KEY } from '../hash.js';
import { readRange, scanRisum } from './risum.js';
import { cardToCharacter, missingRef, readCharx } from './card.js';
import { readPngCard } from './png.js';

export async function readIncoming(name, blob, onProgress, shouldStop, hooks = {}) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".risum")) return scanRisum(blob, onProgress, shouldStop);
  if (lower.endsWith(".png")) return readPngCard(blob, onProgress, shouldStop, hooks);
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    try {
      return { ...await readCharx(blob, onProgress, shouldStop), kind: "charx-jpeg" };
    } catch (e) {
      throw new Error(`JPEG 안에서 캐릭터 데이터(charx)를 찾지 못했습니다: ${e?.message ?? e}`);
    }
  }
  if (lower.endsWith(".json")) {
    const json = JSON.parse(new TextDecoder().decode(await readRange(blob, 0, blob.size)));
    if (json?.spec === "chara_card_v2" || json?.spec === "chara_card_v3") {
      const character = cardToCharacter(json, null, missingRef, null);
      return { kind: "card-json", assets: [], character, notes: [] };
    }
    if (json?.type !== "risuModule" || !json.name) throw new Error("RisuAI 모듈 .json이 아닙니다 (type: risuModule)");
    const { type, ...mod } = json;
    const assets = (mod.assets ?? []).map((a, index) => ({ index, name: String(a[0] ?? ""), ext: String(a[2] ?? ""), path: String(a[1] ?? ""), hash: HASH_KEY.exec(String(a[1] ?? ""))?.[1] ?? null, size: 0 }));
    return { kind: "json", module: mod, assets };
  }
  if (lower.endsWith(".charx")) return readCharx(blob, onProgress, shouldStop);
  throw new Error(".charx · .png · .jpg · .risum · .json 파일을 골라 주세요");
}
