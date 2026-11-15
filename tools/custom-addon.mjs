// 시험용: 빌드된 공식 애드온(addons/dist/<id>.js)을 '커스텀 애드온' 파일로 바꾼다.
// 사용: node tools/custom-addon.mjs memory [다른 id ...] → test-addons/<id>-test.js
// 애드온 화면 → 불러오기로 넣는다. 같은 코드가 돌므로 공식 애드온은 꺼 두고 시험할 것. 본체(dusk_atelier.js)도 같은 빌드여야 한다.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const src = JSON.parse(readFileSync("addons/addons.src.json", "utf8"));
const list = Array.isArray(src) ? src : src.addons ?? Object.values(src);
const ids = process.argv.slice(2);
if (!ids.length) { console.error("애드온 id를 적어 주세요 (예: memory)"); process.exit(1); }
mkdirSync("test-addons", { recursive: true });
for (const id of ids) {
  const a = list.find((x) => x.id === id);
  if (!a) { console.error(`${id}: addons.src.json에 없어요`); process.exitCode = 1; continue; }
  const code = readFileSync(`addons/dist/${id}.js`, "utf8");
  const meta = { id: `${id}-test`, name: `${a.name} (시험판)`, version: a.version, desc: `시험용 — 공식 ‘${a.name}’ 애드온은 꺼 두고 쓰세요. ${new Date().toISOString().slice(0, 16).replace("T", " ")} 빌드`, minCore: a.minCore, requires: [] };
  const out = `test-addons/${id}-test.js`;
  writeFileSync(out, `export const meta = ${JSON.stringify(meta)};\n${code}`);
  console.log(`${out} (${(code.length / 1024).toFixed(1)}KB) · v${a.version}`);
}
