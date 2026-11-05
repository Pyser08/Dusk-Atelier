// 위젯 홈 추가 위젯(Dusk): Dusk 바로가기 · D-day · 타이머 · 주사위·뽑기 · 한눈에(통계).
// 원본 위젯과 같은 카드 모양(.card .card-head)을 쓰고, 저장은 위젯 홈 저장소(store, 접두사 pocketrisu.basic-home.v1.)의 새 키만 쓴다.
export const EXTRA_IDS = ["dusk", "dday", "timer", "dice", "stats", "protlink"];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function extraHtml(icon) {
  return `
  <section class="card extra-card dusk-card" aria-label="Dusk 바로가기"><div class="card-head"><h2>${icon("widgets")}Dusk 바로가기</h2></div>
   <div class="dusk-grid">
    <button class="dusk-go" data-tab="memory"><b>장기 기억</b><small>인물·기록 보기</small></button>
    <button class="dusk-go" data-tab="relmap"><b>인물 관계도</b><small>한눈에 관계 보기</small></button>
    <button class="dusk-go" data-tab="cocoa"><b>코코아</b><small>스킬·프롬프트</small></button>
    <button class="dusk-go" data-tab="home"><b>Dusk 열기</b><small>모듈·봇 관리</small></button>
   </div><p class="subtle dusk-none" hidden>이 환경에서는 Dusk 화면을 바로 열 수 없어요.</p></section>
  <section class="card extra-card protlink-card" aria-label="ProtLink+"><div class="card-head"><h2>${icon("link")}ProtLink+</h2><button class="pl-open pill" type="button">열기</button></div>
   <ul class="pl-list"></ul><p class="subtle pl-note">링크를 불러오는 중…</p></section>
  <section class="card extra-card dday-card" aria-label="D-day"><div class="card-head"><h2>${icon("edit")}D-day</h2><button class="dday-add-open pill" aria-expanded="false">추가</button></div>
   <form class="dday-form" hidden><input class="dday-title" maxlength="40" placeholder="이름 (예: 이벤트 마감)" aria-label="D-day 이름"><input class="dday-date" type="date" aria-label="날짜"><button class="primary dday-save" type="submit">저장</button></form>
   <ul class="dday-list"></ul><p class="subtle dday-empty">기억하고 싶은 날을 추가해 보세요.</p></section>
  <section class="card extra-card timer-card" aria-label="타이머"><div class="card-head"><h2>${icon("refresh")}타이머</h2><div class="timer-modes"><button class="timer-mode" data-mode="timer" aria-pressed="true">타이머</button><button class="timer-mode" data-mode="watch" aria-pressed="false">스톱워치</button></div></div>
   <div class="timer-display" role="timer" aria-live="off">25:00</div>
   <div class="timer-presets"><button data-min="5">5분</button><button data-min="10">10분</button><button data-min="25">25분</button><button data-min="50">50분</button></div>
   <div class="timer-actions"><button class="primary timer-start">시작</button><button class="timer-reset">초기화</button></div></section>
  <section class="card extra-card dice-card" aria-label="주사위와 뽑기"><div class="card-head"><h2>${icon("plus")}주사위 · 뽑기</h2><div class="dice-modes"><button class="dice-mode" data-mode="dice" aria-pressed="true">주사위</button><button class="dice-mode" data-mode="pick" aria-pressed="false">뽑기</button></div></div>
   <div class="dice-pane"><div class="dice-row"><input class="dice-expr" value="1d6" maxlength="20" aria-label="주사위 식 (예: 2d6+1)"><button class="primary dice-roll">굴리기</button></div><div class="dice-quick"><button data-e="1d6">1d6</button><button data-e="2d6">2d6</button><button data-e="1d20">1d20</button><button data-e="1d100">1d100</button></div></div>
   <div class="pick-pane" hidden><textarea class="pick-list" rows="3" maxlength="2000" placeholder="한 줄에 하나씩 적어요" aria-label="뽑기 목록"></textarea><button class="primary pick-roll">하나 뽑기</button></div>
   <div class="dice-result" aria-live="polite"></div><ol class="dice-history"></ol></section>
  <section class="card extra-card stats-card" aria-label="한눈에"><div class="card-head"><h2>${icon("users")}한눈에</h2></div>
   <div class="stats-grid"><div><b class="st-chars">–</b><small>캐릭터</small></div><div><b class="st-today">–</b><small>오늘 대화한 봇</small></div><div><b class="st-week">–</b><small>이번 주 대화</small></div><div><b class="st-streak">–</b><small>연속 접속일</small></div></div>
   <p class="subtle st-top"></p></section>`;
}

export const EXTRA_CSS = `
.extra-card{padding:16px;display:flex;flex-direction:column;min-height:0;overflow:auto}
.extra-card .pill{min-height:30px;padding:3px 10px;border:1px solid var(--line);border-radius:999px;font-size:12px}
.dusk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.dusk-go{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:10px 12px;border:1px solid var(--line);background:var(--soft);border-radius:14px}
.dusk-go small{font-size:11px;color:var(--muted)}.dusk-go:hover{border-color:var(--accent)}
.dday-form{display:grid;grid-template-columns:1fr auto auto;gap:6px;margin-bottom:8px}.dday-form input{min-height:34px;padding:4px 8px}
.dday-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.dday-list li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:var(--soft)}
.dday-list .dd{font-weight:800;min-width:58px;color:var(--accent);font-variant-numeric:tabular-nums}.dday-list .dd.past{color:var(--muted)}.dday-list .dd.today{color:#ffd24a}
.dday-list .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dday-list small{color:var(--muted);font-size:11px}
.dday-list .del{min-height:28px;width:28px;padding:0;color:var(--muted)}
.timer-modes,.dice-modes{display:flex;gap:1px;background:var(--bg);border-radius:8px}
.timer-modes button,.dice-modes button{min-height:28px;padding:2px 9px;font-size:12px;border-radius:8px}
.timer-modes [aria-pressed=true],.dice-modes [aria-pressed=true]{background:var(--button)}
.timer-display{font-size:clamp(34px,9cqw,64px);font-weight:800;text-align:center;font-variant-numeric:tabular-nums;letter-spacing:1px;margin:4px 0 10px}
.timer-card{container-type:inline-size}.timer-card.done .timer-display{color:#ffd24a;animation:wh-blink 1s 3}
@keyframes wh-blink{50%{opacity:.35}}
.timer-presets,.dice-quick{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:8px}
.timer-presets button,.dice-quick button{min-height:30px;padding:3px 10px;border:1px solid var(--line);border-radius:999px;font-size:12px}
.timer-actions{display:flex;gap:8px;justify-content:center}.timer-actions button{min-width:84px}
.dice-row{display:flex;gap:6px;margin-bottom:8px}.dice-row input{flex:1;min-width:0;min-height:36px;padding:4px 10px}
.pick-pane{display:flex;flex-direction:column;gap:6px;margin-bottom:6px}.pick-pane textarea{padding:8px;resize:vertical}
.dice-result{font-size:26px;font-weight:800;text-align:center;min-height:36px;color:var(--accent)}.dice-result small{display:block;font-size:11px;color:var(--muted);font-weight:400}
.dice-result.roll{animation:wh-pop .25s ease}@keyframes wh-pop{0%{transform:scale(.7);opacity:.3}100%{transform:none;opacity:1}}
.dice-history{margin:4px 0 0;padding-left:18px;font-size:12px;color:var(--muted)}
.stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.stats-grid>div{padding:10px;border-radius:14px;background:var(--soft);display:flex;flex-direction:column;gap:2px}
.stats-grid b{font-size:22px;font-variant-numeric:tabular-nums}.stats-grid small{font-size:11px;color:var(--muted)}
.st-top{margin-top:8px}
.pl-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.pl-item{width:100%;display:flex;align-items:center;gap:10px;text-align:left;padding:8px 10px;border-radius:12px;background:var(--soft);border:1px solid transparent}
.pl-item:hover{border-color:var(--accent)}.pl-item .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.pl-item b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}.pl-item small{font-size:11px;color:var(--muted)}
.pl-item .k.new{color:var(--accent);border-color:var(--accent);font-weight:700}
.pl-item .k{flex:none;font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
.pl-note{margin:6px 0 0}`;

// 2d6+1, d20, 3d8-2 (최대 20개, 최대 1000면)
export function parseDice(expr) {
  const m = /^\s*(\d{0,2})\s*d\s*(\d{1,4})\s*(?:([+-])\s*(\d{1,4}))?\s*$/i.exec(String(expr ?? ""));
  if (!m) return null;
  const n = Math.max(1, Math.min(20, Number(m[1] || 1))), sides = Math.max(2, Math.min(1000, Number(m[2]))), mod = m[3] ? (m[3] === "-" ? -1 : 1) * Number(m[4]) : 0;
  return { n, sides, mod };
}
export function rollDice(spec, rand = Math.random) {
  const rolls = Array.from({ length: spec.n }, () => 1 + Math.floor(rand() * spec.sides));
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) + spec.mod };
}
const DAY = 86400000;
const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
// 남은 날: 오늘=0, 지난 날은 음수
export function daysUntil(iso, now = Date.now()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  if (!m) return null;
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return Math.round((target - dayStart(now)) / DAY);
}
export const ddayLabel = (d) => (d == null ? "" : d === 0 ? "D-day" : d > 0 ? `D-${d}` : `D+${-d}`);
export function normalizeDdays(v) {
  return (Array.isArray(v) ? v : []).filter((x) => x && typeof x.title === "string" && daysUntil(x.date) != null).slice(0, 30).map((x) => ({ id: String(x.id || Math.random().toString(36).slice(2)).slice(0, 40), title: x.title.slice(0, 40), date: x.date }));
}
export const fmtClock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60, p = (n) => String(n).padStart(2, "0"); return h ? `${h}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`; };
// 최근 대화 목록에서 오늘·이번 주 대화 수, 연속 접속일(방문 기록)
export function catalogStats(model, visits = [], now = Date.now()) {
  const rows = model?.status === "ready" ? model.recent ?? [] : [];
  const today = dayStart(now), week = today - 6 * DAY;
  const todayBots = new Set(rows.filter((r) => Number(r.time) >= today).map((r) => r.charId ?? r.name));
  const weekCount = rows.filter((r) => Number(r.time) >= week).length;
  const days = new Set(visits.map((t) => dayStart(t)));
  let streak = 0; for (let d = today; days.has(d); d -= DAY) streak++;
  const top = rows[0]?.name ?? "";
  return { chars: model?.counts?.characters ?? null, today: todayBots.size, week: weekCount, streak, top };
}

export const PL_KINDS = { character: "캐릭터", module: "모듈", plugin: "플러그인" };
export const plKind = (k) => PL_KINDS[k] ?? "";
export function createExtras({ sr, store, toast, openDusk, protLink = null, now = () => Date.now() }) {
  const $ = (s) => sr.querySelector(s), $$ = (s) => [...sr.querySelectorAll(s)];
  const timers = new Set(); let disposed = false;
  // ── Dusk 바로가기
  if (typeof openDusk !== "function") { $(".dusk-grid").hidden = true; $(".dusk-none").hidden = false; }
  for (const b of $$(".dusk-go")) b.onclick = () => openDusk?.(b.dataset.tab);
  // ── D-day
  let ddays = [];
  const paintDdays = () => {
    const list = $(".dday-list"), sorted = [...ddays].sort((a, b) => { const da = daysUntil(a.date, now()), db = daysUntil(b.date, now()); return (da < 0) - (db < 0) || Math.abs(da) - Math.abs(db); });
    list.innerHTML = sorted.map((x) => { const d = daysUntil(x.date, now()); return `<li data-id="${esc(x.id)}"><span class="dd${d < 0 ? " past" : d === 0 ? " today" : ""}">${ddayLabel(d)}</span><span class="t">${esc(x.title)}<br><small>${esc(x.date)}</small></span><button class="del" aria-label="${esc(x.title)} 지우기">×</button></li>`; }).join("");
    $(".dday-empty").hidden = ddays.length > 0;
    for (const b of $$(".dday-list .del")) b.onclick = () => { const id = b.closest("li").dataset.id; ddays = ddays.filter((x) => x.id !== id); paintDdays(); void store.set("ddays", ddays).catch(() => toast("D-day를 저장하지 못했어요.")); };
  };
  $(".dday-add-open").onclick = () => { const f = $(".dday-form"), open = f.hidden; f.hidden = !open; $(".dday-add-open").setAttribute("aria-expanded", String(open)); if (open) $(".dday-title").focus(); };
  $(".dday-form").onsubmit = (e) => {
    e.preventDefault();
    const title = $(".dday-title").value.trim(), date = $(".dday-date").value;
    if (!title || daysUntil(date) == null) return toast("이름과 날짜를 넣어 주세요.");
    if (ddays.length >= 30) return toast("D-day는 30개까지 둘 수 있어요.");
    ddays.push({ id: "dd-" + now().toString(36) + Math.random().toString(36).slice(2, 6), title: title.slice(0, 40), date });
    $(".dday-title").value = ""; $(".dday-form").hidden = true; $(".dday-add-open").setAttribute("aria-expanded", "false");
    paintDdays(); void store.set("ddays", ddays).catch(() => toast("D-day를 저장하지 못했어요."));
  };
  // ── 타이머·스톱워치
  const tm = { mode: "timer", total: 25 * 60000, left: 25 * 60000, elapsed: 0, running: false, at: 0, tick: null };
  const paintTimer = () => { $(".timer-display").textContent = fmtClock(tm.mode === "timer" ? tm.left : tm.elapsed); $(".timer-start").textContent = tm.running ? "일시정지" : tm.mode === "timer" && tm.left < tm.total || tm.mode === "watch" && tm.elapsed ? "계속" : "시작"; $(".timer-presets").hidden = tm.mode !== "timer"; for (const b of $$(".timer-mode")) b.setAttribute("aria-pressed", String(b.dataset.mode === tm.mode)); };
  const stopTick = () => { clearInterval(tm.tick); timers.delete(tm.tick); tm.tick = null; };
  const step = () => {
    const t = now(), d = t - tm.at; tm.at = t;
    if (tm.mode === "timer") { tm.left = Math.max(0, tm.left - d); if (!tm.left) { tm.running = false; stopTick(); $(".timer-card").classList.add("done"); toast("타이머가 끝났어요."); try { globalThis.navigator?.vibrate?.([200, 100, 200]); } catch { /* 진동 없음 */ } } }
    else tm.elapsed += d;
    paintTimer();
  };
  $(".timer-start").onclick = () => {
    $(".timer-card").classList.remove("done");
    if (tm.running) { step(); tm.running = false; stopTick(); }
    else { if (tm.mode === "timer" && !tm.left) tm.left = tm.total; tm.running = true; tm.at = now(); tm.tick = setInterval(step, 250); timers.add(tm.tick); }
    paintTimer();
  };
  $(".timer-reset").onclick = () => { tm.running = false; stopTick(); tm.left = tm.total; tm.elapsed = 0; $(".timer-card").classList.remove("done"); paintTimer(); };
  for (const b of $$(".timer-presets button")) b.onclick = () => { tm.running = false; stopTick(); tm.total = tm.left = Number(b.dataset.min) * 60000; $(".timer-card").classList.remove("done"); paintTimer(); };
  for (const b of $$(".timer-mode")) b.onclick = () => { if (tm.mode === b.dataset.mode) return; tm.running = false; stopTick(); tm.mode = b.dataset.mode; paintTimer(); };
  // ── 주사위·뽑기
  let history = [], diceMode = "dice";
  const showResult = (big, small) => { const r = $(".dice-result"); r.classList.remove("roll"); void r.offsetWidth; r.innerHTML = `${esc(big)}${small ? `<small>${esc(small)}</small>` : ""}`; r.classList.add("roll"); };
  const remember = (line) => { history = [line, ...history].slice(0, 5); $(".dice-history").innerHTML = history.map((x) => `<li>${esc(x)}</li>`).join(""); };
  const roll = () => {
    const expr = $(".dice-expr").value, spec = parseDice(expr);
    if (!spec) return toast("2d6+1처럼 적어 주세요.");
    const out = rollDice(spec);
    showResult(String(out.total), spec.n > 1 || spec.mod ? `${out.rolls.join(" + ")}${spec.mod ? (spec.mod > 0 ? " + " : " − ") + Math.abs(spec.mod) : ""}` : "");
    remember(`${expr.trim()} → ${out.total}`);
    void store.set("dice", { expr: expr.trim().slice(0, 20), list: $(".pick-list").value.slice(0, 2000) }).catch(() => {});
  };
  $(".dice-roll").onclick = roll;
  $(".dice-expr").onkeydown = (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); roll(); } };
  for (const b of $$(".dice-quick button")) b.onclick = () => { $(".dice-expr").value = b.dataset.e; roll(); };
  $(".pick-roll").onclick = () => {
    const items = $(".pick-list").value.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!items.length) return toast("뽑을 항목을 한 줄에 하나씩 적어 주세요.");
    const pick = items[Math.floor(Math.random() * items.length)];
    showResult(pick, `${items.length}개 중 하나`); remember(`뽑기 → ${pick}`);
    void store.set("dice", { expr: $(".dice-expr").value.trim().slice(0, 20), list: $(".pick-list").value.slice(0, 2000) }).catch(() => {});
  };
  for (const b of $$(".dice-mode")) b.onclick = () => { diceMode = b.dataset.mode; $(".dice-pane").hidden = diceMode !== "dice"; $(".pick-pane").hidden = diceMode !== "pick"; for (const x of $$(".dice-mode")) x.setAttribute("aria-pressed", String(x.dataset.mode === diceMode)); };
  // ── 한눈에
  let visits = [], lastModel = null;
  const paintStats = () => {
    const s = catalogStats(lastModel, visits, now());
    $(".st-chars").textContent = s.chars == null ? "–" : String(s.chars);
    $(".st-today").textContent = lastModel ? String(s.today) : "–";
    $(".st-week").textContent = lastModel ? String(s.week) : "–";
    $(".st-streak").textContent = `${s.streak}일`;
    $(".st-top").textContent = s.top ? `가장 최근: ${s.top}` : "";
  };
  (async () => {
    const [d, dice, v] = await Promise.allSettled([store.get("ddays"), store.get("dice"), store.get("visits")]);
    if (disposed) return;
    ddays = normalizeDdays(d.value); paintDdays();
    if (dice.value && typeof dice.value === "object") { if (parseDice(dice.value.expr)) $(".dice-expr").value = dice.value.expr; if (typeof dice.value.list === "string") $(".pick-list").value = dice.value.list; }
    visits = (Array.isArray(v.value) ? v.value : []).filter(Number.isFinite).slice(-60);
    const today = dayStart(now());
    if (!visits.some((t) => dayStart(t) === today)) { visits = [...visits, now()].slice(-60); void store.set("visits", visits).catch(() => {}); }
    paintStats();
  })().catch(() => {});
  // ── ProtLink+ (링크 목록은 ProtLink+ 저장소에서 읽기만 하고, 누르면 ProtLink+ 화면이 열려요)
  let plAt = 0, plBusy = false;
  const paintPl = (r) => {
    const list = $(".pl-list"), note = $(".pl-note"), open = $(".pl-open");
    if (!protLink) { list.innerHTML = ""; open.disabled = true; note.hidden = false; note.textContent = "이 환경에서는 ProtLink+를 열 수 없어요."; return; }
    const on = protLink.on();
    open.disabled = !on;
    const items = on && r?.ok ? [...r.items].sort((a, b) => Number(b.update) - Number(a.update)) : [];
    list.innerHTML = items.slice(0, 5).map((x) => `<li><button class="pl-item" type="button" data-id="${esc(x.id)}"><span class="t"><b>${esc(x.name)}</b><small>${esc(plKind(x.kind))}${x.target ? ` → ${esc(x.target.name)}` : ""}${x.error ? " · 확인 실패" : ""}</small></span>${x.update ? `<span class="k new">새 파일 ${x.pending.length}</span>` : ""}</button></li>`).join("");
    for (const b of $$(".pl-item")) b.onclick = () => openPl(b.dataset.id);
    note.hidden = items.length > 0 && on;
    note.textContent = !on ? "ProtLink+가 꺼져 있어요. Dusk의 ProtLink+ 화면에서 켜요." : r && !r.ok ? "링크를 읽지 못했어요." : items.length ? "" : "연결한 링크가 아직 없어요. ‘열기’에서 링크를 연결해 보세요.";
    if (items.length > 5 && on) { note.hidden = false; note.textContent = `외 ${items.length - 5}개 · ‘열기’에서 모두 볼 수 있어요.`; }
  };
  const loadPl = async () => {
    if (plBusy || disposed) return; plBusy = true; plAt = now();
    try { paintPl(protLink?.on() ? await protLink.links() : null); } catch { paintPl({ ok: false, items: [] }); } finally { plBusy = false; }
  };
  const openPl = async (id) => {
    if (!protLink) return;
    const ok = await protLink.open(id).catch(() => false);
    if (ok === false) toast(protLink.error?.() || "ProtLink+를 열지 못했어요.");
  };
  $(".pl-open").onclick = () => openPl();
  void loadPl();
  paintTimer();
  return {
    onCatalog(model) { lastModel = model; paintStats(); if (now() - plAt > 5000) void loadPl(); },
    refresh() { paintDdays(); paintStats(); void loadPl(); },   // 날짜가 바뀌었을 때(시계가 부름)
    dispose() { disposed = true; for (const t of timers) clearInterval(t); timers.clear(); }
  };
}
