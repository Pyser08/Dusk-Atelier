// 정비 화면 3D 미리보기: 입은 방어구·무기 그대로 인형을 세워 돌려 본다. 끌면 돌고, 손을 떼면 천천히 계속 돈다.
import * as THREE from "three";
import { makeVox, Player, stanceOf } from "./voxkit.js";
import { gearOf } from "./voxbattle.js";
import { raceOpt, SIZE } from "./voxrace.js";

export function createPreview() {
  const gl = new THREE.WebGLRenderer({ antialias: true, alpha: true }); gl.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1)); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.95;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(26, 0.7, 0.1, 40);
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x3a2a40, 1.25)); const sun = new THREE.DirectionalLight(0xffe2bd, 2.2); sun.position.set(-2, 5, 4); scene.add(sun); const rim = new THREE.DirectionalLight(0x8ab8ff, 1.6); rim.position.set(3, 3, -4); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.64, 48), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.5 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; scene.add(ring);
  let fig = null, player = null, ang = 0.5, spin = 0.35, drag = null, sig = "", raf = 0, last = 0, box = null, h = 1.9;
  const el = gl.domElement; el.style.cssText = "width:100%;height:100%;display:block;touch-action:none;cursor:grab";
  el.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, a: ang }; el.setPointerCapture?.(e.pointerId); spin = 0; });
  el.addEventListener("pointermove", (e) => { if (drag) ang = drag.a + (e.clientX - drag.x) * 0.012; });
  const up = () => { if (drag) { drag = null; spin = 0.35; } }; el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  function size() { if (!box) return; const w = box.clientWidth || 120, hh = box.clientHeight || 180; gl.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); }
  function loop(t) { raf = requestAnimationFrame(loop); if (!box?.isConnected) return; const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; if (!drag) ang += spin * dt; if (fig) fig.rotation.y = ang; player?.tick(dt); cam.position.set(0, h * 0.6, h * 2.6); cam.lookAt(0, h * 0.47, 0); gl.render(scene, cam); }
  return {
    /** 화면 칸에 붙이기(다시 그려도 같은 캔버스를 옮겨 단다) */
    mount(node) { box = node; node.append(el); size(); if (!raf) raf = requestAnimationFrame(loop); },
    /** info = { outfit, dye, hair, sex, race, w, look, tier, elem } */
    set(info) {
      const k = JSON.stringify(info); if (k === sig) return; sig = k; if (fig) scene.remove(fig);
      const ro = raceOpt(info.race || "human"), gear = gearOf(info.look || {}, info.w || "");
      const v = makeVox({ outfit: info.outfit || "under", sex: info.sex === "f" ? "f" : "m", gear, tier: info.look?.tier ?? 1, elem: info.look?.elem ?? "", race: ro.race, skin: ro.skin, hair: info.hair || ro.hair, dye: info.dye || {} });
      fig = v.root; const sc = info.race ? SIZE(info.race) : 1; fig.scale.setScalar(sc); scene.add(fig); player = new Player(v, { stance: stanceOf(gear) }); fig.updateMatrixWorld(true); const bb = new THREE.Box3(); v.mesh.geometry.computeBoundingBox(); bb.copy(v.mesh.geometry.boundingBox).applyMatrix4(v.mesh.matrixWorld); h = Math.max(0.5, bb.max.y - Math.min(0, bb.min.y)) * 1.08; floor.scale.setScalar(h / 1.9); ring.scale.setScalar(h / 1.9);
    },
    resize: size,
    dispose() { cancelAnimationFrame(raf); raf = 0; gl.dispose(); },
  };
}
