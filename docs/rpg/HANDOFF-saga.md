# Dusk Saga 인계 (2026-11-25)

브랜치 `Dusk-RPG`(작업 폴더 `/home/ubuntu/dusk-rpg`). 마지막 커밋 `cf29b965` 이후는 **커밋하지 않았다**(사용자가 커밋을 따로 말할 때만).

## 실행
- 미리보기 서버: pm2 `dusk-rpg-dev` (127.0.0.1:5180, https://rpg.duskhub.duckdns.org, 비밀번호만 — 평소 비밀번호의 SHA-256과 비교). 화면: `/` 전투 3D, `/vox` 인형·무기·몬스터 보기, `/fx` 연출 시연, `/addon` 시험판 .dka 내려받기.
- 시험판 애드온: `node tools/rpg-dev/build-addon.mjs` → `test-addons/rpg-test.dka`(id `rpg-test`, 배포 목록에는 없음). Dusk 홈 → 애드온 → 불러오기.
- 시험: `npm test`, `npm run check`. 화면 캡처 스크립트는 `/tmp/split`(사라질 수 있음).

## 구조 (tools/rpg-dev)
- `env.js` 미리보기/애드온 공용 루트·저장소. 애드온에선 `globalThis.__duskSaga`(섀도 DOM, 애드온 저장소, close/cast/gen).
- `app.js` 규칙 UI(엔진 `src/rpg/engine`), `ui.js` 게임식 고르기(타일판·◀▶·나눠 고르기·막대), `app3d.js` 3D 판, `fight3d.js` 전투 연출, `voxbattle.js` 유닛→복셀 연결.
- `voxkit.js` 인형·무기 62종·방패·동작, `forge.js` 등급(만듦새)·속성(구조) 꾸밈, `wfx.js` 궤적·타격·투사체·채찍, `voxrace.js` 종족 93종 부위 움직임·버릇·습관.
- `voxmon.js`·`voxmon2.js` 몬스터 54모형(골격 q/b/a/c/f/o/m/x), `voxmonanim.js` 골격별 동작.
- `addon.js` 시험판 애드온: 하단 ‘전투 만들기’ 버튼(location action), 햄버거 버튼, Dusk 페이지, 이야기로 전투 생성(메인/보조 모델, runAI → 생성 중지), 끝난 전투 결과를 다음 입력 끝에 한 번 붙임(`storyNote`, beforeRequest).

## 엔진 변경 (src/rpg/engine)
- 속성 15종(불·물·얼음·번개·바람·땅·풀·독·강철·빛·어둠·비전·음파·피·중력). 약점 ×1.5 · 내성 ×0.75(무효 없음), 둘이면 곱해 ×0.6~1.8, 같은 속성 ×1.2, 지형 ×1.15. 단단·흐릿한 몬스터는 무속성만 덜 맞고(PHYS) 약한 속성엔 ×1.5.
- 지형 추가 d 모래 · n 눈밭 · o 덤불 · r 길 · k 가시밭 · u 독늪 · q 성역 · c 수정. 배경 테마 추가 cave·sea·city·sky·autumn.
- `edit.js` 인물 고치기(사본에서 고치고 확정), `actRetreat` 도주(결과 ‘아군 도주’), `lookOf`에 kind·name·elem.

## 남은 일 / 주의
- 채팅 자동 전투 감지(메인 모델 표시 → 인카운터 줄)는 아직 없음. 지금은 버튼으로만 만든다.
- 실제 RisuAI 안에서 애드온을 돌려 본 적 없음(흉내 환경에서만 확인). 휴대폰 속도 미확인.
- 커밋 전: `tools/rpg-dev/assets/p_*.glb`·`v_*.vox`(쓰지 않는 후보)는 빼고 올릴 것.
- 규칙: 버전 올리기·main 손대기·배포·PR은 사용자가 말할 때만. 커밋 꼬리말 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
