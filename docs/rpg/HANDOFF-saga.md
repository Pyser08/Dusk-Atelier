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

## 사냥 규칙 `S.hunt` (2026-11-26, 미커밋)
미리보기·애드온 전투에서 켬. 끄면 원본 엔진과 결과 동일(rpg-engine 시험).
- 크기: `elements.js` SIZES/sizeOf(용·히드라·크라켄·전차 3×3, 큰 짐승·골렘·기계 2×2, 인간형 1칸). board.js cells·covers·bigCost, rules.dist는 몸 가장자리 거리.
- `engine/hunt.js`: 부위(칸=부위 partAt, 바라보는 쪽 앞줄), 일반 공격=가까운 칸, 노리기 u.aim=[x,y](명중−10·부위×2), 무기 결 CUT(타격 머리·베기 꼬리날개·찌르기 다리), 부위 파괴 효과(머리 기절·다리 이동−2·날개 추락·꼬리 공격−3), 방향 FLANK(측면 명중+10, 배후 +20·필살+10), 버팀 게이지(브레이크, 소3·대5·거대7 → 쓰러짐 한 턴·피해×1.5), 밀치기(combat.knock: 둔기·창 근접, 벽 3·낙하 층당 3·위험 지형), 공격 예고(ai.js blast/teleCells: 큰 몬스터가 앞 3줄 예고 → 다음 적 턴 발동, 쿨 2턴, 기절·브레이크·머리 파괴로 끊김).
- UI(app.js): 예측 창 `.htags`(방향·버팀·쓰러짐·밀쳐냄), `.parts`(맞는 부위·노리기), 타일 클래스 pa/pt(노릴 칸)·tl(예고 칸), 이벤트 `blast`. 3D: data-sz 크기 배율, data-face 방향.
- 적은 토큰 생성 `engine/compact.js`: compactPrompt(약 2천 자, 예전 GEN_PROMPT의 1/9) + parseCompact(사가 줄 → loadEncounter). 애드온 gen이 이것을 기본으로 쓰고 JSON 답도 읽음.
- 시험: tests/rpg-hunt.test.js, tests/rpg-compact.test.js. 캡처: /tmp/shot/{big,part2,tele}.mjs.
- 남은 것: 화면에서 턴 넘김 후 예고·발동 연출 확인 못 함, 부위 파괴 3D 연출 없음, 전리품 쓰는 곳 없음, AI가 방향·예고를 활용하지 않음(아군 쪽 등 돌리기 등).
- 간단 형식 확장(compact.js): `지도`(다음 줄들이 맵), `기술 id "이름" 등급 속성 종류 설명`(효과는 traitsFromText), 유닛 `익힘 id`·`★~★★★`(phase.empower: ×1.2/1.45/1.75, 레벨 상한 무시)·`힘+4` 같은 손질, `아군 #id`(저장된 동료 다시 쓰기, 이름이 같아도 연결), `성장 #id 힘+1 경험 20 배움 id 무기 ... | 이유`(planGrowth/applyGrowth), `이탈 #id`. 앱은 이야기로 만든 판(S.story)의 동료를 carryParty로 다음 판에 넘기고 rosterCompact를 프롬프트에 싣는다. loadCompact = 읽기+세우기+성장.

## 2026-11-26 추가 (미커밋)
- 난이도 S.diff(설정 화면 '난이도', 저장 dusk-saga-diff): 0 쉬움(적이 방향·부위 모름, 예고 피해 ×0.7, 포효 없음, 휩쓸기는 셋 이상일 때), 1 보통, 2 어려움(배후·막타 선호, 예고를 아군 많은 쪽으로 돌림, 포효 문턱 낮음).
- 몬스터 패턴(ai.js pattern): 분노(HP 절반, 공격+3·붉은 빛), 포효(HP 75%, 2칸 안 상대 기절 → 아군 턴 쉼), 꼬리 휩쓸기(꼬리 있고 둘러싸이거나 뒤에 적: 둘레 피해+밀치기). 연계(hunt combo: 같은 턴 같은 부위 연속 → 부위 피해 +25%/타, 명중 +5).
- 환경: 지형 x 폭약통(막힘·엄폐). 밀려 부딪히거나 예고 기술이 덮으면 3×3 폭발 8, 연쇄. 큰 몬스터가 쓰러진 채 벽에 밀리면 6 피해+기절.
- 연출(app3d hooks.fx): boom·blast·pattern·pbreak·down, 화면 흔들림, 기절 별, 분노 빛, 쓰러짐 납작. data-st.
- 장부 engine/ledger.js: settle(부위→소재, 크기·보스로 등급), keepParty, 정비(repair·setMain·giveTo·stash·equip·discard), 제작(forge·temper·imbue), ledgerNote(다음 입력용, 한 번 쓰면 비움), WORKSHOP 정규식. 앱 bag() 화면(가방·정비·제작; 제작은 최근 채팅에 대장간 등 있거나 '여기서 제작하기').
- 애드온: 채팅별 장부 키 ledger:<chaId>:<chatId>, 🎒 가방 버튼, beforeRequest에 전투 결과+장부 기록+감지 지시, afterRequest가 [[전투: …]] 지우고 brief:<키>에 저장 → 다음 '전투 만들기'에 실림. 장기기억 켜져 있으면 memory.ledger(recordLedger: folder.rpg.bag/log), memory.battle.
- 시험: rpg-ledger.test.js 추가. 애드온 가짜 환경 스모크 /tmp/shot/addon-smoke.mjs.

## 2026-11-26 피드백 반영 (미커밋)
- 장비: 줄 형식 사람 유닛(fitJob)은 setJob 뒤 직업이 못 쓰는 무기를 버린다(전에 '병사' 틀의 창이 남았음).
- engine/status.js(S.hunt): 상태 u.fx(독·화상·출혈·빙결·수면·침묵·둔화·약화·방어 저하·실명 / 강화·수호·신속·집중·재생), tickFx(턴 시작 지속 피해·재생·빙결/수면 쉼), fxMods(예측 보정), fxMove, 침묵은 기술·지팡이·지원 봉인. weaponFx: 종류(KIND)·속성(ELEM) 부가 효과 + 희귀 이상은 이름으로 정해지는 개성(AFFIX). inflict는 명중 후 굴림.
- 지원 기술 type "support"(eff·on·range·cd): options kind support, actSupport, 적 AI trySupport. 줄 형식 `기술 "이름" 등급 [속성] 공격|지원|패시브|발동 설명`(id 생략 가능, 효과 낱말로 eff), 유닛 `익힘 "이름"`. 프롬프트가 아군·이름 있는 적마다 고유 기술을 요구.
- 줄 형식 관용: 굵은 글씨·번호·콜론·'적군'. 못 읽으면 한 번 다시 요청.
- 전투 표시: 지시를 맨 끝 system 메시지로, [[전투: …]] 외에 [전투: …]·【전투: …】·<전투>…</전투>도 지움.
- 시험 rpg-status.test.js.

## 2026-11-26 피드백 2차 (미커밋)
- 전투 진입 흐름: 지시(맨 끝 system + 입력 끝 한 줄)로 모델이 맞부딪치기 직전에 멈추고 [[전투: …]]. addon.js scan()이 afterRequest와 output 훅 둘 다에서 훑고(같은 답 한 번), 표시가 없으면 onEdge(끝 500자 싸움 신호 2개↑, 결말 낱말 없음)로 감지. 본문 카드 encSync: `.risu-chat[data-chat-index=N]` 안 `.chattext` 부모에 경고 카드(ENC_CSS, x-dsg 속성, 줄무늬·삼각형 애니메이션) — 전투 시작/넘기기. 자동 열기는 data["auto-open"]==="1"일 때만. Dusk 페이지에 감지 상태(훅 횟수·감지·마지막).
- 결과 → 입력: 결과 창 '결과를 채팅으로'(HOST.toChat: setChatToIndex로 유저 메시지 추가, 전투 만든 채팅만), resultLine(S). 보내기는 사람이. 결과 상자 디자인 .resbox r-victory/defeat/retreat.
- 직업: jobLike(아무 직업명 → 가장 비슷한 직업), 화면 이름은 원래 이름(cls). 전직 버튼 숨김(S.hunt). 이야기 무기(storyW)는 직업 밖이라도 사용(d.wok)·주무기, 무기 없으면 "<이름>의 방패검" 같은 직업 무기.
- 광역: skill flags.area — 목표에 맞닿은 다른 적 60% 피해(반격 없음). 줄 형식 기술 설명에 광역/휩쓸/폭발 등 → area. giveArea: 공격하는 아군·보스에 광역기 없으면 무기에 맞춰 붙임.
- 밸런스 balance(S): 적 전력(레벨+6 × 크기 × 보스1.6) ≤ 아군 전력 × [0.65,0.85,1.1](난이도)까지 졸개부터 제거, 적 능력치 × [0.8,0.9,1.0](넘치면 더 낮춤). 시험은 S.noBalance로 끌 수 있음.
- 프롬프트(compactPrompt 약 4천 자): 고유 무기·기술 이름, 직업명 자유, 광역기 필수, 등급별 Lv 기준(신인 3-8 … S급 30+), 밸런스 지침.
- 시험 55개 통과(tests/rpg-*.test.js). 애드온 가짜 환경 스모크: /tmp/shot/smoke4~6.mjs(사라질 수 있음).
- 다음 후보: 실제 RisuAI에서 본문 카드·결과 넣기 확인, 밸런스 체감 조정, 에로싱크 파일은 이 브랜치에 남아 있음(사용자에게 지울지 묻는 중).

## 2026-11-26 난입 (미커밋)
- engine/raid.js maybeRaid(S, ev, force): S.hunt일 때 아군 턴 시작(endTurn, 2턴째부터)에 확률 굴림. S.raid 0 끔·1 가끔(2%+턴당 1, 최대 5%, 한 판 1번)·2 자주(5%+턴당 2, 최대 15%, 2번). 난입 후보에 로어북 인물(addon lore())도 씀. 아군 HP 50% 아래면 우군 60%, 아니면 우군 35%/제3세력 65%.
- 가장자리 중 모두에게서 먼 칸에 등장. 후보: 판을 만들 때 `난입 제3 …`/`난입 우군 …` 줄(B.cand, 필드에 안 세움)을 먼저, 없으면 테마별 WILD 몬스터·장르별 HELP(순찰대 창병 등). 레벨은 아군 평균 기준.
- 이벤트 raid(배너 friend/third 색) + spawn, B.raids 기록 → resultLine '난입:' 줄. 설정 화면 '난입' (dusk-saga-raid). B.pool은 우군 경험치라 후보 이름은 B.cand.
- 시험 tests/rpg-raid.test.js.

## 2026-11-26 이야기 규칙·편의 (미커밋)
- engine/saga.js (S.hunt일 때만, combat.mods→sagaMods): 관계 S.bonds[{a,b,g,duo}] (love·fam·friend·team·rank·rival, 붙어 서면 보너스, 라이벌 2칸) · 날씨 B.wx/B.time(pickWeather: 줄 형식 `| 날씨 비 | 시간 밤` 없으면 테마로 굴림, wxElem·wxHit·B.wxMove→board 이동) · 몸 상태 d.cond(COND: 부상·중상·피로·몸살·취기·중독·출혈·겁·격앙 + 생리 중/첫날/전·임신 초중후기는 약하게) applyConds(u.condOn, u.mvAdj) · 부상 이월 settleInjury(finish에서, S.injury 0이면 끔, d.injury{k,left}; d.cond는 판 끝·carryParty에서 지움) · 목표 escort/escape/steal/hunt(setupObjective, objOutcome이 outcome보다 먼저, B.exits·B.out·B.loot·u.vip·u.carry) · 요약 tally/battleStats.
- engine/acts.js: sagaOptions(options 끝에) duo·capture(짐승=길들여 ally, 사람=포로)·persuade(friend로, 이기면 d.ally)·steal·pick·escape, autoAllies(남은 아군 AI).
- 줄 형식: `관계 "A" "B" 연인 합체기 "이름"`, 유닛 `상태 피로,부상`·`호위대상`·`보물`, 목표 `호위 N|탈출|탈취 <물건>|부위파괴 <곳> <턴>`.
- 장기기억(없어도 다 돎): memlink.memState(f,names) → 월경·임신 칸(cycleCond)·현재 상태 글 키워드·ties/lovers → applyMemState. memorylink.state, addon HOST.memState, app 전투 만들 때 적용.
- 편의(app): 한 수 무르기(V.undo, 턴 넘기면 사라짐, 같은 시드라 결과도 같음), 남은 아군 맡기기, 예측 경고(격파 가능/반격에 쓰러짐), 추천 표시(설정, .u.best), 결과 요약 카드, 설정 '추천 표시'·'부상 이월'. 화면: 탈출 칸 .ex, 보물 .lt, vip/carry 표시, goal에 날씨.
- 시험 tests/rpg-saga.test.js. 캡처 /tmp/shot/saga.mjs.

## 2026-11-26 결과 연출·생성 흐름 (미커밋)
- over(): 시트 대신 전체 화면 .endfx(e-victory 금빛 광선·꽃가루 / e-defeat 금 간 유리·불티 / e-retreat 안개·바람), 엠블럼 SVG(EMB), 글자 하나씩. 버튼은 shut()로 닫음.
- 생성: genSheet는 처음(또는 '설정 바꾸기')만 모델·장면 선택 → 저장 dusk-saga-genset, 다음부터 바로 genRun(대기 화면 .genload: 링·검·불꽃, 단계 문구, TIP, 가짜 진행 막대 95%까지 지수로 → 완료 100%, 실패 시 다시 만들기). 설정 화면에도 '전투 만드는 모델'·'장면'.
- 애드온 닫기: 버튼이 Dusk 창을 열기 전 닫혀 있었으면(duskOpen) 전투를 닫을 때 ctx.app.root.hidden + api.hideContainer로 채팅 화면으로.
- 디버그: globalThis.__sagaDebug {S, over, draw}. 캡처 /tmp/shot/end.mjs(가짜 HOST.gen), end2.mjs.

## 2026-11-26 버튼 (미커밋)
- 리스 버튼: 리스가 준 실제 id를 globalThis.__duskSagaLive.parts에 적고 켤 때 예전 것·막대·타이머 모두 걷음(다시 깔아도 안 늘어남, /tmp/shot/dup.mjs). 고정 id(dusk-saga-gen/bag/menu), 켤 때 먼저 지우고 3번 재시도, 주인 표시(__duskSagaOwner)로 늦게 꺼지는 예전 인스턴스가 새 버튼을 안 지움.
- 떠 있는 막대는 코어로 옮김(2.2.66, 미배포): src/data/fabdock.js(세로 막대 그리기) + fabhub.js(createFabHub, main.js가 globalThis.__duskFab·app.ctx.fab로 둠, 칸 {key,title,open,order}). memorybutton.js는 막대가 있으면 동그란 버튼 대신 relmap(10)·regress(20, chatmenu.addLink가 globalThis.__duskChatLinks에 적은 열기) 칸. Saga addon은 gen(30)·bag(40) 칸만 붙이고, 코어가 못 그리면 리스 action 버튼. 위치 키는 예전 동그란 버튼과 같은 dusk.ui.fabPos. 시험 tests/fabhub.test.js. ※ 코어 배포 전에는 .dka가 리스 버튼으로 동작.

## 2026-11-26 가방·제작대 (미커밋, main v2.2.65 합침 eba7771a)
- engine/materials.js: 소재 도감 BASE 86종(광석·주괴·보석·나무·약초·가죽천·정수15·잡화), SHAPES 54(12×12 도트, 무기 14 포함), PAL 101, iconSvg(it,px), partMaterial(몬스터,부위,모델,속성) → 무리별 이름·모양(용 뿔/비늘, 짐승 송곳니/털가죽, 벌레 겹눈/갑각, 언데드 두개골/뼈, 기계 센서/장갑판…), weaponIcon, gatherDrops(테마·사람 적), STARTER.
- engine/craft.js: KEYS(재료 기호), RECIPES(3×3 손질10·무기18·소모품4·부적, 5×5 9종 up 보너스), matchGrid(옮김·좌우 뒤집기, short), preview, craftGrid(5×5는 workshop), autoFill, needOf, tagsOf.
- ledger: settle가 partMaterial 이름·모양으로 소재, 이긴 전투면 채집 소재, addMat, ensureStarter(L.starter), equipCharm/unequipCharm(d.charm, 기본 패시브 기술), partyLine(L) → addon beforeRequest가 매 요청에 실음(정비 즉시 반영).
- tools/rpg-dev/bagapp.js + bag.css: 독립 가방(addon openBag, 별도 섀도 호스트, app3d 안 불러옴). 제작↔정비 scroll-snap 좌우 넘김, 3×3/5×5(대장간 대화 WORKSHOP 또는 data["bag-unlock5"]), 서랍(손잡이 눌러·끌어 펼침, 분류 칩), 칸 누르기/끌어다 놓기, 레시피 책(채우기), 정비(동료·무기 5칸·장신구·주무기/수리/강화/속성/가방에/넘기기). 미리보기 /bag(#shop이면 5×5). 캡처 /tmp/shot/bag.mjs, 도감 /tmp/shot/mats.mjs.
- 시험 tests/rpg-craft.test.js. rpg-ledger 시험은 부위 이름 바뀜에 맞춤.
- 2026-11-26 추가: 제작 현실화 — 무기 레시피·5×5·제련·강철판·정수 추출은 recipe.shop(대장간·아틀리에, WORKSHOP 대화)에서만, 휴대 3×3은 손질·약·부적. engine/monmats.js: 프리셋 몬스터 68종 × 무리별 부위 소재 419종(BY_ID 'mm:몬스터:부위', 이름 없는 몬스터는 ensure로 즉석), dropsFor(부위·kill). settle은 이걸 먼저 씀. 가방 '도감'(BASE + 몬스터). 보조무기 d.sub(이름): combat.subFor — 주무기가 공격자에게 안 닿고 보조가 닿으면 반격 때 보조를 듦(ev 'sub'), 가방 정비 '보조무기로', 전투 메뉴 '무기 설정'(들기·보조), 예측 창에 '보조무기로 반격'.

## 2026-11-26 방어구·기술·세계 (미커밋)
- engine/armor.js: 직업군 GROUPS 5(heavy 중갑·light 경갑·robe 로브·brawler 무투·tactical 전술, groupOf: job→outfit→무기), SLOTS 5, makeArmor(직업군×부위 PRO 이름·능력치, 등급 k=0.3+gi*0.12, 처음 옷 starter ×0.5), d.armor, wearable(직업군 일치), setsOf/SETFX(몬스터 무리·금속별 2/4세트), armorMods(sagaMods), armorResist/armorBoost(combat side em), armorRegen(phase), starterArmor(loadEncounter에서 아군: 이야기 옷을 방어구 5벌로·외관 유지), armorLook(→ 복장 키+dye: 직업군·무리·등급·속성·4세트 망토, MOTIF 장식), hairFromText. famrules.js(familyOf, 순환 참조 피함).
- voxkit: outfit "under"(속옷), body() 끝에 o.motif 장식 9종(horn·fur·spike·feather·shell·bone·crystal·leaf·mech, o.mc/o.ma/o.mot2/o.fin). 특정 게임 디자인 복제 아님 — "소재 몬스터의 특징이 드러난다"는 원칙만.
- 전투 3D: app.js 유닛에 data-dye·data-hair, app3d → voxbattle(info.dye 덮어쓰기, info.hairc). 머리색: 줄 형식 '머리 금발', 장기기억 외모(memState.hair → applyMemState).
- craft: 방어구 레시피 25(직업군 주재료 m/l/c/b/g × 묶는 재료 L/T/T/I/J × 부위 모양), 모두 shop. ledger: equipArmor/unequipArmor/autoEquip(추천 장비), partyLine에 방어구·세트·보조무기.
- 기술: compact.giveUnique(고유 1개 보장, giveArea와 함께), ledger createSkill(makeSpell, L.skillLib)·learnSkill·forgetSkill·saveSkillSet/loadSkillSet(d.skillSets).
- engine/world.js: ERAS 6(판타지·무협·현대·SF·마을·학원), WORLD_PROMPT/parseWorld(AI가 길드·랭크·화폐 단위·물가·상점), fmtMoney/parseMoney(기준 단위 하나), wallet/pay/earn, valueOf/sellPrice, stock(가게 종류별 진열, 날마다), 의뢰 QUEST_PROMPT/parseQuests/addQuests/takeQuest/dropQuest/deliver/questsFromBattle(settle에서), 랭크업(평판 60마다), questLine(전투 생성에 실음), worldLine(매 요청), MONEY_RE/applyMoneyMarks.
- addon: ask(보조 모델 기본, data["ask-model"]), 의뢰 자동(data["quest-mode"] story 기본·auto 8답·manual·off, 10분 제한), 돈 자동(data["money-auto"] 기본 끔, [[돈: ±…]] 지우고 반영), Dusk Saga 페이지에 '세계·길드·상점' 카드. 막대 칸 '정비'(order 45, openBag("gear")).
- bagapp: 탭 4(가방·정비·길드·상점, scroll-snap). 정비: 3D 미리보기(bag3d.js createPreview, 끌어 돌리기), 방어구 5칸·무기·장신구, 합계·세트, 기술(잊기·만들기·만든 기술·세트). 길드: 랭크·평판·지갑·수락(3)·게시판·건네기·새 의뢰·세계 다시 읽기(처음 길드/상점 볼 때 AI가 세계를 읽음). 상점: 이야기에 상점·시장 말이 있을 때만, 진열 사기, 서랍 물건 눌러 팔기(45%).
- 미리보기: /bag(#shop 공방·상점, #dragon 화룡 세트), /armory(무리별 방어구 3D 견본). 캡처 /tmp/shot/{gear3d,armory,guild}.mjs. 시험 rpg-armor·rpg-world.

## 2026-11-26 실기 피드백 1차 (미커밋)
- 공격 수단 패널(.wpanel .wl): 무기 그림 18px 고정·최대 폭(휴대폰에서 이름이 밀려 잘리던 문제), 등급 색 왼쪽 띠·이름 색, 주/보조 표시(wtag).
- engine/naming.js: personalize(S, PRE) — 아군·보스·이름 있는 적의 프리셋 무기(철의 X, '<이름>의 X')와 공용 기술(tier common)을 성능 그대로 이름만 고유하게(속성·이름 해시 수식어). giveArea/giveUnique 이름도 sigName. loadCompact·app 생성 경로에서 호출.
- 결과: digest.resultFacts/resultLine(턴·날씨·활약·동료 상태·얻은 것(settle의 B.got)·의뢰), resultCard(HTML 상자) → '결과를 채팅으로'가 꾸민 상자로 들어감.
- 정비: 강화·속성 입히기 때 matUse로 쓸 수 있는 소재만 밝게·나머지 회색, 소재 밑에 바뀌는 값(등급·위력 / 속성·강한 상대). 능력치 고치기(range 막대 드래그, 저장 지연, '다 고쳤어요' 때 기록 메모).
- 본체 runai.drainStream: 중지하면 다음 조각을 기다리지 않고 바로 reader.cancel(v2.2.67, fix/ai-stop-v2.2.67). runLLMModel 자체에는 취소 수단이 없어 스트리밍이 아닌 응답은 리스 쪽이 끝날 때까지 돈다(화면은 바로 멈춤).
- 2026-11-26 본문 카드 → 답 본문 안에 실제로(HTML, 인라인 스타일, 안쪽 span만): scan이 [[전투:…]]를 지우고 encCard(brief)를 끝에 붙여 저장(채팅과 함께 동기화). 버튼은 class dsg-go/dsg-skip + dsg-id-<id>(리스가 x-risu- 접두를 붙임), encSync가 화면에서 찾아 눌림만 연결(x-dsgb). encClick: 그 메시지의 카드를 '⚔️ 전투로 이어짐'/'↩ 넘김' 표시로 바꿔 setChatToIndex. beforeRequest가 카드(CARD_RE)를 지우고 보냄. 채팅별 값(장부·brief·enc-idx)은 dusk.storage 'c:<키>'로 따로 저장·3초마다 다시 읽음(cget/cset/cpull, 예전 'game' 덩어리 값은 읽어서 옮김) — 기기 간 덮어쓰기 방지.
- 결과 카드도 같은 방식: digest.resultCard = <div class="dsg-res"> 인라인 스타일·span만·줄무늬 띠·VICTORY/DEFEAT/RETREAT, 안에 숨긴 dsg-plain(resultLine). beforeRequest가 plainResults로 카드 → 글만 바꿔 보냄.
- 2026-11-26 본문 카드 3차: RisuBard는 메시지 속 HTML을 그리지 않음 → 본문에는 표식만 저장 [[ENCOUNTER#id: 상황]](누르면 '#id 이어짐'/'#id 넘김'으로 바꿔 저장), 결과는 글 그대로([전투 결과 — …] 블록). addRisuScriptHandler("display")의 toCards가 화면에 보일 때만 카드로(digest.cardFromPlain, RESULT_BLOCK_RE). 예전 HTML 카드도 표시 때 다시 그림. 버튼 찾기: style 안 --dsg:go-<id>(클래스가 지워져도). beforeRequest가 표식·예전 HTML을 지우고 보냄.
- 성능: app3d 루프가 매 프레임 보드 DOM 전체를 훑던 것 → MutationObserver로 바뀔 때만 refreshBoard(TS·UN 캐시), 이름표 위치는 바뀔 때만 씀, 가만히 있으면 30fps. 가방은 지금 쪽±1만 그림, 3D 미리보기는 보일 때만·30fps·픽셀비 1.5, 아이콘 SVG 캐시. 애드온 주기 작업: 카드 확인 평소 6초(카드 생긴 뒤 40초만 1.5초), 장부 다시 읽기 6초·숨겨진 탭 건너뜀.
- 공격 수단 패널 2차(폭 min(300px,100vw-16px), 오른쪽 8px, 잘림 clip-path 제거, 이름 두 줄, 선택 흔들림 끔). 가방 PC 폭 760px 가운데.
- 2026-11-26 효과음 tools/rpg-dev/sfx.js: Web Audio 합성(파일 없음). SOUNDS 34종 + MAGIC 속성 11종, sfx.hit(h, w)(무기 종류·속성·필살·막기·빗나감·부위 파괴), 첫 터치에 unlock, 설정 dusk-saga-sfx·dusk-saga-vol(전투 설정 '효과음'·'소리 크기'). 전투: hooks.fight의 hit 콜백·간이 경로·phase·heal·die·level·blast·boom·tele·pattern·duo·포획/설득·raid·escape·encounter·over(승패), 버튼 click. 가방: 탭·놓기·제작·장착·강화·사고팔기·의뢰.
- 전투 감지 지침 강화: 싸움 직전이면 그 순간에서 끝내고 한 줄도 더 진행 금지(첫 공격·경과·결말·장면 전환·회피 비틀기 금지), 마지막 줄 [[전투: …]] → ENCOUNTER 카드.
- 2026-11-26 카드 버튼 연결 수정: 메인 DOM은 x- 속성만 읽힘(style·class getAttribute가 Access denied → 연결 실패·encDenied로 꺼짐). 이제 채팅 본문에서 카드 id를 모아 선택자([data-dsg=go-id] / [style*=--dsg:go-id] / 클래스)로 직접 찾고, 속성은 읽지 않음. 오류로 영구 꺼지지 않음. 리스·포켓리스·RisuBard 공통.
- 2026-11-26 이름 링크(Dusk 인물 <span data-dusk=…>)가 결과·인카운터 카드에서 글자로 보이던 것 → cardFromPlain·encEsc가 그 태그는 살림. 회전 랙: 그림자 autoUpdate 끄고 움직임·연출·보드 변경 때와 6프레임마다만 갱신(카메라만 돌 땐 안 함), 휴대폰은 그림자 1024·PCF, 고화질 픽셀비 1.5.
- 2026-11-26 랙 3차: 초상(hooks.face)을 한가할 때 하나씩 그리는 대기열로(그리는 동안 멈춤 없음, 다 되면 redraw), 키는 주무기·방어구 dye·머리색 기준(무기 바꿀 때마다 새로 그리던 것 제거, 초상에 방어구 반영). gl.debug.checkShaderErrors=false(셰이더 오류 검사 대기 제거). 움직일 때 그림자 2프레임에 한 번.
- 2026-11-26 몬스터 모양: engine/monguess.js guessMonster — 프리셋 없는 적 이름에서 낱말로 가장 가까운 몬스터 프리셋(도마뱀→늪 악어, 트롤→외눈 거인 …)·속성(화염→fire, 슬라임·정령·골렘은 속성 모양)·몸집(거대 2). compact가 프리셋 못 찾은 적·제3에 적용(직업·종족 무시), phase가 o.size 반영. 프롬프트에 '몬스터는 이름 뒤 가장 가까운 몬스터 프리셋 필수'.
