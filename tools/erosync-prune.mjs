// Erosync 이식 본체(src/erosync/erosync.js)에서 도달할 수 없는 선언(원본 화면 코드 등)을 지운다.
// 사용: node tools/erosync-prune.mjs [--write] [--why 이름] [--stub 이름,이름]
// 방식: bootErosync 안쪽 최상위 선언의 이름 참조 그래프를 만들고, 실행되는 문장(try·return 등)에서 닿는 것만 남긴다.
//       이름만 보고 따라가므로 지역 변수와 이름이 겹치면 더 남길 뿐 잘못 지우지는 않는다(보수적).
import * as acorn from "acorn";
import fs from "node:fs";
const FILE = "src/erosync/erosync.js";
const args = process.argv.slice(2), has = (f) => args.includes(f), val = (f) => args[args.indexOf(f) + 1];
let src = fs.readFileSync(FILE, "utf8");

// 1) 지정한 함수는 본문을 비운다(화면 쪽으로 이어지는 연결을 끊는 용도). 변경 기록은 STUBS 상수로 남긴다.
const STUBS = (has("--stub") ? val("--stub").split(",") : []).filter(Boolean);
const parse = (text) => acorn.parse(text, { ecmaVersion: "latest", sourceType: "module" });
function bootOf(ast) { const n = ast.body.find((x) => (x.declaration ?? x).id?.name === "bootErosync"); return n.declaration ?? n; }
if (STUBS.length) {
  const ast = parse(src), fn = bootOf(ast); const edits = [];
  for (const st of fn.body.body) if (st.type === "FunctionDeclaration" && STUBS.includes(st.id.name)) edits.push([st.body.start, st.body.end, "{ /* Dusk 이식: 원본 화면 연결 끊음 */ }"]);
  for (const [a, b, t] of edits.sort((x, y) => y[0] - x[0])) src = src.slice(0, a) + t + src.slice(b);
}

const ast = parse(src), fn = bootOf(ast), stmts = fn.body.body;
const names = new Map();   // 이름 → [문장 index]
const declsOf = (st) => st.type === "FunctionDeclaration" || st.type === "ClassDeclaration" ? [st.id.name]
  : st.type === "VariableDeclaration" ? st.declarations.flatMap((d) => idsOf(d.id)) : [];
function idsOf(p) { if (!p) return []; if (p.type === "Identifier") return [p.name]; if (p.type === "ObjectPattern") return p.properties.flatMap((q) => idsOf(q.value ?? q.argument)); if (p.type === "ArrayPattern") return p.elements.flatMap(idsOf); if (p.type === "AssignmentPattern") return idsOf(p.left); if (p.type === "RestElement") return idsOf(p.argument); return []; }
stmts.forEach((st, i) => { for (const n of declsOf(st)) { if (!names.has(n)) names.set(n, []); names.get(n).push(i); } });

// 문장 안에서 참조하는 이름(전부 모음: 보수적)
function refsOf(node, out = new Set()) {
  (function walk(n) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "Identifier") out.add(n.name);
    for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); }
  })(node);
  return out;
}
const refs = stmts.map((st) => refsOf(st));
const isDecl = (st) => ["FunctionDeclaration", "ClassDeclaration", "VariableDeclaration"].includes(st.type);
// 부작용이 있을 수 있는 변수 선언(await·document·window 접근)은 뿌리로 본다
const UNROOT = (has("--unroot") ? val("--unroot").split(",") : []);
const sideEffect = (st) => st.type === "VariableDeclaration" && !declsOf(st).some((n) => UNROOT.includes(n)) && /\bawait\b|\bdocument\b|\bwindow\b|addEventListener|setInterval|setTimeout\(/.test(src.slice(st.start, st.end));
const live = new Set(), why = new Map(), queue = [];
stmts.forEach((st, i) => { if (!isDecl(st) || sideEffect(st)) { live.add(i); queue.push(i); why.set(i, "root"); } });
while (queue.length) {
  const i = queue.pop();
  for (const n of refs[i]) for (const j of names.get(n) ?? []) if (!live.has(j)) { live.add(j); why.set(j, i); queue.push(j); }
}
const label = (i) => { const st = stmts[i]; return declsOf(st)[0] ?? st.type + "@" + src.slice(0, st.start).split("\n").length; };
if (has("--why")) {
  const target = val("--why"); let i = (names.get(target) ?? [])[0];
  if (i == null || !live.has(i)) { console.log(target, "는 남지 않아요(또는 없음)"); process.exit(0); }
  const path = []; while (i !== "root") { path.push(label(i)); i = why.get(i); }
  console.log(path.join("  ←  ")); process.exit(0);
}
let dropBytes = 0, dropN = 0; const drops = [];
stmts.forEach((st, i) => { if (!live.has(i)) { dropBytes += st.end - st.start; dropN++; drops.push([st.start, st.end]); } });
console.log(`문장 ${stmts.length}개 중 ${dropN}개 제거 대상, ${(dropBytes / 1024).toFixed(0)}KB / 전체 ${(src.length / 1024).toFixed(0)}KB`);
if (has("--list")) console.log([...stmts.keys()].filter((i) => !live.has(i)).map(label).join(", "));
if (has("--write")) {
  let out = src; for (const [a, b] of drops.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + out.slice(b);
  fs.writeFileSync(FILE, out); console.log("썼어요:", FILE, `${(out.length / 1024).toFixed(0)}KB`);
}
if (has("--live")) { const re = new RegExp(val("--live")); console.log([...stmts.keys()].filter((i) => live.has(i)).map(label).filter((n) => re.test(n)).join(", ")); }
