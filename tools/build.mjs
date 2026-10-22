// Dusk Atelier 빌드: src/main.js → dusk_atelier.js (한 파일, IIFE)
// 사용: node tools/build.mjs            (package.json의 version 사용)
//       node tools/build.mjs --check    (빌드 결과를 저장소 파일과 비교만 함)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const outFile = path.join(root, 'dusk_atelier.js');

const banner = [
  '//@name dusk_atelier',
  '//@display-name Dusk Atelier',
  '//@api 3.0',
  `//@version ${version}`,
  '//@update-url https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/main/dusk_atelier.js',
  '//@link https://github.com/Pyser08/Dusk-Atelier 저장소',
  '',
  `/* Dusk Atelier v${version} — 소스: https://github.com/Pyser08/Dusk-Atelier (src/ 폴더). 이 파일은 빌드 결과물입니다. */`
].join('\n');

const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  charset: 'utf8',
  legalComments: 'none',
  define: { __VERSION__: JSON.stringify(version) },
  banner: { js: banner },
  write: false,
  logLevel: 'warning'
});
const code = result.outputFiles[0].text;

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (cur === code) { console.log(`동일함 (v${version})`); process.exit(0); }
  console.log('다름'); process.exit(1);
}
fs.writeFileSync(outFile, code);
console.log(`dusk_atelier.js v${version} (${(code.length / 1024).toFixed(1)} KB)`);
