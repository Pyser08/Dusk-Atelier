// 11-23 장기기억 화면 상태(mem)·오류 토스트(fail)만 코어에 둔다. 홈·온보딩·코코아가 이것만 쓰므로,
// 장기기억 화면 공통(screens/memory/common.js)과 그 아래(이름·채팅 불러오기·기억 저장소)는 코어에서 빠져 애드온 배포만으로 고칠 수 있다.
export const mem = (ctx) => ctx.state.mem ??= { view: "bots", botId: "", chatIndex: 0, tab: "people", personKey: "", grades: [], search: "", personSearch: "", sort: "time", sceneDesc: true, page: 1, bots: null, showHidden: false, compose: null };
export const fail = (ctx) => (e) => ctx.toast(e?.message ?? String(e), { error: true, seconds: 8 });
