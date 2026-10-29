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
