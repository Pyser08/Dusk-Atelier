// Dusk Cellar용 분석 엔진 묶음: src/cellar/node-entry.js → (Cellar 저장소)/engine/atelier-engine.mjs
// 사용: node tools/build-cellar-engine.mjs <Cellar 저장소 폴더>   (기본: ../Dusk-Cellar)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const cellar = path.resolve(process.argv[2] ?? path.join(root, '..', 'Dusk-Cellar'));
if (!fs.existsSync(cellar)) { console.error(`Cellar 폴더를 찾지 못했어요: ${cellar}`); process.exit(1); }
const out = path.join(cellar, 'engine', 'atelier-engine.mjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
await build({
  entryPoints: [path.join(root, 'src/cellar/node-entry.js')], bundle: true, format: 'esm', platform: 'node', target: 'node22',
  outfile: out, legalComments: 'none', logLevel: 'warning',
  banner: { js: `// Dusk Atelier v${pkg.version} 분석 엔진(빌드 결과물, 직접 고치지 마세요). 만든 곳: Atelier tools/build-cellar-engine.mjs\n// 라이선스: GNU AGPL-3.0-only (Dusk Atelier)` }
});
console.log(`${out} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
