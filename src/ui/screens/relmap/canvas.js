// 인물 관계도 그리기(반3D canvas). 데이터는 engine/relmap.js가 만들고, 여기서는 그리기·조작만 한다.
// 색은 Dusk 토큰(--rb-*)만 읽는다. 화면에서 떨어지면(stage.isConnected=false) 그리기 루프를 멈추고, start()로 다시 시작한다.
import { RM, layoutNodes, findPath } from "../../../engine/relmap.js";

const TAU = Math.PI * 2, { RMIN, RMAX, HH } = RM;
const lerp = (a, b, t) => a + (b - a) * t;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

export function createRelMapCanvas({ stage, canvas, ctrlsEl, legendEl, tipEl, win = window, onSelect, onOpenWiki, onToast, userName = "" }) {
  const ctx = canvas.getContext("2d");
  const reduce = !!win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const colorCache = new Map();
  let probe = null;
  function rgbOf(c) {   // 어떤 CSS 색이든 [r,g,b]로 (토큰이 hex·rgb 무엇이든 동작)
    let v = colorCache.get(c);
    if (v) return v;
    try {
      probe ??= win.document.createElement("canvas");
      probe.width = probe.height = 1;
      const p = probe.getContext("2d", { willReadFrequently: true });
      p.clearRect(0, 0, 1, 1); p.fillStyle = "#000"; p.fillStyle = c; p.fillRect(0, 0, 1, 1);
      const d = p.getImageData(0, 0, 1, 1).data; v = [d[0], d[1], d[2]];
    } catch { v = [128, 128, 128]; }
    colorCache.set(c, v);
    return v;
  }
  const rgba = (c, a) => { const [r, g, b] = rgbOf(c); return `rgba(${r},${g},${b},${a})`; };
  const mix = (c1, c2, t) => { const a = rgbOf(c1), b = rgbOf(c2); return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`; };

  let TH = {}, frameN = 0;
  function readTH() {
    const cs = win.getComputedStyle(stage), g = (n, d) => cs.getPropertyValue(n).trim() || d;
    const winBg = g("--rb-win", "#171615"), [r, gg, b] = rgbOf(winBg);
    TH = {
      text: g("--rb-text", "#eee"), sub: g("--rb-sub", "#aaa"), mute: g("--rb-muted", "#999"), surf: g("--rb-surf", "#222"), win: winBg,
      acc: g("--rb-acc", "#e5694a"), accb: g("--rb-acc-b", "#cc4b2e"), ok: g("--rb-ok", "#5fd3a5"), bad: g("--rb-danger", "#f4867a"),
      warm: g("--rb-rose", "#f2896a"), cool: g("--rb-blue", "#6fa8f2"), warn: g("--rb-warn", "#f2c066"),
      dark: (0.299 * r + 0.587 * gg + 0.114 * b) < 128
    };
    TH.pal = [TH.acc, TH.cool, TH.warn, TH.warm, TH.ok, TH.sub];
  }
  readTH();

  let nodes = [], edges = [], byId = {}, factions = [], facAng = {}, user = { id: "u", name: userName || "나", x: 0, y: 0, z: 0, user: true };
  let W = 0, H = 0, dpr = 1;
  const mobile = !!win.matchMedia?.("(max-width: 800px)").matches;
  const st = { uz: 1, vyaw: 0, vp: 0, idleUntil: 0, yaw: -0.5, pitch: 0.72, flat: mobile ? 1 : 0, flatT: mobile ? 1 : 0, spin: !reduce, sel: null, drag: false, hl: true, minS: 0, faction: "" };
  const cam = { x: 0, y: 0, z: 0, zm: 1 };
  const screen = {};
  let hotId = null, pathRes = null, curTS = {}, running = false, destroyed = false, lastTap = {};

  const nodeColor = (n) => (n.faction && facAng[n.faction] != null ? TH.pal[facAng[n.faction] % TH.pal.length] : mix(TH.cool, TH.warm, n.aff / 100));
  const facColor = (f) => TH.pal[(facAng[f] ?? 0) % TH.pal.length];
  const warmth = (w) => mix(TH.cool, TH.warm, (w + 1) / 2);
  const visibleN = (n) => n.user || !st.faction || n.faction === st.faction;
  const dispName = (n) => (n.status === "unknown" ? "???" : n.status === "missing" ? n.name + " (실종)" : n.name);
  const edgeById = (id) => edges.find((e) => e.id === id);

  function setData(map) {
    nodes = map.nodes.map((n) => ({ ...n, x: 0, y: 0, z: 0, tx: 0, tz: 0, ty: 0 }));
    const lay = layoutNodes(nodes);
    factions = lay.factions; facAng = {}; factions.forEach((f, i) => { facAng[f] = i; });
    const prev = {};
    byId = { u: user };
    for (const n of nodes) { byId[n.id] = n; n.x = n.tx; n.z = n.tz; n.y = n.ty; }
    void prev;
    edges = [];
    if (!map.noUser) for (const n of nodes) edges.push({ id: "u~" + n.id, a: user, b: n, w: (n.aff - 50) / 50, s: n.uStrength, sp: n.uSpecial ? 1 : 0, rc: n.uRecent ? 1 : 0, user: true, label: n.uLabel });
    for (const e of map.edges) if (byId[e.a] && byId[e.b]) edges.push({ ...e, a: byId[e.a], b: byId[e.b] });
    st.sel = null; pathRes = null;
    st.faction = factions.includes(st.faction) ? st.faction : "";
  }

  function resize() {
    dpr = Math.min(win.devicePixelRatio || 1, 2);
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function proj(p, f, S, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), px = p.x - cam.x, pz = p.z - cam.z;
    const x1 = px * cy - pz * sy, z1 = px * sy + pz * cy, cp = Math.cos(pitch), sp = Math.sin(pitch);
    const py = (p.y - cam.y) * (1 - f), y2 = py * cp - z1 * sp, z2 = py * sp + z1 * cp;
    const k = 1 / (1 - z2 * (1 - f) / 1300);
    return { x: W / 2 + x1 * S * k, y: H / 2 - y2 * S * k + (1 - f) * 8, k, d: z2 };
  }

  function selInfo() {
    const s = st.sel, set = {};
    if (!s) return { none: true };
    if (s.type === "path") return { set: pathRes ? pathRes.n : {}, e: null };
    if (s.type === "node") {
      set[s.id] = 1;
      for (const e of edges) if (!e.user && (e.a.id === s.id || e.b.id === s.id)) { set[e.a.id] = 1; set[e.b.id] = 1; }
      set.u = 1;
      return { set, e: null };
    }
    const e = edgeById(s.id);
    if (!e) return { none: true };
    set[e.a.id] = 1; set[e.b.id] = 1;
    return { set, e };
  }
  function edgeAlpha0(e, si) {
    if (si.none) {
      if (!st.hl) return e.user ? 1 : 0.09;
      if (e.user) return curTS[e.b.id] ? 1 : (TH.dark ? 0.12 : 0.2);
      return curTS[e.a.id] && curTS[e.b.id] ? 0.6 : 0.03;
    }
    const s = st.sel;
    if (s.type === "node") return e.a.id === s.id || e.b.id === s.id ? 1 : (e.user ? 0.07 : 0.05);
    return e === si.e ? 1 : (e.user ? 0.07 : 0.05);
  }
  function edgeAlpha(e, si) {
    let base = edgeAlpha0(e, si);
    if (pathRes) base = pathRes.e[e.id] ? 1 : (e.user ? 0.04 : 0.02);
    if (!visibleN(e.a) || !visibleN(e.b)) return 0;
    if (st.minS && e.s * 100 < st.minS && !(pathRes && pathRes.e[e.id])) return 0;
    return base;
  }

  const FONT = "system-ui, sans-serif";
  function halo(text, x, y) { ctx.lineJoin = "round"; ctx.lineWidth = 3.5; ctx.strokeStyle = rgba(TH.surf, 0.9); ctx.strokeText(text, x, y); ctx.fillText(text, x, y); }

  function draw(t) {
    if ((frameN++ % 30) === 0) readTH();
    const r0 = stage.getBoundingClientRect();
    if (Math.abs(r0.width - W) > 1 || Math.abs(r0.height - H) > 1) resize();
    for (const n of nodes) { n.x += (n.tx - n.x) * 0.12; n.z += (n.tz - n.z) * 0.12; n.y += (n.ty - n.y) * 0.12; }
    st.flatT += (st.flat - st.flatT) * 0.12;
    let f = st.flatT; if (Math.abs(st.flat - f) < 0.002) f = st.flatT = st.flat;
    if (!st.flat && !st.drag) {
      const nowT = performance.now();
      if (Math.abs(st.vyaw) > 0.0004 || Math.abs(st.vp) > 0.0004) {
        st.yaw += st.vyaw; st.pitch = clampN(st.pitch + st.vp, 0.25, 1.25); st.vyaw *= 0.93; st.vp *= 0.88;
      } else { st.vyaw = 0; st.vp = 0; }
      const ak = clampN((nowT - st.idleUntil) / 800, 0, 1);
      if (ak > 0) {
        if (st.sel && !reduce) st.yaw += 0.0018 * ak;
        else if (st.spin && !st.sel) st.yaw += 0.0028 * ak;
      }
    }
    const yaw = st.yaw * (1 - f), pitch = lerp(st.pitch, Math.PI / 2, f);
    const S3 = 1.45 * Math.min(W / (2 * (RMAX + 60)), H / (2 * (RMAX * 0.78 + HH + 50)));
    const S2 = Math.min(W, H - 50) / (2 * (RMAX + 56));
    let tg = { x: 0, y: 0, z: 0, zm: 1 };
    const sl = st.sel;
    if (sl && sl.type === "node" && sl.id !== "u" && byId[sl.id]) { const tn = byId[sl.id]; tg = { x: tn.x, y: tn.y, z: tn.z, zm: 1.9 }; }
    else if (sl && sl.type === "path" && pathRes) {
      let px0 = 0, py0 = 0, pz0 = 0; for (const i of pathRes.ids) { const q = byId[i]; px0 += q.x; py0 += q.y; pz0 += q.z; }
      const L = pathRes.ids.length; tg = { x: px0 / L, y: py0 / L, z: pz0 / L, zm: 1.25 };
    } else if (sl && sl.type === "edge") {
      const te = edgeById(sl.id);
      if (te) tg = { x: (te.a.x + te.b.x) / 2, y: (te.a.y + te.b.y) / 2, z: (te.a.z + te.b.z) / 2, zm: te.user ? 1.5 : 1.7 };
    }
    const ez = reduce ? 1 : 0.11;
    cam.x += (tg.x - cam.x) * ez; cam.y += (tg.y - cam.y) * ez; cam.z += (tg.z - cam.z) * ez; cam.zm += (tg.zm - cam.zm) * ez;
    const S = lerp(S3, S2, f) * cam.zm * st.uz;
    ctx.clearRect(0, 0, W, H);
    const si = selInfo();
    const pulse = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t / 420);
    curTS = {};
    if (st.hl) for (const n of nodes) if (n.thisTurn) curTS[n.id] = 1;
    const labelQ = [];

    // 바닥: 소속 구역 + 호감도 링
    const c0 = proj(user, f, S, yaw, pitch);
    if (factions.length) {
      const sector = 360 / factions.length;
      factions.forEach((fa, gi) => {
        const a0 = (90 + gi * sector - sector / 2) * Math.PI / 180;
        ctx.beginPath(); ctx.moveTo(c0.x, c0.y);
        for (let i = 0; i <= 18; i++) { const aa = a0 + i / 18 * (sector * Math.PI / 180), q = proj({ x: RMAX * 1.05 * Math.cos(aa), y: 0, z: RMAX * 1.05 * Math.sin(aa) }, f, S, yaw, pitch); ctx.lineTo(q.x, q.y); }
        ctx.closePath(); ctx.fillStyle = rgba(facColor(fa), 0.08); ctx.fill();
      });
    }
    ctx.lineWidth = 1;
    for (const a of [80, 60, 40, 20]) {
      const r = RMIN + (100 - a) / 100 * (RMAX - RMIN);
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) { const q = proj({ x: r * Math.cos(i / 72 * TAU), y: 0, z: r * Math.sin(i / 72 * TAU) }, f, S, yaw, pitch); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
      ctx.strokeStyle = rgba(TH.text, 0.17); ctx.stroke();
      const lp = proj({ x: r * Math.cos(Math.PI * 0.5 + 0.05), y: 0, z: r * Math.sin(Math.PI * 0.5 + 0.05) }, f, S, yaw, pitch);
      ctx.fillStyle = TH.mute; ctx.font = `12px ${FONT}`; ctx.textAlign = "left"; halo("호감 " + a, lp.x + 4, lp.y - 3);
    }
    if (factions.length) {
      const sector = 360 / factions.length;
      factions.forEach((fa, gi) => {
        const a0 = (90 + gi * sector - sector / 2) * Math.PI / 180, p1 = proj({ x: RMAX * 1.05 * Math.cos(a0), y: 0, z: RMAX * 1.05 * Math.sin(a0) }, f, S, yaw, pitch);
        ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(p1.x, p1.y); ctx.strokeStyle = rgba(TH.text, 0.09); ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
        const la = (90 + gi * sector) * Math.PI / 180, lp2 = proj({ x: (RMAX + 34) * Math.cos(la), y: 0, z: (RMAX + 34) * Math.sin(la) }, f, S, yaw, pitch);
        ctx.fillStyle = facColor(fa); ctx.font = `700 12px ${FONT}`; ctx.textAlign = "center"; halo(fa, lp2.x, lp2.y);
      });
    }

    // 투영
    const all = [user, ...nodes];
    for (const n of all) {
      const p = proj(n, f, S, yaw, pitch), fl = proj({ x: n.x, y: 0, z: n.z }, f, S, yaw, pitch);
      const rad = n.user ? 15 : 7 + (n.imp / 100) * 6;
      screen[n.id] = { x: p.x, y: p.y, fx: fl.x, fy: fl.y, r: rad * (0.75 + 0.25 * p.k) * Math.sqrt(cam.zm * st.uz), d: p.d, n };
    }
    // 높이 눈금·기둥
    if (f < 0.95) {
      const ap0 = proj({ x: 0, y: -HH * 1.15, z: 0 }, f, S, yaw, pitch), ap1 = proj({ x: 0, y: HH * 1.15, z: 0 }, f, S, yaw, pitch);
      ctx.globalAlpha = (1 - f) * 0.7; ctx.strokeStyle = rgba(TH.acc, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ap0.x, ap0.y); ctx.lineTo(ap1.x, ap1.y); ctx.stroke();
      for (const n of nodes) {
        const s = screen[n.id], al = (si.none || si.set[n.id] ? 1 : 0.25) * (visibleN(n) ? 1 : 0.15), c = nodeColor(n);
        ctx.globalAlpha = (1 - f) * 0.6 * al; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.fx, s.fy);
        ctx.strokeStyle = c; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.ellipse(s.fx, s.fy, 4, 2, 0, 0, TAU); ctx.fillStyle = c; ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 선
    for (const e of edges) {
      const al = edgeAlpha(e, si); e._al = al;
      if (al <= 0.01) continue;
      const A = screen[e.a.id], B = screen[e.b.id], col = warmth(e.w), lw = 1 + e.s * 4;
      ctx.globalAlpha = al;
      if (e.rc) {
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.strokeStyle = col; ctx.lineWidth = lw + 7;
        ctx.globalAlpha = al * (0.12 + 0.2 * pulse); ctx.setLineDash([]); ctx.stroke(); ctx.globalAlpha = al;
      }
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round";
      ctx.setLineDash(e.sp ? [lw * 2.2 + 3, lw * 2 + 5] : []); ctx.globalAlpha = al * (e.user && si.none ? 0.85 : 0.95); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    // 노드(먼 것부터)
    all.slice().sort((a, b) => screen[a.id].d - screen[b.id].d).forEach((n) => {
      const s = screen[n.id], c = n.user ? TH.acc : nodeColor(n);
      let al = n.user ? 1 : si.none ? (st.hl && !curTS[n.id] && Object.keys(curTS).length ? (TH.dark ? 0.2 : 0.34) : 1) : (si.set[n.id] ? 1 : (TH.dark ? 0.25 : 0.34));
      if (pathRes) al = n.user || pathRes.n[n.id] ? 1 : 0.15;
      if (!visibleN(n)) al = 0.06;
      ctx.globalAlpha = al;
      if (n.user) {
        const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r * 2.6); g.addColorStop(0, rgba(TH.acc, 0.35)); g.addColorStop(1, rgba(TH.acc, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.6, 0, TAU); ctx.fill();
        const gg = ctx.createLinearGradient(s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r); gg.addColorStop(0, TH.acc); gg.addColorStop(1, TH.accb); ctx.fillStyle = gg;
      } else {
        const hg = ctx.createRadialGradient(s.x, s.y, s.r * 0.5, s.x, s.y, s.r * 2.5); hg.addColorStop(0, rgba(c, 0.12)); hg.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.5, 0, TAU); ctx.fill(); ctx.fillStyle = c;
      }
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU);
      if (n.status === "missing") { ctx.fillStyle = TH.surf; ctx.fill(); ctx.setLineDash([3, 3]); ctx.lineWidth = 2; ctx.strokeStyle = c; ctx.stroke(); ctx.setLineDash([]); } else ctx.fill();
      if (n.status === "unknown") { ctx.fillStyle = TH.surf; ctx.font = `700 ${Math.round(s.r * 1.3)}px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("?", s.x, s.y + s.r * 0.45); }
      const isSel = st.sel && st.sel.type === "node" && st.sel.id === n.id;
      if (isSel || n.status !== "missing") { ctx.lineWidth = isSel ? 3 : 1.5; ctx.strokeStyle = isSel ? TH.text : TH.surf; ctx.stroke(); }
      const ap = st.hl && curTS[n.id] && !n.user;
      if (ap) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 6 + 3 * pulse, 0, TAU); ctx.strokeStyle = rgba(TH.text, 0.5 + 0.4 * pulse); ctx.lineWidth = 2; ctx.stroke(); }
      const showL = ap || n.user || isSel || hotId === n.id || n.imp >= 50 || cam.zm * st.uz > 1.5 || f > 0.5 || (!si.none && si.set[n.id]);
      if (showL && visibleN(n)) labelQ.push({ n, s, al, ap, force: n.user || isSel || hotId === n.id });
    });
    ctx.globalAlpha = 1;
    // 이름표: 겹치면 다른 자리로, 그래도 겹치면 숨김
    const boxes = all.map((n) => { const s = screen[n.id]; return { x: s.x - s.r - 2, y: s.y - s.r - 2, w: 2 * s.r + 4, h: 2 * s.r + 4 }; });
    if (st.sel && st.sel.type === "node" && st.sel.id !== "u" && screen[st.sel.id]) { const cs = screen[st.sel.id]; boxes.push({ x: cs.x - 60, y: cs.y + cs.r + 20, w: 120, h: 24 }); }
    const pri = (q) => (q.force ? 2 : 0) + (q.ap ? 1 : 0);
    labelQ.sort((a, b) => (pri(b) - pri(a)) || ((b.n.imp ?? 0) - (a.n.imp ?? 0)));
    for (const q of labelQ) {
      const s = q.s, n = q.n;
      ctx.font = `${q.ap ? "700 14px" : "600 13px"} ${FONT}`;
      const nm = dispName(n), w = ctx.measureText(nm).width + 4, h = 16;
      const cands = [[s.x - w / 2, s.y + s.r + 3], [s.x - w / 2, s.y - s.r - 3 - h], [s.x + s.r + 4, s.y - h / 2], [s.x - s.r - 4 - w, s.y - h / 2]];
      let pos = null;
      for (const c of cands) { if (c[0] >= 4 && c[0] + w <= W - 4 && !boxes.some((b) => c[0] < b.x + b.w && c[0] + w > b.x && c[1] < b.y + b.h && c[1] + h > b.y)) { pos = c; break; } }
      if (!pos) { if (!q.force) continue; pos = cands[0]; }
      pos = [Math.max(4, Math.min(W - 4 - w, pos[0])), pos[1]];
      boxes.push({ x: pos[0], y: pos[1], w, h });
      ctx.globalAlpha = q.al; ctx.fillStyle = TH.text; ctx.textAlign = "left"; halo(nm, pos[0] + 2, pos[1] + 12);
    }
    ctx.globalAlpha = 1;
    // 선 이름표(진하게 보이는 NPC 간 선·선택한 선)
    for (const e of edges) {
      if (!(e._al >= 0.9) || (e.user && si.none)) continue;
      const A = screen[e.a.id], B = screen[e.b.id], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      ctx.font = `600 13px ${FONT}`; const tw = ctx.measureText(e.label).width + 14;
      ctx.fillStyle = TH.surf; ctx.strokeStyle = warmth(e.w); ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(mx - tw / 2, my - 11, tw, 22, 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = TH.text; ctx.textAlign = "center"; ctx.fillText(e.label, mx, my + 4);
    }
    // 중요 / 덜 중요: 맨 위에 그리되 버튼줄·범례 영역 밖으로 민다
    if (f < 0.95) {
      const q0 = proj({ x: 0, y: -HH * 1.15, z: 0 }, f, S, yaw, pitch), q1 = proj({ x: 0, y: HH * 1.15, z: 0 }, f, S, yaw, pitch);
      const sr = stage.getBoundingClientRect(), cr = ctrlsEl?.getBoundingClientRect(), lr = legendEl?.getBoundingClientRect();
      const yMin = cr ? cr.bottom - sr.top + 16 : 40, yMax = lr ? lr.top - sr.top - 10 : H - 20;
      const ty = clampN(q1.y - 8, yMin, yMax - 20), by = clampN(q0.y + 16, ty + 22, yMax);
      ctx.font = `700 11px ${FONT}`; ctx.textAlign = "center"; ctx.globalAlpha = 1 - f; ctx.fillStyle = TH.acc;
      halo("▲ 중요", clampN(q1.x, 40, W - 40), ty); halo("덜 중요 ▼", clampN(q0.x, 40, W - 40), by); ctx.globalAlpha = 1;
    }
    // 호감·중요 칩: 항상 맨 위
    if (st.sel && st.sel.type === "node" && st.sel.id !== "u" && byId[st.sel.id]) {
      const cn = byId[st.sel.id], csn = screen[cn.id], chip = `호감 ${cn.aff} · 중요 ${cn.imp}`;
      ctx.font = `700 12px ${FONT}`; ctx.textAlign = "center"; ctx.globalAlpha = 1;
      const cw = ctx.measureText(chip).width + 20, cx = csn.x - cw / 2, cy = csn.y + csn.r + 22;
      ctx.shadowColor = rgba(TH.text, 0.25); ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; ctx.fillStyle = TH.surf; ctx.beginPath(); ctx.roundRect(cx, cy, cw, 24, 12); ctx.fill();
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.strokeStyle = nodeColor(cn); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = TH.text; ctx.fillText(chip, csn.x, cy + 16);
    }
  }

  function loop(t) {
    if (destroyed || !stage.isConnected) { running = false; return; }   // 화면에서 떨어지면 멈춘다(start()로 재개)
    try { if (!win.document.hidden) draw(t); } catch (e) { onToast?.("관계도를 그리다 문제가 생겼어요."); running = false; return; }
    win.requestAnimationFrame(loop);
  }
  function start() { if (running || destroyed) return; running = true; resize(); win.requestAnimationFrame(loop); }

  // ── 선택 판정·조작 ──
  function hit(px, py) {
    let best = null, bd = 1e9;
    for (const id in screen) { const s = screen[id]; if (!visibleN(s.n)) continue; const d = Math.hypot(s.x - px, s.y - py); if (d < s.r + 8 && d < bd) { bd = d; best = { type: "node", id }; } }
    if (best) return best;
    let be = null, bed = 9;
    for (const e of edges) {
      if (!(e._al > 0.5)) continue;
      const A = screen[e.a.id], B = screen[e.b.id]; if (!A || !B) continue;
      const dx = B.x - A.x, dy = B.y - A.y, l2 = dx * dx + dy * dy || 1, t = clampN(((px - A.x) * dx + (py - A.y) * dy) / l2, 0, 1);
      const d = Math.hypot(px - (A.x + t * dx), py - (A.y + t * dy));
      if (d < bed) { bed = d; be = { type: "edge", id: e.id }; }
    }
    return be;
  }
  function hideTip() { tipEl.hidden = true; }
  function showTip(hh, px, py) {
    if (!hh || (hh.type === "node" && hh.id === "u")) { hideTip(); return; }
    const lines = [];
    if (hh.type === "node") { const n = byId[hh.id]; if (!n) return hideTip(); lines.push([dispName(n), true], [`${n.faction ? n.faction + " · " : ""}호감 ${n.aff} · 중요 ${n.imp}`], ["두 번 누르면 위키로 이동"]); }
    else { const e = edgeById(hh.id); if (!e) return hideTip(); lines.push([e.label, true], [`${e.a.name} · ${e.b.name}`], [`${e.w >= 0 ? "따뜻함" : "차가움"} · 강도 ${Math.round(e.s * 100)}${e.rc ? " · 최근 변화" : ""}${e.sp ? " · 특수" : ""}`]); }
    tipEl.textContent = "";
    for (const [txt, bold] of lines) { const el = win.document.createElement(bold ? "b" : "span"); el.textContent = txt; tipEl.appendChild(el); }
    tipEl.hidden = false;
    const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    tipEl.style.left = `${Math.max(8, Math.min(px + 14, W - tw - 8))}px`; tipEl.style.top = `${Math.max(8, Math.min(py + 14, H - th - 8))}px`;
  }

  function choose(h, { silent = false } = {}) {
    pathRes = null;
    st.sel = h;
    if (!silent) onSelect?.(h);
  }
  function edgeBetween(a, b) { return edges.find((e) => !e.user && ((e.a.id === a && e.b.id === b) || (e.a.id === b && e.b.id === a))); }
  function showPath(from, to) {
    const ids = findPath(edges.filter((e) => !e.user).map((e) => ({ a: e.a.id, b: e.b.id, s: e.s })), from, to, st.minS);
    const res = { ids: ids || [from, to], ok: !!ids, n: {}, e: {} };
    res.ids.forEach((i) => { res.n[i] = 1; });
    if (ids) for (let k = 0; k + 1 < ids.length; k++) res.e[edgeBetween(ids[k], ids[k + 1]).id] = 1;
    pathRes = res; st.sel = { type: "path" };
    return { ...res, edges: ids ? ids.slice(0, -1).map((i, k) => edgeBetween(i, ids[k + 1])) : [] };
  }

  let down = null, pinch = null;
  const pts = {};
  const clampZ = (v) => clampN(v, 0.5, 3);
  // 모바일은 평면(flat)으로 시작하는데 클래스가 안 붙어 touch-action:none이 그대로라 화면 스크롤이 막혔다.
  canvas.classList.toggle("flat", !!st.flat);
  const local = (ev) => { const r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  const on = (type, fn, opts) => { canvas.addEventListener(type, fn, opts); return () => canvas.removeEventListener(type, fn, opts); };
  const offs = [
    on("pointerdown", (ev) => {
      down = { x: ev.clientX, y: ev.clientY, moved: false };
      st.vyaw = 0; st.vp = 0; st.idleUntil = performance.now() + 2000;
      if (ev.pointerType !== "mouse") { const [lx, ly] = local(ev), dn = down; down.timer = setTimeout(() => { if (down === dn && !dn.moved) { dn.long = true; showTip(hit(lx, ly), lx, ly); } }, 450); }
      try { canvas.setPointerCapture(ev.pointerId); } catch { /* 일부 호스트 */ }
      pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      const pids = Object.keys(pts);
      if (pids.length === 2) { const pa = pts[pids[0]], pb = pts[pids[1]]; pinch = { d0: Math.hypot(pa.x - pb.x, pa.y - pb.y) || 1, z0: st.uz }; down.moved = true; clearTimeout(down.timer); st.drag = false; hideTip(); }
    }),
    on("pointermove", (ev) => {
      const [px, py] = local(ev);
      if (pts[ev.pointerId]) pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      if (pinch) { const q = Object.keys(pts); if (q.length >= 2) { const a = pts[q[0]], b = pts[q[1]]; st.uz = clampZ(pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0); st.idleUntil = performance.now() + 2000; } return; }
      if (down) {
        const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
        if (!down.moved && Math.hypot(dx, dy) > 5 && !st.flat) { down.moved = true; st.drag = true; clearTimeout(down.timer); hideTip(); }
        if (down.moved) {
          st.yaw -= dx * 0.008; st.pitch = clampN(st.pitch + dy * 0.005, 0.25, 1.25);
          st.vyaw = clampN(-dx * 0.008, -0.06, 0.06); st.vp = clampN(dy * 0.005, -0.03, 0.03); down.lt = performance.now(); down.x = ev.clientX; down.y = ev.clientY;
        }
      } else { const hh = hit(px, py); hotId = hh && hh.type === "node" ? hh.id : null; canvas.classList.toggle("hit", !!hh); showTip(hh, px, py); }
    }),
    on("pointerup", (ev) => {
      delete pts[ev.pointerId];
      if (pinch) { if (Object.keys(pts).length < 2) pinch = null; down = null; st.drag = false; st.idleUntil = performance.now() + 2000; return; }
      if (down && down.moved && performance.now() - (down.lt || 0) > 90) { st.vyaw = 0; st.vp = 0; }
      st.idleUntil = performance.now() + 2000;
      const moved = down && (down.moved || down.long);
      if (down) clearTimeout(down.timer);
      if (down && down.long) setTimeout(hideTip, 1600);
      down = null; st.drag = false;
      if (moved) return;
      const now = Date.now();
      if (lastTap.id && now - lastTap.t < 380 && Math.hypot(ev.clientX - lastTap.x, ev.clientY - lastTap.y) < 30) { const id = lastTap.id; lastTap = {}; onOpenWiki?.(id); return; }
      const [px, py] = local(ev);
      let h = hit(px, py);
      if (h && h.type === "node" && h.id === "u") h = null;
      lastTap = h && h.type === "node" ? { id: h.id, t: now, x: ev.clientX, y: ev.clientY } : {};
      choose(h);
    }),
    on("pointercancel", (ev) => { delete pts[ev.pointerId]; pinch = null; if (down) clearTimeout(down.timer); down = null; st.drag = false; }),
    on("pointerleave", () => { if (!down) { hotId = null; hideTip(); } }),
    on("wheel", (ev) => { ev.preventDefault(); st.uz = clampZ(st.uz * Math.exp(-ev.deltaY * 0.0015)); st.idleUntil = performance.now() + 2000; }, { passive: false })
  ];

  return {
    setData, start, resize, hideTip,
    destroy() { destroyed = true; offs.forEach((f) => f()); },
    select: (sel) => choose(sel, { silent: true }),
    showPath,
    setFlat(v) { if (v && !st.flat) st.yaw = ((st.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI; st.flat = v ? 1 : 0; canvas.classList.toggle("flat", !!v); },
    setSpin(v) { st.spin = !!v; },
    setHighlight(v) { st.hl = !!v; },
    setMinStrength(v) { st.minS = v; },
    setFaction(f) { st.faction = f; if (st.sel?.type === "node" && byId[st.sel.id] && !visibleN(byId[st.sel.id])) choose(null); },
    get flat() { return !!st.flat; },
    get factions() { return factions; },
    nodeColor: (n) => nodeColor(typeof n === "string" ? byId[n] : n),
    warmth, edgeBetween,
    nodeById: (id) => byId[id], edgeById, nodes: () => nodes, edges: () => edges
  };
}
