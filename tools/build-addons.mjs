// 애드온 빌드: addons/<id>/index.js → addons/dist/<id>.js(ESM) + addons/addons.json(버전·sha256·주소).
// 사용: node tools/build-addons.mjs [--check]   (BRANCH=feat/2.0.0 기본)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const branch = process.env.BRANCH || "feat/2.0.0";
const src = JSON.parse(fs.readFileSync(path.join(root, "addons/addons.src.json"), "utf8"));
const dist = path.join(root, "addons/dist");
fs.mkdirSync(dist, { recursive: true });
const out = { format: 1, addons: [] };
let same = true;
for (const a of src.addons) {
  const r = await build({ entryPoints: [path.join(root, "addons", a.id, "index.js")], bundle: true, format: "esm", target: "es2022", charset: "utf8", legalComments: "none", minifyWhitespace: true, minifyIdentifiers: true, write: false, logLevel: "warning" });
  const code = `/* Dusk Atelier 애드온 ${a.id} v${a.version} — 소스: addons/${a.id} (AGPL-3.0-only) */\n` + r.outputFiles[0].text;
  const file = path.join(dist, `${a.id}.js`);
  if (process.argv.includes("--check")) same &&= fs.existsSync(file) && fs.readFileSync(file, "utf8") === code;
  else fs.writeFileSync(file, code);
  out.addons.push({ ...a, url: `https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/${branch}/addons/dist/${a.id}.js`, sha256: crypto.createHash("sha256").update(code, "utf8").digest("hex"), size: Buffer.byteLength(code) });
}
const json = JSON.stringify(out, null, 2) + "\n", mf = path.join(root, "addons/addons.json");
if (process.argv.includes("--check")) { same &&= fs.existsSync(mf) && fs.readFileSync(mf, "utf8") === json; console.log(same ? "애드온 동일함" : "애드온 다름"); process.exit(same ? 0 : 1); }
fs.writeFileSync(mf, json);
console.log(out.addons.map((a) => `${a.id} v${a.version} ${a.size}B ${a.sha256.slice(0, 8)}`).join("\n"));
