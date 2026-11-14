// 11-15 버그 제보 3건: 반만 적용된 인물 통합, 이매진 데이터가 지워진 응답의 표시, 태그 알림의 .webp 퍼짐
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeIdentityRedirects } from "../src/engine/pot/identity-links.js";
import { headKey, tailKey, midKey, matchRecord } from "../src/engine/lorelog.js";
import { buildAssetIndex, sceneState } from "../src/engine/imgtagfix.js";

test("통합 원본 문서가 남아 있으면 그 연결만 버리고 위키는 읽힌다", () => {
  const documents = { old: { type: "Character" }, neu: { type: "Character" }, gone2: undefined };
  delete documents.gone2;
  const r = normalizeIdentityRedirects({ old: "neu", gone: "neu" }, documents);
  assert.deepEqual({ ...r }, { gone: "neu" });
});

test("응답 끝 데이터가 화면에서 지워지고 앞부분이 바뀌어도 기록을 찾는다", () => {
  const body = "그녀는 창가에 서서 조용히 비 내리는 거리를 내려다보았다. ".repeat(8);
  const full = "[장면] " + body + "\n<imagine>{\"prompt\":\"long data ".repeat(3) + "\"}</imagine>";
  const rec = { head: headKey(full), tail: tailKey(full), mid: midKey(full) };
  assert.ok(rec.mid);
  const shown = "<p>" + body + "</p>";   // 머리 장식·끝 데이터가 빠진 화면 글
  assert.equal(matchRecord([rec], shown), rec);
});

test("태그 알림의 직전 태그는 실제 에셋 이름(확장자 없이)으로", () => {
  const idx = buildAssetIndex(["Mina_smile", "Mina_angry"]);
  const st = sceneState(['<img="Mina_smile.webp">'], idx);
  assert.equal(st.Mina.raw, '<img="Mina_smile">');
});
