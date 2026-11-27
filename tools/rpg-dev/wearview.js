// 옷 파츠 미리보기(/wear): 슬롯마다 입히고 벗기고, 색 슬롯을 바꿔 본다
import * as THREE from "three";
import { makeVox, Player } from "./voxkit.js";
import { PARTS, SLOTS, DEFAULT_WEAR, WEAR_PRESETS as PRESETS } from "./wear.js";

const $ = (q) => document.querySelector(q), gl = new THREE.WebGLRenderer({ antialias: true }); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.1; $("#v").append(gl.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x24202a); const cam = new THREE.PerspectiveCamera(30, 1, .1, 60);
scene.add(new THREE.HemisphereLight(0xeef0ff, 0x5a5060, 2)); const sun = new THREE.DirectionalLight(0xfff0dd, 2.6); sun.position.set(-3, 6, 5); scene.add(sun); const bk = new THREE.DirectionalLight(0x9ab0ff, 1); bk.position.set(4, 4, -6); scene.add(bk);
const fl = new THREE.Mesh(new THREE.CircleGeometry(6, 40), new THREE.MeshLambertMaterial({ color: 0x3a3442 })); fl.rotation.x = -Math.PI / 2; scene.add(fl);
const st = { sex: "f", wear: DEFAULT_WEAR("f"), skin: 0xf0c8a8, hair: 0x3a2a24 }; let doll = null, player = null, ang = .4, auto = true, drag = null, fit = { y: 1, d: 5 };
const hex = (n) => "#" + n.toString(16).padStart(6, "0");

function build() {
  if (doll) { scene.remove(doll.root); }
  try { doll = makeVox({ outfit: "under", sex: st.sex, skin: st.skin, hair: st.hair, wear: st.wear }); } catch (e) { $("#err").textContent = "만들기 실패: " + e.message; console.error(e); return; }
  $("#err").textContent = ""; player = new Player(doll, { stance: "idle" }); scene.add(doll.root); doll.root.rotation.y = 0; doll.root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(doll.root), hgt = bb.max.y - bb.min.y || 2; fit = { y: bb.min.y + hgt * .52, d: hgt * 2.3 }; doll.root.rotation.y = ang;
}
function panel() {
  const n = $("#p"); n.innerHTML = `<div class=row><b>성별</b>${["f", "m"].map((s) => `<button data-sex=${s} class="${st.sex === s ? "on" : ""}">${s === "f" ? "여" : "남"}</button>`).join("")}</div>
<div class=row><b>차림</b>${Object.keys(PRESETS).map((k) => `<button data-pre="${k}">${k}</button>`).join("")}<button data-pre="벗기기">모두 벗기기</button></div>
${SLOTS.map(([k, name]) => { const w = st.wear[k], p = w && PARTS[w.id]; const opts = Object.entries(PARTS).filter(([, q]) => q.slot === k && (q.sx === "a" || q.sx === st.sex || true));
  return `<div class=slot><b>${name}</b><select data-slot=${k}><option value="">— 안 입음 —</option>${opts.map(([id, q]) => `<option value=${id} ${w?.id === id ? "selected" : ""}>${q.n}${q.sx !== "a" && q.sx !== st.sex ? " *" : ""}</option>`).join("")}</select>${p ? p.cn.map((cn, i) => `<label>${cn}<input type=color data-slot=${k} data-ci=${i} value="${hex(w.c?.[i] ?? p.cd[i] ?? (i === 0 ? st.hair : i === 1 ? 0x7a5a4a : 0x2a2a34))}"></label>`).join("") : ""}</div>`; }).join("")}`;
}
$("#p").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.sex) { st.sex = b.dataset.sex; st.wear = DEFAULT_WEAR(st.sex); } if (b.dataset.pre) st.wear = b.dataset.pre === "벗기기" ? {} : PRESETS[b.dataset.pre](st.sex); panel(); build(); });
$("#p").addEventListener("change", (e) => { const t = e.target, k = t.dataset.slot; if (!k) return; if (t.tagName === "SELECT") { if (t.value) st.wear[k] = { id: t.value }; else delete st.wear[k]; panel(); } else { const w = st.wear[k]; if (!w) return; const p = PARTS[w.id]; w.c = p.cd.map((d, i) => w.c?.[i] ?? d ?? null); w.c[+t.dataset.ci] = parseInt(t.value.slice(1), 16); } build(); });
$("#v").addEventListener("pointerdown", (e) => { drag = e.clientX; auto = false; }); addEventListener("pointerup", () => { drag = null; }); addEventListener("pointermove", (e) => { if (drag == null) return; ang += (e.clientX - drag) * .01; drag = e.clientX; });
const clock = new THREE.Clock(); let cw = 0, ch = 0;
gl.setAnimationLoop(() => { const dt = Math.min(.05, clock.getDelta()), v = $("#v"), w = v.clientWidth, h = v.clientHeight; if (w !== cw || h !== ch) { cw = w; ch = h; gl.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); } if (auto) ang += dt * .5; if (doll) { doll.root.rotation.y = ang; player?.tick(dt); } cam.position.set(0, fit.y + fit.d * .12, fit.d); cam.lookAt(0, fit.y, 0); gl.render(scene, cam); });
panel(); build();
window.__wear = { st, build, PARTS, view: (a) => { auto = false; ang = a; } };
