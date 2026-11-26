// Dusk Saga 제작대: 3×3(어디서나) · 5×5(대장간·공방 같은 곳). 칸에 소재를 모양대로 놓으면 결과가 나온다(자리 옮김·좌우 뒤집기 허용).
// 순수 함수. 장부 L.bag 항목을 쓴다. 칸 = 가방 항목 id 또는 null.
import { BY_ID, GRADE_ORDER, ELEM_NAME, partMaterial } from "./materials.js";
import { makeWeapon, gradeName } from "./gear.js";
import { GROUPS, SLOTS, makeArmor } from "./armor.js";

// ── 가방 항목의 꼬리표(레시피 재료 구분) ──
export function tagsOf(it) {
  if (!it) return []; if (it.tags) return it.tags; const b = it.mid && BY_ID[it.mid]; if (b) return b.tags;
  if (it.kind === "소재" && it.part) return partMaterial(it.src, it.part, it.model, it.elem).tags; return [];
}
const has = (it, ...t) => tagsOf(it).some((x) => t.includes(x));
// 기호 → 재료 조건
export const KEYS = {
  M: { n: "금속 주괴", ok: (it) => has(it, "metal") }, O: { n: "광석", ok: (it) => has(it, "ore") }, U: { n: "연료(석탄)", ok: (it) => has(it, "fuel") },
  S: { n: "막대", ok: (it) => has(it, "stick") }, W: { n: "나무(원목·판자)", ok: (it) => has(it, "log", "plank") }, P: { n: "판자", ok: (it) => has(it, "plank") }, R: { n: "원목", ok: (it) => has(it, "log") },
  L: { n: "가죽", ok: (it) => has(it, "leather", "hide") }, C: { n: "천", ok: (it) => has(it, "cloth") }, T: { n: "실·줄", ok: (it) => has(it, "string") }, I: { n: "섬유", ok: (it) => has(it, "fiber") },
  G: { n: "보석", ok: (it) => has(it, "gem") }, E: { n: "정수", ok: (it) => has(it, "essence") }, H: { n: "약초", ok: (it) => has(it, "herb") }, B: { n: "유리병", ok: (it) => has(it, "bottle") }, Q: { n: "물·기름", ok: (it) => has(it, "liquid") },
  D: { n: "가루(소금·유황·화약)", ok: (it) => has(it, "powder") }, A: { n: "날카로운 부위(이빨·발톱·뿔)", ok: (it) => has(it, "fang", "claw", "horn") }, X: { n: "단단한 부위(비늘·갑각·판)", ok: (it) => has(it, "scale", "shell", "plate", "bone") },
  F: { n: "깃털·날개", ok: (it) => has(it, "feather", "wing") }, K: { n: "핵·영혼석", ok: (it) => has(it, "core") }, Y: { n: "몬스터 부위", ok: (it) => has(it, "part") }, N: { n: "아무 소재", ok: (it) => !!it && it.kind === "소재" },
  m: { n: "중갑 재료(주괴·판·비늘·갑각·뼈)", ok: (it) => has(it, "metal", "plate", "scale", "shell", "bone") }, l: { n: "경갑 재료(가죽·비늘·막)", ok: (it) => has(it, "leather", "hide", "scale", "membrane") },
  c: { n: "로브 재료(천·깃털·날개)", ok: (it) => has(it, "cloth", "feather", "wing") }, b: { n: "무투 재료(가죽·천·뼈·이빨)", ok: (it) => has(it, "leather", "hide", "cloth", "bone", "fang", "claw") }, g: { n: "전술 재료(천·판·기계)", ok: (it) => has(it, "cloth", "plate", "mech") },
  Z: { n: "부적 재료(보석·부위)", ok: (it) => has(it, "gem", "part") }, J: { n: "기계 부품", ok: (it) => has(it, "mech") }, V: { n: "소금", ok: (it) => it?.mid === "salt" }, h: { n: "날가죽", ok: (it) => has(it, "hide") && !has(it, "leather") },
};
const SMELT = { ore_copper: "ingot_copper", ore_iron: "ingot_iron", ore_silver: "ingot_silver", ore_gold: "ingot_gold", ore_mithril: "ingot_mithril", ore_adamant: "ingot_adamant", ore_meteor: "ingot_meteor", ore_dark: "ingot_dark" };
// out: { mat: 도감 id, n } | { weapon: kind, label } | { item: 회복약 등 } | { charm: true } | { smelt: true } | { essence: true }
const R = (id, name, size, rows, out, about = "") => ({ id, name, size, rows, out, about, ...(out.weapon || size === 5 ? { shop: true } : {}) });
const Rs = (...a) => ({ ...R(...a), shop: true });   // 대장간·아틀리에(불·모루·증류기)가 있어야 하는 손질
export const RECIPES = [
  // 손질(3×3)
  Rs("smelt", "제련", 3, ["O", "U"], { smelt: true }, "광석 아래 석탄 → 주괴"),
  R("plank", "판자", 3, ["R"], { mat: "plank", n: 2 }, "원목 한 개 → 판자 둘"),
  R("stick", "손잡이 막대", 3, ["P", "P"], { mat: "stick", n: 4 }, "판자 둘을 세로로"),
  R("tan", "무두질", 3, ["h", "V"], { mat: "leather", n: 1 }, "날가죽 아래 소금"),
  R("thread", "실 잣기", 3, ["II"], { mat: "thread", n: 1 }, "섬유 둘을 나란히"),
  R("rope", "밧줄", 3, ["T", "T", "T"], { mat: "rope", n: 1 }, "실 셋을 세로로"),
  Rs("plate", "강철판", 3, ["MM", "MM"], { mat: "plate_steel", n: 1 }, "주괴 넷을 네모로"),
  R("powder", "화약", 3, ["UDD"], { mat: "gunpowder", n: 2 }, "석탄·가루 둘"),
  R("cloth", "아마포", 3, ["TTT"], { mat: "cloth_linen", n: 1 }, "실 셋을 가로로"),
  Rs("essence", "정수 추출", 3, [".Y.", "YKY", ".Y."], { essence: true }, "핵 둘레에 부위 넷 → 그 속성의 정수"),
  // 무기(3×3)
  R("sword", "검", 3, ["M", "M", "S"], { weapon: "sword", label: "검" }),
  R("dagger", "단검", 3, ["A", "S"], { weapon: "dagger", label: "단검" }, "날카로운 부위나…"),
  R("dagger2", "단검", 3, ["M", "S"], { weapon: "dagger", label: "단검" }),
  R("lance", "창", 3, ["..M", ".S.", "S.."], { weapon: "lance", label: "창" }),
  R("axe", "도끼", 3, ["MM", "MS", ".S"], { weapon: "axe", label: "도끼" }),
  R("hammer", "망치", 3, ["MMM", "MSM", ".S."], { weapon: "hammer", label: "망치" }),
  R("bow", "활", 3, [".ST", "S.T", ".ST"], { weapon: "bow", label: "활" }),
  R("crossbow", "석궁", 3, ["MSM", "TST", ".S."], { weapon: "crossbow", label: "석궁" }),
  R("staff", "마법 지팡이", 3, ["G", "S", "S"], { weapon: "magestaff", label: "지팡이" }),
  R("holy", "치유의 지팡이", 3, ["HGH", ".S.", ".S."], { weapon: "holystaff", label: "성장" }),
  R("wand", "완드", 3, ["E", "S"], { weapon: "wand", label: "완드" }),
  R("tome", "마도서", 3, ["CEC", "LLL"], { weapon: "tome", label: "마도서" }),
  R("fist", "권갑", 3, ["L.L", "MLM"], { weapon: "fist", label: "권갑" }),
  R("claw", "갈퀴손", 3, ["AAA", ".L."], { weapon: "claw", label: "갈퀴손" }),
  R("shield", "방패", 3, ["MWM", "MMM", ".M."], { weapon: "shield", label: "방패" }),
  R("katana", "도", 3, ["..M", ".M.", "L.."], { weapon: "katana", label: "도" }),
  R("whip", "채찍", 3, ["..T", ".T.", "L.."], { weapon: "whip", label: "채찍" }),
  R("talisman", "부적 마서", 3, ["CGC"], { weapon: "talisman", label: "부적" }),
  // 소모품(3×3)
  R("potion", "상처약", 3, ["H", "Q", "B"], { item: "potion" }, "약초·물·병을 세로로"),
  R("potion2", "고급 회복약", 3, ["HHH", ".Q.", ".B."], { item: "potion2" }),
  R("antidote", "해독제", 3, ["HDH", ".B."], { item: "antidote" }),
  R("bomb", "폭탄", 3, [".T.", "DBD"], { item: "bomb" }),
  // 장신구(3×3): 가운데 재료가 효과를 정한다
  R("charm", "부적", 3, [".T.", "TZT", ".T."], { charm: true }, "실 넷 가운데 보석·부위 하나"),
  // 큰 제작(5×5, 대장간·공방)
  R("greatsword", "대검", 5, ["..M..", "..M..", "..M..", ".MXM.", "..S.."], { weapon: "greatsword", label: "대검", up: 1 }),
  R("greataxe", "대도끼", 5, ["MMM..", "MMMS.", "..S..", ".S...", "S...."], { weapon: "greataxe", label: "대도끼", up: 1 }),
  R("halberd", "미늘창", 5, ["...MM", "...SM", "..S..", ".S...", "S...."], { weapon: "halberd", label: "미늘창", up: 1 }),
  R("longbow", "장궁", 5, ["..ST.", ".S.T.", "S..T.", ".S.T.", "..ST."], { weapon: "longbow", label: "장궁", up: 1 }),
  R("orb", "마력 보주", 5, [".GEG.", "GEKEG", ".GEG.", "..S..", "..S.."], { weapon: "orb", label: "보주", up: 2 }),
  R("tower", "대방패", 5, ["XMMMX", "MMMMM", "MMXMM", ".MMM.", "..M.."], { weapon: "shield", label: "대방패", up: 1 }),
  R("slayer", "괴물 사냥 검", 5, ["..A..", ".XMX.", ".XMX.", ".GKG.", "..S.."], { weapon: "greatsword", label: "검", up: 2, slay: true }),
  R("scythe", "사신의 낫", 5, ["AMMM.", "...MS", "...S.", "..S..", ".S..."], { weapon: "scythe", label: "낫", up: 2 }),
  R("mecha", "기계 석궁", 5, [".MJM.", "TJSJT", ".MSM.", "..S..", "..L.."], { weapon: "crossbow", label: "기계 석궁", up: 1 }),
  ...armorRecipes(),
  R("elixir", "영약", 5, [".HHH.", "HEKEH", ".HQH.", "..B..", "....."], { item: "elixir" }),
];
// 방어구: 직업군마다 주재료(소문자)와 묶는 재료(대문자)가 다르다 — 같은 소재라도 직업군별로 따로 만든다
function armorRecipes() {
  const P = { m: "L", l: "T", c: "T", b: "I", g: "J" }, G = { m: "heavy", l: "light", c: "robe", b: "brawler", g: "tactical" };
  const S = { head: ["ppp", "pkp"], body: ["p.p", "pkp", "ppp"], hands: ["p.p", "k.k"], legs: ["pkp", "p.p", "p.p"], feet: ["k.k", "p.p"] };
  const out = []; for (const [p, k] of Object.entries(P)) for (const [slot, rows] of Object.entries(S)) out.push({ id: "ar_" + G[p] + "_" + slot, name: GROUPS[G[p]].n + " " + SLOTS[slot], size: 3, rows: rows.map((r) => r.replace(/p/g, p).replace(/k/g, k)), out: { armor: G[p], slot }, shop: true, about: GROUPS[G[p]].about.split(" — ")[0] + " 전용" });
  return out;
}
const ITEMS = { potion: { name: "상처약", mt: 10, max: 3 }, potion2: { name: "고급 회복약", mt: 20, max: 3 }, antidote: { name: "해독제", mt: 5, max: 3, cure: true }, bomb: { name: "폭탄", type: "dagger", kind: "shuriken", bomb: true }, elixir: { name: "영약", mt: 99, max: 2 } };
// 부적: 가운데 재료 꼬리표 → 지속 효과(기본 기술 id)
const CHARM = [["fang", "str2", "힘의 부적"], ["claw", "str2", "힘의 부적"], ["horn", "laststand", "투지의 부적"], ["scale", "def2", "수호의 부적"], ["shell", "def2", "수호의 부적"], ["plate", "def2", "수호의 부적"], ["bone", "riposte", "역습의 부적"], ["feather", "spd2", "질풍의 부적"], ["wing", "spd2", "질풍의 부적"], ["eye", "hit15", "혜안의 부적"], ["hide", "avo10", "은신의 부적"], ["core", "fullform", "만전의 부적"], ["gem", "hit15", "보석 부적"]];

// ── 맞추기 ──
const norm = (rows) => { const h = rows.length, w = Math.max(...rows.map((r) => r.length)); return rows.map((r) => r.padEnd(w, ".")); };
const mirror = (rows) => rows.map((r) => [...r].reverse().join(""));
/** grid: 길이 size*size, 각 칸 가방 항목(없으면 null). 맞으면 { recipe, cells:[{i,key}] } */
export function matchGrid(grid, size, bag) {
  const at = (i) => (grid[i] ? bag.find((b) => b.id === grid[i]) || null : null), filled = grid.map((g, i) => (g ? i : -1)).filter((i) => i >= 0); if (!filled.length) return null;
  const xs = filled.map((i) => i % size), ys = filled.map((i) => Math.floor(i / size)), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 + 1, h = Math.max(...ys) - y0 + 1;
  for (const r of RECIPES) {
    if (r.size > size) continue;
    for (const rows of [norm(r.rows), mirror(norm(r.rows))]) {
      // 모양의 빈 테두리를 걷어 낸 크기와 칸의 크기가 같아야 한다
      const ry = rows.map((row, y) => (row.replace(/\./g, "") ? y : -1)).filter((y) => y >= 0), cols = [...Array(rows[0].length).keys()].filter((x) => rows.some((row) => row[x] !== ".")); if (!ry.length) continue;
      const py0 = ry[0], px0 = cols[0], ph = ry.at(-1) - py0 + 1, pw = cols.at(-1) - px0 + 1; if (ph !== h || pw !== w) continue;
      let ok = true; const cells = [];
      for (let y = 0; y < h && ok; y++) for (let x = 0; x < w && ok; x++) { const k = rows[py0 + y][px0 + x], i = (y0 + y) * size + (x0 + x), it = at(i); if (k === ".") { if (it) ok = false; } else if (!it || !KEYS[k]?.ok(it)) ok = false; else cells.push({ i, key: k }); }
      if (ok) {
        // 같은 항목을 여러 칸에 놓았다면 개수가 모자라지 않아야
        const need = new Map(); for (const c of cells) need.set(grid[c.i], (need.get(grid[c.i]) || 0) + 1); if ([...need].some(([id, n]) => (bag.find((b) => b.id === id)?.n || 0) < n)) return { recipe: r, cells, short: true };
        return { recipe: r, cells };
      }
    }
  }
  return null;
}
const gi = (g) => Math.max(0, GRADE_ORDER.indexOf(g));
/** 결과 미리보기(만들지 않음): { name, grade, elem, kind, icon 정보, desc } */
export function preview(match, grid, bag, level = 10) {
  if (!match) return null; const r = match.recipe, mats = match.cells.map((c) => bag.find((b) => b.id === grid[c.i])), o = r.out;
  const main = mats.filter((m) => has(m, "metal", "part", "gem", "essence", "core")).sort((a, b) => gi(b.grade) - gi(a.grade))[0] || mats[0];
  const elem = (mats.find((m) => has(m, "essence") && m.elem) || mats.find((m) => has(m, "gem") && m.elem) || mats.find((m) => has(m, "part") && m.elem) || mats.find((m) => has(m, "metal") && m.elem))?.elem || "";
  if (o.mat) { const b = BY_ID[o.mat]; return { kind: "mat", name: b.name, n: o.n, mid: o.mat, grade: b.grade, elem: b.elem, shape: b.shape, pal: b.pal }; }
  if (o.smelt) { const ore = mats.find((m) => has(m, "ore")), id = SMELT[ore?.mid] || "ingot_iron", b = BY_ID[id]; return { kind: "mat", name: b.name, n: 1, mid: id, grade: b.grade, elem: b.elem, shape: b.shape, pal: b.pal }; }
  if (o.essence) { const e = mats.find((m) => m.elem)?.elem || "arcane", b = BY_ID["ess_" + e] || BY_ID.ess_arcane; return { kind: "mat", name: b.name, n: 1, mid: b.id, grade: b.grade, elem: b.elem, shape: b.shape, pal: b.pal }; }
  if (o.item) { const t = ITEMS[o.item]; return { kind: "item", name: t.name, item: o.item, grade: "양질", shape: o.item === "bomb" ? "bomb" : "potion", pal: o.item === "antidote" ? "emerald" : o.item === "elixir" ? "gold" : o.item === "bomb" ? "iron" : "ruby" }; }
  if (o.armor) { const main = mats.filter((m) => !has(m, "string", "leather", "fiber", "mech") || o.armor === "light").sort((a, b) => gi(b.grade) - gi(a.grade))[0] || mats[0], avg = mats.reduce((s, m) => s + gi(m.grade), 0) / mats.length, grade = GRADE_ORDER[Math.min(GRADE_ORDER.length - 1, Math.round((gi(main.grade) * 2 + avg) / 3))]; const a = makeArmor(o.armor, o.slot, { ...main, pal: main.pal || BY_ID[main.mid]?.pal }, grade); return { kind: "armor", name: a.name, grade, elem: a.elem, a }; }
  if (o.charm) { const mid = mats[4] || mats.find((m) => has(m, "gem", "part")), c = CHARM.find(([t]) => has(mid, t)) || CHARM.at(-1); return { kind: "charm", name: (elem ? ELEM_NAME[elem] + " " : "") + c[2], skill: c[1], grade: mid?.grade || "양질", elem, shape: "charm", pal: mid?.pal || "gold", from: mid?.name }; }
  // 무기: 가장 좋은 재료 등급 + 5×5 보너스, 재료가 많고 고를수록 조금 더
  const avg = mats.reduce((s, m) => s + gi(m.grade), 0) / mats.length, gIdx = Math.min(GRADE_ORDER.length - 1, Math.round((gi(main.grade) * 2 + avg) / 3) + (o.up || 0)), grade = GRADE_ORDER[gIdx];
  const base = String(main.name || "").replace(/의 /, " ").replace(/ 주괴$| 원석$/, ""), name = (base + " " + o.label).slice(0, 30);
  const w = makeWeapon({ name, kind: o.weapon, grade, elem, desc: (o.slay ? "괴물 사냥 " : "") + mats.map((m) => m.name).join(", ") + "로 만듦" }, level);
  return { kind: "weapon", name: w.name, grade: gradeName(w.grade), elem, w };
}
/** 만든다: 재료를 쓰고 결과를 가방에. 돌려주는 값: preview 결과 또는 null */
export function craftGrid(L, grid, size, { workshop = false, level = 10, addItem, note } = {}) {
  if (size === 5 && !workshop) return null; const m = matchGrid(grid, size, L.bag); if (!m || m.short || (m.recipe.shop && !workshop)) return null; const p = preview(m, grid, L.bag, level); if (!p) return null;
  for (const c of m.cells) { const it = L.bag.find((b) => b.id === grid[c.i]); if (!it) return null; it.n--; } L.bag = L.bag.filter((b) => b.n > 0);
  if (p.kind === "mat") addItem(L, { kind: "소재", name: p.name, mid: p.mid, n: p.n, grade: p.grade, elem: p.elem, shape: p.shape, pal: p.pal, tags: BY_ID[p.mid].tags });
  else if (p.kind === "item") { const t = ITEMS[p.item], w = t.bomb ? { ...makeWeapon({ name: t.name, kind: "shuriken", grade: "양질", elem: "fire" }), name: t.name, max: 2, uses: 2 } : { name: t.name, type: "item", mt: t.mt, hit: 0, crit: 0, rmin: 0, rmax: 0, max: t.max, uses: t.max, ...(t.cure ? { cure: true } : {}) }; addItem(L, { kind: "장비", name: t.name, w, n: 1, shape: p.shape, pal: p.pal, grade: p.grade }); }
  else if (p.kind === "armor") addItem(L, { kind: "방어구", name: p.a.name, a: p.a, n: 1, grade: p.grade, elem: p.elem, shape: { head: "skull", body: "plate", hands: "w_fist", legs: "hide", feet: "leather" }[p.a.slot], pal: p.a.pal });
  else if (p.kind === "charm") addItem(L, { kind: "장신구", name: p.name, charm: { skill: p.skill, name: p.name }, n: 1, shape: "charm", pal: p.pal, grade: p.grade, elem: p.elem });
  else addItem(L, { kind: "장비", name: p.w.name, w: p.w, n: 1, grade: p.grade, elem: p.elem });
  note?.(L, `제작: ${p.name}${p.kind === "weapon" ? ` (${p.grade}${p.elem ? " · " + ELEM_NAME[p.elem] : ""})` : ""}`);
  return p;
}
/** 레시피가 요구하는 재료 요약(레시피 책 표시용): [{ key, n, name }] */
export const needOf = (r) => { const m = new Map(); for (const row of r.rows) for (const k of row) if (k !== ".") m.set(k, (m.get(k) || 0) + 1); return [...m].map(([k, n]) => ({ key: k, n, name: KEYS[k].n })); };
/** 가방으로 이 레시피를 채울 수 있으면 칸 배치를 돌려준다(레시피 책에서 ‘채우기’) */
export function autoFill(r, bag, size) {
  if (r.size > size) return null; const rows = norm(r.rows), grid = Array(size * size).fill(null), left = new Map(bag.map((b) => [b.id, b.n]));
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) { const k = rows[y][x]; if (k === ".") continue; const it = bag.filter((b) => KEYS[k].ok(b) && left.get(b.id) > 0).sort((a, b) => gi(a.grade) - gi(b.grade))[0]; if (!it) return null; left.set(it.id, left.get(it.id) - 1); grid[y * size + x] = it.id; }
  return grid;
}
