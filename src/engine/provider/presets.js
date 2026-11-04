// 빠른 설정 프리셋 (v1.9.3, 순수): 눌러서 켜고 끄면 프로필의 추가 요청 값·헤더·등급에 들어가고 빠진다.
// 각 항목: { id, label, desc, kinds[](없으면 전체), tier?, params?, headers? }
export const PRESETS = Object.freeze([
  { id: "oa-flex", label: "플렉스(싸고 느림)", desc: "응답이 늦어도 되는 대신 값이 싸요. 지원하는 모델만.", kinds: ["openai", "google", "openrouter"], tier: "flex" },
  { id: "oa-priority", label: "우선 처리", desc: "더 빠르게 처리해요. 값이 더 비싸요.", kinds: ["openai", "google"], tier: "priority" },
  { id: "or-fallback", label: "공급자 폴백 켜기", desc: "한 공급자가 막히면 같은 모델을 다른 공급자로 넘겨요.", kinds: ["openrouter"], params: { provider: { allow_fallbacks: true } } },
  { id: "or-nofallback", label: "공급자 폴백 끄기", desc: "고른 공급자만 써요.", kinds: ["openrouter"], params: { provider: { allow_fallbacks: false } } },
  { id: "or-price", label: "싼 공급자 우선", desc: "같은 모델이면 가장 싼 공급자부터 써요.", kinds: ["openrouter"], params: { provider: { sort: "price" } } },
  { id: "or-speed", label: "빠른 공급자 우선", desc: "처리량이 높은 공급자부터 써요.", kinds: ["openrouter"], params: { provider: { sort: "throughput" } } },
  { id: "or-zdr", label: "데이터 보관 안 하는 곳만", desc: "ZDR(제로 데이터 보관) 공급자만 써요.", kinds: ["openrouter"], params: { provider: { zdr: true } } },
  { id: "an-1m", label: "100만 토큰 문맥(베타)", desc: "지원하는 Claude 모델에서 긴 문맥을 열어요.", kinds: ["anthropic"], headers: { "anthropic-beta": "context-1m-2025-08-07" } },
  { id: "an-interleave", label: "생각 사이사이 도구(베타)", desc: "생각과 도구 호출을 번갈아 해요.", kinds: ["anthropic"], headers: { "anthropic-beta": "interleaved-thinking-2025-05-14" } },
  { id: "vx-flex", label: "Vertex 플렉스", desc: "Vertex 종량제 플렉스 등급(싸고 느림).", kinds: ["vertex"], headers: { "X-Vertex-AI-LLM-Shared-Request-Type": "flex" } },
  { id: "vx-priority", label: "Vertex 우선 처리", desc: "Vertex 종량제 우선 등급.", kinds: ["vertex"], headers: { "X-Vertex-AI-LLM-Request-Type": "shared", "X-Vertex-AI-LLM-Shared-Request-Type": "priority" } },
  { id: "ds-nothink", label: "생각 끄기", desc: "DeepSeek의 생각 모드를 꺼요.", kinds: ["deepseek"], params: { thinking: { type: "disabled" } } }
]);
export const presetsFor = (kind) => PRESETS.filter((p) => !p.kinds || p.kinds.includes(kind));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const LIST = new Set(["anthropic-beta"]);   // 쉼표로 여러 값을 겹쳐 쓰는 헤더
const lst = (v) => String(v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const sub = (have, want) => Object.entries(want ?? {}).every(([k, v]) => same(have?.[k], v));
const subH = (have, want) => Object.entries(want ?? {}).every(([k, v]) => (LIST.has(k) ? lst(v).every((x) => lst(have?.[k]).includes(x)) : same(have?.[k], v)));
export const isOn = (profile, p) => (!p.tier || profile.tier === p.tier) && sub(profile.params, p.params) && subH(profile.headers, p.headers);
// 같은 묶음(같은 키를 건드리는 항목)끼리는 하나만 켜지게 한다
const touches = (p) => [...(p.tier ? ["tier"] : []), ...Object.keys(p.params ?? {}).map((k) => `p:${k}`), ...Object.keys(p.headers ?? {}).filter((k) => !LIST.has(k)).map((k) => `h:${k}`)];
export function apply(profile, p, on) {
  const q = JSON.parse(JSON.stringify(profile)); q.params ??= {}; q.headers ??= {};
  if (on) {
    for (const o of PRESETS) if (o.id !== p.id && touches(o).some((t) => touches(p).includes(t)) && isOn(q, o)) apply0(q, o, false);
    apply0(q, p, true);
  } else apply0(q, p, false);
  return q;
}
function apply0(q, p, on) {
  if (p.tier) q.tier = on ? p.tier : "";
  for (const [k, v] of Object.entries(p.params ?? {})) { if (on) q.params[k] = v; else delete q.params[k]; }
  for (const [k, v] of Object.entries(p.headers ?? {})) {
    if (LIST.has(k)) { const cur = lst(q.headers[k]), next = on ? [...new Set([...cur, ...lst(v)])] : cur.filter((x) => !lst(v).includes(x)); if (next.length) q.headers[k] = next.join(","); else delete q.headers[k]; }
    else if (on) q.headers[k] = v; else delete q.headers[k];
  }
}
