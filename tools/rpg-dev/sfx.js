// Dusk Saga 효과음: 음원 파일 없이 Web Audio로 그 자리에서 합성한다(크기 0, 저작권 걱정 없음).
// 휴대폰은 사용자가 한 번 눌러야 소리가 나므로 첫 터치에 깨운다. 설정: dusk-saga-sfx(켜기 "1"/끄기 "0"), dusk-saga-vol(0~1)
let ctx = null, master = null, store = null, noiseBuf = null, last = {};
const on = () => (store?.getItem("dusk-saga-sfx") ?? "1") !== "0", vol = () => Math.max(0, Math.min(1, +(store?.getItem("dusk-saga-vol") ?? 0.6)));
function ac() {
  if (ctx) return ctx; const A = globalThis.AudioContext || globalThis.webkitAudioContext; if (!A) return null;
  ctx = new A(); master = ctx.createGain(); master.gain.value = vol(); const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return ctx;
}
const T = () => ctx.currentTime;
// 소리 조각: 높이 있는 음(tone)과 잡음(noise). 시작 시각 at(초 뒤), 길이 d
function tone(f, d, o = {}) {
  const t = T() + (o.at || 0), osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = o.type || "sine"; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + d); if (o.det) osc.detune.value = o.det;
  const v = (o.v ?? 0.3), a = o.a ?? 0.005; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  osc.connect(g); g.connect(o.dest || master); osc.start(t); osc.stop(t + d + 0.02);
}
function noise(d, o = {}) {
  const t = T() + (o.at || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noiseBuf; src.loop = true; f.type = o.type || "bandpass"; f.frequency.setValueAtTime(o.f || 1200, t); if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t + d); f.Q.value = o.q ?? 1;
  const v = o.v ?? 0.3, a = o.a ?? 0.003; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 0.5); src.stop(t + d + 0.02);
}
const arp = (notes, step, o = {}) => notes.forEach((f, i) => tone(f, o.d || step * 1.6, { ...o, at: (o.at || 0) + i * step }));
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);   // 미디 음 번호 → 주파수

// 속성 마법
const MAGIC = {
  fire: () => { noise(0.45, { type: "lowpass", f: 900, to: 200, v: 0.35 }); for (let i = 0; i < 5; i++) noise(0.04, { f: 3000 + Math.random() * 2000, q: 4, v: 0.12, at: 0.05 + i * 0.06 }); },
  ice: () => { arp([N(88), N(93), N(96), N(100)], 0.04, { type: "triangle", v: 0.12, d: 0.25 }); noise(0.25, { type: "highpass", f: 5000, v: 0.12 }); },
  thunder: () => { noise(0.08, { type: "highpass", f: 2000, v: 0.4 }); tone(900, 0.25, { type: "sawtooth", to: 80, v: 0.18 }); noise(0.5, { type: "lowpass", f: 400, to: 80, v: 0.3, at: 0.05 }); },
  water: () => { tone(500, 0.2, { to: 1200, v: 0.18 }); noise(0.3, { f: 900, to: 400, q: 2, v: 0.2 }); },
  wind: () => noise(0.4, { f: 600, to: 2400, q: 3, v: 0.3, a: 0.08 }),
  earth: () => { tone(90, 0.35, { to: 40, v: 0.45 }); noise(0.3, { type: "lowpass", f: 500, v: 0.3 }); },
  light: () => arp([N(84), N(88), N(91), N(96)], 0.05, { type: "sine", v: 0.15, d: 0.4 }),
  dark: () => { tone(110, 0.5, { type: "sawtooth", to: 70, v: 0.15, det: 12 }); tone(116, 0.5, { type: "sawtooth", to: 72, v: 0.12 }); },
  poison: () => { for (let i = 0; i < 4; i++) tone(300 + i * 60, 0.08, { type: "square", to: 200, v: 0.07, at: i * 0.05 }); },
  plant: () => { noise(0.2, { f: 1500, q: 1, v: 0.15 }); tone(600, 0.15, { to: 900, v: 0.1 }); },
  arcane: () => { tone(400, 0.35, { to: 1600, type: "triangle", v: 0.16 }); tone(800, 0.35, { to: 3200, type: "sine", v: 0.06 }); },
  none: () => tone(500, 0.25, { to: 1500, type: "triangle", v: 0.16 }),
};
const SOUNDS = {
  click: () => tone(1800, 0.03, { type: "square", v: 0.05 }), tab: () => tone(900, 0.05, { to: 1300, v: 0.08 }),
  slash: () => { noise(0.12, { type: "highpass", f: 2500, to: 700, v: 0.35 }); tone(1400, 0.05, { type: "triangle", v: 0.08 }); },
  blunt: () => { tone(140, 0.18, { to: 45, v: 0.5 }); noise(0.1, { type: "lowpass", f: 500, v: 0.35 }); },
  pierce: () => { noise(0.07, { f: 2600, q: 3, v: 0.3 }); tone(900, 0.06, { to: 1500, type: "square", v: 0.06 }); },
  arrow: () => { noise(0.18, { f: 1800, to: 3500, q: 4, v: 0.18 }); tone(220, 0.06, { to: 90, v: 0.3, at: 0.15 }); },
  claw: () => { for (let i = 0; i < 3; i++) noise(0.05, { type: "highpass", f: 3000, v: 0.22, at: i * 0.04 }); },
  gun: () => { noise(0.12, { type: "lowpass", f: 3000, to: 300, v: 0.5 }); tone(160, 0.08, { to: 60, v: 0.3 }); },
  crit: () => { tone(N(96), 0.25, { type: "triangle", v: 0.18 }); tone(N(103), 0.3, { type: "sine", v: 0.1, at: 0.03 }); noise(0.15, { type: "highpass", f: 4000, v: 0.2 }); },
  miss: () => noise(0.2, { f: 500, to: 1800, q: 2, v: 0.15, a: 0.04 }),
  block: () => { tone(620, 0.18, { type: "square", v: 0.12 }); tone(930, 0.22, { type: "square", v: 0.08 }); noise(0.05, { type: "highpass", f: 3000, v: 0.2 }); },
  break: () => { noise(0.25, { type: "lowpass", f: 1500, to: 300, v: 0.45 }); for (let i = 0; i < 4; i++) noise(0.04, { f: 2000 + i * 500, q: 5, v: 0.15, at: 0.03 + i * 0.04 }); tone(80, 0.3, { to: 40, v: 0.4 }); },
  die: () => { tone(N(64), 0.18, { type: "triangle", v: 0.15 }); tone(N(60), 0.18, { type: "triangle", v: 0.15, at: 0.12 }); tone(N(55), 0.45, { type: "triangle", v: 0.15, at: 0.24, to: N(43) }); },
  heal: () => arp([N(72), N(76), N(79), N(84), N(88)], 0.06, { type: "sine", v: 0.1, d: 0.35 }),
  level: () => { arp([N(72), N(76), N(79), N(84)], 0.09, { type: "square", v: 0.08, d: 0.2 }); tone(N(88), 0.5, { type: "triangle", v: 0.14, at: 0.36 }); },
  telegraph: () => { for (let i = 0; i < 3; i++) { tone(880, 0.1, { type: "square", v: 0.07, at: i * 0.22 }); tone(660, 0.1, { type: "square", v: 0.07, at: i * 0.22 + 0.11 }); } },
  roar: () => { tone(85, 0.9, { type: "sawtooth", to: 60, v: 0.25, a: 0.1 }); tone(90, 0.9, { type: "sawtooth", to: 55, v: 0.2, a: 0.12, det: 30 }); noise(0.9, { type: "lowpass", f: 600, to: 200, v: 0.25, a: 0.1 }); },
  boom: () => { noise(0.8, { type: "lowpass", f: 1200, to: 60, v: 0.6 }); tone(70, 0.6, { to: 30, v: 0.5 }); },
  duo: () => { [N(55), N(62), N(67)].forEach((f) => tone(f, 0.7, { type: "sawtooth", v: 0.08, a: 0.06 })); noise(0.6, { f: 400, to: 3000, q: 1, v: 0.15, a: 0.3 }); tone(N(79), 0.5, { type: "triangle", v: 0.14, at: 0.45 }); },
  encounter: () => { for (let i = 0; i < 3; i++) { tone(N(81), 0.14, { type: "square", v: 0.09, at: i * 0.3 }); tone(N(76), 0.14, { type: "square", v: 0.09, at: i * 0.3 + 0.15 }); } tone(65, 0.9, { to: 45, v: 0.3, at: 0.05 }); },
  turn: () => { tone(N(76), 0.1, { type: "triangle", v: 0.1 }); tone(N(83), 0.18, { type: "triangle", v: 0.1, at: 0.1 }); },
  enemyturn: () => { tone(N(57), 0.12, { type: "square", v: 0.07 }); tone(N(56), 0.22, { type: "square", v: 0.07, at: 0.12 }); },
  victory: () => { const s = [[72, 0], [72, 0.12], [72, 0.24], [76, 0.36], [79, 0.6], [84, 0.84]]; for (const [n, t] of s) tone(N(n), t === 0.84 ? 0.8 : 0.16, { type: "square", v: 0.08, at: t }); [N(60), N(64), N(67)].forEach((f) => tone(f, 0.9, { type: "triangle", v: 0.08, at: 0.84 })); },
  defeat: () => { [[67, 0], [63, 0.3], [60, 0.6], [55, 0.9]].forEach(([n, t]) => tone(N(n), 0.5, { type: "triangle", v: 0.12, at: t })); tone(55, 1.2, { to: 40, v: 0.2, at: 0.9 }); },
  retreat: () => { for (let i = 0; i < 4; i++) noise(0.06, { type: "lowpass", f: 700, v: 0.2, at: i * 0.12 }); noise(0.4, { f: 1500, to: 400, q: 2, v: 0.12, at: 0.1 }); },
  raid: () => { for (let i = 0; i < 4; i++) tone(110, 0.12, { to: 50, v: 0.45, at: i * 0.14 }); tone(N(69), 0.4, { type: "sawtooth", v: 0.08, at: 0.5 }); },
  status: () => tone(300, 0.15, { type: "square", to: 180, v: 0.06 }),
  place: () => tone(420, 0.05, { type: "triangle", v: 0.12 }),
  craft: () => { for (let i = 0; i < 3; i++) { tone(1200 - i * 80, 0.25, { type: "square", v: 0.07, at: i * 0.18 }); noise(0.05, { type: "highpass", f: 3000, v: 0.18, at: i * 0.18 }); } arp([N(84), N(88), N(91)], 0.06, { type: "triangle", v: 0.1, at: 0.6 }); },
  equip: () => { noise(0.06, { type: "lowpass", f: 1500, v: 0.25 }); tone(700, 0.1, { type: "square", v: 0.05, at: 0.04 }); },
  temper: () => { tone(1500, 0.3, { type: "square", v: 0.06 }); arp([N(88), N(91), N(95), N(100)], 0.05, { type: "sine", v: 0.1, at: 0.1, d: 0.3 }); },
  coin: () => { tone(N(88), 0.08, { type: "square", v: 0.07 }); tone(N(95), 0.25, { type: "square", v: 0.07, at: 0.07 }); },
  quest: () => arp([N(79), N(84), N(88), N(91)], 0.08, { type: "triangle", v: 0.12, d: 0.3 }),
  fail: () => tone(220, 0.25, { type: "square", to: 150, v: 0.07 }),
};
// 무기 → 타격음
const WSND = { sword: "slash", dagger: "pierce", lance: "pierce", axe: "blunt", claw: "claw", bow: "arrow", tome: "magic", staff: "magic" };
export const sfx = {
  init(st) { store = st; },
  /** 첫 터치에 소리를 깨운다(휴대폰 정책) */
  unlock(target) { const go = () => { const c = ac(); if (c?.state === "suspended") c.resume(); }; for (const t of ["pointerdown", "touchstart", "keydown"]) target?.addEventListener?.(t, go, { capture: true, passive: true }); },
  play(name, o = {}) {
    if (!on()) return; const c = ac(); if (!c || c.state !== "running") { c?.resume?.(); if (!c || c.state !== "running") return; }
    const now = performance.now(); if (now - (last[name] || 0) < (o.gap ?? 40)) return; last[name] = now; master.gain.value = vol();
    try { if (name === "magic") (MAGIC[o.elem] || MAGIC.none)(); else (SOUNDS[name] || SOUNDS.click)(); } catch { /* 소리 실패는 무시 */ }
  },
  /** 한 번의 타격: h = {crit, miss, guard, brk, dmg}, w = 무기 */
  hit(h, w) {
    if (!h) return; if (h.miss) return this.play("miss"); if (h.guard) return this.play("block");
    const k = w?.gun ? "gun" : w?.magic || w?.type === "tome" ? "magic" : WSND[w?.type] || "slash"; this.play(k, { elem: w?.elem, gap: 20 }); if (w?.elem && k !== "magic") setTimeout(() => this.play("magic", { elem: w.elem, gap: 20 }), 30);
    if (h.crit) setTimeout(() => this.play("crit"), 60); if (h.brk) setTimeout(() => this.play("break"), 120);
  },
  setOn(v) { store?.setItem("dusk-saga-sfx", v ? "1" : "0"); }, setVol(v) { store?.setItem("dusk-saga-vol", String(v)); if (master) master.gain.value = vol(); },
  isOn: on, volume: vol,
};
