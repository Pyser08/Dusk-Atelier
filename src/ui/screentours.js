// 화면별 둘러보기 (v1.8.1): ? 버튼과 각 화면의 '둘러보기' 버튼이 같은 하이라이트 방식(처음 둘러보기)으로 지금 화면을 짚어 준다.
// 목표가 지금 화면에 없으면(예: 모바일에서 안 보이는 칸) 그 단계는 건너뛰고, 정의가 없는 화면은 설명+팁을 한 장으로 보여 준다.
import { TABS } from "./tabs.js";
import { runTour } from "./tour.js";

const st = (icon, title, text, ...target) => ({ icon, title, text, target });

// 키: 탭 id · `탭:하위` · `memory:페이지`. 첫 안내(화면 설명)는 자동으로 앞에 붙는다.
export const SCREEN_TOURS = {
  home: [
    st("brain", "지금 상태", "지금 열린 채팅의 장기 기억 상태예요. 켜져 있는지, 기록이 쌓이고 있는지 보여 줘요.", ".rb-hstats"),
    st("search", "기능 찾기", "하고 싶은 일을 적으면 그 기능이 있는 곳을 찾아 줘요. 다른 화면에서는 오른쪽 위 ? 옆에 있어요. 키보드에서는 / 를 눌러도 돼요.", "#rb-home-find"),
    st("upload", "바로가기", "하고 싶은 일을 골라요. ‘가져오기’는 봇·모듈 파일을 불러오고, 기억·관리·작업실은 기능을 모아 둔 곳이에요.", ".rb-hw[data-w=imp]", ".rb-hw[data-w=mem]"),
    st("history", "최근 기록", "최근에 쌓인 인물 기록이에요. 누가 무엇을 했는지 한눈에 볼 수 있어요.", ".rb-hrecent"),
    st("sliders", "홈 꾸미기", "위젯을 끌어 옮기고 모서리로 크기를 바꿔요. 안 쓰는 위젯은 숨기고, ‘기본 배치로’로 되돌릴 수 있어요.", "#rb-home-edit"),
    st("help", "처음 둘러보기", "전체 안내를 다시 보고 싶으면 여기를 눌러요. 설정에서도 볼 수 있어요.", "#rb-home-tour"),
    st("help", "? 버튼", "어느 화면에서든 이 ? 버튼을 누르면 그 화면을 이렇게 하나씩 짚어 드려요.", "#rb-help-btn"),
  ],
  // 2.0.0: 지금 화면 구조에 맞춤(예전 선택자는 없어져서 건너뛰어졌다)
  "memory:home": [
    st("brain", "기억 상태", "지금 채팅에서 기억이 켜져 있는지, 몇 개 쌓였는지 보여 줘요. 오른쪽 스위치 하나로 켜고 꺼요. 처음엔 이것만 켜 두면 돼요.", ".rb-mem-statuscard"),
    st("sparkle", "지난 대화 분석", "기억을 켜기 전 대화도 한꺼번에 읽어서 기억으로 만들어요. AI 호출이 들어요.", "#rb-mem-analyze"),
    st("list", "칸 나누기", "아래는 한눈에·설정 칸으로 나뉘어 있어요. ‘한눈에’에는 인물 위키·기록 보기·카드 만들기·다른 채팅 바로가기가 있어요.", ".rb-mem4-tabs"),
    st("book", "인물 위키 설정", "인물 위키를 자동으로 쌓는 부분이에요. ‘설정’ 칸의 ‘인물 위키 설정’에서 열어 무엇을 얼마나 자세히 기억할지, 어떤 AI를 쓸지 바꿔요.", "#rb-mem-tab-opt"),
    st("sliders", "기억 옵션", "사람다운 기억·감정 식기·거짓말 추적과, 응답마다 넣는 기억 양(토큰)을 바꿔요. 인물 위키 설정도 이 ‘설정’ 칸에 있어요.", "#rb-mem-tab-opt"),
    st("tools", "세부 기능", "프롬프트·임베딩(의미 검색)·고급도 ‘설정’ 칸에 있어요. 처음엔 하나도 안 만져도 돼요.", "#rb-mem-tab-opt"),
  ],
  "memory:detail": [
    st("character", "기억 구역", "인물·장면·기록 등 이 채팅에서 쌓인 기억을 구역별로 봐요. 인물을 누르면 위키가 열려요.", ".rb-mem-sectabs"),
    st("edit", "직접 고치기", "인물 위키의 칸은 눌러서 직접 고칠 수 있어요. AI로 빈칸 채우기·요약 정리도 있어요.", ".rb-mem-dgrid"),
  ],
  "memory:pot": [
    st("book", "인물 위키 상태", "인물 위키가 지금 어떻게 쌓이고 있는지 보여 줘요.", "#rb-pot-hero"),
    st("list", "탭", "개요(지금 기록·빈칸 채우기·캐릭터별 사용) → 설정(무엇을 기억할지·AI 모델) 순서예요. 익숙해지면 하나씩 열어 보세요.", "#rb-pot-tabs"),
  ],
  "memory:erosync": [
    st("shield", "Erosync", "인물 성향·목표를 읽어 다음 장면을 계획해 넣어요. 성인용이고 AI 호출이 늘어요. 켜기 전에 아래 비용 안내를 읽어 주세요.", "#rb-erosync"),
  ],
  relmap: [
    st("network", "관계도", "가운데가 나예요. 가까울수록 호감이 높고, 위에 있을수록 지금 중요한 인물이에요. 끌어서 돌리고, 두 손가락으로 확대해요.", ".rb-rm-stage"),
    st("sliders", "보기 바꾸기", "평면·입체, 약한 관계 숨기기, 소속별 보기를 골라요.", ".rb-rm-ctrls"),
    st("help", "읽는 법", "선 색·굵기가 무엇을 뜻하는지 여기서 볼 수 있어요.", ".rb-rm-help"),
    st("character", "인물 요약", "인물이나 선을 누르면 여기에 위키 요약이 나와요. 두 번 누르면 인물 위키로 가요.", ".rb-rm-panel"),
  ],
  protlink: [
    st("link", "링크 추가", "Proton Drive 공유 링크를 붙여 넣고, 어느 캐릭터·모듈·플러그인에 연결할지 골라요.", "#rb-protlink-head"),
    st("refresh", "새 파일 알림", "연결해 둔 링크에 새 파일이 올라오면 알려 주고, ‘받아서 업데이트’로 바로 넘겨요.", "#rb-protlink-body"),
    st("sliders", "확인 설정", "리스를 켤 때 자동으로 확인할지 정해요.", "#rb-pl-settings"),
  ],
  plugins: [
    st("plugin", "플러그인 목록", "설치한 플러그인을 묶음별로 보고 켜고 꺼요.", ".rb-plugins-body"),
    st("tools", "도구", "프리셋·백업·중복 정리 같은 도구는 여기 있어요.", ".rb-plug-tools"),
  ],
  cocoa: [
    st("sliders", "코코아 기능 켜기", "스킬 지침을 AI 호출에 붙일지 정해요. 꺼져 있으면 아무것도 붙지 않아요. 별도 AI 호출은 만들지 않아요.", '[data-tour="sk-toggle"]'),
    st("list", "사용할 스킬", "쓸 스킬 세트를 골라요. 고급 모드에서는 정리 노트·기록하기·기억 분석 중 어디에 붙일지도 정할 수 있어요.", '[data-tour="sk-stages"]'),
    st("upload", "스킬 세트", "코코아전트용 스킬 ZIP·JSON을 가져오고, 안의 파일을 고치고, 주입 미리보기로 확인해요.", '[data-tour="sk-lib"]'),
    st("refresh", "코코아전트에서 옮겨오기", "코코아전트를 쓰셨다면 ‘찾아보기’로 스킬과 설정을 그대로 옮겨 와요. 원본은 바뀌지 않아요.", '[data-tour="sk-cocoa"]'),
    st("tools", "웹 도구", "모델이 필요할 때 검색·페이지 읽기를 요청하게 해요. 기본은 꺼짐이고, 쓰면 AI 호출이 늘 수 있어요.", '[data-tour="sk-web"]'),
    st("history", "최근 호출 기록", "스킬 글이 실제로 붙었는지, 웹 도구가 쓰였는지 확인해요.", '[data-tour="sk-calls"]'),
  ],
  characters: [
    st("character", "개수", "정리된 캐릭터와 폴더의 개수예요.", ".rb-stats"),
    st("search", "검색", "이름이나 제작자로 캐릭터를 찾아요. 키보드 / 키로 바로 검색창이 열려요.", ".rb-search"),
    st("list", "캐릭터 목록", "폴더를 만들어 묶고, 줄을 끌어 옮겨요. 캐릭터를 누르면 에셋·로어북 편집 메뉴가 열려요.", ".rb-list"),
    st("check", "여러 개 고르기", "‘선택’을 누르면 여러 캐릭터를 한꺼번에 옮기거나 정리할 수 있어요.", "#rb-pick-toggle"),
  ],
  modules: [
    st("module", "개수", "가진 모듈과 안에 든 로어북·정규식·트리거·에셋의 개수예요.", ".rb-stats"),
    st("search", "검색", "모듈 이름이나 로어북 키워드로 찾아요.", ".rb-search"),
    st("list", "모듈 목록", "줄을 끌어 순서를 바꾸고, 오른쪽 스위치로 켜고 꺼요. 줄을 누르면 자세한 내용과 편집 버튼이 나와요.", ".rb-list"),
    st("check", "여러 개 고르기", "‘선택’을 누르면 여러 모듈을 한꺼번에 켜고 끄거나 연결할 수 있어요.", "#rb-pick-toggle"),
  ],
  cards: [
    st("character", "카드를 만들 봇", "먼저 카드를 만들 봇을 골라요. 그 봇에서 쌓은 기억이 카드의 재료가 돼요.", ".rb-cards2-pick"),
    st("sparkle", "카드 만들기", "봇을 고르면 이미 만든 카드가 보여요. ‘새 카드·새 봇 만들기’에서 인물과 범위를 고르고, 마음에 들면 새 봇으로 이어 가요.", ".rb-cards2 .rb-mem-root"),
  ],
  tools: [
    st("tools", "도구 모음", "자주 쓰는 도구와 확인·복구 도구로 나눠 두었어요. 줄을 누르면 그 도구가 열려요.", ".rb-toolgrp"),
    st("sparkle", "도움 주신 분들", "Dusk Atelier의 바탕이 된 기능들이에요.", ".rb-credits"),
  ],
  settings: [
    st("sliders", "화면 모드", "‘간단’은 꼭 필요한 것만, ‘고급’은 세부 설정까지 보여요. 처음엔 간단을 권해요.", ".rb-scard .has-seg"),
    st("palette", "꾸미기", "강조 색·밝기·글자 크기를 바꿔요. 누르면 바로 적용돼요.", ".rb-set-look"),
    st("download", "백업", "모듈·에셋·설정을 zip 한 파일로 저장해요. 큰 작업 전에 만들어 두면 안심이에요.", ".rb-set-fullbackup"),
    st("help", "처음 둘러보기", "앱 전체 안내를 다시 보고 싶을 때 눌러요.", ".rb-set-tour"),
  ],
};

export function screenTourKey(ctx) {
  const tab = ctx.state?.tab ?? "home", sub = ctx.state?.sub;
  if (tab === "memory") return `memory:${ctx.state?.mem?.page || "home"}`;
  return sub && SCREEN_TOURS[`${tab}:${sub}`] ? `${tab}:${sub}` : tab;
}
export function screenTourSteps(ctx) {
  const tab = ctx.state?.tab ?? "home", t = TABS.find((x) => x.id === tab) ?? TABS[0], defs = SCREEN_TOURS[screenTourKey(ctx)];
  const intro = { icon: t.icon, title: `${t.label}, 이렇게 써요`, text: t.desc };
  if (defs) return [intro, ...defs];
  // 정의가 없는 화면: 설명과 팁을 한 장에
  return [{ ...intro, text: [t.desc, ...(t.help ?? []).map((x) => `· ${x}`)].join("\n") }];
}
export function runScreenTour(ctx) {
  const t = TABS.find((x) => x.id === (ctx.state?.tab ?? "home")) ?? TABS[0];
  return runTour(ctx, screenTourSteps(ctx), { label: `${t.label} 설명`, doneLabel: "알겠어요", skipMissing: true });
}
