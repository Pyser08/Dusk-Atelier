import { BODY, ROOT, STORE, HOST } from "./env.js";
// Dusk Saga 화면 초안(목업): 실제 엔진으로 움직인다
import { pick, wheel, seg, bar, holds } from "./ui.js";
import * as E from "../../src/rpg/engine/index.js";
// 3D 화면이 끼워 넣는 연출(없으면 2D 컷씬)
export const hooks = { fight: null, menu: null, face: null, redraw: null, E, kit: null };
const LINE = { sword: "M5 19 8 16M6 14l4 4M9 15 19 5v-1h-1L8 14", lance: "M4 20 15 9M14 5l6-1-1 6-4 1z", axe: "M6 20 15 6M13 4c4 0 7 3 7 7-3-1-6-2-8-4z", bow: "M7 4c9 1 12 4 13 13M7 4l13 13M4 20 14 10", tome: "M4 5c3-1 6 0 8 2 2-2 5-3 8-2v13c-3-1-6 0-8 2-2-2-5-3-8-2zM12 7v13", dagger: "M6 18l3-3M7 13l4 4M10 14l7-8-8 7", staff: "M5 20 14 10M16 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z", claw: "M6 19V9l3-3v6M11 18V6l3-2v8M16 18V8l3-2v10l-3 4H9", item: "M9 4h6M10 4v5l-4 6a4 4 0 0 0 3 5h6a4 4 0 0 0 3-5l-4-6V4" };
const glyph = (t) => `<svg class=gl viewBox="0 0 24 24"><path d="${LINE[t] ?? LINE.sword}"/></svg>`;
const gradeMark = (w, elem) => { const e = E.ELEMENTS[elem ?? w?.elem]; return (w?.grade != null ? `<u class="gr g${Math.floor(w.grade / 3)}">${E.gradeName(w.grade)}</u>` : "") + (e ? `<u class=el style="--e:${e.c}">${e.n}</u>` : ""); };
const sexMark = (d) => (d.sex ? `<span class=sx aria-label="${d.sex === "f" ? "여성" : "남성"}">${d.sex === "f" ? "♀" : "♂"}</span>` : "");
const faceOf = (u) => { const src = hooks.face?.(u.team, D(u).emoji, !!u.boss, { race: E.RACES[D(u).race]?.mem ?? "", w: D(u).weapons[u.wi]?.type ?? "", look: E.lookOf(D(u).weapons[u.wi]), mt: D(u).mtype, sex: D(u).sex ?? "", id: u.id, model: E.modelOf(D(u)), elem: E.elemOfUnit(D(u)), cls: D(u).cls ?? "", outfit: D(u).outfit ?? "" }); return src ? `<img class=pt src="${src}" alt="">` : `<span class=pt>${esc(D(u).emoji)}</span>`; };
const KEY = "dusk-saga-dev" + (new URLSearchParams(location.search).get("k") ?? "");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const app = ROOT.querySelector("#app"), wait = (ms) => new Promise((r) => setTimeout(r, ms));
// 고른 프리셋으로 전투를 만든다(없으면 예시 전장)
const PICK = "dusk-saga-pick", picked = () => { try { return JSON.parse(STORE.getItem(PICK)) || {}; } catch { return {}; } };
const PARTY = [["병사", "검사"], ["기병", "기병"], ["암흑 마도사", "마도사"], ["고블린 궁수", "궁수"]];
function custom(p) {
  const demo = E.demo(), lv = Math.max(1, Math.min(40, +p.lv || 5)), races = Object.keys(E.RACES), rr = () => races[Math.floor(Math.random() * races.length)], rc = (v) => (v === "?" ? rr() : v), arms = Object.keys(E.CAT).filter((n) => E.CAT[n].type === p.arms && !["staff", "item"].includes(E.CAT[n].type));
  // 고른 무기는 그 직업이 쓸 수 있을 때만 첫 자리에 온다
  const names = [...(p.names ?? []), "아린", "렌", "세라", "미라"].slice(0, 4), at = [[2, 4], [2, 6], [1, 5], [3, 5]], fo = [[11, 4], [11, 6], [12, 5], [10, 3], [10, 7]], set = Object.keys(E.PRE).filter((n) => E.PRE[n].set === (p.set || "판타지"));
  const units = PARTY.map(([pre, job], i) => ({ id: "hero" + i, preset: pre, name: names[i], level: lv, job: i === 0 && p.job ? p.job : job, race: rc(p.ally), emoji: ["🔱", "🗡️", "🔮", "🏹"][i], sex: p.sex || "mmff"[i], ...(i === 0 && arms.length ? { weapons: arms.slice(0, 4).map((name) => ({ name })).concat({ name: "상처약" }) } : {}) }));
  fo.forEach((_, i) => { const pre = set[Math.floor(Math.random() * set.length)]; units.push({ id: "foe" + i, preset: pre, level: i === 2 ? Math.min(40, lv + 2) : lv, sex: E.modelOf({ name: pre }) ? undefined : "mf"[i % 2], race: rc(p.foe), ...(i === 2 ? { name: pre + " 대장" } : {}) }); });
  return { ...demo, skills: [], map: undefined, name: p.map, mapPreset: p.map, objective: { type: "boss" }, units, place: at.map(([x, y], i) => ({ ref: "hero" + i, team: "ally", x, y })).concat(fo.map(([x, y], i) => ({ ref: "foe" + i, team: "enemy", x, y, boss: i === 2, ai: i === 2 ? "hold" : "charge" }))) };
}
function start() { const S = E.fresh(); E.ensureBase(S); const p = FX ? {} : picked(); E.loadEncounter(S, E.MAPS[p.map] ? custom(p) : { ...E.demo(), units: E.demo().units.map((u) => ({ ...u, sex: { arin: "m", ren: "m", sera: "f", mira: "f", lia: "f", raider: "m", soldier: "m", sniper: "f", rider: "m", captain: "m" }[u.id] })) }); if (E.MAPS[p.map] && S.defs.hero0) { const [n, ...r] = String(p.spell ?? "").split(/\s[-–]\s/), lv = S.defs.hero0.level; E.applyKit(S, "hero0", { weapons: p.gear ? [E.makeWeapon({ name: p.gear.split(",")[0], desc: p.gear }, lv)] : [], skills: n ? [E.makeSpell({ name: n, desc: r.join(" ") }, lv)].filter(Boolean) : [] }); } if (!E.MAPS[p.map]) { E.applyKit(S, "ren", { skills: [E.makeSpell({ name: "고유 검기", desc: "한 번의 베기", grade: "전설" }, 20)] }); E.applyKit(S, "sera", { skills: [E.makeSpell({ name: "고유 화염술", desc: "불꽃을 터뜨리는 마법", grade: "전설" }, 20)] }); } E.snapshot(S); return S; }
// 시연(/fx)은 저장된 전투를 읽지도 쓰지도 않고 늘 예시 전장에서 돈다
const FX = BODY.dataset.mode === "fx", fresh0 = !FX && !STORE.getItem(KEY);
let S; try { S = (!FX && JSON.parse(STORE.getItem(KEY))) || start(); } catch { S = start(); }
const save = () => !FX && STORE.setItem(KEY, JSON.stringify(S));
// sel: 고른 유닛, from: 원래 자리, R: 이동 범위, opt: 고른 명령
let V = { sel: null }, busy = false, skip = false;
const U = (id) => S.battle.units[id], D = (u) => S.defs[u.ref];
const DECO = { f: "♣", m: "▲", F: "⌂", T: "♛", p: "▮", b: "≡", w: "≈", l: "♨", s: "∴", i: "❄", h: "△", H: "▲", v: " ", "#": "", d: "∵", n: "❅", o: "♠", r: "═", k: "✶", u: "☠", q: "✚", c: "◆" };

async function cutscene(a, d, ev, speed = 1, ha, hd) {
  const hits = ev.filter((e) => e.t === "strike"); if (!hits.length) return;
  skip = false; const el = document.createElement("div"); el.className = "cut";
  const half = (u, c) => `<div class="half ${c} ${u.team}" data-u="${esc(u.id)}"><div class=face>${esc(D(u).emoji)}</div><b>${esc(D(u).name)}</b><div class=hp><i></i></div></div>`;
  el.innerHTML = half(a, "l") + half(d, "r") + "<em></em>"; BODY.append(el); el.onclick = () => { skip = true; };
  const bar = (id, hp) => { const h = [...el.querySelectorAll("[data-u]")].find((x) => x.dataset.u === id); if (h) h.querySelector("i").style.width = Math.max(0, hp * 100 / D(U(id)).stats.hp) + "%"; return h; };
  bar(a.id, ha ?? a.hp); bar(d.id, hd ?? d.hp);
  const pause = async (ms) => { for (const end = Date.now() + ms / speed; Date.now() < end && !skip;) await wait(16); };
  await pause(120);
  for (const e of hits) {
    if (skip) break; const h = bar(e.to, e.hp), m = el.querySelector("em");
    m.textContent = e.guard ? "막음" : e.miss ? "빗나감" : (e.crit ? "필살 " : "") + e.dmg; m.className = e.crit ? "crit" : "";
    h?.classList.remove("hit"); void el.offsetWidth; if (e.dmg) h?.classList.add("hit"); await pause(e.crit ? 600 : 230);
  }
  await pause(80); el.remove();
}
const view = () => Object.fromEntries(E.living(S.battle).filter((u) => !u.rearOf).map((u) => [u.id, { x: u.x, y: u.y, hp: u.hp }]));
const el = (id) => app.querySelector(`.u[data-id="${CSS.escape(id)}"]`);
const put = (n, x, y) => { n.style.setProperty("--x", x); n.style.setProperty("--y", y); };
function pop(id, text, cls = "") { const n = el(id); if (!n) return; const p = document.createElement("em"); p.className = "pop " + cls; p.textContent = text; n.append(p); setTimeout(() => p.remove(), 900); }
function sparks(id, color, n = 14) {
  const t = el(id); if (!t || matchMedia("(prefers-reduced-motion:reduce)").matches) return; const b = t.getBoundingClientRect();
  for (let i = 0; i < n; i++) { const d = document.createElement("i"); d.className = "spark"; BODY.append(d); const a = Math.random() * 6.28, r = 24 + Math.random() * 46; d.style.cssText = `left:${b.left + b.width / 2}px;top:${b.top + b.height / 2}px;background:${color}`; d.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) scale(0)`, opacity: 0 }], { duration: 520, easing: "ease-out" }).onfinish = () => d.remove(); }
}
async function banner(text, cls) { const n = document.createElement("div"); n.className = "banner " + cls; n.innerHTML = `<b>${esc(text)}</b>`; BODY.append(n); await nap(850); n.remove(); }
let fast = STORE.getItem("dusk-saga-fast") === "1"; const nap = (ms) => wait(fast ? ms / 4 : ms);
async function play(ev, before) { // 행동 전 모습에서 시작해 이벤트를 차례로 재생
  draw(before);
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i];
    if (e.t === "phase") await banner({ ally: "아군 차례", enemy: "적 차례", third: "제3세력 차례", friend: "우군 차례" }[e.team], e.team);
    else if (e.t === "move") for (const p of e.path) { const n = el(e.id); if (n) put(n, p.x, p.y); await nap(110); }
    else if (e.t === "spawn") { if (U(e.id)) before[e.id] = { x: U(e.id).x, y: U(e.id).y, hp: U(e.id).hp }; draw(before); await nap(300); }
    else if (e.t === "combat") {
      const hits = []; let j = i + 1; while (ev[j]?.t === "strike") hits.push(ev[j++]);
      if (hooks.fight && before[e.a] && before[e.d]) {
        const info = (id) => { const u = U(id), d = D(u), w = d.weapons[u.wi]; return { id, name: d.name, team: u.team, face: faceOf(u), max: d.stats.hp, hp: before[id]?.hp ?? u.hp, type: w?.type ?? "sword", magic: !!w?.magic, shape: E.lookOf(w).shape, mon: E.moveOf(d), gun: !!E.KINDS[w?.kind]?.gun, elem: w?.elem ?? "", glow: E.ELEMENTS[w?.elem]?.c ?? "", weapon: w?.name ?? "" }; };
        // 때리기 직전 자리·체력으로 예측을 다시 뽑아 전투 정보에 쓴다
        const fcOf = (() => { const A = U(e.a), T = U(e.d), keep = [A, T].map((m) => [m, m.x, m.y, m.hp]); try { for (const [m] of keep) { const p = before[m.id], n = el(m.id); m.x = +n.style.getPropertyValue("--x"); m.y = +n.style.getPropertyValue("--y"); m.hp = p.hp; } return E.forecast(S, A, T, null); } catch { return null; } finally { for (const [m, x, y, q] of keep) { m.x = x; m.y = y; m.hp = q; } } })();
        const nums = (r) => (r?.can ? [r.dmg, r.hit, r.crit] : ["–", "–", "–"]);
        const ids = [...new Set([e.a, e.d, ...hits.map((h) => h.from)])].filter((id) => U(id));
        const sk = e.art && D(U(e.a)).skills.map((k) => S.skills[k]).find((x) => x?.type === "art" && x.name === e.art), ult = sk && sk.grade >= 15 ? { name: sk.name, elem: sk.elem || D(U(e.a)).weapons[U(e.a).wi]?.elem || "none", gradeName: E.gradeName(sk.grade) } : null;
        await hooks.fight({ a: e.a, d: e.d, art: ult ? null : e.art, ult, who: Object.fromEntries(ids.map((id) => [id, { ...info(id), nums: nums(id === e.a ? fcOf?.a : fcOf?.d) }])) }, hits, { fast: () => fast, hit(h) { const n = el(h.to); pop(h.to, h.guard ? "막음" : h.miss ? "빗나감" : h.dmg, h.crit ? "crit" : ""); if (h.dmg) sparks(h.to, h.crit ? "#ffd27a" : "#ff8f7a", h.crit ? 30 : 16); if (n) n.querySelector(".hpb").style.width = h.hp * 100 / D(U(h.to)).stats.hp + "%"; if (before[h.to]) before[h.to].hp = h.hp; } });
        for (const h of hits) if (before[h.to]) before[h.to].hp = h.hp;
        i = j - 1; continue;
      }
      if (!fast && before[e.a] && before[e.d]) await cutscene(U(e.a), U(e.d), hits, 1, before[e.a].hp, before[e.d].hp);
      for (const h of hits) { const n = el(h.to); pop(h.to, h.guard ? "막음" : h.miss ? "빗나감" : h.dmg, h.crit ? "crit" : ""); if (h.dmg) { sparks(h.to, h.crit ? "#ffd27a" : "#ff8f7a"); n?.animate([{ transform: "translateX(0)" }, { transform: "translateX(7px)" }, { transform: "translateX(-7px)" }, { transform: "none" }], 220); } if (n) n.querySelector(".hpb").style.width = h.hp * 100 / D(U(h.to)).stats.hp + "%"; if (before[h.to]) before[h.to].hp = h.hp; await nap(140); }
      i = j - 1;
    } else if (e.t === "heal") { pop(e.id, "+" + e.amt, "heal"); sparks(e.id, "#8ee3a8", 10); const n = el(e.id); if (n) n.querySelector(".hpb").style.width = e.hp * 100 / D(U(e.id)).stats.hp + "%"; if (before[e.id]) before[e.id].hp = e.hp; await nap(350); }
    else if (e.t === "burn") { pop(e.id, "-" + e.amt, "burn"); sparks(e.id, "#ff8a3a", 14); const n = el(e.id); if (n) n.querySelector(".hpb").style.width = e.hp * 100 / D(U(e.id)).stats.hp + "%"; if (before[e.id]) before[e.id].hp = e.hp; await nap(350); }
    else if (e.t === "die") { sparks(e.id, "#c9a7ff", 30); el(e.id)?.classList.add("dead"); delete before[e.id]; await nap(450); }
    else if (e.t === "level" && e.id && before[e.id]) { pop(e.id, "LEVEL UP", "crit"); sparks(e.id, "#ffd27a", 24); await nap(700); }
    else if (e.t === "end") await banner(e.status === "victory" ? "승리" : "패배", e.status);
  }
}
const clear = () => { V = { sel: null }; };
const ICON = { attack: "⚔", heal: "✚", item: "◈", pair: "⇄", drop: "⇥", switch: "↻", trade: "⇋" };
const SAY = { pair: "함께 설 아군을 눌러요", drop: "내려놓을 칸을 눌러요", heal: "회복할 아군을 눌러요" };
const spot = (id) => { const u = U(id); if (u) focus(u.x, u.y); };
function cancel() { const u = V.sel && U(V.sel); if (u && V.from && !u.done) { u.x = V.from.x; u.y = V.from.y; u.wi = V.wi0 ?? u.wi; delete u.mv; E.syncRears(S.battle); } clear(); draw(); }
function stepBack() { // 한 단계씩 뒤로
  if (V.fc || V.opt) { if (V.quick) { const id = V.sel; cancel(); return pickUnit(U(id)); } V.fc = null; V.opt = null; return draw(); }
  if (V.menu) { const id = V.sel; cancel(); return pickUnit(U(id)); }
  cancel();
}
async function act(fn) { busy = true; const ev = [], b = view(); fn(ev); clear(); await play(ev, b); E.mark(S, "행동"); if (S.battle.status === "active" && E.allDone(S) && STORE.getItem("dusk-saga-auto") !== "0") await endTurn(); busy = false; save(); draw(); over(); }
// 전투가 끝나면: 결과는 다음 입력에 실린다고 알려 주고 이야기로 돌아간다
function over() { const B = S.battle; if (!B || B.status === "active" || V.overShown === B.name + B.turn) return; V.overShown = B.name + B.turn; const t = { victory: "승리", defeat: "패배", retreat: "도주" }[B.status] ?? B.status; sheet(`<h3>${t}</h3><p>${esc(B.name)} · ${B.turn}턴</p><p><small>${HOST.close ? "이 결과는 채팅의 <b>다음 입력</b>에 함께 실려 모델이 이야기로 이어 써요." : "애드온에서는 이 결과가 다음 입력에 실려요."}</small></p>${HOST.close ? "<button data-a=back class=\"wide main\">이야기로 돌아가기</button>" : ""}<button data-a=pick class=wide>새 전투</button>`); }
async function endTurn() { const ev = [], b = view(); E.endTurn(S, ev); clear(); await play(ev, b); draw(); }
async function walk(u, k) { const path = E.pathTo(V.R, k), ev = []; u.mv = { x: u.x, y: u.y }; E.travel(S, u, path, ev); busy = true; for (const p of path) { const n = el(u.id); if (n) put(n, p.x, p.y); await nap(70); } busy = false; }
function pickUnit(z) { clear(); V.look = z.id; V.R = E.reach(S, z); if (z.team === "ally" && !z.done) { Object.assign(V, { sel: z.id, from: { x: z.x, y: z.y }, wi0: z.wi }); V.reachable = reachable(z); } draw(); }
// 지금 이동해서 칠 수 있는 적마다 가장 좋은 자리·무기
function reachable(u) {
  const out = new Map(), ox = u.x, oy = u.y, wi = u.wi, foes = E.alive(S.battle).filter((z) => E.foe(z, u));
  for (const k of E.stops(S, u, V.R)) {
    [u.x, u.y] = E.unK(k); E.syncRears(S.battle); const moved = u.x !== ox || u.y !== oy;
    D(u).weapons.forEach((w, i) => { if (!E.arm(w)) return; u.wi = i; for (const z of foes) { if (!E.canShoot(S, u, w, z, moved)) continue; const f = E.forecast(S, u, z, null), sc = Math.min(z.hp, f.a.total) * f.a.hit * 2 + (f.a.total >= z.hp ? 4000 : 0) - (f.d.can ? Math.min(u.hp, f.d.total) * f.d.hit : 0) + E.uterr(S, u).avo - V.R.get(k).c; if (!out.has(z.id) || sc > out.get(z.id).sc) out.set(z.id, { sc, k, wi: i }); } });
  }
  u.x = ox; u.y = oy; u.wi = wi; E.syncRears(S.battle); return out;
}
const attacks = (u, id) => E.options(S, u, V.from).filter((o) => o.kind === "attack" && o.targets.includes(id));
async function quick(u, z) { const b = V.reachable.get(z.id); await walk(u, b.k); V.menu = true; V.quick = true; u.wi = b.wi; const l = attacks(u, z.id); V.fc = { id: z.id, i: Math.max(0, l.findIndex((o) => o.wi === b.wi && !o.art)) }; draw(); }
async function tap(x, y) {
  if (busy || S.battle.status !== "active") return; const z = E.unitAt(S.battle, x, y), u = V.sel && U(V.sel), k = E.K(x, y);
  if (u && V.opt) {
    const o = V.opt, ok = o.kind === "drop" ? o.targets.includes(k) : z && o.targets.includes(z.id); if (!ok) return;
    if (o.wi != null) u.wi = o.wi;
    return act((ev) => { if (o.kind === "heal") E.actHeal(S, u, z, ev); else if (o.kind === "pair") E.actPair(S, u, z); else E.actDrop(S, u, x, y); });
  }
  if (u && V.menu) { if (z && attacks(u, z.id).length) { V.fc = { id: z.id, i: 0 }; draw(); } return; }
  if (u && z === u) { V.menu = true; return draw(); } // 고른 인물을 다시 누르면 제자리 행동
  if (u && z && V.reachable.has(z.id)) return quick(u, z);
  if (u && E.stops(S, u, V.R).includes(k)) { await walk(u, k); V.menu = true; return draw(); }
  if (z) return pickUnit(z); clear(); draw();
}
let zone = STORE.getItem(KEY + "zone") === "1", cell = +STORE.getItem(KEY + "cell") || 0;
const coached = () => STORE.getItem("dusk-saga-coach") === "1";
app.innerHTML = `<div class=top><div class=goal></div><button data-a=topcam aria-label="위에서 보기" aria-pressed=false>탑뷰</button><button data-a=turncam aria-label="시점 돌리기">⟳</button><button data-a=zone>위험</button><button data-a=menu aria-label=메뉴>☰</button></div><div class=view><div class=board></div></div><div class=guide role=status></div><div class=dock></div><div class=roster></div><div class=ground></div><div class=sheet hidden></div>`;
const $ = (q) => app.querySelector(q);
const targets = (u) => E.alive(S.battle).filter((z) => E.foe(z, u) && attacks(u, z.id).length);
const RING = { attack: "공격", heal: "회복", item: "도구", pair: "호위진", drop: "해제", switch: "교대" };
function size() { const v = $(".view"), B = S.battle, fit = Math.min((v.clientWidth - 16) / B.w, (v.clientHeight - 16) / B.h); return cell || Math.max(46, Math.min(84, Math.floor(fit))); }
function focus(x, y) { const v = $(".view"), c = size(); v.scrollTo({ left: 8 + (x + .5) * c - v.clientWidth / 2, top: 8 + (y + .5) * c - v.clientHeight / 2, behavior: "smooth" }); }
function guide() {
  const B = S.battle, u = V.sel && U(V.sel);
  if (B.status !== "active" && !busy) return B.status === "victory" ? "승리했어요" : B.status === "retreat" ? "도주했어요" : "패배했어요";
  if (busy) return "진행 중… 화면을 누르면 컷씬을 건너뛰어요";
  if (V.fc) return "예측을 확인하고 공격하세요";
  if (V.opt) return SAY[V.opt.kind] ?? "대상을 눌러요";
  if (V.menu) return "행동을 고르세요";
  if (u) return V.reachable.size ? "빨간 적을 누르면 바로 공격 · 파란 칸은 이동" : "파란 칸을 눌러 이동 (닿는 적이 없어요)";
  if (V.look) return "적이 움직이고 칠 수 있는 범위예요";
  return "빛나는 아군을 눌러 시작하세요";
}
const gauge = (hp, after, max) => `<div class=fb><i class=now style="width:${hp * 100 / max}%"></i><i class=aft style="width:${Math.max(0, after) * 100 / max}%"></i></div>`;
function dock() {
  const B = S.battle, u = V.sel && U(V.sel), look = V.look && U(V.look), btn = (a, t, c = "", x = "") => `<button data-a=${a} class="${c}" ${x}>${t}</button>`;
  if (B.status !== "active" && !busy) return `<div class=row>${btn("retry", "다시 하기", "main")}</div>`;
  if (busy) return `<div class=row>${btn("fast", fast ? "보통 속도" : "빨리 감기", fast ? "on" : "")}</div>`;
  if (V.fc && u) {
    const z = U(V.fc.id), l = attacks(u, z.id), o = l[V.fc.i], wi = u.wi; u.wi = o.wi; const f = E.forecast(S, u, z, o.art || null); u.wi = wi;
    const n = (r) => r.hits * (r.x2 ? 2 : 1);
    const half = (m, r, loss) => { const left = Math.max(0, m.hp - loss), d = D(m); return `<div class="plate ${m.team}">${faceOf(m)}<header><b>${esc(d.name)} ${sexMark(d)}</b><small>Lv ${d.level}</small></header><div class=big>${m.hp}<i>▸</i><b class="${left ? "" : "ko"}">${left || "격파"}</b></div>${gauge(m.hp, left, d.stats.hp)}<div class=stat3>${r.can ? `<span><small>피해</small>${r.dmg}${n(r) > 1 ? `<u>×${n(r)}</u>` : ""}</span><span><small>명중</small>${r.hit}</span><span><small>필살</small>${r.crit}</span>` : "<span class=none>반격 불가</span>"}</div></div>`; };
    const cards = l.map((q, i) => { u.wi = q.wi; const g = E.forecast(S, u, z, q.art || null).a; u.wi = wi; return `<button data-w=${i} class="wcard ${i === V.fc.i ? "on" : ""}"><b>${q.art ? "✦ " : ""}${esc(q.label)}</b><small>피해 ${g.total} · 명중 ${g.hit}${g.tri > 0 ? " · 유리" : g.tri < 0 ? " · 불리" : ""}</small></button>`; }); if (hooks.menu) {
      const row = (q, i) => { const w = D(u).weapons[q.wi]; u.wi = q.wi; const g = E.forecast(S, u, z, q.art || null).a; u.wi = wi; return `<button data-w=${i} class="${i === V.fc.i ? "on" : ""}">${glyph(w.type)}<b>${q.art ? "✦ " : ""}${esc(q.label)}${gradeMark(w, g.elem)}</b><small class="${g.tri > 0 ? "up" : g.tri < 0 ? "dn" : ""}">${g.tri > 0 ? "▲" : g.tri < 0 ? "▼" : ""} ${g.total}${w.max ? ` · ${w.uses}/${w.max}` : ""}</small></button>`; };
      const w = D(u).weapons[o.wi], r = E.wr(S, w); V.panel = true;
      V.ring = [`<h4>공격 수단</h4>${f.a.hi ? `<div class="ell ${f.a.hi > 0 ? "up" : "dn"}">${f.a.hi > 0 ? "높은 곳 · 명중 +15" : "낮은 곳 · 명중 −10"}</div>` : ""}${f.a.elem && (f.a.type !== 1 || f.a.stab) ? `<div class="ell ${f.a.em >= 1 ? "up" : "dn"}">${E.ELEMENTS[f.a.elem].n}${f.a.type !== 1 ? ` · ${E.typeWord(f.a.type)} ×${f.a.type}` : ""}${f.a.stab ? " · 같은 속성 ×1.5" : ""}</div>` : ""}<div class=wl>${l.map(row).join("")}</div><div class=wt><span><small>공격</small>${f.a.atk}</span><span><small>명중</small>${f.a.hit}</span><span><small>필살</small>${f.a.crit}</span><span><small>속도</small>${f.a.as}</span><span><small>사정</small>${r[0] === r[1] ? r[0] : r[0] + "–" + r[1]}</span></div>`];
    }
    const many = targets(u).length > 1;
    return `<div class=duel>${half(u, f.a, f.d.can ? f.d.total : 0)}<em class="${f.a.tri > 0 ? "up" : f.a.tri < 0 ? "dn" : ""}">${f.a.tri > 0 ? "▲" : f.a.tri < 0 ? "▼" : "VS"}</em>${half(z, f.d, f.a.total)}</div>${f.a.dual ? `<div class=assist>협동 공격 · ${esc(f.a.dual.name)} +${f.a.dual.dmg} (${f.a.dual.hit}%)</div>` : ""}${hooks.menu ? "" : `<div class=wcards>${cards.join("")}</div>`}<div class=row>${btn("back1", "뒤로")}${many ? btn("prevt", "◀", "sm") + btn("nextt", "▶", "sm") : ""}${btn("go", "공격 개시", "main strike")}</div>`;
  }
  if (V.opt) return `<div class=row>${btn("back1", "뒤로")}</div>`;
  if (V.menu && u) {
    V.list = E.options(S, u, V.from).filter((o) => o.targets.length && ["heal", "item", "pair", "drop", "switch"].includes(o.kind));
    const it = []; const can = targets(u); if (can.length) it.push(`<button data-a=aim class=hot><b>공격</b></button>`); if (can.some((z) => attacks(u, z.id).some((o) => o.art))) it.push("<button data-a=art><b>전투 기술</b></button>");
    V.list.forEach((o, i) => it.push(`<button data-o=${i}><b>${esc(o.kind === "item" || o.kind === "heal" ? o.label : RING[o.kind])}</b></button>`));
    if (E.canSeize(S, u)) it.push("<button data-a=seize class=hot><b>제압</b></button>"); it.push("<button data-a=wait><b>대기</b></button>");
    if (hooks.menu) { V.ring = it; return `<div class=row>${btn("back1", "뒤로")}</div>`; }
    return `<div class="row acts">${it.join("")}</div><div class=row>${btn("back1", "뒤로")}</div>`;
  }
  if (look) { const d = D(look);
    return `<div class="who ${look.team}">${faceOf(look)}<div><div class=ln><b class=nm>${esc(d.name)} ${sexMark(d)}</b><small>Lv ${d.level} ${esc(d.cls)}</small></div>${gauge(look.hp, look.hp, d.stats.hp)}<div class=ln><span>HP <b>${look.hp}</b>/${d.stats.hp}</span><span>${d.weapons[look.wi] ? glyph(d.weapons[look.wi].type) + esc(d.weapons[look.wi].name) : ""}</span></div></div><button data-a=info>자세히</button></div><div class=row>${btn("cancel", "취소")}${u ? btn("here", "제자리에서 행동", "main") : ""}</div>`; }
  const left = E.alive(B).filter((z) => z.team === "ally" && !z.done).length;
  return `<div class=row>${btn("end", "턴 종료")}${btn("next", `다음 아군 <small>${left}명</small>`, "main")}</div>`;
}
function sheet(html) { const n = $(".sheet"); n.innerHTML = `<div class=panel>${html}<button data-a=close class=wide>닫기</button></div>`; n.hidden = false; }
// 내용이 같으면 그대로 두고, 단계가 바뀔 때만 튀어 들어온다. 사라지는 조각은 잠깐 남겨 접힌다
let dockHtml = "", dockStage = "";
function paintDock(html) {
  const n = $(".dock"); if (html === dockHtml) return;
  const stage = [busy, V.sel, V.look, !!V.menu, V.fc?.id, V.opt?.kind, S.battle.status].join("|"), fresh = stage !== dockStage;
  if (fresh && dockHtml) { const g = n.cloneNode(true); g.className = "dock out"; g.inert = true; for (const b of g.querySelectorAll("button")) b.removeAttribute("data-a"); n.after(g); setTimeout(() => g.remove(), 170); }
  dockHtml = html; dockStage = stage; n.innerHTML = html; n.classList.remove("in"); if (fresh) { void n.offsetWidth; n.classList.add("in"); }
}
function draw(at) {
  const B = S.battle, look = V.look && U(V.look), u = V.sel && U(V.sel), at0 = at ?? view(), dz = zone ? E.danger(S, "enemy") : new Set();
  const free = V.R && look && !V.menu, move = free ? new Set(E.stops(S, look, V.R)) : new Set(), red = free ? E.threat(S, look, V.R) : new Set();
  const tg = new Set((V.opt?.targets ?? []).map((t) => (typeof t === "number" ? t : E.K(U(t).x, U(t).y))));
  const c = size(), board = $(".board"); board.dataset.theme = B.theme ?? ""; board.style.cssText = `--w:${B.w};--h:${B.h};width:${c * B.w}px`;
  let h = ""; for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const k = E.K(x, y), m = B.map[y][x]; h += `<button class="t t${m === "." ? "dot" : m === "#" ? "wall" : m} ${move.has(k) ? "mv" : red.has(k) ? "rd" : ""} ${tg.has(k) ? "tg" : ""} ${dz.has(k) ? "dz" : ""}" data-x=${x} data-y=${y}><s>${DECO[m] ?? ""}</s></button>`; }
  for (const [id, p] of Object.entries(at0)) { const z = U(id); if (!z) continue; const aim = !at && u && (V.menu ? (V.fc ? V.fc.id === id : E.foe(z, u) && !V.opt && attacks(u, id).length > 0) : V.reachable?.has(id)), ready = !at && !busy && !V.sel && z.team === "ally" && !z.done; h += `<span class="u ${z.team} ${z.done && z.team === "ally" && !at ? "done" : ""} ${id === V.sel ? "sel" : ""} ${aim ? "aim" : ""} ${ready ? "ready" : ""}" data-id="${esc(id)}" data-race="${esc(E.RACES[D(z).race]?.mem ?? "")}" data-w="${esc(D(z).weapons[z.wi]?.type ?? "")}" data-look="${esc(JSON.stringify(E.lookOf(D(z).weapons[z.wi])))}" data-mt="${esc(D(z).mtype)}" data-sex="${esc(D(z).sex ?? "")}" data-model="${esc(E.modelOf(D(z)))}" data-elem="${esc(E.elemOfUnit(D(z)))}" data-cls="${esc(D(z).cls ?? "")}" data-outfit="${esc(D(z).outfit ?? "")}" style="--x:${p.x};--y:${p.y}"><q>${esc(D(z).emoji)}</q>${z.boss ? "<sup>★</sup>" : ""}${z.rear ? "<sub>⇄</sub>" : ""}<i class=hpb style="width:${p.hp * 100 / D(z).stats.hp}%"></i></span>`; }
  board.innerHTML = h; $(".goal").innerHTML = `<b>${B.turn}턴</b> ${esc(E.objText(B))}`; $("[data-a=zone]").classList.toggle("on", zone); $(".guide").textContent = guide(); V.ring = null; V.panel = false; paintDock(dock());
  const rs = busy || V.menu || V.opt || V.fc ? "" : E.living(B).filter((z) => z.team === "ally" && !z.rearOf).map((z) => `<button data-p="${esc(z.id)}" class="ally ${z.done ? "off" : ""} ${z.id === V.look ? "cur" : ""}" aria-label="${esc(D(z).name)}">${faceOf(z)}<span><i style="width:${z.hp * 100 / D(z).stats.hp}%"></i></span></button>`).join(""); if ($(".roster").innerHTML !== rs) $(".roster").innerHTML = rs;
  const g = look && !busy && !V.fc ? E.terr(B, look.x, look.y) : null; $(".ground").textContent = g ? g.n + (g.avo ? ` · 회피 ${g.avo > 0 ? "+" : ""}${g.avo}` : "") + (g.burn ? ` · 매 턴 HP ${g.burn}% 피해` : "") + (g.up ? ` · 높이 ${g.up}` : "") + (g.def ? ` · 수비 +${g.def}` : "") + (g.heal ? ` · 매 턴 회복` : "") : "";
  hooks.menu?.(V.ring && !busy ? { id: V.sel, items: V.ring, panel: V.panel } : null, V.fc && !busy ? { a: V.sel, d: V.fc.id } : null);
}
function command(a, el0) {
  if (a === "fast") { fast = !fast; STORE.setItem("dusk-saga-fast", fast ? "1" : "0"); if (!$(".sheet").hidden) { $(".sheet").hidden = true; } return draw(view()); } if (a === "close") { $(".sheet").hidden = true; return; } if (busy) return; const u = V.sel && U(V.sel);
  if (a === "turncam") return hooks.turn?.(); if (a === "topcam") { const on = hooks.top?.(); $("[data-a=topcam]").setAttribute("aria-pressed", !!on); $("[data-a=topcam]").classList.toggle("on", !!on); return; } if (a === "cancel") cancel(); else if (a === "back1") stepBack();
  else if (a === "zone") { zone = !zone; STORE.setItem(KEY + "zone", zone ? "1" : "0"); draw(); }
  else if (a === "here") { V.menu = true; draw(); }
  else if (a === "wait" && u) act(() => E.actWait(S, u)); else if (a === "seize" && u) act((ev) => E.actSeize(S, u, ev));
  else if (a === "aim" && u) { const l = targets(u); if (l.length) { V.fc = { id: l[0].id, i: 0 }; draw(); } }
  else if (a === "art" && u) { const z = targets(u).find((q) => attacks(u, q.id).some((o) => o.art)); if (z) { V.fc = { id: z.id, i: attacks(u, z.id).findIndex((o) => o.art) }; draw(); } }
  else if ((a === "prevt" || a === "nextt") && V.fc) { const l = targets(u), i = l.findIndex((z) => z.id === V.fc.id); V.fc = { id: l[(i + (a === "nextt" ? 1 : l.length - 1)) % l.length].id, i: 0 }; draw(); }
  else if (a === "go" && V.fc) { const o = attacks(u, V.fc.id)[V.fc.i], z = U(V.fc.id); u.wi = o.wi; act((ev) => E.actAttack(S, u, z, o.art || null, ev)); }
  else if (a === "next") { const l = E.alive(S.battle).filter((z) => z.team === "ally" && !z.done); if (l.length) { const z = l[(l.findIndex((q) => q.id === S.last) + 1) % l.length]; S.last = z.id; pickUnit(z); spot(z.id); } }
  else if (a === "end") { const n = E.alive(S.battle).filter((z) => z.team === "ally" && !z.done).length; sheet(`<h3>턴을 끝낼까요?</h3><p>${n ? `아직 ${n}명이 행동하지 않았어요. 누르면 그 인물로 가요.` : "모두 행동했어요."}</p><div class=left>${E.alive(S.battle).filter((z) => z.team === "ally" && !z.done).map((z) => `<button data-p="${esc(z.id)}">${faceOf(z)}<b>${esc(D(z).name)}</b></button>`).join("")}</div><button data-a=endyes class="wide main">턴 종료</button>`); }
  else if (a === "endyes") { $(".sheet").hidden = true; cancel(); busy = true; endTurn().then(() => { busy = false; save(); draw(); over(); }); }
  else if (a === "menu") sheet(`<h3>${esc(S.battle.name)}</h3><button data-a=rewind class=wide ${S.pulse > 0 && (S.hist ?? []).length > 1 ? "" : "disabled"}>되감기 (${S.pulse ?? 0}회 남음)</button><button data-a=log class=wide>전투 기록</button><button data-a=settings class=wide>설정</button>${hooks.face ? "" : "<button data-a=zin class=wide>지도 크게</button><button data-a=zout class=wide>지도 작게</button>"}<button data-a=help class=wide>조작 방법</button>${HOST.gen ? "<button data-a=gen class=wide>이야기로 전투 만들기</button>" : ""}<button data-a=pick class=wide>새 전투 고르기</button>${S.battle.status === "active" ? "<button data-a=flee class=wide>도주하기</button>" : ""}<button data-a=book class=wide>프리셋 도감</button><button data-a=retry class=wide>처음부터 다시</button>${HOST.close ? "<button data-a=quit class=wide>게임 닫기</button>" : ""}`);
  else if (a === "rewind") { cancel(); if (E.pulse(S, S.hist.length - 2)) save(); $(".sheet").hidden = true; draw(); }
  else if (a === "log") sheet(`<h3>전투 기록</h3><div class=log>${S.log.slice(-40).reverse().map((l) => `<div>${esc(l.text)}</div>`).join("")}</div>`);
  else if (a === "zin" || a === "zout") { cell = Math.max(30, Math.min(96, size() + (a === "zin" ? 8 : -8))); STORE.setItem(KEY + "cell", cell); draw(); }
  else if (a === "help") help();
  else if (a === "book") { $(".sheet").hidden = true; book(); }
  else if (a === "settings") { $(".sheet").hidden = true; settings(); }
  else if (a === "edit" && V.look) { $(".sheet").hidden = true; editUnit(V.look); }
  else if (a === "quit") { $(".sheet").hidden = true; HOST.close?.(); }
  else if (a === "demo") { STORE.removeItem(PICK); command("retry"); }
  else if (a === "retry") { S = start(); clear(); save(); $(".sheet").hidden = true; draw(); spot(Object.keys(S.battle.units)[0]); encounter(); }
  else if (a === "gen") { $(".sheet").hidden = true; genSheet(); }
  else if (a === "flee") sheet(`<h3>도주할까요?</h3><p>전장을 버리고 물러나요. ‘도주’ 결과가 다음 입력에 실려요.</p><button data-a=fleeyes class="wide main">도주</button>`);
  else if (a === "fleeyes") { $(".sheet").hidden = true; cancel(); E.actRetreat(S); save(); draw(); banner("도주", "defeat").then(over); }
  else if (a === "back") { $(".sheet").hidden = true; HOST.close?.(); }
  else if (a === "pick") { $(".sheet").hidden = true; pickSheet(); }
  else if (a === "info" && V.look) { const z = U(V.look), d = D(z); sheet(`<h3>${esc(d.name)} ${sexMark(d)}</h3><p><small>Lv ${d.level} ${esc(d.cls)}${d.race ? " · " + esc(d.race) : ""}</small></p><button data-a=edit class="wide main">고치기</button><p class=st>${E.STATS.map((k) => `<span>${E.SL[k]} <b>${d.stats[k]}</b></span>`).join("")}</p>${d.weapons.map((w) => `<p>${glyph(w.type)}<b>${esc(w.name)}</b>${gradeMark(w)} 위력 ${w.mt} · 명중 ${w.hit}</p>`).join("")}${d.skills.map((k) => S.skills[k]).filter(Boolean).map((k) => `<p><b>${esc(k.name)}</b>${gradeMark(k)} ${esc(E.skillText(k))}</p>`).join("")}${z.team === "ally" && !busy ? E.promotions(d).map((t) => `<button data-a=promote data-to="${esc(t)}" class="wide main">${esc(t)}(으)로 전직</button><small>${esc(E.CLASSES[t].about)}</small>`).join("") : ""}`); }
  else if (a === "promote" && V.look) { const r = E.promote(S, U(V.look).ref, el0?.dataset.to); if (r) { save(); sheet(`<h3>${esc(r.to)}</h3><p>${esc(r.from)}에서 전직했어요. 「${esc(r.skill)}」 습득</p><p>${Object.entries(r.gain).map(([k, v]) => `${E.SL[k]} +${v}`).join(" · ")}</p>`); if (V.sel && !V.menu) pickUnit(U(V.sel)); else draw(); } }
}
// 화면 하나(제목·본문·아래 단추). 안의 ◀ 값 ▶ · 나눠 고르기 · 막대는 여기서 한 번에 받는다
function screen(title, cls = "") { const n = document.createElement("div"); n.className = "gs " + cls; n.innerHTML = `<div class=gph><button class=gpx aria-label=닫기>‹</button><h3>${esc(title)}</h3></div><div class=gsx style="flex:1;min-height:0;display:flex;flex-direction:column"></div>`; BODY.append(n); n.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") close(); }); const close = () => n.remove(); const on = { n, x: n.querySelector(".gsx"), close }; n.querySelector(".gpx").onclick = close; n.tabIndex = -1; n.focus(); return on; }
const mini = (n) => `<svg viewBox="0 0 12 9" class=mini>${E.MAPS[n].rows.map((r, y) => [...r].map((c, x) => `<rect x=${x} y=${y} width=1.02 height=1.02 fill="${{ ".": "#c9d18a", f: "#5f9a5a", m: "#a89a88", w: "#4fb0c6", b: "#c79a5c", "#": "#4a4155", F: "#d8b98a", T: "#f2b134", p: "#8d8498", l: "#ff6a2a", s: "#66764e", i: "#bfe4f2", h: "#a8b46a", H: "#8a8f58", v: "#cfe0f2" }[c]}"/>`).join("")).join("")}</svg>`;
const RG = { human: "사람꼴", elf: "사람꼴", dwarf: "사람꼴", small: "사람꼴", giant: "사람꼴", orc: "사람꼴", beast: "수인", bird: "수인", reptile: "비늘·물", aquatic: "비늘·물", insect: "벌레", dragon: "용", holy: "신성", spirit: "정령·풀", plant: "정령·풀", demon: "밤", vampire: "밤", undead: "밤", ghost: "밤", yokai: "요괴", construct: "만든 것", slime: "만든 것" };
const raceItems = (extra = [], sex = "m") => [...extra, ...Object.entries(E.RACES).map(([k, r]) => ({ k, t: k, sub: `${r.about} 「${E.RACE_SKILLS[r.trait].name}」`, g: RG[r.frame] ?? "그 밖", img: () => hooks.face?.("ally", "x", false, { race: r.mem, w: "", look: {}, mt: "foot", sex, id: "p" + k, outfit: "dancer" }) }))];
const jobItems = (extra = [], sex = "m") => [...extra, ...Object.entries(E.CLASSES).map(([k, c]) => ({ k, t: k, sub: `${c.about ?? ""}${c.skill ? ` 「${c.skill.name}」` : ""}`, g: c.tier === 1 ? "기본직" : "상급직", tag: c.weapons.map((t) => E.WT[t].n).join("·"), img: () => hooks.face?.("ally", "x", false, { race: "", w: c.weapons[0], look: { tier: 3 }, mt: c.mtype ?? E.CLASSES[c.base]?.mtype, sex, id: "j" + k, cls: k }, true) }))];
const kindItems = () => Object.entries(E.KINDS).map(([k, v]) => ({ k, t: v.n, g: E.WT[v.base].n, ic: glyph(v.base), sub: `위력 ${v.mt >= 0 ? "+" : ""}${v.mt} · 명중 ${v.hit >= 0 ? "+" : ""}${v.hit}${v.crit ? ` · 필살 +${v.crit}` : ""} · 사정 ${v.r[0] === v.r[1] ? v.r[0] : v.r.join("–")}${v.brave ? " · 2회" : ""}${v.magic ? " · 마법" : ""}` }));
const GC = ["#7a6f68", "#7a6f68", "#5f8a5a", "#3f7f9a", "#2f6fd6", "#8a4fc0", "#d99a2b", "#d8403f"];
const gradeItems = () => Array.from({ length: E.RANK_MAX + 1 }, (_, i) => ({ k: i, t: E.gradeName(i), tag: "등급 " + (i + 1), tc: GC[Math.floor(i / 3)], sub: `무기 위력 약 ${E.makeWeapon({ name: "검", kind: "sword", grade: E.gradeName(i) }).mt}` }));
const elemItems = () => [{ k: "", t: "무속성", sub: "상성이 없어요" }, ...Object.entries(E.ELEMENTS).map(([k, v]) => ({ k, t: v.n, tag: "×2 " + v.x2.map((b) => E.ELEMENTS[b].n).join("·"), tc: v.c + "88", sub: `약점을 찌름: ${v.x2.map((b) => E.ELEMENTS[b].n).join("·")} · 잘 안 통함: ${v.half.map((b) => E.ELEMENTS[b].n).join("·")}${v.none ? ` · 안 통함: ${v.none.map((b) => E.ELEMENTS[b].n).join("·")}` : ""}` }))];
// 좌우로 넘기고, 값을 누르면 전체 판에서 고른다
const spinPick = async (items, cur, s, title, big) => { if (s) { const i = items.findIndex((x) => x.k === cur); return items[(i + s + items.length) % items.length].k; } return pick({ title, items, cur, big }); };
function pickSheet() {
  const p = { map: "평원", lv: "5", set: "판타지", ally: "", foe: "", sex: "", job: "", arms: "", gear: "", spell: "", ...picked() }, w = screen("출진 준비"), any = [{ k: "", t: "그대로", sub: "프리셋 그대로 둬요", g: "기타" }, { k: "?", t: "무작위", sub: "저마다 다른 종족이 나와요", g: "기타" }];
  const F = { map: () => Object.keys(E.MAPS).map((k) => ({ k, t: k, tag: E.MAPS[k].theme ?? "" })), ally: () => raceItems(any), foe: () => raceItems(any), job: () => jobItems([]), arms: () => [{ k: "", t: "기본", sub: "직업의 시작 무기" }, ...Object.keys(E.WT).filter((t) => t !== "item" && t !== "staff").map((t) => ({ k: t, t: E.WT[t].n, ic: glyph(t) }))] }, NM = { map: "전장", ally: "아군 종족", foe: "적 종족", job: "첫 아군 직업", arms: "첫 아군 무기" };
  const paint = () => { const y = w.x.querySelector(".gsb")?.scrollTop ?? 0; w.x.innerHTML = `<div class=gsb><div class="mapbig full">${mini(p.map)}<div><h4>${esc(p.map)}</h4>${wheel("map", "전장", p.map)}</div></div>${wheel("ally", "아군", p.ally === "?" ? "무작위" : p.ally || "그대로")}${seg("sex", "아군 성별", [["", "섞어서"], ["f", "여성"], ["m", "남성"]], p.sex)}${wheel("foe", "적", p.foe === "?" ? "무작위" : p.foe || "그대로")}${seg("set", "적 무리", [["판타지", "판타지"], ["현대", "현대"]], p.set)}${wheel("job", "첫 아군", p.job || "검사", E.CLASSES[p.job || "검사"]?.about)}${wheel("arms", "무기", p.arms ? E.WT[p.arms].n : "기본")}${bar("lv", "레벨", +p.lv, E.MAXLV)}${HOST.cast ? `<button class="gadd" data-b=cast>${p.names?.length ? "함께: " + esc(p.names.join(" · ")) + " (눌러서 빼기)" : "＋ 지금 채팅 인물 데려오기"}</button>` : ""}<label class=gfi><small>무기 이름</small><input class=gi data-i=gear value="${esc(p.gear)}" placeholder="예: 서리 문 대검, 왕가의 가보"></label><label class=gfi><small>기술</small><input class=gi data-i=spell value="${esc(p.spell)}" placeholder="예: 봇 설정의 기술 - 설명"></label></div><div class=gsf><button data-b=demo>예시 전장</button><button data-b=rand>무작위</button><button data-b=go class=main>출진</button></div>`; w.x.querySelector(".gsb").scrollTop = y; w.x.querySelectorAll("[data-i]").forEach((n) => { n.oninput = () => { p[n.dataset.i] = n.value; }; }); };
  paint(); holds(w.x, ".gb>button", (k, n, c) => { p.lv = String(Math.max(1, Math.min(E.MAXLV, +p.lv + n * (c > 14 ? 5 : 1)))); paintBar(w.x, "lv", +p.lv, E.MAXLV); });
  w.x.onclick = async (e) => { const b = e.target.closest("button"); if (!b) return; const k = b.closest("[data-w]")?.dataset.w; if (b.dataset.v != null) { p[k] = b.dataset.v; return paint(); } if (b.dataset.s != null) { const v = await spinPick(F[k](), p[k] || (k === "job" ? "검사" : ""), +b.dataset.s, NM[k], k === "job"); if (v != null) { p[k] = v; paint(); } return; } const go = b.dataset.b; if (!go) return; if (go === "cast") { p.names = p.names?.length ? [] : await HOST.cast().catch(() => []); return paint(); } if (go === "rand") { const R = (l) => l[Math.floor(Math.random() * l.length)]; Object.assign(p, { map: R(Object.keys(E.MAPS)), ally: R(["", "?", "?"]), foe: R(["", "?"]), sex: R(["", "f", "m"]), set: R(["판타지", "판타지", "현대"]), job: R(Object.keys(E.CLASSES).filter((q) => E.CLASSES[q].tier === 1)), lv: String(R([5, 10, 20, 30])) }); return paint(); } w.close(); if (go === "demo") return command("demo"); STORE.setItem(PICK, JSON.stringify(p)); command("retry"); };
}
const paintBar = (x, k, v, max, base) => { const n = x.querySelector(`.gb[data-w="${k}"]>span`); if (!n) return; n.querySelector("i").style.width = v * 100 / max + "%"; n.querySelector("b").textContent = v; n.setAttribute("aria-valuenow", v); n.querySelector("u")?.remove(); if (base != null && v !== base) n.insertAdjacentHTML("beforeend", `<u class="${v > base ? "up" : "dn"}">${v > base ? "+" : ""}${v - base}</u>`); };
// ── 이야기로 전투 만들기: 메인·보조 모델이 지금 채팅을 읽고 전장과 인물을 짠다(중지할 수 있다)
function genSheet() {
  if (!HOST.gen) return pickSheet(); const p = { model: STORE.getItem("dusk-saga-genmodel") || "submodel", when: "now" }, w = screen("이야기로 전투 만들기"); let ctl = null;
  const paint = (msg = "", busyNow = false) => { w.x.innerHTML = `<div class=gsb>${seg("model", "만드는 모델", [["model", "메인 모델"], ["submodel", "보조 모델"]], p.model)}${seg("when", "언제", [["now", "지금 장면"], ["later", "시간이 흐른 뒤"]], p.when)}<p class=full><small>지금 채팅의 최근 대화를 읽고 전장·적·아군을 만들어요. 끝나면 결과(승리·패배·도주)가 <b>다음 입력</b>에 함께 실려요.</small></p>${msg ? `<p class=full>${msg}</p>` : ""}</div><div class=gsf>${busyNow ? "<button data-b=stop class=main>생성 중지</button>" : "<button data-b=free>모의 전투</button><button data-b=go class=main>전투 만들기</button>"}</div>`; };
  paint(); w.x.onclick = async (e) => { const b = e.target.closest("button"); if (!b) return; const k = b.closest("[data-w]")?.dataset.w; if (b.dataset.v != null) { p[k] = b.dataset.v; if (k === "model") STORE.setItem("dusk-saga-genmodel", p.model); return paint(); }
    if (b.dataset.b === "free") { w.close(); return pickSheet(); } if (b.dataset.b === "stop") { ctl?.abort(); return; }
    if (b.dataset.b === "go") { ctl = new AbortController(); paint("이야기를 읽고 전장을 짜는 중… <small>(보통 20~60초)</small>", true); try { const j = await HOST.gen({ model: p.model, later: p.when === "later", signal: ctl.signal }); const T = E.fresh(); E.ensureBase(T); E.loadEncounter(T, j); if (!T.battle || !Object.values(T.battle.units).some((u) => u.team === "ally") || !Object.values(T.battle.units).some((u) => E.SIDE[u.team] === 1)) throw new Error("양쪽 인물이 다 있는 전투가 안 나왔어요"); S = T; if (p.when === "later") S.battle.later = true; clear(); save(); w.close(); draw(); spot(Object.keys(S.battle.units)[0]); encounter(); } catch (er) { paint(ctl.signal.aborted ? "멈췄어요." : `만들지 못했어요: ${esc(er?.message ?? er)}`); } ctl = null; } };
}
HOST.startGen = () => genSheet();
// ── 인물 고치기
function editUnit(id) {
  const u = U(id); if (!u || busy) return; const ref = u.ref; let W = E.draftOf(S, ref), tab = "base", hist = [], scale = true, last = ""; const base = E.copy(S.defs[ref]), w = screen("인물 고치기", u.team), d = () => W.defs[ref], mon = () => !!E.modelOf(d());
  const keep = (tag = "") => { if (tag && tag === last) return; last = tag; hist.push(JSON.stringify(W)); if (hist.length > 60) hist.shift(); };
  const faceNow = () => hooks.face?.(u.team, d().emoji, !!u.boss, { race: E.RACES[d().race]?.mem ?? "", w: d().weapons[0]?.type ?? "", look: E.lookOf(d().weapons[0]), mt: d().mtype, sex: d().sex ?? "", id: u.id, model: E.modelOf(d()), elem: E.elemOfUnit(d()), cls: d().cls ?? "", outfit: d().outfit ?? "" }, true);
  const OUTS = () => [{ k: "", t: "직업에 맞게", sub: "직업과 무기를 보고 알아서 입어요" }, ...Object.entries(hooks.outfits ?? {}).map(([k, v]) => ({ k, t: v.n, img: () => hooks.face?.(u.team, "x", false, { race: E.RACES[d().race]?.mem ?? "", w: "", look: {}, mt: "foot", sex: d().sex ?? "", id: "o" + k, outfit: k }, true) }))];
  const body = () => { const q = d(); if (tab === "base") return `<label class="gfi"><small>이름</small><input class=gi data-i=name maxlength=30 value="${esc(q.name)}"></label>${mon() ? `<p class=full><small>괴물은 종족·직업 대신 능력치와 무기를 고칠 수 있어요.</small></p>` : `${wheel("race", "종족", q.race || "인간", E.RACES[q.race] ? `「${E.RACE_SKILLS[E.RACES[q.race].trait].name}」` : "")}${seg("sex", "성별", [["m", "남성"], ["f", "여성"], ["", "없음"]], q.sex ?? "")}${wheel("t1", "속성", E.ELEMENTS[q.elem]?.n ?? "없음", E.elemsOfUnit(q).map((x) => E.ELEMENTS[x].n).join("·") || "")}${wheel("t2", "둘째 속성", E.ELEMENTS[q.elem2]?.n ?? "없음")}${wheel("job", "직업", q.job || q.cls || "없음", E.CLASSES[q.job]?.about)}${wheel("outfit", "복장", hooks.outfits?.[q.outfit]?.n ?? "직업에 맞게")}${seg("mtype", "이동", Object.entries(E.MTL), q.mtype)}`}${bar("level", "레벨", q.level, E.MAXLV, base.level)}${seg("scale", "레벨 바꾸면", [["1", "능력치도"], ["0", "레벨만"]], scale ? "1" : "0")}`;
    if (tab === "stat") return E.STATS.map((k) => bar(k, E.SL[k], q.stats[k], E.STAT_MAX(k), base.stats[k])).join("") + bar("move", "이동력", q.move, 10, base.move) + `<button class="gadd full" data-b=even>처음 능력치로</button>`;
    if (tab === "arms") return q.weapons.map((x, i) => `<div class=gcard data-k=${i}><header>${glyph(x.type)}<b>${esc(x.name)}</b>${gradeMark(x)}${i ? "<button data-b=first aria-label=첫째로>▲</button>" : "<button disabled>주무기</button>"}<button data-b=drop aria-label=빼기 ${q.weapons.length < 2 ? "disabled" : ""}>✕</button></header>${x.type === "item" ? `<small>도구는 빼거나 순서만 바꿀 수 있어요.</small>` : `<label class=gfi><small>이름</small><input class=gi data-i=wn data-k=${i} maxlength=30 value="${esc(x.name)}"></label>${wheel("k" + i, "종류", E.KINDS[x.kind]?.n ?? E.WT[x.type].n)}${wheel("g" + i, "등급", x.grade == null ? "없음" : E.gradeName(x.grade))}${wheel("e" + i, "속성", E.ELEMENTS[x.elem]?.n ?? "무속성")}<small>위력 ${x.mt} · 명중 ${x.hit}${x.crit ? ` · 필살 ${x.crit}` : ""} · 사정 ${x.rmin === x.rmax ? x.rmin : x.rmin + "–" + x.rmax}</small>`}</div>`).join("") + (q.weapons.length < 5 ? `<button class=gadd data-b=addw>＋ 무기 넣기</button>` : "");
    return `<p class=full><small>기술 ${q.skills.length}/6 · 눌러서 넣고 빼요. 가득 차면 하나를 빼야 해요.</small></p><div class="gsk full">${Object.values(W.skills).sort((a, b) => q.skills.includes(b.id) - q.skills.includes(a.id)).map((k) => `<button data-sk="${esc(k.id)}" class="${q.skills.includes(k.id) ? "on" : ""}" ${!q.skills.includes(k.id) && q.skills.length >= 6 ? "disabled" : ""}><b>${esc(k.name)}</b><small>${esc(E.skillText(k))}</small></button>`).join("")}</div>`; };
  const head = () => { const q = d(); w.x.querySelector(".edh").innerHTML = `<img alt="" src="${faceNow() ?? ""}"><div><b>${esc(q.name)} ${sexMark(q)}</b><span>Lv ${q.level} ${esc(q.cls)}${q.race ? ` · ${esc(q.race)}` : ""}</span></div>`; w.x.querySelector("[data-b=undo]").disabled = !hist.length; w.x.querySelector("[data-b=ok]").disabled = JSON.stringify(d()) === JSON.stringify(base); };
  const paint = () => { const y = w.x.querySelector(".gsb")?.scrollTop ?? 0; w.x.innerHTML = `<div class="edh"></div><div class=gpt role=tablist style="padding-top:8px">${[["base", "기본"], ["stat", "능력치"], ["arms", "무기"], ["skill", "기술"]].map(([k, t]) => `<button role=tab data-t=${k} aria-selected=${k === tab}>${t}</button>`).join("")}</div><div class=gsb>${body()}</div><div class=gsf><button data-b=undo>되돌리기</button><button data-b=ok class=ok>이대로 적용</button></div>`; w.x.querySelector(".gsb").scrollTop = y; head();
    w.x.querySelectorAll("[data-i]").forEach((n) => { n.onchange = () => { keep(); if (n.dataset.i === "name") E.editName(d(), n.value); else { const x = d().weapons[+n.dataset.k]; E.editWeapon(d(), +n.dataset.k, { name: n.value || x.name, kind: x.kind, grade: x.grade == null ? undefined : E.gradeName(x.grade), elem: x.elem }); } paint(); }; }); };
  const reforge = (i, o) => { const x = d().weapons[i], std = x.name === E.KINDS[x.kind]?.n; keep(); E.editWeapon(d(), i, { name: std && o.kind ? E.KINDS[o.kind].n : x.name, kind: x.kind ?? Object.keys(E.KINDS).find((k) => E.KINDS[k].base === x.type), grade: E.gradeName(x.grade ?? 4), elem: x.elem, ...o }); };
  paint(); holds(w.x, ".gb>button", (k, n, c) => { const q = d(), v = n * (c > 16 ? 5 : 1); keep("bar" + k); if (k === "level") { E.editLevel(W, ref, q.level + v, scale); paintBar(w.x, k, d().level, E.MAXLV, base.level); } else if (k === "move") { q.move = Math.max(1, Math.min(10, q.move + n)); paintBar(w.x, k, q.move, 10, base.move); } else { E.editStat(q, k, q.stats[k] + v); paintBar(w.x, k, q.stats[k], E.STAT_MAX(k), base.stats[k]); } clearTimeout(w.t); w.t = setTimeout(head, 160); });
  w.x.onclick = async (e) => { const b = e.target.closest("button"); if (!b || b.closest(".gb")) return; const q = d(), k = b.closest("[data-w]")?.dataset.w, i = +(b.closest("[data-k]")?.dataset.k ?? -1); if (b.dataset.t) { tab = b.dataset.t; last = ""; return paint(); } if (b.dataset.sk) { keep(); E.editSkill(W, q, b.dataset.sk); return paint(); }
    if (b.dataset.v != null) { if (k === "scale") scale = b.dataset.v === "1"; else { keep(); if (k === "sex") q.sex = b.dataset.v || undefined; else E.editMtype(q, b.dataset.v); } return paint(); }
    if (b.dataset.s != null) { const s = +b.dataset.s; let v; if (k === "race") { v = await spinPick(raceItems([], q.sex ?? "m"), q.race || "인간", s, "종족"); if (v != null) { keep(); E.editRace(W, q, v); } } else if (k === "job") { v = await spinPick(jobItems([{ k: "", t: "직업 없음", g: "기본직" }], q.sex ?? "m"), q.job || "", s, "직업", true); if (v != null) { keep(); E.editJob(W, q, v); } } else if (k === "t1" || k === "t2") { v = await spinPick(elemItems(), (k === "t1" ? q.elem : q.elem2) ?? "", s, k === "t1" ? "속성" : "둘째 속성"); if (v != null) { keep(); const f = k === "t1" ? "elem" : "elem2"; if (v) q[f] = v; else delete q[f]; } } else if (k === "outfit") { v = await spinPick(OUTS(), q.outfit ?? "", s, "복장", true); if (v != null) { keep(); q.outfit = v || undefined; } } else { const n = +k.slice(1), x = q.weapons[n]; if (k[0] === "k") { v = await spinPick(kindItems(), x.kind, s, "무기 종류"); if (v != null) reforge(n, { kind: v }); } else if (k[0] === "g") { v = await spinPick(gradeItems(), x.grade ?? 4, s, "등급"); if (v != null) reforge(n, { grade: E.gradeName(v) }); } else { v = await spinPick(elemItems(), x.elem ?? "", s, "속성"); if (v != null) reforge(n, { elem: v }); if (v === "" && d().weapons[n].elem) delete d().weapons[n].elem; } } return paint(); }
    const c = b.dataset.b; if (c === "undo") { if (hist.length) { W = JSON.parse(hist.pop()); last = ""; paint(); } } else if (c === "even") { keep(); Object.assign(q.stats, base.stats); q.move = base.move; paint(); } else if (c === "addw") { keep(); E.editWeapon(q, q.weapons.length, { name: "검", kind: "sword", grade: "보통" }); paint(); } else if (c === "drop") { keep(); E.dropWeapon(q, i); paint(); } else if (c === "first") { keep(); E.firstWeapon(q, i); paint(); } else if (c === "ok") { E.commitEdit(S, W, ref); save(); w.close(); if (V.sel && !V.menu) pickUnit(U(V.sel)); else draw(); command("info"); } };
}
// 도감: 탭으로 나눠 본다
function book() {
  const w = screen("도감"), T = [["foe", "적"], ["job", "직업"], ["race", "종족"], ["kind", "무기"], ["grade", "등급"], ["elem", "속성"]]; let t = "foe", set = "판타지";
  const body = () => { if (t === "foe") return `${seg("set", "무리", [["판타지", "판타지"], ["현대", "현대"]], set)}<div class="bestiary full">${Object.entries(E.PRE).filter(([, q]) => q.set === set).map(([n, q]) => `<figure data-foe="${esc(n)}"><img alt=""><figcaption>${esc(n)}</figcaption></figure>`).join("")}</div>`;
    if (t === "job") return Object.entries(E.CLASSES).filter(([, c]) => c.tier === 1).map(([n, c]) => `<p><b>${n}</b> ${esc(c.about)} <small>${c.weapons.map((q) => E.WT[q].n).join("·")} · ${E.MTL[c.mtype]}</small>${c.adv.map((a) => `<br><small>→ ${a}: ${esc(E.CLASSES[a].about)} 「${esc(E.CLASSES[a].skill.name)}」 ${esc(E.CLASSES[a].skill.desc)}</small>`).join("")}</p>`).join("");
    if (t === "race") return [...new Set(Object.values(E.RACES).map((r) => r.kind))].map((k) => { const l = Object.entries(E.RACES).filter(([, r]) => r.kind === k), r = l[0][1]; return `<p><b>${l.map(([n]) => n).join(", ")}</b><br>${esc(r.about)}<br><small>${E.STATS.filter((q) => r.stats[q]).map((q) => E.SL[q] + (r.stats[q] > 0 ? "+" : "") + r.stats[q]).join(" ")} · 「${esc(E.RACE_SKILLS[r.trait].name)}」 ${esc(E.RACE_SKILLS[r.trait].desc)}</small></p>`; }).join("");
    if (t === "kind") return kindItems().map((k) => `<p>${k.ic} <b>${esc(k.t)}</b> <small>${esc(k.g)} 계열 · ${esc(k.sub)}</small></p>`).join(""); if (t === "grade") return gradeItems().map((g) => `<p><u class=gr style="background:${g.tc}">${esc(g.t)}</u> <small>${esc(g.sub)}</small></p>`).join(""); const K = Object.keys(E.ELEMENTS); return `<p class=full><small>세로 = 공격, 가로 = 받는 쪽. 속성이 둘이면 곱하고, 자기 속성으로 치면 ×1.5. 비행은 땅 공격을 받지 않아요.</small></p><div class="tchart full"><table><tr><th></th>${K.map((d) => `<th><u class=el style="--e:${E.ELEMENTS[d].c}">${E.ELEMENTS[d].n}</u></th>`).join("")}</tr>${K.map((a) => `<tr><th><u class=el style="--e:${E.ELEMENTS[a].c}">${E.ELEMENTS[a].n}</u></th>${K.map((d) => { const m = E.chart(a, d); return `<td class="m${String(m).replace(".", "")}">${m === 1 ? "" : m === 2 ? "2" : m === 0 ? "0" : "½"}</td>`; }).join("")}</tr>`).join("")}</table></div>`; };
  const paint = () => { w.x.innerHTML = `<div class=gpt role=tablist style="padding-top:8px">${T.map(([k, n]) => `<button role=tab data-t=${k} aria-selected=${k === t}>${n}</button>`).join("")}</div><div class="gsb gbook">${body()}</div>`; const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); const n = e.target.dataset.foe, q = E.PRE[n], src = hooks.face?.("enemy", q.emoji, false, { race: "", w: q.weapons[0]?.type ?? "", look: {}, mt: q.mtype, sex: "", id: n, model: E.modelOf({ name: n, cls: q.cls }), elem: q.elem ?? "", cls: q.cls }, true); if (src) e.target.querySelector("img").src = src; } }, { rootMargin: "100px" }) : null; w.x.querySelectorAll("[data-foe]").forEach((n) => io?.observe(n)); };
  paint(); w.x.onclick = (e) => { const b = e.target.closest("button"); if (b?.dataset.t) { t = b.dataset.t; paint(); } else if (b?.dataset.v) { set = b.dataset.v; paint(); } };
}
function settings() { const w = screen("설정"), paint = () => { w.x.innerHTML = `<div class=gsb>${seg("fast", "전투 연출", [["0", "보통"], ["1", "짧게"]], fast ? "1" : "0")}${seg("gfx", "그래픽", [["auto", "자동"], ["hi", "높음"], ["lo", "가볍게"]], STORE.getItem("dusk-saga-gfx") || "auto")}${seg("zone", "위험 범위", [["0", "끔"], ["1", "늘 보기"]], zone ? "1" : "0")}${seg("auto", "모두 행동하면", [["0", "기다리기"], ["1", "턴 넘기기"]], STORE.getItem("dusk-saga-auto") || "1")}<p class=full><small>‘자동’은 화면이 느려지면 알아서 가볍게 바꿔요.</small></p></div>`; }; paint(); w.x.onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; const k = b.closest("[data-w]").dataset.w, v = b.dataset.v; if (k === "fast") { fast = v === "1"; STORE.setItem("dusk-saga-fast", v); } else if (k === "gfx") { STORE.setItem("dusk-saga-gfx", v); hooks.gfx?.(v); } else if (k === "zone") { zone = v === "1"; STORE.setItem(KEY + "zone", v); draw(); } else STORE.setItem("dusk-saga-auto", v); paint(); }; }
function help() { STORE.setItem("dusk-saga-coach", "1"); sheet(`<h3>이렇게 해요</h3><ol><li><b>빛나는 아군</b>을 눌러요.</li><li><b>빨간 테두리 적</b>을 누르면 알아서 다가가요.<br>파란 칸을 누르면 그 자리로 가요.</li><li>예측을 보고 <b>공격</b>을 눌러요. 그전에는 ‘뒤로’로 물릴 수 있어요.</li><li>모두 움직이면 적 차례예요.</li></ol><p>인물을 한 번 더 누르면 제자리에서 행동해요. 왼쪽 얼굴을 누르면 그 인물로 바로 가고, 명판을 누르면 자세한 능력치가 보여요. 지도는 밀어서 옮기고 두 손가락으로 확대·회전해요. <b>위험</b>을 켜면 적이 칠 수 있는 칸이 보여요.</p>`); }
app.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) { if (e.target.classList.contains("sheet")) e.target.hidden = true; return; }
  if (b.dataset.p) { if (busy) return; $(".sheet").hidden = true; cancel(); pickUnit(U(b.dataset.p)); return spot(b.dataset.p); }
  if (b.dataset.x != null) return tap(+b.dataset.x, +b.dataset.y); if (b.dataset.a) return command(b.dataset.a, b); if (busy) return;
  const u = V.sel && U(V.sel); if (!u) return;
  if (b.dataset.t) { V.fc = { id: b.dataset.t, i: 0 }; return draw(); } if (b.dataset.w) { V.fc.i = +b.dataset.w; return draw(); }
  if (b.dataset.o) { const o = V.list[+b.dataset.o]; if (o.kind === "item") return act((ev) => E.actItem(S, u, o.wi, ev)); if (o.kind === "switch") { const r = E.actSwitch(S, u); V.sel = V.look = r.id; return draw(); } V.opt = o; draw(); }
});
// 전투 시작 경고: 삼각형이 내리꽂히고 전장 이름과 목표를 보여 준다. 누르면 바로 넘어간다
async function encounter() {
  const B = S.battle, foes = E.living(B).filter((u) => E.SIDE[u.team] !== 0), boss = foes.find((u) => u.boss), n = document.createElement("div"); n.className = "enc";
  n.innerHTML = `<div class=ebg></div><div class=estripe></div><div class="estripe low"></div><svg viewBox="-100 -100 200 190" aria-hidden=true><path class=e3 d="M0-92 92 70H-92z"/><path class=e2 d="M0-74 76 60H-76z"/><path class=e1 d="M0-46 8 22H-8zM0 32a9 9 0 1 1 0 18 9 9 0 0 1 0-18z"/></svg>${[0, 1, 2, 3, 4, 5].map((i) => `<i style="--i:${i};--x:${[8, 84, 22, 70, 4, 92][i]}%;--y:${[16, 12, 76, 82, 50, 46][i]}%"></i>`).join("")}<div class=etx><b>교전</b><span>${esc(B.name)}</span><small>목표 ${esc(E.objText(B))} · 적 ${foes.length}${boss ? ` · ${esc(D(boss).name)}` : ""}</small></div>`;
  BODY.append(n); busy = true; draw(view());
  await new Promise((done) => { const t = setTimeout(done, 2300); n.onclick = () => { clearTimeout(t); done(); }; });
  n.classList.add("bye"); await wait(260); n.remove(); busy = false; draw();
}
// 이펙트 시연: 궁극기와 타격을 골라 본다
hooks.kit = () => ({ U, D, faceOf, S: () => S, spot, hideUi: () => { app.querySelectorAll(".dock,.roster,.ground,.guide,.top").forEach((n) => { n.style.display = "none"; }); } });
if (BODY.dataset.mode === "cutscene") {
  S = start(); const [a, d] = [U("ren"), U("captain")]; let speed = 1;
  app.innerHTML = `<div class=top><b>컷씬 시험</b><button>느리게</button><button>보통</button><button>빠르게</button></div>`;
  app.querySelectorAll("button").forEach((b, i) => { b.onclick = () => { speed = [0.5, 1, 2][i]; }; });
  (async () => { for (;;) { await cutscene(a, d, [{ t: "strike", from: a.id, to: d.id, dmg: 7, hp: 27 }, { t: "strike", from: d.id, to: a.id, miss: true, dmg: 0, hp: 21 }, { t: "strike", from: a.id, to: d.id, dmg: 21, hp: 6, crit: true }], speed); await wait(900); } })();
} else {
  hooks.info = (x, y) => { if (busy) return; const z = E.unitAt(S.battle, x, y); if (z) { V.look = z.id; command("info"); } };
  hooks.redraw = () => draw(busy ? view() : undefined); draw(); spot(Object.keys(S.battle.units)[0]); (fresh0 ? encounter() : Promise.resolve()).then(() => { save(); if (!FX && !coached()) help(); }); addEventListener("resize", () => HOST.paused || draw(busy ? view() : undefined));
  addEventListener("keydown", (e) => { if (HOST.paused || /^(INPUT|TEXTAREA)$/.test(e.composedPath?.()[0]?.tagName ?? "")) return; if (e.key === "Escape") { if (!$(".sheet").hidden) $(".sheet").hidden = true; else if (!busy) stepBack(); return; } const k = { t: "topcam", Enter: "go", ArrowLeft: "prevt", ArrowRight: "nextt", e: "end", d: "zone", n: "next", f: "fast" }[e.key]; if (k) { e.preventDefault(); command(k); } });
}
