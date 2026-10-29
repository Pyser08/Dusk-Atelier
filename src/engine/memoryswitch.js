// v1.7.0 2단계: 기억 스위치와 리수폿 스위치를 서로 분리해서 다루는 순수 로직.
//
//  기억(Dusk)   = 전체 기본(settings.backend ≠ off · settings.inject.on) + 봇별 덮어쓰기(bots[chaId].on)
//  리수폿(위키) = 전체 기본(settings.potMode · settings.flow.on)       + 봇별 덮어쓰기(potBots[chaId])
//                 + 위키 인물(캐릭터)별 끄기(potChars[범위][문서id])
//  설정도 따로: 리수폿의 저장 위치·기록 시점은 settings.potStore (기억의 settings.backend·confirm과 분리)
//
// 조합: 기억만 = Dusk 러너 단독 · 리수폿만 = 위키 정리만(예전 backend "off" 경로) · 둘 다 = 합친 흐름.
// 인덱스 개정(rev) 1 = "v3.1". 마이그레이션은 '지금 켜진 것은 계속 켜짐'이 원칙이라 값은 바꾸지 않고 칸만 채운다.
export var INDEX_REV = 1;
var obj = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};

export var potStoreDefaults = (settings) => ({ backend: settings?.backend ?? "auto", confirm: settings?.confirm === "now" ? "now" : "next" });

// 예전(v3, rev 없음) 인덱스를 v3.1로. 여러 번 불러도 같은 결과(멱등). 원본 객체를 직접 고쳐서 돌려준다.
export function migrateIndex(idx) {
  if (!idx || typeof idx !== "object") return idx;
  idx.settings = obj(idx.settings);
  if (!(idx.rev >= INDEX_REV)) {
    // 지금 쓰던 저장 위치·기록 시점을 리수폿 쪽에도 그대로 복사한다(처음엔 둘이 같아서 동작이 바뀌지 않는다)
    idx.settings.potStore = { ...potStoreDefaults(idx.settings), ...obj(idx.settings.potStore) };
    idx.rev = INDEX_REV;
  }
  idx.settings.potStore = { ...potStoreDefaults(idx.settings), ...obj(idx.settings.potStore) };
  idx.potBots = obj(idx.potBots);
  idx.potChars = obj(idx.potChars);
  return idx;
}

// ── 읽기 ────────────────────────────────────────────────────────────────
// 기억 켜짐? reason: global-off(저장소 끔·주입 끔) | bot-off(이 봇에서 끔) | on
export function memoryState(idx, chaId) {
  const s = obj(idx?.settings);
  if (s.backend === "off") return { on: false, reason: "global-off" };
  if (obj(s.inject).on === false) return { on: false, reason: "global-off" };
  if (obj(idx?.bots)[String(chaId)]?.on === false) return { on: false, reason: "bot-off" };
  return { on: true, reason: "on" };
}
// 리수폿 켜짐? reason: pot-mode-off(리수폿 기능 끔) | flow-off(전체 스위치 꺼짐) | bot-off(이 봇에서 끔) | on
export function potState(idx, chaId) {
  const s = obj(idx?.settings);
  if (s.potMode === false) return { on: false, reason: "pot-mode-off" };
  if (obj(s.flow).on !== true) return { on: false, reason: "flow-off" };
  if (obj(idx?.potBots)[String(chaId)] === false) return { on: false, reason: "bot-off" };
  return { on: true, reason: "on" };
}
export var comboOf = (idx, chaId) => {
  const m = memoryState(idx, chaId).on, p = potState(idx, chaId).on;
  return m && p ? "both" : m ? "memory" : p ? "pot" : "none";
};
// 이 봇에서 리수폿만 따로 껐는지(전체 스위치와 무관하게 '봇별 끔'만 본다). 엔진 훅이 쓴다.
export var potOffForBot = (idx, chaId) => obj(idx?.potBots)[String(chaId)] === false;
// 위키 인물(캐릭터)별 켜기: 기본은 켜짐. scopeKey는 채팅 범위(`봇id::채팅id`), docId는 위키 문서 id.
export var potCharOn = (idx, scopeKey, docId) => !(obj(obj(idx?.potChars)[scopeKey]).off ?? []).includes(docId);
export var potCharsOff = (idx, scopeKey) => [...obj(obj(idx?.potChars)[scopeKey]).off ?? []];
// 리수폿의 기록 시점: 리수폿 설정이 있으면 그것, 없으면 예전 공용 값, 둘 다 없으면 next
export var potConfirm = (settings) => (settings?.potStore?.confirm ?? settings?.confirm) === "now" ? "now" : "next";
export var scopeKeyOf = (chaId, chatId) => `${chaId}::${chatId}`;

// ── 쓰기 (인덱스를 직접 고친다: store.updateIndex 안에서 부른다) ──────────────
export function setMemoryForBot(idx, chaId, on) {
  const b = idx.bots[String(chaId)] ??= { on: true, ignore: [], fails: 0 };
  b.on = !!on;
  return idx;
}
// 봇별 리수폿: 켜면 덮어쓰기를 지워 '전체 기본을 따름'으로 돌린다(꺼진 봇만 기록으로 남긴다)
export function setPotForBot(idx, chaId, on) {
  idx.potBots = obj(idx.potBots);
  if (on) delete idx.potBots[String(chaId)];
  else idx.potBots[String(chaId)] = false;
  return idx;
}
export function setPotChar(idx, scopeKey, docId, on) {
  idx.potChars = obj(idx.potChars);
  const cur = new Set(obj(idx.potChars[scopeKey]).off ?? []);
  if (on) cur.delete(docId); else cur.add(docId);
  if (cur.size) idx.potChars[scopeKey] = { off: [...cur] };
  else delete idx.potChars[scopeKey];
  return idx;
}
// 리수폿 전체 스위치: 켜면 기능(potMode)도 함께 켜고, 끄면 흐름만 끈다(기능 끔은 기억 화면 고급에서)
export function setPotGlobal(idx, on) {
  idx.settings.potMode = on ? true : idx.settings.potMode;
  idx.settings.flow = { ...obj(idx.settings.flow), on: !!on, mode: obj(idx.settings.flow).mode ?? "fast" };
  return idx;
}
// 기억 전체 스위치: 주입을 켜고 끈다. 저장소 '끔'(backend off)이었다면 켤 때 자동으로 되돌린다.
export function setMemoryGlobal(idx, on) {
  idx.settings.inject = { ...obj(idx.settings.inject), on: !!on };
  if (on && idx.settings.backend === "off") idx.settings.backend = "auto";
  return idx;
}
