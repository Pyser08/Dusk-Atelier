// pot-split로 생성된 모듈에 Dusk 패치를 적용한다. 이미 적용된 패치는 그대로 둔다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const patches = JSON.parse(fs.readFileSync(path.join(root, 'tools/pot-patches.json'), 'utf8'));
const files = new Map();
for (const patch of patches) {
  const file = path.join(root, patch.file);
  const text = files.get(file) ?? fs.readFileSync(file, 'utf8');
  const expected = patch.count ?? 1;
  const fromCount = text.split(patch.from).length - 1;
  const toCount = text.split(patch.to).length - 1;
  if (fromCount === expected && toCount === expected && patch.to.includes(patch.from)) {
    files.set(file, text);
    continue;
  }
  if (fromCount === 0 && toCount === expected) {
    files.set(file, text);
    continue;
  }
  if (fromCount !== expected) throw new Error(`패치 실패(${fromCount}회 일치): ${patch.file} — ${patch.why}`);
  files.set(file, text.split(patch.from).join(patch.to));
}
let changed = 0;
for (const [file, text] of files) {
  const original = fs.readFileSync(file, 'utf8');
  if (original === text) continue;
  fs.writeFileSync(file, text);
  changed++;
}
console.log(`Dusk 패치 적용: ${patches.length}개, 변경 파일 ${changed}개`);
