// Dusk Saga 난입: 싸우는 도중 확률로 제3세력(모두의 적)이나 우군(돕는 이)이 맵 가장자리에서 끼어든다.
// S.hunt일 때만, S.raid(0 끔 · 1 가끔 · 2 자주). 판을 만들 때 모델이 `난입 제3 …`/`난입 우군 …` 줄로 후보를 주면 그것을 먼저 쓴다.
import { applyRace } from "./races.js";
import { setJob } from "./classes.js";
import { alive, cells, nearestFree } from "./board.js";
import { PRE, presetUnit } from "./normalize.js";
import { K, TN, log, roll } from "./rules.js";
import { enter } from "./phase.js";

// 지형 테마별 떠도는 무리(제3세력)
const WILD = {
  snow: ["눈여우", "회색 늑대", "얼음 골렘"], desert: ["모래 전갈", "모래 벌레", "괴조"], swamp: ["늪 악어", "독두꺼비", "독 슬라임"],
  cave: ["동굴 박쥐", "거대 거미", "거대 지네"], sea: ["집게 괴물", "심해 촉수", "유령 해파리"], night: ["망령", "구울", "그림자 짐승"],
  lava: ["화염 슬라임", "불꽃 정령", "임프"], sky: ["괴조", "하늘 상어", "와이번"], autumn: ["멧돼지", "불곰", "살인 벌"],
  hall: ["움직이는 갑옷", "미믹", "가고일"], city: ["하수구 쥐", "폭주족", "실험체"],
};
const WILD0 = { 판타지: ["늑대", "불곰", "멧돼지", "산적", "오크", "와이번"], 현대: ["들개", "폭주족", "실험체", "경비 로봇", "광신도"] };
// 지나가다 돕는 이(우군): [바탕, 이름]
const HELP = { 판타지: [["병사", "순찰대 창병"], ["기병", "떠돌이 기사"], ["암흑 마도사", "방랑 마법사"], ["도적", "숲의 사냥꾼"]], 현대: [["경비원", "순찰 경관"], ["무장 요원", "특수 대원"], ["저격수", "엄호 저격수"]] };
export const RAID_RATE = [0, 2, 5], RAID_STEP = [0, 1, 2], RAID_CAP = [0, 5, 15]; // 2턴째부터 한 턴마다 이 확률(%)에 턴마다 STEP씩, 최대 CAP
const MAXR = [0, 1, 2];

const genre = (S) => { const B = S.battle; if (B.theme === "city") return "현대"; for (const u of Object.values(B.units)) { const d = S.defs[u.ref], p = d && PRE[d.cls] ? PRE[d.cls] : null; if ((p && p.set === "현대") || (d && d.weapons.some((w) => /pistol|rifle|sniper|gun/.test(w.type || "")))) return "현대"; } return "판타지"; };
const pick = (S, l) => l[roll(S) % l.length];

// 가장자리 칸 가운데 모두에게서 가장 먼 곳
function edge(S) {
  const B = S.battle, on = alive(B); let best = null, bd = -1;
  for (let i = 0; i < 24; i++) {
    const side = roll(S) % 4, t = roll(S) / 100, x = side === 0 ? 0 : side === 1 ? B.w - 1 : Math.floor(t * B.w), y = side === 2 ? 0 : side === 3 ? B.h - 1 : Math.floor(t * B.h);
    const d = Math.min(99, ...on.map((u) => Math.abs(u.x - x) + Math.abs(u.y - y))); if (d > bd) { bd = d; best = [x, y]; }
  }
  return best;
}

/** 이번 아군 턴에 난입이 일어나는지 굴리고, 일어나면 유닛을 세운다. 돌려주는 값: 들어온 유닛 id 목록 또는 null */
export function maybeRaid(S, ev, force) {
  const B = S.battle, lv = S.raid == null ? 1 : S.raid; if (!B || B.status !== "active" || !S.hunt || (!force && (!lv || B.turn < 2))) return null;
  const done = (B.raids || []).length; if (!force && done >= MAXR[lv]) return null;
  if (!force && roll(S) >= Math.min(RAID_CAP[lv], RAID_RATE[lv] + RAID_STEP[lv] * (B.turn - 2))) return null;
  const allies = alive(B).filter((u) => u.team === "ally"), hp = allies.reduce((n, u) => n + u.hp, 0) / Math.max(1, allies.reduce((n, u) => n + S.defs[u.ref].stats.hp, 0));
  const team = force === "friend" || force === "third" ? force : roll(S) < (hp < 0.5 ? 60 : 35) ? "friend" : "third";
  const avg = Math.round(allies.reduce((n, u) => n + S.defs[u.ref].level, 0) / Math.max(1, allies.length)) || 5;
  const at = edge(S); if (!at) return null;
  const taken = new Set(alive(B).flatMap((u) => cells(u).map(([x, y]) => K(x, y)))), ids = [];
  const pool = (B.cand || []).filter((w) => w.team === team && S.defs[w.ref]);
  if (pool.length) { // 이야기가 준 후보: 같은 이름 무리째로
    const ref0 = pick(S, pool).ref, base = S.defs[ref0].name.replace(/\s\d+$/, "");
    for (const w of pool.filter((w) => S.defs[w.ref].name.replace(/\s\d+$/, "") === base)) { const u = enter(S, { ...w, x: at[0], y: at[1], ai: w.ai || "charge" }, taken); if (u) ids.push(u.id); }
    B.cand = B.cand.filter((w) => !ids.some((id) => B.units[id].ref === w.ref));
  } else {
    const g = genre(S), [preset, name] = team === "third" ? [pick(S, (WILD[B.theme] || []).filter((k) => PRE[k]).concat(WILD0[g])), null] : pick(S, HELP[g]);
    const n = team === "friend" ? 1 + (allies.length >= 3 && roll(S) < 50 ? 1 : 0) : (PRE[preset].tags || []).includes("dragon") ? 1 : 1 + (roll(S) % Math.min(3, allies.length));
    for (let c = 0; c < n; c++) {
      let id = "raid" + done + "_" + c; while (S.defs[id]) id += "x";
      const d = presetUnit(preset, Math.max(1, avg + (team === "third" ? (n === 1 ? 1 : -1) : -1)), { id, name: (name || preset) + (n > 1 ? " " + (c + 1) : "") });
      applyRace(S, d, undefined, true); setJob(S, d, undefined); d.raid = true; S.defs[id] = d;
      const u = enter(S, { ref: id, team, x: at[0], y: at[1], ai: "charge" }, taken); if (u) ids.push(u.id); else delete S.defs[id];
    }
  }
  if (!ids.length) return null;
  const names = [...new Set(ids.map((id) => S.defs[B.units[id].ref].name.replace(/\s\d+$/, "")))].join(", ") + (ids.length > 1 ? " ×" + ids.length : "");
  (B.raids || (B.raids = [])).push({ turn: B.turn, team, names });
  log(S, "난입! " + TN[team] + " " + names + (team === "third" ? " — 누구든 덮친다" : " — 일행을 돕는다"), "ph");
  ev.push({ t: "raid", team, ids, names });
  for (const id of ids) ev.push({ t: "spawn", id });
  return ids;
}
