// 스크롤 지킴이: 쓰는 도중 화면이 다시 그려지거나(불러오기·자동 새로고침) 내용이 잠깐 짧아져서
// 스크롤이 맨 위로 튀는 것을 막는다. replace()의 data-keep-scroll은 메인 영역을 통째로 갈아 끼울 때만 지키므로,
// 안쪽만 다시 그리거나 내용이 나중에 채워지는 경우를 여기서 함께 처리한다.
//
// - 스크롤 영역마다 열쇠(메인 data-view · 가까운 data-page · 모달 여부 · id/첫 클래스 · 같은 열쇠 중 순서)로 마지막 위치를 기억한다.
// - 기억: 사용자가 굴린 스크롤(휠·터치·키·스크롤바 끌기)이거나 끝(최대 위치)에 붙지 않은 스크롤.
//   내용이 짧아져 끝으로 밀려난 스크롤은 '튄 것'이라 기억하지 않는다. 코드가 일부러 올린 scrollTop=0·scrollIntoView는 기억된다.
// - 되돌리기(DOM이 바뀐 뒤): ① 같은 열쇠의 영역이 새로 생겼고 최근 클릭이 없을 때(배경 다시 그리기)
//   ② 기존 영역이 끝에 붙은 채 기억보다 위에 있을 때(내용이 짧아졌다 다시 늘어남).
// - 사용자가 직접 스크롤하는 중에는 건드리지 않는다. 메인 화면(data-view)이 바뀌면 기억을 비운다.
export const SCROLLER = ".rb-main,.rb-scroll,[data-keep-scroll-item],.rb-modal>*";
const INTENT_MS = 700, PENDING_MS = 8000;
// 화면 이동(ctx.go)은 markNav()로 알려 준다 → 그 화면의 기억을 비워서 새 화면은 맨 위에서 시작. 그 밖의 다시 그리기(버튼·스위치·불러오기·애드온 켜고 끄기)는 위치를 지킨다.

export function installScrollGuard(win, main) {
  if (!win) return null;
  if (win.__scrollGuard) return win.__scrollGuard;
  const saved = new Map(); let present = new Set(); const pending = new WeakMap();   // pending: 끝으로 밀려난(튄) 영역 → 그때 시각
  let intentAt = 0, view = main?.getAttribute("data-view") ?? "", queued = false;
  const now = () => Date.now();
  const atMax = (n) => n.scrollHeight - n.clientHeight - n.scrollTop <= 2;
  const base = (n) => {
    const page = n.closest("[data-page]")?.getAttribute("data-page") ?? "";
    const name = n.id || (typeof n.className === "string" ? n.className.trim().split(/\s+/)[0] : "") || n.tagName;
    return `${view}|${page}|${n.closest(".rb-modal") ? "m" : ""}|${name}`;
  };
  const keyOf = (n) => {
    const b = base(n);
    let i = 0;
    for (const x of win.querySelectorAll(SCROLLER)) { if (x === n) break; if (base(x) === b) i++; }
    return `${b}|${i}`;
  };
  const syncView = () => {
    const v = main?.getAttribute("data-view") ?? "";
    if (v !== view) { view = v; saved.clear(); }
  };
  const onScroll = (e) => {
    const n = e.target;
    if (!n?.matches?.(SCROLLER)) return;
    syncView();
    if (now() - intentAt < INTENT_MS) { pending.delete(n); saved.set(keyOf(n), n.scrollTop); return; }
    if (!atMax(n)) { if (!pending.has(n)) saved.set(keyOf(n), n.scrollTop); return; }
    const want = saved.get(keyOf(n));
    if (want && n.scrollTop < want - 2) pending.set(n, now());   // 내용이 짧아져 밀려남 → 다시 늘어나면 되돌린다
  };
  const restore = () => {
    queued = false;
    syncView();
    if (now() - intentAt < INTENT_MS) return;
    const list = [...win.querySelectorAll(SCROLLER)], was = present;
    present = new Set(list);   // 지난번에 없던 영역(새로 생겼거나 떼었다 다시 붙음 → 스크롤이 0으로 돌아감)
    for (const n of list) {
      const fresh = !was.has(n);
      const want = saved.get(keyOf(n));
      if (!want || n.scrollTop >= want - 2) { pending.delete(n); continue; }
      if (!fresh && atMax(n)) { pending.set(n, pending.get(n) ?? now()); n.scrollTop = want; continue; }   // 짧아진 채: 할 수 있는 만큼, 늘어나면 마저
      const p = pending.get(n);
      if (fresh || (p && now() - p < PENDING_MS)) { n.scrollTop = want; if (n.scrollTop >= want - 2) pending.delete(n); }
    }
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(restore);   // 그리기 전에 한 번(깜빡임 방지)
    try { requestAnimationFrame(() => { restore(); setTimeout(restore, 120); }); } catch { setTimeout(restore, 16); }   // 나중에 채워지는 내용
  };
  const intent = () => { intentAt = now(); };
  const onKey = (e) => { if (/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(e.key) && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName ?? "")) intent(); };
  const onDown = (e) => { if (e.target?.matches?.(SCROLLER)) intent(); };   // 스크롤바 끌기
  const opt = { passive: true, capture: true };
  win.addEventListener("wheel", intent, opt);
  win.addEventListener("touchmove", intent, opt);
  win.addEventListener("keydown", onKey, true);
  win.addEventListener("pointerdown", onDown, true);
  win.addEventListener("scroll", onScroll, opt);
  let mo = null;
  try { mo = new MutationObserver(schedule); mo.observe(win, { childList: true, subtree: true }); } catch { /* MutationObserver 없는 환경 */ }
  const guard = {
    saved,
    markNav() { saved.clear(); },   // 다른 화면으로 옮김: 기억을 비운다
    dispose() {
      mo?.disconnect();
      win.removeEventListener("wheel", intent, opt); win.removeEventListener("touchmove", intent, opt);
      win.removeEventListener("keydown", onKey, true); win.removeEventListener("pointerdown", onDown, true);
      win.removeEventListener("scroll", onScroll, opt);
      win.__scrollGuard = null;
    }
  };
  win.__scrollGuard = guard;
  return guard;
}
