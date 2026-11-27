// 몬스터 파생 대검 견본 비교: /gsdesign — 대검 셋을 세워 두고, 사냥꾼이 각각 든 모습 + 원본 몬스터
import * as THREE from "three"; import { makeGreatSword } from "./greatsword.js"; import { makeHunter } from "./hunter.js"; import { GSPlayer } from "./gsanim.js"; import { makeCrystalWing } from "./crystalwing.js";
const $ = (q) => document.querySelector(q), Q = new URLSearchParams(location.search), gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.shadowMap.enabled = true; $("#v").append(gl.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3a3450); const cam = new THREE.PerspectiveCamera(30, 1, .1, 200);
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x6a5060, 1.9)); const sun = new THREE.DirectionalLight(0xffe2bd, 3); sun.position.set(-4, 9, 7); sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); scene.add(sun);
const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshLambertMaterial({ color: 0x6a6078 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
const KINDS = (Q.get("k") ?? "cw_wing,cw_crest,cw_tail").split(","), view = Q.get("view") ?? "both", stands = [], players = [];
KINDS.forEach((k, i) => { const x = (i - (KINDS.length - 1) / 2) * (view === "sword" ? 2.2 : 3.2);
  if (view !== "held") { const g = makeGreatSword(k); g.obj.position.set(x - (view === "both" ? .9 : 0), .55, 0); g.obj.scale.setScalar(view === "both" ? 1 : 1.5); scene.add(g.obj); stands.push(g); }
  if (view !== "sword") { const h = makeHunter({ sex: i % 2 ? "f" : "m", hair: i % 2 ? 0x8a4f2a : undefined }), g = makeGreatSword(k); h.root.add(g.obj); h.root.position.set(x + (view === "both" ? .6 : 0), 0, .5); h.root.rotation.y = +(Q.get("hy") ?? 1.2); scene.add(h.root); const p = new GSPlayer(h, g); p.play(Q.get("c") ?? "drawnIdle"); players.push(p); }
  const lb = document.createElement("div"); lb.className = "lb"; lb.textContent = makeGreatSword(k).n; lb.style.left = (50 + (i - (KINDS.length - 1) / 2) * 31) + "%"; $("#lbl").append(lb); });
if (Q.has("mon")) { const w = makeCrystalWing(); w.root.scale.setScalar(.35); w.root.position.set(0, 0, -6); w.act("idle", 1); scene.add(w.root); }
for (const p of players) for (let t = 0; t < +(Q.get("t") ?? .5); t += 1 / 60) p.update(1 / 60, { t });
const size = () => { const r = $("#v").getBoundingClientRect(); gl.setSize(r.width, r.height); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); }; addEventListener("resize", size); size();
let yaw = +(Q.get("yaw") ?? 0), drag = null; gl.domElement.onpointerdown = (e) => (drag = e.clientX); onpointerup = () => (drag = null); onpointermove = (e) => { if (drag != null) { yaw += (e.clientX - drag) * .01; drag = e.clientX; } };
const draw = () => { const R = +(Q.get("r") ?? 13); cam.position.set(Math.sin(yaw) * R, 2.2, Math.cos(yaw) * R); cam.lookAt(0, 1.25, 0); gl.render(scene, cam); };
const clock = new THREE.Clock(); let el = 0; gl.setAnimationLoop(() => { const dt = Math.min(.05, clock.getDelta()); el += dt; if (!Q.has("still")) { for (const s of stands) s.obj.rotation.y += dt * .4; for (const p of players) p.update(dt, { t: el }); } draw(); });
window.__shot = () => { draw(); return gl.domElement.toDataURL("image/png"); };
