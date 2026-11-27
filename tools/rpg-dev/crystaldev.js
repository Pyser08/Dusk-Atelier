// 유리날개룡 미리보기: /crystal — 사냥꾼과 크기 비교 · 빛 게이지 슬라이더
import * as THREE from "three"; import { makeHunter, poseHunter } from "./hunter.js"; import { makeCrystalWing } from "./crystalwing.js";
const $ = (q) => document.querySelector(q), Q = new URLSearchParams(location.search), gl = new THREE.WebGLRenderer({ antialias: true }); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.shadowMap.enabled = true; $("#v").append(gl.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3a3450); scene.fog = new THREE.Fog(0x3a3450, 30, 70); const cam = new THREE.PerspectiveCamera(32, 1, .1, 200);
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x6a5060, 1.8)); const sun = new THREE.DirectionalLight(0xffe2bd, 3.2); sun.position.set(-6, 14, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); scene.add(sun);
const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshLambertMaterial({ color: 0x6a6078 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
const w = makeCrystalWing(), h = makeHunter({ sex: "m" }); h.root.position.set(4.5, 0, 5); h.root.rotation.y = -2.4; scene.add(w.root, h.root);
let act = Q.get("a") ?? "idle", tAt = +(Q.get("t") ?? -1); document.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => { act = b.dataset.a; t0 = clock.getElapsedTime(); })); let t0 = 0;
let light = +(Q.get("light") ?? 0), yaw = +(Q.get("yaw") ?? .6), auto = Q.has("auto"), drag = null; $("#l").value = light * 100; $("#l").oninput = (e) => { light = e.target.value / 100; auto = false; }; $("#auto").onclick = () => (auto = !auto);
gl.domElement.onpointerdown = (e) => (drag = e.clientX); onpointerup = () => (drag = null); onpointermove = (e) => { if (drag != null) { yaw += (e.clientX - drag) * .01; drag = e.clientX; } };
const size = () => { const r = $("#v").getBoundingClientRect(); gl.setSize(r.width, r.height); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); }; addEventListener("resize", size); size();
const clock = new THREE.Clock(); gl.setAnimationLoop(() => { const t = clock.getElapsedTime(); if (auto) { light = (Math.sin(t * .5) + 1) / 2; $("#l").value = light * 100; } w.setLight(light); const lt = tAt >= 0 ? tAt : t - t0; if (act !== "rest") w.act(act, lt, act === "turn" ? { dir: 1 } : undefined); else for (const b of w.rig.bones) b.quaternion.identity(); poseHunter(h, "idle", t);
  const st = light < .3 ? "흐림" : light < .8 ? "맑음" : "투명"; $("#i").textContent = `빛 게이지 ${Math.round(light * 100)}% · ${st} · ${w.tris}면`;
  const R = 22; cam.position.set(Math.sin(yaw) * R, 7, Math.cos(yaw) * R); cam.lookAt(0, 3, 0); gl.render(scene, cam); });
