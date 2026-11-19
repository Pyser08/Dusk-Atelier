// 기능 찾기(순수): "이 기능 어디 있지?"를 낱말로 찾는다. 홈 화면 검색창이 쓴다.
// 항목 하나 = { t: 이름, k: 찾을 때 쓰는 다른 말, path: 사람이 읽는 위치, tab, sub?, mem?: 장기 기억 안쪽 화면, find?: 그 화면에서 찾아 갈 제목 글, adv?: 고급 모드에서만 보임, addon?: 필요한 애드온 }
// 화면 이름이 바뀌면 여기 path·find도 같이 고친다(tests/featurefind.test.js가 모양을 검사).
const POT = { page: "pot", potTab: "settings" }, POTA = { page: "pot", potTab: "adv" }, MSET = { page: "home", memTab: "opt" };
const M = "장기 기억", P = "장기 기억 › 인물 위키 설정 › 설정", PA = "장기 기억 › 인물 위키 설정 › 고급", E = "장기 기억 › NSFW 설정";

export const FEATURES = [
  // 애드온(2.1.0, 홈)
  { t: "애드온 받기·켜고 끄기", k: "addon 확장 기능 받기 업데이트 카테고리", path: "홈 › 애드온", tab: "home", find: "애드온" },
  { t: "커스텀 애드온 불러오기·만들기", k: "커스텀 addon 직접 만들기 AI로 만들기 파일 불러오기 내보내기 공유 SDK", path: "홈 › 애드온 › 불러오기·만들기", tab: "home", find: "애드온" },
  // 장기 기억 — 무엇을 기억할까요
  { t: "추적 수준 (가볍게·기본·전부)", k: "기억 수준 프리셋 무엇을 기억 호출 비용", path: `${P} › 무엇을 기억할까요?`, tab: "memory", mem: POT, find: "무엇을 기억할까요?", addon: "memory" },
  { t: "호감 점수", k: "호감도 affinity 좋아하는 정도 숫자 표시 증가 승수 감소 승수", path: `${P} › 무엇을 기억할까요? › 호감`, tab: "memory", mem: POT, find: "호감", addon: "memory" },
  { t: "관계·호칭 · 말투 변화", k: "호칭 말투 반말 존댓말 register 다변화 조짐", path: `${P} › 무엇을 기억할까요? › 관계·호칭`, tab: "memory", mem: POT, find: "관계·호칭", addon: "memory" },
  { t: "인식 (정체·비밀을 얼마나 아는지)", k: "정체 비밀 인지 perception 라이트", path: `${P} › 무엇을 기억할까요? › 인식`, tab: "memory", mem: POT, find: "인식", addon: "memory" },
  { t: "의심", k: "suspicion 의심도", path: `${P} › 무엇을 기억할까요? › 의심`, tab: "memory", mem: POT, find: "의심", addon: "memory" },
  { t: "마음 열기", k: "openness 개방 마음", path: `${P} › 무엇을 기억할까요? › 마음 열기`, tab: "memory", mem: POT, find: "마음 열기", addon: "memory" },
  { t: "대화 리듬", k: "rhythm 말 속도 길이", path: `${P} › 무엇을 기억할까요? › 대화 리듬`, tab: "memory", mem: POT, find: "대화 리듬", addon: "memory" },
  // 성인 항목
  { t: "월경·임신 기록", k: "생리 주기 생리주기 임신 출산 배란 cycle 확률 배수 성인 nsfw", path: `${P} › 성인 항목`, tab: "memory", mem: POT, find: "성인 항목", addon: "memory" },
  { t: "욕구 기록 (성적 욕망·이상성향)", k: "성인 성욕 desire nsfw 이상성향 이상성욕 페티시 paraphilia 함께", path: `${P} › 성인 항목`, tab: "memory", mem: POT, find: "성인 항목", addon: "memory" },
  { t: "노골적인 묘사 수위", k: "취향 직설 순화 성인 nsfw 노골", path: `${P} › 성인 항목 (욕구 기록을 켜면 보여요)`, tab: "memory", mem: POT, find: "성인 항목", addon: "memory" },
  // 방식·모델
  { t: "기억 방식 (더 정확하게 / 빠르게)", k: "정확 빠르게 호출 수 속도 router keyword 관련 인물 찾기 장면 정리", path: `${P} › 기억 방식`, tab: "memory", mem: POT, find: "기억 방식", addon: "memory" },
  { t: "기억용 AI 모델 · 내 API 키", k: "보조 모델 api 키 공급자 openai claude gemini deepseek openrouter ollama 모델 이름 연결 시험 사용량 토큰", path: `${PA} › AI 모델`, tab: "memory", mem: POTA, find: "AI 모델", addon: "memory" },
  { t: "단계별 모델", k: "router director writer 단계 모델 따로", path: `${PA} › AI 모델 › 고급: 단계별 모델`, tab: "memory", mem: POTA, find: "고급: 단계별 모델", addon: "memory" },
  { t: "리수폿 데이터 가져오기", k: "risupot 백업 불러오기 import 이전", path: `${P} › 가져오기`, tab: "memory", mem: POT, find: "가져오기", addon: "memory" },
  // 고급
  { t: "인물 위키 고급 설정 (세부 기능 모두 보기)", k: "advanced 고급 모드 세부 설정 숨은 기능 인물 추적 저장 되돌리기", path: PA, tab: "memory", mem: POTA, addon: "memory" },
  { t: "서사관계 전용 모드 · 자동 기록 세부", k: "관계만 기록 사건 장면 장소 인지·정체 인식 relationship only 장면 정리 역할 최근 대화 턴", path: `${M} › 설정 › 자동 기록 세부`, tab: "memory", mem: MSET, find: "자동 기록 세부", addon: "memory" },
  { t: "자동 기록 입력 예산", k: "인물 위키 자동 기록 토큰 예산 writer input budget", path: `${M} › 설정 › 기억 옵션 › 자동 기록 입력 예산`, tab: "memory", mem: MSET, find: "자동 기록 입력 예산", addon: "memory" },
  { t: "관찰자 모드 · NPC끼리의 관계 기록", k: "observer 지켜보는 인물 기본 정보 자동 npc 감정", path: `${PA} › 무엇을 따라갈까요`, tab: "memory", mem: POTA, find: "무엇을 따라갈까요", addon: "memory" },
  { t: "실행 기록 (모델이 한 일 남기기)", k: "trace 로그 오류 디버그 inspector", path: `${PA} › 실행 기록`, tab: "memory", mem: POTA, find: "실행 기록", addon: "memory" },
  { t: "캐시 진단 (프롬프트 캐시가 깨지는 곳)", k: "cache 캐싱 프롬프트캐시 깨짐 비용 토큰 절약", path: `${PA} › 캐시 진단`, tab: "memory", mem: POTA, find: "캐시 진단", addon: "memory" },
  { t: "리스 기본 메모리 참고 (Hypa)", k: "hypa hypaplus 하이파 요약 supa", path: `${PA} › 리스 기본 메모리 참고 (Hypa)`, tab: "memory", mem: POTA, find: "리스 기본 메모리 참고", addon: "memory" },
  { t: "기억 설정 내보내기·가져오기", k: "설정 파일 백업 옮기기 export import", path: `${PA} › 설정 내보내기·가져오기`, tab: "memory", mem: POTA, find: "설정 내보내기·가져오기", addon: "memory" },
  // 장기 기억 홈
  { t: "지난 대화 분석", k: "백필 backfill 이전 대화 한꺼번에 분석 범위", path: `${M} › 지난 대화 분석`, tab: "memory", mem: { page: "home" }, find: "지난 대화", addon: "memory" },
  { t: "처음 등장 때 성인 항목 무작위로", k: "랜덤 무작위 성적 욕망 이상성향 이상성욕 후보 성적 관심 성적 항목 월경 처음 등장 random 취향 맛 커스텀 항목 분류", path: `${M} › 설정 › 기억 옵션`, tab: "memory", mem: MSET, find: "처음 등장 때 성인 항목 무작위로", addon: "memory" },
  { t: "게이지 배수 (오를 때 · 내릴 때)", k: "호감도 배수 감정 게이지 속도 올라가는 내려가는 배율 multiplier 성격 막대 소유욕 독점욕 달아오름 성욕 게이지 달아오르는 속도", path: `${M} › 설정 › 게이지 배수`, tab: "memory", mem: MSET, find: "게이지 배수", addon: "memory" },
  { t: "기억 넣기 토큰 · 남길 최근 턴", k: "주입 토큰 예산 inject 요약된 옛 대화 빼기 trim", path: `${M} › 설정 › 기억 옵션`, tab: "memory", mem: MSET, find: "기억 넣기", addon: "memory" },
  { t: "나에 대한 기억", k: "user 페르소나 내 정보 감정", path: `${M} › 나에 대한 기억`, tab: "memory", mem: { page: "me" }, addon: "memory" },
  { t: "장기 기억 옮기기 (파일로 내보내기·불러오기)", k: "장기 기억 백업 이사 옮기기 다른 기기 포켓바드 리스바드 새 폴더 내보내기 가져오기 불러오기 파일 export import 이전", path: `${M} › 채팅 고르기 › 기록 보기 › 더보기 › 장기 기억 파일로 내보내기`, tab: "memory", mem: { page: "home" }, addon: "memory" },
  { t: "다른 채팅의 기억 보기", k: "봇별 기억 채팅 목록 인물 위키", path: `${M} › 다른 채팅`, tab: "memory", mem: { page: "bots" }, addon: "memory" },
  // 2.2.4 기능 찾기 보강: 자주 찾는 기억 기능
  { t: "임베딩 (의미 검색)", k: "embedding 의미 검색 voyage 보야지 벡터 뜻 비슷한 기억 원문 회상 raw recall api 키", path: `${M} › 설정 › 임베딩`, tab: "memory", mem: MSET, find: "임베딩", addon: "memory" },
  { t: "원문 회상 (지난 대화 원문 조각)", k: "raw recall 원문 회상 지난 대화 정확한 날짜 사소한 사실 임베딩", path: `${M} › 설정 › 임베딩`, tab: "memory", mem: MSET, find: "임베딩", addon: "memory" },
  { t: "기억 토큰 절약", k: "토큰 절약 줄이기 비용 아끼기 saver 기억 양 예산", path: `${M} › 설정 › 기억 옵션`, tab: "memory", mem: MSET, find: "기억 토큰 절약", addon: "memory" },
  { t: "Jev 재정렬 (선택)", k: "jev 재정렬 rerank 고르기 모델 오픈라우터 vercel 버셀 ai gateway 공급자 토큰 절약 원문 회상", path: `${M} › 설정 › Jev 재정렬`, tab: "memory", mem: MSET, find: "Jev 재정렬", addon: "memory" },
  { t: "사람다운 기억", k: "관계 진도 호칭 말투 추억 human", path: `${M} › 설정 › 기억 옵션`, tab: "memory", mem: MSET, find: "사람다운 기억", addon: "memory" },
  { t: "감정이 시간이 지나면 식어요", k: "식음 냉각 cooling 적대 두려움 애정 감정 감소", path: `${M} › 설정 › 기억 옵션`, tab: "memory", mem: MSET, find: "감정이 시간이", addon: "memory" },
  { t: "거짓말·오해 추적", k: "거짓말 오해 믿음 belief 잘못 믿는", path: `${M} › 설정 › 기억 옵션`, tab: "memory", mem: MSET, find: "거짓말", addon: "memory" },
  { t: "요약된 옛 대화 빼고 보내기", k: "토큰 줄이기 trim 옛 대화 요약 하이파처럼 문맥 줄이기", path: `${M} › 설정 › 기억 옵션`, tab: "memory", mem: MSET, find: "요약된 옛 대화", addon: "memory" },
  { t: "지난 대화 분석에 함께 기록", k: "백필 backfill 인물 위키 함께 기본 성격 성인 프로필", path: `${M} › 설정 › 기억 옵션`, tab: "memory", mem: MSET, find: "지난 대화 분석에", addon: "memory" },
  { t: "지난 대화 분석 속도 (묶음 크기·동시 처리)", k: "백필 backfill 묶음 크기 동시 처리 병렬 빠르게 429", path: `${M} › 설정 › 기억 옵션`, tab: "memory", mem: MSET, find: "지난 대화 분석 속도", addon: "memory" },
  { t: "인물 위키 (인물·상황·시간선)", k: "인물 위키 wiki 문서 인물 정보 상황 시간선 타임라인 장면 기록 보기 성격 기본 성격 6축 호감 관계 진도 감정", path: `${M} › 채팅 고르기 › 기록 보기`, tab: "memory", mem: { page: "home" }, addon: "memory" },
  { t: "인물 관계도", k: "관계도 relationship map 관계 그래프 연결 누가 누구 남매 연인 애인 이전 턴 지난 턴 되돌려 보기", path: "장기 기억 › 인물 관계도", tab: "relmap", addon: "memory" },
  { t: "갈래 보기", k: "갈래 분기 브랜치 branch fork 복사한 채팅 갈라진 채팅 나무 다른 선택 비교 호감 비교", path: "장기 기억 › 갈래 보기", tab: "branches", addon: "memory" },
  { t: "같은 인물 합치기 · 위키 점검", k: "합치기 중복 같은 이름 별칭 merge 되돌리기 위키 점검 문서 이름 맞추기 빈 문서", path: `${M} › 인물 › 더보기`, tab: "memory", mem: { page: "home" }, addon: "memory" },
  // 설정·도구
  { t: "캐시 배치 (하이파 분리·이어붙이기)", k: "cache 캐시 하이파 hypa 연관 랜덤 이어붙이기 로어북 제미나이 gemini", path: "작업실 › 프로바이더 › 캐시 배치", tab: "provider" },
  { t: "기억·인물 위키 프롬프트", k: "기본 프롬프트 지침 수정", path: "설정 › 기억·인물 위키 프롬프트", tab: "settings", sub: "prompts" },
  { t: "플러그인 꾸미기 (색·테마)", k: "색 테마 다크 라이트 모양 글꼴", path: "설정 › 플러그인 꾸미기", tab: "settings", sub: "theme" },
  { t: "업데이트 설정", k: "자동 업데이트 버전 알림", path: "설정 › 업데이트 설정", tab: "settings", sub: "updset" },
  { t: "다른 플러그인의 Dusk 기능 허용", k: "DA Interop 연동 허용 취소 막기 createDuskClient 플러그인 권한 위키 기억 접근", path: "플러그인 › 연동 설정 › Dusk 기능 허용", tab: "plugins", sub: "interop", find: "Dusk 기능 허용", addon: "manage" },
  { t: "설정 정리", k: "초기화 지우기 저장소 청소", path: "설정 › 설정 정리", tab: "settings", sub: "cleanup" },
  { t: "기록 · 되돌리기", k: "undo 실행 취소 이력 복구", path: "설정 › 기록 · 되돌리기", tab: "settings", sub: "history" },
  { t: "프리셋", k: "모듈 프리셋 묶음 저장", path: "도구 › 프리셋", tab: "tools", sub: "presets" },
  { t: "채팅 테마 빌더 · 테마 스튜디오", k: "채팅 모양 css 테마 만들기", path: "도구 › 채팅 테마 빌더", tab: "tools", sub: "chattheme" },
  { t: "로어북 로그", k: "로어북 발동 기록 왜 켜졌나", path: "도구 › 로어북 로그", tab: "tools", sub: "lorelog" },
  { t: "검사기", k: "inspector 요청 내용 보기 프롬프트 확인", path: "도구 › 검사기", tab: "tools", sub: "inspector" },
];

const norm = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/[\s·\-_/()]+/g, "");
// 2.2.4 초성 검색: "ㅇㅂㄷ" → 임베딩. 조합 중인 끝 글자("이" → 임)도 맞게, 마지막 음절은 초성+중성까지만 비교한다
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const choOf = (s) => [...s].map((c) => { const n = c.charCodeAt(0) - 0xac00; return n >= 0 && n < 11172 ? CHO[Math.floor(n / 588)] : c; }).join("");
const isCho = (w) => /^[ㄱ-ㅎ]+$/.test(w);
const openSyl = (c) => { const n = c.charCodeAt(0) - 0xac00; return n >= 0 && n < 11172 && n % 28 === 0; };   // 받침 없는 음절(뒤에 받침이 붙을 수 있음)
function hit(text, w) {
  w = w.replace(/[\u1100-\u1112]/g, (c) => CHO[c.charCodeAt(0) - 0x1100]);   // NFKC가 바꾼 초성(ᄋ)을 다시 ㅇ으로
  if (text.includes(w)) return true;
  if (isCho(w)) return choOf(text).includes(w);
  const last = w.at(-1);
  if (w.length >= 1 && openSyl(last)) {   // "이" → "임"·"인"… : 앞부분은 그대로, 끝 음절은 받침 무시
    const head = w.slice(0, -1), base = last.charCodeAt(0);
    for (let i = text.indexOf(head); i >= 0 && i + head.length < text.length; i = text.indexOf(head, i + 1)) {
      const c = text.charCodeAt(i + head.length) - base;
      if (c >= 0 && c < 28) return true;
    }
  }
  return false;
}
const words = (q) => String(q ?? "").normalize("NFKC").toLowerCase().split(/[\s,]+/).map((w) => w.replace(/[·\-_/()]+/g, "")).filter(Boolean);

// q의 모든 낱말이 이름·다른 말·위치 어딘가에 들어 있는 항목. 이름에 든 것이 먼저, 그다음 다른 말, 위치 순.
// opts.has(addonId): 그 애드온이 켜져 있는지(없으면 전부 보임). 꺼진 애드온의 기능은 off:true로 표시해 맨 뒤에 둔다.
export function findFeatures(q, list = FEATURES, { has = null, limit = 20 } = {}) {
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
      else if (hit(t, w)) score += 3;
      else if (hit(k, w)) score += 1.5;
      else if (hit(p, w)) score += 0.5;
      else { ok = false; break; }
    }
    if (!ok) continue;
    const off = !!(f.addon && has && !has(f.addon));
    out.push({ ...f, score: score - (off ? 100 : 0), off });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
