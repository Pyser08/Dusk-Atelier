// 비룡형 공용 뼈대 + 공용 동작. 비율값(params)만 바꾸면 체형이 달라지고, 동작은 모든 비룡이 같이 쓴다
// 쉬는 자세(만들 때 기준) = 날개를 활짝 편 자세. 모든 뼈의 쉬는 회전은 0 → "쉬는 방향 벡터"를 원하는 방향으로 돌리면 끝(aim·IK)
// 앞 = +z, 오른쪽 = x 음수, 월드 단위
import * as THREE from "three";
const { sin, cos, max, min, PI, abs } = Math;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const WYVERN = { // 기본 비율(유리날개룡)
  hw: 1.0, sw: .85, bodyL: 2.4, chestUp: .3,
  neck: [.95, .9, .85], neckPitch: [.75, .45, .2], headL: .95, jawL: .85,
  tail: [1.4, 1.3, 1.2, 1.1, 1.0], tailPitch: -.1, tailDroop: -.05,
  leg: [1.45, 1.35, .75, .55], // 허벅지·정강이·발목뼈·발가락
  arm: [2.6, 3.0], fingers: [2.2, 3.0, 2.7], // 위팔·아래팔, 날개 손가락(앞·가운데·뒤)
};
/** 비율 → 뼈 정의 { list:[[이름,부모,관절위치]], J(이름→관절), T(이름→끝점), p } */
export function wyvernDef(over = {}) {
  const p = { ...WYVERN, ...over }, L = [], J = {}, T = {}, add = (n, par, v, tip) => { L.push([n, par, v.clone()]); J[n] = v.clone(); if (tip) T[n] = tip.clone(); };
  // 다리부터 골반 높이를 정한다(발가락 관절이 땅 위 .22)
  const [th, sh, mt, to] = p.leg, a1 = .85, a2 = 1.0, a3 = 1.25, h = .22 + th * sin(a1) + sh * sin(a2) + mt * sin(a3) + .25; p.h = h;
  const pel = V3(0, h, 0), chest = V3(0, h + p.chestUp, p.bodyL);
  add("root", null, V3()); add("pelvis", "root", pel); add("spine", "pelvis", V3(0, h + p.chestUp * .5, p.bodyL * .45)); add("chest", "spine", chest);
  // 목 → 머리 → 턱
  let q = chest.clone().add(V3(0, .3, .75)), par = "chest"; p.neck.forEach((len, i) => { const a = p.neckPitch[i], e = q.clone().add(V3(0, sin(a) * len, cos(a) * len)); add("neck" + (i + 1), par, q, e); par = "neck" + (i + 1); q = e; });
  add("head", par, q, q.clone().add(V3(0, -.08, p.headL))); add("jaw", "head", q.clone().add(V3(0, -.22, .15)), q.clone().add(V3(0, -.3, p.jawL)));
  // 꼬리
  q = V3(0, h - .05, -1.6); par = "pelvis"; p.tail.forEach((len, i) => { const a = p.tailPitch + p.tailDroop * i, e = q.clone().add(V3(0, sin(a) * len, -cos(a) * len)); add("tail" + (i + 1), par, q, e); par = "tail" + (i + 1); q = e; });
  for (const [s, k] of [["R", -1], ["L", 1]]) {
    // 뒷다리: 엉덩이 → 무릎(앞) → 발목(뒤) → 발가락 관절 → 발끝
    const hip = V3(k * p.hw, h - .25, -.2), kn = hip.clone().add(V3(k * .12, -th * sin(a1), th * cos(a1))), an = kn.clone().add(V3(0, -sh * sin(a2), -sh * cos(a2))), tj = an.clone().add(V3(0, -mt * sin(a3), mt * cos(a3)));
    add("thigh" + s, "pelvis", hip, kn); add("shin" + s, "thigh" + s, kn, an); add("met" + s, "shin" + s, an, tj); add("toe" + s, "met" + s, tj, tj.clone().add(V3(0, -.18, to)));
    // 날개팔: 어깨 → 팔꿈치 → 손목 → 손가락 셋(쉬는 자세는 활짝)
    const [ua, fa] = p.arm, so = V3(k * p.sw, chest.y + .35, p.bodyL + .05), el = so.clone().add(V3(k * ua * .88, ua * .42, -ua * .22)), wr = el.clone().add(V3(k * fa * .97, -fa * .12, -fa * .2));
    add("uarm" + s, "chest", so, el); add("farm" + s, "uarm" + s, el, wr); add("hand" + s, "farm" + s, wr, wr.clone().add(V3(k * .3, .2, .05)));
    [[.75, .45, -.3], [.7, -.25, -.65], [.25, -.35, -.9]].forEach(([x, y, z], i) => add("fing" + (i + 1) + s, "hand" + s, wr, wr.clone().add(V3(k * x, y, z).normalize().multiplyScalar(p.fingers[i]))));
    T["memb" + s] = V3(k * p.hw * .9, h + .15, -1.7); // 막이 몸에 붙는 뒤끝
  }
  return { list: L, J, T, p, BI: Object.fromEntries(L.map((b, i) => [b[0], i])) };
}
/** 몬스터별 보조 뼈(뒷날개·볏 등) 붙이기 */
export function addBone(def, n, par, pos, tip) { def.list.push([n, par, pos.clone()]); def.J[n] = pos.clone(); def.T[n] = tip.clone(); def.BI[n] = def.list.length - 1; }
/** 뼈 만들기 → { bones, B(이름→뼈), root } */
export function wyvernBones(def) {
  const bones = def.list.map(([n]) => Object.assign(new THREE.Bone(), { name: n })), B = Object.fromEntries(bones.map((b) => [b.name, b]));
  def.list.forEach(([n, par, v]) => { const pv = par ? def.J[par] : V3(); B[n].position.copy(v).sub(pv); if (par) B[par].add(B[n]); });
  return { bones, B, root: B.root };
}
// ── 자세 도구 ──
const _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _a = V3(), _b = V3(), _c = V3();
/** 뼈를 월드 방향 dir로 겨눈다(쉬는 방향 = 끝점 - 관절) */
export function aim(r, n, dir) { const b = r.B[n], rest = _a.copy(r.def.T[n]).sub(r.def.J[n]).normalize(); b.parent.getWorldQuaternion(_p); _q.setFromUnitVectors(rest, _b.copy(dir).normalize()); b.quaternion.copy(_p.invert().multiply(_q)); b.updateMatrixWorld(true); }
/** 두 마디 IK: a(위)·b(아래)의 끝을 target에, 굽는 쪽은 pole */
export function ik2(r, a, b, target, pole) {
  const A = r.B[a].getWorldPosition(V3()), l1 = r.def.T[a].distanceTo(r.def.J[a]), l2 = r.def.T[b].distanceTo(r.def.J[b]);
  const to = target.clone().sub(A), d = min(max(to.length(), abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3); to.normalize();
  const ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), ang = Math.acos(min(1, max(-1, ca))), side = pole.clone().sub(A), n = to.clone().cross(side).normalize();
  if (n.lengthSq() < 1e-6) n.set(1, 0, 0);
  const dirA = to.clone().applyAxisAngle(n, ang); aim(r, a, dirA); const Bp = A.clone().addScaledVector(dirA, l1); aim(r, b, target.clone().sub(Bp));
}
const world = (r, x, y, z) => r.root.localToWorld(V3(x, y, z)); // 몬스터 기준 좌표 → 월드
function reset(r) { for (const b of r.bones) b.quaternion.identity(); r.B.pelvis.position.copy(r.def.J.pelvis); r.root.updateMatrixWorld(true); }
// 날개 접기: 손가락을 몸 옆을 따라 뒤로 눕힌다(f = 0 펴짐 ~ 1 접힘)
function fold(r, s, k, f) { for (let i = 1; i <= 3; i++) { const n = "fing" + i + s, rest = _c.copy(r.def.T[n]).sub(r.def.J[n]).normalize(), back = world(r, k * (.2 + i * .06), 1, -.35 - i * .2).sub(r.root.getWorldPosition(V3())).normalize(); aim(r, n, rest.clone().lerp(back, f).normalize()); } }
// 목 → 머리를 한 점으로 향하게(목 마디가 나눠서 휜다)
function look(r, x, y, z, k = 1) { const tg = world(r, x, y, z); for (const n of ["neck1", "neck2", "neck3", "head"]) { const P = r.B[n].getWorldPosition(V3()), rest = _c.copy(r.def.T[n]).sub(r.def.J[n]).normalize(), d = tg.clone().sub(P).normalize(); r.B[n].parent.getWorldQuaternion(_p); const restW = rest.clone().applyQuaternion(_p); aim(r, n, restW.lerp(d, n === "head" ? k : k * .45)); } }
const tailWave = (r, amp, ph, up = 0) => { for (let i = 1; i <= 5; i++) { const b = r.B["tail" + i]; b.rotation.set(up * .06 * i, sin(ph - i * .7) * amp * (.4 + i * .15), 0); } };
// ── 공용 동작: act(r, t, o) ──
// 네발 서기 기본형: 골반을 낮추고, 손목을 땅에 짚고, 날개를 접는다
function stand(r, t, o = {}) {
  const p = r.def.p, drop = o.drop ?? .35, bob = o.bob ?? 0; r.B.pelvis.position.y = p.h - drop + bob; r.B.pelvis.rotation.x = o.pitch ?? .06; r.B.chest.rotation.x = o.chestPitch ?? .1; r.root.updateMatrixWorld(true);
  for (const [s, k, ph] of [["R", -1, 0], ["L", 1, PI]]) {
    const st = o.step ? o.step(ph) : [0, 0], ft = r.def.T["met" + s], tgt = world(r, ft.x, ft.y + st[1], ft.z + st[0]);
    ik2(r, "thigh" + s, "shin" + s, tgt.clone().add(V3(0, .0, 0)), world(r, k * p.hw, p.h, ft.z + 3)); aim(r, "met" + s, world(r, ft.x, ft.y + st[1], ft.z + st[0] + .3).sub(world(r, ft.x, ft.y + st[1] + 1, ft.z + st[0])));
    aim(r, "toe" + s, world(r, 0, -.25, 1).sub(world(r, 0, 0, 0)));
    const wst = o.step ? o.step(ph + PI) : [0, 0], wx = k * (p.sw + p.arm[0] * .62), wz = p.bodyL + .5 + wst[0], wt = world(r, wx, .3 + wst[1], wz);
    ik2(r, "uarm" + s, "farm" + s, wt, world(r, k * (p.sw + 2), p.h + 5, p.bodyL - 3)); aim(r, "hand" + s, world(r, k * .3, -1, .4).sub(world(r, 0, 0, 0))); fold(r, s, k, o.fold ?? 1);
  }
}
export const ACTS = {
  /** 대기: 숨쉬기 · 둘러보기 · 꼬리 살랑 */
  idle(r, t) { stand(r, t, { bob: sin(t * 1.6) * .04 }); look(r, sin(t * .5) * 2.5, r.def.p.h + .8 + sin(t * .8) * .2, r.def.p.bodyL + 6, .8); r.B.jaw.rotation.x = max(0, sin(t * .7)) * .1; tailWave(r, .12, t * 1.2); },
  /** 네발 보행(제자리): 대각선 짝(오른발 + 왼손목)이 같이 움직인다 */
  walk(r, t) { const w = t * 4, step = (ph) => [sin(w + ph) * .7, max(0, cos(w + ph)) * .45]; stand(r, t, { step, bob: abs(sin(w)) * .08 - .04, pitch: .08 + sin(w * 2) * .02 }); r.B.pelvis.rotation.y = sin(w) * .06; r.B.chest.rotation.y = -sin(w) * .08; look(r, -sin(w) * .4, r.def.p.h + .4, r.def.p.bodyL + 6, .7); tailWave(r, .16, w); },
  /** 제자리 선회: 뒷발을 축으로 몸통을 돌리며 발을 옮긴다(o.dir = ±1) */
  turn(r, t, o = { dir: 1 }) { const w = t * 5, step = (ph) => [sin(w + ph) * .35, max(0, cos(w + ph)) * .35]; r.root.rotation.y = (o.base ?? 0) + o.dir * t * 1.1; r.root.updateMatrixWorld(true); stand(r, t, { step }); look(r, o.dir * 3, r.def.p.h + .5, r.def.p.bodyL + 4, 1); tailWave(r, .35, w * .5); },
  /** 포효: 몸을 뒤로 젖히고 목을 들어 입을 크게 벌린다. 날개를 반쯤 펼쳐 떤다 */
  roar(r, t) { const T = t % 4, up = T < .6 ? T / .6 : T < 3 ? 1 : max(0, 1 - (T - 3) / .8), sh = T > .6 && T < 3 ? sin(t * 40) * .03 : 0; stand(r, t, { drop: .35 + up * .25, pitch: .06 - up * .35, chestPitch: .1 - up * .25, fold: 1 - up * .55 });
    look(r, sh * 10, r.def.p.h + 1 + up * 5, r.def.p.bodyL + 4 - up * 1.5, 1); r.B.jaw.rotation.x = up * .75 + sh * 3; r.B.head.rotation.z += sh * 4; tailWave(r, .08 + up * .1, t * 8, up); },
  /** 이륙 → 정지비행: 날개를 크게 치며 떠오른다. 다리는 늘어뜨린다 */
  fly(r, t) { const p = r.def.p, rise = min(1, t / 2.2), beat = t * 5.5, flap = sin(beat); r.B.pelvis.position.y = p.h + rise * 4 + flap * .25 * rise; r.B.pelvis.rotation.x = -.15 - rise * .2; r.B.chest.rotation.x = -.05; r.root.updateMatrixWorld(true);
    for (const [s, k] of [["R", -1], ["L", 1]]) { r.B["uarm" + s].rotation.set(-.15, k * .25, k * (flap * .75 - .1)); r.B["farm" + s].rotation.set(0, 0, k * (flap * .35 + .1)); r.B["hand" + s].rotation.set(0, 0, k * sin(beat - .6) * .25);
      for (let i = 1; i <= 3; i++) r.B["fing" + i + s].rotation.set(0, 0, k * sin(beat - .9) * .12); r.B["thigh" + s].rotation.set(.5 * rise + .2, 0, 0); r.B["shin" + s].rotation.set(-.4 * rise, 0, 0); r.B["met" + s].rotation.set(.9 * rise, 0, 0); r.B["toe" + s].rotation.set(.4 * rise, 0, 0); }
    r.root.updateMatrixWorld(true); look(r, 0, p.h + rise * 2, p.bodyL + 7, .7); tailWave(r, .12, beat * .5, rise * -.5); },
};
/** 동작 하나 적용 */
export function wyvernAct(r, name, t, o) { reset(r); (ACTS[name] ?? ACTS.idle)(r, t, o); r.root.updateMatrixWorld(true); }
