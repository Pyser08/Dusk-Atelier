import test from "node:test";
import assert from "node:assert/strict";
import { detectInPrompt, estimateUsed } from "../src/engine/lorelog.js";

const sfwBody = "에셋 커맨드 목록입니다\n표정 happy sad angry smile\n배경 school street room garden\n옷 uniform casual pajama swimsuit";
const mk = (comment, content, o = {}) => ({ entry: { comment, content, key: "", mode: "normal", enabled: true, ...o }, src: "봇" });

test("키도 없고 항상 켜짐도 아닌 항목은 내용이 겹쳐도 '들어감'으로 안 본다", () => {
  const sfw = mk("에셋 커맨드 SFW", sfwBody, { alwaysActive: true });
  const nsfw = mk("에셋 커맨드 NSFW", sfwBody + "\n표정 nsfw_blush nsfw_moan");
  const r = detectInPrompt([sfw, nsfw], sfwBody);
  assert.deepEqual(r.map((x) => x.n), ["에셋 커맨드 SFW"]);
  assert.equal(r[0].w, "항상 켜짐");
});

test("NSFW가 키를 가져도 NSFW만의 줄이 프롬프트에 없으면 안 들어간 것", () => {
  const sfw = mk("SFW", sfwBody, { alwaysActive: true });
  const nsfw = mk("NSFW", sfwBody + "\n표정 nsfw_blush nsfw_moan", { key: "야한" });
  assert.deepEqual(detectInPrompt([sfw, nsfw], sfwBody).map((x) => x.n), ["SFW"]);
  assert.deepEqual(detectInPrompt([sfw, nsfw], sfwBody + "\n표정 nsfw_blush nsfw_moan").map((x) => x.n).sort(), ["NSFW", "SFW"]);
});

test("mode constant는 항상 켜짐으로 표시", () => {
  const e = mk("상수", sfwBody, { mode: "constant" });
  assert.equal(detectInPrompt([e], sfwBody)[0].w, "항상 켜짐");
  assert.equal(estimateUsed([e], [])[0].w, "항상 켜짐");
});

// 2.1.9 제보: {{user}}를 전역 이름으로 바꿔 대조해서, 리스가 활성 페르소나 이름으로 렌더한 프롬프트와 어긋나면 그 줄은 전부 못 찾았다.
// → 이름을 모르는 줄({{user}}가 든 줄)은 맨 뒤로 미루고, {{user}}가 없는 줄이 남아 있으면 그 줄로만 판단한다.
test("{{user}}가 든 줄 말고 믿을 줄이 있으면 사용자 이름이 달라도 들어간 것으로 본다", () => {
  // 가장 긴 줄 셋이 모두 {{user}} 줄이고, 덜 긴 믿을 줄이 하나 있는 항목(제보와 같은 모양)
  const body = "{{user}}는 이 학교의 전학생이고 매일 도서관에 간다 늘 혼자다\n{{user}}에게 친구가 한 명 있다 이름은 하루 라고 한다\n{{user}}는 점심마다 옥상에서 도시락을 먹는다 항상\n도서관은 북쪽 건물 삼층";
  const e = mk("전학생", body, { alwaysActive: true });
  const prompt = "유리는 이 학교의 전학생이고 매일 도서관에 간다 늘 혼자다\n유리에게 친구가 한 명 있다 이름은 하루 라고 한다\n유리는 점심마다 옥상에서 도시락을 먹는다 항상\n도서관은 북쪽 건물 삼층";
  assert.deepEqual(detectInPrompt([e], prompt, { names: { char: "봇", user: "마스터" } }).map((x) => x.n), ["전학생"]);
});
test("이름을 맞게 알면 {{user}} 줄만 있는 항목도 들어간 것으로 본다", () => {
  const e = mk("호칭", "{{user}}를 부를 때는 항상 선생님이라고 부른다\n{{user}}의 말투는 부드럽고 차분하다 늘 그렇다", { alwaysActive: true });
  const prompt = "유리를 부를 때는 항상 선생님이라고 부른다\n유리의 말투는 부드럽고 차분하다 늘 그렇다";
  assert.equal(detectInPrompt([e], prompt, { names: { user: "유리" } }).length, 1);
  assert.equal(detectInPrompt([e], prompt, { names: { user: "마스터" } }).length, 0);   // 이름을 틀리게 알면 못 찾는 건 그대로(믿을 줄이 없으니)
});
