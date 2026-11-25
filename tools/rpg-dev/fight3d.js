// 전장 안에서 벌어지는 3D 전투 연출: 카메라·돌진·투사체·타격 (규칙은 모름, 이벤트만 재생)
export function fights({ THREE, scene, cam, ctl, view, units }) {
  let on = false, skip = false, shot = null, home = null, kick = 0; const fx = new Set(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  const hud = document.createElement("div"); hud.className = "fhud"; hud.hidden = true; view.append(hud); hud.onclick = () => { skip = true; };
  const nap = (ms) => new Promise((r) => setTimeout(r, skip ? 0 : ms));
  // 프레임마다 f(0..1). 건너뛰면 즉시 끝 상태
  const tween = (ms, f) => new Promise((done) => { if (skip) { f(1); return done(); } const t0 = performance.now(); const step = () => { const k = skip ? 1 : Math.min(1, (performance.now() - t0) / ms); f(k); k < 1 ? requestAnimationFrame(step) : done(); }; step(); });
  const ease = (k) => 1 - (1 - k) ** 3;
  const face = (a, b) => { a.g.rotation.y = Math.atan2(b.g.position.x - a.g.position.x, b.g.position.z - a.g.position.z); };
  // 두 사람을 옆에서 잡는다. 지금 카메라와 가까운 쪽 옆면을 골라 시점이 뒤집히지 않게
  function frame(a, b, zoom, lift) {
    if (!home) { home = { p: cam.position.clone(), t: ctl.target.clone() }; look.copy(ctl.target); }
    const p = a.g.position, q = b.g.position, mid = p.clone().add(q).multiplyScalar(.5); mid.y += .45; const dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz) || 1; let nx = -dz / len, nz = dx / len;
    if (nx * (home.p.x - home.t.x) + nz * (home.p.z - home.t.z) < 0) { nx = -nx; nz = -nz; }
    const portrait = cam.aspect < 1, d = (2 + len * (portrait ? 1.25 : .8)) * zoom;
    shot = { p: new THREE.Vector3(mid.x + nx * d - dx / len * .6, mid.y + lift * d * .6 + .4, mid.z + nz * d - dz / len * .6), t: mid };
  }
  function release() { if (!home) return; shot = { p: home.p, t: home.t, end: true }; }
  function spark(mesh, life, step) { scene.add(mesh); fx.add({ mesh, life, t: 0, step }); }
  const glow = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const G = { ring: new THREE.RingGeometry(.7, 1, 32), arc: new THREE.RingGeometry(.55, .72, 24, 1, 0, 2.4), bit: new THREE.TetrahedronGeometry(.07), orb: new THREE.IcosahedronGeometry(.13, 1), arrow: new THREE.CylinderGeometry(.02, .02, .6, 5), blade: new THREE.ConeGeometry(.06, .34, 4) };
  function burst(at, color, n, power) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(G.bit, glow(color)); m.position.copy(at); const v = new THREE.Vector3(Math.random() - .5, Math.random() * .9, Math.random() - .5).multiplyScalar(power * 5); spark(m, .55, (o, dt) => { m.position.addScaledVector(v, dt); v.y -= 7 * dt; m.rotation.x += dt * 9; m.material.opacity = 1 - o.t / o.life; }); } }
  function shock(at, color, size) { const m = new THREE.Mesh(G.ring, glow(color, .9)); m.position.copy(at); spark(m, .35, (o) => { m.quaternion.copy(cam.quaternion); m.scale.setScalar(.1 + o.t / o.life * size); m.material.opacity = .9 * (1 - o.t / o.life); }); }
  function slash(at, color, big, turn) { const m = new THREE.Mesh(G.arc, glow(color)); m.position.copy(at); spark(m, .24, (o) => { const k = o.t / o.life; m.quaternion.copy(cam.quaternion); m.rotateZ(turn + k * 2.2); m.scale.setScalar(big ? 1.35 : .95); m.material.opacity = 1 - k; }); }
  const chest = (o) => o.g.position.clone().setY(o.g.position.y + .5);
  async function shoot(a, b, kind) {
    const from = chest(a), to = chest(b), magic = kind === "tome", color = magic ? 0xb58cff : 0xffd9a0, m = new THREE.Mesh(magic ? G.orb : kind === "dagger" ? G.blade : G.arrow, magic ? glow(color) : new THREE.MeshStandardMaterial({ color: 0xe8dcc8 })); const dir = to.clone().sub(from).normalize(); if (!magic) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); scene.add(m);
    if (magic) { await tween(260, (k) => { m.position.copy(from).y += .55; m.scale.setScalar(.2 + k * 1.6); }); }
    const start = m.position.lengthSq() ? m.position.clone() : from; await tween(magic ? 230 : 170, (k) => { m.position.lerpVectors(start, to, k); if (!magic) m.position.y += Math.sin(k * Math.PI) * .25; else if (Math.random() < .6) burst(m.position, color, 1, .15); }); scene.remove(m); if (magic) shock(to, color, 1.5);
  }
  async function strike(a, b, w, h, apply) {
    face(a, b); if (!h.guard) face(b, a); const gap = Math.hypot(a.g.position.x - b.g.position.x, a.g.position.z - b.g.position.z), melee = gap < 1.2 && w.type !== "bow" && w.type !== "tome" && !w.magic, heavy = w.type === "axe";
    if (h.crit) { hud.classList.add("crit"); frame(a, b, .68, .5); await nap(420); hud.classList.remove("crit"); }
    await tween(melee ? 150 : 190, (k) => { const e = ease(k); a.lunge = -.16 * e; a.twist = -.7 * e; a.lean = heavy ? -.35 * e : -.12 * e; });
    if (!melee) { a.twist = .3; await shoot(a, b, w.type === "bow" ? "bow" : w.type === "dagger" ? "dagger" : w.type === "tome" || w.magic ? "tome" : "bow"); }
    else await tween(95, (k) => { const e = k * k; a.lunge = -.16 + (gap - .3) * e; a.twist = -.7 + 1.5 * e; a.lean = .3 * e; if (heavy) a.hop = Math.sin(k * Math.PI) * .25; });
    a.hop = 0; const at = chest(b), color = h.crit ? 0xffd27a : w.type === "tome" || w.magic ? 0xb58cff : 0xfff0d8;
    if (h.miss) { apply(h); await tween(150, (k) => { b.dodge = Math.sin(k * Math.PI / 2) * .42; }); }
    else if (h.guard) { shock(at, 0x7cc0ff, 1.3); kick = .06; apply(h); }
    else { if (melee) { slash(at, color, h.crit, w.type === "lance" ? 1.2 : 0); if (h.crit) slash(at, color, true, 2.2); } burst(at, color, h.crit ? 34 : 14, h.crit ? 1.2 : .8); shock(at, color, h.crit ? 2 : 1); kick = h.crit ? .22 : h.dmg ? .09 : .03; apply(h); await nap(h.crit ? 130 : 55); await tween(110, (k) => { b.lunge = -.22 * Math.sin(k * Math.PI); b.lean = -.35 * Math.sin(k * Math.PI); }); }
    const l0 = a.lunge ?? 0, t0 = a.twist ?? 0, n0 = a.lean ?? 0, d0 = b.dodge ?? 0; await tween(150, (k) => { const e = 1 - ease(k); a.lunge = l0 * e; a.twist = t0 * e; a.lean = n0 * e; b.dodge = d0 * e; });
  }
  const bars = (who, hp) => { for (const p of hud.querySelectorAll("[data-id]")) { const id = p.dataset.id, v = hp[id]; p.querySelector("i").style.width = Math.max(0, v * 100 / who[id].max) + "%"; p.querySelector("strong").textContent = Math.max(0, v); } };
  async function fight(info, hits, host) {
    const A = units.get(info.a), T = units.get(info.d); if (!A || !T) { hits.forEach(host.hit); return; }
    if (host.fast()) { for (const h of hits) { const a = units.get(h.from); if (a && h.to !== h.from) { face(a, units.get(h.to) ?? T); a.lunge = .3; } host.hit(h); await new Promise((r) => setTimeout(r, 110)); if (a) a.lunge = 0; } return; }
    on = true; skip = false; ctl.enabled = false; const esc = (s) => { const n = document.createElement("i"); n.textContent = s; return n.innerHTML; }, hp = { [info.a]: info.who[info.a].hp, [info.d]: info.who[info.d].hp };
    const plate = (id) => { const w = info.who[id]; return `<div class="fp ${w.team}" data-id="${esc(id)}"><b>${esc(w.name)}</b><small>${esc(w.weapon)}</small><div class=fhp><i></i></div><strong></strong></div>`; };
    hud.innerHTML = `<div class=lb></div><div class=cutin>필살</div>${info.art ? `<div class=artn>${esc(info.art)}</div>` : ""}<div class=fps>${plate(info.a)}${plate(info.d)}</div>`; hud.hidden = false; document.body.classList.add("fighting"); bars(info.who, hp);
    try {
      face(A, T); face(T, A); frame(A, T, 1, .55); await nap(380);
      for (const h of hits) { const a = units.get(h.from), b = units.get(h.to); const apply = (x) => { hp[x.to] = x.hp; if (x.hpFrom != null) hp[x.from] = x.hpFrom; host.hit(x); bars(info.who, hp); }; if (a && b && info.who[h.from]) await strike(a, b, info.who[h.from], h, apply); else apply(h); frame(A, T, 1, .55); await nap(60); }
      await nap(220);
    } finally { for (const o of units.values()) o.lunge = o.twist = o.lean = o.dodge = o.hop = 0; hud.hidden = true; document.body.classList.remove("fighting"); on = false; ctl.enabled = true; release(); }
  }
  // true면 카메라를 이쪽이 잡고 있다
  function tick(dt) {
    for (const o of fx) { o.t += dt; if (o.t >= o.life) { scene.remove(o.mesh); o.mesh.material.dispose(); fx.delete(o); } else o.step(o, dt); }
    if (!shot) return false; const k = 1 - Math.exp(-dt * 8); cam.position.lerp(shot.p, k); look.lerp(shot.t, k); cam.lookAt(look);
    if (kick > .002) { cam.position.add(tmp.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(kick)); kick *= Math.exp(-dt * 12); }
    if (shot.end && cam.position.distanceTo(shot.p) < .08) { cam.position.copy(home.p); ctl.target.copy(home.t); shot = home = null; kick = 0; }
    return true;
  }
  return { fight, frame, face, release, tick, active: () => on };
}
