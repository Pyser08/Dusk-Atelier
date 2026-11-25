// 시험판 애드온 만들기: node tools/rpg-dev/build-addon.mjs → test-addons/rpg-test.dka (배포 목록에는 넣지 않는다)
import { build } from "esbuild"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, "../../test-addons"); fs.mkdirSync(out, { recursive: true });
const meta = { id: "rpg-test", name: "Dusk Saga (시험판)", version: "0.1.0", desc: `3D 전술 전투 시험판. 채팅은 바꾸지 않아요. ${new Date().toISOString().slice(0, 16).replace("T", " ")} 빌드`, author: "Dusk Atelier", minCore: "2.1.0" };
const r = await build({ entryPoints: [path.join(here, "addon.js")], bundle: true, format: "esm", minify: true, write: false, charset: "utf8", loader: { ".css": "text" }, legalComments: "inline", logLevel: "warning", target: "es2022" });
const code = `export const meta = ${JSON.stringify(meta)};\n${r.outputFiles[0].text}`, f = path.join(out, "rpg-test.dka"); fs.writeFileSync(f, code); console.log(path.relative(process.cwd(), f), (code.length / 1024 | 0) + "KB", /^import /m.test(code) ? "바깥 import 있음!" : "바깥 import 없음");
