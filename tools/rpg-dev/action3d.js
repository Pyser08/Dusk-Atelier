// Dusk Saga 보스전 1대1 (실시간, 소울류): 지금 3D 판 위에서 아군 하나를 직접 움직여 보스 하나와 싸운다.
// 카메라는 내 등 뒤에서 보스를 고정(락온)한다. 보스는 바닥에 범위를 예고한 뒤 터뜨리고, 콤보로 잇는다.
// 나는 약공·강공·스킬, 구르기(짧은 무적), 패링(성공하면 앞잡), 등 뒤에서 뒤잡, 회복약(3개)으로 싸운다. 행동마다 기력을 쓴다.
// 피해·필살 숫자는 턴제 엔진 예측값에서 온다. 3D 장면·모델·모션·이펙트는 app3d 것을 빌린다.
import { sfx } from "./sfx.js";

const TAU = Math.PI * 2, angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const C = { spd: 3.5, strafe: 2.9, rollT: .5, rollD: 2.1, ifrA: .05, ifrB: .23, rollRec: .14, st: 100, regen: 40, regenDelay: .55,
  cost: { light: 14, heavy: 28, roll: 30, parry: 12 }, parryWin: .17, parryT: .5, flask: 3, flaskHeal: .45, drinkT: 1.15, skillCd: 9, hitR: .36 };

export function createAction({ THREE, scene, cam, ctl, view, units, hgt, vox, vfx, kick, size }) {
  let A = null;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const tileH = (x, z) => hgt.get(Math.round(x) + "," + Math.round(z));
  const tileOK = (x, z) => { const { W, D } = size(); if (x < -.45 || z < -.45 || x > W - .55 || z > D - .55) return false; const h = tileH(x, z); return !(h == null || h >= .85 || h < -1); };
  // 갈 수 있나: 막힌 칸에 이미 서 있으면 빠져나가는 건 허용, 보스와 겹쳐도 멀어지는 쪽은 허용(끼어서 못 움직이는 일 방지)
  const free = (x, z, r = 0) => {
    if (!tileOK(x, z)) return !!(r && A && !tileOK(A.hero.x, A.hero.z));
    if (r && A && !A.boss.gone) { const b = A.boss, dn = Math.hypot(x - b.x, z - b.z), d0 = Math.hypot(A.hero.x - b.x, A.hero.z - b.z); if (dn < b.r + r && dn < d0 + 1e-3) return false; }
    return true; };
  const gy = (x, z) => Math.max(-.1, tileH(x, z) ?? 0);

  // ── 바닥 예고 ──
  const mat = (o, add) => new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide, ...(add ? { blending: THREE.AdditiveBlending } : {}) });
  function tele(kind, x, z, rot, p) {
    const g = new THREE.Group(); g.position.set(x, gy(x, z) + .04, z); g.rotation.y = rot; let edge, fill;
    if (kind === "circle") { edge = new THREE.Mesh(new THREE.RingGeometry(p.r - .07, p.r, 48), mat(.75)); fill = new THREE.Mesh(new THREE.CircleGeometry(p.r, 48), mat(.3, true)); }
    else if (kind === "fan") { const s = -Math.PI / 2 - p.a, l = p.a * 2; edge = new THREE.Mesh(new THREE.RingGeometry(p.r - .07, p.r, 32, 1, s, l), mat(.75)); fill = new THREE.Mesh(new THREE.RingGeometry(.01, p.r, 32, 1, s, l), mat(.3, true)); const bg = new THREE.Mesh(new THREE.RingGeometry(.01, p.r, 32, 1, s, l), mat(.1)); bg.rotation.x = -Math.PI / 2; g.add(bg); }
    else { const ge = new THREE.PlaneGeometry(p.w, p.len); ge.rotateX(-Math.PI / 2); ge.translate(0, 0, p.len / 2); edge = new THREE.Mesh(ge, mat(.14)); fill = new THREE.Mesh(ge.clone(), mat(.34, true)); }
    if (kind !== "line") edge.rotation.x = fill.rotation.x = -Math.PI / 2;
    g.add(edge, fill); scene.add(g); return { g, fill, kind, x, z, rot, p };
  }
  const aim = (t, x, z, rot) => { t.x = x; t.z = z; t.rot = rot; t.g.position.set(x, gy(x, z) + .04, z); t.g.rotation.y = rot; };
  const setProg = (t, k) => { if (t.kind === "line") t.fill.scale.set(1, 1, Math.max(.001, k)); else t.fill.scale.setScalar(Math.max(.001, k)); t.fill.material.opacity = .22 + .5 * k; };
  const killTele = (t) => { scene.remove(t.g); t.g.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); };
  const inside = (t, px, pz, pr) => { const dx = px - t.x, dz = pz - t.z, d = Math.hypot(dx, dz);
    if (t.kind === "circle") return d < t.p.r + pr; if (t.kind === "fan") return d < t.p.r + pr && Math.abs(angDiff(Math.atan2(dx, dz), t.rot)) < t.p.a + pr / Math.max(.5, d);
    const fx = Math.sin(t.rot), fz = Math.cos(t.rot), al = dx * fx + dz * fz, sd = Math.abs(dx * fz - dz * fx); return al > -pr && al < t.p.len + pr && sd < t.p.w / 2 + pr; };

  // ── 화면 ──
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function hud(o) {
    const n = document.createElement("div"); n.className = "act";
    const B = (k, t, keys, cls = "") => `<button data-k=${k} class="${cls}" aria-label="${t}"><svg><use href="#a-${k}"/></svg><b>${t}</b><small>${keys}</small><i class=cd></i></button>`;
    n.innerHTML = `<div class=act-boss><header><b>${esc(o.bossName)}</b><small>LV ${o.bossLv ?? ""}</small><em class=rage>분노</em></header><div class=bhp><u></u><i></i></div><div class=bbrk><i></i><small>버팀</small></div><div class=act-parts></div><div class=act-fx>${Object.keys(o.fx || {}).map((k) => `<span data-fx=${k}><i></i><small>${esc(o.fxNames?.[k] || k)}</small></span>`).join("")}</div></div>
<div class=act-me>${o.heroFace ?? ""}<div><b>${esc(o.heroName)}</b><div class=mhp><u></u><i></i></div><div class=mst><i></i></div></div></div>
<i class=act-lock></i><div class=act-call></div><div class=act-dmg></div><div class=act-stick><i></i></div>
<div class=act-btns>${B("heal", "회복", "C", "s")}${B("skill", "스킬", "R", "s")}${B("parry", "패링", "F", "m")}${B("heavy", "강공", "E", "m")}${B("dodge", "회피", "Shift", "m")}${B("atk", "공격", "좌클릭", "l")}</div>
<button class=act-pause data-k=pause aria-label=일시정지>II</button>
<div class=act-card><small>BOSS BATTLE</small><b>${esc(o.bossName)}</b><p>바닥이 <em>붉게 차오르면</em> 공격이 와요. 범위 밖으로 피하거나, 터지는 순간 <em>회피</em>로 굴러요(무적은 아주 짧아요). 휩쓸기·돌진은 <em>패링</em>으로 튕겨 낸 뒤 공격하면 <em>앞잡</em>, 등 뒤에서 공격하면 <em>뒤잡</em>. 공격·회피·패링은 기력을 써요.</p><ul><li><kbd>WASD</kbd>이동</li><li><kbd>좌클릭</kbd>공격</li><li><kbd>E</kbd>강공(누르면 모으기)</li><li><kbd>R</kbd>스킬</li><li><kbd>Shift</kbd>회피</li><li><kbd>F</kbd>패링</li><li><kbd>C</kbd>회복</li></ul><button data-k=go class=main>전투 시작</button></div>
<div class=act-menu hidden><b>일시정지</b><button data-k=resume class=main>계속하기</button><button data-k=giveup>포기하기</button></div>
<div class=act-rot><b>가로로 돌려 주세요</b><small>보스전은 가로 화면에서 해요</small></div>`;
    view.append(n); return n;
  }

  // ── 시작·끝 ──
  function start(o) {
    const H = units.get(o.hero), Bo = units.get(o.boss); if (!H || !Bo || A) return Promise.resolve(null);
    return new Promise((done) => {
      const el = hud(o), bsz = Bo.sz || 1, d = [0, 1, 2][o.diff ?? 1];
      A = { o, el, done, t: 0, on: false, paused: false, hs: 0, slow: 1, turn: 0, tele: [], keys: new Set(), stick: { id: null, x: 0, y: 0 }, stats: { hits: 0, taken: 0, crits: 0, dodges: 0, parries: 0, ripostes: 0, backstabs: 0 },
        dmgK: [1.3, 1.6, 1.95][d], teleK: [1.75, 1.45, 1.25][d], outK: [1.15, 1, .9][d], parryWin: [.24, .17, .12][d], ifrB: C.ifrA + [.26, .18, .12][d], camP: null, camT: null,
        hero: { u: H, x: H.g.position.x, z: H.g.position.z, rot: H.g.rotation.y, hp: o.heroHp, max: o.heroMax, st: C.st, stWait: 0, roll: 0, rdx: 0, rdz: 0, act: null, queue: null, combo: 0, comboT: 0, ifr: 0, flask: C.flask, skillCd: 0, down: 0, gone: false },
        boss: { u: Bo, x: Bo.g.position.x, z: Bo.g.position.z, rot: Bo.g.rotation.y, hp: o.bossHp, max: o.bossMax, r: bsz * .5 + .22, sz: bsz, st: "intro", wait: 1.1, pat: null, chain: 0, brk: 0, brkMax: 6 + bsz * 2, down: 0, open: 0, rage: false, gone: false, last: "", lunge: 0, lean: 0 } };
      { const b = A.boss, h = A.hero, l = Math.hypot(h.x - b.x, h.z - b.z) || 1, dx = (h.x - b.x) / l, dz = (h.z - b.z) / l; let best = null;
        for (let a = 0; a < 16 && !best; a++) for (const s of [1, -1]) { const ang = Math.atan2(dx, dz) + s * a * Math.PI / 8, dd = b.r + 3.6, x = b.x + Math.sin(ang) * dd, z = b.z + Math.cos(ang) * dd; if (free(x, z, .3)) { best = { x, z }; break; } }
        if (best) { h.x = best.x; h.z = best.z; } h.rot = Math.atan2(b.x - h.x, b.z - h.z); b.rot = h.rot + Math.PI; }
      for (const u of [H, Bo]) { u.ghost = { x: u.g.position.x, z: u.g.position.z }; u.act3 = { move: false, rot: u.g.rotation.y, y: u.g.position.y, gone: false }; }
      A.fam = famOf(H.vox); warm(); { const W = { light: [2.4, .44, .04, 1.12, 0], mid: [2.1, .5, 0, 1, 0], heavy: [1.75, .58, -.03, .85, 1] }[o.weight] || [2.1, .5, 0, 1, 0]; A.rollD = W[0]; A.rollT = W[1]; A.ifrB += W[2]; A.regenK = W[3]; A.poise = !!W[4]; }
      A.parts = (o.parts || []).map((p) => ({ ...p })); A.build = {}; A.eff = {}; A.spdK = o.spdK || 1;
      el.querySelector(".act-me b").insertAdjacentHTML("afterend", `<small class=wt>${{ light: "경량", mid: "보통", heavy: "중량" }[o.weight] || ""}</small>`); paintParts();
      view.classList.add("acting"); paint(); bind(el);
    });
  }
  function begin() {
    if (!A || A.on) return; A.on = true; A.el.querySelector(".act-card").remove(); sfx.play("encounter"); call(A.o.bossName, 1.3);
    if (matchMedia("(pointer:coarse)").matches) (async () => { try { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen?.({ navigationUI: "hide" }); if (A) A.fs = true; } await screen.orientation?.lock?.("landscape"); } catch { /* 안 되면 '가로로 돌려 주세요' */ } })();
  }
  function finish(win, quit) {
    if (!A || A.ending) return; A.ending = true; const r = { win, quit: !!quit, heroHp: Math.max(0, Math.round(A.hero.hp)), bossHp: Math.max(0, Math.round(A.boss.hp)), parts: A.parts, secs: Math.round(A.t), ...A.stats };
    for (const t of A.tele) killTele(t); A.tele = [];
    const end = () => { if (!A) return; A.unbind?.(); for (const s of [A.hero, A.boss]) { const u = s.u; u.ghost = null; u.act3 = null; u.lunge = 0; u.hop = 0; u.twist = 0; u.g.userData.body.rotation.x = 0; u.g.userData.body.position.y = 0; u.g.visible = true; } A.el.remove(); view.classList.remove("acting"); try { screen.orientation?.unlock?.(); if (A.fs && document.fullscreenElement) document.exitFullscreen?.(); } catch { /* 무시 */ } const d = A.done; A = null; d(r); };
    if (quit) return end(); A.slow = .3; call(win ? "토벌 성공" : "쓰러졌다", 2.4, win ? "win" : "lose"); sfx.play(win ? "victory" : "defeat"); setTimeout(end, 2400);
  }

  // ── 입력 ──
  const KEYMAP = { j: "atk", " ": "atk", e: "heavy", i: "heavy", k: "dodge", shift: "dodge", f: "parry", o: "parry", r: "skill", u: "skill", c: "heal", h: "heal" };   /* 공격은 좌클릭(아래), 강공 E(누르고 있으면 모으기), 스킬 R */
  function bind(el) {
    const K = (e, on) => { if (!A) return; const k = e.key.toLowerCase(); if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { on ? A.keys.add(k) : A.keys.delete(k); e.preventDefault(); e.stopPropagation(); return; } if (!on || e.repeat) { e.stopPropagation(); return; }
      if (KEYMAP[k]) { act(KEYMAP[k]); e.preventDefault(); } else if (k === "escape") { act(A.paused ? "resume" : "pause"); e.preventDefault(); } else if (k === "enter" && !A.on) act("go"); e.stopPropagation(); };
    const kd = (e) => { const q = e.key.toLowerCase(); if ((q === "e" || q === "i") && A && !e.repeat) { act("heavyDown"); e.preventDefault(); e.stopPropagation(); return; } K(e, true); }, ku = (e) => { const q = e.key.toLowerCase(); if ((q === "e" || q === "i") && A) { act("heavyUp"); e.stopPropagation(); return; } K(e, false); }; addEventListener("keydown", kd, true); addEventListener("keyup", ku, true);
    el.addEventListener("click", (e) => { const k = e.target.closest("[data-k]")?.dataset.k; if (k && !e.target.closest(".act-btns")) act(k); });
    for (const b of el.querySelectorAll(".act-btns [data-k]")) { if (b.dataset.k === "heavy") { const up = () => act("heavyUp"); b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up); b.addEventListener("pointercancel", up); } } for (const b of el.querySelectorAll(".act-btns [data-k]")) b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); act(b.dataset.k === "heavy" ? "heavyDown" : b.dataset.k); b.classList.add("hit"); setTimeout(() => b.classList.remove("hit"), 110); });
    const st = el.querySelector(".act-stick"), knob = st.querySelector("i");
    const sd = (e) => { if (!A?.on || e.pointerType === "mouse" || A.stick.id != null || e.target.closest?.("button")) return; const r = view.getBoundingClientRect(); if (e.clientX - r.left > r.width * .5) return; A.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 }; st.style.transform = `translate(${e.clientX - r.left - 60}px,${e.clientY - r.top - 60}px)`; st.classList.add("on"); };
    const sm = (e) => { const s = A?.stick; if (!s || e.pointerId !== s.id) return; let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const l = Math.hypot(dx, dy), m = 46; if (l > m) { dx *= m / l; dy *= m / l; } s.x = dx / m; s.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; };
    const su = (e) => { const s = A?.stick; if (!s || e.pointerId !== s.id) return; A.stick = { id: null, x: 0, y: 0 }; knob.style.transform = ""; st.classList.remove("on"); };
    const lc = (e) => { if (!A?.on || e.pointerType !== "mouse" || e.button !== 0 || e.target.closest?.("button, .act-card, .act-menu")) return; e.preventDefault(); act("atk"); }, cm = (e) => { if (A?.on) e.preventDefault(); };
    view.addEventListener("pointerdown", lc); view.addEventListener("contextmenu", cm);
    view.addEventListener("pointerdown", sd); addEventListener("pointermove", sm); addEventListener("pointerup", su); addEventListener("pointercancel", su);
    A.unbind = () => { view.removeEventListener("pointerdown", lc); view.removeEventListener("contextmenu", cm); view.removeEventListener("pointerdown", sd); removeEventListener("keydown", kd, true); removeEventListener("keyup", ku, true); removeEventListener("pointermove", sm); removeEventListener("pointerup", su); removeEventListener("pointercancel", su); };
  }
  const spend = (h, n) => { if (h.st < Math.min(n, 8)) return false; h.st -= n; h.stWait = C.regenDelay; return true; };
  function act(k) {
    if (!A) return; const h = A.hero;
    if (k === "go") return begin();
    if (k === "pause" && A.on && !A.ending) { A.paused = true; A.el.querySelector(".act-menu").hidden = false; return; }
    if (k === "resume") { A.paused = false; A.el.querySelector(".act-menu").hidden = true; return; }
    if (k === "giveup") { A.paused = false; A.el.querySelector(".act-menu").hidden = true; return finish(false); }
    if (k === "heavyUp") { A.heavyHeld = false; if (h.act?.charging) releaseCharge(h.act); return; }
    if (k === "heavyDown") { A.heavyHeld = true; }
    if (!A.on || A.paused || A.ending || h.gone || A.cine) return;
    // 행동 중이면 끝무렵에 다음 입력을 받아 둔다(선입력)
    if (k === "dodge" && h.down <= 0 && h.roll <= 0 && h.act?.dodgeOk?.()) { h.act = null; stopAnim(h.u); h.u.twist = 0; return doAct("dodge"); } /* 타격 뒤엔 굴러서 끊는다 */
    const busy = h.down > 0 || (h.roll > 0 && h.roll > C.rollRec) || (h.act && !h.act.cancel());
    if (busy) { if (k === "dodge" || k === "atk" || k === "heavy" || k === "heavyDown") h.queue = { k: k === "heavyDown" ? "heavy" : k, t: A.t }; return; }
    doAct(k);
  }
  // 모은 강공을 놓는다: 모은 만큼 세게, 동작은 다시 빠르게
  function releaseCharge(a) { if (!a.charging) return; a.charging = false; a.chargeK = 1 + Math.min(1, a.chargeT / 1.1) * .8; const v = A.hero.u.vox; if (v) v.p.sp = a.m.sp * 1.25; if (a.chargeK > 1.6) { kick(.3); sfx.play("crit"); } }
  function doAct(k) {
    const h = A.hero; h.queue = null; if (k && typeof k === "object") { if (A.t - k.t > .45) return; k = k.k; }
    if (k === "dodge") { if (!spend(h, C.cost.roll)) return tired(); let { x, z } = moveDir(); if (!x && !z) { x = -Math.sin(h.rot); z = -Math.cos(h.rot); } const l = Math.hypot(x, z) || 1; h.rdx = x / l; h.rdz = z / l; h.roll = A.rollT; h.act = null; stopAnim(h.u); sfx.play("miss"); dust(h.x, h.z); return; }
    if (k === "atk") { const b = A.boss, d = Math.hypot(b.x - h.x, b.z - h.z) - b.r, facing = Math.abs(angDiff(Math.atan2(b.x - h.x, b.z - h.z), h.rot)) < 1.1;
      const can = !(b.critCd > 0);
      if (can && (b.open > 0 || (b.down > 0 && !b.noCrit)) && d < 1.5 && facing) return critical("riposte");
      if (can && b.st !== "tele" && b.down <= 0 && !b.gone && d < 1.3 && Math.abs(angDiff(Math.atan2(h.x - b.x, h.z - b.z), b.rot)) > 2.35) return critical("backstab");
      const F = A.fam, chain = h.comboT > 0 || h.chaining, sp = A.t - (h.rollEnd ?? -9) < .4 ? "roll" : h.runT > .5 ? "dash" : null, len = F?.light.length || 3, idx = sp ? 0 : chain ? (h.combo + 1) % len : 0, mv = F ? (sp ? F[sp] : F.light[idx]) : null;
      if (!spend(h, mv?.cost ?? C.cost.light)) return tired(); h.combo = idx; h.runT = 0; return swing("light", sp); }
    if (k === "heavy" || k === "heavyDown") { if (!spend(h, A.fam?.heavy.cost ?? C.cost.heavy)) return tired(); return swing("heavy", null, k === "heavyDown" && A.heavyHeld); }
    if (k === "skill") { if (h.skillCd > 0) return; h.skillCd = C.skillCd; return swing("skill"); }
    if (k === "parry") { if (!spend(h, C.cost.parry)) return tired(); h.act = { kind: "parry", t: 0, T: C.parryT, cancel: () => false, dodgeOk() { return this.t > .22; } }; const pv = h.u.vox; if (pv && !pv.v.mon) { pv.act = true; try { pv.p.play("block", { fade: .03, speed: 1.8 }); } catch { /* 없는 동작 */ } } else play(h.u, "block"); sfx.play("miss"); return; }
    if (k === "heal") { if (h.flask <= 0) { call("회복약 없음", .7); return; } h.flask--; h.act = { kind: "heal", t: 0, T: C.drinkT, healed: false, cancel: () => false }; play(h.u, "idle2"); sfx.play("heal"); }
  }
  const tired = () => { call("기력 부족", .5); A.el.querySelector(".act-me").classList.add("flash"); setTimeout(() => A?.el.querySelector(".act-me").classList.remove("flash"), 300); };
  const moveDir = () => { const k = A.keys, s = A.stick; let ix = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0) + s.x, iy = (k.has("s") || k.has("arrowdown") ? 1 : 0) - (k.has("w") || k.has("arrowup") ? 1 : 0) + s.y; const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; } if (l < .15) return { x: 0, z: 0, l: 0 };
    const f = cam.getWorldDirection(V3(0, 0, 0)); f.y = 0; f.normalize(); const rx = -f.z, rz = f.x; return { x: rx * ix - f.x * iy, z: rz * ix - f.z * iy, l: Math.min(1, l) }; };

  // ── 모션 도우미 ──
  // ── 무기 계열별 연계(소울류의 흐름) ──
  // n 모션, sp 재생 속도, step 내딛는 거리(칸), side 휘두르는 쪽(+1 오른→왼, -1 왼→오른, 0 찌르기), tw 몸 비틀림, mul 피해, brk 버팀, cost 기력, flow 다음 동작으로 넘어가는 시점(비율), reach 추가 사거리
  const M = (n, sp, step, side, tw, mul, brk, cost, flow = .66, reach = 0) => ({ n, sp, step, side, tw, mul, brk, cost, flow, reach });
  const FAM = {
    sword: { light: [M("slash", .8, .35, 1, .55, 1, 1, 13), M("slash2", .85, .3, -1, .6, 1.05, 1, 13), M("thrust", .7, .7, 0, .2, 1.35, 2, 16, .7, .25)], heavy: M("heavy", .55, .45, 1, .7, 1.9, 3, 26, .8), roll: M("slash2", .9, .55, -1, .5, 1.15, 1, 14), dash: M("thrust", .75, 1.4, 0, .2, 1.5, 2, 20, .8, .3) },
    great: { light: [M("heavy", .55, .55, 1, .75, 1.5, 2, 22, .72), M("spin", .6, .4, -1, 1.1, 1.45, 2, 22, .72, .2), M("heavy", .5, .7, 1, .8, 1.9, 3, 26, .8)], heavy: M("heavy", .42, .6, 1, .9, 2.4, 4, 32, .85), roll: M("spin", .65, .6, -1, 1, 1.5, 2, 22), dash: M("heavy", .55, 1.5, 1, .7, 1.9, 3, 26, .8) },
    dagger: { light: [M("rcut", 1.1, .25, 1, .45, .75, 1, 9, .6), M("rcut2", 1.15, .2, -1, .45, .75, 1, 9, .6), M("rstab", 1, .4, 0, .2, .9, 1, 10, .62), M("rcut", 1.05, .35, 1, .6, 1.1, 1, 11, .7)], heavy: M("rstab", .7, .8, 0, .3, 1.6, 2, 20, .8), roll: M("rstab", 1, .7, 0, .2, 1.1, 1, 10), dash: M("rstab", .9, 1.5, 0, .2, 1.3, 1, 14) },
    spear: { light: [M("thrust", .85, .45, 0, .15, 1, 1, 12), M("thrust", .9, .5, 0, .15, 1.05, 1, 12), M("stab2", .7, .8, 0, .25, 1.35, 2, 16, .72, .3)], heavy: M("spin", .6, .4, 1, 1, 1.7, 3, 24, .8, .3), roll: M("thrust", .9, .7, 0, .15, 1.15, 1, 13), dash: M("stab2", .8, 1.6, 0, .2, 1.6, 2, 18, .8, .4) },
    pole: { light: [M("spin", .7, .35, 1, 1, 1.1, 2, 16, .7, .4), M("slash2", .8, .35, -1, .6, 1.1, 1, 15), M("heavy", .6, .5, 1, .7, 1.5, 3, 20, .78, .3)], heavy: M("heavy", .5, .55, 1, .85, 2, 4, 28, .82, .3), roll: M("spin", .75, .5, 1, .9, 1.2, 2, 16, .7, .4), dash: M("thrust", .8, 1.5, 0, .2, 1.5, 2, 18, .8, .4) },
    blunt: { light: [M("slash", .7, .35, 1, .6, 1.15, 2, 16, .7), M("heavy", .6, .45, 1, .8, 1.55, 3, 22, .78)], heavy: M("heavy", .45, .5, 1, .95, 2.2, 5, 30, .85), roll: M("slash", .8, .55, 1, .6, 1.2, 2, 16), dash: M("heavy", .6, 1.3, 1, .8, 1.7, 3, 22, .8) },
    fist: { light: [M("punch", 1.2, .3, 1, .4, .7, 1, 8, .55), M("punch", 1.25, .3, -1, .4, .7, 1, 8, .55), M("slash2", 1.05, .35, 1, .6, .85, 1, 10, .6), M("spin", .9, .45, -1, 1, 1.15, 2, 12, .7)], heavy: M("punch", .6, .8, 0, .5, 1.6, 3, 20, .8), roll: M("punch", 1.1, .7, 1, .4, .9, 1, 9), dash: M("punch", 1, 1.5, 0, .4, 1.2, 2, 14) },
    dual: { light: [M("dual", .95, .3, 1, .5, .9, 1, 12, .62), M("cross", .95, .3, -1, .6, .95, 1, 12, .62), M("akimbo", .85, .5, 1, .8, 1.25, 2, 15, .7)], heavy: M("spin", .65, .5, 1, 1, 1.7, 3, 24, .8), roll: M("cross", 1, .6, -1, .5, 1.05, 1, 12), dash: M("dual", .9, 1.4, 1, .5, 1.3, 2, 16) },
    whip: { light: [M("lash", .85, .15, 1, .5, 1, 1, 12, .66, 1.4), M("lash2", .85, .15, -1, .5, 1.05, 1, 12, .66, 1.4)], heavy: M("lash", .55, .2, 1, .8, 1.7, 2, 22, .8, 1.6), roll: M("lash2", .9, .3, -1, .5, 1.1, 1, 12, .66, 1.4), dash: M("lash", .8, .6, 1, .5, 1.3, 1, 14, .7, 1.4) },
    magic: { light: [M("cast", .85, 0, 0, .2, 1, 1, 14, .7), M("cast", .9, 0, 0, .2, 1.05, 1, 14, .7)], heavy: M("cast", .5, 0, 0, .3, 1.9, 2, 26, .82), roll: M("cast", .9, .2, 0, .2, 1.1, 1, 14), dash: M("cast", .85, .3, 0, .2, 1.2, 1, 16) },
    bow: { light: [M("bow", .8, -.1, 0, .1, 1, 1, 12, .72)], heavy: M("bow", .45, -.15, 0, .15, 2, 2, 24, .85), roll: M("bow", .9, 0, 0, .1, 1.1, 1, 12), dash: M("bow", .85, 0, 0, .1, 1.1, 1, 12) },
    gun: { light: [M("shoot", .9, -.05, 0, .1, 1, 1, 12, .7)], heavy: M("shoot", .5, -.1, 0, .1, 1.9, 2, 24, .85), roll: M("shoot", .95, 0, 0, .1, 1.1, 1, 12), dash: M("shoot", .9, 0, 0, .1, 1.1, 1, 12) } };
  const GEARFAM = { sword: "sword", long: "sword", broad: "sword", gladius: "sword", katana: "sword", beam: "sword", thin: "sword", curve: "sword", sickle: "sword", torch: "sword", wakizashi: "dagger", kukri: "dagger", fan: "dagger", chakram: "dagger", shuriken: "dagger", dagger: "dagger", rdagger: "dagger", sai: "dagger",
    nodachi: "great", great: "great", flam: "great", battle: "great", lance: "spear", spear: "spear", trident: "spear", halberd: "pole", glaive: "pole", pole: "pole", scythe: "pole",
    axe: "blunt", hatchet: "blunt", pick: "blunt", hammer: "blunt", warham: "blunt", mace: "blunt", morning: "blunt", flail: "blunt", club: "blunt", katar: "fist", tonfa: "fist", nunchaku: "fist", claw: "fist", fist: "fist",
    whip: "whip", bow: "bow", longbow: "bow", crossbow: "gun", pistol: "gun", flint: "gun", smg: "gun", shotgun: "gun", rifle: "gun", sniper: "gun", staff: "magic", crook: "magic", wand: "magic", scepter: "magic", book: "magic", orb: "magic", charm: "magic", lute: "magic" };
  function famOf(v) { if (!v || v.v.mon) return null; const g = v.o.gear, f = FAM[(v.o.off && v.o.off === g) ? "dual" : GEARFAM[g] || "sword"], ok = (n) => { try { return !!vox.timing(v, n); } catch { return false; } }, fb = ["slash", "slash2", "thrust"].find(ok) || "slash", fix = (m) => (ok(m.n) ? m : { ...m, n: fb });
    return { light: f.light.map(fix), heavy: fix(f.heavy), roll: fix(f.roll), dash: fix(f.dash) }; }
  const ez = (x) => x * x * (3 - 2 * x);
  function play(u, n) { const v = u.vox; if (!v) return 0; let nm = n; if (v.v.mon) { if (!v.p.has?.(n)) nm = vox.pick(v, 1, A.turn++); } else if (n === "block" || n === "idle2" || n === "hurt") nm = n; v.act = true; try { const r = v.p.play(nm, { fade: .05 }); Promise.resolve(r).then(() => { if (v.act && A && (!A.hero.act || A.hero.u !== u)) v.act = false; }); } catch { v.act = false; } try { return vox.timing(v, nm); } catch { return null; } }
  const stopAnim = (u) => { if (u.vox) u.vox.act = false; };
  function swing(kind, special, charge) {
    const h = A.hero, b = A.boss, u = h.u.vox, F = A.fam; let m;
    if (kind === "skill") m = M("spin", .6, .5, 1, 1.2, 2.4, 4, 0, .85, .8);
    else if (!F) m = M(null, .8, .3, 1, .5, kind === "heavy" ? 1.85 : 1, kind === "heavy" ? 3 : 1, 0);
    else m = special ? F[special] : kind === "heavy" ? F.heavy : F.light[h.combo % F.light.length];
    h.rot = Math.atan2(b.x - h.x, b.z - h.z); let T = { d: .55, hit: .24 };
    if (u) { let n = m.n; if (u.v.mon || !n) n = vox.pick(u, 1, A.turn++); const sp = m.sp * (A.spdK || 1); u.act = true; u.p.play(n, { fade: .08, speed: sp }); try { const q = vox.timing(u, n); T = { d: q.d / sp, hit: q.hit / sp }; } catch { /* 기본 */ } }
    else T = { d: .55 / m.sp, hit: .24 / m.sp };
    h.act = { kind, special, m, t: 0, T: T.d, hitAt: T.hit, hit: false, tw0: h.twEnd || 0, charging: !!charge, chargeT: 0, chargeK: 1, cancel() { return !this.charging && this.t > this.T * this.m.flow; }, dodgeOk() { return this.charging || this.t < this.hitAt * .35 || this.t > this.hitAt + .04; } }; h.comboT = 0;
    if (kind === "skill") { call(A.o.skillName || "스킬", .8, "good"); vfx.column?.(V3(h.x, gy(h.x, h.z), h.z), vfx.pal(A.o.heroElem || "none"), .5, 2.2, .5); }
  }
  function strike(a) {
    const h = A.hero, b = A.boss, m = a.m, kind = a.kind, gap = Math.hypot(b.x - h.x, b.z - h.z) - b.r, reach = (A.o.heroReach ?? 1.15) + (m.reach || 0) + (kind === "skill" ? .8 : 0), face = Math.abs(angDiff(Math.atan2(b.x - h.x, b.z - h.z), h.rot)) < (kind === "skill" || Math.abs(m.side) * m.tw > .9 ? 3.2 : 1.05);
    if (gap > reach || !face || b.gone) { sfx.play("miss"); return; }
    const mul = m.mul * (a.chargeK || 1), crit = Math.random() * 100 < (A.o.heroCrit ?? 0), base = kind === "skill" && A.o.skillDmg ? A.o.skillDmg : (A.o.heroDmg ?? 5) * mul, dmg = Math.max(1, Math.round(base * A.outK * (crit ? 2 : 1) * (b.down > 0 ? 1.4 : 1) * (A.eff.shred > 0 ? 1.2 : 1)));
    const part = pickPart(a); hitBoss(dmg, crit ? "crit" : mul >= 1.3 ? "big" : "", Math.round(m.brk * (a.chargeK || 1))); if (part && !b.gone) hitPart(part, dmg); if (!b.gone) buildFx(mul);
  }
  // ── 부위: 정면=머리, 등 뒤=꼬리, 옆=날개·다리, 구르기 공격=다리. 무기 결(베기·타격·찌르기) 상성이 곱해진다 ──
  function pickPart(a) { const ps = A.parts; if (!ps.length) return null; const b = A.boss, h = A.hero, rel = Math.abs(angDiff(Math.atan2(h.x - b.x, h.z - b.z), b.rot)), has = (k) => ps.find((p) => p.k === k && !p.broken);
    const want = a.special === "roll" ? "legs" : rel < .8 ? "head" : rel > 2.3 ? "tail" : A.turn % 2 ? "wings" : "legs"; return has(want) || has("legs") || has("head") || ps.find((p) => !p.broken) || null; }
  function hitPart(p, dmg) { p.hp -= dmg * (A.o.cutMul?.[p.k] || 1); paintParts(); if (p.hp > 0 || p.broken) return; p.hp = 0; p.broken = true; const b = A.boss;
    call(p.name + " 파괴", 1.1, "crit"); sfx.play("break"); kick(.7); A.hs = .15; vfx.emit(V3(b.x, gy(b.x, b.z) + .8 + b.sz * .3, b.z), { n: 50, pal: [0xffe0b0, 0xffffff, 0xc89a6a], speed: 6, up: .4, g: 7, life: .6, size: .2 });
    if (p.k === "head") { b.down = Math.max(b.down, 1.8); cancelPat(); play(b.u, "hurt"); } else if (p.k === "legs") { A.eff.legs = 99; b.down = Math.max(b.down, 1.2); cancelPat(); } paintParts(); }
  function paintParts() { const el = A?.el.querySelector(".act-parts"); if (!el) return; el.innerHTML = A.parts.map((p) => `<span class="${p.broken ? "broke" : ""}"><small>${esc(p.name)}</small><i style="width:${Math.max(0, p.hp / p.max * 100)}%"></i></span>`).join(""); }
  // ── 부가 효과 축적: 맞힐 때마다 차고, 가득 차면 터진다 ──
  function buildFx(mul) { for (const [k, r] of Object.entries(A.o.fx || {})) { A.build[k] = Math.min(100, (A.build[k] || 0) + r * 1.15 * mul); if (A.build[k] >= 100) { A.build[k] = 0; procFx(k); } } }
  function procFx(k) { const b = A.boss, n = A.o.fxNames?.[k] || k, at = V3(b.x, gy(b.x, b.z) + .8 + b.sz * .3, b.z), pal = { bleed: [0xd02020, 0xff6a5a], poison: [0x8ad04a, 0x4a8a2a], burn: [0xff7a2a, 0xffd06a], freeze: [0xbfe8ff, 0xffffff] }[k] || [0xe0d0ff, 0xffffff];
    vfx.emit(at, { n: 40, pal, speed: 5, up: .4, g: 5, life: .6, size: .18 }); call(n, .9, "warn"); sfx.play(k === "bleed" ? "crit" : "status");
    if (k === "bleed") hitBoss(Math.round(b.max * .1), "big", 2);
    else if (k === "poison") A.eff.poison = 8; else if (k === "burn") A.eff.burn = 5;
    else if (k === "freeze" || k === "stun") { b.down = Math.max(b.down, k === "freeze" ? 1.6 : 1.2); cancelPat(); }
    else A.eff[k] = 8; }
  function hitBoss(dmg, cls, brk) {
    const h = A.hero, b = A.boss; b.hp -= dmg; A.stats.hits++; if (cls === "crit") A.stats.crits++; A.hs = cls === "riposte" ? .2 : cls === "crit" || cls === "big" ? .11 : .05; kick(cls === "riposte" ? .9 : cls ? .45 : .18);
    const at = V3(b.x - Math.sin(h.rot) * b.r * .6, gy(b.x, b.z) + .6 + b.sz * .25, b.z - Math.cos(h.rot) * b.r * .6), gold = cls && cls !== "";
    vfx.emit(at, { n: gold ? 44 : 16, pal: gold ? [0xffd27a, 0xffffff, 0xff9a3a] : [0xfff0d8, 0xffffff, 0xffc890], speed: gold ? 6.5 : 4, up: .3, g: 6, life: .45, size: gold ? .2 : .13 }); vfx.ring(at, gold ? 0xffd27a : 0xfff0d8, gold ? 1.7 : .9, .28, false);
    sfx.play(cls === "riposte" || cls === "crit" ? "crit" : A.o.heroSfx || "slash"); pop(at, dmg, cls); b.flinch = .18;
    if (b.down <= 0 && b.open <= 0) { b.brk += brk; if (b.brk >= b.brkMax) { b.brk = 0; b.down = 2.6; cancelPat(); call("다운!", 1); sfx.play("break"); kick(.6); play(b.u, "hurt"); } }
    if (b.hp <= 0) { b.hp = 0; b.gone = true; b.u.act3.gone = true; cancelPat(); finish(true); }
  }
  // 앞잡·뒤잡: 잠깐 느려지고, 크게 들어간다
  function critical(kind) {
    const h = A.hero, b = A.boss; h.rot = Math.atan2(b.x - h.x, b.z - h.z); cancelPat(); b.open = 0; b.down = Math.max(b.down, 1.4); b.noCrit = true; b.critCd = 4;
    h.act = { kind: "crit", t: 0, T: 99, cancel: () => false }; A.cine = { t: 0, kind, hit: false }; A.stats[kind === "backstab" ? "backstabs" : "ripostes"]++;
    const v = h.u.vox; if (v && !v.v.mon) { const n = kind === "backstab" ? "thrust" : "heavy"; v.act = true; try { v.p.play(n, { fade: .12, speed: .32 }); } catch { /* 없는 동작 */ } }
    play(b.u, "hurt"); sfx.play("telegraph");
  }
  // 치명 일격 진행: 느려진 채 천천히 끌어당겨 모았다가(0.7초) 단숨에 내지른다
  function cineTick(raw) {
    const c = A.cine, h = A.hero, b = A.boss; c.t += raw; const pull = Math.min(1, c.t / .7), ez = pull * pull * (3 - 2 * pull);
    if (!c.hit) { A.slow = .45; h.u.lunge = -.38 * ez; h.lean = -.2 * ez; b.flinch = .2; if (c.t >= .7) { c.hit = true; c.hitAt = c.t; h.u.lunge = .75; h.lean = .15; const v = h.u.vox; if (v && !v.v.mon) try { v.p.speed = 1.6; v.p.sp = 1.6; } catch { /* 무시 */ }
        hitBoss(Math.round((A.o.heroDmg ?? 5) * (c.kind === "backstab" ? 4.2 : 3.6)), "riposte", 0); A.hs = .22; kick(1); play(b.u, "hurt"); b.lunge = -.5; } }
    else { const k = c.t - c.hitAt; A.slow = k < .25 ? .25 : Math.min(1, .25 + (k - .25) * 2.5); h.lean *= .9; if (k > .6) { A.cine = null; A.slow = 1; h.lean = 0; if (h.act?.kind === "crit") { h.act = null; stopAnim(h.u); } } }
  }


  // ── 보스 ──
  const PATS = (b) => { const big = b.sz >= 2, l = [
    { k: "fan", n: "휩쓸기", w: 4, t: .7, r: 1.8 + b.r, a: .95, mul: 1, parry: true, track: .5 },
    { k: "circle", n: "내려찍기", w: 3, t: .82, r: 1.35 + b.sz * .35, mul: 1.3, on: "hero", track: .45 },
    { k: "line", n: "돌진", w: 3, t: .62, len: 6.5, ww: .9 + b.sz * .5, mul: 1.2, dash: true, parry: true, track: .55 },
    { k: "fan", n: "되받아치기", w: A.parts.find((q) => q.k === "tail" && q.broken) ? 0 : 2, t: .55, r: 1.4 + b.r, a: 1.3, mul: .8, parry: true, track: .3, quick: true }];
    if (big && !(A.eff.silence > 0) && !A.parts.find((q) => q.k === "wings" && q.broken)) l.push({ k: "fan", n: A.o.breath || "브레스", w: 2, t: 1.05, r: 5.4, a: .42, mul: 1.55, breath: true, track: .6 }, { k: "circle", n: "충격파", w: 1, t: .95, r: 2.6 + b.r, mul: 1.15, self: true, track: 0 });
    return l; };
  function choose(chain) {
    const b = A.boss, h = A.hero, d = Math.hypot(h.x - b.x, h.z - b.z) - b.r;
    const l = PATS(b).filter((p) => (p.quick ? chain || d < 1.6 : p.k === "fan" && !p.breath ? d < 2.8 : p.dash ? d > 1.4 : true) && (p.n !== b.last || chain)); let s = l.reduce((q, p) => q + p.w, 0) * Math.random(); const p = l.find((q) => (s -= q.w) < 0) ?? l[0];
    b.last = p.n; const rot = Math.atan2(h.x - b.x, h.z - b.z); b.rot = rot; const cx = p.on === "hero" ? h.x : b.x, cz = p.on === "hero" ? h.z : b.z;
    const t = p.k === "circle" ? tele("circle", cx, cz, 0, { r: p.r }) : p.k === "fan" ? tele("fan", b.x, b.z, rot, { r: p.r, a: p.a }) : tele("line", b.x, b.z, rot, { len: p.len, w: p.ww });
    b.pat = { p, t, time: 0, T: p.t * A.teleK * (b.rage ? .85 : 1) * (chain ? .9 : 1) * (A.eff.blind > 0 ? 1.25 : 1) }; A.tele.push(t); b.st = "tele"; sfx.play("telegraph"); if (p.mul >= 1.3 || p.breath) call(p.n, .8, "warn");
  }
  function cancelPat() { const b = A.boss; if (b.pat) { killTele(b.pat.t); A.tele = A.tele.filter((x) => x !== b.pat.t); b.pat = null; } b.st = "chase"; b.wait = .5; b.chain = 0; b.lean = 0; }
  function release() {
    const b = A.boss, h = A.hero, { p, t } = b.pat; play(b.u, "atk"); b.lunge = .6; b.lean = 0;
    t.fill.material.color.setHex(0xffffff); t.fill.material.opacity = .95; setTimeout(() => { killTele(t); if (A) A.tele = A.tele.filter((x) => x !== t); }, 130);
    if (p.dash) { const len = p.len - b.r, fx = Math.sin(t.rot), fz = Math.cos(t.rot); let k = 0; const step = () => { if (!A) return; const nx = b.x + fx * .5, nz = b.z + fz * .5; if (k < len / .5 && tileOK(nx, nz)) { b.x = nx; b.z = nz; k++; const hh = A.hero, dd = Math.hypot(hh.x - b.x, hh.z - b.z); if (dd < b.r + .3) { const sx = -fz, sz = fx, sgn = (hh.x - b.x) * sx + (hh.z - b.z) * sz >= 0 ? 1 : -1, px = hh.x + sx * sgn * (b.r + .35 - dd), pz = hh.z + sz * sgn * (b.r + .35 - dd); if (tileOK(px, pz)) { hh.x = px; hh.z = pz; } } requestAnimationFrame(step); } }; step(); }
    const at = p.k === "circle" ? V3(t.x, gy(t.x, t.z) + .2, t.z) : V3(b.x + Math.sin(t.rot) * 1.4, gy(b.x, b.z) + .4, b.z + Math.cos(t.rot) * 1.4);
    vfx.emit(at, { n: p.breath ? 60 : 30, pal: p.breath ? vfx.pal(A.o.bossElem || "fire") : [0xff6a4a, 0xffd0a0, 0xffffff], speed: p.breath ? 7 : 5, up: .4, g: 5, life: .6, size: .22 }); vfx.ring(at, 0xff6a4a, p.k === "circle" ? p.r * 1.2 : 1.6, .35, false); kick(p.breath ? .7 : .45); sfx.play(p.breath ? "boom" : "blunt");
    const hitMe = !h.gone && inside(t, h.x, h.z, C.hitR), iframe = h.roll > 0 && (A.rollT - h.roll) > C.ifrA && (A.rollT - h.roll) < A.ifrB;
    const parried = hitMe && p.parry && h.act?.kind === "parry" && h.act.t < A.parryWin && Math.abs(angDiff(Math.atan2(b.x - h.x, b.z - h.z), h.rot)) < 1.25;
    if (parried) { A.stats.parries++; b.open = 1.9; b.lunge = -.45; cancelPat(); b.st = "open"; play(b.u, "hurt"); sfx.play("block"); sfx.play("crit"); kick(.65); A.hs = .2; h.act.hitOk = true; h.u.lunge = .22; h.u.twist = .35;
      const cx = h.x + (b.x - h.x) * .45, cz = h.z + (b.z - h.z) * .45, at = V3(cx, gy(cx, cz) + .9, cz);
      vfx.emit(at, { n: 70, pal: [0xff2a2a, 0xff7a3a, 0xffd0a0, 0xffffff], speed: 7.5, up: .35, g: 7, life: .5, size: .17 }); vfx.ring(at, 0xff2a2a, 2.4, .32, false); vfx.ring(at, 0xffffff, 1.1, .18, false);
      A.el.classList.remove("parryfx"); void A.el.offsetWidth; A.el.classList.add("parryfx"); return; }
    if (hitMe && !iframe && h.ifr <= 0) hurtHero(Math.max(Math.round(h.max * .1), Math.round((A.o.bossDmg ?? 6) * p.mul * A.dmgK * (A.eff.weaken > 0 ? .8 : 1) * (A.poise ? .9 : 1))), t, (p.mul >= 1.3 || p.breath) && !(A.poise && p.mul < 1.5));
    else if (hitMe && iframe) { A.stats.dodges++; call("회피!", .5, "good"); }
    b.pat = null; const more = !b.gone && b.chain < (b.rage ? 2 : 1) && Math.random() < (b.rage ? .5 : .32);
    if (more) { b.chain++; b.st = "gap"; b.wait = .5; } else { b.chain = 0; b.st = "recover"; b.wait = (b.rage ? .7 : 1) + Math.random() * .4; }
  }
  function hurtHero(dmg, t, big) {
    const h = A.hero; h.hp -= dmg; A.stats.taken += dmg; h.ifr = .5; h.act = null; h.queue = null; h.roll = 0; stopAnim(h.u); play(h.u, "hurt"); kick(big ? .8 : .5); A.hs = big ? .14 : .08; sfx.play("blunt");
    if (big) h.down = .85; const kx = h.x - t.x, kz = h.z - t.z, l = Math.hypot(kx, kz) || 1, kb = big ? 10 : 5; for (let i = 0; i < kb; i++) { const nx = h.x + kx / l * .12, nz = h.z + kz / l * .12; if (free(nx, nz, .28)) { h.x = nx; h.z = nz; } }
    pop(V3(h.x, gy(h.x, h.z) + 1.3, h.z), dmg, "hurt"); A.el.classList.remove("ouch"); void A.el.offsetWidth; A.el.classList.add("ouch");
    if (h.hp <= 0) { h.hp = 0; h.gone = true; h.u.act3.gone = true; finish(false); }
  }

  // ── 표시 ──
  const dust = (x, z) => vfx.emit(V3(x, gy(x, z) + .1, z), { n: 10, pal: [0xd8c8a8, 0xbfae8a, 0xffffff], speed: 1.6, up: .2, g: 3, life: .45, size: .14 });
  function pop(at, v, cls) { const p = at.clone().project(cam), r = view.getBoundingClientRect(), n = document.createElement("i"); n.className = "afl " + (cls || ""); n.textContent = v; n.style.left = ((p.x + 1) / 2 * r.width) + "px"; n.style.top = ((1 - p.y) / 2 * r.height) + "px"; A.el.querySelector(".act-dmg").append(n); setTimeout(() => n.remove(), 900); }
  function call(text, secs, cls = "") { if (!A) return; const c = A.el.querySelector(".act-call"); c.className = "act-call on " + cls; c.textContent = text; clearTimeout(A.callT); A.callT = setTimeout(() => { if (A) c.className = "act-call"; }, secs * 1000); }
  let last = "";
  function paint() { if (!A) return; const h = A.hero, b = A.boss, el = A.el, k = [Object.values(A.build).map(Math.round).join("/"), Math.round(b.hp), Math.round(h.hp), Math.round(h.st / 2), b.brk, b.down > 0, b.open > 0, b.rage, h.flask, Math.ceil(h.skillCd * 4), h.act?.charging ? Math.round(h.act.chargeT * 10) : -1].join(); if (k === last) return; last = k; const hv = el.querySelector("[data-k=heavy]"); hv.style.setProperty("--ch", h.act?.charging ? Math.min(1, h.act.chargeT / 1.1) : 0); hv.classList.toggle("charging", !!h.act?.charging);
    const S = (q, v) => { el.querySelector(q).style.transform = `scaleX(${Math.max(0, v)})`; };
    for (const s2 of el.querySelectorAll(".act-fx [data-fx]")) s2.querySelector("i").style.transform = `scaleX(${(A.build[s2.dataset.fx] || 0) / 100})`;
    S(".bhp i", b.hp / b.max); S(".mhp i", h.hp / h.max); S(".mst i", h.st / C.st); S(".bbrk i", b.down > 0 ? 1 : b.brk / b.brkMax);
    const bb = el.querySelector(".act-boss"); bb.classList.toggle("down", b.down > 0 || b.open > 0); bb.classList.toggle("raging", b.rage); el.querySelector(".act-me").classList.toggle("low", h.hp / h.max < .3); el.querySelector(".act-me").classList.toggle("tired", h.st < C.cost.roll);
    const cost = { atk: A.fam?.light[0].cost ?? C.cost.light, heavy: A.fam?.heavy.cost ?? C.cost.heavy, dodge: C.cost.roll, parry: C.cost.parry }; for (const [k2, c2] of Object.entries(cost)) el.querySelector(`[data-k=${k2}]`)?.classList.toggle("nost", h.st < c2);
    const sk0 = el.querySelector("[data-k=skill]"); sk0.dataset.s = h.skillCd > 0 ? Math.ceil(h.skillCd) : "";
    const hb = el.querySelector("[data-k=heal]"); hb.dataset.n = h.flask; hb.classList.toggle("off", h.flask <= 0); const sk = el.querySelector("[data-k=skill]"); sk.style.setProperty("--cd", h.skillCd / C.skillCd); sk.classList.toggle("off", h.skillCd > 0);
    clearTimeout(A.lagT); A.lagT = setTimeout(() => { if (!A) return; el.querySelector(".bhp u").style.transform = `scaleX(${A.boss.hp / A.boss.max})`; el.querySelector(".mhp u").style.transform = `scaleX(${A.hero.hp / A.hero.max})`; }, 380); }

  // ── 매 프레임 ──
  const portrait = matchMedia("(orientation:portrait) and (pointer:coarse)"), tmp = V3(0, 0, 0);
  // 한 프레임에서 오류가 나도 화면은 계속 그린다: 꼬인 상태만 정리하고 넘어간다(같은 오류가 매 프레임 반복돼 멈추던 문제)
  let errN = 0;
  function tick(raw) { if (!A) return false; try { return tick0(raw); } catch (e) { if (errN++ < 5) console.error("[Dusk Soul] 프레임 오류", e); recover(); return true; } }
  function recover() { if (!A) return; try { cancelPat(); } catch { /* 무시 */ } const h = A.hero; h.act = null; h.queue = null; h.roll = 0; A.hs = 0; A.slow = 1; A.cine = null; stopAnim(h.u); }
  // 처음 쓰는 예고·이펙트의 셰이더를 시작 전에 화면 밖에서 한 번 만든다(첫 사용 때 멈칫하지 않게)
  function warm() { const x = A.boss.x, z = A.boss.z, ts = [tele("circle", x, z, 0, { r: 1 }), tele("fan", x, z, 0, { r: 1, a: .5 }), tele("line", x, z, 0, { len: 1, w: 1 })]; for (const q of ts) { q.g.position.y = -40; setProg(q, .5); } const at = V3(x, -40, z); try { vfx.emit(at, { n: 2, pal: vfx.pal(A.o.bossElem || "fire"), speed: .1, life: .05, size: .1 }); vfx.emit(at, { n: 2, pal: [0xff6a4a, 0xffffff], speed: .1, life: .05, size: .1 }); vfx.ring(at, 0xff6a4a, 1, .05, false); vfx.column?.(at, vfx.pal(A.o.heroElem || "none"), .1, .1, .05); } catch { /* 없는 효과 */ } setTimeout(() => ts.forEach(killTele), 400); }
  function tick0(raw) {
    if (!A) return false; const h = A.hero, b = A.boss; let dt = Math.min(.05, raw);
    if (portrait.matches && A.on) { A.el.classList.add("rot"); dt = 0; } else A.el.classList.remove("rot");
    if (A.cine && !A.paused && !A.ending) cineTick(raw);
    if (A.paused || !A.on) dt = 0; if (A.hs > 0) { A.hs -= raw; dt *= .04; } dt *= A.slow; A.t += dt;
    // 나
    if (!h.gone && dt) {
      h.ifr = Math.max(0, h.ifr - dt); h.skillCd = Math.max(0, h.skillCd - dt); h.comboT = Math.max(0, h.comboT - dt); h.stWait -= dt; if (h.stWait <= 0 && !h.act && h.roll <= 0) h.st = Math.min(C.st, h.st + C.regen * A.regenK * dt); else if (h.stWait <= 0) h.st = Math.min(C.st, h.st + C.regen * .35 * dt);
      let moving = false;
      if (h.down > 0) { h.down -= dt; }
      else if (h.roll > 0) { const p = 1 - h.roll / A.rollT, s = A.rollD / A.rollT * dt * (p < .75 ? 1.25 : .35); h.roll -= dt; if (free(h.x + h.rdx * s, h.z, .28)) h.x += h.rdx * s; if (free(h.x, h.z + h.rdz * s, .28)) h.z += h.rdz * s; h.rot += angDiff(Math.atan2(h.rdx, h.rdz), h.rot) * Math.min(1, dt * 20); if (h.roll <= 0) { h.rollEnd = A.t; h.twEnd = 0; if (h.queue) doAct(h.queue); } }
      else if (h.act) { const a = h.act; a.t += dt;
        if (a.m) { const m = a.m, v = h.u.vox;
          if (a.charging) { a.chargeT += dt; if (a.t > a.hitAt * .7) { a.t = a.hitAt * .7; if (v) v.p.sp = .03; } if (Math.random() < .5) vfx.emit(V3(h.x, gy(h.x, h.z) + .9, h.z), { n: 2, pal: a.chargeT > 1 ? [0xfff0c8, 0xffffff] : [0xd8c8a8, 0xffffff], speed: 1.2, up: .6, g: -1, life: .35, size: .1 }); if (a.chargeT >= 1.4) releaseCharge(a); }
          h.rot += angDiff(Math.atan2(b.x - h.x, b.z - h.z), h.rot) * Math.min(1, dt * (a.t < a.hitAt ? 8 : 2));
          const H = a.hitAt + .05; if (a.t <= H && m.step) { const p0 = Math.max(0, Math.min(1, (a.t - dt) / H)), p1 = Math.min(1, a.t / H), ds = (ez(p1) - ez(p0)) * m.step * (h.act.charging ? 0 : 1), gap = Math.hypot(b.x - h.x, b.z - h.z) - b.r; if (ds < 0 || gap > .5) { const fx = Math.sin(h.rot), fz = Math.cos(h.rot); if (free(h.x + fx * ds, h.z, .28)) h.x += fx * ds; if (free(h.x, h.z + fz * ds, .28)) h.z += fz * ds; } }
          const wind = -m.side * m.tw, thru = m.side * m.tw * .85; let tw; if (a.t < a.hitAt) tw = a.tw0 + (wind - a.tw0) * ez(Math.min(1, a.t / a.hitAt)); else { const q = Math.min(1, (a.t - a.hitAt) / .14); tw = wind + (thru - wind) * (1 - (1 - q) ** 3); if (q >= 1) tw = thru * (1 - .65 * Math.min(1, (a.t - a.hitAt - .14) / Math.max(.1, a.T * .5))); }
          h.u.twist = tw; h.twEnd = tw; h.lean = a.t < a.hitAt ? -.13 * ez(Math.min(1, a.t / a.hitAt)) : .17 * Math.max(0, 1 - (a.t - a.hitAt) / .3);
          if (!a.hit && a.t >= a.hitAt) { a.hit = true; strike(a); } }
        if (a.kind === "parry") { const q = Math.min(1, a.t / .2); h.u.twist = -.6 * Math.sin(q * Math.PI) * (1 - Math.min(1, Math.max(0, a.t - .2) / .2)); if (!a.hitOk) h.u.lunge = .1 * Math.sin(q * Math.PI); }
        if (a.kind === "heal") { const m = moveDir(); if (m.l) { const s = 1.1 * dt; if (free(h.x + m.x * s, h.z, .28)) h.x += m.x * s; if (free(h.x, h.z + m.z * s, .28)) h.z += m.z * s; moving = true; } if (!a.healed && a.t > .7) { a.healed = true; const v = Math.round(h.max * C.flaskHeal); h.hp = Math.min(h.max, h.hp + v); pop(V3(h.x, gy(h.x, h.z) + 1.4, h.z), "+" + v, "heal"); vfx.emit(V3(h.x, gy(h.x, h.z) + .6, h.z), { n: 24, pal: [0x8cffb0, 0xffffff, 0x3fdc7a], speed: 1.5, up: 1.2, g: -1, life: .8, size: .14 }); } }
        if (a.t >= a.T) { const was = a.kind; h.act = null; stopAnim(h.u); if (was === "light") h.comboT = .38; if (h.queue) { h.chaining = was === "light" && h.queue.k === "atk"; doAct(h.queue); h.chaining = false; } }
        else if (a.cancel() && h.queue) { const q = h.queue; h.act = null; h.chaining = a.kind === "light" && q.k === "atk"; doAct(q); h.chaining = false; } }
      else { h.u.twist *= Math.max(0, 1 - dt * 7); h.twEnd = h.u.twist; h.lean = (h.lean || 0) * Math.max(0, 1 - dt * 8); const m = moveDir(); h.runT = m.l > .7 && Math.abs(angDiff(Math.atan2(m.x, m.z), Math.atan2(b.x - h.x, b.z - h.z))) < .5 ? (h.runT || 0) + dt : 0; if (m.l) { const toB = Math.atan2(b.x - h.x, b.z - h.z), mv = Math.atan2(m.x, m.z), back = Math.abs(angDiff(mv, toB)) > 2.2, spd = (back ? C.strafe * .9 : Math.abs(angDiff(mv, toB)) > .7 ? C.strafe : C.spd) * m.l * dt; if (free(h.x + m.x * spd, h.z, .28)) h.x += m.x * spd; if (free(h.x, h.z + m.z * spd, .28)) h.z += m.z * spd; moving = true; }
        h.rot += angDiff(Math.atan2(b.x - h.x, b.z - h.z), h.rot) * Math.min(1, dt * 10); }
      h.u.act3.move = moving && !h.act;
    }
    // 보스
    if (!b.gone && dt) {
      b.lunge += (0 - b.lunge) * Math.min(1, dt * 6); b.flinch = Math.max(0, (b.flinch || 0) - dt);
      for (const k in A.eff) { A.eff[k] -= dt; if (A.eff[k] <= 0) delete A.eff[k]; } if (A.eff.poison > 0) b.hp -= b.max * .012 * dt; if (A.eff.burn > 0) b.hp -= b.max * .02 * dt; if ((A.eff.poison > 0 || A.eff.burn > 0) && b.hp <= 0) { b.hp = 0; b.gone = true; b.u.act3.gone = true; cancelPat(); finish(true); }
      if (!b.rage && b.hp <= b.max / 2) { b.rage = true; call("분노!", 1.1, "warn"); sfx.play("roar"); kick(.5); }
      b.critCd = Math.max(0, (b.critCd || 0) - dt);
      if (b.down > 0) { b.down -= dt; b.u.act3.move = false; if (b.down <= 0) { b.noCrit = false; b.st = "chase"; b.wait = .3; } }
      else if (b.open > 0) { b.open -= dt; b.u.act3.move = false; if (b.open <= 0) { b.st = "chase"; b.wait = .2; } }
      else if (b.st === "intro" || b.st === "recover" || b.st === "gap") { b.wait -= dt; b.u.act3.move = false; b.rot += angDiff(Math.atan2(h.x - b.x, h.z - b.z), b.rot) * Math.min(1, dt * 3); if (b.wait <= 0) { if (b.st === "gap") choose(true); else { b.st = "chase"; b.wait = 1.1 + Math.random() * .7; } } }
      else if (b.st === "chase") { const dx = h.x - b.x, dz = h.z - b.z, d = Math.hypot(dx, dz) - b.r; b.rot += angDiff(Math.atan2(dx, dz), b.rot) * Math.min(1, dt * 5); b.wait -= dt; const near = d < 1.2;
        if (!near && !h.gone) { const s = (b.rage ? 2.3 : 1.9) * dt * (A.eff.slow > 0 ? .6 : 1) * (A.eff.legs ? .65 : 1), nx = b.x + Math.sin(b.rot) * s, nz = b.z + Math.cos(b.rot) * s; const okB = (x, z) => tileOK(x, z) && Math.hypot(h.x - x, h.z - z) > b.r + .3; if (okB(nx, nz)) { b.x = nx; b.z = nz; } else if (okB(nx, b.z)) b.x = nx; else if (okB(b.x, nz)) b.z = nz; b.u.act3.move = true; } else b.u.act3.move = false;
        if ((near && b.wait < .9) || b.wait <= 0) { b.u.act3.move = false; choose(false); } }
      else if (b.st === "tele" && b.pat) { const P = b.pat, k = P.time / P.T; P.time += dt; b.lean = -.22 * Math.min(1, k * 1.4); b.u.act3.move = false;
        if (k < P.p.track) { const rot = Math.atan2(h.x - b.x, h.z - b.z); b.rot += angDiff(rot, b.rot) * Math.min(1, dt * 7); if (P.p.on === "hero") aim(P.t, P.t.x + (h.x - P.t.x) * Math.min(1, dt * 4), P.t.z + (h.z - P.t.z) * Math.min(1, dt * 4), 0); else if (P.t.kind !== "circle") aim(P.t, b.x, b.z, b.rot); else aim(P.t, b.x, b.z, 0); }
        setProg(P.t, P.time / P.T); if (P.time >= P.T) release(); }
    }
    // 반영: 위치·방향·몸짓
    const hb = h.u.g.userData.body, bb = b.u.g.userData.body, rp = h.roll > 0 ? 1 - h.roll / A.rollT : 0;
    h.u.ghost.x = h.x; h.u.ghost.z = h.z; h.u.act3.rot = h.rot; h.u.act3.y = gy(h.x, h.z) + (h.roll > 0 ? Math.sin(Math.min(1, rp / .75) * Math.PI) * .3 : 0);
    hb.rotation.x = h.roll > 0 ? Math.min(1, rp / .75) * TAU : h.down > 0 ? -1.1 * Math.min(1, h.down * 3) : (h.lean || 0); if (!A.cine) h.u.lunge = (h.u.lunge ?? 0) * Math.max(0, 1 - raw * 8); h.u.g.visible = !(h.ifr > 0 && h.roll <= 0 && Math.floor(A.t * 20) % 2);
    b.u.ghost.x = b.x; b.u.ghost.z = b.z; b.u.act3.rot = b.rot; b.u.act3.y = gy(b.x, b.z) - (b.down > 0 ? .12 : 0); b.u.lunge = b.lunge + (b.flinch > 0 ? -.12 : 0);
    bb.rotation.x = b.down > 0 ? .32 : b.open > 0 ? -.18 + Math.sin(A.t * 30) * .04 : b.lean;
    // 카메라: 내 등 뒤에서 보스를 본다(락온)
    const dx = h.x - b.x, dz = h.z - b.z, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, big = b.sz >= 2, near = Math.max(0, 1 - (dl - b.r) / 4), far = (big ? 6.2 : 4.4) + near * (big ? 1.2 : .4), hi = (big ? 3.4 : 2.5) + near * (big ? .8 : .2), side = .75;
    const cp = tmp.set(h.x + ux * far + uz * side, gy(h.x, h.z) + hi, h.z + uz * far - ux * side), lk0 = big ? .3 : .45, look = V3(h.x + (b.x - h.x) * lk0, gy(b.x, b.z) + .7 + b.sz * .2, h.z + (b.z - h.z) * lk0);
    if (!A.camP) { A.camP = cp.clone(); A.camT = look.clone(); } const k = 1 - Math.exp(-raw * (A.cine ? 3 : 9)); if (A.cine) cp.lerp(look, A.cine.hit ? .38 : .3);
    A.camP.lerp(cp, k); A.camT.lerp(look, k); cam.position.copy(A.camP); ctl.target.copy(A.camT); cam.lookAt(A.camT);
    // 락온 표시
    const lp = V3(b.x, gy(b.x, b.z) + .5 + b.sz * .45, b.z).project(cam), r = view.getBoundingClientRect(), lk = A.el.querySelector(".act-lock"); lk.style.transform = `translate(${Math.round((lp.x + 1) / 2 * r.width)}px,${Math.round((1 - lp.y) / 2 * r.height)}px)`; lk.classList.toggle("open", b.open > 0 || b.down > 0);
    paint(); return true;
  }
  globalThis.__sagaAct = () => A; globalThis.__sagaActSim = { tick: (r) => tick(r), act: (k) => act(k) };   /* 미리보기 점검용 */
  return { start, tick, active: () => !!A, has: (id) => !!A && (A.hero.u.id === id || A.boss.u.id === id), stop: () => A && finish(false, true) };
}
