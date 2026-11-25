// 전장 안에서 벌어지는 3D 전투 연출: 카메라·돌진·투사체·타격 (규칙은 모름, 이벤트만 재생)
export function fights({ THREE, scene, cam, ctl, view, units }) {
  let pair = [], on = false, skip = false, shot = null, home = null, kick = 0; const fx = new Set(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  const hud = document.createElement("div"); hud.className = "fhud"; hud.hidden = true; view.append(hud); hud.onclick = () => { skip = true; };
  const nap = (ms) => new Promise((r) => setTimeout(r, skip ? 0 : ms));
  // 프레임마다 f(0..1). 건너뛰면 즉시 끝 상태
  const tween = (ms, f) => new Promise((done) => { if (skip) { f(1); return done(); } const t0 = performance.now(); const step = () => { const k = skip ? 1 : Math.min(1, (performance.now() - t0) / ms); f(k); k < 1 ? requestAnimationFrame(step) : done(); }; step(); });
  const ease = (k) => 1 - (1 - k) ** 3;
  const face = (a, b) => { a.g.rotation.y = Math.atan2(b.g.position.x - a.g.position.x, b.g.position.z - a.g.position.z); };
  // 두 사람을 옆에서 잡는다. 지금 카메라와 가까운 쪽 옆면을 골라 시점이 뒤집히지 않게
  function frame(a, b, zoom, lift) {
    if (!home) { home = { p: cam.position.clone(), t: ctl.target.clone() }; look.copy(ctl.target); }
    const p = a.g.position, q = b.g.position, mid = p.clone().add(q).multiplyScalar(.5); mid.y += zoom > 1.5 ? (cam.aspect < 1 ? -.35 : .1) : .45; const dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz) || 1; let nx = -dz / len, nz = dx / len;
    if (nx * (home.p.x - home.t.x) + nz * (home.p.z - home.t.z) < 0) { nx = -nx; nz = -nz; }
    const portrait = cam.aspect < 1, d = (2 + len * (portrait ? 1.25 : .8)) * zoom;
    shot = { p: new THREE.Vector3(mid.x + nx * d - dx / len * .6, mid.y + lift * d * .6 + .4, mid.z + nz * d - dz / len * .6), t: mid };
  }
  // 공격하는 사람 어깨 너머에서 상대를 본다
  function shoulder(a, b) {
    if (!home) { home = { p: cam.position.clone(), t: ctl.target.clone() }; look.copy(ctl.target); }
    const p = a.g.position, d = b.g.position.clone().sub(p).setY(0).normalize(), back = cam.aspect < 1 ? 2.6 : 2.1, side = cam.aspect < 1 ? 1.5 : 1.25;
    shot = { p: new THREE.Vector3(p.x - d.x * back - d.z * -side, p.y + 1.75, p.z - d.z * back - d.x * side), t: b.g.position.clone().setY(b.g.position.y + .55) };
  }
  function release() { if (!home) return; shot = { p: home.p, t: home.t, end: true }; }
  function spark(mesh, life, step) { scene.add(mesh); fx.add({ mesh, life, t: 0, step }); }
  const glow = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const G = { ring: new THREE.RingGeometry(.7, 1, 32), arc: new THREE.RingGeometry(.55, .72, 24, 1, 0, 2.4), bit: new THREE.TetrahedronGeometry(.07), orb: new THREE.IcosahedronGeometry(.13, 1), arrow: new THREE.CylinderGeometry(.02, .02, .6, 5), blade: new THREE.ConeGeometry(.06, .34, 4), disc: new THREE.CircleGeometry(.16, 5) };
  function burst(at, color, n, power) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(G.bit, glow(color)); m.position.copy(at); const v = new THREE.Vector3(Math.random() - .5, Math.random() * .9, Math.random() - .5).multiplyScalar(power * 5); spark(m, .55, (o, dt) => { m.position.addScaledVector(v, dt); v.y -= 7 * dt; m.rotation.x += dt * 9; m.material.opacity = 1 - o.t / o.life; }); } }
  function shock(at, color, size) { const m = new THREE.Mesh(G.ring, glow(color, .9)); m.position.copy(at); spark(m, .35, (o) => { m.quaternion.copy(cam.quaternion); m.scale.setScalar(.1 + o.t / o.life * size); m.material.opacity = .9 * (1 - o.t / o.life); }); }
  function slash(at, color, big, turn) { const m = new THREE.Mesh(G.arc, glow(color)); m.position.copy(at); spark(m, .24, (o) => { const k = o.t / o.life; m.quaternion.copy(cam.quaternion); m.rotateZ(turn + k * 2.2); m.scale.setScalar(big ? 1.35 : .95); m.material.opacity = 1 - k; }); }
  const chest = (o) => o.g.position.clone().setY(o.g.position.y + .5);
  async function shoot(a, b, kind, w = {}) {
    const from = chest(a), to = chest(b), magic = kind === "tome", color = w.glow ? new THREE.Color(w.glow).getHex() : magic ? 0xb58cff : 0xffd9a0, m = new THREE.Mesh(magic ? G.orb : kind === "dagger" ? G.blade : G.arrow, magic ? glow(color) : new THREE.MeshStandardMaterial({ color: 0xe8dcc8 })); const dir = to.clone().sub(from).normalize(); if (!magic) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); scene.add(m);
    if (magic) { await tween(260, (k) => { m.position.copy(from).y += .55; m.scale.setScalar(.2 + k * 1.6); }); }
    const start = m.position.lengthSq() ? m.position.clone() : from; await tween(magic ? 230 : 170, (k) => { m.position.lerpVectors(start, to, k); if (!magic) m.position.y += Math.sin(k * Math.PI) * .25; else if (Math.random() < .6) burst(m.position, color, 1, .15); }); scene.remove(m); if (magic) shock(to, color, 1.5);
  }
  // ── 무기 동작: 자세(팔·다리·무기 각도, 몸 이동)를 차례로 잇는다. hit = 맞는 순간 ──
  const Z = { ra: [0, 0, 0], la: [0, 0, 0], rl: [0, 0, 0], ll: [0, 0, 0], wg: [0, 0, 0], lunge: 0, hop: 0, twist: 0, lean: 0, roll: 0 };
  const P = (o) => ({ ...Z, ...o });
  // gap = 상대 앞까지 다가갈 거리
  const MOVES = {
    slash: (g, alt) => [[170, P({ wg: [1.7, 0, 0], ra: [-2.2, 0, alt ? -.9 : .9], twist: alt ? .8 : -.8, lunge: -.15, rl: [.3, 0, 0] })], [90, P({ wg: [2.6, 0, 0], ra: [-1.1, 0, alt ? .9 : -.9], twist: alt ? -.7 : .8, lunge: g, lean: .25, rl: [-.6, 0, 0], ll: [.5, 0, 0] }), "hit"]],
    draw: (g) => [[260, P({ wg: [2.3, 0, 1.2], ra: [-.4, 0, -.9], la: [-.4, 0, .5], twist: -.6, lean: .35, lunge: -.1, rl: [-.4, 0, 0] })], [70, P({ wg: [2.9, 0, -.6], ra: [-1.4, 0, 1.1], twist: .9, lunge: g + .15, lean: .2, rl: [-.8, 0, 0], ll: [.7, 0, 0] }), "hit"], [140, P({ wg: [2.7, 0, -.6], ra: [-1.2, 0, 1], twist: .9, lunge: g + .2, lean: .15 })]],
    overhead: (g) => [[260, P({ wg: [2.2, 0, 0], ra: [-3, 0, .2], la: [-2.8, 0, -.2], lean: -.4, lunge: -.1, hop: .05 })], [130, P({ wg: [2.1, 0, 0], ra: [-2.6, 0, 0], la: [-2.4, 0, 0], lunge: g * .6, hop: .38, lean: -.1 })], [80, P({ wg: [2.4, 0, 0], ra: [-.7, 0, 0], la: [-.7, 0, 0], lunge: g, lean: .5, hop: 0, rl: [-.5, 0, 0], ll: [.5, 0, 0] }), "hit", .12]],
    thrust: (g) => [[190, P({ wg: [1, 0, 0], ra: [.5, 0, .1], la: [-.9, 0, -.2], twist: -.5, lunge: -.22, ll: [-.4, 0, 0] })], [75, P({ wg: [2.9, 0, 0], ra: [-1.35, 0, 0], la: [.5, 0, 0], twist: .35, lunge: g * .85, lean: .22, ll: [-.7, 0, 0], rl: [.6, 0, 0] }), "hit"]],
    sweep: (g) => [[210, P({ wg: [2.6, 0, .4], ra: [-1.4, 0, 1.2], la: [-1.1, 0, .4], twist: -1.3, lunge: -.1, lean: .1 })], [140, P({ wg: [2.85, 0, -.4], ra: [-1.4, 0, -.2], la: [-1.2, 0, -.6], twist: 1.5, lunge: g, lean: .2, rl: [-.4, 0, 0], ll: [.4, 0, 0] }), "hit"]],
    spin: (g) => [[150, P({ wg: [2.95, 0, 0], ra: [-1.5, 0, .6], la: [-1.3, 0, -.6], twist: -.8, lean: .1 })], [260, P({ wg: [2.95, 0, 0], ra: [-1.5, 0, .6], la: [-1.3, 0, -.6], twist: 6.4, lunge: g, hop: .12 }), "hit"]],
    twin: (g) => [[130, P({ wg: [1.6, 0, 0], ra: [-2, 0, .9], la: [-.4, 0, -.4], twist: -.5, lunge: -.1 })], [80, P({ wg: [2.3, 0, 0], ra: [-.9, 0, -.8], la: [-2, 0, -.9], twist: .6, lunge: g, lean: .2 }), "pre"], [90, P({ wg: [1.7, 0, 0], ra: [-.2, 0, -.5], la: [-.9, 0, .9], twist: -.7, lunge: g + .05, lean: .3, rl: [-.5, 0, 0] }), "hit"]],
    whip: (g) => [[220, P({ wg: [2, 0, 0], ra: [-2.9, 0, .5], twist: -.6, lean: -.2 })], [110, P({ wg: [2.5, 0, 0], ra: [-1.1, 0, -.2], twist: .5, lunge: g * .4, lean: .2 }), "hit"]],
    punch: (g) => [[110, P({ wg: [-0.7, 0, 0], ra: [.7, 0, .2], la: [-1.4, 0, 0], twist: -.6, lunge: -.12 })], [65, P({ wg: [1.6, 0, 0], ra: [-1.6, 0, 0], la: [.4, 0, 0], twist: .7, lunge: g, lean: .15, rl: [-.5, 0, 0] }), "pre"], [75, P({ wg: [-0.5, 0, 0], la: [-1.7, 0, 0], ra: [.5, 0, 0], twist: -.8, lunge: g + .08, lean: .2, ll: [-.5, 0, 0] }), "hit"]],
    claw: (g) => [[140, P({ wg: [2.6, 0, 0], ra: [-2.6, 0, .6], la: [-2.6, 0, -.6], lean: -.25, hop: .05 })], [110, P({ wg: [2.2, 0, 0], ra: [-2.2, 0, .5], la: [-2.2, 0, -.5], lunge: g * .7, hop: .34 })], [75, P({ wg: [0.5, 0, 0], ra: [-.5, 0, -.5], la: [-.5, 0, .5], lunge: g, lean: .45 }), "hit"]],
    bash: (g) => [[180, P({ wg: [0.6, 0, 0], ra: [-.6, 0, -.5], twist: -.5, lunge: -.18, lean: .15 })], [90, P({ wg: [1.5, 0, 0], ra: [-1.5, 0, -.3], la: [-1.2, 0, .2], twist: .3, lunge: g + .06, lean: .3, rl: [-.6, 0, 0], ll: [.6, 0, 0] }), "hit", .1]],
    flourish: (g) => [[160, P({ wg: [1.8, 1.4, 0], ra: [-1.6, 0, .9], twist: -1, hop: .05 })], [170, P({ wg: [2.7, 4.4, 0], ra: [-1.5, 0, -.5], twist: 5.6, lunge: g, hop: .1 }), "hit"]],
    bow: () => [[260, P({ wg: [1.5, 0, 0], ra: [-1.5, 0, .2], la: [-1.5, 0, -.5], twist: -.5, lean: -.08, ll: [-.3, 0, 0], rl: [.3, 0, 0] })], [150, P({ wg: [1.5, 0, 0], ra: [-1.5, 0, .2], la: [-1.3, 0, -1], twist: -.55, lean: -.14, ll: [-.3, 0, 0], rl: [.3, 0, 0] })], [50, P({ wg: [1.5, 0, 0], ra: [-1.5, 0, .2], la: [-1.1, 0, -1.5], twist: -.45 }), "fire"]],
    gun: () => [[230, P({ wg: [1.5, 0, 0], ra: [-1.5, 0, 0], la: [-1.4, 0, .4], twist: -.15, ll: [-.2, 0, 0], rl: [.2, 0, 0] })], [140, P({ wg: [1.52, 0, 0], ra: [-1.52, 0, 0], la: [-1.42, 0, .4], twist: -.15 })], [40, P({ wg: [1.6, 0, 0], ra: [-1.95, 0, 0], la: [-1.7, 0, .4], twist: -.2, lunge: -.12, lean: -.16 }), "fire"], [130, P({ wg: [1.55, 0, 0], ra: [-1.55, 0, 0], la: [-1.45, 0, .4] })]],
    throw: () => [[190, P({ wg: [2.2, 0, 0], ra: [-2.9, 0, .5], la: [-1, 0, 0], twist: -.7, lean: -.2, rl: [.3, 0, 0] })], [85, P({ wg: [2.4, 0, 0], ra: [-.9, 0, -.3], twist: .6, lunge: .2, lean: .28, ll: [.4, 0, 0], rl: [-.5, 0, 0] }), "fire"]],
    cast: () => [[260, P({ wg: [1.3, 0, 0], ra: [-1.3, 0, .3], la: [-1.3, 0, -.3], lean: -.06, hop: .06 })], [220, P({ wg: [2.7, 0, 0], ra: [-2.7, 0, .4], la: [-2.7, 0, -.4], lean: -.2, hop: .14 })], [90, P({ wg: [1.4, 0, 0], ra: [-1.4, 0, 0], la: [-1.4, 0, 0], lean: .22, lunge: .12 }), "fire"]],
    staff: () => [[240, P({ wg: [2, 0, 0], ra: [-2.4, 0, .3], la: [-.5, 0, -.4], lean: -.12, hop: .05 })], [110, P({ wg: [2.3, 0, 0], ra: [-1.2, 0, 0], la: [-.9, 0, 0], lean: .24, lunge: .12 }), "fire"]],
    card: () => [[190, P({ wg: [1.2, 0, .8], ra: [-1.2, 0, -1.1], twist: -.6 })], [80, P({ wg: [1.5, 0, -.8], ra: [-1.5, 0, .7], twist: .5, lunge: .1 }), "fire"]],
    play: () => [[240, P({ wg: [0.9, 0, 0], ra: [-.9, 0, -.5], la: [-1.4, 0, .5], roll: .12 })], [200, P({ wg: [0.7, 0, 0], ra: [-.7, 0, -.8], la: [-1.4, 0, .5], roll: -.14 })], [110, P({ wg: [1.1, 0, 0], ra: [-1.1, 0, -.2], la: [-1.4, 0, .5], roll: .1, lean: .1 }), "fire"]],
  };
  const NEAR = { sword: "slash", curve: "slash", katana: "draw", thin: "thrust", great: "overhead", twin: "twin", dagger: "thrust", whip: "whip", lance: "thrust", trident: "thrust", halberd: "sweep", pole: "spin", axe: "overhead", scythe: "sweep", hammer: "overhead", club: "overhead", fan: "flourish", ring: "flourish", star: "slash", wand: "cast", orb: "cast", card: "card", lute: "play", book: "cast", staff: "staff", shield: "bash", claw: "claw", fist: "punch", beam: "slash", bow: "bow", crossbow: "gun", rifle: "gun", pistol: "gun" };
  const FAR = { bow: "bow", crossbow: "gun", rifle: "gun", pistol: "gun", lance: "throw", trident: "throw", axe: "throw", dagger: "throw", star: "throw", ring: "throw", fan: "flourish", whip: "whip", card: "card", orb: "cast", book: "cast", wand: "staff", staff: "staff", lute: "play", thin: "throw", beam: "gun" };
  const VEC = ["ra", "la", "rl", "ll", "wg"], NUM = ["lunge", "hop", "twist", "lean", "roll"];
  const setPose = (o, p) => { o.pose = Object.fromEntries(VEC.map((k) => [k, p[k]])); for (const k of NUM) o[k] = p[k]; };
  const getPose = (o) => ({ ...Z, ...(o.pose ?? {}), ...Object.fromEntries(NUM.map((k) => [k, o[k] ?? 0])) });
  const lerpPose = (A, B, k) => { const p = {}; for (const v of VEC) p[v] = A[v].map((n, i) => n + (B[v][i] - n) * k); for (const v of NUM) p[v] = A[v] + (B[v] - A[v]) * k; return p; };
  const toPose = (o, p, ms, f = ease) => { const A = getPose(o); return tween(ms, (k) => setPose(o, lerpPose(A, p, f(k)))); };
  const rest = async (o, ms = 190) => { const full = Math.round((o.twist ?? 0) / 6.283) * 6.283; o.twist = (o.twist ?? 0) - full; await toPose(o, Z, ms); o.pose = null; };
  let turn = 0;
  async function projectile(a, b, w, mv) {
    if (mv === "gun") { const at = chest(a), dir = chest(b).sub(at).normalize(); at.addScaledVector(dir, .5); const col = w.glow ? new THREE.Color(w.glow).getHex() : w.shape === "beam" || w.magic ? 0x7fe6ff : 0xffd27a; if (w.shape !== "crossbow") { shock(at, col, .5); burst(at, col, 6, .4); kick = .06; const to = chest(b), len = at.distanceTo(to), t = new THREE.Mesh(G.arrow, glow(col)); t.position.copy(at).lerp(to, .5); t.scale.set(1, len / .6, 1); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); spark(t, .14, (o) => { t.material.opacity = 1 - o.t / o.life; }); await nap(70); return; } await shoot(a, b, "bow", w); return; }
    if (mv === "throw" || mv === "flourish") { const from = chest(a), to = chest(b), m = new THREE.Mesh(w.shape === "ring" ? G.ring : w.shape === "axe" ? G.disc : G.blade, new THREE.MeshBasicMaterial({ color: w.glow ? new THREE.Color(w.glow) : 0xe8e2d8, side: THREE.DoubleSide })); m.scale.setScalar(w.shape === "ring" ? .16 : w.shape === "lance" || w.shape === "trident" ? 1.8 : 1); const dir = to.clone().sub(from).normalize(), sp = w.shape === "axe" || w.shape === "ring" || w.shape === "star"; if (!sp) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); scene.add(m); await tween(210, (k) => { m.position.lerpVectors(from, to, k); m.position.y += Math.sin(k * Math.PI) * .3; if (sp) m.rotation.z += .7; }); scene.remove(m); if (w.shape === "ring") { const r = new THREE.Mesh(G.ring, glow(0xe8e2d8)); r.scale.setScalar(.16); spark(r, .3, (o) => { r.position.lerpVectors(to, from, o.t / o.life); r.rotation.z += .7; }); } return; }
    if (mv === "whip") { const from = chest(a), to = chest(b), n = 12, col = w.glow ? new THREE.Color(w.glow).getHex() : 0xd8b48a; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(G.orb, glow(col)); m.scale.setScalar(.4 - i * .015); spark(m, .26, (o) => { const k = Math.min(1, o.t / .1) * (i / n); m.position.lerpVectors(from, to, k); m.position.y += Math.sin(k * 9 + o.t * 30) * .12; m.material.opacity = 1 - o.t / o.life; }); } await nap(90); return; }
    if (mv === "play") { const from = chest(a); for (let i = 0; i < 3; i++) { shock(from, w.glow ? new THREE.Color(w.glow).getHex() : 0xf2d26a, 1 + i * .5); await nap(50); } }
    await shoot(a, b, mv === "bow" ? "bow" : "tome", w);
  }
  async function strike(a, b, w, h, apply) {
    face(a, b); if (!h.guard) face(b, a); const gap = Math.hypot(a.g.position.x - b.g.position.x, a.g.position.z - b.g.position.z), shape = w.shape || { sword: "sword", lance: "lance", axe: "axe", bow: "bow", tome: "book", dagger: "dagger", staff: "staff", claw: "fist" }[w.type] || "sword";
    const near = gap < 1.2, mv = near ? NEAR[shape] ?? "slash" : FAR[shape] ?? (w.magic ? "cast" : "throw"), reach = Math.max(.1, gap - .42), seq = MOVES[mv](near ? reach : .15, turn++ % 2 === 1), hc = w.glow ? new THREE.Color(w.glow).getHex() : 0, col = h.crit ? 0xffd27a : hc || (w.magic ? 0xb58cff : 0xfff0d8);
    if (h.crit) { hud.classList.add("crit"); frame(a, b, .68, .5); await nap(420); hud.classList.remove("crit"); }
    const magicRing = /cast|staff|card|play/.test(mv); if (magicRing) { const f = a.g.position.clone(); f.y += .05; const m = new THREE.Mesh(G.ring, glow(col, .8)); m.position.copy(f); m.rotation.x = -Math.PI / 2; spark(m, .6, (o) => { m.scale.setScalar(.3 + o.t * 1.1); m.rotation.z += .08; m.material.opacity = .8 * (1 - o.t / o.life); }); }
    let landed = false;
    const land = async () => {
      landed = true; const at = chest(b);
      if (h.miss) { apply(h); const side = Math.random() < .5 ? -1 : 1; setPose(b, P({ ra: [-.4, 0, .5], la: [-.4, 0, -.5], lean: -.2, roll: side * -.25 })); await tween(150, (k) => { b.dodge = side * Math.sin(k * Math.PI / 2) * .42; }); return; }
      if (h.guard) { setPose(b, P({ ra: [-1.6, 0, -.6], la: [-1.6, 0, .6], lean: -.1, ll: [-.3, 0, 0] })); shock(at, 0x7cc0ff, 1.3); kick = .06; apply(h); await nap(90); return; }
      if (near && !magicRing) { const tilt = { slash: turn % 2 ? 0 : 1.6, draw: .6, overhead: 1.1, thrust: 2.2, sweep: .2, spin: 0, twin: .5, claw: 1.3, flourish: 0 }[mv]; if (tilt != null) slash(at, col, h.crit || /overhead|sweep|draw|spin/.test(mv), tilt); if (mv === "claw") { slash(at, col, false, .9); slash(at, col, false, 1.7); } if (h.crit) slash(at, col, true, 2.2); if (mv === "overhead") { const g0 = b.g.position.clone(); g0.y += .05; const m = new THREE.Mesh(G.ring, glow(0xe8d8b8, .8)); m.position.copy(g0); m.rotation.x = -Math.PI / 2; spark(m, .4, (o) => { m.scale.setScalar(.2 + o.t * 3); m.material.opacity = .8 * (1 - o.t / o.life); }); } }
      burst(at, col, h.crit ? 34 : 14, h.crit ? 1.2 : .8); shock(at, col, h.crit ? 2 : 1); kick = h.crit ? .22 : h.dmg ? (mv === "overhead" || mv === "bash" ? .14 : .09) : .03; apply(h); await nap(h.crit ? 130 : 55);
      setPose(b, P({ ra: [.5, 0, .5], la: [.5, 0, -.5], lean: -.42, lunge: -.2, rl: [-.3, 0, 0] })); await nap(60);
    };
    for (const [ms, pose, ev, hold] of seq) {
      await toPose(a, pose, ms, ev === "hit" || ev === "pre" ? (k) => k * k : ease);
      if (ev === "pre" && !h.miss) { burst(chest(b), col, 6, .5); slash(chest(b), col, false, 1.2); await nap(40); }
      else if (ev === "fire") { await projectile(a, b, { ...w, shape }, mv); await land(); }
      else if (ev === "hit") { if (!near) await projectile(a, b, { ...w, shape }, mv); if (hold) kick = Math.max(kick, hold); await land(); }
    }
    if (!landed) await land();
    const d0 = b.dodge ?? 0; await Promise.all([rest(a), rest(b), tween(170, (k) => { b.dodge = d0 * (1 - ease(k)); })]);
  }
  const bars = (who, hp) => { for (const p of hud.querySelectorAll("[data-id]")) { const id = p.dataset.id, v = hp[id]; p.querySelector("i").style.width = Math.max(0, v * 100 / who[id].max) + "%"; p.querySelector("strong").textContent = Math.max(0, v); } };
  async function fight(info, hits, host) {
    const A = units.get(info.a), T = units.get(info.d); if (!A || !T) { hits.forEach(host.hit); return; }
    if (host.fast()) { for (const h of hits) { const a = units.get(h.from); if (a && h.to !== h.from) { face(a, units.get(h.to) ?? T); a.lunge = .3; } host.hit(h); await new Promise((r) => setTimeout(r, 110)); if (a) a.lunge = 0; } return; }
    on = true; pair = Object.keys(info.who); skip = false; ctl.enabled = false; const esc = (s) => { const n = document.createElement("i"); n.textContent = s; return n.innerHTML; }, hp = { [info.a]: info.who[info.a].hp, [info.d]: info.who[info.d].hp };
    const plate = (id) => { const w = info.who[id]; return `<div class="fp ${w.team}" data-id="${esc(id)}">${w.face ?? ""}<b>${esc(w.name)}</b><div class=fl><strong></strong><div class=fhp><i></i></div></div><small>${esc(w.weapon)}</small><div class=fn>${["위력", "명중", "필살"].map((t, i) => `<span><u>${t}</u>${w.nums?.[i] ?? "–"}</span>`).join("")}</div></div>`; };
    hud.innerHTML = `<div class=lb></div><div class=cutin>필살</div>${info.art ? `<div class=artn>${esc(info.art)}</div>` : ""}<div class=fps>${plate(info.a)}${plate(info.d)}</div>`; hud.hidden = false; document.body.classList.add("fighting"); bars(info.who, hp);
    try {
      face(A, T); face(T, A); shoulder(A, T); await nap(620);
      for (const h of hits) { const a = units.get(h.from), b = units.get(h.to); const apply = (x) => { hp[x.to] = x.hp; if (x.hpFrom != null) hp[x.from] = x.hpFrom; host.hit(x); bars(info.who, hp); }; if (a && b && info.who[h.from]) await strike(a, b, info.who[h.from], h, apply); else apply(h); frame(A, T, 1, .55); await nap(60); }
      await nap(220);
    } finally { for (const o of units.values()) { o.lunge = o.twist = o.lean = o.dodge = o.hop = o.roll = 0; o.pose = null; } hud.hidden = true; document.body.classList.remove("fighting"); on = false; ctl.enabled = true; release(); }
  }
  // true면 카메라를 이쪽이 잡고 있다
  function tick(dt) {
    for (const o of fx) { o.t += dt; if (o.t >= o.life) { scene.remove(o.mesh); o.mesh.material.dispose(); fx.delete(o); } else o.step(o, dt); }
    if (!shot) return false; const k = 1 - Math.exp(-dt * 8); cam.position.lerp(shot.p, k); look.lerp(shot.t, k); cam.lookAt(look);
    if (kick > .002) { cam.position.add(tmp.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(kick)); kick *= Math.exp(-dt * 12); }
    if (shot.end && cam.position.distanceTo(shot.p) < .08) { cam.position.copy(home.p); ctl.target.copy(home.t); shot = home = null; kick = 0; }
    return true;
  }
  return { fight, frame, face, release, tick, active: () => on, has: (id) => pair.includes(id), moves: MOVES, near: NEAR, far: FAR };
}
