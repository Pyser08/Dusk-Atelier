// 애드온 배포: 빌드한 애드온(addons/dist/*.js)과 목록(addons/addons.json)만 배포 전용 브랜치 `addons`에 올린다.
// 사용자 기기는 6시간마다 그 브랜치의 목록을 읽고, 버전이 오른 애드온만 받는다 → 애드온만 고쳐서 바로 고칠 수 있다.
// 순서: 애드온 소스 수정 → addons/addons.src.json 버전 올림 → node tools/build-addons.mjs → (본체가 넘겨 줄 모듈이 바뀌었으면 본체도 내고 minCore 올림) → node tools/publish-addons.mjs
// 옵션: --dry (올리지 않고 바뀐 것만 보여 줌)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry");
const git = (args, cwd = root) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
execFileSync("node", ["tools/build-addons.mjs", "--check"], { cwd: root, stdio: "inherit" });   // 빌드 결과가 소스와 같은지 먼저 확인
const src = git(["rev-parse", "--short", "HEAD"]);
// 지난번에 멈춰 남은 임시 작업 폴더가 addons 브랜치를 붙잡고 있으면 새로 꺼낼 수 없어서 먼저 치운다
try { git(["worktree", "prune"]); for (const b of git(["worktree", "list", "--porcelain"]).split("\n\n")) if (/\nbranch refs\/heads\/addons$/m.test(b)) git(["worktree", "remove", "--force", b.split("\n")[0].slice(9)]); } catch { /* 없으면 그대로 */ }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dusk-addons-"));
const cleanup = () => { try { git(["worktree", "remove", "--force", dir]); } catch { fs.rmSync(dir, { recursive: true, force: true }); } };
try {
  try { git(["fetch", "--depth=1", "origin", "addons"]); git(["worktree", "add", "--force", dir, "FETCH_HEAD"]); git(["checkout", "-B", "addons"], dir); }
  catch { git(["worktree", "add", "--force", "--detach", dir]); git(["checkout", "--orphan", "addons"], dir); git(["rm", "-rf", "--quiet", "."], dir); }
  // 내용 주소 모듈(.mjs)은 지난 것도 남겨 둔다(옛 목록을 가진 기기가 아직 받을 수 있게)
  const keep = {};
  const oldDist = path.join(dir, "addons/dist");
  if (fs.existsSync(oldDist)) for (const f of fs.readdirSync(oldDist)) if (f.endsWith(".mjs")) keep[f] = fs.readFileSync(path.join(oldDist, f));
  fs.rmSync(path.join(dir, "addons"), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "addons/dist"), { recursive: true });
  for (const [f, b] of Object.entries(keep)) fs.writeFileSync(path.join(dir, "addons/dist", f), b);
  fs.copyFileSync(path.join(root, "addons/addons.json"), path.join(dir, "addons/addons.json"));
  for (const f of fs.readdirSync(path.join(root, "addons/dist"))) if (f.endsWith(".js")) fs.copyFileSync(path.join(root, "addons/dist", f), path.join(dir, "addons/dist", f));
  // 글 요청이 주소와 상관없이 같은 응답을 주는 호스트(웹리스)용: 같은 내용을 `export default "<문자열>"` 모듈로도 올린다(jsDelivr가 자바스크립트로 내려줌)
  const mani = JSON.parse(fs.readFileSync(path.join(root, "addons/addons.json"), "utf8"));
  for (const a of mani.addons) {
    const code = fs.readFileSync(path.join(root, "addons/dist", `${a.id}.js`), "utf8");
    fs.writeFileSync(path.join(dir, "addons/dist", `${a.id}.${a.sha256.slice(0, 12)}.mjs`), `export default ${JSON.stringify(code)};\n`);
  }
  fs.writeFileSync(path.join(dir, "addons/addons.json.mjs"), `export default ${JSON.stringify(fs.readFileSync(path.join(root, "addons/addons.json"), "utf8"))};\n`);
  fs.writeFileSync(path.join(dir, "README.md"), "# Dusk Atelier 애드온 배포 브랜치\n\n빌드 결과만 있어요. 소스는 본체 저장소의 `addons/`이고, `node tools/publish-addons.mjs`로 올려요. 직접 고치지 마세요.\n");
  git(["add", "-A"], dir);
  const changed = git(["status", "--porcelain"], dir);
  if (!changed) { console.log("바뀐 애드온이 없어요."); cleanup(); process.exit(0); }
  console.log(changed);
  if (dry) { console.log("(--dry) 올리지 않았어요."); cleanup(); process.exit(0); }
  git(["commit", "-q", "-m", `Publish add-ons from ${src}`], dir);
  git(["push", "-q", "origin", "addons"], dir);
  console.log(`addons 브랜치에 올렸어요 (소스 ${src}).`);
  // jsDelivr는 브랜치 주소를 오래 기억해서 목록 모듈만 비우도록 요청한다(실패해도 괜찮아요: 파일은 내용 주소라 영향 없음)
  try { const r = await fetch("https://purge.jsdelivr.net/gh/Pyser08/Dusk-Atelier@addons/addons/addons.json.mjs"); console.log(`jsDelivr 목록 갱신 요청: ${r.status}`); } catch { console.log("jsDelivr 목록 갱신 요청은 못 보냈어요(몇 시간 뒤 자동 반영)."); }
} finally {
  cleanup();
}
