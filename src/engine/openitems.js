// 열린 항목(약속·복선) 고르기 — 코어 홈 화면도 쓴다
export const isClosed = (x) => !!x.closed && !x.closedOrphan;
export const openItems = (folder, { closed = false } = {}) => (folder.open ?? []).filter((x) => !x.orphan && isClosed(x) === closed);
