# Erosync 매 턴 계산 (설계, 11-15 합의)

## 목표
Erosync를 켜면 인물 성향 값이 장기기억과 함께 **매 턴** 갱신된다. 지금은 '인물 분석' 1회 + 로어 변경 시 자동 재분석뿐이라 대화로 인물이 변해도 값이 그대로다.

## 사용자 결정
- 원본 분석부를 **분해·이식**한다(바깥에서 흉내 내지 않음). 프롬프트 기준·채점 정의·값 정리 코드는 원본 것을 그대로 쓴다.
- 매 턴 호출은 **변화분 1번**: `지금 값 + 이번 턴 대화 → 바뀐 항목만`. 처음 1회(값이 없는 인물)만 원본 전체 단계(성향 채점→성적 채점→프로필 작성)로 출발값.
- 켠 항목만 계산. 사용자가 직접 고친 값(userOverrides)·잠근 값은 건드리지 않는다(분석값 baseProfile만 갱신).

## 원본 분석부 지도 (src/erosync/erosync.js)
| 조각 | 위치 | 이식 |
|---|---|---|
| 8축 정의·답 정리 | AXIS_DEFINITIONS, normalizeAxisAnswers(7078), axisScoringEntries, promptAxisSystem | 기준 글·정리 함수 그대로 공개 |
| 성적 4축·동기 | sexAxisGuideForAnalysis(6901), sexMotiveGuideForAnalysis(6922), sexualAxisFields(6978), sexualAxesReplyItem(7003), promptAxisSexualSystem(6701) | 그대로 공개 |
| 프로필 작성 | promptProfileSystem, normalizeProfileRecord, withoutAxisFields | 목표·경쟁·관계만 변화분용으로 |
| 값 정리 | normalizeEroticProfile(10054) | 그대로 |
| 저장 | mutateProfileRegistry + variant patch — 단일 재분석의 axesOnly 경로(21170 부근)가 본보기 | 새 연결부 `duskProfileTurnApply` |
| 호출 | runJsonTask(5510) → host.runAI | 그대로(stage `erosync-turn`) |
| 인물 찾기(discovery) | compileProfilesFromInventory 14465~ | **매 턴에서 안 씀**. 인물은 장기기억 인물 위키에서 |

## 구조
1. **엔진 연결부(erosync.js 끝 Dusk 연결부에 추가)**
   - `duskAnalysisKit()`: 위 기준 글(축 정의·성적 축 안내·동기 안내)과 필드 키 목록을 돌려줌. 사용자가 고친 프롬프트(promptOverrides)도 반영.
   - `duskProfileTurnApply(profileId, delta, meta)`: delta를 normalizeEroticProfile로 정리해 baseProfile에 합치고 variant에 저장, 감사 기록(appendProfileAudit, source 'turn') 남김. userOverrides·locked 존중.
   - `duskProfileFindByName(name, aliases)`: 장기기억 인물 → Erosync 프로필 id 연결(없으면 새 인물 만들기 = 처음 1회 전체 단계).
2. **턴 갱신기 (새 파일 src/engine/erosyncturn.js + src/data/erosyncturn.js)**
   - 장기기억 기록기가 턴 기록을 마치면(memoryturn.js 172줄 `rec` 성공 뒤) `onTurnRecorded({ people: rec.people(이름·변화), rp, chatKey })`를 알린다. Erosync가 꺼져 있으면 아무 일 없음.
   - 이번 턴에 기록된 인물 중 Erosync 프로필이 있는 사람만 묶어 1번 호출(최대 N명/호출, 넘치면 나눔). 프롬프트: kit 기준 글 + 현재 값 + 이번 턴 RP + 장기기억 인물 요약.
   - 응답 JSON `{ characters: [{ id, changes: {필드: 값}, reason }] }` → 범위 검사 → TurnApply. 한 턴 이동 폭 상한(예: ±15) 둠.
   - 다음 메인 요청과 겹치면 취소 가능(signal). 실패해도 장기기억·채팅에 영향 없음.
3. **UI (분석·관리 탭)**
   - '인물 분석' 카드 → **'매 턴 계산'** 카드: 켜기, 계산할 항목 고르기(8가지 성향 / 성적 항목 / 목표·경쟁), 마지막 갱신(턴·인물·바뀐 값) 표시.
   - '전체 캐릭터 분석'·'인물 골라서 분석'은 '출발값 만들기'로 이름을 바꿔 아래로.
   - 인물 위키 NSFW 탭: 턴별 변화 내역(감사 기록) 보기.
   - 기능 찾기(featurefind.js + 테스트 + e2e) 같이 고치기.
4. **기존 자동 재분석(autorefresh.js)**: 매 턴 계산이 켜지면 로어 변경 재분석 용도로만 남김.

## 단계 (세션별)
1. 엔진 연결부 3개 + 테스트(가짜 api로 bootErosync → 프로필 심고 TurnApply 확인)
2. 턴 갱신기 + 장기기억 알림 + 테스트(가짜 runAI)
3. UI + 기능 찾기 + e2e
4. 안내서(docs/site/guide)·CHANGELOG·source-map

## 확인할 것
- RisuAI·RisuBard·PocketRisu: 호출은 runAI 경로라 같음. 저장은 pluginStorage.
- 장기기억이 꺼져 있으면 매 턴 계산도 쉼(카드에 안내).
