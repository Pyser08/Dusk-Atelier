// 초기 변수(defaultVariables) 보기·고치기 (v1.6.7 7단계): 한 줄에 key=value. 등호가 없는 줄은 그대로 보존한다. 순수 로직.

export function parseVars(text) {
  const rows = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.indexOf('=');
    rows.push(i < 0 ? { k: line, v: null } : { k: line.slice(0, i), v: line.slice(i + 1) });
  }
  return rows;
}

export function serializeVars(rows) {
  return rows.filter((r) => String(r.k ?? '').trim() || String(r.v ?? '').trim()).map((r) => r.v === null ? r.k : `${r.k}=${r.v ?? ''}`).join('\n');
}

// 같은 이름이 두 번 이상 있는 변수 이름들
export function duplicateKeys(rows) {
  const seen = new Set(), dup = new Set();
  for (const r of rows) {
    const k = String(r.k ?? '').trim();
    if (!k || r.v === null) continue;
    if (seen.has(k)) dup.add(k); else seen.add(k);
  }
  return dup;
}
