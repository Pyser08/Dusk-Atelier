// 기억·리수폿 프롬프트 불러오기 (순수): JSON·리스 프리셋(.risup)에서 '프롬프트 후보'를 뽑는다.
export const PROMPT_MAX = 12000;
const NAME_MAX = 60;
const isRec = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const str = (v) => (typeof v === "string" ? v : "");
const mk = (name, text, extra) => {
  const o = { name: str(name).trim().slice(0, NAME_MAX), text: str(text) };
  const st = Array.isArray(extra?.stages) ? ["router", "director", "writer"].filter((k) => extra.stages.includes(k)) : [];
  if (st.length) o.stages = st;
  if (["front", "middle", "back"].includes(extra?.position)) o.position = extra.position;
  return o;
};

// 내보내기(순수): 내 프롬프트 목록 → 다시 불러올 수 있는 JSON 글
export function toJson(list) {
  return JSON.stringify({ format: "dusk-prompts", version: 1, customPrompts: (list ?? []).map((p) => ({ name: p.name ?? "", text: p.text ?? "", stages: p.stages, position: p.position || "back" })) }, null, 2);
}

// 리스 프롬프트 프리셋: 글이 든 블록만(plain·jailbreak·cot 등). 채팅·로어북 같은 자리표시 블록은 글이 없어 빠진다.
export function fromPreset(preset) {
  const out = [];
  for (const b of Array.isArray(preset?.promptTemplate) ? preset.promptTemplate : []) {
    const text = str(b?.text);
    if (!text.trim()) continue;
    out.push(mk(b.name || b.type2 || b.type, text));
  }
  return out;
}

// JSON 모양 몇 가지: 글 한 덩어리 · 글 배열 · {name,text} · {customPrompts|prompts|items:[...]} · 프리셋({promptTemplate})
export function fromJson(v) {
  if (typeof v === "string") return v.trim() ? [mk("", v)] : [];
  if (Array.isArray(v)) return v.flatMap((x) => fromJson(x));
  if (!isRec(v)) return [];
  if (Array.isArray(v.promptTemplate)) return fromPreset(v);
  for (const k of ["customPrompts", "prompts", "items"]) if (Array.isArray(v[k])) return v[k].flatMap((x) => fromJson(x));
  const text = [v.text, v.content, v.prompt, v.value].find((x) => typeof x === "string" && x.trim());
  if (text !== void 0) return [mk(v.name ?? v.title ?? v.label ?? "", text, v)];
  return [];
}

// 한 후보가 한도를 넘으면 잘라서 쓴다(표시용 플래그 함께)
export function fit(c) {
  return c.text.length > PROMPT_MAX ? { ...c, text: c.text.slice(0, PROMPT_MAX), cut: true } : { ...c, cut: false };
}
