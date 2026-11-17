// addon-rebuild: 띄어쓰기 없는 한국 이름(성 한 글자): '하연'과 '지하연'을 같은 사람으로(시험판 피드백 — 별개 문서가 생김)
import test from "node:test";
import assert from "node:assert/strict";
import { canonNameKo, sameKoreanPerson } from "../src/engine/namekr.js";

test("성 한 글자 + 이름: 이름만 불러도 같은 사람, 성까지 붙여도 같은 사람(한 명일 때만)", () => {
  const known = [{ name: "지하연" }, { name: "박미나" }, { name: "미오" }];
  assert.equal(canonNameKo("하연", known), "지하연");
  assert.equal(canonNameKo("미나", known), "박미나");
  assert.equal(canonNameKo("김미오", known), "미오", "새 이름이 성+기존 이름");
  assert.equal(canonNameKo("지하연", known), "지하연");
  assert.equal(canonNameKo("하린", known), "하린", "모르는 이름은 그대로");
  assert.equal(canonNameKo("하연", [...known, { name: "서하연" }]), "하연", "둘이면 누구인지 모르니 안 합침");
  assert.equal(canonNameKo("리스", [{ name: "아리스" }]), "리스", "성이 아닌 첫 글자(아)는 안 합침");
  assert.equal(canonNameKo("유저", known), "{{user}}", "기존 규칙 그대로");
  assert.equal(sameKoreanPerson("하연", "지하연"), true); assert.equal(sameKoreanPerson("하연", "하연이"), false);
});

test("Erosync 이름 연결도 같은 규칙(하연 → 지하연 프로필)", async () => {
  const { matchProfile } = await import("../src/erosync/turnupdate.js");
  assert.equal(matchProfile({ name: "하연" }, [{ id: "a", name: "지하연" }, { id: "b", name: "미오" }])?.id, "a");
  assert.equal(matchProfile({ name: "하연" }, [{ id: "a", name: "지하연" }, { id: "c", name: "서하연" }]), null);
});
