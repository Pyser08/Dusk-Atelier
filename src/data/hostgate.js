// 호스트(리스) 무거운 호출 문: 여러 기능이 한꺼번에 getDatabase·봇·채팅 읽기/쓰기를 부르면 리스 화면이 멈추던 문제를 막는다.
// 무거운 호출만 동시에 max개까지 보내고 나머지는 순서대로 기다린다. 응답이 안 오는 호출이 자리를 영영 쥐지 않게 holdMs 뒤엔 자리만 푼다(호출 자체는 안 끊음).
// 가벼운 호출(버튼 등록·저장소·현재 인덱스 읽기)과 pluginStorage 같은 하위 객체는 그대로 통과한다.
export var HEAVY_RE = /^(getDatabase|getCharacter|getCharacterFromIndex|getChatFromIndex|setCharacterToIndex|setChatToIndex|setDatabase|setDatabaseLite)$/;

export function createHostGate(host, { max = 3, holdMs = 30000, re = HEAVY_RE } = {}) {
  let running = 0, peakWaiting = 0, total = 0;
  const queue = [];
  const pump = () => {
    while (running < max && queue.length) {
      const job = queue.shift();
      running++;
      let freed = false;
      const free = () => { if (freed) return; freed = true; clearTimeout(timer); running--; pump(); };
      const timer = setTimeout(free, holdMs);
      let p;
      try { p = Promise.resolve(job.run()); } catch (e) { p = Promise.reject(e); }
      p.then((v) => { free(); job.resolve(v); }, (e) => { free(); job.reject(e); });
    }
  };
  const submit = (run) => new Promise((resolve, reject) => {
    total++;
    queue.push({ run, resolve, reject });
    pump();
    peakWaiting = Math.max(peakWaiting, queue.length);
  });
  const stats = () => ({ running, waiting: queue.length, max, peakWaiting, total });
  const cache = new Map();
  return new Proxy(host, {
    get(t, k) {
      if (k === "__gate") return { stats };
      const v = t[k];
      if (typeof v !== "function" || typeof k !== "string" || !re.test(k)) return v;
      if (!cache.has(k)) cache.set(k, (...a) => submit(() => v.apply(t, a)));
      return cache.get(k);
    }
  });
}
