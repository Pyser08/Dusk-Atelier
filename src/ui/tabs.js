// 탭 목록과 설명 문구 (홈 카드·위쪽 줄·도움말이 같이 쓴다). 화면 코드 없음.
// 1.7.0 메뉴: 기본 4개(홈·기억·리수폿·인물) + 더보기 묶음(group:"more"). 모바일 아래 탭바는 기본 4개 + 더보기.
export var TABS = [
  { id: "home", label: "홈", icon: "home", group: "base", desc: "지금 열린 채팅의 상태를 보고, 하고 싶은 일을 골라요.", help: [] },
  {
    id: "memory", label: "기억", icon: "brain", group: "base",
    desc: "응답마다 인물별 기억을 쌓고, 필요할 때 꺼내 써요.",
    card: "응답마다 기억을 쌓고 필요할 때 꺼내 써요.",
    help: ["스위치만 켜면 바로 작동해요. ‘처음 설정하기’는 3단계로 끝나요.", "봇을 고르면 그 채팅에서 만든 기억이 인물별로 보여요.", "카드의 작은 ? 버튼에서 그 자리 설명과 ‘처음 설정 다시 보기’를 볼 수 있어요."]
  },
  {
    id: "pot", label: "리수폿", icon: "book", group: "base",
    desc: "인물 위키를 자동으로 정리해요. 기억과 따로 켜고 꺼요.",
    card: "인물 위키를 자동으로 정리해요.",
    help: ["기억과 별도로 켜고 꺼요.", "‘위키 보기’에서 정리된 문서를 볼 수 있어요."]
  },
  {
    id: "people", label: "인물", icon: "users", group: "base",
    desc: "위키의 인물 문서를 보고 다듬어요.",
    card: "인물 문서를 보고 다듬어요.",
    help: ["인물을 누르면 지금 상태와 최근 기록이 보여요.", "직접 고친 내용은 AI가 함부로 바꾸지 않아요."]
  },
  {
    id: "characters", label: "캐릭터", icon: "character", group: "more",
    desc: "캐릭터를 폴더로 정리하고 에셋·로어북을 다듬어요.",
    card: "캐릭터를 폴더로 정리하고 에셋·로어북을 다듬어요.",
    help: ["폴더를 만들어 캐릭터를 묶고, 줄을 끌어 옮겨요.", "캐릭터를 누르면 에셋 관리·편집 메뉴가 열려요.", "이름이나 제작자로 검색할 수 있어요."]
  },
  {
    id: "modules", label: "모듈", icon: "module", group: "more",
    desc: "모듈을 켜고 끄고, 순서를 정하고, 로어북·정규식을 고쳐요.",
    card: "모듈을 켜고 끄고 순서를 정해요. 로어북·정규식도 여기서 고쳐요.",
    help: ["줄 어디를 잡아도 끌어서 순서를 바꿀 수 있어요.", "오른쪽 스위치로 모듈을 켜고 꺼요. 켜짐·꺼짐 글자로도 보여요.", "줄을 누르면 자세한 내용과 편집 버튼이 나와요.", "검색창에 모듈 이름이나 로어북 키워드를 넣어 찾아요."]
  },
  {
    id: "cards", label: "기억 카드", icon: "sparkle", group: "more",
    desc: "기억을 카드 한 장으로 만들고, 그 카드로 새 봇을 이어 가요.",
    card: "기억을 카드로 만들고 새 봇으로 이어 가요.",
    help: ["봇을 고르면 그 봇에서 만든 카드가 보여요.", "‘새 카드·새 봇 만들기’에서 인물과 범위를 골라요.", "카드 설정에서 태그와 기본 언어를 바꿀 수 있어요."]
  },
  {
    id: "look", label: "꾸미기", icon: "palette", group: "more",
    desc: "색·밝기·글자 크기를 골라요. 바로 바뀌어요.",
    card: "색·밝기·글자 크기를 골라요.",
    help: ["누르면 바로 바뀌고 자동으로 저장돼요.", "‘고급 모드’에서 메뉴 위치·밀도·확대율을 더 바꿔요."]
  },
  {
    id: "tools", label: "도구", icon: "tools", group: "more",
    desc: "프리셋·채팅 테마 빌더·로어북 로그 같은 도구 모음이에요.",
    card: "프리셋·채팅 테마 빌더·로어북 로그 같은 도구 모음.",
    help: ["타일을 누르면 그 도구가 열려요.", "돌아올 때는 위쪽 줄의 이름을 누르거나 ‘홈’을 눌러요."]
  },
  {
    id: "plugins", label: "플러그인", icon: "plugin", group: "more",
    desc: "설치된 플러그인을 모아 보고 새 버전이 있는지 확인해요.",
    card: "플러그인을 모아 보고 업데이트를 확인해요.",
    help: ["플러그인마다 카테고리를 붙여 정리할 수 있어요.", "‘플러그인 만들기’에서 템플릿으로 내 플러그인을 시작해요.", "DA Interop으로 다른 플러그인과 설정을 주고받아요."]
  },
  {
    id: "settings", label: "설정", icon: "sliders", group: "more",
    desc: "화면 모드·테마·업데이트·백업을 한곳에서 바꿔요.",
    card: "화면 모드, 테마, 백업, 업데이트 설정.",
    help: ["‘화면 모드’에서 간단·고급을 골라요.", "바꾸면 바로 적용되고 자동으로 저장돼요."]
  },
  {
    id: "dev", label: "개발", icon: "code", group: "more", dev: true,
    desc: "프로젝트 점검과 릴리즈를 돕는 개발자용 도구예요.",
    card: "프로젝트 점검과 릴리즈 도구 (개발자 모드).",
    help: ["설정 → 개발자 모드를 켠 사람에게만 보여요."]
  }
];
export var BASE_IDS = TABS.filter((t) => t.group === "base").map((t) => t.id);
export var MORE_IDS = TABS.filter((t) => t.group === "more").map((t) => t.id);
export var SUBNAMES = {
  settings: { prompts: "기억·리수폿 프롬프트", theme: "플러그인 꾸미기", updset: "업데이트 설정", cleanup: "설정 정리", history: "기록 · 되돌리기" },
  tools: { presets: "프리셋", chattheme: "채팅 테마 빌더", themebuilder: "테마 빌더", themestudio: "테마 스튜디오", lorelog: "로어북 로그", inspector: "검사기", history: "기록 · 되돌리기" },
  dev: { patchmaker: "패치 만들기" }
};
export var subLabel = (tab, sub) => sub ? SUBNAMES[tab]?.[sub] ?? null : null;
// 검색창이 있는 탭과 안내 문구
export var SEARCH = {
  modules: "모듈 이름, 로어북 키워드 검색",
  plugins: "플러그인 이름, 카테고리 검색",
  characters: "캐릭터 이름, 제작자 검색"
};
