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

// 변경 기록: CHANGELOG.md의 최근 8개 버전을 번들에 넣어 업데이트 뒤 "새로 바뀐 점" 창에 보여 준다
const changelog = (() => {
  try {
    const md = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
    return md.split(/^## /m).slice(1).map((sec) => {
      const [head, ...rest] = sec.split('\n');
      const m = /^v?(\d+(?:\.\d+)*)\s*(?:\(([^)]*)\))?/.exec(head.trim());
      return m ? { v: m[1], date: m[2] ?? '', body: rest.join('\n').trim().slice(0, 6000) } : null;
    }).filter(Boolean).slice(0, 8);
  } catch {
    return [];
  }
})();
const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  charset: 'utf8',
  legalComments: 'none',
  // 1MB를 넘으면 RisuAI 자동 업데이트가 실패하므로 공백·이름만 줄인다.
  // minifySyntax는 쓰지 않는다: 줄바꿈 든 문자열을 템플릿 문자열로 바꿔 줄 맨 앞에 //@ 가 생길 수 있다.
  minifyWhitespace: true,
  minifyIdentifiers: true,
  define: { __VERSION__: JSON.stringify(version), __CHANGELOG__: JSON.stringify(changelog) },
  alias: { fflate: path.join(root, 'src/vendor/fflate.js') },
  banner: { js: banner },
  write: false,
  logLevel: 'warning'
});
const code = result.outputFiles[0].text;
// 번들 용량 정책: 900 KiB부터 경고, 960 KiB를 넘으면 빌드 실패
const WARN_BYTES = 900 * 1024;
const MAX_BYTES = 1024 * 1024 - 64 * 1024;
const bundleBytes = Buffer.byteLength(code, 'utf8');
console.log(`번들 크기 ${(bundleBytes / 1024).toFixed(1)} KiB (경고 ${(WARN_BYTES / 1024).toFixed(0)} KiB / 한도 ${(MAX_BYTES / 1024).toFixed(0)} KiB)`);
if (bundleBytes >= WARN_BYTES) {
  console.warn('용량 경고: 번들이 900 KiB 이상이에요. 최근 기능의 증가량과 외부 데이터 분리 가능성을 검토하세요.');
}
if (bundleBytes > MAX_BYTES) {
  console.error('빌드 중단: 번들이 960 KiB를 초과해 RisuAI 자동 업데이트 안정성을 위협해요.');
  process.exit(1);
}

// RisuAI는 파일 전체에서 줄 맨 앞의 //@ 줄을 머리말로 읽는다 (같은 이름이면 뒤쪽 값이 이김).
// 문자열 안에 줄 맨 앞 //@ 가 들어가면 버전이 엉뚱하게 바뀌므로 머리말 밖의 그런 줄은 빌드를 막는다.
const stray = code.split('\n').slice(banner.split('\n').length).filter((l) => /^\s*\/\/@/.test(l));
if (stray.length) {
  console.error('빌드 중단: 머리말 밖에 //@ 로 시작하는 줄이 있어요 (RisuAI가 버전 등으로 잘못 읽어요):');
  for (const l of stray.slice(0, 5)) console.error('  ' + l.slice(0, 80));
  process.exit(1);
}

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (cur === code) { console.log(`동일함 (v${version})`); process.exit(0); }
  console.log('다름'); process.exit(1);
}
fs.writeFileSync(outFile, code);
console.log(`dusk_atelier.js v${version} (${(code.length / 1024).toFixed(1)} KB)`);
