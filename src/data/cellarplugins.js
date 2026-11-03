// 플러그인 코드 수정 (1.8.3): 리스는 플러그인이 다른 플러그인을 고치지 못하게 막았다(RisuAI PR #1572).
// 그래서 서버(Dusk Cellar, plugins.cjs)가 리스 설정 파일의 그 플러그인 코드만 대신 고치고 리스가 받아들이게 한다.
// 플러그인(이 파일)은 코드를 받아 오고, 고친 코드를 보내고, 결과를 알려 주는 일만 한다.
// 지금은 RisuBard 서버만 지원한다(Cellar의 features에 "plugins"가 있을 때).
import { cellarRequest } from "./cellar.js";

export const hasPluginEdit = (st) => Boolean(st?.ok && Array.isArray(st.features) && st.features.includes("plugins"));

// Cellar의 /cellar/plugins 호출. 실패는 Error: status(HTTP), info(서버가 준 본문), network(연결 문제면 true)
export function createCellarPlugins(api, conn) {
  const post = async (body, timeout = 20000) => {
    let res;
    try { res = await cellarRequest(api, conn, "/cellar/plugins", { method: "POST", body, timeout }); } catch (e) { if (e?.json) e.info = e.json; throw e; }
    const { status, json } = res;
    if (status === 200 && json.ok) return json;
    throw Object.assign(new Error(json.error ?? `응답 ${status}`), { status, info: json });
  };
  return {
    list: () => post({ action: "list" }),
    // 코드 읽기 → { script, sha256, index }. 이름이 겹치면 index(목록 순서)로 고른다
    get: (name, index) => post({ action: "get", name, ...(index === undefined ? {} : { index }) }),
    // edits: [{ name, index?, expectSha(지금 코드의 sha256), script }] — 해시가 다르면(그새 바뀜) 서버가 거절한다
    apply: (edits) => post({ action: "apply", edits }, 180000),
  };
}

// 머리말 //@name 이 플러그인 이름과 같은지(서버와 같은 규칙). 다르면 안내 문구, 같으면 "".
export function headerProblem(script, name) {
  const got = /^[ \t]*\/\/@name[ \t]+(.+?)[ \t]*\r?$/m.exec(String(script))?.[1];
  if (got === name) return "";
  return got ? `머리말 //@name이 '${got}'(으)로 바뀌었어요. 이름을 바꾸면 플러그인 저장소·업데이트가 끊겨서 고칠 수 없어요.` : "머리말 //@name 줄이 없어요. 플러그인 코드 맨 위의 머리말은 그대로 두어야 해요.";
}

// 실패를 화면 문구로. kind: conflict(그새 바뀜) · pending(리스에 검토 대기) · written(파일은 고쳐짐) · unsupported · net · fail
export function describeEditError(err) {
  const i = err?.info ?? {};
  const msg = String(err?.message ?? err);
  const base = { written: Boolean(i.written), snapshot: i.snapshot ?? "", file: i.file ?? "" };
  if (i.conflict) return { ...base, kind: "conflict", text: "그새 이 플러그인의 코드가 바뀌었어요. 코드를 다시 불러와서 고쳐 주세요." };
  if (i.written) return { ...base, kind: "written", text: msg };
  if (i.pending) return { ...base, kind: "pending", text: msg };
  if (err?.status === 501) return { ...base, kind: "unsupported", text: msg };
  if (err?.network && !err?.status) return { ...base, kind: "net", text: `서버에 연결하지 못했어요 · ${msg}` };
  return { ...base, kind: "fail", text: msg };
}

// ── 줄 단위 차이(미리 보기용) ──
// 앞뒤 같은 줄을 먼저 떼어 내고, 가운데가 작으면 LCS로 정확히, 크면 '통째로 바뀜'으로 처리한다(큰 코드에서도 멈추지 않게).
// 반환 rows: { t: "+"|"-"|" "|"…", s: 줄 내용(…이면 건너뛴 줄 수), n: 줄 번호(+·공백은 새 코드, -는 옛 코드) }
export function lineDiff(a, b, { context = 3, maxRows = 400, dpLimit = 1500 } = {}) {
  const A = String(a).split("\n"), B = String(b).split("\n");
  let s = 0;
  while (s < A.length && s < B.length && A[s] === B[s]) s++;
  let ea = A.length, eb = B.length;
  while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) { ea--; eb--; }
  const same = s === A.length && A.length === B.length;
  const midA = A.slice(s, ea), midB = B.slice(s, eb);
  const ops = [];   // [t, 줄]
  if (midA.length <= dpLimit && midB.length <= dpLimit) {
    const n = midA.length, m = midB.length, w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i * w + j] = midA[i] === midB[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) { ops.push([" ", midA[i]]); i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) ops.push(["-", midA[i++]]);
      else ops.push(["+", midB[j++]]);
    }
    while (i < n) ops.push(["-", midA[i++]]);
    while (j < m) ops.push(["+", midB[j++]]);
  } else {
    for (const x of midA) ops.push(["-", x]);
    for (const x of midB) ops.push(["+", x]);
  }
  const added = ops.filter((o) => o[0] === "+").length, removed = ops.filter((o) => o[0] === "-").length;
  // 줄 번호를 붙이고, 바뀐 곳 둘레 context줄만 남긴다
  const seq = [];
  let oldN = s, newN = s;
  for (let k = Math.max(0, s - context); k < s; k++) seq.push({ t: " ", s: A[k], n: k + 1 });
  for (const [t, line] of ops) {
    if (t === " ") { oldN++; newN++; seq.push({ t, s: line, n: newN }); }
    else if (t === "-") { oldN++; seq.push({ t, s: line, n: oldN }); }
    else { newN++; seq.push({ t, s: line, n: newN }); }
  }
  for (let k = ea; k < Math.min(A.length, ea + context); k++) seq.push({ t: " ", s: A[k], n: newN + (k - ea) + 1 });
  const keep = new Array(seq.length).fill(false);
  seq.forEach((r, k) => { if (r.t !== " ") for (let d = -context; d <= context; d++) if (seq[k + d]) keep[k + d] = true; });
  const rows = [];
  let skipped = 0;
  seq.forEach((r, k) => {
    if (keep[k]) { if (skipped) { rows.push({ t: "…", s: String(skipped), n: 0 }); skipped = 0; } rows.push(r); } else skipped++;
  });
  const truncated = rows.length > maxRows;
  return { same, added, removed, rows: truncated ? rows.slice(0, maxRows) : rows, truncated, total: rows.length };
}
