// 한 번에 배포·릴리스: npm run release   (미리 보기만: npm run release -- --dry)
// 1) 지금 브랜치가 깨끗하고 origin과 같은지, package.json 버전 = CHANGELOG 맨 위 "## v<버전>"인지 확인
// 2) npm test · 본체 빌드 확인(--check) · 애드온 빌드 확인(--check) — 하나라도 실패하면 멈춤
// 3) 지금 브랜치를 main에 합침(git worktree로, 지금 브랜치는 그대로). HandOff/README.md가 부딪히면 main 쪽을 남김
// 4) main 푸시 → 태그 v<버전> 푸시(GitHub Actions release.yml이 릴리스를 만들고 dusk_atelier.js를 붙임)
// 5) 애드온 배포(tools/publish-addons.mjs → addons 브랜치)
// 이미 같은 태그가 원격에 있으면 3·4는 건너뛰고 애드온만 배포해요(다시 실행해도 안전).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry");
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, stdio: "inherit", ...opts });
const git = (args, cwd = root) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const step = (t) => console.log(`\n▶ ${t}`);
const fail = (t) => { console.error(`\n✘ ${t}`); process.exit(1); };

const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const tag = `v${version}`;
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
console.log(`Dusk Atelier ${tag} 배포 (브랜치 ${branch})${dry ? " — 미리 보기" : ""}`);

step("확인: 작업 트리·버전·변경 기록");
const dirty = git(["status", "--porcelain", "--untracked-files=no"]);
if (dirty) fail(`커밋 안 된 변경이 있어요:\n${dirty}`);
const top = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8").split("\n").find((l) => l.startsWith("## "));
if (!top?.startsWith(`## ${tag}`)) fail(`CHANGELOG.md 맨 위가 "## ${tag}"가 아니에요 (지금: ${top})`);
if (branch === "HEAD") fail("브랜치가 아닌 곳(detached)이에요.");

step("시험: npm test");
try { const out = execFileSync("npm", ["test", "--silent"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 << 20 }); console.log(out.split("\n").filter((l) => /^# (pass|fail)/.test(l)).join("\n")); }
catch (e) { console.error(String(e.stdout ?? "").split("\n").filter((l) => /^not ok|^# (pass|fail)/.test(l)).join("\n")); fail("시험이 실패했어요."); }
step("본체 빌드 확인");
run("node", ["tools/build.mjs", "--check"]);
step("애드온 빌드 확인");
run("node", ["tools/build-addons.mjs", "--check"]);

step("원격 상태");
git(["fetch", "-q", "origin", "main", branch, "--tags"]);
const remoteTag = git(["ls-remote", "--tags", "origin", tag]);
if (!dry) run("git", ["push", "-u", "origin", branch]);
else console.log(`(미리 보기) git push origin ${branch}`);

if (remoteTag) {
  console.log(`태그 ${tag}가 이미 원격에 있어요 → main 합치기·태그는 건너뛰고 애드온만 배포해요.`);
} else {
  step(`main에 ${branch} 합치기`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dusk-release-"));
  try {
    git(["worktree", "add", "--force", "--detach", dir, "origin/main"]);
    try {
      git(["merge", "--no-ff", "-m", `Release ${tag} (merge ${branch})`, `origin/${branch}`], dir);
    } catch {
      const conflicts = git(["diff", "--name-only", "--diff-filter=U"], dir).split("\n").filter(Boolean);
      const other = conflicts.filter((f) => f !== "HandOff/README.md");
      if (other.length) { git(["merge", "--abort"], dir); fail(`main과 합칠 때 부딪힌 파일이 있어요(직접 확인 필요):\n${other.join("\n")}`); }
      git(["checkout", "--ours", "HandOff/README.md"], dir);   // README의 브랜치 표는 main 쪽이 기준
      git(["add", "HandOff/README.md"], dir);
      git(["commit", "-q", "--no-edit"], dir);
    }
    // 합친 결과가 빌드와 같은지 한 번 더(다른 브랜치 내용이 섞였을 때를 위해)
    execFileSync("node", ["tools/build.mjs", "--check"], { cwd: dir, stdio: "inherit" });
    const head = git(["rev-parse", "HEAD"], dir);
    if (dry) {
      console.log(`(미리 보기) main ← ${head.slice(0, 7)}, 태그 ${tag}`);
    } else {
      git(["push", "origin", `${head}:refs/heads/main`], dir);
      git(["tag", "-a", tag, "-m", `Dusk Atelier ${tag}`, head], dir);
      git(["push", "origin", tag], dir);
      console.log(`main과 태그 ${tag}를 올렸어요. GitHub Actions가 릴리스를 만들어요.`);
    }
  } finally {
    try { git(["worktree", "remove", "--force", dir]); } catch { fs.rmSync(dir, { recursive: true, force: true }); }
  }
}

step("애드온 배포");
run("node", ["tools/publish-addons.mjs", ...(dry ? ["--dry"] : [])]);

console.log(`\n✔ ${dry ? "미리 보기 끝 — 실제로는 아무것도 올리지 않았어요." : `${tag} 배포 끝. 릴리스: https://github.com/Pyser08/Dusk-Atelier/releases/tag/${tag}`}`);
