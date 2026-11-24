#!/usr/bin/env node
// Dusk 허브 — 사용 통계 · 버그 신고 · GitHub 이슈를 한곳에서 보는 개발자 서버.
//
// 쓰는 법:
//   ADMIN_TOKEN=아무긴비밀글 node hub.cjs            (설정은 같은 폴더 hub.config.json 또는 환경 변수)
//   node hub.cjs --check                            설정만 확인하고 끝냄
//   node hub.cjs --set-password                     관리 화면 비밀번호 정하기(해시만 hub-data/auth.json에 저장)
//
// 받는 것:
//   POST /api/ping     플러그인이 하루 한 번: {id, v, risu, addons:[{id,v,on}], mobile, host}
//   POST /api/report   버그 신고: {id, v, text, contact, addons, env, logs}  → {no}
//   POST /api/github   GitHub 웹후크(issues · issue_comment · pull_request). 서명(X-Hub-Signature-256) 확인
//   그 밖에 GitHub API를 10분마다 읽어 웹후크를 놓쳐도 이슈가 들어온다.
// 관리 화면: GET /  (ADMIN_TOKEN으로 로그인)
//
// Node 기본 기능만 쓴다(npm install 불필요). IP는 저장하지 않는다(요청 수 제한에만 메모리에서 잠깐 쓴다).
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const VERSION = "0.1.0";
const DIR = __dirname;

// ── 설정 ───────────────────────────────────────────────
function loadConfig() {
  let file = {};
  const p = process.env.HUB_CONFIG || path.join(DIR, "hub.config.json");
  if (fs.existsSync(p)) { try { file = JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { console.error(`[hub] ${p} 를 읽지 못했어요: ${e.message}`); process.exit(1); } }
  const env = process.env;
  const pick = (k, d) => env[k] ?? file[k] ?? d;
  return {
    port: Number(pick("PORT", 6100)),
    host: pick("HOST", "127.0.0.1"),
    adminToken: String(pick("ADMIN_TOKEN", "")),
    dataDir: path.resolve(DIR, pick("DATA_DIR", "hub-data")),
    repo: String(pick("GITHUB_REPO", "Pyser08/Dusk-Atelier")),
    githubToken: String(pick("GITHUB_TOKEN", "")),
    webhookSecret: String(pick("GITHUB_WEBHOOK_SECRET", "")),
    discordWebhook: String(pick("DISCORD_WEBHOOK", "")),
    publicUrl: String(pick("PUBLIC_URL", "")).replace(/\/+$/, ""),
    trustProxy: String(pick("TRUST_PROXY", "1")) !== "0",
    pollMinutes: Number(pick("GITHUB_POLL_MINUTES", 10))
  };
}

// ── 저장소(JSON 파일, 쓰기는 모아서) ───────────────────────
function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const files = { installs: {}, daily: {}, reports: [], issues: {}, meta: { reportNo: 0, issuesSyncedAt: null }, sessions: {}, auth: {} };
  const data = {};
  for (const [k, d] of Object.entries(files)) {
    const p = path.join(dir, `${k}.json`);
    try { data[k] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; } catch { fs.copyFileSync(p, `${p}.broken-${Date.now()}`); data[k] = d; }
  }
  const dirty = new Set();
  let timer = null;
  function flush() {
    timer = null;
    for (const k of dirty) {
      const p = path.join(dir, `${k}.json`), tmp = `${p}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data[k]));
      fs.renameSync(tmp, p);
    }
    dirty.clear();
  }
  return {
    data,
    rev: 0,   // 무엇이든 바뀌면 올라간다 — 관리 화면이 몇 초마다 보고 바뀌었을 때만 다시 그린다
    touch(k) { this.rev++; dirty.add(k); if (!timer) timer = setTimeout(flush, 1500); },
    flush
  };
}

// ── 도움 함수 ─────────────────────────────────────────────
const today = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const str = (v, n) => String(v ?? "").slice(0, n);
const json = (res, code, body, extra = {}) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }); res.end(JSON.stringify(body)); };
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
function readBody(req, limit) {
  return new Promise((ok, no) => {
    const chunks = []; let n = 0;
    req.on("data", (c) => { n += c.length; if (n > limit) { no(Object.assign(new Error("too large"), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", no);
  });
}
function rateLimiter() {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, 60e3).unref();
  return (key, max, windowMs) => {
    const now = Date.now(); let v = hits.get(key);
    if (!v || v.reset < now) { v = { n: 0, reset: now + windowMs }; hits.set(key, v); }
    return ++v.n <= max;
  };
}
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const cleanAddons = (list) => (Array.isArray(list) ? list : []).slice(0, 80).map((a) => ({ id: str(a?.id, 60), v: str(a?.v, 30), on: a?.on !== false })).filter((a) => a.id);

// 비밀번호: scrypt 해시만 저장
function hashPassword(pw) { const salt = crypto.randomBytes(16); return `scrypt$${salt.toString("hex")}$${crypto.scryptSync(pw, salt, 32).toString("hex")}`; }
function checkPassword(stored, pw) {
  const [kind, salt, hash] = String(stored ?? "").split("$");
  if (kind !== "scrypt" || !salt || !hash || !pw) return false;
  return safeEq(crypto.scryptSync(String(pw), Buffer.from(salt, "hex"), 32).toString("hex"), hash);
}

// ── 앱 ───────────────────────────────────────────────────
function createHub(cfg) {
  const store = createStore(cfg.dataDir);
  const D = store.data;
  const limit = rateLimiter();
  const vparts = (v) => String(v ?? "").split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : -1));
  const vcmp = (a, b) => { const x = vparts(a), y = vparts(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d; } return 0; };

  function notify(text) {
    if (!cfg.discordWebhook) return;
    fetch(cfg.discordWebhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text.slice(0, 1900) }) }).catch((e) => console.error("[hub] 디스코드 알림 실패", e.message));
  }

  // 카탈로그: 애드온 이름·최신 버전, 본체 최신 버전(한 시간마다 GitHub에서 읽음) ----------
  const branchOf = (r) => r.split("/").slice(0, 2).join("/");
  let catalog = { core: "", addons: {}, at: 0 };
  async function loadCatalog() {
    const raw = (b, f) => fetch(`https://raw.githubusercontent.com/${branchOf(cfg.repo)}/${b}/${f}?t=${Math.floor(Date.now() / 6e4)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [man, pkg] = await Promise.all([raw("addons", "addons/addons.json"), raw("main", "package.json")]);
    const addons = {};
    for (const a of man?.addons ?? []) if (a?.id) addons[a.id] = { name: str(a.name, 80), version: str(a.version, 30) };
    if (Object.keys(addons).length || pkg?.version) catalog = { core: str(pkg?.version ?? catalog.core, 30), addons: Object.keys(addons).length ? addons : catalog.addons, at: Date.now() };
    return catalog;
  }

  // 통계 -------------------------------------------------
  // 같은 사람 합치기: 옛 ID(from)의 기록을 새 ID(to)로 옮기고 옛 ID는 지운다. 일별 사용자 목록도 바꾼다.
  function mergeInstall(from, to) {
    const a = D.installs[from], b = D.installs[to];
    if (!a || !b || from === to) return false;
    b.first = Math.min(a.first ?? Date.now(), b.first ?? Date.now());
    if (!b.fp && a.fp) b.fp = a.fp;
    b.merged = (b.merged ?? 0) + 1 + (a.merged ?? 0);
    delete D.installs[from];
    for (const [d, ids] of Object.entries(D.daily)) {
      if (!ids.includes(from)) continue;
      const next = ids.filter((x) => x !== from);
      if (!next.includes(to)) next.push(to);
      D.daily[d] = next;
    }
    (D.meta.aliases ??= {})[from] = to;
    store.touch("installs"); store.touch("daily"); store.touch("meta");
    return true;
  }
  // 새 ID가 처음 왔을 때: 같은 기기 지문의 기존 기록 중, 버전이 같거나 낮고 이 핑보다 앞서 조용해진 것을 같은 사람으로 본다.
  function findSame(id, fp, v) {
    if (!fp) return null;
    let best = null;
    for (const [k, x] of Object.entries(D.installs)) {
      if (k === id || x.fp !== fp) continue;
      if (x.v && v && vcmp(v, x.v) < 0) continue;            // 새 ID가 더 낮은 버전이면 다른 기기
      if (Date.now() - x.last > 60 * 864e5) continue;          // 두 달 넘게 끊긴 건 남겨 둔다
      if (!best || x.last > best[1].last) best = [k, x];
    }
    return best?.[0] ?? null;
  }
  // 지문이 없던 옛 기록 정리: 한쪽이 끊긴 직후(36시간 안) 다른 쪽이 같은 환경·같거나 높은 버전으로 시작했으면 같은 사람으로 본다.
  function dedupeLegacy() {
    const list = Object.entries(D.installs).filter(([, x]) => !x.fp).sort((p, q) => p[1].first - q[1].first);
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const [ka, a] = list[i]; if (!D.installs[ka]) continue;
      for (let j = i + 1; j < list.length; j++) {
        const [kb, b] = list[j]; if (!D.installs[kb]) continue;
        const sameEnv = a.mobile === b.mobile && (a.host || "") === (b.host || "");
        const handoff = b.first >= a.first && b.first - a.last < 36 * 3600e3 && a.last <= b.last;
        const upgrade = !a.v || !b.v || vcmp(b.v, a.v) >= 0;
        if (sameEnv && handoff && upgrade) { mergeInstall(ka, kb); n++; break; }
      }
    }
    return n;
  }
  function onPing(b) {
    let id = str(b.id, 64);
    if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return { error: "bad id" };
    id = D.meta.aliases?.[id] ?? id;
    const fp = /^[a-f0-9]{16}$/.test(String(b.fp ?? "")) ? String(b.fp) : "";
    const now = Date.now();
    const isNew = !D.installs[id];
    const cur = D.installs[id] ?? { first: now };
    Object.assign(cur, { last: now, v: str(b.v, 30), risu: str(b.risu, 30), mobile: !!b.mobile, host: str(b.host, 20), addons: cleanAddons(b.addons) });
    if (fp) cur.fp = fp;
    D.installs[id] = cur; store.touch("installs");
    const d = today(now);
    const day = (D.daily[d] ??= []);
    if (!day.includes(id)) { day.push(id); store.touch("daily"); }
    if (isNew && fp) { const same = findSame(id, fp, cur.v); if (same) mergeInstall(same, id); }
    const keep = Object.keys(D.daily).sort().slice(0, -90);
    for (const k of keep) delete D.daily[k];
    return { ok: true };
  }

  function summary() {
    const now = Date.now(), ins = Object.values(D.installs);
    const act = (days) => ins.filter((i) => now - i.last < days * 864e5);
    const a7 = act(7), a30 = act(30);
    const series = [];
    for (let i = 29; i >= 0; i--) { const d = today(now - i * 864e5); series.push([d, (D.daily[d] ?? []).length]); }
    const fresh = []; for (let i = 13; i >= 0; i--) { const d0 = now - i * 864e5; fresh.push([today(d0), ins.filter((x) => today(x.first) === today(d0)).length]); }
    // 본체 버전: 새 버전부터
    const cv = {}; for (const i of a7) if (i.v) cv[i.v] = (cv[i.v] ?? 0) + 1;
    const latestCore = catalog.core || Object.keys(cv).sort(vcmp).pop() || "";
    const core = Object.entries(cv).sort((x, y) => vcmp(y[0], x[0])).map(([v, c]) => ({ v, c, latest: v === latestCore, old: latestCore && vcmp(v, latestCore) < 0 }));
    // 애드온: 사용자 수 많은 순, 버전은 새 버전부터
    const am = {};
    for (const i of a7) for (const a of i.addons) { const x = (am[a.id] ??= { id: a.id, installed: 0, on: 0, versions: {} }); x.installed++; if (a.on) x.on++; x.versions[a.v] = (x.versions[a.v] ?? 0) + 1; }
    for (const id of Object.keys(catalog.addons)) am[id] ??= { id, installed: 0, on: 0, versions: {} };
    const addons = Object.values(am).map((x) => {
      const latest = catalog.addons[x.id]?.version || Object.keys(x.versions).sort(vcmp).pop() || "";
      const versions = Object.entries(x.versions).sort((p, q) => vcmp(q[0], p[0])).map(([v, c]) => ({ v, c, latest: v === latest, old: latest && vcmp(v, latest) < 0 }));
      const upToDate = versions.filter((v) => v.latest || !v.old).reduce((n, v) => n + v.c, 0);
      return { id: x.id, name: catalog.addons[x.id]?.name || x.id, listed: !!catalog.addons[x.id], latest, installed: x.installed, on: x.on, upToDate, versions };
    }).sort((p, q) => q.installed - p.installed || p.name.localeCompare(q.name));
    const issues = Object.values(D.issues);
    return {
      total: ins.length, d1: act(1).length, d7: a7.length, d30: a30.length,
      mobile7: a7.filter((i) => i.mobile).length,
      core, latestCore, addons, series, fresh,
      reports: { open: D.reports.filter((r) => !["done", "dup"].includes(r.status)).length, new: D.reports.filter((r) => r.status === "new").length, total: D.reports.length },
      issues: { open: issues.filter((x) => x.state === "open" && !x.pr).length, prs: issues.filter((x) => x.state === "open" && x.pr).length, unseen: issues.filter((x) => x.state === "open" && isUnseen(x)).length, syncedAt: D.meta.issuesSyncedAt },
      catalogAt: catalog.at, repo: cfg.repo, version: VERSION
    };
  }


  // 버그 신고 ----------------------------------------------
  function onReport(b) {
    const text = str(b.text, 4000).trim();
    if (text.length < 2) return { error: "내용이 비어 있어요" };
    const no = ++D.meta.reportNo; store.touch("meta");
    const env = b.env && typeof b.env === "object" ? { ua: str(b.env.ua, 300), mobile: !!b.env.mobile, lang: str(b.env.lang, 20), host: str(b.env.host, 20), screen: str(b.env.screen, 20) } : {};
    const logs = (Array.isArray(b.logs) ? b.logs : []).slice(-40).map((l) => ({ t: Number(l?.t) || 0, kind: str(l?.kind, 12), text: str(l?.text, 1500), n: Number(l?.n) || undefined }));
    const r = { no, at: Date.now(), status: "new", memo: "", install: str(b.id, 64), v: str(b.v, 30), risu: str(b.risu, 30), text, contact: str(b.contact, 200), addons: cleanAddons(b.addons), env, logs };
    D.reports.push(r); store.touch("reports");
    const firstErr = logs.find((l) => l.kind !== "warn");
    notify(`🐞 버그 신고 #${no} · v${r.v}${env.mobile ? " · 모바일" : ""}\n${text.slice(0, 600)}${firstErr ? `\n\`\`\`${firstErr.text.slice(0, 400)}\`\`\`` : ""}${cfg.publicUrl ? `\n${cfg.publicUrl}/#report-${no}` : ""}`);
    return { ok: true, no };
  }

  // GitHub 이슈 --------------------------------------------
  const isUnseen = (x) => !x.seenAt || new Date(x.updatedAt).getTime() > x.seenAt;
  function upsertIssue(it, { fromHook = false } = {}) {
    if (!it?.number) return null;
    const prev = D.issues[it.number];
    const next = {
      number: it.number, title: str(it.title, 300), state: it.state, pr: !!it.pull_request,
      user: it.user?.login ?? "", labels: (it.labels ?? []).map((l) => (typeof l === "string" ? l : l?.name)).filter(Boolean),
      comments: it.comments ?? prev?.comments ?? 0, body: str(it.body, 6000), url: it.html_url,
      createdAt: it.created_at, updatedAt: it.updated_at, closedAt: it.closed_at ?? null,
      seenAt: prev?.seenAt ?? null, recent: prev?.recent ?? []
    };
    D.issues[it.number] = next; store.touch("issues");
    return { prev, next, isNew: !prev && fromHook };
  }
  function onGithubHook(event, body) {
    if (event === "ping") return { ok: true };
    if (event === "issues" || event === "pull_request") {
      const it = body.issue ?? body.pull_request;
      if (event === "pull_request" && it) it.pull_request = true;
      const r = upsertIssue(it, { fromHook: true });
      if (r && ["opened", "reopened"].includes(body.action)) notify(`📌 ${event === "pull_request" ? "PR" : "이슈"} #${it.number} ${body.action === "opened" ? "새로 열림" : "다시 열림"} · ${it.user?.login}\n**${it.title}**\n${it.html_url}`);
      return { ok: true };
    }
    if (event === "issue_comment") {
      const r = upsertIssue(body.issue, { fromHook: true });
      if (r && body.action === "created") {
        const c = body.comment;
        r.next.recent = [{ user: c.user?.login, at: c.created_at, body: str(c.body, 1500), url: c.html_url }, ...(r.next.recent ?? [])].slice(0, 10);
        r.next.updatedAt = c.created_at; store.touch("issues");
        if (c.user?.type !== "Bot") notify(`💬 #${body.issue.number} 새 댓글 · ${c.user?.login}\n**${body.issue.title}**\n${str(c.body, 500)}\n${c.html_url}`);
      }
      return { ok: true };
    }
    return { ok: true, ignored: event };
  }
  async function gh(p) {
    const headers = { Accept: "application/vnd.github+json", "User-Agent": "dusk-hub", "X-GitHub-Api-Version": "2022-11-28" };
    if (cfg.githubToken) headers.Authorization = `Bearer ${cfg.githubToken}`;
    const res = await fetch(`https://api.github.com${p}`, { headers });
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }
  let syncing = null;
  function syncIssues() {
    if (syncing) return syncing;
    syncing = (async () => {
      const since = D.meta.issuesSyncedAt;
      const started = new Date().toISOString();
      let page = 1, got = 0;
      for (;;) {
        const q = `state=all&per_page=100&sort=updated&direction=desc&page=${page}${since ? `&since=${encodeURIComponent(since)}` : ""}`;
        const list = await gh(`/repos/${cfg.repo}/issues?${q}`);
        for (const it of list) {
          const prev = D.issues[it.number];
          upsertIssue(it);
          // 놓친 새 이슈를 폴링으로 처음 찾았을 때도 알린다(첫 동기화는 조용히)
          if (since && !prev && !it.pull_request && it.state === "open") notify(`📌 이슈 #${it.number} 새로 열림 · ${it.user?.login}\n**${it.title}**\n${it.html_url}`);
        }
        got += list.length;
        if (list.length < 100 || page >= (since ? 5 : 30)) break;
        page++;
      }
      D.meta.issuesSyncedAt = started; store.touch("meta");
      return got;
    })().finally(() => { syncing = null; });
    return syncing;
  }
  async function loadComments(no) {
    const list = await gh(`/repos/${cfg.repo}/issues/${no}/comments?per_page=30`);
    const x = D.issues[no]; if (!x) return [];
    x.recent = list.slice(-10).reverse().map((c) => ({ user: c.user?.login, at: c.created_at, body: str(c.body, 1500), url: c.html_url }));
    store.touch("issues");
    return x.recent;
  }

  // 로그인 ------------------------------------------------
  const cookieOf = (req) => Object.fromEntries(String(req.headers.cookie ?? "").split(/;\s*/).filter(Boolean).map((c) => { const i = c.indexOf("="); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
  // 기기마다 무작위 세션. 쓸 때마다 400일로 늘어나서, 한 번 들어간 기기는 다시 묻지 않는다.
  const SESSION_DAYS = 400;
  const sidOf = (req) => { const v = String(cookieOf(req).hub_s ?? ""); return /^[a-f0-9]{64}$/.test(v) ? crypto.createHash("sha256").update(v).digest("hex") : ""; };
  function authed(req) {
    const k = sidOf(req), s = k && D.sessions[k];
    if (!s) return false;
    if (Date.now() - s.last > SESSION_DAYS * 864e5) { delete D.sessions[k]; store.touch("sessions"); return false; }
    if (Date.now() - s.last > 3600e3) { s.last = Date.now(); store.touch("sessions"); }
    return true;
  }
  const passOk = (pw) => checkPassword(D.auth?.pw, pw) || (!!cfg.adminToken && safeEq(pw, cfg.adminToken));
  function newSession(req) {
    const raw = crypto.randomBytes(32).toString("hex");
    D.sessions[crypto.createHash("sha256").update(raw).digest("hex")] = { at: Date.now(), last: Date.now(), ua: str(req.headers["user-agent"], 160) };
    store.touch("sessions");
    return `hub_s=${raw}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure()}`;
  }
  const secure = () => cfg.publicUrl.startsWith("https://") ? "; Secure" : "";

  // 요청 처리 ---------------------------------------------
  async function handle(req, res) {
    const u = new URL(req.url, "http://x");
    const ip = (cfg.trustProxy ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "") || req.socket.remoteAddress || "?";
    const p = u.pathname, m = req.method;
    try {
      if (m === "OPTIONS" && p.startsWith("/api/")) { res.writeHead(204, CORS); return res.end(); }
      if (m === "GET" && p === "/healthz") return json(res, 200, { ok: true, version: VERSION });
      if (m === "POST" && p === "/api/ping") {
        if (!limit(`p:${ip}`, 20, 3600e3)) return json(res, 429, { error: "too many" }, CORS);
        const b = JSON.parse((await readBody(req, 32e3)).toString("utf8") || "{}");
        const r = onPing(b); return json(res, r.error ? 400 : 200, r, CORS);
      }
      if (m === "POST" && p === "/api/report") {
        if (!limit(`r:${ip}`, 6, 600e3)) return json(res, 429, { error: "잠시 뒤에 다시 보내 주세요" }, CORS);
        const b = JSON.parse((await readBody(req, 256e3)).toString("utf8") || "{}");
        const r = onReport(b); return json(res, r.error ? 400 : 200, r, CORS);
      }
      if (m === "POST" && p === "/api/github") {
        const raw = await readBody(req, 2e6);
        if (!cfg.webhookSecret) return json(res, 403, { error: "webhook secret not set" });
        const sig = String(req.headers["x-hub-signature-256"] ?? "");
        const want = "sha256=" + crypto.createHmac("sha256", cfg.webhookSecret).update(raw).digest("hex");
        if (!safeEq(sig, want)) return json(res, 401, { error: "bad signature" });
        return json(res, 200, onGithubHook(String(req.headers["x-github-event"] ?? ""), JSON.parse(raw.toString("utf8"))));
      }
      if (m === "POST" && p === "/login") {
        if (!limit(`l:${ip}`, 10, 600e3)) return json(res, 429, { error: "too many" });
        const b = new URLSearchParams((await readBody(req, 4e3)).toString("utf8"));
        if (passOk(b.get("token") ?? "")) { res.writeHead(303, { Location: "/", "Set-Cookie": newSession(req) }); return res.end(); }
        res.writeHead(303, { Location: "/?bad=1" }); return res.end();
      }
      if (m === "POST" && p === "/logout") { const k = sidOf(req); if (k && D.sessions[k]) { delete D.sessions[k]; store.touch("sessions"); } res.writeHead(303, { Location: "/", "Set-Cookie": "hub_s=; Path=/; Max-Age=0" }); return res.end(); }
      if (m === "GET" && (p === "/" || p === "/index.html")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:", "Referrer-Policy": "no-referrer" });
        return res.end(authed(req) ? ADMIN_HTML : LOGIN_HTML);
      }
      if (p.startsWith("/api/admin/")) {
        if (!authed(req)) return json(res, 401, { error: "login" });
        if (m !== "GET" && req.headers["x-hub"] !== "1") return json(res, 403, { error: "csrf" });
        const rest = p.slice("/api/admin/".length).split("/");
        if (m === "GET" && rest[0] === "sessions") { const me = sidOf(req); return json(res, 200, Object.entries(D.sessions).map(([k, v]) => ({ id: k.slice(0, 12), me: k === me, ...v })).sort((a, b) => b.last - a.last)); }
        if (m === "DELETE" && rest[0] === "sessions" && rest[1]) { for (const k of Object.keys(D.sessions)) if (k.startsWith(rest[1]) && k !== sidOf(req)) delete D.sessions[k]; store.touch("sessions"); return json(res, 200, { ok: true }); }
        if (m === "POST" && rest[0] === "dedupe") return json(res, 200, { merged: dedupeLegacy() });
        if (m === "GET" && rest[0] === "rev") return json(res, 200, { rev: store.rev });
        if (m === "GET" && rest[0] === "summary") return json(res, 200, summary());
        if (m === "GET" && rest[0] === "reports") return json(res, 200, D.reports.slice().reverse());
        if (m === "PATCH" && rest[0] === "reports" && rest[1]) {
          const r = D.reports.find((x) => x.no === Number(rest[1])); if (!r) return json(res, 404, { error: "없음" });
          const b = JSON.parse((await readBody(req, 16e3)).toString("utf8") || "{}");
          if (["new", "seen", "doing", "done", "dup"].includes(b.status)) r.status = b.status;
          if (typeof b.memo === "string") r.memo = b.memo.slice(0, 4000);
          if (typeof b.issue === "number" || b.issue === null) r.issue = b.issue;
          store.touch("reports"); return json(res, 200, r);
        }
        if (m === "DELETE" && rest[0] === "reports" && rest[1]) { D.reports = D.reports.filter((x) => x.no !== Number(rest[1])); store.touch("reports"); return json(res, 200, { ok: true }); }
        if (m === "GET" && rest[0] === "issues") return json(res, 200, Object.values(D.issues).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map((x) => ({ ...x, unseen: isUnseen(x) })));
        if (m === "POST" && rest[0] === "issues" && rest[2] === "seen") { const x = D.issues[rest[1]]; if (x) { x.seenAt = Date.now(); store.touch("issues"); } return json(res, 200, { ok: true }); }
        if (m === "POST" && rest[0] === "issues" && rest[1] === "seen-all") { for (const x of Object.values(D.issues)) x.seenAt = Date.now(); store.touch("issues"); return json(res, 200, { ok: true }); }
        if (m === "GET" && rest[0] === "issues" && rest[2] === "comments") return json(res, 200, await loadComments(Number(rest[1])));
        if (m === "POST" && rest[0] === "sync") { const [got] = await Promise.all([syncIssues(), loadCatalog()]); return json(res, 200, { got }); }
        return json(res, 404, { error: "없음" });
      }
      json(res, 404, { error: "not found" });
    } catch (e) {
      if (e.code === 413) return json(res, 413, { error: "너무 커요" }, CORS);
      if (e instanceof SyntaxError) return json(res, 400, { error: "bad json" }, CORS);
      console.error("[hub]", m, p, e);
      json(res, 500, { error: String(e.message ?? e).slice(0, 200) });
    }
  }
  try { const n = dedupeLegacy(); if (n) console.log(`[hub] 겹친 옛 기록 ${n}건을 합쳤어요`); } catch (e) { console.error("[hub] 중복 정리 실패", e.message); }
  return { handle, store, syncIssues, loadCatalog, dedupeLegacy, onPing, onReport, onGithubHook, summary };
}

// ── 화면 ─────────────────────────────────────────────────
// Dusk 글래스(황혼) 스타일. 바깥 배경은 빛 번짐, 카드는 반투명 유리, 내용 카드 왼쪽엔 기능 색 빛 막대.
const BASE_CSS = String.raw`
:root{--bg:#160f2b;--b1:rgba(255,110,180,.42);--b2:rgba(100,120,255,.45);--b3:rgba(255,180,100,.30);--b4:rgba(150,90,255,.36);
--acc:#ff9a76;--acc2:#b07cff;--tint:#ffd9c7;--grad:linear-gradient(90deg,var(--acc),var(--acc2));--glow:rgba(255,154,118,.45);
--glass:color-mix(in srgb,var(--bg) 62%,rgba(255,255,255,.5));--glass2:rgba(255,255,255,.07);--glass3:rgba(255,255,255,.12);--gline:rgba(255,255,255,.14);
--hi:inset 0 1px 0 rgba(255,255,255,.14);--shadow:0 10px 34px rgba(0,0,0,.32);--blur:blur(22px) saturate(140%);
--text:#f3f0fb;--sub:rgba(243,240,251,.74);--mute:rgba(243,240,251,.54);--line:rgba(255,255,255,.09);
--ok:#4fdca8;--warn:#ffc35c;--err:#ff6b81;--pink:#e98bd6;--blue:#6f9dff;--mint:#3fcfa6;--orange:#ff8a5c;--r2:12px;--r3:18px}
*{box-sizing:border-box}html{background:var(--bg)}
body{margin:0;min-height:100vh;color:var(--text);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Pretendard","Apple SD Gothic Neo","Noto Sans KR",sans-serif;
background:radial-gradient(40% 45% at 12% 18%,var(--b1),transparent 70%),radial-gradient(45% 50% at 88% 78%,var(--b2),transparent 70%),radial-gradient(35% 40% at 70% 8%,var(--b3),transparent 70%),radial-gradient(40% 45% at 30% 95%,var(--b4),transparent 70%),var(--bg);background-attachment:fixed}
a{color:var(--tint)}button,input,select,textarea{font:inherit;color:inherit}
.btn{border:1px solid var(--gline);background:var(--glass2);border-radius:10px;padding:7px 13px;cursor:pointer;white-space:nowrap;transition:.15s}
.btn:hover{background:var(--glass3)}.btn.primary{background:var(--grad);border-color:transparent;color:#fff;box-shadow:0 0 14px var(--glow)}
.btn.ghost{border-style:dashed;background:none}.btn.danger{color:var(--err)}.btn:disabled{opacity:.5;cursor:default}
input,select,textarea{background:rgba(0,0,0,.22);border:1px solid var(--gline);border-radius:10px;padding:8px 11px;outline:none}
input:focus,textarea:focus{border-color:color-mix(in srgb,var(--acc) 70%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 22%,transparent)}
.glass{background:var(--glass);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);border:1px solid var(--gline);border-radius:var(--r3);box-shadow:var(--shadow),var(--hi)}
@media (prefers-reduced-transparency:reduce){.glass{backdrop-filter:none;background:color-mix(in srgb,var(--bg) 80%,#fff 8%)}}
`;
const LOGIN_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dusk 허브</title><style>${BASE_CSS}
.box{max-width:360px;margin:16vh auto 0;padding:30px 26px;display:flex;flex-direction:column;gap:14px}
h1{font-size:22px;margin:0;background:linear-gradient(90deg,#ffc27a,var(--acc),var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent}
p{margin:0;color:var(--sub);font-size:13px}.bad{color:var(--err)}</style></head><body>
<form class="box glass" method="post" action="/login"><h1>Dusk 허브</h1><p>비밀번호를 넣어 주세요. 이 기기는 다음부터 묻지 않아요.</p>
<input type="password" name="token" autocomplete="current-password" autofocus required>
<script>if(location.search.includes("bad"))document.write('<p class="bad">비밀번호가 맞지 않아요.</p>')</script>
<button class="btn primary" type="submit">들어가기</button></form></body></html>`;

const ADMIN_CSS = String.raw`
header{position:sticky;top:0;z-index:10;padding:12px 16px 0}
.bar{max-width:1280px;margin:0 auto;padding:10px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-radius:16px}
.logo{font-weight:800;font-size:17px;letter-spacing:-.02em;background:linear-gradient(90deg,#ffc27a,var(--acc),var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent;white-space:nowrap}
nav{display:flex;gap:4px;padding:3px;border-radius:12px;background:rgba(0,0,0,.2)}
nav button{border:0;background:none;padding:7px 14px;border-radius:9px;cursor:pointer;color:var(--sub);white-space:nowrap;display:flex;gap:6px;align-items:center}
nav button.on{background:var(--grad);color:#fff;font-weight:600;box-shadow:0 0 12px var(--glow)}
.pill{min-width:18px;padding:0 6px;border-radius:9px;background:var(--err);color:#fff;font-size:11px;line-height:18px;text-align:center;font-weight:700}
nav button.on .pill{background:#fff;color:var(--err)}
.sp{flex:1}.live{font-size:12px;color:var(--mute);display:flex;align-items:center;gap:6px}.live i{width:7px;height:7px;border-radius:50%;background:var(--ok);box-shadow:0 0 8px var(--ok)}
@media(max-width:700px){nav{order:3;flex-basis:100%;overflow-x:auto}.live{display:none}}
main{max-width:1280px;margin:0 auto;padding:16px 16px 60px}
.card{position:relative;padding:18px 20px;min-width:0}
.card.lb::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--k,var(--acc));box-shadow:0 0 12px var(--k,var(--acc))}
.card h2{margin:0 0 4px;font-size:15px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;white-space:nowrap}.card h2 small{font-weight:400;color:var(--mute);font-size:12px}
.card .desc{color:var(--mute);font-size:12.5px;margin:0 0 12px}
.g{display:grid;gap:14px}.kpis{grid-template-columns:repeat(5,minmax(0,1fr))}@media(max-width:980px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.kpi{padding:16px 18px}.kpi .k{color:var(--sub);font-size:12.5px}.kpi .v{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1.2;margin-top:4px;background:linear-gradient(180deg,#fff,var(--tint));-webkit-background-clip:text;background-clip:text;color:transparent}
.kpi .s{color:var(--mute);font-size:12px}
.row2{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}@media(max-width:980px){.row2{grid-template-columns:1fr}}
.chart{display:flex;align-items:flex-end;gap:4px;height:150px;position:relative;padding-top:8px;border-bottom:1px solid var(--line)}
.chart .gl{position:absolute;left:0;right:0;border-top:1px dashed var(--line);font-size:10.5px;color:var(--mute)}
.chart .gl span{position:absolute;right:0;top:-15px}
.chart .b{flex:1;border-radius:5px 5px 2px 2px;min-height:3px;background:linear-gradient(180deg,color-mix(in srgb,var(--acc2) 85%,#fff 10%),color-mix(in srgb,var(--acc2) 35%,transparent));position:relative;cursor:default}
.chart .b.today{background:var(--grad);box-shadow:0 0 12px var(--glow)}
.chart .b:hover::after{content:attr(data-t);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:rgba(10,8,20,.92);border:1px solid var(--gline);color:#fff;font-size:11.5px;padding:3px 8px;border-radius:7px;white-space:nowrap;z-index:2}
.axis{display:flex;justify-content:space-between;color:var(--mute);font-size:11px;margin-top:6px}
.todo{display:flex;flex-direction:column;gap:8px}
.todo button{all:unset;cursor:pointer;display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:var(--r2);background:var(--glass2)}
.todo button:hover{background:var(--glass3)}.todo .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.todo .n{font-size:11px;color:var(--mute)}.empty{color:var(--mute);text-align:center;padding:26px 0;font-size:13px}
.dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--k,var(--acc));box-shadow:0 0 8px var(--k,var(--acc))}
.stack{display:flex;height:14px;border-radius:7px;overflow:hidden;background:rgba(0,0,0,.25);margin:6px 0 12px}
.stack i{display:block;height:100%}
.leg{display:flex;flex-direction:column;gap:6px}.leg div{display:flex;gap:8px;align-items:center;font-size:13px}.leg .c{margin-left:auto;color:var(--sub);font-variant-numeric:tabular-nums}
.sw{width:10px;height:10px;border-radius:3px;flex:none}
.chip{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:20px;background:var(--glass2);border:1px solid var(--line);font-size:12px;color:var(--sub);white-space:nowrap}
.chip b{color:var(--text);font-weight:600}.chip.latest{background:color-mix(in srgb,var(--ok) 18%,transparent);border-color:color-mix(in srgb,var(--ok) 45%,transparent);color:var(--ok)}
.chip.latest b{color:#d8fff0}.chip.old{opacity:.8;border-style:dashed}.chip.hot{background:var(--grad);color:#fff;border:0}
.chip.err{background:color-mix(in srgb,var(--err) 18%,transparent);border-color:color-mix(in srgb,var(--err) 40%,transparent);color:#ffc2cc}
.chip.warn{background:color-mix(in srgb,var(--warn) 16%,transparent);border-color:color-mix(in srgb,var(--warn) 40%,transparent);color:#ffe2a8}
.tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.tools .grow{flex:1;min-width:170px}
.seg{display:inline-flex;padding:3px;border-radius:11px;background:rgba(0,0,0,.22);flex-wrap:wrap}
.seg button{border:0;background:none;padding:5px 11px;border-radius:8px;cursor:pointer;color:var(--sub);white-space:nowrap;font-size:13px}
.seg button.on{background:var(--glass3);color:#fff;font-weight:600}.seg button .c{opacity:.6;margin-left:4px;font-size:11.5px}
/* 애드온 표 */
.adds{display:flex;flex-direction:column}
.add{display:grid;grid-template-columns:minmax(150px,1.2fr) minmax(120px,1fr) 92px minmax(0,2fr);gap:14px;align-items:center;padding:12px 4px;border-top:1px solid var(--line)}
.add:first-child{border-top:0}.add .nm b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.add .nm small{color:var(--mute);font-size:11.5px}
.add .use{font-size:12px;color:var(--sub)}.meter{height:7px;border-radius:4px;background:rgba(0,0,0,.28);overflow:hidden;margin-top:5px}.meter i{display:block;height:100%;background:var(--grad);border-radius:4px}
.add .pct{text-align:center}.add .pct b{font-size:17px;font-variant-numeric:tabular-nums}.add .pct small{display:block;color:var(--mute);font-size:11px}
.add .vs{display:flex;gap:5px;flex-wrap:wrap}.add.zero{opacity:.45}
@media(max-width:820px){.add{grid-template-columns:1fr 80px}.add .use{grid-column:1/-1;order:3}.add .vs{grid-column:1/-1;order:4}}
.good{color:var(--ok)}.mid{color:var(--warn)}.bad{color:var(--err)}
/* 두 칸(목록 + 상세) */
.split{display:grid;grid-template-columns:minmax(300px,410px) minmax(0,1fr);gap:14px;align-items:start}
.listcol{padding:14px;position:sticky;top:84px;max-height:calc(100vh - 100px);display:flex;flex-direction:column}
.listcol .items{overflow:auto;margin:0 -6px;padding:0 6px;flex:1}
.it{display:flex;gap:10px;padding:11px 12px;border-radius:var(--r2);cursor:pointer;margin-bottom:4px;align-items:flex-start;border:1px solid transparent}
.it:hover{background:var(--glass2)}.it.sel{background:var(--glass3);border-color:var(--gline)}
.it .no{color:var(--mute);font-size:12px;font-variant-numeric:tabular-nums;min-width:34px;padding-top:1px}
.it .main{flex:1;min-width:0}.it .t{font-weight:600;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.it .m{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;align-items:center;font-size:11.5px;color:var(--mute)}
.it .ud{width:8px;height:8px;border-radius:50%;background:var(--acc);box-shadow:0 0 8px var(--acc);margin-top:6px;flex:none}
.it .ud.no{background:none;box-shadow:none}
.grp{font-size:12px;color:var(--sub);padding:10px 8px 4px;display:flex;gap:6px;align-items:center}
.grp code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ffc2cc;font-size:11.5px}
.detail{padding:22px 24px;min-height:300px}
.detail h3{margin:2px 0 10px;font-size:19px;line-height:1.35;overflow-wrap:anywhere}
.dh{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:var(--mute);font-size:12.5px}
.sec{margin-top:18px}.sec>b{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--sub);margin-bottom:8px;font-weight:600;text-transform:none}
.box{background:rgba(0,0,0,.22);border:1px solid var(--line);border-radius:var(--r2);padding:12px 14px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13.5px}
pre{margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;max-height:320px;overflow:auto}
details.log{border:1px solid var(--line);border-left:3px solid var(--k,var(--mute));border-radius:10px;margin:6px 0;background:rgba(0,0,0,.18)}
details.log summary{cursor:pointer;padding:8px 12px;font-size:12.5px;display:flex;gap:8px;align-items:center;list-style:none}
details.log summary::-webkit-details-marker{display:none}details.log summary .s{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,monospace;font-size:12px}
details.log pre{padding:0 12px 10px}
.facts{display:flex;gap:6px;flex-wrap:wrap}
.acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}
.comment{background:var(--glass2);border:1px solid var(--line);border-radius:var(--r2);padding:11px 13px;margin:8px 0}.comment .m{color:var(--mute);font-size:12px;margin-bottom:5px;display:flex;gap:8px}
.back{display:none}
@media(max-width:900px){.split{grid-template-columns:1fr}.listcol{position:static;max-height:none}.detail{position:fixed;inset:0;z-index:30;border-radius:0;overflow:auto;display:none;background:var(--bg)}.detail.on{display:block}.back{display:inline-flex;margin-bottom:10px}}
.kbd{font-size:11px;color:var(--mute)}.kbd kbd{border:1px solid var(--gline);border-radius:5px;padding:0 5px;font:inherit;background:var(--glass2)}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:9px 16px;border-radius:12px;background:rgba(10,8,20,.92);border:1px solid var(--gline);font-size:13px;z-index:50;opacity:0;transition:.2s;pointer-events:none}.toast.on{opacity:1}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;z-index:40;align-items:center;justify-content:center;padding:16px}.modal.on{display:flex}.modal .in{max-width:640px;width:100%;max-height:85vh;overflow:auto}
`;

const ADMIN_JS = String.raw`
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=(s)=>String(s??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const api=async(p,o={})=>{const r=await fetch("/api/admin/"+p,{...o,headers:{"Content-Type":"application/json","X-Hub":"1",...(o.headers||{})}});if(r.status===401){location.reload();throw new Error("login")}const j=await r.json();if(!r.ok)throw new Error(j.error||r.status);return j};
const ago=(t)=>{if(!t)return"-";const s=(Date.now()-new Date(t).getTime())/1e3;if(s<60)return"방금";if(s<3600)return Math.floor(s/60)+"분 전";if(s<86400)return Math.floor(s/3600)+"시간 전";if(s<86400*30)return Math.floor(s/86400)+"일 전";return new Date(t).toLocaleDateString("ko-KR")};
const toast=(t)=>{const e=$("#toast");e.textContent=t;e.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("on"),1800)};
const firstLine=(s)=>String(s||"").split("\n")[0];
const ST={new:["새 신고","err"],seen:["확인함",""],doing:["고치는 중","warn"],done:["해결","latest"],dup:["중복·무시","old"]};
const hue=(s)=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))%360;return h};
const label=(l)=>'<span class="chip" style="border-color:hsla('+hue(l)+',80%,70%,.45);color:hsl('+hue(l)+',85%,80%)">'+esc(l)+'</span>';
let tab=localStorage.getItem("hub.tab")||"overview",S=null,R=[],I=[];
const rf={q:"",st:"open",group:localStorage.getItem("hub.group")==="1",sel:null};
const inf={q:"",st:"open",kind:"issue",sel:null};
let addFilter=localStorage.getItem("hub.addf")||"installed";
function pills(){const a=S?.reports?.new||0,b=S?.issues?.unseen||0;$("#rp").hidden=!a;$("#rp").textContent=a;$("#ip").hidden=!b;$("#ip").textContent=b;document.title=(a+b?"("+(a+b)+") ":"")+"Dusk 허브"}
function setTab(t){tab=t;localStorage.setItem("hub.tab",t);$$("nav button").forEach(b=>b.classList.toggle("on",b.dataset.tab===t));render()}

/* ── 개요 ── */
function pctCls(p){return p>=80?"good":p>=50?"mid":"bad"}
function overview(){const s=S;const top=Math.max(4,...s.series.map(x=>x[1]));const step=Math.ceil(top/4);const max=step*4;
const latestN=s.core.filter(v=>v.latest).reduce((n,v)=>n+v.c,0),coreTotal=s.core.reduce((n,v)=>n+v.c,0)||0,latestPct=coreTotal?Math.round(latestN/coreTotal*100):0;
const newR=R.filter(r=>r.status==="new").slice(0,4),unseen=I.filter(x=>x.unseen&&x.state==="open").slice(0,4);
let h='<div class="g kpis">'+[["오늘 켠 사람",s.d1,"최근 24시간"],["주간 사용자",s.d7,"7일 안에 켬"],["월간 사용자",s.d30,"30일 안에 켬"],["모든 설치",s.total,"한 번이라도 켬"],["최신 본체",coreTotal?latestPct+"%":"-",s.latestCore?"v"+s.latestCore+" 사용 비율":"버전 정보 없음"]].map(([k,v,t])=>'<div class="glass kpi"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="s">'+esc(t)+'</div></div>').join("")+'</div>';
h+='<div class="g row2" style="margin-top:14px"><section class="glass card lb" style="--k:var(--blue)"><h2>일일 사용자 <small>최근 30일 · 막대에 올리면 숫자</small></h2><div class="chart" style="margin-top:14px">'+[1,2,3,4].map(i=>'<div class="gl" style="bottom:'+(i*25)+'%"><span>'+(step*i)+'</span></div>').join("")+s.series.map(([d,c],i)=>'<div class="b'+(i===s.series.length-1?" today":"")+'" style="height:'+(c/max*100)+'%" data-t="'+d.slice(5).replace("-","/")+" · "+c+'명"></div>').join("")+'</div><div class="axis"><span>'+s.series[0][0].slice(5).replace("-","/")+'</span><span>2주 전</span><span>오늘</span></div>'+
'<div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="kbd" style="margin-right:4px">새로 설치(14일)</span>'+s.fresh.map(([d,c])=>'<span class="chip'+(c?" hot":"")+'" title="'+d+'">'+d.slice(8)+'일 '+c+'</span>').join("")+'</div></section>'+
'<section class="glass card lb" style="--k:var(--pink)"><h2>할 일</h2><p class="desc">눌러서 바로 열어요</p><div class="todo">'+
(newR.map(r=>'<button data-go-r="'+r.no+'"><span class="dot" style="--k:var(--err)"></span><span class="t">'+esc(firstLine(r.text))+'</span><span class="n">#'+r.no+' · '+ago(r.at)+'</span></button>').join("")+unseen.map(x=>'<button data-go-i="'+x.number+'"><span class="dot"></span><span class="t">'+esc(x.title)+'</span><span class="n">'+(x.pr?"PR ":"이슈 ")+'#'+x.number+' · '+ago(x.updatedAt)+'</span></button>').join("")||'<div class="empty">밀린 일이 없어요</div>')+'</div></section></div>';
// 본체 버전
const pal=(i,v)=>v.latest?"var(--ok)":["#b07cff","#6f9dff","#e98bd6","#ffc35c","#ff8a5c","#8f8aa6"][i%6];
h+='<div class="g row2" style="margin-top:14px"><section class="glass card lb" style="--k:var(--orange)"><h2>애드온 <small>주간 사용자 '+s.d7+'명 기준</small><span class="sp"></span><span class="seg" id="addf">'+[["installed","설치된 것"],["all","모두"],["old","옛 버전 있는 것"]].map(([k,l])=>'<button data-v="'+k+'" class="'+(addFilter===k?"on":"")+'">'+l+'</button>').join("")+'</span></h2><p class="desc">설치 수 · 최신 버전 비율 · 버전별 사람 수. 초록 칩이 최신이에요.</p><div class="adds">'+addonRows()+'</div></section>'+
'<section class="glass card lb" style="--k:var(--mint)"><h2>본체 버전 <small>주간</small></h2><p class="desc">'+(s.latestCore?'최신 v'+esc(s.latestCore)+' · <b class="'+pctCls(latestPct)+'">'+latestPct+'%</b>가 최신을 써요':'버전 정보를 기다리는 중')+'</p>'+
(coreTotal?'<div class="stack">'+s.core.map((v,i)=>'<i style="width:'+(v.c/coreTotal*100)+'%;background:'+pal(i,v)+'" title="v'+esc(v.v)+' · '+v.c+'명"></i>').join("")+'</div><div class="leg">'+s.core.map((v,i)=>'<div><span class="sw" style="background:'+pal(i,v)+'"></span>v'+esc(v.v)+(v.latest?' <span class="chip latest">최신</span>':v.old?'':' <span class="chip">새 버전?</span>')+'<span class="c">'+v.c+'명 · '+Math.round(v.c/coreTotal*100)+'%</span></div>').join("")+'</div>':'<div class="empty">아직 없음</div>')+
'<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--line)"><b style="font-size:12px;color:var(--sub)">환경</b><div class="stack" style="margin-top:8px"><i style="width:'+(s.d7?s.mobile7/s.d7*100:0)+'%;background:var(--pink)"></i><i style="width:'+(s.d7?(s.d7-s.mobile7)/s.d7*100:0)+'%;background:var(--blue)"></i></div><div class="leg"><div><span class="sw" style="background:var(--pink)"></span>모바일<span class="c">'+s.mobile7+'명</span></div><div><span class="sw" style="background:var(--blue)"></span>PC<span class="c">'+(s.d7-s.mobile7)+'명</span></div></div></div></section></div>';
h+='<p class="kbd" style="margin-top:16px">애드온 목록 '+(s.catalogAt?ago(s.catalogAt)+" 확인":"확인 전")+' · 이슈 '+ago(s.issues.syncedAt)+' 동기화 · 허브 v'+s.version+' · <button class="btn ghost" id="dedupe" style="padding:2px 9px;font-size:11.5px">겹친 사용자 정리</button></p>';
return h}
function addonRows(){let l=S.addons;if(addFilter==="installed")l=l.filter(a=>a.installed);if(addFilter==="old")l=l.filter(a=>a.versions.some(v=>v.old));
if(!l.length)return'<div class="empty">'+(addFilter==="installed"?"아직 애드온을 쓰는 사람이 없어요":"해당하는 애드온이 없어요")+'</div>';
return l.map(a=>{const p=a.installed?Math.round(a.upToDate/a.installed*100):0;const share=S.d7?Math.round(a.installed/S.d7*100):0;
return '<div class="add'+(a.installed?"":" zero")+'"><div class="nm"><b title="'+esc(a.name)+'">'+esc(a.name)+'</b><small>'+esc(a.id)+(a.latest?' · 최신 v'+esc(a.latest):'')+(a.listed?'':' · 목록에 없음')+'</small></div>'+
'<div class="use">'+a.installed+'명 설치 · 켬 '+a.on+'<div class="meter"><i style="width:'+share+'%"></i></div></div>'+
'<div class="pct">'+(a.installed?'<b class="'+pctCls(p)+'">'+p+'%</b><small>최신 사용</small>':'<small>-</small>')+'</div>'+
'<div class="vs">'+(a.versions.map(v=>'<span class="chip '+(v.latest?"latest":v.old?"old":"")+'">v'+esc(v.v)+' <b>'+v.c+'</b></span>').join("")||'<span class="kbd">설치한 사람 없음</span>')+'</div></div>'}).join("")}

/* ── 버그 신고 ── */
const sigOf=(r)=>{const e=r.logs.find(l=>!["warn","log"].includes(l.kind))||r.logs[0];return e?firstLine(e.text).replace(/\d+/g,"#").slice(0,120):""};
function rFiltered(){const q=rf.q.toLowerCase();return R.filter(r=>(rf.st==="all"||(rf.st==="open"?!["done","dup"].includes(r.status):r.status===rf.st))&&(!q||(r.text+" "+r.contact+" "+r.v+" "+r.logs.map(l=>l.text).join(" ")).toLowerCase().includes(q)))}
const rItem=(r)=>{const e=sigOf(r);return '<div class="it'+(rf.sel===r.no?" sel":"")+'" data-r="'+r.no+'"><span class="ud'+(r.status==="new"?"":" no")+'"></span><div class="main"><div class="t">'+esc(firstLine(r.text).slice(0,160))+'</div><div class="m"><span class="chip '+ST[r.status][1]+'">'+ST[r.status][0]+'</span><span>#'+r.no+'</span><span>v'+esc(r.v)+'</span>'+(r.env.mobile?'<span>모바일</span>':'')+'<span>'+ago(r.at)+'</span></div>'+(e?'<div class="m"><span style="color:#ffb3bf;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(e)+'</span></div>':'')+'</div></div>'};
function reportsView(){const list=rFiltered();const cnt=(k)=>R.filter(r=>k==="all"||(k==="open"?!["done","dup"].includes(r.status):r.status===k)).length;
let items;if(rf.group){const g={};for(const r of list){const k=sigOf(r)||"(오류 기록 없음)";(g[k]??=[]).push(r)}items=Object.entries(g).sort((a,b)=>b[1].length-a[1].length).map(([k,rs])=>'<div class="grp"><span class="chip '+(rs.length>1?"hot":"")+'">'+rs.length+'건</span><code title="'+esc(k)+'">'+esc(k)+'</code></div>'+rs.map(rItem).join("")).join("")}else items=list.map(rItem).join("");
return '<div class="split"><aside class="glass listcol"><div class="tools"><input class="grow" id="rq" placeholder="내용·오류·버전 찾기" value="'+esc(rf.q)+'"></div><div class="tools"><span class="seg" id="rst">'+[["open","처리 전"],["new","새 신고"],["doing","고치는 중"],["done","해결"],["all","전체"]].map(([k,l])=>'<button data-v="'+k+'" class="'+(rf.st===k?"on":"")+'">'+l+'<span class="c">'+cnt(k)+'</span></button>').join("")+'</span><label class="kbd" style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="rgrp"'+(rf.group?" checked":"")+'>같은 오류 묶기</label></div><div class="items">'+(items||'<div class="empty">신고가 없어요</div>')+'</div><div class="kbd" style="margin-top:8px"><kbd>J</kbd>/<kbd>K</kbd> 이동 · <kbd>1</kbd>~<kbd>5</kbd> 상태</div></aside><section class="glass detail" id="det">'+reportDetail()+'</section></div>'}
function reportDetail(){const r=R.find(x=>x.no===rf.sel);if(!r)return'<div class="empty" style="padding-top:90px">왼쪽에서 신고를 고르세요</div>';
const lc=S?.latestCore,cat={};for(const a of S?.addons||[])cat[a.id]=a.latest;
const vChip=lc&&r.v?(r.v===lc?'<span class="chip latest">v'+esc(r.v)+' 최신</span>':'<span class="chip warn">v'+esc(r.v)+' · 최신 v'+esc(lc)+'</span>'):'<span class="chip">v'+esc(r.v||"?")+'</span>';
const logK=(k)=>k==="warn"?"var(--warn)":k==="log"?"var(--blue)":"var(--err)";
return '<button class="btn back" id="dback">← 목록</button><div class="dh"><span>버그 신고 #'+r.no+'</span><span>·</span><span>'+new Date(r.at).toLocaleString("ko-KR")+'</span></div><h3>'+esc(firstLine(r.text).slice(0,200))+'</h3>'+
'<span class="seg" id="rs">'+Object.entries(ST).map(([k,[l]],i)=>'<button data-v="'+k+'" class="'+(r.status===k?"on":"")+'" title="'+(i+1)+'">'+l+'</button>').join("")+'</span>'+
'<div class="sec"><b>환경</b><div class="facts">'+vChip+'<span class="chip">'+(r.env.mobile?"모바일":"PC")+'</span>'+(r.env.host?'<span class="chip">'+esc(r.env.host)+'</span>':'')+(r.risu?'<span class="chip">RisuAI '+esc(r.risu)+'</span>':'')+(r.env.screen?'<span class="chip">'+esc(r.env.screen)+'</span>':'')+(r.contact?'<span class="chip hot">연락: '+esc(r.contact)+'</span>':'')+'</div>'+(r.env.ua?'<div class="kbd" style="margin-top:6px;overflow-wrap:anywhere">'+esc(r.env.ua)+'</div>':'')+'</div>'+
'<div class="sec"><b>내용</b><div class="box">'+esc(r.text)+'</div></div>'+
'<div class="sec"><b>오류 기록 <span class="chip">'+r.logs.length+'</span></b>'+(r.logs.slice().reverse().map((l,i)=>'<details class="log" style="--k:'+logK(l.kind)+'"'+(i===0&&l.kind!=="warn"?" open":"")+'><summary><span class="chip">'+esc(l.kind)+'</span><span class="s">'+esc(firstLine(l.text))+'</span><span class="kbd">'+(l.n?l.n+"번 · ":"")+(l.t?new Date(l.t).toLocaleTimeString("ko-KR"):"")+'</span></summary><pre>'+esc(l.text)+'</pre></details>').join("")||'<div class="kbd">없음</div>')+'</div>'+
'<div class="sec"><b>애드온 <span class="chip">'+r.addons.length+'</span></b><div class="facts">'+(r.addons.map(a=>{const L=cat[a.id];const st=!a.on?"old":L&&a.v!==L?"warn":"";return '<span class="chip '+st+'" title="'+(L?"최신 v"+esc(L):"")+'">'+esc(a.id)+' <b>'+esc(a.v)+'</b>'+(a.on?"":" 꺼짐")+(st==="warn"?" ↑":"")+'</span>'}).join("")||'<span class="kbd">없음</span>')+'</div></div>'+
'<div class="sec"><b>메모 <span class="kbd" id="mok"></span></b><textarea id="memo" rows="3" style="width:100%" placeholder="원인·고친 버전 등 (자동 저장)">'+esc(r.memo)+'</textarea></div>'+
'<div class="acts"><button class="btn primary" id="rissue">GitHub 이슈로 만들기</button><button class="btn" id="rcopy">마크다운 복사</button><span class="sp"></span><button class="btn danger" id="rdel">지우기</button></div>'}
function reportMd(r){return "**버그 신고 #"+r.no+"** · v"+r.v+(r.env.mobile?" · 모바일":"")+(r.risu?" · RisuAI "+r.risu:"")+"\n\n"+r.text+"\n\n**애드온**: "+(r.addons.map(a=>a.id+" "+a.v+(a.on?"":"(꺼짐)")).join(", ")||"없음")+"\n\n"+(r.logs.length?"<details><summary>오류 기록</summary>\n\n\x60\x60\x60\n"+r.logs.slice(-12).map(l=>"["+l.kind+"] "+l.text).join("\n\n").slice(0,5000)+"\n\x60\x60\x60\n</details>\n":"")}
async function setStatus(r,v){r.status=v;await api("reports/"+r.no,{method:"PATCH",body:JSON.stringify({status:v})});S=await api("summary");pills();drawReports(true)}
function bindReportDetail(){const r=R.find(x=>x.no===rf.sel);if(!r)return;const d=$("#det");
$("#dback")&&($("#dback").onclick=()=>{d.classList.remove("on");rf.sel=null;drawReports()});
$("#rs").onclick=(e)=>{const v=e.target.closest("button")?.dataset.v;if(v)setStatus(r,v)};
let mt;$("#memo").oninput=(e)=>{clearTimeout(mt);$("#mok").textContent="…";mt=setTimeout(async()=>{r.memo=e.target.value;await api("reports/"+r.no,{method:"PATCH",body:JSON.stringify({memo:r.memo})});$("#mok").textContent="저장됨"},700)};
$("#rcopy").onclick=async()=>{try{await navigator.clipboard.writeText(reportMd(r));toast("복사했어요")}catch{toast("복사하지 못했어요")}};
$("#rissue").onclick=()=>{const u="https://github.com/"+S.repo+"/issues/new?title="+encodeURIComponent("[버그 신고 #"+r.no+"] "+firstLine(r.text).slice(0,80))+"&body="+encodeURIComponent(reportMd(r).slice(0,6000));window.open(u,"_blank","noopener")};
$("#rdel").onclick=async()=>{if(!confirm("#"+r.no+" 신고를 지울까요?"))return;await api("reports/"+r.no,{method:"DELETE"});R=R.filter(x=>x!==r);rf.sel=null;S=await api("summary");pills();drawReports()}}
async function openReport(no){rf.sel=no;const r=R.find(x=>x.no===no);history.replaceState(null,"","#report-"+no);if(r&&r.status==="new"){r.status="seen";api("reports/"+no,{method:"PATCH",body:JSON.stringify({status:"seen"})}).then(async()=>{S=await api("summary");pills()})}drawReports(true);$("#det").classList.add("on")}
function drawReports(keepScroll){const sc=$(".listcol .items")?.scrollTop;$("#main").innerHTML=reportsView();if(keepScroll&&sc)$(".listcol .items").scrollTop=sc;
$("#rq").oninput=(e)=>{rf.q=e.target.value;const p=e.target.selectionStart;drawReports();const i=$("#rq");i.focus();i.setSelectionRange(p,p)};
$("#rst").onclick=(e)=>{const v=e.target.closest("button")?.dataset.v;if(v){rf.st=v;drawReports()}};
$("#rgrp").onchange=(e)=>{rf.group=e.target.checked;localStorage.setItem("hub.group",rf.group?"1":"0");drawReports()};
$$("[data-r]").forEach(el=>el.onclick=()=>openReport(+el.dataset.r));if(rf.sel)$("#det").classList.add("on");bindReportDetail()}

/* ── 이슈 ── */
function iFiltered(){const q=inf.q.toLowerCase();return I.filter(x=>(inf.kind==="all"||(inf.kind==="pr"?x.pr:!x.pr))&&(inf.st==="all"||(inf.st==="unseen"?x.unseen&&x.state==="open":x.state===inf.st))&&(!q||(x.title+" "+x.body+" "+x.user+" "+x.labels.join(" ")).toLowerCase().includes(q)))}
function issuesView(){const list=iFiltered();const base=I.filter(x=>inf.kind==="all"||(inf.kind==="pr"?x.pr:!x.pr));const cnt={unseen:base.filter(x=>x.unseen&&x.state==="open").length,open:base.filter(x=>x.state==="open").length,closed:base.filter(x=>x.state==="closed").length,all:base.length};
return '<div class="split"><aside class="glass listcol"><div class="tools"><input class="grow" id="iq" placeholder="제목·내용·작성자·라벨 찾기" value="'+esc(inf.q)+'"><button class="btn" id="sync" title="GitHub에서 지금 다시 읽기">동기화</button></div><div class="tools"><span class="seg" id="ist">'+[["unseen","새 활동"],["open","열림"],["closed","닫힘"],["all","전체"]].map(([k,l])=>'<button data-v="'+k+'" class="'+(inf.st===k?"on":"")+'">'+l+'<span class="c">'+cnt[k]+'</span></button>').join("")+'</span><span class="seg" id="ikind">'+[["issue","이슈"],["pr","PR"],["all","둘 다"]].map(([k,l])=>'<button data-v="'+k+'" class="'+(inf.kind===k?"on":"")+'">'+l+'</button>').join("")+'</span>'+(cnt.unseen?'<button class="btn ghost" id="seenall">모두 읽음</button>':'')+'</div><div class="items">'+
(list.map(x=>'<div class="it'+(inf.sel===x.number?" sel":"")+'" data-i="'+x.number+'"><span class="ud'+(x.unseen&&x.state==="open"?"":" no")+'"></span><div class="main"><div class="t">'+esc(x.title)+'</div><div class="m"><span class="chip '+(x.state==="open"?"latest":"old")+'">'+(x.state==="open"?"열림":"닫힘")+'</span>'+(x.pr?'<span class="chip">PR</span>':'')+'<span>#'+x.number+'</span><span>'+esc(x.user)+'</span><span>💬 '+x.comments+'</span><span>'+ago(x.updatedAt)+'</span></div>'+(x.labels.length?'<div class="m">'+x.labels.map(label).join("")+'</div>':'')+'</div></div>').join("")||'<div class="empty">'+(I.length?"조건에 맞는 이슈가 없어요":"아직 불러온 이슈가 없어요. ‘동기화’를 눌러 보세요")+'</div>')+
'</div><div class="kbd" style="margin-top:8px"><kbd>J</kbd>/<kbd>K</kbd> 이동 · <kbd>O</kbd> GitHub에서 열기</div></aside><section class="glass detail" id="det">'+issueDetail()+'</section></div>'}
function issueDetail(){const x=I.find(i=>i.number===inf.sel);if(!x)return'<div class="empty" style="padding-top:90px">왼쪽에서 이슈를 고르세요</div>';
return '<button class="btn back" id="dback">← 목록</button><div class="dh"><span>'+(x.pr?"PR":"이슈")+' #'+x.number+'</span><span>·</span><span>'+esc(x.user)+'</span><span>·</span><span>'+new Date(x.createdAt).toLocaleString("ko-KR")+'</span></div><h3>'+esc(x.title)+'</h3><div class="facts"><span class="chip '+(x.state==="open"?"latest":"old")+'">'+(x.state==="open"?"열림":"닫힘")+'</span>'+x.labels.map(label).join("")+'<span class="chip">💬 '+x.comments+'</span><span class="chip">마지막 활동 '+ago(x.updatedAt)+'</span></div>'+
'<div class="sec"><b>본문</b><div class="box">'+(esc(x.body)||'<span class="kbd">(본문 없음)</span>')+'</div></div><div class="sec"><b>댓글</b><div id="cm">'+(x.recent?.length?comments(x.recent):'<div class="kbd">불러오는 중…</div>')+'</div></div>'+
'<div class="acts"><a class="btn primary" href="'+esc(x.url)+'" target="_blank" rel="noopener" style="text-decoration:none">GitHub에서 열기 · 답하기 ↗</a></div>'}
const comments=(l)=>l.length?l.map(c=>'<div class="comment"><div class="m"><b style="color:var(--text)">'+esc(c.user)+'</b><span>'+ago(c.at)+'</span><a href="'+esc(c.url)+'" target="_blank" rel="noopener">열기</a></div><div style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(c.body)+'</div></div>').join(""):'<div class="kbd">댓글 없음</div>';
async function openIssue(n){inf.sel=n;const x=I.find(i=>i.number===n);history.replaceState(null,"","#issue-"+n);if(x&&x.unseen){x.unseen=false;api("issues/"+n+"/seen",{method:"POST"}).then(async()=>{S=await api("summary");pills()})}drawIssues(true);$("#det").classList.add("on");
try{const c=await api("issues/"+n+"/comments");if(x)x.recent=c;if(inf.sel===n&&$("#cm"))$("#cm").innerHTML=comments(c)}catch(e){$("#cm")&&($("#cm").innerHTML='<div class="kbd">댓글을 불러오지 못했어요: '+esc(e.message)+'</div>')}}
function drawIssues(keepScroll){const sc=$(".listcol .items")?.scrollTop;$("#main").innerHTML=issuesView();if(keepScroll&&sc)$(".listcol .items").scrollTop=sc;
$("#iq").oninput=(e)=>{inf.q=e.target.value;const p=e.target.selectionStart;drawIssues();const i=$("#iq");i.focus();i.setSelectionRange(p,p)};
$("#ist").onclick=(e)=>{const v=e.target.closest("button")?.dataset.v;if(v){inf.st=v;drawIssues()}};$("#ikind").onclick=(e)=>{const v=e.target.closest("button")?.dataset.v;if(v){inf.kind=v;drawIssues()}};
$("#sync").onclick=async(e)=>{e.target.disabled=true;e.target.textContent="읽는 중…";try{await api("sync",{method:"POST"});I=await api("issues");S=await api("summary");pills();toast("동기화했어요")}catch(err){toast(err.message)}drawIssues()};
$("#seenall")&&($("#seenall").onclick=async()=>{await api("issues/seen-all",{method:"POST"});I=await api("issues");S=await api("summary");pills();drawIssues()});
$$("[data-i]").forEach(el=>el.onclick=()=>openIssue(+el.dataset.i));const d=$("#det");if(inf.sel)d.classList.add("on");$("#dback")&&($("#dback").onclick=()=>{d.classList.remove("on");inf.sel=null;drawIssues()})}

/* ── 공통 ── */
async function render(){const m=$("#main");
if(tab==="overview"){m.innerHTML=overview();$("#addf").onclick=(e)=>{const v=e.target.closest("button")?.dataset.v;if(v){addFilter=v;localStorage.setItem("hub.addf",v);render()}};
$$("[data-go-r]").forEach(b=>b.onclick=()=>{setTab("reports");openReport(+b.dataset.goR)});$$("[data-go-i]").forEach(b=>b.onclick=()=>{setTab("issues");openIssue(+b.dataset.goI)});
$("#dedupe").onclick=async()=>{const r=await api("dedupe",{method:"POST"});S=await api("summary");render();toast(r.merged?"겹친 사용자 "+r.merged+"명을 합쳤어요":"겹친 사용자가 없어요")}}
if(tab==="reports")drawReports(true);if(tab==="issues")drawIssues(true)}
async function loadAll(){[S,R,I]=await Promise.all([api("summary"),api("reports"),api("issues")]);$("#repo").textContent=S.repo;pills()}
async function devices(){const l=await api("sessions");$("#mdin").innerHTML='<div class="glass card"><h2>로그인한 기기</h2><p class="desc">한 번 들어간 기기는 400일 동안 다시 묻지 않아요(쓸 때마다 늘어나요). 모르는 기기가 있으면 내보내세요.</p>'+l.map(d=>'<div class="it" style="cursor:default"><div class="main"><div class="t" style="font-weight:500">'+esc(d.ua||"알 수 없는 기기")+'</div><div class="m"><span>처음 '+ago(d.at)+'</span><span>마지막 '+ago(d.last)+'</span>'+(d.me?'<span class="chip latest">지금 이 기기</span>':'')+'</div></div>'+(d.me?'':'<button class="btn danger" data-k="'+d.id+'">내보내기</button>')+'</div>').join("")+'<div class="acts"><span class="sp"></span><button class="btn" id="mclose">닫기</button></div></div>';$("#modal").classList.add("on");
$("#mclose").onclick=()=>$("#modal").classList.remove("on");$$("#mdin [data-k]").forEach(b=>b.onclick=async()=>{await api("sessions/"+b.dataset.k,{method:"DELETE"});devices()})}
$("#modal").onclick=(e)=>{if(e.target.id==="modal")$("#modal").classList.remove("on")};
$("#devbtn").onclick=devices;
document.querySelector("nav").onclick=(e)=>{const b=e.target.closest("button");if(b)setTab(b.dataset.tab)};
document.addEventListener("keydown",(e)=>{if(/INPUT|TEXTAREA/.test(document.activeElement?.tagName))return;if(e.key==="Escape"){$("#modal").classList.remove("on");$("#det")?.classList.remove("on");return}
const k=e.key.toLowerCase();if(tab==="reports"){const l=rFiltered();const i=l.findIndex(r=>r.no===rf.sel);if(k==="j"||e.key==="ArrowDown"){const n=l[Math.min(l.length-1,i+1)];if(n){e.preventDefault();openReport(n.no)}}if(k==="k"||e.key==="ArrowUp"){const n=l[Math.max(0,i-1)];if(n){e.preventDefault();openReport(n.no)}}
const st=Object.keys(ST)[+e.key-1];const r=R.find(x=>x.no===rf.sel);if(st&&r)setStatus(r,st)}
if(tab==="issues"){const l=iFiltered();const i=l.findIndex(x=>x.number===inf.sel);if(k==="j"||e.key==="ArrowDown"){const n=l[Math.min(l.length-1,i+1)];if(n){e.preventDefault();openIssue(n.number)}}if(k==="k"||e.key==="ArrowUp"){const n=l[Math.max(0,i-1)];if(n){e.preventDefault();openIssue(n.number)}}if(k==="o"){const x=I.find(x=>x.number===inf.sel);if(x)window.open(x.url,"_blank","noopener")}}});
(async()=>{await loadAll();const h=location.hash;if(h.startsWith("#report-")){rf.sel=+h.slice(8);tab="reports"}else if(h.startsWith("#issue-")){inf.sel=+h.slice(7);tab="issues"}setTab(tab);if(tab==="issues"&&inf.sel)openIssue(inf.sel)})();
// 실시간: 4초마다 바뀐 게 있는지만 묻고, 바뀌었으면 다시 읽어 그린다(입력 중이면 배지·목록 데이터만)
let REV=-1,busy=false;
setInterval(async()=>{if(busy||document.visibilityState!=="visible")return;busy=true;try{const {rev}=await api("rev");if(rev!==REV){const first=REV<0;REV=rev;if(first)return;await loadAll();const typing=/INPUT|TEXTAREA/.test(document.activeElement?.tagName||"");if(!typing&&!$("#modal").classList.contains("on"))await render()}}catch{}finally{busy=false}},4e3);
`;

const ADMIN_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dusk 허브</title><style>${BASE_CSS}${ADMIN_CSS}</style></head><body>
<header><div class="bar glass"><span class="logo">Dusk 허브</span><span class="kbd" id="repo"></span>
<nav><button data-tab="overview">개요</button><button data-tab="reports">버그 신고<span id="rp" class="pill" hidden></span></button><button data-tab="issues">GitHub 이슈<span id="ip" class="pill" hidden></span></button></nav>
<span class="sp"></span><span class="live"><i></i>실시간</span><button class="btn" id="devbtn">로그인한 기기</button><form method="post" action="/logout" style="margin:0"><button class="btn">나가기</button></form></div></header>
<main id="main"><div class="empty" style="padding-top:120px">불러오는 중…</div></main>
<div class="modal" id="modal"><div class="in" id="mdin"></div></div><div class="toast" id="toast"></div>
<script>${ADMIN_JS}</script></body></html>`;

// ── 시작 ─────────────────────────────────────────────────
if (require.main === module) {
  const cfg = loadConfig();
  if (process.argv.includes("--set-password")) {
    const rl = require("node:readline").createInterface({ input: process.stdin, output: process.stdout });
    rl.question("새 비밀번호 (8자 이상): ", (pw) => {
      rl.close();
      if (String(pw).length < 8) { console.error("[hub] 8자 이상으로 정해 주세요."); process.exit(1); }
      const st = createStore(cfg.dataDir);
      st.data.auth = { pw: hashPassword(pw), at: Date.now() }; st.data.sessions = {};
      st.touch("auth"); st.touch("sessions"); st.flush();
      console.log("[hub] 비밀번호를 정했어요. 로그인해 있던 기기는 모두 나가졌어요. 서버를 다시 켜 주세요 (pm2 restart dusk-hub).");
      process.exit(0);
    });
    return;
  }
  if (!cfg.adminToken || cfg.adminToken.length < 16) { console.error("[hub] ADMIN_TOKEN을 16자 이상으로 정해 주세요 (환경 변수 또는 hub.config.json)."); process.exit(1); }
  if (process.argv.includes("--check")) { console.log("[hub] 설정 확인", { ...cfg, adminToken: "***", githubToken: cfg.githubToken ? "***" : "", webhookSecret: cfg.webhookSecret ? "***" : "", discordWebhook: cfg.discordWebhook ? "***" : "" }); process.exit(0); }
  const hub = createHub(cfg);
  const server = http.createServer((req, res) => { hub.handle(req, res); });
  server.listen(cfg.port, cfg.host, () => console.log(`[hub] v${VERSION} http://${cfg.host}:${cfg.port} · 저장 ${cfg.dataDir} · 저장소 ${cfg.repo}`));
  const poll = () => hub.syncIssues().then((n) => n && console.log(`[hub] 이슈 동기화 ${n}건`)).catch((e) => console.error("[hub] 이슈 동기화 실패", e.message));
  setTimeout(poll, 3e3);
  const cat = () => hub.loadCatalog().catch(() => {});
  cat(); setInterval(cat, 3600e3).unref();
  if (cfg.pollMinutes > 0) setInterval(poll, cfg.pollMinutes * 60e3).unref();
  const stop = () => { try { hub.store.flush(); } catch (e) { console.error(e); } process.exit(0); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
}
module.exports = { createHub, loadConfig, VERSION };
