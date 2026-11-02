// 화면 코드가 부르는 아이콘 이름이 icons.js에 모두 있는지 (없으면 모듈 그림으로 바뀌어 엉뚱한 아이콘이 보인다)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const icons = readFileSync('src/ui/icons.js', 'utf8');
const names = new Set([...icons.matchAll(/^\s+(?:"([a-z-]+)"|([a-z]+)):\s*'/gm)].map((m) => m[1] ?? m[2]));
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });

test('쓰는 아이콘 이름이 모두 정의돼 있다', () => {
  const missing = [];
  for (const f of walk('src/ui')) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(?:icon\(|icon: |iconBtn\()"([a-z-]+)"/g)) if (!names.has(m[1])) missing.push(`${m[1]} (${f})`);
  }
  assert.deepEqual(missing, []);
});
