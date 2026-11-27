// 로어북 글 합치기(2.2.68, 사용자 요청): 내가 고친 글(mine)은 그대로 두고, 새 버전(inc)에만 새로 생긴 부분을 제자리에 끼워 넣는다.
// 예: 배포 ABCDE → 내가 B를 Z로(AZCDE) → 새 버전 ABCDEF 이면 결과 AZCDEF.
// 처음 받은 글(기준)은 지문만 남아 있어 진짜 세 방향 비교는 못 한다. 그래서 두 글을 비교해
//  - 둘 다 같은 부분: 그대로
//  - 내 글에만 있는 부분: 남긴다(내 수정)
//  - 새 버전에만 있는 부분: 내 글의 같은 자리에 아무것도 없으면 끼워 넣고(추가), 내 글이 그 자리를 다르게 고쳐 두었으면 내 것을 남긴다(건너뜀)
// 단위는 줄. 줄이 너무 적으면(한 덩어리 글) 문장으로 나눈다.

// 단위 나누기 → { units, sep }. 줄 모드는 줄(줄바꿈 뺌)을 "\n"으로, 문장 모드는 공백까지 포함한 조각을 그대로 잇는다
export function splitUnits(text) {
  const s = String(text ?? "").replace(/\r\n/g, "\n");
  const lines = s.split("\n");
  if (lines.length >= 4) return { units: lines, sep: "\n" };
  return { units: s.match(/[^.!?。…\n]+(?:[.!?。…]+["'”’)\]]*)?\s*|\n/g) ?? [], sep: "" };
}

// 최장 공통 부분열로 a·b를 맞춘다(앞뒤 공백은 무시하고 비교) → [{t:"eq"|"a"|"b", v}]
export function diffUnits(a, b) {
  const n = a.length, m = b.length;
  if (n * m > 4e6) return null;   // 너무 큰 글은 포기(호출 쪽이 그대로 둔다)
  const ka = a.map((x) => x.trim()), kb = b.map((x) => x.trim());
  const W = m + 1, L = new Uint32Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i * W + j] = ka[i] === kb[j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (ka[i] === kb[j]) { out.push({ t: "eq", v: a[i] }); i++; j++; }
    else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) out.push({ t: "a", v: a[i++] });
    else out.push({ t: "b", v: b[j++] });
  }
  while (i < n) out.push({ t: "a", v: a[i++] });
  while (j < m) out.push({ t: "b", v: b[j++] });
  return out;
}

// 반환 { text, added, skipped, ok } — added: 새 버전에서 끼워 넣은 조각 수, skipped: 내가 고친 자리라 넣지 않은 새 버전 조각 수
export function mergeKeepMine(mine, inc) {
  const A0 = splitUnits(mine), B0 = splitUnits(inc);
  // 한쪽만 줄 모드면 둘 다 같은 방식으로
  const lineMode = A0.sep === "\n" || B0.sep === "\n";
  const a = lineMode ? String(mine ?? "").replace(/\r\n/g, "\n").split("\n") : A0.units;
  const b = lineMode ? String(inc ?? "").replace(/\r\n/g, "\n").split("\n") : B0.units;
  const ops = diffUnits(a, b);
  if (!ops) return { text: String(mine ?? ""), added: 0, skipped: 0, ok: false };
  const out = [];
  let added = 0, skipped = 0;
  for (let k = 0; k < ops.length;) {
    if (ops[k].t === "eq") { out.push(ops[k].v); k++; continue; }
    const A = [], B = [];
    while (k < ops.length && ops[k].t !== "eq") { (ops[k].t === "a" ? A : B).push(ops[k].v); k++; }
    const realB = B.filter((x) => x.trim()), realA = A.filter((x) => x.trim());
    if (!realA.length) { added += realB.length; out.push(...A, ...B); }   // 새 버전에만 있는 새 부분 → 넣기(빈 줄은 그대로)
    else { skipped += realB.length; out.push(...A); }                       // 내가 고친 자리 → 내 것
  }
  if (lineMode) return { text: out.join("\n"), added, skipped, ok: true };
  let text = "";
  for (const piece of out) { if (text && /\S$/.test(text) && /^\S/.test(piece)) text += " "; text += piece; }   // 맨 끝 문장 뒤에 붙일 때 띄어 쓴다
  return { text, added, skipped, ok: true };
}
