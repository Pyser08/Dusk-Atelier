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

  function notify(text) {
    if (!cfg.discordWebhook) return;
    fetch(cfg.discordWebhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text.slice(0, 1900) }) }).catch((e) => console.error("[hub] 디스코드 알림 실패", e.message));
  }

  // 통계 -------------------------------------------------
  function onPing(b) {
    const id = str(b.id, 64);
    if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return { error: "bad id" };
    const now = Date.now();
    const cur = D.installs[id] ?? { first: now };
    Object.assign(cur, { last: now, v: str(b.v, 30), risu: str(b.risu, 30), mobile: !!b.mobile, host: str(b.host, 20), addons: cleanAddons(b.addons) });
    D.installs[id] = cur; store.touch("installs");
    const d = today(now);
    const day = (D.daily[d] ??= []);
    if (!day.includes(id)) { day.push(id); store.touch("daily"); }
    const keep = Object.keys(D.daily).sort().slice(0, -90);
    for (const k of keep) delete D.daily[k];
    return { ok: true };
  }
  function summary() {
    const now = Date.now(), ins = Object.values(D.installs);
    const act = (days) => ins.filter((i) => now - i.last < days * 864e5);
    const a7 = act(7), a30 = act(30);
    const count = (list, f) => { const m = {}; for (const i of list) for (const k of [].concat(f(i))) if (k) m[k] = (m[k] ?? 0) + 1; return Object.entries(m).sort((x, y) => y[1] - x[1]); };
    const series = [];
    for (let i = 29; i >= 0; i--) { const d = today(now - i * 864e5); series.push([d, (D.daily[d] ?? []).length]); }
    const newIssues = Object.values(D.issues).filter((x) => x.state === "open" && isUnseen(x)).length;
    return {
      total: ins.length, d1: act(1).length, d7: a7.length, d30: a30.length,
      mobile7: a7.filter((i) => i.mobile).length,
      versions: count(a7, (i) => i.v).slice(0, 15),
      addons: count(a7, (i) => i.addons.filter((a) => a.on).map((a) => a.id)),
      addonVersions: count(a7, (i) => i.addons.map((a) => `${a.id}@${a.v}`)).slice(0, 60),
      series,
      reports: { open: D.reports.filter((r) => r.status !== "done" && r.status !== "dup").length, new: D.reports.filter((r) => r.status === "new").length, total: D.reports.length },
      issues: { open: Object.values(D.issues).filter((x) => x.state === "open" && !x.pr).length, unseen: newIssues, syncedAt: D.meta.issuesSyncedAt },
      repo: cfg.repo, version: VERSION
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
        if (m === "POST" && rest[0] === "sync") return json(res, 200, { got: await syncIssues() });
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
  return { handle, store, syncIssues, onPing, onReport, onGithubHook, summary };
}

// ── 화면 ─────────────────────────────────────────────────
const BASE_CSS = `
:root{--bg:#f6f5f2;--panel:#fff;--line:#e5e2dc;--text:#1d1b18;--mute:#77716a;--accent:#8a5cf6;--accent-soft:#efe9ff;--ok:#1f9d6b;--warn:#c77d0a;--err:#d0444b;--chip:#f0eeea}
@media (prefers-color-scheme:dark){:root{--bg:#141317;--panel:#1c1b21;--line:#2c2a33;--text:#ecebf0;--mute:#9a96a6;--accent:#a98bff;--accent-soft:#2a2340;--ok:#3cc28e;--warn:#e3a43a;--err:#f06a70;--chip:#26242d}}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Pretendard","Apple SD Gothic Neo","Noto Sans KR",sans-serif}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
button,input,select,textarea{font:inherit;color:inherit}
.btn{border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:6px 12px;cursor:pointer}.btn:hover{border-color:var(--accent)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
input,select,textarea{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:7px 10px}
`;
const LOGIN_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dusk 허브</title><style>${BASE_CSS}
.box{max-width:340px;margin:18vh auto 0;padding:28px 24px;background:var(--panel);border:1px solid var(--line);border-radius:14px;display:flex;flex-direction:column;gap:12px}
h1{font-size:18px;margin:0}p{margin:0;color:var(--mute);font-size:13px}.bad{color:var(--err)}</style></head><body>
<form class="box" method="post" action="/login"><h1>Dusk 허브</h1><p>비밀번호를 넣어 주세요. 이 기기는 다음부터 묻지 않아요.</p>
<input type="password" name="token" autocomplete="current-password" autofocus required>
<script>if(location.search.includes("bad"))document.write('<p class="bad">비밀번호가 맞지 않아요.</p>')</script>
<button class="btn primary" type="submit">들어가기</button></form></body></html>`;

const ADMIN_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dusk 허브</title><style>${BASE_CSS}
header{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.bar{max-width:1180px;margin:0 auto;padding:10px 16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.logo{font-weight:700;letter-spacing:-.01em}.logo small{color:var(--mute);font-weight:400;margin-left:6px}
nav{display:flex;gap:4px;flex:1}@media(max-width:560px){nav{order:3;flex-basis:100%;overflow-x:auto}.logo{flex:1}}nav button{white-space:nowrap;border:0;background:none;padding:7px 12px;border-radius:8px;cursor:pointer;color:var(--mute)}
nav button.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
.pill{display:inline-block;min-width:18px;padding:0 6px;border-radius:9px;background:var(--err);color:#fff;font-size:11px;line-height:18px;text-align:center;margin-left:4px}
main{max-width:1180px;margin:0 auto;padding:18px 16px 60px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;min-width:0}
.stat .k{color:var(--mute);font-size:12.5px}.stat .v{font-size:28px;font-weight:700;letter-spacing:-.02em;margin-top:2px}.stat .s{color:var(--mute);font-size:12px}
h2{font-size:15px;margin:22px 0 10px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:760px){.two{grid-template-columns:1fr}}
.rowbar{display:grid;grid-template-columns:minmax(90px,38%) 1fr 44px;gap:8px;align-items:center;padding:4px 0;font-size:13px}
.rowbar .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rowbar .b{height:8px;border-radius:4px;background:var(--chip);overflow:hidden}.rowbar .b i{display:block;height:100%;background:var(--accent);border-radius:4px}.rowbar .c{text-align:right;color:var(--mute);font-variant-numeric:tabular-nums}
.chart{display:flex;align-items:flex-end;gap:3px;height:120px;padding-top:6px}.chart div{flex:1;background:var(--accent);opacity:.85;border-radius:3px 3px 0 0;min-height:2px;position:relative}.chart div:hover{opacity:1}
.chart div:hover::after{content:attr(data-t);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);font-size:11px;padding:2px 6px;border-radius:5px;white-space:nowrap;margin-bottom:4px}
.axis{display:flex;justify-content:space-between;color:var(--mute);font-size:11px;margin-top:4px}
.tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.tools .grow{flex:1;min-width:160px}
.list{display:flex;flex-direction:column;gap:8px}
.item{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 16px;cursor:pointer;display:flex;gap:12px;align-items:flex-start;min-width:0}
.item:hover{border-color:var(--accent)}.item.unseen{border-left:3px solid var(--accent)}
.item .main{flex:1;min-width:0}.item .t{font-weight:600;overflow-wrap:anywhere}.item .m{color:var(--mute);font-size:12.5px;margin-top:3px;display:flex;gap:8px;flex-wrap:wrap}
.item .no{color:var(--mute);font-variant-numeric:tabular-nums;min-width:44px}
.tag{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11.5px;background:var(--chip);color:var(--mute)}
.tag.new{background:var(--err);color:#fff}.tag.seen{background:var(--accent-soft);color:var(--accent)}.tag.doing{background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--warn)}.tag.done{background:color-mix(in srgb,var(--ok) 18%,transparent);color:var(--ok)}
.tag.open{background:color-mix(in srgb,var(--ok) 18%,transparent);color:var(--ok)}.tag.closed{background:var(--chip);color:var(--mute)}.tag.act{background:var(--accent);color:#fff}
.drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;z-index:20}.drawer.on{display:block}
.drawer .in{position:absolute;right:0;top:0;bottom:0;width:min(720px,100%);background:var(--bg);border-left:1px solid var(--line);overflow:auto;padding:18px 20px 40px}
.drawer h3{margin:0 0 4px;font-size:17px;overflow-wrap:anywhere}
pre{white-space:pre-wrap;word-break:break-word;background:var(--chip);padding:10px 12px;border-radius:8px;font-size:12px;margin:6px 0;max-height:360px;overflow:auto}
.sec{margin-top:16px}.sec>b{display:block;font-size:12.5px;color:var(--mute);margin-bottom:6px;font-weight:600}
.kv{display:grid;grid-template-columns:110px 1fr;gap:4px 10px;font-size:13px}.kv span:nth-child(odd){color:var(--mute)}
.seg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--line);border-radius:8px;overflow:hidden}.seg button{white-space:nowrap;border:0;background:var(--panel);padding:6px 12px;cursor:pointer;color:var(--mute)}.seg button.on{background:var(--accent);color:#fff}
.empty{color:var(--mute);text-align:center;padding:40px 0}
.log{border-left:3px solid var(--line);padding-left:10px;margin:6px 0}.log.error,.log.uncaught,.log.rejection{border-color:var(--err)}.log.warn{border-color:var(--warn)}
.comment{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:6px 0}.comment .m{color:var(--mute);font-size:12px;margin-bottom:4px}
.mute{color:var(--mute)}
</style></head><body>
<header><div class="bar"><span class="logo">Dusk 허브<small id="repo"></small></span>
<nav><button data-tab="overview" class="on">개요</button><button data-tab="reports">버그 신고<span id="rp" class="pill" hidden></span></button><button data-tab="issues">GitHub 이슈<span id="ip" class="pill" hidden></span></button></nav>
<button class="btn" id="devbtn">로그인한 기기</button><form method="post" action="/logout"><button class="btn">나가기</button></form></div></header>
<main id="main"></main>
<div class="drawer" id="drawer"><div class="in" id="din"></div></div>
<script>
const $=(s,r=document)=>r.querySelector(s);
const esc=(s)=>String(s??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const api=async(p,o={})=>{const r=await fetch("/api/admin/"+p,{...o,headers:{"Content-Type":"application/json","X-Hub":"1",...(o.headers||{})}});if(r.status===401){location.reload();throw new Error("login")}const j=await r.json();if(!r.ok)throw new Error(j.error||r.status);return j};
const ago=(t)=>{if(!t)return"-";const s=(Date.now()-new Date(t).getTime())/1e3;if(s<60)return"방금";if(s<3600)return Math.floor(s/60)+"분 전";if(s<86400)return Math.floor(s/3600)+"시간 전";if(s<86400*30)return Math.floor(s/86400)+"일 전";return new Date(t).toLocaleDateString("ko-KR")};
const ST={new:"새 신고",seen:"확인함",doing:"고치는 중",done:"해결",dup:"중복·무시"};
let tab="overview",S=null,R=[],I=[],rf={q:"",st:"open"},inf={q:"",st:"open",kind:"issue"};
function pills(){const a=S?.reports?.new||0,b=S?.issues?.unseen||0;$("#rp").hidden=!a;$("#rp").textContent=a;$("#ip").hidden=!b;$("#ip").textContent=b;document.title=(a+b?"("+(a+b)+") ":"")+"Dusk 허브"}
async function load(){S=await api("summary");$("#repo").textContent=S.repo;pills();render()}
function bars(list,max){const top=Math.max(1,...list.map(x=>x[1]));return list.slice(0,max).map(([n,c])=>'<div class="rowbar"><span class="n" title="'+esc(n)+'">'+esc(n)+'</span><span class="b"><i style="width:'+(c/top*100)+'%"></i></span><span class="c">'+c+'</span></div>').join("")||'<div class="mute">아직 없음</div>'}
function overview(){const s=S;const top=Math.max(1,...s.series.map(x=>x[1]));
return '<div class="grid">'+
[["오늘 켠 사람",s.d1,"최근 24시간"],["주간 사용자",s.d7,"7일 안에 켬"],["월간 사용자",s.d30,"30일 안에 켬"],["모든 설치",s.total,"한 번이라도 켬"],["새 버그 신고",s.reports.new,"처리 안 됨 "+s.reports.open+"건"],["열린 이슈",s.issues.open,"새 활동 "+s.issues.unseen+"건"]].map(([k,v,t])=>'<div class="card stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="s">'+t+'</div></div>').join("")+'</div>'+
'<h2>최근 30일 일일 사용자</h2><div class="card"><div class="chart">'+s.series.map(([d,c])=>'<div style="height:'+(c/top*100)+'%" data-t="'+d.slice(5)+' · '+c+'명"></div>').join("")+'</div><div class="axis"><span>'+s.series[0][0].slice(5)+'</span><span>오늘</span></div></div>'+
'<div class="two"><div><h2>애드온별 사용자 <span class="mute" style="font-weight:400;font-size:12px">(주간 사용자 중 켜 둔 사람)</span></h2><div class="card">'+bars(s.addons,30)+'</div></div>'+
'<div><h2>본체 버전 <span class="mute" style="font-weight:400;font-size:12px">(주간)</span></h2><div class="card">'+bars(s.versions,15)+'</div><h2>환경</h2><div class="card">'+bars([["모바일",s.mobile7],["PC",s.d7-s.mobile7]],2)+'</div></div></div>'+
'<h2>애드온 버전 분포</h2><div class="card">'+bars(s.addonVersions,60)+'</div>'+
'<p class="mute" style="font-size:12px;margin-top:16px">이슈 마지막 동기화: '+ago(s.issues.syncedAt)+' · 허브 v'+s.version+'</p>'}
function reportsView(){const q=rf.q.toLowerCase();const list=R.filter(r=>(rf.st==="all"||(rf.st==="open"?!["done","dup"].includes(r.status):r.status===rf.st))&&(!q||(r.text+" "+r.contact+" "+r.v+" "+r.logs.map(l=>l.text).join(" ")).toLowerCase().includes(q)));
return '<div class="tools"><input class="grow" id="rq" placeholder="내용·오류·버전으로 찾기" value="'+esc(rf.q)+'"><span class="seg" id="rst">'+[["open","처리 전"],["new","새 신고"],["doing","고치는 중"],["done","해결"],["all","전체"]].map(([k,l])=>'<button data-v="'+k+'" class="'+(rf.st===k?"on":"")+'">'+l+'</button>').join("")+'</span></div>'+
'<div class="list">'+(list.map(r=>{const e=r.logs.find(l=>l.kind!=="warn"&&l.kind!=="log")||r.logs[0];return '<div class="item'+(r.status==="new"?" unseen":"")+'" data-r="'+r.no+'"><span class="no">#'+r.no+'</span><div class="main"><div class="t">'+esc(r.text.split("\\n")[0].slice(0,140))+'</div><div class="m"><span class="tag '+r.status+'">'+ST[r.status]+'</span><span>v'+esc(r.v)+'</span>'+(r.env.mobile?'<span>모바일</span>':'')+'<span>애드온 '+r.addons.length+'개</span>'+(e?'<span style="color:var(--err)">'+esc(e.text.split("\\n")[0].slice(0,90))+'</span>':'')+'<span>'+ago(r.at)+'</span></div></div></div>'}).join("")||'<div class="empty">신고가 없어요</div>')+'</div>'}
function issuesView(){const q=inf.q.toLowerCase();const list=I.filter(x=>(inf.kind==="all"||(inf.kind==="pr"?x.pr:!x.pr))&&(inf.st==="all"||(inf.st==="unseen"?x.unseen&&x.state==="open":x.state===inf.st))&&(!q||(x.title+" "+x.body+" "+x.user+" "+x.labels.join(" ")).toLowerCase().includes(q)));
return '<div class="tools"><input class="grow" id="iq" placeholder="제목·내용·작성자·라벨로 찾기" value="'+esc(inf.q)+'"><span class="seg" id="ist">'+[["unseen","새 활동"],["open","열림"],["closed","닫힘"],["all","전체"]].map(([k,l])=>'<button data-v="'+k+'" class="'+(inf.st===k?"on":"")+'">'+l+'</button>').join("")+'</span><span class="seg" id="ikind">'+[["issue","이슈"],["pr","PR"],["all","둘 다"]].map(([k,l])=>'<button data-v="'+k+'" class="'+(inf.kind===k?"on":"")+'">'+l+'</button>').join("")+'</span><button class="btn" id="sync">지금 동기화</button><button class="btn" id="seenall">모두 읽음</button></div>'+
'<div class="list">'+(list.map(x=>'<div class="item'+(x.unseen&&x.state==="open"?" unseen":"")+'" data-i="'+x.number+'"><span class="no">#'+x.number+'</span><div class="main"><div class="t">'+esc(x.title)+'</div><div class="m"><span class="tag '+x.state+'">'+(x.state==="open"?"열림":"닫힘")+'</span>'+(x.unseen&&x.state==="open"?'<span class="tag act">새 활동</span>':'')+(x.pr?'<span class="tag">PR</span>':'')+x.labels.map(l=>'<span class="tag">'+esc(l)+'</span>').join("")+'<span>'+esc(x.user)+'</span><span>댓글 '+x.comments+'</span><span>'+ago(x.updatedAt)+'</span></div></div></div>').join("")||'<div class="empty">'+(I.length?"조건에 맞는 이슈가 없어요":"아직 불러온 이슈가 없어요. ‘지금 동기화’를 눌러 보세요")+'</div>')+'</div>'}
async function render(){const m=$("#main");document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
if(tab==="overview")m.innerHTML=overview();
if(tab==="reports"){R=await api("reports");m.innerHTML=reportsView();bindR()}
if(tab==="issues"){I=await api("issues");m.innerHTML=issuesView();bindI()}}
function bindR(){const m=$("#main");$("#rq").oninput=(e)=>{rf.q=e.target.value;const p=e.target.selectionStart;m.innerHTML=reportsView();bindR();const i=$("#rq");i.focus();i.setSelectionRange(p,p)};$("#rst").onclick=(e)=>{if(e.target.dataset.v){rf.st=e.target.dataset.v;m.innerHTML=reportsView();bindR()}};m.querySelectorAll("[data-r]").forEach(el=>el.onclick=()=>openReport(+el.dataset.r))}
function bindI(){const m=$("#main");$("#iq").oninput=(e)=>{inf.q=e.target.value;const p=e.target.selectionStart;m.innerHTML=issuesView();bindI();const i=$("#iq");i.focus();i.setSelectionRange(p,p)};
$("#ist").onclick=(e)=>{if(e.target.dataset.v){inf.st=e.target.dataset.v;m.innerHTML=issuesView();bindI()}};$("#ikind").onclick=(e)=>{if(e.target.dataset.v){inf.kind=e.target.dataset.v;m.innerHTML=issuesView();bindI()}};
$("#sync").onclick=async(e)=>{e.target.disabled=true;e.target.textContent="동기화 중…";try{await api("sync",{method:"POST"});await load()}catch(err){alert(err.message)}};
$("#seenall").onclick=async()=>{await api("issues/seen-all",{method:"POST"});await load()};m.querySelectorAll("[data-i]").forEach(el=>el.onclick=()=>openIssue(+el.dataset.i))}
function drawer(html){$("#din").innerHTML=html;$("#drawer").classList.add("on")}
$("#drawer").onclick=(e)=>{if(e.target.id==="drawer"){$("#drawer").classList.remove("on");history.replaceState(null,"",location.pathname);load()}};
document.addEventListener("keydown",(e)=>{if(e.key==="Escape"&&$("#drawer").classList.contains("on")){$("#drawer").classList.remove("on");history.replaceState(null,"",location.pathname);load()}});
async function openReport(no){if(!R.length)R=await api("reports");const r=R.find(x=>x.no===no);if(!r)return;history.replaceState(null,"","#report-"+no);
if(r.status==="new"){r.status="seen";api("reports/"+no,{method:"PATCH",body:JSON.stringify({status:"seen"})})}
drawer('<div class="mute" style="font-size:12px">버그 신고 #'+r.no+' · '+new Date(r.at).toLocaleString("ko-KR")+'</div><h3>'+esc(r.text.split("\\n")[0].slice(0,160))+'</h3>'+
'<div class="sec"><span class="seg" id="rs">'+Object.entries(ST).map(([k,l])=>'<button data-v="'+k+'" class="'+(r.status===k?"on":"")+'">'+l+'</button>').join("")+'</span></div>'+
'<div class="sec"><b>내용</b><pre>'+esc(r.text)+'</pre></div>'+
'<div class="sec"><b>정보</b><div class="kv"><span>본체</span><span>v'+esc(r.v)+'</span><span>RisuAI</span><span>'+esc(r.risu||"-")+'</span><span>연락처</span><span>'+esc(r.contact||"-")+'</span><span>환경</span><span>'+esc([r.env.mobile?"모바일":"PC",r.env.host,r.env.screen,r.env.lang].filter(Boolean).join(" · "))+'</span><span>브라우저</span><span style="font-size:12px">'+esc(r.env.ua||"-")+'</span><span>설치 ID</span><span style="font-size:12px">'+esc(r.install)+'</span></div></div>'+
'<div class="sec"><b>애드온 ('+r.addons.length+')</b><div>'+(r.addons.map(a=>'<span class="tag" style="margin:0 4px 4px 0">'+esc(a.id)+' '+esc(a.v)+(a.on?"":" (꺼짐)")+'</span>').join("")||'<span class="mute">없음</span>')+'</div></div>'+
'<div class="sec"><b>최근 오류 기록 ('+r.logs.length+')</b>'+(r.logs.slice().reverse().map(l=>'<div class="log '+esc(l.kind)+'"><div class="mute" style="font-size:11.5px">'+esc(l.kind)+' · '+(l.t?new Date(l.t).toLocaleTimeString("ko-KR"):"")+(l.n?" · "+l.n+"번 반복":"")+'</div><pre>'+esc(l.text)+'</pre></div>').join("")||'<div class="mute">없음</div>')+'</div>'+
'<div class="sec"><b>메모</b><textarea id="memo" rows="4" style="width:100%">'+esc(r.memo)+'</textarea><div style="display:flex;gap:8px;margin-top:8px;align-items:center"><button class="btn primary" id="msave">메모 저장</button><span class="mute" id="mok"></span><span style="flex:1"></span><button class="btn" id="rdel" style="color:var(--err)">신고 지우기</button></div></div>');
$("#rs").onclick=async(e)=>{const v=e.target.dataset.v;if(!v)return;await api("reports/"+no,{method:"PATCH",body:JSON.stringify({status:v})});r.status=v;$("#rs").querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.v===v))};
$("#msave").onclick=async()=>{r.memo=$("#memo").value;await api("reports/"+no,{method:"PATCH",body:JSON.stringify({memo:r.memo})});$("#mok").textContent="저장했어요"};
$("#rdel").onclick=async()=>{if(!confirm("#"+no+" 신고를 지울까요?"))return;await api("reports/"+no,{method:"DELETE"});$("#drawer").classList.remove("on");R=[];load()}}
async function openIssue(n){if(!I.length)I=await api("issues");const x=I.find(i=>i.number===n);if(!x)return;history.replaceState(null,"","#issue-"+n);api("issues/"+n+"/seen",{method:"POST"});x.unseen=false;
const body=()=>'<div class="mute" style="font-size:12px">'+(x.pr?"PR":"이슈")+' #'+x.number+' · '+esc(x.user)+' · '+new Date(x.createdAt).toLocaleString("ko-KR")+'</div><h3>'+esc(x.title)+'</h3><div style="margin:8px 0;display:flex;gap:6px;flex-wrap:wrap"><span class="tag '+x.state+'">'+(x.state==="open"?"열림":"닫힘")+'</span>'+x.labels.map(l=>'<span class="tag">'+esc(l)+'</span>').join("")+'<a class="btn" style="margin-left:auto" href="'+esc(x.url)+'" target="_blank" rel="noopener">GitHub에서 열기 ↗</a></div>'+
'<div class="sec"><b>본문</b><pre>'+esc(x.body||"(본문 없음)")+'</pre></div><div class="sec"><b>최근 댓글</b><div id="cm">'+(x.recent?.length?x.recent.map(c=>'<div class="comment"><div class="m">'+esc(c.user)+' · '+ago(c.at)+'</div><div style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(c.body)+'</div></div>').join(""):'<div class="mute">불러오는 중…</div>')+'</div></div>';
drawer(body());try{x.recent=await api("issues/"+n+"/comments");$("#cm").innerHTML=x.recent.length?x.recent.map(c=>'<div class="comment"><div class="m">'+esc(c.user)+' · '+ago(c.at)+' · <a href="'+esc(c.url)+'" target="_blank" rel="noopener">열기</a></div><div style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(c.body)+'</div></div>').join(""):'<div class="mute">댓글 없음</div>'}catch(e){$("#cm").innerHTML='<div class="mute">댓글을 불러오지 못했어요: '+esc(e.message)+'</div>'}}
async function devices(){const l=await api("sessions");drawer('<h3>로그인한 기기</h3><p class="mute" style="font-size:13px">한 번 들어간 기기는 400일 동안 다시 묻지 않아요(쓸 때마다 늘어나요). 모르는 기기가 있으면 내보내세요.</p><div class="list">'+l.map(d=>'<div class="item" style="cursor:default"><div class="main"><div class="t" style="font-weight:500;font-size:13px">'+esc(d.ua||"알 수 없는 기기")+'</div><div class="m"><span>처음 '+ago(d.at)+'</span><span>마지막 '+ago(d.last)+'</span>'+(d.me?'<span class="tag seen">지금 이 기기</span>':'')+'</div></div>'+(d.me?'':'<button class="btn" data-k="'+d.id+'">내보내기</button>')+'</div>').join("")+'</div>');$("#din").querySelectorAll("[data-k]").forEach(b=>b.onclick=async()=>{await api("sessions/"+b.dataset.k,{method:"DELETE"});devices()})}
$("#devbtn").onclick=devices;
document.querySelector("nav").onclick=(e)=>{const b=e.target.closest("button");if(b){tab=b.dataset.tab;render()}};
(async()=>{await load();const h=location.hash;if(h.startsWith("#report-")){tab="reports";await render();openReport(+h.slice(8))}else if(h.startsWith("#issue-")){tab="issues";await render();openIssue(+h.slice(7))}})();
// 실시간: 4초마다 바뀐 게 있는지만 묻고, 바뀌었으면 숫자·목록을 다시 그린다(입력 중이거나 상세 창이 열려 있으면 배지만)
let REV=-1,busy=false;
setInterval(async()=>{if(busy||document.visibilityState!=="visible")return;busy=true;try{const {rev}=await api("rev");if(rev!==REV){const first=REV<0;REV=rev;if(first)return;S=await api("summary");pills();const typing=document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName);if(!$("#drawer").classList.contains("on")&&!typing)await render();else if(tab==="reports")R=await api("reports");else if(tab==="issues")I=await api("issues")}}catch{}finally{busy=false}},4e3);
</script></body></html>`;

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
  if (cfg.pollMinutes > 0) setInterval(poll, cfg.pollMinutes * 60e3).unref();
  const stop = () => { try { hub.store.flush(); } catch (e) { console.error(e); } process.exit(0); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
}
module.exports = { createHub, loadConfig, VERSION };
