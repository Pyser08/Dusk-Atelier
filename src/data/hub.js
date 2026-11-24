// Dusk 허브(2.2.46): 개발자 서버로 익명 사용 통계(하루 한 번)와 버그 신고를 보낸다.
// - 통계: 무작위 설치 ID·본체 버전·애드온 id/버전·환경만. 대화·봇·키는 보내지 않는다. 설정에서 끌 수 있다(dusk.hub.stats = "off").
// - 버그 신고: 사용자가 미리보기를 보고 '보내기'를 눌렀을 때만. 최근 오류 기록은 키처럼 보이는 글을 가린 뒤 붙인다.
// 서버 주소: pluginStorage 'dusk.hub.url'(시험용) → HUB_URL → 저장소 main의 hub.json {"url": "..."}(하루 한 번 읽어 둠).
// 주소를 바꿀 때 본체를 다시 내지 않아도 되게 hub.json에서 읽는다. 어디에도 없으면 아무것도 보내지 않는다.
export const HUB_URL = "";
export const HUB_CONFIG_URL = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/main/hub.json";
const CFG_KEY = "dusk.hub.remote", ID_KEY = "dusk.hub.id", STATS_KEY = "dusk.hub.stats", LAST_KEY = "dusk.hub.lastPing", URL_KEY = "dusk.hub.url";
const MINE_KEY = "dusk.hub.mine", MINE_SEEN = "dusk.hub.mineSeen", MINE_LAST = "dusk.hub.mineChecked";
const DAY = 24 * 3600e3, LOG_MAX = 60;

// 내 신고 상태(2.2.53): 서버가 신고마다 확인 키를 주고, 키로만 상태·답장을 본다(내용은 서버가 돌려주지 않음 — 제목 한 줄은 이 기기에만 둔다).
export const REPORT_STATUS = { new: "접수됨", seen: "확인했어요", doing: "고치는 중", done: "해결됐어요", dup: "중복·처리 안 함" };
// 상태가 바뀌었는데 아직 안 본 신고가 있는지(순수): mine [{key}], st {key:{changedAt}}, seen {key:time}
export function hasUnseen(mine, st, seen) {
  return (mine ?? []).some((m) => { const x = st?.[m.key]; return x && Number(x.changedAt) > (Number(seen?.[m.key]) || 0); });
}

// 키·토큰처럼 보이는 글을 가린다(순수)
export function redactSecrets(text) {
  return String(text ?? "")
    .replace(/\b(sk|pk|rk|xai|gsk|hf|ghp|gho|ghs|github_pat)[-_][A-Za-z0-9_\-]{12,}/g, "[가림]")
    .replace(/\bAIza[0-9A-Za-z_\-]{20,}/g, "[가림]")
    .replace(/(Bearer|Basic|token)\s+[A-Za-z0-9._\-+/=]{12,}/gi, "$1 [가림]")
    .replace(/([?&](?:key|api_key|apikey|token|access_token)=)[^&\s"']+/gi, "$1[가림]")
    .replace(/\b[A-Za-z0-9_\-]{40,}\b/g, "[가림]")
    .replace(/\b[0-9a-f]{32,}\b/gi, "[가림]");
}

// 최근 오류 기록(메모리에만). 콘솔의 오류·경고와 Dusk 실패 로그, 잡히지 않은 오류를 모은다.
const logs = [];
// 원인 찾기에 쓸모없는 브라우저 소음(동작에 문제없음)은 모으지 않는다
const NOISE = /ResizeObserver loop|Script error\.?$|Non-Error promise rejection captured/;
export function pushLog(kind, msg) {
  const text = redactSecrets(String(msg ?? "")).slice(0, 1500);
  if (!text || NOISE.test(text)) return;
  const last = logs[logs.length - 1];
  if (last && last.text === text) { last.n = (last.n ?? 1) + 1; return; }
  logs.push({ t: Date.now(), kind, text });
  if (logs.length > LOG_MAX) logs.splice(0, logs.length - LOG_MAX);
}
export const recentLogs = () => logs.slice();
// 가볍게(2.2.47): 객체는 통째로 JSON으로 바꾸지 않는다(큰 채팅·DB 객체가 찍혀도 비용이 없게). 글자는 앞부분만 쓴다.
const brief = (x) => {
  if (x instanceof Error) return `${x.name}: ${x.message}\n${String(x.stack ?? "").slice(0, 1200)}`;
  if (typeof x === "string") return x.length > 600 ? x.slice(0, 600) + "…" : x;
  if (x == null || typeof x !== "object") return String(x);
  if (Array.isArray(x)) return `[배열 ${x.length}]`;
  const msg = typeof x.message === "string" ? `: ${x.message.slice(0, 300)}` : "";
  return `[${x.constructor?.name ?? "객체"}${msg}]`;
};
const fmt = (a) => a.slice(0, 6).map(brief).join(" ");
// 같은 오류가 폭주해도 1초에 5줄까지만 모은다
let budget = 5, budgetAt = 0;
const allow = () => { const t = Date.now(); if (t - budgetAt > 1000) { budgetAt = t; budget = 5; } return budget-- > 0; };
let captured = false;
export function startLogCapture(win = globalThis) {
  if (captured) return; captured = true;
  const c = win.console;
  if (c) {
    for (const k of ["error", "warn"]) { const o = c[k]?.bind(c); if (o) c[k] = (...a) => { try { if (allow()) pushLog(k, fmt(a)); } catch { /* 기록 실패는 무시 */ } o(...a); }; }
    const ol = c.log?.bind(c);
    // log는 첫 인자가 "[Dusk…" 글자이고 실패·오류 낱말이 있을 때만 본다(그 밖에는 글자 검사 하나만 하고 지나감)
    if (ol) c.log = (...a) => { try { const h = a[0]; if (typeof h === "string" && h.startsWith("[Dusk") && /실패|오류|error/i.test(h + (typeof a[1] === "string" ? a[1] : "")) && allow()) pushLog("log", fmt(a)); } catch { /* 무시 */ } ol(...a); };
  }
  try {
    win.addEventListener?.("error", (e) => allow() && pushLog("uncaught", e?.error ? fmt([e.error]) : `${e?.message ?? ""} @${e?.filename ?? ""}:${e?.lineno ?? ""}`));
    win.addEventListener?.("unhandledrejection", (e) => allow() && pushLog("rejection", fmt([e?.reason])));
  } catch { /* 이벤트를 못 다는 환경 */ }
}

export function envInfo(win = globalThis) {
  const nav = win.navigator ?? {};
  const ua = String(nav.userAgent ?? "");
  return {
    ua: ua.slice(0, 300),
    mobile: /Android|iPhone|iPad|Mobile/i.test(ua),
    lang: nav.language ?? "",
    host: (() => { try { const p = win.parent?.location ?? win.location; return `${p?.protocol ?? ""}//${p?.host ?? ""}`.includes("localhost") ? "local" : "web"; } catch { return "unknown"; } })(),
    screen: win.screen ? `${win.screen.width}x${win.screen.height}` : ""
  };
}

// 기기 지문(2.2.49): 같은 기기가 설치 ID를 잃어도 서버가 같은 사람으로 합칠 수 있게. 원래 값은 보내지 않고 해시 앞 16자만.
export async function deviceFingerprint(win = globalThis) {
  try {
    const nav = win.navigator ?? {};
    const ua = String(nav.userAgent ?? "").replace(/[\d._]+/g, "#");   // 브라우저 버전이 올라도 같게
    const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })();
    const src = [ua, nav.platform ?? "", nav.language ?? "", tz, win.screen ? `${win.screen.width}x${win.screen.height}x${win.screen.colorDepth}` : "", nav.hardwareConcurrency ?? ""].join("|");
    const buf = await win.crypto.subtle.digest("SHA-256", new TextEncoder().encode("dusk-hub|" + src));
    return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch { return ""; }
}

// 리스 통로가 막혀도 오래 기다리지 않게(2.2.51)
const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(msg)), ms))]);

const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export function createHub(api, { version, addons, risuVersion } = {}) {
  const store = api.pluginStorage;
  const get = async (k) => { try { const v = await store.getItem(k); return v == null || v === "" ? null : v; } catch { return null; } };
  const set = (k, v) => store.setItem(k, v).catch?.(() => {});
  // 기기마다 따로인 저장소(getLocalPluginStorage). 설치 ID·마지막 핑은 여기에 둔다 — pluginStorage는 기기끼리 같이 쓰일 수 있어서
  // 두 기기가 한 사람으로 세이거나, 한 기기가 핑을 못 보내는 일이 있었다(2.2.49).
  let localP = null;
  const local = () => (localP ??= Promise.resolve().then(() => api.getLocalPluginStorage?.()).then((s) => (s?.getItem && s?.setItem ? s : null)).catch(() => null));
  const lget = async (k) => { const l = await local(); if (!l) return get(k); try { const v = await l.getItem(k); return v == null || v === "" ? null : v; } catch { return null; } };
  const lset = async (k, v) => { const l = await local(); if (!l) return set(k, v); try { await l.setItem(k, v); } catch { /* 못 쓰면 다음에 */ } };
  const okUrl = (u) => /^https:\/\/[^\s"'<>]+$/.test(String(u ?? "")) ? String(u).replace(/\/+$/, "") : "";
  let remote = null;
  // 주소가 있으면 하루, 비어 있으면 10분만 기억한다(2.2.47: 빈 값을 하루 기억해 hub.json을 채워도 늦게 반영됐다). force는 버그 신고 창을 열 때.
  const fresh = (c) => c && Date.now() - c.at < (c.url ? DAY : 600e3);
  async function remoteUrl(force = false) {
    if (!force && fresh(remote)) return remote.url;
    let c = null; try { c = JSON.parse((await get(CFG_KEY)) || "null"); } catch { /* 없음 */ }
    if (!force && fresh(c)) return (remote = c).url;
    let u = c?.url ?? "";
    try {
      const res = typeof api.nativeFetch === "function" ? await withTimeout(api.nativeFetch(`${HUB_CONFIG_URL}?t=${Math.floor(Date.now() / 6e4)}`, { method: "GET" }), 5000, "timeout") : null;
      if (res?.ok) { const t = await withTimeout(res.text(), 5000, "timeout"); u = okUrl(JSON.parse(t)?.url); }
    } catch { /* 못 읽으면 지난 값 */ }
    remote = { at: Date.now(), url: u };
    await set(CFG_KEY, JSON.stringify(remote));
    return u;
  }
  const url = async (force = false) => okUrl(await get(URL_KEY)) || okUrl(HUB_URL) || await remoteUrl(force);
  // 설치 ID: 기기 저장소 → (예전 버전이 남긴) pluginStorage → 새로 만들기. 동시에 불려도 하나만 만든다.
  let idP = null;
  const installId = () => (idP ??= (async () => {
    let id = await lget(ID_KEY);
    if (!id) { id = (await get(ID_KEY)) || uuid(); await lset(ID_KEY, id); }
    return String(id);
  })());
  let fpP = null;
  const fingerprint = () => (fpP ??= deviceFingerprint());
  async function addonList() {
    try { const idx = await addons?.getIndex?.(); return Object.entries(idx ?? {}).map(([id, a]) => ({ id, v: String(a?.version ?? ""), on: a?.on !== false })).slice(0, 80); } catch { return []; }
  }
  async function post(path, body) {
    const base = await url();
    if (!base) throw new Error("버그 신고 서버가 아직 정해지지 않았어요.");
    const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
    let res = null;
    if (typeof api.nativeFetch === "function") res = await withTimeout(api.nativeFetch(base + path, init), 10000, "timeout").catch(() => null);
    if (!res && typeof api.risuFetch === "function") {
      const r = await withTimeout(api.risuFetch(base + path, { method: "POST", headers: init.headers, body, rawResponse: false }), 10000, "timeout").catch(() => null);
      if (r) return { ok: !!r.ok, data: typeof r.data === "string" ? (() => { try { return JSON.parse(r.data); } catch { return {}; } })() : r.data ?? {} };
    }
    if (!res) throw new Error("서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.");
    let data = {}; try { data = await res.json(); } catch { /* 본문 없음 */ }
    if (!res.ok) throw new Error(data?.error || `서버가 받지 못했어요 (HTTP ${res.status})`);
    return { ok: true, data };
  }
  const statsOn = async () => (await get(STATS_KEY)) !== "off";
  async function setStats(on) { await set(STATS_KEY, on ? "on" : "off"); }
  // 하루 한 번만 보낸다. 실패해도 조용히 넘어간다.
  async function pingSoon() {
    if (!(await url()) || !(await statsOn())) return false;
    // 하루가 지났거나 본체·애드온 버전이 바뀌었을 때만(업데이트 직후 버전 통계가 바로 맞게 — 서버는 그 사람의 옛 버전을 새 버전으로 바꿔 센다)
    const list = await addonList();
    const sig = [String(version), ...list.map((a) => `${a.id}@${a.v}${a.on ? "" : "-"}`).sort()].join("|");
    const last = Number(await lget(LAST_KEY)) || 0, lastSig = await lget(LAST_KEY + ".v");
    if (Date.now() - last < DAY && lastSig === sig) return false;
    await lset(LAST_KEY, String(Date.now())); await lset(LAST_KEY + ".v", sig);
    const env = envInfo();
    await post("/api/ping", { id: await installId(), fp: await fingerprint(), v: version, risu: risuVersion?.() ?? "", addons: list, mobile: env.mobile, host: env.host }).catch(() => {});
    return true;
  }
  // 보낼 신고를 만든다(미리보기에 그대로 보여 준다)
  async function buildReport({ text, contact, withLogs = true } = {}) {
    return {
      id: await installId(),
      fp: await fingerprint(),
      v: version,
      risu: risuVersion?.() ?? "",
      text: redactSecrets(String(text ?? "")).slice(0, 4000),
      contact: String(contact ?? "").slice(0, 200),
      addons: await addonList(),
      env: envInfo(),
      logs: withLogs ? recentLogs().slice(-40) : []
    };
  }
  // 내 신고(이 기기에만): [{no, key, at, title}]
  const jget = async (k, d) => { try { return JSON.parse((await lget(k)) || "null") ?? d; } catch { return d; } };
  const subs = new Set();
  const emit = () => { for (const f of subs) { try { f(); } catch { /* 무시 */ } } };
  let stCache = null;   // {key: {no,status,reply,changedAt}}
  async function myReports() {
    const mine = await jget(MINE_KEY, []), st = stCache ?? (stCache = (await jget(MINE_KEY + ".st", {})) || {}), seen = await jget(MINE_SEEN, {});
    return { list: mine.slice().reverse().map((m) => ({ ...m, ...(st[m.key] ?? {}), unseen: hasUnseen([m], st, seen) })), unseen: hasUnseen(mine, st, seen) };
  }
  // 저장 묶음은 차례대로(확인과 새 신고가 겹쳐 서로 덮지 않게)
  let mineChain = Promise.resolve();
  const mineSerial = (fn) => { const p = mineChain.then(fn, fn); mineChain = p.catch(() => {}); return p; };
  const RETRY = 3600e3;
  // 하루 한 번(force면 바로) 서버에 상태를 묻는다. 신고가 없으면 아무것도 보내지 않는다. 실패하면 한 시간 뒤부터 다시 묻고 failed를 알린다.
  let tryAt = 0;
  async function checkReports({ force = false } = {}) {
    const mine = await jget(MINE_KEY, []);
    if (!mine.length) return myReports();
    const last = Number(await lget(MINE_LAST)) || 0;
    if (!force && (Date.now() - last < DAY || (tryAt && Date.now() - tryAt < RETRY))) return myReports();
    tryAt = Date.now();
    const r = await post("/api/report-status", { keys: mine.map((m) => m.key) }).catch(() => null);
    if (!r?.ok || !Array.isArray(r.data)) return { ...(await myReports()), failed: true };
    tryAt = 0;
    await mineSerial(async () => {
      await lset(MINE_LAST, String(Date.now()));
      const asked = new Set(mine.map((m) => m.key)), old = stCache ?? (await jget(MINE_KEY + ".st", {})) ?? {};
      const st = Object.fromEntries(Object.entries(old).filter(([k]) => !asked.has(k)));   // 묻는 사이 보낸 새 신고는 남긴다
      for (const x of r.data) if (x?.key) st[x.key] = { no: x.no, status: String(x.status ?? ""), reply: String(x.reply ?? "").slice(0, 300), changedAt: Number(x.changedAt) || 0 };
      stCache = st; await lset(MINE_KEY + ".st", JSON.stringify(st));
    });
    emit();
    return myReports();
  }
  // 화면에 보여 준 것만 봤다고 적는다. 기기 시계가 아니라 보여 준 서버 시각(changedAt)으로 적어 그 뒤 소식을 놓치지 않는다.
  async function markSeen(shown) {
    await mineSerial(async () => {
      const mine = await jget(MINE_KEY, []), old = (await jget(MINE_SEEN, {})) ?? {}, seen = {};
      for (const m of mine) if (old[m.key] != null) seen[m.key] = old[m.key];
      for (const x of shown ?? []) if (x?.changedAt && mine.some((m) => m.key === x.key)) seen[x.key] = Math.max(Number(seen[x.key]) || 0, Number(x.changedAt));
      await lset(MINE_SEEN, JSON.stringify(seen));
    });
    emit();
  }
  async function sendReport(report) {
    const r = await post("/api/report", report);
    const no = r.data?.no ?? null, key = typeof r.data?.key === "string" ? r.data.key : "";
    if (no && key) {
      const changedAt = Number(r.data.changedAt) || 0;   // 서버 시각
      await mineSerial(async () => {
        const mine = await jget(MINE_KEY, []);
        const title = String(report?.text ?? "").split("\n").find((l) => l.trim())?.trim().slice(0, 80) ?? "";
        mine.push({ no, key, at: Date.now(), title });
        await lset(MINE_KEY, JSON.stringify(mine.slice(-30)));
        stCache = { ...(stCache ?? (await jget(MINE_KEY + ".st", {}))), [key]: { no, status: "new", reply: "", changedAt } };
        await lset(MINE_KEY + ".st", JSON.stringify(stCache));
        const seen = (await jget(MINE_SEEN, {})) ?? {}; seen[key] = changedAt;   // 방금 보낸 신고만
        await lset(MINE_SEEN, JSON.stringify(seen));
      }).catch(() => {});   // 신고는 이미 갔다 — 기기에 못 적어도 실패로 알리지 않는다(다시 보내 중복되지 않게)
      emit();
    }
    return no;
  }
  const onReports = (f) => { subs.add(f); return () => subs.delete(f); };
  return { url, installId, statsOn, setStats, pingSoon, buildReport, sendReport, myReports, checkReports, markSeen, onReports, configured: async () => !!(await url()) || !!(await url(true)) };
}
