// v1.7.1 측정 도구: 장기기억 JSON(기억 편집기의 'JSON 복사')로 토큰 증가량과 검색 정확도를 잰다.
// 사용: node tools/measure-memory.mjs 기억.json [--recent "현재 장면 글"] [--cases cases.json] [--template]
//   --template : 최근 상황으로 cases.json 뼈대를 출력(필요한 기억 id를 직접 채워 쓴다)
import { readFileSync } from "node:fs";
import { buildBlock, estimateTokens } from "../src/engine/memoryinject.js";
import { SYSTEM_PROMPT } from "../src/engine/memoryprompt.js";
import { evalRetrieval } from "../src/engine/memorykeys.js";

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const vals = new Set(["--recent", "--cases", "--count"].map(opt).filter(Boolean));
const file = args.find((a) => !a.startsWith("--") && !vals.has(a));
if (!file) { console.error("사용: node tools/measure-memory.mjs 기억.json [--recent \"글\"] [--cases cases.json] [--template]"); process.exit(1); }
const folder = JSON.parse(readFileSync(file, "utf8"));
const people = Object.values(folder.people ?? {}), recs = people.flatMap((p) => (p.records ?? []).filter((r) => !r.orphan));
const MC = Number(opt("--count")) || Math.max(60, ...recs.map((r) => (r.at ?? 0) + 20));

// 1.7.0 상태로 되돌린 사본: 새 필드를 전부 뗀다(기준선)
const legacy = () => {
  const f = structuredClone(folder);
  for (const k of ["emo", "exp", "hints", "alerts", "emoConv", "undo"]) delete f[k];
  for (const s of f.scenes ?? []) delete s.pov;
  for (const p of Object.values(f.people ?? {})) for (const r of p.records ?? []) for (const k of ["kd", "fc", "ic", "attr", "valid", "inv", "hist", "prev", "pat", "mean", "est", "self", "keys", "hs", "m0", "lock", "hold"]) delete r[k];
  return f;
};
const block = (f, recent, settings = {}) => buildBlock(f, { messageCount: MC, recentText: recent, settings: { recentSkip: 0, ...settings } });
const pct = (a, b) => b ? `${a >= b ? "+" : ""}${Math.round((a - b) / b * 100)}%` : "-";

if (args.includes("--template")) {
  const sc = (folder.scenes ?? []).filter((s) => !s.orphan).slice(-5);
  console.log(JSON.stringify(sc.map((s) => ({ name: `장면 #${(s.at ?? 0) + 1} ${s.place ?? ""}`, recentText: s.sum, need: [], avoid: [] })), null, 2));
  console.error("\n↑ need에는 이 장면에서 떠올라야 할 기록 id, avoid에는 나오면 안 되는 기록 id를 넣으세요. id는 기억 편집기 JSON의 records[].id 입니다.");
  process.exit(0);
}

const f = (n) => String(n).padStart(6);
console.log("── 저장된 기억 현황 ──");
const has = (k) => recs.filter((r) => r[k] != null).length;
console.log(`기록 ${recs.length}건 · 구분 ${has("kd")} · 사실확실성 ${has("fc")} · 속성 ${has("attr")} · 검색키 ${has("keys")} · 자기해석 ${has("self")} · 종료 ${recs.filter((r) => r.valid === false).length} · 보류 ${recs.filter((r) => r.hold).length}`);
console.log(`감정 쌍 ${Object.keys(folder.emo ?? {}).length} · 기대 ${Object.keys(folder.exp ?? {}).length} · 관점 달린 상황 ${(folder.scenes ?? []).filter((s) => s.pov?.length).length}`);
if (recs.length && !has("kd") && !has("fc")) console.log("※ 새 필드가 아직 하나도 없어요. 새 버전으로 몇 턴 분석을 돌린 뒤에 재야 의미가 있어요.");

console.log("\n── ① 분석 호출(응답마다 1회): 시스템 프롬프트 ──");
const BASE = 632;  // v1.7.0 SYSTEM_PROMPT 추정 토큰(main 기준, estimateTokens)
const now = estimateTokens(SYSTEM_PROMPT);
console.log(`1.7.0 ${f(BASE)} → 지금 ${f(now)} (${pct(now, BASE)}, 호출당 +${now - BASE})`);
console.log("분석 입력(known·emoState·selfHint)은 해당 데이터가 있을 때만 늘어요. 실제 입력 길이는 기억 탭의 '토큰 사용량'에서 이전/이후 며칠씩 비교하세요.");

const recent = opt("--recent") ?? (folder.scenes ?? []).filter((s) => !s.orphan).slice(-1).map((s) => s.sum).join(" ");
console.log("\n── ② 주입 블록(요청마다 1회): [Dusk Memory] ──");
const rows = [["1.7.0 기준(새 필드 제거)", block(legacy(), recent)], ["1.7.1 · 3단계 끔", block(folder, recent, { stage3: false })], ["1.7.1 · 전체", block(folder, recent)]];
const base = rows[0][1].manifest.tokens;
for (const [n, b] of rows) console.log(`${n.padEnd(22)} ${f(b.manifest.tokens)} 토큰 ${n.startsWith("1.7.0") ? "" : `(${pct(b.manifest.tokens, base)})`}`);
console.log(`2·3단계 줄(감정·관점·내면·기대): ${f(rows[2][1].manifest.tokens - rows[1][1].manifest.tokens)} 토큰 · 항목별 → ${rows[2][1].manifest.included.filter((x) => ["pov", "self", "exp", "emo"].includes(x.kind)).map((x) => `${x.kind} ${x.tokens}`).join(", ") || "없음"}`);

const casesFile = opt("--cases");
if (casesFile) {
  const cases = JSON.parse(readFileSync(casesFile, "utf8"));
  const run = (fo) => (c) => block(fo, c.recentText).manifest.recordIds;
  const a = evalRetrieval(cases, run(legacy())), b = evalRetrieval(cases, run(folder));
  console.log("\n── ③ 검색 정확도 (사례 " + cases.length + "개) ──");
  console.log(`필요한 기억 포착률   1.7.0 ${(a.capture * 100).toFixed(0)}%  →  1.7.1 ${(b.capture * 100).toFixed(0)}%`);
  console.log(`불필요한 기억 배제율 1.7.0 ${(a.exclusion * 100).toFixed(0)}%  →  1.7.1 ${(b.exclusion * 100).toFixed(0)}%`);
  for (const r of b.rows) if (r.missed.length || r.leaked.length) console.log(`  · ${r.name}: 놓침 [${r.missed.join(", ")}] · 잘못 들어옴 [${r.leaked.join(", ")}]`);
  console.log("'누락 때문에 이야기가 어긋나는지'는 숫자로 못 재요 → docs/MEASURE-v1.7.1.md 의 ④ 이어쓰기 점검을 하세요.");
}
