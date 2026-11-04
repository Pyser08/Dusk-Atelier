// 사람이 아니라 '집단·반·역할'을 가리키는 이름(1학년 A반, 동급생, A반 학생들…)을 알아본다.
// 인물 기록·위키 인물 문서는 이름 붙은 한 사람만 만든다. 이런 이름은 인물로 만들지 않는다. {{user}}는 건드리지 않는다.
const CLASS = /(\d+\s*학년|(^|\s)[A-Za-z0-9가-힣]{1,2}\s*반$|(^|\s)\d+\s*반)/;
const GROUP_WORD = /(^|\s)(동급생|동기생|급우|학생|친구|아이|사람|선배|후배|동기|직원|손님|주민|부하|병사|사원|하객|관객|군중|무리|일행|패거리|반 아이|클래스메이트|classmates?|students?|people|crowd|staff|villagers)(들|\s*전체|\s*일동)?$/i;
const norm = (v) => String(v ?? "").normalize("NFKC").trim();
export function isCollectiveName(name) {
  const n = norm(name);
  if (!n || /^\{\{user\}\}$/i.test(n)) return false;
  return CLASS.test(n) || GROUP_WORD.test(n);
}
export const COLLECTIVE_RULE = "A character is one individual with a name or a clear identity. Never record or create a class, grade, club, team, crowd, family-as-group or role label (e.g. '1학년 A반', '동급생', 'A반 학생들', 'students', 'staff') as a character; put what a group does inside the relevant individual's entry instead.";
