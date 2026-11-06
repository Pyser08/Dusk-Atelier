// 기능 맛보기(2.0.0, 순수): 처음엔 딸깍으로 쓰다가, 쓰는 만큼 다음 기능을 하나씩 권한다.
// 한 번에 하나만, 조건이 맞은 것 중 앞의 것부터. 해 봤거나(seen) '그만'(off) 하면 다시 안 권하고, '나중에'는 하루 쉰다.
// 상태 s: { opens, records, wikiDocs, hasChat, addons:Set, visited:Set(탭·페이지), advanced, potOn, erosyncOn }
export const DISCOVER = [
  { id: "manage", icon: "character", title: "캐릭터·모듈 정리하기", text: "캐릭터를 폴더로 묶고, 모듈을 켜고 끄고 연결하는 관리 화면이에요. 봇이 많아지면 편해요.",
    when: (s) => s.opens >= 2, needs: "manage", go: { tab: "characters" }, done: (s) => s.visited.has("characters") || s.visited.has("modules") },
  { id: "memory-on", icon: "brain", title: "장기 기억 켜 보기", text: "켜 두기만 하면 인물마다 있었던 일을 기억해서 다음 응답에 넣어 줘요. 처음엔 이것 하나면 충분해요.",
    when: (s) => s.addons.has("memory") && !s.memoryOn, go: { tab: "memory" } },
  { id: "wiki", icon: "character", title: "인물 위키 열어 보기", text: "대화에서 쌓인 인물의 성격·관계·최근 일을 정리해 둔 곳이에요. 직접 고칠 수도 있어요.",
    when: (s) => s.addons.has("memory") && s.records >= 3, go: { tab: "memory", page: "detail" }, done: (s) => s.visited.has("memory:detail") },
  { id: "relmap", icon: "network", title: "인물 관계도 보기", text: "나를 가운데 두고 인물들이 얼마나 가까운지 한눈에 보여 줘요.",
    when: (s) => s.addons.has("memory") && s.wikiDocs >= 2, go: { tab: "relmap" }, done: (s) => s.visited.has("relmap") },
  { id: "analyze", icon: "sparkle", title: "지난 대화 분석", text: "기억을 켜기 전에 나눈 대화도 한꺼번에 읽어서 기억으로 만들 수 있어요. 장기 기억 홈의 큰 버튼이에요.",
    when: (s) => s.addons.has("memory") && s.memoryOn && s.hasChat && s.opens >= 3, go: { tab: "memory" } },
  { id: "pot", icon: "book", title: "리수폿 설정 둘러보기", text: "무엇을 얼마나 자세히 기억할지, 어떤 AI에게 맡길지 정해요. 기본값 그대로도 괜찮아요.",
    when: (s) => s.addons.has("memory") && s.wikiDocs >= 1 && s.opens >= 4, go: { tab: "memory", page: "pot" }, done: (s) => s.visited.has("memory:pot") },
  { id: "story", icon: "sliders", title: "이야기 도우미", text: "공정한 전개·유저 편향 없애기·이야기 시간 — 이야기가 내 뜻대로만 흐르지 않게 도와줘요. 홈에서 바로 켜고 꺼요.",
    when: (s) => s.opens >= 5, go: { tab: "home" } },
  { id: "cards", icon: "sparkle", title: "기억 카드 만들기", text: "쌓인 기억을 카드 한 장으로 꾸며 두고, 그 카드로 새 봇을 이어 갈 수 있어요.",
    when: (s) => s.records >= 15, needs: "cards", go: { tab: "cards" }, done: (s) => s.visited.has("cards") },
  { id: "regress", icon: "history", title: "회귀 · 이어서 하기", text: "고른 인물만 기억을 안고 처음부터 다시 시작하거나, 긴 대화를 기억만 들고 새 채팅에서 이어 가요. 채팅 입력창 옆 메뉴의 ⏳에서 열어요.",
    when: (s) => s.addons.has("memory") && s.records >= 30, go: { tab: "memory" } },
  { id: "advanced", icon: "tools", title: "고급 모드", text: "세부 설정과 개발 도구까지 모두 보여요. 기능에 익숙해졌다면 설정 → 화면 모드에서 켜 보세요.",
    when: (s) => !s.advanced && s.opens >= 10, go: { tab: "settings" } },
  { id: "erosync", icon: "shield", title: "Erosync (성인용)", text: "인물 성향·목표를 읽어 다음 장면을 계획해 넣어요. 성인용이고 AI 호출이 늘어요.",
    when: (s) => s.records >= 20 && s.opens >= 8, needs: "erosync", go: { tab: "memory", page: "erosync" }, done: (s) => s.visited.has("memory:erosync") },
  { id: "protlink", icon: "link", title: "ProtLink+로 업데이트 받기", text: "제작자가 Proton Drive에 올린 새 버전을 알려 주고 받아서 업데이트로 넘겨요.",
    when: (s) => s.opens >= 12, needs: "protlink", go: { tab: "protlink" }, done: (s) => s.visited.has("protlink") }
];

export const SNOOZE_MS = 24 * 3600 * 1000;
// 다음에 권할 것 하나(없으면 null). st: { seen:[], off, snoozeUntil }
export function pickDiscover(s, st = {}, now = Date.now()) {
  if (st.off || (st.snoozeUntil ?? 0) > now) return null;
  const seen = new Set(st.seen ?? []);
  for (const f of DISCOVER) {
    if (seen.has(f.id)) continue;
    if (f.done?.(s)) continue;
    let ok = false; try { ok = !!f.when(s); } catch { ok = false; }
    if (ok) return f;
  }
  return null;
}
// 애드온이 필요한 기능인데 없으면 '받고 해 보기'
export const needsAddon = (f, s) => !!f?.needs && !s.addons.has(f.needs);
