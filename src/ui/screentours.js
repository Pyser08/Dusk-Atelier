// 화면별 둘러보기 (v1.8.1): ? 버튼과 각 화면의 '둘러보기' 버튼이 같은 하이라이트 방식(처음 둘러보기)으로 지금 화면을 짚어 준다.
// 목표가 지금 화면에 없으면(예: 모바일에서 안 보이는 칸) 그 단계는 건너뛰고, 정의가 없는 화면은 설명+팁을 한 장으로 보여 준다.
import { TABS } from "./tabs.js";
import { runTour } from "./tour.js";

const st = (icon, title, text, ...target) => ({ icon, title, text, target });

// 키: 탭 id · `탭:하위` · `memory:페이지`. 첫 안내(화면 설명)는 자동으로 앞에 붙는다.
export const SCREEN_TOURS = {
  home: [
    st("brain", "지금 상태", "지금 열린 채팅의 장기 기억 상태예요. 켜져 있는지, 기록이 쌓이고 있는지 보여 줘요.", ".rb-hstats"),
    st("upload", "바로가기", "하고 싶은 일을 골라요. ‘가져오기’는 봇·모듈 파일을 불러오고, 기억·관리·작업실은 기능을 모아 둔 곳이에요.", ".rb-hdo"),
    st("history", "최근 기록", "최근에 쌓인 인물 기록이에요. 누가 무엇을 했는지 한눈에 볼 수 있어요.", ".rb-hrecent"),
    st("help", "처음 둘러보기", "전체 안내를 다시 보고 싶으면 여기를 눌러요. 설정에서도 볼 수 있어요.", "#rb-home-tour"),
    st("help", "? 버튼", "어느 화면에서든 이 ? 버튼을 누르면 그 화면을 이렇게 하나씩 짚어 드려요.", "#rb-help-btn"),
  ],
  "memory:home": [
    st("brain", "기억 상태", "기억이 켜져 있는지 보여 줘요. 꺼져 있으면 ‘켜기’ 한 번이면 시작돼요. ‘인물 Wiki’에서 쌓인 기록을 볼 수 있어요.", ".rb-mem-status-row"),
    st("sparkle", "쌓인 기록", "지금까지 쌓인 기록의 종류와 개수예요.", ".rb-mem-usage"),
    st("sliders", "할 수 있는 일", "지난 대화를 한꺼번에 분석하거나, 기록을 보거나, 다른 채팅으로 옮겨 가요.", ".rb-actions"),
    st("history", "최근 기록", "방금 쌓인 기록이에요. ‘전체 보기’로 모두 볼 수 있어요.", ".rb-mem-recentbox"),
    st("tools", "세부 기능", "프롬프트·임베딩(의미 검색)·스킬 같은 기능은 여기서 열어요. 처음엔 하나도 안 만져도 돼요.", ".rb-mem-integrated-settings"),
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
    st("tools", "도구 모음", "타일을 누르면 그 도구가 열려요. 돌아올 때는 위쪽 줄의 이름이나 ‘홈’을 눌러요.", ".rb-tgrid"),
    st("sparkle", "고마운 분들", "Dusk Atelier의 바탕이 된 분들이에요. 원문 글 링크로 가 볼 수 있어요.", ".rb-credits", ".rb-thanks"),
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
