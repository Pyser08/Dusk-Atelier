import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'parts/theme-builder/main.js');
const out = path.join(root, 'parts/theme-builder.js');
const result = await build({
  entryPoints: [entry], bundle: true, format: 'iife', target: 'es2022', charset: 'utf8',
  legalComments: 'none', minifyWhitespace: true, minifyIdentifiers: true,
  alias: { fflate: path.join(root, 'src/vendor/fflate.js') }, write: false, logLevel: 'warning'
});
const banner = [
  '//@name dusk_atelier_theme_builder',
  '//@display-name Dusk Atelier 테마 빌더',
  '//@api 3.0',
  '//@version 0.1.0',
  '//@update-url https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/test/parts-updates/parts/theme-builder.js',
  '//@allowed-ipc dusk_atelier',
  ''
].join('\n');
const code = banner + result.outputFiles[0].text;
const max = 1024 * 1024 - 64 * 1024;
if (Buffer.byteLength(code) > max) throw new Error(`테마 빌더 Part가 너무 커요: ${(Buffer.byteLength(code) / 1024).toFixed(0)} KiB`);
fs.writeFileSync(out, code);
console.log(`parts/theme-builder.js ${(Buffer.byteLength(code) / 1024).toFixed(1)} KiB`);
