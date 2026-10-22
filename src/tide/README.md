# RisuTide 공유 코어

RisuTide 1.0.0(2026-10-23)의 `src/ts/` 공유 코어에서 가져온 파일이에요. 업데이트 판단(세 방향 비교), 필드 소유권, 인사말 보호, 시작 안내 비교를 맡아요.
RisuTide 개발자의 동의를 받아 Dusk Atelier로 이어 개발합니다. (Special thanks: RisuTide 개발자)

- 원본에서 고치지 않고 그대로 두는 걸 원칙으로 해요. Dusk 쪽 연결은 `src/engine/tideplan.js`에 있어요.
- 기준(base) 의미는 Dusk 방식이에요: 마지막으로 받은 **제작자 파일**의 지문. RisuTide는 적용 결과를 기준으로 저장해서, 유지한 내 수정이 다음 업데이트 때 제작자 변경으로 보이는 문제가 있었어요.
