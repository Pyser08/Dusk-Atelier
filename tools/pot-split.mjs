// 리수폿(risupot) 번들 → Dusk 모듈 분리 도구 (v1.6.4 이식용, 리수폿 업데이트 때 다시 실행)
// 원본: ref/risupot 브랜치의 risupot_v2_3_0.js (원작자 허락 받아 이식)
// 사용: node tools/pot-split.mjs [번들경로]        → src/engine/pot, src/data/pot, prompts.json 생성
//       node tools/pot-split.mjs [번들경로] --check → 생성 결과가 저장소와 같은지만 확인
// 번들 경로를 안 주면 `git show origin/ref/risupot:risupot_v2_3_0.js`를 읽는다.
//
// 동작: 번들의 "// Source: src/<이름>.mjs" 표시로 모듈을 나누고, 한 스코프에 있던 최상위 선언을
// 스코프 분석(eslint-scope)으로 추적해 다른 모듈이 쓰는 이름만 export, 쓰는 쪽엔 import를 붙인다.
// 화면(UI) 모듈과 CSS·셸 HTML은 가져오지 않는다(Dusk 화면으로 새로 만듦). 프롬프트 라이브러리는 JSON으로.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const file = args.find((a) => !a.startsWith('--'));
const src = (file ? fs.readFileSync(file, 'utf8') : execFileSync('git', ['show', 'origin/ref/risupot:risupot_v2_3_0.js'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 })).replace(/\r\n/g, '\n');
const version = /^\/\/@version (\S+)/m.exec(src)?.[1] ?? '?';

// ── 분류 ──────────────────────────────────────────────
// UI: 화면 모듈. 이식하지 않음(5단계에서 Dusk 화면으로 새로 만들 때 원본을 참고).
const isUI = (n) => /-ui$|^ui$|^ui-registration$|^redesign-ui$|^inspector|^section-fold$|^model-editor$|^people-entry-editor$|^people-wiki-details$/.test(n);
// DATA: 저장소·모델 호출·턴 훅·추적처럼 호스트(risuai)·시간·네트워크에 닿는 모듈. 나머지는 ENGINE(순수 로직).
const DATA = new Set(['render-guard', 'local-keys', 'user-identity-host', 'trace-turn', 'runtime-trace', 'backup', 'writer-receipts',
  'wiki-store', 'wiki-controller', 'orphan-cleanup', 'chat-source', 'people-import', 'vertex-client', 'provider-errors', 'copilot-client',
  'llm-client', 'summary-controller', 'writer-batch', 'writer-controller', 'auto-wiki', 'router-runtime', 'director-runtime',
  'director-search', 'main-wiki-hook', 'runtime-hooks', 'mission-progress', 'writer-force', 'writer-recovery', 'people-command',
  'manual-ai-reference', 'people-metric-ai', 'person-refresh', 'person-thorough-refresh']);
const SKIP = new Set(['plugin', '_pre']);
const dirOf = (n) => (DATA.has(n) ? 'src/data/pot' : 'src/engine/pot');

// ── 파싱 ──────────────────────────────────────────────
const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowAwaitOutsideFunction: true, ranges: true });
const fnNode = ast.body[0].expression.callee;
const scope = escope.analyze(ast, { ecmaVersion: 2022 }).acquire(fnNode);
const marks = [...src.matchAll(/^\/\/ Source: src\/(.+?)\.mjs.*$/gm)].map((m) => ({ name: m[1], start: m.index, end: m.index + m[0].length }));
const modOf = (p) => { let r = '_pre'; for (const m of marks) if (m.start <= p) r = m.name; return r; };

const idsOfStmt = (s) => (s.type === 'VariableDeclaration' ? s.declarations.flatMap((d) => idsOf(d.id)) : [s.id?.name]);
function idsOf(p) {
  if (p.type === 'Identifier') return [p.name];
  if (p.type === 'ObjectPattern') return p.properties.flatMap((x) => idsOf(x.value ?? x.argument));
  if (p.type === 'ArrayPattern') return p.elements.filter(Boolean).flatMap(idsOf);
  if (p.type === 'AssignmentPattern') return idsOf(p.left);
  if (p.type === 'RestElement') return idsOf(p.argument);
  return [];
}
const stmts = fnNode.body.body.filter((s) => /Declaration$/.test(s.type));
const stmtOf = new Map(); // 이름 → 선언문
for (const s of stmts) for (const id of idsOfStmt(s)) stmtOf.set(id, s);
const vars = scope.variables.filter((v) => v.defs.length);
for (const v of vars) if (v.defs.length > 1) throw new Error(`중복 선언: ${v.name}`);
const fnScope = (sc) => { while (sc && sc.type !== 'function' && sc.type !== 'global') sc = sc.upper; return sc; };
const stmtAt = (pos) => stmts.find((s) => s.start <= pos && pos < s.end);
const keep = (n) => !SKIP.has(n) && !isUI(n);

// ── 순환 import 끊기 ──────────────────────────────────
// 번들은 한 스코프라 순서만 맞으면 됐지만, ESM에선 순환 import 안에서 "최상위 실행 중에" 상대 모듈 값을 쓰면
// 초기화 전 접근(TDZ) 오류가 난다. 그런 선언(과 같은 모듈 안에서 그것이 쓰는 선언 전부)을 <모듈>-shared.js로 옮긴다.
const base = new Map(); // 이름 → 원래 모듈
for (const v of vars) base.set(v.name, modOf(v.defs[0].node.range[0]));
const graph = new Map(); // 모듈 → 의존 모듈
for (const v of vars) for (const r of v.references) {
  const u = modOf(r.identifier.range[0]), o = base.get(v.name);
  if (u !== o && keep(u) && keep(o)) (graph.get(u) ?? graph.set(u, new Set()).get(u)).add(o);
}
const reach = (from, to) => { const seen = new Set([from]); const st = [from]; while (st.length) { const x = st.pop(); if (x === to) return true; for (const y of graph.get(x) ?? []) if (!seen.has(y)) { seen.add(y); st.push(y); } } return false; };
const moved = new Set();
const addMove = (name) => {
  if (moved.has(name)) return;
  const s = stmtOf.get(name); const o = base.get(name);
  for (const id of idsOfStmt(s)) moved.add(id);
  for (const v of vars) if (base.get(v.name) === o && !moved.has(v.name) && v.references.some((r) => r.identifier.range[0] >= s.start && r.identifier.range[0] < s.end)) addMove(v.name);
};
for (const v of vars) for (const r of v.references) {
  const u = modOf(r.identifier.range[0]), o = base.get(v.name);
  if (u === o || !keep(u) || !keep(o) || fnScope(r.from) !== scope) continue;
  if (reach(o, u)) addMove(v.name); // o가 (돌아서) u를 import → 순환 → 옮김
}
const owner = (name) => (moved.has(name) ? base.get(name) + '-shared' : base.get(name));
const baseOfMod = (m) => m.replace(/-shared$/, '');

const mods = new Map(); // 모듈 → { stmts, exports, imports }
const M = (n) => { if (!mods.has(n)) mods.set(n, { stmts: [], exports: new Set(), imports: new Map() }); return mods.get(n); };
for (const s of stmts) M(owner(idsOfStmt(s)[0])).stmts.push(s);
const userOf = (pos) => { const s = stmtAt(pos); return s ? owner(idsOfStmt(s)[0]) : modOf(pos); };

let content = null;
const missing = new Map(); // 이식 모듈이 쓰는데 UI·plugin에만 있는 이름
for (const v of vars) {
  const o = owner(v.name);
  if (v.name === 'RISUPOT_CONTENT') content = v.defs[0].node.init;
  for (const r of v.references) {
    const u = userOf(r.identifier.range[0]);
    if (u === o || !keep(baseOfMod(u))) continue;
    if (r.isWrite()) throw new Error(`다른 모듈 변수에 대입: ${v.name} (${u})`);
    if (!keep(baseOfMod(o))) { (missing.get(v.name) ?? missing.set(v.name, new Set()).get(v.name)).add(u); continue; }
    M(o).exports.add(v.name);
    const im = M(u).imports;
    (im.get(o) ?? im.set(o, new Set()).get(o)).add(v.name);
  }
}

// Dusk 어댑터(src/data/modelhub.js)가 직접 쓰는 이름은 다른 이식 모듈이 안 써도 항상 내보낸다.
const PUBLIC = ['LocalKeyStore', 'LlmClientError', 'testModelConnection', 'providerModelList', 'copilotLoginStep', 'SettingsStore', 'WikiController', 'SummaryController', 'AutoWikiController', 'MainWikiHook', 'RuntimeTraceStore', 'WriterController', 'RuntimeHookManager', 'storyDateFromText',
  // 7단계 B: 인물 화면의 AI 도구가 쓰는 컨트롤러
  'PersonRefreshController', 'PeopleCommandController', 'PeopleFieldController', 'PeopleMetricAIController', 'WriterRecoveryController', 'PersonaNameController', 'OrphanCleanupController', 'PeopleImportController'];
for (const n of PUBLIC) { if (!vars.some((v) => v.name === n)) throw new Error(`PUBLIC 이름 없음: ${n}`); M(owner(n)).exports.add(n); }

// ── 출력 ──────────────────────────────────────────────
const HISTORY = /^\s*\/\/ (?:(?:Release|Local|PersonaName|[A-Z][A-Za-z]*) )?V\d+\b.*$\n?/gm;
const files = new Map();
const header = (n) => `// 출처: risupot ${version} src/${baseOfMod(n)}.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)\n`;
const exportText = (m, s) => {
  const ids = idsOfStmt(s);
  if (!ids.some((id) => m.exports.has(id))) return src.slice(s.start, s.end);
  ids.forEach((id) => m.exports.add(id)); // 한 문장에 여러 이름이면 전부 내보냄(동작 동일)
  return 'export ' + src.slice(s.start, s.end);
};
const modText = (name) => {
  const m = M(name);
  if (name.endsWith('-shared')) return m.stmts.map((s) => exportText(m, s)).join('\n');
  const mk = marks.find((x) => x.name === name);
  const bodyStart = mk.end + 1, next = marks.find((x) => x.start > mk.start)?.start ?? src.length;
  // 이 범위 안의 선언문을 (옮긴 것은 빼고) export 붙여 다시 조립, 사이의 주석·공백은 그대로
  const inRange = stmts.filter((s) => s.start >= bodyStart && s.start < next);
  let out = '', pos = bodyStart;
  for (const s of inRange) {
    out += src.slice(pos, s.start);
    out += moved.has(idsOfStmt(s)[0]) ? '' : exportText(m, s);
    pos = s.end;
    if (moved.has(idsOfStmt(s)[0]) && src[pos] === '\n') pos++;
  }
  return out + src.slice(pos, next);
};
const order = [];
for (const { name } of marks) { if (!keep(name)) continue; if (M(name + '-shared').stmts.length) order.push(name + '-shared'); if (M(name).stmts.length) order.push(name); }
const texts = new Map(order.map((n) => [n, modText(n)])); // export 표시가 imports에 반영되도록 먼저 만든다
for (const name of order) {
  const m = M(name);
  const imports = [...m.imports].sort(([a], [b]) => a.localeCompare(b)).map(([dep, names]) => {
    let rel = path.relative(dirOf(baseOfMod(name)), path.join(dirOf(baseOfMod(dep)), dep + '.js')).replaceAll('\\', '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return `import { ${[...names].sort().join(', ')} } from '${rel}';`;
  });
  const text = texts.get(name).replace(HISTORY, '');
  files.set(path.join(dirOf(baseOfMod(name)), name + '.js'), header(name) + (imports.length ? imports.join('\n') + '\n\n' : '\n') + text.trim() + '\n');
}
if (missing.size) {
  console.error('이식 모듈이 UI/plugin 이름을 씀 — 분류를 고쳐야 함:');
  for (const [n, users] of missing) console.error(`  ${n} ← ${[...users].join(', ')}`);
  process.exit(1);
}
// Dusk 연결용 작은 고정 패치(tools/pot-patches.json, 문자열 정확 일치). 원본이 바뀌어 안 맞으면 생성이 멈춘다 → 어댑터 쪽을 다시 확인할 것.
// 패치된 코드는 훅이 비어 있으면 원본과 똑같이 동작하고, Dusk 어댑터가 훅을 채울 때만 달라진다.
const PATCHES = JSON.parse(fs.readFileSync(path.join(root, 'tools/pot-patches.json'), 'utf8'));
for (const pt of PATCHES) {
  const text = files.get(pt.file);
  const n = text ? text.split(pt.from).length - 1 : 0;
  if (n !== (pt.count ?? 1)) { console.error(`패치 실패(${n}회 일치): ${pt.file} — ${pt.why}`); process.exit(1); }
  files.set(pt.file, text.split(pt.from).join(pt.to));
}
// 프롬프트 라이브러리 (리스 프롬프트 키 → 텍스트). 순서·내용 그대로.
const lib = Function(`"use strict";return (${src.slice(content.start, content.end)})`)();
files.set('src/data/pot/prompts.json', JSON.stringify(lib, null, 1) + '\n');
// 목록
const index = [...files.keys()].filter((f) => f.endsWith('.js')).map((f) => path.basename(f, '.js')).sort();
files.set('src/data/pot/MANIFEST.json', JSON.stringify({ source: `risupot ${version}`, engine: index.filter((n) => !DATA.has(baseOfMod(n))), data: index.filter((n) => DATA.has(baseOfMod(n))) }, null, 1) + '\n');

let diff = 0;
for (const [rel, text] of files) {
  const abs = path.join(root, rel);
  const cur = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (cur === text) continue;
  diff++;
  if (check) console.log('다름: ' + rel);
  else { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, text); }
}
console.log(`${check ? '확인' : '생성'}: ${files.size}개 파일, 바뀐 것 ${diff}개 (risupot ${version})`);
if (check && diff) process.exit(1);
