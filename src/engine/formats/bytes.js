import { rpackDecode } from '../rpack.js';
import { readRange } from './risum.js';
import { readZipEntry } from './zip.js';
import { b64bytes } from './card.js';

export async function readAssetBytes(blob, asset) {
  if (asset.source === "zip") return readZipEntry(blob, asset.entry);
  if (asset.source === "mem") return asset.bytes.slice();
  if (asset.source === "png") {
    const text = new TextDecoder().decode(await readRange(blob, asset.offset, asset.offset + asset.length));
    return b64bytes(text);
  }
  return rpackDecode(await readRange(blob, asset.offset, asset.offset + asset.length));
}
