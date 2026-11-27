// 사냥 시험장: /hunt — 와일즈 PC 조작으로 사냥꾼 + 대검을 직접 움직인다
import * as THREE from "three"; import { makeHunter, HU } from "./hunter.js"; import { makeGreatSword } from "./greatsword.js"; import { GSPlayer, CLIPS } from "./gsanim.js"; import { GSCombo } from "./gscombo.js"; import { bindInput } from "./keymap.js"; import { FX } from "./fx.js";
const $ = (q) => document.querySelector(q), Q = new URLSearchParams(location.search), gl = new THREE.WebGLRenderer({ antialias: true }); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.shadowMap.enabled = true; $("#v").append(gl.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3a3450); scene.fog = new THREE.Fog(0x3a3450, 25, 60); const cam = new THREE.PerspectiveCamera(50, 1, .1, 120);
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x6a5060, 1.8)); const sun = new THREE.DirectionalLight(0xffe2bd, 3); sun.position.set(-6, 12, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 }); scene.add(sun, sun.target);
// 바닥: 복셀 느낌 격자 타일
{ const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 96 + ((x * 7 + y * 13) % 5) * 5; g.fillStyle = `rgb(${v + 6},${v - 4},${v + 18})`; g.fillRect(x * 8, y * 8, 8, 8); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); t.magFilter = THREE.NearestFilter; const fl = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ map: t })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl); }
// 허수아비: 맞으면 붉게 번쩍이고 숫자가 뜬다
const dummy = new THREE.Group(); { const m = new THREE.MeshLambertMaterial({ color: 0x8a6448 }); const post = new THREE.Mesh(new THREE.BoxGeometry(.35, 2.6, .35), m); post.position.y = 1.3; const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, .8), new THREE.MeshLambertMaterial({ color: 0xc9b48a })); body.position.y = 2.1; const head = new THREE.Mesh(new THREE.BoxGeometry(.8, .8, .8), new THREE.MeshLambertMaterial({ color: 0xd8c8a0 })); head.position.y = 3.3; for (const o of [post, body, head]) { o.castShadow = true; dummy.add(o); } dummy.userData.mats = [body.material, head.material]; } dummy.position.set(0, 0, 4.5); scene.add(dummy);
const h = makeHunter({ sex: Q.get("sex") ?? "m", hair: Q.get("sex") === "f" ? 0x8a4f2a : undefined }), gs = makeGreatSword(Q.get("gs") ?? "iron"); h.root.add(gs.obj); scene.add(h.root);
const P = new GSPlayer(h, gs), inp = bindInput(gl.domElement, (ev, code, dbl) => (ev === "down" ? onDown(code, dbl) : onUp(code))), C = new GSCombo(P, inp.held), fx = new FX(scene);
// ── 상태 ──
let yaw = 0, camYaw = Math.PI, camPitch = .32, roll = null; const vel = new THREE.Vector3(); let phase = 0, amt = 0;
function onDown(code, dbl) { if (code === "Space" && !roll && (C.free() || P.cur === "drawnIdle")) { const d = wishDir(); roll = { t: 0, dir: d.lengthSq() ? d.normalize() : new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)) }; yaw = Math.atan2(roll.dir.x, roll.dir.z); return; } if (roll) return; const before = P.cur; C.down(code, dbl); if (P.cur !== before) faceInput(); }
function onUp(code) { if (roll) return; C.up(code); }
const wishDir = () => { const H = inp.held, f = (H.has("KeyW") ? 1 : 0) - (H.has("KeyS") ? 1 : 0), s = (H.has("KeyD") ? 1 : 0) - (H.has("KeyA") ? 1 : 0), fw = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw)), rt = new THREE.Vector3(-fw.z, 0, fw.x); return fw.multiplyScalar(f).add(rt.multiplyScalar(s)); };
function faceInput() { const d = wishDir(); if (d.lengthSq()) yaw = Math.atan2(d.x, d.z); }
// 카메라: 화면을 누르면 마우스 잠금 → 마우스로 둘러보기
gl.domElement.addEventListener("pointerdown", () => { if (document.pointerLockElement !== gl.domElement) gl.domElement.requestPointerLock?.(); });
addEventListener("mousemove", (e) => { if (document.pointerLockElement === gl.domElement) { camYaw -= e.movementX * .0032; camPitch = Math.max(-.1, Math.min(1.1, camPitch + e.movementY * .0025)); } });
// 모으기 단계: 칼이 단계마다 번쩍
const gmat = gs.obj.children[0].material; let glow = 0; C.onLevel = (lv) => { glow = 1; flash(lv ? `모으기 ${lv}단계` : "넘침"); };
const hud = $("#hud"), flash = (t) => { const d = document.createElement("div"); d.className = "pop"; d.textContent = t; hud.append(d); setTimeout(() => d.remove(), 700); };
P.onHit = (hit) => { const tip = gs.obj.localToWorld(gs.pt("tip")), base = gs.obj.localToWorld(new THREE.Vector3(0, .5, 0)), where = hit.ground ? tip : tip.clone().lerp(base, .35); fx.hit(where, hit.pw + (C.relLv ?? 0) * .3, hit.ground, yaw);
  const dp = dummy.position.clone(); dp.y = where.y; if (where.distanceTo(dp) < 2.4 || base.distanceTo(dp) < 2) { for (const m of dummy.userData.mats) m.emissive.setHex(0xff3020); setTimeout(() => dummy.userData.mats.forEach((m) => m.emissive.setHex(0)), 90); const n = Math.round((40 + hit.pw * 45) * (1 + (C.relLv ?? 0) * .35)); const d = document.createElement("div"); d.className = "dmg"; d.textContent = n; hud.append(d); setTimeout(() => d.remove(), 800); } };
$("#offset").onchange = (e) => (C.opt.offsetOK = e.target.checked); $("#soft").onchange = (e) => (C.opt.soft = e.target.checked);
const size = () => { const r = $("#v").getBoundingClientRect(); gl.setSize(r.width, r.height); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); }; addEventListener("resize", size); size();
const clock = new THREE.Clock(); let el = 0;
function frame(dt, draw = true) { el += dt; C.update(dt);
  // 이동: 납도 중엔 달리기(Shift 대시), 발도 중엔 천천히 걷기. 기술 중엔 못 움직인다
  const d = wishDir(), canMove = !roll && (P.cur === "idle" || P.cur === "drawnIdle"), sheathed = P.cur === "idle", dash = sheathed && inp.held.has("ShiftLeft"), sp = sheathed ? (dash ? 6.2 : 4.2) : 1.9;
  if (canMove && d.lengthSq()) { d.normalize(); const ty = Math.atan2(d.x, d.z); let dy = ((ty - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; yaw += dy * Math.min(1, dt * 12); vel.lerp(d.multiplyScalar(sp), Math.min(1, dt * 10)); } else vel.multiplyScalar(Math.exp(-dt * 12));
  const v = vel.length(); amt += ((canMove ? Math.min(1, v / 3.2) : 0) - amt) * Math.min(1, dt * 8); phase += dt * (5 + v * 1.6);
  h.root.position.addScaledVector(vel, dt); h.root.rotation.y = yaw;
  // 기술의 전진량
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); if (P.moveDelta) h.root.position.addScaledVector(fwd, P.moveDelta * HU);
  // 구르기
  let o = { t: el, gait: { phase, amt } }; if (roll) { roll.t += dt; const k = Math.min(1, roll.t / .55); h.root.position.addScaledVector(roll.dir, dt * 6.5 * (1 - k * .6)); o.roll = k; if (k >= 1) roll = null; }
  // 허수아비와 겹치지 않게
  const dd = h.root.position.clone().sub(dummy.position); dd.y = 0; if (dd.length() < 1.1) h.root.position.add(dd.setLength(1.1 - dd.length()));
  P.update(dt, o);
  // 칼 궤적: 칼이 빠르게 움직일 때만
  const a = gs.obj.localToWorld(new THREE.Vector3(0, .35, 0)), b = gs.obj.localToWorld(gs.pt("tip")); const spd = P._lastTip ? b.distanceTo(P._lastTip) / dt : 0; P._lastTip = b.clone(); fx.trailPush(a, b, spd > 9 && P.drawn); fx.update(dt);
  glow *= Math.exp(-dt * 5); const lvc = [0, .25, .5, .85][C.isCharging() ? C.lv : 0]; gmat.emissive.setRGB(1, .85, .5).multiplyScalar(Math.max(glow, lvc * (.55 + .45 * Math.sin(el * 12))) * .55);
  // 카메라: 사냥꾼 뒤에서, 흔들림 더하기
  const tgt = h.root.position.clone().add(new THREE.Vector3(0, 1.7, 0)), R = 7.5, cp = new THREE.Vector3(Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch)).multiplyScalar(R).add(tgt); cam.position.lerp(cp, Math.min(1, dt * 12)).add(fx.offset(el)); cam.lookAt(tgt);
  sun.position.copy(h.root.position).add(new THREE.Vector3(-6, 12, 8)); sun.target.position.copy(h.root.position);
  $("#st").innerHTML = `<b>${CLIPS[P.cur]?.n ?? P.cur}</b> · 모으기 ${C.isCharging() ? "●".repeat(C.lv) + "○".repeat(3 - C.lv) : "-"} · 단계 ${C.stage}<br><small>${C.log.map((n) => CLIPS[n]?.n ?? n).join(" ← ")}</small>`;
  if (draw) gl.render(scene, cam); }
let manual = false; gl.setAnimationLoop(() => { const dt = Math.min(.05, clock.getDelta()); if (!manual) frame(dt); });
// 시험용: 프레임을 직접 넘긴다(초)
window.__hunt = { step: (sec) => { manual = true; for (let t = 0; t < sec; t += 1 / 60) frame(1 / 60, t + 1 / 60 >= sec); }, P, C, h, fx, held: inp.held, setYaw: (y) => (camYaw = y), press: (c) => { inp.held.add(c); onDown(c); }, release: (c) => { inp.held.delete(c); onUp(c); } };
