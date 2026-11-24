// 시작 직후 화면 표시가 애드온 준비보다 먼저 지나가지 않게 잠깐 기다리는 문(신고 #5).
// open()이 불리거나 만든 뒤 ms가 지나면 열리고, 그 뒤로는 기다리지 않는다(줄마다가 아니라 통틀어 ms까지).
export function createStartGate(ms = 3000, timers = globalThis) {
  let opened = false, release; const p = new Promise((r) => { release = r; });
  const open = () => { if (opened) return; opened = true; timers.clearTimeout(t); release(); };
  const t = timers.setTimeout(open, ms); t?.unref?.();
  return { open, wait: () => (opened ? null : p), get opened() { return opened; } };
}
