// 기능 찾기(순수): "이 기능 어디 있지?"를 낱말로 찾는다. 홈 화면 검색창이 쓴다.
// 항목 하나 = { t: 이름, k: 찾을 때 쓰는 다른 말, path: 사람이 읽는 위치, tab, sub?, mem?: 장기 기억 안쪽 화면, find?: 그 화면에서 찾아 갈 제목 글, adv?: 고급 모드에서만 보임, addon?: 필요한 애드온 }
// 화면 이름이 바뀌면 여기 path·find도 같이 고친다(tests/featurefind.test.js가 모양을 검사).
const POT = { page: "pot", potTab: "settings" };
const ero = (eroTab) => ({ page: "erosync", eroTab });
const M = "장기 기억", P = "장기 기억 › 리수폿 › 설정", E = "장기 기억 › Erosync";

export const FEATURES = [
  // 애드온(2.1.0, 홈)
  { t: "애드온 받기·켜고 끄기", k: "addon 확장 기능 받기 업데이트 카테고리", path: "홈 › 애드온", tab: "home", find: "애드온" },
  { t: "커스텀 애드온 불러오기·만들기", k: "커스텀 addon 직접 만들기 AI로 만들기 파일 불러오기 내보내기 공유 SDK", path: "홈 › 애드온 › 불러오기·만들기", tab: "home", find: "커스텀 애드온" },
  // 장기 기억 — 무엇을 기억할까요
  { t: "추적 수준 (가볍게·기본·전부)", k: "기억 수준 프리셋 무엇을 기억 호출 비용", path: `${P} › 무엇을 기억할까요?`, tab: "memory", mem: POT, find: "무엇을 기억할까요?", addon: "memory" },
  { t: "호감 점수", k: "호감도 affinity 좋아하는 정도 숫자 표시 증가 승수 감소 승수", path: `${P} › 무엇을 기억할까요? › 호감`, tab: "memory", mem: POT, find: "호감", addon: "memory" },
  { t: "관계·호칭 · 말투 변화", k: "호칭 말투 반말 존댓말 register 다변화 조짐", path: `${P} › 무엇을 기억할까요? › 관계·호칭`, tab: "memory", mem: POT, find: "관계·호칭", addon: "memory" },
  { t: "인식 (정체·비밀을 얼마나 아는지)", k: "정체 비밀 인지 perception 라이트", path: `${P} › 무엇을 기억할까요? › 인식`, tab: "memory", mem: POT, find: "인식", addon: "memory" },
  { t: "의심", k: "suspicion 의심도", path: `${P} › 무엇을 기억할까요? › 의심`, tab: "memory", mem: POT, find: "의심", addon: "memory" },
  { t: "마음 열기", k: "openness 개방 마음", path: `${P} › 무엇을 기억할까요? › 마음 열기`, tab: "memory", mem: POT, find: "마음 열기", addon: "memory" },
  { t: "대화 리듬", k: "rhythm 말 속도 길이", path: `${P} › 무엇을 기억할까요? › 대화 리듬`, tab: "memory", mem: POT, find: "대화 리듬", addon: "memory" },
  // 성인 항목
  { t: "월경·임신 기록", k: "생리 주기 생리주기 임신 출산 배란 cycle 확률 배수", path: `${P} › 성인 항목`, tab: "memory", mem: POT, find: "성인 항목", addon: "memory" },
  { t: "욕구 기록", k: "성인 성욕 desire nsfw", path: `${P} › 성인 항목`, tab: "memory", mem: POT, find: "성인 항목", addon: "memory" },
  { t: "이상성향 기록 · 노골적인 묘사 수위", k: "취향 페티시 paraphilia 직설 순화 성인", path: `${P} › 성인 항목 (욕구 기록을 켜면 보여요)`, tab: "memory", mem: POT, find: "성인 항목", addon: "memory" },
  // 방식·모델
  { t: "기억 방식 (더 정확하게 / 빠르게)", k: "정확 빠르게 호출 수 속도 router keyword 관련 인물 찾기 장면 정리", path: `${P} › 기억 방식`, tab: "memory", mem: POT, find: "기억 방식", addon: "memory" },
  { t: "기억용 AI 모델 · 내 API 키", k: "보조 모델 api 키 공급자 openai claude gemini deepseek openrouter ollama 모델 이름 연결 시험 사용량 토큰", path: `${P} › AI 모델`, tab: "memory", mem: POT, find: "AI 모델", addon: "memory" },
  { t: "단계별 모델", k: "router director writer 단계 모델 따로", path: `${P} › AI 모델 › 고급: 단계별 모델`, tab: "memory", mem: POT, find: "고급: 단계별 모델", addon: "memory" },
  { t: "리수폿 데이터 가져오기", k: "risupot 백업 불러오기 import 이전", path: `${P} › 가져오기`, tab: "memory", mem: POT, find: "가져오기", addon: "memory" },
  // 고급
  { t: "고급 모드 (세부 기능 모두 보기)", k: "advanced 세부 설정 숨은 기능", path: `${P} › 고급 모드`, tab: "memory", mem: POT, find: "고급 모드", addon: "memory" },
  { t: "서사관계 전용 모드", k: "관계만 기록 사건 장면 장소 인지·정체 인식 relationship only", path: `${P} › 자동 기록 세부`, tab: "memory", mem: POT, find: "자동 기록 세부", adv: true, addon: "memory" },
  { t: "관찰자 모드 · NPC끼리의 관계 기록", k: "observer 지켜보는 인물 기본 정보 자동 npc 감정", path: `${P} › 무엇을 따라갈까요`, tab: "memory", mem: POT, find: "무엇을 따라갈까요", adv: true, addon: "memory" },
  { t: "실행 기록 (모델이 한 일 남기기)", k: "trace 로그 오류 디버그 inspector", path: `${P} › 실행 기록`, tab: "memory", mem: POT, find: "실행 기록", adv: true, addon: "memory" },
  { t: "리스 기본 메모리 참고 (Hypa)", k: "hypa hypaplus 하이파 요약 supa", path: `${P} › 리스 기본 메모리 참고 (Hypa)`, tab: "memory", mem: POT, find: "리스 기본 메모리 참고", adv: true, addon: "memory" },
  { t: "기억 설정 내보내기·가져오기", k: "설정 파일 백업 옮기기 export import", path: `${P} › 설정 내보내기·가져오기`, tab: "memory", mem: POT, find: "설정 내보내기·가져오기", adv: true, addon: "memory" },
  // 장기 기억 홈
  { t: "지난 대화 분석", k: "백필 backfill 이전 대화 한꺼번에 분석 범위", path: `${M} › 지난 대화 분석`, tab: "memory", mem: { page: "home" }, find: "지난 대화", addon: "memory" },
  { t: "기억 넣기 토큰 · 남길 최근 턴", k: "주입 토큰 예산 inject 요약된 옛 대화 빼기 trim", path: `${M} › 기억 옵션`, tab: "memory", mem: { page: "home" }, find: "기억 넣기", addon: "memory" },
  { t: "나에 대한 기억", k: "user 페르소나 내 정보 감정", path: `${M} › 나에 대한 기억`, tab: "memory", mem: { page: "me" }, addon: "memory" },
  { t: "다른 채팅의 기억 보기", k: "봇별 기억 채팅 목록 인물 위키", path: `${M} › 다른 채팅`, tab: "memory", mem: { page: "bots" }, addon: "memory" },
  // Erosync
  { t: "Erosync 인물 분석 (전체 · 골라서)", k: "nsfw 성향 분석 캐릭터 분석 인물 선택 로어북 골라", path: `${E} › 분석`, tab: "memory", mem: ero("ana"), find: "인물 분석", addon: "erosync" },
  { t: "Erosync 수위 · 집착 방지 · 프리셋", k: "nsfw 수위 상한 극단 집착 obsession", path: `${E} › 수위`, tab: "memory", mem: ero("safety"), addon: "erosync" },
  { t: "Erosync 동작 (장면 빈도·자율성)", k: "nsfw 빈도 끈기 읽는 범위 마지막 장면 되돌리기", path: `${E} › 동작`, tab: "memory", mem: ero("act"), addon: "erosync" },
  { t: "Erosync 검토 (성향 변화 후보)", k: "후보 반영 검토", path: `${E} › 검토`, tab: "memory", mem: ero("review"), addon: "erosync" },
  { t: "Erosync 프롬프트 · 비하인드 · 데이터", k: "지시문 뒷이야기 내보내기", path: `${E} › 프롬프트 / 비하인드 / 데이터`, tab: "memory", mem: ero("prompt"), addon: "erosync" },
  // 설정·도구
  { t: "기억·리수폿 프롬프트", k: "기본 프롬프트 지침 수정", path: "설정 › 기억·리수폿 프롬프트", tab: "settings", sub: "prompts" },
  { t: "플러그인 꾸미기 (색·테마)", k: "색 테마 다크 라이트 모양 글꼴", path: "설정 › 플러그인 꾸미기", tab: "settings", sub: "theme" },
  { t: "업데이트 설정", k: "자동 업데이트 버전 알림", path: "설정 › 업데이트 설정", tab: "settings", sub: "updset" },
  { t: "설정 정리", k: "초기화 지우기 저장소 청소", path: "설정 › 설정 정리", tab: "settings", sub: "cleanup" },
  { t: "기록 · 되돌리기", k: "undo 실행 취소 이력 복구", path: "설정 › 기록 · 되돌리기", tab: "settings", sub: "history" },
  { t: "프리셋", k: "모듈 프리셋 묶음 저장", path: "도구 › 프리셋", tab: "tools", sub: "presets" },
  { t: "채팅 테마 빌더 · 테마 스튜디오", k: "채팅 모양 css 테마 만들기", path: "도구 › 채팅 테마 빌더", tab: "tools", sub: "chattheme" },
  { t: "로어북 로그", k: "로어북 발동 기록 왜 켜졌나", path: "도구 › 로어북 로그", tab: "tools", sub: "lorelog" },
  { t: "검사기", k: "inspector 요청 내용 보기 프롬프트 확인", path: "도구 › 검사기", tab: "tools", sub: "inspector" },
];

const norm = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/[\s·\-_/()]+/g, "");
const words = (q) => String(q ?? "").normalize("NFKC").toLowerCase().split(/[\s,]+/).map((w) => w.replace(/[·\-_/()]+/g, "")).filter(Boolean);

// q의 모든 낱말이 이름·다른 말·위치 어딘가에 들어 있는 항목. 이름에 든 것이 먼저, 그다음 다른 말, 위치 순.
// opts.has(addonId): 그 애드온이 켜져 있는지(없으면 전부 보임). 꺼진 애드온의 기능은 off:true로 표시해 맨 뒤에 둔다.
export function findFeatures(q, list = FEATURES, { has = null, limit = 12 } = {}) {
  const ws = words(q);
  if (!ws.length) return [];
  const out = [];
  for (const f of list) {
    const t = norm(f.t), k = norm(f.k), p = norm(f.path);
    let score = 0, ok = true;
    for (const w of ws) {
      if (t.includes(w)) score += t.startsWith(w) ? 5 : 4;
      else if (k.includes(w)) score += 2;
      else if (p.includes(w)) score += 1;
      else { ok = false; break; }
    }
    if (!ok) continue;
    const off = !!(f.addon && has && !has(f.addon));
    out.push({ ...f, score: score - (off ? 100 : 0), off });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
