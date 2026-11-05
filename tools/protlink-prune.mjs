// 개발용(빌드에 안 씀): src/protlink/protlink.js 안에서 아무도 쓰지 않는 선언을 걷어 낸다(원본 앱 화면·링크 목록 같은 죽은 코드).
// 함수·클래스 선언과 ‘만들어도 부작용이 없는’ var 선언만 지우고, 나머지(초기화 호출·부작용 있는 문장)는 전부 남긴다. 사용: node tools/protlink-prune.mjs [--write]
import fs from "node:fs";
import * as acorn from "acorn";
const file = new URL("../src/protlink/protlink.js", import.meta.url);
const src = fs.readFileSync(file, "utf8");
const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module", ranges: true });
const fn = ast.body.find((n) => n.type === "ExportNamedDeclaration")?.declaration;
const ret = fn.body.body.find((n) => n.type === "ReturnStatement");
const arrow = ret.argument.callee;               // (()=>{...})()
const body = arrow.body.body;
const last = body[body.length - 1];              // return {G3,Sp,...}
// 단위: 함수/클래스 선언, var 선언의 각 선언자, 그 밖의 문장
const units = [];
for (const st of body) {
  if (st.type === "VariableDeclaration") for (const d of st.declarations) units.push({ st, node: d, kind: "decl", range: d.range });
  else units.push({ st, node: st, kind: st.type === "FunctionDeclaration" || st.type === "ClassDeclaration" ? "func" : "stmt", range: st.range });
}
const unitAt = (pos) => { let lo = 0, hi = units.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1, u = units[m]; if (pos < u.range[0]) hi = m - 1; else if (pos >= u.range[1]) lo = m + 1; else return u; } return null; };
const pure = (n) => {
  if (!n) return true;
  switch (n.type) {
    case "Literal": case "FunctionExpression": case "ArrowFunctionExpression": case "Identifier": case "TemplateLiteral": return n.type !== "TemplateLiteral" || n.expressions.length === 0;
    case "ClassExpression": return !n.superClass && n.body.body.every((m) => m.type === "MethodDefinition" && !m.computed);
    case "ObjectExpression": return n.properties.every((p) => p.type === "Property" && !p.computed && pure(p.value));
    case "ArrayExpression": return n.elements.every((e) => e && pure(e));
    case "UnaryExpression": return pure(n.argument);
    case "CallExpression": return n.callee.type === "Identifier" && n.callee.name === lazyName && n.arguments.every((a) => a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression" || a.type === "Literal");
    default: return false;
  }
};
// 게으른 초기화 감싸개 이름: var q=(t,e)=>()=>(t&&(e=t(t=0)),e)
let lazyName = null;
for (const u of units) if (u.kind === "decl" && u.node.init?.type === "ArrowFunctionExpression" && u.node.init.body.type === "ArrowFunctionExpression" && u.node.init.params.length === 2 && src.slice(...u.node.init.range).replace(/\s/g, "").includes("=>(t&&(e=t(t=0)),e)")) lazyName = u.node.id.name;
const removable = (u) => u.kind === "func" || (u.kind === "decl" && u.node.id.type === "Identifier" && pure(u.node.init));
const need = new Set(), queue = [];
const mark = (u) => { if (u && !need.has(u)) { need.add(u); queue.push(u); } };
for (const u of units) if (!removable(u)) mark(u);
// 이름만 보고 이어 준다(스코프 분석 없이). 같은 이름이 안쪽에서 다시 쓰이면 쓰이는 것으로 치므로 더 남기는 쪽으로만 틀린다.
const declOf = new Map();   // 이름 → 그 이름을 선언하는 단위들
const nameOf = (u) => (u.kind === "func" ? u.node.id?.name : u.kind === "decl" && u.node.id.type === "Identifier" ? u.node.id.name : null);
const patNames = (n, out) => { if (!n) return out; if (n.type === "Identifier") out.push(n.name); else for (const k of Object.keys(n)) { const v = n[k]; if (k !== "type" && v && typeof v === "object") (Array.isArray(v) ? v : [v]).forEach((c) => c && typeof c.type === "string" && patNames(c, out)); } return out; };
for (const u of units) { const names = u.kind === "decl" && u.node.id.type !== "Identifier" ? patNames(u.node.id, []) : [nameOf(u)].filter(Boolean); for (const n of names) (declOf.get(n) ?? declOf.set(n, []).get(n)).push(u); }
const idsIn = (n, out) => { if (!n || typeof n.type !== "string") return out; if (n.type === "Identifier") out.add(n.name); for (const k of Object.keys(n)) { if (k === "type" || k === "range" || k === "start" || k === "end") continue; const v = n[k]; if (Array.isArray(v)) v.forEach((c) => idsIn(c, out)); else if (v && typeof v === "object") idsIn(v, out); } return out; };
const refsByUnit = new Map();
for (const u of units) { const set = new Set(); for (const name of idsIn(u.kind === "decl" ? u.node : u.node, new Set())) for (const d of declOf.get(name) ?? []) if (d !== u) set.add(d); refsByUnit.set(u, set); }
while (queue.length) { const u = queue.pop(); for (const t of refsByUnit.get(u) ?? []) mark(t); }
const out = [];
for (const st of body) {
  if (st.type === "VariableDeclaration") {
    const keep = st.declarations.filter((d) => need.has(units.find((u) => u.node === d)));
    if (keep.length) out.push(`${st.kind} ${keep.map((d) => src.slice(...d.range)).join(",")};`);
  } else if (need.has(units.find((u) => u.node === st))) out.push(src.slice(...st.range));
}
const head = src.slice(0, src.indexOf("/* eslint-disable */"));
const code = `${head}/* eslint-disable */\nexport function loadProtLinkDriver(risuai) { return (()=>{${out.join("\n")}})(); }\n`;
acorn.parse(code, { ecmaVersion: "latest", sourceType: "module" });   // 문법 확인
const dropped = units.filter((u) => !need.has(u)).length;
console.log(`단위 ${units.length}개 중 ${dropped}개 제거 · ${(src.length / 1024).toFixed(0)}KB → ${(code.length / 1024).toFixed(0)}KB`);
if (process.argv.includes("--write")) { fs.writeFileSync(file, code); console.log("저장했어요"); }
