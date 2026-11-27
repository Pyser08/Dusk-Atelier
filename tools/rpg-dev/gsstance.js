// 대검 자세: 대검의 위치·방향을 먼저 정하고(자세표), 양손은 IK로 손잡이를 잡는다. 다리는 발을 땅에 둔 채 IK
// 자세표 좌표 = 사냥꾼 칸 단위(키 45.5, 앞 +z, 오른쪽 -x)
import * as THREE from "three"; import { HU } from "./hunter.js"; import { aim, ik2 } from "./wyvernrig.js";
const V = (x, y, z) => new THREE.Vector3(x, y, z), { sin, cos } = Math;
// grip = 주 손잡이 위치, dir = 칼끝 방향, edge = 날이 향하는 쪽, drop = 골반 낮춤, lean = 상체 숙임(+앞), twist = 상체 비틀기, feet = [오른발, 왼발] 발목 위치
export const GS_STANCE = {
  sheathed: { n: "납도", back: true, drop: 0, lean: .04, feet: [[-2.6, 2.4, 0], [2.6, 2.4, 0]] },
  drawn: { n: "발도 대기", grip: [-3.2, 23, 6], dir: [-.2, -.42, 1], edge: [0, -1, -.3], drop: 1.6, lean: .2, twist: .25, feet: [[-3.4, 2.4, 2], [3, 2.4, -2.4]] },
  charge: { n: "모으기", grip: [-2.6, 40.5, -1], dir: [.12, .5, -1], edge: [0, 1, .4], drop: 3.4, lean: -.08, twist: .45, feet: [[-4.2, 2.4, -1.5], [3.6, 2.4, 3]], shake: 1 },
  slash: { n: "내려베기", grip: [-.6, 20, 9.5], dir: [-.05, -.5, 1], edge: [0, -1, -.5], drop: 4.2, lean: .5, twist: -.1, feet: [[-3, 2.4, 3.5], [3.4, 2.4, -3]] },
  guard: { n: "가드", grip: [-1, 30, 5], dir: [.12, -.8, .55], edge: [1, 0, 0], drop: 1.8, lean: .12, twist: .1, feet: [[-3.2, 2.4, 1], [3.2, 2.4, -1.6]], off: "flat" },
};
const BACK = { grip: [-4.2, 7.8, -4.6], dir: [.42, -1, -.05], edge: [-1, -.42, 0] }; // 가슴뼈 기준(등에 비스듬히)
const basis = (dir, edge) => { const y = V(...dir).normalize(), x = V(...edge), z = new THREE.Vector3(); x.addScaledVector(y, -x.dot(y)).normalize(); z.crossVectors(x, y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
/** 사냥꾼 h에 대검 gs를 들린다. st = 자세 이름, t = 시간 */
export function poseGS(h, gs, st, t = 0) {
  const S = GS_STANCE[st] ?? GS_STANCE.sheathed, B = h.B, r = { B, def: h.def }, M = (x, y, z) => h.root.localToWorld(V(x, y, z).multiplyScalar(HU));
  for (const b of h.bones) b.quaternion.identity(); B.hips.position.copy(h.rest); B.hips.position.y -= S.drop * HU + sin(t * 2) * .006; h.root.updateMatrixWorld(true);
  const sh = S.shake ? sin(t * 31) * .012 * S.shake : 0; B.hips.rotation.y = (S.twist ?? 0) * .4; B.spine.rotation.x = (S.lean ?? 0) * .5; B.chest.rotation.set((S.lean ?? 0) * .5 - sin(t * 2) * .015, (S.twist ?? 0) * .6 + sh, 0); B.head.rotation.set(-(S.lean ?? 0) * .7, -(S.twist ?? 0) * .7, 0); h.root.updateMatrixWorld(true);
  // 다리: 발목을 정한 자리에, 무릎은 앞으로
  for (const [s, i, k] of [["R", 0, -1], ["L", 1, 1]]) { const f = S.feet[i], tg = M(...f); ik2(r, "ul" + s, "ll" + s, tg, M(f[0] + k * .5, 14, f[2] + 12)); aim(r, "ft" + s, M(0, -.4, 1).sub(M(0, 0, 0))); }
  // 대검 놓기
  if (S.back) { B.chest.updateMatrixWorld(true); const cq = B.chest.getWorldQuaternion(new THREE.Quaternion()), wp = B.chest.localToWorld(V(...BACK.grip).multiplyScalar(HU)); gs.obj.position.copy(h.root.worldToLocal(wp)); const rq = h.root.getWorldQuaternion(new THREE.Quaternion()).invert(); gs.obj.quaternion.copy(rq.multiply(cq).multiply(basis(BACK.dir, BACK.edge)));
    // 팔은 편히 내린다
    for (const [s, k] of [["R", -1], ["L", 1]]) { B["ua" + s].rotation.set(sin(t * 2 + k) * .03, 0, k * .1); B["la" + s].rotation.x = -.15; } h.root.updateMatrixWorld(true); return; }
  gs.obj.position.set(...S.grip).multiplyScalar(HU); gs.obj.position.x += sh * 2; gs.obj.quaternion.copy(basis(S.dir, S.edge)); h.root.updateMatrixWorld(true);
  // 손: 손목을 손잡이 점에서 어깨 쪽으로 손바닥 길이만큼 물린 자리로 → 손은 손잡이를 향한다
  for (const [s, k, ptn] of [["R", -1, "main"], ["L", 1, "off"]]) { const gp = gs.obj.localToWorld(gs.pt(ptn)), so = B["ua" + s].getWorldPosition(V(0, 0, 0)), wr = gp.clone().addScaledVector(so.clone().sub(gp).normalize(), 1.7 * HU);
    ik2(r, "ua" + s, "la" + s, wr, M(k * 14, 22, -10)); aim(r, "h" + s, gp.clone().sub(B["h" + s].getWorldPosition(V(0, 0, 0)))); }
}
