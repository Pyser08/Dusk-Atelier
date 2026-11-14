// Dusk 2.2.0: Erosync 자동 재분석 도우미.
// (1) 제공자 risu는 원본에선 RisuAI 보조 모델이라 취소가 안 됐지만, Dusk가 runAI를 주면 Dusk 경로(취소 신호 받음)로 가므로 자동 재분석을 허용한다.
// (2) 자동 재분석은 아는 인물만 다시 분석한다: 내용만 고쳐진 자료는 같은 종류·출처·이름의 유일한 문서로 이어 붙인다.
export function autoRefreshCancellable(providerId, hasHostRunAI) {
  return providerId !== "risu" || hasHostRunAI === true;
}

export function matchEditedDocument(oldDocument, unmatched, sameOrigin) {
  const hits = (unmatched || []).filter((document) => document.semanticLabel === oldDocument.semanticLabel && sameOrigin(document, oldDocument));
  return hits.length === 1 ? hits[0] : null;
}
