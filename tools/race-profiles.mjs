// 종족 프로필 문서 생성: node tools/race-profiles.mjs > addons/memory/RACE-PROFILES.md (값은 src/engine/races.js가 기준)
import { RACES } from "../src/engine/races.js";
import { partOf } from "../src/engine/humanitems.js";
const GROUP = [["인간형", ["human", "elf", "dwarf", "small", "giant"]], ["수인 (케모미미)", ["beast"]], ["비인간 몸", ["bird", "reptile", "aquatic", "insect"]], ["용·신비", ["dragon", "holy", "spirit", "plant"]], ["마족·어둠", ["demon", "vampire", "undead", "orc"]], ["동양 요괴", ["yokai"]], ["인공·기타", ["construct", "slime", "ghost"]]];
const BODY = { ears: { elf: "뾰족한 긴 귀", halfelf: "살짝 뾰족한 귀", fin: "지느러미 귀", cat: "고양이 귀", wolf: "늑대 귀", fox: "여우 귀", dog: "개 귀", rabbit: "토끼 귀", round: "둥근 귀", side: "옆으로 난 귀", horse: "말 귀", bat: "박쥐 귀", feather: "깃털 귀", none: "귀 없음" },
  horns: { oni: "작은 뿔", small: "작은 뿔", demon: "휜 뿔", goat: "염소 뿔", curl: "말린 뿔", dragon: "용 뿔", antler: "사슴뿔", unicorn: "외뿔", antenna: "더듬이" },
  tail: { cat: "가는 긴 꼬리", thin: "가는 꼬리", lion: "술 달린 긴 꼬리", tiger: "줄무늬 긴 꼬리", demon: "하트 끝 꼬리", dog: "개 꼬리", wolf: "굵은 긴 꼬리", fluffy: "털 꼬리", fox: "풍성한 긴 꼬리", puff: "동그란 짧은 꼬리", cow: "술 달린 꼬리", horse: "말 꼬리", bird: "꽁지깃", thick: "굵은 비늘 꼬리", dragon: "용 꼬리", ninetail: "여러 갈래 꼬리", twin: "두 갈래 꼬리", none: "" },
  wings: { feather: "깃털 날개", featherdark: "검은 깃털 날개", bat: "박쥐 날개", batsmall: "작은 박쥐 날개", insect: "곤충 날개", butterfly: "나비 날개", fairy: "요정 날개" },
  lower: { serpent: "하반신 뱀", fish: "하반신 물고기", tentacle: "하반신 촉수", spider: "하반신 거미", horse: "하반신 말", slime: "하반신 슬라임", ghost: "하반신 흐릿함" } };
const SIZE = { tiny: "아주 작음", small: "작음", big: "큼", huge: "아주 큼" };
const FLAG = { egg: "알을 낳음", milk: "모유 체질", essence: "정기 흡수", charm: "매혹", pher: "페로몬", thirst: "피 갈증", battery: "충전", regen: "빠른 회복", bond: "짝 결속", hungry: "많이 먹음", sleepy: "잠이 많음", hibernate: "겨울잠", night: "밤에 활발", hoard: "모으는 습성", drink: "술에 강함", fall: "욕망에 따라 날개 색", dual: "쌍수" };
const cyc = (r) => { const c = r.cycle ?? { k: "menses" };
  if (c.k === "menses") return c.len ? `월경 · 종족 설정 약 ${c.len}일 주기(월경 추적 계산엔 아직 미반영 — 지금은 기존 26~32일)` : "월경 28일 안팎";
  if (c.k === "moon") return "보름 전후(실제 달 위상)";
  if (c.k === "none") return "주기 없음";
  const m = c.months?.length ? `${c.months.join("·")}월` : ""; const ev = c.every ? `${c.every}일마다` : "";
  return `발정기 ${[m, ev].filter(Boolean).join(" · ")} ${c.len ?? 3}일${r.heatK ? ` (성욕 ×${r.heatK})` : ""}`.replace(/\s+/g, " "); };
const preg = (r) => { const p = r.preg ?? {}; if (p.none) return "임신 안 함"; if (p.will) return "본인이 원할 때만"; const a = []; if (Number.isFinite(p.p) && p.p < 1) a.push(`드묾 ×${p.p}`); else a.push("가능"); if (p.wk) a.push(`약 ${p.wk}주`); if (p.multi) a.push("다태아 잘 생김"); return a.join(" · "); };
const body = (r) => Object.entries(r.body ?? {}).map(([k, v]) => BODY[k]?.[v]).filter(Boolean).join(", ") || "사람과 같음";
const zones = (r) => (r.zones ?? []).map(([p, l]) => `${partOf(p)?.label ?? p}${"♥".repeat(l)}`).join(", ") || "—";
const wx = (r) => Object.values(r.wx ?? {}).join(" / ");
const out = ["# 종족 프로필 (장기기억 0.3.22)", "", `> 자동 생성: \`node tools/race-profiles.mjs > addons/memory/RACE-PROFILES.md\`. 값은 \`src/engine/races.js\`가 기준이에요. 모두 ${RACES.length}종.`, "> 원칙: 성격·말투·태도는 넣지 않고 몸·체질·생활만. 강한 제약은 완화. 수인은 케모미미(사람 몸 + 귀·꼬리). 인간×수인 임신 가능, 본인 조절 종족은 기본 켬, 사마귀 습성 뺌.", ""];
const used = new Set();
for (const [g, frames] of GROUP) {
  const list = RACES.filter((r) => frames.includes(r.frame) && !used.has(r.id)); if (!list.length) continue;
  out.push(`## ${g} (${list.length})`, "");
  for (const r of list) {
    used.add(r.id);
    const meta = [r.life ? `수명 ${r.life >= 9999 ? "끝없음" : `약 ${r.life.toLocaleString()}년`}` : "", r.size ? `체격 ${SIZE[r.size]}` : "", r.temp ? `체온 ${r.temp === "cold" ? "낮음" : "높음"}` : "", r.lust && r.lust !== 1 ? `성욕 ×${r.lust}` : "", r.fat != null && r.fat !== 1 ? `피로 ×${r.fat}` : "", r.jeal ? `질투 ×${r.jeal}` : ""].filter(Boolean).join(" · ");
    const flags = Object.keys(FLAG).filter((k) => r[k]).map((k) => FLAG[k]).join(", ");
    out.push(`### ${r.label} \`${r.id}\``,
      `- **일반**: ${r.gen ?? "—"}`, `- **NSFW**: ${r.nsfw ?? "—"}`,
      `- **주기**: ${cyc(r)} · **임신**: ${preg(r)}`,
      `- **몸 모형**: ${body(r)} · **성감대 기본값**: ${zones(r)}`,
      ...(meta || flags ? [`- **체질**: ${[meta, flags].filter(Boolean).join(" · ")}`] : []),
      ...(wx(r) ? [`- **날씨**: ${wx(r)}`] : []), "");
  }
}
const rest = RACES.filter((r) => !used.has(r.id)); if (rest.length) out.push("## 기타", ...rest.map((r) => `- ${r.label} \`${r.id}\``), "");
console.log(out.join("\n"));
