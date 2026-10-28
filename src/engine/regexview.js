// 정규식 '바로 시험' 결과 보기 (v1.6.7 7단계): 입력 글을 일치 위치로 잘라 강조·요약한다. 순수 로직.

// 입력을 [일치 아닌 글, 일치, ...] 조각으로 자른다. 빈 일치(길이 0)는 강조하지 않는다.
export function segments(input, matches) {
  const out = [];
  let pos = 0;
  matches.forEach((m, i) => {
    if (m.end <= m.start || m.start < pos) return;
    if (m.start > pos) out.push({ text: input.slice(pos, m.start), hit: null });
    out.push({ text: input.slice(m.start, m.end), hit: i });
    pos = m.end;
  });
  if (pos < input.length) out.push({ text: input.slice(pos), hit: null });
  return out;
}

const clip = (s, n = 40) => { const t = String(s ?? '').replace(/\n/g, '↵'); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

// 일치 한 건의 한 줄 설명: "#1 12–15 「글」 · $1=… · $2=(없음)"
export function describeMatch(m, i) {
  const g = (m.groups ?? []).map((v, k) => `$${k + 1}=${v == null ? '(없음)' : '「' + clip(v, 24) + '」'}`);
  return `#${i + 1}  ${m.start}–${m.end}  「${clip(m.text)}」${g.length ? '  ·  ' + g.join('  ·  ') : ''}`;
}

export function summarize(matches, { limit = 20 } = {}) {
  return { count: matches.length, lines: matches.slice(0, limit).map(describeMatch), more: Math.max(0, matches.length - limit) };
}
