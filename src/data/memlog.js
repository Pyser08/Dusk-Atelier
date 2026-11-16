// 2.2.4 실패 기록: 장기 기억·위키·원문 회상·Jev·분기 이어받기 등에서 실패한 것만 모아 둔다(최근 200개, 이 기기에만 저장 — 백업·공유에 안 들어감).
// 한 항목 = 사용자용(무엇이 · 왜 · 어떻게 하면 되는지) + 제보용(오류 원문·단계·버전·환경). 키·토큰처럼 보이는 값은 가린다.
// 코어·애드온이 따로 번들돼도 같은 기록을 쓰도록 globalThis.__duskMemLog에 둔다.
const KEY = "dusk.memlog.v1", MAX = 200;
const BUS = (globalThis.__duskMemLog ??= { items: null, subs: new Set(), store: null, loading: null, last: null });

// 키·토큰·비밀번호처럼 보이는 값 가리기
export function redact(s) {
  return String(s ?? "")
    .replace(/\b(sk-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]{6,}/g, "$1••••")
    .replace(/\b(AIza[0-9A-Za-z_-]{4})[0-9A-Za-z_-]{10,}/g, "$1••••")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, "$1••••")
    .replace(/((?:api[_-]?key|key|token|secret|password|authorization)["']?\s*[:=]\s*["']?)[^\s"',}]{6,}/gi, "$1••••");
}
// 오류 원문 → 사용자용 이유·할 일(모르면 일반 문구)
export function explain(raw) {
  const m = String(raw ?? "");
  const rules = [
    [/401|403|거절|unauthori[sz]ed|forbidden|invalid.*key|키가/i, "API 키가 거절됐어요.", "모델 설정에서 키가 맞는지, 주소와 같은 서비스의 키인지 확인해 주세요."],
    [/429|rate.?limit|too many|한도|quota|insufficient/i, "모델 서비스의 요청 한도에 걸렸거나 잔액이 모자라요.", "잠시 뒤 다시 시도하거나, 제공자 계정의 잔액·한도를 확인해 주세요."],
    [/입력 예산|input budget|context.?length|maximum context|too long|토큰 한도|exceed/i, "보낼 글이 모델이나 설정의 한도를 넘었어요.", "장기 기억 → 설정의 ‘자동 기록 입력 예산’을 올리거나, 더 긴 글을 받는 모델을 써 보세요."],
    [/timeout|timed out|시간 초과|abort/i, "모델 응답이 너무 늦어서 기다리다 멈췄어요.", "잠시 뒤 다시 시도해 주세요. 계속되면 더 빠른 모델이나 제공자로 바꿔 보세요."],
    [/50[0-9]|bad gateway|overload|unavailable|서버 오류/i, "모델 서버 쪽에서 오류가 났어요.", "보통 잠깐이면 풀려요. 잠시 뒤 다시 시도해 주세요."],
    [/failed to fetch|network|네트워크|ECONN|ENOTFOUND|getaddrinfo/i, "인터넷 연결이나 주소 문제로 모델에 닿지 못했어요.", "연결 상태와 모델 주소를 확인해 주세요."],
    [/JSON|형식|parse|해석|모양이 달라/i, "모델 답의 형식이 이상해서 읽지 못했어요.", "다시 시도하면 대개 풀려요. 자주 그러면 보조 모델을 더 강한 것으로 바꿔 보세요."],
    [/empty|비어|빈 응답/i, "모델이 빈 답을 보냈어요.", "다시 시도해 주세요. 추론(생각) 모델이면 출력 토큰이 모자랐을 수 있어요."]
  ];
  for (const [re, why, todo] of rules) if (re.test(m)) return { why, todo };
  return { why: "예상하지 못한 오류가 났어요.", todo: "다시 시도해 보고, 계속되면 아래 ‘제보용’ 내용을 복사해 알려 주세요." };
}

export function createMemLog(api, { now = () => Date.now() } = {}) {
  const store = async () => BUS.store ??= (typeof api?.getLocalPluginStorage === "function" ? await api.getLocalPluginStorage() : api?.safeLocalStorage ?? null);
  const load = async () => { await (BUS.loading ??= (async () => {
    try { const s = await store(); const v = s ? await s.getItem(KEY) : null; const arr = typeof v === "string" ? JSON.parse(v) : v; BUS.items = Array.isArray(arr) ? arr.slice(-MAX) : []; }
    catch { BUS.items = []; }
  })()); return BUS.items ?? []; };   // 늘 지금 목록을 돌려준다(처음 읽은 배열이 아니라)
  const save = async () => { try { const s = await store(); if (s) await s.setItem(KEY, JSON.stringify(BUS.items ?? [])); } catch { /* 저장 못 해도 이번 세션 목록은 남는다 */ } };
  const emit = () => { for (const f of [...BUS.subs]) { try { f(BUS.items ?? []); } catch { /* 화면 쪽 오류 무시 */ } } };
  // area: 어느 기능, title: 무엇이 실패했나(사용자용), error: 오류(원문), ctx: 제보용 추가 정보(객체), fallback: 대신 어떻게 했나(사용자용)
  async function add({ area, title, error = "", ctx = {}, fallback = "", why = "", todo = "" }) {
    await load();
    const msg = redact(error?.message ?? error).slice(0, 1200), raw = error?.stack ? `${msg}\n${redact(String(error.stack).split("\n").slice(1, 5).join("\n"))}` : msg;
    const ex = explain(msg);
    const prev = (BUS.items ?? []).at(-1);   // 같은 실패가 10분 안에 되풀이되면 한 줄로 묶고 횟수만 센다
    if (prev && prev.area === String(area ?? "기타").slice(0, 40) && prev.title === String(title ?? "").slice(0, 120) && (prev.msg ?? prev.raw) === msg && now() - prev.at < 600000) {
      prev.count = (prev.count ?? 1) + 1; prev.at = now(); BUS.last = prev; await save(); emit(); return prev;
    }
    const e = { id: `f${now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: now(), area: String(area ?? "기타").slice(0, 40), title: String(title ?? "실패했어요").slice(0, 120),
      why: why || ex.why, todo: todo || ex.todo, fallback: String(fallback ?? "").slice(0, 160), msg, raw: raw.slice(0, 1500),
      ctx: JSON.parse(redact(JSON.stringify(ctx ?? {})).slice(0, 2000) || "{}"), ver: String(globalThis.__duskVersion ?? "") };
    BUS.items = [...(BUS.items ?? []), e].slice(-MAX); BUS.last = e;
    await save(); emit();
    return e;
  }
  const api_ = {
    add, load,
    list: async () => [...(await load())].reverse(),
    last: () => BUS.last,
    get: async (id) => (await load()).find((x) => x.id === id) ?? null,
    clear: async () => { BUS.items = []; BUS.last = null; await save(); emit(); },
    subscribe: (fn) => { BUS.subs.add(fn); return () => BUS.subs.delete(fn); }
  };
  BUS.instance = api_;
  return api_;
}
// 어디서나 실패 남기기(기록 저장소가 아직 없으면 조용히 넘어간다)
export const logFailure = (entry) => { try { return BUS.instance?.add(entry) ?? null; } catch { return null; } };
// 오른쪽 아래 알림의 '이유 보기' → 플러그인을 열면 이 항목을 바로 보여 준다
export const setPendingReason = (id) => { BUS.pending = id || null; };
export const takePendingReason = () => { const id = BUS.pending ?? null; BUS.pending = null; return id; };

// 글로 바꾸기: 사용자용(짧게) · 제보용(자세히, 버전·환경 포함)
const when = (t) => { try { return new Date(t).toLocaleString(); } catch { return String(t); } };
export const userText = (e) => [`[${when(e.at)}] ${e.area} · ${e.title}`, `이유: ${e.why}`, e.fallback ? `대신: ${e.fallback}` : "", `해 볼 일: ${e.todo}`].filter(Boolean).join("\n");
export function reportText(e, env = {}) {
  const lines = [`Dusk Atelier 실패 제보`, `시각: ${when(e.at)} (${new Date(e.at).toISOString?.() ?? ""})`, `기능: ${e.area}`, `무엇: ${e.title}`, `Dusk 버전: ${e.ver || env.version || "?"}`];
  for (const [k, v] of Object.entries(env)) if (k !== "version" && v != null && v !== "") lines.push(`${k}: ${v}`);
  for (const [k, v] of Object.entries(e.ctx ?? {})) lines.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  lines.push("오류 원문:", e.raw || "(없음)");
  return lines.join("\n");
}
