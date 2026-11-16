// 오토 스크롤 커스텀 애드온 한 파일 만들기: addons/autoscroll/custom.js → addons/autoscroll/auto-scroll-<버전>.dusk-addon.js
// import 없는 ES 모듈 한 파일(코어 모듈을 쓰지 않음). 홈 → 애드온 → 불러오기로 넣는다.
// 사용: node tools/build-autoscroll-custom.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "addons/autoscroll/custom.js");
const ver = /version:\s*"(\d+\.\d+\.\d+)"/.exec(fs.readFileSync(entry, "utf8"))?.[1];
if (!ver) throw new Error("custom.js meta.version을 못 찾았어요");
const r = await build({ entryPoints: [entry], bundle: true, write: false, format: "esm", target: "es2022", charset: "utf8", legalComments: "none", logLevel: "silent" });
const code = `// Dusk Atelier 커스텀 애드온 — 오토 스크롤 v${ver}. 홈 → 애드온 → 불러오기로 넣어요.\n// 소스: addons/autoscroll/custom.js · runner.js (Dusk Atelier 라이선스, 저장소 LICENSE)\n` + r.outputFiles[0].text;
const out = path.join(root, `addons/autoscroll/auto-scroll-${ver}.dusk-addon.js`);
if (process.argv.includes("--check")) {
  const same = fs.existsSync(out) && fs.readFileSync(out, "utf8") === code;
  console.log(same ? "동일함" : "다름"); if (!same) process.exitCode = 1;
} else { fs.writeFileSync(out, code); console.log(`${path.relative(root, out)} (${(code.length / 1024).toFixed(1)}KB)`); }
