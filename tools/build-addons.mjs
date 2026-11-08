// 애드온 빌드: addons/<id>/index.js → addons/dist/<id>.js(ESM) + addons/addons.json(버전·sha256·주소·필요 애드온).
// 코어에 이미 들어 있는 모듈(dom·kit·data/themes 등)은 애드온에 다시 넣지 않고, 실행할 때 코어가 넘겨 준 것(globalThis.__duskLib)을 쓴다.
//   → 같은 모듈 인스턴스(설정·상태 공유), 애드온 크기 작음. 코어가 넘겨줄 목록은 src/addonlib.gen.js로 만든다(코어 빌드에 들어감).
//   애드온이 새 코어 모듈을 쓰기 시작하면 addonlib.gen.js가 바뀌므로 코어도 새로 내고 그 애드온의 minCore를 올려야 한다.
// 사용: node tools/build-addons.mjs [--check]   (BRANCH=addons 기본)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => path.relative(root, p).split(path.sep).join("/");
const branch = process.env.BRANCH || "addons";   // 배포 전용 브랜치(빌드 결과만 올림, tools/publish-addons.mjs)
const check = process.argv.includes("--check");
const LIB_FILE = path.join(root, "src/addonlib.gen.js");
const common = { bundle: true, write: false, logLevel: "silent", charset: "utf8", loader: { ".json": "json" }, alias: { fflate: path.join(root, "src/vendor/fflate.js") } };
const define = { __VERSION__: "globalThis.__duskVersion", __CHANGELOG__: '""' };

// 1) 코어에 들어가는 모듈 목록(addonlib.gen.js는 비우고 계산 — 예전 목록이 코어 범위를 넓히지 않게)
const emptyLib = { name: "empty-lib", setup(b) { b.onLoad({ filter: /addonlib\.gen\.js$/ }, () => ({ contents: "export const LIB = {};", loader: "js" })); } };
const coreMeta = (await build({ ...common, entryPoints: [path.join(root, "src/main.js")], format: "iife", metafile: true, define, plugins: [emptyLib] })).metafile;
const coreSet = new Set(Object.keys(coreMeta.inputs));

const exportsCache = new Map();
async function exportsOf(file) {
  if (!exportsCache.has(file)) {
    const { alias: _a, ...plain } = common;
    const m = (await build({ ...plain, bundle: false, entryPoints: [path.join(root, file)], format: "esm", metafile: true, outdir: "/tmp/x" })).metafile;
    exportsCache.set(file, Object.values(m.outputs)[0].exports ?? []);
  }
  return exportsCache.get(file);
}

const src = JSON.parse(fs.readFileSync(path.join(root, "addons/addons.src.json"), "utf8"));
const dist = path.join(root, "addons/dist");
fs.mkdirSync(dist, { recursive: true });
const out = { format: 1, addons: [] }, usedLib = new Set();
let same = true;
for (const a of src.addons) {
  const shared = new Set();
  const lib = { name: "dusk-lib", setup(b) {
    b.onResolve({ filter: /^\.\.?\// }, (args) => {
      const r = rel(path.resolve(args.resolveDir, args.path));
      return coreSet.has(r) ? { path: r, namespace: "dusklib" } : undefined;
    });
    b.onLoad({ filter: /.*/, namespace: "dusklib" }, async (args) => {
      shared.add(args.path);
      const names = await exportsOf(args.path), named = names.filter((n) => n !== "default");
      // 예전 코어에 이름이 빠져 있으면 'f0 is not a function'처럼 엉뚱하게 터지므로, 켤 때 먼저 확인해 업데이트 안내로 멈춘다
      const need = JSON.stringify(named);
      return { loader: "js", contents: `const m = globalThis.__duskLib?.[${JSON.stringify(args.path)}];\nif (!m) throw new Error(${JSON.stringify(`Dusk 코어에 ${args.path}가 없어요 — Dusk를 업데이트해 주세요`)});\n{ const gone = ${need}.filter((k) => !(k in m)); if (gone.length) throw new Error(${JSON.stringify(`Dusk 본체가 이 애드온보다 오래됐어요(${args.path}에 없는 기능: `)} + gone.slice(0, 3).join(", ") + ") — Dusk를 업데이트해 주세요"); }\n${named.length ? `export const { ${named.join(", ")} } = m;\n` : ""}${names.includes("default") ? "export default m.default;\n" : ""}` };
    });
  } };
  const r = await build({ ...common, entryPoints: [path.join(root, "addons", a.id, "index.js")], format: "esm", target: "es2022", legalComments: "none", minify: true, define, plugins: [lib], metafile: true });
  shared.forEach((x) => usedLib.add(x));
  const code = `/* Dusk Atelier 애드온 ${a.id} v${a.version} — 소스: addons/${a.id} (AGPL-3.0-only) */\n` + r.outputFiles[0].text;
  const file = path.join(dist, `${a.id}.js`);
  if (check) same &&= fs.existsSync(file) && fs.readFileSync(file, "utf8") === code;
  else fs.writeFileSync(file, code);
  out.addons.push({ ...a, url: `https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/${branch}/addons/dist/${a.id}.js`, sha256: crypto.createHash("sha256").update(code, "utf8").digest("hex"), size: Buffer.byteLength(code) });
  if (!check) console.log(`${a.id} v${a.version} ${(Buffer.byteLength(code) / 1024).toFixed(1)}KB · 코어 모듈 ${shared.size}개 공유`);
}

// 2) 코어가 넘겨 줄 모듈 목록: 코어에 든 모듈 전부(2.0.0). 애드온이 나중에 새 코어 모듈을 써도 코어를 다시 내지 않아도 되게.
//    (예전: 애드온이 지금 쓰는 것만 → 새로 쓰면 옛 코어에서 "코어에 ○○가 없어요")
//    코어 진입점·이 목록 자신·바깥 패키지(node_modules)는 뺀다.
const libs = [...new Set([...usedLib, ...[...coreSet].filter((f) => /^src\//.test(f) && /\.(js|ts)$/.test(f) && !/^src\/(main\.js|addonlib\.gen\.js)$/.test(f))])].sort();
const libCode = `// 자동 생성(node tools/build-addons.mjs) — 고치지 마세요. 애드온이 쓰는 코어 모듈을 이름으로 넘겨 준다.\n${libs.map((f, i) => `import * as m${i} from ${JSON.stringify("./" + f.replace(/^src\//, ""))};`).join("\n")}\nexport const LIB = {\n${libs.map((f, i) => `  ${JSON.stringify(f)}: m${i}`).join(",\n")}\n};\n`;
const json = JSON.stringify(out, null, 2) + "\n", mf = path.join(root, "addons/addons.json");
if (check) {
  same &&= fs.existsSync(mf) && fs.readFileSync(mf, "utf8") === json && fs.existsSync(LIB_FILE) && fs.readFileSync(LIB_FILE, "utf8") === libCode;
  console.log(same ? "애드온 동일함" : "애드온 다름 — node tools/build-addons.mjs 후 npm run build");
  process.exit(same ? 0 : 1);
}
const libChanged = !fs.existsSync(LIB_FILE) || fs.readFileSync(LIB_FILE, "utf8") !== libCode;
fs.writeFileSync(mf, json);
fs.writeFileSync(LIB_FILE, libCode);
if (libChanged) console.log(`코어가 넘겨 줄 모듈이 바뀌었어요(${libs.length}개) → npm run build로 코어도 다시 빌드하고, 새 모듈을 쓰는 애드온의 minCore를 올려 주세요.`);
