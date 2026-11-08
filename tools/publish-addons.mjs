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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dusk-addons-"));
try {
  try { git(["fetch", "--depth=1", "origin", "addons"]); git(["worktree", "add", "--force", dir, "FETCH_HEAD"]); git(["checkout", "-B", "addons"], dir); }
  catch { git(["worktree", "add", "--force", "--detach", dir]); git(["checkout", "--orphan", "addons"], dir); git(["rm", "-rf", "--quiet", "."], dir); }
  fs.rmSync(path.join(dir, "addons"), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "addons/dist"), { recursive: true });
  fs.copyFileSync(path.join(root, "addons/addons.json"), path.join(dir, "addons/addons.json"));
  for (const f of fs.readdirSync(path.join(root, "addons/dist"))) if (f.endsWith(".js")) fs.copyFileSync(path.join(root, "addons/dist", f), path.join(dir, "addons/dist", f));
  fs.writeFileSync(path.join(dir, "README.md"), "# Dusk Atelier 애드온 배포 브랜치\n\n빌드 결과만 있어요. 소스는 본체 저장소의 `addons/`이고, `node tools/publish-addons.mjs`로 올려요. 직접 고치지 마세요.\n");
  git(["add", "-A"], dir);
  const changed = git(["status", "--porcelain"], dir);
  if (!changed) { console.log("바뀐 애드온이 없어요."); process.exit(0); }
  console.log(changed);
  if (dry) { console.log("(--dry) 올리지 않았어요."); process.exit(0); }
  git(["commit", "-q", "-m", `Publish add-ons from ${src}`], dir);
  git(["push", "-q", "origin", "addons"], dir);
  console.log(`addons 브랜치에 올렸어요 (소스 ${src}).`);
} finally {
  try { git(["worktree", "remove", "--force", dir]); } catch { fs.rmSync(dir, { recursive: true, force: true }); }
}
