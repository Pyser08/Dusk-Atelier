// 봇빌더(risu_story_workshop) DA Interop 연동판 만들기 (명령줄).
//   node tools/compat/workshop-interop.mjs <원본.js> [출력.js]
// 원본은 바꾸지 않는다. 변환 본체는 src/data/workshoppatch.js (Dusk 화면의 '연동판 받기'도 같은 것을 쓴다).
import { readFileSync, writeFileSync } from "node:fs";
import { patchWorkshop, MARK } from "../../src/data/workshoppatch.js";
export { patchWorkshop, MARK };
export { WORKSHOP_INTEROP_ID } from "../../src/engine/workshop.js";

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const [, , input, output] = process.argv;
  if (!input) { console.error("사용법: node tools/compat/workshop-interop.mjs <원본.js> [출력.js]"); process.exit(1); }
  const out = output ?? input.replace(/\.js$/, "") + ".interop.js";
  writeFileSync(out, patchWorkshop(readFileSync(input, "utf8")));
  console.log(`연동판을 만들었어요: ${out}`);
}
