import test from "node:test";
import assert from "node:assert/strict";
import { headKey, tailKey, matchRecord } from "../src/engine/lorelog.js";

const out = "유우카는 서류를 정리하다가 고개를 들었다. 선생님, 또 늦으셨네요. 오늘은 정말 일이 많아요. 마지막 결재까지 끝내야 해요.";
const rec = { id: "a", head: headKey(out), tail: tailKey(out), entries: [] };

test("화면 글에 <br>·<p> 태그가 섞여도 기록을 찾는다", () => {
  const shown = "<p>유우카는 서류를 정리하다가<br>고개를 들었다. 선생님, 또 늦으셨네요.</p><p>오늘은 정말 일이 많아요.<br/>마지막 결재까지 끝내야 해요.</p>";
  assert.equal(matchRecord([rec], shown), rec);
});
test("태그 없는 글은 그대로 찾고, 다른 글은 못 찾는다", () => {
  assert.equal(matchRecord([rec], out), rec);
  assert.equal(matchRecord([rec], "전혀 다른 응답이에요. 아무 상관 없는 글입니다."), null);
});
test("앞부분이 테마로 바뀌어도 끝부분으로 찾는다", () => {
  const shown = "[Yuuka] 아침 보고 — " + out.slice(6);
  assert.equal(matchRecord([rec], shown), rec);
});
