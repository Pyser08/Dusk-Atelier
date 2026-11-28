# 몬헌 패러디 봇 인수인계 (feat/monhun)

## 작업 범위 원칙
- 원작 몬스터·무기·방어구를 알아볼 수 있게 재현하는 모델링·디자인은 AI가 하지 않음. 모델은 사용자가 만들고, AI는 도구·불러오기·리깅·동작·시스템을 맡음
- 오리지널 디자인은 `docs/monhun/design-bible.md`(사용자 제공 바이블) 기준. 제안과 확정을 구분
- 게임 시스템(무기 14종 조작, 와일즈 PC 키 배치 등)은 원작처럼 구현해도 됨

## 미리보기 (pm2 `dusk-rpg-dev`, 포트 5180, server.mjs에 페이지 추가 시 재시작 필요)
| 주소 | 내용 |
|---|---|
| /hunter | 6.5등신 복셀 인형 |
| /crystal | 유리날개룡 + 비룡형 공용 뼈대 동작 |
| /gs | 대검 동작 클립 |
| /hunt | 사냥 시험장(와일즈 PC 조작, 대검 전 기술, 타격 효과). ?gs=종류, ?gs=import |
| /gsdesign | 대검 디자인 비교. ?k=a,b,c |
| /import | .vox + 표시점 불러오기 → 대검 자동 장착 |
| /voxtools.zip | 복셀 제작 도구 내려받기 |

## 주요 파일 (tools/rpg-dev)
- `hunter.js` 사냥꾼 인형(뼈 23개, 관절 살 섞기) · `wyvernrig.js` 비룡형 공용 뼈대·IK·공용 동작 · `crystalwing.js` 유리날개룡
- `greatsword.js` 대검 공용 뼈대(GS_FRAME) · `gsdesigns.js` 디자인 견본들 · `gsanim.js` 동작 클립·스프링·히트스톱 · `gscombo.js` 입력 판정 · `keymap.js` 와일즈 PC 키 표 · `fx.js` 타격 효과
- `modelimport.js` .vox 불러오기·규격 검사·대검 자동 장착 · `../voxtools/` 픽셀아트→복셀 변환 등 도구

## 대검 디자인 견본 키
- 바이블판: cw_bible(익완 상위형), cw_tailb, cw_crestb, n_pane, n_finger, n_wedge, n_sac, n_tails
- 이전 견본: cw_wing2, cw_tail2, cw_fin, cw_triple, cw_plume 등

## 다음 후보
1. 견본 중 선택 → 강화 계보(초기형~최종형)
2. 몬스터 불러오기(비룡형 뼈대 자동 맞춤)
3. crystalwing-spec.md의 [제안] 항목 확정
4. 결정 재질 표현(그라데이션·하이라이트), 면 수 최적화
5. /hunt 손맛 조정(상쇄 판정 지연 등)
