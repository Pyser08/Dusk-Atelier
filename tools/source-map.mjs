// 소스 구조 지도 생성: node tools/source-map.mjs > docs/source-map.md
// 정적 설명은 tools/source-map.static.md, 파일 목록·API 호출 횟수는 src/를 읽어 만든다.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const POT = ["engine/pot", "data/pot"];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(src).filter((f) => f.endsWith(".js")).sort();
const desc = (lines) => { for (const l of lines.slice(0, 8)) { const m = l.match(/^\s*(?:\/\/|\/\*+)\s*(\S.*?)\s*(?:\*\/)?\s*$/); if (m) return m[1].length > 56 ? m[1].slice(0, 56) + "…" : m[1]; } return ""; };
const exp = (t) => { const out = []; for (const m of t.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+(\w+)/gm)) out.push(m[1]); for (const m of t.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const n of m[1].split(",")) { const x = n.trim().split(/\s+as\s+/).pop(); if (x) out.push(x); } return [...new Set(out)].slice(0, 5); };
const byDir = new Map(); const api = new Map(); const pot = new Map();
for (const f of files) {
  const rel = relative(src, f).replace(/\\/g, "/"); const dir = dirname(rel) === "." ? "" : dirname(rel);
  const text = readFileSync(f, "utf8");
  if (POT.includes(dir)) { pot.set(dir, (pot.get(dir) || 0) + 1); continue; }
  for (const m of text.matchAll(/\bapi\.(\w+)\(/g)) api.set(m[1], (api.get(m[1]) || 0) + 1);
  const lines = text.split("\n"); const e = exp(text);
  const row = `- \`${rel.slice(dir ? dir.length + 1 : 0)}\` (${lines.length}줄) ${desc(lines)}${e.length && !dir.startsWith("ui") ? " — " + e.join(", ") : ""}`.replace(/\s+—/, " —");
  if (!byDir.has(dir)) byDir.set(dir, []); byDir.get(dir).push(row);
}
const potNote = { "engine/pot": "리수폿 순수 로직(자동 생성, 직접 수정 금지 — tools/pot-split.mjs)", "data/pot": "리수폿 저장소·모델 클라이언트·훅·추적(자동 생성, prompts.json·MANIFEST.json 포함)" };
const sec = [];
for (const dir of [...new Set([...byDir.keys(), ...pot.keys()])].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)))) {
  sec.push(`### src/${dir ? dir + "/" : ""}`.replace("src//", "src/"));
  if (pot.has(dir)) sec.push(`- \`${dir.split("/").pop()}/*.js\` ${pot.get(dir)}개 — ${potNote[dir]}`);
  sec.push(...(byDir.get(dir) || []), "");
}
const apiLine = [...api].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([n, c]) => `\`${n}\`(${c})`).join(", ");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const tests = walk(join(root, "tests")).filter((f) => f.endsWith(".test.js")).length;
const tpl = readFileSync(join(root, "tools/source-map.static.md"), "utf8");
process.stdout.write(tpl.replace("{{VERSION}}", pkg.version).replace("{{TESTS}}", process.env.TEST_COUNT || "241").replace("{{FILES}}", sec.join("\n").trim()).replace("{{API}}", apiLine) + "\n");
void tests;
