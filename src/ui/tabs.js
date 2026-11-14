// 탭 목록과 설명 문구 (홈 카드·위쪽 줄·도움말이 같이 쓴다). 화면 코드 없음.
// 메뉴 섹션: 기억 → 관리 → 작업실. 홈은 섹션 바깥에 둔다.
export var TABS = [
  { id: "home", label: "홈", icon: "home", group: "base", desc: "지금 열린 채팅의 상태를 보고, 하고 싶은 일을 골라요.", help: [] },
  { id: "memory-home", label: "개요", icon: "grid", mobileOnly: true, group: "more", section: "memory", desc: "기억 기능을 골라 열어요.", card: "장기 기억·기억 카드·코코아로 이동해요.", help: ["원하는 기억 기능을 눌러 바로 이동해요."] },
  {
    id: "memory", addon: "memory", label: "장기 기억", icon: "brain", group: "more", section: "memory",
    desc: "응답마다 인물별 기억을 쌓고, 필요할 때 꺼내 써요.",
    card: "응답마다 기억을 쌓고 필요할 때 꺼내 써요.",
    help: ["스위치만 켜면 바로 작동해요. ‘처음 설정하기’는 3단계로 끝나요.", "봇을 고르면 그 채팅에서 만든 기억이 인물별로 보여요.", "카드의 작은 ? 버튼에서 그 자리 설명과 ‘처음 설정 다시 보기’를 볼 수 있어요."]
  },
  {
    id: "relmap", addon: "memory", label: "인물 관계도", icon: "network", group: "more", section: "memory",
    desc: "{{user}}를 가운데 두고 인물들의 거리·관계를 한눈에 봐요.",
    card: "인물들의 거리·관계를 한눈에 봐요.",
    help: ["가까울수록 호감이 높고, 위에 있을수록 지금 중요한 인물이에요.", "인물이나 선을 누르면 오른쪽에 위키 요약이 나와요. 두 번 누르면 인물 위키로 가요.", "오른쪽 위 ? 버튼에서 읽는 법을 볼 수 있어요."]
  },
  {
    id: "cocoa", label: "코코아", icon: "sliders", group: "more", section: "memory",
    desc: "AI에게 줄 추가 지침(스킬)을 켜고, 코코아전트 스킬을 그대로 가져와요.",
    card: "스킬 지침을 켜고 코코아전트 스킬을 가져와요.",
    help: ["위쪽 스위치로 코코아 기능을 켜고 꺼요.", "스킬 ZIP·JSON을 가져오거나 새로 만들고, 목록에서 눌러 고쳐요.", "단계별 붙이기·웹 도구 같은 세부 설정은 고급 모드에서 보여요."]
  },
  {
    id: "cards", addon: "cards", label: "기억 카드", icon: "sparkle", group: "more", section: "memory",
    desc: "기억을 카드 한 장으로 만들고, 그 카드로 새 봇을 이어 가요.",
    card: "기억을 카드로 만들고 새 봇으로 이어 가요.",
    help: ["봇을 고르면 그 봇에서 만든 카드가 보여요.", "‘새 카드·새 봇 만들기’에서 인물과 범위를 골라요.", "카드 설정에서 태그와 기본 언어를 바꿀 수 있어요."]
  },
  { id: "manage-home", label: "개요", icon: "character", mobileOnly: true, group: "more", section: "manage", desc: "캐릭터·모듈·플러그인을 관리해요.", card: "관리 기능을 골라 열어요.", help: ["원하는 관리 기능을 눌러 바로 이동해요."] },
  {
    id: "characters", addon: "manage", label: "캐릭터", icon: "character", group: "more", section: "manage",
    desc: "캐릭터를 폴더로 정리하고 에셋·로어북을 다듬어요.",
    card: "캐릭터를 폴더로 정리하고 에셋·로어북을 다듬어요.",
    help: ["폴더를 만들어 캐릭터를 묶고, 줄을 끌어 옮겨요.", "캐릭터를 누르면 에셋 관리·편집 메뉴가 열려요.", "이름이나 제작자로 검색할 수 있어요."]
  },
  {
    id: "modules", addon: "manage", label: "모듈", icon: "module", group: "more", section: "manage",
    desc: "모듈을 켜고 끄고, 순서를 정하고, 로어북·정규식을 고쳐요.",
    card: "모듈을 켜고 끄고 순서를 정해요. 로어북·정규식도 여기서 고쳐요.",
    help: ["줄 어디를 잡아도 끌어서 순서를 바꿀 수 있어요.", "오른쪽 스위치로 모듈을 켜고 꺼요. 켜짐·꺼짐 글자로도 보여요.", "줄을 누르면 자세한 내용과 편집 버튼이 나와요.", "검색창에 모듈 이름이나 로어북 키워드를 넣어 찾아요."]
  },
  {
    id: "plugins", addon: "manage", label: "플러그인", icon: "plugin", group: "more", section: "manage",
    desc: "설치된 플러그인을 모아 보고 새 버전이 있는지 확인해요.",
    card: "플러그인을 모아 보고 업데이트를 확인해요.",
    help: ["플러그인마다 카테고리를 붙여 정리할 수 있어요.", "‘플러그인 만들기’에서 템플릿으로 내 플러그인을 시작해요.", "DA Interop으로 다른 플러그인과 설정을 주고받아요."]
  },
  {
    id: "protlink", addon: "protlink", label: "ProtLink+", icon: "link", group: "more", section: "manage",
    desc: "Proton Drive 링크를 캐릭터·모듈·플러그인에 연결해 두고, 새 파일이 올라오면 받아서 업데이트해요.",
    card: "Proton Drive 링크를 항목에 연결해 새 파일을 받아요.",
    help: ["링크를 붙여 넣으면 안의 파일을 확인하고, 어느 캐릭터·모듈·플러그인에 연결할지 물어봐요.", "연결하면 다음부터 새 파일이 올라올 때 알려 주고, 받으면 그 항목의 업데이트(영향 미리보기 → 백업 → 적용)로 넘어가요.", "플러그인은 리스가 목록을 바꾸지 못하게 막혀 있어서 파일로 저장돼요. 시작 확인은 이 화면 설정에서 끌 수 있고, 위젯 홈에도 ProtLink+ 위젯이 있어요."]
  },
  { id: "work-home", label: "개요", icon: "tools", mobileOnly: true, group: "more", section: "work", desc: "프로바이더·AI 봇 제작·도구·설정을 모았어요.", card: "작업실 기능을 골라 열어요.", help: ["원하는 작업 기능을 눌러 바로 이동해요."] },
  {
    id: "provider", addon: "provider", label: "프로바이더", icon: "network", group: "more", section: "work", exp: true,
    desc: "리스의 모델 목록에 Dusk를 더해요. 키·모델·용도별 설정을 한곳에서 관리해요.",
    card: "키·모델·용도별 설정을 한곳에서.",
    help: ["연결(키)과 프로필(모델·생각·캐시)을 만들면 리스 모델 목록에 ‘Dusk 자동’이 생겨요.", "키는 이 기기에만 저장돼요. 번역·감정·기억 등 용도마다 다른 프로필을 쓸 수 있어요."]
  },
  {
    id: "look", label: "플러그인 꾸미기", icon: "palette", group: "more", section: "work", hideWhenExp: true,
    desc: "색·밝기·글자 크기를 골라요. 바로 바뀌어요.",
    card: "색·밝기·글자 크기를 골라요.",
    help: ["누르면 바로 바뀌고 자동으로 저장돼요.", "‘고급 모드’에서 메뉴 위치·밀도·확대율을 더 바꿔요."]
  },
  {
    id: "stealth", addon: "stealth", label: "더스크 스텔스", icon: "palette", group: "more", section: "work",
    desc: "리스 채팅을 클로드·GPT 같은 다른 AI 앱처럼 꾸며요.",
    card: "리스를 다른 AI 앱처럼 꾸며요.",
    help: ["모양을 고르고 ‘켜기’를 누르면 리스 설정의 커스텀 CSS·채팅 HTML에 적용돼요.", "끄면 켜기 전 값으로 되돌려요."]
  },
  { id: "aibot", addon: "aibuild", label: "AI로 봇 만들기", icon: "sparkle", group: "more", section: "work", desc: "AI 제작 화면으로 새 봇을 만들어요.", card: "AI로 새 봇 만들기", help: ["새 봇을 만든 뒤 AI로 제작 화면을 열어요."] },
  { id: "personabuilder", addon: "aibuild", label: "AI로 페르소나 만들기", icon: "character", group: "more", section: "work", desc: "양식과 AI를 이용해 페르소나를 만들어요.", card: "AI로 페르소나 만들기", help: ["페르소나 양식을 고르고 AI로 전체 또는 일부 내용을 만들 수 있어요."] },
  {
    id: "tools", label: "도구", icon: "tools", group: "more", section: "work",
    desc: "프리셋·로어북 로그·용량 측정 같은 도구 모음이에요.",
    card: "프리셋·로어북 로그·용량 측정 같은 도구 모음.",
    help: ["줄을 누르면 그 도구가 열려요.", "돌아올 때는 위쪽 줄의 이름을 누르거나 ‘홈’을 눌러요."]
  },
  {
    id: "settings", label: "설정", icon: "sliders", group: "more", section: "work",
    desc: "화면 모드·테마·업데이트·백업을 한곳에서 바꿔요.",
    card: "화면 모드, 테마, 백업, 업데이트 설정.",
    help: ["‘화면 모드’에서 간단·고급을 골라요.", "바꾸면 바로 적용되고 자동으로 저장돼요.", "이럴 땐 여기로 — 색·글자 크기: 플러그인 꾸미기 · 모듈이 꼬였어요: 기록 · 되돌리기 · 다른 기기로 옮기기: 백업 만들기 · 새 봇 자동으로 잡기: 업데이트 설정", "세부 설정(이야기 도우미·로어북·정리)은 고급 모드에서 보여요."]
  },
  {
    id: "dev", label: "개발", icon: "code", group: "more", section: "work", dev: true,
    desc: "프로젝트 점검과 릴리즈를 돕는 개발자용 도구예요.",
    card: "프로젝트 점검과 릴리즈 도구 (개발자 모드).",
    help: ["설정 → 개발자 모드를 켠 사람에게만 보여요."]
  }
];
export var BASE_IDS = TABS.filter((t) => t.group === "base").map((t) => t.id);
export var SECTION_NAMES = { memory: "기억", manage: "관리", work: "작업실" };
export var SECTION_IDS = ["memory", "manage", "work"];
export var MORE_IDS = TABS.filter((t) => t.group === "more").map((t) => t.id);
export var SUBNAMES = {
  settings: { prompts: "기억·인물 위키 프롬프트", theme: "플러그인 꾸미기", updset: "업데이트 설정", cleanup: "설정 정리", history: "기록 · 되돌리기" },
  tools: { presets: "프리셋", chattheme: "채팅 테마 빌더", themebuilder: "테마 빌더", themestudio: "테마 스튜디오", lorelog: "로어북 로그", inspector: "검사기", history: "기록 · 되돌리기" },
  dev: { patchmaker: "패치 만들기" }
};
export var subLabel = (tab, sub) => sub ? SUBNAMES[tab]?.[sub] ?? null : null;
// 검색창이 있는 탭과 안내 문구
export var SEARCH = {
  home: "기능 찾기 (예: 생리, 호감, 테마, API)",
  modules: "모듈 이름, 로어북 키워드 검색",
  plugins: "플러그인 이름, 카테고리 검색",
  characters: "캐릭터 이름, 제작자 검색"
};

// Build trigger: UI relocation changes are already integrated in the v1.9.0 development branch.

// Build trigger: restore the requested v1.8.0 bundle version.

// 실험 기능(설정 → 실험 기능)에 따라 숨기는 탭: exp는 켜야 보이고, hideWhenExp는 켜면 다른 곳(도구)으로 옮겨진다.
// 애드온 탭(addon: "<서비스 이름>"): 그 애드온이 켜져 있을 때만 보인다. app.js가 setAddonCheck로 ctx.ext를 잇는다.
let addonOn = () => false;
export const setAddonCheck = (fn) => { addonOn = fn; };
export const tabHidden = (t, ui) => (!!t.exp && !ui?.experimental) || (!!t.hideWhenExp && !!ui?.experimental) || (!!t.addon && !addonOn(t.addon));
