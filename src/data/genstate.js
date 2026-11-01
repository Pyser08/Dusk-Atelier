// 응답 스트리밍 신호. output 훅이 불릴 때마다 시각을 남겨, 생성 중인지 알아보려고 캐릭터·채팅을 통째로 가져오는 일을 피한다.
// (getCharacterFromIndex는 캐릭터에 딸린 모든 채팅을 복사하므로 큰 봇에서는 한 번에 수백 ms 걸린다.)
// 청크가 잇따라 들어올 때만 '스트리밍 중'으로 본다 — 응답이 한 번에 나온 단발 출력은 해당하지 않는다.
let lastChunkAt = 0, prevChunkAt = 0;
export const noteStreamChunk = () => { prevChunkAt = lastChunkAt; lastChunkAt = Date.now(); };
// 최근 ms 안에 청크가 들어왔고, 그 직전 청크도 가까웠으면(= 이어지는 스트림) 아직 생성 중으로 본다.
export const recentlyStreamed = (ms = 3000) => Date.now() - lastChunkAt < ms && lastChunkAt - prevChunkAt < ms;
export const resetStreamSignal = () => { lastChunkAt = 0; prevChunkAt = 0; };
