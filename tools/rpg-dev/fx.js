// 타격 효과(오리지널): 흙먼지 · 바닥 갈라짐 · 충격파 고리 · 불똥 · 화면 흔들림 · 칼 궤적
import * as THREE from "three";
const { random: R, sin, cos, PI, max, min } = Math;
export class FX {
  constructor(scene) {
    this.scene = scene; this.shakeK = 0; this.parts = []; this.decals = []; this.rings = [];
    const N = 420; this.pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ vertexColors: false }), N); this.pm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); this.pm.count = 0; this.pm.frustumCulled = false; scene.add(this.pm); this.N = N; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._c = new THREE.Color();
    this.crackTex = makeCrack(); this.trailPts = []; this.trail = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false, vertexColors: true })); this.trail.frustumCulled = false; scene.add(this.trail);
  }
  shake(k) { this.shakeK = max(this.shakeK, k); }
  offset(t) { const k = this.shakeK; return new THREE.Vector3(sin(t * 91) * k, cos(t * 77) * k * .8, sin(t * 63 + 1) * k * .5); }
  // 흙먼지: 땅에서 튀어 오르는 복셀 조각들
  dust(p, pw, col = 0x9a8c7a) { for (let i = 0; i < 18 + pw * 16; i++) { const a = R() * PI * 2, s = (1 + R() * 2) * (.6 + pw * .4); this.parts.push({ p: p.clone().add(new THREE.Vector3(cos(a) * R() * .3, .05, sin(a) * R() * .3)), v: new THREE.Vector3(cos(a) * s, 1.5 + R() * 2.5 * pw, sin(a) * s), life: .6 + R() * .7, t: 0, s: .06 + R() * .09 * pw, c: R() < .3 ? 0xc9bca8 : col, g: 6 }); } }
  sparks(p, pw, col = 0xfff0b0) { for (let i = 0; i < 8 + pw * 6; i++) { const v = new THREE.Vector3(R() - .5, R() - .2, R() - .5).normalize().multiplyScalar(3 + R() * 4); this.parts.push({ p: p.clone(), v, life: .25 + R() * .25, t: 0, s: .04 + R() * .04, c: col, g: 2 }); } }
  // 바닥 갈라짐: 칼끝 자리에 금이 간 자국이 남았다가 사라진다
  crack(p, yaw, pw) { const s = .9 + pw * .55, m = new THREE.Mesh(new THREE.PlaneGeometry(s * 2, s * 2), new THREE.MeshBasicMaterial({ map: this.crackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.set(-PI / 2, 0, yaw); m.position.set(p.x, .012, p.z); this.scene.add(m); this.decals.push({ m, t: 0, life: 3.5 }); }
  ring(p, pw, col = 0xf2e6c8) { const m = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -PI / 2; m.position.set(p.x, .03, p.z); this.scene.add(m); this.rings.push({ m, t: 0, life: .35 + pw * .08, s: .4 + pw * .55 }); }
  /** 타격 한 번: 땅에 닿으면 흙먼지·갈라짐·고리, 아니면 불똥. 세기만큼 흔들림 */
  hit(p, pw, ground, yaw = 0) { if (ground) { const g = p.clone(); g.y = 0; this.dust(g, pw); this.crack(g, yaw, pw); this.ring(g, pw); } else this.sparks(p, pw); this.shake(.02 + pw * .025); }
  // 칼 궤적: 칼 밑동·끝 위치를 기록해 리본으로
  trailPush(a, b, on) { this.trailPts.unshift({ a: a.clone(), b: b.clone(), on }); if (this.trailPts.length > 14) this.trailPts.pop(); }
  update(dt) {
    this.shakeK *= Math.exp(-dt * 9);
    let n = 0; for (const q of this.parts) { q.t += dt; if (q.t > q.life) continue; q.v.y -= q.g * dt; q.p.addScaledVector(q.v, dt); if (q.p.y < 0) { q.p.y = 0; q.v.multiplyScalar(.3); } const k = 1 - q.t / q.life, s = q.s * (.4 + k * .6); this._m.compose(q.p, this._q, new THREE.Vector3(s, s, s)); if (n < this.N) { this.pm.setMatrixAt(n, this._m); this.pm.setColorAt(n, this._c.setHex(q.c)); n++; } }
    this.parts = this.parts.filter((q) => q.t < q.life); this.pm.count = n; this.pm.instanceMatrix.needsUpdate = true; if (this.pm.instanceColor) this.pm.instanceColor.needsUpdate = true;
    for (const d of this.decals) { d.t += dt; d.m.material.opacity = min(1, (d.life - d.t) / 1.2); if (d.t > d.life) { this.scene.remove(d.m); d.m.geometry.dispose(); d.m.material.dispose(); } } this.decals = this.decals.filter((d) => d.t <= d.life);
    for (const r of this.rings) { r.t += dt; const k = r.t / r.life; r.m.scale.setScalar(.2 + k * r.s * 3); r.m.material.opacity = .7 * (1 - k); if (k >= 1) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); } } this.rings = this.rings.filter((r) => r.t < r.life);
    // 궤적 리본: 빠르게 휘두를 때만 보이고 꼬리로 갈수록 옅어진다
    const P = this.trailPts.filter((q) => q.on); if (P.length < 2) { this.trail.visible = false; return; } this.trail.visible = true; const pos = [], col = [], idx = [];
    P.forEach((q, i) => { pos.push(q.a.x, q.a.y, q.a.z, q.b.x, q.b.y, q.b.z); const k = 1 - i / P.length; col.push(k, k, k, k, k, k); if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } });
    const g = this.trail.geometry; g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeBoundingSphere();
  }
}
// 갈라짐 무늬: 가운데서 뻗는 들쭉날쭉한 금
function makeCrack() { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const grd = g.createRadialGradient(128, 128, 4, 128, 128, 90); grd.addColorStop(0, "rgba(40,30,28,.75)"); grd.addColorStop(1, "rgba(40,30,28,0)"); g.fillStyle = grd; g.fillRect(0, 0, 256, 256); g.strokeStyle = "rgba(25,18,16,.95)"; g.lineCap = "square";
  for (let i = 0; i < 9; i++) { let a = i / 9 * PI * 2 + R() * .4, x = 128, y = 128, w = 6; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { a += (R() - .5) * .8; const l = 10 + R() * 12; x += cos(a) * l; y += sin(a) * l; g.lineWidth = w; g.lineTo(x, y); w = max(1, w * .75); if (R() < .3) { const b = a + (R() < .5 ? 1 : -1) * (.6 + R() * .5); g.moveTo(x, y); g.lineTo(x + cos(b) * 14, y + sin(b) * 14); g.moveTo(x, y); } } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t; }
