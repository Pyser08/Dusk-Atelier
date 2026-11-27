// 사냥꾼 인형 미리보기: /hunter  — 왼쪽부터 기존 인형(비교용) · 남 · 여
import * as THREE from "three"; import { makeVox } from "./voxkit.js"; import { makeHunter, poseHunter } from "./hunter.js";
const $ = (q) => document.querySelector(q), gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.shadowMap.enabled = true; $("#v").append(gl.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3a3450); const cam = new THREE.PerspectiveCamera(28, 1, .1, 80);
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x6a5060, 1.9)); const sun = new THREE.DirectionalLight(0xffe2bd, 3.2); sun.position.set(-3, 7, 5); sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); scene.add(sun);
const fl = new THREE.Mesh(new THREE.CircleGeometry(12, 40), new THREE.MeshLambertMaterial({ color: 0x6a6078 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
const old = makeVox({ outfit: "under", sex: "m" }); old.root.position.x = -2.2; scene.add(old.root);
const hm = makeHunter({ sex: "m" }), hf = makeHunter({ sex: "f", hair: 0x8a4f2a }); hm.root.position.x = -.4; hf.root.position.x = 1.6; scene.add(hm.root, hf.root);
// 머리 높이 눈금(7칸마다)
const tick = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25 }); for (let i = 0; i <= 6.5; i += .5) { const y = hm.h - i * (hm.h / 6.5), g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.3, y, -1), new THREE.Vector3(2.9, y, -1)]); scene.add(new THREE.Line(g, tick)); }
let act = new URLSearchParams(location.search).get("a") ?? "idle", yaw = +(new URLSearchParams(location.search).get("yaw") ?? 0), drag = null; document.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => (act = b.dataset.a))); $("#spin").onclick = () => (yaw += Math.PI / 4);
gl.domElement.onpointerdown = (e) => (drag = e.clientX); onpointerup = () => (drag = null); onpointermove = (e) => { if (drag != null) { yaw += (e.clientX - drag) * .01; drag = e.clientX; } };
const size = () => { const r = $("#v").getBoundingClientRect(); gl.setSize(r.width, r.height); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); }; addEventListener("resize", size); size();
$("#i").textContent = `남 ${hm.tris}면 · 여 ${hf.tris}면 · 6.5등신`;
const clock = new THREE.Clock(); gl.setAnimationLoop(() => { const t = clock.getElapsedTime(); for (const h of [hm, hf]) { poseHunter(h, act, t); h.root.rotation.y = yaw; } old.root.rotation.y = yaw; cam.position.set(0, 1.5, 9.5); cam.lookAt(-.2, 1.25, 0); gl.render(scene, cam); });
