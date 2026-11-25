// Dusk Saga 3D 시제품: 2D 화면의 상태(칸·유닛 DOM)를 읽어 3D로 그린다. 규칙·조작은 app.js와 공유.
import * as THREE from "three";
import { fights } from "./fight3d.js";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import { hooks } from "./app.js";
const view = document.querySelector(".view"), board = document.querySelector(".board");
let gl; try { gl = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 2 }); } catch {}
if (!gl) { const n = document.createElement("div"); n.className = "guide"; n.textContent = "이 기기는 3D를 못 써서 2D로 보여요"; view.before(n); } else run();
function run() {
  document.body.classList.add("three"); view.append(gl.domElement); gl.setPixelRatio(Math.min(devicePixelRatio, 1.75)); gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap; 
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf3c9a0); scene.fog = new THREE.Fog(0xf3c9a0, 18, 46);
  const cam = new THREE.PerspectiveCamera(42, 1, .1, 80), ctl = new MapControls(cam, gl.domElement);
  Object.assign(ctl, { enableDamping: true, dampingFactor: .12, minDistance: 5, maxDistance: 22, maxPolarAngle: 1.15, minPolarAngle: .35, screenSpacePanning: false });
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7a3c4, 1.9)); const sun = new THREE.DirectionalLight(0xffe2bd, 2.1); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.001; Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, far: 40 }); scene.add(sun, sun.target);
  const steps = new THREE.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, THREE.RedFormat); steps.minFilter = steps.magFilter = THREE.NearestFilter; steps.needsUpdate = true;
  const ink = new THREE.MeshBasicMaterial({ color: 0x1c1626, side: THREE.BackSide });
  const mats = new Map(), mat = (c, o) => { const k = c + JSON.stringify(o ?? 0); if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, gradientMap: steps, ...(o?.emissive ? { emissive: o.emissive, emissiveIntensity: .6 } : {}) })); return mats.get(k); };
  const geo = { box: new THREE.BoxGeometry(1, 1, 1), cone: new THREE.ConeGeometry(1, 1, 6), cyl: new THREE.CylinderGeometry(1, 1, 1, 8), ball: new THREE.IcosahedronGeometry(1, 1), body: new THREE.CylinderGeometry(.55, 1, 1, 7), ring: new THREE.RingGeometry(.4, .46, 32), tile: new THREE.PlaneGeometry(.94, .94) };
  const add = (g, shape, c, sx, sy, sz, x, y, z, o) => { const m = new THREE.Mesh(geo[shape], mat(c, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const H = { f: 0, m: .3, w: -.18, b: 0, wall: .9, F: .12, T: .25, p: 0, dot: 0 };
  const TOP = { dot: 0xb9c67e, f: 0x8fae6a, m: 0xb3a590, w: 0x4fb0c6, b: 0xc79a5c, wall: 0xa79ab0, F: 0xcdb58a, T: 0xe0b552, p: 0xbdb3a6 };
  let land = null, key = "", W = 0, D = 0, water = []; const trees = new Map(), hgt = new Map(), marks = new Map(), units = new Map();
  const kindOf = (b) => /(?:^| )t(dot|wall|[fmwbFTp])(?: |$)/.exec(b.className)?.[1] ?? "dot";
  function build(tiles) {
    if (land) scene.remove(land); land = new THREE.Group(); water = []; hgt.clear(); trees.clear(); for (const m of marks.values()) scene.remove(m); marks.clear();
    W = Math.max(...tiles.map((b) => +b.dataset.x)) + 1; D = Math.max(...tiles.map((b) => +b.dataset.y)) + 1;
    for (const b of tiles) {
      const x = +b.dataset.x, y = +b.dataset.y, k = kindOf(b), h = H[k], r = ((x * 73 + y * 151) % 17) / 17, id = x + "," + y; hgt.set(id, h);
      const c = new THREE.Color(TOP[k]).offsetHSL(0, 0, (r - .5) * .05).getHex(), t = add(land, "box", c, .99, .6 + h, .99, x, (h - .6) / 2, y, k === "w" ? { roughness: .15, metalness: .3 } : undefined); if (k === "w") water.push(t);
      if (k === "f") { const tg = new THREE.Group(); tg.position.set(x, 0, y); land.add(tg); trees.set(id, tg); } if (k === "f") for (const [dx, dz, s] of [[-.25, -.2, 1], [.22, .1, .8], [-.1, .28, .65]]) { const tg = trees.get(id); add(tg, "cyl", 0x5b4030, .05, .25, .05, dx, .12, dz); add(tg, "cone", 0x3f7a55, .22 * s, .6 * s, .22 * s, dx, .22 + .3 * s, dz); add(tg, "cone", 0x559064, .15 * s, .42 * s, .15 * s, dx, .42 + .36 * s, dz); }
      if (k === "m") { add(land, "cone", 0x8b8078, .42, .9, .42, x - .1, .7, y - .12); add(land, "cone", 0xe9dfe0, .16, .34, .16, x - .1, 1.0, y - .12); add(land, "cone", 0x6e645f, .26, .5, .26, x + .25, .5, y + .22); }
      if (k === "p") { add(land, "cyl", 0xb0a6bb, .17, .95, .17, x - .22, .47, y - .22); add(land, "box", 0xc6bdd0, .44, .1, .44, x - .22, .97, y - .22); }
      if (k === "F") for (const [dx, dz] of [[-.42, -.42], [.42, -.42], [-.42, .42], [.42, .42]]) add(land, "box", 0xa39079, .14, .5, .14, x + dx, .3, y + dz);
      if (k === "T") { add(land, "box", 0xd9ab4e, .5, .8, .12, x, .6, y - .38, { metalness: .5, roughness: .4 }); add(land, "ball", 0xff9a5c, .08, .08, .08, x, 1.1, y - .38, { emissive: 0xff7a30, emissiveIntensity: 2 }); }
      if (k === "b") for (const dz of [-.46, .46]) add(land, "box", 0x6b4c2c, 1, .22, .06, x, .1, y + dz);
      const m = new THREE.Mesh(geo.tile, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, h + .025, y); m.userData = { x, y }; scene.add(m); marks.set(id, m);
    }
    const field = new THREE.Mesh(new THREE.CircleGeometry(60, 40), mat(0x9bab72)); field.rotation.x = -Math.PI / 2; field.position.set(W / 2, -.5, D / 2); field.receiveShadow = true; land.add(field);
    scene.add(land); ctl.target.set(W / 2 - 1.5, 0, D / 2 - .5); cam.position.set(ctl.target.x, 9, ctl.target.z + 8); sun.position.set(-7, 9, D + 2); sun.target.position.set(W / 2, 0, D / 2);
  }
  const TC = { ally: 0x2f6fd6, enemy: 0xd8403f, friend: 0x3fa566, third: 0xd79a2b };
  // 창은 긴 자루, 활은 휜 띠처럼 겉모습을 이름 그림(이모지)에서 고른다
  function figure(team, emoji, boss) {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b); g.userData.body = b; const c = TC[team] ?? 0x888888, heavy = /🛡|👹/.test(emoji), horse = /🐎/.test(emoji), mage = /🧙|✨|🔮/.test(emoji), steel = { metalness: .6, roughness: .35 };
    const y = horse ? .34 : 0; if (horse) { add(b, "box", 0x6a4733, .26, .26, .62, 0, .36, 0); add(b, "box", 0x6a4733, .16, .4, .18, 0, .56, .34); for (const [x, z] of [[-.09, -.24], [.09, -.24], [-.09, .24], [.09, .24]]) add(b, "box", 0x4c3226, .08, .26, .08, x, .13, z); }
    add(b, "body", c, heavy ? .3 : .23, mage ? .58 : .5, heavy ? .28 : .2, 0, y + .3, 0); add(b, "ball", 0xf0c8a4, .15, .15, .15, 0, y + .7, 0); if (heavy) add(b, "ball", 0xa9acb8, .175, .16, .175, 0, y + .74, 0, steel); else if (mage) add(b, "cone", c, .2, .36, .2, 0, y + .92, 0); else add(b, "ball", team === "enemy" ? 0x2d2028 : 0x7a4a2c, .165, .12, .165, 0, y + .77, -.02);
    const cape = add(b, "box", new THREE.Color(c).multiplyScalar(.6).getHex(), .34, .48, .04, 0, y + .36, -.2); cape.rotation.x = .18;
    if (/🔱/.test(emoji) || heavy) { add(b, "cyl", 0x6b4c2c, .025, 1.1, .025, .3, y + .55, .08); add(b, "cone", 0xdfe3ee, .06, .2, .06, .3, y + 1.18, .08, steel); } else if (/🏹|🎯/.test(emoji)) { const t = new THREE.Mesh(new THREE.TorusGeometry(.28, .025, 5, 12, Math.PI), mat(0x8a5c30)); t.position.set(.28, y + .42, .1); t.rotation.z = -Math.PI / 2; t.castShadow = true; b.add(t); } else if (mage) { add(b, "cyl", 0x6b4c2c, .025, .85, .025, .28, y + .42, .08); add(b, "ball", 0xffd27a, .08, .08, .08, .28, y + .9, .08, { emissive: 0xffa040, emissiveIntensity: 1.5 }); } else if (/🪓/.test(emoji)) { add(b, "cyl", 0x6b4c2c, .03, .7, .03, .3, y + .45, .08); add(b, "box", 0xc9ccd6, .22, .2, .04, .36, y + .74, .08, steel); } else { const s = add(b, "box", 0xe6ebf5, .05, .62, .02, .28, y + .58, .1, steel); s.rotation.x = .35; }
    if (heavy) add(b, "box", 0xb9bccb, .06, .42, .3, -.3, y + .36, .1, steel); if (boss) { const r = add(b, "cone", 0xffd27a, .16, .18, .16, 0, y + 1.0, 0, { metalness: .7, roughness: .3 }); r.rotation.y = .5; b.scale.setScalar(1.2); }
    for (const x of [-.06, .06]) add(b, "box", 0x1c1626, .028, .05, .02, x, y + .69, .145);
    for (const s of [-1, 1]) { const arm = add(b, "box", new THREE.Color(c).multiplyScalar(.85).getHex(), .09, .3, .1, s * .24, y + .42, .05); arm.rotation.z = s * .35; add(b, "ball", 0xf0c8a4, .055, .055, .055, s * .29, y + .28, .08); if (!horse) add(b, "box", 0x3a2a30, .11, .14, .16, s * .1, .06, .03); }
    // 먹선: 뒤집은 껍데기를 살짝 키워 두른다
    for (const m of [...b.children]) if (m.isMesh && m.geometry.type !== "TorusGeometry" && m.scale.x > .04) { const e = new THREE.Mesh(m.geometry, ink); e.position.copy(m.position); e.rotation.copy(m.rotation); const t = m.geometry === geo.box ? .03 : .018; e.scale.set(m.scale.x + t, m.scale.y + t, m.scale.z + t); b.add(e); }
    const ring = new THREE.Mesh(geo.ring, new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .04; g.add(ring); g.userData.ring = ring; return g;
  }
  const COL = [["tg", 0xffd27a, .65], ["mv", 0x58a8ff, .5], ["rd", 0xff5a6e, .4], ["dz", 0xff3d8a, .28]];
  let down = null; const ray = new THREE.Raycaster(), p2 = new THREE.Vector2();
  gl.domElement.addEventListener("pointerdown", (e) => { if (fx.active()) return; down = e.isPrimary ? [e.clientX, e.clientY] : null; });
  gl.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 10) return; down = null; const r = gl.domElement.getBoundingClientRect(); p2.set((e.clientX - r.left) / r.width * 2 - 1, 1 - (e.clientY - r.top) / r.height * 2); ray.setFromCamera(p2, cam);
    const us = [...units.values()].filter((o) => !o.gone); let best = null; for (const o of us) { const q = ray.intersectObject(o.g, true)[0]; if (q && (!best || q.distance < best.d)) best = { d: q.distance, x: o.tx, y: o.ty }; }
    const t = ray.intersectObjects([...marks.values()])[0]; if (!best && t) best = { x: t.object.userData.x, y: t.object.userData.y }; if (best) board.querySelector(`.t[data-x="${best.x}"][data-y="${best.y}"]`)?.click();
  });
  const fx = fights({ THREE, scene, cam, ctl, view, units, hgt }); let aimAt = null, ringOf = null;
  const ringEl = document.createElement("div"); ringEl.className = "bars3"; view.append(ringEl);
  hooks.fight = fx.fight;
  // 초상: 같은 모형을 작은 그림으로 찍어 둔다
  let snap = null; const shots = new Map();
  hooks.face = (team, emoji, boss) => {
    const k = team + emoji + boss; if (shots.has(k)) return shots.get(k); let url = "";
    try { if (!snap) { const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); r.setSize(256, 256); const s = new THREE.Scene(), c = new THREE.PerspectiveCamera(24, 1, .1, 10), l = new THREE.DirectionalLight(0xffe2bd, 2), b = new THREE.DirectionalLight(0xffffff, .4); l.position.set(-2, 2, 3); b.position.set(3, 2, -2); s.add(new THREE.HemisphereLight(0xffffff, 0xb7a3c4, 1.9), l, b); snap = { r, s, c }; }
      const g = figure(team, emoji, boss); g.userData.ring.visible = false; g.rotation.y = -.45; const y = /🐎/.test(emoji) ? .95 : .62; snap.c.position.set(0, y + .12, 1.75); snap.c.lookAt(0, y, 0); snap.s.add(g); snap.r.render(snap.s, snap.c); url = snap.r.domElement.toDataURL("image/png"); snap.s.remove(g); } catch {}
    shots.set(k, url); return url;
  };
  hooks.menu = (m, aim) => {
    aimAt = aim; const id = m?.id ?? null, h = m ? m.items.join("") : "", enter = id !== ringOf || (!!aim) !== (ringEl.dataset.aim === "1"); ringOf = id; ringEl.dataset.aim = aim ? "1" : "0"; if (ringEl.dataset.h === h) return; ringEl.dataset.h = h; const top = ringEl.scrollTop; ringEl.innerHTML = h; ringEl.scrollTop = top; ringEl.classList.toggle("enter", enter);
    ringEl.classList.toggle("wpanel", !!m?.panel); [...ringEl.children].forEach((b, i) => { b.style.setProperty("--i", i); });
  };
  hooks.redraw?.();
  let lastSel = "", goal = null, born = true, cw = 0, ch = 0; const clock = new THREE.Clock(), v = new THREE.Vector3();
  gl.setAnimationLoop(() => {
    const dt = Math.min(.05, clock.getDelta()), now = clock.elapsedTime, w = view.clientWidth, h = view.clientHeight; if (w !== cw || h !== ch) { cw = w; ch = h; gl.setSize(w, h); cam.aspect = w / h; cam.fov = w < h ? 52 : 42; cam.updateProjectionMatrix(); }
    const tiles = [...board.querySelectorAll(".t")], k = tiles.map(kindOf).join(); if (k !== key) { key = k; build(tiles); }
    for (const b of tiles) { const m = marks.get(b.dataset.x + "," + b.dataset.y), c = COL.find(([n]) => b.classList.contains(n)); m.material.opacity += ((c ? c[2] * (.85 + .15 * Math.sin(now * 4)) : 0) - m.material.opacity) * Math.min(1, dt * 12); if (c) m.material.color.setHex(c[1]); }
    for (const t of water) t.position.y = -.39 + Math.sin(now * 1.6 + t.position.x * 2 + t.position.z) * .025;
    const held = new Set([...units.values()].filter((o) => !o.gone).map((o) => o.tx + "," + o.ty)); for (const [id, g] of trees) { const s = g.scale.x + ((held.has(id) ? .38 : 1) - g.scale.x) * Math.min(1, dt * 8); g.scale.setScalar(s); }
    const seen = new Set(); let sel = "";
    for (const n of board.querySelectorAll(".u")) {
      const id = n.dataset.id, x = +n.style.getPropertyValue("--x"), y = +n.style.getPropertyValue("--y"), team = ["ally", "enemy", "friend", "third"].find((t) => n.classList.contains(t)); seen.add(id); let o = units.get(id);
      if (!o || o.team !== team) { if (o) scene.remove(o.g); o = { team, g: figure(team, n.querySelector("q").textContent, !!n.querySelector("sup")), tx: x, ty: y, hp: null }; o.g.position.set(x, hgt.get(x + "," + y) ?? 0, y); o.g.rotation.y = team === "ally" ? 1.57 : -1.57; scene.add(o.g); units.set(id, o); }
      o.tx = x; o.ty = y; o.gone = n.classList.contains("dead"); const p = o.g.position, dx = x - p.x, dz = y - p.z, far = Math.hypot(dx, dz), s = Math.min(1, dt * 11); p.x += dx * s; p.z += dz * s; p.y += ((hgt.get(x + "," + y) ?? 0) + (far > .08 ? .12 * Math.abs(Math.sin(now * 14)) : 0) - p.y) * Math.min(1, dt * 10);
      if (far > .12) { const a = Math.atan2(dx, dz); o.g.rotation.y += Math.atan2(Math.sin(a - o.g.rotation.y), Math.cos(a - o.g.rotation.y)) * Math.min(1, dt * 12); }
      const hp = n.querySelector(".hpb").style.width; if (o.hp && hp !== o.hp && parseFloat(hp) < parseFloat(o.hp)) o.shake = .3; o.hp = hp; o.shake = Math.max(0, (o.shake ?? 0) - dt);
      const bd = o.g.userData.body; bd.position.x = (o.shake ? Math.sin(now * 60) * o.shake * .3 : 0) + (o.dodge ?? 0); bd.position.z = o.lunge ?? 0; bd.rotation.y = o.twist ?? 0; bd.position.y = Math.sin(now * 2.2 + x * 3) * .015 + (o.hop ?? 0); bd.rotation.x = o.gone ? Math.max(-1.4, bd.rotation.x - dt * 5) : (o.lean ?? 0); const isSel = n.classList.contains("sel"), hot = n.classList.contains("aim"), ready = n.classList.contains("ready"); if (isSel) sel = id + x + y;
      const ring = o.g.userData.ring; ring.material.color.setHex(hot ? 0xff2d4d : isSel ? 0xffd27a : TC[team]); if (isSel && !o.was) o.sq = 1; o.was = isSel; o.sq = (o.sq ?? 0) * Math.exp(-dt * 5); const q = Math.sin((1 - o.sq) * 16) * o.sq * .32; o.g.scale.set(1 - q * .6, 1 + q, 1 - q * .6); ring.scale.setScalar(isSel || hot || ready ? 1.12 + .1 * Math.sin(now * 5) : 1); ring.material.opacity = n.classList.contains("done") ? .25 : 1;
      v.set(p.x, p.y + 1.25, p.z).project(cam); n.style.left = (v.x + 1) / 2 * w + "px"; n.style.top = (1 - v.y) / 2 * h + "px"; n.style.visibility = v.z > 1 || (fx.active() && !fx.has(id)) ? "hidden" : "";
      if (isSel && sel !== lastSel) goal = new THREE.Vector3(x, 0, y);
    }
    if (aimAt && !fx.active()) { const A = units.get(aimAt.a), T = units.get(aimAt.d); if (A && T) { fx.face(A, T); fx.face(T, A); fx.frame(A, T, 1.7, .9); } } else if (!fx.active()) fx.release();
    if (born && units.size) { born = false; const l = [...units.values()].filter((o) => o.team === "ally"), m = l.reduce((q, o) => q.add(o.g.position), new THREE.Vector3()).divideScalar(l.length || 1); const s = m.sub(ctl.target).setY(0); s.x += cam.aspect < 1 ? .35 : 2.5; ctl.target.add(s); cam.position.add(s); }
    for (const [id, o] of units) if (!seen.has(id)) { scene.remove(o.g); units.delete(id); } lastSel = sel;
    if (goal && !down) { const st = goal.clone().sub(ctl.target).multiplyScalar(Math.min(1, dt * 5)); st.y = 0; ctl.target.add(st); cam.position.add(st); if (st.length() < .004) goal = null; } else if (down) goal = null;
    ctl.target.x = Math.max(0, Math.min(W, ctl.target.x)); ctl.target.z = Math.max(0, Math.min(D, ctl.target.z)); if (!fx.tick(dt)) ctl.update(); gl.render(scene, cam);
  });
  addEventListener("pointerup", () => { setTimeout(() => { down = null; }); }); addEventListener("pointercancel", () => { down = null; });
}
