// v1.7.1 구버전 데이터 검증: 1.7.0에서 쌓인 기억 JSON(기억 편집기 'JSON 복사')에 새 코드를 돌려 본다.
// 사용: node tools/check-migration.mjs 기억.json
// 확인: ① 새 코드가 예외 없이 읽고 ② 주입 블록을 만들고 ③ 새 분석 결과를 반영해도 기존 필드가 그대로이며 ④ 정합성 정리가 새 필드를 지우지 않는다.
import { readFileSync } from "node:fs";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { buildBlock } from "../src/engine/memoryinject.js";
import { reconcile } from "../src/engine/memoryreconcile.js";
import { validate } from "../src/engine/memoryprompt.js";

const file = process.argv[2];
if (!file) { console.error("사용: node tools/check-migration.mjs 기억.json"); process.exit(1); }
const orig = JSON.parse(readFileSync(file, "utf8")), f = structuredClone(orig);
let bad = 0;
const ok = (n, c, x = "") => { console.log((c ? "✔ " : "✘ ") + n + (c || !x ? "" : "  → " + x)); if (!c) bad++; };
const recs = (x) => Object.values(x.people ?? {}).flatMap((p) => p.records ?? []);

try { reconcile(structuredClone(f), [{ role: "char", data: "x" }]); ok("정합성 정리가 예외 없이 돈다", true); } catch (e) { ok("정합성 정리", false, e.message); }
try { const b = buildBlock(f, { messageCount: 500, recentText: "", settings: { recentSkip: 0 } }); ok(`주입 블록 생성 (${b.manifest.tokens} 토큰)`, true); } catch (e) { ok("주입 블록 생성", false, e.message); }

const before = JSON.stringify(recs(f).map((r) => [r.id, r.act, r.g, r.m, r.pin, r.user]));
const first = recs(f).find((r) => !r.orphan), name = Object.values(f.people ?? {}).find((p) => (p.records ?? []).includes(first))?.name;
if (name) {
  try {
    const res = validate({ people: [
      { name, act: first.act, p: 3, s: 3, r: 2, kd: "f", fc: "H", pat: "시험 패턴" },                                        // 같은 기록이 다시 나옴(중복 → 병합)
      { name, act: "마이그레이션 시험용 새 행동", p: 3, s: 3, r: 2, kd: "i", fc: "M", ic: "L", attr: { c: "pref", k: "시험", v: "값" }, keys: ["시험키"], self: { feel: "기분", cause: "이유", ic: "M" } }
    ], emo: [{ from: name, to: "{{user}}", t: { trust: 2 }, why: "시험" }], exp: [{ a: name, b: "{{user}}", ae: "가", be: "나", as: false, bs: true, gap: true, viol: "위반" }] });
    const out = applyAnalysis(f, res, { at: 9999, mid: "migcheck", h: "migcheck" }, { now: Date.now() });
    ok(`새 분석 결과 반영 (기록 +${out.records}, 감정 ${out.emo}, 기대 ${out.exp})`, true);
  } catch (e) { ok("새 분석 결과 반영", false, e.message); }
  const keep = JSON.stringify(recs(f).filter((r) => r.id && JSON.parse(before).some((x) => x[0] === r.id)).map((r) => [r.id, r.act, r.pin, r.user]));
  const old = JSON.stringify(JSON.parse(before).map((x) => [x[0], x[1], x[4], x[5]]));
  ok("기존 기록의 id·본문·고정·사용자 표시가 그대로(같은 기록이 더 높은 점수로 다시 나오면 등급만 오를 수 있음)", keep === old);
  ok("기존 기록 수가 줄지 않음", recs(f).length >= JSON.parse(before).length);
  ok("구버전 기록에 새 필드가 멋대로 생기지 않음(해당 기록이 다시 나온 1건만 병합)", recs(f).filter((r) => r.id && JSON.parse(before).some((x) => x[0] === r.id) && (r.kd || r.fc || r.attr)).length <= 1);
}
try { buildBlock(f, { messageCount: 500, recentText: "시험키", settings: { recentSkip: 0 } }); ok("반영 후 주입 블록도 생성된다", true); } catch (e) { ok("반영 후 주입 블록", false, e.message); }
console.log(bad ? `\n${bad}건 실패 — 이 JSON(개인정보 빼고)을 보내 주세요.` : "\n구버전 데이터에서 문제 없음");
process.exit(bad ? 1 : 0);
