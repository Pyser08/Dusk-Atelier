// 대검 입력 → 기술 판정(와일즈 PC 조작표 기준)
// 좌클릭(M0) 세로베기 · 길게 = 모으기 → 놓기 = 모아베기(이어서 길게: 강모아 → 참모아)
// 모으는 중 + 우클릭 = 태클(단계 유지) · 우클릭(M2) 베어넘기기(태클 뒤 = 뛰어들어, 강모아 뒤 = 강 베어넘기기)
// 좌+우 = 베어올리기 · 좌+우 길게 → 놓기 = 상쇄 베어올리기(성공 시 추격 십자베기)
// R 길게 = 가드 · 가드 중 좌클릭 = 킥 · 옆 버튼(M4) 길게 + Shift = 집중 관통 베기(도중 Shift = 피니시) · 납도 중에도 가능
export const CHARGE_STEP = .8, OVERCHARGE = 2.9; // 모으기 단계 시간(초), 넘치면 한 단계 약해짐
const BOTH = .12; // 좌·우를 이 시간 안에 누르면 동시
export class GSCombo {
  constructor(player, held) { this.p = player; this.held = held; this.stage = 1; this.lv = 0; this.holdT = 0; this.pend = null; this.opt = { offsetOK: true, soft: false }; this.log = []; this.after = { name: "", t: 0 }; }
  get cur() { return this.p.cur; }
  say(n) { this.log.unshift(n); this.log.length = Math.min(this.log.length, 6); }
  play(n) { this.p.play(n); this.say(this.p.constructor && n); this.after = { name: n, t: 0 }; }
  isCharging() { return /^(chargeIn|chargeHold|charge2In|charge2Hold|charge3In|charge3Hold|tackleC)$/.test(this.cur); }
  free() { const c = this.cur; if (/^(idle|drawnIdle|guardHold)$/.test(c)) return true; return !this.p.busy && !this.isCharging() && !/^(offsetIn|offsetHold)$/.test(c); }
  // 이어치기 창: 지금 동작의 뒷부분이면 다음 기술을 받는다
  canChain() { const c = this.cur; if (this.free()) return true; const k = this.p.clipLen ? this.p.t / this.p.clipLen : 1; return k > .55 && !this.isCharging(); }
  down(code, dbl) {
    const H = this.held, drawn = this.p.drawn;
    if (code === "ShiftLeft" && H.has("M4")) { if (/^(pierce|pierceDraw)$/.test(this.cur)) return this.play("pierceEnd"); if (drawn ? this.canChain() : this.free()) return this.play(drawn ? "pierce" : "pierceDraw"); return; } // 집중 관통 베기
    if (code === "KeyR" && drawn && this.canChain()) return this.play("guardIn");
    if (code === "M0" && /^(guardIn|guardHold)$/.test(this.cur)) return this.play("guardKick");
    if (code === "M2" && this.isCharging() && this.cur !== "tackleC") { this.stage = 2; return this.play("tackleC"); } // 모으는 중 태클: 단계 유지
    if (code === "M0" || code === "M2") { if (this.pend && this.pend.code !== code && performance.now() - this.pend.at < BOTH * 1000) { this.pend = null; return this.both(); } this.pend = { code, at: performance.now() }; return; }
    if ((code === "KeyE" || code === "ShiftLeft") && drawn && this.free() && !H.has("M4")) return this.play("sheathe");
  }
  up(code) {
    if (code === "KeyR" && /^(guardIn|guardHold)$/.test(this.cur)) return this.play("guardOut");
    if (code === "M0" || code === "M2") { if (this.pend?.code === code) this.resolve(this.pend.code, true); }
    if (code === "M0") { // 모으기 놓기 → 단계별 모아베기
      if (/^(chargeIn|chargeHold)$/.test(this.cur)) this.release(1); else if (/^(charge2In|charge2Hold)$/.test(this.cur)) this.release(2); else if (/^(charge3In|charge3Hold)$/.test(this.cur)) this.release(3);
    }
    if ((code === "M0" || code === "M2") && /^(offsetIn|offsetHold)$/.test(this.cur)) { this.play("offsetUp"); this.offsetPending = this.opt.offsetOK; }
  }
  both() { const drawn = this.p.drawn; if (!drawn || !this.canChain()) return; this.bothAt = performance.now(); this.play("upswing"); this.bothHold = true; }
  // 한쪽만 눌렸을 때: 짧게 떼면 탭, 계속 누르면 모으기
  resolve(code, tapped) { this.pend = null; const drawn = this.p.drawn;
    if (code === "M0") { if (!drawn) return this.free() ? this.play("drawSlash") : 0; if (!this.canChain()) return; if (tapped) { this.stage = 1; return this.play("vslash"); } return this.startCharge(); }
    if (code === "M2") { if (!drawn) return this.free() ? (this.p.play("draw"), this.say("draw")) : 0; if (!this.canChain()) return; const a = this.after.name;
      if (a === "tackle0" || a === "tackleC") return this.play("leapWide"); if (a === "release2") return this.play("strongWide"); if (a === "wide" && this.after.t < 1.6) return this.play("tackle0"); return this.play("wide"); } }
  startCharge() { const a = this.after.name, chain = this.after.t < 2.2; this.stage = chain && a === "release" ? 2 : chain && a === "release2" ? 3 : chain && /^tackle/.test(a) ? 2 : 1; this.holdT = 0; this.lv = 1; this.play(["chargeIn", "charge2In", "charge3In"][this.stage - 1]); }
  release(st) { const n = this.holdT > OVERCHARGE ? 2 : this.lv; this.relLv = n; if (st === 3) return this.play(this.opt.soft ? "release3s" : "release3"); this.play(st === 1 ? "release" : "release2"); }
  update(dt) {
    const H = this.held; this.after.t += dt;
    if (this.pend && performance.now() - this.pend.at > BOTH * 1000 + 90) { if (H.has(this.pend.code)) this.resolve(this.pend.code, false); } // 길게: 모으기 / 우클릭 단독
    if (this.isCharging() && this.cur !== "tackleC") { this.holdT += dt; const lv = Math.min(3, 1 + Math.floor(this.holdT / CHARGE_STEP)); if (lv !== this.lv) { this.lv = lv; this.onLevel?.(lv); } if (this.holdT > OVERCHARGE && !this.over) { this.over = true; this.onLevel?.(0); } } else { this.over = false; }
    if (this.cur === "charge2Hold" && !H.has("M0")) this.release(2); // 태클 뒤 이미 손을 뗐으면 바로 강모아베기
    if (this.cur === "upswing" && this.bothHold) { if (H.has("M0") && H.has("M2")) { if (performance.now() - this.bothAt > 280) { this.bothHold = false; this.play("offsetIn"); } } else this.bothHold = false; }
    if (this.offsetPending && this.cur === "offsetUp" && this.p.t > .5) { this.offsetPending = false; this.play("crossSlash"); } // 상쇄 대성공 → 추격 십자베기
  }
}
