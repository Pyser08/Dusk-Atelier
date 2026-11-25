// Dusk Saga 화면 초안(목업): 실제 엔진으로 움직인다
import * as E from "../../src/rpg/engine/index.js";
// 3D 화면이 끼워 넣는 연출(없으면 2D 컷씬)
export const hooks = { fight: null, menu: null };
const KEY = "dusk-saga-dev" + (new URLSearchParams(location.search).get("k") ?? "");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const app = document.getElementById("app"), wait = (ms) => new Promise((r) => setTimeout(r, ms));
function start() { const S = E.fresh(); E.ensureBase(S); E.loadEncounter(S, E.demo()); E.snapshot(S); return S; }
let S; try { S = JSON.parse(localStorage.getItem(KEY)) || start(); } catch { S = start(); }
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
// sel: 고른 유닛, from: 원래 자리, R: 이동 범위, opt: 고른 명령
let V = { sel: null }, busy = false, skip = false;
const U = (id) => S.battle.units[id], D = (u) => S.defs[u.ref];
const DECO = { f: "♣", m: "▲", F: "⌂", T: "♛", p: "▮", b: "≡", w: "≈", "#": "" };

async function cutscene(a, d, ev, speed = 1, ha, hd) {
  const hits = ev.filter((e) => e.t === "strike"); if (!hits.length) return;
  skip = false; const el = document.createElement("div"); el.className = "cut";
  const half = (u, c) => `<div class="half ${c} ${u.team}" data-u="${esc(u.id)}"><div class=face>${esc(D(u).emoji)}</div><b>${esc(D(u).name)}</b><div class=hp><i></i></div></div>`;
  el.innerHTML = half(a, "l") + half(d, "r") + "<em></em>"; document.body.append(el); el.onclick = () => { skip = true; };
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
  for (let i = 0; i < n; i++) { const d = document.createElement("i"); d.className = "spark"; document.body.append(d); const a = Math.random() * 6.28, r = 24 + Math.random() * 46; d.style.cssText = `left:${b.left + b.width / 2}px;top:${b.top + b.height / 2}px;background:${color}`; d.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) scale(0)`, opacity: 0 }], { duration: 520, easing: "ease-out" }).onfinish = () => d.remove(); }
}
async function banner(text, cls) { const n = document.createElement("div"); n.className = "banner " + cls; n.innerHTML = `<b>${esc(text)}</b>`; document.body.append(n); await nap(850); n.remove(); }
let fast = false; const nap = (ms) => wait(fast ? ms / 4 : ms);
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
        const info = (id) => { const u = U(id), d = D(u), w = d.weapons[u.wi]; return { id, name: d.name, team: u.team, max: d.stats.hp, hp: before[id]?.hp ?? u.hp, type: w?.type ?? "sword", magic: !!w?.magic, weapon: w?.name ?? "" }; };
        const ids = [...new Set([e.a, e.d, ...hits.map((h) => h.from)])].filter((id) => U(id));
        await hooks.fight({ a: e.a, d: e.d, art: e.art, who: Object.fromEntries(ids.map((id) => [id, info(id)])) }, hits, { fast: () => fast, hit(h) { const n = el(h.to); pop(h.to, h.guard ? "막음" : h.miss ? "빗나감" : h.dmg, h.crit ? "crit" : ""); if (h.dmg) sparks(h.to, h.crit ? "#ffd27a" : "#ff8f7a", h.crit ? 30 : 16); if (n) n.querySelector(".hpb").style.width = h.hp * 100 / D(U(h.to)).stats.hp + "%"; if (before[h.to]) before[h.to].hp = h.hp; } });
        for (const h of hits) if (before[h.to]) before[h.to].hp = h.hp;
        i = j - 1; continue;
      }
      if (!fast && before[e.a] && before[e.d]) await cutscene(U(e.a), U(e.d), hits, 1, before[e.a].hp, before[e.d].hp);
      for (const h of hits) { const n = el(h.to); pop(h.to, h.guard ? "막음" : h.miss ? "빗나감" : h.dmg, h.crit ? "crit" : ""); if (h.dmg) { sparks(h.to, h.crit ? "#ffd27a" : "#ff8f7a"); n?.animate([{ transform: "translateX(0)" }, { transform: "translateX(7px)" }, { transform: "translateX(-7px)" }, { transform: "none" }], 220); } if (n) n.querySelector(".hpb").style.width = h.hp * 100 / D(U(h.to)).stats.hp + "%"; if (before[h.to]) before[h.to].hp = h.hp; await nap(140); }
      i = j - 1;
    } else if (e.t === "heal") { pop(e.id, "+" + e.amt, "heal"); sparks(e.id, "#8ee3a8", 10); const n = el(e.id); if (n) n.querySelector(".hpb").style.width = e.hp * 100 / D(U(e.id)).stats.hp + "%"; if (before[e.id]) before[e.id].hp = e.hp; await nap(350); }
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
async function act(fn) { busy = true; const ev = [], b = view(); fn(ev); clear(); await play(ev, b); E.mark(S, "행동"); if (S.battle.status === "active" && E.allDone(S)) await endTurn(); busy = false; save(); draw(); }
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
  if (u && z && V.reachable.has(z.id)) return quick(u, z);
  if (u && E.stops(S, u, V.R).includes(k)) { await walk(u, k); V.menu = true; return draw(); }
  if (z) return pickUnit(z); clear(); draw();
}
let zone = localStorage.getItem(KEY + "zone") === "1", cell = +localStorage.getItem(KEY + "cell") || 0;
const coached = () => localStorage.getItem("dusk-saga-coach") === "1";
app.innerHTML = `<div class=top><div class=goal></div><button data-a=zone>위험</button><button data-a=menu aria-label=메뉴>☰</button></div><div class=view><div class=board></div></div><div class=guide role=status></div><div class=dock></div><div class=sheet hidden></div>`;
const $ = (q) => app.querySelector(q);
const targets = (u) => E.alive(S.battle).filter((z) => E.foe(z, u) && attacks(u, z.id).length);
const RING = { attack: "공격", heal: "회복", item: "도구", pair: "호위진", drop: "해제", switch: "교대" };
function size() { const v = $(".view"), B = S.battle, fit = Math.min((v.clientWidth - 16) / B.w, (v.clientHeight - 16) / B.h); return cell || Math.max(46, Math.min(84, Math.floor(fit))); }
function focus(x, y) { const v = $(".view"), c = size(); v.scrollTo({ left: 8 + (x + .5) * c - v.clientWidth / 2, top: 8 + (y + .5) * c - v.clientHeight / 2, behavior: "smooth" }); }
function guide() {
  const B = S.battle, u = V.sel && U(V.sel);
  if (B.status !== "active" && !busy) return B.status === "victory" ? "승리했어요" : "패배했어요";
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
    const half = (m, r, loss) => { const left = Math.max(0, m.hp - loss), d = D(m); return `<div class="plate ${m.team}"><header><b>${esc(d.name)}</b><small>Lv ${d.level}</small></header><div class=big>${m.hp}<i>▸</i><b class="${left ? "" : "ko"}">${left || "격파"}</b></div>${gauge(m.hp, left, d.stats.hp)}<div class=stat3>${r.can ? `<span><small>피해</small>${r.dmg}${n(r) > 1 ? `<u>×${n(r)}</u>` : ""}</span><span><small>명중</small>${r.hit}</span><span><small>필살</small>${r.crit}</span>` : "<span class=none>반격 불가</span>"}</div></div>`; };
    const cards = l.map((q, i) => { u.wi = q.wi; const g = E.forecast(S, u, z, q.art || null).a; u.wi = wi; return `<button data-w=${i} class="wcard ${i === V.fc.i ? "on" : ""}"><b>${q.art ? "✦ " : ""}${esc(q.label)}</b><small>피해 ${g.total} · 명중 ${g.hit}${g.tri > 0 ? " · 유리" : g.tri < 0 ? " · 불리" : ""}</small></button>`; }).join("");
    const many = targets(u).length > 1;
    return `<div class=duel>${half(u, f.a, f.d.can ? f.d.total : 0)}<em class="${f.a.tri > 0 ? "up" : f.a.tri < 0 ? "dn" : ""}">${f.a.tri > 0 ? "▲" : f.a.tri < 0 ? "▼" : "VS"}</em>${half(z, f.d, f.a.total)}</div>${f.a.dual ? `<div class=assist>협동 공격 · ${esc(f.a.dual.name)} +${f.a.dual.dmg} (${f.a.dual.hit}%)</div>` : ""}<div class=wcards>${cards}</div><div class=row>${btn("back1", "뒤로")}${many ? btn("prevt", "◀", "sm") + btn("nextt", "▶", "sm") : ""}${btn("go", "공격 개시", "main strike")}</div>`;
  }
  if (V.opt) return `<div class=row>${btn("back1", "뒤로")}</div>`;
  if (V.menu && u) {
    V.list = E.options(S, u, V.from).filter((o) => o.targets.length && ["heal", "item", "pair", "drop", "switch"].includes(o.kind));
    const it = []; const can = targets(u); if (can.length) it.push(`<button data-a=aim class=hot>${ICON.attack}<small>공격</small></button>`);
    V.list.forEach((o, i) => it.push(`<button data-o=${i}>${ICON[o.kind]}<small>${esc(o.kind === "item" || o.kind === "heal" || o.kind === "switch" ? o.label : RING[o.kind])}</small></button>`));
    if (E.canSeize(S, u)) it.push("<button data-a=seize class=hot>♛<small>제압</small></button>"); it.push("<button data-a=wait>◷<small>대기</small></button>");
    if (hooks.menu) { V.ring = it; return `<div class=row>${btn("back1", "뒤로")}</div>`; }
    return `<div class="row acts">${it.join("")}</div><div class=row>${btn("back1", "뒤로")}</div>`;
  }
  if (look) { const d = D(look);
    return `<div class=who><span class="ava ${look.team}">${esc(d.emoji)}</span><div><b>${esc(d.name)}</b> <small>Lv ${d.level} ${esc(d.cls)}</small>${gauge(look.hp, look.hp, d.stats.hp)}<small>HP ${look.hp}/${d.stats.hp} · ${esc(d.weapons[look.wi]?.name ?? "")}</small></div><button data-a=info>자세히</button></div><div class=row>${btn("cancel", "취소")}${u ? btn("here", "제자리에서 행동", "main") : ""}</div>`; }
  const left = E.alive(B).filter((z) => z.team === "ally" && !z.done).length;
  return `<div class=row>${btn("next", `다음 아군 <small>${left}명 남음</small>`, "main")}${btn("end", "턴 종료")}</div>`;
}
function sheet(html) { const n = $(".sheet"); n.innerHTML = `<div class=panel>${html}<button data-a=close class=wide>닫기</button></div>`; n.hidden = false; }
function draw(at) {
  const B = S.battle, look = V.look && U(V.look), u = V.sel && U(V.sel), at0 = at ?? view(), dz = zone ? E.danger(S, "enemy") : new Set();
  const free = V.R && look && !V.menu, move = free ? new Set(E.stops(S, look, V.R)) : new Set(), red = free ? E.threat(S, look, V.R) : new Set();
  const tg = new Set((V.opt?.targets ?? []).map((t) => (typeof t === "number" ? t : E.K(U(t).x, U(t).y))));
  const c = size(), board = $(".board"); board.style.cssText = `--w:${B.w};--h:${B.h};width:${c * B.w}px`;
  let h = ""; for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const k = E.K(x, y), m = B.map[y][x]; h += `<button class="t t${m === "." ? "dot" : m === "#" ? "wall" : m} ${move.has(k) ? "mv" : red.has(k) ? "rd" : ""} ${tg.has(k) ? "tg" : ""} ${dz.has(k) ? "dz" : ""}" data-x=${x} data-y=${y}><s>${DECO[m] ?? ""}</s></button>`; }
  for (const [id, p] of Object.entries(at0)) { const z = U(id); if (!z) continue; const aim = !at && u && (V.menu ? (V.fc ? V.fc.id === id : E.foe(z, u) && !V.opt && attacks(u, id).length > 0) : V.reachable?.has(id)), ready = !at && !busy && !V.sel && z.team === "ally" && !z.done; h += `<span class="u ${z.team} ${z.done && !at ? "done" : ""} ${id === V.sel ? "sel" : ""} ${aim ? "aim" : ""} ${ready ? "ready" : ""}" data-id="${esc(id)}" style="--x:${p.x};--y:${p.y}"><q>${esc(D(z).emoji)}</q>${z.boss ? "<sup>★</sup>" : ""}${z.rear ? "<sub>⇄</sub>" : ""}<i class=hpb style="width:${p.hp * 100 / D(z).stats.hp}%"></i></span>`; }
  board.innerHTML = h; $(".goal").innerHTML = `<b>${B.turn}턴</b> ${esc(E.objText(B))}`; $("[data-a=zone]").classList.toggle("on", zone); $(".guide").textContent = guide(); V.ring = null; $(".dock").innerHTML = dock(); hooks.menu?.(V.ring && !busy ? { id: V.sel, items: V.ring } : null, V.fc && !busy ? { a: V.sel, d: V.fc.id } : null);
}
function command(a) {
  if (a === "fast") { fast = !fast; return draw(view()); } if (a === "close") { $(".sheet").hidden = true; return; } if (busy) return; const u = V.sel && U(V.sel);
  if (a === "cancel") cancel(); else if (a === "back1") stepBack();
  else if (a === "zone") { zone = !zone; localStorage.setItem(KEY + "zone", zone ? "1" : "0"); draw(); }
  else if (a === "here") { V.menu = true; draw(); }
  else if (a === "wait" && u) act(() => E.actWait(S, u)); else if (a === "seize" && u) act((ev) => E.actSeize(S, u, ev));
  else if (a === "aim" && u) { const l = targets(u); if (l.length) { V.fc = { id: l[0].id, i: 0 }; draw(); } }
  else if ((a === "prevt" || a === "nextt") && V.fc) { const l = targets(u), i = l.findIndex((z) => z.id === V.fc.id); V.fc = { id: l[(i + (a === "nextt" ? 1 : l.length - 1)) % l.length].id, i: 0 }; draw(); }
  else if (a === "go" && V.fc) { const o = attacks(u, V.fc.id)[V.fc.i], z = U(V.fc.id); u.wi = o.wi; act((ev) => E.actAttack(S, u, z, o.art || null, ev)); }
  else if (a === "next") { const l = E.alive(S.battle).filter((z) => z.team === "ally" && !z.done); if (l.length) { const z = l[(l.findIndex((q) => q.id === S.last) + 1) % l.length]; S.last = z.id; pickUnit(z); spot(z.id); } }
  else if (a === "end") { const n = E.alive(S.battle).filter((z) => z.team === "ally" && !z.done).length; sheet(`<h3>턴을 끝낼까요?</h3><p>${n ? `아직 ${n}명이 행동하지 않았어요.` : "모두 행동했어요."}</p><button data-a=endyes class="wide main">턴 종료</button>`); }
  else if (a === "endyes") { $(".sheet").hidden = true; cancel(); busy = true; endTurn().then(() => { busy = false; save(); draw(); }); }
  else if (a === "menu") sheet(`<h3>${esc(S.battle.name)}</h3><button data-a=rewind class=wide ${S.pulse > 0 && (S.hist ?? []).length > 1 ? "" : "disabled"}>되감기 (${S.pulse ?? 0}회 남음)</button><button data-a=log class=wide>전투 기록</button><button data-a=zin class=wide>지도 크게</button><button data-a=zout class=wide>지도 작게</button><button data-a=help class=wide>조작 방법</button><button data-a=retry class=wide>처음부터 다시</button>`);
  else if (a === "rewind") { cancel(); if (E.pulse(S, S.hist.length - 2)) save(); $(".sheet").hidden = true; draw(); }
  else if (a === "log") sheet(`<h3>전투 기록</h3><div class=log>${S.log.slice(-40).reverse().map((l) => `<div>${esc(l.text)}</div>`).join("")}</div>`);
  else if (a === "zin" || a === "zout") { cell = Math.max(30, Math.min(96, size() + (a === "zin" ? 8 : -8))); localStorage.setItem(KEY + "cell", cell); draw(); }
  else if (a === "help") help();
  else if (a === "retry") { S = start(); clear(); save(); $(".sheet").hidden = true; draw(); spot("arin"); }
  else if (a === "info" && V.look) { const z = U(V.look), d = D(z); sheet(`<h3>${esc(d.emoji)} ${esc(d.name)}</h3><p class=st>${E.STATS.map((k) => `<span>${E.SL[k]} <b>${d.stats[k]}</b></span>`).join("")}</p>${d.weapons.map((w) => `<p><b>${esc(w.name)}</b> 위력 ${w.mt} · 명중 ${w.hit}</p>`).join("")}${d.skills.map((k) => S.skills[k]).filter(Boolean).map((k) => `<p><b>${esc(k.name)}</b> ${esc(E.skillText(k))}</p>`).join("")}`); }
}
function help() { localStorage.setItem("dusk-saga-coach", "1"); sheet(`<h3>이렇게 해요</h3><ol><li><b>빛나는 아군</b>을 눌러요.</li><li><b>빨간 테두리 적</b>을 누르면 알아서 다가가요.<br>파란 칸을 누르면 그 자리로 가요.</li><li>예측을 보고 <b>공격</b>을 눌러요. 그전에는 ‘뒤로’로 물릴 수 있어요.</li><li>모두 움직이면 적 차례예요.</li></ol><p>지도는 손가락으로 밀어서 움직여요. <b>위험</b>을 켜면 적이 칠 수 있는 칸이 보여요.</p>`); }
app.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) { if (e.target.classList.contains("sheet")) e.target.hidden = true; return; }
  if (b.dataset.x != null) return tap(+b.dataset.x, +b.dataset.y); if (b.dataset.a) return command(b.dataset.a); if (busy) return;
  const u = V.sel && U(V.sel); if (!u) return;
  if (b.dataset.t) { V.fc = { id: b.dataset.t, i: 0 }; return draw(); } if (b.dataset.w) { V.fc.i = +b.dataset.w; return draw(); }
  if (b.dataset.o) { const o = V.list[+b.dataset.o]; if (o.kind === "item") return act((ev) => E.actItem(S, u, o.wi, ev)); if (o.kind === "switch") { const r = E.actSwitch(S, u); V.sel = V.look = r.id; return draw(); } V.opt = o; draw(); }
});
if (document.body.dataset.mode === "cutscene") {
  S = start(); const [a, d] = [U("ren"), U("captain")]; let speed = 1;
  app.innerHTML = `<div class=top><b>컷씬 시험</b><button>느리게</button><button>보통</button><button>빠르게</button></div>`;
  app.querySelectorAll("button").forEach((b, i) => { b.onclick = () => { speed = [0.5, 1, 2][i]; }; });
  (async () => { for (;;) { await cutscene(a, d, [{ t: "strike", from: a.id, to: d.id, dmg: 7, hp: 27 }, { t: "strike", from: d.id, to: a.id, miss: true, dmg: 0, hp: 21 }, { t: "strike", from: a.id, to: d.id, dmg: 21, hp: 6, crit: true }], speed); await wait(900); } })();
} else {
  draw(); spot("arin"); if (!coached()) help(); addEventListener("resize", () => draw(busy ? view() : undefined));
  addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$(".sheet").hidden) $(".sheet").hidden = true; else if (!busy) stepBack(); return; } const k = { Enter: "go", ArrowLeft: "prevt", ArrowRight: "nextt", e: "end", d: "zone", n: "next", f: "fast" }[e.key]; if (k) { e.preventDefault(); command(k); } });
}
