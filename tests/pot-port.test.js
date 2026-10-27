// v1.6.4 1단계: 리수폿 이식 대조 테스트 — 원본 번들(ref/risupot)과 이식 모듈(src/engine/pot)이 같은 입력에 같은 결과를 내는지.
// 원본은 `git fetch origin ref/risupot` 뒤 자동으로 읽는다(없으면 건너뜀). RISUPOT_SRC 환경변수로 파일 경로를 줄 수도 있다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/data/pot/MANIFEST.json'), 'utf8'));
const original = (() => {
  try {
    if (process.env.RISUPOT_SRC) return fs.readFileSync(process.env.RISUPOT_SRC, 'utf8');
    return execFileSync('git', ['show', 'origin/ref/risupot:risupot_v2_3_0.js'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { return null; }
})();
const skip = original ? false : '원본 번들 없음 (git fetch origin ref/risupot)';

// 이식 모듈 전부 불러오기
const ported = {};
const modules = {};
for (const [dir, list] of [['engine', manifest.engine], ['data', manifest.data]]) for (const n of list) {
  const mod = await import(path.join(root, `src/${dir}/pot/${n}.js`));
  modules[n] = { dir, mod };
  Object.assign(ported, mod);
}

// 원본 번들을 같은 realm에서 실행하되, startPlugin 대신 최상위 선언을 꺼내 온다.
async function loadOriginal() {
  const names = Object.keys(ported).filter((n) => n !== 'default');
  const code = original.replace(/try \{ await startPlugin\([\s\S]*$/, `globalThis.__potOriginal = { ${names.join(', ')} };\n})();`);
  await vm.runInThisContext(code, { filename: 'risupot_v2_3_0.js' });
  const o = globalThis.__potOriginal; delete globalThis.__potOriginal;
  return o;
}
const orig = original ? await loadOriginal() : {};

// 같은 난수·시각으로 두 쪽을 실행
function seeded(fn) {
  const rnd = Math.random, uuid = globalThis.crypto.randomUUID;
  let s = 12345, u = 0;
  globalThis.crypto.randomUUID = () => `00000000-0000-4000-8000-${String(++u).padStart(12, '0')}`;
  Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const RealDate = globalThis.Date, FIXED = 1767225600000; // 2026-01-01
  globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [FIXED])); } static now() { return FIXED; } };
  try { return fn(); } finally { Math.random = rnd; globalThis.Date = RealDate; globalThis.crypto.randomUUID = uuid; }
}
const outcome = async (fn) => {
  try { const v = await seeded(fn); return { ok: shape(v) }; } catch (e) { return { err: String(e?.message ?? e) }; }
};
// 함수·순환은 이름으로만 비교
function shape(v, seen = new WeakSet()) {
  if (typeof v === 'function') return `[fn ${v.name}]`;
  if (typeof v === 'symbol') return String(v);
  if (v instanceof Date) return `[date ${v.getTime()}]`;
  if (v instanceof Set) return { $set: [...v].map((x) => shape(x, seen)) };
  if (v instanceof Map) return { $map: [...v].map(([k, x]) => [shape(k, seen), shape(x, seen)]) };
  if (!v || typeof v !== 'object') return v;
  if (seen.has(v)) return '[cycle]';
  seen.add(v);
  if (Array.isArray(v)) return v.map((x) => shape(x, seen));
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k], seen)]));
}

test('이식 모듈이 원본의 최상위 선언을 빠짐없이 같은 이름으로 내보냄', { skip }, () => {
  const missing = Object.keys(ported).filter((n) => !(n in orig) || orig[n] === undefined && ported[n] !== undefined);
  assert.deepEqual(missing, []);
});

test('상수·데이터 값이 원본과 같음', { skip }, () => {
  for (const [n, v] of Object.entries(ported)) {
    if (typeof v === 'function') continue;
    assert.deepEqual(shape(v), shape(orig[n]), n);
  }
});

const HISTORY = /^\s*\/\/ (?:(?:Release|Local|PersonaName|[A-Z][A-Za-z]*) )?V\d+\b.*$\n?/gm; // tools/pot-split.mjs와 같은 규칙
test('함수 본문이 원본과 같음 (주석 이력만 제거)', { skip }, () => {
  for (const [n, v] of Object.entries(ported)) {
    if (typeof v !== 'function') continue;
    assert.equal(String(v), String(orig[n]).replace(HISTORY, ''), n);
  }
});

// 블루 아카이브 예제 입력 (기능 시험용 예제는 블아로)
const SAMPLES = [
  [], [''], ['선생님, 오늘도 샬레에 오셨네요. — 유우카'], [null], [{}], [[]], [0], [3],
  ['{{#if {{getvar::cycle}}}}호시노는 낮잠 중{{/if}} 아로나: 선생님!'],
  [{ characterId: 'ba-yuuka', chatKey: 'chat-1', characterName: '하야세 유우카' }],
  [{ type: 'Character', title: '하야세 유우카', aliases: ['유우카'], markdown: '## 프로필\n밀레니엄 세미나 회계.\n## 관계\n선생님을 믿음.' }],
  [{ enabled: true, features: {} }, 'ba-yuuka'],
  ['- 호감 +1 (선생님이 예산 정리를 도와줌)\n- 호칭: 선생님', { level: 'on', mode: 'auto' }]
];

test('모든 엔진 함수가 같은 입력에 같은 결과·같은 오류 (블루 아카이브 예제)', { skip }, async () => {
  let compared = 0;
  for (const [n, { dir, mod }] of Object.entries(modules)) {
    if (dir !== 'engine') continue;
    for (const [name, fn] of Object.entries(mod)) {
      if (typeof fn !== 'function' || /^class\s/.test(String(fn))) continue;
      for (const args of SAMPLES) {
        const a = await outcome(() => fn(...structuredClone(args)));
        const b = await outcome(() => orig[name](...structuredClone(args)));
        assert.deepEqual(a, b, `${n}.${name}(${JSON.stringify(args).slice(0, 60)})`);
        compared++;
      }
    }
  }
  assert.ok(compared > 500, `비교 ${compared}회`);
});

test('인물 위키: 유우카 문서 만들기·고치기가 원본과 같은 위키를 만듦', { skip }, async () => {
  const run = (L) => {
    let id = 0; const ids = { idFactory: () => `doc-${++id}`, sectionIdFactory: () => `sec-${++id}`, historyIdFactory: () => `his-${++id}`, now: '2026-10-27T00:00:00.000Z' };
    let scope = L.createEmptyWikiScope({ characterId: 'ba-millennium', chatKey: 'chat-1', characterName: '밀레니엄', chatName: '샬레 1일차' }, ids.now);
    scope = L.createWikiDocument(scope, { type: 'Character', title: '하야세 유우카', aliases: ['유우카'], tags: ['밀레니엄'], markdown: '## 프로필\n세미나 회계 담당.\n## 현재 상태\n예산 때문에 피곤함.' }, ids);
    scope = L.createWikiDocument(scope, { type: 'Character', title: '쿠로사키 코유키', aliases: ['코유키'], markdown: '## 프로필\n세미나 서기.' }, ids);
    scope = L.updateWikiDocument(scope, 'doc-1', { type: 'Character', title: '하야세 유우카', aliases: ['유우카', '회계'], markdown: '## 프로필\n세미나 회계 담당.\n## 현재 상태\n선생님 덕분에 예산을 맞춤.' }, ids);
    const plan = L.planPersonMerge(scope, 'doc-1', 'doc-' + Object.keys(scope.documents).find((k) => k !== 'doc-1').split('-')[1]);
    return { scope, search: L.searchValidatedWikiDocuments(scope, '유우카'), md: L.wikiSectionsToMarkdown(scope.documents['doc-1'].sections), plan: shape(plan) };
  };
  const a = await outcome(() => run(ported)), b = await outcome(() => run(orig));
  assert.ok(a.ok, a.err);
  assert.deepEqual(a, b);
});

test('월경·임신: 같은 난수로 같은 상태 전이 (날짜 없는 턴은 그대로)', { skip }, async () => {
  const run = (L) => {
    let r = 7; const random = () => ((r = (r * 48271) % 2147483647) / 2147483647);
    const out = []; let state = null;
    const days = ['2026-04-01', '2026-04-14', null, '2026-04-15', '2026-05-20', '2026-07-01', '2026-12-25', '2027-01-10'];
    for (const [i, d] of days.entries()) {
      try { state = L.nextCycleState(state, { unprotected: i % 2 === 1 }, d, { rate: 3, random }); out.push(shape(state)); }
      catch (e) { out.push('err:' + e.message); }
    }
    return { out, body: state ? L.formatCycleBody(state) : '', parsed: state ? shape(L.parseCycleBody(L.formatCycleBody(state))) : null, markers: shape(L.takeCycleMarkers('본문\n[주기: 관계 있음]\n끝')) };
  };
  assert.deepEqual(await outcome(() => run(ported)), await outcome(() => run(orig)));
});

test('말투 다변화·CBS 보임 판정이 원본과 같음', { skip }, async () => {
  const run = (L) => ({
    sign: [['off', 'ask'], ['on', 'ask'], ['on', 'auto']].map(([level, mode]) => shape(L.applySpeechSign('말투: 반말\n조짐: 1', '말투: 존댓말', { level, mode, limit: 2 }))),
    cbs: ['{{#if 1}}보임{{/if}}{{#if 0}}숨김{{/if}}', '{{#when::{{getvar::x}}::is::1}}x{{/when}}y', '{{user}}와 {{char}}'].map((t) => shape(L.evaluateCbsVisibility(t, { variables: { x: '1' }, userName: '선생님', charName: '아로나' })))
  });
  assert.deepEqual(await outcome(() => run(ported)), await outcome(() => run(orig)));
});

test('프롬프트 라이브러리가 원본과 같음', { skip }, () => {
  const lib = JSON.parse(fs.readFileSync(path.join(root, 'src/data/pot/prompts.json'), 'utf8'));
  const m = /^const RISUPOT_CONTENT = (.*);\s*$/m.exec(original);
  assert.deepEqual(lib, JSON.parse(m[1]));
});

test('분리 도구 결과가 저장소와 같음 (원본이 바뀌면 다시 생성)', { skip }, () => {
  execFileSync('node', ['tools/pot-split.mjs', '--check'], { cwd: root, stdio: 'pipe' });
});
