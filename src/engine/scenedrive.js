// addon-rebuild: 장면 판단·연출(Erosync Scene Director를 우리 방식으로). 채팅별 장기기억 폴더(folder.drive)에 둔다.
// - 관찰·계획은 매 턴 기록기 1단계 호출에 줄 몇 개로 합쳐 받는다(추가 호출 0): aim(원하는 것·다음 수·욕구), reply(몸 반응), done(이룸·접음).
// - 계산은 프로그램: 접근 단계(rung 0~5), 보폭(성적 즉흥성), 욕구 = 이번 턴에 움직일 확률, 집착 방지 쉬는 턴, 선호·금기 태그.
// - 다음 요청에 장면에 나온 인물의 계획만 짧게 넣는다(기억 블록 끝, 캐시 안전).
// 규칙 글은 Erosync 지시문(director.rules·sexualProposal·sexualTargets·decision·knowledge, inject.head)에서 가져와 줄였다.
const nk = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const text = (v, n = 160) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const RUNG_LABEL = Object.freeze(["아무것도 없음", "눈길·신호", "가까이·가벼운 손길", "몸 붙이기·둘만의 공간", "키스", "마지막 단계"]);
export const KIND_LABEL = Object.freeze({ sex: "성관계", romance: "연애", social: "관계", revenge: "앙갚음" });
export const STREAK_MAX = 3, REST_TURNS = 2, GOALS_PER_ACTOR = 4, LOG_MAX = 30;
const isUser = (n) => /^\{\{user\}\}$|^user$/i.test(String(n ?? "").trim());

// ── 기록기 1단계에 덧붙이는 줄(성인 항목이 켜졌을 때) ──
export const DRIVE_STAGE1 = [
  "",
  "",
  "Scene direction is on — ALSO observe newest and plan the next reply with these lines (most replies have 0-3 lines):",
  "aim|Actor|Target|sex, romance, social or revenge|what Actor wants from Target (Korean)|the next concrete move Actor makes toward it in the next reply (Korean)|desire 1-100",
  "      one line per NPC who actively wants something from someone present. Actor is never {{user}}; Target may be {{user}}. sex only when Actor's wanted outcome with this person is sexual intercourse (attraction or flirting alone is romance). desire is how strongly Actor wants it now. Plan only from what Actor actually knows (saw, was told, can clearly know); never act on secrets or others' private thoughts. Propose by default when Target is present and the scene gives any opening; skip only for structural reasons (no one present, a scene change, solitude, a mission scene with no opening).",
  "reply|Actor|Target|yes, wait or no      how Target's BODY answered Actor's move in newest: leans in, stays, touches back = yes; stiffens, holds still, watches = wait; slips away, pushes off, blocks = no. Playful words (stop it, a laugh) are not no while the body stays",
  "done|Actor|Target|reached or dropped      Actor got what they wanted in newest, or clearly gave it up",
].join("\n");

// 원문 → { aims, replies, dones }
export function driveFrom(raw, canon = (n) => n) {
  const out = { aims: [], replies: [], dones: [] };
  for (const line0 of String(raw ?? "").split(/\r?\n/)) {
    const f = line0.trim().replace(/^(?:[-*•>]+|\d+[.)])\s*/, "").split(/[|｜¦]/).map((x) => x.trim()), tag = (f[0] ?? "").toLowerCase();
    if (!["aim", "reply", "done"].includes(tag)) continue;
    const actor = canon(f[1]), target = isUser(f[2]) ? "{{user}}" : canon(f[2]);
    if (!actor || !target || isUser(actor) || nk(actor) === nk(target)) continue;
    if (tag === "aim" && out.aims.length < 8) {
      const kind = (/sex|성/.test(f[3] ?? "") ? "sex" : /romance|연애|사랑/.test(f[3] ?? "") ? "romance" : /reveng|앙갚|복수/.test(f[3] ?? "") ? "revenge" : "social");
      out.aims.push({ actor, target, kind, want: text(f[4], 120), move: text(f[5], 160), desire: clamp(Math.round(Number(String(f[6] ?? "").replace(/[^\d.]/g, "")) || 50), 1, 100) });
    } else if (tag === "reply" && out.replies.length < 8) out.replies.push({ actor, target, answer: /^y|예|응/i.test(f[3] ?? "") ? "yes" : /^n|아니|거절/i.test(f[3] ?? "") ? "no" : "wait" });
    else if (tag === "done" && out.dones.length < 8) out.dones.push({ actor, target, how: /drop|접|포기/i.test(f[3] ?? "") ? "dropped" : "reached" });
  }
  return out;
}

// 보폭: 성적 즉흥성 0-39 한 칸, 40-69 두 칸, 70+ 마지막 단계까지. 욕구 71+ 한 칸 더(Erosync director.sexualProposal)
export function stepWidth(spontaneity, desire) {
  const s = Number.isFinite(spontaneity) ? spontaneity : 50;
  return (s >= 70 ? 5 : s >= 40 ? 2 : 1) + (desire >= 71 ? 1 : 0);
}
const gkey = (a, t) => `${nk(a)}>${nk(t)}`;
export const emptyDrive = () => ({ turn: 0, goals: {}, rest: {}, log: [] });

// 한 턴 관찰 반영. spont(name) → 그 인물의 성적 즉흥성(없으면 null). 반환 { drive, changed:[글] }
export function applyDrive(drive0, obs, { spont = () => null, at = Date.now() } = {}) {
  const d = { turn: (drive0?.turn ?? 0) + 1, goals: { ...(drive0?.goals ?? {}) }, rest: { ...(drive0?.rest ?? {}) }, log: [...(drive0?.log ?? [])] }, changed = [];
  const note = (t) => { changed.push(t); d.log.push({ at, turn: d.turn, text: t }); };
  // 반응: 받은 쪽 몸이 받아 주면 보폭만큼, 멈추면 그대로, 밀어내면 한 칸 내려간다
  for (const r of obs?.replies ?? []) {
    const g = d.goals[gkey(r.actor, r.target)]; if (!g) continue;
    const before = g.rung ?? 0, w = g.kind === "sex" ? stepWidth(spont(g.actor), g.desire) : 1;
    const after = r.answer === "yes" ? clamp(before + w, 0, 5) : r.answer === "no" ? clamp(before - 1, 0, 5) : before;
    d.goals[gkey(r.actor, r.target)] = { ...g, rung: after, last: r.answer };
    if (after !== before) note(`${g.actor}→${g.target} ${RUNG_LABEL[before]} → ${RUNG_LABEL[after]}${r.answer === "no" ? "(밀어냄)" : ""}`);
  }
  // 이룸·접음
  for (const x of obs?.dones ?? []) {
    const k = gkey(x.actor, x.target), g = d.goals[k]; if (!g) continue;
    if (x.how === "reached") { d.goals[k] = { ...g, rung: g.kind === "sex" ? 5 : g.rung, fulfilled: (g.fulfilled ?? 0) + 1, desire: Math.max(1, Math.round(g.desire * 0.5)), streak: 0 }; note(`${g.actor}→${g.target} ${KIND_LABEL[g.kind]} 이룸`); }
    else { delete d.goals[k]; note(`${g.actor}→${g.target} ${KIND_LABEL[g.kind]} 접음`); }
  }
  // 새 계획·갱신. 같은 짝이 이번 턴에도 움직였으면 streak+1, 아니면 0 — STREAK_MAX 연속이면 REST_TURNS 쉬게(집착 방지)
  const acted = new Set();
  for (const a of obs?.aims ?? []) {
    const k = gkey(a.actor, a.target), g = d.goals[k];
    const next = { actor: a.actor, target: a.target, kind: a.kind, want: a.want || g?.want || "", move: a.move, desire: a.desire, rung: g?.rung ?? 0, fulfilled: g?.fulfilled ?? 0, streak: (g?.streak ?? 0) + 1, at: d.turn, last: g?.last ?? null };
    d.goals[k] = next; acted.add(k);
    if (!g) note(`${a.actor}→${a.target} ${KIND_LABEL[a.kind]} 목표 생김 · 욕구 ${a.desire}`);
    if (next.streak >= STREAK_MAX) { d.rest[nk(a.actor)] = d.turn + REST_TURNS; d.goals[k] = { ...next, streak: 0 }; note(`${a.actor} ${REST_TURNS}턴 쉬어요(같은 상대에 ${STREAK_MAX}턴 연속)`); }
  }
  for (const [k, g] of Object.entries(d.goals)) if (!acted.has(k) && g.streak) d.goals[k] = { ...g, streak: 0 };
  // 한 인물 목표는 최근 것부터 GOALS_PER_ACTOR개까지, 오래 안 움직인(30턴) 목표는 정리
  const byActor = {};
  for (const [k, g] of Object.entries(d.goals)) { if (d.turn - (g.at ?? 0) > 30) { delete d.goals[k]; continue; } (byActor[nk(g.actor)] ??= []).push([k, g]); }
  for (const list of Object.values(byActor)) list.sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0)).slice(GOALS_PER_ACTOR).forEach(([k]) => delete d.goals[k]);
  for (const [a, until] of Object.entries(d.rest)) if (until < d.turn) delete d.rest[a];
  d.log = d.log.slice(-LOG_MAX);
  return { drive: d, changed };
}

// 같은 요청을 다시 보내도(리롤) 같은 계획이 나오게 턴 번호로 정하는 난수
export function seeded(seed) { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// 이번 요청에 넣을 계획: 장면(최근 글)에 행위자와 대상이 다 나온 목표만, 쉬는 인물 빼고, 욕구 확률로 고른다. 반환 [{goal, toRung}]
export function pickPlans(drive, recentText, { spont = () => null, random = Math.random, max = 3, present = [] } = {}) {
  const t = String(recentText ?? "").normalize("NFKC").toLowerCase(), pres = new Set(present.map(nk).filter(Boolean));   // present: 이름이 글에 안 나와도 장면에 있는 인물(기억 블록에 든 인물·봇 캐릭터)
  const here = (n) => isUser(n) || pres.has(nk(n)) || (String(n ?? "").length >= 2 && t.includes(String(n).normalize("NFKC").toLowerCase()));
  const out = [], used = new Set();
  const goals = Object.values(drive?.goals ?? {}).filter((g) => here(g.actor) && here(g.target) && !(drive.rest?.[nk(g.actor)] >= (drive.turn ?? 0)) && g.move)
    .sort((a, b) => (b.desire ?? 0) - (a.desire ?? 0));
  for (const g of goals) {
    if (used.has(nk(g.actor)) || out.length >= max) continue;
    if (random() * 100 >= (g.desire ?? 50)) continue;   // 욕구 = 이번 턴에 움직일 확률(Erosync director.sexualTargets)
    used.add(nk(g.actor));
    out.push({ goal: g, toRung: g.kind === "sex" ? clamp((g.rung ?? 0) + stepWidth(spont(g.actor), g.desire), 0, 5) : null });
  }
  return out;
}

export const DRIVE_HEAD = "[Scene plan — hidden direction for the next reply. Apply each move through the actor's own personality and voice, only from what the actor knows. Never control {{user}}'s character. Do not mention this block.]";
export function driveSection(drive, recentText, { spont, random, limitsOf = () => [], present = [] } = {}) {
  const plans = pickPlans(drive, recentText, { spont, random, present });
  if (!plans.length) return "";
  const lines = plans.map(({ goal: g, toRung }) => {
    const lim = limitsOf(g.actor), lim2 = isUser(g.target) ? [] : limitsOf(g.target);
    return `- ${g.actor} → ${g.target} (${KIND_LABEL[g.kind]}): wants ${g.want || "-"}; next move: ${g.move}${toRung != null ? `; go from "${RUNG_LABEL[g.rung ?? 0]}" up to at most "${RUNG_LABEL[toRung]}" this reply` : ""}${g.last === "no" ? "; the target pushed back last time — read the body and do not force" : ""}${[...lim, ...lim2].length ? `; never go into: ${[...new Set([...lim, ...lim2])].join(", ")}` : ""}`;
  });
  return [DRIVE_HEAD, ...lines].join("\n");
}

// 화면용: 이 인물이 행위자이거나 대상인 목표, 쉬는 중인지
export function driveOf(drive, name) {
  const k = nk(name);
  return { aiming: Object.values(drive?.goals ?? {}).filter((g) => nk(g.actor) === k), aimedAt: Object.values(drive?.goals ?? {}).filter((g) => nk(g.target) === k),
    restLeft: drive?.rest?.[k] != null ? Math.max(0, drive.rest[k] - (drive.turn ?? 0) + 1) : 0, log: (drive?.log ?? []).filter((x) => String(x.text).includes(String(name))).slice(-5) };
}

// 관계 온도: 장기기억 감정 기록(folder.emo, 0~10)을 이 인물 → 상대별로 되짚어 호감(a)·이성적 호감(e)·적대감(h) 선(0~100)으로. AI 호출 없음.
export function emoTemp(folder, name, { maxPeople = 4 } = {}) {
  const k = nk(name), out = [];
  for (const pr of Object.values(folder?.emo ?? {})) {
    if (nk(pr?.from) !== k || !Array.isArray(pr.log) || !pr.log.length) continue;
    const cur = { affection: null, attraction: null, hostility: null }, pts = [];
    const first = pr.log[0]?.from ?? {};
    for (const t of Object.keys(cur)) cur[t] = first[t] ?? null;
    pr.log.forEach((e, i) => { for (const t of Object.keys(cur)) if (e?.t && t in e.t) cur[t] = e.t[t]; pts.push({ turn: Number.isFinite(e?.at) ? e.at : i, a: (cur.affection ?? 0) * 10, e: (cur.attraction ?? 0) * 10, h: (cur.hostility ?? 0) * 10 }); });
    if (pts.length >= 2) out.push({ to: pr.to, toName: pr.to === "{{user}}" ? "나" : pr.to, points: pts.slice(-20) });
  }
  return out.sort((a, b) => b.points.length - a.points.length).slice(0, maxPeople);
}
